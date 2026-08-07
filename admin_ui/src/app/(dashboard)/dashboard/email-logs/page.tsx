import { redirect } from "next/navigation";

export default function EmailLogsRedirectPage() {
    redirect("/dashboard/engagement/communications");
}
