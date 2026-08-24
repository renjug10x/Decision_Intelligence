import { NextRequest, NextResponse } from 'next/server';
import { plannedInterventionStore } from '@/lib/planned-intervention-store';
import { validatePlannedIntervention } from '@/packages/contracts/src/campaign-intervention-model';

/**
 * CTW-02 — confirm an intervention.
 *
 * Confirmation records a decision. It changes no external system, because CogniX has none to change,
 * and it never rewrites the campaign's history: the effective day must be after today, and the
 * original expectation and every observation remain exactly as they were.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { tenant_id, session_id, confirmed_by, statement, effective_from_flight_day, today_flight_day } = body;

    const plan = plannedInterventionStore.getById(id, tenant_id, session_id);
    if (!plan) {
      return NextResponse.json({ status: 'error', error: 'NotFound', message: `No planned intervention ${id}` }, { status: 404 });
    }
    if (!confirmed_by?.trim() || !statement?.trim()) {
      return NextResponse.json(
        { status: 'error', error: 'BadRequest', message: 'Confirming an intervention needs who is confirming it and why.' },
        { status: 400 }
      );
    }
    if (!Number.isInteger(effective_from_flight_day) || effective_from_flight_day <= today_flight_day) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'EffectiveDayInPast',
          message: `An intervention can only take effect after today (day ${today_flight_day}). Elapsed days are never recomputed.`
        },
        { status: 400 }
      );
    }

    /**
     * Validate the confirmation the plan *would* have before writing it. Confirming first and
     * checking afterwards left a rejected confirmation committed in the store while the caller was
     * told it failed — the plan read as CONFIRMED on screen and 400 on the wire. A refusal must
     * leave the record exactly as it was.
     */
    const confirmation = {
      confirmed_by: confirmed_by.trim(),
      confirmed_at: new Date().toISOString(),
      statement: statement.trim(),
      effective_from_flight_day
    };
    const violations = validatePlannedIntervention(
      { ...plan, status: 'CONFIRMED', confirmation },
      today_flight_day
    );
    if (violations.length > 0) {
      return NextResponse.json(
        { status: 'error', error: 'InvariantViolation', message: violations.map(v => `${v.invariant} ${v.detail}`).join('; ') },
        { status: 400 }
      );
    }

    const updated = plannedInterventionStore.confirm(id, tenant_id, session_id, confirmation)!;

    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-interventions',
      data: updated,
      disclosures: {
        execution:
          'This records a decision inside CogniX. No external promotion system was contacted, and none was simulated.',
        history:
          'The activated decision, its original expectation and every observed day are unchanged. The reforecast is published beside them.'
      }
    });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', error: 'BadRequest', message: String(e?.message || 'Could not confirm') }, { status: 400 });
  }
}
