/**
 * CogniX Enterprise Learning Pattern Domain Model
 * Transport-neutral contracts, taxonomy, and validation helpers for generalised organizational learning.
 */
export type PatternType = 'risk' | 'opportunity' | 'intervention' | 'behaviour' | 'commitment' | 'ripple';
export type PatternScope = 'global' | 'tenant';
export type TelemetryProvenance = 'measured' | 'derived' | 'seeded_demonstration' | 'unavailable';
export interface EnterpriseLearningPattern {
    pattern_id: string;
    pattern_name: string;
    pattern_type: PatternType;
    description: string;
    pattern_scope: PatternScope;
    tenant_id?: string;
    situation_signature: string;
    observed_signals: string[];
    business_context: string;
    applicable_domains: string[];
    applicable_regions?: string[];
    historical_occurrences: number;
    situation_similarity: number;
    pattern_confidence: number;
    intervention_success_rate: number;
    observed_decisions: string[];
    observed_interventions: string[];
    positive_outcomes: string[];
    negative_outcomes: string[];
    recommended_action: string;
    expected_outcome: string;
    applicability_constraints: string[];
    supporting_memory_ids: string[];
    first_observed?: string;
    last_observed?: string;
    source_classification: string;
    synthetic_demo: boolean;
    telemetry_provenance?: TelemetryProvenance;
    telemetry_disclosure?: string;
    citation_count?: number;
    schema_version: string;
}
export interface PatternMatchRequest {
    tenant_id: string;
    category?: string;
    region?: string;
    signals?: string[];
    promotion_lift?: number;
    limit?: number;
}
export declare function validateEnterpriseLearningPattern(pattern: Partial<EnterpriseLearningPattern>): {
    valid: boolean;
    errors: string[];
};
