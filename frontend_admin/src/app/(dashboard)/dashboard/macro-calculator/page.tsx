"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalculatorIcon, UserIcon, ActivityIcon, TargetIcon, DumbbellIcon, HeartPulseIcon, ArrowRightIcon } from "lucide-react";

export default function MacroCalculator() {
  const router = useRouter();
  
  const [data, setData] = useState({
    weight: 80,
    weightUnit: "kg",
    height: 180,
    age: 30,
    gender: "male",
    bmrFormula: "mifflin",
    activityFactor: 1.2,
    goal: "fat_loss",
    weightChangePerWeek: 0.5, // %
    
    trainingType: "moderate",
    trainingSessions: 4,
    trainingDuration: 60,
    
    cardioType: "moderate",
    cardioSessions: 2,
    cardioDuration: 30,
    
    protein_g_kg: 2.2,
    fat_g_kg: 1.0,
  });

  const [results, setResults] = useState({
    bmr: 0,
    tdee: 0,
    tdeePlusEe: 0,
    deficitSurplusNeeded: 0,
    calorieGoal: 0,
    recommendedGainRate: 0,
    recommendedGainAmount: 0,
    
    trainingWeekly: 0,
    trainingDaily: 0,
    trainingPerSession: 0,
    
    cardioWeekly: 0,
    cardioDaily: 0,
    cardioPerSession: 0,
    
    proteinGrams: 0,
    fatGrams: 0,
    carbsGrams: 0,
  });

  useEffect(() => {
    calculateAll();
  }, [data]);

  const handleChange = (e: any) => {
    const { name, value, type } = e.target;
    let parsedValue = value;
    if (type === "number") parsedValue = value === "" ? "" : Number(value);
    
    setData(prev => ({ ...prev, [name]: parsedValue }));
  };

  const calculateAll = () => {
    // 1. Base Calcs
    const weightKg = data.weightUnit === "lbs" ? Number(data.weight) * 0.453592 : Number(data.weight);
    const heightCm = Number(data.height);
    const age = Number(data.age);

    let bmr = 0;
    if (data.bmrFormula === "mifflin") {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + (data.gender === "male" ? 5 : -161);
    } else {
      // Harris-Benedict
      bmr = data.gender === "male"
        ? (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age) + 88.362
        : (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age) + 447.593;
    }

    const tdee = bmr * Number(data.activityFactor);

    // 2. Training EE
    const metsMap: any = {
      light: 3,
      moderate: 5,
      high: 7,
      none: 0,
    };
    const tMet = metsMap[data.trainingType] || 0;
    const kcalPerMinTrain = (tMet * 3.5 * weightKg) / 200;
    const trainingPerSession = kcalPerMinTrain * Number(data.trainingDuration);
    const trainingWeekly = trainingPerSession * Number(data.trainingSessions);
    const trainingDaily = trainingWeekly / 7;

    // 3. Cardio EE
    const cMetsMap: any = {
      light: 4,
      moderate: 7,
      hard: 10,
      none: 0,
    };
    const cMet = cMetsMap[data.cardioType] || 0;
    const kcalPerMinCardio = (cMet * 3.5 * weightKg) / 200;
    const cardioPerSession = kcalPerMinCardio * Number(data.cardioDuration);
    const cardioWeekly = cardioPerSession * Number(data.cardioSessions);
    const cardioDaily = cardioWeekly / 7;

    const tdeePlusEe = tdee + trainingDaily + cardioDaily;

    // 4. Goals & Modification
    // 1kg fat = 7700 kcal
    const weightChangeAmount = weightKg * (Number(data.weightChangePerWeek) / 100);
    const weightChangeAmountLbs = weightChangeAmount * 2.20462;
    const kcalChangeWeekly = weightChangeAmount * 7700;
    const defSurplusDaily = kcalChangeWeekly / 7;

    let calorieGoal = tdeePlusEe;
    if (data.goal === "fat_loss") {
      calorieGoal -= defSurplusDaily;
    } else if (data.goal === "muscle_gain") {
      calorieGoal += defSurplusDaily;
    }

    // 5. Macros
    const protGrams = weightKg * Number(data.protein_g_kg);
    const fatGrams = weightKg * Number(data.fat_g_kg);
    const protKcal = protGrams * 4;
    const fatKcal = fatGrams * 9;
    
    let carbsGrams = (calorieGoal - protKcal - fatKcal) / 4;
    if (carbsGrams < 0) carbsGrams = 0;

    setResults({
      bmr,
      tdee,
      tdeePlusEe,
      deficitSurplusNeeded: defSurplusDaily,
      calorieGoal,
      recommendedGainRate: Number(data.weightChangePerWeek),
      recommendedGainAmount: weightChangeAmount,
      trainingWeekly,
      trainingDaily,
      trainingPerSession,
      cardioWeekly,
      cardioDaily,
      cardioPerSession,
      proteinGrams: protGrams,
      fatGrams: fatGrams,
      carbsGrams: carbsGrams,
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
          <CalculatorIcon className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Macro & TDEE Calculator</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Internal tool to calculate client macros and diet plans.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* INPUTS COLUMN */}
        <div className="space-y-6">
          
          {/* CLIENT DATA SECTION */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-zinc-900 dark:text-white">
              <UserIcon className="w-5 h-5 text-indigo-500" /> Client Data
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Weight</label>
                <div className="flex">
                  <input type="number" name="weight" value={data.weight} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-l-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  <select name="weightUnit" value={data.weightUnit} onChange={handleChange} className="bg-zinc-100 dark:bg-zinc-800 border-y border-r border-zinc-200 dark:border-zinc-800 rounded-r-md px-2 text-sm outline-none">
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Height (cm)</label>
                <input type="number" name="height" value={data.height} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Age</label>
                <input type="number" name="age" value={data.age} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gender</label>
                <select name="gender" value={data.gender} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">BMR Formula</label>
                <select name="bmrFormula" value={data.bmrFormula} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="mifflin">Mifflin-St Jeor</option>
                  <option value="harris">Harris-Benedict</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Activity Factor</label>
                <select name="activityFactor" value={data.activityFactor} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="1.2">Sedentary (1.2) - Desk job, no exercise</option>
                  <option value="1.375">Lightly Active (1.375) - Light exercise 1-3 days/week</option>
                  <option value="1.55">Moderately Active (1.55) - Moderate exercise 3-5 days/week</option>
                  <option value="1.725">Very Active (1.725) - Hard exercise 6-7 days/week</option>
                  <option value="1.9">Extra Active (1.9) - Very hard exercise/sports</option>
                </select>
              </div>
            </div>
          </div>

          {/* GOAL SECTION */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-zinc-900 dark:text-white">
              <TargetIcon className="w-5 h-5 text-emerald-500" /> Goal Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Primary Goal</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="goal" value="fat_loss" checked={data.goal === "fat_loss"} onChange={handleChange} className="text-indigo-600 focus:ring-indigo-500" />
                    <span>Fat Loss</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="goal" value="muscle_gain" checked={data.goal === "muscle_gain"} onChange={handleChange} className="text-indigo-600 focus:ring-indigo-500" />
                    <span>Muscle Gain</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="goal" value="maintenance" checked={data.goal === "maintenance"} onChange={handleChange} className="text-indigo-600 focus:ring-indigo-500" />
                    <span>Maintenance</span>
                  </label>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Weight Change Per Week (%)</label>
                <input type="number" step="0.1" name="weightChangePerWeek" value={data.weightChangePerWeek} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" disabled={data.goal === "maintenance"} />
              </div>
            </div>
          </div>

          {/* TRAINING & CARDIO */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-zinc-900 dark:text-white">
              <DumbbellIcon className="w-5 h-5 text-blue-500" /> Training Details
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium mb-1 text-zinc-500 uppercase">Type</label>
                <select name="trainingType" value={data.trainingType} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="none">No Weights</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-zinc-500 uppercase">Sessions/Wk</label>
                <input type="number" name="trainingSessions" value={data.trainingSessions} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-zinc-500 uppercase">Duration(m)</label>
                <input type="number" name="trainingDuration" value={data.trainingDuration} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-zinc-900 dark:text-white">
              <HeartPulseIcon className="w-5 h-5 text-red-500" /> Cardio Details
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-zinc-500 uppercase">Type</label>
                <select name="cardioType" value={data.cardioType} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="none">None</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-zinc-500 uppercase">Sessions/Wk</label>
                <input type="number" name="cardioSessions" value={data.cardioSessions} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-zinc-500 uppercase">Duration(m)</label>
                <input type="number" name="cardioDuration" value={data.cardioDuration} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>

          {/* NUTRITION GOALS */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-zinc-900 dark:text-white">
              <ActivityIcon className="w-5 h-5 text-orange-500" /> Nutrition Goals (g/kg)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Protein (g/kg)</label>
                <input type="number" step="0.1" name="protein_g_kg" value={data.protein_g_kg} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fat (g/kg)</label>
                <input type="number" step="0.1" name="fat_g_kg" value={data.fat_g_kg} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>

        </div>

        {/* OUTPUTS COLUMN */}
        <div className="space-y-6">
          
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-md">
            <h2 className="text-xl font-bold mb-2">Final Calorie Goal</h2>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black tracking-tight">{Math.round(results.calorieGoal)}</span>
              <span className="text-indigo-100 mb-1">kcal / day</span>
            </div>
            {data.goal !== "maintenance" && (
              <p className="mt-2 text-indigo-100 text-sm font-medium">
                {data.goal === 'fat_loss' ? 'Deficit' : 'Surplus'} of {Math.round(results.deficitSurplusNeeded)} kcal included.
              </p>
            )}
          </div>

          {/* MACROS */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">Macronutrient Goals</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wide">Protein</div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">{Math.round(results.proteinGrams)}g</div>
                <div className="text-xs text-zinc-500 mt-1">{Math.round(results.proteinGrams * 4)} kcal</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <div className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-1 uppercase tracking-wide">Fat</div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">{Math.round(results.fatGrams)}g</div>
                <div className="text-xs text-zinc-500 mt-1">{Math.round(results.fatGrams * 9)} kcal</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1 uppercase tracking-wide">Carbs</div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">{Math.round(results.carbsGrams)}g</div>
                <div className="text-xs text-zinc-500 mt-1">{Math.round(results.carbsGrams * 4)} kcal</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">Metabolic Overview</h2>
            <div className="space-y-3 font-medium text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-500">Basal Metabolic Rate (BMR)</span>
                <span className="text-zinc-900 dark:text-white">{Math.round(results.bmr)} kcal</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-500">Total Daily Energy Expenditure (TDEE)</span>
                <span className="text-zinc-900 dark:text-white">{Math.round(results.tdee)} kcal</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-zinc-100 dark:border-zinc-800 pt-2 font-bold">
                <span className="text-zinc-700 dark:text-zinc-300">TDEE + Exercise (EE)</span>
                <span className="text-zinc-900 dark:text-white">{Math.round(results.tdeePlusEe)} kcal</span>
              </div>
            </div>
          </div>

          {data.goal !== "maintenance" && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">Recommended Weekly {data.goal === 'fat_loss' ? 'Loss' : 'Gain'}</h2>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-zinc-900 dark:text-white">{results.recommendedGainRate}%</div>
                <div className="text-zinc-400">of BW =</div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-white">{results.recommendedGainAmount.toFixed(2)} kg</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 text-center">Training EE</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Weekly:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{Math.round(results.trainingWeekly)} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Daily AVG:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{Math.round(results.trainingDaily)} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Per Sess:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{Math.round(results.trainingPerSession)} kcal</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 text-center">Cardio EE</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Weekly:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{Math.round(results.cardioWeekly)} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Daily AVG:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{Math.round(results.cardioDaily)} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Per Sess:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{Math.round(results.cardioPerSession)} kcal</span>
                </div>
              </div>
            </div>
          </div>

          <button onClick={() => {
            router.push(`/dashboard/diet-plan-creator?calories=${Math.round(results.calorieGoal)}&protein=${Math.round(results.proteinGrams)}&fat=${Math.round(results.fatGrams)}&carbs=${Math.round(results.carbsGrams)}&gain=${results.recommendedGainRate}`)
          }} className="w-full mt-4 flex justify-between items-center bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold py-3 px-4 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors">
            <span>Create Diet Plan from these Macros</span>
            <ArrowRightIcon className="w-5 h-5" />
          </button>

        </div>
      </div>
    </div>
  );
}
