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
    <div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-xs space-y-4 shadow-xl">
        <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={() => close(false)}
            className="flex-1 py-2.5 bg-gray-100 rounded-xl font-medium text-sm"
          >
            取消
          </button>
          <button
            onClick={() => close(true)}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium text-sm"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
