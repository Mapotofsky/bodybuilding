import { useMemo, useState } from "react";
import { Dumbbell, Plus, Search, X } from "lucide-react";
import { createExercise } from "@/services/exercise";
import type { Exercise } from "@/types";
import { CATEGORY_LABELS, EQUIPMENT_LABELS, type EquipmentId, type ExerciseCategory } from "@/types";
import { useToastStore } from "@/components/Toast";
import CustomExerciseForm, { EMPTY_CUSTOM_EXERCISE_FORM, type CustomExerciseFormValue } from "@/components/CustomExerciseForm";
import { useAndroidBackDismiss } from "@/navigation/androidBackLayers";

export interface ExercisePickerProps {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onCreated: (exercise: Exercise) => void | Promise<void>;
  open?: boolean;
  onClose?: () => void;
  presentation?: "sheet" | "inline";
  selectedId?: string | null;
}

/** Shared local-first exercise library picker for workouts and templates. */
export default function ExercisePicker({
  exercises,
  onSelect,
  onCreated,
  open = true,
  onClose,
  presentation = "sheet",
  selectedId = null,
}: ExercisePickerProps) {
  const isSheet = presentation === "sheet";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [equipment, setEquipment] = useState<EquipmentId | "">("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CustomExerciseFormValue>(EMPTY_CUSTOM_EXERCISE_FORM);
  useAndroidBackDismiss(isSheet && open && Boolean(onClose) && !showCreate, () => onClose?.());
  useAndroidBackDismiss(showCreate, () => setShowCreate(false));

  const filtered = useMemo(() => exercises.filter((exercise) => (
    (!query || exercise.name.toLowerCase().includes(query.toLowerCase()))
    && (!category || exercise.category === category)
    && (!equipment || exercise.equipment === equipment)
  )), [category, equipment, exercises, query]);

  async function handleCreate() {
    try {
      const exercise = await createExercise({
        ...createForm,
        description: createForm.description.trim() || null,
      });
      await onCreated(exercise);
      onSelect(exercise);
      setCreateForm(EMPTY_CUSTOM_EXERCISE_FORM);
      setShowCreate(false);
      onClose?.();
      useToastStore.getState().add("已创建自定义动作", "success");
    } catch (error) {
      useToastStore.getState().add(error instanceof Error ? error.message : "创建动作失败", "error");
    }
  }

  function select(exercise: Exercise) {
    onSelect(exercise);
    onClose?.();
  }

  if (isSheet && !open) return null;

  const picker = (
    <div className={isSheet ? "bg-white w-full max-w-[480px] rounded-t-3xl max-h-[88dvh] pb-safe flex flex-col" : ""}>
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-lg text-slate-900">选择动作</h2>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setShowCreate(true)} className="shrink-0 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100"><Plus size={14} className="inline mr-1" />新建</button>
            {isSheet && <button type="button" onClick={onClose} className="p-1 text-slate-500"><X size={22} /></button>}
          </div>
        </div>
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索动作..." className="w-full pl-9 pr-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400" /></div>
        <div className="flex gap-2 overflow-x-auto pb-1"><button type="button" onClick={() => setCategory("")} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap font-medium ${!category ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"}`}>全部分类</button>{Object.entries(CATEGORY_LABELS).map(([key, label]) => <button type="button" key={key} onClick={() => setCategory(key as ExerciseCategory)} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap font-medium ${category === key ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>)}</div>
        <select value={equipment} onChange={(event) => setEquipment(event.target.value as EquipmentId | "")} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" aria-label="器械筛选">
          <option value="">全部器械</option>
          {Object.entries(EQUIPMENT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <div className={isSheet ? "flex-1 min-h-0 overflow-y-auto overscroll-contain p-2" : "p-2"}>{filtered.map((exercise) => <button type="button" key={exercise.id} onClick={() => select(exercise)} className={`w-full text-left px-3 py-3 rounded-xl flex items-center gap-3 ${selectedId === exercise.id ? "bg-emerald-50 border border-emerald-200" : "hover:bg-slate-50"}`}><div className="w-8 h-8 shrink-0 bg-emerald-50 rounded-lg flex items-center justify-center"><Dumbbell size={16} className="text-emerald-500" /></div><div className="min-w-0"><p className="font-medium text-sm text-slate-900 truncate">{exercise.name}{exercise.is_custom && <span className="ml-1.5 text-[10px] text-amber-700">自定义</span>}</p><p className="text-xs text-slate-400">{CATEGORY_LABELS[exercise.category]} · {exercise.equipment ? EQUIPMENT_LABELS[exercise.equipment] : "未设置器械"}</p></div></button>)}{filtered.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">没有匹配的动作</p>}</div>
    </div>
  );

  return <>{isSheet ? <div className="fixed inset-0 z-[80] bg-black/40 flex items-end justify-center">{picker}</div> : picker}{showCreate && <div className="fixed inset-0 z-[90] bg-black/50 flex items-end"><div className="w-full max-w-[480px] max-h-[88dvh] overflow-y-auto overscroll-contain mx-auto bg-white rounded-t-3xl p-5 pb-safe space-y-4"><div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900">新建自定义动作</h3><button type="button" onClick={() => setShowCreate(false)} className="text-slate-500"><X size={20} /></button></div><CustomExerciseForm value={createForm} onChange={setCreateForm} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} submitLabel="创建并使用" compact /></div></div>}</>;
}
