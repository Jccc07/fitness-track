"use client";
// src/app/insights/page.tsx
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { BarChart3, Lightbulb, TrendingUp } from "lucide-react";
import WeeklyChart from "@/components/charts/WeeklyChart";
import MacroChart from "@/components/charts/MacroChart";
import DailyConclusion from "@/components/ui/DailyConclusion";
import type { DailyConclusion as DC, WeeklySummary, HealthMetrics } from "@/types";

interface InsightsData {
  dailyConclusion: DC;
  weeklySummary: WeeklySummary;
  suggestions: string[];
  metrics: HealthMetrics;
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    fetch(`/api/insights?date=${today}`).then(r => r.json()).then(d => {
      if (!d.error) setData(d);
      setLoading(false);
    });
  }, [today]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
    </div>
  );

  if (!data) return (
    <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
      Complete your profile to see insights.
    </div>
  );

  const { weeklySummary, suggestions, metrics, dailyConclusion } = data;

  // Aggregate macros for the week
  const allMeals = weeklySummary.dailyStats.flatMap(d => d.meals);
  const totalProtein = allMeals.reduce((s, m) => s + (m.protein ?? 0), 0);
  const totalCarbs = allMeals.reduce((s, m) => s + (m.carbs ?? 0), 0);
  const totalFat = allMeals.reduce((s, m) => s + (m.fat ?? 0), 0);

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "var(--accent-glow)", border: "1px solid var(--accent-dim)" }}>
          <BarChart3 size={20} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold">Weekly Insights</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Last 7 days ending {format(new Date(), "MMMM d")}
          </p>
        </div>
      </div>

      {/* Weekly stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Days Logged", value: weeklySummary.daysLogged, unit: "/ 7", color: "var(--accent)" },
          { label: "Avg Consumed", value: weeklySummary.avgDailyConsumed, unit: "kcal/day", color: "#a855f7" },
          { label: "Avg Burned", value: weeklySummary.avgDailyBurned, unit: "kcal/day", color: "#f59e0b" },
          { label: "Total Burned", value: weeklySummary.totalBurned, unit: "kcal this week", color: "#3b82f6" },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="card text-center">
            <div className="text-xl font-bold" style={{ color, fontFamily: "Syne" }}>{value}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
            <div className="text-xs" style={{ color: "var(--text-dim)" }}>{unit}</div>
          </div>
        ))}
      </div>

      {/* 7-Day Chart */}
      <div className="card">
        <h3 className="font-semibold text-sm mb-4">Calories In vs. Out</h3>
        <WeeklyChart data={weeklySummary.dailyStats} target={metrics.targetCalories} />
      </div>

      {/* Macros pie */}
      {(totalProtein + totalCarbs + totalFat) > 0 && (
        <div className="card">
          <h3 className="font-semibold text-sm mb-4">Weekly Macro Breakdown</h3>
          <MacroChart protein={totalProtein} carbs={totalCarbs} fat={totalFat} />
        </div>
      )}

      {/* Daily Conclusion */}
      <DailyConclusion data={dailyConclusion} />

      {/* Suggestions */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={16} style={{ color: "var(--accent)" }} />
          <h3 className="font-semibold text-sm">Personalized Suggestions</h3>
        </div>
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <div key={i} className="flex gap-3 text-sm py-2 border-b last:border-0"
              style={{ borderColor: "var(--border)" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
                {i + 1}
              </span>
              <span style={{ color: "var(--text-muted)" }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-day breakdown */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} style={{ color: "var(--accent)" }} />
          <h3 className="font-semibold text-sm">Day-by-Day Breakdown</h3>
        </div>
        <div className="space-y-2">
          {weeklySummary.dailyStats.map(d => {
            const net = d.caloriesConsumed - d.caloriesBurned;
            const diff = net - metrics.targetCalories;
            const hasData = d.caloriesConsumed > 0;
            return (
              <div key={d.date} className="flex items-center gap-3 text-sm py-2 border-b last:border-0"
                style={{ borderColor: "var(--border)" }}>
                <div className="w-20 text-xs" style={{ color: "var(--text-muted)" }}>
                  {format(new Date(d.date + "T00:00:00"), "EEE d")}
                </div>
                {hasData ? (
                  <>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (d.caloriesConsumed / metrics.targetCalories) * 100)}%`,
                          background: diff > 200 ? "var(--danger)" : diff < -300 ? "var(--warning)" : "var(--accent)"
                        }} />
                    </div>
                    <div className="text-xs w-20 text-right" style={{ color: "var(--text-muted)" }}>
                      {d.caloriesConsumed} kcal
                    </div>
                    <div className={`text-xs w-16 text-right ${diff > 0 ? "text-red-400" : "text-green-400"}`}>
                      {diff > 0 ? "+" : ""}{diff} kcal
                    </div>
                  </>
                ) : (
                  <span className="text-xs" style={{ color: "var(--text-dim)" }}>Not logged</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}