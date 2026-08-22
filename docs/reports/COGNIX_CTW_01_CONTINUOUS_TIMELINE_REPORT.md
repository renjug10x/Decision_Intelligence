# COGNIX `CTW-01` — CONTINUOUS CAMPAIGN TIMELINE & ACTIVATION — IMPLEMENTATION REPORT

**Work package:** `CTW-01`, the first authorised work package of `IB-13` — Continuous Live Decision Twin
**Authorised:** 2026-08-22, owner demo-priority override
**Delivered:** 2026-08-22 · branch `claude/cognix-capability-atlas-v2` · **not merged**
**Governing ruling:** **ADR-070**, frozen before implementation and implemented unamended
**Governance:** [`MASTER_PLAN.md`](../governance/MASTER_PLAN.md) `CTW` section ·
[`COGNIX_INNOVATION_BACKLOG.md`](../governance/COGNIX_INNOVATION_BACKLOG.md) §5

---

## 1. What was wrong, stated from the code

At `9af00211` the Promotion surface ran two disconnected experiences.

**Pre-flight was real.** `PromotionPlanner.tsx` built a `CampaignIntent` from the archetype plus the
live controls and called four governed engines on every configuration change — CDI-02 evaluation,
CDI-03 opportunity, CDI-04 readiness, CDI-05 timeline.

**In-flight was a static literal.** `LiveDecisionTwinLens.tsx` read `archetype.decision_twin` from
`lib/campaign-archetypes.ts` and called no engine, no API and no store. Five specific consequences,
each verified before any code was written:

| # | Defect | Evidence |
|---|---|---|
| 1 | **The remaining horizon did not exist.** `telemetry_streams.length === current_day` in all seven archetypes (5/14, 4/14, 3/7, 5/14, 6/14, 2/5, 5/14) — **52 campaign days absent**, not predicted-and-hidden | `lib/campaign-archetypes.ts` |
| 2 | Both `expected_*` and `observed_*` were hand-authored literals, unrelated to the CDI-02 evaluation just run | `DecisionTwinStream` |
| 3 | The twin ignored the configuration — a 30-day duration still read "Day 5 of 14" | twin render site |
| 4 | No activation and no baseline binding: `activeMode` was local React state with two values | `PromotionPlanner.tsx` |
| 5 | `handleApplyInFlightAction` had an empty body | `PromotionPlanner.tsx` |

---

## 2. What was built

| Layer | Artefact |
|---|---|
| Contract | `packages/contracts/src/campaign-continuous-timeline-model.ts` — `CampaignHorizonClass`, `FlightActivation`, `FlightHorizon`, `ContinuousSeriesPoint`, `ContinuousLensSeries`, `FlightDeviationSummary`, `CampaignFlightProjection`, `validateFlightProjection` |
| Contract | `campaign-timeline-model.ts` — `TimelineTrajectoryKind` extended **additively** with `OBSERVED` and `REFORECAST` |
| Engine | `lib/campaign-continuous-timeline-engine.ts` — deterministic; computes no demand, contribution or uncertainty of its own |
| API | `app/api/v1/campaigns/flight/route.ts` — orchestration only |
| Client | `lib/campaign-flight-client.ts` — including the archetype→telemetry adapter |
| UI | `components/campaign/FlightActivationPanel.tsx`, `components/campaign/ContinuousFlightTimeline.tsx` |
| UI wiring | `PromotionPlanner.tsx`, `LiveDecisionTwinLens.tsx`, `CampaignDiscoveryHero.tsx` |
| Tests | `tests/unit/run-ctw01-tests.ts` — 65 assertions, groups A–H |

---

## 3. The three rulings, and how each is enforced

### 3.1 Activation binds to the decision contract — there is no second baseline

Activation registers the intent, evaluates the CDI-06 outcome frontier and creates an `ACTIVE`
CDI-07A `DecisionContract` **by the same governed path the Campaign Decision Canvas already uses**.
No new contract type was introduced. `FlightActivation` deliberately carries no expectation field of
its own; every expectation shown is read from the CDI-05 projection the contract binds, and the
engine refuses a projection whose `campaign_intent_id` is not the one the contract binds (`RJ-W4`).

Where the declared constraints do not settle the choice the frontier returns `CHOICE_REQUIRED`, and
the surface requires the option, who is deciding and why — recorded on the contract as
`HUMAN_RESOLVED`. The refusal names which of the three is still missing rather than restating the
rule.

**Supersession, found during browser validation.** Re-activating after a configuration change first
failed with `RJ-C8: ACTIVE_CONTRACT_NOT_SUPERSEDED`. That was the estate refusing, correctly, to let
one session acquire two active baselines. The fix is the one ADR-070 anticipated: re-activation now
reads the current `ACTIVE` contract and names it in `supersedes`, so the prior decision is displaced
rather than replaced and both remain readable. **This was a defect in the new activation flow, not in
CDI-07A**, and nothing in CDI-07A was relaxed to accommodate it.

**Configuration drift.** The configuration in force at activation is recorded as a signature. If it
changes, the flight is cleared and the surface says why — *"it would assess the running campaign
against a decision that was never taken"* — and the in-flight mode is disabled until re-activation.

### 3.2 Observed, simulated and predicted are three declared classes over one horizon

`CampaignHorizonClass` is orthogonal to `EvidenceStrength` and to `TimelinePointBasis`. Enforcement
is executable, not editorial: `validateFlightProjection` carries `W-INV-1`…`W-INV-7`, the engine
refuses to return a projection that violates them (`RJ-W8`), and the suite **tampers with a valid
projection to prove each invariant bites** rather than only checking that well-formed input passes.

- A `PREDICTED_REMAINING` day carries **no actual, no deviation, and never `OBSERVED` strength**.
- `OBSERVED_ELAPSED` requires an `ESF-6`-admitted observation. Nothing in `CTW-01` produces one, so
  the class is **structurally unreachable** and every elapsed day is `SIMULATED_ELAPSED` and says so.
  `OBSERVED_ELAPSED_REQUIRED_INPUT` publishes what would change that.
- On screen the two halves differ in stroke, colour and background — solid versus dashed, violet
  versus blue, plain versus hatched — separated by a labelled `TODAY` divider, with the legend naming
  each class in words rather than by colour alone.

### 3.3 The deviation is like-for-like, and the arithmetic says why

This was the hardest honest problem in the work package, and it was found by measurement rather than
assumed. The seeded campaign telemetry and the CDI-05 projection are **on different quantity bases
and different populations**: telemetry publishes ~£442–672/day and an unanchored daily index, while
CDI-05 publishes ~£18,440 per period on a weekly-rate basis over `CDI02_BASE_WEEKLY_UNITS`.
Subtracting one from the other would be a basis error of exactly the kind `CDI-08` exists to refuse.

What the telemetry *can* legitimately supply is a **scale-free ratio** — how far off its own plan the
campaign is running — computed with numerator and denominator inside its own basis. That ratio is
applied to the contract-bound projection, so the running series lands in the projection's basis and
the deviation is genuinely like-for-like. This is the `DDF-01` precedent: supplier capacity is
consumed from `WP10-C` as a scale-free ratio precisely so a population-boundary crossing does not
create a fourth capacity number.

The consequence is asserted directly: **doubling both sides of the seeded pair leaves every deviation
unchanged** (D-04), which is what proves the seeded levels are never used as a baseline. An undefined
ratio — absent, zero or negative denominator — yields **no actual and no deviation**, never a
defaulted "on plan", and the refusal is stated on the lens (D-05, D-06).

---

## 4. Metric boundary, as approved

| Metric | Position |
|---|---|
| **Demand** | Delivered. CDI-05 `DEMAND` lens, `cdi02_weekly_rate` |
| **Contribution** | Delivered. CDI-05 `CONTRIBUTION` lens, `cdi02_unit_contribution` |
| **Deviation from the activated pre-flight baseline** | Delivered, like-for-like, per §3.3 |
| **Declared uncertainty** | Delivered. The CDI-05 `attributable_effect_envelope` transformed into each lens's own quantity by the arithmetic CDI-05 already applies to its central line — ambient added back, index scaled by `CDI02_BASE_WEEKLY_UNITS`, contribution carried at the period's own realised unit rate. **No width invented, none narrowed.** Rendered with `declared_horizon_uncertainty_profile` visible, and described as declared rather than calibrated |
| **Revenue** | **Not introduced.** CDI-05 publishes it `NOT_AVAILABLE` with a `RequiredAuthoritativeInput`; that refusal stands and is published in `FLIGHT_LENS_NON_SCOPE` with its reason |
| **Stock trajectory** | **Not introduced.** A series needs a declared depletion basis; `WP10-C` supplies scalars and CDI-05 renders inventory as an unsmoothed level shift. Published as refused, with the reason |

---

## 5. What CDI-05 already provided, and what was genuinely new

The dependency analysis in the planning report proved accurate: **CDI-05 already projects the full
horizon** with two trajectories, a confidence envelope, and per-point `basis` / `strength` /
`synthetic_demo`, with `POST_CAMPAIGN` structurally present and numerically empty. `CTW-01` is
therefore **a second consumer of `DecisionTimelineProjection`**, not a new projection engine — it
cites `timeline_projection_id`, `counterfactual_id` and `causal_id` rather than producing its own
(G-05), and copies envelope values unchanged (E-06).

One genuinely new governed concept was required and is deliberately small: `TimelineTrajectoryKind`
carried two values and could express neither an elapsed actual series nor a mid-flight reforecast. It
was extended additively with `OBSERVED` and `REFORECAST`. **CDI-05 still emits exactly its own two
kinds** (G-01), and `REFORECAST` is emitted by nothing at this baseline (F-01).

---

## 6. The `CTW-02` boundary, made machine-checkable

`CTW01_NON_SCOPE` is published on every projection and asserted in the suite. `expectation_override`
and `reforecast_override` are refused at the engine boundary (`RJ-W1`, `RJ-W2`) so a caller cannot
introduce either by the back door. `handleApplyInFlightAction` was **left with its empty body** — the
existing seeded deviation and intervention panels are unchanged, because adaptive intervention is
`CTW-02`. Post-flight reconciliation was not built and is not a `CTW` package: it is extension work
on `CDI-08` and the `CampaignDecisionExperiment` comparison surface.

---

## 7. Learning relationship — unchanged

`CTW-01` creates **no attested observation, no learning candidate, no learning case, and no new
origin of `synthetic_demo = false`**. Every point remains `synthetic_demo: true` (B-06). Capturing a
campaign day is not learning and is not described as it. Admission remains governed by `ESF-6`,
correspondence by `CDI-08`, and the archetype's `post_campaign_learning.learning_case_status` still
reads `NON_AUTHORITATIVE`, which is the truth.

---

## 8. Validation

| Check | Result |
|---|---|
| `tsc --noEmit` | Clean |
| Unit suites | **36 of 36 runners green.** `CTW-01` **65/65**. Every recorded baseline matched exactly: `CDI-01`…`CDI-07B` 21/36/31/49/70/93/155/235, `CDI-08` 44, `ESF-6` 81, `ESF-2` 19, `ESF-3` 22, `IFI-01` 12, `DDF-01` 56, campaign-intelligence 133, campaign-decision-journey 96, decision-dimensions 173, demand-language 21, signals 6, and the full `ATL` set (`atl02` 119, `atl03` 29, `atl04` 58, `atl04r` 121, `atl05` 54, `atl06a` 115, `atl06b` 133, `atl06c` 127, `atl06d` 96, `atl07` 52, `atlfinal` 57) |
| Production build | Clean. `/api/v1/campaigns/flight` registered |
| Governance (`ATL-07`) | `atlas-governance-check --enforce` → **GOVERNANCE CLEAN, exit 0** |
| Browser | Validated at **1024 / 1280 / 1440**. No console errors. `scrollWidth === clientWidth` at every width — no horizontal overflow |

**Browser journey verified end to end:** Promotion → *Review and activate this decision* → frontier
`CHOICE_REQUIRED` refused with the missing field named → an archetype whose constraints resolve
(`Premium Low-Elasticity Bakery`) activated in one action → contract id, decision-basis digest,
status and readiness shown → *Open campaign in flight* → **"Live Decision Twin · Day 4 of 15"** with
the continuous timeline: 4 elapsed simulated days, 11 predicted, `TODAY` divider, hatched predicted
region, widening declared-uncertainty band, both lenses, deviation cards (−2.7% latest, −4.0% mean)
and the three basis disclosures. Changing the duration then showed the stale-activation warning with
the in-flight mode disabled; re-activating superseded the prior contract and the horizon became
**"Day 4 of 29 — 4 elapsed and 25 still to come"** — the defect in §1 row 3 closed, visibly.

**Two defects found and fixed during browser validation**, neither caught by the suite:

1. **`RJ-C8` on re-activation** — §3.1. A real gap in the new activation flow.
2. **Y-axis tick collision** — a narrow value range rounded every gridline to the same label
   ("11k, 11k, 11k"), which reads as a flat axis and hides the movement the chart exists to show.
   Tick precision now follows the range.

*Harness note, recorded for the next agent:* the Browser pane's synthetic clicks, `type` and
`form_input` did not reach React state for `<select>` and some buttons in this app. Where that
blocked a step, the element's own `click()` was dispatched instead — the same event React binds — and
the resulting state was verified through the rendered DOM. Every assertion above is on rendered
output, not on internal state.

---

## 9. Programme position

**`ESF-4` remains the canonical continuation point of the Master Plan.** The owner parked it
temporarily to take `CTW-01` first for upcoming client demonstrations, and recorded explicitly that
it is **not superseded, cancelled or architecturally deprioritised**. The forensic status assessment
§7 finding stands unamended. `CTW-01` touched no file `ESF-4` touches — `enterprise-signal-model` and
`external-signal-connector-model` are untouched — and does not sit ahead of it in the programme DAG.

**Owner decisions now open:** authorise `CTW-02`, resume `ESF-4`, or run them in parallel. Two
smaller follow-ups are recorded rather than taken: whether the continuous twin should be registered
as a `CAP-*` capability in the Atlas (an `ATL` concern, and governance is clean without it), and
whether the campaign window's inclusive arithmetic — a 14-day duration yielding a 15-period window,
which is pre-existing `buildCampaignIntentFromArchetype` behaviour and was deliberately not changed —
should be restated as "14 days" on the surface.
