'use client';

/**
 * CTW-02 — Campaign Outlook and Decision Moments.
 *
 * Optimised for one reader: a Promotion Analyst who wants to know what needs attention, when action
 * may be required, why it matters, what CogniX recommends, and what they can prepare now. Every
 * number and every sentence here is derived in the engine from the governed forecast, the observed
 * deviation and the declared uncertainty — this component renders and never computes.
 */

import React, { useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, Clock, Compass, Info, Loader2, ShieldAlert } from 'lucide-react';
import {
  CampaignOutlook,
  DecisionMoment,
  InterventionPreview,
  PlannedIntervention,
  DEFAULT_INTERVENTION_MODE,
  PlannedInterventionMode,
  AUTOMATIC_EXECUTION_DISCLOSURE,
  ReassessmentVerdict
} from '@/packages/contracts/src/campaign-intervention-model';
import { DECISION_OWNER_ROLES } from '@/packages/contracts/src/campaign-continuous-timeline-model';

const LINE = '#E2E8F0';
const SLATE = '#0F172A';
const MUTED = '#64748B';
const BLUE = '#2563EB';

const ACTION_STYLE: Record<CampaignOutlook['current_action'], { bg: string; border: string; text: string; label: string }> = {
  MONITOR: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', label: 'Monitor' },
  PREPARE: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', label: 'Prepare' },
  REVIEW: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', label: 'Review now' }
};

const field: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 7,
  border: `1px solid ${LINE}`,
  fontSize: '0.8rem',
  color: SLATE,
  background: '#FFFFFF',
  marginTop: 4
};

export default function CampaignOutlookPanel({
  outlook,
  moments,
  note,
  plans,
  contractId,
  preview,
  previewingMomentId,
  busy,
  error,
  onSelectMoment,
  onPlan,
  onReassess,
  onConfirm
}: {
  outlook: CampaignOutlook;
  moments: DecisionMoment[];
  note: string | null;
  plans: PlannedIntervention[];
  /** A plan belongs to the decision it was made against — never to a later one. */
  contractId: string;
  preview: InterventionPreview | null;
  previewingMomentId: string | null;
  busy: boolean;
  error: string | null;
  onSelectMoment: (m: DecisionMoment) => void;
  onPlan: (m: DecisionMoment, mode: PlannedInterventionMode, owner: string, rationale: string) => void;
  onReassess: (p: PlannedIntervention, decision?: ReassessmentVerdict) => void;
  onConfirm: (p: PlannedIntervention, owner: string, statement: string) => void;
}) {
  const [openMoment, setOpenMoment] = useState<string | null>(null);
  const [mode, setMode] = useState<PlannedInterventionMode>(DEFAULT_INTERVENTION_MODE);
  const [owner, setOwner] = useState('');
  const [rationale, setRationale] = useState('');
  const [confirmOwner, setConfirmOwner] = useState('');
  const [confirmStatement, setConfirmStatement] = useState('');

  const style = ACTION_STYLE[outlook.current_action];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
      {/* ── Campaign Outlook ── */}
      <div style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 12, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', flex: 1, minWidth: 260 }}>
            <Compass size={18} color={BLUE} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: SLATE, margin: 0 }}>Campaign outlook</h3>
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: '5px 0 0 0', lineHeight: 1.55 }}>{outlook.headline}</p>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: style.text,
              background: style.bg,
              border: `1px solid ${style.border}`,
              padding: '4px 10px',
              borderRadius: 5,
              whiteSpace: 'nowrap'
            }}
          >
            {style.label}
          </span>
        </div>

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: '0.66rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Next decision</div>
            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: SLATE, marginTop: 4 }}>
              {outlook.next_decision ?? 'None identified'}
            </div>
          </div>
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: '0.66rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Decision window</div>
            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: SLATE, marginTop: 4 }}>{outlook.decision_window}</div>
          </div>
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: '0.66rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current action</div>
            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: style.text, marginTop: 4 }}>{style.label}</div>
          </div>
        </div>

        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: '0.72rem', color: MUTED, cursor: 'pointer' }}>What this reads</summary>
          <ul style={{ fontSize: '0.72rem', color: MUTED, margin: '6px 0 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
            {outlook.basis.map(b => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </details>
      </div>

      {note && (
        <div style={{ background: '#F8FAFC', border: `1px solid ${LINE}`, borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 8 }}>
          <Info size={15} color={MUTED} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: '0.78rem', color: MUTED, lineHeight: 1.5 }}>{note}</span>
        </div>
      )}

      {/* ── Decision Moments ── */}
      {moments.map(m => {
        const open = openMoment === m.moment_id;
        // Moment ids are derived from the campaign day, so they repeat across decisions. A plan is
        // only this moment's if it was made against the decision currently activated; otherwise a
        // plan from a previous activation would attach itself to a campaign it was never about.
        const plan = plans.find(
          p => p.moment_id === m.moment_id && p.contract_id === contractId && p.status !== 'CANCELLED'
        );
        const material = m.severity === 'MATERIAL';
        return (
          <div
            key={m.moment_id}
            style={{
              background: '#FFFFFF',
              border: `1px solid ${material ? '#FDE68A' : LINE}`,
              borderRadius: 12,
              padding: '16px 18px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', flex: 1, minWidth: 260 }}>
                {material ? (
                  <ShieldAlert size={17} color="#B45309" style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <Clock size={17} color={MUTED} style={{ flexShrink: 0, marginTop: 2 }} />
                )}
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: SLATE }}>{m.headline}</div>
                  <p style={{ fontSize: '0.81rem', color: '#334155', margin: '4px 0 0 0', lineHeight: 1.55 }}>{m.issue}</p>
                  <p style={{ fontSize: '0.81rem', color: MUTED, margin: '4px 0 0 0', lineHeight: 1.55 }}>{m.expected_consequence}</p>
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: material ? '#92400E' : MUTED,
                  border: `1px solid ${material ? '#FDE68A' : LINE}`,
                  padding: '3px 8px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap'
                }}
              >
                {material ? 'Material' : 'Watch'}
              </span>
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <CalendarClock size={14} color={MUTED} />
              <span style={{ fontSize: '0.78rem', color: m.window.available ? SLATE : '#92400E', fontWeight: 600 }}>
                {m.window.statement}
              </span>
              {m.window.delay_cost && (
                <span style={{ fontSize: '0.74rem', color: MUTED }}>· {m.window.delay_cost}</span>
              )}
            </div>

            <details style={{ marginTop: 8 }} open={false}>
              <summary style={{ fontSize: '0.74rem', color: MUTED, cursor: 'pointer' }}>Why is CogniX telling me this?</summary>
              <ul style={{ fontSize: '0.74rem', color: MUTED, margin: '6px 0 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
                {m.why.map(w => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <div style={{ marginTop: 6 }}>
                {m.evidence.map(e => (
                  <div key={e.statement} style={{ fontSize: '0.72rem', color: MUTED, lineHeight: 1.5 }}>
                    <strong style={{ color: SLATE }}>{e.source.replace(/_/g, ' ').toLowerCase()}</strong> — {e.statement}
                  </div>
                ))}
              </div>
            </details>

            {m.candidate ? (
              <div style={{ marginTop: 12, borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: SLATE }}>
                  CogniX suggests: {m.candidate.label}
                </div>
                <p style={{ fontSize: '0.76rem', color: MUTED, margin: '3px 0 0 0', lineHeight: 1.5 }}>{m.candidate.rationale}</p>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMoment(open ? null : m.moment_id);
                    if (!open) onSelectMoment(m);
                  }}
                  style={{
                    marginTop: 9,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 13px',
                    borderRadius: 7,
                    border: `1px solid ${LINE}`,
                    background: '#FFFFFF',
                    color: SLATE,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {busy && previewingMomentId === m.moment_id ? <Loader2 size={13} className="atlas-spin" /> : <ChevronRight size={13} />}
                  {open ? 'Hide comparison' : 'What happens if I intervene?'}
                </button>
              </div>
            ) : (
              m.no_candidate_reason && (
                <p style={{ fontSize: '0.76rem', color: MUTED, margin: '10px 0 0 0', lineHeight: 1.5, borderTop: `1px solid ${LINE}`, paddingTop: 10 }}>
                  {m.no_candidate_reason}
                </p>
              )
            )}

            {/* ── Preview + plan ── */}
            {open && preview && preview.moment_id === m.moment_id && (
              <div style={{ marginTop: 12, background: '#F8FAFC', border: `1px solid ${LINE}`, borderRadius: 10, padding: '13px 15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      If you do nothing
                    </div>
                    <p style={{ fontSize: '0.79rem', color: '#334155', margin: '4px 0 0 0', lineHeight: 1.5 }}>{preview.without_statement}</p>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      If you intervene
                    </div>
                    <p style={{ fontSize: '0.79rem', color: '#334155', margin: '4px 0 0 0', lineHeight: 1.5 }}>{preview.with_statement}</p>
                  </div>
                </div>

                <div style={{ marginTop: 12, borderTop: `1px solid ${LINE}`, paddingTop: 10 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: SLATE }}>{preview.trade_off_headline}</div>
                  <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: 4 }}>{preview.what_improves}</div>
                  <div style={{ fontSize: '0.78rem', color: '#B91C1C', marginTop: 2 }}>{preview.what_is_sacrificed}</div>
                  <p style={{ fontSize: '0.76rem', color: MUTED, margin: '6px 0 0 0', lineHeight: 1.5 }}>{preview.why_recommended}</p>
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ fontSize: '0.72rem', color: MUTED, cursor: 'pointer' }}>The numbers</summary>
                    <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: 5, lineHeight: 1.5 }}>
                      Remaining {preview.without_intervention.days_affected} days — demand{' '}
                      {Math.round(preview.without_intervention.remaining_demand_units).toLocaleString('en-GB')} →{' '}
                      {Math.round(preview.with_intervention.remaining_demand_units).toLocaleString('en-GB')} units; contribution £
                      {Math.round(preview.without_intervention.remaining_contribution_gbp).toLocaleString('en-GB')} → £
                      {Math.round(preview.with_intervention.remaining_contribution_gbp).toLocaleString('en-GB')}.
                    </div>
                    <ul style={{ fontSize: '0.7rem', color: MUTED, margin: '5px 0 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
                      {preview.basis.map(b => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </details>
                </div>

                {!plan && (
                  <div style={{ marginTop: 12, borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: SLATE, marginBottom: 6 }}>Prepare this now</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
                      <label>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: SLATE }}>When the trigger is reached</span>
                        <select value={mode} onChange={e => setMode(e.target.value as PlannedInterventionMode)} aria-label="Intervention mode" style={field}>
                          <option value="PREPARE_FOR_APPROVAL">Prepare for approval (default)</option>
                          <option value="REMIND_ME">Remind me to review</option>
                          <option value="AUTOMATIC_EXECUTION" disabled>
                            Automatic execution — unavailable
                          </option>
                        </select>
                      </label>
                      <label>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: SLATE }}>Decision owner</span>
                        <select value={owner} onChange={e => setOwner(e.target.value)} aria-label="Plan decision owner" style={field}>
                          <option value="">Select a role…</option>
                          {DECISION_OWNER_ROLES.filter(r => r.id !== 'OTHER').map(r => (
                            <option key={r.id} value={r.label}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <input
                      value={rationale}
                      onChange={e => setRationale(e.target.value)}
                      placeholder="Why prepare this? (optional)"
                      aria-label="Plan rationale"
                      style={{ ...field, marginTop: 8 }}
                    />
                    <p style={{ fontSize: '0.7rem', color: MUTED, margin: '8px 0 0 0', lineHeight: 1.5 }}>
                      {AUTOMATIC_EXECUTION_DISCLOSURE}
                    </p>
                    <button
                      type="button"
                      onClick={() => onPlan(m, mode, owner, rationale)}
                      disabled={busy || !owner}
                      style={{
                        marginTop: 10,
                        padding: '8px 15px',
                        borderRadius: 7,
                        border: 'none',
                        background: !owner ? '#93C5FD' : BLUE,
                        color: '#FFFFFF',
                        fontSize: '0.79rem',
                        fontWeight: 600,
                        cursor: !owner ? 'default' : 'pointer'
                      }}
                    >
                      Plan intervention
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── The plan, once it exists ── */}
            {plan && (
              <div style={{ marginTop: 12, background: plan.status === 'CONFIRMED' ? '#F0FDF4' : '#EEF2FF', border: `1px solid ${plan.status === 'CONFIRMED' ? '#BBF7D0' : '#C7D2FE'}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {plan.status === 'CONFIRMED' ? <CheckCircle2 size={15} color="#059669" /> : <AlertTriangle size={15} color="#4338CA" />}
                  <strong style={{ fontSize: '0.82rem', color: SLATE }}>{plan.action.label}</strong>
                  <span style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: MUTED }}>
                    {plan.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 4, lineHeight: 1.5 }}>
                  Planned by {plan.created_by} for day {plan.targeted_flight_day} · {plan.mode.replace(/_/g, ' ').toLowerCase()} · trigger:{' '}
                  {plan.trigger_condition}
                </div>

                {plan.reassessments.length > 0 && (
                  <details style={{ marginTop: 8 }} open>
                    <summary style={{ fontSize: '0.74rem', color: SLATE, cursor: 'pointer', fontWeight: 600 }}>
                      Reassessment — {plan.reassessments[plan.reassessments.length - 1].verdict.replace(/_/g, ' ').toLowerCase()}
                    </summary>
                    {plan.reassessments.map((r, i) => (
                      <div key={i} style={{ fontSize: '0.74rem', color: MUTED, marginTop: 5, lineHeight: 1.5 }}>
                        {r.reason}
                      </div>
                    ))}
                  </details>
                )}

                {plan.status !== 'CONFIRMED' && (
                  <>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => onReassess(plan)} style={smallBtn}>
                        Reassess
                      </button>
                      {(plan.reassessments[plan.reassessments.length - 1]?.options || []).map(o => (
                        <button key={o} type="button" onClick={() => onReassess(plan, o)} style={smallBtn}>
                          {o.replace(/_/g, ' ').toLowerCase()}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 }}>
                      <select value={confirmOwner} onChange={e => setConfirmOwner(e.target.value)} aria-label="Confirming owner" style={field}>
                        <option value="">Who is confirming…</option>
                        {DECISION_OWNER_ROLES.filter(r => r.id !== 'OTHER').map(r => (
                          <option key={r.id} value={r.label}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={confirmStatement}
                        onChange={e => setConfirmStatement(e.target.value)}
                        placeholder="Why confirm now?"
                        aria-label="Confirmation statement"
                        style={field}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onConfirm(plan, confirmOwner, confirmStatement)}
                      disabled={!confirmOwner || !confirmStatement.trim()}
                      style={{
                        marginTop: 8,
                        padding: '8px 15px',
                        borderRadius: 7,
                        border: 'none',
                        background: !confirmOwner || !confirmStatement.trim() ? '#A7F3D0' : '#059669',
                        color: '#FFFFFF',
                        fontSize: '0.79rem',
                        fontWeight: 600,
                        cursor: !confirmOwner || !confirmStatement.trim() ? 'default' : 'pointer'
                      }}
                    >
                      Confirm intervention
                    </button>
                  </>
                )}

                {plan.confirmation && (
                  <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: 8, lineHeight: 1.5 }}>
                    Confirmed by {plan.confirmation.confirmed_by}, effective day {plan.confirmation.effective_from_flight_day}.{' '}
                    {plan.confirmation.statement}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '11px 13px', fontSize: '0.78rem', color: '#991B1B' }}>
          {error}
        </div>
      )}
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  padding: '5px 11px',
  borderRadius: 6,
  border: `1px solid ${LINE}`,
  background: '#FFFFFF',
  color: SLATE,
  fontSize: '0.73rem',
  fontWeight: 600,
  cursor: 'pointer',
  textTransform: 'capitalize'
};
