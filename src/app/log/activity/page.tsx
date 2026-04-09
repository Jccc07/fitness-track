"use client";
// src/app/log/activity/page.tsx
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Activity, Upload, Trash2 } from "lucide-react";
import { MET_VALUES, estimateCaloriesBurned } from "@/lib/calculations";
import type { ActivityLog } from "@/types";
import clsx from "clsx";

type EntryMode = "manual" | "screenshot";

export default function LogActivityPage() {
  const [mode, setMode] = useState<EntryMode>("manual");
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [userWeight, setUserWeight] = useState(70);
  const [date] = useState(format(new Date(), "yyyy-MM-dd"));

  // Manual form
  const [form, setForm] = useState({
    activityType: "walk",
    duration: "",
    distance: "",
    reps: "",
  });
  const [estimatedBurn, setEstimatedBurn] = useState(0);

  // Screenshot
  const fileRef = useRef<HTMLInputElement>(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrParsed, setOcrParsed] = useState<{
    activityType: string;
    duration: number;
    distance: number;
    caloriesBurned: number;
  } | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(data => {
      if (data?.profile?.weight) setUserWeight(data.profile.weight);
    });
    fetch(`/api/activities?date=${date}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setActivities(data);
    });
  }, [date]);

  useEffect(() => {
    if (form.duration) {
      const burn = estimateCaloriesBurned(form.activityType, +form.duration, userWeight);
      setEstimatedBurn(burn);
    } else {
      setEstimatedBurn(0);
    }
  }, [form.activityType, form.duration, userWeight]);

  const handleManualSave = async () => {
    if (!form.duration && !form.reps) return;
    setSaving(true);
    const burn = form.duration ? estimateCaloriesBurned(form.activityType, +form.duration, userWeight) : 100;
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryType: "manual",
        activityType: form.activityType,
        duration: form.duration ? +form.duration : null,
        distance: form.distance ? +form.distance : null,
        reps: form.reps ? +form.reps : null,
        caloriesBurned: burn,
        date,
      }),
    });
    const activity = await res.json();
    setActivities(a => [...a, activity]);
    setForm({ activityType: "walk", duration: "", distance: "", reps: "" });
    setSaving(false);
  };

  const parseOCRText = (text: string) => {
    // Simple regex parsing for common fitness app formats
    const distMatch = text.match(/(\d+\.?\d*)\s*(km|mi|miles|kilometers)/i);
    const durMatch = text.match(/(\d+):(\d+)|(\d+)\s*(min|minutes|hours)/i);
    const actMatch = text.match(/\b(run|walk|cycle|swim|ride|hike)\b/i);

    let distKm = 0;
    if (distMatch) {
      distKm = parseFloat(distMatch[1]);
      if (distMatch[2].toLowerCase().includes("mi")) distKm *= 1.609;
    }

    let durationMin = 0;
    if (durMatch) {
      if (durMatch[1] && durMatch[2]) {
        durationMin = parseInt(durMatch[1]) * 60 + parseInt(durMatch[2]);
      } else if (durMatch[3]) {
        durationMin = parseInt(durMatch[3]);
        if (durMatch[4]?.toLowerCase().includes("hour")) durationMin *= 60;
      }
    }

    const activityMap: Record<string, string> = {
      run: "run", walk: "walk", cycle: "cycle", ride: "cycle", swim: "swim", hike: "walk"
    };
    const activityType = actMatch ? (activityMap[actMatch[1].toLowerCase()] || "other") : "other";
    const burn = durationMin ? estimateCaloriesBurned(activityType, durationMin, userWeight) : 200;

    return { activityType, duration: durationMin, distance: distKm, caloriesBurned: burn };
  };

  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);

    // Dynamic import to avoid SSR issues
    const Tesseract = (await import("tesseract.js")).default;
    const { data: { text } } = await Tesseract.recognize(file, "eng");
    setOcrText(text);
    const parsed = parseOCRText(text);
    setOcrParsed(parsed);
    setOcrLoading(false);
  };

  const saveFromOCR = async () => {
    if (!ocrParsed) return;
    setSaving(true);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryType: "screenshot",
        ...ocrParsed,
        notes: `Parsed from screenshot`,
        date,
      }),
    });
    const activity = await res.json();
    setActivities(a => [...a, activity]);
    setOcrParsed(null);
    setOcrText("");
    setSaving(false);
  };

  const deleteActivity = async (id: string) => {
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    setActivities(a => a.filter(x => x.id !== id));
  };

  const totalBurned = activities.reduce((s, a) => s + a.caloriesBurned, 0);

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-xl font-bold">Log Activity</h1>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{format(new Date(), "EEEE, MMMM d")}</p>
      </div>

      <div className="card">
        {/* Mode toggle */}
        <div className="flex border-b mb-4" style={{ borderColor: "var(--border)" }}>
          {([["manual", "Manual Entry", Activity], ["screenshot", "Upload Screenshot", Upload]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setMode(id as EntryMode)}
              className="flex-1 flex items-center justify-center gap-2 pb-3 text-sm font-medium"
              style={{
                color: mode === id ? "var(--accent)" : "var(--text-muted)",
                borderBottom: mode === id ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
              }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Manual Entry */}
        {mode === "manual" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Activity Type</label>
              <select value={form.activityType} onChange={e => setForm(f => ({ ...f, activityType: e.target.value }))}>
                {MET_VALUES.map(m => (
                  <option key={m.type} value={m.type}>{m.label} (MET {m.met})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Duration (min)</label>
                <input type="number" placeholder="30" value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Distance (km)</label>
                <input type="number" placeholder="5" step={0.1} value={form.distance}
                  onChange={e => setForm(f => ({ ...f, distance: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Reps</label>
                <input type="number" placeholder="100" value={form.reps}
                  onChange={e => setForm(f => ({ ...f, reps: e.target.value }))} />
              </div>
            </div>
            {estimatedBurn > 0 && (
              <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: "var(--accent-glow)", border: "1px solid var(--accent-dim)" }}>
                <span className="text-2xl font-bold" style={{ color: "var(--accent)", fontFamily: "Syne" }}>
                  ~{estimatedBurn}
                </span>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <div>estimated kcal burned</div>
                  <div>using MET formula · {userWeight}kg bodyweight</div>
                </div>
              </div>
            )}
            <button className="btn-primary w-full" onClick={handleManualSave}
              disabled={saving || (!form.duration && !form.reps)}>
              {saving ? "Saving..." : "Log Activity"}
            </button>
          </div>
        )}

        {/* Screenshot OCR */}
        {mode === "screenshot" && (
          <div className="space-y-3">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-8 cursor-pointer transition-colors hover:border-green-500"
              style={{ borderColor: "var(--border)" }}>
              {ocrLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 rounded-full animate-spin"
                    style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Reading screenshot...</p>
                </div>
              ) : (
                <>
                  <Upload size={28} style={{ color: "var(--text-dim)" }} />
                  <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>Upload Strava / Garmin screenshot</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>We'll extract distance, duration & activity</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />

            {ocrParsed && (
              <div className="rounded-xl p-3 space-y-3" style={{ background: "var(--bg-card2)", border: "1px solid var(--accent-dim)" }}>
                <div className="text-sm font-medium" style={{ color: "var(--accent)" }}>Parsed from screenshot:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <label className="text-xs block" style={{ color: "var(--text-muted)" }}>Activity</label>
                    <select value={ocrParsed.activityType}
                      onChange={e => setOcrParsed(p => p ? { ...p, activityType: e.target.value } : p)}>
                      {MET_VALUES.map(m => <option key={m.type} value={m.type}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs block" style={{ color: "var(--text-muted)" }}>Duration (min)</label>
                    <input type="number" value={ocrParsed.duration}
                      onChange={e => setOcrParsed(p => p ? { ...p, duration: +e.target.value } : p)} />
                  </div>
                  <div>
                    <label className="text-xs block" style={{ color: "var(--text-muted)" }}>Distance (km)</label>
                    <input type="number" step={0.1} value={ocrParsed.distance}
                      onChange={e => setOcrParsed(p => p ? { ...p, distance: +e.target.value } : p)} />
                  </div>
                  <div>
                    <label className="text-xs block" style={{ color: "var(--text-muted)" }}>Calories burned</label>
                    <input type="number" value={ocrParsed.caloriesBurned}
                      onChange={e => setOcrParsed(p => p ? { ...p, caloriesBurned: +e.target.value } : p)} />
                  </div>
                </div>
                <button className="btn-primary w-full" onClick={saveFromOCR} disabled={saving}>
                  {saving ? "Saving..." : "Save Activity"}
                </button>
              </div>
            )}

            {ocrText && !ocrParsed && (
              <div className="text-xs p-2 rounded" style={{ background: "var(--bg-card2)", color: "var(--text-muted)" }}>
                <div className="mb-1 font-medium">OCR extracted text:</div>
                <pre className="whitespace-pre-wrap font-mono text-xs">{ocrText.slice(0, 300)}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activities log */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Today's Activities</h3>
          <span className="text-sm font-medium" style={{ color: "#f59e0b" }}>
            -{totalBurned} kcal burned
          </span>
        </div>
        {activities.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "var(--text-dim)" }}>No activities logged today</p>
        ) : (
          <div className="space-y-2">
            {activities.map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b group"
                style={{ borderColor: "var(--border)" }}>
                <div>
                  <div className="font-medium capitalize">{a.activityType}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {a.duration ? `${a.duration} min` : ""}
                    {a.distance ? ` · ${a.distance} km` : ""}
                    {a.reps ? ` · ${a.reps} reps` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ color: "#f59e0b" }}>-{a.caloriesBurned} kcal</span>
                  <button onClick={() => deleteActivity(a.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--danger)" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}