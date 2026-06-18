import WorkoutManagementPage from "../_components/WorkoutManagementPage";

export default function WorkoutPlanningPage() {
    return (
        <WorkoutManagementPage
            title="Workout Planning"
            description="Create workout plans, maintain the exercise library, and assign plans to clients."
            allowedTabs={["plans", "library", "muscleGroups", "assignments"]}
        />
    );
}
