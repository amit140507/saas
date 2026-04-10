"use client";

import Link from "next/link";
import { MailCheckIcon } from "lucide-react";

export default function VerifyEmailPage() {
    return (
        <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-zinc-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
                <div className="flex justify-center mb-6">
                    <div className="rounded-full bg-indigo-100 p-3">
                        <MailCheckIcon className="h-12 w-12 text-indigo-600" />
                    </div>
                </div>
                <h2 className="text-center text-3xl font-bold leading-9 tracking-tight text-zinc-900">
                    Check your email
                </h2>
                <p className="mt-4 text-zinc-600">
                    We've sent a verification link to your email address. Please click the link to activate your account.
                </p>
                
                <div className="mt-10">
                    <Link
                        href="/login"
                        className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition"
                    >
                        Back to Login
                    </Link>
                </div>
                
                <p className="mt-10 text-center text-sm text-zinc-500">
                    Didn't receive the email? Check your spam folder or{" "}
                    <button className="font-semibold text-indigo-600 hover:text-indigo-500">
                        click here to resend
                    </button>
                </p>
            </div>
        </div>
    );
}
