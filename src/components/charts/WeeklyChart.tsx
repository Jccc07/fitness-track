"use client";
// src/components/charts/WeeklyChart.tsx
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format } from "date-fns";
import type { DailyStats } from "@/types";

interface Props {
  data: DailyStats[];
  target: number;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs space-y-1"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "var(--text-muted)" }}>{p.name}:</span>
          <span>{p.value} kcal</span>
        </div>
      ))}
    </div>
  );
};

export default function WeeklyChart({ data, target }: Props) {
  const chartData = data.map(d => ({
    day: format(new Date(d.date + "T00:00:00"), "EEE"),
    Consumed: d.caloriesConsumed,
    Burned: d.caloriesBurned,
    Target: target,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Consumed" fill="var(--accent)" radius={[4, 4, 0, 0]} opacity={0.85} />
        <Bar dataKey="Burned" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.7} />
        <Line
          type="monotone"
          dataKey="Target"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}