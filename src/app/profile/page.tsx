"use client";
// src/app/profile/page.tsx
import { useEffect, useState } from "react";
import { User, Scale, Ruler, Activity, Target, TrendingUp } from "lucide-react";
import WeightChart from "@/components/charts/WeightChart";
import type { UserProfile, HealthMetrics, WeightLog } from "@/types";

const defaultProfile: Omit<UserProfile, "id"> = {
  age: 25,
  sex: "male",
  height: 170,
  weight: 70,
  activityLevel: "moderate",
  goal: "maintain",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState(defaultProfile);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(data => {
      if (data?.profile) {
        setProfile(data.profile);
        setMetrics(data.metrics);
      }
    });
    fetch("/api/profile/weight").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setWeightLogs(data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    if (data.metrics) setMetrics(data.metrics);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Refresh weight logs
    fetch("/api/profile/weight").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setWeightLogs(data);
    });
  };

  const MetricCard = ({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) => (
    <div className="card text-center">
      <div className="text-2xl font-bold" style={{ color, fontFamily: "Syne, sans-serif" }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>{sub}</div>
    </div>
  );

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "var(--accent-glow)", border: "1px solid var(--accent-dim)" }}>
          <User size={20} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold">Health Profile</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Your personal biometric data
          </p>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="BMI" value={String(metrics.bmi)} sub={metrics.bmiCategory} color="var(--accent)" />
          <MetricCard label="BMR" value={`${metrics.bmr}`} sub="kcal/day at rest" color="#a855f7" />
          <MetricCard label="TDEE" value={`${metrics.tdee}`} sub="maintenance calories" color="#3b82f6" />
          <MetricCard label="Target" value={`${metrics.targetCalories}`} sub="daily goal" color="#f59e0b" />
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Scale size={16} style={{ color: "var(--accent)" }} /> Body Measurements
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Age</label>
            <input type="number" min={10} max={100}
              value={profile.age}
              onChange={e => setProfile(p => ({ ...p, age: +e.target.value }))} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Sex</label>
            <select value={profile.sex} onChange={e => setProfile(p => ({ ...p, sex: e.target.value as "male" | "female" }))}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
              <Ruler size={12} className="inline mr-1" />Height (cm)
            </label>
            <input type="number" min={100} max={250}
              value={profile.height}
              onChange={e => setProfile(p => ({ ...p, height: +e.target.value }))} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
              <Scale size={12} className="inline mr-1" />Weight (kg)
            </label>
            <input type="number" min={30} max={300} step={0.1}
              value={profile.weight}
              onChange={e => setProfile(p => ({ ...p, weight: +e.target.value }))} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
              <Activity size={12} className="inline mr-1" />Activity Level
            </label>
            <select value={profile.activityLevel}
              onChange={e => setProfile(p => ({ ...p, activityLevel: e.target.value as UserProfile["activityLevel"] }))}>
              <option value="sedentary">Sedentary (desk job)</option>
              <option value="moderate">Moderate (3–5x/week)</option>
              <option value="active">Active (6–7x/week)</option>
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
              <Target size={12} className="inline mr-1" />Goal
            </label>
            <select value={profile.goal}
              onChange={e => setProfile(p => ({ ...p, goal: e.target.value as UserProfile["goal"] }))}>
              <option value="maintain">Maintain weight</option>
              <option value="deficit">Lose weight (−500 kcal)</option>
              <option value="bulk">Gain muscle (+300 kcal)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Profile"}
          </button>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            Saving updates your calorie targets automatically
          </p>
        </div>
      </form>

      {/* Calculations Transparency */}
      {metrics && (
        <div className="card">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp size={16} style={{ color: "var(--accent)" }} /> How We Calculate
          </h2>
          <div className="space-y-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
              <span>BMR (Mifflin-St Jeor)</span>
              <span style={{ color: "var(--text)" }}>{metrics.bmr} kcal</span>
            </div>
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
              <span>× Activity multiplier ({profile.activityLevel})</span>
              <span style={{ color: "var(--text)" }}>{metrics.tdee} kcal</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>Goal adjustment ({profile.goal})</span>
              <span style={{ color: "var(--accent)" }}>= {metrics.targetCalories} kcal/day</span>
            </div>
          </div>
        </div>
      )}

      {/* Weight history chart */}
      {weightLogs.length > 1 && (
        <div className="card">
          <h2 className="font-semibold text-sm mb-3">Weight Progress</h2>
          <WeightChart data={weightLogs} />
        </div>
      )}
    </div>
  );
}