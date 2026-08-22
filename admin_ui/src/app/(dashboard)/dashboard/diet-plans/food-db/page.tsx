"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CheckCircleIcon,
    EditIcon,
    EyeIcon,
    Loader2Icon,
    PlusIcon,
    SearchIcon,
    Trash2Icon,
    UtensilsIcon,
    XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, PageShell } from "@/components/ui/page";
import {
    createFoodItem,
    deleteFoodItem,
    getFoodItems,
    updateFoodItem,
} from "@/services/diet-plan.service";
import type { FoodItem, FoodItemPayload } from "@/types/diet-plan.type";

type ModalMode = "create" | "edit";

type FoodItemForm = {
    name: string;
    brand: string;
    calories_per_100g: string;
    protein_g: string;
    carbs_g: string;
    fat_g: string;
    fiber_g: string;
    is_verified: boolean;
};

type ApiErrorShape = {
    response?: {
        data?: {
            detail?: string;
            error?: string;
            non_field_errors?: string[];
            name?: string[];
            calories_per_100g?: string[];
        };
    };
    message?: string;
};

const emptyFoodItemForm: FoodItemForm = {
    name: "",
    brand: "",
    calories_per_100g: "",
    protein_g: "0",
    carbs_g: "0",
    fat_g: "0",
    fiber_g: "0",
    is_verified: false,
};

function getErrorMessage(error: unknown): string {
    const apiError = error as ApiErrorShape;
    const data = apiError.response?.data;

    return (
        data?.error ||
        data?.detail ||
        data?.non_field_errors?.join(" ") ||
        data?.name?.join(" ") ||
        data?.calories_per_100g?.join(" ") ||
        apiError.message ||
        "Something went wrong."
    );
}

function decimalValue(value: string): string {
    const trimmed = value.trim();
    return trimmed || "0";
}

function foodItemToForm(foodItem: FoodItem): FoodItemForm {
    return {
        name: foodItem.name,
        brand: foodItem.brand || "",
        calories_per_100g: foodItem.calories_per_100g,
        protein_g: foodItem.protein_g,
        carbs_g: foodItem.carbs_g,
        fat_g: foodItem.fat_g,
        fiber_g: foodItem.fiber_g,
        is_verified: foodItem.is_verified,
    };
}

function buildPayload(form: FoodItemForm): { payload: FoodItemPayload | null; error: string } {
    const name = form.name.trim();
    const calories = Number(form.calories_per_100g);
    const macroValues = [
        { label: "Protein", value: form.protein_g },
        { label: "Carbs", value: form.carbs_g },
        { label: "Fat", value: form.fat_g },
        { label: "Fiber", value: form.fiber_g },
    ];

    if (!name) {
        return { payload: null, error: "Food name is required." };
    }

    if (!form.calories_per_100g.trim() || Number.isNaN(calories) || calories < 0) {
        return { payload: null, error: "Calories must be zero or higher." };
    }

    for (const macro of macroValues) {
        const parsed = Number(decimalValue(macro.value));
        if (Number.isNaN(parsed) || parsed < 0) {
            return { payload: null, error: `${macro.label} must be zero or higher.` };
        }
    }

    return {
        payload: {
            name,
            brand: form.brand.trim() || null,
            calories_per_100g: form.calories_per_100g.trim(),
            protein_g: decimalValue(form.protein_g),
            carbs_g: decimalValue(form.carbs_g),
            fat_g: decimalValue(form.fat_g),
            fiber_g: decimalValue(form.fiber_g),
            is_verified: form.is_verified,
            metadata: {},
        },
        error: "",
    };
}

function formatMacro(value: string, unit = "g"): string {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
        return `${value}${unit}`;
    }

    return `${parsed.toLocaleString("en-IN", { maximumFractionDigits: 2 })}${unit}`;
}

function FoodStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border border-border bg-muted/35 px-3 py-2">
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
        </div>
    );
}

function FoodCard({
    foodItem,
    onView,
    onEdit,
    onDelete,
}: {
    foodItem: FoodItem;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <article className="rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-foreground">{foodItem.name}</h2>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{foodItem.brand || "No brand"}</p>
                </div>
                <Badge variant={foodItem.is_verified ? "success" : "neutral"}>
                    {foodItem.is_verified && <CheckCircleIcon className="h-3.5 w-3.5" />}
                    {foodItem.is_verified ? "Verified" : "Unverified"}
                </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <FoodStat label="Calories" value={`${formatMacro(foodItem.calories_per_100g, "")} kcal`} />
                <FoodStat label="Protein" value={formatMacro(foodItem.protein_g)} />
                <FoodStat label="Carbs" value={formatMacro(foodItem.carbs_g)} />
                <FoodStat label="Fat" value={formatMacro(foodItem.fat_g)} />
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
                <Button type="button" variant="ghost" size="icon" onClick={onView} title="View food item">
                    <EyeIcon className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={onEdit} title="Edit food item">
                    <EditIcon className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={onDelete} title="Delete food item">
                    <Trash2Icon className="h-4 w-4" />
                </Button>
            </div>
        </article>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="block text-sm font-medium text-foreground">{children}</label>;
}

function FoodItemFormModal({
    mode,
    form,
    error,
    isSubmitting,
    onChange,
    onClose,
    onSubmit,
}: {
    mode: ModalMode;
    form: FoodItemForm;
    error: string;
    isSubmitting: boolean;
    onChange: (form: FoodItemForm) => void;
    onClose: () => void;
    onSubmit: (payload: FoodItemPayload) => void;
}) {
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const localValidation = buildPayload(form).error;
    const visibleError = error || (hasSubmitted ? localValidation : "");

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setHasSubmitted(true);
        const result = buildPayload(form);
        if (!result.payload) {
            return;
        }
        onSubmit(result.payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold text-foreground">
                        {mode === "edit" ? "Edit Food Item" : "Add Food Item"}
                    </h2>
                    <Button type="button" variant="ghost" size="icon" onClick={onClose} title="Close">
                        <XIcon className="h-5 w-5" />
                    </Button>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    {visibleError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                            {visibleError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <FieldLabel>Food name</FieldLabel>
                            <Input
                                value={form.name}
                                onChange={(event) => onChange({ ...form, name: event.target.value })}
                                maxLength={50}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel>Brand</FieldLabel>
                            <Input
                                value={form.brand}
                                onChange={(event) => onChange({ ...form, brand: event.target.value })}
                                maxLength={100}
                            />
                        </div>
                        <div>
                            <FieldLabel>Calories per 100g</FieldLabel>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.calories_per_100g}
                                onChange={(event) => onChange({ ...form, calories_per_100g: event.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel>Protein g</FieldLabel>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.protein_g}
                                onChange={(event) => onChange({ ...form, protein_g: event.target.value })}
                            />
                        </div>
                        <div>
                            <FieldLabel>Carbs g</FieldLabel>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.carbs_g}
                                onChange={(event) => onChange({ ...form, carbs_g: event.target.value })}
                            />
                        </div>
                        <div>
                            <FieldLabel>Fat g</FieldLabel>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.fat_g}
                                onChange={(event) => onChange({ ...form, fat_g: event.target.value })}
                            />
                        </div>
                        <div>
                            <FieldLabel>Fiber g</FieldLabel>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.fiber_g}
                                onChange={(event) => onChange({ ...form, fiber_g: event.target.value })}
                            />
                        </div>
                    </div>

                    <label className="inline-flex items-center gap-3 rounded-md border border-border px-4 py-3">
                        <input
                            type="checkbox"
                            checked={form.is_verified}
                            onChange={(event) => onChange({ ...form, is_verified: event.target.checked })}
                            className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-600"
                        />
                        <span className="text-sm font-medium text-foreground">Verified food item</span>
                    </label>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2Icon className="h-4 w-4 animate-spin" />}
                            {mode === "edit" ? "Save Changes" : "Add Food Item"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function FoodItemViewModal({ foodItem, onClose }: { foodItem: FoodItem; onClose: () => void }) {
    const details = [
        { label: "Calories per 100g", value: `${formatMacro(foodItem.calories_per_100g, "")} kcal` },
        { label: "Protein", value: formatMacro(foodItem.protein_g) },
        { label: "Carbs", value: formatMacro(foodItem.carbs_g) },
        { label: "Fat", value: formatMacro(foodItem.fat_g) },
        { label: "Fiber", value: formatMacro(foodItem.fiber_g) },
        { label: "Food ID", value: foodItem.id },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="break-words text-xl font-semibold text-foreground">{foodItem.name}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{foodItem.brand || "No brand"}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={onClose} title="Close">
                        <XIcon className="h-5 w-5" />
                    </Button>
                </div>

                <div className="mt-5">
                    <Badge variant={foodItem.is_verified ? "success" : "neutral"}>
                        {foodItem.is_verified && <CheckCircleIcon className="h-3.5 w-3.5" />}
                        {foodItem.is_verified ? "Verified" : "Unverified"}
                    </Badge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {details.map((item) => (
                        <div key={item.label} className="rounded-md border border-border bg-muted/35 p-3">
                            <div className="text-xs font-semibold uppercase text-muted-foreground">{item.label}</div>
                            <div className="mt-1 break-words text-sm font-medium text-foreground">{item.value}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-end">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function FoodDbPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [modalMode, setModalMode] = useState<ModalMode>("create");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
    const [viewFoodItem, setViewFoodItem] = useState<FoodItem | null>(null);
    const [foodItemToDelete, setFoodItemToDelete] = useState<FoodItem | null>(null);
    const [form, setForm] = useState<FoodItemForm>(emptyFoodItemForm);
    const [formError, setFormError] = useState("");

    const {
        data: foodItems = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ["food-items"],
        queryFn: getFoodItems,
    });

    const refreshFoodItems = () => {
        queryClient.invalidateQueries({ queryKey: ["food-items"] });
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setSelectedFoodItem(null);
        setForm(emptyFoodItemForm);
        setFormError("");
    };

    const createMutation = useMutation({
        mutationFn: createFoodItem,
        onSuccess: () => {
            refreshFoodItems();
            closeForm();
        },
        onError: (mutationError) => setFormError(getErrorMessage(mutationError)),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: FoodItemPayload }) => updateFoodItem(id, payload),
        onSuccess: () => {
            refreshFoodItems();
            closeForm();
        },
        onError: (mutationError) => setFormError(getErrorMessage(mutationError)),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteFoodItem,
        onSuccess: () => {
            refreshFoodItems();
            setFoodItemToDelete(null);
        },
    });

    const filteredFoodItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return foodItems;
        }

        return foodItems.filter((foodItem) => (
            foodItem.name.toLowerCase().includes(query) ||
            (foodItem.brand || "").toLowerCase().includes(query)
        ));
    }, [foodItems, searchQuery]);

    const openCreateModal = () => {
        setModalMode("create");
        setSelectedFoodItem(null);
        setForm(emptyFoodItemForm);
        setFormError("");
        setIsFormOpen(true);
    };

    const openEditModal = (foodItem: FoodItem) => {
        setModalMode("edit");
        setSelectedFoodItem(foodItem);
        setForm(foodItemToForm(foodItem));
        setFormError("");
        setIsFormOpen(true);
    };

    const handleSubmit = (payload: FoodItemPayload) => {
        setFormError("");
        if (modalMode === "edit" && selectedFoodItem) {
            updateMutation.mutate({ id: selectedFoodItem.id, payload });
            return;
        }

        createMutation.mutate(payload);
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <PageShell>
            <PageHeader
                title="Food DB"
                description="Manage foods and per-100g calories, protein, carbs, fat, and fiber."
                icon={UtensilsIcon}
                actions={(
                    <Button type="button" onClick={openCreateModal}>
                        <PlusIcon className="h-5 w-5" />
                        Add Food Item
                    </Button>
                )}
            />

            <div className="relative w-full md:w-96">
                <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search food or brand..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-10"
                />
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center rounded-lg border border-border bg-card py-16">
                    <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    Error loading food items. Please try again.
                </div>
            ) : filteredFoodItems.length === 0 ? (
                <div className="rounded-lg border border-border bg-card">
                    <EmptyState
                        icon={UtensilsIcon}
                        title={searchQuery ? "No matching food items" : "No food items found"}
                        description={searchQuery ? "Try a different food or brand search." : "Add your first food item to start building the shared database."}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredFoodItems.map((foodItem) => (
                        <FoodCard
                            key={foodItem.id}
                            foodItem={foodItem}
                            onView={() => setViewFoodItem(foodItem)}
                            onEdit={() => openEditModal(foodItem)}
                            onDelete={() => setFoodItemToDelete(foodItem)}
                        />
                    ))}
                </div>
            )}

            {isFormOpen && (
                <FoodItemFormModal
                    mode={modalMode}
                    form={form}
                    error={formError}
                    isSubmitting={isSubmitting}
                    onChange={setForm}
                    onClose={closeForm}
                    onSubmit={handleSubmit}
                />
            )}

            {viewFoodItem && <FoodItemViewModal foodItem={viewFoodItem} onClose={() => setViewFoodItem(null)} />}

            {foodItemToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-foreground">Delete food item?</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            This will remove {foodItemToDelete.name}. Diet plans using this food may prevent deletion.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => setFoodItemToDelete(null)}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => deleteMutation.mutate(foodItemToDelete.id)}
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending && <Loader2Icon className="h-4 w-4 animate-spin" />}
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </PageShell>
    );
}
