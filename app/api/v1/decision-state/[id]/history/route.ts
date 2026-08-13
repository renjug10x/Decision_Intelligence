import { NextRequest, NextResponse } from 'next/server';
import { decisionStateStore } from '@/lib/decision-state-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const history = decisionStateStore.getStateHistory(resolvedParams.id);

  return NextResponse.json({
    status: 'success',
    decision_state_id: resolvedParams.id,
    history_count: history.length,
    timestamp: new Date().toISOString(),
    versions: history
  });
}
