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
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">训练计划</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList size={48} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">还没有训练计划</p>
          <p className="text-sm mt-1">点击下方按钮创建你的第一个计划</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: plan.color }}
              />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <button
                    className="flex-1 text-left"
                    onClick={() => navigate(`/plans/${plan.id}`)}
                  >
                    <p className="font-semibold text-gray-900">{plan.name}</p>
                    {plan.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                        {plan.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {PLAN_MODE_LABELS[plan.mode]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {plan.template_count} 个模版
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => handleToggleActive(plan)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        plan.is_active ? "bg-blue-500" : "bg-gray-200"
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
                      className="text-gray-300"
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
        className="fixed bottom-24 right-4 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center hover:bg-blue-600 transition z-40"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}
