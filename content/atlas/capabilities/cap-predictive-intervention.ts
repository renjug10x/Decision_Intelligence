/**
 * Capability knowledge — CAP-PREDICTIVE-INTERVENTION.
 * Authored by FM-01 after the CTW programme completed. Every claim traces to a cited path, test or
 * report; anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-PREDICTIVE-INTERVENTION',
  description:
    'Derives the few days of a live campaign that will actually need a decision, gives each one a window and a candidate action, lets an analyst plan against it, reassesses that plan as evidence arrives, and — once a person confirms — reforecasts only the horizon that is still ahead.',
  innovation_thesis:
    'The value of a forecast is not the number, it is the moment it identifies. Most in-flight tooling either alerts on everything or waits to be asked. Ranking at most three decision moments, stating the window in which acting still changes the outcome, and appending every reassessment rather than replacing it turns a projection into a decision trail. The discipline that makes it credible is what it refuses: no moment exists without a bound forecast, an observed departure is never extrapolated, and automatic execution is declared unavailable rather than simulated.',
  usage_instructions:
    'Activate a campaign and open Campaign In-Flight. The Campaign Outlook states the headline, the next decision and the current action. Open a decision moment to see its evidence, its window and the cost of waiting, then preview the intervention against doing nothing. Plan it — Prepare for approval is the default — and reassess it as the campaign moves. Confirming it records the intervention and publishes a reforecast beside the original expectation, never over it.',
  testing_instructions:
    'Run npx tsx tests/unit/run-ctw02-tests.ts (82 assertions across moment derivation, evidence-source restriction, window arithmetic, preview, planning modes, reassessment and reforecast).',
  field_status: [
    {
      field: 'automatic_execution',
      implementation_status: 'concept',
      note: 'Declared UNAVAILABLE and refused at the route. CogniX has no governed execution integration and will not simulate one, so the mode exists in the vocabulary only to be refused explicitly.'
    },
    {
      field: 'decision_moment.kind',
      implementation_status: 'partially-implemented',
      note: 'Three kinds are derived: a forecast contribution trough, a forecast demand peak, and a sustained observed departure. A stock-risk moment is deliberately absent because no depletion basis is modelled.'
    },
    {
      field: 'intervention_action_kind',
      implementation_status: 'partially-implemented',
      note: 'One governed action exists — reduce discount depth. It is the only lever CDI-02 can evaluate both sides of, and inventing a second would mean proposing an action with no counterfactual behind it.'
    }
  ],
  architecture_narrative:
    'Nothing in this capability forecasts. Moments are derived from exactly three permitted evidence sources — the governed forecast’s per-period output, the observed deviation against the activated decision, and the declared uncertainty — and the contract enumerates those three so a fourth cannot be added quietly. A window is arithmetic rather than optimisation: it runs from tomorrow to the last day of the period it targets, because acting on the first day of a days six to nine period still changes days six to nine. Preview compares doing nothing against intervening over the remaining horizon only, both sides being CDI-02 at two promotional depths reshaped by the same governed forecast. Confirmation appends a REFORECAST trajectory covering only days from the effective day; the original expectation and every observation are untouched.',
  architecture_flow: [
    'Governed forecast bound to the campaign horizon',
    'Decision moments, ranked material first',
    'Window and cost of delay',
    'Intervention preview against doing nothing',
    'Planned intervention with a governed mode',
    'Continuous reassessment, appended never replaced',
    'Confirmation and a reforecast of the remaining horizon'
  ],
  apis: [
    { method: 'GET', path: '/api/v1/campaigns/interventions', purpose: 'Planned interventions for the session' },
    { method: 'POST', path: '/api/v1/campaigns/interventions', purpose: 'Plan an intervention against a decision moment' },
    { method: 'POST', path: '/api/v1/campaigns/interventions/preview', purpose: 'Do nothing against intervene, over the remaining horizon only' },
    { method: 'POST', path: '/api/v1/campaigns/interventions/[id]/reassess', purpose: 'Reassess a planned intervention as evidence arrives' },
    { method: 'POST', path: '/api/v1/campaigns/interventions/[id]/confirm', purpose: 'Confirm an intervention and publish its reforecast' }
  ],
  contracts: [
    { name: 'DecisionMoment', path: 'packages/contracts/src/campaign-intervention-model.ts', direction: 'out' },
    { name: 'PlannedIntervention', path: 'packages/contracts/src/campaign-intervention-model.ts', direction: 'out' }
  ],
  data_sources: [
    { name: 'Campaign archetypes and seeded telemetry', kind: 'synthetic', path: 'lib/campaign-archetypes.ts' }
  ],
  implementation_references: [
    { path: 'packages/contracts/src/campaign-intervention-model.ts', note: 'Contract, the three permitted evidence sources and the automatic-execution refusal' },
    { path: 'lib/campaign-intervention-engine.ts', note: 'Moment derivation, windows, outlook and reassessment' },
    { path: 'lib/campaign-intervention-preview.ts', note: 'Do nothing against intervene, over the remaining horizon' },
    { path: 'lib/planned-intervention-store.ts', note: 'Planned interventions and their appended reassessment trail' },
    { path: 'app/api/v1/campaigns/interventions/route.ts', note: 'Plan and list' },
    { path: 'components/campaign/CampaignOutlookPanel.tsx', note: 'Outlook and decision moments' },
    { path: 'components/campaign/InterventionWorkspace.tsx', note: 'Preview, plan, reassess and confirm' },
    { path: 'components/campaign/CampaignStory.tsx', note: 'The recorded trail, with predictions marked as not yet happened' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-ctw02-tests.ts', outcome: '82 assertions. A-01 requires that with no forecast bound no predicted moment exists at all; A-07 asserts every citation field-by-field against the three permitted sources.', observed_at: '2026-08-23', observed_by: 'FM-01 release validation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_CTW_02_PREDICTIVE_INTERVENTION_REPORT.md', outcome: 'Completion report, including three defects found by browser validation and fixed with regressions.', observed_at: '2026-08-23', observed_by: 'FM-01 release validation' }
  ],
  test_runners: [
    'tests/unit/run-ctw02-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Automatic external execution is declared unavailable and refused at the route. CogniX plans and records an intervention; it never actions one in another system.', severity: 'high' },
    { limitation: 'One governed intervention action exists — reduce discount depth — because it is the only lever CDI-02 can evaluate both sides of. A second action would need its own counterfactual before it could be offered.', severity: 'medium' },
    { limitation: 'A sustained observed departure is stated and explicitly not projected forward. Extrapolating a deviation rate would be a forecast this capability does not own, and the refusal is published as one of the moment’s reasons.', severity: 'medium' },
    { limitation: 'No stock or availability moment is derived, because no depletion basis is modelled. A demand peak therefore names the question rather than proposing an answer.', severity: 'medium' },
    { limitation: 'At most three moments are shown. That is a deliberate bound, not a coverage claim: three is a decision, ten is a dashboard.', severity: 'low' },
    { limitation: 'All underlying campaign telemetry is simulated. Nothing here has observed a real intervention or its outcome.', severity: 'high' }
  ],
  assumptions: [
    'A decision moment is assumed to require a day that differs materially from the other days. That is why no predicted moment can exist without a bound forecast — under a flat horizon there is nothing for a moment to be about, and inventing one would be exactly the fabrication the programme forbids.',
    'A reassessment is assumed to be worth keeping even when it is superseded. Every reassessment is appended rather than replaced, because the record of why a plan changed is the part a reviewer needs.',
    'Acting earlier within a window is assumed to affect more of the targeted period than acting later. The cost of delay is stated because it is countable from that arithmetic, never to add urgency.'
  ],
  use_cases: [
    { title: 'Finding the day that needs a decision', context: 'A campaign is running and the analyst has fourteen days of projection to read.', outcome: 'At most three ranked moments, each with a window, an expected consequence and cited evidence.' },
    { title: 'Deciding whether to intervene', context: 'Contribution is forecast to dip across a four-day period.', outcome: 'Do nothing against intervene, over the remaining horizon only, with the trade-off named and the numbers behind disclosure.' },
    { title: 'Showing why a plan changed', context: 'A planned intervention was brought forward and then cancelled.', outcome: 'The reassessment trail is appended, so the sequence of verdicts and their reasons is readable.' }
  ],
  demo_scenarios: [
    {
      path_type: 'ten-minute',
      title: 'From a forecast to a confirmed intervention',
      audience: 'marketing_strategist',
      duration_mins: 10,
      steps: [
        { action: 'Read the Campaign Outlook', what_to_say: 'One headline, one next decision, one current action. Not a list of alerts.', what_to_show: 'The outlook panel', expected_observation: 'MONITOR, PREPARE or REVIEW, derived from governed outputs' },
        { action: 'Open a decision moment', what_to_say: 'Every moment cites the forecast, the observed deviation or the declared uncertainty. There is nothing else it is allowed to cite.', what_to_show: 'The moment, its evidence and its window', expected_observation: 'A period, an expected consequence, and the cost of each day of delay' },
        { action: 'Point at the demand-peak moment', what_to_say: 'This is the one where CogniX declines to help. There is no stock model, so there is no stock warning.', what_to_show: 'The refusal in the moment’s own text', expected_observation: 'The question named, and no action proposed' },
        { action: 'Preview, plan and confirm', what_to_say: 'Prepare for approval is the default. Automatic execution is refused, not simulated.', what_to_show: 'The intervention workspace', expected_observation: 'A reforecast appears beside the original expectation, covering only the days ahead' }
      ],
      prerequisites: [
        'A campaign activated and in flight',
        'Retail and Grocery domain active'
      ],
      warnings: [
        'Nothing is executed anywhere. Confirming an intervention records a decision inside CogniX and changes no external system.',
        'All telemetry is simulated. Do not describe the running campaign as live performance.',
        'Do not claim CogniX predicts the deviation will continue. It states what has happened and explicitly refuses to project it.'
      ],
      follow_ups: [
        'Show the reforecast against the original expectation on the continuous timeline.'
      ]
    }
  ],
  client_questions: [
    { question: 'Will it act on its own?', audience: 'exec', difficulty: 'high' },
    { question: 'How does it decide what counts as a moment?', audience: 'category_manager', difficulty: 'medium' },
    { question: 'What happens to the original plan when we intervene?', audience: 'marketing_strategist', difficulty: 'medium' },
    { question: 'Could it recommend something other than a discount change?', audience: 'exec', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'likely', rationale: 'A trade promotion in flight has the same structure: a forecast horizon, a lever with a counterfactual, and a window in which acting still changes the period being targeted.' },
    { domain_id: 'hospitality_hotels', applicability: 'likely', rationale: 'Rate interventions against a booking window are the same shape — a projected period of pressure, a lever, and a shrinking window in which to pull it.' },
    { domain_id: 'travel_tourism', applicability: 'hypothetical', rationale: 'Yield decisions over a departure window are structurally similar. Not assessed against any travel data.' }
  ],
  visualisation: {
    kind: 'flow',
    concept: 'Predictive intervention planning',
    description:
      'A forecast produces the days that differ; each becomes a decision moment with a window. Preview compares acting against not acting over the remaining horizon. Planning and reassessment record intent, and only a person’s confirmation produces a reforecast — which is added beside the original expectation, never over it.',
    nodes: [
      { label: 'Governed forecast', detail: 'The only reason a predicted moment can exist.', role: 'stage' },
      { label: 'Decision moment', detail: 'At most three, ranked material first.', role: 'stage' },
      { label: 'Window', detail: 'Tomorrow to the last day of the period targeted.', role: 'stage' },
      { label: 'Preview', detail: 'Do nothing against intervene, remaining horizon only.', role: 'evidence' },
      { label: 'Plan and reassess', detail: 'Every reassessment appended, never replaced.', role: 'stage' },
      { label: 'Confirmed reforecast', detail: 'Days from the effective day only; history untouched.', role: 'outcome' }
    ]
  },
  related_capabilities: [
    { ref: 'CAP-GOVERNED-FORECAST', relation: 'depends-on' },
    { ref: 'CAP-CONTINUOUS-DECISION-TWIN', relation: 'depends-on' },
    { ref: 'CAP-COUNTERFACTUAL-BASELINE', relation: 'complements' }
  ],
  related_decisions: [
    'ADR-070'
  ],
  related_governance: [
    'docs/governance/MASTER_PLAN.md'
  ],
});
