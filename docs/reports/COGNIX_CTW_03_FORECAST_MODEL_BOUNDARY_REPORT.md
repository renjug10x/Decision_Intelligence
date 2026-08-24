# COGNIX `CTW-03` — GOVERNED FORECAST MODEL EXECUTION BOUNDARY — IMPLEMENTATION REPORT

**Work package:** `CTW-03`, taken as WP2-in-sequence on the owner's resequencing decision
**Delivered:** 2026-08-23 · branch `claude/cognix-capability-atlas-v2` · **not merged**
**Corrects:** [`COGNIX_FORECAST_MODEL_TRUTH_RECORD.md`](../governance/COGNIX_FORECAST_MODEL_TRUTH_RECORD.md)
**Governing rulings:** ADR-070 (unamended)

---

## 1. What changed

Before `CTW-03`, **no forecasting model executed anywhere in CogniX**. Selecting a projection method
picked one of three closed-form curves over a loop index; `arima`, `baseline` and an unrecognised
string returned identical numbers.

After `CTW-03` there is a governed boundary — dataset → qualification → fitting → prediction →
uncertainty → validation → the Decision Twin — and **two models that genuinely execute**. The claim
the work package makes is narrow and testable:

> The model named to a user is the implementation that produced the forecast.

---

## 2. The models, and why only two

The owner's instruction was to prefer **one correctly implemented and validated model** over several
weak ones, adding more only where they can be proven through execution and backtesting.

| Model | What it is | Fits? | Interval |
|---|---|---|---|
| **Holt-Winters seasonal** (`HOLT_WINTERS_ADDITIVE`) | ETS(A,A,A) with a weekly cycle. Estimates α, β\*, γ\* by deterministic coarse-to-fine search minimising in-sample one-step squared error; initialised by classical decomposition over **every** complete cycle | **Yes** — 367 candidates evaluated on the governed series | From its own residual variance and the additive-error variance expansion σ²_h = σ²[1 + Σc_j²], with c_j = α + βj + γ·1{j mod m = 0} and the state-space β = αβ\*, γ = γ\*(1−α) |
| **Same weekday last week** (`SEASONAL_NAIVE`) | The standard benchmark, and the MASE denominator that makes two models comparable at all | **No — and it says so.** `fits_parameters: false`, `estimated_parameters: {}` | From the spread of its own seasonal differences, widening by whole cycles |

ARIMA and Prophet are **not** implemented and therefore **not registered, not offered and not
named**. A request for either is refused with `MODEL_NOT_REGISTERED`, identically to a request for
garbage — which is the exact inversion of the defect this work package exists to correct.

**No dependency was added.** Both models are first-party TypeScript; the estate still installs no
statistics or ML library, and every declaration's `runtime` says so.

---

## 3. The measured findings, published rather than tuned away

Two results are uncomfortable and are reported in full, on the artefact and on screen.

**The benchmark beats the fitted model on this series.** On identical rolling-origin folds at h=14:

| Model | MASE | RMSE | Interval coverage |
|---|---|---|---|
| Holt-Winters seasonal | 1.536 | 1,616 | 46% |
| Same weekday last week | **1.493** | **1,537** | 63% |

The governed demand series is a near-stationary weekly pattern with a slight downward drift, which
is a hard case for a smoothing model to beat. `recommendForecastModel` therefore **recommends the
benchmark** for this dataset, with its evidence, while `DEFAULT_FORECAST_MODEL_ID` remains the fitted
model and a caller's explicit choice is never overridden (§23).

**Measured interval coverage is materially below nominal** — 46% and 63% against a nominal 80%. The
cause is that σ is an in-sample one-step estimate and out-of-sample multi-step error is larger. This
is published as a diagnostic, `interval_coverage_near_nominal`, **which is allowed to fail and does**,
and the interval is described everywhere as model-implied and *"not calibrated to realised
coverage"*.

Nothing was widened, refitted, reselected or re-folded to improve either number. Two corrections
*were* made during development, both because they were wrong rather than because they were
unflattering: a seasonal-naive index that read past the end of the series at step 7, and an
initialisation that used two cycles where twelve were available.

---

## 4. Qualification — the question the future ingestion layer must be able to ask

Each model publishes its own dataset requirements in words, **before** it is chosen, so the future
governed intake path can ask *"is this dataset suitable for Holt-Winters?"* rather than only *"is this
CSV valid?"*. Refusals are typed and carry remediation: `INSUFFICIENT_HISTORY`,
`IRREGULAR_FREQUENCY`, `DUPLICATE_PERIODS`, `NON_FINITE_VALUES`, `HORIZON_OUT_OF_RANGE`,
`MODEL_NOT_REGISTERED`, `FIT_DID_NOT_CONVERGE`.

`ForecastDataset` is the seam a future upload plugs into: the engine never reads a file, only a
dataset with provenance. **No upload UI was built**, per scope.

---

## 5. Decision Twin integration — §29 satisfied

The flight projection consumes the boundary and **nothing downstream branches on `model_id`**. Test
H-10 proves it: swapping Holt-Winters for the benchmark changes the numbers and the displayed name
and leaves the structure identical.

A bound forecast sets `allocation_profile: 'FORECAST_SHAPED'` and redistributes the activated
contract's total across the window using the model's per-day shape, normalised to mean 1.

> **Verified: total preserved exactly.** Flat 173,850 → shaped 173,850, with 15 distinct daily
> expectations where there was previously 1.

That is information-preserving in exactly the sense CDI-05 means it, so it is **not a second
baseline** and ADR-070 stands unamended. Without a bound forecast the horizon stays flat and says so.

**`D-FM-6` is resolved, and `CTW-02` is unblocked.** Day 9 now narrates:

> **Day 9 — forecast 7% below the campaign average**
> Holt-Winters seasonal projects 10,780 units of demand and £17,152 of contribution on this day, 7%
> below the campaign average. The declared uncertainty spans 476 units of demand by this point and
> widens further out. **This day has not happened.**

---

## 6. Defect register

Opened and tracked per owner instruction; full disposition in the truth record §5.1.

| Id | Status | Where |
|---|---|---|
| `D-FM-1` empty day in the mean's denominator (7.14%) | **Resolved on the governed path**, open on legacy | Absent periods excluded and **published** as exclusions; a real zero is kept |
| `D-FM-2` frozen `2026-06-04` anchor | **Resolved on the governed path**, open on legacy | Window derived from the data's own coverage |
| `D-FM-3` timezone-skewed weekday table | **Resolved on the governed path**, open on legacy | UTC-only arithmetic; seasonality **estimated**, not looked up. Test F-09 runs the same forecast under UTC, New York and Tokyo and requires identical output |
| `D-FM-4` `arima` = garbage | **Resolved in the boundary**, open on legacy | Unregistered models refused |
| `D-FM-5` `growthRate` carries no history | **Open — does not intersect** | Path-A KPI; the boundary publishes no such KPI |
| `D-FM-6` flat horizon | **Resolved** | `FORECAST_SHAPED` |
| **`D-FM-7`** *(new)* legacy weekday table contradicts its own data — asserts Fri/Sat 1.15 and Mon/Tue 0.88 where the data shows Sat/Sun ≈ 1.18 and Friday 0.928 | **Open** | Found while validating that a fitted seasonality was warranted |

**The legacy `getForecastProjections` path was deliberately not modified.** Retiring it and migrating
the Demand & Forecast surface onto the boundary is a separate change with its own regression surface,
and is an owner decision.

---

## 7. Validation

| Check | Result |
|---|---|
| `tsc --noEmit` | Clean |
| Unit suites | **38 of 38 runners green.** `CTW-03` **77/77**. `CTW-01` unchanged at **65/65**; `CTW-01R` **60/60** with C-20/C-21 **deliberately strengthened** — they no longer assert the horizon is flat, they assert the disclosure matches whatever shape it actually has, plus a new C-22 on the allocation profile. Every other baseline exact |
| Production build | Clean. Three forecast routes registered |
| Governance (`ATL-07`) | `--enforce` → **GOVERNANCE CLEAN, exit 0** |
| Browser | 1024 / 1280 / 1440 — no overflow, no console errors. `GET /api/v1/forecast/models` returns two models each naming its implementation file; `/compare` returns the measured recommendation; the timeline shows *"Forecast model: Holt-Winters seasonal"* with fitted parameters, MASE, measured coverage and the uncertainty basis behind progressive disclosure |

**Selection-to-implementation correspondence is proven by instrumentation, not by inspection.** Test
A-01/A-02 wrap each adapter's own `fit` and `predict`, execute a selection, and require that the
corresponding implementation ran and the other did not. A boundary that merely returned different
numbers would pass a weaker test; this one would fail if selection ever stopped reaching the code.

---

## 8. What was not done

No data upload, no MCP, no connector, no ML or organisational learning, no post-flight training, no
AI key management, no `ESF-4`, no `CTW-02`. The gated `P10-F/G/H/K/L/M` programme is untouched, and
`NOT_LEARNING_DISCLOSURE` is carried on every execution to say so. `ESF-4` remains parked, not
superseded.
