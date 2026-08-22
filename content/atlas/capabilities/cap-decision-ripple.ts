/**
 * Capability knowledge — CAP-DECISION-RIPPLE.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-DECISION-RIPPLE',
  description:
    'Decision Ripple Intelligence propagates a commercial decision through second- and third-order consequences in adjacent functions, so an increase in promotional spend shows its distribution-centre labour and net-margin effects.',
  innovation_thesis:
    'Decisions are made in one function and paid for in another. A platform that models only the first order is describing half the decision.',
  usage_instructions:
    'Open this capability in the Capability Atlas and follow the experiment named under \u201cWhere it comes from\u201d. Adjust the decision magnitude and follow the consequence orders outward.',
  testing_instructions:
    'Exercised through the campaign decision journey suite.',
  field_status: [
    { field: 'consequence_magnitude', implementation_status: 'simulated', note: 'Modelled from scenario parameters; not measured.' }
  ],
  architecture_narrative:
    'The decision engine propagates a change across ordered consequence layers, each naming the function affected and the direction of effect.',
  architecture_flow: [
    'Decision magnitude',
    'First-order effect',
    'Second-order effect in adjacent function',
    'Third-order margin consequence'
  ],
  implementation_references: [
    { path: 'components/DecisionRippleIntelligence.tsx', note: 'Surface' },
    { path: 'lib/decision-engine.ts', note: 'Propagation engine' },
    { path: 'config/experiments.ts', note: 'EXP-RIPPLE-02 registry entry' }
  ],
  validation_evidence: [
    { kind: 'code', ref: 'components/DecisionRippleIntelligence.tsx', outcome: '366-line surface bound to the decision engine.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'code', ref: 'services/learning/src/learning-pattern-store.ts', outcome: 'PAT-RIPPLE-04 records the ripple pattern in the canonical pattern store.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-campaign-decision-journey-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Consequence magnitudes are modelled from scenario parameters and are uncalibrated.', severity: 'high' },
    { limitation: 'CDI-04 readiness integrates with ripple rather than duplicating it; ripple is not a risk engine and must not be presented as one.', severity: 'medium' }
  ],
  assumptions: [
    'Consequences are assumed to propagate outward through the declared layers without feeding back. A second-order effect that changes the magnitude of the first-order effect is not modelled, so the layers are read as a cascade rather than as a system.'
  ],
  use_cases: [
    { title: 'Pricing a decision beyond its own function', context: 'Marketing proposes a spend increase.', outcome: 'The distribution-centre and margin consequences are visible before approval.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'What happens everywhere else',
      audience: 'exec',
      duration_mins: 3,
      steps: [
        { action: 'Increase the decision magnitude', what_to_say: 'The first order is obvious. The second and third are where the cost lives.', what_to_show: 'The consequence chain', expected_observation: 'Named adjacent functions, not a generic risk score' }
      ],
      prerequisites: [],
      warnings: [
        'Consequence magnitudes are modelled and uncalibrated. Present the direction and the affected function, not the precise figure.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'How do you know the second-order effect?', audience: 'coo', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'manufacturing', applicability: 'likely', rationale: 'Cross-functional consequence propagation is general.' },
    { domain_id: 'banking_finance', applicability: 'hypothetical', rationale: 'Plausible for operational risk; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-COMMITMENT-INTELLIGENCE', relation: 'complements' },
    { ref: 'CAP-DECISION-READINESS', relation: 'enables' }
  ],
  related_governance: [
    'docs/governance/EXPERIMENT_MODEL.md'
  ],
  /**
   * The whole claim here is that a decision is made in one function and paid for in another, and
   * prose can only name the orders of consequence one at a time. The chain shows the distance
   * travelled — from the magnitude set in marketing to the margin consequence — in a single read.
   * Deliberately carries no magnitudes: those are modelled and uncalibrated, so what the visual
   * commits to is the function affected and the direction of effect, which is the defensible part.
   */
  visualisation: {
    kind: 'flow',
    concept: 'Orders of Consequence',
    nodes: [
      { label: 'Decision magnitude', detail: 'The commercial change being proposed', role: 'stage' },
      { label: 'First-order effect', detail: 'Felt in the function that made the decision', role: 'stage' },
      { label: 'Second-order effect', detail: 'An adjacent function, such as distribution-centre labour', role: 'stage' },
      { label: 'Third-order margin consequence', detail: 'Where the net-margin cost of the decision lands', role: 'stage' }
    ],
    description:
      'An ordered propagation outward: a decision magnitude produces a first-order effect in the function that decided, a second-order effect in an adjacent function such as distribution-centre labour, and a third-order consequence in net margin. Each layer names the function affected and the direction of effect, not a calibrated figure.'
  },
});
