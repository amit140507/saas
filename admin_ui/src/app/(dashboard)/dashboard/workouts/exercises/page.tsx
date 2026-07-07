import WorkoutManagementPage from "../_components/WorkoutManagementPage";

export default function ExerciseCreationPage() {
    return (
        <WorkoutManagementPage
            title="Exercise Creation"
            description="Manage the exercise library, muscle groups, and exercise setup for workout plans."
            allowedTabs={["library", "muscleGroups"]}
        />
    );
}
