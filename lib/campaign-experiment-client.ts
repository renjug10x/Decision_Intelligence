/**
 * Client helpers for Campaign Decision Experiments, History, Comparisons, and Execution Briefs.
 */

import {
  CampaignDecisionExperiment,
  ExperimentComparison,
  ExecutionBrief
} from '../packages/contracts/src/index';

const DEFAULT_TENANT = 'tenant_uk_retail_01';
const DEFAULT_SESSION = 'sess_001';

export async function listCampaignExperimentsClient(params?: {
  tenant_id?: string;
  session_id?: string;
  category?: string;
  region?: string;
  objective_type?: string;
  recommendation?: string;
}): Promise<{
  experiments: CampaignDecisionExperiment[];
  count: number;
  active_experiment_id: string | null;
  next_suggested_id: string;
} | null> {
  try {
    const tenant = params?.tenant_id || DEFAULT_TENANT;
    const session = params?.session_id || DEFAULT_SESSION;
    const q = new URLSearchParams({ tenant_id: tenant, session_id: session });
    if (params?.category) q.set('category', params.category);
    if (params?.region) q.set('region', params.region);
    if (params?.objective_type) q.set('objective_type', params.objective_type);
    if (params?.recommendation) q.set('recommendation', params.recommendation);

    const res = await fetch(`/api/v1/campaigns/experiments?${q.toString()}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export async function getCampaignExperimentByIdClient(
  experimentId: string,
  params?: { tenant_id?: string; session_id?: string }
): Promise<CampaignDecisionExperiment | null> {
  try {
    const tenant = params?.tenant_id || DEFAULT_TENANT;
    const session = params?.session_id || DEFAULT_SESSION;
    const q = new URLSearchParams({ tenant_id: tenant, session_id: session });
    const res = await fetch(`/api/v1/campaigns/experiments/${encodeURIComponent(experimentId)}?${q.toString()}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export async function saveCampaignExperimentClient(
  experiment: Partial<CampaignDecisionExperiment>
): Promise<CampaignDecisionExperiment | null> {
  try {
    const res = await fetch('/api/v1/campaigns/experiments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: DEFAULT_TENANT,
        session_id: DEFAULT_SESSION,
        ...experiment
      })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export async function compareCampaignExperimentsClient(
  experimentAId: string,
  experimentBId: string,
  params?: { tenant_id?: string; session_id?: string }
): Promise<ExperimentComparison | null> {
  try {
    const tenant = params?.tenant_id || DEFAULT_TENANT;
    const session = params?.session_id || DEFAULT_SESSION;
    const res = await fetch('/api/v1/campaigns/experiments/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenant,
        session_id: session,
        experiment_a_id: experimentAId,
        experiment_b_id: experimentBId
      })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export async function fetchExecutionBriefClient(
  experimentId: string,
  params?: { tenant_id?: string; session_id?: string }
): Promise<ExecutionBrief | null> {
  try {
    const tenant = params?.tenant_id || DEFAULT_TENANT;
    const session = params?.session_id || DEFAULT_SESSION;
    const q = new URLSearchParams({ tenant_id: tenant, session_id: session });
    const res = await fetch(`/api/v1/campaigns/experiments/${encodeURIComponent(experimentId)}/brief?${q.toString()}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}
