interface MinutesSecondsInputProps {
  label: string;
  value: string;
  onChange: (seconds: string) => void;
  compact?: boolean;
}

export function splitSeconds(value: string): { minutes: string; seconds: string } {
  if (value.trim() === "") return { minutes: "", seconds: "" };
  const total = Number(value);
  if (!Number.isInteger(total) || total < 0) return { minutes: "", seconds: "" };
  return { minutes: String(Math.floor(total / 60)), seconds: String(total % 60) };
}

export function joinMinutesSeconds(minutes: string, seconds: string): string | null {
  if (minutes === "" && seconds === "") return "";
  if ((minutes !== "" && !/^\d+$/.test(minutes)) || (seconds !== "" && !/^\d+$/.test(seconds))) return null;
  const minuteValue = minutes === "" ? 0 : Number(minutes);
  const secondValue = seconds === "" ? 0 : Number(seconds);
  if (secondValue > 59 || minuteValue * 60 + secondValue > 86400) return null;
  return String(minuteValue * 60 + secondValue);
}

export default function MinutesSecondsInput({ label, value, onChange, compact = false }: MinutesSecondsInputProps) {
  const parts = splitSeconds(value);
  const update = (minutes: string, seconds: string) => {
    const next = joinMinutesSeconds(minutes, seconds);
    if (next !== null) onChange(next);
  };

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium app-text-muted">{label}</span>
        {value !== "" && <button type="button" onClick={() => onChange("")} className="text-xs app-text-muted">清空</button>}
      </div>
      <div className="grid grid-cols-2 gap-2 min-w-0 mt-1">
        {(["minutes", "seconds"] as const).map((part) => (
          <label key={part} className="flex items-center gap-1 min-w-0">
            <input
              type="text"
              inputMode="numeric"
              aria-label={`${label}（${part === "minutes" ? "分" : "秒"}）`}
              value={parts[part]}
              onChange={(event) => update(part === "minutes" ? event.target.value : parts.minutes, part === "seconds" ? event.target.value : parts.seconds)}
              placeholder="0"
              className={`w-full min-w-0 text-center font-semibold app-text bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400 ${compact ? "h-10 text-sm" : "h-14 text-2xl"}`}
            />
            <span className="text-xs app-text-muted shrink-0">{part === "minutes" ? "分" : "秒"}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
