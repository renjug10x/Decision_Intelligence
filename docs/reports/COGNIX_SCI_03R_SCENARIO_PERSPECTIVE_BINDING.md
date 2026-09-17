# CogniX `SCI-03R` — Scenario Perspective Binding

**Status:** Delivered.
**Date:** 17 September 2026.
**Base:** `b9880f7637af23638cc69f47fa1284a1ea45cfad` — the Wave-1 convergence state, at which Gate B
was OPEN on `R-35` alone.
**Branch:** `feature/cognix-sci-03r-scenario-perspective-binding`. Not merged.
**Scope:** `R-35` and the Gate-B cross-surface condition. Nothing else.
**Decisions applied:** ADR-073 Amendment A · ADR-077 · ADR-079 · ADR-080 · ADR-084.

---

## 1. What `R-35` actually was

Not that the scenarios were wrong. `SCI-03` certified three of them and the domain derived three
genuinely different decisions from declared terms — 14%, 10% and *do not promote* — and `SCI-03R`
changes none of that.

It was that the three **primary decision perspectives did not consume the active one**. Measured on
the converged product before this repair:

| surface | Fresh Dairy | Chilled Salmon | Premium Bakery |
|---|---|---|---|
| Demand base | 699,996 | **699,996** | **349,998** |
| Promotion | 20% → +44.16%, recommends **14%** | **identical** | **identical** |
| Campaign Decision | Cheddar Mature 400g · National, 14 days | **identical** | **identical** |

Selecting a scenario changed the shell and left the intelligence beneath it reading the reference
instance. On those surfaces the catalogue was label variations, which is what both packets'
cross-surface invariants forbid.

**Three root causes, in three different layers, none of which either Wave-1 lane owned.**

---

## 2. Demand — a scenario's history, for the pipeline that already exists

### 2.1 The cause

`data/sales_daily.json` is one seeded estate history of 162,000 rows running **2026-03-06 →
2026-06-03**. That is the reference scenario's own declared window: it sets
`observed_history_end_date: 2026-06-03`. While it was the only registered scenario, the surface was
reading its history and nothing was wrong.

`SCN-CHILLED-SALMON-002` runs to 2026-07-15 and `SCN-BAKERY-SOURDOUGH-003` to 2026-09-09. The
seeded estate holds **no rows at all** in either window, so both were fitted on the reference
scenario's population.

### 2.2 What was built, and what was reused

`lib/forecast/scenario-series.ts`, one module, inserted at the seam the pipeline already had:

```
buildScenarioForecastDataset  →  executeForecast  →  declared adjustment  →  decision layer
```

Everything downstream is untouched and unaware. The statistical model, its qualification, backtest
and calibration all run exactly as before — they simply fit the active scenario's history. **No
hand-authored forecast output is injected anywhere.**

The module makes **one branch, and it is on evidence coverage, never on scenario identity**:

| path | when | what |
|---|---|---|
| **OBSERVED** | the seeded estate covers the scenario's declared window | the observed series IS its history, returned untouched |
| **MODELLED** | the estate holds no rows for that window | derived from declared terms, and says so |

That is the distinction `buildForecastDataset` already drew between a day of zero demand and a day
with no rows: absence of evidence is not evidence, and it is reported rather than filled.

### 2.3 The modelled series — every part traces to something declared

| part | source |
|---|---|
| **shape** | the weekday rhythm of the scenario's OWN category in the seeded estate (`Chilled`, `Bakery`), phase-shifted so each modelled day carries the shape of the same weekday |
| **level** | its own declared weekly quantity per measure — `base_demand_units_per_week`, `waste_units_per_week`, or base × `list_price_gbp` — anchored on the trailing seven days, because the declared base is the un-promoted weekly level at the scenario clock |
| **trend** | its own declared `UNDERLYING_TREND` movement attribution, read by `driver_class` rather than by matching the driver's prose |
| **dates** | its own calendar, ending on its declared `observed_history_end_date` |

**The trend goes into the HISTORY, not onto the forecast.** The statistical model then picks it up
itself, which is the difference between a history the pipeline fits and an output someone wrote.

**The committed promotion is deliberately absent.** It is a `COMMERCIAL_INTENT` driver — a decision
under consideration, not something that has happened — and `declareScenarioAdjustment` already
applies it forward of the clock. Putting it in the history too would count it twice.

No `Math.random`, no wall clock, no name- or hash-derived quantity, no hard-coded chart array.

### 2.4 Measured

| | window | n | trailing week | declared base | basis |
|---|---|---|---|---|---|
| Fresh Dairy | 2026-03-06 → **2026-06-03** | 90 | 343,657 | 350,000 | **OBSERVED, byte-identical to the estate series** |
| Chilled Salmon | 2026-04-17 → **2026-07-15** | 90 | **47,040** | 47,040 | MODELLED |
| Premium Bakery | 2026-06-12 → **2026-09-09** | 90 | **26,040** | 26,040 | MODELLED |

Each reproduces byte-identically across runs. The two modelled histories differ by exactly the ratio
of their declared bases. Both carry a real weekly rhythm rather than a flat line. Provenance
declares `MODELLED_FROM_DECLARED_SCENARIO_TERMS` and states in words that this is **not observed
retailer data**.

### 2.5 Why the protected journey is untouched

Fresh Dairy takes the OBSERVED path, so its dataset is the same object it always was — asserted
byte-identical, not assumed. Its run rate is the mean of the same 21 days (**49,999.71/day**), which
is what every published Demand figure is a mean or a ratio of.

---

## 3. Promotion — the same engine certification uses

### 3.1 The cause, and why the obvious fix was the wrong one

`PromotionPlanner.tsx` opened on the literal `'ARCH-CHILLED-ELASTIC'`.

Pointing it at the active scenario's own archetype would **not** have fixed it. An archetype's
seeded economics are its own:

| | archetype `ARCH-PREMIUM-ARTISAN` | certified `SCN-BAKERY-SOURDOUGH-003` |
|---|---|---|
| depth | 15% | committed 10% |
| demand uplift | +12.0% | +7.68% at 10% |
| contribution | −£1,850 | −£641 at 10%; best is **£0 at 0%** |

Serving the first under the second's identity is two economic models for one scenario — the defect
ADR-073 and ADR-080 exist to prevent.

### 3.2 What was built

`scenarioArchetypeProjection(scenario)` is ADR-077 part 2 in code — *"an archetype supplies
elasticity, cannibalisation, plays and narrative, and it no longer supplies a second population,
price basis or estate"*:

| from the ARCHETYPE | from the SCENARIO |
|---|---|
| headline, confidence, tension prose, waterfall driver set, opportunity regions, play shapes | SKU, category, price, cost, estate, depth, duration, region, elasticity, cannibalisation |
| | **the curve, and therefore the recommendation** |

**The curve is `scenarioElasticityCurve` — the same function the Scenario Certification Gate
evaluates `C-6` with.** There is no second derivation, no scenario-specific branch, no post-hoc
rewriting of an output, no hash multiplier and no hidden calibration.

The demand waterfall's price line and net are solved against that curve, so the decomposition adds
up to what the chart beneath it says — asserted per scenario, within 0.15pp.

### 3.3 Measured, on the running product

| | committed | uplift | **derived recommendation** |
|---|---|---|---|
| Fresh Dairy | 20% | +44.16% | **14%** |
| Chilled Salmon | 10% | +20.9% | **10%** — already the best point on its own curve |
| Premium Bakery | 10% | +7.68% | **0% — do not promote** |

Each is the contribution maximum on its own curve, asserted as the maximum rather than as a flag.

---

## 4. Campaign Decision — the opening context is the active scenario's

### 4.1 The cause

The server-side draft was already correct: `createDefaultCampaignIntentDraft` has resolved through
`scenarioInScope()` since `SCI-03`. The **surfaces** read `CANONICAL_*` directly.

Those reads are layer B — the protected reference bound by name — and a surface is not entitled to
them, because a surface serves whichever scenario the reader selected.

### 4.2 What changed

Nine reads across `CampaignDecisionCanvas`, `CampaignDiscoveryHero`, `DemandIntelligenceLens`,
`Forecasting`, `DecisionRippleIntelligence`, `InterventionWorkspace` and `InverseAnalysisLens` now
resolve the scenario in scope. No second Campaign scenario state was created; the human-decision and
causal-governance model is untouched, and the decision still opens `UNDECIDED`.

### 4.3 Measured

| | opening context |
|---|---|
| Fresh Dairy | Cheddar Mature 400g · National, 14 days |
| Chilled Salmon | Atlantic Salmon Fillet 300g · National, 14 days |
| Premium Bakery | White Sourdough 800g · London, 7 days |

---

## 5. The guard, so this class fails a test rather than a browser

`R-35` was invisible to every existing test because each was exercised with **one** scenario active,
and a surface bound to `CANONICAL_*` is indistinguishable from a correct one until a second is
selected. A test that merely switches scenarios would still miss a surface nobody thought to open.

`run-sci03r-perspective-tests.ts` §6 asserts the **property** instead, over every `.tsx` under
`components/` and `app/`:

- no decision surface binds the protected reference instance by name;
- no surface names an archetype by string literal;
- no surface compares a scenario identity against a literal;
- the demand path fits the active scenario's dataset and never opens a demo file itself.

`canonical*` and `CANONICAL_SCENARIO` are **not** deprecated — they are layer B, and the archetype
catalogue, the certification fixtures and the reference-instance tests are entitled to them. Two
surfaces are exempted by name with a stated reason. An entry added there is a decision, not a
convenience.

---

## 6. Certification, unchanged gate

| | C-1 … C-12 | checks | `NOT_APPLICABLE` | state |
|---|---|---|---|---|
| `SCN-FRESH-DAIRY-CHEDDAR-001` | 12/12 PASS | 84 | 0 | **CERTIFIED** |
| `SCN-CHILLED-SALMON-002` | 12/12 PASS | 84 | 0 | **CERTIFIED** |
| `SCN-BAKERY-SOURDOUGH-003` | 12/12 PASS | 84 | 0 | **CERTIFIED** |

Every result admissible under `validateCertificationResult`. **The gate was not altered to
accommodate the repair** — no check relaxed, removed or made conditional.

---

## 7. The protected reference scenario

| | value |
|---|---|
| 20% depth | **+44.16%**, **−£5,167** |
| 14% depth | **+33.65%**, **+£32,976** |
| Demand base / expected / servable | **699,996 / 900,125 / 769,996** |
| history | the observed estate series, asserted byte-identical |
| opening decision position | bit-identical to the retired constant |

No hash-era value (46.8%, £8.1K, £43.5K) appears on any surface. Verified on the running product at
all three widths, including after switching away and back.

---

## 8. Tests

**47 runners, each accounted for individually. 46 fully green. 3,433 assertions passed.**

New: `run-sci03r-perspective-tests.ts` — **130 assertions**, six sections, covering each Demand
history, reproducibility, the three recommendations, the three Campaign contexts, switching, reset,
certification, frozen contracts and the source guard.

### `R-25`, separated

`run-atl06b-tests`: **132 passed, 1 failed** — `A6b`, which expects `@google/genai` to be absent
although the governed Google AI implementation uses it. Unchanged from baseline, untouched here, and
**the only `[FAIL]` line in the entire estate**.

### One assertion repointed, and why it is not a weakening

`run-fm01-tests` `R-01` matched the literal `buildForecastDataset`, and the demand path now consumes
`buildScenarioForecastDataset`. The property it asserts — a governed `ForecastDataset`, never a demo
file opened directly — is unchanged and is now asserted against the symbol that carries it, **with
the scenario binding asserted alongside it**, so a drift back to the raw estate series fails there
too.

---

## 9. Browser acceptance

**Docker is NOT claimed.** Attempted again and narrowed further: the daemon starts
(`Server Version: 29.3.1`), `/etc/docker/daemon.json` was pointed at this session's live proxy, and
the manifest resolves — then blob fetches are refused **`403 Forbidden` from
`production.cloudfront.docker.com`** by the environment's egress policy. The blocker is the blob CDN
alone.

**Strongest available topology, and the same one Gate B used:** the standalone production server
(`.next/standalone/server.js`, the exact artefact the image would run) with
`COGNIX_WORLD_MODE=service` against the real `cognix-world` domain service over HTTP. Driven in
Chromium at **1440 / 1024 / 720**.

The governed sequence was driven through the real selector at every width — Fresh Dairy → Chilled
Salmon → Premium Bakery → **back to Fresh Dairy** — inspecting Demand, Promotion and Campaign
Decision at each step, plus signals, Observability & Governance and Restart.

**258 checks, 0 failures.**

| width | scenario | Demand base | Promotion | Campaign Decision |
|---|---|---|---|---|
| 1440 / 1024 / 720 | Fresh Dairy | **699,996** | 20% → +44.16%, rec **14%** | Cheddar Mature 400g · National, 14 days |
| 1440 / 1024 / 720 | Chilled Salmon | **95,400** | 10% → +20.9%, rec **10%** | Atlantic Salmon Fillet 300g · National, 14 days |
| 1440 / 1024 / 720 | Premium Bakery | **26,518** | 10% → +7.68%, rec **0%** | White Sourdough 800g · London, 7 days |
| 1440 / 1024 / 720 | back to Fresh Dairy | **699,996** | rec **14%** | Cheddar Mature 400g · National, 14 days |

No stale product, supplier, region, horizon, economics, history or recommendation at any step.
Restart on Premium Bakery keeps it active and restores **10% / 7 days / regional** — its own opening
position. No horizontal overflow, no 5xx, no page errors at any width.

Two things were confirmed **not** defects, having first been flagged by the harness: the Promotion
SKU and archetype dropdowns list every selectable option, which is the reader's comparison library
(ADR-077 part 2) rather than stale state — the *selected* values follow the active scenario; and the
bakery's Demand narrative takes the executable-capacity branch rather than the allocation-shortfall
one, because its demand sits inside its capacity.

---

## 10. `R-30` is NOT closed

Deterministic scenario history is a **demand history the forecast pipeline fits**. `R-30` is a
per-scenario **evidence series** over `T-90 … T+30` under `SCI-05`'s Refresh contract, carrying
`ScenarioAsAtMarker`, `RefreshDelta`, materiality and decision relevance. Different artefact,
different contract, different owner.

The retired `temporal_evidence` field was **not** restored, recreated or synthesised.
`scenarioTemporalEvidence()` remains exported and unchanged so the evidence for its retirement
survives. **`R-30` remains open and remains `SCI-05`'s.**

What `SCI-03R` does establish, recorded because it is useful to its owner: a scenario's declared
terms are sufficient to derive a deterministic, reproducible, clock-aligned series without inventing
anything. That is an input to `R-30`'s eventual solution, not a discharge of its scope.

---

## 11. Frozen contracts

Byte-identical to the Gate-B state (`b9880f7`), verified by blob hash:

| contract | hash |
|---|---|
| `canonical-scenario-model.ts` | `a56c56ab` |
| `scenario-clock.ts` | `8e68e22c` |
| `scenario-registry.ts` | `986cf15f` |
| `provenance-vocabulary.ts` | `74129f5b` |
| `scenario-certification-model.ts` | `e58e2cae` |
| `living-evidence-contracts.ts` | `65e9b7f0` |

**No frozen contract was changed, and no contract defect was found.** The three `SCI-05` contracts
remain declaration-only and singly owned, enforced by `run-gate-a-tests` §§1–3.

---

## 12. Residuals

| id | state |
|---|---|
| **`R-35`** — decision perspectives publish the reference scenario's economics | **CLOSED by this packet.** §§2–5 |
| **`R-36`** — the Demand promotion adjustment is a generic function of depth | **OPENED.** §12.1 |
| `R-25` — stale `ATL-06B` `A6b` | Untouched. Still the only failing assertion in the estate |
| `R-26` — CDI-03 scores from a name hash | Untouched. Not in scope |
| `R-28` / `R-32` — `cognix-world` is not gate- or activation-aware | Untouched. Mitigated in the BFF at Gate B |
| `R-29` — stale `skuContextFactor` comment | Untouched |
| `R-30` — family temporal series contradicts certified records | **Open, `SCI-05`'s.** §10 |
| `R-34` — sidebar footer below a ~900px viewport fold | Untouched. Pre-existing, unassigned |

### 12.1 `R-36`, found while proving `R-35` closed

`declareScenarioAdjustment` computes the forward promotion factor as `1 + promoLift / 100` — a
generic function of depth that takes no account of the scenario's declared elasticity. Measured on
the running product against each record's own declared `COMMERCIAL_INTENT` attribution:

| | declared | published on Demand |
|---|---|---|
| Fresh Dairy | 19.6pp / 28.59% | **+19.6pp / +28.6%** |
| Chilled Salmon | 20.9pp / 26.4% | **+9.6pp / +6.0%** |
| Premium Bakery | 7.7pp / 11.2% | **+9.6pp / +5.9%** |

It agrees with the reference scenario because it was calibrated to it — the same shape of defect
ADR-079 recorded when it retired `skuContextFactor`: *"the two surfaces agreed at exactly one scope
by arithmetic coincidence."*

**Not fixed here, deliberately.** The honest correction is to derive the factor from the scenario's
declared depth response, and at the reference scenario that moves `+28.6%`, `900,125`, `769,996` and
`130,129` — the values §6 of the repair directive protects absolutely and
`COGNIX_PRESENTATION_SYNC_DELTA.md` §1 pins. It also touches the Promotion two-model seam ADR-075
bounded rather than closed, which is a governed boundary and not a merge decision.

It is therefore raised for an owner rather than absorbed. It does **not** hold the Gate-B
cross-surface condition: the perspectives now consume the active scenario's identity, history,
population, economics and recommendation, and this is a further quantity within the Demand
perspective that is calibrated rather than derived.

---

## 13. Boundaries observed

| boundary | held |
|---|---|
| No frozen contract changed | Six blob hashes identical. No contract defect found |
| Certification not weakened | No check relaxed, removed or made conditional; three scenarios, 12/12, 84 checks, zero `N/A` |
| No second scenario model | One registry, one record, one curve, one certification gate |
| `SCI-04`'s UX preserved | The selector, the context strip and the visual language are untouched. The only component changes are scenario-binding defects |
| `R-30` not closed | §10 |
| No Wave-2 work | `living-evidence-contracts.ts` untouched; no materiality, relevance or Refresh behaviour built |
| Scope | `R-35` and the Gate-B condition only |
| Merge | None. Nothing merged to production or into `feature/cognix-enterprise-demo-hardening` |
