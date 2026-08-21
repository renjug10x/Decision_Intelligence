/**
 * Capability knowledge — CAP-DECISION-READINESS.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-DECISION-READINESS',
  description:
    'A six-dimension evaluation producing an explainable readiness verdict: GO, CONDITIONAL GO, REVIEW or DO NOT PROCEED, integrating pre-mortem resilience with Decision Ripple rather than standing up a parallel risk engine.',
  innovation_thesis:
    'A confidence percentage is not a decision aid. A verdict with named failing dimensions tells someone what to fix.',
  usage_instructions:
    'Open the readiness lens on the campaign canvas. Each dimension reports its own state and the verdict explains which dimensions drove it.',
  testing_instructions:
    'Run npx tsx tests/unit/run-cdi04-tests.ts (49 assertions).',
  architecture_narrative:
    'Six dimensions are evaluated independently and combined into a verdict; the verdict never hides which dimension caused it.',
  architecture_flow: [
    'Six dimension evaluations',
    'Resilience evidence from ripple',
    'Combined verdict',
    'Named driving dimensions'
  ],
  apis: [
    { method: 'GET', path: '/api/v1/campaigns/readiness', purpose: 'Readiness evaluation' }
  ],
  contracts: [
    { name: 'CampaignReadiness', path: 'packages/contracts/src/campaign-readiness-model.ts', direction: 'out' }
  ],
  implementation_references: [
    { path: 'lib/campaign-readiness-engine.ts', note: 'Engine' },
    { path: 'packages/contracts/src/campaign-readiness-model.ts', note: 'Contract' },
    { path: 'app/api/v1/campaigns/readiness/route.ts', note: 'API' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-cdi04-tests.ts', outcome: '49 assertions on dimension evaluation and verdict derivation.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_CDI_04_DECISION_READINESS_REPORT.md', outcome: 'Completion report.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_CDI_04_DECISION_READINESS_DESIGN_GATE.md', outcome: 'Frozen design gate.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-cdi04-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Readiness evidence is drawn from the synthetic world and declared scenario inputs.', severity: 'high' },
    { limitation: 'Readiness gates an option as not currently actionable; it does not itself recommend. Presenting it as a recommendation engine misstates it.', severity: 'medium' }
  ],
  use_cases: [
    { title: 'Knowing what to fix before proceeding', context: 'A campaign is ready except for something nobody has named.', outcome: 'The verdict names the dimensions that drove it.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'A verdict with reasons',
      audience: 'exec',
      duration_mins: 3,
      steps: [
        { action: 'Open readiness', what_to_say: 'This is not a confidence score. It is a verdict, and it says what drove it.', what_to_show: 'Six dimensions and the verdict', expected_observation: 'Named dimensions, not a percentage' }
      ],
      prerequisites: [],
      warnings: [
        'Readiness evidence is synthetic. It gates options; it does not recommend them.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'What makes it say do not proceed?', audience: 'coo', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'manufacturing', applicability: 'likely', rationale: 'Multi-dimension readiness gating is a general governance pattern.' },
    { domain_id: 'banking_finance', applicability: 'hypothetical', rationale: 'Plausible for credit and launch decisions; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-CAMPAIGN-DECISION', relation: 'enables' },
    { ref: 'CAP-DECISION-RIPPLE', relation: 'depends-on' }
  ],
  related_governance: [
    'docs/governance/MASTER_PLAN.md'
  ],
});
