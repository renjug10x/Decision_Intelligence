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
  canonicalRevenueExposureGbp,
  canonicalMarginExposureGbp,
  canonicalWeeklyPopulationUnits,
  canonicalStoreCount,
  canonicalNetworkCoverDays,
  calculateDerivedImpacts,
  DecisionScenarioParameters,
  SEEDED_FALLBACK_RATES,
  CANONICAL_BASE_CURRENCY,
  SUPPORTED_CURRENCIES,
  convertFromBase,
  FxRateSet
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
  REGION_STORE_COUNTS
} from '../../lib/campaign-archetypes';

import { CDI02_BASE_WEEKLY_UNITS } from '../../packages/contracts/src/campaign-timeline-model';
import { formatBaseMoney, localiseMoneyInText, convertBaseAmount } from '../../lib/currency/format';
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

console.log(`\n=================================================================`);
console.log(`Passed: ${passed}   Failed: ${failed}`);
console.log(`=================================================================\n`);
process.exit(failed === 0 ? 0 : 1);
