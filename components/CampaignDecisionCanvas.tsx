'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  History,
  FileText,
  Scale,
  Eye,
  Layers,
  Lock,
  RotateCcw,
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
  deriveCanvasProgress,
  validateCampaignIntentCore,
  validateBaselineObjective,
  validateAudienceMarket,
  validateDecisionContextArea
} from '@/packages/contracts/src/campaign-intent-model';
import {
  CampaignDecisionExperiment,
  ExperimentComparison,
  ExecutionBrief,
  MAX_COMPARISON_EXPERIMENTS,
  mapReadinessStateToVerdict,
  readinessVerdictLabel,
  formatContributionGbp,
  formatDemandPct
} from '@/packages/contracts/src/campaign-experiment-model';
import {
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_SEGMENTS,
  CAMPAIGN_CHANNELS,
  CAMPAIGN_ACTIVATIONS,
  resolveCategory,
  resolveSegment,
  resolveChannel,
  categoryLabel,
  segmentLabel,
  channelLabel,
  activationLabel,
  isActivationCompatible,
  discountIsConfinableToSegment,
  executionLeadTimeDays,
  addressableReachShare
} from '@/packages/contracts/src/campaign-decision-taxonomy-model';
import {
  listCampaignExperimentsClient,
  saveCampaignExperimentClient,
  compareCampaignExperimentsClient,
  fetchExecutionBriefClient
} from '@/lib/campaign-experiment-client';
import {
  suggestDecisionContextClient,
  type DecisionContextSuggestionType
} from '@/lib/campaign-decision-suggestion-client';
import { ExperimentHistoryDrawer } from '@/components/campaign/ExperimentHistoryDrawer';
import { ExperimentComparisonModal } from '@/components/campaign/ExperimentComparisonModal';
import { ExecutionBriefModal } from '@/components/campaign/ExecutionBriefModal';
import {
  fetchCurrentCampaignIntent,
  registerCampaignIntentClient,
  saveCampaignIntentDraftClient,
  evaluateCampaignDecisionClient,
  discoverCampaignOpportunityClient,
  evaluateCampaignReadinessClient,
  projectDecisionTimelineClient,
  evaluateOutcomeFrontierClient,
  resetCampaignDecisionSessionClient
} from '@/lib/campaign-intent-client';
import {
  DECISION_STAGE_LANGUAGE,
  formatAxisValue,
  humanise as humaniseToken,
  label as executiveLabel,
  phrase as executivePhrase
} from '@/lib/campaign-decision-language';
import {
  createDecisionContractClient,
  assessDecisionValidityClient
} from '@/lib/decision-contract-client';
import {
  createLearningCandidateClient,
  createPreMortemClient,
  fetchPreMortemClient,
  runPredictionComparisonClient
} from '@/lib/learning-loop-client';
import { SCENARIO_ZERO_FRAMING } from '@/packages/contracts/src/campaign-frontier-model';
import {
  DecisionResolution,
  NOT_A_PREDICTION_DISCLOSURE,
  QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT
} from '@/packages/contracts/src/campaign-decision-contract-model';
import {
  type CampaignPreMortem,
  type ConsequenceOrder,
  type LearningCandidate,
  type PredictionOutcomeComparison,
  type QuantityComparison,
  type ResilienceEvidence,
  DERIVED_IMPACT_SCOPE_DISCLOSURE,
  LEARNING_ELIGIBILITY_CONDITION_IDS,
  NOT_A_DECISION_VERDICT_DISCLOSURE,
  OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT,
  PATTERN_PROMOTION_REQUIRED_INPUT,
  PATTERN_TELEMETRY_DISCLOSURE,
  QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT,
  SINGLE_CASE_DISCLOSURE,
  SYNTHETIC_OBSERVATION_DISCLOSURE
} from '@/packages/contracts/src/campaign-learning-loop-model';
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

/** Later packages only — CDI-07B is Layer 8 on this canvas. */
const FUTURE_LAYERS: Array<{ id: string; label: string }> = [];

const CONSEQUENCE_ORDER_SEQUENCE: ConsequenceOrder[] = [
  'FIRST_ORDER',
  'SECOND_ORDER',
  'THIRD_ORDER'
];

const CONSEQUENCE_ORDER_LABEL: Record<ConsequenceOrder, string> = {
  FIRST_ORDER: 'First-order consequences',
  SECOND_ORDER: 'Second-order consequences',
  THIRD_ORDER: 'Third-order consequences'
};

/** Fixed demo reference instant — never Date.now() for decision semantics (C-INV-9). */
const CANVAS_EVALUATION_TIMESTAMP = '2026-08-15T12:00:00.000Z';

type SuggestionField = DecisionContextSuggestionType;

interface SuggestionSlot {
  loading: boolean;
  items: string[];
  selected: string[];
  error: string | null;
}

type SuggestionStateMap = Partial<Record<SuggestionField, SuggestionSlot | null>>;

/**
 * Route to customer as one line: where they transact, and how the campaign reaches them.
 * "Store" alone does not say whether the campaign runs on shelf edge, through CRM, or both.
 */
function describeRouteToCustomer(channel?: string, activations?: string[]): string {
  const base = channelLabel(channel);
  const routes = (activations || []).map(a => activationLabel(a));
  return routes.length > 0 ? `${base} · via ${routes.join(', ')}` : base;
}

/**
 * An engine field path rendered for a planner: `micro_markets.stores_included` reads as
 * "micro markets — stores included". Used only where a contract supplies no prose reason of
 * its own; the raw path stays available as provenance.
 */
function humaniseFieldPath(path?: string): string {
  if (!path) return 'an authoritative input the estate does not yet hold';
  return path
    .split('.')
    .map(part => part.replace(/_/g, ' ').trim())
    .filter(Boolean)
    .join(' — ');
}

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
/**
 * Why the overall readiness position was held below what the dimensions alone would give.
 *
 * The caps do not share a cause, so they cannot share a sentence: K7 fires on negative
 * contribution and K8 on an operational capacity gap, while the remainder are evidence
 * limits. The raw cap ids stay on the element's title as technical provenance.
 */
function describeReadinessCaps(caps: string[]): string {
  const commercial = caps.includes('K7');
  const operational = caps.includes('K8');
  const evidence = caps.some(c => c !== 'K7' && c !== 'K8');
  const reasons: string[] = [];
  if (commercial) reasons.push('negative contribution');
  if (operational) reasons.push('an operational capacity gap');
  if (evidence) reasons.push('limited evidence');
  if (reasons.length === 0) return 'overall position held back';
  const joined =
    reasons.length === 1
      ? reasons[0]
      : `${reasons.slice(0, -1).join(', ')} and ${reasons[reasons.length - 1]}`;
  return `overall position held back by ${joined}`;
}

function humanResolvablePlayIds(frontier: any): string[] {
  const ids: string[] = [...(frontier?.frontier_play_ids || [])];
  for (const p of frontier?.plays || []) {
    if (p.admissibility !== 'ADMISSIBLE') continue;
    if (p.play_kind !== 'DO_NOTHING') continue;
    if (!ids.includes(p.play_id)) ids.push(p.play_id);
  }
  return ids.sort((a, b) => a.localeCompare(b));
}

function resilienceForFailureMode(
  preMortem: CampaignPreMortem,
  failureModeId: string
): ResilienceEvidence[] {
  return preMortem.resilience.filter(r => r.failure_mode_id === failureModeId);
}

function orderEligibilityConditions(candidate: LearningCandidate) {
  return LEARNING_ELIGIBILITY_CONDITION_IDS.map(id =>
    candidate.eligibility.conditions.find(c => c.condition_id === id)
  ).filter(Boolean) as LearningCandidate['eligibility']['conditions'];
}

function comparisonIsLikeForLike(comparison: QuantityComparison): boolean {
  return comparison.comparability === 'LIKE_FOR_LIKE';
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

/**
 * A message shown to the planner, optionally carrying the engine code that produced it.
 * The engine's rejection id (RJ-C2, R5, …) is real provenance and is kept — but it is relegated
 * to the element's title so the banner reads as a sentence rather than a fault code. The
 * message itself is never softened: the engine's own wording is passed through unchanged.
 */
type SurfaceNotice = { message: string; code?: string };

const noticeText = (notice: string | SurfaceNotice | null): string =>
  notice === null ? '' : typeof notice === 'string' ? notice : notice.message;

const noticeProvenance = (notice: string | SurfaceNotice | null): string | undefined =>
  notice !== null && typeof notice !== 'string' && notice.code
    ? `Engine rejection id: ${notice.code}`
    : undefined;

export default function CampaignDecisionCanvas({
  onNavigateToExperiment
}: CampaignDecisionCanvasProps = {}) {
  const [intent, setIntent] = useState<CampaignIntent | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | SurfaceNotice | null>(null);
  const [liveEvaluation, setEvaluation] = useState<any | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [liveOpportunity, setOpportunity] = useState<any | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [liveReadiness, setReadiness] = useState<any | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [readinessExpanded, setReadinessExpanded] = useState(false);
  const [liveTimeline, setTimeline] = useState<any | null>(null);
  const [projecting, setProjecting] = useState(false);
  const [timelineTier, setTimelineTier] = useState(1);
  const [liveFrontier, setFrontier] = useState<any | null>(null);
  const [evaluatingFrontier, setEvaluatingFrontier] = useState(false);
  const [frontierDrawerOpen, setFrontierDrawerOpen] = useState(false);
  const [excludedPlaysOpen, setExcludedPlaysOpen] = useState(false);
  const [provenanceOpen, setProvenanceOpen] = useState(false);
  const [selectedPlayId, setSelectedPlayId] = useState<string | null>(null);
  const [evaluationTimestamp] = useState(CANVAS_EVALUATION_TIMESTAMP);
  const [liveDecisionContract, setDecisionContract] = useState<any | null>(null);
  const [liveValidityAssessment, setValidityAssessment] = useState<any | null>(null);
  const [validityDrawerOpen, setValidityDrawerOpen] = useState(false);
  const [registeringContract, setRegisteringContract] = useState(false);
  const [humanResolvedBy, setHumanResolvedBy] = useState('');
  const [humanResolutionBasis, setHumanResolutionBasis] = useState('');
  const [humanSelectedPlayId, setHumanSelectedPlayId] = useState('');
  const [preMortem, setPreMortem] = useState<CampaignPreMortem | null>(null);
  const [predictionComparison, setPredictionComparison] = useState<PredictionOutcomeComparison | null>(
    null
  );
  const [learningCandidate, setLearningCandidate] = useState<LearningCandidate | null>(null);
  const [loadingLayer8, setLoadingLayer8] = useState(false);
  const [layer8Error, setLayer8Error] = useState<string | SurfaceNotice | null>(null);

  // Experiment History & Comparison & Execution Brief States
  const [experimentsList, setExperimentsList] = useState<CampaignDecisionExperiment[]>([]);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [reviewedExperiment, setReviewedExperiment] = useState<CampaignDecisionExperiment | null>(null);
  const [comparisonModalData, setComparisonModalData] = useState<ExperimentComparison | null>(null);
  const [executionBriefData, setExecutionBriefData] = useState<ExecutionBrief | null>(null);

  /**
   * The experiment identity the decision currently on screen owns, or null while a new decision
   * is being drafted. The server is the authority — it survives a browser refresh, which component
   * state would not — but a ref mirrors it synchronously so two preservation calls fired in the
   * same tick cannot each believe they are the first.
   */
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(null);

  /**
   * Draft suggestions live here and nowhere else until the planner accepts them.
   *
   * Keeping them out of `intent` is the whole boundary: an unaccepted draft is never part of
   * the governed CampaignIntent, is never preserved into an experiment, and cannot become
   * evidence. Reset clears this alongside the decision itself.
   */
  const [suggestionState, setSuggestionState] = useState<SuggestionStateMap>({});
  const activeExperimentIdRef = useRef<string | null>(null);
  const preservingRef = useRef(false);

  const rememberActiveExperimentId = (id: string | null) => {
    activeExperimentIdRef.current = id;
    setActiveExperimentId(id);
  };

  const refreshExperimentsList = async () => {
    const res = await listCampaignExperimentsClient();
    if (res?.experiments) {
      setExperimentsList(res.experiments);
      rememberActiveExperimentId(res.active_experiment_id ?? null);
    }
  };

  useEffect(() => {
    trackJourneyEvent({
      event_type: 'EXPERIMENT_OPENED',
      source: 'campaign_decision_canvas',
      page: 'campaign-decision',
      experiment_id: 'EXP-CDI-01',
      metadata: { package: 'CDI-01' }
    });
    refreshExperimentsList();
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

  useEffect(() => {
    if (!intent || !liveDecisionContract?.contract_id || !liveDecisionContract?.contract_digest) {
      setPreMortem(null);
      setPredictionComparison(null);
      setLearningCandidate(null);
      setLayer8Error(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoadingLayer8(true);
      setLayer8Error(null);

      let pm = await fetchPreMortemClient({
        contract_id: liveDecisionContract.contract_id,
        tenant_id: intent.tenant_id,
        session_id: intent.session_id
      });

      if (!pm) {
        const created = await createPreMortemClient({
          contract_id: liveDecisionContract.contract_id,
          tenant_id: intent.tenant_id,
          session_id: intent.session_id,
          created_as_of: evaluationTimestamp,
          contract_digest: liveDecisionContract.contract_digest
        });
        if (cancelled) return;
        if (!created.pre_mortem) {
          setPreMortem(null);
          setPredictionComparison(null);
          setLearningCandidate(null);
          setLayer8Error({
            message: created.error || 'Pre-mortem unavailable for this contract.',
            code: created.rejection_id
          });
          setLoadingLayer8(false);
          return;
        }
        pm = created.pre_mortem;
      }

      if (cancelled) return;
      setPreMortem(pm);

      const comparisonResult = await runPredictionComparisonClient({
        contract_id: liveDecisionContract.contract_id,
        tenant_id: intent.tenant_id,
        session_id: intent.session_id,
        as_of: evaluationTimestamp,
        contract_digest: liveDecisionContract.contract_digest,
        category: intent.campaign_intent.category
      });

      if (cancelled) return;
      if (!comparisonResult.comparison) {
        setPredictionComparison(null);
        setLearningCandidate(null);
        setLayer8Error({
          message: comparisonResult.error || 'Prediction comparison unavailable for this contract.',
          code: comparisonResult.rejection_id
        });
        setLoadingLayer8(false);
        return;
      }
      setPredictionComparison(comparisonResult.comparison);

      const candidateResult = await createLearningCandidateClient({
        contract_id: liveDecisionContract.contract_id,
        tenant_id: intent.tenant_id,
        session_id: intent.session_id,
        comparison: comparisonResult.comparison,
        comparison_id: comparisonResult.comparison.comparison_id,
        contract_digest: liveDecisionContract.contract_digest,
        created_as_of: evaluationTimestamp
      });

      if (cancelled) return;
      if (!candidateResult.candidate) {
        setLearningCandidate(null);
        setLayer8Error({
          message: candidateResult.error || 'Learning candidate unavailable for this contract.',
          code: candidateResult.rejection_id
        });
        setLoadingLayer8(false);
        return;
      }
      setLearningCandidate(candidateResult.candidate);
      setLoadingLayer8(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    intent?.tenant_id,
    intent?.session_id,
    liveDecisionContract?.contract_id,
    liveDecisionContract?.contract_digest,
    evaluationTimestamp
  ]);

  if (!intent) {
    return (
      <div className="page-content animate-fade" style={{ maxWidth: 920, margin: '0 auto', padding: '48px 24px', color: 'var(--text-muted)' }}>
        Loading Campaign Decision Canvas…
      </div>
    );
  }

  // Historical view vs active decision
  const isHistoricalView = !!reviewedExperiment;
  const displayedIntent = isHistoricalView && reviewedExperiment ? reviewedExperiment.intent_snapshot : intent;
  /*
   * Every analysis panel below reads these names, not the live state hooks. Binding them
   * here — rather than adding parallel `displayed*` aliases the panels could forget to use —
   * is what makes historical review actually historical: a panel physically cannot render
   * the live session's analysis against a preserved decision, because the live value is only
   * reachable under its `live*` name, which no panel references.
   *
   * A preserved experiment carries no validity snapshot, so historical review shows no
   * validity assessment at all. Showing the live one would assert that a check run against
   * today's decision was run against this one.
   */
  const evaluation = isHistoricalView && reviewedExperiment ? reviewedExperiment.evaluation_snapshot : liveEvaluation;
  const opportunity = isHistoricalView && reviewedExperiment ? reviewedExperiment.opportunity_snapshot : liveOpportunity;
  const readiness = isHistoricalView && reviewedExperiment ? reviewedExperiment.readiness_snapshot : liveReadiness;
  const timeline = isHistoricalView && reviewedExperiment ? reviewedExperiment.timeline_snapshot : liveTimeline;
  const frontier = isHistoricalView && reviewedExperiment ? reviewedExperiment.frontier_snapshot : liveFrontier;
  const decisionContract = isHistoricalView && reviewedExperiment ? reviewedExperiment.contract_snapshot : liveDecisionContract;
  const validityAssessment = isHistoricalView ? null : liveValidityAssessment;

  /**
   * What the decision on screen is called. Three honest states, and no fourth:
   * a historical experiment under review, the live decision once it owns a preserved
   * experiment id, and a new decision that has not earned one yet.
   */
  const decisionIdentityLabel =
    isHistoricalView && reviewedExperiment
      ? `Reviewing ${reviewedExperiment.experiment_id}`
      : activeExperimentId
      ? activeExperimentId
      : 'New Decision';

  const progress = deriveCanvasProgress(displayedIntent);
  const active = displayedIntent.canvas_progress.active_area;
  const isRegistered = displayedIntent.status === 'REGISTERED';
  const isFieldsDisabled = isRegistered || isHistoricalView;
  const stageIndex = CAMPAIGN_CANVAS_AREA_ORDER.indexOf(active);
  const isLastStage = stageIndex === CAMPAIGN_CANVAS_AREA_ORDER.length - 1;

  /**
   * The decision dimensions resolved to their taxonomy definitions.
   *
   * These read `displayedIntent`, not `intent`, so reviewing a historical experiment shows
   * the dimensions that decision was taken on rather than whatever the live draft now holds.
   */
  const selectedCategory = resolveCategory(displayedIntent.campaign_intent.category);
  const selectedSegment = resolveSegment(displayedIntent.audience_market.customer_segment);
  const selectedChannel = resolveChannel(displayedIntent.audience_market.channel);
  const selectedActivations = displayedIntent.audience_market.activation_channels || [];

  /**
   * What the chosen audience and route imply, stated before the analysis runs.
   *
   * Each line is derived from the taxonomy, and each names a consequence a planner would
   * otherwise discover only after committing: how much of the base is addressable, whether a
   * discount can be confined to the people it was meant for, how long the slowest route
   * takes to go live, and any activation that cannot reach the chosen sales channel at all.
   */
  const audienceReachNote = (() => {
    const notes: string[] = [];
    if (!selectedSegment && !selectedChannel && selectedActivations.length === 0) return null;

    if (selectedSegment || selectedChannel) {
      const reach = addressableReachShare(
        displayedIntent.audience_market.customer_segment,
        displayedIntent.audience_market.channel
      );
      notes.push(
        `Addressable reach is about ${(reach * 100).toFixed(0)}% of trade — ${segmentLabel(
          displayedIntent.audience_market.customer_segment
        ).toLowerCase()} through ${channelLabel(displayedIntent.audience_market.channel).toLowerCase()}.`
      );
    }

    if (
      selectedSegment &&
      selectedSegment.id !== 'ALL_CUSTOMERS' &&
      !discountIsConfinableToSegment(
        displayedIntent.audience_market.customer_segment,
        displayedIntent.audience_market.channel,
        selectedActivations
      )
    ) {
      notes.push(
        `This route cannot confine an offer to ${selectedSegment.display_label.toLowerCase()}, so any discount is paid across the whole base. Add a personalised activation route, or an online channel, to target it.`
      );
    }

    const incompatible = selectedActivations.filter(
      a => !isActivationCompatible(displayedIntent.audience_market.channel, a)
    );
    if (incompatible.length > 0) {
      notes.push(
        `${incompatible.map(a => activationLabel(a)).join(', ')} does not reach customers buying through ${channelLabel(
          displayedIntent.audience_market.channel
        ).toLowerCase()}.`
      );
    }

    if (selectedChannel) {
      const leadDays = executionLeadTimeDays(displayedIntent.audience_market.channel, selectedActivations);
      notes.push(
        `Slowest route needs about ${leadDays} working days to go live. ${selectedChannel.primary_execution_risk}`
      );
    }

    if (selectedSegment && selectedSegment.evidence_basis === 'DEMO_ASSUMPTION') {
      notes.push(`Segment is a stated planning intent, not a measured audience. ${selectedSegment.evidence_requirement}`);
    }

    return notes.length > 0 ? notes : null;
  })();

  function isAreaValid(targetIntent: CampaignIntent, area: CampaignCanvasArea): boolean {
    if (area === 'CAMPAIGN_INTENT') return targetIntent.campaign_intent ? validateCampaignIntentCore(targetIntent.campaign_intent).valid : false;
    if (area === 'BASELINE_OBJECTIVE') return targetIntent.baseline_objective ? validateBaselineObjective(targetIntent.baseline_objective).valid : false;
    if (area === 'AUDIENCE_MARKET') return targetIntent.audience_market ? validateAudienceMarket(targetIntent.audience_market).valid : false;
    if (area === 'DECISION_CONTEXT') return targetIntent.decision_context ? validateDecisionContextArea(targetIntent.decision_context).valid : false;
    return false;
  }

  const isCurrentStageValid = isAreaValid(displayedIntent, active);
  const stageComplete = progress.completed_areas.includes(active);

  // Registering confirms the stage in view, so every other stage must already be confirmed.
  // The rail lets the user jump straight to the last stage; without this a decision could be
  // registered — and preserved as an experiment — having reviewed nothing at all.
  const unreviewedOtherStages = CAMPAIGN_CANVAS_AREA_ORDER.filter(
    a => a !== active && !progress.completed_areas.includes(a)
  );
  const canRegisterDecision = isCurrentStageValid && unreviewedOtherStages.length === 0;

  /**
   * Preserve the decision currently being worked on as a Campaign Decision Experiment.
   *
   * Preservation gate: a decision earns an experiment identity once it is a registered intent
   * that has produced an evaluated result. Before that there is no analytical result worth
   * reviewing or comparing, and preserving the form alone would put an empty record in history.
   *
   * Idempotency: this runs after evaluation, opportunity, readiness, frontier and contract
   * registration. All of those belong to ONE decision, so every call after the first carries the
   * identity already assigned and deepens that record. Only Start New Decision releases it.
   */
  const preserveCurrentExperiment = async (
    currentIntent: CampaignIntent,
    evalData?: any,
    oppData?: any,
    readData?: any,
    frontData?: any,
    contractData?: any
  ) => {
    if (!currentIntent) return;
    if (currentIntent.status !== 'REGISTERED') return;
    if (!evalData) return;
    if (preservingRef.current) return;
    preservingRef.current = true;
    // Read the engines at the field paths they actually publish. CDI-02 carries the campaign
    // delta on the counterfactual, CDI-04 reports a readiness state, and CDI-06 exposes a
    // selection rather than a named recommendation. Reading fields that do not exist is what
    // silently preserved every decision as +0.0%, +£0 and "Ready".
    const campaignDelta = evalData?.counterfactual?.campaign_delta;
    const demandPct = campaignDelta?.attributable_uplift_pp ?? evalData?.causal?.intervention_uplift_pp ?? 0;
    const contribGbp = campaignDelta?.contribution_delta_gbp ?? 0;

    const readinessState = readData?.readiness?.state;
    const readinessVerdict = mapReadinessStateToVerdict(readinessState);
    const readinessSummary =
      readData?.readiness?.headline ?? 'Operational readiness has not been assessed for this decision.';

    // CDI-06 either resolves to one admissible play or leaves an open trade-off for a human.
    // Neither state may be reported as a recommendation the engine did not make.
    const frontierResult = frontData?.frontier;
    const selection = frontierResult?.selection;
    const selectedPlay = (frontierResult?.plays || []).find(
      (p: any) => p.play_id === selection?.selected_play_id
    );
    const recommendation = selectedPlay?.label
      ? selectedPlay.label
      : !frontierResult
      ? 'Outcome frontier not yet evaluated'
      : selection?.status === 'CHOICE_REQUIRED'
      ? 'Choice required — competing admissible plays'
      : 'No admissible play selected';
    const tradeOff =
      selection?.open_trade_off ??
      (frontierResult ? 'No open trade-off recorded for this frontier.' : 'Trade-off not yet evaluated.');

    const expPayload: Partial<CampaignDecisionExperiment> = {
      campaign_intent_id: currentIntent.campaign_intent_id,
      framing_question: currentIntent.campaign_intent.framing_question,
      objective_type: currentIntent.campaign_intent.objective_type,
      objective_label: executiveLabel('campaign_objective', currentIntent.campaign_intent.objective_type),
      category: currentIntent.campaign_intent.category,
      sku_scope: currentIntent.campaign_intent.sku_scope,
      region: currentIntent.audience_market.region,
      audience_segment: currentIntent.audience_market.customer_segment,
      // Route to customer is preserved on the record so history, comparison and the brief
      // all read the channel this decision was actually taken on.
      sales_channel: currentIntent.audience_market.channel,
      activation_channels: currentIntent.audience_market.activation_channels,
      timing_mode: currentIntent.audience_market.timing_mode,
      planned_window: currentIntent.audience_market.planned_start && currentIntent.audience_market.planned_end
        ? `${currentIntent.audience_market.planned_start} to ${currentIntent.audience_market.planned_end}`
        : 'Optimal discovery window',
      intervention_posture: currentIntent.campaign_intent.intervention_posture,
      posture_label: executiveLabel('intervention_posture', currentIntent.campaign_intent.intervention_posture),
      primary_metric: currentIntent.baseline_objective.primary_metric,
      target_direction: currentIntent.baseline_objective.target_direction,
      major_constraints: currentIntent.baseline_objective.capacity_cap_note ? [currentIntent.baseline_objective.capacity_cap_note] : [],
      decision_recommendation: recommendation,
      incremental_demand_pct: demandPct,
      contribution_impact_gbp: contribGbp,
      readiness_status: readinessVerdict,
      readiness_summary: readinessSummary,
      selected_strategy_id: selectedPlay?.play_id,
      selected_strategy_name: selectedPlay?.label,
      primary_trade_off: tradeOff,
      evidence_posture: currentIntent.synthetic_demo ? 'Demonstration evidence basis: uncalibrated simulation data' : 'Attested counterfactual baseline',
      technical_provenance: {
        ...currentIntent.provenance,
        intent_id: currentIntent.campaign_intent_id,
        session_id: currentIntent.session_id,
        tenant_id: currentIntent.tenant_id
      },
      intent_snapshot: currentIntent,
      evaluation_snapshot: evalData,
      opportunity_snapshot: oppData,
      readiness_snapshot: readData,
      frontier_snapshot: frontData,
      contract_snapshot: contractData
    };

    try {
      const saved = await saveCampaignExperimentClient({
        ...expPayload,
        // Null on the first preservation of a decision: that is what asks the server for a new
        // identity. Every later call sends the id back so the same record is updated.
        ...(activeExperimentIdRef.current ? { experiment_id: activeExperimentIdRef.current } : {})
      });
      if (saved) {
        rememberActiveExperimentId(saved.experiment_id);
        await refreshExperimentsList();
      }
    } finally {
      preservingRef.current = false;
    }
  };

  const invalidateDownstreamState = () => {
    if (evaluation || opportunity || readiness || timeline || frontier) {
      setEvaluation(null);
      setOpportunity(null);
      setReadiness(null);
      setTimeline(null);
      setFrontier(null);
      setDecisionContract(null);
      setValidityAssessment(null);
      setPreMortem(null);
      setPredictionComparison(null);
      setLearningCandidate(null);
    }
  };

  const updateIntent = (next: CampaignIntent) => {
    if (isHistoricalView) return;
    const withProgress = { ...next, canvas_progress: deriveCanvasProgress(next) };
    withProgress.canvas_progress.active_area = next.canvas_progress.active_area;
    setIntent(withProgress);
  };

  const setActiveArea = (area: CampaignCanvasArea) => {
    if (isHistoricalView && reviewedExperiment) {
      setReviewedExperiment({
        ...reviewedExperiment,
        intent_snapshot: {
          ...reviewedExperiment.intent_snapshot,
          canvas_progress: {
            ...reviewedExperiment.intent_snapshot.canvas_progress,
            active_area: area
          }
        }
      });
      return;
    }
    updateIntent({
      ...intent,
      canvas_progress: { ...intent.canvas_progress, active_area: area }
    });
  };

  const patchCore = (patch: Partial<CampaignIntentCore>) => {
    if (isHistoricalView) return;
    invalidateDownstreamState();
    updateIntent({
      ...intent,
      campaign_intent: { ...intent.campaign_intent, ...patch }
    });
  };

  const patchBaseline = (patch: Partial<BaselineObjective>) => {
    if (isHistoricalView) return;
    invalidateDownstreamState();
    updateIntent({
      ...intent,
      baseline_objective: { ...intent.baseline_objective, ...patch }
    });
  };

  const patchAudience = (patch: Partial<AudienceMarket>) => {
    if (isHistoricalView) return;
    invalidateDownstreamState();
    updateIntent({
      ...intent,
      audience_market: { ...intent.audience_market, ...patch }
    });
  };

  const patchContext = (patch: Partial<DecisionContextArea>) => {
    if (isHistoricalView) return;
    // Open questions feed readiness rule S6, so editing decision context after an assessment
    // leaves that assessment answering a question set the decision no longer holds. The other
    // three areas already invalidate downstream analysis; this one was the exception.
    invalidateDownstreamState();
    updateIntent({
      ...intent,
      decision_context: { ...intent.decision_context, ...patch }
    });
  };

  const handleSaveDraft = async () => {
    if (isHistoricalView || !intent) return;
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
    if (isHistoricalView || !intent) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    // Registering confirms the stage the user is on, exactly as Save & Continue does on the
    // earlier stages. It does not retrospectively mark stages the user never reviewed — a
    // checkmark has to mean someone looked at it.
    const currentCompleted = intent.canvas_progress?.completed_areas || [];
    const nextCompleted = currentCompleted.includes(active) ? currentCompleted : [...currentCompleted, active];
    const intentToRegister: CampaignIntent = {
      ...intent,
      canvas_progress: {
        ...intent.canvas_progress,
        completed_areas: nextCompleted,
        ready_to_register: true
      }
    };
    const result = await registerCampaignIntentClient(intentToRegister);
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
    let resolvedEvalResult = evalResult;
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
        if (resolvedEval) {
          resolvedEvalResult = resolvedEval;
          setEvaluation(resolvedEval);
        }
      }
    }

    // Preserve this completed experiment
    await preserveCurrentExperiment(result.intent, resolvedEvalResult, opp);
  };

  const handleEvaluate = async () => {
    // Every sibling analysis handler refuses while a historical experiment is on screen.
    // Without this guard, re-evaluating during review would overwrite the live decision's
    // analysis from a snapshot the user is only reading.
    if (isHistoricalView || !intent) return;
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
    await preserveCurrentExperiment(intent, evalResult, opportunity, readiness, frontier, decisionContract);
  };

  const handleDiscoverOpportunity = async () => {
    if (isHistoricalView || !intent) return;
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
    await preserveCurrentExperiment(intent, evaluation, opp, readiness, frontier, decisionContract);
  };

  const handleAssessReadiness = async () => {
    if (isHistoricalView || !intent) return;
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
    await preserveCurrentExperiment(intent, evaluation, opportunity, result, frontier, decisionContract);
  };

  const handleProjectTimeline = async () => {
    if (isHistoricalView || !intent) return;
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
    if (isHistoricalView || !intent) return;
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
    setPreMortem(null);
    setPredictionComparison(null);
    setLearningCandidate(null);
    setLayer8Error(null);
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
    await preserveCurrentExperiment(intent, evaluation, opportunity, readiness, result, decisionContract);
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
          'Recording this decision needs three things: who is deciding, why, and which of the remaining options they are choosing.'
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
      setError({
        message: created.error || 'Decision contract registration failed.',
        code: created.rejection_id
      });
      return;
    }

    setDecisionContract(created.contract);
    await preserveCurrentExperiment(intent, evaluation, opportunity, readiness, frontier, created.contract);
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
      setError({
        message: validity.error || 'Validity assessment failed.',
        code: validity.rejection_id
      });
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

  const goBack = () => {
    const idx = CAMPAIGN_CANVAS_AREA_ORDER.indexOf(active);
    if (idx > 0) {
      setActiveArea(CAMPAIGN_CANVAS_AREA_ORDER[idx - 1]);
    }
  };

  /**
   * Persist the draft, then advance. Saving before advancing is what makes backward
   * navigation safe: a field entered on stage 2 survives a trip back to stage 1 because
   * it is already on the server, not only in component state.
   */
  const handleSaveAndContinue = async () => {
    if (isHistoricalView || !intent) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const currentCompleted = intent.canvas_progress?.completed_areas || [];
    const nextCompleted = currentCompleted.includes(active) ? currentCompleted : [...currentCompleted, active];
    const idx = CAMPAIGN_CANVAS_AREA_ORDER.indexOf(active);
    const nextArea =
      idx < CAMPAIGN_CANVAS_AREA_ORDER.length - 1 ? CAMPAIGN_CANVAS_AREA_ORDER[idx + 1] : active;

    const intentToSave: CampaignIntent = {
      ...intent,
      canvas_progress: {
        ...intent.canvas_progress,
        completed_areas: nextCompleted,
        active_area: nextArea,
        ready_to_register: nextCompleted.length === 4
      }
    };

    const saved = await saveCampaignIntentDraftClient(intentToSave);
    setSaving(false);
    if (!saved) {
      setError('Could not save this stage. Check the required fields above.');
      return;
    }
    setIntent(saved);
  };

  const handleResetDecision = async () => {
    const confirmed =
      typeof window === 'undefined' ||
      window.confirm(
        isRegistered
          ? 'Start a new decision? The registered decision, its assessment and any contract for this session will be cleared. Seeded world data and preserved historical experiments are unaffected.'
          : 'Reset this decision? Everything entered so far for this session will be cleared. Seeded world data and preserved historical experiments are unaffected.'
      );
    if (!confirmed) return;

    setResetting(true);
    setError(null);
    setMessage(null);
    const result = await resetCampaignDecisionSessionClient();
    if (!result.intent) {
      setResetting(false);
      setError(result.error || 'Could not reset this decision.');
      return;
    }

    // Clear every downstream analysis slot: a new decision must never inherit the previous
    // decision's analysis, and an empty slot is honest where a stale one would not be.
    setEvaluation(null);
    setOpportunity(null);
    setReadiness(null);
    setTimeline(null);
    setFrontier(null);
    setDecisionContract(null);
    setValidityAssessment(null);
    setPreMortem(null);
    setPredictionComparison(null);
    setLearningCandidate(null);
    setReviewedExperiment(null);
    setComparisonModalData(null);
    setExecutionBriefData(null);
    // Unaccepted drafts belong to the decision that asked for them. Carrying them into a new
    // decision would offer context written about a campaign that no longer exists.
    setSuggestionState({});
    // Release this session's claim on the current experiment identity. The record itself stays
    // in history; the next preserved decision earns the next number rather than reopening it.
    preservingRef.current = false;
    rememberActiveExperimentId(null);
    setIntent(result.intent);
    setResetting(false);
    setMessage('Decision reset. Start a new decision from Campaign Intent.');
    await refreshExperimentsList();
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenExecutionBriefForExperiment = async (exp: CampaignDecisionExperiment) => {
    const brief = await fetchExecutionBriefClient(exp.experiment_id);
    if (brief) {
      setExecutionBriefData(brief);
    } else {
      setError(`Could not fetch execution brief for ${exp.experiment_id}`);
    }
  };

  const handleOpenExecutionBrief = async () => {
    // Resolve the brief against the decision actually on screen. Falling back to the newest
    // entry in history would hand the user another decision's brief the moment any history
    // exists, which is exactly the kind of silent snapshot swap this surface must not do.
    const targetExp = isHistoricalView
      ? reviewedExperiment
      : activeExperimentId
      ? experimentsList.find(e => e.experiment_id === activeExperimentId) || null
      : null;
    if (targetExp) {
      await handleOpenExecutionBriefForExperiment(targetExp);
      return;
    }
    if (!displayedIntent) return;
    // Fallback brief for a decision that has not yet been preserved. It reads the same engine
    // field paths as preservation does, so a brief and its experiment can never disagree.
    const liveDelta = evaluation?.counterfactual?.campaign_delta;
    const liveDemand = liveDelta?.attributable_uplift_pp ?? evaluation?.causal?.intervention_uplift_pp ?? 0;
    const liveContrib = liveDelta?.contribution_delta_gbp ?? 0;
    const demandFormatted = formatDemandPct(liveDemand);
    const contribFormatted = formatContributionGbp(liveContrib);
    const brief: ExecutionBrief = {
      brief_id: `BRIEF-${displayedIntent.campaign_intent_id.substring(0, 14)}`,
      // Not an experiment id: this decision has not been preserved, so it has no EXP number.
      experiment_id: 'Current decision (not yet preserved)',
      tenant_id: displayedIntent.tenant_id,
      session_id: displayedIntent.session_id,
      generated_at: new Date().toISOString(),
      proposal: {
        title: `${executiveLabel('campaign_objective', displayedIntent.campaign_intent.objective_type)} — ${categoryLabel(displayedIntent.campaign_intent.category)} (${displayedIntent.audience_market.region})`,
        // Posture labels are noun phrases ("Consider promotion", "Open on approach"), so they
        // read as the subject of the sentence rather than as an adjective inside one.
        recommendation: `${executiveLabel('intervention_posture', displayedIntent.campaign_intent.intervention_posture)} for ${displayedIntent.campaign_intent.sku_scope.join(', ')} in ${displayedIntent.audience_market.region}, reaching ${segmentLabel(displayedIntent.audience_market.customer_segment).toLowerCase()} through ${channelLabel(displayedIntent.audience_market.channel).toLowerCase()}.`,
        category_and_sku: `${categoryLabel(displayedIntent.campaign_intent.category)} · Scope: ${displayedIntent.campaign_intent.sku_scope.join(', ')}`,
        region_and_window: `${displayedIntent.audience_market.region} · Optimal discovery window`
      },
      rationale: {
        summary: `Optimises ${executiveLabel('campaign_objective', displayedIntent.campaign_intent.objective_type).toLowerCase()} by delivering ${demandFormatted} incremental demand and ${contribFormatted} contribution.`,
        key_drivers: [
          `Attributable demand uplift of ${demandFormatted} isolated from baseline counterfactual run-rate.`,
          `Net financial contribution delta of ${contribFormatted} after cost and elasticity dynamics.`
        ]
      },
      expected_impact: {
        incremental_demand: demandFormatted,
        contribution_impact: contribFormatted,
        readiness_verdict: readinessVerdictLabel(mapReadinessStateToVerdict(readiness?.readiness?.state)),
        trade_off_balance:
          frontier?.frontier?.selection?.open_trade_off || 'Trade-off not yet evaluated.'
      },
      operational_scope: {
        region: displayedIntent.audience_market.region,
        timing: 'Optimal discovery window',
        audience: segmentLabel(displayedIntent.audience_market.customer_segment),
        // Reads the chosen route to customer. This was previously the constant
        // 'Omnichannel', which reported a channel the planner had not selected.
        channel: describeRouteToCustomer(
          displayedIntent.audience_market.channel,
          displayedIntent.audience_market.activation_channels
        )
      },
      material_constraints: displayedIntent.baseline_objective.capacity_cap_note ? [displayedIntent.baseline_objective.capacity_cap_note] : ['Capacity constraint to be monitored'],
      decision_triggers: [
        'Supplier capacity fluctuation > 15% triggers re-evaluation.',
        'Market competitor price action during promotion window triggers re-evaluation.'
      ],
      evidence_and_trust: {
        posture: displayedIntent.synthetic_demo ? 'Demonstration evidence basis: uncalibrated simulation data' : 'Attested counterfactual baseline',
        synthetic_disclosure: 'Demonstration evidence basis: uncalibrated simulation data for exploration.'
      },
      next_step: {
        action: 'Prepare Commitment Handoff',
        description: 'Package commercial parameters and constraint boundaries for stakeholder alignment.',
        execution_boundary_notice: 'CogniX has prepared this execution brief as decision guidance. No external campaign systems have been executed or modified.'
      },
      technical_provenance: {
        intent_id: displayedIntent.campaign_intent_id,
        schema_version: displayedIntent.schema_version
      }
    };
    setExecutionBriefData(brief);
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

  const fieldHintStyle: CSSProperties = {
    margin: '6px 0 0',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    lineHeight: 1.45
  };

  const contextFieldHeaderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
    flexWrap: 'wrap'
  };

  const suggestionNoticeStyle: CSSProperties = {
    marginTop: 8,
    padding: '8px 11px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: '#F8FAFC',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  };

  /**
   * Ask the assistant to draft items for one decision-context field.
   *
   * The request carries the decision as configured — category, audience, route, objective —
   * so the drafts are about this campaign rather than about retail in general. Nothing is
   * written to the intent here: drafts land in local state and reach the record only when
   * the planner accepts them.
   */
  const handleSuggest = async (field: SuggestionField) => {
    if (isFieldsDisabled) return;
    setSuggestionState(prev => ({
      ...prev,
      [field]: { loading: true, items: [], selected: [], error: null }
    }));

    const outcome = await suggestDecisionContextClient({
      suggestion_type: field,
      tenant_id: intent.tenant_id,
      session_id: intent.session_id,
      context: {
        category: intent.campaign_intent.category,
        sku_scope: intent.campaign_intent.sku_scope,
        objective_type: intent.campaign_intent.objective_type,
        intervention_posture: intent.campaign_intent.intervention_posture,
        customer_segment: intent.audience_market.customer_segment,
        channel: intent.audience_market.channel,
        activation_channels: intent.audience_market.activation_channels,
        region: intent.audience_market.region,
        timing_mode: intent.audience_market.timing_mode,
        primary_metric: intent.baseline_objective.primary_metric,
        existing_contextual_factors: intent.decision_context.contextual_factor_notes,
        existing_open_questions: intent.decision_context.open_questions,
        existing_assumptions: intent.decision_context.assumptions,
        synthetic_demo: intent.synthetic_demo
      }
    });

    setSuggestionState(prev => ({
      ...prev,
      [field]: outcome.ok
        ? { loading: false, items: outcome.result.suggestions, selected: [], error: null }
        : // The planner's own text is untouched and the field stays editable — a failed
          // suggestion must cost nothing but the click.
          { loading: false, items: [], selected: [], error: outcome.message }
    }));
  };

  /** Append the checked drafts to the field the planner asked them for. */
  const handleAcceptSuggestions = (field: SuggestionField) => {
    // Registration freezes the intent and historical review is read-only. Without this the
    // accept path wrote into a registered decision — and in historical review `patchContext`
    // returned early while the slot was cleared regardless, silently discarding the drafts the
    // planner had just ticked.
    if (isFieldsDisabled) return;
    const slot = suggestionState[field];
    if (!slot || slot.selected.length === 0) return;
    const accepted = slot.selected;

    // The accepted lines keep their draft provenance on the record. Storing them as bare text
    // left the intent unable to say which context the planner wrote and which arrived as a
    // draft they approved — the distinction the NON_AUTHORITATIVE_DRAFT stamp exists to make.
    const draftProvenance = [
      ...(intent.decision_context.assistant_drafted_entries || []),
      ...accepted
    ];

    if (field === 'CONTEXTUAL_FACTORS') {
      patchContext({
        contextual_factor_notes: [...(intent.decision_context.contextual_factor_notes || []), ...accepted],
        assistant_drafted_entries: draftProvenance
      });
    } else if (field === 'OPEN_QUESTIONS') {
      patchContext({
        open_questions: [...(intent.decision_context.open_questions || []), ...accepted],
        assistant_drafted_entries: draftProvenance
      });
    } else {
      patchContext({
        assumptions: [...(intent.decision_context.assumptions || []), ...accepted],
        assistant_drafted_entries: draftProvenance
      });
    }

    setSuggestionState(prev => ({ ...prev, [field]: null }));
  };

  const SuggestWithAiButton = ({ field }: { field: SuggestionField }) => {
    const slot = suggestionState[field];
    return (
      <button
        type="button"
        disabled={isFieldsDisabled || slot?.loading}
        onClick={() => handleSuggest(field)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 9px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: '#FFFFFF',
          color: isFieldsDisabled ? 'var(--text-muted)' : 'var(--g10x-orange)',
          fontSize: '0.6875rem',
          fontWeight: 650,
          cursor: isFieldsDisabled || slot?.loading ? 'not-allowed' : 'pointer'
        }}
      >
        <Sparkles size={11} />
        {slot?.loading ? 'Drafting…' : 'Suggest with AI'}
      </button>
    );
  };

  const SuggestionPanel = ({ field }: { field: SuggestionField }) => {
    const slot = suggestionState[field];
    if (!slot) return null;

    if (slot.error) {
      return (
        <div role="status" style={suggestionNoticeStyle}>
          {slot.error}
        </div>
      );
    }
    if (slot.loading || slot.items.length === 0) return null;

    const toggle = (item: string) =>
      setSuggestionState(prev => {
        const current = prev[field];
        if (!current) return prev;
        const selected = current.selected.includes(item)
          ? current.selected.filter(s => s !== item)
          : [...current.selected, item];
        return { ...prev, [field]: { ...current, selected } };
      });

    return (
      <div
        style={{
          marginTop: 8,
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #FED7AA',
          background: 'var(--curiosity-light)',
          display: 'grid',
          gap: 8
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 650,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--g10x-orange)'
            }}
          >
            AI-assisted suggestions
          </span>
          <button
            type="button"
            onClick={() => setSuggestionState(prev => ({ ...prev, [field]: null }))}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.6875rem',
              color: 'var(--text-muted)'
            }}
          >
            Dismiss
          </button>
        </div>

        <div style={{ display: 'grid', gap: 5 }}>
          {slot.items.map((item, i) => (
            <label
              key={i}
              style={{
                display: 'flex',
                gap: 7,
                alignItems: 'flex-start',
                fontSize: '0.8125rem',
                color: 'var(--text-primary)',
                lineHeight: 1.45,
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={slot.selected.includes(item)}
                onChange={() => toggle(item)}
                style={{ marginTop: 3, cursor: 'pointer' }}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            Drafts only — edit after adding. Nothing is recorded until you add it.
          </span>
          <button
            type="button"
            disabled={slot.selected.length === 0}
            onClick={() => handleAcceptSuggestions(field)}
            style={{
              padding: '5px 11px',
              borderRadius: 6,
              border: 'none',
              background: slot.selected.length > 0 ? 'var(--g10x-orange)' : '#CBD5E1',
              color: '#FFFFFF',
              fontSize: '0.6875rem',
              fontWeight: 650,
              cursor: slot.selected.length > 0 ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap'
            }}
          >
            Add selected ({slot.selected.length})
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="page-content animate-fade" style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 64 }}>
      {/* Hero framing — curiosity first, not a control dashboard */}
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
        <div>
          {/*
            Decision identity. This slot names the decision on screen and nothing else: an
            experiment number appears here only once a real experiment record exists. CDI-01 is
            the capability this surface implements, not an experiment instance, so it is stated
            as a capability reference further down where it cannot be read as "experiment 1".
          */}
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--g10x-orange)', marginBottom: 8 }}>
            {decisionIdentityLabel}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 650, color: 'var(--text-primary)', margin: '0 0 10px', lineHeight: 1.25 }}>
            What if promotional decisions first asked whether to intervene at all?
          </h1>
          <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)', maxWidth: 720, lineHeight: 1.55 }}>
            This canvas establishes intent and constraints. Promotion is one possible lever — alongside non-promotion interventions and doing nothing. Prediction, readiness, and trade-offs arrive in later packages.
          </p>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {displayedIntent.synthetic_demo && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px' }}>
                <Sparkles size={12} /> Synthetic demo intent · schema {displayedIntent.schema_version}
              </div>
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Capability reference CDI-01 · Campaign Decision Intelligence
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setHistoryDrawerOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: '#FFFFFF',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: 'pointer'
            }}
            title="Open Experiment History"
          >
            <History size={14} color="var(--g10x-orange)" />
            <span>Experiment History</span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                background: 'var(--curiosity-light)',
                color: 'var(--g10x-orange)',
                padding: '2px 6px',
                borderRadius: 999
              }}
            >
              {experimentsList.length}
            </span>
          </button>

          {(evaluation || isRegistered) && (
            <button
              type="button"
              onClick={handleOpenExecutionBrief}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--g10x-orange)',
                background: 'var(--curiosity-light)',
                color: 'var(--g10x-orange)',
                fontWeight: 650,
                fontSize: '0.8125rem',
                cursor: 'pointer'
              }}
              title="Open Executive Execution Brief"
            >
              <FileText size={14} />
              <span>Execution Brief</span>
            </button>
          )}
        </div>
      </header>

      {/* Historical Review Banner (when inspecting past experiment) */}
      {isHistoricalView && reviewedExperiment && (
        <div
          style={{
            background: '#FEF3C7',
            border: '1px solid #FDE68A',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: '#B45309', letterSpacing: '0.06em' }}>
              Historical Decision Experiment
            </div>
            <div
              style={{ fontSize: '0.9375rem', fontWeight: 650, color: '#92400E', marginTop: 2 }}
              title={`category: ${reviewedExperiment.category}`}
            >
              Reviewing {reviewedExperiment.experiment_id} · {reviewedExperiment.objective_label} ({resolveCategory(reviewedExperiment.category)?.display_label || reviewedExperiment.category}) · Preserved {new Date(reviewedExperiment.completed_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#A16207', marginTop: 2 }}>
              Inputs and analytical findings are displayed in read-only mode. Active session decision is unaffected.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => handleOpenExecutionBriefForExperiment(reviewedExperiment)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 6,
                border: '1px solid #D97706',
                background: '#FFFFFF',
                color: '#92400E',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <FileText size={13} />
              View Brief
            </button>
            <button
              type="button"
              onClick={() => setReviewedExperiment(null)}
              style={{
                padding: '7px 14px',
                borderRadius: 6,
                border: 'none',
                background: '#D97706',
                color: '#FFFFFF',
                fontSize: '0.8125rem',
                fontWeight: 650,
                cursor: 'pointer'
              }}
            >
              Return to Active Decision
            </button>
          </div>
        </div>
      )}

      {/* Progressive area rail — clean checkmarks and active stage indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {CAMPAIGN_CANVAS_AREA_ORDER.map(area => {
          const done = progress.completed_areas.includes(area);
          const selected = active === area;
          return (
            <button
              key={area}
              type="button"
              onClick={() => setActiveArea(area)}
              title={`${AREA_META[area].title} — ${done ? 'Reviewed' : selected ? 'Current' : 'Not reviewed'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 8,
                border: selected ? '1.5px solid var(--g10x-orange)' : '1px solid var(--border)',
                background: selected ? 'var(--curiosity-light)' : '#FFFFFF',
                color: selected ? 'var(--g10x-orange)' : done ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: selected ? 650 : 500,
                transition: 'all 0.15s ease'
              }}
            >
              {done ? (
                <CheckCircle2 size={15} color="var(--success, #059669)" />
              ) : (
                <span style={{ opacity: selected ? 1 : 0.45, fontWeight: 700 }}>{AREA_META[area].step}</span>
              )}
              {AREA_META[area].title}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {progress.completed_areas.length} of 4 stages reviewed
          {isRegistered ? ' · Decision registered' : ''}
        </span>
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
                disabled={isFieldsDisabled}
                value={displayedIntent.campaign_intent.objective_type}
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
                  const selected = displayedIntent.campaign_intent.intervention_posture === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={isFieldsDisabled}
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
                disabled={isFieldsDisabled}
                value={displayedIntent.campaign_intent.framing_question}
                onChange={e => patchCore({ framing_question: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select
                  style={fieldStyle}
                  disabled={isFieldsDisabled}
                  value={resolveCategory(displayedIntent.campaign_intent.category)?.id || ''}
                  onChange={e => patchCore({ category: e.target.value })}
                >
                  {!resolveCategory(displayedIntent.campaign_intent.category) && (
                    <option value="">
                      {displayedIntent.campaign_intent.category
                        ? `${displayedIntent.campaign_intent.category} (not in catalogue)`
                        : 'Select a category'}
                    </option>
                  )}
                  {CAMPAIGN_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.display_label}
                    </option>
                  ))}
                </select>
                {selectedCategory && (
                  <p style={fieldHintStyle}>
                    {selectedCategory.planning_note} {selectedCategory.sku_count} lines,{' '}
                    {selectedCategory.supplier_count === 0
                      ? 'no catalogued supplier'
                      : `${selectedCategory.supplier_count} supplier${selectedCategory.supplier_count === 1 ? '' : 's'}`}
                    .
                  </p>
                )}
              </div>
              <div>
                <label style={labelStyle}>SKU scope (comma-separated)</label>
                <input
                  style={fieldStyle}
                  disabled={isFieldsDisabled}
                  value={displayedIntent.campaign_intent.sku_scope.join(', ')}
                  onChange={e =>
                    patchCore({
                      sku_scope: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })
                  }
                />
              </div>
            </div>

            {displayedIntent.campaign_intent.intervention_posture === 'CONSIDER_PROMOTION' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px dashed var(--border)' }}>
                <div>
                  <label style={labelStyle}>Provisional mechanic (optional)</label>
                  <input
                    style={fieldStyle}
                    disabled={isFieldsDisabled}
                    placeholder="e.g. 20% off"
                    value={displayedIntent.campaign_intent.provisional_mechanic || ''}
                    onChange={e => patchCore({ provisional_mechanic: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Provisional discount depth (optional)</label>
                  <input
                    type="number"
                    style={fieldStyle}
                    disabled={isFieldsDisabled}
                    value={displayedIntent.campaign_intent.provisional_discount_depth ?? ''}
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
                  disabled={isFieldsDisabled}
                  value={displayedIntent.baseline_objective.primary_metric}
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
                  disabled={isFieldsDisabled}
                  value={displayedIntent.baseline_objective.target_direction}
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
                  disabled={isFieldsDisabled}
                  value={displayedIntent.baseline_objective.target_value ?? ''}
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
                  disabled={isFieldsDisabled}
                  value={displayedIntent.baseline_objective.target_unit || ''}
                  onChange={e => patchBaseline({ target_unit: e.target.value || undefined })}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Capacity / constraint note (optional)</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 64 }}
                disabled={isFieldsDisabled}
                value={displayedIntent.baseline_objective.capacity_cap_note || ''}
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
                  disabled={isFieldsDisabled}
                  value={displayedIntent.audience_market.region}
                  onChange={e => patchAudience({ region: e.target.value })}
                />
              </div>
              <div>
                <label style={labelStyle}>Customer segment</label>
                <select
                  style={fieldStyle}
                  disabled={isFieldsDisabled}
                  value={resolveSegment(displayedIntent.audience_market.customer_segment)?.id || ''}
                  onChange={e => patchAudience({ customer_segment: e.target.value || undefined })}
                >
                  {!resolveSegment(displayedIntent.audience_market.customer_segment) && (
                    <option value="">
                      {displayedIntent.audience_market.customer_segment
                        ? `${displayedIntent.audience_market.customer_segment} (unclassified)`
                        : 'Not targeted'}
                    </option>
                  )}
                  {CAMPAIGN_SEGMENTS.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.display_label}
                    </option>
                  ))}
                </select>
                {selectedSegment && <p style={fieldHintStyle}>{selectedSegment.planning_note}</p>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Sales channel</label>
                <select
                  style={fieldStyle}
                  disabled={isFieldsDisabled}
                  value={resolveChannel(displayedIntent.audience_market.channel)?.id || ''}
                  onChange={e => patchAudience({ channel: e.target.value || undefined })}
                >
                  {!resolveChannel(displayedIntent.audience_market.channel) && (
                    <option value="">
                      {displayedIntent.audience_market.channel
                        ? `${displayedIntent.audience_market.channel} (unclassified)`
                        : 'Not specified'}
                    </option>
                  )}
                  {CAMPAIGN_CHANNELS.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.display_label}
                    </option>
                  ))}
                </select>
                {selectedChannel && <p style={fieldHintStyle}>{selectedChannel.planning_note}</p>}
              </div>
              <div>
                <label style={labelStyle}>Store cohort hint (optional)</label>
                <input
                  style={fieldStyle}
                  disabled={isFieldsDisabled}
                  placeholder="Not scored here — CDI-03 owns micro-markets"
                  value={displayedIntent.audience_market.store_cohort_hint || ''}
                  onChange={e => patchAudience({ store_cohort_hint: e.target.value || undefined })}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Activation routes (optional)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CAMPAIGN_ACTIVATIONS.map(a => {
                  const chosen = (displayedIntent.audience_market.activation_channels || []).includes(a.id);
                  const compatible = isActivationCompatible(displayedIntent.audience_market.channel, a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      disabled={isFieldsDisabled}
                      title={a.planning_note}
                      onClick={() => {
                        const current = intent.audience_market.activation_channels || [];
                        patchAudience({
                          activation_channels: chosen
                            ? current.filter(v => v !== a.id)
                            : [...current, a.id]
                        });
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 999,
                        border: chosen ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
                        background: chosen ? 'var(--curiosity-light)' : '#FFFFFF',
                        color: chosen ? 'var(--g10x-orange)' : 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: isFieldsDisabled ? 'not-allowed' : 'pointer',
                        opacity: !compatible && chosen ? 0.75 : 1
                      }}
                    >
                      {a.display_label}
                    </button>
                  );
                })}
              </div>
              <p style={fieldHintStyle}>
                How the campaign reaches the customer. Kept separate from the sales channel
                because a shelf-edge price cut and a personalised offer are different decisions.
              </p>
            </div>

            {audienceReachNote && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#F8FAFC',
                  border: '1px dashed var(--border)',
                  display: 'grid',
                  gap: 5
                }}
              >
                <div
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 650,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)'
                  }}
                >
                  What this reach implies
                </div>
                {audienceReachNote.map((note, i) => (
                  <p key={i} style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {note}
                  </p>
                ))}
              </div>
            )}

            <div>
              <label style={labelStyle}>Timing mode</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(
                  [
                    ['FIND_BEST_WINDOW', 'Find the best window'],
                    ['KNOWN_DATES', 'I know my dates']
                  ] as const
                ).map(([value, label]) => {
                  const selected = displayedIntent.audience_market.timing_mode === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={isFieldsDisabled}
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
            {displayedIntent.audience_market.timing_mode === 'KNOWN_DATES' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Planned start</label>
                  <input
                    type="datetime-local"
                    style={fieldStyle}
                    disabled={isFieldsDisabled}
                    value={(displayedIntent.audience_market.planned_start || '').slice(0, 16)}
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
                    disabled={isFieldsDisabled}
                    value={(displayedIntent.audience_market.planned_end || '').slice(0, 16)}
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
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <div style={contextFieldHeaderStyle}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>What else is going on?</label>
                <SuggestWithAiButton field="CONTEXTUAL_FACTORS" />
              </div>
              <textarea
                style={{ ...fieldStyle, minHeight: 72 }}
                disabled={isFieldsDisabled}
                placeholder="One per line — warm weather forecast, competitor activity rumoured, supplier under review"
                value={(displayedIntent.decision_context.contextual_factor_notes || []).join('\n')}
                onChange={e =>
                  patchContext({
                    contextual_factor_notes: e.target.value
                      .split('\n')
                      .map(s => s.trim())
                      .filter(Boolean)
                  })
                }
              />
              <p style={fieldHintStyle}>
                External factors worth keeping in view. Nothing here is scored — later stages
                decide what turns out to be material.
              </p>
              <SuggestionPanel field="CONTEXTUAL_FACTORS" />
            </div>

            <div>
              <div style={contextFieldHeaderStyle}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>What do we still need to resolve?</label>
                <SuggestWithAiButton field="OPEN_QUESTIONS" />
              </div>
              <textarea
                style={{ ...fieldStyle, minHeight: 72 }}
                disabled={isFieldsDisabled}
                placeholder="One per line — questions that should be answered before committing"
                value={(displayedIntent.decision_context.open_questions || []).join('\n')}
                onChange={e =>
                  patchContext({
                    open_questions: e.target.value
                      .split('\n')
                      .map(s => s.trim())
                      .filter(Boolean)
                  })
                }
              />
              <SuggestionPanel field="OPEN_QUESTIONS" />
            </div>

            <div>
              <div style={contextFieldHeaderStyle}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>What are we taking on trust?</label>
                <SuggestWithAiButton field="ASSUMPTIONS" />
              </div>
              <textarea
                style={{ ...fieldStyle, minHeight: 64 }}
                disabled={isFieldsDisabled}
                placeholder="One per line — assumptions this decision rests on, and that need validating"
                value={(displayedIntent.decision_context.assumptions || []).join('\n')}
                onChange={e =>
                  patchContext({
                    assumptions: e.target.value
                      .split('\n')
                      .map(s => s.trim())
                      .filter(Boolean)
                  })
                }
              />
              <SuggestionPanel field="ASSUMPTIONS" />
            </div>
          </div>
        )}

        {/* Stage footer — the user must never have to guess the next action. Back is always
            available; forward is an explicit, labelled action whose wording states exactly
            what it does. On the last stage the forward action is registration itself. */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginTop: 20,
            flexWrap: 'wrap'
          }}
        >
          <div>
            {stageIndex > 0 && (
              <button
                type="button"
                onClick={goBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
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
                <ChevronLeft size={14} /> Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {!isHistoricalView && !isRegistered && !isCurrentStageValid && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Complete the required fields to continue
              </span>
            )}

            {!isHistoricalView && !isRegistered && !isLastStage && (
              <button
                type="button"
                disabled={saving || !isCurrentStageValid}
                onClick={handleSaveAndContinue}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: isCurrentStageValid ? 'var(--g10x-orange)' : '#CBD5E1',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: isCurrentStageValid ? 'pointer' : 'not-allowed'
                }}
              >
                Save &amp; Continue <ChevronRight size={14} />
              </button>
            )}

            {!isHistoricalView && !isRegistered && isLastStage && (
              <button
                type="button"
                disabled={saving || !canRegisterDecision}
                onClick={handleRegister}
                title={
                  !isCurrentStageValid
                    ? 'Complete the required fields before registering'
                    : unreviewedOtherStages.length > 0
                    ? `Review every stage first — still to confirm: ${unreviewedOtherStages
                        .map(a => AREA_META[a].title)
                        .join(', ')}`
                    : 'Confirm this stage, register the decision and run the assessment'
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: canRegisterDecision ? 'var(--g10x-orange)' : '#CBD5E1',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: canRegisterDecision ? 'pointer' : 'not-allowed'
                }}
              >
                Register &amp; Evaluate Decision <ArrowRight size={14} />
              </button>
            )}

            {(isRegistered || isHistoricalView) && !isLastStage && (
              <button
                type="button"
                onClick={advance}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: '#FFFFFF',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                Next stage <ChevronRight size={14} />
              </button>
            )}

            {(isRegistered || isHistoricalView) && isLastStage && (
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('decision-analysis');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
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
                View decision analysis <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
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
        {!isHistoricalView && !isRegistered && (
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
        )}

        {!isHistoricalView && (
          <button
            type="button"
            disabled={resetting}
            onClick={handleResetDecision}
            title="Clears this decision for your session only — seeded world data and preserved historical experiments are unaffected"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: '#FFFFFF',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: resetting ? 'wait' : 'pointer'
            }}
          >
            <RotateCcw size={14} />
            {resetting ? 'Resetting…' : isRegistered ? 'Start new decision' : 'Reset decision'}
          </button>
        )}

        {(evaluation || isRegistered) && (
          <button
            type="button"
            onClick={handleOpenExecutionBrief}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: '#FFFFFF',
              color: 'var(--g10x-orange)',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: 'pointer'
            }}
            title="Prepare executive execution brief and commitment handoff"
          >
            <FileText size={14} />
            View Execution Brief
          </button>
        )}

        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {progress.completed_areas.length} of 4 stages reviewed
          {isRegistered ? ' · Decision registered' : ''}
          {isHistoricalView ? ' · Historical snapshot' : ''}
        </span>
      </section>

      {/* Technical provenance — the raw contract identifiers stay reachable for the technical
          reader without competing with the decision for attention. */}
      {isRegistered && (
        <section style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setProvenanceOpen(o => !o)}
            style={{
              display: 'inline-flex',
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
            <ChevronRight size={13} style={{ transform: provenanceOpen ? 'rotate(90deg)' : undefined }} />
            How CogniX reached this conclusion
          </button>
          {provenanceOpen && (
            <div
              style={{
                marginTop: 8,
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: '#F8FAFC',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                display: 'grid',
                gap: 6
              }}
            >
              <div>
                Decision reference <code>{intent.campaign_intent_id}</code> · schema{' '}
                {intent.schema_version} · registered {intent.registered_at || '—'}
              </div>
              <div>
                Evidence basis: {intent.synthetic_demo ? 'seeded demonstration data' : 'attested source data'}{' '}
                · source system <code>{intent.source_system}</code>
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                Sections are produced by the governed packages CDI-02 (assessment), CDI-03 (discovery),
                CDI-04 (readiness), CDI-05 (timeline), CDI-06 (strategy comparison), CDI-07A (decision
                contract) and CDI-07B (pre-mortem and learning). Each section header carries its package
                code.
              </div>
            </div>
          )}
        </section>
      )}

      {message && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '0.8125rem' }}>
          {message}
        </div>
      )}
      {error && (
        <div
          style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#FFF1F2', border: '1px solid #FECDD3', color: '#9F1239', fontSize: '0.8125rem' }}
          title={noticeProvenance(error)}
        >
          {noticeText(error)}
        </div>
      )}

      {/* Decision analysis — CDI-02 counterfactual & causal (unlocked after registration) */}
      <section
        id="decision-analysis"
        style={{
          marginTop: 8,
          marginBottom: 16,
          padding: '18px 20px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: '#FFFFFF',
          scrollMarginTop: 16
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Assess{' '}<span style={{ color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }} title="Governed package that produces this section">CDI-02</span>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              Is intervening worth it compared with doing nothing?
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              Today's run-rate, what happens if you do nothing, and what the intervention adds on top.
              Only effects the intervention genuinely causes are credited to it — market movement that
              would have happened anyway is never counted as campaign success.
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
              Discover{' '}<span style={{ color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }} title="Governed package that produces this section">CDI-03</span>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              When and where should we intervene?
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              Repeatable timing windows and store rankings you can interrogate factor by factor. Scoring
              inputs in this environment are seeded demonstration data and labelled as such.
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
              <div
                style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}
                title={`timing_mode: ${opportunity.opportunity_windows.timing_mode}`}
              >
                Recommended window ({executiveLabel('timing_mode', opportunity.opportunity_windows.timing_mode)})
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {opportunity.opportunity_windows.recommended_window.start_date}
                {' → '}
                {opportunity.opportunity_windows.recommended_window.end_date}
                {' · '}
                yield {opportunity.opportunity_windows.recommended_window.yield_score.toFixed(1)}
                {' · '}
                <span
                  title={`tier: ${opportunity.opportunity_windows.recommended_window.tier}${
                    executivePhrase('opportunity_window_tier', opportunity.opportunity_windows.recommended_window.tier).detail
                      ? ` — ${executivePhrase('opportunity_window_tier', opportunity.opportunity_windows.recommended_window.tier).detail}`
                      : ''
                  }`}
                >
                  {executiveLabel('opportunity_window_tier', opportunity.opportunity_windows.recommended_window.tier)}
                </span>
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
                    <span
                      style={{ color: 'var(--text-secondary)' }}
                      title={`tier: ${w.tier}${
                        executivePhrase('opportunity_window_tier', w.tier).detail
                          ? ` — ${executivePhrase('opportunity_window_tier', w.tier).detail}`
                          : ''
                      }`}
                    >
                      {w.yield_score.toFixed(1)} · {executiveLabel('opportunity_window_tier', w.tier)}
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
                    <span
                      style={{ fontWeight: 650, color: 'var(--g10x-orange)' }}
                      title={`tier: ${s.tier}${
                        executivePhrase('micro_market_tier', s.tier).detail
                          ? ` — ${executivePhrase('micro_market_tier', s.tier).detail}`
                          : ''
                      }`}
                    >
                      {executiveLabel('micro_market_tier', s.tier)}
                    </span>
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
              Validate{' '}<span style={{ color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }} title="Governed package that produces this section">CDI-04</span>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              Are we ready to proceed?
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              Six dimensions assessed independently. The overall position takes the weakest of them —
              a strong score elsewhere can never paper over a blocking constraint. Thresholds in this
              environment are demonstration policy and never veto on their own.
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
                Readiness · {executiveLabel('readiness_state', readiness.readiness.state)}
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {readiness.readiness.headline}
              </div>
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Confidence{' '}
                <span
                  title={`confidence band: ${readiness.readiness.confidence.band}${
                    executivePhrase('confidence_band', readiness.readiness.confidence.band).detail
                      ? ` — ${executivePhrase('confidence_band', readiness.readiness.confidence.band).detail}`
                      : ''
                  }`}
                >
                  {executiveLabel('confidence_band', readiness.readiness.confidence.band)}
                </span>
                {typeof readiness.readiness.confidence.confidence_index === 'number'
                  ? ` · index ${readiness.readiness.confidence.confidence_index}`
                  : ''}
                {' · '}
                weakest evidence {executiveLabel('evidence_strength', readiness.readiness.confidence.evidence_strength_floor)}
                {readiness.readiness.state_caps_applied?.length ? (
                  <span title={`state_caps_applied: ${readiness.readiness.state_caps_applied.join(', ')}`}>
                    {' · '}
                    {/*
                      Not every cap is an evidence cap: K7 caps on negative contribution and K8 on
                      an operational capacity gap. Naming all of them "evidence" told the planner to
                      go looking for missing data when the actual limit was commercial or physical.
                    */}
                    {describeReadinessCaps(readiness.readiness.state_caps_applied)}
                  </span>
                ) : null}
              </div>
              {readiness.readiness.commercial_tolerance && (
                <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {executiveLabel('objective_class', readiness.readiness.commercial_tolerance.objective_class)}
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
                      <span style={{ fontSize: '0.8125rem', fontWeight: 650, color: 'var(--text-primary)' }}>
                        {executiveLabel('dimension_id', d.dimension)}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {executiveLabel('dimension_state', d.state)} · {executiveLabel('evidence_strength', d.evidence_strength_floor)}
                      </span>
                    </div>
                    {d.not_evaluated_reason && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>{d.not_evaluated_reason}</div>
                    )}
                    {d.findings.map((f: any) => (
                      <div
                        key={f.finding_id}
                        style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}
                        title={`rule ${f.rule_id} · evidence ${f.evidence.map((e: any) => e.strength).join(', ')}`}
                      >
                        <strong>[{f.evidence.map((e: any) => executiveLabel('evidence_strength', e.strength)).join(', ')}]</strong> {f.statement}
                        {/* Seeded/proxy disclosures travel verbatim with the finding they justify (design gate §8.4). */}
                        {f.evidence
                          .filter((e: any) => e.disclosure)
                          .map((e: any, i: number) => (
                            <div
                              key={`${f.finding_id}_disc_${i}`}
                              style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}
                              title={`${e.field_path} (${e.strength})`}
                            >
                              {executiveLabel('evidence_strength', e.strength)}: {e.disclosure}
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                ))}
                {readiness.readiness.vetoes?.length > 0 && (
                  <div
                    style={{ fontSize: '0.75rem', color: '#9F1239' }}
                    title={readiness.readiness.vetoes.map((v: any) => `${v.veto_id} (${v.veto_basis})`).join('; ')}
                  >
                    Blocked by:{' '}
                    {readiness.readiness.vetoes
                      .map((v: any) => v.statement || humaniseToken(v.veto_basis))
                      .join(' · ')}
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
              Sequence{' '}<span style={{ color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }} title="Governed package that produces this section">CDI-05</span>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              What happens over time — and why?
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              How the same decision reads across the campaign window. Market movement is shared by every
              option, so only the difference between them is attributed to the intervention. Nothing is
              curve-fitted to look more convincing than the underlying model supports.
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
                {timeline.projection.tier1.attributable_uplift_pp.toFixed(2)} pp incremental demand · £
                {timeline.projection.tier1.contribution_delta_gbp.toLocaleString()} contribution impact · confidence{' '}
                {String(timeline.projection.tier1.confidence_band).toLowerCase()}
                {timeline.projection.readiness_reference
                  ? ` · readiness ${executiveLabel('readiness_state', timeline.projection.readiness_reference.state)}`
                  : ''}
                {timeline.projection.readiness_reference?.state === 'DO_NOT_PROCEED'
                  ? ' — intervention trajectory shown as vetoed evidence, not a plan'
                  : ''}
              </div>
              <div
                style={{ marginTop: 8, fontSize: '0.6875rem', color: 'var(--text-muted)' }}
                title="allocation_profile: FLAT_RATE_IDENTITY"
              >
                Pre-campaign: modelled run-rate (not observed history). Post-campaign: not modelled.
                Effect is spread evenly across the window rather than shaped into a curve. Revenue view:
                not available.
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
                <div
                  style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}
                  title="driver_class partition"
                >
                  Why? · What happens anyway vs what we cause
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
                    Readiness evidence not available — no readiness assessment was supplied for this projection.
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
              Compare{' '}<span style={{ color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }} title="Governed package that produces this section">CDI-06</span>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              Which strategy gives the best trade-off?
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              Every option is compared on the same two things that matter — incremental demand and
              contribution impact — against an identical market backdrop. CogniX will not rank options
              by a hidden weighting; where more than one is defensible, the choice stays yours.
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
                selection?.status === 'SELECTED' ||
                selection?.status === 'NO_ADMISSIBLE_PLAY' ||
                selection?.status === 'CHOICE_REQUIRED'
                  ? executiveLabel('selection_status', selection.status)
                  : null;
              const playLabelById = (playId?: string | null): string =>
                (orderedPlays.find((p: any) => p.play_id === playId)?.label as string) || playId || '—';

              return (
                <>
                  <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--curiosity-light)' }}>
                    <div
                      style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}
                      title={`frontier_status: ${f.frontier_status}${selection?.status ? ` · selection status: ${selection.status}` : ''}`}
                    >
                      Frontier · {humaniseToken(String(f.frontier_status))}
                      {selectionLabel ? ` · ${selectionLabel}` : ''}
                    </div>
                    {f.frontier_status === 'NOT_EMITTED' ? (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Frontier not emitted
                        {f.not_emitted_reason ? ` — ${executiveLabel('not_emitted_reason', f.not_emitted_reason)}` : ''}.
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          Compared on {(f.axes || []).map((a: any) => executiveLabel('axis', a.axis_id)).join(' and ').toLowerCase()}
                          {' · '}
                          {(f.frontier_play_ids || []).length} of {orderedPlays.length} options on the frontier
                        </div>
                        {selection?.status === 'CHOICE_REQUIRED' && selection.open_trade_off && (
                          <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Open trade-off: {selection.open_trade_off}
                          </div>
                        )}
                        {selection?.status === 'SELECTED' && selection.selected_play_id && (
                          <div
                            style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                            title={`selected_play_id: ${selection.selected_play_id}${
                              selection.selection_basis ? ` · selection_basis: ${selection.selection_basis}` : ''
                            }`}
                          >
                            Recommended under your declared constraints: {playLabelById(selection.selected_play_id)}
                            {selection.selection_basis
                              ? ` — ${executiveLabel('selection_basis', selection.selection_basis).toLowerCase()}`
                              : ''}
                          </div>
                        )}
                        {selection?.status === 'NO_ADMISSIBLE_PLAY' && (
                          <div
                            style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                            title="selection status: NO_ADMISSIBLE_PLAY"
                          >
                            {executivePhrase('selection_status', 'NO_ADMISSIBLE_PLAY').detail}
                          </div>
                        )}
                        <div style={{ marginTop: 8, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          All options share one market backdrop · doing nothing is always shown · outperformed options stay visible
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
                                  <div
                                    style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}
                                    title={`play_kind: ${play.play_kind}${
                                      play.admissibility ? ` · admissibility: ${play.admissibility}` : ''
                                    }`}
                                  >
                                    {executiveLabel('play_kind', play.play_kind)}
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
                                    <div
                                      style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}
                                      title={executivePhrase('axis', axis.axis_id).detail}
                                    >
                                      {executiveLabel('axis', axis.axis_id)}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                      {formatAxisValue(axis.axis_id, axis.value)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {(dominanceByPlay.get(activePlay.play_id) || []).length > 0 && (
                                <div
                                  style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}
                                  title={`dominated_by: ${(dominanceByPlay.get(activePlay.play_id) || []).join(', ')}`}
                                >
                                  Outperformed by:{' '}
                                  {(dominanceByPlay.get(activePlay.play_id) || []).map(playLabelById).join(', ')}
                                </div>
                              )}
                              {activePlay.admissibility && activePlay.admissibility !== 'ADMISSIBLE' && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                                  {executiveLabel('play_admissibility', activePlay.admissibility)}
                                  {executivePhrase('play_admissibility', activePlay.admissibility).detail
                                    ? ` — ${executivePhrase('play_admissibility', activePlay.admissibility).detail}`
                                    : activePlay.exclusion_reason
                                    ? ` — ${activePlay.exclusion_reason}`
                                    : ''}
                                </div>
                              )}
                              {activePlay.economics_completeness && (
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                  {executiveLabel('economics_completeness', activePlay.economics_completeness)}
                                  {activePlay.confidence_band ? ` · confidence ${activePlay.confidence_band.toLowerCase()}` : ''}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Ruled-out options are governance, not headline: collapsed by default,
                              never removed, with the reason for every exclusion one click away. */}
                          {excludedPlays.length > 0 && (
                            <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#FFFFFF' }}>
                              <button
                                type="button"
                                onClick={() => setExcludedPlaysOpen(o => !o)}
                                style={{
                                  display: 'inline-flex',
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
                                  size={13}
                                  style={{ transform: excludedPlaysOpen ? 'rotate(90deg)' : undefined }}
                                />
                                {excludedPlays.length} alternative{excludedPlays.length === 1 ? '' : 's'} ruled out
                              </button>
                              {excludedPlaysOpen && (
                                <div style={{ marginTop: 8 }}>
                                  {excludedPlays.map((play: any) => (
                                    <div key={`ex_${play.play_id}`} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                                      <strong>{play.label}</strong> · {executiveLabel('play_admissibility', play.admissibility)}
                                      {executivePhrase('play_admissibility', play.admissibility).detail
                                        ? ` — ${executivePhrase('play_admissibility', play.admissibility).detail}`
                                        : play.exclusion_reason
                                        ? ` — ${play.exclusion_reason}`
                                        : ''}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {unavailableDims.length > 0 && (
                            <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#FFFFFF' }}>
                              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                                Not measurable yet
                              </div>
                              {unavailableDims.map((dim: any) => (
                                <div
                                  key={dim.dimension_id}
                                  style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}
                                  title={`dimension_id: ${dim.dimension_id} · availability: ${dim.availability}`}
                                >
                                  <div>
                                    <strong>{executiveLabel('outcome_dimension', dim.dimension_id)}</strong> ·{' '}
                                    {executiveLabel('availability', dim.availability)}
                                  </div>
                                  {executivePhrase('outcome_dimension', dim.dimension_id).detail && (
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                      {executivePhrase('outcome_dimension', dim.dimension_id).detail}
                                    </div>
                                  )}
                                  {dim.required_authoritative_input && (
                                    <div
                                      style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}
                                      title={`required field: ${dim.required_authoritative_input.field}`}
                                    >
                                      {/*
                                        What is missing is stated in the planner's terms. The raw
                                        field path stays on the tooltip above: naming the engine
                                        field here told the reader which variable was unset, not
                                        which input the estate has to supply.
                                      */}
                                      Needed before this can be measured:{' '}
                                      {dim.required_authoritative_input.why_required ||
                                        humaniseFieldPath(dim.required_authoritative_input.field)}
                                      {dim.required_authoritative_input.grain
                                        ? ` (by ${dim.required_authoritative_input.grain})`
                                        : ''}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {selection?.eliminations?.length > 0 && (
                            <div
                              style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                              title={selection.eliminations
                                .map((e: any) => `${e.play_id} (${e.constraint_id})`)
                                .join(' · ')}
                            >
                              Ruled out by your declared constraints:{' '}
                              {selection.eliminations
                                .map((e: any) => playLabelById(e.play_id))
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
              Decide{' '}<span style={{ color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }} title="Governed package that produces this section">CDI-07A</span>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              What are we committing to — and when does it stop being true?
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              Record what was decided and the assumptions it rests on, then re-check whether those
              assumptions still hold. CogniX never claims a decision stays valid for a fixed period —
              only whether its assumptions currently survive.
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
                <div
                  style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}
                  title="selection status: NO_ADMISSIBLE_PLAY"
                >
                  {executiveLabel('selection_status', 'NO_ADMISSIBLE_PLAY')} —{' '}
                  {executivePhrase('selection_status', 'NO_ADMISSIBLE_PLAY').detail} Nothing can be
                  committed to, so no decision can be recorded.
                </div>
              )}

              {canRegisterChoice && !decisionContract && (
                <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: '#F8FAFC', display: 'grid', gap: 10 }}>
                  <div
                    style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}
                    title="selection status: CHOICE_REQUIRED"
                  >
                    {executiveLabel('selection_status', 'CHOICE_REQUIRED')} · record who decided
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Explicit attribution is required — no decision is recorded silently. Name who is deciding, why, and which of the remaining options from the open trade-off.
                  </p>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span
                      style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}
                      title="resolved_by"
                    >
                      Who is deciding
                    </span>
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
                    <span
                      style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}
                      title="resolution_basis"
                    >
                      Why this option
                    </span>
                    <textarea
                      value={humanResolutionBasis}
                      onChange={e => setHumanResolutionBasis(e.target.value)}
                      placeholder="Why this option, given the open trade-off"
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
                    <span
                      style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}
                      title="selected_play_id — frontier survivors"
                    >
                      Chosen option (from those still defensible)
                    </span>
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
                      <option value="">Select an option…</option>
                      {survivorPlays.map((p: any) => (
                        // The option text is what the planner is choosing between, so it names
                        // the option. The generated play id stays reachable as provenance on
                        // the option's tooltip rather than sitting in the visible label of the
                        // control used to commit the decision.
                        <option key={p.play_id} value={p.play_id} title={`play id ${p.play_id}`}>
                          {p.label}
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
                    <div
                      style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}
                      title={`contract status: ${decisionContract.status}`}
                    >
                      Contract Summary · {executiveLabel('contract_status', decisionContract.status)}
                    </div>
                    <div
                      style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 6 }}
                      title={`selected_play_id: ${decisionContract.resolution?.selected_play_id}`}
                    >
                      Committed option:{' '}
                      {(f?.plays || []).find(
                        (p: any) => p.play_id === decisionContract.resolution?.selected_play_id
                      )?.label || decisionContract.resolution?.selected_play_id}
                    </div>
                    <div
                      style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}
                      title={`route: ${decisionContract.resolution?.route}${
                        decisionContract.resolution?.selection_basis
                          ? ` · selection_basis: ${decisionContract.resolution.selection_basis}`
                          : ''
                      }`}
                    >
                      {executiveLabel('resolution_route', decisionContract.resolution?.route)}
                      {decisionContract.resolution?.resolved_by
                        ? ` · decided by ${decisionContract.resolution.resolved_by}`
                        : ''}
                      {decisionContract.resolution?.selection_basis
                        ? ` · ${executiveLabel('selection_basis', decisionContract.resolution.selection_basis).toLowerCase()}`
                        : ''}
                    </div>
                    {decisionContract.resolution?.resolution_statement && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                        Why: {decisionContract.resolution.resolution_statement}
                      </div>
                    )}
                    <div
                      style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 10 }}
                      title={`contract_id: ${decisionContract.contract_id} · created_as_of: ${decisionContract.created_as_of}`}
                    >
                      Contract reference {decisionContract.contract_id?.slice(0, 12)}… · recorded as of{' '}
                      {decisionContract.created_as_of}
                    </div>

                    {(decisionContract.basis?.rejected_alternatives || []).length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                          Rejected alternatives
                        </div>
                        {(decisionContract.basis.rejected_alternatives as any[]).map((alt: any) => (
                          <div
                            key={alt.play_id}
                            style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}
                            title={`play_id: ${alt.play_id} · cause: ${alt.cause}${
                              alt.dominated_by?.length ? ` · dominated_by: ${alt.dominated_by.join(', ')}` : ''
                            }${alt.elimination?.constraint_id ? ` · constraint_id: ${alt.elimination.constraint_id}` : ''}`}
                          >
                            <strong>{alt.label || alt.play_id}</strong> · {executiveLabel('rejection_cause', alt.cause)}
                            {alt.dominated_by?.length
                              ? ` · outperformed by ${alt.dominated_by
                                  .map(
                                    (id: string) =>
                                      (frontier?.frontier?.plays || []).find((p: any) => p.play_id === id)?.label || id
                                  )
                                  .join(', ')}`
                              : ''}
                            {alt.elimination?.statement
                              ? ` · ${alt.elimination.statement}`
                              : ''}
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
                          Outcome at decision time: {formatOutcomeSnapshot(decisionContract.basis.scenario_zero.outcome_snapshot)}
                        </div>
                        {decisionContract.basis.scenario_zero.dominated_by?.length > 0 && (
                          <div
                            style={{ marginTop: 4, fontSize: '0.6875rem', color: 'var(--text-muted)' }}
                            title={`dominated_by: ${decisionContract.basis.scenario_zero.dominated_by.join(', ')}`}
                          >
                            Outperformed by:{' '}
                            {decisionContract.basis.scenario_zero.dominated_by
                              .map(
                                (id: string) =>
                                  (frontier?.frontier?.plays || []).find((p: any) => p.play_id === id)?.label || id
                              )
                              .join(', ')}
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
                      <span
                        style={validityStateStyle(validityAssessment.state)}
                        title={`validity state: ${validityAssessment.state}${
                          executivePhrase('validity_state', validityAssessment.state).detail
                            ? ` — ${executivePhrase('validity_state', validityAssessment.state).detail}`
                            : ''
                        }`}
                      >
                        {executiveLabel('validity_state', validityAssessment.state)}
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
                            <div
                              style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}
                              title="assumptions · held_at_resolution"
                            >
                              Assumptions · what held when this was decided
                            </div>
                            {(decisionContract.assumptions || []).map((a: any) => (
                              <div
                                key={a.assumption_id}
                                style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}
                                title={`${a.assumption_id} · assumption_class: ${a.assumption_class} · held_at_resolution=${String(
                                  a.held_at_resolution
                                )}`}
                              >
                                <strong>{a.statement || humaniseToken(String(a.assumption_class))}</strong>
                                {' — value when decided: '}
                                {String(a.held_at_resolution)}
                                {a.load_bearing ? ' · the decision leans on it' : ''}
                              </div>
                            ))}
                          </div>

                          <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#F8FAFC' }}>
                            <div
                              style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}
                              title="triggers_evaluated"
                            >
                              What was re-checked
                            </div>
                            {(validityAssessment.half_life_basis?.triggers_evaluated || []).map((te: any) => (
                              <div key={te.trigger_id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                                <div title={`${te.trigger_id} · outcome: ${te.outcome}`}>
                                  <strong>{executiveLabel('trigger_outcome', te.outcome)}</strong>
                                  {executivePhrase('trigger_outcome', te.outcome).detail
                                    ? ` — ${executivePhrase('trigger_outcome', te.outcome).detail}`
                                    : ''}
                                  {te.outcome === 'FIRED' && te.observed_value !== undefined
                                    ? ` Moved to ${String(te.observed_value)}.`
                                    : ''}
                                </div>
                                {te.outcome === 'UNASSESSABLE' && te.unassessable_reason && (
                                  <div
                                    style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}
                                    title="outcome: UNASSESSABLE"
                                  >
                                    {executiveLabel('trigger_outcome', 'UNASSESSABLE')}: {te.unassessable_reason}
                                  </div>
                                )}
                                {te.movement_attribution && (
                                  <div
                                    style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}
                                    title={`movement_attribution: ${te.movement_attribution}`}
                                  >
                                    Movement attributed to: {humaniseToken(String(te.movement_attribution))}
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
                              <div
                                key={`ua_${u.assumption_id}`}
                                style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}
                                title={`unassessable assumption: ${u.assumption_id}`}
                              >
                                Could not be checked: {u.reason}
                              </div>
                            ))}
                          </div>

                          <div style={{ padding: 12, borderRadius: 8, border: '1px dashed var(--border)', background: '#FFFFFF' }}>
                            <div
                              style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}
                              title="QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT"
                            >
                              Why no expiry date is given
                            </div>
                            {/*
                              What the estate would have to hold, in the planner's terms. The raw
                              field name stays on the heading's tooltip: naming the engine field
                              here said which variable was unset rather than which measurement is
                              missing.
                            */}
                            <div
                              style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}
                              title={`required field: ${(
                                validityAssessment.half_life_basis?.quantitative_measure ||
                                QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT
                              ).field}`}
                            >
                              {humaniseFieldPath(
                                (
                                  validityAssessment.half_life_basis?.quantitative_measure ||
                                  QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT
                                ).field
                              )}
                              {' — '}
                              {executiveLabel(
                                'required_input_status',
                                (
                                  validityAssessment.half_life_basis?.quantitative_measure ||
                                  QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT
                                ).status
                              )}
                            </div>
                            <div style={{ marginTop: 4, fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                              {(
                                validityAssessment.half_life_basis?.quantitative_measure ||
                                QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT
                              ).why_required}
                            </div>
                          </div>

                          <div style={{ padding: 12, borderRadius: 8, border: '1px dashed var(--border)', background: '#FFFFFF' }}>
                            <div
                              style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}
                              title="NOT_A_PREDICTION_DISCLOSURE"
                            >
                              What this validity check is not
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

      {/* Layer 8 — CDI-07B Pre-Mortem, Prediction vs Reality & Closed Learning Loop */}
      {decisionContract && (
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
                Learn{' '}<span style={{ color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }} title="Governed package that produces this section">CDI-07B</span>
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
                What could go wrong — and what did we actually learn?
              </h2>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
                Enumerate declared failure modes, compare predictions against observations at the fixed reference instant,
                and assess learning eligibility — without re-deciding or mutating the contract.
              </p>
            </div>
          </div>

          {loadingLayer8 && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Loading pre-mortem, comparison and learning evidence…
            </div>
          )}

          {layer8Error && !loadingLayer8 && (
            <div
              style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 12 }}
              title={noticeProvenance(layer8Error)}
            >
              {noticeText(layer8Error)}
            </div>
          )}

          <div style={{ display: 'grid', gap: 16 }}>
            {/* Pre-Mortem panel — grouped by consequence_order only */}
            {preMortem && (
              <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: '#F8FAFC' }}>
                <div
                  style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}
                  title={`pre-mortem status: ${preMortem.status}`}
                >
                  Pre-Mortem · {humaniseToken(String(preMortem.status))}
                </div>

                {preMortem.derived_impact_scope_disclosure && (
                  <div style={{ padding: 12, borderRadius: 8, border: '1px dashed var(--border)', background: '#FFFFFF', marginBottom: 12 }}>
                    <div
                      style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}
                      title="DERIVED_IMPACT_SCOPE_DISCLOSURE"
                    >
                      How far these knock-on impacts reach
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      {preMortem.derived_impact_scope_disclosure}
                    </div>
                  </div>
                )}

                {CONSEQUENCE_ORDER_SEQUENCE.map(order => {
                  const modes = preMortem.failure_modes.filter(f => f.consequence_order === order);
                  if (!modes.length) return null;
                  return (
                    <div key={order} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 650, color: 'var(--text-primary)', marginBottom: 8 }}>
                        {CONSEQUENCE_ORDER_LABEL[order]}
                      </div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        {modes.map(mode => {
                          const resilienceRows = resilienceForFailureMode(preMortem, mode.failure_mode_id);
                          return (
                            <div
                              key={mode.failure_mode_id}
                              style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#FFFFFF' }}
                            >
                              <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                                {mode.statement}
                              </div>
                              <div
                                style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 4 }}
                                title={`${mode.failure_mode_id} · ${mode.failure_mode_class} · grounding: ${mode.grounding}`}
                              >
                                {humaniseToken(String(mode.failure_mode_class))} · grounded in{' '}
                                {humaniseToken(String(mode.grounding)).toLowerCase()}
                              </div>
                              <div
                                style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 4 }}
                                title={`source: ${mode.source_package} · ${mode.source_field_path}`}
                              >
                                From {mode.source_package} · what was contracted: {String(mode.contracted_value)}
                              </div>
                              {mode.follows_from_failure_mode_id && (
                                <div
                                  style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 4 }}
                                  title={`follows_from: ${mode.follows_from_failure_mode_id}`}
                                >
                                  Follows from an earlier failure mode above
                                </div>
                              )}
                              {mode.derived_impact_ref && (
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 8 }}>
                                  {mode.derived_impact_ref.scope_disclosure || DERIVED_IMPACT_SCOPE_DISCLOSURE}
                                </div>
                              )}
                              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                                Resilience
                              </div>
                              {resilienceRows.map(row => (
                                <div key={row.resilience_id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                                  {row.statement}
                                  {row.no_known_mitigation ? (
                                    <span style={{ display: 'block', marginTop: 2, color: 'var(--text-muted)' }}>
                                      no known mitigation
                                    </span>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {(preMortem.unexamined || []).length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                      Unexamined dimensions
                    </div>
                    {preMortem.unexamined.map(dim => (
                      <div
                        key={dim.dimension_id}
                        style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}
                        title={`dimension_id: ${dim.dimension_id}`}
                      >
                        <strong>{executiveLabel('outcome_dimension', dim.dimension_id)}</strong> —{' '}
                        {dim.statement && dim.statement !== dim.dimension_id
                          ? dim.statement
                          : executivePhrase('outcome_dimension', dim.dimension_id).detail ||
                            'No authoritative input is recorded stating what this dimension would need.'}{' '}
                        ({dim.reason})
                      </div>
                    ))}
                  </div>
                )}

                {(preMortem.unavailable_capabilities || []).map(cap => (
                  <div
                    key={cap.field}
                    style={{ marginTop: 10, padding: 12, borderRadius: 8, border: '1px dashed var(--border)', background: '#FFFFFF' }}
                  >
                    <div
                      style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}
                      title={`${cap.field} · ${cap.status}`}
                    >
                      Not yet possible — {humaniseToken(String(cap.status)).toLowerCase()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      {cap.why_required}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Prediction vs Reality panel — comparability before numbers */}
            {predictionComparison && (
              <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--curiosity-light)' }}>
                <div
                  style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}
                  title={`verdict: ${predictionComparison.verdict}`}
                >
                  Prediction vs Reality · {executiveLabel('comparison_verdict', predictionComparison.verdict)}
                </div>

                {(predictionComparison.observations.some(
                  o => o.synthetic_demo || o.provenance?.synthetic_demo
                ) ||
                  predictionComparison.synthetic_demo) && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px dashed var(--border)',
                      background: '#FFFFFF',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Sparkles size={12} />
                    {predictionComparison.synthetic_disclosure || SYNTHETIC_OBSERVATION_DISCLOSURE}
                  </div>
                )}

                <div style={{ padding: 12, borderRadius: 8, border: '1px dashed var(--border)', background: '#FFFFFF', marginBottom: 12 }}>
                  <div
                    style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}
                    title="NOT_A_DECISION_VERDICT_DISCLOSURE"
                  >
                    What this comparison is not
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {predictionComparison.not_a_decision_verdict_disclosure || NOT_A_DECISION_VERDICT_DISCLOSURE}
                  </div>
                </div>

                {/* RB-2 — observation authority is re-derived by the engine, so it is shown per
                    observation rather than left to a panel-level banner. An operator must be able
                    to see that a number came from demonstration data at the row that carries it. */}
                {(predictionComparison.observations || []).length > 0 && (
                  <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                    <div
                      style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}
                      title="observation authority"
                    >
                      Where each outcome came from
                    </div>
                    {predictionComparison.observations.map(observation => (
                      <div
                        key={observation.observation_id}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: '#FFFFFF',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <span
                          style={{ fontWeight: 650, color: 'var(--text-primary)' }}
                          title={`authority: ${observation.authority}`}
                        >
                          {humaniseToken(String(observation.authority))}
                        </span>
                        {' · '}
                        {observation.entity_type} {observation.entity_id}
                        {' · '}
                        {observation.external_category} via {observation.connector_id}
                        {(observation.synthetic_demo || observation.provenance?.synthetic_demo) && (
                          <div style={{ marginTop: 3, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            demonstration data — not a real-world outcome
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gap: 10 }}>
                  {(predictionComparison.comparisons || []).map((comparison, idx) => (
                    <div
                      key={`${comparison.predicted_source_field_path}_${idx}`}
                      style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#FFFFFF' }}
                    >
                      <div
                        style={{ fontSize: '0.75rem', fontWeight: 650, color: 'var(--text-primary)', marginBottom: 6 }}
                        title={`comparability: ${comparison.comparability}`}
                      >
                        {executiveLabel('comparability_verdict', comparison.comparability)}
                      </div>
                      <div
                        style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 8 }}
                        title={`${comparison.predicted_source_package} · ${comparison.predicted_source_field_path}`}
                      >
                        {executivePhrase('comparability_verdict', comparison.comparability).detail}
                      </div>
                      {comparisonIsLikeForLike(comparison) && comparison.error ? (
                        <div style={{ display: 'grid', gap: 4 }}>
                          <div
                            style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}
                            title={`predicted_basis: ${comparison.predicted_basis}`}
                          >
                            Predicted: {comparison.predicted_value} {comparison.predicted_unit} (
                            {executiveLabel('quantity_basis', comparison.predicted_basis).toLowerCase()})
                          </div>
                          <div
                            style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}
                            title={`observed_basis: ${comparison.observed_basis}`}
                          >
                            Observed: {comparison.observed_value} {comparison.observed_unit} (
                            {executiveLabel('quantity_basis', comparison.observed_basis).toLowerCase()})
                          </div>
                          <div
                            style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                            title={`signed_delta${
                              comparison.error.within_declared_envelope !== undefined
                                ? ` · within_declared_envelope: ${String(comparison.error.within_declared_envelope)}`
                                : ''
                            }`}
                          >
                            Difference: {comparison.error.signed_delta} {comparison.error.unit}
                            {comparison.error.within_declared_envelope !== undefined
                              ? comparison.error.within_declared_envelope
                                ? ' · within the tolerance declared beforehand'
                                : ' · outside the tolerance declared beforehand'
                              : ''}
                          </div>
                          {comparison.error.statement && (
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{comparison.error.statement}</div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: 4 }}>
                          <div
                            style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}
                            title={`predicted_basis: ${comparison.predicted_basis}`}
                          >
                            Predicted: {comparison.predicted_value} {comparison.predicted_unit} (
                            {executiveLabel('quantity_basis', comparison.predicted_basis).toLowerCase()})
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Not scored — the prediction and the outcome cannot be compared
                            {comparison.incomparable_reason ? ` — ${comparison.incomparable_reason}` : ''}
                          </div>
                          {comparison.observed_value !== undefined && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Observed, but not differenced against the prediction: {comparison.observed_value}{' '}
                              {comparison.observed_unit || '—'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {predictionComparison.attribution && (
                  <div
                    style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                    title={`attribution: ${predictionComparison.attribution.attribution}`}
                  >
                    {humaniseToken(String(predictionComparison.attribution.attribution))} —{' '}
                    {predictionComparison.attribution.statement}
                  </div>
                )}

                {(predictionComparison.unavailable_capabilities || []).map(cap => (
                  <div
                    key={cap.field}
                    style={{ marginTop: 10, padding: 12, borderRadius: 8, border: '1px dashed var(--border)', background: '#FFFFFF' }}
                  >
                    <div
                      style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}
                      title={`${cap.field} · ${cap.enables} · ${cap.status}`}
                    >
                      Not yet possible: {humaniseToken(String(cap.enables)).toLowerCase()} —{' '}
                      {humaniseToken(String(cap.status)).toLowerCase()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      {cap.why_required}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Learning panel — full eligibility conjunction */}
            {learningCandidate && (
              <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: '#F8FAFC' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                  Learning · eligibility {learningCandidate.eligibility.eligible ? 'met' : 'not met'}
                </div>

                <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                  {orderEligibilityConditions(learningCandidate).map(condition => (
                    <div
                      key={condition.condition_id}
                      style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: '#FFFFFF' }}
                    >
                      <div
                        style={{ fontSize: '0.75rem', fontWeight: 650, color: 'var(--text-primary)', marginBottom: 4 }}
                        title={`condition_id: ${condition.condition_id}`}
                      >
                        {humaniseToken(String(condition.condition_id))} · {condition.met ? 'met' : 'not met'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{condition.statement}</div>
                      {!condition.met && condition.unmet_reason && (
                        <div style={{ marginTop: 4, fontSize: '0.6875rem', color: 'var(--text-muted)' }} title="unmet_reason">
                          Why not: {condition.unmet_reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {!learningCandidate.eligibility.eligible && learningCandidate.blocked_by.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}
                      title="blocked_by"
                    >
                      What is blocking it
                    </div>
                    {learningCandidate.blocked_by.map(item => (
                      <div
                        key={item}
                        style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}
                        title={item}
                      >
                        {humaniseToken(String(item))}
                      </div>
                    ))}
                  </div>
                )}

                {[PATTERN_PROMOTION_REQUIRED_INPUT, OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT, QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT].map(
                  cap => (
                    <div
                      key={cap.field}
                      style={{ marginBottom: 10, padding: 12, borderRadius: 8, border: '1px dashed var(--border)', background: '#FFFFFF' }}
                    >
                      <div
                        style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}
                        title={`${cap.field} · ${cap.enables} · ${cap.status}`}
                      >
                        Not yet possible: {humaniseToken(String(cap.enables)).toLowerCase()} —{' '}
                        {humaniseToken(String(cap.status)).toLowerCase()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: 4 }}>
                        {cap.why_required}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.4 }} title="grain">
                        Needed at: {cap.grain}
                      </div>
                    </div>
                  )
                )}

                {learningCandidate.eligibility.eligible && learningCandidate.learning_case && (
                  <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#FFFFFF' }}>
                    <div
                      style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}
                      title={`LearningCase · ${learningCandidate.learning_case.learning_case_id}`}
                    >
                      What can be learned from this one decision
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: 8 }}>
                      {learningCandidate.learning_case.single_case_disclosure || SINGLE_CASE_DISCLOSURE}
                    </div>
                    {(learningCandidate.learning_case.pattern_refs || []).map(ref => (
                      <div
                        key={ref.pattern_id}
                        style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}
                        title={`pattern_ref: ${ref.pattern_id}`}
                      >
                        Related pattern: {ref.pattern_name} — context only, not evidence
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {ref.telemetry_disclosure || PATTERN_TELEMETRY_DISCLOSURE}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Locked teaser for packages after CDI-07B */}
      {FUTURE_LAYERS.length > 0 && (
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
          Next decision layers
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
      )}

      {/* Experiment History Drawer */}
      <ExperimentHistoryDrawer
        isOpen={historyDrawerOpen}
        experiments={experimentsList}
        onClose={() => setHistoryDrawerOpen(false)}
        onReviewExperiment={exp => {
          setReviewedExperiment(exp);
          setHistoryDrawerOpen(false);
          if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onViewBrief={exp => {
          handleOpenExecutionBriefForExperiment(exp);
        }}
        onCompareExperiments={async experimentIds => {
          const comp = await compareCampaignExperimentsClient(experimentIds);
          if (comp) {
            setComparisonModalData(comp);
            setHistoryDrawerOpen(false);
          } else {
            setError(
              `Could not compare ${experimentIds.join(', ')}. Select between 2 and ${MAX_COMPARISON_EXPERIMENTS} preserved decisions.`
            );
          }
        }}
      />

      {/* Comparison Modal */}
      {comparisonModalData && (
        <ExperimentComparisonModal
          comparison={comparisonModalData}
          onClose={() => setComparisonModalData(null)}
          onSelectExperiment={id => {
            const found = experimentsList.find(e => e.experiment_id === id);
            if (found) {
              setReviewedExperiment(found);
              setComparisonModalData(null);
            }
          }}
        />
      )}

      {/* Execution Brief Modal */}
      {executionBriefData && (
        <ExecutionBriefModal
          brief={executionBriefData}
          onClose={() => setExecutionBriefData(null)}
        />
      )}
    </div>
  );
}
