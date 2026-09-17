/**
 * CogniX Enterprise World Domain — Observed-Behaviour Evidence Carriers (`R-37`)
 * ───────────────────────────────────────────────────────────────────────────────
 * The demand-side evidence a curated scenario publishes for the movement its record attributes to
 * OBSERVED CUSTOMER BEHAVIOUR.
 *
 * The defect this closes
 * ----------------------
 * Every certified scenario declares a `movement_attribution`, and every one of them attributes part
 * of its movement to `OBSERVED_BEHAVIOUR` — 10.9pp on the reference scenario, 8.0pp on the chilled
 * salmon pack, 5.1pp on the premium bakery pack. Only the reference scenario had EVIDENCE for it.
 *
 *   Fresh Dairy     `SEARCH_VELOCITY_ACCELERATION` + `BASKET_ADD_ACCELERATION`   admitted by DDF-01
 *   Chilled Salmon  lead-time drift, capacity pressure, stock cover              all supply-side
 *   Premium Bakery  competitor launch, ageing, capacity, margin                  commercial/supply
 *
 * `DDF_STABILITY_SIGNAL_TYPES` (ADR-040) admits DEMAND-side divergence only, and deliberately
 * excludes supply, inventory, logistics and cost. So Salmon and Bakery reached
 * `evaluateForecastStability` with nothing to evaluate, returned `INDETERMINATE`, and their Demand
 * surfaces published a movement with the observed-behaviour component simply MISSING — the record
 * declared it and the evidence did not carry it.
 *
 * The bakery pack made the shape of the gap plain. It already published its declared observed
 * behaviour, as `COMPETITOR_CAMPAIGN_LAUNCH` — a COMMERCIAL signal. A competitor featuring the
 * category is a CAUSE; what customers then do is the demand evidence, and the two are not
 * interchangeable. Routing the competitor signal into the demand admission list would have made the
 * number appear, and would have meant a competitor's marketing calendar editing a demand forecast
 * directly. That is the widening ADR-040 exists to refuse, so the competitor trigger stays exactly
 * where it is and the customer RESPONSE is published beside it.
 *
 * Why the amplitudes are seeded and the rest is derived
 * ----------------------------------------------------
 * ADR-073 rule 4 — *behaviour may be seeded, economics must be derived*. How far a category moved
 * ahead of a promotion is an OBSERVATION about the modelled world; it is not derivable from the
 * scenario's economics, and inventing a derivation for it would be asserting a customer-response
 * model this platform does not have. So the divergence amplitudes below are declared, exactly as the
 * reference scenario's 18% search and 24% basket have always been, and everything else — which
 * category, which SKU, which region, which supplier, every identity and every quantity — is read
 * from the scenario's own record.
 *
 * What is NOT declared here is the contribution. No percentage point of demand movement is written
 * down in this file. The carrier publishes an observed divergence; `evaluateForecastStability`
 * converts it to an expected revision through ADR-040's published transfer function; the Demand
 * frontier carries the contextualised outlook forward by that revision; and what the surface finally
 * attributes to observed behaviour is whatever that governed path returns.
 *
 * The amplitudes were then CALIBRATED — chosen so that the governed path returns the contribution
 * the record already declares, because the record is the authority and the evidence is the carrier.
 * That is the same relationship the reference scenario has always had, and it is checked rather than
 * asserted: `tests/unit/run-r37-observed-behaviour-tests.ts` runs the live stability engine over
 * these carriers and fails if the contribution it returns drifts from the record's declaration. If
 * ADR-040's transfer function changes, that test goes red — it does not silently keep agreeing.
 *
 * One source, two publishers
 * --------------------------
 * `R-36`'s lesson was that a quantity reconstructed in two places will agree until a second scenario
 * arrives. The snapshot generator and the timeline simulator are exactly such a pair: one publishes
 * what is observed NOW, the other publishes the same evidence across T-90 … T+30. Both read this
 * module, so the Demand surface and the Living Evidence timeline cannot disagree about what was
 * observed. The timeline's pressure profile is 1.00 at `Today`, which is what makes the snapshot and
 * the timeline's own now the same observation rather than two that happen to look alike.
 */

import {
  CanonicalSignalType,
  SignalCategory,
  SignalEntityType,
  SimulationPeriod
} from '../../../packages/contracts/src/enterprise-signal-model';
import { CanonicalScenario } from '../../../packages/contracts/src/canonical-scenario-model';

/**
 * One demand-side observation a scenario publishes for its declared observed behaviour.
 *
 * `peak_delta_pct` is the divergence from the observation's own baseline at the pressure profile's
 * peak, in percent. It is a statement about the modelled world, not about the forecast: how far the
 * demand-outlook evidence has moved, before anything decides what that implies.
 */
export interface ObservedBehaviourCarrier {
  /** The snapshot signal's identifier. */
  signal_id: string;
  /** The timeline's identifier, before the scenario id is appended. */
  timeline_id: string;
  signal_type: CanonicalSignalType;
  category: SignalCategory;
  entity_type: SignalEntityType;
  /** Read from the record — the category, SKU or region the observation is scoped to. */
  entity_id: string;
  observed_period: SimulationPeriod;
  effective_period: SimulationPeriod;
  /** Percent divergence from baseline at the profile's peak. Seeded (ADR-073 rule 4). */
  peak_delta_pct: number;
  confidence: number;
  quality: number;
  /** The timeline's provenance rule identifier. */
  rule_id: string;
  /** The snapshot's provenance rule name. */
  rule: string;
  /** What the observation is about, for a reader checking the claim rather than taking it. */
  drivers: Record<string, number | string | boolean>;
}

/** Percentage points the record attributes to observed customer behaviour. */
export function declaredObservedBehaviourPp(scenario: CanonicalScenario): number {
  return scenario.demand.movement_attribution
    .filter(a => a.driver_class === 'OBSERVED_BEHAVIOUR')
    .reduce((sum, a) => sum + a.contribution_pp, 0);
}

/**
 * The demand-side carriers a scenario's family publishes for its declared observed behaviour.
 *
 * Empty when the record attributes nothing to observed behaviour — a scenario with no declared
 * customer response publishes no evidence for one, rather than a zero-amplitude signal that would
 * enter `evaluateForecastStability` and read as agreement.
 *
 * `promotion_surge` is empty for a different reason: its carriers already exist, in the generator
 * and the simulator, and have since before this repair. Re-authoring them here would move the
 * reference scenario's published evidence for no defect.
 */
export function observedBehaviourCarriers(scenario: CanonicalScenario): ObservedBehaviourCarrier[] {
  if (declaredObservedBehaviourPp(scenario) <= 0) return [];

  const { identity, estate } = scenario;
  const sku = `${identity.sku_id} ${identity.sku_name}`;

  if (scenario.taxonomy.family_id === 'supplier_breach') {
    /*
     * A constrained import. Nothing about the customer changed — the line is on promotion and it is
     * selling, and the decision is whether the supplier can land it. What a retailer OBSERVES in that
     * situation is the category running ahead of plan and stores re-ordering faster than the
     * replenishment cycle assumes; neither is a digital-funnel reading, because a counter fish line
     * is not bought that way.
     *
     * The two agree closely (18 and 20), which is why the evidence reads as confident rather than
     * contested: a broad, consistent move rather than a local spike.
     */
    return [
      {
        signal_id: 'sig_sb_004',
        timeline_id: 'tl_category_demand',
        signal_type: 'CATEGORY_DEMAND_ACCELERATION',
        category: 'DEMAND',
        entity_type: 'CATEGORY',
        entity_id: identity.category,
        observed_period: 'T-7',
        effective_period: 'T+1',
        peak_delta_pct: 18,
        confidence: 90,
        quality: 92,
        rule_id: 'SIG-RULE-CATEGORY-DEMAND-ACCEL',
        rule: 'category_demand_running_ahead_of_plan',
        drivers: { category: identity.category, estate_stores: estate.national_store_count }
      },
      {
        signal_id: 'sig_sb_005',
        timeline_id: 'tl_order_velocity',
        signal_type: 'ORDER_VELOCITY_ACCELERATION',
        category: 'DEMAND',
        entity_type: 'SKU',
        entity_id: sku,
        observed_period: 'T-3',
        effective_period: 'T+1',
        peak_delta_pct: 20,
        confidence: 93,
        quality: 94,
        rule_id: 'SIG-RULE-ORDER-VELOCITY-ACCEL',
        rule: 'store_replenishment_order_velocity_acceleration',
        drivers: { sku_id: identity.sku_id, declared_lead_time_days: scenario.calendar.supplier_lead_time_days }
      }
    ];
  }

  if (scenario.taxonomy.family_id === 'fresh_perishable_waste') {
    /*
     * A same-day bake under a competitor's in-store feature, in one region. The response is where
     * the competitor is: London moves hard while the national category barely does, and the gap
     * between the two observations is itself the evidence — a localised response, not a market-wide
     * one, which is precisely the reading a regionally scoped decision needs.
     *
     * That disagreement is not a presentational choice. `evaluateForecastStability` treats dispersion
     * between signals as instability, so a carrier pair that disagrees produces a LESS stable
     * outlook than one that agrees, and the bakery's evidence says so.
     */
    return [
      {
        signal_id: 'sig_fw_005',
        timeline_id: 'tl_category_demand',
        signal_type: 'CATEGORY_DEMAND_ACCELERATION',
        category: 'DEMAND',
        entity_type: 'CATEGORY',
        entity_id: identity.category,
        observed_period: 'T-5',
        effective_period: 'T+1',
        peak_delta_pct: 8,
        confidence: 87,
        quality: 89,
        rule_id: 'SIG-RULE-CATEGORY-DEMAND-ACCEL',
        rule: 'category_demand_response_to_competitor_feature',
        drivers: { category: identity.category, market_scope: identity.market_scope }
      },
      {
        signal_id: 'sig_fw_006',
        timeline_id: 'tl_regional_shift',
        signal_type: 'REGIONAL_DEMAND_SHIFT',
        category: 'DEMAND',
        entity_type: 'REGION',
        entity_id: identity.focus_region,
        observed_period: 'T-3',
        effective_period: 'T+1',
        peak_delta_pct: 18,
        confidence: 90,
        quality: 91,
        rule_id: 'SIG-RULE-REGIONAL-DEMAND-SHIFT',
        rule: 'regional_demand_concentration_under_competitor_feature',
        drivers: {
          region: identity.focus_region,
          region_stores: estate.region_store_counts[identity.focus_region] ?? estate.national_store_count
        }
      }
    ];
  }

  return [];
}
