# CogniX Backlog Reconciliation — September 2026

**Status:** Authoritative. Reconciles the existing Master Plan and governance backlog against
implementation facts before programme `SCI` is registered.
**Performed:** 2026-09-15 against baseline `f9c5679c` on `feature/cognix-enterprise-demo-hardening`.
**Method:** every materially overlapping item read against source, tests and governance records at
that commit. Nothing marked complete without cited evidence.

---

## 0. Rules this reconciliation followed

1. **Historical truth is preserved.** An item is reclassified, never rewritten out of existence.
2. **Nothing is marked complete without evidence**, and the evidence is cited.
3. **Stale plans are not preserved as though the code had not moved.** Where the estate now implements
   part of an item, that is recorded as `PARTIALLY DELIVERED` with the part named.
4. **Duplication is the failure mode to avoid.** Where an existing item covers the outcome, `SCI` merges
   into it or reactivates it rather than opening a parallel line.

**Classifications:** `RETAIN` · `REACTIVATE` · `MERGE` · `SUPERSEDE` · `PARTIALLY DELIVERED` · `CLOSE`
· `DEFER`.

---

## 1. Measured baseline facts the reconciliation rests on

| Fact | Evidence at `f9c5679c` |
|---|---|
| Test estate | 44 runners executed. **43 of 44 runners fully green.** `run-atl06b-tests` reports 132 passed / **1 failed** — assertion `A6b`, a **stale assertion rather than a code defect**; see residual `R-25`. Every other runner exits 0 with zero failures |
| Cross-surface reconciliation | `run-canonical-scenario-tests.ts` — **243 passed, 0 failed** |
| Real statistical forecasting exists | `lib/forecast/` — `HOLT_WINTERS_ADDITIVE`, `SEASONAL_NAIVE`, `backtest.ts`, `calibration.ts`, `qualification.ts`, `registry.ts` |
| Signals are first-class with structured provenance | `EnterpriseSignal`, `EnterpriseSignalTimeline`, `SignalSimulationContext`, periods `T-90 … T+30` |
| A period-advancing simulator exists and is unused by Observability | `POST /api/v1/signals/simulate` · `simulateEnterpriseSignalTimelines` |
| Attested admission exists | `ESF-6` — `source × context → authority`, server-issued receipts |
| Signals are stamped on **civil time**, not the scenario clock | two consecutive identical `GET /api/v1/signals`: all values byte-identical, `observed_at` / `effective_at` differ and read `2026-09-15T20:28:3xZ` against a scenario clock of `2026-06-03T00:00:00.000Z` |
| Observability signals are bound to the wrong scenario | route defaults to `family_id=promotion_surge`, `scenario_id=SCN-PROMO-01`, entity **FreshDirect UK** |
| A hash-derived economic modifier is live | `skuContextFactor` — `0.94 + (hashSeed(sku‖region) % 13)/100`, a ±6% band |
| No upload capability of any kind exists | no multipart route, no CSV/XLSX parser, no such dependency in `package.json` |
| Seven archetypes are on one economic framework | `DEMO-HARD-04`, `canonicaliseArchetypes`, asserted §9 of the canonical suite |

---

## 2. Reconciliation table

### 2.1 Signals — Enterprise Signal Fabric (ESF)

| Item | Recorded state | Classification | Basis |
|---|---|---|---|
| `ESF-1` Enterprise Signal Contract & Synthetic Foundation | COMPLETED | **CLOSE — confirmed** | Contract, taxonomy, generator, BFF proxy and Shared Decision State integration all present and exercised by `run-signal-tests.ts` |
| `ESF-2` Dynamic Signal Simulation | COMPLETED | **PARTIALLY DELIVERED — engine complete, unconsumed** | `simulateEnterpriseSignalTimelines` exists, is deterministic and is tested by `run-esf2-tests.ts`. **No production surface calls it.** The Observability Refresh re-GETs a static snapshot instead. The gap is consumption, not capability, and it is `SCI-05`'s to close |
| `ESF-3` External Signal Connector Contract | COMPLETED | **RETAIN** | Provider-neutral, explicitly not deleted or absorbed. `SCI` adds no connector and creates no second origin of `synthetic_demo = false` |
| **`ESF-4` Signal Quality, Confidence & Provenance** | **Parked** — "canonical continuation after Release 1.0, not superseded, cancelled or deprioritised" | **REACTIVATE → `SCI-05`** | Its blocking dependency `ESF-6` **completed**. The G4 sequencing rule *admission precedes grading* is satisfied. `SCI-05` implements freshness on the scenario clock, provenance vocabulary consumption, materiality and decision relevance. **It is reactivated, not duplicated** — no parallel signals programme is opened |
| `ESF-5` Learned Signal Behaviour | Planned | **DEFER** | Depends on `ESF-4` **and** Phase 10F (Pattern Matching ML), which is not implemented. Genuinely remaining ML work; not authorised by `SCI` |
| `ESF-6 / Y3a` Attested Observation Admission | COMPLETED | **CLOSE — confirmed, and REUSED** | `run-esf6-tests.ts` green. `SCI-10` admits user CSV **through this path** rather than building a second ingestion subsystem |

### 2.2 Machine learning and forecasting

**The instruction not to preserve stale ML plans as though ML does not exist is discharged here.** The
estate contains real statistical forecasting. It does not contain the ML serving layer Programme 10
planned. Both statements are true and the backlog must say so.

| Item | Recorded state | Classification | Basis |
|---|---|---|---|
| `CTW-03` Governed forecast model execution boundary | COMPLETED | **CLOSE — confirmed** | `run-ctw03-tests.ts` green; registry refuses an unregistered model with `MODEL_NOT_REGISTERED` |
| `FM-01` Governed Forecast Migration & Release 1.0 Hardening | COMPLETED | **CLOSE — confirmed** | `run-fm01-tests.ts` green. `D-DDF-3` closed in full; the sine/cosine model selector is deleted with its engine |
| `D-FM-1` empty day in the mean's denominator | CLOSED | **CLOSE — confirmed** | The engine that computed it is deleted; the governed path publishes `excluded_periods` |
| `D-FM-2` frozen `2026-06-04` window anchor | CLOSED | **CLOSE — confirmed** | `getCoverageAnchor()` reads the source's own last covered day; no literal date survives in `lib/query-engine.ts`. **Note:** the signal-fabric civil-time defect found by this assessment is a *different* defect and is registered separately at `R-19` |
| `D-FM-3` timezone-skewed seasonality | CLOSED | **CLOSE — confirmed** | Asserted identical under `UTC`, `America/New_York`, `Asia/Tokyo` |
| `D-FM-4` `arima` indistinguishable from garbage | CLOSED | **CLOSE — confirmed** | Refused on every path |
| `D-FM-5` `kpi.growthRate` carries no information from history | **OPEN** | **RETAIN — open** | A Path-A KPI the governed boundary does not publish. Not intersected by `SCI`; remains open and recorded |
| `D-FM-7` hard-coded table wrong about the series it multiplies | **OPEN** | **RETAIN — open** | Unchanged by `SCI` |
| `Phase 10F` Pattern Matching ML | Planned | **DEFER — genuinely remaining** | No ML serving layer exists. `situation_similarity` is a preserved metric, not a trained model |
| `Phase 10G` Outcome Prediction | Planned | **DEFER — genuinely remaining** | No predictive model for service level, margin, waste or availability consequence exists |
| `Phase 10H` Intervention Ranking | Planned | **DEFER — genuinely remaining** | Ranking is deterministic and rule-based today |
| `Phase 10I` Intelligence Moments | Planned | **DEFER** | Not intersected by `SCI` |
| `Phase 10J` Adaptive Decision Profile | Planned | **DEFER** | Not intersected by `SCI`. Its guardrail — personalisation alters ranking and presentation, never source facts — is consistent with ADR-082 and is retained |
| `ADR-072` uncertainty published twice, never a bare confidence percentage | Implemented | **RETAIN — binding on `SCI-05`** | `SCI-05` adds **no third confidence score**; materiality and decision relevance are derived quantities, not scores |

### 2.3 Programme 10 — service and state foundations

| Item | Recorded state | Classification | Basis |
|---|---|---|---|
| `WP10-A` Service / API foundation | COMPLETED | **CLOSE — confirmed** | `services/world`, `docs/openapi/world-v1.yaml` |
| `WP10-B` Journey Telemetry | COMPLETED | **CLOSE — confirmed** | `run-journey-tests.ts` green |
| `WP10-C` Shared Decision State | COMPLETED | **CLOSE — confirmed** | `run-decision-state-tests.ts` green. `SCI-01` threads scenario identity through it |
| `WP10-D` Memory & Learning API | COMPLETED | **CLOSE — confirmed** | `run-wp10d-tests.ts` — 15 cases passed |
| `Phase 10B` Synthetic Enterprise World — 12 causal scenario families | Planned; six implemented in `enterprise-world-seed.ts` | **SUPERSEDE → `SCI-01` / `SCI-03`** | The six implemented families carry **pre-hardening economics** (55,000-unit weeks, £142,000 exposure, FreshDirect UK). ADR-077 retains `ScenarioFamilyId` as taxonomy and retires those economics. The remaining six families are not built as a separate world; they become future curated scenarios on the canonical model |
| `Phase 10C` Tenant-Specific Enterprise Worlds | Planned | **DEFER** | Tenant isolation exists in the state and admission layers; per-tenant worlds are not required by `SCI` |
| **Phase numbering collision** | — | **RETAIN — governance defect, recorded** | `MASTER_PLAN.md` lists Phases 10A–10J twice with different meanings: a *planned* list where 10E is Shared Decision State and 10F is Pattern Matching ML, and a *completed* list where 10C is Shared Decision State and 10D is Memory & Learning. The letters do not correspond. Recorded rather than silently renumbered, because renumbering would break citations in nine reports |

### 2.4 Campaign, demand and decision capability

| Item | Recorded state | Classification | Basis |
|---|---|---|---|
| `CDI-01` … `CDI-08` | COMPLETED | **CLOSE — confirmed** | All runners green; counted assertions 31 / 49 / 70 / 93 / 155 / 229 / 44 across `CDI-03`…`CDI-08` |
| `IFI-01` Intent Fusion | COMPLETED | **CLOSE — confirmed** | `run-ifi1-tests.ts` green; `lib/intent-fusion/` present |
| `DDF-01` Demand Decision Frontier | COMPLETED | **CLOSE — confirmed** | Forecast Stability, Decision Gap, Decision Window, Decision Regret all resolve from engines; ADR-040…043 |
| `CTW-01` / `CTW-01R` / `CTW-02` | COMPLETED | **CLOSE — confirmed** | 65 / 60 / 82 assertions, zero failures |
| `ADR-075` residual — bounded divergence between planning curve and causal engine | Open, bounded | **MERGE → `SCI-01`** | The bound is the `skuContextFactor` band. ADR-079 retires the hash; the assertion is re-derived to exact agreement on the depth response with design components named. The bridge itself stands |
| `DOT-1` … `DOT-12` Demand Observability & Demand Truth | ROADMAP | **DEFER — unchanged** | No `DOT` item is authorised. `DOT-11` was gated behind `ESF-4`; reactivating `ESF-4` unblocks it **as roadmap only**. The estate remains at Demand Observability Level 0 |

### 2.5 Atlas, governance and architecture

| Item | Recorded state | Classification | Basis |
|---|---|---|---|
| `ATL-01` … `ATL-07`, `ATL-04R`, `ATL-FINAL` | COMPLETED | **CLOSE — confirmed** | All runners green; governance enforces clean |
| `R-07` Storyboard retirement gate | OPEN — GOVERNED (3 of 6) | **RETAIN → `SCI-09`** | ADR-051 Amendment A names `SCI-09` as the navigation successor, closing `SB-GATE-6` by construction and scoping `SB-GATE-4`. **The storyboard is not deleted until 6 of 6** |
| `R-15` Legacy client-supplied Gemini key | OPEN — GOVERNED | **RETAIN — and explicitly not extended** | ADR-044 Amendment A's *"Nothing new may use it"* binds `SCI-07` and `SCI-10`. `SCI` does not close this debt and does not widen it |
| `R-16` Two units of storyboard knowledge have no home | FUTURE | **MERGE → `SCI-09`** | `SCI-09` carries them or records them as formally orphaned |
| `R-02`, `R-03`, `R-04`, `R-12`, `R-14`, `R-17`, `R-18` | OPEN / FUTURE / OWNER DECISION | **RETAIN — untouched** | Not intersected by `SCI` |
| `ADR-044` GenAI drafts, never evidence | Implemented | **RETAIN — extended, not replaced** | Amendment B carries the semantics to scenario drafting |
| `ADR-049`, `ADR-054`, `ADR-055`, `ADR-057` provenance and grounding rulings | Implemented | **RETAIN** | ADR-082 maps onto them; it does not replace them |

### 2.6 Demonstration hardening

| Item | Recorded state | Classification | Basis |
|---|---|---|---|
| `DEMO-HARD-01` One decision case | COMPLETED | **CLOSE — confirmed**, with a count correction | Confirmed by the suite. The Master Plan records *"74 cross-surface and currency assertions"*; measured value is **243**. `DEMO-HARD-02` and `-04` added assertions without updating the narrative. Corrected in the Master Plan in this commit |
| `DEMO-HARD-02` Promotion model seam | COMPLETED | **CLOSE — confirmed**, residual merged | The bridge stands. Its bounded-divergence residual merges to `SCI-01` per §2.4 |
| `DEMO-HARD-03` Structured money for derived engine amounts | **PARTIALLY COMPLETED** | **MERGE → `SCI-01` / `SCI-03`** | `NarrativeStatement` and `formatStatement` exist and are the declared target; seeded narrative remains on the `localiseMoneyInText` regex path. Each new curated scenario would otherwise add narrative on the compatibility path, so it is closed where a scenario pack touches it and remains open elsewhere |
| `DEMO-HARD-04` Every archetype on one economic framework | COMPLETED | **CLOSE — confirmed, and REUSED** | `canonicaliseArchetypes` asserted over the whole map. This is what makes `SCI-03` promotion rather than construction |
| Docker acceptance of the supported local stack | **OPEN** | **RETAIN — open, unchanged** | Blocked in the closure environment by registry access, not by code. Not intersected by `SCI`; remains open |

### 2.7 Innovation Backlog

| Item | Recorded state | Classification | Basis |
|---|---|---|---|
| `IB-13` Continuous Live Decision Twin | Delivered 2026-08-23 | **CLOSE — confirmed** | `CTW` programme complete |
| Theme D — Data & Integration Fabric | Registered, not authorised | **MERGE → `SCI-10`** (partial) | The user-data slice is authorised as `SCI-10` **through `ESF-6`**. Connectors, MCP and enterprise integrations remain registered and unauthorised |
| Theme E — Platform AI Governance | Registered | **MERGE → `SCI-05` / `SCI-06`** (partial) | The Models & Methods register discharges the client-facing visibility slice. Key management UI remains unauthorised |
| §8 Future visibility in Observability & Governance | Registered | **MERGE → `SCI-06`** | Discharged by the four-section reorganisation |
| Themes A, B, C, F remainder | Registered | **RETAIN** | Not intersected |

### 2.8 Later phases

| Item | Classification | Basis |
|---|---|---|
| `Phase 11` IP and Innovation Governance | **RETAIN — DEFER** | Not intersected |
| `Phase 12` Industry Demonstration Packs | **RETAIN — DEFER, and distinguished** | Industry packs are a *domain ontology* capability. `SCI-03` curated scenarios are *decision situations* within one domain. They are not the same thing and neither supersedes the other |
| `Phase 13` Innovation Operating Model | **RETAIN — DEFER** | Not intersected |

---

## 3. New residuals opened by this reconciliation

Registered in [`COGNIX_ATLAS_RESIDUAL_REGISTER.md`](COGNIX_ATLAS_RESIDUAL_REGISTER.md).

| ID | Residual | State |
|---|---|---|
| `R-19` | Signal fabric stamps civil wall-clock time where the scenario clock is authoritative | **OPEN — assigned `SCI-01`** |
| `R-20` | Observability signals bound to `SCN-PROMO-01` / FreshDirect UK, contradicting the canonical decision case | **OPEN — assigned `SCI-01`** |
| `R-21` | `skuContextFactor` — a hash of SKU and region names produces a ±6% economic band that cannot be explained on a Decision Trace | **OPEN — assigned `SCI-01`** |
| `R-22` | `ESF-2`'s simulation engine is complete and consumed by no production surface | **OPEN — assigned `SCI-05`** |
| `R-23` | Master Plan records 74 cross-surface assertions; measured value is 243 | **CLOSED in this commit** — Master Plan corrected |
| `R-24` | Programme 10 phase letters collide between the planned and completed lists | **OPEN — GOVERNED**, recorded not renumbered |
| `R-25` | `ATL-06B` assertion `A6b` is stale and fails on the pristine baseline; the estate carries two Google SDKs | **OPEN — GOVERNED**, corrected by whichever packet next touches provider configuration |

---

## 4. Summary

| Classification | Count | Items |
|---|---|---|
| **CLOSE — confirmed with evidence** | 19 | `ESF-1`, `ESF-3`†, `ESF-6`, `CTW-03`, `FM-01`, `D-FM-1`…`D-FM-4`, `WP10-A`…`WP10-D`, `CDI-01…08`, `IFI-01`, `DDF-01`, `CTW-01/01R/02`, `ATL-*`, `IB-13`, `DEMO-HARD-01/02/04` |
| **REACTIVATE** | 1 | `ESF-4` → `SCI-05` |
| **MERGE** | 6 | `ADR-075` residual, `DEMO-HARD-03`, `R-16`, Theme D (partial), Theme E (partial), Backlog §8 |
| **SUPERSEDE** | 1 | `Phase 10B` world-seed economics |
| **PARTIALLY DELIVERED** | 2 | `ESF-2` (engine complete, unconsumed), `DEMO-HARD-03` |
| **RETAIN — open** | 9 | `D-FM-5`, `D-FM-7`, Docker acceptance, `R-02/03/04/12/14/17/18`, `R-15`, `R-07`, `R-24`, `R-25` |
| **DEFER** | 10 | `ESF-5`, Phases 10C / 10F / 10G / 10H / 10I / 10J, `DOT-1…12`, Phases 11 / 12 / 13 |

† `ESF-3` is `RETAIN` rather than `CLOSE`: it is complete as a contract and remains an open extension
point by design.

**Nothing in this reconciliation marks an item complete that was not already complete with cited
evidence, and no existing item is duplicated by an `SCI` packet.**

**One correction made during validation.** This reconciliation initially recorded the test estate as
44 runners green with zero failures. Re-running each runner individually rather than in a loop showed
`run-atl06b-tests` failing one stale assertion on the pristine baseline. The table above was corrected
before commit and the finding registered as `R-25`. It is stated rather than silently amended, because
a reconciliation that overstates baseline health is exactly what rule 2 of §0 exists to prevent.

---

## 5. Related governance

[`MASTER_PLAN.md`](MASTER_PLAN.md) ·
[`COGNIX_SCENARIO_INTELLIGENCE.md`](COGNIX_SCENARIO_INTELLIGENCE.md) ·
[`COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md`](COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md) ·
[`COGNIX_ATLAS_RESIDUAL_REGISTER.md`](COGNIX_ATLAS_RESIDUAL_REGISTER.md) ·
[`COGNIX_INNOVATION_BACKLOG.md`](COGNIX_INNOVATION_BACKLOG.md) ·
[`COGNIX_FORECAST_MODEL_TRUTH_RECORD.md`](COGNIX_FORECAST_MODEL_TRUTH_RECORD.md)
