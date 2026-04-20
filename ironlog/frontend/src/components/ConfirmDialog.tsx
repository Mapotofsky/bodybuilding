import { create } from "zustand";

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  resolve: ((value: boolean) => void) | null;
  show: (title: string, message: string) => Promise<boolean>;
  close: (result: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  title: "",
  message: "",
  resolve: null,
  show: (title, message) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, title, message, resolve });
    }),
  close: (result) => {
    const { resolve } = get();
    resolve?.(result);
    set({ open: false, title: "", message: "", resolve: null });
  },
}));

export default function ConfirmDialog() {
  const { open, title, message, close } = useConfirmStore();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => close(false)}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl p-6 space-y-5 shadow-2xl animate-slide-up md:max-w-[768px]">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
        <div className="space-y-1.5">
          <h3 className="font-semibold text-lg text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => close(false)}
            className="flex-1 py-3.5 bg-slate-100 rounded-2xl font-medium text-sm text-slate-700 hover:bg-slate-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => close(true)}
            className="flex-1 py-3.5 bg-red-500 text-white rounded-2xl font-semibold text-sm hover:bg-red-600 transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
