# COGNIX CAPABILITY ATLAS — ARCHITECTURE, SEARCH & AI MODEL

**Document Status:** Approved & Authoritative (design only — not implemented)
**Version:** 1.0.0
**Effective Date:** August 2026
**Owner:** G10X Principal Architecture Group
**Implemented by:** `ATL-02` (backend) · `ATL-04` (Level 1) · `ATL-05` (Level 2/3) · `ATL-06` (grounding)
**Governing decisions:** ADR-002, ADR-006, ADR-018, ADR-044, ADR-045 … ADR-051

---

## 1. Architectural position

The Atlas is a knowledge layer over the registries described in
[`INFORMATION_ARCHITECTURE.md`](INFORMATION_ARCHITECTURE.md) §3. It introduces no new domain engine and
no new deployable service.

```text
                    Capability Atlas UI
                            │
                            ▼
                     Atlas Backend API
                            │
              ┌─────────────┴─────────────┐
              │                           │
     Capability Service            Search Service
              │                           │
              └─────────────┬─────────────┘
                            ▼
             Capability Knowledge Registry
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
config/solutions.ts  config/experiments.ts  config/domains.ts
   (SOL-*)              (EXP-*)             config/personas.ts
                                            config/patterns.ts
```

With the AI layer added at `ATL-05` / `ATL-06`:

```text
   Atlas UI ──► Atlas Backend API ──► Capability Service ──► Registry
                       │                      ▲
                       └──► Atlas AI Gateway ─┘   (server-side only)
                                   │
                                   └──► Provider adapter ──► model / grounding
```

### 1.1 Responsibilities

| Element | Owns | Must not |
|---------|------|----------|
| Atlas UI | Layout, disclosure, lens presentation, filter state, accessibility | Hold capability content; call any provider directly |
| Atlas Backend API | Contracts, filtering, pagination, lens hints, typed errors | Reformat content into audience-specific bodies |
| Capability Service | Knowledge read, registry reference resolution, relationship resolution, validation, versioning | Fetch external web content |
| Search Service | Deterministic Level 1; later the semantic index | Return results without maturity and status attached |
| Knowledge Registry | Durable version-controlled knowledge + evidence refs | Contain markup, layout, or duplicated registry fields |
| Atlas AI Gateway | Intent routing, retrieval orchestration, prompt assembly, guardrails, provenance, caching, cost control | Be reachable from the browser; emit uncited capability claims |

---

## 2. Knowledge registry

### 2.1 Requirements

Version-controlled definitions · ingestion and validation on write · backend querying and filtering ·
structured search · later semantic indexing without a format change · content versioning · provenance
per claim · lifecycle governance hooks.

### 2.2 Persistence — deliberately not a database (ADR-046)

The estate holds its capability metadata as typed TypeScript registries under `config/` and its
demonstration data as version-controlled synthetic datasets. A capability knowledge registry is the
same shape of problem and gets the same answer: **version-controlled registry modules**, loaded through
a repository abstraction with an in-memory index built at startup.

Two constraints make this safe:

- **All access goes through the repository abstraction.** No route, component, search path or AI path
  reads registry modules directly. A later move to a service or store is a change behind one
  interface, requiring a new ADR rather than a rewrite.
- **The Atlas stores only its extension.** `CognixSolution` fields stay in `config/solutions.ts` and are
  resolved by reference (ADR-045), so there is exactly one place any given field is edited.

`ATL-02` records the location actually chosen — beside the registries in `config/`, or a dedicated
content root — in its handoff.

### 2.3 The anti-pattern this closes

`components/QuestionsWorthAsking.tsx` holds ten `CuriosityQuestion` records as a literal array inside
the component: real capability knowledge, naming `EXP-COMMITMENT-01`, `SOL-PROMO-01` and quantified
evidence, that is unsearchable, unreferenceable and invisible to retrieval. `ATL-02` migrates it to the
registry; the component becomes a renderer (ADR-046). This is the reference case for every later Atlas
surface.

---

## 3. Domain independence

Domains are data. `config/domains.ts` is the authority; `retail_grocery` is the only `active` domain and
the remainder are `coming_soon`. No module path, route segment, type name or registry structure encodes
a domain — restating ADR-002 (client-neutral core with configurable industry packs) rather than adding
a new ruling.

Adding a domain must require taxonomy entries and knowledge records only. `ATL-02` proves this with a
test that registers a second, fictitious domain and queries it.

---

## 4. API surface

Proposed; exact shapes settled in `ATL-02`.

| Endpoint | Purpose | Phase |
|----------|---------|-------|
| `GET /api/v1/atlas/domains` | Domain tree with capability counts, from `config/domains.ts` | `ATL-02` |
| `GET /api/v1/atlas/capabilities` | List / filter | `ATL-02` |
| `GET /api/v1/atlas/capabilities/{ref}` | Full knowledge for a `SOL-*` / `EXP-*`, optional `lens` | `ATL-02` |
| `GET /api/v1/atlas/relationships` | Capability graph edges | `ATL-02` |
| `GET /api/v1/atlas/tags` | Controlled tag vocabulary with counts | `ATL-02` |
| `GET /api/v1/atlas/evidence` | Evidence refs, filterable | `ATL-02` |
| `GET /api/v1/atlas/search` | Structured (L1); semantic added at `ATL-05` | `ATL-02` / `ATL-05` |
| `POST /api/v1/atlas/ask` | Ask CogniX — grounded answer with citations | `ATL-05` |
| `POST /api/v1/atlas/client-preparation` | "Prepare me for a client conversation" | `ATL-06` |

Routes follow the estate's existing `app/api/v1/*` convention.

### 4.1 Filters (required on list and search)

`domain` · `subdomain` · `businessProblem` · `persona` (decision lens) · `lifecycleState` ·
`demoMaturity` · `implementationStatus` · `platformReusable` · `crossDomainApplicability` · `tags`

AND across dimensions, OR within a repeated dimension. Values are validated against the taxonomy; an
unknown value returns a typed 400 naming the field, never a silent empty result.

### 4.2 Contract rules

- Responses carry `schemaVersion`, and per record `version` and `reviewedAt`, so a consumer can reason
  about freshness.
- `lens` returns an ordering and emphasis hint, not different content
  ([`CAPABILITY_KNOWLEDGE_MODEL.md`](../governance/CAPABILITY_KNOWLEDGE_MODEL.md) §8).
- All three maturity dimensions accompany every capability in every response (ADR-047).
- External claims include provenance inline; a claim without provenance is omitted server-side
  (ADR-048).
- Errors are typed and name the offending field.

---

## 5. Architecture documentation model

Retiring the Architectural Storyboard must not remove architecture transparency (ADR-051). Architecture
is documented at two levels, both reachable from the Atlas:

1. **Capability-specific** — the `architecture`, `components`, `services`, `apis`, `contracts`,
   `dataSources`, `signals`, `dependencies` and `implementationReferences` fields.
2. **Platform-wide** — [`ARCHITECTURE.md`](ARCHITECTURE.md) and
   [`INFORMATION_ARCHITECTURE.md`](INFORMATION_ARCHITECTURE.md), referenced from records via
   `relatedGovernance` and `relatedDecisions`.

Each capability exposes architecture **progressively** — a one-line flow, then an expandable stage
diagram, then node detail — matching the `UX_DESIGN_PRINCIPLES.md` §5.2 pattern
*What? → Why? → Evidence → What If?*. At the deepest level a reader reaches services, components, APIs,
contracts, stores, external dependencies, signal provenance, decision dependencies, related ADRs and
implementation references.

---

## 6. Platform Capability Map

A planned Atlas view **derived from record fields**, never hand-maintained: reusable capabilities and
the domains they apply to, from `platformReusable` and `crossDomainApplicability`.

Its purpose is to communicate that Retail & Grocery is a domain implementation of reusable CogniX
decision-intelligence capabilities, not a collection of disconnected demos. A map that cannot show at
least one capability applying beyond `retail_grocery` should prompt a reuse assessment, not a
fabricated edge.

`ATL-01` determines the real platform capability groupings from evidence and records them in the
taxonomy. The map renders whatever `ATL-01` defines.

---

## 7. Search — three levels (ADR-050)

Each level functions without the levels above it. Level 3 degrades to Level 2, Level 2 to Level 1, and
each degradation is stated to the user.

### 7.1 Level 1 — Structured search (`ATL-04`)

Deterministic, explainable, reproducible. Searchable: capability name, the registry's
`fiveSecondProposition` and `businessQuestion`, `description`, `innovationThesis`, business problem,
`tags`, `searchTerms`, domain and sub-domain, personas, `useCases`, architecture narrative, technology
terms from `services` / `dependencies` / `components`, and all three maturity dimensions.

Rules: ranking is explainable and the response names the fields that matched; zero results return the
nearest filter relaxation rather than an empty page; results always carry all three maturity dimensions,
so a searcher never reaches a simulated capability without seeing that it is simulated.

### 7.2 Level 2 — Semantic search (`ATL-05`)

Embedding retrieval over governed capability knowledge **only** — no web. Retrieval returns capability
refs with scores, resolved through the Capability Service so lens, filters and freshness still apply.
Every result is traceable to the record and field that matched. Results are merged with Level 1 under a
documented policy and the response marks which level produced each result. A missing index or
unavailable embedding provider returns Level 1 results and says so.

### 7.3 Level 3 — Ask CogniX (`ATL-05`, extended in `ATL-06`)

Answers are generated only from retrieved governed content plus, at `ATL-06`, labelled external
evidence. The model is never a source of CogniX facts. Every sentence asserting a CogniX capability
fact carries a citation to a capability ref. Answers are audience-sensitive — the same question under a
Sales lens leads with outcomes and demo narrative, under an Architect lens with services and contracts —
over the same retrieved evidence. Where evidence does not support an answer, Ask CogniX states what it
does not know and offers the nearest governed capabilities.

---

## 8. Atlas AI Gateway (ADR-049)

All AI passes through one server-side gateway. Responsibilities: intent classification and routing
(§9) · retrieval orchestration · prompt assembly · guardrail enforcement · citation and provenance
assembly · evidence-class labelling · caching, quotas and cost control · secret redaction.

Providers are adapters behind the existing abstraction (`lib/gemini.ts` / `lib/ai-provider.ts`,
`ARCHITECTURE.md` §3.4). No provider SDK is imported into a client component and no model or grounding
endpoint is called from the browser.

**Refusal over fabrication.** With no provider configured, or on provider failure, Atlas AI degrades to
deterministic Level 1 results and says so. It never returns generated capability content from a fallback
path. This follows ADR-044's line: a mock briefing is a demo affordance, whereas fabricated capability
knowledge would be fabricated input to a governed contract. Degrading to Level 1 is permitted precisely
because structured search returns real registry data rather than invented text.

---

## 9. Query routing

| Class | Example | Knowledge used | Grounding |
|-------|---------|----------------|-----------|
| **CogniX-only** | *How does Decision Gap work?* | Internal Atlas knowledge only | No |
| **Comparative** | *How is Decision Gap different from conventional planning systems?* | Internal knowledge + external market research | Yes, external half only |
| **Market research** | *What recent research exists on intent signals in retail forecasting?* | Grounded web evidence, framed with CogniX context | Yes |
| **Demonstration** | *How should I demonstrate the Demand Decision Frontier?* | Governed Demo Path, Questions Worth Asking, warnings | No |
| **Client preparation** | *Prepare me for a meeting with…* | Governed knowledge + optional market evidence | Optional |

A CogniX-only question is never answered from the web, however thin retrieval is — it returns what is
governed plus an honest gap statement. Comparative answers keep the internal and external halves
separately labelled and sourced. **Misclassification fails safe toward CogniX-only.** The classification
is returned in the response so the UI can show it and `ATL-07` can audit it.

---

## 10. Google AI and controlled grounding (`ATL-06`, ADR-048/049)

```text
User Question
     │
     ▼
Atlas AI Gateway ──► Query / Intent Classification
     │                          │
     ├──────────────────────────┴──────────────────────────┐
     ▼                                                     ▼
CogniX Knowledge Retrieval                        External Research
     │                                             (Google Search Grounding)
     └──────────────────────┬──────────────────────────────┘
                            ▼
                    Provider Reasoning (Gemini adapter)
                            │
                            ▼
                  Grounded Atlas Response
                  ┌─────────┴──────────┐
            CogniX Evidence        Web Sources
```

Controls: grounding is server-side only and gated per intent class, never global · every external claim
returns with source, publisher and retrieval date or is dropped · responses separate **From CogniX** /
**Market Context** / **AI Interpretation** structurally and visually · market evidence is cached with
its provenance under the freshness windows in `CAPABILITY_KNOWLEDGE_MODEL.md` §7.3 · a trusted-source
policy governs citable domains, recorded at `ATL-06` · disabling grounding leaves every Atlas surface
functional on internal knowledge.

---

## 11. Evaluation

`ATL-05` and `ATL-06` each ship an evaluation suite run by the estate's test convention.

| Test | Asserts |
|------|---------|
| Citation coverage | Every CogniX-fact sentence carries a resolvable capability citation |
| Guardrail | A question about a non-existent capability yields a declared gap, not an invention |
| Degradation | With no provider key, every AI surface degrades to Level 1 and says so; no generated fallback |
| Class separation | Responses with external evidence keep the three classes distinct |
| Provenance | No external claim renders without source, publisher and retrieval date |
| Provider swap | Replacing the adapter changes no retrieval, record or UI behaviour |
| Routing | Each intent class routes per §9; misclassification fails safe |
| Client-prep completeness | All required sections present; warnings non-empty when a non-implemented capability is recommended |
| Egress | No external network call from any `ATL-05` path |

---

## 12. Constraints inherited from the estate

| Constraint | Source | Implication for the Atlas |
|------------|--------|---------------------------|
| Next.js App Router, React 19, TypeScript; **this Next.js differs from common training data** | `package.json`, `AGENTS.md` | Read `node_modules/next/dist/docs/` before writing route or component code in `ATL-02`+ |
| Contracts live in `packages/contracts` | repository layout | Atlas contract types follow that convention |
| Tests are standalone runners under `tests/unit/run-*-tests.ts` (25 present) | repository layout | Atlas suites follow the same convention and baseline-matching discipline |
| No database anywhere in the estate | `config/`, `data/` | Reinforces §2.2 |
| Provider key resolved server-side only, never committed | ADR-044, `lib/gemini.ts` | The Atlas gateway must not weaken it |
| Deployment is a containerised monolith behind nginx, CI via `.gitlab-ci.yml` | `docker-compose*.yml`, `ops/` | The Atlas ships in the same container; no new service without an ADR |
| Light executive surface; never dark-mode | `UX_DESIGN_PRINCIPLES.md` §1 | Atlas UX inherits it — see §6 of that document |
