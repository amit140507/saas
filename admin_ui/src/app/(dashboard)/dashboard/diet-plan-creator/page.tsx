"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FileTextIcon, SendIcon, PlusIcon, TrashIcon } from "lucide-react";
import { foodDb, supplementsDb } from "@/lib/foodDb";
import axios from "axios";

function DietPlanCreatorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Targets from Calculator
  const targetCals = Number(searchParams.get("calories")) || 0;
  const targetPro = Number(searchParams.get("protein")) || 0;
  const targetFat = Number(searchParams.get("fat")) || 0;
  const targetCarb = Number(searchParams.get("carbs")) || 0;
  const targetGain = Number(searchParams.get("gain")) || 0;

  // Header Details State
  const [details, setDetails] = useState({
    startDate: "",
    endDate: "",
    checkInDate: "",
    totalCardio: "",
    clientEmail: "",
    clientPhone: "",
  });

  // Meals State
  const [meals, setMeals] = useState<any[]>([
    { id: Date.now().toString(), time: "Breakfast", foods: [], supplements: [] }
  ]);

  const [loading, setLoading] = useState(false);

  // Compute Consumed Macros
  const consumed = useMemo(() => {
    let pro = 0, fat = 0, carb = 0, cal = 0;
    
    meals.forEach(m => {
      m.foods.forEach((f: any) => {
        const item = foodDb.find(db => db.id === f.id);
        if (item && f.amount) {
          const multiplier = Number(f.amount) / 100;
          pro += item.protein * multiplier;
          fat += item.fat * multiplier;
          carb += item.carbs * multiplier;
          cal += item.calories * multiplier;
        }
      });
    });

    return { cal, pro, fat, carb };
  }, [meals]);

  // Handlers
  const handleDetailChange = (e: any) => {
    setDetails({...details, [e.target.name]: e.target.value});
  };

  const addMeal = () => {
    setMeals([...meals, { id: Date.now().toString(), time: `Meal ${meals.length + 1}`, foods: [], supplements: [] }]);
  };

  const removeMeal = (id: string) => {
    setMeals(meals.filter(m => m.id !== id));
  };

  const updateMealTime = (id: string, time: string) => {
    setMeals(meals.map(m => m.id === id ? { ...m, time } : m));
  };

  const addFood = (mealId: string) => {
    setMeals(meals.map(m => {
      if (m.id === mealId) {
        return {
          ...m, 
          foods: [...m.foods, { internalId: Date.now().toString(), id: "", name: "", amount: "", unit: "g" }]
        };
      }
      return m;
    }));
  };

  const updateFood = (mealId: string, foodInternalId: string, field: string, value: string) => {
    setMeals(meals.map(m => {
      if (m.id === mealId) {
        return {
          ...m,
          foods: m.foods.map((f: any) => {
            if (f.internalId === foodInternalId) {
              const newFood = { ...f, [field]: value };
              // Auto-fill unit/name if id changed
              if (field === "id") {
                const dbItem = foodDb.find(db => db.id === value);
                if (dbItem) {
                  newFood.name = dbItem.name;
                  newFood.unit = dbItem.defaultUnit;
                }
              }
              return newFood;
            }
            return f;
          })
        };
      }
      return m;
    }));
  };

  const removeFood = (mealId: string, foodInternalId: string) => {
    setMeals(meals.map(m => {
      if (m.id === mealId) {
        return { ...m, foods: m.foods.filter((f: any) => f.internalId !== foodInternalId) };
      }
      return m;
    }));
  };

  const addSupplement = (mealId: string) => {
    setMeals(meals.map(m => {
      if (m.id === mealId) {
        return {
          ...m, 
          supplements: [...m.supplements, { internalId: Date.now().toString(), id: "", name: "", amount: "", unit: "scoop" }]
        };
      }
      return m;
    }));
  };

  const updateSupplement = (mealId: string, suppInternalId: string, field: string, value: string) => {
    setMeals(meals.map(m => {
      if (m.id === mealId) {
        return {
          ...m,
          supplements: m.supplements.map((s: any) => {
            if (s.internalId === suppInternalId) {
              const newSupp = { ...s, [field]: value };
              if (field === "id") {
                const dbItem = supplementsDb.find(db => db.id === value);
                if (dbItem) {
                  newSupp.name = dbItem.name;
                  newSupp.unit = dbItem.defaultUnit;
                }
              }
              return newSupp;
            }
            return s;
          })
        };
      }
      return m;
    }));
  };

  const removeSupplement = (mealId: string, suppInternalId: string) => {
    setMeals(meals.map(m => {
      if (m.id === mealId) {
        return { ...m, supplements: m.supplements.filter((s: any) => s.internalId !== suppInternalId) };
      }
      return m;
    }));
  };

  const generatePlan = async () => {
    setLoading(true);
    
    // Clean up internal IDs before sending payload
    const cleanedMeals = meals.map(m => ({
      time: m.time,
      foods: m.foods.map((f:any) => ({ name: f.name, amount: f.amount, unit: f.unit })),
      supplements: m.supplements.map((s:any) => ({ name: s.name, amount: s.amount, unit: s.unit })),
    }));

    const payload = {
      ...details,
      calories: targetCals,
      protein: targetPro,
      fat: targetFat,
      carbs: targetCarb,
      weightGain: targetGain,
      meals: cleanedMeals
    };

    try {
      // Assuming backend is running on 8000
      const res = await axios.post("http://localhost:8000/api/diet-plans/generate/", payload);
      alert("Plan Generated and Sent successfully!");
    } catch (e: any) {
      console.error(e);
      alert("Failed to generate plan. Ensure backend is running. " + (e.response?.data?.error || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
          <FileTextIcon className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Diet Plan Creator</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Draft, verify macros, and dispatch customized PDF plans.</p>
        </div>
      </div>

      {/* Sticky HUD */}
      <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-4 grid grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-1">Calories</div>
          <div className={`text-xl font-bold ${Math.abs(targetCals - consumed.cal) < 50 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
            {Math.round(consumed.cal)} / {Math.round(targetCals)} <span className="text-xs text-zinc-400 font-normal">kcal</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">Left: {Math.round(targetCals - consumed.cal)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-1">Protein</div>
          <div className={`text-xl font-bold ${Math.abs(targetPro - consumed.pro) < 5 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
            {Math.round(consumed.pro)} / {Math.round(targetPro)} <span className="text-xs text-zinc-400 font-normal">g</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">Left: {Math.round(targetPro - consumed.pro)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-1">Fat</div>
          <div className={`text-xl font-bold ${Math.abs(targetFat - consumed.fat) < 5 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
            {Math.round(consumed.fat)} / {Math.round(targetFat)} <span className="text-xs text-zinc-400 font-normal">g</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">Left: {Math.round(targetFat - consumed.fat)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-1">Carbs</div>
          <div className={`text-xl font-bold ${Math.abs(targetCarb - consumed.carb) < 10 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
            {Math.round(consumed.carb)} / {Math.round(targetCarb)} <span className="text-xs text-zinc-400 font-normal">g</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">Left: {Math.round(targetCarb - consumed.carb)}</div>
        </div>
      </div>

      {/* Plan Details */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-zinc-900 dark:text-white mb-2">General Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide font-medium text-zinc-500 mb-1">Period Start</label>
            <input type="date" name="startDate" value={details.startDate} onChange={handleDetailChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide font-medium text-zinc-500 mb-1">Period End</label>
            <input type="date" name="endDate" value={details.endDate} onChange={handleDetailChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide font-medium text-zinc-500 mb-1">Check-in Date</label>
            <input type="date" name="checkInDate" value={details.checkInDate} onChange={handleDetailChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide font-medium text-zinc-500 mb-1">Total Cardio (min)</label>
            <input type="number" name="totalCardio" placeholder="e.g. 150" value={details.totalCardio} onChange={handleDetailChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide font-medium text-zinc-500 mb-1">Client Email (to send PDF to)</label>
            <input type="email" name="clientEmail" placeholder="client@example.com" value={details.clientEmail} onChange={handleDetailChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none" />
          </div>
        </div>
      </div>

      {/* Meals Builder */}
      <div className="space-y-6">
        {meals.map((meal, index) => (
          <div key={meal.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
            
            <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-2 rounded border border-zinc-100 dark:border-zinc-800">
              <input 
                type="text" 
                value={meal.time} 
                onChange={(e) => updateMealTime(meal.id, e.target.value)} 
                className="font-bold text-lg bg-transparent border-none outline-none focus:ring-0 text-zinc-900 dark:text-white"
                placeholder="Meal Time (e.g., Breakfast)"
              />
              <button onClick={() => removeMeal(meal.id)} className="text-red-500 hover:text-red-600 p-2">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Foods */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Foods</h3>
              {meal.foods.length === 0 && <p className="text-xs text-zinc-400 italic">No foods added.</p>}
              
              {meal.foods.map((food: any) => (
                <div key={food.internalId} className="flex gap-2 items-center">
                  <select 
                    value={food.id} 
                    onChange={(e) => updateFood(meal.id, food.internalId, "id", e.target.value)}
                    className="flex-1 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-2 py-1 text-sm outline-none"
                  >
                    <option value="">Select Food...</option>
                    {foodDb.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  
                  <input 
                    type="number" 
                    value={food.amount} 
                    onChange={(e) => updateFood(meal.id, food.internalId, "amount", e.target.value)}
                    placeholder="Amt"
                    className="w-20 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-2 py-1 text-sm outline-none"
                  />
                  <input 
                    type="text" 
                    value={food.unit} 
                    disabled
                    className="w-12 bg-transparent text-center text-xs text-zinc-500 outline-none"
                  />
                  <button onClick={() => removeFood(meal.id, food.internalId)} className="text-zinc-400 hover:text-red-500 p-1">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="pt-2">
                <button onClick={() => addFood(meal.id)} className="text-xs font-semibold text-indigo-500 flex items-center gap-1 hover:text-indigo-600">
                  <PlusIcon className="w-3 h-3" /> Add Food
                </button>
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-800" />

            {/* Supplements */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Supplements</h3>
              {meal.supplements.length === 0 && <p className="text-xs text-zinc-400 italic">No supplements added.</p>}
              
              {meal.supplements.map((supp: any) => (
                <div key={supp.internalId} className="flex gap-2 items-center">
                  <select 
                    value={supp.id} 
                    onChange={(e) => updateSupplement(meal.id, supp.internalId, "id", e.target.value)}
                    className="flex-1 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-2 py-1 text-sm outline-none"
                  >
                    <option value="">Select Supplement...</option>
                    {supplementsDb.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  
                  <input 
                    type="number" 
                    value={supp.amount} 
                    onChange={(e) => updateSupplement(meal.id, supp.internalId, "amount", e.target.value)}
                    placeholder="Amt"
                    className="w-20 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-2 py-1 text-sm outline-none"
                  />
                  <input 
                    type="text" 
                    value={supp.unit} 
                    disabled
                    className="w-16 bg-transparent text-center text-xs text-zinc-500 outline-none"
                  />
                  <button onClick={() => removeSupplement(meal.id, supp.internalId)} className="text-zinc-400 hover:text-red-500 p-1">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="pt-2">
                <button onClick={() => addSupplement(meal.id)} className="text-xs font-semibold text-orange-500 flex items-center gap-1 hover:text-orange-600">
                  <PlusIcon className="w-3 h-3" /> Add Supplement
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      <button onClick={addMeal} className="w-full py-3 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-semibold hover:border-indigo-500 hover:text-indigo-500 transition-colors flex justify-center items-center gap-2">
        <PlusIcon className="w-5 h-5"/> Add Another Meal
      </button>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-64 right-0 p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button disabled={loading} onClick={generatePlan} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50">
          <SendIcon className="w-4 h-4" />
          {loading ? "Generating..." : "Generate PDF & Send"}
        </button>
      </div>
    </div>
  );
}

export default function DietPlanCreator() {
  return (
    <Suspense fallback={<div className="p-8">Loading Form...</div>}>
      <DietPlanCreatorContent />
    </Suspense>
  );
}
