# COGNIX MASTER PLAN — FORENSIC STATUS ASSESSMENT

**Document Status:** Approved & Authoritative
**Type:** Assessment. **No outstanding CogniX work was implemented.**
**Date:** 22 August 2026
**Branch / HEAD at assessment:** `claude/cognix-capability-atlas-v2` @ `68dd901`
**Authoritative plan assessed:** [`docs/governance/MASTER_PLAN.md`](../governance/MASTER_PLAN.md) (698 lines).
The root [`MASTER_PLAN.md`](../../MASTER_PLAN.md) is a 54-line pointer/summary and is **not** authoritative.

---

## 1. Method, and what it is worth

Every status below is reconciled against **code, contracts, tests, routes, configuration registries,
Docker composition and git history** — not against the marker in the plan and not against the
completion report. Reports were read, but a report is a claim; the repository is the evidence.

Three checks were applied to every `[COMPLETED]` marker:

1. **Does the implementation exist**, and is it reachable from the running product?
2. **Does it do what the bullet says**, or does it do something narrower that reads similarly?
3. **Is the acceptance evidence real** — a runner that executes, a route that answers, a contract that
   constrains — rather than a paragraph asserting it?

Where evidence conflicts and a responsible determination is not available, the row says
**STATUS UNCERTAIN** rather than guessing. Exactly one row needed it.

---

## 2. The single most important structural finding

> **Programme 10 carries two incompatible definitions of the same phase labels, and one set is marked
> `[COMPLETED]` against the other set's letters.**

`MASTER_PLAN.md` §"Planned Phases / Workstreams (Phases 10A – 10M)" defines:

| Label | Planned meaning |
|-------|-----------------|
| 10A | Service Architecture Foundation — **7 deployables**, PostgreSQL schemas, Redis Streams/NATS |
| 10B | Synthetic Enterprise World — temporal engine, **12 causal scenario families** |
| 10C | Tenant-Specific Enterprise Worlds |
| 10D | Journey Telemetry |
| 10E | Shared Decision State |

Thirty lines later, in the same section, four bullets marked `[COMPLETED]` **reuse four of those
labels for different work**:

| Label | Delivered meaning | Collides with |
|-------|-------------------|---------------|
| 10A | Service Architecture & API-First Foundation (OpenAPI, `cognix-world`) | narrower than planned 10A |
| 10B | **Journey Telemetry** Foundation | planned **10D** |
| 10C | **Shared Decision State** Foundation | planned **10E** |
| 10D | **Memory & Learning API** Extraction | not in the planned list at all |

The consequence is not cosmetic. A reader checking "is 10B done?" gets `[COMPLETED]` and is looking at
Journey Telemetry, while planned 10B — the Synthetic Enterprise World with twelve causal families — is
**2 of 12 families implemented** and carries no marker of its own. Planned 10C (Tenant-Specific
Enterprise Worlds) is likewise invisible behind a `[COMPLETED]` that belongs to Shared Decision State.

**This is the largest governance-status defect in the plan and is recorded, not corrected**, because
correcting it means renumbering a programme, which is an owner decision (§8, OD-1).

Throughout this report the delivered packages are written `WP10-A`…`WP10-D` and the planned phases
`P10-A`…`P10-M`, which is the estate's own convention in the CDI dependency tables.

---

## 3. Master status matrix

| Workstream | WP | Plan status | Evidence-based status | Implementation evidence | Missing acceptance | Recommendation |
|---|---|---|---|---|---|---|
| Foundation | Phase 0 Concept freeze & governance | COMPLETED | **COMPLETE — VERIFIED** | 16 governance documents under `docs/governance/`, ADR-001…068 | — | None |
| Foundation | Phase 1 Identity & neutralisation (WP1) | COMPLETED | **COMPLETE — VERIFIED (with stranded residue)** | No Lidl branding in any reachable surface | 8 Lidl-era components remain in the tree, unreachable | See §6 STRANDED; owner decision OD-2 |
| Foundation | Phase 2 Innovation Portfolio (WP2) | COMPLETED | **SUPERSEDED** | `components/InnovationPortfolio.tsx` **deleted**; replaced by `components/atlas/PortfolioView.tsx` over all 38 capabilities | — | Mark superseded by `ATL-04R` |
| Foundation | Phase 3 Reusable Innovation Canvas (WP3) | COMPLETED | **COMPLETE — VERIFIED** | `components/ExperimentCanvas.tsx`, metadata-driven over `config/experiments.ts` | — | None |
| Foundation | Phase 4 Commitment Intelligence (WP4) | COMPLETED | **COMPLETE — VERIFIED** *(demo-complete)* | `components/CommitmentIntelligence.tsx`, ordered `ChainStage[]`, `lib/decision-engine.ts` | Chain stages and per-stage confidence are in-component literals — recorded in `CAP-COMMITMENT-INTELLIGENCE` | None; the limitation is governed |
| Foundation | Phase 5 Decision Ripple (WP5) | COMPLETED | **COMPLETE — VERIFIED** *(demo-complete)* | `components/DecisionRippleIntelligence.tsx`, 1st/2nd/3rd-order cascade | Magnitudes uncalibrated — governed limitation | None |
| Foundation | Phase 6 Curiosity Experience (WP6) | COMPLETED | **COMPLETE — VERIFIED** | Migrated to `components/atlas/QuestionsWorthExploring.tsx` over `content/atlas/curiosity-questions.ts` (ADR-046) | Four registered questions — governed limitation | None |
| Foundation | Phase 7 Enterprise Memory Foundation | COMPLETED | **COMPLETE — VERIFIED** | `services/learning/src/memory-store.ts`, `/api/v1/memory/*`, `components/EnterpriseMemory.tsx` | In-memory store only | None |
| Foundation | Phase 8 Opportunity Intelligence | COMPLETED | **COMPLETE — VERIFIED** | `components/OpportunityIntelligence.tsx`, `EXP-OPPORTUNITY-04` | Registry records it `simulated` | None |
| Foundation | Phase 9 Organisational Learning Intelligence | COMPLETED | **COMPLETE — VERIFIED** | `learning-pattern-store.ts` with six seeded patterns; `Y4-gov` telemetry honesty correction landed | Telemetry is uncalibrated constants — **stated in every record** | None |
| Programme 10 (delivered) | `WP10-A` Service Architecture & API-First | COMPLETED | **COMPLETE — GOVERNANCE STALE** | 7 OpenAPI 3.1 contracts under `docs/openapi/`; `docker/Dockerfile.world`; `services/world` | **No completion report exists** — the only `[COMPLETED]` WP in the estate without one | Write the report, or restate the marker as evidence-by-code |
| Programme 10 (delivered) | `WP10-B` Journey Telemetry | COMPLETED | **COMPLETE — VERIFIED** | `journey-v1.yaml`, `lib/journey-store.ts`, `/api/v1/journey/*`, `run-journey-tests.ts` | — | None |
| Programme 10 (delivered) | `WP10-C` Shared Decision State | COMPLETED | **COMPLETE — VERIFIED** | `decision-state-v1.yaml`, `lib/decision-state-store.ts`, optimistic concurrency, `run-decision-state-tests.ts` | — | None |
| Programme 10 (delivered) | `WP10-D` Memory & Learning API Extraction | COMPLETED | **COMPLETE — VERIFIED** | `memory-learning-v1.yaml`, `IMemoryRepository`/`ILearningPatternRepository`, `cognix-learning` (8082), `run-wp10d-tests.ts` 15 | — | None |
| Programme 10 (planned) | `P10-A` 7 deployables + PostgreSQL + Redis/NATS | PLANNED (label collides) | **PARTIALLY IMPLEMENTED** | **3** deployables (`nextjs-app`, `cognix-world`, `cognix-learning`); API-first contracts real | **Zero** PostgreSQL, Redis, NATS or Kafka anywhere in the repository; all stores in-memory | Productisation (P2). Not a defect — the plan's own non-goals defer this |
| Programme 10 (planned) | `P10-B` Synthetic Enterprise World, 12 causal families | PLANNED (label collides) | **PARTIALLY IMPLEMENTED** | Temporal range `T-90`…`T+30` present; `services/world/src/dynamic-signal-simulator.ts` | **2 of 12** families: `promotion_surge`, `supplier_breach` | P1 candidate; see §7 |
| Programme 10 (planned) | `P10-C` Tenant-Specific Enterprise Worlds | PLANNED (label collides) | **PARTIALLY IMPLEMENTED** | `tenant_id` threaded through world, learning and decision-state stores (36 references); tenant-scoped filtering in `matchLearningPatterns` | No per-tenant risk appetite, waste tolerance or ranked interventions | P2 |
| Programme 10 (planned) | `P10-D` Journey Telemetry | PLANNED (label collides) | **SUPERSEDED** | Delivered as `WP10-B` | — | Retire the planned label |
| Programme 10 (planned) | `P10-E` Shared Decision State | PLANNED (label collides) | **SUPERSEDED** | Delivered as `WP10-C` | — | Retire the planned label |
| Programme 10 (planned) | `P10-F` Pattern Matching ML | PLANNED | **PLANNED — NOT STARTED** | `matchLearningPatterns` is a **deterministic filter + sort** over `pattern_confidence + situation_similarity`, both **hard-coded literals** (`learning-pattern-store.ts:32,395`) | Everything. No similarity computation, no model, no ML dependency in `package.json` | Gated behind attested-observation volume — correctly |
| Programme 10 (planned) | `P10-G` Outcome Prediction | PLANNED | **PLANNED — NOT STARTED** | None | Everything | Gated |
| Programme 10 (planned) | `P10-H` Intervention Ranking | PLANNED | **PLANNED — NOT STARTED** | None | Everything | Gated |
| Programme 10 (planned) | `P10-I` Intelligence Moments | PLANNED | **PLANNED — NOT STARTED** | One empty-state string: *"CogniX **will** surface Intelligence Moments…"* (`app/page.tsx:120`) | The notification engine, the ≥15% / ≥85% triggers | P3 |
| Programme 10 (planned) | `P10-J` Adaptive Decision Profile | PLANNED | **PLANNED — NOT STARTED** | **Zero references** in the entire codebase | Everything | P3 |
| Programme 10 (planned) | `P10-K` Counterfactual Learning | PLANNED | **PLANNED — NOT STARTED** | `CDI-02` delivers counterfactual **baseline**; that is a different thing from counterfactual **learning** | The comparative outcome engine over executed decisions | Gated behind observation volume |
| Programme 10 (planned) | `P10-L` Learning Quality & Pattern Decay | PLANNED | **PLANNED — NOT STARTED** | Zero references to decay | Everything | Gated |
| Programme 10 (planned) | `P10-M` Continuous Learning | PLANNED | **PLANNED — NOT STARTED** | Zero references | Everything | Gated |
| ESF | `ESF-1` Signal contract & synthetic foundation | COMPLETED | **COMPLETE — VERIFIED** | `enterprise-signal-model.ts`, `enterprise-signal-generator.ts`, `/api/v1/signals/*`, `run-signal-tests.ts` | — | None |
| ESF | `ESF-2` Dynamic Signal Simulation | COMPLETED | **COMPLETE — VERIFIED** | `dynamic-signal-simulator.ts`, deterministic `T-7`…`T+30`, `run-esf2-tests.ts` 19 | — | None |
| ESF | `ESF-3` External Signal Connector Contract | COMPLETED | **COMPLETE — VERIFIED** | `external-signal-connector.ts`, 7 reference adapters, `run-esf3-tests.ts` 22 | All adapters `synthetic_demo: true` **by design**, not by omission | None |
| ESF | `ESF-4` Signal Quality, Confidence & Provenance | *(no marker)* | **PLANNED — NOT STARTED** | The `EnterpriseSignal` contract carries `quality: number` and `confidence: number` — the generator fills them with **literal constants** (95, 94, 92, 96, 93, 98) | Freshness tracking, completeness scoring, reliability derivation, source classification | **P1 — this is the earliest unblocked continuation (§7)** |
| ESF | `ESF-5` Learned Signal Behaviour | *(no marker)* | **PLANNED — NOT STARTED** | None | Everything | Blocked on `ESF-4` **and** `P10-F` |
| ESF | `ESF-6 / Y3a` Attested Observation Admission | COMPLETED | **COMPLETE — VERIFIED** | `lib/attested-observation-store.ts`, `/api/v1/signals/attested-sources`, `run-esf6-tests.ts` 81 | **The runtime registry seeds empty** — so zero `AUTHORITATIVE_EXTERNAL` observations exist today. This is the design, not a defect: admission is *possible*, not *achieved* | See §7 — it is why `Y4-cal` and ML remain correctly gated |
| IFI | `IFI-01` Intent Fusion / Commercial Intent Store | COMPLETED | **COMPLETE — VERIFIED** | `lib/intent-fusion/intent-fusion-engine.ts`, `intent-fusion-v1.yaml`, `/api/v1/intent-fusion/evaluate`, `run-ifi1-tests.ts` 12 | Outlook confidence is an engine constant — governed limitation, and `ADR-040` forbids reading it as stability | None. **Demo-complete, not product-complete**: no external intent source |
| CDI | `CDI-01` … `CDI-08` | COMPLETED ×9 | **COMPLETE — VERIFIED ×9** | Nine completion reports; runners 21/36/31/49/70/93/155/235/44; contracts, engines and routes for each | No unmet AC found in any CDI report | None |
| DDF | `DDF-01` Demand Decision Frontier | COMPLETED | **COMPLETE — VERIFIED** | `demand-decision-frontier-model.ts`, `demand-frontier-engine.ts`, `/api/v1/demand-frontier/evaluate`, `run-ddf01-tests.ts` 56 | `D-DDF-1`…`D-DDF-8` and `D-INT-1`…`D-INT-15` all closed. **`D-DDF-3` verified closed at the surface**: the projection selector reads *"Signal-adjusted outlook / Trend and seasonality / Trend baseline"* — no ARIMA, Prophet or GenAI claim reaches a user | See §5 for the residual internal naming |
| DOT | `DOT-1` … `DOT-12` (families A–D) | Roadmap, unauthorised | **PLANNED — NOT STARTED ×12** | None — correctly | Everything; each has declared prerequisites | Leave as roadmap. `DOT-11` unblocks only after `ESF-4` |
| ATL | `ATL-01`…`07`, `04R`, `ATL-FINAL` | COMPLETED ×11 | **COMPLETE — VERIFIED ×11** | Eleven reports; runners 119/29/58/121/54/115/133/127/96/52/57; governance clean | `SB-GATE` at 3/6 — storyboard retained, governed | Baseline accepted |
| Learning follow-ons | `Y3` | Superseded | **SUPERSEDED** | Split into `ESF-6` (admission) + `CDI-08` (correspondence), both complete | — | None |
| Learning follow-ons | `Y4-gov` | COMPLETED | **COMPLETE — VERIFIED** | Six seeded patterns each carrying `telemetry_disclosure` naming the figures as uncalibrated demonstration constants | — | None |
| Learning follow-ons | `Y1` Observed counterfactual → attributable comparison | Sequenced, unmarked | **PLANNED — NOT STARTED** | None | Everything | P1, after `ESF-4` |
| Learning follow-ons | `Y2` Per-assumption observation (Half-Life precursor) | Sequenced, unmarked | **PLANNED — NOT STARTED** | None | Everything | P1, after `ESF-4` |
| Learning follow-ons | `Y4-cal` Pattern telemetry calibration + `WP10-D` write path | **DEFERRED** (explicit) | **DEFERRED** | None | Gated on N ≥ 3 independent eligible `LearningCase`s and the X3 gate | Correctly deferred — N is **0** |
| Learning follow-ons | **ML workstream** | **DEFERRED** (explicit, in the frozen sequence) | **DEFERRED** | None | Gated on non-trivial attested observation volume | Correctly deferred |
| Later phases | Phase 11 IP & Innovation Governance | *(no marker)* | **PARTIALLY IMPLEMENTED** | `experiment.ipClassification` rendered in `ExperimentCanvas.tsx:68`; `IP_GOVERNANCE.md` governs it | No exportable blueprint sheet, no legal disclaimers. *"Concept & Business Blueprint"* is a section heading, not an export | P3 |
| Later phases | Phase 12 Industry Demonstration Packs | *(no marker)* | **IMPLEMENTED BUT DISCONNECTED** | `config/industry-packs.ts` exists (84 lines) with **0 consumers**; `ARCHITECTURE.md` §3.5 describes it driving `context/ClientContext.tsx` — **that file does not exist** (`ATL-01` contradiction `C-09`) | The runtime context switcher; scenario dataset expansion | P3, or formally retire the config |
| Later phases | Phase 13 Innovation Operating Model & Knowledge Capture | *(no marker)* | **PLANNED — NOT STARTED** | No feedback form, no maturity lifecycle tracker, no retirement archive viewer | Everything | P3 |
| Cross-cutting | Lidl-era orphaned components | `ATL-01` D3: "not Atlas work" | **STRANDED** | 8 components, **2,876 lines**, zero inbound references: `BriefingCentre` 718, `TodayPriorities` 621, `CommandCentre` 608, `StoreCopilot` 311, `WasteIntelligence` 300, `SupplyChainRadar` 250, `G10XLogo` 45, `LoginPage` 23 | No supersession or retirement decision was ever recorded | **Owner decision OD-2** |
| Cross-cutting | Legacy `/api/ask`, `/api/briefing` client-key path | ADR-044 Amdt A: technical debt | **STATUS UNCERTAIN** | Routes live and reachable; their only UI consumers (`StoreCopilot`, `BriefingCentre`) are orphaned | Whether the routes are still required is not recorded anywhere | Bundle into OD-2 |

**Total work packages assessed: 71.**

---

## 4. Summary by state

| State | Count | Packages |
|---|---:|---|
| **COMPLETE — VERIFIED** | 40 | Phases 0, 1, 3, 4, 5, 6, 7, 8, 9 (9) · `WP10-B/C/D` (3) · `ESF-1/2/3/6` (4) · `IFI-01` (1) · `CDI-01`…`CDI-08` (9) · `DDF-01` (1) · `ATL-01`…`ATL-07`, `ATL-04R`, `ATL-FINAL` (12) · `Y4-gov` (1) |
| **COMPLETE — GOVERNANCE STALE** | 1 | `WP10-A` — real, but the only completed WP with no report |
| **PARTIALLY IMPLEMENTED** | 4 | `P10-A` (3 of 7 deployables, no persistence/transport) · `P10-B` (2 of 12 scenario families) · `P10-C` (tenant plumbing without tenant policy) · Phase 11 |
| **IMPLEMENTED BUT DISCONNECTED** | 1 | Phase 12 — `config/industry-packs.ts`, 0 consumers, missing `ClientContext` |
| **PLANNED — NOT STARTED** | 17 | `P10-F/G/H/I/J/K/L/M` (8) · `ESF-4`, `ESF-5` (2) · `DOT-A/B/C/D` families, 12 items (4) · `Y1`, `Y2` (2) · Phase 13 (1) |
| **DEFERRED** | 2 | `Y4-cal` · ML workstream — both explicitly, with the gate stated |
| **SUPERSEDED** | 4 | Phase 2 (→ `ATL-04R` Portfolio view) · `P10-D` (→ `WP10-B`) · `P10-E` (→ `WP10-C`) · `Y3` (→ `ESF-6` + `CDI-08`) |
| **STRANDED / ABANDONED** | 1 | 8 Lidl-era components, 2,876 lines, no recorded decision |
| **STATUS UNCERTAIN** | 1 | `/api/ask` + `/api/briefing` legacy routes |
| **TOTAL** | **71** | |

**Demo-complete but not product-complete: 23.** Phases 4, 5, 7, 8, 9 (5), `IFI-01` (1), `CDI-01`…`CDI-08` (9),
`DDF-01` (1), `ESF-1/2/3/6` (4) and `WP10-B/C/D` (3) all run correctly on synthetic data with
in-memory persistence and no external integration. **This is not a defect list.** The Master Plan's own
non-goals defer microservice sprawl, Kubernetes and Kafka; `DEMAND_OBSERVABILITY_MODEL.md` §5 places the
whole estate at **Maturity Level 0 — synthetic / modelled demonstration** deliberately; and every
capability record states its own synthetic basis. Production integration, live data, persistence and
scale are **governed as future work, not as unmet acceptance**.

---

## 5. Status drift

### False COMPLETE — 1, and it is a labelling failure rather than an implementation one

**`P10-B` / `P10-C` read as `[COMPLETED]`** to any reader following the planned-phase list, because
`WP10-B` and `WP10-C` bear the same letters. Planned 10B is 2 of 12 scenario families; planned 10C has
plumbing but no tenant policy. **No implementation claim is false; the label mapping is.** Recorded,
not corrected (OD-1).

### Governance stale — 1

`WP10-A` is genuinely delivered (7 OpenAPI contracts, `cognix-world` containerised, seed extraction) and
is the **only** `[COMPLETED]` package in the estate with no completion report. Every other one has a
`docs/reports/COGNIX_*` companion.

### False PLANNED — 0

No package marked planned turned out to be implemented. `ESF-4` and `ESF-5` carry no marker at all,
which is accurate: they are unstarted.

### Hidden implementation — 1 (already corrected by the Atlas)

`ATL-01` F1 found 20 governed-but-unregistered capabilities. The Capability Atlas is that correction and
the registry now carries all 38.

### Superseded requirement still carried — 3

Phase 2, `P10-E` and `Y3` are all superseded and none says so in the plan.

### Demo-complete versus product-complete

Assessed for all 32 verified packages. **None is reclassified as a defect**, because the Master Plan
does not require production integration for any of them.

### One residual worth naming, not a defect

`D-DDF-3` (the ARIMA/Prophet/GenAI selector implemented as sine/cosine) is **closed at the surface** —
the user sees *"Signal-adjusted outlook / Trend and seasonality / Trend baseline"*. The internal wire
values in `lib/query-engine.ts` and the `/api/data` query string are still `arima`, `prophet` and
`genai`. No user or API consumer of a governed contract sees them, so this is **naming debt, not a
truthfulness defect**. Recorded here so it is not rediscovered as one.

---

## 6. Machine learning — what the plan requires and what exists

The plan contains genuine, governed ML work: `P10-F` Pattern Matching ML, `P10-G` Outcome Prediction,
`P10-H` Intervention Ranking, `P10-K` Counterfactual Learning, `P10-L` Pattern Decay, `P10-M` Continuous
Learning, and `ESF-5` Learned Signal Behaviour.

**None of it exists. Not one line.**

| Check | Result |
|---|---|
| ML/statistical library in `package.json` | **None.** The only AI dependency is `@google/generative-ai` — an LLM SDK for text generation, not training or inference over estate data |
| Training pipeline, dataset, feature store, model artefact | **None** |
| Model evaluation or versioning | **None** |
| `matchLearningPatterns` — the closest thing to "Pattern Matching ML" | A tenant/category/region **filter** followed by `sort((a,b) => (b.pattern_confidence + b.situation_similarity) - …)`. Both operands are **literal integers stored on the record** (94, 89, 91, 88, 87, 92). No similarity is computed from anything |
| Signal `confidence` / `quality` | **Literal constants** in the generator |
| Forecast "model" selection | Deterministic sine/cosine factors, honestly relabelled at the surface (§5) |

**Nothing in the estate is described to a user as ML, and nothing behaves as ML.** The plan's own
ML/deterministic boundary holds: *"ML may rank, cluster, shortlist and suggest. It may never establish
authority, eligibility, correspondence, comparability or a verdict."*

### Was it abandoned, or deferred?

**Deferred, explicitly, with a stated gate — and the gate is genuinely not met.** The frozen
post-`CDI-07B` sequence reads:

> `ML workstream [DEFERRED — observation correspondence suggestion first]`
> *"No ML workstream is justified until `ESF-6` has landed and attested observation volume is
> non-trivial — started earlier it would be fitted to CogniX's own simulator."*

`ESF-6` **has** landed. Attested observation volume is **zero**: the registry in
`lib/attested-observation-store.ts` initialises as empty `Map`s with no seed, so no observation reaches
`AUTHORITATIVE_EXTERNAL`, so no `LearningCase` is eligible, so `N ≥ 3` is unmet and `Y4-cal` and the ML
workstream stay gated.

**This is the deferral working, not the deferral being forgotten.** The estate can now admit attested
observations; it has not been given any. Building ML today would fit models to CogniX's own simulator,
which is precisely what the ruling forbids.

---

## 7. The genuine continuation point

> **If the Capability Atlas had never diverted attention, the next unfinished work package is
> `ESF-4` — Signal Quality, Confidence & Provenance.**

### Why `ESF-4`, on the plan's own evidence

1. **It is the only unstarted package whose hard dependency is satisfied.** `ESF-4`'s hard dependency
   is `ESF-6`, which completed 2026-08-16. Gate G4 repositioned it from *"parallel-eligible now"* to
   *"parallel-eligible **after** `ESF-6`"*. That condition is met, and it is the only one that is.
2. **It sits in the frozen sequence at exactly this point.** The post-`CDI-07B` diagram places `ESF-4`
   as the first of four branches immediately below the *"FIRST DEFENSIBLE LearningCase POSSIBLE"* line,
   and it is the only one of the four that is not itself gated on observation volume.
3. **It unblocks the most.** `ESF-5` needs it. `DOT-11` (Signal Half-Life) names it as a hard
   prerequisite — *"grading precedes weighting, exactly as admission precedes grading"*.
4. **It closes a live honesty gap.** `EnterpriseSignal.quality` and `.confidence` are carried in the
   governed contract, rendered on the signal surfaces, and filled with hard-coded constants. `ESF-4` is
   the work that makes those two numbers mean something. Until then they are the estate's last
   remaining unqualified figures on a governed contract.

### Earliest prerequisite-sensitive vs highest-value — the same package

They coincide. `ESF-4` is both the earliest unblocked item in the DAG and the one that unblocks the most
downstream work (`ESF-5`, `DOT-11`, and — through signal grading — the quality of anything `Y1`/`Y2`
later compare). No other candidate is both.

### Can tracks proceed in parallel? **Partially.**

| Track | Can start now? | Blocker |
|---|---|---|
| `ESF-4` Signal Quality | **Yes** | None |
| `Y1` observed counterfactual design | **Yes** (design only) | Implementation needs attested observations |
| `Y2` per-assumption observation | **Yes** (design only) | Same |
| Attested-source onboarding (to reach N ≥ 3) | **Yes** | Not a WP — needs first-party attested data, an operational act |
| `Y4-cal`, ML workstream, `P10-F/G/H/K/L/M`, `ESF-5` | **No** | N ≥ 3 eligible `LearningCase`s; currently 0 |
| `DOT-*` | **No** | Roadmap; per-item prerequisites; `DOT-11` needs `ESF-4` |
| `P10-A` persistence/transport, `P10-C` tenant policy, Phases 11–13 | **Yes**, independently | None — but P2/P3 priority |

The honest shape: **one substantive engineering track (`ESF-4`) is unblocked, two design tracks
(`Y1`, `Y2`) can be specified in parallel, and everything genuinely intelligent is gated behind an
operational act — obtaining attested observations — that no work package can perform for itself.**

---

## 8. Prioritised remaining work

### P0 — Integrity / architectural prerequisite

| Item | Why |
|---|---|
| **OD-1** Resolve the Programme 10 label collision | Two definitions of `10A`–`10E`, one marked `[COMPLETED]` against the other's letters. Any reader planning from this plan will misread it |
| **OD-2** Decide the 8 stranded Lidl-era components and the two legacy routes | 2,876 lines with no supersession or retirement decision, and two live routes whose only consumers are orphaned |
| `WP10-A` completion report, or restate the marker | The only `[COMPLETED]` package without one |

*None of these is a code defect. All three are governance integrity.*

### P1 — Complete the intended CogniX intelligence architecture

| Item | State |
|---|---|
| **`ESF-4`** Signal Quality, Confidence & Provenance | **The continuation point.** Unblocked |
| `Y1` Observed counterfactual → attributable comparison | Design now, implement on observations |
| `Y2` Per-assumption observation → the real Half-Life precursor | Design now, implement on observations |
| `P10-B` remaining 10 causal scenario families | The world engine is real; its coverage is 2 of 12 |
| `ESF-5`, `Y4-cal`, ML workstream (`P10-F/G/H/K/L/M`) | Correctly gated on attested observation volume |

### P2 — Productisation

Persistence (PostgreSQL), event transport (Redis Streams / NATS), the remaining four `P10-A`
deployables, `P10-C` tenant policy, live external integrations, security hardening. **All governed as
future work; none is unmet acceptance on a completed package.**

### P3 — Enhancement / future innovation

`P10-I` Intelligence Moments · `P10-J` Adaptive Decision Profile · Phase 11 exports and disclaimers ·
Phase 12 industry packs (or formal retirement of `config/industry-packs.ts`) · Phase 13 knowledge
capture · the `DOT` roadmap · the two homeless storyboard knowledge units behind `SB-GATE-2`.

---

## 9. Owner decisions required

| ID | Decision |
|---|---|
| **OD-1** | Programme 10 phase labels: renumber the planned list, retire it in favour of the delivered `WP10-*` set, or annotate the collision in place |
| **OD-2** | The 8 stranded Lidl-era components (2,876 lines) and the legacy `/api/ask` + `/api/briefing` routes: retire, absorb, or leave as historical code with a recorded decision |
| **OD-3** | Whether to obtain first-party attested observation data. **Nothing downstream of `ESF-6` can be honestly built without it** — this is a commercial/operational act, not a work package |
| **OD-4** | Whether `ESF-4` is authorised as the next work package |
| **OD-5** | *(carried from the Atlas)* `R-12` — a lifecycle state, or none, for `CAP-CONTRACT-VERIFICATION`, `CAP-GOVERNANCE-SETTINGS` and `CAP-DECISION-LIFECYCLE-VIEW` |

---

## 10. What this assessment did not do

No outstanding work was implemented. No `ESF` package was started, no ML built, no orphaned component
reconnected, no `DOT` work begun, no architecture rewritten, no branch merged, no market study
populated, no speculative work package created.

**Two factual corrections were made**, both to Atlas artefacts and both unequivocal on evidence: the
`CAP-DECISION-CONTRACT` assumption that the code contradicted (§5 of the residual register), and the
residual-register classifications that the owner review resolved. **No non-Atlas file was modified.**
