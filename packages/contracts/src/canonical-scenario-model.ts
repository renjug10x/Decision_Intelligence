/**
 * CogniX Canonical Demonstration Scenario
 * ───────────────────────────────────────────────────────────────────────────────
 * ONE decision case, viewed through Demand, Promotion, Campaign Decision,
 * Operational Consequence and Learning.
 *
 * Why this module exists
 * ----------------------
 * Before this record, the connected journey resolved its identity and its economics
 * independently on each surface. Demand derived a unit revenue from an estate-wide
 * projection; Promotion and Campaign Decision worked from an abstract 10,000-unit
 * population with a £1.85 unit contribution that no price supported; Decision Ripple
 * published pound values that reconciled with neither. The surfaces agreed on the
 * story and disagreed on the arithmetic, which is precisely the failure a Decision
 * Intelligence product cannot afford: it asks a reader to believe that a decision and
 * its consequence belong to the same world.
 *
 * Everything the connected journey needs to agree on is DECLARED once here. Everything
 * else is DERIVED from it. No connected surface may restate a declared value as its own
 * literal, and no surface may invent a second economic basis for the same quantity.
 *
 * Status of the values
 * --------------------
 * Every figure in this record is a MODELLED DEMONSTRATION ASSUMPTION describing an
 * illustrative major UK omnichannel grocer. Nothing here is, or is derived from, the
 * operating data of any named retailer. Scale is chosen so ratios and relationships are
 * credible to a retail audience, not so individual numbers look large.
 *
 * The arithmetic spine
 * --------------------
 *   base_demand_units      = base_demand_units_per_week x (horizon_days / 7)
 *   expected_demand_units  = base_demand_units x (1 + total_demand_movement_pct/100)
 *   servable_demand_units  = base_demand_units x supplier_capacity_index
 *   exposed_demand_units   = expected_demand_units - servable_demand_units
 *   realised_price         = list_price x (1 - promotion_depth_pct/100 x promotion_participation_pct/100)
 *   gross_margin_per_unit  = realised_price x gross_margin_rate_pct/100
 *   revenue_exposure       = exposed_demand_units x realised_price
 *   margin_exposure        = exposed_demand_units x gross_margin_per_unit
 *
 * Because the supplier capacity index and the supplier flex allowance are declared as
 * RATIOS of the demand base rather than as counts drawn from a separate population, the
 * whole scenario rescales coherently from one number — `base_demand_units_per_week`.
 *
 * One record, many instances (ADR-073 Amendment A, ADR-077)
 * ---------------------------------------------------------
 * `CanonicalScenario` is the MODEL. `SCN-FRESH-DAIRY-CHEDDAR-001` is its first instance
 * and remains the protected reference every other scenario is certified against. The
 * original ruling declared "one canonical decision case", and that ruling was always
 * about COHERENCE rather than about SINGULARITY: every rule above is a property of a
 * scenario, not a property of there being exactly one of them.
 *
 * So the derivations below come in two layers, and the distinction is load-bearing:
 *
 *   `scenario*(scenario, …)`  — the model. Pure functions OF A SCENARIO. This is what a
 *                               second scenario, the certification harness (`SCI-02`) and
 *                               every later packet resolve through.
 *   `canonical*(…)`           — the protected reference, BOUND BY NAME to
 *                               `CANONICAL_SCENARIO` at exactly one place per quantity.
 *
 * The bound layer is not a default resolution. ADR-077 part 4 forbids a SURFACE resolving
 * a scenario by defaulting — `scenario_id` absent must be an error, never a fallback. A
 * derivation that names the reference scenario it is derived for is the opposite of that:
 * it is explicit, it is in one file, and it is why the 227 call sites reading the
 * protected journey did not have to be rewritten to parameterise the model.
 */

import { ScenarioFamilyId } from './enterprise-world-model';
import {
  ProvenanceDescriptor,
  MODELLED_SCENARIO_PROVENANCE
} from './provenance-vocabulary';
import {
  scenarioNowIso as clockNowIso,
  scenarioDateIso as clockDateIso,
  scenarioFreshnessDays as clockFreshnessDays
} from './scenario-clock';

// ── Identity ──────────────────────────────────────────────────────────────────

export const CANONICAL_SCENARIO_ID = 'SCN-FRESH-DAIRY-CHEDDAR-001';

export type ScenarioMarketScope =
  | 'NATIONAL'
  | 'REGION'
  | 'STORE_CLUSTER'
  | 'FULFILMENT_AREA'
  | 'SELECTED_STORES';

export interface CanonicalScenarioIdentity {
  scenario_id: string;
  scenario_name: string;
  /** What the decision is about, in the language a category team would use. */
  decision_question: string;
  category: string;
  subcategory: string;
  sku_id: string;
  sku_name: string;
  /**
   * Where the committed intervention runs. The promotion under challenge is NATIONAL,
   * which is what makes "is 20% nationally still right?" the question the journey asks.
   */
  market_scope: ScenarioMarketScope;
  market_scope_label: string;
  /**
   * Where the demand movement concentrates, and the scope a targeted alternative would
   * use. A focal region inside a national decision — not a second, smaller scenario.
   */
  focus_region: string;
  channels: readonly string[];
}

// ── Estate ────────────────────────────────────────────────────────────────────

/**
 * An illustrative estate, declared so promotion targeting has something to divide by.
 * The journey speaks in SCOPES — national, region, store cluster — and publishes counts
 * only where a count is what the reader actually needs. Asserting a precise estate size
 * as a headline would claim knowledge of a real retailer's operation that this record
 * does not have.
 */
export interface CanonicalEstate {
  national_store_count: number;
  region_store_counts: Readonly<Record<string, number>>;
  /** Share of demand transacted online rather than in store, as a percentage. */
  online_demand_share_pct: number;
  /**
   * The store cluster that carries a disproportionate share of a promotion's incremental volume.
   * A scope, not a league table: it is what "targeted" means on the Promotion surface, and it is
   * declared once so a targeted play reaches the same shops wherever it is described.
   */
  high_opportunity_store_count: number;
  /** Share of national incremental volume that cluster delivers. */
  high_opportunity_incremental_share_pct: number;
  /** Large-format stores used for short, low-risk weekend plays. */
  core_superstore_count: number;
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export interface CanonicalCalendar {
  forecast_horizon_days: number;
  /**
   * The scenario clock is anchored to the demand history the journey is reading, never
   * to civil time, so the demonstration never goes stale and never drifts between
   * surfaces. Surfaces resolve it through `deriveScenarioNowIso`.
   */
  scenario_clock_basis: string;
  /** Day of week (0=Sunday) and UTC hour of the contractual supplier order cut-off. */
  supplier_cut_off_weekday: number;
  supplier_cut_off_hour_utc: number;
  /** Days between serving a flex notice and volume landing in the network. */
  supplier_lead_time_days: number;
  /** Days the committed promotion runs inside the horizon. */
  promotion_duration_days: number;
  /**
   * The last day the demonstration holds observed demand for. The scenario clock is midnight UTC
   * on this date, and every window on the journey — forecast horizon, promotion window, supplier
   * cut-off, campaign timing — is measured from it. Declared here so the surfaces stop each
   * deriving their own "today"; asserted against the demand history so it cannot drift silently.
   */
  observed_history_end_date: string;
}

// ── Demand ────────────────────────────────────────────────────────────────────

export interface CanonicalDemand {
  /**
   * Un-promoted weekly demand for the scenario SKU across the national estate. THE
   * single scale anchor: every unit quantity in the connected journey is this number,
   * a horizon multiple of it, or a declared ratio of it.
   */
  base_demand_units_per_week: number;
  /**
   * Total movement of expected demand above the un-promoted base, in percent, and how
   * it decomposes. The parts are the journey's answer to "what changed and why".
   */
  total_demand_movement_pct: number;
  movement_attribution: readonly {
    driver: string;
    /** Percentage points of the total movement attributed to this driver. */
    contribution_pp: number;
    driver_class: 'COMMERCIAL_INTENT' | 'OBSERVED_BEHAVIOUR' | 'UNDERLYING_TREND';
  }[];
}

// ── Supply ────────────────────────────────────────────────────────────────────

export interface CanonicalSupply {
  supplier_id: string;
  supplier_name: string;
  /**
   * Standing weekly allocation as a multiple of un-promoted weekly demand. 1.10 means
   * the supplier is contracted to cover base demand plus 10% headroom.
   */
  supplier_capacity_index: number;
  /**
   * Additional capacity the contractual flex clause releases, as a share of un-promoted
   * weekly demand. Declared as a ratio so it rescales with the scenario.
   */
  supplier_flex_rate_pct: number;
  flex_clause_reference: string;
  /** Premium charged on flexed volume, as a share of unit revenue. */
  flex_premium_rate_pct: number;
}

// ── Inventory ─────────────────────────────────────────────────────────────────

/**
 * ONE inventory position, stated at ONE point in the network at ONE time, because two
 * inventory stories about the same SKU is how a demonstration loses a retail audience.
 * Where a surface needs a different location or time point it must say which, in these
 * terms, rather than publishing a second unqualified figure.
 */
export interface CanonicalInventory {
  /** Saleable units in store at the scenario clock, national. */
  store_units: number;
  /** Saleable units held in regional distribution centres at the scenario clock. */
  distribution_centre_units: number;
  /** Units already on order and inside the lead time. */
  on_order_units: number;
  /** Days of cover at the un-promoted run rate, derived — never declared twice. */
  cover_basis: 'DERIVED_FROM_BASE_RUN_RATE';
}

// ── Economics ─────────────────────────────────────────────────────────────────

export interface CanonicalEconomics {
  base_currency: 'GBP';
  /** Shelf price before promotion. Matches the scenario SKU in the product master. */
  list_price_gbp: number;
  /** Depth of the committed promotion, in percent off list. */
  promotion_depth_pct: number;
  /**
   * Share of horizon volume transacting at the promoted price. The remainder sells at
   * list, which is why realised revenue per unit sits between the two.
   */
  promotion_participation_pct: number;
  /**
   * Gross margin rate earned on realised revenue. A declared assumption: the
   * demonstration estate holds no verified cost data, so a rate is stated rather than
   * a cost being invented and presented as observed.
   */
  gross_margin_rate_pct: number;
  /**
   * Share of the price investment the supplier funds under the promotional agreement.
   *
   * Without this the promotion arithmetic has no answer: a 20% cut on a line earning about 42%
   * at list hands back more margin than an elasticity of 2.4 can return, so EVERY depth is
   * value-destroying and there is nothing for CogniX to recommend. That is not a modelling
   * artefact — it is how grocery promotions actually work. Price investment on a staple is
   * part-funded by the supplier, and the funded share is the single biggest determinant of
   * whether a promotion is worth running. It belongs in the economics, not outside them.
   */
  supplier_promotional_funding_pct: number;
  /**
   * Demand response to price: percentage points of demand bought by one point of discount depth.
   *
   * This exists because the platform held TWO incompatible readings of the same elasticity. The
   * Promotion surface read "epsilon 2.4" as 2.4pp of demand per point of depth — 48% at a 20% cut.
   * The campaign causal engine read the same 2.4 as 0.55pp per point — 14pp at the same cut. Both
   * cited the same category and the same SKU, and a reader comparing the two screens was looking
   * at a threefold disagreement about what a discount does. One rate, declared once, resolves it.
   */
  promotional_response_pp_per_depth_point: number;
  /** Units of the scenario SKU lost to waste per week at the un-promoted run rate. */
  waste_units_per_week: number;
  /**
   * Share of promotion-created volume taken from neighbouring lines rather than added to the
   * category. Charged against INCREMENTAL volume only: volume that was always going to sell
   * cannot have been taken from anywhere.
   */
  cannibalisation_rate_pct: number;
  /** Share of unserved demand that is recovered by a substitute product. */
  substitution_recovery_pct: number;
}

// ── Taxonomy ──────────────────────────────────────────────────────────────────

/**
 * What KIND of decision situation this scenario is, and which commercial projection
 * presents it (ADR-077 part 2).
 *
 * Both dimensions used to be parallel universes. `ENTERPRISE_WORLD_SCENARIOS` carried six
 * `ScenarioFamilyId` families with their own economics — a 55,000-unit week and a £142,000
 * exposure against a supplier the connected journey had retired. `CampaignArchetype`
 * carried seven priced situations. Three internally consistent scenario models is the same
 * failure ADR-073 closed for economics, one level up.
 *
 * They are now PROJECTIONS OF this record, never sources beside it:
 *
 *   `family_id`    classifies the situation. It carries no economics and no estate.
 *   `archetype_id` supplies elasticity, cannibalisation, plays and narrative. It supplies
 *                  no second population, no second price basis and no second estate.
 */
export interface CanonicalScenarioTaxonomy {
  /** The enterprise world family this situation belongs to. Taxonomy only. */
  family_id: ScenarioFamilyId;
  /** The `ARCH-*` commercial projection that presents this scenario. */
  archetype_id: string;
  /**
   * Why this scenario sits in this family, so the classification can be read rather than
   * inferred from the family's name.
   */
  family_rationale: string;
}

// ── Declared differentiation ──────────────────────────────────────────────────

/**
 * A declared non-linearity on the depth-response curve.
 *
 * ADR-073 rule 4 — behaviour may be seeded, economics must be derived — is what admits
 * this: how demand responds to a price cut is a property of the category, and a threshold
 * price point genuinely does buy display that a cut one point shallower does not. What is
 * NOT admissible is an unexplained modifier, which is the distinction ADR-079 draws.
 */
export interface ScenarioDepthResponseAnomaly {
  depth_pct: number;
  /** Percentage points ABOVE the linear depth response at this depth. */
  uplift_bonus_pp: number;
  reason: string;
}

/**
 * How a scenario differs from the linear response its declared economics imply (ADR-079).
 *
 * What this replaces. `lib/campaign-causal-engine.ts` applied `skuContextFactor`: a ±6%
 * band derived from `hashSeed(sku_scope.join('|') + '::' + region)`. It was deterministic
 * and it was not explainable — "because the hash of your region name was 1.03" is not an
 * answer a Decision Trace can give. Its own comment already recorded the argument against
 * it, because category had been removed from the same seed once renaming a category moved
 * every downstream number by up to 6% for no modelled reason. That argument applied
 * unchanged to the two dimensions still in the seed.
 *
 * It was also a hard blocker for authored scenarios, whose SKU and region names are
 * arbitrary strings: a scenario named "North West" and one named "Northwest" would have
 * returned economics differing by up to six per cent.
 *
 * The replacement is not a parameterised hash — keeping it behind a flag preserves the
 * defect for whoever turns the flag on. Differentiation is DECLARED, per scope, with a
 * stated reason, exactly as elasticity already is. Where a scenario does not genuinely
 * differ, there is no modifier and the multiplier is 1.
 */
export interface ScenarioDeclaredDifferentiation {
  /**
   * Multiplier applied to the demand response at a named scope. A scope absent from this
   * record carries no modifier. Every entry MUST have a matching reason.
   */
  scope_response_multipliers: Readonly<Record<string, number>>;
  /** Why each declared multiplier exists. A multiplier without a reason is not admissible. */
  scope_response_reasons: Readonly<Record<string, string>>;
  /** Declared threshold effects on the depth-response curve. */
  depth_response_anomalies: readonly ScenarioDepthResponseAnomaly[];
  /** What a reader should understand about this scenario's differentiation, in one line. */
  statement: string;
}

// ── The record ────────────────────────────────────────────────────────────────

export interface CanonicalScenario {
  identity: CanonicalScenarioIdentity;
  taxonomy: CanonicalScenarioTaxonomy;
  estate: CanonicalEstate;
  calendar: CanonicalCalendar;
  demand: CanonicalDemand;
  supply: CanonicalSupply;
  inventory: CanonicalInventory;
  economics: CanonicalEconomics;
  differentiation: ScenarioDeclaredDifferentiation;
  provenance: {
    basis: 'MODELLED_DEMONSTRATION_ASSUMPTION';
    synthetic_demo: true;
    statement: string;
    /** The ADR-082 vocabulary, declared on the record every derived quantity resolves from. */
    descriptor: ProvenanceDescriptor;
  };
}

export const CANONICAL_SCENARIO: CanonicalScenario = {
  identity: {
    scenario_id: CANONICAL_SCENARIO_ID,
    scenario_name: 'Fresh Dairy — committed national promotion under a supply ceiling',
    decision_question:
      'Demand has moved above the plan the committed promotion was built on. Is 20% off nationally still the right intervention, and can we serve what it creates?',
    category: 'Fresh Dairy',
    subcategory: 'Cheese',
    sku_id: 'P004',
    sku_name: 'Cheddar Mature 400g',
    market_scope: 'NATIONAL',
    market_scope_label: 'National',
    focus_region: 'North West',
    channels: ['In store', 'Online']
  },

  taxonomy: {
    family_id: 'promotion_surge',
    archetype_id: 'ARCH-CHILLED-ELASTIC',
    family_rationale:
      'A committed promotion drives demand above the allocation the plan was built on. The binding '
      + 'constraint is supply headroom rather than margin, which is what the promotion_surge family '
      + 'classifies. The family supplies the classification only — the economics are this record\'s.'
  },

  estate: {
    // Illustrative. Published as scope wherever a scope will do; a count only where the
    // reader needs one (per-store rate, targeted alternatives).
    national_store_count: 1450,
    region_store_counts: {
      National: 1450,
      'North West': 195,
      London: 210,
      Midlands: 240,
      Yorkshire: 150,
      'South East': 205
    },
    online_demand_share_pct: 14,
    high_opportunity_store_count: 365,
    high_opportunity_incremental_share_pct: 71,
    core_superstore_count: 175
  },

  calendar: {
    forecast_horizon_days: 14,
    scenario_clock_basis:
      'Midnight UTC on the day before the first projected day of the demand history in view.',
    supplier_cut_off_weekday: 5, // Friday
    supplier_cut_off_hour_utc: 14,
    supplier_lead_time_days: 3,
    promotion_duration_days: 14,
    observed_history_end_date: '2026-06-03'
  },

  demand: {
    /*
     * 350,000/week — 700,000 units of un-promoted base across the 14-day horizon, or about 34
     * units a store a day across the declared estate, which is where a leading own-label cheddar
     * sits. Chosen to divide exactly by the promotion and allocation factors so the capacity index
     * resolves to a clean 1.10 rather than to 1.0999 through two roundings.
     *
     * This is the DECLARED plan scale. The Demand surface separately MEASURES a run rate from the
     * observed history and lands on 349,998/week. The two are different quantities and are meant
     * to be: that they agree to within 0.001% is the reconciliation, and it is asserted as an
     * invariant rather than arranged by making one of them read the other.
     */
    base_demand_units_per_week: 350_000,
    /*
     * 28.59%, not 28.6%: the surface rounds to one decimal for display, and a declared value
     * that only matches the rounded form would put the reconciliation 70 units out at this
     * scale. The attributed parts below compose multiplicatively, so they read as 28.5pp when
     * added — the difference between the sum and the total is composition, not a missing driver.
     */
    total_demand_movement_pct: 28.59,
    movement_attribution: [
      { driver: 'Committed promotion at 20% depth', contribution_pp: 19.6, driver_class: 'COMMERCIAL_INTENT' },
      { driver: 'Observed customer behaviour', contribution_pp: 10.9, driver_class: 'OBSERVED_BEHAVIOUR' },
      { driver: 'Underlying demand trend', contribution_pp: -2.0, driver_class: 'UNDERLYING_TREND' }
    ]
  },

  supply: {
    // The scenario SKU's supplier in the product master. One party holds the allocation
    // and the flex clause, because a flex notice served on a different supplier than the
    // one who makes the product is not a decision anyone could take.
    supplier_id: 'SUP002',
    supplier_name: 'Cheshire Cheese Co',
    supplier_capacity_index: 1.1,
    supplier_flex_rate_pct: 12,
    flex_clause_reference: 'Volume flex notice (Rule 4)',
    flex_premium_rate_pct: 12
  },

  inventory: {
    // Roughly four days of store cover plus six days held back in the DCs: enough to
    // absorb an ordinary week and not enough to absorb this one.
    store_units: 200_000,
    distribution_centre_units: 300_000,
    on_order_units: 385_000,
    cover_basis: 'DERIVED_FROM_BASE_RUN_RATE'
  },

  economics: {
    base_currency: 'GBP',
    list_price_gbp: 2.49,
    promotion_depth_pct: 20,
    promotion_participation_pct: 85,
    gross_margin_rate_pct: 30,
    supplier_promotional_funding_pct: 35,
    promotional_response_pp_per_depth_point: 2.4,
    waste_units_per_week: 14_700,
    cannibalisation_rate_pct: 8,
    substitution_recovery_pct: 35
  },

  differentiation: {
    /*
     * NONE. This scenario runs one SKU on one estate, and nothing about the North West
     * makes a point of discount depth buy more or less volume there than nationally than
     * the estate's own size already accounts for. Declaring no modifier is the honest
     * answer, and it is why the depth response is now identical at every scope.
     */
    scope_response_multipliers: {},
    scope_response_reasons: {},
    depth_response_anomalies: [
      {
        depth_pct: 14,
        /*
         * The bump the seeded elasticity curve has always carried at this tier, now
         * declared where it can be read instead of being baked into curve literals.
         */
        uplift_bonus_pp: 2.74,
        reason:
          'A threshold price point wins feature space and signage that a 12% cut does not, and the '
          + 'volume follows the display as much as the price. A seeded behavioural property of the '
          + 'category that no price sheet can derive.'
      }
    ],
    statement:
      'This scenario declares no SKU or region differentiation. Its only declared non-linearity is '
      + 'the threshold price point at 14% depth, which is a behavioural property of the category.'
  },

  provenance: {
    basis: 'MODELLED_DEMONSTRATION_ASSUMPTION',
    synthetic_demo: true,
    statement:
      'An illustrative scenario for a major UK omnichannel grocer. Every value is modelled for ' +
      'demonstration. No figure is taken from, or represents, the operating data of any named retailer.',
    descriptor: MODELLED_SCENARIO_PROVENANCE
  }
};

// ── Derivations, layer A: the MODEL ───────────────────────────────────────────
// Nothing below is declared. Every function here is the ONLY way a surface should obtain
// the quantity it returns, and every one of them is a pure function OF A SCENARIO.

const round2 = (v: number) => Number(v.toFixed(2));

/** Horizon days, defaulting to the scenario's own declared horizon. */
function horizonOf(scenario: CanonicalScenario, horizonDays?: number): number {
  return Math.max(1, horizonDays ?? scenario.calendar.forecast_horizon_days);
}

/** Un-promoted demand across the horizon. The denominator for every percentage on the journey. */
export function scenarioBaseDemandUnits(scenario: CanonicalScenario, horizonDays?: number): number {
  return scenario.demand.base_demand_units_per_week * (horizonOf(scenario, horizonDays) / 7);
}

/** Demand now expected across the horizon, base carried by the total attributed movement. */
export function scenarioExpectedDemandUnits(scenario: CanonicalScenario, horizonDays?: number): number {
  return scenarioBaseDemandUnits(scenario, horizonDays) * (1 + scenario.demand.total_demand_movement_pct / 100);
}

/** What the operation can actually serve across the horizon, at the standing allocation. */
export function scenarioServableDemandUnits(scenario: CanonicalScenario, horizonDays?: number): number {
  return scenarioBaseDemandUnits(scenario, horizonDays) * scenario.supply.supplier_capacity_index;
}

/** Expected demand we cannot serve. The Decision Gap, in units. */
export function scenarioExposedDemandUnits(scenario: CanonicalScenario, horizonDays?: number): number {
  return Math.max(
    0,
    scenarioExpectedDemandUnits(scenario, horizonDays) - scenarioServableDemandUnits(scenario, horizonDays)
  );
}

/** Capacity the contractual flex clause releases across the horizon. */
export function scenarioFlexCapacityUnits(scenario: CanonicalScenario, horizonDays?: number): number {
  return scenarioBaseDemandUnits(scenario, horizonDays) * (scenario.supply.supplier_flex_rate_pct / 100);
}

/**
 * Revenue realised per unit across the horizon: list, less the committed promotion on the
 * share of volume that transacts on it. THE revenue basis for a scenario's journey — no
 * surface derives its own.
 */
export function scenarioRealisedRevenuePerUnitGbp(scenario: CanonicalScenario): number {
  const { list_price_gbp, promotion_depth_pct, promotion_participation_pct } = scenario.economics;
  return round2(list_price_gbp * (1 - (promotion_depth_pct / 100) * (promotion_participation_pct / 100)));
}

/** Gross margin realised per unit, at the declared rate on realised revenue. */
export function scenarioGrossMarginPerUnitGbp(scenario: CanonicalScenario): number {
  return round2(scenarioRealisedRevenuePerUnitGbp(scenario) * (scenario.economics.gross_margin_rate_pct / 100));
}

/**
 * Unit cost implied by the realised price and the declared margin rate. Published so the
 * margin assumption can be checked against the shelf price rather than taken on trust.
 */
export function scenarioImpliedUnitCostGbp(scenario: CanonicalScenario): number {
  return round2(scenarioRealisedRevenuePerUnitGbp(scenario) - scenarioGrossMarginPerUnitGbp(scenario));
}

/** Price the customer pays while the committed promotion is running. */
export function scenarioPromotedPriceGbp(scenario: CanonicalScenario): number {
  const { list_price_gbp, promotion_depth_pct } = scenario.economics;
  return round2(list_price_gbp * (1 - promotion_depth_pct / 100));
}

/** Gross margin earned per unit at list, before any promotion. */
export function scenarioContributionPerUnitAtListGbp(scenario: CanonicalScenario): number {
  return round2(scenario.economics.list_price_gbp - scenarioImpliedUnitCostGbp(scenario));
}

/** Share of each point of price investment the retailer carries after supplier funding. */
export function scenarioRetailerFundedShare(scenario: CanonicalScenario): number {
  return 1 - scenario.economics.supplier_promotional_funding_pct / 100;
}

/**
 * Share of unit contribution given up per point of discount depth, derived from the price, the
 * cost and the funding agreement rather than assumed.
 */
export function scenarioContributionErosionPerDepthPoint(scenario: CanonicalScenario): number {
  const contribution = scenarioContributionPerUnitAtListGbp(scenario);
  if (contribution <= 0) return 0;
  return (scenario.economics.list_price_gbp * 0.01 * scenarioRetailerFundedShare(scenario)) / contribution;
}

/**
 * Contribution earned per unit at a given promotional depth, after supplier funding. THE
 * promotion economics primitive.
 */
export function scenarioContributionAtDepthGbp(
  scenario: CanonicalScenario,
  depthPct: number,
  listPriceGbp?: number,
  unitCostGbp?: number
): number {
  const list = listPriceGbp ?? scenario.economics.list_price_gbp;
  const cost = unitCostGbp ?? scenarioImpliedUnitCostGbp(scenario);
  const retailerInvestment = list * (depthPct / 100) * scenarioRetailerFundedShare(scenario);
  return Number((list - retailerInvestment - cost).toFixed(4));
}

/** Revenue exposed by demand we cannot serve. */
export function scenarioRevenueExposureGbp(scenario: CanonicalScenario, horizonDays?: number): number {
  return scenarioExposedDemandUnits(scenario, horizonDays) * scenarioRealisedRevenuePerUnitGbp(scenario);
}

/** Gross margin exposed by demand we cannot serve. */
export function scenarioMarginExposureGbp(scenario: CanonicalScenario, horizonDays?: number): number {
  return scenarioExposedDemandUnits(scenario, horizonDays) * scenarioGrossMarginPerUnitGbp(scenario);
}

/** Un-promoted demand per day — the run rate days of cover are measured against. */
export function scenarioBaseRunRatePerDay(scenario: CanonicalScenario): number {
  return scenario.demand.base_demand_units_per_week / 7;
}

/** Days of cover held in store at the un-promoted run rate. */
export function scenarioStoreCoverDays(scenario: CanonicalScenario): number {
  return scenario.inventory.store_units / scenarioBaseRunRatePerDay(scenario);
}

/** Days of cover held across store and distribution centres at the un-promoted run rate. */
export function scenarioNetworkCoverDays(scenario: CanonicalScenario): number {
  const { store_units, distribution_centre_units } = scenario.inventory;
  return (store_units + distribution_centre_units) / scenarioBaseRunRatePerDay(scenario);
}

/** Stores in a named scope. Falls back to the national estate for an unknown scope. */
export function scenarioStoreCount(scenario: CanonicalScenario, scope: string): number {
  return scenario.estate.region_store_counts[scope] ?? scenario.estate.national_store_count;
}

/**
 * The scenario's own label for a scope. Surfaces publish this rather than a bare store
 * count, so "National" and "North West" mean the same thing on every screen.
 */
export function scenarioScopeLabel(scenario: CanonicalScenario, scope: string): string {
  return scope === 'National' || scope === 'national'
    ? scenario.identity.market_scope_label
    : scope;
}

/** The abstract weekly population a derived-impact engine works on. It IS the scenario's own. */
export function scenarioWeeklyPopulationUnits(scenario: CanonicalScenario): number {
  return scenario.demand.base_demand_units_per_week;
}

// ── Declared differentiation (ADR-079) ────────────────────────────────────────

/**
 * The declared multiplier for a named scope. 1 where the scenario declares nothing, which
 * is the answer for every scope of the canonical scenario.
 *
 * A multiplier is only honoured when the scenario also declares WHY it exists. An
 * undeclared reason is a modelling error, not a silent 1.03.
 */
export function scenarioScopeResponseMultiplier(scenario: CanonicalScenario, scope: string): number {
  const declared = scenario.differentiation.scope_response_multipliers[scope];
  if (typeof declared !== 'number') return 1;
  const reason = scenario.differentiation.scope_response_reasons[scope];
  if (!reason || !reason.trim()) {
    throw new Error(
      `Scenario ${scenario.identity.scenario_id} declares a response multiplier for scope "${scope}" `
      + 'with no stated reason. ADR-079: differentiation is declared, never asserted.'
    );
  }
  return declared;
}

/** The declared threshold bonus at a depth, in percentage points. Zero where none is declared. */
export function scenarioDepthResponseAnomalyPp(scenario: CanonicalScenario, depthPct: number): number {
  return scenario.differentiation.depth_response_anomalies
    .find(a => a.depth_pct === depthPct)?.uplift_bonus_pp ?? 0;
}

/**
 * THE demand response to promotional depth, net of the cannibalisation it causes.
 *
 * This is the single basis the elasticity curve plots and the causal engine attributes.
 * Before ADR-079 the curve carried seeded literals calibrated against the causal engine
 * WITH its hash band applied, so the two agreed at the one scope whose name happened to
 * hash to 1.06 and diverged by up to six per cent everywhere else. Deriving both from
 * this function is what makes the agreement structural instead of coincidental.
 */
export function scenarioDepthResponsePp(
  scenario: CanonicalScenario,
  depthPct: number,
  scope?: string
): number {
  const multiplier = scope ? scenarioScopeResponseMultiplier(scenario, scope) : 1;
  const gross = depthPct * scenario.economics.promotional_response_pp_per_depth_point;
  const net = gross * (1 - scenario.economics.cannibalisation_rate_pct / 100);
  const anomaly = scenarioDepthResponseAnomalyPp(scenario, depthPct);
  return round2((net + anomaly) * multiplier);
}

// ── Scenario clock (ADR-078) ──────────────────────────────────────────────────
// The clock itself lives in `scenario-clock.ts`. These are the scenario-bound readings.

/** Midnight UTC on the scenario's last observed day — the instant every window is measured from. */
export function scenarioClockNowIso(scenario: CanonicalScenario): string {
  return clockNowIso(scenario);
}

/** A date `days` after the scenario clock, as an ISO instant. */
export function scenarioClockDateIso(scenario: CanonicalScenario, daysAfterNow: number): string {
  return clockDateIso(scenario, daysAfterNow);
}

/** How old an observation is, in scenario days, at this scenario's own Today. */
export function scenarioObservationAgeDays(scenario: CanonicalScenario, observedAtIso: string): number {
  return clockFreshnessDays(scenario, observedAtIso);
}

/** The window the committed promotion runs in: the first projected day, for its declared length. */
export function scenarioPromotionWindow(scenario: CanonicalScenario): { start_iso: string; end_iso: string } {
  return {
    start_iso: scenarioClockDateIso(scenario, 1),
    end_iso: scenarioClockDateIso(scenario, scenario.calendar.promotion_duration_days)
  };
}

// ── Derivations, layer B: the PROTECTED REFERENCE ─────────────────────────────
// Each accessor below binds layer A to `CANONICAL_SCENARIO` by name, at exactly one
// place per quantity. This is the only file that names the reference scenario for a
// derivation; every surface reads through these, and the certification harness reads
// layer A directly with whatever scenario it is certifying.

export function canonicalBaseDemandUnits(horizonDays?: number): number {
  return scenarioBaseDemandUnits(CANONICAL_SCENARIO, horizonDays);
}

export function canonicalExpectedDemandUnits(horizonDays?: number): number {
  return scenarioExpectedDemandUnits(CANONICAL_SCENARIO, horizonDays);
}

export function canonicalServableDemandUnits(horizonDays?: number): number {
  return scenarioServableDemandUnits(CANONICAL_SCENARIO, horizonDays);
}

export function canonicalExposedDemandUnits(horizonDays?: number): number {
  return scenarioExposedDemandUnits(CANONICAL_SCENARIO, horizonDays);
}

export function canonicalFlexCapacityUnits(horizonDays?: number): number {
  return scenarioFlexCapacityUnits(CANONICAL_SCENARIO, horizonDays);
}

export function canonicalRealisedRevenuePerUnitGbp(): number {
  return scenarioRealisedRevenuePerUnitGbp(CANONICAL_SCENARIO);
}

export function canonicalGrossMarginPerUnitGbp(): number {
  return scenarioGrossMarginPerUnitGbp(CANONICAL_SCENARIO);
}

export function canonicalImpliedUnitCostGbp(): number {
  return scenarioImpliedUnitCostGbp(CANONICAL_SCENARIO);
}

export function canonicalPromotedPriceGbp(): number {
  return scenarioPromotedPriceGbp(CANONICAL_SCENARIO);
}

export function canonicalContributionPerUnitAtListGbp(): number {
  return scenarioContributionPerUnitAtListGbp(CANONICAL_SCENARIO);
}

export function canonicalRetailerFundedShare(): number {
  return scenarioRetailerFundedShare(CANONICAL_SCENARIO);
}

export function canonicalContributionErosionPerDepthPoint(): number {
  return scenarioContributionErosionPerDepthPoint(CANONICAL_SCENARIO);
}

export function canonicalContributionAtDepthGbp(
  depthPct: number,
  listPriceGbp?: number,
  unitCostGbp?: number
): number {
  return scenarioContributionAtDepthGbp(CANONICAL_SCENARIO, depthPct, listPriceGbp, unitCostGbp);
}

export function canonicalRevenueExposureGbp(horizonDays?: number): number {
  return scenarioRevenueExposureGbp(CANONICAL_SCENARIO, horizonDays);
}

export function canonicalMarginExposureGbp(horizonDays?: number): number {
  return scenarioMarginExposureGbp(CANONICAL_SCENARIO, horizonDays);
}

export function canonicalBaseRunRatePerDay(): number {
  return scenarioBaseRunRatePerDay(CANONICAL_SCENARIO);
}

export function canonicalStoreCoverDays(): number {
  return scenarioStoreCoverDays(CANONICAL_SCENARIO);
}

export function canonicalNetworkCoverDays(): number {
  return scenarioNetworkCoverDays(CANONICAL_SCENARIO);
}

export function canonicalScenarioNowIso(): string {
  return scenarioClockNowIso(CANONICAL_SCENARIO);
}

export function canonicalScenarioDateIso(daysAfterNow: number): string {
  return scenarioClockDateIso(CANONICAL_SCENARIO, daysAfterNow);
}

export function canonicalPromotionWindow(): { start_iso: string; end_iso: string } {
  return scenarioPromotionWindow(CANONICAL_SCENARIO);
}

export function canonicalStoreCount(scope: string): number {
  return scenarioStoreCount(CANONICAL_SCENARIO, scope);
}

export function canonicalScopeLabel(scope: string): string {
  return scenarioScopeLabel(CANONICAL_SCENARIO, scope);
}

export function canonicalWeeklyPopulationUnits(): number {
  return scenarioWeeklyPopulationUnits(CANONICAL_SCENARIO);
}

export function canonicalDepthResponsePp(depthPct: number, scope?: string): number {
  return scenarioDepthResponsePp(CANONICAL_SCENARIO, depthPct, scope);
}

export function canonicalScopeResponseMultiplier(scope: string): number {
  return scenarioScopeResponseMultiplier(CANONICAL_SCENARIO, scope);
}

export function canonicalDepthResponseAnomalyPp(depthPct: number): number {
  return scenarioDepthResponseAnomalyPp(CANONICAL_SCENARIO, depthPct);
}
