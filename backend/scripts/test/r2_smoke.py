"""Manual smoke test for Cloudflare R2 using the app's S3-compatible settings."""

from __future__ import annotations

import os
import uuid

from bootstrap_django import load_django


load_django()

from django.conf import settings


def _r2_client():
    import boto3
    from botocore.config import Config

    account_id = getattr(settings, "R2_ACCOUNT_ID", "") or ""
    access_key = getattr(settings, "R2_ACCESS_KEY_ID", "") or ""
    secret_key = getattr(settings, "R2_SECRET_ACCESS_KEY", "") or ""

    if not (account_id and access_key and secret_key):
        raise RuntimeError(
            "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY."
        )

    endpoint = getattr(settings, "R2_ENDPOINT_URL", None) or (
        f"https://{account_id}.r2.cloudflarestorage.com"
    )

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=getattr(settings, "R2_REGION", "auto"),
        config=Config(signature_version="s3v4"),
    )


def _r2_endpoint() -> str:
    account_id = getattr(settings, "R2_ACCOUNT_ID", "") or ""
    return getattr(settings, "R2_ENDPOINT_URL", None) or (
        f"https://{account_id}.r2.cloudflarestorage.com" if account_id else ""
    )


def _public_url_for_key(object_key: str) -> str:
    base_url = (getattr(settings, "R2_PUBLIC_BASE_URL", "") or "").rstrip("/")
    return f"{base_url}/{object_key.lstrip('/')}" if base_url else ""


def run_r2_bucket_smoke_test():
    """
    Upload a temporary object, read it back, and optionally delete it.

    Set R2_TEST_CLEANUP=true to delete the uploaded smoke object afterward.
    """
    bucket_name = getattr(settings, "R2_BUCKET_NAME", "") or ""
    if not bucket_name:
        raise RuntimeError("R2_BUCKET_NAME is not set.")

    client = None
    cleanup_after_test = str(os.environ.get("R2_TEST_CLEANUP", "")).lower() in {
        "1",
        "true",
        "yes",
    }
    prefix = (getattr(settings, "R2_INVOICE_KEY_PREFIX", "invoices") or "invoices").strip("/")
    object_key = f"{prefix}/smoke-test-{uuid.uuid4().hex}.txt"
    payload = b"Cloudflare R2 smoke test from backend/scripts/test/r2_smoke.py"

    try:
        client = _r2_client()
        client.head_bucket(Bucket=bucket_name)
        client.put_object(
            Bucket=bucket_name,
            Key=object_key,
            Body=payload,
            ContentType="text/plain",
        )

        response = client.get_object(Bucket=bucket_name, Key=object_key)
        body = response["Body"].read()
        listing = client.list_objects_v2(Bucket=bucket_name, Prefix=object_key)
        keys = [item["Key"] for item in listing.get("Contents", [])]

        assert body == payload, "Uploaded object content did not match the downloaded content."
        assert response["ContentLength"] == len(payload), "Unexpected content length returned by R2."
        assert object_key in keys, "Uploaded object was not found when listing the bucket."

        print("[SUCCESS] R2 bucket smoke test passed")
        print(f"Bucket: {bucket_name}")
        print(f"Object key: {object_key}")
        print(f"Endpoint: {_r2_endpoint()}")
        public_url = _public_url_for_key(object_key)
        if public_url:
            print(f"Public URL: {public_url}")
        print(f"Listed in bucket: {object_key in keys}")

        return {
            "bucket": bucket_name,
            "object_key": object_key,
            "content_length": response["ContentLength"],
            "public_url": public_url,
            "listed": object_key in keys,
        }
    finally:
        if client is not None and cleanup_after_test:
            try:
                client.delete_object(Bucket=bucket_name, Key=object_key)
            except Exception as exc:
                print(f"[WARN] Cleanup failed for {object_key}: {exc}")


def main():
    try:
        run_r2_bucket_smoke_test()
    except Exception as exc:
        print(f"[ERROR] R2 smoke test failed: {exc}")
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
