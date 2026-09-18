# CogniX Wave-2 Convergence — Gate-C Assessment

**Status:** **GATE C PASSED**, closed 2026-09-18.
**Branch:** `feature/cognix-sci-wave2-convergence`, cut from the declared Wave-2 base
`cacbb5b364ad6dcab841f7e8bb96557a44054a49` (which carries SHA-B and Gate B PASSED).
**Lanes converged:** `SCI-05` + `R-37` + `R-38`/`R-39` (Cursor) and `SCI-06` (Antigravity).
**Governs:** [`COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md`](../governance/COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md) §6 and §9.
**Discipline:** ADR-084.

Evaluated from the CONVERGENCE STATE, not from either lane's claims, with conditions 1 and 2
additionally measured at each lane's own head in a separate worktree — because *"green on its own
branch"* is what the condition asks and a convergence run does not establish it.

---

## 1. Inputs, resolved before anything was changed

| | full SHA | resolved from |
|---|---|---|
| **Wave-2 base** | `cacbb5b364ad6dcab841f7e8bb96557a44054a49` | declared; carries SHA-B and the Gate-B record |
| **Domain lane head** | `11f615bef2fb41fa742dc9baa48c4f81198a0079` | `origin/feature/cognix-r38-r39-demand-base-integrity` |
| **Observability lane head** | `5fb57ec319f96ac1f8ffef4fb0701697f7e23bef` | `origin/feature/cognix-sci-06-observability-experience` |

`git merge-base` of the two heads is **exactly** `cacbb5b3`, and `merge-base --is-ancestor` holds
for the base against each head. Neither lane drifted; neither rebased; the two never touched.

| lane | commits from the base |
|---|---|
| Domain | `be01597` `SCI-05` → `5450fec` governance → `d2959e5` `R-37` → `11f615b` `R-38`+`R-39` |
| Observability | `5fb57ec` `SCI-06`, a single commit |

**Baseline facts verified before merging.** Gate B PASS is in ancestry (`e0a9c23`, the parent of
the base). `SCI-05` is `[COMPLETED]` in the domain lineage and `SCI-06` completed independently on
its own branch. `R-30`, `R-36`, `R-37`, `R-38` and `R-39` are CLOSED in the residual register;
`R-41` is OPEN and marked optional; `R-40` is OPEN and governed. The working tree was clean.

---

## 2. Changed-file overlap — calculated before merging, not discovered during it

| | files |
|---|---|
| `base..domain` | 28 |
| `base..SCI-06` | 13 |
| **exact intersection** | **1** — `docs/governance/COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md` |

**No source file is touched by both lanes.** The concurrency matrix (§4) authorised exactly this
pairing and the measurement shows it held: the domain lane owns the engine, the four `evidence` /
`methods` routes and the scenario-domain modules; the Observability lane owns
`components/observability/*`, `ObservabilityGovernance.tsx`, the two decision-surface entry points,
`lib/observability-client.ts` and `app/globals.css`.

**The one conflict, and how it was resolved.** Both lanes edited the packet-inventory table and each
recorded ONLY ITSELF as complete, leaving its partner at *"Not started"*. Neither side is right:
both packets completed. Resolved by taking **both** truths rather than a side — `SCI-05`
`[COMPLETED 2026-09-17]` and `SCI-06` `[COMPLETED 2026-09-17 · CONVERGED 2026-09-18]` — and every
other record from both lanes survives unmodified.

**Convergence method.** `feature/cognix-sci-wave2-convergence` was created at the declared base and
each lane merged `--no-ff` explicitly, domain first, in one place, by one operator: `d103b13` then
`f2d9857`. The convergence work then follows as ordinary commits on that branch.

---

## 3. The real convergence work — a file overlap of one is not an integration of one

The two lanes did not touch the same files, and were nonetheless **semantically incompatible**. This
is the finding the gate exists to catch.

`SCI-06` built its whole experience against `lib/fixtures/living-evidence-fixtures.ts` — 1,051 lines
of contract-shaped data it authored so it could work while `SCI-05` implemented the engines in the
parallel lane. That was correct under the Gate-A freeze and is what made the two lanes possible. It
is **not** a production data path, and left alone it would have shipped a governance surface whose
numbers were written rather than measured, with nothing on screen to tell a client which was which.

What the fixture actually contained, measured rather than assumed:

| | fixture | the estate |
|---|---|---|
| Scenario clock | `2026-09-08` for all three scenarios | `2026-06-03` / `2026-07-15` / `2026-09-09` — each scenario's own |
| Fresh Dairy expected demand | `699,996` — the basis `R-38` corrected | `900,125` declared, `951,437` evidence-revised |
| Source system | `Retail EPOS Aggregator` (`INTERNAL_SYSTEM`) | `cognix_world_simulator` (`SYNTHETIC_WORLD`) |
| Provenance | `observed / measured / authoritative` | `modelled / rule / authoritative`, through the governed ADR-082 mapping |
| Refresh outcome | chosen by a `toggle` / `force_changed` / `force_unchanged` / `force_fail` mode | derived from the advance |
| Refresh latency | `setTimeout(450)` | however long the operation takes |

It also **broke an existing governed guard**: naming the curated packs' scenario ids as literals
failed `run-sci03-scenario-pack-tests.ts` §7 — *"no engine, route or surface names a curated pack"*.
That failure was present at the `SCI-06` head and is recorded under condition 2 below.

### 3.1 The convergence event (ADR-084 part 2), raised and taken at the gate

`SCI-06` needs each observation's `SignalMateriality` and `DecisionRelevance` **before** advancing
anything, so a reader can see what today's evidence is doing. `SCI-05` published both only inside a
`RefreshDelta`. The Gate-A declaration names exactly this case: *"a field `SCI-06` needs and does not
find here is a convergence event raised at Gate C — never a local addition."*

Taken in the **owning** module, `lib/living-evidence-engine.ts`:

- `assessedEvidenceAt(scenarioId)` — the observed evidence at the current marker, each observation
  assessed by the same `assessSignalMateriality` and `assessDecisionRelevance` that `refreshScenario`
  calls. Leave-one-out, as the contract documents.
- `scenarioDecisionPosition(scenarioId)` — the recommendation, the Decision Window and the published
  quantities as they stand, from `decisionArtefactsAt` and `publishedQuantitiesAt`. The Decision
  Trace reads this; it is **not** a second decision engine.

Both are published by `GET /api/v1/evidence`. **No frozen contract changed** — all six are
byte-identical to the base — and no shape was introduced that the declaration does not already
carry. `run-wave2-convergence-tests.ts` §C asserts that exactly one module implements them and that
the route composes no assessment of its own.

### 3.2 A defect the gate found in the domain engine, and fixed

Refresh deliberately evaluates both bodies of evidence at the SAME marker so that an observation is
never credited with the passage of time. That isolation was also applied to the question *"did the
decision change across this advance?"*, and the engine's own comment said it was not.

Measured consequence, on the converged product:

| scenario | Decision Window across the first advance | what Refresh said |
|---|---|---|
| Fresh Dairy | `OPEN` (62h) → `OPEN` (38h) | unchanged — correct |
| Chilled Salmon | **`CLOSING_SOON` (9h) → `OPEN` (153h)** | *"the state of the Decision Window are the same as before the advance"* — **false** |
| Premium Bakery | **`OPEN` (40h) → `CLOSING_SOON` (16h)** | *"…the same as before the advance"* — **false** |

ADR-081 part 2 is that a Refresh which cannot say what it changed has not earned the control; one
that DENIES what it changed is worse, and it was denying it on the exact surface Gate C certifies.
Fixed in the owning module by asking the two questions separately: `decisionFromEvidence` (both
bodies at the same marker) still bands materiality, so nothing is called `DECISIVE` because a day
passed; `decisionAcrossAdvance` (each side at its own marker) is what the consequence statement
reads out, and it now names the cause. Guarded by `run-wave2-convergence-tests.ts` §E2.

### 3.3 Other corrections made at convergence

| finding | resolution |
|---|---|
| `applies_to_scenario_ids: []` rendered as *"Global method"* | The contract says an empty list means it applies to none. It now says so |
| `measured_error: null` rendered as *"deterministic calculation or drafting"* | Unmeasured licenses no claim about why. It now says only that no backtest is published |
| Drafted class showed a bare `0` | It now states that Google GenAI contributed nothing to this scenario and points at the declared `undescribed` entry |
| `<AtlasHealth />` mounted twice, the second hidden with `display:none` to satisfy `ATL-FINAL` B7 | One mount, inside Platform Health. B7 repointed to assert the property over the composition |
| Three hidden `<span>`s satisfying `ATL-04R` H9 | Removed. H9 repointed to the composition that renders the diagnostics |
| `run-sci03-scenario-pack-tests` §7 catches `scenario_id === 'SCN-…'` but not `scenarioId.includes('SALMON')` | Widened in `run-wave2-convergence-tests.ts` §E to catch the substring form |
| A `Refresh` failure could be indistinguishable from empty data | A failed read is shown as a failure. There is no fallback |

The fixture was **deleted**, not bypassed. A runtime path that can silently fall back to authored
data will eventually present authored data as measurement; the guard asserts the file is gone and
that no runtime file imports it.

---

## 4. Gate-C conditions, evaluated individually

| # | Condition | Verdict | Evidence |
|---|---|---|---|
| 1 | Both lane branches committed and pushed | **PASS** | `11f615b` and `5fb57ec`, both on `origin`, both single-parent chains from the declared base, verified by `merge-base --is-ancestor` and by the actual `merge-base` being the base itself |
| 2 | Independent packet tests green **on each branch separately** | **PASS, with a finding recorded** | Measured at each head in its own worktree. **Domain head: 50 runners, 49 fully green**, `R-25`'s `A6b` the only `[FAIL]`. **`SCI-06` head: 48 runners, 46 green** — its own suite 165/165, but `run-sci03-scenario-pack-tests` FAILED on the pack-naming guard because the isolation fixture named the curated packs. `SCI-06`'s completion record did not run that runner. The failure is **closed by this convergence** (the fixture is gone) and is recorded rather than waived |
| 3 | Deliberate merge against the declared base | **PASS** | Branch cut at `cacbb5b3`; each lane merged `--no-ff` explicitly and separately; one operator, one place. `git log cacbb5b3..HEAD` contains exactly the two lanes, the two merges and the convergence work |
| 4 | No unresolved contract drift | **PASS** | All six frozen contracts byte-identical across base / domain / `SCI-06` / converged / post-convergence, by `hash-object`. Re-asserted hermetically in `run-wave2-convergence-tests.ts` §B against the blob hashes the base carries. The Gate-A declaration remains a declaration: `run-gate-a-tests.ts` §1 green |
| 5 | Full relevant regression | **PASS** | **52 runners individually accounted, 51 fully green, 4,124 assertions.** `run-atl06b-tests`'s `A6b` (`R-25`) is the only `[FAIL]` line in the estate, byte-identical to the baseline. No runner regressed |
| 6 | Certification gate green for every registered scenario | **PASS** | Re-run from the convergence state: three scenarios `CERTIFIED`, **12/12 dimensions each, 84 executed checks each, 252 total, zero `NOT_APPLICABLE`**. No check relaxed, removed or made conditional |
| 7 | Protected journey reconciled | **PASS** | Re-measured from the convergence state through the governed decision path: base **700,000**, expected **900,125**, servable **770,000**, exposed **130,125**, Decision Gap **18.6pp**, total **+28.6%**, post-intervention exposure **46,125** on **84,000** units recovered. Promotion pinned at 20% → **+44.16% / −£5,167** and 14% → **+33.65% / +£32,976**. `COGNIX_PRESENTATION_SYNC_DELTA.md` §1/§2/§3 corrected to state these as live — see §6 below |
| 8 | Browser acceptance at 1440 / 1024 / 720 | **PASS, with a recorded limitation** | **615 checks, 0 failures** across three widths × the full four-stop scenario sequence, plus **40 checks, 0 failures** on the Refresh lifecycle driven through the UI. No horizontal overflow on any surface at any width; selector reachable by a real click at every width; no page errors; no 5xx. **Docker is NOT claimed** — see §7 |
| 9 | Next wave's cross-lane contracts declared and frozen | **PASS** | Wave 3 is `SCI-07` (Cursor) and `SCI-09` (Antigravity). `SCI-09` consumes **Models & Methods**, which `SCI-05` owns and which is now IMPLEMENTED and frozen at SHA-C — `SCI-09` renders the register and holds no second copy, asserted. `SCI-07` owns **Scenario Draft**, declared and frozen at Gate B for `SCI-08`/`SCI-10` in Wave 4, unchanged by this convergence. Neither lane owns a contract the other must alter |
| 10 | Governance updated only after evidence, and the convergence SHA recorded | **PASS** | Every table above is written from a measurement taken on the converged state. **SHA-C recorded in the work-packet register §9**, by the same honest two-step used for SHA-A and SHA-B |

### 4.1 The additional proofs Gate C was asked to establish

| Proof | Verdict | Evidence |
|---|---|---|
| Both Wave-2 lanes independently committed | **PASS** | §1 — single-parent chains from one base, neither rebased |
| Deliberate convergence | **PASS** | §2 — overlap calculated first, one semantic conflict decided rather than absorbed, two explicit `--no-ff` merges |
| No frozen-contract drift | **PASS** | Condition 4 |
| Real `SCI-05` domain data powers `SCI-06` | **PASS** | §5 — every figure read from `/api/v1/evidence` and `/api/v1/methods` |
| No production fixture dependency | **PASS** | Fixture deleted; `run-wave2-convergence-tests.ts` §A asserts no runtime import, no fallback, no simulated latency, no authored band or consequence statement |
| Refresh works end to end | **PASS** | §5.2 — through the API and through the UI, for all three scenarios, with determinism and Restart |
| All three scenarios remain certified | **PASS** | Condition 6 |
| `R-38`/`R-39` invariants intact | **PASS** | `run-r38-r39-demand-base-tests` green from the convergence state; history-window invariance and the declared attribution decomposition unchanged |
| Protected Fresh Dairy values reconcile | **PASS** | Condition 7, re-measured rather than quoted |
| Full regression green except `R-25` | **PASS** | Condition 5 |
| Browser acceptance passes | **PASS** | Condition 8 |

---

## 5. What was measured on the converged product

### 5.1 Evidence & Signals — real, and scenario-specific

| | Fresh Dairy | Chilled Salmon | Premium Bakery |
|---|---|---|---|
| Scenario clock | **2026-06-03** | **2026-07-15** | **2026-09-09** |
| Observations at the opening marker | 32 | 40 | 56 |
| Materiality bands | 19 immaterial · 11 notable · 2 material | 23 immaterial · 17 notable | 40 immaterial · 3 notable · 7 material · 6 decisive |
| Source system | `cognix_world_simulator` (`SYNTHETIC_WORLD`) | same | same |
| Provenance sentence | *"… is modelled, through a declared rule."* | same | same |
| Decision as it stands | Serve the exposure — release supplier flex capacity · Window `OPEN` | Serve the exposure · Window `CLOSING_SOON` | Hold and monitor · Window `OPEN` |

Freshness is measured on the scenario clock and published per observation in scenario days.
Materiality is shown with both endpoints and the unit, under the heading *"without this
observation / with it"*, so a reader can check the band against the arithmetic. No observation
after the as-at marker is visible, asserted at all three widths.

**None of `FreshDirect UK`, `SCN-PROMO-01`, civil-time freshness, `temporal_evidence` or the fixture
clock `2026-09-08` appears anywhere on the journey** — asserted by source guard over the governed
journey files and re-checked in the browser at three widths.

### 5.2 Refresh, end to end, for every scenario

Measured through `POST /api/v1/evidence/refresh` and again by driving the UI.

| | Fresh Dairy | Chilled Salmon | Premium Bakery |
|---|---|---|---|
| Advance | `Today` 2026-06-03 → `T+1` 2026-06-04 | `Today` 2026-07-15 → `T+1` 2026-07-16 | `Today` 2026-09-09 → `T+1` 2026-09-10 |
| Observations | 32 → 36 (2 new, 2 moved, 32 aged) | 40 → 45 (2 new, 3 moved, 40 aged) | 56 → 63 (5 new, 2 moved, 56 aged) |
| Material movements | 6 | 7 | 5 |
| Leading movement | Exposed demand 181,437 → 191,339 units (+5.46%) | Exposed demand 38,607 → 40,292 units (+4.36%) | Decision Gap 8.09 → 8.54 pp (+5.56%) |
| Decision changed? | **No** | **Yes** — Decision Window `CLOSING_SOON` → `OPEN` | **Yes** — Decision Window `OPEN` → `CLOSING_SOON` |
| Attribution | — | the clock, not the evidence, and the statement says so | the clock, not the evidence, and the statement says so |
| Determinism | byte-identical after Restart | byte-identical | byte-identical |
| Restart | returns to the opening evidence exactly | same | same |

**On the bakery pack, and stated rather than glossed.** `SCI-05` measured its first Refresh as
**zero** material movements, and the Gate-C brief anticipated that result. It is **no longer true**,
and the cause is `R-37`: the bakery pack had no demand-side carrier when `SCI-05` measured it, and
now has `CATEGORY_DEMAND_ACCELERATION` + `REGIONAL_DEMAND_SHIFT`. Its advance now moves five
published quantities. Nothing was tuned to produce that; the honest report is that the premise
changed under a repair, and the surface reports what the engine returns. The *"no material change"*
path is unchanged, still reachable, and still asserted — an advance at the end of a timeline
advances nothing and says so.

### 5.3 Models & Methods

Nine entries per scenario, in the exact ADR-082 vocabulary, grouped into the four governed classes:

| class | contract vocabulary | entries |
|---|---|---|
| **Calculated** | `rule`, `measured` | 6 |
| **Fitted** | `statistical` | 2 |
| **Drafted** | `llm` | **0** |
| **Human** | `manual` | 1 |

**Google GenAI appears only where it genuinely contributes.** With no provider credential configured
in this environment it is not listed as an active mechanism; it is declared in `undescribed` with
its reason, and the Drafted card says so in words rather than showing a bare zero. The governed
server-side `GEMINI_API_KEY` architecture is untouched — no new provider, no client-side key path,
no change to any route. No prompt, token count, temperature, API key or model identifier reaches the
surface; asserted against the serialised register, the component source and the rendered page.

### 5.4 Platform Health

Measurable facts only: the Atlas record audit (mounted once), the capability landscape with
implementation status, lifecycle state and demonstrable maturity kept as three separate dimensions,
and the landscape-integrity partition check. **No uptime, error rate, latency, percentile, model
health or service health is reported**, and the governed unmeasured behaviour is preserved and
declared. Asserted in the browser at all three widths.

### 5.5 Decision Trace

Reachable from Promotion and from Campaign Decision as a dialog that closes on `Escape`, and as a
section of Observability. It consumes the decision position, the assessed observations, the Models &
Methods register, Shared Decision State and journey telemetry. Its ADR-082 sentence is composed from
the origins and methods **this scenario's** evidence actually carries.

Before convergence it selected a hand-written recommendation per scenario by testing the scenario id
for `SALMON` / `BAKERY`, quoted ADR-082's example sentence as though it were this scenario's
provenance, and stated supplier caps and unit quantities as literals including the superseded
`699,996`. **No trace or provenance engine was introduced** — every statement is read from something
that already existed.

### 5.6 Three-scenario end-to-end

Fresh Dairy → Demand → Promotion → Campaign Decision → Evidence & Signals → Models & Methods →
Decision Trace → Refresh; then Chilled Salmon through the same sequence; then Premium Bakery; then
back to Fresh Dairy. Run at 1440, 1024 and 720.

At every stop the surface resolves the active scenario's own SKU, category, supplier, scope,
horizon, clock, history, economics, recommendation, evidence, materiality and decision relevance,
and **no value from the previous scenario survives** — asserted positively (this scenario's values
are present) and negatively (every other scenario's values are absent) at each stop.

---

## 6. Governance corrected at this gate

`COGNIX_PRESENTATION_SYNC_DELTA.md` §1, §2 and §3's closing narrative still stated `699,996` /
`769,996` / `130,129` / `46,130` in the **Live application** column. `R-38` added §1a recording the
correction and did not carry it into the sections it corrected, so for a day the record contradicted
itself. The Live application column is now what the application publishes, re-measured; the Slide
value column is untouched, because a slide baseline is a historical fact and the delta is the point
of the document. **No slide value changed and none needs to.**

---

## 7. Docker — attempted, and NOT claimed

`docker compose` is available and the daemon starts. `docker pull node:20-alpine` resolves the
manifest and then fails at the blob: `production.cloudfront.docker.com` returns **403 Forbidden**
under this environment's egress policy. Retried with the sanctioned HTTPS proxy configured for the
daemon; the same 403. **Docker acceptance is therefore not claimed**, which is the identical recorded
limitation as Gate A and Gate B.

The strongest available production topology was used instead, and it is a genuine service topology
rather than a dev server: the Next.js **standalone production build** (`output: 'standalone'`, the
same artefact the image runs) served as its own process, against the **`cognix-world` domain service
on :8081** and the **`cognix-learning` service on :8082** as separate processes, with
`COGNIX_WORLD_MODE=service`. Three processes, three ports, real HTTP between them.

`services/world/dist` and `services/learning/dist` were rebuilt locally to stand the services up and
**reverted before commit**, per the convention `R-40` records.

---

## 8. Residuals

| id | state after this gate |
|---|---|
| **`R-41`** — `R-37`'s carrier amplitudes calibrated against the basis `R-38`/`R-39` corrected | **OPEN, non-blocking, RETAINED as a documented residual.** Salmon declares 26.4% and publishes **+26.45%**; Bakery declares 11.2% and publishes **+11.30%**. Both legs stay inside the ±0.25pp tolerance `run-r37-observed-behaviour-tests.ts` §8 asserts, and no Gate-C condition is expressed on the published total. **No carrier amplitude was altered during convergence** — asserted by hashing `observed-behaviour-carriers.ts` in `run-wave2-convergence-tests.ts` §G, so a future convergence cannot close it by number-chasing without the guard failing |
| **`R-40`** — `services/world/dist` is a tracked build artefact | **OPEN, untouched, and now four packets stale.** Rebuilt for acceptance and reverted, as before. It remains an owner's decision: build in CI and stop tracking `dist`, or track it and keep it current |
| **`R-25`** — `ATL-06B` `A6b` stale, two Google SDKs | **OPEN.** The only `[FAIL]` line in the estate, unchanged from the baseline. Closing it belongs to whichever packet next touches the provider configuration |
| `R-24` · `R-26` · `R-28` · `R-29` · `R-32` · `R-34` | Untouched. Not in scope |
| **`R-42`** — `SCI-06`'s completion record overstated its own verification | **OPENED and CLOSED at this gate.** The record cited eight green runners and did not run `run-sci03-scenario-pack-tests`, which its fixture broke. Recorded because ADR-084 part 5 is that governance status follows evidence: a completion record that lists the suites it passed and omits the one it failed reads as complete and is not. The defect is gone with the fixture; the discipline point is recorded so the next Antigravity lane runs the whole estate before claiming completion |

---

## 9. Consequence

**Gate C PASSED. Wave 3 is authorised.** `SCI-07` (Scenario Authoring Domain & Governed GenAI
Drafting, Cursor) and `SCI-09` (CogniX Architecture Surface & `SB-GATE` Closure, Antigravity) may be
cut from SHA-C and may run concurrently — §4 permits exactly that pairing.

**Nothing beyond Wave 3 is authorised.** `SCI-08` and `SCI-10` are Wave 4 and remain gated behind
Gate D.

**Two things Wave 3 carries, recorded so they are not rediscovered.**

- The **Architecture Storyboard is deliberately retained** with its governed notice intact. `SCI-09`
  owns its replacement and `SB-GATE` closure; it was not removed, reduced or re-scoped here.
- `SCI-09` consumes the Models & Methods register and must render it without holding a second copy.
  The register is now implemented rather than declared, so `SCI-09` builds against behaviour rather
  than shape — the first Wave in the programme where that is true.

**Not merged to production.** `feature/cognix-enterprise-demo-hardening` and `main` are untouched.
