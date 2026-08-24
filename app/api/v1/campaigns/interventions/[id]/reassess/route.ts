import { NextRequest, NextResponse } from 'next/server';
import { plannedInterventionStore } from '@/lib/planned-intervention-store';
import { reassessPlannedIntervention, triggerReached } from '@/lib/campaign-intervention-engine';
import { DecisionMoment, ReassessmentVerdict } from '@/packages/contracts/src/campaign-intervention-model';

/**
 * CTW-02 — reassess a plan against the current evidence, and optionally act on the verdict.
 *
 * The reassessment is always recorded, whether or not the analyst acts on it. That is the point:
 * the record is the trail of why the recommendation changed, not just where it ended up.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { tenant_id, session_id, moments, today_flight_day, decision } = body as {
      tenant_id: string;
      session_id: string;
      moments: DecisionMoment[];
      today_flight_day: number;
      decision?: ReassessmentVerdict;
    };

    const plan = plannedInterventionStore.getById(id, tenant_id, session_id);
    if (!plan) {
      return NextResponse.json({ status: 'error', error: 'NotFound', message: `No planned intervention ${id}` }, { status: 404 });
    }

    const assessment = reassessPlannedIntervention(plan, moments || [], today_flight_day, new Date().toISOString());

    let status = plan.status;
    if (decision) {
      if (!assessment.options.includes(decision)) {
        return NextResponse.json(
          {
            status: 'error',
            error: 'OptionNotOffered',
            message: `"${decision}" is not one of the options this reassessment offers (${assessment.options.join(', ')}).`
          },
          { status: 400 }
        );
      }
      if (decision === 'CANCEL') status = 'CANCELLED';
      if (decision === 'RESCHEDULE' || decision === 'BRING_FORWARD') {
        if (assessment.moment_flight_day !== null) {
          plannedInterventionStore.reschedule(id, tenant_id, session_id, assessment.moment_flight_day);
        }
      }
    } else if (triggerReached(plan, today_flight_day)) {
      status = 'AWAITING_APPROVAL';
    }

    const updated = plannedInterventionStore.addReassessment(
      id,
      tenant_id,
      session_id,
      decision ? { ...assessment, reason: `${assessment.reason} Analyst chose: ${decision.replace(/_/g, ' ').toLowerCase()}.` } : assessment,
      status
    );

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-interventions',
      data: { intervention: updated, assessment },
      disclosures: {
        trail: 'Every reassessment is kept. A plan that was kept, moved and then cancelled reads back as exactly that.'
      }
    });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', error: 'BadRequest', message: String(e?.message || 'Could not reassess') }, { status: 400 });
  }
}
