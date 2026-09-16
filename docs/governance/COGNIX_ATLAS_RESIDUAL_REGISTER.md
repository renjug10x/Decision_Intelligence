# COGNIX CAPABILITY ATLAS — RESIDUAL REGISTER

**Document Status:** Approved & Authoritative
**Version:** 1.1.0
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

**Version 1.1.0, 22 August 2026** adds §5 (the final owner review of the twenty-one authored
assumptions) and §6 (the accepted baseline). R-13 closes; R-12 remains the Atlas's only open owner
decision.

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

### R-13 — Twenty authored assumptions awaited owner confirmation · **CLOSED**

**RESOLVED at the final owner review, 2026-08-22.** All twenty-one assumption statements across the
twenty records were re-checked against implementation, contracts, tests and ADRs rather than against
the prose that produced them. **Twenty confirmed, one amended, none left undecided.** The full
capability-by-capability table with the evidence for each verdict is §5 below.

The one amendment was `CAP-DECISION-CONTRACT`. The assumption asserted that *"an input re-derived with
the same meaning but a different serialisation reads as changed, so the contract assumes upstream
producers emit a canonical form"*. `artefactDigest` is `sha256Hex(canonicalJson(obj))`, and
`canonicalize()` in `campaign-decision-contract-model.ts:616` sorts keys and drops `undefined` — so the
engine canonicalises for the producer and the stated premise was **false about its own mechanism**. The
real residual premise is narrower and survives: canonicalisation normalises structure, not value, so a
number re-derived to a different floating-point representation or a timestamp regenerated at a
different precision still digests as a changed basis. The assumption now says that.

The original wording was authored during closure from each capability's recorded architecture,
description, limitations and implementation, which is why one of twenty-one was a plausible reading of
prose that the code contradicted.

`reviewed_at` was moved on **eleven** records at closure — those whose cited files had drifted under
`GOV-REC-3` and which were therefore re-read against the specific change. It was **not** moved on the
other fifteen. The `GOV-REC-3` remedy names moving a review date without reading as the one evasion the
check cannot detect, and the reverse restraint is the safe one: a date is moved only where a specific
re-reading actually happened.

The owner review of 2026-08-22 was that reading, and it was a reading of the *assumption* against the
*code*, not of the whole record against its cited files. The dates therefore stay where they are: an
assumption verdict is not a record review, and conflating them would be the evasion above wearing a
different hat.

### R-14 — `GOV-REC-3` cannot see within a day · **OPEN — GOVERNED**

`reviewed_at` is a date and a commit timestamp is an instant, so a file edited at 09:00 and re-read at
17:00 on the same day still reads as drift. The check treats a same-day change as drift deliberately —
the alternative is to assume the review came last, which is the assumption that lets a stale record
pass. This is advisory, correct-by-design, and cheaper than the alternative.

**Measured after `ATL-FINAL`'s own commit: four findings**, each on a record citing a file this phase
edited on the review date — `CAP-INNOVATION-PORTFOLIO` (`CapabilityAtlas.tsx`, `run-atl04r-tests.ts`),
`CAP-ARCHITECTURE-STORYBOARD` and `CAP-GOVERNANCE-SETTINGS` (`ObservabilityGovernance.tsx`), and
`CAP-DECISION-LIFECYCLE-VIEW` (`CapabilityDetail.tsx`). All four were re-read against those specific
changes and remain accurate. Moving `reviewed_at` again would clear the finding for a day and re-arm it
on the next commit that touches those files, which is why the finding is reported here rather than
dated away. It clears on its own at the next review that follows a quiet day.

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

### R-19 — The signal fabric stamps civil wall-clock time where the scenario clock is authoritative · **CLOSED — `SCI-01`, 2026-09-16**

Measured at `f9c5679c` against the running application. Two consecutive identical
`GET /api/v1/signals` calls return byte-identical `baseline_value`, `observed_value`, `delta`,
`delta_pct`, `confidence`, `quality`, `provenance` and `signal_id`, and differ **only** in
`observed_at` and `effective_at`, which read `2026-09-15T20:28:37Z` and `…:38Z` — the wall clock.
`canonicalScenarioNowIso()` is `2026-06-03T00:00:00.000Z`, and the canonical module states the rule
in its own comment: the clock is anchored to the demand history, *"never to civil time"*.

Two consequences, both live. Signal freshness is meaningless, because every signal is permanently
zero seconds old. And the Observability *Refresh* control appears inert, because the only field that
moves is the one field that should not move at all.

**This is not `D-FM-2`.** That defect was the frozen `2026-06-04` window anchor on the forecast path
and `FM-01` closed it; the forecast window now derives from the data's own coverage. This is the
signal fabric, and it was never in scope of that migration. Recorded separately so neither is read as
covering the other. Closed by ADR-078 under `SCI-01`.

**Closure evidence (2026-09-16).** `packages/contracts/src/scenario-clock.ts` owns the contract and
maps every `SimulationPeriod` to a scenario-day offset. `enterprise-signal-generator.ts` and
`dynamic-signal-simulator.ts` stamp `observed_at` / `effective_at` through it. Measured against the
running application: two consecutive `GET /api/v1/signals` reads are byte-identical including both
timestamps, and the Observability panel publishes *"as at 2026-06-03 (scenario time, not the wall
clock)"* with each signal carrying its observed period — `T-7`, `T-3`, `T-2`, `T-1`, `Today`.
Asserted by `run-signal-tests` 3b / 5d and `run-canonical-scenario-tests` §11.

### R-20 — Observability signals contradict the canonical decision case · **CLOSED — `SCI-01`, 2026-09-16**

The Observability & Governance signals panel issues `GET /api/v1/signals` with no scenario parameter.
The route defaults to `family_id=promotion_surge`, `scenario_id=SCN-PROMO-01`, and the surface
publishes `SUPPLIER_CAPACITY_PRESSURE` against entity **FreshDirect UK** — the supplier
`DEMO-HARD-01` replaced with Cheshire Cheese Co (SUP002), and which
`COGNIX_PRESENTATION_SYNC_DELTA.md` §3.3 records as a value any slide must change.

The generator is **partly** migrated: it already names *Fresh Dairy* and *P004 Cheddar Mature 400g*
correctly. This is a half-completed migration rather than an untouched legacy path, which is why it
survived review — the surface looks canonical until the supplier is read. Highest client-visible
risk in the estate at this baseline. Closed by ADR-077 under `SCI-01`, whose part 4 — no surface
resolves a scenario by default — is what stops it returning through another route.

**Closure evidence (2026-09-16).** Measured against the running application at 1440 / 1024 / 720: the
signals panel publishes `SUPPLIER_CAPACITY_PRESSURE` against **Cheshire Cheese Co** at the scenario's
own 385,000 → 450,065 units a week, under scenario `SCN-FRESH-DAIRY-CHEDDAR-001`. `FreshDirect UK`
and `SCN-PROMO-01` appear nowhere in the payload. `GET /api/v1/signals` with no `scenario_id` returns
`HTTP 400` naming the missing parameter, and with `scenario_id=SCN-PROMO-01` returns `HTTP 400`
because the identity is not registered. Four defaulting sites were removed rather than one: the two
signal routes, the world service's own copy of the same rule behind the proxy, and the decision-state
store, which opened every session on the retired identity and on three constraint literals naming
FreshDirect UK at 48,000 units a week.

### R-21 — `skuContextFactor` is a name hash with economic effect · **CLOSED — `SCI-01`, 2026-09-16**

`lib/campaign-causal-engine.ts` applies `0.94 + (hashSeed(sku_scope‖region) % 13)/100`, a ±6% band on
every causal number, derived from the **spelling** of a SKU list and a region name. It is
deterministic and it is not explainable: *"because the hash of your region name was 1.03"* is not an
answer a Decision Trace can give.

Its own comment already records the argument against it — category was removed from the seed because
*"renaming a category — even to the same thing spelled differently — moved every downstream number by
up to 6% for no modelled reason"* — and that argument applies unchanged to the two dimensions still
in the seed. It is also a hard blocker for authored scenarios, whose names are arbitrary strings: a
scenario named *North West* and one named *Northwest* would differ economically by up to six per cent.

It is a material part of the residual Promotion seam ADR-075 bounded rather than closed. Closed by
ADR-079 under `SCI-01`, which retires it rather than parameterising it and re-derives the ADR-075
assertion instead of relaxing it.

**Closure evidence (2026-09-16).** `skuContextFactor` and `hashSeed` are removed from
`lib/campaign-causal-engine.ts`; `CanonicalScenario.differentiation` declares scope multipliers with
mandatory reasons — the canonical scenario declares NONE — and depth-response anomalies with theirs.
§8 of the canonical suite now asserts exact equality of the price-depth response at national and
regional scope, and attributes the remaining divergence to named design components. A source guard in
§11 fails the build if a hash of a name becomes a numeric factor again.

**What closure exposed, and it is the substantive finding of `SCI-01`.** The seeded elasticity curve
was itself calibrated against the hashed engine: it carried 2.34pp per point of depth where the
record declares 2.4pp gross and 8% cannibalisation, which is 2.208pp net. 2.34 = 2.208 x 1.06, and
1.06 is what `hashSeed('P004::National')` returned. The curve and the engine therefore agreed at
exactly one scope, by coincidence, and the `ADR-075` bound was measuring that coincidence. Deriving
the curve from the record moves the Promotion surface's published figures — 20% depth from +46.8% and
+£8.1K to +44.16% and −£5.2K — and is recorded in `COGNIX_PRESENTATION_SYNC_DELTA.md` §3.1.
Demand → Promotion → Campaign Decision §1 and §2 are unchanged to the digit.

### R-22 — `ESF-2`'s simulation engine is complete and consumed by no production surface · **OPEN — assigned `SCI-05`**

`POST /api/v1/signals/simulate` and `simulateEnterpriseSignalTimelines` exist, are deterministic, are
tested by `run-esf2-tests.ts`, and already take a `SignalSimulationContext` carrying scenario,
decision-state version, promotion lift, supplier cap, horizon, cannibalisation and selected
interventions, returning timelines across `T-90 … T+30` with per-observation provenance.

No production surface calls it. The Observability Refresh re-issues a `GET` against a deterministic
snapshot instead. The capability for a meaningful Refresh was built by `ESF-2` and never wired.
Recorded because it changes the cost of ADR-081 from *build an engine* to *consume one*. Closed by
`SCI-05`.

### R-23 — The Master Plan understated the cross-surface assertion count · **CLOSED**

`MASTER_PLAN.md` recorded the `DEMO-HARD-01` suite as *"74 cross-surface and currency assertions"*.
Measured at `f9c5679c`: **243 passed, 0 failed**. `DEMO-HARD-02` and `DEMO-HARD-04` added assertions
without updating the narrative. Nothing was wrong with the tests. Corrected in the Master Plan in the
same commit as this entry.

### R-24 — Programme 10 phase letters collide between the planned and completed lists · **OPEN — GOVERNED**

`MASTER_PLAN.md` lists Phases 10A–10J twice with different meanings. In the planned list 10E is
Shared Decision State and 10F is Pattern Matching ML; in the completed list 10C is Shared Decision
State and 10D is Memory & Learning API Extraction. The letters do not correspond, so a citation of
"Phase 10E" resolves differently depending on which list the reader found first.

**Recorded rather than renumbered.** Renumbering would invalidate citations in nine reports and in
`COGNIX_INNOVATION_BACKLOG.md`. A reader should treat the *completed* list as authoritative for what
was built and the *planned* list as authoritative for what remains, and cite by capability name
rather than by letter.

### R-26 — CDI-03 opportunity and micro-market SCORES are still derived from a name hash · **OPEN — unassigned**

Found while closing `R-21` and recorded rather than fixed, because fixing it is not `SCI-01`'s to do.

`lib/campaign-opportunity-engine.ts` derives opportunity-window and micro-market readiness points
from `hash01()`, keyed on dates, `tenant_id`, the region name and the SKU list:
`4 + 24 * hash01('event', …)`, `2 + 22 * hash01('weather', …, region)` and
`8 + 12 * hash01('avail', store_id, sku)`. It is the same fragility under renaming that ADR-079
describes — two spellings of one region produce different window scores — and it has the same
consequence for authored scenarios, whose region and SKU names are arbitrary strings.

**Why it is not closed here.** ADR-079's ruling names `skuContextFactor` and governs a scenario's
published ECONOMICS. These values are readiness SCORES: they are declared `synthetic_demo: true` with
a stated rationale, they price nothing, and no money on any surface moves with them. Retiring them
would change CDI-03's published opportunity windows with no ADR authorising that change, which is the
scope discipline ADR-084 part 3 exists to enforce.

**How it is held.** `run-canonical-scenario-tests.ts` §11 carries it as a single DECLARED exclusion
from the hash guard, named in source with this residual's reasoning, plus an assertion that the
exclusion stays honest — `hash01` must continue to touch no monetary term. Anything NEW of this shape,
anywhere in the engines, still fails the build.

**Disposition.** For the packet that next owns CDI-03 scoring. It should be resolved the same way
ADR-079 resolved the economics: declare the differentiation with a reason, or have none.

### R-25 — `ATL-06B` assertion `A6b` is stale, and the estate carries two Google SDKs · **OPEN — GOVERNED**

`run-atl06b-tests.ts` `A6b` asserts *"…and package.json gained no new provider dependency"*, checking
that `@google/genai` appears in neither `dependencies` nor `devDependencies`. At `f9c5679c` it does:
`@google/genai ^2.17.1`. **The runner fails 1 of 133 assertions on the pristine baseline.**

**The assertion is stale; the code is not.** `ATL-06B` shipped its grounding adapter over REST with no
SDK, and the assertion recorded that fact. Commit `d625235` (2026-08-18, *"feat(api): integrate
@google/genai for enhanced Gemini API functionality"*, in ancestry) subsequently added the SDK for a
different purpose: `lib/gemini.ts` calls it as the primary path with a REST fallback and model
rotation, and `next.config.ts` declares it in `serverExternalPackages`. The assertion was never
updated to distinguish *the grounding adapter adds no SDK* from *the estate adds no SDK*.

**The estate therefore carries two Google SDKs**, both for the same provider:

| Package | Used by | Purpose |
|---|---|---|
| `@google/genai` ^2.17.1 | `lib/gemini.ts` | Primary Gemini call path, with REST fallback |
| `@google/generative-ai` ^0.24.1 | `lib/gemini.ts`, `lib/atlas/grounding/providers/*` | Legacy client and the grounding types |

**This does not breach ADR-083 or the `SCI` GenAI position.** Both are Google; no third-party provider
exists, and no `SCI` packet introduces one. What it does mean is that a governance record claiming
*"no provider dependency"* is inaccurate, and that consolidating onto one SDK is real, unscheduled
work.

**Disposition.** The assertion is corrected — not deleted — by whichever packet next touches provider
configuration, and the correction states what `ATL-06B` actually meant: *the grounding adapter imports
no SDK*, which remains true and is separately asserted by `A6`. Recorded here rather than fixed in the
governance-authoring commit, because changing a test is an application change and this task is
governance-only. Until then, a `SCI` convergence gate passes on **no regression against a 43-of-44
baseline**, not on a clean estate — see `COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md` §6 item 5.

**How it went unnoticed.** A shell loop over the runners reports the exit status of its last command,
so a single failing runner is masked unless each is checked individually. Both the earlier assessment
pass and this one initially reported a clean estate for that reason. Recorded so the next reader
checks per-runner rather than per-loop.

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
| Advisory findings | 24 | **17** (13 before `ATL-FINAL`'s own commit) |
| Lifecycle tier gaps (`GOV-REC-1`) | 20 | **0** |
| No lifecycle state (`GOV-REC-6`) | 12 | **12** — deliberate, see R-02 |
| Source drift since review (`GOV-REC-3`) | 11 | **4** — see R-14; all four cite files `ATL-FINAL` itself edited on the review date |
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

---

## 5. Final owner review — the twenty-one assumptions (2026-08-22)

Every assumption authored at `ATL-FINAL` was re-checked against **implementation, contracts, tests and
ADRs**, not against the record prose that produced it. Verdicts: **20 CONFIRM, 1 AMEND, 0 owner
decision.**

| Capability | Assumption (abridged) | Evidence checked | Why it matters | Risk if wrong | Verdict |
|---|---|---|---|---|---|
| `CAP-CAMPAIGN-DECISION` | The four canvas input areas are sufficient to determine a campaign decision | `CampaignCanvasArea` is a closed union of exactly four members (`campaign-intent-model.ts:42`); `canvas_progress.active_area` drives the whole flow | The canvas is the entry to every CDI engine; its inputs bound what any of them can consider | A client decision turning on a fifth input is silently unrepresentable, not visibly refused | **CONFIRM** |
| `CAP-CATEGORY-INTELLIGENCE` | Profit and volume are available at the same sub-segment and region grain | `getCategoryPerformance` (`query-engine.ts:140`) runs one `aggregate()` over one `sales` set with one `key` — subcategory when a category is set, else category — for both current and prior periods | The capability's whole claim is a divergence between two series | A divergence across mismatched aggregations is an artefact presented as an insight | **CONFIRM** |
| `CAP-COMMITMENT-INTELLIGENCE` | Chain stages consume capacity in a fixed declared order, one after another | `stages: ChainStage[]` is an ordered literal array — marketing → demand → supplier → inventory → … (`CommitmentIntelligence.tsx:103`) | "First breaking stage" is only meaningful over a sequence | A parallel-served commitment makes the single first-breach reading wrong | **CONFIRM** |
| `CAP-COUNTERFACTUAL-BASELINE` | The counterfactual holds no unmodelled concurrent intervention | `campaignDelta(without, predicted, …)` (`campaign-causal-engine.ts:696`) attributes the entire `predicted − without` difference to the campaign | Attribution is the capability | A second initiative running concurrently is scored as campaign effect | **CONFIRM** |
| `CAP-CURIOSITY-QUESTIONS` | A registered question is worth asking because the estate can route it | `CURIOSITY_QUESTIONS` is a hand-curated content registry of four records, each carrying its own routing refs | The register is the capability | A question added without a route is a dead end the surface cannot detect | **CONFIRM** |
| `CAP-DECISION-CONTRACT` (1) | ~~Serialisation differences read as changed, so producers must emit canonical form~~ | `artefactDigest = sha256Hex(canonicalJson(obj))`; `canonicalize()` sorts keys and drops `undefined` (`campaign-decision-contract-model.ts:616`) — **the engine canonicalises for the producer** | The digest is what makes a bound basis verifiable | Stated as written it would send integrators to solve a problem the engine already solves, and hide the one it does not | **AMEND** — now: structure is normalised, value is not; a re-derived float or a regenerated timestamp still digests as changed |
| `CAP-DECISION-CONTRACT` (2) | Reconsideration triggers are declarable in advance | `TriggerClass` is a closed union `T-INTENT \| T-CONSTRAINT \| T-READINESS \| T-SIGNAL \| T-EVIDENCE`; `TriggerOutcome` carries `UNASSESSABLE` for what cannot be evaluated | Half-Life reports movement only along declared dimensions | A basis moving along an undeclared dimension is invisible, and the contract cannot say so | **CONFIRM** |
| `CAP-DECISION-READINESS` | The six dimensions are independently evaluable | `READINESS_DIMENSION_ORDER` is exactly six; each is assessed in its own block and only then combined via `dimensions.map(d => d.state)` | The verdict must never hide which dimension caused it | A common cause reads as several weak dimensions, leaving aggregation to the reader | **CONFIRM** |
| `CAP-DECISION-REGRET` | `ACT_NOW` / `WAIT` / `DO_NOTHING` exhaust the alternatives | `action_type` is that closed union (`demand-decision-frontier-model.ts:183`); the fourth value `CHOICE_REQUIRED` is a refusal, not an alternative | Regret is relative to the compared set by construction | An unenumerated option cannot be surfaced however good it would have been | **CONFIRM** |
| `CAP-DECISION-RIPPLE` | Consequences propagate outward without feeding back | Ordered 1st/2nd/3rd-order layers with no return path (`DecisionRippleIntelligence.tsx:172`) | The layers are read as a cascade | A second-order effect that changes the first-order magnitude is not modelled | **CONFIRM** |
| `CAP-DECISION-TIMELINE` | Every period is reported under one identity basis | `FLAT_RATE_IDENTITY` is the sole `allocation_profile` throughout `campaign-timeline-engine.ts`; the post-campaign region is `NOT_AVAILABLE` rather than reconciled | A progression across mixed bases compares different things | Mixing bases would make the timeline a comparison of unlike quantities | **CONFIRM** |
| `CAP-DEMAND-FORECAST` | Stability, gap, window and regret come from one evaluation of one input set | `evaluateDemandDecisionFrontier` is imported once and called once (`Forecasting.tsx:19, 281`) | The four cards are read together | Four independent queries could disagree while appearing to describe one situation | **CONFIRM** |
| `CAP-EXPERIMENT-CANVAS` | An experiment is fully describable by the registry schema | The canvas renders only registry fields; `ATL-01` gap `G1` records that demo maturity cannot be shown because the schema has no such field | The schema is the real boundary of the capability | Anything the schema omits is unreachable by authoring alone | **CONFIRM** |
| `CAP-INNOVATION-PORTFOLIO` | The governed registry defines what CogniX has built | `PortfolioView` counts landscape records only; `ATL-01` F1 recorded 20 governed-but-unregistered capabilities before the Atlas existed | Every figure on the surface is a count of records | A capability nobody registered is absent with no sign that it is missing | **CONFIRM** |
| `CAP-INTENT-FUSION` | Declared intent is an accurate statement of what the organisation is trying to do | `intent-fusion-engine.ts` contains no validation, corroboration or operative-intent test — it reads the environment against the declaration | The outlook is the environment read against a statement | A stale or aspirational intent produces a confident outlook against the wrong plan | **CONFIRM** |
| `CAP-LEARNING-LOOP` | Prediction and outcome are comparable only on exact grain and basis match | `evaluateComparability` fails closed on authority, empty grain, window mismatch, undeclared metric correspondence and unit mismatch before any comparison is attempted | Silence must not be read as agreement | Adjusting one side to fit the other would manufacture a verdict | **CONFIRM** |
| `CAP-OBSERVATION-CORRESPONDENCE` | The declared metric-to-signal table is complete for contracted decisions | `METRIC_CORRESPONDENT_SIGNAL_TYPES` is a closed table; an unlisted metric returns `METRIC_CORRESPONDENCE_UNDECLARED` (`campaign-learning-loop-engine.ts:548`) | Correspondence is the gate on comparability | A legitimate correspondence nobody declared is refused — safe, but silent | **CONFIRM** |
| `CAP-OPPORTUNITY-WINDOW` | Candidate intervals are independently executable | `campaign-opportunity-engine.ts` carries no prior-window, cumulative or history term — each interval is scored on its own factors | Windows are ranked against each other as if unconditioned | The cost of having already run a campaign in an earlier window is not carried | **CONFIRM** |
| `CAP-OUTCOME-FRONTIER` | The declared objectives capture what the decision trades off | `ConstraintSource` is `HUMAN_DECLARED \| DERIVED_FROM_STATED_OBJECTIVE` — both declared, neither inferred | A Pareto set is only as honest as its axes | An undeclared objective cannot rescue a candidate the frontier shows as dominated | **CONFIRM** |
| `CAP-PREDICTIVE-INVENTORY` | Buffer failure is determined by lead time and demand velocity at store grain; substitution is not modelled | Exposure is computed from literal arrays; the DC transfer appears only as a recommended **action string**, never as a term in the exposure calculation | Exposure is presented as revenue at risk | A stock-out absorbed elsewhere is still counted as full exposure | **CONFIRM** |
| `CAP-PROMOTION-INTELLIGENCE` | The lenses are views of one evaluation, not separate analyses | **Zero `fetch(` calls across all six `*Lens.tsx` files** — every lens receives its data as props | One workspace must not disagree with itself | A lens recomputing its own numbers could contradict the others while looking like the same workspace | **CONFIRM** |

**Nothing was rewritten for wording.** The single amendment corrects a statement the code contradicts;
the other twenty stand exactly as authored.

---

## 6. Baseline

With the assumption review closed and no blocking defect outstanding, the Capability Atlas
implementation baseline is recorded as:

> ### Implementation Complete — Accepted Baseline
> `ATL-01` … `ATL-07`, `ATL-04R` and `ATL-FINAL`, accepted 22 August 2026 at the final owner review.
> Governance clean (0 blocking, `--enforce` exits 0). Estate 35 of 35 runners green. Branch unmerged.

The open rows in §1 are carried **into** the baseline, not resolved by it. R-12 and R-13 were the two
owner decisions at closure; **R-13 is now closed** by the review above. **R-12 remains open** and is the
only owner decision the Atlas still carries.
