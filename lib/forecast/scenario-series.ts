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

/**
 * The basis a modelled history declares. `R-39` reads it to decide where the underlying trend comes
 * from, so it is named once rather than string-matched at each call site.
 */
export const MODELLED_HISTORY_BASIS = 'MODELLED_FROM_DECLARED_SCENARIO_TERMS';

/**
 * Whether this scenario's underlying trend is DECLARED rather than observed.
 *
 * `R-39`. True exactly when the history is modelled from the record — the estate holds no evidence
 * for the scenario's own window, so nothing observed a trend and the record is the only authority
 * for one. False where the history is the estate's own observed series: there the trend is in the
 * evidence, the fitted model measures it, and the record describes what was measured. The question
 * is EVIDENCE COVERAGE and is never scenario identity.
 */
export function trendIsDeclared(dataset: ForecastDataset): boolean {
  return dataset.provenance.scope?.basis === MODELLED_HISTORY_BASIS;
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

  const rotated = shape.observations.slice(0, shape.observations.length - rotation);
  /*
   * WHOLE WEEKS ONLY. A partial week at the oldest end would be normalised against a week it is not,
   * and `initialise` in the Holt-Winters adapter reads its cycles forward from index 0, so a
   * remainder there also offsets every cycle the model measures from every week this normalises.
   * Trimming it is what makes the two alignments the same one.
   */
  const usable = rotated.slice(rotated.length % 7);
  if (usable.length < 8) return observed;

  /*
   * DE-DRIFT the borrowed shape, by normalising every whole week of it to the same weekly total.
   *
   * `SCI-05` (`R-36`) removed the shape's drift by dividing out its ordinary-least-squares line.
   * That flattens the shape GLOBALLY and leaves its local drift intact, which `R-39` measured: over
   * the last twenty-one days of the de-trended `Chilled` series the residual is −0.17%/day, against
   * a declared trend of −0.179%/day. The history therefore carried roughly twice the drift the
   * record declares, and how much depended on what the borrowed category happened to be doing.
   *
   * A weekly normalisation removes drift at the resolution the model actually tracks it — level and
   * trend are updated weekly-seasonally — while preserving the within-week rhythm and the day-to-day
   * texture exactly, because every day is scaled by its own week's factor. Deterministic, derived
   * from the shape itself, and with nothing assumed about the shape's direction.
   *
   * What the borrowed series contributes after this is what it was borrowed for: a Saturday reads
   * like a Saturday, and a quiet Tuesday is still quiet. Its DIRECTION contributes nothing, because
   * the direction is the scenario's own and the scenario declares it.
   */
  const shapeValues = usable.map(o => Math.max(0, o.value));
  const count = shapeValues.length;
  const wholeWeeks = Math.floor(count / 7);
  const weekMean = (week: number) => {
    const from = count - (week + 1) * 7;
    let sum = 0;
    for (let i = from; i < from + 7; i++) sum += shapeValues[i];
    return sum / 7;
  };
  const referenceMean = wholeWeeks > 0 ? weekMean(0) : shapeValues.reduce((a, b) => a + b, 0) / count;
  const deDrifted = shapeValues.map((v, i) => {
    // Weeks are counted BACK from the end, so the newest whole week is week 0 and any partial
    // remainder at the oldest end takes the oldest whole week's factor rather than one of its own.
    const week = Math.min(Math.max(0, wholeWeeks - 1), Math.floor((count - 1 - i) / 7));
    const mean = wholeWeeks > 0 ? weekMean(week) : referenceMean;
    return mean > 0 ? v * (referenceMean / mean) : v;
  });

  /*
   * `R-39`. The declared `UNDERLYING_TREND` is NOT applied here any more.
   *
   * It used to be injected backwards into the history as a linear drift so the statistical model
   * would pick it up. The record states it as a movement of the base across the horizon — the same
   * basis as the commercial intent beside it — and a declared quantity round-tripped through an
   * estimated model comes back as the model's damping rather than as the declaration. It is applied
   * forward of the clock by `scenarioUnderlyingTrendFactor`, which is where the record states it,
   * and the history is left as what it is: this scenario's un-promoted level, carrying the borrowed
   * weekday rhythm and nothing else.
   */
  const trendPp = declaredTrendPp(scenario);
  const horizonDays = Math.max(1, scenario.calendar.forecast_horizon_days);
  const shaped = deDrifted;

  /*
   * Anchor the LEVEL on the declared weekly quantity. With the drift removed week by week, every
   * whole week of the series already carries the same total, so anchoring on the trailing seven days
   * and anchoring on the whole series are the same anchor — which is the point: the level of a
   * scenario's history is a property of its record, not of how much of the history is in view.
   */
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
        `${declaredWeek.toLocaleString('en-GB')}, history ending on its declared ` +
        `${scenario.calendar.observed_history_end_date} — over the observed ` +
        `${shapeSource === 'estate' ? 'estate' : `${shapeSource} category`} weekday shape from ` +
        'data/sales_daily.json, normalised week by week so the borrowed shape contributes rhythm ' +
        `and no direction. The declared underlying trend of ${trendPp}pp over ${horizonDays} days ` +
        'is applied FORWARD of the clock against the declared base, which is where the record ' +
        'states it (`R-39`), and is therefore not a slope in this history. NOT observed retailer ' +
        'data for this scenario: the seeded estate holds no rows in this window, and a modelled ' +
        'history is declared rather than implied.',
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
