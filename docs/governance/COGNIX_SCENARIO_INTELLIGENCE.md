# CogniX Scenario Intelligence

**Status:** Authoritative. Governs the evolution from a prepared demonstration to a scenario-driven
Decision Intelligence laboratory.
**Authorised:** 2026-09-15 against baseline `f9c5679c` on `feature/cognix-enterprise-demo-hardening`.
**Implementation:** none yet. Programme `SCI`, defined in
[`COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md`](COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md).
**Decisions:** ADR-077 · ADR-078 · ADR-079 · ADR-080 · ADR-081 · ADR-082 · ADR-083 · ADR-084 ·
ADR-044 Amendment B · ADR-051 Amendment A · ADR-073 Amendment A.
**Predecessor record:** [`COGNIX_CANONICAL_SCENARIO.md`](COGNIX_CANONICAL_SCENARIO.md) — unchanged in
substance, re-read per ADR-073 Amendment A as the *model* rather than the only instance.

---

## 1. The proposition

CogniX becomes a laboratory in which a decision situation is chosen or constructed, and then explored
end to end:

> **Choose a Scenario** or **Create Your Own Scenario** — and then use CogniX to explore the complete
> decision.

The governing principle is the one the enterprise hardening established and this programme exists to
protect while generalising:

> **One scenario. One decision context. One economic model. Many decision perspectives.**

The word that changes is *one*. It has always meant *one per decision*, never *one in the estate*.
ADR-073 Amendment A records why that reading was always the correct one.

## 2. What the baseline already is, stated so the programme is not over-scoped

Measured at `f9c5679c`, not asserted:

| Fact | Evidence |
|---|---|
| The canonical scenario is a clean, complete decision-case model | `packages/contracts/src/canonical-scenario-model.ts` — identity, estate, calendar, demand, supply, inventory, economics, provenance |
| Its derivations are pure functions of that record | every `canonical*()` export; 227 call sites across 29 files |
| The arithmetic spine rescales from one number | supply declared as ratios, not counts — the module states this and it is why multi-scenario is a parameterisation |
| Cross-surface reconciliation is real and enforced | `tests/unit/run-canonical-scenario-tests.ts` — **243 assertions, 0 failures** |
| The test estate is effectively green | 44 runners; **43 fully green**, `run-atl06b-tests` failing one stale assertion (`R-25`) |
| Signals are already first-class | `EnterpriseSignal`, `EnterpriseSignalTimeline`, structured per-observation `provenance{}`, periods `T-90 … T+30` |
| A period-advancing simulator already exists | `POST /api/v1/signals/simulate` · `simulateEnterpriseSignalTimelines` — built by `ESF-2`, unused by Observability |
| An admission path for non-synthetic evidence already exists | `ESF-6` attested observations — `source × context → authority` |
| A governed AI input boundary already exists | ADR-044 — stamped, response-validated, refuses rather than fabricates |
| Real statistical forecasting exists | `lib/forecast/` — Holt-Winters additive, seasonal naive, backtest, calibration, qualification; ADR-071, ADR-072 |
| Seven priced retail situations already exist | `lib/campaign-archetypes.ts`, all on one economic framework since `DEMO-HARD-04` |

**The programme is therefore convergence, not construction.** Its genuinely new build is scenario
authoring and CSV admission; everything else is unification of assets that already exist.

## 3. The three scenario concepts, and what becomes of each

| Concept | Location at `f9c5679c` | Disposition under ADR-077 |
|---|---|---|
| `CanonicalScenario` — `SCN-FRESH-DAIRY-CHEDDAR-001` | `packages/contracts/src/canonical-scenario-model.ts` | **Becomes the single scenario identity.** Read as a model; this instance remains the protected reference |
| `ENTERPRISE_WORLD_SCENARIOS` — six `ScenarioFamilyId` families | `packages/contracts/src/enterprise-world-seed.ts`, `/api/v1/scenarios` | **`ScenarioFamilyId` retained as taxonomy on the canonical record.** Its economics are retired; its temporal series become a scenario's declared evidence |
| `CampaignArchetype` — seven archetypes | `lib/campaign-archetypes.ts` | **Retained as the commercial projection of a scenario.** Supplies elasticity, cannibalisation, plays and narrative; supplies no second population, price basis or estate |

### 3.1 The contradiction this removes

At `f9c5679c` the Observability & Governance signals panel issues `GET /api/v1/signals` with no
scenario parameter. The route defaults to `family_id=promotion_surge`, `scenario_id=SCN-PROMO-01`,
and the surface publishes `SUPPLIER_CAPACITY_PRESSURE` against **FreshDirect UK** — the supplier
`DEMO-HARD-01` retired in favour of **Cheshire Cheese Co (SUP002)**, and which
`COGNIX_PRESENTATION_SYNC_DELTA.md` §3.3 records as a value any slide must change.

The generator is partly migrated already: it names *Fresh Dairy* and *P004 Cheddar Mature 400g*
correctly. This is a half-completed migration, not an untouched legacy path, and ADR-077 part 4 —
**no surface resolves a scenario by default** — is what stops it recurring through a different route.

## 4. Target architecture

```
   ORIGINS                          ONE IDENTITY                        CONSUMERS
 ┌───────────────┐
 │ CURATED       │──┐
 │ scenario packs│  │        ╔══════════════════════════╗
 │ (SCI-03)      │  │        ║   CanonicalScenario      ║
 └───────────────┘  │        ║   (the model, ADR-073A)  ║
                    │        ║ identity · estate        ║        ┌──────────────────┐
 ┌───────────────┐  │        ║ calendar (scenario clock)║───────▶│ DETERMINISTIC    │
 │ AUTHORED      │──┼───────▶║ demand · supply          ║        │ ENGINES          │
 │ form-first;   │  │        ║ inventory · economics    ║        │ demand frontier  │
 │ GenAI drafts  │  │        ║ provenance (ADR-082)     ║        │ causal · contract│
 │ (SCI-07/08)   │  │        ╚═══════════╤══════════════╝        │ frontier · ripple│
 └───────────────┘  │                    │                       └────────┬─────────┘
                    │                    ▼                                │
 ┌───────────────┐  │        ┌──────────────────────────┐                 ▼
 │ ENRICHED      │──┘        │ SCENARIO RESOLVER        │        ┌──────────────────┐
 │ CSV via ESF-6 │           │ • derivations (pure)     │        │ PERSPECTIVES     │
 │ attested      │           │ • capability readiness   │        │ Demand·Promotion │
 │ admission     │           │ • signal timeline bind   │        │ Campaign·Ripple  │
 │ (SCI-10)      │           │ • frozen + hashed        │        │ Inventory        │
 └───────────────┘           └────────────┬─────────────┘        └────────┬─────────┘
                                          │                               │
                             ┌────────────▼─────────────┐                 │
                             │ SCENARIO CERTIFICATION   │                 │
                             │ GATE (ADR-080, SCI-02)   │                 │
                             │ certified → demo-active  │                 │
                             └────────────┬─────────────┘                 │
                                          ▼                               ▼
                             ┌────────────────────────┐        ┌──────────────────┐
                             │ SIGNAL TIMELINE        │        │ OBSERVABILITY &  │
                             │ T-90 … Today … T+30    │───────▶│ GOVERNANCE       │
                             │ stamped on the         │        │ evidence · trace │
                             │ SCENARIO CLOCK         │        │ Refresh (ADR-081)│
                             │ (ADR-078)              │        │ models & methods │
                             └────────────────────────┘        └──────────────────┘
```

### 4.1 Rules

1. **One scenario identity flows everywhere** — Demand, Promotion, Campaign Decision, signals,
   Shared Decision State, journey telemetry, Decision Ripple, Inventory, Observability & Governance
   and Experiments where applicable. (ADR-077)
2. **The scenario owns time.** Civil wall-clock time does not enter deterministic scenario evidence.
   It is retained where it describes the running platform rather than the modelled world. (ADR-078)
3. **Differentiation is declared.** No hash-derived modifier stands between a scenario's declared
   parameters and its published economics. (ADR-079)
4. **No scenario is demo-active until certified**, and non-applicability is declared with a reason
   rather than passed silently. (ADR-080)
5. **Refresh advances evidence and reports decision consequence.** (ADR-081)
6. **One provenance vocabulary**, mapped from the five the estate already carries. (ADR-082)
7. **GenAI drafts structure; engines compute economics**, and a confirmed scenario reproduces with
   the provider unavailable. (ADR-083)
8. **All three origins enter the same downstream contracts.** There is no curated engine, no
   user-scenario engine and no uploaded-data engine.

## 5. Curated scenario catalogue

Initial target — three, promoted from archetypes that already exist and are already priced on the
canonical framework. Additional archetypes remain future candidates and are not authorised here.

| # | Scenario | Projection of | Why it earns its place |
|---|---|---|---|
| 1 | Fresh Dairy — committed national promotion under a supply ceiling (`SCN-FRESH-DAIRY-CHEDDAR-001`) | `ARCH-CHILLED-ELASTIC` | The protected journey and the reference every other scenario is certified against |
| 2 | Supply-constrained demand surge | `ARCH-SUPPLY-CONSTRAINED` | A different *decision shape* — the binding constraint is capacity, not margin, so Decision Gap, Decision Window and the supplier flex clause become the dominant terms |
| 3 | Premium low-elasticity margin trap | `ARCH-PREMIUM-ARTISAN` | A different *answer* — do not discount. `DEMO-HARD-04` established that five of seven archetypes reach this verdict under honest pricing and that it is a legitimate recommendation the platform has a posture for |

**Future candidates, not authorised:** `ARCH-CLEARANCE-PRODUCE`, `ARCH-COMPETITOR-DEFENCE`,
`ARCH-SEASONAL-WINDOW`, `ARCH-CANNIBALISATION`.

### 5.1 Online fulfilment / CFC remains explicit roadmap work

Online fulfilment pressure is **not** implementable as a scenario pack at `f9c5679c` and is recorded
here so it is not mistaken for a scheduling choice. `CanonicalEconomics` carries no fulfilment
capacity, centre throughput, pick rate or delivery-slot term. The signal taxonomy defines
`CFC_THROUGHPUT_PRESSURE`, `PICK_RATE_DEGRADATION`, `FULFILMENT_QUEUE_GROWTH` and
`DELIVERY_SLOT_SATURATION`, and no engine consumes any of them economically. The canonical record
declares `online_demand_share_pct: 14` and nothing downstream varies with it.

Building it means extending the economic model, which is a capability, not a pack. It is registered
as **roadmap** and is the most commercially significant of the deferred items for online-first
grocery conversations. It must not be demonstrated, storyboarded or sold as present.

### 5.2 Operating-model abstraction — considered and declined

An explicit selector for *large omnichannel / online-first / superstore-led / convenience-heavy* was
evaluated and is **not** adopted. Two reasons, both structural. It multiplies the certification
matrix — ADR-080 runs the reconciliation suite per scenario, so three scenarios across four operating
models is twelve certified sets for a demonstration that shows one at a time. And nothing in the
economics responds to an operating model, so four models over one estate would produce four
relabelled results, which is the unsupported-claim pattern Principle 12 and the `D-DDF-2` precedent
exist to prevent. Operating-model difference is instead declared per scenario as part of its estate
and framing, which is where it belongs and costs nothing.

## 6. Create Your Own Scenario

**Progression, in this order:** structured scenario authoring → governed GenAI assistance → CSV
enrichment → richer persistence later.

The order is load-bearing rather than merely cautious. Without the structured record underneath, a
drafted scenario cannot be inspected, corrected, certified, versioned or reproduced, and the estate
would hold a scenario whose economics only exist while a provider is reachable. With it, natural
language is a drafting accelerator that removes no guarantee — which is exactly ADR-044's shape.

**This is not a Data Ingestion feature and must not be presented as one.** Uploaded data is scenario
*enrichment*, admitted through `ESF-6`, and the product concept is the scenario. Where the user
supplies nothing, the scenario still runs on declared modelled values.

### 6.1 Capability readiness vocabulary

Reuses what the estate already says rather than inventing a parallel scale. The demand frontier
already publishes `INDETERMINATE` where evidence is absent (ADR-040); `ESF-6` already separates
`DIRECT_MEASUREMENT` from `MODELLED`.

| State | Meaning |
|---|---|
| **Ready** | Observed or attested evidence present for every input the capability requires |
| **Limited** | Partial evidence; the capability runs and its result is bounded, and says so |
| **Modelled** | A declared assumption stands in for absent evidence; the value is `origin: modelled` |
| **Unavailable** | The capability cannot run. It says so and publishes nothing |

*Modelled* is preferred over *synthetic* in reader-facing language: the canonical record already uses
`MODELLED_DEMONSTRATION_ASSUMPTION`, and it reads as engineering rigour rather than fabrication.
`synthetic_demo` remains the machine-level flag and remains server-derived under `ESF-6`.

## 7. Signals, materiality and Refresh

The signal contract delivered by `ESF-1`/`ESF-2`/`ESF-3` is sufficient and is not replaced. Against
the capability the laboratory needs:

| Attribute | State at `f9c5679c` | Action |
|---|---|---|
| source | Present — `source_type`, `source_system` | none |
| freshness | Present but **incoherent** — stamped on civil time | ADR-078, `SCI-01` |
| confidence / quality | Present, 0–100 | none — and **no third score is added** (ADR-072) |
| scope | Present — `entity_type` / `entity_id` | none |
| provenance | Present and structured per observation | mapped to the ADR-082 vocabulary |
| **materiality** | **Absent** | derived — did it move a published quantity, and by how much (`SCI-05`) |
| **decision relevance** | **Absent** | derived — did it change a recommendation, readiness verdict or window (`SCI-05`) |

Materiality and decision relevance are **derived, never authored**. A signal that declares its own
importance is marketing; a signal whose importance is computed from what it moved is intelligence.
This is what turns *signal → evidence → material change → decision relevance* into a computation.

**Refresh** is specified by ADR-081 and is a scenario operation: advance the as-at marker one
`SimulationPeriod` along the scenario clock, re-evaluate dependent intelligence, publish the delta,
and state whether the recommendation or decision changed. It is deterministic by construction because
the timeline is generated by declared rules against the scenario clock, and `Restart scenario`
returns the marker to the opening position.

**`ESF-4` is reactivated to carry this**, not duplicated. Its dependency `ESF-6` completed; the G4
sequencing rule *admission precedes grading* is satisfied.

## 8. Observability & Governance direction

Strengthened in information architecture, content and function. **The CogniX visual system is not
redesigned.** Navigation language, typography, colour system, component patterns, page composition
and UI standards are preserved; this is a UX and content improvement inside the existing experience,
not a visually separate product.

| Section | The question it answers | Source |
|---|---|---|
| **Evidence & Signals** | Where did this come from? What changed? How fresh? Which signals matter? | Scenario-clock timelines, materiality, decision relevance, Refresh |
| **Models & Methods** | Which model or method produced this? Where did ML contribute? Where did Google GenAI? Where is it deterministic, and where is it human? | `lib/forecast/registry.ts`, capability knowledge, the ADR-082 `method` dimension |
| **Platform Health** | Is the estate sound? | Real measurable readings only |
| **Decision Trace** | Why did CogniX recommend this? Observed or modelled? Who decided? What changed after? | Decision contracts, attested observations, journey telemetry |

**Decision Trace is reached contextually from the decision it explains**, not by forcing a second
navigation journey. A trace the reader has to go and look for is a report.

**No fabricated telemetry.** Where a reading cannot be measured it is declared unmeasured, following
the `ATL-FINAL` precedent that declared two repository checks unmeasured rather than reporting a zero
the route could not earn.

## 9. Architecture experience

Retirement of the Architectural Storyboard proceeds **through** `ADR-051` / `SB-GATE`, never around
it. The gate stands at 3 of 6; `SCI-09` is authorised as the work package that names the navigation
successor and is scoped to close `SB-GATE-6` by construction and `SB-GATE-4` by carrying or formally
orphaning the two remaining narratives. **The storyboard is not deleted until the gate reads 6 of 6
with evidence recorded at `R-07`.**

The replacement is one client-facing page explaining the platform truthfully in 60–90 seconds:

> Signals / Evidence → Signal Intelligence → Statistical ML + governed Google GenAI + deterministic
> engines → Decision Intelligence → Retail Decisions → Human Decision → Outcomes / Learning

**Construct placement is governed and must not drift:**

| Construct | Belongs to | Authority |
|---|---|---|
| Signal / Intent Fusion | Signal Intelligence | `IFI-01`, `lib/intent-fusion/` |
| **Forecast Stability** | **Signal Intelligence — not the model layer** | ADR-040: a property of the evidence stream, never of the model |
| Decision Gap | Decision Intelligence | ADR-041: opportunity minus executable capacity, from engines |
| Decision Window | Decision Intelligence | ADR-042: from a declared operational constraint, not a decay curve |
| Decision Regret | Decision Intelligence | ADR-043: comparative expected value over declared alternatives |
| Decision Ripple | Retail Decisions / consequence | `WP5` |

Each layer is labelled by **mechanism** — deterministic calculation, statistical/ML, Google GenAI
reasoning, business rule, human judgement — so that nothing on the page reads as "AI" by default.
Interactivity is limited to inspecting a node for what it is, what it did in the active scenario and
when it last ran, sourced from Models & Methods so there is no second copy of the truth to maintain.

## 10. Google GenAI position

Unchanged in provider, credential and configuration. Google GenAI is used through the existing
governed server-side path: `process.env.GEMINI_API_KEY`, resolved server-side at call time, under the
existing governed provider and model configuration (ADR-067). **No new AI provider is introduced for
Scenario Intelligence.**

| GenAI may | GenAI must never be the source of |
|---|---|
| Interpret a business-language scenario description | Demand quantities |
| Draft scenario structure | Economics, margin or price |
| Propose semantic column mappings | Promotion calculations |
| Propose qualitative assumptions | Decision Gap, Decision Window, Decision Regret |
| Explain what the platform computed | Reconciliation, or any published quantitative outcome |

The legacy client-supplied key path (`/api/ask`, `/api/briefing`, `/api/decisions/[id]/approve`) is
recorded technical debt at `R-15` and in ADR-044 Amendment A. It is **not extended, not reused and
not revived** by any `SCI` packet.

**One inherited fact a reader should have.** The estate carries **two Google SDKs** — `@google/genai`
(the primary call path in `lib/gemini.ts`, added by `d625235`) and `@google/generative-ai` (legacy
client and the Atlas grounding types). Both are Google; there is no third-party provider and `SCI`
introduces none, so the position above holds unchanged. A stale `ATL-06B` assertion still claims no
provider dependency was added and fails on the pristine baseline; it is registered at `R-25` with its
disposition. SDK consolidation is real work and is **not** in `SCI` scope.

## 11. What this record does not authorise

Implementation of anything. Deletion of the storyboard. XLSX. A scenario database. Live external
connectors in the demonstration path. Any new AI provider. Any change to the protected Demand →
Promotion → Campaign Decision published values. Any `DOT` roadmap capability. Any claim that online
fulfilment economics exist.

## 12. Related governance

[`COGNIX_CANONICAL_SCENARIO.md`](COGNIX_CANONICAL_SCENARIO.md) ·
[`COGNIX_SCENARIO_CERTIFICATION.md`](COGNIX_SCENARIO_CERTIFICATION.md) ·
[`COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md`](COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md) ·
[`COGNIX_BACKLOG_RECONCILIATION_2026_09.md`](COGNIX_BACKLOG_RECONCILIATION_2026_09.md) ·
[`ENTERPRISE_SIGNAL_MODEL.md`](ENTERPRISE_SIGNAL_MODEL.md) ·
[`MASTER_PLAN.md`](MASTER_PLAN.md) ·
[`COGNIX_PRESENTATION_SYNC_DELTA.md`](../reports/COGNIX_PRESENTATION_SYNC_DELTA.md) ·
[`COGNIX_SCENARIO_LABORATORY_PLANNING_REPORT.md`](../reports/COGNIX_SCENARIO_LABORATORY_PLANNING_REPORT.md)
