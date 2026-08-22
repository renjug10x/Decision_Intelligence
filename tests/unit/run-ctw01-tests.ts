/**
 * CogniX CTW-01 — Continuous Campaign Timeline & Activation test suite.
 *
 * Adversarial where it matters. The three failures this work package must not have are a
 * prediction that reads as an observation, a second baseline competing with the activated
 * decision contract, and CTW-02 behaviour arriving early. Groups A–F attack exactly those,
 * and group G asserts that CDI-05 itself is unchanged.
 */

import {
  CampaignFlightProjection,
  ElapsedTelemetryReading,
  validateFlightProjection,
  CTW01_NON_SCOPE,
  FLIGHT_LENS_NON_SCOPE,
  OBSERVED_ELAPSED_REQUIRED_INPUT
} from '../../packages/contracts/src/campaign-continuous-timeline-model';
import { DecisionTimelineProjection } from '../../packages/contracts/src/campaign-timeline-model';
import { DecisionContract } from '../../packages/contracts/src/campaign-decision-contract-model';

import { projectCampaignFlight } from '../../lib/campaign-continuous-timeline-engine';
import { projectDecisionTimeline } from '../../lib/campaign-timeline-engine';
import { evaluateOutcomeFrontier } from '../../lib/campaign-frontier-engine';
import { createDecisionContract } from '../../lib/campaign-decision-contract-engine';
import { decisionContractStore } from '../../lib/decision-contract-store';
import { clearCampaignIntents, registerCampaignIntent } from '../../lib/campaign-intent-store';
import {
  getArchetypeById,
  buildCampaignIntentFromArchetype,
  CAMPAIGN_ARCHETYPES
} from '../../lib/campaign-archetypes';
import { buildElapsedTelemetryFromArchetype } from '../../lib/campaign-flight-client';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passCount++;
    console.log(`[PASS] ${testName}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
  }
}

function threw(fn: () => unknown): { threw: boolean; rejection?: string; message?: string } {
  try {
    fn();
    return { threw: false };
  } catch (e: any) {
    return { threw: true, rejection: e.rejection_id, message: String(e.message || '') };
  }
}

const TENANT = 'tenant_uk_retail_01';
const AS_OF = '2026-08-22T00:00:00.000Z';

interface Fixture {
  contract: DecisionContract;
  timeline: DecisionTimelineProjection;
  telemetry: ElapsedTelemetryReading[];
  intentId: string;
  session: string;
}

/** Builds the whole governed chain the way the surface does: intent → frontier → contract. */
function buildFixture(archetypeId: string, session: string, overrides?: any): Fixture {
  const archetype = getArchetypeById(archetypeId as any)!;
  const intent: any = buildCampaignIntentFromArchetype(archetype, {
    tenant_id: TENANT,
    session_id: session,
    ...(overrides || {})
  });
  registerCampaignIntent(intent);

  const frontierResponse: any = evaluateOutcomeFrontier({
    tenant_id: TENANT,
    session_id: session,
    campaign_intent_id: intent.intent_id,
    evaluation_timestamp: AS_OF
  } as any);
  const frontier = frontierResponse.frontier;

  const selection = frontier.selection;
  const resolution: any =
    selection?.status === 'SELECTED' && selection.selected_play_id
      ? {
          route: 'CONSTRAINT_RESOLVED',
          selected_play_id: selection.selected_play_id,
          selection_status: 'SELECTED',
          selection_basis: selection.selection_basis
        }
      : {
          route: 'HUMAN_RESOLVED',
          selected_play_id: frontier.frontier_play_ids[0],
          resolved_by: 'ctw01 suite',
          resolution_statement: 'fixture resolution',
          presented_alternatives: frontier.frontier_play_ids
        };

  const contract = createDecisionContract({
    tenant_id: TENANT,
    session_id: session,
    frontier,
    campaign_intent: intent,
    resolution,
    created_as_of: AS_OF
  } as any);

  const tl: any = projectDecisionTimeline({
    tenant_id: TENANT,
    session_id: session,
    campaign_intent_id: intent.intent_id,
    campaign_intent: intent
  } as any);

  return {
    contract,
    timeline: tl.projection ?? tl,
    telemetry: buildElapsedTelemetryFromArchetype(archetype),
    intentId: intent.intent_id,
    session
  };
}

function project(f: Fixture, telemetry?: ElapsedTelemetryReading[]): CampaignFlightProjection {
  return projectCampaignFlight({
    tenant_id: TENANT,
    session_id: f.session,
    contract_id: f.contract.contract_id,
    timeline: f.timeline,
    elapsed_telemetry: telemetry ?? f.telemetry
  });
}

async function runTests() {
  console.log('\n=== CTW-01 Continuous Campaign Timeline & Activation ===\n');
  decisionContractStore.clear();
  clearCampaignIntents();

  const base = buildFixture('ARCH-CHILLED-ELASTIC', 'sess_ctw_base');
  const flight = project(base);

  // ── A. Activation binds to the decision contract, and nothing else ──────────────────
  console.log('\n-- A. Activation --');
  assert(flight.activation.state === 'ACTIVE', 'A-01: activation state is ACTIVE');
  assert(
    flight.activation.contract_ref.contract_id === base.contract.contract_id,
    'A-02: activation references the contract that was created'
  );
  assert(
    flight.activation.decision_basis_digest === base.contract.decision_basis_digest,
    'A-03: the decision basis digest is carried verbatim from the contract'
  );
  assert(
    !Object.prototype.hasOwnProperty.call(flight.activation, 'expectation_value'),
    'A-04: the activation record carries no expectation of its own — no second baseline'
  );
  assert(
    flight.campaign_intent_id === base.contract.basis.campaign_intent_ref.id,
    'A-05: the flight is bound to the intent the contract binds, not to a screen value'
  );
  assert(
    flight.horizon.horizon_basis === 'activated_contract_campaign_window',
    'A-06: the horizon is the activated contract window'
  );

  {
    const r = threw(() =>
      projectCampaignFlight({
        tenant_id: TENANT,
        session_id: base.session,
        contract_id: 'no-such-contract',
        timeline: base.timeline,
        elapsed_telemetry: base.telemetry
      })
    );
    assert(r.threw && r.rejection === 'RJ-W3', 'A-07: an unknown contract is refused, not defaulted');
  }
  {
    const r = threw(() =>
      projectCampaignFlight({
        tenant_id: TENANT,
        session_id: base.session,
        contract_id: '',
        timeline: base.timeline,
        elapsed_telemetry: base.telemetry
      })
    );
    assert(r.threw && r.rejection === 'RJ-W3', 'A-08: there is no flight without an activation');
  }
  {
    // Tenant/session isolation — the same contract id under another session must not resolve.
    const r = threw(() =>
      projectCampaignFlight({
        tenant_id: TENANT,
        session_id: 'sess_someone_else',
        contract_id: base.contract.contract_id,
        timeline: base.timeline,
        elapsed_telemetry: base.telemetry
      })
    );
    assert(r.threw, 'A-09: a contract is not visible to another session');
  }

  // ── B. The three classes stay apart ────────────────────────────────────────────────
  console.log('\n-- B. Observed / simulated / predicted separation --');
  const demand = flight.lenses.find(l => l.lens === 'DEMAND')!;
  const predicted = demand.points.filter(p => p.horizon_class === 'PREDICTED_REMAINING');
  const elapsed = demand.points.filter(p => p.horizon_class === 'SIMULATED_ELAPSED');

  assert(predicted.length > 0 && elapsed.length > 0, 'B-01: the horizon carries both elapsed and predicted days');
  assert(
    predicted.every(p => p.actual_value === null),
    'B-02: no predicted day carries an actual value'
  );
  assert(
    predicted.every(p => p.deviation_abs === null && p.deviation_pct === null),
    'B-03: no predicted day carries a deviation'
  );
  assert(
    predicted.every(p => p.strength !== 'OBSERVED'),
    'B-04: no predicted day carries OBSERVED evidence strength'
  );
  assert(
    demand.points.every(p => p.horizon_class !== 'OBSERVED_ELAPSED'),
    'B-05: nothing is classed OBSERVED_ELAPSED — no ESF-6 admitted observation exists'
  );
  assert(
    demand.points.every(p => p.synthetic_demo === true),
    'B-06: every point remains synthetic_demo — no new origin of synthetic_demo = false'
  );
  assert(
    elapsed.every(p => p.strength === 'SEEDED_ASSUMPTION'),
    'B-07: an elapsed day is no stronger than the seeded ratio it is built from'
  );
  assert(
    predicted.every(p => (p.disclosure || '').toLowerCase().includes('not observed')),
    'B-08: every predicted day says on its face that it has not happened'
  );
  assert(
    validateFlightProjection(flight).length === 0,
    'B-09: the projection satisfies its own declared invariants'
  );

  // The invariants must actually bite, not merely pass on well-formed input.
  {
    const tampered: CampaignFlightProjection = JSON.parse(JSON.stringify(flight));
    const target = tampered.lenses[0].points.find(p => p.horizon_class === 'PREDICTED_REMAINING')!;
    target.actual_value = 12345;
    target.strength = 'OBSERVED';
    const v = validateFlightProjection(tampered);
    assert(
      v.some(x => x.invariant === 'W-INV-1') && v.some(x => x.invariant === 'W-INV-2'),
      'B-10: a predicted day given an actual and OBSERVED strength is caught by W-INV-1/W-INV-2'
    );
  }
  {
    const tampered: CampaignFlightProjection = JSON.parse(JSON.stringify(flight));
    tampered.lenses[0].points[0].horizon_class = 'OBSERVED_ELAPSED';
    const v = validateFlightProjection(tampered);
    assert(
      v.some(x => x.invariant === 'W-INV-3'),
      'B-11: claiming OBSERVED_ELAPSED without an admitted observation is caught by W-INV-3'
    );
  }
  {
    const tampered: CampaignFlightProjection = JSON.parse(JSON.stringify(flight));
    tampered.lenses[0].points.splice(3, 1);
    assert(
      validateFlightProjection(tampered).some(x => x.invariant === 'W-INV-5'),
      'B-12: a hole in the horizon is caught by W-INV-5'
    );
  }
  {
    const tampered: CampaignFlightProjection = JSON.parse(JSON.stringify(flight));
    tampered.lenses[0].points[0].deviation_abs = null;
    assert(
      validateFlightProjection(tampered).some(x => x.invariant === 'W-INV-6'),
      'B-13: an actual without a deviation is caught by W-INV-6'
    );
  }
  {
    const tampered: CampaignFlightProjection = JSON.parse(JSON.stringify(flight));
    const pt = tampered.lenses[0].points[0];
    pt.expectation_lower = (pt.expectation_value as number) + 1;
    assert(
      validateFlightProjection(tampered).some(x => x.invariant === 'W-INV-7'),
      'B-14: a band that does not bracket its expectation is caught by W-INV-7'
    );
  }

  // ── C. The full horizon, and that it responds to the configuration ─────────────────
  console.log('\n-- C. Full horizon --');
  assert(
    flight.horizon.flight_days === flight.horizon.elapsed_days + flight.horizon.remaining_days,
    'C-01: elapsed and remaining account for the whole window'
  );
  assert(flight.horizon.remaining_days > 0, 'C-02: the remaining horizon exists at all');
  assert(
    demand.points.length === flight.horizon.flight_days,
    'C-03: every day of the window is represented, not only the elapsed ones'
  );
  assert(
    demand.points.every(p => p.expectation_value !== null),
    'C-04: the expectation is present on every day, elapsed and remaining alike'
  );

  {
    // The pre-CTW-01 defect: the twin ignored the configuration. A longer campaign must
    // now produce a longer horizon, because the horizon comes from the activated contract.
    const longer = buildFixture('ARCH-CHILLED-ELASTIC', 'sess_ctw_long', { duration_days: 28 });
    const longFlight = project(longer);
    assert(
      longFlight.horizon.flight_days > flight.horizon.flight_days,
      'C-05: a longer configured campaign yields a longer governed horizon',
      `${longFlight.horizon.flight_days} vs ${flight.horizon.flight_days}`
    );
    assert(
      longFlight.horizon.elapsed_days === flight.horizon.elapsed_days,
      'C-06: lengthening the campaign adds predicted days, never elapsed ones'
    );
  }

  // ── D. Deviation is like-for-like against the contract's own expectation ───────────
  console.log('\n-- D. Deviation --');
  assert(
    demand.deviation_correspondence === 'LIKE_FOR_LIKE',
    'D-01: deviation is declared like-for-like'
  );
  assert(
    demand.actual_series_basis === 'PROJECTION_BASIS_SCALED_BY_OBSERVED_RATIO',
    'D-02: the actual series is declared as the projection scaled by a scale-free ratio'
  );
  {
    const pt = elapsed[elapsed.length - 1];
    const recomputed = Number(((pt.actual_value as number) - (pt.expectation_value as number)).toFixed(2));
    assert(
      Math.abs(recomputed - (pt.deviation_abs as number)) < 0.02,
      'D-03: deviation is actual minus expectation in the projection basis, not an asserted figure'
    );
  }
  {
    // The seeded telemetry supplies a ratio and nothing else: doubling both sides of the
    // seeded pair must leave the deviation untouched, because the ratio is scale-free.
    const scaled = base.telemetry.map(t => ({
      ...t,
      demand_expected: t.demand_expected * 2,
      demand_observed: t.demand_observed * 2
    }));
    const scaledFlight = project(base, scaled);
    const a = flight.lenses[0].points.map(p => p.deviation_pct);
    const b = scaledFlight.lenses[0].points.map(p => p.deviation_pct);
    assert(
      JSON.stringify(a) === JSON.stringify(b),
      'D-04: the deviation is scale-free — the seeded levels are never used as a baseline'
    );
  }
  {
    // A telemetry pair that cannot yield a ratio must produce no actual, never a zero.
    const bad = base.telemetry.map((t, i) => (i === 0 ? { ...t, demand_expected: 0 } : t));
    const badFlight = project(base, bad);
    const d0 = badFlight.lenses[0].points[0];
    assert(
      d0.actual_value === null && d0.deviation_abs === null,
      'D-05: an undefined ratio yields no actual and no deviation, not a defaulted "on plan"'
    );
    assert(
      typeof badFlight.lenses[0].non_correspondence_reason === 'string',
      'D-06: the refusal is stated rather than silent'
    );
    assert(validateFlightProjection(badFlight).length === 0, 'D-07: a refused day still satisfies the invariants');
  }
  {
    const summary = flight.deviation.find(d => d.lens === 'DEMAND')!;
    assert(
      summary.elapsed_days_assessed === flight.horizon.elapsed_days,
      'D-08: the summary assesses exactly the elapsed days'
    );
    assert(
      summary.state !== 'NOT_ASSESSABLE' && summary.statement.includes('%'),
      'D-09: the deviation is stated in words from its own numbers'
    );
  }
  {
    const none = project(base, []);
    const s = none.deviation.find(d => d.lens === 'DEMAND')!;
    assert(
      s.state === 'NOT_ASSESSABLE' && none.horizon.elapsed_days === 0,
      'D-10: with nothing elapsed the campaign is not said to be on or off plan'
    );
    assert(
      none.lenses[0].points.every(p => p.horizon_class === 'PREDICTED_REMAINING'),
      'D-11: with nothing elapsed the entire horizon is predicted'
    );
  }

  // ── E. Declared uncertainty, carried not invented ──────────────────────────────────
  console.log('\n-- E. Uncertainty --');
  assert(
    demand.uncertainty_basis === 'cdi05_attributable_effect_envelope_transformed',
    'E-01: uncertainty is the CDI-05 envelope, transformed rather than invented'
  );
  assert(
    flight.uncertainty.horizon_basis === 'declared_horizon_uncertainty_profile',
    'E-02: the declared basis is carried through and published'
  );
  assert(
    /declared/i.test(demand.uncertainty_disclosure) && !/calibrat(ed|ion) interval/i.test(demand.uncertainty_disclosure),
    'E-03: the uncertainty is described as declared, never as a calibrated interval'
  );
  {
    const banded = demand.points.filter(p => p.expectation_lower !== null);
    const first = banded[0];
    const last = banded[banded.length - 1];
    const widthFirst = (first.expectation_upper as number) - (first.expectation_lower as number);
    const widthLast = (last.expectation_upper as number) - (last.expectation_lower as number);
    assert(widthLast > widthFirst, 'E-04: the declared band widens with horizon');
  }
  assert(
    flight.uncertainty.points.every(
      p => p.period_index >= flight.horizon.first_period_index && p.period_index <= flight.horizon.last_period_index
    ),
    'E-05: the envelope is restricted to the flight window and not extrapolated beyond it'
  );
  {
    const source = base.timeline.attributable_effect_envelope.points.filter(
      p => p.period_index >= flight.horizon.first_period_index && p.period_index <= flight.horizon.last_period_index
    );
    assert(
      JSON.stringify(source) === JSON.stringify(flight.uncertainty.points),
      'E-06: envelope values are copied from CDI-05 unchanged'
    );
  }

  // ── F. The CTW-02 boundary, and the refused metrics ────────────────────────────────
  console.log('\n-- F. Scope boundary --');
  assert(
    !flight.trajectories.some(t => t.kind === 'REFORECAST'),
    'F-01: CTW-01 emits no REFORECAST trajectory'
  );
  assert(
    flight.trajectories.some(t => t.kind === 'INTERVENTION' && t.covers === 'FULL_HORIZON') &&
      flight.trajectories.some(t => t.kind === 'OBSERVED' && t.covers === 'ELAPSED_ONLY'),
    'F-02: the expectation covers the full horizon and the running series covers elapsed days only'
  );
  assert(
    (flight.trajectories.find(t => t.kind === 'OBSERVED')!.points.length) === flight.horizon.elapsed_days,
    'F-03: the running trajectory is never extended past today'
  );
  assert(
    flight.lenses.every(l => l.lens === 'DEMAND' || l.lens === 'CONTRIBUTION'),
    'F-04: only the approved metrics are carried'
  );
  assert(
    !flight.lenses.some(l => (l.lens as string) === 'REVENUE'),
    'F-05: revenue is not introduced — the CDI-05 refusal stands'
  );
  assert(
    FLIGHT_LENS_NON_SCOPE.some(n => n.lens === 'REVENUE') &&
      FLIGHT_LENS_NON_SCOPE.some(n => n.lens === 'INVENTORY'),
    'F-06: each refused lens publishes the reason it is refused'
  );
  assert(
    CTW01_NON_SCOPE.some(n => /CTW-02/.test(n)) && flight.non_scope.length === CTW01_NON_SCOPE.length,
    'F-07: the CTW-02 boundary is published on the projection itself'
  );
  assert(
    OBSERVED_ELAPSED_REQUIRED_INPUT.status === 'AWAITING_ATTESTED_OBSERVATION',
    'F-08: what would make an observation admissible is published, not quietly closed'
  );
  {
    const r = threw(() =>
      projectCampaignFlight({
        tenant_id: TENANT,
        session_id: base.session,
        contract_id: base.contract.contract_id,
        timeline: base.timeline,
        elapsed_telemetry: base.telemetry,
        expectation_override: { index_pct: 200 }
      })
    );
    assert(r.threw && r.rejection === 'RJ-W1', 'F-09: a caller-supplied expectation is refused');
  }
  {
    const r = threw(() =>
      projectCampaignFlight({
        tenant_id: TENANT,
        session_id: base.session,
        contract_id: base.contract.contract_id,
        timeline: base.timeline,
        elapsed_telemetry: base.telemetry,
        reforecast_override: { any: true }
      })
    );
    assert(r.threw && r.rejection === 'RJ-W2', 'F-10: a caller-supplied reforecast is refused — that is CTW-02');
  }
  {
    // Same tenant and session, different decision: the intent guard is what must fire here,
    // which is why the session is held constant rather than varied (A-09 covers that case).
    const foreign: DecisionTimelineProjection = JSON.parse(JSON.stringify(base.timeline));
    (foreign as any).campaign_intent_id = 'cdi_intent_some_other_decision';
    const r = threw(() =>
      projectCampaignFlight({
        tenant_id: TENANT,
        session_id: base.session,
        contract_id: base.contract.contract_id,
        timeline: foreign,
        elapsed_telemetry: base.telemetry
      })
    );
    assert(
      r.threw && r.rejection === 'RJ-W4',
      'F-11: a projection for a different decision is refused, not rendered',
      `rejection=${r.rejection}`
    );
  }
  {
    const r = threw(() =>
      projectCampaignFlight({
        tenant_id: TENANT,
        session_id: base.session,
        contract_id: base.contract.contract_id,
        timeline: undefined as any,
        elapsed_telemetry: base.telemetry
      })
    );
    assert(
      r.threw && r.rejection === 'RJ-W4',
      'F-12: CTW-01 renders a CDI-05 projection and refuses to invent one'
    );
  }

  // ── G. CDI-05 and the estate are unchanged ─────────────────────────────────────────
  console.log('\n-- G. CDI-05 unchanged --');
  assert(
    base.timeline.trajectories.every(t => t.kind === 'COUNTERFACTUAL' || t.kind === 'INTERVENTION'),
    'G-01: CDI-05 still emits exactly its own two trajectory kinds'
  );
  assert(
    base.timeline.lenses.find(l => l.lens === 'REVENUE')?.availability === 'NOT_AVAILABLE',
    'G-02: the CDI-05 revenue refusal is untouched'
  );
  assert(
    base.timeline.trajectories.find(t => t.kind === 'INTERVENTION')!.points.some(p => p.phase === 'POST_CAMPAIGN'),
    'G-03: CDI-05 still carries POST_CAMPAIGN structurally'
  );
  assert(base.contract.status === 'ACTIVE' && base.contract.synthetic_demo === true, 'G-04: the contract is unchanged in kind');
  assert(
    flight.timeline_projection_id === base.timeline.projection_id &&
      flight.counterfactual_id === base.timeline.counterfactual_id,
    'G-05: the flight cites the projection it read rather than producing its own'
  );

  // ── H. Every archetype, not just the demo default ──────────────────────────────────
  console.log('\n-- H. All archetypes --');
  let allOk = 0;
  for (const arch of CAMPAIGN_ARCHETYPES) {
    const f = buildFixture(arch.id, `sess_ctw_${arch.id}`);
    const p = project(f);
    const clean =
      validateFlightProjection(p).length === 0 &&
      p.horizon.flight_days === p.lenses[0].points.length &&
      p.lenses.every(l => l.points.every(x => x.horizon_class !== 'OBSERVED_ELAPSED')) &&
      !p.trajectories.some(t => t.kind === 'REFORECAST');
    if (clean) allOk++;
    else console.error(`  archetype ${arch.id} failed`);
  }
  assert(
    allOk === CAMPAIGN_ARCHETYPES.length,
    `H-01: all ${CAMPAIGN_ARCHETYPES.length} archetypes project a valid continuous flight`,
    `${allOk}/${CAMPAIGN_ARCHETYPES.length}`
  );
  {
    // Every archetype previously stopped dead at current_day. None may now.
    const gained = CAMPAIGN_ARCHETYPES.map(a => {
      const f = buildFixture(a.id, `sess_ctw_gain_${a.id}`);
      return project(f).horizon.remaining_days;
    });
    assert(
      gained.every(g => g > 0),
      'H-02: every archetype now carries a remaining horizon that did not exist before'
    );
  }

  console.log('\n====================================================');
  console.log(`CTW-01 RESULTS: ${passCount} passed, ${failCount} failed`);
  console.log('====================================================');

  if (failCount > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
