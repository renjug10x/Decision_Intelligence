import { NextRequest, NextResponse } from 'next/server';
import { approveDecision, deferDecision } from '@/lib/decision-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'approve';

    if (action === 'defer') {
      const result = deferDecision(id);
      if (!result) return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
      return NextResponse.json({ decision: result });
    }

    const result = await approveDecision(id, body.approvedBy ?? 'Executive', body.apiKey);
    if ('error' in result && !('status' in result)) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Approval failed' }, { status: 500 });
  }
}
