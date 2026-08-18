/**
 * CogniX Campaign Decision Intelligence — Campaign Decision Experiment Model
 * Transport-neutral contracts, types, comparison models, and execution brief definitions.
 */
import { CampaignIntent, CampaignObjectiveType, InterventionPosture, PrimaryObjectiveMetric, TimingMode } from './campaign-intent-model';
export type ReadinessVerdict = 'READY' | 'CONDITIONAL' | 'REVIEW' | 'DO_NOT_PROCEED' | 'NOT_ASSESSED';
/**
 * CDI-04 reports readiness as GO / CONDITIONAL_GO / REVIEW / DO_NOT_PROCEED. A preserved
 * experiment must carry that verdict as the engine issued it — collapsing REVIEW or
 * DO_NOT_PROCEED into "Ready" would make history claim an operational clearance that was
 * never given. An unassessed decision is recorded as unassessed, not as ready.
 */
export declare function mapReadinessStateToVerdict(state?: string): ReadinessVerdict;
/** Sign belongs outside the currency symbol: a loss reads as -£316, never £-316. */
export declare function formatContributionGbp(gbp: number): string;
export declare function formatDemandPct(pct: number): string;
export declare function readinessVerdictLabel(verdict: ReadinessVerdict): string;
export interface CampaignDecisionExperiment {
    experiment_id: string;
    tenant_id: string;
    session_id: string;
    domain_id?: string;
    created_at: string;
    completed_at: string;
    campaign_intent_id: string;
    framing_question: string;
    objective_type: CampaignObjectiveType;
    objective_label: string;
    category: string;
    sku_scope: string[];
    region: string;
    /**
     * Audience, sales channel and activation routes as they stood when this decision was
     * preserved. They are stored on the record rather than read back from the live intent so
     * that reviewing history shows the decision that was actually taken.
     */
    audience_segment?: string;
    sales_channel?: string;
    activation_channels?: string[];
    timing_mode: TimingMode;
    planned_window?: string;
    intervention_posture: InterventionPosture;
    posture_label: string;
    primary_metric: PrimaryObjectiveMetric;
    target_direction: string;
    major_constraints: string[];
    decision_recommendation: string;
    incremental_demand_pct: number;
    contribution_impact_gbp: number;
    readiness_status: ReadinessVerdict;
    readiness_summary: string;
    selected_strategy_id?: string;
    selected_strategy_name?: string;
    primary_trade_off: string;
    evidence_posture: string;
    technical_provenance: Record<string, string>;
    intent_snapshot: CampaignIntent;
    evaluation_snapshot?: any;
    opportunity_snapshot?: any;
    readiness_snapshot?: any;
    timeline_snapshot?: any;
    frontier_snapshot?: any;
    contract_snapshot?: any;
    schema_version: string;
}
/** A comparison weighs a decision against alternatives; below two there is nothing to weigh. */
export declare const MIN_COMPARISON_EXPERIMENTS = 2;
/**
 * Above four, a comparison stops being a decision aid and becomes a spreadsheet: the reader
 * can no longer hold the alternatives in mind at once, which is the only thing this surface
 * is for.
 */
export declare const MAX_COMPARISON_EXPERIMENTS = 4;
export interface ExperimentComparisonDimension {
    dimension: string;
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
    headline: string;
    what_changed: string;
    why_it_matters: string;
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
    brief_id: string;
    experiment_id: string;
    tenant_id: string;
    session_id: string;
    generated_at: string;
    proposal: {
        title: string;
        recommendation: string;
        category_and_sku: string;
        region_and_window: string;
    };
    rationale: {
        summary: string;
        key_drivers: string[];
    };
    expected_impact: {
        incremental_demand: string;
        contribution_impact: string;
        readiness_verdict: string;
        trade_off_balance: string;
    };
    operational_scope: {
        region: string;
        timing: string;
        audience: string;
        channel: string;
    };
    material_constraints: string[];
    decision_triggers: string[];
    evidence_and_trust: {
        posture: string;
        synthetic_disclosure: string;
    };
    next_step: {
        action: string;
        description: string;
        execution_boundary_notice: string;
    };
    technical_provenance: Record<string, string>;
}
export declare function validateCampaignDecisionExperiment(exp: Partial<CampaignDecisionExperiment>): {
    valid: boolean;
    errors: string[];
};
export declare function validateExperimentComparison(comp: Partial<ExperimentComparison>): {
    valid: boolean;
    errors: string[];
};
export declare function validateExecutionBrief(brief: Partial<ExecutionBrief>): {
    valid: boolean;
    errors: string[];
};
