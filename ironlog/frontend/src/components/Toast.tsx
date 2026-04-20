import { useEffect } from "react";
import { create } from "zustand";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  add: (message: string, type?: ToastType) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type = "info") => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const ICON = {
  success: <CheckCircle size={16} className="text-emerald-500 shrink-0" />,
  error: <XCircle size={16} className="text-red-500 shrink-0" />,
  info: <Info size={16} className="text-sky-500 shrink-0" />,
};

const STYLE = {
  success: "bg-white border-emerald-200 shadow-emerald-100",
  error: "bg-white border-red-200 shadow-red-100",
  info: "bg-white border-sky-200 shadow-sky-100",
};

const DOT = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  info: "bg-sky-500",
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[92vw] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg text-sm animate-slide-down ${STYLE[t.type]}`}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[t.type]}`} />
          {ICON[t.type]}
          <span className="flex-1 text-slate-800 font-medium">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="text-slate-300 hover:text-slate-500 shrink-0 transition-colors"
            aria-label="关闭提示"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
