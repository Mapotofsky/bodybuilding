import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Plus, X } from "lucide-react";
import { getPlan, updateTemplate, deleteTemplate } from "@/services/plan";
import { getExercises } from "@/services/exercise";
import type { Exercise, TrainingPlan, PlanTemplate } from "@/types";
import { CATEGORY_LABELS, DAY_OF_WEEK_LABELS } from "@/types";
import { useConfirmStore } from "@/components/ConfirmDialog";
import { useToastStore } from "@/components/Toast";
import StepInput from "@/components/ui/StepInput";
import ExercisePicker from "@/components/ExercisePicker";

interface LocalTemplateExercise {
  exercise_id: string;
  exercise_name: string;
  exercise_category: string;
  sort_order: number;
  note: string;
}

const PRESET_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
];

const DAYS_OF_WEEK = [1, 2, 3, 4, 5, 6, 7];

export default function TemplateEditPage() {
  const { id: planId, tid: templateId } = useParams<{ id: string; tid: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [template, setTemplate] = useState<PlanTemplate | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [scheduleRule, setScheduleRule] = useState<Record<string, unknown> | null>(null);
  const [cycleDay, setCycleDay] = useState("1");
  const [exercises, setExercises] = useState<LocalTemplateExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    if (!planId || !templateId) return;
    Promise.all([getPlan(planId), getExercises({})]).then(([p, exs]) => {
      setPlan(p);
      setAllExercises(exs);
      const tmpl = p.templates.find((t) => t.id === templateId);
      if (tmpl) {
        setTemplate(tmpl);
        setName(tmpl.name);
        setColor(tmpl.color);
        setScheduleRule(tmpl.schedule_rule);
        const storedCycleDay = tmpl.schedule_rule?.day_in_cycle;
        setCycleDay(typeof storedCycleDay === "number" ? String(storedCycleDay) : "1");
        setExercises(
          tmpl.exercises.map((te) => ({
            exercise_id: te.exercise_id,
            exercise_name: te.exercise_name || "",
            exercise_category: te.exercise_category || "",
            sort_order: te.sort_order,
            note: te.note || "",
          }))
        );
      }
    }).finally(() => setLoading(false));
  }, [planId, templateId]);

  async function handleSave() {
    if (!plan || !template) return;

    let nextScheduleRule = scheduleRule;
    if (plan.mode === "cyclic") {
      const maxCycleDay = plan.cycle_length ?? 14;
      const parsedCycleDay = Number(cycleDay);
      if (!Number.isInteger(parsedCycleDay) || parsedCycleDay < 1 || parsedCycleDay > maxCycleDay) {
        useToastStore.getState().add(`周期天数请输入 1 到 ${maxCycleDay} 的整数`, "error");
        return;
      }
      nextScheduleRule = { ...(scheduleRule || {}), day_in_cycle: parsedCycleDay };
    }

    setSaving(true);
    try {
      await updateTemplate(plan.id, template.id, {
        name,
        color,
        schedule_rule: nextScheduleRule,
        exercises: exercises.map((e, idx) => ({
          exercise_id: e.exercise_id,
          sort_order: idx,
          note: e.note || null,
        })),
      });
      navigate(`/plans/${plan.id}`);
    } catch {
      useToastStore.getState().add("保存失败，请重试", "error");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!plan || !template) return;
    const ok = await useConfirmStore.getState().show(
      "删除模板",
      `确认删除「${template.name}」？此操作不可撤销。`
    );
    if (!ok) return;
    try {
      await deleteTemplate(plan.id, template.id);
      navigate(`/plans/${plan.id}`);
    } catch {
      // ignore
    }
  }

  function addExercise(ex: Exercise) {
    setExercises((prev) => [
      ...prev,
      {
        exercise_id: ex.id,
        exercise_name: ex.name,
        exercise_category: ex.category,
        sort_order: prev.length,
        note: "",
      },
    ]);
    setShowExercisePicker(false);
  }

  function removeExercise(idx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleWeekDay(day: number) {
    const current: number[] = (scheduleRule?.day_of_week as number[]) || [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();
    setScheduleRule({ day_of_week: next });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        加载中...
      </div>
    );
  }

  if (!plan || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        模版不存在
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => navigate(`/plans/${plan.id}`)} className="text-slate-500">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold flex-1">编辑模版</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "保存..." : "保存"}
        </button>
      </div>

      <div className="px-5 pt-4 space-y-4 pb-24">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">模版名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">颜色（可选）</label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setColor(null)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs ${
                  !color ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-slate-50"
                }`}
              >
                无
              </button>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c ? "scale-110 ring-2 ring-offset-2 ring-slate-400" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Schedule Rule */}
        {plan.mode !== "flexible" && (
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700">排程规则</label>
            {plan.mode === "weekly" && (
              <div className="flex gap-2 flex-wrap">
                {DAYS_OF_WEEK.map((day) => {
                  const selected = ((scheduleRule?.day_of_week as number[]) || []).includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWeekDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        selected ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {DAY_OF_WEEK_LABELS[day]}
                    </button>
                  );
                })}
              </div>
            )}
            {plan.mode === "cyclic" && (
              <StepInput
                label="周期天数"
                value={cycleDay}
                onChange={setCycleDay}
                step={1}
                min={1}
                max={plan.cycle_length ?? 14}
                inputMode="numeric"
                placeholder="1"
              />
            )}
          </div>
        )}

        {/* Exercises */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-700 px-1">动作编排 ({exercises.length})</h2>
          {exercises.map((ex, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm text-slate-900">{ex.exercise_name}</p>
                  <span className="text-xs text-slate-400">
                    {CATEGORY_LABELS[ex.exercise_category] || ex.exercise_category}
                  </span>
                </div>
                <button onClick={() => removeExercise(idx)} className="text-slate-300 hover:text-red-400 transition">
                  <X size={18} />
                </button>
              </div>
              <textarea
                value={ex.note}
                onChange={(e) =>
                  setExercises((prev) =>
                    prev.map((item, i) => (i === idx ? { ...item, note: e.target.value } : item))
                  )
                }
                placeholder="训练备注，如：4组 8-12次，组间休息90秒"
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-300 focus:border-emerald-400 text-slate-700 placeholder:text-slate-300"
              />
            </div>
          ))}
          <button
            onClick={() => setShowExercisePicker(true)}
            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm flex items-center justify-center gap-2 hover:border-emerald-300 hover:text-emerald-500 transition-colors"
          >
            <Plus size={18} /> 添加动作
          </button>
        </div>

        {/* Delete Template */}
        <button
          onClick={handleDelete}
          className="w-full py-3 text-red-400 text-sm rounded-2xl border border-red-100 hover:bg-red-50 transition"
        >
          删除此模版
        </button>
      </div>

      <ExercisePicker open={showExercisePicker} exercises={allExercises} onSelect={addExercise} onCreated={(exercise) => setAllExercises((previous) => [...previous, exercise])} onClose={() => setShowExercisePicker(false)} />
    </div>
  );
}
