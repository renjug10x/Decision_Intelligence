/**
 * Typed client helpers for CDI-01 Campaign Decision Canvas APIs
 * and CDI-07A Decision Contract routes.
 */

import { CampaignIntent } from '../packages/contracts/src/campaign-intent-model';
import {
  ContractCreationRequest,
  DecisionContract,
  DecisionValidityAssessment
} from '../packages/contracts/src/campaign-decision-contract-model';
import { OutcomeFrontier } from '../packages/contracts/src/campaign-frontier-model';

const TENANT = 'tenant_uk_retail_01';
const SESSION = 'sess_001';

export async function fetchCurrentCampaignIntent(
  tenantId: string = TENANT,
  sessionId: string = SESSION
): Promise<CampaignIntent | null> {
  try {
    const res = await fetch(
      `/api/v1/campaigns/intent/current?tenant_id=${encodeURIComponent(tenantId)}&session_id=${encodeURIComponent(sessionId)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch {
    return null;
  }
}

export async function saveCampaignIntentDraftClient(intent: CampaignIntent): Promise<CampaignIntent | null> {
  try {
    const res = await fetch('/api/v1/campaigns/intent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intent)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch {
    return null;
  }
}

export async function registerCampaignIntentClient(intent: CampaignIntent): Promise<{
  intent: CampaignIntent | null;
  decision_state_version?: number;
  error?: string;
}> {
  try {
    const res = await fetch('/api/v1/campaigns/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intent)
    });
    const data = await res.json();
    if (!res.ok) return { intent: null, error: data.message || 'Registration failed' };
    return { intent: data.data || null, decision_state_version: data.decision_state_version };
  } catch (e: any) {
    return { intent: null, error: e.message };
  }
}

export async function evaluateCampaignDecisionClient(params: {
  tenant_id?: string;
  session_id?: string;
  campaign_intent_id?: string;
  include_signals?: boolean;
  resolved_temporal_uplift_pp?: number;
  opportunity_window_id?: string;
}): Promise<any | null> {
  try {
    const res = await fetch('/api/v1/campaigns/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: params.tenant_id || TENANT,
        session_id: params.session_id || SESSION,
        campaign_intent_id: params.campaign_intent_id,
        include_signals: params.include_signals !== false,
        ...(typeof params.resolved_temporal_uplift_pp === 'number'
          ? {
              resolved_temporal_uplift_pp: params.resolved_temporal_uplift_pp,
              opportunity_window_id: params.opportunity_window_id
            }
          : {})
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch {
    return null;
  }
}

export async function discoverCampaignOpportunityClient(params: {
  tenant_id?: string;
  session_id?: string;
  campaign_intent_id?: string;
}): Promise<any | null> {
  try {
    const res = await fetch('/api/v1/campaigns/opportunity-discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: params.tenant_id || TENANT,
        session_id: params.session_id || SESSION,
        campaign_intent_id: params.campaign_intent_id
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch {
    return null;
  }
}

export async function evaluateCampaignReadinessClient(params: {
  tenant_id?: string;
  session_id?: string;
  campaign_intent_id?: string;
  include_signals?: boolean;
  economic_tolerance?: {
    max_contribution_sacrifice_gbp: number;
    rationale: string;
    declared_by: string;
    objective_basis: string;
  };
}): Promise<any | null> {
  try {
    const res = await fetch('/api/v1/campaigns/readiness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: params.tenant_id || TENANT,
        session_id: params.session_id || SESSION,
        campaign_intent_id: params.campaign_intent_id,
        include_signals: params.include_signals !== false,
        ...(params.economic_tolerance ? { economic_tolerance: params.economic_tolerance } : {})
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch {
    return null;
  }
}

export async function projectDecisionTimelineClient(params: {
  tenant_id?: string;
  session_id?: string;
  campaign_intent_id?: string;
  include_signals?: boolean;
}): Promise<any | null> {
  try {
    const res = await fetch('/api/v1/campaigns/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: params.tenant_id || TENANT,
        session_id: params.session_id || SESSION,
        campaign_intent_id: params.campaign_intent_id,
        include_signals: params.include_signals !== false
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch {
    return null;
  }
}

export async function evaluateOutcomeFrontierClient(params: {
  tenant_id?: string;
  session_id?: string;
  campaign_intent_id?: string;
  evaluation_timestamp?: string;
  economic_tolerance?: {
    max_contribution_sacrifice_gbp: number;
    rationale: string;
    declared_by: string;
    objective_basis: string;
  };
  minimum_attributable_uplift_pp?: number;
  minimum_attributable_uplift_declared_by?: string;
  resolved_temporal_uplift_pp?: number;
  opportunity_window_id?: string;
}): Promise<any | null> {
  try {
    const res = await fetch('/api/v1/campaigns/outcome-frontier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: params.tenant_id || TENANT,
        session_id: params.session_id || SESSION,
        campaign_intent_id: params.campaign_intent_id,
        ...(params.evaluation_timestamp
          ? { evaluation_timestamp: params.evaluation_timestamp }
          : {}),
        ...(params.economic_tolerance ? { economic_tolerance: params.economic_tolerance } : {}),
        ...(typeof params.minimum_attributable_uplift_pp === 'number'
          ? {
              minimum_attributable_uplift_pp: params.minimum_attributable_uplift_pp,
              minimum_attributable_uplift_declared_by: params.minimum_attributable_uplift_declared_by
            }
          : {}),
        ...(typeof params.resolved_temporal_uplift_pp === 'number'
          ? {
              resolved_temporal_uplift_pp: params.resolved_temporal_uplift_pp,
              opportunity_window_id: params.opportunity_window_id
            }
          : {})
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch {
    return null;
  }
}

export async function createDecisionContractClient(
  request: ContractCreationRequest
): Promise<{ contract: DecisionContract | null; error?: string; rejection_id?: string }> {
  try {
    const res = await fetch('/api/v1/campaigns/decision-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        contract: null,
        error: data.message || 'Contract creation failed',
        rejection_id: data.rejection_id
      };
    }
    return { contract: data.data || null };
  } catch (e: any) {
    return { contract: null, error: e.message };
  }
}

export async function getDecisionContractClient(
  contractId: string,
  tenantId: string = TENANT,
  sessionId: string = SESSION
): Promise<DecisionContract | null> {
  try {
    const res = await fetch(
      `/api/v1/campaigns/decision-contract/${encodeURIComponent(contractId)}?tenant_id=${encodeURIComponent(tenantId)}&session_id=${encodeURIComponent(sessionId)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch {
    return null;
  }
}

export async function getCurrentDecisionContractClient(
  tenantId: string = TENANT,
  sessionId: string = SESSION
): Promise<DecisionContract | null> {
  try {
    const res = await fetch(
      `/api/v1/campaigns/decision-contract/current?tenant_id=${encodeURIComponent(tenantId)}&session_id=${encodeURIComponent(sessionId)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch {
    return null;
  }
}

export async function assessDecisionValidityClient(params: {
  contract_id: string;
  tenant_id?: string;
  session_id?: string;
  as_of: string;
  current_campaign_intent?: CampaignIntent;
  current_frontier?: OutcomeFrontier;
  current_decision_state?: { decision_state_id: string; state_version: number };
  signal_observations?: Array<{
    signal_type: string;
    entity_id: string;
    value: number;
    delta_pct: number;
    decision_state_version: number;
  }>;
}): Promise<{
  assessment: DecisionValidityAssessment | null;
  error?: string;
  rejection_id?: string;
}> {
  try {
    const res = await fetch(
      `/api/v1/campaigns/decision-contract/${encodeURIComponent(params.contract_id)}/validity`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: params.tenant_id || TENANT,
          session_id: params.session_id || SESSION,
          as_of: params.as_of,
          ...(params.current_campaign_intent
            ? { current_campaign_intent: params.current_campaign_intent }
            : {}),
          ...(params.current_frontier ? { current_frontier: params.current_frontier } : {}),
          ...(params.current_decision_state
            ? { current_decision_state: params.current_decision_state }
            : {}),
          ...(params.signal_observations
            ? { signal_observations: params.signal_observations }
            : {})
        })
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return {
        assessment: null,
        error: data.message || 'Validity assessment failed',
        rejection_id: data.rejection_id
      };
    }
    return { assessment: data.data || null };
  } catch (e: any) {
    return { assessment: null, error: e.message };
  }
}

export async function withdrawDecisionContractClient(params: {
  contract_id: string;
  tenant_id?: string;
  session_id?: string;
  withdrawn_by: string;
  statement: string;
  withdrawn_as_of: string;
  prompted_by_assessment_id?: string;
}): Promise<{ contract: DecisionContract | null; error?: string }> {
  try {
    const res = await fetch(
      `/api/v1/campaigns/decision-contract/${encodeURIComponent(params.contract_id)}/withdraw`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: params.tenant_id || TENANT,
          session_id: params.session_id || SESSION,
          withdrawn_by: params.withdrawn_by,
          statement: params.statement,
          withdrawn_as_of: params.withdrawn_as_of,
          ...(params.prompted_by_assessment_id
            ? { prompted_by_assessment_id: params.prompted_by_assessment_id }
            : {})
        })
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return { contract: null, error: data.message || 'Withdrawal failed' };
    }
    return { contract: data.data || null };
  } catch (e: any) {
    return { contract: null, error: e.message };
  }
}
