/**
 * Capability knowledge — CAP-DEMAND-FORECAST.
 * Authored by ATL-03; amended by FM-01 (2026-08-23) after the surface was migrated onto the governed
 * forecast boundary. Every claim traces to a cited path, test or report; anything not fully real is
 * stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-DEMAND-FORECAST',
  description:
    'Demand and Forecast Intelligence is the surface on which a governed forecast and the four Demand Decision Frontier capabilities meet: stability, gap, window and regret, read against a real model’s projection and its measured range.',
  innovation_thesis:
    'A forecast screen that only shows a forecast leaves the decision to the reader. The interesting surface shows whether the number is moving, what cannot be captured, how long there is, and what choosing wrongly costs — and it shows which part of the outlook the data supports and which part somebody assumed.',
  usage_instructions:
    'Open Demand and Forecast. Four decision cards lead the surface. Below them, the chart separates observed history from the forecast with a TODAY divider and shades the calibrated forecast range; hover or select any day for a plain-language reading. The model and range panel names the model that ran and opens onto its parameters, backtest, calibration and provenance. Move the scenario controls and everything recomputes together.',
  testing_instructions:
    'Run npx tsx tests/unit/run-ddf01-tests.ts (57 assertions), npx tsx tests/unit/run-fm01-tests.ts (112 assertions on the migration and the closed forecast defects) and npx tsx tests/unit/run-demand-language-tests.ts (21 assertions).',
  field_status: [
    {
      field: 'forecast',
      implementation_status: 'implemented',
      note: 'Migrated by FM-01 from a closed-form curve over a loop index onto the governed forecast boundary. The model named on screen is the implementation that produced the numbers.'
    },
    {
      field: 'scenario adjustments',
      implementation_status: 'simulated',
      note: 'Promotion depth, cannibalisation and event uplift are declared commercial assumptions applied after the model and published beside its own expectation. They are not estimated from anything.'
    }
  ],
  architecture_narrative:
    'The surface issues one governed demand projection per displayed metric and passes the units projection into the demand frontier engine, so the forecast the chart draws and the frontier the cards quantify are the same series. Nothing on the surface computes or adjusts a projection: the model runs behind POST /api/v1/demand/forecast, and the commercial assumptions are applied after it and published as assumptions.',
  architecture_flow: [
    'Scenario parameters',
    'Governed forecast execution',
    'Declared commercial assumptions, applied after the model',
    'One frontier evaluation',
    'Stability, gap, window, regret',
    'Observed-versus-forecast chart with calibrated range and decision layer',
    'Intervention simulation'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/demand-frontier/evaluate', purpose: 'Evaluate the Demand Decision Frontier' },
    { method: 'POST', path: '/api/v1/demand/forecast', purpose: 'The governed demand projection the surface consumes' }
  ],
  contracts: [
    { name: 'DemandDecisionFrontierEvaluation', path: 'packages/contracts/src/demand-decision-frontier-model.ts', direction: 'out' },
    { name: 'ForecastExecution', path: 'packages/contracts/src/forecast-model-model.ts', direction: 'in' }
  ],
  data_sources: [
    { name: 'Shared decision state', kind: 'synthetic', path: 'lib/decision-state-store.ts' }
  ],
  implementation_references: [
    { path: 'components/Forecasting.tsx', note: 'Surface' },
    { path: 'components/demand/DemandDecisionNarrative.tsx', note: 'Narrative panel' },
    { path: 'components/demand/DemandForecastChart.tsx', note: 'Observed-versus-forecast chart, in the same visual grammar as the Continuous Decision Twin' },
    { path: 'components/demand/ForecastModelPanel.tsx', note: 'Model, range, comparison and progressive evidence disclosure' },
    { path: 'lib/demand-decision-frontier/demand-frontier-engine.ts', note: 'Engine' },
    { path: 'lib/demand-forecast.ts', note: 'The governed demand projection, on the CTW-03 boundary' },
    { path: 'app/api/v1/demand/forecast/route.ts', note: 'API' },
    { path: 'config/solutions.ts', note: 'SOL-DEMAND-02 registry entry' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-ddf01-tests.ts', outcome: '56 assertions including the arithmetic spine and recomputation.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_DDF_01_DEMAND_DECISION_FRONTIER_REPORT.md', outcome: 'Independent reconciliation closed 15 integration defects before release.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'test', ref: 'tests/unit/run-fm01-tests.ts', outcome: '112 assertions. The three DDF-01 projection assertions were migrated onto the governed boundary and the suite grew to 57.', observed_at: '2026-08-23', observed_by: 'FM-01 release validation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_FM_01_GOVERNED_FORECAST_MIGRATION_REPORT.md', outcome: 'The migration report, with defect-closure evidence for D-FM-1 through D-FM-7.', observed_at: '2026-08-23', observed_by: 'FM-01 release validation' }
  ],
  test_runners: [
    'tests/unit/run-ddf01-tests.ts',
    'tests/unit/run-fm01-tests.ts',
    'tests/unit/run-demand-language-tests.ts'
  ],
  acceptance_criteria_refs: [
    'AC-DDF-01'
  ],
  known_limitations: [
    { limitation: 'The registry five-second proposition cites 91 percent forecast confidence. Defect D-DDF-2 established that this was an unsupported backtest claim; do not present it as model accuracy.', severity: 'high' },
    { limitation: 'Demand Observability Level 0: the estate operates on synthetic and modelled demand throughout.', severity: 'high' },
    { limitation: 'Until FM-01 this surface offered a projection method selector whose three options were closed-form curves over a loop index, not models. The selector now enumerates the governed registry and an unregistered name is refused. Do not describe the earlier build as having offered a choice of models.', severity: 'high' },
    { limitation: 'Promotion depth, cannibalisation and event uplift are declared assumptions applied after the model, not estimated by it. Where they are non-neutral the chart draws the model’s own expectation beside the adjusted one, and both are published.', severity: 'medium' },
    { limitation: 'The Decision Gap is a demand-unit quantity and is not drawn on a revenue or waste axis. The surface says so and offers the switch rather than converting the ceiling by an average price.', severity: 'low' }
  ],
  assumptions: [
    'Stability, gap, window and regret are assumed to come from a single evaluation of one input set. That is what lets the four cards be read together; issuing them as four independent queries would allow them to disagree while appearing to describe one situation.',
    'The chart and the decision cards are assumed to be reading the same series. The frontier is evaluated on the units projection whatever the displayed metric is, so the shape the chart draws and the exposure the cards quantify cannot diverge.'
  ],
  use_cases: [
    { title: 'Reading a moving outlook as a decision', context: 'A planner has a forecast but no basis for acting on it.', outcome: 'Four decision cards replace a passive projection.' }
  ],
  demo_scenarios: [
    {
      path_type: 'ten-minute',
      title: 'Signal to decision in one surface',
      audience: 'exec',
      duration_mins: 10,
      steps: [
        { action: 'Read the four cards', what_to_say: 'Is it moving, what cannot we capture, how long have we got, what does choosing wrongly cost.', what_to_show: 'The four leading cards', expected_observation: 'Four distinct questions, one evaluation' },
        { action: 'Simulate an intervention', what_to_say: 'Everything recomputes. A failed recomputation shows unavailable, never a stale number.', what_to_show: 'Recomputation', expected_observation: 'All four cards move together' }
      ],
      prerequisites: [
        'Retail and Grocery domain active'
      ],
      warnings: [
        'Do not repeat the 91 percent confidence figure from the registry: defect D-DDF-2 established it as unsupported.',
        'Say "forecast range", not "confidence". The range is calibrated against held-out error where the evidence supports it, and the surface reports the coverage it actually achieved.',
        'The commercial sliders are assumptions, not forecasts. Point at the model’s own expectation line when explaining what the data supports.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'How accurate is the forecast?', audience: 'demand_planner', difficulty: 'high' },
    { question: 'Does this replace our forecasting platform?', audience: 'exec', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'proven', rationale: 'Registered applicable industry on SOL-DEMAND-02.' },
    { domain_id: 'restaurants_food', applicability: 'likely', rationale: 'Perishable demand with short decision windows fits the same frontier shape.' }
  ],
  related_capabilities: [
    { ref: 'CAP-CATEGORY-INTELLIGENCE', relation: 'complements' },
    { ref: 'CAP-DECISION-GAP', relation: 'depends-on' },
    { ref: 'CAP-DECISION-TIMELINE', relation: 'complements' },
    { ref: 'CAP-FORECAST-STABILITY', relation: 'depends-on' },
    { ref: 'CAP-GOVERNED-FORECAST', relation: 'depends-on' }
  ],
  related_decisions: [
    'ADR-040',
    'ADR-041',
    'ADR-042',
    'ADR-043',
    'ADR-071',
    'ADR-072'
  ],
  related_governance: [
    'docs/governance/DEMAND_OBSERVABILITY_MODEL.md',
    'docs/governance/COGNIX_FORECAST_MODEL_TRUTH_RECORD.md'
  ],
});
