# CogniX Scenario Intelligence — Work Packets (`SCI`)

**Status:** Authorised for implementation. **WAVE 2 COMPLETE AND CONVERGED. `SCI-05` (with the
`R-37` and `R-38`/`R-39` pre-convergence repairs) and `SCI-06` were both committed independently
from SHA-B and converged deliberately onto `feature/cognix-sci-wave2-convergence` on 2026-09-18.
GATE C PASSED (2026-09-18) — see §9 — and WAVE 3 IS AUTHORISED: `SCI-07` and `SCI-09` may be cut
from SHA-C. See
[`COGNIX_WAVE2_CONVERGENCE_GATE_C_ASSESSMENT.md`](../reports/COGNIX_WAVE2_CONVERGENCE_GATE_C_ASSESSMENT.md).
Wave 0 COMPLETE and converged. `SCI-01` and `SCI-02`
delivered (2026-09-16); GATE A PASSED (2026-09-17) — see §9. Wave 1 DELIVERED and CONVERGED:
`SCI-03` (2026-09-17, `feature/cognix-sci-03-curated-scenarios`) and `SCI-04` (2026-09-17,
`feature/cognix-sci-04-scenario-selection`) are both committed and were converged deliberately onto
`feature/cognix-sci-wave1-convergence` on 2026-09-17. Gate B was OPEN on the cross-surface invariant
(`R-35`); `SCI-03R` — Scenario Perspective Binding closed it on
`feature/cognix-sci-03r-scenario-perspective-binding`, and every condition was re-run from the
repaired state. GATE B PASSED (2026-09-17) — see §9. WAVE 2 IS AUTHORISED: `SCI-05` and `SCI-06` may
be cut from SHA-B. See
[`COGNIX_WAVE1_CONVERGENCE_GATE_B_ASSESSMENT.md`](../reports/COGNIX_WAVE1_CONVERGENCE_GATE_B_ASSESSMENT.md)
and [`COGNIX_SCI_03R_SCENARIO_PERSPECTIVE_BINDING.md`](../reports/COGNIX_SCI_03R_SCENARIO_PERSPECTIVE_BINDING.md).**
**Authorised:** 2026-09-15 against baseline `f9c5679c` on `feature/cognix-enterprise-demo-hardening`.
**Governs:** programme `SCI` — the Scenario Laboratory.
**Execution model:** two agents, **Cursor** and **Antigravity**, concurrently where the dependency
graph permits. Discipline is ADR-084.
**Architecture:** [`COGNIX_SCENARIO_INTELLIGENCE.md`](COGNIX_SCENARIO_INTELLIGENCE.md).
**Gate:** [`COGNIX_SCENARIO_CERTIFICATION.md`](COGNIX_SCENARIO_CERTIFICATION.md).

---

## 0. How the decomposition was derived

The planning report proposed five conceptual areas. They are **not** the packet boundaries, because a
conceptual area is the wrong unit for parallel execution: scenario contract changes and the scenario
selector belong to one feature and must not sit in one packet, or the two agents contend for the same
contract. Every area is therefore split on the **contract/consumer seam**, which is the only seam that
makes two lanes independently commit-able and independently revertible.

Ten packets. Four of the five areas split into an engine packet and an experience packet; the
architecture surface stays whole because it has no engine half.

**One structural improvement over the suggested wave plan.** The suggested Wave 1 gives Antigravity
the scenario selector while Cursor is still building the catalogue that the selector selects from —
so Antigravity is starved or, worse, invents a shape the catalogue then contradicts. The fix is to
separate **registry** from **packs**: the scenario registry, activation and selection contract is
*identity*, so it belongs in Wave 0 with `SCI-01`; the scenario packs are *content*, so they belong
in Wave 1 with `SCI-03`. Antigravity then builds selection against a contract frozen a wave earlier,
and the lanes never touch.

**The rule this generalises to, and it is what makes every later wave work:**

> A contract owned by a Wave-N packet that a Wave-N parallel partner must consume is **declared and
> frozen at the Wave N-1 convergence gate**, not when its implementation lands.

## 1. Packet inventory

| ID | Title | Class | Tool | Wave | Status |
|---|---|---|---|---|---|
| `SCI-01` | Scenario Contract, Clock, Registry & Provenance Foundation | **FOUNDATION** | Cursor | 0 | **[COMPLETED 2026-09-16]** |
| `SCI-02` | Scenario Certification Gate & Reconciliation Generalisation | **FOUNDATION** | Cursor | 0 | **[COMPLETED 2026-09-16]** |
| `SCI-03` | Curated Scenario Domain Packs | CURSOR | Cursor | 1 | **[COMPLETED 2026-09-17]** |
| `SCI-04` | Scenario Selection Experience | ANTIGRAVITY | Antigravity | 1 | **[COMPLETED 2026-09-17]** |
| `SCI-05` | Living Evidence Engine — Materiality, Decision Relevance, Refresh (`ESF-4`) | CURSOR | Cursor | 2 | **[COMPLETED 2026-09-17]** |
| `SCI-06` | Observability & Governance Experience | ANTIGRAVITY | Antigravity | 2 | **[COMPLETED 2026-09-17 · CONVERGED 2026-09-18]** |
| `SCI-07` | Scenario Authoring Domain & Governed GenAI Drafting | CURSOR | Cursor | 3 | Not started |
| `SCI-09` | CogniX Architecture Surface & `SB-GATE` Closure | ANTIGRAVITY | Antigravity | 3 | Not started |
| `SCI-08` | Create Your Own Scenario Experience | **POST-DEMO** | Antigravity | 4 | Not started |
| `SCI-10` | CSV Scenario Enrichment via Attested Admission | **POST-DEMO** | Cursor | 4 | Not started |

`SCI-08` is numbered before `SCI-09` and scheduled after it: the numbers follow the conceptual areas,
the waves follow the dependency graph, and renumbering to make them agree would make the packet IDs
disagree with the planning report they came from.

## 2. Dependency DAG

```text
                       ┌──────────────────────────────┐
                       │ BASE: f9c5679c               │
                       └───────────────┬──────────────┘
                                       ▼
  WAVE 0  (Cursor only — no parallelism is possible or attempted)
                       ┌──────────────────────────────┐
                       │ SCI-01  Contract · Clock ·   │  owns 4 contracts
                       │         Registry · Provenance│
                       └───────────────┬──────────────┘
                                       ▼
                       ┌──────────────────────────────┐
                       │ SCI-02  Certification Gate   │  owns 1 contract
                       └───────────────┬──────────────┘
                                       ▼
                            ══ GATE A → SHA-A ══
                        (freezes Wave-2 contracts too)
                          ┌────────────┴────────────┐
  WAVE 1                  ▼                         ▼
              ┌───────────────────┐     ┌────────────────────────┐
              │ SCI-03 Packs      │     │ SCI-04 Selection UX    │
              │ (Cursor)          │     │ (Antigravity)          │
              └─────────┬─────────┘     └───────────┬────────────┘
                        └────────────┬──────────────┘
                            ══ GATE B → SHA-B ══
                          ┌────────────┴────────────┐
  WAVE 2                  ▼                         ▼
              ┌───────────────────┐     ┌────────────────────────┐
              │ SCI-05 Living     │     │ SCI-06 Observability   │
              │  Evidence (Cursor)│     │  Experience (Antigrav.)│
              └─────────┬─────────┘     └───────────┬────────────┘
                        └────────────┬──────────────┘
                            ══ GATE C → SHA-C ══   ◄── 23 SEPTEMBER TARGET
                          ┌────────────┴────────────┐
  WAVE 3                  ▼                         ▼
              ┌───────────────────┐     ┌────────────────────────┐
              │ SCI-07 Authoring  │     │ SCI-09 Architecture    │
              │  + GenAI (Cursor) │     │  Surface (Antigravity) │
              └─────────┬─────────┘     └───────────┬────────────┘
                        └────────────┬──────────────┘
                            ══ GATE D → SHA-D ══
                          ┌────────────┴────────────┐
  WAVE 4  (post-demo)     ▼                         ▼
              ┌───────────────────┐     ┌────────────────────────┐
              │ SCI-10 CSV        │     │ SCI-08 Create Your Own │
              │  admission(Cursor)│     │  UX (Antigravity)      │
              └───────────────────┘     └────────────────────────┘
```

### 2.1 Two kinds of edge, and why the distinction is load-bearing

An arrow in the graph above is **not** automatically a reason for one agent to wait on the other. Two
kinds exist and they behave differently:

| Edge | Meaning | When it is satisfied | Does it block within a wave? |
|---|---|---|---|
| **Contract edge** | The consumer needs the producer's *contract* | At the **previous** convergence gate, by the §0 freeze rule | **No** |
| **Content edge** | The consumer needs the producer's *output* to demonstrate or reconcile | At **this** wave's convergence gate | **No — it converges at the gate** |

**Neither kind blocks mid-wave.** That is the whole point of freezing contracts a gate early: a lane
never idles waiting for its partner, and the two only meet at the gate.

**Edges, stated as rules rather than drawn:**

| Edge | Kind | Satisfied at |
|---|---|---|
| `SCI-01 → SCI-02` | Sequential — same wave, **single lane by design** | In-wave; Wave 0 is not parallel |
| `SCI-02 → {SCI-03, SCI-05, SCI-07}` | Contract (certification) | Gate A |
| `SCI-01 → SCI-04` | Contract (registry, clock, scenario) | Gate A |
| `SCI-03 → SCI-04` | **Content** — the selector needs scenarios to select | Gate B |
| `SCI-05 → SCI-06` | **Contract**, declared at Gate A and implemented in Wave 2 | Gate A (contract) / Gate C (content) |
| `SCI-05 → SCI-09` | Contract (Models & Methods) | Gate B |
| `SCI-07 → {SCI-08, SCI-10}` | Contract (Scenario Draft), declared at Gate B | Gate B |

**Worked example, because this is the most likely misreading.** In Wave 2, Antigravity builds `SCI-06`
against the Refresh and Models & Methods contracts **frozen at Gate A**, while Cursor implements them
in `SCI-05`. Antigravity does not wait. The two meet at Gate C, where `SCI-06` is reconciled against
the real implementation. If `SCI-05` needs a contract change during the wave, that is a **convergence
event raised at Gate C** (ADR-084 part 2) — not a mid-wave renegotiation between agents.

**The DAG is acyclic.** The critical path is four packets deep (`SCI-01 → SCI-02 → SCI-05 → SCI-06`
and `→ SCI-09`).

## 3. Frozen contracts and their owners

**ADR-084 part 1: exactly one owning packet per contract.** Every other packet consumes it frozen.

| Contract | Owner | Frozen at | Consumers |
|---|---|---|---|
| **Scenario Contract** — `CanonicalScenario` as an instantiable model; the derivation signatures | `SCI-01` | Gate A | 02, 03, 05, 07, 10 |
| **Scenario Clock** — `scenarioNow`, period mapping, freshness basis | `SCI-01` | Gate A | 02, 03, 05, 06, 07 |
| **Scenario Registry & Activation** — catalogue shape, identity resolution, selection/activation API, no-default rule | `SCI-01` | Gate A | 03, 04, 06, 07, 08 |
| **Provenance Vocabulary** — `origin` / `method` / `authority` and the mapping from the five existing enums | `SCI-01` | Gate A | 05, 06, 07, 09, 10 |
| **Scenario Certification** — dimension set, verdicts, `NOT_APPLICABLE` reason, certification state | `SCI-02` | Gate A | 03, 07, 08, 10 |
| **Signal Materiality & Decision Relevance** | `SCI-05` | **declared at Gate A**, implemented in Wave 2 | 06 |
| **Refresh Operation** — advance, delta shape, decision-consequence statement | `SCI-05` | **declared at Gate A**, implemented in Wave 2 | 06 |
| **Models & Methods** — the register's published shape | `SCI-05` | **declared at Gate A**, implemented in Wave 2 | 06, 09 |
| **Scenario Draft** — `GENAI_DRAFT` envelope, allowlist, validation verdicts | `SCI-07` | **declared at Gate B**, implemented in Wave 3 | 08, 10 |
| **Attested Upload** — CSV source registration and admission mapping over `ESF-6` | `SCI-10` | Gate C | 08 |

No packet may alter a contract it does not own. A required change is raised at the convergence gate
and re-frozen there — it is a convergence event, not a commit (ADR-084 part 2).

## 4. Concurrency matrix

| Packet | May run concurrently with | **Must not** run concurrently with | Reason |
|---|---|---|---|
| `SCI-01` | nothing | all | Owns four foundational contracts; Wave 0 is single-lane by construction |
| `SCI-02` | nothing | all | Generalises the reconciliation suite — the one file every packet's acceptance depends on |
| `SCI-03` | `SCI-04` | `SCI-05`, `SCI-07`, `SCI-10` | Those also write scenario-domain and contract files |
| `SCI-04` | `SCI-03` | `SCI-06`, `SCI-08`, `SCI-09` | All four touch navigation and shell composition |
| `SCI-05` | `SCI-06` | `SCI-03`, `SCI-07`, `SCI-10` | Contract and engine contention |
| `SCI-06` | `SCI-05` | `SCI-04`, `SCI-09`, `SCI-08` | All touch Observability composition or navigation |
| `SCI-07` | `SCI-09` | `SCI-03`, `SCI-05`, `SCI-10` | Contract and engine contention |
| `SCI-09` | `SCI-07` | `SCI-04`, `SCI-06`, `SCI-08` | Navigation and Observability composition |
| `SCI-08` | `SCI-10` | `SCI-04`, `SCI-06`, `SCI-09` | Navigation and shell composition |
| `SCI-10` | `SCI-08` | `SCI-03`, `SCI-05`, `SCI-07` | Contract and engine contention |

**The invariant behind the matrix:** at most one Cursor packet and one Antigravity packet are
authorised at any time, and the two never share a file. Two Antigravity packets never run together
because every one of them composes navigation.

## 5. Branching and merge strategy

Repository convention observed at `f9c5679c`: `feature/<topic>` (`feature/cognix-enterprise-demo-hardening`).
Naming follows it.

| Wave | Base | Cursor branch | Antigravity branch | Convergence branch |
|---|---|---|---|---|
| 0 | `b5bf1bd9` | `feature/cognix-sci-01-scenario-contract` → `feature/cognix-sci-02-certification-gate` | — | `feature/cognix-sci-wave0-convergence` → **SHA-A** |

**Wave 0 base, corrected against measurement.** This record names `f9c5679c` as the base because that
was the head when the programme was authorised. The authorisation commit itself — the one that added
this record — is `b5bf1bd9`, and it is the commit `SCI-01` was cut from. Stated here rather than
silently, because a packet branch cut from a different SHA than the register names is exactly the
drift ADR-084 part 2 exists to prevent.
| 1 | SHA-A | `feature/cognix-sci-03-scenario-packs` | `feature/cognix-sci-04-scenario-selection` | `feature/cognix-sci-wave1-convergence` → **SHA-B** |
| 2 | SHA-B | `feature/cognix-sci-05-living-evidence` | `feature/cognix-sci-06-observability-experience` | `feature/cognix-sci-wave2-convergence` → **SHA-C** |
| 3 | SHA-C | `feature/cognix-sci-07-scenario-authoring` | `feature/cognix-sci-09-architecture-surface` | `feature/cognix-sci-wave3-convergence` → **SHA-D** |
| 4 | SHA-D | `feature/cognix-sci-10-csv-admission` | `feature/cognix-sci-08-create-your-own` | `feature/cognix-sci-wave4-convergence` → **SHA-E** |

**Rules.** Neither agent commits directly to `feature/cognix-enterprise-demo-hardening` during a wave.
Each packet branch is cut from the declared base SHA and from nothing else. Convergence merges the two
lane branches deliberately, in one place, by one operator. The convergence SHA is recorded in this
document before the next wave is cut. A packet branch that has drifted from its base is rebased
before convergence, never during.

## 6. Convergence gates

Every gate requires all of the following, evidenced, before the next wave is cut (ADR-084 part 4):

1. Both lane branches committed and pushed.
2. Independent packet tests green **on each branch separately**.
3. Deliberate merge or rebase against the declared base — never an incidental merge.
4. **No unresolved contract drift**: every contract in §3 is byte-identical to its frozen form, or its
   change has been re-frozen at this gate and recorded.
5. Full relevant regression — at minimum the whole `tests/unit/run-*.ts` estate. **Baseline at
   `f9c5679c` is 43 of 44 runners fully green**, with `run-atl06b-tests` failing one stale assertion
   (`A6b`, residual `R-25`). A gate passes when no runner regresses against that baseline; `R-25` is
   not a licence for a second failure, and closing it is in scope for whichever packet next touches
   the provider configuration.
6. **Scenario Certification Gate green for every registered scenario** (from Gate B onward).
7. **Protected journey reconciled** — Demand → Promotion → Campaign Decision values unchanged to the
   digit against `COGNIX_PRESENTATION_SYNC_DELTA.md` §1 and §2.
8. Browser acceptance at 1440 / 1024 / 720, per the `ADR-062` Amendment A precedent that three defects
   no suite could find were found in a browser.
9. Next wave's cross-lane contracts declared and frozen (§0 rule).
10. Governance status updated **only after** the evidence exists, and the new convergence SHA recorded
    here.

**No wave starts before its predecessor's gate passes.** A gate that fails does not become a warning.

---

# Packet definitions

---

## `SCI-01` — Scenario Contract, Clock, Registry & Provenance Foundation

| | |
|---|---|
| **Class** | FOUNDATION |
| **Tool** | Cursor |
| **Wave / base** | 0 / `f9c5679c` |
| **Branch** | `feature/cognix-sci-01-scenario-contract` |

**Objective.** Make `CanonicalScenario` the single scenario identity, give the scenario authority over
time, establish the registry through which scenarios are resolved and activated, and declare one
provenance vocabulary.

**Business outcome.** Removes the live `SCN-PROMO-01` / FreshDirect UK contradiction on a governance
surface, and converts every later scenario capability from a structural change into an additive one.

**Scope.** Parameterise the canonical derivations from a module constant to a scenario. Introduce the
scenario registry, identity resolution and activation, with no default resolution anywhere. Thread one
`scenario_id` through Demand, Promotion, Campaign Decision, signals, Shared Decision State, telemetry,
Ripple, Inventory and Observability. Move every deterministic scenario observation onto the scenario
clock. Retire `skuContextFactor` in favour of declared scenario parameters. Fold `ScenarioFamilyId`
onto the canonical record as taxonomy and retire the world-seed economics. Declare the provenance
vocabulary and map the five existing enums onto it.

**Non-scope.** No new scenarios. No UI. No upload. No GenAI. No Refresh behaviour. No change to any
published value of the protected journey. No change to the certification harness — that is `SCI-02`.

**Owns.** Scenario Contract · Scenario Clock · Scenario Registry & Activation · Provenance Vocabulary.
**Consumes.** Nothing.

**Likely ownership.** `packages/contracts/src/canonical-scenario-model.ts`,
`enterprise-world-model.ts`, `enterprise-world-seed.ts`, `decision-state-model.ts`,
`lib/campaign-causal-engine.ts`, `lib/campaign-archetypes.ts`,
`lib/demand-decision-frontier/demand-frontier-engine.ts`, `lib/world-client.ts`,
`services/world/src/enterprise-signal-generator.ts`, `app/api/v1/scenarios/route.ts`,
`app/api/v1/signals/*`.

**Dependencies.** None. **Concurrent with.** Nothing.

**Backlog.** Supersedes the world-seed economics of `Phase 10B`. Partially discharges `DEMO-HARD-03`
where a seeded narrative is replaced by a derived scenario value. Merges the `ADR-075` residual band.

**Tests.** Extend `run-canonical-scenario-tests.ts` in place — generalisation is `SCI-02`. New source
guards: no literal scenario default on any route; no civil-time accessor in deterministic scenario
evidence; no hash-derived economic modifier in source.

**Cross-surface invariants.** The protected journey's published values are unchanged to the digit.
Exactly one supplier is named for the canonical scenario across economics and signals. Two consecutive
identical signal reads are byte-identical **including timestamps**.

**Browser acceptance.** Observability & Governance signals panel shows the canonical scenario and
Cheshire Cheese Co, not `SCN-PROMO-01` and FreshDirect UK. Demand, Promotion and Campaign Decision
unchanged.

**Security / GenAI.** None introduced. No change to any credential path.

**Certification obligations.** Makes certification possible; is not certified by it.

**Definition of done.** All 44 runners green. Protected values reconciled. No default scenario
resolution. No civil time in deterministic evidence. `skuContextFactor` absent from source.

**Handoff artefact.** The four frozen contracts, published as the Wave 0 convergence record, plus a
declaration of the Wave-2 contracts to be frozen at Gate A.

---

### `SCI-01` outcome — **[COMPLETED 2026-09-16]**

Evidence: [`COGNIX_SCI_01_SCENARIO_FOUNDATION_REPORT.md`](../reports/COGNIX_SCI_01_SCENARIO_FOUNDATION_REPORT.md).

| Definition-of-done clause | Result |
|---|---|
| All runners green | **42 runners measured at the baseline, not 44** — the count in this record had drifted. 41 fully green; `run-atl06b-tests` fails only assertion `A6b`, which is `R-25` and is byte-identical to the baseline failure (132 passed, 1 failed). No new failure |
| Protected values reconciled | `COGNIX_PRESENTATION_SYNC_DELTA.md` §1 and §2 unchanged to the digit, re-measured in the browser. §3.1 Promotion tiers moved; the cause is ADR-079 and it is recorded there |
| No default scenario resolution | Guard 1 in `run-canonical-scenario-tests.ts` §11. `GET /api/v1/signals` without `scenario_id` returns `HTTP 400` |
| No civil time in deterministic evidence | Guard 2 in §11, plus byte-identical consecutive reads including timestamps |
| `skuContextFactor` absent from source | Guard 3 in §11, with one declared exclusion carrying `R-26`'s reasoning |

**Assertion count did not fall:** the canonical suite runs **260** assertions, up from 243.

**One correction the packet did not anticipate.** Retiring the hash showed that the seeded elasticity
curve had been calibrated against the hashed engine. The curve is now derived from the record's
declared terms, which moves the Promotion surface's published figures. ADR-079 part 3 anticipated the
possibility — *"if it does not, the seam is larger than the hash and that is a finding worth having"* —
and this is that finding, with the arithmetic recorded at `R-21`.

**Two governance drifts corrected against measurement rather than restated:** this record said 44
runners where there are 42, and the Master Plan's assertion count is corrected in the same commit.

---

## `SCI-02` — Scenario Certification Gate & Reconciliation Generalisation

| | |
|---|---|
| **Class** | FOUNDATION |
| **Tool** | Cursor |
| **Wave / base** | 0 / `SCI-01` head |
| **Branch** | `feature/cognix-sci-02-certification-gate` |

**Objective.** Generalise the cross-surface reconciliation suite to run per scenario and implement the
Scenario Certification Gate.

**Business outcome.** A second scenario can no longer create a second disconnected economic universe.
This is the guard that makes a catalogue safe.

**Scope.** Turn the 243 assertions into a scenario-parameterised harness executed over the registered
catalogue. Implement the twelve certification dimensions, the `PASS` / `FAIL` / `NOT_APPLICABLE`
verdicts with recorded reasons, and the certification state on the scenario record. Enforce that only a
certified scenario may be demo-active. Certify `SCN-FRESH-DAIRY-CHEDDAR-001` through the same gate.

**Non-scope.** No new scenarios. No UI. No weakening of any assertion. No engine change beyond what the
harness requires.

**Owns.** Scenario Certification. **Consumes.** All four `SCI-01` contracts.

**Likely ownership.** `tests/unit/run-canonical-scenario-tests.ts` and a new certification module
under `packages/contracts/src`.

**Dependencies.** `SCI-01`. **Concurrent with.** Nothing — it owns the file every other packet's
acceptance depends on.

**Backlog.** None superseded. Establishes the mechanism ADR-073 Amendment A relies on.

**Tests.** The harness is the test. Assertion count per scenario must not fall below today's coverage.

**Cross-surface invariants.** The canonical scenario certifies. Its published values are unchanged.

**Browser acceptance.** None required; no surface changes.

**Certification obligations.** Owns the gate.

**Definition of done.** Harness runs per scenario. Canonical scenario `CERTIFIED`. An uncertified
scenario cannot be activated. Master Plan assertion count corrected against measurement.

**Handoff artefact.** The certification contract and the first certification result. **Gate A.**

---

### `SCI-02` outcome — **[COMPLETED 2026-09-16]**

Cut from `1a3b2d64`, the `SCI-01` head. Evidence:
[`COGNIX_SCI_02_CERTIFICATION_GATE_REPORT.md`](../reports/COGNIX_SCI_02_CERTIFICATION_GATE_REPORT.md).

| Definition-of-done clause | Result |
|---|---|
| Harness runs per scenario | `lib/scenario-certification.ts` executes the twelve dimensions as functions of a scenario, over the registered catalogue. **84 checks per scenario** |
| Canonical scenario `CERTIFIED` | `SCN-FRESH-DAIRY-CHEDDAR-001` passes all twelve dimensions, none resting on a declared non-applicability |
| An uncertified scenario cannot be activated | Proven by refusal in `run-sci02-certification-tests` §5 and in the canonical suite §14, not by comment. A test fixture failing six dimensions is refused activation, and the refusal names the dimensions |
| Master Plan assertion count corrected against measurement | Corrected to **275** (canonical suite) plus **84** per scenario in the harness |

**Assertion count did not fall.** Canonical suite 260 → **275**. New `SCI-02` suite: **53**. Harness:
**84** executed checks per registered scenario. Estate: **43 runners, 42 fully green**, `run-atl06b-tests`
failing only `A6b` — `R-25`, byte-identical to the baseline.

**One assertion changed, and it was corrected rather than weakened.** `C-8` initially failed the
reference scenario at 47,093 against 72,450 because the check omitted the scenario's own declared
substitution-recovery share. §5 decides that case — *if the gate cannot certify the reference
scenario, the gate is wrong* — so the check was corrected to the full declared expression and
strengthened with a companion assertion that the recovery term is actually applied rather than merely
declared.

**What the gate revealed, and it is the finding of this packet.** `SCI-01` parameterised the
CONTRACT; the ENGINES still read the canonical-bound layer. The harness probes those engine surfaces
with the scenario under test, so a second scenario fails `C-5`, `C-7`, `C-8` and `C-12` with the
divergence named. **That is the gate working**: a catalogue is safe precisely because a second
scenario cannot reach a demonstration while the engines answer with the first one's economics.
Registered as `R-27`, and it is now `SCI-03`'s precondition rather than a client's discovery.

---

## `SCI-03` — Curated Scenario Domain Packs

| | |
|---|---|
| **Class** | CURSOR |
| **Tool** | Cursor |
| **Wave / base** | 1 / SHA-A |
| **Branch** | `feature/cognix-sci-03-curated-scenarios` (delivered; this record previously named `feature/cognix-sci-03-scenario-packs` and the implementation directive named the branch above — the delivered branch is authoritative) |

**Objective.** Promote `ARCH-SUPPLY-CONSTRAINED` and `ARCH-PREMIUM-ARTISAN` to full certified
scenarios by supplying the world half each archetype lacks.

**Business outcome.** One platform telling three genuinely different retail decision stories — a
capacity-bound decision and a do-not-discount decision alongside the canonical promotion decision.

**Scope.** Author estate, calendar, demand movement and attribution, supply and flex, and inventory for
each new scenario. Bind each to its archetype projection and its `ScenarioFamilyId` taxonomy. Author a
signal timeline per scenario on the scenario clock. Per-scenario deterministic reset. Certify both.

**Non-scope.** No selection UI — that is `SCI-04`. No further archetypes. No new engines, no
per-scenario economic model, no operating-model abstraction. No online fulfilment economics.

**Owns.** No contract. **Consumes.** All `SCI-01` and `SCI-02` contracts, frozen.

**Likely ownership.** New scenario pack modules under `packages/contracts/src`; archetype binding in
`lib/campaign-archetypes.ts`; signal timeline seeds in `services/world/src`.

**Dependencies.** `SCI-02`. **Concurrent with.** `SCI-04`. **Never with.** `SCI-05`, `SCI-07`, `SCI-10`.

**Backlog.** Merges the useful residue of `Phase 10B` (temporal scenario families) onto the canonical
model. `Phase 12` industry packs remain distinct and deferred.

**Tests.** Certification green for all three scenarios. Determinism and reset per scenario. Signals
bound to the correct scenario identity and supplier.

**Cross-surface invariants.** Each scenario reconciles internally. The canonical scenario is untouched.
Switching scenario changes economics, signals and recommendations — not labels.

**Browser acceptance.** Each scenario produces materially different recommendations on at least three
surfaces. Deferred to `SCI-04` where a selector is required to reach them; until then via direct
activation.

**Security / GenAI.** None.

**Certification obligations.** Both new scenarios `CERTIFIED` before the gate.

**Definition of done.** Three certified scenarios. Full regression green. No assertion weakened.

**Handoff artefact.** Certification results for three scenarios.

### `SCI-03` delivery record — 2026-09-17

**Delivered.** Two full `CanonicalScenario` instances registered beside the protected reference
scenario, all three `CERTIFIED` on all twelve dimensions at 84 applicable checks each, and `R-27`
closed before either pack was authored.

| | `SCN-FRESH-DAIRY-CHEDDAR-001` | `SCN-CHILLED-SALMON-002` | `SCN-BAKERY-SOURDOUGH-003` |
|---|---|---|---|
| SKU / supplier | P004 / SUP002 Cheshire Cheese Co | P048 / SUP006 Foodvest Fish | P023 / SUP011 Allied Bakeries |
| family / archetype | `promotion_surge` / `ARCH-CHILLED-ELASTIC` | `supplier_breach` / `ARCH-SUPPLY-CONSTRAINED` | `fresh_perishable_waste` / `ARCH-PREMIUM-ARTISAN` |
| scenario clock / horizon | 2026-06-03 / 14d | 2026-07-15 / 14d | 2026-09-09 / 7d |
| base week / allocation | 350,000 / 1.10 | 47,040 / 1.02 | 26,040 / 1.06 |
| elasticity / supplier funding | 2.4pp per point / 35% | 2.2pp per point / 60% | 0.8pp per point / 10% |
| committed depth | 20% | 10% | 10% |
| **derived recommendation** | **14%** — shallower than the plan | **10%** — the committed depth already wins | **0% — do not promote** |
| binding constraint | margin | landed supply: 24.4pp of base exposed | margin, then same-day waste |

**The recommendation is derived, not declared.** `is_cognix_recommended` was removed from the depth
tiers and is now computed as the tier returning the most contribution;
`assertRecommendationIsDerived` holds it there. The bakery pack is the case that proves it matters:
at 0.8pp per point against 10% supplier funding, every plotted depth destroys contribution and no
seeded label would ever have said so.

**`R-27` CLOSED.** A third derivation layer — `scenarioInScope()` / `withScenarioInScope()` /
`inScope*` — sits beside layer A (`scenarioX(scenario, …)`) and layer B (`canonicalX(…)`). Engines
read layer C. The certification harness binds the scenario under test without activating it, because
ADR-080 gates activation ON certification. Six module constants became functions. A source guard
asserts no engine names a pack and no engine compares a scenario identity against a literal.

**The protected journey is bit-for-bit unchanged.** A 385-line value probe run at SHA-A and at this
head is identical: 20% → +44.16% / −£5,167; 14% → +33.65% / +£32,976; exposure £47,093; Decision Gap
18.6pp on a 699,996-unit base. Confirmed again in Chromium at 1440 / 1024 / 720.

**Opened.** `R-30` — the family temporal series contradicts a certified scenario's own record, in
direction as well as scale. Stopped being served rather than rescaled; assigned to `SCI-05`, whose
Refresh contract already declares the shape a real per-scenario history belongs in.

**Not done, and deliberately.** No selection UI (`SCI-04`). No scope-response multipliers on either
pack — neither scenario has a declared reason for one, and inventing one to look richer is what
ADR-079 forbids. `R-25` untouched. `R-29` untouched: `SCI-03` does not touch the frontier engine.

---

## `SCI-04` — Scenario Selection Experience

| | |
|---|---|
| **Class** | ANTIGRAVITY |
| **Tool** | Antigravity |
| **Wave / base** | 1 / SHA-A |
| **Branch** | `feature/cognix-sci-04-scenario-selection` |

**Objective.** Deliver **Choose a Scenario** over the frozen registry contract, within the existing
CogniX visual system.

**Business outcome.** The laboratory proposition becomes visible and demonstrable.

**Scope.** Extend `ScenarioContextStrip` to state the active decision case and offer change and
restart. A selection experience presenting each scenario by the decision it poses. Activation through
the frozen registry API. Certification state surfaced where a scenario is not selectable.

**Non-scope.** No scenario content — that is `SCI-03`. No new contract. No visual redesign: navigation
language, typography, colour system, component patterns and page composition are preserved. No
Observability changes. No authoring.

**Owns.** No contract. **Consumes.** Scenario Registry & Activation, Scenario Contract, Scenario
Certification — all frozen at Gate A.

**Likely ownership.** `components/ScenarioContextStrip.tsx`, `components/ScenarioControls.tsx`, a new
selection component, and the single shell mount point.

**Dependencies.** `SCI-01` contracts (Gate A). Content from `SCI-03` arrives at Gate B.
**Concurrent with.** `SCI-03`. **Never with.** `SCI-06`, `SCI-08`, `SCI-09`.

**Backlog.** None.

**Tests.** Selection and activation against the frozen contract. Restart determinism from the UI path.
No hard-coded scenario identity in any component.

**Cross-surface invariants.** Every surface reflects the active scenario after activation. No surface
retains prior-scenario state across a switch.

**Browser acceptance.** 1440 / 1024 / 720. Navigation reachable at every breakpoint — `R-11` closed a
defect where it was not. Switching and restarting are visibly deterministic.

**Security / GenAI.** None.

**Certification obligations.** Must not present an uncertified scenario as selectable.

**Definition of done.** A presenter selects and restarts a scenario without touching an API.
Regression green. No visual-system drift.

**Handoff artefact.** Selection experience over frozen contracts, ready to reconcile with `SCI-03`
content at Gate B.

---

### `SCI-04` outcome — **[COMPLETED 2026-09-17]**

Cut from `13ce376e19239a4081e6c68764e470733ffc52b5` (Wave-0 convergence HEAD).
Implemented client-facing scenario selection experience ("Choose a Scenario") strictly over frozen Wave-0 contracts, independent of concurrent `SCI-03` domain pack development.

| Definition-of-done clause | Result |
|---|---|
| Selection and restart from UI path | `components/ScenarioContextStrip.tsx` and `components/ScenarioControls.tsx` expose discoverable "Change" scenario modal and active case "Restart" actions without requiring API knowledge. |
| Dynamic scenario presentation | Active scenario identity and metadata (SKU, category, scope, horizon, supplier) dynamically resolved from canonical contracts / decision state rather than hardcoded literals. |
| Catalogue from frozen contracts | `components/ScenarioSelectorModal.tsx` renders catalogue dynamically through `GET /api/v1/scenarios` with business framing, decision questions, taxonomy, and certification badges. Zero hardcoded economics or SCI-03 archetype keys. |
| Governed activation path | `POST /api/v1/scenarios` activates scenarios via `@/lib/scenario-runtime`, enforcing the Scenario Certification Gate (ADR-080) and resetting session decision state cleanly via `switchScenarioForSession`. |
| Honest uncertified handling | Uncertified or unavailable scenarios clearly display certification state badges and failure reasons in progressive disclosure; activation attempts are blocked and refused by ADR-080. |
| No competing client state | Session decision state is cleanly bound to canonical active scenario via `switchScenarioForSession` in `lib/decision-state-store.ts`; no dual or divergent client-side scenario cache. |
| Visual system preserved | Built strictly within CogniX design language with high-contrast executive presentation, WCAG-compliant keyboard and screen-reader accessibility (`role="dialog"`, `aria-modal`, Escape key), and tested responsiveness across 1440, 1024, and 720 breakpoints. |
| Full regression green | **44 runners fully green, 1 pre-existing failure (`run-atl06b-tests` R-25, untouched)**. Canonical suite (275/275), Gate A (48/48), SCI-02 certification (53/53), Decision State (7/7), and new SCI-04 suite (53/53) all 100% PASS. Production build (`next build`) compiles 74/74 routes cleanly with 0 errors. Gate B remains OPEN awaiting Wave-1 convergence. |

---

## `SCI-05` — Living Evidence Engine: Materiality, Decision Relevance, Refresh (`ESF-4`)

| | |
|---|---|
| **Class** | CURSOR |
| **Tool** | Cursor |
| **Wave / base** | 2 / SHA-B |
| **Branch** | `feature/cognix-sci-05-living-evidence` |

**Objective.** Make `signal → evidence → material change → decision relevance` a computation, and make
Refresh a real scenario operation. **This packet reactivates `ESF-4`.**

**Business outcome.** The weakest surface becomes the most persuasive: a recommendation visibly
changing because evidence changed.

**Scope.** Derive materiality — did an observation move a published quantity and by how much. Derive
decision relevance — did it change a recommendation, readiness verdict or window. Implement Refresh as
advance-one-period on the scenario clock via the existing `simulateEnterpriseSignalTimelines`,
re-evaluate dependent intelligence, and publish a delta including the decision-consequence statement.
Publish the Models & Methods register from the forecast registry and capability knowledge.

**Non-scope.** No UI — that is `SCI-06`. No new signal types. No external connectors. No live internet
dependency in the demo path. **No third confidence score** (ADR-072). No fabricated telemetry.

**Owns.** Signal Materiality & Decision Relevance · Refresh Operation · Models & Methods — all three
declared and frozen at Gate A, implemented here.
**Consumes.** Scenario Contract, Clock, Registry, Provenance, Certification.

**Likely ownership.** `services/world/src/dynamic-signal-simulator.ts`,
`packages/contracts/src/enterprise-signal-model.ts`, `app/api/v1/signals/*`,
`lib/enterprise-signal-client.ts`, `lib/forecast/registry.ts` (read-only), a new materiality module.

**Dependencies.** `SCI-02`; contracts frozen at Gate A. **Concurrent with.** `SCI-06`.
**Never with.** `SCI-03`, `SCI-07`, `SCI-10`.

**Backlog.** **Reactivates `ESF-4`** — its dependency `ESF-6` completed and the G4 sequencing rule
*admission precedes grading* is satisfied. Does **not** absorb `ESF-5` (needs Phase 10F) or `DOT-11`
(roadmap, gated behind `ESF-4`, now unblocked as roadmap but not authorised).

**Tests.** Refresh determinism — same scenario, same period, byte-identical. Materiality derived, never
read from a seed. Decision relevance changes only when a decision changes. Reset returns the as-at
marker. Freshness measured on the scenario clock and identical under `UTC`, `America/New_York` and
`Asia/Tokyo`, following the `D-FM-3` precedent.

**Cross-surface invariants.** A Refresh that changes a recommendation changes it on every surface that
publishes it. The protected journey's opening position is unchanged at as-at zero.

**Browser acceptance.** Deferred to `SCI-06`; API-level evidence required here.

**Security / GenAI.** None introduced. Models & Methods publishes purpose, inputs, output, last run,
scenario applicability and measured error — **never** prompts, tokens, temperature or model
identifiers on a client-facing surface (ADR-067).

**Certification obligations.** Signals dimension `C-4` must stay green for every scenario.

**Definition of done.** Refresh advances, re-evaluates and states decision consequence
deterministically. Materiality and relevance derived. Register published. Regression green.

**Handoff artefact.** Three implemented contracts plus a worked Refresh delta for `SCI-06`.

---

### `SCI-05` outcome — **[COMPLETED 2026-09-17]**

Cut from `cacbb5b364ad6dcab841f7e8bb96557a44054a49`, the Wave-2 base, which carries SHA-B and Gate B
PASSED. Delivered on `feature/cognix-sci-05-living-evidence`. Not merged.

| Definition-of-done clause | Result |
|---|---|
| Refresh advances, re-evaluates and states decision consequence deterministically | `POST /api/v1/evidence/refresh` advances the as-at marker one `SimulationPeriod` on the scenario clock and publishes the `RefreshDelta` with its mandatory consequence statement. Two runs after Restart hash identically; a Refresh is byte-identical under `UTC`, `America/New_York` and `Asia/Tokyo` |
| Materiality and relevance derived | Materiality by leave-one-out over every published quantity; relevance by re-evaluating the decision artefacts under both bodies of evidence. No scenario record carries a field that could author either, asserted |
| Register published | Nine entries per scenario from the forecast registry and the engines that genuinely run, in the ADR-082 vocabulary. GenAI appears only where a credential is configured; otherwise declared `undescribed` with its reason |
| Regression green | **48 runners, 47 fully green, 3,633 assertions.** `R-25`'s `A6b` the only `[FAIL]` line |
| Certification obligations — `C-4` green for every scenario | Three scenarios `CERTIFIED`, 12/12 dimensions, 84 checks, zero `NOT_APPLICABLE`, signals dimension `C-4` PASS |
| No contract drift | All six frozen contracts byte-identical to the Wave-2 base. The three Living Evidence contracts are implemented, never redefined |
| Non-scope held | No `SCI-06` UI, no new signal types, no external connectors, no third confidence score, no provider change |

**`R-30` CLOSED.** Per-scenario evidence timelines from `ESF-2`'s simulator on each scenario's own
clock — 4, 3 and 5 timelines respectively, every amplitude read from the record. Closing it required
fixing the simulator, which still carried the literal ladder `SCI-03` had removed from the generator
and which gave both curated packs the same timeline with the same numbers.

**`R-36` CLOSED as scoped.** The commercial-intent effect was reconstructed as `1 + depth/100` in TWO
places — the projection applied it and the frontier divided it back out. One governed module now
serves both. Published contribution: 19.6pp / 20.9pp / 7.6pp against declared 19.6 / 20.9 / 7.7. The
reference scenario's factor is exactly `1.200000`, unchanged by arithmetic rather than by exemption.

**`R-37` OPENED.** Both curated packs declare an `OBSERVED_BEHAVIOUR` contribution and carry no
signal type that `DDF-01` admits as revising a forecast, so their declared TOTAL still under-reports.
Resolving it is scenario content (`SCI-03`'s) or `DDF-01`'s stability declaration — not `SCI-05`'s to
take unilaterally, and this packet's non-scope forbids new signal types.

**Gate C is NOT passed and convergence has NOT started.** `SCI-06` runs concurrently and owns all
presentation; the domain and API behaviour it consumes is listed in
[`COGNIX_SCI_05_LIVING_EVIDENCE_REPORT.md`](../reports/COGNIX_SCI_05_LIVING_EVIDENCE_REPORT.md) §11.

---

### `R-37` repair — Curated Scenario Observed-Behaviour Evidence Carrier — **[COMPLETED 2026-09-17]**

| | |
|---|---|
| **Class** | Wave-2 pre-convergence repair |
| **Base** | `5450fecf1a88da3431f2ca551a924fc717273adb` (`SCI-05` head) |
| **Branch** | `feature/cognix-r37-observed-behaviour-carrier` |
| **Scope** | The two curated packs' observed-behaviour evidence. Nothing else |

**Objective.** Give Chilled Salmon and Premium Bakery truthful evidence carriers for the
`OBSERVED_BEHAVIOUR` their records declare, so the flow *declared observed behaviour → scenario-specific
evidence → `DDF-01` admitted → forecast revision → published contribution* is real for every certified
scenario rather than only for the reference one.

| Definition-of-done clause | Result |
|---|---|
| Declared observed behaviour arrives through admitted evidence | Published contribution **+10.9pp / +8.0pp / +5.1pp** against declared **10.9 / 8.0 / 5.1**, read off the running Demand surface at 1440, 1024 and 720 |
| `DDF_STABILITY_SIGNAL_TYPES` not widened | Unchanged, and asserted shut against the Gate-A list. No new `CanonicalSignalType` |
| No supply or commercial signal repurposed | The bakery pack's `COMPETITOR_CAMPAIGN_LAUNCH` stays `COMMERCIAL` and stays refused; the customer response is published beside it |
| Nothing hand-written into Demand | No contribution appears as a literal on the path; withdrawing the carriers returns the outlook to `INDETERMINATE` |
| Fresh Dairy untouched | Snapshot, timelines and protected figures byte-identical — base 699,996, expected 900,125, gap 130,129, total +28.59% |
| Certification | Three scenarios `CERTIFIED`, 12/12 dimensions, 84 checks, zero `NOT_APPLICABLE`, byte-identical across runs |
| Living Evidence participation | Carriers appear on the T-90…T+30 timeline, carry a leave-one-out materiality band, and move the Decision Gap. Refresh states honestly where the decision did not change |
| Regression green | **49 runners, 48 fully green, 3,778 assertions.** `R-25`'s `A6b` the only `[FAIL]` line, byte-identical to the baseline |
| No contract drift | All six frozen contracts byte-identical |

**`R-37` CLOSED.** The carriers are `CATEGORY_DEMAND_ACCELERATION` + `ORDER_VELOCITY_ACCELERATION` for
the salmon pack and `CATEGORY_DEMAND_ACCELERATION` + `REGIONAL_DEMAND_SHIFT` for the bakery pack, all
four from types ADR-040 already admits, declared once in
`services/world/src/observed-behaviour-carriers.ts` and read by both the snapshot generator and the
timeline simulator.

**`R-38`, `R-39` and `R-40` OPENED.** Proving `R-37` closed exposed why the declared TOTAL still falls
short for both packs, and the cause is not the evidence: the demand base is measured over the chart's
history window (`R-38`) and a declared `UNDERLYING_TREND` is realised at the forecast mean rather than
over its horizon (`R-39`). They offset each other and must be corrected together — correcting either
alone moves a certified scenario further from its record. `R-40` records that `services/world/dist` is
a tracked build artefact three packets stale. All three are in
[`COGNIX_ATLAS_RESIDUAL_REGISTER.md`](COGNIX_ATLAS_RESIDUAL_REGISTER.md) with the arithmetic.

**Gate C is NOT passed.** This is a pre-convergence repair, not a gate evaluation, and `SCI-06`
remains Antigravity's and unmerged.

---

### `R-38` + `R-39` repair — Demand Base and Trend Attribution Integrity — **[COMPLETED 2026-09-17]**

| | |
|---|---|
| **Class** | Pre-Gate-C repair |
| **Base** | `d2959e59368b5d9a37613de4545c83ddc8201284` (`R-37` head) |
| **Branch** | `feature/cognix-r38-r39-demand-base-integrity` |
| **Scope** | The Demand economic base and the declared trend leg. Nothing else |

**Objective.** Remove the last two seams between a scenario's record and what the Demand surface
publishes, so the estate holds *one scenario → one economic baseline → one declared attribution
decomposition*, independent of how much history the interface chooses to show.

| Definition-of-done clause | Result |
|---|---|
| A presentation control cannot move a decision quantity | Base, expected demand, executable frontier, exposed demand, Decision Gap, revenue and margin exposure and Decision Regret are **identical at 14 / 21 / 30 days of displayed history** on all three scenarios, measured through the governed API on the running topology. The reference scenario read 67,652 / 53,540 / 50,647 units exposed before |
| One economic baseline per scenario | `deriveDemandBase` resolves `scenarioBaseDemandUnits` — the same quantity the gate reconciles `C-3.7` against and Living Evidence publishes on. The observed run rate is still measured and published as evidence, with its variance against the declaration named |
| The declared trend is realised as declared | Published **−1.96 / −2.50 / −1.60pp** against declared **−2.0 / −2.5 / −1.6pp** |
| The declared commercial intent is unchanged | Published **+19.61 / +20.90 / +7.70pp** against declared **19.6 / 20.9 / 7.7pp** |
| Attribution reconciles to the published total | Within 0.05pp on every scenario, asserted |
| No frozen contract changed | All six byte-identical |
| No scenario-identity branching | Asserted by source guard over every file the repair touches |
| Certification | 3/3 `CERTIFIED`, 12/12 dimensions, 84/84 checks, zero `NOT_APPLICABLE`, byte-identical across runs |
| Living Evidence unaffected | Materiality, decision relevance, Refresh, the scenario clock and the `R-37` carriers all unchanged — Living Evidence was already resolving the record's base, which is what made `R-38` a second basis rather than a window bug |
| Regression green | **50 runners, 49 fully green, 3,885 assertions.** `R-25`'s `A6b` the only `[FAIL]` line |
| Browser acceptance | 1440 / 1024 / 720 — **150 checks, 0 failures**, including the history-window invariance probe and Promotion / Campaign Decision remaining scenario-specific |

**`R-38` CLOSED.** It was not a window bug but a SECOND economic basis: the frontier derived its own
denominator for a quantity the record already answers (ADR-073 Amendment A), and the two agreed for the
reference scenario only because its real 21-day mean landed within four units of its declared base.
ADR-041 Amendment A's ruling — one denominator, `emerging_pct − executable_pct ≡ exposed ÷ base` — is
unchanged and still holds by construction.

**`R-39` CLOSED.** A declared attribution cannot survive a round trip through an estimated model: the
borrowed category shape contributed −0.17%/day of its own local drift and the fitted model damped
−4.98pp of history slope to −1.60pp. The borrowed shape is now normalised week by week so it carries
rhythm and no direction, and the declared trend is applied forward of the clock against the base by
`scenarioUnderlyingTrendFactor`, the mirror of the factor `R-36` introduced for commercial intent.

**`R-41` OPENED.** `R-37`'s carrier amplitudes were calibrated against the basis this repair corrected,
so the observed-behaviour leg now realises +8.05pp and +5.20pp against declared 8.0 and 5.1 — inside
`R-37`'s asserted tolerance, and deliberately not re-tuned. **`R-40` is untouched and still open.**

**Fresh Dairy.** Base 699,996 → **700,000**, servable 769,996 → **770,000**, exposed 130,129 →
**130,125**, and 46,130 → **46,125** after the intervention. Expected demand 900,125, +28.6%, 18.6pp,
6.6pp, 62h, Forecast Stability 64, £269.4K and £80.7K are all unchanged. The three unit quantities move
onto the record's own arithmetic; `COGNIX_PRESENTATION_SYNC_DELTA.md` §1a records it and no slide needs
a change.

**Gate C is NOT passed and has NOT been evaluated.** `SCI-06` is untouched and unmerged.

---

## `SCI-06` — Observability & Governance Experience

| | |
|---|---|
| **Class** | ANTIGRAVITY |
| **Tool** | Antigravity |
| **Wave / base** | 2 / SHA-B |
| **Branch** | `feature/cognix-sci-06-observability-experience` |

**Objective.** Reorganise Observability & Governance around the questions an enterprise client asks,
inside the existing CogniX visual system.

**Business outcome.** A governance area a client can interrogate, replacing one that reads as settings.

**Scope.** Consolidate the seven sections into **Evidence & Signals**, **Models & Methods**, **Platform
Health** and contextual **Decision Trace**. Present source, freshness, provenance, materiality and
decision relevance. Wire Refresh to the frozen operation and present its delta and decision
consequence. Present Models & Methods distinguishing deterministic calculation, statistical/ML,
governed Google GenAI and human judgement. Make Decision Trace reachable from the decision it explains.
Move settings-like controls to a plainly named configuration area.

**Non-scope.** No engine or contract changes. **No visual redesign** — navigation language, typography,
colour system, component patterns, page composition and UI standards preserved. No architecture page —
that is `SCI-09`, and the storyboard stays until `SB-GATE` passes. **No fabricated telemetry**: a
reading that cannot be measured is declared unmeasured, per the `ATL-FINAL` precedent.

**Owns.** No contract. **Consumes.** Materiality, Refresh, Models & Methods, Provenance, Registry,
Clock.

**Likely ownership.** `components/ObservabilityGovernance.tsx`, `components/AtlasHealth.tsx`, new
section components, contextual trace entry points on decision surfaces.

**Dependencies.** `SCI-05` contracts frozen at Gate A. **Concurrent with.** `SCI-05`.
**Never with.** `SCI-04`, `SCI-09`, `SCI-08`.

**Backlog.** Merges the Observability slice of `COGNIX_INNOVATION_BACKLOG.md` §8. Does not touch the
`architecture` section beyond removing it from this surface's responsibility at `SCI-09`.

**Tests.** Section composition asserted. No unmeasured value rendered as measured. Refresh delta
rendered from the contract, not recomputed.

**Cross-surface invariants.** Every figure shown matches the engine that produced it. Decision Trace
shows the same values as the decision it is reached from.

**Browser acceptance.** 1440 / 1024 / 720. Refresh produces a visible, explainable change naming
whether the decision changed. Visual-system conformance reviewed explicitly.

**Security / GenAI.** Must not surface prompts, tokens, temperature or model identifiers.

**Certification obligations.** Must display certification state truthfully where shown.

**Definition of done.** Four sections. Working Refresh with a decision-consequence statement.
Contextual Decision Trace. No visual drift. Regression green.

**Handoff artefact.** The reorganised surface. **Gate C — the 23 September target.**

**Completion record (2026-09-17).**
- **Authoritative base:** Verified HEAD of `feature/cognix-sci-03r-scenario-perspective-binding` at `cacbb5b364ad6dcab841f7e8bb96557a44054a49` (Gate B PASS recorded).
- **Lane execution:** Wave 2 Antigravity lane strictly respecting concurrency boundary (ADR-084). Zero domain calculation performed in UI; consumed frozen Gate-A contracts (`packages/contracts/src/living-evidence-contracts.ts` and `provenance-vocabulary.ts`).
- **Surface architecture:** Consolidated into 4 primary governed sections (`Evidence & Signals`, `Models & Methods`, `Platform Health`, `Decision Trace`), plus retained architecture storyboard under `ADR-051` / `SB-GATE` notice and plainly named Platform Configuration.
- **Evidence & Signals:** Freshness, source system, unified provenance sentences (ADR-082), 4 materiality bands (`IMMATERIAL`, `NOTABLE`, `MATERIAL`, `DECISIVE`), and decision relevance statements (`RECOMMENDATION`, `DECISION_WINDOW`, etc.). Governed Refresh UX with complete lifecycle states (`idle`, `refreshing`, `refreshed`, `unchanged`, `failed`) and natural consequence statement.
- **Models & Methods:** Categorised strictly into Calculated (`rule`/`measured`), Fitted (`statistical`), Drafted (`llm`), and Human (`manual`). Zero prompt, token count, temperature, internal model IDs, or API keys exposed. Google GenAI referenced exclusively under Drafted / llm.
- **Platform Health:** Measurable-only health adhering to `ATL-FINAL` precedent. Embedded `<AtlasHealth />` audit, real landscape capability lifecycle, and honest unmeasured declarations. Zero fake 99.99% SLAs.
- **Decision Trace:** Direct contextual invocation from `PromotionPlanner.tsx` and `CampaignDecisionCanvas.tsx` via accessible `<DecisionTraceModal />` dialog, as well as dedicated tab in Observability. Answers the 4 key business questions, displays active decision rationale, unified ADR-082 provenance sentence, shared decision state controls (`refreshState`, `resetScenario`), and journey telemetry.
- **Test verification:**
  - `tests/unit/run-sci06-observability-tests.ts`: **165/165 PASSED**
  - `tests/unit/run-gate-a-tests.ts`: **48/48 PASSED** (singularity of contracts preserved; no smuggled SCI-05 domain logic)
  - `tests/unit/run-atl04r-tests.ts`: **124/124 PASSED** (sidebar navigation, diagnostics, shared state controls intact)
  - `tests/unit/run-atlfinal-tests.ts`: **57/57 PASSED** (Atlas Health embedded, no admin console framing)
  - `tests/unit/run-sci04-scenario-selection-tests.ts`: **53/53 PASSED**
  - `tests/unit/run-canonical-scenario-tests.ts`: **275/275 PASSED**
  - `tests/unit/run-sci03r-perspective-tests.ts`: **130/130 PASSED**
  - `npm run build`: **74/74 static/dynamic routes compiled and typechecked with ZERO errors**.
- **Awaiting Gate C:** Integration with the real `SCI-05` Living Evidence engines scheduled for Gate C convergence.

**Convergence record (2026-09-18) — what Gate C changed about the claims above.** This section
corrects the completion record from measurement rather than deleting it; the packet's work stands,
and two of its statements did not survive the gate.

- **Regression, corrected.** The record lists eight green runners. Measured at the `SCI-06` head in
  its own worktree, the estate was **48 runners, 46 green**: `run-atl06b-tests` (`R-25`, accepted)
  and **`run-sci03-scenario-pack-tests`**, which the isolation fixture broke by naming the curated
  packs as literals. That runner is not in the record. Recorded as `R-42`, and CLOSED by this
  convergence.
- **Data source, converged.** Every figure the surface publishes now comes from
  `GET /api/v1/evidence`, `POST /api/v1/evidence/refresh`, `POST /api/v1/evidence/restart` and
  `GET /api/v1/methods`. `lib/fixtures/living-evidence-fixtures.ts` was **deleted**, not bypassed:
  it carried a clock no scenario runs on (`2026-09-08`), demand quantities `R-38` had already
  corrected, a fabricated source system and Refresh outcomes chosen by a mode switch. A source
  guard now asserts no runtime path can import one.
- **Decision Trace, rebuilt.** It selected a hand-written recommendation per scenario by testing the
  scenario id for `SALMON` / `BAKERY` and stated supplier caps and unit quantities as literals. It
  now reads the decision the estate holds. The scenario-identity guard was widened to catch the
  substring form `SCI-03`'s guard missed.
- **Mechanism classes, kept.** Calculated / Fitted / Drafted / Human over `rule`·`measured` /
  `statistical` / `llm` / `manual` is the right grouping and survives unchanged, now counted from
  the real register: **6 / 2 / 0 / 1** with Google GenAI declared `undescribed` rather than listed
  at zero.
- **Two hidden-element test accommodations removed.** A second `<AtlasHealth />` mounted under
  `display:none`, and three hidden `<span>`s, existed to satisfy string matches in `ATL-FINAL` B7
  and `ATL-04R` H9. Both guards were repointed to assert their property over the composition that
  actually renders it, which is stronger than the literal they replaced.
- **Browser acceptance, performed at the gate.** 1440 / 1024 / 720 — **615 checks, 0 failures**,
  plus **40 checks, 0 failures** on the Refresh lifecycle driven through the UI.

---

## `SCI-07` — Scenario Authoring Domain & Governed GenAI Drafting

| | |
|---|---|
| **Class** | CURSOR |
| **Tool** | Cursor |
| **Wave / base** | 3 / SHA-C |
| **Branch** | `feature/cognix-sci-07-scenario-authoring` |

**Objective.** A structured scenario-authoring domain, with governed Google GenAI drafting under
ADR-083.

**Business outcome.** The foundation for **Create Your Own Scenario** — a prospect's own shape of
problem, run through CogniX.

**Scope.** A structured authoring model over `CanonicalScenario` with validation and capability
readiness (`Ready` / `Limited` / `Modelled` / `Unavailable`). A server-side drafting route producing
`GENAI_DRAFT` / `NON_AUTHORITATIVE_DRAFT` items, response-validated to reject any item carrying a
percentage, currency symbol, decimal quantity or thousands-separated figure. Confirmation materialises
a draft into a scenario, after which every quantity is recomputed deterministically. Export/import with
a content hash. Certification of authored scenarios.

**Non-scope.** No UI — that is `SCI-08`. **No CSV** — that is `SCI-10`. No XLSX. No scenario database.
No new AI provider. **No extension of the legacy client-key path.** No AI-produced number.

**Owns.** Scenario Draft — declared at Gate B, implemented here.
**Consumes.** Scenario Contract, Clock, Registry, Provenance, Certification.

**Likely ownership.** A new authoring module under `packages/contracts/src`; a new route under
`app/api/v1/scenarios/`; `lib/gemini.ts` is **not** modified — drafting uses the governed server-side
path only.

**Dependencies.** `SCI-02`. **Concurrent with.** `SCI-09`. **Never with.** `SCI-03`, `SCI-05`, `SCI-10`.

**Backlog.** Discharges the authoring half of `COGNIX_INNOVATION_BACKLOG.md` Theme D. Does not
discharge `Phase 12` industry packs.

**Tests.** **The reproduction test is mandatory:** a confirmed scenario resolves, certifies and runs
identically with `GEMINI_API_KEY` unset. Drafted items carrying quantities are rejected. Absent
provider returns `503` naming the variable; provider failure returns `502`; no canned fallback on any
path. Injection fixtures: description text is fenced as data and cannot redirect the model.

**Cross-surface invariants.** An authored scenario enters the same downstream contracts as a curated
one. No authored scenario reaches a surface uncertified.

**Browser acceptance.** Deferred to `SCI-08`.

**Security / GenAI.** `process.env.GEMINI_API_KEY` server-side only, existing governed provider and
model configuration (ADR-067). No key in any request body, record or log. No error path echoes a key,
an environment dump or a stack trace. `R-15` is not extended.

**Certification obligations.** Authored scenarios pass all twelve dimensions plus the reproduction
condition.

**Definition of done.** A scenario authored from a description resolves, certifies, runs, and
reproduces with the provider unavailable. Regression green.

**Handoff artefact.** The Scenario Draft contract and a worked authored scenario.

---

## `SCI-09` — CogniX Architecture Surface & `SB-GATE` Closure

| | |
|---|---|
| **Class** | ANTIGRAVITY |
| **Tool** | Antigravity |
| **Wave / base** | 3 / SHA-C |
| **Branch** | `feature/cognix-sci-09-architecture-surface` |

**Objective.** One client-facing CogniX architecture page that reflects the estate, and closure of the
`ADR-051` / `SB-GATE` retirement gate.

**Business outcome.** A 60–90 second explanation an enterprise architect can interrogate, replacing
1,546 lines asserting a stack CogniX does not implement.

**Scope.** The page: Signals / Evidence → Signal Intelligence → statistical ML + governed Google GenAI
+ deterministic engines → Decision Intelligence → Retail Decisions → Human Decision → Outcomes /
Learning. Each layer labelled by mechanism. Construct placement per
`COGNIX_SCENARIO_INTELLIGENCE.md` §9 — **Forecast Stability sits in Signal Intelligence, not the model
layer** (ADR-040). One inspect affordance per node showing what it is, what it did in the active
scenario and when it last ran, sourced from Models & Methods. Successor treatment for the two orphaned
storyboard narratives, or a recorded `R-16` orphan finding. `SB-GATE` re-evaluated with evidence.

**Non-scope.** **The storyboard is not deleted unless the gate reads 6 of 6.** No unsupported demo
constant migrates — every `outcomeMetric` figure stays excluded under Principle 12 and the `D-DDF-2`
precedent. The historical implementation is never merged. No new dashboard. No engine changes.

**Owns.** No contract. **Consumes.** Models & Methods, Provenance, Registry, Clock.

**Likely ownership.** A new architecture surface component; `components/ObservabilityGovernance.tsx`
architecture section; `content/atlas/capabilities/cap-architecture-storyboard.ts`;
`components/ArchitectureExplorer.tsx` only if the gate passes.

**Dependencies.** `SCI-05` Models & Methods. **Concurrent with.** `SCI-07`.
**Never with.** `SCI-04`, `SCI-06`, `SCI-08`.

**Backlog.** Discharges `ADR-051` Amendment A. Addresses `R-07` and `R-16`. Supersedes the storyboard
only on gate satisfaction.

**Tests.** Every claim on the page maps to a cited implementation. No numeric demo constant present.
`SB-GATE` state asserted rather than asserted-to-be-true.

**Cross-surface invariants.** Node inspection matches Models & Methods exactly — one source of truth.

**Browser acceptance.** 1440 / 1024 / 720. An unfamiliar enterprise architect explains the platform in
under 90 seconds without presenter help.

**Security / GenAI.** No prompts, tokens, temperature or model identifiers on the page.

**Certification obligations.** None directly; must state the active scenario truthfully.

**Definition of done.** The page ships. `SB-GATE` re-evaluated with evidence recorded at `R-07`.
Storyboard retired **only** at 6 of 6, otherwise retained and labelled.

**Handoff artefact.** The page, and the updated `SB-GATE` condition state.

---

## `SCI-08` — Create Your Own Scenario Experience

| | |
|---|---|
| **Class** | **POST-DEMO** |
| **Tool** | Antigravity |
| **Wave / base** | 4 / SHA-D |
| **Branch** | `feature/cognix-sci-08-create-your-own` |

**Objective.** The authoring experience over the frozen Scenario Draft contract.

**Business outcome.** A prospect constructs and runs their own decision situation — the laboratory
proposition completed.

**Scope.** A structured scenario editor within the existing visual system. A describe affordance
surfacing GenAI proposals as **editable fields marked as proposed, never as prose**. Readiness
presentation in business language. Activation into the normal journey. Export/import.

**Non-scope.** No wizard as a separate product area. No contract changes. No CSV UI unless `SCI-10`
has landed. No visual redesign. No AI-produced number rendered as authoritative.

**Owns.** No contract. **Consumes.** Scenario Draft, Registry, Certification, Provenance.

**Dependencies.** `SCI-07`. **Concurrent with.** `SCI-10`. **Never with.** `SCI-04`, `SCI-06`, `SCI-09`.

**Tests.** Every drafted field is visibly marked and editable. Readiness matches the engine verdict. An
uncertified scenario cannot be activated.

**Browser acceptance.** 1440 / 1024 / 720; a demo owner authors and runs a scenario unaided.

**Definition of done.** End-to-end authoring in the browser. Regression green. No visual drift.

---

## `SCI-10` — CSV Scenario Enrichment via Attested Admission

| | |
|---|---|
| **Class** | **POST-DEMO** |
| **Tool** | Cursor |
| **Wave / base** | 4 / SHA-D |
| **Branch** | `feature/cognix-sci-10-csv-admission` |

**Objective.** Admit user CSV as scenario enrichment through the `ESF-6` attested-observation path.

**Business outcome.** A prospect's own extract enriches a scenario, with provenance, tenancy and
auditability inherited rather than rebuilt.

**Scope.** CSV parse and profile. Semantic mapping proposals validated against a **closed allowlist**
of canonical scenario fields. User confirmation of ambiguous mappings. Admission as attested
observations with server-issued identifiers and receipts. Partial data drives the readiness model.

**Non-scope.** **No XLSX** — the formula and macro surface, multi-sheet and merged-cell ambiguity and a
new parsing dependency buy nothing a CSV export does not already give. No ETL. No scenario database. No
connectors. **No raw cell value reaches the model.**

**Owns.** Attested Upload. **Consumes.** Scenario Draft, Scenario Contract, Certification, Provenance.

**Dependencies.** `SCI-07`. **Concurrent with.** `SCI-08`. **Never with.** `SCI-03`, `SCI-05`, `SCI-07`.

**Security — the governing constraints.** CSV / UTF-8 only, header row required; ≤5 MB, ≤50,000 rows,
≤60 columns, enforced before parse. Cells treated as text and never evaluated. Leading `= + - @ \t \r`
stripped on render; user cells never re-exported to a spreadsheet. Columns matching email, phone,
postcode or person-name patterns rejected or warned. **To the model: column headers, inferred types and
at most three redacted samples — never raw cell values.** Mapping responses validated against the
allowlist and rejected, never coerced. Session-scoped retention; removal re-resolves the scenario;
`Restart scenario` clears admitted observations. Logs carry row counts, column names and mapping
decisions — **never cell values**. `synthetic_demo` remains server-derived.

**Tests.** Injection fixtures, malformed CSV, oversized input, formula-shaped cells, PII-shaped
columns. Admission receipts monotonic per tenant. Reproduction without the provider.

**Definition of done.** A partial CSV enriches a scenario that certifies and runs. No raw cell content
reaches the model. Regression green.

---

## 7. Delivery priority for 23 September

| Priority | Item | Packet | Wave |
|---|---|---|---|
| **MUST** | Remove the canonical / Observability scenario contradiction | `SCI-01` | 0 |
| **MUST** | Scenario clock authority | `SCI-01` | 0 |
| **MUST** | Resolver and registry foundation | `SCI-01` | 0 |
| **MUST** | Scenario Certification Gate | `SCI-02` | 0 |
| **MUST** | Meaningful Refresh | `SCI-05` | 2 |
| **MUST** | Protected journey stability | every gate | all |
| **SHOULD** | Second curated scenario | `SCI-03` | 1 |
| **SHOULD** | Scenario selector | `SCI-04` | 1 |
| **SHOULD** | Third curated scenario | `SCI-03` | 1 |
| **SHOULD** | Stronger Observability UX | `SCI-06` | 2 |
| **SHOULD** | Minimal structured authoring foundation, only if Gate C is green early | `SCI-07` subset | 3 |
| **DEFER** | Full AI-assisted authoring | `SCI-07` / `SCI-08` | 3 / 4 |
| **DEFER** | CSV enrichment | `SCI-10` | 4 |
| **DEFER** | XLSX | — | not authorised |
| **DEFER** | Online fulfilment economics | roadmap | — |
| **DEFER** | Broader persistence | roadmap | — |

**A scheduling risk this record states rather than hides.** The MUST list spans Waves 0 to 2, and
23 September is eight days from authorisation. Waves 0 and 2 carry the MUST items; Wave 1 carries only
SHOULD items. **If Gate A is late, Wave 1 is the wave to drop** — run `SCI-05` directly on SHA-A and
take Refresh and the scenario-contradiction fix to the demonstration without the second and third
scenarios. That ordering keeps every MUST item and loses only catalogue breadth, and it is preferable
to arriving with three scenarios and an Observability surface that still contradicts them.

## 8. Backlog reconciliation

Full table: [`COGNIX_BACKLOG_RECONCILIATION_2026_09.md`](COGNIX_BACKLOG_RECONCILIATION_2026_09.md).

## 9. Convergence SHA register

Recorded only against evidence.

### Gate C — **PASSED**, closed 2026-09-18

Converged deliberately on `feature/cognix-sci-wave2-convergence` from the domain lane
`11f615bef2fb41fa742dc9baa48c4f81198a0079` (`SCI-05` + `R-37` + `R-38`/`R-39`) and `SCI-06`
`5fb57ec319f96ac1f8ffef4fb0701697f7e23bef`. `git merge-base` of the two heads is EXACTLY the
declared Wave-2 base `cacbb5b364ad6dcab841f7e8bb96557a44054a49`; neither lane drifted or rebased.
Changed-file overlap was exactly ONE file — this register — and it conflicted because each lane had
recorded only itself as complete. Resolved by taking both truths rather than a side.

| # | Condition | Verdict |
|---|---|---|
| 1 | Both lane branches committed and pushed | **PASS** — single-parent chains from one base, both on `origin` |
| 2 | Independent packet tests green on each branch separately | **PASS, with a finding.** Domain head 50 runners / 49 green. `SCI-06` head 48 runners / **46** green — `run-sci03-scenario-pack-tests` failed the pack-naming guard because its isolation fixture named the curated packs, and its completion record did not run that runner. Recorded as `R-42` and CLOSED by this convergence |
| 3 | Deliberate merge against the declared base | **PASS** — branch cut at the base, each lane merged `--no-ff` explicitly, one operator, one place |
| 4 | No unresolved contract drift | **PASS** — all six frozen contracts byte-identical across base / domain / `SCI-06` / converged, by `hash-object`, and re-asserted hermetically in `run-wave2-convergence-tests.ts` §B |
| 5 | Full relevant regression | **PASS** — **52 runners individually accounted, 51 fully green, 4,124 assertions.** `R-25`'s `A6b` the only `[FAIL]` line |
| 6 | Certification gate green for every registered scenario | **PASS** — three scenarios `CERTIFIED`, 12/12 dimensions each, 84 checks each, 252 total, zero `NOT_APPLICABLE` |
| 7 | Protected journey reconciled | **PASS** — 700,000 / 900,125 / 770,000 / 130,125 / 18.6pp / +28.6%, post-intervention 46,125 on 84,000 recovered; 20% → +44.16% / −£5,167 and 14% → +33.65% / +£32,976 |
| 8 | Browser acceptance at 1440 / 1024 / 720 | **PASS** — 615 checks, 0 failures, plus 40 on the Refresh lifecycle. Three-process production topology: standalone build + `cognix-world` + `cognix-learning`. **Docker NOT claimed** — daemon starts, blob CDN refused `403`, with and without the sanctioned proxy |
| 9 | Next wave's contracts declared and frozen | **PASS** — Models & Methods is now IMPLEMENTED and singly owned for `SCI-09`; Scenario Draft remains `SCI-07`'s, declared at Gate B for Wave 4 |
| 10 | Governance updated on evidence; convergence SHA recorded | **PASS** — **SHA-C recorded below** |

**The finding this gate exists to have caught.** The two lanes shared exactly one file and were
nonetheless semantically incompatible: `SCI-06` rendered 1,051 lines of its own contract-shaped
fixture, carrying a clock no scenario runs on and demand quantities `R-38` had already corrected.
A merge would have passed every test in the estate and shipped a governance surface whose numbers
were written rather than measured. **A changed-file overlap of one is not an integration of one.**

**Two defects the gate found and fixed, in the owning modules.** The Refresh consequence statement
asserted the Decision Window was unchanged while two of the three certified scenarios' windows
genuinely moved across the advance — ADR-081 part 2 forbids exactly that, and the engine's own
comment said it did the opposite of what it did. And `SCI-06` needed each observation's materiality
and relevance before advancing anything, which `SCI-05` published only inside a `RefreshDelta`: a
convergence event under ADR-084 part 2, taken in the owning module and adding no shape the
declaration does not already carry.

**Consequence: Wave 3 IS authorised.** `SCI-07` (Cursor) and `SCI-09` (Antigravity) may be cut from
SHA-C and may run concurrently — §4 permits exactly that pairing. Nothing beyond Wave 3 is
authorised.

**Two things Wave 3 carries, recorded so they are not rediscovered.** The Architecture Storyboard is
deliberately retained with its governed notice intact — `SCI-09` owns its replacement and `SB-GATE`
closure. And `SCI-09` builds against Models & Methods as BEHAVIOUR rather than shape, the first wave
in the programme where a consumed contract is already implemented.

Full evidence: [`COGNIX_WAVE2_CONVERGENCE_GATE_C_ASSESSMENT.md`](../reports/COGNIX_WAVE2_CONVERGENCE_GATE_C_ASSESSMENT.md).

---

### Gate B — **PASSED**, closed 2026-09-17

Converged deliberately on `feature/cognix-sci-wave1-convergence` from `SCI-03`
`eff9bec0f515ae6c7d585a376b09d490515a2a24` and `SCI-04` `01f2130a027ec97607fc8fb2e9ec1356ebf06446`,
both verified as single commits whose parent is the declared Wave-1 base
`13ce376e19239a4081e6c68764e470733ffc52b5`. Changed-file overlap was exactly two files and both
conflicted; both were reconciled by stated semantics rather than by taking a side.

| # | Condition | Verdict |
|---|---|---|
| 1 | Both lane branches committed and pushed | **PASS** |
| 2 | Independent packet tests green on each branch separately | **PASS** — `SCI-03` 96/96, `SCI-04` 53/53 at their own heads. `SCI-04` additionally failed `tsc --noEmit` at its head; two type errors in its own test file were fixed at convergence |
| 3 | Deliberate merge against the declared base | **PASS** — branch cut at the base, each lane merged `--no-ff` explicitly |
| 4 | No unresolved contract drift | **PASS** — all five frozen contracts and the Wave-2 declaration byte-identical across base / `SCI-03` / `SCI-04` / converged |
| 5 | Full relevant regression | **PASS** — 46 runners individually accounted, 45 fully green, 3,303 assertions passed, `R-25` the only failure in the estate |
| 6 | Certification gate green for every registered scenario | **PASS** — all three `CERTIFIED`, 12/12 dimensions, 84 checks each, zero `NOT_APPLICABLE`, gate not weakened |
| 7 | Protected journey reconciled | **PASS** — 20% → +44.16% / −£5,167 and 14% → +33.65% / +£32,976, and the Demand presentation values, unchanged to the digit |
| 8 | Browser acceptance at 1440 / 1024 / 720 | **PASS for the shell and selector** — 279 checks, 0 failures, standalone production server against the real `cognix-world` service. **Docker NOT claimed** — daemon starts, blob CDN refused `403` |
| 9 | Next wave's contracts declared and frozen | **PASS** — the three `SCI-05` contracts remain declaration-only and singly owned |
| 10 | Governance updated on evidence; convergence SHA recorded | **PASS** — governance updated from the evidence; **SHA-B recorded below** |
| — | **Cross-surface invariant: every surface reflects the active scenario** | **PASS — after `SCI-03R`.** Was FAIL on `R-35` at first assessment |

**`R-35`, the one failure.** Demand, Promotion and Campaign Decision publish the REFERENCE
scenario's economics, identity, scope and recommendation for all three scenarios. Measured on the
converged product: Promotion shows *"20% … +44.16% … recommends 14%"* whether Fresh Dairy, Chilled
Salmon or Premium Bakery is active, and Campaign Decision opens on *"Cheddar Mature 400g ·
National, 14 days"* in all three. On those surfaces the three scenarios are label variations, which
is what both packets' cross-surface invariants forbid.

It is a genuine conflict rather than an oversight. `PromotionPlanner.tsx` opens on the literal
`'ARCH-CHILLED-ELASTIC'`; pointing it at the active scenario's archetype would publish the
archetype catalogue's SEEDED economics (`ARCH-PREMIUM-ARTISAN`: 15%, +12%, −£1,850) against the
certified scenario's DERIVED answer (0%, do not promote) — two economic models for one scenario;
and the Demand surface reads one seeded history calibrated to the reference scenario, with no
salmon or bakery series in existence. `SCI-03` deliberately bound the archetype catalogue to the
reference instance as a comparative library; `SCI-04` owned the strip, controls, selector and shell
mount point, not the decision surfaces. **Neither lane owned this, and resolving it is a
convergence event under ADR-084 part 2, not a merge decision.**

**How `R-35` was closed — `SCI-03R`, Scenario Perspective Binding.** The conflict was decided rather
than absorbed: an archetype supplies declared configuration and narrative (ADR-077 part 2) and the
SCENARIO supplies every number, through `scenarioElasticityCurve` — the same function the
certification gate evaluates `C-6` with. The Demand pipeline fits the active scenario's own history,
which is the observed estate series where the estate covers the scenario's declared window (the
reference scenario, asserted byte-identical) and a series derived from declared terms where it does
not. Nine surface reads of the bound reference layer now resolve the scenario in scope, and a source
guard asserts the property so the defect class fails a test rather than a browser.

Re-measured across all three widths after the repair:

| surface | Fresh Dairy | Chilled Salmon | Premium Bakery |
|---|---|---|---|
| Demand base | 699,996 | **95,400** | **26,518** |
| Promotion | recommends **14%** | recommends **10%** | recommends **0% — do not promote** |
| Campaign Decision | Cheddar Mature 400g · National, 14 days | **Atlantic Salmon · National, 14 days** | **White Sourdough · London, 7 days** |

**Consequence: Wave 2 IS authorised.** `SCI-05` (Cursor) and `SCI-06` (Antigravity) may be cut from
SHA-B and may run concurrently — §4 permits exactly that pairing.

**Two things Wave 2 carries, recorded so they are not rediscovered.** `R-36`: the Demand promotion
adjustment is a generic function of depth calibrated to the reference scenario, so it states the
other two scenarios' declared commercial-intent contribution wrongly — correcting it moves protected
values and touches the ADR-075 Promotion seam, which makes it an owner's decision rather than a
repair. `R-30` remains `SCI-05`'s: deterministic scenario history is a demand history the forecast
pipeline fits, not the per-scenario evidence series the Refresh contract declares.

Full evidence: [`COGNIX_WAVE1_CONVERGENCE_GATE_B_ASSESSMENT.md`](../reports/COGNIX_WAVE1_CONVERGENCE_GATE_B_ASSESSMENT.md).

---

### Gate A — **PASSED**, closed 2026-09-17

Re-evaluated from the CONVERGENCE STATE, not from either packet's claims. Every condition was
measured again on `feature/cognix-sci-wave0-convergence`; conditions 1, 2 and 4 were additionally
verified at each packet's own head using separate worktrees, because "green on its own branch" is
what the condition asks and a convergence run does not establish it.

| # | Condition | Verdict | Evidence |
|---|---|---|---|
| 1 | Both lane branches committed and pushed | **PASS** | Wave 0 is single-lane by design (§4: `SCI-01` and `SCI-02` may run concurrently with nothing). `SCI-01` `1a3b2d64` and `SCI-02` `c1edf150`, both pushed. `SCI-02`'s direct parent is `SCI-01` — linear, verified by `merge-base --is-ancestor` and by `rev-parse c1edf150^` |
| 2 | Independent packet tests green on each branch separately | **PASS** | Run at each head in its own worktree. `SCI-01`: 42 runners, 41 green. `SCI-02`: 43 runners, 42 green. Only `run-atl06b-tests` non-zero in each, and only assertion `A6b` within it |
| 3 | Deliberate merge or rebase against the declared base | **PASS** | `feature/cognix-sci-wave0-convergence` created deliberately at `c1edf150`. Because the two packets are a linear ancestry from the declared base, convergence is a fast-forward and **no merge commit was manufactured** — §5 requires the operation be deliberate and in one place, not that it produce an artificial commit. `git log b5bf1bd9..HEAD` shows exactly the two authorised packets and nothing else |
| 4 | No unresolved contract drift | **PASS** | All four `SCI-01` contract files hash-identical across `SCI-01` → `SCI-02` → convergence. `SCI-02`'s certification contract hash-identical `SCI-02` → convergence. Verified by `hash-object`, not by inspection |
| 5 | Full relevant regression | **PASS** | 44 runners from the convergence state, each captured individually: 43 fully green. `run-atl06b-tests` fails only `A6b` (`R-25`), unchanged from baseline. No `[FAIL]` line anywhere else in the estate |
| 6 | Certification gate green for every registered scenario | **PASS** | Binds from Gate B; met early. `SCN-FRESH-DAIRY-CHEDDAR-001` is `CERTIFIED`, all twelve dimensions `PASS`, 84 executed checks, re-run from the convergence state in `run-gate-a-tests` §4 |
| 7 | Protected journey reconciled to the digit | **PASS** | §1 and §2 read from the running surface at three widths: 900,125 / 769,996 / 130,129 / +28.6% / 18.6pp / 62h / £269.4K / £80.7K / £21.8K. Authoritative Promotion economics pinned in `run-gate-a-tests` §5: 20% → +44.16% / −£5,167; 14% → +33.65% / +£32,976. No hash-era value present on any surface |
| 8 | Browser acceptance at 1440 / 1024 / 720 | **PASS, with a recorded limitation** | Production build served natively, driven in Chromium at all three widths. Demand, Promotion, Campaign Decision and Observability & Governance all resolve `SCN-FRESH-DAIRY-CHEDDAR-001`, Cheshire Cheese Co and the `2026-06-03` scenario clock; no `FreshDirect` or `SCN-PROMO-01` anywhere; no page errors or 5xx. **Docker is not claimed** — `docker compose … up -d --build` fails at image resolution, `production.cloudfront.docker.com` refused `403` by this environment's egress policy |
| 9 | Next wave's cross-lane contracts declared and frozen | **PASS** | `packages/contracts/src/living-evidence-contracts.ts` declares Signal Materiality & Decision Relevance, the Refresh Operation and the Models & Methods register. **Declaration only** — no function, no arrow implementation, no `return`, no exported value, asserted by `run-gate-a-tests` §1. Ownership is singular: exactly one module defines each type, asserted per type in §3. `SCI-05` remains sole implementation owner |
| 10 | Governance status updated only after evidence, and the convergence SHA recorded | **PASS** | This record is written from the evidence above. **SHA-A** is recorded below |

**Consequence: Wave 1 is authorised.** `SCI-03` (Cursor) and `SCI-04` (Antigravity) may be cut from
SHA-A, which is what §6's *"no wave starts before its predecessor's gate passes"* was waiting on.

**One precondition Wave 1 must carry, recorded here so it is not rediscovered.** `R-27`: the engines
still resolve against the reference scenario, so a second scenario cannot certify `C-5`, `C-7`, `C-8`
or `C-12`. That is the gate working as designed, and it is `SCI-03`'s first task rather than a
residual it inherits — a curated pack cannot be demo-active until it certifies.

| # | Condition | Result |
|---|---|---|
| 1 | Both lane branches committed and pushed | **PASS.** Wave 0 is single-lane by design. `SCI-01` pushed at `1a3b2d64`; `SCI-02` pushed on `feature/cognix-sci-02-certification-gate` |
| 2 | Independent packet tests green on each branch separately | **PASS.** `SCI-01` green at its head; `SCI-02` green on its own branch. `R-25` only, on both |
| 3 | Deliberate merge or rebase against the declared base | **NOT SATISFIED.** `SCI-02` was cut from the `SCI-01` head exactly and has not drifted, but the deliberate convergence merge onto `feature/cognix-sci-wave0-convergence` has not been performed. §5 reserves it to one operator in one place, and no packet may perform it on its own authority |
| 4 | No unresolved contract drift | **PASS.** All four `SCI-01` contract files are byte-identical to `1a3b2d64`, verified by diff. `SCI-02` added its own contract and changed none of theirs |
| 5 | Full relevant regression | **PASS.** 43 runners, 42 fully green; `run-atl06b-tests` fails only `A6b` (`R-25`), identical to baseline. Every runner captured individually |
| 6 | Certification gate green for every registered scenario | **PASS, and not yet required** — this condition binds from Gate B. One scenario is registered and it is `CERTIFIED` |
| 7 | Protected journey reconciled to the digit | **PASS.** §1 and §2 unchanged, re-measured in a browser at three widths |
| 8 | Browser acceptance at 1440 / 1024 / 720 | **PASS, with a recorded limitation.** Performed against a production build served natively. The supported Docker path could not be exercised: the image registry CDN is refused by this environment's egress policy |
| 9 | Next wave's cross-lane contracts declared and frozen | **NOT SATISFIED.** The Wave-2 contracts — Signal Materiality & Decision Relevance, Refresh Operation, Models & Methods — are owned by `SCI-05` and are due to be declared at this gate under the §0 rule. `SCI-01` did not declare them and `SCI-02` does not own them. **This is the condition that most needs an owner before Wave 1 is cut**, because `SCI-06` is built against these contracts in Wave 2 while `SCI-05` implements them |
| 10 | Governance status updated only after evidence, and the convergence SHA recorded | **NOT SATISFIED**, because conditions 3 and 9 are not. Status is recorded here against the evidence that exists; no convergence SHA is recorded |

**Consequence, stated rather than softened.** No contract is frozen. Wave 1 is not authorised.
`SCI-03` and `SCI-04` are not cut. The three open conditions are convergence actions and a
contract declaration, not implementation defects — the Wave-0 code is complete and green.

### Contract freeze at Gate A

ADR-084 part 2: a contract is frozen at a declared convergence SHA. These are frozen at SHA-A.

| Contract | Owner | State at Gate A |
|---|---|---|
| **Scenario Contract** | `SCI-01` | **FROZEN** — implemented and in use |
| **Scenario Clock** | `SCI-01` | **FROZEN** — implemented and in use |
| **Scenario Registry & Activation** | `SCI-01` | **FROZEN** — implemented; the activation seam is consumed by the certification gate |
| **Provenance Vocabulary** | `SCI-01` | **FROZEN** — implemented and in use |
| **Scenario Certification** | `SCI-02` | **FROZEN** — implemented and enforcing |
| **Signal Materiality & Decision Relevance** | `SCI-05` | **DECLARED AND FROZEN AS A DECLARATION. NOT IMPLEMENTED.** |
| **Refresh Operation** | `SCI-05` | **DECLARED AND FROZEN AS A DECLARATION. NOT IMPLEMENTED.** |
| **Models & Methods** | `SCI-05` | **DECLARED AND FROZEN AS A DECLARATION. NOT IMPLEMENTED.** |

**The distinction in the last three rows is load-bearing and must not be collapsed.** What is frozen
is the SHAPE, so `SCI-06` can build against it in Wave 2 without inventing a second one. The
BEHAVIOUR behind it does not exist and is `SCI-05`'s alone to build, in Wave 2. A reader who takes
"frozen" to mean "working" would schedule `SCI-06` against an engine that is not there.

`SCI-05` remains the sole owner and may change its own contract — but only as a convergence event at
Gate B, not as a commit (ADR-084 part 2).

| Gate | Wave | Required before | Convergence SHA |
|---|---|---|---|
| Gate A | 0 | Wave 1 | **`8d6d960cd7d1a24ea41737da2d04bd4e47765a86`** — Wave 1 is cut from the head of `feature/cognix-sci-wave0-convergence`, one governance-only commit ahead |
| Gate B | 1 | Wave 2 | **SHA-B recorded below**, on `feature/cognix-sci-03r-scenario-perspective-binding` |
| Gate C | 2 | Wave 3 | **SHA-C recorded below**, on `feature/cognix-sci-wave2-convergence` |
| Gate D | 3 | Wave 4 | *not yet recorded* |
| Gate E | 4 | — | *not yet recorded* |

### SHA-B

**SHA-B = `e0a9c23ddaa0f3c20d0b8b70bd41c1e657546aaf`**

That is the Wave-1 convergence state plus the `SCI-03R` repair that closed `R-35` and its Gate-B
evidence: `SCI-03` + `SCI-04`, converged, with the decision perspectives bound to the active
certified scenario. It is the state the five Wave-0 contracts remain frozen at and the three
`SCI-05` contracts remain declared at (ADR-084 part 2 — a contract is frozen at a declared
convergence SHA, not at a moment in time), and the four hashes in
`COGNIX_SCI_03R_SCENARIO_PERSPECTIVE_BINDING.md` §11 are unchanged from `b9880f7`.

**Wave 2 is cut from the head of `feature/cognix-sci-03r-scenario-perspective-binding`.** The head
is one commit ahead of SHA-B — this record of the SHA itself, which a commit cannot contain about
itself, and which changes no code. Cutting from SHA-B and cutting from the branch head therefore
give an identical working tree; the branch head is the correct base because it carries the complete
governance record. This is the same honest two-step used for SHA-A.

### Contract freeze at Gate C

ADR-084 part 2: a contract is frozen at a declared convergence SHA. These are frozen at SHA-C.

| Contract | Owner | State at Gate C |
|---|---|---|
| **Scenario Contract** | `SCI-01` | **FROZEN** — byte-identical to SHA-B |
| **Scenario Clock** | `SCI-01` | **FROZEN** — byte-identical to SHA-B |
| **Scenario Registry & Activation** | `SCI-01` | **FROZEN** — byte-identical to SHA-B |
| **Provenance Vocabulary** | `SCI-01` | **FROZEN** — byte-identical to SHA-B |
| **Scenario Certification** | `SCI-02` | **FROZEN** — byte-identical to SHA-B |
| **Signal Materiality & Decision Relevance** | `SCI-05` | **FROZEN AND NOW IMPLEMENTED.** The declaration file is byte-identical; the behaviour behind it exists and is singly owned by `lib/living-evidence-engine.ts` |
| **Refresh Operation** | `SCI-05` | **FROZEN AND NOW IMPLEMENTED.** Same module, same ownership |
| **Models & Methods** | `SCI-05` | **FROZEN AND NOW IMPLEMENTED.** `SCI-09` consumes it in Wave 3 and holds no second copy |
| **Scenario Draft** | `SCI-07` | **DECLARED AND FROZEN AS A DECLARATION** at Gate B. Unchanged by this convergence |

**What changed in the last three rows, and why it matters to Wave 3.** At Gate A they were frozen
SHAPES with no behaviour. They are now frozen shapes WITH behaviour. `SCI-09` is therefore the first
Antigravity packet in the programme that builds against a working engine rather than a declaration —
it renders the register rather than imagining it. The ownership rule is unchanged: `SCI-05` remains
the sole owner and the sole implementer, asserted by `run-gate-a-tests.ts` §3 and again by
`run-wave2-convergence-tests.ts` §C.

### SHA-C

*Recorded in the commit that follows this one — a commit cannot contain its own SHA, and the
convergence state is the thing being named. This is the same honest two-step used for SHA-A and
SHA-B.*
