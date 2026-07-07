import WorkoutManagementPage from "../_components/WorkoutManagementPage";

export default function WorkoutPlanningPage() {
    return (
        <WorkoutManagementPage
            title="Workout Planning"
            description="Create workout plans and assign them to clients."
            allowedTabs={["plans", "assignments"]}
        />
    );
}
