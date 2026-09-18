'use client';

/**
 * Decision Trace — `SCI-06`, converged onto `SCI-05` at Gate C
 * ───────────────────────────────────────────────────────────────────────────────
 * Why CogniX recommends what it recommends for the ACTIVE scenario, what evidence sits behind it,
 * which mechanisms produced it, and what a Refresh would change.
 *
 * **This is not a second trace or provenance engine and must never become one.** Every statement
 * below is read from something that already exists: the decision position and the assessed
 * observations from `GET /api/v1/evidence`, the register from `GET /api/v1/methods`, the ADR-082
 * vocabulary from `provenance-vocabulary.ts`, and Shared Decision State and journey telemetry from
 * their own routes. Nothing here derives a recommendation, and nothing here is written by hand per
 * scenario — the surface asks the estate and reports the answer.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  ArrowRight,
  Shield,
  Layers,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Calculator,
  LineChart,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useDecisionState } from '@/context/DecisionStateContext';
import {
  describeProvenance,
  PROVENANCE_ORIGIN_LANGUAGE,
  PROVENANCE_METHOD_LANGUAGE,
  provenanceFromSignalSourceType,
  type ProvenanceMethod
} from '@/packages/contracts/src/provenance-vocabulary';
import { getLivingEvidence, getMethodsRegister } from '@/lib/observability-client';
import type { LivingEvidenceScenarioData } from '@/lib/observability-client';
import type { MethodsRegister } from '@/packages/contracts/src/living-evidence-contracts';

interface DecisionTraceViewProps {
  scenarioId: string;
  onClose?: () => void;
  isModal?: boolean;
  refreshState?: () => Promise<void>;
  resetScenario?: () => Promise<boolean>;
}

const num = (v: number) => v.toLocaleString('en-GB', { maximumFractionDigits: 2 });

/**
 * The four governed mechanism CLASSES, over the ADR-082 `method` vocabulary they group.
 *
 * The class is reader-facing language; the vocabulary underneath is the contract's and is shown
 * beside it, so nothing on the surface reads as "AI" by default and nothing hides which enum a
 * value really carries.
 */
const MECHANISM_CLASSES: { label: string; methods: ProvenanceMethod[]; Icon: React.ComponentType<{ size?: number }> }[] = [
  { label: 'Calculated', methods: ['rule', 'measured'], Icon: Calculator },
  { label: 'Fitted', methods: ['statistical'], Icon: LineChart },
  { label: 'Drafted', methods: ['llm'], Icon: Sparkles },
  { label: 'Human', methods: ['manual'], Icon: UserCheck }
];

export default function DecisionTraceView({
  scenarioId,
  onClose,
  isModal = false,
  refreshState: propRefreshState,
  resetScenario: propResetScenario
}: DecisionTraceViewProps) {
  const context = useDecisionState();
  const decisionState = context.decisionState;
  const refreshState = propRefreshState ?? context.refreshState;
  const resetScenario = propResetScenario ?? context.resetScenario;

  const [events, setEvents] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<LivingEvidenceScenarioData | null>(null);
  const [register, setRegister] = useState<MethodsRegister | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setBusy('events');
    try {
      const res = await fetch('/api/v1/journey/events?limit=20');
      const json = await res.json();
      setEvents(Array.isArray(json.data) ? json.data : []);
    } catch {
      setEvents([]);
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([getLivingEvidence(scenarioId), getMethodsRegister(scenarioId)])
      .then(([ev, reg]) => {
        if (!mounted) return;
        setEvidence(ev);
        setRegister(reg);
        setLoadError(null);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setEvidence(null);
        setRegister(null);
        setLoadError(err?.message || 'The decision trace could not be read for this scenario.');
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [scenarioId]);

  useEffect(() => { void loadEvents(); }, [loadEvents]);

  const position = evidence?.decision_position ?? null;
  const observations = evidence?.observations ?? [];
  const preview = evidence?.next_refresh_preview ?? null;
  const previewExhausted = preview !== null && preview.from.period === preview.to.period;

  /* The quantities a reader checks a recommendation against, in the order the journey publishes them. */
  const HEADLINE = ['EXPECTED_DEMAND_UNITS', 'SERVABLE_DEMAND_UNITS', 'EXPOSED_DEMAND_UNITS', 'DECISION_GAP_PP', 'DECISION_WINDOW_HOURS'];
  const headline = (position?.quantities ?? []).filter(q => HEADLINE.includes(q.quantity));

  const bands = observations.reduce<Record<string, number>>((acc, o) => {
    acc[o.materiality.band] = (acc[o.materiality.band] ?? 0) + 1;
    return acc;
  }, {});
  const decisionMoving = observations.filter(o => o.decision_relevance.changed !== 'NONE');
  const topMovers = observations
    .filter(o => o.materiality.movements.length > 0)
    .sort((a, b) => {
      const m = (x: typeof a) => Math.max(...x.materiality.movements.map(v => Math.abs(v.delta_pct ?? 0)));
      return m(b) - m(a);
    })
    .slice(0, 3);

  /*
   * The ADR-082 reader test, composed from what this scenario's evidence and methods ACTUALLY
   * carry rather than quoted from the ADR. Where a class did not contribute, it is not claimed.
   */
  const originsPresent = Array.from(
    new Set(observations.map(o => provenanceFromSignalSourceType(o.signal.source_type).origin))
  );
  const methodsPresent = Array.from(new Set((register?.entries ?? []).map(e => e.mechanism)));
  const readerSentence = position
    ? [
        observations.length > 0
          ? `Evidence for this scenario is ${originsPresent.map(o => PROVENANCE_ORIGIN_LANGUAGE[o]).join(' and ')}`
          : null,
        methodsPresent.length > 0
          ? `the published quantities are produced through ${methodsPresent.map(m => PROVENANCE_METHOD_LANGUAGE[m]).join(', ')}`
          : null,
        describeProvenance(position.provenance, 'the recommendation itself')
          .replace(/^the recommendation itself is /, 'and the recommendation itself is ')
          .replace(/\.$/, '')
      ].filter(Boolean).join('; ') + '.'
    : null;

  return (
    <div className={`og-decision-trace ${isModal ? 'og-decision-trace--modal' : ''}`}>
      <div className="og-section-lead">
        <div className="og-trace-head-row">
          <div>
            <h2>Decision Trace &amp; Provenance Chain</h2>
            <p className="og-lead-questions">
              <strong>Key business questions answered:</strong> Why did CogniX recommend this? Was
              evidence observed or modelled? What methods governed it? What changed after?
            </p>
          </div>
          {isModal && onClose && (
            <button type="button" className="og-btn-close-modal" onClick={onClose} aria-label="Close Decision Trace">
              ✕
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="og-loading-state">
          <Loader2 size={24} className="atlas-spin" />
          <p>Reading the decision, its evidence and the methods behind it…</p>
        </div>
      ) : loadError || !position ? (
        <p className="og-refresh-error">
          <AlertTriangle size={14} />
          <span>{loadError || 'No decision position is published for this scenario.'}</span>
        </p>
      ) : (
        <>
          {/* 1 — the decision as the estate currently holds it */}
          <div className="og-trace-decision-card">
            <div className="og-decision-card-head">
              <div className="og-decision-title-group">
                <span className="og-trace-tag">
                  {evidence?.scenario_name || position.scenario_id} · as at {position.as_at.period}
                </span>
                <h3>{position.recommendation}</h3>
                <p className="og-decision-action">
                  Decision Window <strong>{position.decision_window}</strong>, derived from this
                  scenario&apos;s own clock at {position.as_at.period_instant_iso.slice(0, 10)}.
                </p>
              </div>
              <span className="og-authority-pill">
                <Shield size={13} />
                <span>{position.provenance.origin} · {position.provenance.authority.replace(/_/g, ' ')}</span>
              </span>
            </div>

            <div className="og-decision-card-body">
              <div className="og-trace-quantities">
                {headline.map(q => (
                  <div key={q.quantity} className="og-kv">
                    <span>{q.display_label}</span>
                    <strong>{num(q.before)} {q.unit}</strong>
                  </div>
                ))}
              </div>
              <p className="og-decision-risk">
                <AlertTriangle size={13} />
                <span>
                  <strong>Governed boundary:</strong> the recommendation above is derived from the
                  scenario record and the evidence admitted at this marker. It is not a commitment —
                  a person commits it through Shared Decision State below.
                </span>
              </p>
            </div>
          </div>

          {/* 2 — the ADR-082 reader test, from this scenario's own facts */}
          {readerSentence && (
            <div className="og-trace-reader-sentence">
              <div className="og-reader-header">
                <Layers size={14} />
                <span>Unified provenance sentence (ADR-082), composed from this scenario&apos;s evidence:</span>
              </div>
              <blockquote className="og-reader-quote">{readerSentence}</blockquote>
            </div>
          )}

          {/* 3 — the evidence behind it */}
          <div className="og-trace-pipeline">
            <h4 className="og-pipeline-title">Evidence-to-decision reasoning path</h4>
            <div className="og-pipeline-steps">
              <div className="og-pipeline-step">
                <div className="og-step-marker">1</div>
                <div className="og-step-content">
                  <span className="og-step-type">Evidence admitted</span>
                  <h5>{observations.length} observations at {position.as_at.period}</h5>
                  <p>
                    {Object.entries(bands)
                      .sort()
                      .map(([band, count]) => `${count} ${band.toLowerCase()}`)
                      .join(', ') || 'No observation is visible at this marker.'}
                    {decisionMoving.length > 0
                      ? ` — ${decisionMoving.length} of them changed a decision artefact.`
                      : ' — none of them, on its own, changes the decision.'}
                  </p>
                  <span className="og-step-meta">
                    Source: {Array.from(new Set(observations.map(o => o.signal.source_system))).join(', ') || '—'}
                  </span>
                </div>
              </div>

              <div className="og-pipeline-step">
                <div className="og-step-marker">2</div>
                <div className="og-step-content">
                  <span className="og-step-type">What the evidence moved</span>
                  <h5>Leave-one-out materiality</h5>
                  {topMovers.length === 0 ? (
                    <p>No observation moved a published quantity at this marker.</p>
                  ) : (
                    <ul className="og-trace-movers">
                      {topMovers.map(o => {
                        const top = o.materiality.movements
                          .slice()
                          .sort((a, b) => Math.abs(b.delta_pct ?? 0) - Math.abs(a.delta_pct ?? 0))[0];
                        return (
                          <li key={o.signal.signal_id}>
                            <strong>{o.signal.signal_type.replace(/_/g, ' ')}</strong> — {top.display_label}{' '}
                            {num(top.before)} → {num(top.after)} {top.unit}
                            {top.delta_pct !== null && ` (${top.delta_pct >= 0 ? '+' : ''}${top.delta_pct.toFixed(2)}%)`}
                            {' · '}<em>{o.materiality.band}</em>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <span className="og-step-meta">
                    Every quantity is evaluated twice — with the observation and without it. The
                    difference is the materiality.
                  </span>
                </div>
              </div>

              <div className="og-pipeline-step">
                <div className="og-step-marker">3</div>
                <div className="og-step-content">
                  <span className="og-step-type">Methods that governed it</span>
                  <h5>{register?.entries.length ?? 0} registered methods</h5>
                  <div className="og-trace-mech-row">
                    {MECHANISM_CLASSES.map(({ label, methods, Icon }) => {
                      const count = (register?.entries ?? []).filter(e => methods.includes(e.mechanism)).length;
                      return (
                        <span key={label} className={`og-trace-mech${count === 0 ? ' og-trace-mech--none' : ''}`}>
                          <Icon size={12} />
                          <strong>{count}</strong> {label}
                          <em>({methods.join(' / ')})</em>
                        </span>
                      );
                    })}
                  </div>
                  {register && register.undescribed.length > 0 && (
                    <p className="og-step-meta">
                      {register.undescribed.length} mechanism
                      {register.undescribed.length === 1 ? ' is' : 's are'} declared undescribed for
                      this scenario rather than reported as active.
                    </p>
                  )}
                </div>
              </div>

              <div className="og-pipeline-step">
                <div className="og-step-marker">4</div>
                <div className="og-step-content">
                  <span className="og-step-type">What a Refresh would change</span>
                  <h5>
                    {previewExhausted
                      ? 'The timeline is fully advanced'
                      : `${preview?.from.period} → ${preview?.to.period}`}
                  </h5>
                  <p>{preview?.decision_consequence_statement ?? 'No advance is available.'}</p>
                  <span className="og-step-meta">
                    Previewed without advancing the marker, so reading this page changes nothing.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="og-trace-state-grid">
        <div className="og-card">
          <div className="og-card-head-actions">
            <div>
              <h3>Shared decision state</h3>
              <p className="og-card-lead">Authoritative versioned state with transition audit.</p>
            </div>
            <div className="og-actions">
              <button type="button" className="og-btn-subtle" onClick={refreshState}>
                <RefreshCw size={12} />
                <span>Refresh state</span>
              </button>
              <button type="button" className="og-btn-subtle" onClick={resetScenario}>
                <RotateCcw size={12} />
                <span>Reset to baseline</span>
              </button>
            </div>
          </div>

          {decisionState ? (
            <div className="og-state-details">
              <div className="og-kv"><span>State ID:</span><strong>{decisionState.decision_state_id}</strong></div>
              <div className="og-kv"><span>Version:</span><strong>v{decisionState.state_version}</strong></div>
              <div className="og-kv"><span>Scenario:</span><strong>{decisionState.scenario_id}</strong></div>
              <div className="og-kv">
                <span>Active interventions:</span>
                <strong>{decisionState.selected_interventions?.length ?? 0} selected</strong>
              </div>
              <div className="og-kv">
                <span>Transitions:</span>
                <strong>{decisionState.history?.length ?? 0} recorded</strong>
              </div>

              <div className="og-transitions-list">
                <span className="og-transitions-title">Recent state transitions:</span>
                {(decisionState.history ?? []).slice(-5).map((h: any, idx: number) => (
                  <div key={`${h.version}-${idx}`} className="og-transition">
                    <span className="og-transition-v">v{h.version}</span>
                    <span className="og-transition-cmd">{h.command_type}</span>
                    <span className="og-transition-fields">{(h.changed_fields ?? []).join(', ') || 'state synced'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="og-empty">No active decision state found.</p>
          )}
        </div>

        <div className="og-card">
          <div className="og-card-head-actions">
            <div>
              <h3>Journey telemetry</h3>
              <p className="og-card-lead">Recent decision events from the diagnostic ring buffer.</p>
            </div>
            <button type="button" className="og-btn-subtle" onClick={loadEvents} disabled={busy === 'events'}>
              <RefreshCw size={12} className={busy === 'events' ? 'atlas-spin' : ''} />
              <span>Refresh events</span>
            </button>
          </div>

          {events.length === 0 ? (
            <p className="og-empty">No telemetry captured yet.</p>
          ) : (
            <ul className="og-events">
              {events.slice(0, 8).map((evt: any, i: number) => (
                <li key={evt.event_id ?? i}>
                  <span className="og-event-type">#{evt.sequence_number ?? i + 1} {evt.event_type}</span>
                  <span className="og-event-meta">
                    {evt.source} · {evt.page ?? '—'}
                    {evt.timestamp ? ` · ${new Date(evt.timestamp).toLocaleTimeString()}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
