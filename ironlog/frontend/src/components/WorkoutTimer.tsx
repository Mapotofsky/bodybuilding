import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Square, Timer, RotateCcw } from "lucide-react";

interface WorkoutTimerProps {
  onTimeUpdate?: (startTime: string, endTime: string | null) => void;
  /** If provided, resumes from this ISO start time */
  initialStartTime?: string | null;
}

type TimerState = "idle" | "running" | "paused";

export default function WorkoutTimer({
  onTimeUpdate,
  initialStartTime,
}: WorkoutTimerProps) {
  const [state, setState] = useState<TimerState>(
    initialStartTime ? "running" : "idle"
  );
  const [elapsed, setElapsed] = useState(0); // seconds
  const [startTime, setStartTime] = useState<string | null>(
    initialStartTime || null
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0); // ms timestamp when timer started/resumed
  const accumulatedRef = useRef<number>(0); // accumulated ms before pause

  // Initialize from existing start time
  useEffect(() => {
    if (initialStartTime && state === "running") {
      const start = new Date(initialStartTime).getTime();
      accumulatedRef.current = Date.now() - start;
      setElapsed(Math.floor(accumulatedRef.current / 1000));
      startRef.current = Date.now();
    }
  }, []);

  const tick = useCallback(() => {
    const now = Date.now();
    const total = accumulatedRef.current + (now - startRef.current);
    setElapsed(Math.floor(total / 1000));
  }, []);

  useEffect(() => {
    if (state === "running") {
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state, tick]);

  const handleStart = () => {
    const now = new Date();
    setStartTime(now.toISOString());
    startRef.current = Date.now();
    accumulatedRef.current = 0;
    setState("running");
    onTimeUpdate?.(now.toISOString(), null);
  };

  const handlePause = () => {
    accumulatedRef.current += Date.now() - startRef.current;
    setState("paused");
  };

  const handleResume = () => {
    startRef.current = Date.now();
    setState("running");
  };

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const endTime = new Date().toISOString();
    setState("idle");
    if (startTime) {
      onTimeUpdate?.(startTime, endTime);
    }
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState("idle");
    setElapsed(0);
    setStartTime(null);
    accumulatedRef.current = 0;
  };

  const formatTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Compact bar when running
  if (state === "running" || state === "paused") {
    return (
      <div className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl px-4 py-3">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            state === "running" ? "bg-green-500 animate-pulse" : "bg-yellow-500"
          }`}
        />
        <div className="flex-1">
          <p className="text-xs text-gray-500">
            {state === "running" ? "训练进行中" : "已暂停"}
          </p>
          <p className="text-xl font-mono font-bold text-gray-900 tabular-nums">
            {formatTime(elapsed)}
          </p>
        </div>
        <div className="flex gap-1.5">
          {state === "running" ? (
            <button
              onClick={handlePause}
              className="w-9 h-9 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center hover:bg-yellow-200 transition"
            >
              <Pause size={16} />
            </button>
          ) : (
            <button
              onClick={handleResume}
              className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition"
            >
              <Play size={16} />
            </button>
          )}
          <button
            onClick={handleStop}
            className="w-9 h-9 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition"
          >
            <Square size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Idle state — show start button
  if (elapsed > 0) {
    // Timer was stopped, show result
    return (
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
        <Timer size={18} className="text-gray-400" />
        <div className="flex-1">
          <p className="text-xs text-gray-500">训练时长</p>
          <p className="text-lg font-mono font-bold text-gray-900 tabular-nums">
            {formatTime(elapsed)}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleStart}
      className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 w-full hover:bg-green-100 transition"
    >
      <div className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center">
        <Play size={16} className="ml-0.5" />
      </div>
      <div className="text-left">
        <p className="text-sm font-medium text-green-800">开始计时</p>
        <p className="text-xs text-green-600">记录训练时长</p>
      </div>
    </button>
  );
}
