import ResetPasswordForm from "./ResetPasswordForm";

interface ResetPasswordPageProps {
    params: Promise<{
        uid: string;
        token: string;
    }>;
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
    const { uid, token } = await params;

    return <ResetPasswordForm uid={uid} token={token} />;
}
