# `SCI-01` — Scenario Contract, Clock, Registry & Provenance Foundation

**Status:** `[COMPLETED]` 2026-09-16.
**Class:** FOUNDATION · Wave 0 · single-lane by construction (ADR-084 part 3).
**Base SHA:** `b5bf1bd94cc37e77e4f707e111509394b4b0e02e` on `feature/cognix-enterprise-demo-hardening`
— the commit that authorised the `SCI` programme.
**Branch:** `feature/cognix-sci-01-scenario-contract`.
**Decisions implemented:** ADR-073 Amendment A · ADR-077 · ADR-078 · ADR-079 · ADR-082.
**Residuals closed:** `R-19` · `R-20` · `R-21` · the `ADR-075` bounded-divergence residual.
**Residual opened:** `R-26`.

---

## 1. What this packet was for

The estate held **three** scenario concepts and they disagreed. `CanonicalScenario` carried the
hardened economics at 227 call sites. `ENTERPRISE_WORLD_SCENARIOS` carried six families still priced
on the retired estate. `CampaignArchetype` carried seven commercial situations. The consequence was
visible on a governance surface: the Observability & Governance signals panel asked for signals
without naming a scenario, the route defaulted to `SCN-PROMO-01`, and the panel published
`SUPPLIER_CAPACITY_PRESSURE` against **FreshDirect UK** — a supplier the connected journey had
replaced with Cheshire Cheese Co, because a volume flex notice has to be served on whoever makes the
product.

The packet's job was to make `CanonicalScenario` the single scenario identity, give the scenario
authority over time, establish the registry through which scenarios resolve, and declare one
provenance vocabulary — **without moving a published value of the protected journey**.

## 2. The four contracts, ready for freeze at Gate A

| Contract | Where it lives | What a consumer gets |
|---|---|---|
| **Scenario Contract** | `packages/contracts/src/canonical-scenario-model.ts` | `CanonicalScenario` as an instantiable model with `taxonomy`, `differentiation` and an ADR-082 `provenance.descriptor`; derivations as `scenario*(scenario, …)`; the protected reference bound by name as `canonical*(…)` |
| **Scenario Clock** | `packages/contracts/src/scenario-clock.ts` | `scenarioNowIso`, `scenarioDateIso`, `scenarioPeriodInstantIso`, `scenarioFreshnessDays`, `SIMULATION_PERIOD_DAY_OFFSETS`, and `platformReceiptNowIso` for the civil-time cases ADR-078 part 2 keeps |
| **Scenario Registry & Activation** | `packages/contracts/src/scenario-registry.ts` | `ScenarioRegistryEntry` (the catalogue shape `SCI-04` builds against), `resolveScenario`, `requireScenarioId`, `activateScenario`, `getActiveScenario`, `scenarioCatalogue`, and `setScenarioActivationPolicy` — the seam `SCI-02` installs the certification gate into |
| **Provenance Vocabulary** | `packages/contracts/src/provenance-vocabulary.ts` | `origin` / `method` / `authority`, mapping functions from all five existing enums, `describeProvenance`, and `validateProvenanceDescriptor` |

### 2.1 Two design decisions worth stating, because a reviewer will ask

**Why the derivations come in two layers.** ADR-073 Amendment A requires the derivations to become
functions of a scenario. Rewriting 227 call sites to pass a scenario would have been a large
mechanical diff across every connected surface, and the risk it carried was precisely the one the
packet had to avoid: a single transcription error moving a protected value. So layer A
(`scenarioBaseDemandUnits(scenario, …)`) is the model, and layer B (`canonicalBaseDemandUnits(…)`)
binds the protected reference by name at exactly one place per quantity, in the contract module
itself. `SCI-02`'s harness reads layer A with whatever scenario it is certifying; the connected
journey reads layer B unchanged. That is why §1 and §2 reconcile to the digit.

**Why declared activation is not the defaulting ADR-077 part 4 forbids.** The registry holds one
demo-active scenario, declared once in the catalogue. What part 4 forbids is a REQUEST acquiring a
scenario silently at the edge — a per-route `|| 'SCN-PROMO-01'`, which is how the estate came to
publish two suppliers for one decision. A caller that needs the active scenario asks for it by name;
a caller that supplies one gets that one or an error. Neither path guesses.

## 3. What changed, by rule

### 3.1 One scenario identity (ADR-077, `R-20`)

Four defaulting sites were removed, not one — correcting a single literal would have left the shape
of the defect in three other places:

| Site | Was | Now |
|---|---|---|
| `app/api/v1/signals/route.ts`, `…/current/route.ts` | `searchParams.get('scenario_id') \|\| 'SCN-PROMO-01'` | `resolveScenarioForRequest()` → `HTTP 400` naming the missing parameter |
| `services/world/src/server.ts` | the same rule, behind the proxy, where the signal was actually generated | `requireScenarioId()` → `HTTP 400` |
| `lib/decision-state-store.ts` | every session opened on `SCN-PROMO-01` / `promotion_surge`, with three constraint literals naming FreshDirect UK at 48,000 units a week | the registry's active scenario; constraints derived from its supply and economics |
| `lib/campaign-archetypes.ts` | minted `SCN-${archetype.id}` — a THIRD source of scenario identity, resolving to nothing | the scenario's identity, with the archetype recorded as `decision_context.archetype_id` |

`ScenarioFamilyId` and the archetype are now `taxonomy` on the scenario record. The world seed's
`baselineMetrics` are retired as an economic authority; its `temporalData` survives as a scenario's
declared evidence through `scenarioTemporalEvidence()`. `/api/v1/scenarios` publishes the registry
catalogue. The two dead duplicate copies of the world model under `lib/` were deleted — they had no
consumers and existed only as a second copy of the retired economics.

### 3.2 The scenario clock (ADR-078, `R-19`)

Every deterministic scenario observation now resolves through the clock. Each generated signal
declares an `observed_period` and an `effective_period`, and both timestamps come from
`scenarioPeriodInstantIso`. Civil time is retained exactly where ADR-078 part 2 puts it — server
receipts and envelope timestamps — and is taken through a named `platformReceiptNowIso()` so a
deliberate use reads as deliberate.

Measured against the running application: two consecutive `GET /api/v1/signals` reads are
byte-identical including `observed_at` and `effective_at`; the panel states *"as at 2026-06-03
(scenario time, not the wall clock)"*; a `T-7` observation is dated `2026-05-27` and is therefore
seven scenario days old on any machine, in any timezone.

### 3.3 Declared differentiation (ADR-079, `R-21`) — and the finding it exposed

`skuContextFactor` and `hashSeed` are gone. `CanonicalScenario.differentiation` declares scope
multipliers with mandatory reasons — **the canonical scenario declares none** — and depth-response
anomalies with theirs.

**The substantive finding of this packet.** The seeded elasticity curve had been calibrated against
the causal engine *with the hash applied*:

```
record declares          2.4pp per point of depth, 8% cannibalisation
net per point            2.4 x (1 − 0.08)                        = 2.208pp
curve carried                                                      2.34pp
2.34 / 2.208                                                     = 1.06
hashSeed('P004::National') % 13 / 100 + 0.94                     = 1.06
```

The curve and the engine therefore agreed at exactly ONE scope — `"National"` — by arithmetic
coincidence, and diverged by up to six per cent everywhere else. The `ADR-075` bound the canonical
suite asserted was measuring that coincidence rather than a modelled difference.

ADR-079 part 3 anticipated this: *"If it does not, the seam is larger than the hash and that is a
finding worth having."* The curve is now derived from the record's declared terms, the engine reads
the same terms, and §8 asserts exact equality at every scope with the remaining divergence attributed
to named design components.

### 3.4 One provenance vocabulary (ADR-082)

Declared in three dimensions and mapped from all five existing vocabularies. **Nothing was rewritten
to satisfy it**, which is ADR-082 part 2 honoured rather than quoted. Two mappings are deliberately
not the obvious one and carry their reasoning in source: `SYNTHETIC_OBSERVED` maps to `modelled`
rather than `observed`, so `AC-DDF-25` cannot be undone through the vocabulary; and
`SEEDED_OBSERVATION` maps to `stated`, because ADR-073 rule 4 makes a seeded behaviour a declared
property rather than a reading. `validateProvenanceDescriptor` refuses `drafted` + `authoritative`,
so ADR-044's rule is enforced by the contract rather than remembered by each consumer.

## 4. Protected-journey reconciliation

Every value below was captured from the engines before any edit and re-measured after, then confirmed
in a browser at 1440 / 1024 / 720.

### 4.1 `COGNIX_PRESENTATION_SYNC_DELTA.md` §1 and §2 — **UNCHANGED TO THE DIGIT**

| Value | Before | After |
|---|---|---|
| Base demand (14d) | 699,996 | 699,996 |
| Expected demand | 900,125 | 900,125 |
| Servable demand | 769,996 | 769,996 |
| Exposed demand | 130,129 | 130,129 |
| Revenue exposed | £269.4K | £269.4K |
| Gross margin exposed | £80.7K | £80.7K |
| Decision Gap | 18.6pp | 18.6pp |
| Decision Window | 62h | 62h |
| Cost of choosing wrongly | £21.8K | £21.8K |
| Recovered by the flex notice | 84,000 units · £52.1K · £20.9K premium · 6.6pp residual | identical |
| Realised price / margin / implied cost | £2.07 / £0.62 / £1.45 | identical |
| Scenario clock · promotion window | 2026-06-03 · 04–17 June | identical |

### 4.2 §3.1 Promotion — **MOVED, under ADR-079, and recorded**

| Depth | Uplift before → after | Net contribution before → after |
|---|---|---|
| 5% | 11.7% → **11.04%** | +£21.9K → **+£17.5K** |
| 10% | 23.4% → **22.08%** | +£30.6K → **+£22.5K** |
| 14% (recommended) | 35.5% → **33.65%** | +£43.5K → **+£33.0K** |
| 20% (committed) | 46.8% → **44.16%** | +£8.1K → **−£5.2K** |
| 25% | 58.5% → **55.2%** | −£23.0K → **−£37.7K** |
| 30% | 70.2% → **66.24%** | −£67.4K → **−£82.7K** |

The curve's SHAPE is preserved — accretive shallow, peak at 14%, destructive deep — and 14% remains
the recommendation, now by a wider margin. The causal engine's price-depth response is **44.16 at
both national and regional scope**, where it was 46.81 and 42.84.

**The commercial consequence, stated plainly.** The committed 20% plan now reads as value-destroying
(−£5.2K) rather than mildly accretive (+£8.1K). A presenter should expect the question and the answer
is a strength: the platform found that its own promotion economics were being modified by a hash of a
product code and a region name, and retired it. Slides built between `DEMO-HARD-02` and `SCI-01`
carry the hash-inflated figure and must be updated.

## 5. Test results

**Baseline, measured at `b5bf1bd9` before any edit:** 42 runners (this record's own "44" had drifted;
corrected in the work-packet record). 41 fully green. `run-atl06b-tests`: 132 passed, 1 failed.

**After `SCI-01`:** 42 runners. 41 fully green. `run-atl06b-tests`: 132 passed, 1 failed.

| | Baseline | After | |
|---|---|---|---|
| `run-canonical-scenario-tests` | 243 / 0 | **260 / 0** | assertion count did not fall |
| `run-campaign-intelligence-tests` | 134 / 0 | 135 / 0 | |
| `run-signal-tests` | 6 / 0 | 10 / 0 | |
| every other runner | unchanged | unchanged | |
| `run-atl06b-tests` | 132 / **1** | 132 / **1** | **`R-25` only** |

**`R-25`, stated separately as the packet requires.** `run-atl06b-tests` assertion `A6b` asserts that
`package.json` gained no new provider dependency. `@google/genai ^2.17.1` is legitimately present and
is the primary call path in `lib/gemini.ts`. The assertion is stale; the code is not. It failed
identically on the pristine baseline and fails identically now — same runner, same assertion, same
counts. **`SCI-01` introduced no failure**, and did not touch the assertion or the Google SDK
dependencies, because SDK consolidation is explicitly out of `SCI` scope.

### 5.1 Assertions replaced rather than weakened

Four assertions encoded the hash and had to be re-derived. None was deleted or relaxed:

| Assertion | Was | Now |
|---|---|---|
| Canonical suite §8 | regional vs national depth response within a ±6% band (the band WAS the hash) | **exact equality** at every scope, plus every divergent point attributed to a named design component |
| `run-campaign-intelligence-tests` | "SKU change (P004 → P023) CHANGES the economics" — asserting the defect | "renaming the SKU does NOT move the economics", plus a new assertion that `"North West"` and `"Northwest"` price identically |
| `run-cdi06-tests` AC-11d | ambient drift pinned at 1.46 (= 1.5 × hash) | pinned at the declared **1.5** |
| `run-cdi06-tests` AC-15 | non-promotion uplift pinned at 9.07 (= declared 4.2 + 1.5, each × hash) | pinned at **9.2**, the sum of the declared values |

### 5.2 New source guards

Three, in `run-canonical-scenario-tests.ts` §11, because each of these defects was invisible to every
behavioural assertion in the estate — a route that defaults still returns valid signals, a civil-time
stamp still validates, a name hash is still deterministic:

1. **No literal scenario default on any route.**
2. **No civil time in deterministic scenario evidence** — scoped to `observed_at` / `effective_at`,
   because a blanket ban on `new Date()` would be wrong and would be switched off within a week.
3. **No hash-derived economic modifier** — scoped to what the hash BECOMES, since hashing a name into
   a stable identifier is correct and four engines rightly do it.

## 6. Browser acceptance

**The supported Docker path could not be used in this environment.** `docker compose -f
docker-compose.yml -f docker-compose.local.yml up -d --build` fails at image pull:
`production.cloudfront.docker.com` returns `403` under the session's egress policy. Reported rather
than worked around.

**What was done instead.** A production `next build` was served locally with
`COGNIX_WORLD_MODE=demo-fallback` and driven in Chromium at **1440 / 1024 / 720**, covering Demand,
Promotion, Campaign Decision and Observability & Governance. The gap this leaves is the
`cognix-world` service path: the domain service carries the same rule in its own code and compiles
clean, but it was exercised through the fallback rather than over HTTP.

| Check | Result |
|---|---|
| Observability signals panel | Scenario `SCN-FRESH-DAIRY-CHEDDAR-001` · **as at 2026-06-03 (scenario time, not the wall clock)** |
| Supplier on the signals panel | `SUPPLIER (Cheshire Cheese Co)`, 385,000 → 450,065 units/week |
| `FreshDirect UK` / `SCN-PROMO-01` in the payload | **absent** |
| Signal freshness | every signal shows its observed period — `T-7`, `T-3`, `T-2`, `T-1`, `Today` |
| Demand & Forecast | +28.6%, 900,125 / 769,996 / 130,129, £269.4K, £80.7K, 18.6pp, 62h, £21.8K — all unchanged; Cheshire Cheese Co named in the recommendation |
| Promotion | self-consistent on the corrected economics: headline 44.16%, live assessment **+47.9pp = +44.2pp price cut + 3.7pp design** — the two figures on one screen now agree exactly |
| Campaign Decision | opens on the canonical context: Cheddar Mature 400g, National, 14 days, P004, Dairy |
| `GET /api/v1/signals` with no `scenario_id` | `HTTP 400`, naming the parameter |
| `GET /api/v1/signals?scenario_id=SCN-PROMO-01` | `HTTP 400` — the identity is not registered |
| All three widths | same scenario identity and supplier |

One navigation note, pre-existing and not caused by this packet: below 1440 the sidebar collapses
into a drawer that does not scroll, so `Observability & Governance` sits below the fold at 1024 and
had to be activated through its handler rather than by pointer. It is a responsive-layout
characteristic of the shell; recorded here because it was observed, not fixed, because navigation
belongs to the Antigravity lane.

## 7. Files changed

**New (5):** `packages/contracts/src/provenance-vocabulary.ts` · `scenario-clock.ts` ·
`scenario-registry.ts` · `app/api/v1/_shared/scenario-request.ts` ·
`tests/fixtures/scenario/second-scenario.ts`.

**Deleted (2):** `lib/enterprise-world-model.ts` · `lib/enterprise-world-seed.ts` — dead duplicates of
the retired world economics with no consumers.

**Modified — contracts (5):** `canonical-scenario-model.ts` · `campaign-counterfactual-model.ts` ·
`campaign-intent-model.ts` · `enterprise-world-seed.ts` · `index.ts`.

**Modified — engines and clients (5):** `lib/campaign-archetypes.ts` · `lib/campaign-causal-engine.ts` ·
`lib/decision-state-store.ts` · `lib/enterprise-signal-client.ts` · `lib/world-client.ts`.

**Modified — services (3):** `enterprise-signal-generator.ts` · `dynamic-signal-simulator.ts` ·
`server.ts`.

**Modified — routes (4):** `app/api/v1/scenarios/route.ts` · `signals/route.ts` ·
`signals/current/route.ts` · `signals/[id]/route.ts`.

**Modified — surfaces (3):** `ObservabilityGovernance.tsx` · `Forecasting.tsx` ·
`AvailabilityIntelligence.tsx`.

**Modified — tests (9):** the canonical suite plus campaign-intelligence, cdi02, cdi06,
decision-state, esf2, esf3, ifi1 and signal runners.

**Modified — governance (7):** `ARCHITECTURE_DECISIONS.md` · `COGNIX_CANONICAL_SCENARIO.md` ·
`COGNIX_SCENARIO_INTELLIGENCE.md` · `COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md` ·
`COGNIX_ATLAS_RESIDUAL_REGISTER.md` · `COGNIX_BACKLOG_RECONCILIATION_2026_09.md` · `MASTER_PLAN.md` ·
and `COGNIX_PRESENTATION_SYNC_DELTA.md`.

## 8. Genuine residuals

| ID | What | Disposition |
|---|---|---|
| `R-25` | `ATL-06B` assertion `A6b` is stale and the estate carries two Google SDKs | **Unchanged, untouched.** Out of `SCI` scope by the programme record. Still the only failing assertion in the estate |
| `R-26` | CDI-03 opportunity-window and micro-market SCORES derive from `hash01()`, keyed on region and SKU names | **New, opened by this packet.** Same fragility under renaming, but it moves a readiness score and no money. Held as a declared exclusion in the §11 guard, with an assertion that it stays non-economic. For the packet that owns CDI-03 scoring |
| Governance drift | the work-packet record said 44 runners; 42 exist. The branching table named base `f9c5679c`; the authorisation commit is `b5bf1bd9` | Both corrected against measurement in the work-packet record rather than restated |
| World service over HTTP | exercised through the demo fallback, not the container | Re-verify at Gate A if the Docker path becomes reachable |

## 9. Owned contracts — ready for freeze, not yet frozen

All four are implemented, exported from `packages/contracts/src/index.ts` and consumed in anger by the
connected journey. **They are ready for freeze and are not frozen**: ADR-084 part 2 freezes a contract
at a declared convergence SHA, and Gate A also requires `SCI-02`. Recording them as frozen now would
be the status-follows-intent failure ADR-084 part 5 exists to prevent.

`SCI-02` consumes all four. The seam it needs is already there:
`setScenarioActivationPolicy(policy)` — installing the certification gate makes an uncertified
scenario unactivatable everywhere at once, without threading a check through every call site.

## 10. Recommended Gate-A handoff state

1. `SCI-01` committed and pushed on `feature/cognix-sci-01-scenario-contract`. **Not merged into
   `feature/cognix-enterprise-demo-hardening`** — the branching rule forbids it mid-wave.
2. `SCI-02` cut from the `SCI-01` head, per the work-packet record.
3. No Antigravity packet authorised: Wave 0 is single-lane, and Wave 1 may not start until Gate A
   passes with `SCI-02` complete.
4. At Gate A, evidence to produce: both packets' tests green on each branch separately; the four
   contracts byte-identical to this record; the full estate with `R-25` as the only failure;
   certification green for the canonical scenario; §1 and §2 reconciled; browser acceptance at three
   widths — ideally over the Docker path if the registry becomes reachable; the Wave-2 contracts
   declared; and only then the convergence SHA recorded.
