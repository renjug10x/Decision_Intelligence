import { NextRequest, NextResponse } from 'next/server';
import {
  AUTOMATIC_EXECUTION_DISCLOSURE,
  PlanInterventionRequest,
  PlannedIntervention
} from '@/packages/contracts/src/campaign-intervention-model';
import { plannedInterventionStore } from '@/lib/planned-intervention-store';

/** CTW-02 — list and plan conditional interventions. Planning changes no campaign. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant_id');
  const sessionId = searchParams.get('session_id');
  if (!tenantId || !sessionId) {
    return NextResponse.json({ status: 'error', error: 'BadRequest', message: 'tenant_id and session_id are required' }, { status: 400 });
  }
  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'campaign-interventions',
    data: { interventions: plannedInterventionStore.listForSession(tenantId, sessionId) },
    disclosures: { automatic_execution: AUTOMATIC_EXECUTION_DISCLOSURE }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: PlanInterventionRequest = await request.json();

    // The one mode CogniX does not offer is refused at the boundary rather than accepted and
    // quietly downgraded — a plan that says it will execute must never exist in the store.
    if (body.mode === 'AUTOMATIC_EXECUTION') {
      return NextResponse.json(
        {
          status: 'error',
          error: 'AUTOMATIC_EXECUTION_UNAVAILABLE',
          message: AUTOMATIC_EXECUTION_DISCLOSURE,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }
    if (!body.tenant_id || !body.session_id || !body.contract_id || !body.moment_id || !body.created_by?.trim()) {
      return NextResponse.json(
        { status: 'error', error: 'BadRequest', message: 'A plan needs a tenant, session, activated contract, moment and an accountable owner.' },
        { status: 400 }
      );
    }

    const plan: PlannedIntervention = {
      intervention_id: `piv_${body.moment_id}_${plannedInterventionStore.listForSession(body.tenant_id, body.session_id).length + 1}`,
      tenant_id: body.tenant_id,
      session_id: body.session_id,
      contract_id: body.contract_id,
      decision_basis_digest: body.decision_basis_digest,
      moment_id: body.moment_id,
      moment_kind: body.moment_kind,
      action: body.action,
      targeted_flight_day: body.targeted_flight_day,
      window: body.window,
      trigger_condition: body.trigger_condition,
      mode: body.mode,
      status: 'PLANNED',
      created_by: body.created_by.trim(),
      rationale: body.rationale,
      created_at: body.created_at || new Date().toISOString(),
      reassessments: []
    };

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-interventions',
      data: plannedInterventionStore.create(plan),
      disclosures: {
        planning: 'Planning records an intention. It changes no campaign and executes nothing.',
        automatic_execution: AUTOMATIC_EXECUTION_DISCLOSURE
      }
    });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', error: 'BadRequest', message: String(e?.message || 'Could not plan') }, { status: 400 });
  }
}
