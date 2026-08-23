/**
 * CogniX CTW-01R — Campaign Decision Experience test suite.
 *
 * CTW-01R changes how the journey is understood, not what it projects. The suite therefore
 * attacks two things: that the new experience is genuinely derived (group C especially — a
 * narration that could be authored per campaign would be worthless), and that the projection
 * semantics CTW-01 froze are byte-for-byte untouched (group E).
 */

import {
  CampaignFlightProjection,
  DECISION_OWNER_ROLES,
  DECISION_RATIONALES,
  DECISION_CONFIRMATION_EXPLANATION,
  DECISION_OWNER_HELPER,
  DECISION_RATIONALE_HELPER,
  ATTENTION_THRESHOLD_ATTENTION_PCT,
  ATTENTION_THRESHOLD_MONITOR_PCT,
  FLAT_HORIZON_DISCLOSURE,
  PROMOTION_STAGE_NOT_DERIVABLE,
  buildResolutionStatement,
  decisionOwnerLabel,
  derivePromotionExperimentStage,
  validateFlightProjection,
  ElapsedTelemetryReading
} from '../../packages/contracts/src/campaign-continuous-timeline-model';
import { DecisionTimelineProjection } from '../../packages/contracts/src/campaign-timeline-model';

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
import { campaignExperimentStore } from '../../lib/campaign-experiment-store';

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

const TENANT = 'tenant_uk_retail_01';
const AS_OF = '2026-08-22T00:00:00.000Z';

interface Fixture {
  contract: any;
  timeline: DecisionTimelineProjection;
  telemetry: ElapsedTelemetryReading[];
  session: string;
}

function buildFixture(archetypeId: string, session: string): Fixture {
  const archetype = getArchetypeById(archetypeId as any)!;
  const intent: any = buildCampaignIntentFromArchetype(archetype, {
    tenant_id: TENANT,
    session_id: session
  });
  registerCampaignIntent(intent);
  const fr: any = evaluateOutcomeFrontier({
    tenant_id: TENANT,
    session_id: session,
    campaign_intent_id: intent.intent_id,
    evaluation_timestamp: AS_OF
  } as any);
  const frontier = fr.frontier;
  const sel = frontier.selection;
  const resolution: any =
    sel?.status === 'SELECTED' && sel.selected_play_id
      ? {
          route: 'CONSTRAINT_RESOLVED',
          selected_play_id: sel.selected_play_id,
          selection_status: 'SELECTED',
          selection_basis: sel.selection_basis
        }
      : {
          route: 'HUMAN_RESOLVED',
          selected_play_id: frontier.frontier_play_ids[0],
          resolved_by: 'Category Manager',
          resolution_statement: 'Protect margin',
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
  console.log('\n=== CTW-01R Campaign Decision Experience ===\n');
  decisionContractStore.clear();
  clearCampaignIntents();
  campaignExperimentStore.clear();

  const base = buildFixture('ARCH-CHILLED-ELASTIC', 'sess_r_base');
  const flight = project(base);

  // ── A. Decision confirmation replaces free text without losing provenance ───────────
  console.log('\n-- A. Decision confirmation --');
  assert(DECISION_OWNER_ROLES.length >= 5, 'A-01: a governed set of decision owners exists');
  assert(DECISION_RATIONALES.length >= 5, 'A-02: a governed set of decision rationales exists');
  assert(
    DECISION_OWNER_ROLES.some(r => r.id === 'OTHER') && DECISION_RATIONALES.some(r => r.id === 'OTHER'),
    'A-03: both vocabularies admit an answer they do not list'
  );
  assert(
    /more than one viable option/i.test(DECISION_CONFIRMATION_EXPLANATION) &&
      /a person must confirm/i.test(DECISION_CONFIRMATION_EXPLANATION),
    'A-04: the reason a human is asked is stated, not assumed'
  );
  assert(
    /accountable/i.test(DECISION_OWNER_HELPER) && /primary reason/i.test(DECISION_RATIONALE_HELPER),
    'A-05: each field carries a helper written for an analyst'
  );
  assert(
    decisionOwnerLabel('CATEGORY_MANAGER') === 'Category Manager',
    'A-06: a governed owner resolves to its label'
  );
  assert(
    decisionOwnerLabel('OTHER', '  Trading Controller  ') === 'Trading Controller',
    'A-07: a custom owner is used verbatim and trimmed'
  );
  assert(decisionOwnerLabel('OTHER', '') === '', 'A-08: an empty custom owner resolves to nothing, not to "Other"');
  assert(
    buildResolutionStatement('PROTECT_MARGIN') === 'Protect margin',
    'A-09: a governed rationale alone is a complete statement'
  );
  assert(
    buildResolutionStatement('PROTECT_MARGIN', 'London stores only') ===
      'Protect margin — London stores only',
    'A-10: free text qualifies the governed reason and never replaces it'
  );
  assert(
    buildResolutionStatement('OTHER', 'Supplier renegotiation pending') === 'Supplier renegotiation pending',
    'A-11: OTHER carries the analyst statement alone'
  );
  assert(buildResolutionStatement('OTHER', '   ') === '', 'A-12: OTHER with no statement yields nothing to record');

  // ── B. Promotion experiment stage is derived, and only where derivable ─────────────
  console.log('\n-- B. Experiment stage --');
  assert(
    derivePromotionExperimentStage({ hasActiveContract: false, elapsedDays: 0 }).stage === 'DRAFT',
    'B-01: no activated contract is Draft'
  );
  assert(
    derivePromotionExperimentStage({ hasActiveContract: false, elapsedDays: 9 }).stage === 'DRAFT',
    'B-02: elapsed days without an activation are still Draft — nothing was activated to run'
  );
  assert(
    derivePromotionExperimentStage({ hasActiveContract: true, elapsedDays: 0 }).stage === 'ACTIVATED',
    'B-03: an activated contract with nothing elapsed is Activated'
  );
  assert(
    derivePromotionExperimentStage({ hasActiveContract: true, elapsedDays: 1 }).stage === 'IN_FLIGHT',
    'B-04: an activated contract with elapsed days is In flight'
  );
  {
    const stages = [
      derivePromotionExperimentStage({ hasActiveContract: false, elapsedDays: 0 }),
      derivePromotionExperimentStage({ hasActiveContract: true, elapsedDays: 0 }),
      derivePromotionExperimentStage({ hasActiveContract: true, elapsedDays: 5 })
    ];
    assert(
      stages.every(s => s.label.length > 0 && s.detail.length > 20),
      'B-05: every stage explains itself in the analyst’s language'
    );
    assert(
      !stages.some(s => (s.stage as string) === 'COMPLETED'),
      'B-06: no COMPLETED stage is emitted'
    );
  }
  assert(
    /always stops short/i.test(PROMOTION_STAGE_NOT_DERIVABLE),
    'B-07: why a completed stage is absent is published rather than silently omitted'
  );
  {
    // The claim behind B-06/B-07, checked against the data rather than trusted.
    const everCompletes = CAMPAIGN_ARCHETYPES.some(
      a => a.decision_twin.current_day >= a.decision_twin.flight_days
    );
    assert(!everCompletes, 'B-08: no seeded archetype can reach the end of its campaign window');
  }

  // ── C. Narration is derived from governed facts, never authored ────────────────────
  console.log('\n-- C. Narration --');
  assert(
    flight.day_narratives.length === flight.horizon.flight_days,
    'C-01: every day of the window is narrated, elapsed and remaining alike'
  );
  assert(
    flight.day_narratives.every((n, i) => n.flight_day === i + 1),
    'C-02: narratives are in day order with no gaps'
  );
  assert(
    flight.day_narratives.every(n => n.basis.length >= 3),
    'C-03: every narration names the governed facts it was derived from'
  );
  assert(
    flight.day_narratives.every(n => n.headline.includes(`Day ${n.flight_day}`)),
    'C-04: each narration identifies its own day'
  );
  {
    const predicted = flight.day_narratives.filter(n => n.horizon_class === 'PREDICTED_REMAINING');
    assert(
      predicted.every(n => /has not happened/i.test(n.statement)),
      'C-05: every predicted day says on its face that it has not happened'
    );
    assert(
      predicted.every(n => n.attention === 'NONE'),
      'C-06: no predicted day claims to require attention'
    );
    assert(
      predicted.every(n => n.readings.every(r => r.actual_value === null)),
      'C-07: no predicted narration carries an actual reading'
    );
  }
  {
    const elapsed = flight.day_narratives.filter(n => n.horizon_class === 'SIMULATED_ELAPSED');
    assert(elapsed.length === flight.horizon.elapsed_days, 'C-08: elapsed narrations match elapsed days');
    assert(
      elapsed.every(n => /activated decision expected/i.test(n.statement)),
      'C-09: every elapsed day is narrated against the activated decision, not against seeded expectations'
    );
    assert(
      elapsed.every(n => n.attention_reason.includes(String(ATTENTION_THRESHOLD_MONITOR_PCT))),
      'C-10: the thresholds behind the judgement are stated on every elapsed day'
    );
  }
  {
    // The narration must move with the numbers. Same day, different deviation, different words.
    const calm = base.telemetry.map(t => ({ ...t, demand_observed: t.demand_expected, contribution_observed: t.contribution_expected }));
    const calmFlight = project(base, calm);
    const severe = base.telemetry.map(t => ({
      ...t,
      demand_observed: t.demand_expected * 0.8,
      contribution_observed: t.contribution_expected * 0.8
    }));
    const severeFlight = project(base, severe);

    const calmDay = calmFlight.day_narratives[0];
    const severeDay = severeFlight.day_narratives[0];
    assert(calmDay.attention === 'NONE', 'C-11: an on-plan day is narrated as tracking to plan');
    assert(severeDay.attention === 'ATTENTION', 'C-12: a 20% shortfall is narrated as needing attention');
    assert(
      calmDay.headline !== severeDay.headline && calmDay.statement !== severeDay.statement,
      'C-13: narration is derived from the figures — the same day narrates differently on different data'
    );
    assert(
      /below/i.test(severeDay.statement) && /warrants attention/i.test(severeDay.statement),
      'C-14: direction and consequence are both stated'
    );
  }
  {
    // Threshold boundaries bite where they are declared, not somewhere near them.
    const at = (pct: number) =>
      project(
        base,
        base.telemetry.map(t => ({
          ...t,
          demand_observed: t.demand_expected * (1 + pct / 100),
          contribution_observed: t.contribution_expected
        }))
      ).day_narratives[0].attention;
    assert(at(0.5) === 'NONE', 'C-15: below the monitor threshold is not flagged');
    assert(at(ATTENTION_THRESHOLD_MONITOR_PCT + 0.5) === 'MONITOR', 'C-16: past the monitor threshold is monitored');
    assert(at(ATTENTION_THRESHOLD_ATTENTION_PCT + 0.5) === 'ATTENTION', 'C-17: past the attention threshold needs attention');
    assert(at(-(ATTENTION_THRESHOLD_ATTENTION_PCT + 0.5)) === 'ATTENTION', 'C-18: a departure below plan is flagged as readily as one above');
  }
  {
    // Divergence is the case worth naming, and it is named.
    const diverging = base.telemetry.map(t => ({
      ...t,
      demand_observed: t.demand_expected * 1.09,
      contribution_observed: t.contribution_expected * 0.91
    }));
    const n = project(base, diverging).day_narratives[0];
    assert(
      /demand ahead, contribution behind/i.test(n.headline),
      'C-19: demand ahead while contribution falls behind is called out specifically',
      n.headline
    );
  }
  // CTW-03 deliberately strengthened C-20/C-21: the disclosure is no longer asserted to be the flat
  // one, it is asserted to MATCH the shape the projection actually has. Unshaped it must say flat
  // and be flat; shaped it must name the model and genuinely vary.
  assert(
    /flat|evenly|same expectation/i.test(FLAT_HORIZON_DISCLOSURE),
    'C-20: a flat horizon has a disclosure that describes a flat horizon'
  );
  {
    const predicted = flight.lenses[0].points.filter(p => p.horizon_class === 'PREDICTED_REMAINING');
    const distinct = new Set(predicted.map(p => p.expectation_value)).size;
    const isFlat = distinct === 1;
    const saysFlat = flight.horizon_shape_disclosure === FLAT_HORIZON_DISCLOSURE;
    assert(
      isFlat === saysFlat,
      'C-21: the horizon disclosure states what is actually true of the data',
      `distinct=${distinct} saysFlat=${saysFlat}`
    );
    assert(
      isFlat ? flight.allocation_profile === 'FLAT_RATE_IDENTITY' : flight.allocation_profile === 'FORECAST_SHAPED',
      'C-22: the allocation profile matches the shape of the horizon'
    );
  }

  // ── D. Retiring the card strip lost nothing ───────────────────────────────────────
  console.log('\n-- D. Nothing lost --');
  {
    const elapsed = flight.day_narratives.filter(n => n.horizon_class === 'SIMULATED_ELAPSED');
    assert(
      elapsed.every(n => n.supplementary.some(s => s.label === 'Depot stock')),
      'D-01: the per-day depot stock the card strip showed is preserved in the day detail'
    );
    assert(
      elapsed.every(n => n.supplementary.some(s => s.label === 'World model day status')),
      'D-02: the seeded per-day status is preserved too'
    );
    assert(
      elapsed.every(n =>
        n.supplementary.every(s => s.basis.length > 30)
      ),
      'D-03: every supplementary reading carries its own basis rather than sitting unexplained'
    );
    assert(
      elapsed.every(n => /not CogniX/i.test(n.supplementary.find(s => s.label === 'World model day status')!.basis)),
      'D-04: the seeded status is distinguished from CogniX’s own assessment'
    );
    assert(
      elapsed.every(n => n.readings.length === 2),
      'D-05: both demand and contribution are readable on every elapsed day'
    );
    const predicted = flight.day_narratives.filter(n => n.horizon_class === 'PREDICTED_REMAINING');
    assert(
      predicted.every(n => n.supplementary.length === 0),
      'D-06: a day that has not happened carries no telemetry reading'
    );
  }

  // ── E. CTW-01 projection semantics are untouched ──────────────────────────────────
  console.log('\n-- E. Projection semantics unchanged --');
  assert(validateFlightProjection(flight).length === 0, 'E-01: the projection still satisfies W-INV-1..7');
  assert(
    flight.horizon.flight_days === flight.horizon.elapsed_days + flight.horizon.remaining_days,
    'E-02: the horizon is unchanged'
  );
  assert(
    flight.lenses.every(l => l.deviation_correspondence === 'LIKE_FOR_LIKE'),
    'E-03: deviation correspondence is unchanged'
  );
  assert(
    !flight.trajectories.some(t => t.kind === 'REFORECAST'),
    'E-04: CTW-02 has not leaked in — no REFORECAST trajectory'
  );
  assert(
    flight.lenses.every(l => l.points.every(p => p.synthetic_demo === true)),
    'E-05: no new origin of synthetic_demo = false'
  );
  assert(
    flight.lenses.every(l => l.points.every(p => p.horizon_class !== 'OBSERVED_ELAPSED')),
    'E-06: nothing is claimed as an admitted observation'
  );
  {
    // Narration is additive: strip it and the projection is what CTW-01 produced.
    const { day_narratives, horizon_shape_disclosure, ...rest } = flight as any;
    assert(
      typeof day_narratives !== 'undefined' && typeof horizon_shape_disclosure === 'string',
      'E-07: the new fields are present'
    );
    assert(
      rest.lenses[0].points.every((p: any) => typeof p.narrative === 'undefined'),
      'E-08: narration was added beside the series, not folded into the points CTW-01 froze'
    );
  }

  // ── F. Every archetype, and a campaign that has not started ───────────────────────
  console.log('\n-- F. Coverage --');
  {
    let ok = 0;
    for (const arch of CAMPAIGN_ARCHETYPES) {
      const f = buildFixture(arch.id, `sess_r_${arch.id}`);
      const p = project(f);
      const clean =
        p.day_narratives.length === p.horizon.flight_days &&
        validateFlightProjection(p).length === 0 &&
        p.day_narratives.every(n => n.basis.length >= 3 && n.headline.length > 0 && n.statement.length > 0);
      if (clean) ok++;
      else console.error(`  archetype ${arch.id} narration failed`);
    }
    assert(ok === CAMPAIGN_ARCHETYPES.length, `F-01: all ${CAMPAIGN_ARCHETYPES.length} archetypes narrate cleanly`, `${ok}`);
  }
  {
    const none = project(base, []);
    assert(
      none.day_narratives.every(n => n.horizon_class === 'PREDICTED_REMAINING'),
      'F-02: a campaign that has not started narrates entirely as prediction'
    );
    assert(
      none.day_narratives.every(n => n.supplementary.length === 0 && n.attention === 'NONE'),
      'F-03: with nothing elapsed nothing is asserted about how the campaign is going'
    );
  }
  {
    const undefinedRatio = base.telemetry.map((t, i) => (i === 0 ? { ...t, demand_expected: 0, contribution_expected: 0 } : t));
    const n = project(base, undefinedRatio).day_narratives[0];
    assert(
      /not assessable/i.test(n.headline) && n.attention === 'NONE',
      'F-04: a day with no defined comparison is narrated as not assessable, not as on plan'
    );
  }

  console.log('\n====================================================');
  console.log(`CTW-01R RESULTS: ${passCount} passed, ${failCount} failed`);
  console.log('====================================================');
  if (failCount > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
