import { redirect } from "next/navigation";

interface DietPlansPageProps {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function buildQueryString(searchParams: Record<string, string | string[] | undefined>): string {
    const params = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((item) => params.append(key, item));
            return;
        }

        if (value != null) {
            params.set(key, value);
        }
    });

    const query = params.toString();
    return query ? `?${query}` : "";
}

export default async function DietPlansPage({ searchParams }: DietPlansPageProps) {
    const query = buildQueryString((await searchParams) || {});
    redirect(`/dashboard/diet-plans/planning${query}`);
}
