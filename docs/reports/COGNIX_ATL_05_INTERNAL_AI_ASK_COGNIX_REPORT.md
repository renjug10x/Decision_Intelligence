# COGNIX ATL-05 — INTERNAL AI RETRIEVAL & ASK COGNIX — IMPLEMENTATION REPORT

**Work Package:** `ATL-05` — Internal AI Retrieval & Ask CogniX
**Status:** COMPLETED 2026-08-20
**Baseline:** Atlas workstream branch, descended from `origin/Feature/MatchingContract-AutoActivate` @ `5dfba74`
**Governed by:** [`COGNIX_CAPABILITY_ATLAS.md`](../governance/COGNIX_CAPABILITY_ATLAS.md) · ADR-046 · ADR-047 · ADR-048 · ADR-049 · ADR-050

---

## 1. Owner decision: Questions Worth Asking

Curiosity questions are now **first-class governed knowledge objects** with many-to-many
relationships across three namespaces.

| Relationship | Rule applied |
|---|---|
| `related_solutions` / `related_experiments` | **Provenance preserved.** All four questions keep the `SOL-*` and `EXP-*` targets they have always carried. Nothing dropped, nothing re-derived |
| `related_capabilities` | **Explicit only, each with a written rationale.** 7 links across 4 questions |

**Capability links are never derived transitively**, and the suite proves it rather than asserting
it: `SOL-PROMO-01` is demonstrated by more capabilities than `Q001` links to, so a transitive rule
would have attached that question to capabilities it does not ask about (`run-atl05-tests` A7).
`CAP-JOURNEY-TELEMETRY` returns **zero** questions rather than an inferred set (A10).

Each link is justified by the question's own semantics or its stated evidence:

| Question | Explicit capability links |
|---|---|
| Q001 — detect a broken promise 14 days early | `CAP-COMMITMENT-INTELLIGENCE` (the capability's stated purpose), `CAP-PROMOTION-INTELLIGENCE` (the stated evidence is uplift against supplier capacity) |
| Q002 — what happens everywhere else | `CAP-DECISION-RIPPLE` (second- and third-order propagation) |
| Q003 — same promotion, different outcome | `CAP-ENTERPRISE-MEMORY` (acting without historical precedent), `CAP-LEARNING-PATTERN-REGISTRY` (situation-signature matching) |
| Q004 — where is uncaptured margin hiding | `CAP-OPPORTUNITY-INTELLIGENCE` (favourable-variance detection), `CAP-DECISION-GAP` (a constraint preventing capture) |

Surfaced on the capability detail with the rationale visible, and served by
`GET /api/v1/atlas/questions?capability_id=…`. The existing Questions Worth Asking screen is
unchanged in behaviour; its renderer was updated to the governed field names.

---

## 2. Ask CogniX — what it refuses matters more than what it answers

| Question | Outcome | Behaviour |
|---|---|---|
| `how does Decision Gap work` | **answered** | Led by Decision Gap Intelligence, with citations to its evidence and implementation |
| `why did the decision change` | **ambiguous** | **4 grounded readings presented side by side**, no winner picked |
| `what do competitors offer in this market` | **gap + external notice** | States the internal Atlas cannot substantiate it and names ATL-06 |
| `zzz nothing at all` | **gap** | States that nothing was inferred |

### 2.1 Ambiguity is answered, not resolved arbitrarily

`why did the decision change` is the case the owner asked to be evaluated. Four capabilities are
defensible readings, and the answer says so rather than choosing:

> *This question has 4 defensible readings in the governed corpus. Rather than choosing one, here is
> each reading with the capability that answers it.*

Each reading carries its own citation, its own three maturity dimensions, and an explanation of what
it reads the question to be about — *"Reads the question as being about ai trust, decision recall;
matched on name and summary"* — so the reader can pick the interpretation that matches their intent.
A clear question is still answered directly: `how does Decision Gap work` returns `answered` with no
interpretations, so ambiguity is not manufactured (`run-atl05-tests` E7).

### 2.2 External knowledge is declined, not approximated

A declared marker list detects questions needing current external knowledge — market, competitors,
analysts, pricing, third-party platforms. The answer states:

> *The internal Atlas cannot substantiate the market and competitor landscape part of this question.
> CogniX-owned records describe what CogniX does; they hold no external market or competitor
> evidence. External research and grounding are owned by ATL-06 and are not available yet.*

Asserted to make no external claim of its own (C7).

### 2.3 No provider, and the degradation is stated

`ATL-05` ships **no provider adapter**. The answer is assembled from governed records — selected and
arranged, never generated — and every answer carries:

> *No AI provider is configured, so this answer is assembled directly from governed CogniX records
> rather than narrated. Every statement below is quoted from the record it cites.*

A registered-but-failing provider degrades the same way, producing no invented text (G6). This is
ADR-049 applied literally: degrading to governed records is permitted because they are real; a canned
generated answer would not be.

---

## 3. Two defects found and fixed

### 3.1 Short words matched inside longer ones

`zzz nothing at all` initially returned **four confident readings**. The cause was substring
matching: `all` matches "actually", "recall" and "small", so a nonsense query scored against half the
corpus on incidental prose collisions.

**Fixed** with word-boundary matching in `capability-search.ts`, plus an extended stopword list
covering quantifiers and pro-forms. This is a Level 1 correctness fix that ATL-04's queries had not
exposed, and it improves search as well as Ask.

### 3.2 A prose match could ground an assertion

A capability whose only match was a word buried in an architecture narrative was being treated as the
subject of the question. **Fixed** by requiring at least one *discriminating* match — name, summary,
identifier, business problem, tag or use case — before a capability can ground an answer. Prose
matches remain supporting evidence. Declared as `DISCRIMINATING_FIELDS` and asserted by D4–D5.

Both were found by testing refusal cases rather than happy paths.

---

## 4. Constraints

| Constraint | How it was met |
|---|---|
| Retrieval and reasoning strictly inside governed knowledge | B1–B3: no `fetch`, no URL, no provider SDK, no embedding code anywhere in `lib/atlas/ai/` |
| No Google Search, web retrieval or external market evidence | None present. ATL-06 named as owner in the refusal text |
| State when external knowledge is required | C4–C6 |
| Visible provenance to capability and evidence sources | F1–F4: every section carries citations reaching capability, evidence and implementation |
| Preserve lifecycle, demo maturity and implementation truth | F3, F5–F6: every cited claim carries all three dimensions; a partially-implemented capability is reported as such **inside the answer**, with its limitation quoted |
| Not chatbot-first | I1–I2: search renders above Ask, and Ask is collapsed until deliberately opened |
| Ambiguous-question evaluation | §2.1, E1–E9 |
| Prefer grounded multi-capability explanation | E2–E6 |

---

## 5. Validation

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **0 diagnostics** |
| `run-atl05-tests.ts` | **54 passed, 0 failed** |
| `run-atl04` / `run-atl03` / `run-atl02` | **54 / 29 / 119**, all unchanged |
| Full regression (28 runners) | **26 exit-0**; `run-cdi07a` and `run-cdi07b` reproduce baseline counts exactly (154/1, 228/7) |
| `npm run build` | **Compiled successfully**; `/api/v1/atlas/ask` and `/api/v1/atlas/questions` registered |
| Live render | Ask collapsed by default; ambiguous answer renders 4 sections, 13 citations, 4 maturity triads; external refusal notice shown; no horizontal overflow |

Playwright was transient validation tooling and its dependency drift was reverted.

---

## 6. Scope

**Not done, deliberately:** no provider adapter, no embedding retriever, no Google Search grounding,
no market evidence, no client-conversation preparation. `ATL-04`'s corpus, the storyboard and the
38 capability records are untouched. **SB-GATE remains 0 of 6 advanced.**

**Level 2 semantic retrieval is not shipped.** `ADR-050` defines Level 2 as embedding retrieval, and
an embedding provider is a provider. The retrieval interface exists and is provider-shaped so a
Level 2 retriever slots in without touching answer assembly; the deterministic retriever is what runs
today, and the answer reports `retrievalLevel: 'structured'` rather than claiming otherwise.

---

## 7. Handoff to ATL-06

1. **Provider adapter** registers through `registerProvider`. A provider may only *narrate* an
   already-assembled, already-cited answer — `NarrationRequest` carries no capability data the
   provider could contradict.
2. **External grounding** attaches where `externalKnowledgeNotice` is currently emitted. The marker
   list in `retrieval.ts` already identifies which questions need it.
3. **Level 2 retrieval** slots behind the `retrieve` interface.
4. **Three-class separation** (ADR-048) is not yet needed: every current statement is *From CogniX*.
   ATL-06 introduces *Market Context* and *AI Interpretation* and must keep them structurally distinct.
