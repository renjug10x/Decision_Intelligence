# CogniX Capability Atlas — Search & AI Model

**Document type:** Atlas governance — search, retrieval and AI architecture
**Owned by:** CogniX Capability Atlas programme (`COGNIX_CAPABILITY_ATLAS.md`)
**Binding on:** CAT-04 (Level 1), CAT-05 (Level 2, Ask CogniX), CAT-06 (Gemini, grounding, client
preparation)

---

## 1. Search is a first-class Atlas capability

Search is not a utility bolted onto a catalogue. It is the primary way every audience — executive,
sales, architect, developer, and later an autonomous agent — enters the Atlas. The landing experience
treats search as primary (`CAPABILITY_ATLAS_UX_SPEC.md` §4).

Search evolves in three levels. **Each level must stand alone**: Level 1 works with no AI configured,
Level 2 works with no external provider, Level 3 degrades to Level 2 and then to Level 1. This is
ADR-0008, and it is what keeps the Atlas usable when a key is missing, a quota is exhausted or a
provider is down — a failure mode this repository already handles deliberately elsewhere
(`lib/gemini.ts` falls back to `mockAskNLQ` / `mockBriefing` when no key is present).

---

## 2. Level 1 — Structured Atlas Search  *(CAT-04)*

Deterministic backend search. No model involved. Reproducible for the same corpus and query.

### 2.1 Searchable fields

`name` · `shortName` · `summary` · `description` · `innovationThesis` · business problem ·
`tags` · `keywords` · `searchTerms` · domain and sub-domain · `personas` · `useCases` ·
`architecture` narrative · technology terms from `services`/`dependencies`/`components` ·
`maturity` · `demoReadiness`

### 2.2 Filters

`Domain` · `Capability type` · `Business problem` · `Audience (persona/lens)` · `Maturity` ·
`Platform reusable` · `Demo ready`

Plus, from the API contract (`CAPABILITY_ATLAS_ARCHITECTURE.md` §5.1): sub-domain, tags and
cross-domain applicability.

### 2.3 Behaviour rules

- Ranking is explainable: field weighting is documented and the response says which fields matched.
- Zero results return the nearest filter relaxation as a suggestion, never an empty page.
- Filter values are validated against the taxonomy; unknown values are rejected with the field named.
- Results always show `maturity`, `implementationStatus` and `demoReadiness` — a searcher must never
  reach a simulated capability without seeing that it is simulated.

---

## 3. Level 2 — Semantic Search  *(CAT-05)*

Semantic retrieval over **governed CogniX capability knowledge only**. No web access at this level.

Natural-language example:

> Which features can help explain why a forecast changed?

Rules:

- The corpus is the capability record set and its evidence refs — nothing else.
- Retrieval returns record ids with scores; the ids are resolved through the Capability Service so
  that lens, filters and freshness still apply.
- Every semantic result is traceable to the record and field that matched.
- Semantic results are merged with Level 1 results under a documented policy, and the response marks
  which results came from which level.
- If the index is missing or the embedding provider is unavailable, the endpoint returns Level 1
  results and says so.

---

## 4. Level 3 — Ask CogniX  *(CAT-05, extended in CAT-06)*

AI-assisted reasoning **over governed capability knowledge**.

Example:

> Explain Forecast Regret to a retailer and show me how to demonstrate it.

*(Illustrative phrasing only — no capability of that name exists in this repository today; see
`COGNIX_CAPABILITY_ATLAS.md` §1.1. CAT-05 must exercise Ask CogniX against real capabilities.)*

Rules:

- Answers are generated **only** from retrieved governed content plus, at CAT-06, labelled external
  evidence. The model is not a source of CogniX facts.
- Every sentence asserting a CogniX capability fact carries a citation to a record id.
- Answers are audience-sensitive: the same question answered under a Sales lens leads with outcomes and
  demo narrative; under an Architect lens with services and contracts. The underlying retrieved
  evidence is the same.
- Guardrail: if the retrieved evidence does not support an answer, Ask CogniX says what it does not
  know and offers the nearest governed capabilities. It never fills the gap from model priors.
- With no provider configured, Ask CogniX degrades to Level 2/Level 1 results and states that AI
  explanation is unavailable.

---

## 5. Atlas AI Gateway  *(CAT-05)*

All AI passes through one server-side gateway owned by CogniX.

```text
Atlas UI ──► Atlas Backend API ──► Atlas AI Gateway ──► Provider adapter ──► model
                                          │
                                          ├─► Retrieval (governed knowledge)
                                          ├─► Guardrails (claim policy, citation policy)
                                          ├─► Provenance assembly
                                          └─► Caching / cost controls
```

Gateway responsibilities: intent classification and routing (§7) · retrieval orchestration ·
prompt assembly · guardrail enforcement · citation and provenance assembly · evidence-class labelling ·
caching, quotas and cost controls · redaction of secrets from logs.

**Provider abstraction is mandatory (ADR-0005).** The gateway defines a provider interface; Gemini is
one adapter behind it. Swapping or supplementing the provider must not change Atlas retrieval, records
or UI — CAT-06 proves this with a second or fake adapter under test.

**No provider SDK may be imported into a client component.** The existing pattern in this repository —
`lib/gemini.ts` used only from route handlers under `app/api/`, with the key supplied per request and
never committed — is the precedent and must not be weakened.

---

## 6. Google AI / Gemini architecture  *(CAT-06)*

Google AI reasoning is introduced **behind** the CogniX backend. Gemini is never called from the
browser.

Target conceptual flow:

```text
User Question
     |
     v
Atlas AI Gateway
     |
     v
Query / Intent Classification
     |
     +-------------------------------+
     |                               |
     v                               v
CogniX Knowledge Retrieval     External Research
     |                               |
     |                         Google Search
     |                           Grounding
     +---------------+---------------+
                     |
                     v
               Gemini Reasoning
                     |
                     v
          Grounded Atlas Response
                     |
          +----------+----------+
          |                     |
      CogniX Evidence       Web Sources
```

Controls on external research (ADR-0006):

- Grounding runs **server-side only**, initiated by the gateway, never by the client.
- Grounding is enabled per intent class (§7), not globally on every question.
- Every external claim returns with source URL, publisher and retrieval date, or it is dropped
  (`CAPABILITY_ATLAS_CONTENT_STANDARD.md` §6).
- Responses separate **From CogniX** / **Market Context** / **AI Interpretation** structurally and
  visually (`CAPABILITY_ATLAS_CONTENT_STANDARD.md` §4.1).
- Market evidence is cached with its provenance and subject to the freshness windows in
  `CAPABILITY_ATLAS_CONTENT_STANDARD.md` §5.4.
- A trusted-source policy governs which domains may be cited; the policy is recorded at CAT-06.
- Disabling grounding must leave every Atlas surface functional with internal knowledge only.

---

## 7. Query routing model

The gateway classifies intent and routes accordingly.

| Class | Example | Knowledge used | Grounding |
|-------|---------|----------------|-----------|
| **CogniX-only** | *How does Decision Gap work?* | Internal Atlas knowledge only | No |
| **Comparative** | *How is Decision Gap different from conventional planning systems?* | Internal Atlas knowledge + external market research where needed | Yes, for the external half only |
| **Market research** | *What recent research exists around intent signals in retail forecasting?* | Google Search grounding + trusted web evidence, framed with CogniX context | Yes |
| **Demonstration** | *How should I demonstrate Demand Fusion?* | Governed Atlas demo content (Demo Path, Questions Worth Asking, warnings) | No |
| **Client preparation** | *Prepare me for a meeting with…* | Governed Atlas knowledge + optional current market research | Optional, per §8 |

Routing rules:

- A CogniX-only question must never be answered from the web, even if retrieval is thin. It returns
  what is governed plus an honest gap statement.
- A comparative answer must keep the internal and external halves separately labelled and separately
  sourced.
- Misclassification must fail safe toward *CogniX-only* (less external influence), never toward
  ungrounded generation.
- The classification of each answer is returned in the response so the UI can show it and CAT-07 can
  audit it.

---

## 8. "Prepare me for a client conversation"  *(required CAT-06 feature)*

This is a required Capability Atlas feature, explicitly in scope for CAT-06.

### 8.1 Input

Free-text context from the user, for example:

> I am meeting the Head of Demand Planning at a UK grocery retailer. They are struggling with
> promotional volatility, stock forecasting and slow reaction to external demand signals.

### 8.2 Reasoning inputs

CogniX capabilities · business problems · domain context · demo readiness · market evidence ·
cross-capability relationships · audience persona · optionally current external research.

### 8.3 Required output sections

The returned pack must contain **all** of the following, each evidence-grounded:

| Section | Content |
|---------|---------|
| **Client problem interpretation** | What CogniX understands the prospect's likely pain points to be, and which stated words led to that reading |
| **Recommended CogniX capabilities** | Which capabilities are most relevant, with record citations and their maturity/implementation status |
| **Recommended demonstration sequence** | An ordered path, e.g. `Problem → Signals → Demand Fusion → Revised Forecast → Uncertainty → Decision Gap → Decision Consequence` — assembled from real records and their Demo Paths |
| **Why each capability matters** | Business-focused explanation per capability |
| **Questions to ask the client** | Drawn from `questionsWorthAsking` plus context-derived questions, e.g. *"What demand signals do you know exist today but cannot introduce into your forecasting process quickly enough?"*, *"When a forecast changes, how quickly can the operational decision change with it?"* |
| **Likely client questions** | From `clientQuestions`, e.g. *Does CogniX replace our forecasting platform?* · *What data is required?* · *How does this integrate with existing planning systems?* · *How do you validate whether the revised forecast was genuinely better?* · *Can these capabilities be reused outside demand forecasting?* |
| **Suggested responses** | From `recommendedResponses`, grounded in governed CogniX knowledge with citations |
| **Relevant market evidence** | Only where external research materially supports the discussion, with full provenance, clearly in the *Market Context* class |
| **Demo warnings / limitations** | Every experimental, simulated or roadmap capability recommended must be flagged here, sourced from `implementationStatus`, `limitations` and Demo Path `warnings` |
| **Suggested follow-up capabilities** | What to explore next depending on the customer's response |

### 8.4 Governance rules

- The demonstration sequence may only include capabilities whose records exist and whose
  `demoReadiness` supports being shown. A capability that is not demonstrable may still appear under
  *Recommended capabilities* — with its status visible — but not in the sequence without a warning.
- **The warnings section is mandatory and non-empty whenever any recommended capability is not fully
  implemented.** A pack that recommends a simulated capability without saying so is a governance
  failure and must fail CAT-06 acceptance.
- With grounding disabled or unavailable, the pack is still produced from internal knowledge, and the
  market evidence section is rendered as explicitly absent rather than omitted.
- Packs are generated content: they carry citations, an evidence-class breakdown and a generation
  timestamp, and they are not stored as capability truth.

---

## 9. Evaluation

CAT-05 and CAT-06 each ship an evaluation suite, run by the standard test command:

| Test | Asserts |
|------|---------|
| Citation coverage | Every CogniX-fact sentence carries a resolvable record citation |
| Guardrail | A question about a non-existent capability yields a declared gap, not an invention |
| Degradation | With no provider key, every AI surface degrades to structured search and says so |
| Class separation | Responses containing external evidence keep the three evidence classes distinct |
| Provenance | No external claim renders without source, publisher and retrieval date |
| Provider swap | Replacing the provider adapter changes no retrieval, record or UI behaviour |
| Routing | Each intent class routes as specified in §7, and misclassification fails safe |
| Client-prep completeness | All §8.3 sections present; warnings non-empty when a non-implemented capability is recommended |
