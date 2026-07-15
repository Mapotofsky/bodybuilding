import { getRecordingModeSpec, validateRecordingConfig } from "@/core/recordingModes";
import {
  CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  LOAD_BASIS_LABELS,
  LOAD_DIRECTION_LABELS,
  MUSCLE_GROUP_LABELS,
  RATE_METRIC_LABELS,
  RECORDING_MODE_LABELS,
  type EquipmentId,
  type ExerciseCategory,
  type LoadBasis,
  type LoadDirection,
  type MuscleGroupId,
  type RateMetric,
  type RecordingMode,
} from "@/types";

export interface CustomExerciseFormValue {
  name: string;
  category: ExerciseCategory;
  recording_mode: RecordingMode;
  load_basis: LoadBasis | null;
  load_direction: LoadDirection | null;
  rate_metric: RateMetric;
  equipment: EquipmentId | null;
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

const MUSCLE_GROUP_OPTIONS = Object.entries(MUSCLE_GROUP_LABELS) as Array<[MuscleGroupId, string]>;

export const EMPTY_CUSTOM_EXERCISE_FORM: CustomExerciseFormValue = {
  name: "",
  category: "core",
  recording_mode: "weight_reps",
  load_basis: "total",
  load_direction: "higher_better",
  rate_metric: "none",
  equipment: null,
  description: "",
  primary_muscle_group_ids: [],
  secondary_muscle_group_ids: [],
};

export default function CustomExerciseForm(props: CustomExerciseFormProps) {
  const inputCls = "w-full min-w-0 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400";
  const recordingSpec = getRecordingModeSpec(props.value.recording_mode);
  const hasWeight = recordingSpec.fields.includes("weight");
  const isValid = isValidFormValue(props.value);

  function patch(next: Partial<CustomExerciseFormValue>) {
    props.onChange({ ...props.value, ...next });
  }

  function changeRecordingMode(recordingMode: RecordingMode) {
    const spec = getRecordingModeSpec(recordingMode);
    const nextHasWeight = spec.fields.includes("weight");
    patch({
      recording_mode: recordingMode,
      load_basis: nextHasWeight && props.value.load_basis && spec.allowedLoadBases.includes(props.value.load_basis)
        ? props.value.load_basis
        : nextHasWeight ? "total" : null,
      load_direction: nextHasWeight && props.value.load_direction && spec.allowedLoadDirections.includes(props.value.load_direction)
        ? props.value.load_direction
        : nextHasWeight ? "higher_better" : null,
      rate_metric: spec.supportedRateMetrics.includes(props.value.rate_metric) ? props.value.rate_metric : "none",
    });
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
        <select value={props.value.category} onChange={(event) => patch({ category: event.target.value as ExerciseCategory })} className={inputCls} aria-label="动作分类">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <select value={props.value.recording_mode} onChange={(event) => changeRecordingMode(event.target.value as RecordingMode)} className={inputCls} aria-label="记录方式">
          {Object.entries(RECORDING_MODE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <select value={props.value.equipment ?? ""} onChange={(event) => patch({ equipment: (event.target.value || null) as EquipmentId | null })} className={inputCls} aria-label="器械">
        <option value="">未设置器械</option>
        {Object.entries(EQUIPMENT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      {hasWeight && (
        <div className="grid grid-cols-2 gap-3">
          <select value={props.value.load_basis ?? ""} onChange={(event) => patch({ load_basis: event.target.value as LoadBasis })} className={inputCls} aria-label="重量口径">
            {recordingSpec.allowedLoadBases.map((basis) => <option key={basis} value={basis}>{LOAD_BASIS_LABELS[basis]}</option>)}
          </select>
          <select value={props.value.load_direction ?? ""} onChange={(event) => patch({ load_direction: event.target.value as LoadDirection })} className={inputCls} aria-label="成绩方向">
            {recordingSpec.allowedLoadDirections.map((direction) => <option key={direction} value={direction}>{LOAD_DIRECTION_LABELS[direction]}</option>)}
          </select>
        </div>
      )}
      {props.value.load_basis === "per_hand" && (
        <p className="text-xs text-slate-500 leading-relaxed">
          每手重量表示双手或双侧使用相同重量，次数按每侧完成次数记录；容量和复合负载按两侧合计，因此计算时乘 2。
        </p>
      )}
      {recordingSpec.supportedRateMetrics.length > 1 && (
        <select value={props.value.rate_metric} onChange={(event) => patch({ rate_metric: event.target.value as RateMetric })} className={inputCls} aria-label="竞速成绩">
          {recordingSpec.supportedRateMetrics.map((metric) => <option key={metric} value={metric}>{RATE_METRIC_LABELS[metric]}</option>)}
        </select>
      )}
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
        <button type="button" onClick={props.onSubmit} disabled={!isValid} className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40">
          {props.submitLabel}
        </button>
      </div>
    </div>
  );
}

export function isValidFormValue(value: CustomExerciseFormValue): boolean {
  if (!value.name.trim()) return false;
  try {
    validateRecordingConfig({
      recordingMode: value.recording_mode,
      loadBasis: value.load_basis,
      loadDirection: value.load_direction,
      rateMetric: value.rate_metric,
    });
    return true;
  } catch {
    return false;
  }
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
