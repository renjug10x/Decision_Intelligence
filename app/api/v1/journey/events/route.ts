import { NextRequest, NextResponse } from 'next/server';
import { JourneyEvent } from '@/packages/contracts/src/index';
import { ingestJourneyEvent, queryJourneyEvents } from '@/lib/journey-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body as JourneyEvent;

    const result = ingestJourneyEvent(event);

    if (!result.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'BadRequest',
          message: 'Malformed or invalid journey event payload',
          details: result.errors,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        status: 'accepted',
        event_id: result.event_id,
        correlation_id: result.correlation_id,
        timestamp: new Date().toISOString()
      },
      { status: 202 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'InvalidJson',
        message: error.message || 'Failed to parse JSON body',
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id') || undefined;
  const tenantId = searchParams.get('tenant_id') || undefined;
  const eventType = searchParams.get('event_type') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const events = queryJourneyEvents({
    session_id: sessionId,
    tenant_id: tenantId,
    event_type: eventType,
    limit
  });

  return NextResponse.json({
    status: 'success',
    count: events.length,
    timestamp: new Date().toISOString(),
    data: events
  });
}
