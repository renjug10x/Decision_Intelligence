# COGNIX `CTW-01R` — CAMPAIGN DECISION EXPERIENCE — IMPLEMENTATION REPORT

**Work package:** `CTW-01R`, WP1 of the owner's CTW structured implementation programme
**Delivered:** 2026-08-23 · branch `claude/cognix-capability-atlas-v2` · **not merged**
**Preceded by:** the programme's model-truth gate —
[`COGNIX_FORECAST_MODEL_TRUTH_RECORD.md`](../governance/COGNIX_FORECAST_MODEL_TRUTH_RECORD.md)
**Governing rulings:** ADR-070 (unamended)

---

## 1. The truth gate came first, and it changed the programme

Before any code, the programme's critical model-truth gate was run as a five-lens forensic audit with
adversarial verification — 81 claims survived, 15 were refuted and discarded — and its two most
consequential findings were re-verified by direct execution.

**The finding: no forecasting model executes anywhere in CogniX.** No ARIMA, no Prophet, no
generative forecasting, no statistics library, no Python or R runtime, no fitting code. What a
"projection method" selects is one of three closed-form curves over a loop index, multiplied into a
single 14-day arithmetic mean. Verified by execution:

```text
arima             752,437
baseline          752,437
TOTAL_GARBAGE_XYZ 752,437     ← identical
```

`arima` has no branch of its own; selecting it is behaviourally indistinguishable from passing an
unrecognised string. **No ARIMA/Prophet/GenAI label reaches a user** — the UI offers
*"Signal-adjusted outlook" / "Trend and seasonality" / "Trend baseline"* — so the recorded `D-DDF-3`
closure "at the surface" stands; the residual is five wire-value sites.

Six further defects were found and recorded but **not fixed** (out of CTW scope): every Path-A
forecast is understated by exactly **7.14%** because an empty day sits in the mean's denominator
(verified: 45,869.50 against 49,397.92); the history window is frozen to a hard-coded date; the
day-of-week table is timezone-skewed; `kpi.growthRate` carries no information from history.

**The finding that reshaped the programme (`D-FM-6`):** the Twin's predicted horizon is **flat by
construction**. Under `FLAT_RATE_IDENTITY` the campaign-phase index has exactly **one distinct
value** per campaign — 115.9, 107.01, 111.38 across archetypes. Consequences for `CTW-02` are in §7.

---

## 2. Decision Confirmation — governed choices, unchanged provenance

`CTW-01` asked a human resolver for two free-text strings. Both are load-bearing `CDI-07A`
provenance and neither was answerable by a Promotion Analyst without knowing what the system wanted.

| Before | After |
|---|---|
| *Who is deciding* — empty box | **Decision owner** — six governed roles, custom permitted, helper *"Who is accountable for approving this campaign decision?"* |
| *What is the reason* — empty box | **Decision rationale** — six governed reasons plus optional context, helper *"What is the primary reason for selecting this option?"* |
| No explanation of why | *"CogniX has identified more than one viable option. The evidence does not justify choosing one automatically, so a person must confirm how to proceed."* |

**The provenance is identical.** The answers still become `resolved_by` and `resolution_statement`
under `HUMAN_RESOLVED`. Free text **qualifies** the governed reason rather than replacing it
(`Protect margin — London stores only`), so the structured reason always survives; only `OTHER`
carries the analyst's words alone. An empty custom owner resolves to nothing rather than to the word
"Other". The refusal names which of the three answers is still missing, rather than restating the
rule.

Deliberately not a training form: two selects, one optional line.

---

## 3. Promotion experiment lifecycle — on the existing architecture

**No competing history model was created.** `CampaignDecisionExperiment`,
`saveCampaignExperimentClient` and `ExperimentHistoryDrawer` are reused exactly as the Campaign
Decision Canvas uses them, including the one-decision-one-record rule: the first preservation asks
the server for an identity and every later one sends it back.

**New promotion experiment** closes the record in progress — *preserved, never deleted* — through a
new minimal route, `POST /api/v1/campaigns/experiments/close-active`. It is deliberately **not** the
session reset: a reset also clears campaign intents, decision contracts, pre-mortems, learning
candidates and shared decision state, and the Campaign Decision Canvas **shares this tenant and
session** (`tenant_uk_retail_01` / `sess_001`), so resetting from Promotion would silently discard a
decision being drafted on another screen. Starting a new promotion experiment is not a reason to do
that.

**Stage is derived, never stored:** `Draft` → `Activated` → `In flight`, from whether an active
contract exists and whether any day has elapsed.

**`COMPLETED` is deliberately absent.** A campaign completes when every day of its window has
elapsed, and `current_day < flight_days` in **all seven** archetypes — so nothing in this build can
pass a campaign's final day. A completed stage would be a state no record could reach.
`PROMOTION_STAGE_NOT_DERIVABLE` publishes the reason, and the suite (B-08) asserts the underlying
claim **against the archetype data** rather than trusting the prose.

The state model is shaped so `CTW-02` intervention history and future post-flight comparison extend
it: interventions become further preserved snapshots on the same record, and comparison is the
existing 2–4 way `ExperimentComparison`.

---

## 4. Narrated timeline — derived, never authored

Every day of the horizon carries a `FlightDayNarrative` built in the **engine** from the governed
figures: headline, statement, attention state, the reason for that state, both lens readings, the
supplementary readings, and the basis list naming what it was derived from.

**Nothing is authored per campaign or per day**, and the suite proves it rather than asserting it
(C-13): the same day is narrated twice on different telemetry and must produce a different headline
*and* a different statement. Threshold behaviour is checked at the boundaries it declares (C-15…C-18),
in both directions.

**Attention follows the size of the departure from the activated plan, in either direction.**
Direction decides the wording, not the severity — a campaign running well ahead of the decision that
was activated has departed from it just as surely as one running behind, and the analyst is entitled
to know either way. Thresholds are declared constants (`2%` monitor, `5%` attention) and every
narration names them in `attention_reason`, so the judgement is auditable rather than trusted.

The divergent case is named specifically, because it is the one worth naming:

> **Day 5 — running above the activated plan** · NEEDS ATTENTION
> Demand came in at 12,406 units, +7.0% above the 11,590 units the activated decision expected, and
> contribution at £19,669, +6.7% above the £18,440 expected. This is a material departure from the
> decision that was activated and warrants attention.

A predicted day narrates its own limits:

> **Day 10 — expected to hold at the activated plan**
> CogniX expects 11,590 units of demand and £18,440 of contribution on this day — **the same as
> every other remaining day, because the activated plan applies its effect evenly across the
> campaign.** The declared uncertainty spans 529 units of demand by this point and widens further
> out. **This day has not happened.**

That paragraph is the `D-FM-6` truth put in front of the analyst instead of hidden behind a flat
line. `FLAT_HORIZON_DISCLOSURE` is published on every projection, and C-21 asserts the disclosure is
**true of the data** — it fails if the projection ever stops being flat.

---

## 5. Duplication removed, nothing lost

The five-day telemetry card strip and the continuous timeline showed the same campaign twice. The
strip is retired and the timeline is the visual hero. **Everything the strip carried moved into the
day detail**, each with its own basis:

| Strip datum | Now |
|---|---|
| Demand index, observed vs expected | Day detail — against the **activated decision**, not the seeded expectation |
| Daily margin | Day detail as contribution, same treatment |
| Depot stock | Supplementary reading, labelled *"Stock is not projected — a stock trajectory would need a declared depletion basis, which nothing in this build supplies"* |
| Deviation status (`MILD_DRIFT` etc.) | Supplementary reading *"World model day status"*, explicitly distinguished: *"It is not CogniX's assessment against the activated decision — that is derived separately, from the deviation above"* |

Group D of the suite asserts each of these is present on every elapsed day, that every supplementary
reading carries a basis, and that a day which has not happened carries **no** telemetry reading.

---

## 6. Also fixed — a pre-existing horizontal overflow

The planning view overflowed horizontally below ~1240px: seven `nowrap` archetype chips forced a
minimum page width that the row's existing `overflowX: auto` did not relieve. Two `flexWrap: 'wrap'`
declarations fix it.

**It was not introduced by this work package, and `CTW-01`'s validation could not have caught it** —
that validation was performed on the in-flight view, where the configuration block is not rendered.
Isolated by measurement: hiding the activation panel changed the page width not at all (1042 → 1042),
while hiding the chip row changed it from 1280 → 1042.

---

## 7. Consequence for `CTW-02` — owner sequencing decision required

**A Decision Moment is a day that differs materially from the other days. Under `FLAT_RATE_IDENTITY`
no predicted day differs from any other.** The example in the programme brief —
*"contribution pressure is expected around Day 8"* — cannot be derived from the current projection,
because Day 8 is identical to Day 7 and Day 9.

The only genuine future-facing variation available today is the declared uncertainty band, which
widens, and the trend in observed deviation on elapsed days. **Extrapolating that trend across the
remaining horizon is itself a forecast model**, and building one inside `CTW-02` would be exactly the
fabrication this programme forbids: a model with no name, no fitting and no validation, invented to
make a demo produce moments.

Three options for the owner:

1. **`CTW-03` before `CTW-02`.** Land governed forecast execution first, then decision moments rest
   on real per-day variation. Recommended.
2. **`CTW-02` narrowed.** Deliver decision-moment structure, planning, conditional modes,
   reassessment, apply-and-reforecast and the campaign story against the deviation and uncertainty
   facts that exist — with moments derived from *observed* deviation and *declared uncertainty*, and
   the surface stating plainly that no predicted per-day movement is modelled yet.
3. **`CTW-02` as briefed.** Not recommended: it cannot be delivered honestly at this baseline.

---

## 8. Validation

| Check | Result |
|---|---|
| `tsc --noEmit` | Clean |
| Unit suites | **37 of 37 runners green.** `CTW-01R` **59/59** first run. Every recorded baseline matched exactly, and **`CTW-01` unchanged at 65/65** — the projection semantics this work package promised not to touch |
| Production build | Clean. `/api/v1/campaigns/experiments/close-active` registered |
| Governance (`ATL-07`) | `atlas-governance-check --enforce` → **GOVERNANCE CLEAN, exit 0** |
| Browser | **1024 / 1280 / 1440** — `scrollWidth === clientWidth` at every width, no console errors |

**Journey verified end to end in the browser.** Promotion → `DRAFT` stage with *"Configured and
assessed, but no decision has been activated yet"* → *Approve & activate* → **Confirm this decision**
with the explanation, the option select, and both governed fields with their helpers → refusal naming
all three missing answers → fields set → activated → *Open campaign in flight* →
**"Live Decision Twin · Day 5 of 15"**, the strip replaced by a pointer to the timeline, and the
narration panel showing *"Day 5 — running above the activated plan"* with NEEDS ATTENTION, four
reading cards including depot stock and world-model status with their bases, and *"Why CogniX says
this"* → clicking Day 10 → the predicted-day narration above → *New promotion experiment* → back to
`DRAFT`, in-flight disabled → *Previous experiments* → **EXP-001 preserved and readable**.

The six acceptance questions a Promotion Analyst must answer unaided are each answered by a specific
element of the delivered surface: the activation panel and contract identity; the confirmation
explanation; the two helper lines; the day narration for elapsed days; the day narration for
predicted days; and the *New promotion experiment* action beside the stage badge.

*Harness note:* the Browser pane's synthetic `click`, `type` and `form_input` do not reach React
state for `<select>` and some buttons in this app, and `computer{action:"scroll"}` hangs the pane.
Where that blocked a step the element's own `click()` — or the native value setter plus a bubbling
`change` — was dispatched instead, and every assertion above is on rendered DOM.

---

## 9. What was not done

No adaptive intervention, no decision moments, no reforecast, no post-flight reconciliation, no
forecasting model, no change to projection semantics, no ML, no data ingestion. `handleApplyInFlightAction`
keeps its empty body. The six Path-A forecast defects in the truth record are **recorded, not fixed**.
`ESF-4` is untouched and remains parked, not superseded.
