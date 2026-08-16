import { NextRequest, NextResponse } from 'next/server';
import { clearCampaignIntents, getOrCreateCampaignIntentDraft } from '@/lib/campaign-intent-store';
import { clearCommercialIntents } from '@/lib/commercial-intent-store';
import { decisionContractStore } from '@/lib/decision-contract-store';
import { preMortemStore } from '@/lib/pre-mortem-store';
import { learningCandidateStore } from '@/lib/learning-candidate-store';
import { resetDecisionState } from '@/lib/decision-state-store';

/**
 * Reset the Campaign Decision workspace for ONE tenant/session.
 *
 * Scope is deliberately narrow: only the decision artefacts this session authored
 * (campaign intent, its projected commercial intent, decision contracts, pre-mortems,
 * learning candidates, shared decision state) are cleared. Seeded world data, other
 * sessions and other tenants are never touched — every store call below is passed an
 * explicit tenant/session pair, and the stores treat an omitted pair as "clear all",
 * so the pair must never be omitted here.
 *
 * Downstream analysis (evaluation, opportunity, readiness, timeline, frontier) holds no
 * server-side state of its own: each is derived on demand from the campaign intent, so
 * clearing the intent is what makes stale analysis unreachable rather than merely hidden.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    const tenantId = payload.tenant_id || 'tenant_uk_retail_01';
    const sessionId = payload.session_id || 'sess_001';

    if (!tenantId || !sessionId) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'BadRequest',
          message: 'tenant_id and session_id are required — a reset is never global',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    decisionContractStore.clear(tenantId, sessionId);
    preMortemStore.clear(tenantId, sessionId);
    learningCandidateStore.clear(tenantId, sessionId);
    clearCommercialIntents(tenantId, sessionId);
    clearCampaignIntents(tenantId, sessionId);
    resetDecisionState(tenantId, sessionId);

    // Hand back a fresh draft so the caller lands on a genuinely clean Campaign Intent
    // rather than an empty screen it has to re-request.
    const draft = getOrCreateCampaignIntentDraft(tenantId, sessionId);

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-decision-session-reset',
      data: draft,
      disclosures: {
        reset_scope: 'campaign_decision_session_only',
        preserved: 'seeded world data, other sessions and other tenants are untouched'
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'BadRequest',
        message: e.message,
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    );
  }
}
