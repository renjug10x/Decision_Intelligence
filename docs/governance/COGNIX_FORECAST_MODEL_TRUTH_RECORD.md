# COGNIX FORECAST MODEL TRUTH RECORD

**Document Status:** Approved & Authoritative (evidence record)
**Version:** 1.0.0
**Effective Date:** 2026-08-22
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

`D-FM-1`…`D-FM-5` are **Path A** and are **not** in the CTW programme's authorised scope. They are
recorded here, not fixed, and are raised as owner decisions. `D-FM-6` is Path B and is a
**constraint on CTW-02**, not a defect — see §6.

---

## 6. Consequence for the CTW programme — the sequencing finding

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

## 7. Rules that follow from this record

1. **No surface may name ARIMA, Prophet or GenAI** until an implementation of that name genuinely
   executes and is validated. The current user-visible descriptors are correct and stay.
2. **No CogniX surface, report or demo may describe the current behaviour as forecasting, fitting,
   training or machine learning.** It is deterministic projection over a mean.
3. **The Twin's flat predicted horizon must be disclosed, not concealed.** `CTW-01R` publishes
   `FLAT_HORIZON_DISCLOSURE` on every projection for exactly this reason.
4. **`CTW-03` must prove selection-to-implementation correspondence** — a test that changes the model
   selection must cause the corresponding real implementation to execute.
5. **Running a statistical model is not organisational learning.** Fitting Prophet against a series
   is not evidence that CogniX has begun the gated ML programme (`P10-F/G/H/K/L/M`), which remains
   deferred behind attested observation volume.

---

## 8. Explicitly uncertain

| # | Uncertainty | What would settle it |
|---|---|---|
| 1 | The installed `node_modules` tree does not match `package-lock.json` (`tsx`, `esbuild` and two unlocked transitives differ). No statistics library is present either way, so §0 is unaffected | `npm ci` into a scratch directory and diff |
| 2 | Whether `D-FM-1`'s censored-history behaviour is intentional. The 7.14% depression is arithmetically certain; its intent is recorded nowhere | An owner ruling, or a defect entry |
| 3 | Whether `D-FM-3`'s timezone skew occurs in the deployed environment. Confirmed by execution under `America/New_York`; container `TZ` is unset everywhere | Read `TZ` on the running container, or pin `TZ=UTC` |
| 4 | Whether hard-coded display model ids elsewhere (`'Google Gemini 2.0 Flash'` in `config/experiments.ts`, `'gemini-1.5-flash'` in `ArchitectureExplorer.tsx`) fall under ADR-067's single-governed-model doctrine. Both are rendered and neither matches the governed constant | An ADR-067 amendment or a defect entry |
