/**
 * Typed client helpers for CDI-07B Campaign Learning Loop routes.
 */

import {
  CampaignPreMortem,
  LearningCandidate,
  OutcomeObservation,
  PredictionOutcomeComparison,
  SYNTHETIC_OBSERVATION_DISCLOSURE
} from '../packages/contracts/src/campaign-learning-loop-model';
import { DecisionContract } from '../packages/contracts/src/campaign-decision-contract-model';
import { DecisionDerivedImpacts } from '../packages/contracts/src/decision-state-model';
import { mapCategoryToSourceType } from '../packages/contracts/src/external-signal-connector-model';

const TENANT = 'tenant_uk_retail_01';
const SESSION = 'sess_001';

function demoObservation(params: {
  tenant_id: string;
  session_id: string;
  category: string;
  as_of: string;
}): OutcomeObservation {
  return {
    observation_id: `obs_demo_${params.category}_${params.as_of}`,
    tenant_id: params.tenant_id,
    session_id: params.session_id,
    signal_id: 'sig_demo_layer8_001',
    connector_id: 'conn_planning_ref_01',
    external_category: 'PLANNING',
    signal_type: 'CATEGORY_DEMAND_ACCELERATION',
    source_type: mapCategoryToSourceType('PLANNING'),
    entity_type: 'CATEGORY',
    entity_id: params.category,
    baseline_value: 100,
    observed_value: 112,
    delta_pct: 12,
    unit: 'pp',
    observed_at: params.as_of,
    effective_at: params.as_of,
    authority: 'SYNTHETIC_DEMONSTRATION',
    provenance: {
      origin: 'ESF-3_CONNECTOR',
      connector_id: 'conn_planning_ref_01',
      envelope_id: 'env_demo_layer8',
      metrics_supplied: true,
      synthetic_demo: true,
      synthetic_disclosure: SYNTHETIC_OBSERVATION_DISCLOSURE
    },
    completeness: {
      covered_quantities: [],
      missing_quantities: [],
      window_start_observed: true,
      window_end_observed: true,
      adapter_capability_gap: false,
      gap_reasons: [],
      complete: false
    },
    synthetic_demo: true,
    schema_version: '1.0'
  };
}

export async function createPreMortemClient(params: {
  contract_id: string;
  tenant_id?: string;
  session_id?: string;
  as_of?: string;
  created_as_of?: string;
  contract_digest?: string;
  decision_state_derived_impacts?: DecisionDerivedImpacts;
}): Promise<{
  preMortem: CampaignPreMortem | null;
  pre_mortem?: CampaignPreMortem | null;
  error?: string;
  rejection_id?: string;
}> {
  const asOf = params.as_of || params.created_as_of;
  if (!asOf) return { preMortem: null, pre_mortem: null, error: 'as_of is required' };
  try {
    const res = await fetch(
      `/api/v1/campaigns/decision-contract/${encodeURIComponent(params.contract_id)}/pre-mortem`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: params.tenant_id || TENANT,
          session_id: params.session_id || SESSION,
          as_of: asOf,
          ...(params.contract_digest ? { contract_digest: params.contract_digest } : {}),
          ...(params.decision_state_derived_impacts
            ? { decision_state_derived_impacts: params.decision_state_derived_impacts }
            : {})
        })
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return {
        preMortem: null,
        pre_mortem: null,
        error: data.message || 'Pre-mortem creation failed',
        rejection_id: data.rejection_id
      };
    }
    const row = data.data || null;
    return { preMortem: row, pre_mortem: row };
  } catch (e: any) {
    return { preMortem: null, pre_mortem: null, error: e.message };
  }
}

export async function getPreMortemClient(
  contractId: string,
  tenantId: string = TENANT,
  sessionId: string = SESSION
): Promise<CampaignPreMortem | null> {
  return fetchPreMortemClient({ contract_id: contractId, tenant_id: tenantId, session_id: sessionId });
}

export async function fetchPreMortemClient(params: {
  contract_id: string;
  tenant_id?: string;
  session_id?: string;
}): Promise<CampaignPreMortem | null> {
  try {
    const res = await fetch(
      `/api/v1/campaigns/decision-contract/${encodeURIComponent(params.contract_id)}/pre-mortem?tenant_id=${encodeURIComponent(params.tenant_id || TENANT)}&session_id=${encodeURIComponent(params.session_id || SESSION)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch {
    return null;
  }
}

export async function assessPredictionComparisonClient(params: {
  contract_id: string;
  tenant_id?: string;
  session_id?: string;
  as_of: string;
  observations: OutcomeObservation[];
  contract_digest?: string;
  decision_state?: { decision_state_id: string; state_version: number };
}): Promise<{
  comparison: PredictionOutcomeComparison | null;
  error?: string;
  rejection_id?: string;
}> {
  try {
    const res = await fetch(
      `/api/v1/campaigns/decision-contract/${encodeURIComponent(params.contract_id)}/prediction-comparison`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: params.tenant_id || TENANT,
          session_id: params.session_id || SESSION,
          as_of: params.as_of,
          observations: params.observations,
          ...(params.contract_digest ? { contract_digest: params.contract_digest } : {}),
          ...(params.decision_state ? { decision_state: params.decision_state } : {})
        })
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return {
        comparison: null,
        error: data.message || 'Prediction comparison failed',
        rejection_id: data.rejection_id
      };
    }
    return { comparison: data.data || null };
  } catch (e: any) {
    return { comparison: null, error: e.message };
  }
}

/** Canvas helper — supplies demonstration observations when none are passed. */
export async function runPredictionComparisonClient(params: {
  contract_id: string;
  tenant_id?: string;
  session_id?: string;
  as_of: string;
  contract_digest?: string;
  observations?: OutcomeObservation[];
  decision_state?: { decision_state_id: string; state_version: number };
  /** Used to bind a demo CATEGORY observation when observations are omitted. */
  category?: string;
}): Promise<{
  comparison: PredictionOutcomeComparison | null;
  error?: string;
  rejection_id?: string;
}> {
  const observations =
    params.observations ||
    (params.category
      ? [
          demoObservation({
            tenant_id: params.tenant_id || TENANT,
            session_id: params.session_id || SESSION,
            category: params.category,
            as_of: params.as_of
          })
        ]
      : []);
  if (!observations.length) {
    return {
      comparison: null,
      error: 'observations or category required for prediction comparison'
    };
  }
  return assessPredictionComparisonClient({
    contract_id: params.contract_id,
    tenant_id: params.tenant_id,
    session_id: params.session_id,
    as_of: params.as_of,
    observations,
    contract_digest: params.contract_digest,
    decision_state: params.decision_state
  });
}

export async function createLearningCandidateClient(params: {
  contract_id: string;
  tenant_id?: string;
  session_id?: string;
  as_of?: string;
  created_as_of?: string;
  comparison?: PredictionOutcomeComparison;
  comparison_id?: string;
  observations?: OutcomeObservation[];
  contract_digest?: string;
  register_memory?: boolean;
  pattern_refs?: string[];
  decision_state?: { decision_state_id: string; state_version: number };
}): Promise<{ candidate: LearningCandidate | null; error?: string; rejection_id?: string }> {
  const asOf = params.as_of || params.created_as_of;
  if (!asOf) return { candidate: null, error: 'as_of is required' };
  try {
    const res = await fetch(
      `/api/v1/campaigns/decision-contract/${encodeURIComponent(params.contract_id)}/learning-candidate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: params.tenant_id || TENANT,
          session_id: params.session_id || SESSION,
          as_of: asOf,
          ...(params.comparison ? { comparison: params.comparison } : {}),
          ...(params.observations ? { observations: params.observations } : {}),
          ...(params.contract_digest ? { contract_digest: params.contract_digest } : {}),
          ...(params.register_memory ? { register_memory: true } : {}),
          ...(params.pattern_refs ? { pattern_refs: params.pattern_refs } : {}),
          ...(params.decision_state ? { decision_state: params.decision_state } : {})
        })
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return {
        candidate: null,
        error: data.message || 'Learning candidate creation failed',
        rejection_id: data.rejection_id
      };
    }
    return { candidate: data.data || null };
  } catch (e: any) {
    return { candidate: null, error: e.message };
  }
}

export async function listLearningCandidatesClient(params: {
  tenant_id?: string;
  session_id?: string;
  contract_id?: string;
}): Promise<LearningCandidate[]> {
  try {
    const q = new URLSearchParams({
      tenant_id: params.tenant_id || TENANT,
      session_id: params.session_id || SESSION
    });
    if (params.contract_id) q.set('contract_id', params.contract_id);
    const res = await fetch(`/api/v1/campaigns/learning-candidates?${q.toString()}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export type { DecisionContract };
