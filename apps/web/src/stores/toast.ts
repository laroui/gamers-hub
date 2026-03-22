import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number; // ms, default 3000
}

interface ToastStore {
  toasts: Toast[];
  add: (toast: Omit<Toast, "id">) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    // Auto-dismiss
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, toast.duration ?? 3000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

function makeToast(
  add: ToastStore["add"],
  variant: ToastVariant,
  message: string,
  duration?: number,
): void {
  const t: Omit<Toast, "id"> = { message, variant };
  if (duration !== undefined) t.duration = duration;
  add(t);
}

export function useToast() {
  const add = useToastStore((s) => s.add);
  return {
    success: (message: string, duration?: number) => makeToast(add, "success", message, duration),
    error:   (message: string, duration?: number) => makeToast(add, "error",   message, duration),
    info:    (message: string, duration?: number) => makeToast(add, "info",    message, duration),
    warning: (message: string, duration?: number) => makeToast(add, "warning", message, duration),
  };
}
