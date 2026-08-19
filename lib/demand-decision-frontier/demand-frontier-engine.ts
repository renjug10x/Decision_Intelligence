/**
 * CogniX Demand Decision Frontier (DDF-01) Engine
 *
 * Pure calculative engine for:
 * 1. Forecast Stability Intelligence (P0-A)
 * 2. Demand Decision Frontier & Trajectory Set (P0-B)
 * 3. Decision Gap Intelligence (P0-B)
 * 4. Decision Window (Supporting P0-B)
 * 5. Decision Regret Intelligence (P0-C)
 * 6. Intervention Recommendation & Simulation
 *
 * Architectural Rule: 100% deterministic, pure calculation, no fake ML, full provenance.
 * Governed by: DEMAND_OBSERVABILITY_MODEL.md, ARCHITECTURE_DECISIONS.md (ADR-040..ADR-043)
 *
 * ── The single arithmetic spine ────────────────────────────────────────────────
 * Every unit, percentage point and pound on this surface resolves to ONE base:
 *
 *   base_demand_units = (weekly_demand_units / (1 + promotion_lift/100)) x (horizon_days / 7)
 *
 * `weekly_demand_units` and `supplier_capacity_units` are read READ-ONLY from
 * `DecisionDerivedImpacts` (WP10-C). No supplier-capacity number is defined here.
 * Because every `_pct` shares that denominator, the identity
 *
 *   emerging_frontier_pct - executable_frontier_pct === exposed_demand_units / base_demand_units
 *
 * holds by construction rather than by coincidence, which is what AC-DDF-27 requires.
 */

import {
  ForecastStabilityAssessment,
  ForecastStabilityState,
  RevisionRiskLevel,
  RevisionDirection,
  DemandFrontierTrajectoryPoint,
  DemandFrontierSeries,
  DemandUnitEconomics,
  DemandDecisionGap,
  ContributingConstraint,
  DemandDecisionWindow,
  DecisionRegretAlternative,
  DemandDecisionRegret,
  DemandInterventionScenario,
  DemandAssumptionRecord,
  DemandDecisionFrontierEvaluation,
  DecisionScenarioParameters,
  DecisionDerivedImpacts,
  ContextualisedDecisionOutlook,
  EnterpriseSignal
} from '@/packages/contracts/src/index';

// ── Declared modelled constants ──────────────────────────────────────────────
// Each is a MODELLED_DEMO_ASSUMPTION and is published in the assumption inventory.

/** Declared gross margin rate. The estate holds no cost data, so this is a modelled assumption. */
export const DDF_GROSS_MARGIN_RATE_PCT = 30;

/** Flex premium charged on volume secured outside the standard order cycle, as a share of unit revenue. */
export const DDF_FLEX_PREMIUM_RATE_PCT = 12;

/** Fallback unit revenue, used only when the projection cannot supply a derived value. */
export const DDF_FALLBACK_REVENUE_PER_UNIT_GBP = 2.0;

/**
 * Unit economics. `revenue_per_unit_gbp` is derived from the projection itself
 * (projected revenue ÷ projected units over the same horizon) so that every pound on this
 * surface reconciles with the revenue KPI beside it. Only the margin RATE is assumed.
 */
export function deriveUnitEconomics(revenuePerUnitGbp?: number | null): DemandUnitEconomics {
  const derived = typeof revenuePerUnitGbp === 'number'
    && Number.isFinite(revenuePerUnitGbp)
    && revenuePerUnitGbp > 0;
  const revenue = Number((derived ? (revenuePerUnitGbp as number) : DDF_FALLBACK_REVENUE_PER_UNIT_GBP).toFixed(2));
  return {
    revenue_per_unit_gbp: revenue,
    gross_margin_per_unit_gbp: Number((revenue * (DDF_GROSS_MARGIN_RATE_PCT / 100)).toFixed(2)),
    margin_rate_pct: DDF_GROSS_MARGIN_RATE_PCT,
    revenue_per_unit_basis: derived ? 'DERIVED_FROM_PROJECTION' : 'MODELLED_DEMO_ASSUMPTION',
    basis: 'MODELLED_DEMO_ASSUMPTION'
  };
}

/** Declared scenario event effects on demand. */
export const DDF_EVENT_EFFECT_PCT: Record<string, number> = {
  none: 0,
  holiday: 15,
  heatwave: 25,
  christmas: 35
};

/** How each scenario event key is named on a client-facing surface. */
export const DDF_EVENT_DISPLAY_NAME: Record<string, string> = {
  none: 'No event expected',
  holiday: 'Bank holiday weekend',
  heatwave: 'Heatwave or summer spike',
  christmas: 'Christmas spike'
};

/** WP10-C `SLA_FLEX_RULE_4` supplies 1,200 additional units per week. Mirrored, not redefined. */
export const DDF_SLA_FLEX_UNITS_PER_WEEK = 1200;

/** Modelled cost of deploying the supplier flex lever (notice fee + DC overtime). */
export const DDF_INTERVENTION_COST_GBP = 2400;

/**
 * Below this separation between the best and second-best alternative, no winner is named.
 * Materiality is judged against the SIZE OF THE DECISION — the largest expected value on the
 * table — not against total exposure, because most exposure is usually unrecoverable and would
 * set an unreachable bar. The absolute floor stops trivial sums from naming a winner at all.
 */
export const DDF_MIN_SEPARATION_GBP = 1000;
export const DDF_SEPARATION_FLOOR_PCT_OF_DECISION = 5;

/**
 * ADR-040 — the signal types that bear on DEMAND-OUTLOOK divergence. Supply, inventory,
 * logistics and cost signals are deliberately excluded: they describe the constraint side,
 * they are already represented in the executable frontier, and their magnitudes (a lead-time
 * drift of +800%, a stockout risk of +1260%) would otherwise swamp a demand-stability score.
 * No new `CanonicalSignalType` is introduced — this is a scoping filter over existing ones.
 */
export const DDF_STABILITY_SIGNAL_TYPES: readonly string[] = [
  'FORECAST_DIVERGENCE',
  'CATEGORY_DEMAND_ACCELERATION',
  'ORDER_VELOCITY_ACCELERATION',
  'REGIONAL_DEMAND_SHIFT',
  'SEARCH_VELOCITY_ACCELERATION',
  'BASKET_ADD_ACCELERATION',
  'PRODUCT_ENGAGEMENT_ACCELERATION',
  'CAMPAIGN_RESPONSE_ACCELERATION'
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round1 = (value: number) => Number(value.toFixed(1));
const safeDiv = (numerator: number, denominator: number) =>
  denominator === 0 || !Number.isFinite(denominator) ? 0 : numerator / denominator;

/** Deterministic identifier — `Math.random` would make evaluations untestable. */
function deterministicId(prefix: string, parts: (string | number)[]): string {
  const material = parts.join('|');
  let hash = 5381;
  for (let i = 0; i < material.length; i++) {
    hash = ((hash << 5) + hash + material.charCodeAt(i)) >>> 0;
  }
  return `${prefix}_${hash.toString(36)}`;
}

export interface EvaluateDemandFrontierParams {
  tenantId?: string;
  sessionId?: string;
  scenarioParams: DecisionScenarioParameters;
  derivedImpacts: DecisionDerivedImpacts;
  intentFusionOutlook: ContextualisedDecisionOutlook;
  enterpriseSignals?: EnterpriseSignal[];
  historySales: { date: string; value: number }[];
  forecastSales: { date: string; value: number }[];
  metric?: 'revenue' | 'units' | 'waste';
  /**
   * Projected revenue ÷ projected units over the same horizon. Supplying it makes the money on
   * this surface reconcile with the revenue projection beside it; omitting it falls back to a
   * declared modelled value and is labelled as such.
   */
  revenuePerUnitGbp?: number | null;
  /**
   * The scenario clock. A synthetic scenario is never counted down against real civil time.
   * Defaults to midnight UTC on the day before the first forecast point.
   */
  scenarioNowIso?: string | null;
  declaredDeadline?: {
    deadlineIso?: string;
    deadlineDisplay?: string;
    declaredConstraintName?: string;
    declaredBy?: string;
  } | null;
  activeInterventionId?: string | null;
}

// ── Shared demand base ───────────────────────────────────────────────────────

export interface DemandBase {
  /** Observed run-rate per day, from history. Invariant to every scenario control. */
  run_rate_units_per_day: number;
  /** Days that carry an actual observation. Days with no recorded demand are NOT counted as zero. */
  observed_days: number;
  horizon_days: number;
  horizon_weeks: number;
  base_demand_units: number;
  /**
   * Executable capacity as a multiple of the demand base, read from Shared Decision State:
   * `supplier_capacity_units ÷ un-promoted weekly demand`. Scale-free, so it can be applied to
   * the observed run rate without importing WP10-C's abstract 10,000-unit population.
   * Rises with the allocation cap and with any selected intervention; invariant to promotion depth.
   */
  capacity_index: number;
}

/**
 * Establishes the ONE denominator for the whole surface: the observed run rate scaled to the
 * horizon. Everything else on the frontier is expressed as a percentage above it, which is why
 * the percentages and the units can be reconciled to each other.
 *
 * `capacity_index` is the only thing taken from `DecisionDerivedImpacts`, and it is taken as a
 * ratio precisely so no fourth supplier-capacity *quantity* is created (ADR-041, AC-DDF-13).
 */
export function deriveDemandBase(
  scenarioParams: DecisionScenarioParameters,
  derivedImpacts: DecisionDerivedImpacts,
  historySales: { value: number }[],
  horizonDaysOverride?: number
): DemandBase {
  const horizon_days = Math.max(1, horizonDaysOverride || scenarioParams.forecast_horizon_days || 14);

  // A day the source holds no record for is MISSING DATA, not a day of zero demand. Averaging a
  // coverage gap in as a zero would depress the run rate and inflate every percentage measured
  // against it — the censored-history error `DEMAND_OBSERVABILITY_MODEL.md` §4.7 and §4.9 forbid.
  const observedDays = historySales.filter(h => Number.isFinite(h.value) && h.value > 0);
  const run_rate_units_per_day = observedDays.length > 0
    ? observedDays.reduce((sum, h) => sum + h.value, 0) / observedDays.length
    : 0;

  const promoFactor = 1 + scenarioParams.promotion_lift / 100;
  const unpromotedWeeklyDemand = promoFactor > 0
    ? derivedImpacts.weekly_demand_units / promoFactor
    : derivedImpacts.weekly_demand_units;
  const capacity_index = unpromotedWeeklyDemand > 0
    ? derivedImpacts.supplier_capacity_units / unpromotedWeeklyDemand
    : 1;

  return {
    run_rate_units_per_day,
    observed_days: observedDays.length,
    horizon_days,
    horizon_weeks: horizon_days / 7,
    base_demand_units: run_rate_units_per_day * horizon_days,
    capacity_index
  };
}

// ── P0-A: Forecast Stability Evaluation ──────────────────────────────────────

function indeterminateStability(reason: string): ForecastStabilityAssessment {
  return {
    stability_score: null,
    stability_state: 'INDETERMINATE',
    trend_direction: 'INDETERMINATE',
    revision_risk: 'INDETERMINATE',
    material_revision_probability_pct: null,
    evidence_confidence_pct: null,
    likely_revision_direction: 'INDETERMINATE',
    likely_revision_magnitude_min_pct: 0,
    likely_revision_magnitude_max_pct: 0,
    expected_revision_pct: 0,
    contributing_signal_refs: [],
    evidence_provenance: {
      calculation_basis: 'deterministic_signal_divergence_v2',
      contributing_signal_count: 0
    },
    confidence_distinction_statement: STABILITY_DISTINCTION,
    status: 'INDETERMINATE',
    indeterminate_reason: reason,
    synthetic_demo: true
  };
}

const STABILITY_DISTINCTION =
  'Forecast Confidence is a declared property of the forecasting method and has no backtest behind it in this estate. ' +
  'Forecast Stability is measured from the observed signal stream: how far current evidence has diverged from the ' +
  'baseline the forecast was built on. A confident forecast can still be unstable.';

/**
 * ADR-040 — stability is a property of the EVIDENCE STREAM, not of the model and not of the
 * scenario plan. It is computed only from observed `EnterpriseSignal` divergence. Scenario
 * controls (promotion depth, event boost) are deliberately excluded: a planned promotion is
 * known, and treating a plan as instability would conflate intent with evidence.
 *
 * In one sentence: stability falls as observed signals diverge from the baseline the forecast
 * was built on, and falls further when those signals disagree with each other.
 *
 * With no bearing signal evidence the result is `INDETERMINATE`. It never falls back to a
 * neutral score, an inherited confidence value, or fabricated signals.
 */
export function evaluateForecastStability(
  scenarioParams: DecisionScenarioParameters,
  enterpriseSignals: EnterpriseSignal[] = [],
  _intentFusionOutlook?: ContextualisedDecisionOutlook
): ForecastStabilityAssessment {
  const signals = (enterpriseSignals || []).filter(
    s => s
      && DDF_STABILITY_SIGNAL_TYPES.includes(s.signal_type)
      && typeof s.delta_pct === 'number'
      && Number.isFinite(s.delta_pct)
  );

  if (signals.length === 0) {
    return indeterminateStability(
      'No observed Enterprise Signal of a demand-divergence type carries a baseline-to-observation ' +
      'delta for this scope. Forecast Stability requires signal evidence and is never inferred from ' +
      'scenario parameters or from a model confidence value.'
    );
  }

  const deltas = signals.map(s => s.delta_pct as number);
  const signedMean = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
  const absMean = deltas.reduce((sum, d) => sum + Math.abs(d), 0) / deltas.length;
  const variance = deltas.reduce((sum, d) => sum + (d - signedMean) ** 2, 0) / deltas.length;
  const dispersion = Math.sqrt(variance);

  // Magnitude of divergence destabilises; disagreement between signals destabilises further.
  const stability_score = Math.round(clamp(96 - absMean * 1.4 - dispersion * 0.8, 35, 96));
  const material_revision_probability_pct = Math.round(clamp(absMean * 3 + dispersion * 2, 5, 90));

  // How much weight the evidence carries, taken from the signals' own confidence grading.
  const confidences = signals
    .map(s => s.confidence)
    .filter((c): c is number => typeof c === 'number' && Number.isFinite(c));
  const evidence_confidence_pct = confidences.length > 0
    ? Math.round(confidences.reduce((sum, c) => sum + c, 0) / confidences.length)
    : null;

  let stability_state: ForecastStabilityState;
  let revision_risk: RevisionRiskLevel;
  if (stability_score >= 80) {
    stability_state = 'STABLE';
    revision_risk = 'LOW';
  } else if (stability_score >= 65) {
    stability_state = 'WATCH';
    revision_risk = 'ELEVATED';
  } else {
    stability_state = 'DETERIORATING';
    revision_risk = 'HIGH';
  }

  // Direction follows the signed evidence, so a contracting market reads DOWNWARD.
  let likely_revision_direction: RevisionDirection = 'BALANCED';
  if (signedMean > 2) likely_revision_direction = 'UPWARD';
  else if (signedMean < -2) likely_revision_direction = 'DOWNWARD';

  // Magnitudes are unsigned; direction is carried by the field above, never by a sign.
  const likely_revision_magnitude_min_pct = Math.round(Math.abs(signedMean) * 0.35);
  const likely_revision_magnitude_max_pct = Math.max(
    likely_revision_magnitude_min_pct + 1,
    Math.round(Math.abs(signedMean) * 0.8 + dispersion)
  );

  const directionSign = likely_revision_direction === 'UPWARD' ? 1
    : likely_revision_direction === 'DOWNWARD' ? -1
    : 0;
  const midMagnitude = (likely_revision_magnitude_min_pct + likely_revision_magnitude_max_pct) / 2;
  const expected_revision_pct = round1(
    (material_revision_probability_pct / 100) * midMagnitude * directionSign
  );

  return {
    stability_score,
    stability_state,
    // No prior assessment is retained, so no trend may be claimed.
    trend_direction: 'INDETERMINATE',
    revision_risk,
    material_revision_probability_pct,
    evidence_confidence_pct,
    likely_revision_direction,
    likely_revision_magnitude_min_pct,
    likely_revision_magnitude_max_pct,
    expected_revision_pct,
    contributing_signal_refs: signals.map(s => s.signal_id),
    evidence_provenance: {
      signal_divergence_mean_abs_pct: round1(absMean),
      signal_divergence_signed_mean_pct: round1(signedMean),
      signal_disagreement_stdev_pct: round1(dispersion),
      contributing_signal_count: signals.length,
      calculation_basis: 'deterministic_signal_divergence_v2'
    },
    confidence_distinction_statement: STABILITY_DISTINCTION,
    status: 'VALID',
    synthetic_demo: true
  };
}

// ── P0-B: Demand Frontier & Trajectory ──────────────────────────────────────

/**
 * Builds the four demand quantities of `DEMAND_OBSERVABILITY_MODEL.md` §3 on one shared base.
 * `historySales` and `forecastSales` are DEMAND UNITS — the frontier is a demand artefact and is
 * never evaluated in the surface's display metric.
 */
export function evaluateDemandFrontier(
  historySales: { date: string; value: number }[],
  forecastSales: { date: string; value: number }[],
  scenarioParams: DecisionScenarioParameters,
  derivedImpacts: DecisionDerivedImpacts,
  intentFusionOutlook: ContextualisedDecisionOutlook,
  stability: ForecastStabilityAssessment
): DemandFrontierSeries {
  const base = deriveDemandBase(
    scenarioParams, derivedImpacts, historySales, forecastSales.length || undefined
  );
  const { base_demand_units, capacity_index } = base;

  // Contextualised demand — the live projection, which already carries promotion depth,
  // cannibalisation, the event boost and the selected projection method.
  const contextualised_demand_units = forecastSales.reduce((sum, f) => sum + f.value, 0);

  // Baseline forecast — the same projection with commercial promotion removed: the upstream
  // statistical expectation before commercial intent is applied.
  const promoFactor = 1 + scenarioParams.promotion_lift / 100;
  const baseline_demand_units = promoFactor > 0
    ? contextualised_demand_units / promoFactor
    : contextualised_demand_units;

  // Emerging frontier — contextualised demand carried forward by the ADR-040 expected revision.
  // This is the visible dependency AC-DDF-14 requires: stability moves the emerging frontier.
  const emerging_demand_units =
    contextualised_demand_units * (1 + stability.expected_revision_pct / 100);

  // Executable frontier — the demand base lifted by the Shared Decision State capacity index.
  // Read-only: no supplier-capacity quantity is defined here (ADR-041, AC-DDF-13).
  const executable_demand_units = base_demand_units * capacity_index;

  const asPct = (units: number) => round1((safeDiv(units, base_demand_units) - 1) * 100);

  // Daily shape is taken from the projection series so the chart and the headline agree.
  const forecastTotal = forecastSales.reduce((sum, f) => sum + f.value, 0);
  const shape = forecastSales.map(f =>
    forecastTotal > 0 ? f.value / forecastTotal : safeDiv(1, forecastSales.length)
  );

  const trajectory: DemandFrontierTrajectoryPoint[] = historySales.map((h, idx) => ({
    date: h.date,
    day_index: idx - historySales.length,
    historical_actual: h.value,
    baseline_forecast: null,
    contextualised_demand: null,
    emerging_demand_frontier: null,
    executable_demand_frontier: null,
    simulated_demand_frontier: null
  }));

  forecastSales.forEach((f, idx) => {
    const share = shape[idx] ?? 0;
    trajectory.push({
      date: f.date,
      day_index: idx + 1,
      historical_actual: null,
      baseline_forecast: Math.round(baseline_demand_units * share),
      contextualised_demand: Math.round(contextualised_demand_units * share),
      emerging_demand_frontier: Math.round(emerging_demand_units * share),
      // Capacity is a ceiling, not a demand curve: it is flat across the horizon.
      executable_demand_frontier: Math.round(safeDiv(executable_demand_units, forecastSales.length)),
      simulated_demand_frontier: null
    });
  });

  return {
    trajectory,
    base_demand_units: Math.round(base_demand_units),
    horizon_days: base.horizon_days,
    baseline_lift_pct: intentFusionOutlook?.baseline_forecast?.baseline_lift_pct ?? 0,
    commercial_intent_lift_pct: intentFusionOutlook?.commercial_intent?.intent_effect_pct ?? 0,
    observed_signal_lift_pct: intentFusionOutlook?.observed_signals?.observed_signal_effect_pct ?? 0,
    contextualised_outlook_pct: asPct(contextualised_demand_units),
    emerging_frontier_pct: asPct(emerging_demand_units),
    executable_frontier_pct: asPct(executable_demand_units),
    baseline_demand_units: Math.round(baseline_demand_units),
    contextualised_demand_units: Math.round(contextualised_demand_units),
    emerging_demand_units: Math.round(emerging_demand_units),
    executable_demand_units: Math.round(executable_demand_units),
    basis_class: 'DERIVED_FROM_CONSTRAINTS'
  };
}

// ── P0-B: Decision Gap Evaluation ───────────────────────────────────────────

/** Modelled attribution of the exposure across the constraints that produce it. Shares sum to 1. */
const CONSTRAINT_ATTRIBUTION = [
  { share: 0.65, id: 'CST-SUP-01' },
  { share: 0.25, id: 'CST-DC-02' },
  { share: 0.10, id: 'CST-LEAD-03' }
];

export function evaluateDecisionGap(
  scenarioParams: DecisionScenarioParameters,
  derivedImpacts: DecisionDerivedImpacts,
  demandFrontier: DemandFrontierSeries,
  unitEconomics: DemandUnitEconomics
): DemandDecisionGap {
  const base_demand_units = demandFrontier.base_demand_units;
  const emerging_demand_units = demandFrontier.emerging_demand_units;
  const executable_demand_units = demandFrontier.executable_demand_units;

  const exposed_demand_units = Math.max(0, Math.round(emerging_demand_units - executable_demand_units));
  const exposed_demand_pp = round1(safeDiv(exposed_demand_units, base_demand_units) * 100);

  const revenue_at_risk_gbp = Math.round(exposed_demand_units * unitEconomics.revenue_per_unit_gbp);
  const margin_at_risk_gbp = Math.round(exposed_demand_units * unitEconomics.gross_margin_per_unit_gbp);

  let risk_state: DemandDecisionGap['risk_state'] = 'LOW';
  if (exposed_demand_pp >= 15) risk_state = 'CRITICAL';
  else if (exposed_demand_pp >= 8) risk_state = 'HIGH';
  else if (exposed_demand_pp > 2) risk_state = 'MEDIUM';

  const attributed = CONSTRAINT_ATTRIBUTION.map(a => ({
    ...a,
    units: Math.round(exposed_demand_units * a.share)
  }));
  // Absorb rounding drift into the largest contributor so the parts sum to the whole.
  const drift = exposed_demand_units - attributed.reduce((sum, a) => sum + a.units, 0);
  attributed[0].units += drift;

  const contributing_constraints: ContributingConstraint[] = [
    {
      constraint_id: 'CST-SUP-01',
      name: 'FreshDirect UK Allocation Cap',
      description: `Committed supplier allocation is capped at +${scenarioParams.supplier_capacity_cap}% above base contract (${Math.round(derivedImpacts.supplier_capacity_units).toLocaleString()} units per week).`,
      impact_units: attributed[0].units,
      impact_pp: round1(exposed_demand_pp * CONSTRAINT_ATTRIBUTION[0].share),
      rank: 1,
      provenance_basis: 'DECLARED_OPERATIONAL_CONSTRAINT'
    },
    {
      constraint_id: 'CST-DC-02',
      name: 'Trafford DC Weekend Throughput',
      description: 'Regional distribution centre weekend handling ceiling limits surge fulfilment.',
      impact_units: attributed[1].units,
      impact_pp: round1(exposed_demand_pp * CONSTRAINT_ATTRIBUTION[1].share),
      rank: 2,
      provenance_basis: 'MODELLED_DEMO_ASSUMPTION'
    },
    {
      constraint_id: 'CST-LEAD-03',
      name: 'Secondary Replenishment Lead Time',
      description: 'A 48-hour supplier order lock prevents same-week emergency reorder without a flex notice.',
      impact_units: attributed[2].units,
      impact_pp: round1(exposed_demand_pp * CONSTRAINT_ATTRIBUTION[2].share),
      rank: 3,
      provenance_basis: 'MODELLED_DEMO_ASSUMPTION'
    }
  ];

  return {
    emerging_demand_units,
    executable_demand_units,
    exposed_demand_units,
    base_demand_units,
    emerging_demand_pct: demandFrontier.emerging_frontier_pct,
    executable_demand_pct: demandFrontier.executable_frontier_pct,
    exposed_demand_pp,
    revenue_at_risk_gbp,
    margin_at_risk_gbp,
    unit_economics: unitEconomics,
    risk_state,
    affected_products: ['Premium Greek Yogurt 500g', 'Organic Whole Milk 2L', 'Artisan Butter 250g'],
    affected_regions: ['North West', 'Manchester Metro', 'London Central'],
    contributing_constraints,
    basis_class: 'DERIVED_FROM_CONSTRAINTS',
    reconciliation_evidence:
      `Emerging demand ${Math.round(emerging_demand_units).toLocaleString()} units (+${demandFrontier.emerging_frontier_pct}%) ` +
      `less executable capacity ${Math.round(executable_demand_units).toLocaleString()} units (+${demandFrontier.executable_frontier_pct}%) ` +
      `= ${exposed_demand_units.toLocaleString()} units exposed, which is ${exposed_demand_pp}pp of the ` +
      `${Math.round(base_demand_units).toLocaleString()}-unit demand base over ${demandFrontier.horizon_days} days. ` +
      `At £${unitEconomics.revenue_per_unit_gbp}/unit that is £${revenue_at_risk_gbp.toLocaleString()} of revenue, ` +
      `carrying £${margin_at_risk_gbp.toLocaleString()} of gross margin (${unitEconomics.margin_rate_pct}%).`
  };
}

// ── Decision Window Evaluation ──────────────────────────────────────────────

const DAY_MS = 86400000;
const HOUR_MS = 3600000;

/** Midnight UTC on the day before the first projected day. Anchors the synthetic scenario clock. */
export function deriveScenarioNowIso(forecastSales: { date: string }[]): string | null {
  const first = forecastSales[0]?.date;
  if (!first) return null;
  const firstMs = Date.parse(`${first}T00:00:00.000Z`);
  if (!Number.isFinite(firstMs)) return null;
  return new Date(firstMs - DAY_MS).toISOString();
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatScenarioInstant(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${WEEKDAY_NAMES[d.getUTCDay()]} ${hh}:${mm} UTC`;
}

/** First Friday 14:00 UTC strictly after the scenario clock — the modelled supplier cut-off. */
function nextFridayCutOff(fromIso: string): string {
  const from = new Date(fromIso);
  const candidate = new Date(Date.UTC(
    from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 14, 0, 0, 0
  ));
  while (candidate.getUTCDay() !== 5 || candidate.getTime() <= from.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return candidate.toISOString();
}

const TIMEZONE_NOTE =
  'The supplier cut-off is contractual and expressed in UTC. UK civil time in August is BST (UTC+1), ' +
  'so 14:00 UTC is 15:00 local.';

/**
 * ADR-042 — a duration is publishable only where a declared constraint exists, and it is always
 * measured from the SCENARIO clock, never from real civil time. With no declared constraint and
 * no scenario anchor the window is `INDETERMINATE` and no countdown is produced.
 */
export function evaluateDecisionWindow(
  declaredDeadline?: {
    deadlineIso?: string;
    deadlineDisplay?: string;
    declaredConstraintName?: string;
    declaredBy?: string;
  } | null,
  scenarioNowIso?: string | null
): DemandDecisionWindow {
  const anchorMs = scenarioNowIso ? Date.parse(scenarioNowIso) : NaN;
  const hasAnchor = Number.isFinite(anchorMs);

  if (!hasAnchor) {
    return {
      window_state: 'INDETERMINATE',
      scenario_now_iso: null,
      scenario_now_display: null,
      deadline_iso: null,
      deadline_display: null,
      remaining_hours: null,
      declared_constraint_name: null,
      declared_by: null,
      timezone_note: null,
      provenance_basis: 'INDETERMINATE',
      explanation:
        'No scenario time anchor is available, so the time remaining to act cannot be derived. ' +
        'CogniX reports the absence rather than filling it with a countdown.',
      is_indeterminate: true
    };
  }

  const isDeclared = !!(declaredDeadline && declaredDeadline.deadlineIso);
  const deadlineIso = isDeclared
    ? (declaredDeadline!.deadlineIso as string)
    : nextFridayCutOff(scenarioNowIso as string);
  const deadlineMs = Date.parse(deadlineIso);

  if (!Number.isFinite(deadlineMs)) {
    return {
      window_state: 'INDETERMINATE',
      scenario_now_iso: scenarioNowIso as string,
      scenario_now_display: formatScenarioInstant(scenarioNowIso as string),
      deadline_iso: null,
      deadline_display: null,
      remaining_hours: null,
      declared_constraint_name: declaredDeadline?.declaredConstraintName || null,
      declared_by: declaredDeadline?.declaredBy || null,
      timezone_note: null,
      provenance_basis: 'INDETERMINATE',
      explanation:
        'The declared constraint does not carry a resolvable deadline, so no window duration is published.',
      is_indeterminate: true
    };
  }

  const remaining_hours = Math.round((deadlineMs - anchorMs) / HOUR_MS);
  const window_state: DemandDecisionWindow['window_state'] =
    remaining_hours <= 0 ? 'RESTRICTED' : remaining_hours < 24 ? 'CLOSING_SOON' : 'OPEN';

  const declared_constraint_name =
    declaredDeadline?.declaredConstraintName || 'FreshDirect UK Order Confirmation Cut-Off';
  const declared_by = declaredDeadline?.declaredBy || 'Commercial Supply Agreement (SLA Rule 4)';
  const deadline_display = declaredDeadline?.deadlineDisplay || formatScenarioInstant(deadlineIso);

  return {
    window_state,
    scenario_now_iso: scenarioNowIso as string,
    scenario_now_display: formatScenarioInstant(scenarioNowIso as string),
    deadline_iso: deadlineIso,
    deadline_display,
    remaining_hours,
    declared_constraint_name,
    declared_by,
    timezone_note: TIMEZONE_NOTE,
    provenance_basis: isDeclared ? 'DECLARED_OPERATIONAL_CONSTRAINT' : 'MODELLED_DEMO_ASSUMPTION',
    explanation:
      window_state === 'RESTRICTED'
        ? `The ${declared_constraint_name} passed at ${deadline_display} on the scenario clock. Capacity can no longer be secured for this horizon.`
        : `Measured from scenario time ${formatScenarioInstant(scenarioNowIso as string)}, an intervention must be confirmed before ${deadline_display} — the ${declared_constraint_name} declared by ${declared_by}.`,
    is_indeterminate: false
  };
}

// ── P0-C: Decision Regret Intelligence ──────────────────────────────────────

/**
 * Waiting costs more as the window closes. Erosion is derived from the Decision Window rather
 * than declared as a constant, which is what makes Wait a genuine alternative rather than a
 * strawman: with time in hand, waiting is nearly free; with the cut-off imminent, it is ruinous.
 * The window never *produces* the erosion figure's authority — it is a modelled relationship.
 */
export function deriveLeadTimeErosionPct(window: DemandDecisionWindow): number {
  if (window.is_indeterminate || window.remaining_hours === null) return 0;
  if (window.remaining_hours <= 0) return 100;
  return Math.round(clamp(100 - (window.remaining_hours / 72) * 100, 10, 85));
}

/**
 * ADR-043 — the three alternatives are computed from ONE input set, and regret is the relative
 * shortfall against the best of them (`best − this`). The winner's regret is zero by
 * construction. No alternative introduces a coefficient the shared inputs do not carry.
 */
export function evaluateDecisionRegret(
  decisionGap: DemandDecisionGap,
  scenarioParams: DecisionScenarioParameters,
  stability: ForecastStabilityAssessment,
  decisionWindow: DemandDecisionWindow,
  capturableUnits: number,
  interventionCostGbp: number
): DemandDecisionRegret {
  const exposedUnits = decisionGap.exposed_demand_units;
  const margin = decisionGap.unit_economics.gross_margin_per_unit_gbp;
  const revenuePerUnit = decisionGap.unit_economics.revenue_per_unit_gbp;

  const capturable = Math.max(0, Math.min(exposedUnits, capturableUnits));
  const cost = exposedUnits > 0 ? Math.round(interventionCostGbp) : 0;

  // Confidence that the emerging demand level is realised, taken from the grading the
  // contributing signals already carry. Where the evidence is INDETERMINATE the probability is
  // not invented — the comparison is reported as unresolvable instead.
  const stabilityKnown = stability.status === 'VALID' && stability.evidence_confidence_pct !== null;
  const p = stabilityKnown ? clamp(stability.evidence_confidence_pct as number, 40, 95) / 100 : 0;
  const erosion = deriveLeadTimeErosionPct(decisionWindow) / 100;

  const grossMargin = capturable * margin;
  // Committing perishable volume that is not sold writes off its cost of goods.
  const unsoldCostPerUnit = Number((revenuePerUnit - margin).toFixed(2));
  const unsoldExposure = capturable * unsoldCostPerUnit;

  // ACT_NOW  — commit before the evidence is settled: capture the margin if the demand holds,
  //            pay the premium either way, and carry the write-off if it does not.
  const actNowValue = Math.round(p * grossMargin - cost - (1 - p) * unsoldExposure);
  // WAIT     — commit only once the demand is confirmed, so the write-off risk is avoided,
  //            but only the volume still reachable after lead-time erosion can be recovered.
  const waitValue = Math.round(p * (grossMargin * (1 - erosion) - cost));
  // DO_NOTHING — the CDI-02 counterfactual baseline. No spend, no recovery, no write-off.
  const doNothingValue = 0;

  const actNowUnits = Math.round(capturable);
  const waitUnits = Math.round(capturable * (1 - erosion));

  const values = [actNowValue, waitValue, doNothingValue];
  const best_expected_value_gbp = Math.max(...values);
  const sorted = [...values].sort((a, b) => b - a);
  const separation_gbp = sorted[0] - sorted[1];
  const decisionScale = Math.max(...values.map(v => Math.abs(v)));
  const separation_threshold_gbp = Math.max(
    DDF_MIN_SEPARATION_GBP,
    Math.round((decisionScale * DDF_SEPARATION_FLOOR_PCT_OF_DECISION) / 100)
  );

  const windowUnknown = decisionWindow.is_indeterminate;

  const act_now: DecisionRegretAlternative = {
    action_type: 'ACT_NOW',
    action_name: 'Deploy supplier flex now',
    description:
      'Serve a volume flex notice against the existing supply agreement before the cut-off, expanding executable capacity for this horizon.',
    units_recovered: actNowUnits,
    margin_recovered_gbp: Math.round(grossMargin),
    downside_exposure_gbp: Math.round(cost + unsoldExposure),
    expected_decision_value_gbp: actNowValue,
    expected_regret_gbp: Math.max(0, best_expected_value_gbp - actNowValue),
    residual_gap_units: Math.max(0, exposedUnits - actNowUnits),
    residual_gap_pp: round1(safeDiv(Math.max(0, exposedUnits - actNowUnits), decisionGap.base_demand_units) * 100),
    feasibility_status: 'FEASIBLE',
    what_it_captures: `${actNowUnits.toLocaleString()} of the ${exposedUnits.toLocaleString()} exposed units, worth £${Math.round(grossMargin).toLocaleString()} gross margin.`,
    what_it_risks: `£${cost.toLocaleString()} of flex premium committed regardless, plus £${Math.round(unsoldExposure).toLocaleString()} of stock written off if the demand does not hold.`,
    what_it_forgoes: 'The additional certainty another day of signal evidence would bring.'
  };

  const wait: DecisionRegretAlternative = {
    action_type: 'WAIT',
    action_name: 'Wait for signal confirmation',
    description:
      'Hold the decision for further signal evidence, then act only if the divergence persists — accepting whatever capacity remains reachable by then.',
    units_recovered: waitUnits,
    margin_recovered_gbp: Math.round(grossMargin * (1 - erosion)),
    downside_exposure_gbp: Math.round(grossMargin * erosion),
    expected_decision_value_gbp: waitValue,
    expected_regret_gbp: Math.max(0, best_expected_value_gbp - waitValue),
    residual_gap_units: Math.max(0, exposedUnits - waitUnits),
    residual_gap_pp: round1(safeDiv(Math.max(0, exposedUnits - waitUnits), decisionGap.base_demand_units) * 100),
    feasibility_status: windowUnknown ? 'GATED_BY_READINESS' : 'FEASIBLE',
    gating_reasons: windowUnknown
      ? ['No declared operational deadline, so the cost of delay cannot be quantified.']
      : undefined,
    what_it_captures: `${waitUnits.toLocaleString()} units after ${Math.round(erosion * 100)}% lead-time erosion, worth £${Math.round(grossMargin * (1 - erosion)).toLocaleString()} gross margin — and no stock is written off, because volume is only committed once the demand is confirmed.`,
    what_it_risks: `£${Math.round(grossMargin * erosion).toLocaleString()} of recoverable margin lost to the shrinking window.`,
    what_it_forgoes: 'Capacity that can only be secured before the supplier cut-off.'
  };

  const do_nothing: DecisionRegretAlternative = {
    action_type: 'DO_NOTHING',
    action_name: 'Hold existing commitments',
    description:
      'Keep the current supplier commitment unchanged and absorb the exposure. The counterfactual baseline every alternative is measured against.',
    units_recovered: 0,
    margin_recovered_gbp: 0,
    downside_exposure_gbp: decisionGap.revenue_at_risk_gbp,
    expected_decision_value_gbp: doNothingValue,
    expected_regret_gbp: Math.max(0, best_expected_value_gbp - doNothingValue),
    residual_gap_units: exposedUnits,
    residual_gap_pp: decisionGap.exposed_demand_pp,
    feasibility_status: 'FEASIBLE',
    what_it_captures: 'Nothing. No capacity is added.',
    what_it_risks: `£${decisionGap.revenue_at_risk_gbp.toLocaleString()} of revenue stays exposed to shortfall.`,
    what_it_forgoes: `£${Math.round(grossMargin).toLocaleString()} of gross margin that was reachable within the window.`
  };

  // A winner is named only where the alternatives separate materially and the inputs support it.
  let recommended_action: DemandDecisionRegret['recommended_action'] = 'CHOICE_REQUIRED';
  let separation_significant = false;

  if (stabilityKnown && exposedUnits > 0 && separation_gbp >= separation_threshold_gbp) {
    separation_significant = true;
    if (best_expected_value_gbp === actNowValue) recommended_action = 'ACT_NOW';
    else if (best_expected_value_gbp === waitValue) recommended_action = 'WAIT';
    else recommended_action = 'DO_NOTHING';

    // A gated option is never named as the recommendation (AC-DDF-23).
    if (recommended_action === 'WAIT' && wait.feasibility_status !== 'FEASIBLE') {
      recommended_action = 'CHOICE_REQUIRED';
      separation_significant = false;
    }
  }

  return {
    alternatives: { act_now, wait, do_nothing },
    recommended_action,
    separation_significant,
    best_expected_value_gbp,
    separation_gbp,
    separation_threshold_gbp,
    shared_inputs_summary: {
      exposed_demand_units: exposedUnits,
      emerging_demand_units: decisionGap.emerging_demand_units,
      executable_units: decisionGap.executable_demand_units,
      capturable_units: capturable,
      revenue_per_unit_gbp: revenuePerUnit,
      gross_margin_per_unit_gbp: margin,
      unsold_cost_per_unit_gbp: unsoldCostPerUnit,
      intervention_cost_gbp: cost,
      demand_materialises_probability_pct: Math.round(p * 100),
      lead_time_erosion_pct: Math.round(erosion * 100)
    },
    valuation_basis: 'MODELLED_EXPECTED_VALUE',
    regret_definition:
      'Acting now captures margin if the demand holds, pays the flex premium either way, and writes off ' +
      'stock if it does not. Waiting avoids that write-off by committing only once demand is confirmed, ' +
      'but recovers less as the window erodes. Doing nothing spends and recovers nothing. ' +
      'Regret is the shortfall against the best of the three, so the best option always shows £0. ' +
      'These are modelled expected values, not calibrated probabilities and not a prediction interval.'
  };
}

// ── Intervention Recommendation & Simulation ────────────────────────────────

/**
 * Capacity the SLA flex lever adds across the horizon, expressed on the surface's own demand
 * base. WP10-C supplies `DDF_SLA_FLEX_UNITS_PER_WEEK` against its un-promoted weekly demand,
 * so the lever is carried across as the same PROPORTIONAL uplift rather than as a raw count
 * from a different population.
 */
export function deriveFlexCapacityUnits(
  derivedImpacts: DecisionDerivedImpacts,
  scenarioParams: DecisionScenarioParameters,
  baseDemandUnits: number
): number {
  const promoFactor = 1 + scenarioParams.promotion_lift / 100;
  const unpromotedWeeklyDemand = promoFactor > 0
    ? derivedImpacts.weekly_demand_units / promoFactor
    : derivedImpacts.weekly_demand_units;
  const flexUplift = safeDiv(DDF_SLA_FLEX_UNITS_PER_WEEK, unpromotedWeeklyDemand);
  return Math.round(baseDemandUnits * flexUplift);
}

export function evaluateInterventionRecommendation(
  decisionGap: DemandDecisionGap,
  scenarioParams: DecisionScenarioParameters,
  derivedImpacts: DecisionDerivedImpacts,
  horizonDays: number,
  decisionStateVersion: number
): DemandInterventionScenario {
  const exposedUnits = decisionGap.exposed_demand_units;
  const flexUnits = deriveFlexCapacityUnits(derivedImpacts, scenarioParams, decisionGap.base_demand_units);
  const recovered = Math.max(0, Math.min(exposedUnits, flexUnits));
  const residualUnits = Math.max(0, exposedUnits - recovered);
  const residualPp = round1(safeDiv(residualUnits, decisionGap.base_demand_units) * 100);
  const econ = decisionGap.unit_economics;
  // Cost scales with the volume actually secured outside the standard order cycle.
  const interventionCost = Math.round(
    recovered * econ.revenue_per_unit_gbp * (DDF_FLEX_PREMIUM_RATE_PCT / 100)
  );

  if (exposedUnits <= 0) {
    return {
      intervention_id: 'NO_INTERVENTION_REQUIRED',
      intervention_name: 'No capacity intervention required',
      lever_type: 'SUPPLIER_CAPACITY_FLEX',
      description: 'Executable capacity already covers the emerging demand frontier across this horizon.',
      rationale: 'There is no exposed demand to recover, so committing flex cost would reduce expected value.',
      parameter_modifications: {},
      expected_units_recovered: 0,
      expected_revenue_recovered_gbp: 0,
      expected_margin_recovered_gbp: 0,
      residual_gap_units: 0,
      residual_gap_pp: 0,
      risk_state_after: 'LOW',
      intervention_cost_gbp: 0,
      evidence_basis: [
        `Executable capacity of ${decisionGap.executable_demand_units.toLocaleString()} units covers the ${decisionGap.emerging_demand_units.toLocaleString()} units now expected, read from the current scenario.`
      ],
      is_actionable: false,
      gated_reason: 'No Decision Gap is open under the current scenario.'
    };
  }

  return {
    intervention_id: 'SLA_FLEX_RULE_4',
    intervention_name: 'Serve FreshDirect volume flex notice (Rule 4)',
    lever_type: 'SUPPLIER_CAPACITY_FLEX',
    description: `Serve the contractual volume flex notice to add ${flexUnits.toLocaleString()} units of executable capacity across the ${horizonDays}-day horizon.`,
    rationale: `Supplier allocation is the largest ranked contributor to the ${decisionGap.exposed_demand_pp}pp gap. The flex clause is the only lever that changes executable capacity inside the current lead time.`,
    parameter_modifications: { additional_capacity_units: flexUnits },
    expected_units_recovered: recovered,
    expected_revenue_recovered_gbp: Math.round(recovered * econ.revenue_per_unit_gbp),
    expected_margin_recovered_gbp: Math.round(recovered * econ.gross_margin_per_unit_gbp),
    residual_gap_units: residualUnits,
    residual_gap_pp: residualPp,
    risk_state_after: residualPp <= 2 ? 'LOW' : residualPp <= 8 ? 'MEDIUM' : 'HIGH',
    intervention_cost_gbp: interventionCost,
    evidence_basis: [
      'FreshDirect UK Supply Agreement, Clause 4.2 volume flex notice — modelled demo assumption, not a countersigned contract.',
      `Supplier capacity of ${Math.round(derivedImpacts.supplier_capacity_units).toLocaleString()} units per week, read from the current scenario and unchanged by this briefing.`,
      `Flex volume of ${DDF_SLA_FLEX_UNITS_PER_WEEK.toLocaleString()} units per week, carried across as the same proportional uplift used elsewhere in the scenario.`,
      `Flex premium of ${DDF_FLEX_PREMIUM_RATE_PCT}% of unit revenue is a declared modelled assumption.`
    ],
    is_actionable: true
  };
}

// ── Top-Level Unified Evaluator ─────────────────────────────────────────────

function buildAssumptionInventory(
  scenarioParams: DecisionScenarioParameters,
  derivedImpacts: DecisionDerivedImpacts,
  window: DemandDecisionWindow,
  stability: ForecastStabilityAssessment,
  base: DemandBase,
  econ: DemandUnitEconomics,
  intervention: DemandInterventionScenario
): DemandAssumptionRecord[] {
  const records: DemandAssumptionRecord[] = [
    {
      key: 'demand_base',
      label: 'Demand base (observed run rate)',
      value: `${Math.round(base.run_rate_units_per_day).toLocaleString()} units/day × ${base.horizon_days} days = ${Math.round(base.base_demand_units).toLocaleString()} units`,
      provenance_class: 'SYNTHETIC_OBSERVED',
      source: `Mean of ${base.observed_days} observed day${base.observed_days === 1 ? '' : 's'} in the synthetic history; days with no record are excluded rather than counted as zero`
    },
    {
      key: 'capacity_index',
      label: 'Executable capacity index',
      value: `×${base.capacity_index.toFixed(3)} of the demand base`,
      provenance_class: 'DERIVED_FROM_DECISION_STATE',
      source: `WP10-C supplier_capacity_units ${Math.round(derivedImpacts.supplier_capacity_units).toLocaleString()}/week ÷ un-promoted weekly demand (read-only)`
    },
    {
      key: 'supplier_capacity_cap',
      label: 'Supplier allocation cap',
      value: `+${scenarioParams.supplier_capacity_cap}%`,
      provenance_class: 'DECLARED_OPERATIONAL_CONSTRAINT',
      source: 'Shared Decision State scenario parameter'
    },
    {
      key: 'revenue_per_unit',
      label: 'Revenue per unit',
      value: `£${econ.revenue_per_unit_gbp.toFixed(2)}`,
      provenance_class: econ.revenue_per_unit_basis === 'DERIVED_FROM_PROJECTION'
        ? 'SYNTHETIC_OBSERVED'
        : 'MODELLED_DEMO_ASSUMPTION',
      source: econ.revenue_per_unit_basis === 'DERIVED_FROM_PROJECTION'
        ? 'Projected revenue ÷ projected units over the same horizon'
        : 'DDF-01 declared fallback'
    },
    {
      key: 'margin_rate',
      label: 'Gross margin rate',
      value: `${econ.margin_rate_pct}% (£${econ.gross_margin_per_unit_gbp.toFixed(2)}/unit)`,
      provenance_class: 'MODELLED_DEMO_ASSUMPTION',
      source: 'DDF-01 declared margin rate — the estate holds no cost data'
    },
    {
      key: 'intervention_cost',
      label: 'Flex premium',
      value: `${DDF_FLEX_PREMIUM_RATE_PCT}% of unit revenue (£${intervention.intervention_cost_gbp.toLocaleString()} at this volume)`,
      provenance_class: 'MODELLED_DEMO_ASSUMPTION',
      source: 'DDF-01 declared unit economics'
    },
    {
      key: 'flex_volume',
      label: 'SLA flex volume',
      value: `${DDF_SLA_FLEX_UNITS_PER_WEEK.toLocaleString()} units/week, carried across as a proportional uplift`,
      provenance_class: 'MODELLED_DEMO_ASSUMPTION',
      source: 'WP10-C SLA_FLEX_RULE_4 intervention model'
    },
    {
      key: 'event_boost',
      label: 'Scenario event effect',
      value: `${DDF_EVENT_DISPLAY_NAME[scenarioParams.event_boost] ?? scenarioParams.event_boost} (+${DDF_EVENT_EFFECT_PCT[scenarioParams.event_boost] ?? 0}% in the projection)`,
      provenance_class: 'MODELLED_DEMO_ASSUMPTION',
      source: 'Projection engine declared event table'
    }
  ];

  if (window.is_indeterminate) {
    records.push({
      key: 'decision_window',
      label: 'Decision Window',
      value: 'Not established — no declared constraint',
      provenance_class: 'MODELLED_DEMO_ASSUMPTION',
      source: 'ADR-042 fail-closed predicate'
    });
  } else {
    records.push(
      {
        key: 'scenario_clock',
        label: 'Scenario time',
        value: window.scenario_now_display || '—',
        provenance_class: 'MODELLED_DEMO_ASSUMPTION',
        source: 'Derived from the first projected day of the scenario'
      },
      {
        key: 'supplier_cut_off',
        label: 'Supplier cut-off',
        value: `${window.deadline_display} — ${window.declared_constraint_name}`,
        provenance_class: window.provenance_basis === 'DECLARED_OPERATIONAL_CONSTRAINT'
          ? 'DECLARED_OPERATIONAL_CONSTRAINT'
          : 'MODELLED_DEMO_ASSUMPTION',
        source: window.declared_by || 'Modelled supply agreement'
      }
    );
  }

  records.push({
    key: 'stability_signals',
    label: 'Stability signal evidence',
    value: stability.status === 'VALID'
      ? `${stability.contributing_signal_refs.length} observed signal${stability.contributing_signal_refs.length === 1 ? '' : 's'} contributing`
      : 'Not established — insufficient signal evidence',
    provenance_class: 'SYNTHETIC_OBSERVED',
    source: 'cognix-world Enterprise Signals (synthetic_demo = true)'
  });

  return records;
}

export function evaluateDemandDecisionFrontier(
  params: EvaluateDemandFrontierParams
): DemandDecisionFrontierEvaluation {
  const tenantId = params.tenantId || 'tenant_uk_retail_01';
  const sessionId = params.sessionId || 'sess_001';
  const scenarioParams = params.scenarioParams;
  const derivedImpacts = params.derivedImpacts;
  const decisionStateVersion = Number(params.intentFusionOutlook?.decision_state_version ?? 0);

  const base = deriveDemandBase(
    scenarioParams, derivedImpacts, params.historySales, params.forecastSales.length || undefined
  );
  const unitEconomics = deriveUnitEconomics(params.revenuePerUnitGbp);

  // 1. Forecast Stability (P0-A) — evidence-led, INDETERMINATE where evidence is absent.
  const stability = evaluateForecastStability(
    scenarioParams,
    params.enterpriseSignals,
    params.intentFusionOutlook
  );

  // 2. Demand Frontier (P0-B) — stability moves the emerging frontier.
  const demandFrontier = evaluateDemandFrontier(
    params.historySales,
    params.forecastSales,
    scenarioParams,
    derivedImpacts,
    params.intentFusionOutlook,
    stability
  );

  // 3. Decision Gap (P0-B)
  const decisionGap = evaluateDecisionGap(scenarioParams, derivedImpacts, demandFrontier, unitEconomics);

  // 4. Decision Window — measured from the scenario clock.
  const scenarioNowIso = params.scenarioNowIso ?? deriveScenarioNowIso(params.forecastSales);
  const decisionWindow = evaluateDecisionWindow(params.declaredDeadline, scenarioNowIso);

  // 5. Intervention recommendation — computed from the REAL gap, not a stub.
  const recommendedIntervention = evaluateInterventionRecommendation(
    decisionGap,
    scenarioParams,
    derivedImpacts,
    base.horizon_days,
    decisionStateVersion
  );

  // 6. Decision Regret (P0-C) — shares the gap, the stability and the window.
  const decisionRegret = evaluateDecisionRegret(
    decisionGap,
    scenarioParams,
    stability,
    decisionWindow,
    recommendedIntervention.expected_units_recovered,
    recommendedIntervention.intervention_cost_gbp
  );

  // 7. Simulation — a modelled recomputation. Nothing is executed and Decision State is not written.
  let simulated_intervention: DemandDecisionFrontierEvaluation['simulated_intervention'] = undefined;

  if (params.activeInterventionId && recommendedIntervention.is_actionable) {
    // Simulation adjusts a LOCAL copy of the derived impacts, exactly as WP10-C would when the
    // intervention is selected. Shared Decision State itself is never written.
    const simulatedImpacts: DecisionDerivedImpacts = {
      ...derivedImpacts,
      supplier_capacity_units: derivedImpacts.supplier_capacity_units + DDF_SLA_FLEX_UNITS_PER_WEEK
    };

    const recomputedFrontier = evaluateDemandFrontier(
      params.historySales,
      params.forecastSales,
      scenarioParams,
      simulatedImpacts,
      params.intentFusionOutlook,
      stability
    );
    const recomputedGap = evaluateDecisionGap(
      scenarioParams, simulatedImpacts, recomputedFrontier, unitEconomics
    );
    const recomputedIntervention = evaluateInterventionRecommendation(
      recomputedGap,
      scenarioParams,
      simulatedImpacts,
      base.horizon_days,
      decisionStateVersion
    );
    const recomputedRegret = evaluateDecisionRegret(
      recomputedGap,
      scenarioParams,
      stability,
      decisionWindow,
      recomputedIntervention.expected_units_recovered,
      recomputedIntervention.intervention_cost_gbp
    );

    // Carry the simulated ceiling onto the trajectory so the chart shows the modelled outcome.
    recomputedFrontier.trajectory.forEach(point => {
      point.simulated_demand_frontier = point.executable_demand_frontier;
    });

    const gap_closed_units = Math.max(0, decisionGap.exposed_demand_units - recomputedGap.exposed_demand_units);
    const gap_closed_pp = round1(Math.max(0, decisionGap.exposed_demand_pp - recomputedGap.exposed_demand_pp));
    const margin_recovered_gbp = Math.round(gap_closed_units * unitEconomics.gross_margin_per_unit_gbp);

    simulated_intervention = {
      ...recommendedIntervention,
      active: true,
      is_modelled_only: true,
      recomputed_gap: recomputedGap,
      recomputed_regret: recomputedRegret,
      recomputed_frontier: recomputedFrontier,
      gap_closed_units,
      gap_closed_pp,
      residual_gap_units: recomputedGap.exposed_demand_units,
      residual_gap_pp: recomputedGap.exposed_demand_pp,
      margin_recovered_gbp,
      outcome_statement:
        recomputedGap.exposed_demand_units === 0
          ? `Modelled outcome: the gap closes. ${gap_closed_units.toLocaleString()} units become executable, recovering £${margin_recovered_gbp.toLocaleString()} of gross margin. Nothing has been ordered.`
          : `Modelled outcome: the gap narrows by ${gap_closed_pp}pp (${gap_closed_units.toLocaleString()} units, £${margin_recovered_gbp.toLocaleString()} gross margin). ${recomputedGap.exposed_demand_units.toLocaleString()} units stay exposed. Nothing has been ordered.`
    };
  }

  return {
    evaluation_id: deterministicId('ddf', [
      tenantId, sessionId,
      scenarioParams.promotion_lift, scenarioParams.supplier_capacity_cap,
      scenarioParams.cannibalisation_factor, scenarioParams.event_boost,
      base.horizon_days, params.activeInterventionId || 'none'
    ]),
    tenant_id: tenantId,
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    scenario_parameters: scenarioParams,
    forecast_stability: stability,
    demand_frontier: demandFrontier,
    decision_gap: decisionGap,
    decision_window: decisionWindow,
    decision_regret: decisionRegret,
    recommended_intervention: recommendedIntervention,
    simulated_intervention,
    intent_fusion_outlook: params.intentFusionOutlook,
    assumptions: buildAssumptionInventory(
      scenarioParams, derivedImpacts, decisionWindow, stability, base, unitEconomics, recommendedIntervention
    ),
    provenance: {
      engine: 'cognix_demand_decision_frontier_engine_v2',
      stability_rule: 'STABILITY-SIG-DIVERGENCE-V2',
      gap_rule: 'GAP-SHARED-BASE-V2',
      regret_rule: 'REGRET-RELATIVE-EXPECTED-VALUE-V2',
      window_rule: 'WINDOW-SCENARIO-CLOCK-V2',
      demand_base_units: Math.round(base.base_demand_units),
      capacity_index: Number(base.capacity_index.toFixed(4)),
      shared_decision_state_version: decisionStateVersion
    },
    synthetic_demo: true
  };
}
