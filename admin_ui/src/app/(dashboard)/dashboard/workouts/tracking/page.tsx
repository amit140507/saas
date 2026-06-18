import WorkoutManagementPage from "../_components/WorkoutManagementPage";

export default function WorkoutTrackingPage() {
    return (
        <WorkoutManagementPage
            title="Workout Tracking"
            description="Review client workout sessions, exercise logs, and recorded set performance."
            allowedTabs={["sessions"]}
        />
    );
}
