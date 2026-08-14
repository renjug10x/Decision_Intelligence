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
  memory_id: string;                       // e.g. MEM-2025-Q2-018
  tenant_id: string;                      // e.g. tenant_uk_retail_01
  title: string;                          // Short summary title
  category: string;                       // e.g. Fresh Dairy / Chilled
  situation_summary: string;              // Detailed operational state narrative
  decision_taken: string;                 // Action executed by decision makers
  selected_interventions: string[];       // Specific intervention IDs applied
  expected_outcome: string;               // Target or simulated result
  actual_outcome: string;                 // Empirically observed business result
  business_result: string;                // Financial/operational impact (e.g. Saved £168,000)
  lessons_learned: string;                // Empirical key takeaways
  confidence: number;                     // 0..100 (%) precedent match confidence
  pattern_id?: string;                    // Associated EnterpriseLearningPattern ID

  // Reference Semantics (References objects owned by other domains)
  commercial_intent_ref?: string;         // CommercialIntent ID
  decision_state_ref?: MemoryDecisionStateRef;
  signal_refs: string[];                  // Array of EnterpriseSignal IDs (e.g. ['sig_ps_001'])
  simulation_ref?: string;                // Captured ESF-2 simulation evidence ID

  provenance: MemoryProvenance;
  synthetic_demo: boolean;                // true
  created_at: string;                     // ISO 8601 UTC timestamp
  schema_version: string;                 // "1.0"
}

export interface MemorySearchRequest {
  tenant_id: string;
  query?: string;
  category?: string;
  signals?: string[];
  pattern_id?: string;
  limit?: number;
}

export function validateEnterpriseMemoryCase(caseObj: Partial<EnterpriseMemoryCase>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!caseObj.memory_id) errors.push('Missing required field: memory_id');
  if (!caseObj.tenant_id) errors.push('Missing required field: tenant_id');
  if (!caseObj.situation_summary) errors.push('Missing required field: situation_summary');
  if (!caseObj.decision_taken) errors.push('Missing required field: decision_taken');
  if (!caseObj.expected_outcome) errors.push('Missing required field: expected_outcome');
  if (!caseObj.actual_outcome) errors.push('Missing required field: actual_outcome');

  return {
    valid: errors.length === 0,
    errors
  };
}
