/** CTW-02 client. Every call returns null on failure — the surface then shows nothing, never a guess. */

import {
  InterventionPreview,
  PlanInterventionRequest,
  PlannedIntervention,
  PlannedInterventionReassessment,
  ReassessmentVerdict,
  DecisionMoment,
  InterventionCandidate
} from '../packages/contracts/src/campaign-intervention-model';

export async function listPlannedInterventionsClient(p: { tenant_id: string; session_id: string }): Promise<PlannedIntervention[]> {
  try {
    const res = await fetch(`/api/v1/campaigns/interventions?tenant_id=${encodeURIComponent(p.tenant_id)}&session_id=${encodeURIComponent(p.session_id)}`);
    if (!res.ok) return [];
    const j = await res.json();
    return j.data?.interventions || [];
  } catch {
    return [];
  }
}

export async function planInterventionClient(req: PlanInterventionRequest): Promise<{ plan: PlannedIntervention | null; error?: string }> {
  try {
    const res = await fetch('/api/v1/campaigns/interventions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    const j = await res.json();
    if (!res.ok) return { plan: null, error: j.message };
    return { plan: j.data };
  } catch (e: any) {
    return { plan: null, error: e.message };
  }
}

export async function previewInterventionClient(p: {
  tenant_id: string;
  session_id: string;
  contract_id: string;
  campaign_intent: any;
  candidate: InterventionCandidate;
  effective_from_flight_day: number;
  elapsed_telemetry: any[];
  moment_id: string;
}): Promise<InterventionPreview | null> {
  try {
    const res = await fetch('/api/v1/campaigns/interventions/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.data || null;
  } catch {
    return null;
  }
}

export async function reassessInterventionClient(p: {
  intervention_id: string;
  tenant_id: string;
  session_id: string;
  moments: DecisionMoment[];
  today_flight_day: number;
  decision?: ReassessmentVerdict;
}): Promise<{ intervention: PlannedIntervention | null; assessment: PlannedInterventionReassessment | null; error?: string }> {
  try {
    const res = await fetch(`/api/v1/campaigns/interventions/${encodeURIComponent(p.intervention_id)}/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });
    const j = await res.json();
    if (!res.ok) return { intervention: null, assessment: null, error: j.message };
    return { intervention: j.data.intervention, assessment: j.data.assessment };
  } catch (e: any) {
    return { intervention: null, assessment: null, error: e.message };
  }
}

export async function confirmInterventionClient(p: {
  intervention_id: string;
  tenant_id: string;
  session_id: string;
  confirmed_by: string;
  statement: string;
  effective_from_flight_day: number;
  today_flight_day: number;
}): Promise<{ plan: PlannedIntervention | null; error?: string }> {
  try {
    const res = await fetch(`/api/v1/campaigns/interventions/${encodeURIComponent(p.intervention_id)}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });
    const j = await res.json();
    if (!res.ok) return { plan: null, error: j.message };
    return { plan: j.data };
  } catch (e: any) {
    return { plan: null, error: e.message };
  }
}
