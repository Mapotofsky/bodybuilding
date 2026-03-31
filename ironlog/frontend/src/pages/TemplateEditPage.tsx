import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Plus, X, Dumbbell, Search } from "lucide-react";
import { getPlan, updateTemplate, deleteTemplate } from "@/services/plan";
import { getExercises } from "@/services/exercise";
import type { Exercise, TrainingPlan, PlanTemplate } from "@/types";
import { CATEGORY_LABELS, DAY_OF_WEEK_LABELS } from "@/types";

interface LocalTemplateExercise {
  exercise_id: number;
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
  const [exercises, setExercises] = useState<LocalTemplateExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseCategory, setExerciseCategory] = useState("");

  useEffect(() => {
    if (!planId || !templateId) return;
    Promise.all([getPlan(Number(planId)), getExercises({})]).then(([p, exs]) => {
      setPlan(p);
      setAllExercises(exs);
      const tmpl = p.templates.find((t) => t.id === Number(templateId));
      if (tmpl) {
        setTemplate(tmpl);
        setName(tmpl.name);
        setColor(tmpl.color);
        setScheduleRule(tmpl.schedule_rule);
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
    setSaving(true);
    try {
      await updateTemplate(plan.id, template.id, {
        name,
        color,
        schedule_rule: scheduleRule,
        exercises: exercises.map((e, idx) => ({
          exercise_id: e.exercise_id,
          sort_order: idx,
          note: e.note || null,
        })),
      });
      navigate(`/plans/${plan.id}`);
    } catch {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!plan || !template) return;
    if (!window.confirm(`确认删除模版「${template.name}」？`)) return;
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
    setExerciseSearch("");
    setExerciseCategory("");
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

  const filteredExercises = allExercises.filter((ex) => {
    const matchSearch = !exerciseSearch || ex.name.toLowerCase().includes(exerciseSearch.toLowerCase());
    const matchCat = !exerciseCategory || ex.category === exerciseCategory;
    return matchSearch && matchCat;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        加载中...
      </div>
    );
  }

  if (!plan || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        模版不存在
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => navigate(`/plans/${plan.id}`)} className="text-gray-500">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold flex-1">编辑模版</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 bg-blue-500 text-white rounded-full text-sm font-medium disabled:opacity-50"
        >
          {saving ? "保存..." : "保存"}
        </button>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模版名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">颜色（可选）</label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setColor(null)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs ${
                  !color ? "border-gray-400 bg-gray-100" : "border-gray-200 bg-gray-50"
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
                    color === c ? "scale-110 ring-2 ring-offset-2 ring-gray-400" : ""
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
            <label className="block text-sm font-medium text-gray-700">排程规则</label>
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
                        selected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {DAY_OF_WEEK_LABELS[day]}
                    </button>
                  );
                })}
              </div>
            )}
            {plan.mode === "cyclic" && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">周期第</span>
                <input
                  type="number"
                  min={1}
                  max={plan.cycle_length || 14}
                  value={(scheduleRule?.day_in_cycle as number) || 1}
                  onChange={(e) => setScheduleRule({ day_in_cycle: Number(e.target.value) })}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">天</span>
              </div>
            )}
          </div>
        )}

        {/* Exercises */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-700 px-1">动作编排 ({exercises.length})</h2>
          {exercises.map((ex, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">{ex.exercise_name}</p>
                  <span className="text-xs text-gray-400">
                    {CATEGORY_LABELS[ex.exercise_category] || ex.exercise_category}
                  </span>
                </div>
                <button onClick={() => removeExercise(idx)} className="text-gray-300 hover:text-red-400 transition">
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
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 text-gray-700 placeholder:text-gray-300"
              />
            </div>
          ))}
          <button
            onClick={() => setShowExercisePicker(true)}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm flex items-center justify-center gap-2 hover:border-blue-300 hover:text-blue-400 transition"
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

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold">选择动作</h3>
              <button
                onClick={() => { setShowExercisePicker(false); setExerciseSearch(""); setExerciseCategory(""); }}
                className="text-gray-400"
              >
                <X size={22} />
              </button>
            </div>
            <div className="px-4 py-2 space-y-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  placeholder="搜索动作..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setExerciseCategory("")}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition ${!exerciseCategory ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  全部
                </button>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setExerciseCategory(k)}
                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition ${exerciseCategory === k ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-4 pb-4">
              {filteredExercises.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">没有匹配的动作</p>
              ) : (
                <div className="space-y-1">
                  {filteredExercises.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 text-left transition"
                    >
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Dumbbell size={16} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{ex.name}</p>
                        <p className="text-xs text-gray-400">{CATEGORY_LABELS[ex.category] || ex.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
