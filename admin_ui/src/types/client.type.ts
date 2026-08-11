export interface ClientData {
    id: string;
    assigned_trainer?: string | null;
    user: {
        id?: string;
        first_name: string;
        last_name: string;
        email: string;
        public_id: string | null;
    };
    phone: string | null;
    status: string;
    goal: string | null;
    dob?: string | null;
    sex?: "M" | "F" | "O" | "" | null;
    profile_picture?: string | null;
    date_of_joining?: string | null;
    referral_source?: string | null;
    joined_at?: string | null;
    activated_at?: string | null;
}

export interface ClientPayload {
    user: {
        first_name: string;
        last_name: string;
        email: string;
    };
    assigned_trainer?: string | null;
    phone?: string | null;
    status?: string;
    goal?: string | null;
    dob?: string | null;
    sex?: ClientData["sex"];
    profile_picture?: string | null;
    date_of_joining?: string | null;
    referral_source?: string | null;
}
