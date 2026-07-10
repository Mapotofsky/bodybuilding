import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculateRmFormulaResults, calculateRpeAdjustedRm } from "@/core/rm";
import { convertWeight } from "@/core/workoutMetrics";

const FORMULA_ROWS = [
  {
    key: "epley",
    label: "Epley",
    formula: "重量 × (1 + 修正次数 / 30)",
    stroke: "var(--color-chart-1)",
  },
  {
    key: "brzycki",
    label: "Brzycki",
    formula: "重量 × 36 / (37 - 修正次数)",
    stroke: "var(--color-chart-5)",
  },
  {
    key: "lombardi",
    label: "Lombardi",
    formula: "重量 × 修正次数 ^ 0.10",
    stroke: "var(--color-chart-3)",
  },
  {
    key: "wathen",
    label: "Wathen",
    formula: "100 × 重量 / (48.8 + 53.8 × exp(-0.075 × 修正次数))",
    stroke: "var(--color-chart-4)",
  },
] as const;

const FORMULA_NOTES = [
  {
    label: "Epley",
    description: "最常用的线性模型，读起来最直观：每增加 1 次，估算 1RM 按固定比例上调。低次数时通常比 Brzycki 略高，适合快速估算主项训练重量。",
  },
  {
    label: "Brzycki",
    description: "同样是常见线性模型，但低次数结果更保守；到 10 次附近会和 Epley 非常接近。适合不想高估 1RM 时参考。",
  },
  {
    label: "Lombardi",
    description: "幂函数模型，曲线变化更平滑，每增加一次重复，对预测 1RM 的边际贡献递减。在较高次数时通常不会像部分线性公式那样上扬得太快，适合作为对照。",
  },
  {
    label: "Wathen",
    description: "指数模型，低到中次数估算中常作为非线性对照；在部分卧推研究中表现较好，但不同动作和人群仍会影响误差。",
  },
] as const;

export default function RmCalculatorPage() {
  const navigate = useNavigate();
  const [weight, setWeight] = useState("100");
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [reps, setReps] = useState("5");
  const [rpe, setRpe] = useState("8");

  const result = useMemo(() => {
    const weightValue = Number(weight);
    const repsValue = Number(reps);
    const rpeValue = Number(rpe);
    if (!Number.isFinite(weightValue) || !Number.isFinite(repsValue) || !Number.isFinite(rpeValue)) return null;
    return calculateRpeAdjustedRm({
      weightKg: unit === "kg" ? weightValue : convertWeight(weightValue, "lb", "kg"),
      reps: repsValue,
      rpe: rpeValue,
    });
  }, [weight, unit, reps, rpe]);

  const display = result ? {
    epley: displayWeight(result.formulas.epleyKg, unit),
    brzycki: displayWeight(result.formulas.brzyckiKg, unit),
    lombardi: displayWeight(result.formulas.lombardiKg, unit),
    wathen: displayWeight(result.formulas.wathenKg, unit),
    mean: displayWeight(result.formulas.meanKg, unit),
  } : null;
  const curveData = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const effectiveReps = index + 1;
      const formulas = calculateRmFormulaResults(1, effectiveReps);
      return {
        effectiveReps,
        epley: roundRatio(formulas.epleyKg),
        brzycki: roundRatio(formulas.brzyckiKg),
        lombardi: roundRatio(formulas.lombardiKg),
        wathen: roundRatio(formulas.wathenKg),
      };
    });
  }, []);

  return (
    <div className="app-screen min-h-screen pb-24">
      <div className="sticky top-0 z-10 app-surface border-b app-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate("/tools")} className="w-9 h-9 flex items-center justify-center rounded-full app-surface-muted" aria-label="返回">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold app-text">RM 计算器</h1>
      </div>

      <div className="px-5 pt-5 space-y-4">
        <section className="app-surface rounded-2xl border shadow-sm p-4 space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2">
            <Field label="重量" value={weight} onChange={setWeight} />
            <label className="block">
              <span className="block text-xs font-semibold app-text-muted mb-1.5">单位</span>
              <select value={unit} onChange={(event) => setUnit(event.target.value as "kg" | "lb")} className="app-input w-full px-3 py-2.5 border rounded-xl text-sm">
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="次数" value={reps} onChange={setReps} />
            <Field label="RPE" value={rpe} onChange={setRpe} />
          </div>
        </section>

        <section className="app-surface rounded-2xl border shadow-sm p-4">
          <h2 className="text-sm font-bold app-text mb-3">估算结果</h2>
          {!result || !display ? (
            <p className="text-sm app-text-muted">请输入有效重量、1-12 次次数，以及 1-10 RPE。 修正次数超出 1-12 时不估算。</p>
          ) : (
            <div className="space-y-3">
              <div className="app-surface-muted rounded-xl border app-border p-3 grid grid-cols-3 gap-2 text-center">
                <Metric label="RIR" value={result.rir.toFixed(1)} />
                <Metric label="修正次数" value={result.effectiveReps.toFixed(1)} />
                <Metric label="均值" value={`${display.mean} ${unit}`} />
              </div>
              <div>
                {[
                  ["Epley", display.epley],
                  ["Brzycki", display.brzycki],
                  ["Lombardi", display.lombardi],
                  ["Wathen", display.wathen],
                ].map(([label, value], index) => (
                  <div key={label} className={`flex justify-between py-2 text-sm ${index > 0 ? "border-t app-border" : ""}`}>
                    <span className="app-text-muted">{label}</span>
                    <span className="font-semibold app-text">{value} {unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="app-surface rounded-2xl border shadow-sm p-4">
          <h2 className="text-sm font-bold app-text mb-3">公式说明</h2>
          <div className="space-y-2 text-sm app-text-muted leading-relaxed">
            <p>RM（Repetition Maximum）是力量训练中衡量训练强度的关键指标，表示在保持标准动作姿势下，个体能完成的最大重复次数所对应的重量。</p>
            <p>这里使用自觉用力程度（Rating of Perceived Exertion，RPE）和剩余次数（Reps in Reserve，RIR，即“还能做几次”）来修正最大重复次数。<br />RIR = 10 - RPE，修正次数 = 次数 + RIR。</p>
            <p>四个公式都用同一个修正次数估算 1RM。低到中次数、动作标准稳定、接近力竭但没有明显变形时，估算通常更有参考价值。</p>
            <p>次数越高、动作越不熟、RPE 判断越不准，误差越容易放大。结果适合做训练重量参考，不适合替代正式 1RM 测试。</p>
          </div>
        </section>

        <section className="app-surface rounded-2xl border shadow-sm p-4">
          <h2 className="text-sm font-bold app-text mb-3">公式特点</h2>
          <div className="space-y-3">
            {FORMULA_NOTES.map((item) => (
              <div key={item.label} className="app-surface-muted rounded-xl border app-border px-3 py-2.5">
                <p className="text-sm font-semibold app-text">{item.label}</p>
                <p className="text-sm app-text-muted leading-relaxed mt-1">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="app-surface rounded-2xl border shadow-sm p-4">
          <h2 className="text-sm font-bold app-text mb-3">公式与倍率曲线</h2>
          <div className="app-surface-muted rounded-xl border app-border p-3">
            <div className="space-y-2">
              {FORMULA_ROWS.map((row) => (
                <div key={row.key} className="text-xs leading-relaxed">
                  <p>
                    <span className="font-semibold app-text">{row.label}</span>
                    <span className="app-text-muted"> = {row.formula}</span>
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] app-text-muted">1RM/重量</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curveData} margin={{ top: 10, right: 8, bottom: 2, left: 0 }}>
                  <XAxis
                    dataKey="effectiveReps"
                    interval={0}
                    tickMargin={5}
                    tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                  />
                  <YAxis
                    width={34}
                    domain={[0.98, 1.46]}
                    ticks={[1, 1.15, 1.3, 1.45]}
                    tickFormatter={formatRatioTick}
                    tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => typeof value === "number" ? value.toFixed(3) : value}
                    labelFormatter={(label) => `修正次数 : ${label}`}
                  />
                  {FORMULA_ROWS.map((row) => (
                    <Line
                      key={row.key}
                      type="monotone"
                      dataKey={row.key}
                      name={row.label}
                      stroke={row.stroke}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="-mt-2 text-center text-[11px] app-text-muted">修正次数</p>
            <div className="mt-4 flex items-center justify-between gap-1 text-[10px]">
              {FORMULA_ROWS.map((row) => (
                <div key={row.key} className="flex items-center gap-1 min-w-0" style={{ color: row.stroke }}>
                  <span className="w-3 h-0 border-t-2 shrink-0" style={{ borderColor: row.stroke }} />
                  <span className="truncate">{row.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs font-semibold app-text-muted mb-1.5">{label}</span>
      <input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className="app-input w-full px-3 py-2.5 border rounded-xl text-sm" />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-lg font-bold app-text truncate">{value}</p>
      <p className="text-xs app-text-muted mt-0.5">{label}</p>
    </div>
  );
}

function displayWeight(weightKg: number, unit: "kg" | "lb"): string {
  const value = unit === "kg" ? weightKg : convertWeight(weightKg, "kg", "lb");
  return (Math.round(value * 10) / 10).toFixed(1);
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function formatRatioTick(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
