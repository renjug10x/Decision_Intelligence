/**
 * CogniX Campaign Decision Intelligence — Opportunity Window & Micro-Market Models (CDI-03)
 *
 * Answers: When should we intervene? Where should we intervene?
 * Deterministic, explainable evaluation over Enterprise World / store seed data.
 * Does not invent promotional mechanics from CONSIDER_PROMOTION alone.
 */

import { CampaignIntent, TimingMode } from './campaign-intent-model';

export type OpportunityWindowTier = 'PREFERRED' | 'ACCEPTABLE' | 'SUBOPTIMAL' | 'AVOID';

export type MicroMarketTier = 'HIGH' | 'MEDIUM' | 'WATCH' | 'EXCLUDE';

export interface OpportunityWindowFactor {
  factor_id: string;
  label: string;
  contribution: number;            // points toward yield_score
  synthetic_demo: boolean;
  rationale: string;
}

export interface OpportunityWindowCandidate {
  window_id: string;
  start_date: string;              // ISO date (UTC day)
  end_date: string;
  duration_days: number;
  yield_score: number;             // 0–100
  estimated_temporal_uplift_pp: number;
  tier: OpportunityWindowTier;
  factors: OpportunityWindowFactor[];
  inclusion_reasons: string[];
  exclusion_risks: string[];
  is_stated_dates: boolean;        // true when this matches KNOWN_DATES intent
  synthetic_demo: boolean;
}

/**
 * Discloses the seeded temporal basis of candidate generation.
 *
 * Candidate windows are generated from a fixed anchor so demo runs are
 * reproducible. That anchor is a planning assumption, never observed or live
 * calendar evidence, and consumers must present it as such.
 */
export interface OpportunityDiscoveryAnchor {
  anchor_date: string;                       // ISO date (UTC day)
  anchor_mode: 'fixed_demo_anchor';
  horizon_days: number;
  candidate_starts_generated: number;
  disclosure: string;
}

export interface OpportunityWindowEvaluation {
  evaluation_id: string;
  campaign_intent_id: string;
  tenant_id: string;
  session_id: string;
  timing_mode: TimingMode;
  candidates: OpportunityWindowCandidate[];
  recommended_window_id: string;
  recommended_window: OpportunityWindowCandidate;
  /** Temporal uplift pp to feed CDI-02 when resolving FIND_BEST_WINDOW */
  resolved_temporal_uplift_pp: number;
  /** Seeded temporal basis of candidate generation — must not be shown as live evidence */
  discovery_anchor: OpportunityDiscoveryAnchor;
  calculation_mode: 'deterministic_demo_opportunity_window';
  synthetic_demo: boolean;
  schema_version: string;
  provenance: Record<string, string>;
  timestamp: string;
}

export interface MicroMarketFactor {
  factor_id: string;
  label: string;
  contribution: number;
  synthetic_demo: boolean;
  rationale: string;
}

export interface MicroMarketStoreScore {
  store_id: string;
  store_name: string;
  region: string;
  city: string;
  format: string;
  opportunity_score: number;       // 0–100
  tier: MicroMarketTier;
  factors: MicroMarketFactor[];
  inclusion_reasons: string[];
  exclusion_reasons: string[];
  included: boolean;
  synthetic_demo: boolean;
}

export interface MicroMarketCohort {
  cohort_id: string;
  label: string;
  store_ids: string[];
  average_score: number;
  tier: MicroMarketTier;
  rationale: string;
}

export interface MicroMarketOpportunity {
  evaluation_id: string;
  campaign_intent_id: string;
  tenant_id: string;
  session_id: string;
  region_scope: string;
  stores_evaluated: number;
  stores_included: number;
  stores: MicroMarketStoreScore[];
  cohorts: MicroMarketCohort[];
  recommended_store_ids: string[];
  calculation_mode: 'deterministic_demo_micro_market';
  synthetic_demo: boolean;
  schema_version: string;
  provenance: Record<string, string>;
  timestamp: string;
}

export interface OpportunityDiscoveryRequest {
  tenant_id: string;
  session_id: string;
  campaign_intent_id?: string;
  campaign_intent?: CampaignIntent;
  /** Horizon for FIND_BEST_WINDOW candidate generation (days). Default 56. */
  discovery_horizon_days?: number;
  /** Candidate window length in days. Default 7. */
  window_duration_days?: number;
}

export interface OpportunityDiscoveryResponse {
  discovery_id: string;
  tenant_id: string;
  session_id: string;
  campaign_intent_id: string;
  opportunity_windows: OpportunityWindowEvaluation;
  micro_markets: MicroMarketOpportunity;
  timestamp: string;
  schema_version: string;
}

export function validateOpportunityWindowEvaluation(
  evaluation: Partial<OpportunityWindowEvaluation>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!evaluation.evaluation_id) errors.push('Missing evaluation_id');
  if (!evaluation.campaign_intent_id) errors.push('Missing campaign_intent_id');
  if (!evaluation.tenant_id) errors.push('Missing tenant_id');
  if (!evaluation.session_id) errors.push('Missing session_id');
  if (!Array.isArray(evaluation.candidates) || evaluation.candidates.length === 0) {
    errors.push('candidates must be a non-empty array');
  }
  if (!evaluation.recommended_window_id) errors.push('Missing recommended_window_id');
  if (typeof evaluation.resolved_temporal_uplift_pp !== 'number') {
    errors.push('Missing resolved_temporal_uplift_pp');
  }
  if (!evaluation.discovery_anchor?.anchor_date || !evaluation.discovery_anchor?.disclosure) {
    errors.push('Missing discovery_anchor disclosure');
  }
  if (typeof evaluation.synthetic_demo !== 'boolean') errors.push('Missing synthetic_demo');
  return { valid: errors.length === 0, errors };
}

export function validateMicroMarketOpportunity(
  evaluation: Partial<MicroMarketOpportunity>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!evaluation.evaluation_id) errors.push('Missing evaluation_id');
  if (!evaluation.campaign_intent_id) errors.push('Missing campaign_intent_id');
  if (!evaluation.tenant_id) errors.push('Missing tenant_id');
  if (!evaluation.session_id) errors.push('Missing session_id');
  if (!Array.isArray(evaluation.stores) || evaluation.stores.length === 0) {
    errors.push('stores must be a non-empty array');
  }
  if (typeof evaluation.synthetic_demo !== 'boolean') errors.push('Missing synthetic_demo');
  // Every store must have explainable reasons
  for (const store of evaluation.stores || []) {
    if (!store.store_id) errors.push('Store missing store_id');
    if (!Array.isArray(store.inclusion_reasons) && !Array.isArray(store.exclusion_reasons)) {
      errors.push(`Store ${store.store_id} missing explainable reasons`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateOpportunityDiscoveryRequest(
  request: Partial<OpportunityDiscoveryRequest>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!request.tenant_id) errors.push('Missing tenant_id');
  if (!request.session_id) errors.push('Missing session_id');
  if (!request.campaign_intent_id && !request.campaign_intent) {
    errors.push('Provide campaign_intent_id or campaign_intent');
  }
  return { valid: errors.length === 0, errors };
}
