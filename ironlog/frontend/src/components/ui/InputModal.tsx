import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface InputModalProps {
  open: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function InputModal({
  open,
  title,
  placeholder = "",
  defaultValue = "",
  confirmLabel = "确定",
  onConfirm,
  onCancel,
}: InputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, defaultValue]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl p-6 space-y-4 animate-slide-up md:max-w-[768px]">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg text-slate-900">{title}</h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onConfirm(value.trim());
          }}
          placeholder={placeholder}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
        />

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 rounded-xl font-medium text-sm text-slate-700"
          >
            取消
          </button>
          <button
            onClick={() => value.trim() && onConfirm(value.trim())}
            disabled={!value.trim()}
            className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium text-sm disabled:opacity-40 hover:bg-emerald-600 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
