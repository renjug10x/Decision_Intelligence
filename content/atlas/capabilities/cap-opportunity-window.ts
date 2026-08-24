/**
 * Capability knowledge — CAP-OPPORTUNITY-WINDOW.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-OPPORTUNITY-WINDOW',
  description:
    'Turns timing into an active decision variable and evaluates micro-market store candidates explainably by catchment, inventory and shopper mission, rather than ranking them by an unexplained score.',
  innovation_thesis:
    'A date picker assumes the date is already decided. Asking the system to find the best window is a different and more valuable question.',
  usage_instructions:
    'On the campaign canvas, switch to date-discovery mode and let the engine score candidate intervals. Open the micro-market graph to see why each store was ranked.',
  testing_instructions:
    'Run npx tsx tests/unit/run-cdi03-tests.ts (31 assertions).',
  architecture_narrative:
    'Candidate intervals are scored into ordered preference bands, and store candidates are evaluated against explainable factors rather than an opaque ranking.',
  architecture_flow: [
    'Candidate intervals',
    'Interval scoring into preference bands',
    'Micro-market store graph',
    'Explainable factor attribution'
  ],
  apis: [
    { method: 'GET', path: '/api/v1/campaigns/opportunity-windows', purpose: 'Score candidate windows' },
    { method: 'GET', path: '/api/v1/campaigns/micro-markets', purpose: 'Micro-market evaluation' },
    { method: 'POST', path: '/api/v1/campaigns/opportunity-discover', purpose: 'Discover the best window' }
  ],
  contracts: [
    { name: 'OpportunityWindowEvaluation', path: 'packages/contracts/src/campaign-opportunity-model.ts', direction: 'out' }
  ],
  implementation_references: [
    { path: 'lib/campaign-opportunity-engine.ts', note: 'Engine' },
    { path: 'packages/contracts/src/campaign-opportunity-model.ts', note: 'Contract' },
    { path: 'app/api/v1/campaigns/opportunity-windows/route.ts', note: 'API' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-cdi03-tests.ts', outcome: '31 assertions on window scoring and micro-market explainability.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_CDI_03_OPPORTUNITY_WINDOW_MICROMARKET_REPORT.md', outcome: 'Completion report.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-cdi03-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Catchment and mission data come from the synthetic enterprise world.', severity: 'high' },
    { limitation: 'An OpportunityWindowEvaluation scores when to run a campaign. It is not the DDF-01 Decision Window, which states until when an option remains open. The two must never be merged (ADR-042).', severity: 'high' }
  ],
  assumptions: [
    'Candidate intervals are assumed to be independently executable. Each window is scored on its own catchment, inventory and mission factors, so the model does not carry the cost of having already run a campaign in an earlier window.'
  ],
  use_cases: [
    { title: 'Choosing when, not just how much', context: 'The launch date was fixed before the analysis started.', outcome: 'Candidate windows are scored and the best is explained.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Find the best window',
      audience: 'marketing_strategist',
      duration_mins: 3,
      steps: [
        { action: 'Switch to date discovery', what_to_say: 'The date is a decision, not an input.', what_to_show: 'Scored candidate intervals', expected_observation: 'Ranked windows with reasons' }
      ],
      prerequisites: [],
      warnings: [
        'Do not describe this as the Decision Window. That is a different capability measuring a different thing.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Why did it pick that store?', audience: 'category_manager', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'restaurants_food', applicability: 'likely', rationale: 'Timing and catchment decisions generalise to food service.' },
    { domain_id: 'fashion_apparel', applicability: 'hypothetical', rationale: 'Seasonal windows differ structurally; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-CAMPAIGN-DECISION', relation: 'enables' }
  ],
  related_decisions: [
    'ADR-042'
  ],
  related_governance: [
    'docs/governance/MASTER_PLAN.md'
  ],
});
