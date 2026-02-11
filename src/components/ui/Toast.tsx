"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

const alertClasses: Record<ToastType, string> = {
  success: "alert-success",
  error: "alert-error",
  info: "alert-info",
  warning: "alert-warning",
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export default function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="toast toast-end toast-bottom z-50">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`alert ${alertClasses[toast.type]} shadow-lg`}>
      <span>{toast.message}</span>
      <button onClick={onDismiss} className="btn btn-ghost btn-xs">✕</button>
    </div>
  );
}
