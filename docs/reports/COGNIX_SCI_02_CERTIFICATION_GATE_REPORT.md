# `SCI-02` — Scenario Certification Gate & Reconciliation Generalisation

**Status:** `[COMPLETED]` 2026-09-16. **Gate A: NOT PASSED** — see §8.
**Class:** FOUNDATION · Wave 0 · single-lane by construction (ADR-084 part 3).
**Base SHA:** `1a3b2d649bf5d74a8c462a6532c0895279aa4bbe` — the `SCI-01` head, verified before any
analysis and cut from exactly.
**Branch:** `feature/cognix-sci-02-certification-gate`.
**Decisions implemented:** ADR-080. **Consumes:** all four `SCI-01` contracts, unchanged.
**Residuals opened:** `R-27` · `R-28` · `R-29`.

---

## 1. What this packet was for

`SCI-01` created the contracts. `SCI-02` proves and gates them.

The hole it closes is specific. The cross-surface reconciliation suite ran 243 assertions against
ONE scenario. The moment a second scenario exists, that defence has a hole exactly the shape of the
original `DEMO-HARD-01` defect: a new scenario may create a new disconnected economic universe and
every existing assertion stays green, because every existing assertion is about the old one.

## 2. Certification architecture

Two modules, and the split is a dependency decision rather than a stylistic one.

| Module | Holds | Why there |
|---|---|---|
| `packages/contracts/src/scenario-certification-model.ts` | Verdicts, state, the twelve dimension specs, and the rules that stop a result from lying | A contract that imported engines would invert the dependency the estate is built on |
| `lib/scenario-certification.ts` | The twelve dimension evaluators and the gate | The evaluators need the demand, promotion, campaign, signal and currency engines |
| `lib/scenario-runtime.ts` | The one server-side scenario entry point | Installing the gate on import makes enforcement a property of reaching a scenario at all, rather than something each route must remember |

**The gate is installed where it cannot be missed.** Every Next.js route that resolves, lists or
activates a scenario now imports from `lib/scenario-runtime`, and a source guard in the canonical
suite (§15) fails the build if a route reaches the registry directly instead.

`installScenarioCertificationGate()` does two things, and the second matters as much as the first:
it installs the policy, and it then re-activates the CURRENTLY active scenario through it. The
registry bootstraps by activating the reference scenario at module load, before any policy exists; a
gate that applied only to what came next would leave exactly one scenario permanently exempt, which
is the formality-for-newcomers failure §5 of the certification record exists to prevent.

## 3. Dimensions and verdict semantics

All twelve governed dimensions are implemented, using the governance record's own terminology:
`PASS` · `FAIL` · `NOT_APPLICABLE`, and `CERTIFIED` · `FAILED` · `UNCERTIFIED`.

`UNCERTIFIED` is kept distinct from `FAILED` deliberately: *"we have not looked"* and *"we looked and
it does not reconcile"* are different statements, and collapsing them is how a scenario reaches a
demonstration on the strength of nobody having checked.

**A verdict is DERIVED, never written.** `deriveDimensionVerdict` returns `FAIL` if any applicable
check failed, `NOT_APPLICABLE` if none ran, and `PASS` only where at least one ran and all passed.
The harness contains no literal `PASS` verdict — asserted by a source guard.

**Applicability is per CHECK as well as per dimension**, each carrying its own reason. This is not
decoration: a scenario with no observed history has nothing to reconcile its declared scale against,
while the clock and window checks beside it are entirely applicable. Without per-check applicability
a dimension would pass on the strength of the checks that happened to run — the exact defect
`NOT_APPLICABLE` exists to prevent, one level down.

**`validateCertificationResult` refuses** a result whose verdict does not match what its evidence
earns; whose `FAIL` or `NOT_APPLICABLE` carries no reason; whose dimension set is incomplete; whose
inapplicable or failing checks carry no detail; or whose assertion count overstates what executed.
`certificationStateOf` reads an inadmissible result as `FAILED` — a malformed claim of certification
is a stronger signal than no claim at all.

## 4. Activation-gate behaviour

Every behaviour below is asserted in `tests/unit/run-sci02-certification-tests.ts`, by refusal rather
than by comment.

| Required behaviour | Result |
|---|---|
| A fully certified scenario activates | PASS |
| A failed mandatory dimension refuses activation | PASS — and the refusal names the failed dimensions |
| Missing certification refuses activation | PASS — an unregistered scenario cannot be activated; a certifier that throws is a refusal, not a pass |
| `NOT_APPLICABLE` with a valid reason behaves correctly | PASS — `C-6` on a no-promotion fixture is `NOT_APPLICABLE` with its governed reason, does not count as a failure, and is reported so a reader sees what was not examined |
| `NOT_APPLICABLE` without justification fails | PASS — refused by validation; the result cannot certify |
| Certification cannot silently downgrade `FAIL` to `PASS` | PASS — a dimension reporting `PASS` over a failing check is refused |
| Activation cannot bypass certification | PASS — and proven both ways: with the gate uninstalled the same scenario activates, so the gate is demonstrably what refuses it |
| Reset returns the deterministic certified opening state | PASS — and the scenario still certifies byte-identically after a move and a reset |
| Scenario identity survives activation and reset | PASS |

## 5. Reconciliation generalisation

Three classes, not two, because the middle one is what keeps the arrangement honest:

| Class | Where | Executed for |
|---|---|---|
| **Universal** | `lib/scenario-certification.ts` | every registered scenario |
| **Capability-specific** | the same harness, behind a named applicability predicate carrying its reason | the scenarios it applies to; `NOT_APPLICABLE` with a reason elsewhere |
| **Instance-specific** | `tests/unit/run-canonical-scenario-tests.ts` | `SCN-FRESH-DAIRY-CHEDDAR-001` only |

**The test the split has to pass is that adding a scenario does not mean copying a file.** It does
not. The suite is not duplicated per scenario; §14 runs the harness over the catalogue and asserts
its verdicts, so the suite still fails if any registered scenario stops reconciling.

**No assertion was weakened.** One changed, and it was corrected — see §6.

## 6. The reference scenario, certified by the same gate

**`SCN-FRESH-DAIRY-CHEDDAR-001` — `CERTIFIED`**, all twelve dimensions `PASS`, **84 executed
checks**, no dimension resting on a declared non-applicability.

**It did not certify on the first run, and that is worth recording.** `C-8` failed at £47,093 against
£72,450. The scenario was right and the gate was wrong: the check had omitted the scenario's own
declared substitution-recovery share of 35%. `47,093 = 35,000 × £2.07 × 0.65`. Corrected to the full
declared expression — and strengthened with a companion check that the recovery term is actually
applied rather than merely declared — the reference scenario certifies.

That is §5 working as intended: *if the gate cannot certify it, the gate is wrong and is corrected,
the scenario is not exempted*. A gate that had quietly exempted the reference scenario instead would
have been worth nothing.

**And the gate refuses what does not reconcile.** A fixture declaring a 120,000-unit week, a
different SKU and a different supplier fails **six** dimensions, each naming its divergence —
*"the derived-impact population is this scenario's own weekly demand — 350000 vs 120000 — 65.7143%
apart"*. Registered as `R-27`; it is `SCI-03`'s precondition, and the work is now visible and costed
rather than left for a client to find.

## 7. The `SCI-01` Promotion economics, independently verified

Re-derived from the record's declared inputs alone, calling no derivation function, then compared
against what the engines publish.

Declared inputs used: list £2.49 · depth 20% · participation 85% · margin rate 30% · supplier funding
35% · demand response 2.4pp per point (gross) · cannibalisation 8% · weekly demand 350,000 · horizon
14 days · one declared anomaly of +2.74pp at 14% with its reason · **scope multipliers: none**.

```
realised revenue/unit   £2.49 x (1 − 20% x 0.85)          = £2.07
gross margin/unit       £2.07 x 30%                       = £0.62
implied unit cost       £2.07 − £0.62                     = £1.45
contribution at list    £2.49 − £1.45                     = £1.04
retailer-funded share   1 − 0.35                          = 0.65
base units over 14d     350,000 x 14/7                    = 700,000
depth response (net)    depth x 2.4 x (1 − 0.08) + anomaly
```

| Depth | Re-derived uplift | Engine curve | Re-derived net | Engine net | Agree |
|---|---|---|---|---|---|
| 5% | 11.04% | 11.04% | +£17,489 | +£17,489 | YES |
| 10% | 22.08% | 22.08% | +£22,475 | +£22,475 | YES |
| 14% | 33.65% | 33.65% | +£32,976 | +£32,976 | YES |
| **20%** | **44.16%** | **44.16%** | **−£5,167** | **−£5,167** | YES |
| 25% | 55.2% | 55.2% | −£37,701 | −£37,701 | YES |
| 30% | 66.24% | 66.24% | −£82,739 | −£82,739 | YES |

**Verdict: the `SCI-01` arithmetic is correct and every term traces to a declared scenario input.**
There is no hash, no calibration multiplier and no unexplained term; the scenario declares no scope
multipliers at all. The committed 20% plan at −£5.2K and the 14% alternative at +£33.0K are what the
record's own declared values produce. Certified accordingly under `C-2`, `C-6` and `C-12`, the last
of which checks **every** tier of the curve against the record rather than only the committed one.

`skuContextFactor` was not restored and no replacement multiplier was introduced.

## 8. Protected Demand journey

Unchanged. Confirmed in a browser at 1440 / 1024 / 720, reading the running surface rather than the
engines:

| Value | Sync delta §1/§2 | Measured |
|---|---|---|
| Expected / servable / exposed units | 900,125 / 769,996 / 130,129 | identical |
| Movement above base | +28.6% | identical |
| Revenue / margin exposed | £269.4K / £80.7K | identical |
| Decision Gap · Decision Window · Cost of choosing wrongly | 18.6pp · 62h · £21.8K | identical |
| Recovery (§2) | 84,000 units · £52.1K · £20.9K premium · 6.6pp residual | identical |
| Supplier | Cheshire Cheese Co | identical |

One note on method, so the figures are not misread. A first probe compared the DECLARED scale
(350,000/week → 700,000 base) against the sync delta's figures, which the Demand surface derives from
the MEASURED run rate (349,998/week → 699,996 base). Those are different quantities and are meant to
be — `COGNIX_CANONICAL_SCENARIO.md` §5 says so, and that they agree within 0.001% is the
reconciliation. The surface values above are the authoritative reading and they are unchanged.

That probe also exposed that the harness's `C-3.7` was circular — it compared the declared scale
against an implied weekly derived from the same declared scale. It was replaced with a genuine engine
probe: the demand engine's own aggregation, fed a history at this scenario's declared daily rate,
must return this scenario's base demand and declared capacity index.

## 9. Test results

Every runner executed and captured individually. No aggregate exit code was relied on.

**43 runners · 42 fully green · 1 failing.**

| Suite | Result |
|---|---|
| `run-sci02-certification-tests` (new) | **53 passed, 0 failed** |
| `run-canonical-scenario-tests` | **275 passed, 0 failed** (260 at the `SCI-01` baseline) |
| Certification harness | **84 executed checks per registered scenario** |
| `run-campaign-intelligence-tests` | 135 / 0 · `run-cdi07b-tests` 229 / 0 · `run-decision-dimensions-tests` 173 / 0 · `run-cdi07a-tests` 155 / 0 · `run-fm01-tests` 112 / 0 |
| Demand · Promotion · Campaign · signals · currency · reset | `run-ddf01-tests` 57 / 0 · `run-promotion-cta-tests` 54 / 0 · `run-campaign-decision-journey-tests` 96 / 0 · `run-signal-tests` 10 / 0 · `run-esf2-tests` 19 / 0 · `run-esf3-tests` 22 / 0 · `run-decision-state-tests` all passed |
| Every other runner | green, unchanged |

### `R-25`, reported separately as required

`run-atl06b-tests`: **132 passed, 1 failed**. The single failure is assertion `A6b` —
*"…and package.json gained no new provider dependency"* — which expects `@google/genai` to be absent
although the governed Google AI implementation legitimately uses it.

**Byte-identical to the `SCI-01` baseline: same runner, same assertion, same counts.** `SCI-02`
introduced no failure and touched neither the assertion, the Google SDK dependencies, the Gemini
configuration nor any credential path. No `SCI-02` regression is hidden behind it: it is the only
failing assertion in the estate, and the other 42 runners are fully green.

## 10. Browser acceptance

**The supported Docker path could not be exercised, and Docker acceptance is NOT claimed.**
`docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build` fails at image
resolution: the daemon starts, but `production.cloudfront.docker.com` returns `403 Forbidden` under
this environment's egress policy, and an unauthenticated `docker pull node:20-alpine` is additionally
rate-limited by Docker Hub. Both were attempted and recorded.

**What was done instead.** A production `next build` served natively with
`COGNIX_WORLD_MODE=demo-fallback`, driven in Chromium at **1440 / 1024 / 720**. The certification
gate is live on this path: `lib/scenario-runtime.ts` installs it at import and throws if the active
scenario does not certify, so the server starting at all is itself evidence.

| Check | Result |
|---|---|
| One scenario identity | `SCN-FRESH-DAIRY-CHEDDAR-001` only, across the registry, signals and every surface |
| One supplier | Cheshire Cheese Co only; `FreshDirect` absent from the payload |
| One scenario clock | `2026-06-03T00:00:00.000Z` on the envelope and on every observation |
| Registry endpoint | `active_scenario_id` correct, `demo_active: true` |
| Missing / retired identity | `HTTP 400` for no `scenario_id`; `HTTP 400` for `SCN-PROMO-01` |
| Demand | §1 and §2 values present and unchanged at all three widths |
| Promotion | 44.16%, −£5.2K, £33.0K, **+47.9pp = +44.2pp price cut + 3.7pp design** — the declared `SCI-01` economics, not hash-restored values |
| Campaign Decision | opens on the canonical context |
| Observability & Governance | scenario, supplier and *"as at 2026-06-03 (scenario time, not the wall clock)"* |
| Page errors / 5xx | none at any width |

**The limitation this leaves.** The `cognix-world` container path was exercised through the demo
fallback rather than over HTTP. The domain service compiles clean and carries the same scenario rules
in its own code, but see `R-28`: it does not install the certification gate, because its tsconfig
deliberately excludes `lib/`.

## 11. Files changed

**New (5):** `packages/contracts/src/scenario-certification-model.ts` ·
`lib/scenario-certification.ts` · `lib/scenario-runtime.ts` ·
`tests/unit/run-sci02-certification-tests.ts` · `tests/fixtures/scenario/no-promotion-scenario.ts`.

**Modified (5):** `packages/contracts/src/index.ts` (export) ·
`app/api/v1/_shared/scenario-request.ts` · `app/api/v1/scenarios/route.ts` ·
`app/api/v1/signals/[id]/route.ts` (all three routed through the gated runtime) ·
`tests/unit/run-canonical-scenario-tests.ts` (§14 catalogue run, §15 gate guards, duplicate section
number corrected, header documenting the split).

**No engine was changed.** No `SCI-01` contract file was touched — all four are byte-identical to
`1a3b2d64`, verified by diff.

**Governance (6):** `ARCHITECTURE_DECISIONS.md` · `COGNIX_SCENARIO_CERTIFICATION.md` ·
`COGNIX_SCENARIO_INTELLIGENCE.md` · `COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md` ·
`COGNIX_ATLAS_RESIDUAL_REGISTER.md` · `MASTER_PLAN.md`.

## 12. Contracts evaluated for freeze

| Contract | Owner | State |
|---|---|---|
| Scenario Contract | `SCI-01` | Implemented, byte-identical to `SCI-01`. **Not frozen** |
| Scenario Clock | `SCI-01` | Implemented, byte-identical. **Not frozen** |
| Scenario Registry & Activation | `SCI-01` | Implemented, byte-identical; the activation seam is now consumed by the gate as designed. **Not frozen** |
| Provenance Vocabulary | `SCI-01` | Implemented, byte-identical. **Not frozen** |
| Scenario Certification | `SCI-02` | Implemented and exercised. **Not frozen** |

**Nothing is frozen, because Gate A did not pass.** ADR-084 part 2 freezes a contract at a declared
convergence SHA, and no convergence SHA exists. Recording a freeze on the strength of the code
existing would be the status-follows-intent failure ADR-084 part 5 exists to prevent.

## 13. Gate A — NOT PASSED

Condition by condition, in `COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md` §9. Summary:

**Passing (7):** both lane branches pushed · independent packet tests green on each branch · no
contract drift (verified by diff) · full regression with `R-25` as the only failure · certification
green for every registered scenario (not yet required at Gate A) · protected journey reconciled to
the digit · browser acceptance at three widths with the Docker limitation recorded.

**Open (3):**

1. **Condition 3 — the deliberate convergence merge has not been performed.** `SCI-02` was cut from
   the `SCI-01` head exactly and has not drifted, but §5 reserves the merge onto
   `feature/cognix-sci-wave0-convergence` to one operator in one place. No packet may perform it on
   its own authority, and this one was explicitly not authorised to.
2. **Condition 9 — the Wave-2 cross-lane contracts are not declared.** Signal Materiality & Decision
   Relevance, Refresh Operation and Models & Methods are owned by `SCI-05` and are due to be declared
   at this gate under the §0 rule. `SCI-01` did not declare them; `SCI-02` does not own them. **This
   is the condition that most needs an owner**, because `SCI-06` is built against these contracts in
   Wave 2 while `SCI-05` implements them — which is the whole mechanism that lets the two lanes run
   without contending.
3. **Condition 10 — no convergence SHA is recorded**, because 3 and 9 are open.

**Consequence:** no contract is frozen, Wave 1 is not authorised, `SCI-03` and `SCI-04` are not cut.
The three open conditions are convergence actions and a contract declaration — **not implementation
defects**. The Wave-0 code is complete and green.

## 14. Genuine residuals

| ID | What | Disposition |
|---|---|---|
| `R-25` | `ATL-06B` `A6b` stale; the estate carries two Google SDKs | **Unchanged, untouched.** Out of `SCI` scope by the programme record. Still the only failing assertion in the estate |
| `R-26` | CDI-03 scores still derive from a name hash | Unchanged from `SCI-01`. Held as a declared exclusion in the §13 guard |
| `R-27` | **The engines still resolve against the reference scenario**, so no second scenario can certify `C-5`/`C-7`/`C-8`/`C-12` | **New.** A precondition for `SCI-03`, surfaced by the gate rather than by a client |
| `R-28` | The `cognix-world` service does not install the certification gate | **New.** Bounded today — one scenario is registered and it is certified. For whichever packet first registers a second scenario in that process |
| `R-29` | A retired mechanism (`skuContextFactor`) is still described in the present tense in `campaign-frontier-engine.ts` | **New, minor.** One line; recorded rather than corrected, because cleanup outside `SCI-02` was out of scope |
| Docker acceptance | Image registry refused by egress policy | Re-attempt at convergence if the registry becomes reachable |

## 15. Convergence recommendation

1. **Do not cut Wave 1.** Gate A has not passed.
2. **Declare the three Wave-2 contracts** (Signal Materiality & Decision Relevance, Refresh
   Operation, Models & Methods). This is the substantive open condition and it needs an owner — it is
   `SCI-05`'s to declare, and it must happen before Wave 1 so that Wave 2 can run two lanes.
3. **Perform the Wave-0 convergence merge** deliberately, by one operator, onto
   `feature/cognix-sci-wave0-convergence`: `SCI-01` then `SCI-02`, both already in a linear
   ancestry, so the merge is trivial and should stay that way.
4. **Re-run the gate evidence on the convergence branch** — the full estate, the certification gate
   over the catalogue, the protected journey, and browser acceptance — then record **SHA-A**.
5. **Sequence `R-27` before `SCI-03` starts.** A curated pack cannot be certified, and therefore
   cannot be demo-active, until the engines resolve against the scenario they are asked about. It is
   better understood as `SCI-03`'s first task than as a residual it inherits.
