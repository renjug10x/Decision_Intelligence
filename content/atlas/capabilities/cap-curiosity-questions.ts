/**
 * Capability knowledge — CAP-CURIOSITY-QUESTIONS.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-CURIOSITY-QUESTIONS',
  description:
    'Curiosity-led entry into the estate: provocative enterprise questions, each carrying why it is worth asking and quantified evidence, routing to the experiment or solution able to answer it.',
  innovation_thesis:
    'A capability catalogue answers a question the visitor has already formed. A good question forms the question for them, which is why curiosity is the primary UX rather than navigation.',
  usage_instructions:
    'Open Questions Worth Asking from the shell. Select a question to see why it is being asked, the evidence behind it, and the experiment or solution that answers it.',
  testing_instructions:
    'Run npx tsx tests/unit/run-atl02-tests.ts. Assertions G3 to G5 verify that all four question records survived the ADR-046 migration with their routing and evidence intact.',
  field_status: [
    { field: 'evidencePoints', implementation_status: 'simulated', note: 'Quantified evidence carried verbatim from the pre-migration content; not computed from a live engine.' }
  ],
  architecture_narrative:
    'Question records live in the Atlas content registry and the component renders them. Before ATL-02 they were literals inside the component, which made them unsearchable and unreferenceable.',
  architecture_flow: [
    'Curiosity question registry',
    'Selection',
    'Why it is being asked and its evidence',
    'Route to target experiment or solution'
  ],
  implementation_references: [
    { path: 'components/QuestionsWorthAsking.tsx', note: 'Renderer' },
    { path: 'content/atlas/curiosity-questions.ts', symbol: 'CURIOSITY_QUESTIONS', note: 'Content registry, ADR-046 migration target' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-atl02-tests.ts', outcome: 'Migration verified: four records, routing and evidence preserved, no content authored in the component.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_ATL_02_CAPABILITY_KNOWLEDGE_BACKEND_REPORT.md', outcome: 'ADR-046 migration recorded.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-atl02-tests.ts'
  ],
  acceptance_criteria_refs: [
    'AC-ATL-02-1',
    'AC-ATL-02-5'
  ],
  known_limitations: [
    { limitation: 'Four questions are registered. The set is illustrative rather than a complete map of the estate.', severity: 'medium' },
    { limitation: 'Evidence points on each question are demonstration figures carried from the original content, not live measurements.', severity: 'high' }
  ],
  use_cases: [
    { title: 'Starting from a question rather than a menu', context: 'A visitor does not know what to look for.', outcome: 'A provocative question routes them to the capability that answers it.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Start with a better question',
      audience: 'exec',
      duration_mins: 3,
      steps: [
        { action: 'Open Questions Worth Asking and select one', what_to_say: 'We do not open with a feature list. We open with a question worth asking.', what_to_show: 'The question, its rationale and its evidence', expected_observation: 'A routed handoff to the answering capability' }
      ],
      prerequisites: [],
      warnings: [
        'Evidence figures on each question are demonstration values, not live measurements.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Where do these numbers come from?', audience: 'exec', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'banking_finance', applicability: 'likely', rationale: 'Curiosity-led entry is independent of industry.' },
    { domain_id: 'healthcare_lifesciences', applicability: 'hypothetical', rationale: 'Plausible; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-INNOVATION-PORTFOLIO', relation: 'complements' }
  ],
  related_governance: [
    'docs/governance/COGNIX_PRINCIPLES.md'
  ],
});
