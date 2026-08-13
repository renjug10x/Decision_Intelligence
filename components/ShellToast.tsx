'use client';
import { useState, useEffect } from 'react';
import { Info, Sparkles, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'coming_soon' | 'success';
  teaser?: string;
  actionText?: string;
  onAction?: () => void;
}

interface ShellToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export default function ShellToast({ toast, onClose }: ShellToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        width: 360,
        maxWidth: 'calc(100vw - 48px)',
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--g10x-orange)',
        borderRadius: 8,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: '#FFF7ED',
            color: 'var(--g10x-orange)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Sparkles size={14} />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {toast.title}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close notification"
          style={{
            background: 'none',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
            color: 'var(--text-muted)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={14} />
        </button>
      </div>

      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
        {toast.message}
      </p>

      {toast.teaser && (
        <div style={{
          background: '#F8FAFC',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '8px 10px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          fontStyle: 'italic',
          lineHeight: 1.4
        }}>
          "{toast.teaser}"
        </div>
      )}

      {toast.actionText && toast.onAction && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
          <button
            onClick={() => {
              toast.onAction?.();
              onClose();
            }}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--g10x-orange)',
              cursor: 'pointer'
            }}
          >
            {toast.actionText}
          </button>
        </div>
      )}
    </div>
  );
}
