import { NextRequest, NextResponse } from 'next/server';
import { getSessionEvents } from '@/lib/journey-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const sessionId = resolvedParams.id;
  const events = getSessionEvents(sessionId);

  return NextResponse.json({
    status: 'success',
    session_id: sessionId,
    event_count: events.length,
    timestamp: new Date().toISOString(),
    events
  });
}
