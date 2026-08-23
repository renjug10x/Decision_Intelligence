/**
 * CogniX CTW-03 — Governed Forecast Model Execution Boundary test suite.
 *
 * The claim this work package makes is that the model named to a user is the implementation that
 * produced the forecast. Group A proves that by **instrumenting the adapters themselves**: a test
 * that changes the model selection must be able to observe the corresponding implementation run.
 * Anything weaker would be the same assertion the previous engine could have passed.
 */

import {
  BacktestMetrics,
  DEFAULT_INTERVAL_LEVEL,
  ForecastDataset,
  ForecastExecution,
  ForecastModelId,
  INTERVAL_COVERAGE_TOLERANCE,
  isRefusal,
  NOT_LEARNING_DISCLOSURE,
  validateForecastExecution
} from '../../packages/contracts/src/forecast-model-model';
import { executeForecast, compareForecastModels, recommendForecastModel } from '../../lib/forecast/forecast-engine';
import { listForecastModels, getForecastAdapter, DEFAULT_FORECAST_MODEL_ID, isRegisteredModel } from '../../lib/forecast/registry';
import { buildForecastDataset } from '../../lib/forecast/series';
import { qualifyDataset } from '../../lib/forecast/qualification';
import { holtWintersAdapter } from '../../lib/forecast/adapters/holt-winters';
import { seasonalNaiveAdapter } from '../../lib/forecast/adapters/seasonal-naive';
import { addUtcDays } from '../../lib/forecast/adapters/adapter';

import { projectCampaignFlight } from '../../lib/campaign-continuous-timeline-engine';
import { projectDecisionTimeline } from '../../lib/campaign-timeline-engine';
import { evaluateOutcomeFrontier } from '../../lib/campaign-frontier-engine';
import { createDecisionContract } from '../../lib/campaign-decision-contract-engine';
import { decisionContractStore } from '../../lib/decision-contract-store';
import { clearCampaignIntents, registerCampaignIntent } from '../../lib/campaign-intent-store';
import { getArchetypeById, buildCampaignIntentFromArchetype } from '../../lib/campaign-archetypes';
import { buildElapsedTelemetryFromArchetype } from '../../lib/campaign-flight-client';

let passCount = 0;
let failCount = 0;
function assert(c: boolean, name: string, detail?: string) {
  if (c) { passCount++; console.log(`[PASS] ${name}`); }
  else { failCount++; console.error(`[FAIL] ${name}${detail ? ` — ${detail}` : ''}`); }
}
function threw(fn: () => unknown) {
  try { fn(); return { threw: false as const }; }
  catch (e: any) { return { threw: true as const, rejection: e.rejection_id }; }
}

const AS_OF = '2026-08-23T00:00:00.000Z';

/** A clean synthetic weekly series: level 100, +20 at weekend, tiny deterministic ripple. */
function syntheticSeries(n: number, start = '2026-01-05'): ForecastDataset {
  const observations = Array.from({ length: n }, (_, i) => {
    const dow = i % 7;
    const seasonal = dow === 5 || dow === 6 ? 20 : 0;
    return { period: addUtcDays(start, i), value: 100 + seasonal + (i % 3) };
  });
  return {
    provenance: {
      dataset_id: `synthetic:${n}`,
      source: 'test fixture',
      scope: { scope: 'test' },
      measure: 'units_sold',
      grain: 'DAY',
      first_period: observations[0].period,
      last_period: observations[n - 1].period,
      observation_count: n,
      excluded_periods: [],
      synthetic_demo: true
    },
    observations
  };
}

async function runTests() {
  console.log('\n=== CTW-03 Governed Forecast Model Execution Boundary ===\n');

  // ── A. Selection reaches the implementation. The load-bearing group. ───────────────
  console.log('\n-- A. Model selection → implementation correspondence --');
  const ds = syntheticSeries(84);

  {
    // Instrument each adapter's own fit/predict. If selection did not reach the implementation,
    // these counters stay at zero — which is precisely what the previous engine would have done.
    const hits: Record<string, number> = { hw_fit: 0, hw_predict: 0, sn_fit: 0, sn_predict: 0 };
    const hwFit = holtWintersAdapter.fit.bind(holtWintersAdapter);
    const hwPredict = holtWintersAdapter.predict.bind(holtWintersAdapter);
    const snFit = seasonalNaiveAdapter.fit.bind(seasonalNaiveAdapter);
    const snPredict = seasonalNaiveAdapter.predict.bind(seasonalNaiveAdapter);
    (holtWintersAdapter as any).fit = (v: number[]) => { hits.hw_fit++; return hwFit(v); };
    (holtWintersAdapter as any).predict = (s: unknown, h: number, p: string) => { hits.hw_predict++; return hwPredict(s, h, p); };
    (seasonalNaiveAdapter as any).fit = (v: number[]) => { hits.sn_fit++; return snFit(v); };
    (seasonalNaiveAdapter as any).predict = (s: unknown, h: number, p: string) => { hits.sn_predict++; return snPredict(s, h, p); };

    executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: ds, horizon: 14, executed_as_of: AS_OF });
    const afterHw = { ...hits };
    executeForecast({ model_id: 'SEASONAL_NAIVE', dataset: ds, horizon: 14, executed_as_of: AS_OF });
    const afterSn = { ...hits };

    (holtWintersAdapter as any).fit = hwFit;
    (holtWintersAdapter as any).predict = hwPredict;
    (seasonalNaiveAdapter as any).fit = snFit;
    (seasonalNaiveAdapter as any).predict = snPredict;

    assert(
      afterHw.hw_fit === 1 && afterHw.hw_predict === 1 && afterHw.sn_fit === 0,
      'A-01: selecting Holt-Winters runs the Holt-Winters implementation and nothing else'
    );
    assert(
      afterSn.sn_fit === 1 && afterSn.sn_predict === 1 && afterSn.hw_fit === afterHw.hw_fit,
      'A-02: selecting seasonal naive runs the seasonal-naive implementation and nothing else'
    );
  }

  {
    const hw = executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: ds, horizon: 14, executed_as_of: AS_OF });
    const sn = executeForecast({ model_id: 'SEASONAL_NAIVE', dataset: ds, horizon: 14, executed_as_of: AS_OF });
    if (isRefusal(hw) || isRefusal(sn)) {
      assert(false, 'A-03: both registered models execute on a suitable dataset');
    } else {
      assert(
        JSON.stringify(hw.points.map(p => p.value)) !== JSON.stringify(sn.points.map(p => p.value)),
        'A-03: two models produce two different forecasts — the defect that made arima, baseline and garbage identical cannot recur'
      );
      assert(
        hw.implementation_ref !== sn.implementation_ref &&
          hw.implementation_ref.includes('holt-winters') &&
          sn.implementation_ref.includes('seasonal-naive'),
        'A-04: each execution names the file that produced it'
      );
      assert(
        hw.model_display_name === holtWintersAdapter.declaration.display_name,
        'A-05: the displayed name is the registered declaration, not a caller-supplied string'
      );
    }
  }

  {
    const out = executeForecast({ model_id: 'ARIMA' as ForecastModelId, dataset: ds, horizon: 14, executed_as_of: AS_OF });
    assert(
      isRefusal(out) && out.reason === 'MODEL_NOT_REGISTERED',
      'A-06: an unregistered model is refused, never quietly served by a default'
    );
    const outs = ['PROPHET', 'GENAI', 'TOTAL_GARBAGE'].map(m =>
      executeForecast({ model_id: m as ForecastModelId, dataset: ds, horizon: 14, executed_as_of: AS_OF })
    );
    assert(
      outs.every(o => isRefusal(o) && o.reason === 'MODEL_NOT_REGISTERED'),
      'A-07: Prophet, GenAI and garbage are all refused identically — none is implemented, so none is offered'
    );
  }
  assert(
    !isRegisteredModel('ARIMA') && !isRegisteredModel('PROPHET') && !isRegisteredModel('GENAI'),
    'A-08: no model label without an implementation is registered'
  );
  assert(
    listForecastModels().every(d => getForecastAdapter(d.model_id) !== null),
    'A-09: every registered declaration has an adapter behind it'
  );
  assert(
    listForecastModels().every(d => d.runtime === 'first_party_typescript'),
    'A-10: no declaration names a runtime that is not a dependency'
  );

  // ── B. Fitting is real ────────────────────────────────────────────────────────────
  console.log('\n-- B. Fitting --');
  {
    const out = executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: ds, horizon: 14, executed_as_of: AS_OF });
    if (isRefusal(out)) assert(false, 'B-00: Holt-Winters executed');
    else {
      assert(out.fit.fitted === true, 'B-01: Holt-Winters reports that it fitted');
      const keys = Object.keys(out.fit.estimated_parameters);
      assert(
        keys.includes('alpha') && keys.includes('beta_star') && keys.includes('gamma_star'),
        'B-02: three smoothing parameters were estimated'
      );
      assert(out.fit.candidates_evaluated > 100, 'B-03: a real search was performed', String(out.fit.candidates_evaluated));
      assert((out.fit.residual_sigma ?? 0) > 0, 'B-04: residual sigma comes from actual residuals');
      // Fitting must respond to the data, which a fixed curve cannot.
      // Perturb with a period the weekly seasonal indices cannot absorb. A constant added to one
      // weekday would be pure seasonality and would leave the residuals untouched — which is correct
      // model behaviour, and was this assertion's original mistake.
      const other = syntheticSeries(84);
      other.observations = other.observations.map((o, i) => ({ ...o, value: o.value + (i % 5) * 6 }));
      other.provenance.dataset_id = 'synthetic:altered';
      const out2 = executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: other, horizon: 14, executed_as_of: AS_OF });
      assert(
        !isRefusal(out2) && (out2.fit.residual_sigma ?? 0) !== (out.fit.residual_sigma ?? 0),
        'B-05: fitting runs on the supplied series — a different series yields a different fit'
      );
      assert(
        !isRefusal(out2) && JSON.stringify(out2.points.map(p => Math.round(p.value))) !== JSON.stringify(out.points.map(p => Math.round(p.value))),
        'B-06: a different series yields a different forecast — the output is a function of the data'
      );
      // Determinism: the same series must always give the same answer, or a stored result is not reproducible.
      const again = executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: ds, horizon: 14, executed_as_of: AS_OF });
      assert(
        !isRefusal(again) && JSON.stringify(again.points) === JSON.stringify(out.points),
        'B-07: execution is deterministic and reproducible'
      );
      assert(again !== out && !isRefusal(again) && again.execution_id === out.execution_id, 'B-08: the execution id is content-derived, not time-derived');
    }
  }
  {
    const sn = executeForecast({ model_id: 'SEASONAL_NAIVE', dataset: ds, horizon: 14, executed_as_of: AS_OF });
    assert(
      !isRefusal(sn) && sn.fit.fitted === false && Object.keys(sn.fit.estimated_parameters).length === 0,
      'B-09: the benchmark says plainly that it estimates nothing'
    );
    assert(
      !isRefusal(sn) && sn.points[0].value === ds.observations[ds.observations.length - 7].value,
      'B-10: seasonal naive returns the value from the same weekday, and indexes it correctly'
    );
    assert(
      !isRefusal(sn) && sn.points[6].value === ds.observations[ds.observations.length - 1].value,
      'B-11: step 7 reads the last observation rather than running past the end'
    );
  }

  // ── C. Qualification precedes execution ───────────────────────────────────────────
  console.log('\n-- C. Qualification --');
  {
    const tooShort = syntheticSeries(10);
    const out = executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: tooShort, horizon: 7, executed_as_of: AS_OF });
    assert(isRefusal(out) && out.reason === 'INSUFFICIENT_HISTORY', 'C-01: too little history is refused, not fitted');
    assert(isRefusal(out) && (out.qualification?.remediation.length ?? 0) > 0, 'C-02: the refusal says what would fix it');
  }
  {
    const gapped = syntheticSeries(40);
    gapped.observations.splice(20, 1);
    gapped.provenance.observation_count = gapped.observations.length;
    const out = executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: gapped, horizon: 7, executed_as_of: AS_OF });
    assert(isRefusal(out) && out.reason === 'IRREGULAR_FREQUENCY', 'C-03: a gap is refused — a missing day is not a zero');
  }
  {
    const dup = syntheticSeries(40);
    dup.observations[21] = { ...dup.observations[20] };
    const out = executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: dup, horizon: 7, executed_as_of: AS_OF });
    assert(isRefusal(out) && out.reason === 'DUPLICATE_PERIODS', 'C-04: a duplicated period is refused');
  }
  {
    const nan = syntheticSeries(40);
    nan.observations[10] = { ...nan.observations[10], value: NaN };
    const out = executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: nan, horizon: 7, executed_as_of: AS_OF });
    assert(isRefusal(out) && out.reason === 'NON_FINITE_VALUES', 'C-05: a non-finite value is refused');
  }
  {
    const out = executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: ds, horizon: 999, executed_as_of: AS_OF });
    assert(isRefusal(out) && out.reason === 'HORIZON_OUT_OF_RANGE', 'C-06: an out-of-range horizon is refused');
  }
  {
    // Every model publishes what it needs BEFORE it is chosen — the question the future ingestion
    // layer has to be able to ask.
    assert(
      listForecastModels().every(d => d.data_requirements.length >= 3 && d.data_requirements.every(r => r.statement.length > 30)),
      'C-07: every model publishes its dataset requirements in words'
    );
    const q = qualifyDataset(syntheticSeries(84), holtWintersAdapter.declaration);
    assert(q.suitable && q.checks.length >= 3, 'C-08: a suitable dataset passes every published check');
    assert(
      q.checks.every(c => c.detail.length > 0),
      'C-09: every check reports what it actually found, not just pass or fail'
    );
  }

  // ── D. Uncertainty and validation ─────────────────────────────────────────────────
  console.log('\n-- D. Uncertainty and backtesting --');
  {
    const out = executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: ds, horizon: 14, executed_as_of: AS_OF, backtest: true });
    if (isRefusal(out)) assert(false, 'D-00: executed with backtest');
    else {
      assert(out.uncertainty.basis === 'FITTED_RESIDUAL_VARIANCE', 'D-01: the interval comes from the fitted residuals');
      assert(out.uncertainty.level === DEFAULT_INTERVAL_LEVEL, 'D-02: the interval level is declared');
      const w1 = (out.points[0].upper as number) - (out.points[0].lower as number);
      const w14 = (out.points[13].upper as number) - (out.points[13].lower as number);
      assert(w14 > w1, 'D-03: the interval widens with horizon because the model says so');
      assert(
        out.points.every(p => p.lower !== null && p.upper !== null && p.lower <= p.value && p.upper >= p.value),
        'D-04: every interval brackets its own point'
      );
      const bt = out.validation.backtest as BacktestMetrics;
      assert(bt !== null && bt.folds >= 2 && bt.points_scored > 0, 'D-05: a rolling-origin backtest actually ran');
      assert(bt.mase !== null && bt.mase > 0, 'D-06: MASE is computed against the seasonal-naive scale');
      assert(bt.interval_coverage !== null, 'D-07: interval coverage is measured rather than assumed');
      assert(
        out.validation.diagnostics.some(d => d.check === 'interval_coverage_near_nominal'),
        'D-08: coverage is published as a diagnostic that is allowed to fail'
      );
      const cov = out.validation.diagnostics.find(d => d.check === 'interval_coverage_near_nominal')!;
      assert(
        cov.passed === (Math.abs((bt.interval_coverage as number) - DEFAULT_INTERVAL_LEVEL) <= INTERVAL_COVERAGE_TOLERANCE),
        'D-09: the coverage diagnostic reports the measurement rather than a foregone pass'
      );
      assert(/not calibrated/i.test(cov.detail), 'D-10: the interval is described as model-implied, never as calibrated');
    }
  }
  {
    // MAPE must be withheld on a zero actual rather than reported as infinity.
    const withZero = syntheticSeries(60);
    withZero.observations[50] = { ...withZero.observations[50], value: 0 };
    const out = executeForecast({ model_id: 'SEASONAL_NAIVE', dataset: withZero, horizon: 7, executed_as_of: AS_OF, backtest: true });
    assert(
      !isRefusal(out) && (out.validation.backtest?.mape === null || out.validation.backtest === null),
      'D-11: MAPE is withheld when an actual is zero rather than reported as infinite'
    );
    assert(
      !isRefusal(out) && (out.validation.backtest === null || Number.isFinite(out.validation.backtest.smape)),
      'D-12: sMAPE remains defined where MAPE cannot be'
    );
  }

  // ── E. Comparison is measured, never asserted ─────────────────────────────────────
  console.log('\n-- E. Comparison --');
  {
    const cmp = compareForecastModels(ds, 14, AS_OF);
    assert(cmp.entries.length === listForecastModels().length, 'E-01: every registered model is compared');
    assert(
      cmp.entries.every(e => e.metrics !== null || e.refused !== undefined),
      'E-02: a model either scores or says why it could not'
    );
    assert(/MASE/i.test(cmp.basis) && /rolling-origin/i.test(cmp.basis), 'E-03: the comparison publishes its basis');
    const folds = cmp.entries.map(e => e.metrics?.folds).filter(f => f !== undefined);
    assert(new Set(folds).size === 1, 'E-04: every model is scored on identical folds', JSON.stringify(folds));
    const rec = recommendForecastModel(ds, 14, AS_OF);
    assert(
      rec.recommended === cmp.best_model_id || (!cmp.best_model_id && rec.recommended === DEFAULT_FORECAST_MODEL_ID),
      'E-05: the recommendation follows the measurement, or falls back and says so'
    );
    assert(rec.statement.length > 40, 'E-06: the recommendation explains itself');
    assert(rec.measured === (cmp.best_model_id !== undefined), 'E-07: a recommendation states whether it was measured');
  }

  // ── F. Data provenance and the recorded defects ───────────────────────────────────
  console.log('\n-- F. Provenance and defects --');
  {
    const real = await buildForecastDataset({});
    assert(real.observations.length > 0, 'F-01: a dataset is built from the demand history');
    assert(
      real.observations.every(o => Number.isFinite(o.value)),
      'F-02: every observation is finite'
    );
    // D-FM-1: an absent day must be excluded and published, never divided into a mean as a zero.
    assert(
      real.observations.every(o => o.value > 0),
      'F-03 (D-FM-1): no empty period is carried as a zero observation'
    );
    assert(
      Array.isArray(real.provenance.excluded_periods),
      'F-04 (D-FM-1): exclusions are published on the provenance rather than being silent'
    );
    // D-FM-2: the window comes from the data, not a hard-coded anchor.
    assert(
      real.provenance.last_period === real.observations[real.observations.length - 1].period &&
        real.provenance.first_period === real.observations[0].period,
      'F-05 (D-FM-2): the window is derived from the data’s own coverage'
    );
    assert(
      !/2026-06-04/.test(real.provenance.last_period),
      'F-06 (D-FM-2): the frozen 2026-06-04 anchor does not reach the governed path'
    );
    assert(real.provenance.source === 'data/sales_daily.json', 'F-07: the source file is named on the provenance');
    assert(real.provenance.synthetic_demo === true, 'F-08: the series is declared synthetic');
  }
  {
    // D-FM-3: no local-time weekday is read anywhere on this path.
    const prev = process.env.TZ;
    const runIn = (tz: string) => {
      process.env.TZ = tz;
      const d = syntheticSeries(84);
      const out = executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: d, horizon: 14, executed_as_of: AS_OF });
      return isRefusal(out) ? null : JSON.stringify(out.points.map(p => [p.period, Math.round(p.value)]));
    };
    const utc = runIn('UTC');
    const ny = runIn('America/New_York');
    const tokyo = runIn('Asia/Tokyo');
    process.env.TZ = prev;
    assert(
      utc !== null && utc === ny && utc === tokyo,
      'F-09 (D-FM-3): the forecast is identical under UTC, New York and Tokyo — no local weekday is read'
    );
  }
  assert(addUtcDays('2026-03-01', 1) === '2026-03-02', 'F-10: date arithmetic is UTC-only');
  assert(addUtcDays('2026-12-31', 1) === '2027-01-01', 'F-11: date arithmetic crosses a year boundary correctly');

  // ── G. Guards ─────────────────────────────────────────────────────────────────────
  console.log('\n-- G. Guards --');
  {
    const r1 = threw(() => executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: ds, horizon: 14, executed_as_of: AS_OF, points_override: [1, 2, 3] }));
    assert(r1.threw && r1.rejection === 'RJ-F1', 'G-01: a caller-supplied forecast is refused');
    const r2 = threw(() => executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: ds, horizon: 14, executed_as_of: AS_OF, fit_override: { alpha: 0.9 } }));
    assert(r2.threw && r2.rejection === 'RJ-F2', 'G-02: caller-supplied fitted parameters are refused');
  }
  {
    const out = executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: ds, horizon: 14, executed_as_of: AS_OF }) as ForecastExecution;
    assert(validateForecastExecution(out, holtWintersAdapter.declaration).length === 0, 'G-03: a real execution satisfies F-INV-1..6');
    const tampered: ForecastExecution = JSON.parse(JSON.stringify(out));
    tampered.points[3].lower = (tampered.points[3].value as number) + 10;
    assert(
      validateForecastExecution(tampered, holtWintersAdapter.declaration).some(v => v.invariant === 'F-INV-2'),
      'G-04: an interval that excludes its own point is caught'
    );
    const t2: ForecastExecution = JSON.parse(JSON.stringify(out));
    t2.implementation_ref = 'lib/forecast/adapters/something-else.ts';
    assert(
      validateForecastExecution(t2, holtWintersAdapter.declaration).some(v => v.invariant === 'F-INV-4'),
      'G-05: an execution naming a different implementation is caught'
    );
  }
  assert(
    /not organisational learning/i.test(NOT_LEARNING_DISCLOSURE),
    'G-06: fitting a model is explicitly distinguished from the deferred learning programme'
  );

  // ── H. The Twin consumes the boundary, without model-specific logic ───────────────
  console.log('\n-- H. Decision Twin integration --');
  {
    decisionContractStore.clear();
    clearCampaignIntents();
    const arch = getArchetypeById('ARCH-CHILLED-ELASTIC')!;
    const session = 'sess_ctw03';
    const intent: any = buildCampaignIntentFromArchetype(arch, { tenant_id: 'tenant_uk_retail_01', session_id: session });
    registerCampaignIntent(intent);
    const fr: any = evaluateOutcomeFrontier({ tenant_id: 'tenant_uk_retail_01', session_id: session, campaign_intent_id: intent.intent_id, evaluation_timestamp: AS_OF } as any);
    const f = fr.frontier;
    const resolution: any =
      f.selection?.status === 'SELECTED' && f.selection.selected_play_id
        ? { route: 'CONSTRAINT_RESOLVED', selected_play_id: f.selection.selected_play_id, selection_status: 'SELECTED', selection_basis: f.selection.selection_basis }
        : { route: 'HUMAN_RESOLVED', selected_play_id: f.frontier_play_ids[0], resolved_by: 'suite', resolution_statement: 'fixture', presented_alternatives: f.frontier_play_ids };
    const contract = createDecisionContract({ tenant_id: 'tenant_uk_retail_01', session_id: session, frontier: f, campaign_intent: intent, resolution, created_as_of: AS_OF } as any);
    const tl: any = projectDecisionTimeline({ tenant_id: 'tenant_uk_retail_01', session_id: session, campaign_intent_id: intent.intent_id, campaign_intent: intent } as any);
    const timeline = tl.projection ?? tl;
    const telemetry = buildElapsedTelemetryFromArchetype(arch);
    const base = { tenant_id: 'tenant_uk_retail_01', session_id: session, contract_id: contract.contract_id, timeline, elapsed_telemetry: telemetry };

    const flat = projectCampaignFlight(base);
    assert(flat.allocation_profile === 'FLAT_RATE_IDENTITY' && flat.forecast === null, 'H-01: without a forecast the horizon stays flat and says so');

    const real = await buildForecastDataset({});
    const fx = executeForecast({ model_id: 'HOLT_WINTERS_ADDITIVE', dataset: real, horizon: timeline.grid.campaign_days, executed_as_of: AS_OF, backtest: true }) as ForecastExecution;
    const shaped = projectCampaignFlight({ ...base, forecast: fx });

    assert(shaped.allocation_profile === 'FORECAST_SHAPED', 'H-02: a bound forecast shapes the horizon');
    const distinct = new Set(shaped.lenses[0].points.map(p => p.expectation_value)).size;
    assert(distinct > 1, 'H-03 (D-FM-6): the predicted horizon genuinely varies day to day', `${distinct} distinct`);

    const totalFlat = flat.lenses[0].points.reduce((s, p) => s + (p.expectation_value ?? 0), 0);
    const totalShaped = shaped.lenses[0].points.reduce((s, p) => s + (p.expectation_value ?? 0), 0);
    assert(
      Math.abs(totalFlat - totalShaped) < Math.max(1, totalFlat * 0.0001),
      'H-04: shaping redistributes the contract’s total without changing it — not a second baseline',
      `${totalFlat} vs ${totalShaped}`
    );

    assert(
      shaped.forecast !== null && shaped.forecast.model_id === 'HOLT_WINTERS_ADDITIVE' && shaped.forecast.implementation_ref === holtWintersAdapter.declaration.implementation_ref,
      'H-05: the projection names the model and implementation that shaped it'
    );
    assert(
      shaped.lenses.every(l => l.points.every(p => p.expectation_lower === null || p.expectation_value === null || (p.expectation_lower <= p.expectation_value && (p.expectation_upper as number) >= p.expectation_value))),
      'H-06: the declared band still brackets the shaped expectation'
    );
    assert(
      shaped.lenses.every(l => l.points.filter(p => p.horizon_class === 'PREDICTED_REMAINING').every(p => p.actual_value === null)),
      'H-07: shaping does not turn a prediction into an observation'
    );
    assert(
      shaped.day_narratives.some(n => n.basis.some(b => /Holt-Winters/.test(b))),
      'H-08: narration attributes the shape to the model that produced it'
    );
    assert(
      shaped.horizon_shape_disclosure !== flat.horizon_shape_disclosure &&
        /Holt-Winters/.test(shaped.horizon_shape_disclosure),
      'H-09: the disclosure changes with the shape and names the model'
    );

    // The Twin must not branch on the model. Swapping the model must change values, not structure.
    const fxSn = executeForecast({ model_id: 'SEASONAL_NAIVE', dataset: real, horizon: timeline.grid.campaign_days, executed_as_of: AS_OF }) as ForecastExecution;
    const shapedSn = projectCampaignFlight({ ...base, forecast: fxSn });
    assert(
      shapedSn.allocation_profile === shaped.allocation_profile &&
        shapedSn.lenses.length === shaped.lenses.length &&
        shapedSn.day_narratives.length === shaped.day_narratives.length &&
        shapedSn.forecast?.model_id === 'SEASONAL_NAIVE',
      'H-10: swapping the model changes the numbers and the name, never the structure'
    );
    assert(
      JSON.stringify(shapedSn.lenses[0].points.map(p => p.expectation_value)) !==
        JSON.stringify(shaped.lenses[0].points.map(p => p.expectation_value)),
      'H-11: the Twin genuinely reflects which model was bound'
    );
  }

  console.log('\n====================================================');
  console.log(`CTW-03 RESULTS: ${passCount} passed, ${failCount} failed`);
  console.log('====================================================');
  if (failCount > 0) process.exit(1);
}

runTests().catch(err => { console.error('Fatal test error:', err); process.exit(1); });
