/**
 * CogniX Enterprise Memory Domain Model
 * Transport-neutral contracts, types, and validation helpers for specific organizational precedents.
 */
export interface MemoryDecisionStateRef {
    decision_state_id: string;
    decision_state_version: number;
}
export interface MemoryProvenance {
    source: string;
    period: string;
    data_classification: string;
    is_synthetic_demo: boolean;
    generator?: string;
}
export interface EnterpriseMemoryCase {
    memory_id: string;
    tenant_id: string;
    title: string;
    category: string;
    situation_summary: string;
    decision_taken: string;
    selected_interventions: string[];
    expected_outcome: string;
    actual_outcome: string;
    business_result: string;
    lessons_learned: string;
    confidence: number;
    pattern_id?: string;
    commercial_intent_ref?: string;
    decision_state_ref?: MemoryDecisionStateRef;
    signal_refs: string[];
    simulation_ref?: string;
    provenance: MemoryProvenance;
    synthetic_demo: boolean;
    created_at: string;
    schema_version: string;
}
export interface MemorySearchRequest {
    tenant_id: string;
    query?: string;
    category?: string;
    signals?: string[];
    pattern_id?: string;
    limit?: number;
}
export declare function validateEnterpriseMemoryCase(caseObj: Partial<EnterpriseMemoryCase>): {
    valid: boolean;
    errors: string[];
};
