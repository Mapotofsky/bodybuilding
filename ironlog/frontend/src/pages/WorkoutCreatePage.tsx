import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getExercises,
  getExerciseHistory,
  type ExerciseHistoryRecord,
} from "@/services/exercise";
import { createWorkout, updateWorkout } from "@/services/workout";
import { getTemplate, getPlans, getPlan } from "@/services/plan";
import type { Exercise, WorkoutSet, PlanTemplate, PlanSummary } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import {
  ArrowLeft,
  ChevronLeft,
  Search,
  Clock,
  Play,
  SkipForward,
  Square,
  BookOpen,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useToastStore } from "@/components/Toast";

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                    */
/* ------------------------------------------------------------------ */

type Phase = "select" | "training" | "rest" | "finish";

interface SessionExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function WorkoutCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateIdParam = searchParams.get("template_id");

  /* ---- phase ---- */
  const [phase, setPhase] = useState<Phase>("select");
  const [isFirstSelect, setIsFirstSelect] = useState(true);

  /* ---- config (set on first SELECT) ---- */
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");

  /* ---- finish screen ---- */
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  /* ---- accumulated session data ---- */
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);

  /* ---- current training state ---- */
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [currentSetNum, setCurrentSetNum] = useState(1);
  const [inputWeight, setInputWeight] = useState("");
  const [inputReps, setInputReps] = useState("");

  /* ---- exercise picker ---- */
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  /* ---- active template (optional) ---- */
  const [activeTemplate, setActiveTemplate] = useState<PlanTemplate | null>(null);

  /* ---- plan picker ---- */
  const [activePlans, setActivePlans] = useState<PlanSummary[]>([]);
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const [planTemplatesCache, setPlanTemplatesCache] = useState<Record<number, PlanTemplate[]>>({});

  /* ---- exercise history ---- */
  const [history, setHistory] = useState<ExerciseHistoryRecord[]>([]);

  /* ---- timers ---- */
  const [totalSeconds, setTotalSeconds] = useState(0);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef("");

  const [restSeconds, setRestSeconds] = useState(0);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workoutIdRef = useRef<number | null>(null);

  /* ---- load exercises, active plans & optional template ---- */
  useEffect(() => {
    getExercises().then(setAllExercises);
    getPlans().then((plans) => setActivePlans(plans.filter((p) => p.is_active)));
  }, []);

  useEffect(() => {
    if (!templateIdParam) return;
    getTemplate(Number(templateIdParam))
      .then(setActiveTemplate)
      .catch(() => { /* template not found, proceed without */ });
  }, [templateIdParam]);

  async function handleExpandPlan(planId: number) {
    if (expandedPlanId === planId) {
      setExpandedPlanId(null);
      return;
    }
    setExpandedPlanId(planId);
    if (!planTemplatesCache[planId]) {
      const plan = await getPlan(planId);
      setPlanTemplatesCache((prev) => ({ ...prev, [planId]: plan.templates }));
    }
  }

  function handlePickTemplate(tmpl: PlanTemplate) {
    setActiveTemplate(tmpl);
    setExpandedPlanId(null);
  }

  function handleClearTemplate() {
    setActiveTemplate(null);
    setExpandedPlanId(null);
  }

  /* ---- cleanup timers ---- */
  useEffect(() => {
    return () => {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

  /* ---- template helpers ---- */
  const templateExerciseIds = activeTemplate
    ? new Set(activeTemplate.exercises.map((te) => te.exercise_id))
    : new Set<number>();

  function getTemplateNote(exerciseId: number): string | null {
    if (!activeTemplate) return null;
    return activeTemplate.exercises.find((te) => te.exercise_id === exerciseId)?.note || null;
  }

  /* ---- exercise list: filtered to template when active ---- */
  const filteredExercises = allExercises.filter((e) => {
    if (activeTemplate && !templateExerciseIds.has(e.id)) return false;
    if (filterCat && e.category !== filterCat) return false;
    if (searchQ && !e.name.includes(searchQ)) return false;
    return true;
  });

  /* ---- timer helpers ---- */
  const ensureTotalTimer = useCallback(() => {
    if (totalTimerRef.current) return;
    startTimeRef.current = new Date().toISOString();
    totalTimerRef.current = setInterval(
      () => setTotalSeconds((s) => s + 1),
      1000
    );
  }, []);

  const startRestTimer = useCallback(() => {
    setRestSeconds(0);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = setInterval(
      () => setRestSeconds((s) => s + 1),
      1000
    );
  }, []);

  const stopRestTimer = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
  }, []);

  /* ---- enter training for an exercise ---- */
  const startExercise = useCallback(
    async (exercise: Exercise) => {
      setCurrentExercise(exercise);

      // Determine set number (continue where we left off if already trained)
      const existing = sessionExercises.find(
        (se) => se.exercise.id === exercise.id
      );
      const nextSetNum = existing ? existing.sets.length + 1 : 1;
      setCurrentSetNum(nextSetNum);

      // Load history & set smart defaults
      try {
        const hist = await getExerciseHistory(exercise.id, 30);
        setHistory(hist);

        if (existing && existing.sets.length > 0) {
          // Returning to same exercise → default from last completed set
          const last = existing.sets[existing.sets.length - 1];
          setInputWeight(last.weight != null ? String(last.weight) : "");
          setInputReps(last.reps != null ? String(last.reps) : "");
        } else if (hist.length > 0) {
          // New exercise → default from history's last session first set
          const firstSet = hist.find((r) => r.set_number === 1);
          setInputWeight(
            firstSet?.weight != null ? String(firstSet.weight) : ""
          );
          setInputReps(firstSet?.reps != null ? String(firstSet.reps) : "");
        } else {
          setInputWeight("");
          setInputReps("");
        }
      } catch {
        setHistory([]);
        setInputWeight("");
        setInputReps("");
      }

      setPhase("training");
    },
    [sessionExercises]
  );

  /* ---- persist helpers ---- */
  const buildPayload = (
    exercises: SessionExercise[],
    extra?: { mood?: number | null; note?: string; end_time?: string }
  ) => ({
    date,
    start_time: startTimeRef.current || undefined,
    end_time: extra?.end_time,
    mood: extra?.mood ?? undefined,
    note: extra?.note,
    plan_template_id: activeTemplate?.id ?? undefined,
    exercises: exercises.map((se, idx) => ({
      exercise_id: se.exercise.id,
      sort_order: idx,
      sets: se.sets.map((s) => ({
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
  });

  const persistWorkout = async (
    exercises: SessionExercise[],
    extra?: { mood?: number | null; note?: string; end_time?: string }
  ) => {
    const payload = buildPayload(exercises, extra);
    if (workoutIdRef.current) {
      await updateWorkout(workoutIdRef.current, payload);
    } else {
      const result = await createWorkout(payload);
      workoutIdRef.current = result.id;
    }
  };

  const applyRestSeconds = (
    exercises: SessionExercise[],
    exerciseId: number,
    seconds: number
  ): SessionExercise[] =>
    exercises.map((se) =>
      se.exercise.id === exerciseId
        ? {
            ...se,
            sets: se.sets.map((s, i) =>
              i === se.sets.length - 1
                ? { ...s, rest_seconds: seconds }
                : s
            ),
          }
        : se
    );

  /* ---- actions ---- */
  const handleStartTraining = () => {
    if (!selectedExercise) return;
    ensureTotalTimer();
    setIsFirstSelect(false);
    startExercise(selectedExercise);
    setSelectedExercise(null);
  };

  const handleCompleteSet = async () => {
    if (!currentExercise) return;
    const w = inputWeight ? parseFloat(inputWeight) : null;
    const r = inputReps ? parseInt(inputReps) : null;

    const completedSet: WorkoutSet = {
      set_number: currentSetNum,
      weight: w,
      reps: r,
      unit: weightUnit,
      duration_sec: null,
      distance_m: null,
      rpe: null,
      is_warmup: false,
      is_dropset: false,
      is_failure: false,
      rest_seconds: null,
    };

    // Compute updated exercises list
    let updated: SessionExercise[];
    const idx = sessionExercises.findIndex(
      (se) => se.exercise.id === currentExercise.id
    );
    if (idx >= 0) {
      updated = [...sessionExercises];
      updated[idx] = {
        ...updated[idx],
        sets: [...updated[idx].sets, completedSet],
      };
    } else {
      updated = [
        ...sessionExercises,
        { exercise: currentExercise, sets: [completedSet] },
      ];
    }
    setSessionExercises(updated);

    // Save immediately
    try {
      await persistWorkout(updated);
    } catch {
      useToastStore.getState().add("保存失败，请检查网络", "error");
    }

    setPhase("rest");
    startRestTimer();
  };

  const handleNextSet = async () => {
    stopRestTimer();
    if (!currentExercise) return;
    const updated = applyRestSeconds(
      sessionExercises,
      currentExercise.id,
      restSeconds
    );
    setSessionExercises(updated);

    try {
      await persistWorkout(updated);
    } catch {
      useToastStore.getState().add("保存失败，请检查网络", "error");
    }

    setCurrentSetNum((n) => n + 1);
    setPhase("training");
  };

  const handleChangeExercise = async () => {
    stopRestTimer();
    if (!currentExercise) return;
    const updated = applyRestSeconds(
      sessionExercises,
      currentExercise.id,
      restSeconds
    );
    setSessionExercises(updated);

    try {
      await persistWorkout(updated);
    } catch {
      useToastStore.getState().add("保存失败，请检查网络", "error");
    }

    setSearchQ("");
    setFilterCat("");
    setSelectedExercise(null);
    setPhase("select");
  };

  const handleEndTraining = async () => {
    stopRestTimer();
    if (!currentExercise) return;
    const updated = applyRestSeconds(
      sessionExercises,
      currentExercise.id,
      restSeconds
    );
    setSessionExercises(updated);

    try {
      await persistWorkout(updated);
    } catch {
      useToastStore.getState().add("保存失败，请检查网络", "error");
    }

    setPhase("finish");
  };

  const handleSave = async () => {
    setSaving(true);
    if (totalTimerRef.current) {
      clearInterval(totalTimerRef.current);
      totalTimerRef.current = null;
    }
    try {
      await persistWorkout(sessionExercises, {
        mood,
        note: note || undefined,
        end_time: new Date().toISOString(),
      });
      useToastStore.getState().add("训练已保存", "success");
      navigate(`/workouts/${workoutIdRef.current}`, { replace: true });
    } catch (err) {
      console.error(err);
      useToastStore.getState().add("保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ---- derived ---- */
  const currentSetHistory = history.filter(
    (r) => r.set_number === currentSetNum
  );
  const lastCompletedSet = currentExercise
    ? sessionExercises
        .find((se) => se.exercise.id === currentExercise.id)
        ?.sets.slice(-1)[0]
    : null;

  /* ================================================================ */
  /*  RENDER — SELECT                                                  */
  /* ================================================================ */
  if (phase === "select") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-semibold text-lg">
            {isFirstSelect ? "准备训练" : "选择动作"}
          </h1>
          {!isFirstSelect ? (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock size={14} />
              <span className="font-mono">{formatTimer(totalSeconds)}</span>
            </div>
          ) : (
            <div className="w-8" />
          )}
        </div>

        <div className="flex-1 flex flex-col p-4 pb-36">
          {/* Plan / Template picker — first select only */}
          {isFirstSelect && activePlans.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">按计划训练（可选）</p>
                {activeTemplate && (
                  <button onClick={handleClearTemplate} className="text-xs text-gray-400 hover:text-red-400 transition">
                    清除选择
                  </button>
                )}
              </div>
              {activeTemplate ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-teal-50 border border-teal-200 rounded-xl">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activeTemplate.color || "#14B8A6" }}
                  />
                  <span className="text-sm text-teal-700 font-medium flex-1">{activeTemplate.name}</span>
                  <span className="text-xs text-teal-500">相关动作已置顶</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activePlans.map((plan) => (
                    <div key={plan.id}>
                      <button
                        onClick={() => handleExpandPlan(plan.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition ${
                          expandedPlanId === plan.id
                            ? "bg-gray-50 border-gray-300"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: plan.color }}
                        />
                        <span className="text-sm font-medium text-gray-700 flex-1">{plan.name}</span>
                        <span className="text-xs text-gray-400">{plan.template_count} 个模板</span>
                        <span className="text-gray-300 text-xs">{expandedPlanId === plan.id ? "▲" : "▼"}</span>
                      </button>
                      {expandedPlanId === plan.id && planTemplatesCache[plan.id] && (
                        <div className="mt-1 ml-3 flex flex-wrap gap-1.5">
                          {planTemplatesCache[plan.id].map((tmpl) => (
                            <button
                              key={tmpl.id}
                              onClick={() => handlePickTemplate(tmpl)}
                              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 font-medium hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition"
                            >
                              {tmpl.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Date & Unit — first time only */}
          {isFirstSelect && (
            <div className="space-y-3 mb-4">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">重量单位：</span>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {(["kg", "lb"] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setWeightUnit(u)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                        weightUnit === u
                          ? "bg-white text-teal-600 shadow-sm"
                          : "text-gray-500"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Session progress — visible after first exercise */}
          {!isFirstSelect && sessionExercises.length > 0 && (
            <div className="mb-4 bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">
                已完成{" "}
                {sessionExercises.reduce(
                  (sum, se) => sum + se.sets.length,
                  0
                )}{" "}
                组
              </p>
              <div className="flex flex-wrap gap-1">
                {sessionExercises.map((se) => (
                  <span
                    key={se.exercise.id}
                    className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full"
                  >
                    {se.exercise.name} ×{se.sets.length}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3">
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

          {/* Category filter */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterCat("")}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                !filterCat
                  ? "bg-teal-500 text-white"
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
                    ? "bg-teal-500 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Exercise list */}
          <div className="flex-1 overflow-y-auto -mx-1">
            {filteredExercises.map((ex) => {
              const isSelected = selectedExercise?.id === ex.id;
              const trained = sessionExercises.find(
                (se) => se.exercise.id === ex.id
              );
              return (
                <button
                  key={ex.id}
                  onClick={() =>
                    setSelectedExercise(isSelected ? null : ex)
                  }
                  className={`w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between ${
                    isSelected
                      ? "bg-teal-50 ring-2 ring-teal-400"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <p className="font-medium text-sm">
                      {ex.name}
                      {trained && (
                        <span className="ml-2 text-xs text-teal-500">
                          已练{trained.sets.length}组
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {CATEGORY_LABELS[ex.category] || ex.category}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
            {filteredExercises.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">
                没有找到匹配的动作
              </p>
            )}
          </div>
        </div>

        {/* Start Training button — centered above bottom nav */}
        {selectedExercise && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[768px] px-4 z-10">
            <button
              onClick={handleStartTraining}
              className="w-full py-4 bg-teal-600 text-white rounded-2xl font-semibold text-base flex items-center justify-center gap-2 shadow-lg shadow-teal-200 hover:bg-teal-700 transition"
            >
              <Play size={20} />
              开始训练 · {selectedExercise.name}
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER — TRAINING                                                */
  /* ================================================================ */
  if (phase === "training" && currentExercise) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setPhase("select")} className="p-1">
            <ChevronLeft size={22} />
          </button>
          <h1 className="font-semibold text-lg">训练中</h1>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock size={14} />
            <span className="font-mono">{formatTimer(totalSeconds)}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-5">
          {/* Exercise info */}
          <div className="mb-6">
            <p className="text-sm text-teal-600">
              部位：
              {CATEGORY_LABELS[currentExercise.category] ||
                currentExercise.category}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-lg font-semibold text-teal-700">
                动作：{currentExercise.name}
              </p>
              {/* Wiki placeholder (P2) */}
              <button
                className="p-1 text-gray-300"
                title="动作百科（即将推出）"
              >
                <BookOpen size={16} />
              </button>
            </div>
            <p className="text-base font-medium mt-2">
              第 {currentSetNum} 组
            </p>
            {getTemplateNote(currentExercise.id) && (
              <p className="mt-2 text-sm text-teal-600 bg-teal-50 rounded-lg px-3 py-1.5">
                {getTemplateNote(currentExercise.id)}
              </p>
            )}
          </div>

          {/* Unit toggle */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm text-gray-500">单位</span>
            {(["kg", "lb"] as const).map((u) => (
              <label
                key={u}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    weightUnit === u
                      ? "border-teal-500"
                      : "border-gray-300"
                  }`}
                >
                  {weightUnit === u && (
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  )}
                </span>
                <span className="text-sm">
                  {u === "kg" ? "公斤/kg" : "磅/lbs"}
                </span>
              </label>
            ))}
          </div>

          {/* Weight */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-gray-500 w-12">重量</span>
            <input
              type="number"
              inputMode="decimal"
              value={inputWeight}
              onChange={(e) => setInputWeight(e.target.value)}
              placeholder="0"
              className="flex-1 text-lg font-medium px-4 py-3 border border-gray-200 rounded-xl focus:border-teal-400 outline-none"
            />
          </div>

          {/* Reps */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm text-gray-500 w-12">次数</span>
            <input
              type="number"
              inputMode="numeric"
              value={inputReps}
              onChange={(e) => setInputReps(e.target.value)}
              placeholder="0"
              className="flex-1 text-lg font-medium px-4 py-3 border border-gray-200 rounded-xl focus:border-teal-400 outline-none"
            />
          </div>

          {/* History for current set number */}
          {currentSetHistory.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-600 mb-2">
                {currentExercise.name} 第{currentSetNum}组 训练记录：
              </p>
              <div className="space-y-1.5 text-sm">
                {currentSetHistory.slice(0, 5).map((r, i) => {
                  let dateLabel = r.date;
                  try {
                    dateLabel = format(
                      parseISO(r.date),
                      "yyyy-MM-dd EEEE",
                      { locale: zhCN }
                    );
                  } catch {
                    /* keep raw date */
                  }
                  return (
                    <div
                      key={i}
                      className="flex justify-between text-gray-600"
                    >
                      <span>{dateLabel}</span>
                      <span>
                        {r.weight ?? 0} {r.unit}*{r.reps ?? 0}次
                        {r.rest_seconds != null && (
                          <span className="text-gray-400 ml-3">
                            休息: {r.rest_seconds} 秒
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Complete set — centered above bottom nav */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[768px] px-5 z-10">
          <button
            onClick={handleCompleteSet}
            className="w-full py-4 bg-teal-600 text-white rounded-2xl font-semibold text-base shadow-lg shadow-teal-200 transition hover:bg-teal-700"
          >
            完成本组训练
          </button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER — REST                                                    */
  /* ================================================================ */
  if (phase === "rest" && currentExercise && lastCompletedSet) {
    const rm = Math.floor(restSeconds / 60)
      .toString()
      .padStart(2, "0");
    const rs = (restSeconds % 60).toString().padStart(2, "0");

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="w-8" />
          <h1 className="font-semibold text-lg">组间休息</h1>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock size={14} />
            <span className="font-mono">{formatTimer(totalSeconds)}</span>
          </div>
        </div>

        {/* Summary */}
        <div className="text-center pt-8 pb-4 px-5">
          <p className="text-gray-500 text-sm">已完成</p>
          <p className="text-lg font-semibold mt-1">
            {currentExercise.name} 第 {lastCompletedSet.set_number} 组
          </p>
          <p className="text-gray-600 mt-1">
            {lastCompletedSet.weight ?? 0} {weightUnit} ×{" "}
            {lastCompletedSet.reps ?? 0} 次
          </p>
          {getTemplateNote(currentExercise.id) && (
            <p className="mt-3 text-sm text-teal-600 bg-teal-50 rounded-lg px-3 py-2 text-left mx-auto max-w-xs">
              {getTemplateNote(currentExercise.id)}
            </p>
          )}
        </div>

        {/* Timer */}
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <p className="text-sm text-gray-400 mb-3">组间休息</p>
          <div className="flex items-baseline gap-1">
            <span className="text-7xl font-bold text-gray-900 font-mono tracking-tight">
              {rm}
            </span>
            <span className="text-5xl font-bold text-gray-400">:</span>
            <span className="text-7xl font-bold text-gray-900 font-mono tracking-tight">
              {rs}
            </span>
          </div>
          {restSeconds >= 120 && (
            <p className="text-orange-500 text-sm mt-2 animate-pulse">
              休息时间较长，准备好可以继续了
            </p>
          )}
        </div>

        {/* Actions — centered above bottom nav */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[768px] px-5 z-10">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleNextSet}
              className="flex flex-col items-center gap-1.5 py-4 bg-teal-50 rounded-2xl transition hover:bg-teal-100"
            >
              <Play size={28} className="text-teal-600" />
              <span className="text-sm font-medium text-teal-700">
                下一组
              </span>
            </button>
            <button
              onClick={handleChangeExercise}
              className="flex flex-col items-center gap-1.5 py-4 bg-teal-50 rounded-2xl transition hover:bg-teal-100"
            >
              <SkipForward size={28} className="text-teal-600" />
              <span className="text-sm font-medium text-teal-700">
                换动作
              </span>
            </button>
            <button
              onClick={handleEndTraining}
              className="flex flex-col items-center gap-1.5 py-4 bg-red-50 rounded-2xl transition hover:bg-red-100"
            >
              <Square size={28} className="text-red-500" />
              <span className="text-sm font-medium text-red-600">
                结束训练
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER — FINISH                                                  */
  /* ================================================================ */
  if (phase === "finish") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setPhase("rest")} className="p-1">
            <ChevronLeft size={22} />
          </button>
          <h1 className="font-semibold text-lg">训练完成</h1>
          <div className="w-8" />
        </div>

        <div className="flex-1 p-5 space-y-6">
          {/* Summary */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <p className="font-semibold text-gray-700">训练总结</p>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock size={14} />
              <span>训练时长：{formatTimer(totalSeconds)}</span>
            </div>
            <div className="space-y-1">
              {sessionExercises.map((se) => (
                <div
                  key={se.exercise.id}
                  className="flex justify-between text-sm"
                >
                  <span className="text-gray-600">{se.exercise.name}</span>
                  <span className="text-gray-400">{se.sets.length} 组</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              训练感受
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(mood === m ? null : m)}
                  className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition ${
                    mood === m
                      ? "bg-teal-100 ring-2 ring-teal-400"
                      : "bg-gray-50"
                  }`}
                >
                  {["😫", "😕", "😐", "😊", "🔥"][m - 1]}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              训练心得
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="记录训练感受..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none"
            />
          </div>

          <div className="flex-1" />

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-teal-600 text-white rounded-2xl font-semibold text-base disabled:opacity-40 transition hover:bg-teal-700"
          >
            {saving ? "保存中..." : "保存训练记录"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
