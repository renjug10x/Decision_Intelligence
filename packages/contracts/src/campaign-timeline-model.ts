/**
 * CogniX CDI-05 — Decision Timeline & Curiosity-Driven Demand Decomposition
 *
 * Temporal rendering of a decision already computed by CDI-02.
 * FLAT_RATE_IDENTITY only — no fabricated curvature.
 * Contracts frozen in docs/reports/COGNIX_CDI_05_DECISION_TIMELINE_DESIGN_GATE.md §8.
 */

import { CampaignIntent } from './campaign-intent-model';
import {
  CampaignEvaluationResponse,
  CausalDriverId,
  CausalDriverClass
} from './campaign-counterfactual-model';
import { OpportunityDiscoveryResponse } from './campaign-opportunity-model';
import {
  ConfidenceBand,
  EvidenceStrength,
  ReadinessState,
  ReadinessEvidenceRef,
  DecisionReadinessAssessment,
  weakestEvidenceStrength
} from './campaign-readiness-model';
import { SimulationPeriod } from './enterprise-signal-model';

export type TimelinePhase = 'PRE_CAMPAIGN' | 'CAMPAIGN' | 'POST_CAMPAIGN';
/**
 * Trajectory vocabulary, shared by CDI-05 and CTW-01 so the estate keeps one trajectory
 * taxonomy rather than two (ADR-070).
 *
 * `COUNTERFACTUAL` and `INTERVENTION` are CDI-05's own and are unchanged; the CDI-05 engine
 * emits exactly those two and nothing else, which `run-cdi05-tests.ts` and `run-ctw01-tests.ts`
 * both assert. `OBSERVED` and `REFORECAST` were added by CTW-01 because two values cannot
 * express an elapsed actual series or a mid-flight reforecast. CTW-01 emits `OBSERVED`;
 * `REFORECAST` is reserved for `CTW-02` and is emitted by nothing at this baseline.
 */
export type TimelineTrajectoryKind =
  | 'COUNTERFACTUAL'
  | 'INTERVENTION'
  | 'OBSERVED'
  | 'REFORECAST';
export type TimelineLens = 'DEMAND' | 'REVENUE' | 'CONTRIBUTION' | 'INVENTORY';
export type TimelineLensAvailability = 'AVAILABLE' | 'NOT_AVAILABLE';
export type TimelinePointBasis =
  | 'CDI02_CURRENT_BASELINE_RUN_RATE'
  | 'CDI02_ENDPOINT_ALLOCATED'
  | 'NOT_MODELLED_BY_CDI02';
export type TemporalAllocationProfile = 'FLAT_RATE_IDENTITY';

/** CDI-02 weekly rate constant mirrored for lens rendering — not a second demand model. */
export const CDI02_BASE_WEEKLY_UNITS = 10000;

export interface TimelineSeriesPoint {
  period_index: number;
  period_date: string;
  simulation_period?: SimulationPeriod;
  phase: TimelinePhase;
  ambient_component_pp: number | null;
  intervention_component_pp: number | null;
  index_pct: number | null;
  basis: TimelinePointBasis;
  strength: EvidenceStrength;
  synthetic_demo: boolean;
  not_modelled_reason?: string;
  disclosure?: string;
}

export interface TimelineConfidenceEnvelopePoint {
  period_index: number;
  horizon_days_out: number;
  lower_index_pct: number;
  upper_index_pct: number;
}

export interface TimelineConfidenceEnvelope {
  band: ConfidenceBand;
  evidence_strength_floor: EvidenceStrength;
  model_integrity: {
    counterfactual_valid: boolean;
    causal_valid: boolean;
    reconciliation_ok: boolean;
  };
  horizon_basis: 'declared_horizon_uncertainty_profile';
  synthetic_demo: true;
  points: TimelineConfidenceEnvelopePoint[];
  calibration_target: string;
}

export interface TimelineTrajectory {
  kind: TimelineTrajectoryKind;
  points: TimelineSeriesPoint[];
  envelope: TimelineConfidenceEnvelope;
  terminal_index_pct: number;
}

export interface RequiredAuthoritativeInput {
  field: string;
  grain: string;
  why_required: string;
  inadmissible_substitutes: string[];
  enables: TimelineLens;
  status: 'AWAITING_AUTHORITATIVE_SOURCE';
}

export interface TimelineLensValue {
  period_index: number;
  counterfactual: number | null;
  intervention: number | null;
}

export interface TimelineLensProjection {
  lens: TimelineLens;
  availability: TimelineLensAvailability;
  quantity_basis: 'cdi02_weekly_rate' | 'cdi02_unit_contribution' | 'cdi02_waste_units' | 'none';
  values: TimelineLensValue[];
  strength: EvidenceStrength;
  missing_inputs: string[];
  required_authoritative_input?: RequiredAuthoritativeInput;
  disclosure?: string;
  /** WP10-C scalars — never a series */
  scalar_annotations?: Array<{
    field_path: string;
    value: number;
    temporal_extent: 'NONE — scalar state, not a time series';
    source: 'wp10c_derived_impacts';
  }>;
}

export type TimelineMarkerType =
  | 'CAMPAIGN_START'
  | 'CAMPAIGN_END'
  | 'WINDOW_START'
  | 'WINDOW_END'
  | 'WINDOW_TIER'
  | 'DISCOVERY_ANCHOR'
  | 'CONTEXT_SIGNAL'
  | 'READINESS_CONDITION'
  | 'CHANGE_TRIGGER';

export interface TimelineMarker {
  marker_id: string;
  marker_type: TimelineMarkerType;
  period_index: number;
  period_date: string;
  label: string;
  strength: EvidenceStrength;
  synthetic_demo: boolean;
  disclosure?: string;
  already_in_ambient?: boolean;
  ambient_driver_id?: CausalDriverId;
  source_package: 'CDI-01' | 'CDI-02' | 'CDI-03' | 'CDI-04' | 'ESF-2' | 'WP10-C';
}

export interface DecompositionRow {
  driver_id: CausalDriverId;
  driver_class: CausalDriverClass;
  label: string;
  contribution_pp: number;
  attributed: boolean;
  exclusion_reason?: string;
  rationale: string;
  evidence_refs: string[];
}

export interface DecompositionGroup {
  driver_class: CausalDriverClass;
  label: string;
  meaning: string;
  subtotal_pp: number;
  rows: DecompositionRow[];
}

export interface DemandDecomposition {
  ambient_group: DecompositionGroup;
  intervention_group: DecompositionGroup;
  residual_row: DecompositionRow;
  reconciliation: {
    reconciled_sum_pp: number;
    reconciliation_ok: boolean;
    validator_errors: string[];
  };
  excluded_drivers: DecompositionRow[];
}

export interface TimelineTier1Projection {
  attributable_uplift_pp: number;
  contribution_delta_gbp: number;
  confidence_band: ConfidenceBand;
  readiness_state?: ReadinessState;
  headline: string;
  /** Guard: total_predicted_uplift_pp must never appear here */
}

export interface DecisionTimelineProjection {
  projection_id: string;
  campaign_intent_id: string;
  tenant_id: string;
  session_id: string;
  grid: {
    points: number;
    start_date: string;
    end_date: string;
    campaign_start: string;
    campaign_end: string;
    grid_basis: string;
    pre_days: number;
    campaign_days: number;
    post_days: number;
  };
  trajectories: TimelineTrajectory[];
  lenses: TimelineLensProjection[];
  markers: TimelineMarker[];
  attributable_effect_envelope: TimelineConfidenceEnvelope;
  decomposition: DemandDecomposition;
  allocation_profile: TemporalAllocationProfile;
  allocation_provenance: 'information_preserving_identity';
  tier1: TimelineTier1Projection;
  readiness_reference?: { readiness_id: string; state: ReadinessState; headline: string };
  evidence_refs?: ReadinessEvidenceRef[];
  counterfactual_id: string;
  causal_id: string;
  calculation_mode: 'deterministic_demo_timeline';
  synthetic_demo: boolean;
  schema_version: string;
  provenance: Record<string, string>;
  timestamp: string;
  /** When band=INSUFFICIENT — no trajectories rendered */
  insufficient_reason?: string;
}

export interface TimelineProjectionRequest {
  tenant_id: string;
  session_id: string;
  campaign_intent_id?: string;
  campaign_intent?: CampaignIntent;
  include_signals?: boolean;
  campaign_evaluation?: CampaignEvaluationResponse;
  opportunity_discovery?: OpportunityDiscoveryResponse;
  readiness?: DecisionReadinessAssessment;
  /** Forbidden — RJ4 */
  allocation_profile_override?: unknown;
  envelope_profile_override?: unknown;
  evaluation_timestamp?: string;
}

export interface TimelineProjectionResponse {
  evaluation_id: string;
  tenant_id: string;
  session_id: string;
  campaign_intent_id: string;
  projection: DecisionTimelineProjection;
  timestamp: string;
  schema_version: string;
}

export const REVENUE_REQUIRED_INPUT: RequiredAuthoritativeInput = {
  field: 'realised_unit_selling_price_gbp',
  grain: 'per SKU per period, net of promotional discount',
  why_required:
    'realised campaign revenue = realised sell price × units; no other route is admissible',
  inadmissible_substitutes: [
    'RRP or list price',
    'contribution × assumed margin rate',
    'any assumed or default margin percentage'
  ],
  enables: 'REVENUE',
  status: 'AWAITING_AUTHORITATIVE_SOURCE'
};

export const POST_CAMPAIGN_NOT_MODELLED =
  'CogniX does not model what happens after this campaign — no persistence, decay or payback claim is asserted.';

export const PRE_CAMPAIGN_DISCLOSURE = 'modelled run-rate, not observed history';

function approxEqual(a: number, b: number, tol = 0.05): boolean {
  return Math.abs(a - b) <= tol;
}

/**
 * Points store index_pct rounded to 4 decimal places. Comparisons against an unrounded sum
 * must allow that rounding, and nothing more — this tolerance admits the representation
 * artefact and would still catch a real conservation break at the fifth decimal.
 */
const INDEX_ROUNDING_TOLERANCE = 1e-4;

export function validateDecisionTimelineProjection(
  p: Partial<DecisionTimelineProjection>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!p.projection_id) errors.push('Missing projection_id');
  if (!p.campaign_intent_id) errors.push('Missing campaign_intent_id');
  if (!Array.isArray(p.trajectories) || p.trajectories.length !== 2) {
    errors.push('trajectories must contain exactly two series');
  }
  if (!Array.isArray(p.lenses) || p.lenses.length !== 4) {
    errors.push('lenses must contain exactly four projections');
  }
  if (p.allocation_profile !== 'FLAT_RATE_IDENTITY') {
    errors.push('allocation_profile must be FLAT_RATE_IDENTITY');
  }
  if (p.tier1 && 'total_predicted_uplift_pp' in (p.tier1 as object)) {
    errors.push('Tier 1 must not contain total_predicted_uplift_pp');
  }
  const payload = JSON.stringify(p);
  if (/half_life|valid_until|remaining_hours|_expires/i.test(payload)) {
    errors.push('Half-Life semantics prohibited in CDI-05 projection');
  }
  if (/cumulative_|horizon_total|campaign_total_units/i.test(payload)) {
    errors.push('Cumulative / horizon-total quantities prohibited');
  }
  return { valid: errors.length === 0, errors };
}

export function validateTimelineProjectionRequest(
  r: Partial<TimelineProjectionRequest>
): { valid: boolean; errors: string[]; rejection_id?: string } {
  const errors: string[] = [];
  if (!r.tenant_id) errors.push('Missing tenant_id');
  if (!r.session_id) errors.push('Missing session_id');
  if (!r.campaign_intent_id && !r.campaign_intent) {
    errors.push('Provide campaign_intent_id or campaign_intent');
  }
  if (r.allocation_profile_override !== undefined || r.envelope_profile_override !== undefined) {
    return {
      valid: false,
      errors: ['RJ4: allocation/envelope profile is a build-time constant and is not caller-configurable'],
      rejection_id: 'RJ4'
    };
  }
  return { valid: errors.length === 0, errors };
}

export function assertAmbientParity(
  p: DecisionTimelineProjection
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const cf = p.trajectories.find(t => t.kind === 'COUNTERFACTUAL');
  const iv = p.trajectories.find(t => t.kind === 'INTERVENTION');
  if (!cf || !iv) {
    return { ok: false, violations: ['Missing trajectories'] };
  }
  for (let i = 0; i < cf.points.length; i++) {
    const a = cf.points[i];
    const b = iv.points[i];
    if (a.ambient_component_pp !== b.ambient_component_pp) {
      violations.push(`Ambient mismatch at index ${i}: ${a.ambient_component_pp} vs ${b.ambient_component_pp}`);
    }
    if (a.intervention_component_pp !== 0 && a.intervention_component_pp !== null) {
      violations.push(`Counterfactual intervention_component_pp non-zero at ${i}`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export function assertAmbientMovementPresent(
  p: DecisionTimelineProjection,
  ambientUpliftPp: number
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const cf = p.trajectories.find(t => t.kind === 'COUNTERFACTUAL');
  const iv = p.trajectories.find(t => t.kind === 'INTERVENTION');
  if (!cf || !iv) return { ok: false, violations: ['Missing trajectories'] };

  for (const t of [cf, iv]) {
    for (const pt of t.points.filter(x => x.phase === 'PRE_CAMPAIGN')) {
      if (pt.index_pct !== 100) {
        violations.push(`PRE_CAMPAIGN index_pct ${pt.index_pct} ≠ 100 (${t.kind})`);
      }
    }
  }

  const campaignCf = cf.points.filter(x => x.phase === 'CAMPAIGN');
  if (ambientUpliftPp !== 0) {
    for (const pt of campaignCf) {
      if (pt.index_pct === 100) {
        violations.push('CAMPAIGN counterfactual pinned to 100 while ambient_uplift_pp ≠ 0');
      }
      if (pt.ambient_component_pp !== ambientUpliftPp) {
        violations.push(`CAMPAIGN ambient_component_pp ${pt.ambient_component_pp} ≠ ${ambientUpliftPp}`);
      }
      // index_pct is rounded to 4 decimal places when the point is built, so comparing it
      // to an unrounded float sum is an exact-equality test against a deliberately rounded
      // number: 100 + 19.46 is 119.46000000000001 in IEEE-754 while the stored point reads
      // 119.46. Whether that test passed depended on the ambient value's binary
      // representation rather than on conservation holding, which is what it exists to check.
      if (!approxEqual(pt.index_pct ?? 0, 100 + (pt.ambient_component_pp || 0), INDEX_ROUNDING_TOLERANCE)) {
        violations.push(`CAMPAIGN counterfactual index must be 100 + ambient`);
      }
    }
    // Within-campaign flatness
    if (campaignCf.length > 1) {
      const first = campaignCf[0].index_pct;
      if (campaignCf.some(pt => pt.index_pct !== first)) {
        violations.push('Within-CAMPAIGN ambient slope detected — FLAT_RATE_IDENTITY violated');
      }
    }
  } else {
    for (const pt of campaignCf) {
      if (pt.index_pct !== 100) {
        violations.push(`With ambient=0, CAMPAIGN counterfactual must be 100, got ${pt.index_pct}`);
      }
    }
  }

  // Ambient equal on both trajectories in campaign
  const campaignIv = iv.points.filter(x => x.phase === 'CAMPAIGN');
  for (let i = 0; i < campaignCf.length; i++) {
    if (campaignCf[i].ambient_component_pp !== campaignIv[i]?.ambient_component_pp) {
      violations.push(`Ambient parity fail in CAMPAIGN at ${i}`);
    }
  }

  return { ok: violations.length === 0, violations };
}

export function assertAttributableIsDifferenceOnly(
  p: DecisionTimelineProjection
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const cf = p.trajectories.find(t => t.kind === 'COUNTERFACTUAL');
  const iv = p.trajectories.find(t => t.kind === 'INTERVENTION');
  if (!cf || !iv) return { ok: false, violations: ['Missing trajectories'] };
  for (let i = 0; i < cf.points.length; i++) {
    const a = cf.points[i];
    const b = iv.points[i];
    if (a.index_pct == null || b.index_pct == null) continue;
    const diff = Number((b.index_pct - a.index_pct).toFixed(4));
    const expected = b.intervention_component_pp ?? 0;
    if (!approxEqual(diff, expected)) {
      violations.push(`Difference ≠ intervention at ${i}: ${diff} vs ${expected}`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export function assertAllocationConserves(
  p: DecisionTimelineProjection,
  ambientPp: number,
  interventionPp: number
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const cf = p.trajectories.find(t => t.kind === 'COUNTERFACTUAL');
  const iv = p.trajectories.find(t => t.kind === 'INTERVENTION');
  if (!cf || !iv) return { ok: false, violations: ['Missing trajectories'] };
  const cfCamp = cf.points.filter(x => x.phase === 'CAMPAIGN');
  const ivCamp = iv.points.filter(x => x.phase === 'CAMPAIGN');
  if (cfCamp.length === 0) return { ok: false, violations: ['No CAMPAIGN points'] };
  // Identity: every campaign day holds the endpoint — terminal equals CDI-02
  const cfTerminal = cfCamp[cfCamp.length - 1];
  const ivTerminal = ivCamp[ivCamp.length - 1];
  if (!approxEqual(cfTerminal.ambient_component_pp ?? 0, ambientPp)) {
    violations.push(`CF terminal ambient ${cfTerminal.ambient_component_pp} ≠ ${ambientPp}`);
  }
  if (!approxEqual(ivTerminal.intervention_component_pp ?? 0, interventionPp)) {
    violations.push(`IV terminal intervention ${ivTerminal.intervention_component_pp} ≠ ${interventionPp}`);
  }
  if (!approxEqual(ivTerminal.ambient_component_pp ?? 0, ambientPp)) {
    violations.push(`IV terminal ambient ${ivTerminal.ambient_component_pp} ≠ ${ambientPp}`);
  }
  return { ok: violations.length === 0, violations };
}

export function assertNoObservedHistory(
  p: DecisionTimelineProjection
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const t of p.trajectories) {
    for (const pt of t.points) {
      if (pt.basis === ('OBSERVED' as TimelinePointBasis)) {
        violations.push('Observed basis prohibited');
      }
      if (pt.strength === 'OBSERVED' && pt.synthetic_demo) {
        violations.push(`OBSERVED+synthetic at ${pt.period_date}`);
      }
      if (pt.phase === 'PRE_CAMPAIGN' && pt.index_pct !== 100) {
        violations.push(`PRE_CAMPAIGN not flat at 100: ${pt.index_pct}`);
      }
    }
  }
  const blob = JSON.stringify(p);
  if (/\bobserved history\b|\bactual demand\b|\bhistorical series\b/i.test(blob) &&
      !/not observed history/i.test(blob)) {
    violations.push('Language implying observed history without disclosure');
  }
  return { ok: violations.length === 0, violations };
}

export function assertPostCampaignEmpty(
  p: DecisionTimelineProjection
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  let postCount = 0;
  for (const t of p.trajectories) {
    for (const pt of t.points.filter(x => x.phase === 'POST_CAMPAIGN')) {
      postCount++;
      if (pt.ambient_component_pp !== null || pt.intervention_component_pp !== null || pt.index_pct !== null) {
        violations.push(`POST_CAMPAIGN has numeric components at ${pt.period_date}`);
      }
      if (!pt.not_modelled_reason) {
        violations.push(`POST_CAMPAIGN missing not_modelled_reason at ${pt.period_date}`);
      }
      if (pt.basis !== 'NOT_MODELLED_BY_CDI02') {
        violations.push(`POST_CAMPAIGN basis must be NOT_MODELLED_BY_CDI02`);
      }
    }
  }
  if (postCount === 0) {
    violations.push('POST_CAMPAIGN phase must be structurally present');
  }
  return { ok: violations.length === 0, violations };
}

export function assertEnvelopeMonotone(
  p: DecisionTimelineProjection
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const check = (env: TimelineConfidenceEnvelope, label: string) => {
    for (let i = 1; i < env.points.length; i++) {
      const prev = env.points[i - 1];
      const cur = env.points[i];
      const prevW = prev.upper_index_pct - prev.lower_index_pct;
      const curW = cur.upper_index_pct - cur.lower_index_pct;
      if (curW + 1e-9 < prevW) {
        violations.push(`${label} envelope narrows at index ${cur.period_index}`);
      }
    }
  };
  for (const t of p.trajectories) check(t.envelope, t.kind);
  check(p.attributable_effect_envelope, 'attributable_effect');
  return { ok: violations.length === 0, violations };
}

/**
 * U3 / I7 at the envelope layer. A point can be null in the series and still be asserted
 * by a band drawn over it: a post-campaign envelope centred on the identity draws
 * reversion, and an effect envelope centred on zero draws convergence. Both are causal
 * claims CDI-02 does not make, so no envelope may extend past the modelled phases.
 */
export function assertEnvelopeWithinModelledPhases(
  p: DecisionTimelineProjection
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const phaseByIndex = new Map<number, TimelinePhase>();
  for (const t of p.trajectories) {
    for (const pt of t.points) phaseByIndex.set(pt.period_index, pt.phase);
  }
  const check = (env: TimelineConfidenceEnvelope, label: string, campaignOnly: boolean) => {
    for (const ep of env.points) {
      const phase = phaseByIndex.get(ep.period_index);
      if (phase === 'POST_CAMPAIGN') {
        violations.push(`${label} envelope asserts a band over POST_CAMPAIGN index ${ep.period_index}`);
      }
      if (campaignOnly && phase !== 'CAMPAIGN') {
        violations.push(
          `${label} envelope extends outside the CAMPAIGN phase at index ${ep.period_index}`
        );
      }
    }
  };
  for (const t of p.trajectories) check(t.envelope, t.kind, false);
  check(p.attributable_effect_envelope, 'attributable_effect', true);
  return { ok: violations.length === 0, violations };
}

/**
 * I14. A signal CDI-02 already consumed as an ambient driver is inside
 * ambient_component_pp; rendering it as an additional effect counts the same weather
 * twice.
 */
export function assertContextSignalsNotDoubleCounted(
  p: DecisionTimelineProjection
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const m of p.markers.filter(x => x.marker_type === 'CONTEXT_SIGNAL')) {
    if (m.already_in_ambient !== true) {
      violations.push(`CONTEXT_SIGNAL ${m.marker_id} must declare already_in_ambient`);
    }
    if (m.ambient_driver_id !== 'external_signal_response') {
      violations.push(`CONTEXT_SIGNAL ${m.marker_id} must name its ambient driver`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export function assertUnavailableLensNamesInput(
  p: DecisionTimelineProjection
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const revenue = p.lenses.find(l => l.lens === 'REVENUE');
  if (!revenue) {
    violations.push('REVENUE lens missing');
  } else {
    if (revenue.availability !== 'NOT_AVAILABLE') {
      violations.push('REVENUE must be NOT_AVAILABLE without realised selling price');
    }
    if (revenue.strength !== 'MISSING') {
      violations.push('REVENUE strength must be MISSING');
    }
    if (!revenue.required_authoritative_input) {
      violations.push('REVENUE must publish required_authoritative_input');
    }
    if (!revenue.missing_inputs.some(m => /unit_price/i.test(m))) {
      violations.push('REVENUE missing_inputs must name unit_price_gbp');
    }
  }
  if (!p.provenance?.lenses_unavailable?.includes('REVENUE')) {
    // provenance is Record<string,string> — check lenses_unavailable key
    if (!String(p.provenance?.lenses_unavailable || '').includes('REVENUE')) {
      violations.push('provenance.lenses_unavailable must name REVENUE');
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * CDI-04's rule, reused rather than redefined (design gate §5.1). CDI-05 defines no
 * second evidence taxonomy and no second implementation of one, so upstream changes to
 * the strength order cannot silently diverge here.
 */
export const weakestStrength = weakestEvidenceStrength;
