/**
 * Capability knowledge — CAP-DECISION-TIMELINE.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-DECISION-TIMELINE',
  description:
    'Renders one closed evaluation over time with progressive driver decomposition, following the What, Why, Evidence, What-If disclosure pattern rather than presenting a dense chart.',
  innovation_thesis:
    'A timeline that shows only the outcome hides the drivers. Decomposing the drivers progressively is what turns a chart into an explanation.',
  usage_instructions:
    'Open the timeline lens after an evaluation. Expand a period to decompose its drivers, then follow each driver to its evidence.',
  testing_instructions:
    'Run npx tsx tests/unit/run-cdi05-tests.ts (70 assertions).',
  field_status: [
    { field: 'post_campaign', implementation_status: 'concept', note: 'Structurally present in the contract and numerically empty; there is no observed post-campaign data in the estate.' }
  ],
  architecture_narrative:
    'Temporal rendering of one closed evaluation under a single identity basis, with ambient parity across trajectories and post-campaign structurally present but numerically empty.',
  architecture_flow: [
    'Closed evaluation',
    'Temporal projection',
    'Driver decomposition',
    'Evidence per driver'
  ],
  apis: [
    { method: 'GET', path: '/api/v1/campaigns/timeline', purpose: 'Timeline projection' }
  ],
  contracts: [
    { name: 'DecisionTimelineProjection', path: 'packages/contracts/src/campaign-timeline-model.ts', direction: 'out' }
  ],
  implementation_references: [
    { path: 'lib/campaign-timeline-engine.ts', note: 'Engine' },
    { path: 'packages/contracts/src/campaign-timeline-model.ts', note: 'Contract' },
    { path: 'app/api/v1/campaigns/timeline/route.ts', note: 'API' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-cdi05-tests.ts', outcome: '70 assertions on temporal rendering and decomposition.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_CDI_05_DECISION_TIMELINE_REPORT.md', outcome: 'Completion report.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-cdi05-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Revenue is reported NOT_AVAILABLE and the post-campaign period is structurally present but numerically empty. These absences are shown, not filled.', severity: 'high' }
  ],
  assumptions: [
    'Every period on the timeline is assumed to be reported under one identity basis. Mixing bases across periods would turn the progression into a comparison of different things, so the timeline refuses that rather than reconciling it.'
  ],
  use_cases: [
    { title: 'Explaining a projection rather than displaying it', context: 'A chart is shown and the first question is why.', outcome: 'Drivers decompose progressively down to evidence.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Why, not just what',
      audience: 'demand_planner',
      duration_mins: 3,
      steps: [
        { action: 'Expand a period', what_to_say: 'Every movement decomposes into named drivers, and each driver reaches its evidence.', what_to_show: 'Progressive decomposition', expected_observation: 'Drivers and evidence, not a bare line' }
      ],
      prerequisites: [],
      warnings: [
        'Revenue is NOT_AVAILABLE and post-campaign is empty by design. Do not narrate figures that are not there.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Why is revenue blank?', audience: 'bi_analyst', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'likely', rationale: 'Driver decomposition over a projection is domain-neutral.' },
    { domain_id: 'restaurants_food', applicability: 'hypothetical', rationale: 'Plausible; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-CAMPAIGN-DECISION', relation: 'enables' },
    { ref: 'CAP-DEMAND-FORECAST', relation: 'complements' }
  ],
  related_governance: [
    'docs/governance/MASTER_PLAN.md'
  ],
});
