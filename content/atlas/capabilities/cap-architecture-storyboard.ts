/**
 * Capability knowledge — CAP-ARCHITECTURE-STORYBOARD.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-ARCHITECTURE-STORYBOARD',
  description:
    'A twelve-slide static narrative explaining the platform architecture through persona journeys, an enterprise blueprint and a governance narrative. It is a retirement candidate under SB-GATE.',
  innovation_thesis:
    'Architecture explained once, well, is worth more than architecture documented everywhere. That was the storyboard\'s premise, and it holds even though this implementation is being superseded.',
  usage_instructions:
    'Open the Architecture Storyboard tab in the Help shell and step through the twelve slides.',
  testing_instructions:
    'No runner exists and none is warranted: the surface makes no engine or API call.',
  field_status: [
    { field: 'all_content', implementation_status: 'simulated', note: 'Every slide is a static literal; no engine or API call exists.' }
  ],
  architecture_narrative:
    'A static slide array rendered by a scaler component. There is no data binding of any kind.',
  architecture_flow: [
    'Static slide definitions',
    'Slide rendering',
    'Navigation'
  ],
  implementation_references: [
    { path: 'components/ArchitectureExplorer.tsx', symbol: 'SLIDES', note: 'Twelve static slides, zero fetch calls, zero engine imports' },
    { path: 'components/Help.tsx', note: 'Host shell' }
  ],
  validation_evidence: [
    { kind: 'code', ref: 'components/ArchitectureExplorer.tsx', outcome: '1,546 lines; ATL-01 confirmed zero fetch calls and zero engine imports.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_ATL_01_STORYBOARD_MIGRATION_ASSESSMENT.md', outcome: 'Dual-version audit and the SB-GATE checklist.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  known_limitations: [
    { limitation: 'The capability is entirely static. It narrates an architecture rather than reflecting one, so it cannot go out of date visibly when the estate changes.', severity: 'high' },
    { limitation: 'ATL-01 found it carries legacy-stack references that the CogniX estate no longer implements.', severity: 'high' },
    { limitation: 'It is a retirement candidate under ADR-051. SB-GATE is currently at one of six items. It must not be deleted until the gate passes.', severity: 'high' }
  ],
  use_cases: [
    { title: 'Explaining the platform without opening a deck', context: 'A stakeholder needs the architecture narrative.', outcome: 'Twelve slides carry it inside the product.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'The architecture narrative',
      audience: 'enterprise_architect',
      duration_mins: 3,
      steps: [
        { action: 'Step through the blueprint slides', what_to_say: 'This explains the architecture, but be aware it narrates rather than reflects it.', what_to_show: 'The enterprise blueprint', expected_observation: 'A static narrative' }
      ],
      prerequisites: [],
      warnings: [
        'MANDATORY: this surface is entirely static and carries legacy-stack references. It is a retirement candidate under SB-GATE; do not present it as a live view of the architecture.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Is this generated from the code?', audience: 'enterprise_architect', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'it_services', applicability: 'not-assessed', rationale: 'Retirement candidate; no reuse assessment performed.' }
  ],
  related_decisions: [
    'ADR-051'
  ],
  related_governance: [
    'docs/reports/COGNIX_ATL_01_STORYBOARD_MIGRATION_ASSESSMENT.md'
  ],
});
