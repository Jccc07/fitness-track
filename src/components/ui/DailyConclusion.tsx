// src/components/ui/DailyConclusion.tsx
import { CheckCircle2, AlertCircle, TrendingDown, Zap } from "lucide-react";
import type { DailyConclusion as DC } from "@/types";

interface Props {
  data: DC;
}

const STATUS_CONFIG = {
  great: {
    icon: CheckCircle2,
    color: "var(--accent)",
    bg: "var(--accent-glow)",
    border: "var(--accent-dim)",
    label: "Great day!",
  },
  "on-track": {
    icon: Zap,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.3)",
    label: "On track",
  },
  over: {
    icon: AlertCircle,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.3)",
    label: "Over target",
  },
  under: {
    icon: TrendingDown,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.3)",
    label: "Under target",
  },
};

export default function DailyConclusion({ data }: Props) {
  const config = STATUS_CONFIG[data.status];
  const Icon = config.icon;

  return (
    <div className="rounded-2xl p-4 space-y-3"
      style={{ background: config.bg, border: `1px solid ${config.border}` }}>
      <div className="flex items-center gap-2">
        <Icon size={18} style={{ color: config.color }} />
        <h3 className="font-semibold text-sm" style={{ color: config.color }}>
          Daily Conclusion · {config.label}
        </h3>
      </div>

      <div className="space-y-2 text-sm" style={{ color: "var(--text)" }}>
        <p>{data.feedbackSummary}</p>
      </div>

      <div className="border-t pt-2 space-y-2" style={{ borderColor: config.border }}>
        <div>
          <span className="text-xs font-medium" style={{ color: config.color }}>Health Insight</span>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{data.healthInsight}</p>
        </div>
        <div>
          <span className="text-xs font-medium" style={{ color: config.color }}>Tomorrow's Focus</span>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{data.tomorrowAdvice}</p>
        </div>
      </div>
    </div>
  );
}