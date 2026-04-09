"use client";
// src/app/log/activity/page.tsx
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Activity, Upload, Trash2, Loader2 } from "lucide-react";
import { MET_VALUES, estimateCaloriesBurned } from "@/lib/calculations";
import type { ActivityLog } from "@/types";

type EntryMode = "manual" | "screenshot";

export default function LogActivityPage() {
  const [mode, setMode] = useState<EntryMode>("manual");
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [userWeight, setUserWeight] = useState(70);
  const [date] = useState(format(new Date(), "yyyy-MM-dd"));

  const [form, setForm] = useState({
    activityType: "walk",
    duration: "",
    distance: "",
    reps: "",
  });
  const [estimatedBurn, setEstimatedBurn] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const [ocrParsed, setOcrParsed] = useState<{
    activityType: string;
    duration: number;
    distance: number;
    caloriesBurned: number;
  } | null>(null);
  const [ocrRaw, setOcrRaw] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(data => {
      if (data?.profile?.weight) setUserWeight(data.profile.weight);
    });
    fetch(`/api/activities?date=${date}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setActivities(data);
    });
  }, [date]);

  // Recalculate burn whenever form changes — including reps
  useEffect(() => {
    const dur = form.duration ? +form.duration : 0;
    const rps = form.reps ? +form.reps : undefined;
    if (dur > 0 || (rps && rps > 0)) {
      const burn = estimateCaloriesBurned(form.activityType, dur, userWeight, rps);
      setEstimatedBurn(burn);
    } else {
      setEstimatedBurn(0);
    }
  }, [form.activityType, form.duration, form.reps, userWeight]);

  const handleManualSave = async () => {
    if (!form.duration && !form.reps) return;
    setSaving(true);
    const dur = form.duration ? +form.duration : 0;
    const rps = form.reps ? +form.reps : undefined;
    const burn = estimateCaloriesBurned(form.activityType, dur, userWeight, rps);
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
    if (!activity.error) setActivities(a => [...a, activity]);
    setForm({ activityType: "walk", duration: "", distance: "", reps: "" });
    setSaving(false);
  };

  // ─── Strava / fitness app OCR parser ─────────────────────────────────────
  // Handles formats like: "3.97 km", "57m 20s", "57:20", "Distance 3.97 km"
  const parseOCRText = (text: string) => {
    // Distance: "3.97 km", "3.97km", "2.46 mi"
    const distMatch = text.match(/(\d+\.?\d*)\s*(km|mi)\b/i);
    let distKm = 0;
    if (distMatch) {
      distKm = parseFloat(distMatch[1]);
      if (distMatch[2].toLowerCase() === "mi") distKm *= 1.60934;
    }

    // Duration: "57m 20s", "57m", "1h 2m", "57:20", "1:02:30"
    let durationMin = 0;
    const hmsMatch = text.match(/(\d+)h\s*(\d+)m/i);       // "1h 2m"
    const msMatch  = text.match(/(\d+)m\s*(\d+)s/i);        // "57m 20s"
    const colonHMS = text.match(/(\d+):(\d+):(\d+)/);        // "1:02:30"
    const colonMS  = text.match(/(\d+):(\d+)/);              // "57:20"
    const mOnly    = text.match(/(\d+)\s*min(?:utes?)?\b/i); // "57 minutes"

    if (hmsMatch) {
      durationMin = parseInt(hmsMatch[1]) * 60 + parseInt(hmsMatch[2]);
    } else if (msMatch) {
      durationMin = parseInt(msMatch[1]) + parseInt(msMatch[2]) / 60;
    } else if (colonHMS) {
      durationMin = parseInt(colonHMS[1]) * 60 + parseInt(colonHMS[2]) + parseInt(colonHMS[3]) / 60;
    } else if (colonMS) {
      durationMin = parseInt(colonMS[1]) * 60 + parseInt(colonMS[2]);
    } else if (mOnly) {
      durationMin = parseInt(mOnly[1]);
    }
    durationMin = Math.round(durationMin);

    // Activity type detection
    const activityMap: Record<string, string> = {
      run: "run", running: "run",
      walk: "walk", walking: "walk", hike: "walk", hiking: "walk",
      ride: "cycle", cycling: "cycle", cycle: "cycle", bike: "cycle",
      swim: "swim", swimming: "swim",
      "weight": "gym", gym: "gym",
    };
    let activityType = "walk"; // default for Strava walking/running
    for (const [keyword, type] of Object.entries(activityMap)) {
      if (text.toLowerCase().includes(keyword)) { activityType = type; break; }
    }

    // Calories directly stated in image (e.g. "Calories: 312")
    const calMatch = text.match(/calori[eo]s?\s*[:\-]?\s*(\d+)/i);
    const statedCal = calMatch ? parseInt(calMatch[1]) : 0;

    const burn = statedCal > 0
      ? statedCal
      : durationMin > 0
        ? estimateCaloriesBurned(activityType, durationMin, userWeight)
        : 200;

    return { activityType, duration: durationMin, distance: parseFloat(distKm.toFixed(2)), caloriesBurned: burn };
  };

  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrParsed(null);
    setOcrRaw("");
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const { data: { text } } = await Tesseract.recognize(file, "eng", {
        logger: () => {},
      });
      setOcrRaw(text);
      const parsed = parseOCRText(text);
      setOcrParsed(parsed);
    } catch (err) {
      console.error("OCR error:", err);
    }
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
        notes: "Parsed from screenshot",
        date,
      }),
    });
    const activity = await res.json();
    if (!activity.error) setActivities(a => [...a, activity]);
    setOcrParsed(null);
    setOcrRaw("");
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

        {/* Manual */}
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
                <input type="number" placeholder="30" min="0" value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Distance (km)</label>
                <input type="number" placeholder="5" step={0.1} min="0" value={form.distance}
                  onChange={e => setForm(f => ({ ...f, distance: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                  Reps
                  <span className="ml-1" style={{ color: "var(--text-dim)" }}>(adds to burn)</span>
                </label>
                <input type="number" placeholder="0" min="0" value={form.reps}
                  onChange={e => setForm(f => ({ ...f, reps: e.target.value }))} />
              </div>
            </div>

            {estimatedBurn > 0 && (
              <div className="rounded-xl p-3 flex items-center justify-between"
                style={{ background: "var(--accent-glow)", border: "1px solid var(--accent-dim)" }}>
                <div>
                  <div className="text-2xl font-bold" style={{ color: "var(--accent)", fontFamily: "Syne" }}>
                    ~{estimatedBurn} kcal
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    MET formula · {userWeight}kg bodyweight
                    {form.reps ? ` · ${form.reps} reps` : ""}
                  </div>
                </div>
                <div className="text-xs text-right" style={{ color: "var(--text-dim)" }}>
                  <div>Duration: {form.duration || 0} min</div>
                  {form.distance && <div>Distance: {form.distance} km</div>}
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
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Upload a screenshot from Strava, Garmin, Nike Run, or any fitness app.
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-8 cursor-pointer transition-colors hover:border-green-500"
              style={{ borderColor: "var(--border)" }}>
              {ocrLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Reading screenshot...</p>
                </div>
              ) : (
                <>
                  <Upload size={28} style={{ color: "var(--text-dim)" }} />
                  <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
                    Upload Strava / Garmin / Nike Run screenshot
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
                    Reads distance, time, and activity type
                  </p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />

            {ocrParsed && (
              <div className="rounded-xl p-3 space-y-3"
                style={{ background: "var(--bg-card2)", border: "1px solid var(--accent-dim)" }}>
                <div className="text-sm font-medium" style={{ color: "var(--accent)" }}>
                  Parsed from screenshot — edit if needed:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Activity</label>
                    <select value={ocrParsed.activityType}
                      onChange={e => setOcrParsed(p => p ? { ...p, activityType: e.target.value } : p)}>
                      {MET_VALUES.map(m => <option key={m.type} value={m.type}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Duration (min)</label>
                    <input type="number" value={ocrParsed.duration}
                      onChange={e => setOcrParsed(p => p ? {
                        ...p,
                        duration: +e.target.value,
                        caloriesBurned: estimateCaloriesBurned(p.activityType, +e.target.value, userWeight),
                      } : p)} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Distance (km)</label>
                    <input type="number" step={0.01} value={ocrParsed.distance}
                      onChange={e => setOcrParsed(p => p ? { ...p, distance: +e.target.value } : p)} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Calories burned</label>
                    <input type="number" value={ocrParsed.caloriesBurned}
                      onChange={e => setOcrParsed(p => p ? { ...p, caloriesBurned: +e.target.value } : p)} />
                  </div>
                </div>
                <button className="btn-primary w-full" onClick={saveFromOCR} disabled={saving}>
                  {saving ? "Saving..." : "Save Activity"}
                </button>
              </div>
            )}

            {/* Show raw OCR text for debugging */}
            {ocrRaw && !ocrParsed && (
              <div className="text-xs p-3 rounded-xl" style={{ background: "var(--bg-card2)", color: "var(--text-muted)" }}>
                <div className="font-medium mb-1">Couldn't parse automatically — raw text:</div>
                <pre className="whitespace-pre-wrap font-mono text-xs">{ocrRaw.slice(0, 400)}</pre>
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
                  <div className="font-medium capitalize">
                    {MET_VALUES.find(m => m.type === a.activityType)?.label || a.activityType}
                  </div>
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