/**
 * Evaluates the authoritative domain decisions for any Canonical Scenario
 * using the real domain engines:
 * - `projectDemand` (lib/demand-forecast)
 * - `evaluateDemandDecisionFrontier` (lib/demand-decision-frontier/demand-frontier-engine)
 * - `evaluateInterventionRecommendation` (lib/demand-decision-frontier/demand-frontier-engine)
 * - `scenarioElasticityCurve` (lib/campaign-archetypes)
 */

import {
  resolveScenario,
  CanonicalScenario,
  withScenarioInScope,
  scenarioOpeningDecisionParameters,
  calculateDerivedImpacts
} from '../packages/contracts/src/index';
import { projectDemand, isDemandRefusal } from './demand-forecast';
import {
  evaluateDemandDecisionFrontier,
  evaluateInterventionRecommendation
} from './demand-decision-frontier/demand-frontier-engine';
import { scenarioElasticityCurve } from './campaign-archetypes';
import { generateSyntheticSignalSnapshot } from '../services/world/src/enterprise-signal-generator';

export interface AuthoritativeScenarioDecision {
  scenarioId: string;
  baseDemand: number;
  expectedDemand: number;
  servableDemand: number;
  exposedGap: number;
  gapPct: string;
  revenueExposureGbp: number;
  marginExposureGbp: number;
  recommendedDepth: number;
  committedDepth: number;
  recoveredUnits: number;
  residualGapUnits: number;
  windowRemainingHours: number;
  windowState: string;
  stabilityScore: number;
  basis: string;
}

export async function evaluateAuthoritativeScenarioDecision(
  scenarioOrId: CanonicalScenario | string
): Promise<AuthoritativeScenarioDecision> {
  const scenario = typeof scenarioOrId === 'string' ? resolveScenario(scenarioOrId) : scenarioOrId;
  const params = withScenarioInScope(scenario, () => scenarioOpeningDecisionParameters(scenario));

  const projection = await projectDemand({
    scenario,
    metric: 'units',
    horizon: params.forecast_horizon_days as never,
    modelId: 'HOLT_WINTERS_ADDITIVE' as never,
    promoLift: params.promotion_lift,
    cannibalization: params.cannibalisation_factor,
    eventBoost: params.event_boost,
    executedAsOf: '2026-01-01T00:00:00.000Z',
    backtest: false,
    historyDisplayDays: 21
  });

  if (isDemandRefusal(projection)) {
    throw new Error(`Demand projection refused for scenario ${scenario.identity.scenario_id}`);
  }

  const derived = withScenarioInScope(scenario, () => calculateDerivedImpacts(params, []));
  const signals = generateSyntheticSignalSnapshot(scenario, 'tenant_uk_retail_01');

  const frontierEvaluation = withScenarioInScope(scenario, () =>
    evaluateDemandDecisionFrontier({
      tenantId: 'tenant_uk_retail_01',
      sessionId: `sess_authoritative_${scenario.identity.scenario_id}`,
      scenarioParams: params,
      derivedImpacts: derived,
      intentFusionOutlook: null as never,
      enterpriseSignals: signals,
      historySales: projection.history,
      forecastSales: projection.forecast.map(f => ({ date: f.date, value: f.value })),
      revenuePerUnitGbp: null,
      metric: 'units'
    })
  );

  const intervention = withScenarioInScope(scenario, () =>
    evaluateInterventionRecommendation(
      frontierEvaluation.decision_gap,
      params,
      derived,
      params.forecast_horizon_days,
      1
    )
  );

  const curve = scenarioElasticityCurve(scenario);
  const rec = curve.find(p => p.is_cognix_recommended) ?? curve[0];
  const committedDepth = scenario.economics?.promotion_depth_pct ?? 0;
  const recommendedDepth = rec ? rec.discount_pct : committedDepth;

  const baseDemand = frontierEvaluation.demand_frontier.base_demand_units;
  const expectedDemand = frontierEvaluation.demand_frontier.emerging_demand_units;
  const servableDemand = frontierEvaluation.demand_frontier.executable_demand_units;
  const exposedGap = frontierEvaluation.decision_gap.exposed_demand_units;
  const gapPct = frontierEvaluation.decision_gap.exposed_demand_pp.toFixed(1);

  return {
    scenarioId: scenario.identity.scenario_id,
    baseDemand,
    expectedDemand,
    servableDemand,
    exposedGap,
    gapPct,
    revenueExposureGbp: frontierEvaluation.decision_gap.revenue_at_risk_gbp,
    marginExposureGbp: frontierEvaluation.decision_gap.margin_at_risk_gbp,
    recommendedDepth,
    committedDepth,
    recoveredUnits: intervention.expected_units_recovered,
    residualGapUnits: intervention.residual_gap_units,
    windowRemainingHours: frontierEvaluation.decision_window.remaining_hours ?? 0,
    windowState: frontierEvaluation.decision_window.window_state,
    stabilityScore: frontierEvaluation.forecast_stability.stability_score ?? 70,
    basis: 'evaluateDemandDecisionFrontier'
  };
}
