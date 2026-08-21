/**
 * Capability knowledge — CAP-INNOVATION-PORTFOLIO.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-INNOVATION-PORTFOLIO',
  description:
    'The discovery surface over registered experiments and demonstration solutions: the current answer to what CogniX can do, and the nearest predecessor to the Capability Atlas.',
  innovation_thesis:
    'A lab that cannot show its own portfolio cannot be reviewed. The portfolio was the first attempt at the question the Atlas now answers properly.',
  usage_instructions:
    'Open the Capability Atlas and choose the Portfolio view. It reports the estate across implementation, lifecycle, demonstration maturity and reach as four separate distributions, and names every capability that is not fully implemented.',
  testing_instructions:
    'No dedicated runner exists. Registry consumption is exercised indirectly. Recorded coverage gap.',
  architecture_narrative:
    'A presentation surface reading config/experiments.ts and config/solutions.ts directly and routing selections into the shell.',
  architecture_flow: [
    'Experiment and solution registries',
    'Portfolio rendering',
    'Selection',
    'Route to canvas or surface'
  ],
  implementation_references: [
    { path: 'components/atlas/PortfolioView.tsx', note: 'Surface, inside the Atlas since ATL-04R; reads the full governed estate rather than two registries' },
    { path: 'config/experiments.ts', note: 'Experiment registry' },
    { path: 'config/solutions.ts', note: 'Solution registry' }
  ],
  validation_evidence: [
    { kind: 'code', ref: 'components/atlas/PortfolioView.tsx', outcome: 'Portfolio view over all 38 governed capabilities, replacing the 269-line surface that showed 9.', observed_at: '2026-08-21', observed_by: 'ATL-04R migration' },
    { kind: 'report', ref: 'docs/reports/COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md', outcome: 'Recorded as E-01.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  known_limitations: [
    { limitation: 'It shows nine registered assets. ATL-01 established that the estate holds at least thirty-three capabilities, so the portfolio understates the estate substantially.', severity: 'high' },
    { limitation: 'No dedicated test runner covers it.', severity: 'medium' }
  ],
  use_cases: [
    { title: 'Seeing the lab portfolio', context: 'A visitor asks what exists.', outcome: 'Registered experiments and solutions are listed with routing.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'What the lab holds',
      audience: 'exec',
      duration_mins: 3,
      steps: [
        { action: 'Open the portfolio', what_to_say: 'This is the registered portfolio. The Atlas exists because it is not the whole estate.', what_to_show: 'Experiments and solutions', expected_observation: 'Nine registered assets' }
      ],
      prerequisites: [],
      warnings: [
        'This surface shows nine registered assets against at least thirty-three inventoried capabilities. Do not present it as complete.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Is this everything?', audience: 'exec', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'professional_services', applicability: 'likely', rationale: 'Portfolio discovery is industry-neutral.' },
    { domain_id: 'it_services', applicability: 'hypothetical', rationale: 'Plausible; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-CURIOSITY-QUESTIONS', relation: 'complements' },
    { ref: 'CAP-EXPERIMENT-CANVAS', relation: 'enables' }
  ],
  related_decisions: [
    'ADR-045'
  ],
  related_governance: [
    'docs/governance/DEMONSTRATION_SOLUTION_MODEL.md'
  ],
});
