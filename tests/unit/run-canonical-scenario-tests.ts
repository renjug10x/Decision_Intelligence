/**
 * Cross-surface reconciliation and currency test suite.
 * Run via: npx tsx tests/unit/run-canonical-scenario-tests.ts
 *
 * These are not unit tests of a formula. They are the assertions that make the connected journey
 * ONE decision case rather than three demonstrations that happen to share vocabulary. Each one is
 * written so it FAILS if Demand says one thing and Promotion or Campaign Decision quietly uses a
 * different product, a different estate, a different price or a different economic scale.
 *
 * The rule throughout: restating an engine's own arithmetic back to it proves nothing. Every
 * assertion below either compares TWO INDEPENDENT SURFACES, or checks a value against something
 * outside the code that produced it.
 */

import {
  CANONICAL_SCENARIO,
  canonicalBaseDemandUnits,
  canonicalExpectedDemandUnits,
  canonicalServableDemandUnits,
  canonicalExposedDemandUnits,
  canonicalFlexCapacityUnits,
  canonicalRealisedRevenuePerUnitGbp,
  canonicalGrossMarginPerUnitGbp,
  canonicalImpliedUnitCostGbp,
  canonicalContributionPerUnitAtListGbp,
  canonicalContributionAtDepthGbp,
  canonicalContributionErosionPerDepthPoint,
  canonicalRetailerFundedShare,
  canonicalRevenueExposureGbp,
  canonicalMarginExposureGbp,
  canonicalWeeklyPopulationUnits,
  canonicalStoreCount,
  canonicalNetworkCoverDays,
  canonicalScenarioNowIso,
  CANONICAL_SCENARIO_ID,
  getActiveScenarioId,
  requireScenarioId,
  resolveScenario,
  validateProvenanceDescriptor,
  provenanceFromEvidenceOrigin,
  provenanceFromDemandInputClass,
  provenanceFromTelemetryProvenance,
  provenanceFromArchetypeGraphProvenance,
  calculateDerivedImpacts,
  DecisionScenarioParameters,
  SEEDED_FALLBACK_RATES,
  CANONICAL_BASE_CURRENCY,
  SUPPORTED_CURRENCIES,
  convertFromBase,
  FxRateSet,
  NarrativeStatement,
  moneyAmount,
  statementToBaseText
} from '../../packages/contracts/src/index';

import {
  deriveUnitEconomics,
  deriveDemandBase,
  deriveFlexCapacityUnits,
  DDF_GROSS_MARGIN_RATE_PCT,
  DDF_SLA_FLEX_UNITS_PER_WEEK
} from '../../lib/demand-decision-frontier/demand-frontier-engine';

import {
  CAMPAIGN_ARCHETYPES_MAP,
  CANONICAL_ELASTICITY_CURVE,
  CANONICAL_CURRENT_POINT,
  CANONICAL_RECOMMENDED_POINT,
  REGION_STORE_COUNTS,
  LEGACY_DEMO_ESTATE_STORES,
  archetypeBaselineUnits
} from '../../lib/campaign-archetypes';

import { CDI02_BASE_WEEKLY_UNITS } from '../../packages/contracts/src/campaign-timeline-model';
import { formatBaseMoney, localiseMoneyInText, convertBaseAmount, formatStatement } from '../../lib/currency/format';
import { clearCampaignIntents, registerCampaignIntent } from '../../lib/campaign-intent-store';
import { createDefaultCampaignIntentDraft } from '../../packages/contracts/src/campaign-intent-model';
import { evaluateCampaignDecision } from '../../lib/campaign-causal-engine';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateSyntheticSignalSnapshot } from '../../services/world/src/enterprise-signal-generator';
import productsData from '../../data/products.json';
import suppliersData from '../../data/suppliers.json';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} — ${detail ?? 'assertion failed'}`); failed++; }
}

/** Two independently derived quantities agree to within a tolerance expressed as a share. */
function assertClose(a: number, b: number, tolerancePct: number, name: string) {
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-9);
  const divergence = Math.abs(a - b) / denom * 100;
  assert(
    divergence <= tolerancePct,
    name,
    `${a} vs ${b} diverge by ${divergence.toFixed(4)}% (tolerance ${tolerancePct}%)`
  );
}

const SCENARIO_PARAMS: DecisionScenarioParameters = {
  promotion_lift: CANONICAL_SCENARIO.economics.promotion_depth_pct,
  supplier_capacity_cap: Math.round((CANONICAL_SCENARIO.supply.supplier_capacity_index - 1) * 100),
  forecast_horizon_days: CANONICAL_SCENARIO.calendar.forecast_horizon_days,
  promotion_method: '20_percent_off',
  campaign_scope: 'national',
  cannibalisation_factor: 0,
  event_boost: 'none'
};

console.log('\n=== 1. SCENARIO IDENTITY ==========================================\n');

{
  const products = productsData as Array<{ sku_id: string; name: string; supplier_id: string; rrp: number; category: string }>;
  const sku = products.find(p => p.sku_id === CANONICAL_SCENARIO.identity.sku_id);

  assert(!!sku, 'Canonical SKU exists in the product master', CANONICAL_SCENARIO.identity.sku_id);
  assert(
    sku?.name === CANONICAL_SCENARIO.identity.sku_name,
    'Canonical SKU code and name are the same product in the master',
    `${CANONICAL_SCENARIO.identity.sku_id} is "${sku?.name}", scenario calls it "${CANONICAL_SCENARIO.identity.sku_name}"`
  );
  // The defect this catches: the same product published under two codes across surfaces.
  const sameNameElsewhere = products.filter(p => p.name === CANONICAL_SCENARIO.identity.sku_name);
  assert(sameNameElsewhere.length === 1, 'Canonical SKU name maps to exactly one code',
    sameNameElsewhere.map(p => p.sku_id).join(', '));
  assert(
    sku?.rrp === CANONICAL_SCENARIO.economics.list_price_gbp,
    'Scenario list price is the product master price, not a second price',
    `master ${sku?.rrp} vs scenario ${CANONICAL_SCENARIO.economics.list_price_gbp}`
  );

  const suppliers = suppliersData as Array<{ supplier_id: string; name: string }>;
  const supplier = suppliers.find(s => s.supplier_id === CANONICAL_SCENARIO.supply.supplier_id);
  assert(!!supplier, 'Canonical supplier exists in the supplier master', CANONICAL_SCENARIO.supply.supplier_id);
  assert(
    supplier?.name === CANONICAL_SCENARIO.supply.supplier_name,
    'Supplier code and name are the same party',
    `${CANONICAL_SCENARIO.supply.supplier_id} is "${supplier?.name}"`
  );
  // A flex notice served on a party that does not make the product is not a decision anyone can take.
  assert(
    sku?.supplier_id === CANONICAL_SCENARIO.supply.supplier_id,
    'The scenario supplier is the SKU supplier',
    `SKU supplier ${sku?.supplier_id}, scenario supplier ${CANONICAL_SCENARIO.supply.supplier_id}`
  );
}

{
  const archetype = CAMPAIGN_ARCHETYPES_MAP['ARCH-CHILLED-ELASTIC'];
  assert(archetype.default_sku === CANONICAL_SCENARIO.identity.sku_id,
    'Promotion archetype is the canonical SKU', archetype.default_sku);
  assert(archetype.sku_name === CANONICAL_SCENARIO.identity.sku_name,
    'Promotion archetype names the canonical product', archetype.sku_name);
  assert(archetype.rrp === CANONICAL_SCENARIO.economics.list_price_gbp,
    'Promotion archetype uses the canonical list price', String(archetype.rrp));
  assert(archetype.default_duration_days === CANONICAL_SCENARIO.calendar.forecast_horizon_days,
    'Promotion window and forecast horizon are the same 14 days',
    `${archetype.default_duration_days} vs ${CANONICAL_SCENARIO.calendar.forecast_horizon_days}`);
  assert(archetype.default_discount_pct === CANONICAL_SCENARIO.economics.promotion_depth_pct,
    'Promotion archetype opens at the committed depth', String(archetype.default_discount_pct));
}

console.log('\n=== 2. ONE ESTATE =================================================\n');

assert(REGION_STORE_COUNTS.National === CANONICAL_SCENARIO.estate.national_store_count,
  'Promotion estate is the canonical estate');
assert(canonicalStoreCount('North West') === CANONICAL_SCENARIO.estate.region_store_counts['North West'],
  'Focus region resolves to one store count');
// The defect this catches: national and regional scopes that reach nearly the same shops.
assert(canonicalStoreCount('National') > canonicalStoreCount(CANONICAL_SCENARIO.identity.focus_region) * 4,
  'National scope is materially wider than a regional cluster',
  `${canonicalStoreCount('National')} vs ${canonicalStoreCount(CANONICAL_SCENARIO.identity.focus_region)}`);
assert(
  CANONICAL_SCENARIO.estate.high_opportunity_store_count < CANONICAL_SCENARIO.estate.national_store_count,
  'The high-opportunity cluster is a subset of the estate'
);
// A leading SKU should sell at a rate a store could credibly achieve.
const unitsPerStorePerDay =
  canonicalExpectedDemandUnits() / CANONICAL_SCENARIO.calendar.forecast_horizon_days / canonicalStoreCount('National');
assert(unitsPerStorePerDay > 10 && unitsPerStorePerDay < 120,
  'Expected demand per store per day is credible for a leading SKU',
  `${unitsPerStorePerDay.toFixed(1)} units/store/day`);

console.log('\n=== 3. ECONOMIC RECONCILIATION ====================================\n');

{
  const base = canonicalBaseDemandUnits();
  const expected = canonicalExpectedDemandUnits();
  const servable = canonicalServableDemandUnits();
  const exposed = canonicalExposedDemandUnits();

  assertClose(expected - servable, exposed, 0.0001, 'Decision Gap units = expected − servable');
  assertClose(
    canonicalRevenueExposureGbp(), exposed * canonicalRealisedRevenuePerUnitGbp(), 0.0001,
    'Revenue exposure = exposed units × the realised revenue basis'
  );
  assertClose(
    canonicalMarginExposureGbp(), exposed * canonicalGrossMarginPerUnitGbp(), 0.0001,
    'Margin exposure = exposed units × the gross margin basis'
  );

  // Realised price sits BETWEEN the promoted price and list — it is neither one of them.
  const promoted = CANONICAL_SCENARIO.economics.list_price_gbp * (1 - CANONICAL_SCENARIO.economics.promotion_depth_pct / 100);
  const realised = canonicalRealisedRevenuePerUnitGbp();
  assert(realised > promoted && realised < CANONICAL_SCENARIO.economics.list_price_gbp,
    'Realised revenue per unit lies between the promoted price and list',
    `${promoted} < ${realised} < ${CANONICAL_SCENARIO.economics.list_price_gbp}`);

  // The implied cost must produce a margin a grocer could actually run.
  const listMarginPct = (canonicalContributionPerUnitAtListGbp() / CANONICAL_SCENARIO.economics.list_price_gbp) * 100;
  assert(listMarginPct > 20 && listMarginPct < 50,
    'Implied margin at list is credible for an own-label line',
    `${listMarginPct.toFixed(1)}% at list, implied unit cost £${canonicalImpliedUnitCostGbp()}`);

  assert(canonicalImpliedUnitCostGbp() < promoted,
    'The promoted price still covers unit cost — the scenario is not selling below cost',
    `cost £${canonicalImpliedUnitCostGbp()} vs promoted £${promoted.toFixed(2)}`);

  // Cover must be consistent with the run rate rather than declared twice.
  assert(canonicalNetworkCoverDays() > 3 && canonicalNetworkCoverDays() < 30,
    'Network inventory cover is a credible number of days',
    `${canonicalNetworkCoverDays().toFixed(1)} days`);

  // Recovery reconciles against the same bases as the exposure it closes.
  const flex = canonicalFlexCapacityUnits();
  const recovered = Math.min(exposed, flex);
  assertClose(
    recovered * canonicalGrossMarginPerUnitGbp(),
    recovered * canonicalMarginExposureGbp() / exposed, 0.0001,
    'Recovered margin uses the same margin basis as the exposure'
  );
  assert(exposed - recovered >= 0 && exposed - recovered < exposed,
    'The intervention closes part of the gap and leaves a stated residual',
    `${exposed} exposed, ${recovered} recovered`);
  void base;
}

console.log('\n=== 4. CROSS-SURFACE INVARIANTS ===================================\n');

{
  const impacts = calculateDerivedImpacts(SCENARIO_PARAMS, []);

  // Shared Decision State and the canonical scenario must be the same population.
  assertClose(
    impacts.weekly_demand_units / (1 + CANONICAL_SCENARIO.economics.promotion_depth_pct / 100),
    canonicalWeeklyPopulationUnits(), 0.01,
    'Shared Decision State works on the canonical weekly population'
  );

  // The capacity index the Demand surface reads must be the declared allocation, not a rounding of it.
  const demandBase = deriveDemandBase(
    SCENARIO_PARAMS, impacts,
    Array.from({ length: 28 }, () => ({ value: canonicalWeeklyPopulationUnits() / 7 }))
  );
  assertClose(demandBase.capacity_index, CANONICAL_SCENARIO.supply.supplier_capacity_index, 0.01,
    'Demand capacity index is the declared supplier allocation');

  // The declared plan scale and the measured run rate are different quantities; they must still agree.
  assertClose(
    demandBase.base_demand_units, canonicalBaseDemandUnits(CANONICAL_SCENARIO.calendar.forecast_horizon_days),
    0.01, 'Measured demand base agrees with the declared plan scale'
  );

  // The flex lever must recover the same volume however it is reached.
  const flexFromEngine = deriveFlexCapacityUnits(impacts, SCENARIO_PARAMS, canonicalBaseDemandUnits());
  assertClose(flexFromEngine, canonicalFlexCapacityUnits(), 0.01,
    'Supplier flex recovers the same units on the Demand surface and in the scenario record');
  assertClose(
    DDF_SLA_FLEX_UNITS_PER_WEEK,
    canonicalWeeklyPopulationUnits() * CANONICAL_SCENARIO.supply.supplier_flex_rate_pct / 100,
    0.0001, 'Flex allowance is a share of the canonical population, not a separate count'
  );

  // Campaign Decision must not start from a population of its own.
  assertClose(CDI02_BASE_WEEKLY_UNITS, canonicalWeeklyPopulationUnits(), 0.0001,
    'Campaign timeline works on the canonical weekly population');

  // The unit economics three surfaces publish must be ONE set of numbers.
  const econ = deriveUnitEconomics(null);
  assert(econ.revenue_per_unit_gbp === canonicalRealisedRevenuePerUnitGbp(),
    'Demand revenue per unit IS the canonical realised price',
    `${econ.revenue_per_unit_gbp} vs ${canonicalRealisedRevenuePerUnitGbp()}`);
  assert(econ.gross_margin_per_unit_gbp === canonicalGrossMarginPerUnitGbp(),
    'Demand margin per unit IS the canonical margin basis');
  assert(DDF_GROSS_MARGIN_RATE_PCT === CANONICAL_SCENARIO.economics.gross_margin_rate_pct,
    'One margin rate across the journey');

  // A projection that agrees with the canonical basis must not displace it.
  const nearby = deriveUnitEconomics(canonicalRealisedRevenuePerUnitGbp() * 1.01);
  assert(nearby.revenue_per_unit_gbp === canonicalRealisedRevenuePerUnitGbp(),
    'A projection close to the canonical basis does not establish a second basis');

  // Promotion contribution must resolve through the same prices.
  assertClose(
    CANONICAL_CURRENT_POINT.unit_contribution_gbp,
    canonicalContributionAtDepthGbp(CANONICAL_SCENARIO.economics.promotion_depth_pct),
    0.5, 'Promotion unit contribution at the committed depth uses the canonical economics'
  );
  assertClose(
    canonicalContributionPerUnitAtListGbp() * (1 - canonicalContributionErosionPerDepthPoint() * CANONICAL_SCENARIO.economics.promotion_depth_pct),
    canonicalContributionAtDepthGbp(CANONICAL_SCENARIO.economics.promotion_depth_pct),
    0.5, 'The campaign engine erosion rate reproduces the priced contribution at depth'
  );

  // The promotion economics must be the same ORDER OF MAGNITUDE as the exposure beside them.
  const largestPromotionValue = Math.max(...CANONICAL_ELASTICITY_CURVE.map(p => Math.abs(p.net_contribution_delta_gbp)));
  const exposure = Math.abs(canonicalMarginExposureGbp());
  assert(largestPromotionValue > exposure / 20 && largestPromotionValue < exposure * 20,
    'Promotion economics and demand exposure are on one economic scale',
    `promotion ${largestPromotionValue.toFixed(0)} vs exposure ${exposure.toFixed(0)}`);
}

{
  // The curve must still say what the surface claims: a best depth, and a committed depth below it.
  assert(CANONICAL_RECOMMENDED_POINT.net_contribution_delta_gbp > CANONICAL_CURRENT_POINT.net_contribution_delta_gbp,
    'The recommended depth beats the committed depth on contribution');
  const best = CANONICAL_ELASTICITY_CURVE.reduce((a, b) =>
    b.net_contribution_delta_gbp > a.net_contribution_delta_gbp ? b : a);
  assert(best.discount_pct === CANONICAL_RECOMMENDED_POINT.discount_pct,
    'The depth CogniX recommends is the best depth on its own curve',
    `recommends ${CANONICAL_RECOMMENDED_POINT.discount_pct}%, best is ${best.discount_pct}%`);
  assert(CANONICAL_ELASTICITY_CURVE.every(p => Number.isFinite(p.net_contribution_delta_gbp)),
    'No elasticity point carries a non-finite value');
}

console.log('\n=== 5. INTERVENTION RECOVERY ======================================\n');

{
  const withFlex = calculateDerivedImpacts(SCENARIO_PARAMS, ['SLA_FLEX_RULE_4']);
  const without = calculateDerivedImpacts(SCENARIO_PARAMS, []);
  assert(withFlex.supplier_capacity_units > without.supplier_capacity_units,
    'Serving the flex notice increases what the operation can serve');
  assert(withFlex.commitment_gap_units < without.commitment_gap_units,
    'Serving the flex notice narrows the commitment gap');
  assertClose(
    withFlex.supplier_capacity_units - without.supplier_capacity_units,
    canonicalWeeklyPopulationUnits() * CANONICAL_SCENARIO.supply.supplier_flex_rate_pct / 100,
    0.01, 'The capacity the flex notice adds is the declared flex allowance'
  );
  // Exposure must be priced in the scenario's own currency of value, not at an invented per-unit penalty.
  assert(without.financial_exposure_gbp < without.commitment_gap_units * CANONICAL_SCENARIO.economics.list_price_gbp,
    'Exposure per unserved unit never exceeds the shelf price of the unit',
    `£${without.financial_exposure_gbp} across ${without.commitment_gap_units} units`);
}

console.log('\n=== 6. CURRENCY ===================================================\n');

{
  const rates = SEEDED_FALLBACK_RATES;

  assert(CANONICAL_BASE_CURRENCY === 'GBP', 'GBP is the canonical base currency');
  assert(CANONICAL_SCENARIO.economics.base_currency === CANONICAL_BASE_CURRENCY,
    'The scenario is modelled in the base currency');
  assert(rates.rates[CANONICAL_BASE_CURRENCY] === 1, 'The base rate against itself is exactly 1');

  // No conversion at all on the default path — not a multiplication by a rate that happens to be 1.
  const amount = canonicalMarginExposureGbp();
  assert(convertFromBase(amount, 'GBP', rates) === amount, 'Converting to the base currency is the identity');
  assert(formatBaseMoney(1234, 'GBP', rates, { compact: false }) === '£1,234', 'GBP formats with a pound sign');

  const usd = convertFromBase(1000, 'USD', rates);
  const eur = convertFromBase(1000, 'EUR', rates);
  assert(Math.abs(usd - 1000 * rates.rates.USD) < 1e-9, 'GBP → USD applies the USD rate once', String(usd));
  assert(Math.abs(eur - 1000 * rates.rates.EUR) < 1e-9, 'GBP → EUR applies the EUR rate once', String(eur));
  assert(usd !== 1000 && eur !== 1000, 'Conversion changes the value — it is not a symbol swap');
  assert(formatBaseMoney(1000, 'USD', rates, { compact: false }).startsWith('$'), 'USD formats with a dollar sign');
  assert(formatBaseMoney(1000, 'EUR', rates, { compact: false }).startsWith('€'), 'EUR formats with a euro sign');

  // Double conversion: passing a converted amount back in must NOT be how the layer is used, and
  // the guard is that the layer only ever accepts base amounts. Assert the shape of that contract.
  const once = convertFromBase(1000, 'USD', rates);
  const twice = convertFromBase(once, 'USD', rates);
  assert(twice !== once, 'Converting an already-converted amount is detectably different — callers must pass base amounts',
    `${once} vs ${twice}`);

  // Rounding: a compact display must not drift from the converted value.
  const compact = formatBaseMoney(269368, 'USD', rates);
  const expectedCompact = `$${(269368 * rates.rates.USD / 1000).toFixed(1)}K`;
  assert(compact === expectedCompact, 'Compact formatting rounds the CONVERTED value', `${compact} vs ${expectedCompact}`);

  // Non-monetary values must be untouched by the currency layer.
  const units = canonicalExposedDemandUnits();
  assert(convertBaseAmount(units, 'GBP', rates) === units, 'Unit counts are not converted on the base path');
  const sentence = '130,129 units exposed over 14 days at 18.6pp, stability 64, 62h remaining, 1,450 stores';
  assert(localiseMoneyInText(sentence, 'USD', rates) === sentence,
    'Units, percentages, scores, hours and store counts are left alone by the money transform');

  // Engine prose converts, and keeps the scale and precision the engine chose.
  const prose = '£269.4K of revenue we cannot currently serve, carrying £80.7K gross margin.';
  const localised = localiseMoneyInText(prose, 'USD', rates);
  assert(!localised.includes('£'), 'No pound sign survives localisation into USD', localised);
  assert(localised.includes('$') && localised.includes('K'), 'Localised prose keeps the engine\'s own scale', localised);
  assert(localiseMoneyInText(prose, 'GBP', rates) === prose,
    'Localising into the base currency returns the sentence untouched');

  // Fallback behaviour: the seeded set must be usable and must declare itself.
  assert(rates.source === 'SEEDED_FALLBACK', 'The fallback rate set declares that it is a fallback');
  assert(typeof rates.degraded_reason === 'string' && rates.degraded_reason.length > 0,
    'The fallback rate set says why it is in use');
  assert(!!rates.rate_date, 'The fallback rate set is dated');
  assert(SUPPORTED_CURRENCIES.every(c => Number.isFinite(rates.rates[c]) && rates.rates[c] > 0),
    'Every supported currency has a usable fallback rate');

  // A broken rate set must degrade to the unconverted amount, never to zero or NaN.
  const broken = { ...rates, rates: { GBP: 1, USD: 0, EUR: Number.NaN } } as unknown as FxRateSet;
  assert(convertFromBase(500, 'USD', broken) === 500, 'A zero rate leaves the amount unconverted rather than zeroing it');
  assert(convertFromBase(500, 'EUR', broken) === 500, 'A non-finite rate leaves the amount unconverted');
  assert(formatBaseMoney(Number.NaN, 'USD', rates) === '—', 'A non-finite amount renders as an absence, not as a number');
}

console.log('\n=== 7. SCENARIO RESET =============================================\n');

{
  // Reset means deterministic: the opening position must be a pure function of the record, so the
  // second run of a demonstration opens exactly where the first one did.
  const a = calculateDerivedImpacts(SCENARIO_PARAMS, []);
  const b = calculateDerivedImpacts({ ...SCENARIO_PARAMS }, []);
  assert(JSON.stringify(a) === JSON.stringify(b), 'The opening position is deterministic');

  const moved = calculateDerivedImpacts({ ...SCENARIO_PARAMS, promotion_lift: 35 }, ['SLA_FLEX_RULE_4']);
  assert(JSON.stringify(moved) !== JSON.stringify(a), 'Moving the scenario changes the derived position');
  const restored = calculateDerivedImpacts(SCENARIO_PARAMS, []);
  assert(JSON.stringify(restored) === JSON.stringify(a), 'Returning the parameters restores the opening position exactly');

  assertClose(canonicalBaseDemandUnits(), canonicalBaseDemandUnits(), 0, 'Scenario derivations carry no hidden state');
}

console.log('\n=== 8. PROMOTION MODEL RECONCILIATION ==============================\n');

{
  /*
   * The Promotion surface publishes TWO demand numbers for one campaign, and they are not the
   * same quantity. The elasticity curve plots what price depth alone buys; the causal engine
   * reports what this campaign as configured causes. These assertions pin the RELATIONSHIP
   * between them, which is the thing that must never quietly break — not equality, which would
   * be wrong, and not independence, which is what made them look contradictory.
   */
  const evaluateAt = (session: string, region: string) => {
    clearCampaignIntents();
    const draft = createDefaultCampaignIntentDraft('tenant_uk_retail_01', session);
    draft.campaign_intent.intervention_posture = 'CONSIDER_PROMOTION';
    draft.campaign_intent.provisional_mechanic = '20_percent_off';
    draft.campaign_intent.provisional_discount_depth = CANONICAL_SCENARIO.economics.promotion_depth_pct;
    draft.audience_market.region = region;
    const campaign = registerCampaignIntent(draft);
    return evaluateCampaignDecision({
      tenant_id: campaign.tenant_id,
      session_id: campaign.session_id,
      campaign_intent_id: campaign.campaign_intent_id,
      include_signals: false
    });
  };

  // The curve is drawn for the scenario's own scope, so that is where the two must meet exactly.
  const evaluation = evaluateAt('sess_reconcile_national', CANONICAL_SCENARIO.identity.market_scope_label);

  const bridge = evaluation.counterfactual.demand_bridge;
  const basis = evaluation.counterfactual.economic_basis;

  assert(!!bridge, 'The counterfactual publishes a demand bridge');
  assert(!!basis, 'The counterfactual publishes the period its money is expressed on');

  // THE reconciliation: the engine's price-depth response IS the quantity the curve plots.
  assertClose(
    bridge!.price_depth_response_pp,
    CANONICAL_CURRENT_POINT.expected_demand_uplift_pct,
    0.5,
    'At the scenario\'s own scope, the engine\'s price-depth response IS the curve\'s depth response'
  );

  /*
   * ADR-079 replaces the old bounded-divergence assertion rather than relaxing it.
   *
   * This used to assert that a different scope moved the price-depth response only within a
   * +/-6% band — and the bound WAS the `skuContextFactor` hash band, so the assertion was
   * measuring the defect rather than the model. With the hash retired and differentiation
   * declared, the price cut buys the same demand response at every scope unless the scenario
   * SAYS otherwise and says why. What legitimately differs between scopes is audience,
   * placement and timing, which is exactly what ADR-075 said the seam was, and those appear
   * in the design components rather than in the price-depth response.
   */
  const regional = evaluateAt('sess_reconcile_regional', CANONICAL_SCENARIO.identity.focus_region);
  const regionalDepth = regional.counterfactual.demand_bridge!.price_depth_response_pp;
  const nationalDepth = bridge!.price_depth_response_pp;
  assert(
    regionalDepth === nationalDepth,
    'The price-depth response is identical at every scope, because the scenario declares no scope differentiation',
    `${regionalDepth} at ${CANONICAL_SCENARIO.identity.focus_region} vs ${nationalDepth} at ${CANONICAL_SCENARIO.identity.market_scope_label}`
  );
  assert(
    Object.keys(CANONICAL_SCENARIO.differentiation.scope_response_multipliers).length === 0,
    'The canonical scenario declares no scope response multiplier, so nothing modifies its depth response'
  );
  /*
   * And the divergence that DOES remain between the two scopes is named, driver by driver.
   * A difference nobody can point at is how a second economic model starts.
   */
  const regionalDesign = regional.counterfactual.demand_bridge!.campaign_design_response_pp;
  const nationalDesign = bridge!.campaign_design_response_pp;
  const namedDesignDelta = Number(
    regional.counterfactual.demand_bridge!.design_components
      .reduce((sum, c) => {
        const national = bridge!.design_components.find(n => n.driver_id === c.driver_id);
        return sum + (c.contribution_pp - (national?.contribution_pp ?? 0));
      }, 0)
      .toFixed(2)
  );
  assertClose(
    namedDesignDelta,
    Number((regionalDesign - nationalDesign).toFixed(2)),
    0.01,
    'Every percentage point by which two scopes differ is attributed to a named design component'
  );
  assert(
    regional.counterfactual.demand_bridge!.price_depth_response_pp
      + regional.counterfactual.demand_bridge!.campaign_design_response_pp
      === regional.counterfactual.demand_bridge!.total_attributable_pp
      || Math.abs(
        regional.counterfactual.demand_bridge!.price_depth_response_pp
        + regional.counterfactual.demand_bridge!.campaign_design_response_pp
        - regional.counterfactual.demand_bridge!.total_attributable_pp) < 0.01,
    'The bridge still reconciles at a regional scope'
  );

  // The bridge must actually bridge — a decomposition that does not sum explains nothing.
  assertClose(
    bridge!.price_depth_response_pp + bridge!.campaign_design_response_pp,
    bridge!.total_attributable_pp,
    0.01,
    'Price depth plus campaign design equals what the campaign causes'
  );
  assertClose(
    bridge!.total_attributable_pp,
    evaluation.causal.intervention_uplift_pp,
    0.01,
    'The bridge total is the engine\'s own attributable uplift, not a second figure'
  );

  // Design effects are what the curve deliberately holds fixed, so they must be non-zero and
  // named — otherwise the surface is claiming a difference it cannot show.
  assert(bridge!.campaign_design_response_pp !== 0,
    'The campaign design contributes demand the depth curve does not model',
    String(bridge!.campaign_design_response_pp));
  assert(bridge!.design_components.length > 0 && bridge!.design_components.every(c => !!c.label),
    'Every design component the bridge counts is named');
  assert(bridge!.design_components.every(c => c.driver_id !== 'mechanic_response' && c.driver_id !== 'portfolio_effects'),
    'The price mechanic is never double-counted as a design component');

  // Period: the rate and the campaign total are different numbers and must both be published.
  assert(basis!.rate_period_days === 7, 'The trajectory rate period is declared as a week');
  assert(basis!.campaign_window_days === CANONICAL_SCENARIO.calendar.forecast_horizon_days,
    'The campaign window is the same length as the forecast horizon it answers',
    `${basis!.campaign_window_days} vs ${CANONICAL_SCENARIO.calendar.forecast_horizon_days}`);
  assertClose(
    basis!.contribution_delta_over_window_gbp,
    evaluation.counterfactual.campaign_delta.contribution_delta_gbp * (basis!.campaign_window_days / basis!.rate_period_days),
    0.01,
    'The campaign-window contribution is the weekly rate over the campaign window'
  );
  assert(basis!.contribution_delta_over_window_gbp !== evaluation.counterfactual.campaign_delta.contribution_delta_gbp,
    'A weekly rate and a campaign total are published as different numbers');
  assert(basis!.base_currency === CANONICAL_BASE_CURRENCY,
    'The counterfactual declares the currency its money is modelled in');

  // The whole-campaign response must exceed the depth-only response, or the design is free.
  assert(bridge!.total_attributable_pp > bridge!.price_depth_response_pp,
    'A configured campaign moves more demand than its price cut alone');

  /*
   * The waterfall decomposes the same campaign window the curve prices, so its intervention lines
   * must add up to what the curve says the price cut buys. It published +48.0pp beside a card
   * reading +46.8% for the same quantity — three numbers for one thing on one screen.
   */
  const waterfall = CAMPAIGN_ARCHETYPES_MAP['ARCH-CHILLED-ELASTIC'].waterfall;
  const interventionLines = waterfall.filter(w => w.driver_class === 'intervention' && w.id !== 'wf_net');
  const ambientLines = waterfall.filter(w => w.driver_class === 'ambient' && w.id !== 'wf_base');
  const net = waterfall.find(w => w.id === 'wf_net');
  const sum = (items: typeof waterfall) => Number(items.reduce((t, w) => t + w.contribution_pp, 0).toFixed(1));

  assert(!!net, 'The waterfall publishes a net line');
  assertClose(sum(interventionLines), CANONICAL_CURRENT_POINT.expected_demand_uplift_pct, 0.5,
    'The waterfall\'s intervention lines add up to the depth response the curve plots');
  assertClose(net!.contribution_pp, sum(ambientLines) + sum(interventionLines), 0.5,
    'The waterfall\'s net is its own ambient plus intervention lines');
  assert(net!.rationale.includes(CANONICAL_CURRENT_POINT.expected_demand_uplift_pct.toFixed(1)),
    'The waterfall names the intervention-attributable share the curve plots', net!.rationale);
  assert(waterfall.some(w => w.label.includes(`${CANONICAL_CURRENT_POINT.discount_pct}% Cut`)),
    'The waterfall names the depth it is decomposing');
}

console.log('\n=== 9. EVERY SELECTABLE ARCHETYPE ==================================\n');

{
  /*
   * A presenter can switch archetype mid-demonstration. Before this, six of the seven carried
   * elasticity economics from a 50-store, 10,000-unit estate, so one click left the unified
   * economics behind and landed in the world this workstream exists to remove. These assertions
   * hold for EVERY selectable archetype, not just the canonical one.
   */
  const archetypes = Object.entries(CAMPAIGN_ARCHETYPES_MAP);
  assert(archetypes.length >= 7, 'The archetype set is populated', String(archetypes.length));

  for (const [id, archetype] of archetypes) {
    const summary = archetype.curve_summary;
    assert(!!summary, `${id}: publishes a derived curve summary`);

    /*
     * Scope: a targeted play may legitimately be small, so the test is not that every count is
     * large. It is that the archetype's WIDEST play outgrew the retired estate — an archetype
     * whose broadest reach is still 50 stores never left it — and that no play claims more stores
     * than its own scope contains.
     */
    const widest = Math.max(...archetype.frontier_plays.map(p => p.stores_count));
    const scopeStores = canonicalStoreCount(archetype.default_region);
    assert(
      widest > LEGACY_DEMO_ESTATE_STORES,
      `${id}: the widest frontier play outgrew the retired ${LEGACY_DEMO_ESTATE_STORES}-store estate`,
      archetype.frontier_plays.map(p => p.stores_count).join(', ')
    );
    assert(
      archetype.frontier_plays.every(p => p.stores_count <= Math.max(scopeStores, canonicalStoreCount('National'))),
      `${id}: no frontier play reaches more stores than the estate has`
    );

    // Economics: unit contribution must be this archetype's own price less its own cost, priced
    // through the shared funding rule — not a number carried over from a different calibration.
    for (const point of archetype.elasticity_curve) {
      assertClose(
        point.unit_contribution_gbp,
        canonicalContributionAtDepthGbp(point.discount_pct, archetype.rrp, archetype.cost_price),
        1,
        `${id}: unit contribution at ${point.discount_pct}% is derived from its own price and cost`
      );
    }
    assert(
      archetype.elasticity_curve.every(p => p.unit_contribution_gbp <= archetype.rrp - archetype.cost_price + 1e-6),
      `${id}: no depth earns more contribution than selling at full price`
    );

    // Scale: the pounds on this archetype must belong to the same estate as its own volumes.
    const baselineUnits = archetypeBaselineUnits(
      archetype.base_weekly_units_per_store, archetype.default_region, archetype.default_duration_days
    );
    const baselineContribution = baselineUnits * (archetype.rrp - archetype.cost_price);
    const largest = Math.max(...archetype.elasticity_curve.map(p => Math.abs(p.net_contribution_delta_gbp)), 1);
    assert(
      largest < baselineContribution,
      `${id}: no depth moves more contribution than the archetype earns in total`,
      `${largest.toFixed(0)} against a ${baselineContribution.toFixed(0)} base`
    );

    // Coherence: exactly one current tier, exactly one recommendation, and the recommendation is
    // never worse than the plan it is recommending against.
    assert(
      archetype.elasticity_curve.filter(p => p.is_current).length === 1,
      `${id}: exactly one tier is marked as the current plan`
    );
    assert(
      archetype.elasticity_curve.filter(p => p.is_cognix_recommended).length === 1,
      `${id}: exactly one tier is recommended`
    );
    assert(
      summary!.recommended_contribution_gbp >= summary!.current_contribution_gbp,
      `${id}: the recommended depth is never worse than the committed depth`,
      `${summary!.recommended_contribution_gbp} vs ${summary!.current_contribution_gbp}`
    );

    // The headline must read off the curve drawn beneath it.
    assertClose(
      archetype.discovery.net_contribution_delta_gbp,
      summary!.current_contribution_gbp,
      0.01,
      `${id}: the discovery headline is the curve's own current tier`
    );

    // Narrative must not assert a contribution the curve recomputes.
    const prose = [
      archetype.discovery.core_narrative,
      archetype.discovery.key_finding,
      archetype.discovery.primary_tension_description
    ].join(' ');
    const stale = (prose.match(/£[\d.,]+[KM]?/g) ?? []).filter(amount => {
      // A price point (a competitor's meal deal, a multibuy) is a price, not a contribution claim.
      const value = Number(amount.replace(/[£,KM]/g, ''));
      return !/[KM]$/.test(amount) && value > 100;
    });
    assert(
      id === 'ARCH-CHILLED-ELASTIC' || stale.length === 0,
      `${id}: no narrative asserts a contribution figure the curve derives`,
      stale.join(', ')
    );
  }
}

console.log('\n=== 10. STRUCTURED MONEY ==========================================\n');

{
  /*
   * The engine owns what an amount MEANS; the surface owns what it looks like. Where a statement
   * carries structured parts, nothing has to be parsed back out of prose — which is what the
   * regex compatibility path does and why it is a stand-in rather than the architecture.
   */
  const parts: NarrativeStatement = [
    { kind: 'text', text: 'Recovering ' },
    { kind: 'money', money: moneyAmount(52079, 'gross_margin_recovered') },
    { kind: 'text', text: ' of gross margin.' }
  ];

  assert(statementToBaseText(parts) === 'Recovering £52,079 of gross margin.',
    'A statement flattens to the engine\'s own base-currency text', statementToBaseText(parts));
  assert(formatStatement(parts, 'GBP', SEEDED_FALLBACK_RATES) === statementToBaseText(parts),
    'Rendering a statement in the base currency matches the engine\'s text exactly');

  const usd = formatStatement(parts, 'USD', SEEDED_FALLBACK_RATES);
  assert(!usd.includes('£') && usd.includes('$'),
    'A statement rendered in USD carries no pound sign', usd);
  assert(usd.includes(Math.round(52079 * SEEDED_FALLBACK_RATES.rates.USD).toLocaleString('en-US')),
    'The rendered amount is the base amount converted once', usd);
  assert(usd.startsWith('Recovering ') && usd.endsWith(' of gross margin.'),
    'Text segments are untouched by currency', usd);

  // The meaning travels with the amount — that is what makes it structured rather than formatted.
  const money = parts.find(p => p.kind === 'money');
  assert(money?.kind === 'money' && money.money.meaning === 'gross_margin_recovered',
    'An amount carries what it means, not just what it is');
  assert(money?.kind === 'money' && money.money.base_currency === CANONICAL_BASE_CURRENCY,
    'An amount declares the currency it is modelled in');

  // The demand journey's simulated outcome must travel structured, because it is the statement
  // that was still leaking a pound sign into USD before this.
  const archetypeParts = CAMPAIGN_ARCHETYPES_MAP['ARCH-CHILLED-ELASTIC'].discovery.core_narrative_parts;
  assert(!!archetypeParts, 'The Promotion headline carries its derived amounts structured');
  assert(
    !!archetypeParts && statementToBaseText(archetypeParts) === CAMPAIGN_ARCHETYPES_MAP['ARCH-CHILLED-ELASTIC'].discovery.core_narrative,
    'The structured headline and its text form are the same sentence'
  );
  assert(
    !!archetypeParts && !formatStatement(archetypeParts, 'EUR', SEEDED_FALLBACK_RATES).includes('£'),
    'The Promotion headline carries no pound sign into EUR'
  );
}

console.log('\n=== 11. SUPPLIER FUNDING TRANSPARENCY =============================\n');

{
  /*
   * The funding rate is illustrative and must read as one. It is also the term that decides
   * whether a promotion pays, so it has to be findable and it has to actually drive the numbers —
   * an assumption nobody can see and nothing responds to is decoration.
   */
  const fundingPct = CANONICAL_SCENARIO.economics.supplier_promotional_funding_pct;
  assert(fundingPct > 0 && fundingPct < 100,
    'Supplier funding is a share of the price investment, not all or nothing', String(fundingPct));
  assert(CANONICAL_SCENARIO.provenance.basis === 'MODELLED_DEMONSTRATION_ASSUMPTION',
    'The scenario the funding term belongs to declares itself modelled');
  assert(/no figure is taken from|any named retailer/i.test(CANONICAL_SCENARIO.provenance.statement),
    'The scenario states that no figure describes a named retailer');

  // It must drive the arithmetic, monotonically and in the right direction.
  const depth = CANONICAL_SCENARIO.economics.promotion_depth_pct;
  const atList = canonicalContributionPerUnitAtListGbp();
  const contributionAt = canonicalContributionAtDepthGbp(depth);
  assert(contributionAt < atList,
    'A promoted unit earns less contribution than one sold at list');

  const retailerShare = canonicalRetailerFundedShare();
  assertClose(
    retailerShare,
    1 - fundingPct / 100,
    0.0001,
    'The retailer carries exactly what the supplier does not fund'
  );
  // Reconstructing the contribution from the funding rate is the check that the rate is really
  // what moves it, rather than sitting beside a number computed some other way.
  assertClose(
    contributionAt,
    atList - CANONICAL_SCENARIO.economics.list_price_gbp * (depth / 100) * retailerShare,
    0.01,
    'Contribution at depth is list contribution less the share of price the retailer funds'
  );

  // More funding must mean more contribution, always, at any depth.
  const shallower = canonicalContributionAtDepthGbp(depth / 2);
  assert(shallower > contributionAt,
    'A shallower cut earns more contribution at the same funding rate');
  assert(canonicalContributionErosionPerDepthPoint() > 0
    && canonicalContributionErosionPerDepthPoint() < 1,
    'The erosion rate the funding term produces is a sane share of contribution',
    String(canonicalContributionErosionPerDepthPoint()));

  // Funding conditions must be worth what they claim to be worth.
  for (const [id, archetype] of Object.entries(CAMPAIGN_ARCHETYPES_MAP)) {
    const funding = archetype.inverse_conditions.filter(c => c.target_parameter === 'SUPPLIER_FUNDING');
    for (const condition of funding) {
      const gap = archetype.curve_summary!.recommended_contribution_gbp
        - archetype.curve_summary!.current_contribution_gbp;
      assertClose(condition.target_value, Math.max(0, Math.round(gap)), 0.01,
        `${id}: the funding a condition asks for is the contribution gap it closes`);
      assert(!/£[\d,]{4,}/.test(condition.explanation) || condition.target_value > 0,
        `${id}: a funding condition never quotes a sum it does not need`);
    }
  }
}

console.log('\n=== 12. RESET AND FX DEGRADATION ==================================\n');

{
  /*
   * A demonstration is run many times a day, and the second run has to open exactly where the
   * first one did. Reset is therefore a correctness property, not a convenience: state that
   * survives it is state the next audience sees without being told.
   */
  const params: DecisionScenarioParameters = { ...SCENARIO_PARAMS };
  const opening = calculateDerivedImpacts(params, []);

  // A presenter moves the scenario and selects an intervention.
  const moved = calculateDerivedImpacts(
    { ...params, promotion_lift: 35, supplier_capacity_cap: 0, cannibalisation_factor: 15 },
    ['SLA_FLEX_RULE_4', 'BUFFER_OPTIMISATION_R002']
  );
  assert(JSON.stringify(moved) !== JSON.stringify(opening), 'Reset fixture: the scenario genuinely moved');

  // Returning the declared parameters returns the whole derived position, field by field.
  const restored = calculateDerivedImpacts(params, []);
  for (const key of Object.keys(opening) as (keyof typeof opening)[]) {
    assert(restored[key] === opening[key], `Reset restores ${String(key)} exactly`,
      `${restored[key]} vs ${opening[key]}`);
  }

  // The opening position must be the canonical scenario's, not merely self-consistent.
  assertClose(
    opening.weekly_demand_units,
    canonicalWeeklyPopulationUnits() * (1 + CANONICAL_SCENARIO.economics.promotion_depth_pct / 100),
    0.01, 'The position reset returns to is the canonical scenario\'s own'
  );
  assert(opening.commitment_gap_units > 0,
    'The opening position still has the gap the demonstration is about');

  // Currency is part of the opening position: a reader who left it in EUR must not hand the next
  // audience a euro-denominated demonstration.
  assert(CANONICAL_BASE_CURRENCY === 'GBP' && CANONICAL_SCENARIO.economics.base_currency === 'GBP',
    'The currency reset returns to is GBP');
}

{
  /*
   * FX degradation. A rate host that is unreachable — a policy block, an outage, a demonstration
   * on a train — must cost provenance and nothing else. These assert the SHAPE of that promise
   * against the seeded set, which is what the service falls back to.
   */
  const fallback = SEEDED_FALLBACK_RATES;
  assert(fallback.source === 'SEEDED_FALLBACK', 'The fallback declares itself a fallback');
  assert(!!fallback.degraded_reason, 'The fallback says why it is in use');
  assert(SUPPORTED_CURRENCIES.every(c => Number.isFinite(fallback.rates[c]) && fallback.rates[c] > 0),
    'Every supported currency is usable on the fallback');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(fallback.rate_date),
    'The fallback is dated, so a reader can see how old it is', fallback.rate_date);

  // The demonstration must render identically on the fallback — same conversion, same rounding.
  const exposure = canonicalMarginExposureGbp();
  assert(formatBaseMoney(exposure, 'GBP', fallback) === formatBaseMoney(exposure, 'GBP', fallback),
    'Formatting is deterministic on the fallback');
  assert(formatBaseMoney(exposure, 'USD', fallback).startsWith('$'),
    'A degraded rate set still converts rather than refusing');
  assert(convertFromBase(exposure, 'GBP', fallback) === exposure,
    'A degraded rate set still leaves the base currency untouched');
}


console.log('\n=== 11. SCI-01 SOURCE GUARDS =======================================\n');

{
  /*
   * Three source guards, because each of these defects was invisible to every behavioural
   * assertion in this file. A route that defaults a scenario still returns valid signals; a
   * civil-time stamp still validates; a name hash is still deterministic. They were found by
   * reading, and they come back the same way unless something reads for them every run.
   */
  const ROOT = join(__dirname, '..', '..');

  const sourceFiles = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) out.push(...sourceFiles(rel));
      else if (/\.tsx?$/.test(entry.name)) out.push(rel);
    }
    return out;
  };

  const stripComments = (code: string) =>
    code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const appSources = sourceFiles('app').concat(sourceFiles('services'));
  const engineSources = sourceFiles('lib').concat(sourceFiles('packages/contracts/src'));
  const allSources = appSources.concat(engineSources).concat(sourceFiles('components'));

  // ── Guard 1 — no literal scenario default on any route (ADR-077 part 4) ─────
  const defaulting: string[] = [];
  for (const rel of allSources) {
    const code = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
    // `something || 'SCN-…'` or `?? 'SCN-…'` — a scenario identity acquired by falling back.
    if (/(\|\||\?\?)\s*['"`]SCN-[A-Z0-9-]+['"`]/.test(code)) defaulting.push(rel);
    // A route parameter defaulting to a world family is the same defect wearing taxonomy.
    if (/searchParams\.get\([^)]*\)\s*\|\|\s*['"`](promotion_surge|supplier_breach|weather_demand|fresh_perishable_waste|dc_overtime|regional_imbalance)['"`]/.test(code)) {
      defaulting.push(rel);
    }
  }
  assert(
    defaulting.length === 0,
    'No source file resolves a scenario identity by defaulting to a literal',
    defaulting.join(', ')
  );

  // ── Guard 2 — no civil time in deterministic scenario evidence (ADR-078) ────
  /*
   * Scoped to where the boundary actually is. `new Date()` is CORRECT for a server receipt,
   * a telemetry ingestion stamp or a health reading, so a blanket ban would be wrong and
   * would be turned off within a week. What must never happen is a scenario OBSERVATION
   * taking the wall clock.
   */
  const civilEvidence: string[] = [];
  for (const rel of allSources) {
    const code = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
    if (/\b(observed_at|effective_at)\s*:\s*(new Date\(\)|now|Date\.now\(\))/.test(code)) {
      civilEvidence.push(rel);
    }
  }
  assert(
    civilEvidence.length === 0,
    'No scenario observation is stamped with civil wall-clock time',
    civilEvidence.join(', ')
  );

  // Two consecutive reads of the same scenario are byte-identical, timestamps included.
  const readA = generateSyntheticSignalSnapshot(CANONICAL_SCENARIO, 'tenant_uk_retail_01');
  const readB = generateSyntheticSignalSnapshot(CANONICAL_SCENARIO, 'tenant_uk_retail_01');
  assert(
    JSON.stringify(readA) === JSON.stringify(readB),
    'Two consecutive signal reads are byte-identical, timestamps included'
  );
  assert(
    readA.every(s => Date.parse(s.observed_at) <= Date.parse(canonicalScenarioNowIso())),
    'Every observation is stamped at or before the scenario clock, so freshness is a real reading'
  );

  // ── Guard 3 — no hash-derived economic modifier in source (ADR-079) ─────────
  /*
   * What is forbidden is a hash of a NAME becoming a NUMBER that money is multiplied by.
   * Hashing a name into a stable IDENTIFIER is not only allowed, it is preferred — several
   * engines derive execution and evaluation ids that way precisely so an id never comes from
   * the clock. So the guard looks at what the hash BECOMES: a string id passes, a numeric
   * factor does not. A blanket ban on `charCodeAt` would flag four correct call sites and be
   * switched off within a week, which is how guards stop guarding.
   */
  /*
   * One DECLARED exclusion, recorded rather than silently scoped away.
   *
   * `lib/campaign-opportunity-engine.ts` derives CDI-03 opportunity-window and micro-market
   * READINESS POINTS from `hash01()` keyed on dates, store ids, region and SKU names. It is
   * the same fragility under renaming that ADR-079 describes, and it is a real finding — but
   * it modifies a SCORE, not this scenario's published economics, and ADR-079's ruling names
   * `skuContextFactor`. Retiring it would move CDI-03's published windows with no governance
   * authorising that. Registered as a residual for the packet that owns CDI-03 scoring; named
   * here so the guard keeps firing for anything NEW rather than being switched off.
   */
  const DECLARED_NON_ECONOMIC_HASHES = ['lib/campaign-opportunity-engine.ts'];

  const hashed: string[] = [];
  for (const rel of engineSources) {
    if (DECLARED_NON_ECONOMIC_HASHES.includes(rel)) continue;
    const code = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
    if (/skuContextFactor|SKU_CONTEXT_BAND_PCT/.test(code)) { hashed.push(`${rel} (named hash modifier)`); continue; }

    for (const fn of code.split(/\bfunction\s/).slice(1)) {
      const body = fn.slice(0, fn.indexOf('\n}') + 2 || undefined);
      if (!/charCodeAt\(/.test(body)) continue;
      // A hash that leaves as an identifier: `toString(radix)` or interpolated into a string.
      const becomesIdentifier = /\.toString\(\s*\d+\s*\)/.test(body) || /return\s*`/.test(body);
      // A hash that leaves as a band or factor: `0.94 + (seed % 13) / 100` and its relatives.
      const becomesFactor = /return[^;]*[%&|^]\s*\d+[^;]*[/*+-]/.test(body) || /return\s*\d*\.\d+\s*\+/.test(body);
      if (becomesFactor || !becomesIdentifier) hashed.push(`${rel} (hash used numerically)`);
    }
  }
  assert(
    hashed.length === 0,
    'No engine derives an economic modifier from a hash of a name',
    hashed.join(', ')
  );
  // The declared exclusion must stay non-economic: it may score, it may not price.
  const opportunityCode = stripComments(readFileSync(join(ROOT, DECLARED_NON_ECONOMIC_HASHES[0]), 'utf8'));
  assert(
    !/hash01\([^)]*\)[^;\n]*(gbp|Gbp|GBP|contribution|margin|revenue|price)/.test(opportunityCode),
    'The one declared non-economic hash still touches no money',
    DECLARED_NON_ECONOMIC_HASHES[0]
  );

  // ── The identity invariant the guards exist to protect ─────────────────────
  assert(
    getActiveScenarioId() === CANONICAL_SCENARIO_ID,
    'The registry declares exactly one demo-active scenario and it is the canonical one',
    String(getActiveScenarioId())
  );
  let missingRefused = false;
  try { requireScenarioId(null, 'guard'); } catch { missingRefused = true; }
  assert(missingRefused, 'A missing scenario_id is refused rather than resolved');
  let unknownRefused = false;
  try { resolveScenario('SCN-PROMO-01'); } catch { unknownRefused = true; }
  assert(unknownRefused, 'The retired SCN-PROMO-01 identity no longer resolves to anything');

  // The supplier named in the signals IS the supplier named in the economics (R-20).
  const supplierSignal = readA.find(s => s.signal_type === 'SUPPLIER_CAPACITY_PRESSURE');
  assert(
    !!supplierSignal && supplierSignal.entity_id === CANONICAL_SCENARIO.supply.supplier_name,
    'One supplier is named for the canonical scenario across economics and signals',
    `${supplierSignal?.entity_id} vs ${CANONICAL_SCENARIO.supply.supplier_name}`
  );
  /*
   * The retired supplier must not survive anywhere the connected journey generates evidence
   * or carries identity. Scoped to those paths deliberately: FreshDirect UK still appears in
   * unconnected legacy surfaces (Waste, Category, Command Centre) which are not part of this
   * journey and belong to later packets. Widening it here would fail on work SCI-01 does not own.
   */
  const CONNECTED_EVIDENCE_PATHS = [
    'services/world/src/enterprise-signal-generator.ts',
    'services/world/src/dynamic-signal-simulator.ts',
    'lib/decision-state-store.ts',
    'lib/campaign-causal-engine.ts'
  ];
  const retiredSupplierLeaks = CONNECTED_EVIDENCE_PATHS.filter(rel =>
    /FreshDirect/.test(stripComments(readFileSync(join(ROOT, rel), 'utf8')))
  );
  assert(
    retiredSupplierLeaks.length === 0,
    'No retired supplier survives in the connected journey\'s signal, causal or decision-state path',
    retiredSupplierLeaks.join(', ')
  );

  // ── Provenance vocabulary (ADR-082) ────────────────────────────────────────
  assert(
    validateProvenanceDescriptor(CANONICAL_SCENARIO.provenance.descriptor).valid,
    'The scenario record carries a valid ADR-082 provenance descriptor'
  );
  assert(
    !validateProvenanceDescriptor({ origin: 'drafted', method: 'llm', authority: 'authoritative' }).valid,
    'A drafted value may never carry authority, whatever declares it'
  );
  assert(
    provenanceFromEvidenceOrigin('ESF-6_ATTESTED_SOURCE').origin === 'attested'
      && provenanceFromDemandInputClass('MODELLED_DEMO_ASSUMPTION').origin === 'modelled'
      && provenanceFromTelemetryProvenance('measured').origin === 'observed'
      && provenanceFromArchetypeGraphProvenance('DERIVED').origin === 'derived',
    'All five existing provenance vocabularies map onto the one declared vocabulary'
  );
  assert(
    provenanceFromDemandInputClass('SYNTHETIC_OBSERVED').origin === 'modelled',
    'A synthetic observation never maps to `observed`, so it cannot pass as client telemetry'
  );
}

console.log(`\n=================================================================`);
console.log(`Passed: ${passed}   Failed: ${failed}`);
console.log(`=================================================================\n`);
process.exit(failed === 0 ? 0 : 1);
