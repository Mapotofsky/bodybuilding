import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getExercises,
  getExerciseHistory,
  type ExerciseHistoryRecord,
} from "@/services/exercise";
import { completeWorkoutDraft, createWorkout, getLatestWorkoutDraft, updateWorkout } from "@/services/workout";
import { appendExerciseToTemplate, getTemplate, getPlans, getPlan } from "@/services/plan";
import { getSettings } from "@/services/settings";
import { calculateWorkoutMetrics } from "@/core/workoutMetrics";
import { getRecordingModeSpec, validateWorkoutSetForMode } from "@/core/recordingModes";
import { completionTimestamp, formatExerciseCompletion, formatWorkoutPrimaryMetric, splitMetricValue } from "@/utils/workoutPresentation";
import { formatSet } from "@/utils/recordingPresentation";
import { scrollAppToTop } from "@/utils/scroll";
import { sessionExerciseForDraft } from "@/utils/workoutDraft";
import type { Exercise, Workout, WorkoutSet, PlanTemplate, PlanSummary } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import {
  ArrowLeft,
  ChevronLeft,
  Clock,
  Play,
  SkipForward,
  Square,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import StepInput from "@/components/ui/StepInput";
import SetFieldEditor from "@/components/SetFieldEditor";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useToastStore } from "@/components/Toast";
import ExercisePicker from "@/components/ExercisePicker";

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                    */
/* ------------------------------------------------------------------ */

type Phase = "select" | "training" | "rest" | "finish";

interface SessionExercise {
  id?: string;
  exercise: Exercise;
  superset_group: number | null;
  sets: WorkoutSet[];
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
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
  const [inputDistance, setInputDistance] = useState("");
  const [inputDuration, setInputDuration] = useState("");
  const [inputContextValue, setInputContextValue] = useState("");
  const [inputRpe, setInputRpe] = useState("");
  const [inputRpeError, setInputRpeError] = useState<string | null>(null);
  const [inputWarmup, setInputWarmup] = useState(false);
  const [inputFailure, setInputFailure] = useState(false);

  /* ---- exercise picker ---- */
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  /* ---- active template (optional) ---- */
  const [activeTemplate, setActiveTemplate] = useState<PlanTemplate | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Workout | null>(null);
  const [draftChecking, setDraftChecking] = useState(true);

  /* ---- plan picker ---- */
  const [activePlans, setActivePlans] = useState<PlanSummary[]>([]);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [planTemplatesCache, setPlanTemplatesCache] = useState<Record<string, PlanTemplate[]>>({});

  /* ---- exercise history ---- */
  const [history, setHistory] = useState<ExerciseHistoryRecord[]>([]);

  /* ---- timers ---- */
  const [totalSeconds, setTotalSeconds] = useState(0);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef("");
  const finishTimeRef = useRef("");

  const [restSeconds, setRestSeconds] = useState(0);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workoutIdRef = useRef<string | null>(null);

  /* ---- load exercises, active plans & optional template ---- */
  useEffect(() => {
    getExercises().then(setAllExercises);
    getSettings().then((settings) => setWeightUnit(settings.weight_unit)).catch(() => undefined);
    getPlans().then((plans) => setActivePlans(plans.filter((p) => p.is_active)));
    getLatestWorkoutDraft().then(setDraft).catch(() => useToastStore.getState().add("无法读取上次训练草稿", "error")).finally(() => setDraftChecking(false));
  }, []);

  useLayoutEffect(() => {
    if (phase === "training") scrollAppToTop();
  }, [phase, currentExercise?.id]);

  useEffect(() => {
    if (!templateIdParam) return;
    getTemplate(templateIdParam)
      .then((template) => { setActiveTemplate(template); setActiveTemplateId(template.id); })
      .catch(() => { /* template not found, proceed without */ });
  }, [templateIdParam]);

  async function handleExpandPlan(planId: string) {
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
    setActiveTemplateId(tmpl.id);
    setExpandedPlanId(null);
  }

  function handleClearTemplate() {
    setActiveTemplate(null);
    setActiveTemplateId(null);
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
    : new Set<string>();

  function getTemplateNote(exerciseId: string): string | null {
    if (!activeTemplate) return null;
    return activeTemplate.exercises.find((te) => te.exercise_id === exerciseId)?.note || null;
  }

  /* ---- exercise list: filtered to template when active ---- */
  const selectableExercises = activeTemplate
    ? allExercises.filter((exercise) => templateExerciseIds.has(exercise.id))
    : allExercises;

  async function handleExerciseCreated(exercise: Exercise) {
    setAllExercises((previous) => previous.some((item) => item.id === exercise.id) ? previous : [...previous, exercise]);
    if (!activeTemplateId) return;
    try {
      const updatedTemplate = await appendExerciseToTemplate(activeTemplateId, exercise.id);
      setActiveTemplate(updatedTemplate);
      setPlanTemplatesCache((previous) => ({
        ...previous,
        [updatedTemplate.plan_id]: previous[updatedTemplate.plan_id]
          ? previous[updatedTemplate.plan_id].map((template) =>
              template.id === updatedTemplate.id ? updatedTemplate : template
            )
          : [updatedTemplate],
      }));
    } catch (error) {
      useToastStore.getState().add(error instanceof Error ? error.message : "新动作已创建，但写入当前模板失败", "error");
    }
  }

  function resetSetMetaInputs() {
    setInputRpe("");
    setInputRpeError(null);
    setInputWarmup(false);
    setInputFailure(false);
  }

  /* ---- timer helpers ---- */
  const ensureTotalTimer = useCallback(() => {
    if (totalTimerRef.current) return;
    if (!startTimeRef.current) startTimeRef.current = new Date().toISOString();
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

  const resumeRestTimer = useCallback(() => {
    if (restTimerRef.current) return;
    restTimerRef.current = setInterval(() => setRestSeconds((seconds) => seconds + 1), 1000);
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
          setInputDistance(last.distance_m != null ? String(last.distance_m) : "");
          setInputDuration(last.duration_sec != null ? String(last.duration_sec) : "");
          setInputContextValue(last.context_value != null ? String(last.context_value) : "");
          resetSetMetaInputs();
        } else if (hist.length > 0) {
          // New exercise → default from history's last session first set
          const firstSet = hist.find((r) => r.set_number === 1);
          setInputWeight(
            firstSet?.weight != null ? String(firstSet.weight) : ""
          );
          setInputReps(firstSet?.reps != null ? String(firstSet.reps) : "");
          setInputDistance(firstSet?.distance_m != null ? String(firstSet.distance_m) : "");
          setInputDuration(firstSet?.duration_sec != null ? String(firstSet.duration_sec) : "");
          setInputContextValue(firstSet?.context_value != null ? String(firstSet.context_value) : "");
          resetSetMetaInputs();
        } else {
          setInputWeight("");
          setInputReps("");
          setInputDistance("");
          setInputDuration("");
          setInputContextValue("");
          resetSetMetaInputs();
        }
      } catch {
        setHistory([]);
        setInputWeight("");
        setInputReps("");
        setInputDistance("");
        setInputDuration("");
        setInputContextValue("");
        resetSetMetaInputs();
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
    plan_template_id: activeTemplateId ?? undefined,
    exercises: exercises.map((se, idx) => ({
      id: se.id,
      exercise_id: se.exercise.id,
      recording_mode: se.exercise.recording_mode,
      load_basis: se.exercise.load_basis,
      count_basis: se.exercise.count_basis,
      load_direction: se.exercise.load_direction,
      rate_metric: se.exercise.rate_metric,
      context_kind: se.exercise.context_kind,
      sort_order: idx,
      superset_group: se.superset_group,
      sets: se.sets.map((s) => ({
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
        rest_seconds: s.rest_seconds,
        context_value: s.context_value,
      })),
    })),
  });

  const persistWorkout = async (
    exercises: SessionExercise[],
    extra?: { mood?: number | null; note?: string; end_time?: string }
  ): Promise<Workout> => {
    const payload = buildPayload(exercises, extra);
    if (workoutIdRef.current) {
      return updateWorkout(workoutIdRef.current, payload);
    } else {
      const result = await createWorkout(payload);
      workoutIdRef.current = result.id;
      return result;
    }
  };

  const applyRestSeconds = (
    exercises: SessionExercise[],
    exerciseId: string,
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
    const spec = getRecordingModeSpec(currentExercise.recording_mode);
    const w = parseNullableNumber(inputWeight);
    const r = parseNullableNumber(inputReps);
    const distance = parseNullableNumber(inputDistance);
    const duration = parseNullableNumber(inputDuration);
    const contextValue = parseNullableNumber(inputContextValue);
    const rpe = parseNullableNumber(inputRpe);

    const completedSet: WorkoutSet = {
      set_number: currentSetNum,
      weight: spec.fields.includes("weight") ? w : null,
      reps: spec.fields.includes("reps") ? r : null,
      unit: weightUnit,
      duration_sec: spec.fields.includes("durationSec") ? duration : null,
      distance_m: spec.fields.includes("distanceM") ? distance : null,
      rpe,
      is_warmup: inputWarmup,
      is_failure: inputFailure,
      rest_seconds: null,
      context_value: contextValue,
    };
    try {
      validateWorkoutSetForMode({
        weight: completedSet.weight,
        reps: completedSet.reps,
        distanceM: completedSet.distance_m,
        durationSec: completedSet.duration_sec,
        contextValue: completedSet.context_value,
      }, {
        recordingMode: currentExercise.recording_mode,
        loadBasis: currentExercise.load_basis,
        countBasis: currentExercise.count_basis,
        loadDirection: currentExercise.load_direction,
        rateMetric: currentExercise.rate_metric,
        contextKind: currentExercise.context_kind,
      }, "complete");
      if (rpe != null && (!Number.isInteger(rpe) || rpe < 1 || rpe > 10)) throw new Error("RPE 必须是 1 到 10 的整数");
    } catch (error) {
      useToastStore.getState().add(error instanceof Error ? error.message : "请检查本组输入", "error");
      return;
    }

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
        { exercise: currentExercise, superset_group: null, sets: [completedSet] },
      ];
    }
    setSessionExercises(updated);

    // Save immediately
    try {
      const saved = await persistWorkout(updated);
      setSessionExercises(mergePersistedIds(updated, saved));
    } catch (error) {
      useToastStore.getState().add(saveErrorMessage(error), "error");
    }

    setPhase("rest");
    resetSetMetaInputs();
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
      const saved = await persistWorkout(updated);
      setSessionExercises(mergePersistedIds(updated, saved));
    } catch (error) {
      useToastStore.getState().add(saveErrorMessage(error), "error");
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
      const saved = await persistWorkout(updated);
      setSessionExercises(mergePersistedIds(updated, saved));
    } catch (error) {
      useToastStore.getState().add(saveErrorMessage(error), "error");
    }

    setSelectedExercise(null);
    setPhase("select");
  };

  const handleEndTraining = async () => {
    stopRestTimer();
    if (!currentExercise) return;
    finishTimeRef.current = completionTimestamp(startTimeRef.current, totalSeconds, new Date().toISOString());
    if (totalTimerRef.current) {
      clearInterval(totalTimerRef.current);
      totalTimerRef.current = null;
    }
    const updated = applyRestSeconds(
      sessionExercises,
      currentExercise.id,
      restSeconds
    );
    setSessionExercises(updated);

    try {
      const saved = await persistWorkout(updated);
      setSessionExercises(mergePersistedIds(updated, saved));
    } catch (error) {
      useToastStore.getState().add(saveErrorMessage(error), "error");
    }

    setPhase("finish");
  };

  const handleResumeTraining = () => {
    finishTimeRef.current = "";
    ensureTotalTimer();
    resumeRestTimer();
    setPhase("rest");
  };

  const handleSave = async () => {
    setSaving(true);
    if (totalTimerRef.current) {
      clearInterval(totalTimerRef.current);
      totalTimerRef.current = null;
    }
    try {
      const saved = await persistWorkout(sessionExercises, {
        mood,
        note: note || undefined,
        end_time: finishTimeRef.current || completionTimestamp(startTimeRef.current, totalSeconds, new Date().toISOString()),
      });
      setSessionExercises(mergePersistedIds(sessionExercises, saved));
      useToastStore.getState().add("训练已保存", "success");
      navigate(`/workouts/${workoutIdRef.current}`, { replace: true });
    } catch (err) {
      console.error(err);
      useToastStore.getState().add(saveErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  async function continueDraft() {
    if (!draft) return;
    const exerciseMap = new Map(allExercises.map((exercise) => [exercise.id, exercise]));
    const restored = draft.exercises.map((item) => sessionExerciseForDraft(item, exerciseMap.get(item.exercise_id)));
    workoutIdRef.current = draft.id;
    setDate(draft.date);
    setMood(draft.mood);
    setNote(draft.note || "");
    startTimeRef.current = draft.start_time || "";
    if (draft.start_time) setTotalSeconds(Math.max(0, Math.floor((Date.now() - new Date(draft.start_time).getTime()) / 1000)));
    setActiveTemplateId(draft.plan_template_id);
    if (draft.plan_template_id) {
      getTemplate(draft.plan_template_id).then(setActiveTemplate).catch(() => useToastStore.getState().add("原训练模板已不存在，已保留训练数据", "error"));
    }
    setSessionExercises(restored);
    setIsFirstSelect(false);
    setDraft(null);
    const last = restored[restored.length - 1];
    if (last) {
      const lastSet = last.sets[last.sets.length - 1];
      setCurrentExercise(last.exercise);
      setCurrentSetNum(last.sets.length + 1);
      setInputWeight(lastSet?.weight != null ? String(lastSet.weight) : "");
      setInputReps(lastSet?.reps != null ? String(lastSet.reps) : "");
      setInputDistance(lastSet?.distance_m != null ? String(lastSet.distance_m) : "");
      setInputDuration(lastSet?.duration_sec != null ? String(lastSet.duration_sec) : "");
      setInputContextValue(lastSet?.context_value != null ? String(lastSet.context_value) : "");
      resetSetMetaInputs();
      if (lastSet?.unit === "lb") setWeightUnit("lb");
      setPhase("training");
      ensureTotalTimer();
    } else {
      setPhase("select");
    }
  }

  async function startFreshAfterDraft() {
    if (!draft) return;
    try {
      await completeWorkoutDraft(draft.id);
      setDraft(null);
    } catch (error) {
      useToastStore.getState().add(error instanceof Error ? error.message : "无法结束旧草稿", "error");
    }
  }

  /* ---- derived ---- */
  const currentSetHistory = history.filter(
    (r) => r.set_number === currentSetNum
  );
  const lastCompletedSet = currentExercise
    ? sessionExercises
        .find((se) => se.exercise.id === currentExercise.id)
        ?.sets.slice(-1)[0]
    : null;

  if (draft && !draftChecking) {
    return <DraftRecoveryDialog draft={draft} onContinue={continueDraft} onStartFresh={startFreshAfterDraft} />;
  }

  /* ================================================================ */
  /*  RENDER — SELECT                                                  */
  /* ================================================================ */
  if (phase === "select") {
    return (
      <div className={`app-page bg-slate-50 flex flex-col ${selectedExercise ? "app-page-with-fixed-action" : ""}`}>
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

        <div className="px-5 pt-4 pb-6">
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
                    style={{ backgroundColor: activeTemplate.color || "var(--color-primary)" }}
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

          <ExercisePicker
            presentation="inline"
            exercises={selectableExercises}
            selectedId={selectedExercise?.id}
            onSelect={(exercise) => setSelectedExercise(exercise)}
            onCreated={handleExerciseCreated}
          />
        </div>

        {/* Start Training button */}
        {selectedExercise && (
          <div className="app-fixed-above-tab fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[768px] px-4 z-10 animate-slide-up">
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
      <div className="app-page app-page-with-fixed-action bg-slate-50 flex flex-col">
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

        <div className="flex-1 flex flex-col px-5 pt-4 pb-6">
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
          {getRecordingModeSpec(currentExercise.recording_mode).fields.includes("weight") && <div className="flex items-center gap-3 mb-5">
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
          </div>}

          {/* Step inputs */}
          <div className="mb-5">
            <SetFieldEditor
              recording={currentExercise}
              weightUnit={weightUnit}
              value={{ weight: inputWeight, reps: inputReps, distanceM: inputDistance, durationSec: inputDuration, contextValue: inputContextValue }}
              onChange={(field, value) => {
                if (field === "weight") setInputWeight(value);
                else if (field === "reps") setInputReps(value);
                else if (field === "distanceM") setInputDistance(value);
                else if (field === "durationSec") setInputDuration(value);
                else setInputContextValue(value);
              }}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-3 mb-5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInputWarmup((value) => !value)}
                className={`py-2 rounded-xl text-sm font-semibold border ${inputWarmup ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-100"}`}
              >
                热身
              </button>
              <button
                type="button"
                onClick={() => setInputFailure((value) => !value)}
                className={`py-2 rounded-xl text-sm font-semibold border ${inputFailure ? "bg-red-50 text-red-600 border-red-100" : "bg-slate-50 text-slate-500 border-slate-100"}`}
              >
                力竭
              </button>
            </div>
            <StepInput
              label="RPE"
              value={inputRpe}
              onChange={(value) => {
                setInputRpe(value);
                const parsed = parseNullableNumber(value);
                setInputRpeError(parsed == null || (Number.isInteger(parsed) && parsed >= 1 && parsed <= 10) ? null : "RPE 必须是 1 到 10 的整数");
              }}
              step={1}
              min={1}
              max={10}
              inputMode="numeric"
              placeholder="未设置"
            />
            {inputRpeError && <p role="alert" className="text-xs text-red-500">{inputRpeError}</p>}
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
                        {formatSet(r, r)}
                        {r.is_warmup && (
                          <span className="text-amber-500 text-xs ml-2">热身</span>
                        )}
                        {r.rpe != null && (
                          <span className="text-slate-400 text-xs ml-2">@{r.rpe}</span>
                        )}
                        {r.is_failure && (
                          <span className="text-red-500 text-xs ml-2">力竭</span>
                        )}
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
        <div className="app-fixed-above-tab fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[768px] px-4 z-10">
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
      <div className="workout-rest-screen app-page bg-slate-50 flex flex-col">
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
        <div className="workout-rest-summary mx-5 mt-3 bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 shrink-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-xs font-semibold text-emerald-600">已完成</p>
          </div>
          <p className="font-bold text-slate-900">{currentExercise.name} 第 {lastCompletedSet.set_number} 组</p>
          <p className="text-slate-600 text-sm mt-0.5">
            {formatSet(currentExercise, lastCompletedSet)}
          </p>
        </div>

        {/* SVG Ring Timer */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-5 py-2">
          <div className="workout-rest-ring relative shrink-0">
            <svg viewBox="0 0 136 136" className="w-full h-full -rotate-90">
              <circle
                cx={68} cy={68} r={56}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth={10}
              />
              <circle
                cx={68} cy={68} r={56}
                fill="none"
                stroke={isOvertime ? "var(--color-danger)" : "var(--color-primary)"}
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
        <div className="shrink-0 px-4 pb-3">
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={handleNextSet}
              className="flex flex-col items-center gap-1 py-3 bg-emerald-500 rounded-2xl shadow-sm shadow-emerald-200 active:scale-95 transition-transform"
            >
              <Play size={24} className="text-white" fill="white" />
              <span className="text-xs font-bold text-white">下一组</span>
            </button>
            <button
              onClick={handleChangeExercise}
              className="flex flex-col items-center gap-1 py-3 bg-white border border-slate-200 rounded-2xl active:scale-95 transition-transform"
            >
              <SkipForward size={24} className="text-slate-600" />
              <span className="text-xs font-semibold text-slate-600">换动作</span>
            </button>
            <button
              onClick={handleEndTraining}
              className="flex flex-col items-center gap-1 py-3 bg-white border border-slate-200 rounded-2xl active:scale-95 transition-transform"
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
    const metrics = calculateWorkoutMetrics(sessionExercises.map((se) => ({
      recordingMode: se.exercise.recording_mode,
      loadBasis: se.exercise.load_basis,
      countBasis: se.exercise.count_basis,
      loadDirection: se.exercise.load_direction,
      rateMetric: se.exercise.rate_metric,
      contextKind: se.exercise.context_kind ?? "none",
      sets: se.sets.map((set) => ({
        weight: set.weight,
        reps: set.reps,
        unit: set.unit,
        durationSec: set.duration_sec,
        distanceM: set.distance_m,
      })),
    })), weightUnit);
    const primaryMetric = formatWorkoutPrimaryMetric(sessionExercises.map((item) => item.exercise), metrics);
    const primaryMetricParts = splitMetricValue(primaryMetric.value);

    return (
      <div className="app-page bg-slate-50 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 h-14 flex items-center justify-between">
          <button
            onClick={handleResumeTraining}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="font-bold text-base text-slate-900">训练完成</h1>
          <div className="w-9" />
        </div>

        <div className="px-5 pt-4 space-y-4 pb-6">
          {/* Celebration banner */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl px-4 py-5 text-center shadow-md shadow-emerald-200">
            <p className="text-4xl mb-2">🌟</p>
            <p className="text-xl font-bold text-white">训练完成！</p>
            <p className="text-emerald-100 text-sm mt-1">你太棒了！</p>
            <div data-testid="celebration-stats" className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,0.75fr)_1px_minmax(0,1.35fr)] items-stretch gap-2 mt-4">
              <div className="min-w-0 text-center">
                <p className="text-2xl leading-7 font-bold text-white whitespace-nowrap">{formatTimer(totalSeconds)}</p>
                <p className="text-emerald-200 text-xs leading-4 mt-0.5 whitespace-nowrap">训练时长</p>
              </div>
              <div className="w-px h-full bg-white/20" />
              <div className="min-w-0 text-center">
                <p className="text-2xl leading-7 font-bold text-white whitespace-nowrap">{totalSets}</p>
                <p className="text-emerald-200 text-xs leading-4 mt-0.5 whitespace-nowrap">完成组数</p>
              </div>
              <div className="w-px h-full bg-white/20" />
              <div className="min-w-0 text-center">
                <p data-testid="celebration-primary-metric" className="font-bold text-white leading-7 tracking-tight whitespace-nowrap">
                  <span className="text-xl">{primaryMetricParts.amount}</span>
                  {primaryMetricParts.unit && <> <span className="text-sm font-semibold">{primaryMetricParts.unit}</span></>}
                </p>
                <p className="text-emerald-200 text-xs leading-4 mt-0.5 whitespace-nowrap">{primaryMetric.label}</p>
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
                const summary = formatExerciseCompletion(se.exercise, se.sets, weightUnit);
                return (
                  <div key={se.exercise.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900">{se.exercise.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{summary.detail}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-600 text-right ml-3 shrink-0">{summary.value}</span>
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

function mergePersistedIds(draft: SessionExercise[], saved: Workout): SessionExercise[] {
  return draft.map((exercise, index) => {
    const persisted = saved.exercises[index];
    if (!persisted) return exercise;
    return {
      ...exercise,
      id: persisted.id,
      sets: exercise.sets.map((set, setIndex) => ({ ...set, id: persisted.sets[setIndex]?.id || set.id })),
    };
  });
}

function DraftRecoveryDialog({ draft, onContinue, onStartFresh }: { draft: Workout; onContinue: () => void; onStartFresh: () => void }) {
  return (
    <div className="app-page bg-slate-50 flex items-center justify-center p-5">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-100 shadow-xl p-5 space-y-4">
        <div className="w-10 h-1 bg-emerald-400 rounded-full" />
        <div>
          <p className="text-lg font-bold text-slate-900">发现未结束的训练</p>
          <p className="text-sm text-slate-500 mt-1">{draft.date} · {draft.exercises.length} 个动作。选择继续将恢复原来的训练记录。</p>
        </div>
        <button onClick={onContinue} className="w-full py-3.5 bg-emerald-500 text-white rounded-2xl font-semibold">继续上次训练</button>
        <button onClick={onStartFresh} className="w-full py-3.5 bg-slate-100 text-slate-700 rounded-2xl font-semibold">新建训练</button>
        <p className="text-xs text-slate-400">新建训练会将旧草稿结束为最后一次记录时间，原有训练数据不会删除。</p>
      </div>
    </div>
  );
}

function saveErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "保存失败，请重试";
}
