'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Activity,
  Cpu,
  GitBranch,
  Compass,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  Building2,
  Sparkles,
  Calculator,
  LineChart,
  ShieldAlert,
  ArrowRight,
  Clock,
  ExternalLink,
  HelpCircle,
  Database,
  Target,
  FileCheck
} from 'lucide-react';
import { useDecisionState } from '@/context/DecisionStateContext';
import { scenarioInScopeId } from '@/packages/contracts/src/scenario-scope';
import { resolveScenario, isScenarioRegistered } from '@/lib/scenario-client-registry';
import { getMethodsRegister, getLivingEvidence } from '@/lib/observability-client';
import type { LivingEvidenceScenarioData } from '@/lib/observability-client';
import {
  type MethodsRegister,
  type MethodRegisterEntry,
  type MethodMechanism
} from '@/packages/contracts/src/living-evidence-contracts';
import {
  scenarioBaseDemandUnits,
  scenarioExpectedDemandUnits,
  scenarioServableDemandUnits,
  scenarioExposedDemandUnits,
  scenarioFlexCapacityUnits,
  type CanonicalScenario
} from '@/packages/contracts/src/canonical-scenario-model';
import { scenarioElasticityCurve } from '@/lib/campaign-archetypes';
import {
  STORYBOARD_GATE,
  STORYBOARD_GATES_MET,
  STORYBOARD_GATE_TOTAL,
  STORYBOARD_DISPOSITION,
  STORYBOARD_RETIREMENT_PERMITTED
} from '@/config/atlas-storyboard-gate';
import ArchitectureExplorer from '@/components/ArchitectureExplorer';

export {
  STORYBOARD_GATE,
  STORYBOARD_GATES_MET,
  STORYBOARD_GATE_TOTAL,
  STORYBOARD_DISPOSITION,
  STORYBOARD_RETIREMENT_PERMITTED
};

export type ArchMechanismType = 'calculated' | 'fitted' | 'drafted' | 'rule' | 'human';

export interface DynamicScenarioContext {
  scenario: CanonicalScenario;
  methodsRegister: MethodsRegister | null;
  livingEvidence: LivingEvidenceScenarioData | null;
  baseDemand: number;
  expectedDemand: number;
  servableDemand: number;
  exposedGap: number;
  flexCapacity: number;
  gapPct: string;
  recommendedDepth: number;
  committedDepth: number;
}

export interface ArchNode {
  id: string;
  name: string;
  shortLabel: string;
  mechanism: ArchMechanismType;
  methodRefId?: string;
  governingAuthority?: string;
  summary: string;
  whatItIs: string;
  resolveScenarioRole: (
    scenario: any,
    methodsRegister: MethodsRegister | null,
    context?: DynamicScenarioContext | null
  ) => {
    action: string;
    details: string;
    quantities?: { label: string; value: string }[];
  };
}

export interface ArchLayer {
  number: number;
  id: string;
  title: string;
  subtitle: string;
  primaryMechanism: ArchMechanismType;
  mechanismLabel: string;
  summary: string;
  nodes: ArchNode[];
}

// ── Helper to resolve dynamic metrics cleanly from scenario and live context ───
function resolveMetrics(scenario: any, context?: DynamicScenarioContext | null) {
  const baseDemand = context?.baseDemand ?? (scenario ? scenarioBaseDemandUnits(scenario) : 0);
  const expectedDemand = context?.expectedDemand ?? (scenario ? Math.round(scenarioExpectedDemandUnits(scenario)) : 0);
  const servableDemand = context?.servableDemand ?? (scenario ? Math.round(scenarioServableDemandUnits(scenario)) : 0);
  const exposedGap = context?.exposedGap ?? (scenario ? Math.round(scenarioExposedDemandUnits(scenario)) : 0);
  const flexCapacity = context?.flexCapacity ?? (scenario ? Math.round(scenarioFlexCapacityUnits(scenario)) : 0);
  const gapPct = context?.gapPct ?? (baseDemand > 0 ? ((exposedGap / baseDemand) * 100).toFixed(1) : '0.0');

  let recommendedDepth = context?.recommendedDepth;
  const committedDepth = context?.committedDepth ?? scenario?.economics?.promotion_depth_pct ?? 0;
  if (recommendedDepth === undefined && scenario) {
    try {
      const curve = scenarioElasticityCurve(scenario);
      const rec = curve.find(p => p.is_cognix_recommended) ?? curve[0];
      recommendedDepth = rec ? rec.discount_pct : committedDepth;
    } catch {
      recommendedDepth = committedDepth;
    }
  }

  return {
    baseDemand,
    expectedDemand,
    servableDemand,
    exposedGap,
    flexCapacity,
    gapPct,
    recommendedDepth: recommendedDepth ?? committedDepth,
    committedDepth
  };
}

export const ARCH_LAYERS: ArchLayer[] = [
  {
    number: 1,
    id: 'layer-evidence',
    title: 'Business & External Evidence',
    subtitle: 'Point-of-sale transactions, supplier terms, and operational trading calendar',
    primaryMechanism: 'calculated',
    mechanismLabel: 'Measured & Declared Facts',
    summary: 'The empirical foundation of CogniX: real point-of-sale history, contractual supplier terms, and scenario operating calendars.',
    nodes: [
      {
        id: 'evidence-demand-history',
        name: 'Seeded Demand History',
        shortLabel: 'Sales History',
        mechanism: 'calculated',
        methodRefId: 'data::seeded-demand-history',
        governingAuthority: 'lib/forecast/series.ts',
        summary: 'Daily point-of-sale store demand series providing the empirical basis for time-series models.',
        whatItIs: 'Historical transaction records across store clusters and SKUs. Provides the ground truth against which statistical models fit seasonal baselines and evaluate forecast accuracy.',
        resolveScenarioRole: (scenario) => ({
          action: `Supplies daily POS transaction history for ${scenario?.identity?.sku_name ?? 'active SKU'} (${scenario?.identity?.sku_id ?? '—'})`,
          details: `Historical baseline series runs to ${scenario?.calendar?.observed_history_end_date ?? 'scenario baseline end'}, capturing past seasonal variations across ${scenario?.identity?.market_scope_label ?? 'National'} store clusters in the ${scenario?.identity?.focus_region ?? 'target market'}.`,
          quantities: [
            { label: 'Observed History End', value: scenario?.calendar?.observed_history_end_date ?? '—' },
            { label: 'Store Scope', value: scenario?.identity?.market_scope_label ?? 'National' },
            { label: 'Focus Region', value: scenario?.identity?.focus_region ?? '—' }
          ]
        })
      },
      {
        id: 'evidence-supplier-terms',
        name: 'Supplier Terms & Capacity',
        shortLabel: 'Supplier Terms',
        mechanism: 'calculated',
        methodRefId: 'engine::scenario-derivations',
        governingAuthority: 'packages/contracts/src/canonical-scenario-model.ts',
        summary: 'Contractual terms, delivery lead times, list prices, and supplier promotional funding.',
        whatItIs: 'Declared supplier agreements governing wholesale unit costs, supplier promotional funding participation, production constraints, and operational lead times.',
        resolveScenarioRole: (scenario) => ({
          action: `Enforces contractual terms with ${scenario?.supply?.supplier_name ?? 'Primary Supplier'} (${scenario?.supply?.supplier_id ?? '—'})`,
          details: `Contractual list price £${scenario?.economics?.list_price_gbp?.toFixed(2) ?? '—'}, base gross margin ${scenario?.economics?.gross_margin_rate_pct ?? '—'}%, and supplier promotional funding share of ${scenario?.economics?.supplier_promotional_funding_pct ?? 0}%.`,
          quantities: [
            { label: 'Supplier', value: scenario?.supply?.supplier_name ?? '—' },
            { label: 'List Price', value: `£${scenario?.economics?.list_price_gbp?.toFixed(2) ?? '—'}` },
            { label: 'Supplier Funding', value: `${scenario?.economics?.supplier_promotional_funding_pct ?? 0}%` }
          ]
        })
      },
      {
        id: 'evidence-operating-calendar',
        name: 'Operating Calendar & Events',
        shortLabel: 'Operating Calendar',
        mechanism: 'rule',
        methodRefId: 'engine::signal-simulator',
        governingAuthority: 'ADR-078 (Scenario Clock)',
        summary: 'Trading calendar, promotion duration, supplier cutoff schedule, and lead times.',
        whatItIs: 'Temporal operating context defining the trading horizon, promotional calendar, and external demand drivers such as regional events and weather shifts.',
        resolveScenarioRole: (scenario) => ({
          action: `Defines ${scenario?.calendar?.forecast_horizon_days ?? 14}-day promotional trading horizon`,
          details: `Anchored to the scenario clock (${scenario?.calendar?.observed_history_end_date ?? '—'}), with supplier lead time of ${scenario?.calendar?.supplier_lead_time_days ?? '—'} days and order cut-off schedule.`,
          quantities: [
            { label: 'Trading Horizon', value: `${scenario?.calendar?.forecast_horizon_days ?? 14} days` },
            { label: 'Lead Time', value: `${scenario?.calendar?.supplier_lead_time_days ?? '—'} days` },
            { label: 'Promo Duration', value: `${scenario?.calendar?.promotion_duration_days ?? '—'} days` }
          ]
        })
      }
    ]
  },
  {
    number: 2,
    id: 'layer-signals',
    title: 'Signal Intelligence',
    subtitle: 'Dynamic signal simulation, intent fusion, and evidence-stream stability',
    primaryMechanism: 'calculated',
    mechanismLabel: 'Dynamic Signal Simulation',
    summary: 'Translates raw trading observations into quantified signals, combining commercial intent with market movement and monitoring evidence stability.',
    nodes: [
      {
        id: 'signal-fusion',
        name: 'Signal / Intent Fusion',
        shortLabel: 'Intent Fusion',
        mechanism: 'rule',
        methodRefId: 'engine::living-evidence',
        governingAuthority: 'IFI-01 · lib/intent-fusion/',
        summary: 'Fuses declared commercial intent with observed operational signals into unified decision streams.',
        whatItIs: 'Binds strategic commercial targets (e.g. planned promotional uplift, volume targets) with dynamic retail signals (store footfall, supply disruptions, competitor activity) to identify deviations before stockouts occur.',
        resolveScenarioRole: (scenario) => ({
          action: `Fuses commercial volume goals with observed category demand in ${scenario?.identity?.category ?? 'category'}`,
          details: `Monitors dynamic demand signals against baseline expectations across ${scenario?.identity?.channels?.join(' and ') ?? 'sales channels'} to detect emerging demand surges or supply variances early.`,
          quantities: [
            { label: 'Category', value: scenario?.identity?.category ?? '—' },
            { label: 'Subcategory', value: scenario?.identity?.subcategory ?? '—' },
            { label: 'Channels', value: scenario?.identity?.channels?.join(', ') ?? 'All Channels' }
          ]
        })
      },
      {
        id: 'forecast-stability',
        name: 'Forecast Stability',
        shortLabel: 'Forecast Stability',
        mechanism: 'calculated',
        governingAuthority: 'ADR-040 (Evidence-stream property, NOT an ML model confidence score)',
        summary: 'Quantified stability of incoming evidence streams over time — not an artificial model confidence score.',
        whatItIs: 'ADR-040 explicitly defines Forecast Stability as an inherent property of the evidence stream itself: the degree of volatility, trajectory drift, and noise in incoming observations over the decision horizon. It is never a model accuracy metric or confidence percentage.',
        resolveScenarioRole: (scenario, _methods, ctx) => {
          const stab = ctx?.livingEvidence?.decision_position?.quantities?.find(q => q.quantity === 'FORECAST_STABILITY')?.after;
          return {
            action: `Tracks evidence-stream trajectory stability for ${scenario?.identity?.sku_name ?? 'active SKU'}`,
            details: `Evaluates signal trajectory consistency across consecutive trading days per ADR-040. An inherent property of the evidence stream itself, not an ML model confidence score.`,
            quantities: [
              { label: 'Construct Authority', value: 'ADR-040 (Evidence Property)' },
              { label: 'Stability Index', value: stab ? `${stab} / 100` : 'Evidence Evaluated' }
            ]
          };
        }
      },
      {
        id: 'signal-materiality',
        name: 'Materiality & Freshness',
        shortLabel: 'Materiality & Freshness',
        mechanism: 'rule',
        methodRefId: 'engine::living-evidence',
        governingAuthority: 'ADR-078 · ADR-081',
        summary: 'Bands signal movement into materiality tiers (DECISIVE, MATERIAL, INFORMATIVE, BACKGROUND).',
        whatItIs: 'Determines whether an observed delta alters published retail economics or changes the recommended decision. Evaluated on the scenario clock without wall-clock temporal drift.',
        resolveScenarioRole: (_scenario, _methods, ctx) => {
          const count = ctx?.livingEvidence?.observations?.length;
          return {
            action: `Classifies incoming signal movement into governed materiality tiers`,
            details: `Applies leave-one-out impact assessment per ADR-081 on the scenario clock without wall-clock temporal drift, ensuring only decision-relevant deltas reach commercial leaders.`,
            quantities: [
              { label: 'Materiality Tiers', value: 'Decisive · Material · Informative' },
              { label: 'Assessed Signals', value: count ? `${count} signals active` : 'Active stream' }
            ]
          };
        }
      }
    ]
  },
  {
    number: 3,
    id: 'layer-methods',
    title: 'Intelligence Methods',
    subtitle: 'Truthfully distinguished computational mechanisms — no calling all intelligence "AI"',
    primaryMechanism: 'rule',
    mechanismLabel: 'Multi-Method Composition',
    summary: 'CogniX combines deterministic mathematics, statistical ML, strictly bounded GenAI, and business rules, clearly separating their roles.',
    nodes: [
      {
        id: 'method-deterministic',
        name: 'Deterministic Calculation',
        shortLabel: 'Deterministic Engine',
        mechanism: 'rule',
        methodRefId: 'engine::scenario-derivations',
        governingAuthority: 'packages/contracts/src/canonical-scenario-model.ts',
        summary: 'Exact business arithmetic: revenues, margins, exposures, and volumetric balances.',
        whatItIs: 'Precise financial and inventory mathematics. Calculates exposure, expected and servable quantities, and unit margins directly from declared scenario formulas without synthetic extrapolation.',
        resolveScenarioRole: (scenario, _methods, ctx) => {
          const { baseDemand, expectedDemand } = resolveMetrics(scenario, ctx);
          const movement = scenario?.demand?.total_demand_movement_pct ?? 0;
          return {
            action: `Calculates exact commercial quantities for ${scenario?.identity?.sku_name ?? 'active SKU'}`,
            details: `Computes base demand (${baseDemand.toLocaleString()} units), expected demand (${expectedDemand.toLocaleString()} units), and unit margin revenues directly from declared scenario formulas.`,
            quantities: [
              { label: 'Calculation Basis', value: 'Deterministic Formulas' },
              { label: 'Base Horizon Units', value: `${baseDemand.toLocaleString()} units` },
              { label: 'Movement Rate', value: `+${movement.toFixed(1)}%` }
            ]
          };
        }
      },
      {
        id: 'method-statistical',
        name: 'Statistical Forecasting / ML',
        shortLabel: 'Statistical ML',
        mechanism: 'fitted',
        methodRefId: 'forecast::HOLT_WINTERS_ADDITIVE',
        governingAuthority: 'ADR-071 · ADR-072 · lib/forecast/registry.ts',
        summary: 'Time-series forecasting (Holt-Winters additive, seasonal naive) with published error intervals.',
        whatItIs: 'Rigorous statistical estimation algorithms fitted to historical POS data. Publishes daily demand trajectories alongside calibrated prediction intervals, rather than single-point guesses.',
        resolveScenarioRole: (scenario) => ({
          action: `Fits time-series demand models over historical transaction data`,
          details: `Executes Holt-Winters additive time-series forecasting (forecast::HOLT_WINTERS_ADDITIVE) over daily POS series across the ${scenario?.calendar?.forecast_horizon_days ?? 14}-day projection horizon with calibrated error intervals.`,
          quantities: [
            { label: 'Active Model', value: 'Holt-Winters Additive' },
            { label: 'Projection Horizon', value: `${scenario?.calendar?.forecast_horizon_days ?? 14} days` }
          ]
        })
      },
      {
        id: 'method-genai',
        name: 'Google GenAI Interpretation',
        shortLabel: 'GenAI Context Drafting',
        mechanism: 'drafted',
        methodRefId: 'genai::decision-context-draft',
        governingAuthority: 'ADR-044 · ADR-067 (Strictly non-authoritative)',
        summary: 'Server-side Gemini drafting of qualitative context — never the source of business economics or demand figures.',
        whatItIs: 'Governed LLM integration used exclusively for qualitative narrative drafting, intent summarization, and human-readable scenario context. Governed by ADR-044 & ADR-067: strictly non-authoritative interpretation and context drafting; GenAI never calculates quantities, economics, or discount rates.',
        resolveScenarioRole: () => ({
          action: `Drafts non-authoritative commercial context for category leaders`,
          details: `Server-side Gemini qualitative synthesis governed by ADR-044 & ADR-067: strictly non-authoritative interpretation and context drafting; GenAI never calculates economic figures, demand quantities, or discount depths.`,
          quantities: [
            { label: 'Authority', value: 'Non-authoritative (ADR-044)' },
            { label: 'Financial Influence', value: '0 (No economic calculations)' }
          ]
        })
      },
      {
        id: 'method-certification',
        name: 'Rules & Certification Gate',
        shortLabel: 'Certification Gate',
        mechanism: 'rule',
        methodRefId: 'engine::certification-gate',
        governingAuthority: 'ADR-080 · lib/scenario-certification.ts',
        summary: 'Twelve-dimension validation gate refusing uncertified scenarios from becoming demo-active.',
        whatItIs: 'Enforces internal coherence across identity, calendar, economics, price elasticity, currency, and provenance before any scenario can be activated in the demo journey.',
        resolveScenarioRole: (scenario) => ({
          action: `Validates 12/12 certification dimensions for ${scenario?.identity?.scenario_id ?? 'active scenario'}`,
          details: `Verifies internal reconciliation across identity, calendar, economics, price elasticity, currency, and provenance under ADR-080 before activating into demo journey.`,
          quantities: [
            { label: 'Certification Dimensions', value: '12 / 12 Evaluated' },
            { label: 'Admission Status', value: 'Certified & Admitted' }
          ]
        })
      }
    ]
  },
  {
    number: 4,
    id: 'layer-decision-intelligence',
    title: 'Decision Intelligence',
    subtitle: 'Quantified Decision Gap, operational Decision Window, and comparative Decision Regret',
    primaryMechanism: 'rule',
    mechanismLabel: 'Governed Decision Dynamics',
    summary: 'The core value engine of CogniX: quantifying executable capacity, operational deadlines, and trade-offs across competing commercial goals.',
    nodes: [
      {
        id: 'decision-gap',
        name: 'Decision Gap',
        shortLabel: 'Decision Gap',
        mechanism: 'rule',
        governingAuthority: 'ADR-041 · packages/contracts/src/canonical-scenario-model.ts',
        summary: 'Demand opportunity minus executable capacity, derived from deterministic engines.',
        whatItIs: 'ADR-041 defines Decision Gap as the explicit difference between unconstrained market demand and servable retail capacity. It represents the unserved revenue or inventory exposure that requires commercial intervention.',
        resolveScenarioRole: (scenario, _methods, ctx) => {
          const { expectedDemand, servableDemand, exposedGap, gapPct } = resolveMetrics(scenario, ctx);
          return {
            action: `Quantifies exposed unservable demand under promotional surge`,
            details: `Identified ${exposedGap.toLocaleString()} exposed units (${gapPct}% of expected demand) between expected demand (${expectedDemand.toLocaleString()} units) and executable allocation (${servableDemand.toLocaleString()} units).`,
            quantities: [
              { label: 'Expected Demand', value: `${expectedDemand.toLocaleString()} units` },
              { label: 'Servable Allocation', value: `${servableDemand.toLocaleString()} units` },
              { label: 'Exposed Decision Gap', value: `${exposedGap.toLocaleString()} units (${gapPct}%)` }
            ]
          };
        }
      },
      {
        id: 'decision-window',
        name: 'Decision Window',
        shortLabel: 'Decision Window',
        mechanism: 'rule',
        governingAuthority: 'ADR-042 (Operational constraint, NOT an AI prediction or decay curve)',
        summary: 'Operational deadline constraint derived from supplier lead times and warehouse cutoffs.',
        whatItIs: 'ADR-042 explicitly rules that the Decision Window is a hard operational constraint, not an artificial algorithmic confidence decay curve. It is calculated directly from supplier production lead times, logistics scheduling, and store replenishment cutoffs.',
        resolveScenarioRole: (scenario, _methods, ctx) => {
          const winHours = ctx?.livingEvidence?.decision_position?.quantities?.find(q => q.quantity === 'DECISION_WINDOW_HOURS')?.after;
          const winState = ctx?.livingEvidence?.decision_position?.decision_window;
          return {
            action: `Enforces operational cutoff constraint with ${scenario?.supply?.supplier_name ?? 'supplier'}`,
            details: `Hard operational deadline constraint (ADR-042) derived from supplier lead time (${scenario?.calendar?.supplier_lead_time_days ?? '—'} days) and contractual cut-off schedule, before supplier production locks and transport cannot be flexed.`,
            quantities: [
              { label: 'Supplier Lead Time', value: `${scenario?.calendar?.supplier_lead_time_days ?? '—'} days` },
              { label: 'Window Status', value: winState ? `${winState} (${winHours ?? '—'} hrs)` : 'Operational Constraint' }
            ]
          };
        }
      },
      {
        id: 'decision-regret',
        name: 'Decision Regret',
        shortLabel: 'Decision Regret',
        mechanism: 'rule',
        governingAuthority: 'ADR-043 · packages/contracts/src/canonical-scenario-model.ts',
        summary: 'Comparative expected value between taking action versus doing nothing.',
        whatItIs: 'ADR-043 defines Decision Regret as the comparative loss incurred by pursuing a suboptimal intervention (or doing nothing) versus committing to the optimal recommendation, evaluated over margin, revenue, and waste.',
        resolveScenarioRole: (scenario, _methods, ctx) => {
          const marginExp = ctx?.livingEvidence?.decision_position?.quantities?.find(q => q.quantity === 'MARGIN_EXPOSURE_GBP')?.after;
          const revExp = ctx?.livingEvidence?.decision_position?.quantities?.find(q => q.quantity === 'REVENUE_EXPOSURE_GBP')?.after;
          return {
            action: `Calculates commercial penalty of non-intervention for ${scenario?.identity?.sku_name ?? 'active SKU'}`,
            details: `Quantifies comparative expected loss under ADR-043 across margin, unserved demand, and customer loyalty if the Decision Gap is left unaddressed versus committing to the recommended intervention.`,
            quantities: [
              { label: 'Evaluation Basis', value: 'Do Nothing vs Governed Intervention' },
              { label: 'Margin at Risk', value: marginExp ? `£${Number(marginExp).toLocaleString()}` : 'Calculated by Rule' },
              { label: 'Revenue at Risk', value: revExp ? `£${Number(revExp).toLocaleString()}` : 'Calculated by Rule' }
            ]
          };
        }
      },
      {
        id: 'multi-objective-frontier',
        name: 'Multi-Objective Trade-offs',
        shortLabel: 'Pareto Trade-offs',
        mechanism: 'rule',
        governingAuthority: 'CDI-06 · packages/contracts/src/canonical-scenario-model.ts',
        summary: 'Balances competing commercial dimensions: Revenue, Contribution Margin, Waste, and Availability.',
        whatItIs: 'Calculates the optimal trade-off frontier across the four primary retail pillars (the historical Value Framework). Allows category leaders to see the exact trade-off between volume lift and margin dilution.',
        resolveScenarioRole: (scenario) => ({
          action: `Evaluates Pareto frontier across Revenue, Margin, Waste, and Store Availability`,
          details: `Balances commercial volume lift against waste risk (${scenario?.economics?.waste_units_per_week?.toLocaleString() ?? '—'} base waste units/wk) and cannibalisation (${scenario?.economics?.cannibalisation_rate_pct ?? 0}%).`,
          quantities: [
            { label: 'Four Pillars', value: 'Revenue · Margin · Waste · Availability' },
            { label: 'Cannibalisation Rate', value: `${scenario?.economics?.cannibalisation_rate_pct ?? 0}%` }
          ]
        })
      }
    ]
  },
  {
    number: 5,
    id: 'layer-decisions',
    title: 'Retail Decisions',
    subtitle: 'Derived commercial recommendations and downstream operational consequence mapping',
    primaryMechanism: 'rule',
    mechanismLabel: 'Actionable Interventions',
    summary: 'Outputs actionable commercial recommendations and traces their operational consequences across the supply chain.',
    nodes: [
      {
        id: 'retail-promo-recommendation',
        name: 'Promotion Depth Recommendation',
        shortLabel: 'Depth Recommendation',
        mechanism: 'rule',
        methodRefId: 'engine::promotion-curve',
        governingAuthority: 'ADR-075 · lib/campaign-archetypes.ts',
        summary: 'Calculates derived promotion recommendation maximising contribution on the price elasticity curve.',
        whatItIs: 'Evaluates promotional elasticity curves across depth tiers with supplier funding participation, selecting the exact depth tier that maximises net contribution.',
        resolveScenarioRole: (scenario, _methods, ctx) => {
          const { recommendedDepth, committedDepth } = resolveMetrics(scenario, ctx);
          const isDoNotPromote = recommendedDepth === 0;
          return {
            action: `Derived promotion recommendation: ${recommendedDepth}% discount (Challenging committed ${committedDepth}%)`,
            details: `Evaluates price elasticity curve (${scenario?.economics?.promotional_response_pp_per_depth_point ?? 0} pp/depth pt) and supplier funding (${scenario?.economics?.supplier_promotional_funding_pct ?? 0}%). CogniX derives ${recommendedDepth}% depth (${isDoNotPromote ? 'do not promote' : `${recommendedDepth}% promotional discount`}) against the committed ${committedDepth}% plan.`,
            quantities: [
              { label: 'Derived Recommendation', value: `${recommendedDepth}% ${isDoNotPromote ? '(Do not promote)' : 'Discount'}` },
              { label: 'Committed Plan', value: `${committedDepth}% Discount` }
            ]
          };
        }
      },
      {
        id: 'retail-volume-allocation',
        name: 'Servable Volume Allocation',
        shortLabel: 'Volume Allocation',
        mechanism: 'rule',
        methodRefId: 'engine::scenario-derivations',
        governingAuthority: 'packages/contracts/src/canonical-scenario-model.ts',
        summary: 'Allocates available inventory and supplier production to regional depots and stores.',
        whatItIs: 'Calculates recoverable volume and allocates available stock to distribution depots, prioritizing high-velocity stores and mitigating stockout risks.',
        resolveScenarioRole: (scenario, _methods, ctx) => {
          const { servableDemand, flexCapacity } = resolveMetrics(scenario, ctx);
          const clause = scenario?.supply?.flex_clause_reference ?? 'Volume Flex Notice';
          return {
            action: `Allocates servable volume and contractual flex capacity`,
            details: `Standing allocation covers ${servableDemand.toLocaleString()} units (capacity index ${scenario?.supply?.supplier_capacity_index?.toFixed(2) ?? '1.0'}). Contractual flex clause "${clause}" can release up to ${flexCapacity.toLocaleString()} additional units.`,
            quantities: [
              { label: 'Standing Allocation', value: `${servableDemand.toLocaleString()} units` },
              { label: 'Contractual Flex', value: `Up to ${flexCapacity.toLocaleString()} units (${scenario?.supply?.supplier_flex_rate_pct ?? 0}%)` }
            ]
          };
        }
      },
      {
        id: 'retail-decision-ripple',
        name: 'Decision Ripple',
        shortLabel: 'Decision Ripple',
        mechanism: 'rule',
        governingAuthority: 'WP5 · components/DecisionRippleIntelligence.tsx',
        summary: 'Downstream operational impacts mapped across distribution, logistics, and stores.',
        whatItIs: 'Projects the operational ripple effects of a commercial decision: warehouse picking strain, pallet handling, transport truck scheduling, store restocking hours, and supplier packaging call-offs.',
        resolveScenarioRole: (scenario) => {
          const stores = scenario?.estate?.national_store_count ?? scenario?.estate?.core_superstore_count ?? 620;
          return {
            action: `Maps downstream operational consequences across logistics and stores`,
            details: `Anticipates warehouse throughput strain, logistics transport scheduling, and store replenishment workload across ${stores.toLocaleString()} stores in ${scenario?.identity?.market_scope_label ?? 'market'}.`,
            quantities: [
              { label: 'Construct Authority', value: 'WP5 (Decision Ripple)' },
              { label: 'Store Scope', value: `${stores.toLocaleString()} stores` }
            ]
          };
        }
      }
    ]
  },
  {
    number: 6,
    id: 'layer-human',
    title: 'Human Decision',
    subtitle: 'Commercial leadership accountability, parameter tuning, and formal commitment',
    primaryMechanism: 'human',
    mechanismLabel: 'Human Domain Judgement',
    summary: 'CogniX never automates commercial accountability. Category directors review recommendations, apply commercial judgement, and sign off.',
    nodes: [
      {
        id: 'human-review-override',
        name: 'Commercial Leadership Review',
        shortLabel: 'Leadership Review',
        mechanism: 'human',
        methodRefId: 'human::decision-commitment',
        governingAuthority: 'Principle 13 (Human accountability)',
        summary: 'Category Lead reviews evidence, evaluates trade-offs, and adjusts operational levers.',
        whatItIs: 'Retail leaders review the derived recommendation, inspect the Decision Trace, and apply commercial intuition, strategic supplier relationship context, or market nuance before approving.',
        resolveScenarioRole: (scenario, _methods, ctx) => {
          const { recommendedDepth } = resolveMetrics(scenario, ctx);
          return {
            action: `Commercial leadership reviews derived ${recommendedDepth}% recommendation for ${scenario?.identity?.sku_name ?? 'active SKU'}`,
            details: `Commercial leaders evaluate derived recommendation against supplier context and retain full authority to accept, adjust, or decline the intervention per Principle 13.`,
            quantities: [
              { label: 'Governance Role', value: 'Category Director / Commercial Lead' },
              { label: 'Accountability', value: 'Human Judgement Enforced (Principle 13)' }
            ]
          };
        }
      },
      {
        id: 'human-decision-contract',
        name: 'Decision Contract Commitment',
        shortLabel: 'Decision Contract',
        mechanism: 'human',
        methodRefId: 'human::decision-commitment',
        governingAuthority: 'lib/decision-contract-store.ts',
        summary: 'Formally records the decision commitment in Shared Decision State with rationale and audit trail.',
        whatItIs: 'Binds the committed action into an immutable Decision Contract stored in Shared Decision State. Records who decided, on what evidence, at what time, and with what projected outcomes.',
        resolveScenarioRole: (scenario) => ({
          action: `Publishes immutable Decision Contract for ${scenario?.identity?.scenario_id ?? 'active scenario'}`,
          details: `Locks agreed commercial terms into Shared Decision State with complete evidence audit trail before downstream ERP and replenishment dispatch.`,
          quantities: [
            { label: 'Storage Target', value: 'Shared Decision State' },
            { label: 'Audit Trail', value: 'Attributed & Timestamped' }
          ]
        })
      }
    ]
  },
  {
    number: 7,
    id: 'layer-learning',
    title: 'Outcomes & Learning',
    subtitle: 'Tracking actual trading performance against commitment to improve future decision priors',
    primaryMechanism: 'calculated',
    mechanismLabel: 'Enterprise Memory & Feedback',
    summary: 'Closes the loop by measuring realised trading against commitments, feeding institutional knowledge into Enterprise Memory.',
    nodes: [
      {
        id: 'outcomes-variance-tracking',
        name: 'Realised vs Commitment Variance',
        shortLabel: 'Trading Variance',
        mechanism: 'calculated',
        governingAuthority: 'components/EnterpriseMemory.tsx',
        summary: 'Compares actual sales, realised revenue, waste, and availability against the committed baseline.',
        whatItIs: 'Tracks real POS sell-through during and after the promotion horizon. Isolates whether deviations were caused by forecast error, supplier delivery failure, or competitor pricing.',
        resolveScenarioRole: (scenario) => ({
          action: `Audits realised performance against plan for ${scenario?.identity?.sku_name ?? 'active SKU'}`,
          details: `Measures sell-through, realised revenue, availability, and waste against the committed baseline post-event to verify forecast and delivery execution.`,
          quantities: [
            { label: 'Performance Audit', value: 'Actual vs Committed Baseline' },
            { label: 'Variance Dimensions', value: 'Units · Margin · Waste · Availability' }
          ]
        })
      },
      {
        id: 'outcomes-enterprise-memory',
        name: 'Enterprise Memory & Learning Patterns',
        shortLabel: 'Enterprise Memory',
        mechanism: 'rule',
        governingAuthority: 'EXP-MEMORY-03 · packages/contracts/src/learning-pattern-model.ts',
        summary: 'Indexes observed causal relationships into reusable learning patterns (PAT-*).',
        whatItIs: 'Distills verified commercial outcomes into institutional patterns (e.g. PAT-COMM-01 promotional elasticity response). Enables future decisions in similar categories to inherit proven empirical priors.',
        resolveScenarioRole: (scenario) => ({
          action: `Distills observed causal learnings into Enterprise Memory`,
          details: `Captures supplier flex responsiveness and promotional response for ${scenario?.identity?.category ?? 'category'} as reusable institutional learning patterns (PAT-*).`,
          quantities: [
            { label: 'Pattern Registry', value: 'EXP-MEMORY-03 (Learning Patterns)' },
            { label: 'Knowledge Domain', value: `${scenario?.identity?.category ?? 'Category'} Intelligence` }
          ]
        })
      }
    ]
  }
];

export default function CognixArchitectureSurface() {
  const { decisionState } = useDecisionState();
  const [activeScenarioId, setActiveScenarioId] = useState<string>(() => {
    return decisionState?.scenario_id ?? scenarioInScopeId();
  });

  const [methodsRegister, setMethodsRegister] = useState<MethodsRegister | null>(null);
  const [livingEvidence, setLivingEvidence] = useState<LivingEvidenceScenarioData | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('decision-gap');
  const [showGateDetails, setShowGateDetails] = useState(false);
  const [showRetainedStoryboard, setShowRetainedStoryboard] = useState(false);

  // Sync active scenario if decision state moves
  useEffect(() => {
    const currentId = decisionState?.scenario_id ?? scenarioInScopeId();
    setActiveScenarioId(currentId);
  }, [decisionState?.scenario_id]);

  // Load Models & Methods register and Living Evidence for the active scenario
  useEffect(() => {
    let isMounted = true;
    setLoadingContext(true);

    Promise.all([
      getMethodsRegister(activeScenarioId).catch(() => null),
      getLivingEvidence(activeScenarioId).catch(() => null)
    ]).then(([methods, evidence]) => {
      if (!isMounted) return;
      setMethodsRegister(methods);
      setLivingEvidence(evidence);
    }).finally(() => {
      if (isMounted) setLoadingContext(false);
    });

    return () => {
      isMounted = false;
    };
  }, [activeScenarioId]);

  // Resolve active Canonical Scenario
  const scenario = useMemo(() => {
    try {
      if (activeScenarioId && isScenarioRegistered(activeScenarioId)) {
        return resolveScenario(activeScenarioId);
      }
      return resolveScenario(scenarioInScopeId());
    } catch {
      return null;
    }
  }, [activeScenarioId]);

  // Build mechanically grounded dynamic context
  const dynamicContext = useMemo((): DynamicScenarioContext | null => {
    if (!scenario) return null;
    const baseDemand = scenarioBaseDemandUnits(scenario);
    const expectedDemand = Math.round(scenarioExpectedDemandUnits(scenario));
    const servableDemand = Math.round(scenarioServableDemandUnits(scenario));
    const exposedGap = Math.round(scenarioExposedDemandUnits(scenario));
    const flexCapacity = Math.round(scenarioFlexCapacityUnits(scenario));
    const gapPct = baseDemand > 0 ? ((exposedGap / baseDemand) * 100).toFixed(1) : '0.0';

    let recommendedDepth = 0;
    const committedDepth = scenario.economics.promotion_depth_pct;
    try {
      const curve = scenarioElasticityCurve(scenario);
      const rec = curve.find(p => p.is_cognix_recommended) ?? curve[0];
      recommendedDepth = rec ? rec.discount_pct : committedDepth;
    } catch {
      recommendedDepth = committedDepth;
    }

    return {
      scenario,
      methodsRegister,
      livingEvidence,
      baseDemand,
      expectedDemand,
      servableDemand,
      exposedGap,
      flexCapacity,
      gapPct,
      recommendedDepth,
      committedDepth
    };
  }, [scenario, methodsRegister, livingEvidence]);

  // Find currently selected node
  const selectedNode = useMemo(() => {
    for (const layer of ARCH_LAYERS) {
      const found = layer.nodes.find((n) => n.id === selectedNodeId);
      if (found) return { node: found, layer };
    }
    return { node: ARCH_LAYERS[3].nodes[0], layer: ARCH_LAYERS[3] }; // Default to Decision Gap
  }, [selectedNodeId]);

  // Find method register entry for selected node
  const matchedMethod: MethodRegisterEntry | undefined = useMemo(() => {
    if (!methodsRegister || !selectedNode.node.methodRefId) return undefined;
    return methodsRegister.entries.find((e) => e.method_id === selectedNode.node.methodRefId);
  }, [methodsRegister, selectedNode]);

  const nodeScenarioContext = useMemo(() => {
    return selectedNode.node.resolveScenarioRole(scenario, methodsRegister, dynamicContext);
  }, [selectedNode, scenario, methodsRegister, dynamicContext]);

  function getMechanismBadgeClass(mech: ArchMechanismType): string {
    switch (mech) {
      case 'calculated': return 'og-arch-badge--calculated';
      case 'fitted':     return 'og-arch-badge--fitted';
      case 'drafted':    return 'og-arch-badge--drafted';
      case 'rule':       return 'og-arch-badge--rule';
      case 'human':      return 'og-arch-badge--human';
    }
  }

  function getMechanismTitle(mech: ArchMechanismType): string {
    switch (mech) {
      case 'calculated': return 'Calculated (deterministic / measured)';
      case 'fitted':     return 'Fitted (statistical ML)';
      case 'drafted':    return 'Drafted (GenAI interpretation)';
      case 'rule':       return 'Business rule / constraint';
      case 'human':      return 'Human judgement';
    }
  }

  function getLayerIcon(id: string) {
    switch (id) {
      case 'layer-evidence':             return <Database size={16} />;
      case 'layer-signals':              return <Activity size={16} />;
      case 'layer-methods':              return <Cpu size={16} />;
      case 'layer-decision-intelligence':return <Target size={16} />;
      case 'layer-decisions':            return <GitBranch size={16} />;
      case 'layer-human':                return <UserCheck size={16} />;
      case 'layer-learning':             return <LineChart size={16} />;
      default:                           return <Layers size={16} />;
    }
  }

  return (
    <div className="og-arch-surface">
      {/* ── Surface Header: 60-90 Second Narrative & Scenario Context ─────── */}
      <header className="og-arch-header">
        <div className="og-arch-header-main">
          <div className="og-arch-tagline">
            <Compass size={14} className="text-primary" />
            <span>CogniX Architecture &middot; Truthful System Topology</span>
          </div>
          <h2 className="og-arch-title">How CogniX Connects Signals to Retail Decisions</h2>
          <p className="og-arch-lead">
            CogniX is not an opaque predictive model. It is an end-to-end Decision Intelligence architecture that
            transforms empirical trading evidence into governed, actionable retail decisions through deterministic arithmetic,
            statistical machine learning, non-authoritative AI drafting, and explicit human accountability.
          </p>
        </div>

        {/* Active Scenario Indicator Card */}
        <div className="og-arch-scenario-card">
          <div className="og-arch-scenario-badge">
            <span className="og-arch-live-dot" /> Active Scenario Context
          </div>
          <div className="og-arch-scenario-name">
            {scenario?.identity?.scenario_name ?? 'Active Certified Scenario'}
          </div>
          <div className="og-arch-scenario-meta">
            <span><strong>SKU:</strong> {scenario?.identity?.sku_name ?? '—'}</span>
            <span>&bull;</span>
            <span><strong>Supplier:</strong> {scenario?.supply?.supplier_name ?? '—'}</span>
            <span>&bull;</span>
            <span><strong>Clock:</strong> {scenario?.calendar?.observed_history_end_date ?? '—'}</span>
          </div>

          <div className="og-arch-scenario-select-row">
            <label htmlFor="arch-scenario-selector" className="og-arch-select-label">
              Switch Scenario:
            </label>
            <select
              id="arch-scenario-selector"
              className="og-arch-select"
              value={activeScenarioId}
              onChange={(e) => setActiveScenarioId(e.target.value)}
            >
              <option value="SCN-FRESH-DAIRY-CHEDDAR-001">Fresh Dairy &middot; Cheshire Cheese Co</option>
              <option value="SCN-CHILLED-SALMON-002">Chilled Fish &middot; Foodvest Fish</option>
              <option value="SCN-BAKERY-SOURDOUGH-003">Premium Bakery &middot; Allied Bakeries</option>
            </select>
          </div>
        </div>
      </header>

      {/* ── 60-90s Executive Elevator Pitch Bar ────────────────────────────── */}
      <div className="og-arch-elevator-bar">
        <span className="og-arch-elevator-tag">Executive Summary:</span>
        <div className="og-arch-elevator-steps">
          <span className="og-arch-step"><strong>1. Evidence</strong> Point-of-Sale &amp; Terms</span>
          <span className="og-arch-arrow">&rarr;</span>
          <span className="og-arch-step"><strong>2. Signals</strong> Fusion &amp; Stability</span>
          <span className="og-arch-arrow">&rarr;</span>
          <span className="og-arch-step"><strong>3. Methods</strong> Math, ML &amp; GenAI</span>
          <span className="og-arch-arrow">&rarr;</span>
          <span className="og-arch-step"><strong>4. Decision Intelligence</strong> Gap &amp; Window</span>
          <span className="og-arch-arrow">&rarr;</span>
          <span className="og-arch-step"><strong>5. Action</strong> Derived Recommendation</span>
          <span className="og-arch-arrow">&rarr;</span>
          <span className="og-arch-step"><strong>6. Commitment</strong> Human Sign-Off</span>
          <span className="og-arch-arrow">&rarr;</span>
          <span className="og-arch-step"><strong>7. Memory</strong> Trading Variance</span>
        </div>
      </div>

      {/* ── Main Workspace: 7-Layer Flow + Governed Inspect Panel ──────────── */}
      <div className="og-arch-workspace">
        {/* The 7 Sequential Layers Flow */}
        <main className="og-arch-flow" aria-label="7 Governed Architecture Layers">
          {ARCH_LAYERS.map((layer) => {
            const hasSelectedNode = layer.nodes.some((n) => n.id === selectedNodeId);
            return (
              <section
                key={layer.id}
                id={layer.id}
                className={`og-arch-layer ${hasSelectedNode ? 'is-active-layer' : ''}`}
                aria-labelledby={`heading-${layer.id}`}
              >
                <div className="og-arch-layer-head">
                  <div className="og-arch-layer-num">
                    {layer.number}
                  </div>
                  <div className="og-arch-layer-info">
                    <div className="og-arch-layer-title-row">
                      <div className="og-arch-layer-icon">{getLayerIcon(layer.id)}</div>
                      <h3 id={`heading-${layer.id}`} className="og-arch-layer-title">
                        {layer.title}
                      </h3>
                      <span className={`og-arch-badge ${getMechanismBadgeClass(layer.primaryMechanism)}`}>
                        {layer.mechanismLabel}
                      </span>
                    </div>
                    <p className="og-arch-layer-subtitle">{layer.subtitle}</p>
                  </div>
                </div>

                {/* Layer Nodes Grid */}
                <div className="og-arch-nodes-grid">
                  {layer.nodes.map((node) => {
                    const isSelected = node.id === selectedNodeId;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        id={`arch-node-${node.id}`}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`og-arch-node ${isSelected ? 'is-selected' : ''}`}
                        aria-pressed={isSelected}
                        title={`Inspect ${node.name}`}
                      >
                        <div className="og-arch-node-top">
                          <span className={`og-arch-badge ${getMechanismBadgeClass(node.mechanism)}`}>
                            {node.mechanism}
                          </span>
                          {node.methodRefId && (
                            <span className="og-arch-method-ref" title="Mapped to real Models & Methods registry">
                              <FileCheck size={11} /> Models &amp; Methods
                            </span>
                          )}
                        </div>

                        <div className="og-arch-node-title">
                          {node.name}
                        </div>

                        <p className="og-arch-node-desc">
                          {node.summary}
                        </p>

                        <div className="og-arch-node-footer">
                          <span className="og-arch-inspect-cta">
                            {isSelected ? 'Inspecting' : 'Click to inspect'} &rarr;
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </main>

        {/* Governed Inspect Panel (Right Drawer) */}
        <aside className="og-arch-inspect-panel" aria-label="Node Inspection Details">
          <div className="og-arch-inspect-card">
            <div className="og-arch-inspect-header">
              <div className="og-arch-inspect-layer-tag">
                Layer {selectedNode.layer.number}: {selectedNode.layer.title}
              </div>
              <h4 className="og-arch-inspect-title">
                {selectedNode.node.name}
              </h4>
              <span className={`og-arch-badge ${getMechanismBadgeClass(selectedNode.node.mechanism)}`}>
                {getMechanismTitle(selectedNode.node.mechanism)}
              </span>
            </div>

            <div className="og-arch-inspect-body">
              {/* SECTION: What It Is */}
              <div className="og-arch-inspect-section">
                <h5>What It Is</h5>
                <p>{selectedNode.node.whatItIs}</p>
              </div>

              {/* SECTION: What It Did in Active Scenario */}
              <div className="og-arch-inspect-section og-arch-inspect-section--scenario">
                <h5>What It Did in Active Scenario ({scenario?.identity?.category ?? 'Current Scenario'})</h5>
                <div className="og-arch-scenario-action">
                  <strong>Action:</strong> {nodeScenarioContext.action}
                </div>
                <p className="og-arch-scenario-narrative">{nodeScenarioContext.details}</p>

                {nodeScenarioContext.quantities && nodeScenarioContext.quantities.length > 0 && (
                  <div className="og-arch-quantities-grid">
                    {nodeScenarioContext.quantities.map((q, idx) => (
                      <div key={idx} className="og-arch-quantity-item">
                        <span className="og-arch-q-label">{q.label}</span>
                        <strong className="og-arch-q-val">{q.value}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: Models & Methods Provenance & Last Run */}
              <div className="og-arch-inspect-section">
                <h5>Mechanism &amp; Models Provenance</h5>
                <div className="og-arch-prov-kv">
                  <span>Mechanism Type:</span>
                  <strong>{selectedNode.node.mechanism.toUpperCase()} ({getMechanismTitle(selectedNode.node.mechanism)})</strong>
                </div>

                {matchedMethod ? (
                  <>
                    <div className="og-arch-prov-kv">
                      <span>Method Register Entry:</span>
                      <code>{matchedMethod.method_id}</code>
                    </div>
                    <div className="og-arch-prov-kv">
                      <span>Implementation File:</span>
                      <code>{matchedMethod.implementation_ref}</code>
                    </div>
                    <div className="og-arch-prov-kv">
                      <span>When Last Run:</span>
                      <strong>
                        {matchedMethod.last_run_scenario_iso ? (
                          <span className="og-arch-timestamp">
                            <Clock size={12} /> {matchedMethod.last_run_scenario_iso}
                          </span>
                        ) : (
                          <span className="og-arch-unmeasured">
                            Not run / Unmeasured in this scenario
                          </span>
                        )}
                      </strong>
                    </div>
                    {matchedMethod.limitations && matchedMethod.limitations.length > 0 && (
                      <div className="og-arch-limitations-box">
                        <span className="og-arch-lim-label">Governance Limitation:</span>
                        <p>{matchedMethod.limitations[0]}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="og-arch-prov-kv">
                      <span>Implementation Authority:</span>
                      <code>{selectedNode.node.governingAuthority ?? 'Governance Rulings'}</code>
                    </div>
                    <div className="og-arch-prov-kv">
                      <span>When Last Run:</span>
                      <strong className="og-arch-unmeasured">
                        Synchronous / Declared with scenario record
                      </strong>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Quiet Governance & SB-GATE Notice (ADR-051) ────────────────────── */}
      <footer className="og-arch-governance-section" aria-label="Governance Status">
        <div className="og-arch-gate-card og-arch-gate-card--quiet">
          <div className="og-arch-quiet-bar">
            <div className="og-arch-quiet-info">
              <Info size={14} className="text-muted" />
              <span>
                <strong>Governance Note (ADR-051):</strong> Historical Storyboard retained pending retirement ({STORYBOARD_GATES_MET} of {STORYBOARD_GATE_TOTAL} gate conditions met).
              </span>
            </div>

            <div className="og-arch-quiet-actions">
              <button
                type="button"
                className="og-arch-quiet-toggle-btn"
                onClick={() => setShowGateDetails(!showGateDetails)}
                aria-expanded={showGateDetails}
              >
                {showGateDetails ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <span>{showGateDetails ? 'Hide' : 'Inspect'} SB-GATE Checklist</span>
              </button>

              <span className="og-arch-quiet-sep">&bull;</span>

              <button
                type="button"
                className="og-arch-quiet-toggle-btn"
                onClick={() => setShowRetainedStoryboard(!showRetainedStoryboard)}
                aria-expanded={showRetainedStoryboard}
              >
                {showRetainedStoryboard ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <span>{showRetainedStoryboard ? 'Hide' : 'Inspect'} Retained Storyboard (Historical)</span>
              </button>
            </div>
          </div>

          {/* Collapsible SB-GATE 6-Condition Checklist */}
          {showGateDetails && (
            <div className="og-arch-quiet-checklist">
              <div className="og-arch-quiet-checklist-head">
                <strong>ADR-051 Storyboard Retirement Evaluation</strong>
                <span className="og-arch-badge og-arch-badge--warning">Disposition: {STORYBOARD_DISPOSITION}</span>
              </div>
              <p className="og-arch-cond-basis" style={{ marginBottom: '10px' }}>
                Retirement requires all 6 conditions to be fully met. Condition 5 (migration of sixty historical prose units) remains open, so the storyboard is retained.
              </p>

              <div className="og-arch-gate-conditions">
                {STORYBOARD_GATE.map((cond) => {
                  const isMet = cond.state === 'met';
                  return (
                    <div key={cond.gate_id} className={`og-arch-cond-row ${isMet ? 'is-met' : 'is-open'}`}>
                      <div className="og-arch-cond-status">
                        {isMet ? (
                          <CheckCircle2 size={13} className="text-success" />
                        ) : (
                          <AlertTriangle size={13} className="text-warning" />
                        )}
                        <strong>{cond.gate_id}</strong>
                      </div>
                      <div className="og-arch-cond-text">
                        <div className="og-arch-cond-title">{cond.condition}</div>
                        <div className="og-arch-cond-basis">
                          <strong>Basis:</strong> {cond.basis}
                        </div>
                        {cond.outstanding && (
                          <div className="og-arch-cond-outstanding">
                            <strong>Remaining Blocker:</strong> {cond.outstanding}
                          </div>
                        )}
                      </div>
                      <div className="og-arch-cond-pill">
                        <span className={`og-arch-badge ${isMet ? 'og-arch-badge--calculated' : 'og-arch-badge--warning'}`}>
                          {cond.state}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Collapsible Retained Storyboard */}
          {showRetainedStoryboard && (
            <div className="og-arch-retained-box">
              <div className="og-storyboard" style={{ marginTop: '12px' }}>
                <div className="og-storyboard-notice">
                  <AlertTriangle size={13} strokeWidth={2} />
                  <span>
                    <strong>Retained pending retirement.</strong> This storyboard is recorded as{' '}
                    <em>Retired</em> in the capability registry and its implementation is simulated. It is
                    kept reachable because the storyboard retirement gate is not yet satisfied — several
                    units of its knowledge do not yet exist at their destinations. Figures shown on its
                    slides are illustrative and are not supported by measurement.
                  </span>
                </div>
                <ArchitectureExplorer />
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
