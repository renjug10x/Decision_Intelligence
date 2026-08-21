/**
 * Capability knowledge — CAP-DECISION-LIFECYCLE-VIEW.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-DECISION-LIFECYCLE-VIEW',
  description:
    'A static stage-by-stage account of how a recommendation is produced, from signal detection through scope enforcement and reasoning to governed write-back.',
  innovation_thesis:
    'Trust in a recommendation depends on being able to see the path that produced it. Narrating the path is the minimum; binding it to the running path is the goal.',
  usage_instructions:
    'Open the Decision Lifecycle tab in the Help shell.',
  testing_instructions:
    'No runner exists; the surface is static.',
  field_status: [
    { field: 'stages', implementation_status: 'simulated', note: 'Static content; not instrumented against the running path.' }
  ],
  architecture_narrative:
    'A static stage list rendered in the Help shell. It describes the lifecycle rather than instrumenting it.',
  architecture_flow: [
    'Signal detection',
    'Scope enforcement',
    'Governed query',
    'Reasoning',
    'Confidence and human review',
    'Governed write-back'
  ],
  implementation_references: [
    { path: 'components/Help.tsx', note: 'Lifecycle tab' }
  ],
  validation_evidence: [
    { kind: 'code', ref: 'components/Help.tsx', outcome: 'Static six-stage lifecycle description.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md', outcome: 'Recorded as E-05.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  known_limitations: [
    { limitation: 'The stage list is static and is not bound to the running decision path. It describes an intended lifecycle rather than an observed one.', severity: 'high' },
    { limitation: 'Some stages describe a legacy stack rather than the current CogniX estate.', severity: 'high' }
  ],
  use_cases: [
    { title: 'Explaining how a recommendation is produced', context: 'A stakeholder asks how the system reaches its answers.', outcome: 'The stages are laid out in order.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'How a recommendation is produced',
      audience: 'cdao',
      duration_mins: 3,
      steps: [
        { action: 'Open the lifecycle tab', what_to_say: 'This is the intended path. Where it matters, the governed contracts behind it are inspectable separately.', what_to_show: 'The six stages', expected_observation: 'An ordered narrative' }
      ],
      prerequisites: [],
      warnings: [
        'MANDATORY: this is a static description, not an instrumented view. Parts of it describe a legacy stack.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Does it really work this way today?', audience: 'cdao', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'it_services', applicability: 'not-assessed', rationale: 'Static explainer; no reuse assessment performed.' }
  ],
  related_governance: [
    'docs/governance/COGNIX_PRINCIPLES.md'
  ],
});
