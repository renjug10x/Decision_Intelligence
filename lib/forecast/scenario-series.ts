/**
 * SCI-03R — a scenario's demand history, for the forecast pipeline
 * ───────────────────────────────────────────────────────────────────────────────
 * `R-35` part 1. The Demand surface fits a statistical model to `data/sales_daily.json`, which
 * is ONE seeded estate history running 2026-03-06 → 2026-06-03. That is the reference scenario's
 * own window — `SCN-FRESH-DAIRY-CHEDDAR-001` declares `observed_history_end_date: 2026-06-03` —
 * so while it was the only registered scenario the surface was reading its history and nothing
 * was wrong.
 *
 * `SCN-CHILLED-SALMON-002` runs to 2026-07-15 and `SCN-BAKERY-SOURDOUGH-003` to 2026-09-09. The
 * seeded estate holds no evidence for either window, so both were being shown the reference
 * scenario's population — 699,996 units over the horizon against declared bases of 94,080 and
 * 26,040. Selecting a scenario changed the label on the surface and not the demand under it.
 *
 * What this module does, and the one branch it makes
 * --------------------------------------------------
 * It answers *"what is THIS scenario's demand history?"* and the answer has two shapes, decided by
 * EVIDENCE COVERAGE and never by scenario identity:
 *
 *   OBSERVED  the seeded estate covers the scenario's declared history window, so the observed
 *             series IS its history and is returned untouched. The reference scenario takes this
 *             path, which is why every protected figure is unchanged to the digit.
 *   MODELLED  the seeded estate holds no rows for that window. Inventing observations and calling
 *             them observed is the fabrication ADR-079 forbids, so the series is DERIVED from the
 *             scenario's declared terms and says so in its provenance.
 *
 * That distinction is the one `buildForecastDataset` already draws between a day of zero demand and
 * a day with no rows: absence of evidence is not evidence, and it is reported rather than filled.
 *
 * The modelled series, and where each part of it comes from
 * --------------------------------------------------------
 * Nothing here is authored. Every element traces to a declared scenario input or to the estate's
 * own observed history:
 *
 *   SHAPE   the day-to-day and weekday rhythm of the scenario's OWN CATEGORY in the seeded estate
 *           (`Chilled` for the salmon pack, `Bakery` for the bakery pack). Real observed texture
 *           from the same estate, phase-shifted so each modelled day carries the shape of the same
 *           WEEKDAY — a Saturday reads a Saturday. A flat line would be a different lie.
 *   LEVEL   the scenario's own declared weekly quantity, per measure:
 *             units_sold  → `demand.base_demand_units_per_week`
 *             waste_units → `economics.waste_units_per_week`
 *             revenue     → `base_demand_units_per_week × economics.list_price_gbp`
 *           anchored on the TRAILING SEVEN DAYS, because the declared base is the un-promoted
 *           weekly level at the scenario clock and that is where the clock is.
 *   TREND   the scenario's own declared `UNDERLYING_TREND` movement attribution, applied as a
 *           linear drift across the window. It is applied to the HISTORY rather than added to the
 *           forecast on purpose: the statistical model then picks the trend up itself, which is
 *           what makes this a history the pipeline fits rather than a hand-authored output.
 *   DATES   the scenario's own calendar, ending on its declared `observed_history_end_date`.
 *
 * The committed promotion is deliberately NOT in the history. It is a `COMMERCIAL_INTENT` driver —
 * a decision under consideration, not something that has happened — and `declareScenarioAdjustment`
 * already applies it forward of the clock. Putting it in the history too would count it twice.
 *
 * Determinism
 * -----------
 * There is no `Math.random`, no wall clock, no name or hash derived quantity, and no hard-coded
 * series. The same scenario and the same seeded estate produce a byte-identical dataset, which
 * `run-sci03r-perspective-tests.ts` asserts rather than assumes.
 *
 * Honesty
 * -------
 * `provenance.source` names the derivation and the declared inputs it used, `basis` is
 * `MODELLED_FROM_DECLARED_SCENARIO_TERMS`, and `synthetic_demo` stays true. A modelled history is
 * never presented as observed retailer data.
 *
 * This is NOT `R-30`. `R-30` is a per-scenario EVIDENCE series over `T-90 … T+30` under `SCI-05`'s
 * Refresh contract, carrying materiality and decision relevance. This is the demand history the
 * forecast pipeline fits, and it closes no part of `R-30`'s governed scope.
 */

import { CanonicalScenario } from '../../packages/contracts/src/canonical-scenario-model';
import { ForecastDataset, ForecastObservation } from '../../packages/contracts/src/forecast-model-model';
import { buildForecastDataset, SeriesMeasure, SeriesScope } from './series';

const MS_PER_DAY = 86_400_000;

const epochDay = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00.000Z`) / MS_PER_DAY);
const isoOfEpochDay = (d: number) => new Date(d * MS_PER_DAY).toISOString().slice(0, 10);

/** The declared weekly quantity this measure is levelled on. Each one is on the record. */
function declaredWeeklyLevel(scenario: CanonicalScenario, measure: SeriesMeasure): number {
  switch (measure) {
    case 'waste_units':
      return scenario.economics.waste_units_per_week;
    case 'revenue':
      return scenario.demand.base_demand_units_per_week * scenario.economics.list_price_gbp;
    case 'units_sold':
    default:
      return scenario.demand.base_demand_units_per_week;
  }
}

/**
 * Percentage points of the declared total movement attributed to the underlying trend.
 *
 * Read from the record's own `movement_attribution` by `driver_class`, never by matching the
 * driver's prose — a scenario is free to word its drivers however a merchant would.
 */
function declaredTrendPp(scenario: CanonicalScenario): number {
  return scenario.demand.movement_attribution
    .filter(a => a.driver_class === 'UNDERLYING_TREND')
    .reduce((sum, a) => sum + a.contribution_pp, 0);
}

/** Whether the seeded estate holds evidence for this scenario's declared history window. */
export function observedHistoryCoversScenario(
  scenario: CanonicalScenario,
  observed: ForecastDataset
): boolean {
  const last = observed.observations[observed.observations.length - 1];
  if (!last) return false;
  return epochDay(last.period) >= epochDay(scenario.calendar.observed_history_end_date);
}

/**
 * THE demand history for a scenario, in the shape the forecast pipeline already consumes.
 *
 * Returns the observed dataset unchanged where the estate covers the scenario's window, and a
 * modelled one derived from declared terms where it does not.
 */
export async function buildScenarioForecastDataset(params: {
  scenario: CanonicalScenario;
  scope?: SeriesScope;
  measure?: SeriesMeasure;
  maxObservations?: number;
}): Promise<ForecastDataset> {
  const { scenario } = params;
  const measure = params.measure || 'units_sold';

  const observed = await buildForecastDataset({
    scope: params.scope,
    measure,
    maxObservations: params.maxObservations
  });

  // The estate has evidence for this window. That evidence IS the scenario's history.
  if (observedHistoryCoversScenario(scenario, observed)) return observed;

  /*
   * A caller-supplied scope is a narrowing of the ESTATE, and the estate has no rows in this
   * scenario's window at all, so it cannot also be narrowed. The shape comes from the scenario's
   * own category; where that category has no rows either, the whole estate is the honest fallback
   * and the provenance says which was used.
   */
  const categoryShape = await buildForecastDataset({
    scope: { category: scenario.identity.category },
    measure
  });
  const usedCategory = categoryShape.observations.length > 0;
  const shape = usedCategory ? categoryShape : await buildForecastDataset({ measure });
  const shapeSource = usedCategory ? scenario.identity.category : 'estate';

  if (shape.observations.length === 0) return observed;

  /*
   * Phase-align by WEEKDAY. Both series are contiguous daily, so the weekday offset between them
   * is one constant; dropping that many observations off the oldest end makes every modelled day
   * read the shape of the same weekday without wrapping the series back on itself.
   */
  const shapeEnd = epochDay(shape.observations[shape.observations.length - 1].period);
  const targetEnd = epochDay(scenario.calendar.observed_history_end_date);
  const rotation = ((targetEnd - shapeEnd) % 7 + 7) % 7;

  const usable = shape.observations.slice(0, shape.observations.length - rotation);
  if (usable.length < 8) return observed;

  const count = usable.length;

  /*
   * DE-TREND the borrowed shape before applying the scenario's own.
   *
   * `SCI-05` (`R-36`). The category series carries its own drift, and multiplying the declared
   * trend on top of it left the fitted forward trend as the SUM of the two: `Chilled` rises, so
   * the salmon pack's declared −2.5pp was published as +6.4pp. The shape is borrowed for its
   * WEEKDAY RHYTHM and its texture, not for its direction — the direction is the scenario's, and
   * it is declared.
   *
   * The drift removed is the ordinary least-squares slope through the shape, divided out so the
   * rhythm is preserved exactly and only the trend line is flattened. Deterministic, and derived
   * from the shape itself rather than assumed.
   */
  const shapeValues = usable.map(o => Math.max(0, o.value));
  const n = shapeValues.length;
  const meanX = (n - 1) / 2;
  const meanY = shapeValues.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (i - meanX) * (shapeValues[i] - meanY);
    sxx += (i - meanX) * (i - meanX);
  }
  const slope = sxx > 0 ? sxy / sxx : 0;
  const deTrended = shapeValues.map((v, i) => {
    const fitted = meanY + slope * (i - meanX);
    return fitted > 0 ? v * (meanY / fitted) : v;
  });

  const trendPp = declaredTrendPp(scenario);
  const horizonDays = Math.max(1, scenario.calendar.forecast_horizon_days);
  /*
   * The declared trend is stated as percentage points over the forecast horizon, so a day of it is
   * that divided by the horizon. Going BACK from the clock the drift is undone, which is why a
   * declining trend leaves a history that was higher in the past.
   */
  const trendPerDay = trendPp / 100 / horizonDays;

  const shaped = deTrended.map((v, i) => {
    const daysBeforeEnd = count - 1 - i;
    return v * (1 - trendPerDay * daysBeforeEnd);
  });

  // Anchor the LEVEL on the trailing seven days: the declared base is the weekly level at the clock.
  const trailingWeek = shaped.slice(-7).reduce((s, v) => s + v, 0);
  const declaredWeek = declaredWeeklyLevel(scenario, measure);
  const scale = trailingWeek > 0 ? declaredWeek / trailingWeek : 0;

  const quantise = (v: number) =>
    measure === 'revenue' ? Number(v.toFixed(4)) : Math.round(v);

  const observations: ForecastObservation[] = shaped.map((v, i) => ({
    period: isoOfEpochDay(targetEnd - (count - 1 - i)),
    value: quantise(v * scale)
  }));

  const capped =
    typeof params.maxObservations === 'number' && observations.length > params.maxObservations
      ? observations.slice(observations.length - params.maxObservations)
      : observations;

  return {
    provenance: {
      dataset_id:
        `scenario_history:${scenario.identity.scenario_id}:${measure}:` +
        `${shapeSource}:${capped.length}:${scenario.calendar.observed_history_end_date}`,
      source:
        `Modelled from ${scenario.identity.scenario_id}'s declared terms — weekly level ` +
        `${declaredWeek.toLocaleString('en-GB')} anchored on the trailing seven days, underlying ` +
        `trend ${trendPp}pp over ${horizonDays} days, history ending on its declared ` +
        `${scenario.calendar.observed_history_end_date} — over the observed ` +
        `${shapeSource === 'estate' ? 'estate' : `${shapeSource} category`} weekday shape from ` +
        'data/sales_daily.json. NOT observed retailer data for this scenario: the seeded estate ' +
        'holds no rows in this window, and a modelled history is declared rather than implied.',
      scope: {
        scenario_id: scenario.identity.scenario_id,
        category: scenario.identity.category,
        shape_source: shapeSource,
        basis: 'MODELLED_FROM_DECLARED_SCENARIO_TERMS'
      },
      measure,
      grain: 'DAY',
      first_period: capped[0]?.period ?? '',
      last_period: capped[capped.length - 1]?.period ?? '',
      observation_count: capped.length,
      excluded_periods: [
        ...observed.provenance.excluded_periods,
        ...(rotation > 0
          ? [{
              period: `${shape.provenance.first_period} +${rotation}d`,
              reason:
                `${rotation} day(s) trimmed from the oldest end so every modelled day carries the ` +
                'shape of the same weekday. Dropped rather than wrapped, because wrapping would ' +
                'break the weekday alignment it exists to preserve.'
            }]
          : [])
      ],
      synthetic_demo: true
    },
    observations: capped
  };
}
