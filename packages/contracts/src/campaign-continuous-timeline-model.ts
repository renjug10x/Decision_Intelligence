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
    | 'What the campaign is running at';
  covers: 'FULL_HORIZON' | 'ELAPSED_ONLY';
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
}

export interface FlightProjectionRequest {
  tenant_id: string;
  session_id: string;
  /** The activated contract. Required — there is no flight without an activation. */
  contract_id: string;
  /** The CDI-05 projection the flight window is read from. */
  timeline: DecisionTimelineProjection;
  elapsed_telemetry: ElapsedTelemetryReading[];
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

export const CTW01_NON_SCOPE: string[] = [
  'Adaptive intervention and trade-off comparison — CTW-02',
  'Remaining-horizon reforecast after an intervention — CTW-02',
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
 * `W-INV-4` CTW-01 emits no REFORECAST trajectory
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

  if (projection.trajectories.some(t => t.kind === 'REFORECAST')) {
    violations.push({
      invariant: 'W-INV-4',
      detail: 'CTW-01 emitted a REFORECAST trajectory; reforecast is CTW-02'
    });
  }

  return violations;
}
