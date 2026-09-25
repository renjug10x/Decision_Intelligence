/**
 * The certified scenario RECORD, for the browser's registry projection (`SCI-07R`, ADR-085 part 3).
 *
 * Client engines resolve through the browser's own copy of the `SCI-01` registry, which is seeded
 * from the compiled packs and never learned of an authored scenario — so after selecting one, every
 * client surface kept computing the previous scenario, in every `COGNIX_WORLD_MODE`. This route is
 * how the browser learns a record the authority has ALREADY admitted, and nothing else:
 *
 *   - resolved for the caller's tenant — an invisible scenario is refused as an unregistered one is;
 *   - served only if it is CERTIFIED by the gate in this process — never a candidate or a draft;
 *   - the record exactly as registered. No field is computed here.
 *
 * Returning a record grants nothing: activation remains `POST /api/v1/scenarios`, through the gate.
 */
import { NextRequest, NextResponse } from 'next/server';
import { platformReceiptNowIso } from '@/packages/contracts/src/scenario-clock';
import { resolveScenarioForRequest } from '@/app/api/v1/_shared/scenario-request';
import { certifyScenario, certificationStateOf, summariseCertification } from '@/lib/scenario-runtime';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resolution = resolveScenarioForRequest(searchParams, 'GET /api/v1/scenarios/record');
  if (!resolution.ok) return resolution.response;

  const scenario = resolution.scenario;
  const certification = certifyScenario(scenario);
  const state = certificationStateOf(certification);
  if (state !== 'CERTIFIED') {
    return NextResponse.json(
      {
        status: 'error',
        error: 'ScenarioNotCertified',
        message: `Scenario "${scenario.identity.scenario_id}" is not certified, so its record is not published. ${summariseCertification(certification)}`,
        timestamp: platformReceiptNowIso()
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'scenario-record',
    scenario_id: scenario.identity.scenario_id,
    certification_state: state,
    timestamp: platformReceiptNowIso(),
    data: scenario
  });
}
