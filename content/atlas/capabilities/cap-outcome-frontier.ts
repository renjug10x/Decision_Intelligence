/**
 * Capability knowledge — CAP-OUTCOME-FRONTIER.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-OUTCOME-FRONTIER',
  description:
    'A Pareto set of candidate configurations over competing objectives, with selection by declared constraints only. Where more than one candidate survives the constraints, the result is CHOICE_REQUIRED and no winner is named.',
  innovation_thesis:
    'A single optimised number hides the trade-off that the executive is actually paid to make. Showing the frontier keeps the choice with the human.',
  usage_instructions:
    'Open the frontier lens. Scenario zero sits at the origin by construction. Apply declared constraints to narrow the set; where several survive, the system asks you to choose.',
  testing_instructions:
    'Run npx tsx tests/unit/run-cdi06-tests.ts (93 assertions).',
  architecture_narrative:
    'A two-axis Pareto frontier over real evaluations. No weights, no utility function, no model ranking. Non-promotion options are presented but not ranked.',
  architecture_flow: [
    'Candidate configurations',
    'Real evaluation per candidate',
    'Pareto set',
    'Declared constraints',
    'Single survivor, or CHOICE_REQUIRED'
  ],
  apis: [
    { method: 'GET', path: '/api/v1/campaigns/outcome-frontier', purpose: 'Outcome frontier' }
  ],
  contracts: [
    { name: 'OutcomeFrontier', path: 'packages/contracts/src/campaign-frontier-model.ts', direction: 'out' }
  ],
  implementation_references: [
    { path: 'lib/campaign-frontier-engine.ts', note: 'Engine' },
    { path: 'packages/contracts/src/campaign-frontier-model.ts', note: 'Contract' },
    { path: 'components/campaign/DecisionFrontierLens.tsx', note: 'Lens' },
    { path: 'app/api/v1/campaigns/outcome-frontier/route.ts', note: 'API' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-cdi06-tests.ts', outcome: '93 assertions including refusal semantics.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_CDI_06_OUTCOME_FRONTIER_REPORT.md', outcome: 'Completion report.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-cdi06-tests.ts'
  ],
  known_limitations: [
    { limitation: 'One signal treatment is excluded and a second is contracted UNAVAILABLE. The frontier is over the objectives the estate can actually evaluate.', severity: 'medium' },
    { limitation: 'This Outcome Frontier is a Pareto set of configurations. It is not the DDF-01 Demand Decision Frontier, which is a set of demand trajectories. ADR-043 requires both names to stay qualified.', severity: 'high' }
  ],
  assumptions: [
    'The declared objectives are assumed to capture what the decision is actually trading off. A Pareto set is only as honest as its axes: an objective nobody declared cannot rescue a candidate the frontier shows as dominated.'
  ],
  use_cases: [
    { title: 'Keeping the trade-off visible', context: 'A single recommended configuration is presented and the trade-off is invisible.', outcome: 'Competing strategies are shown as distinct plays.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Competing strategies, not one optimum',
      audience: 'exec',
      duration_mins: 3,
      steps: [
        { action: 'Open the frontier and apply a constraint', what_to_say: 'We do not hand you an optimum. We hand you the trade-off and your declared constraints.', what_to_show: 'The Pareto set narrowing', expected_observation: 'CHOICE_REQUIRED where several survive' }
      ],
      prerequisites: [],
      warnings: [
        'Never shorten this to Decision Frontier. That name belongs to the demand trajectory capability.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Why will it not just tell me the best one?', audience: 'exec', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'manufacturing', applicability: 'likely', rationale: 'Multi-objective trade-off selection is a general planning pattern.' },
    { domain_id: 'energy_utilities', applicability: 'hypothetical', rationale: 'Plausible for dispatch and capacity decisions; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-CAMPAIGN-DECISION', relation: 'enables' }
  ],
  related_decisions: [
    'ADR-043'
  ],
  related_governance: [
    'docs/governance/MASTER_PLAN.md'
  ],
});
