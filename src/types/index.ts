// src/types/index.ts

export interface UserProfile {
  id: string;
  age: number;
  sex: "male" | "female";
  height: number; // cm
  weight: number; // kg
  activityLevel: "sedentary" | "moderate" | "active";
  goal: "maintain" | "deficit" | "bulk";
}

export interface HealthMetrics {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  targetCalories: number;
}

export interface MealLog {
  id: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  entryType: "manual" | "product" | "image";
  foodName: string;
  ingredients?: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  brandName?: string;
  productName?: string;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  date: string;
  entryType: "manual" | "screenshot";
  activityType: string;
  duration?: number; // minutes
  distance?: number; // km
  reps?: number;
  caloriesBurned: number;
  notes?: string;
}

export interface WeightLog {
  id: string;
  weight: number;
  date: string;
}

export interface DailyStats {
  date: string;
  caloriesConsumed: number;
  caloriesBurned: number;
  netCalories: number;
  targetCalories: number;
  meals: MealLog[];
  activities: ActivityLog[];
}

export interface WeeklySummary {
  totalConsumed: number;
  totalBurned: number;
  avgDailyConsumed: number;
  avgDailyBurned: number;
  daysLogged: number;
  dailyStats: DailyStats[];
}

export interface DailyConclusion {
  feedbackSummary: string;
  healthInsight: string;
  tomorrowAdvice: string;
  status: "on-track" | "over" | "under" | "great";
}

export type ActivityType =
  | "walk"
  | "run"
  | "cycle"
  | "swim"
  | "gym"
  | "yoga"
  | "hiit"
  | "other";

export interface MetValue {
  type: ActivityType;
  label: string;
  met: number;
}