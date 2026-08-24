/**
 * Capability knowledge — CAP-COUNTERFACTUAL-BASELINE.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-COUNTERFACTUAL-BASELINE',
  description:
    'Separates three quantities that are routinely collapsed: the current baseline, what would have happened without intervention, and what is predicted with it. A campaign is judged against the counterfactual, not against last year.',
  innovation_thesis:
    'Uplift measured against the wrong baseline is not measurement. The counterfactual is the only comparison that answers whether the intervention did anything.',
  usage_instructions:
    'Configure a campaign on the canvas and open the causal evaluation. The three trajectories are presented separately and never merged into one uplift figure.',
  testing_instructions:
    'Run npx tsx tests/unit/run-cdi02-tests.ts (36 assertions).',
  architecture_narrative:
    'A causal demand engine produces the three trajectories from one shared input set, so the difference between them is arithmetic rather than assertion.',
  architecture_flow: [
    'Campaign intent',
    'Current baseline',
    'Expected without intervention',
    'Predicted with intervention',
    'Campaign delta'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/campaigns/evaluate-causal', purpose: 'Causal evaluation' },
    { method: 'POST', path: '/api/v1/campaigns/counterfactual', purpose: 'Counterfactual baseline' }
  ],
  contracts: [
    { name: 'CampaignCounterfactual', path: 'packages/contracts/src/campaign-counterfactual-model.ts', direction: 'out' }
  ],
  implementation_references: [
    { path: 'lib/campaign-causal-engine.ts', note: 'Causal engine' },
    { path: 'packages/contracts/src/campaign-counterfactual-model.ts', note: 'Contract' },
    { path: 'app/api/v1/campaigns/evaluate-causal/route.ts', note: 'API' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-cdi02-tests.ts', outcome: '36 assertions separating the three trajectories.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_CDI_02_COUNTERFACTUAL_CAUSAL_REPORT.md', outcome: 'Completion report.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-cdi02-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Elasticity and response parameters are declared demonstration values over the synthetic world, not fitted from client history.', severity: 'high' }
  ],
  assumptions: [
    'The counterfactual trajectory is assumed to hold no unmodelled concurrent intervention. The engine attributes the whole difference between the counterfactual and the intervention trajectory to the campaign, so a second initiative running at the same time would be scored as campaign effect.'
  ],
  use_cases: [
    { title: 'Judging a campaign against what would have happened anyway', context: 'Uplift is being claimed against last year.', outcome: 'The counterfactual makes the claim testable.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Compared to what?',
      audience: 'decision_scientist',
      duration_mins: 3,
      steps: [
        { action: 'Show the three trajectories', what_to_say: 'Uplift against last year is not uplift. This is the comparison that counts.', what_to_show: 'Baseline, without, with', expected_observation: 'Three distinct lines' }
      ],
      prerequisites: [],
      warnings: [
        'Elasticity parameters are declared demonstration values, not fitted from client data.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'How do you know what would have happened?', audience: 'decision_scientist', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'likely', rationale: 'Counterfactual evaluation of an intervention is domain-neutral.' },
    { domain_id: 'banking_finance', applicability: 'hypothetical', rationale: 'Plausible for campaign and pricing interventions; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-CAMPAIGN-DECISION', relation: 'enables' },
    { ref: 'CAP-LEARNING-LOOP', relation: 'enables' },
    { ref: 'CAP-PREDICTIVE-INTERVENTION', relation: 'complements' }
  ],
  related_governance: [
    'docs/governance/MASTER_PLAN.md'
  ],
});
