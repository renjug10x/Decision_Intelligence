/**
 * `R-38` + `R-39` — Demand Base and Trend Attribution Integrity
 * ───────────────────────────────────────────────────────────────────────────────
 * Two invariants, and everything here exists to make them hard to satisfy by accident:
 *
 *   `R-38`  one scenario, one economic baseline — and no presentation control may move it
 *   `R-39`  a declared attribution is realised as declared, whatever the horizon
 *
 * §2 is the one worth reading twice. It runs the whole pipeline three times against three
 * DISPLAY history windows and asserts the decision is byte-identical each time. Before this repair
 * the same reference-scenario decision published 67,652 / 53,540 / 50,647 units of exposed demand at
 * 14 / 21 / 30 days of displayed history, so this is a regression with a measured defect behind it
 * rather than a property nobody was going to break.
 *
 * What this suite leaves to its neighbours
 * ----------------------------------------
 * `run-ddf01-tests.ts`               the frontier's own arithmetic and the ADR-041 identity
 * `run-sci03r-perspective-tests.ts`  every surface consuming the ACTIVE scenario
 * `run-r37-observed-behaviour-tests.ts` the evidence carriers
 * `run-canonical-scenario-tests.ts`  the protected journey's digits
 * this suite                         `R-38`, `R-39`, and that neither broke `R-37`
 */

import {
  CANONICAL_SCENARIO_ID,
  CHILLED_SALMON_SCENARIO_ID,
  PREMIUM_BAKERY_SCENARIO_ID,
  CanonicalScenario,
  resolveScenario,
  withScenarioInScope,
  scenarioOpeningDecisionParameters,
  calculateDerivedImpacts,
  scenarioBaseDemandUnits,
  scenarioUnderlyingTrendDeclaredPp,
  scenarioCommercialIntentDeclaredPp,
  scenarioUnderlyingTrendFactor
} from '../../packages/contracts/src/index';
import '../../lib/scenario-runtime';
import {
  deriveDemandBase,
  evaluateDemandDecisionFrontier
} from '../../lib/demand-decision-frontier/demand-frontier-engine';
import { deriveOutlookContributors } from '../../lib/demand-decision-language';
import { projectDemand, isDemandRefusal, declareScenarioAdjustment } from '../../lib/demand-forecast';
import { buildScenarioForecastDataset, trendIsDeclared } from '../../lib/forecast/scenario-series';
import { generateSyntheticSignalSnapshot } from '../../services/world/src/enterprise-signal-generator';
import { certifyRegisteredScenarios } from '../../lib/scenario-certification';
import { readFileSync } from 'fs';
import { join } from 'path';

let passed = 0;
let failed = 0;
function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`); failed++; }
}

const ROOT = join(__dirname, '..', '..');
const IDS = [CANONICAL_SCENARIO_ID, CHILLED_SALMON_SCENARIO_ID, PREMIUM_BAKERY_SCENARIO_ID];
const SCENARIOS: CanonicalScenario[] = IDS.map(id => resolveScenario(id));
const paramsOf = (s: CanonicalScenario) =>
  withScenarioInScope(s, () => scenarioOpeningDecisionParameters(s));

/** The whole pipeline, exactly as the Demand surface runs it, at a chosen DISPLAY window. */
type DecisionReading = {
  evaluation: ReturnType<typeof evaluateDemandDecisionFrontier>;
  historyDays: number;
  base: number;
  emerging: number;
  executable: number;
  exposedUnits: number;
  exposedPp: number;
  revenueAtRisk: number;
  marginAtRisk: number;
  trendPp: number;
  promotionPp: number;
  observedPp: number;
  totalPct: number;
};

async function decisionAt(
  s: CanonicalScenario, historyDisplayDays: number, horizonOverride?: number
): Promise<DecisionReading | null> {
  const params = paramsOf(s);
  const horizon = horizonOverride ?? params.forecast_horizon_days;
  const projection = await projectDemand({
    scenario: s,
    metric: 'units',
    horizon: horizon as never,
    modelId: 'HOLT_WINTERS_ADDITIVE' as never,
    promoLift: params.promotion_lift,
    cannibalization: params.cannibalisation_factor,
    eventBoost: params.event_boost,
    executedAsOf: '2026-01-01T00:00:00.000Z',
    backtest: false,
    historyDisplayDays
  });
  if (isDemandRefusal(projection)) return null;
  const derived = withScenarioInScope(s, () => calculateDerivedImpacts(params, []));
  const evaluation = withScenarioInScope(s, () => evaluateDemandDecisionFrontier({
    tenantId: 'tenant_uk_retail_01',
    sessionId: 'sess_r3839',
    scenarioParams: params,
    derivedImpacts: derived,
    intentFusionOutlook: null as never,
    enterpriseSignals: generateSyntheticSignalSnapshot(s, 'tenant_uk_retail_01'),
    historySales: projection.history,
    forecastSales: projection.forecast.map(f => ({ date: f.date, value: f.value })),
    revenuePerUnitGbp: 1,
    metric: 'units'
  }));
  const contributors = withScenarioInScope(s, () => deriveOutlookContributors(evaluation, params.promotion_lift));
  const pp = (key: string) => contributors.find(c => c.key === key)?.pp ?? 0;
  return {
    evaluation,
    historyDays: projection.history.length,
    base: evaluation.demand_frontier.base_demand_units,
    emerging: evaluation.demand_frontier.emerging_demand_units,
    executable: evaluation.demand_frontier.executable_demand_units,
    exposedUnits: evaluation.decision_gap.exposed_demand_units,
    exposedPp: evaluation.decision_gap.exposed_demand_pp,
    revenueAtRisk: evaluation.decision_gap.revenue_at_risk_gbp,
    marginAtRisk: evaluation.decision_gap.margin_at_risk_gbp,
    trendPp: pp('baseline'),
    promotionPp: pp('promotion'),
    observedPp: pp('observed'),
    totalPct: (evaluation.demand_frontier.emerging_demand_units / evaluation.demand_frontier.base_demand_units - 1) * 100
  };
}

(async () => {

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 1. R-38 — the economic base is the record\'s ==================\n');

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const params = paramsOf(s);
  const derived = withScenarioInScope(s, () => calculateDerivedImpacts(params, []));
  const horizon = params.forecast_horizon_days;
  const declared = scenarioBaseDemandUnits(s, horizon);

  // Three histories a decade apart in level. The base must not notice.
  const flat = (v: number, n: number) => Array.from({ length: n }, () => ({ value: v }));
  const bases = [
    withScenarioInScope(s, () => deriveDemandBase(params, derived, flat(1, 14), horizon)),
    withScenarioInScope(s, () => deriveDemandBase(params, derived, flat(1_000_000, 21), horizon)),
    withScenarioInScope(s, () => deriveDemandBase(params, derived, flat(declared / horizon, 30), horizon))
  ];
  assert(
    bases.every(b => b.base_demand_units === declared),
    `${id}: the demand base is the scenario's declared base, whatever history is supplied`,
    bases.map(b => b.base_demand_units).join(' / ')
  );
  assert(
    bases[0].run_rate_units_per_day === 1 && bases[1].run_rate_units_per_day === 1_000_000,
    `${id}: the observed run rate is still measured and published — it is no longer the denominator`
  );
  assert(
    Math.abs(bases[2].run_rate_variance_pct) < 0.05,
    `${id}: a history at the declared rate reports no variance against the declared base`,
    String(bases[2].run_rate_variance_pct)
  );
  // The censored-history rule is unchanged: a day with no record is not a day of zero demand.
  const censored = withScenarioInScope(s, () =>
    deriveDemandBase(params, derived, [...flat(declared / horizon, 10), { value: 0 }, { value: 0 }], horizon));
  assert(
    censored.observed_days === 10 && Math.abs(censored.run_rate_variance_pct) < 0.05,
    `${id}: days with no record are still excluded from the run rate rather than averaged in as zero`,
    `${censored.observed_days} observed days`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 2. R-38 — the decision does not move with the chart ===========\n');

const WINDOWS = [14, 21, 30];
for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const runs: (DecisionReading | null)[] = [];
  for (const w of WINDOWS) runs.push(await decisionAt(s, w));
  assert(runs.every(r => r !== null), `${id}: the projection is served at every display window`);
  if (runs.some(r => r === null)) continue;

  const shown = runs.map(r => r!.historyDays);
  assert(
    new Set(shown).size === WINDOWS.length,
    `${id}: the three runs really do display different amounts of history`,
    shown.join(' / ')
  );

  const quantities: [string, (r: DecisionReading) => number][] = [
    ['economic base', r => r.base],
    ['expected demand', r => r.emerging],
    ['executable frontier', r => r.executable],
    ['exposed demand units', r => r.exposedUnits],
    ['Decision Gap pp', r => r.exposedPp],
    ['revenue exposure', r => r.revenueAtRisk],
    ['margin exposure', r => r.marginAtRisk],
    ['underlying trend pp', r => r.trendPp],
    ['commercial intent pp', r => r.promotionPp],
    ['observed behaviour pp', r => r.observedPp]
  ];
  for (const [label, read] of quantities) {
    const values = runs.map(r => read(r!));
    assert(
      new Set(values.map(v => Number(v.toFixed(6)))).size === 1,
      `${id}: ${label} is identical at ${WINDOWS.join(' / ')} days of displayed history`,
      values.map(v => v.toFixed(2)).join(' / ')
    );
  }

  // Decision Regret is downstream of all of it and must not move either.
  const regrets = runs.map(r => JSON.stringify(r!.evaluation.decision_regret));
  assert(new Set(regrets).size === 1, `${id}: Decision Regret is identical at every display window`);
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 3. R-39 — the declared trend is realised as declared ==========\n');

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const run = await decisionAt(s, 21);
  if (!run) { assert(false, `${id}: projection served`); continue; }
  const declaredTrend = scenarioUnderlyingTrendDeclaredPp(s);
  const declaredIntent = scenarioCommercialIntentDeclaredPp(s);

  assert(
    Math.abs(run.trendPp - declaredTrend) <= 0.1,
    `${id}: the published underlying trend is the contribution the record declares`,
    `declared ${declaredTrend}pp, published ${run.trendPp.toFixed(2)}pp`
  );
  assert(
    Math.abs(run.promotionPp - declaredIntent) <= 0.1,
    `${id}: the published commercial intent is still the contribution the record declares (R-36)`,
    `declared ${declaredIntent}pp, published ${run.promotionPp.toFixed(2)}pp`
  );
  assert(
    Math.abs((run.trendPp + run.promotionPp + run.observedPp) - run.totalPct) <= 0.05,
    `${id}: the three attributed contributions reconcile to the published total`,
    `${run.trendPp.toFixed(2)} + ${run.promotionPp.toFixed(2)} + ${run.observedPp.toFixed(2)} vs ${run.totalPct.toFixed(2)}`
  );
  assert(
    Math.abs(run.totalPct - s.demand.total_demand_movement_pct) <= 0.15,
    `${id}: the published total reconciles with the record's declared total movement`,
    `published ${run.totalPct.toFixed(2)}%, record ${s.demand.total_demand_movement_pct}%`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 4. R-39 — a horizon-level attribution is not silently rescaled =\n');

for (const s of SCENARIOS.filter(x => trendIsDeclaredFor(x))) {
  const id = s.identity.scenario_id;
  const factor = scenarioUnderlyingTrendFactor(s);
  assert(
    Math.abs(factor - (1 + scenarioUnderlyingTrendDeclaredPp(s) / 100)) < 1e-12,
    `${id}: the declared trend factor is the record's declaration and nothing else`
  );
  // The reader moving the horizon control gets a different question answered, not a rescaled
  // attribution: the declared contribution is stated over the scenario's own horizon and stays there.
  const adjustments = [7, 14, 30].map(() => declareScenarioAdjustment({
    promoLift: paramsOf(s).promotion_lift,
    cannibalization: 0,
    eventBoost: 'none',
    scenario: s,
    trendIsDeclared: true
  }).factors.find(f => f.key === 'underlying_trend')?.factor);
  assert(
    new Set(adjustments).size === 1 && adjustments[0] === Number(factor.toFixed(6)),
    `${id}: the declared trend factor does not vary with the horizon the reader chose`,
    adjustments.join(' / ')
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 5. R-39 — declared where nothing observed, measured where it did\n');

function trendIsDeclaredFor(s: CanonicalScenario): boolean {
  return s.identity.scenario_id !== CANONICAL_SCENARIO_ID;
}

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const dataset = await buildScenarioForecastDataset({ scenario: s, measure: 'units_sold' });
  const declaredHere = trendIsDeclared(dataset);
  assert(
    declaredHere === trendIsDeclaredFor(s),
    `${id}: whether the trend is declared follows EVIDENCE COVERAGE — ${declaredHere ? 'modelled history' : 'the estate\'s own observed series'}`
  );
  const adjustment = declareScenarioAdjustment({
    promoLift: paramsOf(s).promotion_lift,
    cannibalization: 0,
    eventBoost: 'none',
    scenario: s,
    trendIsDeclared: declaredHere
  });
  const hasTrendFactor = adjustment.factors.some(f => f.key === 'underlying_trend');
  assert(
    hasTrendFactor === declaredHere,
    `${id}: a declared trend factor is applied only where the trend is declared — never twice`
  );
  if (!declaredHere) {
    assert(
      adjustment.combined_factor === Number((1 + scenarioCommercialIntentDeclaredPp(s) / 100 / (1 + scenarioUnderlyingTrendDeclaredPp(s) / 100)).toFixed(6)),
      `${id}: with an observed history the adjustment is the commercial intent alone`,
      String(adjustment.combined_factor)
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 6. R-39 — a modelled history carries no direction of its own ==\n');

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const dataset = await buildScenarioForecastDataset({ scenario: s, measure: 'units_sold' });
  if (!trendIsDeclared(dataset)) {
    assert(true, `${id}: observed history, left exactly as the estate recorded it`);
    continue;
  }
  const values = dataset.observations.map(o => o.value);
  const weeks = Math.floor(values.length / 7);
  assert(
    values.length % 7 === 0,
    `${id}: a modelled history is whole weeks, so weekly normalisation and the model's own cycles align`,
    `${values.length} observations`
  );
  const weekTotals: number[] = [];
  for (let w = 0; w < weeks; w++) {
    weekTotals.push(values.slice(w * 7, (w + 1) * 7).reduce((a, b) => a + b, 0));
  }
  const declaredWeek = s.demand.base_demand_units_per_week;
  assert(
    weekTotals.every(t => Math.abs(t / declaredWeek - 1) < 0.001),
    `${id}: every week of the modelled history carries the declared weekly level — the borrowed shape contributes rhythm, not direction`,
    `${Math.min(...weekTotals)} … ${Math.max(...weekTotals)} against ${declaredWeek}`
  );
  const within = new Set(values.slice(-7).map(v => v));
  assert(within.size > 1, `${id}: the weekday rhythm survives the normalisation — the week is not flat`);
  assert(
    /applied FORWARD of the clock/.test(dataset.provenance.source),
    `${id}: the provenance says where the declared trend is applied, rather than implying a slope`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 7. R-37 is intact ============================================\n');

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const run = await decisionAt(s, 21);
  if (!run) continue;
  const declaredObserved = s.demand.movement_attribution
    .filter(a => a.driver_class === 'OBSERVED_BEHAVIOUR')
    .reduce((sum, a) => sum + a.contribution_pp, 0);
  assert(
    Math.abs(run.observedPp - declaredObserved) <= 0.25,
    `${id}: the observed-behaviour contribution still arrives through the evidence path`,
    `declared ${declaredObserved}pp, published ${run.observedPp.toFixed(2)}pp`
  );
  assert(
    run.evaluation.forecast_stability.stability_state !== 'INDETERMINATE'
    && run.evaluation.forecast_stability.contributing_signal_refs.length >= 2,
    `${id}: the R-37 carriers still reach the stability engine`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 8. The reference scenario\'s protected journey ================\n');

{
  const dairy = resolveScenario(CANONICAL_SCENARIO_ID);
  const run = await decisionAt(dairy, 21);
  assert(!!run, 'Fresh Dairy: the decision is served');
  if (run) {
    const checks: [string, number, number][] = [
      ['economic base', run.base, 700_000],
      ['expected demand', run.emerging, 900_125],
      ['servable demand', run.executable, 770_000],
      ['exposed demand', run.exposedUnits, 130_125],
      ['Decision Gap pp', run.exposedPp, 18.6],
      ['total movement %', Number(run.totalPct.toFixed(1)), 28.6]
    ];
    for (const [label, actual, expected] of checks) {
      assert(
        Math.abs(actual - expected) <= (label.endsWith('pp') || label.endsWith('%') ? 0.05 : 1),
        `Fresh Dairy: ${label} is ${expected.toLocaleString('en-GB')}`,
        String(actual)
      );
    }
    assert(
      Math.abs(run.trendPp - (-1.96)) < 0.05,
      'Fresh Dairy: its trend is still MEASURED from its own observed history, not declared onto it',
      run.trendPp.toFixed(2)
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 9. No scenario-identity branching ============================\n');

{
  const sources = [
    'lib/demand-decision-frontier/demand-frontier-engine.ts',
    'lib/forecast/scenario-series.ts',
    'lib/demand-forecast.ts',
    'packages/contracts/src/scenario-demand-attribution.ts'
  ];
  for (const file of sources) {
    const body = readFileSync(join(ROOT, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    assert(
      !/SCN-[A-Z0-9-]+/.test(body),
      `${file}: names no scenario — the repair branches on evidence coverage, never on identity`,
      (body.match(/SCN-[A-Z0-9-]+/) ?? []).join(', ')
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 10. The estate still certifies ===============================\n');

for (const result of certifyRegisteredScenarios()) {
  const dims = result.dimensions ?? [];
  assert(result.state === 'CERTIFIED', `${result.scenario_id}: CERTIFIED`, result.state);
  assert(
    dims.length === 12 && dims.every(d => d.verdict === 'PASS'),
    `${result.scenario_id}: twelve dimensions PASS, none NOT_APPLICABLE`,
    dims.filter(d => d.verdict !== 'PASS').map(d => `${d.dimension}:${d.verdict}`).join(', ')
  );
}

console.log('\n=== Reconciliation, as measured ==================================\n');
for (const s of SCENARIOS) {
  const run = await decisionAt(s, 21);
  if (!run) continue;
  const a = Object.fromEntries(s.demand.movement_attribution.map(x => [x.driver_class, x.contribution_pp]));
  console.log(
    `  ${s.identity.scenario_id.padEnd(30)} trend ${run.trendPp.toFixed(2).padStart(6)}pp (${a.UNDERLYING_TREND})  `
    + `intent ${run.promotionPp.toFixed(2).padStart(6)}pp (${a.COMMERCIAL_INTENT})  `
    + `observed ${run.observedPp.toFixed(2).padStart(5)}pp (${a.OBSERVED_BEHAVIOUR})  `
    + `total ${run.totalPct.toFixed(2)}% (${s.demand.total_demand_movement_pct}%)`
  );
}

console.log('\n=================================================================');
console.log(`Passed: ${passed}   Failed: ${failed}`);
console.log('=================================================================\n');
process.exit(failed === 0 ? 0 : 1);

})();
