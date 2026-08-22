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
import { CheckCircle2, CircleAlert, Loader2, PlayCircle, ShieldCheck } from 'lucide-react';
import { DecisionContract } from '@/packages/contracts/src/campaign-decision-contract-model';

const LINE = '#E2E8F0';
const SLATE = '#0F172A';
const MUTED = '#64748B';
const BLUE = '#2563EB';

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
  choices,
  selectedPlayId,
  resolvedBy,
  resolutionStatement,
  onSelectPlay,
  onResolvedByChange,
  onResolutionStatementChange,
  onActivate,
  onOpenFlight
}: {
  contract: DecisionContract | null;
  staleActivation: boolean;
  activating: boolean;
  error: string | null;
  readinessState?: string;
  /** Non-empty when the frontier could not select on declared constraints alone. */
  choices: ActivationChoice[];
  selectedPlayId: string;
  resolvedBy: string;
  resolutionStatement: string;
  onSelectPlay: (id: string) => void;
  onResolvedByChange: (v: string) => void;
  onResolutionStatementChange: (v: string) => void;
  onActivate: () => void;
  onOpenFlight: () => void;
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
          <div style={{ fontSize: '0.78rem', color: SLATE, fontWeight: 600, marginBottom: 4 }}>
            The declared constraints do not settle this on their own
          </div>
          <p style={{ fontSize: '0.76rem', color: MUTED, margin: '0 0 10px 0', lineHeight: 1.5 }}>
            More than one option survives, so the choice is a person&apos;s to make and is recorded as
            theirs. Who is deciding, why, and which option they are choosing all go on the contract.
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            <select
              value={selectedPlayId}
              onChange={e => onSelectPlay(e.target.value)}
              aria-label="Selected strategy play"
              style={{
                padding: '8px 10px',
                borderRadius: 7,
                border: `1px solid ${LINE}`,
                fontSize: '0.8rem',
                color: SLATE,
                background: '#FFFFFF'
              }}
            >
              <option value="">Choose the option being activated…</option>
              {choices.map(c => (
                <option key={c.play_id} value={c.play_id}>
                  {c.label}
                </option>
              ))}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              <input
                value={resolvedBy}
                onChange={e => onResolvedByChange(e.target.value)}
                placeholder="Who is deciding"
                aria-label="Who is deciding"
                style={{ padding: '8px 10px', borderRadius: 7, border: `1px solid ${LINE}`, fontSize: '0.8rem' }}
              />
              <input
                value={resolutionStatement}
                onChange={e => onResolutionStatementChange(e.target.value)}
                placeholder="Why this option"
                aria-label="Why this option"
                style={{ padding: '8px 10px', borderRadius: 7, border: `1px solid ${LINE}`, fontSize: '0.8rem' }}
              />
            </div>
          </div>
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
