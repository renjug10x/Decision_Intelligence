/**
 * Capability knowledge — CAP-CONTINUOUS-DECISION-TWIN.
 * Authored by FM-01 after the CTW programme completed. Every claim traces to a cited path, test or
 * report; anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-CONTINUOUS-DECISION-TWIN',
  description:
    'Turns a decision from a moment into a journey. One horizon carries the activated pre-flight baseline, the days that have elapsed against it, and the days still to come, with each day declared as observed, simulated or predicted rather than blended into one line.',
  innovation_thesis:
    'Most decision tools stop at the decision. The interesting question starts after it: the plan is now a commitment, evidence is arriving against it, and the horizon it was made for is still mostly ahead. A twin that only shows the elapsed part is a report; a twin that blends elapsed and predicted into one line is a report that lies. Keeping the three classes separate is what makes the same picture usable for both looking back and deciding next.',
  usage_instructions:
    'Open Promotion, configure a campaign and review the pre-flight assessment. Choose Approve and activate — where more than one option survives the declared constraints a person confirms which, who owns it and why. Then open Campaign In-Flight: the timeline shows the whole horizon with a TODAY divider, the elapsed days carrying deviation against the activated decision and the remaining days shaded as predicted. Select any day for its narrative.',
  testing_instructions:
    'Run npx tsx tests/unit/run-ctw01-tests.ts (65 assertions on activation, class separation, horizon, deviation, uncertainty and CDI-05 invariance) and npx tsx tests/unit/run-ctw01r-tests.ts (60 assertions on decision confirmation, derived stage and narration).',
  field_status: [
    {
      field: 'horizon_class',
      implementation_status: 'partially-implemented',
      note: 'OBSERVED_ELAPSED requires an ESF-6 admitted observation and is unreachable at this baseline, so every elapsed day resolves to SIMULATED_ELAPSED and says so. OBSERVED_ELAPSED_REQUIRED_INPUT publishes what would change that.'
    },
    {
      field: 'uncertainty',
      implementation_status: 'simulated',
      note: 'The in-flight band is declared_horizon_uncertainty_profile — a declared profile, not a calibrated interval. The governed forecast bound to the horizon carries its own measured and calibrated interval separately.'
    },
    {
      field: 'revenue',
      implementation_status: 'concept',
      note: 'Deliberately absent. CDI-05 publishes revenue as NOT_AVAILABLE with the authoritative input it would need, and the twin does not invent it.'
    }
  ],
  architecture_narrative:
    'Activation binds to the existing CDI-07A DecisionContract rather than creating a second baseline: it registers the campaign intent, evaluates the CDI-06 outcome frontier and creates an ACTIVE contract by the same governed path the Campaign Decision Canvas uses. The flight engine then reads the CDI-05 projection through that contract and classifies every day of the horizon. Deviation is like-for-like: seeded telemetry supplies only a scale-free ratio computed inside its own basis, which is applied to the contract-bound projection so both sides of the comparison land in the same basis.',
  architecture_flow: [
    'Campaign configuration',
    'Pre-flight decision intelligence',
    'Review and activate — DecisionContract',
    'Continuous horizon: observed, simulated, predicted',
    'Deviation against the activated decision',
    'Day narrative and attention state'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/campaigns/flight', purpose: 'Project the whole campaign horizon against the activated decision' },
    { method: 'POST', path: '/api/v1/campaigns/experiments/close-active', purpose: 'Close the experiment in progress without resetting the shared session' }
  ],
  contracts: [
    { name: 'CampaignFlightProjection', path: 'packages/contracts/src/campaign-continuous-timeline-model.ts', direction: 'out' },
    { name: 'DecisionContract', path: 'packages/contracts/src/campaign-decision-contract-model.ts', direction: 'in' }
  ],
  data_sources: [
    { name: 'Campaign archetypes and seeded telemetry', kind: 'synthetic', path: 'lib/campaign-archetypes.ts' }
  ],
  implementation_references: [
    { path: 'packages/contracts/src/campaign-continuous-timeline-model.ts', note: 'Contract and the W-INV-1…W-INV-7 invariants as executable checks' },
    { path: 'lib/campaign-continuous-timeline-engine.ts', note: 'Engine' },
    { path: 'app/api/v1/campaigns/flight/route.ts', note: 'API' },
    { path: 'components/campaign/ContinuousFlightTimeline.tsx', note: 'The timeline surface' },
    { path: 'components/campaign/FlightActivationPanel.tsx', note: 'Review, confirm and activate' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-ctw01-tests.ts', outcome: '65 assertions, including tampering with a valid projection to prove each of the seven invariants bites.', observed_at: '2026-08-23', observed_by: 'FM-01 release validation' },
    { kind: 'test', ref: 'tests/unit/run-ctw01r-tests.ts', outcome: '60 assertions. C-20/C-21 assert the flat-horizon disclosure matches the shape the projection actually has, so they fail if the disclosure and the data ever disagree.', observed_at: '2026-08-23', observed_by: 'FM-01 release validation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_CTW_01_CONTINUOUS_TIMELINE_REPORT.md', outcome: 'Completion report for the timeline and activation.', observed_at: '2026-08-23', observed_by: 'FM-01 release validation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_CTW_01R_CAMPAIGN_DECISION_EXPERIENCE_REPORT.md', outcome: 'Completion report for the decision experience, narration and experiment lifecycle.', observed_at: '2026-08-23', observed_by: 'FM-01 release validation' }
  ],
  test_runners: [
    'tests/unit/run-ctw01-tests.ts',
    'tests/unit/run-ctw01r-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Every elapsed day is SIMULATED_ELAPSED. No observation in this estate carries ESF-6 admission, so the twin has never seen a real outcome and does not claim to.', severity: 'high' },
    { limitation: 'The in-flight uncertainty band is a declared profile, not a calibrated interval, and is rendered with its basis visible. Do not read it as a prediction interval.', severity: 'high' },
    { limitation: 'Revenue and stock trajectories are absent by refusal rather than by omission: neither has a declared basis this estate can supply.', severity: 'medium' },
    { limitation: 'No campaign in the seeded archetypes can pass its final day, so a completed stage is a state no record can reach and is deliberately not offered.', severity: 'low' },
    { limitation: 'Post-flight reconciliation is not delivered. It is deferred extension work on CDI-08 and the experiment comparison surface, not a missing part of this capability.', severity: 'medium' }
  ],
  assumptions: [
    'The activated DecisionContract is assumed to be the only baseline a campaign is measured against. A second activated record competing with it would give the estate two truths about what was decided, which is why activation supersedes rather than replaces.',
    'Elapsed telemetry and the projection are assumed to be on different quantity bases and different populations, so they are never subtracted from one another. Only a scale-free ratio crosses between them.'
  ],
  use_cases: [
    { title: 'Deciding again, mid-flight', context: 'A campaign was approved a week ago and evidence has arrived since.', outcome: 'The same horizon shows what was decided, what has happened against it, and what is still ahead — without a prediction reading as an observation.' },
    { title: 'Explaining a decision after the fact', context: 'Someone asks why a campaign was approved and on what basis.', outcome: 'The activated contract names the option, the owner and the reason, and the timeline shows the expectation it created.' }
  ],
  demo_scenarios: [
    {
      path_type: 'ten-minute',
      title: 'From assessment to a campaign in flight',
      audience: 'exec',
      duration_mins: 10,
      steps: [
        { action: 'Configure a campaign and read the pre-flight assessment', what_to_say: 'Nothing runs until it is activated. This is an assessment, not a commitment.', what_to_show: 'The pre-flight decision intelligence', expected_observation: 'A verdict, a dominant trade-off and a decision gap' },
        { action: 'Approve and activate, confirming owner and reason', what_to_say: 'More than one option survives the declared constraints, so CogniX refuses to choose. A person decides, on the record.', what_to_show: 'The confirmation panel', expected_observation: 'The refusal names exactly which answer is still missing' },
        { action: 'Open Campaign In-Flight', what_to_say: 'One horizon, three declared classes. The hatched half has not happened.', what_to_show: 'The continuous timeline with its TODAY divider', expected_observation: 'Elapsed days carry deviation; predicted days carry none' },
        { action: 'Select a day', what_to_say: 'Every word here is derived from the figures beside it. Change the data and the sentence changes.', what_to_show: 'The day narrative and its basis list', expected_observation: 'A headline, a statement, an attention state and the reason for it' }
      ],
      prerequisites: [
        'Retail and Grocery domain active',
        'A campaign archetype selected'
      ],
      warnings: [
        'Every elapsed day is simulated. Do not describe the running series as observed performance.',
        'The band around the predicted days is a declared uncertainty profile. Do not call it a confidence interval.'
      ],
      follow_ups: [
        'Show the same horizon after an intervention is confirmed (CAP-PREDICTIVE-INTERVENTION).'
      ]
    }
  ],
  client_questions: [
    { question: 'Is this reading our live campaign data?', audience: 'exec', difficulty: 'high' },
    { question: 'What happens to the original plan when we intervene?', audience: 'marketing_strategist', difficulty: 'medium' },
    { question: 'How would this connect to our campaign management system?', audience: 'enterprise_architect', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'likely', rationale: 'A trade promotion has the same shape: a commitment made in advance, a window it runs over, and evidence arriving against it mid-flight.' },
    { domain_id: 'hospitality_hotels', applicability: 'likely', rationale: 'A rate or campaign decision over a booking window is the same activated-baseline-then-elapsed-evidence structure, with occupancy in place of demand.' },
    { domain_id: 'logistics_distribution', applicability: 'hypothetical', rationale: 'A committed capacity plan measured against elapsed volume fits the structure. Not assessed against any logistics data.' }
  ],
  visualisation: {
    kind: 'comparison',
    concept: 'One horizon, three declared classes',
    description:
      'A single campaign horizon divided by a TODAY marker. Days before it are elapsed and carry a deviation against the activated decision; days after it are predicted and carry none. The two halves are drawn differently on purpose, so a prediction can never be read as a measurement.',
    nodes: [
      { label: 'Activated decision', detail: 'The contract the whole horizon is measured against.', role: 'current' },
      { label: 'Elapsed days', detail: 'Simulated at this baseline, and labelled as such.', role: 'evidence' },
      { label: 'TODAY', detail: 'The boundary between what happened and what has not.', role: 'stage' },
      { label: 'Predicted days', detail: 'Shaped by the governed forecast; no actual, no deviation.', role: 'outcome' }
    ]
  },
  related_capabilities: [
    { ref: 'CAP-DECISION-TIMELINE', relation: 'depends-on' },
    { ref: 'CAP-DECISION-CONTRACT', relation: 'depends-on' },
    { ref: 'CAP-GOVERNED-FORECAST', relation: 'depends-on' },
    { ref: 'CAP-PREDICTIVE-INTERVENTION', relation: 'enables' },
    { ref: 'CAP-CAMPAIGN-DECISION', relation: 'complements' }
  ],
  related_decisions: [
    'ADR-070'
  ],
  related_governance: [
    'docs/governance/MASTER_PLAN.md',
    'docs/governance/COGNIX_INNOVATION_BACKLOG.md'
  ],
});
