/**
 * CogniX CTW-02 — Decision Moment derivation and intervention planning.
 *
 * Deterministic. Every moment, window, outlook line and story event here is a function of the
 * governed flight projection: the CTW-03 forecast's per-period shape, the observed deviation on
 * elapsed days, and the declared uncertainty. Nothing extrapolates, and nothing is authored per
 * campaign.
 */

import {
  CampaignFlightProjection,
  ContinuousLensSeries,
  ContinuousSeriesPoint,
  FlightLens
} from '../packages/contracts/src/campaign-continuous-timeline-model';
import {
  ATTENTION_THRESHOLD_ATTENTION_PCT,
  ATTENTION_THRESHOLD_MONITOR_PCT
} from '../packages/contracts/src/campaign-continuous-timeline-model';
import {
  CampaignOutlook,
  CampaignStoryEvent,
  CurrentAction,
  DecisionMoment,
  DecisionMomentEvidence,
  DecisionMomentSeverity,
  DecisionWindow,
  INTERVENTION_DEPTH_STEP_PP,
  InterventionCandidate,
  MAX_DECISION_MOMENTS,
  MOMENTS_NOT_A_PREDICTION_OF_OUTCOME,
  MOMENT_MATERIAL_PCT,
  MOMENT_PEAK_PCT,
  MOMENT_TROUGH_PCT,
  NO_MOMENTS_WITHOUT_FORECAST,
  NO_WINDOW_STATEMENT,
  PlannedIntervention,
  PlannedInterventionReassessment,
  SUSTAINED_DEPARTURE_DAYS,
  validateDecisionMoments
} from '../packages/contracts/src/campaign-intervention-model';

const gbp = (v: number) => `£${Math.round(v).toLocaleString('en-GB')}`;
const units = (v: number) => `${Math.round(v).toLocaleString('en-GB')} units`;

function predictedPoints(series: ContinuousLensSeries): ContinuousSeriesPoint[] {
  return series.points.filter(p => p.horizon_class === 'PREDICTED_REMAINING');
}

/** Maximal runs of consecutive days satisfying a predicate, returned in day order. */
function runsOf(points: ContinuousSeriesPoint[], pred: (p: ContinuousSeriesPoint) => boolean): ContinuousSeriesPoint[][] {
  const runs: ContinuousSeriesPoint[][] = [];
  let current: ContinuousSeriesPoint[] = [];
  for (const p of points) {
    if (pred(p)) current.push(p);
    else if (current.length) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length) runs.push(current);
  return runs;
}

/**
 * The window in which acting can still affect the moment.
 *
 * For a predicted moment it is strictly the days between tomorrow and the day before the moment —
 * acting on or after the day itself cannot change it. For an observed sustained departure the
 * moment is already happening, so the window is the whole remaining horizon and the cost of delay
 * is simply that fewer days remain for a change to take effect. Neither is an optimisation; both
 * are arithmetic, which is the only kind of window CTW-02 is allowed to publish.
 */
function windowFor(
  focalDay: number,
  lastDayOfPeriod: number,
  todayFlightDay: number,
  flightDays: number,
  observed: boolean
): DecisionWindow {
  if (observed) {
    const first = todayFlightDay + 1;
    if (first > flightDays) {
      return {
        available: false,
        first_flight_day: null,
        last_flight_day: null,
        statement: NO_WINDOW_STATEMENT,
        delay_cost: 'The campaign has no remaining days, so no intervention can affect it.'
      };
    }
    const remaining = flightDays - todayFlightDay;
    return {
      available: true,
      first_flight_day: first,
      last_flight_day: flightDays,
      statement: `Any of days ${first} to ${flightDays} — ${remaining} remaining ${remaining === 1 ? 'day' : 'days'}.`,
      delay_cost: `Each day of delay leaves one fewer day for a change to take effect: ${remaining} today, ${remaining - 1} tomorrow.`
    };
  }

  /**
   * The window runs to the **last day of the period**, not to the day before it starts. Acting on
   * day 6 of a days 6–9 period still changes days 6 to 9; acting on day 9 changes only day 9. So
   * the window is the range in which acting affects *any* of the period, and the cost of delay is
   * that it affects fewer of it — which is arithmetic, and true.
   */
  const first = todayFlightDay + 1;
  const last = Math.min(lastDayOfPeriod, flightDays);
  if (last < first) {
    return {
      available: false,
      first_flight_day: null,
      last_flight_day: null,
      statement: NO_WINDOW_STATEMENT,
      delay_cost: null
    };
  }
  const daysBefore = Math.max(0, focalDay - first);
  const affectedNow = lastDayOfPeriod - Math.max(first, focalDay) + 1;
  return {
    available: true,
    first_flight_day: first,
    last_flight_day: last,
    statement:
      daysBefore > 0
        ? `Days ${first} to ${last} — ${daysBefore} ${daysBefore === 1 ? 'day' : 'days'} before this period begins, and through it.`
        : `Days ${first} to ${last} — this period has already begun, so acting affects what is left of it.`,
    delay_cost:
      affectedNow > 1
        ? `Acting now affects all ${affectedNow} days of the period; each day of delay affects one fewer.`
        : 'Acting on the final day of the period affects only that day.'
  };
}

/**
 * The one action CDI-02 can genuinely cost. Offered only where reducing promotional depth is a
 * coherent response — contribution pressure — and never merely so that a moment has a button.
 */
function candidateFor(
  momentId: string,
  currentDiscountPct: number,
  reason: string
): InterventionCandidate | null {
  const proposed = Math.max(0, Math.round(currentDiscountPct - INTERVENTION_DEPTH_STEP_PP));
  if (proposed >= currentDiscountPct) return null;
  return {
    candidate_id: `cand_${momentId}`,
    action_kind: 'REDUCE_DISCOUNT_DEPTH',
    label: `Reduce promotional depth from ${currentDiscountPct}% to ${proposed}%`,
    current_discount_pct: currentDiscountPct,
    proposed_discount_pct: proposed,
    rationale: reason
  };
}

export function deriveDecisionMoments(
  flight: CampaignFlightProjection,
  currentDiscountPct: number
): { moments: DecisionMoment[]; note: string | null } {
  const demand = flight.lenses.find(l => l.lens === 'DEMAND');
  const contribution = flight.lenses.find(l => l.lens === 'CONTRIBUTION');
  if (!demand || !contribution) return { moments: [], note: null };

  const today = flight.horizon.today_flight_day;
  const flightDays = flight.horizon.flight_days;
  const forecastBound = flight.allocation_profile === 'FORECAST_SHAPED';
  const moments: DecisionMoment[] = [];

  const modelName = flight.forecast?.model_display_name ?? 'the bound forecast';

  // ── Predicted moments. They exist only where the horizon genuinely varies. ──────────
  if (forecastBound) {
    const predContribution = predictedPoints(contribution);
    const predDemand = predictedPoints(demand);

    const meanOf = (pts: ContinuousSeriesPoint[]) =>
      pts.reduce((s, p) => s + (p.expectation_value ?? 0), 0) / Math.max(1, pts.length);

    const cMean = meanOf(predContribution);
    const dMean = meanOf(predDemand);

    // Contribution troughs
    for (const run of runsOf(predContribution, p => (p.expectation_value ?? 0) <= cMean * (1 - MOMENT_TROUGH_PCT / 100))) {
      const focal = run[0];
      const runMean = meanOf(run);
      const shortfallPct = cMean > 0 ? ((cMean - runMean) / cMean) * 100 : 0;
      const shortfallGbp = (cMean - runMean) * run.length;
      const severity: DecisionMomentSeverity = shortfallPct >= MOMENT_MATERIAL_PCT ? 'MATERIAL' : 'WATCH';
      const momentId = `mom_contrib_${focal.flight_day}`;
      const bandWidth =
        focal.expectation_upper !== null && focal.expectation_lower !== null
          ? focal.expectation_upper - focal.expectation_lower
          : null;

      const evidence: DecisionMomentEvidence[] = [
        {
          source: 'GOVERNED_FORECAST',
          statement: `${modelName} projects ${gbp(runMean)} of contribution across ${run.length === 1 ? 'this day' : `these ${run.length} days`}, against a ${gbp(cMean)} average for the remaining campaign.`,
          value: Number(runMean.toFixed(2))
        }
      ];
      if (bandWidth !== null) {
        evidence.push({
          source: 'DECLARED_UNCERTAINTY',
          statement: `The declared uncertainty spans ${gbp(bandWidth)} on the first of these days, so the shortfall is smaller than the range around it.`,
          value: Number(bandWidth.toFixed(2))
        });
      }

      moments.push({
        moment_id: momentId,
        kind: 'FORECAST_CONTRIBUTION_TROUGH',
        flight_day: focal.flight_day,
        span_days: run.map(p => p.flight_day),
        period_date: focal.period_date,
        horizon_class: 'PREDICTED_REMAINING',
        lens: 'CONTRIBUTION',
        severity,
        headline:
          run.length === 1
            ? `Day ${focal.flight_day} — contribution pressure expected`
            : `Days ${run[0].flight_day}–${run[run.length - 1].flight_day} — contribution pressure expected`,
        issue: `Contribution is forecast ${shortfallPct.toFixed(0)}% below the campaign average across ${run.length === 1 ? 'this day' : 'these days'}.`,
        expected_consequence: `About ${gbp(shortfallGbp)} less contribution than an average period of the same length, before any intervention.`,
        evidence,
        why: [
          `The shape of this horizon comes from ${modelName}, fitted to the demand history.`,
          `A period is flagged when it sits more than ${MOMENT_TROUGH_PCT}% below the remaining-campaign average; this one is ${shortfallPct.toFixed(1)}% below.`,
          `It is ${severity === 'MATERIAL' ? 'material' : 'a watch item'} because the threshold for material is ${MOMENT_MATERIAL_PCT}%.`,
          MOMENTS_NOT_A_PREDICTION_OF_OUTCOME
        ],
        window: windowFor(focal.flight_day, run[run.length - 1].flight_day, today, flightDays, false),
        candidate: candidateFor(
          momentId,
          currentDiscountPct,
          'Less promotional depth protects unit contribution through the weaker period, at the cost of some demand.'
        ),
        no_candidate_reason:
          candidateFor(momentId, currentDiscountPct, '') === null
            ? 'Promotional depth is already at zero, so there is no governed reduction to propose.'
            : null
      });
    }

    // Demand peaks — an opportunity, and deliberately carrying no action.
    for (const run of runsOf(predDemand, p => (p.expectation_value ?? 0) >= dMean * (1 + MOMENT_PEAK_PCT / 100))) {
      const focal = run[0];
      const runMean = meanOf(run);
      const upliftPct = dMean > 0 ? ((runMean - dMean) / dMean) * 100 : 0;
      moments.push({
        moment_id: `mom_demand_${focal.flight_day}`,
        kind: 'FORECAST_DEMAND_PEAK',
        flight_day: focal.flight_day,
        span_days: run.map(p => p.flight_day),
        period_date: focal.period_date,
        horizon_class: 'PREDICTED_REMAINING',
        lens: 'DEMAND',
        severity: 'WATCH',
        headline:
          run.length === 1
            ? `Day ${focal.flight_day} — demand expected at its highest`
            : `Days ${run[0].flight_day}–${run[run.length - 1].flight_day} — demand expected at its highest`,
        issue: `Demand is forecast ${upliftPct.toFixed(0)}% above the campaign average across ${run.length === 1 ? 'this day' : 'these days'}.`,
        expected_consequence: `About ${units(runMean)} a day against a ${units(dMean)} average — the busiest part of the remaining campaign.`,
        evidence: [
          {
            source: 'GOVERNED_FORECAST',
            statement: `${modelName} projects ${units(runMean)} a day here, against a ${units(dMean)} remaining-campaign average.`,
            value: Number(runMean.toFixed(2))
          }
        ],
        why: [
          `The shape of this horizon comes from ${modelName}, fitted to the demand history.`,
          `A period is flagged when it sits more than ${MOMENT_PEAK_PCT}% above the remaining-campaign average; this one is ${upliftPct.toFixed(1)}% above.`,
          MOMENTS_NOT_A_PREDICTION_OF_OUTCOME
        ],
        window: windowFor(focal.flight_day, run[run.length - 1].flight_day, today, flightDays, false),
        candidate: null,
        no_candidate_reason:
          'CogniX has no governed action for a demand peak. Stock cover would be the question to ask, ' +
          'and no stock trajectory is modelled — proposing one here would be a guess.'
      });
    }
  }

  // ── Observed moment. Stated, never projected. ──────────────────────────────────────
  const elapsedContribution = contribution.points.filter(
    p => p.horizon_class !== 'PREDICTED_REMAINING' && p.deviation_pct !== null
  );
  if (elapsedContribution.length >= SUSTAINED_DEPARTURE_DAYS) {
    const tail = elapsedContribution.slice(-SUSTAINED_DEPARTURE_DAYS);
    const allBelow = tail.every(p => (p.deviation_pct as number) <= -ATTENTION_THRESHOLD_MONITOR_PCT);
    const allAbove = tail.every(p => (p.deviation_pct as number) >= ATTENTION_THRESHOLD_MONITOR_PCT);
    if (allBelow || allAbove) {
      const meanDev = tail.reduce((s, p) => s + (p.deviation_pct as number), 0) / tail.length;
      const accrued = elapsedContribution.reduce((s, p) => s + (p.deviation_abs ?? 0), 0);
      const momentId = `mom_observed_${tail[tail.length - 1].flight_day}`;
      const severity: DecisionMomentSeverity =
        Math.abs(meanDev) >= ATTENTION_THRESHOLD_ATTENTION_PCT ? 'MATERIAL' : 'WATCH';

      moments.push({
        moment_id: momentId,
        kind: 'SUSTAINED_DEPARTURE_FROM_PLAN',
        flight_day: tail[tail.length - 1].flight_day,
        span_days: tail.map(p => p.flight_day),
        period_date: tail[tail.length - 1].period_date,
        horizon_class: tail[tail.length - 1].horizon_class,
        lens: 'CONTRIBUTION',
        severity,
        headline: `Contribution has run ${allAbove ? 'above' : 'below'} plan for ${SUSTAINED_DEPARTURE_DAYS} days`,
        issue: `Days ${tail[0].flight_day}–${tail[tail.length - 1].flight_day} each came in ${allAbove ? 'above' : 'below'} the activated decision's expectation, averaging ${meanDev > 0 ? '+' : ''}${meanDev.toFixed(1)}%.`,
        expected_consequence: `${gbp(Math.abs(accrued))} ${accrued >= 0 ? 'more' : 'less'} contribution than expected has accrued so far. CogniX does not project that rate forward.`,
        evidence: [
          {
            source: 'OBSERVED_DEVIATION',
            statement: `Each of the last ${SUSTAINED_DEPARTURE_DAYS} elapsed days departed from the activated plan in the same direction, averaging ${meanDev > 0 ? '+' : ''}${meanDev.toFixed(1)}%.`,
            value: Number(meanDev.toFixed(2))
          },
          {
            source: 'OBSERVED_DEVIATION',
            statement: `Accrued difference against plan across ${elapsedContribution.length} elapsed days: ${gbp(accrued)}.`,
            value: Number(accrued.toFixed(2))
          }
        ],
        why: [
          `A departure is called sustained after ${SUSTAINED_DEPARTURE_DAYS} consecutive days beyond ${ATTENTION_THRESHOLD_MONITOR_PCT}% in the same direction.`,
          'This is an observed position, not a forecast. CogniX will not extrapolate the rate across the remaining horizon — it has no model for doing so.',
          MOMENTS_NOT_A_PREDICTION_OF_OUTCOME
        ],
        window: windowFor(tail[tail.length - 1].flight_day, flightDays, today, flightDays, true),
        candidate: allBelow
          ? candidateFor(
              momentId,
              currentDiscountPct,
              'Less promotional depth protects unit contribution for the rest of the campaign, at the cost of some demand.'
            )
          : null,
        no_candidate_reason: allAbove
          ? 'Contribution is running ahead of the activated plan. CogniX proposes no action against good news.'
          : null
      });
    }
  }

  // Rank: material first, then the earliest day, then cap. Three is a decision; ten is a dashboard.
  moments.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'MATERIAL' ? -1 : 1;
    return a.flight_day - b.flight_day;
  });
  const capped = moments.slice(0, MAX_DECISION_MOMENTS);

  const violations = validateDecisionMoments(capped, { forecastBound, todayFlightDay: today });
  if (violations.length > 0) {
    const err: any = new Error(
      `Decision moments violate their own invariants and are withheld: ${violations.map(v => `${v.invariant} ${v.detail}`).join('; ')}`
    );
    err.rejection_id = 'RJ-I1';
    throw err;
  }

  return { moments: capped, note: forecastBound ? null : NO_MOMENTS_WITHOUT_FORECAST };
}

// ---------------------------------------------------------------------------
// Campaign Outlook
// ---------------------------------------------------------------------------

export function deriveCampaignOutlook(
  flight: CampaignFlightProjection,
  moments: DecisionMoment[],
  plansIn: PlannedIntervention[]
): CampaignOutlook {
  // Only plans made against the decision currently activated count toward the outlook.
  const plans = plansIn.filter(p => p.contract_id === flight.activation.contract_ref.contract_id);
  const demandSummary = flight.deviation.find(d => d.lens === 'DEMAND');
  const contributionSummary = flight.deviation.find(d => d.lens === 'CONTRIBUTION');
  const lead = moments[0] ?? null;
  const livePlans = plans.filter(p => p.status === 'PLANNED' || p.status === 'AWAITING_APPROVAL');

  const trackingClause =
    demandSummary && demandSummary.state !== 'NOT_ASSESSABLE'
      ? `Demand is tracking ${demandSummary.state === 'ON_PLAN' ? 'in line with' : demandSummary.state === 'AHEAD_OF_PLAN' ? 'ahead of' : 'behind'} the activated plan`
      : 'The campaign has not yet elapsed far enough to say how it is tracking';

  const headline = lead
    ? `${trackingClause}. ${lead.issue}`
    : `${trackingClause}. No decision moment is identified on the remaining horizon.`;

  let action: CurrentAction = 'MONITOR';
  if (livePlans.some(p => p.status === 'AWAITING_APPROVAL')) action = 'REVIEW';
  else if (lead && lead.severity === 'MATERIAL' && lead.window.available) action = 'PREPARE';

  const basis = [
    `Observed deviation across ${contributionSummary?.elapsed_days_assessed ?? 0} elapsed days.`,
    flight.forecast
      ? `Per-period shape from ${flight.forecast.model_display_name}.`
      : 'No forecast is bound, so the remaining horizon is flat and carries no moments.',
    'Declared horizon uncertainty from CDI-05.'
  ];

  return {
    headline,
    next_decision: lead ? lead.headline : null,
    decision_window: lead ? lead.window.statement : NO_WINDOW_STATEMENT,
    current_action: action,
    basis
  };
}

// ---------------------------------------------------------------------------
// Campaign story — recorded events and declared predictions, never invented history
// ---------------------------------------------------------------------------

export function buildCampaignStory(
  flight: CampaignFlightProjection,
  moments: DecisionMoment[],
  plansIn: PlannedIntervention[]
): CampaignStoryEvent[] {
  // The story of this campaign contains only what happened to this campaign.
  const plans = plansIn.filter(p => p.contract_id === flight.activation.contract_ref.contract_id);
  const events: CampaignStoryEvent[] = [];

  events.push({
    kind: 'CAMPAIGN_ACTIVATED',
    flight_day: 0,
    headline: 'Campaign activated',
    detail: `The decision was recorded as contract ${flight.activation.contract_ref.contract_id.slice(0, 12)}… and became the baseline the campaign is measured against.`,
    occurred: true
  });

  // Elapsed days that departed materially, from the narration already derived.
  for (const n of flight.day_narratives) {
    if (n.horizon_class === 'PREDICTED_REMAINING') continue;
    if (n.attention === 'NONE') continue;
    events.push({
      kind: 'DEPARTED_FROM_PLAN',
      flight_day: n.flight_day,
      headline: n.headline,
      detail: n.statement,
      occurred: true
    });
  }

  events.push({
    kind: 'TODAY',
    flight_day: flight.horizon.today_flight_day,
    headline: `Today — day ${flight.horizon.today_flight_day} of ${flight.horizon.flight_days}`,
    detail: `${flight.horizon.elapsed_days} days elapsed, ${flight.horizon.remaining_days} still to come.`,
    occurred: true
  });

  for (const m of moments.filter(x => x.horizon_class === 'PREDICTED_REMAINING')) {
    events.push({
      kind: 'MOMENT_PREDICTED',
      flight_day: m.flight_day,
      headline: m.headline,
      detail: m.issue,
      occurred: false
    });
  }

  for (const p of plans) {
    events.push({
      kind: 'INTERVENTION_PLANNED',
      flight_day: p.targeted_flight_day,
      headline: `Intervention planned — ${p.action.label}`,
      detail: `${p.created_by} planned this for day ${p.targeted_flight_day}. Trigger: ${p.trigger_condition}.`,
      occurred: true
    });
    for (const r of p.reassessments) {
      events.push({
        kind: 'INTERVENTION_REASSESSED',
        flight_day: p.targeted_flight_day,
        headline: `Plan reassessed — ${r.verdict.replace(/_/g, ' ').toLowerCase()}`,
        detail: r.reason,
        occurred: true
      });
    }
    if (p.confirmation) {
      events.push({
        kind: 'INTERVENTION_CONFIRMED',
        flight_day: p.confirmation.effective_from_flight_day,
        headline: 'Intervention confirmed',
        detail: `${p.confirmation.confirmed_by}: ${p.confirmation.statement} Effective from day ${p.confirmation.effective_from_flight_day}.`,
        occurred: true
      });
    }
  }

  return events.sort((a, b) => (a.flight_day ?? 0) - (b.flight_day ?? 0));
}

// ---------------------------------------------------------------------------
// Reassessment — the recommendation is re-derived as evidence changes, and why it
// changed is recorded rather than replaced
// ---------------------------------------------------------------------------

/**
 * Re-derive a plan's standing against the current moments.
 *
 * Every branch returns options rather than a single instruction: the analyst decides, and the
 * record keeps the reason so that a plan which was kept, moved and then cancelled can be read back
 * as the sequence of judgements it actually was.
 */
export function reassessPlannedIntervention(
  plan: PlannedIntervention,
  moments: DecisionMoment[],
  todayFlightDay: number,
  assessedAt: string
): PlannedInterventionReassessment {
  const moment = moments.find(m => m.moment_id === plan.moment_id) || null;
  const base = {
    assessed_at: assessedAt,
    moment_still_present: moment !== null,
    moment_flight_day: moment ? moment.flight_day : null,
    targeted_flight_day: plan.targeted_flight_day
  };

  if (!moment) {
    return {
      ...base,
      verdict: 'NO_LONGER_NECESSARY',
      options: ['KEEP', 'DELAY', 'CANCEL'],
      reason:
        `The condition this plan was made for is no longer identified on the horizon. It was planned ` +
        `against day ${plan.targeted_flight_day}; the current evidence no longer flags that period. ` +
        'The planned intervention may no longer be necessary.'
    };
  }

  if (!moment.window.available) {
    return {
      ...base,
      verdict: 'MAY_BE_TOO_LATE',
      options: ['BRING_FORWARD', 'KEEP', 'CANCEL'],
      reason:
        `There is no longer a window in which acting can affect day ${moment.flight_day}. ` +
        'The planned intervention may now be too late to change the period it targets.'
    };
  }

  if (moment.flight_day < plan.targeted_flight_day) {
    return {
      ...base,
      verdict: 'BRING_FORWARD',
      options: ['BRING_FORWARD', 'KEEP', 'CANCEL'],
      reason:
        `The condition is now expected on day ${moment.flight_day}, earlier than the day ` +
        `${plan.targeted_flight_day} this plan targets. Acting on the original timing would come after the ` +
        'period it was meant to protect.'
    };
  }

  if (moment.flight_day > plan.targeted_flight_day) {
    return {
      ...base,
      verdict: 'RESCHEDULE',
      options: ['RESCHEDULE', 'KEEP', 'CANCEL'],
      reason:
        `The condition has moved to day ${moment.flight_day}, later than the day ${plan.targeted_flight_day} this ` +
        'plan targets. Acting on the original timing would spend the change before the period it was meant for.'
    };
  }

  return {
    ...base,
    verdict: 'KEEP',
    options: ['KEEP', 'DELAY', 'CANCEL'],
    reason:
      `The condition is still expected on day ${moment.flight_day}, and a window remains: ${moment.window.statement} ` +
      'Nothing about the plan needs to change.'
  };
}

/**
 * Whether a `PREPARE_FOR_APPROVAL` plan's trigger has been reached.
 *
 * The trigger is the campaign reaching the first day of the plan's window — the point from which
 * acting is possible. Reaching it prepares the intervention and asks for a person; it never applies
 * anything, which is the whole distinction between this mode and the one CogniX does not offer.
 */
export function triggerReached(plan: PlannedIntervention, todayFlightDay: number): boolean {
  if (plan.mode !== 'PREPARE_FOR_APPROVAL') return false;
  if (plan.status !== 'PLANNED') return false;
  const first = plan.window.first_flight_day;
  return first !== null && todayFlightDay >= first;
}
