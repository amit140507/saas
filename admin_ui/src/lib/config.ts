function normalizeApiUrl(value: string | undefined): string {
    if (!value?.trim()) {
        throw new Error("NEXT_PUBLIC_API_URL is required.");
    }

    return value.trim().replace(/\/+$/, "") + "/";
}

export const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
