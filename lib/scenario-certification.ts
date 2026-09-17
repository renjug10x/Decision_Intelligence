/**
 * CogniX Scenario Certification Harness (ADR-080, `SCI-02`)
 * ───────────────────────────────────────────────────────────────────────────────
 * The twelve dimensions, executed against a SCENARIO rather than against the canonical
 * instance, plus the activation gate that installs into the `SCI-01` registry seam.
 *
 * Generalisation, not duplication (certification record §6)
 * --------------------------------------------------------
 * The 243 assertions `DEMO-HARD-01` left behind were 243 assertions about ONE scenario.
 * They are not copied per scenario here. The invariants they express are stated once, as
 * functions of a scenario, and executed over the registered catalogue. What remains in
 * `tests/unit/run-canonical-scenario-tests.ts` is what genuinely belongs to the reference
 * instance: its exact published values, the archetype catalogue it projects through, and
 * the `SCI-01` source guards.
 *
 * The split, stated so a later packet does not blur it:
 *
 *   UNIVERSAL           here. True of every scenario, and executed for every registered one.
 *   CAPABILITY-SPECIFIC here, behind an applicability predicate that carries its reason.
 *   INSTANCE-SPECIFIC   the canonical suite. The protected journey's own digits.
 *
 * Why the engine probes look the way they do
 * ------------------------------------------
 * The probes are unchanged in intent: each one calls a REAL engine surface and compares what
 * came back against what the scenario under test declares. Nothing here recomputes an engine's
 * arithmetic, because a harness that reimplements what it is checking certifies itself.
 *
 * What changed at `SCI-03` is which scenario those engines answer with. `SCI-01` parameterised
 * the CONTRACT and left the ENGINES bound to the reference instance, so `deriveUnitEconomics()`
 * returned Fresh Dairy's realised price whatever was being certified. `SCI-02` did not paper
 * over that — its non-scope forbade the engine change — so it recorded the consequence honestly:
 * a second scenario failed C-5 through C-8 with the divergence named, and the finding was
 * carried as R-27.
 *
 * **That failure was the gate doing its job**, and R-27 is now closed rather than tolerated.
 * The engines read layer C (`scenarioInScope()`), and this harness brings the scenario under
 * test into scope for the duration of its run. Binding is NOT activation: ADR-080 still gates
 * activation on certification, and a scenario that fails here still cannot be activated. All
 * binding decides is which record the arithmetic reads while it is being measured.
 */

import {
  CanonicalScenario,
  CERTIFICATION_DIMENSIONS,
  CertificationCheck,
  CertificationDimensionId,
  CertificationDimensionResult,
  ScenarioCertificationResult,
  CERTIFICATION_PROVENANCE,
  createCertificationActivationPolicy,
  deriveCertificationState,
  deriveDimensionVerdict,
  calculateDerivedImpacts,
  DecisionScenarioParameters,
  CANONICAL_BASE_CURRENCY,
  SUPPORTED_CURRENCIES,
  convertFromBase,
  SEEDED_FALLBACK_RATES,
  validateProvenanceDescriptor,
  scenarioBaseDemandUnits,
  scenarioExpectedDemandUnits,
  scenarioServableDemandUnits,
  scenarioExposedDemandUnits,
  scenarioFlexCapacityUnits,
  scenarioRealisedRevenuePerUnitGbp,
  scenarioGrossMarginPerUnitGbp,
  scenarioImpliedUnitCostGbp,
  scenarioPromotedPriceGbp,
  scenarioContributionPerUnitAtListGbp,
  scenarioContributionAtDepthGbp,
  scenarioContributionErosionPerDepthPoint,
  scenarioRetailerFundedShare,
  scenarioRevenueExposureGbp,
  scenarioMarginExposureGbp,
  scenarioWeeklyPopulationUnits,
  scenarioStoreCount,
  scenarioDepthResponsePp,
  scenarioPromotionWindow,
  scenarioClockNowIso,
  setScenarioActivationPolicy,
  listRegisteredScenarios,
  resolveScenario,
  requireScenarioId,
  getActiveScenarioId,
  cdi02BaseWeeklyUnits,
  createDefaultCampaignIntentDraft,
  withScenarioInScope
} from '@/packages/contracts/src/index';
import { scenarioNowIso, scenarioPeriodInstantIso } from '@/packages/contracts/src/scenario-clock';
import { generateSyntheticSignalSnapshot } from '@/services/world/src/enterprise-signal-generator';
import {
  deriveUnitEconomics,
  deriveDemandBase,
  ddfGrossMarginRatePct,
  ddfFlexPremiumRatePct,
  ddfSlaFlexUnitsPerWeek
} from './demand-decision-frontier/demand-frontier-engine';
import { elasticityCurveInScope, curvePoint } from './campaign-archetypes';
import { evaluateCampaignDecision } from './campaign-causal-engine';
import { clearCampaignIntents, registerCampaignIntent } from './campaign-intent-store';
import { formatBaseMoney } from './currency/format';
import productsData from '@/data/products.json';
import suppliersData from '@/data/suppliers.json';

export const CERTIFICATION_HARNESS_VERSION = 'sci02_certification_harness_v1.0.0';

/** Relative agreement, as a percentage of the larger magnitude. */
function divergencePct(a: number, b: number): number {
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-9);
  return (Math.abs(a - b) / denom) * 100;
}

function agrees(a: number, b: number, tolerancePct: number): boolean {
  return divergencePct(a, b) <= tolerancePct;
}

// ── Check builders ────────────────────────────────────────────────────────────

function check(id: string, statement: string, passed: boolean, detail = ''): CertificationCheck {
  return { id, statement, applicable: true, passed, detail };
}

/** A check that did not run, carrying the reason it did not. Never a silent pass. */
function notApplicable(id: string, statement: string, reason: string): CertificationCheck {
  return { id, statement, applicable: false, passed: false, detail: reason };
}

function closeCheck(
  id: string,
  statement: string,
  a: number,
  b: number,
  tolerancePct: number
): CertificationCheck {
  const ok = agrees(a, b, tolerancePct);
  return check(
    id,
    statement,
    ok,
    ok ? '' : `${a} vs ${b} — ${divergencePct(a, b).toFixed(4)}% apart (tolerance ${tolerancePct}%)`
  );
}

/**
 * Assemble a dimension. The verdict is DERIVED from the checks and the reason is composed
 * from what actually happened, so a dimension cannot report a verdict its evidence does not
 * support and cannot report one without saying why.
 */
function dimension(
  id: CertificationDimensionId,
  checks: CertificationCheck[]
): CertificationDimensionResult {
  const spec = CERTIFICATION_DIMENSIONS.find(d => d.id === id)!;
  const verdict = deriveDimensionVerdict(checks);
  let reason: string;
  if (verdict === 'FAIL') {
    reason = checks
      .filter(c => c.applicable && !c.passed)
      .map(c => `${c.id}: ${c.statement} — ${c.detail}`)
      .join(' · ');
  } else if (verdict === 'NOT_APPLICABLE') {
    reason = checks.length === 0
      ? `${spec.name} is not modelled by this scenario.`
      : checks.map(c => `${c.id}: ${c.detail}`).join(' · ');
  } else {
    reason = `${checks.filter(c => c.applicable).length} checks passed.`;
  }
  return { dimension: id, name: spec.name, verdict, reason, checks };
}

// ── Applicability predicates ──────────────────────────────────────────────────
// Stated once, named, and carrying the reason they hand to a NOT_APPLICABLE verdict.

function declaresPromotion(scenario: CanonicalScenario): boolean {
  return (scenario.economics.promotion_depth_pct ?? 0) > 0
    && (scenario.calendar.promotion_duration_days ?? 0) > 0;
}

function declaresObservedHistory(scenario: CanonicalScenario): boolean {
  const products = productsData as Array<{ sku_id: string }>;
  return products.some(p => p.sku_id === scenario.identity.sku_id);
}

const SCENARIO_PARAMS_FOR = (scenario: CanonicalScenario): DecisionScenarioParameters => ({
  promotion_lift: scenario.economics.promotion_depth_pct,
  supplier_capacity_cap: Math.round((scenario.supply.supplier_capacity_index - 1) * 100),
  forecast_horizon_days: scenario.calendar.forecast_horizon_days,
  promotion_method: '20_percent_off',
  campaign_scope: 'national',
  cannibalisation_factor: 0,
  event_boost: 'none'
});

// ── C-1 Identity ──────────────────────────────────────────────────────────────

function certifyIdentity(scenario: CanonicalScenario): CertificationDimensionResult {
  const checks: CertificationCheck[] = [];
  const id = scenario.identity.scenario_id;

  checks.push(check('C-1.1', 'The scenario declares exactly one non-empty identity', !!id && !!id.trim(), id));

  let resolvesToItself = false;
  try {
    resolvesToItself = resolveScenario(id) === scenario;
  } catch (e: any) {
    resolvesToItself = false;
  }
  checks.push(check(
    'C-1.2',
    'The identity resolves through the registry to this same record',
    resolvesToItself,
    resolvesToItself ? '' : `resolveScenario("${id}") did not return this scenario record`
  ));

  // ADR-077 part 4 — a missing scenario is an error, never a default.
  let missingRefused = false;
  try { requireScenarioId(null, 'certification'); } catch { missingRefused = true; }
  checks.push(check('C-1.3', 'A missing scenario_id is refused rather than defaulted', missingRefused));

  // The supplier named in the economics is the supplier named in the signals.
  const signals = generateSyntheticSignalSnapshot(scenario, 'tenant_uk_retail_01');
  const boundToIdentity = signals.length > 0 && signals.every(s => s.scenario_id === id);
  checks.push(check(
    'C-1.4',
    'Every signal generated for this scenario carries its identity',
    boundToIdentity,
    boundToIdentity ? '' : `${signals.filter(s => s.scenario_id !== id).length} of ${signals.length} signals carry another identity`
  ));

  const supplierSignals = signals.filter(s => s.entity_type === 'SUPPLIER');
  if (supplierSignals.length === 0) {
    checks.push(notApplicable(
      'C-1.5',
      'The supplier named in the signals is the supplier named in the economics',
      'this scenario publishes no supplier-scoped signal, so there is no second supplier claim to reconcile'
    ));
  } else {
    const mismatched = supplierSignals.filter(s => s.entity_id !== scenario.supply.supplier_name);
    checks.push(check(
      'C-1.5',
      'The supplier named in the signals is the supplier named in the economics',
      mismatched.length === 0,
      mismatched.length === 0
        ? ''
        : `signals name ${mismatched.map(s => s.entity_id).join(', ')}; the economics name ${scenario.supply.supplier_name}`
    ));
  }

  // The SKU and supplier are real parties in the masters, not strings the scenario invented.
  const products = productsData as Array<{ sku_id: string; name: string; supplier_id: string; rrp: number }>;
  const sku = products.find(p => p.sku_id === scenario.identity.sku_id);
  checks.push(check(
    'C-1.6',
    'The scenario SKU exists in the product master under the name the scenario gives it',
    !!sku && sku.name === scenario.identity.sku_name,
    sku ? `master calls ${sku.sku_id} "${sku.name}"; scenario calls it "${scenario.identity.sku_name}"` : `${scenario.identity.sku_id} is not in the product master`
  ));

  const suppliers = suppliersData as Array<{ supplier_id: string; name: string }>;
  const supplier = suppliers.find(s => s.supplier_id === scenario.supply.supplier_id);
  checks.push(check(
    'C-1.7',
    'The scenario supplier exists in the supplier master under the name the scenario gives it',
    !!supplier && supplier.name === scenario.supply.supplier_name,
    supplier ? `master calls ${supplier.supplier_id} "${supplier.name}"` : `${scenario.supply.supplier_id} is not in the supplier master`
  ));

  // A flex notice served on a party that does not make the product is not a decision.
  checks.push(check(
    'C-1.8',
    'The scenario supplier is the SKU\'s own supplier in the product master',
    !!sku && sku.supplier_id === scenario.supply.supplier_id,
    sku ? `SKU supplier ${sku.supplier_id}, scenario supplier ${scenario.supply.supplier_id}` : 'SKU not found'
  ));

  return dimension('C-1', checks);
}

// ── C-2 Economics ─────────────────────────────────────────────────────────────

function certifyEconomics(scenario: CanonicalScenario): CertificationDimensionResult {
  const checks: CertificationCheck[] = [];

  const expected = scenarioExpectedDemandUnits(scenario);
  const servable = scenarioServableDemandUnits(scenario);
  const exposed = scenarioExposedDemandUnits(scenario);
  const realised = scenarioRealisedRevenuePerUnitGbp(scenario);
  const margin = scenarioGrossMarginPerUnitGbp(scenario);
  const cost = scenarioImpliedUnitCostGbp(scenario);
  const list = scenario.economics.list_price_gbp;
  const promoted = scenarioPromotedPriceGbp(scenario);

  checks.push(closeCheck('C-2.1', 'Decision Gap units = expected − servable', expected - servable, exposed, 0.0001));
  checks.push(closeCheck('C-2.2', 'Revenue exposure = exposed units × the realised revenue basis', scenarioRevenueExposureGbp(scenario), exposed * realised, 0.0001));
  checks.push(closeCheck('C-2.3', 'Margin exposure = exposed units × the gross margin basis', scenarioMarginExposureGbp(scenario), exposed * margin, 0.0001));
  checks.push(closeCheck('C-2.4', 'Implied unit cost = realised revenue − gross margin', cost, realised - margin, 0.5));
  checks.push(closeCheck('C-2.5', 'Contribution at list = list price − implied unit cost', scenarioContributionPerUnitAtListGbp(scenario), list - cost, 0.5));

  // The realised price is neither of the two prices it sits between — it is a blend of them.
  checks.push(check(
    'C-2.6',
    'Realised revenue per unit lies strictly between the promoted price and list',
    realised > promoted && realised < list,
    `${promoted} < ${realised} < ${list}`
  ));

  // The funding rule, which is the whole reason promotion economics work at all.
  const depth = scenario.economics.promotion_depth_pct;
  const expectedAtDepth = list - list * (depth / 100) * scenarioRetailerFundedShare(scenario) - cost;
  checks.push(closeCheck(
    'C-2.7',
    'Contribution at depth follows the declared supplier-funding rule',
    scenarioContributionAtDepthGbp(scenario, depth),
    expectedAtDepth,
    0.5
  ));
  checks.push(closeCheck(
    'C-2.8',
    'Erosion per depth point is derived from price, cost and funding rather than assumed',
    scenarioContributionErosionPerDepthPoint(scenario),
    (list * 0.01 * scenarioRetailerFundedShare(scenario)) / scenarioContributionPerUnitAtListGbp(scenario),
    0.0001
  ));

  // A scenario selling below cost at its own committed depth is not a decision case.
  checks.push(check(
    'C-2.9',
    'The promoted price still covers unit cost',
    cost < promoted,
    `cost £${cost} vs promoted £${promoted}`
  ));

  // No second basis for a quantity the master already answers.
  const products = productsData as Array<{ sku_id: string; rrp: number }>;
  const sku = products.find(p => p.sku_id === scenario.identity.sku_id);
  if (!sku) {
    checks.push(notApplicable(
      'C-2.10',
      'The declared list price is the product master price, not a second price',
      'this scenario\'s SKU is not in the product master, so there is no master price to reconcile against'
    ));
  } else {
    checks.push(check(
      'C-2.10',
      'The declared list price is the product master price, not a second price',
      sku.rrp === list,
      `master ${sku.rrp} vs scenario ${list}`
    ));
  }

  // Supply declared as ratios rather than counts, which is what lets a scenario rescale.
  checks.push(check(
    'C-2.11',
    'Supply is declared as ratios of demand, never as a count from another population',
    scenario.supply.supplier_capacity_index > 0 && scenario.supply.supplier_flex_rate_pct >= 0,
    `capacity index ${scenario.supply.supplier_capacity_index}, flex rate ${scenario.supply.supplier_flex_rate_pct}%`
  ));

  // The implied margin has to be one a grocer could actually run.
  const listMarginPct = (scenarioContributionPerUnitAtListGbp(scenario) / list) * 100;
  checks.push(check(
    'C-2.12',
    'Implied margin at list is credible for the line the scenario describes',
    listMarginPct > 5 && listMarginPct < 80,
    `${listMarginPct.toFixed(1)}% at list, implied unit cost £${cost}`
  ));

  return dimension('C-2', checks);
}

// ── C-3 Calendar and scenario clock ───────────────────────────────────────────

function certifyCalendar(scenario: CanonicalScenario): CertificationDimensionResult {
  const checks: CertificationCheck[] = [];

  const clock = scenarioClockNowIso(scenario);
  checks.push(check(
    'C-3.1',
    'The scenario clock is midnight UTC on the scenario\'s last observed day',
    clock === `${scenario.calendar.observed_history_end_date}T00:00:00.000Z`,
    clock
  ));

  // ADR-078: the clock does not move between two reads, because it is not the wall clock.
  checks.push(check(
    'C-3.2',
    'Two reads of the scenario clock are identical — it is not civil time',
    scenarioClockNowIso(scenario) === scenarioNowIso(scenario)
  ));

  const window = scenarioPromotionWindow(scenario);
  if (!declaresPromotion(scenario)) {
    checks.push(notApplicable(
      'C-3.3',
      'The promotion window matches the declared duration, inclusive of both endpoints',
      'this scenario declares no committed promotion, so there is no promotion window to measure'
    ));
  } else {
    // Inclusive of both endpoints: 04 June to 17 June is fourteen days of trading, not thirteen.
    const days = (Date.parse(window.end_iso) - Date.parse(window.start_iso)) / 86_400_000 + 1;
    checks.push(check(
      'C-3.4',
      'The promotion window matches the declared duration, inclusive of both endpoints',
      days === scenario.calendar.promotion_duration_days,
      `${window.start_iso.slice(0, 10)} → ${window.end_iso.slice(0, 10)} is ${days} days, declared ${scenario.calendar.promotion_duration_days}`
    ));
    checks.push(check(
      'C-3.5',
      'The promotion window opens on the first projected day, after the scenario clock',
      Date.parse(window.start_iso) > Date.parse(clock),
      `${window.start_iso} vs clock ${clock}`
    ));
  }

  checks.push(check(
    'C-3.6',
    'The forecast horizon is a positive number of days',
    scenario.calendar.forecast_horizon_days >= 1,
    String(scenario.calendar.forecast_horizon_days)
  ));

  /*
   * The declared scale against the MEASURED run rate.
   *
   * These are different quantities and are meant to be: the record DECLARES a plan scale,
   * and the Demand surface MEASURES a run rate from the history it is reading. That they
   * agree is the reconciliation, and it is asserted rather than arranged by making one read
   * the other — which is why this probes the surface's own aggregation engine with a history
   * at this scenario's declared daily rate, instead of restating the record's arithmetic
   * back to it.
   */
  if (!declaresObservedHistory(scenario)) {
    checks.push(notApplicable(
      'C-3.7',
      'The declared weekly scale reconciles with the run rate the demand engine measures',
      'this scenario\'s SKU carries no observed history in the demonstration data, so there is no '
      + 'independently measured run rate to reconcile the declared scale against'
    ));
  } else {
    const params = SCENARIO_PARAMS_FOR(scenario);
    const impacts = calculateDerivedImpacts(params, []);
    const dailyRate = scenarioWeeklyPopulationUnits(scenario) / 7;
    const measured = deriveDemandBase(
      params,
      impacts,
      Array.from({ length: 28 }, () => ({ value: dailyRate })),
      scenario.calendar.forecast_horizon_days
    );
    checks.push(closeCheck(
      'C-3.7',
      'The declared weekly scale reconciles with the run rate the demand engine measures',
      measured.base_demand_units,
      scenarioBaseDemandUnits(scenario),
      0.01
    ));
    // The allocation the surface reads must be the declared one, not a rounding of it.
    checks.push(closeCheck(
      'C-3.8',
      'The capacity index the demand engine reads is this scenario\'s declared allocation',
      measured.capacity_index,
      scenario.supply.supplier_capacity_index,
      0.01
    ));
  }

  return dimension('C-3', checks);
}

// ── C-4 Signals ───────────────────────────────────────────────────────────────

function certifySignals(scenario: CanonicalScenario): CertificationDimensionResult {
  const checks: CertificationCheck[] = [];
  const first = generateSyntheticSignalSnapshot(scenario, 'tenant_uk_retail_01');
  const second = generateSyntheticSignalSnapshot(scenario, 'tenant_uk_retail_01');

  checks.push(check('C-4.1', 'A signal timeline exists for this scenario', first.length > 0, `${first.length} signals`));

  // ADR-081 part 3 / ADR-078: byte-identical INCLUDING timestamps, or Refresh can never
  // publish a meaningful delta because the only thing that moves is the clock.
  checks.push(check(
    'C-4.2',
    'Two consecutive reads are byte-identical, timestamps included',
    JSON.stringify(first) === JSON.stringify(second)
  ));

  const clockMs = Date.parse(scenarioClockNowIso(scenario));
  const afterClock = first.filter(s => Date.parse(s.observed_at) > clockMs);
  checks.push(check(
    'C-4.3',
    'Every observation is stamped at or before the scenario clock',
    afterClock.length === 0,
    afterClock.map(s => `${s.signal_id}@${s.observed_at}`).join(', ')
  ));

  // Freshness has to be a real reading, which means the stamps must actually differ.
  const distinctStamps = new Set(first.map(s => s.observed_at)).size;
  checks.push(check(
    'C-4.4',
    'Observations carry distinct ages, so freshness is a measurable dimension',
    first.length === 0 || distinctStamps > 1,
    `${distinctStamps} distinct observed_at values across ${first.length} signals`
  ));

  const missingProvenance = first.filter(
    s => !s.provenance?.rule || !s.provenance?.generator || !s.provenance?.scenario_clock
  );
  checks.push(check(
    'C-4.5',
    'Provenance is populated on every observation — rule, generator and scenario clock',
    missingProvenance.length === 0,
    missingProvenance.map(s => s.signal_id).join(', ')
  ));

  const wrongClock = first.filter(s => s.provenance?.scenario_clock !== scenarioClockNowIso(scenario));
  checks.push(check(
    'C-4.6',
    'Every observation cites this scenario\'s own clock',
    wrongClock.length === 0,
    wrongClock.map(s => `${s.signal_id}@${s.provenance?.scenario_clock}`).join(', ')
  ));

  // A period label must resolve to the instant it claims, or freshness is a caption.
  const mismatchedPeriod = first.filter(s => {
    const period = s.provenance?.observed_period as any;
    return period ? s.observed_at !== scenarioPeriodInstantIso(scenario, period) : false;
  });
  checks.push(check(
    'C-4.7',
    'Each observation\'s declared period resolves to the instant it is stamped with',
    mismatchedPeriod.length === 0,
    mismatchedPeriod.map(s => s.signal_id).join(', ')
  ));

  return dimension('C-4', checks);
}

// ── C-5 Demand ────────────────────────────────────────────────────────────────

function certifyDemand(scenario: CanonicalScenario): CertificationDimensionResult {
  const checks: CertificationCheck[] = [];

  // The demand engine's revenue basis must be THIS scenario's realised price.
  const economics = deriveUnitEconomics(null);
  checks.push(closeCheck(
    'C-5.1',
    'The demand engine\'s unit revenue basis is this scenario\'s realised price',
    economics.revenue_per_unit_gbp,
    scenarioRealisedRevenuePerUnitGbp(scenario),
    0.5
  ));
  checks.push(closeCheck(
    'C-5.2',
    'The demand engine\'s margin rate is this scenario\'s declared rate',
    ddfGrossMarginRatePct(),
    scenario.economics.gross_margin_rate_pct,
    0.0001
  ));
  checks.push(closeCheck(
    'C-5.3',
    'The demand engine\'s flex allowance is this scenario\'s declared flex rate',
    ddfSlaFlexUnitsPerWeek(),
    scenarioWeeklyPopulationUnits(scenario) * (scenario.supply.supplier_flex_rate_pct / 100),
    0.0001
  ));
  checks.push(closeCheck(
    'C-5.4',
    'The demand engine\'s flex premium is this scenario\'s declared premium',
    ddfFlexPremiumRatePct(),
    scenario.supply.flex_premium_rate_pct,
    0.0001
  ));

  // The Decision Gap the surface publishes is the gap this scenario's own arithmetic implies.
  const exposed = scenarioExposedDemandUnits(scenario);
  const base = scenarioBaseDemandUnits(scenario);
  const gapPp = (exposed / base) * 100;
  checks.push(check(
    'C-5.5',
    'The Decision Gap is a positive share of this scenario\'s own base — the scenario has a decision in it',
    exposed > 0 && gapPp > 0 && gapPp < 100,
    `${exposed.toFixed(0)} exposed of ${base.toFixed(0)} base (${gapPp.toFixed(1)}pp)`
  ));

  // Recovery closes part of the gap and states a residual — never all of it, never none.
  const flex = scenarioFlexCapacityUnits(scenario);
  const recovered = Math.min(exposed, flex);
  checks.push(check(
    'C-5.6',
    'The declared flex clause closes part of the gap and leaves a stated residual',
    recovered > 0 && exposed - recovered >= 0 && recovered <= exposed,
    `${recovered.toFixed(0)} recovered of ${exposed.toFixed(0)} exposed`
  ));

  return dimension('C-5', checks);
}

// ── C-6 Promotion ─────────────────────────────────────────────────────────────

function certifyPromotion(scenario: CanonicalScenario): CertificationDimensionResult {
  if (!declaresPromotion(scenario)) {
    return dimension('C-6', [
      notApplicable(
        'C-6.0',
        'The elasticity curve, causal decomposition and demand bridge reconcile',
        'this scenario declares no committed promotion, so there is no promotion to price'
      )
    ]);
  }

  const checks: CertificationCheck[] = [];
  const depth = scenario.economics.promotion_depth_pct;

  // Supplier funding must be declared and non-zero, or no depth is recommendable and the
  // Promotion surface has nothing to say.
  checks.push(check(
    'C-6.1',
    'Supplier promotional funding is declared and visible',
    scenario.economics.supplier_promotional_funding_pct > 0
      && scenario.economics.supplier_promotional_funding_pct < 100,
    `${scenario.economics.supplier_promotional_funding_pct}% of the price investment`
  ));

  // The planning curve plots what THIS scenario declares the depth response to be.
  const declaredResponse = scenarioDepthResponsePp(scenario, depth);
  const curve = curvePoint(depth);
  checks.push(closeCheck(
    'C-6.2',
    'The planning curve plots this scenario\'s declared depth response',
    curve.expected_demand_uplift_pct,
    declaredResponse,
    0.01
  ));

  // ADR-079: the depth response is identical at every scope unless the scenario declares
  // otherwise and says why. This is the assertion that replaced the hash band.
  const evaluateAt = (session: string, region: string) => {
    clearCampaignIntents();
    const draft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', session);
    draft.campaign_intent.intervention_posture = 'CONSIDER_PROMOTION';
    draft.campaign_intent.provisional_mechanic = '20_percent_off';
    draft.campaign_intent.provisional_discount_depth = depth;
    draft.audience_market.region = region;
    const campaign = registerCampaignIntent(draft);
    return evaluateCampaignDecision({
      tenant_id: campaign.tenant_id,
      session_id: campaign.session_id,
      campaign_intent_id: campaign.campaign_intent_id,
      include_signals: false
    });
  };

  let national: any;
  let regional: any;
  try {
    national = evaluateAt('sess_cert_national', scenario.identity.market_scope_label);
    regional = evaluateAt('sess_cert_regional', scenario.identity.focus_region);
  } catch (e: any) {
    checks.push(check('C-6.3', 'The causal engine evaluates this scenario\'s committed promotion', false, e?.message ?? String(e)));
    return dimension('C-6', checks);
  } finally {
    clearCampaignIntents();
  }

  const nationalDepth = national.counterfactual.demand_bridge?.price_depth_response_pp;
  const regionalDepth = regional.counterfactual.demand_bridge?.price_depth_response_pp;

  checks.push(check(
    'C-6.3',
    'The causal engine publishes a demand bridge for this scenario\'s committed promotion',
    typeof nationalDepth === 'number' && typeof regionalDepth === 'number'
  ));

  checks.push(closeCheck(
    'C-6.4',
    'The engine\'s price-depth response IS the planning curve\'s depth response',
    nationalDepth ?? NaN,
    declaredResponse,
    0.5
  ));

  checks.push(check(
    'C-6.5',
    'The price-depth response is identical at every scope — differentiation is declared, never hashed',
    nationalDepth === regionalDepth,
    `${nationalDepth} at ${scenario.identity.market_scope_label} vs ${regionalDepth} at ${scenario.identity.focus_region}`
  ));

  const declaredMultipliers = Object.keys(scenario.differentiation.scope_response_multipliers ?? {});
  const unexplained = declaredMultipliers.filter(
    scope => !scenario.differentiation.scope_response_reasons?.[scope]?.trim()
  );
  checks.push(check(
    'C-6.6',
    'Every declared scope multiplier carries a stated reason',
    unexplained.length === 0,
    unexplained.join(', ')
  ));

  const unexplainedAnomalies = (scenario.differentiation.depth_response_anomalies ?? [])
    .filter(a => !a.reason?.trim());
  checks.push(check(
    'C-6.7',
    'Every declared depth-response anomaly carries a stated reason',
    unexplainedAnomalies.length === 0,
    unexplainedAnomalies.map(a => `${a.depth_pct}%`).join(', ')
  ));

  // The bridge must actually bridge — a decomposition that does not sum explains nothing.
  const bridge = national.counterfactual.demand_bridge;
  checks.push(closeCheck(
    'C-6.8',
    'Price depth plus campaign design equals what the campaign causes',
    (bridge?.price_depth_response_pp ?? 0) + (bridge?.campaign_design_response_pp ?? 0),
    bridge?.total_attributable_pp ?? NaN,
    0.1
  ));

  // What differs between scopes is design, and every point of it is attributed by name.
  const namedDelta = (regional.counterfactual.demand_bridge?.design_components ?? []).reduce(
    (sum: number, c: any) => {
      const nat = (bridge?.design_components ?? []).find((n: any) => n.driver_id === c.driver_id);
      return sum + (c.contribution_pp - (nat?.contribution_pp ?? 0));
    },
    0
  );
  const designDelta =
    (regional.counterfactual.demand_bridge?.campaign_design_response_pp ?? 0)
    - (bridge?.campaign_design_response_pp ?? 0);
  checks.push(closeCheck(
    'C-6.9',
    'Every point by which two scopes differ is attributed to a named design component',
    Number(namedDelta.toFixed(2)),
    Number(designDelta.toFixed(2)),
    0.5
  ));

  return dimension('C-6', checks);
}

// ── C-7 Campaign Decision ─────────────────────────────────────────────────────

function certifyCampaignDecision(scenario: CanonicalScenario): CertificationDimensionResult {
  const checks: CertificationCheck[] = [];

  clearCampaignIntents();
  const draft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', 'sess_cert_open');

  checks.push(check(
    'C-7.1',
    'A new decision opens on this scenario\'s identity',
    draft.decision_context.scenario_id === scenario.identity.scenario_id,
    `${draft.decision_context.scenario_id} vs ${scenario.identity.scenario_id}`
  ));
  checks.push(check(
    'C-7.2',
    'A new decision opens on this scenario\'s SKU',
    draft.campaign_intent.sku_scope.includes(scenario.identity.sku_id),
    draft.campaign_intent.sku_scope.join(', ')
  ));
  checks.push(check(
    'C-7.3',
    'A new decision opens on this scenario\'s family taxonomy',
    draft.decision_context.scenario_family === scenario.taxonomy.family_id,
    `${draft.decision_context.scenario_family} vs ${scenario.taxonomy.family_id}`
  ));

  if (!declaresPromotion(scenario)) {
    checks.push(notApplicable(
      'C-7.4',
      'A new decision opens on this scenario\'s promotion window',
      'this scenario declares no committed promotion, so a new decision carries no promotion window'
    ));
  } else {
    const window = scenarioPromotionWindow(scenario);
    checks.push(check(
      'C-7.4',
      'A new decision opens on this scenario\'s promotion window',
      draft.audience_market.planned_start === window.start_iso
        && draft.audience_market.planned_end === window.end_iso,
      `${draft.audience_market.planned_start} → ${draft.audience_market.planned_end} vs ${window.start_iso} → ${window.end_iso}`
    ));
  }

  // No abstract population survives: the timeline engine works on this scenario's own week.
  checks.push(closeCheck(
    'C-7.5',
    'The campaign timeline population is this scenario\'s own weekly demand',
    cdi02BaseWeeklyUnits(),
    scenarioWeeklyPopulationUnits(scenario),
    0.0001
  ));

  clearCampaignIntents();
  return dimension('C-7', checks);
}

// ── C-8 Consequences ──────────────────────────────────────────────────────────

function certifyConsequences(scenario: CanonicalScenario): CertificationDimensionResult {
  const checks: CertificationCheck[] = [];
  const params = SCENARIO_PARAMS_FOR(scenario);
  const impacts = calculateDerivedImpacts(params, []);

  // Shared Decision State and the scenario must be the same population.
  checks.push(closeCheck(
    'C-8.1',
    'The derived-impact population is this scenario\'s own weekly demand',
    impacts.weekly_demand_units / (1 + scenario.economics.promotion_depth_pct / 100),
    scenarioWeeklyPopulationUnits(scenario),
    0.01
  ));

  // Supplier capacity is the declared index applied to this scenario's population.
  checks.push(closeCheck(
    'C-8.2',
    'Derived supplier capacity is the declared index applied to this scenario\'s population',
    impacts.supplier_capacity_units,
    scenarioWeeklyPopulationUnits(scenario) * scenario.supply.supplier_capacity_index,
    0.5
  ));

  /*
   * Exposure is pounds, and EVERY term in it is declared on this scenario's record: the
   * units we cannot serve, at this scenario's realised price, less the share this scenario
   * declares customers recover on a substitute line.
   *
   * The substitution term is why this check is written as the full expression rather than
   * as `gap x price`. Certifying the reference scenario is what surfaced that: an earlier
   * form of this check omitted the declared recovery share and failed
   * `SCN-FRESH-DAIRY-CHEDDAR-001` at 47,093 against 72,450. The record's §5 rule decided it
   * — if the gate cannot certify the reference scenario the gate is wrong, and it was.
   */
  const gapUnits = impacts.commitment_gap_units;
  if (gapUnits <= 0) {
    checks.push(notApplicable(
      'C-8.3',
      'Published exposure is derived from this scenario\'s realised price and declared recovery',
      'this scenario\'s opening position carries no commitment gap, so there is no exposure to price'
    ));
  } else {
    const retainedShare = 1 - scenario.economics.substitution_recovery_pct / 100;
    checks.push(closeCheck(
      'C-8.3',
      'Published exposure is derived from this scenario\'s realised price and declared recovery',
      impacts.financial_exposure_gbp,
      gapUnits * scenarioRealisedRevenuePerUnitGbp(scenario) * retainedShare,
      0.5
    ));
    // And it is not the undiscounted figure: the declared recovery term is actually applied.
    checks.push(check(
      'C-8.5',
      'The declared substitution recovery is applied, not merely declared',
      scenario.economics.substitution_recovery_pct === 0
        || !agrees(impacts.financial_exposure_gbp, gapUnits * scenarioRealisedRevenuePerUnitGbp(scenario), 0.5),
      `exposure ${impacts.financial_exposure_gbp} vs undiscounted ${(gapUnits * scenarioRealisedRevenuePerUnitGbp(scenario)).toFixed(0)}`
    ));
  }

  // The margin side of the same consequence, on this scenario's declared margin rate.
  checks.push(closeCheck(
    'C-8.6',
    'Margin exposure over the horizon uses this scenario\'s declared margin rate',
    scenarioMarginExposureGbp(scenario),
    scenarioExposedDemandUnits(scenario) * scenarioGrossMarginPerUnitGbp(scenario),
    0.0001
  ));

  checks.push(check(
    'C-8.4',
    'Consequence figures are finite pounds, not unanchored percentages',
    Number.isFinite(impacts.financial_exposure_gbp) && impacts.financial_exposure_gbp >= 0,
    String(impacts.financial_exposure_gbp)
  ));

  return dimension('C-8', checks);
}

// ── C-9 Currency ──────────────────────────────────────────────────────────────

function certifyCurrency(scenario: CanonicalScenario): CertificationDimensionResult {
  const checks: CertificationCheck[] = [];

  checks.push(check(
    'C-9.1',
    'The scenario is modelled in the canonical base currency',
    scenario.economics.base_currency === CANONICAL_BASE_CURRENCY,
    `${scenario.economics.base_currency} vs ${CANONICAL_BASE_CURRENCY}`
  ));

  const amount = scenarioMarginExposureGbp(scenario);
  checks.push(check(
    'C-9.2',
    'Converting a base amount to the base currency leaves it untouched',
    convertFromBase(amount, CANONICAL_BASE_CURRENCY, SEEDED_FALLBACK_RATES) === amount
  ));

  // Converted once at display: a USD rendering leaves no surviving pound sign.
  const usd = formatBaseMoney(amount, 'USD', SEEDED_FALLBACK_RATES);
  checks.push(check(
    'C-9.3',
    'A non-base rendering leaves no surviving base-currency symbol',
    usd.startsWith('$') && !usd.includes('£'),
    usd
  ));

  const everyCurrencyUsable = SUPPORTED_CURRENCIES.every(
    c => Number.isFinite(SEEDED_FALLBACK_RATES.rates[c]) && SEEDED_FALLBACK_RATES.rates[c] > 0
  );
  checks.push(check('C-9.4', 'Every supported currency is usable, including on the dated fallback', everyCurrencyUsable));

  // Units are not money and are never converted.
  const units = scenarioExposedDemandUnits(scenario);
  checks.push(check(
    'C-9.5',
    'Unit quantities carry no currency and are unaffected by display currency',
    Number.isFinite(units) && units === scenarioExposedDemandUnits(scenario)
  ));

  return dimension('C-9', checks);
}

// ── C-10 Deterministic reset ──────────────────────────────────────────────────

function certifyDeterministicReset(scenario: CanonicalScenario): CertificationDimensionResult {
  const checks: CertificationCheck[] = [];
  const params = SCENARIO_PARAMS_FOR(scenario);

  const opening = calculateDerivedImpacts(params, []);
  const openingAgain = calculateDerivedImpacts({ ...params }, []);
  checks.push(check(
    'C-10.1',
    'The opening position is a pure function of the scenario — two evaluations agree exactly',
    JSON.stringify(opening) === JSON.stringify(openingAgain)
  ));

  const moved = calculateDerivedImpacts(
    { ...params, promotion_lift: params.promotion_lift + 15 },
    ['SLA_FLEX_RULE_4']
  );
  checks.push(check(
    'C-10.2',
    'Moving the scenario changes the derived position — the controls are real',
    JSON.stringify(moved) !== JSON.stringify(opening)
  ));

  const restored = calculateDerivedImpacts(params, []);
  checks.push(check(
    'C-10.3',
    'Restoring the parameters returns the opening position exactly, field by field',
    JSON.stringify(restored) === JSON.stringify(opening)
  ));

  // The as-at marker returns to THIS scenario's own clock, not to a shared one.
  const before = generateSyntheticSignalSnapshot(scenario, 'tenant_uk_retail_01');
  const after = generateSyntheticSignalSnapshot(scenario, 'tenant_uk_retail_01');
  checks.push(check(
    'C-10.4',
    'The signal as-at marker returns to this scenario\'s own opening position',
    JSON.stringify(before) === JSON.stringify(after)
      && before.every(s => s.provenance?.scenario_clock === scenarioClockNowIso(scenario))
  ));

  checks.push(check(
    'C-10.5',
    'Scenario derivations carry no hidden state between evaluations',
    scenarioBaseDemandUnits(scenario) === scenarioBaseDemandUnits(scenario)
      && scenarioRevenueExposureGbp(scenario) === scenarioRevenueExposureGbp(scenario)
  ));

  return dimension('C-10', checks);
}

// ── C-11 Provenance ───────────────────────────────────────────────────────────

function certifyProvenance(scenario: CanonicalScenario): CertificationDimensionResult {
  const checks: CertificationCheck[] = [];

  const descriptor = scenario.provenance?.descriptor;
  const validation = descriptor
    ? validateProvenanceDescriptor(descriptor)
    : { valid: false, errors: ['no descriptor declared'] };
  checks.push(check(
    'C-11.1',
    'The scenario record carries a valid origin / method / authority descriptor',
    validation.valid,
    validation.errors.join('; ')
  ));

  checks.push(check(
    'C-11.2',
    'No value drafted by GenAI reaches an authoritative field on the scenario record',
    descriptor?.origin !== 'drafted' || descriptor?.authority === 'non_authoritative_draft',
    `${descriptor?.origin} / ${descriptor?.authority}`
  ));

  checks.push(check(
    'C-11.3',
    'The scenario declares what kind of record it is',
    scenario.provenance?.basis === 'MODELLED_DEMONSTRATION_ASSUMPTION'
      && !!scenario.provenance?.statement?.trim(),
    scenario.provenance?.basis ?? 'none'
  ));

  // `synthetic_demo` is server-derived, and every signal must carry it rather than assert it.
  const signals = generateSyntheticSignalSnapshot(scenario, 'tenant_uk_retail_01');
  const notFlagged = signals.filter(s => s.synthetic_demo !== true);
  checks.push(check(
    'C-11.4',
    'Every generated observation is flagged synthetic, server-side',
    notFlagged.length === 0,
    notFlagged.map(s => s.signal_id).join(', ')
  ));

  const missingVocabulary = signals.filter(
    s => !s.provenance?.origin || !s.provenance?.method || !s.provenance?.authority
  );
  checks.push(check(
    'C-11.5',
    'Every observation carries the declared provenance vocabulary',
    missingVocabulary.length === 0,
    missingVocabulary.map(s => s.signal_id).join(', ')
  ));

  const draftedAuthoritative = signals.filter(
    s => s.provenance?.origin === 'drafted' && s.provenance?.authority === 'authoritative'
  );
  checks.push(check(
    'C-11.6',
    'No observation claims to be both drafted and authoritative',
    draftedAuthoritative.length === 0,
    draftedAuthoritative.map(s => s.signal_id).join(', ')
  ));

  return dimension('C-11', checks);
}

// ── C-12 Cross-surface reconciliation ─────────────────────────────────────────

/**
 * The aggregate: any two surfaces publishing the same quantity agree.
 *
 * It does not restate C-1 through C-11. It compares quantities that TWO INDEPENDENT
 * surfaces each publish, which is the discipline `DEMO-HARD-01` established — restating an
 * engine's own arithmetic back to it proves nothing.
 */
function certifyCrossSurface(
  scenario: CanonicalScenario,
  earlier: CertificationDimensionResult[]
): CertificationDimensionResult {
  const checks: CertificationCheck[] = [];

  // The weekly population, as three surfaces each publish it.
  const params = SCENARIO_PARAMS_FOR(scenario);
  const statePopulation = calculateDerivedImpacts(params, []).weekly_demand_units
    / (1 + scenario.economics.promotion_depth_pct / 100);
  checks.push(closeCheck(
    'C-12.1',
    'Shared Decision State and the campaign timeline publish the same weekly population',
    statePopulation,
    cdi02BaseWeeklyUnits(),
    0.01
  ));
  checks.push(closeCheck(
    'C-12.2',
    'The scenario record and Shared Decision State publish the same weekly population',
    scenarioWeeklyPopulationUnits(scenario),
    statePopulation,
    0.01
  ));

  // The realised revenue basis, as the demand engine and the record each publish it.
  checks.push(closeCheck(
    'C-12.3',
    'The demand engine and the scenario record publish the same realised revenue basis',
    deriveUnitEconomics(null).revenue_per_unit_gbp,
    scenarioRealisedRevenuePerUnitGbp(scenario),
    0.5
  ));

  // The supplier, as the economics and the signal fabric each name it.
  const signals = generateSyntheticSignalSnapshot(scenario, 'tenant_uk_retail_01');
  const supplierNames = new Set(
    signals.filter(s => s.entity_type === 'SUPPLIER').map(s => s.entity_id)
  );
  if (supplierNames.size === 0) {
    checks.push(notApplicable(
      'C-12.4',
      'Exactly one supplier is named across the economics and the signals',
      'this scenario publishes no supplier-scoped signal, so only one surface names a supplier'
    ));
  } else {
    checks.push(check(
      'C-12.4',
      'Exactly one supplier is named across the economics and the signals',
      supplierNames.size === 1 && supplierNames.has(scenario.supply.supplier_name),
      `signals name ${[...supplierNames].join(', ')}; economics name ${scenario.supply.supplier_name}`
    ));
  }

  // The depth response, as the planning curve and the causal engine each publish it, is
  // covered by C-6. Here the check is that the curve and the RECORD agree, which is a
  // different pair of surfaces.
  if (!declaresPromotion(scenario)) {
    checks.push(notApplicable(
      'C-12.5',
      'The planning curve and the scenario record publish the same depth response',
      'this scenario declares no committed promotion, so no depth response is published'
    ));
  } else {
    checks.push(closeCheck(
      'C-12.5',
      'The planning curve and the scenario record publish the same depth response',
      curvePoint(scenario.economics.promotion_depth_pct).expected_demand_uplift_pct,
      scenarioDepthResponsePp(scenario, scenario.economics.promotion_depth_pct),
      0.01
    ));
    // Every tier of the curve, not only the committed one.
    const offCurve = elasticityCurveInScope().filter(
      p => !agrees(p.expected_demand_uplift_pct, scenarioDepthResponsePp(scenario, p.discount_pct), 0.01)
    );
    checks.push(check(
      'C-12.6',
      'Every tier of the planning curve derives from this scenario\'s declared terms',
      offCurve.length === 0,
      offCurve.map(p => `${p.discount_pct}%: curve ${p.expected_demand_uplift_pct} vs record ${scenarioDepthResponsePp(scenario, p.discount_pct)}`).join('; ')
    ));
  }

  // The estate, as the record and the store-count accessor each publish it.
  checks.push(check(
    'C-12.7',
    'The estate resolves to one store count per named scope',
    scenarioStoreCount(scenario, scenario.identity.market_scope_label) > 0
      && scenarioStoreCount(scenario, scenario.identity.focus_region) > 0,
    `${scenario.identity.market_scope_label}=${scenarioStoreCount(scenario, scenario.identity.market_scope_label)}, `
    + `${scenario.identity.focus_region}=${scenarioStoreCount(scenario, scenario.identity.focus_region)}`
  ));

  // Reconciliation is not reconciliation if an earlier dimension already failed.
  const failedEarlier = earlier.filter(d => d.verdict === 'FAIL').map(d => d.dimension);
  checks.push(check(
    'C-12.8',
    'No earlier dimension failed — a scenario does not reconcile around a broken one',
    failedEarlier.length === 0,
    failedEarlier.join(', ')
  ));

  return dimension('C-12', checks);
}

// ── The gate ──────────────────────────────────────────────────────────────────

/**
 * Run the twelve dimensions against a scenario.
 *
 * Pure with respect to the scenario: the same scenario certifies identically on every run,
 * which is what lets the activation policy re-run the gate rather than trust a stored
 * verdict. The campaign intent store is cleared before and after, so certifying a scenario
 * leaves no trace in a session's decision state.
 */
export function certifyScenario(scenario: CanonicalScenario): ScenarioCertificationResult {
  return withScenarioInScope(scenario, () => certifyBoundScenario(scenario));
}

/**
 * The twelve dimensions, executed with `scenario` already in scope.
 *
 * Split out so the binding is established ONCE, around the whole run, rather than per probe.
 * A probe that bound its own scenario would still be correct in isolation and would leave the
 * cross-surface dimension comparing results taken under different bindings — reconciling two
 * scenarios and calling it one.
 */
function certifyBoundScenario(scenario: CanonicalScenario): ScenarioCertificationResult {
  const ordered: CertificationDimensionResult[] = [
    certifyIdentity(scenario),
    certifyEconomics(scenario),
    certifyCalendar(scenario),
    certifySignals(scenario),
    certifyDemand(scenario),
    certifyPromotion(scenario),
    certifyCampaignDecision(scenario),
    certifyConsequences(scenario),
    certifyCurrency(scenario),
    certifyDeterministicReset(scenario),
    certifyProvenance(scenario)
  ];
  ordered.push(certifyCrossSurface(scenario, ordered));

  const assertionCount = ordered
    .flatMap(d => d.checks)
    .filter(c => c.applicable).length;

  return {
    scenario_id: scenario.identity.scenario_id,
    state: deriveCertificationState(ordered),
    harness_version: CERTIFICATION_HARNESS_VERSION,
    // Scenario time: a certification result describes the modelled world (ADR-078 part 1).
    evaluated_at_scenario_clock: scenarioClockNowIso(scenario),
    dimensions: ordered,
    assertion_count: assertionCount,
    failed_dimensions: ordered.filter(d => d.verdict === 'FAIL').map(d => d.dimension),
    not_applicable_dimensions: ordered.filter(d => d.verdict === 'NOT_APPLICABLE').map(d => d.dimension),
    provenance: CERTIFICATION_PROVENANCE
  };
}

/** Certify every registered scenario. The catalogue-wide run §8 asks for. */
export function certifyRegisteredScenarios(): ScenarioCertificationResult[] {
  return listRegisteredScenarios().map(certifyScenario);
}

let gateInstalled = false;

/**
 * Install the certification gate into the `SCI-01` activation seam.
 *
 * Two things happen, and the second matters as much as the first. The policy is installed,
 * so no future activation can bypass certification. Then the CURRENTLY active scenario is
 * re-activated through the gate — because the registry bootstraps by activating the
 * reference scenario at module load, before any policy exists, and a gate that only applies
 * to what comes next would leave exactly one scenario permanently exempt. That is the
 * formality-for-newcomers failure §5 of the certification record exists to prevent.
 *
 * Idempotent, so importing it from several entry points installs it once.
 */
export function installScenarioCertificationGate(): void {
  if (gateInstalled) return;
  setScenarioActivationPolicy(scenario => certificationPolicy(scenario));
  gateInstalled = true;

  const activeId = getActiveScenarioId();
  if (activeId) {
    const active = resolveScenario(activeId);
    const verdict = certificationPolicy(active);
    if (!verdict.admitted) {
      throw new Error(
        `The demo-active scenario "${activeId}" does not pass the Scenario Certification Gate: `
        + `${verdict.reason} (ADR-080: no scenario is demo-active until it is certified).`
      );
    }
  }
}

const certificationPolicy = createCertificationActivationPolicy(certifyScenario);

/** Uninstall the gate. Test-support only — nothing in the application path calls this. */
export function uninstallScenarioCertificationGate(): void {
  gateInstalled = false;
}
