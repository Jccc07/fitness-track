"use client";
// src/components/charts/MacroChart.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  protein: number;
  carbs: number;
  fat: number;
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b"];

export default function MacroChart({ protein, carbs, fat }: Props) {
  const total = protein + carbs + fat;
  if (total === 0) return null;

  const data = [
    { name: "Protein", value: Math.round(protein), pct: Math.round((protein / total) * 100) },
    { name: "Carbs", value: Math.round(carbs), pct: Math.round((carbs / total) * 100) },
    { name: "Fat", value: Math.round(fat), pct: Math.round((fat / total) * 100) },
  ];

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <ResponsiveContainer width={180} height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
            dataKey="value" paddingAngle={3}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val: number, name: string) => [`${val}g`, name]}
            contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-3 flex-1">
        {data.map((d, i) => (
          <div key={d.name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                {d.name}
              </span>
              <span style={{ color: "var(--text-muted)" }}>{d.value}g · {d.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: COLORS[i] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}