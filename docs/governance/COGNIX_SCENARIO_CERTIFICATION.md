# CogniX Scenario Certification Gate

**Status:** Authoritative specification. **Implemented by `SCI-02` (2026-09-16); the certification
contract is FROZEN at SHA-A (Gate A, 2026-09-17).**
**Authorised:** 2026-09-15 against baseline `f9c5679c`.
**Decision:** ADR-080.
**Owning packet:** `SCI-02`. It owns the certification contract; every other packet consumes it.
**Implementation:** `packages/contracts/src/scenario-certification-model.ts` (the contract) ·
`lib/scenario-certification.ts` (the twelve dimension evaluators and the gate) ·
`lib/scenario-runtime.ts` (the one server path that installs it) ·
`tests/unit/run-sci02-certification-tests.ts` (53 assertions on the mechanism) ·
`tests/unit/run-canonical-scenario-tests.ts` §14 (the catalogue run).

**First certification result:** `SCN-FRESH-DAIRY-CHEDDAR-001` is **`CERTIFIED`** on all twelve
dimensions across **84 executed checks**, with no dimension resting on a declared
non-applicability.

---

## 1. Why this gate exists

`DEMO-HARD-01` existed because three surfaces told one story on incompatible arithmetic: a £269.4K
demand exposure beside a ±£3.3K promotion contribution beside a £18,500 campaign baseline beside a
£595,200 ripple. Each surface was internally consistent, so none of them looked wrong on its own.

Its defence is the cross-surface reconciliation suite, which at `f9c5679c` runs **243 assertions
against one scenario**. The moment a second scenario exists, that defence has a hole exactly the
shape of the original defect: a new scenario may create a new disconnected economic universe and
every existing assertion stays green, because every existing assertion is about the old scenario.

**A curated catalogue without a generalised gate is the `DEMO-HARD-01` defect with more surface
area.** This record is what stops that.

## 2. The rule

> **No scenario — curated, authored or enriched — becomes demo-active until it is certified.**

Certification state lives on the scenario record. A surface may only offer, select or present a
scenario whose state is `CERTIFIED`. There is no override flag, no `--force`, and no "provisional"
state that reaches a client demonstration.

## 3. Certification dimensions

Twelve dimensions. Each returns `PASS`, `FAIL` or `NOT_APPLICABLE` with a recorded reason.

| # | Dimension | What is checked |
|---|---|---|
| **C-1** | **Identity** | Exactly one `scenario_id`. It resolves identically through Demand, Promotion, Campaign Decision, signals, Shared Decision State, telemetry, Ripple, Inventory and Observability. No surface resolves it by default (ADR-077 part 4). The supplier named in the economics is the supplier named in the signals |
| **C-2** | **Economics** | Every declared value is declared once. No surface restates a declared value as its own literal. No second basis exists for a quantity the record already answers. The arithmetic spine reconciles: base → expected → servable → exposed; realised price → margin → implied cost; contribution at depth through the funding rule |
| **C-3** | **Calendar & scenario clock** | Every window derives from the scenario clock. No civil-time value appears in deterministic scenario evidence (ADR-078). The promotion window matches the declared horizon and is inclusive of both endpoints. The declared scale reconciles with the measured run rate within the declared tolerance |
| **C-4** | **Signals** | A timeline exists for the scenario and is bound to its identity. Every observation is stamped on the scenario clock. Provenance is populated — rule, drivers, decision-state version, generator version. Determinism holds: the same scenario at the same period is byte-identical across runs |
| **C-5** | **Demand** | Forecast Stability, Decision Gap, Decision Window and Decision Regret resolve from engines against this scenario's declared values. Where evidence is absent the verdict is `INDETERMINATE` rather than a number (ADR-040) |
| **C-6** | **Promotion** | The elasticity curve, the causal decomposition and the demand bridge reconcile per ADR-075. The depth response agrees at every scope once ADR-079 retires the hash band. Supplier funding is declared and visible |
| **C-7** | **Campaign Decision** | The decision opens on this scenario's context. Readiness, frontier, contract and timeline resolve against it. No abstract population survives |
| **C-8** | **Consequences** | Decision Ripple and Inventory publish pounds derived from this scenario's realised price and margin. No unanchored percentage, no baseline that exists nowhere else |
| **C-9** | **Currency** | Every monetary value is modelled in GBP and converted once at display (ADR-074). Units, percentages, points, scores, hours, days and store counts are not converted. USD and EUR leave no surviving pound sign on any surface of this scenario's journey |
| **C-10** | **Deterministic reset** | `Restart scenario` returns this scenario to its opening position exactly, field by field, including the signal as-at marker. The position returned to is this scenario's own |
| **C-11** | **Provenance** | Every published quantity carries `origin`, `method` and `authority` per ADR-082. No value drafted by GenAI reaches an authoritative field. `synthetic_demo` is server-derived |
| **C-12** | **Cross-surface reconciliation** | The generalised assertion set passes for this scenario. Any two surfaces publishing the same quantity agree |

## 4. `NOT_APPLICABLE` is a declared verdict, never a silent pass

A scenario that does not model a dimension declares it `NOT_APPLICABLE` **with a reason recorded on
the certification result**. Example: a scenario with no committed promotion declares `C-6` not
applicable because there is no promotion to price, and that statement is visible.

What is forbidden is the third state this estate has seen before — a check that passes because the
quantity it examines does not exist. `ATL-FINAL` set the precedent by declaring two repository checks
**unmeasured** rather than reporting a zero the route could not earn. The same discipline applies
here.

**A `NOT_APPLICABLE` verdict does not reduce the scenario's certification state below `CERTIFIED`.**
A `FAIL` on any dimension does, absolutely.

## 5. The reference scenario is certified by the same gate

`SCN-FRESH-DAIRY-CHEDDAR-001` passes the gate under the same rules as every other scenario. If the
gate cannot certify it, the gate is wrong and is corrected — the scenario is not exempted.

This is what stops certification degrading into a formality applied only to newcomers, and it is also
the regression guard for the protected journey: a change that breaks the canonical scenario fails
certification before it reaches a client.

## 6. Generalisation, not duplication

The existing 243 assertions are not copied per scenario. They become a harness parameterised by
scenario and executed over the registered catalogue.

**How the split landed (`SCI-02`).** Three classes, not two, because the middle one is what makes
the arrangement honest:

| Class | Where it lives | Executed for |
|---|---|---|
| **Universal** — true of any scenario | `lib/scenario-certification.ts` | every registered scenario |
| **Capability-specific** — true where the scenario models the capability | the same harness, behind a named applicability predicate carrying its reason | the scenarios it applies to; declared `NOT_APPLICABLE` with a reason elsewhere |
| **Instance-specific** — the protected journey's own digits, its archetype catalogue, the `SCI-01` source guards | `tests/unit/run-canonical-scenario-tests.ts` | `SCN-FRESH-DAIRY-CHEDDAR-001` only |

The test the split has to pass is that **adding a scenario does not mean copying a file**. It does
not: a new scenario is certified by the harness, and only a new INSTANCE claim belongs in the suite.

**Measured against the three obligations:** no assertion was weakened — the one assertion that
changed is `C-8`, which was CORRECTED to include the scenario's own declared substitution-recovery
term after it wrongly failed the reference scenario. The canonical suite's published values are
unchanged to the digit, re-measured in a browser at 1440 / 1024 / 720. Coverage rose rather than
fell: the canonical suite runs **275** assertions (from 260), and the harness executes **84** per
scenario on top of that.

**Three obligations on the generalisation, recorded so `SCI-02` cannot satisfy the letter and lose
the substance:**

1. **No assertion is weakened to make a new scenario pass.** A scenario that cannot satisfy an
   assertion is not certified. The assertion is only changed if it is shown to be wrong about the
   *model*, and that change is an ADR.
2. **The canonical scenario's published values are unchanged to the digit.** `COGNIX_PRESENTATION_SYNC_DELTA.md`
   §1 and §2 are the reference. Generalisation that moves a protected value has failed.
3. **Assertion count does not fall.** Coverage per scenario is at least what the canonical scenario
   has today.

## 7. Governance drift note, recorded rather than silently corrected

`MASTER_PLAN.md` records the `DEMO-HARD-01` suite as **"74 cross-surface and currency assertions"**.
Measured at `f9c5679c` the suite reports **243 passed, 0 failed**. The record was written at
`DEMO-HARD-01` closure and `DEMO-HARD-02` / `-04` added assertions without updating it. The Master
Plan is corrected in the same commit as this record. Nothing was wrong with the tests; the count in
the narrative had drifted, and it is stated here because a certification record that quotes a stale
figure is the class of defect this programme exists to close.

## 8. When certification runs

| Trigger | Required |
|---|---|
| A scenario is added to the catalogue | Full gate, all twelve dimensions |
| A scenario's declared values change | Full gate for that scenario |
| A shared engine or contract changes | Full gate for **every** registered scenario |
| A convergence gate between `SCI` waves | Full gate for every registered scenario (ADR-084 part 4) |
| A user confirms an authored scenario | Full gate before it may be activated |

## 9. Certification and the authored-scenario path

An authored or enriched scenario is certified by the same twelve dimensions. Two additions apply from
ADR-083:

- **Reproduction without the provider.** A scenario confirmed with GenAI assistance must resolve,
  certify and run identically with `GEMINI_API_KEY` unset. A scenario that cannot is not admissible.
- **Readiness is published, not implied.** Where a dimension is `NOT_APPLICABLE` or a capability is
  `Limited` / `Modelled` / `Unavailable` per `COGNIX_SCENARIO_INTELLIGENCE.md` §6.1, the user sees
  that statement before they run the scenario, in business language.

## 10. What this record does not do

It does not authorise implementation. It does not define the certification data structure — that is
`SCI-02`'s to design and own. It does not grant any scenario certified status; no scenario is
certified until the harness exists and reports it.

**As at 2026-09-16 the harness exists and reports.** One scenario is registered and it is
`CERTIFIED`. Nothing in this record grants that status; the harness measured it, and the same
harness refuses a scenario that does not reconcile — demonstrated against a test fixture that fails
six dimensions with the divergence named on each.

## 11. Related governance

[`COGNIX_SCENARIO_INTELLIGENCE.md`](COGNIX_SCENARIO_INTELLIGENCE.md) ·
[`COGNIX_CANONICAL_SCENARIO.md`](COGNIX_CANONICAL_SCENARIO.md) ·
[`COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md`](COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md) ·
[`COGNIX_PRESENTATION_SYNC_DELTA.md`](../reports/COGNIX_PRESENTATION_SYNC_DELTA.md) · ADR-073 ·
ADR-073 Amendment A · ADR-077 · ADR-080.
