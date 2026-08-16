'use client';

import { useState, type CSSProperties } from 'react';
import {
  FileText,
  X,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { ExecutionBrief } from '@/packages/contracts/src/campaign-experiment-model';

interface ExecutionBriefModalProps {
  brief: ExecutionBrief;
  onClose: () => void;
}

export function ExecutionBriefModal({ brief, onClose }: ExecutionBriefModalProps) {
  const [provenanceOpen, setProvenanceOpen] = useState(false);
  const [handoffPrepared, setHandoffPrepared] = useState(false);
  const contributionIsNegative = brief.expected_impact.contribution_impact.trim().startsWith('-');

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
          maxWidth: 760,
          maxHeight: '90vh',
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
                Executive Execution Brief
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Ref: {brief.brief_id} · Generated {new Date(brief.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {brief.proposal.title}
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

        {/* Executive Summary Body */}
        <div style={{ padding: '20px 24px', display: 'grid', gap: 20 }}>
          {/* Proposing & Rationale */}
          <div
            style={{
              padding: '16px 18px',
              borderRadius: 10,
              background: 'var(--curiosity-light)',
              border: '1px solid #FED7AA'
            }}
          >
            <div style={{ fontSize: '0.6875rem', fontWeight: 650, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              What are we proposing?
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {brief.proposal.recommendation}
            </p>
            <div style={{ display: 'grid', gap: 6, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {brief.rationale.key_drivers.map((driver, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: 'var(--g10x-orange)', fontWeight: 700 }}>•</span>
                  <span>{driver}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expected Impact Matrix */}
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 650, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Expected Commercial Impact
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>Incremental Demand</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {brief.expected_impact.incremental_demand}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Attributable to intervention</div>
              </div>
              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>Contribution Impact</div>
                {/*
                  A contribution loss must not be printed in the colour of a gain, nor captioned
                  as a recovery. Both read off the formatted sign so the brief cannot present a
                  negative commercial outcome as a positive one.
                */}
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: contributionIsNegative ? 'var(--error, #DC2626)' : 'var(--success, #059669)'
                  }}
                >
                  {brief.expected_impact.contribution_impact}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  {contributionIsNegative ? 'Net contribution dilution' : 'Net contribution gain'}
                </div>
              </div>
              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>Operational Readiness</div>
                <div style={{ fontSize: '1rem', fontWeight: 650, color: 'var(--text-primary)' }}>
                  {brief.expected_impact.readiness_verdict}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Governance status</div>
              </div>
              <div style={metricCardStyle}>
                <div style={metricLabelStyle}>Primary Trade-Off</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {brief.expected_impact.trade_off_balance}
                </div>
              </div>
            </div>
          </div>

          {/* Operational Scope & Constraints Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Scope */}
            <div style={sectionBoxStyle}>
              <div style={sectionHeadingStyle}>Where & When?</div>
              <div style={{ display: 'grid', gap: 6, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <div><strong>Region:</strong> {brief.operational_scope.region}</div>
                <div><strong>Timing:</strong> {brief.operational_scope.timing}</div>
                <div><strong>Audience:</strong> {brief.operational_scope.audience}</div>
                <div><strong>Channel:</strong> {brief.operational_scope.channel}</div>
              </div>
            </div>

            {/* Constraints */}
            <div style={sectionBoxStyle}>
              <div style={sectionHeadingStyle}>Key Operational Constraints</div>
              <div style={{ display: 'grid', gap: 6, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {brief.material_constraints.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <AlertTriangle size={13} color="var(--warning, #D97706)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* What Could Change the Decision? */}
          <div style={sectionBoxStyle}>
            <div style={sectionHeadingStyle}>What could change this decision? (Leading Triggers)</div>
            <div style={{ display: 'grid', gap: 6, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {brief.decision_triggers.map((trigger, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}.</span>
                  <span>{trigger}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence Posture & Provenance Disclosure */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div>
              <strong>Evidence basis:</strong> {brief.evidence_and_trust.posture} · {brief.evidence_and_trust.synthetic_disclosure}
            </div>
            <button
              type="button"
              onClick={() => setProvenanceOpen(!provenanceOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--g10x-orange)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <ChevronRight size={13} style={{ transform: provenanceOpen ? 'rotate(90deg)' : undefined }} />
              Technical provenance
            </button>
          </div>

          {/* Collapsible Technical Provenance */}
          {provenanceOpen && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: '#F8FAFC',
                border: '1px solid var(--border)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                display: 'grid',
                gap: 4
              }}
            >
              <div><strong>Experiment ID:</strong> <code>{brief.experiment_id}</code></div>
              <div><strong>Campaign Intent Ref:</strong> <code>{brief.technical_provenance.intent_id || '—'}</code></div>
              <div><strong>Decision Contract Ref:</strong> <code>{brief.technical_provenance.contract_id || '—'}</code></div>
              <div><strong>Schema Version:</strong> <code>{brief.technical_provenance.schema_version || '1.0'}</code></div>
              <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                Analysis computed by governed CDI engines (CDI-02 assessment, CDI-03 opportunity, CDI-04 readiness, CDI-05 timeline, CDI-06 frontier).
              </div>
            </div>
          )}
        </div>

        {/* Footer / Next Step */}
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
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 450 }}>
            {brief.next_step.execution_boundary_notice}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: '#FFFFFF',
                color: 'var(--text-secondary)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => setHandoffPrepared(true)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: handoffPrepared ? 'var(--success, #059669)' : 'var(--g10x-orange)',
                color: '#FFFFFF',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {handoffPrepared ? (
                <>
                  <CheckCircle2 size={14} />
                  Handoff Packaged
                </>
              ) : (
                <>
                  <ArrowRight size={14} />
                  {brief.next_step.action}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const metricCardStyle: CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4
};

const metricLabelStyle: CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--text-muted)'
};

const sectionBoxStyle: CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '12px 16px'
};

const sectionHeadingStyle: CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 650,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 8
};
