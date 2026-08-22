import { NextRequest, NextResponse } from 'next/server';
import { FlightProjectionRequest } from '@/packages/contracts/src/campaign-continuous-timeline-model';
import { projectCampaignFlight } from '@/lib/campaign-continuous-timeline-engine';

/**
 * CTW-01 Continuous Campaign Timeline. Orchestration only — the flight arithmetic lives in the
 * engine, and the expectation it renders lives in CDI-05 behind the activated CDI-07A contract.
 */
export async function POST(request: NextRequest) {
  try {
    const payload: FlightProjectionRequest = await request.json();
    const projection = projectCampaignFlight(payload);
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'campaign-continuous-flight',
      data: projection,
      disclosures: {
        baseline: projection.activation.disclosure,
        actual_series: projection.lenses[0]?.disclosure,
        uncertainty:
          'Declared horizon uncertainty profile, not a calibrated interval — ' +
          projection.uncertainty.horizon_basis,
        non_scope: projection.non_scope
      }
    });
  } catch (e: any) {
    const rejection = e.rejection_id as string | undefined;
    const message = String(e.message || '');
    const notFound = message.startsWith('ContractNotFound');
    return NextResponse.json(
      {
        status: 'error',
        error: notFound ? 'NotFound' : rejection || 'BadRequest',
        rejection_id: rejection,
        message,
        timestamp: new Date().toISOString()
      },
      { status: notFound ? 404 : 400 }
    );
  }
}
