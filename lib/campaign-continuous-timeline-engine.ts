/**
 * CogniX CTW-01 — Continuous Campaign Timeline & Activation engine.
 *
 * Deterministic. Consumes a CDI-05 `DecisionTimelineProjection` and an activated CDI-07A
 * `DecisionContract`; produces one continuous view of the whole campaign window in which
 * elapsed and remaining days are separately classed and never blended (ADR-070).
 *
 * It computes no demand, no contribution and no uncertainty of its own. Every expectation is
 * read from the projection the contract binds; the only arithmetic performed here is the
 * scale-free deviation ratio described on `ActualSeriesBasis`, and the subtraction that turns
 * it into a like-for-like deviation.
 */

import {
  ActualSeriesBasis,
  CampaignFlightProjection,
  CampaignHorizonClass,
  ContinuousLensSeries,
  ContinuousSeriesPoint,
  ElapsedTelemetryReading,
  FlightActivation,
  FlightDeviationState,
  FlightDeviationSummary,
  FlightHorizon,
  FlightLens,
  FlightProjectionRequest,
  FlightTrajectory,
  ACTIVATION_DISCLOSURE,
  ACTUAL_SERIES_BASIS_DISCLOSURE,
  CTW01_NON_SCOPE,
  FLIGHT_SCHEMA_VERSION,
  PREDICTED_REMAINING_DISCLOSURE,
  SIMULATED_ELAPSED_DISCLOSURE,
  UNCERTAINTY_DISCLOSURE,
  validateFlightProjection,
  ATTENTION_THRESHOLD_ATTENTION_PCT,
  ATTENTION_THRESHOLD_MONITOR_PCT,
  DayAttention,
  FLAT_HORIZON_DISCLOSURE,
  FlightDayLensReading,
  FlightDayNarrative,
  FlightDaySupplementaryReading
} from '../packages/contracts/src/campaign-continuous-timeline-model';
import {
  CDI02_BASE_WEEKLY_UNITS,
  DecisionTimelineProjection,
  TimelineConfidenceEnvelope,
  TimelineConfidenceEnvelopePoint,
  TimelineLensProjection,
  TimelineSeriesPoint,
  TimelineTrajectory
} from '../packages/contracts/src/campaign-timeline-model';
import { DecisionContract } from '../packages/contracts/src/campaign-decision-contract-model';
import { EvidenceStrength } from '../packages/contracts/src/campaign-readiness-model';
import { decisionContractStore, toContractReference } from './decision-contract-store';

const ENGINE_VERSION = 'ctw01_continuous_flight_v1';

/** Deviation below this magnitude is reported as on plan rather than as a movement. */
const ON_PLAN_TOLERANCE_PCT = 1.0;

function reject(id: string, message: string): never {
  const err: any = new Error(message);
  err.rejection_id = id;
  throw err;
}

function round(n: number, dp = 4): number {
  return Number(n.toFixed(dp));
}

/**
 * The scale-free ratio. Both arguments come from the same telemetry basis, which is the only
 * reason their quotient means anything; a denominator that is absent, zero or negative makes
 * the ratio undefined and the day is refused rather than defaulted to "on plan".
 */
function deviationRatio(expected: number, observed: number): number | null {
  if (!Number.isFinite(expected) || !Number.isFinite(observed)) return null;
  if (expected <= 0) return null;
  return observed / expected - 1;
}

function campaignPoints(trajectory: TimelineTrajectory): TimelineSeriesPoint[] {
  return trajectory.points.filter(p => p.phase === 'CAMPAIGN');
}

function buildHorizon(
  timeline: DecisionTimelineProjection,
  intervention: TimelineTrajectory,
  elapsedSupplied: number
): FlightHorizon {
  const pts = campaignPoints(intervention);
  if (pts.length === 0) {
    reject('RJ-W7', 'The bound projection has no CAMPAIGN-phase period; there is no flight window to render.');
  }
  const flightDays = pts.length;
  const elapsed = Math.max(0, Math.min(elapsedSupplied, flightDays));
  return {
    flight_days: flightDays,
    elapsed_days: elapsed,
    remaining_days: flightDays - elapsed,
    today_flight_day: elapsed,
    campaign_start: timeline.grid.campaign_start,
    campaign_end: timeline.grid.campaign_end,
    first_period_index: pts[0].period_index,
    last_period_index: pts[pts.length - 1].period_index,
    horizon_basis: 'activated_contract_campaign_window'
  };
}

/**
 * The evidence strength of a day.
 *
 * A remaining day inherits the projection's own strength, which is `DERIVED`. An elapsed day
 * is weaker, not stronger: its level comes from the projection and its movement from seeded
 * telemetry, so it carries `SEEDED_ASSUMPTION` — the weaker of the two inputs. Nothing here
 * can return `OBSERVED`, which is what makes `W-INV-1` structurally unreachable rather than
 * merely unviolated.
 */
function strengthFor(horizonClass: CampaignHorizonClass, projected: EvidenceStrength): EvidenceStrength {
  if (horizonClass === 'PREDICTED_REMAINING') return projected;
  return 'SEEDED_ASSUMPTION';
}

/**
 * The declared uncertainty band, in the lens's own quantity.
 *
 * The CDI-05 envelope bounds the *attributable effect* in percentage points. Turning that into
 * a demand quantity is the arithmetic CDI-05 already performs on its central line: add the
 * ambient component back to get an index, then scale by `CDI02_BASE_WEEKLY_UNITS`. For
 * contribution the same bounds are carried across at the period's own realised unit rate,
 * derived as contribution ÷ demand at that period so that no second contribution rate exists.
 * Nothing is widened, narrowed or smoothed.
 */
function bandFor(
  lens: FlightLens,
  point: TimelineSeriesPoint,
  envelopePoint: TimelineConfidenceEnvelopePoint | undefined,
  demandExpectation: number | null,
  lensExpectation: number | null
): { lower: number | null; upper: number | null } {
  if (!envelopePoint || point.ambient_component_pp === null) return { lower: null, upper: null };

  const ambient = point.ambient_component_pp;
  const lowerIndex = 100 + ambient + envelopePoint.lower_index_pct;
  const upperIndex = 100 + ambient + envelopePoint.upper_index_pct;
  const lowerDemand = (CDI02_BASE_WEEKLY_UNITS * lowerIndex) / 100;
  const upperDemand = (CDI02_BASE_WEEKLY_UNITS * upperIndex) / 100;

  if (lens === 'DEMAND') {
    return { lower: round(Math.min(lowerDemand, upperDemand), 2), upper: round(Math.max(lowerDemand, upperDemand), 2) };
  }

  // CONTRIBUTION — carry the same bounds at this period's own realised unit rate.
  if (demandExpectation === null || lensExpectation === null || demandExpectation === 0) {
    return { lower: null, upper: null };
  }
  const unitRate = lensExpectation / demandExpectation;
  const a = lowerDemand * unitRate;
  const b = upperDemand * unitRate;
  return { lower: round(Math.min(a, b), 2), upper: round(Math.max(a, b), 2) };
}

function buildLensSeries(
  lens: FlightLens,
  horizon: FlightHorizon,
  interventionPoints: TimelineSeriesPoint[],
  lensProjection: TimelineLensProjection,
  ratios: Map<number, number | null>,
  envelope: TimelineConfidenceEnvelope,
  demandByPeriod: Map<number, number | null>
): ContinuousLensSeries {
  const quantityBasis =
    lens === 'DEMAND' ? ('cdi02_weekly_rate' as const) : ('cdi02_unit_contribution' as const);

  const valueByPeriod = new Map<number, number | null>();
  for (const v of lensProjection.values) valueByPeriod.set(v.period_index, v.intervention);

  const envelopeByPeriod = new Map<number, TimelineConfidenceEnvelopePoint>();
  for (const e of envelope.points) envelopeByPeriod.set(e.period_index, e);

  let anyRefused = false;

  const points: ContinuousSeriesPoint[] = interventionPoints.map((pt, i) => {
    const flightDay = i + 1;
    const elapsed = flightDay <= horizon.elapsed_days;
    const horizonClass: CampaignHorizonClass = elapsed ? 'SIMULATED_ELAPSED' : 'PREDICTED_REMAINING';
    const expectation = valueByPeriod.get(pt.period_index) ?? null;

    let actual: number | null = null;
    let deviationAbs: number | null = null;
    let deviationPct: number | null = null;

    if (elapsed && expectation !== null) {
      const ratio = ratios.get(flightDay);
      if (ratio === null || ratio === undefined) {
        anyRefused = true;
      } else {
        actual = round(expectation * (1 + ratio), 2);
        deviationAbs = round(actual - expectation, 2);
        deviationPct = round(ratio * 100, 2);
      }
    }

    const band = bandFor(
      lens,
      pt,
      envelopeByPeriod.get(pt.period_index),
      demandByPeriod.get(pt.period_index) ?? null,
      expectation
    );

    return {
      flight_day: flightDay,
      period_index: pt.period_index,
      period_date: pt.period_date,
      phase: 'IN_FLIGHT',
      horizon_class: horizonClass,
      expectation_value: expectation,
      actual_value: actual,
      deviation_abs: deviationAbs,
      deviation_pct: deviationPct,
      expectation_lower: band.lower,
      expectation_upper: band.upper,
      strength: strengthFor(horizonClass, lensProjection.strength),
      synthetic_demo: true,
      disclosure: elapsed ? SIMULATED_ELAPSED_DISCLOSURE : PREDICTED_REMAINING_DISCLOSURE
    };
  });

  const actualBasis: ActualSeriesBasis = 'PROJECTION_BASIS_SCALED_BY_OBSERVED_RATIO';

  return {
    lens,
    availability: lensProjection.availability === 'AVAILABLE' ? 'AVAILABLE' : 'NOT_AVAILABLE',
    quantity_basis: quantityBasis,
    actual_series_basis: actualBasis,
    deviation_correspondence: 'LIKE_FOR_LIKE',
    points,
    strength: 'SEEDED_ASSUMPTION',
    disclosure: ACTUAL_SERIES_BASIS_DISCLOSURE,
    uncertainty_basis: points.some(p => p.expectation_lower !== null)
      ? 'cdi05_attributable_effect_envelope_transformed'
      : 'NONE',
    uncertainty_disclosure: UNCERTAINTY_DISCLOSURE,
    non_correspondence_reason: anyRefused
      ? 'One or more elapsed days supplied a non-positive or absent expected value, so no ratio was defined for them. Those days carry no actual and no deviation rather than a defaulted zero.'
      : undefined
  };
}

function summarise(series: ContinuousLensSeries): FlightDeviationSummary {
  const assessed = series.points.filter(p => p.deviation_pct !== null);
  if (assessed.length === 0) {
    return {
      lens: series.lens,
      state: 'NOT_ASSESSABLE',
      latest_deviation_pct: null,
      mean_deviation_pct: null,
      elapsed_days_assessed: 0,
      basis: series.quantity_basis,
      statement:
        'No elapsed day carries an assessable deviation, so the campaign cannot yet be said to be on or off plan.'
    };
  }
  const latest = assessed[assessed.length - 1].deviation_pct as number;
  const mean = round(assessed.reduce((s, p) => s + (p.deviation_pct as number), 0) / assessed.length, 2);
  let state: FlightDeviationState;
  if (Math.abs(latest) < ON_PLAN_TOLERANCE_PCT) state = 'ON_PLAN';
  else if (latest > 0) state = 'AHEAD_OF_PLAN';
  else state = 'BEHIND_PLAN';

  const direction = state === 'ON_PLAN' ? 'in line with' : state === 'AHEAD_OF_PLAN' ? 'above' : 'below';
  const noun = series.lens === 'DEMAND' ? 'Demand' : 'Contribution';
  return {
    lens: series.lens,
    state,
    latest_deviation_pct: latest,
    mean_deviation_pct: mean,
    elapsed_days_assessed: assessed.length,
    basis: series.quantity_basis,
    statement:
      `${noun} on day ${assessed[assessed.length - 1].flight_day} is running ${direction} the activated ` +
      `decision's expectation by ${Math.abs(latest).toFixed(1)}%, and ${Math.abs(mean).toFixed(1)}% ` +
      `${mean >= 0 ? 'above' : 'below'} it on average across ${assessed.length} elapsed ` +
      `${assessed.length === 1 ? 'day' : 'days'}.`
  };
}

// ---------------------------------------------------------------------------
// Narration — derived from the figures above, never authored per campaign or per day
// ---------------------------------------------------------------------------

function fmtUnits(v: number | null): string {
  return v === null ? 'not available' : `${Math.round(v).toLocaleString('en-GB')} units`;
}

function fmtGbp(v: number | null): string {
  return v === null ? 'not available' : `£${Math.round(v).toLocaleString('en-GB')}`;
}

function fmtPct(v: number | null): string {
  return v === null ? 'not available' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function direction(pct: number): 'above' | 'below' | 'in line with' {
  if (Math.abs(pct) < ATTENTION_THRESHOLD_MONITOR_PCT) return 'in line with';
  return pct > 0 ? 'above' : 'below';
}

/**
 * Attention follows the size of the departure from the activated plan, in either direction.
 *
 * Direction decides the wording, not the severity: a campaign running well ahead of the decision
 * that was activated has departed from that decision just as surely as one running behind, and a
 * reader is entitled to know either way. The thresholds are declared constants, and every
 * narration names them in its `basis` so the judgement can be audited rather than trusted.
 */
function attentionFor(deviations: number[]): { attention: DayAttention; worst: number } {
  const magnitudes = deviations.filter(d => Number.isFinite(d)).map(Math.abs);
  const worst = magnitudes.length ? Math.max(...magnitudes) : 0;
  if (worst >= ATTENTION_THRESHOLD_ATTENTION_PCT) return { attention: 'ATTENTION', worst };
  if (worst >= ATTENTION_THRESHOLD_MONITOR_PCT) return { attention: 'MONITOR', worst };
  return { attention: 'NONE', worst };
}

function buildDayNarratives(
  lenses: ContinuousLensSeries[],
  readingsByDay: Map<number, ElapsedTelemetryReading>
): FlightDayNarrative[] {
  const demand = lenses.find(l => l.lens === 'DEMAND');
  const contribution = lenses.find(l => l.lens === 'CONTRIBUTION');
  if (!demand) return [];

  return demand.points.map((dp, i) => {
    const cp = contribution ? contribution.points[i] : undefined;

    const readings: FlightDayLensReading[] = [dp, ...(cp ? [cp] : [])].map((pt, idx) => ({
      lens: idx === 0 ? ('DEMAND' as const) : ('CONTRIBUTION' as const),
      expectation_value: pt.expectation_value,
      actual_value: pt.actual_value,
      deviation_pct: pt.deviation_pct,
      expectation_lower: pt.expectation_lower,
      expectation_upper: pt.expectation_upper
    }));

    const supplementary: FlightDaySupplementaryReading[] = [];
    const telemetry = readingsByDay.get(dp.flight_day);
    if (telemetry && typeof telemetry.depot_stock_units === 'number') {
      supplementary.push({
        label: 'Depot stock',
        value: `${Math.round(telemetry.depot_stock_units).toLocaleString('en-GB')} units`,
        basis:
          'Seeded demonstration reading for this day. Stock is not projected — a stock trajectory ' +
          'would need a declared depletion basis, which nothing in this build supplies.'
      });
    }

    if (telemetry && telemetry.seeded_status) {
      supplementary.push({
        label: 'World model day status',
        value: telemetry.seeded_status.replace(/_/g, ' ').toLowerCase(),
        basis:
          "The demonstration world model's own label for this day. It is not CogniX's assessment " +
          'against the activated decision — that is derived separately, from the deviation above.'
      });
    }

    const basis: string[] = [
      'Activated decision contract — the expectation every figure is read against',
      'CDI-05 DecisionTimelineProjection under FLAT_RATE_IDENTITY',
      `Declared attention thresholds: monitor at ${ATTENTION_THRESHOLD_MONITOR_PCT}%, attention at ${ATTENTION_THRESHOLD_ATTENTION_PCT}%`
    ];

    if (dp.horizon_class === 'PREDICTED_REMAINING') {
      const bandWidth =
        dp.expectation_upper !== null && dp.expectation_lower !== null
          ? dp.expectation_upper - dp.expectation_lower
          : null;
      basis.push('Declared horizon uncertainty profile carried from CDI-05');
      return {
        flight_day: dp.flight_day,
        period_index: dp.period_index,
        period_date: dp.period_date,
        horizon_class: dp.horizon_class,
        headline: `Day ${dp.flight_day} — expected to hold at the activated plan`,
        statement:
          `CogniX expects ${fmtUnits(dp.expectation_value)} of demand and ` +
          `${fmtGbp(cp ? cp.expectation_value : null)} of contribution on this day — the same as every ` +
          `other remaining day, because the activated plan applies its effect evenly across the campaign. ` +
          (bandWidth !== null
            ? `The declared uncertainty spans ${fmtUnits(bandWidth)} of demand by this point and widens further out. `
            : '') +
          'This day has not happened.',
        attention: 'NONE' as DayAttention,
        attention_reason:
          'No predicted day differs from another under the activated plan, so no predicted day can ' +
          'call for attention on its own. What grows with horizon is uncertainty, not expected demand.',
        readings,
        supplementary,
        basis
      };
    }

    // Elapsed — the campaign has a position against the decision that was activated.
    const demandDev = dp.deviation_pct;
    const contribDev = cp ? cp.deviation_pct : null;
    const devs = [demandDev, contribDev].filter((d): d is number => d !== null);

    if (devs.length === 0) {
      return {
        flight_day: dp.flight_day,
        period_index: dp.period_index,
        period_date: dp.period_date,
        horizon_class: dp.horizon_class,
        headline: `Day ${dp.flight_day} — not assessable`,
        statement:
          'This day supplied no usable comparison against the activated decision, so CogniX will not ' +
          'say whether the campaign was on or off plan.',
        attention: 'NONE' as DayAttention,
        attention_reason: 'No defined deviation for this day.',
        readings,
        supplementary,
        basis
      };
    }

    const { attention, worst } = attentionFor(devs);
    const dDir = demandDev !== null ? direction(demandDev) : null;
    const cDir = contribDev !== null ? direction(contribDev) : null;
    const divergent =
      demandDev !== null &&
      contribDev !== null &&
      dDir !== 'in line with' &&
      cDir !== 'in line with' &&
      dDir !== cDir;

    let headline: string;
    if (divergent) {
      headline =
        demandDev! > 0
          ? `Day ${dp.flight_day} — demand ahead, contribution behind`
          : `Day ${dp.flight_day} — contribution ahead, demand behind`;
    } else if (attention === 'NONE') {
      headline = `Day ${dp.flight_day} — tracking to the activated plan`;
    } else {
      const lead = Math.abs(demandDev ?? 0) >= Math.abs(contribDev ?? 0) ? demandDev : contribDev;
      headline = `Day ${dp.flight_day} — running ${(lead ?? 0) > 0 ? 'above' : 'below'} the activated plan`;
    }

    const parts: string[] = [];
    if (demandDev !== null) {
      parts.push(
        `Demand came in at ${fmtUnits(dp.actual_value)}, ${fmtPct(demandDev)} ${dDir} the ` +
          `${fmtUnits(dp.expectation_value)} the activated decision expected`
      );
    }
    if (cp && contribDev !== null) {
      parts.push(
        `contribution at ${fmtGbp(cp.actual_value)}, ${fmtPct(contribDev)} ${cDir} the ` +
          `${fmtGbp(cp.expectation_value)} expected`
      );
    }

    const closing =
      attention === 'ATTENTION'
        ? 'This is a material departure from the decision that was activated and warrants attention.'
        : attention === 'MONITOR'
          ? 'No action is required yet; this period should be monitored.'
          : 'This is within the range CogniX treats as tracking to plan.';

    return {
      flight_day: dp.flight_day,
      period_index: dp.period_index,
      period_date: dp.period_date,
      horizon_class: dp.horizon_class,
      headline,
      statement: `${parts.join(', and ')}. ${closing}`,
      attention,
      attention_reason:
        `Largest departure from the activated plan on this day is ${worst.toFixed(1)}%, against ` +
        `declared thresholds of ${ATTENTION_THRESHOLD_MONITOR_PCT}% to monitor and ` +
        `${ATTENTION_THRESHOLD_ATTENTION_PCT}% to require attention.`,
      readings,
      supplementary,
      basis
    };
  });
}

/** The CDI-05 envelope restricted to the flight window. Values are copied, never recomputed. */
function restrictEnvelope(
  envelope: TimelineConfidenceEnvelope,
  horizon: FlightHorizon
): TimelineConfidenceEnvelope {
  return {
    ...envelope,
    points: envelope.points.filter(
      p => p.period_index >= horizon.first_period_index && p.period_index <= horizon.last_period_index
    )
  };
}

export function projectCampaignFlight(request: FlightProjectionRequest): CampaignFlightProjection {
  if (request.expectation_override !== undefined) {
    reject('RJ-W1', 'A caller-supplied expectation is forbidden. The expectation is read from the activated contract.');
  }
  if (request.reforecast_override !== undefined) {
    reject('RJ-W2', 'A caller-supplied reforecast is forbidden. Reforecast is CTW-02.');
  }
  if (!request.tenant_id || !request.session_id) {
    reject('RJ-W5', 'tenant_id and session_id are required.');
  }
  if (!request.contract_id) {
    reject('RJ-W3', 'A campaign has no flight until a decision is activated. contract_id is required.');
  }

  const contract: DecisionContract | null = decisionContractStore.getById(
    request.contract_id,
    request.tenant_id,
    request.session_id
  );
  if (!contract) {
    reject('RJ-W3', `ContractNotFound: no decision contract ${request.contract_id} for this tenant and session.`);
  }
  if (contract.status !== 'ACTIVE') {
    reject(
      'RJ-W3',
      `The bound decision contract is ${contract.status}. Only an ACTIVE contract establishes a flight baseline.`
    );
  }

  const timeline = request.timeline;
  if (!timeline) {
    reject('RJ-W4', 'A CDI-05 projection is required; CTW-01 renders one, it does not compute one.');
  }
  if (timeline.tenant_id !== request.tenant_id || timeline.session_id !== request.session_id) {
    reject('RJ-W5', 'The supplied projection belongs to a different tenant or session.');
  }

  const contractIntentId = contract.basis.campaign_intent_ref.id;
  if (timeline.campaign_intent_id !== contractIntentId) {
    reject(
      'RJ-W4',
      `The supplied projection is for intent ${timeline.campaign_intent_id}, but the activated contract binds ${contractIntentId}. ` +
        'A flight is only ever rendered against the decision that was activated.'
    );
  }

  const intervention = timeline.trajectories.find(t => t.kind === 'INTERVENTION');
  if (!intervention) {
    reject('RJ-W7', 'The bound projection carries no INTERVENTION trajectory, so there is no expectation to render.');
  }

  const readings = [...(request.elapsed_telemetry || [])].sort((a, b) => a.flight_day - b.flight_day);
  for (const r of readings) {
    if (!Number.isInteger(r.flight_day) || r.flight_day < 1) {
      reject('RJ-W6', `Elapsed telemetry carries an invalid flight_day ${r.flight_day}.`);
    }
  }
  const horizon = buildHorizon(timeline, intervention, readings.length);

  const ivPoints = campaignPoints(intervention).slice(0, horizon.flight_days);

  const demandRatios = new Map<number, number | null>();
  const contributionRatios = new Map<number, number | null>();
  for (const r of readings) {
    if (r.flight_day > horizon.flight_days) continue;
    demandRatios.set(r.flight_day, deviationRatio(r.demand_expected, r.demand_observed));
    contributionRatios.set(r.flight_day, deviationRatio(r.contribution_expected, r.contribution_observed));
  }

  const demandLens = timeline.lenses.find(l => l.lens === 'DEMAND');
  const contributionLens = timeline.lenses.find(l => l.lens === 'CONTRIBUTION');
  if (!demandLens || !contributionLens) {
    reject('RJ-W7', 'The bound projection is missing the DEMAND or CONTRIBUTION lens.');
  }

  const demandByPeriod = new Map<number, number | null>();
  for (const v of demandLens.values) demandByPeriod.set(v.period_index, v.intervention);

  const envelope = timeline.attributable_effect_envelope;
  const lenses: ContinuousLensSeries[] = [
    buildLensSeries('DEMAND', horizon, ivPoints, demandLens, demandRatios, envelope, demandByPeriod),
    buildLensSeries('CONTRIBUTION', horizon, ivPoints, contributionLens, contributionRatios, envelope, demandByPeriod)
  ];

  const demandSeries = lenses[0];
  const trajectories: FlightTrajectory[] = [
    {
      kind: 'INTERVENTION',
      role: 'What the activated decision expected',
      covers: 'FULL_HORIZON',
      points: demandSeries.points
    },
    {
      kind: 'OBSERVED',
      role: 'What the campaign is running at',
      covers: 'ELAPSED_ONLY',
      points: demandSeries.points.filter(p => p.horizon_class !== 'PREDICTED_REMAINING')
    }
  ];

  const activation: FlightActivation = {
    state: 'ACTIVE',
    contract_ref: toContractReference(contract),
    contract_status: contract.status,
    decision_basis_digest: contract.decision_basis_digest,
    activated_as_of: contract.created_as_of,
    campaign_start: timeline.grid.campaign_start,
    campaign_end: timeline.grid.campaign_end,
    disclosure: ACTIVATION_DISCLOSURE
  };

  const projection: CampaignFlightProjection = {
    flight_id: `ctw01_flight_${contract.contract_id}`,
    tenant_id: request.tenant_id,
    session_id: request.session_id,
    campaign_intent_id: contractIntentId,
    activation,
    horizon,
    trajectories,
    lenses,
    deviation: lenses.map(summarise),
    day_narratives: buildDayNarratives(lenses, new Map(readings.map(r => [r.flight_day, r]))),
    flat_horizon_disclosure: FLAT_HORIZON_DISCLOSURE,
    uncertainty: restrictEnvelope(timeline.attributable_effect_envelope, horizon),
    confidence_band: timeline.attributable_effect_envelope.band,
    timeline_projection_id: timeline.projection_id,
    counterfactual_id: timeline.counterfactual_id,
    causal_id: timeline.causal_id,
    calculation_mode: 'deterministic_continuous_flight_timeline',
    synthetic_demo: true,
    schema_version: FLIGHT_SCHEMA_VERSION,
    provenance: {
      engine: ENGINE_VERSION,
      package: 'CTW-01',
      expectation_source: 'CDI-05 DecisionTimelineProjection bound by the activated CDI-07A contract',
      baseline_authority: 'CDI-07A decision_basis_digest',
      actual_series: 'projection basis scaled by a scale-free ratio read from seeded campaign telemetry',
      uncertainty_source: 'CDI-05 attributable_effect_envelope, restricted to the flight window, values unchanged'
    },
    timestamp: new Date().toISOString(),
    non_scope: CTW01_NON_SCOPE
  };

  const violations = validateFlightProjection(projection);
  if (violations.length > 0) {
    reject(
      'RJ-W8',
      `Flight projection violates its own invariants and is refused rather than rendered: ${violations
        .map(v => `${v.invariant} ${v.detail}`)
        .join('; ')}`
    );
  }

  return projection;
}
