// src/components/charts/CalorieRing.tsx
"use client";

interface Props {
  consumed: number;
  target: number;
  burned: number;
}

export default function CalorieRing({ consumed, target, burned }: Props) {
  const radius = 70;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(consumed / Math.max(target, 1), 1.1);
  const burnPct = Math.min(burned / Math.max(target, 1), 1);
  const dashOffset = circumference * (1 - pct);
  const burnDash = circumference * (1 - burnPct);
  const isOver = consumed > target;
  const size = (radius + stroke) * 2 + 8;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
          {/* Track */}
          <circle
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
          />
          {/* Burn ring (outer offset) */}
          <circle
            r={radius - stroke - 3}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={stroke * 0.6}
            strokeDasharray={circumference}
            strokeDashoffset={burnDash}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
          {/* Consumed ring */}
          <circle
            r={radius}
            fill="none"
            stroke={isOver ? "var(--danger)" : "var(--accent)"}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </g>
        {/* Center text */}
        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle"
          fontSize="22" fontWeight="700" fill="var(--text)" fontFamily="Syne, sans-serif">
          {consumed}
        </text>
        <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle"
          fontSize="10" fill="var(--text-muted)" fontFamily="DM Sans, sans-serif">
          of {target} kcal
        </text>
      </svg>
      <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
          Consumed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: "#f59e0b" }} />
          Burned
        </span>
      </div>
    </div>
  );
}