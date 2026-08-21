# COGNIX `ATL-06C` — AI EXPLANATION & HYBRID REASONING

**Work Package:** `ATL-06C` — AI Explanation & Hybrid Reasoning
**Status:** **IMPLEMENTATION COMPLETE — LIVE VALIDATION PENDING**
**Date:** 2026-08-21
**Owner:** G10X Enterprise Innovation Lab Architecture Board
**Governing decisions:** ADR-044, ADR-048, ADR-049, ADR-050, ADR-053, ADR-054, ADR-055, ADR-056,
**ADR-057** (premises and verification — new), **ADR-058** (Level 2 deferred on measurement — new)
**Branch:** `claude/cognix-capability-atlas-v2`

---

## 1. Status, stated plainly

Every acceptance criterion is met except one, and that one is held open deliberately.

`AC-ATL-06C-9` requires **at least one real credentialed Gemini/Search grounding round trip**. This
environment holds no `GEMINI_API_KEY`. What *was* done is stronger than "the environment prevented
it" and weaker than a round trip, so it is worth stating precisely — see §5. **The phase is not
marked `[COMPLETED]`,** and the status board's next executable action is closing that gap, not
starting `ATL-06D`.

| Area | Artefact |
|------|----------|
| Premises | `lib/atlas/interpretation/premises.ts` — governed + **admitted** market claims, nothing else |
| Verification | `verification.ts` — eight declared rules, ordered structural → semantic |
| Provider seam | `provider.ts` — separate from the grounding seam by design |
| Adapter | `gemini-interpreter.ts` — structured output, **no search tool** |
| Engine | `engine.ts` — degradation, audit, templated readings preserved |
| Registration | `register.ts` — idempotent, configures nothing by itself |
| Live check | `scripts/atlas-live-grounding-check.ts` — two stages, first needs no credential |
| Evaluation set | `tests/fixtures/atlas-grounding/level2-evaluation.ts` — 18 questions + un-shipped alias control |
| Tests | `tests/unit/run-atl06c-tests.ts` — **86 assertions, 86 passing** |
| Governance | ADR-057, ADR-058; charter §0/§3/§4; `MASTER_PLAN.md`; corrected `ATL-06A` L3 |

---

## 2. Only admitted evidence may be reasoned from

`ATL-06B` left the envelope carrying two things it deliberately kept: **rejected** claims, and a count
of **discarded** ungrounded model text. Both exist so omissions are auditable. Both are also material
sitting one careless parameter away from being reasoned from.

So the premise set is built **by construction, not by instruction**. `buildPremises` reads exactly two
arrays — `from_cognix.statements` and the **admitted** `market_context.statements` — and the module
never references `rejected_claims` or `search_transparency` at all. That is asserted by scanning the
source (`A6`), not merely by testing behaviour. A prompt can be told to ignore evidence; a function
that never receives it cannot be persuaded.

On the `mixed` fixture — four rejected claims, one admitted — the premise set contains **one** market
premise, and no rejected claim appears in it in any form (`A4`, `A5`). The provider is handed premises
only; the request it receives contains no trace of a refused claim (`D12`).

Structural exclusion prevents the easy failure. `echoes-rejected-claim` catches the interesting one:
a provider that saw the same page in its own training data and reproduces the substance of a claim
this estate refused. Given exactly that, verification drops it and names *why that evidence was
inadmissible in the first place* (`C1`, `C2`, `D13`). A reordered restatement is caught too, by
content-word containment rather than exact runs (`C4`).

---

## 3. Verification: eight rules, and refusal rather than hedging

Rules run in order from structural to semantic, so a refusal names the **first** thing wrong — the
same discipline `ATL-06A` applies to source admission (`B8`).

| Rule | Refuses |
|------|---------|
| `empty` / `markup` / `too-long` | no text, markup, or an essay where a reading was asked for |
| `unknown-premise` | a citation that does not resolve — indistinguishable from an invented one |
| `no-governed-premise` | a reading standing only on the market |
| `asserts-cognix-fact` | a reading that declares what CogniX does, however well cited |
| `echoes-rejected-claim` | reproducing evidence that failed source admission |
| `unsupported-quantity` | a figure appearing in no cited premise |
| `unsupported-publisher` | naming an analyst house no cited premise mentions |

**Failing readings are dropped, never hedged.** A caveated unsupported reading is still unsupported,
and is the more dangerous of the two because the caveat reads as diligence.

Against a provider proposing five readings — one sound, one declaring a CogniX capability, one
inventing *"around 40% of grocers"*, one naming Forrester, one citing a premise that does not exist —
**one survives**:

```
DERIVED FROM THE RECORD
  The market expectation described here rests on live operational inputs…      [CAP-PROMOTION-INTELLIGENCE]

GENERATED · VERIFIED
  The governed record and the market coverage describe the same problem from
  opposite ends, which makes this a good place to start a demonstration and a
  poor place to promise operational parity.                                    [CAP-PROMOTION-INTELLIGENCE]
  Verified against G1 Promotion Intelligence · M1 Gartner · 2026-06-22

PROPOSED AND REFUSED — 4 of 5
  asserts cognix fact      "CogniX supports live supplier monitoring today."
  unsupported quantity     "Around 40% of grocers have already adopted this pattern."
  unsupported publisher    "Forrester positions this as a mature market."
  unknown premise          "This rests on nothing you gave me."
```

Two design points are visible there. The **templated reading is kept** alongside the generated one —
it is the only reading in the class reproducible without any provider, and trading it for a more
fluent paragraph would give that up. And each statement is **labelled with its origin**, because the
two carry different risk and a reader is entitled to know which they are looking at.

The interpretation adapter is a **separate seam** from the grounding adapter and carries **no search
tool** (`E1`). They are different authorities: a grounding provider may go and look; an interpretation
provider may only read what has already been admitted. One adapter holding both powers could source a
claim and pronounce on it.

---

## 4. Is Level 2 semantic retrieval actually required? — measured, then deferred

The question is not *"would embeddings help"* — everything helps something. It is **what is failing,
and is the failure semantic?**

Eighteen questions phrased the way a business person asks them, each avoiding the target capability's
own vocabulary, each with one intended capability. They are **not** paraphrases of the `ATL-04`
acceptance queries, which already pass and therefore cannot answer this question.

| Configuration | top-1 | top-3 | absent entirely |
|---|---|---|---|
| Level 1 as shipped | 6 / 18 | **10 / 18 (56%)** | 3 |
| Level 1 + 22-entry declared alias vocabulary | 17 / 18 | **18 / 18 (100%)** | 0 |

The diagnosis is the "absent entirely" column. A capability missing from a result set is not a
*ranking* failure — no re-weighting reaches a record that matched no term. It is **lexical**: *"the
right call afterwards"* never meets *regret*; *"goes off"* never meets *half-life*; *"plug our own
data feed"* never meets *connector*.

**Decision (ADR-058): Level 2 is deferred.** A declared alias layer closes the gap completely at a
fraction of the cost, and preserves the two properties ADR-050 requires and embeddings cannot offer —
Level 1 stands alone, and a surprising result is **inspectable**. An alias entry is a line a human can
read, argue with and revert. "The vector said so" is not an explanation an architecture board can act
on. Embeddings become right when a failure is shown to be **conceptual** rather than lexical; this
evaluation found none.

**The alias layer was recommended, then authorised and implemented** (owner decision 2026-08-21,
ADR-059). It is governed content, so it is shaped like one: 22 aliases in `content/atlas/vocabulary.ts`,
each with an identifier, owner, review date, written rationale and the capabilities that evidence its
terms, validated by rules W1–W8 and published at `GET /api/v1/atlas/vocabulary`.

**Rule W6 earned its place immediately.** Every governed term an alias introduces must appear in the
governed text of a capability the alias names — and W6 rejected **six** of the prototype's terms:
*hindsight*, *urgency*, *volatility*, *provenance*, *precedent*, *stale*. None of them exists in this
corpus; the prototype had been quietly inventing vocabulary, exactly the failure `ATL-01` caught in the
taxonomy. Replacing them with the words the records actually use also produced a better result: for
*"how long before this recommendation goes off"* the corpus's own *half-life* — straight out of the
capability's name — beat the invented *stale* it replaced.

| Configuration | top-1 | top-3 | absent entirely |
|---|---|---|---|
| Level 1, expansion off (the measured baseline, still reproducible) | 6 / 18 | **10 / 18** | 3 |
| Level 1 + governed vocabulary, as shipped | 16 / 18 | **18 / 18** | 0 |

**The vocabulary is not hidden in scoring.** The searcher's own words and the vocabulary's
contribution stay in separate fields through query understanding and into the search response, which
returns which alias fired, what it added and why; the Atlas renders it as *"Also searched: expiry,
decay — from 'goes off'"*. A match reached only through the vocabulary is attributed to the alias that
reached it. And an alias-driven hit is discounted to a published **0.75** of a direct hit, asserted
head-to-head: searching *regret* scores higher than reaching Decision Regret through *"was it the
right call"*, by exactly that factor and no other adjustment.

---

## 5. The live validation, precisely

`AC-ATL-06C-9` is **not met**. What is on the record instead:

**The request contract is validated against the live production service.** Posting to
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` with a
deliberately invalid key:

```
PASS  grounding tool `googleSearch` is a recognised field
      HTTP 400 :: API key not valid. Please pass a valid API key.
PASS  structured output `responseSchema` is a recognised field
      HTTP 400 :: API key not valid. Please pass a valid API key.
PASS  control — `notARealTool` is rejected as an unknown field, not on the credential
      HTTP 400 :: Invalid JSON payload received. Unknown name "notARealTool" at 'tools[0]': Cannot find field.
```

The control is what makes the first two mean anything: Google's schema validator **does** check field
names, and it accepts both request shapes this estate sends, failing only on the credential. Had
`ATL-06B` used the legacy `googleSearchRetrieval` form against a current model, this is where it would
have shown.

**What has not happened:** a credentialed round trip. No real search has been run, no real page has
been resolved, no real publication date has been parsed from a live publisher, and no real model
output has passed through verification. Close it with:

```
GEMINI_API_KEY=… npx tsx scripts/atlas-live-grounding-check.ts "<question>"
```

Stage 2 prints the full ledger — queries run, claims admitted with provenance and currency, claims
rejected with reasons, ungrounded sentences discarded, interpretation proposed/verified/dropped.

**The two surprises to expect**, both consequences of ADR-055 rather than defects: fewer sources than
expected will carry a machine-readable publication date, so more claims will be refused as
`undated-source` than a naive integration would show; and redirect resolution adds a page fetch per
source, which may exceed the surrounding request budget. Both are visible in the ledger.

The check is a **script, not a test** (`J4`). A validation that needs a credential and spends quota
does not belong in a suite that runs on every change; and reporting the round trip as "skipped" rather
than "passed" when no key is present is the difference between a gate and a formality.

---

## 6. The corrected `ATL-06A` assertion

`run-atl06a-tests.ts` L3 asserted that the charter names `ATL-06B` as the next executable work
package. That is a **pointer designed to move every phase**, not an invariant, and it went stale the
moment `ATL-06B` completed.

It was corrected by making it **stricter**, not looser. It now parses the status board and asserts
that the declared next work package is the **first phase that is not `COMPLETED`**, and that every
phase before it is. This catches a board that drifts, skips a phase, or advertises a phase whose
predecessor is unfinished — none of which the literal check could ever catch. Verified by temporarily
pointing the board at `ATL-07` and confirming the assertion fails with a diagnostic naming the real
first-unfinished phase.

It also does real work immediately: because `ATL-06C` is `[COMPLETED — LIVE VALIDATION PENDING]` and
not `COMPLETED`, the invariant forces the board to name **`ATL-06C`** as the next executable action.
The board cannot advertise `ATL-06D` while this phase's live validation is open. No other assertion in
that suite was touched, and it passes at 115/115.

---

## 7. Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 diagnostics** |
| `npx tsx tests/unit/run-atl06c-tests.ts` | **86 passed, 0 failed** |
| `npx tsx tests/unit/run-atl06b-tests.ts` | **123 passed — unchanged** |
| `npx tsx tests/unit/run-atl06a-tests.ts` | **115 passed — unchanged in count; L3 strengthened** |
| `run-atl05` / `run-atl04` / `run-atl03` / `run-atl02` | 54 / 54 / 29 / 119 — unchanged |
| `npm run build` | clean |
| Estate regression | 29 of 31 runners exit 0; `run-cdi07a` (154/1) and `run-cdi07b` (228/7) at their pre-existing baseline |
| `package.json` / `package-lock.json` | **unchanged** |

**Trust boundaries preserved.** The `ATL-06A` gate files — `policy.ts`, `provenance.ts`,
`contradiction.ts` — are byte-identical, and neither imports anything from the interpretation layer
(`H1`). `ATL-06C` redefines no admission rule and admits nothing itself (`H2`). With no provider, the
governed answer for four canonical questions is still byte-identical to one recomputed from the
`ATL-05` modules (`H4`).

**Class separation.** Interpretation mutates the From CogniX block, the Market Context block, the
rejection ledger and the separated contradictions **not at all** — asserted by deep comparison before
and after (`F1`–`F3`). Live-rendered from the real pipeline at 1160px with no horizontal overflow; the
three classes carry distinct accents and standing labels, and the refusal ledger sits inside the
interpretation class where it belongs.

---

## 8. Findings and honest limitations

1. **`AC-ATL-06C-9` is open.** Stated in the status board, the work package, the master plan and §5.
   The phase is `[COMPLETED — LIVE VALIDATION PENDING]`, and the board's next executable action is
   closing it.
2. **Interpretation has no user-facing control.** External research does, because it reaches outward
   (ADR-056). Interpretation reads only what is already on the page and leaks nothing, so it runs
   whenever a provider is configured, bounded by a per-process call budget. Raised as a decision
   outstanding rather than settled unilaterally.
3. **Level 1 recall stays at 56%** on business-phrased questions until the alias vocabulary is
   authorised. Measured, committed and re-asserted on every run.
4. **`unsupported-publisher` checks a declared list**, not every organisation in existence. It covers
   the allowlisted publishers and the platforms this estate is compared against — the names most
   likely to be hallucinated into a market reading. A fabricated obscure organisation would pass this
   rule, though it would still need a resolving premise citation.
5. **`unsupported-quantity` checks numerals**, not spelled-out quantities. *"Around forty per cent"*
   would pass where *"around 40%"* is refused. Recorded rather than papered over; the numeral form is
   overwhelmingly what a model emits under a structured-output schema.
6. **Carried open items, unchanged:** `CDI-07A`/`CDI-07B` ADR-052 split candidates await an owner
   decision · **SB-GATE remains 0 of 6 advanced** · `external_evidence` is empty corpus-wide and
   unassigned · `tsx` is not a declared dependency, the cause of the two pre-existing runner failures
   · eight capabilities have no dedicated test runner · twelve carry `lifecycle_state: null`.

---

## 9. Handoff

`ATL-06D` — Client Conversation Pack — inherits three classes that cannot be confused for one
another, a Market Context class whose every statement traces to an admitted source, and an
interpretation class in which every premise is visible and every premise is either governed or
sourced. The pack is where all of that meets commercial pressure: its demo-warnings section is
mandatory and non-empty for a reason, and the persuasive path of least resistance will be to soften
exactly the limitations this programme has spent six phases making visible.

**`ATL-06D` should not begin until `AC-ATL-06C-9` is closed.** A pack assembled on a pipeline that has
never run against a real search is a pack whose most confident section has never been tested against
reality.
