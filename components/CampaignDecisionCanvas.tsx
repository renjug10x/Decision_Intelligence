'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Layers,
  Lock,
  Sparkles
} from 'lucide-react';
import {
  AudienceMarket,
  BaselineObjective,
  CAMPAIGN_CANVAS_AREA_ORDER,
  CampaignCanvasArea,
  CampaignIntent,
  CampaignIntentCore,
  DecisionContextArea,
  deriveCanvasProgress
} from '@/packages/contracts/src/campaign-intent-model';
import {
  fetchCurrentCampaignIntent,
  registerCampaignIntentClient,
  saveCampaignIntentDraftClient,
  evaluateCampaignDecisionClient,
  discoverCampaignOpportunityClient,
  evaluateCampaignReadinessClient,
  projectDecisionTimelineClient,
  evaluateOutcomeFrontierClient
} from '@/lib/campaign-intent-client';
import {
  createDecisionContractClient,
  assessDecisionValidityClient
} from '@/lib/decision-contract-client';
import { SCENARIO_ZERO_FRAMING } from '@/packages/contracts/src/campaign-frontier-model';
import {
  DecisionResolution,
  NOT_A_PREDICTION_DISCLOSURE,
  QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT
} from '@/packages/contracts/src/campaign-decision-contract-model';
import { trackJourneyEvent } from '@/lib/journey-client';
import {
  fetchCurrentDecisionState,
  executeDecisionCommand
} from '@/lib/decision-state-client';

interface CampaignDecisionCanvasProps {
  onNavigateToExperiment?: (experimentId: string) => void;
}

const AREA_META: Record<
  CampaignCanvasArea,
  { step: number; title: string; question: string; blurb: string }
> = {
  CAMPAIGN_INTENT: {
    step: 1,
    title: 'Campaign Intent',
    question: 'What are we considering?',
    blurb: 'Frame the decision without assuming promotion is the answer.'
  },
  BASELINE_OBJECTIVE: {
    step: 2,
    title: 'Baseline & Objective',
    question: 'What outcome matters?',
    blurb: 'Capture the objective and soft constraints — not a counterfactual forecast.'
  },
  AUDIENCE_MARKET: {
    step: 3,
    title: 'Audience & Market',
    question: 'Where and when?',
    blurb: 'Scope region, audience, and timing mode. Date discovery stays open.'
  },
  DECISION_CONTEXT: {
    step: 4,
    title: 'Decision Context',
    question: 'What context should we keep in view?',
    blurb: 'Optional notes only — later intelligence decides what is material.'
  }
};

const FUTURE_LAYERS = [
  { id: 'CDI-07B+', label: 'Pre-Mortem & Learning' }
];

/** Fixed demo reference instant — never Date.now() for decision semantics (C-INV-9). */
const CANVAS_EVALUATION_TIMESTAMP = '2026-08-15T12:00:00.000Z';

function formatSnapshotValue(sv: { value?: unknown; unit?: string; source_field_path?: string }): string {
  const raw = sv?.value;
  const n = typeof raw === 'number' ? raw : Number(raw);
  const unit = (sv?.unit || '').toLowerCase();
  const path = (sv?.source_field_path || '').toLowerCase();
  if (Number.isFinite(n)) {
    if (unit.includes('gbp') || unit.includes('£') || path.includes('contribution') || path.includes('gbp')) {
      return `£${n.toFixed(2)}`;
    }
    return n.toFixed(2);
  }
  return String(raw ?? '—');
}

function formatOutcomeSnapshot(snapshot: Array<{ value?: unknown; unit?: string; source_field_path?: string }> | undefined): string {
  if (!snapshot?.length) return '0.00 / £0.00';
  return snapshot.map(formatSnapshotValue).join(' / ');
}

/**
 * The plays a person may resolve by hand: the frontier survivors, plus any displayed ADMISSIBLE
 * play outside that set. A dominated Scenario 0 is never a member of `frontier_play_ids`, yet
 * CDI-06 keeps it displayed and first-class — and "we considered it and chose not to act" is
 * exactly the decision the human resolution route exists to record.
 */
function humanResolvablePlayIds(frontier: any): string[] {
  const ids: string[] = [...(frontier?.frontier_play_ids || [])];
  for (const p of frontier?.plays || []) {
    if (p.admissibility !== 'ADMISSIBLE') continue;
    if (p.play_kind !== 'DO_NOTHING') continue;
    if (!ids.includes(p.play_id)) ids.push(p.play_id);
  }
  return ids.sort((a, b) => a.localeCompare(b));
}

function validityStateStyle(state: string): CSSProperties {
  if (state === 'INDETERMINATE') {
    return {
      display: 'inline-block',
      padding: '6px 12px',
      borderRadius: 6,
      border: '1px dashed var(--text-muted)',
      background: '#F8FAFC',
      color: 'var(--text-muted)',
      fontSize: '0.8125rem',
      fontWeight: 650,
      letterSpacing: '0.04em'
    };
  }
  return {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--curiosity-light)',
    color: 'var(--text-primary)',
    fontSize: '0.8125rem',
    fontWeight: 650,
    letterSpacing: '0.04em'
  };
}

/**
 * CDI-05 Layer 5 timeline chart.
 *
 * Straight segments between allocated points only — no curve type, spline, easing,
 * smoothing or tension anywhere in here. Under FLAT_RATE_IDENTITY the honest picture is
 * two flat lines separated by the attributable effect, with a level shift at the phase
 * boundary where the world moved. Any curvature drawn here would be the same fabrication
 * as one computed in the engine.
 *
 * The unmodelled post-campaign region carries no line and no band: the engine publishes
 * null components and no envelope there, and the chart must not fill that silence with a
 * reversion or a convergence the model never asserted.
 */
export function TimelineChart({ projection }: { projection: any }) {
  const W = 720;
  const H = 190;
  const padL = 42;
  const padR = 12;
  const padT = 12;
  const padB = 26;

  const cf = projection.trajectories.find((t: any) => t.kind === 'COUNTERFACTUAL');
  const iv = projection.trajectories.find((t: any) => t.kind === 'INTERVENTION');
  if (!cf || !iv) return null;

  const total = projection.grid.points;
  const x = (i: number) => padL + (total <= 1 ? 0 : (i / (total - 1)) * (W - padL - padR));

  const bounds: number[] = [];
  for (const t of [cf, iv]) {
    for (const pt of t.points) if (pt.index_pct != null) bounds.push(pt.index_pct);
    for (const ep of t.envelope.points) bounds.push(ep.lower_index_pct, ep.upper_index_pct);
  }
  const lo = Math.floor(Math.min(...bounds, 100) - 1);
  const hi = Math.ceil(Math.max(...bounds, 100) + 1);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo || 1)) * (H - padT - padB);

  // Contiguous runs of modelled points — a gap is rendered as a gap, never bridged.
  const runsOf = (points: any[]): string[] => {
    const runs: string[] = [];
    let current: string[] = [];
    for (const pt of points) {
      if (pt.index_pct == null) {
        if (current.length > 1) runs.push(current.join(' '));
        current = [];
      } else {
        current.push(`${x(pt.period_index).toFixed(2)},${y(pt.index_pct).toFixed(2)}`);
      }
    }
    if (current.length > 1) runs.push(current.join(' '));
    return runs;
  };

  const bandOf = (envelope: any): string => {
    const pts = [...envelope.points].sort((a: any, b: any) => a.period_index - b.period_index);
    if (pts.length < 2) return '';
    const upper = pts.map((ep: any) => `${x(ep.period_index).toFixed(2)},${y(ep.upper_index_pct).toFixed(2)}`);
    const lower = pts
      .slice()
      .reverse()
      .map((ep: any) => `${x(ep.period_index).toFixed(2)},${y(ep.lower_index_pct).toFixed(2)}`);
    return [...upper, ...lower].join(' ');
  };

  const campaignIdxs = cf.points.filter((p: any) => p.phase === 'CAMPAIGN').map((p: any) => p.period_index);
  const postIdxs = cf.points.filter((p: any) => p.phase === 'POST_CAMPAIGN').map((p: any) => p.period_index);
  const campX0 = campaignIdxs.length ? x(campaignIdxs[0]) : padL;
  const campX1 = campaignIdxs.length ? x(campaignIdxs[campaignIdxs.length - 1]) : padL;
  const postX0 = postIdxs.length ? x(postIdxs[0]) : W - padR;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, background: '#FFFFFF', padding: 8 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Decision timeline: counterfactual and intervention trajectories with confidence envelopes">
        <defs>
          <pattern id="cdi05-unmodelled" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#CBD5E1" strokeWidth="1.5" />
          </pattern>
        </defs>

        {/* Phases are visually distinct: pre-campaign plain, campaign tinted, post-campaign hatched */}
        <rect
          x={campX0}
          y={padT}
          width={Math.max(0, (postIdxs.length ? postX0 : campX1) - campX0)}
          height={H - padT - padB}
          fill="#FFF7ED"
        />
        <rect x={postX0} y={padT} width={Math.max(0, W - padR - postX0)} height={H - padT - padB} fill="url(#cdi05-unmodelled)" opacity={0.5} />

        {/* Identity reference */}
        <line x1={padL} y1={y(100)} x2={W - padR} y2={y(100)} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
        <text x={4} y={y(100) + 3} fontSize="9" fill="#94A3B8">100</text>
        <text x={4} y={y(hi) + 8} fontSize="9" fill="#94A3B8">{hi}</text>

        {/* Both trajectories are enveloped — a crisp counterfactual against a fuzzy
            intervention would bias the comparison toward "doing nothing is known" */}
        <polygon points={bandOf(cf.envelope)} fill="#64748B" opacity={0.13} />
        <polygon points={bandOf(iv.envelope)} fill="#F97316" opacity={0.13} />

        {runsOf(cf.points).map((pts, i) => (
          <polyline key={`cf${i}`} points={pts} fill="none" stroke="#475569" strokeWidth="1.75" strokeDasharray="5 3" />
        ))}
        {runsOf(iv.points).map((pts, i) => (
          <polyline key={`iv${i}`} points={pts} fill="none" stroke="#F97316" strokeWidth="2" />
        ))}

        {/* Markers annotate the grid; they never alter a point's value */}
        {projection.markers.map((m: any) => (
          <line
            key={m.marker_id}
            x1={x(m.period_index)}
            y1={padT}
            x2={x(m.period_index)}
            y2={H - padB}
            stroke="#0F172A"
            strokeWidth="0.75"
            opacity={0.18}
          />
        ))}

        <text x={padL + 2} y={H - padB + 14} fontSize="9" fill="#94A3B8">
          {projection.grid.start_date} · pre-campaign (modelled run-rate, not observed history)
        </text>
        <text x={postX0 + 4} y={padT + 12} fontSize="9" fill="#64748B">
          not modelled
        </text>
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 4 }}>
        <span>— Intervention [DERIVED]</span>
        <span>- - Counterfactual [DERIVED]</span>
        <span>Shaded bands: declared horizon uncertainty [SEEDED_ASSUMPTION]</span>
        <span>Hatched: post-campaign not modelled [MISSING]</span>
      </div>
    </div>
  );
}

export default function CampaignDecisionCanvas({
  onNavigateToExperiment
}: CampaignDecisionCanvasProps = {}) {
  const [intent, setIntent] = useState<CampaignIntent | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<any | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [opportunity, setOpportunity] = useState<any | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [readiness, setReadiness] = useState<any | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [readinessExpanded, setReadinessExpanded] = useState(false);
  const [timeline, setTimeline] = useState<any | null>(null);
  const [projecting, setProjecting] = useState(false);
  const [timelineTier, setTimelineTier] = useState(1);
  const [frontier, setFrontier] = useState<any | null>(null);
  const [evaluatingFrontier, setEvaluatingFrontier] = useState(false);
  const [frontierDrawerOpen, setFrontierDrawerOpen] = useState(false);
  const [selectedPlayId, setSelectedPlayId] = useState<string | null>(null);
  const [evaluationTimestamp] = useState(CANVAS_EVALUATION_TIMESTAMP);
  const [decisionContract, setDecisionContract] = useState<any | null>(null);
  const [validityAssessment, setValidityAssessment] = useState<any | null>(null);
  const [validityDrawerOpen, setValidityDrawerOpen] = useState(false);
  const [registeringContract, setRegisteringContract] = useState(false);
  const [humanResolvedBy, setHumanResolvedBy] = useState('');
  const [humanResolutionBasis, setHumanResolutionBasis] = useState('');
  const [humanSelectedPlayId, setHumanSelectedPlayId] = useState('');

  useEffect(() => {
    trackJourneyEvent({
      event_type: 'EXPERIMENT_OPENED',
      source: 'campaign_decision_canvas',
      page: 'campaign-decision',
      experiment_id: 'EXP-CDI-01',
      metadata: { package: 'CDI-01' }
    });
    fetchCurrentCampaignIntent().then(async data => {
      if (data) {
        setIntent(data);
        if (data.status === 'REGISTERED') {
          const evalResult = await evaluateCampaignDecisionClient({
            tenant_id: data.tenant_id,
            session_id: data.session_id,
            campaign_intent_id: data.campaign_intent_id
          });
          if (evalResult) setEvaluation(evalResult);
          const opp = await discoverCampaignOpportunityClient({
            tenant_id: data.tenant_id,
            session_id: data.session_id,
            campaign_intent_id: data.campaign_intent_id
          });
          if (opp) setOpportunity(opp);
        }
      }
    });
  }, []);

  if (!intent) {
    return (
      <div className="page-content animate-fade" style={{ maxWidth: 920, margin: '0 auto', padding: '48px 24px', color: 'var(--text-muted)' }}>
        Loading Campaign Decision Canvas…
      </div>
    );
  }

  const progress = deriveCanvasProgress(intent);
  const active = intent.canvas_progress.active_area;
  const isRegistered = intent.status === 'REGISTERED';

  const updateIntent = (next: CampaignIntent) => {
    const withProgress = { ...next, canvas_progress: deriveCanvasProgress(next) };
    withProgress.canvas_progress.active_area = next.canvas_progress.active_area;
    setIntent(withProgress);
  };

  const setActiveArea = (area: CampaignCanvasArea) => {
    if (isRegistered) return;
    updateIntent({
      ...intent,
      canvas_progress: { ...intent.canvas_progress, active_area: area }
    });
  };

  const patchCore = (patch: Partial<CampaignIntentCore>) => {
    updateIntent({
      ...intent,
      campaign_intent: { ...intent.campaign_intent, ...patch }
    });
  };

  const patchBaseline = (patch: Partial<BaselineObjective>) => {
    updateIntent({
      ...intent,
      baseline_objective: { ...intent.baseline_objective, ...patch }
    });
  };

  const patchAudience = (patch: Partial<AudienceMarket>) => {
    updateIntent({
      ...intent,
      audience_market: { ...intent.audience_market, ...patch }
    });
  };

  const patchContext = (patch: Partial<DecisionContextArea>) => {
    updateIntent({
      ...intent,
      decision_context: { ...intent.decision_context, ...patch }
    });
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    const saved = await saveCampaignIntentDraftClient(intent);
    setSaving(false);
    if (!saved) {
      setError('Could not save draft. Check required framing fields.');
      return;
    }
    setIntent(saved);
    setMessage('Draft saved. Progressive canvas state preserved for this session.');
  };

  const handleRegister = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    const result = await registerCampaignIntentClient(intent);
    setSaving(false);
    if (!result.intent) {
      setError(result.error || 'Registration blocked until all four areas are complete.');
      return;
    }
    setIntent(result.intent);
    setMessage(
      `Campaign Intent registered (decision state v${result.decision_state_version ?? '—'}). Downstream CDI packages can now consume this contract.`
    );
    // Auto-run CDI-02 evaluation after registration
    setEvaluating(true);
    const evalResult = await evaluateCampaignDecisionClient({
      tenant_id: result.intent.tenant_id,
      session_id: result.intent.session_id,
      campaign_intent_id: result.intent.campaign_intent_id
    });
    setEvaluating(false);
    if (evalResult) setEvaluation(evalResult);

    setDiscovering(true);
    const opp = await discoverCampaignOpportunityClient({
      tenant_id: result.intent.tenant_id,
      session_id: result.intent.session_id,
      campaign_intent_id: result.intent.campaign_intent_id
    });
    setDiscovering(false);
    if (opp) {
      setOpportunity(opp);
      // Re-run CDI-02 with resolved temporal uplift when FIND_BEST_WINDOW
      if (
        result.intent.audience_market.timing_mode === 'FIND_BEST_WINDOW' &&
        opp.opportunity_windows?.resolved_temporal_uplift_pp != null
      ) {
        setEvaluating(true);
        const resolvedEval = await evaluateCampaignDecisionClient({
          tenant_id: result.intent.tenant_id,
          session_id: result.intent.session_id,
          campaign_intent_id: result.intent.campaign_intent_id,
          resolved_temporal_uplift_pp: opp.opportunity_windows.resolved_temporal_uplift_pp,
          opportunity_window_id: opp.opportunity_windows.recommended_window_id
        });
        setEvaluating(false);
        if (resolvedEval) setEvaluation(resolvedEval);
      }
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    setError(null);
    // Only FIND_BEST_WINDOW defers its timing to CDI-03. KNOWN_DATES keeps the
    // closed CDI-02 stated-dates semantics — both evaluate paths must agree.
    const windowResolvable = intent.audience_market.timing_mode === 'FIND_BEST_WINDOW';
    const resolvedPp = windowResolvable
      ? opportunity?.opportunity_windows?.resolved_temporal_uplift_pp
      : undefined;
    const windowId = opportunity?.opportunity_windows?.recommended_window_id;
    const evalResult = await evaluateCampaignDecisionClient({
      tenant_id: intent.tenant_id,
      session_id: intent.session_id,
      campaign_intent_id: intent.campaign_intent_id,
      ...(typeof resolvedPp === 'number'
        ? { resolved_temporal_uplift_pp: resolvedPp, opportunity_window_id: windowId }
        : {})
    });
    setEvaluating(false);
    if (!evalResult) {
      setError('CDI-02 evaluation failed.');
      return;
    }
    setEvaluation(evalResult);
  };

  const handleDiscoverOpportunity = async () => {
    setDiscovering(true);
    setError(null);
    const opp = await discoverCampaignOpportunityClient({
      tenant_id: intent.tenant_id,
      session_id: intent.session_id,
      campaign_intent_id: intent.campaign_intent_id
    });
    setDiscovering(false);
    if (!opp) {
      setError('CDI-03 opportunity discovery failed.');
      return;
    }
    setOpportunity(opp);
  };

  const handleAssessReadiness = async () => {
    setAssessing(true);
    setError(null);
    const result = await evaluateCampaignReadinessClient({
      tenant_id: intent.tenant_id,
      session_id: intent.session_id,
      campaign_intent_id: intent.campaign_intent_id
    });
    setAssessing(false);
    if (!result) {
      setError('CDI-04 readiness assessment failed.');
      return;
    }
    setReadiness(result);
  };

  const handleProjectTimeline = async () => {
    setProjecting(true);
    setError(null);
    setTimelineTier(1);
    const result = await projectDecisionTimelineClient({
      tenant_id: intent.tenant_id,
      session_id: intent.session_id,
      campaign_intent_id: intent.campaign_intent_id
    });
    setProjecting(false);
    if (!result) {
      setError('CDI-05 timeline projection failed.');
      return;
    }
    setTimeline(result);
  };

  const handleEvaluateFrontier = async () => {
    setEvaluatingFrontier(true);
    setError(null);
    setFrontierDrawerOpen(false);
    setSelectedPlayId(null);
    setDecisionContract(null);
    setValidityAssessment(null);
    setValidityDrawerOpen(false);
    setHumanResolvedBy('');
    setHumanResolutionBasis('');
    setHumanSelectedPlayId('');
    const windowResolvable = intent.audience_market.timing_mode === 'FIND_BEST_WINDOW';
    const resolvedPp = windowResolvable
      ? opportunity?.opportunity_windows?.resolved_temporal_uplift_pp
      : undefined;
    const windowId = opportunity?.opportunity_windows?.recommended_window_id;
    const result = await evaluateOutcomeFrontierClient({
      tenant_id: intent.tenant_id,
      session_id: intent.session_id,
      campaign_intent_id: intent.campaign_intent_id,
      evaluation_timestamp: evaluationTimestamp,
      ...(typeof resolvedPp === 'number'
        ? { resolved_temporal_uplift_pp: resolvedPp, opportunity_window_id: windowId }
        : {})
    });
    setEvaluatingFrontier(false);
    if (!result) {
      setError('CDI-06 outcome frontier evaluation failed.');
      return;
    }
    setFrontier(result);
    setFrontierDrawerOpen(true);
    const plays = result.frontier?.plays || [];
    const scenarioZero = plays.find((p: any) => p.play_kind === 'DO_NOTHING');
    setSelectedPlayId(scenarioZero?.play_id || plays[0]?.play_id || null);
  };

  const handleRegisterDecisionContract = async () => {
    const f = frontier?.frontier;
    if (!f || f.frontier_status !== 'EMITTED') {
      setError('Emit an outcome frontier before registering a decision contract.');
      return;
    }
    const selection = f.selection;
    const status = selection?.status;

    let resolution: DecisionResolution;

    if (status === 'SELECTED' && selection.selected_play_id) {
      resolution = {
        route: 'CONSTRAINT_RESOLVED',
        selected_play_id: selection.selected_play_id,
        selection_status: 'SELECTED',
        selection_basis: selection.selection_basis
      };
    } else if (status === 'CHOICE_REQUIRED') {
      const resolvedBy = humanResolvedBy.trim();
      const basis = humanResolutionBasis.trim();
      const playId = humanSelectedPlayId.trim();
      if (!resolvedBy || !basis || !playId) {
        setError(
          'CHOICE_REQUIRED needs explicit human fields: resolved_by, resolution basis, and a selected survivor play.'
        );
        return;
      }
      const survivors: string[] = humanResolvablePlayIds(f);
      if (!survivors.includes(playId)) {
        setError('Selected play must be one of the admissible plays displayed for this decision.');
        return;
      }
      resolution = {
        route: 'HUMAN_RESOLVED',
        selected_play_id: playId,
        resolved_by: resolvedBy,
        resolution_statement: basis,
        presented_alternatives: survivors
      };
    } else {
      setError('Decision is not contractable until SELECTED or human-resolved CHOICE_REQUIRED.');
      return;
    }

    setRegisteringContract(true);
    setError(null);
    setMessage(null);

    const created = await createDecisionContractClient({
      tenant_id: intent.tenant_id,
      session_id: intent.session_id,
      frontier: f,
      campaign_intent: intent,
      resolution,
      created_as_of: evaluationTimestamp
    });

    if (!created.contract) {
      setRegisteringContract(false);
      setError(
        created.rejection_id
          ? `${created.rejection_id}: ${created.error}`
          : created.error || 'Decision contract registration failed.'
      );
      return;
    }

    setDecisionContract(created.contract);
    setMessage('Decision contract registered.');

    // WP10-C W1 — bind the plain-string reference into Shared Decision State. WP10-C owns the
    // command and stores the reference only; no contract content crosses the boundary. Registering
    // the same reference again is an idempotent no-op, so a remount or retry cannot churn state.
    const sharedState = await fetchCurrentDecisionState(intent.session_id, intent.tenant_id);
    if (sharedState?.decision_state_id) {
      await executeDecisionCommand(
        sharedState.decision_state_id,
        'REGISTER_DECISION_CONTRACT',
        sharedState.state_version,
        { decision_contract_ref: created.contract.contract_id },
        'CampaignDecisionCanvas'
      );
    }

    const asOf = created.contract.created_as_of || evaluationTimestamp;
    const validity = await assessDecisionValidityClient({
      contract_id: created.contract.contract_id,
      tenant_id: intent.tenant_id,
      session_id: intent.session_id,
      as_of: asOf
    });
    setRegisteringContract(false);

    if (!validity.assessment) {
      setError(
        validity.rejection_id
          ? `${validity.rejection_id}: ${validity.error}`
          : validity.error || 'Validity assessment failed.'
      );
      return;
    }
    setValidityAssessment(validity.assessment);
  };

  const advance = () => {
    const idx = CAMPAIGN_CANVAS_AREA_ORDER.indexOf(active);
    if (idx < CAMPAIGN_CANVAS_AREA_ORDER.length - 1) {
      setActiveArea(CAMPAIGN_CANVAS_AREA_ORDER[idx + 1]);
    }
  };

  const fieldStyle: CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: '#FFFFFF',
    fontSize: '0.875rem',
    color: 'var(--text-primary)'
  };

  const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 6
  };

  return (
    <div className="page-content animate-fade" style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 64 }}>
      {/* Hero framing — curiosity first, not a control dashboard */}
      <header style={{ marginBottom: 28 }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--g10x-orange)', marginBottom: 8 }}>
          EXP-CDI-01 · Campaign Decision Intelligence
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 650, color: 'var(--text-primary)', margin: '0 0 10px', lineHeight: 1.25 }}>
          What if promotional decisions first asked whether to intervene at all?
        </h1>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)', maxWidth: 720, lineHeight: 1.55 }}>
          This canvas establishes intent and constraints. Promotion is one possible lever — alongside non-promotion interventions and doing nothing. Prediction, readiness, and trade-offs arrive in later packages.
        </p>
        {intent.synthetic_demo && (
          <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px' }}>
            <Sparkles size={12} /> Synthetic demo intent · schema {intent.schema_version}
          </div>
        )}
      </header>

      {/* Progressive area rail */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {CAMPAIGN_CANVAS_AREA_ORDER.map(area => {
          const done = progress.completed_areas.includes(area);
          const selected = active === area;
          return (
            <button
              key={area}
              type="button"
              onClick={() => setActiveArea(area)}
              disabled={isRegistered}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 8,
                border: selected ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
                background: selected ? 'var(--curiosity-light)' : '#FFFFFF',
                color: selected ? 'var(--g10x-orange)' : 'var(--text-secondary)',
                cursor: isRegistered ? 'default' : 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 550
              }}
            >
              {done ? <CheckCircle2 size={14} color="var(--success, #059669)" /> : <span style={{ opacity: 0.5 }}>{AREA_META[area].step}</span>}
              {AREA_META[area].title}
            </button>
          );
        })}
      </div>

      {/* Active area panel */}
      <section
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '22px 24px',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Area {AREA_META[active].step} of 4
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.25rem', color: 'var(--text-primary)' }}>{AREA_META[active].question}</h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{AREA_META[active].blurb}</p>
          </div>
          <Layers size={18} color="var(--text-muted)" />
        </div>

        {active === 'CAMPAIGN_INTENT' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={labelStyle}>Objective type</label>
              <select
                style={fieldStyle}
                disabled={isRegistered}
                value={intent.campaign_intent.objective_type}
                onChange={e => patchCore({ objective_type: e.target.value as CampaignIntentCore['objective_type'] })}
              >
                <option value="INVENTORY_CLEARANCE">Inventory Clearance</option>
                <option value="REVENUE_ACCELERATION">Revenue Acceleration</option>
                <option value="MARKET_DEFENSE">Market Defense</option>
                <option value="LAUNCH">Launch</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Intervention posture</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {(
                  [
                    ['UNDECIDED', 'Undecided — explore first'],
                    ['CONSIDER_PROMOTION', 'Consider promotion'],
                    ['CONSIDER_NON_PROMOTION', 'Consider non-promotion'],
                    ['CONSIDER_DO_NOTHING', 'Consider doing nothing']
                  ] as const
                ).map(([value, label]) => {
                  const selected = intent.campaign_intent.intervention_posture === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={isRegistered}
                      onClick={() => patchCore({ intervention_posture: value })}
                      style={{
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: selected ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
                        background: selected ? 'var(--curiosity-light)' : '#F8FAFC',
                        color: 'var(--text-primary)',
                        cursor: isRegistered ? 'default' : 'pointer',
                        fontSize: '0.8125rem',
                        fontWeight: selected ? 600 : 500
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Framing question</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 72, resize: 'vertical' }}
                disabled={isRegistered}
                value={intent.campaign_intent.framing_question}
                onChange={e => patchCore({ framing_question: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Category</label>
                <input
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.campaign_intent.category}
                  onChange={e => patchCore({ category: e.target.value })}
                />
              </div>
              <div>
                <label style={labelStyle}>SKU scope (comma-separated)</label>
                <input
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.campaign_intent.sku_scope.join(', ')}
                  onChange={e =>
                    patchCore({
                      sku_scope: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })
                  }
                />
              </div>
            </div>

            {intent.campaign_intent.intervention_posture === 'CONSIDER_PROMOTION' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px dashed var(--border)' }}>
                <div>
                  <label style={labelStyle}>Provisional mechanic (optional)</label>
                  <input
                    style={fieldStyle}
                    disabled={isRegistered}
                    placeholder="e.g. 20_percent_off"
                    value={intent.campaign_intent.provisional_mechanic || ''}
                    onChange={e => patchCore({ provisional_mechanic: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Provisional discount depth (optional)</label>
                  <input
                    type="number"
                    style={fieldStyle}
                    disabled={isRegistered}
                    value={intent.campaign_intent.provisional_discount_depth ?? ''}
                    onChange={e =>
                      patchCore({
                        provisional_discount_depth: e.target.value === '' ? undefined : Number(e.target.value)
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {active === 'BASELINE_OBJECTIVE' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Primary metric</label>
                <select
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.baseline_objective.primary_metric}
                  onChange={e => patchBaseline({ primary_metric: e.target.value as BaselineObjective['primary_metric'] })}
                >
                  <option value="VOLUME">Volume</option>
                  <option value="REVENUE">Revenue</option>
                  <option value="CONTRIBUTION">Contribution</option>
                  <option value="WASTE_REDUCTION">Waste Reduction</option>
                  <option value="AVAILABILITY">Availability</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Target direction</label>
                <select
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.baseline_objective.target_direction}
                  onChange={e => patchBaseline({ target_direction: e.target.value as BaselineObjective['target_direction'] })}
                >
                  <option value="INCREASE">Increase</option>
                  <option value="DECREASE">Decrease</option>
                  <option value="PROTECT">Protect</option>
                  <option value="CLEAR">Clear</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Target value (optional)</label>
                <input
                  type="number"
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.baseline_objective.target_value ?? ''}
                  onChange={e =>
                    patchBaseline({
                      target_value: e.target.value === '' ? undefined : Number(e.target.value)
                    })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Unit (optional)</label>
                <input
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.baseline_objective.target_unit || ''}
                  onChange={e => patchBaseline({ target_unit: e.target.value || undefined })}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Capacity / constraint note (optional)</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 64 }}
                disabled={isRegistered}
                value={intent.baseline_objective.capacity_cap_note || ''}
                onChange={e => patchBaseline({ capacity_cap_note: e.target.value || undefined })}
              />
              <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Soft notes only — counterfactual baselines and readiness scoring belong to CDI-02 / CDI-04.
              </p>
            </div>
          </div>
        )}

        {active === 'AUDIENCE_MARKET' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Region</label>
                <input
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.audience_market.region}
                  onChange={e => patchAudience({ region: e.target.value })}
                />
              </div>
              <div>
                <label style={labelStyle}>Customer segment (optional)</label>
                <input
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.audience_market.customer_segment || ''}
                  onChange={e => patchAudience({ customer_segment: e.target.value || undefined })}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Channel (optional)</label>
                <input
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.audience_market.channel || ''}
                  onChange={e => patchAudience({ channel: e.target.value || undefined })}
                />
              </div>
              <div>
                <label style={labelStyle}>Store cohort hint (optional)</label>
                <input
                  style={fieldStyle}
                  disabled={isRegistered}
                  placeholder="Not scored here — CDI-03 owns micro-markets"
                  value={intent.audience_market.store_cohort_hint || ''}
                  onChange={e => patchAudience({ store_cohort_hint: e.target.value || undefined })}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Timing mode</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(
                  [
                    ['FIND_BEST_WINDOW', 'Find the best window'],
                    ['KNOWN_DATES', 'I know my dates']
                  ] as const
                ).map(([value, label]) => {
                  const selected = intent.audience_market.timing_mode === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={isRegistered}
                      onClick={() => patchAudience({ timing_mode: value })}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: selected ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
                        background: selected ? 'var(--curiosity-light)' : '#F8FAFC',
                        cursor: isRegistered ? 'default' : 'pointer',
                        fontSize: '0.8125rem',
                        fontWeight: selected ? 600 : 500,
                        color: 'var(--text-primary)'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {intent.audience_market.timing_mode === 'KNOWN_DATES' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Planned start</label>
                  <input
                    type="datetime-local"
                    style={fieldStyle}
                    disabled={isRegistered}
                    value={(intent.audience_market.planned_start || '').slice(0, 16)}
                    onChange={e =>
                      patchAudience({
                        planned_start: e.target.value ? new Date(e.target.value).toISOString() : undefined
                      })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Planned end</label>
                  <input
                    type="datetime-local"
                    style={fieldStyle}
                    disabled={isRegistered}
                    value={(intent.audience_market.planned_end || '').slice(0, 16)}
                    onChange={e =>
                      patchAudience({
                        planned_end: e.target.value ? new Date(e.target.value).toISOString() : undefined
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {active === 'DECISION_CONTEXT' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={labelStyle}>Contextual factor notes (optional, free-form)</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 72 }}
                disabled={isRegistered}
                placeholder="e.g. Possible weather warmth; competitor activity rumoured — relevance TBD"
                value={(intent.decision_context.contextual_factor_notes || []).join('\n')}
                onChange={e =>
                  patchContext({
                    contextual_factor_notes: e.target.value
                      .split('\n')
                      .map(s => s.trim())
                      .filter(Boolean)
                  })
                }
              />
              <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <HelpCircle size={12} /> Not a mandatory toggle wall — later packages decide material relevance.
              </p>
            </div>
            <div>
              <label style={labelStyle}>Open questions</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 72 }}
                disabled={isRegistered}
                value={(intent.decision_context.open_questions || []).join('\n')}
                onChange={e =>
                  patchContext({
                    open_questions: e.target.value
                      .split('\n')
                      .map(s => s.trim())
                      .filter(Boolean)
                  })
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Assumptions</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 64 }}
                disabled={isRegistered}
                value={(intent.decision_context.assumptions || []).join('\n')}
                onChange={e =>
                  patchContext({
                    assumptions: e.target.value
                      .split('\n')
                      .map(s => s.trim())
                      .filter(Boolean)
                  })
                }
              />
            </div>
          </div>
        )}

        {!isRegistered && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            {active !== 'DECISION_CONTEXT' && (
              <button
                type="button"
                onClick={advance}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--g10x-orange)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                Continue <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}
      </section>

      {/* Actions */}
      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          marginBottom: 16
        }}
      >
        {!isRegistered && (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveDraft}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: '#FFFFFF',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer'
              }}
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={saving || !progress.ready_to_register}
              onClick={handleRegister}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: progress.ready_to_register ? 'var(--g10x-orange)' : '#CBD5E1',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: progress.ready_to_register ? 'pointer' : 'not-allowed'
              }}
            >
              Register Campaign Intent <ArrowRight size={14} />
            </button>
          </>
        )}
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {progress.completed_areas.length}/4 areas structurally complete
          {isRegistered ? ` · Registered ${intent.registered_at}` : ''}
        </span>
      </section>

      {message && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '0.8125rem' }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#FFF1F2', border: '1px solid #FECDD3', color: '#9F1239', fontSize: '0.8125rem' }}>
          {error}
        </div>
      )}

      {/* Layer 2 — CDI-02 Counterfactual & Causal (unlocked after registration) */}
      <section
        style={{
          marginTop: 8,
          marginBottom: 16,
          padding: '18px 20px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: '#FFFFFF'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Layer 2 · CDI-02
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              What does CogniX predict versus doing nothing?
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              Current baseline → expected without intervention → predicted with intervention. Causal drivers reconcile to the predicted uplift. Placeholder mechanics are never attributed.
            </p>
          </div>
          <button
            type="button"
            disabled={evaluating || !isRegistered}
            onClick={handleEvaluate}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: isRegistered ? 'var(--curiosity-light)' : '#F1F5F9',
              color: isRegistered ? 'var(--g10x-orange)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: isRegistered ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap'
            }}
          >
            {evaluating ? 'Evaluating…' : isRegistered ? 'Run evaluation' : 'Register intent first'}
          </button>
        </div>

        {!isRegistered && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={13} /> Register Campaign Intent to unlock counterfactual & causal evaluation.
          </div>
        )}

        {evaluation && (
          <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {[
                ['Current baseline', evaluation.counterfactual.current_baseline],
                ['Without intervention', evaluation.counterfactual.expected_without_intervention],
                ['With intervention', evaluation.counterfactual.predicted_with_intervention]
              ].map(([label, point]: any) => (
                <div key={label} style={{ padding: 12, borderRadius: 8, background: '#F8FAFC', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 650, color: 'var(--text-primary)' }}>{point.volume_index_pct.toFixed(1)}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {point.volume_units.toLocaleString()} units · £{point.contribution_gbp.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: evaluation.counterfactual.campaign_delta.intervention_indistinguishable_from_do_nothing ? '#F8FAFC' : 'var(--curiosity-light)' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Campaign Delta (Do Nothing vs Intervention)
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {evaluation.counterfactual.campaign_delta.volume_delta_units >= 0 ? '+' : ''}
                {evaluation.counterfactual.campaign_delta.volume_delta_units.toLocaleString()} units
                {' · '}
                {evaluation.counterfactual.campaign_delta.contribution_delta_gbp >= 0 ? '+' : ''}
                £{evaluation.counterfactual.campaign_delta.contribution_delta_gbp.toLocaleString()}
              </div>
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {evaluation.counterfactual.campaign_delta.intervention_indistinguishable_from_do_nothing
                  ? 'Predicted path matches do-nothing — no intervention is attributed under this posture. Demand still moves, but not because of us.'
                  : `Attributable to the intervention: ${evaluation.counterfactual.campaign_delta.attributable_uplift_pp.toFixed(2)} pp. Drift and external signals are excluded — they occur either way.`}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Causal demand contributions ({evaluation.causal.total_predicted_uplift_pp.toFixed(2)} pp vs current baseline
                {' · '}
                {evaluation.causal.ambient_uplift_pp.toFixed(2)} pp happens anyway
                {' · '}
                {evaluation.causal.intervention_uplift_pp.toFixed(2)} pp from intervening)
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {evaluation.causal.drivers.filter((d: any) => d.attributed || d.contribution_pp !== 0 || d.driver_id === 'mechanic_response').map((d: any) => (
                  <div key={d.driver_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.8125rem', padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: d.attributed ? 'var(--text-primary)' : 'var(--text-muted)' }}>{d.label}</span>
                      <span style={{ marginLeft: 6, fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: d.driver_class === 'ambient' ? 'var(--text-muted)' : 'var(--g10x-orange)' }}>
                        {d.driver_class === 'ambient' ? 'happens anyway' : 'from intervening'}
                      </span>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{d.rationale}</div>
                    </div>
                    <span style={{ fontWeight: 650, color: d.contribution_pp < 0 ? '#E11D48' : 'var(--text-primary)' }}>
                      {d.contribution_pp >= 0 ? '+' : ''}{d.contribution_pp.toFixed(2)} pp
                    </span>
                  </div>
                ))}
              </div>
              {evaluation.causal.placeholder_fields_excluded?.length > 0 && (
                <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Placeholder fields excluded from causal attribution: {evaluation.causal.placeholder_fields_excluded.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Layer 3 — CDI-03 Opportunity Window & Micro-Market */}
      <section
        style={{
          marginTop: 8,
          marginBottom: 16,
          padding: '18px 20px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: '#FFFFFF'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Layer 3 · CDI-03
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              When and where should we intervene?
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              Deterministic opportunity windows and explainable store/cohort rankings over Enterprise World store data. Synthetic scoring factors are labelled as demo.
            </p>
          </div>
          <button
            type="button"
            disabled={discovering || !isRegistered}
            onClick={handleDiscoverOpportunity}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: isRegistered ? 'var(--curiosity-light)' : '#F1F5F9',
              color: isRegistered ? 'var(--g10x-orange)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: isRegistered ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap'
            }}
          >
            {discovering ? 'Discovering…' : isRegistered ? 'Discover windows & markets' : 'Register intent first'}
          </button>
        </div>

        {!isRegistered && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={13} /> Register Campaign Intent to unlock opportunity window and micro-market discovery.
          </div>
        )}

        {opportunity && (
          <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
            <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--curiosity-light)' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Recommended window ({opportunity.opportunity_windows.timing_mode})
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {opportunity.opportunity_windows.recommended_window.start_date}
                {' → '}
                {opportunity.opportunity_windows.recommended_window.end_date}
                {' · '}
                yield {opportunity.opportunity_windows.recommended_window.yield_score.toFixed(1)}
                {' · '}
                {opportunity.opportunity_windows.recommended_window.tier}
              </div>
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Temporal uplift for CDI-02: {opportunity.opportunity_windows.resolved_temporal_uplift_pp.toFixed(2)} pp
                {opportunity.opportunity_windows.recommended_window.inclusion_reasons?.[0]
                  ? ` — ${opportunity.opportunity_windows.recommended_window.inclusion_reasons[0]}`
                  : ''}
              </div>
              {opportunity.opportunity_windows.discovery_anchor && (
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border)',
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    gap: 6,
                    alignItems: 'flex-start'
                  }}
                >
                  <Lock size={11} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>
                    Seeded demo calendar — candidate windows are generated from a fixed anchor of{' '}
                    <strong>{opportunity.opportunity_windows.discovery_anchor.anchor_date}</strong> for
                    reproducibility. These dates are a planning assumption, not live or current calendar
                    evidence, and do not track today&apos;s date.
                  </span>
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Candidate windows (top 4)
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {opportunity.opportunity_windows.candidates.slice(0, 4).map((w: any) => (
                  <div
                    key={w.window_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: w.window_id === opportunity.opportunity_windows.recommended_window_id ? '#FFF7ED' : '#F8FAFC',
                      border: '1px solid var(--border)',
                      fontSize: '0.75rem'
                    }}
                  >
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {w.start_date} → {w.end_date}
                      {w.is_stated_dates ? ' (stated)' : ''}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {w.yield_score.toFixed(1)} · {w.tier}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Micro-market stores ({opportunity.micro_markets.stores_included} included of {opportunity.micro_markets.stores_evaluated})
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {opportunity.micro_markets.stores.filter((s: any) => s.included).slice(0, 6).map((s: any) => (
                  <div
                    key={s.store_id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '72px 1fr auto',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: '#F8FAFC',
                      border: '1px solid var(--border)',
                      fontSize: '0.75rem'
                    }}
                  >
                    <span style={{ fontWeight: 650, color: 'var(--g10x-orange)' }}>{s.tier}</span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {s.store_name}
                      <span style={{ color: 'var(--text-muted)' }}> · {s.region} · {s.format}</span>
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{s.opportunity_score.toFixed(1)}</span>
                  </div>
                ))}
              </div>
              {opportunity.micro_markets.cohorts?.length > 0 && (
                <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Top cohort: {opportunity.micro_markets.cohorts[0].label} (avg {opportunity.micro_markets.cohorts[0].average_score.toFixed(1)})
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                Scores combine stated campaign scope (region, cohort hint) with synthetic proxies for
                catchment density, staffing capacity and availability. Proxy factors are modelled demo
                estimates, not observed store measurements.
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Layer 4 — CDI-04 Decision Readiness */}
      <section
        style={{
          marginTop: 8,
          marginBottom: 16,
          padding: '18px 20px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: '#FFFFFF'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Layer 4 · CDI-04
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              Are we ready to proceed?
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              Six independent dimensions; aggregation is a floor, never a score. Thresholds are synthetic demonstration policy and never fire vetoes.
            </p>
          </div>
          <button
            type="button"
            disabled={assessing || !isRegistered}
            onClick={handleAssessReadiness}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: isRegistered ? 'var(--curiosity-light)' : '#F1F5F9',
              color: isRegistered ? 'var(--g10x-orange)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: isRegistered ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap'
            }}
          >
            {assessing ? 'Assessing…' : isRegistered ? 'Assess readiness' : 'Register intent first'}
          </button>
        </div>

        {!isRegistered && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={13} /> Register Campaign Intent to unlock readiness assessment.
          </div>
        )}

        {readiness?.readiness && (
          <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--curiosity-light)' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Readiness · {readiness.readiness.state}
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {readiness.readiness.headline}
              </div>
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Confidence {readiness.readiness.confidence.band}
                {typeof readiness.readiness.confidence.confidence_index === 'number'
                  ? ` · index ${readiness.readiness.confidence.confidence_index}`
                  : ''}
                {' · '}
                strength floor {readiness.readiness.confidence.evidence_strength_floor}
                {readiness.readiness.state_caps_applied?.length
                  ? ` · caps ${readiness.readiness.state_caps_applied.join(', ')}`
                  : ''}
              </div>
              {readiness.readiness.commercial_tolerance && (
                <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Commercial class {readiness.readiness.commercial_tolerance.objective_class}
                  {' · '}
                  Δ£{readiness.readiness.commercial_tolerance.contribution_delta_gbp}
                  {readiness.readiness.commercial_tolerance.tolerance_declared
                    ? ` · tolerance headroom £${readiness.readiness.commercial_tolerance.headroom_gbp}`
                    : ''}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setReadinessExpanded(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--g10x-orange)'
              }}
            >
              <ChevronRight size={14} style={{ transform: readinessExpanded ? 'rotate(90deg)' : undefined }} />
              {readinessExpanded ? 'Hide' : 'Show'} six-dimension evidence
            </button>

            {readinessExpanded && (
              <div style={{ display: 'grid', gap: 10 }}>
                {readiness.readiness.dimensions.map((d: any) => (
                  <div key={d.dimension} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#F8FAFC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 650, color: 'var(--text-primary)' }}>{d.dimension}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {d.state} · {d.evidence_strength_floor}
                      </span>
                    </div>
                    {d.not_evaluated_reason && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>{d.not_evaluated_reason}</div>
                    )}
                    {d.findings.map((f: any) => (
                      <div key={f.finding_id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <strong>{f.rule_id}</strong> [{f.evidence.map((e: any) => e.strength).join(', ')}] {f.statement}
                        {/* Seeded/proxy disclosures travel verbatim with the finding they justify (design gate §8.4). */}
                        {f.evidence
                          .filter((e: any) => e.disclosure)
                          .map((e: any, i: number) => (
                            <div
                              key={`${f.finding_id}_disc_${i}`}
                              style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}
                            >
                              {e.field_path} ({e.strength}): {e.disclosure}
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                ))}
                {readiness.readiness.vetoes?.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#9F1239' }}>
                    Vetoes: {readiness.readiness.vetoes.map((v: any) => `${v.veto_id} (${v.veto_basis})`).join('; ')}
                  </div>
                )}
                {readiness.readiness.conditions?.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Conditions: {readiness.readiness.conditions.map((c: any) => c.statement).join(' · ')}
                  </div>
                )}
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  Threshold policy: {readiness.readiness.threshold_policy.provenance} (uncalibrated lab defaults).
                  Resilience evidence is read-only WP10-C DecisionDerivedImpacts — no ripple engine.
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Layer 5 — CDI-05 Decision Timeline */}
      <section
        style={{
          marginTop: 8,
          marginBottom: 16,
          padding: '18px 20px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: '#FFFFFF'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Layer 5 · CDI-05
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              What happens over time — and why?
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              Flat-rate identity timeline of the CDI-02 decision. Ambient movement is shared; only the difference is attributable. No fabricated curves.
            </p>
          </div>
          <button
            type="button"
            disabled={projecting || !isRegistered}
            onClick={handleProjectTimeline}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: isRegistered ? 'var(--curiosity-light)' : '#F1F5F9',
              color: isRegistered ? 'var(--g10x-orange)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: isRegistered ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap'
            }}
          >
            {projecting ? 'Projecting…' : isRegistered ? 'Project timeline' : 'Register intent first'}
          </button>
        </div>

        {!isRegistered && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={13} /> Register Campaign Intent and run evaluation to unlock the timeline.
          </div>
        )}

        {timeline?.projection && (
          <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            {/* Tier 1 — What? */}
            <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--curiosity-light)' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                What? · Attributable effect
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {timeline.projection.tier1.headline}
              </div>
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {timeline.projection.tier1.attributable_uplift_pp.toFixed(2)} pp · Δ£
                {timeline.projection.tier1.contribution_delta_gbp.toLocaleString()} · band{' '}
                {timeline.projection.tier1.confidence_band}
                {timeline.projection.readiness_reference
                  ? ` · readiness ${timeline.projection.readiness_reference.state}`
                  : ''}
                {timeline.projection.readiness_reference?.state === 'DO_NOT_PROCEED'
                  ? ' — intervention trajectory shown as vetoed evidence, not a plan'
                  : ''}
              </div>
              <div style={{ marginTop: 8, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                Pre-campaign: modelled run-rate (not observed history). Post-campaign: not modelled.
                Allocation: FLAT_RATE_IDENTITY. Revenue lens: not available.
              </div>
            </div>

            {/* Timeline chart — straight segments between allocated points only */}
            <TimelineChart projection={timeline.projection} />

            {timelineTier < 2 && (
              <button type="button" onClick={() => setTimelineTier(2)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: 'var(--g10x-orange)', textAlign: 'left' }}>
                Why? → Show ambient vs intervention decomposition
              </button>
            )}

            {timelineTier >= 2 && (
              <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#F8FAFC' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Why? · driver_class partition
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 650 }}>
                      Ambient · {timeline.projection.decomposition.ambient_group.subtotal_pp.toFixed(2)} pp
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {timeline.projection.decomposition.ambient_group.meaning}
                    </div>
                    {timeline.projection.decomposition.ambient_group.rows.map((r: any) => (
                      <div key={r.driver_id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {r.label}: {r.contribution_pp} pp
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 650 }}>
                      Intervention · {timeline.projection.decomposition.intervention_group.subtotal_pp.toFixed(2)} pp
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {timeline.projection.decomposition.intervention_group.meaning}
                    </div>
                    {timeline.projection.decomposition.intervention_group.rows.map((r: any) => (
                      <div key={r.driver_id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {r.label}: {r.contribution_pp} pp{r.attributed ? '' : ' (excluded)'}
                      </div>
                    ))}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                      Residual: {timeline.projection.decomposition.residual_row.contribution_pp} pp
                    </div>
                  </div>
                </div>
                {timelineTier < 3 && (
                  <button type="button" onClick={() => setTimelineTier(3)} style={{ marginTop: 10, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: 'var(--g10x-orange)' }}>
                    Evidence → Show strengths & provenance
                  </button>
                )}
              </div>
            )}

            {timelineTier >= 3 && (
              <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#F8FAFC', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ fontWeight: 650, marginBottom: 6 }}>Evidence</div>
                <div>Allocation: {timeline.projection.allocation_profile} ({timeline.projection.allocation_provenance})</div>
                <div>Grid basis: {timeline.projection.grid.grid_basis}</div>
                <div>Envelope basis: {timeline.projection.provenance.envelope_profile} — calibration target {timeline.projection.provenance.envelope_calibration_target}</div>
                <div>Lenses unavailable: {timeline.projection.provenance.lenses_unavailable}</div>
                <div>
                  Revenue required input: realised_unit_selling_price_gbp (not RRP / not margin assumption)
                </div>
                <div>Placeholder fields excluded: {timeline.projection.provenance.placeholder_fields_excluded}</div>
                <div>
                  Provenance: counterfactual {timeline.projection.provenance.counterfactual_id} · causal{' '}
                  {timeline.projection.provenance.causal_id} · readiness {timeline.projection.provenance.readiness_id} ·
                  opportunity {timeline.projection.provenance.opportunity_evaluation_id} · signals{' '}
                  {timeline.projection.provenance.signal_simulation_id}
                </div>

                {/* Verbatim upstream disclosures — no strength is ever shown without its disclosure */}
                <div style={{ marginTop: 8, fontWeight: 650 }}>Disclosures (verbatim)</div>
                {timeline.projection.lenses
                  .filter((l: any) => l.disclosure)
                  .map((l: any) => (
                    <div key={l.lens}>
                      [{l.strength}] {l.lens}: {l.disclosure}
                    </div>
                  ))}
                {Array.from(
                  new Map(
                    (timeline.projection.markers || [])
                      .filter((m: any) => m.disclosure)
                      .map((m: any) => [m.disclosure, m])
                  ).values()
                ).map((m: any) => (
                  <div key={m.marker_id}>
                    [{m.strength}] {m.source_package}: {m.disclosure}
                  </div>
                ))}

                {/* CDI-04 evidence refs, each with its strength (CDI-04 invariant, unchanged) */}
                {timeline.projection.evidence_refs?.length ? (
                  <>
                    <div style={{ marginTop: 8, fontWeight: 650 }}>CDI-04 readiness evidence</div>
                    {timeline.projection.evidence_refs.slice(0, 8).map((ev: any, i: number) => (
                      <div key={`${ev.field_path}-${i}`}>
                        [{ev.strength}] {ev.source_package} {ev.field_path}: {String(ev.value)}
                        {ev.disclosure ? ` — ${ev.disclosure}` : ''}
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    CDI-04 readiness evidence: NOT_AVAILABLE — no readiness assessment supplied for this projection.
                  </div>
                )}
                {timelineTier < 4 && (
                  <button type="button" onClick={() => setTimelineTier(4)} style={{ marginTop: 10, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: 'var(--g10x-orange)' }}>
                    What If? → Show readiness change triggers
                  </button>
                )}
              </div>
            )}

            {timelineTier >= 4 && (
              <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#F8FAFC', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ fontWeight: 650, marginBottom: 6 }}>What If?</div>
                {(timeline.projection.markers || [])
                  .filter((m: any) => m.marker_type === 'READINESS_CONDITION' || m.marker_type === 'CHANGE_TRIGGER')
                  .slice(0, 6)
                  .map((m: any) => (
                    <div key={m.marker_id}>[{m.strength}] {m.label}</div>
                  ))}
                {!(timeline.projection.markers || []).some(
                  (m: any) => m.marker_type === 'READINESS_CONDITION' || m.marker_type === 'CHANGE_TRIGGER'
                ) && <div>No readiness triggers attached — re-run CDI-04 to populate conditions.</div>}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Layer 6 — CDI-06 Outcome Frontier & Competing Strategies */}
      <section
        style={{
          marginTop: 8,
          marginBottom: 16,
          padding: '18px 20px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: '#FFFFFF'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Layer 6 · CDI-06
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              Outcome Frontier & Competing Strategies
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              Compare admissible plays on two axes only — attributable volume uplift and contribution delta.
              ARF-A ambient frame. No ranking, weights, or utilities.
            </p>
          </div>
          <button
            type="button"
            disabled={evaluatingFrontier || !isRegistered}
            onClick={handleEvaluateFrontier}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: isRegistered ? 'var(--curiosity-light)' : '#F1F5F9',
              color: isRegistered ? 'var(--g10x-orange)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: isRegistered ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap'
            }}
          >
            {evaluatingFrontier ? 'Evaluating…' : isRegistered ? 'Evaluate frontier' : 'Register intent first'}
          </button>
        </div>

        {!isRegistered && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={13} /> Register Campaign Intent to unlock outcome frontier evaluation.
          </div>
        )}

        {frontier?.frontier && (
          <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            {(() => {
              const f = frontier.frontier;
              const selection = f.selection;
              const dominanceByPlay = new Map<string, string[]>(
                (f.dominance || []).map((d: any) => [d.play_id, d.dominated_by || []])
              );
              const orderedPlays = [...(f.plays || [])].sort((a: any, b: any) => {
                if (a.play_kind === 'DO_NOTHING' && b.play_kind !== 'DO_NOTHING') return -1;
                if (b.play_kind === 'DO_NOTHING' && a.play_kind !== 'DO_NOTHING') return 1;
                return 0;
              });
              const activePlay =
                orderedPlays.find((p: any) => p.play_id === selectedPlayId) || orderedPlays[0];
              const excludedPlays = orderedPlays.filter(
                (p: any) => p.admissibility && p.admissibility !== 'ADMISSIBLE'
              );
              const unavailableDims = Array.from(
                new Map(
                  orderedPlays
                    .flatMap((p: any) => p.outcomes?.unavailable || [])
                    .map((u: any) => [u.dimension_id, u])
                ).values()
              );

              const selectionLabel =
                selection?.status === 'SELECTED'
                  ? 'SELECTED'
                  : selection?.status === 'NO_ADMISSIBLE_PLAY'
                    ? 'NO_ADMISSIBLE_PLAY'
                    : selection?.status === 'CHOICE_REQUIRED'
                      ? 'CHOICE_REQUIRED'
                      : null;

              return (
                <>
                  <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--curiosity-light)' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                      Frontier · {f.frontier_status}
                      {selectionLabel ? ` · ${selectionLabel}` : ''}
                    </div>
                    {f.frontier_status === 'NOT_EMITTED' ? (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Frontier not emitted
                        {f.not_emitted_reason ? ` — ${f.not_emitted_reason}` : ''}.
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {(f.axes || []).map((a: any) => a.axis_id).join(' · ')}
                          {' · '}
                          {(f.frontier_play_ids || []).length} on frontier · {orderedPlays.length} plays
                        </div>
                        {selection?.status === 'CHOICE_REQUIRED' && selection.open_trade_off && (
                          <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Open trade-off: {selection.open_trade_off}
                          </div>
                        )}
                        {selection?.status === 'SELECTED' && selection.selected_play_id && (
                          <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Selected under declared constraints: {selection.selected_play_id}
                            {selection.selection_basis ? ` (${selection.selection_basis})` : ''}
                          </div>
                        )}
                        {selection?.status === 'NO_ADMISSIBLE_PLAY' && (
                          <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            No admissible play remains under declared constraints.
                          </div>
                        )}
                        <div style={{ marginTop: 8, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          Ambient frame ARF-A · Scenario 0 always shown · dominated plays stay visible
                        </div>
                      </>
                    )}
                  </div>

                  {f.frontier_status === 'EMITTED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setFrontierDrawerOpen(v => !v)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--g10x-orange)'
                        }}
                      >
                        <ChevronRight
                          size={14}
                          style={{ transform: frontierDrawerOpen ? 'rotate(90deg)' : undefined }}
                        />
                        {frontierDrawerOpen ? 'Hide' : 'Show'} strategy comparison
                      </button>

                      {frontierDrawerOpen && (
                        <div style={{ display: 'grid', gap: 12 }}>
                          {/* Play rail — Scenario 0 always first */}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {orderedPlays.map((play: any) => {
                              const isActive = play.play_id === activePlay?.play_id;
                              const dominated = (dominanceByPlay.get(play.play_id) || []).length > 0;
                              const excluded = play.admissibility && play.admissibility !== 'ADMISSIBLE';
                              return (
                                <button
                                  key={play.play_id}
                                  type="button"
                                  onClick={() => setSelectedPlayId(play.play_id)}
                                  style={{
                                    padding: '8px 10px',
                                    borderRadius: 8,
                                    border: isActive
                                      ? '1px solid var(--g10x-orange)'
                                      : '1px solid var(--border)',
                                    background: isActive ? 'var(--curiosity-light)' : '#F8FAFC',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    maxWidth: 220
                                  }}
                                >
                                  <div>{play.label}</div>
                                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                                    {play.play_kind}
                                    {play.play_kind === 'DO_NOTHING' ? ' · Scenario 0' : ''}
                                    {dominated ? ' · dominated' : ''}
                                    {excluded ? ' · excluded' : ''}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {activePlay && (
                            <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: '#F8FAFC' }}>
                              <div style={{ fontSize: '0.8125rem', fontWeight: 650, color: 'var(--text-primary)', marginBottom: 6 }}>
                                {activePlay.label}
                              </div>
                              {activePlay.play_kind === 'DO_NOTHING' && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.45 }}>
                                  {SCENARIO_ZERO_FRAMING}
                                </div>
                              )}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                                {(activePlay.outcomes?.axes || []).map((axis: any) => (
                                  <div key={axis.axis_id}>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                      {axis.axis_id}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                      {typeof axis.value === 'number' ? axis.value.toFixed(2) : axis.value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {(dominanceByPlay.get(activePlay.play_id) || []).length > 0 && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                                  dominated_by: {(dominanceByPlay.get(activePlay.play_id) || []).join(', ')}
                                </div>
                              )}
                              {activePlay.admissibility && activePlay.admissibility !== 'ADMISSIBLE' && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                                  {activePlay.admissibility}
                                  {activePlay.exclusion_reason ? ` — ${activePlay.exclusion_reason}` : ''}
                                </div>
                              )}
                              {activePlay.economics_completeness && (
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                  Economics: {activePlay.economics_completeness}
                                  {activePlay.confidence_band ? ` · band ${activePlay.confidence_band}` : ''}
                                </div>
                              )}
                            </div>
                          )}

                          {excludedPlays.length > 0 && (
                            <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#FFFFFF' }}>
                              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                                Excluded plays
                              </div>
                              {excludedPlays.map((play: any) => (
                                <div key={`ex_${play.play_id}`} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                                  <strong>{play.label}</strong> · {play.admissibility}
                                  {play.exclusion_reason ? ` — ${play.exclusion_reason}` : ''}
                                </div>
                              ))}
                            </div>
                          )}

                          {unavailableDims.length > 0 && (
                            <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#FFFFFF' }}>
                              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                                Dimensions · NOT_AVAILABLE
                              </div>
                              {unavailableDims.map((dim: any) => (
                                <div key={dim.dimension_id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                                  <div>
                                    <strong>{dim.dimension_id}</strong> · {dim.availability}
                                  </div>
                                  {dim.required_authoritative_input && (
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                      Required: {dim.required_authoritative_input.field}
                                      {dim.required_authoritative_input.grain
                                        ? ` (${dim.required_authoritative_input.grain})`
                                        : ''}
                                      {dim.required_authoritative_input.why_required
                                        ? ` — ${dim.required_authoritative_input.why_required}`
                                        : ''}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {selection?.eliminations?.length > 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Constraint eliminations:{' '}
                              {selection.eliminations
                                .map((e: any) => `${e.play_id} by ${e.constraint_id}`)
                                .join(' · ')}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </section>

      {/* Layer 7 — CDI-07A Decision Contract & Validity */}
      <section
        style={{
          marginTop: 8,
          marginBottom: 16,
          padding: '18px 20px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: '#FFFFFF'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Layer 7 · CDI-07A
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              Decision Contract & Validity
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              Record what was decided under declared constraints, then reassess whether the assumptions still hold.
              No duration claim — validity is assumption evidence only.
            </p>
          </div>
        </div>

        {(() => {
          const f = frontier?.frontier;
          const selection = f?.selection;
          const selectionStatus = selection?.status;
          const canRegisterSelected =
            f?.frontier_status === 'EMITTED' && selectionStatus === 'SELECTED' && Boolean(selection?.selected_play_id);
          const canRegisterChoice = f?.frontier_status === 'EMITTED' && selectionStatus === 'CHOICE_REQUIRED';
          const survivors: string[] = canRegisterChoice ? humanResolvablePlayIds(f) : [];
          const survivorPlays = (f?.plays || []).filter((p: any) => survivors.includes(p.play_id));
          const showRegister = canRegisterSelected || canRegisterChoice;

          return (
            <div style={{ display: 'grid', gap: 12 }}>
              {!frontier?.frontier && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={13} /> Evaluate the outcome frontier first to unlock contract registration.
                </div>
              )}

              {f?.frontier_status === 'EMITTED' && selectionStatus === 'NO_ADMISSIBLE_PLAY' && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  No admissible play remains — a decision contract cannot be registered.
                </div>
              )}

              {canRegisterChoice && !decisionContract && (
                <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: '#F8FAFC', display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Human resolve · CHOICE_REQUIRED
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Explicit attribution is required — no silent contract. Name the resolver, the basis, and one survivor from the open trade-off.
                  </p>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>resolved_by</span>
                    <input
                      type="text"
                      value={humanResolvedBy}
                      onChange={e => setHumanResolvedBy(e.target.value)}
                      placeholder="Who is resolving this choice"
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        fontSize: '0.8125rem',
                        color: 'var(--text-primary)',
                        background: '#FFFFFF'
                      }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>resolution_basis</span>
                    <textarea
                      value={humanResolutionBasis}
                      onChange={e => setHumanResolutionBasis(e.target.value)}
                      placeholder="Why this survivor under the declared trade-off"
                      rows={2}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        fontSize: '0.8125rem',
                        color: 'var(--text-primary)',
                        background: '#FFFFFF',
                        resize: 'vertical'
                      }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>selected play (survivors)</span>
                    <select
                      value={humanSelectedPlayId}
                      onChange={e => setHumanSelectedPlayId(e.target.value)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        fontSize: '0.8125rem',
                        color: 'var(--text-primary)',
                        background: '#FFFFFF'
                      }}
                    >
                      <option value="">Select a survivor…</option>
                      {survivorPlays.map((p: any) => (
                        <option key={p.play_id} value={p.play_id}>
                          {p.label} ({p.play_id})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {showRegister && !decisionContract && (
                <button
                  type="button"
                  disabled={
                    registeringContract ||
                    (canRegisterChoice &&
                      (!humanResolvedBy.trim() || !humanResolutionBasis.trim() || !humanSelectedPlayId.trim()))
                  }
                  onClick={handleRegisterDecisionContract}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--curiosity-light)',
                    color: 'var(--g10x-orange)',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    cursor: registeringContract ? 'wait' : 'pointer'
                  }}
                >
                  {registeringContract ? 'Registering…' : 'Register decision contract'}
                </button>
              )}

              {decisionContract && (
                <>
                  {/* Contract Summary */}
                  <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--curiosity-light)' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Contract Summary · {decisionContract.status}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                      selected_play_id: {decisionContract.resolution?.selected_play_id}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                      route: {decisionContract.resolution?.route}
                      {decisionContract.resolution?.resolved_by
                        ? ` · resolver: ${decisionContract.resolution.resolved_by}`
                        : ''}
                      {decisionContract.resolution?.selection_basis
                        ? ` · selection_basis: ${decisionContract.resolution.selection_basis}`
                        : ''}
                    </div>
                    {decisionContract.resolution?.resolution_statement && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                        resolution basis: {decisionContract.resolution.resolution_statement}
                      </div>
                    )}
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                      contract_id {decisionContract.contract_id?.slice(0, 12)}… · created_as_of {decisionContract.created_as_of}
                    </div>

                    {(decisionContract.basis?.rejected_alternatives || []).length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                          Rejected alternatives
                        </div>
                        {(decisionContract.basis.rejected_alternatives as any[]).map((alt: any) => (
                          <div key={alt.play_id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                            <strong>{alt.label || alt.play_id}</strong> · {alt.cause}
                            {alt.dominated_by?.length ? ` · dominated_by ${alt.dominated_by.join(', ')}` : ''}
                            {alt.elimination?.constraint_id ? ` · constraint ${alt.elimination.constraint_id}` : ''}
                          </div>
                        ))}
                      </div>
                    )}

                    {decisionContract.basis?.scenario_zero && (
                      <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#FFFFFF' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                          Scenario 0
                          {decisionContract.basis.scenario_zero.was_selected ? ' · selected' : ''}
                          {decisionContract.basis.scenario_zero.dominated ? ' · dominated (still present)' : ''}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: 8 }}>
                          {decisionContract.basis.scenario_zero.framing || SCENARIO_ZERO_FRAMING}
                        </div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          outcome_snapshot: {formatOutcomeSnapshot(decisionContract.basis.scenario_zero.outcome_snapshot)}
                        </div>
                        {decisionContract.basis.scenario_zero.dominated_by?.length > 0 && (
                          <div style={{ marginTop: 4, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            dominated_by: {decisionContract.basis.scenario_zero.dominated_by.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tier 1 — Compact Validity Indicator (state word only) */}
                  {validityAssessment && (
                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                        Validity
                      </div>
                      <span style={validityStateStyle(validityAssessment.state)}>
                        {validityAssessment.state}
                      </span>
                    </div>
                  )}

                  {/* Tier 2 — Validity Evidence drawer */}
                  {validityAssessment && (
                    <>
                      <button
                        type="button"
                        onClick={() => setValidityDrawerOpen(v => !v)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--g10x-orange)',
                          alignSelf: 'flex-start'
                        }}
                      >
                        <ChevronRight
                          size={14}
                          style={{ transform: validityDrawerOpen ? 'rotate(90deg)' : undefined }}
                        />
                        {validityDrawerOpen ? 'Hide' : 'Show'} validity evidence
                      </button>

                      {validityDrawerOpen && (
                        <div style={{ display: 'grid', gap: 12 }}>
                          <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#F8FAFC' }}>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                              Assumptions · held_at_resolution
                            </div>
                            {(decisionContract.assumptions || []).map((a: any) => (
                              <div key={a.assumption_id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                                <strong>{a.assumption_id}</strong> [{a.assumption_class}] held_at_resolution={String(a.held_at_resolution)}
                                {a.load_bearing ? ' · load-bearing' : ''}
                              </div>
                            ))}
                          </div>

                          <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#F8FAFC' }}>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                              Trigger evaluations
                            </div>
                            {(validityAssessment.half_life_basis?.triggers_evaluated || []).map((te: any) => (
                              <div key={te.trigger_id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                                <div>
                                  <strong>{te.trigger_id}</strong> · {te.outcome}
                                  {te.outcome === 'FIRED' && te.observed_value !== undefined
                                    ? ` · moved to ${String(te.observed_value)}`
                                    : ''}
                                </div>
                                {te.outcome === 'UNASSESSABLE' && te.unassessable_reason && (
                                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    UNASSESSABLE: {te.unassessable_reason}
                                  </div>
                                )}
                                {te.movement_attribution && (
                                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    movement_attribution: {te.movement_attribution}
                                  </div>
                                )}
                                {te.statement && (
                                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    {te.statement}
                                  </div>
                                )}
                              </div>
                            ))}
                            {(validityAssessment.half_life_basis?.unassessable_assumptions || []).map((u: any) => (
                              <div key={`ua_${u.assumption_id}`} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                                unassessable assumption {u.assumption_id}: {u.reason}
                              </div>
                            ))}
                          </div>

                          <div style={{ padding: 12, borderRadius: 8, border: '1px dashed var(--border)', background: '#FFFFFF' }}>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                              QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                              {(
                                validityAssessment.half_life_basis?.quantitative_measure ||
                                QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT
                              ).field}
                              {' — '}
                              {(
                                validityAssessment.half_life_basis?.quantitative_measure ||
                                QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT
                              ).status}
                            </div>
                            <div style={{ marginTop: 4, fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                              {(
                                validityAssessment.half_life_basis?.quantitative_measure ||
                                QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT
                              ).why_required}
                            </div>
                          </div>

                          <div style={{ padding: 12, borderRadius: 8, border: '1px dashed var(--border)', background: '#FFFFFF' }}>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                              NOT_A_PREDICTION_DISCLOSURE
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                              {validityAssessment.half_life_basis?.not_a_prediction_disclosure ||
                                NOT_A_PREDICTION_DISCLOSURE}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          );
        })()}
      </section>

      {/* Explicit non-implementation of CDI-07B+ — locked teaser only */}
      <section
        style={{
          marginTop: 8,
          padding: '16px 18px',
          borderRadius: 12,
          border: '1px dashed var(--border)',
          background: '#F8FAFC'
        }}
      >
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Next decision layers (not in CDI-07A)
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {FUTURE_LAYERS.map(layer => (
            <div
              key={layer.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)'
              }}
            >
              <Lock size={13} color="var(--text-muted)" />
              <span style={{ fontWeight: 600, color: 'var(--text-muted)', width: 72 }}>{layer.id}</span>
              {layer.label}
            </div>
          ))}
        </div>
        {onNavigateToExperiment && (
          <button
            type="button"
            onClick={() => onNavigateToExperiment('EXP-OPPORTUNITY-04')}
            style={{
              marginTop: 14,
              background: 'transparent',
              border: 'none',
              color: 'var(--g10x-orange)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0
            }}
          >
            Explore related Opportunity Intelligence →
          </button>
        )}
      </section>
    </div>
  );
}
