# COGNIX INNOVATION BACKLOG

**Document Status:** Approved & Authoritative (governance register)
**Version:** 1.0.0
**Effective Date:** 2026-08-22
**Owner:** G10X Innovation Steering Committee
**Namespace:** `IB-*` (registered in [`MASTER_PLAN.md`](MASTER_PLAN.md))

---

## 0. The one rule this document exists to enforce

> ## Innovation Backlog ≠ authorised delivery scope.
>
> Nothing in this register is committed work. An idea becomes committed delivery **only** when it is
> written into [`MASTER_PLAN.md`](MASTER_PLAN.md) as a work package with an identifier and a
> specification. Until then it is a candidate the owner has not yet authorised.

This is not a disclaimer. It is the reason the register is separate from the Master Plan at all. A
single list holding both "we are building this" and "we might explore this" is how a lab ends up
demonstrating a roadmap it never agreed to build — which is the exact failure mode
[`COGNIX_PRINCIPLES.md`](COGNIX_PRINCIPLES.md) forbids on screen and this document forbids in
planning.

**What this register is not.** It is not a Jira backlog, not a sprint queue, and not an engineering
task list. It holds innovation *portfolio* entries — a problem worth attention, what it would build
on, what it might unlock, and what the owner would have to decide next. Items are not estimated, not
pointed, not sequenced into iterations, and carry no delivery date.

---

## 1. Status board

| Field | Value |
|---|---|
| Ideas recorded | **13** |
| Innovation themes | **6** |
| Ideas at `In Delivery` | 0 |
| Ideas `Delivered` | 1 (`IB-13`) |
| Ideas at `Candidate Experiment` | 0 |
| Ideas at `Research` | 0 |
| Ideas at `Idea` | 12 |
| Ideas `Approved` / `Planned` | 0 |
| Work packages authorised by this document | **NONE** — `IB-13` was authorised by the owner into [`MASTER_PLAN.md`](MASTER_PLAN.md), which is where its scope now lives |
| Highest demo-priority candidate | none outstanding — `IB-13` is `Delivered` (2026-08-23) |

**Existing Master Plan continuation is unaffected by this register.** See §7.

---

## 2. Lifecycle — reconciled, not invented

CogniX already governs two different things with two different vocabularies, and the backlog must
not become a third that competes with either.

| Existing governance | What it governs | Vocabulary |
|---|---|---|
| [`EXPERIMENT_LIFECYCLE.md`](EXPERIMENT_LIFECYCLE.md) | **Maturity of an experiment that exists** | `Concept` → `Research` → `Prototype` → `Pilot Ready` → `Accelerator` → `Industry Pattern` (· `Retired`) |
| [`MASTER_PLAN.md`](MASTER_PLAN.md) | **Authorised delivery** | `[NOT STARTED]` · `[IN PROGRESS]` · `[BLOCKED]` · `[PLANNED]` · `[COMPLETED]` |

The backlog governs the space **before** either: whether an idea is worth exploring, and whether it
should be proposed for authorisation. Its stages are therefore **authorisation states**, and where a
state already has a governed name it borrows that name rather than coining a synonym.

```text
  [ Idea ]
      ↓
  [ Research ]                 ← the same state, and the same exit criteria,
      ↓                          as EXPERIMENT_LIFECYCLE.md §2.2
  [ Candidate Experiment ]     ← HANDOFF: enters EXPERIMENT_LIFECYCLE.md at `Concept`
      ↓                          as an EXP-* entry. Two governed objects now coexist:
      ↓                          a backlog idea (authorisation) and an experiment (maturity).
  [ Approved ]                 ← approved TO BE PLANNED. Still not authorised to build.
      ↓
  [ Planned ]                  ← has a work-package identifier and specification in
      ↓                          MASTER_PLAN.md. THIS is where delivery commitment begins.
  [ In Delivery ]              ← that work package is [IN PROGRESS]

  Terminal: [ Delivered ]  — leaves the register; the work package's status is authoritative
            [ Retired ]    — EXPERIMENT_LIFECYCLE.md §3, an explicit and positive outcome
```

**Binding rules on the lifecycle.**

1. **`Approved` is not authorisation.** It means the owner accepts the idea is worth planning. It
   creates no work package, no scope and no schedule. Only `Planned` — an entry in
   `MASTER_PLAN.md` — is delivery commitment.
2. **The register never renames an experiment state.** `Research` and `Retired` are borrowed from
   `EXPERIMENT_LIFECYCLE.md` unchanged. `Candidate Experiment` is the handoff into that lifecycle,
   not a competing maturity state.
3. **A backlog idea is never a capability.** It is not registered in the `CAP-*` capability registry
   and never appears in Atlas capability search, because the Atlas answers *what CogniX can do* and
   an idea is a thing CogniX cannot do (**ADR-069**). `ATL-03`'s standing rule — *no record may
   claim a capability that does not exist* — is not weakened by this register.
4. **Backwards movement is normal.** An idea returning from `Research` to `Idea`, or reaching
   `Retired`, is a governance outcome, not a failure.
5. **A stage is never advanced to make a demonstration easier.** Demo priority (§6) is a separate
   axis from stage and never substitutes for one.

---

## 3. Themes and recorded ideas

Six themes. Thirteen ideas. Every idea states what it builds on using **existing governed
identifiers only** — no capability, contract, work package or status below is invented here.

Dependency classification reuses the Master Plan's own semantics: **HARD** (cannot proceed without),
**INTEGRATION** (needs it for end-to-end flow), **ENHANCEMENT** (enriches, does not block).

---

### Theme A — Learning & Evidence

*The estate can now admit an attested observation and test whether it corresponds to what was
predicted (`CDI-08`, `ESF-6`, both `[COMPLETED]`). What it does not yet have is a supply of such
observations, a way to grade the trust in them over time, or a place to study them.*

#### `IB-01` — Decision Observation & Outcome Fabric / Observation Acquisition Strategy

- **Problem / opportunity.** `ESF-6` made an attested non-synthetic observation *representable*.
  Nothing yet makes one *arrive*. The estate holds one admission path and no acquisition strategy,
  so `N ≥ 3 independent eligible LearningCase`s — the Master Plan's gate for every downstream
  learning capability — has no route to being met.
- **Builds on.** `ESF-6 / Y3a` (attested source registry, server-issued receipts, the
  `source × context → authority` predicate), `CDI-08` (`contract × observation → comparability`),
  `OutcomeObservation` / `ObservationCompleteness` / `EvidenceProvenance` in
  `packages/contracts/src/campaign-learning-loop-model.ts`, `ESF-3` connector contract.
- **Could unlock.** A defensible corpus of observed decisions; the `Y1` observed counterfactual and
  `Y2` per-assumption observation streams already registered in the Master Plan; eventually `Y4-cal`.
- **Dependencies.** HARD: `ESF-6`, `CDI-08` (both `[COMPLETED]`). INTEGRATION: `WP10-D`.
- **Stage.** `Idea`. **Master Plan status.** Not authorised.
- **Next gate.** Owner decision on whether acquisition is a first-party operator upload path (the
  `Z3` ruling's position — attested, independent, no procurement) or a connector programme.

#### `IB-02` — Adaptive Signal Trust / Signal Trust Progression

- **Problem / opportunity.** `ESF-4 — Signal Quality, Confidence & Provenance` grades a signal at a
  point in time. It does not describe how trust in a source **moves** as that source is repeatedly
  right or wrong. Today the 80/85 confidence/quality defaults are undifferentiated constants and are
  explicitly barred from ever becoming authority.
- **Builds on.** `ESF-4` (**not yet delivered** — this idea is downstream of it, never a substitute
  for it), `ESF-1`/`ESF-2`, `EvidenceProvenance.confidence_provenance` / `quality_provenance`
  (`SUPPLIED` vs `ADAPTER_DEFAULT`, established by `ESF-6`), `DOT-11` Signal Half-Life.
- **Could unlock.** Source-level trust progression; weighting that is earned rather than declared.
- **Dependencies.** HARD: `ESF-4`, then non-trivial attested observation volume (`IB-01`).
- **Stage.** `Idea`. **Master Plan status.** Not authorised.
- **Standing prohibition.** Trust progression may rank and weight. It may never establish authority,
  eligibility or a verdict — the Master Plan's ML/deterministic boundary applies unchanged.

#### `IB-03` — Decision Learning Lab

- **Problem / opportunity.** `LearningCase`, `LearningCandidate` and `LearningEligibility` are
  governed contracts with no place to inspect them. There is nowhere to ask *what has CogniX
  actually learned, from which cases, and what refused to qualify and why* — and the refusals are
  the more valuable half.
- **Builds on.** `CDI-07B` (learning loop), `CDI-08` (`PredictionOutcomeComparison`), `WP10-D`
  (`cognix-learning`, `ILearningPatternRepository`), the `Y4-gov` telemetry correction.
- **Could unlock.** Visible learning provenance; the review surface `Y4-cal`'s X3 gate will need.
- **Dependencies.** HARD: `IB-01` (there is nothing to study without eligible cases).
- **Stage.** `Idea`. **Master Plan status.** Not authorised.

#### `IB-04` — Evidence Maturity

- **Problem / opportunity.** The estate carries **at least four** independent evidence axes and no
  single place that explains how they relate. A reader cannot currently answer *how strong is this
  number* without knowing which of the four to consult.
- **The four existing axes, none of which this idea may collapse.**
  1. `EvidenceStrength` — per-datum, ordered, 8 values (`OBSERVED` … `MISSING`),
     `packages/contracts/src/campaign-readiness-model.ts`.
  2. `ObservationAuthority` — 4 values (`AUTHORITATIVE_EXTERNAL`, `SYNTHETIC_DEMONSTRATION`,
     `SCENARIO_DERIVED`, `UNATTRIBUTED`) plus `EvidenceProvenance.origin` (`ESF-6`).
  3. **Demand Observability Maturity Level 0–5** — estate-level, not datum-level
     ([`DEMAND_OBSERVABILITY_MODEL.md`](DEMAND_OBSERVABILITY_MODEL.md) §5).
  4. **ADR-048 evidence classes** — From-CogniX / Market Context / Interpretation (Atlas).
- **Binding constraint.** *This is explicitly not a linear maturity ladder.* The repository already
  proves the model is multidimensional: a datum can be `OBSERVED` in strength and
  `SYNTHETIC_DEMONSTRATION` in authority at the same time, and those two facts are both true. Any
  design that renders them as one ascending scale is wrong and must be refused.
- **Builds on.** All four axes above. **Adds** no fifth axis — it reconciles and renders.
- **Dependencies.** ENHANCEMENT: `ESF-4`, `IB-01`.
- **Stage.** `Idea`. **Master Plan status.** Not authorised.

---

### Theme B — Market & Product Discovery

*`ATL-06B`/`ATL-06C` proved CogniX can admit external evidence about the market and reason over it
under refusal discipline. Nothing yet routes what the market says back into what CogniX chooses to
build.*

#### `IB-05` — Capability Atlas Market Study Programme

- **Problem / opportunity.** External market evidence is retrieved **per question, user-initiated,
  and cached briefly** (ADR-056). There is no standing study of a capability's market position, and
  no governed record of what was found, when, and whether it still holds.
- **Builds on.** `ATL-06A` (admission, provenance, freshness, contradiction precedence ADR-053),
  `ATL-06B` (grounded segments only, ADR-055), `ATL-06C` (verified interpretation, ADR-057), the
  capability knowledge model's market-evidence fields.
- **Could unlock.** Evidence-backed positioning, and the first content for a check that already
  exists: `ATL-07` delivered `GOV-REC-8` market-evidence freshness, which
  [`COGNIX_ATLAS_RESIDUAL_REGISTER.md`](COGNIX_ATLAS_RESIDUAL_REGISTER.md) `R-18` records as never
  having fired in anger because `R-04` leaves `external_evidence` at **0 of 38**. This idea is the
  work that would populate it — **and populating it by relaxing an allowlist, provenance or freshness
  rule is the one change that would make the field worse than empty** (`R-04`).
- **Dependencies.** HARD: `ATL-06B`. INTEGRATION: `ATL-07` (`[COMPLETED]`).
- **Stage.** `Idea`. **Master Plan status.** Not authorised.
- **Standing prohibition.** ADR-066 stands: a study may not describe a named competitor's
  functionality or assert superiority. A contradiction with governed CogniX truth separates into
  three classes (ADR-053); it never synthesises into one statement.

#### `IB-06` — Client Feedback → Experiment Loop

- **Problem / opportunity.** `CognixExperiment.learnings[]` already has a slot for
  `clientFeedbackSummary` and `keyInsights`. Nothing captures feedback into it, and no path leads
  from a client reaction to a backlog idea. Phase 13 charters demo feedback logging; it is not built.
- **Builds on.** `EXPERIMENT_MODEL.md` `learnings[]`, `ATL-06D` client conversation packs (which
  already model *the conversation*, and would be the natural place the reaction is captured),
  Phase 13, this register.
- **Could unlock.** A governed route from client evidence into `IB-*` entries and experiment
  retirement decisions.
- **Dependencies.** INTEGRATION: `ATL-06D` (`[COMPLETED]`), Phase 13.
- **Stage.** `Idea`. **Master Plan status.** Not authorised.

#### `IB-07` — Demo Telemetry as Product Discovery Evidence

- **Problem / opportunity.** `WP10-B` Journey Telemetry emits a canonical event stream across every
  surface, and it is read today only as diagnostics. What executives actually explore during a
  demonstration is product-discovery evidence nobody reads.
- **Builds on.** `WP10-B` (`docs/openapi/journey-v1.yaml`, `lib/journey-client.ts`, the
  `packages/contracts` event catalogue, `/api/v1/journey/*`), the Observability & Governance
  *Decision observability* section.
- **Could unlock.** Which capabilities create curiosity, and which are never reached.
- **Dependencies.** HARD: `WP10-B` (`[COMPLETED]`).
- **Stage.** `Idea`. **Master Plan status.** Not authorised.
- **Binding constraint.** Journey Telemetry is **strictly separated from Enterprise Signals** and
  from learning eligibility. `WP10-D` telemetry is excluded from `LearningCase` eligibility today and
  stays excluded — this idea reads telemetry as *product* evidence, never as *decision* evidence.

---

### Theme C — Domain Expansion

#### `IB-08` — Cross-Domain Capability Packs / Domain Translation Experiments

- **Problem / opportunity.** The capability corpus is populated for `retail_grocery` plus a
  cross-domain platform set (`ATL-03`). Whether a capability *translates* to another domain — and
  what breaks when it does — is recorded nowhere.
- **Builds on.** `config/domains.ts`, the Atlas cross-domain-reuse knowledge fields, Phase 12
  (Industry Demonstration Packs, `config/industry-packs.ts`), the `CAP-*` registry.
- **Could unlock.** Governed domain packs; evidence for which capabilities are domain-general.
- **Dependencies.** HARD: `ATL-03` (`[COMPLETED]`). INTEGRATION: Phase 12.
- **Stage.** `Idea`. **Master Plan status.** Not authorised.
- **Binding constraint.** A capability claimed in a new domain needs domain evidence in the Atlas.
  Re-labelling a retail capability is not translation.

---

### Theme D — Data & Integration Fabric

#### `IB-09` — Governed Data Intake & Qualification

- **Problem / opportunity.** `ESF-6` governs *admission* — whether a source has authority. It does
  not govern *qualification*: whether an arriving dataset is at the right grain, complete, internally
  consistent and fit to be admitted at all. Today there is no intake path of any kind.
- **Builds on.** `ESF-6` attested source registry and receipts, `ESF-3` envelope normalisation,
  `ObservationCompleteness` (derived, never assumed), `ObservationGrainKey`.
- **Could unlock.** The acquisition half of `IB-01`; Demand Observability Level 1.
- **Dependencies.** HARD: `ESF-6` (`[COMPLETED]`). INTEGRATION: `IB-01`.
- **Stage.** `Idea`. **Master Plan status.** Not authorised.
- **Binding constraint.** Intake creates **no second origin of `synthetic_demo = false`**. `ESF-6`
  remains the only origin in the estate — the rule `DOT-9` is already bound by.

#### `IB-10` — Enterprise Data Connectivity Fabric

- **Problem / opportunity.** `ESF-3` defines a provider-neutral connector contract with seven
  reference adapters, all `synthetic_demo: true` and with no registration path. Connectivity to real
  enterprise systems is an architecture, not an implementation.
- **Scope note — MCP.** The Model Context Protocol is recorded as **one supported connectivity
  mechanism among several**, behind the existing `ESF-3` envelope-normalisation seam. It is not a
  separate architecture, not a second signal path, and confers no authority: anything arriving over
  MCP is admitted by `ESF-6` on exactly the same terms as anything else, or it is not admitted.
- **Builds on.** `ESF-3` (`external-signal-connector-model.ts`), `ESF-6` admission, `ESF-1`
  canonical `EnterpriseSignal`.
- **Could unlock.** Real planning/commerce/operational feeds; `IB-09` intake at volume.
- **Dependencies.** HARD: `ESF-3`, `ESF-6` (both `[COMPLETED]`). INTEGRATION: `IB-09`.
- **Stage.** `Idea`. **Master Plan status.** Not authorised.

---

### Theme E — Platform AI Governance

#### `IB-11` — AI Provider & Model Governance

- **Problem / opportunity.** ADR-067 made model selection one governed server-side configuration
  after four independent hard-coded copies went stale together and every fixture-backed test kept
  passing. ADR-044 Amendment A records **two** Gemini credential paths, the legacy client-supplied-key
  mechanism retained as technical debt and closed to new use. The remaining gap is operational.
- **Scope this idea covers.** Secure credential *references* rather than values; more than one
  provider/model configuration; purpose-based routing (drafting, grounding, interpretation are three
  different risk profiles reaching one provider today); connection and model testing an operator can
  run; credential health and rotation.
- **Builds on.** `config/gemini-models.ts` (ADR-067), the `ATL-06A` provider seam, the separate
  `ATL-06C` interpretation adapter (which deliberately carries no search tool),
  `scripts/atlas-credential-isolation-check.sh`, `scripts/atlas-live-grounding-check.ts`.
- **Could unlock.** Closing the ADR-044 legacy path, which
  [`COGNIX_ATLAS_RESIDUAL_REGISTER.md`](COGNIX_ATLAS_RESIDUAL_REGISTER.md) `R-15` carries as open
  recorded technical debt — `/api/ask` and `/api/briefing` still take a provider key from the client.
  `ATL-07` since made live-provider drift a governed subject (ADR-068,
  `config/atlas-provider-verification.ts`) and `AC-ATL-06C-9` closed on a real credentialed round
  trip; what neither addresses is more than one provider configuration, purpose-based routing, or
  credential rotation.
- **Dependencies.** HARD: ADR-067 (implemented). INTEGRATION: `ATL-06A`/`B`/`C`.
- **Stage.** `Idea`. **Master Plan status.** Not authorised.
- **Binding constraint.** Model choice is server-side and deliberately not `NEXT_PUBLIC_*`.
  Credentials never reach a client bundle, an image filesystem, a response body or a log — proven
  today and non-negotiable in any future design.

---

### Theme F — Campaign Intelligence

#### `IB-12` — Campaign Asset Intelligence

- **Problem / opportunity.** A campaign decision is governed end to end — intent, counterfactual,
  readiness, frontier, contract — and the **creative and merchandising assets that execute it** are
  outside the model entirely. Which asset ran, where, and how it related to the observed outcome is
  unrepresentable.
- **Builds on.** `CDI-01` `CampaignIntent` (mechanic, activation channels, audience segment),
  `CampaignDecisionExperiment` preservation snapshots, `ExecutionBrief`.
- **Could unlock.** Asset-level attribution as a declared dimension of a campaign observation.
- **Dependencies.** HARD: `CDI-01` (`[COMPLETED]`). INTEGRATION: `IB-13`, `IB-01`.
- **Stage.** `Idea`. **Master Plan status.** Not authorised.
- **Binding constraint.** Asset performance is an observation like any other. It carries no authority
  without `ESF-6` admission, and asset-level attribution is a *declared* measurement design, never
  an inferred one.

#### `IB-13` — Continuous Live Decision Twin — **DELIVERED 2026-08-23**

Specified in full in §5. Summary entry:

- **Stage.** **`Delivered`** on 2026-08-23, on the owner's instruction at the close of `FM-01`.
  `In Delivery` from 2026-08-22 to 2026-08-23. **`Delivered` is the register's terminal state** — the
  idea leaves the register and the work packages' own `[COMPLETED]` statuses are authoritative from
  here.
- **The delivered implementation chain**, in the order the owner sequenced it:

  | | Work package | Status |
  |---|---|---|
  | 1 | `CTW-01` — Continuous Campaign Timeline & Activation | `[COMPLETED]` 2026-08-22 |
  | 2 | `CTW-01R` — Campaign Decision Experience | `[COMPLETED]` 2026-08-23 |
  | 3 | `CTW-03` — Governed Forecast Model Execution Boundary | `[COMPLETED]` 2026-08-23 |
  | 4 | `CTW-02` — Predictive Intervention Planning | `[COMPLETED]` 2026-08-23 |

  `CTW-03` was taken **before** `CTW-02` on the owner's resequencing decision, because a Decision
  Moment is a day that differs from other days and no predicted day differed until a governed
  forecast shaped the horizon —
  [`COGNIX_FORECAST_MODEL_TRUTH_RECORD.md`](COGNIX_FORECAST_MODEL_TRUTH_RECORD.md) §5.1, §6.
- **Delivered while carrying an explicit deferral, which is normal.** *Post-flight reconciliation* is
  **not delivered** and is **not a gap in `IB-13`**: it is extension work on `CDI-08`
  `PredictionOutcomeComparison` and the `CampaignDecisionExperiment` comparison surface, deliberately
  never a `CTW` work package because a third package there would build a competing history model. An
  innovation can be delivered and still have future extensions.
- **Two limitations travel with the delivery and are recorded on the capability records rather than
  softened here.** No elapsed day carries an `ESF-6`-admitted observation, so every elapsed day is
  `SIMULATED_ELAPSED` and says so; and the in-flight uncertainty band remains a declared profile, not
  a calibrated interval.
- **What `Delivered` does not mean.** It records that the authorised work is complete and verified,
  not that the owner has accepted Release 1.0. Owner acceptance testing of the release is a separate,
  subsequent gate, and DevOps handoff follows it.
- **Capability Atlas.** The delivery registered three `CAP-*` capabilities —
  `CAP-CONTINUOUS-DECISION-TWIN`, `CAP-GOVERNED-FORECAST` and `CAP-PREDICTIVE-INTERVENTION`. Rule 3
  below is unweakened: the *idea* was never a capability, and these records exist because the
  implementations now do.
- **Master Plan status.** **Authorised and complete.** The authoritative scope is the `CTW` section of
  [`MASTER_PLAN.md`](MASTER_PLAN.md), not this entry — §5 below is preserved as the record of what
  was proposed and why, and is no longer the governing document for any `CTW` work package.
- **Priority.** **Demo priority** — see §6 for what that does and does not mean.
- **Dependencies.** HARD: `CDI-05` (timeline), `CDI-07A` (`DecisionContract`), `CDI-02`
  (counterfactual/causal), all `[COMPLETED]`. INTEGRATION: `campaign-experiment-store`
  preservation/comparison, `WP10-C`. ENHANCEMENT: `IB-01`, `IB-04`.

---

## 4. Architectural relationships — the backlog is not a flat list

### 4.1 The emerging conceptual lifecycle

This is **conceptual planning**. Recording it authorises none of it. Where a stage already has a
governed home in the estate, that home is named — the backlog adds nothing beside it.

```text
  Business / External Data        → IB-10 Connectivity Fabric  (over ESF-3 envelopes)
          ↓
  Data Qualification              → IB-09 Governed Intake
          ↓
  Evidence Maturity               → IB-04  (reconciles 4 EXISTING axes, adds no fifth)
          ↓
  Signal Trust & Provenance       → ESF-4 [Master Plan, not started] → IB-02 progression
          ↓
  Decision Intelligence           → EXISTS: CDI-01…CDI-08, DDF-01, IFI-01  [COMPLETED]
          ↓
  Decision Twin                   → EXISTS pre-flight; IB-13 makes it continuous
          ↓
  Observed Outcomes               → IB-01 Observation & Outcome Fabric
          ↓
  Attested Observations           → EXISTS: ESF-6 admission predicate  [COMPLETED]
          ↓
  Decision Learning               → EXISTS: CDI-07B / CDI-08; IB-03 makes it inspectable
          ↓
  Learned Behaviour               → GATED: N ≥ 3 eligible cases, X3 gate, Y4-cal, ML workstream
```

**Read this correctly.** Four of the ten stages are already built and governed. The backlog's real
content is the **top three** (connectivity, qualification, evidence maturity) and the **acquisition
gap** at *Observed Outcomes* — which is precisely the gap that `ESF-6` exposed by making admission
possible without making observations arrive.

### 4.2 Discovery relationships

These do not sit on the lifecycle chain. They are how the backlog itself gets evidence.

```text
  Client Feedback   →  IB-06  →  new / re-staged IB-* entries and retirement decisions
  Demo Telemetry    →  IB-07  →  which capabilities create curiosity  (product evidence, never decision evidence)
  Market Studies    →  IB-05  →  external evidence under ATL-06A admission and ADR-053 precedence
```

### 4.3 Enabling relationships between backlog ideas

```text
  IB-10 Connectivity ──┐
                       ├──> IB-09 Qualification ──> IB-01 Observation Fabric ──┬──> IB-03 Learning Lab
  ESF-6 [COMPLETED] ───┘                                    ▲                  └──> Y1 / Y2 / N ≥ 3 (Master Plan)
                                                            │
  IB-13 Continuous Twin ──── produces campaign observation candidates ──┘   (candidates only — §5.7)

  ESF-4 [not started] ──> IB-02 Signal Trust Progression ──> DOT-11 (Master Plan roadmap)
  IB-04 Evidence Maturity ──> reads all of the above; owns none of it
  IB-13 ──> IB-12 Campaign Asset Intelligence  (an asset is a dimension of a campaign observation)
```

---

## 5. `IB-13` — Continuous Live Decision Twin

### 5.1 Why explore it

Transform Promotion Intelligence from **two disconnected views** — a governed pre-flight assessment
and an unrelated in-flight snapshot — into **one continuous decision lifecycle** a client can follow
from decision, through execution and deviation, to reconciled outcome.

### 5.2 Current implementation truth, established by inspection

This is what the code does today at `f1c390bc`. It is recorded so that no future reader mistakes the
target journey for the current one.

**Pre-flight (`activeMode === 'PLANNING'`) is real.** `components/PromotionPlanner.tsx` builds a
`CampaignIntent` from the selected archetype plus the live controls and calls four **governed
engines** on every configuration change — `evaluateCampaignDecisionClient` (CDI-02),
`discoverCampaignOpportunityClient` (CDI-03), `evaluateCampaignReadinessClient` (CDI-04),
`projectDecisionTimelineClient` (CDI-05). Failures clear the slot rather than leaving a previous
configuration's numbers on screen.

**In-flight (`activeMode === 'DECISION_TWIN'`) is a static literal.**
`components/campaign/LiveDecisionTwinLens.tsx` receives exactly one prop of substance —
`archetype` — and reads `archetype.decision_twin` from `lib/campaign-archetypes.ts`. It calls no
engine, no API and no store.

Five specific facts follow, each verified:

1. **The remaining horizon does not exist.** `telemetry_streams.length === current_day` in **all
   seven** archetypes (5/14, 4/14, 3/7, 5/14, 6/14, 2/5, 5/14). Days `current_day + 1 … flight_days`
   have no representation of any kind — **52 campaign days across the seven archetypes are absent**,
   not predicted-and-hidden. "Day 5 of 14" is a literal, and the other nine days are simply not there.
2. **Both series are seeded.** `expected_*` and `observed_*` are hand-authored literals on
   `DecisionTwinStream`. Neither is derived from the CDI-02 evaluation the pre-flight view just ran.
3. **The twin does not read the configuration.** Discount depth, region and duration drive the
   pre-flight engines and reach the twin not at all. Setting a 30-day duration still yields
   "Day 5 of 14".
4. **There is no activation and no baseline binding.** `activeMode` is local React state with two
   values and no transition semantics. Nothing captures a pre-flight expectation as the baseline the
   in-flight period is assessed against.
5. **Applying an in-flight action does nothing.** `handleApplyInFlightAction` is an empty function
   body. `TwinDeviation.recommended_in_flight_action` renders a `current_vs_proposed` block that
   changes no model, creates no trajectory and is not recorded.

**Honestly labelled today, and that must be preserved.** The twin declares
`telemetry_basis: 'SIMULATED_DEMO'` structurally and shows a `SIMULATED TELEMETRY (DEMO)` badge. The
Master Plan asserts permanently, in the test suite, that no archetype datum may carry the governed
bare `OBSERVED` class, claim a live feed, or reintroduce `confidence_pct`. **`IB-13` does not relax
any of that** — a continuous twin over seeded data is still seeded data, and says so.

**`post_campaign_learning` already exists** as a seeded narrative block carrying
`learning_case_status: 'NON_AUTHORITATIVE'` — which is the correct value and must stay correct.

### 5.3 Target journey

```text
PRE-FLIGHT
  Promotion simulation  (EXISTS — CDI-02/03/04/06 engines)
        ↓
  Review decision       (EXISTS — CDI-04 readiness verdict)
        ↓
  Approve / activate    (NEW — the missing transition, §5.4)
        ↓
IN-FLIGHT
  Observed / simulated completed days   +   Predicted remaining horizon   (NEW — §5.5)
        ↓
  Deviation detection        (EXISTS as seeded TwinDeviation; needs a basis)
        ↓
  Adaptive intervention      (NEW — trade-off before activation, §5.6)
        ↓
  Reforecast remaining campaign  (NEW — new trajectory, original preserved)
        ↓
POST-FLIGHT
  Campaign completion
        ↓
  Expectation vs outcome         (EXTEND — CDI-08 PredictionOutcomeComparison)
        ↓
  Intervention effectiveness
        ↓
  Compare previous campaigns     (EXTEND — campaign-experiment-store comparison)
        ↓
  Attested observation candidate (CANDIDATE ONLY — §5.7)
        ↓
  Future learning eligibility    (GATED — ESF-6 / CDI-08, unchanged)
```

### 5.4 Pre-flight activation dependency

> **Desired state transition:** the Live Decision Twin must stop behaving as an unrelated standalone
> simulation. The journey is
> `Pre-flight Decision Intelligence → Review → Activate → Campaign-In-Flight`,
> and **activation establishes the governed baseline against which the in-flight campaign is
> assessed.**

**Best future implementation approach, from the existing architecture — do not implement now.**

The estate already has the right object and it is not `activeMode`. **`DecisionContract` (`CDI-07A`)
is the activation record.** It is created from a frontier and an intent, carries an immutable
`decision_basis_digest` over sixteen canonical inputs, a content-derived `contract_digest`, a
`status` of `ACTIVE`/`SUPERSEDED`/`WITHDRAWN`, declared `assumptions`, `triggers` with
`WATCH`/`DEGRADED`/`REASSESS_REQUIRED` effects, and — from `CDI-08` — `prediction_envelopes`, a
tolerance **declared before the outcome**.

That is, precisely, "the governed baseline against which the in-flight campaign is assessed". The
recommended approach is therefore:

- **Activation creates or binds an `ACTIVE` `DecisionContract`**, and the in-flight period is
  assessed against *that contract's* basis — not against a copy of the screen state.
- **`DecisionValidityAssessment` and `TriggerEvaluation` already exist** for "is this decision still
  valid" and "has a declared trigger fired". The seeded `is_decision_still_valid` string
  (`STILL VALID` / `RECONSIDER` / `CONDITION BREACHED`) should resolve to the governed
  `DecisionValidityState`, not remain a parallel vocabulary.
- **Do not introduce a second baseline.** A new "activated campaign" contract competing with
  `DecisionContract` would give the estate two truths about what was decided. Supersession is
  already modelled (`supersedes` / `superseded_by`).
- Campaign-in-flight state that is genuinely not contract data belongs in **`WP10-C` Shared Decision
  State**, which already carries optimistic concurrency and tenant/session isolation.

### 5.5 Full-horizon in-flight projection

Target behaviour for a 14-day campaign at Day 5:

```text
  Day 1–5                        Day 6–14
  Observed / simulated           Predicted
        │                            │
        └────────── TODAY ───────────┘
```

The twin shows the **entire selected campaign horizon**, not only the elapsed part.

**Candidate projected quantities — and the discipline governing them.** Only quantities the estate
can already defend are listed. Nothing is added because it would make a demonstration look better.

| Quantity | Defensible basis today | Position |
|---|---|---|
| **Demand** | `CDI-02` causal demand + `CDI-05` `TimelineSeriesPoint.index_pct` under `FLAT_RATE_IDENTITY` | **Yes** — the pre-flight timeline already projects it across `PRE_CAMPAIGN`/`CAMPAIGN`/`POST_CAMPAIGN` |
| **Margin / contribution** | `CDI-05` `CONTRIBUTION` lens, `quantity_basis: 'cdi02_unit_contribution'` | **Yes** |
| **Stock trajectory** | `CDI-05` `INVENTORY` lens; `WP10-C` supplies **scalars, never a series** | **Qualified** — a stock *series* needs a declared depletion basis; the `scalar_annotations` field exists precisely to stop a scalar being drawn as a trend |
| **Deviation from pre-flight expectation** | The activated contract's basis vs the observed series | **Yes** — this is the core of the idea |
| **Uncertainty / confidence** | `TimelineConfidenceEnvelope` — `horizon_basis: 'declared_horizon_uncertainty_profile'`, `synthetic_demo: true` | **Yes, with its declared basis shown.** It is a declared profile, not a calibrated interval, and must never be presented as one |
| **Revenue** | `CDI-05` publishes `REVENUE` as **`NOT_AVAILABLE`** with a `RequiredAuthoritativeInput` | **No.** Do not add it. The refusal is correct and load-bearing |

**The reusable finding.** `CDI-05` already projects a full horizon with two trajectories, a
confidence envelope, per-point `basis`, per-point `strength` and per-point `synthetic_demo`, and
`POST_CAMPAIGN` is already *structurally present and numerically empty*. The continuous twin is
largely **a second consumer of `DecisionTimelineProjection`**, not a new projection engine.

**The prohibition that governs the whole idea (ADR-070).** Observed, simulated and predicted are
**three separate declared series over one horizon**. They are never blended into one line, never
share a visual treatment, and a future prediction may never render or read as an observation. Every
point already carries `basis`, `strength` and `synthetic_demo` — the model to keep them apart exists
and must be used, not bypassed.

### 5.6 Trajectory comparison and adaptive intervention

Four states must remain distinguishable, so a user can answer four questions:

| Question | Trajectory |
|---|---|
| What did we expect? | **Original pre-flight trajectory** — bound to the activated contract's `decision_basis_digest`, immutable |
| What actually happened? | **Observed campaign trajectory** — elapsed days only, never extended into the future |
| What do we now expect? | **Current remaining-period forecast** — the reforecast over `current_day + 1 … flight_days` |
| What happens if we intervene? | **Intervention-adjusted trajectory** — shown *before* activation as a comparison |

`TimelineTrajectoryKind` today has two values (`COUNTERFACTUAL`, `INTERVENTION`). This is the one
place a genuinely new governed concept is required, and it is a small, additive one.

**Intervention trade-off, shown before activation:**

```text
  WITHOUT INTERVENTION          WITH INTERVENTION            TRADE-OFF
  Projected demand              Projected demand             What improves
  Projected margin              Projected margin             What is sacrificed
  Projected stock               Projected stock              Why CogniX recommends it
```

The seeded `TwinDeviation.recommended_in_flight_action.current_vs_proposed` block is the right
*shape* — e.g. *reduce discount depth in a region to protect margin while preserving sufficient
demand* — and today changes nothing. The trade-off statement should be built the way
`ComparisonSynthesis.trade_offs` and `watch_items` already are: stated from preserved snapshots,
never asserted beyond them, with **no single composite score** — the existing model deliberately
refuses to collapse commercial return, execution risk and evidence strength into one number.

**On activating an intervention — binding:**

1. **Preserve the original trajectory.** It is bound to the contract digest and does not move.
2. **Record the intervention** as a governed event with its own timestamp, basis and rationale.
3. **Create a new decision trajectory** — an additional series, not an edit.
4. **Reforecast only the remaining horizon.** Elapsed observed days are never recomputed.
5. **Do not overwrite history.** `DecisionContract` supersession (`supersedes` / `superseded_by`)
   already models "the decision changed and both versions remain readable". Use it.

### 5.7 Post-flight reconciliation

A Post-Flight state after the campaign ends, supporting comparison of original expectation, actual
outcome, interventions, final trajectory, and previous comparable promotions.

**Reuse, do not rebuild — there are two governed history models already and neither may be
duplicated:**

- **`CDI-08` `PredictionOutcomeComparison`** — `PredictedQuantityRecord` / `ObservedQuantityRecord`,
  `PredictionError`, `ComparabilityVerdict`, `ComparisonVerdict`, `LearningEligibility`. This *is*
  expectation-versus-outcome, already governed with same-metric, same-basis, same-window
  correspondence derived rather than asserted.
- **`campaign-experiment-store` / `CampaignDecisionExperiment`** — preserved decisions with full
  snapshots and a 2–4 experiment comparison producing per-dimension standings and an honest
  `separates: false` when the evidence does not separate them. This *is* "compare previous
  campaigns". A completed campaign is a preserved decision with an outcome, not a new record type.

**The prohibition that matters most in this whole idea:**

> **The Live Decision Twin must not claim to perform ML or learning merely because it captures an
> outcome.**

A completed campaign produces an **attested observation *candidate*** and nothing more. Whether that
candidate is admitted remains governed entirely by `ESF-6` (`source × context → authority`), and
whether it corresponds to what was contracted remains governed entirely by `CDI-08`
(`contract × observation → comparability`). `IB-13` **creates no new origin of
`synthetic_demo = false`**, arms no learning path, and leaves `learning_case_status` reading
`NON_AUTHORITATIVE` for as long as that is the truth. Actual learning stays behind the existing
gates: N ≥ 3 independent eligible cases, the X3 gate, and the standing rule that ML may rank,
cluster, shortlist and suggest but may never establish authority, eligibility, correspondence,
comparability or a verdict.

### 5.8 Smallest safe decomposition — recommended, not authorised

Two work packages. A third is deliberately **not** proposed: post-flight reconciliation is an
extension of `CDI-08` and the experiment comparison surface, and pulling it into a separate twin work
package would create a competing history model — which §5.7 forbids.

| | Proposed WP | Scope | Why this boundary |
|---|---|---|---|
| **1** | **`CTW-01` — Continuous Campaign Timeline & Activation** | Activation binding the in-flight period to an `ACTIVE` `DecisionContract`; the full selected horizon rendered; observed / simulated / predicted as three separately declared series; the remaining horizon projected from `DecisionTimelineProjection` (demand, contribution, deviation, declared uncertainty envelope) | This is where the demo value is. It is also the only place a new architectural concept is needed (a third trajectory kind + activation semantics), so it should be frozen before anything is built on it |
| **2** | **`CTW-02` — Adaptive Trajectory & Intervention Reforecast** | Trade-off comparison before activation; on activation, preserve the original, record the intervention, add a new trajectory, reforecast the remaining horizon only | Strictly additive on `CTW-01`'s frozen trajectory model. Cannot be built first — there is nothing to fork from |
| **3** | **NONE** | Post-flight reconciliation is **extension work on `CDI-08` + `campaign-experiment-store`**, scoped when observation acquisition (`IB-01`) is decided | A third WP here would build a second history model |

**Recommended first implementation WP if the owner authorises: `CTW-01`.**

`CTW-*` identifiers are **proposed** here and become real only on entry into `MASTER_PLAN.md`.

### 5.9 Risks

| Risk | Why it matters | Mitigation to carry into any WP |
|---|---|---|
| **Predictions read as observations** | The single most damaging outcome. It would put a fabricated number in front of a client in a programme whose defining discipline is refusing to fabricate | ADR-070. Three declared series, distinct treatment, `basis`/`strength`/`synthetic_demo` on every point, asserted in tests |
| **A second baseline** | Two truths about what was decided | Activation binds to `DecisionContract`; no new contract type |
| **A second history model** | `CDI-08` and the experiment store already reconcile outcomes | Post-flight extends both; it does not replace them |
| **Silent authority creep** | A captured outcome quietly becoming a learning input | Candidate only. `ESF-6` and `CDI-08` gates unchanged; no new origin of `synthetic_demo = false` |
| **Demo pressure adding undefensible metrics** | Revenue is `NOT_AVAILABLE` by a correct refusal; a stock *series* has no declared depletion basis | §5.5 table is the scope boundary. Adding a quantity means declaring its basis first |
| **Regression across seven completed CDI packages** | The twin sits inside the most heavily tested surface in the estate | Full re-execution of the recorded runner baselines is a gate condition |

### 5.10 Demo value

A client currently sees a governed pre-flight assessment, then a separate screen showing five days of
a fourteen-day campaign with no future and no connection to the decision they just watched being
made. The continuous journey lets one narrative run end to end: *this is what we decided and why;
this is what has happened since; this is what we now expect for the rest of the campaign; this is
what changes if we intervene; and this is what we would learn when it finishes.* That is the product
thesis, demonstrated rather than described — and it is demonstrable entirely on seeded data, honestly
labelled, with no new external dependency.

---

## 6. Demo priority is not Master Plan priority

Two facts, both true, neither derived from the other. They are recorded separately because collapsing
them would rewrite the programme's history.

### 6.1 Existing programme continuation — unchanged

**`ESF-4 — Signal Quality, Confidence & Provenance` is the existing programme's continuation
point**, and this register does not qualify that finding — it adopts it. On 2026-08-22 the owner
**parked `ESF-4` temporarily** to take `CTW-01` first for upcoming client demonstrations, and
recorded that it is **not superseded, cancelled or architecturally deprioritised**. Parking changes
the order of work, not the finding below.
[`COGNIX_MASTER_PLAN_FORENSIC_STATUS_ASSESSMENT.md`](../reports/COGNIX_MASTER_PLAN_FORENSIC_STATUS_ASSESSMENT.md)
§7 states it directly: *if the Capability Atlas had never diverted attention, the next unfinished work
package is `ESF-4`*, on four grounds —

1. It is **the only unstarted package whose hard dependency is satisfied**. `ESF-6` completed
   2026-08-16, which is the condition ruling **G4** imposed, and it is the only one that is met.
2. It sits at exactly that point in the frozen post-`CDI-07B` sequence — first of four branches below
   the *first defensible `LearningCase` possible* line, and the only one not itself gated on
   observation volume.
3. It **unblocks the most**: `ESF-5` needs it, and `DOT-11` names it a hard prerequisite —
   *grading precedes weighting, exactly as admission precedes grading*.
4. It **closes a live honesty gap**: `EnterpriseSignal.quality` and `.confidence` are carried in the
   governed contract, rendered on the signal surfaces, and filled with hard-coded constants — the
   estate's last remaining unqualified figures on a governed contract.

**Earliest prerequisite-sensitive and highest-value are the same package**, and the assessment says so
explicitly: no other candidate is both. The earlier post-CDI consolidation assessment §4.1 verdict of
*"valuable, wrongly positioned as next"* was a sequencing judgement made **before** admission landed;
`G4` repositioned `ESF-4` to parallel-eligible **after** `ESF-6`, and that condition is now met. The
two assessments do not disagree — the second is the first, re-read after its precondition arrived.

*Also unblocked, per the same assessment §7, and not displaced by anything here:* `Y1` and `Y2` as
**design** tracks, and attested-source onboarding, which is an operational act no work package can
perform for itself (owner decision **OD-3**). The Capability Atlas workstream is closed —
`ATL-01`…`ATL-07` and `ATL-FINAL` all `[COMPLETED]`, `AC-ATL-06C-9` closed on a real credentialed
round trip — and by its own separation discipline it supersedes and reprioritises nothing.

### 6.2 Demo-priority innovation — separate axis

**`IB-13` Continuous Live Decision Twin is prioritised separately, because upcoming client
demonstrations would benefit materially from showing a continuous decision journey rather than a
five-day simulated snapshot.**

`IB-13` did not precede `ESF-4` and is not recorded as having done so. It was raised on 2026-08-22,
after `CDI-08`, `ESF-6`, `DDF-01` and `ATL-06D` completed.

### 6.3 The distinction, stated so the owner can act on it

| | `ESF-4` | `IB-13` Continuous Live Decision Twin |
|---|---|---|
| Governance object | Master Plan work package | Innovation Backlog idea |
| Status | Specified, prerequisites satisfied, **not started** | **Not authorised**, no work package |
| Priority basis | Programme dependency sequence | Client demonstration value |
| Contracts touched | `enterprise-signal-model`, `external-signal-connector-model` | `campaign-timeline-model`, `campaign-decision-contract-model` |
| Overlap | **None** | **None** |

**Does `IB-13` supersede `ESF-4`? No.** Different capability, different contracts, different
priority basis. Neither blocks the other.

**Can `IB-13` be authorised independently? Yes** — its hard dependencies (`CDI-02`, `CDI-05`,
`CDI-07A`) are all `[COMPLETED]`, and it touches no file `ESF-4` touches.

The owner may therefore authorise **`ESF-4` continuation**, **`IB-13` demo-priority enhancement**, or
**controlled parallel execution** of both, without ambiguity in any direction.

---

## 7. Owner decisions required

| # | Decision | Consequence |
|---|---|---|
| 1 | ~~Authorise `ESF-4`, `IB-13`, both in parallel, or neither~~ **Decided 2026-08-22:** `CTW-01` first, `ESF-4` temporarily parked | `CTW-01` delivered; `ESF-4` unchanged and still the canonical continuation |
| 2 | ~~Authorise `CTW-01` and admit `CTW-*`~~ **Decided 2026-08-22** | `CTW` registered; `CTW-01` `[COMPLETED]` |
| 3 | ~~Approve the `CTW-01` metric boundary~~ **Decided 2026-08-22:** demand, contribution, deviation, declared uncertainty; no revenue; no stock series without a governed depletion basis | Implemented as approved and asserted in the suite |
| 3a | ~~**Open:** authorise `CTW-02`, resume `ESF-4`, or run them in parallel~~ **Decided 2026-08-23:** the full `CTW` programme was authorised and taken as `CTW-01R` → `CTW-03` → `CTW-02` | All four `CTW` packages `[COMPLETED]`; `ESF-4` unchanged and still parked |
| 3b | ~~**Open:** retire the legacy `getForecastProjections` path and migrate Demand & Forecast onto the governed boundary~~ **Decided 2026-08-23:** authorised as `FM-01` | One forecasting architecture; `D-FM-1`…`D-FM-5` and `D-FM-7` closed; Release 1.0 engineering baseline recorded |
| 3c | ~~**Open:** record `IB-13` as delivered~~ **Decided 2026-08-23** | `IB-13` moved to the terminal `Delivered` state; post-flight reconciliation explicitly deferred |
| 4 | Confirm the observation-acquisition direction for `IB-01` — first-party attested operator upload (the `Z3` position) or a connector programme | Unblocks Theme A entirely |
| 5 | Confirm no backlog idea is presented to a client as delivered or planned capability | Standing rule; restated per demonstration |
| 6 | Decide whether backlog visibility (§8) is worth a work package | Today the register is documentation only |

---

## 8. Future visibility in Observability & Governance

**Not implemented, and deliberately not implemented in this governance task.**
`components/ObservabilityGovernance.tsx` has seven sections since `ATL-FINAL` added Atlas Health, and
its *Capability lifecycle* section is backed by the **Atlas `CAP-*` capability landscape**. A backlog idea is not a capability
(**ADR-069**), so there is no registry behind it and no trivial wiring — surfacing the backlog would
require a new governed record type, a read API and a new section. That is runtime implementation and
is out of scope here.

**Desired future experience, when a work package is authorised.** An innovation *portfolio*, not an
engineering backlog — themes and ideas showing: the idea · its theme · the problem or opportunity ·
current stage · why it matters · capabilities it builds on · dependencies · what it may unlock ·
Master Plan status · the owner decision or next gate. Displayed under an unmissable heading:

> **Innovation Backlog — not committed delivery scope**

`IB-13` would read approximately as §5 summarises it: *why explore it*, *builds on* (existing
Promotion Intelligence, Live Decision Twin, `DecisionContract` provenance and the experiment
comparison capability), *could unlock* (full-horizon campaign prediction, adaptive intervention,
post-flight reconciliation, attested campaign observation candidates, future learning evidence),
*current stage* `Delivered` (2026-08-23), *delivery status* **Delivered as `CTW-01`, `CTW-01R`,
`CTW-03` and `CTW-02`**, *priority* **was demo priority**.

---

## 9. How to use this register

**Adding an idea.** Assign the next `IB-*` number. Place it under a theme. State the problem, what it
builds on **using existing governed identifiers only**, what it could unlock, its dependencies with
Master Plan classification, its stage, and its next gate. Never invent a status, capability,
dependency or contract to make an entry read better.

**Advancing an idea.** Record the stage change and the owner decision behind it. Advancing to
`Planned` means writing the work package into `MASTER_PLAN.md` — that edit, not this one, is the
authorisation.

**Retiring an idea.** Follow `EXPERIMENT_LIFECYCLE.md` §3. Retirement is a positive outcome.

**Questions this register is required to answer without recourse to any conversation:**

| Question | Answer |
|---|---|
| What is the highest-priority CogniX innovation backlog item? | None outstanding. `IB-13` was the highest and is now `Delivered` (2026-08-23); the twelve remaining entries are all at `Idea` |
| What is planned for Continuous Live Decision Twin? | Nothing further. It is delivered. §5.3–§5.8 is preserved as the record of what was proposed; the `CTW` section of `MASTER_PLAN.md` is what was built |
| What did it depend on? | `CDI-02`, `CDI-05`, `CDI-07A` (HARD, all `[COMPLETED]`); `campaign-experiment-store`, `WP10-C` (INTEGRATION) |
| Was it authorised? | **Yes**, on 2026-08-22 and 2026-08-23, as `CTW-01`, `CTW-01R`, `CTW-03` and `CTW-02` — all `[COMPLETED]` |
| What of it was *not* delivered? | Post-flight reconciliation, deliberately. It is extension work on `CDI-08` and the experiment comparison surface, and a `CTW` package for it would have built a competing history model |
| What is the existing programme's continuation? | **`ESF-4`** — unchanged (§6.1), still parked, still the canonical continuation after Release 1.0 |
| Does the Twin supersede `ESF-4`? | **No** (§6.3) |

---

## 10. Related governance

- [`MASTER_PLAN.md`](MASTER_PLAN.md) — the only source of authorised delivery scope
- [`EXPERIMENT_LIFECYCLE.md`](EXPERIMENT_LIFECYCLE.md) — experiment maturity states, borrowed here
- [`EXPERIMENT_MODEL.md`](EXPERIMENT_MODEL.md) — `CognixExperiment` schema, including `learnings[]`
- [`COGNIX_CAPABILITY_ATLAS.md`](COGNIX_CAPABILITY_ATLAS.md) — the `CAP-*` capability registry an idea does not enter
- [`DEMAND_OBSERVABILITY_MODEL.md`](DEMAND_OBSERVABILITY_MODEL.md) §5 — the maturity model `IB-04` reconciles
- [`COGNIX_MASTER_PLAN_FORENSIC_STATUS_ASSESSMENT.md`](../reports/COGNIX_MASTER_PLAN_FORENSIC_STATUS_ASSESSMENT.md) — the assessment §6.1 adopts on `ESF-4`
- [`COGNIX_ATLAS_RESIDUAL_REGISTER.md`](COGNIX_ATLAS_RESIDUAL_REGISTER.md) — Atlas residuals; `R-04`/`R-18` relate to `IB-05`, `R-15` to `IB-11`
- [`COGNIX_FORECAST_MODEL_TRUTH_RECORD.md`](COGNIX_FORECAST_MODEL_TRUTH_RECORD.md) — what actually executes when a forecasting model is selected, and why `IB-02`/`IB-04` and `CTW-02`/`CTW-03` depend on it
- [`ARCHITECTURE_DECISIONS.md`](../architecture/ARCHITECTURE_DECISIONS.md) — **ADR-069**, **ADR-070**
- [`COGNIX_INNOVATION_BACKLOG_AND_CONTINUOUS_TWIN_PLANNING_REPORT.md`](../reports/COGNIX_INNOVATION_BACKLOG_AND_CONTINUOUS_TWIN_PLANNING_REPORT.md) — evidence for every current-state claim in §5.2
