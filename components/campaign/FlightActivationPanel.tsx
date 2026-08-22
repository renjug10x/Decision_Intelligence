'use client';

/**
 * CTW-01 — Review and Activate.
 *
 * The transition the Promotion surface did not have: `Pre-flight Decision Intelligence →
 * Review → Activate → Campaign in flight`. Activation does not create a baseline of its own —
 * it registers the intent, evaluates the outcome frontier and creates an `ACTIVE` CDI-07A
 * `DecisionContract`, which *is* the governed baseline (ADR-070). Everything the in-flight
 * view later assesses is read against that contract.
 */

import React from 'react';
import {
  CheckCircle2,
  CircleAlert,
  History,
  Loader2,
  PlayCircle,
  Plus,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { DecisionContract } from '@/packages/contracts/src/campaign-decision-contract-model';
import {
  DECISION_CONFIRMATION_EXPLANATION,
  DECISION_OWNER_HELPER,
  DECISION_OWNER_ROLES,
  DECISION_RATIONALES,
  DECISION_RATIONALE_HELPER,
  PromotionExperimentStatus
} from '@/packages/contracts/src/campaign-continuous-timeline-model';

const LINE = '#E2E8F0';
const SLATE = '#0F172A';
const MUTED = '#64748B';
const BLUE = '#2563EB';

const secondaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 7,
  border: `1px solid ${LINE}`,
  background: '#FFFFFF',
  color: SLATE,
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer'
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 7,
  border: `1px solid ${LINE}`,
  fontSize: '0.8rem',
  color: SLATE,
  background: '#FFFFFF',
  marginTop: 4
};

export interface ActivationChoice {
  play_id: string;
  label: string;
}

export default function FlightActivationPanel({
  contract,
  staleActivation,
  activating,
  error,
  readinessState,
  stage,
  choices,
  selectedPlayId,
  ownerRoleId,
  ownerCustom,
  rationaleId,
  rationaleContext,
  onSelectPlay,
  onOwnerRoleChange,
  onOwnerCustomChange,
  onRationaleChange,
  onRationaleContextChange,
  onActivate,
  onOpenFlight,
  onNewExperiment,
  onOpenHistory
}: {
  contract: DecisionContract | null;
  staleActivation: boolean;
  activating: boolean;
  error: string | null;
  readinessState?: string;
  stage: PromotionExperimentStatus;
  /** Non-empty when the frontier could not select on declared constraints alone. */
  choices: ActivationChoice[];
  selectedPlayId: string;
  ownerRoleId: string;
  ownerCustom: string;
  rationaleId: string;
  rationaleContext: string;
  onSelectPlay: (id: string) => void;
  onOwnerRoleChange: (v: string) => void;
  onOwnerCustomChange: (v: string) => void;
  onRationaleChange: (v: string) => void;
  onRationaleContextChange: (v: string) => void;
  onActivate: () => void;
  onOpenFlight: () => void;
  onNewExperiment: () => void;
  onOpenHistory: () => void;
}) {
  const active = contract !== null && contract.status === 'ACTIVE' && !staleActivation;

  return (
    <div
      style={{
        background: active ? '#F0FDF4' : '#FFFFFF',
        border: `1px solid ${active ? '#BBF7D0' : LINE}`,
        borderRadius: 12,
        padding: '18px 20px',
        marginBottom: 24
      }}
    >
      {/* ── Promotion experiment lifecycle — stage and the two lifecycle actions ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 14,
          paddingBottom: 12,
          borderBottom: `1px solid ${active ? '#BBF7D0' : LINE}`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#3730A3',
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              padding: '3px 9px',
              borderRadius: 4
            }}
          >
            {stage.label}
          </span>
          <span style={{ fontSize: '0.76rem', color: MUTED }}>{stage.detail}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onOpenHistory}
            style={secondaryButtonStyle}
          >
            <History size={13} /> Previous experiments
          </button>
          <button
            type="button"
            onClick={onNewExperiment}
            style={secondaryButtonStyle}
          >
            <Plus size={13} /> New promotion experiment
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 260, flex: 1 }}>
          {active ? (
            <CheckCircle2 size={19} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
          ) : (
            <ShieldCheck size={19} color={BLUE} style={{ flexShrink: 0, marginTop: 1 }} />
          )}
          <div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: SLATE, margin: 0 }}>
              {active ? 'Decision activated — campaign in flight' : 'Review and activate this decision'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: active ? '#166534' : MUTED, margin: '4px 0 0 0', lineHeight: 1.5 }}>
              {active
                ? 'The in-flight view is assessed against this contract. Its basis is immutable, so what was expected cannot drift once the campaign starts.'
                : 'Activation records this decision as a governed contract and establishes the baseline the campaign is then measured against. Nothing runs until it is activated.'}
            </p>
          </div>
        </div>

        {active ? (
          <button
            type="button"
            onClick={onOpenFlight}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#059669',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <PlayCircle size={15} /> Open campaign in flight
          </button>
        ) : (
          <button
            type="button"
            onClick={onActivate}
            disabled={activating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 16px',
              borderRadius: 8,
              border: 'none',
              background: activating ? '#93C5FD' : BLUE,
              color: '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: activating ? 'default' : 'pointer'
            }}
          >
            {activating ? <Loader2 size={15} className="atlas-spin" /> : <PlayCircle size={15} />}
            {activating ? 'Activating…' : 'Approve & activate'}
          </button>
        )}
      </div>

      {staleActivation && contract && (
        <div
          style={{
            marginTop: 12,
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 8,
            padding: '10px 12px',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start'
          }}
        >
          <CircleAlert size={15} color="#B45309" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: '0.78rem', color: '#92400E', lineHeight: 1.5 }}>
            The configuration has changed since this decision was activated. The in-flight view is not
            shown, because it would assess the running campaign against a decision that was never taken.
            Activate again to establish a baseline for the current configuration.
          </span>
        </div>
      )}

      {!active && choices.length > 0 && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
            <UserCheck size={15} color={BLUE} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: '0.82rem', color: SLATE, fontWeight: 700 }}>
                Confirm this decision
              </div>
              <p style={{ fontSize: '0.78rem', color: MUTED, margin: '3px 0 0 0', lineHeight: 1.5 }}>
                {DECISION_CONFIRMATION_EXPLANATION}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'block' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: SLATE }}>
                Option being activated
              </span>
              <select
                value={selectedPlayId}
                onChange={e => onSelectPlay(e.target.value)}
                aria-label="Option being activated"
                style={fieldStyle}
              >
                <option value="">Choose the option being activated…</option>
                {choices.map(c => (
                  <option key={c.play_id} value={c.play_id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: SLATE }}>Decision owner</span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: MUTED, margin: '2px 0 4px 0' }}>
                  {DECISION_OWNER_HELPER}
                </span>
                <select
                  value={ownerRoleId}
                  onChange={e => onOwnerRoleChange(e.target.value)}
                  aria-label="Decision owner"
                  style={fieldStyle}
                >
                  <option value="">Select a role…</option>
                  {DECISION_OWNER_ROLES.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {ownerRoleId === 'OTHER' && (
                  <input
                    value={ownerCustom}
                    onChange={e => onOwnerCustomChange(e.target.value)}
                    placeholder="Name the accountable role"
                    aria-label="Decision owner, other"
                    style={{ ...fieldStyle, marginTop: 6 }}
                  />
                )}
              </label>

              <label style={{ display: 'block' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: SLATE }}>Decision rationale</span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: MUTED, margin: '2px 0 4px 0' }}>
                  {DECISION_RATIONALE_HELPER}
                </span>
                <select
                  value={rationaleId}
                  onChange={e => onRationaleChange(e.target.value)}
                  aria-label="Decision rationale"
                  style={fieldStyle}
                >
                  <option value="">Select a reason…</option>
                  {DECISION_RATIONALES.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <input
                  value={rationaleContext}
                  onChange={e => onRationaleContextChange(e.target.value)}
                  placeholder={rationaleId === 'OTHER' ? 'State the reason' : 'Add context (optional)'}
                  aria-label="Decision rationale context"
                  style={{ ...fieldStyle, marginTop: 6 }}
                />
              </label>
            </div>
          </div>

          <p style={{ fontSize: '0.7rem', color: MUTED, margin: '10px 0 0 0', lineHeight: 1.5 }}>
            Both answers are recorded on the decision contract as its human resolution, so the campaign
            can always be traced back to who approved it and why.
          </p>
        </div>
      )}

      {active && contract && (
        <div
          style={{
            marginTop: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
            fontSize: '0.74rem'
          }}
        >
          <div>
            <div style={{ color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.66rem' }}>
              Decision contract
            </div>
            <code style={{ color: SLATE, wordBreak: 'break-all' }}>{contract.contract_id.slice(0, 16)}…</code>
          </div>
          <div>
            <div style={{ color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.66rem' }}>
              Decision basis digest
            </div>
            <code style={{ color: SLATE, wordBreak: 'break-all' }}>
              {contract.decision_basis_digest.slice(0, 16)}…
            </code>
          </div>
          <div>
            <div style={{ color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.66rem' }}>
              Status
            </div>
            <span style={{ color: SLATE, fontWeight: 600 }}>{contract.status}</span>
          </div>
          {readinessState && (
            <div>
              <div style={{ color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.66rem' }}>
                Readiness at activation
              </div>
              <span style={{ color: SLATE, fontWeight: 600 }}>{readinessState}</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 12,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: '10px 12px',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start'
          }}
        >
          <CircleAlert size={15} color="#B91C1C" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: '0.78rem', color: '#991B1B', lineHeight: 1.5 }}>{error}</span>
        </div>
      )}
    </div>
  );
}
