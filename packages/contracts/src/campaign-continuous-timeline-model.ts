/**
 * CogniX CTW-01 — Continuous Campaign Timeline & Activation
 *
 * The first work package of `IB-13` (Continuous Live Decision Twin), governed by
 * `docs/governance/COGNIX_INNOVATION_BACKLOG.md` §5 and **ADR-070**.
 *
 * What this contract is:
 *   A *second consumer* of `DecisionTimelineProjection` (CDI-05). It adds no projection
 *   engine, no demand model and no second baseline. The governed baseline is the activated
 *   `DecisionContract` (CDI-07A) and its `decision_basis_digest`.
 *
 * The three rules this file exists to make structural (ADR-070):
 *   1. Observed, simulated and predicted are three separately declared classes over one
 *      horizon. A `PREDICTED_REMAINING` point may never carry `OBSERVED` evidence strength
 *      and may never be read as an observation.
 *   2. Activation binds to an existing `ACTIVE` DecisionContract. There is no activation
 *      record carrying its own expectation, because that would be a second baseline.
 *   3. `OBSERVED_ELAPSED` requires an `ESF-6`-admitted observation. Nothing in CTW-01
 *      produces one, so every elapsed period is `SIMULATED_ELAPSED` and says so.
 *
 * Out of scope, deliberately, and asserted in the test suite: adaptive intervention,
 * remaining-horizon reforecast (both `CTW-02`), and post-flight reconciliation (extension
 * work on `CDI-08` and the `CampaignDecisionExperiment` comparison surface).
 */

import { EvidenceStrength, ConfidenceBand } from './campaign-readiness-model';
import {
  TimelineConfidenceEnvelope,
  TimelineTrajectoryKind,
  DecisionTimelineProjection
} from './campaign-timeline-model';
import { DecisionContractReference, DecisionContractStatus } from './campaign-decision-contract-model';
import { BacktestMetrics, ForecastExecution, IntervalBasis } from './forecast-model-model';

// ---------------------------------------------------------------------------
// CTW-03 — how the campaign expectation is distributed across the horizon
// ---------------------------------------------------------------------------

/**
 * `FLAT_RATE_IDENTITY` was the only profile CTW-01 could offer: CDI-05 spreads the campaign effect
 * evenly, so every remaining day carried the same expectation and no day differed from another.
 *
 * `FORECAST_SHAPED` redistributes that same total across the window using a **governed forecast's**
 * per-day shape. It is information-preserving in exactly the sense CDI-05 means it: the total the
 * activated contract expects over the window is unchanged to within rounding, and only its
 * distribution moves. It is therefore not a second baseline — it is the same baseline, with a shape
 * the estate can now defend because a real model produced it.
 */
export type FlightAllocationProfile = 'FLAT_RATE_IDENTITY' | 'FORECAST_SHAPED';

/**
 * The forecast that shaped the horizon, named on the projection so a reader can always ask what
 * produced the shape. The Twin never branches on `model_id` — it renders whatever is here.
 */
export interface FlightForecastBinding {
  model_id: string;
  model_display_name: string;
  implementation_ref: string;
  execution_id: string;
  interval_basis: IntervalBasis;
  fitted_parameters: Record<string, number>;
  backtest: BacktestMetrics | null;
  /** Why the shape is admissible, stated on the artefact. */
  disclosure: string;
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/** Where a period sits relative to the activated campaign window. */
export type CampaignFlightPhase = 'PRE_FLIGHT' | 'IN_FLIGHT' | 'POST_FLIGHT';

/**
 * The evidentiary class of a period. This is the axis that keeps observed, simulated and
 * predicted apart, and it is orthogonal to `EvidenceStrength` (how strong a datum is) and to
 * `TimelinePointBasis` (which CDI-02 quantity it resolves to).
 */
export type CampaignHorizonClass =
  /** An elapsed period carrying an `ESF-6`-admitted observation. Unreachable at this baseline. */
  | 'OBSERVED_ELAPSED'
  /** An elapsed period whose values are seeded demonstration telemetry. */
  | 'SIMULATED_ELAPSED'
  /** A period after today. A projection. Never an observation, at any strength. */
  | 'PREDICTED_REMAINING';

/** Activation state, read from the bound contract — never stored independently of it. */
export type FlightActivationState = 'NOT_ACTIVATED' | 'ACTIVE' | 'SUPERSEDED' | 'WITHDRAWN';

/**
 * Whether a deviation is a defensible comparison. CTW-01 emits `LIKE_FOR_LIKE` because the
 * actual series is expressed in the projection's own basis (see `ActualSeriesBasis`), so both
 * sides of the subtraction carry the same quantity, basis and window — the `CDI-08` standard.
 */
export type DeviationCorrespondence =
  | 'LIKE_FOR_LIKE'
  | 'BASIS_NOT_CORRESPONDING';

/**
 * How the elapsed actual series was obtained.
 *
 * `PROJECTION_BASIS_SCALED_BY_OBSERVED_RATIO` is the only value CTW-01 emits, and it is the
 * load-bearing honesty statement in this contract. The seeded campaign telemetry and the
 * CDI-05 projection are on different quantity bases and different populations — seeded
 * telemetry is £/day and an unanchored daily index; CDI-05 publishes a weekly-rate volume and
 * a weekly-rate contribution over `CDI02_BASE_WEEKLY_UNITS`. Subtracting one from the other
 * would be a basis error of exactly the kind `CDI-08` exists to refuse.
 *
 * What the telemetry *can* legitimately supply is a **scale-free ratio** — how far off its own
 * plan the campaign is running — computed with both numerator and denominator inside the
 * telemetry's own basis. That ratio is then applied to the contract-bound projection, so the
 * actual series lands in the projection's basis and the deviation is like-for-like. This is
 * the `DDF-01` precedent: supplier capacity is consumed from `WP10-C` as a scale-free ratio
 * precisely so that a population-boundary crossing does not create a fourth capacity number.
 */
export type ActualSeriesBasis =
  | 'PROJECTION_BASIS_SCALED_BY_OBSERVED_RATIO'
  | 'ADMITTED_OBSERVATION';

/** The lenses CTW-01 carries. Revenue is deliberately absent — see `FLIGHT_LENS_NON_SCOPE`. */
export type FlightLens = 'DEMAND' | 'CONTRIBUTION';

// ---------------------------------------------------------------------------
// Activation — a reference, never a second baseline
// ---------------------------------------------------------------------------

/**
 * Activation is a *binding*, not a record with its own expectation. Everything here either
 * references the contract or is read from it. There is no expectation value on this type, by
 * design: the expectation lives in the contract's basis and in the CDI-05 projection the
 * contract's basis was computed from.
 */
export interface FlightActivation {
  state: FlightActivationState;
  contract_ref: DecisionContractReference;
  contract_status: DecisionContractStatus;
  /** Copied from the contract. The immutable identity of what was decided. */
  decision_basis_digest: string;
  /** The contract's own reference instant. Never re-stamped by the flight projection. */
  activated_as_of: string;
  /** Read from the bound intent's declared window — not from a seeded archetype constant. */
  campaign_start: string;
  campaign_end: string;
  disclosure: string;
}

// ---------------------------------------------------------------------------
// Horizon
// ---------------------------------------------------------------------------

export interface FlightHorizon {
  /** Every day of the activated campaign window, inclusive. */
  flight_days: number;
  /** Days at or before today. Never exceeds `flight_days` or the telemetry supplied. */
  elapsed_days: number;
  /** `flight_days - elapsed_days`. The part that did not exist before CTW-01. */
  remaining_days: number;
  /** 1-based day index of today within the window; 0 when nothing has elapsed. */
  today_flight_day: number;
  campaign_start: string;
  campaign_end: string;
  /** The CDI-05 grid period indices this window maps onto — the correspondence proof. */
  first_period_index: number;
  last_period_index: number;
  horizon_basis: 'activated_contract_campaign_window';
}

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------

export interface ContinuousSeriesPoint {
  /** 1-based day within the flight window. */
  flight_day: number;
  /** The CDI-05 grid period this day is read from. */
  period_index: number;
  period_date: string;
  phase: CampaignFlightPhase;
  horizon_class: CampaignHorizonClass;

  /**
   * What the activated contract expected for this day. Present for every day of the window,
   * elapsed and remaining alike — it is the baseline both halves are read against.
   */
  expectation_value: number | null;

  /**
   * What the campaign is running at. Non-null only for elapsed days. `null` on every
   * `PREDICTED_REMAINING` day, structurally — a future day has no actual, and leaving the
   * field absent rather than optimistically equal to the expectation is the difference
   * between a prediction and a claim.
   */
  actual_value: number | null;

  /** `actual_value - expectation_value`, in the projection's basis. Null when no actual. */
  deviation_abs: number | null;
  /** The same deviation as a percentage of the expectation. Null when no actual. */
  deviation_pct: number | null;

  /**
   * The declared uncertainty around the expectation, in this lens's own quantity.
   *
   * Transformed from the CDI-05 `attributable_effect_envelope` by the same arithmetic CDI-05
   * itself uses to turn an index into a quantity — the envelope bounds the attributable effect
   * in pp, the ambient component is added back, and the resulting index is scaled by
   * `CDI02_BASE_WEEKLY_UNITS`. No width is invented and none is narrowed. It remains a
   * **declared** horizon profile, not a calibrated interval, and must never be rendered as one.
   */
  expectation_lower: number | null;
  expectation_upper: number | null;

  strength: EvidenceStrength;
  synthetic_demo: boolean;
  disclosure?: string;
}

export interface ContinuousLensSeries {
  lens: FlightLens;
  availability: 'AVAILABLE' | 'NOT_AVAILABLE';
  /** The projection basis both the expectation and the actual are expressed in. */
  quantity_basis: 'cdi02_weekly_rate' | 'cdi02_unit_contribution';
  actual_series_basis: ActualSeriesBasis;
  deviation_correspondence: DeviationCorrespondence;
  points: ContinuousSeriesPoint[];
  strength: EvidenceStrength;
  disclosure: string;
  /** How `expectation_lower` / `expectation_upper` were obtained, or that they were not. */
  uncertainty_basis:
    | 'cdi05_attributable_effect_envelope_transformed'
    | 'NONE';
  uncertainty_disclosure: string;
  /** Present when `deviation_correspondence` is `BASIS_NOT_CORRESPONDING`. */
  non_correspondence_reason?: string;
}

/**
 * One trajectory over the flight window. Reuses `TimelineTrajectoryKind` rather than coining a
 * second trajectory vocabulary (ADR-070). CTW-01 emits `INTERVENTION` (the contract-bound
 * pre-flight expectation) and `OBSERVED` (the elapsed actual). It emits no `REFORECAST` — that
 * value is reserved for `CTW-02` and its absence here is asserted in the test suite.
 */
export interface FlightTrajectory {
  kind: TimelineTrajectoryKind;
  /** Human-readable role, so a reader never has to infer meaning from an enum. */
  role:
    | 'What the activated decision expected'
    | 'What the campaign is running at'
    | 'What we now expect, after intervening';
  covers: 'FULL_HORIZON' | 'ELAPSED_ONLY' | 'REMAINING_ONLY';
  points: ContinuousSeriesPoint[];
}

// ---------------------------------------------------------------------------
// Deviation summary
// ---------------------------------------------------------------------------

export type FlightDeviationState =
  | 'ON_PLAN'
  | 'AHEAD_OF_PLAN'
  | 'BEHIND_PLAN'
  | 'NOT_ASSESSABLE';

export interface FlightDeviationSummary {
  lens: FlightLens;
  state: FlightDeviationState;
  /** Deviation on the most recent elapsed day. Null when nothing has elapsed. */
  latest_deviation_pct: number | null;
  /** Mean deviation across elapsed days. Null when nothing has elapsed. */
  mean_deviation_pct: number | null;
  elapsed_days_assessed: number;
  basis: string;
  /** Stated in words, from the numbers above and nothing else. */
  statement: string;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/**
 * One elapsed day of campaign telemetry, as the demonstration world model holds it.
 *
 * Both the expected and the observed value are required and must be on the *same* basis as
 * each other — that is what makes their ratio scale-free and therefore usable. The engine
 * never reads the expected value as a baseline; it reads it only as the denominator of a
 * ratio, and the governed baseline remains the activated contract's projection.
 */
export interface ElapsedTelemetryReading {
  flight_day: number;
  demand_expected: number;
  demand_observed: number;
  contribution_expected: number;
  contribution_observed: number;
  /**
   * A seeded per-day stock reading, carried through so that retiring the old per-day card strip
   * loses nothing (CTW-01R §6). It is reported verbatim as a supplementary reading and never
   * becomes a trajectory: a stock series needs a declared depletion basis that nothing supplies.
   */
  depot_stock_units?: number;
  /**
   * The demonstration world model's own per-day classification. Carried through so retiring the
   * card strip drops nothing, and reported as what it is — a seeded label, not CogniX's assessment
   * against the activated decision, which is derived separately and from different inputs.
   */
  seeded_status?: string;
}

/**
 * CTW-02. An intervention that has been confirmed and now applies from a stated day.
 *
 * It never rewrites anything: the original expectation and the observed series stay exactly as they
 * were, and the reforecast is published beside them as an additional series over the remaining days
 * only. `effective_from_flight_day` is always after today, because an elapsed day cannot be
 * re-decided.
 */
export interface AppliedIntervention {
  intervention_id: string;
  action_label: string;
  effective_from_flight_day: number;
  confirmed_by: string;
  statement: string;
  /** Why the campaign changed, carried on the projection so history explains itself. */
  reason: string;
}

/** The reforecast over the remaining horizon, one series per lens. */
export interface ReforecastSeries {
  lens: FlightLens;
  points: ContinuousSeriesPoint[];
  disclosure: string;
}

export interface FlightProjectionRequest {
  tenant_id: string;
  session_id: string;
  /** The activated contract. Required — there is no flight without an activation. */
  contract_id: string;
  /** The CDI-05 projection the flight window is read from. */
  timeline: DecisionTimelineProjection;
  elapsed_telemetry: ElapsedTelemetryReading[];
  /**
   * CTW-03. A governed forecast covering at least the campaign window. Optional: without it the
   * horizon stays flat and says so, exactly as CTW-01 left it.
   */
  forecast?: ForecastExecution;
  /**
   * CTW-02. A confirmed intervention and the CDI-05 projection of the campaign as changed. The
   * engine reforecasts only from `effective_from_flight_day`, through the same CTW-03 forecast
   * shape — it runs no model of its own.
   */
  applied_intervention?: AppliedIntervention & { timeline: DecisionTimelineProjection };
  /** Forbidden — CTW-01 never accepts a caller-supplied expectation (RJ-W1). */
  expectation_override?: unknown;
  /** Forbidden — reforecast is CTW-02 (RJ-W2). */
  reforecast_override?: unknown;
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface CampaignFlightProjection {
  flight_id: string;
  tenant_id: string;
  session_id: string;
  campaign_intent_id: string;

  activation: FlightActivation;
  horizon: FlightHorizon;
  trajectories: FlightTrajectory[];
  lenses: ContinuousLensSeries[];
  deviation: FlightDeviationSummary[];

  /** One narration per day of the window, derived from the figures above and nothing else. */
  day_narratives: FlightDayNarrative[];
  /** How the contract's expectation is distributed across the window, and why. Published, not hidden. */
  horizon_shape_disclosure: string;
  allocation_profile: FlightAllocationProfile;
  /** The governed forecast that shaped the horizon, or null when nothing did. */
  forecast: FlightForecastBinding | null;
  /** CTW-02 — the confirmed intervention, if any, and the reforecast it produced. */
  applied_intervention: AppliedIntervention | null;
  reforecast: ReforecastSeries[] | null;

  /**
   * The CDI-05 envelope, restricted to the flight window and unchanged in value. Rendered
   * with its declared basis visible, because `declared_horizon_uncertainty_profile` is a
   * declared profile and not a calibrated interval, and must never be shown as one.
   */
  uncertainty: TimelineConfidenceEnvelope;
  confidence_band: ConfidenceBand;

  /** Provenance of the projection this flight was read from. No second projection exists. */
  timeline_projection_id: string;
  counterfactual_id: string;
  causal_id: string;

  calculation_mode: 'deterministic_continuous_flight_timeline';
  synthetic_demo: boolean;
  schema_version: string;
  provenance: Record<string, string>;
  timestamp: string;

  /** What CTW-01 deliberately does not do, published so the boundary is machine-checkable. */
  non_scope: string[];
}

export interface FlightProjectionResponse {
  evaluation_id: string;
  tenant_id: string;
  session_id: string;
  projection: CampaignFlightProjection;
  timestamp: string;
  schema_version: string;
}

// ---------------------------------------------------------------------------
// Declared constants
// ---------------------------------------------------------------------------

export const FLIGHT_SCHEMA_VERSION = '1.0.0';

export const ACTIVATION_DISCLOSURE =
  'The governed baseline is the activated decision contract. This view creates no separate ' +
  'campaign baseline and holds no expectation of its own — every expectation shown is read ' +
  'from the CDI-05 projection the contract binds.';

export const PREDICTED_REMAINING_DISCLOSURE =
  'Projected, not observed. This day has not happened.';

export const SIMULATED_ELAPSED_DISCLOSURE =
  'Seeded demonstration telemetry, not a production feed and not an admitted observation.';

export const UNCERTAINTY_DISCLOSURE =
  'Declared horizon uncertainty profile carried from CDI-05, expressed in this lens\'s quantity. ' +
  'It widens with horizon by declaration, not by calibration, and is not a probability interval.';

export const ACTUAL_SERIES_BASIS_DISCLOSURE =
  'The running series is the contract-bound projection scaled by a scale-free deviation ratio ' +
  'read from the demonstration telemetry. It is not a measurement, and the demonstration ' +
  "telemetry's own expected values are never used as a baseline.";

/** What would make `OBSERVED_ELAPSED` reachable. Published so the gap cannot be quietly closed. */
export const OBSERVED_ELAPSED_REQUIRED_INPUT = {
  field: 'ESF-6 admitted OutcomeObservation at the contracted grain',
  why_required:
    'An elapsed day may only be classed OBSERVED_ELAPSED when its values come from a source ' +
    'admitted by the ESF-6 predicate source x context -> authority. Seeded telemetry is not ' +
    'admitted evidence at any strength.',
  inadmissible_substitutes: [
    'seeded archetype telemetry',
    'a simulated campaign day',
    'a projection with a high confidence band'
  ],
  status: 'AWAITING_ATTESTED_OBSERVATION' as const
};

/** Lenses deliberately not carried by CTW-01, with the reason each is refused. */
export const FLIGHT_LENS_NON_SCOPE: Array<{ lens: string; reason: string }> = [
  {
    lens: 'REVENUE',
    reason:
      'CDI-05 publishes REVENUE as NOT_AVAILABLE pending realised unit selling price. That ' +
      'refusal is correct and is not overridden to make a demonstration look complete.'
  },
  {
    lens: 'INVENTORY',
    reason:
      'A stock trajectory needs a declared depletion basis. WP10-C supplies scalars, and ' +
      'CDI-05 renders inventory as an unsmoothed level shift rather than a series. Drawing a ' +
      'stock line across the horizon would fabricate a depletion curve neither supplies.'
  }
];

export const REFORECAST_DISCLOSURE =
  'Reforecast from the day the intervention takes effect, using the same governed forecast shape. ' +
  'The original expectation and every elapsed day are unchanged and still shown — nothing was ' +
  'overwritten, and no second forecasting model was run.';

export const CTW01_NON_SCOPE: string[] = [
  'Post-flight reconciliation — extension of CDI-08 and the experiment comparison surface',
  'Any attested observation, learning candidate or learning case',
  'Any new origin of synthetic_demo = false',
  'Any change to CDI-01..CDI-08, ESF-6 or WP10-C semantics'
];

// ---------------------------------------------------------------------------
// Guards — the invariants, executable
// ---------------------------------------------------------------------------

export interface FlightInvariantViolation {
  invariant: string;
  detail: string;
}

/**
 * The structural rules of ADR-070, checked rather than asserted in prose.
 *
 * `W-INV-1` a predicted day may never carry OBSERVED strength
 * `W-INV-2` a predicted day may never carry an actual value
 * `W-INV-3` an elapsed day may only be OBSERVED_ELAPSED with an admitted observation
 * `W-INV-4` a REFORECAST trajectory exists only where an intervention was applied, and covers
 *           only days after it took effect — CTW-02 strengthened this from CTW-01's blanket ban,
 *           which was correct while nothing could produce one and is now too weak to be useful
 * `W-INV-5` every day of the window is represented exactly once, in order
 * `W-INV-6` deviation is present exactly where an actual is present
 * `W-INV-7` where an uncertainty band is present it brackets the expectation it belongs to
 */
export function validateFlightProjection(
  projection: CampaignFlightProjection
): FlightInvariantViolation[] {
  const violations: FlightInvariantViolation[] = [];

  for (const lens of projection.lenses) {
    for (const pt of lens.points) {
      if (pt.horizon_class === 'PREDICTED_REMAINING') {
        if (pt.strength === 'OBSERVED') {
          violations.push({
            invariant: 'W-INV-1',
            detail: `${lens.lens} day ${pt.flight_day} is PREDICTED_REMAINING with OBSERVED strength`
          });
        }
        if (pt.actual_value !== null) {
          violations.push({
            invariant: 'W-INV-2',
            detail: `${lens.lens} day ${pt.flight_day} is PREDICTED_REMAINING and carries an actual value`
          });
        }
      }
      if (pt.horizon_class === 'OBSERVED_ELAPSED' && lens.actual_series_basis !== 'ADMITTED_OBSERVATION') {
        violations.push({
          invariant: 'W-INV-3',
          detail: `${lens.lens} day ${pt.flight_day} claims OBSERVED_ELAPSED without an admitted observation`
        });
      }
      if (
        pt.expectation_lower !== null &&
        pt.expectation_upper !== null &&
        pt.expectation_value !== null &&
        (pt.expectation_lower > pt.expectation_value || pt.expectation_upper < pt.expectation_value)
      ) {
        violations.push({
          invariant: 'W-INV-7',
          detail: `${lens.lens} day ${pt.flight_day} band [${pt.expectation_lower}, ${pt.expectation_upper}] does not bracket expectation ${pt.expectation_value}`
        });
      }

      const hasActual = pt.actual_value !== null;
      const hasDeviation = pt.deviation_abs !== null;
      if (hasActual !== hasDeviation) {
        violations.push({
          invariant: 'W-INV-6',
          detail: `${lens.lens} day ${pt.flight_day} has actual=${hasActual} but deviation=${hasDeviation}`
        });
      }
    }

    const days = lens.points.map(p => p.flight_day);
    const expected = Array.from({ length: projection.horizon.flight_days }, (_, i) => i + 1);
    if (days.length !== expected.length || days.some((d, i) => d !== expected[i])) {
      violations.push({
        invariant: 'W-INV-5',
        detail: `${lens.lens} covers [${days.join(',')}] not the full ordered window of ${projection.horizon.flight_days} days`
      });
    }
  }

  const reforecastTrajectory = projection.trajectories.find(t => t.kind === 'REFORECAST');
  if (reforecastTrajectory && !projection.applied_intervention) {
    violations.push({
      invariant: 'W-INV-4',
      detail: 'a REFORECAST trajectory exists with no applied intervention to justify it'
    });
  }
  if (reforecastTrajectory && projection.applied_intervention) {
    const effective = projection.applied_intervention.effective_from_flight_day;
    if (reforecastTrajectory.points.some(p => p.flight_day < effective)) {
      violations.push({
        invariant: 'W-INV-4',
        detail: `the reforecast reaches back before day ${effective}, when the intervention took effect`
      });
    }
  }
  for (const series of projection.reforecast || []) {
    if (series.points.some(p => p.actual_value !== null)) {
      violations.push({
        invariant: 'W-INV-4',
        detail: `${series.lens} reforecast carries an actual value; a reforecast is entirely prediction`
      });
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// CTW-01R — Decision confirmation vocabulary
// ---------------------------------------------------------------------------

/**
 * `CTW-01` asked a human resolver for two free-text strings — *who is deciding* and *why*.
 * Both are load-bearing CDI-07A provenance (`resolved_by`, `resolution_statement`) and neither
 * was answerable by a Promotion Analyst without knowing what the system wanted. CTW-01R keeps
 * the provenance exactly and replaces the blank boxes with governed choices.
 *
 * These are **demonstration vocabularies**, not an organisational role model. They exist so a
 * decision can be attributed to an accountable role in a demo; a real deployment would bind
 * them to the tenant's own directory.
 */
export interface DecisionConfirmationOption {
  id: string;
  label: string;
}

export const DECISION_OWNER_ROLES: DecisionConfirmationOption[] = [
  { id: 'PROMOTION_ANALYST', label: 'Promotion Analyst' },
  { id: 'CATEGORY_MANAGER', label: 'Category Manager' },
  { id: 'COMMERCIAL_MANAGER', label: 'Commercial Manager' },
  { id: 'DEMAND_PLANNER', label: 'Demand Planner' },
  { id: 'CAMPAIGN_LEAD', label: 'Campaign Lead' },
  { id: 'OTHER', label: 'Other (specify)' }
];

export const DECISION_RATIONALES: DecisionConfirmationOption[] = [
  { id: 'PROTECT_MARGIN', label: 'Protect margin' },
  { id: 'PRIORITISE_DEMAND_GROWTH', label: 'Prioritise demand growth' },
  { id: 'REDUCE_STOCK_EXPOSURE', label: 'Reduce stock exposure' },
  { id: 'MAINTAIN_CUSTOMER_PROPOSITION', label: 'Maintain customer proposition' },
  { id: 'OPERATIONAL_CONSTRAINT', label: 'Operational constraint' },
  { id: 'OTHER', label: 'Other (specify)' }
];

/** Why a person is being asked at all. Stated once, in the analyst's language. */
export const DECISION_CONFIRMATION_EXPLANATION =
  'CogniX has identified more than one viable option. The evidence does not justify choosing one ' +
  'automatically, so a person must confirm how to proceed.';

export const DECISION_OWNER_HELPER = 'Who is accountable for approving this campaign decision?';
export const DECISION_RATIONALE_HELPER = 'What is the primary reason for selecting this option?';

export function decisionOwnerLabel(id: string, custom?: string): string {
  if (id === 'OTHER') return (custom || '').trim();
  return DECISION_OWNER_ROLES.find(r => r.id === id)?.label || '';
}

/**
 * The resolution statement CDI-07A stores. A governed reason, optionally qualified by the
 * analyst's own words — never the free text alone, so the structured reason always survives.
 */
export function buildResolutionStatement(rationaleId: string, context?: string): string {
  const base = DECISION_RATIONALES.find(r => r.id === rationaleId)?.label || '';
  const extra = (context || '').trim();
  if (rationaleId === 'OTHER') return extra;
  return extra ? `${base} — ${extra}` : base;
}

// ---------------------------------------------------------------------------
// CTW-01R — Promotion experiment stage
// ---------------------------------------------------------------------------

/**
 * The stages a promotion experiment can actually be in at this baseline.
 *
 * `COMPLETED` is deliberately absent. A campaign completes when every day of its window has
 * elapsed, and elapsed days come from seeded archetype telemetry where `current_day` is always
 * strictly less than `flight_days` in all seven archetypes. Nothing in the estate can move a
 * campaign past its final day, so a `COMPLETED` stage would be a state no record could reach —
 * exactly the kind of unbacked status this programme refuses to invent. It becomes derivable
 * when campaign time advances, which is not this work package.
 */
export type PromotionExperimentStage = 'DRAFT' | 'ACTIVATED' | 'IN_FLIGHT';

export interface PromotionExperimentStatus {
  stage: PromotionExperimentStage;
  label: string;
  /** What this stage means, in the analyst's language. */
  detail: string;
}

export const PROMOTION_STAGE_NOT_DERIVABLE =
  'A completed stage is not shown because no campaign in this build can pass its final day: ' +
  'elapsed days come from seeded telemetry that always stops short of the campaign window.';

/**
 * Derived from what is true, never stored. A record is `ACTIVATED` when it carries an active
 * decision contract, and `IN_FLIGHT` only once the campaign has elapsed days to assess.
 */
export function derivePromotionExperimentStage(args: {
  hasActiveContract: boolean;
  elapsedDays: number;
}): PromotionExperimentStatus {
  if (!args.hasActiveContract) {
    return {
      stage: 'DRAFT',
      label: 'Draft',
      detail: 'Configured and assessed, but no decision has been activated yet.'
    };
  }
  if (args.elapsedDays <= 0) {
    return {
      stage: 'ACTIVATED',
      label: 'Activated',
      detail: 'A decision is activated and is the governed baseline. The campaign has not started.'
    };
  }
  return {
    stage: 'IN_FLIGHT',
    label: 'In flight',
    detail: 'The campaign is running and is being assessed against the activated decision.'
  };
}

// ---------------------------------------------------------------------------
// CTW-01R — Narration
// ---------------------------------------------------------------------------

export type DayAttention = 'NONE' | 'MONITOR' | 'ATTENTION';

/**
 * Demonstration attention thresholds, declared rather than tuned. They are stated here so a
 * reader can see exactly what makes CogniX say "monitor" instead of "fine", and so the
 * judgement is auditable rather than buried in a component.
 */
export const ATTENTION_THRESHOLD_MONITOR_PCT = 2.0;
export const ATTENTION_THRESHOLD_ATTENTION_PCT = 5.0;

export interface FlightDayLensReading {
  lens: FlightLens;
  expectation_value: number | null;
  actual_value: number | null;
  deviation_pct: number | null;
  expectation_lower: number | null;
  expectation_upper: number | null;
}

/**
 * A per-day figure that is neither modelled nor projected — a seeded telemetry reading carried
 * through so that retiring the old per-day card strip loses nothing. It is always labelled with
 * its own basis and never joins a trajectory.
 */
export interface FlightDaySupplementaryReading {
  label: string;
  value: string;
  basis: string;
}

export interface FlightDayNarrative {
  flight_day: number;
  period_index: number;
  period_date: string;
  horizon_class: CampaignHorizonClass;
  headline: string;
  statement: string;
  attention: DayAttention;
  attention_reason: string;
  readings: FlightDayLensReading[];
  supplementary: FlightDaySupplementaryReading[];
  /** The governed facts this narration was derived from. Never prose written per campaign. */
  basis: string[];
}

/**
 * The honest shape of the predicted horizon at this baseline.
 *
 * CDI-05 allocates the campaign effect under `FLAT_RATE_IDENTITY` — a level shift applied
 * equally to every campaign day. The consequence, verified across archetypes, is that **every
 * predicted day carries the same expectation**: the campaign-phase index is a single constant.
 * What varies across the remaining horizon is the declared uncertainty, which widens, and
 * nothing else.
 *
 * This is published rather than hidden, because a reader looking at a flat predicted line is
 * entitled to know it is flat by construction and not by forecast.
 */
export const FLAT_HORIZON_DISCLOSURE =
  'The activated plan allocates its effect evenly across the campaign, so every remaining day ' +
  'carries the same expectation. Day-to-day predicted movement would require a fitted forecast ' +
  'model, which is not bound to this campaign — what widens with horizon here is confidence, not demand.';

/**
 * The `FORECAST_SHAPED` counterpart. It states the two things a reader needs: that a named model
 * produced the shape, and that the total the contract expects has not moved.
 */
export function forecastShapedDisclosure(modelDisplayName: string): string {
  return (
    `The day-to-day shape of this horizon comes from ${modelDisplayName}, fitted to the demand ` +
    'history. It redistributes what the activated decision expects across the campaign; it does not ' +
    'change the total, and it is not a second baseline. Every remaining day is still a projection.'
  );
}
