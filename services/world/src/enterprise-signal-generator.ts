/**
 * CogniX Enterprise World Domain - Synthetic Signal Generator
 *
 * Generates canonical, deterministic synthetic signal snapshots FOR A SCENARIO.
 *
 * Domain Ownership: Enterprise World Domain (services/world)
 *
 * What changed at `SCI-01`, and why it mattered
 * ---------------------------------------------
 * This generator used to take a family string and a scenario id with literal defaults —
 * `promotion_surge` and `SCN-PROMO-01` — and publish `SUPPLIER_CAPACITY_PRESSURE` against
 * entity **FreshDirect UK** at 48,000 units a week. Both belonged to the retired world
 * seed. The connected journey had long since replaced that supplier with Cheshire Cheese
 * Co, because a volume flex notice has to be served on whoever actually makes the product.
 *
 * The migration was HALF done, which is exactly why it survived review: the generator
 * already named Fresh Dairy and P004 Cheddar Mature 400g correctly, so the Observability
 * & Governance surface looked canonical right up until a reader read the supplier.
 *
 * Two rules close it, and both are structural rather than a corrected literal:
 *
 *   ADR-077 — the scenario is RESOLVED, never defaulted, and every value published here is
 *             derived from that scenario's own record. There is no second economics.
 *   ADR-078 — every observation is stamped on the SCENARIO CLOCK. `observed_at` used to be
 *             `new Date()`, which made two consecutive identical reads differ in the one
 *             field that should never move, left freshness permanently zero, and made the
 *             Refresh control look inert because the only thing changing was the clock.
 */

import {
  EnterpriseSignal,
  SimulationPeriod,
  validateEnterpriseSignal
} from '../../../packages/contracts/src/index';
import {
  CanonicalScenario,
  scenarioContributionAtDepthGbp,
  scenarioContributionPerUnitAtListGbp
} from '../../../packages/contracts/src/canonical-scenario-model';
import { scenarioPeriodInstantIso, scenarioNowIso } from '../../../packages/contracts/src/scenario-clock';

const GENERATOR = 'cognix_world_generator';

/** A signal's declared position on the scenario clock: when it was seen, when it bites. */
interface SignalTiming {
  observed_period: SimulationPeriod;
  effective_period: SimulationPeriod;
}

function stamp(scenario: CanonicalScenario, timing: SignalTiming) {
  return {
    observed_at: scenarioPeriodInstantIso(scenario, timing.observed_period),
    effective_at: scenarioPeriodInstantIso(scenario, timing.effective_period)
  };
}

/**
 * Provenance every generated signal carries, in the ADR-082 vocabulary plus the fields a
 * reader needs in order to check the freshness claim rather than take it on trust.
 */
function provenanceFor(
  scenario: CanonicalScenario,
  rule: string,
  timing: SignalTiming
): Record<string, string> {
  return {
    generator: GENERATOR,
    scenario_id: scenario.identity.scenario_id,
    scenario_family: scenario.taxonomy.family_id,
    rule,
    observed_period: timing.observed_period,
    effective_period: timing.effective_period,
    scenario_clock: scenarioNowIso(scenario),
    origin: scenario.provenance.descriptor.origin,
    method: scenario.provenance.descriptor.method,
    authority: scenario.provenance.descriptor.authority
  };
}

const round1 = (v: number) => Number(v.toFixed(1));

/**
 * The scenario's signal snapshot.
 *
 * The signal TYPES are chosen by the scenario's declared family — that is what a family
 * classifies. Every identity and every value comes from the scenario's own record.
 */
export function generateSyntheticSignalSnapshot(
  scenario: CanonicalScenario,
  tenantId: string = 'tenant_uk_retail_01'
): EnterpriseSignal[] {
  const { identity, supply, demand, estate, inventory, calendar } = scenario;

  // The scenario's own arithmetic, at the weekly rate the record declares.
  const baseWeekly = demand.base_demand_units_per_week;
  const servableWeekly = Math.round(baseWeekly * supply.supplier_capacity_index);
  const expectedWeekly = Math.round(baseWeekly * (1 + demand.total_demand_movement_pct / 100));
  const baseRunRatePerDay = baseWeekly / 7;
  const expectedRunRatePerDay = expectedWeekly / 7;
  const baseCoverDays = round1(inventory.store_units / baseRunRatePerDay);
  const pressuredCoverDays = round1(inventory.store_units / expectedRunRatePerDay);

  const common = {
    tenant_id: tenantId,
    domain_id: 'retail_grocery',
    scenario_id: identity.scenario_id,
    source_type: 'SYNTHETIC_WORLD' as const,
    source_system: GENERATOR,
    synthetic_demo: true,
    schema_version: '1.0'
  };

  let signals: EnterpriseSignal[] = [];

  if (scenario.taxonomy.family_id === 'promotion_surge') {
    const searchTiming: SignalTiming = { observed_period: 'T-7', effective_period: 'T+1' };
    const basketTiming: SignalTiming = { observed_period: 'T-3', effective_period: 'T+1' };
    const slotTiming: SignalTiming = { observed_period: 'T-2', effective_period: 'T+3' };
    const supplierTiming: SignalTiming = { observed_period: 'T-1', effective_period: 'T+3' };
    const coverTiming: SignalTiming = { observed_period: 'Today', effective_period: 'T+7' };

    signals = [
      {
        ...common,
        signal_id: 'sig_ps_001',
        signal_type: 'SEARCH_VELOCITY_ACCELERATION',
        category: 'CUSTOMER',
        entity_type: 'CATEGORY',
        entity_id: identity.category,
        ...stamp(scenario, searchTiming),
        baseline_value: 100,
        observed_value: 118,
        delta: 18,
        delta_pct: 18,
        unit: 'percent_baseline',
        confidence: 92,
        quality: 95,
        provenance: provenanceFor(scenario, 'pre_campaign_search_acceleration', searchTiming)
      },
      {
        ...common,
        signal_id: 'sig_ps_002',
        signal_type: 'BASKET_ADD_ACCELERATION',
        category: 'CUSTOMER',
        entity_type: 'SKU',
        entity_id: `${identity.sku_id} ${identity.sku_name}`,
        ...stamp(scenario, basketTiming),
        baseline_value: 100,
        observed_value: 124,
        delta: 24,
        delta_pct: 24,
        unit: 'percent_baseline',
        confidence: 90,
        quality: 94,
        provenance: provenanceFor(scenario, 'basket_add_intent_surge', basketTiming)
      },
      {
        ...common,
        signal_id: 'sig_ps_003',
        signal_type: 'SLOT_BOOKING_PRESSURE',
        category: 'CUSTOMER',
        entity_type: 'REGION',
        entity_id: identity.focus_region,
        ...stamp(scenario, slotTiming),
        /*
         * Online slot pressure moves with the scenario's own online share rather than with
         * a pair of literals that belonged to a different estate.
         */
        baseline_value: estate.online_demand_share_pct * 5,
        observed_value: round1(
          estate.online_demand_share_pct * 5 * (1 + demand.total_demand_movement_pct / 100)
        ),
        delta: round1(estate.online_demand_share_pct * 5 * (demand.total_demand_movement_pct / 100)),
        delta_pct: round1(demand.total_demand_movement_pct),
        unit: 'percent_capacity',
        confidence: 88,
        quality: 92,
        provenance: provenanceFor(scenario, 'delivery_slot_saturation_warning', slotTiming)
      },
      {
        ...common,
        signal_id: 'sig_ps_004',
        signal_type: 'SUPPLIER_CAPACITY_PRESSURE',
        category: 'SUPPLY',
        entity_type: 'SUPPLIER',
        /*
         * THE value R-20 was about. The supplier named here is the supplier named in the
         * economics, because the flex notice this signal exists to prompt is served on the
         * party that makes the product.
         */
        entity_id: supply.supplier_name,
        ...stamp(scenario, supplierTiming),
        baseline_value: servableWeekly,
        observed_value: expectedWeekly,
        delta: expectedWeekly - servableWeekly,
        delta_pct: round1(((expectedWeekly - servableWeekly) / servableWeekly) * 100),
        unit: 'units_per_week',
        confidence: 95,
        quality: 96,
        provenance: {
          ...provenanceFor(scenario, 'supplier_capacity_allocation_cap', supplierTiming),
          supplier_id: supply.supplier_id,
          flex_clause: supply.flex_clause_reference,
          lead_time_days: String(calendar.supplier_lead_time_days)
        }
      },
      {
        ...common,
        signal_id: 'sig_ps_005',
        signal_type: 'STOCK_COVER_DECLINE',
        category: 'INVENTORY',
        entity_type: 'DC',
        entity_id: `${identity.focus_region} RDC`,
        ...stamp(scenario, coverTiming),
        baseline_value: baseCoverDays,
        observed_value: pressuredCoverDays,
        delta: round1(pressuredCoverDays - baseCoverDays),
        delta_pct: round1(((pressuredCoverDays - baseCoverDays) / baseCoverDays) * 100),
        unit: 'days_of_cover',
        confidence: 91,
        quality: 93,
        provenance: provenanceFor(scenario, 'rdc_safety_stock_depletion', coverTiming)
      }
    ];
  } else if (scenario.taxonomy.family_id === 'supplier_breach') {
    /*
     * Every value below is DERIVED from the scenario's own record.
     *
     * It used to be three literals — a lead time that doubled, a 0.5-to-4.5-hour replenishment
     * delay and a stockout probability that went from 5% to 68% — none of which belonged to any
     * scenario. They were the same defect `SCI-01` removed from the `promotion_surge` branch,
     * surviving in a branch nothing had yet run, and `SCI-03` is the packet that runs it.
     */
    const driftTiming: SignalTiming = { observed_period: 'T-2', effective_period: 'T+3' };
    const allocationTiming: SignalTiming = { observed_period: 'T-1', effective_period: 'T+3' };
    const coverTiming: SignalTiming = { observed_period: 'Today', effective_period: 'T+7' };

    /*
     * A supplier's lead time stretches in proportion to how far the demand on it exceeds the
     * allocation it planned against. One queue, one declared ratio — not a doubling asserted
     * because doubling reads well.
     */
    const demandOverAllocation = servableWeekly > 0 ? expectedWeekly / servableWeekly : 1;
    const contractedLeadHours = calendar.supplier_lead_time_days * 24;
    const observedLeadHours = round1(contractedLeadHours * demandOverAllocation);

    signals = [
      {
        ...common,
        signal_id: 'sig_sb_001',
        signal_type: 'SUPPLIER_LEAD_TIME_DRIFT',
        category: 'SUPPLY',
        entity_type: 'SUPPLIER',
        entity_id: supply.supplier_name,
        ...stamp(scenario, driftTiming),
        baseline_value: contractedLeadHours,
        observed_value: observedLeadHours,
        delta: round1(observedLeadHours - contractedLeadHours),
        delta_pct: round1(((observedLeadHours - contractedLeadHours) / contractedLeadHours) * 100),
        unit: 'hours',
        confidence: 96,
        quality: 98,
        provenance: {
          ...provenanceFor(scenario, 'supplier_lead_time_drift_under_allocation_pressure', driftTiming),
          supplier_id: supply.supplier_id,
          contracted_lead_time_days: String(calendar.supplier_lead_time_days)
        }
      },
      {
        ...common,
        signal_id: 'sig_sb_002',
        signal_type: 'SUPPLIER_CAPACITY_PRESSURE',
        category: 'SUPPLY',
        entity_type: 'SUPPLIER',
        /*
         * The same party the flex notice would be served on, and the same party the economics
         * name. R-20 is a rule about every family, not about the one it was found in.
         */
        entity_id: supply.supplier_name,
        ...stamp(scenario, allocationTiming),
        baseline_value: servableWeekly,
        observed_value: expectedWeekly,
        delta: expectedWeekly - servableWeekly,
        delta_pct: round1(((expectedWeekly - servableWeekly) / servableWeekly) * 100),
        unit: 'units_per_week',
        confidence: 95,
        quality: 96,
        provenance: {
          ...provenanceFor(scenario, 'supplier_capacity_allocation_cap', allocationTiming),
          supplier_id: supply.supplier_id,
          flex_clause: supply.flex_clause_reference,
          flex_rate_pct: String(supply.supplier_flex_rate_pct)
        }
      },
      {
        ...common,
        signal_id: 'sig_sb_003',
        signal_type: 'STOCK_COVER_DECLINE',
        category: 'INVENTORY',
        entity_type: 'DC',
        entity_id: `${identity.focus_region} RDC`,
        ...stamp(scenario, coverTiming),
        baseline_value: baseCoverDays,
        observed_value: pressuredCoverDays,
        delta: round1(pressuredCoverDays - baseCoverDays),
        delta_pct: round1(((pressuredCoverDays - baseCoverDays) / baseCoverDays) * 100),
        unit: 'days_of_cover',
        confidence: 93,
        quality: 94,
        provenance: provenanceFor(scenario, 'rdc_cover_decline_under_lead_time_drift', coverTiming)
      }
    ];
  } else if (scenario.taxonomy.family_id === 'fresh_perishable_waste') {
    /*
     * A short-life line's timeline is not a demand story. What a same-day bake publishes is
     * the pressure on the bake plan, what ages on the shelf, and what the price investment
     * does to contribution — which is the evidence a reader needs to answer *should we promote
     * this at all?* rather than *how deep?*.
     *
     * Every value is derived from the record: the competitor trigger from the scenario's own
     * OBSERVED_BEHAVIOUR attribution, the ageing pressure from its declared waste rate, the
     * bake-plan pressure from its allocation index, and the margin compression from the
     * promotion economics primitive both the curve and the causal engine resolve through.
     */
    const competitorTiming: SignalTiming = { observed_period: 'T-7', effective_period: 'T+1' };
    const ageingTiming: SignalTiming = { observed_period: 'T-2', effective_period: 'T+3' };
    const bakePlanTiming: SignalTiming = { observed_period: 'T-1', effective_period: 'T+3' };
    const marginTiming: SignalTiming = { observed_period: 'Today', effective_period: 'T+7' };

    const observedBehaviourPp = demand.movement_attribution
      .filter(a => a.driver_class === 'OBSERVED_BEHAVIOUR')
      .reduce((sum, a) => sum + a.contribution_pp, 0);

    const baseWastePct = round1((scenario.economics.waste_units_per_week / baseWeekly) * 100);
    // Bake to the promoted plan, sell to an inelastic response: the surplus ages on the shelf.
    const pressuredWastePct = round1(
      baseWastePct * (1 + demand.total_demand_movement_pct / 100)
    );

    const contributionAtList = scenarioContributionPerUnitAtListGbp(scenario);
    const contributionAtDepth = scenarioContributionAtDepthGbp(
      scenario,
      scenario.economics.promotion_depth_pct
    );

    signals = [
      {
        ...common,
        signal_id: 'sig_fw_001',
        signal_type: 'COMPETITOR_CAMPAIGN_LAUNCH',
        category: 'COMMERCIAL',
        entity_type: 'CATEGORY',
        entity_id: identity.category,
        ...stamp(scenario, competitorTiming),
        baseline_value: 100,
        observed_value: round1(100 + observedBehaviourPp),
        delta: round1(observedBehaviourPp),
        delta_pct: round1(observedBehaviourPp),
        unit: 'percent_baseline',
        confidence: 86,
        quality: 88,
        provenance: provenanceFor(scenario, 'competitor_feature_observed_in_category', competitorTiming)
      },
      {
        ...common,
        signal_id: 'sig_fw_002',
        signal_type: 'PERISHABLE_AGEING_PRESSURE',
        category: 'INVENTORY',
        entity_type: 'SKU',
        entity_id: `${identity.sku_id} ${identity.sku_name}`,
        ...stamp(scenario, ageingTiming),
        baseline_value: baseWastePct,
        observed_value: pressuredWastePct,
        delta: round1(pressuredWastePct - baseWastePct),
        delta_pct: round1(((pressuredWastePct - baseWastePct) / baseWastePct) * 100),
        unit: 'percent_of_week',
        confidence: 91,
        quality: 93,
        provenance: provenanceFor(scenario, 'short_life_surplus_ageing_under_promotion', ageingTiming)
      },
      {
        ...common,
        signal_id: 'sig_fw_003',
        signal_type: 'SUPPLIER_CAPACITY_PRESSURE',
        category: 'SUPPLY',
        entity_type: 'SUPPLIER',
        entity_id: supply.supplier_name,
        ...stamp(scenario, bakePlanTiming),
        baseline_value: servableWeekly,
        observed_value: expectedWeekly,
        delta: expectedWeekly - servableWeekly,
        delta_pct: round1(((expectedWeekly - servableWeekly) / servableWeekly) * 100),
        unit: 'units_per_week',
        confidence: 94,
        quality: 95,
        provenance: {
          ...provenanceFor(scenario, 'same_day_bake_plan_headroom', bakePlanTiming),
          supplier_id: supply.supplier_id,
          flex_clause: supply.flex_clause_reference,
          lead_time_days: String(calendar.supplier_lead_time_days)
        }
      },
      {
        ...common,
        signal_id: 'sig_fw_004',
        signal_type: 'MARGIN_COMPRESSION',
        category: 'FINANCIAL',
        entity_type: 'SKU',
        entity_id: `${identity.sku_id} ${identity.sku_name}`,
        ...stamp(scenario, marginTiming),
        baseline_value: Number(contributionAtList.toFixed(2)),
        observed_value: Number(contributionAtDepth.toFixed(2)),
        delta: Number((contributionAtDepth - contributionAtList).toFixed(2)),
        delta_pct: round1(((contributionAtDepth - contributionAtList) / contributionAtList) * 100),
        unit: 'gbp_per_unit',
        confidence: 97,
        quality: 98,
        provenance: {
          ...provenanceFor(scenario, 'unit_contribution_at_committed_depth', marginTiming),
          supplier_promotional_funding_pct: String(scenario.economics.supplier_promotional_funding_pct)
        }
      }
    ];
  } else {
    // Every other family: the movement the scenario itself declares, on its own scopes.
    const shiftTiming: SignalTiming = { observed_period: 'T-1', effective_period: 'T+3' };
    const surplusTiming: SignalTiming = { observed_period: 'Today', effective_period: 'T+7' };

    signals = [
      {
        ...common,
        signal_id: 'sig_gen_001',
        signal_type: 'REGIONAL_DEMAND_SHIFT',
        category: 'DEMAND',
        entity_type: 'REGION',
        entity_id: identity.focus_region,
        ...stamp(scenario, shiftTiming),
        baseline_value: 100,
        observed_value: round1(100 + demand.total_demand_movement_pct),
        delta: round1(demand.total_demand_movement_pct),
        delta_pct: round1(demand.total_demand_movement_pct),
        unit: 'percent_baseline',
        confidence: 89,
        quality: 91,
        provenance: provenanceFor(scenario, 'regional_demand_rebalance', shiftTiming)
      },
      {
        ...common,
        signal_id: 'sig_gen_002',
        signal_type: 'REGIONAL_INVENTORY_SURPLUS',
        category: 'INVENTORY',
        entity_type: 'DC',
        entity_id: `${identity.focus_region} RDC`,
        ...stamp(scenario, surplusTiming),
        baseline_value: inventory.distribution_centre_units,
        observed_value: inventory.distribution_centre_units + inventory.on_order_units,
        delta: inventory.on_order_units,
        delta_pct: round1((inventory.on_order_units / inventory.distribution_centre_units) * 100),
        unit: 'excess_units',
        confidence: 90,
        quality: 92,
        provenance: provenanceFor(scenario, 'rdc_excess_buffer_holding', surplusTiming)
      }
    ];
  }

  // Validate all generated signals before returning
  return signals.filter(s => validateEnterpriseSignal(s).valid);
}
