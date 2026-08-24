/**
 * Capability knowledge — CAP-GOVERNED-FORECAST.
 * Authored by FM-01. Every claim traces to a cited path, test or report; anything not fully real is
 * stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-GOVERNED-FORECAST',
  description:
    'One boundary between a dataset and a forecast: the series is qualified before a model runs, the model that runs is a registered implementation, its parameters are estimated from the data, its interval is measured against held-out error, and every one of those facts travels on the result.',
  innovation_thesis:
    'Forecasting products are usually judged on which models they offer. The more interesting property is whether the name on the screen is the code that ran. CogniX audited itself, found that selecting ARIMA and passing a garbage string returned identical numbers, published that finding, and then rebuilt the boundary so a model name that reaches no implementation cannot reach a chart. Fewer truthful models beat more decorative ones, and a benchmark beating the sophisticated model is evidence worth showing rather than hiding.',
  usage_instructions:
    'Open Demand and Forecast. The model selector lists only registered models. Choose one and the forecast, its range, its fitted parameters and its execution id all change together. Model evidence, calibration and provenance opens the full disclosure. Compare models on held-out history runs a rolling-origin backtest and reports which model actually performed better.',
  testing_instructions:
    'Run npx tsx tests/unit/run-ctw03-tests.ts (77 assertions on the boundary, qualification, fitting, refusals and selection-to-implementation correspondence) and npx tsx tests/unit/run-fm01-tests.ts (112 assertions on the migration, the closed defects, model identity and interval calibration).',
  field_status: [
    {
      field: 'calibrated_lower / calibrated_upper',
      implementation_status: 'implemented',
      note: 'Published only where a backtest produced at least twenty held-out points over three folds. Below that the calibration reports reliable:false and no calibrated bounds are attached to any point.'
    },
    {
      field: 'data_provenance.synthetic_demo',
      implementation_status: 'simulated',
      note: 'Always true in this estate. The only series available is the synthetic demonstration dataset; the boundary is built to accept a client dataset without change, and none exists yet.'
    }
  ],
  architecture_narrative:
    'A ForecastDataset carries observations and their provenance, including any period excluded and why. Qualification is asked per model and before execution, so an unsuitable dataset is refused with a typed reason and remediation rather than quietly fitted. The adapter seam is what makes everything downstream model-agnostic: nothing outside an adapter may branch on a model identifier. Uncertainty is published twice — what the fitted model implies, and what its realised out-of-sample errors demanded — and the two are never conflated.',
  architecture_flow: [
    'Qualified historical series',
    'ForecastDataset and provenance',
    'Governed model selection',
    'The registered implementation, fitted',
    'Per-period forecast',
    'Model-implied and empirically calibrated uncertainty',
    'Forecast envelope, backtest and diagnostics'
  ],
  apis: [
    { method: 'GET', path: '/api/v1/forecast/models', purpose: 'The registered models, each naming its implementation file' },
    { method: 'POST', path: '/api/v1/forecast/execute', purpose: 'Execute one model against a dataset and horizon' },
    { method: 'POST', path: '/api/v1/forecast/compare', purpose: 'Rank every registered model by rolling-origin backtest on identical folds' },
    { method: 'POST', path: '/api/v1/demand/forecast', purpose: 'The Demand and Forecast projection, on the same boundary' }
  ],
  contracts: [
    { name: 'ForecastExecution', path: 'packages/contracts/src/forecast-model-model.ts', direction: 'out' },
    { name: 'ForecastDataset', path: 'packages/contracts/src/forecast-model-model.ts', direction: 'in' }
  ],
  data_sources: [
    { name: 'Daily demand history', kind: 'synthetic', path: 'data/sales_daily.json' }
  ],
  implementation_references: [
    { path: 'packages/contracts/src/forecast-model-model.ts', note: 'Contract, invariants F-INV-1…F-INV-8 and the calibration record' },
    { path: 'lib/forecast/forecast-engine.ts', note: 'The execution boundary: qualify, fit, predict, calibrate, validate, publish' },
    { path: 'lib/forecast/registry.ts', note: 'The registry — a model exists here only if an adapter genuinely fits and predicts it' },
    { path: 'lib/forecast/adapters/holt-winters.ts', note: 'ETS(A,A,A) with a weekly cycle; three smoothing parameters estimated by deterministic search' },
    { path: 'lib/forecast/adapters/seasonal-naive.ts', note: 'The benchmark, and the MASE denominator that makes two models comparable' },
    { path: 'lib/forecast/backtest.ts', note: 'Rolling-origin backtesting and the residuals calibration is measured from' },
    { path: 'lib/forecast/calibration.ts', note: 'Split conformal calibration with a normalised nonconformity score' },
    { path: 'lib/forecast/qualification.ts', note: 'Per-model dataset requirements, asked before a model runs' },
    { path: 'lib/forecast/series.ts', note: 'Dataset construction and provenance, including published exclusions' },
    { path: 'lib/demand-forecast.ts', note: 'The Demand and Forecast consumer, with declared commercial assumptions applied after the model' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-ctw03-tests.ts', outcome: '77 assertions. A-01/A-02 wrap each adapter’s own fit and predict and require that a model selection causes the corresponding implementation to run and the other not to.', observed_at: '2026-08-23', observed_by: 'FM-01 release validation' },
    { kind: 'test', ref: 'tests/unit/run-fm01-tests.ts', outcome: '112 assertions. Held-out interval coverage is measured at every offered horizon for every registered model and is allowed to fail.', observed_at: '2026-08-23', observed_by: 'FM-01 release validation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_CTW_03_FORECAST_MODEL_BOUNDARY_REPORT.md', outcome: 'Boundary completion report, including the measured finding that the benchmark scored better than the fitted model.', observed_at: '2026-08-23', observed_by: 'FM-01 release validation' },
    { kind: 'report', ref: 'docs/governance/COGNIX_FORECAST_MODEL_TRUTH_RECORD.md', outcome: 'The forensic record this capability exists to correct, and the closure evidence for D-FM-1…D-FM-7.', observed_at: '2026-08-23', observed_by: 'FM-01 release validation' }
  ],
  test_runners: [
    'tests/unit/run-ctw03-tests.ts',
    'tests/unit/run-fm01-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Two models are registered and neither is ARIMA, Prophet or a generative model. Those names are refused identically to a garbage string, because no implementation of them exists.', severity: 'high' },
    { limitation: 'On the governed demand series the simple benchmark scores better than the fitted model (MASE 1.493 against 1.536 on identical folds). This is published rather than hidden, and no automatic selection overrides a user’s choice.', severity: 'medium' },
    { limitation: 'The model-implied interval covers materially less than nominal — 46 to 64 per cent against 80 per cent, depending on model and horizon. The calibrated interval corrects this; the uncalibrated diagnostic is kept, still fails, and still says the interval is not calibrated.', severity: 'high' },
    { limitation: 'The calibration is estimated on one series, one measure and one horizon, from folds that overlap beyond a week. Its held-out points are therefore not independent, so its coverage figure is an estimate rather than a measurement of repeated trials.', severity: 'medium' },
    { limitation: 'The only data available is a synthetic demonstration dataset. The boundary accepts a ForecastDataset from anywhere, but no upload, connector or client feed exists.', severity: 'high' },
    { limitation: 'Fitting a statistical model is not machine learning and not organisational learning. Nothing here reads an attested observation, creates a learning candidate, or begins the deferred adaptive-learning programme.', severity: 'high' },
    { limitation: 'The models know nothing about promotions, price, stock, weather or holidays. They project the history they were given, and commercial assumptions are applied after them and published separately.', severity: 'medium' }
  ],
  assumptions: [
    'A model is assumed to be offerable only if an adapter genuinely fits and predicts it. There is deliberately no "coming soon" state, because a name that renders as a choice is a name a user will believe.',
    'The interval is assumed to need measuring rather than declaring. An interval that is never scored against held-out error cannot be distinguished from a decorative band, which is why coverage is a published diagnostic that is allowed to fail.',
    'Errors ahead are assumed to resemble errors behind. That is what makes the calibration transferable from the backtest to the forecast, and it is exactly the assumption a structural break invalidates.'
  ],
  use_cases: [
    { title: 'Answering "why should I trust this number"', context: 'A planner is asked to commit stock against a forecast.', outcome: 'The model, its parameters, its training window, its backtest error and the measured coverage of its range are all one click away.' },
    { title: 'Deciding whether a sophisticated model is worth it', context: 'The team assumes the more advanced model is the better one.', outcome: 'A rolling-origin backtest on identical folds says which actually performed better, and here the benchmark wins.' },
    { title: 'Preparing for client data', context: 'A prospect asks what would change if they supplied their own history.', outcome: 'The dataset seam is the same one the demo data enters through, and qualification refuses an unsuitable series with the reason and the remediation.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'The model named is the model that ran',
      audience: 'demand_planner',
      duration_mins: 3,
      steps: [
        { action: 'Read the forecast model and the forecast range', what_to_say: 'Two sentences: what produced this, and how wide the range really has to be.', what_to_show: 'The model and range panel', expected_observation: 'A named model and a range described by what it was measured against' },
        { action: 'Change the model', what_to_say: 'The implementation file, the execution id, the fitted parameters and the calibration all change together.', what_to_show: 'Model evidence, calibration and provenance', expected_observation: 'A different implementation path is named' },
        { action: 'Compare models on held-out history', what_to_say: 'CogniX measures rather than asserts. On this series the simple benchmark wins, and we show that.', what_to_show: 'The comparison table', expected_observation: 'MASE and measured coverage per model, with the recommendation marked' }
      ],
      prerequisites: [
        'Retail and Grocery domain active'
      ],
      warnings: [
        'The data is a synthetic demonstration series. Do not present the accuracy figures as a benchmark of client performance.',
        'Do not describe fitting as training or machine learning. The estate installs no ML library and the learning programme is deferred.',
        'Say "forecast range", not "confidence". The model-implied interval measurably under-covers on this series and the calibrated one is an estimate.'
      ],
      follow_ups: [
        'Show the same forecast shaping the campaign horizon in the Continuous Decision Twin.'
      ]
    }
  ],
  client_questions: [
    { question: 'Which models do you support?', audience: 'demand_planner', difficulty: 'medium' },
    { question: 'How accurate is it?', audience: 'exec', difficulty: 'high' },
    { question: 'Why is your simple model beating your sophisticated one?', audience: 'data_scientist', difficulty: 'high' },
    { question: 'Can we run this on our own history?', audience: 'enterprise_architect', difficulty: 'high' },
    { question: 'Is the 80 per cent range a guarantee?', audience: 'decision_scientist', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'likely', rationale: 'Daily shipment and consumption series have the same weekly structure the registered models are built for, and the qualification questions are identical.' },
    { domain_id: 'restaurants_food', applicability: 'likely', rationale: 'Covers and perishable demand are daily series with strong weekly seasonality, which is precisely the case Holt-Winters with a seven-day cycle addresses.' },
    { domain_id: 'logistics_distribution', applicability: 'likely', rationale: 'Volume and capacity planning consume a daily forecast with an interval; nothing in the boundary is retail-specific.' },
    { domain_id: 'energy_utilities', applicability: 'hypothetical', rationale: 'Load forecasting has a daily and weekly cycle, but also a strong temperature driver these models do not carry. Not assessed.' }
  ],
  visualisation: {
    kind: 'flow',
    concept: 'Governed forecast execution',
    description:
      'A pipeline from a qualified series to a published forecast. Qualification precedes execution, so an unsuitable dataset is refused rather than fitted. Uncertainty leaves the pipeline twice: what the model implies, and what its held-out errors demanded.',
    nodes: [
      { label: 'Qualified series', detail: 'Absent periods excluded and published, never carried as zeros.', role: 'stage' },
      { label: 'ForecastDataset', detail: 'Observations plus provenance. The seam a client dataset enters through.', role: 'stage' },
      { label: 'Registered model', detail: 'A name exists only where an implementation executes it.', role: 'stage' },
      { label: 'Fit and predict', detail: 'Parameters estimated from this series, deterministically.', role: 'stage' },
      { label: 'Model-implied range', detail: 'From the fitted residual variance.', role: 'evidence' },
      { label: 'Calibrated range', detail: 'Rescaled to match measured out-of-sample error.', role: 'outcome' }
    ]
  },
  related_capabilities: [
    { ref: 'CAP-DEMAND-FORECAST', relation: 'enables' },
    { ref: 'CAP-CONTINUOUS-DECISION-TWIN', relation: 'enables' },
    { ref: 'CAP-PREDICTIVE-INTERVENTION', relation: 'enables' },
    { ref: 'CAP-FORECAST-STABILITY', relation: 'complements' }
  ],
  related_decisions: [
    'ADR-040',
    'ADR-070',
    'ADR-071',
    'ADR-072'
  ],
  related_governance: [
    'docs/governance/COGNIX_FORECAST_MODEL_TRUTH_RECORD.md',
    'docs/governance/DEMAND_OBSERVABILITY_MODEL.md'
  ],
});
