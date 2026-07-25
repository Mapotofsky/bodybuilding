import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getExercises } from "@/services/exercise";
import { getWorkout, updateWorkout } from "@/services/workout";
import { getSettings } from "@/services/settings";
import type { ContextKind, CountBasis, Exercise, LoadBasis, LoadDirection, RateMetric, RecordingMode, Workout, WorkoutSet } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import {
  ArrowLeft,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useToastStore } from "@/components/Toast";
import { makeEmptySet } from "@/utils/workout";
import ExercisePicker from "@/components/ExercisePicker";
import SetFieldEditor, { type SetFieldDraft } from "@/components/SetFieldEditor";
import type { RecordingSnapshot } from "@/utils/recordingPresentation";

interface LocalSet extends WorkoutSet {
  fieldInputs: SetFieldDraft;
}

interface LocalExercise {
  tempId: string;
  id?: string;
  exercise_id: string;
  recording_mode: RecordingMode;
  load_basis: LoadBasis | null;
  count_basis: CountBasis;
  load_direction: LoadDirection | null;
  rate_metric: RateMetric;
  context_kind: ContextKind;
  exercise_name: string;
  exercise_category: string;
  superset_group: number | null;
  sets: LocalSet[];
}

export default function WorkoutEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  // Exercise picker state
  const [showPicker, setShowPicker] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    getExercises().then(setAllExercises);
    getSettings().then((settings) => setWeightUnit(settings.weight_unit)).catch(() => undefined);
  }, []);

  // Load existing workout
  useEffect(() => {
    if (!id) return;
    getWorkout(id)
      .then((w: Workout) => {
        setDate(w.date);
        setNote(w.note || "");
        setMood(w.mood);
        setStartTime(w.start_time ? w.start_time.slice(0, 16) : "");
        setEndTime(w.end_time ? w.end_time.slice(0, 16) : "");
        // Detect unit from first set
        const firstUnit = w.exercises[0]?.sets[0]?.unit;
        if (firstUnit === "lb") setWeightUnit("lb");

        setExercises(
          w.exercises.map((ex) => ({
            tempId: crypto.randomUUID(),
            id: ex.id,
            exercise_id: ex.exercise_id,
            recording_mode: ex.recording_mode,
            load_basis: ex.load_basis,
            count_basis: ex.count_basis,
            load_direction: ex.load_direction,
            rate_metric: ex.rate_metric,
            context_kind: ex.context_kind ?? "none",
            exercise_name: ex.exercise_name || `动作#${ex.exercise_id}`,
            exercise_category: ex.exercise_category || "",
            superset_group: ex.superset_group,
            sets: ex.sets.map((s) => ({
              id: s.id,
              set_number: s.set_number,
              weight: s.weight,
              reps: s.reps,
              unit: s.unit,
              duration_sec: s.duration_sec,
              distance_m: s.distance_m,
              rpe: s.rpe,
              is_warmup: s.is_warmup,
              is_failure: s.is_failure,
              rest_seconds: s.rest_seconds ?? null,
              context_value: s.context_value,
              fieldInputs: setFieldInputs(s),
            })),
          }))
        );
      })
      .catch(() => navigate("/workouts", { replace: true }))
      .finally(() => setLoading(false));
  }, [id]);

  const addExercise = (ex: Exercise) => {
    setExercises((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        id: undefined,
        exercise_id: ex.id,
        recording_mode: ex.recording_mode,
        load_basis: ex.load_basis,
        count_basis: ex.count_basis,
        load_direction: ex.load_direction,
        rate_metric: ex.rate_metric,
        context_kind: ex.context_kind ?? "none",
        exercise_name: ex.name,
        exercise_category: ex.category,
        superset_group: null,
        sets: [editableSet(makeEmptySet(1, weightUnit))],
      },
    ]);
    setShowPicker(false);
  };

  const removeExercise = (tempId: string) => {
    setExercises((prev) => prev.filter((e) => e.tempId !== tempId));
  };

  const addSet = (tempId: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.tempId === tempId
          ? { ...e, sets: [...e.sets, editableSet(makeEmptySet(e.sets.length + 1, weightUnit))] }
          : e
      )
    );
  };

  const removeSet = (tempId: string, setIdx: number) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.tempId === tempId
          ? {
              ...e,
              sets: e.sets
                .filter((_, i) => i !== setIdx)
                .map((s, i) => ({ ...s, set_number: i + 1 })),
            }
          : e
      )
    );
  };

  const updateSet = (
    tempId: string,
    setIdx: number,
    field: string,
    value: any
  ) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.tempId === tempId
          ? {
              ...e,
              sets: e.sets.map((s, i) =>
                i === setIdx ? { ...s, [field]: value } : s
              ),
            }
          : e
      )
    );
  };

  const updateSetFieldInput = (tempId: string, setIdx: number, field: keyof SetFieldDraft, value: string) => {
    setExercises((previous) => previous.map((exercise) => exercise.tempId !== tempId ? exercise : {
      ...exercise,
      sets: exercise.sets.map((set, index) => index !== setIdx ? set : {
        ...set,
        unit: field === "weight" ? weightUnit : set.unit,
        fieldInputs: { ...set.fieldInputs, [field]: value },
      }),
    }));
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const payload = {
        date,
        note: note || null,
        mood: mood || null,
        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null,
        exercises: exercises.map((e, idx) => ({
          exercise_id: e.exercise_id,
          recording_mode: e.recording_mode,
          load_basis: e.load_basis,
          count_basis: e.count_basis,
          load_direction: e.load_direction,
          rate_metric: e.rate_metric,
          context_kind: e.context_kind,
          id: e.id,
          sort_order: idx,
          superset_group: e.superset_group,
          sets: e.sets.map((s) => ({
            set_number: s.set_number,
            weight: parseNullableNumber(s.fieldInputs.weight),
            reps: parseNullableNumber(s.fieldInputs.reps),
            unit: s.unit,
            duration_sec: parseNullableNumber(s.fieldInputs.durationSec),
            distance_m: parseNullableNumber(s.fieldInputs.distanceM),
            id: s.id,
            rpe: s.rpe,
            is_warmup: s.is_warmup,
            is_failure: s.is_failure,
            rest_seconds: s.rest_seconds,
            context_value: parseNullableNumber(s.fieldInputs.contextValue ?? ""),
          })),
        })),
      };
      await updateWorkout(id, payload);
      navigate(`/workouts/${id}`, { replace: true });
    } catch (err) {
      console.error(err);
      useToastStore.getState().add(err instanceof Error ? err.message : "保存失败，请重试", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-page flex items-center justify-center text-slate-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="app-page bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-semibold text-lg">编辑训练</h1>
        <button
          onClick={handleSave}
          disabled={saving || exercises.length === 0}
          className="text-emerald-500 font-medium disabled:opacity-40"
        >
          {saving ? "保存中" : "保存"}
        </button>
      </div>

      <div className="px-5 pt-4 space-y-4 pb-8">
        {/* Date, time & meta */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-sm"
          />
          <div className="grid grid-cols-5 gap-1 min-w-0">
            {[1, 2, 3, 4, 5].map((m) => (
              <button
                key={m}
                onClick={() => setMood(mood === m ? null : m)}
                className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition ${
                  mood === m
                    ? "bg-emerald-100 ring-2 ring-emerald-400"
                    : "bg-slate-50"
                }`}
              >
                {["😫", "😕", "😐", "😊", "🔥"][m - 1]}
              </button>
            ))}
          </div>
        </div>

        {/* Start / End time */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="min-w-0">
            <label className="text-xs text-slate-400 mb-0.5 block">开始时间</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-sm"
            />
          </div>
          <div className="min-w-0">
            <label className="text-xs text-slate-400 mb-0.5 block">结束时间</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Unit Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">重量单位：</span>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setWeightUnit(u)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                  weightUnit === u
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Exercises */}
        {exercises.map((ex) => (
          <div
            key={ex.tempId}
            className="bg-slate-50 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{ex.exercise_name}</p>
                <p className="text-xs text-slate-400">
                  {CATEGORY_LABELS[ex.exercise_category] || ex.exercise_category}
                </p>
              </div>
              <button
                onClick={() => removeExercise(ex.tempId)}
                className="p-1 text-slate-300 hover:text-red-400"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Sets */}
            {ex.sets.map((s, si) => (
              <div key={s.id || `${ex.tempId}-${si}`} className="space-y-2">
                <WorkoutEditSetFieldBlock
                  recording={ex}
                  setNumber={s.set_number}
                  isWarmup={s.is_warmup}
                  value={s.fieldInputs}
                  weightUnit={s.unit}
                  onChange={(field, value) => updateSetFieldInput(ex.tempId, si, field, value)}
                  onRemove={() => removeSet(ex.tempId, si)}
                />
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
                  <button
                    type="button"
                    onClick={() => updateSet(ex.tempId, si, "is_warmup", !s.is_warmup)}
                    className={`py-1.5 rounded-lg text-xs font-semibold border ${s.is_warmup ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-white text-slate-500 border-slate-200"}`}
                  >
                    热身
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSet(ex.tempId, si, "is_failure", !s.is_failure)}
                    className={`py-1.5 rounded-lg text-xs font-semibold border ${s.is_failure ? "bg-red-50 text-red-600 border-red-100" : "bg-white text-slate-500 border-slate-200"}`}
                  >
                    力竭
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    min={1}
                    max={10}
                    placeholder="RPE"
                    value={s.rpe ?? ""}
                    onChange={(e) => updateSet(ex.tempId, si, "rpe", e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full min-w-0 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center text-xs"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={() => addSet(ex.tempId)}
              className="w-full py-2 text-sm text-emerald-500 bg-white border border-dashed border-emerald-200 rounded-lg hover:bg-emerald-50 transition"
            >
              + 添加一组
            </button>
          </div>
        ))}

        {/* Add Exercise Button */}
        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 flex items-center justify-center gap-2 hover:border-emerald-300 hover:text-emerald-400 transition"
        >
          <Plus size={20} />
          添加动作
        </button>

        {/* Note */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="训练备注（可选）"
          rows={2}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none"
        />
      </div>

      <ExercisePicker open={showPicker} exercises={allExercises} onSelect={addExercise} onCreated={(exercise) => setAllExercises((previous) => [...previous, exercise])} onClose={() => setShowPicker(false)} />
    </div>
  );
}

export function WorkoutEditSetFieldBlock({ recording, setNumber, isWarmup, value, weightUnit, onChange, onRemove }: {
  recording: RecordingSnapshot;
  setNumber: number;
  isWarmup: boolean;
  value: SetFieldDraft;
  weightUnit: "kg" | "lb";
  onChange: (field: keyof SetFieldDraft, value: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 min-w-0" data-mobile-set-block>
      <div className="flex items-center justify-between gap-2" data-mobile-set-toolbar>
        <span className={`text-sm font-medium ${isWarmup ? "text-orange-400" : "text-slate-500"}`}>
          {isWarmup ? "热身组" : `第 ${setNumber} 组`}
        </span>
        <button type="button" onClick={onRemove} aria-label={`删除第 ${setNumber} 组`} className="w-9 h-9 shrink-0 flex items-center justify-center text-slate-300 hover:text-red-400">
          <X size={16} />
        </button>
      </div>
      <div className="w-full min-w-0" data-mobile-set-fields>
        <SetFieldEditor recording={recording} value={value} weightUnit={weightUnit} onChange={onChange} />
      </div>
    </div>
  );
}

function editableSet(set: WorkoutSet): LocalSet {
  return {
    ...set,
    fieldInputs: setFieldInputs(set),
  };
}

function setFieldInputs(set: WorkoutSet): SetFieldDraft {
  return {
    weight: set.weight == null ? "" : String(set.weight),
    reps: set.reps == null ? "" : String(set.reps),
    distanceM: set.distance_m == null ? "" : String(set.distance_m),
    durationSec: set.duration_sec == null ? "" : String(set.duration_sec),
    contextValue: set.context_value == null ? "" : String(set.context_value),
  };
}

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}
