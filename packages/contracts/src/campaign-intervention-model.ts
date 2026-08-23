/**
 * CogniX CTW-02 — Predictive Intervention Planning
 *
 * Turns the governed campaign horizon into a small number of understandable **Decision Moments**,
 * and lets an analyst prepare a conditional intervention before the predicted condition occurs.
 *
 * The rule that governs every derivation in this file:
 *
 *   > **A Decision Moment may only be derived from three things — the per-period outputs of the
 *   > CTW-03 governed forecast, the observed campaign deviation, and the declared uncertainty.**
 *
 * No extrapolation, no second forecasting engine, no fabricated signal. In particular, a sustained
 * departure from plan may be *stated* — it has been observed — but it may never be projected
 * forward, because projecting a deviation rate is a forecast, and CTW-02 does not own one.
 *
 * What follows from that, deliberately:
 *   - With no forecast bound the horizon is flat, no predicted day differs from another, and **no
 *     predicted moment exists**. The surface says so rather than inventing one.
 *   - An intervention's effect is evaluated by re-running CDI-02/CDI-05 at the proposed depth and
 *     reshaping the **remaining** horizon through the same CTW-03 forecast. Elapsed days are never
 *     recomputed and no trajectory is ever overwritten.
 *   - External automatic execution is declared unavailable. It is never simulated.
 */

import { CampaignHorizonClass, FlightLens } from './campaign-continuous-timeline-model';

// ---------------------------------------------------------------------------
// Decision Moments
// ---------------------------------------------------------------------------

export type DecisionMomentKind =
  /** Predicted days whose contribution sits materially below the campaign average. */
  | 'FORECAST_CONTRIBUTION_TROUGH'
  /** Predicted days whose demand sits materially above the campaign average. */
  | 'FORECAST_DEMAND_PEAK'
  /** Elapsed days that have run persistently off the activated plan. Observed, never projected. */
  | 'SUSTAINED_DEPARTURE_FROM_PLAN';

/** The only three sources a moment may cite. Anything else is out of bounds by construction. */
export type DecisionMomentEvidenceSource =
  | 'GOVERNED_FORECAST'
  | 'OBSERVED_DEVIATION'
  | 'DECLARED_UNCERTAINTY';

export interface DecisionMomentEvidence {
  source: DecisionMomentEvidenceSource;
  statement: string;
  /** The figure the statement rests on, so a reader can check the words against the number. */
  value: number | null;
}

export interface DecisionWindow {
  available: boolean;
  first_flight_day: number | null;
  last_flight_day: number | null;
  statement: string;
  /** Why acting later is worse, stated only where it is arithmetically true. */
  delay_cost: string | null;
}

export const NO_WINDOW_STATEMENT = 'No reliable intervention window available.';

/**
 * A candidate action. Only actions CDI-02 can genuinely evaluate are offered — today that is one:
 * changing promotional depth. An action CogniX cannot cost is not a recommendation, it is a
 * suggestion, and this surface does not make suggestions.
 */
export type InterventionActionKind = 'REDUCE_DISCOUNT_DEPTH';

export interface InterventionCandidate {
  candidate_id: string;
  action_kind: InterventionActionKind;
  label: string;
  current_discount_pct: number;
  proposed_discount_pct: number;
  rationale: string;
}

export type DecisionMomentSeverity = 'WATCH' | 'MATERIAL';

export interface DecisionMoment {
  moment_id: string;
  kind: DecisionMomentKind;
  /** The day the moment is anchored to — the first day of a predicted run, or today for observed. */
  flight_day: number;
  span_days: number[];
  period_date: string;
  horizon_class: CampaignHorizonClass;
  lens: FlightLens;
  severity: DecisionMomentSeverity;

  headline: string;
  issue: string;
  expected_consequence: string;
  evidence: DecisionMomentEvidence[];
  /** *Why is CogniX telling me this?* — deterministic governed factors, never model prose. */
  why: string[];

  window: DecisionWindow;
  candidate: InterventionCandidate | null;
  /** Present when no candidate is offered, so silence is never mistaken for "nothing to do". */
  no_candidate_reason: string | null;
}

// ---------------------------------------------------------------------------
// Campaign Outlook
// ---------------------------------------------------------------------------

export type CurrentAction = 'MONITOR' | 'PREPARE' | 'REVIEW';

export interface CampaignOutlook {
  headline: string;
  next_decision: string | null;
  decision_window: string;
  current_action: CurrentAction;
  basis: string[];
}

// ---------------------------------------------------------------------------
// Planned interventions
// ---------------------------------------------------------------------------

export type PlannedInterventionMode =
  /** Prompt the analyst to review the moment. Changes nothing on its own. */
  | 'REMIND_ME'
  /** Prepare the intervention when the trigger is reached, then require explicit confirmation. */
  | 'PREPARE_FOR_APPROVAL'
  /** Declared and permanently unavailable at this baseline. Never simulated. */
  | 'AUTOMATIC_EXECUTION';

export const DEFAULT_INTERVENTION_MODE: PlannedInterventionMode = 'PREPARE_FOR_APPROVAL';

export const AUTOMATIC_EXECUTION_AVAILABILITY = 'UNAVAILABLE' as const;

export const AUTOMATIC_EXECUTION_DISCLOSURE =
  'Automatic execution is unavailable. CogniX has no governed integration with a promotion ' +
  'execution system, so it cannot change a live campaign — and it will not simulate having done so. ' +
  'Every intervention here is prepared for a person to approve.';

export type PlannedInterventionStatus =
  | 'PLANNED'
  | 'AWAITING_APPROVAL'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'SUPERSEDED';

export type ReassessmentVerdict =
  | 'KEEP'
  | 'BRING_FORWARD'
  | 'DELAY'
  | 'RESCHEDULE'
  | 'CANCEL'
  | 'NO_LONGER_NECESSARY'
  | 'MAY_BE_TOO_LATE';

/**
 * One reassessment. The record keeps every one of these: the point of reassessment is not the
 * current verdict but the trail of **why the recommendation changed**, which is the thing a reader
 * needs and the thing an overwriting design destroys.
 */
export interface PlannedInterventionReassessment {
  assessed_at: string;
  verdict: ReassessmentVerdict;
  reason: string;
  /** What the analyst may do about it. Never a single forced option. */
  options: ReassessmentVerdict[];
  moment_still_present: boolean;
  moment_flight_day: number | null;
  /** The day the plan targeted when this assessment was made. */
  targeted_flight_day: number;
}

export interface InterventionConfirmation {
  confirmed_by: string;
  confirmed_at: string;
  statement: string;
  /** Elapsed days are never recomputed, so an intervention can only take effect from tomorrow. */
  effective_from_flight_day: number;
}

export interface PlannedIntervention {
  intervention_id: string;
  tenant_id: string;
  session_id: string;

  /** The activated decision this plan was made against — the baseline, never a copy of it. */
  contract_id: string;
  decision_basis_digest: string;

  moment_id: string;
  moment_kind: DecisionMomentKind;
  action: InterventionCandidate;
  targeted_flight_day: number;
  window: DecisionWindow;
  trigger_condition: string;

  mode: PlannedInterventionMode;
  status: PlannedInterventionStatus;

  created_by: string;
  rationale: string;
  created_at: string;

  reassessments: PlannedInterventionReassessment[];
  confirmation?: InterventionConfirmation;
}

export interface PlanInterventionRequest {
  tenant_id: string;
  session_id: string;
  contract_id: string;
  decision_basis_digest: string;
  moment_id: string;
  moment_kind: DecisionMomentKind;
  action: InterventionCandidate;
  targeted_flight_day: number;
  window: DecisionWindow;
  trigger_condition: string;
  mode: PlannedInterventionMode;
  created_by: string;
  rationale: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Intervention preview — do nothing versus intervene
// ---------------------------------------------------------------------------

export interface InterventionOutcomeSummary {
  /** Remaining-horizon totals only. Elapsed days are identical under both and are excluded. */
  remaining_demand_units: number;
  remaining_contribution_gbp: number;
  days_affected: number;
}

export interface InterventionPreview {
  moment_id: string;
  candidate: InterventionCandidate;
  effective_from_flight_day: number;
  without_intervention: InterventionOutcomeSummary;
  with_intervention: InterventionOutcomeSummary;
  /** Plain English first; the numbers are progressive disclosure. */
  without_statement: string;
  with_statement: string;
  trade_off_headline: string;
  what_improves: string;
  what_is_sacrificed: string;
  why_recommended: string;
  basis: string[];
}

// ---------------------------------------------------------------------------
// Campaign story
// ---------------------------------------------------------------------------

export type CampaignStoryEventKind =
  | 'CAMPAIGN_ACTIVATED'
  | 'DEPARTED_FROM_PLAN'
  | 'TODAY'
  | 'MOMENT_PREDICTED'
  | 'INTERVENTION_PLANNED'
  | 'INTERVENTION_REASSESSED'
  | 'INTERVENTION_CONFIRMED';

export interface CampaignStoryEvent {
  kind: CampaignStoryEventKind;
  /** Null for events that are not anchored to a campaign day. */
  flight_day: number | null;
  headline: string;
  detail: string;
  /** True when the event is recorded fact; false when it is a prediction not yet occurred. */
  occurred: boolean;
}

// ---------------------------------------------------------------------------
// Declared thresholds — every judgement in this file traces to one of these
// ---------------------------------------------------------------------------

/** A predicted day is a trough when it sits this far below the predicted-horizon average. */
export const MOMENT_TROUGH_PCT = 3.0;
/** A predicted day is a peak when it sits this far above it. */
export const MOMENT_PEAK_PCT = 5.0;
/** A trough or peak run is MATERIAL rather than WATCH at this depth. */
export const MOMENT_MATERIAL_PCT = 6.0;
/** Consecutive elapsed days beyond the attention threshold that make a departure "sustained". */
export const SUSTAINED_DEPARTURE_DAYS = 3;
/** How far a candidate reduces promotional depth. Declared, so the proposal is reproducible. */
export const INTERVENTION_DEPTH_STEP_PP = 6;
/** At most this many moments are surfaced. More than three is a dashboard, not a decision. */
export const MAX_DECISION_MOMENTS = 3;

export const NO_MOMENTS_WITHOUT_FORECAST =
  'No predicted decision moment can be identified: with no forecast bound to this campaign every ' +
  'remaining day carries the same expectation, so no day differs from another. What is shown is ' +
  'the observed position only.';

export const MOMENTS_NOT_A_PREDICTION_OF_OUTCOME =
  'A decision moment describes what the governed forecast and the observed deviation say about a ' +
  'period. It is not a prediction that something will go wrong, and it is not an instruction.';

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export interface InterventionInvariantViolation {
  invariant: string;
  detail: string;
}

/**
 * `I-INV-1` a predicted moment exists only where a forecast shaped the horizon
 * `I-INV-2` every moment cites at least one piece of evidence, from the three permitted sources
 * `I-INV-3` a window, where available, lies strictly in the future
 * `I-INV-4` a window never runs past the last day of the period it targets — acting after that
 *           cannot affect it
 * `I-INV-5` a confirmed intervention takes effect after today, never over an elapsed day
 * `I-INV-6` a planned intervention keeps every reassessment it has ever had
 */
export function validateDecisionMoments(
  moments: DecisionMoment[],
  args: { forecastBound: boolean; todayFlightDay: number }
): InterventionInvariantViolation[] {
  const v: InterventionInvariantViolation[] = [];

  for (const m of moments) {
    if (m.horizon_class === 'PREDICTED_REMAINING' && !args.forecastBound) {
      v.push({ invariant: 'I-INV-1', detail: `${m.moment_id} is a predicted moment with no forecast bound` });
    }
    if (m.evidence.length === 0) {
      v.push({ invariant: 'I-INV-2', detail: `${m.moment_id} cites no evidence` });
    }
    if (m.window.available) {
      if (m.window.first_flight_day === null || m.window.first_flight_day <= args.todayFlightDay) {
        v.push({
          invariant: 'I-INV-3',
          detail: `${m.moment_id} opens a window at ${m.window.first_flight_day} against today ${args.todayFlightDay}`
        });
      }
      const lastOfPeriod = m.span_days.length ? Math.max(...m.span_days) : m.flight_day;
      if (
        m.kind !== 'SUSTAINED_DEPARTURE_FROM_PLAN' &&
        m.window.last_flight_day !== null &&
        m.window.last_flight_day > lastOfPeriod
      ) {
        v.push({
          invariant: 'I-INV-4',
          detail: `${m.moment_id} window runs to ${m.window.last_flight_day}, past day ${lastOfPeriod} when the period ends`
        });
      }
    }
  }

  return v;
}

export function validatePlannedIntervention(p: PlannedIntervention, todayFlightDay: number): InterventionInvariantViolation[] {
  const v: InterventionInvariantViolation[] = [];
  if (p.confirmation && p.confirmation.effective_from_flight_day <= todayFlightDay) {
    v.push({
      invariant: 'I-INV-5',
      detail: `${p.intervention_id} takes effect on day ${p.confirmation.effective_from_flight_day}, which has already elapsed`
    });
  }
  /**
   * A plan that moved status must be able to say why.
   *
   * `CONFIRMED` and `CANCELLED` are self-documenting — a confirmation carries who confirmed it and
   * their statement, and cancelling is the analyst's own act. It is `SUPERSEDED` and
   * `AWAITING_APPROVAL` that are reached by re-evaluation, and those must carry the reassessment
   * that produced them. The earlier form of this rule also caught a legitimate direct confirmation,
   * which is a decision an analyst is entitled to make without waiting to be prompted.
   */
  const needsTrail = p.status === 'SUPERSEDED' || p.status === 'AWAITING_APPROVAL';
  if (needsTrail && p.reassessments.length === 0) {
    v.push({ invariant: 'I-INV-6', detail: `${p.intervention_id} is ${p.status} with no recorded reassessment` });
  }
  if (p.status === 'CONFIRMED' && !p.confirmation) {
    v.push({ invariant: 'I-INV-6', detail: `${p.intervention_id} is CONFIRMED with no confirmation record` });
  }
  return v;
}
