# CogniX Scenario Laboratory — Planning Report

**Purpose.** The evidence base for programme `SCI`. Every architectural claim in
[`COGNIX_SCENARIO_INTELLIGENCE.md`](../governance/COGNIX_SCENARIO_INTELLIGENCE.md) and every
classification in [`COGNIX_BACKLOG_RECONCILIATION_2026_09.md`](../governance/COGNIX_BACKLOG_RECONCILIATION_2026_09.md)
traces to a measurement recorded here.

**Baseline.** `f9c5679c05dd5abc0e1bee44e91ba1f4258a47fe` on `feature/cognix-enterprise-demo-hardening`.
Commits `0fcca56f`, `a3c50610`, `305fb20e`, `40dc1dd5`, `f9c5679c` verified present and in ancestry.

**Method.** Full source inspection; production dependency install; `npm run dev` under
`COGNIX_WORLD_MODE=demo-fallback`; read-only HTTP against the running application; all 44 test runners
executed via `npx tsx`. Performed in an isolated detached worktree; no repository file was modified
during assessment.

**Date.** 2026-09-15.

---

## 1. Baseline health, measured

| Measurement | Result |
|---|---|
| Test runners executed | **44**. **43 of 44 runners fully green.** `run-atl06b-tests` reports 132 passed / **1 failed** — assertion `A6b`, a **stale assertion rather than a code defect**; see residual `R-25`. Every other runner exits 0 with zero failures |
| Cross-surface reconciliation | `run-canonical-scenario-tests.ts` — **243 passed, 0 failed** |
| Named counts | CDI-07B 229 · CDI-07A 155 · CDI-06 93 · CTW-02 82 · CTW-03 77 · CDI-05 70 · CTW-01 65 · CTW-01R 60 · promotion CTA 54 · CDI-04 49 · CDI-08 44 · CDI-03 31 |
| Source scale | 457 TS/TSX files, 122,105 lines |
| Governance estate | 93 markdown records, **76 ADRs** before this authorisation |
| Contract models | 36 under `packages/contracts/src` |
| Services | `cognix-world`, `cognix-learning`, `cognix-atlas` |

**This is a mature, well-governed estate.** The programme authorised on top of it is convergence, not
repair.

**Correction to an earlier statement of this measurement.** An initial pass over the estate reported
44 runners green with zero failures. That pass ran the runners in a shell loop whose exit status
reflected only the last command, so a single failing runner was masked. Re-run individually,
`run-atl06b-tests` fails one assertion. The failure is pre-existing at `f9c5679c`, is not caused by
any `SCI` authorisation, and is recorded at `R-25`. It is stated here rather than quietly corrected
because a planning report that overstates baseline health is the class of defect this programme
exists to close.

## 2. The three scenario concepts

| Concept | Location | Consumers | Economics |
|---|---|---|---|
| `CANONICAL_SCENARIO` `SCN-FRESH-DAIRY-CHEDDAR-001` | `packages/contracts/src/canonical-scenario-model.ts` | **29 files, 227 `canonical*` call sites** | Hardened (ADR-073) |
| `ENTERPRISE_WORLD_SCENARIOS` — `SCN-PROMO-01`, `SCN-SUPP-02`, `SCN-WASTE-03`, `SCN-WEATHER-04`, `SCN-OVERTIME-05`, `SCN-IMBALANCE-06` | `packages/contracts/src/enterprise-world-seed.ts` | `components/AvailabilityIntelligence.tsx` and the signal generator | **Pre-hardening** — 55,000-unit weeks, £142,000 exposure, FreshDirect UK |
| `CampaignArchetype` — seven | `lib/campaign-archetypes.ts` | Promotion and Campaign surfaces | Hardened (`DEMO-HARD-04`) |

**Why the convergence is cheap.** `CanonicalScenario` is already a complete, well-formed decision-case
model with pure derivation functions. Its own module records the property that makes multi-scenario a
parameterisation: *"Because the supplier capacity index and the supplier flex allowance are declared
as RATIOS of the demand base rather than as counts drawn from a separate population, the whole
scenario rescales coherently from one number — `base_demand_units_per_week`."*

**Why the catalogue is cheap.** `CampaignArchetype` already carries, per archetype, `cost_price`,
`rrp`, `base_weekly_units_per_store`, `price_elasticity`, `cannibalisation_rate`, a demand waterfall,
an elasticity curve, an opportunity matrix, frontier plays, inverse conditions, change triggers,
signal hypotheses and a decision graph. What it lacks is the world half — estate, calendar, supply and
inventory — which is exactly what `CanonicalScenario` holds.

## 3. Measured defects

### 3.1 Signals are stamped on civil time (residual `R-19`)

Two consecutive identical `GET /api/v1/signals`:

| Field | Call 1 | Call 2 |
|---|---|---|
| `baseline_value`, `observed_value`, `delta`, `delta_pct`, `confidence`, `quality`, `provenance`, `signal_id` | identical | identical |
| `observed_at` | `2026-09-15T20:28:37.482Z` | `2026-09-15T20:28:38.502Z` |
| `effective_at` | `2026-09-18T20:28:37.482Z` | `2026-09-18T20:28:38.502Z` |

`canonicalScenarioNowIso()` = `2026-06-03T00:00:00.000Z`. The signals are stamped three months after
the scenario's observed history ends.

**This is why Refresh looks broken.** Every value a reader cares about is identical between reads, and
the only field that moves is one that should not move at all. It is a different defect from `D-FM-2`,
which `FM-01` closed on the forecast path.

### 3.2 Observability shows the retired supplier (residual `R-20`)

`GET /api/v1/signals` with no scenario parameter returns `scenario_id: SCN-PROMO-01` and
`SUPPLIER_CAPACITY_PRESSURE` against `entity_id: "FreshDirect UK"`.

`COGNIX_PRESENTATION_SYNC_DELTA.md` §3.3 records: *"The flex notice is now served on the party that
makes the product, per the product master. Any slide naming FreshDirect UK must change."* The live
Observability surface still names it.

The generator is **partly** migrated — it already returns `Fresh Dairy` and `P004 Cheddar Mature 400g`
correctly — which is why this survived review: the panel reads canonical until the supplier is
inspected. Highest client-visible risk at this baseline.

### 3.3 A name hash with economic effect (residual `R-21`)

```
skuContextFactor = 0.94 + (hashSeed(sku_scope.join('|') + '::' + region) % 13) / 100   →  0.94 … 1.06
```

A ±6% band on every causal number, keyed on the **spelling** of a SKU list and a region name. The
code's own comment records the argument against it — category was removed from the seed because
renaming it *"moved every downstream number by up to 6% for no modelled reason, and on a demo whose
economics sit near a contribution breakeven that jitter was enough to flip a verdict"* — and that
argument applies unchanged to the two dimensions still in the seed.

It is a material part of the residual Promotion seam `ADR-075` bounded rather than closed, and a hard
blocker for authored scenarios whose names are arbitrary strings.

### 3.4 A complete simulation engine nothing calls (residual `R-22`)

`POST /api/v1/signals/simulate` → `simulateEnterpriseSignalTimelines` accepts a
`SignalSimulationContext` (session, decision-state id and version, scenario, promotion lift, supplier
cap, horizon, cannibalisation, selected interventions) and returns `EnterpriseSignalTimeline[]` across
`T-90 … T+30`, each observation carrying `provenance{rule_id, drivers, source_signal_refs,
decision_state_version, intervention_refs, generator_version}`.

Delivered by `ESF-2`, tested by `run-esf2-tests.ts`, **called by no production surface**. This changes
ADR-081 from *build an engine* to *consume one*.

### 3.5 Governance drift (residuals `R-23`, `R-24`)

`MASTER_PLAN.md` recorded the `DEMO-HARD-01` suite as 74 assertions; measured 243. Programme 10 lists
phase letters 10A–10J twice with different meanings.

## 4. What already exists that the programme reuses

| Asset | Evidence | Reused by |
|---|---|---|
| Real statistical forecasting | `lib/forecast/` — `HOLT_WINTERS_ADDITIVE`, `SEASONAL_NAIVE`, `backtest.ts`, `calibration.ts`, `qualification.ts`; registry refuses an unregistered model | `SCI-05` Models & Methods |
| Attested observation admission | `ESF-6` — `source × context → authority`; server-issued ids; `synthetic_demo` server-derived and never accepted from a request body; named accountable human | `SCI-10` CSV admission |
| A governed AI input boundary | ADR-044 — `GENAI_DRAFT` / `NON_AUTHORITATIVE_DRAFT`; response validation rejecting any item with a percentage, currency symbol or decimal quantity; `503`/`502` refusal with no canned fallback; user entries fenced as data | `SCI-07` scenario drafting |
| Deterministic reset | `ScenarioControls.tsx`, asserted field-by-field | `SCI-03` per-scenario reset |
| Currency layer | ADR-074, one base converted once at display, ECB rates, dated fallback | Certification `C-9` |
| Signal contract with structured provenance | `ESF-1`/`ESF-2`/`ESF-3` | `SCI-05` |

**No new AI provider is required, and none is introduced.** Google GenAI continues through
`process.env.GEMINI_API_KEY` server-side under ADR-067.

## 5. Capability that cannot be built at this baseline

**Online fulfilment / CFC Decision Intelligence.** `CanonicalEconomics` carries no fulfilment capacity,
centre throughput, pick rate or delivery-slot term. The signal taxonomy defines
`CFC_THROUGHPUT_PRESSURE`, `PICK_RATE_DEGRADATION`, `FULFILMENT_QUEUE_GROWTH` and
`DELIVERY_SLOT_SATURATION`, and **no engine consumes any of them economically**. The canonical record
declares `online_demand_share_pct: 14` and nothing downstream varies with it.

It is an economic-model extension, not a scenario pack — registered as explicit roadmap work and
excluded from the curated catalogue. It is the most commercially significant of the deferred items for
online-first grocery conversations, which is why it is recorded rather than quietly omitted.

**No file upload capability exists anywhere** — no multipart route, no CSV or XLSX parser, no such
dependency. `SCI-10` is genuinely new build.

## 6. Storyboard gate state

`SB-GATE` stands at **3 of 6** (`R-07`). `ArchitectureExplorer.tsx` is 1,546 lines of static slides;
ATL-01 counted **74 references** to a Looker / BigQuery / AppSheet stack the CogniX estate does not
implement; the capability record rates it `severity: high` and states it *"narrates an architecture
rather than reflecting one"*.

The two substantive blockers are `SB-GATE-4` (slides 6 and 7 have no successor) and `SB-GATE-6`
(retirement must be proposed in a work package naming the navigation successor). ADR-051 Amendment A
names `SCI-09` as that package. **The storyboard is not deleted until the gate reads 6 of 6.**

## 7. Scope positions taken, and why

| Position | Reason |
|---|---|
| Three curated scenarios, not six to eight | Coverage of decision *shapes* — a capacity-bound decision and a do-not-discount decision alongside the canonical promotion decision. `DEMO-HARD-04` established that five of seven archetypes reach "do not discount" under honest pricing and that this is a legitimate recommendation |
| No operating-model selector | Certification runs per scenario, so three scenarios across four operating models is twelve certified sets; and nothing in the economics responds to an operating model, so the four would be relabelled results — the pattern Principle 12 and the `D-DDF-2` precedent forbid |
| CSV only, no XLSX | Formula and macro surface, multi-sheet and merged-cell ambiguity, and a new parsing dependency, for no gain a CSV export does not already provide |
| Form-first authoring before natural language | Without the structured record, a drafted scenario cannot be inspected, corrected, certified, versioned or reproduced, and the estate would hold a scenario whose economics exist only while a provider is reachable |
| Export/import, not a scenario database | The demonstration need is reproducibility, which a file and a content hash satisfy |
| Wave 0 is single-lane | The scenario contract cannot be frozen and consumed in the wave that creates it. Artificial parallelism is forbidden (ADR-084) |

## 8. Delivery risk stated plainly

The MUST items span Waves 0 and 2; 23 September is eight days from authorisation. Wave 1 carries only
SHOULD items. **If Gate A is late, Wave 1 is the wave to drop** — run `SCI-05` on SHA-A and take
Refresh and the scenario-contradiction fix to the demonstration without the second and third
scenarios. Arriving with three scenarios and an Observability surface that still contradicts them
would be worse than arriving with one scenario whose evidence is coherent.

## 9. Related governance

[`COGNIX_SCENARIO_INTELLIGENCE.md`](../governance/COGNIX_SCENARIO_INTELLIGENCE.md) ·
[`COGNIX_SCENARIO_CERTIFICATION.md`](../governance/COGNIX_SCENARIO_CERTIFICATION.md) ·
[`COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md`](../governance/COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md) ·
[`COGNIX_BACKLOG_RECONCILIATION_2026_09.md`](../governance/COGNIX_BACKLOG_RECONCILIATION_2026_09.md) ·
[`COGNIX_ATLAS_RESIDUAL_REGISTER.md`](../governance/COGNIX_ATLAS_RESIDUAL_REGISTER.md) ·
[`COGNIX_PRESENTATION_SYNC_DELTA.md`](COGNIX_PRESENTATION_SYNC_DELTA.md) · ADR-077 … ADR-084.
