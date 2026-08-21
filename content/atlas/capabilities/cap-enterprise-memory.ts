/**
 * Capability knowledge — CAP-ENTERPRISE-MEMORY.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-ENTERPRISE-MEMORY',
  description:
    'Enterprise Memory Foundation retains what the organisation learned from past operational anomalies, so that a recurring situation recalls its prior resolution and outcome rather than being re-analysed from scratch.',
  innovation_thesis:
    'Enterprise knowledge is volatile. The same anomaly is solved repeatedly by different people who never learn that it was solved before.',
  usage_instructions:
    'Open Enterprise Memory from the Innovation Portfolio. Search recorded memories, or reach them from a matched learning pattern.',
  testing_instructions:
    'Run npx tsx tests/unit/run-wp10d-tests.ts. Assertions cover memory storage, retrieval and the honest-wording check on seeded telemetry.',
  field_status: [
    { field: 'memory_counts', implementation_status: 'simulated', note: 'Seeded demonstration constants per the Y4-gov governance correction.' }
  ],
  architecture_narrative:
    'A memory store behind an extracted API, with learning patterns matched against a live situation to surface relevant prior memories.',
  architecture_flow: [
    'Situation signature',
    'Pattern match',
    'Related memories',
    'Prior resolution and outcome'
  ],
  apis: [
    { method: 'GET', path: '/api/v1/memory', purpose: 'List memories' },
    { method: 'POST', path: '/api/v1/memory/search', purpose: 'Search memories' },
    { method: 'GET', path: '/api/v1/learning-patterns/[id]/memories', purpose: 'Memories for a pattern' }
  ],
  contracts: [
    { name: 'EnterpriseMemory', path: 'packages/contracts/src/memory-model.ts', direction: 'out' }
  ],
  implementation_references: [
    { path: 'components/EnterpriseMemory.tsx', note: 'Surface' },
    { path: 'lib/memory-client.ts', note: 'Client' },
    { path: 'services/learning/src/memory-store.ts', note: 'Store' },
    { path: 'config/experiments.ts', note: 'EXP-MEMORY-03 registry entry' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-wp10d-tests.ts', outcome: 'Memory and learning API assertions including the Y4-gov honest-wording check.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_WP10_D_MEMORY_LEARNING_REPORT.md', outcome: 'WP10-D completion report.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-wp10d-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Seeded memory telemetry is classified as uncalibrated demonstration constants under the Y4-gov ruling, not as observed findings.', severity: 'high' },
    { limitation: 'The registry records this experiment as Concept while a store, an API and a test runner exist. ATL-01 raised this as gap G2; promotion is a human decision and has not been made.', severity: 'medium' }
  ],
  use_cases: [
    { title: 'Not solving the same problem twice', context: 'An anomaly recurs in a different region.', outcome: 'The prior resolution and its outcome are recalled with the situation.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Have we seen this before?',
      audience: 'exec',
      duration_mins: 3,
      steps: [
        { action: 'Open a matched pattern and follow it to memory', what_to_say: 'The organisation has met this before. Here is what was done and what happened.', what_to_show: 'Prior resolution and outcome', expected_observation: 'A recalled case, not a fresh analysis' }
      ],
      prerequisites: [],
      warnings: [
        'Memory telemetry figures are seeded demonstration constants, not observed findings.',
        'The registry lifecycle says Concept; the code says more. Report both rather than choosing one.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Where does the memory come from?', audience: 'cdao', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'banking_finance', applicability: 'likely', rationale: 'Institutional recall is industry-neutral.' },
    { domain_id: 'healthcare_lifesciences', applicability: 'hypothetical', rationale: 'Plausible for incident recall; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-LEARNING-LOOP', relation: 'depends-on' },
    { ref: 'CAP-LEARNING-PATTERN-REGISTRY', relation: 'depends-on' },
    { ref: 'CAP-MEMORY-LEARNING-API', relation: 'depends-on' },
    { ref: 'CAP-OPPORTUNITY-INTELLIGENCE', relation: 'complements' }
  ],
  related_governance: [
    'docs/governance/ORGANISATIONAL_LEARNING_INTELLIGENCE.md'
  ],
});
