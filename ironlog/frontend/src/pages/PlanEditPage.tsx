import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { getPlan, updatePlan } from "@/services/plan";
import type { PlanMode } from "@/types";
import { PLAN_MODE_LABELS } from "@/types";

const PRESET_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
];

export default function PlanEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [mode, setMode] = useState<PlanMode>("weekly");
  const [cycleLength, setCycleLength] = useState(4);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getPlan(Number(id)).then((plan) => {
      setName(plan.name);
      setDescription(plan.description || "");
      setColor(plan.color);
      setMode(plan.mode);
      setCycleLength(plan.cycle_length || 4);
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("请输入计划名称");
      return;
    }
    setSaving(true);
    try {
      await updatePlan(Number(id), {
        name: name.trim(),
        description: description.trim() || null,
        color,
        mode,
        cycle_length: mode === "cyclic" ? cycleLength : null,
      });
      navigate(`/plans/${id}`);
    } catch {
      setError("保存失败，请重试");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-500">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">编辑计划</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-5 pb-24">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              计划名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              颜色
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c ? "scale-110 ring-2 ring-offset-2 ring-gray-400" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            编排模式
          </label>
          {(["weekly", "cyclic", "flexible"] as PlanMode[]).map((m) => (
            <label
              key={m}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                mode === m
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium text-sm">{PLAN_MODE_LABELS[m]}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {m === "weekly" && "固定每周某几天训练，如周一/三/五"}
                  {m === "cyclic" && "以 N 天为一个周期循环，不受星期约束"}
                  {m === "flexible" && "不固定日期，按顺序手动选取模版"}
                </p>
              </div>
            </label>
          ))}

          {mode === "cyclic" && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                周期天数
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCycleLength((v) => Math.max(2, v - 1))}
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 text-lg font-medium flex items-center justify-center"
                >
                  −
                </button>
                <span className="text-xl font-bold w-8 text-center">
                  {cycleLength}
                </span>
                <button
                  type="button"
                  onClick={() => setCycleLength((v) => Math.min(14, v + 1))}
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 text-lg font-medium flex items-center justify-center"
                >
                  +
                </button>
                <span className="text-sm text-gray-500">天</span>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-blue-500 text-white rounded-2xl font-medium text-base hover:bg-blue-600 transition disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存修改"}
        </button>
      </form>
    </div>
  );
}
