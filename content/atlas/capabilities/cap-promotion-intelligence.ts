/**
 * Capability knowledge — CAP-PROMOTION-INTELLIGENCE.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-PROMOTION-INTELLIGENCE',
  description:
    'Promotion Intelligence tests whether a promotional uplift projection is compatible with end-to-end supply chain capacity, and surfaces the commercial opportunity that a fulfilment bottleneck would put at risk.',
  innovation_thesis:
    'A promotion that the chain cannot serve is not an opportunity, it is a scheduled disappointment. Reconciling uplift against capacity before launch is a different question from optimising the discount.',
  usage_instructions:
    'Open this capability in the Capability Atlas and follow the demonstrating solution named under \u201cWhere it comes from\u201d. Adjust discount depth and supplier flex, and read the reconciliation between projected demand and servable capacity. Seven campaign lenses give progressively deeper views.',
  testing_instructions:
    'Run npx tsx tests/unit/run-campaign-intelligence-tests.ts (133 assertions) and npx tsx tests/unit/run-campaign-decision-journey-tests.ts (96 assertions).',
  architecture_narrative:
    'The surface composes the campaign causal, opportunity and frontier engines behind one workspace, with seven lenses under components/campaign rendering distinct views of the same evaluation.',
  architecture_flow: [
    'Campaign intent',
    'Counterfactual baseline',
    'Predicted uplift',
    'Servable capacity',
    'Bottleneck and exposure',
    'Intervention options'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/campaigns/evaluate', purpose: 'Evaluate a campaign configuration' },
    { method: 'POST', path: '/api/v1/campaigns/evaluate-causal', purpose: 'Causal evaluation' }
  ],
  contracts: [
    { name: 'CampaignIntent', path: 'packages/contracts/src/campaign-intent-model.ts', direction: 'in' }
  ],
  implementation_references: [
    { path: 'components/PromotionPlanner.tsx', note: 'Surface' },
    { path: 'lib/campaign-causal-engine.ts', note: 'Causal engine' },
    { path: 'lib/campaign-opportunity-engine.ts', note: 'Opportunity engine' },
    { path: 'lib/campaign-frontier-engine.ts', note: 'Frontier engine' },
    { path: 'config/solutions.ts', note: 'SOL-PROMO-01 registry entry' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-campaign-intelligence-tests.ts', outcome: '133 assertions over the campaign evaluation path.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_CAMPAIGN_DECISION_INTELLIGENCE_PLANNING_REPORT.md', outcome: 'Programme planning and acceptance record.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-campaign-intelligence-tests.ts',
    'tests/unit/run-campaign-decision-journey-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Supplier capacity and elasticity come from the synthetic enterprise world, not a client planning system.', severity: 'high' },
    { limitation: 'The five-second proposition figures in the registry are illustrative demonstration values.', severity: 'medium' }
  ],
  assumptions: [
    'The lenses under this workspace are assumed to be views of one evaluation rather than seven separate analyses. A lens that recomputed its own numbers could disagree with the others while still appearing to be the same workspace.'
  ],
  use_cases: [
    { title: 'Reconciling a launch before committing', context: 'A promotion is planned on demand projections alone.', outcome: 'The capacity ceiling and the exposed opportunity are visible before commitment.' }
  ],
  demo_scenarios: [
    {
      path_type: 'ten-minute',
      title: 'Can the chain serve this?',
      audience: 'exec',
      duration_mins: 10,
      steps: [
        { action: 'Set a deep discount', what_to_say: 'Demand rises. Now watch what the chain can actually serve.', what_to_show: 'Demand versus servable capacity', expected_observation: 'A visible gap, not two similar bars' },
        { action: 'Open the frontier lens', what_to_say: 'These are competing strategies, not one optimum.', what_to_show: 'The Pareto set', expected_observation: 'Trade-offs across objectives' }
      ],
      prerequisites: [
        'Retail and Grocery domain active'
      ],
      warnings: [
        'Capacity and elasticity are synthetic. Say so when asked what data is required.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Does this replace our promotion planning tool?', audience: 'exec', difficulty: 'high' },
    { question: 'What data do you need?', audience: 'supply_chain_planner', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'proven', rationale: 'Registered applicable industry on SOL-PROMO-01 and exercised in the CPG demo context.' },
    { domain_id: 'fashion_apparel', applicability: 'likely', rationale: 'Promotion-to-capacity reconciliation generalises to seasonal apparel.' }
  ],
  related_capabilities: [
    { ref: 'CAP-CAMPAIGN-DECISION', relation: 'depends-on' },
    { ref: 'CAP-COMMITMENT-INTELLIGENCE', relation: 'depends-on' }
  ],
  related_governance: [
    'docs/governance/DEMONSTRATION_SOLUTION_MODEL.md'
  ],
});
