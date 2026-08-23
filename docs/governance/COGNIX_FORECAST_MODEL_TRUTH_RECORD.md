# COGNIX FORECAST MODEL TRUTH RECORD

**Document Status:** Approved & Authoritative (evidence record)
**Version:** 2.0.0
**Effective Date:** 2026-08-22 · **Amended 2026-08-23 by `FM-01`** (§0.1, §5.1, §5.2, §6.1, §7)
**Baseline:** `c763aeab` on `claude/cognix-capability-atlas-v2`
**Produced by:** the CTW programme model-truth gate, before any CTW-01R/02/03 code was written.
Findings were gathered across five independent forensic lenses, adversarially verified — 81 claims
survived, 15 were refuted and discarded — and the two most consequential were re-verified by direct
execution against the running engines.

---

## 0. Bottom line

> ## No forecasting model executes anywhere in CogniX today.
>
> No ARIMA. No Prophet. No generative forecasting. No exponential smoothing, Holt-Winters, ETS,
> state-space model, regression, gradient boosting or neural network. **No forecasting or statistics
> library is installed. No Python or R runtime is built or invoked. No fitting code exists in
> first-party source.**

This record exists so that no future work package, report, demo or UI string can describe CogniX as
performing forecasting it does not perform. `CTW-03` is the work package that changes this; until it
lands, everything below is the truth.

---

## 0.1 Amendment — the state after `FM-01` (2026-08-23)

> **§0 above describes the estate before `CTW-03`. It is preserved verbatim as the factual baseline
> and is no longer a description of the current code.**

`CTW-03` built a governed forecast boundary **beside** the legacy path and said so. `FM-01` retires
the legacy path and migrates Demand & Forecast onto that boundary, which changes three of this
record's standing claims:

| Claim in §0–§3 | State after `FM-01` |
|---|---|
| *"No forecasting model executes anywhere in CogniX"* | **Superseded.** Two genuinely execute — `HOLT_WINTERS_ADDITIVE` (ETS(A,A,A), three smoothing parameters estimated by deterministic search) and `SEASONAL_NAIVE` (the benchmark and the MASE denominator). Both are first-party TypeScript; **still no statistics or ML library is installed, and no Python or R runtime exists** |
| *"`lib/query-engine.ts:453` is the sole producer of forecast time series"* | **Superseded.** `getForecastProjections` and `getFutureDays` are **deleted**. The sole producer is `lib/forecast/forecast-engine.ts`, reached by Demand & Forecast through `lib/demand-forecast.ts` and by the Twin through `app/api/v1/campaigns/flight/route.ts` |
| *"Path A publishes no uncertainty at all"* | **Superseded.** Every point carries a model-implied interval and, where the evidence supports one, an empirically calibrated interval measured against held-out backtest error — see §6.1 |

**Two claims are unchanged and remain binding.** No ARIMA, Prophet or generative forecasting exists
or is named. Fitting a statistical model to a time series is **not** organisational learning and does
not begin the gated `P10-F/G/H/K/L/M` programme.

---

## 1. The two projection paths, and what each actually does

There are **two** independent forward-looking paths. Neither fits a model. They must not be
conflated — one carries a model *selector*, the other does not.

### Path A — Demand & Forecast surface (`getForecastProjections`)

`lib/query-engine.ts:453` is the **sole** producer of forecast time series in the repository. One
production call site: `app/api/data/route.ts` `case 'forecast'`.

The `model` parameter selects among **three hard-coded closed-form curves over a loop index**
(`lib/query-engine.ts:495-505`):

| Wire value | Curve | Comment in source |
|---|---|---|
| `prophet`, `seasonality` | `1.0 + sin(i × 0.8) × 0.12` | "Trend & Seasonality cyclical adjustment" — has no trend term and fits nothing |
| `genai`, `adaptive` | `1.0 + sin(i × 1.5) × 0.04 + cos(i × 2.3) × 0.02` | "Adaptive Contextualised multi-factor harmonic adjustment" — harmonic, but neither adaptive nor contextualised |
| `arima`, `baseline`, **and any unrecognised string** | `1.0 − i × 0.005` | "Statistical Moving Average Baseline" — computes no moving average |

Every projected value is:

```text
value = historyAvg × dayOfWeekLiteral × modelFactor × promoUplift × cannRate × eventMultiplier × noise
```

where `historyAvg` is **one arithmetic mean of 14 days** and every other term is a source literal, a
slider, or a function of the loop index. `noise` is `1 + sin(i × 3.14) × 0.01` — deterministic, and
numerically inert because 3.14 ≈ π.

### Path B — Promotion / Continuous Live Decision Twin (CDI-02 → CDI-05 → CTW-01)

No model selector exists on this path at all. The campaign effect is allocated under
`FLAT_RATE_IDENTITY` — a **level shift applied equally to every campaign day**.

**Verified by execution across archetypes:** the campaign-phase index has exactly **one distinct
value** per campaign (`ARCH-CHILLED-ELASTIC` 115.9 on every day; `ARCH-PREMIUM-ARTISAN` 107.01;
`ARCH-SEASONAL-WINDOW` 111.38). The predicted remaining horizon the Twin renders is therefore
**flat by construction, not by forecast**. What varies across the horizon is the declared uncertainty
band, which widens, and nothing else.

---

## 2. Answers to the gate questions

| # | Question | Answer |
|---|---|---|
| 1 | What implementation runs on a model selection? | A three-branch `if/else` over closed-form trigonometric/linear curves. `lib/query-engine.ts:495-505` |
| 2 | What library/runtime executes? | **None.** Plain JS `Math.sin`/`Math.cos` in Node. Zero statistics/ML packages across 123 locked dependencies; all Dockerfiles are `node:20-alpine`; no `.py`/`.R` tracked; no `child_process` in application code |
| 3 | What input data is used? | **One scalar** — the mean of a 14-day window read from `data/sales_daily.json`. Nothing else from data reaches a projection |
| 4 | Fitting/training behaviour? | **None.** No parameter estimation, differencing, autocorrelation, residuals, optimisation, backtest or training step |
| 5 | Prediction behaviour? | One flat scalar pushed through six multiplicative factors, rounded, floored at zero |
| 6 | Uncertainty? | **Path A publishes none at all** — no interval, no standard error, no band. **Path B's band is declared, never calibrated**: `halfWidth = ((100 − confidenceLiteral)/100) × 8 × scale + horizonDaysOut × 0.15 × scale`, stamped `declared_horizon_uncertainty_profile` with `calibration_target` naming the evidence that would calibrate it |
| 7 | Deterministic demo projections? | **Yes, entirely.** No `Math.random()` on either path |
| 8 | Which labels are only representational? | **All of them** — see §3 |
| 9 | DDF/model defect reconciliation | See §4 |
| 10 | What genuinely executes? | **Nothing.** The only genuine statistic in first-party code is a population variance/σ in `demand-frontier-engine.ts`, feeding a *stability* score — descriptive dispersion over a signal stream, not a forecast, and not on either projection path |

---

## 3. Model labels — what reaches a user, and what does not

**No ARIMA, Prophet or GenAI string is rendered to any user.** This is the honest state and it must
be preserved.

- **User-visible (`components/Forecasting.tsx:1080-1082`):** *"Signal-adjusted outlook"*,
  *"Trend and seasonality"*, *"Trend baseline"*. Method-family descriptors naming no vendor and no
  statistical model. They still label plain arithmetic.
- **Wire values — representational only.** `components/Forecasting.tsx:162` maps the three UI options
  to `genai` / `prophet` / `arima` in a query string. Four further live sites: the `model` union and
  two branch conditions in `lib/query-engine.ts`, and the `'arima'` default in
  `app/api/data/route.ts`.
- **Sharpening of the recorded position.** These wire values are **not purely internal**: they travel
  in the request line (`GET /api/data?…&model=genai`), are visible in any DevTools Network tab and in
  server logs, and are compiled verbatim into the shipped client bundle. The
  *"naming debt, not a truthfulness defect"* classification still holds, because no **governed
  contract** consumer sees them and nothing is rendered — but "no API consumer sees them" is true only
  of governed-contract consumers.

**Verified by execution — the sharpest single fact in this record:**

```text
arima             752,437
baseline          752,437
TOTAL_GARBAGE_XYZ 752,437     ← identical
```

`arima` has **no branch of its own**. Selecting "ARIMA" is behaviourally indistinguishable from
passing an unrecognised string. The `else` is not an invalid-input fallback; it is simultaneously the
valid `arima` path and the garbage path.

---

## 4. Reconciliation with the recorded DDF / model defects

**`D-DDF-3`** — *"the ARIMA/Prophet/GenAI model selector is implemented as sine/cosine factors"*
(`MASTER_PLAN.md` DDF-01 defect register; full original statement in the DDF-01 planning report).
The governing ruling is **ADR-040**, whose consequences require the selector to be *"either honestly
relabelled as the deterministic projection shapes it is, or removed."*

| Status | Item |
|---|---|
| **CLOSED** | The user-visible surface. No ARIMA/Prophet/GenAI string is rendered. Recorded closed *"at the surface"* in the forensic status assessment — a deliberate qualifier, not a full closure |
| **CLOSED** | `AC-DDF-26` and `AC-DDF-01` verdicted PASS in the DDF-01 report |
| **NAMING DEBT** | The five live wire-value sites, recorded-but-untracked: on no register, with no successor defect id |
| **OPEN — new** | The guard test cannot detect the residual. `run-ddf01-tests.ts` X9 bans `'ARIMA'`/`'Prophet'`/`'GenAI'` but case-sensitively substring-searches only the JSON of three frontier results — never the source of `Forecasting.tsx`, `query-engine.ts` or the route. The surviving values are doubly out of reach: outside the inspected object, and lowercase against an uppercase match |
| **OPEN — new** | `AC-DDF-26`'s recorded evidence says the strings were removed *"from surface **and engine**"*. They were not removed from the engine. The forensic status assessment is the accurate record; the DDF-01 report overstates |
| **OPEN — new** | `AC-ATL-03-7` claims D-DDF-1/2/3 were all carried into capability limitations. **D-DDF-3 was not** — no capability record in `content/atlas/` carries any limitation about the projection selector |

### 4.1 `D-DDF-3` final closure (`FM-01`, 2026-08-23)

**`D-DDF-3` is closed in full**, at the surface and in the engine, and the three residual findings
above close with it.

| Residual | Disposition |
|---|---|
| The five live wire-value sites — *"naming debt, recorded but untracked"* | **CLOSED.** All five are deleted with the engine and the route case. Nothing translates them; they are refused as unregistered names. `run-fm01-tests.ts` I-01 strips comments from all fifteen files on the forecast path and fails on any surviving occurrence, which is the guard `run-ddf01-tests.ts` X9 could not be |
| `AC-DDF-26`'s evidence overstated the removal as *"from surface **and engine**"* | **NOW TRUE.** The evidence and the code agree for the first time. The overstatement is left recorded above rather than edited away |
| `AC-ATL-03-7` — no capability record carries a limitation about the projection selector | **CLOSED.** `CAP-DEMAND-FORECAST` now records the migration and what the selector was, and `CAP-GOVERNED-FORECAST` records what a registered model means |

---

## 5. Further defects found by this audit, not previously recorded

| Id | Finding | Evidence |
|---|---|---|
| **`D-FM-1`** | **Every Path-A forecast is understated by exactly 7.14%.** The 14-day history window ends on a date with no rows; that day contributes `0` and is still divided into the mean. Verified: values `[…,45982,0]`, mean **45,869.50** including the empty day against **49,397.92** excluding it. The sibling `demand-frontier-engine.ts` explicitly excludes such days with a comment forbidding this exact error | `lib/query-engine.ts:482` |
| **`D-FM-2`** | **The history window is frozen to a hard-coded date.** `new Date('2026-06-04')` anchors five helpers; the window is always 2026-05-22 → 2026-06-04 and never reads the clock | `lib/query-engine.ts:43` |
| **`D-FM-3`** | **Day-of-week seasonality is timezone-skewed.** `new Date('YYYY-MM-DD')` parses as UTC midnight while `getDay()` reads the local weekday. Under `America/New_York` the entire Fri/Sat uplift and Mon/Tue damping shift one calendar day across the whole horizon. No `TZ` is pinned anywhere | `lib/query-engine.ts:486-487` |
| **`D-FM-4`** | **`arima` is indistinguishable from unrecognised input** — verified above | `lib/query-engine.ts:502-504` |
| **`D-FM-5`** | **`kpi.growthRate` carries zero information from history.** `historyAvg` seeds every forecast point and then cancels algebraically in `(forecastAvg − historyAvg)/historyAvg` | `lib/query-engine.ts:508,539` |
| **`D-FM-6`** | **The Twin's predicted horizon is flat by construction.** Under `FLAT_RATE_IDENTITY` every remaining day carries the same expectation — verified as one distinct campaign-phase index value per archetype | `lib/campaign-timeline-engine.ts` |

### 5.1 Defect register and disposition (opened by owner instruction, 2026-08-23)

The owner authorised `CTW-03` with the instruction to **open and track these defects and resolve them
where they intersect `CTW-03`**. Their status at `CTW-03` completion:

| Id | Status after `CTW-03` | Disposition |
|---|---|---|
| **`D-FM-1`** empty day in the mean's denominator | **RESOLVED on the governed path · OPEN on the legacy path** | `lib/forecast/series.ts` excludes a period with no rows and **publishes the exclusion** on `ForecastDataProvenance.excluded_periods`; a real zero is kept, an absence is not. Asserted by `run-ctw03-tests.ts` F-03/F-04. `lib/query-engine.ts:482` is untouched and still understates by 7.14% |
| **`D-FM-2`** frozen `2026-06-04` window anchor | **RESOLVED on the governed path · OPEN on the legacy path** | The governed window is derived from the data's own coverage. Asserted by F-05/F-06. The five legacy helpers are untouched |
| **`D-FM-3`** timezone-skewed day-of-week table | **RESOLVED on the governed path · OPEN on the legacy path** | No local time is read anywhere on the governed path: date arithmetic is UTC-only and seasonality is **estimated from the series** rather than looked up by weekday. Asserted by F-09, which executes the same forecast under `UTC`, `America/New_York` and `Asia/Tokyo` and requires identical output. `lib/query-engine.ts:486-487` is untouched |
| **`D-FM-4`** `arima` indistinguishable from garbage | **RESOLVED in the governed boundary · OPEN on the legacy path** | An unregistered model is **refused**, never served by a default: `MODEL_NOT_REGISTERED`. Asserted by A-06/A-07, which refuse `ARIMA`, `PROPHET`, `GENAI` and garbage identically. The legacy `else` branch is untouched |
| **`D-FM-5`** `kpi.growthRate` carries no information from history | **OPEN — does not intersect `CTW-03`** | It is a Path-A KPI. The governed boundary publishes no growth-rate KPI, so there was nothing to correct here rather than replace |
| **`D-FM-6`** the Twin's predicted horizon is flat by construction | **RESOLVED** | The horizon is now shaped by a governed forecast under the `FORECAST_SHAPED` allocation profile, which redistributes the activated contract's total without changing it. Asserted by H-02/H-03/H-04. **This is what unblocks `CTW-02`** |

**A seventh finding, recorded here by `CTW-03`:** the legacy day-of-week table
(`lib/query-engine.ts:486-492`) asserts Fri/Sat = 1.15 and Mon/Tue = 0.88. Measured against the data
it sits beside, the weekend uplift is **Sat/Sun ≈ 1.18** and **Friday is a weekday at 0.928**. The
hard-coded table is wrong about the series it multiplies. It is recorded as **`D-FM-7`, OPEN**, and
is a further reason the governed path estimates seasonality rather than declaring it.

**The legacy path was deliberately not modified.** `CTW-03` builds the governed boundary beside it;
retiring `getForecastProjections` and migrating the Demand & Forecast surface onto the boundary is a
separate change with its own regression surface, and is raised as an owner decision.

`D-FM-6` was a **constraint on CTW-02**, not a defect — see §6, now satisfied.

### 5.2 Final disposition after `FM-01` (2026-08-23) — the owner authorised the migration

The owner authorised the migration §5.1 raised. `FM-01` retires `getForecastProjections` rather than
correcting it, so five of the six open defects close **by removal of the code that carried them**.
Every closure below is asserted by a regression that reproduces the defect's own mechanism and
requires it to fail (`tests/unit/run-fm01-tests.ts` §D).

| Id | Final status | Root cause | Correction | Regression |
|---|---|---|---|---|
| **`D-FM-1`** empty day in the mean's denominator | **CLOSED** | The 14-day window was anchored one day **past** the source's coverage (`2026-06-04`, where data ends `2026-06-03`). The absent day summed to `0` and was still divided into the mean — an understatement of exactly `1/14 = 7.1429%` | The engine that computed it is deleted. The governed path fits `ForecastDataset`, which excludes a period with no rows **and publishes the exclusion**; a real zero is kept, an absence is not. The dashboard windows are now derived from the data's own last covered day | `D-FM-1a/b/c` — reconstructs the censored window from the current data, measures the understatement at 7.14%, and requires every day the corrected window returns to carry rows |
| **`D-FM-2`** frozen `2026-06-04` window anchor | **CLOSED** | `new Date('2026-06-04')` was hard-coded in five helpers and never read the data or the clock | `getCoverageAnchor()` reads the source's own last covered day once; `daysEndingAt()` derives every window from it. No literal date survives in `lib/query-engine.ts` | `D-FM-2a/b/c` — no hard-coded anchor in source; the two 7-day windows do not overlap and end on real coverage; the dashboard and the governed dataset agree on where the data ends |
| **`D-FM-3`** timezone-skewed day-of-week table | **CLOSED** | `new Date('YYYY-MM-DD')` parses as UTC midnight while `getDay()` reads the local calendar. West of UTC the whole weekly pattern shifted a day — verified under `America/New_York`, where `2026-06-05` (a Friday) returned weekday `4` | The table is deleted with the engine. Date arithmetic on both the governed and the dashboard path is UTC-only, and seasonality is **estimated from the series** rather than looked up by weekday. No local-calendar accessor remains in `lib/query-engine.ts` | `D-FM-3a/b/c` — no local accessor in source; the window is identical under `UTC`, `America/New_York` and `Asia/Tokyo`; the **forecast itself** is byte-identical under all three |
| **`D-FM-4`** `arima` indistinguishable from garbage | **CLOSED** | The `else` branch was simultaneously the valid `arima` path and the unrecognised-input path, so both returned `752,437` | The branch is deleted. An unregistered model is refused with `MODEL_NOT_REGISTERED` on **every** path — the demand route, the Twin route and the boundary itself | `D-FM-4a/b/c` — nine retired wire values and a garbage string are refused identically; two registered models produce two different forecasts |
| **`D-FM-5`** `kpi.growthRate` carried no information from history | **CLOSED** | `historyAvg` seeded every forecast point and then cancelled in `(forecastAvg − historyAvg)/historyAvg`, leaving a figure that was a function of the loop-index curve alone | The KPI is **replaced, not repaired**: `expected_change_pct` compares the model's own per-day expectation against the observed daily mean over the same number of trailing days that carry data. The model's level is fitted rather than seeded, so the comparison genuinely carries history. `baseline_change_pct` publishes the same comparison before any commercial assumption | `D-FM-5a/b/c/d` — the figure differs between two series and between two models; the comparison names both sides and its window; a commercial assumption moves the adjusted figure and leaves the model's own untouched |
| **`D-FM-6`** the Twin's flat predicted horizon | **CLOSED by `CTW-03`** | `FLAT_RATE_IDENTITY` allocation | `FORECAST_SHAPED` | `CTW-03` H-02/H-03/H-04, unchanged |
| **`D-FM-7`** the declared weekday table contradicts its own data | **CLOSED** | The table asserted Fri/Sat `1.15` and Mon/Tue `0.88`. Measured against the series it multiplied: **Sat 1.186, Sun 1.181, Fri 0.928, Mon 0.922, Tue 0.924** — it had Friday, Saturday and Sunday all wrong, and Friday inverted | The table is deleted. The weekly pattern is estimated by classical decomposition over every complete cycle in the supplied series | `D-FM-7a/b/c` — no uplift table in source; the data has Friday below and Sat/Sun above average; the **fitted** weekly indices agree with the data in sign where the declared table did not |

**A defect this pass found and did not open as new.** The retired engine multiplied by
`noise = 1 + sin(i × 3.14) × 0.01`, described in source as *"random micro-variance"*. It is neither
random nor micro-variance — it is deterministic and numerically inert because 3.14 ≈ π. It is
recorded here for completeness and needs no defect identifier, because the code carrying it no longer
exists.

---

## 6. Consequence for the CTW programme — the sequencing finding *(satisfied by `CTW-03`)*

> **Resolved 2026-08-23.** `CTW-03` binds a governed forecast to the campaign horizon, so predicted
> days now differ from one another and a Decision Moment can be derived from evidence rather than
> invented. The analysis below is retained as the reason the programme was resequenced.

`D-FM-6` is the finding the owner most needs before CTW-02.

**CTW-02 asks for Decision Moments** — *"contribution pressure is expected around Day 8"*. A decision
moment is a day that differs materially from the other days. **Under `FLAT_RATE_IDENTITY` no
predicted day differs from any other**, so no such moment can be derived from the projection. The
only genuine future-facing variation available today is:

1. the **declared uncertainty band**, which widens with horizon; and
2. the **trend in observed deviation** on elapsed days.

Extrapolating (2) across the remaining horizon *is itself a forecast model*, and building one inside
CTW-02 would be exactly the fabrication this programme forbids — a model with no name, no fitting and
no validation, invented to make a demo produce moments.

**Therefore:** genuine, day-varying Decision Moments require `CTW-03`'s governed forecast execution to
land first. CTW-02 can honestly deliver decision-moment *structure*, planning, reassessment and
intervention mechanics against the deviation and uncertainty facts that do exist — but it cannot
honestly claim a predicted per-day movement until a real model produces one. This is recorded as an
**owner sequencing decision** at the close of CTW-01R.

---

## 6.1 Uncertainty after `FM-01` — measured, not relabelled

`CTW-03` published measured interval coverage of **46.4%** (Holt-Winters) and **62.5%**
(Seasonal Naive) against a nominal 80%, and refused to widen anything to make the number look
better. That was correct and it was not a fix. `FM-01` measures how wide the interval would have had
to be, on evidence the model never saw, and publishes that **beside** the model's own interval rather
than in place of it. The full ruling is **ADR-072**.

**Method.** Split conformal prediction with a normalised nonconformity score. For every point of
every rolling-origin backtest fold, `s = |actual − forecast| ÷ (model half-width at that step)`;
the multiplier λ is the `⌈(n+1)·0.8⌉/n` quantile of `s`. Dividing by the model's own half-width keeps
the horizon's *shape* the model's and corrects only its scale.

**Measured on the governed demand series** (`data/sales_daily.json`, 90 daily observations, national
scope, units):

| Horizon | Model | Model-implied coverage | λ | Held-out coverage | Sample |
|---|---|---|---|---|---|
| 7 | Holt-Winters seasonal | 60.0% | ×3.39 | 80.0% | 56 points · 8 folds |
| 7 | Same weekday last week | 62.5% | ×1.44 | 82.1% | 56 points · 8 folds |
| 14 | Holt-Winters seasonal | 50.0% | ×2.65 | 81.3% | 112 points · 8 folds |
| 14 | Same weekday last week | 64.3% | ×1.63 | 76.8% | 112 points · 8 folds |
| 30 | Holt-Winters seasonal | 57.2% | ×1.94 | 83.3% | 180 points · 6 folds |
| 30 | Same weekday last week | 78.6% | ×1.05 | 81.9% | 210 points · 7 folds |

*Held-out coverage is leave-one-fold-out: λ is re-estimated without the fold it is scored on, and any
residual sharing a period with that fold is excluded from the estimate.*

**λ = 2.65 is itself a finding.** It is a plain statement that Holt-Winters was two and a half times
more confident than its own out-of-sample errors justified on this series, and it is published on
every execution rather than absorbed silently into a band.

**What this calibration cannot claim**, published on every execution and rendered behind progressive
disclosure:

1. it is calibrated on this series, this measure and this horizon, and does not transfer;
2. it assumes the errors ahead resemble the errors behind, and cannot see a structural break coming;
3. one factor corrects the whole horizon on average, not each step individually;
4. the calibration folds **overlap** beyond a week — that buys sample size and costs independence, so
   the coverage figure is an estimate rather than a measurement of repeated trials;
5. it is a measured range, not a guarantee. Roughly one period in five is expected to fall outside it.

**Where the evidence is too thin, nothing is published.** Below twenty held-out points or three folds
the calibration reports `reliable: false` with its sample size and **no calibrated bounds are
attached to any point** — invariant `F-INV-8` refuses an execution that attaches them anyway.

**The uncomfortable diagnostic was kept.** `interval_coverage_near_nominal` still judges the
**model-implied** interval, still describes it as *"not calibrated to realised coverage"*, and still
fails on this series. A calibration that made an existing failing check pass would have destroyed the
evidence it was built from.

**The Twin's band is unchanged and is still declared.** `CTW-01R`'s
`declared_horizon_uncertainty_profile` is a declared profile, not a calibrated interval, and `FM-01`
did not convert it. What the Twin now also carries is the governed forecast's own backtest and
calibration, on `FlightForecastBinding`, so a reader can see both.

---

## 7. Rules that follow from this record

1. **No surface may name ARIMA, Prophet or GenAI** until an implementation of that name genuinely
   executes and is validated. The current user-visible descriptors are correct and stay.
2. ~~**No CogniX surface, report or demo may describe the current behaviour as forecasting, fitting,
   training or machine learning.** It is deterministic projection over a mean.~~
   **Amended by `FM-01` (2026-08-23).** *Forecasting* and *fitting* are now accurate for the governed
   path and may be said of it. **Training and machine learning remain prohibited**: fitting three
   smoothing parameters by grid search is estimation, not training, and `NOT_LEARNING_DISCLOSURE` is
   carried on every execution to say so. Nothing outside `lib/forecast/` forecasts.
3. **The Twin's flat predicted horizon must be disclosed, not concealed.** `CTW-01R` publishes
   `FLAT_HORIZON_DISCLOSURE` on every projection for exactly this reason.
4. **`CTW-03` must prove selection-to-implementation correspondence** — a test that changes the model
   selection must cause the corresponding real implementation to execute. **Extended by `FM-01`:**
   the same correspondence is now required on the Demand & Forecast path, and is additionally proven
   in the browser — selecting *Same weekday last week* changes the named implementation to
   `lib/forecast/adapters/seasonal-naive.ts`, the execution id, the fit method and the calibration.
5. **Running a statistical model is not organisational learning.** Fitting a model against a series
   is not evidence that CogniX has begun the gated ML programme (`P10-F/G/H/K/L/M`), which remains
   deferred behind attested observation volume.
6. **No decision surface shows a bare confidence percentage** (`FM-01`, ADR-072). The headline is
   *"Forecast range"*, and a range is always described by what it was measured against.
7. **A model identifier names the implementation that ran** (`FM-01`, ADR-071). There is one
   forecasting path in the estate and a name that reaches no implementation reaches no chart.

---

## 8. Explicitly uncertain

| # | Uncertainty | What would settle it |
|---|---|---|
| 1 | The installed `node_modules` tree does not match `package-lock.json` (`tsx`, `esbuild` and two unlocked transitives differ). No statistics library is present either way, so §0 is unaffected | `npm ci` into a scratch directory and diff |
| 2 | ~~Whether `D-FM-1`'s censored-history behaviour is intentional.~~ **Settled by `FM-01`:** the owner authorised the migration and the code carrying it is deleted. Intent is now moot — the window is derived from the data and cannot end on a day the source does not hold | *(closed)* |
| 3 | ~~Whether `D-FM-3`'s timezone skew occurs in the deployed environment.~~ **Settled by `FM-01`:** the question no longer arises. No local-calendar accessor exists on either path, and `D-FM-3c` executes the same forecast under `UTC`, `America/New_York` and `Asia/Tokyo` requiring byte-identical output. Pinning `TZ=UTC` on the container remains good hygiene and is no longer load-bearing | *(closed)* |
| 4 | Whether hard-coded display model ids elsewhere (`'Google Gemini 2.0 Flash'` in `config/experiments.ts`, `'gemini-1.5-flash'` in `ArchitectureExplorer.tsx`) fall under ADR-067's single-governed-model doctrine. Both are rendered and neither matches the governed constant | An ADR-067 amendment or a defect entry |
