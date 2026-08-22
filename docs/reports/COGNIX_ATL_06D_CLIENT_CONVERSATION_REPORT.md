# COGNIX `ATL-06D` — PREPARE ME FOR A CLIENT CONVERSATION

**Work Package:** `ATL-06D` — Client Conversation Pack
**Status:** **COMPLETE** — `AC-ATL-06D-6` closed 2026-08-21 when the inherited `AC-ATL-06C-9` passed live on `f1c390bc`. Sanitised evidence: [`COGNIX_ATL_06C_LIVE_VALIDATION_SUMMARY.md`](COGNIX_ATL_06C_LIVE_VALIDATION_SUMMARY.md)
**Date:** 2026-08-21
**Owner:** G10X Enterprise Innovation Lab Architecture Board
**Governing decisions:** ADR-045, ADR-046, ADR-047, ADR-048, ADR-049, ADR-050, ADR-053, ADR-054,
ADR-055, ADR-056, ADR-057, ADR-059, ADR-063, **ADR-064** (a lens changes the questions — new),
**ADR-065** (admission by rationale — new), **ADR-066** (sales integrity is a contract rule — new)
**Branch:** `claude/cognix-capability-atlas-v2`

---

## 1. Status, stated plainly

`ATL-06D` is implemented and browser-verified. It inherits one open acceptance criterion from
`ATL-06C` and does not close it.

**`AC-ATL-06C-9` remains OPEN.** The governed live-validation procedure was run rather than assumed:

```
$ npx tsx scripts/atlas-live-grounding-check.ts
=== Stage 1 — request contract against the live service (no credential needed) ===
  PASS  grounding tool `googleSearch` is a recognised field
  PASS  structured output `responseSchema` is a recognised field
  PASS    …`notARealTool` is rejected as an unknown field, not on the credential
=== Stage 2 — SKIPPED, NOT PASSED ===
  GEMINI_API_KEY is not set, so no live round trip was attempted.
```

The owner authorised a credentialed round trip and stated a key would be supplied. **No
`GEMINI_API_KEY` reached this environment**, checked at the start of the work and again at the end.
No round trip was performed and none is claimed. `ATL-06C` stays `[COMPLETED — LIVE VALIDATION
PENDING]` and `ATL-06D` inherits that qualifier rather than erasing it.

### What proceeded, and on what basis

`ATL-06C`'s handoff says *"`ATL-06D` should not begin until `AC-ATL-06C-9` is closed"*, and the
reasoning behind it is sound: *"a pack assembled on a pipeline that has never run against a real
search is a pack whose most confident section has never been tested against reality."*

That reasoning applies to the **Market Context class**, which is the section that pipeline feeds.
It is the only section that reaches outward, it is **default OFF** (§17), and it is empty with a
stated reason in every scenario tested here. Everything else in a preparation pack — capability
recommendation, demonstration sequencing, questions, objections, limitations, demonstration
warnings — is deterministic and reads only governed records, and is unaffected by whether a search
provider has ever been called.

**What this means for the phase gate:** the deterministic layers are complete and evidenced. The
Market Context path is built, wired through the unmodified ATL-06A gate, and **not validated
live** — the same standing `ATL-06C` already carries. The phase is therefore recorded as
`[COMPLETED — INHERITED LIVE VALIDATION PENDING]`, and closing `AC-ATL-06C-9` remains the board's
next executable action. It is not marked `[COMPLETED]`.

| Area | Artefact |
|------|----------|
| Lens profile | `lib/atlas/lens.ts` — the `D-ATL-04R-1` correction, ADR-064 |
| Pack contract | `packages/contracts/src/atlas-preparation-model.ts` — seven integrity rules |
| Intake | `preparation/intake.ts` — declared lexicons; nothing inferred from model memory |
| Clarification | `preparation/clarify.ts` — asks only when nothing is selectable |
| Recommendation | `preparation/recommend.ts` — admission by rationale, ADR-065 |
| Sequencing | `preparation/sequence.ts` — quotes governed demo paths, never writes one |
| Questions | `preparation/questions.ts` — governed questions selected; answers grounded or conceding |
| Integrity | `preparation/integrity.ts` — warnings derived, lens-invariant, ADR-066 |
| Engine | `preparation/engine.ts` — composes; reaches outward only through the ATL-06A gate |
| Route | `POST /api/v1/atlas/prepare` — a pack failing its rules is a 500, not a page |
| Surface | `components/atlas/ClientPreparation.tsx` — explorable sections, research off by default |

---

## 2. The `ATL-04R` persona residual — recorded, and corrected

### `D-ATL-04R-1` — the lens was ordering-only

Owner evaluation of the live `ATL-04R` interface found:

> Selecting Sales, Architect or Developer visibly changes the selected lens, but the overall Atlas
> experience does not change materially enough from the default Innovation Executive presentation.

This is recorded as defect **`D-ATL-04R-1`**, and the finding is correct. The cause was not subtle
and the interface admitted it in writing. `ATL-04R` implemented `ADR-045` literally: the lens
reordered the disclosure sections of the capability detail, applied a left border to the prioritised
ones, and displayed the note:

> *Ordering only — nothing is hidden, and the facts do not change.*

A reader who selected **Developer** met the same four executive questions above the fold, the same
opened section, the same evidence rendering and the same ordering of capabilities as everyone else.
The control was honest about doing almost nothing, which is not the same as doing something.

`ATL-04R` history is not reopened. The defect is corrected here, as the work package directs,
because `ATL-06D` cannot produce a persona-sensitive preparation pack on top of a persona dimension
that does not do anything.

### What now changes when a lens is selected

| Dimension | Before (`ATL-04R`) | After (`ATL-06D`, ADR-064) |
|---|---|---|
| Four questions above the fold | identical under all four lenses | **four different question sets** |
| Section opened on arrival | always the first section | **four different opening sections** |
| Section grouping | unlabelled reordering | **"leading with…" / "everything else"**, labelled |
| Evidence depth | identical | symbols, observers and dates inline for Architect/Developer; signposted for the others |
| Capability list order | identical | **four different orderings**, server-side, each explaining itself in words |
| The note | "Ordering only" | what the lens leads with, plus the invariance rule |

### What can never change

`ADR-045` survives unamended, and the invariance is now proven rather than promised. The test asserts
it **field-by-field across 38 capabilities × 4 lenses** — identity, name, summary, lifecycle state,
implementation status, demonstration maturity, platform reuse, known limitations, validation
evidence, architecture flow, APIs, contracts, demo scenarios, open defects. Zero drift.

The tempting repair was the one that must never be made. A Sales lens that could suppress a
limitation is a mechanism for overselling — which is why **"What must I not claim?"** is one of the
four questions the Sales lens is asked *first*, rather than something it can scroll past.

---

## 3. Browser verification of the residual (§36)

Run against the production build on `CAP-DECISION-GAP`, switching lens on the live interface and
capturing what the reader actually meets. Not a code inspection.

| Lens | Opens on | The four questions |
|---|---|---|
| *(none)* | Why this exists | problem · why it matters · can I demonstrate it · can I reuse it |
| **Innovation Executive** | Why this exists | problem · **why genuinely different** · **how far the idea has travelled** · where else it could apply |
| **Sales** | **Where it applies** | **client pain** · **can I show this today** · **what must I not claim** · **what will the client ask** |
| **Architect** | **How it works** | **how does it actually work** · **what does it integrate through** · **where does its data come from** · **what constrains adopting it** |
| **Developer** | **Where it is implemented** | **is this actually built** · **where is the code** · **how do I verify it** · **what is known to be incomplete** |

```
DISTINCT question sets across the four lenses: 4 / 4
DISTINCT opened sections:                      4 / 4
DISTINCT section orders:                       4 / 4
```

The same record, read four ways. Sales meets *"Demand is accelerating and the commercial team assumes
the plan will absorb it"* and *"Absolute monetary figures are uncalibrated modelled values"*.
Developer meets *"implemented"*, *"4 references — lib/demand-decision-frontier/demand-frontier-engine.ts"*
and *"tests/unit/run-ddf01-tests.ts"*. Neither can see a fact the other cannot.

This clears the §36 bar explicitly: the difference is not a button state, not a tiny ordering
change, and not one label.

---

## 4. What a preparation pack is, and what it structurally cannot be

### Recommendation must explain itself (§11, ADR-065)

A capability enters a pack by **accumulating rationale**, and one that accumulates none is not
recommendable. There is no code path producing the bare list §11 forbids. From Scenario 1:

> **Decision Regret Intelligence**
> - `BUSINESS PROBLEM` The conversation is about forecast uncertainty, which this capability declares as one of the problems it addresses.
> - `BUSINESS PROBLEM` The conversation is about slow decisions, which this capability declares as one of the problems it addresses.
> - `DOMAIN` The capability is registered in Retail & Grocery, the client's own domain.
> - `QUERY TERM` The brief's own words reach this capability through its usage, architecture, technology.
> - `LENS` Reading as Sales: a capability with a demonstration path and a solution carrying it is the one that can actually be shown in the meeting.

A lens signal alone is never sufficient — it says something about the reader and nothing about the
client, so at least one basis must argue from the conversation itself.

### The lead cut is separation-tested (§12)

Where the sixth capability scores within `LEAD_SEPARATION_RATIO` of the fifth, the field is flat and
the cut would be arbitrary. The pack widens the lead set and **says so**: *"Several capabilities are
close in relevance here, so the lead set is wider than usual. Cutting to a confident top three would
have implied a separation the evidence does not support."*

### Sequencing quotes, never writes (§13, §34)

The registry holds 33 `three-minute` demo paths and 5 `ten-minute` paths. It holds **no**
`technical-deep-dive` and **no** `executive-discussion` paths. That measurement decides the design:
the demonstration reading is built from real `DemoPath.steps`; the executive and technical readings
are built from theses, architecture flows and contracts, and carry **no demo script at all**.

Every demonstration step in every pack tested is traceable to an authored step on that capability.
Fabricated steps: **0**.

### Sales integrity is structural (§20, §21, ADR-066)

- Rule `P2` refuses a pack recommending a non-`implemented` capability with no demonstration warning.
  A pack with violations is a **500 from the route** — not a page with a caveat.
- Every warning names the governed field it derives from. Scenario 1 produces 15 warnings including
  *"Within Decision Regret Intelligence, `expected_value_gbp` is simulated even though the capability
  as a whole is implemented"*, from `knowledge.field_status:expected_value_gbp`.
- Every prohibition carries the honest replacement. Telling a seller what not to say without the true
  sentence is advice that gets discarded in the room.
- Warnings, limitations and maturity are **lens-invariant**, asserted directly: no warning a Developer
  pack carries is absent from the Sales pack for the same capability.

### Nothing about the client is invented (§28)

`"Prepare me for Tesco."` yields the organisation string and nothing else — no revenue, no incumbent
platform, no "known challenges". It is treated as insufficient and clarified. The Atlas holds no
client records and does not behave as though it does.

---

## 5. The six required scenarios (§39)

| # | Scenario | Outcome |
|---|---|---|
| 1 | Sales / grocery demand, 30 min | **Prepared.** Reads role *Head of Demand Planning*, domain *retail_grocery*, 30 minutes, and three `bp-*` problems. 5 lead + 6 supporting, 3 sequences, 15 warnings, 20 prohibitions. **No question asked.** |
| 2 | Architect / integration | **Prepared.** Objective read as *architecture*; technical reading offered and led with. |
| 3 | Innovation director / what is different | **Prepared.** Executive reading only; role plus objective is enough to select on. |
| 4 | *"Prepare me for a retail client meeting."* | **Clarifies.** A domain alone names an industry and no conversation. Recommends nothing until it knows something. |
| 5 | 10 minutes, demand planning director | **Prepared.** Duration read; sequence held to **two** movements, not compressed into six. |
| 6 | Position against Blue Yonder, research off | **Prepared.** Competitive question leads, grounded in CogniX capabilities, states that a competitor claim requires market evidence this pack does not hold, asserts no superiority, describes no Blue Yonder functionality. |

Four of six reach a pack with **no clarification at all** — which is the §28 requirement that a
sufficient brief is not interrogated.

### A correction made during the work

The first implementation required an explicit objective before it would build anything. Running the
§39 scenarios showed how wrong that is: **Scenario 1 supplies a role, a domain, a duration and a
stated problem, and was still interrogated about its objective** — precisely the §28 failure. The bar
was lowered to *ask only when the Atlas knows nothing it could select on*, which keeps Scenario 4
clarifying while every other scenario builds. A missing duration or objective on an otherwise clear
brief is now surfaced as *"would improve this pack"*, not as a gate in front of it.

---

## 6. Failure behaviour (§34)

| Condition | Behaviour | Verified |
|---|---|---|
| Gemini unavailable | Recommendations, sequences, questions, warnings all build. They read only governed records. | Every scenario here ran with no provider configured |
| External research unavailable / off | Internal preparation unaffected; Market Context absent **with a stated reason** | §F1–F3 |
| No relevant capabilities | State `no-relevant-capabilities`, recommend nothing, say why | Engine path + §G3 |
| Ambiguous client context | One clarification, with what was already understood shown alongside it | §39 Scenario 4 |
| Contradictory client context | Surfaced, never silently resolved: *"You said 10 minutes, alongside an architecture and integration discussion, which does not fit in that time…"* | §G7–G8 |
| Insufficient demo evidence | No demonstration sequence; the reason is named | §E5, sequence notice |

---

## 7. External evidence — the gate is not reopened (§17, §18, §38)

The preparation engine implements **no second evidence pipeline**. Market context and interpretation
arrive through `groundAnswer` and `applyInterpretation` — the same ATL-06A gate, the same ATL-06B
provider path, the same ATL-06C verification Ask CogniX uses. Asserted mechanically:

- `F9`: no `fetch(`, no endpoint and no URL anywhere under `lib/atlas/preparation/`.
- `F10`: no credential reference anywhere in the engine.
- `F1`–`F3`: with research off, every pack's Market Context is unavailable, empty, **and carries the
  reason** — a rendered absence, never a silent empty list.

`research: true` is a request, not a grant. Policy still decides whether external evidence is
permissible for the brief at all, which is why a pack about what CogniX does is answered from governed
records however emphatically research was asked for (§18).

**Nothing in ATL-06A/B admission was weakened to make a pack richer.** `run-atl06a-tests.ts` (115),
`run-atl06b-tests.ts` (123) and `run-atl06c-tests.ts` (121) all pass unchanged.

---

## 8. Test evidence

```
run-atl06d-tests.ts   96 PASSED, 0 FAILED   ← new
run-atl02-tests.ts   119 PASSED, 0 FAILED
run-atl03-tests.ts    29 PASSED, 0 FAILED
run-atl04-tests.ts    58 PASSED, 0 FAILED   ← H4/H5/I2 re-pointed
run-atl04r-tests.ts  118 PASSED, 0 FAILED   ← G13 re-pointed
run-atl05-tests.ts    54 PASSED, 0 FAILED
run-atl06a-tests.ts  115 PASSED, 0 FAILED   unchanged
run-atl06b-tests.ts  123 PASSED, 0 FAILED   unchanged
run-atl06c-tests.ts  121 PASSED, 0 FAILED   unchanged
tsc --noEmit           0 errors
next build             clean
```

### Four prior assertions were re-pointed, and why that is not weakening them

`ATL-04` H4/H5/I2 and `ATL-04R` G13 each **grepped a source file for a literal string this phase
replaced**. Left alone they would have failed; deleted they would have lost real protection. Each was
re-pointed at the same intent against a stronger check, following the precedent already recorded
beside `ATL-04` I1 — *"folding them in would turn this scope guard into an assertion that later
phases never shipped, which is not what it was written to protect."*

| Was | Protected | Now |
|---|---|---|
| `H4` grepped four literal question strings | four questions answered above the fold | the four survive as the **neutral default**, and every lens is checked for exactly four |
| `H5` grepped `LENS_PRIORITY` + "available under any lens" | lenses reorder rather than hide | `orderForLens` is asserted to be a **permutation** — a property, not a sentence |
| `I2` required "Planned for ATL-06" in the detail view | the feature is not simulated | the workspace must obtain content from the governed API and **hardcode no capability** |
| `G13` grepped "Ordering only" | the lens hides and alters nothing | asserted against the governed profile; invariance proven field-by-field in `run-atl06d-tests.ts` §B |

`G13` is the notable one. It required the interface to carry a sentence that was an accurate
description of a defect. A note promising the control does little is not something to protect once
the control has been made to do something.

---

## 9. Findings and honest limitations

1. **`AC-ATL-06C-9` is open and this phase does not close it.** No credential reached this
   environment. The Market Context path is built and gated but has never run against a real search.
   The phase is `[COMPLETED — INHERITED LIVE VALIDATION PENDING]` for that reason and no other.
2. **`data_sources` is populated on 3 of 38 capabilities.** The Architect lens asks *"Where does its
   data come from?"* and answers *"no data sources recorded"* on most of the registry. That is a
   genuine corpus gap rendered honestly rather than a question removed to avoid an empty answer. The
   synthetic-data warning and the §21 "do not describe this as live client feeds" prohibition both
   derive from this field, so **the corpus gap directly limits how many of those warnings can fire**.
   Populating `data_sources` is the highest-value content work this phase surfaced.
3. **`open_defects` is empty corpus-wide.** The `open-defect` warning kind is implemented and
   unreachable until a defect is recorded against a capability.
4. **Four governed `CuriosityQuestion` records exist.** §22 asks for questions selected by client
   problem, capability, role and objective; with four records the selection is real but thin. Packs
   return one or two, never filler.
5. **Recommendation ordering is defensible, not authoritative.** In Scenario 1, Decision Regret
   Intelligence leads over Demand & Forecast Intelligence because it matched two declared business
   problems plus the domain. A human might lead differently. The rationale is visible and arguable,
   which is the property §11 asks for — but this is ordering by declared governed connection, not
   by commercial judgement, and it should not be mistaken for the latter.
6. **The vendor lexicon is a declared list.** Recognising *Blue Yonder* is recognising a string the
   estate declared, not knowledge about the vendor. An unlisted competitor is not recognised, and the
   pack says nothing about any of them either way.
7. **Preparation context is session-scoped and not persisted.** §29 directs against building a CRM;
   context lives in component state and is lost on reload. No client-sensitive data is written
   anywhere.
8. **Carried open items, unchanged:** `CDI-07A`/`CDI-07B` ADR-052 split candidates await an owner
   decision · **SB-GATE remains 3 of 6 advanced** · `external_evidence` is empty corpus-wide ·
   `tsx` is not a declared dependency · eight capabilities have no dedicated test runner · twelve
   carry `lifecycle_state: null`.

---

## 10. Handoff

The Capability Atlas now answers the question it was built for — *what can CogniX do, how mature is
it, and what can I honestly say about it* — through a lens that materially changes the reading
without changing a single fact, and into a preparation surface where that honesty is enforced by
contract rules rather than by good intentions.

Two things are worth stating for whoever picks this up:

**The next executable action is still closing `AC-ATL-06C-9`.** Run
`GEMINI_API_KEY=… npx tsx scripts/atlas-live-grounding-check.ts` in an environment where the
credential exists. If the live provider differs from the fixtures, correct the adapter — never relax
ATL-06A admission to accommodate it.

**The pressure on this surface is one-directional.** Every future change to a preparation pack will
be argued for on the grounds that it makes the pack more persuasive. The rules in
`atlas-preparation-model.ts` are the record of what was decided before anyone was in that room.
