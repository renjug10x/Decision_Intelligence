# COGNIX `FM-01` — GOVERNED FORECAST MIGRATION & RELEASE 1.0 HARDENING — IMPLEMENTATION REPORT

**Work package:** `FM-01`, the final engineering pass before owner acceptance of Release 1.0
**Delivered:** 2026-08-23 · branch `claude/cognix-capability-atlas-v2` · **not merged**
**Corrects:** [`COGNIX_FORECAST_MODEL_TRUTH_RECORD.md`](../governance/COGNIX_FORECAST_MODEL_TRUTH_RECORD.md) §5.1
**Governing rulings:** **ADR-071**, **ADR-072** (both new); ADR-040, ADR-070 unamended

---

## 1. What this pass was for

`CTW-03` built a governed forecast boundary **beside** the legacy `getForecastProjections` and said
so plainly: retiring the legacy path was a separate change with its own regression surface, and was
raised as an owner decision. That left the estate in the one state a truth record cannot tolerate for
long — two forecasting paths, one of which fitted nothing.

The owner authorised the migration. `FM-01` retires the legacy path, moves Demand & Forecast onto the
governed boundary, closes the six remaining `D-FM` defects, calibrates the forecast interval against
measured out-of-sample error, registers the delivered CTW capabilities in the Capability Atlas, and
records `IB-13` as delivered.

**One sentence is the whole work package:**

> There is one forecasting architecture in CogniX, the model named to a user is the implementation
> that produced the numbers, and the range beside that number is as wide as its own errors demanded.

---

## 2. The architecture, after

```text
Qualified historical series
        ↓
ForecastDataset + provenance          ← the seam a future upload plugs into
        ↓
Governed model selection              ← the registry; an unregistered name is refused
        ↓
The registered implementation, fitted
        ↓
Per-period forecast
        ↓
Model-implied uncertainty  ·  Empirically calibrated uncertainty
        ↓
Forecast envelope + backtest + diagnostics
        ↓
        ├── Demand & Forecast        (lib/demand-forecast.ts → POST /api/v1/demand/forecast)
        └── Continuous Live Decision Twin  (app/api/v1/campaigns/flight/route.ts)
```

Neither UI computes, adjusts or holds a second notion of a forecast. Nothing outside an adapter
branches on a model identifier.

---

## 3. Defect closure evidence

Each defect was reproduced against the **pre-change** implementation before anything was written. The
reproductions are recorded here because a closure claim without the original measurement is an
assertion.

### `D-FM-1` — every Path-A forecast understated by exactly 7.14%

| | |
|---|---|
| **Original behaviour** | `getLast14Days()` returned `2026-05-22 … 2026-06-04`. The source's last day is `2026-06-03`. The 14th day carried no rows, summed to `0`, and was divided into the mean anyway. Measured on the national units series: history `[…, 45982, 0]`, mean **45,869.50** including the empty day against **49,397.92** excluding it — **7.1429%** low, and identically low for every scope, metric and horizon |
| **Root cause** | The window anchor sat one calendar day past the data's coverage, and the engine could not distinguish *"a day with no rows"* from *"a day with zero demand"* |
| **Correction** | The engine is deleted. The governed path fits a `ForecastDataset`, which excludes a period with no rows and **publishes the exclusion** on `excluded_periods`; a real zero is kept, an absence is not. The dashboard windows are now derived from `getCoverageAnchor()`, the source's own last covered day, so no window can end on a day the data does not hold |
| **Regression test** | `D-FM-1a/b/c` — reconstructs the censored window from the current data, measures the understatement at 7.14%, and requires every day the corrected window returns to carry rows |
| **Live evidence** | The drawn history now ends `2026-06-03`. Before the change the chart's last observed point was a zero the surface had to special-case as `value > 0 ? value : null` to avoid drawing a phantom collapse |
| **Final state** | **CLOSED** |

### `D-FM-2` — the history window frozen to a hard-coded date

| | |
|---|---|
| **Original behaviour** | `new Date('2026-06-04')` in five helpers. The window was always `2026-05-22 → 2026-06-04` and never read the data or the clock |
| **Root cause** | A literal date, written once for a demo and never revisited |
| **Correction** | `getCoverageAnchor()` reads the source's last covered day once and caches it; `daysEndingAt()` derives every window from it with UTC-only arithmetic. No literal date survives in `lib/query-engine.ts` |
| **Regression test** | `D-FM-2a/b/c` — no hard-coded anchor in source; the two 7-day windows are seven days long and do not overlap; the dashboard windows and the governed dataset agree on where the data ends |
| **Live evidence** | Dashboard KPI windows move from `2026-05-29 → 2026-06-04` (six real days and a phantom) to `2026-05-28 → 2026-06-03` (seven real days). This is a deliberate, disclosed change in demonstration figures |
| **Final state** | **CLOSED** |

### `D-FM-3` — day-of-week seasonality skewed by timezone

| | |
|---|---|
| **Original behaviour** | `new Date('YYYY-MM-DD')` parses as UTC midnight; `getDay()` reads the local calendar. Verified under `TZ=America/New_York`: `new Date('2026-06-05').getDay()` returned `4`, where `2026-06-05` is a Friday. The entire Fri/Sat uplift and Mon/Tue damping shifted one calendar day across the whole horizon |
| **Root cause** | Mixing a UTC-parsed instant with a local-calendar accessor |
| **Correction** | The weekday table is deleted with the engine. Date arithmetic on both the governed and the dashboard path is UTC-only, and seasonality is **estimated from the series** rather than looked up by weekday. No local-calendar accessor remains in `lib/query-engine.ts` |
| **Regression test** | `D-FM-3a/b/c` — no local accessor in source; the window is identical under `UTC`, `America/New_York` and `Asia/Tokyo`; the **forecast itself** is byte-identical under all three |
| **Live evidence** | Forecast values are unchanged across container timezones, so pinning `TZ` is now hygiene rather than a correctness dependency |
| **Final state** | **CLOSED** |

### `D-FM-4` — `arima` indistinguishable from an unrecognised string

| | |
|---|---|
| **Original behaviour** | Verified by execution: `arima` → 752,437, `baseline` → 752,437, `TOTAL_GARBAGE_XYZ` → 752,437. `arima` had no branch of its own; the `else` was simultaneously the valid path and the garbage path |
| **Root cause** | A model parameter that selected among curves rather than among implementations, with no registry and no refusal |
| **Correction** | The branch is deleted. A model exists only where an adapter genuinely fits and predicts it, and an unregistered name is refused with `MODEL_NOT_REGISTERED` on every path — the demand route, the Twin route and the boundary |
| **Regression test** | `D-FM-4a/b/c` — nine retired wire values and a garbage string are refused identically; two registered models produce two different forecasts |
| **Live evidence** | `POST /api/v1/demand/forecast` with `model_id: "arima"` → `400 MODEL_NOT_REGISTERED`. `GET /api/data?type=forecast&model=arima` → `410 FORECAST_PATH_RETIRED` naming its replacement |
| **Final state** | **CLOSED** |

### `D-FM-5` — `kpi.growthRate` carried no information from history

| | |
|---|---|
| **Original behaviour** | `historyAvg` seeded every forecast point and then cancelled in `(forecastAvg − historyAvg)/historyAvg`. Measured pre-change: the national series returned `−0.02362136` and the Dairy series `−0.02361583` — two wildly different histories, agreeing to five decimals. The residual difference is `Math.round` noise, not information |
| **Root cause** | Comparing a projection against the very quantity that seeded it |
| **Correction** | The KPI is **replaced, not repaired**. `expected_change_pct` compares the model's own per-day expectation against the observed daily mean over the same number of trailing days that carry data, both sides excluding absent days. The model's level is fitted rather than seeded, so the comparison genuinely carries history. `baseline_change_pct` publishes the same comparison before any commercial assumption, so the assumed part and the modelled part are separable |
| **Regression test** | `D-FM-5a/b/c/d` — the figure differs between two series and between two models; the comparison names both sides and its window; a commercial assumption moves the adjusted figure and leaves the model's own untouched |
| **Live evidence** | On the national revenue series at 14 days: `+20.0%` adjusted, `+0.0%` before commercial assumptions — a plain statement that the entire movement is the declared promotion and none of it is the model. The retired figure could not have said that |
| **Final state** | **CLOSED** |

### `D-FM-7` — the declared weekday table contradicts its own data

| | |
|---|---|
| **Original behaviour** | The table asserted Fri/Sat `1.15` and Mon/Tue `0.88`. Measured against the series it multiplied: **Sat 1.186, Sun 1.181, Fri 0.928, Mon 0.922, Tue 0.924**. It had Friday, Saturday and Sunday wrong, and Friday inverted — it lifted the weakest weekday by 15% |
| **Root cause** | A seasonal pattern declared from intuition rather than estimated from the series |
| **Correction** | The table is deleted. The weekly pattern is estimated by classical decomposition over every complete cycle in the supplied series, then refined by the fitted smoothing recursions |
| **Regression test** | `D-FM-7a/b/c` — no uplift table in source; the data has Friday below and Sat/Sun above average; the **fitted** weekly indices agree with the data in sign where the declared table did not |
| **Final state** | **CLOSED** |

**`D-FM-6`** (the Twin's flat predicted horizon) was closed by `CTW-03` under `FORECAST_SHAPED` and
is unchanged by this pass.

---

## 4. The interval, measured rather than relabelled

`CTW-03` published measured coverage of **46.4%** and **62.5%** against a nominal 80% and refused to
widen anything. That was correct and it was not a fix. `FM-01` measures how wide the interval would
have had to be, on evidence the model never saw, and publishes it beside the model's own.

**Method:** split conformal prediction with a normalised nonconformity score,
`s = |error| ÷ model half-width at that step`, with the `⌈(n+1)·0.8⌉/n` finite-sample quantile.
Dividing by the model's own half-width keeps the horizon's *shape* the model's and corrects only its
scale — a flat additive correction would have flattened exactly the horizon degradation the chart
exists to show.

| Horizon | Model | Model-implied | λ | **Held-out** | Sample |
|---|---|---|---|---|---|
| 7 | Holt-Winters seasonal | 60.0% | ×3.39 | **80.0%** | 56 pts · 8 folds |
| 7 | Same weekday last week | 62.5% | ×1.44 | **82.1%** | 56 pts · 8 folds |
| 14 | Holt-Winters seasonal | 50.0% | ×2.65 | **81.3%** | 112 pts · 8 folds |
| 14 | Same weekday last week | 64.3% | ×1.63 | **76.8%** | 112 pts · 8 folds |
| 30 | Holt-Winters seasonal | 57.2% | ×1.94 | **83.3%** | 180 pts · 6 folds |
| 30 | Same weekday last week | 78.6% | ×1.05 | **81.9%** | 210 pts · 7 folds |

Held-out coverage is leave-one-fold-out: λ is re-estimated without the fold being scored, and any
residual sharing a period with that fold is excluded from the estimate.

**Four decisions that make this defensible rather than decorative:**

1. **λ = 2.65 is published, not absorbed.** It says the fitted model was two and a half times more
   confident than its own out-of-sample errors justified.
2. **The uncomfortable diagnostic was kept.** `interval_coverage_near_nominal` still judges the
   *model-implied* interval, still says *"not calibrated to realised coverage"*, and still fails.
3. **Thin evidence publishes nothing.** Below twenty held-out points or three folds the calibration
   reports `reliable: false` with its sample size and **no calibrated bounds are attached to any
   point**. `F-INV-8` refuses an execution that attaches them anyway.
4. **The metrics backtest was not touched.** A thirty-day horizon over ninety days of history yields
   only two disjoint folds, so the calibration runs its **own** rolling pass at a one-week stride.
   `CTW-03`'s recorded MASE and coverage are therefore preserved **exactly** — asserted by `C-17` and
   `C-18` — and the cost of the denser folds is stated as a limitation on every calibration: the
   held-out points are not independent of one another.

---

## 5. Model identity

The migration is structural rather than cosmetic. `run-fm01-tests.ts` `I-01` strips comments from
fifteen files on the forecast path and fails on any surviving `arima`, `prophet` or `genai` in
executable code — parameters, defaults, client state, selectors and provenance alike. Comments
explaining what was removed are permitted deliberately; a guard that erases a codebase's own history
is a worse guard.

**No compatibility shim was built.** Translating `arima → HOLT_WINTERS_ADDITIVE` was considered and
refused: a translation layer is how a fake model name survives a migration and becomes provenance
again three work packages later.

**Selection-to-implementation correspondence is proven in the browser as well as in the suite.**
Selecting *Same weekday last week* changes the named implementation to
`lib/forecast/adapters/seasonal-naive.ts`, the execution id to `fx_seasonal_naive_e468d0b9`, the fit
method to *"No estimation. The forecast is the observed value from the same weekday"*, and the
calibration to ×1.63 at 76.8% held-out coverage.

---

## 6. Model selection stays measured, and the benchmark still wins

`recommendForecastModel` runs a rolling-origin backtest on identical folds and names a winner only
where every model scored and the MASE gap exceeds the declared margin. On the governed demand series
at h=14 it recommends **Same weekday last week** — MASE **1.493** against Holt-Winters' **1.536** —
and the surface shows that, with the coverage of each interval beside it. A simple benchmark beating
a fitted model is useful evidence about the series, not an embarrassment about the model.

The recommendation is a suggestion with its evidence and **never overrides a choice**. The governed
default remains the fitted model, and the comparison is requested rather than run on every slider
movement, because a planner moving a promotion depth does not need three models refitted.

---

## 7. The Demand & Forecast experience

Rebuilt around one question order — *what do we expect · what changed · how uncertain · why trust it ·
what does it mean for my decision* — in the same visual grammar as the Continuous Live Decision Twin.

**The chart.** The predicted half of the horizon is hatched before any line is read; a labelled
`TODAY` divider separates what happened from what has not; observed history is solid with points and
the forecast is dashed without them, because a point mark reads as a measurement. The calibrated
range is a filled band behind every line. Hovering or selecting any day narrates it in plain language
from governed figures only, with its basis listed.

**The two-line disclosure.** Where a commercial assumption is non-neutral the chart draws the
**model's own expectation** beside the adjusted one. The distance between those two lines is exactly
the part of the outlook nobody measured, and it is the single most useful thing the chart can show a
planner who has just moved a slider.

**Progressive disclosure, in three depths.** Two sentences lead — the model that ran, and what the
range was measured against. One click opens model evidence: implementation path, runtime, execution
id, fitted parameters, training window and exclusions, backtest, calibration with its limitations,
what the model is not, and every diagnostic including the ones that fail. Model comparison is
requested, not resident.

**What the surface refuses.** No bare confidence percentage anywhere. The Decision Gap is a
demand-unit quantity and is **not drawn on a revenue or waste axis** — the surface says so and offers
the switch rather than converting a units ceiling by an average price, which would manufacture a
number the frontier never published. Narration says only what the models can support: there is no
sentence about *why* a day is high, because these models know nothing about weather, price or
holidays.

**What was preserved.** Forecast Stability, Decision Gap, Decision Window, Decision Regret, the
Demand Decision Frontier, the narrative lead, the intervention simulation, Intent/Signal context, the
execution briefing and the proactive risks are all unchanged in semantics. The *Projection method*
control moved out of Scenario and into the model panel, where it is now a real model selector.

---

## 8. Release 1.0 coherence with the Twin

| | Demand & Forecast | Continuous Live Decision Twin |
|---|---|---|
| Observed vs predicted | Hatched region, `TODAY` divider, solid vs dashed | Same |
| Uncertainty | *"Forecast range"*, calibrated where the evidence supports it | Declared profile, rendered **with its basis visible** |
| Model provenance | *"Forecast model: …"* with progressive disclosure | *"Forecast model: …"* with progressive disclosure |
| Narration | Per-day, derived, ending *"This day has not happened."* | Per-day, derived, ending *"This day has not happened."* |
| Centre of gravity | Forecast-centric | Intervention-centric |

They are deliberately not identical. The intelligence language is one language, asserted by
`R-05`…`R-08`.

The Twin's band is **unchanged and still declared**. `FM-01` did not convert it; converting a declared
profile into a calibrated interval would need its own evidence and its own work package.

---

## 9. Capability Atlas

Three capabilities admitted, each with a unique `CAP-*` identity, real implementation and test
citations, published limitations, data provenance, cross-domain reuse assessed honestly, demo
guidance with warnings, and a visual spec:

| Capability | Delivered by | Why it is one capability and not part of another |
|---|---|---|
| `CAP-CONTINUOUS-DECISION-TWIN` | `CTW-01`, `CTW-01R` | The journey itself: activated baseline, elapsed evidence, projected remainder, three declared classes. Usable with no forecast bound and no intervention planned |
| `CAP-GOVERNED-FORECAST` | `CTW-03`, `FM-01` | Its own contract, registry, adapters, routes and suite. Consumed by three surfaces and by nothing that knows it is a campaign |
| `CAP-PREDICTIVE-INTERVENTION` | `CTW-02` | Its own contract, engine, store, four routes and suite. Depends on both of the above and is not implied by either |

**Three, not two and not four.** Decision moments, planning, reassessment and reforecast were assessed
as a single capability rather than split, because none of them is separately usable — a moment with
no plan is a notification and a reforecast with no confirmed intervention has nothing to reforecast
against. The twin and the forecast were assessed as separate because each is genuinely usable without
the other, which is the ADR-052 test.

`CAP-DEMAND-FORECAST` is amended to record the migration, the retired selector and the new
architecture. `AC-ATL-03-7`'s open finding — *no capability record carries a limitation about the
projection selector* — closes with it.

---

## 10. Validation

| Check | Result |
|---|---|
| `tsc --noEmit` | Clean across root, `packages/contracts`, `services/learning`, `services/world` |
| Unit suites | **40 of 40 runners green.** `FM-01` **112/112** (new). `DDF-01` **57/57** (was 56; three projection assertions migrated onto the governed boundary and one added). Every other baseline exact: `CTW-01` 65, `CTW-01R` 60, `CTW-02` 82, `CTW-03` 77, `CDI-01`…`CDI-07B` 21/36/31/49/70/93/155/235, `CDI-08` 44, `ESF-6` 81, `ESF-2` 19, `ESF-3` 22, `IFI-01` 12, `WP10-D` 15, campaign-intelligence 133, campaign-decision-journey 96, decision-dimensions 173, demand-language 21, and the full `ATL` set |
| Production build | Clean |
| Governance (`ATL-07`) | `--enforce` → **GOVERNANCE CLEAN, exit 0** |
| Credential isolation | **HOLDS** — sentinel absent from `.next/static`, from the build output and from the server bundle |
| Browser | 1440 / 1280 / 1024 / 375 — no page-level horizontal overflow at any width, no application console errors |

**One test literal was changed, and it is worth naming.** `run-atl07-tests.ts` D1 asserted
`checked_capabilities === 38`. That was a snapshot, and it drifted the moment the corpus grew. It now
reads `CAPABILITY_REGISTRY.length`, which is the check the assertion was always making.

---

## 11. Browser acceptance

Exercised at 1440, 1280, 1024 and 375.

- Forecast loads; model changed to *Same weekday last week* and the **implementation path, execution
  id, fit method and calibration all changed with it**.
- Model evidence disclosure inspected: parameters, training window (`2026-03-06 → 2026-06-03`, 90
  observations, 0 exclusions), backtest, calibration and diagnostics.
- Comparison requested: `Holt-Winters seasonal 1.536 / 46%` against `Same weekday last week
  1.493 / 63%`, recommendation marked on the benchmark.
- Narration verified on a forecast day (*"69,969 expected, in a range of 65,495 to 74,442 … the range
  is 1.5× as wide as on day one … This day has not happened."*) and on an observed day (*"47,698
  recorded. This day has happened and is not a projection."*).
- Horizons 7 / 14 / 30 exercised; the 30-day range card reports `±7.1%` at 82% held-out coverage.
- Decision Gap, Window, Regret and Stability unchanged and legible; the decision layer toggles on the
  units axis and explains its absence on the others.
- **No legacy model identity leaked** in any request, response or rendered string.
- **Promotion journey smoke-tested end to end after the migration:** configure → review → confirm
  owner and rationale → activate → Campaign In-Flight, with *"Forecast model: Holt-Winters
  seasonal"*, the `TODAY` divider, the Campaign Outlook and a `PREPARE` action all intact.

Two defects were found by this browser pass and fixed: a duplicated full stop where the panel appended
a period to a fit method that already ended in one, and a chart viewBox 24% wider than its container,
which rendered axis labels two points smaller than the surrounding type.

---

## 12. What was not done

No data upload, no connector, no MCP, no new enterprise integration, no media management, no AI key
management UI, no organisational learning, no ML training, no post-flight campaign learning, no
automatic external execution, no `ESF-4`, no new forecasting model, no unrelated Atlas feature.

`NOT_LEARNING_DISCLOSURE` is carried on every execution, and `R-10` asserts the migration touches no
learning or attested-observation path.

**`ESF-4 — Signal Quality, Confidence & Provenance` remains the canonical Master Plan continuation
after Release 1.0.** It is parked, not superseded, and `FM-01` does not unpark it.
