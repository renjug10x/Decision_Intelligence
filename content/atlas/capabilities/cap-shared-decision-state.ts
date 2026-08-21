/**
 * Capability knowledge — CAP-SHARED-DECISION-STATE.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-SHARED-DECISION-STATE',
  description:
    'One decision state shared across every CogniX surface, so a scenario changed in one place is the same decision everywhere else, with derived impacts computed once and read rather than recomputed per surface.',
  innovation_thesis:
    'Surfaces that each hold their own copy of the scenario will disagree, and the disagreement will surface in front of a client. One state, read-only downstream, is the cheapest way to make that impossible.',
  usage_instructions:
    'Change a scenario parameter on any surface. Every other surface reflects it. Reset returns the state to its declared starting point.',
  testing_instructions:
    'Run npx tsx tests/unit/run-decision-state-tests.ts. Assertions cover transition, history and reset semantics.',
  architecture_narrative:
    'A store holds the canonical scenario parameters and derived impacts. Consumers read derived impacts; they do not recompute them, which is what prevents a fourth capacity number appearing in a fifth surface.',
  architecture_flow: [
    'Scenario parameters declared',
    'Derived impacts computed once',
    'Surfaces read state',
    'Transition recorded in history',
    'Reset to declared start'
  ],
  apis: [
    { method: 'GET', path: '/api/v1/decision-state/current', purpose: 'Read the current decision state' },
    { method: 'POST', path: '/api/v1/decision-state', purpose: 'Transition the decision state' },
    { method: 'GET', path: '/api/v1/decision-state/[id]/history', purpose: 'Read transition history' }
  ],
  contracts: [
    { name: 'DecisionScenarioParameters', path: 'packages/contracts/src/decision-state-model.ts', direction: 'out' },
    { name: 'DecisionDerivedImpacts', path: 'packages/contracts/src/decision-state-model.ts', direction: 'out' }
  ],
  implementation_references: [
    { path: 'lib/decision-state-store.ts', note: 'Store' },
    { path: 'context/DecisionStateContext.tsx', note: 'React context binding' },
    { path: 'packages/contracts/src/decision-state-model.ts', note: 'Contract' },
    { path: 'app/api/v1/decision-state/route.ts', note: 'API' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-decision-state-tests.ts', outcome: 'Transition, history and reset semantics asserted.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_WP10_C_SHARED_DECISION_STATE_REPORT.md', outcome: 'Completion report for WP10-C.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-decision-state-tests.ts'
  ],
  known_limitations: [
    { limitation: 'State is in-memory per server instance. It is not durable across restarts and is not multi-tenant isolated at the store level.', severity: 'high' }
  ],
  use_cases: [
    { title: 'Keeping surfaces honest with each other', context: 'A scenario is changed on the campaign canvas and the demand surface must not disagree.', outcome: 'Both read one state, so they cannot diverge.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'One decision, every surface',
      audience: 'enterprise_architect',
      duration_mins: 3,
      steps: [
        { action: 'Change a parameter on one surface, then open another', what_to_say: 'There is one decision state. Nothing here is recomputed twice.', what_to_show: 'The same values on both surfaces', expected_observation: 'Identical figures, no drift' }
      ],
      prerequisites: [],
      warnings: [
        'State is in-memory and per-instance. Do not present it as durable persistence.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Does this persist?', audience: 'enterprise_architect', difficulty: 'low' }
  ],
  cross_domain_applicability: [
    { domain_id: 'banking_finance', applicability: 'likely', rationale: 'Shared decision context is domain-neutral.' },
    { domain_id: 'manufacturing', applicability: 'likely', rationale: 'Same pattern applies to any multi-surface planning estate.' }
  ],
  related_capabilities: [
    { ref: 'CAP-DECISION-GAP', relation: 'enables' },
    { ref: 'CAP-INTENT-FUSION', relation: 'complements' }
  ],
  related_governance: [
    'docs/governance/SHARED_DECISION_STATE_MODEL.md'
  ],
});
