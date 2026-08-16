import { NextRequest, NextResponse } from 'next/server';
import { TimelineProjectionRequest } from '@/packages/contracts/src/campaign-timeline-model';
import { projectDecisionTimeline } from '@/lib/campaign-timeline-engine';
import { discoverCampaignOpportunity } from '@/lib/campaign-opportunity-engine';
import { evaluateCampaignReadinessWithDiscovery } from '@/lib/campaign-readiness-engine';

/** CDI-05 Decision Timeline + Demand Decomposition. Orchestration only. */
export async function POST(request: NextRequest) {
  try {
    const payload: TimelineProjectionRequest = await request.json();

    // Optional integrations — absence degrades, never blocks
    let opportunity_discovery = payload.opportunity_discovery;
    let readiness = payload.readiness;
    if (!opportunity_discovery && (payload.campaign_intent_id || payload.campaign_intent)) {
      try {
        opportunity_discovery = discoverCampaignOpportunity({
          tenant_id: payload.tenant_id,
          session_id: payload.session_id,
          campaign_intent_id: payload.campaign_intent_id,
          campaign_intent: payload.campaign_intent
        });
      } catch {
        /* K2-style degrade */
      }
    }
    if (!readiness && (payload.campaign_intent_id || payload.campaign_intent)) {
      try {
        const r = evaluateCampaignReadinessWithDiscovery({
          tenant_id: payload.tenant_id,
          session_id: payload.session_id,
          campaign_intent_id: payload.campaign_intent_id,
          campaign_intent: payload.campaign_intent,
          include_signals: payload.include_signals,
          opportunity_discovery
        });
        readiness = r.readiness;
      } catch {
        /* degrade framing */
      }
    }

    const result = projectDecisionTimeline({
      ...payload,
      opportunity_discovery,
      readiness
    });

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-decision-timeline',
      data: result,
      disclosures: {
        allocation_profile: 'FLAT_RATE_IDENTITY — information_preserving_identity',
        pre_campaign: 'modelled run-rate, not observed history',
        post_campaign: 'structurally present, numerically empty',
        revenue_lens: 'NOT_AVAILABLE — awaiting realised_unit_selling_price_gbp',
        confidence: 'band-only on primary surface'
      }
    });
  } catch (e: any) {
    const rejection = e.rejection_id as string | undefined;
    const notFound = String(e.message).startsWith('CampaignIntentNotFound');
    return NextResponse.json(
      {
        status: 'error',
        error: notFound ? 'NotFound' : rejection || 'BadRequest',
        rejection_id: rejection,
        message: e.message,
        timestamp: new Date().toISOString()
      },
      { status: notFound ? 404 : 400 }
    );
  }
}
