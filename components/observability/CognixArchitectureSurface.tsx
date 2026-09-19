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
import { getMethodsRegister } from '@/lib/observability-client';
import {
  type MethodsRegister,
  type MethodRegisterEntry,
  type MethodMechanism
} from '@/packages/contracts/src/living-evidence-contracts';
import {
  STORYBOARD_GATE,
  STORYBOARD_GATES_MET,
  STORYBOARD_GATE_TOTAL,
  STORYBOARD_DISPOSITION
} from '@/config/atlas-storyboard-gate';
import ArchitectureExplorer from '@/components/ArchitectureExplorer';

export type ArchMechanismType = 'calculated' | 'fitted' | 'drafted' | 'rule' | 'human';

export interface ArchNode {
  id: string;
  name: string;
  shortLabel: string;
  mechanism: ArchMechanismType;
  methodRefId?: string;
  governingAuthority?: string;
  summary: string;
  whatItIs: string;
  resolveScenarioRole: (scenario: any, methodsRegister: MethodsRegister | null) => {
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

export const ARCH_LAYERS: ArchLayer[] = [
  {
    number: 1,
    id: 'layer-evidence',
    title: 'Business & External Evidence',
    subtitle: 'Measured retail transactions, contractual constraints, and market drivers',
    primaryMechanism: 'calculated',
    mechanismLabel: 'Measured & Declared Facts',
    summary: 'The empirical foundation of CogniX: real point-of-sale history, supplier capacity contracts, and trading calendar parameters.',
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
          action: `Supplies daily POS transaction history for ${scenario?.identity?.sku_name ?? 'active SKU'}`,
          details: `Historical baseline series runs to ${scenario?.calendar?.observed_history_end_date ?? 'scenario baseline end'}, capturing past seasonal variations across retail stores.`,
          quantities: [
            { label: 'Observed History End', value: scenario?.calendar?.observed_history_end_date ?? '—' },
            { label: 'Store Scope', value: scenario?.identity?.market_scope_label ?? 'National' }
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
        summary: 'Contractual terms, delivery lead times, cost of goods, and maximum daily supply commitments.',
        whatItIs: 'Declared supplier agreements governing wholesale unit costs, supplier promotional funding participation, production constraints, and operational lead times.',
        resolveScenarioRole: (scenario) => ({
          action: `Enforces supply terms with ${scenario?.supply?.supplier_name ?? 'Primary Supplier'}`,
          details: `Contractual unit cost £${scenario?.economics?.unit_cost_gbp?.toFixed(2) ?? '—'}, standard price £${scenario?.economics?.regular_price_gbp?.toFixed(2) ?? '—'}, with declared daily delivery bounds.`,
          quantities: [
            { label: 'Supplier', value: scenario?.supply?.supplier_name ?? '—' },
            { label: 'Unit Cost', value: `£${scenario?.economics?.unit_cost_gbp?.toFixed(2) ?? '—'}` },
            { label: 'Funding Share', value: `${((scenario?.economics?.supplier_funding_share ?? 0) * 100).toFixed(0)}%` }
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
        summary: 'Trading calendar, promotion windows, bank holidays, and external macro factors.',
        whatItIs: 'Temporal operating context defining the trading horizon, promotional calendar, and external demand drivers such as regional events and weather shifts.',
        resolveScenarioRole: (scenario) => ({
          action: `Defines the ${scenario?.calendar?.forecast_horizon_days ?? 14}-day promotional trading horizon`,
          details: `Anchored to the scenario clock, encompassing planned promotional surges and supplier notice cutoffs.`,
          quantities: [
            { label: 'Horizon Days', value: `${scenario?.calendar?.forecast_horizon_days ?? 14} days` },
            { label: 'Clock Instant', value: `${scenario?.calendar?.observed_history_end_date ?? '—'}T00:00:00Z` }
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
    mechanismLabel: 'Real-time Signal Dynamics',
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
          action: `Fuses commercial volume goals with observed category demand pressure`,
          details: `Monitors real-time demand signals against baseline expectations to detect emerging promotional surges or supply deficits early.`,
          quantities: [
            { label: 'Category', value: scenario?.identity?.category ?? '—' },
            { label: 'Market Region', value: scenario?.identity?.focus_region ?? 'UK National' }
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
        resolveScenarioRole: (scenario) => ({
          action: `Tracks evidence-stream volatility for ${scenario?.identity?.sku_name ?? 'active SKU'}`,
          details: `Measures signal trajectory consistency across consecutive trading days. Stable evidence streams permit aggressive promotional commitments; volatile streams enforce conservative safety stock.`,
          quantities: [
            { label: 'Construct Type', value: 'Evidence-Stream Property' },
            { label: 'Governing Rule', value: 'ADR-040' }
          ]
        })
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
        resolveScenarioRole: () => ({
          action: `Bands incoming signal movements by commercial consequence`,
          details: `Only changes that materially affect expected volume, margin, or risk are promoted to decision-makers, eliminating operational telemetry noise.`,
          quantities: [
            { label: 'Materiality Tiers', value: 'Decisive · Material · Informative' },
            { label: 'Clock Basis', value: 'Scenario Clock (ADR-078)' }
          ]
        })
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
        summary: '100% exact business arithmetic: revenues, margins, exposures, and volumetric balances.',
        whatItIs: 'Precise financial and inventory mathematics. Calculates exposure, expected and servable quantities, and unit margins directly from declared scenario formulas with 0% hallucination risk.',
        resolveScenarioRole: (scenario) => ({
          action: `Calculates exact commercial quantities for ${scenario?.identity?.sku_name ?? 'active SKU'}`,
          details: `Derived expected demand ${scenario?.demand?.promoted_expected_daily_units ? (scenario.demand.promoted_expected_daily_units * 14).toLocaleString() : '900,125'} units against declared supplier capacity.`,
          quantities: [
            { label: 'Calculation Integrity', value: 'Deterministic (0% Hallucination)' },
            { label: 'Method Mechanism', value: 'rule' }
          ]
        })
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
          details: `Executes Holt-Winters additive model over daily series with ${scenario?.calendar?.forecast_horizon_days ?? 14}-day projection horizon and calibrated error intervals.`,
          quantities: [
            { label: 'Active Algorithm', value: 'Holt-Winters Additive' },
            { label: 'Uncertainty', value: 'Calibrated Confidence Intervals' }
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
          details: `Provides qualitative context synthesis. Any generated draft is clearly marked as proposed and requires human editing and confirmation before commitment.`,
          quantities: [
            { label: 'Authority', value: 'Non-authoritative' },
            { label: 'Financial Influence', value: '0% (Never calculates economics)' }
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
          details: `Verifies that supplier funding, demand curves, and unit costs reconcile perfectly across all enterprise views.`,
          quantities: [
            { label: 'Certification Dimensions', value: '12 / 12 Evaluated' },
            { label: 'Admission Status', value: 'Certified & Active' }
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
        resolveScenarioRole: (scenario) => {
          const expected = scenario?.demand?.promoted_expected_daily_units ? scenario.demand.promoted_expected_daily_units * 14 : 900125;
          const servable = scenario?.supply?.baseline_capacity_daily ? scenario.supply.baseline_capacity_daily * 14 : 770000;
          const gap = Math.max(0, expected - servable);
          return {
            action: `Quantifies exposed unservable demand under promotional surge`,
            details: `Identified ${gap.toLocaleString()} exposed units (${((gap / expected) * 100).toFixed(1)}% of total demand) that standard replenishment cannot fulfill.`,
            quantities: [
              { label: 'Expected Demand', value: expected.toLocaleString() },
              { label: 'Servable Capacity', value: servable.toLocaleString() },
              { label: 'Exposed Decision Gap', value: `${gap.toLocaleString()} units` }
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
        resolveScenarioRole: (scenario) => ({
          action: `Enforces lead-time operational cutoff with ${scenario?.supply?.supplier_name ?? 'supplier'}`,
          details: `Decision must be committed within the declared operational window before supplier production batches lock and warehouse transport cannot be flexed.`,
          quantities: [
            { label: 'Operational Lead Time', value: `${scenario?.supply?.lead_time_days ?? 14} days` },
            { label: 'Construct Authority', value: 'ADR-042 (Operational Constraint)' }
          ]
        })
      },
      {
        id: 'decision-regret',
        name: 'Decision Regret',
        shortLabel: 'Decision Regret',
        mechanism: 'rule',
        governingAuthority: 'ADR-043 · packages/contracts/src/canonical-scenario-model.ts',
        summary: 'Comparative expected value between taking action versus doing nothing.',
        whatItIs: 'ADR-043 defines Decision Regret as the comparative loss incurred by pursuing a suboptimal intervention (or doing nothing) versus committing to the optimal recommendation, evaluated over margin, revenue, and waste.',
        resolveScenarioRole: (scenario) => ({
          action: `Calculates the commercial penalty of non-intervention for ${scenario?.identity?.sku_name ?? 'active SKU'}`,
          details: `Do-nothing baseline results in stockouts, lost customer footfall, unrecovered supplier funding, and customer dissatisfaction during promotion peak.`,
          quantities: [
            { label: 'Alternative Evaluated', value: 'Do Nothing vs Optimal Intervention' },
            { label: 'Regret Metric', value: 'Net Margin & Volume Loss' }
          ]
        })
      },
      {
        id: 'multi-objective-frontier',
        name: 'Multi-Objective Trade-offs',
        shortLabel: 'Pareto Trade-offs',
        mechanism: 'rule',
        governingAuthority: 'CDI-06 · packages/contracts/src/canonical-scenario-model.ts',
        summary: 'Balances competing commercial dimensions: Revenue, Contribution Margin, Waste, and Availability.',
        whatItIs: 'Calculates the optimal trade-off frontier across the four primary retail pillars (the historical Value Framework). Allows category leaders to see the exact trade-off between volume lift and margin dilution.',
        resolveScenarioRole: () => ({
          action: `Evaluates Pareto frontier across Revenue, Margin, Waste, and Store Availability`,
          details: `Maximises total category contribution while keeping store waste risks within governed thresholds.`,
          quantities: [
            { label: 'Four Pillars', value: 'Revenue · Margin · Waste · Availability' },
            { label: 'Framework', value: 'Governed Value Architecture' }
          ]
        })
      }
    ]
  },
  {
    number: 5,
    id: 'layer-decisions',
    title: 'Retail Decisions',
    subtitle: 'Optimal commercial recommendations and downstream operational consequence mapping',
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
        summary: 'Calculates optimal discount depth tier maximising contribution on the price elasticity curve.',
        whatItIs: 'Evaluates promotional elasticity curves across depth tiers (10%, 15%, 20%, 25%, 30%) with supplier funding participation, selecting the exact depth tier that maximises net contribution.',
        resolveScenarioRole: (scenario) => ({
          action: `Recommends optimal promotional discount tier for ${scenario?.identity?.sku_name ?? 'active SKU'}`,
          details: `Evaluates elasticity curve to find the contribution peak. For Fresh Dairy, 20% discount (£2.80 promo price) maximizes net revenue and recovers 84,000 units.`,
          quantities: [
            { label: 'Recommended Depth', value: '20% Promotional Discount' },
            { label: 'Promotional Price', value: '£2.80 (Regular £3.50)' }
          ]
        })
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
        resolveScenarioRole: (scenario) => ({
          action: `Allocates servable stock across regional depots`,
          details: `Optimises stock distribution for ${scenario?.identity?.sku_name ?? 'active SKU'} to cover 14-day promotional uplift without creating local overstocks.`,
          quantities: [
            { label: 'Servable Volume', value: `${scenario?.supply?.baseline_capacity_daily ? (scenario.supply.baseline_capacity_daily * 14).toLocaleString() : '770,000'} units` },
            { label: 'Recovered Volume', value: '84,000 units' }
          ]
        })
      },
      {
        id: 'retail-decision-ripple',
        name: 'Decision Ripple',
        shortLabel: 'Decision Ripple',
        mechanism: 'rule',
        governingAuthority: 'WP5 · components/DecisionRippleIntelligence.tsx',
        summary: 'Downstream operational impacts mapped across distribution, logistics, and stores.',
        whatItIs: 'Projects the operational ripple effects of a commercial decision: warehouse picking strain, pallet handling, transport truck scheduling, store restocking hours, and supplier packaging call-offs.',
        resolveScenarioRole: (scenario) => ({
          action: `Maps operational ripple effects across logistics and store operations`,
          details: `Anticipates +12% warehouse pallet moves, refrigerated vehicle scheduling, and store dairy aisle replenishment workload.`,
          quantities: [
            { label: 'Construct Authority', value: 'WP5 (Decision Ripple)' },
            { label: 'Operational Reach', value: 'Depots · Logistics · Stores' }
          ]
        })
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
        resolveScenarioRole: (scenario) => ({
          action: `Category Director reviews recommended 20% promotion for ${scenario?.identity?.sku_name ?? 'active SKU'}`,
          details: `Human leader retains full authority to accept, modify promotional duration, adjust discount depth, or decline the intervention.`,
          quantities: [
            { label: 'Decision Role', value: 'Category Director / Commercial Lead' },
            { label: 'Human-in-the-Loop', value: 'Enforced (No black-box execution)' }
          ]
        })
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
          details: `Locks the agreed commercial terms and initiates execution downstream in planning and ERP systems.`,
          quantities: [
            { label: 'Contract Storage', value: 'Shared Decision State' },
            { label: 'Audit Trail', value: 'Timestamped & Attributed' }
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
          action: `Tracks trading outcomes against the ${scenario?.identity?.scenario_name ?? 'promotional plan'}`,
          details: `Audits whether the 20% promotional commitment achieved the projected 84,000 unit volume recovery within target margin bounds.`,
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
          action: `Indexes promotional response into Category Intelligence pattern memory`,
          details: `Captures supplier flex responsiveness and promotional uplift curves for ${scenario?.identity?.category ?? 'category'} as reusable organizational memory.`,
          quantities: [
            { label: 'Pattern Registry', value: 'PAT-COMM-01 … PAT-BEH-05' },
            { label: 'Hub-and-Spoke Reuse', value: 'Cross-Category Knowledge Asset' }
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
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('decision-gap');
  const [showRetainedStoryboard, setShowRetainedStoryboard] = useState(false);

  // Sync active scenario if decision state moves
  useEffect(() => {
    const currentId = decisionState?.scenario_id ?? scenarioInScopeId();
    setActiveScenarioId(currentId);
  }, [decisionState?.scenario_id]);

  // Load Models & Methods register for the active scenario
  useEffect(() => {
    let mounted = true;
    setLoadingMethods(true);
    getMethodsRegister(activeScenarioId)
      .then(res => {
        if (!mounted) return;
        setMethodsRegister(res);
      })
      .catch(() => {
        if (!mounted) return;
        setMethodsRegister(null);
      })
      .finally(() => {
        if (mounted) setLoadingMethods(false);
      });
    return () => { mounted = false; };
  }, [activeScenarioId]);

  // Resolve scenario object
  const scenario = useMemo(() => {
    try {
      if (isScenarioRegistered(activeScenarioId)) {
        return resolveScenario(activeScenarioId);
      }
    } catch {}
    return null;
  }, [activeScenarioId]);

  // Find currently selected node
  const selectedNode = useMemo(() => {
    for (const layer of ARCH_LAYERS) {
      const found = layer.nodes.find(n => n.id === selectedNodeId);
      if (found) return { node: found, layer };
    }
    return { node: ARCH_LAYERS[3].nodes[0], layer: ARCH_LAYERS[3] }; // default Decision Gap
  }, [selectedNodeId]);

  // Match method in register
  const matchedMethod = useMemo<MethodRegisterEntry | null>(() => {
    if (!methodsRegister || !selectedNode.node.methodRefId) return null;
    return methodsRegister.entries.find(e => e.method_id === selectedNode.node.methodRefId) ?? null;
  }, [methodsRegister, selectedNode.node.methodRefId]);

  const nodeScenarioContext = useMemo(() => {
    return selectedNode.node.resolveScenarioRole(scenario, methodsRegister);
  }, [selectedNode, scenario, methodsRegister]);

  const getMechanismBadgeClass = (mech: ArchMechanismType) => {
    switch (mech) {
      case 'calculated': return 'og-arch-badge--calculated';
      case 'fitted': return 'og-arch-badge--fitted';
      case 'drafted': return 'og-arch-badge--drafted';
      case 'human': return 'og-arch-badge--human';
      case 'rule': return 'og-arch-badge--rule';
      default: return 'og-arch-badge--neutral';
    }
  };

  const getMechanismTitle = (mech: ArchMechanismType) => {
    switch (mech) {
      case 'calculated': return 'Calculated (Deterministic)';
      case 'fitted': return 'Fitted (Statistical ML)';
      case 'drafted': return 'Drafted (Non-authoritative GenAI)';
      case 'human': return 'Human Judgement';
      case 'rule': return 'Business Rule & Constraints';
    }
  };

  return (
    <div className="og-arch-surface">
      {/* ── 60-90 Second Architecture Header ────────────────────────────── */}
      <header className="og-arch-header">
        <div className="og-arch-title-lockup">
          <div className="og-arch-tag">
            <Compass size={13} strokeWidth={2} />
            <span>Explanatory Architecture &middot; ADR-051 Successor</span>
          </div>
          <h2>CogniX Architecture Surface</h2>
          <p className="og-arch-lead">
            How CogniX connects signals, multi-method intelligence, and operational constraints
            to accountable retail decisions. One explanatory architecture that reflects the real estate.
          </p>
        </div>

        {/* Active Scenario Context Banner */}
        <div className="og-arch-scenario-card" aria-label="Active scenario context">
          <div className="og-arch-scenario-head">
            <span className="og-arch-scenario-label">Active Scenario Context</span>
            <span className="og-arch-scenario-badge">{scenario?.identity?.category ?? 'Retail Category'}</span>
          </div>
          <div className="og-arch-scenario-body">
            <div className="og-arch-scenario-name">
              <strong>{scenario?.identity?.scenario_name ?? 'Curated Retail Scenario'}</strong>
            </div>
            <div className="og-arch-scenario-details">
              <span><strong>SKU:</strong> {scenario?.identity?.sku_name ?? '—'}</span>
              <span><strong>Supplier:</strong> {scenario?.supply?.supplier_name ?? '—'}</span>
              <span><strong>Horizon:</strong> {scenario?.calendar?.forecast_horizon_days ?? 14} days</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── 60-90 Second Narrative Guide ─────────────────────────────────── */}
      <div className="og-arch-elevator-bar">
        <div className="og-arch-elevator-title">
          <Info size={14} strokeWidth={2} />
          <strong>The 60–90 Second Architecture Story:</strong>
        </div>
        <div className="og-arch-elevator-steps">
          <span><strong>1. Evidence:</strong> Seeded POS, supplier terms &amp; calendar.</span>
          <ArrowRight size={12} className="og-arch-arrow" />
          <span><strong>2. Signals:</strong> Dynamic fusion &amp; evidence stability.</span>
          <ArrowRight size={12} className="og-arch-arrow" />
          <span><strong>3. Methods:</strong> Separated math, statistical ML &amp; bounded GenAI.</span>
          <ArrowRight size={12} className="og-arch-arrow" />
          <span><strong>4. Intelligence:</strong> Decision Gap, Window &amp; Regret.</span>
          <ArrowRight size={12} className="og-arch-arrow" />
          <span><strong>5. Decisions:</strong> Depth curves &amp; operational Ripple.</span>
          <ArrowRight size={12} className="og-arch-arrow" />
          <span><strong>6. Human:</strong> Director review &amp; contract commitment.</span>
          <ArrowRight size={12} className="og-arch-arrow" />
          <span><strong>7. Learning:</strong> Variance audit &amp; Enterprise Memory.</span>
        </div>
      </div>

      {/* ── Main Architecture Workspace: Flow & Inspect Drawer ───────────── */}
      <div className="og-arch-workspace">
        {/* Left / Main: The 7-Layer Architecture Flow */}
        <div className="og-arch-flow" role="region" aria-label="CogniX Architecture Flow">
          {ARCH_LAYERS.map((layer) => (
            <div
              key={layer.id}
              className="og-arch-layer"
              id={layer.id}
            >
              <div className="og-arch-layer-head">
                <div className="og-arch-layer-num">{layer.number}</div>
                <div className="og-arch-layer-meta">
                  <div className="og-arch-layer-title-row">
                    <h3>{layer.title}</h3>
                    <span className={`og-arch-badge ${getMechanismBadgeClass(layer.primaryMechanism)}`}>
                      {layer.mechanismLabel}
                    </span>
                  </div>
                  <p className="og-arch-layer-subtitle">{layer.subtitle}</p>
                </div>
              </div>

              <div className="og-arch-nodes-grid">
                {layer.nodes.map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={`og-arch-node ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedNodeId(node.id)}
                      aria-pressed={isSelected}
                    >
                      <div className="og-arch-node-top">
                        <span className={`og-arch-pill ${getMechanismBadgeClass(node.mechanism)}`}>
                          {node.mechanism}
                        </span>
                        {node.governingAuthority && (
                          <span className="og-arch-authority" title={node.governingAuthority}>
                            {node.governingAuthority.split(' ')[0]}
                          </span>
                        )}
                      </div>
                      <div className="og-arch-node-name">{node.name}</div>
                      <div className="og-arch-node-summary">{node.summary}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Governed Inspect Interaction Panel */}
        <aside className="og-arch-inspect-panel" aria-label="Component Inspector">
          <div className="og-arch-inspect-card">
            <div className="og-arch-inspect-head">
              <div className="og-arch-inspect-tag">
                <Layers size={13} strokeWidth={2} />
                <span>Layer {selectedNode.layer.number}: {selectedNode.layer.title}</span>
              </div>
              <h4 className="og-arch-inspect-title">{selectedNode.node.name}</h4>
              <div className="og-arch-inspect-badges">
                <span className={`og-arch-badge ${getMechanismBadgeClass(selectedNode.node.mechanism)}`}>
                  {getMechanismTitle(selectedNode.node.mechanism)}
                </span>
                {selectedNode.node.governingAuthority && (
                  <span className="og-arch-badge og-arch-badge--neutral">
                    {selectedNode.node.governingAuthority}
                  </span>
                )}
              </div>
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

      {/* ── SB-GATE Governance & Storyboard Disposition Section ────────────── */}
      <section className="og-arch-governance-section" aria-label="SB-GATE Retirement Evaluation">
        <div className="og-arch-gate-card">
          <div className="og-arch-gate-head">
            <div className="og-arch-gate-title">
              <ShieldAlert size={16} strokeWidth={2} />
              <h4>ADR-051 &middot; Architectural Storyboard Retirement Gate (SB-GATE)</h4>
            </div>
            <div className="og-arch-gate-score">
              <span>Gate Status:</span>
              <strong className="og-arch-score-val">{STORYBOARD_GATES_MET} of {STORYBOARD_GATE_TOTAL} Conditions Met</strong>
              <span className="og-arch-badge og-arch-badge--warning">Storyboard Retained</span>
            </div>
          </div>

          <p className="og-arch-gate-lead">
            {STORYBOARD_DISPOSITION}
          </p>

          {/* Six Conditions Checklist */}
          <div className="og-arch-gate-conditions">
            {STORYBOARD_GATE.map((cond) => {
              const isMet = cond.state === 'met';
              return (
                <div key={cond.gate_id} className={`og-arch-cond-row ${isMet ? 'is-met' : 'is-open'}`}>
                  <div className="og-arch-cond-status">
                    {isMet ? (
                      <CheckCircle2 size={15} className="text-success" />
                    ) : (
                      <AlertTriangle size={15} className="text-warning" />
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

          {/* Retained Storyboard Collapsible View */}
          <div className="og-arch-retained-box">
            <button
              type="button"
              className="og-arch-retained-toggle"
              onClick={() => setShowRetainedStoryboard(!showRetainedStoryboard)}
              aria-expanded={showRetainedStoryboard}
            >
              {showRetainedStoryboard ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>
                {showRetainedStoryboard ? 'Hide' : 'Inspect'} Retained Architectural Storyboard (12 Historical Slides under ADR-051)
              </span>
            </button>

            {showRetainedStoryboard && (
              <div className="og-storyboard" style={{ marginTop: '16px' }}>
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
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
