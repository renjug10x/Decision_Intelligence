# COGNIX — DEMAND DECISION FRONTIER (`DDF-01`) GOVERNANCE & PLANNING REPORT

**Document Status:** Approved & Authoritative (governance registration — **no implementation performed**)
**Version:** 1.0.0
**Date:** 16 August 2026
**Owner:** G10X Enterprise Innovation Lab Architecture Group
**IP Classification:** G10X Proprietary
**Work Package Registered:** `DDF-01 — Demand Decision Frontier (P0)`

> **This document is the governance and planning record, preserved as written.** It describes the estate at
> `7ad9c2df`, before implementation. `DDF-01` was subsequently implemented and independently reconciled —
> what was actually built, which of the defects below were closed rather than relocated, the fifteen
> further defects the integration pass found, and the `[HARD]` acceptance verdicts are recorded separately
> in [`COGNIX_DDF_01_DEMAND_DECISION_FRONTIER_REPORT.md`](COGNIX_DDF_01_DEMAND_DECISION_FRONTIER_REPORT.md).
> Two rulings below were amended by implementation evidence: see ADR-040 signal scoping, ADR-041
> Amendment A (the shared demand base) and ADR-043 Amendment A (the regret formula).

---

## 1. Repository continuity evidence

Captured before any file was modified.

| Property | Value |
| :--- | :--- |
| **Repository root** | `/Users/renjunair/projects/Decision_Intelligence` |
| **Active branch** | `Feature/MatchingContract-AutoActivate` |
| **HEAD** | `7ad9c2dfb1dd4fe3b5cd26db497baf36ca5c749f` — *feat(cognix): campaign decision experiment history, comparison and execution brief* |
| **Upstream / tracking** | `gitlab/Feature/MatchingContract-AutoActivate` — no divergence, no ahead/behind |
| **Working tree** | **Clean.** `git status --porcelain -uall` empty |
| **Staged files** | None |
| **Modified files** | None |
| **Untracked files** | None |
| **Stashes** | None (`git stash list` empty) |
| **Remotes** | `gitlab` → `https://repo.glassx.ai/development/decision-intelligence.git`; `origin` → `git@github.com:renjug10x/Decision_Intelligence.git` |

**Continuity verdict: SAFE.** No unrelated work is at risk. This task performs documentation changes only.
No commit, push, merge, rebase, cherry-pick, branch switch, reset or stash was performed.

---

## 2. Scope of this task

Architecture, governance, planning and reconciliation only. **No product functionality was implemented.**
The deliverable is a governed, unambiguous boundary for the *next* work package.

---

## 3. Reconciliation — documentation against implementation

Documentation was **not** assumed current. The following was verified against code.

### 3.1 What Demand & Forecast actually supports today

`components/Forecasting.tsx` (956 lines) renders `SOL-DEMAND-02` — a **Demonstration Solution**
(Asset Type B under `DEMONSTRATION_SOLUTION_MODEL.md`), not an Innovation Experiment. It provides:

- A scenario control sandbox — metric, horizon, predictive model, event boost, promotion lift,
  cannibalisation (`Forecasting.tsx:512–634`).
- A two-series Chart.js line chart — *Historical Actual* and *Projected Forecast*
  (`Forecasting.tsx:224–268`, rendered `:661–706`), backed by `getForecastProjections()` in
  `lib/query-engine.ts:453` via `GET /api/data?type=forecast` (`app/api/data/route.ts:61`).
- Three KPI cards — projected total, period growth rate, forecast risk index (`:794–851`).
- A rules-driven proactive-risk list with three seeded risks and simulated buffer optimisation
  (`:271–312`, `:213–221`).
- Shared Decision State binding for `promotion_lift` and `forecast_horizon_days`
  (`:100–108`), plus an Execution Briefing and a cited Enterprise Learning Pattern.

**This is a genuinely working, deterministic forecast surface.** The findings below are about the
*intelligence claims layered on top of it*, which is precisely where `DDF-01` will build.

### 3.2 Defect register — findings that bind the `DDF-01` implementation

Recorded here so the implementation corrects them rather than building on them. Each is evidenced.

- **`D-DDF-1` — The Intent Fusion panel on the Demand surface is hardcoded JSX, not engine output.**
  `Forecasting.tsx:368–418` prints Baseline `+12%`, Commercial Intent `+7% (20% Promo)`, Observed Signals
  `+3% (Early Demand)`, Contextualised Outlook `+22% Demand Lift` and Supplier Capacity Cap
  `+10% (12pp Gap)` as literal strings. The component's **only** data fetch is `/api/data`
  (`Forecasting.tsx:158`); it never calls `POST /api/v1/intent-fusion/evaluate`. Confirmed by search:
  the sole callers of `evaluateIntentFusion` are the route handler and the engine itself.
  **Consequence:** the "12pp gap" does not move when the Promotion Lift slider moves. Any Decision Gap
  built on this panel would be a caption, not a calculation — exactly the failure `MASTER_PLAN`
  §Anti-Drift and the brief both prohibit. `INTENT_FUSION_INTELLIGENCE.md` §5.2 states this surface
  "Displays decomposed Baseline (+12%) + Intent (+7%) + Signals (+3%) = Outlook (+22%) vs Capacity Cap
  (+10%)" — literally accurate, and misleading about binding. **Corrected in that document by this task.**

- **`D-DDF-2` — "91% Model Accuracy" is an unsupported backtest claim.**
  `Forecasting.tsx:433–435` renders Forecast Confidence as *"91% Model Accuracy"*. The estate holds no
  backtest, no realised forecast-error dispersion and no calibration record. The number traces to
  `intent-fusion-engine.ts:75` (`confidence: 91`), which is an unqualified engine constant — and the same
  engine separately publishes `baseline_forecast.confidence: 90` (`:54`), so two different confidence
  values exist for one outlook. `config/solutions.ts:41` repeats the claim in the five-second
  proposition. **`DDF-01` P0-A must not derive Forecast Stability from this number**, and the
  "Model Accuracy" wording is a defect to correct.

- **`D-DDF-3` — The predictive model selector claims ML that does not exist.**
  `Forecasting.tsx:550–552` offers *GenAI Demand Predictor (Adaptive)*, *Prophet Seasonality (ML)* and
  *ARIMA Baseline (Statistical)*. `lib/query-engine.ts:494–502` implements them as
  `1.0 + Math.sin(index*0.8)*0.12`, `1.0 + Math.sin(index*1.5)*0.04 + Math.cos(index*2.3)*0.02`, and
  `1.0 - index*0.005` respectively. There is no ARIMA, no Prophet and no generative forecasting. The
  surface additionally asserts *"ML Forecast Active"* (`:491`) and *"Calculating ML Projection…"* (`:656`).
  This violates Principle 4 / "No fake intelligence" and is in `DDF-01` scope because P0-A must
  distinguish model confidence from forecast stability **on this same surface**.

- **`D-DDF-4` — Supplier capacity is defined twice and only one definition responds to the scenario.**
  `DecisionScenarioParameters.supplier_capacity_cap` is a real Shared Decision State parameter
  (`decision-state-model.ts:23`) consumed by `calculateDerivedImpacts()` (`:113`). `IFI-01` ignores it and
  hardcodes `supplierCapacityCapPct = 10` (`intent-fusion-engine.ts:36`). The Demand surface displays a
  third, literal copy. `ARCHITECTURE.md` §3.4 already binds downstream capabilities to read
  `DecisionDerivedImpacts` **read-only** via Shared Decision State — `DDF-01` must obey that rule for the
  executable frontier rather than adding a fourth capacity number.

- **`D-DDF-5` — Two scenario controls do not propagate to Shared Decision State.**
  Promotion Lift and Horizon call `executeCommand` (`Forecasting.tsx:102`, `:107`). **Cannibalisation
  (`:627`) and Event Boost (`:581`) do not**, yet both are *read back* from Decision State
  (`:88–89`, `:95–96`). Local edits are therefore overwritten by the sync effect (`:91–98`) on any
  state change, and never reach any other surface. Directly relevant to the acceptance criterion that
  changing scenario inputs must recompute dependent intelligence.

- **`D-DDF-6` — Unsupported live-feed claim in the Execution Briefing evidence list.**
  `Forecasting.tsx:788` asserts *"Supplier capacity headroom confirmed via live API feed"*. No live feed
  exists; every source in the estate is `synthetic_demo = true` outside the `ESF-6` attested path. This is
  the same pathology the Campaign Intelligence reconciliation corrected on 2026-08-16 and must not be
  reproduced or extended.

- **`D-DDF-7` — "Multi-Horizon Window: 14 to 90 Days" is unsupported by the surface it sits on.**
  `Forecasting.tsx:449–451` claims a 14–90 day horizon range; the horizon selector offers 7, 14 and 30
  days only (`:568–570`), and `getFutureDays(horizon)` generates exactly that. Likewise *"Fresh Demand
  Trajectory +13% Accelerating"* (`:441–443`) is a literal unconnected to any computation.

- **`D-DDF-8` — The forecast chart is styled for a dark theme on a light executive surface.**
  Loading overlay `rgba(26,34,53,0.7)` (`:647`), tick colour `#8B9DC3` (`:671`, `:693`, `:698`), grid
  `rgba(255,255,255,0.03)` (`:692`, `:696`), tooltip background `#1A2235` (`:674`). `UX_DESIGN_PRINCIPLES`
  §1.2 mandates light neutral surfaces and semantic colour. Since `DDF-01` rebuilds this chart into a
  decision visual, the correction lands naturally in scope.

- **`D-DDF-9` — Root `MASTER_PLAN.md` quick summary is stale.** It lists Phase 9 as *IP and Innovation
  Governance* and Phases 10–11 as packs / operating model. `docs/governance/MASTER_PLAN.md` has Phase 9 as
  *Organisational Learning Intelligence* [COMPLETED], Programme 10 as *Adaptive Intelligence*, and Phases
  11–13 for IP, packs and operating model. **Corrected by this task.**

- **`D-DDF-10` — The ADR index is stale.** `ARCHITECTURE_DECISIONS.md` lists ADR-001…007 while the body
  carries ADR-001…039. Recorded, not silently changed: the body-only convention has held since ADR-008 and
  ADR-040…043 follow it. Worth a dedicated hygiene pass; it is not `DDF-01` scope.

### 3.3 What the estate *does* provide that `DDF-01` can legitimately build on

- **Signal evidence with divergence semantics.** `CanonicalSignalType` already includes
  `FORECAST_DIVERGENCE`, `CATEGORY_DEMAND_ACCELERATION`, `ORDER_VELOCITY_ACCELERATION`,
  `REGIONAL_DEMAND_SHIFT`, `SUPPLIER_CAPACITY_PRESSURE`, `STOCK_COVER_DECLINE` and
  `PROJECTED_STOCKOUT_RISK`, and every `EnterpriseSignal` carries `baseline_value`, `observed_value`,
  `delta`, `delta_pct`, `observed_at` and `effective_at`. **This is a real, inspectable basis for a
  stability calculation** — no new signal type is required, and none may be added (`ESF-6` / ADR-038).
- **Deterministic operational headroom.** `calculateDerivedImpacts()` publishes
  `weekly_demand_units`, `supplier_capacity_units`, `commitment_gap_units`, `financial_exposure_gbp`,
  `stockout_probability_pct` and `delivery_risk_pct` from scenario parameters plus applied interventions.
  The executable frontier is derivable from this without a new engine.
- **Trajectory and comparison precedent.** `CDI-05` `DecisionTimelineProjection` establishes how
  trajectories are rendered honestly; `CDI-06` establishes selection semantics
  (`CHOICE_REQUIRED` when constraints do not separate survivors); the Campaign Experiment comparison
  honesty rule establishes when a winner may be named. `DDF-01` reuses all three rather than inventing
  parallel semantics.

---

## 4. Terminology collisions resolved by this task

Three naming collisions existed and would have produced two meanings for one word on adjacent surfaces.

| Collision | Existing meaning | `DDF` meaning | Ruling |
| :--- | :--- | :--- | :--- |
| **"Decision Frontier"** | `components/campaign/DecisionFrontierLens.tsx`; Promotion tab *"Decision Frontier & Tension"* — a **Pareto set of candidate campaign configurations** (`CDI-06` family). | A **set of demand trajectories over time** (base / emerging / executable). | The demand capability is **always** *Demand Decision Frontier*, never shortened to "Decision Frontier". The `CDI-06` Pareto artefact keeps the name **Outcome Frontier** in all governed text. A trajectory frontier is never plotted as a Pareto frontier or vice versa. (ADR-043) |
| **"Decision Window"** | `CDI-03` **Opportunity Window** — *when to run a campaign*: candidate future intervals scored `PREFERRED`…`AVOID`. | *How long the option to act stays open* — a closing interval on the current decision. | Distinct artefacts, never merged. `OpportunityWindowEvaluation` answers "when should we act"; `DemandDecisionWindow` answers "until when may we still act". (ADR-042) |
| **"Half-Life"** | `CDI-07A` **Decision Half-Life** — validity of a resolved decision's evidential basis; **no duration, countdown, expiry or decay curve** (owner ruling W2, `UX_DESIGN_PRINCIPLES` §5.6). | `DOT-11` **Signal Half-Life** — a signal's predictive relevance over time. | Never rendered as one indicator. See §5 for the countdown boundary, which is the load-bearing one. |

---

## 5. The load-bearing governance collision — a countdown on a surface that forbids countdowns

The brief's Decision Window examples (*"31 hours remaining"*, *"supplier intervention viable until Monday
14:00"*) are **countdowns**. `CDI-07A` owner ruling W2 and `UX_DESIGN_PRINCIPLES` §5.6 prohibit exactly
that: no countdown timer, no hours, no percentage remaining, no progress bar, no decay animation.

**They are not in conflict, because they measure different things — and the distinction must be enforced,
not assumed.**

- **Decision Half-Life** asks *how long does the evidence behind this decision remain trustworthy?* It was
  refused a duration because the estate holds **no calibrated evidence about how evidence decays**. A
  number there would be invented.
- **Decision Window** asks *when does the operational ability to act expire?* That is not a decay curve.
  It is arithmetic over a **declared operational deadline** — a supplier order cut-off, a DC allocation
  schedule, a campaign launch lead time.

**Ruling (ADR-042):** a Decision Window duration is publishable **if and only if** it is derived from a
declared constraint carrying its declarer and its basis class. Where no constraint is declared, the window
is `INDETERMINATE` and **no countdown renders** — the absence is shown, not filled. In the current estate
every such constraint is a `MODELLED_DEMO_ASSUMPTION` and must be visibly labelled as one. A Decision
Window and a Decision Half-Life validity state must never occupy the same indicator, and the window must
never be described as the decision "expiring".

---

## 6. `DDF-01` — the next implementation work package

### 6.1 Scope — and nothing else
1. **P0-A Forecast Stability Intelligence** — stability distinct from confidence.
2. **P0-B Decision Gap Intelligence** — opportunity emerging vs ability to capture it.
3. **Decision Window** — the time dimension of the gap.
4. **P0-C Decision Regret Intelligence** — Act Now / Wait / Do Nothing.
5. **Combined Demand Decision Frontier visualisation.**
6. **Explainable intervention recommendation.**
7. **Intervention simulation and recomputation**, where feasible within the current architecture.

### 6.2 Explicitly out of scope
All twelve `DOT` roadmap capabilities (`DEMAND_OBSERVABILITY_MODEL.md` §6); any new `CanonicalSignalType`,
`ExternalSignalCategory` or `SignalSourceType`; any new origin of `synthetic_demo = false`; any ML model,
training or inference; any change to `CDI-01`…`CDI-08`, `ESF-6` or `WP10-C` semantics; any real external
integration; any `LearningCandidate` or `LearningCase` creation; any Enterprise Memory write.

### 6.3 Reasoning sequence the experience must deliver
`Something is changing` (Stability) → `our commitments may not capture it` (Gap) → `there is limited time`
(Window) → `waiting or choosing wrongly has a cost` (Regret) → `CogniX evaluates intervention`
(Recommendation) → `user tests it` (Simulation) → `frontier recomputed`.

---

## 7. Acceptance criteria for the `DDF-01` implementation

Numbered `AC-DDF-*`. The brief's minimum set is included and strengthened. Criteria marked **[HARD]** are
release-blocking regardless of demo quality.

**Preservation**
- `AC-DDF-01` **[HARD]** Existing Demand & Forecast behaviour remains functional: metric, horizon, model
  and event selectors, the projection chart, the three KPI cards, the proactive-risk list, buffer
  optimisation, Execution Briefing and the RLS role-scoping paths.
- `AC-DDF-02` **[HARD]** Campaign, Intent Fusion, Signal, Commitment, Inventory, Ripple, Opportunity and
  Category flows are unbroken. Full regression is green at the recorded baselines: `CDI-01`…`CDI-07B`
  21/36/31/49/70/93/155/235, `CDI-08` 44, `ESF-6` 81, `ESF-2` 19, `ESF-3` 22, `IFI-01` 12, `WP10-D` 15,
  `WP10-B`, `WP10-C`, campaign-intelligence 133, campaign-decision-journey 96, bugfix 4/4.
- `AC-DDF-03` **[HARD]** No governed contract, engine or authority rule changes meaning. `DDF-01` is
  additive on `IFI-01` and read-only on `WP10-C`.

**Forecast Stability (P0-A)**
- `AC-DDF-04` Forecast Confidence and Forecast Stability are visibly and verbally differentiated, and a
  user can reach an explanation of the difference without leaving the surface.
- `AC-DDF-05` **[HARD]** Stability is **not** derived from the `IFI-01` confidence constant, and the
  surface no longer claims *"Model Accuracy"* for a number with no backtest behind it (`D-DDF-2`).
- `AC-DDF-06` Stability publishes score, direction/trend, probability of material revision, likely
  revision direction and likely revision magnitude range, each with contributing signal references.
- `AC-DDF-07` **[HARD]** Every contributing signal is a real `EnterpriseSignal` reference. No new signal
  type is introduced. Where signal evidence is insufficient, stability reports `INDETERMINATE` rather than
  a number.
- `AC-DDF-08` The distinction between *historical model accuracy* and *present-time instability* is stated
  on the surface, not only in documentation.

**Decision Gap (P0-B)**
- `AC-DDF-09` **[HARD]** Decision Gap is **not** `forecast demand − supplier capacity` and is not a label
  over a static literal. It is computed at runtime from engine output.
- `AC-DDF-10` **[HARD]** The `IFI-01` decomposition on this surface is engine-bound via
  `POST /api/v1/intent-fusion/evaluate`. The hardcoded `+12/+7/+3/+22/+10/12pp` panel is removed
  (`D-DDF-1`).
- `AC-DDF-11` Baseline forecast, contextualised demand, emerging demand frontier and executable demand
  frontier are conceptually and visually distinct, each with its own basis and provenance class.
- `AC-DDF-12` Exposed demand, monetary opportunity at risk, affected products/lines/regions and the
  primary contributing constraints are published, with the constraints ranked and named.
- `AC-DDF-13` **[HARD]** The executable frontier consumes `DecisionDerivedImpacts` read-only via Shared
  Decision State per `ARCHITECTURE.md` §3.4. It does not recompute ripple arithmetic and does not write to
  Decision State. No fourth supplier-capacity number is created (`D-DDF-4`).
- `AC-DDF-14` Forecast Stability feeds the emerging demand frontier, and that dependency is visible in the
  explanation rather than implicit.

**Decision Window**
- `AC-DDF-15` **[HARD]** A window duration renders only where a declared constraint exists. With no
  declared constraint the state is `INDETERMINATE` and no countdown, clock, progress bar or decay
  animation is drawn (ADR-042).
- `AC-DDF-16` **[HARD]** Every demo constraint is labelled `MODELLED_DEMO_ASSUMPTION`. No modelled deadline
  is presented as an observed operational fact.
- `AC-DDF-17` **[HARD]** Decision Window never shares an indicator with, is never labelled as, and never
  substitutes for `CDI-07A` Decision Half-Life validity.
- `AC-DDF-18` Decision Window is explainable: the user can see which constraint sets it and who declared it.

**Decision Regret (P0-C)**
- `AC-DDF-19` Regret compares meaningful alternatives — Act Now, Wait, Do Nothing — not forecast error cost.
- `AC-DDF-20` Act Now / Wait / Do Nothing semantics are stated: what each captures, what each risks, and
  what each forgoes.
- `AC-DDF-21` **[HARD]** All three alternatives are computed from the **same** inputs, so the comparison is
  internally consistent; the shared inputs are inspectable.
- `AC-DDF-22` **[HARD]** Where the alternatives do not separate materially, CogniX reports no clear
  advantage and **names no winner** — mirroring `CDI-06` `CHOICE_REQUIRED` and the Campaign comparison
  honesty rule.
- `AC-DDF-23` **[HARD]** No intervention is recommended where `CDI-04`-class readiness evidence would gate
  it; a gated option is reported as not currently actionable rather than as the recommendation.
- `AC-DDF-24` **[HARD]** Regret figures are labelled as modelled expected values, never as calibrated
  probabilities or as a statistical prediction interval.

**Integrity, honesty and interaction**
- `AC-DDF-25` **[HARD]** Every primary figure is either derived from existing evidence or from an
  explicitly identified modelled/demo assumption. Nothing is unattributed.
- `AC-DDF-26` **[HARD]** No unsupported real-time, ML, GenAI or live-integration capability is claimed
  anywhere on the surface, including badges, loading text and evidence lists (`D-DDF-3`, `D-DDF-6`).
- `AC-DDF-27` **[HARD]** Primary figures are internally consistent: the gap equals the frontier difference
  it is drawn from; the money at risk reconciles to the exposed demand; the chart's plotted values equal
  the values in the headline.
- `AC-DDF-28` **[HARD]** Changing any relevant scenario input recomputes every dependent intelligence
  (stability → frontier → gap → window → regret → recommendation). Cannibalisation and Event Boost
  propagate to Shared Decision State (`D-DDF-5`).
- `AC-DDF-29` **[HARD]** Simulating an intervention visibly changes downstream outcomes — gap, regret,
  capturable opportunity, residual exposure and risk state — and a failed computation renders an explicit
  unavailable state. **A failed recomputation may never leave a previous result on screen as current.**
- `AC-DDF-30` A user can reach *why* CogniX recommends the action: what changed, why CogniX believes it
  changed, what evidence contributed, and what outcome is expected with what confidence.
- `AC-DDF-31` **[HARD]** No demand datum is labelled with the governed bare `OBSERVED` class, and the
  prohibited vocabulary (`confidence_pct`) is not reintroduced — asserted permanently in tests.

**Experience and build**
- `AC-DDF-32` The surface remains executive-grade per `UX_DESIGN_PRINCIPLES`: light and professional,
  curiosity-led, progressively disclosed, low card density. It does not become a planning cockpit.
- `AC-DDF-33` The visual hierarchy reads `change → gap → urgency → consequence → intervention → outcome`
  within the five-second rule and the 40–60 word ceiling.
- `AC-DDF-34` The forecast chart is re-themed to the light semantic palette (`D-DDF-8`), and the Decision
  Gap area, decision-frontier marker and post-intervention trajectory are legible without a legend lookup.
- `AC-DDF-35` Responsive behaviour is preserved at 1024 / 1180 / 1280 / 1440 with no horizontal overflow.
- `AC-DDF-36` **[HARD]** `tsc` clean across root, contracts, learning and world projects; production build
  clean; no 4xx/5xx on the demand route during a full browser walkthrough.
- `AC-DDF-37` **[HARD]** New tests are semantic, not structural. Assertions execute real route handlers and
  engines; no `assert(true)`, no `length > 0` standing in for correctness, no test that string-matches a
  literal no implementation would write.

---

## 8. Validation performed by this governance task

- `git status`, `git stash list`, `git remote -v`, upstream and HEAD captured before and after — working
  tree contains **documentation changes only**.
- Terminology swept across the governance corpus: *Decision Frontier*, *Outcome Frontier*, *Opportunity
  Window*, *Decision Window*, *Half-Life*, *Forecast Confidence*, *Forecast Stability*.
- Priority and boundary consistency: `DDF-01` is P0; every `DOT` item is P1–P3 and marked not authorised;
  §6.2 states the exclusions explicitly.
- Numbering follows existing convention — family prefix plus sequence (`CDI-01`…`CDI-08`, `ESF-1`…`ESF-6`,
  `IFI-01`, `WP10-A`…`WP10-D`), ADRs continue the body sequence at ADR-040.
- No repository documentation validation script exists (`scripts/` holds `contract-content.mjs`,
  `generate-contract-pdfs.mjs`, `smoke-test.sh`); no documentation linter is configured in `package.json`.
  Documentation edits touch no TypeScript, so the build and the 21 `tests/unit/run-*.ts` runners are
  unaffected — verified by the diff being confined to `*.md`.

---

## 9. Cross-references

- Capability family governance: [`DEMAND_OBSERVABILITY_MODEL.md`](../governance/DEMAND_OBSERVABILITY_MODEL.md)
- Work package registration: [`MASTER_PLAN.md`](../governance/MASTER_PLAN.md)
- Architecture decisions: [`ARCHITECTURE_DECISIONS.md`](../architecture/ARCHITECTURE_DECISIONS.md) ADR-040…043
- Target architecture: [`ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) §7
- Information architecture: [`INFORMATION_ARCHITECTURE.md`](../architecture/INFORMATION_ARCHITECTURE.md) §6
- UX governance: [`UX_DESIGN_PRINCIPLES.md`](../ux/UX_DESIGN_PRINCIPLES.md) §6
- Principles: [`COGNIX_PRINCIPLES.md`](../governance/COGNIX_PRINCIPLES.md) Principle 13
