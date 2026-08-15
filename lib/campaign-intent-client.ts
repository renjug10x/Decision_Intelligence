/**
 * Typed client helpers for CDI-01 Campaign Decision Canvas APIs.
 */

import { CampaignIntent } from '../packages/contracts/src/campaign-intent-model';

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
