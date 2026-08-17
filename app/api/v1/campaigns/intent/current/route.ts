import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCampaignIntent } from '@/lib/campaign-intent-store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenant_id') || 'tenant_uk_retail_01';
  const sessionId = searchParams.get('session_id') || 'sess_001';
  const intent = getCurrentCampaignIntent(tenantId, sessionId);

  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'campaign-decision-intent',
    data: intent
  });
}
