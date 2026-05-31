import { Suspense } from "react";

import AdminLoginForm from "./AdminLoginForm";
import LoginAuthRedirect from "./LoginAuthRedirect";

export default function AdminLoginPage() {
    return (
        <Suspense fallback={<LoginLoading />}>
            <LoginAuthRedirect>
                <AdminLoginForm />
            </LoginAuthRedirect>
        </Suspense>
    );
}

function LoginLoading() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-sm text-zinc-400">
            Loading...
        </div>
    );
}
