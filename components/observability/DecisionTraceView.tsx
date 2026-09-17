'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  GitCommit,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  RotateCcw,
  RefreshCw,
  Activity,
  User,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import { useDecisionState } from '@/context/DecisionStateContext';
import {
  describeProvenance,
  type ProvenanceDescriptor
} from '@/packages/contracts/src/provenance-vocabulary';
import { getLivingEvidenceFixtureForScenario } from '@/lib/fixtures/living-evidence-fixtures';

interface DecisionTraceViewProps {
  scenarioId: string;
  onClose?: () => void;
  isModal?: boolean;
  refreshState?: () => Promise<void>;
  resetScenario?: () => Promise<boolean>;
}

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
    void loadEvents();
  }, [loadEvents]);

  const fixture = getLivingEvidenceFixtureForScenario(scenarioId);

  // Scenario-specific decision narratives
  const getDecisionRecommendation = () => {
    if (scenarioId.includes('SALMON')) {
      return {
        decision_label: '10% Promotion Depth Tier',
        action: 'Recommended committed 10% promotional investment',
        rationale: '60% supplier promotional funding locks the 10% tier; the 20% tier is rejected because supplier weekly production cap (41,000 units) would leave 4,200 units unservable.',
        primary_risk: 'Supplier breach at 20% depth; cold-chain distribution buffer.',
        authority: 'Authoritative derived recommendation'
      };
    }
    if (scenarioId.includes('BAKERY') || scenarioId.includes('SOURDOUGH')) {
      return {
        decision_label: '0% Depth — Do Not Promote',
        action: 'Reject promotional discount; maintain standard list price',
        rationale: 'Inelastic customer response (0.8pp/point) combined with only 10% supplier funding destroys net contribution margin at every discount depth; perishable shelf-life surplus accelerates waste.',
        primary_risk: 'Waste discard volume spike (+22%) with negative contribution.',
        authority: 'Authoritative derived recommendation'
      };
    }
    // Fresh Dairy (Reference)
    return {
      decision_label: '14% Promotion Depth Tier',
      action: 'Recommended 14% promotional depth (+33.7% demand lift)',
      rationale: 'Maximises net campaign contribution (£32,976) while keeping expected volume (699,996 units) strictly within Cheshire Cheese Co production and flex limits; 20% depth rejected due to 164,996 exposed units.',
      primary_risk: 'Supplier allocation ceiling; decision window shortened to 14 days.',
      authority: 'Authoritative derived recommendation'
    };
  };

  const recommendation = getDecisionRecommendation();

  return (
    <div className={`og-decision-trace ${isModal ? 'og-decision-trace--modal' : ''}`}>
      {/* Lead Section */}
      <div className="og-section-lead">
        <div className="og-trace-head-row">
          <div>
            <h2>Decision Trace &amp; Provenance Chain</h2>
            <p className="og-lead-questions">
              <strong>Key business questions answered:</strong> Why did CogniX recommend this? Was evidence observed or modelled? Who decided? What changed after?
            </p>
          </div>
          {isModal && onClose && (
            <button type="button" className="og-btn-close-modal" onClick={onClose} aria-label="Close Decision Trace">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Active Decision Card */}
      <div className="og-trace-decision-card">
        <div className="og-decision-card-head">
          <div className="og-decision-title-group">
            <span className="og-trace-tag">Active Scenario Decision</span>
            <h3>{recommendation.decision_label}</h3>
            <p className="og-decision-action">{recommendation.action}</p>
          </div>
          <span className="og-authority-pill">
            <Shield size={13} />
            <span>{recommendation.authority}</span>
          </span>
        </div>

        <div className="og-decision-card-body">
          <p className="og-decision-rationale">
            <strong>CogniX Rationale:</strong> {recommendation.rationale}
          </p>
          <p className="og-decision-risk">
            <AlertTriangle size={13} />
            <span><strong>Governed Boundary:</strong> {recommendation.primary_risk}</span>
          </p>
        </div>
      </div>

      {/* Provenance Reader Test (ADR-082) */}
      <div className="og-trace-reader-sentence">
        <div className="og-reader-header">
          <Layers size={14} />
          <span>Unified Provenance Sentence (ADR-082):</span>
        </div>
        <blockquote className="og-reader-quote">
          "Demand is observed from your file; supplier capacity is modelled because you did not supply it; the margin exposure is derived by CogniX; the summary was drafted by AI and confirmed by you."
        </blockquote>
      </div>

      {/* Trace Pipeline Steps */}
      <div className="og-trace-pipeline">
        <h4 className="og-pipeline-title">Evidence-to-Decision Reasoning Path</h4>

        <div className="og-pipeline-steps">
          <div className="og-pipeline-step">
            <div className="og-step-marker">1</div>
            <div className="og-step-content">
              <span className="og-step-type">Evidence Ingestion</span>
              <h5>Observed &amp; Attested Signals</h5>
              <p>
                Incoming EPOS sales demand and external competitor promotion feeds are validated, timestamped against the scenario clock, and checked for admissibility.
              </p>
              <span className="og-step-meta">Origin: observed · Method: measurement</span>
            </div>
          </div>

          <div className="og-pipeline-step">
            <div className="og-step-marker">2</div>
            <div className="og-step-content">
              <span className="og-step-type">Constraint Modelling</span>
              <h5>Supplier Production &amp; Operational Flex</h5>
              <p>
                Contractual capacity caps (e.g. Cheshire Cheese Co 535,000 unit ceiling or Foodvest Fish 41,000 unit limit) model the servable boundary.
              </p>
              <span className="og-step-meta">Origin: modelled · Method: a declared rule</span>
            </div>
          </div>

          <div className="og-pipeline-step">
            <div className="og-step-marker">3</div>
            <div className="og-step-content">
              <span className="og-step-type">Intelligence Derivation</span>
              <h5>Materiality &amp; Elasticity Evaluation</h5>
              <p>
                CogniX computes depth curves, net revenue, and margin contributions across all candidate tiers to identify the profit-optimal tier.
              </p>
              <span className="og-step-meta">Origin: derived · Method: a declared rule</span>
            </div>
          </div>

          <div className="og-pipeline-step">
            <div className="og-step-marker">4</div>
            <div className="og-step-content">
              <span className="og-step-type">Commitment &amp; Authority</span>
              <h5>Shared Decision State Transition</h5>
              <p>
                The recommendation is staged in versioned decision state for merchant review, intervention selection, and operational sign-off.
              </p>
              <span className="og-step-meta">Authority: authoritative once confirmed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Decision State & Telemetry Section */}
      <div className="og-trace-state-grid">
        {/* Shared Decision State Panel */}
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
              <div className="og-kv"><span>Active Interventions:</span><strong>{decisionState.selected_interventions?.length ?? 0} selected</strong></div>
              <div className="og-kv"><span>Transitions:</span><strong>{decisionState.history?.length ?? 0} recorded</strong></div>

              <div className="og-transitions-list">
                <span className="og-transitions-title">Recent State Transitions:</span>
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

        {/* Journey Telemetry Diagnostics */}
        <div className="og-card">
          <div className="og-card-head-actions">
            <div>
              <h3>Journey telemetry</h3>
              <p className="og-card-lead">Recent decision events from diagnostic ring buffer.</p>
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
                  <span className="og-event-type">
                    #{evt.sequence_number ?? i + 1} {evt.event_type}
                  </span>
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
