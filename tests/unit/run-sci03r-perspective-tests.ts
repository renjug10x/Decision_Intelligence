/**
 * `SCI-03R` — Scenario Perspective Binding (`R-35`)
 * ───────────────────────────────────────────────────────────────────────────────
 * The Gate-B repair, asserted.
 *
 * `R-35` was not that the scenarios were wrong. `SCI-03` certified three of them and the domain
 * derived three genuinely different decisions from declared terms. It was that the three PRIMARY
 * DECISION PERSPECTIVES — Demand, Promotion and Campaign Decision — did not consume the active
 * one. Selecting a scenario changed the shell and left the intelligence beneath it reading the
 * reference instance, so on those surfaces the catalogue was label variations.
 *
 * What this suite holds, and what it deliberately leaves to its neighbours
 * ------------------------------------------------------------------------
 * `run-canonical-scenario-tests.ts` holds the protected journey's digits.
 * `run-sci02-certification-tests.ts` holds the gate's behaviour as a gate.
 * `run-sci03-scenario-pack-tests.ts` holds `R-27` and the catalogue's own truth.
 * This suite holds ONE property, in three perspectives and one guard:
 *
 *   ACTIVE CERTIFIED SCENARIO → one context → one set of declared economics → every perspective.
 *
 * §6 is the one worth reading twice. Every assertion above it would still pass if a later packet
 * reintroduced a `CANONICAL_*` read into a decision surface and only one scenario were exercised;
 * §6 is the guard that fails instead of waiting for a browser to find it again.
 */

import {
  CANONICAL_SCENARIO,
  CANONICAL_SCENARIO_ID,
  CanonicalScenario,
  CHILLED_SALMON_SCENARIO,
  CHILLED_SALMON_SCENARIO_ID,
  PREMIUM_BAKERY_SCENARIO,
  PREMIUM_BAKERY_SCENARIO_ID,
  resolveScenario,
  withScenarioInScope,
  createDefaultCampaignIntentDraft,
  scenarioOpeningDecisionParameters
} from '../../packages/contracts/src/index';
import '../../lib/scenario-runtime';
import { certifyRegisteredScenarios } from '../../lib/scenario-certification';
import { scenarioArchetypeProjection, CAMPAIGN_ARCHETYPES_MAP } from '../../lib/campaign-archetypes';
import { buildForecastDataset } from '../../lib/forecast/series';
import { buildScenarioForecastDataset, observedHistoryCoversScenario } from '../../lib/forecast/scenario-series';
import { decisionStateStore } from '../../lib/decision-state-store';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

let passed = 0;
let failed = 0;
function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`); failed++; }
}

const ROOT = join(__dirname, '..', '..');
const ALL: CanonicalScenario[] = [CANONICAL_SCENARIO, CHILLED_SALMON_SCENARIO, PREMIUM_BAKERY_SCENARIO];

/** What each scenario's declared terms say the answer is. Written here, derived there. */
const GOVERNED = {
  [CANONICAL_SCENARIO_ID]:    { recommended: 14, sku: 'Cheddar Mature 400g',         supplier: 'Cheshire Cheese Co', scope: 'National', horizon: 14, historyEnds: '2026-06-03' },
  [CHILLED_SALMON_SCENARIO_ID]: { recommended: 10, sku: 'Atlantic Salmon Fillet 300g', supplier: 'Foodvest Fish',     scope: 'National', horizon: 14, historyEnds: '2026-07-15' },
  [PREMIUM_BAKERY_SCENARIO_ID]: { recommended: 0,  sku: 'White Sourdough 800g',        supplier: 'Allied Bakeries',   scope: 'London',   horizon: 7,  historyEnds: '2026-09-09' }
} as const;

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 1. DEMAND — each scenario is fitted on ITS OWN history ========\n');

(async () => {
const observedEstate = await buildForecastDataset({ measure: 'units_sold' });

for (const scenario of ALL) {
  const id = scenario.identity.scenario_id;
  const g = GOVERNED[id as keyof typeof GOVERNED];
  const ds = await buildScenarioForecastDataset({ scenario, measure: 'units_sold' });

  assert(
    ds.provenance.last_period === g.historyEnds,
    `${id}: history ends on its OWN declared observed_history_end_date (${g.historyEnds})`,
    ds.provenance.last_period
  );
  assert(
    ds.observations.length >= 60,
    `${id}: history is long enough for the statistical pipeline to fit (${ds.observations.length} days)`
  );
  assert(
    ds.observations.every(o => Number.isFinite(o.value) && o.value > 0),
    `${id}: every observation is a finite positive quantity`
  );
  assert(ds.provenance.synthetic_demo === true, `${id}: history is declared synthetic, never presented as observed retailer data`);
}

/*
 * The reference scenario keeps the OBSERVED estate history byte for byte. This is the assertion
 * that protects every published figure on the Demand surface: run rate, base, expected, servable
 * and both exposures are means and ratios of exactly these numbers.
 */
const refDs = await buildScenarioForecastDataset({ scenario: CANONICAL_SCENARIO, measure: 'units_sold' });
assert(
  observedHistoryCoversScenario(CANONICAL_SCENARIO, observedEstate),
  'The seeded estate COVERS the reference scenario\'s declared window, so its history is observed'
);
assert(
  JSON.stringify(refDs.observations) === JSON.stringify(observedEstate.observations),
  'PROTECTED: the reference scenario\'s history is the observed estate series, unchanged to the digit'
);
assert(
  refDs.provenance.source === observedEstate.provenance.source,
  'PROTECTED: the reference scenario\'s history keeps its observed provenance'
);

for (const pack of [CHILLED_SALMON_SCENARIO, PREMIUM_BAKERY_SCENARIO]) {
  const id = pack.identity.scenario_id;
  assert(
    !observedHistoryCoversScenario(pack, observedEstate),
    `${id}: the seeded estate holds NO evidence for its window — modelling is the honest answer`
  );
  const ds = await buildScenarioForecastDataset({ scenario: pack, measure: 'units_sold' });
  assert(
    (ds.provenance.scope as any).basis === 'MODELLED_FROM_DECLARED_SCENARIO_TERMS',
    `${id}: history declares itself MODELLED, with the declared inputs named in its provenance`
  );
  assert(
    /NOT observed retailer data/i.test(ds.provenance.source),
    `${id}: provenance says in words that this is not observed retailer data`
  );
  assert(
    JSON.stringify(ds.observations) !== JSON.stringify(observedEstate.observations),
    `${id}: history is NOT the reference scenario's estate series`
  );
  // Levelled on the scenario's OWN declared weekly base, anchored at the clock.
  const trailingWeek = ds.observations.slice(-7).reduce((s, o) => s + o.value, 0);
  const declared = pack.demand.base_demand_units_per_week;
  assert(
    Math.abs(trailingWeek - declared) / declared < 0.005,
    `${id}: trailing week equals its DECLARED base_demand_units_per_week (${declared.toLocaleString('en-GB')})`,
    `${trailingWeek}`
  );
}

// Histories differ for DECLARED reasons — scale is the declared base, not an arbitrary factor.
const salmon = await buildScenarioForecastDataset({ scenario: CHILLED_SALMON_SCENARIO, measure: 'units_sold' });
const bakery = await buildScenarioForecastDataset({ scenario: PREMIUM_BAKERY_SCENARIO, measure: 'units_sold' });
const salmonWeek = salmon.observations.slice(-7).reduce((s, o) => s + o.value, 0);
const bakeryWeek = bakery.observations.slice(-7).reduce((s, o) => s + o.value, 0);
const declaredRatio = CHILLED_SALMON_SCENARIO.demand.base_demand_units_per_week / PREMIUM_BAKERY_SCENARIO.demand.base_demand_units_per_week;
assert(
  Math.abs((salmonWeek / bakeryWeek) - declaredRatio) / declaredRatio < 0.01,
  'Two modelled histories differ by exactly the ratio of their DECLARED bases, not by an arbitrary factor'
);

// Weekly rhythm survives: a modelled history is not a flat line pretending to be demand.
for (const [label, ds] of [['salmon', salmon], ['bakery', bakery]] as const) {
  const v = ds.observations.slice(-28).map(o => o.value);
  const max = Math.max(...v); const min = Math.min(...v);
  assert((max - min) / max > 0.05, `${label}: the modelled history carries a real weekly rhythm, not a flat line`);
}

// Reproducibility: same scenario, same inputs, byte-identical history.
for (const scenario of ALL) {
  const a = await buildScenarioForecastDataset({ scenario, measure: 'units_sold' });
  const b = await buildScenarioForecastDataset({ scenario, measure: 'units_sold' });
  assert(
    JSON.stringify(a) === JSON.stringify(b),
    `${scenario.identity.scenario_id}: history reproduces BYTE-IDENTICALLY across runs`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 2. PROMOTION — the recommendation is the shared engine\'s ======\n');

for (const scenario of ALL) {
  const id = scenario.identity.scenario_id;
  const g = GOVERNED[id as keyof typeof GOVERNED];
  const projection = scenarioArchetypeProjection(scenario);

  assert(
    projection.id === scenario.taxonomy.archetype_id,
    `${id}: Promotion opens on the scenario's OWN declared archetype, not a literal`
  );
  assert(projection.sku_name === g.sku, `${id}: Promotion names its own SKU (${g.sku})`);
  assert(projection.default_region === g.scope, `${id}: Promotion runs at its own declared scope (${g.scope})`);
  assert(
    projection.default_discount_pct === scenario.economics.promotion_depth_pct,
    `${id}: Promotion opens at its own committed depth (${scenario.economics.promotion_depth_pct}%)`
  );
  assert(
    projection.rrp === scenario.economics.list_price_gbp,
    `${id}: Promotion prices on its own declared list price (£${scenario.economics.list_price_gbp})`
  );
  assert(
    projection.curve_summary?.recommended_discount_pct === g.recommended,
    `${id}: DERIVED recommendation is ${g.recommended}%`,
    String(projection.curve_summary?.recommended_discount_pct)
  );
  // The flag on the curve and the summary are the same answer, from the same curve.
  const flagged = projection.elasticity_curve.filter(p => p.is_cognix_recommended);
  assert(flagged.length === 1, `${id}: exactly one depth is flagged recommended`);
  assert(
    flagged[0].discount_pct === g.recommended,
    `${id}: the flagged tier IS the contribution maximum on its own curve`
  );
  const best = projection.elasticity_curve.reduce((a, b) =>
    b.net_contribution_delta_gbp > a.net_contribution_delta_gbp ? b : a);
  assert(
    best.discount_pct === g.recommended,
    `${id}: the recommendation is DERIVED — it is the maximum, not a label`
  );
}

// The three answers are genuinely different decisions, not three labels.
const recs = ALL.map(s => scenarioArchetypeProjection(s).curve_summary?.recommended_discount_pct);
assert(new Set(recs).size === 3, `Three scenarios produce three DIFFERENT recommendations (${recs.join(', ')})`);
assert(
  scenarioArchetypeProjection(PREMIUM_BAKERY_SCENARIO).curve_summary?.has_accretive_depth === false,
  'Premium Bakery: no depth on its curve is accretive — the answer is DO NOT PROMOTE'
);
assert(
  scenarioArchetypeProjection(PREMIUM_BAKERY_SCENARIO).discovery.decision_verdict === 'MARGIN RISK',
  'Premium Bakery: the verdict is derived from the curve having no accretive depth'
);

/*
 * The seeded archetype catalogue must NOT be the source of economic truth. `ARCH-PREMIUM-ARTISAN`
 * declares 15% / +12.0% / −£1,850 as a comparative-library entry; the certified bakery scenario
 * derives 0%. If the projection ever returned the seed, this is the assertion that catches it.
 */
const seededBakery = CAMPAIGN_ARCHETYPES_MAP['ARCH-PREMIUM-ARTISAN'];
const projectedBakery = scenarioArchetypeProjection(PREMIUM_BAKERY_SCENARIO);
assert(
  projectedBakery.discovery.net_contribution_delta_gbp !== seededBakery.discovery.net_contribution_delta_gbp,
  'Premium Bakery: the projection does NOT carry the archetype catalogue\'s seeded contribution',
  `seeded ${seededBakery.discovery.net_contribution_delta_gbp}, projected ${projectedBakery.discovery.net_contribution_delta_gbp}`
);
assert(
  projectedBakery.default_discount_pct === PREMIUM_BAKERY_SCENARIO.economics.promotion_depth_pct
    && projectedBakery.default_discount_pct !== seededBakery.default_discount_pct,
  'Premium Bakery: the committed depth is the scenario\'s 10%, not the archetype\'s seeded 15%'
);

// The waterfall reconciles with the curve beside it, per scenario.
for (const scenario of ALL) {
  const p = scenarioArchetypeProjection(scenario);
  const current = p.elasticity_curve.find(x => x.discount_pct === p.default_discount_pct);
  const net = p.waterfall.find(w => w.id.includes('net'));
  const ambient = p.waterfall
    .filter(w => w.driver_class === 'ambient' && !w.id.includes('base') && !w.id.includes('net'))
    .reduce((s, w) => s + w.contribution_pp, 0);
  assert(
    !!current && !!net && Math.abs(net.contribution_pp - (ambient + current.expected_demand_uplift_pct)) < 0.15,
    `${scenario.identity.scenario_id}: the demand waterfall adds up to what its own curve says`
  );
}

// PROTECTED: the reference scenario's authoritative Promotion economics, to the digit.
const refCurve = scenarioArchetypeProjection(CANONICAL_SCENARIO).elasticity_curve;
const at = (d: number) => refCurve.find(p => p.discount_pct === d)!;
assert(at(20).expected_demand_uplift_pct === 44.16, 'PROTECTED: reference 20% depth response is +44.16%', String(at(20).expected_demand_uplift_pct));
assert(Math.round(at(20).net_contribution_delta_gbp) === -5167, 'PROTECTED: reference 20% contribution is −£5,167', String(at(20).net_contribution_delta_gbp));
assert(at(14).expected_demand_uplift_pct === 33.65, 'PROTECTED: reference 14% depth response is +33.65%', String(at(14).expected_demand_uplift_pct));
assert(Math.round(at(14).net_contribution_delta_gbp) === 32976, 'PROTECTED: reference 14% contribution is +£32,976', String(at(14).net_contribution_delta_gbp));
const hashEra = refCurve.some(p => [46.8, 48.0, 36.4].includes(p.expected_demand_uplift_pct));
assert(!hashEra, 'No hash-era depth response (46.8 / 48.0 / 36.4) survives on the reference curve');

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 3. CAMPAIGN DECISION — the opening context is the active one ==\n');

for (const scenario of ALL) {
  const id = scenario.identity.scenario_id;
  const g = GOVERNED[id as keyof typeof GOVERNED];
  const draft = withScenarioInScope(scenario, () =>
    createDefaultCampaignIntentDraft('tenant_uk_retail_01', `sess_sci03r_${id}`));
  const ci: any = draft.campaign_intent;

  assert(
    JSON.stringify(ci).includes(scenario.identity.sku_id) || ci.product_scope?.sku_ids?.includes(scenario.identity.sku_id),
    `${id}: the opening decision names its own SKU (${scenario.identity.sku_id})`
  );
  assert(
    ci.framing_question.includes(g.sku),
    `${id}: the framing question names its own product`,
    ci.framing_question
  );
  assert(
    ci.framing_question.includes(`${scenario.economics.promotion_depth_pct}%`),
    `${id}: the framing question states its own committed depth`
  );
  assert(
    ci.intervention_posture === 'UNDECIDED',
    `${id}: the decision still opens UNDECIDED — context is carried, the outcome is not pre-decided`
  );
  // No other scenario's product leaks into the opening context.
  for (const other of ALL) {
    if (other.identity.scenario_id === id) continue;
    assert(
      !ci.framing_question.includes(other.identity.sku_name),
      `${id}: no trace of ${other.identity.sku_name} in the opening decision`
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 4. SWITCHING, RESET AND STATE ISOLATION =======================\n');

{
  const tenant = 'tenant_uk_retail_01';
  const session = 'sess_sci03r_switch';
  for (const scenario of ALL) {
    const id = scenario.identity.scenario_id;
    const state = decisionStateStore.switchScenarioForSession(tenant, session, id, scenario.taxonomy.family_id);
    const g = GOVERNED[id as keyof typeof GOVERNED];

    assert(state.scenario_id === id, `${id}: switching rebinds the session's decision state`);
    assert(
      state.scenario_parameters.forecast_horizon_days === g.horizon,
      `${id}: decision state opens on its OWN horizon (${g.horizon} days)`
    );
    assert(
      state.scenario_parameters.promotion_lift === scenario.economics.promotion_depth_pct,
      `${id}: decision state opens on its OWN committed depth`
    );
    assert(
      (state.constraints[0] ?? '').includes(g.supplier),
      `${id}: the constraint names its OWN supplier (${g.supplier})`,
      state.constraints[0]
    );
    for (const other of ALL) {
      if (other.identity.scenario_id === id) continue;
      assert(
        !state.constraints.join(' | ').includes(other.supply.supplier_name),
        `${id}: no stale ${other.supply.supplier_name} constraint survives the switch`
      );
    }
    // Reset restores THIS scenario's opening position, never the reference scenario's.
    const opening = scenarioOpeningDecisionParameters(scenario);
    const afterReset = decisionStateStore.resetDecisionState(state.decision_state_id)!;
    assert(
      JSON.stringify(afterReset.scenario_parameters) === JSON.stringify(opening),
      `${id}: Restart restores ITS OWN deterministic opening position`
    );
    assert(
      afterReset.scenario_id === id,
      `${id}: Restart does not fall back to the reference scenario`
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 5. CERTIFICATION IS STILL GREEN ==============================\n');

{
  const results = certifyRegisteredScenarios();
  assert(results.length === 3, `All three registered scenarios are certified (${results.length})`);
  for (const r of results) {
    const dims = (r as any).dimensions ?? [];
    const checks = dims.reduce((n: number, d: any) => n + (d.checks?.length ?? 0), 0);
    assert(r.state === 'CERTIFIED', `${r.scenario_id}: CERTIFIED`);
    assert(dims.length === 12 && dims.every((d: any) => d.verdict === 'PASS'), `${r.scenario_id}: all twelve dimensions PASS`);
    assert(checks === 84, `${r.scenario_id}: 84 executed checks`, String(checks));
    assert(
      dims.every((d: any) => (d.checks ?? []).every((c: any) => c.verdict !== 'NOT_APPLICABLE')),
      `${r.scenario_id}: zero NOT_APPLICABLE checks — nothing is carried by a declared non-applicability`
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 6. SOURCE GUARD — no decision surface may bind the reference ==\n');

/*
 * THE guard for this defect class.
 *
 * `R-35` was invisible to every existing test because each was exercised with one scenario active,
 * and a surface bound to `CANONICAL_*` is indistinguishable from a correct one until a second
 * scenario is selected. A test that selects scenarios would still miss a surface nobody thought to
 * open. This asserts the PROPERTY instead: a decision surface resolves the scenario in scope, and
 * the bound reference layer is reachable only from the modules entitled to it.
 *
 * `canonical*` and `CANONICAL_SCENARIO` are NOT deprecated. They are layer B — the protected
 * reference instance bound by name — and the archetype catalogue, the certification fixtures and
 * the reference-instance tests are all entitled to read them. What is forbidden is a SURFACE
 * reading them, because a surface serves whichever scenario the reader selected.
 */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (full.endsWith('.tsx')) acc.push(full);
  }
  return acc;
}

const codeOf = (f: string) =>
  readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/*
 * Surfaces entitled to the reference instance, each for a stated reason. An entry here is a
 * decision, not a convenience: anything added needs one.
 */
const ENTITLED: Record<string, string> = {
  // The archetype CATALOGUE is the reference framework's comparative library (ADR-077 part 2).
  'components/atlas/': 'The Capability Atlas documents the platform, not a live decision',
  'components/AboutSurface.tsx': 'Platform identification, not a decision surface'
};

const surfaces = sourceFiles(join(ROOT, 'components'))
  .concat(sourceFiles(join(ROOT, 'app')))
  .filter(f => !Object.keys(ENTITLED).some(e => f.includes(e)));

const boundToReference = surfaces.filter(f =>
  /\bCANONICAL_SCENARIO\b|\bcanonical(StoreCount|CurvePoint|BaseDemandUnits|ExpectedDemandUnits|ServableDemandUnits|ExposedDemandUnits|WeeklyPopulationUnits|RealisedRevenuePerUnitGbp|GrossMarginPerUnitGbp|ImpliedUnitCostGbp|ContributionAtDepthGbp|ScenarioNowIso)\b|\bCANONICAL_ELASTICITY_CURVE\b/
    .test(codeOf(f))
);
assert(
  boundToReference.length === 0,
  'No decision surface binds the PROTECTED REFERENCE instance by name — every one resolves the scenario in scope',
  boundToReference.map(f => f.replace(ROOT + '/', '')).join(', ')
);

// And no surface pins an archetype by literal, which is how `R-35` reached Promotion.
const pinsArchetype = surfaces.filter(f => /['"`]ARCH-[A-Z-]+['"`]/.test(codeOf(f)));
assert(
  pinsArchetype.length === 0,
  'No surface names an archetype by string literal — the active scenario declares its own',
  pinsArchetype.map(f => f.replace(ROOT + '/', '')).join(', ')
);

// And nothing on a decision surface compares a scenario identity against a literal.
const branchesOnIdentity = surfaces.filter(f => {
  const code = codeOf(f);
  return /(scenario_id|scenarioId)\s*===\s*['"`]SCN-/.test(code)
    || /['"`]SCN-[A-Z0-9-]+['"`]\s*===/.test(code);
});
assert(
  branchesOnIdentity.length === 0,
  'No surface branches on a scenario identity — surface + active certified scenario, never if A / if B',
  branchesOnIdentity.map(f => f.replace(ROOT + '/', '')).join(', ')
);

// The demand pipeline must resolve the scenario rather than reading the raw estate directly.
const demandForecast = codeOf(join(ROOT, 'lib', 'demand-forecast.ts'));
assert(
  /buildScenarioForecastDataset/.test(demandForecast) && !/\bbuildForecastDataset\s*\(/.test(demandForecast),
  'The demand projection fits the ACTIVE SCENARIO\'s history, never the raw estate series'
);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=================================================================');
console.log(`Passed: ${passed}   Failed: ${failed}`);
console.log('=================================================================\n');
process.exit(failed === 0 ? 0 : 1);
})();
