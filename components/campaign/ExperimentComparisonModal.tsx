'use client';

import { useState, type CSSProperties } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Scale,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ExperimentComparison } from '@/packages/contracts/src/campaign-experiment-model';

interface ExperimentComparisonModalProps {
  comparison: ExperimentComparison;
  onClose: () => void;
  onSelectExperiment?: (experimentId: string) => void;
}

export function ExperimentComparisonModal({
  comparison,
  onClose,
  onSelectExperiment
}: ExperimentComparisonModalProps) {
  const { experiment_a, experiment_b, dimensions, synthesis } = comparison;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid var(--border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: 880,
          maxHeight: '92vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 650,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--g10x-orange)',
                  background: 'var(--curiosity-light)',
                  padding: '3px 8px',
                  borderRadius: 6
                }}
              >
                Decision Comparison
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Comparing {experiment_a.experiment_id} vs {experiment_b.experiment_id}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {synthesis.headline}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4,
              borderRadius: 6
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Synthesis: What Changed & Why It Matters */}
        <div style={{ padding: '20px 24px 12px', display: 'grid', gap: 14 }}>
          <div
            style={{
              padding: '16px 18px',
              borderRadius: 10,
              background: 'var(--curiosity-light)',
              border: '1px solid #FED7AA',
              display: 'grid',
              gap: 10
            }}
          >
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 650, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                What changed?
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {synthesis.what_changed}
              </p>
            </div>

            <div style={{ borderTop: '1px dashed #FDBA74', paddingTop: 8 }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 650, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                Why it matters
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 550, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {synthesis.why_it_matters}
              </p>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison Table */}
        <div style={{ padding: '12px 24px 20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '26%' }}>
                  Dimension
                </th>
                <th style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: 700, width: '37%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{experiment_a.experiment_id}</span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                      ({new Date(experiment_a.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                    </span>
                    {synthesis.stronger_experiment_id === experiment_a.experiment_id && (
                      <span style={strongerBadgeStyle}>Stronger Commercial Outcome</span>
                    )}
                  </div>
                </th>
                <th style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: 700, width: '37%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{experiment_b.experiment_id}</span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                      ({new Date(experiment_b.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                    </span>
                    {synthesis.stronger_experiment_id === experiment_b.experiment_id && (
                      <span style={strongerBadgeStyle}>Stronger Commercial Outcome</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {dimensions.map((dim, idx) => {
                const isFocal = dim.is_focal_difference;
                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: isFocal ? 'rgba(254, 243, 199, 0.25)' : idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {dim.dimension}
                      {dim.difference_summary && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--g10x-orange)', fontWeight: 550 }}>
                          {dim.difference_summary}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: isFocal ? 600 : 400 }}>
                      {dim.experiment_a_value}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: isFocal ? 600 : 400 }}>
                      {dim.experiment_b_value}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            background: '#F8FAFC',
            borderRadius: '0 0 14px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Comparing preserved decision hypotheses. No active session state has been modified.
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: '#FFFFFF',
              color: 'var(--text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}

const strongerBadgeStyle: CSSProperties = {
  fontSize: '0.625rem',
  fontWeight: 650,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--success, #059669)',
  background: '#ECFDF5',
  border: '1px solid #A7F3D0',
  padding: '2px 6px',
  borderRadius: 4
};
