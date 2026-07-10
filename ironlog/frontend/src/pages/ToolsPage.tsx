import { useNavigate } from "react-router-dom";
import { Calculator, ChevronLeft, ChevronRight, Dumbbell, HeartPulse } from "lucide-react";

const TOOLS = [
  {
    label: "RM 计算器",
    description: "输入重量、次数和 RPE，查看不同公式的 1RM 估算结果",
    path: "/tools/rm",
    icon: Calculator,
  },
  {
    label: "力量训练 RPE 说明",
    description: "力量训练 RPE、RIR 与有效次数说明",
    path: "/tools/rpe-strength",
    icon: Dumbbell,
  },
  {
    label: "有氧训练 RPE 说明",
    description: "有氧训练主观强度与心率分区说明",
    path: "/tools/rpe-cardio",
    icon: HeartPulse,
  },
] as const;

export default function ToolsPage() {
  const navigate = useNavigate();

  return (
    <div className="app-screen min-h-screen pb-24">
      <div className="sticky top-0 z-10 app-surface border-b app-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate("/profile")} className="w-9 h-9 flex items-center justify-center rounded-full app-surface-muted" aria-label="返回">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold app-text">小工具</h1>
      </div>

      <div className="px-5 pt-5 space-y-2">
        {TOOLS.map(({ label, description, path, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => navigate(path)}
            className="app-surface w-full rounded-2xl border shadow-sm p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
          >
            <span className="app-primary-soft w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <Icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold app-text truncate">{label}</span>
              <span className="block text-xs app-text-muted mt-0.5">{description}</span>
            </span>
            <ChevronRight size={18} className="app-text-muted shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
