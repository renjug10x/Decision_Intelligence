'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastInput {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastItem extends Required<ToastInput> {
  id: number;
}

interface ToastContextType {
  showToast: (t: ToastInput) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((t: ToastInput) => {
    const id = ++toastId;
    const item: ToastItem = {
      id,
      message: t.message,
      type: t.type ?? 'info',
      duration: t.duration ?? 3500,
    };
    setToasts((prev) => [...prev, item]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, item.duration);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 360,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            style={{
              pointerEvents: 'auto',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 600,
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-strong)',
              background:
                t.type === 'success'
                  ? 'var(--success-light)'
                  : t.type === 'error'
                    ? 'var(--danger-light)'
                    : 'var(--bg-elevated)',
              color: t.type === 'error' ? 'var(--danger)' : 'var(--text-primary)',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
