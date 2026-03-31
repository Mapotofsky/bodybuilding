import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Dumbbell, TrendingUp, Calendar } from "lucide-react";
import { getExerciseDetail } from "@/services/plan";
import { getExerciseHistory } from "@/services/exercise";
import type { ExerciseDetail } from "@/types";
import type { ExerciseHistoryRecord } from "@/services/exercise";
import { CATEGORY_LABELS } from "@/types";

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getExerciseDetail(Number(id)),
      getExerciseHistory(Number(id), 20),
    ])
      .then(([d, h]) => {
        setDetail(d);
        setHistory(h);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        加载中...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 gap-3">
        <p>动作不存在</p>
        <button onClick={() => navigate(-1)} className="text-blue-500 text-sm">
          返回
        </button>
      </div>
    );
  }

  // Group history by date
  const byDate: Record<string, ExerciseHistoryRecord[]> = {};
  for (const record of history) {
    if (!byDate[record.date]) byDate[record.date] = [];
    byDate[record.date].push(record);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const TYPE_LABELS: Record<string, string> = {
    strength: "力量",
    cardio: "有氧",
    flexibility: "柔韧",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-500">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold flex-1">{detail.name}</h1>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Dumbbell size={24} className="text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{detail.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {CATEGORY_LABELS[detail.category] || detail.category}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {TYPE_LABELS[detail.type] || detail.type}
                </span>
                {detail.is_custom && (
                  <span className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full">
                    自定义
                  </span>
                )}
              </div>
            </div>
          </div>

          {detail.description && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {detail.description}
            </p>
          )}

          {detail.met_value && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>MET 值：</span>
              <span className="font-medium text-gray-700">{detail.met_value}</span>
            </div>
          )}
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-blue-500" />
              <span className="text-xs text-gray-500">累计使用</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {detail.usage_count}
              <span className="text-sm font-normal text-gray-400 ml-1">组</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={16} className="text-green-500" />
              <span className="text-xs text-gray-500">最近使用</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {detail.last_used_date
                ? detail.last_used_date.replace(/-/g, "/").slice(5)
                : "—"}
            </p>
          </div>
        </div>

        {/* History */}
        {dates.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-700 px-1">历史记录</h2>
            {dates.map((date) => (
              <div key={date} className="bg-white rounded-2xl p-4">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  {date.replace(/-/g, "/")}
                </p>
                <div className="space-y-1">
                  {byDate[date].map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 w-8">第{r.set_number}组</span>
                      <span className="font-medium text-gray-800">
                        {r.weight !== null ? `${r.weight}${r.unit}` : "—"}
                      </span>
                      <span className="text-gray-400">×</span>
                      <span className="text-gray-700">
                        {r.reps !== null ? `${r.reps}次` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {dates.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Dumbbell size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">还没有使用记录</p>
          </div>
        )}
      </div>
    </div>
  );
}
