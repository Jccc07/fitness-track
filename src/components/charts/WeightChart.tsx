"use client";
// src/components/charts/WeightChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import type { WeightLog } from "@/types";

export default function WeightChart({ data }: { data: WeightLog[] }) {
  const chartData = data.map(d => ({
    date: format(new Date(d.date), "MMM d"),
    Weight: d.weight,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
          formatter={(v: number) => [`${v} kg`, "Weight"]}
        />
        <Line type="monotone" dataKey="Weight" stroke="var(--accent)"
          strokeWidth={2} dot={{ fill: "var(--accent)", r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}