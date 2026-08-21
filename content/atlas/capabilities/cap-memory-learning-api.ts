/**
 * Capability knowledge — CAP-MEMORY-LEARNING-API.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-MEMORY-LEARNING-API',
  description:
    'The extracted service boundary for enterprise memory and learning patterns, giving every surface one governed way to store and retrieve organisational learning instead of each holding its own copy.',
  innovation_thesis:
    'Learning that lives in a component is learning that one screen has. Extracting the boundary is what makes it the organisation\'s.',
  usage_instructions:
    'Call the memory and learning-pattern endpoints. A remote learning service is used when configured; otherwise the in-process repository serves the same contract.',
  testing_instructions:
    'Run npx tsx tests/unit/run-wp10d-tests.ts (15 test cases).',
  architecture_narrative:
    'Routes prefer a configured learning service and fall back to the in-process repository, so the contract is stable whether or not the service is deployed.',
  architecture_flow: [
    'Surface request',
    'Learning service if configured',
    'In-process repository fallback',
    'Contracted response'
  ],
  apis: [
    { method: 'GET', path: '/api/v1/memory', purpose: 'List memories' },
    { method: 'GET', path: '/api/v1/learning-patterns', purpose: 'List patterns' },
    { method: 'POST', path: '/api/v1/learning-patterns/match', purpose: 'Match a situation to patterns' }
  ],
  contracts: [
    { name: 'EnterpriseMemory', path: 'packages/contracts/src/memory-model.ts', direction: 'out' },
    { name: 'EnterpriseLearningPattern', path: 'packages/contracts/src/learning-pattern-model.ts', direction: 'out' }
  ],
  implementation_references: [
    { path: 'services/learning/src/memory-store.ts', note: 'Memory store' },
    { path: 'services/learning/src/learning-pattern-store.ts', note: 'Pattern store' },
    { path: 'app/api/v1/learning-patterns/route.ts', note: 'API' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-wp10d-tests.ts', outcome: '15 test cases across memory and pattern retrieval.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_WP10_D_MEMORY_LEARNING_REPORT.md', outcome: 'WP10-D completion report.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-wp10d-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Stores are in-memory and not durable.', severity: 'high' },
    { limitation: 'Tenant isolation exists in the contract but is not enforced at the store level.', severity: 'medium' }
  ],
  use_cases: [
    { title: 'Giving every surface one learning boundary', context: 'Each surface holds its own learning.', outcome: 'One contract, one store, one retrieval path.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'One learning boundary',
      audience: 'enterprise_architect',
      duration_mins: 3,
      steps: [
        { action: 'Query patterns and memories', what_to_say: 'Same contract whether the service is deployed or not.', what_to_show: 'The contracted response', expected_observation: 'Identical shape either way' }
      ],
      prerequisites: [],
      warnings: [
        'Stores are in-memory and not durable.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Is this a real service?', audience: 'enterprise_architect', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'professional_services', applicability: 'likely', rationale: 'A learning API boundary is industry-neutral.' },
    { domain_id: 'banking_finance', applicability: 'hypothetical', rationale: 'Plausible; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-ENTERPRISE-MEMORY', relation: 'enables' },
    { ref: 'CAP-JOURNEY-TELEMETRY', relation: 'complements' },
    { ref: 'CAP-LEARNING-PATTERN-REGISTRY', relation: 'enables' }
  ],
  related_governance: [
    'docs/governance/ORGANISATIONAL_LEARNING_INTELLIGENCE.md'
  ],
});
