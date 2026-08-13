import { NextRequest, NextResponse } from 'next/server';
import { decisionStateStore } from '@/lib/decision-state-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');
  const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';

  if (!sessionId) {
    return NextResponse.json(
      { status: 'error', error: 'BadRequest', message: 'Missing session_id parameter' },
      { status: 400 }
    );
  }

  const state = decisionStateStore.getCurrentStateBySession(sessionId, tenantId);

  if (!state) {
    return NextResponse.json(
      { status: 'error', error: 'DecisionStateNotFound', message: 'No active decision state found for session' },
      { status: 404 }
    );
  }

  return NextResponse.json(state);
}
