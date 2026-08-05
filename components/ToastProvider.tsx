"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Info, X, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";
type Toast = { id: number; type: ToastType; title: string; message?: string };
type ToastInput = { type?: ToastType; title: string; message?: string; duration?: number };

const ToastContext = createContext<{ showToast: (input: ToastInput) => void } | null>(null);

const META = {
  success: { Icon: Check, label: "موفق" }, error: { Icon: XCircle, label: "ناموفق" },
  warning: { Icon: AlertTriangle, label: "هشدار" }, info: { Icon: Info, label: "اطلاع" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const showToast = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-2), { id, type: input.type ?? "success", title: input.title, message: input.message }]);
    window.setTimeout(() => dismiss(id), input.duration ?? 3800);
  }, [dismiss]);
  const value = useMemo(() => ({ showToast }), [showToast]);

  return <ToastContext.Provider value={value}>
    {children}
    <div className="toast-viewport" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const { Icon, label } = META[toast.type];
          return <motion.div key={toast.id} className={`motion-toast is-${toast.type}`}
            initial={{ opacity: 0, y: 24, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: -30, scale: .96 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}>
            <div className="toast-icon"><motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: .12, type: "spring" }}><Icon size={18} /></motion.span><i /></div>
            <div className="toast-copy"><small>{label}</small><b>{toast.title}</b>{toast.message && <p>{toast.message}</p>}</div>
            <button onClick={() => dismiss(toast.id)} aria-label="بستن اعلان"><X size={15} /></button>
            <motion.div className="toast-progress" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: (inputDuration(toast) / 1000), ease: "linear" }} />
          </motion.div>;
        })}
      </AnimatePresence>
    </div>
  </ToastContext.Provider>;
}

function inputDuration(_: Toast) { return 3800; }

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
