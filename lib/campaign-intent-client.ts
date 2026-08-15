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
}): Promise<any | null> {
  try {
    const res = await fetch('/api/v1/campaigns/evaluate', {
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
