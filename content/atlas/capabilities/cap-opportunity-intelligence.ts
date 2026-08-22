/**
 * Capability knowledge — CAP-OPPORTUNITY-INTELLIGENCE.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-OPPORTUNITY-INTELLIGENCE',
  description:
    'Opportunity Intelligence looks for hidden upside created by favourable variance, rather than monitoring only risk alerts and negative variance as legacy enterprise monitoring does.',
  innovation_thesis:
    'Monitoring is built to catch things going wrong. Nothing in the estate is built to catch things going unexpectedly right, which is where unclaimed margin sits.',
  usage_instructions:
    'Open this capability in the Capability Atlas and follow the experiment named under \u201cWhere it comes from\u201d, then review surfaced opportunities and their routing to a demonstration solution.',
  testing_instructions:
    'No dedicated runner exists. This is a recorded coverage gap.',
  field_status: [
    { field: 'opportunities', implementation_status: 'simulated', note: 'In-component data; no detection engine exists.' }
  ],
  architecture_narrative:
    'A surface over in-component opportunity data with routing handoffs to solutions and experiments. No engine or API call is made.',
  architecture_flow: [
    'Favourable variance detected',
    'Opportunity framed',
    'Routing to the answering capability'
  ],
  implementation_references: [
    { path: 'components/OpportunityIntelligence.tsx', note: 'Surface' },
    { path: 'config/experiments.ts', note: 'EXP-OPPORTUNITY-04 registry entry' }
  ],
  validation_evidence: [
    { kind: 'code', ref: 'components/OpportunityIntelligence.tsx', outcome: '318-line surface with no engine or API import; data is in-component.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md', outcome: 'Implementation status recorded as simulated in section 4.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  known_limitations: [
    { limitation: 'The capability is simulated. No engine or API call is made and the opportunities are in-component data.', severity: 'high' },
    { limitation: 'No dedicated test runner covers it.', severity: 'medium' }
  ],
  use_cases: [
    { title: 'Catching upside that monitoring ignores', context: 'Supply conditions improve unexpectedly and nobody claims the margin.', outcome: 'The favourable variance is surfaced as an opportunity rather than passing unnoticed.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'The alerts nobody builds',
      audience: 'exec',
      duration_mins: 3,
      steps: [
        { action: 'Open Opportunity Intelligence', what_to_say: 'Every monitoring stack catches downside. This one asks what went unexpectedly right.', what_to_show: 'The opportunity list', expected_observation: 'Framed upside, not a risk register' }
      ],
      prerequisites: [],
      warnings: [
        'MANDATORY: this capability is simulated. There is no detection engine behind it. Present it as a concept demonstration.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Is anything actually detecting these?', audience: 'exec', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'hypothetical', rationale: 'Concept-level; no reuse assessment performed.' },
    { domain_id: 'logistics_distribution', applicability: 'hypothetical', rationale: 'Concept-level; no reuse assessment performed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-ENTERPRISE-MEMORY', relation: 'complements' }
  ],
  related_governance: [
    'docs/governance/EXPERIMENT_MODEL.md'
  ],
});
