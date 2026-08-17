/**
 * CogniX Enterprise Learning Pattern Domain Model
 * Transport-neutral contracts, taxonomy, and validation helpers for generalised organizational learning.
 */

export type PatternType =
  | 'risk'
  | 'opportunity'
  | 'intervention'
  | 'behaviour'
  | 'commitment'
  | 'ripple';

export type PatternScope = 'global' | 'tenant';

export type TelemetryProvenance =
  | 'measured'
  | 'derived'
  | 'seeded_demonstration'
  | 'unavailable';

export interface EnterpriseLearningPattern {
  pattern_id: string;                      // e.g. PAT-RISK-03
  pattern_name: string;                    // e.g. Promotional Capacity Mismatch
  pattern_type: PatternType;               // e.g. risk
  description: string;                     // Detailed narrative

  // Scope & Tenant Semantics
  pattern_scope: PatternScope;             // 'global' (visible to all tenants) | 'tenant' (tenant-private)
  tenant_id?: string;                      // Required if pattern_scope === 'tenant'

  // Situation & Context
  situation_signature: string;             // e.g. Promo discount >15% + supplier lead-time variance >12%
  observed_signals: string[];              // e.g. ['Proposed 20% discount', 'Greencore delay 14.2%']
  business_context: string;                // e.g. Chilled ready meal promotions
  applicable_domains: string[];            // e.g. ['Commercial', 'Supply Chain']
  applicable_regions?: string[];           // e.g. ['North West', 'London']

  // Three Independent Telemetry Metrics (Never collapsed into one generic score)
  historical_occurrences: number;          // e.g. 6 (demonstration constant when uncalibrated)
  situation_similarity: number;            // 0..100 (%)
  pattern_confidence: number;              // 0..100 (%)
  intervention_success_rate: number;       // 0..100 (%)

  // Outcomes & Interventions
  observed_decisions: string[];            // Historical choices evaluated
  observed_interventions: string[];        // Specific interventions tested
  positive_outcomes: string[];             // Verified positive consequences
  negative_outcomes: string[];             // Empirical risks/drawbacks

  recommended_action: string;              // Actionable guidance string
  expected_outcome: string;                // Target improvement
  applicability_constraints: string[];     // Boundary conditions

  // Provenance & Memory Links
  supporting_memory_ids: string[];         // References to EnterpriseMemoryCase IDs
  first_observed?: string;                 // ISO date
  last_observed?: string;                  // ISO date
  source_classification: string;           // e.g. 'G10X Synthetic Demonstration Precedent'
  synthetic_demo: boolean;                 // true for demo history
  telemetry_provenance?: TelemetryProvenance; // 'measured' | 'derived' | 'seeded_demonstration' | 'unavailable'
  telemetry_disclosure?: string;           // Disclosure string explaining metric provenance
  citation_count?: number;                 // Count of cited supporting memory cases
  schema_version: string;                  // "1.0"
}

export interface PatternMatchRequest {
  tenant_id: string;
  category?: string;
  region?: string;
  signals?: string[];
  promotion_lift?: number;
  limit?: number;
}

export function validateEnterpriseLearningPattern(pattern: Partial<EnterpriseLearningPattern>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!pattern.pattern_id) errors.push('Missing required field: pattern_id');
  if (!pattern.pattern_name) errors.push('Missing required field: pattern_name');
  if (!pattern.pattern_type) errors.push('Missing required field: pattern_type');
  if (typeof pattern.situation_similarity !== 'number' || pattern.situation_similarity < 0 || pattern.situation_similarity > 100) {
    errors.push('situation_similarity must be a number between 0 and 100');
  }
  if (typeof pattern.pattern_confidence !== 'number' || pattern.pattern_confidence < 0 || pattern.pattern_confidence > 100) {
    errors.push('pattern_confidence must be a number between 0 and 100');
  }
  if (typeof pattern.intervention_success_rate !== 'number' || pattern.intervention_success_rate < 0 || pattern.intervention_success_rate > 100) {
    errors.push('intervention_success_rate must be a number between 0 and 100');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
