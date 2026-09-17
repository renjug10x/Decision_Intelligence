# Wave-0 Convergence and Gate-A Closure

**Date:** 2026-09-17.
**Result:** **GATE A PASSED.** Wave 1 is authorised.
**Convergence branch:** `feature/cognix-sci-wave0-convergence`.
**Converged from:** `SCI-01` `1a3b2d649bf5d74a8c462a6532c0895279aa4bbe` · `SCI-02`
`c1edf150288570455dd6ba202df7feac7d989e05`.
**Decisions applied:** ADR-084 (parts 1, 2, 4, 5) · ADR-080 · ADR-081 · ADR-072 · ADR-067.

This is not a feature packet. It closes the three Gate-A conditions `SCI-02` left open and records
the evidence for all ten.

---

## 1. Ancestry

`SCI-02`'s direct parent is `SCI-01`; `SCI-01`'s is `b5bf1bd9`, the commit that authorised the `SCI`
programme. Verified three ways — `merge-base --is-ancestor`, `rev-parse c1edf150^`, and
`git log b5bf1bd9..HEAD`, which shows exactly two commits and nothing else.

## 2. Convergence method — deliberate fast-forward, no manufactured merge

§5 requires convergence to be **deliberate, in one place, by one operator**. It does not require a
merge commit, and Wave 0 has no second lane to merge — the Antigravity column for Wave 0 is empty by
design, because ADR-084 part 3 forbids artificial parallelism and a wave with one packet in it is a
correct outcome where the dependency graph says so.

The two packets are a linear ancestry from the declared base, so the convergence branch was created
at `c1edf150` as a fast-forward. Inventing a merge commit would have added a node to the history that
records nothing, and "deliberate" describes the operation rather than the shape of the commit graph.

**What the converged state contains:** exactly `SCI-01` + `SCI-02`, plus this closure's own
governance and the Wave-2 contract declaration Gate A requires. No unrelated change.

## 3. Condition 9 — the Wave-2 contracts, declared

`packages/contracts/src/living-evidence-contracts.ts`. **Types and governed semantics only.**

| Contract | Owner | What is now fixed |
|---|---|---|
| **Signal Materiality & Decision Relevance** | `SCI-05` | `MaterialQuantityId` (which published quantities can move) · `MaterialQuantityMovement` (before, after, delta, unit) · `MaterialityBand` · `SignalMateriality` · `DecisionChangeKind` · `DecisionRelevance` |
| **Refresh Operation** | `SCI-05` | `ScenarioAsAtMarker` · `RefreshObservationChange` · `RefreshedObservation` · `RefreshDelta` (including `decision_consequence_statement`) · `RefreshScenarioOperation` · `RestartScenarioOperation` |
| **Models & Methods** | `SCI-05` | `MethodMechanism` (the ADR-082 `method` dimension) · `MethodRegisterEntry` · `MethodsRegister` (including `undescribed`) |

### Why these could be declared safely

The instruction was to report Gate A blocked rather than fabricate a contract. Nothing was
fabricated: every field traces to a standing decision or to `SCI-05`'s own packet definition.

- **Materiality and decision relevance** are defined verbatim by ADR-081 part 4 — *materiality is
  whether it moved a published quantity and by how much; decision relevance is whether it changed a
  recommendation, a readiness verdict or a window*. The type is that sentence.
- **Refresh** is defined by ADR-081 parts 1–3: advance one `SimulationPeriod` on the scenario clock,
  re-evaluate, publish a delta saying what is new, what aged, what moved materially and whether the
  decision changed, deterministically. `SimulationPeriod` and the clock already exist from `SCI-01`.
- **Models & Methods** is bounded by `SCI-05`'s own packet — publish *purpose, inputs, output, last
  run, scenario applicability and measured error* — and by ADR-067, which keeps prompts, tokens,
  temperature and model identifiers off a client surface. There is no field here to carry them.

### Three design decisions worth stating

**Materiality is a BAND, not a score.** ADR-081 part 5 and ADR-072 forbid a third number beside the
`confidence` and `quality` `ESF-1` already carries. A band classifies a movement that is itself fully
published, so a reader can always reach the arithmetic; a score would be a new unexplained quantity.

**`decision_consequence_statement` is mandatory and non-null.** ADR-081 part 2: *a Refresh that
cannot say what it changed has not earned the control*. Where nothing changed it says so — that is an
answer, not a blank.

**`MethodsRegister.undescribed` exists.** A register that silently drops what it cannot describe reads
as a complete list and is not one. This is the `ATL-FINAL` discipline: declare unmeasured rather than
report a zero the route could not earn.

### Singular ownership, enforced rather than asserted

`run-gate-a-tests` §2 asserts, per type, that **exactly one module defines it** and that the module is
its owning packet's — for the three `SCI-05` contracts and for `SCI-01`/`SCI-02`'s. §1 asserts the
declaration contains no `function`, no arrow implementation, no `return`, no `class` and no exported
value. §3 asserts no module anywhere implements `deriveMateriality`, `deriveDecisionRelevance`,
`refreshScenario` or `buildMethodsRegister`.

**`SCI-05` remains the sole implementation owner.** Nothing in this closure implements any part of
Wave 2.

## 4. Gate-A conditions, re-evaluated from the convergence state

Not reused from packet claims. Conditions 1, 2 and 4 were additionally verified at each packet's own
head in separate worktrees, because *"green on each branch separately"* is what the condition asks and
a convergence run does not establish it.

| # | Condition | Verdict |
|---|---|---|
| 1 | Both lane branches committed and pushed | **PASS** — single-lane Wave 0; `1a3b2d64` and `c1edf150` both pushed; linear ancestry verified |
| 2 | Independent packet tests green on each branch separately | **PASS** — `SCI-01` 42 runners / 41 green at its own head; `SCI-02` 43 / 42 at its own head; only `run-atl06b-tests` non-zero in each |
| 3 | Deliberate convergence against the declared base | **PASS** — deliberate fast-forward to the governed branch; no manufactured merge; history contains exactly the two authorised packets |
| 4 | No contract drift | **PASS** — four `SCI-01` contract files hash-identical across all three states; `SCI-02`'s certification contract hash-identical `SCI-02` → convergence |
| 5 | Full relevant regression | **PASS** — 44 runners from the convergence state, each captured individually; 43 fully green; `R-25` only |
| 6 | Certification green for every registered scenario | **PASS** — `CERTIFIED`, twelve `PASS`, 84 checks, re-run from the convergence state |
| 7 | Protected journey reconciled | **PASS** — §1/§2 unchanged at three widths; authoritative Promotion economics pinned |
| 8 | Browser acceptance at 1440 / 1024 / 720 | **PASS, limitation recorded** — native production build; **Docker not claimed** |
| 9 | Wave-2 contracts declared and frozen | **PASS** — declaration only, ownership singular, both enforced by tests |
| 10 | Governance updated on evidence; convergence SHA recorded | **PASS** — SHA-A recorded in §9 below |

## 5. Contracts frozen at SHA-A

| Contract | Owner | State |
|---|---|---|
| Scenario Contract | `SCI-01` | **FROZEN** — implemented, in use |
| Scenario Clock | `SCI-01` | **FROZEN** — implemented, in use |
| Scenario Registry & Activation | `SCI-01` | **FROZEN** — implemented; seam consumed by the gate |
| Provenance Vocabulary | `SCI-01` | **FROZEN** — implemented, in use |
| Scenario Certification | `SCI-02` | **FROZEN** — implemented, enforcing |

## 6. Contracts merely DECLARED at SHA-A

| Contract | Owner | State |
|---|---|---|
| Signal Materiality & Decision Relevance | `SCI-05` | **DECLARED · FROZEN AS A DECLARATION · NOT IMPLEMENTED** |
| Refresh Operation | `SCI-05` | **DECLARED · FROZEN AS A DECLARATION · NOT IMPLEMENTED** |
| Models & Methods | `SCI-05` | **DECLARED · FROZEN AS A DECLARATION · NOT IMPLEMENTED** |

**Do not read "frozen" as "working".** What is frozen is the shape, so `SCI-06` can build against it
while `SCI-05` implements behind it in the same wave. The behaviour does not exist. Scheduling
`SCI-06` as though these engines were available would be exactly the misreading this section is
written to prevent.

## 7. Evidence

**Certification.** `SCN-FRESH-DAIRY-CHEDDAR-001` — **`CERTIFIED`**, all twelve dimensions `PASS`, 84
executed checks, result admissible under `validateCertificationResult`, re-run from the convergence
state.

**Protected Demand values**, read from the running surface at 1440 / 1024 / 720:

| Value | Expected | Measured |
|---|---|---|
| Expected / servable / exposed units | 900,125 / 769,996 / 130,129 | identical |
| Movement above base | +28.6% | identical |
| Revenue / margin exposed | £269.4K / £80.7K | identical |
| Decision Gap · Window · Cost of choosing wrongly | 18.6pp · 62h · £21.8K | identical |
| Supplier | Cheshire Cheese Co (SUP002) | identical |

**Authoritative Promotion economics**, pinned in `run-gate-a-tests` §5 and confirmed on the surface:

| Depth | Demand | Contribution |
|---|---|---|
| 20% | **+44.16%** | **−£5,167** |
| 14% | **+33.65%** | **+£32,976** |

Both re-derive from the scenario record's declared terms. No scope multiplier is declared, and no
hash-era value (46.8%, +£8.1K, £43.5K) appears anywhere on any surface.

**Tests.** 44 runners from the convergence state, each accounted for individually: **43 fully green**.

### `R-25`, separated

`run-atl06b-tests`: **132 passed, 1 failed**. The single failure is `A6b`, which expects
`@google/genai` to be absent although the governed Google AI implementation legitimately uses it.
Unchanged from baseline, and **not touched by this task**. It is the only failing assertion in the
estate; no `[FAIL]` line appears in any other runner.

## 8. Browser and Docker acceptance

**Docker is NOT claimed.** `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
--build` was attempted from the convergence state. The daemon starts; the build fails at image
resolution with `403 Forbidden` from `production.cloudfront.docker.com` under this environment's
egress policy. An unauthenticated `docker pull node:20-alpine` is additionally rate-limited by Docker
Hub. Both recorded.

**What was done instead.** A production `next build` served natively with
`COGNIX_WORLD_MODE=demo-fallback`, driven in Chromium at **1440 / 1024 / 720**. The certification
gate is live on this path — `lib/scenario-runtime.ts` installs it at import and throws if the active
scenario does not certify, so the server starting is itself evidence.

All four surfaces share one identity, one supplier and one clock. The Shared Decision State every
surface reads returns `scenario_id: SCN-FRESH-DAIRY-CHEDDAR-001`, `scenario_family: promotion_surge`
and the constraint *"Cheshire Cheese Co allocation cap: 385,000 units/week"* — the scenario's own
arithmetic. No `FreshDirect`, no `SCN-PROMO-01`, no page errors, no 5xx at any width.

**Limitation:** the `cognix-world` container path was exercised through the demo fallback rather than
over HTTP. See `R-28`.

## 9. SHA-A

**SHA-A = `8d6d960cd7d1a24ea41737da2d04bd4e47765a86`**

That is the Wave-0 convergence commit on `feature/cognix-sci-wave0-convergence`: `SCI-01` + `SCI-02`
plus this closure's Wave-2 declaration and Gate-A evidence. It is the state the five Wave-0 contracts
are frozen at and the three `SCI-05` contracts are declared at (ADR-084 part 2 — a contract is frozen
at a declared convergence SHA, not at a moment in time).

**Wave 1 is cut from the head of `feature/cognix-sci-wave0-convergence`.** The head is one commit
ahead of SHA-A — this record of the SHA itself, which a commit cannot contain about itself. That
commit changes no code, so cutting from SHA-A and cutting from the branch head give an identical
working tree; the branch head is the correct base because it carries the complete governance record.

## 10. Wave 1

**Authorised.** `SCI-03` (Cursor, `feature/cognix-sci-03-scenario-packs`) and `SCI-04` (Antigravity,
`feature/cognix-sci-04-scenario-selection`) may be cut from SHA-A and may run concurrently — §4
permits exactly that pairing.

**`SCI-03` carries `R-27` as its first task, not as an inherited residual.** The engines still
resolve against the reference scenario, so a curated pack will fail `C-5`, `C-7`, `C-8` and `C-12`
until they are parameterised — and an uncertified scenario cannot be demo-active. Better understood
as the precondition for the packet than as a defect found later.

**`SCI-04` builds selection against the Scenario Registry & Activation contract frozen here.** It
needs nothing from `SCI-03`: the §2.1 content edge between them converges at Gate B, not mid-wave.

## 11. Residuals

| ID | What | Disposition |
|---|---|---|
| `R-25` | `ATL-06B` `A6b` stale; two Google SDKs | Unchanged, untouched. Still the only failing assertion in the estate |
| `R-26` | CDI-03 scores derive from a name hash | Unchanged. Held as a declared exclusion in the canonical suite's hash guard |
| `R-27` | Engines still resolve against the reference scenario | **`SCI-03`'s first task.** Surfaced by the gate rather than by a client |
| `R-28` | `cognix-world` does not install the certification gate | Bounded — one scenario registered, and it is certified. For whichever packet first registers a second scenario in that process |
| `R-29` | Stale `skuContextFactor` comment in `campaign-frontier-engine.ts` | Minor, one line. For whichever packet next touches that engine |
| Docker acceptance | Image registry refused by egress policy | Re-attempt at Gate B if the registry becomes reachable |

None blocks Wave 1.
