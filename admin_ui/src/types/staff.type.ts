export interface StaffMember {
    id: string;
    user_id: string;
    public_id: string;
    username: string;
    full_name: string;
    email: string;
    role_name: string | null;
    status?: "active" | "inactive";
    phone: string;
    date_of_joining?: string | null;
    dob?: string | null;
    sex?: "M" | "F" | "O" | "" | null;
    profile_picture?: string | null;
    bio?: string;
    specialization?: string;
    years_of_experience?: number | null;
    client_count?: number;
}

export interface StaffUpdatePayload {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    phone: string;
    bio: string;
    specialization: string;
    years_of_experience?: number | null;
    dob?: string | null;
    sex?: StaffMember["sex"];
    date_of_joining?: string | null;
    role_names?: string[];
}
