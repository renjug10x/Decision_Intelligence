import { NextRequest, NextResponse } from 'next/server';
import { decisionStateStore } from '@/lib/decision-state-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, session_id, domain_id, persona_id, scenario_id, scenario_family } = body;

    if (!tenant_id || !session_id) {
      return NextResponse.json(
        { status: 'error', error: 'BadRequest', message: 'Missing tenant_id or session_id' },
        { status: 400 }
      );
    }

    const state = decisionStateStore.createOrInitialiseState({
      tenant_id,
      session_id,
      domain_id,
      persona_id,
      scenario_id,
      scenario_family
    });

    return NextResponse.json(state, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', error: 'InvalidJson', message: error.message },
      { status: 400 }
    );
  }
}
