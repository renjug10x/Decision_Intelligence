/**
 * Capability knowledge — CAP-JOURNEY-TELEMETRY.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-JOURNEY-TELEMETRY',
  description:
    'Records what a user actually did across a decision journey, so demonstrations and learning rest on observed interaction rather than on recollection after the meeting.',
  innovation_thesis:
    'Post-demo learning capture depends on remembering what happened. Recording the journey removes the remembering.',
  usage_instructions:
    'Journey events are emitted by surfaces as a user works. Query the events endpoint, or the Help shell telemetry tab, to review a session.',
  testing_instructions:
    'Run npx tsx tests/unit/run-journey-tests.ts.',
  architecture_narrative:
    'A client emits typed journey events to a store behind an extracted API, with per-session retrieval.',
  architecture_flow: [
    'Surface interaction',
    'Typed journey event',
    'Store',
    'Session retrieval'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/journey/events', purpose: 'Emit a journey event' },
    { method: 'GET', path: '/api/v1/journey/sessions/[id]', purpose: 'Retrieve a session' }
  ],
  contracts: [
    { name: 'JourneyEvent', path: 'packages/contracts/src/journey-model.ts', direction: 'in' }
  ],
  data_sources: [
    { name: 'Journey events emitted by the running application into a bounded in-memory buffer', kind: 'live', path: 'lib/journey-store.ts' }
  ],
  implementation_references: [
    { path: 'lib/journey-store.ts', note: 'Store' },
    { path: 'lib/journey-client.ts', note: 'Client' },
    { path: 'packages/contracts/src/journey-model.ts', note: 'Contract' },
    { path: 'app/api/v1/journey/events/route.ts', note: 'API' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-journey-tests.ts', outcome: 'Journey event assertions.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_WP10_B_JOURNEY_TELEMETRY_REPORT.md', outcome: 'WP10-B completion report.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-journey-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Telemetry is in-memory per instance and is not durable.', severity: 'high' },
    { limitation: 'Coverage depends on each surface emitting events; emission is not enforced centrally.', severity: 'medium' }
  ],
  use_cases: [
    { title: 'Reviewing what actually happened in a demonstration', context: 'Learning capture depends on memory.', outcome: 'The journey is recorded as it happens.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'What actually happened',
      audience: 'cdao',
      duration_mins: 3,
      steps: [
        { action: 'Open the telemetry tab after working a journey', what_to_say: 'This is observed interaction, not a recollection.', what_to_show: 'The recorded session', expected_observation: 'Actual events in order' }
      ],
      prerequisites: [],
      warnings: [
        'Telemetry is in-memory and not durable across restarts.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Is this stored anywhere?', audience: 'cdao', difficulty: 'low' }
  ],
  cross_domain_applicability: [
    { domain_id: 'professional_services', applicability: 'likely', rationale: 'Journey telemetry is application-level and industry-neutral.' },
    { domain_id: 'it_services', applicability: 'hypothetical', rationale: 'Plausible; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-MEMORY-LEARNING-API', relation: 'complements' }
  ],
  related_governance: [
    'docs/governance/JOURNEY_TELEMETRY_MODEL.md'
  ],
});
