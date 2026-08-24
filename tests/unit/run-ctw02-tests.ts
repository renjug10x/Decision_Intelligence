/**
 * CogniX CTW-02 — Predictive Intervention Planning test suite.
 *
 * The claim CTW-02 makes is that every moment, window and recommendation comes from three permitted
 * sources — the CTW-03 forecast's per-period output, the observed deviation, and the declared
 * uncertainty — and from nothing else. Group A attacks that directly: with no forecast bound there
 * must be **no predicted moment at all**, because without one no predicted day differs from another
 * and any moment would have been invented.
 */

import {
  AUTOMATIC_EXECUTION_DISCLOSURE,
  DEFAULT_INTERVENTION_MODE,
  DecisionMoment,
  INTERVENTION_DEPTH_STEP_PP,
  MAX_DECISION_MOMENTS,
  MOMENT_TROUGH_PCT,
  NO_MOMENTS_WITHOUT_FORECAST,
  NO_WINDOW_STATEMENT,
  PlannedIntervention,
  SUSTAINED_DEPARTURE_DAYS,
  validateDecisionMoments,
  validatePlannedIntervention
} from '../../packages/contracts/src/campaign-intervention-model';
import {
  buildCampaignStory,
  deriveCampaignOutlook,
  deriveDecisionMoments,
  reassessPlannedIntervention,
  triggerReached
} from '../../lib/campaign-intervention-engine';
import { buildInterventionPreview } from '../../lib/campaign-intervention-preview';
import { plannedInterventionStore } from '../../lib/planned-intervention-store';

import { CampaignFlightProjection } from '../../packages/contracts/src/campaign-continuous-timeline-model';
import { projectCampaignFlight } from '../../lib/campaign-continuous-timeline-engine';
import { projectDecisionTimeline } from '../../lib/campaign-timeline-engine';
import { evaluateOutcomeFrontier } from '../../lib/campaign-frontier-engine';
import { createDecisionContract } from '../../lib/campaign-decision-contract-engine';
import { decisionContractStore } from '../../lib/decision-contract-store';
import { clearCampaignIntents, registerCampaignIntent } from '../../lib/campaign-intent-store';
import { getArchetypeById, buildCampaignIntentFromArchetype } from '../../lib/campaign-archetypes';
import { buildElapsedTelemetryFromArchetype } from '../../lib/campaign-flight-client';
import { buildForecastDataset } from '../../lib/forecast/series';
import { executeForecast } from '../../lib/forecast/forecast-engine';
import { ForecastExecution, isRefusal } from '../../packages/contracts/src/forecast-model-model';

let passCount = 0;
let failCount = 0;
function assert(c: boolean, name: string, detail?: string) {
  if (c) { passCount++; console.log(`[PASS] ${name}`); }
  else { failCount++; console.error(`[FAIL] ${name}${detail ? ` — ${detail}` : ''}`); }
}

const TENANT = 'tenant_uk_retail_01';
const AS_OF = '2026-08-23T00:00:00.000Z';
const DISCOUNT = 20;

interface Ctx {
  flat: CampaignFlightProjection;
  shaped: CampaignFlightProjection;
  contract: any;
  timeline: any;
  ivTimeline: any;
  telemetry: any[];
  forecast: ForecastExecution;
  intent: any;
  session: string;
}

async function buildContext(session: string): Promise<Ctx> {
  const arch = getArchetypeById('ARCH-CHILLED-ELASTIC')!;
  const intent: any = buildCampaignIntentFromArchetype(arch, { tenant_id: TENANT, session_id: session });
  registerCampaignIntent(intent);
  const fr: any = evaluateOutcomeFrontier({ tenant_id: TENANT, session_id: session, campaign_intent_id: intent.intent_id, evaluation_timestamp: AS_OF } as any);
  const f = fr.frontier;
  const resolution: any =
    f.selection?.status === 'SELECTED' && f.selection.selected_play_id
      ? { route: 'CONSTRAINT_RESOLVED', selected_play_id: f.selection.selected_play_id, selection_status: 'SELECTED', selection_basis: f.selection.selection_basis }
      : { route: 'HUMAN_RESOLVED', selected_play_id: f.frontier_play_ids[0], resolved_by: 'suite', resolution_statement: 'fixture', presented_alternatives: f.frontier_play_ids };
  const contract = createDecisionContract({ tenant_id: TENANT, session_id: session, frontier: f, campaign_intent: intent, resolution, created_as_of: AS_OF } as any);
  const tl: any = projectDecisionTimeline({ tenant_id: TENANT, session_id: session, campaign_intent_id: intent.intent_id, campaign_intent: intent } as any);
  const timeline = tl.projection ?? tl;

  const modified = { ...intent, campaign_intent: { ...intent.campaign_intent, provisional_discount_depth: DISCOUNT - INTERVENTION_DEPTH_STEP_PP } };
  const ivtl: any = projectDecisionTimeline({ tenant_id: TENANT, session_id: session, campaign_intent_id: modified.campaign_intent_id, campaign_intent: modified } as any);
  const ivTimeline = ivtl.projection ?? ivtl;

  const ds = await buildForecastDataset({});
  const fx = executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: ds, horizon: timeline.grid.campaign_days, executed_as_of: AS_OF, backtest: false });
  if (isRefusal(fx)) throw new Error('forecast refused in fixture');

  const telemetry = buildElapsedTelemetryFromArchetype(arch);
  const base = { tenant_id: TENANT, session_id: session, contract_id: contract.contract_id, timeline, elapsed_telemetry: telemetry };
  return {
    flat: projectCampaignFlight(base),
    shaped: projectCampaignFlight({ ...base, forecast: fx }),
    contract, timeline, ivTimeline, telemetry, forecast: fx, intent, session
  };
}

async function runTests() {
  console.log('\n=== CTW-02 Predictive Intervention Planning ===\n');
  decisionContractStore.clear();
  clearCampaignIntents();
  plannedInterventionStore.clear();

  const ctx = await buildContext('sess_ctw02');

  // ── A. Moments derive only from permitted sources ─────────────────────────────────
  console.log('\n-- A. Derivation boundary --');
  {
    const flatResult = deriveDecisionMoments(ctx.flat, DISCOUNT);
    assert(
      flatResult.moments.every(m => m.horizon_class !== 'PREDICTED_REMAINING'),
      'A-01: with no forecast bound there is no predicted moment — none can be, so none is invented'
    );
    assert(flatResult.note === NO_MOMENTS_WITHOUT_FORECAST, 'A-02: the absence is explained rather than left blank');

    const shapedResult = deriveDecisionMoments(ctx.shaped, DISCOUNT);
    assert(shapedResult.moments.length > 0, 'A-03: with a forecast bound, moments are derivable');
    assert(shapedResult.note === null, 'A-04: no note is shown when moments exist');
    assert(
      shapedResult.moments.length <= MAX_DECISION_MOMENTS,
      `A-05: at most ${MAX_DECISION_MOMENTS} moments are surfaced`,
      String(shapedResult.moments.length)
    );

    const all = shapedResult.moments;
    assert(all.every(m => m.evidence.length > 0), 'A-06: every moment cites evidence');
    const permitted = new Set(['GOVERNED_FORECAST', 'OBSERVED_DEVIATION', 'DECLARED_UNCERTAINTY']);
    assert(
      all.every(m => m.evidence.every(e => permitted.has(e.source))),
      'A-07: every citation comes from one of the three permitted sources and nowhere else'
    );
    assert(all.every(m => m.why.length >= 3), 'A-08: every moment answers "why is CogniX telling me this"');
    assert(
      all.every(m => m.why.some(w => /threshold|flagged|sustained/i.test(w))),
      'A-09: the rule that produced the moment is named, so the judgement is auditable'
    );
    assert(
      validateDecisionMoments(all, { forecastBound: true, todayFlightDay: ctx.shaped.horizon.today_flight_day }).length === 0,
      'A-10: moments satisfy I-INV-1..4'
    );
    // The guard must bite: a predicted moment with no forecast bound is the exact failure mode.
    const forged: DecisionMoment[] = [{ ...all[0], horizon_class: 'PREDICTED_REMAINING' }];
    assert(
      validateDecisionMoments(forged, { forecastBound: false, todayFlightDay: 5 }).some(v => v.invariant === 'I-INV-1'),
      'A-11: a predicted moment without a forecast is caught by I-INV-1'
    );
  }

  // ── B. Windows are arithmetic, never optimisation ─────────────────────────────────
  console.log('\n-- B. Decision windows --');
  {
    const { moments } = deriveDecisionMoments(ctx.shaped, DISCOUNT);
    const today = ctx.shaped.horizon.today_flight_day;
    const predicted = moments.filter(m => m.horizon_class === 'PREDICTED_REMAINING');
    for (const m of predicted) {
      if (!m.window.available) continue;
      assert(
        (m.window.first_flight_day as number) > today,
        `B-01[${m.moment_id}]: a window opens strictly after today`
      );
      const lastOfPeriod = Math.max(...m.span_days);
      assert(
        (m.window.last_flight_day as number) <= lastOfPeriod,
        `B-02[${m.moment_id}]: a window never runs past the period it targets — acting after that cannot affect it`
      );
    }
    assert(predicted.length === 0 || predicted.every(m => m.window.available ? m.window.delay_cost !== null : true), 'B-03: an available window states the cost of delay');
    const unavailable = moments.find(m => !m.window.available);
    assert(
      unavailable === undefined || unavailable.window.statement === NO_WINDOW_STATEMENT,
      'B-04: an unavailable window says exactly that, and does not fabricate one'
    );
    // A moment beginning tomorrow still has a window — acting on its first day changes the rest of
    // it — but that window may never extend past the period itself.
    const tomorrow = moments.find(m => m.flight_day === today + 1);
    assert(
      tomorrow === undefined ||
        !tomorrow.window.available ||
        (tomorrow.window.last_flight_day as number) <= Math.max(...tomorrow.span_days),
      'B-05: a moment beginning tomorrow carries a window bounded by its own period'
    );
  }

  // ── C. Recommendations exist only where CogniX can cost them ──────────────────────
  console.log('\n-- C. Recommendations --');
  {
    const { moments } = deriveDecisionMoments(ctx.shaped, DISCOUNT);
    for (const m of moments) {
      assert(
        m.candidate !== null || m.no_candidate_reason !== null,
        `C-01[${m.moment_id}]: a moment either proposes an action or says why it does not`
      );
      if (m.candidate) {
        assert(m.candidate.action_kind === 'REDUCE_DISCOUNT_DEPTH', `C-02[${m.moment_id}]: only actions CDI-02 can evaluate are offered`);
        assert(
          m.candidate.proposed_discount_pct === Math.max(0, DISCOUNT - INTERVENTION_DEPTH_STEP_PP),
          `C-03[${m.moment_id}]: the proposal follows the declared step, so it is reproducible`
        );
      }
    }
    const peak = moments.find(m => m.kind === 'FORECAST_DEMAND_PEAK');
    if (peak) {
      assert(peak.candidate === null, 'C-04: a demand peak carries no action — CogniX has no governed response');
      assert(/stock/i.test(peak.no_candidate_reason || ''), 'C-05: and it says stock cover is the unanswerable question');
    }
    // At zero depth there is nothing to reduce, and no candidate may be invented.
    const zero = deriveDecisionMoments(ctx.shaped, 0);
    assert(zero.moments.every(m => m.candidate === null), 'C-06: with no promotional depth left, no reduction is proposed');
  }

  // ── D. Observed moments are stated, never projected ───────────────────────────────
  console.log('\n-- D. Observed departure --');
  {
    // Force a sustained shortfall on contribution across the elapsed days.
    const below = ctx.telemetry.map(t => ({ ...t, contribution_observed: t.contribution_expected * 0.9 }));
    const f = projectCampaignFlight({
      tenant_id: TENANT, session_id: ctx.session, contract_id: ctx.contract.contract_id,
      timeline: ctx.timeline, elapsed_telemetry: below, forecast: ctx.forecast
    });
    const { moments } = deriveDecisionMoments(f, DISCOUNT);
    const observed = moments.find(m => m.kind === 'SUSTAINED_DEPARTURE_FROM_PLAN');
    assert(observed !== undefined, 'D-01: a sustained departure from plan is identified');
    if (observed) {
      assert(
        observed.evidence.every(e => e.source === 'OBSERVED_DEVIATION'),
        'D-02: an observed moment cites observation only — never the forecast'
      );
      assert(
        /does not project/i.test(observed.expected_consequence),
        'D-03: the accrued position is stated and explicitly not projected forward'
      );
      assert(
        observed.why.some(w => /will not extrapolate/i.test(w)),
        'D-04: refusing to extrapolate is stated as a reason, not left implicit'
      );
      assert(observed.span_days.length === SUSTAINED_DEPARTURE_DAYS, 'D-05: the departure covers the declared number of days');
      assert(observed.candidate !== null, 'D-06: a shortfall carries a costed action');
    }
    // Running ahead of plan is not a problem to solve.
    const above = ctx.telemetry.map(t => ({ ...t, contribution_observed: t.contribution_expected * 1.12 }));
    const fa = projectCampaignFlight({
      tenant_id: TENANT, session_id: ctx.session, contract_id: ctx.contract.contract_id,
      timeline: ctx.timeline, elapsed_telemetry: above, forecast: ctx.forecast
    });
    const ahead = deriveDecisionMoments(fa, DISCOUNT).moments.find(m => m.kind === 'SUSTAINED_DEPARTURE_FROM_PLAN');
    assert(ahead !== undefined && ahead.candidate === null, 'D-07: CogniX proposes no action against good news');
    assert(ahead !== undefined && /ahead/i.test(ahead.no_candidate_reason || ''), 'D-08: and says why');
  }

  // ── E. Preview and reforecast ─────────────────────────────────────────────────────
  console.log('\n-- E. Preview and reforecast --');
  {
    const { moments } = deriveDecisionMoments(ctx.shaped, DISCOUNT);
    const m = moments.find(x => x.candidate !== null)!;
    const effective = (m.window.first_flight_day as number) ?? ctx.shaped.horizon.today_flight_day + 1;
    const base = { tenant_id: TENANT, session_id: ctx.session, contract_id: ctx.contract.contract_id, timeline: ctx.timeline, elapsed_telemetry: ctx.telemetry, forecast: ctx.forecast };
    const intervened = projectCampaignFlight({
      ...base,
      applied_intervention: {
        intervention_id: 'test', action_label: m.candidate!.label, effective_from_flight_day: effective,
        confirmed_by: 'suite', statement: 's', reason: 'r', timeline: ctx.ivTimeline
      }
    });

    assert(intervened.applied_intervention !== null, 'E-01: the applied intervention is recorded on the projection');
    assert(intervened.reforecast !== null && intervened.reforecast.length === 2, 'E-02: a reforecast is produced for both lenses');
    assert(
      intervened.reforecast!.every(s => s.points.every(p => p.flight_day >= effective)),
      'E-03: the reforecast covers only days from the effective day — elapsed days are absent by construction'
    );
    assert(
      intervened.trajectories.some(t => t.kind === 'REFORECAST' && t.covers === 'REMAINING_ONLY'),
      'E-04: a REFORECAST trajectory is emitted, covering the remaining horizon only'
    );

    // History must be untouched.
    const originalIv = ctx.shaped.trajectories.find(t => t.kind === 'INTERVENTION')!;
    const afterIv = intervened.trajectories.find(t => t.kind === 'INTERVENTION')!;
    assert(
      JSON.stringify(originalIv.points.map(p => p.expectation_value)) === JSON.stringify(afterIv.points.map(p => p.expectation_value)),
      'E-05: the activated expectation is unchanged — nothing was overwritten'
    );
    const originalObs = ctx.shaped.trajectories.find(t => t.kind === 'OBSERVED')!;
    const afterObs = intervened.trajectories.find(t => t.kind === 'OBSERVED')!;
    assert(
      JSON.stringify(originalObs.points.map(p => p.actual_value)) === JSON.stringify(afterObs.points.map(p => p.actual_value)),
      'E-06: every observation is unchanged'
    );
    assert(
      intervened.forecast?.model_id === ctx.shaped.forecast?.model_id,
      'E-07: the reforecast uses the same governed model — no second forecasting engine'
    );

    // An intervention cannot reach back over an elapsed day.
    let threw = false;
    try {
      projectCampaignFlight({
        ...base,
        applied_intervention: {
          intervention_id: 'bad', action_label: 'x', effective_from_flight_day: 1,
          confirmed_by: 'suite', statement: 's', reason: 'r', timeline: ctx.ivTimeline
        }
      });
    } catch (e: any) { threw = e.rejection_id === 'RJ-W9'; }
    assert(threw, 'E-08: an intervention effective on an elapsed day is refused');

    const preview = buildInterventionPreview({
      momentId: m.moment_id, candidate: m.candidate!, effectiveFromFlightDay: effective,
      baseline: ctx.shaped, intervened
    });
    assert(preview.without_intervention.days_affected === preview.with_intervention.days_affected, 'E-09: both sides cover the same days');
    assert(
      preview.without_intervention.remaining_contribution_gbp !== preview.with_intervention.remaining_contribution_gbp,
      'E-10: the two options genuinely differ'
    );
    assert(preview.what_improves.length > 10 && preview.what_is_sacrificed.length > 10, 'E-11: the trade-off names both sides');
    assert(/CDI-02/.test(preview.basis.join(' ')), 'E-12: the preview publishes what it compared');
  }

  // ── F. Planning, reassessment and the automatic-execution refusal ─────────────────
  console.log('\n-- F. Planning and reassessment --');
  {
    assert(DEFAULT_INTERVENTION_MODE === 'PREPARE_FOR_APPROVAL', 'F-01: prepare-for-approval is the governed default');
    assert(/unavailable/i.test(AUTOMATIC_EXECUTION_DISCLOSURE) && /will not simulate/i.test(AUTOMATIC_EXECUTION_DISCLOSURE), 'F-02: automatic execution is declared unavailable and explicitly never simulated');

    // A plan needs a moment carrying BOTH a costed action and an open window. In the default
    // fixture the campaign runs ahead of plan, so the observed moment carries no action, and the
    // forecast trough falls tomorrow with no window left. Both are real states and both are the
    // wrong thing to plan against, so the shortfall case is used here.
    const belowTelemetry = ctx.telemetry.map(t => ({ ...t, contribution_observed: t.contribution_expected * 0.9 }));
    const belowFlight = projectCampaignFlight({
      tenant_id: TENANT, session_id: ctx.session, contract_id: ctx.contract.contract_id,
      timeline: ctx.timeline, elapsed_telemetry: belowTelemetry, forecast: ctx.forecast
    });
    const { moments } = deriveDecisionMoments(belowFlight, DISCOUNT);
    const m = moments.find(x => x.candidate !== null && x.window.available)!;
    assert(m !== undefined, 'F-00: a moment exists carrying both a costed action and an open window');
    const plan: PlannedIntervention = {
      intervention_id: 'piv_test_1', tenant_id: TENANT, session_id: ctx.session,
      contract_id: ctx.contract.contract_id, decision_basis_digest: ctx.contract.decision_basis_digest,
      moment_id: m.moment_id, moment_kind: m.kind, action: m.candidate!,
      targeted_flight_day: m.flight_day, window: m.window,
      trigger_condition: `When the campaign reaches day ${m.window.first_flight_day}`,
      mode: 'PREPARE_FOR_APPROVAL', status: 'PLANNED', created_by: 'Category Manager',
      rationale: 'Protect margin', created_at: AS_OF, reassessments: []
    };
    plannedInterventionStore.create(plan);
    assert(plannedInterventionStore.listForSession(TENANT, ctx.session).length === 1, 'F-03: a plan is stored against its session');
    assert(plannedInterventionStore.getById('piv_test_1', TENANT, 'other_session') === null, 'F-04: a plan is not visible to another session');

    const today = belowFlight.horizon.today_flight_day;

    // Condition unchanged → keep.
    const keep = reassessPlannedIntervention(plan, moments, today, AS_OF);
    assert(keep.verdict === 'KEEP' && keep.options.includes('CANCEL'), 'F-05: an unchanged condition yields KEEP with options');

    // Condition gone → may no longer be necessary.
    const gone = reassessPlannedIntervention(plan, [], today, AS_OF);
    assert(gone.verdict === 'NO_LONGER_NECESSARY', 'F-06: a vanished condition is reported as no longer necessary');
    assert(/no longer identified/i.test(gone.reason), 'F-07: and the reason says why');
    assert(gone.options.includes('KEEP') && gone.options.includes('DELAY') && gone.options.includes('CANCEL'), 'F-08: keep, delay and cancel are all offered');

    // Condition earlier → bring forward.
    const earlier = reassessPlannedIntervention(plan, [{ ...m, flight_day: m.flight_day - 2 }], today, AS_OF);
    assert(earlier.verdict === 'BRING_FORWARD' && earlier.options.includes('BRING_FORWARD'), 'F-09: an earlier condition yields BRING_FORWARD');

    // Condition later → reschedule.
    const later = reassessPlannedIntervention(plan, [{ ...m, flight_day: m.flight_day + 2 }], today, AS_OF);
    assert(later.verdict === 'RESCHEDULE' && later.options.includes('RESCHEDULE'), 'F-10: a later condition yields RESCHEDULE');

    // No window left → may be too late.
    const noWindow = reassessPlannedIntervention(
      plan,
      [{ ...m, window: { available: false, first_flight_day: null, last_flight_day: null, statement: NO_WINDOW_STATEMENT, delay_cost: null } }],
      today,
      AS_OF
    );
    assert(noWindow.verdict === 'MAY_BE_TOO_LATE', 'F-11: a closed window yields MAY_BE_TOO_LATE');

    // Every verdict must explain itself.
    assert([keep, gone, earlier, later, noWindow].every(r => r.reason.length > 40), 'F-12: every reassessment records why the recommendation changed');
    assert([keep, gone, earlier, later, noWindow].every(r => r.options.length >= 3), 'F-13: no reassessment forces a single option');

    // The trail is kept, never replaced.
    plannedInterventionStore.addReassessment('piv_test_1', TENANT, ctx.session, keep);
    plannedInterventionStore.addReassessment('piv_test_1', TENANT, ctx.session, later);
    const trailed = plannedInterventionStore.getById('piv_test_1', TENANT, ctx.session)!;
    assert(trailed.reassessments.length === 2, 'F-14: reassessments accumulate — the trail is the record');

    // Moment ids repeat across decisions because they are derived from the campaign day. A plan made
    // against a different activated decision must never attach itself to this one — found in browser
    // validation, where a plan from a previous activation appeared against a fresh campaign.
    {
      const foreign: PlannedIntervention = { ...plan, intervention_id: 'piv_foreign', contract_id: 'contract_from_another_decision' };
      const outlookHere = deriveCampaignOutlook(belowFlight, moments, [foreign]);
      assert(
        !/intervention/i.test(outlookHere.current_action),
        'F-14a: a plan from another decision does not reach this campaign’s outlook'
      );
      const storyHere = buildCampaignStory(belowFlight, moments, [foreign]);
      assert(
        !storyHere.some(e => e.kind === 'INTERVENTION_PLANNED'),
        'F-14b: nor its story — a campaign’s story contains only what happened to that campaign'
      );
      const storyOwn = buildCampaignStory(belowFlight, moments, [{ ...plan, contract_id: belowFlight.activation.contract_ref.contract_id }]);
      assert(
        storyOwn.some(e => e.kind === 'INTERVENTION_PLANNED'),
        'F-14c: while a plan against this decision does appear'
      );
    }

    assert(triggerReached({ ...plan, window: { ...plan.window, first_flight_day: today } }, today) === true, 'F-15: the trigger fires when the campaign reaches the window');
    assert(triggerReached({ ...plan, mode: 'REMIND_ME' }, today + 99) === false, 'F-16: a remind-me plan never prepares itself');

    // Confirmation may never reach back over an elapsed day.
    const bad = { ...trailed, confirmation: { confirmed_by: 'x', confirmed_at: AS_OF, statement: 's', effective_from_flight_day: today } };
    assert(validatePlannedIntervention(bad, today).some(v => v.invariant === 'I-INV-5'), 'F-17: a confirmation effective on an elapsed day is caught by I-INV-5');
    // Found in browser validation: an analyst may confirm without waiting to be prompted, and the
    // earlier form of I-INV-6 rejected exactly that — while the store had already written it.
    const direct: PlannedIntervention = {
      ...plan, intervention_id: 'piv_direct', reassessments: [], status: 'CONFIRMED',
      confirmation: { confirmed_by: 'Commercial Manager', confirmed_at: AS_OF, statement: 'Protecting margin.', effective_from_flight_day: today + 1 }
    };
    assert(
      validatePlannedIntervention(direct, today).length === 0,
      'F-18: a plan confirmed directly, with no prior reassessment, is valid — the confirmation is its own record'
    );
    const noRecord: PlannedIntervention = { ...direct, confirmation: undefined };
    assert(
      validatePlannedIntervention(noRecord, today).some(v => v.invariant === 'I-INV-6'),
      'F-19: but a CONFIRMED plan with no confirmation record is caught'
    );
    const superseded: PlannedIntervention = { ...plan, intervention_id: 'piv_sup', status: 'SUPERSEDED', reassessments: [] };
    assert(
      validatePlannedIntervention(superseded, today).some(v => v.invariant === 'I-INV-6'),
      'F-20: a status reached by re-evaluation still has to carry the reassessment that produced it'
    );
  }

  // ── G. Outlook and story ──────────────────────────────────────────────────────────
  console.log('\n-- G. Outlook and story --');
  {
    const { moments } = deriveDecisionMoments(ctx.shaped, DISCOUNT);
    const plans = plannedInterventionStore.listForSession(TENANT, ctx.session);
    const outlook = deriveCampaignOutlook(ctx.shaped, moments, plans);
    assert(outlook.headline.length > 30, 'G-01: the outlook leads with a sentence, not a metric');
    assert(outlook.next_decision !== null, 'G-02: the next decision is named when one exists');
    assert(['MONITOR', 'PREPARE', 'REVIEW'].includes(outlook.current_action), 'G-03: a current action is stated');
    assert(outlook.basis.length >= 3, 'G-04: the outlook publishes what it read');

    const empty = deriveCampaignOutlook(ctx.flat, [], []);
    assert(empty.next_decision === null && empty.decision_window === NO_WINDOW_STATEMENT, 'G-05: with no moments the outlook says so rather than inventing one');

    const story = buildCampaignStory(ctx.shaped, moments, plans);
    assert(story[0].kind === 'CAMPAIGN_ACTIVATED', 'G-06: the story starts at activation');
    assert(story.some(e => e.kind === 'TODAY'), 'G-07: today is marked');
    assert(
      story.filter(e => e.kind === 'MOMENT_PREDICTED').every(e => e.occurred === false),
      'G-08: a predicted event is marked as not yet happened'
    );
    assert(
      story.filter(e => e.kind === 'CAMPAIGN_ACTIVATED' || e.kind === 'TODAY').every(e => e.occurred === true),
      'G-09: recorded events are marked as occurred'
    );
    assert(story.some(e => e.kind === 'INTERVENTION_PLANNED'), 'G-10: a planned intervention appears in the story');
    assert(story.some(e => e.kind === 'INTERVENTION_REASSESSED'), 'G-11: so does each reassessment');
    const days = story.map(e => e.flight_day ?? 0);
    assert(days.every((d, i) => i === 0 || d >= days[i - 1]), 'G-12: the story is in campaign order');
  }

  console.log('\n====================================================');
  console.log(`CTW-02 RESULTS: ${passCount} passed, ${failCount} failed`);
  console.log('====================================================');
  if (failCount > 0) process.exit(1);
}

runTests().catch(err => { console.error('Fatal test error:', err); process.exit(1); });
