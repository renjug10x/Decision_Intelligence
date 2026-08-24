/**
 * Capability knowledge — CAP-EXPERIMENT-CANVAS.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-EXPERIMENT-CANVAS',
  description:
    'A single reusable canvas that renders any registered experiment from its metadata, so adding an experiment makes it discoverable without building a bespoke screen.',
  innovation_thesis:
    'One canvas per experiment does not scale and guarantees drift. Rendering from metadata is what keeps the registry the source of truth.',
  usage_instructions:
    'Select any experiment from the portfolio. The canvas renders its problem statement, hypothesis, maturity and IP classification from the registry entry.',
  testing_instructions:
    'No dedicated runner exists. Recorded coverage gap.',
  architecture_narrative:
    'A metadata-driven renderer over the experiment registry contract.',
  architecture_flow: [
    'Experiment selected',
    'Registry metadata read',
    'Canvas rendered from metadata'
  ],
  implementation_references: [
    { path: 'components/ExperimentCanvas.tsx', note: 'Renderer' },
    { path: 'config/experiments.ts', note: 'Experiment registry' }
  ],
  validation_evidence: [
    { kind: 'code', ref: 'components/ExperimentCanvas.tsx', outcome: '297-line metadata-driven renderer.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md', outcome: 'Recorded as E-03.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  known_limitations: [
    { limitation: 'The canvas can only show what the experiment schema carries. It cannot show demo maturity, because the experiment schema has no such field; ATL-01 gap G1.', severity: 'medium' },
    { limitation: 'No dedicated test runner covers it.', severity: 'medium' }
  ],
  assumptions: [
    'An experiment is assumed to be fully describable by the experiment registry schema. Anything an experiment needs to show that the schema does not carry cannot be reached by authoring content alone, so the schema is the real boundary of this capability.'
  ],
  use_cases: [
    { title: 'Adding an experiment without adding a screen', context: 'A new experiment needs a surface.', outcome: 'Registry metadata alone makes it discoverable.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'One canvas, any experiment',
      audience: 'cco',
      duration_mins: 3,
      steps: [
        { action: 'Open two different experiments', what_to_say: 'Same canvas, different metadata. Adding an experiment does not mean building a screen.', what_to_show: 'Two experiments rendered identically', expected_observation: 'Structure from metadata' }
      ],
      prerequisites: [],
      warnings: [
        'The canvas shows only what the experiment schema carries; demo maturity is not among its fields.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'How long does adding one take?', audience: 'cco', difficulty: 'low' }
  ],
  cross_domain_applicability: [
    { domain_id: 'professional_services', applicability: 'likely', rationale: 'Metadata-driven rendering is industry-neutral.' },
    { domain_id: 'it_services', applicability: 'hypothetical', rationale: 'Plausible; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-INNOVATION-PORTFOLIO', relation: 'depends-on' }
  ],
  related_governance: [
    'docs/governance/EXPERIMENT_MODEL.md'
  ],
});
