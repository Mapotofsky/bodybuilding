import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculateRmFormulaResults, calculateRpeAdjustedRm } from "@/core/rm";
import { convertWeight } from "@/core/workoutMetrics";

const FORMULA_ROWS = [
  { key: "epley", label: "Epley", formula: "重量 × (1 + 修正次数 / 30)", stroke: "var(--color-chart-1)" },
  { key: "brzycki", label: "Brzycki", formula: "重量 × 36 / (37 - 修正次数)", stroke: "var(--color-chart-5)" },
  { key: "lombardi", label: "Lombardi", formula: "重量 × 修正次数 ^ 0.10", stroke: "var(--color-chart-3)" },
  { key: "wathen", label: "Wathen", formula: "100 × 重量 / (48.8 + 53.8 × exp(-0.075 × 修正次数))", stroke: "var(--color-chart-4)" },
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
        <button onClick={() => navigate("/profile")} className="w-9 h-9 flex items-center justify-center rounded-full app-surface-muted" aria-label="返回">
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
              <div className="app-divide divide-y">
                {[
                  ["Epley", display.epley],
                  ["Brzycki", display.brzycki],
                  ["Lombardi", display.lombardi],
                  ["Wathen", display.wathen],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2 text-sm">
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
            <p>力量训练 RPE 在这里按“还能做几次”解释：<br />RIR = 10 - RPE，修正次数 = 次数 + RIR。</p>
            <p>四个公式都使用修正次数。没有 RPE、次数超过 12 或修正次数超过 12 时，不生成基于 RPE 修正 RM。</p>
            <p>有氧训练 RPE 含义不同，不参与本 RM 估算。</p>
          </div>
          <div className="mt-4 app-surface-muted rounded-xl border app-border p-3">
            <div className="space-y-2 mb-4">
              {FORMULA_ROWS.map((row) => (
                <div key={row.key} className="text-xs leading-relaxed">
                  <span className="font-semibold app-text">{row.label}</span>
                  <span className="app-text-muted"> = {row.formula}</span>
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
            <p className="-mt-2 text-center text-[11px] app-text-muted">effectiveReps</p>
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
