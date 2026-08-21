# COGNIX `ATL-06B` — GROUNDED MARKET INTELLIGENCE

**Work Package:** `ATL-06B` — Grounded Market Intelligence
**Status:** COMPLETED
**Date:** 2026-08-21
**Owner:** G10X Enterprise Innovation Lab Architecture Board
**Governing decisions:** ADR-044 (server-side key, refuse over fabricate), ADR-048 (three evidence
classes), ADR-049 (provider abstraction), ADR-053 (contradiction precedence), ADR-054 (source
admission), **ADR-055** (grounded segments and page-derived provenance — new), **ADR-056**
(user-initiated research — new)
**Branch:** `claude/cognix-capability-atlas-v2`

---

## 1. What was asked, and what was built

`ATL-06B` was redefined by owner decision on 2026-08-21 from *"Google AI Provider & Semantic
Retrieval"* to **Grounded Market Intelligence**: the provider, retrieval, grounding, provenance,
freshness, source admission and rejection, and the visible **Market Context** evidence class. AI
Interpretation moved to `ATL-06C`. Both changes are recorded in the charter and the master plan, and
one consequence is recorded rather than absorbed: **Level 2 semantic retrieval is descoped and not
yet assigned to a phase.** It is reported as outstanding at `GET /api/v1/atlas/grounding` so a rename
cannot lose it.

| Area | Artefact |
|------|----------|
| Wire contract | `lib/atlas/grounding/providers/gemini-grounding-types.ts` — the documented REST shape, transcribed |
| Extraction | `grounding-extraction.ts` — only grounded segments become claims; byte-offset slicing |
| Provenance | `source-resolution.ts` — redirect resolution, publisher/date read from the page, host→tier map |
| Adapter | `google-search-grounding.ts` — server-side Gemini + `googleSearch`, injectable transport |
| Cost control | `grounding-cache.ts` — TTL cache, call budget, live-call counter |
| Registration | `register.ts` — idempotent, configures nothing by itself |
| Contract | `GroundingSearchTransparency`, `research-not-requested` refusal, optional `retrieveGrounded` |
| Surface | research opt-in control, rejection ledger, search transparency, Search Suggestions |
| Evaluation set | `tests/fixtures/atlas-grounding/gemini-grounding-fixtures.ts` — 15 recorded-shape responses |
| Tests | `tests/unit/run-atl06b-tests.ts` — **123 assertions, 123 passing** |
| Governance | ADR-055, ADR-056; charter §0/§3/§4; `MASTER_PLAN.md` |

---

## 2. The finding that shaped the phase

**A grounded model returns one passage, and only part of it is evidence.**

Search-grounded generation produces a single continuous answer. Some sentences are supported by
retrieved pages; the rest is the model writing connective prose from training data. Both arrive in the
same string, in the same register, and the ungrounded half is usually the more fluent of the two. The
conventional integration renders the passage and lists the sources beneath it — which publishes model
recall as sourced market evidence, with a citation block attached to make it look answerable.

`ATL-06B` therefore extracts rather than renders. **A segment becomes a claim only where a
`groundingSupport` covers it and names at least one retrieved chunk.** Everything else is discarded,
counted, and the count is shown. On the admissible fixture, two sentences survive and one — *"Overall,
most enterprises are moving in this direction and the benefits are widely accepted"* — does not.

The sharpest case is `noGroundingMetadata`: three confident, well-formed sentences with no grounding
metadata at all. Nothing survives, nothing is even rejected, and the reader is told that three model
sentences were discarded. There is no candidate to admit because there was never any evidence.

### The second finding: grounding metadata does not carry provenance

`groundingChunks[].web` gives a `vertexaisearch.cloud.google.com/grounding-api-redirect/...` URL and a
title. It does not give a publisher, it does not give a publication date, and `domain` — the field
that would give the host — **is a Vertex AI field that the Gemini Developer API does not populate**.
ADR-054 requires all three and refuses to guess any of them.

Asking the model for them is trivial and works. It is also provenance theatre: the fields populate,
admission passes, and the provenance is model recall in costume. So `ATL-06B` **follows the redirect
and reads the page**: publisher from what the site calls itself, publication date from
`article:published_time`, JSON-LD `datePublished`, citation metadata or `<time datetime>`. What the
page will not say stays empty, and ADR-054 refuses the claim as `undated-source`.

**Failing closed is the intended outcome.** With a live key this will show fewer claims than a naive
integration, and sometimes none — which is the correct reading of a search that returned opinion
rather than dated research.

### The third finding: the installed SDK cannot read grounding

The estate has `@google/generative-ai@0.24.1`. Its published types are wrong in four ways, each
asserted directly against the installed package in test `A1`–`A3`:

| Declared | Actual wire contract |
|----------|----------------------|
| `GroundingSupport.segment?: string` | an object carrying **byte** offsets |
| `groundingChunckIndices` | `groundingChunkIndices` |
| `GroundingChunkWeb` has no `domain` | `domain` exists (Vertex only) |
| tool is `googleSearchRetrieval` | current models take `googleSearch` |

Extraction through those types yields **zero** grounding supports — which would turn "only grounded
segments survive" into "nothing survives", or invite the passage-plus-sources shortcut instead.
`ATL-06B` calls the documented REST contract directly: **no dependency was added** (asserted against
`package.json`), and the shape is stated where it can be reviewed.

One further detail is recorded as a decision because its failure is silent: `segment.startIndex` and
`endIndex` are **byte** offsets. A JavaScript string slice misaligns every segment after the first
non-ASCII character — one curly apostrophe in a quoted headline is enough — and corrupts evidence
rather than losing it. Extraction slices a `Buffer`; fixture `byteOffsets` puts an em dash and a
curly apostrophe ahead of the segment and omits the echoed text to force that path.

---

## 3. External research is something a person asks for

The default posture is the decision. A system that searches whenever retrieval looks thin will search
constantly: spending quota on questions the corpus already answers, sending the reader's wording to a
search engine unasked, adding a round trip to every answer, and making external evidence the thing
that arrives when internal evidence is weakest — precisely when a reader is least equipped to discount
it.

So the Ask CogniX control is **off by default**, per question, not remembered as a preference;
`ask()` defaults `research` to `false`; the route treats its absence as false. Internal structured
search and the internal Ask path never invoke a provider under any setting.

The request is a request, not a grant. Asking for research on *"how does Decision Gap work"* still
calls nothing, because the ADR-054 intent policy classifies it `internal-only` — asserted with a spy
on the retrieval interface (`F5`). The research flag can only ever narrow what policy already
permitted, which is asserted against the engine source (`J4`).

Where a question could only be answered externally and research was not requested, the refusal is
**distinct**: `research-not-requested`, stating that *nothing was looked up* — a materially different
statement from nothing having been found.

Cost is bounded structurally: retrieval is cached on the normalised question, sorted topics and model;
an **empty** retrieval is never cached, so one transient failure cannot become six quiet hours; a
per-process call budget bounds a caller in a loop; cache state and live call count are published.

---

## 4. The adversarial cases

Every case the owner named has a recorded fixture and an end-to-end assertion through the
**unmodified** ATL-06A gate.

| Case | Fixture | Outcome |
|------|---------|---------|
| Contradictory **but credible** | `contradictory` | **Admitted**, and separated into three classes; governed record authoritative |
| **Agreeable** but inadmissible | `agreeableButInadmissible` | `source-not-allowlisted` — comfort is not provenance |
| Stale source | `stale` | `stale-source` — not shown with a warning, not shown |
| Missing date | `undated` | `undated-source` — a date is never inferred |
| Non-allowlisted source | `vendorMarketing` | `source-not-allowlisted` |
| Duplicate sources | `duplicateSources` | Two chunks, one page, **one** claim |
| Provider marketing claim | `assertsCogniXFact` | `asserts-cognix-fact` — rejected from an impeccable publisher |
| Provider failure | `admissible` + failing transport | Stated absence; *"none has been substituted from memory"* |
| Missing grounding metadata | `noGroundingMetadata` | Zero claims, **zero rejections**, 3 sentences discarded |
| Metadata without chunks | `metadataWithoutChunks` | Nothing grounded |
| Support naming no chunk | `supportWithoutChunks` | Nothing grounded |
| Dead / unresolvable source | `deadSource`, `unresolvableSource` | No claim; counted as unresolved |

And the case that matters most, because it is what a live search actually looks like — `mixed`, one
response carrying five candidate claims:

```
admitted   1   Grocery retailers increasingly evaluate promotional plans against
               fulfilment capacity before launch.
               Gartner · analyst · published 2026-06-22 · retrieved 2026-08-21 · FRESH

rejected   4   stale source          Forecast accuracy in grocery has historically plateaued…
               undated source        Decision latency remains the dominant constraint…
               source not allowlisted Promotion management platforms deliver measurable uplift…
               asserts cognix fact   CogniX provides fully implemented real-time promotion monitoring…

discarded  1   model sentence carrying no grounding support
```

One claim in five survives, each rejection is named and explained on screen, and the discarded model
sentence is counted. That ratio is the phase working, not the phase underperforming.

---

## 5. Precision: two defects found by looking at the output

Both were found by rendering the real pipeline, not by a failing assertion.

1. **A market claim contradicted a capability it never mentioned.** Claims were scoped to every
   capability the governed answer presented, so a promotion-monitoring claim raised a contradiction
   against *Opportunity Window & Micro-Market Graph* — which happens to declare synthetic inputs too.
   Fixed by relating a claim only to capabilities whose name it actually names, with the words common
   to both capability names and market prose (`market`, `intelligence`, `platform`, …) excluded by
   **declaration** rather than tuning. Contradictions on the fixtures fell from 2 to 1. Asserted by
   `D11`–`D14`.
2. **An interpretation appeared twice, word for word.** One claim disagreeing with two records
   produced two identical templated paragraphs with different citations. The statement is now emitted
   once and cites every record it rests on. The contradiction blocks themselves remain separate, which
   is correct: they quote different governed statements.

---

## 6. Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 diagnostics** |
| `npx tsx tests/unit/run-atl06b-tests.ts` | **123 passed, 0 failed** |
| `npx tsx tests/unit/run-atl06a-tests.ts` | **115 passed — unchanged** |
| `npx tsx tests/unit/run-atl05-tests.ts` | 54 passed — unchanged |
| `run-atl04` / `run-atl03` / `run-atl02` | 54 / 29 / 119 — unchanged |
| `npm run build` | clean; `/api/v1/atlas/grounding` registered |
| Estate regression | 28 of 30 runners exit 0; `run-cdi07a` (154/1) and `run-cdi07b` (228/7) at their pre-existing baseline |
| `package.json` / `package-lock.json` | **unchanged** — no dependency added |

**Provider off is exactly ATL-05.** For four canonical questions the suite recomputes the governed
answer from the ATL-05 modules and compares it byte for byte against `ask()` with `grounding`
stripped — with the provider absent, and again with the provider present and returning admissible
evidence. Identical in both states (`I1`, `I4`). Asking for research does not turn an unanswerable
question into an answerable one (`I3`).

**The credential never travels.** `GEMINI_API_KEY` is read from the server environment in exactly one
place, at call time; it is never accepted from a request body — unlike the estate's older `/api/ask`
and `/api/briefing` demo routes — never logged, and appears in no envelope, cache entry, notice or
error message. With no key the adapter names the missing variable and generates nothing, following the
ADR-044 precedent. Asserted by `H1`–`H8`.

### Live render, validated at two viewports

Built and driven at **1440×1000** and **720×1000**. The research control is present and **unchecked by
default**; no horizontal overflow at either width; the only console error is the pre-existing Google
Fonts `ERR_CONNECTION_RESET`. The two states are distinguishable in words:

> **research off** — *"External research is user-initiated and was not requested, so nothing was looked
> up and nothing has been inferred."*
>
> **research on, no provider** — *"…no configured provider can supply. The question is refused rather
> than answered from an approximation."*

The grounded surface — Market Context with per-claim provenance and a `FRESH` currency chip, the
rejection ledger with a named reason and explanation per dropped claim, the queries actually run, the
discarded-sentence count and Google's Search Suggestions — was rendered server-side from the real
pipeline against the fixtures, using the real stylesheet, and is reproduced in §4.

### What was **not** executed

**No live call to Gemini was made.** This environment holds no `GEMINI_API_KEY`, and the egress proxy
blocks `generativelanguage.googleapis.com` along with every Google documentation domain. What was
verified instead: the request shape and endpoint against the official published contract
(`googleapis/js-genai` type definitions, which are Google's own), the response handling against
recorded-shape fixtures covering fifteen paths, and the failure handling against a throwing transport.
**The first live call should be treated as an integration test, not a regression test** — the
plausible surprises are that fewer sources than expected carry a machine-readable publication date,
and that redirect resolution is slower than the surrounding request budget allows.

---

## 7. Findings and honest limitations

1. **`external_evidence` is still empty corpus-wide.** This phase proves the pipeline on a 15-response
   evaluation set, as instructed. It does not populate a market corpus, and no capability record
   gained an external claim.
2. **The allowlist was not widened.** It remains the 24 hosts ATL-06A declared, asserted (`J6`). Every
   allowlisted host now has a declared tier and no tier is declared for an unlisted host (`C11`,
   `C12`), so the two lists cannot drift.
3. **Third-party markup is injected in exactly one place.** Google Search Suggestions
   (`searchEntryPoint.renderedContent`) are rendered as supplied, because displaying them unaltered is
   a condition of using Grounding with Google Search and a hand-rolled substitute is not permitted. It
   is the only `dangerouslySetInnerHTML` in the Atlas, asserted (`K4`).
4. **One ATL-06A assertion is scoped to a moving value.** `run-atl06a-tests.ts` L3 asserts the charter
   names `ATL-06B` as the next executable work package. It passes unchanged, because the ATL-06A
   handoff genuinely names ATL-06B as what it unlocks — but the assertion's *label* is now stale, since
   `ATL-06C` is next. It is a latent defect in that suite: it tests a pointer designed to change every
   phase rather than an invariant. Flagged for an owner decision rather than rewritten.
5. **Two ATL-05 notices were corrected.** The external-knowledge notice and the no-provider absence
   reason both said external grounding was "owned by ATL-06B and not available yet". ATL-06B is now
   delivered; they now say it requires a provider credential in the server environment, which is the
   true reason.
6. **Descoped and unassigned:** Level 2 semantic retrieval. Recorded in the charter, the master plan
   and the published policy.
7. **Carried open items, unchanged:** `CDI-07A`/`CDI-07B` ADR-052 split candidates await an owner
   decision · **SB-GATE remains 0 of 6 advanced** and the storyboard is untouched · `tsx` is not a
   declared dependency, the cause of the two pre-existing runner failures · eight capabilities have no
   dedicated test runner · twelve carry `lifecycle_state: null`, preserved honestly.

---

## 8. Exit gate and handoff to `ATL-06C`

> *With a key present the Atlas can cite the market; with no key it is the `ATL-05` Atlas exactly; and
> in both states the reader can see what was searched, what was admitted, what was rejected and why.*

Met. All eight `ATL-06B` acceptance criteria pass, the six hard ones included.

**`ATL-06C` — AI Interpretation & Hybrid Reasoning** inherits a Market Context class whose every
statement is traceable to an admitted source, a rejection ledger explaining everything that was
dropped, and an AI Interpretation class that is currently emitted **only** where a contradiction lets
it be templated from a governed record. Its work is to make interpretation a reasoning capability
while keeping the property that makes the current one safe: **every premise is visible, and every
premise is either governed or sourced.** A rejected claim must never reach it, directly or by
paraphrase — the rejection ledger is deliberately part of the envelope so that constraint is testable
rather than aspirational.
