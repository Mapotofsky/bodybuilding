import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ClipboardList, ChevronRight } from "lucide-react";
import { getPlans, updatePlan } from "@/services/plan";
import type { PlanSummary } from "@/types";
import { PLAN_MODE_LABELS } from "@/types";

const PLAN_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
];

export default function PlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlans()
      .then(setPlans)
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleActive(plan: PlanSummary) {
    try {
      await updatePlan(plan.id, { is_active: !plan.is_active });
      setPlans((prev) =>
        prev.map((p) =>
          p.id === plan.id ? { ...p, is_active: !p.is_active } : p
        )
      );
    } catch {
      // ignore
    }
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">训练计划</h1>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse">
              <div className="h-4 bg-slate-200 rounded-xl w-1/2 mb-2" />
              <div className="h-3 bg-slate-200 rounded-xl w-3/4" />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ClipboardList size={24} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-500">还没有训练计划</p>
          <p className="text-sm text-slate-400 mt-1">点击右下角按鈕创建第一个计划</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex"
            >
              <div
                className="w-1.5 flex-shrink-0"
                style={{ backgroundColor: plan.color }}
              />
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between">
                  <button
                    className="flex-1 text-left"
                    onClick={() => navigate(`/plans/${plan.id}`)}
                  >
                    <p className="font-bold text-slate-900">{plan.name}</p>
                    {plan.description && (
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
                        {plan.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                        {PLAN_MODE_LABELS[plan.mode]}
                      </span>
                      <span className="text-xs text-slate-400">
                        {plan.template_count} 个模板
                      </span>
                      {plan.is_active && (
                        <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium border border-emerald-100">
                          启用中
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-3 ml-3">
                    <button
                      onClick={() => handleToggleActive(plan)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        plan.is_active ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          plan.is_active ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => navigate(`/plans/${plan.id}`)}
                      className="text-slate-300"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate("/plans/new")}
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:bg-emerald-600 active:scale-95 transition-all z-40"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
