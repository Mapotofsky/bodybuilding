import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, Dumbbell, Plus, Search, Trash2, X } from "lucide-react";
import { createExercise, deleteExercise, getExercises } from "@/services/exercise";
import { CATEGORY_LABELS, type Exercise } from "@/types";
import { useConfirmStore } from "@/components/ConfirmDialog";
import { useToastStore } from "@/components/Toast";
import CustomExerciseForm, { EMPTY_CUSTOM_EXERCISE_FORM, type CustomExerciseFormValue } from "@/components/CustomExerciseForm";
import { useAndroidBackDismiss } from "@/navigation/androidBackLayers";

const TYPE_LABELS: Record<Exercise["type"], string> = {
  strength: "负重训练",
  cardio: "心肺训练",
  reps_only: "自重训练",
  static_hold: "静力训练",
};

const FILTER_STORAGE_KEY = "ironlog.exerciseLibraryQuery";

export default function ExerciseLibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [replacement, setReplacement] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CustomExerciseFormValue>(EMPTY_CUSTOM_EXERCISE_FORM);
  useAndroidBackDismiss(deleteTarget !== null, () => setDeleteTarget(null));
  useAndroidBackDismiss(showCreate, () => setShowCreate(false));
  const confirm = useConfirmStore((state) => state.show);
  const toast = useToastStore((state) => state.add);

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";

  const categories = useMemo(
    () => [...new Set(allExercises.map((exercise) => exercise.category))].sort((a, b) => a.localeCompare(b)),
    [allExercises]
  );

  useEffect(() => {
    if (location.search) sessionStorage.setItem(FILTER_STORAGE_KEY, location.search);
  }, [location.search]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([
      getExercises(),
      getExercises({ q: q || undefined, category: category || undefined }),
    ])
      .then(([all, filtered]) => {
        if (!alive) return;
        setAllExercises(all);
        setExercises(filtered);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "读取动作库失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [q, category]);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>("[data-app-main]");
    const closeSwipe = () => setOpenSwipeId(null);
    main?.addEventListener("scroll", closeSwipe, { passive: true });
    return () => main?.removeEventListener("scroll", closeSwipe);
  }, []);

  function updateFilter(next: { q?: string; category?: string }) {
    const params = new URLSearchParams(searchParams);
    const nextQ = next.q ?? q;
    const nextCategory = next.category ?? category;
    if (nextQ) params.set("q", nextQ); else params.delete("q");
    if (nextCategory) params.set("category", nextCategory); else params.delete("category");
    setSearchParams(params, { replace: true });
  }

  function goDetail(exercise: Exercise) {
    const from = `${location.pathname}${location.search}`;
    navigate(`/exercises/${exercise.id}?from=${encodeURIComponent(from)}`);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const ok = await confirm(
      "删除自定义动作",
      replacement
        ? `删除后，存活模板中的「${deleteTarget.name}」会替换为所选动作；历史训练记录保留原始 ID 和记录类型。`
        : `删除后会保留历史训练记录；未选择替代动作时，模板中的旧引用不会被迁移。`
    );
    if (!ok) return;
    try {
      await deleteExercise(deleteTarget.id, replacement || null);
      setExercises((items) => items.filter((item) => item.id !== deleteTarget.id));
      setAllExercises((items) => items.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setReplacement("");
      setOpenSwipeId(null);
      toast("动作已删除", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "删除失败", "error");
    }
  }

  async function createCustomExercise() {
    try {
      const created = await createExercise({
        ...createForm,
      });
      setAllExercises((items) => [...items, created]);
      setExercises((items) => {
        const nameMatches = !q || created.name.toLowerCase().includes(q.toLowerCase());
        const categoryMatches = !category || created.category === category;
        return nameMatches && categoryMatches ? [...items, created] : items;
      });
      setShowCreate(false);
      setCreateForm(EMPTY_CUSTOM_EXERCISE_FORM);
      toast("自定义动作已创建", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "创建失败", "error");
    }
  }

  return (
    <div className="app-page bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-5 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">动作库</h1>
            <p className="text-xs text-slate-500 mt-0.5">内置与自定义动作</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm"
            aria-label="新建自定义动作"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_9rem] gap-2">
          <label className="relative min-w-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(event) => updateFilter({ q: event.target.value })}
              placeholder="搜索动作"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
            />
          </label>
          <select
            value={category}
            onChange={(event) => updateFilter({ category: event.target.value })}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
            aria-label="分类筛选"
          >
            <option value="">全部分类</option>
            {categories.map((item) => (
              <option key={item} value={item}>{CATEGORY_LABELS[item] || item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-5 pt-4 pb-8">
        {loading && <LoadingList />}
        {!loading && error && <StateMessage title="读取失败" message={error} />}
        {!loading && !error && allExercises.length === 0 && <StateMessage title="暂无动作" message="还没有可用动作" />}
        {!loading && !error && allExercises.length > 0 && exercises.length === 0 && (
          <StateMessage title="没有匹配结果" message="调整搜索词或分类后再试" />
        )}
        {!loading && !error && exercises.length > 0 && (
          <div className="space-y-2">
            {exercises.map((exercise) => (
              <SwipeExerciseCard
                key={exercise.id}
                exercise={exercise}
                open={openSwipeId === exercise.id}
                onOpen={() => setOpenSwipeId(exercise.id)}
                onClose={() => setOpenSwipeId(null)}
                onClick={() => goDetail(exercise)}
                onDelete={() => {
                  setDeleteTarget(exercise);
                  setReplacement("");
                  setOpenSwipeId(null);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center">
          <button className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} aria-label="关闭删除选择" />
          <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl p-5 space-y-4 md:max-w-[768px]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">选择替代动作</h2>
              <button onClick={() => setDeleteTarget(null)} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              左滑只揭示删除操作。确认删除前可选择替代动作；历史训练不会批量改写。
            </p>
            <select
              value={replacement}
              onChange={(event) => setReplacement(event.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
            >
              <option value="">仅删除，不迁移模板</option>
              {allExercises.filter((exercise) => exercise.id !== deleteTarget.id && exercise.type === deleteTarget.type).map((exercise) => (
                <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
              ))}
            </select>
            <button onClick={confirmDelete} className="w-full h-11 rounded-xl bg-red-500 text-white text-sm font-semibold">
              {replacement ? "迁移模板后删除" : "仅删除"}
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center">
          <button className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} aria-label="关闭新建动作" />
          <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl p-5 space-y-3 md:max-w-[768px]">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">新建自定义动作</h2>
              <button onClick={() => setShowCreate(false)} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <CustomExerciseForm
              value={createForm}
              onChange={setCreateForm}
              onSubmit={createCustomExercise}
              submitLabel="保存"
              compact={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SwipeExerciseCard(props: {
  exercise: Exercise;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onClick: () => void;
  onDelete: () => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const canSwipe = props.exercise.is_custom;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-red-500">
      {canSwipe && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            props.onDelete();
          }}
          className="absolute inset-y-0 right-0 w-20 flex flex-col items-center justify-center gap-1 text-white text-xs font-semibold"
        >
          <Trash2 size={18} />
          删除
        </button>
      )}
      <button
        onPointerDown={(event) => {
          swiped.current = false;
          if (canSwipe) {
            start.current = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }
        }}
        onPointerMove={(event) => {
          if (!canSwipe || !start.current) return;
          const dx = event.clientX - start.current.x;
          const dy = event.clientY - start.current.y;
          if (Math.abs(dx) < 32 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
          swiped.current = true;
          if (dx < 0) props.onOpen();
          if (dx > 0) props.onClose();
          start.current = null;
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture?.(event.pointerId);
          start.current = null;
        }}
        onPointerCancel={() => {
          start.current = null;
        }}
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          if (props.open) {
            props.onClose();
            return;
          }
          props.onClick();
        }}
        className={`relative w-full touch-pan-y bg-white border border-slate-100 rounded-2xl p-4 text-left shadow-sm transition-transform duration-200 ${
          props.open && canSwipe ? "-translate-x-20" : "translate-x-0"
        }`}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_1rem] gap-3 items-center">
          <span className="min-w-0">
            <span className="block font-semibold text-slate-900 truncate">{props.exercise.name}</span>
            <span className="mt-1 flex flex-wrap gap-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{CATEGORY_LABELS[props.exercise.category] || props.exercise.category}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{TYPE_LABELS[props.exercise.type]}</span>
              {props.exercise.is_custom && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">自定义</span>}
            </span>
          </span>
          <ChevronRight size={16} className="text-slate-300" />
        </div>
      </button>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="bg-white border border-slate-100 rounded-2xl p-4 animate-pulse">
          <div className="h-4 bg-slate-100 rounded-xl w-1/2 mb-3" />
          <div className="h-3 bg-slate-100 rounded-xl w-2/3" />
        </div>
      ))}
    </div>
  );
}

function StateMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl py-12 px-4 text-center">
      <Dumbbell size={28} className="mx-auto mb-2 text-slate-300" />
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="text-sm text-slate-400 mt-1">{message}</p>
    </div>
  );
}
