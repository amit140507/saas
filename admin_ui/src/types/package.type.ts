export interface PackagePlan {
    id: string;
    package: string;
    name: string;
    price: string;
    duration_in_days: number | null;
    is_active: boolean;
}

export interface PackageFeature {
    id: string;
    feature: string;
    feature_details: {
        id: string;
        name: string;
        code: string;
        description: string;
    };
}

export interface FeatureCatalogItem {
    id: string;
    name: string;
    code: string;
    description: string;
}

export interface Package {
    id: string;
    name: string;
    description: string | null;
    max_freezes: number;
    is_active: boolean;
    features: PackageFeature[];
    plans: PackagePlan[];
    created_at: string;
    updated_at: string;
}

export interface PackagePayload {
    name: string;
    description: string;
    max_freezes: number;
    is_active: boolean;
    features: PackageFeaturePayload[];
    plans: PackagePlanPayload[];
}

export interface PackageFeaturePayload {
    name: string;
    code: string;
    description: string;
}

export interface PackagePlanPayload {
    name: string;
    price: string;
    duration_in_days: number | null;
    is_active: boolean;
}
