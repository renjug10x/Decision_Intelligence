/**
 * Promotion experience — "Explore Decision Analytics" destination regression suite.
 *
 * The defect this guards: the control resolved one pre-flight anchor (`analytical-lenses-section`)
 * in both modes. That section is rendered only inside the PLANNING branch, so in Campaign In-Flight
 * the lookup returned null and the click did nothing at all — a visible control that led nowhere.
 *
 * The suite proves three things rather than restating the fix:
 *   A. every state resolves to a destination, and the destination belongs to the mode asking for it;
 *   B. scrolling against a page carrying only that mode's real anchors always lands somewhere —
 *      the anchor set is read out of the component sources, so removing an anchor fails the suite;
 *   C. both modes produce a genuine transition — a lens change plus a scroll pre-flight, a scroll
 *      into the in-flight evidence in flight.
 *
 * Run via: npx tsx tests/unit/run-promotion-cta-tests.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CAMPAIGN_OUTLOOK_SECTION_ID,
  CAMPAIGN_TIMELINE_SECTION_ID,
  DecisionAnalyticsLensId,
  DecisionAnalyticsState,
  FLIGHT_ACTIVATION_SECTION_ID,
  IN_FLIGHT_DEVIATIONS_SECTION_ID,
  IN_FLIGHT_SECTION_IDS,
  LENS_LABELS,
  PRE_FLIGHT_LENSES_SECTION_ID,
  PRE_FLIGHT_SECTION_IDS,
  resolveDecisionAnalyticsTarget,
  scrollToDecisionAnalyticsTarget
} from '../../lib/campaign-decision-navigation';
import { CAMPAIGN_ARCHETYPES } from '../../lib/campaign-archetypes';

let passCount = 0;
let failCount = 0;
function assert(c: boolean, name: string, detail?: string) {
  if (c) {
    passCount++;
    console.log(`[PASS] ${name}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const ROOT = join(__dirname, '..', '..');
const plannerSource = readFileSync(join(ROOT, 'components', 'PromotionPlanner.tsx'), 'utf8');
const twinSource = readFileSync(join(ROOT, 'components', 'campaign', 'LiveDecisionTwinLens.tsx'), 'utf8');

/** The exported anchor constants, by the identifier the components write in their JSX. */
const ANCHOR_CONSTANTS: Record<string, string> = {
  PRE_FLIGHT_LENSES_SECTION_ID,
  FLIGHT_ACTIVATION_SECTION_ID,
  CAMPAIGN_OUTLOOK_SECTION_ID,
  CAMPAIGN_TIMELINE_SECTION_ID,
  IN_FLIGHT_DEVIATIONS_SECTION_ID
};

/** The section ids a component actually renders, read from its `id={CONST}` attributes. */
function renderedAnchors(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/id=\{([A-Z_]+)\}/g)) {
    const value = ANCHOR_CONSTANTS[match[1]];
    if (value && !found.includes(value)) found.push(value);
  }
  return found;
}

/** A `document` stand-in holding a known set of section ids, recording what was scrolled to. */
function pageWith(ids: string[]) {
  const scrolled: string[] = [];
  return {
    scrolled,
    doc: {
      getElementById(id: string) {
        if (!ids.includes(id)) return null;
        return {
          scrollIntoView: () => {
            scrolled.push(id);
          }
        };
      }
    }
  };
}

const PLANNER_ANCHORS = renderedAnchors(plannerSource);
const TWIN_ANCHORS = renderedAnchors(twinSource);

async function runTests() {
  console.log('\n=== A. Every pre-flight state resolves to lens evidence ===');
  {
    const verdicts = [
      'ACCRETIVE GO',
      'CONDITIONAL GO',
      'MARGIN RISK',
      'SUPPLY INFEASIBLE',
      'RECONSIDER',
      'AN UNKNOWN FUTURE VERDICT'
    ];
    const targets = verdicts.map(v =>
      resolveDecisionAnalyticsTarget({ mode: 'PLANNING', decision_verdict: v })
    );

    assert(
      targets.every(t => t.section_id === PRE_FLIGHT_LENSES_SECTION_ID),
      'A-01: every pre-flight verdict opens the analytical lens section'
    );
    assert(
      targets.every(t => t.lens_id !== null && t.lens_id in LENS_LABELS),
      'A-02: every pre-flight verdict names a lens that exists'
    );
    assert(
      targets.every(t => t.destination_label.length > 0 && t.basis.length > 0),
      'A-03: every pre-flight destination says what it opens and why'
    );

    const byVerdict = (v: string) =>
      resolveDecisionAnalyticsTarget({ mode: 'PLANNING', decision_verdict: v }).lens_id;
    assert(byVerdict('ACCRETIVE GO') === 'DEMAND', 'A-04: an unobstructed decision opens the demand evidence');
    assert(byVerdict('MARGIN RISK') === 'FRONTIER', 'A-05: a margin-risk verdict opens the trade-off frontier');
    assert(byVerdict('RECONSIDER') === 'FRONTIER', 'A-06: a reconsider verdict opens the trade-off frontier');
    assert(byVerdict('CONDITIONAL GO') === 'FRONTIER', 'A-07: a conditional verdict opens the trade-off frontier');
    assert(
      byVerdict('SUPPLY INFEASIBLE') === 'OPPORTUNITY',
      'A-08: an undeliverable campaign opens where a deliverable version exists'
    );
    assert(
      byVerdict('AN UNKNOWN FUTURE VERDICT') === 'DEMAND',
      'A-09: an unrecognised verdict still resolves rather than falling through to nothing'
    );

    // Live readiness is CDI-04's answer for the configuration on screen; the verdict is the
    // archetype's narrative. Where they disagree, the live assessment decides.
    const withReadiness = (state: string) =>
      resolveDecisionAnalyticsTarget({
        mode: 'PLANNING',
        decision_verdict: 'ACCRETIVE GO',
        readiness_state: state
      }).lens_id;
    assert(withReadiness('DO_NOT_PROCEED') === 'OPPORTUNITY', 'A-10: readiness DO_NOT_PROCEED outranks an accretive verdict');
    assert(withReadiness('REVIEW') === 'FRONTIER', 'A-11: readiness REVIEW opens the trade-off frontier');
    assert(withReadiness('CONDITIONAL_GO') === 'FRONTIER', 'A-12: readiness CONDITIONAL_GO opens the trade-off frontier');
    assert(withReadiness('GO') === 'DEMAND', 'A-13: a clean readiness leaves the verdict to choose');
    assert(
      resolveDecisionAnalyticsTarget({ mode: 'PLANNING', decision_verdict: 'MARGIN RISK', readiness_state: null })
        .lens_id === 'FRONTIER',
      'A-14: an unavailable readiness falls back to the verdict rather than defaulting'
    );

    // The seeded archetypes are the states a reader can actually reach.
    const archetypeLenses = CAMPAIGN_ARCHETYPES.map(
      a => resolveDecisionAnalyticsTarget({ mode: 'PLANNING', decision_verdict: a.discovery.decision_verdict }).lens_id
    );
    assert(
      archetypeLenses.every(l => l !== null),
      'A-15: every seeded archetype resolves to a lens',
      `${CAMPAIGN_ARCHETYPES.length} archetypes`
    );
    assert(
      new Set(archetypeLenses).size > 1,
      'A-16: the seeded archetypes do not all resolve to the same lens — the destination tracks state'
    );
  }

  console.log('\n=== B. Every in-flight state resolves to in-flight evidence ===');
  {
    const twin = (over: Partial<DecisionAnalyticsState> = {}) =>
      resolveDecisionAnalyticsTarget({ mode: 'DECISION_TWIN', has_flight: true, ...over });

    assert(
      twin({ outlook_action: 'REVIEW', moment_count: 0 }).section_id === CAMPAIGN_OUTLOOK_SECTION_ID,
      'B-01: an outlook asking for review opens the outlook'
    );
    assert(
      twin({ outlook_action: 'PREPARE', moment_count: 0 }).section_id === CAMPAIGN_OUTLOOK_SECTION_ID,
      'B-02: an outlook asking to prepare opens the outlook'
    );
    assert(
      twin({ outlook_action: 'MONITOR', moment_count: 2 }).section_id === CAMPAIGN_OUTLOOK_SECTION_ID,
      'B-03: decision moments ahead open the outlook even while only monitoring'
    );
    assert(
      twin({ outlook_action: 'MONITOR', moment_count: 0 }).section_id === CAMPAIGN_TIMELINE_SECTION_ID,
      'B-04: with nothing to decide today the timeline is the deeper evidence'
    );
    assert(
      twin({ outlook_action: null, moment_count: 0 }).section_id === CAMPAIGN_TIMELINE_SECTION_ID,
      'B-05: with no outlook at all the timeline is the deeper evidence'
    );
    assert(
      twin({ has_flight: false, outlook_action: null }).section_id === IN_FLIGHT_DEVIATIONS_SECTION_ID,
      'B-06: with no governed timeline the observed deviations are the only in-flight evidence'
    );

    const all = [
      twin({ outlook_action: 'REVIEW' }),
      twin({ outlook_action: 'MONITOR', moment_count: 0 }),
      twin({ has_flight: false, outlook_action: null })
    ];
    assert(
      all.every(t => t.lens_id === null),
      'B-07: in flight no lens tab is selected — the mode renders none'
    );
    assert(
      all.every(t => (IN_FLIGHT_SECTION_IDS as readonly string[]).includes(t.section_id)),
      'B-08: every in-flight destination is an in-flight section'
    );
    assert(
      all.every(
        t =>
          !t.fallback_section_ids.includes(PRE_FLIGHT_LENSES_SECTION_ID) &&
          !t.fallback_section_ids.includes(FLIGHT_ACTIVATION_SECTION_ID)
      ),
      'B-09: the regression itself — in flight the control never resolves a pre-flight anchor'
    );
    assert(
      all.every(t => t.fallback_section_ids.length > 0 && !t.fallback_section_ids.includes(t.section_id)),
      'B-10: each in-flight destination declares fallbacks, and never itself'
    );
  }

  console.log('\n=== C. The control lands, on the anchors the components really render ===');
  {
    assert(
      PLANNER_ANCHORS.includes(PRE_FLIGHT_LENSES_SECTION_ID),
      'C-01: PromotionPlanner renders the analytical lens anchor',
      PLANNER_ANCHORS.join(', ')
    );
    assert(
      PLANNER_ANCHORS.includes(FLIGHT_ACTIVATION_SECTION_ID),
      'C-02: PromotionPlanner renders the Review & Activate anchor'
    );
    assert(
      (IN_FLIGHT_SECTION_IDS as readonly string[]).every(id => TWIN_ANCHORS.includes(id)),
      'C-03: LiveDecisionTwinLens renders every in-flight anchor the resolver can name',
      TWIN_ANCHORS.join(', ')
    );
    assert(
      (PRE_FLIGHT_SECTION_IDS as readonly string[]).every(id => !TWIN_ANCHORS.includes(id)),
      'C-04: the in-flight view carries no pre-flight anchor, so a mode confusion cannot pass silently'
    );

    // Pre-flight: the page carries exactly what the PLANNING branch renders.
    const preFlightStates: DecisionAnalyticsState[] = [
      { mode: 'PLANNING', decision_verdict: 'ACCRETIVE GO' },
      { mode: 'PLANNING', decision_verdict: 'MARGIN RISK', readiness_state: 'REVIEW' },
      { mode: 'PLANNING', decision_verdict: 'SUPPLY INFEASIBLE', readiness_state: 'DO_NOT_PROCEED' },
      { mode: 'PLANNING', decision_verdict: null, readiness_state: null }
    ];
    for (const [i, state] of preFlightStates.entries()) {
      const page = pageWith(PLANNER_ANCHORS);
      const landed = scrollToDecisionAnalyticsTarget(resolveDecisionAnalyticsTarget(state), page.doc);
      assert(
        landed === PRE_FLIGHT_LENSES_SECTION_ID && page.scrolled.length === 1,
        `C-05.${i + 1}: pre-flight state ${i + 1} scrolls the reader to the lens section exactly once`,
        `landed=${landed} scrolled=${page.scrolled.join(',')}`
      );
    }

    // In flight: the page carries what LiveDecisionTwinLens renders, minus the outlook when there
    // is no outlook to render.
    const inFlightStates: DecisionAnalyticsState[] = [
      { mode: 'DECISION_TWIN', has_flight: true, outlook_action: 'REVIEW', moment_count: 3 },
      { mode: 'DECISION_TWIN', has_flight: true, outlook_action: 'PREPARE', moment_count: 1 },
      { mode: 'DECISION_TWIN', has_flight: true, outlook_action: 'MONITOR', moment_count: 0 },
      { mode: 'DECISION_TWIN', has_flight: true, outlook_action: null, moment_count: 0 },
      { mode: 'DECISION_TWIN', has_flight: false, outlook_action: null, moment_count: 0 }
    ];
    for (const [i, state] of inFlightStates.entries()) {
      const ids = TWIN_ANCHORS.filter(
        id => id !== CAMPAIGN_OUTLOOK_SECTION_ID || state.outlook_action != null
      );
      const page = pageWith(ids);
      const landed = scrollToDecisionAnalyticsTarget(resolveDecisionAnalyticsTarget(state), page.doc);
      assert(
        landed !== null && page.scrolled.length === 1 && (IN_FLIGHT_SECTION_IDS as readonly string[]).includes(landed!),
        `C-06.${i + 1}: in-flight state ${i + 1} scrolls the reader into in-flight evidence exactly once`,
        `landed=${landed} page=${ids.join(',')}`
      );
    }

    // The fallback is not decoration: an outlook-directed target on a page without the outlook
    // section must still land, because the reader clicked a control that promised a destination.
    const withoutOutlook = pageWith(
      TWIN_ANCHORS.filter(id => id !== CAMPAIGN_OUTLOOK_SECTION_ID)
    );
    const fallbackLanded = scrollToDecisionAnalyticsTarget(
      resolveDecisionAnalyticsTarget({ mode: 'DECISION_TWIN', has_flight: true, outlook_action: 'REVIEW', moment_count: 2 }),
      withoutOutlook.doc
    );
    assert(
      fallbackLanded === CAMPAIGN_TIMELINE_SECTION_ID,
      'C-07: a missing outlook section falls through to the timeline rather than dying',
      `landed=${fallbackLanded}`
    );

    // The old behaviour, asserted as the failure it was: an in-flight page has no pre-flight
    // anchor, so a pre-flight target resolved there scrolls nowhere.
    const wrongMode = pageWith(TWIN_ANCHORS);
    const deadLanding = scrollToDecisionAnalyticsTarget(
      resolveDecisionAnalyticsTarget({ mode: 'PLANNING', decision_verdict: 'ACCRETIVE GO' }),
      wrongMode.doc
    );
    assert(
      deadLanding === null && wrongMode.scrolled.length === 0,
      'C-08: the pre-fix behaviour is reproduced — a pre-flight target on an in-flight page is dead'
    );
    const rightMode = pageWith(TWIN_ANCHORS);
    assert(
      scrollToDecisionAnalyticsTarget(
        resolveDecisionAnalyticsTarget({ mode: 'DECISION_TWIN', has_flight: true, outlook_action: 'REVIEW', moment_count: 2 }),
        rightMode.doc
      ) !== null,
      'C-09: …and the same page, given the in-flight target, is not'
    );
  }

  console.log('\n=== D. Both modes produce a transition, and the wiring is the resolver ===');
  {
    // Pre-flight the transition is two things: the lens tab changes and the page scrolls.
    const contested = resolveDecisionAnalyticsTarget({
      mode: 'PLANNING',
      decision_verdict: 'MARGIN RISK'
    });
    const DEFAULT_LENS: DecisionAnalyticsLensId = 'DEMAND';
    assert(
      contested.lens_id !== null && contested.lens_id !== DEFAULT_LENS,
      'D-01: a contested decision moves the reader off the default lens — a state transition, not just a scroll',
      `lens=${contested.lens_id}`
    );
    const preFlightPage = pageWith(PLANNER_ANCHORS);
    assert(
      scrollToDecisionAnalyticsTarget(contested, preFlightPage.doc) === PRE_FLIGHT_LENSES_SECTION_ID,
      'D-02: …and still scrolls to the section holding that lens'
    );

    const inFlightPage = pageWith(TWIN_ANCHORS);
    assert(
      scrollToDecisionAnalyticsTarget(
        resolveDecisionAnalyticsTarget({ mode: 'DECISION_TWIN', has_flight: true, outlook_action: 'MONITOR', moment_count: 0 }),
        inFlightPage.doc
      ) !== null && inFlightPage.scrolled.length === 1,
      'D-03: in flight the transition is a scroll into the in-flight evidence'
    );

    // With nothing on the page at all the helper reports it rather than pretending, which is what
    // makes a dead control detectable instead of silent.
    const emptyPage = pageWith([]);
    assert(
      scrollToDecisionAnalyticsTarget(resolveDecisionAnalyticsTarget({ mode: 'PLANNING' }), emptyPage.doc) === null,
      'D-04: an empty page returns null rather than reporting a scroll that never happened'
    );

    assert(
      /scrollToDecisionAnalyticsTarget\(exploreTarget\)/.test(plannerSource),
      'D-05: the planner drives the control through the resolver'
    );
    assert(
      /if \(exploreTarget\.lens_id\) setActiveLens\(exploreTarget\.lens_id\)/.test(plannerSource),
      'D-06: the planner applies the resolved lens before scrolling'
    );
    assert(
      !/getElementById\('analytical-lenses-section'\)/.test(plannerSource),
      'D-07: the hardcoded pre-flight anchor lookup is gone from the control'
    );
    assert(
      /exploreDestinationLabel=\{exploreTarget\.destination_label\}/.test(plannerSource),
      'D-08: the control is told what it is about to open'
    );

    const heroSource = readFileSync(join(ROOT, 'components', 'campaign', 'CampaignDiscoveryHero.tsx'), 'utf8');
    assert(
      /Explore Decision Analytics/.test(heroSource) && /onClick=\{onExploreDecision\}/.test(heroSource),
      'D-09: the CTA still exists and is still wired to its handler'
    );
    assert(
      /exploreDestinationLabel/.test(heroSource) && /aria-label=/.test(heroSource),
      'D-10: the CTA announces its destination rather than leaving the reader to guess'
    );

    // The lens ids the resolver can emit must be the lens tabs the planner renders.
    const renderedLensIds = Array.from(plannerSource.matchAll(/\{ id: '([A-Z]+)', label: '([^']+)'/g)).map(m => ({
      id: m[1],
      label: m[2]
    }));
    assert(
      renderedLensIds.length === Object.keys(LENS_LABELS).length,
      'D-11: the planner renders exactly the lens tabs the resolver knows about',
      `rendered=${renderedLensIds.length}`
    );
    assert(
      renderedLensIds.every(t => LENS_LABELS[t.id as DecisionAnalyticsLensId] === t.label),
      'D-12: each destination label matches the tab the reader will land on',
      renderedLensIds.map(t => `${t.id}=${t.label}`).join(' | ')
    );
  }

  console.log('\n====================================================');
  console.log(`PROMOTION CTA RESULTS: ${passCount} passed, ${failCount} failed`);
  console.log('====================================================');
  if (failCount > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
