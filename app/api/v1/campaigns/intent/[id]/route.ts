import { NextRequest, NextResponse } from 'next/server';
import { getCampaignIntentById } from '@/lib/campaign-intent-store';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenant_id');
  const sessionId = request.nextUrl.searchParams.get('session_id') || undefined;

  // Campaign Intent ids are derived from tenant/session and are therefore enumerable;
  // an id on its own must never authorise a read.
  if (!tenantId) {
    return NextResponse.json({
      status: 'error',
      error: 'BadRequest',
      message: 'tenant_id is required to resolve a CampaignIntent by id',
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }

  const intent = getCampaignIntentById(id, tenantId, sessionId);

  if (!intent) {
    return NextResponse.json({
      status: 'error',
      error: 'NotFound',
      message: `CampaignIntent ${id} not found`,
      timestamp: new Date().toISOString()
    }, { status: 404 });
  }

  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'campaign-decision-intent',
    data: intent
  });
}
