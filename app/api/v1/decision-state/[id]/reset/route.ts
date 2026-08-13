import { NextRequest, NextResponse } from 'next/server';
import { decisionStateStore } from '@/lib/decision-state-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const resetState = decisionStateStore.resetDecisionState(resolvedParams.id);

  if (!resetState) {
    return NextResponse.json(
      { status: 'error', error: 'DecisionStateNotFound', message: `Decision state ${resolvedParams.id} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json(resetState);
}
