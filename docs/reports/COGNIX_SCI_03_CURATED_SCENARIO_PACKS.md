# CogniX `SCI-03` — Curated Scenario Domain Packs

**Status:** Delivered.
**Date:** 17 September 2026.
**Base:** `13ce376e19239a4081e6c68764e470733ffc52b5` — HEAD of `feature/cognix-sci-wave0-convergence`,
the Wave-1 base. SHA-A (`8d6d960cd7d1a24ea41737da2d04bd4e47765a86`) is the contract-freeze point that
branch records.
**Branch:** `feature/cognix-sci-03-curated-scenarios`. Not merged.
**Governs:** `COGNIX_SCENARIO_INTELLIGENCE.md` §5, now implemented.
**Decisions applied:** ADR-073 Amendment A · ADR-077 · ADR-078 · ADR-079 · ADR-080 · ADR-082 · ADR-084.

---

## 1. What was delivered

Three certified scenarios where there was one, and the engine change that made a second one possible
at all.

| | `SCN-FRESH-DAIRY-CHEDDAR-001` | `SCN-CHILLED-SALMON-002` | `SCN-BAKERY-SOURDOUGH-003` |
|---|---|---|---|
| SKU | P004 Cheddar Mature 400g | P048 Atlantic Salmon Fillet 300g | P023 White Sourdough 800g |
| supplier | SUP002 Cheshire Cheese Co | SUP006 Foodvest Fish (Norway) | SUP011 Allied Bakeries |
| family / archetype | `promotion_surge` / `ARCH-CHILLED-ELASTIC` | `supplier_breach` / `ARCH-SUPPLY-CONSTRAINED` | `fresh_perishable_waste` / `ARCH-PREMIUM-ARTISAN` |
| scenario clock | 2026-06-03 | 2026-07-15 | 2026-09-09 |
| horizon | 14 days | 14 days | 7 days |
| estate | 1,450 stores | 980 stores | 620 stores |
| base week | 350,000 units | 47,040 units | 26,040 units |
| list / depth | £2.49 / 20% | £4.99 / 10% | £1.39 / 10% |
| supplier funding | 35% | 60% | 10% |
| elasticity | 2.4pp per point | 2.2pp per point | 0.8pp per point |
| allocation index / flex | 1.10 / 12% | 1.02 / 6% | 1.06 / 3% |
| Decision Gap | 130,130 of 900,130 units (18.6pp of base) | 22,956 of 117,036 (24.4pp of base) | 1,354 of 28,957 (5.2pp of base) |
| **derived recommendation** | **14%** | **10%** | **0% — do not promote** |
| certification | **CERTIFIED**, 12/12, 84 checks | **CERTIFIED**, 12/12, 84 checks | **CERTIFIED**, 12/12, 84 checks |

`SCN-FRESH-DAIRY-CHEDDAR-001` remains the demo-active scenario. The two packs are registered and
resolvable; nothing selects between them yet, because selection is `SCI-04`'s.

---

## 2. `R-27`, resolved first

The packet directed that `R-27` be treated as the first engineering problem, and it was: neither
pack was authored until the engines answered with the scenario they were asked about.

### 2.1 What was wrong

`SCI-01` parameterised the CONTRACT — `scenarioX(scenario, …)` are pure functions of a scenario, and
`canonicalX(…)` binds the reference instance at one place per quantity. The ENGINES read the bound
layer. `deriveUnitEconomics()` returned Fresh Dairy's realised price; `CDI02_BASE_WEEKLY_UNITS` was
Fresh Dairy's weekly population, evaluated once at import; the elasticity curve was Fresh Dairy's
curve; `createDefaultCampaignIntentDraft` opened on Fresh Dairy's identity and the literal `'DAIRY'`.

`SCI-02` did not paper over it. Its harness probed those engine surfaces with the scenario under
test, a second scenario failed six dimensions with the divergence named, and the finding was carried
as `R-27` rather than hidden.

### 2.2 How it is closed

A third layer, not a parameter on every engine:

| layer | accessor | binds to | read by |
|---|---|---|---|
| A | `scenarioX(scenario, …)` | its argument | the model, the certification harness |
| B | `canonicalX(…)` | `CANONICAL_SCENARIO`, by name | instance-specific tests, the reference archetype entry |
| **C** | **`inScopeX(…)`** | **`scenarioInScope()`** | **every engine** |

`scenarioInScope()` answers *which certified scenario is this computation for?* Normally that is the
demo-active scenario read straight from the registry, so an engine is **engine + active certified
scenario** with no branch in it. A caller that must evaluate a NAMED scenario binds it for the
duration of a synchronous computation with `withScenarioInScope`. There are exactly two, and both are
governed:

1. **The certification harness.** It cannot activate the scenario it is certifying — ADR-080 gates
   activation ON certification — so binding is the only way its engine probes can measure the right
   scenario. Binding grants no activation and no admission.
2. **A request that names a scenario.** It evaluates that scenario without changing what the estate
   is running for anyone else.

The alternative — threading a `scenario` argument through `deriveUnitEconomics`,
`calculateDerivedImpacts`, `evaluateCampaignDecision` and everything downstream — was rejected. It
pushes *"which scenario is this?"* into every caller including every React surface, which is the
decision `SCI-04` owns and has not made; and it gives each caller the opportunity to answer
differently, which is the `SCN-PROMO-01` defect ADR-077 was written against arriving through a
parameter instead of a literal.

The binding is **synchronous by contract and enforced**: `withScenarioInScope` refuses a callback
that returns a thenable, because an `async` callback would release the binding before its work ran.
`AsyncLocalStorage` would lift the restriction and is deliberately not used — the contracts package is
imported by client surfaces, and a Node-only primitive in a contract is a runtime dependency it
should not carry.

### 2.3 What moved

| file | change |
|---|---|
| `packages/contracts/src/scenario-scope.ts` | **new** — layer C: `scenarioInScope`, `withScenarioInScope`, `isScenarioBound`, 27 `inScope*` accessors mirroring layer B one for one |
| `lib/campaign-causal-engine.ts` | four module constants → reads of the scenario in scope; the calibration anchor is now the elasticity of the scenario's OWN category, so a campaign in that category scales by 1 and gets the record's declared rate |
| `lib/demand-decision-frontier/demand-frontier-engine.ts` | `DDF_GROSS_MARGIN_RATE_PCT` → `ddfGrossMarginRatePct()`, `DDF_FLEX_PREMIUM_RATE_PCT` → `ddfFlexPremiumRatePct()`, `DDF_SLA_FLEX_UNITS_PER_WEEK` → `ddfSlaFlexUnitsPerWeek()`, plus eight `CANONICAL_SCENARIO.` reads |
| `lib/campaign-archetypes.ts` | `scenarioElasticityCurve(scenario)` derives a curve for any scenario; `curvePoint` reads the in-scope curve; `CANONICAL_ELASTICITY_CURVE` and `canonicalCurvePoint` stay explicitly bound to the reference instance for the archetype catalogue; `REGION_STORE_COUNTS` → `regionStoreCounts()` |
| `packages/contracts/src/decision-state-model.ts` | `calculateDerivedImpacts` derives population, flex, substitution recovery and realised price from the scenario in scope |
| `packages/contracts/src/campaign-timeline-model.ts` | `CDI02_BASE_WEEKLY_UNITS` → `cdi02BaseWeeklyUnits()` |
| `packages/contracts/src/campaign-intent-model.ts` | a new decision opens on the in-scope identity, SKU, family, window and RESOLVED category |
| `packages/contracts/src/campaign-readiness-model.ts` | `WP10C_RECOVERY_LEVER_HEADROOM` → `wp10cRecoveryLeverHeadroom()`, so the mirror cannot drift from the engine |
| `packages/contracts/src/campaign-decision-taxonomy-model.ts` | `resolveCategory` takes an optional subcategory fallback, so a scenario that names its category the way a merchant does ("Fresh Dairy") resolves without either side restating the other |
| `lib/scenario-certification.ts` | `certifyScenario` binds the scenario under test around the whole run, once, so the cross-surface dimension never compares results taken under different bindings |

**Six module constants became functions.** A constant evaluated at import is exactly how a surface
came to be pinned to one scenario, and a source guard now asserts they do not come back.

### 2.4 Evidence it is closed

- The `SCI-02` fixture that failed **six** dimensions now fails **three** — `C-1`, `C-2` and `C-12` —
  which are the ways in which it deliberately contradicts the enterprise masters (it calls P012 a
  "Chilled Ready Meal" the master calls "Smoked Salmon 100g", serves the flex notice on a supplier
  that does not make the line, and carries £2.49 against a master price of £3.19). `C-5`, `C-7` and
  `C-8` now reconcile for it **at a 120,000-unit week against the reference scenario's 350,000**.
  That reconciliation is asserted, so a regression is a failing test rather than a discovery.
- Both curated packs certify on all twelve dimensions at 84 applicable checks, the same count as the
  reference scenario — one invariant set, three scenarios.
- `run-sci03-scenario-pack-tests.ts` §7 is a source guard over `lib`, `packages/contracts/src`,
  `services/world/src`, `app` and `components`: **no engine names a curated pack**, **no engine
  compares a scenario identity against a string literal**, and **the six retired constants are not
  re-declared**. That is `R-27`'s acceptance condition — *engine + active certified scenario, never
  if scenario A / if scenario B* — stated as a check rather than a promise.

---

## 3. The protected journey is bit-for-bit unchanged

A 385-line value probe was run at the base commit and at this head and diffed. **Identical.** It
covers every derived quantity (demand, exposure, unit economics, cover, depth response at all seven
tiers), the full elasticity curve including its contribution figures, `calculateDerivedImpacts`,
every archetype's curve, three causal evaluations at two scopes, the opening campaign draft, and the
reference scenario's entire certification result.

The figures the packet pinned, read back from the engines after the change:

| quantity | value |
|---|---|
| depth response at 20% | **+44.16pp** |
| contribution at 20% | **−£5,167** |
| depth response at 14% | **+33.65pp** |
| contribution at 14% | **+£32,976** |
| horizon base demand | 700,000 units |
| expected demand | 900,130 units |
| servable | 770,000 units |
| Decision Gap | 130,130 units · £269,369 revenue · £80,681 margin |
| derived-impact exposure | £47,093 |
| realised revenue per unit | £2.07 |

Confirmed again in the running product: the Promotion surface publishes *"A 20% cut across the whole
estate lifts demand 44.16% and adds −£5.2K of contribution. The same curve returns £33.0K at 14%"*,
and Demand publishes *"200,129 units above a base of 699,996 … Decision Gap of 18.6pp — £269.4K of
revenue and £80.7K of gross margin exposed"*, at 1440 / 1024 / 720.

---

## 4. The two scenario packs

### 4.1 `SCN-CHILLED-SALMON-002` — the decision depth cannot answer

Atlantic Salmon Fillet 300g, supplied by Foodvest Fish out of Norway on a six-day chilled lead.

Foodvest holds committed harvest volume and wants UK throughput, so it funds **60%** of the price
investment — against the reference scenario's 35%. At that funding the declared 10% cut is not merely
affordable: it is the **best tier on this scenario's own curve**, and the curve derives that rather
than being told it.

What the money cannot fix is an allocation index of **1.02** against demand running **26.4%** above
the un-promoted base. 22,956 units of the 117,036 expected across the horizon cannot be served; the
air-freight clause recovers 5,645 and leaves 17,311 exposed. So the decision is **hold, pull early,
or pay the premium** — and depth is not one of the options.

That is a genuinely different decision shape from the reference scenario, produced by two declared
numbers rather than by a different narrative.

### 4.2 `SCN-BAKERY-SOURDOUGH-003` — the scenario whose answer is *don't*

White Sourdough 800g, supplied by Allied Bakeries, baked to order each morning.

Bakery is inelastic: the decision taxonomy declares a promotional elasticity of **0.8** against
Dairy's 2.4, and this record declares the same 0.8 for its own line. A branded baker has no reason to
fund a retailer's competing own-label premium line, so it funds **10%**. Put those on a £1.39 line:

```
a point of depth BUYS  0.8 × (1 − 4% cannibalisation) = 0.768% of volume
                       worth 0.768% × £0.55 contribution ≈ £0.0042 a unit
a point of depth COSTS £1.39 × 1% × 90% retailer-funded  = £0.0125 a unit
```

Every point of depth costs three times what it buys. The curve returns its best contribution at 0%,
so **the recommendation is do not promote** — the commercially valuable answer a decision platform
should be able to give and a promotion planner cannot.

It also carries the catalogue's first **negative** declared differentiation: two depth-response
anomalies at 25% and 30%, each with its stated reason, expressing that past a quarter off a premium
artisan line reads as a markdown and the shoppers who buy it for its quality signal stop buying it.
The damage is declared at both tiers and compounds, so the curve falls rather than dipping and
recovering — a shape a reader would rightly distrust.

### 4.3 The recommendation is DERIVED, and that is now enforced

`is_cognix_recommended` was a literal on a depth tier. It is now computed: the tier returning the
most contribution wins, and `assertRecommendationIsDerived(scenario)` asserts that exactly one tier
is marked, that it is the contribution maximum, and that the tier marked current is the committed
depth. The bakery pack is the case that proves it matters — no seeded label would ever have said
"do not promote", and the arithmetic says it without being asked.

### 4.4 What the packs deliberately do NOT declare

- **No scope-response multipliers.** Neither scenario has a reason why a point of depth should buy
  more volume in one region than another beyond what the estate's own size already accounts for.
  ADR-079 makes an undeclared reason a modelling error; declaring one to make a pack look richer is
  the fabrication the packet forbade.
- **No depth-response anomaly for salmon.** The reference scenario declares a threshold price point
  at 14% because its category genuinely has one. Fresh fish is bought on appearance and occasion; an
  empty list is the honest answer and copying the dairy anomaly across would be invention.
- **No new engine, no per-scenario economic model, no operating-model abstraction.** Every pack is
  data plus a family signal timeline.

---

## 5. Signal timelines

Each scenario publishes its own timeline on its own clock, and every value is derived from its own
record.

| scenario | family | signals |
|---|---|---|
| Fresh Dairy | `promotion_surge` | search velocity · basket adds · slot pressure · **supplier capacity** · stock cover |
| Chilled Salmon | `supplier_breach` | **supplier lead-time drift** · **supplier capacity** · stock cover |
| Premium Bakery | `fresh_perishable_waste` | competitor feature · **perishable ageing** · **bake-plan headroom** · **margin compression** |

Two things were fixed rather than inherited:

- **The `supplier_breach` branch carried three literals** — a lead time that doubled, a
  0.5-to-4.5-hour replenishment delay and a stockout probability of 68% — none belonging to any
  scenario. They were the same defect `SCI-01` removed from the `promotion_surge` branch, surviving
  in a branch nothing had yet run, and `SCI-03` is the packet that ran it. The lead-time drift is now
  derived from the declared allocation shortfall (`expected / servable`), and the other two are
  replaced by fully derived capacity-pressure and stock-cover signals.
- **`fresh_perishable_waste` had no branch at all** and fell to a two-signal generic fallback that
  published neither a supplier nor a waste reading — which left `C-1.5` and `C-12.4` declared
  NOT_APPLICABLE for the bakery pack. It now has a four-signal timeline derived from the record's
  own waste rate, allocation index, observed-behaviour attribution and promotion economics, and both
  checks are applicable and passing. **No scenario is now carried by a declared non-applicability.**

---

## 6. Certification — all twelve dimensions, all three scenarios

| | C-1 | C-2 | C-3 | C-4 | C-5 | C-6 | C-7 | C-8 | C-9 | C-10 | C-11 | C-12 | checks | state |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SCN-FRESH-DAIRY-CHEDDAR-001` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | 84 | **CERTIFIED** |
| `SCN-CHILLED-SALMON-002` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | 84 | **CERTIFIED** |
| `SCN-BAKERY-SOURDOUGH-003` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | 84 | **CERTIFIED** |

C-1 Identity · C-2 Economics · C-3 Calendar & scenario clock · C-4 Signals · C-5 Demand ·
C-6 Promotion · C-7 Campaign Decision · C-8 Consequences · C-9 Currency · C-10 Deterministic reset ·
C-11 Provenance · C-12 Cross-surface reconciliation.

**Zero NOT_APPLICABLE checks across all three.** Every dimension was executed, none was carried by a
declared non-applicability, and the identical 84 is itself evidence: the same invariant set ran for
every scenario, so the framework is generalised rather than copied.

Certification is deterministic — two runs of any scenario produce a byte-identical result — and each
is stamped on its OWN scenario clock, not the wall clock and not a shared one.

**The gate was not weakened to admit these packs.** No check was relaxed, removed or made
conditional. The one gate change in this packet is the opposite direction: the probes now measure
the scenario under test instead of measuring the reference scenario three times.

---

## 7. Tests

**44 of 45 suites pass. The one failure is `R-25`, pre-existing and untouched.**

| | |
|---|---|
| new | `tests/unit/run-sci03-scenario-pack-tests.ts` — **96 assertions**, 8 sections |
| repointed | `run-sci02-certification-tests.ts` — 54 (was 53); `run-canonical-scenario-tests.ts`, `run-cdi04-tests.ts`, `run-cdi05-tests.ts`, `run-campaign-intelligence-tests.ts` — constant → function call sites |
| unchanged | the other 39 suites |

`run-atl06b-tests.ts` fails assertion `A6b` (*"package.json gained no new provider dependency"*).
Verified pre-existing by stashing this packet's work and re-running at the base commit: **the same
single assertion fails there**. This is `R-25`, which is explicitly not this packet's to fix, and it
is reported separately here rather than folded into the pass count.

### 7.1 What was changed in the `SCI-02` suite, and why it is not a weakening

One assertion in `run-sci02-certification-tests.ts` read a failing `C-8.1` detail on the second
scenario. That assertion encoded `R-27`: `C-8` failed only because the engines answered with the
reference scenario's population. With `R-27` closed, `C-8` reconciles.

The assertion was **repointed, not relaxed**. It still asserts the property `SCI-02` was asserting —
that a failed check states the measured divergence rather than only that it failed — against
`C-2.10`, which genuinely fails with *"master 3.19 vs scenario 2.49"*. A new assertion was added
alongside it asserting the other half: that `C-5`, `C-7` and `C-8` now PASS for a scenario declaring
a different scale, so a drift back to canonical-bound engines fails a test. The section's narrative
was rewritten to say what is now true rather than left describing a world that no longer exists.

---

## 8. Acceptance

**Build.** `next build` compiles clean; 74 static pages generated.

**API, against the running production build with the `cognix-world` domain service up:**

| request | result |
|---|---|
| `GET /api/v1/scenarios` | 200 · `count: 3` · `active_scenario_id: SCN-FRESH-DAIRY-CHEDDAR-001` · each entry carrying its own SKU, supplier, clock, horizon and taxonomy |
| `GET /api/v1/signals` (no parameter) | **400 `ScenarioNotResolved`** — ADR-077 part 4 holds |
| `GET /api/v1/signals?scenario_id=SCN-DOES-NOT-EXIST` | **400**, naming the three registered identities |
| `GET /api/v1/signals?scenario_id=…` ×3 | 5 / 3 / 4 signals, each on its own scenario clock (2026-06-03 / 2026-07-15 / 2026-09-09), each naming its own supplier |
| `GET /api/v1/signals/current?scenario_id=…` | same, with the scenario's family and clock on the envelope |

**Browser**, Chromium against the production build at **1440 / 1024 / 720**: the shell, Promotion,
Demand & Forecast and Campaign Decision all render; no horizontal overflow at any width; the
protected journey's published figures are the ones listed in §3. **No UI selection acceptance is
claimed** — there is no selector, and it belongs to `SCI-04` and Gate B.

**Docker is NOT claimed.** The Docker daemon is not running in this environment
(`Cannot connect to the Docker daemon at unix:///var/run/docker.sock`), so acceptance was taken
against a native production build, as at `SCI-01` and `SCI-02`.

---

## 9. Residuals

| id | state |
|---|---|
| `R-27` — engines resolve against the reference scenario | **CLOSED by this packet.** §2 |
| `R-30` — the family temporal series contradicts a certified scenario's own record | **OPENED.** Assigned `SCI-05` |
| `R-25` — stale `ATL-06B` assertion, two Google SDKs | **UNTOUCHED.** Not this packet's; reported separately in §7 |
| `R-26` — CDI-03 scores still derived from a name hash | Untouched. Not in scope |
| `R-28` — `cognix-world` does not install the certification gate | Untouched. Not in scope |
| `R-29` — stale `skuContextFactor` comment in `campaign-frontier-engine.ts` | Untouched. `SCI-03` does not touch that engine, and the residual assigns it to whichever packet does |

### `R-30` in brief

Publishing three certified scenarios through `/api/v1/scenarios` for the first time exposed that the
family `temporalData` — kept by `SCI-01` as *"a shape, not a baseline"* — contradicts two of the three
records in **direction** as well as scale: the `supplier_breach` series declares 41,000 units against
a flat 40,000 capacity while the salmon pack declares 47,040 at an allocation of 1.02, and the
`fresh_perishable_waste` series has demand FALLING at Today while the bakery pack declares it 11.2%
above base under the promotion.

No rescaling reconciles a direction. `SCI-03` stopped serving the field on both `/api/v1/scenarios`
implementations rather than inventing a projection it was not authorised to model, and left
`scenarioTemporalEvidence()` exported and unchanged so the evidence for the retirement survives.
Nothing consumed it. A real per-scenario evidence series belongs to `SCI-05`, whose Refresh contract
already declares `ScenarioAsAtMarker` and `RefreshDelta` for exactly this shape.

---

## 10. Boundaries observed

| boundary | held |
|---|---|
| No selection UI | `ScenarioContextStrip`, the scenario selector, navigation and the client-facing selection interaction are untouched. `SCI-04` builds against `scenarioCatalogue()`, frozen at Gate A and now returning three entries |
| No frozen contract edited | The five Wave-0 contracts are unchanged. Layer C is a NEW module beside them, not an edit to `canonical-scenario-model.ts` or `scenario-registry.ts`. `resetCuratedScenarioRegistry()` restores the `SCI-03` catalogue without reaching into `SCI-01`'s `resetScenarioRegistry()` |
| No Wave-2 contract implemented | `living-evidence-contracts.ts` untouched. No materiality, decision relevance or Refresh behaviour was built; `R-30` is handed to its owner rather than absorbed |
| Google GenAI | No change. No provider, no key handling, no ADR-044 or ADR-067 behaviour, no scenario drafting |
| `skuContextFactor` | Not restored, and no name- or hash-derived economic modifier introduced. The source guard that forbids it still passes |
| Gate B | **NOT passed.** It needs `SCI-04` |
| Merge | None. Nothing merged into the convergence branch or to production |

---

## 11. What a fourth scenario now costs

A record and a family signal timeline. The same invariant set already runs for every registered
scenario, the engines already answer with whichever one is in scope, and the gate already refuses
anything that does not reconcile. That is the difference between a demonstration with three modes and
a scenario laboratory, and it is the commercial argument the catalogue exists to make.
