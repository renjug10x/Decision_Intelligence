/**
 * Capability knowledge — CAP-SIGNAL-SIMULATION.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-SIGNAL-SIMULATION',
  description:
    'Evolves enterprise signals deterministically over time under the active scenario and selected interventions, so a demonstration shows a situation developing rather than a frozen snapshot.',
  innovation_thesis:
    'A static signal set cannot demonstrate a decision, because nothing changes while you deliberate. Deterministic evolution makes the pressure visible without making it random.',
  usage_instructions:
    'Advance the simulation from the signals endpoint and watch the stream evolve through its declared narrative sequence.',
  testing_instructions:
    'Run npx tsx tests/unit/run-esf2-tests.ts (19 assertions).',
  architecture_narrative:
    'A deterministic simulation engine evolves signals based on the active scenario, commercial intent, shared decision state and selected interventions.',
  architecture_flow: [
    'Active scenario',
    'Intent registered',
    'Engagement accelerates',
    'Slot pressure emerges',
    'Demand acceleration materialises'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/signals/simulate', purpose: 'Advance the simulation' }
  ],
  contracts: [
    { name: 'EnterpriseSignal', path: 'packages/contracts/src/enterprise-signal-model.ts', direction: 'out' }
  ],
  data_sources: [
    { name: 'Deterministic signal trajectory simulator (T-7 to T+30)', kind: 'synthetic', path: 'services/world/src/dynamic-signal-simulator.ts' }
  ],
  implementation_references: [
    { path: 'services/world/src/dynamic-signal-simulator.ts', note: 'Simulator' },
    { path: 'app/api/v1/signals/simulate/route.ts', note: 'API' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-esf2-tests.ts', outcome: '19 assertions on deterministic evolution.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_ESF_2_DYNAMIC_SIGNAL_SIMULATION_REPORT.md', outcome: 'Completion report.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-esf2-tests.ts'
  ],
  known_limitations: [
    { limitation: 'The simulation is deterministic and synthetic by design. It is a demonstration instrument, not a forecast of real conditions.', severity: 'high' }
  ],
  use_cases: [
    { title: 'Showing pressure building during a demonstration', context: 'A static snapshot cannot show why timing matters.', outcome: 'The stream evolves through a declared sequence while the audience watches.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Watch the pressure build',
      audience: 'decision_scientist',
      duration_mins: 3,
      steps: [
        { action: 'Advance the simulation', what_to_say: 'Nothing here is random. It is deterministic, which is why it repeats identically in every demonstration.', what_to_show: 'The evolving stream', expected_observation: 'The declared narrative sequence' }
      ],
      prerequisites: [],
      warnings: [
        'This is a demonstration instrument. It is not a forecast of real conditions.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Is this randomised?', audience: 'data_scientist', difficulty: 'low' }
  ],
  cross_domain_applicability: [
    { domain_id: 'logistics_distribution', applicability: 'likely', rationale: 'Scenario-driven signal evolution is domain-neutral.' },
    { domain_id: 'aviation_airports', applicability: 'hypothetical', rationale: 'Plausible for operational demonstrations; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-ENTERPRISE-SIGNAL', relation: 'depends-on' }
  ],
  related_governance: [
    'docs/governance/ENTERPRISE_SIGNAL_MODEL.md'
  ],
});
