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
  assumptions: [
    'Evidence identity is assumed to be stable enough to digest. Structural serialisation differences are handled — the digest is taken over a canonical form that sorts keys and drops undefined — but numeric and temporal identity are not normalised, so an input re-derived to a different floating-point representation or a timestamp regenerated at a different precision reads as a changed basis.',
    'Reconsideration triggers are assumed to be declarable in advance. The contract can only tell you the basis has moved along a dimension somebody named before the decision was taken.'
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

  /**
   * Three binding steps happen before anything is assessed, and seeing them in order explains why a
   * review months later is possible at all: validity is judged against a basis that cannot have
   * moved. The chain also shows where it stops — a state against evolving signals, never a
   * countdown, which is the boundary owner ruling W2 draws.
   */
  visualisation: {
    kind: 'flow',
    concept: 'Binding a Decision to Its Basis',
    nodes: [
      { label: 'Basis bound by digest', detail: 'Every input held by reference and digest', role: 'stage' },
      { label: 'Verbatim snapshot', detail: 'The basis kept exactly as it stood', role: 'stage' },
      { label: 'Assumptions and triggers', detail: 'Explicit conditions carried by the contract', role: 'stage' },
      { label: 'Validity assessment', detail: 'A state as signals evolve, never a countdown', role: 'stage' }
    ],
    description:
      'An ordered chain: the decision basis is bound by reference and digest, snapshotted verbatim, and its assumptions and reconsideration triggers are declared, before validity is assessed against evolving signals and reported as a state rather than a duration.'
  },
});
