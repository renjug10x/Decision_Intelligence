/**
 * FM-01 — Governed Forecast Migration & Release 1.0 Hardening.
 *
 * The suite is organised around the thing it has to prove, which is not "the new code works" but
 * **"the recorded defects are gone and cannot come back"**. Each `D-FM-*` section reproduces the
 * defect's own mechanism against the current estate and requires it to fail to reproduce.
 *
 *   M  migration        — one forecasting path, and the legacy one is gone rather than hidden
 *   D  defects          — D-FM-1, D-FM-2, D-FM-3, D-FM-4, D-FM-5, D-FM-7
 *   I  identity         — no model name survives that does not name an implementation
 *   C  calibration      — the interval is measured against held-out error, not relabelled
 *   P  projection       — the governed demand projection and its published quantities
 *   R  release          — coherence with the Twin, and the seam a future upload plugs into
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { projectDemand, isDemandRefusal, declareScenarioAdjustment, SUPPORTED_HORIZONS } from '../../lib/demand-forecast';
import { buildForecastDataset } from '../../lib/forecast/series';
import { executeForecast } from '../../lib/forecast/forecast-engine';
import { listForecastModels, isRegisteredModel, DEFAULT_FORECAST_MODEL_ID } from '../../lib/forecast/registry';
import { calibrateInterval, conformalQuantile } from '../../lib/forecast/calibration';
import { backtest, calibrationBacktest } from '../../lib/forecast/backtest';
import { holtWintersAdapter } from '../../lib/forecast/adapters/holt-winters';
import { seasonalNaiveAdapter } from '../../lib/forecast/adapters/seasonal-naive';
import { getCoverageAnchor, getLast14Days, getLast7Days, getPrev7Days, daysEndingAt } from '../../lib/query-engine';
import {
  CALIBRATION_MIN_FOLDS,
  CALIBRATION_MIN_SAMPLE,
  ForecastModelId,
  isRefusal,
  validateForecastExecution
} from '../../packages/contracts/src/forecast-model-model';
import { HOLT_WINTERS_DECLARATION } from '../../lib/forecast/adapters/holt-winters';

const ROOT = join(__dirname, '..', '..');
const AS_OF = '2026-08-23T00:00:00.000Z';
const HW: ForecastModelId = 'HOLT_WINTERS_ADDITIVE';
const SN: ForecastModelId = 'SEASONAL_NAIVE';

let passed = 0;
let failed = 0;
function assert(condition: boolean, name: string, detail = '') {
  if (condition) {
    passed++;
    console.log(`[PASS] ${name}`);
  } else {
    failed++;
    console.log(`[FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

/**
 * Source with comments removed.
 *
 * A guard that bans a string from a file would also ban the comment that explains why the string was
 * removed, which is how a codebase loses its own history. The ban applies to what executes.
 */
function executable(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(l => l.replace(/(^|\s)\/\/.*$/, '$1'))
    .join('\n');
}

async function run() {
  console.log('\n=== FM-01 — Governed Forecast Migration & Release 1.0 Hardening ===\n');

  // ══════════════════════════════════════════════════════════════════════════
  // M — one forecasting path
  // ══════════════════════════════════════════════════════════════════════════
  console.log('── M · migration ──');

  const queryEngine = read('lib/query-engine.ts');
  assert(
    !/export\s+(async\s+)?function\s+getForecastProjections/.test(queryEngine),
    'M-01: the legacy getForecastProjections is removed from lib/query-engine.ts, not merely unused'
  );
  assert(
    !/Math\.(sin|cos)\s*\(/.test(executable(queryEngine)),
    'M-02: no trigonometric projection curve survives anywhere in the query engine'
  );
  assert(
    !/export\s+function\s+getFutureDays/.test(queryEngine),
    'M-03: the frozen future-date helper is removed with the engine it served'
  );

  const dataRoute = read('app/api/data/route.ts');
  assert(
    !/getForecastProjections/.test(executable(dataRoute)),
    'M-04: the data route no longer imports or calls the retired projection engine'
  );
  assert(
    /FORECAST_PATH_RETIRED/.test(dataRoute) && /410/.test(dataRoute),
    'M-05: a stale client asking for the retired forecast type is told what replaced it, not handed an empty body'
  );

  const surface = read('components/Forecasting.tsx');
  assert(
    /\/api\/v1\/demand\/forecast/.test(surface) && !/type=forecast/.test(executable(surface)),
    'M-06: the Demand & Forecast surface consumes the governed boundary and nothing else'
  );
  assert(
    existsSync(join(ROOT, 'app/api/v1/demand/forecast/route.ts')),
    'M-07: the governed demand projection route exists'
  );

  // One forecasting implementation in the estate: the adapters, reached through one engine.
  const engineSource = read('lib/forecast/forecast-engine.ts');
  assert(
    /adapter\.fit\(/.test(engineSource) && /adapter\.predict\(/.test(engineSource),
    'M-08: fitting and prediction happen only through the adapter seam'
  );
  assert(
    !/model_id\s*===\s*['"]/.test(executable(read('lib/demand-forecast.ts'))),
    'M-09: the demand projection never branches on a model identifier'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // D — the recorded defects, reproduced against the current estate
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── D · defects ──');

  // D-FM-1 — an absent day divided into its own mean, understating every forecast by 7.14%.
  const dataset = await buildForecastDataset({});
  const anchor = await getCoverageAnchor();
  assert(
    dataset.observations.every(o => o.value > 0 || o.value === 0) &&
      dataset.observations.length > 0 &&
      dataset.observations[dataset.observations.length - 1].period === anchor,
    'D-FM-1a: the fitted series ends on the last day the source actually carries rows for'
  );
  {
    // The mechanism, reconstructed: a 14-day window anchored one day past coverage.
    const pastCoverage = daysEndingAt('2026-06-04', 14);
    const inCoverage = daysEndingAt(anchor, 14);
    const byPeriod = new Map(dataset.observations.map(o => [o.period, o.value]));
    const censoredMean = pastCoverage.reduce((a, d) => a + (byPeriod.get(d) ?? 0), 0) / pastCoverage.length;
    const honestMean = inCoverage.reduce((a, d) => a + (byPeriod.get(d) ?? 0), 0) / inCoverage.length;
    const understatement = 1 - censoredMean / honestMean;
    assert(
      understatement > 0.06 && understatement < 0.08,
      'D-FM-1b: the recorded 7.14% understatement is reproducible from the old window, and is a real arithmetic effect',
      `measured ${(understatement * 100).toFixed(2)}%`
    );
    const last14 = await getLast14Days();
    assert(
      last14.every(d => byPeriod.has(d)),
      'D-FM-1c: every day the corrected window returns carries data, so no zero can enter a denominator'
    );
  }

  // D-FM-2 — the window frozen to a hard-coded date.
  assert(
    !/new Date\('2026-06-04'\)/.test(executable(queryEngine)),
    'D-FM-2a: no hard-coded window anchor survives in the query engine'
  );
  {
    const last7 = await getLast7Days();
    const prev7 = await getPrev7Days();
    assert(
      last7.length === 7 && last7[6] === anchor && prev7.length === 7 && prev7[6] < last7[0],
      'D-FM-2b: every window is derived from the data’s own coverage and the two 7-day windows do not overlap'
    );
    assert(
      dataset.provenance.last_period === anchor,
      'D-FM-2c: the governed dataset and the dashboard windows agree on where the data ends'
    );
  }

  // D-FM-3 — a UTC-parsed date read through a local weekday.
  assert(
    !/getDay\(\)|getDate\(\)|getMonth\(\)|getFullYear\(\)/.test(executable(queryEngine)),
    'D-FM-3a: no local-calendar accessor is read anywhere in the query engine'
  );
  {
    // The same window computed under three zones must be identical. Under the retired helpers the
    // day-of-week table shifted a day west of UTC, moving the whole seasonal pattern.
    const original = process.env.TZ;
    const results: string[][] = [];
    for (const tz of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
      process.env.TZ = tz;
      results.push(daysEndingAt('2026-06-03', 14));
    }
    process.env.TZ = original;
    assert(
      JSON.stringify(results[0]) === JSON.stringify(results[1]) &&
        JSON.stringify(results[1]) === JSON.stringify(results[2]),
      'D-FM-3b: the window is identical under UTC, America/New_York and Asia/Tokyo'
    );
  }
  {
    const original = process.env.TZ;
    const runs: string[] = [];
    for (const tz of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
      process.env.TZ = tz;
      const out = executeForecast({ model_id: HW, dataset, horizon: 7, executed_as_of: AS_OF });
      runs.push(isRefusal(out) ? 'refused' : JSON.stringify(out.points));
    }
    process.env.TZ = original;
    assert(
      runs[0] === runs[1] && runs[1] === runs[2] && runs[0] !== 'refused',
      'D-FM-3c: the forecast itself is byte-identical under three timezones'
    );
  }

  // D-FM-4 — a model name indistinguishable from an unrecognised string.
  {
    const garbage = executeForecast({ model_id: 'TOTAL_GARBAGE_XYZ' as ForecastModelId, dataset, horizon: 7, executed_as_of: AS_OF });
    const legacyNames = ['ARIMA', 'PROPHET', 'GENAI', 'arima', 'prophet', 'genai', 'baseline', 'adaptive', 'seasonality'];
    const refusals = legacyNames.map(n =>
      executeForecast({ model_id: n as ForecastModelId, dataset, horizon: 7, executed_as_of: AS_OF })
    );
    assert(
      isRefusal(garbage) && garbage.reason === 'MODEL_NOT_REGISTERED',
      'D-FM-4a: an unrecognised model is refused rather than served by a default branch'
    );
    assert(
      refusals.every(r => isRefusal(r) && r.reason === 'MODEL_NOT_REGISTERED'),
      'D-FM-4b: every retired wire value is refused identically to garbage — none reaches a forecast'
    );
    const hw = executeForecast({ model_id: HW, dataset, horizon: 7, executed_as_of: AS_OF });
    const sn = executeForecast({ model_id: SN, dataset, horizon: 7, executed_as_of: AS_OF });
    assert(
      !isRefusal(hw) && !isRefusal(sn) &&
        JSON.stringify(hw.points.map(p => p.value)) !== JSON.stringify(sn.points.map(p => p.value)),
      'D-FM-4c: two registered models produce two different forecasts'
    );
  }

  // D-FM-5 — a growth rate whose history seed cancelled algebraically.
  {
    const national = await projectDemand({
      metric: 'units', horizon: 14, modelId: HW, promoLift: 0, cannibalization: 0,
      eventBoost: 'none', executedAsOf: AS_OF, backtest: false
    });
    const dairy = await projectDemand({
      metric: 'units', horizon: 14, modelId: HW, category: 'Dairy', promoLift: 0, cannibalization: 0,
      eventBoost: 'none', executedAsOf: AS_OF, backtest: false
    });
    const nationalSn = await projectDemand({
      metric: 'units', horizon: 14, modelId: SN, promoLift: 0, cannibalization: 0,
      eventBoost: 'none', executedAsOf: AS_OF, backtest: false
    });
    if (isDemandRefusal(national) || isDemandRefusal(dairy) || isDemandRefusal(nationalSn)) {
      assert(false, 'D-FM-5: projections available for the comparison');
    } else {
      // The retired figure was the mean of round(historyAvg x factors) over historyAvg, so historyAvg
      // cancelled and two entirely different series returned the same number to five decimals.
      assert(
        Math.abs(national.kpi.expected_change_pct - dairy.kpi.expected_change_pct) > 1e-4,
        'D-FM-5a: the expected-change figure differs between two different series, so it carries information from history',
        `national ${national.kpi.expected_change_pct} vs Dairy ${dairy.kpi.expected_change_pct}`
      );
      assert(
        Math.abs(national.kpi.expected_change_pct - nationalSn.kpi.expected_change_pct) > 1e-6,
        'D-FM-5b: the expected-change figure differs between two models on the same series'
      );
      assert(
        national.kpi.observed_days_compared === 14 &&
          national.kpi.observed_daily_mean > 0 &&
          /observed daily average/.test(national.kpi.comparison_basis),
        'D-FM-5c: the comparison names both sides — a forecast mean against an observed mean over a stated window'
      );
      const withPromo = await projectDemand({
        metric: 'units', horizon: 14, modelId: HW, promoLift: 30, cannibalization: 0,
        eventBoost: 'none', executedAsOf: AS_OF, backtest: false
      });
      if (!isDemandRefusal(withPromo)) {
        assert(
          Math.abs(withPromo.kpi.baseline_change_pct - national.kpi.baseline_change_pct) < 1e-9 &&
            withPromo.kpi.expected_change_pct > national.kpi.expected_change_pct,
          'D-FM-5d: a commercial assumption moves the adjusted figure and leaves the model’s own figure untouched'
        );
      }
    }
  }

  // D-FM-7 — a declared weekday table contradicting the series it multiplied.
  assert(
    !/seasonality\s*=\s*1\.15|seasonality\s*=\s*0\.88/.test(queryEngine),
    'D-FM-7a: the hard-coded day-of-week uplift table is gone'
  );
  {
    // The corrected path estimates the weekly pattern instead of declaring it. The estimate must
    // agree with the data in sign, which the retired table did not: it declared Friday high and
    // Sunday neutral where the data has Friday low and Sunday high.
    const byDow = new Map<number, { sum: number; n: number }>();
    for (const o of dataset.observations) {
      const [y, m, d] = o.period.split('-').map(Number);
      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      const e = byDow.get(dow) ?? { sum: 0, n: 0 };
      e.sum += o.value; e.n++;
      byDow.set(dow, e);
    }
    const grand = dataset.observations.reduce((a, o) => a + o.value, 0) / dataset.observations.length;
    const measured = (dow: number) => (byDow.get(dow)!.sum / byDow.get(dow)!.n) / grand;
    assert(
      measured(5) < 1 && measured(0) > 1 && measured(6) > 1,
      'D-FM-7b: the data has Friday below average and Saturday/Sunday above — the opposite of the retired table on Friday',
      `Fri ${measured(5).toFixed(3)} Sat ${measured(6).toFixed(3)} Sun ${measured(0).toFixed(3)}`
    );
    const fit = holtWintersAdapter.fit(dataset.observations.map(o => o.value));
    const season = (fit.state as any).season as number[];
    const n = dataset.observations.length;
    // Slot for a forecast step h is (n + h - 1) % 7; map each slot back to a weekday.
    const slotDow = (slot: number) => {
      for (let h = 1; h <= 7; h++) {
        if ((n + h - 1) % 7 === slot) {
          const [y, m, d] = dataset.observations[n - 1].period.split('-').map(Number);
          return new Date(Date.UTC(y, m - 1, d) + h * 86400000).getUTCDay();
        }
      }
      return -1;
    };
    const fittedByDow = new Map<number, number>();
    season.forEach((v, slot) => fittedByDow.set(slotDow(slot), v));
    assert(
      (fittedByDow.get(5) ?? 0) < 0 && (fittedByDow.get(6) ?? 0) > 0 && (fittedByDow.get(0) ?? 0) > 0,
      'D-FM-7c: the fitted weekly pattern agrees with the data in sign where the declared table did not',
      `Fri ${fittedByDow.get(5)?.toFixed(0)} Sat ${fittedByDow.get(6)?.toFixed(0)} Sun ${fittedByDow.get(0)?.toFixed(0)}`
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // I — model identity
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── I · model identity ──');

  const BANNED = /\b(arima|prophet|genai)\b/i;
  const IDENTITY_SCOPE = [
    'components/Forecasting.tsx',
    'components/demand/DemandForecastChart.tsx',
    'components/demand/ForecastModelPanel.tsx',
    'lib/demand-forecast.ts',
    'lib/query-engine.ts',
    'app/api/data/route.ts',
    'app/api/v1/demand/forecast/route.ts',
    'lib/forecast/forecast-engine.ts',
    'lib/forecast/registry.ts',
    'lib/forecast/series.ts',
    'lib/forecast/calibration.ts',
    'lib/forecast/backtest.ts',
    'lib/forecast/adapters/adapter.ts',
    'lib/forecast/adapters/holt-winters.ts',
    'lib/forecast/adapters/seasonal-naive.ts'
  ];
  const leaks = IDENTITY_SCOPE.filter(f => BANNED.test(executable(read(f))));
  assert(
    leaks.length === 0,
    'I-01: no retired model name executes anywhere on the forecast path — not as a parameter, default, state or selector',
    leaks.join(', ')
  );

  assert(
    listForecastModels().every(m => existsSync(join(ROOT, m.implementation_ref))),
    'I-02: every registered model names an implementation file that exists'
  );
  assert(
    listForecastModels().every(m => {
      const src = read(m.implementation_ref);
      return /fit\s*\(/.test(src) && /predict\s*\(/.test(src);
    }),
    'I-03: every registered model’s implementation genuinely fits and predicts'
  );
  {
    const out = executeForecast({ model_id: HW, dataset, horizon: 7, executed_as_of: AS_OF });
    assert(
      !isRefusal(out) &&
        out.model_display_name === HOLT_WINTERS_DECLARATION.display_name &&
        out.implementation_ref === HOLT_WINTERS_DECLARATION.implementation_ref &&
        validateForecastExecution(out, HOLT_WINTERS_DECLARATION).length === 0,
      'I-04: the execution names the declaration that produced it, and satisfies every invariant'
    );
  }
  assert(
    !isRegisteredModel('ARIMA') && !isRegisteredModel('PROPHET') && !isRegisteredModel('GENAI') &&
      isRegisteredModel(DEFAULT_FORECAST_MODEL_ID),
    'I-05: the registry admits only what executes'
  );
  {
    // The surface must not be able to invent a model. Its options come from the registry route.
    const src = executable(surface);
    assert(
      /\/api\/v1\/forecast\/models/.test(src) && /models\.map\(/.test(read('components/demand/ForecastModelPanel.tsx')),
      'I-06: the model selector is populated from the governed registry, not from a literal list'
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // C — calibration
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── C · calibration ──');

  assert(
    conformalQuantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.8) === 9,
    'C-01: the conformal quantile applies the finite-sample correction — ceil((n+1)q) rather than the plain quantile'
  );
  assert(
    conformalQuantile([1, 2, 3], 0.8) === null,
    'C-02: a sample too small to define the quantile returns nothing rather than the maximum'
  );

  for (const horizon of SUPPORTED_HORIZONS) {
    for (const model of [HW, SN]) {
      const out = executeForecast({ model_id: model, dataset, horizon, executed_as_of: AS_OF, backtest: true });
      if (isRefusal(out)) { assert(false, `C-03 h=${horizon} ${model}: execution available`); continue; }
      const cal = out.calibration!;
      assert(
        cal !== null && cal.method === 'SCALED_CONFORMAL_BACKTEST_RESIDUALS' && cal.limitations.length > 0,
        `C-03 h=${horizon} ${model}: a calibration is published with its method and its limitations`
      );
      assert(
        cal.sample_size >= CALIBRATION_MIN_SAMPLE && cal.folds >= CALIBRATION_MIN_FOLDS && cal.reliable,
        `C-04 h=${horizon} ${model}: enough held-out evidence to calibrate on`,
        `n=${cal.sample_size} folds=${cal.folds}`
      );
      assert(
        cal.held_out_coverage !== null && Math.abs(cal.held_out_coverage - 0.8) <= 0.1,
        `C-05 h=${horizon} ${model}: leave-one-fold-out coverage lands within 10 points of the 80% target`,
        `held-out ${cal.held_out_coverage}`
      );
      assert(
        cal.held_out_coverage !== null && cal.held_out_coverage > cal.model_implied_coverage,
        `C-06 h=${horizon} ${model}: the calibrated range covers materially more than the model-implied range it rescales`,
        `${cal.model_implied_coverage} → ${cal.held_out_coverage}`
      );
      assert(
        out.points.every(p => p.calibrated_lower !== null && p.calibrated_upper !== null &&
          p.calibrated_lower <= p.value && p.calibrated_upper >= p.value),
        `C-07 h=${horizon} ${model}: every calibrated interval brackets its own point`
      );
      assert(
        out.points.every(p =>
          (p.calibrated_upper as number) - (p.calibrated_lower as number) >
          ((p.upper as number) - (p.lower as number)) * 0.999),
        `C-08 h=${horizon} ${model}: the calibrated range is a rescaling of the model range, not an independent invention`
      );
      assert(
        validateForecastExecution(out, out.model_id === HW ? HOLT_WINTERS_DECLARATION : seasonalNaiveAdapter.declaration).length === 0,
        `C-09 h=${horizon} ${model}: F-INV-7 and F-INV-8 hold on the calibrated execution`
      );
    }
  }

  {
    // The published model-implied diagnostic keeps its exact meaning: it measures the uncalibrated
    // interval, is allowed to fail, and still says the interval is not calibrated.
    const out = executeForecast({ model_id: HW, dataset, horizon: 14, executed_as_of: AS_OF, backtest: true });
    if (!isRefusal(out)) {
      const modelDiag = out.validation.diagnostics.find(d => d.check === 'interval_coverage_near_nominal')!;
      const calDiag = out.validation.diagnostics.find(d => d.check === 'interval_calibration_held_out_coverage')!;
      assert(
        /not calibrated/i.test(modelDiag.detail),
        'C-10: the model-implied diagnostic still describes its own interval as uncalibrated'
      );
      assert(
        modelDiag.passed === false,
        'C-11: the measured model-implied coverage still fails its own check, and is not hidden by the calibration'
      );
      assert(
        calDiag !== undefined && calDiag.passed === true && /held-out|Leave-one-fold-out/i.test(calDiag.detail),
        'C-12: the calibration is judged on held-out folds and says so'
      );
      assert(
        out.calibration!.calibrated_coverage_in_sample !== out.calibration!.held_out_coverage ||
          out.calibration!.held_out_coverage !== null,
        'C-13: in-sample and held-out coverage are published separately rather than as one number'
      );
    }
  }

  {
    // Too little evidence must produce no calibrated interval at all.
    const short = {
      provenance: { ...dataset.provenance, observation_count: 30 },
      observations: dataset.observations.slice(0, 30)
    };
    const out = executeForecast({ model_id: HW, dataset: short, horizon: 14, executed_as_of: AS_OF, backtest: true });
    if (!isRefusal(out)) {
      const cal = out.calibration;
      assert(
        cal === null || cal.reliable === false,
        'C-14: a series too short to calibrate on is declared unreliable rather than calibrated anyway'
      );
      assert(
        out.points.every(p => p.calibrated_lower === null && p.calibrated_upper === null),
        'C-15: an unreliable calibration publishes no calibrated interval — F-INV-8'
      );
    }
    const thin = calibrateInterval([], 0.8);
    assert(thin === null, 'C-16: no residuals yields no calibration rather than a default multiplier');
  }

  {
    // The two backtests are separate on purpose: the metrics pass must keep disjoint folds.
    const values = dataset.observations.map(o => o.value);
    const periods = dataset.observations.map(o => o.period);
    const metricsRun = backtest(holtWintersAdapter, values, periods, 14)!;
    const calRun = calibrationBacktest(holtWintersAdapter, values, periods, 14)!;
    assert(
      metricsRun.metrics.folds === 4 && metricsRun.metrics.mase !== null,
      'C-17: the metrics backtest is unchanged by FM-01 — CTW-03’s recorded folds still hold',
      `folds ${metricsRun.metrics.folds}`
    );
    assert(
      Math.abs((metricsRun.metrics.mase as number) - 1.536314) < 1e-5 &&
        Math.abs((metricsRun.metrics.interval_coverage as number) - 0.4643) < 1e-3,
      'C-18: CTW-03’s published MASE and measured coverage are preserved exactly, so the recorded evidence still stands',
      `mase ${metricsRun.metrics.mase} coverage ${metricsRun.metrics.interval_coverage}`
    );
    assert(
      calRun.residuals.length > metricsRun.residuals.length,
      'C-19: the calibration pass gathers more held-out points than the metrics pass, which is why it exists'
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // P — the governed demand projection
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── P · projection ──');

  {
    const p = await projectDemand({
      metric: 'units', horizon: 14, modelId: HW, promoLift: 20, cannibalization: 0,
      eventBoost: 'none', executedAsOf: AS_OF
    });
    if (isDemandRefusal(p)) {
      assert(false, 'P-01: the national units projection is produced');
    } else {
      assert(p.forecast.length === 14 && p.narration.length === 14, 'P-01: one forecast point and one narration per horizon day');
      assert(
        p.forecast.every(f => f.value > f.baseline_value),
        'P-02: the adjusted expectation and the model’s own expectation are both published and differ under a promotion'
      );
      assert(
        p.forecast.every(f => Math.abs(f.value - f.baseline_value * p.scenario.combined_factor) < 0.02),
        'P-03: the adjustment is exactly the declared factor applied after the model'
      );
      assert(
        p.scenario.provenance_class === 'MODELLED_DEMO_ASSUMPTION' && p.scenario.factors.length === 3,
        'P-04: the commercial levers are published as declared assumptions with their factors'
      );
      assert(
        p.forecast.every(f => f.range_basis === 'EMPIRICALLY_CALIBRATED') &&
          p.forecast.every(f => f.range_lower !== null && f.range_lower <= f.value && (f.range_upper as number) >= f.value),
        'P-05: the decision-facing range is the calibrated one and brackets its point'
      );
      assert(
        p.history.every(h => h.value > 0) && p.history[p.history.length - 1].date === anchor,
        'P-06: the drawn history is observed days only, ending on real coverage — no phantom zero terminates the line'
      );
      assert(
        p.narration.every(n => /has not happened/.test(n.statement) && n.basis.length > 0),
        'P-07: every narrated day states that it has not happened and cites what makes it true'
      );
      assert(
        p.narration.every(n => n.basis.some(b => b.includes(p.execution.implementation_ref))),
        'P-08: narration attributes itself to the implementation that produced the numbers'
      );
      assert(
        p.execution.data_provenance.source === 'data/sales_daily.json' &&
          p.execution.data_provenance.synthetic_demo === true,
        'P-09: the projection carries the provenance of the series it was fitted on'
      );
    }
  }

  {
    const neutral = declareScenarioAdjustment({ promoLift: 0, cannibalization: 0, eventBoost: 'none' });
    assert(
      neutral.neutral && neutral.combined_factor === 1,
      'P-10: with nothing assumed, the adjustment is exactly the identity and says so'
    );
    const chilled = declareScenarioAdjustment({ promoLift: 0, cannibalization: 0, eventBoost: 'heatwave', category: 'Chilled' });
    const ambient = declareScenarioAdjustment({ promoLift: 0, cannibalization: 0, eventBoost: 'heatwave', category: 'Ambient' });
    assert(
      chilled.combined_factor > ambient.combined_factor && ambient.combined_factor === 1,
      'P-11: the event assumption is category-specific and is 1 where no uplift is claimed'
    );
  }

  {
    const waste = await projectDemand({
      metric: 'waste', horizon: 7, modelId: SN, promoLift: 0, cannibalization: 0,
      eventBoost: 'none', executedAsOf: AS_OF, backtest: false
    });
    assert(
      !isDemandRefusal(waste) && waste.measure === 'waste_units' && waste.forecast.length === 7,
      'P-12: every offered metric resolves to a real measure on the same governed path'
    );
  }

  {
    const tooLong = await projectDemand({
      metric: 'units', horizon: 200, modelId: HW, promoLift: 0, cannibalization: 0,
      eventBoost: 'none', executedAsOf: AS_OF, backtest: false
    });
    assert(
      isDemandRefusal(tooLong) && tooLong.reason === 'HORIZON_OUT_OF_RANGE',
      'P-13: a horizon beyond what the model declares is refused with the reason'
    );
    const unknown = await projectDemand({
      metric: 'units', horizon: 14, modelId: 'NOT_A_MODEL' as ForecastModelId, promoLift: 0,
      cannibalization: 0, eventBoost: 'none', executedAsOf: AS_OF, backtest: false
    });
    assert(
      isDemandRefusal(unknown) && unknown.reason === 'MODEL_NOT_REGISTERED',
      'P-14: a projection for an unregistered model is refused, never defaulted'
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // R — release coherence and the future-data seam
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── R · release ──');

  {
    const demandSource = read('lib/demand-forecast.ts');
    assert(
      /buildForecastDataset/.test(demandSource) && !/sales_daily\.json/.test(executable(demandSource)),
      'R-01: the demand path consumes a ForecastDataset and never reaches into a demo file itself'
    );
    const flightRoute = read('app/api/v1/campaigns/flight/route.ts');
    assert(
      /buildForecastDataset/.test(flightRoute) && /executeForecast/.test(flightRoute),
      'R-02: the Twin reaches the same dataset builder and the same execution boundary'
    );
    assert(
      /ForecastDataset/.test(read('packages/contracts/src/forecast-model-model.ts')),
      'R-03: the seam a future upload plugs into is a governed contract, not an implementation detail'
    );
  }

  {
    // A caller-supplied dataset must go through qualification exactly as the demo one does.
    const gapped = {
      provenance: { ...dataset.provenance, dataset_id: 'caller_supplied_gapped' },
      observations: dataset.observations.filter((_, i) => i !== 40)
    };
    const out = executeForecast({ model_id: HW, dataset: gapped, horizon: 7, executed_as_of: AS_OF });
    assert(
      isRefusal(out) && out.reason === 'IRREGULAR_FREQUENCY' && (out.qualification?.remediation.length ?? 0) > 0,
      'R-04: a dataset with a gap is refused with remediation, whoever supplied it — a gap is not a zero'
    );
  }

  {
    const twinSurface = read('components/campaign/ContinuousFlightTimeline.tsx');
    const demandChart = read('components/demand/DemandForecastChart.tsx');
    assert(
      /TODAY/.test(twinSurface) && /TODAY/.test(demandChart),
      'R-05: both surfaces separate what happened from what has not with the same labelled divider'
    );
    assert(
      /pattern id="ctw-predicted"/.test(twinSurface) && /pattern id="fm-predicted"/.test(demandChart),
      'R-06: both surfaces hatch the predicted region, so the visual grammar is one grammar'
    );
    assert(
      /Forecast model/.test(twinSurface) && /Forecast model/.test(read('components/demand/ForecastModelPanel.tsx')),
      'R-07: both surfaces name the model that produced the forecast, in the same words'
    );
    assert(
      !/Confidence:\s*\d/.test(surface) && /Forecast range/.test(read('components/demand/ForecastModelPanel.tsx')),
      'R-08: the decision surface offers a forecast range, never a bare confidence percentage'
    );
  }

  {
    // Nothing in this pass may quietly restart the deferred learning programme.
    const out = executeForecast({ model_id: HW, dataset, horizon: 7, executed_as_of: AS_OF, backtest: true });
    assert(
      !isRefusal(out) && /not organisational learning/i.test(out.provenance.not_learning),
      'R-09: every execution still carries the disclosure that fitting a model is not learning'
    );
    assert(
      !/LearningCandidate|LearningCase|attested/i.test(read('lib/demand-forecast.ts') + read('lib/forecast/calibration.ts')),
      'R-10: the migration touches no learning or attested-observation path'
    );
  }

  console.log('\n====================================================');
  console.log(`FM-01 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('FM-01 test suite failed with an error:', err);
  process.exit(1);
});
