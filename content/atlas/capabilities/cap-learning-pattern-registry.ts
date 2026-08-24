/**
 * Capability knowledge — CAP-LEARNING-PATTERN-REGISTRY.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-LEARNING-PATTERN-REGISTRY',
  description:
    'The canonical store of recognised enterprise learning patterns, each carrying a situation signature and observed signals, matched against a live situation so a recurring shape is recognised rather than rediscovered.',
  innovation_thesis:
    'Organisations rediscover the same six situations indefinitely. Naming them and matching against them is the cheapest possible form of institutional memory.',
  usage_instructions:
    'Query the pattern registry, or post a situation to the match endpoint to retrieve patterns whose signature fits.',
  testing_instructions:
    'Run npx tsx tests/unit/run-wp10d-tests.ts. One assertion specifically verifies that seeded telemetry is not stated as an observed finding.',
  field_status: [
    { field: 'memory_count', implementation_status: 'simulated', note: 'Seeded demonstration constant per the Y4-gov correction.' }
  ],
  architecture_narrative:
    'Six canonical patterns are held in the learning service store and served through the learning-pattern API. A separate config/patterns.ts file is a superseded duplicate and is deliberately not consumed by the UI.',
  architecture_flow: [
    'Situation signature',
    'Match against canonical patterns',
    'Ranked pattern candidates',
    'Related memories'
  ],
  apis: [
    { method: 'GET', path: '/api/v1/learning-patterns', purpose: 'List patterns' },
    { method: 'POST', path: '/api/v1/learning-patterns/match', purpose: 'Match a situation' }
  ],
  contracts: [
    { name: 'EnterpriseLearningPattern', path: 'packages/contracts/src/learning-pattern-model.ts', direction: 'out' }
  ],
  data_sources: [
    { name: 'Learning pattern store, tenant-isolated and in-memory', kind: 'synthetic', path: 'services/learning/src/learning-pattern-store.ts' }
  ],
  implementation_references: [
    { path: 'services/learning/src/learning-pattern-store.ts', symbol: 'CANONICAL_LEARNING_PATTERNS', note: 'Canonical store, six entries' },
    { path: 'packages/contracts/src/learning-pattern-model.ts', note: 'Contract' },
    { path: 'app/api/v1/learning-patterns/match/route.ts', note: 'Match API' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-wp10d-tests.ts', outcome: 'Includes the Y4-gov honest-wording assertion on PAT-COMM-01.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_WP10_D_MEMORY_LEARNING_REPORT.md', outcome: 'WP10-D completion report.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-wp10d-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Pattern telemetry values are uncalibrated demonstration constants under the Y4-gov ruling, not observed findings.', severity: 'high' },
    { limitation: 'PAT-BEH-05 and PAT-INT-05 share a numeric suffix. Any matching that keys on the suffix rather than the full identifier conflates two distinct patterns; recorded as ATL-01 gap G6.', severity: 'high' },
    { limitation: 'config/patterns.ts is a superseded duplicate of this registry and is not the authority.', severity: 'medium' }
  ],
  use_cases: [
    { title: 'Recognising a situation the organisation has met before', context: 'A recurring situation is analysed from scratch each time.', outcome: 'The matching pattern and its prior outcome are surfaced.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'We have seen this shape before',
      audience: 'decision_scientist',
      duration_mins: 3,
      steps: [
        { action: 'Post a situation to the match endpoint', what_to_say: 'The pattern is recognised by signature, not by keyword.', what_to_show: 'Ranked pattern candidates', expected_observation: 'A matched signature with its prior outcome' }
      ],
      prerequisites: [],
      warnings: [
        'Pattern telemetry figures are seeded demonstration constants, not observed findings.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'How many patterns are there really?', audience: 'cdao', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'manufacturing', applicability: 'likely', rationale: 'Situation-signature matching is industry-neutral.' },
    { domain_id: 'banking_finance', applicability: 'hypothetical', rationale: 'Plausible for incident recognition; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-ENTERPRISE-MEMORY', relation: 'enables' },
    { ref: 'CAP-MEMORY-LEARNING-API', relation: 'depends-on' }
  ],
  related_governance: [
    'docs/governance/ORGANISATIONAL_LEARNING_INTELLIGENCE.md'
  ],
});
