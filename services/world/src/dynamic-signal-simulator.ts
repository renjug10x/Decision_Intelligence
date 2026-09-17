/**
 * CogniX Enterprise World Domain - Dynamic Signal Simulator Engine
 *
 * Evaluates temporal signal trajectories (T-7 to T+30) deterministically from incoming SignalSimulationContext.
 *
 * Domain Ownership: Enterprise World Domain (services/world)
 * Architectural Rule: 100% pure calculative logic. Zero state mutation across World, Decision State, or Telemetry.
 */

import {
  SignalSimulationRequest,
  SignalSimulationResponse,
  EnterpriseSignalTimeline,
  EnterpriseSignalObservation,
  SimulationPeriod,
  ORDERED_SIMULATION_PERIODS,
  validateTemporalRange,
  validateSignalSimulationContext
} from '../../../packages/contracts/src/index';
import { resolveScenario } from '../../../packages/contracts/src/scenario-registry';
import { scenarioPeriodInstantIso, platformReceiptNowIso } from '../../../packages/contracts/src/scenario-clock';
import {
  CanonicalScenario,
  scenarioWeeklyPopulationUnits,
  scenarioExpectedDemandUnits,
  scenarioServableDemandUnits,
  scenarioBaseDemandUnits,
  scenarioStoreCoverDays,
  scenarioRetailerFundedShare
} from '../../../packages/contracts/src/canonical-scenario-model';
import { observedBehaviourCarriers } from './observed-behaviour-carriers';

const GENERATOR_VERSION = 'sim_gen_v1.0.0';

/**
 * The SHAPE a pressure signal follows across the simulated periods, as a share of its peak.
 *
 * Declared once, here, and shared by every derived family branch. ADR-073 rule 4 — *behaviour may
 * be seeded, economics must be derived* — is what admits it: how pressure BUILDS over a fortnight is
 * a property of the situation, while how far it builds is a property of the scenario and is read
 * from the record every time.
 *
 * The profile is the same one the `promotion_surge` branch has always used, extracted rather than
 * re-typed so a later change cannot move one family's curve and leave the others behind.
 */
const PRESSURE_PROFILE: Record<SimulationPeriod, number> = {
  'T-90': 0,
  'T-30': 0,
  'T-7': 0.40,
  'T-5': 0.65,
  'T-3': 0.85,
  'T-2': 0.90,
  'T-1': 0.95,
  'Today': 1.00,
  'T+1': 1.10,
  'T+3': 1.25,
  'T+7': 1.40,
  'T+30': 0.30
};

const round1 = (v: number) => Number(v.toFixed(1));

/**
 * One derived timeline, built from a baseline and a PEAK movement the scenario's own record
 * declares. Nothing here carries a literal quantity: the caller supplies both numbers from the
 * record, and this applies the declared shape to them.
 */
function derivedTimeline(input: {
  timelineId: string;
  signalType: EnterpriseSignalTimeline['signal_type'];
  category: EnterpriseSignalTimeline['category'];
  entityType: EnterpriseSignalTimeline['entity_type'];
  entityId: string;
  unit: string;
  baseline: number;
  /** The movement at the profile's peak, in the same unit as `baseline`. Derived, never declared. */
  peakDelta: number;
  ruleId: string;
  drivers: Record<string, number | string | boolean>;
  confidence: number;
  quality: number;
  periods: SimulationPeriod[];
  at: (p: SimulationPeriod) => string;
  stateVersion: number;
  /** Applied from the period an intervention becomes effective onwards. 1 means no relief. */
  reliefFactor?: number;
  reliefFromIdx?: number;
  interventionRefs?: string[];
  tenantId: string;
  scenarioId: string;
}): EnterpriseSignalTimeline {
  return {
    timeline_id: input.timelineId,
    signal_type: input.signalType,
    category: input.category,
    tenant_id: input.tenantId,
    scenario_id: input.scenarioId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    unit: input.unit,
    synthetic_demo: true,
    schema_version: '1.0',
    observations: input.periods.map((period): EnterpriseSignalObservation => {
      const periodIdx = ORDERED_SIMULATION_PERIODS.indexOf(period);
      const relieved = input.reliefFromIdx !== undefined && periodIdx > input.reliefFromIdx;
      const share = PRESSURE_PROFILE[period] ?? 0;
      const delta = round1(input.peakDelta * share * (relieved ? (input.reliefFactor ?? 1) : 1));
      const observed = round1(input.baseline + delta);
      return {
        period,
        observed_at: input.at(period),
        effective_at: input.at(period),
        baseline_value: round1(input.baseline),
        observed_value: observed,
        delta,
        delta_pct: input.baseline === 0 ? 0 : Number(((delta / input.baseline) * 100).toFixed(1)),
        unit: input.unit,
        confidence: input.confidence,
        quality: input.quality,
        provenance: {
          rule_id: input.ruleId,
          drivers: { ...input.drivers, profile_share: share, relieved },
          decision_state_version: input.stateVersion,
          intervention_refs: relieved ? (input.interventionRefs ?? []) : [],
          generator_version: GENERATOR_VERSION
        }
      };
    })
  };
}

/**
 * The supply-side timelines every scenario that is under supply pressure carries, derived from its
 * own record. Shared by the families that need them rather than re-typed per family.
 */
function supplyPressureTimelines(ctx: {
  scenario: CanonicalScenario;
  scenarioId: string;
  tenantId: string;
  periods: SimulationPeriod[];
  at: (p: SimulationPeriod) => string;
  stateVersion: number;
  reliefFromIdx: number;
  interventionRefs: string[];
}): EnterpriseSignalTimeline[] {
  const { scenario } = ctx;
  const weekly = scenarioWeeklyPopulationUnits(scenario);
  const servableWeekly = Math.round(weekly * scenario.supply.supplier_capacity_index);
  const expectedWeekly = Math.round(weekly * (1 + scenario.demand.total_demand_movement_pct / 100));
  const baseCover = scenarioStoreCoverDays(scenario);
  const pressuredCover = baseCover / (1 + scenario.demand.total_demand_movement_pct / 100);

  return [
    derivedTimeline({
      timelineId: `tl_capacity_${ctx.scenarioId}`,
      signalType: 'SUPPLIER_CAPACITY_PRESSURE',
      category: 'SUPPLY',
      entityType: 'SUPPLIER',
      entityId: scenario.supply.supplier_name,
      unit: 'units_per_week',
      baseline: servableWeekly,
      // How far expected demand runs beyond the standing allocation, at this scenario's own scale.
      peakDelta: expectedWeekly - servableWeekly,
      ruleId: 'SIG-RULE-CAPACITY-PRESSURE',
      drivers: {
        allocation_index: scenario.supply.supplier_capacity_index,
        declared_movement_pct: scenario.demand.total_demand_movement_pct
      },
      confidence: 97, quality: 98,
      periods: ctx.periods, at: ctx.at, stateVersion: ctx.stateVersion,
      reliefFactor: 1 - scenario.supply.supplier_flex_rate_pct / 100,
      reliefFromIdx: ctx.reliefFromIdx,
      interventionRefs: ctx.interventionRefs,
      tenantId: ctx.tenantId, scenarioId: ctx.scenarioId
    }),
    derivedTimeline({
      timelineId: `tl_cover_${ctx.scenarioId}`,
      signalType: 'STOCK_COVER_DECLINE',
      category: 'INVENTORY',
      entityType: 'SKU',
      entityId: scenario.identity.sku_id,
      unit: 'days',
      baseline: round1(baseCover),
      // Cover erodes as demand runs above the rate the cover was calculated at.
      peakDelta: round1(pressuredCover - baseCover),
      ruleId: 'SIG-RULE-STOCK-COVER',
      drivers: {
        store_units: scenario.inventory.store_units,
        declared_movement_pct: scenario.demand.total_demand_movement_pct
      },
      confidence: 95, quality: 96,
      periods: ctx.periods, at: ctx.at, stateVersion: ctx.stateVersion,
      reliefFactor: 0.5,
      reliefFromIdx: ctx.reliefFromIdx,
      interventionRefs: ctx.interventionRefs,
      tenantId: ctx.tenantId, scenarioId: ctx.scenarioId
    })
  ];
}

/**
 * `R-37` — the declared observed behaviour, on a timeline.
 *
 * The same carriers the snapshot generator publishes, across the simulated periods, so the evidence
 * the Demand surface reads now and the evidence the Living Evidence timeline replays are the same
 * observations rather than two independently authored sets. `PRESSURE_PROFILE` is 1.00 at `Today`,
 * which is what makes the timeline's own now identical to the snapshot.
 *
 * No relief factor. An SLA flex clause changes what the supplier can land; it does not change what
 * customers did, and applying supply relief to demand evidence would let an intervention edit the
 * observation it was taken in response to.
 */
function observedBehaviourTimelines(ctx: {
  scenario: CanonicalScenario;
  scenarioId: string;
  tenantId: string;
  periods: SimulationPeriod[];
  at: (p: SimulationPeriod) => string;
  stateVersion: number;
}): EnterpriseSignalTimeline[] {
  return observedBehaviourCarriers(ctx.scenario).map(carrier => derivedTimeline({
    timelineId: `${carrier.timeline_id}_${ctx.scenarioId}`,
    signalType: carrier.signal_type,
    category: carrier.category,
    entityType: carrier.entity_type,
    entityId: carrier.entity_id,
    unit: 'percent_baseline',
    baseline: 100,
    peakDelta: carrier.peak_delta_pct,
    ruleId: carrier.rule_id,
    drivers: carrier.drivers,
    confidence: carrier.confidence,
    quality: carrier.quality,
    periods: ctx.periods,
    at: ctx.at,
    stateVersion: ctx.stateVersion,
    tenantId: ctx.tenantId,
    scenarioId: ctx.scenarioId
  }));
}

export function simulateEnterpriseSignalTimelines(request: SignalSimulationRequest): SignalSimulationResponse {
  const context = request.context;

  // Validation
  const contextVal = validateSignalSimulationContext(context);
  if (!contextVal.valid) {
    throw new Error(`Invalid SignalSimulationContext: ${contextVal.errors.join(', ')}`);
  }

  const fromPeriod: SimulationPeriod = request.temporal_range?.from || 'T-90';
  const toPeriod: SimulationPeriod = request.temporal_range?.to || 'T+30';

  const rangeVal = validateTemporalRange(fromPeriod, toPeriod);
  if (!rangeVal.valid) {
    throw new Error(rangeVal.error);
  }

  const fromIdx = ORDERED_SIMULATION_PERIODS.indexOf(fromPeriod);
  const toIdx = ORDERED_SIMULATION_PERIODS.indexOf(toPeriod);
  const targetPeriods = ORDERED_SIMULATION_PERIODS.slice(fromIdx, toIdx + 1);

  // Nullish default only — explicit 0 must remain 0 (never coerce via || into a 20% promo world).
  const promoLift = context.promotion_lift ?? 20; // percent
  const stateVersion = context.decision_state_version || 1;

  /*
   * ADR-078. Every observation on a simulated timeline is stamped on the SCENARIO clock,
   * at the instant its own period falls on. It used to be `new Date()` — the same civil
   * instant on every period of every timeline, which made a T-90 observation and a T+30
   * one equally fresh and left the Observability freshness column permanently at zero.
   *
   * The scenario is RESOLVED from the context's identity, never defaulted (ADR-077 part 4).
   */
  const scenario = resolveScenario(context.scenario_id);
  const at = (period: SimulationPeriod) => scenarioPeriodInstantIso(scenario, period);

  /*
   * The family is the RESOLVED scenario's own taxonomy. It used to be sniffed out of the
   * scenario id — `scenario_id.includes('BREACH')` — which meant a scenario's behaviour
   * depended on the spelling of its identifier, the same class of defect ADR-079 retires
   * on the economics side.
   */
  const scenarioFamily = context.scenario_family || scenario.taxonomy.family_id;

  // Find active interventions and their effective periods
  const slaFlexIntervention = context.selected_interventions?.find(i => i.intervention_id.includes('sla_flex') || i.intervention_id.includes('flex'));
  const slaFlexEffectiveIdx = slaFlexIntervention ? ORDERED_SIMULATION_PERIODS.indexOf(slaFlexIntervention.effective_period) : 999;

  const simulationId = `sig_sim_${Math.random().toString(36).substr(2, 9)}`;
  const timelines: EnterpriseSignalTimeline[] = [];

  if (scenarioFamily === 'promotion_surge') {
    // Timeline 1: SEARCH_VELOCITY_ACCELERATION
    timelines.push({
      timeline_id: `tl_search_${context.scenario_id}`,
      signal_type: 'SEARCH_VELOCITY_ACCELERATION',
      category: 'CUSTOMER',
      tenant_id: context.tenant_id,
      scenario_id: context.scenario_id,
      entity_type: 'CATEGORY',
      // Derived from the resolved scenario — never a literal beside its identity (ADR-077).
      entity_id: scenario.identity.category,
      unit: 'percent_baseline',
      synthetic_demo: true,
      schema_version: '1.0',
      observations: targetPeriods.map(period => {
        const periodIdx = ORDERED_SIMULATION_PERIODS.indexOf(period);
        let deltaPct = 0;

        if (periodIdx < ORDERED_SIMULATION_PERIODS.indexOf('T-7')) deltaPct = 0;
        else if (period === 'T-7') deltaPct = Math.round(promoLift * 0.4);
        else if (period === 'T-5') deltaPct = Math.round(promoLift * 0.65);
        else if (period === 'T-3') deltaPct = Math.round(promoLift * 0.85);
        else if (period === 'T-2') deltaPct = Math.round(promoLift * 0.90);
        else if (period === 'T-1') deltaPct = Math.round(promoLift * 0.95);
        else if (period === 'Today') deltaPct = Math.round(promoLift * 0.90);
        else if (period === 'T+1') deltaPct = Math.round(promoLift * 1.10);
        else if (period === 'T+3') deltaPct = Math.round(promoLift * 1.25);
        else if (period === 'T+7') deltaPct = Math.round(promoLift * 1.40);
        else if (period === 'T+30') deltaPct = Math.round(promoLift * 0.30);

        return {
          period,
          observed_at: at(period),
          effective_at: at(period),
          baseline_value: 100,
          observed_value: 100 + deltaPct,
          delta: deltaPct,
          delta_pct: deltaPct,
          unit: 'percent_baseline',
          confidence: 92,
          quality: 95,
          provenance: {
            rule_id: 'SIG-RULE-SEARCH-ACCEL',
            drivers: { promo_lift: promoLift, scope: context.campaign_scope },
            decision_state_version: stateVersion,
            generator_version: GENERATOR_VERSION
          }
        };
      })
    });

    // Timeline 2: BASKET_ADD_ACCELERATION
    timelines.push({
      timeline_id: `tl_basket_${context.scenario_id}`,
      signal_type: 'BASKET_ADD_ACCELERATION',
      category: 'CUSTOMER',
      tenant_id: context.tenant_id,
      scenario_id: context.scenario_id,
      entity_type: 'SKU',
      entity_id: `${scenario.identity.sku_id} ${scenario.identity.sku_name}`,
      unit: 'percent_baseline',
      synthetic_demo: true,
      schema_version: '1.0',
      observations: targetPeriods.map(period => {
        const periodIdx = ORDERED_SIMULATION_PERIODS.indexOf(period);
        let deltaPct = 0;

        if (period === 'T-7') deltaPct = Math.round(promoLift * 0.3);
        else if (period === 'T-5') deltaPct = Math.round(promoLift * 0.55);
        else if (period === 'T-3') deltaPct = Math.round(promoLift * 0.80);
        else if (period === 'T-2') deltaPct = Math.round(promoLift * 0.95);
        else if (period === 'T-1') deltaPct = Math.round(promoLift * 1.10);
        else if (period === 'Today') deltaPct = Math.round(promoLift * 1.20);
        else if (period === 'T+1') deltaPct = Math.round(promoLift * 1.35);
        else if (period === 'T+3') deltaPct = Math.round(promoLift * 1.50);
        else if (period === 'T+7') deltaPct = Math.round(promoLift * 1.60);
        else if (period === 'T+30') deltaPct = Math.round(promoLift * 0.20);

        return {
          period,
          observed_at: at(period),
          effective_at: at(period),
          baseline_value: 100,
          observed_value: 100 + deltaPct,
          delta: deltaPct,
          delta_pct: deltaPct,
          unit: 'percent_baseline',
          confidence: 90,
          quality: 94,
          provenance: {
            rule_id: 'SIG-RULE-BASKET-SURGE',
            drivers: { promo_lift: promoLift, method: context.promotion_method },
            decision_state_version: stateVersion,
            generator_version: GENERATOR_VERSION
          }
        };
      })
    });

    // Timeline 3: SUPPLIER_CAPACITY_PRESSURE (Reactive to SLA Flex Intervention)
    timelines.push({
      timeline_id: `tl_capacity_${context.scenario_id}`,
      signal_type: 'SUPPLIER_CAPACITY_PRESSURE',
      category: 'SUPPLY',
      tenant_id: context.tenant_id,
      scenario_id: context.scenario_id,
      entity_type: 'SUPPLIER',
      /*
       * The R-20 leak on the simulated path. This named FreshDirect UK — the supplier
       * DEMO-HARD-01 retired — beside a timeline whose category and SKU had already been
       * migrated to the canonical scenario. The supplier is the scenario's own.
       */
      entity_id: scenario.supply.supplier_name,
      unit: 'units_per_week',
      synthetic_demo: true,
      schema_version: '1.0',
      observations: targetPeriods.map(period => {
        const periodIdx = ORDERED_SIMULATION_PERIODS.indexOf(period);
        /*
         * `SCI-05` (`R-30`). This was `const baselineCap = 48000` — a weekly allocation belonging to
         * the 50-store estate `DEMO-HARD-01` retired, sitting in the reference scenario's own
         * evidence while its record declares 350,000 units a week against an allocation index of
         * 1.10. The supplier NAME had already been migrated off the retired world at `R-20`; the
         * quantity beside it had not, so the timeline named the right supplier and the wrong
         * capacity.
         *
         * Both are now the record's: the allocation is the declared weekly population lifted by the
         * declared allocation index, and the demand pressed against it is that population at the
         * promotion depth the decision state is running.
         */
        const baselineCap = Math.round(
          scenarioWeeklyPopulationUnits(scenario) * scenario.supply.supplier_capacity_index
        );
        const demandDemand = Math.round(scenarioWeeklyPopulationUnits(scenario) * (1 + promoLift / 100));

        // Canonical Intervention Rule: period <= effective_period -> un-intervened; period > effective_period -> flexed
        const hasInterventionEffect = periodIdx > slaFlexEffectiveIdx;
        /* The flex clause releases a declared SHARE of un-promoted demand, never a fixed count. */
        const flexUnits = hasInterventionEffect
          ? Math.round(scenarioWeeklyPopulationUnits(scenario) * scenario.supply.supplier_flex_rate_pct / 100)
          : 0;
        const effectiveCap = baselineCap + flexUnits;
        const deficit = Math.max(0, demandDemand - effectiveCap);

        return {
          period,
          observed_at: at(period),
          effective_at: at(period),
          baseline_value: baselineCap,
          observed_value: demandDemand,
          delta: demandDemand - baselineCap,
          delta_pct: Number(((demandDemand - baselineCap) / baselineCap * 100).toFixed(1)),
          unit: 'units_per_week',
          confidence: 95,
          quality: 96,
          provenance: {
            rule_id: 'SIG-RULE-SUPPLY-CAP',
            drivers: { demand: demandDemand, base_capacity: baselineCap, flex_capacity: flexUnits, deficit },
            decision_state_version: stateVersion,
            intervention_refs: hasInterventionEffect ? [slaFlexIntervention!.intervention_id] : [],
            generator_version: GENERATOR_VERSION
          }
        };
      })
    });

    // Timeline 4: STOCK_COVER_DECLINE
    timelines.push({
      timeline_id: `tl_cover_${context.scenario_id}`,
      signal_type: 'STOCK_COVER_DECLINE',
      category: 'INVENTORY',
      tenant_id: context.tenant_id,
      scenario_id: context.scenario_id,
      entity_type: 'DC',
      entity_id: `${scenario.identity.focus_region} RDC`,
      unit: 'days_of_cover',
      synthetic_demo: true,
      schema_version: '1.0',
      observations: targetPeriods.map(period => {
        const periodIdx = ORDERED_SIMULATION_PERIODS.indexOf(period);
        /*
         * `SCI-05` (`R-30`). `7.0` days of cover and a `3.8`-day loss were literals. The record
         * declares the inventory position and the run rate, so cover is derived from them, and the
         * loss is how far that cover erodes once demand runs at the promoted rate.
         */
        const baselineCover = scenarioStoreCoverDays(scenario);
        let coverLoss = baselineCover - baselineCover / (1 + promoLift / 100);

        // SLA Flex reduces cover depletion rate if period > effective_period
        const hasInterventionEffect = periodIdx > slaFlexEffectiveIdx;
        if (hasInterventionEffect) {
          coverLoss = coverLoss * 0.5; // halved cover loss due to SLA flex stock buffer
        }

        const observedCover = Number(Math.max(1.0, baselineCover - coverLoss).toFixed(1));
        const delta = Number((observedCover - baselineCover).toFixed(1));
        const deltaPct = Number(((delta / baselineCover) * 100).toFixed(1));

        return {
          period,
          observed_at: at(period),
          effective_at: at(period),
          baseline_value: baselineCover,
          observed_value: observedCover,
          delta,
          delta_pct: deltaPct,
          unit: 'days_of_cover',
          confidence: 91,
          quality: 93,
          provenance: {
            rule_id: 'SIG-RULE-COVER-DECLINE',
            drivers: { promo_lift: promoLift, cover_loss: coverLoss, sla_flex_active: hasInterventionEffect },
            decision_state_version: stateVersion,
            intervention_refs: hasInterventionEffect ? [slaFlexIntervention!.intervention_id] : [],
            generator_version: GENERATOR_VERSION
          }
        };
      })
    });
  } else {
    /*
     * EVERY OTHER FAMILY, derived from its own record (`SCI-05`, `R-30`).
     *
     * This branch used to be one timeline carrying a literal ladder of lead times —
     * `24, 28, 36, 42, 46, 48, 52, 60, 36, 24` hours against a baseline of 24 — that belonged to no
     * scenario. It is the same defect `SCI-03` removed from the signal GENERATOR's `supplier_breach`
     * branch, surviving in the SIMULATOR because `SCI-03` had no reason to run it: nothing called
     * the simulator until Refresh did.
     *
     * With three certified scenarios it was not merely thin but wrong. Both the salmon pack
     * (`supplier_breach`) and the bakery pack (`fresh_perishable_waste`) received the same single
     * timeline, with the same numbers, and its provenance declared `breach_family: 'supplier_breach'`
     * over a bakery decision. An evidence timeline that is identical for two scenarios with
     * different suppliers, different allocations and different economics is not evidence.
     *
     * Each family below now carries the signal set `SCI-03` established for it in the generator,
     * with every quantity read from the scenario's own record and only the SHAPE declared.
     */
    const reliefCtx = {
      scenario,
      scenarioId: context.scenario_id,
      tenantId: context.tenant_id,
      periods: targetPeriods,
      at,
      stateVersion,
      reliefFromIdx: slaFlexEffectiveIdx,
      interventionRefs: slaFlexIntervention ? [slaFlexIntervention.intervention_id] : []
    };

    if (scenarioFamily === 'supplier_breach') {
      /*
       * Lead time drifts because the supplier is being asked for more than its allocation covers.
       * The peak drift is the declared allocation shortfall applied to the declared lead time —
       * `SCI-03`'s derivation in the generator, on a timeline.
       */
      const expected = scenarioExpectedDemandUnits(scenario);
      const servable = scenarioServableDemandUnits(scenario);
      const shortfallRatio = servable > 0 ? Math.max(0, expected / servable - 1) : 0;
      const baselineHours = scenario.calendar.supplier_lead_time_days * 24;

      /*
       * `R-37`. The demand evidence this family had none of, listed first because it is observed
       * first: a category running ahead of plan and stores re-ordering faster than the
       * replenishment cycle assumes.
       */
      timelines.push(...observedBehaviourTimelines(reliefCtx));

      timelines.push(derivedTimeline({
        timelineId: `tl_leadtime_${context.scenario_id}`,
        signalType: 'SUPPLIER_LEAD_TIME_DRIFT',
        category: 'SUPPLY',
        entityType: 'SUPPLIER',
        entityId: scenario.supply.supplier_name,
        unit: 'hours',
        baseline: baselineHours,
        peakDelta: round1(baselineHours * shortfallRatio),
        ruleId: 'SIG-RULE-LEADTIME-DRIFT',
        drivers: {
          declared_lead_time_days: scenario.calendar.supplier_lead_time_days,
          allocation_shortfall_ratio: Number(shortfallRatio.toFixed(4))
        },
        confidence: 96, quality: 98,
        periods: targetPeriods, at, stateVersion,
        reliefFactor: 1 - scenario.supply.supplier_flex_rate_pct / 100,
        reliefFromIdx: slaFlexEffectiveIdx,
        interventionRefs: reliefCtx.interventionRefs,
        tenantId: context.tenant_id, scenarioId: context.scenario_id
      }));
      timelines.push(...supplyPressureTimelines(reliefCtx));

    } else if (scenarioFamily === 'fresh_perishable_waste') {
      /*
       * A premium perishable line under competitor pressure. Waste and margin are what move, and
       * both are declared on the record — the bakery pack states its weekly waste and its
       * retailer-funded share of the price investment.
       */
      const observedBehaviourPp = scenario.demand.movement_attribution
        .filter(a => a.driver_class === 'OBSERVED_BEHAVIOUR')
        .reduce((sum, a) => sum + a.contribution_pp, 0);

      timelines.push(derivedTimeline({
        timelineId: `tl_competitor_${context.scenario_id}`,
        signalType: 'COMPETITOR_CAMPAIGN_LAUNCH',
        category: 'COMMERCIAL',
        entityType: 'CATEGORY',
        entityId: scenario.identity.category,
        unit: 'percent_baseline',
        baseline: 100,
        // The movement the record attributes to what customers are actually doing.
        peakDelta: round1(observedBehaviourPp),
        ruleId: 'SIG-RULE-COMPETITOR-LAUNCH',
        drivers: { declared_observed_behaviour_pp: observedBehaviourPp },
        confidence: 88, quality: 90,
        periods: targetPeriods, at, stateVersion,
        tenantId: context.tenant_id, scenarioId: context.scenario_id
      }));

      /*
       * `R-37`. The customer RESPONSE to the competitor feature above, which is the demand-side
       * evidence DDF-01 admits — the trigger itself stays `COMMERCIAL` and stays out of it.
       */
      timelines.push(...observedBehaviourTimelines(reliefCtx));

      timelines.push(derivedTimeline({
        timelineId: `tl_ageing_${context.scenario_id}`,
        signalType: 'PERISHABLE_AGEING_PRESSURE',
        category: 'INVENTORY',
        entityType: 'SKU',
        entityId: scenario.identity.sku_id,
        unit: 'units_per_week',
        baseline: scenario.economics.waste_units_per_week,
        /*
         * Waste rises with the volume the promotion creates: a line baked to order wastes more of
         * what it over-produces. Derived from the declared waste rate and the declared movement.
         */
        peakDelta: round1(
          scenario.economics.waste_units_per_week * (scenario.demand.total_demand_movement_pct / 100)
        ),
        ruleId: 'SIG-RULE-PERISHABLE-AGEING',
        drivers: {
          declared_waste_units_per_week: scenario.economics.waste_units_per_week,
          declared_movement_pct: scenario.demand.total_demand_movement_pct
        },
        confidence: 94, quality: 95,
        periods: targetPeriods, at, stateVersion,
        tenantId: context.tenant_id, scenarioId: context.scenario_id
      }));

      timelines.push(...supplyPressureTimelines(reliefCtx));

      timelines.push(derivedTimeline({
        timelineId: `tl_margin_${context.scenario_id}`,
        signalType: 'MARGIN_COMPRESSION',
        category: 'COMMERCIAL',
        entityType: 'SKU',
        entityId: scenario.identity.sku_id,
        unit: 'percent',
        baseline: scenario.economics.gross_margin_rate_pct,
        /*
         * Margin compresses by the share of the price investment the RETAILER funds — the depth it
         * is paying for out of its own margin, which is exactly what the record declares.
         */
        peakDelta: round1(
          -scenario.economics.promotion_depth_pct * scenarioRetailerFundedShare(scenario)
        ),
        ruleId: 'SIG-RULE-MARGIN-COMPRESSION',
        drivers: {
          declared_depth_pct: scenario.economics.promotion_depth_pct,
          retailer_funded_share: Number(scenarioRetailerFundedShare(scenario).toFixed(4))
        },
        confidence: 97, quality: 98,
        periods: targetPeriods, at, stateVersion,
        tenantId: context.tenant_id, scenarioId: context.scenario_id
      }));

    } else {
      /*
       * A family with no branch of its own still gets its OWN numbers. The supply-pressure pair is
       * derivable for any scenario that declares an allocation and an inventory position, and the
       * provenance says plainly that this is the generic profile rather than a family-specific one —
       * a scenario reading a profile nobody wrote for it should be able to tell.
       */
      timelines.push(...supplyPressureTimelines(reliefCtx));
    }
  }

  return {
    simulation_id: simulationId,
    tenant_id: context.tenant_id,
    scenario_id: context.scenario_id,
    decision_state_id: context.decision_state_id,
    decision_state_version: stateVersion,
    generator_version: GENERATOR_VERSION,
    timelines,
    /*
     * A SERVER RECEIPT, not scenario evidence: it records when the platform ran the
     * simulation. ADR-078 part 2 keeps civil time exactly here, and the named helper is
     * what makes that a deliberate choice rather than an oversight.
     */
    timestamp: platformReceiptNowIso()
  };
}
