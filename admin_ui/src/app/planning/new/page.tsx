import { redirect } from "next/navigation";

export default function PlanningNewRedirectPage() {
    redirect("/dashboard/workouts/planning/new");
}
