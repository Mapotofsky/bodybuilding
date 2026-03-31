import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getExercises } from "@/services/exercise";
import { getWorkout, updateWorkout } from "@/services/workout";
import type { Exercise, Workout, WorkoutSet } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  X,
} from "lucide-react";
import { useToastStore } from "@/components/Toast";
import { makeEmptySet } from "@/utils/workout";

interface LocalExercise {
  tempId: string;
  exercise_id: number;
  exercise_name: string;
  exercise_category: string;
  sets: WorkoutSet[];
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
  const [searchQ, setSearchQ] = useState("");
  const [filterCat, setFilterCat] = useState<string>("");

  useEffect(() => {
    getExercises().then(setAllExercises);
  }, []);

  // Load existing workout
  useEffect(() => {
    if (!id) return;
    getWorkout(Number(id))
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
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercise_name || `动作#${ex.exercise_id}`,
            exercise_category: ex.exercise_category || "",
            sets: ex.sets.map((s) => ({
              set_number: s.set_number,
              weight: s.weight,
              reps: s.reps,
              unit: s.unit,
              duration_sec: s.duration_sec,
              distance_m: s.distance_m,
              rpe: s.rpe,
              is_warmup: s.is_warmup,
              is_dropset: s.is_dropset,
              is_failure: s.is_failure,
              rest_seconds: s.rest_seconds ?? null,
            })),
          }))
        );
      })
      .catch(() => navigate("/workouts", { replace: true }))
      .finally(() => setLoading(false));
  }, [id]);

  const filteredExercises = allExercises.filter((e) => {
    if (filterCat && e.category !== filterCat) return false;
    if (searchQ && !e.name.includes(searchQ)) return false;
    return true;
  });

  const addExercise = (ex: Exercise) => {
    setExercises((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        exercise_id: ex.id,
        exercise_name: ex.name,
        exercise_category: ex.category,
        sets: [makeEmptySet(1, weightUnit)],
      },
    ]);
    setShowPicker(false);
    setSearchQ("");
    setFilterCat("");
  };

  const removeExercise = (tempId: string) => {
    setExercises((prev) => prev.filter((e) => e.tempId !== tempId));
  };

  const addSet = (tempId: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.tempId === tempId
          ? { ...e, sets: [...e.sets, makeEmptySet(e.sets.length + 1, weightUnit)] }
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
          sort_order: idx,
          sets: e.sets.map((s) => ({
            set_number: s.set_number,
            weight: s.weight,
            reps: s.reps,
            unit: s.unit,
            rpe: s.rpe,
            is_warmup: s.is_warmup,
            is_dropset: s.is_dropset,
            is_failure: s.is_failure,
            rest_seconds: s.rest_seconds,
          })),
        })),
      };
      await updateWorkout(Number(id), payload);
      navigate(`/workouts/${id}`, { replace: true });
    } catch (err) {
      console.error(err);
      useToastStore.getState().add("保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-semibold text-lg">编辑训练</h1>
        <button
          onClick={handleSave}
          disabled={saving || exercises.length === 0}
          className="text-blue-500 font-medium disabled:opacity-40"
        >
          {saving ? "保存中" : "保存"}
        </button>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Date, time & meta */}
        <div className="flex gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((m) => (
              <button
                key={m}
                onClick={() => setMood(mood === m ? null : m)}
                className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition ${
                  mood === m
                    ? "bg-blue-100 ring-2 ring-blue-400"
                    : "bg-gray-50"
                }`}
              >
                {["😫", "😕", "😐", "😊", "🔥"][m - 1]}
              </button>
            ))}
          </div>
        </div>

        {/* Start / End time */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-0.5 block">开始时间</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-0.5 block">结束时间</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Unit Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">重量单位：</span>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setWeightUnit(u)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                  weightUnit === u
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500"
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
            className="bg-gray-50 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{ex.exercise_name}</p>
                <p className="text-xs text-gray-400">
                  {CATEGORY_LABELS[ex.exercise_category] || ex.exercise_category}
                </p>
              </div>
              <button
                onClick={() => removeExercise(ex.tempId)}
                className="p-1 text-gray-300 hover:text-red-400"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Sets Header */}
            <div className="grid grid-cols-[40px_1fr_1fr_36px] gap-2 text-xs text-gray-400 px-1">
              <span>组</span>
              <span>重量({weightUnit})</span>
              <span>次数</span>
              <span></span>
            </div>

            {/* Sets */}
            {ex.sets.map((s, si) => (
              <div
                key={si}
                className="grid grid-cols-[40px_1fr_1fr_36px] gap-2 items-center"
              >
                <span
                  className={`text-center text-sm font-medium ${
                    s.is_warmup ? "text-orange-400" : "text-gray-500"
                  }`}
                >
                  {s.is_warmup ? "W" : s.set_number}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={s.weight ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : null;
                    setExercises((prev) =>
                      prev.map((ex2) =>
                        ex2.tempId === ex.tempId
                          ? {
                              ...ex2,
                              sets: ex2.sets.map((s2, i2) =>
                                i2 === si ? { ...s2, weight: val, unit: weightUnit } : s2
                              ),
                            }
                          : ex2
                      )
                    );
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-center text-sm"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={s.reps ?? ""}
                  onChange={(e) =>
                    updateSet(
                      ex.tempId,
                      si,
                      "reps",
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-center text-sm"
                />
                <button
                  onClick={() => removeSet(ex.tempId, si)}
                  className="p-1 text-gray-300 hover:text-red-400"
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            <button
              onClick={() => addSet(ex.tempId)}
              className="w-full py-2 text-sm text-blue-500 bg-white border border-dashed border-blue-200 rounded-lg hover:bg-blue-50 transition"
            >
              + 添加一组
            </button>
          </div>
        ))}

        {/* Add Exercise Button */}
        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 flex items-center justify-center gap-2 hover:border-blue-300 hover:text-blue-400 transition"
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
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none"
        />
      </div>

      {/* Exercise Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-lg">选择动作</h2>
                <button
                  onClick={() => {
                    setShowPicker(false);
                    setSearchQ("");
                    setFilterCat("");
                  }}
                >
                  <X size={22} />
                </button>
              </div>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="搜索动作..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none"
                />
              </div>
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                <button
                  onClick={() => setFilterCat("")}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                    !filterCat
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  全部
                </button>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilterCat(key)}
                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                      filterCat === key
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredExercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 transition flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{ex.name}</p>
                    <p className="text-xs text-gray-400">
                      {CATEGORY_LABELS[ex.category] || ex.category}
                    </p>
                  </div>
                  <Plus size={18} className="text-gray-300" />
                </button>
              ))}
              {filteredExercises.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">
                  没有找到匹配的动作
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
