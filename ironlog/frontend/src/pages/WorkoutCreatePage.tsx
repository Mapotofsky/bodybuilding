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
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import StepInput from "@/components/ui/StepInput";
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
  const dateParam = searchParams.get("date");

  /* ---- phase ---- */
  const [phase, setPhase] = useState<Phase>("select");
  const [isFirstSelect, setIsFirstSelect] = useState(true);

  /* ---- config (set on first SELECT) ---- */
  const [date, setDate] = useState(dateParam || format(new Date(), "yyyy-MM-dd"));
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
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="font-bold text-base text-slate-900">
            {isFirstSelect ? "准备训练" : "选择动作"}
          </h1>
          {!isFirstSelect ? (
            <div className="flex items-center gap-1 text-sm text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              <Clock size={12} />
              <span className="font-mono text-xs">{formatTimer(totalSeconds)}</span>
            </div>
          ) : (
            <div className="w-9" />
          )}
        </div>

        <div className="flex-1 flex flex-col p-4 pb-36">
          {/* Plan / Template picker — first select only */}
          {isFirstSelect && activePlans.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">按计划训练（可选）</p>
                {activeTemplate && (
                  <button onClick={handleClearTemplate} className="text-xs text-slate-400 hover:text-red-400 transition-colors">
                    清除
                  </button>
                )}
              </div>
              {activeTemplate ? (
                <div className="flex items-center gap-2.5 px-3.5 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activeTemplate.color || "#10b981" }}
                  />
                  <span className="text-sm text-emerald-800 font-semibold flex-1">{activeTemplate.name}</span>
                  <span className="text-xs text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded-full">已过滤动作</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activePlans.map((plan) => (
                    <div key={plan.id}>
                      <button
                        onClick={() => handleExpandPlan(plan.id)}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border text-left transition-all ${
                          expandedPlanId === plan.id
                            ? "bg-white border-slate-300 shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: plan.color }}
                        />
                        <span className="text-sm font-semibold text-slate-700 flex-1">{plan.name}</span>
                        <span className="text-xs text-slate-400">{plan.template_count} 个模板</span>
                        {expandedPlanId === plan.id
                          ? <ChevronUp size={14} className="text-slate-400" />
                          : <ChevronDown size={14} className="text-slate-400" />}
                      </button>
                      {expandedPlanId === plan.id && planTemplatesCache[plan.id] && (
                        <div className="mt-1.5 ml-3 flex flex-wrap gap-1.5 animate-slide-down">
                          {planTemplatesCache[plan.id].map((tmpl) => (
                            <button
                              key={tmpl.id}
                              onClick={() => handlePickTemplate(tmpl)}
                              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
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
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-emerald-400"
              />
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 font-medium">重量单位</span>
                <div className="flex bg-slate-100 rounded-xl p-0.5">
                  {(["kg", "lb"] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setWeightUnit(u)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
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
            </div>
          )}

          {/* Session progress — visible after first exercise */}
          {!isFirstSelect && sessionExercises.length > 0 && (
            <div className="mb-4 bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 mb-2">
                本次已完成 {sessionExercises.reduce((sum, se) => sum + se.sets.length, 0)} 组
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sessionExercises.map((se) => (
                  <span
                    key={se.exercise.id}
                    className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium"
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
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="搜索动作..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 transition-colors"
            />
          </div>

          {/* Category filter */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setFilterCat("")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                !filterCat
                  ? "bg-emerald-500 text-white"
                  : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              全部
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilterCat(key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterCat === key
                    ? "bg-emerald-500 text-white"
                    : "bg-white border border-slate-200 text-slate-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Exercise list */}
          <div className="flex-1 overflow-y-auto space-y-1">
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
                  className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-emerald-50 border-2 border-emerald-400"
                      : "bg-white border border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1.5 h-8 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: isSelected ? "#10b981" : "#e2e8f0",
                      }}
                    />
                    <div>
                      <p className={`font-semibold text-sm ${
                        isSelected ? "text-emerald-800" : "text-slate-900"
                      }`}>
                        {ex.name}
                        {trained && (
                          <span className="ml-2 text-xs text-emerald-500 font-medium">
                            已练 {trained.sets.length} 组
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {CATEGORY_LABELS[ex.category] || ex.category}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
            {filteredExercises.length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-400 text-sm">没有找到匹配的动作</p>
              </div>
            )}
          </div>
        </div>

        {/* Start Training button */}
        {selectedExercise && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[768px] px-4 z-10 animate-slide-up">
            <button
              onClick={handleStartTraining}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-transform"
            >
              <Play size={20} fill="white" />
              开始 · {selectedExercise.name}
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
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setPhase("select")}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-sm text-slate-900">训练中</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full">
            <Clock size={12} className="text-slate-500" />
            <span className="font-mono text-xs text-slate-600">{formatTimer(totalSeconds)}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-4 pb-36">
          {/* Exercise header card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full mb-2">
                  {CATEGORY_LABELS[currentExercise.category] || currentExercise.category}
                </span>
                <h2 className="text-xl font-bold text-slate-900">{currentExercise.name}</h2>
                <p className="text-sm text-slate-500 mt-1">第 <span className="font-bold text-slate-800">{currentSetNum}</span> 组</p>
              </div>
              <button className="p-2 text-slate-300 rounded-xl hover:bg-slate-50" title="动作百科（即将推出）">
                <BookOpen size={18} />
              </button>
            </div>
            {getTemplateNote(currentExercise.id) && (
              <p className="mt-3 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 border border-emerald-100">
                📝 {getTemplateNote(currentExercise.id)}
              </p>
            )}
          </div>

          {/* Unit toggle */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-sm text-slate-500 font-medium">单位</span>
            <div className="flex bg-slate-100 rounded-xl p-0.5">
              {(["kg", "lb"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setWeightUnit(u)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
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

          {/* Step inputs */}
          <div className="space-y-4 mb-5">
            <StepInput
              label={`重量 (${weightUnit})`}
              value={inputWeight}
              onChange={setInputWeight}
              step={weightUnit === "kg" ? 2.5 : 5}
              inputMode="decimal"
              placeholder="0"
            />
            <StepInput
              label="次数"
              value={inputReps}
              onChange={setInputReps}
              step={1}
              inputMode="numeric"
              placeholder="0"
            />
          </div>

          {/* History — collapsible */}
          {currentSetHistory.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  第 {currentSetNum} 组 历史参考
                </p>
              </div>
              <div className="divide-y divide-slate-50">
                {currentSetHistory.slice(0, 4).map((r, i) => {
                  let dateLabel = r.date;
                  try {
                    dateLabel = format(parseISO(r.date), "M/d EEEE", { locale: zhCN });
                  } catch { /* keep raw */ }
                  return (
                    <div key={i} className="flex justify-between items-center px-4 py-2.5 text-sm">
                      <span className="text-slate-400 text-xs">{dateLabel}</span>
                      <span className="font-semibold text-slate-700">
                        {r.weight ?? 0}{r.unit} × {r.reps ?? 0}次
                        {r.rest_seconds != null && (
                          <span className="text-slate-400 text-xs ml-2">休 {r.rest_seconds}s</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Complete set button */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[768px] px-4 z-10">
          <button
            onClick={handleCompleteSet}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-transform"
          >
            ✓ 完成本组
          </button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER — REST                                                    */
  /* ================================================================ */
  if (phase === "rest" && currentExercise && lastCompletedSet) {
    const DEFAULT_REST = 300;
    const progress = Math.max(0, restSeconds / DEFAULT_REST);
    const circumference = 2 * Math.PI * 56;
    const strokeDash = circumference * progress;
    const isOvertime = restSeconds >= DEFAULT_REST;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 h-14 flex items-center justify-between">
          <div className="w-9" />
          <h1 className="font-bold text-base text-slate-900">组间休息</h1>
          <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full">
            <Clock size={12} className="text-slate-500" />
            <span className="font-mono text-xs text-slate-600">{formatTimer(totalSeconds)}</span>
          </div>
        </div>

        {/* Completed set summary */}
        <div className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-1 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-xs font-semibold text-emerald-600">已完成</p>
          </div>
          <p className="font-bold text-slate-900">{currentExercise.name} 第 {lastCompletedSet.set_number} 组</p>
          <p className="text-slate-600 text-sm mt-0.5">
            {lastCompletedSet.weight ?? 0} {weightUnit} × {lastCompletedSet.reps ?? 0} 次
          </p>
        </div>

        {/* SVG Ring Timer */}
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <div className="relative">
            <svg width={136} height={136} className="-rotate-90">
              <circle
                cx={68} cy={68} r={56}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={10}
              />
              <circle
                cx={68} cy={68} r={56}
                fill="none"
                stroke={isOvertime ? "#ef4444" : "#10b981"}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - strokeDash}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold font-mono tabular-nums ${
                isOvertime ? "text-red-500" : "text-slate-900"
              }`}>
                {Math.floor(restSeconds / 60).toString().padStart(2, "0")}:{(restSeconds % 60).toString().padStart(2, "0")}
              </span>
              <span className="text-xs text-slate-400 mt-0.5">休息中</span>
            </div>
          </div>

          {isOvertime && (
            <div className="mt-4 px-4 py-2 bg-red-50 border border-red-100 rounded-full">
              <p className="text-red-500 text-sm font-medium">休息太久了！可以继续了</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[768px] px-4 z-10">
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={handleNextSet}
              className="flex flex-col items-center gap-1.5 py-4 bg-emerald-500 rounded-2xl shadow-sm shadow-emerald-200 active:scale-95 transition-transform"
            >
              <Play size={24} className="text-white" fill="white" />
              <span className="text-xs font-bold text-white">下一组</span>
            </button>
            <button
              onClick={handleChangeExercise}
              className="flex flex-col items-center gap-1.5 py-4 bg-white border border-slate-200 rounded-2xl active:scale-95 transition-transform"
            >
              <SkipForward size={24} className="text-slate-600" />
              <span className="text-xs font-semibold text-slate-600">换动作</span>
            </button>
            <button
              onClick={handleEndTraining}
              className="flex flex-col items-center gap-1.5 py-4 bg-white border border-slate-200 rounded-2xl active:scale-95 transition-transform"
            >
              <Square size={24} className="text-red-400" />
              <span className="text-xs font-semibold text-red-500">结束</span>
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
    const totalSets = sessionExercises.reduce((s, se) => s + se.sets.length, 0);
    const totalVol = sessionExercises.reduce(
      (sum, se) => sum + se.sets.reduce((s, st) => s + (st.weight ?? 0) * (st.reps ?? 0), 0),
      0
    );

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setPhase("rest")}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="font-bold text-base text-slate-900">训练完成</h1>
          <div className="w-9" />
        </div>

        <div className="p-4 space-y-4 pb-6">
          {/* Celebration banner */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-center shadow-md shadow-emerald-200">
            <p className="text-4xl mb-2">🌟</p>
            <p className="text-xl font-bold text-white">训练完成！</p>
            <p className="text-emerald-100 text-sm mt-1">你太棒了！</p>
            <div className="flex justify-center gap-6 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{formatTimer(totalSeconds)}</p>
                <p className="text-emerald-200 text-xs mt-0.5">训练时长</p>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{totalSets}</p>
                <p className="text-emerald-200 text-xs mt-0.5">完成组数</p>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {totalVol >= 1000 ? `${(totalVol / 1000).toFixed(1)}t` : `${Math.round(totalVol)}kg`}
                </p>
                <p className="text-emerald-200 text-xs mt-0.5">训练容量</p>
              </div>
            </div>
          </div>

          {/* Exercise breakdown */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">动作明细</p>
            </div>
            <div className="divide-y divide-slate-50">
              {sessionExercises.map((se) => {
                const maxW = Math.max(...se.sets.map((s) => s.weight ?? 0));
                const vol = se.sets.reduce((s, st) => s + (st.weight ?? 0) * (st.reps ?? 0), 0);
                return (
                  <div key={se.exercise.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{se.exercise.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{se.sets.length} 组 · 最大 {maxW}{weightUnit}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-600">{Math.round(vol)}kg</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mood */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">训练感受</p>
            <div className="flex justify-between">
              {[1, 2, 3, 4, 5].map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(mood === m ? null : m)}
                  className={`w-13 h-13 flex-1 mx-1 py-2 rounded-2xl text-2xl flex items-center justify-center transition-all active:scale-95 ${
                    mood === m
                      ? "bg-emerald-50 ring-2 ring-emerald-400 scale-110"
                      : "bg-slate-50"
                  }`}
                >
                  {["😫", "😕", "😐", "😊", "🔥"][m - 1]}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">训练心得</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="记录一点感受..."
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-emerald-400 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-base disabled:opacity-40 shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-transform"
          >
            {saving ? "保存中...✨" : "保存训练记录"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
