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
  success: <CheckCircle size={18} className="text-green-500 shrink-0" />,
  error: <XCircle size={18} className="text-red-500 shrink-0" />,
  info: <Info size={18} className="text-blue-500 shrink-0" />,
};

const BG = {
  success: "bg-green-50 border-green-200",
  error: "bg-red-50 border-red-200",
  info: "bg-blue-50 border-blue-200",
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm animate-slide-down ${BG[t.type]}`}
        >
          {ICON[t.type]}
          <span className="flex-1 text-gray-800">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="text-gray-400 hover:text-gray-600 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
