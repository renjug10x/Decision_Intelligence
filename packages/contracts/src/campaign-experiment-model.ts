/**
 * CogniX Campaign Decision Intelligence — Campaign Decision Experiment Model
 * Transport-neutral contracts, types, comparison models, and execution brief definitions.
 */

import {
  CampaignCanvasArea,
  CampaignIntent,
  CampaignObjectiveType,
  InterventionPosture,
  PrimaryObjectiveMetric,
  TimingMode
} from './campaign-intent-model';

export type ReadinessVerdict = 'READY' | 'CONDITIONAL' | 'REVIEW' | 'DO_NOT_PROCEED' | 'NOT_ASSESSED';

/**
 * CDI-04 reports readiness as GO / CONDITIONAL_GO / REVIEW / DO_NOT_PROCEED. A preserved
 * experiment must carry that verdict as the engine issued it — collapsing REVIEW or
 * DO_NOT_PROCEED into "Ready" would make history claim an operational clearance that was
 * never given. An unassessed decision is recorded as unassessed, not as ready.
 */
export function mapReadinessStateToVerdict(state?: string): ReadinessVerdict {
  switch (state) {
    case 'GO':
      return 'READY';
    case 'CONDITIONAL_GO':
      return 'CONDITIONAL';
    case 'REVIEW':
      return 'REVIEW';
    case 'DO_NOT_PROCEED':
      return 'DO_NOT_PROCEED';
    default:
      return 'NOT_ASSESSED';
  }
}

/** Sign belongs outside the currency symbol: a loss reads as -£316, never £-316. */
export function formatContributionGbp(gbp: number): string {
  const rounded = Math.round(gbp);
  return `${rounded < 0 ? '-' : '+'}£${Math.abs(rounded).toLocaleString()}`;
}

export function formatDemandPct(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

export function readinessVerdictLabel(verdict: ReadinessVerdict): string {
  switch (verdict) {
    case 'READY':
      return 'Ready';
    case 'CONDITIONAL':
      return 'Conditional';
    case 'REVIEW':
      return 'Review required';
    case 'DO_NOT_PROCEED':
      return 'Do Not Proceed';
    default:
      return 'Not assessed';
  }
}

export interface CampaignDecisionExperiment {
  experiment_id: string;                 // e.g. 'EXP-001'
  tenant_id: string;                     // e.g. 'tenant_uk_retail_01'
  session_id: string;                    // e.g. 'sess_001'
  domain_id?: string;
  created_at: string;                    // ISO timestamp
  completed_at: string;                  // ISO timestamp
  campaign_intent_id: string;            // Reference to intent
  framing_question: string;
  objective_type: CampaignObjectiveType;
  objective_label: string;               // e.g. 'Revenue Acceleration'
  category: string;                      // e.g. 'Fresh Dairy'
  sku_scope: string[];                   // e.g. ['P004']
  region: string;                        // e.g. 'North West'
  /**
   * Audience, sales channel and activation routes as they stood when this decision was
   * preserved. They are stored on the record rather than read back from the live intent so
   * that reviewing history shows the decision that was actually taken.
   */
  audience_segment?: string;             // taxonomy id, e.g. 'FAMILIES'
  sales_channel?: string;                // taxonomy id, e.g. 'ONLINE_GROCERY'
  activation_channels?: string[];        // taxonomy ids, e.g. ['EMAIL_CRM']
  timing_mode: TimingMode;
  planned_window?: string;               // e.g. '2026-08-24 to 2026-09-06' or 'Optimal discovery window'
  intervention_posture: InterventionPosture;
  posture_label: string;                 // e.g. 'Consider Promotion'
  primary_metric: PrimaryObjectiveMetric;
  target_direction: string;
  major_constraints: string[];           // e.g. ['Supplier headroom: 10% max lift cap', 'Floor margin threshold: 14%']
  decision_recommendation: string;       // e.g. 'Targeted promotion (Admissible Frontier)'
  incremental_demand_pct: number;        // e.g. 24.5 (% or pp)
  contribution_impact_gbp: number;       // e.g. 2100 (£)
  readiness_status: ReadinessVerdict;    // 'READY' | 'CONDITIONAL' | 'DO_NOT_PROCEED'
  readiness_summary: string;             // e.g. 'All gates passed with monitored supplier capacity'
  selected_strategy_id?: string;         // e.g. 'PLAY-PROMO-TARGETED'
  selected_strategy_name?: string;       // e.g. 'Targeted Micro-Market Promotion'
  primary_trade_off: string;             // e.g. 'Sacrifices 7pp national demand for £3.3K net contribution protection'
  evidence_posture: string;              // e.g. 'Attested counterfactual baseline with deterministic scenario simulation'
  technical_provenance: Record<string, string>;
  intent_snapshot: CampaignIntent;
  evaluation_snapshot?: any;
  opportunity_snapshot?: any;
  readiness_snapshot?: any;
  timeline_snapshot?: any;
  frontier_snapshot?: any;
  contract_snapshot?: any;
  schema_version: string;                // "1.0"
}

/** A comparison weighs a decision against alternatives; below two there is nothing to weigh. */
export const MIN_COMPARISON_EXPERIMENTS = 2;
/**
 * Above four, a comparison stops being a decision aid and becomes a spreadsheet: the reader
 * can no longer hold the alternatives in mind at once, which is the only thing this surface
 * is for.
 */
export const MAX_COMPARISON_EXPERIMENTS = 4;

export interface ExperimentComparisonDimension {
  dimension: string;                     // e.g. 'Objective', 'Region', 'Incremental demand'
  /** One value per compared experiment, in the same order as ExperimentComparison.experiments. */
  values: string[];
  difference_summary?: string;
  /** True when the compared experiments do not all agree on this dimension. */
  is_focal_difference?: boolean;
}

/**
 * How one experiment scores on an explainable dimension.
 *
 * There is deliberately no single composite score. Collapsing commercial return, execution
 * risk and evidence strength into one number would invent a precision the inputs do not
 * carry, and would hide the case this surface exists to show — that the best commercial
 * option and the safest one are often different experiments.
 */
export interface ExperimentStandingDimension {
  /** 'commercial' | 'demand' | 'readiness' | 'evidence' */
  dimension: string;
  leader_experiment_ids: string[];
  /** Why these lead — stated from the preserved snapshots, never asserted beyond them. */
  basis: string;
  /** False when the snapshots do not separate the experiments on this dimension at all. */
  separates: boolean;
}

export interface ComparisonSynthesis {
  headline: string;                      // Concise summary of difference
  what_changed: string;                  // Deterministic breakdown of delta
  why_it_matters: string;                // Strategic/commercial trade-off synthesis
  /** Best commercial outcome, where the evidence separates the set. Absent when it does not. */
  stronger_experiment_id?: string;
  recommendation_rationale?: string;
  /** Lowest execution risk, which may be a different experiment from the commercial leader. */
  lowest_execution_risk_experiment_id?: string;
  /** Per-dimension standing, so a reader can see why a leader leads. */
  standings?: ExperimentStandingDimension[];
  /** Material trade-offs between the compared configurations, stated in outcome terms. */
  trade_offs?: string[];
  /** Weaknesses and risks that survive whichever option is chosen. */
  watch_items?: string[];
  /** The concrete next action for the analyst. */
  next_move?: string;
}

export interface ExperimentComparison {
  /** Compared experiments in selection order. Length is 2–4. */
  experiments: CampaignDecisionExperiment[];
  dimensions: ExperimentComparisonDimension[];
  synthesis: ComparisonSynthesis;
  compared_at: string;
}

export interface ExecutionBrief {
  brief_id: string;                      // e.g. 'BRIEF-EXP-001'
  experiment_id: string;
  tenant_id: string;
  session_id: string;
  generated_at: string;
  
  // Executive 20-Second Synthesis
  proposal: {
    title: string;                       // e.g. 'Targeted 20% Promotion on Fresh Dairy (North West)'
    recommendation: string;              // e.g. 'Execute targeted promotion lever over national blanket discount'
    category_and_sku: string;            // e.g. 'Fresh Dairy · SKU P004'
    region_and_window: string;           // e.g. 'North West · Optimal discovery window'
  };

  rationale: {
    summary: string;                     // e.g. 'Captures +24.5% demand uplift without breaching supplier headroom cap'
    key_drivers: string[];               // 2-3 concise bullets
  };

  expected_impact: {
    incremental_demand: string;          // e.g. '+24.5% (+1,420 units)'
    contribution_impact: string;         // e.g. '+£2,100 net contribution'
    readiness_verdict: string;           // e.g. 'Ready (All operational gates green)'
    trade_off_balance: string;           // e.g. 'High margin protection with zero stockout risk'
  };

  operational_scope: {
    region: string;
    timing: string;
    audience: string;
    channel: string;
  };

  material_constraints: string[];       // 1-3 critical constraints only

  decision_triggers: string[];           // What could invalidate this decision (e.g. supplier stock shock > 15%)

  evidence_and_trust: {
    posture: string;                     // e.g. 'Evaluated counterfactual run-rate + deterministic micro-market discovery'
    synthetic_disclosure: string;        // Clear statement on demo/production data
  };

  next_step: {
    action: string;                      // 'Prepare Commitment Handoff'
    description: string;                 // 'Formalise operational parameters for cross-functional commercial review.'
    execution_boundary_notice: string;   // 'CogniX has prepared this execution brief. No live supplier or store changes have been made.'
  };

  technical_provenance: Record<string, string>;
}

export function validateCampaignDecisionExperiment(
  exp: Partial<CampaignDecisionExperiment>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!exp.experiment_id) errors.push('Missing required field: experiment_id');
  if (!exp.tenant_id) errors.push('Missing required field: tenant_id');
  if (!exp.session_id) errors.push('Missing required field: session_id');
  if (!exp.campaign_intent_id) errors.push('Missing required field: campaign_intent_id');
  if (!exp.category) errors.push('Missing required field: category');
  if (!exp.region) errors.push('Missing required field: region');
  if (!exp.decision_recommendation) errors.push('Missing required field: decision_recommendation');
  if (typeof exp.incremental_demand_pct !== 'number') errors.push('incremental_demand_pct must be a number');
  if (typeof exp.contribution_impact_gbp !== 'number') errors.push('contribution_impact_gbp must be a number');
  return { valid: errors.length === 0, errors };
}

export function validateExperimentComparison(
  comp: Partial<ExperimentComparison>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(comp.experiments)) {
    errors.push('Missing experiments array');
  } else {
    if (comp.experiments.length < MIN_COMPARISON_EXPERIMENTS) {
      errors.push(`A comparison needs at least ${MIN_COMPARISON_EXPERIMENTS} experiments`);
    }
    if (comp.experiments.length > MAX_COMPARISON_EXPERIMENTS) {
      errors.push(`A comparison holds at most ${MAX_COMPARISON_EXPERIMENTS} experiments`);
    }
  }
  if (!comp.dimensions || !Array.isArray(comp.dimensions)) {
    errors.push('Missing dimensions array');
  } else if (Array.isArray(comp.experiments)) {
    // A dimension row that does not carry one value per experiment would render columns
    // against the wrong experiment — a silent misattribution, not a formatting bug.
    const mismatched = comp.dimensions.filter(d => (d.values || []).length !== comp.experiments!.length);
    if (mismatched.length > 0) {
      errors.push(
        `Dimension rows must carry one value per compared experiment: ${mismatched
          .map(d => d.dimension)
          .join(', ')}`
      );
    }
  }
  if (!comp.synthesis) errors.push('Missing synthesis');
  return { valid: errors.length === 0, errors };
}

export function validateExecutionBrief(
  brief: Partial<ExecutionBrief>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!brief.brief_id) errors.push('Missing brief_id');
  if (!brief.experiment_id) errors.push('Missing experiment_id');
  if (!brief.proposal) errors.push('Missing proposal');
  if (!brief.rationale) errors.push('Missing rationale');
  if (!brief.expected_impact) errors.push('Missing expected_impact');
  if (!brief.next_step) errors.push('Missing next_step');
  return { valid: errors.length === 0, errors };
}
