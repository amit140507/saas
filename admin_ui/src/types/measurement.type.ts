export interface MeasurementPhotoData {
    id: string;
    photo_type: "front" | "left_side" | "right_side" | "back";
    image: string;
    uploaded_at: string;
}

export interface WeeklyMeasurementData {
    id: string;
    tenant: string;
    client: string;
    weight: string | null;
    chest: string | null;
    abdomen: string | null;
    glutes: string | null;
    arm_left: string | null;
    arm_right: string | null;
    thighs_left: string | null;
    thighs_right: string | null;
    calf_left: string | null;
    calf_right: string | null;
    notes: string | null;
    measured_at: string;
    created_at: string;
    updated_at: string;
    photos: MeasurementPhotoData[];
}

export type MeasurementMetricKey =
    | "weight"
    | "chest"
    | "abdomen"
    | "glutes"
    | "arm_left"
    | "arm_right"
    | "thighs_left"
    | "thighs_right"
    | "calf_left"
    | "calf_right";
