# COGNIX CAPABILITY ATLAS — RESIDUAL REGISTER

**Document Status:** Approved & Authoritative
**Version:** 1.0.0
**Effective Date:** 22 August 2026
**Owner:** G10X Enterprise Innovation Lab Architecture Board
**Governs:** `ATL-FINAL` closure. Reconciled against `ATL-01`…`ATL-07`, `ATL-04R`, the `ATL-07`
governance engine, the repository, the full test estate and browser acceptance at 1440 / 1024 / 720.

---

## 0. How to read this

Every row is something the Atlas does **not** do, does not yet know, or knows only partially. Each is
classified once:

| Class | Meaning |
|-------|---------|
| **CLOSED** | Reconciled during `ATL-FINAL`. Nothing outstanding. |
| **OPEN — GOVERNED** | Remains true, is visible in the product or in a check, and is safe to carry. |
| **FUTURE** | A genuine enhancement, not a defect. Nothing is broken by leaving it. |
| **OWNER DECISION** | A judgement only the owner can make. Evidence is recorded; the decision is not taken here. |

Nothing in this register was closed by writing data to make a check pass. Where evidence did not
support a value it was left absent and recorded, which is why the register has open rows at all.

---

## 1. Register

### R-01 — Twenty records claimed a lifecycle tier they did not meet · **CLOSED**

`ATL-07`'s first real run found 20 of 38 records at lifecycle `Prototype` carrying no `assumptions`,
which `CAPABILITY_KNOWLEDGE_MODEL.md` §9.1 requires from `Research` upward. All twenty are closed by
authoring, for each capability, the premise **its own architecture rests on**, read from its recorded
`architecture_narrative` and implementation rather than written to clear the check. Each is specific
to one capability: the counterfactual assumes no unmodelled concurrent intervention; regret assumes
`ACT_NOW`/`WAIT`/`DO_NOTHING` exhaust the alternatives; the decision contract assumes upstream
producers emit canonical form, because a re-serialised input reads as a changed one.

Blocking findings: **20 → 0**. Unpublishable records: **20 → 0**.

> These assumptions were authored during closure and have not yet been confirmed by the capability
> owner at a scheduled review. That confirmation is R-13.

### R-02 — Twelve records carry no innovation lifecycle state · **OPEN — GOVERNED**

Left absent deliberately. `ATL-FINAL` measured the shape rather than the count, and the shape is the
finding: **all nine `enabling-service` capabilities are null, 9 of 9.** The remainder are two
`governance-control` records of six and one `experience` record of five. The innovation lifecycle
describes how an idea matures through the lab; the platform substrate underneath — auth, telemetry,
the signal fabric, shared decision state, the memory and pattern stores — was built, not incubated.

Assigning a plausible state to make the check quiet would be exactly the invention ADR-047 exists to
prevent. The nulls stay, `GOV-REC-6` reports each one as **exempt rather than passing**, and the
Atlas Health surface states the by-type breakdown so a reader sees the reason and not just the
number.

The three non-`enabling-service` nulls are the genuine gap and are R-12.

### R-03 — `data_sources` populated on 3 of 38 records · **PARTLY CLOSED / OPEN — GOVERNED**

Raised to **14 of 38**. Eleven records gained a `data_sources` entry, and only where the cited store
or generator **declares its own nature in the file itself** — the Enterprise World synthetic signal
generator, the deterministic trajectory simulator, the connector adapters that all emit
`synthetic_demo`, the shared decision state store, the two learning stores, the journey buffer (the
one `live` source in the estate: real events from the running application), and the world scenario
plus in-component literal arrays behind Predictive Inventory.

The remaining 24 were **not** filled. A mechanical sweep of cited implementation files produced
plausible-looking signals that were wrong on inspection — the Architectural Storyboard, which binds
to no data at all, was flagged as reading shared decision state because it shares a host component
with a surface that does. Guessing here would put a fabricated provenance claim into the field whose
entire purpose is provenance.

`data_sources` is not a completeness-tier requirement, so no record is blocked by its absence. The
coverage figure is reported on Atlas Health.

### R-04 — `external_evidence` empty across the corpus · **OPEN — GOVERNED**

Still **0 of 38**, and correctly so. `ATL-03` recorded that no market study has been performed;
`ATL-06B` built the retrieval and admission path but was scoped by the owner to a representative
evaluation set rather than a population run. Nothing was admitted, so nothing is recorded.

This is visible, not hidden: the Sales lens of Atlas Health states that any comparative claim in a
client conversation is the seller's rather than the platform's, and a preparation pack renders
*"Market context 0"* with the reason. `GOV-REC-8` stands ready to flag stale market evidence the day
any is recorded.

**No allowlist, provenance or freshness rule was relaxed to raise this number.** Doing so is the one
change that would make the field worse than empty.

### R-05 — `tsx` undeclared while two runners depended on it · **CLOSED**

`run-cdi07a-tests.ts` and `run-cdi07b-tests.ts` spawn `node --import tsx <script>`. `tsx` was reachable
only through `npx` and absent from `node_modules`, so the child processes died with
`ERR_MODULE_NOT_FOUND` and both suites had been failing for the life of the branch. It is a genuine
repository test dependency and is now declared as one: `devDependencies.tsx ^4.23.12`.

`run-cdi07a` **155 / 0**, `run-cdi07b` **235 / 0**, and the estate is **34 of 34 runners green with
zero failures**. Nothing was suppressed or baselined.

### R-06 — `CDI-07A` and `CDI-07B` split candidates · **CLOSED — do not split**

`ATL-03` raised both rather than splitting unilaterally, and left the decision open. `ATL-FINAL`
resolved it on evidence against the capability test — *can this concept be independently searched,
understood, demonstrated, related, governed and reused?*

- **`CDI-07A` → Decision Contract + Decision Half-Life.** Half-Life is a **predicate over a
  contract**: `assessDecisionValidity(contract)`, served at `decision-contract/[id]/validity`. It has
  no instance that does not require a contract.
- **`CDI-07B` → Pre-Mortem + Prediction vs Reality + Learning Candidate.** All three are **nested
  sub-resources of a decision contract** — `decision-contract/[id]/pre-mortem`,
  `.../prediction-comparison`, `.../learning-candidate`. Each binds to a contract by id and digest.

Both fail the *independently reused* limb, and neither is unaddressable today: *"decision half life"*,
*"pre-mortem"*, *"prediction versus reality"* and *"learning candidate"* each rank the correct record
first. That is the opposite of the `DDF-01` cardinality case, where keying on the work package would
have made four capabilities unreachable. The one-record-each model is correct and the registry stays
at 38.

### R-07 — Architectural Storyboard retirement gate · **OPEN — GOVERNED (3 of 6)**

Re-evaluated from evidence, recorded as governed data in `config/atlas-storyboard-gate.ts`, and
rendered in the Architect lens of Atlas Health. ADR-051 requires **all six**; three are met, so the
storyboard is **retained**. See §2 for the condition-by-condition state. The gate was not weakened.

### R-08 — `ATL-07` findings lived only in a terminal · **CLOSED**

Atlas Health is now the seventh section of Observability & Governance, computing from the same engine
as `scripts/atlas-governance-check.ts` on request. Four persona lenses, overlapping counts stated as
overlapping, and reference drift reported as **unmeasured** rather than zero where git history is
unavailable. It is a section of an existing surface, not a separate admin console.

### R-09 — Six records gave a navigation instruction that no longer worked · **CLOSED**

Six `usage_instructions` still read *"Open X from the Innovation Portfolio"*. `ATL-04R` had folded the
Portfolio into the Atlas as a view, and the only remaining route into a demonstration surface was
through Questions Worth Asking. The instructions are corrected, **and the missing route was built**:
the *"demonstrated by"* and *"originated as"* chips on a capability record now open the surface behind
them. A registry entry with no surface stays a plain label rather than becoming a button that goes
nowhere.

### R-10 — `CAP-INNOVATION-PORTFOLIO` described a surface that no longer existed · **CLOSED**

Surfaced by `GOV-REC-3`. The record's `description`, `testing_instructions`, `architecture_narrative`,
`architecture_flow`, `implementation_references`, `known_limitations` and demo path all described the
pre-`ATL-04R` nine-asset surface, while its `usage_instructions` and `validation_evidence` described
the current one — an internally contradictory record. Worse, its demo warning instructed a
presenter to say the surface *"shows nine registered assets against at least thirty-three inventoried
capabilities"*, which stopped being true when it began counting all 38. Corrected throughout, with
`tests/unit/run-atl04r-tests.ts` recorded as the runner that does cover it.

Two further stale claims were corrected from the same signal: `CAP-DECISION-LIFECYCLE-VIEW` described
itself as *"rendered in the Help shell"* that `ATL-04R` retired, and `CAP-ARCHITECTURE-STORYBOARD`
recorded SB-GATE at *"one of six"*.

### R-11 — Navigation unreachable below 1024px · **CLOSED**

Found by browser acceptance at 1024 and 720, not by any suite. The stylesheet slides the sidebar
off-screen with `transform: translateX(-100%)` and offers `.sidebar.open` to bring it back — and
**nothing in the estate had ever set that class**. The Capability Atlas, Observability & Governance,
every demonstration surface and Exit Demo were all unreachable at narrow widths, with no menu control
anywhere on the page. The rule was written; the switch was never wired to it. A toggle and a
dismissing scrim now supply it, inert above the breakpoint.

### R-12 — Three records outside `enabling-service` carry no lifecycle state · **OWNER DECISION**

`CAP-CONTRACT-VERIFICATION` and `CAP-GOVERNANCE-SETTINGS` are `governance-control`, where three of six
siblings do carry a state; `CAP-DECISION-LIFECYCLE-VIEW` is `experience`, where four of five do. Unlike
R-02 these are not explained by their category. A lifecycle state is an innovation-portfolio judgement
about how an idea has matured, which no amount of code reading can settle. **Recorded, not invented.**

### R-13 — Twenty authored assumptions await owner confirmation · **OWNER DECISION**

R-01's assumptions were written during closure from each capability's recorded architecture,
description, limitations and implementation. They are accurate to the implementation as read, but they
are the estate's reading of its own premises rather than the capability owner's declaration.

`reviewed_at` was moved on **eleven** records only — those whose cited files had drifted under
`GOV-REC-3` and which were therefore re-read against the specific change, five of which also received
an authored assumption. It was **not** moved on the other fifteen. The `GOV-REC-3` remedy names moving
a review date without reading as the one evasion the check cannot detect, and the reverse restraint is
the safe one: a date is moved only where a specific re-reading actually happened. The authored
assumptions come up for owner confirmation at each record's next scheduled review.

### R-14 — `GOV-REC-3` cannot see within a day · **OPEN — GOVERNED**

`reviewed_at` is a date and a commit timestamp is an instant, so a file edited at 09:00 and re-read at
17:00 on the same day still reads as drift. The check treats a same-day change as drift deliberately —
the alternative is to assume the review came last, which is the assumption that lets a stale record
pass. The consequence is that `ATL-FINAL`'s own commit re-arms `GOV-REC-3` on the files it touched.
This is advisory, correct-by-design, and cheaper than the alternative.

### R-15 — The legacy client-supplied Gemini key · **OPEN — GOVERNED (recorded technical debt)**

`/api/ask` and `/api/briefing` still take a provider key from the client, which is the mechanism
ADR-044 Amendment A records as technical debt and closes to new use. The Atlas provider path is
entirely separate, server-side, and proven so by `scripts/atlas-credential-isolation-check.sh`. Out
of scope by owner instruction; unchanged.

### R-16 — Two units of storyboard knowledge have no home · **FUTURE**

The value framework (assessment §3.1) and the hub-and-spoke reuse model (§3.2) are present nowhere in
the estate, which is why SB-GATE-2 is not met. Both are content migration into the Atlas or into
platform architecture, not a code change. Sixty narrative prose units behind SB-GATE-5 are the same
kind of work at larger scale.

### R-17 — `build` and `release` are unrecorded in development · **OPEN — GOVERNED**

`resolvePlatformMetadata()` returns `null` for both unless the deployment supplies `COGNIX_BUILD_ID`
or `CI_COMMIT_SHORT_SHA` and `COGNIX_RELEASE`. The About surface says *"not recorded"* rather than
inventing a value. Correct behaviour; noted so a reader of the About panel in a local environment is
not surprised by it.

### R-18 — No capability record carries market evidence, so `GOV-REC-8` has never fired in anger · **FUTURE**

The freshness check is proven against fixtures (`run-atl07-tests.ts` C13) and cannot be proven against
the corpus until R-04 is populated. Recorded so the coverage claim stays honest.

---

## 2. Storyboard gate — condition state

Authoritative data: `config/atlas-storyboard-gate.ts`. Rendered in the Architect lens of Atlas Health.

| Gate | Condition | State | Why |
|------|-----------|-------|-----|
| SB-GATE-1 | Both versions audited slide by slide with a per-unit decision | **met** | `COGNIX_ATL_01_STORYBOARD_MIGRATION_ASSESSMENT.md`, 26 slides |
| SB-GATE-2 | Every retained unit verifiably present at its destination | **not met** | Value framework §3.1 and hub-and-spoke reuse model §3.2 have no home anywhere in the estate |
| SB-GATE-3 | Destinations reachable from the Atlas or from governance | **met** | Capability records, visual explainability, Observability & Governance |
| SB-GATE-4 | Each narrative has a named successor surface | **partially met** | Slides 6 and 7 remain orphaned |
| SB-GATE-5 | Presenter notes and demo timings preserved as Demo Path content | **not met** | 60 narrative prose units never migrated |
| SB-GATE-6 | Retirement proposed in a work package that names the navigation replacement | **met** | `ATL-04R` |

**3 of 6. ADR-051 requires all six. Storyboard RETAINED.**

---

## 3. Governance state at closure

Measured by `npx tsx scripts/atlas-governance-check.ts` over 38 records and 13 checks.

| Measure | At `ATL-07` | At `ATL-FINAL` |
|---------|-------------|----------------|
| Blocking findings | 20 | **0** |
| Records refused publication | 20 | **0** |
| Advisory findings | 24 | **13** |
| Lifecycle tier gaps (`GOV-REC-1`) | 20 | **0** |
| No lifecycle state (`GOV-REC-6`) | 12 | **12** — deliberate, see R-02 |
| Source drift since review (`GOV-REC-3`) | 11 | **0** — re-read, see R-14 |
| Historical reference to confirm (`GOV-REC-2H`) | 1 | **1** — confirmed legitimate |
| Provider drift | 0 | **0** |
| `data_sources` coverage | 3 / 38 | **14 / 38** |
| `external_evidence` coverage | 0 / 38 | **0 / 38** — see R-04 |
| Test-evidence coverage | 29 / 38 | **29 / 38** |

Counts overlap. One record can appear under several measures; they are not slices of the corpus and
do not sum to it.

---

## 4. What must not be done to these residuals

- Do not assign a lifecycle state to close R-02 or R-12. The null is the honest value.
- Do not bulk-fill `data_sources` from a mechanical scan to close R-03. The sweep was tried; it was
  wrong on inspection.
- Do not relax the allowlist, provenance or freshness rules to close R-04. An empty evidence class is
  better than a populated one nobody can trace.
- Do not weaken SB-GATE to retire the storyboard.
- Do not move `reviewed_at` on the twenty records in R-13 without a human reading them.
