/**
 * Capability knowledge — CAP-LEARNING-LOOP.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-LEARNING-LOOP',
  description:
    'Three separately bound artefacts: a pre-mortem enumerating failure modes from declared evidence, a prediction-versus-outcome comparison reported only on like-for-like matches, and learning candidates that are retained but never self-promote.',
  innovation_thesis:
    'A learning loop that promotes its own patterns will learn its own simulator. Requiring human promotion is what keeps the loop honest.',
  usage_instructions:
    'Generate a pre-mortem before acting. After an outcome is admitted, request the prediction comparison. Eligible learning candidates are retained for human review.',
  testing_instructions:
    'Run npx tsx tests/unit/run-cdi07b-tests.ts. 228 of 235 assertions pass; the seven failures are a pre-existing missing tsx dependency in spawned child processes, identical on the untouched baseline.',
  field_status: [
    { field: 'learning_eligibility_N', implementation_status: 'simulated', note: 'N equals three is an uncalibrated demonstration policy pending the Y4-cal calibration work package.' }
  ],
  architecture_narrative:
    'Each artefact binds to a decision contract by id and digest and none mutates it. Prediction error is reported only on like-for-like grain and basis matches; attributable versus gross comparison is refused.',
  architecture_flow: [
    'Pre-mortem failure modes from declared evidence',
    'Outcome admitted through correspondence',
    'Like-for-like comparison, or refusal',
    'Learning candidate retained for human promotion'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/campaigns/decision-contract/[id]/pre-mortem', purpose: 'Generate a pre-mortem' },
    { method: 'GET', path: '/api/v1/campaigns/decision-contract/[id]/prediction-comparison', purpose: 'Prediction versus outcome' },
    { method: 'GET', path: '/api/v1/campaigns/learning-candidates', purpose: 'Retained learning candidates' }
  ],
  contracts: [
    { name: 'CampaignPreMortem', path: 'packages/contracts/src/campaign-learning-loop-model.ts', direction: 'out' }
  ],
  implementation_references: [
    { path: 'lib/campaign-learning-loop-engine.ts', note: 'Engine' },
    { path: 'lib/pre-mortem-store.ts', note: 'Pre-mortem store' },
    { path: 'lib/learning-candidate-store.ts', note: 'Candidate store' },
    { path: 'packages/contracts/src/campaign-learning-loop-model.ts', note: 'Contract' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-cdi07b-tests.ts', outcome: '228 of 235 assertions pass; seven failures are the pre-existing tsx environment issue.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_CDI_07B_LEARNING_LOOP_REPORT.md', outcome: 'Completion report.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-cdi07b-tests.ts'
  ],
  acceptance_criteria_refs: [
    'AC-20'
  ],
  known_limitations: [
    { limitation: 'No SUCCESS or FAILURE verdict is issued. Prediction error describes model divergence, never whether the decision was good.', severity: 'high' },
    { limitation: 'Pre-mortem failure modes carry no likelihood, probability or impact scoring.', severity: 'medium' },
    { limitation: 'Learning eligibility is an eight-condition conjunction and no candidate is promoted automatically. The N greater than one policy is an uncalibrated demonstration setting.', severity: 'high' }
  ],
  use_cases: [
    { title: 'Closing the loop without fooling yourself', context: 'An outcome arrives and the temptation is to score the decision.', outcome: 'Comparison is reported only where it is like-for-like, and no verdict is issued.' }
  ],
  demo_scenarios: [
    {
      path_type: 'ten-minute',
      title: 'Learning without marking your own homework',
      audience: 'decision_scientist',
      duration_mins: 10,
      steps: [
        { action: 'Generate a pre-mortem', what_to_say: 'Failure modes come from declared evidence, with no invented probabilities.', what_to_show: 'The failure mode list', expected_observation: 'Named modes, no scores' },
        { action: 'Request the comparison', what_to_say: 'It reports error only where the grain matches. Otherwise it refuses.', what_to_show: 'Comparison or refusal', expected_observation: 'A refusal is a first-class outcome' }
      ],
      prerequisites: [],
      warnings: [
        'No candidate is promoted automatically. The N equals three threshold is an uncalibrated demonstration policy.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Does it learn on its own?', audience: 'cdao', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'manufacturing', applicability: 'likely', rationale: 'Prediction-versus-outcome discipline is domain-neutral.' },
    { domain_id: 'banking_finance', applicability: 'hypothetical', rationale: 'Plausible for model governance; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-COUNTERFACTUAL-BASELINE', relation: 'depends-on' },
    { ref: 'CAP-ENTERPRISE-MEMORY', relation: 'enables' }
  ],
  related_governance: [
    'docs/governance/ORGANISATIONAL_LEARNING_INTELLIGENCE.md'
  ],
});
