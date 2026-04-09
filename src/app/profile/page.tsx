"use client";
// src/app/profile/page.tsx
import { useEffect, useState } from "react";
import { User, Scale, Ruler, Activity, Target, TrendingUp, Edit2, Check } from "lucide-react";
import WeightChart from "@/components/charts/WeightChart";
import type { UserProfile, HealthMetrics, WeightLog } from "@/types";

const defaultProfile: Omit<UserProfile, "id"> = {
  age: 25, sex: "male", height: 170, weight: 70, activityLevel: "moderate", goal: "maintain",
};

type HeightUnit = "cm" | "ftin";

// Convert cm ↔ ft/in
function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { ft, inches };
}
function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * 2.54);
}

// Custom stepper input
function StepInput({
  label, value, min, max, step = 1, unit,
  onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>{label}</label>
      <div className="flex items-center gap-1 rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--bg-card2)" }}>
        <button type="button"
          className="w-10 h-10 flex items-center justify-center text-lg font-bold transition-colors hover:bg-white/5 flex-shrink-0"
          style={{ color: "var(--accent)" }}
          onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}>
          −
        </button>
        <div className="flex-1 text-center">
          <span className="text-base font-semibold">{value}</span>
          {unit && <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>{unit}</span>}
        </div>
        <button type="button"
          className="w-10 h-10 flex items-center justify-center text-lg font-bold transition-colors hover:bg-white/5 flex-shrink-0"
          style={{ color: "var(--accent)" }}
          onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}>
          +
        </button>
      </div>
    </div>
  );
}

// Option button group (replaces <select> for discrete choices)
function OptionGroup<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; sub?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>{label}</label>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="rounded-xl py-2 px-2 text-xs font-medium transition-all text-center"
            style={value === opt.value
              ? { background: "var(--accent)", color: "#000" }
              : { background: "var(--bg-card2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            <div>{opt.label}</div>
            {opt.sub && (
              <div className="text-xs mt-0.5 opacity-70 leading-tight">{opt.sub}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(defaultProfile);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [ftIn, setFtIn] = useState({ ft: 5, inches: 7 });

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(data => {
      if (data?.profile) {
        setProfile(data.profile);
        setMetrics(data.metrics);
        setHasProfile(true);
        const { ft, inches } = cmToFtIn(data.profile.height);
        setFtIn({ ft, inches });
      } else {
        setIsEditing(true); // No profile yet — go straight to edit mode
      }
    });
    fetch("/api/profile/weight").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setWeightLogs(data);
    });
  }, []);

  const handleHeightUnitToggle = (unit: HeightUnit) => {
    if (unit === "ftin" && heightUnit === "cm") {
      const converted = cmToFtIn(profile.height);
      setFtIn(converted);
    }
    if (unit === "cm" && heightUnit === "ftin") {
      setProfile(p => ({ ...p, height: ftInToCm(ftIn.ft, ftIn.inches) }));
    }
    setHeightUnit(unit);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const finalHeight = heightUnit === "ftin" ? ftInToCm(ftIn.ft, ftIn.inches) : profile.height;
    const profileToSave = { ...profile, height: finalHeight };
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileToSave),
    });
    const data = await res.json();
    if (data.metrics) {
      setMetrics(data.metrics);
      setProfile(data.profile);
      const { ft, inches } = cmToFtIn(data.profile.height);
      setFtIn({ ft, inches });
    }
    setSaving(false);
    setHasProfile(true);
    setIsEditing(false);
    fetch("/api/profile/weight").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setWeightLogs(d);
    });
  };

  const MetricCard = ({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) => (
    <div className="card text-center py-4">
      <div className="text-2xl font-bold" style={{ color, fontFamily: "Syne, sans-serif" }}>{value}</div>
      <div className="text-xs mt-1 font-medium" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>{sub}</div>
    </div>
  );

  const heightDisplay = heightUnit === "cm"
    ? `${profile.height} cm`
    : `${ftIn.ft}'${ftIn.inches}"`;

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-glow)", border: "1px solid var(--accent-dim)" }}>
            <User size={20} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Health Profile</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Your personal biometric data</p>
          </div>
        </div>
        {hasProfile && !isEditing && (
          <button onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
            style={{ color: "var(--accent)", border: "1px solid var(--accent-dim)" }}>
            <Edit2 size={14} /> Edit
          </button>
        )}
      </div>

      {/* Metric cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="BMI" value={String(metrics.bmi)} sub={metrics.bmiCategory} color="var(--accent)" />
          <MetricCard label="BMR" value={`${metrics.bmr}`} sub="kcal/day at rest" color="#a855f7" />
          <MetricCard label="TDEE" value={`${metrics.tdee}`} sub="maintenance" color="#3b82f6" />
          <MetricCard label="Target" value={`${metrics.targetCalories}`} sub="daily goal" color="#f59e0b" />
        </div>
      )}

      {/* View mode — collapsed display */}
      {hasProfile && !isEditing && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Scale size={16} style={{ color: "var(--accent)" }} /> Body Measurements
          </h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              { label: "Age", value: `${profile.age} yrs` },
              { label: "Sex", value: profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1) },
              { label: "Height", value: heightDisplay },
              { label: "Weight", value: `${profile.weight} kg` },
              { label: "Activity", value: profile.activityLevel.charAt(0).toUpperCase() + profile.activityLevel.slice(1) },
              { label: "Goal", value: profile.goal === "maintain" ? "Maintain" : profile.goal === "deficit" ? "Lose weight" : "Gain muscle" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3"
                style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
                <div className="font-semibold text-sm">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit form */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="card space-y-5">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Scale size={16} style={{ color: "var(--accent)" }} /> Body Measurements
          </h2>

          {/* Age + Weight */}
          <div className="grid grid-cols-2 gap-4">
            <StepInput label="Age" value={profile.age} min={10} max={100}
              unit="yrs" onChange={v => setProfile(p => ({ ...p, age: v }))} />
            <StepInput label="Weight (kg)" value={profile.weight} min={30} max={300} step={0.5}
              unit="kg" onChange={v => setProfile(p => ({ ...p, weight: v }))} />
          </div>

          {/* Height with unit toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Height</label>
              <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {(["cm", "ftin"] as const).map(u => (
                  <button key={u} type="button" onClick={() => handleHeightUnitToggle(u)}
                    className="px-3 py-1 text-xs font-medium transition-colors"
                    style={heightUnit === u
                      ? { background: "var(--accent)", color: "#000" }
                      : { background: "var(--bg-card2)", color: "var(--text-muted)" }}>
                    {u === "cm" ? "cm" : "ft/in"}
                  </button>
                ))}
              </div>
            </div>
            {heightUnit === "cm" ? (
              <StepInput label="" value={profile.height} min={100} max={250} unit="cm"
                onChange={v => setProfile(p => ({ ...p, height: v }))} />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StepInput label="" value={ftIn.ft} min={3} max={8} unit="ft"
                  onChange={v => setFtIn(f => ({ ...f, ft: v }))} />
                <StepInput label="" value={ftIn.inches} min={0} max={11} unit="in"
                  onChange={v => setFtIn(f => ({ ...f, inches: v }))} />
              </div>
            )}
          </div>

          {/* Sex */}
          <OptionGroup
            label="Sex"
            value={profile.sex as "male" | "female"}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
            onChange={v => setProfile(p => ({ ...p, sex: v }))}
          />

          {/* Activity Level */}
          <OptionGroup
            label="Activity Level"
            value={profile.activityLevel}
            options={[
              { value: "sedentary", label: "Sedentary", sub: "Desk job" },
              { value: "moderate", label: "Moderate", sub: "3–5×/week" },
              { value: "active", label: "Active", sub: "6–7×/week" },
            ]}
            onChange={v => setProfile(p => ({ ...p, activityLevel: v as UserProfile["activityLevel"] }))}
          />

          {/* Goal */}
          <OptionGroup
            label="Goal"
            value={profile.goal}
            options={[
              { value: "deficit", label: "Lose weight", sub: "−500 kcal" },
              { value: "maintain", label: "Maintain", sub: "TDEE" },
              { value: "bulk", label: "Gain muscle", sub: "+300 kcal" },
            ]}
            onChange={v => setProfile(p => ({ ...p, goal: v as UserProfile["goal"] }))}
          />

          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex items-center gap-2 flex-1" disabled={saving}>
              <Check size={15} />
              {saving ? "Saving..." : "Save Profile"}
            </button>
            {hasProfile && (
              <button type="button" className="btn-ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* Calculations transparency */}
      {metrics && (
        <div className="card">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp size={16} style={{ color: "var(--accent)" }} /> How We Calculate
          </h2>
          <div className="space-y-0 text-xs" style={{ color: "var(--text-muted)" }}>
            {[
              ["BMR (Mifflin-St Jeor)", `${metrics.bmr} kcal`],
              [`× Activity multiplier (${profile.activityLevel})`, `${metrics.tdee} kcal`],
              [`Goal adjustment (${profile.goal})`, `= ${metrics.targetCalories} kcal/day`],
            ].map(([label, val], i) => (
              <div key={i} className="flex justify-between py-2 border-b last:border-0"
                style={{ borderColor: "var(--border)" }}>
                <span>{label}</span>
                <span style={{ color: i === 2 ? "var(--accent)" : "var(--text)" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weight history */}
      {weightLogs.length > 1 && (
        <div className="card">
          <h2 className="font-semibold text-sm mb-3">Weight Progress</h2>
          <WeightChart data={weightLogs} />
        </div>
      )}
    </div>
  );
}