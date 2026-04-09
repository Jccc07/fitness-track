// src/lib/calculations.ts
import type { UserProfile, HealthMetrics, DailyStats, DailyConclusion, MetValue } from "@/types";

// ─── BMR using Mifflin-St Jeor ─────────────────────────────────────────────
export function calculateBMR(profile: UserProfile): number {
  const { weight, height, age, sex } = profile;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

// ─── TDEE ──────────────────────────────────────────────────────────────────
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  moderate: 1.55,
  active: 1.725,
} as const;

export function calculateTDEE(bmr: number, activityLevel: UserProfile["activityLevel"]): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

// ─── Target Calories ───────────────────────────────────────────────────────
export function calculateTargetCalories(tdee: number, goal: UserProfile["goal"]): number {
  if (goal === "deficit") return Math.round(tdee - 500);
  if (goal === "bulk") return Math.round(tdee + 300);
  return tdee;
}

// ─── BMI ───────────────────────────────────────────────────────────────────
export function calculateBMI(weight: number, height: number): number {
  return parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1));
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

// ─── All Metrics ───────────────────────────────────────────────────────────
export function computeHealthMetrics(profile: UserProfile): HealthMetrics {
  const bmi = calculateBMI(profile.weight, profile.height);
  const bmr = Math.round(calculateBMR(profile));
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const targetCalories = calculateTargetCalories(tdee, profile.goal);
  return {
    bmi,
    bmiCategory: getBMICategory(bmi),
    bmr,
    tdee,
    targetCalories,
  };
}

// ─── MET-based calorie burn ─────────────────────────────────────────────────
export const MET_VALUES: MetValue[] = [
  { type: "walk", label: "Walking", met: 3.5 },
  { type: "run", label: "Running", met: 9.8 },
  { type: "cycle", label: "Cycling", met: 7.5 },
  { type: "swim", label: "Swimming", met: 8.0 },
  { type: "gym", label: "Weight Training", met: 5.0 },
  { type: "yoga", label: "Yoga", met: 2.5 },
  { type: "hiit", label: "HIIT", met: 10.0 },
  { type: "other", label: "Other Activity", met: 4.0 },
];

export function estimateCaloriesBurned(
  activityType: string,
  durationMinutes: number,
  weightKg: number
): number {
  const metEntry = MET_VALUES.find((m) => m.type === activityType) ?? MET_VALUES[MET_VALUES.length - 1];
  // Calories = MET × weight(kg) × duration(hours)
  return Math.round(metEntry.met * weightKg * (durationMinutes / 60));
}

// ─── Daily Conclusion (rule-based) ─────────────────────────────────────────
export function generateDailyConclusion(stats: DailyStats): DailyConclusion {
  const { caloriesConsumed, caloriesBurned, netCalories, targetCalories, meals, activities } = stats;
  const diff = netCalories - targetCalories;
  const absDiff = Math.abs(diff);

  // Macros analysis
  const totalProtein = meals.reduce((s, m) => s + (m.protein ?? 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs ?? 0), 0);
  const hasLowProtein = totalProtein < 50 && meals.length > 0;
  const hasHighCarbs = totalCarbs > 300 && meals.length > 0;
  const activityTypes = activities.map((a) => a.activityType);
  const hasCardio = activityTypes.some((t) => ["walk", "run", "cycle", "swim"].includes(t));

  let feedbackSummary: string;
  let healthInsight: string;
  let tomorrowAdvice: string;
  let status: DailyConclusion["status"];

  if (absDiff <= 100) {
    status = "great";
    feedbackSummary = `You nailed it today — your net intake was just ${absDiff} kcal ${diff >= 0 ? "above" : "below"} your target. That's excellent consistency!`;
    healthInsight = "You're well-aligned with your goal. Keeping this pattern is what drives real progress.";
    tomorrowAdvice = hasLowProtein
      ? "Try adding a protein source at each meal tomorrow — aim for at least 25g per sitting."
      : "Keep up the same routine tomorrow. You're building great habits.";
  } else if (diff > 100) {
    status = "over";
    feedbackSummary = `You exceeded your calorie target by ${absDiff} kcal today${hasCardio ? ", though your cardio helped offset some of that" : ""}.`;
    healthInsight =
      caloriesBurned > 400
        ? "Good news — your activity partially balanced the surplus. One occasional over-day won't derail progress."
        : "A consistent surplus without enough activity can slow progress toward your goal. Let's fix it tomorrow.";
    tomorrowAdvice = `Aim to trim about ${Math.min(absDiff, 400)} kcal from tomorrow's intake — swap sugary snacks for fruit or nuts, and consider a 30-min walk.`;
  } else if (diff < -500) {
    status = "under";
    feedbackSummary = `You were ${absDiff} kcal below your target today — that's quite a large deficit.`;
    healthInsight = "Eating too little can lead to muscle loss and fatigue, especially if you're active. A mild deficit is good; severe restriction isn't sustainable.";
    tomorrowAdvice = `Add a nutrient-dense snack or increase meal portions slightly to get closer to your ${targetCalories} kcal target.`;
  } else {
    status = "on-track";
    feedbackSummary = `You were ${absDiff} kcal ${diff > 0 ? "above" : "below"} your target today — you're close, just a small adjustment needed.`;
    healthInsight = hasHighCarbs
      ? "Your meals leaned heavy on carbs. Balancing with more protein and vegetables will support your goal better."
      : "You're on a good track overall. Small daily adjustments compound into big results.";
    tomorrowAdvice =
      activities.length === 0
        ? "Try adding even a 20-minute walk tomorrow — it'll help your net balance and boost energy."
        : `${hasLowProtein ? "Bump up protein intake tomorrow" : "Maintain your activity level"} and aim for ${targetCalories} kcal.`;
  }

  return { feedbackSummary, healthInsight, tomorrowAdvice, status };
}

// ─── Weekly suggestions ─────────────────────────────────────────────────────
export function generateWeeklySuggestions(
  avgConsumed: number,
  avgBurned: number,
  target: number,
  daysLogged: number
): string[] {
  const suggestions: string[] = [];
  const avgNet = avgConsumed - avgBurned;

  if (daysLogged < 5) {
    suggestions.push("Log your meals and activities at least 5 days a week for meaningful insights.");
  }
  if (avgNet > target + 300) {
    suggestions.push("Your weekly average shows a consistent surplus. Consider 2–3 cardio sessions to balance it out.");
  }
  if (avgConsumed < target - 400) {
    suggestions.push("You're consistently eating well below target. Gradual increases prevent metabolic adaptation.");
  }
  if (avgBurned < 200) {
    suggestions.push("Your average burn is low. Even a daily 30-min walk can add 150–250 kcal burned.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Excellent week! You're consistently close to your targets — keep the momentum going.");
  }

  return suggestions;
}