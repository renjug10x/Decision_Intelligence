/**
 * `R-37` — Curated Scenario Observed-Behaviour Evidence Carrier
 * ───────────────────────────────────────────────────────────────────────────────
 * The one property this suite exists for:
 *
 *   a scenario's declared `OBSERVED_BEHAVIOUR` contribution must arrive on the Demand surface
 *   THROUGH admitted evidence, and must not be reachable any other way.
 *
 * Everything else here is a way of making that property hard to satisfy dishonestly. The
 * reconciliation in §8 would pass just as well if someone wrote the contribution into the surface,
 * so §1 pins DDF-01's admission contract shut, §3 refuses a supply or commercial signal standing in
 * for demand evidence, and §9 asserts that the declared contributions appear nowhere as a literal
 * on the path that publishes them.
 *
 * What this suite leaves to its neighbours
 * ----------------------------------------
 * `run-ddf01-tests.ts`               the stability engine's own behaviour
 * `run-sci05-living-evidence-tests.ts` the three Living Evidence contracts
 * `run-canonical-scenario-tests.ts`  the reference journey's protected digits
 * this suite                         `R-37`, and the reference scenario's immunity to it
 */

import {
  CANONICAL_SCENARIO_ID,
  CHILLED_SALMON_SCENARIO_ID,
  PREMIUM_BAKERY_SCENARIO_ID,
  CanonicalScenario,
  EnterpriseSignal,
  resolveScenario,
  withScenarioInScope,
  scenarioOpeningDecisionParameters,
  calculateDerivedImpacts,
  scenarioPeriodInstantIso,
  ORDERED_SIMULATION_PERIODS
} from '../../packages/contracts/src/index';
import '../../lib/scenario-runtime';
import {
  observedBehaviourCarriers,
  declaredObservedBehaviourPp
} from '../../services/world/src/observed-behaviour-carriers';
import { generateSyntheticSignalSnapshot } from '../../services/world/src/enterprise-signal-generator';
import {
  DDF_STABILITY_SIGNAL_TYPES,
  evaluateForecastStability,
  evaluateDemandDecisionFrontier
} from '../../lib/demand-decision-frontier/demand-frontier-engine';
import { deriveOutlookContributors } from '../../lib/demand-decision-language';
import { projectDemand, isDemandRefusal } from '../../lib/demand-forecast';
import {
  scenarioEvidenceTimelines,
  observedEvidenceAt,
  openingAsAtMarker,
  assessSignalMateriality,
  refreshScenario,
  restartAllScenarioEvidence
} from '../../lib/living-evidence-engine';
import { certifyRegisteredScenarios } from '../../lib/scenario-certification';
import { readFileSync, readdirSync, statSync } from 'fs';
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
const snapshotOf = (s: CanonicalScenario) => generateSyntheticSignalSnapshot(s, 'tenant_uk_retail_01');
const admittedIn = (signals: EnterpriseSignal[]) =>
  signals.filter(x => DDF_STABILITY_SIGNAL_TYPES.includes(x.signal_type));

/**
 * The canonical signal vocabulary, read from the contract that declares it rather than re-typed
 * here — so "no new type was introduced" is checked against the union itself.
 */
const CANONICAL_SIGNAL_TYPES: string[] = (() => {
  const source = readFileSync(join(ROOT, 'packages/contracts/src/enterprise-signal-model.ts'), 'utf8');
  const union = source.split('export type CanonicalSignalType =')[1]?.split(';')[0] ?? '';
  return [...union.matchAll(/'([A-Z_]+)'/g)].map(m => m[1]);
})();

/** The types ADR-040 excludes on purpose. A carrier must never be one of these. */
const EXCLUDED_TYPES = CANONICAL_SIGNAL_TYPES.filter(t => !DDF_STABILITY_SIGNAL_TYPES.includes(t));

restartAllScenarioEvidence();

(async () => {

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 1. DDF-01\'s admission contract is unchanged ==================\n');

const ADMITTED_AT_GATE_A = [
  'FORECAST_DIVERGENCE',
  'CATEGORY_DEMAND_ACCELERATION',
  'ORDER_VELOCITY_ACCELERATION',
  'REGIONAL_DEMAND_SHIFT',
  'SEARCH_VELOCITY_ACCELERATION',
  'BASKET_ADD_ACCELERATION',
  'PRODUCT_ENGAGEMENT_ACCELERATION',
  'CAMPAIGN_RESPONSE_ACCELERATION'
];

assert(
  DDF_STABILITY_SIGNAL_TYPES.length === ADMITTED_AT_GATE_A.length
  && ADMITTED_AT_GATE_A.every(t => DDF_STABILITY_SIGNAL_TYPES.includes(t)),
  'DDF_STABILITY_SIGNAL_TYPES is exactly the demand-side list ADR-040 declared — R-37 did not widen it',
  DDF_STABILITY_SIGNAL_TYPES.join(', ')
);
assert(
  CANONICAL_SIGNAL_TYPES.length > DDF_STABILITY_SIGNAL_TYPES.length
  && DDF_STABILITY_SIGNAL_TYPES.every(t => CANONICAL_SIGNAL_TYPES.includes(t)),
  'The admission list remains a scoping filter over EXISTING canonical types — no new type was introduced',
  `${CANONICAL_SIGNAL_TYPES.length} canonical types, ${DDF_STABILITY_SIGNAL_TYPES.length} admitted`
);
for (const excluded of ['SUPPLIER_CAPACITY_PRESSURE', 'SUPPLIER_LEAD_TIME_DRIFT', 'STOCK_COVER_DECLINE',
  'COMPETITOR_CAMPAIGN_LAUNCH', 'MARGIN_COMPRESSION', 'PERISHABLE_AGEING_PRESSURE']) {
  assert(
    !DDF_STABILITY_SIGNAL_TYPES.includes(excluded),
    `${excluded} is still refused as demand evidence`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 2. Every certified scenario carries admitted demand evidence ==\n');

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const admitted = admittedIn(snapshotOf(s));
  assert(
    declaredObservedBehaviourPp(s) > 0,
    `${id}: the record declares a contribution from observed behaviour`,
    `${declaredObservedBehaviourPp(s)}pp`
  );
  assert(
    admitted.length >= 2,
    `${id}: publishes at least two admitted demand-side observations`,
    `${admitted.length}: ${admitted.map(a => a.signal_type).join(', ')}`
  );
  const stability = withScenarioInScope(s, () => evaluateForecastStability(paramsOf(s), snapshotOf(s)));
  assert(
    stability.stability_state !== 'INDETERMINATE',
    `${id}: Forecast Stability is no longer INDETERMINATE — the evidence reaches the engine`,
    stability.indeterminate_reason ?? ''
  );
  assert(
    stability.contributing_signal_refs.length === admitted.length,
    `${id}: every admitted observation is named in contributing_signal_refs`,
    stability.contributing_signal_refs.join(', ')
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 3. The carriers are demand evidence, not repurposed evidence ==\n');

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const carriers = observedBehaviourCarriers(s);
  const admitted = admittedIn(snapshotOf(s));

  assert(
    admitted.every(a => !EXCLUDED_TYPES.includes(a.signal_type)),
    `${id}: no supply, inventory, logistics or cost signal reaches the demand engine`
  );
  assert(
    carriers.every(c => c.category === 'DEMAND' || c.category === 'CUSTOMER'),
    `${id}: every authored carrier is categorised DEMAND or CUSTOMER`,
    carriers.map(c => `${c.signal_type}:${c.category}`).join(', ')
  );
  assert(
    snapshotOf(s).some(x => x.category === 'SUPPLY' || x.category === 'INVENTORY'),
    `${id}: the supply-side evidence is still published — it was not converted into demand evidence`
  );
}

{
  const bakery = resolveScenario(PREMIUM_BAKERY_SCENARIO_ID);
  const competitor = snapshotOf(bakery).find(x => x.signal_type === 'COMPETITOR_CAMPAIGN_LAUNCH');
  assert(
    !!competitor && competitor.category === 'COMMERCIAL',
    'Bakery: the competitor feature stays a COMMERCIAL trigger — the cause was not relabelled as the response'
  );
  assert(
    !!competitor && !DDF_STABILITY_SIGNAL_TYPES.includes(competitor.signal_type),
    'Bakery: the competitor trigger is still refused by the demand engine'
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 4. Scenario-specific, and scoped to the record\'s own entities =\n');

const carrierFingerprints = new Map<string, string>();
for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const admitted = admittedIn(snapshotOf(s));
  carrierFingerprints.set(id, admitted.map(a => `${a.signal_type}@${a.entity_id}@${a.delta_pct}`).sort().join('|'));

  const ownScopes = new Set<string>([
    s.identity.category,
    s.identity.focus_region,
    s.identity.sku_id,
    `${s.identity.sku_id} ${s.identity.sku_name}`
  ]);
  assert(
    admitted.every(a => ownScopes.has(a.entity_id)),
    `${id}: every carrier is scoped to an entity the RECORD names`,
    admitted.map(a => a.entity_id).join(', ')
  );
  assert(
    admitted.every(a => a.scenario_id === id),
    `${id}: every carrier is stamped with its own scenario identity`
  );
}
assert(
  new Set(carrierFingerprints.values()).size === SCENARIOS.length,
  'No two scenarios publish the same carrier set — evidence identical across scenarios is not evidence',
  [...carrierFingerprints.values()].join('  //  ')
);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 5. Aligned to the scenario clock, never the wall clock ========\n');

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const instants = new Set(ORDERED_SIMULATION_PERIODS.map(p => scenarioPeriodInstantIso(s, p)));
  const admitted = admittedIn(snapshotOf(s));
  assert(
    admitted.every(a => instants.has(a.observed_at)),
    `${id}: every carrier's observed_at falls on one of this scenario's own period instants`,
    admitted.map(a => a.observed_at).join(', ')
  );
  assert(
    admitted.every(a => instants.has(a.effective_at)),
    `${id}: every carrier's effective_at falls on one of this scenario's own period instants`
  );
  assert(
    admitted.every(a => Date.parse(a.effective_at) >= Date.parse(a.observed_at)),
    `${id}: no carrier bites before it was seen`
  );
}
{
  const a = admittedIn(snapshotOf(resolveScenario(CHILLED_SALMON_SCENARIO_ID))).map(x => x.observed_at).join();
  const b = admittedIn(snapshotOf(resolveScenario(PREMIUM_BAKERY_SCENARIO_ID))).map(x => x.observed_at).join();
  assert(a !== b, 'Two scenarios on two different clocks stamp their carriers at two different instants');
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 6. Provenance-bearing ========================================\n');

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  for (const carrier of admittedIn(snapshotOf(s))) {
    const p = carrier.provenance ?? {};
    assert(
      p.scenario_id === id && p.scenario_family === s.taxonomy.family_id,
      `${id}/${carrier.signal_id}: provenance names the scenario and its family`
    );
    assert(
      typeof p.rule === 'string' && p.rule.length > 0,
      `${id}/${carrier.signal_id}: provenance names the rule that produced it`
    );
    assert(
      p.origin === s.provenance.descriptor.origin
      && p.method === s.provenance.descriptor.method
      && p.authority === s.provenance.descriptor.authority,
      `${id}/${carrier.signal_id}: provenance carries the ADR-082 triple from the record`
    );
    assert(
      typeof p.scenario_clock === 'string' && p.observed_period !== undefined,
      `${id}/${carrier.signal_id}: provenance states the clock and the period, so freshness can be checked`
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 7. Deterministic, reproducible, and one source for two publishers\n');

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  assert(
    JSON.stringify(snapshotOf(s)) === JSON.stringify(snapshotOf(s)),
    `${id}: two snapshots of the same scenario are byte-identical`
  );
  const timelines = scenarioEvidenceTimelines(s, paramsOf(s));
  assert(
    JSON.stringify(timelines) === JSON.stringify(scenarioEvidenceTimelines(s, paramsOf(s))),
    `${id}: two evidence timelines of the same scenario are byte-identical`
  );

  // The snapshot and the timeline must be the SAME observation, not two that resemble each other.
  for (const carrier of observedBehaviourCarriers(s)) {
    const snapshot = snapshotOf(s).find(x => x.signal_id === carrier.signal_id);
    const timeline = timelines.find(t => t.timeline_id === `${carrier.timeline_id}_${id}`);
    const today = timeline?.observations.find(o => o.period === 'Today');
    assert(
      !!snapshot && !!today && snapshot.delta_pct === today.delta_pct,
      `${id}/${carrier.signal_id}: the snapshot and the timeline agree at Today`,
      `${snapshot?.delta_pct} vs ${today?.delta_pct}`
    );
    assert(
      !!timeline && timeline.signal_type === carrier.signal_type && timeline.entity_id === carrier.entity_id,
      `${id}/${carrier.signal_id}: the timeline carries the same type and scope as the snapshot`
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 8. The declared contribution arrives through the governed path =\n');

const reconciliation: Record<string, { declared: number; realised: number; total: number }> = {};

for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const params = paramsOf(s);
  const projection = await projectDemand({
    scenario: s,
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
  assert(!isDemandRefusal(projection), `${id}: the demand projection is served`);
  if (isDemandRefusal(projection)) continue;

  const derived = withScenarioInScope(s, () => calculateDerivedImpacts(params, []));
  const evaluation = withScenarioInScope(s, () => evaluateDemandDecisionFrontier({
    tenantId: 'tenant_uk_retail_01',
    sessionId: 'sess_r37',
    scenarioParams: params,
    derivedImpacts: derived,
    intentFusionOutlook: null as never,
    enterpriseSignals: snapshotOf(s),
    historySales: projection.history,
    forecastSales: projection.forecast.map(f => ({ date: f.date, value: f.value })),
    revenuePerUnitGbp: 1,
    metric: 'units'
  }));
  const contributors = withScenarioInScope(s, () => deriveOutlookContributors(evaluation, params.promotion_lift));
  const observed = contributors.find(c => c.key === 'observed');
  const declared = declaredObservedBehaviourPp(s);
  const frontier = evaluation.demand_frontier;
  const total = ((frontier.emerging_demand_units / frontier.base_demand_units) - 1) * 100;
  reconciliation[id] = { declared, realised: observed?.pp ?? 0, total };

  assert(
    !!observed,
    `${id}: the Demand surface publishes an observed-behaviour contributor`
  );
  assert(
    Math.abs((observed?.pp ?? 0) - declared) <= 0.25,
    `${id}: the contribution the surface attributes to observed behaviour is the one the record declares`,
    `declared ${declared}pp, realised ${(observed?.pp ?? 0).toFixed(2)}pp`
  );
  assert(
    Math.abs((observed?.pp ?? 0)) > 0
    && evaluation.forecast_stability.expected_revision_pct !== 0,
    `${id}: the contribution arrives as a forecast revision, not as a value of its own`,
    `revision ${evaluation.forecast_stability.expected_revision_pct}%`
  );

  // Remove the carriers and the contribution must vanish — the evidence is load-bearing.
  const withoutCarriers = snapshotOf(s).filter(x => !DDF_STABILITY_SIGNAL_TYPES.includes(x.signal_type));
  const starved = withScenarioInScope(s, () => evaluateForecastStability(params, withoutCarriers));
  assert(
    starved.stability_state === 'INDETERMINATE' && starved.expected_revision_pct === 0,
    `${id}: with the carriers withdrawn the outlook returns INDETERMINATE — nothing else supplies the number`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 9. The contribution is nowhere written down ===================\n');

{
  const carrierSource = readFileSync(join(ROOT, 'services/world/src/observed-behaviour-carriers.ts'), 'utf8');
  const code = carrierSource
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  for (const s of SCENARIOS.filter(x => observedBehaviourCarriers(x).length > 0)) {
    const declared = declaredObservedBehaviourPp(s);
    const amplitudes = observedBehaviourCarriers(s).map(c => c.peak_delta_pct);
    assert(
      amplitudes.every(a => a !== declared),
      `${s.identity.scenario_id}: no carrier amplitude IS the declared contribution (${declared}pp)`,
      amplitudes.join(', ')
    );
    assert(
      amplitudes.reduce((sum, a) => sum + a, 0) !== declared,
      `${s.identity.scenario_id}: the carrier amplitudes do not sum to the declared contribution either`
    );
  }
  assert(
    (code.match(/declaredObservedBehaviourPp\(scenario\)/g) ?? []).length === 1
    && /if \(declaredObservedBehaviourPp\(scenario\) <= 0\) return \[\];/.test(code),
    'The carrier module reads the declared contribution ONCE, to decide whether to publish at all',
    String((code.match(/declaredObservedBehaviourPp\(scenario\)/g) ?? []).length)
  );
  const amplitudeExpressions = [...code.matchAll(/peak_delta_pct:\s*([^,;\n]+)/g)].map(m => m[1].trim());
  assert(
    amplitudeExpressions.every(e => e === 'number' || /^-?\d+(\.\d+)?$/.test(e)),
    'Every carrier amplitude is a plain declared observation — none is computed from the record',
    amplitudeExpressions.join(' | ')
  );

  // No surface may carry the contribution as a literal.
  const surfaces: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) { if (entry !== 'node_modules' && entry !== '.next') walk(full); }
      else if (entry.endsWith('.tsx')) surfaces.push(full);
    }
  };
  walk(join(ROOT, 'components'));
  walk(join(ROOT, 'app'));
  const offenders = surfaces.filter(f => {
    const body = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    return /\b8\.0\s*pp|\b5\.1\s*pp|observed_behaviour_pp\s*=\s*\d/.test(body);
  });
  assert(
    offenders.length === 0,
    'No surface writes an observed-behaviour contribution down',
    offenders.join(', ')
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 10. The reference scenario is untouched ======================\n');

{
  const dairy = resolveScenario(CANONICAL_SCENARIO_ID);
  assert(
    observedBehaviourCarriers(dairy).length === 0,
    'R-37 authored no carrier for the reference scenario — its evidence predates this repair'
  );
  const admitted = admittedIn(snapshotOf(dairy)).map(a => `${a.signal_type}@${a.delta_pct}`).sort();
  assert(
    admitted.join('|') === 'BASKET_ADD_ACCELERATION@24|SEARCH_VELOCITY_ACCELERATION@18',
    'The reference scenario still publishes exactly its own two carriers, unchanged',
    admitted.join('|')
  );
  const r = reconciliation[CANONICAL_SCENARIO_ID];
  assert(
    !!r && Math.abs(r.total - dairy.demand.total_demand_movement_pct) <= 0.01,
    'The reference scenario still reconciles to its declared total movement',
    r ? `${r.total.toFixed(2)}% vs ${dairy.demand.total_demand_movement_pct}%` : 'not evaluated'
  );
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 11. The carriers participate in Living Evidence ===============\n');

restartAllScenarioEvidence();
for (const s of SCENARIOS) {
  const id = s.identity.scenario_id;
  const params = paramsOf(s);
  const marker = openingAsAtMarker(s);
  const evidence = observedEvidenceAt(s, marker.period);
  const carrierTypes = new Set(observedBehaviourCarriers(s).map(c => c.signal_type));

  if (carrierTypes.size > 0) {
    assert(
      [...carrierTypes].every(t => evidence.some(e => e.signal_type === t)),
      `${id}: the carriers appear in the evidence the Living Evidence surface reads`
    );
    for (const type of carrierTypes) {
      const observation = evidence.filter(e => e.signal_type === type).slice(-1)[0];
      const materiality = assessSignalMateriality(s, observation, evidence, marker.period, params);
      assert(
        materiality.movements.length > 0 && materiality.band !== 'IMMATERIAL',
        `${id}/${type}: materiality is DERIVED from what the observation moves, not declared`,
        `${materiality.band}, ${materiality.movements.length} quantities moved`
      );
      assert(
        materiality.rationale.length > 0 && /moved from/.test(materiality.rationale),
        `${id}/${type}: the materiality rationale names the quantity and both readings`
      );
    }
  }

  const delta = refreshScenario(id);
  assert(
    delta.observations.length > 0 && delta.decision_consequence_statement.length > 0,
    `${id}: a Refresh advance produces observations and a consequence statement`
  );
  assert(
    delta.decision_changes.some(c => c.changed !== 'NONE')
    || /without changing the decision|unchanged/.test(delta.decision_consequence_statement),
    `${id}: where the decision did not change, the Refresh says so rather than manufacturing one`,
    delta.decision_consequence_statement.slice(0, 120)
  );
}
restartAllScenarioEvidence();

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n=== 12. The estate still certifies ================================\n');

for (const result of certifyRegisteredScenarios()) {
  const dims = result.dimensions ?? [];
  assert(
    result.state === 'CERTIFIED',
    `${result.scenario_id}: still CERTIFIED with the carriers in place`,
    result.state
  );
  assert(
    dims.length === 12 && dims.every(d => d.verdict === 'PASS'),
    `${result.scenario_id}: all twelve dimensions PASS, none NOT_APPLICABLE`,
    dims.filter(d => d.verdict !== 'PASS').map(d => `${d.dimension}:${d.verdict}`).join(', ')
  );
}

console.log('\n=== Reconciliation, as measured ==================================\n');
for (const s of SCENARIOS) {
  const r = reconciliation[s.identity.scenario_id];
  if (!r) continue;
  console.log(
    `  ${s.identity.scenario_id.padEnd(30)} observed behaviour declared ${String(r.declared).padStart(5)}pp  `
    + `realised ${r.realised.toFixed(2).padStart(6)}pp   scenario total ${r.total.toFixed(2)}% `
    + `(record ${s.demand.total_demand_movement_pct}%)`
  );
}

console.log('\n=================================================================');
console.log(`Passed: ${passed}   Failed: ${failed}`);
console.log('=================================================================\n');
process.exit(failed === 0 ? 0 : 1);

})();
