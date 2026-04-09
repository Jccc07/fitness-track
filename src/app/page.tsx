"use client";
// src/app/page.tsx
import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Flame, Utensils, TrendingUp, Target, ChevronRight, AlertCircle
} from "lucide-react";
import Link from "next/link";
import CalorieRing from "@/components/charts/CalorieRing";
import WeeklyChart from "@/components/charts/WeeklyChart";
import DailyConclusion from "@/components/ui/DailyConclusion";
import StatCard from "@/components/ui/StatCard";
import type { MealLog, ActivityLog, DailyConclusion as DC, WeeklySummary, HealthMetrics } from "@/types";

interface InsightsData {
  dailyConclusion: DC;
  weeklySummary: WeeklySummary;
  suggestions: string[];
  metrics: HealthMetrics;
}

export default function Dashboard() {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    Promise.all([
      fetch(`/api/insights?date=${today}`).then(r => r.json()),
      fetch(`/api/meals?date=${today}`).then(r => r.json()),
      fetch(`/api/activities?date=${today}`).then(r => r.json()),
    ]).then(([ins, ml, al]) => {
      setInsights(ins.error ? null : ins);
      setMeals(Array.isArray(ml) ? ml : []);
      setActivities(Array.isArray(al) ? al : []);
      setLoading(false);
    });
  }, [today]);

  const caloriesConsumed = meals.reduce((s, m) => s + m.calories, 0);
  const caloriesBurned = activities.reduce((s, a) => s + a.caloriesBurned, 0);
  const target = insights?.metrics?.targetCalories ?? 2000;
  const remaining = target - caloriesConsumed + caloriesBurned;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
    </div>
  );

  if (!insights?.metrics) return (
    <div className="flex flex-col items-center justify-center h-72 gap-4 text-center fade-up">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "var(--accent-glow)", border: "1px solid var(--accent-dim)" }}>
        <AlertCircle size={28} style={{ color: "var(--accent)" }} />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-1">Set up your profile first</h2>
        <p style={{ color: "var(--text-muted)" }} className="text-sm">
          We need a few details to calculate your personalized targets.
        </p>
      </div>
      <Link href="/profile" className="btn-primary">Get Started →</Link>
    </div>
  );

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Today</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
        <div className="badge" style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent-dim)" }}>
          {insights.metrics.targetCalories} kcal target
        </div>
      </div>

      {/* Calorie Ring + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card card-glow flex flex-col items-center justify-center py-6 md:col-span-1">
          <CalorieRing consumed={caloriesConsumed} target={target} burned={caloriesBurned} />
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            {remaining > 0 ? `${remaining} kcal remaining` : `${Math.abs(remaining)} kcal over`}
          </p>
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <StatCard
            icon={<Utensils size={18} />}
            label="Consumed"
            value={`${caloriesConsumed}`}
            unit="kcal"
            color="var(--accent)"
          />
          <StatCard
            icon={<Flame size={18} />}
            label="Burned"
            value={`${caloriesBurned}`}
            unit="kcal"
            color="#f59e0b"
          />
          <StatCard
            icon={<Target size={18} />}
            label="Net"
            value={`${caloriesConsumed - caloriesBurned}`}
            unit="kcal"
            color="var(--info)"
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            label="BMI"
            value={`${insights.metrics.bmi}`}
            unit={insights.metrics.bmiCategory}
            color="#a855f7"
          />
        </div>
      </div>

      {/* Daily Conclusion */}
      {insights.dailyConclusion && (
        <DailyConclusion data={insights.dailyConclusion} />
      )}

      {/* Today's Food + Activities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meals */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Today's Meals</h3>
            <Link href="/log" className="text-xs flex items-center gap-1"
              style={{ color: "var(--accent)" }}>
              Add <ChevronRight size={12} />
            </Link>
          </div>
          {meals.length === 0 ? (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-dim)" }}>
              No meals logged yet
            </p>
          ) : (
            <div className="space-y-2">
              {meals.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm py-1.5 border-b"
                  style={{ borderColor: "var(--border)" }}>
                  <div>
                    <span className="font-medium">{m.foodName}</span>
                    <span className="ml-2 badge text-xs"
                      style={{ background: "var(--bg-card2)", color: "var(--text-muted)" }}>
                      {m.mealType}
                    </span>
                  </div>
                  <span style={{ color: "var(--accent)" }}>{m.calories} kcal</span>
                </div>
              ))}
              {meals.length > 5 && (
                <p className="text-xs text-center pt-1" style={{ color: "var(--text-muted)" }}>
                  +{meals.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Activities */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Today's Activities</h3>
            <Link href="/log/activity" className="text-xs flex items-center gap-1"
              style={{ color: "var(--accent)" }}>
              Add <ChevronRight size={12} />
            </Link>
          </div>
          {activities.length === 0 ? (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-dim)" }}>
              No activities logged yet
            </p>
          ) : (
            <div className="space-y-2">
              {activities.map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm py-1.5 border-b"
                  style={{ borderColor: "var(--border)" }}>
                  <span className="font-medium capitalize">{a.activityType}
                    {a.duration ? ` · ${a.duration}min` : ""}
                    {a.distance ? ` · ${a.distance}km` : ""}
                  </span>
                  <span style={{ color: "#f59e0b" }}>-{a.caloriesBurned} kcal</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Weekly Chart */}
      {insights.weeklySummary && (
        <div className="card">
          <h3 className="font-semibold text-sm mb-4">7-Day Overview</h3>
          <WeeklyChart data={insights.weeklySummary.dailyStats} target={target} />
        </div>
      )}

      {/* Weekly Suggestions */}
      {insights.suggestions && insights.suggestions.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-sm mb-3">Weekly Suggestions</h3>
          <div className="space-y-2">
            {insights.suggestions.map((s, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span style={{ color: "var(--accent)" }}>→</span>
                <span style={{ color: "var(--text-muted)" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}