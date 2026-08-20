# Architecture Decision Records

**Document type:** Architecture governance — decision register
**Scope:** Decision Intelligence platform (CogniX). All architecturally significant decisions.

## Conventions

- Records are numbered `ADR-nnnn`, allocated sequentially and **never reused**.
- Records are **append-only**. A decision that changes is *superseded* by a new record; the historical
  record is left intact with its status updated to `Superseded by ADR-nnnn`.
- Status vocabulary: `Proposed` · `Accepted` · `Superseded by ADR-nnnn` · `Deprecated`.
- Format per record: Status · Date · Context · Decision · Consequences · Applies to.

## Register

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-0001](#adr-0001--the-capability-atlas-is-the-authoritative-capability-knowledge-layer) | The Capability Atlas is the authoritative capability knowledge layer | Accepted | 2026-08-20 |
| [ADR-0002](#adr-0002--capability-knowledge-is-backend-driven-not-static-ui-content) | Capability knowledge is backend-driven, not static UI content | Accepted | 2026-08-20 |
| [ADR-0003](#adr-0003--the-capability-model-is-domain-independent) | The capability model is domain-independent | Accepted | 2026-08-20 |
| [ADR-0004](#adr-0004--internal-cognix-truth-is-separated-from-external-market-evidence) | Internal CogniX truth is separated from external market evidence | Accepted | 2026-08-20 |
| [ADR-0005](#adr-0005--ai-providers-sit-behind-a-cognix-owned-gateway-abstraction) | AI providers sit behind a CogniX-owned gateway abstraction | Accepted | 2026-08-20 |
| [ADR-0006](#adr-0006--external-web-grounding-is-controlled-and-server-side) | External web grounding is controlled and server-side | Accepted | 2026-08-20 |
| [ADR-0007](#adr-0007--every-published-claim-carries-provenance) | Every published claim carries provenance | Accepted | 2026-08-20 |
| [ADR-0008](#adr-0008--search-evolves-progressively-and-each-level-stands-alone) | Search evolves progressively and each level stands alone | Accepted | 2026-08-20 |
| [ADR-0009](#adr-0009--the-architectural-storyboard-is-retired-only-through-a-preservation-gate) | The Architectural Storyboard is retired only through a preservation gate | Accepted | 2026-08-20 |

> **Note on numbering.** This register is created by the Capability Atlas governance work package. No
> ADR register previously existed in this repository, so numbering begins at ADR-0001. Architectural
> decisions taken earlier in the project's life are recorded in `PLAN.md` (Phases 1–15) and are **not**
> retrospectively converted into ADRs — rewriting history is explicitly out of scope. Future
> non-Atlas decisions append to this same register.

---

## ADR-0001 — The Capability Atlas is the authoritative capability knowledge layer

**Status:** Accepted · **Date:** 2026-08-20 · **Applies to:** CAT-01 … CAT-07

### Context
Knowledge about what the platform can do is currently spread across `PLAN.md`, slide definitions inside
`components/ArchitectureExplorer.tsx`, tab content in `components/Help.tsx`, and the code itself. There
is no single place where an executive, a seller, an architect, a developer or an agent can ask "what
can this platform do, and how do I show it?" and get one governed answer. Each audience is served, if
at all, by a different artefact that ages independently.

### Decision
The CogniX Capability Atlas is the authoritative knowledge, discovery, explanation and enablement layer
for CogniX capabilities. Capability facts are governed in Atlas records; other surfaces reference the
Atlas rather than restating it.

### Consequences
- One record per capability serves all audiences through lenses, not copies.
- Other documents may summarise and link, but a contradiction is resolved in the Atlas's favour.
- The Atlas takes on governance obligations: ownership, review dates, evidence, lifecycle (CAT-07).
- `PLAN.md` remains authoritative for **delivery sequencing**; the Atlas is authoritative for
  **capability knowledge**. The two are not merged.

---

## ADR-0002 — Capability knowledge is backend-driven, not static UI content

**Status:** Accepted · **Date:** 2026-08-20 · **Applies to:** CAT-02, CAT-04

### Context
The repository already demonstrates the cost of presentation-embedded knowledge: the entire
architecture narrative lives in a `SLIDES` array inside a ~2,300-line component, and the Resolution
Pattern Library records `PAT001`–`PAT004` are literals inside `components/Help.tsx`. None of it is
searchable, referenceable, versionable as content, or reachable by any other surface. The Atlas must
serve search, four lenses, AI retrieval, a client-preparation pack and lifecycle automation from the
same content.

### Decision
Capability content is stored in a governed knowledge store and served through backend contracts. The
frontend renders API responses. Static JSX/HTML is never the source of truth for capability knowledge.

### Consequences
- Atlas UI components contain labels and layout only; a grep for capability prose in `components/atlas/*`
  should find none. This is a CAT-04 acceptance criterion.
- All store access goes through a repository abstraction, so the persistence mechanism can change
  behind one interface.
- No heavyweight database is mandated: the default is version-controlled record files, consistent with
  a repository that today has no database at all (`data/*.json` + a mocked semantic layer).
  Escalation to a database requires a new ADR.

---

## ADR-0003 — The capability model is domain-independent

**Status:** Accepted · **Date:** 2026-08-20 · **Applies to:** CAT-01 … CAT-04

### Context
Retail & Grocery is the initial and, today, only populated domain. The strategic intent is reuse across
Manufacturing, Financial Services, Healthcare, Travel & Hospitality and Supply Chain / Logistics. A
model shaped around retail would have to be rebuilt at the first second domain.

### Decision
Domains, sub-domains, business problems, personas and tags are **data**, held in a taxonomy and
referenced by records. No module path, route segment, type name, schema field or storage structure
encodes a specific domain. A capability may hold multiple domain placements and, independently, a
platform-reuse classification.

### Consequences
- Adding a domain requires new taxonomy entries and records only — no architectural change. CAT-02
  should prove this with a test that registers a second, fictitious domain.
- The Platform Capability Map is derived from record fields, never hand-maintained.
- Retail-specific vocabulary is confined to record content, not structure.

---

## ADR-0004 — Internal CogniX truth is separated from external market evidence

**Status:** Accepted · **Date:** 2026-08-20 · **Applies to:** CAT-03, CAT-05, CAT-06

### Context
Once external research and a language model participate in explaining capabilities, there is a real
risk that plausible external or generated statements are read as statements of what CogniX does.

### Decision
CogniX-owned documentation, implementation evidence, architecture and testing are authoritative for
statements about what CogniX does. External research may explain, summarise, compare, contextualise and
supply market evidence, but may never silently redefine a capability. Every Atlas response separates
content into three classes — **From CogniX**, **Market Context**, **AI Interpretation** — structurally
in the payload and visually in the UI.

### Consequences
- A CogniX-only question is never answered from the web, even when internal retrieval is thin; the gap
  is stated instead.
- Comparative answers keep both halves separately labelled and separately sourced.
- Merging the classes into one undifferentiated narrative is a governance failure regardless of
  accuracy.
- Intent misclassification fails safe toward internal-only.

---

## ADR-0005 — AI providers sit behind a CogniX-owned gateway abstraction

**Status:** Accepted · **Date:** 2026-08-20 · **Applies to:** CAT-05, CAT-06

### Context
Gemini is the intended first reasoning provider, but provider choice, pricing and capability change
quickly. The Atlas must not be rebuilt when the provider changes. The repository already isolates
provider access in `lib/gemini.ts`, called only from route handlers, with the key supplied per request
and never committed.

### Decision
All AI passes through one server-side Atlas AI Gateway that owns intent routing, retrieval
orchestration, prompt assembly, guardrails, provenance assembly, caching and cost control. Providers
are adapters behind a stable interface. No provider SDK is imported into a client component, and no
model endpoint is called from the browser.

### Consequences
- Swapping or supplementing the provider changes no retrieval, record or UI behaviour — proven by a
  second or fake adapter under test (a CAT-06 acceptance criterion).
- Guardrails and citation policy are enforced in one place rather than per feature.
- The existing secret-handling convention is preserved: no key in records, fixtures or logs.

---

## ADR-0006 — External web grounding is controlled and server-side

**Status:** Accepted · **Date:** 2026-08-20 · **Applies to:** CAT-06

### Context
Google Search grounding gives current market evidence but introduces uncontrolled content, cost and
the risk of unsourced claims entering governed surfaces.

### Decision
Grounding is initiated only by the Atlas AI Gateway, server-side, and only for intent classes that
require external evidence (comparative, market research, and optionally client preparation). Grounded
claims carry source URL, publisher and retrieval date, are subject to a trusted-source policy, are
cached with their provenance under defined freshness windows, and are labelled *Market Context*.

### Consequences
- Grounding can be disabled entirely and every Atlas surface still functions on internal knowledge.
- A grounded claim without provenance is dropped, not published with an empty citation.
- Cost is bounded by intent-class gating and caching.

---

## ADR-0007 — Every published claim carries provenance

**Status:** Accepted · **Date:** 2026-08-20 · **Applies to:** CAT-02 … CAT-07

### Context
The Atlas will be used to brief executives and clients. A claim whose basis cannot be inspected is a
liability, and stale evidence presented as current is worse than no evidence.

### Decision
Every internal behavioural claim carries an evidence reference (code, test, measurement, demo
recording, review). Every external claim carries source, publisher, publication date and retrieval
date. Every record carries an owner, a `reviewedAt` date and a version. Provenance survives caching.
Claims that cannot carry provenance are not published.

### Consequences
- The validator rejects unsourced external claims; the API omits them server-side.
- Provenance is visible without interaction in the UI — a tooltip does not satisfy this ADR.
- CAT-07 automates staleness and drift flagging; automation flags, humans decide.

---

## ADR-0008 — Search evolves progressively and each level stands alone

**Status:** Accepted · **Date:** 2026-08-20 · **Applies to:** CAT-04, CAT-05, CAT-06

### Context
Semantic retrieval and AI explanation are the eventual goal, but they depend on keys, indexes, quotas
and providers. A discovery layer that stops working when a key is missing is not a governed knowledge
layer. The repository already models the right instinct: `lib/gemini.ts` falls back to deterministic
mock responses when no key is configured.

### Decision
Search is built in three levels — structured (Level 1), semantic (Level 2), Ask CogniX (Level 3). Each
level must function without the levels above it. Level 3 degrades to Level 2, Level 2 to Level 1, and
each degradation is stated to the user rather than hidden.

### Consequences
- Level 1 is deterministic, explainable and reproducible, and is a hard CAT-04 acceptance criterion.
- The semantic index is additive; it does not change the record format.
- No Atlas surface may become unusable because an AI dependency is unavailable.

---

## ADR-0009 — The Architectural Storyboard is retired only through a preservation gate

**Status:** Accepted · **Date:** 2026-08-20 · **Applies to:** CAT-01, CAT-04

### Context
The intention is that the Capability Atlas eventually replaces the Architectural Storyboard navigation
surface. But `components/ArchitectureExplorer.tsx` (14 slides) and the three `components/Help.tsx` tabs
carry genuine architectural knowledge — persona journeys, the enterprise blueprint, the recommendation
lifecycle, the governance and trust narrative, presenter notes and demo timings — that exists nowhere
else in the repository.

### Decision
The storyboard is not deleted or disabled during CAT-01. It may be retired only inside a work package
that also names its navigation successor, and only once every gate item in
`COGNIX_CAPABILITY_ATLAS.md` §11.1 (SB-GATE-1 … SB-GATE-6) is satisfied and ticked in
`STORYBOARD_MIGRATION_ASSESSMENT.md`: every slide audited with a retain/discard decision, all retained
knowledge present in its destination, destinations reachable from the Atlas or from governance
documentation, each major narrative given a successor surface, and presenter notes and timings
preserved in Demo Path content.

### Consequences
- Removing architecture transparency is not an acceptable side effect of adding the Atlas.
- CAT-01 must produce the per-slide migration assessment before any retirement is possible.
- If the gate cannot be met, the storyboard stays and the Atlas coexists with it.
