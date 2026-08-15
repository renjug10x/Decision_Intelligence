import { NextRequest, NextResponse } from 'next/server';
import { OpportunityDiscoveryRequest } from '@/packages/contracts/src/campaign-opportunity-model';
import { discoverCampaignOpportunity } from '@/lib/campaign-opportunity-engine';

/** CDI-03 combined Opportunity Window + Micro-Market discovery. */
export async function POST(request: NextRequest) {
  try {
    const payload: OpportunityDiscoveryRequest = await request.json();
    const result = discoverCampaignOpportunity(payload);
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-opportunity-discovery',
      data: result
    });
  } catch (e: any) {
    const notFound = String(e.message).startsWith('CampaignIntentNotFound');
    return NextResponse.json(
      {
        status: 'error',
        error: notFound ? 'NotFound' : 'BadRequest',
        message: e.message,
        timestamp: new Date().toISOString()
      },
      { status: notFound ? 404 : 400 }
    );
  }
}
