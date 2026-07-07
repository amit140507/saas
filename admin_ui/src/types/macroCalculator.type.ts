export type WeightUnit = "kg" | "lbs";

export type Gender = "male" | "female";

export type BmrFormula = "mifflin" | "harris";

export type Goal = "fat_loss" | "muscle_gain" | "maintenance";

export type TrainingType = "none" | "light" | "moderate" | "high";

export type CardioType = "none" | "light" | "moderate" | "hard";

export interface MacroCalculatorInput {
  weight: number;
  weightUnit: WeightUnit;
  height: number;
  age: number;
  gender: Gender;
  bmrFormula: BmrFormula;
  activityFactor: number;
  goal: Goal;
  weightChangePerWeek: number;
  trainingType: TrainingType;
  trainingSessions: number;
  trainingDuration: number;
  cardioType: CardioType;
  cardioSessions: number;
  cardioDuration: number;
  protein_g_kg: number;
  fat_g_kg: number;
}

export interface MacroCalculatorResults {
  bmr: number;
  tdee: number;
  tdeePlusEe: number;
  deficitSurplusNeeded: number;
  calorieGoal: number;
  recommendedGainRate: number;
  recommendedGainAmount: number;
  trainingWeekly: number;
  trainingDaily: number;
  trainingPerSession: number;
  cardioWeekly: number;
  cardioDaily: number;
  cardioPerSession: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
}
