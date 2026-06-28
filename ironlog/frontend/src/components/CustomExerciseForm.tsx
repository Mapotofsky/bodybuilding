import { CATEGORY_LABELS, MUSCLE_GROUP_LABELS, type Exercise, type MuscleGroupId } from "@/types";

export interface CustomExerciseFormValue {
  name: string;
  category: string;
  type: Exercise["type"];
  description: string;
  primary_muscle_group_ids: MuscleGroupId[];
  secondary_muscle_group_ids: MuscleGroupId[];
}

interface CustomExerciseFormProps {
  value: CustomExerciseFormValue;
  onChange: (value: CustomExerciseFormValue) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
  compact?: boolean;
}

const TYPE_LABELS: Record<Exercise["type"], string> = {
  strength: "负重训练",
  cardio: "心肺训练",
  reps_only: "自重训练",
  static_hold: "静力训练",
};

const MUSCLE_GROUP_OPTIONS = Object.entries(MUSCLE_GROUP_LABELS) as Array<[MuscleGroupId, string]>;

export const EMPTY_CUSTOM_EXERCISE_FORM: CustomExerciseFormValue = {
  name: "",
  category: "core",
  type: "strength",
  description: "",
  primary_muscle_group_ids: [],
  secondary_muscle_group_ids: [],
};

export default function CustomExerciseForm(props: CustomExerciseFormProps) {
  const inputCls = "w-full min-w-0 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400";

  function patch(next: Partial<CustomExerciseFormValue>) {
    props.onChange({ ...props.value, ...next });
  }

  return (
    <div className={props.compact ? "space-y-3" : "space-y-3"}>
      <input
        value={props.value.name}
        onChange={(event) => patch({ name: event.target.value })}
        placeholder="动作名称"
        className={inputCls}
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3">
        <select value={props.value.category} onChange={(event) => patch({ category: event.target.value })} className={inputCls} aria-label="动作分类">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <select value={props.value.type} onChange={(event) => patch({ type: event.target.value as Exercise["type"] })} className={inputCls} aria-label="记录类型">
          {Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <textarea
        value={props.value.description}
        onChange={(event) => patch({ description: event.target.value })}
        placeholder="动作要领（可选）"
        rows={props.compact ? 2 : 4}
        className={inputCls}
      />
      <MusclePicker
        title="主目标肌群"
        selected={props.value.primary_muscle_group_ids}
        disabled={props.value.secondary_muscle_group_ids}
        max={3}
        onChange={(value) => patch({ primary_muscle_group_ids: value })}
      />
      <MusclePicker
        title="次要目标肌群"
        selected={props.value.secondary_muscle_group_ids}
        disabled={props.value.primary_muscle_group_ids}
        max={6}
        onChange={(value) => patch({ secondary_muscle_group_ids: value })}
      />
      <div className={props.onCancel ? "grid grid-cols-2 gap-3" : ""}>
        {props.onCancel && (
          <button type="button" onClick={props.onCancel} className="py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm">
            取消
          </button>
        )}
        <button type="button" onClick={props.onSubmit} className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold">
          {props.submitLabel}
        </button>
      </div>
    </div>
  );
}

function MusclePicker({ title, selected, disabled, max, onChange }: {
  title: string;
  selected: MuscleGroupId[];
  disabled: MuscleGroupId[];
  max: number;
  onChange: (value: MuscleGroupId[]) => void;
}) {
  function toggle(id: MuscleGroupId) {
    if (disabled.includes(id)) return;
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, id]);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {MUSCLE_GROUP_OPTIONS.map(([id, label]) => {
          const active = selected.includes(id);
          const blocked = disabled.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`px-2.5 py-1.5 rounded-full border text-xs font-medium ${
                active
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : blocked
                    ? "bg-slate-50 border-slate-100 text-slate-300"
                    : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
