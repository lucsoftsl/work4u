"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type ToastTone = "info" | "success" | "error";

export interface ToastInput {
  message: string;
  tone?: ToastTone;
  /** Optional action, e.g. "Open" or "Undo". */
  action?: { label: string; onClick: () => void };
  /** ms; default 5000. Paused while hovered or focused. */
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextValue {
  push: (toast: ToastInput) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS = { info: Info, success: CheckCircle2, error: AlertTriangle } as const;

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const { t } = useTranslation();
  const [paused, setPaused] = useState(false);
  const Icon = ICONS[toast.tone ?? "info"];

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(onDismiss, toast.duration ?? 5000);
    return () => clearTimeout(timer);
  }, [paused, toast.duration, onDismiss]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full items-center gap-3 rounded-card bg-ink px-4 py-3 text-surface shadow-raised motion-safe:animate-toast-in"
    >
      <Icon className={cn("h-5 w-5 shrink-0", toast.tone === "error" ? "text-danger-soft" : "text-surface")} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-label font-normal">{toast.message}</p>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className="min-h-[44px] shrink-0 rounded-control px-3 text-label font-bold text-primary-soft underline underline-offset-2 hover:text-surface"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("common.dismiss")}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-surface hover:bg-surface/10"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((toast) => toast.id !== id)), []);
  const push = useCallback((toast: ToastInput) => {
    setToasts((prev) => [...prev.slice(-2), { ...toast, id: nextId.current++ }]);
  }, []);
  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+0.75rem)] z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:w-[400px] md:items-stretch"
      >
        {toasts.map((toast) => (
          <ToastView key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
