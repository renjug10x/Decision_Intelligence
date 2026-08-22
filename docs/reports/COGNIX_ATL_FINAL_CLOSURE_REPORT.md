# COGNIX CAPABILITY ATLAS — `ATL-FINAL` CLOSURE, ACCEPTANCE & BASELINE

**Document Status:** Approved & Authoritative
**Work Package:** `ATL-FINAL` — a closure and acceptance pass, **not** a feature phase and **not**
`ATL-08`
**Date:** 22 August 2026
**Owner:** G10X Enterprise Innovation Lab Architecture Board
**Companion:** [`COGNIX_ATLAS_RESIDUAL_REGISTER.md`](../governance/COGNIX_ATLAS_RESIDUAL_REGISTER.md)

---

## 1. What this phase was for

`ATL-01` through `ATL-07` and `ATL-04R` built the Atlas. `ATL-FINAL` reconciles what they left behind,
validates the product as a whole in a real browser, fixes only evidence-backed defects, and establishes
a baseline. It adds no capability, no evidence class and no surface of its own beyond making the
`ATL-07` governance engine visible where a reader already is.

Three of the defects it closed **could not have been found by any suite in the estate**, and that is
the phase's most useful finding. Each was found by opening the product:

1. A hyphenated query — `pre-mortem` — returned nothing, while the corpus contains that exact
   hyphenated spelling eleven times.
2. The word `capability` scored as a content word in a corpus where every record is a capability, so a
   question naming one area reached twenty-seven of thirty-eight records.
3. Below 1024px the entire navigation was unreachable: the stylesheet had offered `.sidebar.open`
   since the original design and **nothing in the estate had ever set the class**.

The estate now runs **2,314 counted assertions across 35 runners** (five report pass/fail without a
count). None of them was watching for any of these,
because each is a property of the running product rather than of a module. That is not an argument for
fewer tests; it is the same argument `ADR-068` makes about fixture-only provider governance, one layer
up.

---

## 2. Continuity

| | |
|---|---|
| Repository root | `/home/user/Decision_Intelligence` |
| Branch | `claude/cognix-capability-atlas-v2` |
| HEAD at start | `e587cc1714ef9bd0f413116a2dd100144d9d86f1` |
| Remote at start | `origin/claude/cognix-capability-atlas-v2`, identical |
| Working tree at start | clean |
| Descent | `git merge-base --is-ancestor 5dfba74 HEAD` — on the authoritative CogniX line, not stale `origin/main` and not the retired `CAT` governance branch |

All eleven prior phases confirmed `[COMPLETED]` on the status board. `AC-ATL-06C-9` confirmed
`**[HARD, MET]**`, closed on the real credentialed round trip recorded at commit `f1c390bc`. Provider
configuration confirmed coherent: verified model `gemini-3.6-flash`, configuration default
`gemini-3.6-flash`, six recorded wire-contract assumptions.

---

## 3. Residual register

Eighteen residuals were reconciled and classified. Full detail in the register; the shape:

| Class | Count | Rows |
|-------|-------|------|
| **CLOSED** | 8 | R-01, R-05, R-06, R-08, R-09, R-10, R-11, and R-13 at the final owner review |
| **OPEN — GOVERNED** | 6 | R-02, R-03 (partly), R-04, R-14, R-15, R-17 |
| **OWNER DECISION** | 1 | R-12 |
| **FUTURE** | 3 | R-16, R-18, and the SB-GATE content migration behind R-07 |

> **Updated 2026-08-22 at the final owner review.** R-13 closed: all twenty-one authored assumptions
> were re-checked against implementation, contracts, tests and ADRs — **20 confirmed, 1 amended, 0 left
> undecided**. The amendment corrected `CAP-DECISION-CONTRACT`, whose assumption asserted that a
> re-serialised input reads as changed when `artefactDigest` canonicalises before hashing. R-12 is now
> the Atlas's only open owner decision. Full table in §5 of the residual register.

Nothing was closed by writing data to make a check pass. The open rows are the evidence of that: had
the aim been a clean sheet, R-02, R-03 and R-04 were the three easiest to fabricate and are the three
that remain open.

---

## 4. Capability governance reconciliation

### 4.1 Twenty blocking findings, closed by authoring — not by filling

`ATL-07`'s first run found **20 of 38** records at lifecycle `Prototype` carrying no `assumptions`,
which §9.1 requires from `Research` upward. All twenty are closed. Each assumption states the premise
**that capability's own architecture rests on**, read from its recorded `architecture_narrative`,
description, limitations and implementation:

- *Counterfactual Baseline* — the counterfactual is a valid comparator only while no unmodelled
  concurrent intervention is running; the engine attributes the whole difference to the campaign.
- *Decision Regret* — `ACT_NOW`, `WAIT` and `DO_NOTHING` exhaust the alternatives under comparison, so
  an option nobody enumerated cannot be shown as better however good it would have been.
- *Decision Contract* — evidence identity is stable enough to digest: an input re-derived with the
  same meaning but a different serialisation reads as changed.
- *Outcome Frontier* — the declared objectives capture what the decision is actually trading off; a
  Pareto set is only as honest as its axes.
- *Observation Correspondence* — the declared metric-to-signal table is complete for the decisions
  under contract; an undeclared correspondence is refused, which fails safe but fails silently.

The owner's constraint was *"do not bulk-fill boilerplate assumptions"*, and the test for boilerplate
is distinctness. `run-atlfinal-tests.ts` C3 asserts that **no two records share an assumption**, and C4
that each is a premise rather than a label.

**Blocking findings 20 → 0. Records refused publication 20 → 0. `--enforce` now exits 0.**

### 4.2 Lifecycle nulls: the shape, not the count

Twelve records carry no lifecycle state, unchanged. What changed is that the phase measured *which*:
**all nine `enabling-service` capabilities, 9 of 9** — auth, journey telemetry, the signal fabric and
simulator, the connectors, shared decision state, the memory and pattern stores, domain and persona
context. Plus two of six `governance-control` and one of five `experience`.

The innovation lifecycle describes how an idea matures through the lab. The platform substrate
underneath was built, not incubated. The nulls stay; `GOV-REC-6` reports each as **exempt rather than
passing**; Atlas Health renders the by-type breakdown so a reader sees the reason rather than a bare
number. The three non-`enabling-service` nulls are the genuine gap and are recorded as an owner
decision (R-12), not invented.

### 4.3 Data-source provenance: 3 → 14, and a deliberate stop

Eleven records gained `data_sources`, and only where the cited store or generator **declares its own
nature in the file itself**. One `live` source exists in the estate — the journey telemetry buffer,
which records real events from the running application — and it is labelled `live` while everything
else is `synthetic` or `static`.

The remaining 24 were not filled. A mechanical sweep of cited implementation files was tried and
produced signals that were wrong on inspection: the Architectural Storyboard, which binds to no data
at all, was flagged as reading shared decision state because it shares a host component with a surface
that does. Guessing here would put a fabricated provenance claim into the field whose entire purpose
is provenance.

### 4.4 Stale references corrected, and one record that contradicted itself

`GOV-REC-3` flagged eleven records whose cited files had changed since review. Each was re-read against
the specific change; `reviewed_at` moved on those eleven and on no others.

**Six** were drift caused solely by a sixteen-line append to the `ATL-01` report — §12.1, recording the
`ADR-052` identity resolution — which does not touch the `E-*` findings those records cite. Verified
from the diff, not assumed. **Two more** (`CAP-CURIOSITY-QUESTIONS`, `CAP-GOVERNANCE-SETTINGS`) cited
components that had genuinely changed, and were confirmed still accurate against them. **Three were
wrong:**

- **`CAP-INNOVATION-PORTFOLIO`** described the pre-`ATL-04R` nine-asset surface in its `description`,
  `testing_instructions`, `architecture_narrative`, `architecture_flow`, `implementation_references`,
  `known_limitations` and demo path — while its `usage_instructions` and `validation_evidence`
  described the current one. **Its demo warning instructed a presenter to say the surface "shows nine
  registered assets against at least thirty-three inventoried capabilities"**, which stopped being
  true when it began counting all 38. A record that makes a seller understate the product is as much a
  truthfulness defect as one that overstates it. Corrected throughout.
- **`CAP-DECISION-LIFECYCLE-VIEW`** described itself as *"rendered in the Help shell"* that `ATL-04R`
  retired.
- **`CAP-ARCHITECTURE-STORYBOARD`** recorded SB-GATE at *"one of six"*.

### 4.5 Six records told a reader to open a surface that had moved

Six `usage_instructions` still read *"Open X from the Innovation Portfolio"*. `ATL-04R` had folded the
Portfolio into the Atlas as a view. Tracing the current routes found something worse than stale prose:
**the only remaining route into a demonstration surface was through Questions Worth Asking.** A
capability record named the solution that demonstrates it and gave the reader nowhere to go.

Both halves are fixed. The instructions now describe the real route, and the *"demonstrated by"* /
*"originated as"* chips on a capability record open the surface behind them. A registry entry with no
surface stays a plain label rather than becoming a button that goes nowhere.

---

## 5. Test infrastructure

The two persistent `CDI-07A` / `CDI-07B` failures are **eliminated at the root, not baselined**.

Both runners spawn `spawnSync('node', ['--import', 'tsx', script])`. `tsx` was reachable only through
`npx` and absent from `node_modules`, so every child process died with
`ERR_MODULE_NOT_FOUND: Cannot find package 'tsx'`. It is a genuine repository test dependency and is
now declared as one — `devDependencies.tsx ^4.23.12`, the only addition to `package.json`.

`run-cdi07a` **155 / 0**. `run-cdi07b` **235 / 0**. Estate: **35 of 35 runners exit 0, zero
unexplained failures.**

---

## 6. Capability split candidates — closed, do not split

`ATL-03` raised two split candidates and left them for an owner. `ATL-FINAL` resolves both on route
evidence against the capability test — *can this concept be independently searched, understood,
demonstrated, related, governed and reused?*

- **`CDI-07A`** — Decision Half-Life is a **predicate over a contract**: `assessDecisionValidity(…)`,
  served at `decision-contract/[id]/validity`. No instance exists without a contract.
- **`CDI-07B`** — all three artefacts are **nested sub-resources of a decision contract**:
  `decision-contract/[id]/pre-mortem`, `.../prediction-comparison`, `.../learning-candidate`.

Both fail the *independently reused* limb. Neither is unaddressable today — *"decision half life"*,
*"pre-mortem"*, *"prediction versus reality"* and *"learning candidate"* each rank the correct record
first — which is the opposite of the `DDF-01` cardinality case, where keying on the work package would
have made four capabilities unreachable. **The registry stays at 38.**

---

## 7. Atlas Health

The `ATL-07` engine is now the **seventh section of Observability & Governance**, not a separate
console. It computes on request from the same engine as `scripts/atlas-governance-check.ts`.

Four lenses, differing in depth and ordering and never in fact:

| Lens | Leads with |
|------|-----------|
| **Innovation Executive** | Estate size, records that cannot be published, live-provider health, and *why* twelve records carry no lifecycle stage |
| **Sales** | What may be claimed, what must not, and that market-evidence coverage is 0 of 38 — so any comparative claim is the seller's, not the platform's |
| **Architect** | Provider model, contract assumptions, verified commit, drift, and the SB-GATE table condition by condition |
| **Developer** | Every finding with check identifier, subject, detail and remedy |

Two design rules are visible in the payload, not only in the code:

**Counts overlap, and it says so.** `counts_overlap` is rendered above the tiles so nothing has to
infer a total.

**Unmeasured is never zero.** Two of the thirteen checks — cited-path existence and source drift — are
repository questions. A first implementation read `process.cwd()` at request time and cost two things:
the bundler traced the **whole project** into the deployment output, and in a standalone deployment,
which ships the built server rather than the repository, every cited path would have resolved to
nothing and the surface would have invented **38 blocking findings out of its own deployment shape**.
Those checks are therefore not run here at all. The payload names them in `not_measured_here` with the
command that can answer them, and the Architect lens says so in words.

---

## 8. Architectural Storyboard — SB-GATE 3 of 6, RETAINED

Re-evaluated from evidence and recorded as governed data in `config/atlas-storyboard-gate.ts`, with the
score **computed from the conditions rather than written beside them**.

| Gate | State | Basis |
|------|-------|-------|
| SB-GATE-1 audit | **met** | 26 slides audited with a per-unit decision |
| SB-GATE-2 every unit at its destination | **not met** | Value framework §3.1 and the hub-and-spoke reuse model §3.2 have no home anywhere in the estate |
| SB-GATE-3 destinations reachable | **met** | Capability records, visuals, Observability & Governance |
| SB-GATE-4 named successor per narrative | **partially met** | Slides 6 and 7 remain orphaned |
| SB-GATE-5 presenter notes as Demo Path content | **not met** | 60 narrative prose units never migrated |
| SB-GATE-6 retirement proposed with a navigation replacement | **met** | `ATL-04R` |

ADR-051 requires all six and admits no partial gate. **The storyboard is retained. The gate was not
weakened to retire it**, and `run-atlfinal-tests.ts` A5 asserts that retirement is permitted only on
all six.

---

## 9. Demo runbook

`INTERNAL_DEMO_RUNBOOK.md` rewritten to v2.0.0. The v1 script routed through `/portfolio` and
`/curiosity` and a *"Launch Underlying Experiment Workspace"* button, none of which exists; it
attributed reasoning to *"the Gemini AI engine"* on a screen that makes no model call; and it carried
its own financial figures in prose — £168,000, £480,000, a 1,400-case deficit — where nothing could
notice when they changed and nothing carried provenance.

v2 quotes **no figures at all**. It walks the current journey, and where a facilitator needs numbers it
sends them to *Prepare me for a client conversation*, which reads governed records at the moment of
asking and assembles the "do not claim" list for them. It gains a §8 *What not to say* and drops the
sales framing the brief asked to remove.

---

## 10. Browser acceptance

Chromium, at **1440 × 900**, **1024 × 900** and **720 × 900**, against a production build with
`NEXT_PUBLIC_COGNIX_DEMO_MODE=true`.

### 10.1 The journey

All thirteen steps exercised. Landing, discovery, clarification, persona lens, capability detail,
visuals, Questions, Ask CogniX, optional research, client preparation, Observability & Governance
(including Atlas Health) and About.

**No horizontal page overflow and no clipped element at any width on any surface.** The only console
error observed at any point was a Next.js dev-server connection reset, absent from the production
build.

### 10.2 Named scenarios

| Scenario | Result |
|----------|--------|
| `What capabilities does CogniX have on Promotions?` | **27 → 9 results** after the stopword correction, all promotion work, Promotion Intelligence first. One aspect question follows |
| `Show me Promotion capabilities from an architect perspective.` | Lens read from the sentence and marked *inferred*; state **clear**; no further question |
| `Promotions, demand, signals and inventory` | Genuinely spans four areas; multi-select area question with a free-text box |
| `Why did the decision change?` | Spans five areas; Decision Contract, Decision Ripple and Campaign Decision lead |
| Grocery demand-planning leader, 30 minutes | 11 capabilities, 3-step sequence, 6 anticipated questions, 23 demo warnings, **22 "do not claim" entries**, market context 0 with the reason stated |
| `zxqw plover` | 0 results, no fabricated near-match |

### 10.3 The defect the browser found that no suite could

Below 1024px **every navigation destination was unreachable**. `.sidebar { transform:
translateX(-100%) }` with a `.sidebar.open` escape hatch nothing set. No Capability Atlas link, no
Observability & Governance, no demonstration surface, no Exit Demo, and no menu control anywhere on the
page. A menu toggle and a dismissing scrim now supply the switch, inert above the breakpoint, and
choosing a destination closes the panel. Verified reachable at 1440, 1024 and 720.

---

## 11. Persona lenses

Same capability (Decision Gap Intelligence), four lenses, measured in the browser:

| Lens | First questions |
|------|-----------------|
| Innovation Executive | *What problem does this solve?* · *Why is this genuinely different?* |
| Sales | *What client pain does this address?* · *Can I show this today?* · **What must I not claim?** |
| Architect | *How does it actually work?* · *What does it integrate through?* |
| Developer | *Is this actually built?* · *Where is the code?* · *How do I verify it?* · *What is known to be incomplete?* |

**No two lenses produce the same heading sequence** — asserted pairwise, six comparisons, all
distinct. Rendered length varies from 2,850 to 3,321 characters.

**The facts are identical in all four.** LIFECYCLE `Prototype`, DEMO `Production Ready`, BUILD
`Implemented` appear in every lens; the limitation is present in every lens, phrased for the reader.
Field-by-field invariance across the whole registry is proven in `run-atl06d-tests.ts` §B; this pass
confirms it renders that way.

---

## 12. Search and clarification

### 12.1 Two mechanical defects, fixed mechanically (ADR-062 Amendment A)

**The corpus's own noun was a content word.** ADR-062 had already made `cognix` a stopword because in a
corpus where every record is a CogniX capability it matches everything and discriminates nothing — and
left `capability` in. It is the same word. *"What capabilities does CogniX have on Promotions?"*
returned **27 of 38** and ranked **Enterprise Signal second on a promotions question**. The correct
answer led, which is why the defect survived every reading of the first result. After the amendment:
**9 results**, all promotion work. No capability is named with the word, so nothing became unfindable;
*"capability atlas"* still resolves on `atlas`.

**A hyphenated query reached nothing.** `pre-mortem` returned **zero** while `pre mortem` returned the
right capability, and the corpus contains the hyphenated spelling eleven times. `IDENTIFIER_PATTERN` is
applied to the upper-cased query, so `PRE-MORTEM` read as a governed identifier, matched no record, and
took the whole query out of the residual with it. `half-life` and `decision-gap` failed identically.
Now **only a token the searcher actually wrote in upper case is consumed as an identifier**: `DDF-01`
still yields an identifier and no terms, while a lower-case hyphenated token yields the identifier
reading *and* its words — a superset, so nothing that matched before stops matching.

**No vocabulary was added.** Both fixes remove non-discriminating behaviour; the governed alias register
(ADR-059) remains the only route by which a term enters, and it is unchanged at 22 aliases.

### 12.2 Clarification

The clarification engine had to follow the first fix. With the noise removed, *"Show me Promotion
capabilities from an architect perspective"* settled on one area and the engine then asked *"which
aspect of Campaign & Promotion?"* of a reader who had just said Promotion. The rule that already lowers
the area-dominance bar for a declared intent now also **suppresses the aspect question where the area
was inferred from the reader's own words and an intent was declared with it**. A reader who picked an
area *from a clarification round* is still offered the next question: that is the progressive flow, not
an interrogation.

Measured behaviour:

| Query | State | Question |
|-------|-------|----------|
| `Show me Promotion capabilities from an architect perspective.` | **clear** | none |
| `how do I test Decision Gap` | **clear** | none |
| `What capabilities does CogniX have on Promotions?` | needs-clarification | one **aspect** question within Campaign & Promotion |
| `signals` | needs-clarification | aspect — *"What a signal is"*, *"Connecting our own data"*, *"Turning signals into an outlook"*, *"Rehearsing signal conditions"* |
| `Promotions, demand, signals and inventory` | multiple-interpretations | **area**, multi-select |
| `Why did the decision change?` | multiple-interpretations | **area**, multi-select |

Every question offers *Show me everything* and a free-text box, and the ceiling remains two.

### 12.3 Residual gap

The 18-question `ATL-06C` retrieval baseline is **unmoved**: none of those questions contains
`capability` or a hyphenated term, so neither fix touches the measurement that justified deferring
Level 2 semantic retrieval (ADR-058). That deferral still stands on its own evidence.

---

## 13. Visual explainability

Inspected in-browser at all three widths. Decision Gap renders its two frontiers on one track with the
distance between them named as the concept itself; at 720px the track reflows vertically and the gap
rule rotates rather than clipping. Every visual carries a prose description saying the same thing, and
**no visual carries a number** — they are configuration on the capability's own knowledge record
(ADR-063). No new visual type was added; none was needed.

---

## 14. Client conversation (ATL-06D)

Tested adversarially against the grocery demand-planning scenario.

The pack cannot recommend what does not exist: *"a capability that could not produce a reason is not
in this list."* It separates what CogniX understood from what it inferred — **"COGNIX INFERRED — CHECK
THIS"**, each inference naming the phrase it was read from (*"forecast accuracy"*, *"grocery"*, the
role *"planning lead"*). It states what it lacks: *"How long the meeting is — the sequence adapts to
it."*

Checked and confirmed absent: no invented integration, no named competitor, no invented client fact,
no metric that is not quoted from a record. Field-level truth is preserved — *"within Forecast
Stability Intelligence, `material_revision_probability_pct` is simulated even though the capability as
a whole is implemented"*. The **Do not claim** section pairs each entry with *"Say instead"*.

**Market Context renders empty with its reason**: *"No part of this question asks for market,
competitor, analyst, pricing or third-party platform knowledge, so it is answered from governed CogniX
records only."* External research remains opt-in and off by default.

---

## 15. External provider and evidence

| Check | Result |
|-------|--------|
| Central model configuration | `config/gemini-models.ts`, one source, resolved at call time |
| Obsolete aliases active | none — `gemini-3.6-flash` throughout |
| Verification metadata | `f1c390bc`, 2026-08-21, 6 contract assumptions, 5 scenarios |
| Provider-drift checks | **0 findings** |
| Credential isolation | **PASSES** — sentinel absent from `.next/static`, from build output, from the server build, and no `.env` tracked in git |
| Internal-only question invokes the provider | **no** — proven by a counting proxy at `AC-ATL-06C-9`, count zero |
| Browser-side call to the provider | **none** — the only outbound Google request from the page is the Google Fonts stylesheet |

**Market-evidence admission remains at zero, and no rule was relaxed to change that.** The allowlist,
tier, provenance and freshness conditions are byte-identical to `ATL-06A`. An empty evidence class that
a reader can trust is worth more than a populated one nobody can trace; the surfaces state the absence
rather than hiding it.

---

## 16. Validation estate

| Instrument | Result |
|------------|--------|
| TypeScript (`tsc --noEmit`) | **0 diagnostics** |
| Test runners | **35 of 35 exit 0** |
| Atlas suites | `atl02` 119 · `atl03` 29 · `atl04` 58 · `atl04r` 121 · `atl05` 54 · `atl06a` 115 · `atl06b` 133 · `atl06c` 127 · `atl06d` 96 · `atl07` 52 · **`atlfinal` 57** |
| Previously failing | `cdi07a` **155 / 0** · `cdi07b` **235 / 0** |
| Governance (`atlas-governance-check.ts`) | **GOVERNANCE CLEAN — no blocking findings.** `--enforce` exits **0** |
| Governance findings | 0 blocking · 13 advisory before this phase's own commit, **17 after** (12 × `GOV-REC-6` lifecycle nulls, 1 × `GOV-REC-2H` confirmed historical, 4 × `GOV-REC-3` on records citing files this phase edited on the review date — register R-14) |
| Production build | **clean**, 72 pages generated, no build warnings |
| Credential isolation | **passes** |
| Browser | 1440 / 1024 / 720, thirteen-step journey, no overflow, no clipping, no production console error |

Four earlier assertions were **re-pointed, never relaxed**, each because the state it was written
against had been corrected:

- `run-atl07-tests.ts` **D3 / D4** read the live corpus and passed only while it held twenty blocking
  findings. They now **construct** the case — one record made incomplete against a sound corpus — which
  proves the per-record property whatever the corpus contains, and keeps proving it when the corpus is
  clean. **D4b** was added to assert the clean state.
- `run-atl07-tests.ts` **D6** asserted the count of twenty. It now asserts the closure, with the
  historical figure preserved in the comment and in this report. **D7** was rewritten to keep the shape
  of the original finding testable if the gap ever reopens.
- `run-atl04r-tests.ts` **C1 / C2 / C5** used *"What capabilities does CogniX have on Promotions?"* as
  the canonical area-ambiguous query, when its area spread was the artefact. They now use a query that
  is multi-area in substance, and **C2a / C2b** were added to hold the corrected single-area behaviour
  so the artefact cannot return unnoticed.
- `run-atl04r-tests.ts` **F2–F4** matched the literal `onNavigate('…')` call. They now name the
  destination rather than the caller, and **F4b** was added.

Each re-pointing is a strictly stronger assertion than the one it replaced.

---

## 17. UX judgement

Does it read as one coherent innovation exploration product?

**Yes, with one seam now closed.** One destination answers four questions — what CogniX can do, what it
has built, what is worth asking, and what you can honestly say in a meeting. Search leads; filters are
behind progressive disclosure; the persona lens is an exploration dimension rather than a global
setting; Portfolio and Questions are views rather than pages. It does not read as documentation,
because every claim opens into the record behind it; it does not read as an admin dashboard, because
the one governance surface is a section of a page a reader arrives at with a question; it does not read
as a chatbot, because Ask CogniX quotes records and refuses rather than narrating.

The seam that was real: a capability record named the solution that demonstrates it and gave the reader
nowhere to go, which is exactly what makes a product read as documentation *about* a product. It is
closed.

Recorded as subjective enhancement rather than scope:

- The preparation workspace does not carry a lens into the pack's own reading, though it reports the
  Atlas lens correctly. Whether it should is a design question.
- The search input carries no `type` attribute. Harmless, but a validator will mention it.
- Questions Worth Asking holds four registered questions. Honest, and thin.

---

## 18. Baseline decision

The Atlas is **baseline-ready**. The estate is green, the governance engine is clean, the record
corpus meets the tier every record claims, and every residual is either closed or recorded with the
reason it is not.

It is **client-demo ready**, with the demonstration governed by the runbook's §8 and by each
preparation pack's *Do not claim* section — which is a stronger guarantee than a demo script, because
it is generated from the records at the moment of asking.

**Merge is not part of this phase.** The branch is pushed and left unmerged; branch reconciliation is a
separate decision with its own evidence.
