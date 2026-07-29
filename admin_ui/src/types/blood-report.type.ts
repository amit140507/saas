export interface BloodMarker {
    id?: string;
    marker_name: string;
    value: string;
    unit?: string | null;
    normal_min?: string | null;
    normal_max?: string | null;
    is_abnormal?: boolean;
}

export interface BloodReport {
    id: string;
    client: string;
    report_date: string;
    lab_name?: string | null;
    notes?: string | null;
    report_file?: string | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    markers?: BloodMarker[];
    created_at?: string;
}

export interface BloodReportFormState {
    client: string;
    report_date: string;
    lab_name: string;
    notes: string;
    markers: BloodMarker[];
}
