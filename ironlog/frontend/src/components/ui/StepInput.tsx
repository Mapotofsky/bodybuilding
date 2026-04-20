interface StepInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  step?: number;
  min?: number;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
}

export default function StepInput({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  placeholder = "0",
  inputMode = "decimal",
}: StepInputProps) {
  const numVal = parseFloat(value) || 0;

  const decrement = () => {
    const next = Math.max(min, parseFloat((numVal - step).toFixed(2)));
    onChange(String(next));
  };

  const increment = () => {
    const next = parseFloat((numVal + step).toFixed(2));
    onChange(String(next));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={decrement}
          className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xl font-medium hover:bg-slate-200 active:scale-95 transition-all"
        >
          −
        </button>
        <input
          type="number"
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 h-14 text-center text-3xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
        />
        <button
          type="button"
          onClick={increment}
          className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl font-medium hover:bg-emerald-600 active:scale-95 transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}
