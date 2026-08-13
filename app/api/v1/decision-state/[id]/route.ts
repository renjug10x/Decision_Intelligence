import { NextRequest, NextResponse } from 'next/server';
import { decisionStateStore } from '@/lib/decision-state-store';
import { ingestJourneyEvent } from '@/lib/journey-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const state = decisionStateStore.getDecisionStateById(resolvedParams.id);

  if (!state) {
    return NextResponse.json(
      { status: 'error', error: 'DecisionStateNotFound', message: `Decision state ${resolvedParams.id} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json(state);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const body = await request.json();
    const result = decisionStateStore.applyCommandTransition(resolvedParams.id, body);

    if (result.status === 'error') {
      return NextResponse.json(
        { status: 'error', error: 'InvalidTransition', message: result.error },
        { status: 400 }
      );
    }

    if (result.status === 'conflict') {
      return NextResponse.json(
        {
          status: 'conflict',
          error: 'VersionConflict',
          message: result.error,
          current_version: result.previous_version
        },
        { status: 409 }
      );
    }

    // On successful state transition, emit Journey Telemetry event (Section 43)
    if (result.status === 'success' && result.state) {
      const isIntervention = result.command_type === 'SELECT_INTERVENTION' || result.command_type === 'DESELECT_INTERVENTION';
      ingestJourneyEvent({
        event_id: `evt_ds_${Math.random().toString(36).substr(2, 9)}`,
        event_type: isIntervention ? 'INTERVENTION_SELECTED' : 'SCENARIO_CHANGED',
        tenant_id: result.state.tenant_id,
        user_id: 'demo_user',
        persona_id: result.state.persona_id,
        session_id: result.state.session_id,
        domain_id: result.state.domain_id,
        experiment_id: 'EXP-COMMITMENT-01',
        solution_id: 'SOL-DEMAND-02',
        decision_id: result.decision_state_id,
        timestamp: new Date().toISOString(),
        source: body.source_component || 'DecisionStateAPI',
        previous_state: { version: result.previous_version },
        new_state: { version: result.new_version, changed_fields: result.changed_fields },
        metadata: {
          command_type: result.command_type,
          derived_impacts: result.derived_impacts
        },
        schema_version: '1.0',
        data_classification: 'synthetic_demo',
        synthetic_demo: true
      });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', error: 'InvalidJson', message: error.message },
      { status: 400 }
    );
  }
}
