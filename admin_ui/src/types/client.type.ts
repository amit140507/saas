export interface ClientData {
    id: string;
    user: {
        first_name: string;
        last_name: string;
        email: string;
        public_id: string | null;
    };
    phone: string;
    status: string;
    goal: string;
}

export interface ClientPayload {
    user: {
        first_name: string;
        last_name: string;
        email: string;
    };
    phone: string;
    status: string;
    goal: string;
}
