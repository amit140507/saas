import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import AdminLoginForm from "./AdminLoginForm";
import { authOptions } from "@/lib/auth";

export default async function AdminLoginPage() {
    const session = await getServerSession(authOptions);

    if (session) {
        redirect("/dashboard");
    }

    return <AdminLoginForm />;
}
