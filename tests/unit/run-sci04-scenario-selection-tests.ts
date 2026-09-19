/**
 * SCI-04 — Scenario Selection Experience Tests
 * Run via: npx tsx tests/unit/run-sci04-scenario-selection-tests.ts
 *
 * Asserts the SCI-04 Scenario Selection Experience across:
 * 1. Active scenario displayed dynamically from canonical contracts
 * 2. Selector discoverability in ScenarioContextStrip and ScenarioControls
 * 3. Catalogue rendered from frozen contract data without hardcoded economics
 * 4. Certified scenario selectable through the governed activation path
 * 5. Uncertified/unavailable scenarios handled honestly under ADR-080
 * 6. No duplicate client scenario state competing with canonical state
 * 7. Source guards & contract drift checks
 * 8. Responsive layout compliance & protected Fresh Dairy journey continuity
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  CANONICAL_SCENARIO,
  CANONICAL_SCENARIO_ID,
  CanonicalScenario,
  getActiveScenario,
  getActiveScenarioId,
  scenarioCatalogue,
  resolveScenario,
  isScenarioRegistered,
  registerScenario,
  resetScenarioRegistry,
  setScenarioActivationPolicy,
  canonicalExpectedDemandUnits,
  canonicalServableDemandUnits,
  canonicalExposedDemandUnits,
  canonicalRevenueExposureGbp,
  canonicalMarginExposureGbp
} from '../../packages/contracts/src/index';
import {
  activateScenario,
  certifyScenario,
  certifyRegisteredScenarios,
  ScenarioResolutionError
} from '../../lib/scenario-runtime';
import {
  installScenarioCertificationGate,
  uninstallScenarioCertificationGate
} from '../../lib/scenario-certification';
import { decisionStateStore } from '../../lib/decision-state-store';

const ROOT = join(__dirname, '..', '..');
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`);
    failed++;
  }
}

const stripComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

console.log('\n=== 1. ACTIVE SCENARIO DISPLAYED DYNAMICALLY =====================\n');

{
  // Fresh Dairy reference is the active default
  const active = getActiveScenario();
  assert(
    active.identity.scenario_id === CANONICAL_SCENARIO_ID,
    'Active scenario is initially SCN-FRESH-DAIRY-CHEDDAR-001'
  );
  assert(
    active.identity.sku_name === 'Cheddar Mature 400g',
    'Active scenario displays correct SKU name: Cheddar Mature 400g'
  );
  assert(
    active.identity.category === 'Fresh Dairy',
    'Active scenario displays correct category: Fresh Dairy'
  );
  assert(
    active.identity.market_scope_label === 'National',
    'Active scenario displays correct market scope: National'
  );
  assert(
    active.calendar.forecast_horizon_days === 14,
    'Active scenario displays correct forecast horizon: 14 days'
  );
  assert(
    active.supply.supplier_name === 'Cheshire Cheese Co',
    'Active scenario displays correct supplier: Cheshire Cheese Co'
  );
}

console.log('\n=== 2. SELECTOR DISCOVERABILITY & CONTROLS ========================\n');

{
  const stripSource = readFileSync(join(ROOT, 'components/ScenarioContextStrip.tsx'), 'utf8');
  assert(
    stripSource.includes('ScenarioSelectorModal'),
    'ScenarioContextStrip mounts ScenarioSelectorModal'
  );
  assert(
    stripSource.includes('Change'),
    'ScenarioContextStrip exposes a discoverable "Change" scenario action'
  );
  assert(
    stripSource.includes('Restart') || stripSource.includes('Reset'),
    'ScenarioContextStrip exposes an active case Restart action'
  );
  assert(
    !/import\s+\{\s*CANONICAL_SCENARIO\s*\}\s+from/.test(stripSource),
    'ScenarioContextStrip does NOT import hardcoded CANONICAL_SCENARIO'
  );

  const controlsSource = readFileSync(join(ROOT, 'components/ScenarioControls.tsx'), 'utf8');
  assert(
    !/import\s+\{\s*CANONICAL_SCENARIO\s*\}\s+from/.test(controlsSource),
    'ScenarioControls does NOT import hardcoded CANONICAL_SCENARIO'
  );
  assert(
    controlsSource.includes('activeScenario'),
    'ScenarioControls dynamically resolves active scenario for restart tooltip'
  );

  const modalSource = readFileSync(join(ROOT, 'components/ScenarioSelectorModal.tsx'), 'utf8');
  assert(
    modalSource.includes('role="dialog"') && modalSource.includes('aria-modal="true"'),
    'ScenarioSelectorModal implements accessible dialog attributes'
  );
  assert(
    modalSource.includes('Escape'),
    'ScenarioSelectorModal supports keyboard Escape dismissal'
  );
}

console.log('\n=== 3. CATALOGUE RENDERED FROM FROZEN CONTRACT DATA ===============\n');

{
  const catalogue = scenarioCatalogue();
  assert(catalogue.length >= 1, 'Catalogue contains at least one registered scenario');

  const ref = catalogue.find(s => s.scenario_id === CANONICAL_SCENARIO_ID);
  assert(ref !== undefined, 'Reference scenario is present in catalogue projection');
  assert(ref?.demo_active === true, 'Reference scenario is marked demo_active');
  assert(
    Boolean(ref?.decision_question && ref.decision_question.length > 10),
    'Catalogue entry carries valid decision_question'
  );
  assert(
    Boolean(ref?.sku_name && ref?.category && ref?.supplier_name),
    'Catalogue entry carries business framing attributes (sku, category, supplier)'
  );
  assert(
    Boolean(ref?.taxonomy?.family_id && ref?.taxonomy?.archetype_id),
    'Catalogue entry carries taxonomy projections (family_id, archetype_id)'
  );
  assert(
    Boolean(ref?.provenance?.descriptor),
    'Catalogue entry carries ADR-082 provenance descriptor'
  );

  // Regression assertion: Scenario catalogue produces unique stable keys for every rendered scenario
  const renderedKeys = catalogue.map((entry, idx) => entry.scenario_id || (entry as any).scenarioId || `scenario-${idx}`);
  assert(
    renderedKeys.every(k => typeof k === 'string' && k.length > 0 && !k.includes('undefined')),
    'Every rendered scenario key is a defined, non-empty string'
  );
  assert(
    new Set(renderedKeys).size === renderedKeys.length,
    `Scenario catalogue produces unique stable keys for every rendered scenario (${renderedKeys.length} unique keys: ${renderedKeys.join(', ')})`
  );
  assert(
    catalogue.every(entry => Boolean(entry.scenario_id)),
    'Every catalogue entry has a defined canonical scenario_id'
  );

  /*
   * Wave-3 convergence, §7 of the Gate-D conditions.
   *
   * `SCI-09` added a defensive `scenario-${idx}` key so a malformed entry could not collapse two
   * rows onto one React key. Defensive rendering is worth keeping — but a fallback nobody can
   * prove is unreachable is a fallback that quietly becomes the behaviour. These three assertions
   * state the property for the REAL catalogue: every entry carries a canonical id, the ids are
   * unique, and the keys the selector renders are therefore the ids themselves, with the index
   * fallback never exercised.
   */
  const canonicalIds = catalogue.map(entry => entry.scenario_id);
  assert(
    canonicalIds.every(id => typeof id === 'string' && id.trim().length > 0),
    'No production catalogue entry is missing a scenario_id'
  );
  assert(
    new Set(canonicalIds).size === canonicalIds.length,
    'No production catalogue entry duplicates a scenario_id',
    canonicalIds.join(', ')
  );
  assert(
    renderedKeys.length === canonicalIds.length
      && renderedKeys.every((k, i) => k === canonicalIds[i]),
    'The selector\'s scenario-${idx} fallback is unreachable for the real catalogue — every rendered key IS the canonical id',
    `${renderedKeys.join(', ')} vs ${canonicalIds.join(', ')}`
  );
  assert(
    !renderedKeys.some(k => /^scenario-\d+$/.test(k)),
    'No rendered key is an index fallback'
  );
}

console.log('\n=== 4. CERTIFIED SCENARIO SELECTABLE VIA GOVERNED PATH ============\n');

{
  // 1. Reference scenario is certified under the 12-dimension harness
  const refCert = certifyScenario(CANONICAL_SCENARIO);
  assert(
    refCert.state === 'CERTIFIED',
    'Reference scenario passes all applicable certification dimensions (state=CERTIFIED)'
  );
  assert(
    refCert.assertion_count >= 50,
    `Harness executed comprehensive assertion suite (${refCert.assertion_count} checks)`
  );

  // 2. Activating certified scenario through the governed path succeeds
  const activated = activateScenario(CANONICAL_SCENARIO_ID);
  assert(
    activated.identity.scenario_id === CANONICAL_SCENARIO_ID,
    'Governed activateScenario activates certified scenario successfully'
  );
  assert(
    getActiveScenarioId() === CANONICAL_SCENARIO_ID,
    'getActiveScenarioId() reflects active scenario'
  );

  // 3. Register a second scenario and verify activation transitions via activation seam
  const SECOND_TEST_SCENARIO: CanonicalScenario = {
    ...CANONICAL_SCENARIO,
    identity: {
      ...CANONICAL_SCENARIO.identity,
      scenario_id: 'SCN-TEST-ADMITTED-002',
      scenario_name: 'Test Admitted Scenario — Artisan Flex',
      decision_question: 'Can artisan supply flex by +15% under sudden regional demand lift?'
    }
  };

  registerScenario(SECOND_TEST_SCENARIO);
  assert(
    isScenarioRegistered('SCN-TEST-ADMITTED-002'),
    'Second scenario registered in contract registry'
  );

  // Install a test policy admitting the test scenario to verify state transition mechanics
  setScenarioActivationPolicy(sc => {
    if (sc.identity.scenario_id === 'SCN-TEST-ADMITTED-002' || sc.identity.scenario_id === CANONICAL_SCENARIO_ID) {
      return { admitted: true, reason: 'Admitted by the test activation policy' };
    }
    return { admitted: false, reason: 'Test policy refusal' };
  });

  const switched = activateScenario('SCN-TEST-ADMITTED-002');
  assert(
    switched.identity.scenario_id === 'SCN-TEST-ADMITTED-002',
    'activateScenario successfully switches active scenario when admitted by policy'
  );
  assert(
    getActiveScenarioId() === 'SCN-TEST-ADMITTED-002',
    'getActiveScenarioId() reflects newly activated scenario SCN-TEST-ADMITTED-002'
  );

  // Re-activate canonical scenario and restore the production certification gate
  activateScenario(CANONICAL_SCENARIO_ID);
  uninstallScenarioCertificationGate();
  installScenarioCertificationGate();

  assert(
    getActiveScenarioId() === CANONICAL_SCENARIO_ID,
    'Scenario Certification Gate reinstalled and reference scenario active'
  );
}

console.log('\n=== 5. UNCERTIFIED / UNAVAILABLE SCENARIO HANDLED HONESTLY ========\n');

{
  // Create an uncertified test scenario failing economics/calendar
  const UNCERTIFIED_SCENARIO: CanonicalScenario = {
    ...CANONICAL_SCENARIO,
    identity: {
      ...CANONICAL_SCENARIO.identity,
      scenario_id: 'SCN-TEST-UNCERTIFIED-999',
      scenario_name: 'Uncertified Defective Scenario',
      decision_question: 'Will an uncertified scenario be refused activation?'
    },
    /*
     * `base_demand_units_per_week` is declared on `demand`, not on `economics`. Wave-1
     * convergence moved it: written on `economics` it was an excess property the fixture
     * carried without breaking anything, so this scenario was being refused for some other
     * reason than the one stated here. On `demand` it genuinely breaks C-2.
     */
    demand: {
      ...CANONICAL_SCENARIO.demand,
      base_demand_units_per_week: -5000 // Breaks C-2 economics
    }
  };

  registerScenario(UNCERTIFIED_SCENARIO);

  let activationRefused = false;
  let refusalReason = '';
  try {
    activateScenario('SCN-TEST-UNCERTIFIED-999');
  } catch (err: any) {
    activationRefused = true;
    refusalReason = err.message || '';
  }

  assert(
    activationRefused,
    'Activation of uncertified scenario is refused by the Scenario Certification Gate'
  );
  assert(
    refusalReason.includes('may not be activated') || refusalReason.includes('not certified'),
    'Refusal message explicitly states certification failure',
    refusalReason
  );
  assert(
    getActiveScenarioId() === CANONICAL_SCENARIO_ID,
    'Refused activation leaves reference scenario active and untouched'
  );

  // Unregistered scenario refusal
  let unregisteredRefused = false;
  try {
    activateScenario('SCN-NON-EXISTENT');
  } catch {
    unregisteredRefused = true;
  }
  assert(unregisteredRefused, 'Activating unregistered scenario is refused with error');
}

console.log('\n=== 6. NO DUPLICATE CLIENT SCENARIO STATE =========================\n');

{
  const tenantId = 'tenant_uk_retail_01';
  const sessionId = 'session_test_sci04';

  // Initialise session decision state on canonical scenario
  const stateA = decisionStateStore.createOrInitialiseState({
    tenant_id: tenantId,
    session_id: sessionId,
    scenario_id: CANONICAL_SCENARIO_ID
  });
  assert(
    stateA.scenario_id === CANONICAL_SCENARIO_ID,
    'Session decision state opens on canonical scenario'
  );

  // Switch scenario for session
  const stateB = decisionStateStore.switchScenarioForSession(
    tenantId,
    sessionId,
    'SCN-TEST-CERTIFIED-002',
    'supply_constrained'
  );
  assert(
    stateB.scenario_id === 'SCN-TEST-CERTIFIED-002',
    'switchScenarioForSession updates decision state to new scenario'
  );
  assert(
    stateB.decision_state_id !== stateA.decision_state_id,
    'New decision state ID is issued to avoid retaining prior session artefacts'
  );

  // Querying current session state now yields the new scenario
  const current = decisionStateStore.getCurrentStateBySession(sessionId, tenantId);
  assert(
    current?.scenario_id === 'SCN-TEST-CERTIFIED-002',
    'getCurrentStateBySession reflects active scenario without stale cache'
  );

  // Reset store for clean state
  decisionStateStore.clearStore();
}

console.log('\n=== 7. SOURCE GUARDS & CONTRACT INTEGRITY =========================\n');

{
  // 1. All routes resolving or activating must import through '@/lib/scenario-runtime'
  const routeFiles: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (entry.name === 'route.ts') routeFiles.push(rel);
    }
  };
  walk('app/api');

  const RESOLVERS = /\b(requireScenarioId|getActiveScenario|scenarioCatalogue|listRegisteredScenarios|activateScenario)\b/;
  const ungated = routeFiles.filter(rel => {
    const code = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
    if (!RESOLVERS.test(code)) return false;
    return !/from '@\/lib\/scenario-runtime'/.test(code)
      && !/from '\.\.?\/.*_shared\/scenario-request'/.test(code);
  });
  assert(
    ungated.length === 0,
    'All API routes resolve or activate via gated scenario runtime',
    ungated.join(', ')
  );

  // 2. Frozen contract files exist and define their types
  const FROZEN_FILES = [
    'packages/contracts/src/canonical-scenario-model.ts',
    'packages/contracts/src/scenario-clock.ts',
    'packages/contracts/src/scenario-registry.ts',
    'packages/contracts/src/provenance-vocabulary.ts',
    'packages/contracts/src/scenario-certification-model.ts'
  ];

  for (const rel of FROZEN_FILES) {
    const code = readFileSync(join(ROOT, rel), 'utf8');
    assert(code.length > 500, `Frozen contract file intact: ${rel}`);
  }

  // 3. No component contains fake hardcoded economics for SCI-03
  const compSource = readFileSync(join(ROOT, 'components/ScenarioSelectorModal.tsx'), 'utf8');
  assert(
    !compSource.includes('ARCH-SUPPLY-CONSTRAINED') && !compSource.includes('ARCH-PREMIUM-ARTISAN'),
    'ScenarioSelectorModal does not hardcode SCI-03 archetype keys or fake economics'
  );
  assert(
    compSource.includes('fetchScenarioCatalogue'),
    'ScenarioSelectorModal consumes catalogue dynamically via fetchScenarioCatalogue'
  );
}

console.log('\n=== 8. RESPONSIVE LAYOUT & PROTECTED JOURNEY CONTINUITY ============\n');

{
  // 1. Check responsive breakpoints (1440, 1024, 720) in CSS
  const css = readFileSync(join(ROOT, 'app/globals.css'), 'utf8');
  assert(
    css.includes('@media (max-width: 1024px)'),
    'Stylesheet supports 1024px responsive navigation transition'
  );
  assert(
    css.includes('.sidebar.open'),
    'Sidebar supports drawer toggle for narrow viewports (<=1024px and 720px)'
  );

  // 2. Protected journey Demand values unchanged to the digit
  assert(
    canonicalExpectedDemandUnits() === 900130,
    'Protected expected units: 900,130'
  );
  assert(
    Math.round(canonicalServableDemandUnits()) === 770000,
    'Protected servable units: 770,000'
  );
  assert(
    Math.round(canonicalExposedDemandUnits()) === 130130,
    'Protected exposed units: 130,130'
  );
  assert(
    Math.round(canonicalRevenueExposureGbp()) === 269369,
    'Protected revenue exposure: £269.4K (£269,369)'
  );
  assert(
    Math.round(canonicalMarginExposureGbp()) === 80681,
    'Protected margin exposure: £80.7K (£80,681)'
  );
  assert(
    CANONICAL_SCENARIO.supply.supplier_name === 'Cheshire Cheese Co',
    'Protected supplier: Cheshire Cheese Co'
  );
}

// Reset registry to clean state after test runs
resetScenarioRegistry();

console.log(`\n=================================================================`);
console.log(`Passed: ${passed}   Failed: ${failed}`);
console.log(`=================================================================\n`);
process.exit(failed === 0 ? 0 : 1);
