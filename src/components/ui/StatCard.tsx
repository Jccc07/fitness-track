// src/components/ui/StatCard.tsx
import { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  color: string;
}

export default function StatCard({ icon, label, value, unit, color }: Props) {
  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color, fontFamily: "Syne, sans-serif" }}>
          {value}
        </div>
        <div className="text-xs" style={{ color: "var(--text-dim)" }}>{unit}</div>
      </div>
    </div>
  );
}