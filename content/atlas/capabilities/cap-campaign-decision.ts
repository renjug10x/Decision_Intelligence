/**
 * Capability knowledge — CAP-CAMPAIGN-DECISION.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-CAMPAIGN-DECISION',
  description:
    'Campaign Decision Intelligence is the decision capability behind a campaign: whether to intervene, what to do, where and when, and what the consequences are, rather than collapsing the question into a discount calculator.',
  innovation_thesis:
    'Retail promotion tools answer how deep the discount should be. They skip whether intervention is needed at all, which is the decision that actually carries the money.',
  usage_instructions:
    'Open the Campaign Decision Canvas. Work through the four input areas, then the readiness, timeline, frontier and contract lenses. Experiment history and comparison support up to four saved decisions.',
  testing_instructions:
    'Run the CDI suites: run-cdi01 through run-cdi08, plus run-campaign-decision-journey-tests.ts and run-decision-dimensions-tests.ts.',
  architecture_narrative:
    'A progressive four-area input framework feeding a family of engines, each publishing a governed contract. The canvas composes them; it does not compute.',
  architecture_flow: [
    'Campaign intent and decision context',
    'Counterfactual baseline',
    'Opportunity window and micro-markets',
    'Readiness verdict',
    'Timeline and frontier',
    'Decision contract'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/campaigns/intent', purpose: 'Register campaign intent' },
    { method: 'POST', path: '/api/v1/campaigns/evaluate', purpose: 'Evaluate a configuration' },
    { method: 'GET', path: '/api/v1/campaigns/experiments', purpose: 'List saved decision experiments' },
    { method: 'POST', path: '/api/v1/campaigns/experiments/compare', purpose: 'Compare up to four decisions' }
  ],
  contracts: [
    { name: 'CampaignIntent', path: 'packages/contracts/src/campaign-intent-model.ts', direction: 'in' },
    { name: 'CampaignDecisionTaxonomy', path: 'packages/contracts/src/campaign-decision-taxonomy-model.ts', direction: 'in' }
  ],
  implementation_references: [
    { path: 'components/CampaignDecisionCanvas.tsx', note: 'Workspace' },
    { path: 'components/campaign/ExperimentHistoryDrawer.tsx', note: 'Experiment history' },
    { path: 'components/campaign/ExperimentComparisonModal.tsx', note: 'Comparison' },
    { path: 'components/campaign/ExecutionBriefModal.tsx', note: 'Execution brief' },
    { path: 'config/experiments.ts', note: 'EXP-CDI-01 registry entry' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-cdi01-tests.ts', outcome: '21 assertions on the intent contract.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'test', ref: 'tests/unit/run-decision-dimensions-tests.ts', outcome: '173 assertions across the decision dimensions.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_PROGRAMME_10_POST_CDI_CONSOLIDATION_ASSESSMENT.md', outcome: 'Consolidation assessment across the CDI family.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-cdi01-tests.ts',
    'tests/unit/run-campaign-decision-journey-tests.ts',
    'tests/unit/run-decision-dimensions-tests.ts'
  ],
  known_limitations: [
    { limitation: 'The registry entry describes only CDI-01 and records maturity as Prototype, while CDI-01 through CDI-08 are all complete. ATL-01 recorded this as finding F2; correcting the registry is not Atlas work.', severity: 'high' },
    { limitation: 'All evaluation runs on the synthetic enterprise world.', severity: 'high' }
  ],
  assumptions: [
    'The four input areas the canvas collects are assumed sufficient to determine a campaign decision. A client whose decision turns on an input outside those areas needs the framework extended, not the existing inputs reweighted.'
  ],
  use_cases: [
    { title: 'Deciding whether to run a campaign at all', context: 'A campaign is assumed and only its depth is debated.', outcome: 'Whether, what, where and when become explicit decisions with evidence.' }
  ],
  demo_scenarios: [
    {
      path_type: 'ten-minute',
      title: 'The decision before the discount',
      audience: 'exec',
      duration_mins: 10,
      steps: [
        { action: 'Work the four input areas', what_to_say: 'We have not mentioned a discount yet. These are the decisions that come first.', what_to_show: 'The progressive input framework', expected_observation: 'Intent, baseline, audience, context' },
        { action: 'Open readiness and the frontier', what_to_say: 'This is a verdict with reasons, and a set of competing strategies rather than one optimum.', what_to_show: 'Readiness and Pareto set', expected_observation: 'An explainable verdict and visible trade-offs' }
      ],
      prerequisites: [
        'Retail and Grocery domain active'
      ],
      warnings: [
        'The registry understates this capability: it names only CDI-01 while eight work packages are complete.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'How is this different from our promo tool?', audience: 'exec', difficulty: 'high' },
    { question: 'Can we save and compare scenarios?', audience: 'marketing_strategist', difficulty: 'low' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'likely', rationale: 'Campaign decision structure is not grocery-specific.' },
    { domain_id: 'fashion_apparel', applicability: 'likely', rationale: 'Seasonal campaign decisions share the same shape.' }
  ],
  related_capabilities: [
    { ref: 'CAP-COUNTERFACTUAL-BASELINE', relation: 'depends-on' },
    { ref: 'CAP-DECISION-CONTRACT', relation: 'depends-on' },
    { ref: 'CAP-DECISION-READINESS', relation: 'depends-on' },
    { ref: 'CAP-DECISION-TIMELINE', relation: 'depends-on' },
    { ref: 'CAP-OPPORTUNITY-WINDOW', relation: 'depends-on' },
    { ref: 'CAP-OUTCOME-FRONTIER', relation: 'depends-on' },
    { ref: 'CAP-PROMOTION-INTELLIGENCE', relation: 'enables' }
  ],
  related_decisions: [
    'ADR-044'
  ],
  related_governance: [
    'docs/governance/MASTER_PLAN.md'
  ],
});
