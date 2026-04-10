export interface FoodItem {
    id: string;
    name: string;
    calories: number; // per 100g
    protein: number;  // per 100g
    fat: number;      // per 100g
    carbs: number;    // per 100g
    defaultUnit: string;
}

export const foodDb: FoodItem[] = [
    // PROTEIN SOURCES
    { id: "chicken_breast_raw", name: "Chicken Breast (Raw)", calories: 120, protein: 22.5, fat: 2.6, carbs: 0, defaultUnit: "g" },
    { id: "chicken_breast_cooked", name: "Chicken Breast (Cooked)", calories: 165, protein: 31, fat: 3.6, carbs: 0, defaultUnit: "g" },
    { id: "egg_whole", name: "Whole Egg", calories: 143, protein: 12.6, fat: 9.5, carbs: 0.7, defaultUnit: "g" }, // 1 large egg is approx 50g
    { id: "egg_white", name: "Egg White", calories: 52, protein: 10.9, fat: 0.2, carbs: 0.7, defaultUnit: "g" }, 
    { id: "salmon_raw", name: "Salmon (Raw)", calories: 208, protein: 20, fat: 13, carbs: 0, defaultUnit: "g" },
    { id: "tuna_canned_water", name: "Tuna (Canned in Water)", calories: 86, protein: 19.4, fat: 0.9, carbs: 0, defaultUnit: "g" },
    { id: "ground_beef_95_5", name: "Ground Beef 95% Lean (Raw)", calories: 137, protein: 21.4, fat: 5, carbs: 0, defaultUnit: "g" },
    { id: "paneer_low_fat", name: "Paneer (Low Fat)", calories: 265, protein: 18, fat: 15, carbs: 14, defaultUnit: "g" }, // Common in Indian diets
    { id: "tofu_firm", name: "Tofu (Firm)", calories: 83, protein: 8, fat: 4.8, carbs: 1.9, defaultUnit: "g" },
    { id: "greek_yogurt_0", name: "Greek Yogurt (0% Fat)", calories: 59, protein: 10, fat: 0.4, carbs: 3.6, defaultUnit: "g" },

    // CARBOHYDRATE SOURCES
    { id: "white_rice_raw", name: "White Rice (Raw)", calories: 360, protein: 6.6, fat: 0.6, carbs: 80, defaultUnit: "g" },
    { id: "white_rice_cooked", name: "White Rice (Cooked)", calories: 130, protein: 2.7, fat: 0.3, carbs: 28, defaultUnit: "g" },
    { id: "brown_rice_raw", name: "Brown Rice (Raw)", calories: 367, protein: 7.5, fat: 3.2, carbs: 76.2, defaultUnit: "g" },
    { id: "oats_rolled", name: "Rolled Oats (Dry)", calories: 389, protein: 16.9, fat: 6.9, carbs: 66.3, defaultUnit: "g" },
    { id: "sweet_potato_raw", name: "Sweet Potato (Raw)", calories: 86, protein: 1.6, fat: 0.1, carbs: 20.1, defaultUnit: "g" },
    { id: "potato_white_raw", name: "White Potato (Raw)", calories: 77, protein: 2, fat: 0.1, carbs: 17.5, defaultUnit: "g" },
    { id: "quinoa_raw", name: "Quinoa (Raw)", calories: 368, protein: 14.1, fat: 6.1, carbs: 64.2, defaultUnit: "g" },
    { id: "whole_wheat_bread", name: "Whole Wheat Bread", calories: 252, protein: 12.5, fat: 3.4, carbs: 42.7, defaultUnit: "g" }, // Typically a slice is ~30g
    { id: "roti_chapati", name: "Roti / Chapati", calories: 297, protein: 9.6, fat: 3.2, carbs: 55.4, defaultUnit: "g" },

    // FAT SOURCES
    { id: "almonds", name: "Almonds", calories: 579, protein: 21.2, fat: 49.9, carbs: 21.6, defaultUnit: "g" },
    { id: "walnuts", name: "Walnuts", calories: 654, protein: 15.2, fat: 65.2, carbs: 13.7, defaultUnit: "g" },
    { id: "peanut_butter", name: "Peanut Butter (Natural)", calories: 588, protein: 25, fat: 50, carbs: 20, defaultUnit: "g" },
    { id: "olive_oil", name: "Olive Oil", calories: 884, protein: 0, fat: 100, carbs: 0, defaultUnit: "ml" },
    { id: "avocado", name: "Avocado", calories: 160, protein: 2, fat: 14.7, carbs: 8.5, defaultUnit: "g" },
    { id: "chia_seeds", name: "Chia Seeds", calories: 486, protein: 16.5, fat: 30.7, carbs: 42.1, defaultUnit: "g" },
    { id: "flax_seeds", name: "Flax Seeds", calories: 534, protein: 18.3, fat: 42.2, carbs: 28.9, defaultUnit: "g" },

    // VEGETABLES & FRUITS (Low calorie, fiber)
    { id: "broccoli_raw", name: "Broccoli (Raw)", calories: 34, protein: 2.8, fat: 0.4, carbs: 6.6, defaultUnit: "g" },
    { id: "spinach_raw", name: "Spinach (Raw)", calories: 23, protein: 2.9, fat: 0.4, carbs: 3.6, defaultUnit: "g" },
    { id: "green_beans", name: "Green Beans", calories: 31, protein: 1.8, fat: 0.2, carbs: 7.1, defaultUnit: "g" },
    { id: "banana", name: "Banana", calories: 89, protein: 1.1, fat: 0.3, carbs: 22.8, defaultUnit: "g" },
    { id: "apple", name: "Apple", calories: 52, protein: 0.3, fat: 0.2, carbs: 13.8, defaultUnit: "g" },
    { id: "strawberries", name: "Strawberries", calories: 32, protein: 0.7, fat: 0.3, carbs: 7.7, defaultUnit: "g" },
    { id: "blueberries", name: "Blueberries", calories: 57, protein: 0.7, fat: 0.3, carbs: 14.5, defaultUnit: "g" },

    // OTHER
    { id: "milk_whole", name: "Whole Milk (3.2%)", calories: 61, protein: 3.2, fat: 3.3, carbs: 4.8, defaultUnit: "ml" },
    { id: "milk_skim", name: "Skim Milk (0%)", calories: 35, protein: 3.4, fat: 0.1, carbs: 5, defaultUnit: "ml" }
];

export const supplementsDb = [
    { id: "whey_isolate", name: "Whey Protein Isolate", defaultUnit: "scoop" },
    { id: "whey_concentrate", name: "Whey Protein Concentrate", defaultUnit: "scoop" },
    { id: "creatine_monohydrate", name: "Creatine Monohydrate", defaultUnit: "g" },
    { id: "pre_workout", name: "Pre-Workout", defaultUnit: "scoop" },
    { id: "bcaa", name: "BCAAs", defaultUnit: "scoop" },
    { id: "multi_vitamin", name: "Multivitamin", defaultUnit: "tab" },
    { id: "fish_oil", name: "Fish Oil / Omega-3", defaultUnit: "cap" },
    { id: "zma", name: "ZMA", defaultUnit: "cap" },
    { id: "vitamin_d3", name: "Vitamin D3", defaultUnit: "cap" }
];
