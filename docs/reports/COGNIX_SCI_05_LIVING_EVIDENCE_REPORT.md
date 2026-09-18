# CogniX `SCI-05` — Living Evidence: Materiality, Decision Relevance & Refresh (`ESF-4`)

**Status:** Delivered.
**Date:** 17 September 2026.
**Base:** `cacbb5b364ad6dcab841f7e8bb96557a44054a49` — HEAD of
`feature/cognix-sci-03r-scenario-perspective-binding`, the Wave-2 base, which carries
**SHA-B `e0a9c23ddaa0f3c20d0b8b70bd41c1e657546aaf`** and Gate B **PASSED**.
**Branch:** `feature/cognix-sci-05-living-evidence`. Not merged.
**Decisions applied:** ADR-081 (parts 1–5) · ADR-072 · ADR-078 · ADR-082 · ADR-067 · ADR-044 · ADR-084.
**Reactivates:** `ESF-4`.

---

## 1. What was delivered

`signal → material change → decision relevance → observable decision consequence`, as a computation.

The three contracts **declared and frozen at Gate A** are implemented **without redefining a single
shape**. All six frozen contract files, `living-evidence-contracts.ts` included, are byte-identical
to the Wave-2 base.

ADR-081's context records that the engine for a meaningful Refresh already existed and that the
Observability surface simply did not call it. That stayed true: nothing here is new machinery.
`simulateEnterpriseSignalTimelines`, `evaluateForecastStability`, the Decision Window's own deadline
derivation and the scenario clock are reused, not rebuilt.

---

## 2. `R-30` — the evidence timeline, through the governed architecture

### 2.1 Why it was still open

`SCI-03` retired the legacy world-family `temporal_evidence` because two of three certified packs
contradicted their family's series in **direction** as well as scale. `SCI-03R` added deterministic
demand **histories** and correctly left `R-30` open: a forecast history is what a statistical model
is *fitted to*, not the evidence timeline a decision is *revised by*.

### 2.2 What it took, and what it exposed

The successor is per-scenario timelines from `ESF-2`'s own simulator, on each scenario's own clock,
with per-observation provenance naming the rule and the drivers. Nothing legacy is restored,
rescaled or consulted — asserted against both `/api/v1/scenarios` implementations.

Getting there meant fixing the **simulator**, which `SCI-03` had no reason to run because nothing
called it until Refresh did. It carried exactly the defect `SCI-03` removed from the signal
**generator**: one branch for `promotion_surge`, and a fallback of literal lead times —
`24, 28, 36, 42, 46, 48, 52, 60, 36, 24` against a baseline of `24` — belonging to no scenario.

Both curated packs received **the same single timeline, with the same numbers**, and its provenance
declared `breach_family: 'supplier_breach'` over a bakery decision.

The reference branch carried retired-estate literals of its own: `baselineCap = 48000`,
`flexUnits = 7000`, and `7.0` / `3.8` days of cover — the 50-store estate `DEMO-HARD-01` retired,
sitting in the reference scenario's evidence while its record declares 350,000 units a week at an
allocation index of 1.10. The supplier **name** had been migrated at `R-20`; the quantity beside it
had not.

### 2.3 Measured

| | timelines | signal types |
|---|---|---|
| `SCN-FRESH-DAIRY-CHEDDAR-001` | 4 | search velocity · basket adds · supplier capacity · stock cover |
| `SCN-CHILLED-SALMON-002` | 3 | supplier lead-time drift · supplier capacity · stock cover |
| `SCN-BAKERY-SOURDOUGH-003` | 5 | competitor launch · perishable ageing · supplier capacity · stock cover · margin compression |

Each family now carries the set `SCI-03` established in the generator. Every **amplitude** is read
from the record; only the **shape** a pressure signal follows over the horizon is declared, which is
ADR-073 rule 4 — *behaviour may be seeded, economics must be derived* — and it is declared once, in
one constant, rather than per family.

Every timeline is stamped on its own clock (`2026-06-03` / `2026-07-15` / `2026-09-09`), spans the
full declared period range, carries provenance on every observation, and reproduces byte-identically.
The three signatures are three different sets, asserted.

**`R-30` is CLOSED.**

---

## 3. `R-36` — one governed attribution source, not another calculation seam

### 3.1 It was two seams, not one

The commercial-intent effect was reconstructed as `1 + promotion_depth / 100` in **two independent
places**: `lib/demand-forecast.ts` applied it to the model's forward expectation, and the demand
frontier **divided it back out** to recover the baseline. Neither read the scenario.

Fixing only the first would have been **worse than fixing neither** — the projection would have
applied the declared contribution while the frontier divided out a generic one, and the difference
between two wrong halves would have surfaced as the promotion attribution.

`packages/contracts/src/scenario-demand-attribution.ts` is therefore a module, not two edits. Both
sides call one function, which reads `demand.movement_attribution` — the declaration the
certification gate reconciles `C-5` against.

### 3.2 Measured, on the running surface

| | declared | before | after |
|---|---|---|---|
| Fresh Dairy | 19.6pp | 19.6pp | **+19.6pp** |
| Chilled Salmon | 20.9pp | 9.6pp | **+20.9pp** |
| Premium Bakery | 7.7pp | 9.6pp | **+7.6pp** |

Away from the committed depth the contribution scales by the scenario's **own** declared
depth-response curve — the one the gate evaluates `C-6` with, anomalies included — never by a generic
elasticity. At zero depth it is zero.

### 3.3 The reference scenario is unchanged by arithmetic, not by exemption

Its governed factor is exactly **`1.200000`**, the value the retired generic formula produced, because
19.6pp against its declared −2.0pp trend is 0.2 exactly. The record was authored coherently. This is
asserted, not assumed.

A second correction was needed to get there: the borrowed category shape in `SCI-03R`'s modelled
histories carried the **category's own drift** on top of the declared trend, so the salmon pack's
declared −2.5pp was being published as +6.4pp. The shape is now de-trended before the declared trend
is applied — the rhythm is borrowed, the direction is the scenario's.

**`R-36` is CLOSED as scoped.** §9 records `R-37`, a distinct and newly visible matter.

---

## 4. Materiality — derived, never authored

Every published quantity is computed **twice**: once with the whole body of evidence, once with the
observation removed. The difference **is** the materiality (ADR-081 part 4). There is no seeded
materiality, and it is asserted that no scenario record carries a field that could set one.

It is a **BAND** over a published movement, never a score — ADR-072 and ADR-081 part 5 forbid a third
number beside the `confidence` and `quality` `ESF-1` already carries. The thresholds are exported as
a declared constant so a reader can check the classification against the arithmetic it classifies. A
movement that changed a decision is `DECISIVE` whatever its size.

Both endpoints and the unit are carried on every movement, so it can be checked against the surface
that published it; a movement from zero publishes `null` rather than `Infinity`.

---

## 5. Decision relevance — a different question from movement

The decision artefacts are re-evaluated under both bodies of evidence and compared. A
**high-confidence observation that moves nothing is decision-irrelevant**, and that is asserted
directly — confidence is not relevance.

`RECOMMENDATION` and `DECISION_WINDOW` are genuinely derived. `READINESS_VERDICT` needs a
**REGISTERED** campaign intent, which a scenario does not have until a reader creates one; where
there is none the statement says so rather than reporting `NONE` as though it had been checked.

Where nothing changed, *"the recommendation is unchanged"* is said plainly. That is an answer, not a
blank.

---

## 6. Refresh — a scenario operation, not a fetch

Advances the as-at marker **one** `SimulationPeriod` on the scenario clock, re-evaluates, and
publishes the delta with its mandatory `decision_consequence_statement`.

**Evidence movement is isolated from the passage of time.** Both bodies of evidence are evaluated at
the *same* marker, so the only difference between them is the evidence. Evaluating the old evidence
at the old marker would have credited evidence with the Decision Window shortening because a day
passed. The advance is already published, as `from` and `to`.

**Supply evidence moves the supply side.** `DDF_STABILITY_SIGNAL_TYPES` is `DDF-01`'s declaration of
which signals revise a *demand* forecast, and it is deliberately demand-side. Routing a lead-time
drift through it would have been the quickest way to make every scenario's Refresh look busy, and it
would have meant a supplier's lateness silently editing a demand forecast. What lateness genuinely
changes is how much volume can be served *inside the horizon*, and that is the arithmetic used.

Measured at the first advance, `Today → T+1`:

| | material movements | leading movement | decision |
|---|---|---|---|
| Fresh Dairy | 6 | Exposed demand 181,437 → 191,339 units (+5.46%) | unchanged |
| Chilled Salmon | 5 | Servable demand 86,137 → 85,166 units (−1.13%) | unchanged |
| Premium Bakery | **0** | — | unchanged |

**"No material change" is a valid outcome and is reported as one.** The bakery pack's advance says
so in words. ADR-081 part 3 forbids movement whose only purpose is to make the interface look alive,
and nothing here manufactures a change to fill a delta. A Refresh at the end of the timeline advances
nothing and says that too.

**Restart** returns the marker to its opening position exactly, and the same advance then reproduces
the same delta — the demonstration is repeatable.

---

## 7. Models & Methods — only what actually runs

Nine entries for a scenario, composed from `lib/forecast/registry.ts` (read-only) and the
deterministic engines this estate genuinely runs, in the governed ADR-082 vocabulary:

| mechanism | entries |
|---|---|
| `statistical` | the two registered forecast models, read from their own declarations |
| `rule` | scenario derivations · promotion depth-response curve · Living Evidence engine · Certification Gate · evidence simulator |
| `measured` | the seeded demand history |
| `manual` | the human decision — a mechanism, and leaving it out would imply otherwise |
| `llm` | **only where a provider credential is configured** |

With no credential configured, GenAI is **not** listed as active. It appears in `undescribed` with
its reason, which is the `ATL-FINAL` discipline of declaring unmeasured rather than reporting
something that was not earned. No ML model is claimed where none ran.

Every entry names its implementation file so the claim is checkable, and publishes what it is **not**
so nothing is inferred from silence. ADR-067 holds: no prompt, token, temperature or model identifier
is published, and the contract has no field that could carry one — verified by scanning the
serialised register.

---

## 8. Evidence

### 8.1 Protected values

| | value |
|---|---|
| Demand base / expected / servable | **699,996 / 900,125 / 769,996** |
| Total movement | **+28.6%** |
| Declared expected / servable / exposed | 900,130 / 770,000 / 130,130 |
| Revenue / margin exposure | £269,369 / £80,681 |
| Depth response at the committed 20% | **+44.16pp** |
| Contribution at the committed 20% | **−£5,167** |
| Governed commercial-intent factor | **exactly 1.200000** |

### 8.2 Certification — the gate was not altered

| | dimensions | checks | `NOT_APPLICABLE` | `C-4` signals | state |
|---|---|---|---|---|---|
| `SCN-FRESH-DAIRY-CHEDDAR-001` | 12/12 PASS | 84 | 0 | PASS | **CERTIFIED** |
| `SCN-CHILLED-SALMON-002` | 12/12 PASS | 84 | 0 | PASS | **CERTIFIED** |
| `SCN-BAKERY-SOURDOUGH-003` | 12/12 PASS | 84 | 0 | PASS | **CERTIFIED** |

### 8.3 Tests

**48 runners, each accounted for individually. 47 fully green. 3,633 assertions passed.**

New: `run-sci05-living-evidence-tests.ts` — **200 assertions**, eight sections covering the evidence
timeline, `R-30`, `R-36`, Refresh determinism, Restart, materiality, decision relevance, the
register, protected values, certification, contract drift and timezone invariance.

Determinism is asserted three ways: byte-identical timelines, byte-identical Refresh deltas across
Restart, and a Refresh byte-identical under `UTC`, `America/New_York` and `Asia/Tokyo` — the `D-FM-3`
precedent. No `Math.random`, no wall clock in the engine.

#### `R-25`, separated

`run-atl06b-tests`: **132 passed, 1 failed** — `A6b`, which expects `@google/genai` to be absent
although the governed Google AI implementation uses it. Unchanged from baseline, untouched here, and
**the only `[FAIL]` line in the entire estate**.

#### Two assertions repointed, neither relaxed

`run-esf2-tests` Test 6 pinned `flex_capacity === 7000`, the retired-estate count, internally
consistent with the `48000` beside it and with nothing the record declares. It now asserts the
scenario's **declared** flex share, which is stronger.

`run-gate-a-tests` §3 asserted that **nothing** implements these contracts — correct while Wave 1 was
being cut, and now correctly firing because Gate B passed and Wave 2 authorised exactly this. It now
asserts that **exactly one** module implements them and that it is `SCI-05`'s, which is the singular
ownership the contract was always protecting. At SHA-A nothing implemented them, and `git show
8d6d960` still shows that.

### 8.4 Runtime

**Docker is NOT claimed.** Attempted again with the daemon started and `/etc/docker/daemon.json`
pointed at this session's live proxy: the daemon runs (`Server Version: 29.3.1`) and the registry now
refuses at the **manifest** with `429 Too Many Requests` from `registry-1.docker.io`, on top of the
`403 Forbidden` from `production.cloudfront.docker.com` recorded at Gate A and Gate B.

**Strongest available topology:** the standalone production server against the real `cognix-world`
domain service over HTTP. Living Evidence verified for all three scenarios through
`GET /api/v1/evidence`, `POST /api/v1/evidence/refresh`, `POST /api/v1/evidence/restart` and
`GET /api/v1/methods`. Two Refresh runs after Restart hash identically. A request naming no scenario
is refused `400` on both read routes (ADR-077 part 4).

**Browser presentation is `SCI-06`'s and belongs to Gate C.** None was attempted or claimed.

---

## 9. Residuals

| id | state |
|---|---|
| **`R-30`** — family temporal series contradicts a certified record | **CLOSED by this packet.** §2 |
| **`R-36`** — the demand attribution seam | **CLOSED as scoped.** §3 |
| **`R-37`** — a declared attribution with no evidence carrier | **OPENED.** §9.1 |
| `R-25` | Untouched. Still the only failing assertion in the estate |
| `R-26` · `R-28` · `R-29` · `R-32` · `R-34` | Untouched. Not in scope |

### 9.1 `R-37`, found while proving `R-36` closed

The commercial-intent seam is closed, and the surface now publishes each scenario's declared
contribution. The declared **total** still reconciles only for the reference scenario:

| | declared total | published |
|---|---|---|
| Fresh Dairy | 28.59% | **+28.6%** |
| Chilled Salmon | 26.4% | +18.1% |
| Premium Bakery | 11.2% | +4.2% |

The gap is the `OBSERVED_BEHAVIOUR` component, and the cause is precise: that component reaches the
surface through `forecast_stability.expected_revision_pct`, which `DDF-01` declares is driven by
demand-side signal types only.

| | declared `OBSERVED_BEHAVIOUR` | signal types that revise a forecast |
|---|---|---|
| Fresh Dairy | 10.9pp | search velocity, basket adds |
| Chilled Salmon | 8.0pp | **none** |
| Premium Bakery | 5.1pp | **none** |

Both curated packs declare observed customer behaviour and carry no signal that can convey it. **Not
fixed here, deliberately.** The two available routes are authoring a demand-side signal for those
packs — scenario content, `SCI-03`'s, and this packet's non-scope is explicit that it adds **no new
signal types** — or widening `DDF_STABILITY_SIGNAL_TYPES`, which is `DDF-01`'s contract and not
`SCI-05`'s to change unilaterally. Raised for an owner rather than absorbed.

---

## 10. Boundaries observed

| boundary | held |
|---|---|
| Contracts implemented, never redefined | Six frozen files byte-identical to the Wave-2 base. No contract defect found, so no Gate-level escalation was needed |
| No `SCI-06` UI | No component, no page, no styling. Observability & Governance, Evidence & Signals, Models & Methods, Platform Health and Decision Trace presentation are untouched |
| No `SCI-07` drafting | No scenario authoring, no GenAI draft path introduced |
| Google GenAI | Provider architecture unchanged. Server-side `GEMINI_API_KEY` only, no new provider, no client-side key path. The register publishes truthful method metadata and nothing more |
| No third confidence score | ADR-072 and ADR-081 part 5 asserted by source guard |
| No new signal types | The families use the types `SCI-03` established |
| Certification not weakened | No check relaxed, removed or made conditional; `C-4` green for all three |
| Determinism | No `Math.random`, no civil time in the engine, timezone-invariant |
| Merge | None. Nothing merged to production or into any convergence branch |
| Gate C | **NOT passed, and not claimed.** Convergence not started |

---

## 11. Gate-C handoff

`SCI-05` provides the domain and API behaviour `SCI-06` consumes, and holds no presentation:

| route | publishes |
|---|---|
| `GET /api/v1/evidence?scenario_id=` | the timelines, the as-at marker, and a preview of what the next advance would change |
| `POST /api/v1/evidence/refresh` | the `RefreshDelta`, exactly as the contract declares it |
| `POST /api/v1/evidence/restart` | the as-at marker returned to its opening position |
| `GET /api/v1/methods?scenario_id=` | the `MethodsRegister` |

A worked Refresh delta for all three scenarios is in §6. `SCI-06` renders these and recomputes no
part of them — a second materiality computation beside the engine would be two answers to one
question, which the Gate-A ownership guard now asserts against.
