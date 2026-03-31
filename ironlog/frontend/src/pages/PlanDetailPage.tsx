import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { getPlan, deletePlan, addTemplate } from "@/services/plan";
import type { TrainingPlan, PlanTemplate } from "@/types";
import { PLAN_MODE_LABELS, DAY_OF_WEEK_LABELS } from "@/types";

function scheduleRuleLabel(template: PlanTemplate, mode: string): string {
  const rule = template.schedule_rule;
  if (!rule) return "无排程";
  if (mode === "weekly") {
    const days: number[] = (rule.day_of_week as number[]) || [];
    return days.map((d) => DAY_OF_WEEK_LABELS[d]).join("、") || "未配置";
  }
  if (mode === "cyclic") {
    return `周期第 ${rule.day_in_cycle} 天`;
  }
  return "机动";
}

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPlan(Number(id))
      .then(setPlan)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!plan) return;
    if (!window.confirm(`确认删除计划「${plan.name}」？此操作不可撤销。`)) return;
    setDeleting(true);
    try {
      await deletePlan(plan.id);
      navigate("/plans", { replace: true });
    } catch {
      setDeleting(false);
    }
  }

  async function handleAddTemplate() {
    if (!plan) return;
    const name = window.prompt("新模版名称：");
    if (!name?.trim()) return;
    try {
      const updated = await getPlan(plan.id);
      const newTemplate = await addTemplate(plan.id, {
        name: name.trim(),
        sort_order: updated.templates.length,
        exercises: [],
      });
      setPlan((prev) =>
        prev
          ? { ...prev, templates: [...prev.templates, newTemplate as PlanTemplate] }
          : prev
      );
      navigate(`/plans/${plan.id}/templates/${newTemplate.id}`);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        加载中...
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 gap-3">
        <p>计划不存在</p>
        <button onClick={() => navigate("/plans")} className="text-blue-500 text-sm">
          返回计划列表
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => navigate("/plans")} className="text-gray-500">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold leading-tight">{plan.name}</h1>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-gray-500 p-1"
          >
            <MoreVertical size={22} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate(`/plans/${plan.id}/edit`);
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Pencil size={15} /> 编辑计划
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleDelete();
                }}
                disabled={deleting}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
              >
                <Trash2 size={15} /> 删除计划
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Plan Info Card */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-10 rounded-full"
              style={{ backgroundColor: plan.color }}
            />
            <div>
              {plan.description && (
                <p className="text-sm text-gray-500">{plan.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                  {PLAN_MODE_LABELS[plan.mode]}
                </span>
                {plan.mode === "cyclic" && plan.cycle_length && (
                  <span className="text-xs text-gray-500">
                    {plan.cycle_length} 天周期
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    plan.is_active
                      ? "bg-green-50 text-green-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {plan.is_active ? "启用中" : "已停用"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Templates List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              训练模版 ({plan.templates.length})
            </h2>
          </div>

          {plan.templates.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
              <p className="text-sm">还没有模版，点击下方添加</p>
            </div>
          ) : (
            <div className="space-y-2">
              {plan.templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() =>
                    navigate(`/plans/${plan.id}/templates/${tmpl.id}`)
                  }
                  className="w-full text-left bg-white rounded-2xl p-4 hover:bg-gray-50 transition border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {tmpl.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tmpl.color }}
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{tmpl.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">
                            {tmpl.exercises.length} 个动作
                          </span>
                          {plan.mode !== "flexible" && (
                            <span className="text-xs text-blue-500">
                              {scheduleRuleLabel(tmpl, plan.mode)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleAddTemplate}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm flex items-center justify-center gap-2 hover:border-blue-300 hover:text-blue-400 transition"
        >
          <Plus size={18} /> 添加模版
        </button>
      </div>
    </div>
  );
}
