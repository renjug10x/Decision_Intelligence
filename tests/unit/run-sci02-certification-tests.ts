/**
 * Scenario Certification Gate test suite (`SCI-02`, ADR-080).
 * Run via: npx tsx tests/unit/run-sci02-certification-tests.ts
 *
 * Two things are under test and they are different.
 *
 * The GATE — that a certification result cannot claim what it has not shown, and that
 * activation cannot happen around it. These assertions are about the mechanism, and they
 * are written so that the mechanism failing open is a test failure rather than a silence.
 *
 * The REFERENCE SCENARIO — that `SCN-FRESH-DAIRY-CHEDDAR-001` passes the gate under the
 * same rules as everything else (§5). If the gate cannot certify it, the gate is wrong and
 * is corrected; the scenario is not exempted.
 */

import {
  CANONICAL_SCENARIO,
  CANONICAL_SCENARIO_ID,
  CERTIFICATION_DIMENSION_IDS,
  CertificationCheck,
  CertificationDimensionResult,
  ScenarioCertificationResult,
  certificationStateOf,
  deriveCertificationState,
  deriveDimensionVerdict,
  summariseCertification,
  validateCertificationResult,
  createCertificationActivationPolicy,
  activateScenario,
  registerScenario,
  resetScenarioRegistry,
  getActiveScenarioId,
  setScenarioActivationPolicy,
  resetScenarioActivationPolicy,
  calculateDerivedImpacts,
  DecisionScenarioParameters,
  scenarioWeeklyPopulationUnits,
  scenarioRealisedRevenuePerUnitGbp,
  scenarioClockNowIso
} from '../../packages/contracts/src/index';
import {
  certifyScenario,
  certifyRegisteredScenarios,
  installScenarioCertificationGate,
  uninstallScenarioCertificationGate,
  CERTIFICATION_HARNESS_VERSION
} from '../../lib/scenario-certification';
import { SECOND_SCENARIO, registerSecondScenario } from '../fixtures/scenario/second-scenario';
import { NO_PROMOTION_SCENARIO } from '../fixtures/scenario/no-promotion-scenario';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`); failed++; }
}

/** A minimal well-formed result, so the validity tests can mutate one field at a time. */
function syntheticResult(
  mutate: (dimensions: CertificationDimensionResult[]) => CertificationDimensionResult[] = d => d
): ScenarioCertificationResult {
  const base: CertificationDimensionResult[] = CERTIFICATION_DIMENSION_IDS.map(id => {
    const checks: CertificationCheck[] = [
      { id: `${id}.1`, statement: 'a check that ran and passed', applicable: true, passed: true, detail: '' }
    ];
    return { dimension: id, name: String(id), verdict: deriveDimensionVerdict(checks), reason: '1 checks passed.', checks };
  });
  const dimensions = mutate(base);
  return {
    scenario_id: 'SCN-SYNTHETIC-FIXTURE',
    state: deriveCertificationState(dimensions),
    harness_version: CERTIFICATION_HARNESS_VERSION,
    evaluated_at_scenario_clock: '2026-06-03T00:00:00.000Z',
    dimensions,
    assertion_count: dimensions.flatMap(d => d.checks).filter(c => c.applicable).length,
    failed_dimensions: dimensions.filter(d => d.verdict === 'FAIL').map(d => d.dimension),
    not_applicable_dimensions: dimensions.filter(d => d.verdict === 'NOT_APPLICABLE').map(d => d.dimension),
    provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
  };
}

console.log('\n=== 1. THE REFERENCE SCENARIO CERTIFIES BY THE SAME GATE ===========\n');

const canonical = certifyScenario(CANONICAL_SCENARIO);

assert(
  validateCertificationResult(canonical).valid,
  'The reference scenario\'s certification result is admissible',
  validateCertificationResult(canonical).errors.join('; ')
);
assert(
  canonical.state === 'CERTIFIED',
  'SCN-FRESH-DAIRY-CHEDDAR-001 is CERTIFIED — §5: if the gate cannot certify it, the gate is wrong',
  `${canonical.state}: ${canonical.failed_dimensions.join(', ')}`
);
assert(
  canonical.scenario_id === CANONICAL_SCENARIO_ID,
  'The result names the scenario it certified'
);
assert(
  canonical.dimensions.length === 12 && CERTIFICATION_DIMENSION_IDS.every(id => canonical.dimensions.some(d => d.dimension === id)),
  'All twelve governed dimensions were evaluated, none skipped',
  canonical.dimensions.map(d => d.dimension).join(', ')
);
assert(
  canonical.dimensions.every(d => d.verdict === 'PASS'),
  'Every dimension passes for the reference scenario — nothing is carried by a declared non-applicability',
  canonical.dimensions.filter(d => d.verdict !== 'PASS').map(d => `${d.dimension}=${d.verdict}`).join(', ')
);
assert(
  canonical.assertion_count >= 60,
  'The reference scenario is certified on a substantial body of executed checks, not a token few',
  String(canonical.assertion_count)
);

// ADR-078: a certification result is evidence about the modelled world, so it carries
// scenario time. It is also what makes two runs of the gate byte-identical.
assert(
  canonical.evaluated_at_scenario_clock === scenarioClockNowIso(CANONICAL_SCENARIO),
  'The result is stamped on the scenario clock, not the wall clock',
  canonical.evaluated_at_scenario_clock
);
assert(
  JSON.stringify(certifyScenario(CANONICAL_SCENARIO)) === JSON.stringify(canonical),
  'Certification is deterministic — two runs produce a byte-identical result'
);

console.log('\n=== 2. THE GATE REFUSES WHAT DOES NOT RECONCILE ====================\n');

/*
 * The whole point of the packet. `SECOND_SCENARIO` declares a different scale, supplier and
 * SKU, and it is deliberately inconsistent with the enterprise masters: it names P012 as a
 * "Chilled Ready Meal" the product master calls "Smoked Salmon 100g", serves the flex notice
 * on a supplier that does not make the line, carries the reference scenario's £2.49 against a
 * master price of £3.19, and is never registered. It does NOT reconcile, and the gate says so
 * by dimension rather than letting a second disconnected economic universe reach a demo.
 *
 * WHAT CHANGED AT `SCI-03`, recorded here rather than quietly edited
 * ------------------------------------------------------------------
 * At `SCI-02` this fixture also failed C-5 through C-8, because the engines answered with the
 * reference scenario's economics whatever was being certified. That was R-27, and the gate
 * catching it is the reason it was found before a client did. `SCI-03` closed R-27 by moving
 * the engines onto the scenario in scope, so those dimensions now reconcile for this fixture
 * and only its genuine contradictions remain.
 *
 * The assertions below were therefore REPOINTED, not relaxed: each one still asserts the
 * property `SCI-02` was asserting — that a failure is reported, named, reasoned and
 * quantified — against a check that genuinely fails today. `run-sci03-scenario-pack-tests.ts`
 * carries the positive half: that the engines now answer with the scenario in scope.
 */
const second = certifyScenario(SECOND_SCENARIO);

assert(
  second.state === 'FAILED',
  'A scenario that contradicts the enterprise masters is NOT certified',
  second.state
);
assert(
  validateCertificationResult(second).valid,
  'A failing result is still a well-formed result — the gate reports, it does not crash'
);
assert(
  second.failed_dimensions.length > 0 && second.failed_dimensions.every(d => CERTIFICATION_DIMENSION_IDS.includes(d)),
  'The failure names the dimensions that failed',
  second.failed_dimensions.join(', ')
);
assert(
  second.dimensions.filter(d => d.verdict === 'FAIL').every(d => !!d.reason.trim()),
  'Every failed dimension records why it failed'
);
// The divergence is quantified, not merely asserted — a reader can act on it.
const priceFailure = second.dimensions
  .find(d => d.dimension === 'C-2')?.checks
  .find(c => c.id === 'C-2.10');
assert(
  !!priceFailure && !priceFailure.passed && /\d/.test(priceFailure.detail),
  'A failed check states the measured divergence rather than only that it failed',
  priceFailure?.detail
);
/*
 * R-27's own regression guard, stated from the other side.
 *
 * The economic dimensions must now RECONCILE for a scenario that declares a different scale
 * from the reference instance — 120,000 units a week against 350,000. If C-5, C-7 or C-8 ever
 * fails for this fixture again, the engines have drifted back onto a scenario named by the
 * code rather than the one in scope.
 */
assert(
  ['C-5', 'C-7', 'C-8'].every(
    id => second.dimensions.find(d => d.dimension === id)?.verdict === 'PASS'
  ),
  'The economic dimensions reconcile for a scenario of a different scale — R-27 stays closed',
  ['C-5', 'C-7', 'C-8']
    .map(id => `${id}=${second.dimensions.find(d => d.dimension === id)?.verdict}`)
    .join(', ')
);
assert(
  second.assertion_count === canonical.assertion_count,
  'The same invariant set ran for both scenarios — one framework, many scenarios',
  `${second.assertion_count} vs ${canonical.assertion_count}`
);

console.log('\n=== 3. NOT_APPLICABLE IS DECLARED, NEVER A SILENT PASS =============\n');

const noPromotion = certifyScenario(NO_PROMOTION_SCENARIO);
const c6 = noPromotion.dimensions.find(d => d.dimension === 'C-6')!;

assert(
  c6.verdict === 'NOT_APPLICABLE',
  'A scenario with no committed promotion declares C-6 NOT_APPLICABLE',
  c6.verdict
);
assert(
  !!c6.reason.trim() && /no committed promotion/i.test(c6.reason),
  'The NOT_APPLICABLE verdict carries its governed reason',
  c6.reason
);
assert(
  c6.checks.every(c => !c.applicable),
  'A NOT_APPLICABLE dimension ran no applicable check — it did not pass on the strength of one'
);
assert(
  c6.checks.every(c => !!c.detail.trim()),
  'Every inapplicable check states why it did not run'
);
// §4: NOT_APPLICABLE does not reduce the state below CERTIFIED. FAIL does, absolutely.
assert(
  !noPromotion.failed_dimensions.includes('C-6'),
  'A declared non-applicability is not counted as a failure'
);
assert(
  noPromotion.not_applicable_dimensions.includes('C-6'),
  'A declared non-applicability is reported, so a reader sees what was not examined'
);

// The rule that makes all of the above real: a dimension cannot pass on nothing.
assert(
  deriveDimensionVerdict([]) === 'NOT_APPLICABLE',
  'A dimension with no checks at all is NOT_APPLICABLE, never PASS — the ATL-FINAL rule'
);
assert(
  deriveDimensionVerdict([
    { id: 'x', statement: 's', applicable: false, passed: false, detail: 'why' }
  ]) === 'NOT_APPLICABLE',
  'A dimension whose every check is inapplicable is NOT_APPLICABLE, never PASS'
);
assert(
  deriveDimensionVerdict([
    { id: 'x', statement: 's', applicable: true, passed: false, detail: 'why' },
    { id: 'y', statement: 's', applicable: false, passed: false, detail: 'why' }
  ]) === 'FAIL',
  'One failing applicable check fails the dimension, whatever else is inapplicable'
);

console.log('\n=== 4. A RESULT CANNOT CLAIM WHAT IT HAS NOT SHOWN =================\n');

// NOT_APPLICABLE without a justification is not admissible.
const naNoReason = syntheticResult(dims =>
  dims.map(d => d.dimension === 'C-6'
    ? { ...d, verdict: 'NOT_APPLICABLE' as const, reason: '', checks: [] }
    : d)
);
assert(
  !validateCertificationResult(naNoReason).valid,
  'NOT_APPLICABLE without a recorded reason is refused',
  validateCertificationResult(naNoReason).errors.join('; ')
);
assert(
  certificationStateOf(naNoReason) === 'FAILED',
  'A result carrying an unjustified NOT_APPLICABLE cannot certify'
);

// A FAIL silently relabelled PASS is refused — the verdict is derived from evidence.
const downgraded = syntheticResult(dims =>
  dims.map(d => d.dimension === 'C-2'
    ? {
        ...d,
        verdict: 'PASS' as const,
        reason: 'looks fine',
        checks: [{ id: 'C-2.1', statement: 's', applicable: true, passed: false, detail: 'diverged' }]
      }
    : d)
);
assert(
  !validateCertificationResult(downgraded).valid,
  'A dimension reporting PASS over a failing check is refused',
  validateCertificationResult(downgraded).errors.join('; ')
);
assert(
  certificationStateOf(downgraded) === 'FAILED',
  'Certification cannot silently downgrade FAIL to PASS'
);

// A state asserted over failing dimensions is refused.
const lyingState = { ...syntheticResult(), state: 'CERTIFIED' as const, dimensions: [] as CertificationDimensionResult[] };
assert(
  certificationStateOf(lyingState as any) === 'FAILED',
  'A result claiming CERTIFIED with no dimensions evaluated is FAILED, not certified'
);

// A missing dimension is "not run", never "passed".
const missingDimension = syntheticResult(dims => dims.filter(d => d.dimension !== 'C-11'));
assert(
  !validateCertificationResult(missingDimension).valid
    && validateCertificationResult(missingDimension).errors.some(e => e.includes('C-11')),
  'A dimension that was never evaluated is named rather than assumed to pass'
);

// FAIL without a reason is refused.
const failNoReason = syntheticResult(dims =>
  dims.map(d => d.dimension === 'C-4'
    ? {
        ...d,
        verdict: 'FAIL' as const,
        reason: '',
        checks: [{ id: 'C-4.1', statement: 's', applicable: true, passed: false, detail: 'd' }]
      }
    : d)
);
assert(!validateCertificationResult(failNoReason).valid, 'FAIL without a recorded reason is refused');

// A miscounted assertion total is refused, so coverage cannot be overstated.
const miscounted = { ...syntheticResult(), assertion_count: 9999 };
assert(
  !validateCertificationResult(miscounted).valid,
  'An overstated assertion count is refused — coverage is measured, not claimed'
);

assert(certificationStateOf(null) === 'UNCERTIFIED', 'No certification at all reads as UNCERTIFIED, not FAILED');
assert(
  certificationStateOf(undefined) !== 'CERTIFIED',
  'An absent certification never reads as CERTIFIED'
);

console.log('\n=== 5. ACTIVATION CANNOT BYPASS CERTIFICATION ======================\n');

{
  resetScenarioRegistry();
  installScenarioCertificationGateForTest();

  // A fully certified scenario activates.
  let activated = false;
  try {
    activateScenario(CANONICAL_SCENARIO_ID);
    activated = true;
  } catch { activated = false; }
  assert(activated, 'A fully certified scenario activates');
  assert(getActiveScenarioId() === CANONICAL_SCENARIO_ID, 'Activation records the scenario that was admitted');

  // A scenario failing a mandatory dimension is refused.
  registerSecondScenario();
  let refused = false;
  let refusalReason = '';
  try {
    activateScenario(SECOND_SCENARIO.identity.scenario_id);
  } catch (e: any) { refused = true; refusalReason = e.message; }
  assert(refused, 'A scenario failing a mandatory dimension is refused activation');
  assert(
    /not certified/i.test(refusalReason) && /C-\d/.test(refusalReason),
    'The refusal names the failed dimensions rather than refusing vaguely',
    refusalReason
  );
  assert(
    getActiveScenarioId() === CANONICAL_SCENARIO_ID,
    'A refused activation leaves the previously active scenario untouched'
  );

  // An unregistered scenario cannot be activated at all — there is nothing to certify.
  let unregisteredRefused = false;
  try { activateScenario('SCN-NEVER-REGISTERED'); } catch { unregisteredRefused = true; }
  assert(unregisteredRefused, 'An unregistered scenario cannot be activated');

  // The gate cannot be satisfied by a certifier that throws.
  setScenarioActivationPolicy(
    createCertificationActivationPolicy(() => { throw new Error('engine unavailable'); })
  );
  let throwingRefused = false;
  try { activateScenario(CANONICAL_SCENARIO_ID); } catch { throwingRefused = true; }
  assert(
    throwingRefused,
    'A scenario the gate cannot evaluate is refused — an unevaluable scenario is not a certified one'
  );

  // And a policy that admits everything is what the gate replaces, so prove the seam is real.
  resetScenarioActivationPolicy();
  let admittedWithoutGate = false;
  try { activateScenario(SECOND_SCENARIO.identity.scenario_id); admittedWithoutGate = true; } catch { /* no */ }
  assert(
    admittedWithoutGate,
    'Without the gate installed the same scenario would activate — the gate is what refuses it, not the registry'
  );

  resetScenarioRegistry();
  installScenarioCertificationGateForTest();
}

console.log('\n=== 6. RESET RETURNS THE CERTIFIED OPENING STATE ===================\n');

{
  const params: DecisionScenarioParameters = {
    promotion_lift: CANONICAL_SCENARIO.economics.promotion_depth_pct,
    supplier_capacity_cap: Math.round((CANONICAL_SCENARIO.supply.supplier_capacity_index - 1) * 100),
    forecast_horizon_days: CANONICAL_SCENARIO.calendar.forecast_horizon_days,
    promotion_method: '20_percent_off',
    campaign_scope: 'national',
    cannibalisation_factor: 0,
    event_boost: 'none'
  };

  const opening = calculateDerivedImpacts(params, []);
  const moved = calculateDerivedImpacts({ ...params, promotion_lift: 35 }, ['SLA_FLEX_RULE_4']);
  const restored = calculateDerivedImpacts(params, []);

  assert(JSON.stringify(moved) !== JSON.stringify(opening), 'Moving the scenario changes its position');
  assert(
    JSON.stringify(restored) === JSON.stringify(opening),
    'Reset returns the scenario to its opening position exactly, field by field'
  );

  // The position reset returns to is the one that certified.
  const afterReset = certifyScenario(CANONICAL_SCENARIO);
  assert(
    afterReset.state === 'CERTIFIED' && JSON.stringify(afterReset) === JSON.stringify(canonical),
    'The scenario still certifies identically after a move and a reset'
  );

  // Identity survives activation and reset.
  resetScenarioRegistry();
  installScenarioCertificationGateForTest();
  activateScenario(CANONICAL_SCENARIO_ID);
  assert(
    getActiveScenarioId() === CANONICAL_SCENARIO_ID,
    'Scenario identity survives activation'
  );
  resetScenarioRegistry();
  installScenarioCertificationGateForTest();
  assert(
    getActiveScenarioId() === CANONICAL_SCENARIO_ID,
    'Scenario identity survives a registry reset and is still the reference scenario'
  );
  assert(
    scenarioWeeklyPopulationUnits(CANONICAL_SCENARIO) === 350_000
      && scenarioRealisedRevenuePerUnitGbp(CANONICAL_SCENARIO) === 2.07,
    'The reference scenario\'s own declared position is unchanged by any of the above'
  );
}

console.log('\n=== 7. THE CATALOGUE RUN ==========================================\n');

{
  resetScenarioRegistry();
  const results = certifyRegisteredScenarios();
  assert(results.length >= 1, 'Certification runs over the registered catalogue', String(results.length));
  assert(
    results.every(r => validateCertificationResult(r).valid),
    'Every catalogue result is admissible'
  );
  assert(
    results.every(r => r.harness_version === CERTIFICATION_HARNESS_VERSION),
    'Every result records the harness version that produced it'
  );
  const summary = summariseCertification(results[0]);
  assert(
    summary.includes(CANONICAL_SCENARIO_ID) && /certified/i.test(summary),
    'The summary is a sentence a reader can act on',
    summary
  );

  // Registering an uncertifiable scenario does not make the catalogue uncertified — it
  // makes that scenario uncertified, which is the point of a per-scenario gate.
  registerSecondScenario();
  const both = certifyRegisteredScenarios();
  assert(both.length === 2, 'Both registered scenarios are certified independently');
  assert(
    both.find(r => r.scenario_id === CANONICAL_SCENARIO_ID)?.state === 'CERTIFIED'
      && both.find(r => r.scenario_id === SECOND_SCENARIO.identity.scenario_id)?.state === 'FAILED',
    'One scenario failing does not affect the other\'s verdict'
  );

  resetScenarioRegistry();
  installScenarioCertificationGateForTest();
}

/** Re-install the gate after a registry reset clears the policy. */
function installScenarioCertificationGateForTest(): void {
  uninstallScenarioCertificationGate();
  installScenarioCertificationGate();
}

console.log(`\n=================================================================`);
console.log(`Passed: ${passed}   Failed: ${failed}`);
console.log(`=================================================================\n`);
process.exit(failed === 0 ? 0 : 1);
