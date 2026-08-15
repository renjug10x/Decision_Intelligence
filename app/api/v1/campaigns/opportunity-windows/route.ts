import { NextRequest, NextResponse } from 'next/server';
import {
  OpportunityDiscoveryRequest,
  validateOpportunityDiscoveryRequest
} from '@/packages/contracts/src/campaign-opportunity-model';
import {
  evaluateOpportunityWindows,
  resolveOpportunityCampaign
} from '@/lib/campaign-opportunity-engine';

/** CDI-03 Opportunity Window discovery / ranking. */
export async function POST(request: NextRequest) {
  try {
    const payload: OpportunityDiscoveryRequest = await request.json();
    const validation = validateOpportunityDiscoveryRequest(payload);
    if (!validation.valid) {
      throw new Error(validation.errors.join('; '));
    }
    const campaign = resolveOpportunityCampaign(payload);
    const windows = evaluateOpportunityWindows(campaign, {
      discovery_horizon_days: payload.discovery_horizon_days,
      window_duration_days: payload.window_duration_days
    });
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-opportunity-windows',
      data: windows
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
