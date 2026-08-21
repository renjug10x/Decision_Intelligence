/**
 * Capability knowledge — CAP-DECISION-CONTRACT.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-DECISION-CONTRACT',
  description:
    'An immutable contract binding the exact evidential basis of a decision by reference, digest and verbatim snapshot, with explicit assumptions and reconsideration triggers, plus a validity assessment describing whether that basis still holds.',
  innovation_thesis:
    'A decision that cannot say what it rested on cannot be reviewed, only re-argued. Binding the basis by digest makes the review possible and makes silent drift detectable.',
  usage_instructions:
    'Register a decision contract from the canvas. Query its validity as signals evolve. Withdraw it when the basis no longer holds.',
  testing_instructions:
    'Run npx tsx tests/unit/run-cdi07a-tests.ts. Note this runner exits non-zero for a pre-existing environment reason unrelated to the capability; 154 of its 155 assertions pass and the failure is a missing tsx dependency in a spawned child process.',
  architecture_narrative:
    'The contract binds inputs by reference and digest and stores a verbatim snapshot. Decision Half-Life reports validity states rather than a duration, because the estate holds no calibrated evidence about how evidence decays.',
  architecture_flow: [
    'Decision basis bound by reference and digest',
    'Verbatim snapshot',
    'Declared assumptions and reconsideration triggers',
    'Validity assessment against evolving signals'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/campaigns/decision-contract', purpose: 'Create a contract' },
    { method: 'GET', path: '/api/v1/campaigns/decision-contract/[id]/validity', purpose: 'Validity assessment' },
    { method: 'POST', path: '/api/v1/campaigns/decision-contract/[id]/withdraw', purpose: 'Withdraw a contract' }
  ],
  contracts: [
    { name: 'DecisionContract', path: 'packages/contracts/src/campaign-decision-contract-model.ts', direction: 'out' }
  ],
  implementation_references: [
    { path: 'lib/campaign-decision-contract-engine.ts', note: 'Engine' },
    { path: 'lib/decision-contract-store.ts', note: 'Store' },
    { path: 'packages/contracts/src/campaign-decision-contract-model.ts', note: 'Contract' },
    { path: 'app/api/v1/campaigns/decision-contract/route.ts', note: 'API' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-cdi07a-tests.ts', outcome: '154 of 155 assertions pass; the single failure is an environment issue in a spawned child process, identical on the untouched baseline.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_CDI_07A_DECISION_CONTRACT_REPORT.md', outcome: 'Completion report.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-cdi07a-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Decision Half-Life publishes validity states and refuses any duration, countdown, expiry estimate or decay curve. Owner ruling W2.', severity: 'high' },
    { limitation: 'Half-Life validity must never share an indicator with the DDF-01 Decision Window; they measure different things (ADR-042).', severity: 'high' },
    { limitation: 'The runner exits non-zero for a pre-existing missing tsx dependency, not a capability defect.', severity: 'medium' }
  ],
  use_cases: [
    { title: 'Reviewing a decision months later', context: 'Nobody can reconstruct what the decision rested on.', outcome: 'The bound basis, its digest and its assumptions are recoverable exactly.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'What did this decision rest on?',
      audience: 'cdao',
      duration_mins: 3,
      steps: [
        { action: 'Open a registered contract', what_to_say: 'Every input is bound by digest. This is what makes a later review possible.', what_to_show: 'The bound basis and assumptions', expected_observation: 'Referenced inputs with digests' },
        { action: 'Query validity', what_to_say: 'It reports whether the basis still holds. It does not report a countdown.', what_to_show: 'Validity state', expected_observation: 'A state, never a timer' }
      ],
      prerequisites: [],
      warnings: [
        'Half-Life has no duration by ruling. Do not narrate time remaining.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'How long is a decision valid for?', audience: 'decision_scientist', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'banking_finance', applicability: 'likely', rationale: 'Decision auditability is a general governance requirement.' },
    { domain_id: 'public_sector', applicability: 'hypothetical', rationale: 'Plausible for regulated decisions; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-CAMPAIGN-DECISION', relation: 'enables' },
    { ref: 'CAP-CONTRACT-VERIFICATION', relation: 'enables' },
    { ref: 'CAP-OBSERVATION-CORRESPONDENCE', relation: 'depends-on' }
  ],
  related_decisions: [
    'ADR-042'
  ],
  related_governance: [
    'docs/governance/MASTER_PLAN.md'
  ],
});
