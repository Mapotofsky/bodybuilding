import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { getPlan, deletePlan, addTemplate } from "@/services/plan";
import type { TrainingPlan, PlanTemplate } from "@/types";
import { PLAN_MODE_LABELS, DAY_OF_WEEK_LABELS } from "@/types";
import { useConfirmStore } from "@/components/ConfirmDialog";
import InputModal from "@/components/ui/InputModal";

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
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPlan(Number(id))
      .then(setPlan)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!plan) return;
    const ok = await useConfirmStore.getState().show(
      `删除计划`,
      `确认删除「${plan.name}」？此操作不可撤销。`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await deletePlan(plan.id);
      navigate("/plans", { replace: true });
    } catch {
      setDeleting(false);
    }
  }

  async function handleAddTemplate(name: string) {
    if (!plan) return;
    setAddModalOpen(false);
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
      <div className="min-h-screen bg-slate-50 p-4 pt-16 space-y-3">
        {[1,2].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse">
            <div className="h-4 bg-slate-200 rounded-xl w-1/2 mb-2" />
            <div className="h-3 bg-slate-200 rounded-xl w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 gap-3">
        <p>计划不存在</p>
        <button onClick={() => navigate("/plans")} className="text-emerald-600 text-sm font-medium">
          返回计划列表
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 h-14 flex items-center gap-3 z-10">
        <button
          onClick={() => navigate("/plans")}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="flex-1 font-bold text-base text-slate-900 truncate">{plan.name}</h1>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <MoreVertical size={20} className="text-slate-700" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-scale-in">
              <button
                onClick={() => { setMenuOpen(false); navigate(`/plans/${plan.id}/edit`); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil size={15} className="text-slate-500" /> 编辑计划
              </button>
              <div className="my-1 mx-3 border-t border-slate-100" />
              <button
                onClick={() => { setMenuOpen(false); handleDelete(); }}
                disabled={deleting}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50"
              >
                <Trash2 size={15} /> 删除计划
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 pb-6">
        {/* Plan Info Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3">
          <div
            className="w-1.5 h-12 rounded-full flex-shrink-0 mt-0.5"
            style={{ backgroundColor: plan.color }}
          />
          <div className="flex-1">
            {plan.description && (
              <p className="text-sm text-slate-500 mb-2">{plan.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-100">
                {PLAN_MODE_LABELS[plan.mode]}
              </span>
              {plan.mode === "cyclic" && plan.cycle_length && (
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {plan.cycle_length} 天周期
                </span>
              )}
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                plan.is_active
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-slate-100 text-slate-500 border-transparent"
              }`}>
                {plan.is_active ? "启用中" : "已停用"}
              </span>
            </div>
          </div>
        </div>

        {/* Templates List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">
              训练模板 <span className="text-slate-400 font-normal">({plan.templates.length})</span>
            </h2>
          </div>

          {plan.templates.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
              <p className="text-sm text-slate-400">还没有模板，点击下方添加</p>
            </div>
          ) : (
            <div className="space-y-2">
              {plan.templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => navigate(`/plans/${plan.id}/templates/${tmpl.id}`)}
                  className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex active:scale-[0.99] transition-transform"
                >
                  <div
                    className="w-1.5 flex-shrink-0"
                    style={{ backgroundColor: tmpl.color || plan.color }}
                  />
                  <div className="flex-1 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-900">{tmpl.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">
                          {tmpl.exercises.length} 个动作
                        </span>
                        {plan.mode !== "flexible" && (
                          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {scheduleRuleLabel(tmpl, plan.mode)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="w-full py-3.5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm flex items-center justify-center gap-2 hover:border-emerald-300 hover:text-emerald-500 transition-colors font-medium"
        >
          <Plus size={16} /> 添加模板
        </button>
      </div>

      <InputModal
        open={addModalOpen}
        title="新建模板"
        placeholder="模板名称..."
        onConfirm={handleAddTemplate}
        onCancel={() => setAddModalOpen(false)}
      />
    </div>
  );
}
