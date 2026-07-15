interface StepInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
}

export default function StepInput({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  placeholder = "0",
  inputMode = "decimal",
}: StepInputProps) {
  const parsedValue = parseFloat(value);
  const numVal = Number.isFinite(parsedValue) ? parsedValue : min === 0 ? 0 : min - step;

  const clamp = (next: number) => Math.min(max ?? Infinity, Math.max(min, next));
  const formatValue = (next: number) => String(parseFloat(clamp(next).toFixed(2)));

  const decrement = () => {
    onChange(formatValue(numVal - step));
  };

  const increment = () => {
    onChange(formatValue(numVal + step));
  };

  const isAtMin = numVal <= min;
  const isAtMax = max !== undefined && numVal >= max;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </span>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={decrement}
          disabled={isAtMin}
          aria-label={`减少${label}`}
          className="w-11 h-11 shrink-0 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xl font-medium hover:bg-slate-200 active:scale-95 disabled:opacity-40 disabled:active:scale-100 transition-all"
        >
          −
        </button>
        <input
          type="text"
          aria-label={label}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className="w-full min-w-0 h-14 text-center text-3xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
        />
        <button
          type="button"
          onClick={increment}
          disabled={isAtMax}
          aria-label={`增加${label}`}
          className="w-11 h-11 shrink-0 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl font-medium hover:bg-emerald-600 active:scale-95 disabled:opacity-40 disabled:active:scale-100 transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}
