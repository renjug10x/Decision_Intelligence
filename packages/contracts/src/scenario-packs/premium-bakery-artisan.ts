/**
 * CogniX Curated Scenario Pack — Premium Bakery under promotional pressure (`SCI-03`)
 * ───────────────────────────────────────────────────────────────────────────────
 * The scenario whose answer is *don't*.
 *
 * Why this pack exists
 * --------------------
 * A decision platform that only ever says "promote differently" is a promotion planner. The
 * commercially valuable answer — the one a category director cannot get from a spreadsheet
 * without arguing for it — is that an intervention should not happen at all. This scenario
 * produces that answer, and it produces it the only way it is worth anything: **from declared
 * inputs and real arithmetic, never from a label applied afterwards.**
 *
 * The arithmetic, stated so it can be checked
 * -------------------------------------------
 * Bakery is inelastic: the taxonomy declares a promotional elasticity of 0.8 against Dairy's
 * 2.4, and this record declares the same 0.8 for its own line. Allied Bakeries is a strong
 * branded supplier with no reason to fund a retailer's premium own-label sourdough, so it
 * funds 10% of the price investment against the reference scenario's 35% and the salmon
 * pack's 60%. Put those two together on a £1.39 line:
 *
 *   a point of depth BUYS  0.8 × (1 − 4% cannibalisation) = 0.768% of volume,
 *                          worth 0.768% × £0.55 contribution ≈ £0.0042 a unit
 *   a point of depth COSTS £1.39 × 1% × 90% retailer-funded  = £0.0125 a unit
 *
 * Every point of depth costs three times what it buys, so `scenarioElasticityCurve` returns
 * its best contribution at 0% and the recommendation IS "do not promote". Nothing on this
 * record marks a tier as recommended and no caption is applied to the result — change the
 * funding percentage and the recommendation moves on its own, which is the property
 * `assertRecommendationIsDerived` exists to hold.
 *
 * The constraint is waste, not allocation
 * ---------------------------------------
 * Same-day bake means capacity is a daily decision rather than a seasonal one, so the
 * allocation index is 1.06 — real headroom, but only just enough. The exposure this scenario
 * publishes is small and the recovery is high (60%: a shopper who cannot buy sourdough buys
 * bread). What it wastes is the point. `fresh_perishable_waste` is the family, and it is what
 * the signal timeline opens on.
 */

import { CanonicalScenario } from '../canonical-scenario-model';
import { MODELLED_SCENARIO_PROVENANCE } from '../provenance-vocabulary';

export const PREMIUM_BAKERY_SCENARIO_ID = 'SCN-BAKERY-SOURDOUGH-003';

export const PREMIUM_BAKERY_SCENARIO: CanonicalScenario = {
  identity: {
    scenario_id: PREMIUM_BAKERY_SCENARIO_ID,
    scenario_name: 'Premium Bakery — an inelastic artisan line under promotional pressure',
    decision_question:
      'Trade has asked for a 10% cut on the premium sourdough to defend share against the branded '
      + 'bakers. The line is inelastic, the baker funds almost none of the price investment and it '
      + 'is baked to order every morning. Is promoting this line a decision worth taking at all?',
    category: 'Bakery',
    subcategory: 'Bread',
    sku_id: 'P023',
    sku_name: 'White Sourdough 800g',
    /*
     * REGION, not NATIONAL. The cut being asked for is a London-and-South-East defence against
     * a competitor's in-store bakery, so the committed intervention's scope is regional and the
     * journey's question is scoped with it.
     */
    market_scope: 'REGION',
    market_scope_label: 'London',
    focus_region: 'London',
    channels: ['In store']
  },

  taxonomy: {
    family_id: 'fresh_perishable_waste',
    archetype_id: 'ARCH-PREMIUM-ARTISAN',
    family_rationale:
      'The line is baked to order each morning and has no second day. Volume the promotion creates '
      + 'and cannot sell is waste on the same evening, not stock carried forward, which is what '
      + 'fresh_perishable_waste classifies. The family supplies the classification only — the '
      + 'economics are this record\'s.'
  },

  estate: {
    /*
     * 620 stores. An in-store bakery premium line is ranged where there is a bake-off oven and a
     * basket that carries it, which is a little over a third of the reference scenario's estate.
     */
    national_store_count: 620,
    region_store_counts: {
      National: 620,
      London: 165,
      'South East': 118,
      Midlands: 92,
      'North West': 74,
      Yorkshire: 58
    },
    // Low. Fresh bread is an in-store, same-day purchase; it travels badly in an online slot.
    online_demand_share_pct: 6,
    high_opportunity_store_count: 148,
    high_opportunity_incremental_share_pct: 64,
    core_superstore_count: 96
  },

  calendar: {
    /*
     * SEVEN days, not fourteen. A same-day bake plans on a week; a fourteen-day outlook on this
     * line would be forecasting a bake that has not been scheduled. The horizon is a property of
     * the scenario, which is why it is declared here rather than assumed by a surface.
     */
    forecast_horizon_days: 7,
    scenario_clock_basis:
      'Midnight UTC on the day before the first projected day of the demand history in view.',
    // Thursday 16:00 UTC — the weekly bake plan is locked for the following trading week.
    supplier_cut_off_weekday: 4,
    supplier_cut_off_hour_utc: 16,
    // One day. The constraint here is never the lead time.
    supplier_lead_time_days: 1,
    promotion_duration_days: 7,
    observed_history_end_date: '2026-09-09'
  },

  demand: {
    /*
     * 26,040 a week — 42 units a store across the 620-store estate, the rate the
     * ARCH-PREMIUM-ARTISAN projection declares. A thirteenth of the reference scenario's scale.
     */
    base_demand_units_per_week: 26_040,
    /*
     * 11.2%, against the reference scenario's 28.59%. An inelastic line does not surge: the
     * promotion itself only buys 7.7 of these points, and that is the whole commercial problem.
     */
    total_demand_movement_pct: 11.2,
    movement_attribution: [
      { driver: 'Committed promotion at 10% depth', contribution_pp: 7.7, driver_class: 'COMMERCIAL_INTENT' },
      { driver: 'Observed customer behaviour', contribution_pp: 5.1, driver_class: 'OBSERVED_BEHAVIOUR' },
      { driver: 'Underlying demand trend', contribution_pp: -1.6, driver_class: 'UNDERLYING_TREND' }
    ]
  },

  supply: {
    // The SKU's own supplier in the product master. UK, 94% on time, 0.9 days average delay.
    supplier_id: 'SUP011',
    supplier_name: 'Allied Bakeries',
    /*
     * 1.06. A reliable baker with real but limited daily headroom — the ovens are sized for the
     * plan, and a promotion that outruns them cannot be met by ordering earlier.
     */
    supplier_capacity_index: 1.06,
    // 3%: an overnight bake extension is a shift, not a second line.
    supplier_flex_rate_pct: 3,
    flex_clause_reference: 'Overnight bake extension (Appendix C)',
    flex_premium_rate_pct: 18
  },

  inventory: {
    // Under a day in store and a day and a half across the network. Bread holds no cover at all.
    store_units: 3_348,
    distribution_centre_units: 2_604,
    on_order_units: 27_000,
    cover_basis: 'DERIVED_FROM_BASE_RUN_RATE'
  },

  economics: {
    base_currency: 'GBP',
    // The product master's own price for P023.
    list_price_gbp: 1.39,
    promotion_depth_pct: 10,
    // High: a premium bakery cut is a shelf-edge feature and most of the volume transacts on it.
    promotion_participation_pct: 88,
    // Implies a unit cost of £0.84 against a master cost of £0.89.
    gross_margin_rate_pct: 34,
    /*
     * 10%. THE number this scenario's answer turns on. A branded baker has no commercial reason
     * to fund a retailer's competing own-label premium line, so the retailer carries 90p of every
     * pound it invests in price — and at an elasticity of 0.8 that pound never comes back.
     */
    supplier_promotional_funding_pct: 10,
    // 0.8, the taxonomy's declared Bakery elasticity and the archetype's. Dairy's is 2.4.
    promotional_response_pp_per_depth_point: 0.8,
    // 8% of the week. Same-day bake: what is not sold today is not sold.
    waste_units_per_week: 2_080,
    cannibalisation_rate_pct: 4,
    /*
     * 60%, the highest of the three packs. A shopper who cannot buy the sourdough buys a
     * different loaf — the trade is recovered on a neighbouring line far more often than it is
     * lost, which is the other half of why promoting this line is hard to justify.
     */
    substitution_recovery_pct: 60
  },

  differentiation: {
    scope_response_multipliers: {},
    scope_response_reasons: {},
    /*
     * TWO, and both NEGATIVE — the first declared anomalies in the catalogue that REDUCE the
     * response rather than raising it.
     *
     * A premium artisan line carries a quality signal in its price. A shallow feature reads as a
     * promotion; a quarter off reads as a markdown, and the shoppers who buy the line for what it
     * says about the basket stop buying it. The response does not merely stop rising past that
     * point, it gives volume back.
     *
     * The damage is declared at BOTH tiers past the threshold, and grows. A single anomaly at 25%
     * would model the quality signal as recovering at 30%, which nothing about a price position
     * supports and which would leave the curve dipping and then jumping — a shape a reader would
     * rightly distrust. Declared here with their reasons (ADR-079) rather than folded into curve
     * literals where no Decision Trace could reach them.
     */
    depth_response_anomalies: [
      {
        depth_pct: 25,
        uplift_bonus_pp: -4.5,
        reason:
          'Past a quarter off, a premium artisan line reads as a markdown rather than a feature and '
          + 'the shoppers who buy it for its quality signal stop buying it. A seeded behavioural '
          + 'property of the price position that no price sheet can derive.'
      },
      {
        depth_pct: 30,
        uplift_bonus_pp: -9.6,
        reason:
          'At a third off the price position is no longer defensible and the line trades as a '
          + 'standard loaf. The quality-signal loss compounds rather than recovering, so the '
          + 'declared damage at this tier is larger than at 25%.'
      }
    ],
    statement:
      'This scenario declares no scope differentiation. Its declared non-linearity is a pair of '
      + 'NEGATIVE depth-response anomalies at 25% and 30%, where the price position itself is '
      + 'damaged and the damage compounds. Its economics are otherwise linear in depth at a '
      + 'declared elasticity of 0.8 — low enough that every plotted depth destroys contribution, '
      + 'which is a derived result rather than a stance.'
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
