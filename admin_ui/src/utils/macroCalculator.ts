import type {
  MacroCalculatorInput,
  MacroCalculatorResults,
  TrainingType,
  CardioType,
} from "@/types/macroCalculator.type";

const KG_PER_LB = 0.453592;
const KCAL_PER_KG_FAT = 7700;

const trainingMetsByType: Record<TrainingType, number> = {
  none: 0,
  light: 3,
  moderate: 5,
  high: 7,
};

const cardioMetsByType: Record<CardioType, number> = {
  none: 0,
  light: 4,
  moderate: 7,
  hard: 10,
};

const calculateExerciseEnergy = (
  mets: number,
  weightKg: number,
  durationMinutes: number,
  weeklySessions: number,
) => {
  const kcalPerMinute = (mets * 3.5 * weightKg) / 200;
  const perSession = kcalPerMinute * durationMinutes;
  const weekly = perSession * weeklySessions;

  return {
    perSession,
    weekly,
    daily: weekly / 7,
  };
};

export const calculateMacroResults = (
  input: MacroCalculatorInput,
): MacroCalculatorResults => {
  const weightKg =
    input.weightUnit === "lbs" ? input.weight * KG_PER_LB : input.weight;

  const bmr =
    input.bmrFormula === "mifflin"
      ? 10 * weightKg +
        6.25 * input.height -
        5 * input.age +
        (input.gender === "male" ? 5 : -161)
      : input.gender === "male"
        ? 13.397 * weightKg + 4.799 * input.height - 5.677 * input.age + 88.362
        : 9.247 * weightKg + 3.098 * input.height - 4.33 * input.age + 447.593;

  const tdee = bmr * input.activityFactor;

  const trainingEnergy = calculateExerciseEnergy(
    trainingMetsByType[input.trainingType],
    weightKg,
    input.trainingDuration,
    input.trainingSessions,
  );
  const cardioEnergy = calculateExerciseEnergy(
    cardioMetsByType[input.cardioType],
    weightKg,
    input.cardioDuration,
    input.cardioSessions,
  );

  const tdeePlusEe = tdee + trainingEnergy.daily + cardioEnergy.daily;
  const weightChangeAmount = weightKg * (input.weightChangePerWeek / 100);
  const deficitSurplusNeeded =
    (weightChangeAmount * KCAL_PER_KG_FAT) / 7;

  let calorieGoal = tdeePlusEe;
  if (input.goal === "fat_loss") {
    calorieGoal -= deficitSurplusNeeded;
  } else if (input.goal === "muscle_gain") {
    calorieGoal += deficitSurplusNeeded;
  }

  const proteinGrams = weightKg * input.protein_g_kg;
  const fatGrams = weightKg * input.fat_g_kg;
  const proteinKcal = proteinGrams * 4;
  const fatKcal = fatGrams * 9;
  const carbsGrams = Math.max((calorieGoal - proteinKcal - fatKcal) / 4, 0);

  return {
    bmr,
    tdee,
    tdeePlusEe,
    deficitSurplusNeeded,
    calorieGoal,
    recommendedGainRate: input.weightChangePerWeek,
    recommendedGainAmount: weightChangeAmount,
    trainingWeekly: trainingEnergy.weekly,
    trainingDaily: trainingEnergy.daily,
    trainingPerSession: trainingEnergy.perSession,
    cardioWeekly: cardioEnergy.weekly,
    cardioDaily: cardioEnergy.daily,
    cardioPerSession: cardioEnergy.perSession,
    proteinGrams,
    fatGrams,
    carbsGrams,
  };
};
