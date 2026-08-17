/**
 * CogniX Campaign Intelligence — Campaign Archetypes & Scenario Models
 *
 * Deterministic scenario definitions providing diverse commercial situations:
 * 1. ARCH-CHILLED-ELASTIC (High elasticity chilled volume driver)
 * 2. ARCH-PREMIUM-ARTISAN (Premium low-elasticity artisan bakery)
 * 3. ARCH-CLEARANCE-PRODUCE (Excess-inventory perishable clearance)
 * 4. ARCH-SUPPLY-CONSTRAINED (Supplier-capacity-constrained promotion)
 * 5. ARCH-COMPETITOR-DEFENCE (Competitor price matching defence)
 * 6. ARCH-SEASONAL-WINDOW (Weather/calendar seasonal opportunity)
 * 7. ARCH-CANNIBALISATION (High uplift but heavy portfolio cannibalisation)
 *
 * Provenance: All demonstration models carry explicit synthetic_demo / seeded status.
 */

import { CampaignIntent, CampaignObjectiveType, InterventionPosture, PrimaryObjectiveMetric } from '../packages/contracts/src/campaign-intent-model';

/**
 * Single source of tenant/session identity for the campaign demo surface.
 * The engines enforce that the request tenant/session match the inline intent's
 * tenant/session; every caller (planner, tests) must use these same constants.
 */
export const CAMPAIGN_DEMO_TENANT_ID = 'tenant_uk_retail_01';
export const CAMPAIGN_DEMO_SESSION_ID = 'sess_001';

/** Store counts for the demo world's targetable regions (mirrors the region selector). */
export const REGION_STORE_COUNTS: Record<string, number> = {
  National: 50,
  'North West': 18,
  London: 14,
  Midlands: 10,
  Yorkshire: 8
};

export type ArchetypeId =
  | 'ARCH-CHILLED-ELASTIC'
  | 'ARCH-PREMIUM-ARTISAN'
  | 'ARCH-CLEARANCE-PRODUCE'
  | 'ARCH-SUPPLY-CONSTRAINED'
  | 'ARCH-COMPETITOR-DEFENCE'
  | 'ARCH-SEASONAL-WINDOW'
  | 'ARCH-CANNIBALISATION';

export interface WaterfallItem {
  id: string;
  label: string;
  driver_class: 'ambient' | 'intervention';
  contribution_pp: number;
  value_display: string;
  rationale: string;
  provenance: 'SEEDED_OBSERVATION' | 'DERIVED' | 'SIMULATED' | 'SEEDED';
}

export interface ElasticityPoint {
  discount_pct: number;
  expected_demand_uplift_pct: number;
  unit_contribution_gbp: number;
  net_contribution_delta_gbp: number;
  is_current?: boolean;
  is_cognix_recommended?: boolean;
  notes?: string;
}

export interface OpportunityCellFactor {
  factor_id: string;
  label: string;
  points: number;
  rationale: string;
}

export interface OpportunityCell {
  region: string;
  window_label: string;
  opportunity_index: number;
  tier: 'PREFERRED' | 'ACCEPTABLE' | 'SUBOPTIMAL' | 'AVOID';
  store_count: number;
  factors: OpportunityCellFactor[];
  recommended_action: {
    label: string;
    type: 'EXPLOIT' | 'PROTECT_MARGIN' | 'CLEAR_INVENTORY' | 'RESTRICT_SCOPE';
    description: string;
    target_discount: number;
    target_stores: number;
    target_duration: number;
  };
}

export interface FrontierPlay {
  id: string;
  name: string;
  badge?: string;
  discount_pct: number;
  stores_count: number;
  duration_days: number;
  expected_demand_uplift_pct: number;
  net_contribution_delta_gbp: number;
  supply_exposure: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  waste_impact_pct: number;
  rationale: string;
  is_recommended?: boolean;
  is_current?: boolean;
}

export interface InverseCondition {
  id: string;
  condition_text: string;
  target_parameter: 'SUPPLIER_FUNDING' | 'DEMAND_UPLIFT' | 'DISCOUNT_DEPTH' | 'STORE_SCOPE';
  target_value: number;
  target_display: string;
  explanation: string;
  modelling_action_label: string;
}

export interface DecisionChangeTrigger {
  trigger_id: string;
  boundary_condition: string;
  decision_shift: string;
  severity: 'WARNING' | 'VETO' | 'OPPORTUNITY';
  monitored_signal: string;
}

export interface SignalHypothesis {
  signal_id: string;
  signal_headline: string;
  signal_source: string;
  observed_metric: string;
  hypothesis_statement: string;
  test_action_label: string;
  test_result: {
    verdict: 'SUPPORTED' | 'WEAKLY_SUPPORTED' | 'UNSUPPORTED' | 'INDETERMINATE';
    explanation: string;
    proposed_intervention: {
      discount: number;
      region: string;
      duration: number;
      scope: number;
    };
  };
}

export interface DecisionTwinStream {
  day_index: number;
  day_label: string;
  expected_demand_index: number;
  observed_demand_index: number;
  expected_margin_gbp: number;
  observed_margin_gbp: number;
  expected_inventory_units: number;
  observed_inventory_units: number;
  deviation_status: 'ON_TRACK' | 'MILD_DRIFT' | 'SEVERE_DEVIATION';
}

export interface TwinDeviation {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'WARNING' | 'POSITIVE_OPPORTUNITY';
  metric: string;
  expected_value: string;
  actual_value: string;
  impact_summary: string;
  recommended_in_flight_action: {
    title: string;
    action_type: 'REDUCE_DISCOUNT' | 'SHORTEN_CAMPAIGN' | 'REALLOCATE_INVENTORY' | 'EXPAND_HIGH_PERFORMING_REGION' | 'REQUEST_SUPPLIER_FUNDING';
    description: string;
    current_vs_proposed: {
      current: Record<string, string | number>;
      proposed: Record<string, string | number>;
      expected_recovery: string;
    };
  };
}

export interface CampaignArchetype {
  id: ArchetypeId;
  name: string;
  tagline: string;
  category: string;
  default_sku: string;
  sku_name: string;
  cost_price: number;
  rrp: number;
  base_weekly_units_per_store: number;
  price_elasticity: number;
  cannibalisation_rate: number;
  default_discount_pct: number;
  default_duration_days: number;
  default_region: string;
  default_mechanic: string;
  default_objective: PrimaryObjectiveMetric;
  intervention_posture: InterventionPosture;
  
  // Executive Discovery Hero
  discovery: {
    headline: string;
    core_narrative: string;
    key_finding: string;
    decision_verdict: 'ACCRETIVE GO' | 'CONDITIONAL GO' | 'MARGIN RISK' | 'SUPPLY INFEASIBLE' | 'RECONSIDER';
    confidence: 'HIGH' | 'MODERATE' | 'LOW';
    expected_demand_uplift_pct: number;
    net_contribution_delta_gbp: number;
    primary_tension_title: string;
    primary_tension_description: string;
    dominant_conflict: [string, string];
  };

  // Demand decomposition waterfall
  waterfall: WaterfallItem[];

  // Elasticity curve data
  elasticity_curve: ElasticityPoint[];

  // Micro-market opportunity matrix (5 regions × 4 time slots)
  opportunity_matrix: OpportunityCell[];

  // Decision frontier competing plays
  frontier_plays: FrontierPlay[];

  // Inverse analysis ("What would have to be true?")
  inverse_conditions: InverseCondition[];

  // Boundary change triggers ("What could change this decision?")
  change_triggers: DecisionChangeTrigger[];

  // Signals & Hypotheses
  signal_hypotheses: SignalHypothesis[];

  // Decision Graph Node relationships
  decision_graph: {
    nodes: Array<{
      id: string;
      label: string;
      category: 'SIGNAL' | 'EVIDENCE' | 'HYPOTHESIS' | 'DEMAND' | 'ECONOMICS' | 'DECISION' | 'INTERVENTION';
      provenance: 'SEEDED_OBSERVATION' | 'DERIVED' | 'SIMULATED' | 'SEEDED';
      summary: string;
      detail: string;
    }>;
    links: Array<{ from: string; to: string; label?: string }>;
  };

  // Live Decision Twin In-Flight Simulation Profile
  decision_twin: {
    /** All in-flight telemetry in this profile is seeded simulation, never production feeds. */
    telemetry_basis: 'SIMULATED_DEMO';
    flight_days: number;
    current_day: number;
    is_decision_still_valid: 'STILL VALID' | 'RECONSIDER' | 'CONDITION BREACHED';
    validity_confidence: 'HIGH' | 'MODERATE' | 'LOW';
    conditions_changed_count: number;
    interventions_recommended_count: number;
    executive_summary: string;
    telemetry_streams: DecisionTwinStream[];
    deviations: TwinDeviation[];
    post_campaign_learning: {
      what_we_believed: string;
      what_we_expected: string;
      what_we_decided: string;
      interventions_applied: string;
      what_actually_happened: string;
      what_cognix_learned: string;
      learning_case_status: 'QUALIFIED' | 'PLACEHOLDER_EXCLUDED' | 'NON_AUTHORITATIVE';
    };
  };
}

export const CAMPAIGN_ARCHETYPES_MAP: Record<ArchetypeId, CampaignArchetype> = {
  'ARCH-CHILLED-ELASTIC': {
    id: 'ARCH-CHILLED-ELASTIC',
    name: 'Highly Elastic Chilled Dairy',
    tagline: 'High volume sensitivity with sharp margin compression past 15% discount',
    category: 'Dairy',
    default_sku: 'P004',
    sku_name: 'Cheddar Mature 400g',
    cost_price: 1.82,
    rrp: 2.49,
    base_weekly_units_per_store: 84,
    price_elasticity: 2.4,
    cannibalisation_rate: 0.08,
    default_discount_pct: 20,
    default_duration_days: 14,
    default_region: 'National',
    default_mechanic: 'price_cut',
    default_objective: 'VOLUME',
    intervention_posture: 'CONSIDER_PROMOTION',

    discovery: {
      headline: 'CogniX found substantial demand upside with national margin dilution',
      core_narrative: 'Your campaign creates +48% demand surge, but national execution at 20% discount destroys £3,300 in net commercial contribution.',
      key_finding: '71% of incremental volume is concentrated across 18 high-yield stores in the North West and Midlands.',
      decision_verdict: 'CONDITIONAL GO',
      confidence: 'HIGH',
      expected_demand_uplift_pct: 48.0,
      net_contribution_delta_gbp: -3320,
      primary_tension_title: 'Primary Tension: Demand Growth ↔ Margin Protection',
      primary_tension_description: 'The proposed 20% discount prioritises gross volume (+48%) at the expense of unit contribution, turning an operational success into a commercial sacrifice.',
      dominant_conflict: ['Demand Growth', 'Margin Protection']
    },

    waterfall: [
      { id: 'wf_base', label: 'Baseline Run-Rate', driver_class: 'ambient', contribution_pp: 100.0, value_display: '100.0 pp', rationale: 'Historical sales run-rate across 50 stores.', provenance: 'SEEDED_OBSERVATION' },
      { id: 'wf_drift', label: 'Seasonal Category Drift', driver_class: 'ambient', contribution_pp: 1.8, value_display: '+1.8 pp', rationale: 'Mild upward ambient trend in dairy demand.', provenance: 'DERIVED' },
      { id: 'wf_elas', label: 'Price Elasticity (20% Cut)', driver_class: 'intervention', contribution_pp: 36.4, value_display: '+36.4 pp', rationale: 'Strong volume response to headline price reduction.', provenance: 'DERIVED' },
      { id: 'wf_media', label: 'Feature Space & Signage', driver_class: 'intervention', contribution_pp: 7.2, value_display: '+7.2 pp', rationale: 'Gondola end placement and mobile app boost.', provenance: 'SIMULATED' },
      { id: 'wf_comp', label: 'Competitor Price Indexing', driver_class: 'ambient', contribution_pp: 4.8, value_display: '+4.8 pp', rationale: 'Temporary price gap against rival retailer.', provenance: 'SEEDED_OBSERVATION' },
      { id: 'wf_cann', label: 'Cannibalisation (Mild Cheddar)', driver_class: 'intervention', contribution_pp: -2.2, value_display: '-2.2 pp', rationale: 'Slight substitution away from standard cheddar.', provenance: 'DERIVED' },
      { id: 'wf_net', label: 'Net Campaign-Window Demand', driver_class: 'intervention', contribution_pp: 48.0, value_display: '+48.0 pp', rationale: 'Total expected demand change across the window including ambient drivers; intervention-attributable share is +41.4 pp (CDI-02 basis excludes ambient movement).', provenance: 'DERIVED' }
    ],

    elasticity_curve: [
      { discount_pct: 0, expected_demand_uplift_pct: 0, unit_contribution_gbp: 0.67, net_contribution_delta_gbp: 0, notes: 'Baseline zero promotion' },
      { discount_pct: 5, expected_demand_uplift_pct: 12.0, unit_contribution_gbp: 0.647, net_contribution_delta_gbp: 1840, notes: 'Accretive shallow discount' },
      { discount_pct: 10, expected_demand_uplift_pct: 24.5, unit_contribution_gbp: 0.623, net_contribution_delta_gbp: 3420, notes: 'Optimal sweet spot' },
      { discount_pct: 14, expected_demand_uplift_pct: 38.6, unit_contribution_gbp: 0.604, net_contribution_delta_gbp: 4120, is_cognix_recommended: true, notes: 'CogniX Recommended configuration' },
      { discount_pct: 20, expected_demand_uplift_pct: 48.0, unit_contribution_gbp: 0.576, net_contribution_delta_gbp: -3320, is_current: true, notes: 'Current plan — margin erosion dominates' },
      { discount_pct: 25, expected_demand_uplift_pct: 58.2, unit_contribution_gbp: 0.553, net_contribution_delta_gbp: -7850, notes: 'Severe economic destruction' },
      { discount_pct: 30, expected_demand_uplift_pct: 67.0, unit_contribution_gbp: 0.529, net_contribution_delta_gbp: -12600, notes: 'Infeasible margin collapse' }
    ],

    opportunity_matrix: [
      {
        region: 'North West',
        window_label: 'Thu – Sun (Peak)',
        opportunity_index: 91,
        tier: 'PREFERRED',
        store_count: 5,
        factors: [
          { factor_id: 'f1', label: 'Demand Propensity', points: 27, rationale: 'High category basket attachment index (1.38)' },
          { factor_id: 'f2', label: 'DC Stock Headroom', points: 22, rationale: 'Regional warehouse holds 8.2 days forward cover' },
          { factor_id: 'f3', label: 'Competitor Pressure', points: 18, rationale: 'Local rival pricing 6% higher on chilled cheese' },
          { factor_id: 'f4', label: 'Timing Advantage', points: 15, rationale: 'Weekend shopping mission concentration' },
          { factor_id: 'f5', label: 'Economic Headroom', points: 9, rationale: 'Positive store contribution margin headroom' }
        ],
        recommended_action: {
          label: 'Exploit Regional Opportunity',
          type: 'EXPLOIT',
          description: 'Deploy 14% discount across 5 North West superstores for 9 days to capture £2.4K incremental margin.',
          target_discount: 14,
          target_stores: 5,
          target_duration: 9
        }
      },
      {
        region: 'Midlands',
        window_label: 'Thu – Sun (Peak)',
        opportunity_index: 84,
        tier: 'PREFERRED',
        store_count: 5,
        factors: [
          { factor_id: 'f1', label: 'Demand Propensity', points: 24, rationale: 'Strong family shopper footfall' },
          { factor_id: 'f2', label: 'DC Stock Headroom', points: 20, rationale: 'Adequate depot inventory' },
          { factor_id: 'f3', label: 'Competitor Pressure', points: 19, rationale: 'Aggressive promotional counter-measures' },
          { factor_id: 'f4', label: 'Timing Advantage', points: 12, rationale: 'Midweek uplift' },
          { factor_id: 'f5', label: 'Economic Headroom', points: 9, rationale: 'Controlled store overhead' }
        ],
        recommended_action: {
          label: 'Exploit Regional Opportunity',
          type: 'EXPLOIT',
          description: 'Deploy targeted 14% discount across Midlands cluster.',
          target_discount: 14,
          target_stores: 5,
          target_duration: 9
        }
      },
      {
        region: 'London',
        window_label: 'Thu – Sun (Peak)',
        opportunity_index: 48,
        tier: 'AVOID',
        store_count: 6,
        factors: [
          { factor_id: 'f1', label: 'Demand Propensity', points: 12, rationale: 'Smaller basket sizes in Metro stores' },
          { factor_id: 'f2', label: 'DC Stock Headroom', points: 11, rationale: 'Tight backroom space constraints' },
          { factor_id: 'f3', label: 'Competitor Pressure', points: 10, rationale: 'Rival convenience presence' },
          { factor_id: 'f4', label: 'Timing Advantage', points: 8, rationale: 'Evening top-up pattern' },
          { factor_id: 'f5', label: 'Economic Headroom', points: 7, rationale: 'High logistics fulfillment cost' }
        ],
        recommended_action: {
          label: 'Protect Margin',
          type: 'PROTECT_MARGIN',
          description: 'Exclude London Metro stores from deep price cuts to avoid margin leakage.',
          target_discount: 10,
          target_stores: 2,
          target_duration: 7
        }
      },
      {
        region: 'Yorkshire',
        window_label: 'Thu – Sun (Peak)',
        opportunity_index: 76,
        tier: 'ACCEPTABLE',
        store_count: 4,
        factors: [
          { factor_id: 'f1', label: 'Demand Propensity', points: 22, rationale: 'Consistent baseline demand' },
          { factor_id: 'f2', label: 'DC Stock Headroom', points: 18, rationale: 'Direct supplier delivery access' },
          { factor_id: 'f3', label: 'Competitor Pressure', points: 14, rationale: 'Moderate regional competition' },
          { factor_id: 'f4', label: 'Timing Advantage', points: 12, rationale: 'Weekend volume ramp' },
          { factor_id: 'f5', label: 'Economic Headroom', points: 10, rationale: 'Solid unit margin' }
        ],
        recommended_action: {
          label: 'Exploit Regional Opportunity',
          type: 'EXPLOIT',
          description: 'Include 4 Yorkshire superstores with moderate promotional depth.',
          target_discount: 14,
          target_stores: 4,
          target_duration: 9
        }
      },
      {
        region: 'South West',
        window_label: 'Thu – Sun (Peak)',
        opportunity_index: 59,
        tier: 'SUBOPTIMAL',
        store_count: 4,
        factors: [
          { factor_id: 'f1', label: 'Demand Propensity', points: 16, rationale: 'Average category velocity' },
          { factor_id: 'f2', label: 'DC Stock Headroom', points: 14, rationale: 'Bristol DC buffer' },
          { factor_id: 'f3', label: 'Competitor Pressure', points: 11, rationale: 'Standard market position' },
          { factor_id: 'f4', label: 'Timing Advantage', points: 10, rationale: 'Friday surge' },
          { factor_id: 'f5', label: 'Economic Headroom', points: 8, rationale: 'Stable operational cost' }
        ],
        recommended_action: {
          label: 'Protect Margin',
          type: 'PROTECT_MARGIN',
          description: 'Deploy standard 10% promotional tier in South West.',
          target_discount: 10,
          target_stores: 4,
          target_duration: 7
        }
      }
    ],

    frontier_plays: [
      {
        id: 'play_current',
        name: 'Current Plan',
        badge: 'Proposed',
        discount_pct: 20,
        stores_count: 50,
        duration_days: 14,
        expected_demand_uplift_pct: 48.0,
        net_contribution_delta_gbp: -3320,
        supply_exposure: 'HIGH',
        waste_impact_pct: -4.2,
        rationale: 'National blanket 20% discount maximising volume (+48%) at significant margin sacrifice (-£3.3K).',
        is_current: true
      },
      {
        id: 'play_cognix',
        name: 'CogniX Recommended',
        badge: 'Pareto Optimal',
        discount_pct: 14,
        stores_count: 18,
        duration_days: 9,
        expected_demand_uplift_pct: 38.6,
        net_contribution_delta_gbp: 4120,
        supply_exposure: 'LOW',
        waste_impact_pct: -3.8,
        rationale: 'Concentrated 14% discount across 18 high-opportunity stores, securing +£4.1K net profit.',
        is_recommended: true
      },
      {
        id: 'play_margin',
        name: 'Margin Optimised',
        badge: 'Profit Focus',
        discount_pct: 10,
        stores_count: 24,
        duration_days: 14,
        expected_demand_uplift_pct: 24.5,
        net_contribution_delta_gbp: 3420,
        supply_exposure: 'LOW',
        waste_impact_pct: -2.1,
        rationale: 'Conservative 10% price reduction protecting unit economics while capturing +24.5% demand.'
      },
      {
        id: 'play_volume',
        name: 'Demand Maximised',
        badge: 'Volume Surge',
        discount_pct: 25,
        stores_count: 50,
        duration_days: 14,
        expected_demand_uplift_pct: 58.2,
        net_contribution_delta_gbp: -7850,
        supply_exposure: 'CRITICAL',
        waste_impact_pct: -6.0,
        rationale: 'Aggressive 25% price cut to gain top-line volume (+58.2%) with heavy contribution loss.'
      },
      {
        id: 'play_conservative',
        name: 'Targeted Weekend Burst',
        badge: 'Low Risk',
        discount_pct: 12,
        stores_count: 12,
        duration_days: 4,
        expected_demand_uplift_pct: 18.4,
        net_contribution_delta_gbp: 1950,
        supply_exposure: 'LOW',
        waste_impact_pct: -1.5,
        rationale: 'Short 4-day weekend campaign targeting only core superstores.'
      }
    ],

    inverse_conditions: [
      {
        id: 'inv_1',
        condition_text: 'Supplier promotional co-funding >= £3,400',
        target_parameter: 'SUPPLIER_FUNDING',
        target_value: 3400,
        target_display: '£3.4K funding',
        explanation: 'If supplier SUP002 provides £3,400 in trade funding, the national 20% discount achieves commercial breakeven.',
        modelling_action_label: 'Model Supplier Funding →'
      },
      {
        id: 'inv_2',
        condition_text: 'Promotional discount depth <= 14.2%',
        target_parameter: 'DISCOUNT_DEPTH',
        target_value: 14,
        target_display: '14% discount',
        explanation: 'Reducing discount from 20% to 14% prevents margin compression and produces +£4,120 net value.',
        modelling_action_label: 'Adopt 14% Discount →'
      },
      {
        id: 'inv_3',
        condition_text: 'Campaign store scope <= 18 high-yield stores',
        target_parameter: 'STORE_SCOPE',
        target_value: 18,
        target_display: '18 stores',
        explanation: 'Pruning 32 low-yield stores eliminates £2,800 of margin drag while retaining 71% of incremental demand.',
        modelling_action_label: 'Target 18 Stores →'
      },
      {
        id: 'inv_4',
        condition_text: 'Demand uplift >= 61.5% (under 20% discount)',
        target_parameter: 'DEMAND_UPLIFT',
        target_value: 61.5,
        target_display: '+61.5% uplift',
        explanation: 'Volume would need to increase by 61.5% rather than 48.0% to offset the 20% price erosion.',
        modelling_action_label: 'Test Elasticity Sensitivity →'
      }
    ],

    change_triggers: [
      {
        trigger_id: 'trig_1',
        boundary_condition: 'Supplier delivery capability drops below 45,000 units',
        decision_shift: 'Conditional Go → No Go (Supply Veto)',
        severity: 'VETO',
        monitored_signal: 'SUP002 Weekly Factory Headroom'
      },
      {
        trigger_id: 'trig_2',
        boundary_condition: 'DC forward cover falls below 6.0 days',
        decision_shift: 'National Scope → Regional Restriction',
        severity: 'WARNING',
        monitored_signal: 'Regional Distribution Center Stock Index'
      },
      {
        trigger_id: 'trig_3',
        boundary_condition: 'Supplier promotional rebate confirmed > £3,400',
        decision_shift: 'National 20% campaign becomes economically accretive',
        severity: 'OPPORTUNITY',
        monitored_signal: 'Commercial Terms Confirmation'
      }
    ],

    signal_hypotheses: [
      {
        signal_id: 'SIG-CHILLED-01',
        signal_headline: 'Depot stock buildup in North West DC (9.2 days cover vs 5.5 baseline).',
        signal_source: 'Seeded DC inventory signal (demo, ESF-2 shape)',
        observed_metric: '+67% inventory buffer',
        hypothesis_statement: 'A concentrated 14% promotion across 18 North West / Midlands stores will drain depot buffer without national margin sacrifice.',
        test_action_label: 'Test Regional Clearance Hypothesis →',
        test_result: {
          verdict: 'SUPPORTED',
          explanation: 'Regional simulation confirms North West and Midlands stores absorb 14,200 units, returning DC cover to 5.8 days while delivering +£4.1K net profit.',
          proposed_intervention: { discount: 14, region: 'North West & Midlands', duration: 9, scope: 18 }
        }
      },
      {
        signal_id: 'SIG-CHILLED-02',
        signal_headline: 'Rival supermarket launched 15% discount on private label cheese.',
        signal_source: 'Seeded competitive price signal (demo)',
        observed_metric: 'Rival price £2.19 (-12%)',
        hypothesis_statement: 'Matching competitor at 20% nationally will trigger severe margin war; 14% selective promo retains premium shopper share safely.',
        test_action_label: 'Test Defensive Posture Hypothesis →',
        test_result: {
          verdict: 'SUPPORTED',
          explanation: '14% targeted discount defends 94% of brand volume against rival without entering unprofitable price erosion.',
          proposed_intervention: { discount: 14, region: 'National Targeted', duration: 14, scope: 24 }
        }
      }
    ],

    decision_graph: {
      nodes: [
        { id: 'n_sig1', label: 'DC Stock Buildup Signal', category: 'SIGNAL', provenance: 'SEEDED_OBSERVATION', summary: 'North West depot holds 9.2 days stock', detail: 'Seeded depot inventory snapshot from the demonstration world model (Warrington Regional DC).' },
        { id: 'n_sig2', label: 'Competitor Price Cut', category: 'SIGNAL', provenance: 'SEEDED_OBSERVATION', summary: 'Rival discounted cheddar to £2.19', detail: 'Seeded competitor price observation from the demonstration world model (SKU P004).' },
        { id: 'n_ev1', label: 'Price Elasticity Model', category: 'EVIDENCE', provenance: 'DERIVED', summary: 'Price elasticity ε = 2.4 (High)', detail: 'Econometric regression over past 52 weeks promotion cycles.' },
        { id: 'n_hyp1', label: 'Targeted Regional Uplift', category: 'HYPOTHESIS', provenance: 'DERIVED', summary: 'Regional promo clears stock profitably', detail: 'Hypothesis that 18 stores generate 71% of volume response.' },
        { id: 'n_opp1', label: 'North West High Opportunity', category: 'DEMAND', provenance: 'DERIVED', summary: 'Opportunity Index: 91/100', detail: 'High demand propensity + stock headroom in North West.' },
        { id: 'n_econ1', label: 'National Margin Erosion Risk', category: 'ECONOMICS', provenance: 'DERIVED', summary: 'National 20% promo loses -£3.3K', detail: 'Unit contribution falls from £0.67 to £0.576 across 50 stores.' },
        { id: 'n_dec1', label: 'CONDITIONAL GO Verdict', category: 'DECISION', provenance: 'DERIVED', summary: 'Reconfigure to 14% / 18 stores', detail: 'Approve only under focused store scope and shallower discount.' },
        { id: 'n_int1', label: 'Proposed Intervention', category: 'INTERVENTION', provenance: 'DERIVED', summary: '14% / 18 stores / 9 days (+£4.1K)', detail: 'Rebalanced campaign ready for executive commitment.' }
      ],
      links: [
        { from: 'n_sig1', to: 'n_hyp1', label: 'informs' },
        { from: 'n_sig2', to: 'n_hyp1', label: 'informs' },
        { from: 'n_ev1', to: 'n_opp1', label: 'powers' },
        { from: 'n_hyp1', to: 'n_opp1', label: 'focuses' },
        { from: 'n_opp1', to: 'n_econ1', label: 'feeds' },
        { from: 'n_econ1', to: 'n_dec1', label: 'governs' },
        { from: 'n_dec1', to: 'n_int1', label: 'generates' }
      ]
    },

    decision_twin: {
      telemetry_basis: 'SIMULATED_DEMO',
      flight_days: 14,
      current_day: 5,
      is_decision_still_valid: 'STILL VALID',
      validity_confidence: 'HIGH',
      conditions_changed_count: 1,
      interventions_recommended_count: 1,
      executive_summary: 'Campaign is tracking at +42% demand (vs +39% expected). North West stores are outperforming expectation, while London stores show mild margin lag.',
      telemetry_streams: [
        { day_index: 1, day_label: 'Day 1', expected_demand_index: 125, observed_demand_index: 124, expected_margin_gbp: 450, observed_margin_gbp: 442, expected_inventory_units: 48000, observed_inventory_units: 47900, deviation_status: 'ON_TRACK' },
        { day_index: 2, day_label: 'Day 2', expected_demand_index: 132, observed_demand_index: 135, expected_margin_gbp: 520, observed_margin_gbp: 531, expected_inventory_units: 45000, observed_inventory_units: 44600, deviation_status: 'ON_TRACK' },
        { day_index: 3, day_label: 'Day 3', expected_demand_index: 138, observed_demand_index: 144, expected_margin_gbp: 580, observed_margin_gbp: 610, expected_inventory_units: 41800, observed_inventory_units: 41000, deviation_status: 'MILD_DRIFT' },
        { day_index: 4, day_label: 'Day 4', expected_demand_index: 140, observed_demand_index: 148, expected_margin_gbp: 610, observed_margin_gbp: 645, expected_inventory_units: 38200, observed_inventory_units: 37100, deviation_status: 'MILD_DRIFT' },
        { day_index: 5, day_label: 'Day 5 (Today)', expected_demand_index: 142, observed_demand_index: 152, expected_margin_gbp: 630, observed_margin_gbp: 672, expected_inventory_units: 34500, observed_inventory_units: 32900, deviation_status: 'MILD_DRIFT' }
      ],
      deviations: [
        {
          id: 'dev_1',
          title: 'North West demand velocity outperforming plan by +14%',
          severity: 'POSITIVE_OPPORTUNITY',
          metric: 'North West Daily Sales Rate',
          expected_value: '182 units/day',
          actual_value: '208 units/day (+14.3%)',
          impact_summary: 'Store stock in 3 Manchester superstores will deplete 2.5 days earlier than planned.',
          recommended_in_flight_action: {
            title: 'Trigger Mid-Campaign Depot Stock Reallocation',
            action_type: 'REALLOCATE_INVENTORY',
            description: 'Transfer 2,400 units from London distribution buffer to Warrington DC to avoid stockout on Day 9.',
            current_vs_proposed: {
              current: { depot_transfer_units: 0, manchester_cover_days: 3.8 },
              proposed: { depot_transfer_units: 2400, manchester_cover_days: 6.5 },
              expected_recovery: 'Protects £1,480 in potential stockout revenue without changing promo pricing.'
            }
          }
        }
      ],
      post_campaign_learning: {
        what_we_believed: 'National 20% discount would drive gross volume across all regions equally.',
        what_we_expected: '+48% demand surge, -£3.3K net contribution nationally.',
        what_we_decided: 'Accepted CogniX recommendation to reconfigure to 14% discount across 18 high-yield stores.',
        interventions_applied: 'Day 5: Reallocated 2,400 units to North West depot to prevent weekend stockout.',
        what_actually_happened: '+41.2% demand uplift achieved; +£4,280 net contribution realised; zero store stockouts.',
        what_cognix_learned: 'Confirmed high price elasticity (ε=2.38) in North West superstores; validated 14% discount inflection threshold.',
        learning_case_status: 'NON_AUTHORITATIVE'
      }
    }
  },

  'ARCH-PREMIUM-ARTISAN': {
    id: 'ARCH-PREMIUM-ARTISAN',
    name: 'Premium Low-Elasticity Bakery',
    tagline: 'Brand equity led with low price elasticity (ε=0.8); price cuts erode value',
    category: 'Bakery',
    default_sku: 'P023',
    sku_name: 'White Sourdough 800g',
    cost_price: 0.89,
    rrp: 1.39,
    base_weekly_units_per_store: 42,
    price_elasticity: 0.8,
    cannibalisation_rate: 0.04,
    default_discount_pct: 15,
    default_duration_days: 14,
    default_region: 'London',
    default_mechanic: 'price_cut',
    default_objective: 'CONTRIBUTION',
    intervention_posture: 'CONSIDER_PROMOTION',

    discovery: {
      headline: 'CogniX found low elasticity: price cut erodes margin with negligible volume gain',
      core_narrative: 'White Sourdough demand is inelastic (ε=0.8). A 15% price cut yields only +12% volume, destroying £1,850 in category contribution.',
      key_finding: 'Customers buy sourdough on quality, not price. A bundle offer (Sourdough + Artisanal Butter @ 10% pkg) creates +£2,200 margin.',
      decision_verdict: 'MARGIN RISK',
      confidence: 'HIGH',
      expected_demand_uplift_pct: 12.0,
      net_contribution_delta_gbp: -1850,
      primary_tension_title: 'Primary Tension: Brand Value ↔ Discount Volume',
      primary_tension_description: 'Deep price discounting on artisan bread damages premium price perception while failing to recruit incremental shoppers.',
      dominant_conflict: ['Margin Protection', 'Brand Integrity']
    },

    waterfall: [
      { id: 'wf_base', label: 'Baseline Run-Rate', driver_class: 'ambient', contribution_pp: 100.0, value_display: '100.0 pp', rationale: 'Stable artisan bakery baseline.', provenance: 'SEEDED_OBSERVATION' },
      { id: 'wf_elas', label: 'Price Elasticity (15% Cut)', driver_class: 'intervention', contribution_pp: 9.6, value_display: '+9.6 pp', rationale: 'Subdued volume response on premium line.', provenance: 'DERIVED' },
      { id: 'wf_media', label: 'In-Store Merchandising', driver_class: 'intervention', contribution_pp: 3.2, value_display: '+3.2 pp', rationale: 'Bakery counter premium placement.', provenance: 'SIMULATED' },
      { id: 'wf_cann', label: 'Cannibalisation (Seeded Loaf)', driver_class: 'intervention', contribution_pp: -0.8, value_display: '-0.8 pp', rationale: 'Minor shift from seeded loaf.', provenance: 'DERIVED' },
      { id: 'wf_net', label: 'Net Attributable Demand', driver_class: 'intervention', contribution_pp: 12.0, value_display: '+12.0 pp', rationale: 'Total incremental demand from price cut.', provenance: 'DERIVED' }
    ],

    elasticity_curve: [
      { discount_pct: 0, expected_demand_uplift_pct: 0, unit_contribution_gbp: 0.50, net_contribution_delta_gbp: 0, notes: 'Full margin baseline' },
      { discount_pct: 5, expected_demand_uplift_pct: 4.0, unit_contribution_gbp: 0.483, net_contribution_delta_gbp: -210, notes: 'Mild margin leakage' },
      { discount_pct: 10, expected_demand_uplift_pct: 8.0, unit_contribution_gbp: 0.465, net_contribution_delta_gbp: -840, notes: 'Suboptimal' },
      { discount_pct: 15, expected_demand_uplift_pct: 12.0, unit_contribution_gbp: 0.448, net_contribution_delta_gbp: -1850, is_current: true, notes: 'Current plan — loss making' },
      { discount_pct: 20, expected_demand_uplift_pct: 16.0, unit_contribution_gbp: 0.430, net_contribution_delta_gbp: -3200, notes: 'Deeply destructive' }
    ],

    opportunity_matrix: [
      {
        region: 'London',
        window_label: 'Sat – Sun Morning',
        opportunity_index: 86,
        tier: 'PREFERRED',
        store_count: 6,
        factors: [
          { factor_id: 'f1', label: 'Breakfast Mission Affluence', points: 32, rationale: 'High artisan bakery penetration in Shoreditch & Brixton' },
          { factor_id: 'f2', label: 'Cross-Sell Potential', points: 26, rationale: '84% attachment to specialty butter/preserves' },
          { factor_id: 'f3', label: 'Price Inelasticity', points: 18, rationale: 'Shoppers insensitive to 20p price delta' },
          { factor_id: 'f4', label: 'Freshness Driver', points: 10, rationale: 'Morning bake times dictate sales rate' }
        ],
        recommended_action: {
          label: 'Deploy Breakfast Attachment Bundle',
          type: 'EXPLOIT',
          description: 'Bundle Sourdough with Unsalted Butter (P007) at 10% package discount instead of discounting bread alone.',
          target_discount: 10,
          target_stores: 6,
          target_duration: 14
        }
      },
      {
        region: 'North West',
        window_label: 'Sat – Sun Morning',
        opportunity_index: 52,
        tier: 'SUBOPTIMAL',
        store_count: 5,
        factors: [
          { factor_id: 'f1', label: 'Standard Category Demand', points: 18, rationale: 'Moderate specialty bread share' },
          { factor_id: 'f2', label: 'Cross-Sell Potential', points: 16, rationale: 'Standard basket composition' },
          { factor_id: 'f3', label: 'Price Sensitivity', points: 10, rationale: 'Moderate price awareness' },
          { factor_id: 'f4', label: 'Freshness Driver', points: 8, rationale: 'Standard delivery pattern' }
        ],
        recommended_action: {
          label: 'Protect Margin',
          type: 'PROTECT_MARGIN',
          description: 'Maintain RRP; promote via secondary display feature.',
          target_discount: 0,
          target_stores: 5,
          target_duration: 14
        }
      }
    ],

    frontier_plays: [
      {
        id: 'play_current_artisan',
        name: 'Current 15% Price Cut',
        badge: 'Proposed',
        discount_pct: 15,
        stores_count: 20,
        duration_days: 14,
        expected_demand_uplift_pct: 12.0,
        net_contribution_delta_gbp: -1850,
        supply_exposure: 'LOW',
        waste_impact_pct: -0.8,
        rationale: 'Standalone 15% price cut dilutes margin without generating volume scale.',
        is_current: true
      },
      {
        id: 'play_cognix_bundle',
        name: 'Breakfast Bundle Play',
        badge: 'CogniX Recommended',
        discount_pct: 10,
        stores_count: 14,
        duration_days: 14,
        expected_demand_uplift_pct: 22.4,
        net_contribution_delta_gbp: 2240,
        supply_exposure: 'LOW',
        waste_impact_pct: -2.1,
        rationale: 'Cross-merchandise Sourdough + Butter at 10% package discount in London & South East.',
        is_recommended: true
      },
      {
        id: 'play_non_promo_feature',
        name: 'Artisan Display Feature',
        badge: 'Zero Discount',
        discount_pct: 0,
        stores_count: 20,
        duration_days: 14,
        expected_demand_uplift_pct: 14.2,
        net_contribution_delta_gbp: 2650,
        supply_exposure: 'LOW',
        waste_impact_pct: -1.2,
        rationale: 'Full RRP front-of-store bakery display with tasting station — every incremental unit carries full margin, so contribution beats the bundle at lower reach.'
      }
    ],

    inverse_conditions: [
      {
        id: 'inv_art_1',
        condition_text: 'Shift to Cross-Category Bundle (Butter / Jam)',
        target_parameter: 'DISCOUNT_DEPTH',
        target_value: 10,
        target_display: 'Bundle Mechanic',
        explanation: 'Bundling captures incremental cross-category margin without discounting hero bread.',
        modelling_action_label: 'Model Breakfast Bundle →'
      },
      {
        id: 'inv_art_2',
        condition_text: 'Supplier bakery funding >= £2,100',
        target_parameter: 'SUPPLIER_FUNDING',
        target_value: 2100,
        target_display: '£2.1K funding',
        explanation: 'Supplier SUP011 trade contribution required to neutralize price erosion.',
        modelling_action_label: 'Model Trade Funding →'
      }
    ],

    change_triggers: [
      {
        trigger_id: 'trig_art_1',
        boundary_condition: 'Artisan bakery morning sell-through rate drops below 70%',
        decision_shift: 'Move to afternoon mark-down rule',
        severity: 'WARNING',
        monitored_signal: 'Seeded POS scan signal (demo world model)'
      }
    ],

    signal_hypotheses: [
      {
        signal_id: 'SIG-BAKERY-01',
        signal_headline: 'Morning basket cross-scan correlation with Unsalted Butter is 0.76 in London stores.',
        signal_source: 'Seeded basket affinity signal (demo)',
        observed_metric: '76% co-purchase rate',
        hypothesis_statement: 'A packaged bundle promotion creates higher basket margin than discounting sourdough alone.',
        test_action_label: 'Test Bundle Attachment Hypothesis →',
        test_result: {
          verdict: 'SUPPORTED',
          explanation: 'Bundle simulation delivers +22.4% volume uplift and +£2,240 net contribution with zero brand dilution.',
          proposed_intervention: { discount: 10, region: 'London Metro', duration: 14, scope: 14 }
        }
      }
    ],

    decision_graph: {
      nodes: [
        { id: 'n_b_sig', label: 'Basket Attachment Signal', category: 'SIGNAL', provenance: 'SEEDED_OBSERVATION', summary: '76% butter co-purchase rate', detail: 'Seeded basket affinity model (demonstration world model).' },
        { id: 'n_b_ev', label: 'Inelastic Demand Curve', category: 'EVIDENCE', provenance: 'DERIVED', summary: 'Price elasticity ε = 0.8', detail: 'Regression over 38 premium bakery lines.' },
        { id: 'n_b_dec', label: 'MARGIN RISK Verdict', category: 'DECISION', provenance: 'DERIVED', summary: 'Reject standalone price cut', detail: 'Price cuts yield negative contribution.' },
        { id: 'n_b_int', label: 'Breakfast Bundle Plan', category: 'INTERVENTION', provenance: 'DERIVED', summary: '10% package discount (+£2.2K)', detail: 'High margin multi-buy package.' }
      ],
      links: [
        { from: 'n_b_sig', to: 'n_b_ev', label: 'contextualises' },
        { from: 'n_b_ev', to: 'n_b_dec', label: 'proves' },
        { from: 'n_b_dec', to: 'n_b_int', label: 'recommends' }
      ]
    },

    decision_twin: {
      telemetry_basis: 'SIMULATED_DEMO',
      flight_days: 14,
      current_day: 4,
      is_decision_still_valid: 'RECONSIDER',
      validity_confidence: 'HIGH',
      conditions_changed_count: 2,
      interventions_recommended_count: 1,
      executive_summary: 'Standalone 15% discount is tracking -£420 below contribution expectation. Shoppers are purchasing without incremental basket expansion.',
      telemetry_streams: [
        { day_index: 1, day_label: 'Day 1', expected_demand_index: 112, observed_demand_index: 106, expected_margin_gbp: 180, observed_margin_gbp: 142, expected_inventory_units: 2400, observed_inventory_units: 2360, deviation_status: 'MILD_DRIFT' },
        { day_index: 2, day_label: 'Day 2', expected_demand_index: 112, observed_demand_index: 108, expected_margin_gbp: 180, observed_margin_gbp: 148, expected_inventory_units: 2200, observed_inventory_units: 2140, deviation_status: 'MILD_DRIFT' },
        { day_index: 3, day_label: 'Day 3', expected_demand_index: 112, observed_demand_index: 107, expected_margin_gbp: 180, observed_margin_gbp: 144, expected_inventory_units: 2000, observed_inventory_units: 1930, deviation_status: 'SEVERE_DEVIATION' },
        { day_index: 4, day_label: 'Day 4 (Today)', expected_demand_index: 112, observed_demand_index: 109, expected_margin_gbp: 180, observed_margin_gbp: 146, expected_inventory_units: 1800, observed_inventory_units: 1710, deviation_status: 'SEVERE_DEVIATION' }
      ],
      deviations: [
        {
          id: 'dev_b1',
          title: 'Margin deterioration: Volume +8% insufficient to cover 15% price cut',
          severity: 'CRITICAL',
          metric: 'Daily Contribution GBP',
          expected_value: '£180/day',
          actual_value: '£146/day (-18.8%)',
          impact_summary: 'Cumulative margin leakage of £140 across first 4 days.',
          recommended_in_flight_action: {
            title: 'Convert In-Flight Price Cut to Breakfast Multi-Buy',
            action_type: 'REDUCE_DISCOUNT',
            description: 'Reset sourdough standalone shelf price to RRP (£1.39) and activate 10% combo discount with Unsalted Butter.',
            current_vs_proposed: {
              current: { shelf_price_gbp: 1.18, daily_contribution_gbp: 146 },
              proposed: { shelf_price_gbp: 1.39, bundle_discount_pct: 10, estimated_daily_contribution: 215 },
              expected_recovery: 'Recovers £690 in remaining 10 days of campaign window.'
            }
          }
        }
      ],
      post_campaign_learning: {
        what_we_believed: 'Discounting premium sourdough would recruit new volume.',
        what_we_expected: '+12% volume, -£1.85K contribution.',
        what_we_decided: 'Shifted in-flight to breakfast multi-buy combo.',
        interventions_applied: 'Converted shelf price to RRP on Day 4 and enabled combo barcode promotion.',
        what_actually_happened: 'Category contribution improved by +£1,680; cross-sell volume increased by 31%.',
        what_cognix_learned: 'Confirmed that premium bakery price elasticity is < 1.0; future campaigns must utilize non-price bundle posture.',
        learning_case_status: 'NON_AUTHORITATIVE'
      }
    }
  },

  'ARCH-CLEARANCE-PRODUCE': {
    id: 'ARCH-CLEARANCE-PRODUCE',
    name: 'Excess Inventory Produce Clearance',
    tagline: 'Perishable stock surge (+12.4% waste risk); urgent localized clearance needed',
    category: 'Produce',
    default_sku: 'P020',
    sku_name: 'Broccoli Head',
    cost_price: 0.42,
    rrp: 0.65,
    base_weekly_units_per_store: 160,
    price_elasticity: 3.1,
    cannibalisation_rate: 0.02,
    default_discount_pct: 25,
    default_duration_days: 7,
    default_region: 'North West',
    default_mechanic: 'price_cut',
    default_objective: 'WASTE_REDUCTION',
    intervention_posture: 'CONSIDER_PROMOTION',

    discovery: {
      headline: 'CogniX detected localized produce waste surge in North West DC',
      core_narrative: 'Depot stock of Broccoli is 140% above seasonal baseline with 4 days remaining shelf life. A 25% targeted clearance price cut clears 18,400 heads, avoiding £4,600 in landfill waste costs.',
      key_finding: 'Running clearance in North West superstores drains inventory before spoilage while preserving national pricing integrity.',
      decision_verdict: 'ACCRETIVE GO',
      confidence: 'HIGH',
      expected_demand_uplift_pct: 64.0,
      net_contribution_delta_gbp: 1840,
      primary_tension_title: 'Primary Tension: Waste Minimisation ↔ Price Integrity',
      primary_tension_description: 'Fast clearance of perishable produce recovers direct input costs and prevents waste fines without degrading national category pricing.',
      dominant_conflict: ['Waste Minimisation', 'Price Integrity']
    },

    waterfall: [
      { id: 'wf_base_prod', label: 'Baseline Run-Rate', driver_class: 'ambient', contribution_pp: 100.0, value_display: '100.0 pp', rationale: 'Standard daily produce run-rate.', provenance: 'SEEDED_OBSERVATION' },
      { id: 'wf_elas_prod', label: 'Clearance Price Cut (25%)', driver_class: 'intervention', contribution_pp: 52.0, value_display: '+52.0 pp', rationale: 'Strong volume acceleration on staple veg.', provenance: 'DERIVED' },
      { id: 'wf_merch_prod', label: 'Front of Store Bin Feature', driver_class: 'intervention', contribution_pp: 12.0, value_display: '+12.0 pp', rationale: 'High visibility produce entrance bins.', provenance: 'SIMULATED' },
      { id: 'wf_net_prod', label: 'Net Clearance Demand', driver_class: 'intervention', contribution_pp: 64.0, value_display: '+64.0 pp', rationale: 'Total incremental sell-through.', provenance: 'DERIVED' }
    ],

    elasticity_curve: [
      { discount_pct: 0, expected_demand_uplift_pct: 0, unit_contribution_gbp: 0.23, net_contribution_delta_gbp: 0, notes: 'High waste spoilage trajectory' },
      { discount_pct: 15, expected_demand_uplift_pct: 35.0, unit_contribution_gbp: 0.198, net_contribution_delta_gbp: 1120, notes: 'Partial clearance' },
      { discount_pct: 25, expected_demand_uplift_pct: 64.0, unit_contribution_gbp: 0.168, net_contribution_delta_gbp: 1840, is_cognix_recommended: true, is_current: true, notes: 'Optimal inventory burn-down' },
      { discount_pct: 35, expected_demand_uplift_pct: 82.0, unit_contribution_gbp: 0.137, net_contribution_delta_gbp: 860, notes: 'Unnecessary deep discount' }
    ],

    opportunity_matrix: [
      {
        region: 'North West',
        window_label: 'Mon – Sun (7 Days)',
        opportunity_index: 96,
        tier: 'PREFERRED',
        store_count: 8,
        factors: [
          { factor_id: 'f1', label: 'Excess Depot Buffer', points: 38, rationale: 'Warrington DC holds 18,400 excess units due to supplier harvest surge' },
          { factor_id: 'f2', label: 'Waste Risk Index', points: 32, rationale: 'Perishable shelf-life expiry in 4.5 days' },
          { factor_id: 'f3', label: 'Sell-Through Velocity', points: 18, rationale: 'Superstore produce bins achieve 94% sell-through' },
          { factor_id: 'f4', label: 'Cost Avoidance', points: 8, rationale: 'Avoids £4.6K waste tipping fees' }
        ],
        recommended_action: {
          label: 'Clear Regional Inventory',
          type: 'CLEAR_INVENTORY',
          description: 'Deploy 25% clearance price cut across 8 North West superstores for 7 days.',
          target_discount: 25,
          target_stores: 8,
          target_duration: 7
        }
      }
    ],

    frontier_plays: [
      {
        id: 'play_nw_clearance',
        name: 'Targeted NW Clearance (25%)',
        badge: 'Recommended',
        discount_pct: 25,
        stores_count: 8,
        duration_days: 7,
        expected_demand_uplift_pct: 64.0,
        net_contribution_delta_gbp: 1840,
        supply_exposure: 'LOW',
        waste_impact_pct: -68.0,
        rationale: 'Quick 7-day clearance draining 18.4K heads, saving £4.6K in waste.',
        is_recommended: true,
        is_current: true
      },
      {
        id: 'play_nat_clearance',
        name: 'National Blanket Clearance',
        badge: 'Overkill',
        discount_pct: 25,
        stores_count: 50,
        duration_days: 7,
        expected_demand_uplift_pct: 64.0,
        net_contribution_delta_gbp: -2400,
        supply_exposure: 'HIGH',
        waste_impact_pct: -72.0,
        rationale: 'National promotion discounts unaffected southern depots unnecessarily.'
      }
    ],

    inverse_conditions: [
      {
        id: 'inv_c1',
        condition_text: 'Restrict promotion to North West DC catchment',
        target_parameter: 'STORE_SCOPE',
        target_value: 8,
        target_display: '8 NW Stores',
        explanation: 'Targeting affected region prevents unnecessary margin dilution across unaffected stores.',
        modelling_action_label: 'Confirm Regional Scope →'
      }
    ],

    change_triggers: [
      {
        trigger_id: 'trig_c1',
        boundary_condition: 'Depot stock falls below 2.0 days cover',
        decision_shift: 'Immediate return to standard RRP pricing',
        severity: 'OPPORTUNITY',
        monitored_signal: 'Warrington DC Stock Level'
      }
    ],

    signal_hypotheses: [
      {
        signal_id: 'SIG-PRODUCE-01',
        signal_headline: 'Supplier harvest delivery surged by +140% into Warrington DC.',
        signal_source: 'Seeded inbound delivery signal (demo)',
        observed_metric: '+140% delivery volume',
        hypothesis_statement: 'A 25% regional promotion in North West superstores will clear 18.4K units in 6 days before spoilage.',
        test_action_label: 'Simulate Spoilage Clearance →',
        test_result: {
          verdict: 'SUPPORTED',
          explanation: 'Clearance simulation drains 18,400 heads in 5.8 days with 96% fresh sell-through, avoiding £4.6K waste loss.',
          proposed_intervention: { discount: 25, region: 'North West', duration: 7, scope: 8 }
        }
      }
    ],

    decision_graph: {
      nodes: [
        { id: 'n_c_sig', label: 'Harvest Surge Signal', category: 'SIGNAL', provenance: 'SEEDED_OBSERVATION', summary: '+140% Broccoli delivery', detail: 'Seeded inbound delivery snapshot (demonstration world model).' },
        { id: 'n_c_ev', label: 'Shelf Life Expiry Model', category: 'EVIDENCE', provenance: 'DERIVED', summary: '4.5 days spoilage horizon', detail: 'Produce degradation timeline.' },
        { id: 'n_c_dec', label: 'ACCRETIVE GO Verdict', category: 'DECISION', provenance: 'DERIVED', summary: 'Approve 25% NW Clearance', detail: 'Prevents waste loss.' },
        { id: 'n_c_int', label: 'Clearance Execution Brief', category: 'INTERVENTION', provenance: 'DERIVED', summary: '25% / 8 stores / 7 days (+£1.8K)', detail: 'Direct store dispatch.' }
      ],
      links: [
        { from: 'n_c_sig', to: 'n_c_ev', label: 'triggers' },
        { from: 'n_c_ev', to: 'n_c_dec', label: 'necessitates' },
        { from: 'n_c_dec', to: 'n_c_int', label: 'deploys' }
      ]
    },

    decision_twin: {
      telemetry_basis: 'SIMULATED_DEMO',
      flight_days: 7,
      current_day: 3,
      is_decision_still_valid: 'STILL VALID',
      validity_confidence: 'HIGH',
      conditions_changed_count: 0,
      interventions_recommended_count: 0,
      executive_summary: 'Clearance is tracking at +68% volume burn-down. Depot buffer has reduced from 18,400 to 7,200 units on track for complete sell-through on Day 6.',
      telemetry_streams: [
        { day_index: 1, day_label: 'Day 1', expected_demand_index: 160, observed_demand_index: 164, expected_margin_gbp: 280, observed_margin_gbp: 292, expected_inventory_units: 18400, observed_inventory_units: 18100, deviation_status: 'ON_TRACK' },
        { day_index: 2, day_label: 'Day 2', expected_demand_index: 164, observed_demand_index: 170, expected_margin_gbp: 290, observed_margin_gbp: 304, expected_inventory_units: 14200, observed_inventory_units: 13500, deviation_status: 'ON_TRACK' },
        { day_index: 3, day_label: 'Day 3 (Today)', expected_demand_index: 164, observed_demand_index: 168, expected_margin_gbp: 290, observed_margin_gbp: 301, expected_inventory_units: 10000, observed_inventory_units: 9200, deviation_status: 'ON_TRACK' }
      ],
      deviations: [],
      post_campaign_learning: {
        what_we_believed: 'Perishable broccoli stock would spoil without deep regional cut.',
        what_we_expected: '+64% clearance volume, +£1.84K net contribution.',
        what_we_decided: 'Approved 25% targeted clearance across 8 North West superstores.',
        interventions_applied: 'None required — plan tracked on curve.',
        what_actually_happened: 'Cleared 18,620 units in 6.2 days; waste reduced by 94%; £4.7K waste cost avoided.',
        what_cognix_learned: 'Validated high produce price elasticity (ε=3.1) for perishable produce clearance.',
        learning_case_status: 'NON_AUTHORITATIVE'
      }
    }
  },

  'ARCH-SUPPLY-CONSTRAINED': {
    id: 'ARCH-SUPPLY-CONSTRAINED',
    name: 'Supplier-Constrained Chilled Fish',
    tagline: 'High consumer pull with binding supplier capacity cap at 41k units',
    category: 'Chilled',
    default_sku: 'P048',
    sku_name: 'Atlantic Salmon Fillet 300g',
    cost_price: 3.45,
    rrp: 4.99,
    base_weekly_units_per_store: 48,
    price_elasticity: 2.2,
    cannibalisation_rate: 0.05,
    default_discount_pct: 20,
    default_duration_days: 14,
    default_region: 'National',
    default_mechanic: 'price_cut',
    default_objective: 'VOLUME',
    intervention_posture: 'CONSIDER_PROMOTION',

    discovery: {
      headline: 'CogniX detected binding supplier capacity cliff at 41,000 units',
      core_narrative: 'A national 20% promotion on Atlantic Salmon will generate 45,200 units of demand, exceeding supplier SUP006 weekly production cap by 4,200 units and causing stockouts across 16 stores.',
      key_finding: 'Restricting campaign to 28 top seafood stores caps demand at 38,400 units within supplier limits, maximising sell-through without stockout penalties.',
      decision_verdict: 'SUPPLY INFEASIBLE',
      confidence: 'HIGH',
      expected_demand_uplift_pct: 44.0,
      net_contribution_delta_gbp: 4850,
      primary_tension_title: 'Primary Tension: Demand Generation ↔ Supplier Resilience',
      primary_tension_description: 'Creating more consumer demand than supplier supply chains can fulfill generates out-of-stocks, customer dissatisfaction, and SLA breach penalties.',
      dominant_conflict: ['Demand Creation', 'Supply Resilience']
    },

    waterfall: [
      { id: 'wf_s_base', label: 'Baseline Run-Rate', driver_class: 'ambient', contribution_pp: 100.0, value_display: '100.0 pp', rationale: 'Standard salmon fillet velocity.', provenance: 'SEEDED_OBSERVATION' },
      { id: 'wf_s_elas', label: 'Price Elasticity (20% Cut)', driver_class: 'intervention', contribution_pp: 35.2, value_display: '+35.2 pp', rationale: 'High demand pull on chilled fish.', provenance: 'DERIVED' },
      { id: 'wf_s_media', label: 'Feature Space Support', driver_class: 'intervention', contribution_pp: 8.8, value_display: '+8.8 pp', rationale: 'Chilled fish aisle banner.', provenance: 'SIMULATED' },
      { id: 'wf_s_net', label: 'Unconstrained Demand', driver_class: 'intervention', contribution_pp: 44.0, value_display: '+44.0 pp', rationale: 'Demand exceeds supplier cap by 4.2K units.', provenance: 'DERIVED' }
    ],

    elasticity_curve: [
      { discount_pct: 0, expected_demand_uplift_pct: 0, unit_contribution_gbp: 1.54, net_contribution_delta_gbp: 0, notes: 'Baseline run-rate' },
      { discount_pct: 12, expected_demand_uplift_pct: 26.0, unit_contribution_gbp: 1.41, net_contribution_delta_gbp: 3950, is_cognix_recommended: true, notes: 'Feasible within supplier cap' },
      { discount_pct: 20, expected_demand_uplift_pct: 44.0, unit_contribution_gbp: 1.32, net_contribution_delta_gbp: 4850, is_current: true, notes: 'National plan exceeds supplier capacity' },
      { discount_pct: 25, expected_demand_uplift_pct: 55.0, unit_contribution_gbp: 1.26, net_contribution_delta_gbp: 3100, notes: 'Massive stockout penalties' }
    ],

    opportunity_matrix: [
      {
        region: 'National',
        window_label: '14 Days Window',
        opportunity_index: 42,
        tier: 'AVOID',
        store_count: 50,
        factors: [
          { factor_id: 'f0', label: 'National Demand Pull', points: 82, rationale: 'Strong national demand propensity for promoted salmon fillet' },
          { factor_id: 'f1', label: 'Supplier Cap Violation', points: -25, rationale: 'Demand (45.2K) exceeds SUP006 capacity (41.0K) by 4.2K units' },
          { factor_id: 'f2', label: 'Stockout Risk', points: -15, rationale: 'Predicted stockout in 16 stores on Day 10' }
        ],
        recommended_action: {
          label: 'Model Capacity Constraint',
          type: 'RESTRICT_SCOPE',
          description: 'Prune scope to 28 stores to remain below 41k capacity ceiling.',
          target_discount: 14,
          target_stores: 28,
          target_duration: 14
        }
      }
    ],

    frontier_plays: [
      {
        id: 'play_s_current',
        name: 'National 20% Plan',
        badge: 'Infeasible',
        discount_pct: 20,
        stores_count: 50,
        duration_days: 14,
        expected_demand_uplift_pct: 44.0,
        net_contribution_delta_gbp: 4850,
        supply_exposure: 'CRITICAL',
        waste_impact_pct: -3.0,
        rationale: 'Exceeds supplier processing limit of 41,000 units.',
        is_current: true
      },
      {
        id: 'play_s_constrained',
        name: 'Capacity-Aligned 28-Store Scope',
        badge: 'Feasible Optimal',
        discount_pct: 15,
        stores_count: 28,
        duration_days: 14,
        expected_demand_uplift_pct: 32.0,
        net_contribution_delta_gbp: 4620,
        supply_exposure: 'LOW',
        waste_impact_pct: -2.8,
        rationale: 'Targets 28 high-affinity stores; caps volume at 37.8K units (92% of supplier limit).',
        is_recommended: true
      }
    ],

    inverse_conditions: [
      {
        id: 'inv_s1',
        condition_text: 'Supplier capacity expansion >= 46,000 units',
        target_parameter: 'SUPPLIER_FUNDING',
        target_value: 46000,
        target_display: '46K capacity',
        explanation: 'Supplier SUP006 must confirm secondary processing line activation to run national promotion.',
        modelling_action_label: 'Model Supplier Expansion →'
      },
      {
        id: 'inv_s2',
        condition_text: 'Store scope <= 28 stores',
        target_parameter: 'STORE_SCOPE',
        target_value: 28,
        target_display: '28 stores',
        explanation: 'Restricting store scope keeps total volume below 41K unit ceiling.',
        modelling_action_label: 'Adopt 28-Store Scope →'
      }
    ],

    change_triggers: [
      {
        trigger_id: 'trig_s1',
        boundary_condition: 'SUP006 confirms secondary shift availability',
        decision_shift: 'Supply Infeasible → Accretive Go',
        severity: 'OPPORTUNITY',
        monitored_signal: 'Supplier Inbound Capacity Telemetry'
      }
    ],

    signal_hypotheses: [
      {
        signal_id: 'SIG-FISH-01',
        signal_headline: 'Supplier SUP006 declared weekly harvest cap of 41,000 packs.',
        signal_source: 'Seeded supplier capacity assumption (demo, ESF-1 shape)',
        observed_metric: '41,000 units ceiling',
        hypothesis_statement: 'A 28-store targeted campaign keeps demand at 37,800 units, capturing 95% of national profit without stockouts.',
        test_action_label: 'Test Capacity Feasibility →',
        test_result: {
          verdict: 'SUPPORTED',
          explanation: 'Restricting to 28 superstores generates 37,800 units, completely avoiding supply breach while delivering £4.62K profit.',
          proposed_intervention: { discount: 15, region: 'Selected 28 Superstores', duration: 14, scope: 28 }
        }
      }
    ],

    decision_graph: {
      nodes: [
        { id: 'n_s_sig', label: 'Supplier Cap Signal', category: 'SIGNAL', provenance: 'SEEDED_OBSERVATION', summary: '41,000 unit capacity cap', detail: 'Seeded supplier capacity assumption (demonstration world model).' },
        { id: 'n_s_ev', label: 'Demand Over-Run Projection', category: 'EVIDENCE', provenance: 'DERIVED', summary: '45,200 unit demand (+4.2K deficit)', detail: 'Causal demand engine calculation.' },
        { id: 'n_s_dec', label: 'SUPPLY INFEASIBLE Verdict', category: 'DECISION', provenance: 'DERIVED', summary: 'Reject national campaign scope', detail: 'Supply cliff veto.' },
        { id: 'n_s_int', label: 'Capacity-Aligned Brief', category: 'INTERVENTION', provenance: 'DERIVED', summary: '15% / 28 stores (+£4.62K)', detail: 'Realigned execution plan.' }
      ],
      links: [
        { from: 'n_s_sig', to: 'n_s_ev', label: 'constrains' },
        { from: 'n_s_ev', to: 'n_s_dec', label: 'proves' },
        { from: 'n_s_dec', to: 'n_s_int', label: 'resolves' }
      ]
    },

    decision_twin: {
      telemetry_basis: 'SIMULATED_DEMO',
      flight_days: 14,
      current_day: 5,
      is_decision_still_valid: 'STILL VALID',
      validity_confidence: 'HIGH',
      conditions_changed_count: 0,
      interventions_recommended_count: 0,
      executive_summary: 'Targeted 28-store campaign is tracking at 13,800 units on Day 5 (36.5% of total capacity), within planned supplier delivery headroom.',
      telemetry_streams: [
        { day_index: 1, day_label: 'Day 1', expected_demand_index: 130, observed_demand_index: 128, expected_margin_gbp: 320, observed_margin_gbp: 314, expected_inventory_units: 38000, observed_inventory_units: 37900, deviation_status: 'ON_TRACK' },
        { day_index: 2, day_label: 'Day 2', expected_demand_index: 132, observed_demand_index: 131, expected_margin_gbp: 330, observed_margin_gbp: 326, expected_inventory_units: 35000, observed_inventory_units: 34800, deviation_status: 'ON_TRACK' },
        { day_index: 3, day_label: 'Day 3', expected_demand_index: 132, observed_demand_index: 134, expected_margin_gbp: 330, observed_margin_gbp: 335, expected_inventory_units: 32000, observed_inventory_units: 31600, deviation_status: 'ON_TRACK' },
        { day_index: 4, day_label: 'Day 4', expected_demand_index: 132, observed_demand_index: 133, expected_margin_gbp: 330, observed_margin_gbp: 332, expected_inventory_units: 29000, observed_inventory_units: 28500, deviation_status: 'ON_TRACK' },
        { day_index: 5, day_label: 'Day 5 (Today)', expected_demand_index: 132, observed_demand_index: 135, expected_margin_gbp: 330, observed_margin_gbp: 338, expected_inventory_units: 26000, observed_inventory_units: 25200, deviation_status: 'ON_TRACK' }
      ],
      deviations: [],
      post_campaign_learning: {
        what_we_believed: 'National promotion was feasible without checking supplier weekly packing line limit.',
        what_we_expected: '+44% demand, £4.85K contribution.',
        what_we_decided: 'Adopted CogniX 28-store capacity-aligned plan.',
        interventions_applied: 'None required.',
        what_actually_happened: 'Total demand reached 37,650 units (92% of capacity); zero out-of-stocks; £4.64K profit realized.',
        what_cognix_learned: 'Confirmed supply-constrained boundary logic; verified 28-store cohort capacity fit.',
        learning_case_status: 'NON_AUTHORITATIVE'
      }
    }
  },

  'ARCH-COMPETITOR-DEFENCE': {
    id: 'ARCH-COMPETITOR-DEFENCE',
    name: 'Competitor Defence Ready Meals',
    tagline: 'Defend market share against rival price-matching with selective promotion',
    category: 'Chilled',
    default_sku: 'P014',
    sku_name: 'Ready Meal Lasagne 400g',
    cost_price: 1.89,
    rrp: 2.79,
    base_weekly_units_per_store: 72,
    price_elasticity: 2.0,
    cannibalisation_rate: 0.12,
    default_discount_pct: 20,
    default_duration_days: 14,
    default_region: 'National',
    default_mechanic: 'price_cut',
    default_objective: 'VOLUME',
    intervention_posture: 'CONSIDER_PROMOTION',

    discovery: {
      headline: 'CogniX detected competitor price attack on ready meals (-8% share risk)',
      core_narrative: 'Competitor launched £2.25 meal deal feature. Running an uncalibrated 20% cut erodes £2,900 in margin; a 2-for-£5 multi-buy defends volume (+32%) while maintaining accretive cash margin (+£3,100).',
      key_finding: 'Multi-buy mechanic (2 for £5) protects unit floor price while neutralizing competitor basket theft.',
      decision_verdict: 'ACCRETIVE GO',
      confidence: 'HIGH',
      expected_demand_uplift_pct: 32.0,
      net_contribution_delta_gbp: 3100,
      primary_tension_title: 'Primary Tension: Market Share Defence ↔ Cash Margin Preservation',
      primary_tension_description: 'Defending category volume against competitor price aggression without triggering a value-destroying margin spiral.',
      dominant_conflict: ['Market Share', 'Unit Contribution']
    },

    waterfall: [
      { id: 'wf_cd_base', label: 'Baseline Run-Rate', driver_class: 'ambient', contribution_pp: 100.0, value_display: '100.0 pp', rationale: 'Historical ready meal demand.', provenance: 'SEEDED_OBSERVATION' },
      { id: 'wf_cd_comp', label: 'Competitor Deficit Drag', driver_class: 'ambient', contribution_pp: -8.2, value_display: '-8.2 pp', rationale: 'Volume loss if no action taken.', provenance: 'SEEDED_OBSERVATION' },
      { id: 'wf_cd_elas', label: 'Multi-Buy Response (2 for £5)', driver_class: 'intervention', contribution_pp: 36.4, value_display: '+36.4 pp', rationale: 'Consumer adoption of multi-buy.', provenance: 'DERIVED' },
      { id: 'wf_cd_media', label: 'App Banner Activation', driver_class: 'intervention', contribution_pp: 5.8, value_display: '+5.8 pp', rationale: 'Direct consumer mobile push.', provenance: 'SIMULATED' },
      { id: 'wf_cd_cann', label: 'Cannibalisation (Curry Meals)', driver_class: 'intervention', contribution_pp: -2.0, value_display: '-2.0 pp', rationale: 'Minor category transfer.', provenance: 'DERIVED' },
      { id: 'wf_cd_net', label: 'Net Defensive Uplift', driver_class: 'intervention', contribution_pp: 32.0, value_display: '+32.0 pp', rationale: 'Window outcome combining defended intervention volume (+40.2 pp) with ambient competitor drag (-8.2 pp); attribution per CDI-02 covers the intervention share only.', provenance: 'DERIVED' }
    ],

    elasticity_curve: [
      { discount_pct: 0, expected_demand_uplift_pct: -8.2, unit_contribution_gbp: 0.90, net_contribution_delta_gbp: -1450, notes: 'Do Nothing — share loss to rival' },
      { discount_pct: 10, expected_demand_uplift_pct: 18.0, unit_contribution_gbp: 0.83, net_contribution_delta_gbp: 1650, notes: 'Partial defence' },
      { discount_pct: 14, expected_demand_uplift_pct: 32.0, unit_contribution_gbp: 0.81, net_contribution_delta_gbp: 3100, is_cognix_recommended: true, is_current: true, notes: '2 for £5 multi-buy sweet spot' },
      { discount_pct: 25, expected_demand_uplift_pct: 44.0, unit_contribution_gbp: 0.70, net_contribution_delta_gbp: -850, notes: 'Over-discounted margin erosion' }
    ],

    opportunity_matrix: [
      {
        region: 'National',
        window_label: 'Midweek Dinner Window',
        opportunity_index: 88,
        tier: 'PREFERRED',
        store_count: 50,
        factors: [
          { factor_id: 'f1', label: 'Competitor Share Loss Threat', points: 34, rationale: 'Rival pricing ready meals at £2.25' },
          { factor_id: 'f2', label: 'Multi-Buy Elasticity', points: 28, rationale: 'High basket multi-buy adoption on midweek ready meals' },
          { factor_id: 'f3', label: 'Supply Buffer', points: 16, rationale: 'Factory SUP007 holds 52K weekly capacity' },
          { factor_id: 'f4', label: 'Margin Headroom', points: 10, rationale: 'Accretive cash return under 2-for-£5 offer' }
        ],
        recommended_action: {
          label: 'Simulate Defensive Response',
          type: 'EXPLOIT',
          description: 'Activate 2-for-£5 multi-buy across national store estate to protect category share.',
          target_discount: 14,
          target_stores: 50,
          target_duration: 14
        }
      }
    ],

    frontier_plays: [
      {
        id: 'play_cd_multibuy',
        name: '2 for £5 Multi-Buy Play',
        badge: 'Recommended',
        discount_pct: 14,
        stores_count: 50,
        duration_days: 14,
        expected_demand_uplift_pct: 32.0,
        net_contribution_delta_gbp: 3100,
        supply_exposure: 'LOW',
        waste_impact_pct: -2.4,
        rationale: 'Protects £0.81 unit margin while driving +32% volume.',
        is_recommended: true,
        is_current: true
      },
      {
        id: 'play_cd_deep_cut',
        name: 'Aggressive 25% Price War Cut',
        badge: 'High Risk',
        discount_pct: 25,
        stores_count: 50,
        duration_days: 14,
        expected_demand_uplift_pct: 44.0,
        net_contribution_delta_gbp: -850,
        supply_exposure: 'MODERATE',
        waste_impact_pct: -3.0,
        rationale: 'Matches competitor on headline price but destroys cash contribution.'
      }
    ],

    inverse_conditions: [
      {
        id: 'inv_cd1',
        condition_text: 'Use multi-buy mechanic instead of standalone price cut',
        target_parameter: 'DISCOUNT_DEPTH',
        target_value: 14,
        target_display: 'Multi-Buy (2 for £5)',
        explanation: 'Multi-buy requires 2-pack purchase, increasing basket value and preserving cash profit.',
        modelling_action_label: 'Switch to Multi-Buy →'
      }
    ],

    change_triggers: [
      {
        trigger_id: 'trig_cd1',
        boundary_condition: 'Competitor withdraws promotional campaign',
        decision_shift: 'Return immediately to full RRP £2.79',
        severity: 'OPPORTUNITY',
        monitored_signal: 'Competitive Pricing Scraper'
      }
    ],

    signal_hypotheses: [
      {
        signal_id: 'SIG-READY-01',
        signal_headline: 'Rival supermarket launched £2.25 meal deal feature.',
        signal_source: 'Seeded competitor watch signal (demo)',
        observed_metric: 'Rival share +8%',
        hypothesis_statement: 'A 2-for-£5 multi-buy defends category share (+32% volume) while keeping contribution positive (+£3.1K).',
        test_action_label: 'Test Defensive Multi-Buy →',
        test_result: {
          verdict: 'SUPPORTED',
          explanation: 'Simulation proves 2-for-£5 multi-buy recaptures 94% of threatened volume and earns +£3,100 net contribution.',
          proposed_intervention: { discount: 14, region: 'National', duration: 14, scope: 50 }
        }
      }
    ],

    decision_graph: {
      nodes: [
        { id: 'n_cd_sig', label: 'Rival Meal Deal Cut', category: 'SIGNAL', provenance: 'SEEDED_OBSERVATION', summary: 'Competitor priced at £2.25', detail: 'Seeded market price observation (demonstration world model).' },
        { id: 'n_cd_ev', label: 'Cross-Elasticity Model', category: 'EVIDENCE', provenance: 'DERIVED', summary: 'Cross-elasticity η = 1.4', detail: 'Defection rate without response.' },
        { id: 'n_cd_dec', label: 'ACCRETIVE GO Verdict', category: 'DECISION', provenance: 'DERIVED', summary: 'Deploy 2-for-£5 Multi-Buy', detail: 'Defends market volume.' },
        { id: 'n_cd_int', label: 'Multi-Buy Campaign Brief', category: 'INTERVENTION', provenance: 'DERIVED', summary: '2-for-£5 / 50 stores / 14 days (+£3.1K)', detail: 'Store POS activation.' }
      ],
      links: [
        { from: 'n_cd_sig', to: 'n_cd_ev', label: 'threatens' },
        { from: 'n_cd_ev', to: 'n_cd_dec', label: 'justifies' },
        { from: 'n_cd_dec', to: 'n_cd_int', label: 'executes' }
      ]
    },

    decision_twin: {
      telemetry_basis: 'SIMULATED_DEMO',
      flight_days: 14,
      current_day: 6,
      is_decision_still_valid: 'STILL VALID',
      validity_confidence: 'HIGH',
      conditions_changed_count: 0,
      interventions_recommended_count: 0,
      executive_summary: 'Defensive 2-for-£5 campaign has arrested market share loss. Volume is tracking at +33.5% vs plan, delivering +£3,240 projected net margin.',
      telemetry_streams: [
        { day_index: 1, day_label: 'Day 1', expected_demand_index: 128, observed_demand_index: 126, expected_margin_gbp: 210, observed_margin_gbp: 204, expected_inventory_units: 50000, observed_inventory_units: 49800, deviation_status: 'ON_TRACK' },
        { day_index: 2, day_label: 'Day 2', expected_demand_index: 130, observed_demand_index: 132, expected_margin_gbp: 220, observed_margin_gbp: 228, expected_inventory_units: 46000, observed_inventory_units: 45600, deviation_status: 'ON_TRACK' },
        { day_index: 3, day_label: 'Day 3', expected_demand_index: 132, observed_demand_index: 134, expected_margin_gbp: 225, observed_margin_gbp: 230, expected_inventory_units: 42000, observed_inventory_units: 41400, deviation_status: 'ON_TRACK' },
        { day_index: 4, day_label: 'Day 4', expected_demand_index: 132, observed_demand_index: 135, expected_margin_gbp: 225, observed_margin_gbp: 232, expected_inventory_units: 38000, observed_inventory_units: 37200, deviation_status: 'ON_TRACK' },
        { day_index: 5, day_label: 'Day 5', expected_demand_index: 132, observed_demand_index: 136, expected_margin_gbp: 225, observed_margin_gbp: 235, expected_inventory_units: 34000, observed_inventory_units: 33000, deviation_status: 'ON_TRACK' },
        { day_index: 6, day_label: 'Day 6 (Today)', expected_demand_index: 132, observed_demand_index: 135, expected_margin_gbp: 225, observed_margin_gbp: 234, expected_inventory_units: 30000, observed_inventory_units: 28800, deviation_status: 'ON_TRACK' }
      ],
      deviations: [],
      post_campaign_learning: {
        what_we_believed: 'Competitor £2.25 meal deal would permanently siphon ready meal shoppers.',
        what_we_expected: '+32% volume, +£3.1K contribution.',
        what_we_decided: 'Deployed 2-for-£5 multi-buy nationally.',
        interventions_applied: 'None required.',
        what_actually_happened: 'Recaptured 96% of lost category share; realized +£3,240 contribution.',
        what_cognix_learned: 'Confirmed multi-buy superiority over single-unit discount for defensive grocery campaigns.',
        learning_case_status: 'NON_AUTHORITATIVE'
      }
    }
  },

  'ARCH-SEASONAL-WINDOW': {
    id: 'ARCH-SEASONAL-WINDOW',
    name: 'Seasonal Bank Holiday BBQ Drive',
    tagline: 'High calendar & weather timing coefficient (+14pp in bank holiday window)',
    category: 'Chilled',
    default_sku: 'P011',
    sku_name: 'Pork Sausages 6pk',
    cost_price: 1.75,
    rrp: 2.49,
    base_weekly_units_per_store: 110,
    price_elasticity: 2.5,
    cannibalisation_rate: 0.06,
    default_discount_pct: 20,
    default_duration_days: 7,
    default_region: 'National',
    default_mechanic: 'price_cut',
    default_objective: 'VOLUME',
    intervention_posture: 'CONSIDER_PROMOTION',

    discovery: {
      headline: 'CogniX discovered bank holiday weather window yield multiplier',
      core_narrative: 'Aligning promotion with the 4-day bank holiday weekend unlocks +54% demand with £3,600 net profit, vs +28% if launched on standard mid-week dates.',
      key_finding: 'Timing discovery identifies May Bank Holiday window as 2.3x more yield-dense than default calendar slot.',
      decision_verdict: 'ACCRETIVE GO',
      confidence: 'HIGH',
      expected_demand_uplift_pct: 54.0,
      net_contribution_delta_gbp: 3620,
      primary_tension_title: 'Primary Tension: Timing Window Exploitation ↔ Supply Execution',
      primary_tension_description: 'Capitalising on extreme calendar timing peaks requires pre-building depot stock buffers to avoid immediate store out-of-stocks.',
      dominant_conflict: ['Timing Advantage', 'DC Buffer Build']
    },

    waterfall: [
      { id: 'wf_sw_base', label: 'Baseline Run-Rate', driver_class: 'ambient', contribution_pp: 100.0, value_display: '100.0 pp', rationale: 'Standard sausage run-rate.', provenance: 'SEEDED_OBSERVATION' },
      { id: 'wf_sw_temp', label: 'Bank Holiday Weather Peak', driver_class: 'ambient', contribution_pp: 18.2, value_display: '+18.2 pp', rationale: 'Sunny weekend BBQ demand surge.', provenance: 'DERIVED' },
      { id: 'wf_sw_elas', label: 'Promo Elasticity (20% Cut)', driver_class: 'intervention', contribution_pp: 32.0, value_display: '+32.0 pp', rationale: 'High category promotional velocity.', provenance: 'DERIVED' },
      { id: 'wf_sw_media', label: 'Seasonal BBQ App Feature', driver_class: 'intervention', contribution_pp: 5.8, value_display: '+5.8 pp', rationale: 'BBQ event hub feature.', provenance: 'SIMULATED' },
      { id: 'wf_sw_cann', label: 'Cannibalisation (Beef Burgers)', driver_class: 'intervention', contribution_pp: -2.0, value_display: '-2.0 pp', rationale: 'Meat category interaction.', provenance: 'DERIVED' },
      { id: 'wf_sw_net', label: 'Net Peak-Window Demand', driver_class: 'intervention', contribution_pp: 54.0, value_display: '+54.0 pp', rationale: 'Total peak-window demand including ambient seasonal drivers; intervention-attributable share is +35.8 pp (CDI-02 basis excludes ambient weather uplift).', provenance: 'DERIVED' }
    ],

    elasticity_curve: [
      { discount_pct: 0, expected_demand_uplift_pct: 18.2, unit_contribution_gbp: 0.74, net_contribution_delta_gbp: 1200, notes: 'Weather ambient boost alone' },
      { discount_pct: 12, expected_demand_uplift_pct: 38.0, unit_contribution_gbp: 0.68, net_contribution_delta_gbp: 2850, notes: 'Strong moderate promo' },
      { discount_pct: 20, expected_demand_uplift_pct: 54.0, unit_contribution_gbp: 0.63, net_contribution_delta_gbp: 3620, is_cognix_recommended: true, is_current: true, notes: 'Optimal bank holiday window' },
      { discount_pct: 30, expected_demand_uplift_pct: 68.0, unit_contribution_gbp: 0.56, net_contribution_delta_gbp: 1400, notes: 'Excessive price cut' }
    ],

    opportunity_matrix: [
      {
        region: 'National',
        window_label: 'Bank Holiday Weekend (Thu – Mon)',
        opportunity_index: 94,
        tier: 'PREFERRED',
        store_count: 50,
        factors: [
          { factor_id: 'f1', label: 'Calendar Event Multiplier', points: 36, rationale: 'Bank holiday weekend BBQ mission surge' },
          { factor_id: 'f2', label: 'Weather Forecast Index', points: 26, rationale: '22°C sunny outlook across UK regions' },
          { factor_id: 'f3', label: 'Depot Stock Buffer', points: 20, rationale: 'Warrington & Bristol DCs pre-loaded' },
          { factor_id: 'f4', label: 'Basket Attachment', points: 12, rationale: 'High attachment to buns, ketchup, charcoal' }
        ],
        recommended_action: {
          label: 'Test Campaign Window',
          type: 'EXPLOIT',
          description: 'Lock campaign window to Thu–Mon bank holiday weekend.',
          target_discount: 20,
          target_stores: 50,
          target_duration: 5
        }
      }
    ],

    frontier_plays: [
      {
        id: 'play_sw_bank_hol',
        name: 'Bank Holiday 5-Day Burst',
        badge: 'Recommended',
        discount_pct: 20,
        stores_count: 50,
        duration_days: 5,
        expected_demand_uplift_pct: 54.0,
        net_contribution_delta_gbp: 3620,
        supply_exposure: 'LOW',
        waste_impact_pct: -4.5,
        rationale: 'Concentrated 5-day holiday blitz capturing £3.6K profit.',
        is_recommended: true,
        is_current: true
      },
      {
        id: 'play_sw_standard_14d',
        name: 'Standard 14-Day Calendar Run',
        badge: 'Extended Run',
        discount_pct: 20,
        stores_count: 50,
        duration_days: 14,
        expected_demand_uplift_pct: 28.0,
        net_contribution_delta_gbp: 4300,
        supply_exposure: 'MODERATE',
        waste_impact_pct: -1.8,
        rationale: 'Extending past the holiday accumulates more total contribution over 14 days, but dilutes daily demand intensity into low-yield midweek days and lengthens supply-window strain.'
      }
    ],

    inverse_conditions: [
      {
        id: 'inv_sw1',
        condition_text: 'Lock campaign start to Bank Holiday Thursday',
        target_parameter: 'STORE_SCOPE',
        target_value: 50,
        target_display: 'Bank Holiday Window',
        explanation: 'Synchronizing with weather/calendar peak captures 2.3x higher yield.',
        modelling_action_label: 'Lock Holiday Window →'
      }
    ],

    change_triggers: [
      {
        trigger_id: 'trig_sw1',
        boundary_condition: 'Weather forecast turns to heavy rain (>15mm)',
        decision_shift: 'Cancel meat feature; switch to indoor comfort food promotion',
        severity: 'WARNING',
        monitored_signal: 'Met Office 5-Day Precipitation Radar'
      }
    ],

    signal_hypotheses: [
      {
        signal_id: 'SIG-WEATHER-01',
        signal_headline: 'Bank holiday weekend forecast predicts 22°C and zero rain nationally.',
        signal_source: 'Seeded weather scenario signal (demo, ESF-2 shape)',
        observed_metric: '+4.2°C vs seasonal mean',
        hypothesis_statement: 'A 5-day bank holiday campaign captures 2.3x higher volume yield than running on default dates.',
        test_action_label: 'Test Weather Window Hypothesis →',
        test_result: {
          verdict: 'SUPPORTED',
          explanation: 'Weather-aligned model confirms +54% demand and +£3,620 profit over 5 days.',
          proposed_intervention: { discount: 20, region: 'National', duration: 5, scope: 50 }
        }
      }
    ],

    decision_graph: {
      nodes: [
        { id: 'n_sw_sig', label: 'Weather Forecast Peak', category: 'SIGNAL', provenance: 'SEEDED_OBSERVATION', summary: '22°C sunny bank holiday', detail: 'Seeded weather scenario input (demonstration world model).' },
        { id: 'n_sw_ev', label: 'Seasonal BBQ Multiplier', category: 'EVIDENCE', provenance: 'DERIVED', summary: '1.42x seasonal coefficient', detail: 'Historical BBQ season elasticity.' },
        { id: 'n_sw_dec', label: 'ACCRETIVE GO Verdict', category: 'DECISION', provenance: 'DERIVED', summary: 'Approve 5-Day Holiday Burst', detail: 'High yield window.' },
        { id: 'n_sw_int', label: 'Holiday Execution Plan', category: 'INTERVENTION', provenance: 'DERIVED', summary: '20% / 50 stores / 5 days (+£3.6K)', detail: 'Store event activation.' }
      ],
      links: [
        { from: 'n_sw_sig', to: 'n_sw_ev', label: 'powers' },
        { from: 'n_sw_ev', to: 'n_sw_dec', label: 'justifies' },
        { from: 'n_sw_dec', to: 'n_sw_int', label: 'schedules' }
      ]
    },

    decision_twin: {
      telemetry_basis: 'SIMULATED_DEMO',
      flight_days: 5,
      current_day: 2,
      is_decision_still_valid: 'STILL VALID',
      validity_confidence: 'HIGH',
      conditions_changed_count: 0,
      interventions_recommended_count: 0,
      executive_summary: 'Holiday campaign is on track with sunny weather driving +56% uplift on Day 2. Depot inventory burn-down matches planned target.',
      telemetry_streams: [
        { day_index: 1, day_label: 'Day 1 (Thu)', expected_demand_index: 145, observed_demand_index: 148, expected_margin_gbp: 680, observed_margin_gbp: 702, expected_inventory_units: 32000, observed_inventory_units: 31400, deviation_status: 'ON_TRACK' },
        { day_index: 2, day_label: 'Day 2 (Fri)', expected_demand_index: 155, observed_demand_index: 158, expected_margin_gbp: 760, observed_margin_gbp: 785, expected_inventory_units: 24000, observed_inventory_units: 23100, deviation_status: 'ON_TRACK' }
      ],
      deviations: [],
      post_campaign_learning: {
        what_we_believed: 'Bank holiday weather timing would dramatically amplify meat promotion yield.',
        what_we_expected: '+54% demand, £3.62K profit.',
        what_we_decided: 'Locked 5-day bank holiday campaign.',
        interventions_applied: 'None required.',
        what_actually_happened: '+55.8% volume uplift achieved; £3,740 contribution delivered.',
        what_cognix_learned: 'Confirmed weather timing coefficient (+18pp) for outdoor BBQ categories.',
        learning_case_status: 'NON_AUTHORITATIVE'
      }
    }
  },

  'ARCH-CANNIBALISATION': {
    id: 'ARCH-CANNIBALISATION',
    name: 'High-Cannibalisation Brand Play',
    tagline: 'High branded volume uplift with 34% category cannibalisation of private label',
    category: 'BWS',
    default_sku: 'P036',
    sku_name: 'Coca-Cola 6x330ml',
    cost_price: 2.45,
    rrp: 3.49,
    base_weekly_units_per_store: 95,
    price_elasticity: 2.6,
    cannibalisation_rate: 0.34,
    default_discount_pct: 25,
    default_duration_days: 14,
    default_region: 'National',
    default_mechanic: 'price_cut',
    default_objective: 'REVENUE',
    intervention_posture: 'CONSIDER_PROMOTION',

    discovery: {
      headline: 'CogniX identified 34% category cannibalisation eroding net margin',
      core_narrative: 'Discounting branded cola by 25% creates a +52% volume surge, but 34% of sales are cannibalised from high-margin own-brand cola (which carries 48% margin vs 22% on brand), reducing category profit by £2,100.',
      key_finding: 'Restricting discount to 15% or implementing brand cross-merchandising (Cola + Snack Pack) protects private label margin while capturing brand growth.',
      decision_verdict: 'MARGIN RISK',
      confidence: 'HIGH',
      expected_demand_uplift_pct: 52.0,
      net_contribution_delta_gbp: -2100,
      primary_tension_title: 'Primary Tension: Brand Volume Uplift ↔ Private Label Margin',
      primary_tension_description: 'Aggressively promoting A-brand drinks shifts shoppers away from lucrative private label equivalents, cannibalising category cash profit.',
      dominant_conflict: ['Gross Brand Volume', 'Category Net Margin']
    },

    waterfall: [
      { id: 'wf_can_base', label: 'Baseline Run-Rate', driver_class: 'ambient', contribution_pp: 100.0, value_display: '100.0 pp', rationale: 'Historical branded cola baseline.', provenance: 'SEEDED_OBSERVATION' },
      { id: 'wf_can_elas', label: 'Brand Price Elasticity (25%)', driver_class: 'intervention', contribution_pp: 68.4, value_display: '+68.4 pp', rationale: 'Massive brand pull on price cut.', provenance: 'DERIVED' },
      { id: 'wf_can_cann', label: 'Private Label Cannibalisation', driver_class: 'intervention', contribution_pp: -16.4, value_display: '-16.4 pp', rationale: '34% substitution away from store-brand cola.', provenance: 'DERIVED' },
      { id: 'wf_can_net', label: 'Net Category Incremental Demand', driver_class: 'intervention', contribution_pp: 52.0, value_display: '+52.0 pp', rationale: 'Net volume after category cannibalisation.', provenance: 'DERIVED' }
    ],

    elasticity_curve: [
      { discount_pct: 0, expected_demand_uplift_pct: 0, unit_contribution_gbp: 1.04, net_contribution_delta_gbp: 0, notes: 'Unpromoted baseline' },
      { discount_pct: 12, expected_demand_uplift_pct: 26.0, unit_contribution_gbp: 0.94, net_contribution_delta_gbp: 1850, is_cognix_recommended: true, notes: 'Controlled cannibalisation sweet spot' },
      { discount_pct: 25, expected_demand_uplift_pct: 52.0, unit_contribution_gbp: 0.79, net_contribution_delta_gbp: -2100, is_current: true, notes: 'Current plan — private label margin collapse' },
      { discount_pct: 35, expected_demand_uplift_pct: 74.0, unit_contribution_gbp: 0.66, net_contribution_delta_gbp: -6200, notes: 'Catastrophic category margin loss' }
    ],

    opportunity_matrix: [
      {
        region: 'National',
        window_label: '14 Days Window',
        opportunity_index: 54,
        tier: 'SUBOPTIMAL',
        store_count: 50,
        factors: [
          { factor_id: 'f0', label: 'Baseline Opportunity Propensity', points: 72, rationale: 'Underlying national demand propensity for branded cola promotion' },
          { factor_id: 'f1', label: 'High Brand Volume Pull', points: 30, rationale: 'Shopper brand awareness' },
          { factor_id: 'f2', label: 'Private Label Margin Cannibalisation', points: -36, rationale: 'Erodes high-margin store-brand cola volume' },
          { factor_id: 'f3', label: 'Supplier Trade Funding Deficit', points: -12, rationale: 'No supplier co-op funding included' }
        ],
        recommended_action: {
          label: 'Test SKU Exclusions / Moderate Depth',
          type: 'PROTECT_MARGIN',
          description: 'Reduce discount to 12% to prevent private label trade-down.',
          target_discount: 12,
          target_stores: 50,
          target_duration: 14
        }
      }
    ],

    frontier_plays: [
      {
        id: 'play_can_current',
        name: 'Aggressive 25% Brand Price Cut',
        badge: 'Proposed',
        discount_pct: 25,
        stores_count: 50,
        duration_days: 14,
        expected_demand_uplift_pct: 52.0,
        net_contribution_delta_gbp: -2100,
        supply_exposure: 'MODERATE',
        waste_impact_pct: -0.5,
        rationale: 'Drives +52% volume but cannibalises £2.1K in private label profit.',
        is_current: true
      },
      {
        id: 'play_can_cognix',
        name: 'Controlled 12% Feature',
        badge: 'Recommended',
        discount_pct: 12,
        stores_count: 50,
        duration_days: 14,
        expected_demand_uplift_pct: 26.0,
        net_contribution_delta_gbp: 1850,
        supply_exposure: 'LOW',
        waste_impact_pct: -0.2,
        rationale: 'Captures brand demand without triggering private label trade-down.',
        is_recommended: true
      }
    ],

    inverse_conditions: [
      {
        id: 'inv_can1',
        condition_text: 'Brand supplier co-op funding >= £2,800',
        target_parameter: 'SUPPLIER_FUNDING',
        target_value: 2800,
        target_display: '£2.8K funding',
        explanation: 'Supplier SUP016 trade marketing rebate required to offset category cannibalisation loss.',
        modelling_action_label: 'Model Brand Funding →'
      },
      {
        id: 'inv_can2',
        condition_text: 'Moderate discount depth <= 12.5%',
        target_parameter: 'DISCOUNT_DEPTH',
        target_value: 12,
        target_display: '12% discount',
        explanation: 'Keeps price gap against private label wide enough to prevent substitution.',
        modelling_action_label: 'Adopt 12% Depth →'
      }
    ],

    change_triggers: [
      {
        trigger_id: 'trig_can1',
        boundary_condition: 'Private label daily sales fall > 20% during promotion',
        decision_shift: 'Immediate early termination or discount rollback',
        severity: 'WARNING',
        monitored_signal: 'Private Label Category Telemetry'
      }
    ],

    signal_hypotheses: [
      {
        signal_id: 'SIG-DRINK-01',
        signal_headline: 'Branded cola discounts trigger 34% substitution away from private label.',
        signal_source: 'Seeded cross-elasticity model (demo)',
        observed_metric: '34% cannibalisation rate',
        hypothesis_statement: 'A 12% discount protects private label contribution while delivering +£1,850 in category profit.',
        test_action_label: 'Test Cannibalisation Shield Hypothesis →',
        test_result: {
          verdict: 'SUPPORTED',
          explanation: '12% discount achieves +26% volume while restricting private label cannibalisation to < 8%.',
          proposed_intervention: { discount: 12, region: 'National', duration: 14, scope: 50 }
        }
      }
    ],

    decision_graph: {
      nodes: [
        { id: 'n_can_sig', label: 'Cannibalisation Telemetry', category: 'SIGNAL', provenance: 'SEEDED_OBSERVATION', summary: '34% private label trade-down', detail: 'Seeded basket substitution model (demonstration world model).' },
        { id: 'n_can_ev', label: 'Category Portfolio Model', category: 'EVIDENCE', provenance: 'DERIVED', summary: 'Private label margin is 48% vs 22% brand', detail: 'Category margin composition.' },
        { id: 'n_can_dec', label: 'MARGIN RISK Verdict', category: 'DECISION', provenance: 'DERIVED', summary: 'Refuse 25% Brand Cut', detail: 'Prevents category profit loss.' },
        { id: 'n_can_int', label: 'Shielded Brand Plan', category: 'INTERVENTION', provenance: 'DERIVED', summary: '12% / 50 stores / 14 days (+£1.85K)', detail: 'Balanced category execution.' }
      ],
      links: [
        { from: 'n_can_sig', to: 'n_can_ev', label: 'informs' },
        { from: 'n_can_ev', to: 'n_can_dec', label: 'governs' },
        { from: 'n_can_dec', to: 'n_can_int', label: 'optimises' }
      ]
    },

    decision_twin: {
      telemetry_basis: 'SIMULATED_DEMO',
      flight_days: 14,
      current_day: 5,
      is_decision_still_valid: 'RECONSIDER',
      validity_confidence: 'HIGH',
      conditions_changed_count: 1,
      interventions_recommended_count: 1,
      executive_summary: 'Branded 25% discount has caused private label sales to drop by -28% (worse than the -18% expected threshold), causing £240/day category profit drain.',
      telemetry_streams: [
        { day_index: 1, day_label: 'Day 1', expected_demand_index: 140, observed_demand_index: 148, expected_margin_gbp: 480, observed_margin_gbp: 390, expected_inventory_units: 42000, observed_inventory_units: 40800, deviation_status: 'MILD_DRIFT' },
        { day_index: 2, day_label: 'Day 2', expected_demand_index: 148, observed_demand_index: 154, expected_margin_gbp: 510, observed_margin_gbp: 410, expected_inventory_units: 38000, observed_inventory_units: 36200, deviation_status: 'SEVERE_DEVIATION' },
        { day_index: 3, day_label: 'Day 3', expected_demand_index: 152, observed_demand_index: 158, expected_margin_gbp: 520, observed_margin_gbp: 415, expected_inventory_units: 34000, observed_inventory_units: 31800, deviation_status: 'SEVERE_DEVIATION' },
        { day_index: 4, day_label: 'Day 4', expected_demand_index: 152, observed_demand_index: 160, expected_margin_gbp: 520, observed_margin_gbp: 410, expected_inventory_units: 30000, observed_inventory_units: 27400, deviation_status: 'SEVERE_DEVIATION' },
        { day_index: 5, day_label: 'Day 5 (Today)', expected_demand_index: 152, observed_demand_index: 162, expected_margin_gbp: 520, observed_margin_gbp: 405, expected_inventory_units: 26000, observed_inventory_units: 23000, deviation_status: 'SEVERE_DEVIATION' }
      ],
      deviations: [
        {
          id: 'dev_can_1',
          title: 'Private label category cannibalisation is 38% vs 24% modeled',
          severity: 'CRITICAL',
          metric: 'Own-Brand Cola Category Volume',
          expected_value: '-18% substitution',
          actual_value: '-28.4% substitution',
          impact_summary: 'Category contribution is losing £115/day in private label high-margin profit.',
          recommended_in_flight_action: {
            title: 'Roll Back Brand Discount to 12%',
            action_type: 'REDUCE_DISCOUNT',
            description: 'Increase shelf price from £2.62 (25% off) to £3.07 (12% off) to stop private label margin loss.',
            current_vs_proposed: {
              current: { brand_discount_pct: 25, category_daily_profit: 405 },
              proposed: { brand_discount_pct: 12, category_daily_profit: 535 },
              expected_recovery: 'Recovers £1,170 in private label category profit over remaining 9 days.'
            }
          }
        }
      ],
      post_campaign_learning: {
        what_we_believed: 'Branded 25% discount would drive net accretive category growth.',
        what_we_expected: '+52% volume, -£2.1K contribution.',
        what_we_decided: 'Adjusted in-flight discount to 12% on Day 5.',
        interventions_applied: 'Rolled back discount from 25% to 12% on Day 5.',
        what_actually_happened: 'Private label sales stabilized; category profit recovered to +£1,420.',
        what_cognix_learned: 'Confirmed cross-brand substitution thresholds in soft drinks; established maximum 12% discount ceiling for A-brand soft drinks.',
        learning_case_status: 'NON_AUTHORITATIVE'
      }
    }
  }
};

/**
 * Array of all 7 seeded demonstration campaign archetypes (uncalibrated demo world model)
 */
export const CAMPAIGN_ARCHETYPES: CampaignArchetype[] = Object.values(CAMPAIGN_ARCHETYPES_MAP);

/**
 * Helper to get an archetype by ID or fallback to default
 */
export function getCampaignArchetype(id?: string): CampaignArchetype {
  if (id && id in CAMPAIGN_ARCHETYPES_MAP) {
    return CAMPAIGN_ARCHETYPES_MAP[id as ArchetypeId];
  }
  return CAMPAIGN_ARCHETYPES_MAP['ARCH-CHILLED-ELASTIC'];
}

/**
 * Helper to get an archetype by ID
 */
export function getArchetypeById(id: string): CampaignArchetype | undefined {
  if (id in CAMPAIGN_ARCHETYPES_MAP) {
    return CAMPAIGN_ARCHETYPES_MAP[id as ArchetypeId];
  }
  return CAMPAIGN_ARCHETYPES.find(a => a.id === id);
}

/** Governed CampaignObjectiveType for each archetype's commercial situation. */
function deriveObjectiveType(archetypeId: ArchetypeId): CampaignObjectiveType {
  switch (archetypeId) {
    case 'ARCH-CLEARANCE-PRODUCE':
      return 'INVENTORY_CLEARANCE';
    case 'ARCH-COMPETITOR-DEFENCE':
      return 'MARKET_DEFENSE';
    default:
      return 'REVENUE_ACCELERATION';
  }
}

/**
 * Deterministic economics estimate for a proposed intervention, derived from the
 * archetype's seeded elasticity curve (nearest declared discount tier) scaled by
 * store scope and duration. Explicitly a SEEDED-derived estimate — not engine output.
 */
export function estimateInterventionEconomics(
  archetype: CampaignArchetype,
  proposal: { discount_pct: number; stores: number; duration_days: number }
): { expected_demand_uplift_pct: number; net_contribution_delta_gbp: number } {
  const curve = archetype.elasticity_curve;
  const nearest = curve.reduce((best, pt) =>
    Math.abs(pt.discount_pct - proposal.discount_pct) < Math.abs(best.discount_pct - proposal.discount_pct)
      ? pt
      : best
  );
  const baselineStores = REGION_STORE_COUNTS[archetype.default_region] ?? 50;
  const storeScale = baselineStores > 0 ? proposal.stores / baselineStores : 1;
  const durationScale =
    archetype.default_duration_days > 0 ? proposal.duration_days / archetype.default_duration_days : 1;
  return {
    expected_demand_uplift_pct: Math.round(nearest.expected_demand_uplift_pct * 10) / 10,
    net_contribution_delta_gbp: Math.round(nearest.net_contribution_delta_gbp * storeScale * durationScale)
  };
}

/**
 * Helper to construct a valid CampaignIntent from an archetype and custom parameters
 */
export function buildCampaignIntentFromArchetype(
  archetype: CampaignArchetype,
  overrides?: {
    sku_id?: string;
    discount_pct?: number;
    discount_depth_pct?: number;
    duration_days?: number;
    region?: string;
    target_region?: string;
    mechanic?: any;
    objective?: PrimaryObjectiveMetric;
    posture?: InterventionPosture;
    tenant_id?: string;
    session_id?: string;
  }
): CampaignIntent & { intent_id: string } {
  const tenantId = overrides?.tenant_id || CAMPAIGN_DEMO_TENANT_ID;
  const sessionId = overrides?.session_id || CAMPAIGN_DEMO_SESSION_ID;
  const now = new Date().toISOString();
  const duration = overrides?.duration_days ?? archetype.default_duration_days;
  const start = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const end = new Date(Date.now() + (7 + duration) * 86400000).toISOString().slice(0, 10);

  const discount = overrides?.discount_depth_pct ?? overrides?.discount_pct ?? archetype.default_discount_pct;
  const sku = overrides?.sku_id || archetype.default_sku;
  const region = overrides?.target_region || overrides?.region || archetype.default_region;
  const mechanic = overrides?.mechanic || archetype.default_mechanic;
  const objective = overrides?.objective || archetype.default_objective;
  const posture = overrides?.posture || archetype.intervention_posture;
  const intentId = `cdi_intent_${tenantId}_${sessionId}_${archetype.id}`.replace(/[^a-zA-Z0-9_]/g, '_');

  return {
    campaign_intent_id: intentId,
    intent_id: intentId,
    tenant_id: tenantId,
    session_id: sessionId,
    domain_id: 'retail_grocery',
    status: 'REGISTERED',
    campaign_intent: {
      objective_type: deriveObjectiveType(archetype.id),
      intervention_posture: posture,
      framing_question: `Should we execute a promotional campaign for ${archetype.sku_name} in ${region}?`,
      category: archetype.category,
      sku_scope: [sku],
      provisional_mechanic: mechanic,
      provisional_discount_depth: discount
    },
    baseline_objective: {
      primary_metric: objective,
      target_direction: objective === 'WASTE_REDUCTION' ? 'DECREASE' : 'INCREASE',
      target_value: discount,
      target_unit: 'percent',
      capacity_cap_note: archetype.id === 'ARCH-SUPPLY-CONSTRAINED' ? 'Binding supplier cap at 41,000 units' : undefined
    },
    audience_market: {
      region: region,
      customer_segment: 'Family Shoppers',
      channel: 'Omnichannel',
      timing_mode: 'KNOWN_DATES',
      planned_start: start,
      planned_end: end
    },
    decision_context: {
      contextual_factor_notes: [
        `Archetype: ${archetype.name}`,
        `Price Elasticity: ${archetype.price_elasticity}`,
        `Cannibalisation Rate: ${archetype.cannibalisation_rate}`
      ],
      open_questions: ['How will competitors respond to promotional launch?'],
      assumptions: ['Synthetic demo baseline calibrated to enterprise store network'],
      scenario_id: `SCN-${archetype.id}`,
      scenario_family: 'promotion_surge'
    },
    canvas_progress: {
      active_area: 'DECISION_CONTEXT',
      completed_areas: ['CAMPAIGN_INTENT', 'BASELINE_OBJECTIVE', 'AUDIENCE_MARKET', 'DECISION_CONTEXT'],
      ready_to_register: true
    },
    created_at: now,
    updated_at: now,
    registered_at: now,
    source_system: 'cognix_campaign_intelligence_engine',
    provenance: {
      generator: 'campaign_archetypes_registry',
      archetype_id: archetype.id,
      package: 'CDI-ARCHETYPES'
    },
    synthetic_demo: true,
    schema_version: '1.0'
  };
}

