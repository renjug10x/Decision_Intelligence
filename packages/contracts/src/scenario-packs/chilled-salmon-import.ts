/**
 * CogniX Curated Scenario Pack — Chilled Fish under an import lead time (`SCI-03`)
 * ───────────────────────────────────────────────────────────────────────────────
 * A full `CanonicalScenario` instance, not a variation on the reference one.
 *
 * What makes this a DIFFERENT DECISION, and why that is arithmetic rather than labelling
 * -------------------------------------------------------------------------------------
 * The reference scenario asks *"is 20% off nationally still right?"* and the answer turns on
 * MARGIN: its supplier funds 35% of the price investment, so every point of depth destroys
 * contribution and the committed plan loses money.
 *
 * This scenario asks a question that cannot be answered by moving the depth at all. Foodvest
 * Fish holds committed Norwegian harvest volume and wants UK throughput, so it funds 60% of
 * the price investment. At that funding the declared 10% cut is not merely affordable — it is
 * the BEST tier on this scenario's own curve, and the curve derives that rather than being
 * told it. What the money cannot fix is a six-day chilled import lead on a supplier landing
 * 79% of its orders on time, against an allocation index of 1.02 that leaves almost no
 * headroom. Demand has moved 26.4% above the un-promoted base; supply can serve 2%.
 *
 * So the decision is: **hold, pull early, or pay the air-freight premium.** Depth is not one
 * of the options, and nothing here has to say so — the arithmetic already does.
 *
 * Every value below is DECLARED on this record and every quantity a surface publishes is
 * derived from it by `scenario*(…)`. There is no second economics and no branch anywhere in
 * the estate that knows this scenario exists (R-27).
 *
 * Reconciliation with the enterprise masters
 * ------------------------------------------
 * `P048` / `SUP006` and the £4.99 list price are the product and supplier masters' own, so
 * `C-1.6`, `C-1.7`, `C-1.8` and `C-2.10` reconcile against data this record did not author.
 * A flex notice is served on the party that makes the product, which is the whole of R-20.
 */

import { CanonicalScenario } from '../canonical-scenario-model';
import { MODELLED_SCENARIO_PROVENANCE } from '../provenance-vocabulary';

export const CHILLED_SALMON_SCENARIO_ID = 'SCN-CHILLED-SALMON-002';

export const CHILLED_SALMON_SCENARIO: CanonicalScenario = {
  identity: {
    scenario_id: CHILLED_SALMON_SCENARIO_ID,
    scenario_name: 'Chilled Fish — a promoted import against a six-day lead time',
    decision_question:
      'The 10% cut on salmon is paying its way, but the supplier is landing 79% of orders on time '
      + 'from Norway on a six-day lead and the allocation has no headroom left. Do we hold the '
      + 'promotion, pull it early, or pay the air-freight premium to serve what it created?',
    category: 'Chilled',
    subcategory: 'Fish',
    sku_id: 'P048',
    sku_name: 'Atlantic Salmon Fillet 300g',
    market_scope: 'NATIONAL',
    market_scope_label: 'National',
    /*
     * The South East, not the North West. Fresh premium protein concentrates where basket
     * values and online penetration are highest, and the estate below says so in counts.
     */
    focus_region: 'South East',
    channels: ['In store', 'Online']
  },

  taxonomy: {
    family_id: 'supplier_breach',
    archetype_id: 'ARCH-SUPPLY-CONSTRAINED',
    family_rationale:
      'The binding constraint is the supplier meeting its contracted lead time on a chilled import, '
      + 'not the price of the line. That is what supplier_breach classifies, and it is why this '
      + 'scenario\'s signal timeline opens on lead-time drift rather than on search velocity. The '
      + 'family supplies the classification only — the economics are this record\'s.'
  },

  estate: {
    /*
     * 980 stores, not 1,450. Fresh whole-fillet salmon is a counter and large-format line; the
     * smaller convenience estate does not range it. Declaring the estate this line actually
     * trades in is what stops a per-store rate being computed against shops that never sell it.
     */
    national_store_count: 980,
    region_store_counts: {
      National: 980,
      'South East': 162,
      London: 178,
      Midlands: 146,
      'North West': 118,
      Yorkshire: 92
    },
    // Higher than the reference case: fresh premium protein over-indexes on online baskets.
    online_demand_share_pct: 21,
    high_opportunity_store_count: 240,
    high_opportunity_incremental_share_pct: 58,
    core_superstore_count: 140
  },

  calendar: {
    forecast_horizon_days: 14,
    scenario_clock_basis:
      'Midnight UTC on the day before the first projected day of the demand history in view.',
    // Wednesday 09:00 UTC — the landing schedule the Norwegian consignment is booked against.
    supplier_cut_off_weekday: 3,
    supplier_cut_off_hour_utc: 9,
    // Six days, against the reference scenario's three. This is the number the decision is about.
    supplier_lead_time_days: 6,
    promotion_duration_days: 14,
    /*
     * A summer clock, and deliberately not the reference scenario's June date. Each scenario
     * carries its OWN Today (ADR-078); two packs sharing one clock by coincidence would leave
     * that untested until a pack needed a different one.
     */
    observed_history_end_date: '2026-07-15'
  },

  demand: {
    /*
     * 47,040 a week — 48 units a store across the 980-store estate, which is the rate the
     * ARCH-SUPPLY-CONSTRAINED projection has always declared for this line. The scale is a
     * seventh of the reference scenario's, and every quantity in the journey rescales from it.
     */
    base_demand_units_per_week: 47_040,
    total_demand_movement_pct: 26.4,
    movement_attribution: [
      { driver: 'Committed promotion at 10% depth', contribution_pp: 20.9, driver_class: 'COMMERCIAL_INTENT' },
      { driver: 'Observed customer behaviour', contribution_pp: 8.0, driver_class: 'OBSERVED_BEHAVIOUR' },
      { driver: 'Underlying demand trend', contribution_pp: -2.5, driver_class: 'UNDERLYING_TREND' }
    ]
  },

  supply: {
    // The SKU's own supplier in the product master. Norway, 79% on time, 3.4 days average delay.
    supplier_id: 'SUP006',
    supplier_name: 'Foodvest Fish',
    /*
     * 1.02 against the reference scenario's 1.10. Harvest is committed a season ahead and the
     * chilled corridor is booked; there is two per cent of headroom and no more. This single
     * number is why the decision cannot be answered by changing the price.
     */
    supplier_capacity_index: 1.02,
    // Half the reference scenario's flex. An air-freight uplift is small, expensive and slow.
    supplier_flex_rate_pct: 6,
    flex_clause_reference: 'Air-freight uplift notice (Schedule 2)',
    // 28% against the reference scenario's 12%: flying chilled fish is not a road re-plan.
    flex_premium_rate_pct: 28
  },

  inventory: {
    // About a day and a half in store and three days across the network. Chilled fish holds no cover.
    store_units: 10_080,
    distribution_centre_units: 11_424,
    on_order_units: 49_392,
    cover_basis: 'DERIVED_FROM_BASE_RUN_RATE'
  },

  economics: {
    base_currency: 'GBP',
    // The product master's own price for P048. No second price is authored here.
    list_price_gbp: 4.99,
    /*
     * 10%, and it is the depth this scenario's own curve returns the most contribution at. That
     * is derived in `scenarioElasticityCurve`, not asserted here: nothing on this record marks a
     * tier as recommended.
     */
    promotion_depth_pct: 10,
    // Lower than a dairy staple: a promoted fillet still sells substantially at full price.
    promotion_participation_pct: 72,
    // Thin, as fresh protein is. Implies a unit cost of £3.61 against a master cost of £3.45.
    gross_margin_rate_pct: 22,
    /*
     * 60%, against the reference scenario's 35%, and THE reason this scenario's decision is not
     * about depth. A supplier holding committed harvest and chasing UK share funds the feature
     * heavily; the retailer carries only 40p of every pound invested in price.
     */
    supplier_promotional_funding_pct: 60,
    // The ARCH-SUPPLY-CONSTRAINED projection's declared elasticity for this line.
    promotional_response_pp_per_depth_point: 2.2,
    // 4% of the week. Fresh fish wastes hard, and a promotion that outruns supply wastes harder.
    waste_units_per_week: 1_880,
    cannibalisation_rate_pct: 5,
    /*
     * 45%. A shopper who cannot buy salmon buys another fresh protein far more readily than a
     * shopper who cannot buy their usual cheddar, so more of the exposure is recovered on a
     * substitute line and less of it is lost trade.
     */
    substitution_recovery_pct: 45
  },

  differentiation: {
    /*
     * NONE, and declared rather than left blank. Salmon does not respond differently to a point
     * of depth in the South East than nationally; what differs between those scopes is how many
     * stores range it, and the estate above already accounts for that. Declaring a modifier here
     * would be inventing a behaviour to make the pack look richer (ADR-079).
     */
    scope_response_multipliers: {},
    scope_response_reasons: {},
    /*
     * NONE. The reference scenario declares a threshold price point at 14% because its category
     * genuinely has one. Fresh fish is bought on appearance and occasion rather than on shelf
     * price points, and there is no seeded observation of a threshold effect on this line. An
     * empty list is the honest answer; copying the dairy anomaly across would be fabrication.
     */
    depth_response_anomalies: [],
    statement:
      'This scenario declares no scope differentiation and no depth-response anomaly. Its demand '
      + 'response is linear in depth at the declared elasticity, net of cannibalisation, at every '
      + 'scope. What differentiates it from the reference scenario is supplier funding, allocation '
      + 'headroom and lead time — all declared, none inferred.'
  },

  provenance: {
    basis: 'MODELLED_DEMONSTRATION_ASSUMPTION',
    synthetic_demo: true,
    statement:
      'An illustrative scenario for a major UK omnichannel grocer. Every value is modelled for '
      + 'demonstration. No figure is taken from, or represents, the operating data of any named '
      + 'retailer or supplier.',
    descriptor: MODELLED_SCENARIO_PROVENANCE
  }
};
