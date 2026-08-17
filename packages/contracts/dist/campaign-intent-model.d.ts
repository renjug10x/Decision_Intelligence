/**
 * CogniX Campaign Decision Intelligence — Campaign Intent Model (CDI-01)
 * Transport-neutral 4-area progressive input contract consumed by CDI-02–CDI-07B.
 *
 * Areas:
 *  1. Campaign Intent
 *  2. Baseline & Objective
 *  3. Audience & Market
 *  4. Decision Context
 *
 * CDI-01 captures intent and constraints only. It does NOT embed counterfactual,
 * causal, readiness, timeline, frontier, half-life, or closed-loop intelligence.
 */
import { CommercialIntent } from './commercial-intent-model';
export type CampaignObjectiveType = 'INVENTORY_CLEARANCE' | 'REVENUE_ACCELERATION' | 'MARKET_DEFENSE' | 'LAUNCH' | 'OTHER';
/**
 * Promotion is one possible intervention — never assumed to be the answer.
 */
export type InterventionPosture = 'UNDECIDED' | 'CONSIDER_PROMOTION' | 'CONSIDER_NON_PROMOTION' | 'CONSIDER_DO_NOTHING';
export type PrimaryObjectiveMetric = 'VOLUME' | 'REVENUE' | 'CONTRIBUTION' | 'WASTE_REDUCTION' | 'AVAILABILITY';
export type TimingMode = 'KNOWN_DATES' | 'FIND_BEST_WINDOW';
export type CampaignCanvasArea = 'CAMPAIGN_INTENT' | 'BASELINE_OBJECTIVE' | 'AUDIENCE_MARKET' | 'DECISION_CONTEXT';
export type CampaignIntentStatus = 'DRAFT' | 'REGISTERED';
/** Area 1 — What are we considering? */
export interface CampaignIntentCore {
    objective_type: CampaignObjectiveType;
    intervention_posture: InterventionPosture;
    /** Short framing hypothesis / decision question */
    framing_question: string;
    category: string;
    sku_scope: string[];
    /** Optional provisional mechanic — only meaningful when posture considers promotion */
    provisional_mechanic?: string;
    provisional_discount_depth?: number;
}
/** Area 2 — Baseline & objective constraints (structure only; no counterfactual math). */
export interface BaselineObjective {
    primary_metric: PrimaryObjectiveMetric;
    target_direction: 'INCREASE' | 'DECREASE' | 'PROTECT' | 'CLEAR';
    target_value?: number;
    target_unit?: string;
    /** Soft constraint notes — not scored readiness */
    volume_note?: string;
    revenue_note?: string;
    cost_note?: string;
    capacity_cap_note?: string;
}
/** Area 3 — Audience & market scope (no micro-market scoring). */
export interface AudienceMarket {
    region: string;
    customer_segment?: string;
    channel?: string;
    store_cohort_hint?: string;
    timing_mode: TimingMode;
    planned_start?: string;
    planned_end?: string;
}
/**
 * Area 4 — Decision context structure.
 * Contextual factors are optional notes — not mandatory toggle grids.
 * Material relevance is determined by later CDI intelligence packages.
 */
export interface DecisionContextArea {
    contextual_factor_notes?: string[];
    open_questions?: string[];
    assumptions?: string[];
    commercial_intent_ref?: string;
    decision_state_id?: string;
    scenario_id?: string;
    scenario_family?: string;
}
export interface CampaignCanvasProgress {
    active_area: CampaignCanvasArea;
    completed_areas: CampaignCanvasArea[];
    /** True when all four areas have passed structural validation for registration */
    ready_to_register: boolean;
}
export interface CampaignIntent {
    campaign_intent_id: string;
    tenant_id: string;
    session_id: string;
    domain_id?: string;
    status: CampaignIntentStatus;
    campaign_intent: CampaignIntentCore;
    baseline_objective: BaselineObjective;
    audience_market: AudienceMarket;
    decision_context: DecisionContextArea;
    canvas_progress: CampaignCanvasProgress;
    created_at: string;
    updated_at: string;
    registered_at?: string;
    source_system: string;
    provenance: Record<string, string>;
    synthetic_demo: boolean;
    schema_version: string;
}
export declare const CAMPAIGN_CANVAS_AREA_ORDER: CampaignCanvasArea[];
export declare function buildCampaignIntentId(tenantId: string, sessionId: string): string;
export declare function createDefaultCampaignIntentDraft(tenantId: string, sessionId: string, options?: {
    domain_id?: string;
    scenario_id?: string;
}): CampaignIntent;
export declare function validateCampaignIntentCore(core: Partial<CampaignIntentCore>): {
    valid: boolean;
    errors: string[];
};
export declare function validateBaselineObjective(area: Partial<BaselineObjective>): {
    valid: boolean;
    errors: string[];
};
export declare function validateAudienceMarket(area: Partial<AudienceMarket>): {
    valid: boolean;
    errors: string[];
};
export declare function validateDecisionContextArea(area: Partial<DecisionContextArea>): {
    valid: boolean;
    errors: string[];
};
export declare function evaluateCanvasAreaStructural(intent: CampaignIntent): CampaignCanvasArea[];
/**
 * A completed area is one the user explicitly confirmed AND that is structurally valid.
 *
 * Registration deliberately gets no exemption here. Treating a REGISTERED intent as four
 * reviewed stages would make the checkmarks report the status of the record rather than what
 * the user actually reviewed, which is the one thing this signal exists to say. Registration
 * is gated on structural completeness separately, in validateCampaignIntent.
 */
export declare function evaluateCanvasAreaCompletion(intent: CampaignIntent): CampaignCanvasArea[];
export declare function deriveCanvasProgress(intent: CampaignIntent): CampaignCanvasProgress;
export declare function validateCampaignIntent(intent: Partial<CampaignIntent>, options?: {
    requireRegistered?: boolean;
}): {
    valid: boolean;
    errors: string[];
};
/**
 * Additive projection into IFI-01 CommercialIntent when the canvas considers promotion.
 * Non-promotion / do-nothing postures do not force a CommercialIntent registration.
 */
export declare function projectCampaignIntentToCommercialIntent(campaign: CampaignIntent, options?: {
    commercial_intent_id?: string;
}): CommercialIntent | null;
/** Guard used by tests to assert CDI-01 does not smuggle CDI-02+ calculation fields. */
export declare const CDI01_FORBIDDEN_CALCULATION_KEYS: readonly ["counterfactual_baseline", "causal_demand", "opportunity_window_score", "micro_market_score", "decision_readiness", "outcome_frontier", "decision_half_life", "pre_mortem", "closed_learning_loop"];
export declare function assertNoFutureCdiCalculations(payload: unknown): {
    ok: boolean;
    offenders: string[];
};
