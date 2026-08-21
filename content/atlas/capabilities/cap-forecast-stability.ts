/**
 * Capability knowledge — CAP-FORECAST-STABILITY (DDF-01 / P0-A).
 * Loaded on demand by the knowledge store; never bundled into the identity registry.
 * ATL-02 seed content: sufficient to prove the contract, not an ATL-03 population.
 */
import type { CapabilityKnowledge } from '../../../packages/contracts/src/capability-atlas-model';

export const knowledge: CapabilityKnowledge = {
  capability_id: 'CAP-FORECAST-STABILITY',
  description:
    'Forecast Stability Intelligence answers whether the demand outlook is likely to remain materially unchanged. It is computed from observed divergence in the enterprise signal stream, not from a model confidence constant, and reports INDETERMINATE where the evidence is insufficient rather than defaulting to a favourable score.',
  innovation_thesis:
    'A planner does not need to know how accurate a model has been. They need to know whether the number in front of them is about to move. Those are different questions, and conflating them is why forecast confidence is widely ignored in planning conversations.',
  usage_instructions:
    'Open the Demand & Forecast surface. The stability card leads the surface. Change the scenario parameters and observe the stability state and revision probability recompute. Expand the card to reach the contributing signals and their provenance class.',
  testing_instructions:
    'Run `npx tsx tests/unit/run-ddf01-tests.ts`. The stability assertions verify that the state derives from signal divergence rather than the IFI-01 confidence constant, and that insufficient evidence yields INDETERMINATE rather than a numeric score.',
  field_status: [
    {
      field: 'material_revision_probability_pct',
      implementation_status: 'simulated',
      note: 'A MODELLED expected value derived from observed signal divergence. It is never a calibrated probability and is labelled as modelled on the surface (ADR-040).'
    }
  ],
  architecture_narrative:
    'Enterprise signals are read from the ESF-1 contract, divergence is measured across the declared signal types, and the assessment is published as a contracted structure. No new signal type is introduced and no ML model is involved.',
  architecture_flow: [
    'EnterpriseSignal stream (ESF-1 / ESF-2)',
    'Divergence measurement across declared signal types',
    'Stability score, state and trend direction',
    'Material revision probability (modelled)',
    'Contributing signals with provenance class'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/demand-frontier/evaluate', purpose: 'Evaluate the full Demand Decision Frontier, including the stability assessment' }
  ],
  contracts: [
    { name: 'ForecastStabilityAssessment', path: 'packages/contracts/src/demand-decision-frontier-model.ts', direction: 'out' },
    { name: 'EnterpriseSignal', path: 'packages/contracts/src/enterprise-signal-model.ts', direction: 'in' }
  ],
  data_sources: [
    { name: 'Enterprise signal stream', kind: 'synthetic', path: 'services/world/src/enterprise-signal-generator.ts' }
  ],
  implementation_references: [
    { path: 'lib/demand-decision-frontier/demand-frontier-engine.ts', symbol: 'evaluateForecastStability', note: 'Owning engine function' },
    { path: 'packages/contracts/src/demand-decision-frontier-model.ts', symbol: 'ForecastStabilityAssessment' },
    { path: 'app/api/v1/demand-frontier/evaluate/route.ts' },
    { path: 'components/Forecasting.tsx', note: 'Presentation surface' }
  ],
  validation_evidence: [
    {
      kind: 'test',
      ref: 'tests/unit/run-ddf01-tests.ts',
      outcome: 'Stability derives from signal divergence, and insufficient evidence yields INDETERMINATE rather than a score.',
      observed_at: '2026-08-16',
      observed_by: 'DDF-01 integration pass'
    },
    {
      kind: 'report',
      ref: 'docs/reports/COGNIX_DDF_01_DEMAND_DECISION_FRONTIER_REPORT.md',
      outcome: 'Independent reconciliation recorded the [HARD] acceptance verdicts for the stability slice.',
      observed_at: '2026-08-16',
      observed_by: 'DDF-01 reconciliation'
    }
  ],
  test_runners: ['tests/unit/run-ddf01-tests.ts'],
  acceptance_criteria_refs: ['AC-DDF-14'],
  known_limitations: [
    {
      limitation: 'The revision probability is a modelled expected value, not a calibrated probability, and must never be presented as a statistical prediction interval.',
      severity: 'medium',
      applies_to: 'material_revision_probability_pct'
    },
    {
      limitation: 'Stability is not model accuracy. Captioning it as accuracy absent a backtest reintroduces defect D-DDF-2.',
      severity: 'high'
    }
  ],
  open_defects: [],
  assumptions: [
    'The signal stream is synthetic and deterministic in the current estate (Demand Observability Level 0).'
  ],
  use_cases: [
    {
      title: 'Deciding whether to act on a moving outlook',
      context: 'A planner sees demand rising but does not know whether the rise will survive the next revision.',
      outcome: 'The stability state and revision direction tell them whether to act now or wait for the next signal.'
    }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Is this number about to move?',
      audience: 'exec',
      duration_mins: 3,
      steps: [
        {
          action: 'Open the Demand & Forecast surface',
          what_to_say: 'This is not a forecast accuracy score. It answers whether the outlook is about to change.',
          what_to_show: 'The stability card leading the surface',
          expected_observation: 'A stability state and a revision direction, not a percentage accuracy claim'
        },
        {
          action: 'Expand the evidence disclosure',
          what_to_say: 'Every input carries its provenance class.',
          what_to_show: 'Contributing signals with provenance',
          expected_observation: 'Each contributing signal is named and classified'
        }
      ],
      prerequisites: ['Retail & Grocery domain active'],
      warnings: [
        'The revision probability is a modelled value, not a calibrated one. Say so if asked how it was validated.'
      ],
      follow_ups: ['CAP-DECISION-GAP']
    }
  ],
  questions_worth_asking: [],
  client_questions: [
    { question: 'How is this different from forecast confidence?', audience: 'commercial_planning', difficulty: 'medium' },
    { question: 'What would make the forecast change?', audience: 'exec', difficulty: 'low' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'likely', rationale: 'Signal divergence over a demand stream is not retail-specific; the input contract is domain-neutral.' },
    { domain_id: 'digital_commerce', applicability: 'hypothetical', rationale: 'Plausible, but no evidence has been gathered.' }
  ],
  external_evidence: [],
  related_capabilities: [
    { ref: 'CAP-DECISION-GAP', relation: 'enables' },
    { ref: 'CAP-DEMAND-FORECAST', relation: 'enables' },
    { ref: 'CAP-INTENT-FUSION', relation: 'depends-on' }
  ],
  related_decisions: ['ADR-040'],
  related_governance: ['docs/governance/DEMAND_OBSERVABILITY_MODEL.md']
};
