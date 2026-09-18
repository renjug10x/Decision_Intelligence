'use client';

import React, { useEffect } from 'react';
import DecisionTraceView from './DecisionTraceView';

interface DecisionTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioId: string;
}

export default function DecisionTraceModal({ isOpen, onClose, scenarioId }: DecisionTraceModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="og-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Contextual Decision Trace"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="og-modal-container">
        <DecisionTraceView scenarioId={scenarioId} onClose={onClose} isModal={true} />
      </div>
    </div>
  );
}
