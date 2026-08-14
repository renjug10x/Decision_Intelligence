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

const GENERATOR_VERSION = 'sim_gen_v1.0.0';

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

  const scenarioFamily = context.scenario_family || (context.scenario_id.includes('BREACH') ? 'supplier_breach' : 'promotion_surge');
  const promoLift = context.promotion_lift || 20; // percent
  const stateVersion = context.decision_state_version || 1;
  const now = new Date().toISOString();

  // Find active interventions and their effective periods
  const slaFlexIntervention = context.selected_interventions?.find(i => i.intervention_id.includes('sla_flex') || i.intervention_id.includes('flex'));
  const slaFlexEffectiveIdx = slaFlexIntervention ? ORDERED_SIMULATION_PERIODS.indexOf(slaFlexIntervention.effective_period) : 999;

  const simulationId = `sig_sim_${Math.random().toString(36).substr(2, 9)}`;
  const timelines: EnterpriseSignalTimeline[] = [];

  if (scenarioFamily === 'promotion_surge' || context.scenario_id.includes('PROMO')) {
    // Timeline 1: SEARCH_VELOCITY_ACCELERATION
    timelines.push({
      timeline_id: `tl_search_${context.scenario_id}`,
      signal_type: 'SEARCH_VELOCITY_ACCELERATION',
      category: 'CUSTOMER',
      tenant_id: context.tenant_id,
      scenario_id: context.scenario_id,
      entity_type: 'CATEGORY',
      entity_id: 'Fresh Dairy',
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
          observed_at: now,
          effective_at: now,
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
      entity_id: 'P004 Cheddar Mature 400g',
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
          observed_at: now,
          effective_at: now,
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
      entity_id: 'FreshDirect UK',
      unit: 'units_per_week',
      synthetic_demo: true,
      schema_version: '1.0',
      observations: targetPeriods.map(period => {
        const periodIdx = ORDERED_SIMULATION_PERIODS.indexOf(period);
        const baselineCap = 48000;
        const demandDemand = Math.round(48000 * (1 + promoLift / 100));

        // Canonical Intervention Rule: period <= effective_period -> un-intervened; period > effective_period -> flexed
        const hasInterventionEffect = periodIdx > slaFlexEffectiveIdx;
        const flexUnits = hasInterventionEffect ? 7000 : 0;
        const effectiveCap = baselineCap + flexUnits;
        const deficit = Math.max(0, demandDemand - effectiveCap);

        return {
          period,
          observed_at: now,
          effective_at: now,
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
      entity_id: 'Trafford RDC',
      unit: 'days_of_cover',
      synthetic_demo: true,
      schema_version: '1.0',
      observations: targetPeriods.map(period => {
        const periodIdx = ORDERED_SIMULATION_PERIODS.indexOf(period);
        const baselineCover = 7.0;
        let coverLoss = (promoLift / 20) * 3.8;

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
          observed_at: now,
          effective_at: now,
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
    // Supplier Breach Scenario Timeline
    timelines.push({
      timeline_id: `tl_leadtime_${context.scenario_id}`,
      signal_type: 'SUPPLIER_LEAD_TIME_DRIFT',
      category: 'SUPPLY',
      tenant_id: context.tenant_id,
      scenario_id: context.scenario_id,
      entity_type: 'SUPPLIER',
      entity_id: 'Greencore Ready Meals',
      unit: 'hours',
      synthetic_demo: true,
      schema_version: '1.0',
      observations: targetPeriods.map(period => {
        const periodIdx = ORDERED_SIMULATION_PERIODS.indexOf(period);
        const baselineDelay = 24;
        let observedDelay = 24;

        if (period === 'T-7') observedDelay = 24;
        else if (period === 'T-5') observedDelay = 28;
        else if (period === 'T-3') observedDelay = 36;
        else if (period === 'T-2') observedDelay = 42;
        else if (period === 'T-1') observedDelay = 46;
        else if (period === 'Today') observedDelay = 48;
        else if (period === 'T+1') observedDelay = 52;
        else if (period === 'T+3') observedDelay = 60;
        else if (period === 'T+7') observedDelay = 36;
        else if (period === 'T+30') observedDelay = 24;

        const hasInterventionEffect = periodIdx > slaFlexEffectiveIdx;
        if (hasInterventionEffect) {
          observedDelay = Math.max(24, observedDelay - 16);
        }

        return {
          period,
          observed_at: now,
          effective_at: now,
          baseline_value: baselineDelay,
          observed_value: observedDelay,
          delta: observedDelay - baselineDelay,
          delta_pct: Number(((observedDelay - baselineDelay) / baselineDelay * 100).toFixed(1)),
          unit: 'hours',
          confidence: 96,
          quality: 98,
          provenance: {
            rule_id: 'SIG-RULE-LEADTIME-DRIFT',
            drivers: { breach_family: 'supplier_breach', sla_flex_active: hasInterventionEffect },
            decision_state_version: stateVersion,
            intervention_refs: hasInterventionEffect ? [slaFlexIntervention!.intervention_id] : [],
            generator_version: GENERATOR_VERSION
          }
        };
      })
    });
  }

  return {
    simulation_id: simulationId,
    tenant_id: context.tenant_id,
    scenario_id: context.scenario_id,
    decision_state_id: context.decision_state_id,
    decision_state_version: stateVersion,
    generator_version: GENERATOR_VERSION,
    timelines,
    timestamp: now
  };
}
