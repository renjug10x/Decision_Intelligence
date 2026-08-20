# CogniX Capability Atlas — Programme Charter & Execution Plan

**Document type:** Programme governance (authoritative for the Atlas workstream)
**Workstream namespace:** `CAT-01` … `CAT-07`
**Relationship to `PLAN.md`:** parallel, independently scheduled. See [Separation from existing CogniX work](#12-separation-from-existing-cognix-work).

---

## 0. Programme status board

> **This table is the single authoritative answer to "where does the Capability Atlas stand?".**
> Any agent or developer completing a work package MUST update this table with factual results
> and nothing else. Do not mark a phase complete without the completion evidence recorded in §10.

| Phase | Name | Status | Completed on | Evidence |
|-------|------|--------|--------------|----------|
| — | Programme governance (this document set) | **COMPLETE** | 2026-08-20 | This document, `CAPABILITY_KNOWLEDGE_MODEL.md`, `CAPABILITY_ATLAS_ARCHITECTURE.md`, `CAPABILITY_ATLAS_CONTENT_STANDARD.md`, `CAPABILITY_ATLAS_SEARCH_AND_AI_MODEL.md`, `CAPABILITY_ATLAS_UX_SPEC.md`, `ARCHITECTURE_DECISIONS.md` (ADR-0001…ADR-0009), `PLAN.md` §11 |
| CAT-01 | Capability Discovery, Governance & Information Model | **NOT STARTED** | — | — |
| CAT-02 | Capability Knowledge Backend | **NOT STARTED** | — | — |
| CAT-03 | Retail & Grocery Knowledge Population | **NOT STARTED** | — | — |
| CAT-04 | Atlas UX & Structured Search | **NOT STARTED** | — | — |
| CAT-05 | Internal AI Retrieval & Ask CogniX | **NOT STARTED** | — | — |
| CAT-06 | Google AI, Search Grounding & Market Intelligence | **NOT STARTED** | — | — |
| CAT-07 | Capability Lifecycle Governance & Automation | **NOT STARTED** | — | — |

**Current phase:** CAT-01 (not yet started)
**Last completed work package:** NONE (programme governance is established; no CAT phase has been executed)
**Next executable work package:** **CAT-01**
**Blocked by other CogniX work:** NO

Status vocabulary (use exactly these): `NOT STARTED` · `IN PROGRESS` · `BLOCKED` · `COMPLETE`.

### 0.1 Documents referenced but not yet created

These are **forward references**, not broken links. They are outputs of work packages not yet
executed; every document in this set that mentions them does so as a specification of what will exist.

| Document | Created by | Purpose |
|----------|-----------|---------|
| `CAPABILITY_INVENTORY.md` | CAT-01 | Forensic, evidence-cited inventory of actual capabilities |
| `CAPABILITY_TAXONOMY.md` | CAT-01 | Closed vocabularies: domains, sub-domains, business problems, personas, tags |
| `STORYBOARD_MIGRATION_ASSESSMENT.md` | CAT-01 | Per-slide storyboard audit and SB-GATE checklist |

---

## 1. What the Capability Atlas is

> **The CogniX Capability Atlas is the governed knowledge, discovery, explanation and enablement layer for the CogniX Innovation Lab.**

Positioning line for product surfaces:

> *Explore what CogniX can do, how capabilities work, where they apply, how to demonstrate them, and how they can be reused.*

The Atlas is **not** a replacement About page. The About section is only the first *surface* through
which the Atlas is exposed. The underlying capability knowledge model is a first-class asset that must
be able to serve, from one authoritative source:

- Innovation Executives
- Sales and client-facing teams
- Solution Architects
- Enterprise Architects
- Developers
- Test engineers
- Product and Innovation teams
- Future AI assistants and autonomous agents

Terminology note: "Feature Catalogue" is a *narrower* concept and is used in this document set only
when contrasting terminology. The product name is **CogniX Capability Atlas**.

### 1.1 Naming reconciliation (important, read before CAT-01)

At the time this governance was written the repository contains **no occurrence of the string
"CogniX"** in code, data or documentation. The application in this repository is named
*Lidl UK Decision Intelligence POC* (`package.json` → `lidl-decision-poc`) and `PLAN.md` describes it
as such.

Therefore:

- **CogniX** is the platform / Innovation Lab identity that this programme introduces at the
  governance layer. The Atlas is the first artefact to carry the name.
- **Renaming the application, its UI, its packages or `PLAN.md` Phases 1–15 to "CogniX" is explicitly
  out of scope** for CAT-01…CAT-07. If a rename is ever wanted it must be raised as its own work
  package outside the Atlas namespace.
- Where Atlas documents say "CogniX capability", they mean *a capability of the decision-intelligence
  platform demonstrated by this repository*, whatever the shipped product name is at the time.
- Capability names used illustratively in early programme discussion — *Demand Fusion*, *Decision Gap*,
  *Forecast Regret*, *Signal Intelligence*, *Decision Consequence* — **do not exist in this repository
  today**. They are candidate/aspirational names only. CAT-01 and CAT-03 must inventory what is
  actually implemented (see Appendix A) and must never publish a capability record for something that
  does not exist. See `CAPABILITY_ATLAS_CONTENT_STANDARD.md` §2 (Truthfulness gate).

---

## 2. Information architecture

The Atlas organises knowledge primarily as:

```text
Domain → Business Problem → Capability → Feature / Experiment → Evidence / Artefacts
```

Domains are data, not code branches. The initial populated domain is **Retail & Grocery**. Candidate
future domains include Manufacturing, Financial Services, Healthcare, Travel & Hospitality, and
Supply Chain / Logistics.

A capability may sit in one or more domain contexts *and* be classified as a reusable CogniX platform
capability:

```text
<Reusable capability>
    ├── Retail & Grocery
    ├── Manufacturing
    ├── Hospitality
    └── Logistics

Classification:
Reusable Platform Capability
```

**Architectural constraint:** nothing in the schema, storage, API or UI may hard-code Retail & Grocery
as the only domain, even though it is the only populated domain at CAT-03. See ADR-0003.

Full schema, maturity model, audience lenses, Demo Path and Questions Worth Asking:
→ `CAPABILITY_KNOWLEDGE_MODEL.md`

---

## 3. Architectural principles the programme must uphold

These are binding on every CAT phase. Each has a corresponding ADR in `ARCHITECTURE_DECISIONS.md`.

| # | Principle | ADR |
|---|-----------|-----|
| P1 | The Atlas is the authoritative capability knowledge layer for CogniX. | ADR-0001 |
| P2 | Capability content is served through backend contracts. Static JSX/HTML is never the source of truth. | ADR-0002 |
| P3 | The capability model is domain-independent; domains are data. | ADR-0003 |
| P4 | Internal CogniX truth and external market research are separated, labelled and separately sourced. | ADR-0004 |
| P5 | AI providers sit behind a CogniX-owned gateway abstraction; no provider SDK is called from the browser. | ADR-0005 |
| P6 | External web grounding is controlled, server-side, and always carries provenance. | ADR-0006 |
| P7 | Every published claim carries provenance and a review date. | ADR-0007 |
| P8 | Search evolves progressively: structured → semantic → Ask CogniX. Level 1 must stand alone. | ADR-0008 |
| P9 | The Architectural Storyboard is retired only through a preservation gate. | ADR-0009 |

Architecture detail (backend shape, API surface, storage, storyboard migration):
→ `CAPABILITY_ATLAS_ARCHITECTURE.md`
Search, semantic retrieval, Gemini, grounding, query routing, "Prepare me for a client conversation":
→ `CAPABILITY_ATLAS_SEARCH_AND_AI_MODEL.md`
Content, evidence and market-intelligence standards:
→ `CAPABILITY_ATLAS_CONTENT_STANDARD.md`
UX structure, progressive disclosure, search-first landing:
→ `CAPABILITY_ATLAS_UX_SPEC.md`

---

## 4. Programme phase map

```text
CAT-01  Capability Discovery, Governance & Information Model      (no runtime code)
   │
   ├──────────────► CAT-02  Capability Knowledge Backend
   │                   │
   │                   ├──────────► CAT-03  Retail & Grocery Knowledge Population
   │                   │                │
   │                   └────────────────┴────► CAT-04  Atlas UX & Structured Search
   │                                              │
   │                                              ├────► CAT-05  Internal AI Retrieval & Ask CogniX
   │                                              │          │
   │                                              │          └────► CAT-06  Google AI, Grounding &
   │                                              │                          Market Intelligence
   │                                              │                          (incl. "Prepare me for a
   │                                              │                           client conversation")
   │                                              │
   └──────────────────────────────────────────────┴────► CAT-07  Lifecycle Governance & Automation
```

Hard dependency edges: `CAT-01 → CAT-02 → CAT-03`, `CAT-02 + CAT-03 → CAT-04`, `CAT-04 → CAT-05 → CAT-06`.
`CAT-07` requires `CAT-02` and `CAT-03`; it may begin in parallel with `CAT-05`/`CAT-06`.

---

## 5. Work package contract

Every CAT phase below is specified with the same fifteen fields. A phase may only be executed by an
agent or developer who can satisfy **Prerequisites** from repository state alone.

`Purpose` · `Prerequisites` · `Dependencies` · `Inputs` · `Outputs` · `Files likely to change` ·
`Acceptance criteria` · `Verification commands` · `Completion evidence` · `Handoff notes` ·
`Next work package` · `Implementation allowed` · `Commit/push permitted` · `Risks` ·
`Decisions still outstanding`

---

## 6. CAT-01 — Capability Discovery, Governance & Information Model

**Purpose**
Establish the authoritative Atlas foundation: a forensic, evidence-reconciled inventory of what this
repository actually does, plus the finalised taxonomy, schema instance decisions and migration
assessment needed before any backend is built.

**Prerequisites**
- This document set exists and is readable (it does).
- Repository working tree clean or with only intentional local work.
- Read access to `app/`, `components/`, `lib/`, `data/`, `scripts/`, `PLAN.md`, and git history.

**Dependencies** — none. CAT-01 is the entry point of the programme.

**Inputs**
- `CAPABILITY_KNOWLEDGE_MODEL.md` (schema and maturity model to be instantiated)
- `CAPABILITY_ATLAS_CONTENT_STANDARD.md` (evidence rules)
- Appendix A of this document (provisional inventory — to be verified, not trusted)
- The repository implementation itself: routes (`app/api/*`), UI components (`components/*`),
  domain logic (`lib/query-engine.ts`, `lib/semantic-layer.ts`, `lib/gemini.ts`, `lib/context.tsx`),
  seed data (`data/*.json`), deployment (`Dockerfile`, `docker-compose*.yml`, `nginx/`, `deploy.sh`,
  `scripts/smoke-test.sh`), `PLAN.md`, and git history where a claim cannot be settled from the
  current tree.

**Outputs** (documentation only)
1. `CAPABILITY_INVENTORY.md` — the forensic inventory. One row per candidate capability with: name,
   slug, evidence file paths and line references, implementation status
   (`implemented` / `partially-implemented` / `simulated` / `experimental` / `roadmap`), domain(s),
   platform-reuse classification, proposed maturity level, and any contradiction found between
   `PLAN.md` and the code.
2. `CAPABILITY_TAXONOMY.md` — final domain / sub-domain / business-problem / persona vocabularies,
   and the controlled tag list.
3. `STORYBOARD_MIGRATION_ASSESSMENT.md` — per-slide audit of `components/ArchitectureExplorer.tsx`
   (14 slides) and the three `components/Help.tsx` tabs, recording for each unit of architectural
   knowledge: what it communicates, whether it must be retained, and its target destination
   (capability record field, platform architecture doc, domain architecture doc, diagram, or ADR).
   This document is the evidence base for gate **SB-GATE** in §11.
4. Updates to this file: §0 status board, and Appendix A replaced by a pointer to
   `CAPABILITY_INVENTORY.md`.
5. Any schema amendments agreed during inventory, applied to `CAPABILITY_KNOWLEDGE_MODEL.md` with a
   changelog entry.

**Files likely to change**
`CAPABILITY_INVENTORY.md` (new), `CAPABILITY_TAXONOMY.md` (new),
`STORYBOARD_MIGRATION_ASSESSMENT.md` (new), `COGNIX_CAPABILITY_ATLAS.md`,
`CAPABILITY_KNOWLEDGE_MODEL.md`, `PLAN.md` (§11 status line only).

**Acceptance criteria**
- [ ] Every capability row cites at least one concrete file path; rows with no code evidence are
      classified `roadmap` and explicitly marked "documentation-only claim".
- [ ] Every screen reachable from `app/page.tsx`'s `renderPage()` switch and every route under
      `app/api/` appears in the inventory or is explicitly listed as deliberately excluded.
- [ ] Each capability's data source is recorded as *live query engine*, *in-component static data*,
      *AI-generated with deterministic fallback*, or *narrative only*.
- [ ] Contradictions between `PLAN.md` and the implementation are listed, not silently resolved.
      (Known example to verify: `PLAN.md` Phase 5 "Labour Optimisation Screen" — no
      `components/LabourOptimisation.tsx` exists; only an anomaly branch in `lib/query-engine.ts`.)
- [ ] Taxonomy contains no Retail-only assumptions in its structure.
- [ ] Every one of the 14 storyboard slides is audited with a retain/discard decision and destination.
- [ ] The programme status board in §0 is updated.

**Verification commands**
```bash
git diff --check
git status --porcelain
grep -rn "case '" app/page.tsx | head -20          # cross-check screen coverage
ls app/api/*/route.ts                               # cross-check API coverage
grep -c "title: '" components/ArchitectureExplorer.tsx   # slide count cross-check
```
No application build is required: CAT-01 changes no runtime code.

**Completion evidence**
The three new documents exist, §0 shows CAT-01 `COMPLETE` with a date, and the inventory row count is
recorded in the handoff note.

**Handoff notes**
Record, in §0 and at the end of `CAPABILITY_INVENTORY.md`: number of capabilities inventoried, number
classified `implemented`, number `simulated`, number of `PLAN.md` contradictions found, and any schema
field added or removed.

**Next work package** — CAT-02.

**Implementation allowed** — **NO.** CAT-01 is documentation and analysis only. The only permitted
code change is a trivial, non-functional correction required by a governance validation (for example
a broken relative link inside a Markdown file). Any such change must be called out explicitly.

**Commit/push permitted** — Yes, on the designated branch, when the work package completes.

**Risks**
- Inventory drifts toward documentation-led claims rather than code-led evidence. Mitigation: the
  file-path citation rule above is a hard acceptance criterion.
- Storyboard audit is expensive (`components/ArchitectureExplorer.tsx` is ~2,300 lines). Mitigation:
  audit at slide granularity using the `SlideData` fields, not line-by-line.

**Decisions still outstanding**
- Whether the Atlas ships under the *CogniX* name in the UI or under the current product name (§1.1).
- Final controlled tag vocabulary size.

---

## 7. CAT-02 — Capability Knowledge Backend

**Purpose**
Build the governed backend and data contracts so that capability knowledge is served from a
version-controlled store through APIs, never from the presentation layer.

**Prerequisites**
- CAT-01 `COMPLETE` in §0.
- `CAPABILITY_INVENTORY.md` and `CAPABILITY_TAXONOMY.md` exist.
- Schema in `CAPABILITY_KNOWLEDGE_MODEL.md` is final for v1 (any CAT-01 amendments applied).

**Dependencies** — CAT-01.

**Inputs** — the finalised schema, taxonomy, and `CAPABILITY_ATLAS_ARCHITECTURE.md` §3–§6.

**Outputs**
- Canonical capability type definitions and a validator implementing the mandatory/recommended/optional
  tiers and validation rules from `CAPABILITY_KNOWLEDGE_MODEL.md` §5–§6.
- A capability repository abstraction over the chosen store (file-backed, version-controlled records —
  see `CAPABILITY_ATLAS_ARCHITECTURE.md` §4; a database is explicitly *not* mandated at this phase).
- Read APIs per `CAPABILITY_ATLAS_ARCHITECTURE.md` §5, with filtering support.
- Versioning, provenance and `reviewedAt` handling.
- Seed/migration strategy from CAT-01's inventory into record stubs.
- A test harness and unit tests for validation, filtering and relationship integrity.

**Files likely to change**
New: `lib/atlas/*` (types, validator, repository, search), `app/api/v1/atlas/*/route.ts`,
`content/atlas/**` (or the location chosen in `CAPABILITY_ATLAS_ARCHITECTURE.md` §4), test files,
`package.json` (test runner — see outstanding decisions).
Updated: this file §0, `CAPABILITY_ATLAS_ARCHITECTURE.md` (record the decisions actually taken).

**Acceptance criteria**
- [ ] No capability text is stored in a React component; components read from the API only.
- [ ] The validator rejects a record missing any mandatory field and reports the field names.
- [ ] Every API in `CAPABILITY_ATLAS_ARCHITECTURE.md` §5 marked *CAT-02* returns a documented,
      typed response shape.
- [ ] Filtering works for domain, sub-domain, business problem, persona, maturity, platform-reusable,
      demo readiness, tags and cross-domain applicability.
- [ ] Relationship references (`relatedCapabilities`, `relatedExperiments`) are integrity-checked;
      a dangling reference fails validation.
- [ ] Tests pass and the production build succeeds.

**Verification commands**
```bash
npm ci
npx tsc --noEmit
npm test                # test runner introduced by this WP
npm run build
git diff --check
```

**Completion evidence** — passing test output, build output, and the list of live API paths recorded
in §0's evidence column.

**Handoff notes** — record the persistence choice actually implemented, the record file layout, and
the exact command to validate all records.

**Next work package** — CAT-03.

**Implementation allowed** — YES (backend and contracts only; no Atlas UI).

**Commit/push permitted** — Yes, on the designated branch.

**Risks**
- Over-engineering persistence. Mitigation: ADR-0002 permits the simplest version-controlled store
  that satisfies the contracts; escalate to a database only with a new ADR.
- The repository currently has **no test runner and no lint script** (`package.json` defines only
  `dev`, `build`, `start`). Introducing one is in scope for CAT-02 and must be recorded.

**Decisions still outstanding**
- Test runner selection (and whether it becomes the repository-wide standard).
- Whether capability records are authored as Markdown-with-front-matter or as structured data files.

---

## 8. CAT-03 — Retail & Grocery Knowledge Population

**Purpose**
Create comprehensive, evidence-checked governed records for every current Retail & Grocery capability
identified in CAT-01.

**Prerequisites** — CAT-01 and CAT-02 `COMPLETE`; validator and repository available.

**Dependencies** — CAT-02 (contracts), CAT-01 (inventory).

**Inputs** — `CAPABILITY_INVENTORY.md`, `CAPABILITY_ATLAS_CONTENT_STANDARD.md`, the implementation.

**Outputs**
- One validated capability record per inventoried capability, covering description, innovation thesis,
  usage, testing, architecture, design, use cases, benefits, differentiation, demo guidance, market
  context, evidence, platform reuse, limitations and related capabilities — to the completeness tier
  the capability's maturity requires (`CAPABILITY_KNOWLEDGE_MODEL.md` §7).
- Demo Path content (3-minute / 10-minute / technical deep dive / executive discussion) for every
  record marked demo-ready.
- Questions Worth Asking for every record where the capability supports enquiry.
- A population report listing records by implementation status.

**Files likely to change** — `content/atlas/**` (records), `CAPABILITY_INVENTORY.md` (status sync),
this file §0.

**Acceptance criteria**
- [ ] Every record passes the CAT-02 validator.
- [ ] Every capability claim is traceable to a file path, a test, or is explicitly labelled
      `simulated`, `experimental` or `roadmap`. No record claims a capability that does not exist.
- [ ] Records distinguish *implemented*, *partially implemented*, *simulated*, *experimental* and
      *roadmap* at field level, not only at record level.
- [ ] Every market claim satisfies `CAPABILITY_ATLAS_CONTENT_STANDARD.md` §5 (no generic claims;
      source, publisher and date recorded).
- [ ] Cross-domain applicability is stated for each capability, including "Retail & Grocery only —
      no reuse assessed yet" where that is the honest answer.

**Verification commands**
```bash
npm test
npm run build
git diff --check
```

**Completion evidence** — validator output showing all records valid, plus the population report.

**Handoff notes** — record counts per implementation status and per maturity level; list capabilities
deliberately not populated and why.

**Next work package** — CAT-04.

**Implementation allowed** — YES (content and record authoring; no Atlas UI).

**Commit/push permitted** — Yes.

**Risks**
- Marketing drift: records over-claiming maturity. Mitigation: the truthfulness gate is an acceptance
  criterion and CAT-07 automates it later.

**Decisions still outstanding** — capability ownership assignment (`owner` field values).

---

## 9. CAT-04 — Atlas UX & Structured Search

**Purpose**
Deliver the Atlas user experience — search-first landing, domain browse, capability detail with
audience lenses — and, once the preservation gate is met, replace the About-page Architectural
Storyboard surface with the Atlas.

**Prerequisites** — CAT-02 and CAT-03 `COMPLETE`; `CAPABILITY_ATLAS_UX_SPEC.md` reviewed.

**Dependencies** — CAT-02 (APIs), CAT-03 (content). **SB-GATE** (§11) governs storyboard removal only,
not the rest of this phase.

**Inputs** — `CAPABILITY_ATLAS_UX_SPEC.md`, `CAPABILITY_ATLAS_SEARCH_AND_AI_MODEL.md` §2 (Level 1),
`STORYBOARD_MIGRATION_ASSESSMENT.md`.

**Outputs**
- Domain landing experience with search as the primary affordance.
- Capability cards and capability detail pages following the progressive-disclosure order in
  `CAPABILITY_ATLAS_UX_SPEC.md` §3.
- Level 1 structured search with the filter set in `CAPABILITY_ATLAS_SEARCH_AND_AI_MODEL.md` §2.2.
- Audience lens switching (Innovation Executive / Sales / Architect / Developer) that reprioritises
  presentation of one source record.
- Capability relationship view, maturity badges, platform-capability indicators, Demo Path and
  Questions Worth Asking surfaces.
- Responsive layout.

**Files likely to change** — new `components/atlas/*`, routing entry in `app/page.tsx` and
`components/Sidebar.tsx` / `components/Help.tsx` as appropriate, `app/globals.css`.

**Acceptance criteria**
- [ ] All capability text rendered by the UI originates from an Atlas API response. A grep for
      capability prose inside `components/atlas/*` finds only labels, not capability content.
- [ ] Search returns deterministic results without any AI provider configured.
- [ ] Audience lenses change ordering, emphasis and disclosure only — there is exactly one stored
      record per capability, and switching lens issues no separate content fetch of a different record.
- [ ] The landing experience presents search above any capability list.
- [ ] Keyboard and screen-reader access for search, filters and lens switching.
- [ ] `components/ArchitectureExplorer.tsx` is **not** deleted unless SB-GATE (§11) passes in the same
      work package, with the gate checklist ticked in `STORYBOARD_MIGRATION_ASSESSMENT.md`.

**Verification commands**
```bash
npx tsc --noEmit
npm test
npm run build
git diff --check
```

**Completion evidence** — build output, screenshots or a described walkthrough of the landing, search,
detail and lens switching, and the SB-GATE checklist state.

**Handoff notes** — state explicitly whether the storyboard was retired or retained, and why.

**Next work package** — CAT-05.

**Implementation allowed** — YES.

**Commit/push permitted** — Yes.

**Risks**
- Storyboard removal before knowledge preservation. Mitigation: SB-GATE, ADR-0009.
- UX drifting into a documentation wall. Mitigation: `CAPABILITY_ATLAS_UX_SPEC.md` §2 anti-patterns.

**Decisions still outstanding** — whether the Atlas becomes a top-level navigation item or remains
inside the Help/About surface.

---

## 10. CAT-05 — Internal AI Retrieval & Ask CogniX

**Purpose**
Add AI-assisted explanation over *governed internal* capability knowledge, with citations, without
introducing any external web research.

**Prerequisites** — CAT-04 `COMPLETE`; Level 1 search working; records populated.

**Dependencies** — CAT-02, CAT-03, CAT-04.

**Inputs** — `CAPABILITY_ATLAS_SEARCH_AND_AI_MODEL.md` §3–§5.

**Outputs**
- Semantic retrieval over Atlas records (Level 2).
- Internal RAG pipeline and the Atlas AI gateway (server-side, provider-abstracted, ADR-0005).
- Query routing for CogniX-only and demonstration intents.
- Grounded answers with per-claim citations back to capability records.
- Audience-sensitive explanation.
- Guardrails preventing unsupported product claims.
- Evaluation tests: a fixed question set with expected-citation assertions.

**Files likely to change** — `lib/atlas/ai/*`, `app/api/v1/atlas/ask/route.ts`,
`components/atlas/*` (Ask surface), evaluation fixtures.

**Acceptance criteria**
- [ ] No AI provider SDK is imported in any client component; all provider calls are server-side.
- [ ] Every answer sentence that asserts a CogniX capability fact carries a citation to a record id.
- [ ] With no provider key configured, the Ask surface degrades to Level 1 structured search results
      and says so — it never fabricates.
- [ ] A guardrail test proves the system declines to assert a capability absent from the Atlas.
- [ ] External web access is **not** used anywhere in this phase.

**Verification commands**
```bash
npx tsc --noEmit
npm test                 # includes AI evaluation suite
npm run build
git diff --check
```

**Completion evidence** — evaluation suite results including the guardrail and no-key degradation
cases.

**Handoff notes** — record the embedding/retrieval approach chosen and where the index lives.

**Next work package** — CAT-06.

**Implementation allowed** — YES.

**Commit/push permitted** — Yes.

**Risks**
- Ungrounded generation. Mitigation: citation-required guardrail as an acceptance criterion.
- Key handling. The repository's existing convention is a session-supplied key never committed
  (`PLAN.md` §8); the Atlas gateway must not weaken it.

**Decisions still outstanding** — embedding provider and whether the index is committed or built.

---

## 11. CAT-06 — Google AI, Search Grounding & Market Intelligence

**Purpose**
Add controlled external reasoning and current market research behind the CogniX backend, and deliver
**"Prepare me for a client conversation"**.

**Prerequisites** — CAT-05 `COMPLETE`; internal grounding and citations proven.

**Dependencies** — CAT-05 (gateway, retrieval, guardrails), CAT-03 (market context fields populated).

**Inputs** — `CAPABILITY_ATLAS_SEARCH_AND_AI_MODEL.md` §6–§8,
`CAPABILITY_ATLAS_CONTENT_STANDARD.md` §4–§5.

**Outputs**
- Gemini integration behind the Atlas AI gateway, provider-abstracted (ADR-0005).
- Google Search grounding, server-side only (ADR-0006).
- Market research retrieval with source provenance.
- Strict internal/external evidence separation in every response
  (`From CogniX` · `Market Context` · `AI Interpretation`).
- Comparative and market-research query routes.
- Confidence and evidence controls; caching and cost controls.
- **"Prepare me for a client conversation"** producing the full preparation pack specified in
  `CAPABILITY_ATLAS_SEARCH_AND_AI_MODEL.md` §8.

**Files likely to change** — `lib/atlas/ai/*` (provider adapters, grounding), new API route for
client-preparation, `components/atlas/*`, caching layer.

**Acceptance criteria**
- [ ] No browser-side call to any Gemini or Google Search endpoint.
- [ ] Every external claim renders with source URL, publisher and retrieval date; a claim without
      provenance is not rendered.
- [ ] Response sections are visually and structurally separated into the three evidence classes.
- [ ] Swapping the provider adapter requires no change to Atlas retrieval, records or UI — proven by
      a second adapter or a fake adapter in tests.
- [ ] "Prepare me for a client conversation" returns all required sections, including demo
      warnings/limitations for any experimental, simulated or roadmap capability it recommends.
- [ ] With grounding disabled or unavailable, the feature still returns an internal-only pack and
      labels the absent market section.

**Verification commands**
```bash
npx tsc --noEmit
npm test
npm run build
git diff --check
```

**Completion evidence** — a recorded example preparation pack with visible provenance, plus the
provider-swap test.

**Handoff notes** — record the caching policy, cost controls and the trusted-source policy applied.

**Next work package** — CAT-07.

**Implementation allowed** — YES.

**Commit/push permitted** — Yes.

**Risks**
- External research silently redefining CogniX capabilities. Mitigation: ADR-0004 and the separation
  acceptance criterion.
- Cost. Mitigation: caching and evidence-freshness windows.

**Decisions still outstanding** — trusted-domain allowlist policy; cache TTL for market evidence.

---

### 11.1 Architectural Storyboard retirement gate (SB-GATE)

`components/ArchitectureExplorer.tsx` (14 slides) and the three tabs in `components/Help.tsx`
currently carry real architectural knowledge. They **must not be deleted or disabled during CAT-01**,
and may only be retired when **every** item below is true and ticked in
`STORYBOARD_MIGRATION_ASSESSMENT.md`:

- [ ] **SB-GATE-1** — Every slide has been audited and each unit of knowledge has a recorded
      retain/discard decision (CAT-01 output).
- [ ] **SB-GATE-2** — All retained knowledge exists in its destination: a capability record field,
      platform architecture documentation, domain architecture documentation, a diagram, or an ADR.
- [ ] **SB-GATE-3** — The destinations are reachable from the Atlas UI or from repository governance
      documentation, not only from a file.
- [ ] **SB-GATE-4** — Persona journeys, the enterprise blueprint, the recommendation lifecycle, the
      governance/trust narrative and the "why the AI is constrained" narrative each have an
      identified successor surface.
- [ ] **SB-GATE-5** — Presenter notes and demo timings are preserved in Demo Path content.
- [ ] **SB-GATE-6** — Removal is proposed in a work package that also states what replaces the
      navigation entry.

Until SB-GATE passes, the storyboard stays. See ADR-0009.

---

## 12. CAT-07 — Capability Lifecycle Governance & Automation

**Purpose**
Turn the Atlas into a living capability-governance system that keeps itself honest.

**Prerequisites** — CAT-02 and CAT-03 `COMPLETE`. May run in parallel with CAT-05/CAT-06.

**Dependencies** — CAT-02 (validator, repository), CAT-03 (records to govern).

**Inputs** — `CAPABILITY_KNOWLEDGE_MODEL.md` §7–§8, `CAPABILITY_ATLAS_CONTENT_STANDARD.md` §6.

**Outputs**
- Capability registration step in the feature-development workflow.
- Documentation completeness checks and a completeness/quality score per record.
- Architecture evidence checks and automated test linkage.
- Demo-readiness checks.
- Market-evidence freshness and stale-content detection.
- Source-code change detection against `sourceCodeReferences`.
- Review dates, lifecycle transitions and ownership enforcement.
- Automated Atlas publication gates.

**Files likely to change** — `scripts/atlas-*`, CI configuration, `lib/atlas/governance/*`,
`CAPABILITY_KNOWLEDGE_MODEL.md` (scoring definition).

**Acceptance criteria**
- [ ] A record whose referenced source files have changed since `reviewedAt` is flagged automatically.
- [ ] A record failing its maturity tier's completeness requirement cannot be published.
- [ ] Market evidence past its freshness window is flagged, not silently served.
- [ ] The checks run from a single documented command and are wired into CI if CI exists.

**Verification commands**
```bash
npm test
node scripts/atlas-governance-check.mjs      # exact name recorded at completion
npm run build
git diff --check
```

**Completion evidence** — a governance report over the full record set showing scores and flags.

**Handoff notes** — record which checks are advisory and which are blocking.

**Next work package** — NONE. The Atlas programme is complete; subsequent work is ordinary capability
maintenance under the governance this phase installs.

**Implementation allowed** — YES.

**Commit/push permitted** — Yes.

**Risks** — governance automation that blocks contributors. Mitigation: introduce checks advisory
first, then blocking.

**Decisions still outstanding** — whether the repository adopts CI (none is configured today).

**Longer-term principle**

> A CogniX capability is not complete merely because code exists. It must also be explainable,
> testable, demonstrable, architecturally traceable and governed.

---

## 13. Separation from existing CogniX work

> **The CogniX Capability Atlas is an independently scheduled workstream. Its existence does not
> supersede, close, reorder or implicitly deprioritise existing unfinished CogniX work packages.**

Concretely:

- `PLAN.md` Phases 1–15 keep their identifiers, sequence and status. The Atlas programme has **not**
  changed, completed, reordered or reinterpreted any of them.
- The Atlas uses the `CAT-nn` namespace precisely so it cannot collide with the existing `Phase N`
  numbering.
- Atlas work may proceed in parallel with any `PLAN.md` phase. No CAT phase depends on a `PLAN.md`
  phase completing, and no `PLAN.md` phase depends on a CAT phase.
- Observation recorded for accuracy, changing nothing: `PLAN.md` Phase 5 (Labour Optimisation Screen)
  has no corresponding component in the tree — `components/LabourOptimisation.tsx` does not exist and
  no `labour` route case exists in `app/page.tsx`; only an anomaly branch in `lib/query-engine.ts`
  (~line 386) refers to labour. This remains **existing unfinished non-Atlas work** and is *not*
  absorbed into the Atlas. CAT-01 must record it as a `PLAN.md`/implementation contradiction, not
  resolve it.
- No existing work item may be moved into the Atlas namespace, and no Atlas phase may be marked
  complete because an adjacent `PLAN.md` phase was completed.

---

## 14. How to Resume Capability Atlas Work

*This section exists so that a developer or AI coding agent with **no prior conversation history** can
determine the state of the programme and continue it safely.*

1. **Read this document** — start with §0 (status board), then §4 (phase map).
2. **Read the Atlas section in the Master Plan** — `PLAN.md` §11 — to confirm the programme is still
   registered as a parallel workstream and to see whether other CogniX work has changed.
3. **Determine completed CAT phases** from the §0 status board and verify each claimed completion
   against its *Completion evidence* field. Do not trust a status line with no evidence.
4. **Identify prerequisites** of the next `NOT STARTED` phase and confirm each one from repository
   state — not from memory or from this document's optimism.
5. **Verify repository continuity** before changing anything:
   ```bash
   git rev-parse --show-toplevel && git branch --show-current && git rev-parse HEAD
   git status --porcelain && git remote -v
   git fetch origin && git rev-list --left-right --count origin/main...HEAD
   ```
   Do not discard, squash or reorder unrelated local work.
6. **Execute only the requested CAT work package.** Respect its *Implementation allowed* field. Do not
   opportunistically start the next phase.
7. **Run the required validation** listed in that phase's *Verification commands*.
8. **Update governance with factual results** — the §0 status board, the phase's completion evidence,
   and any document the work package legitimately changes. Record what failed as well as what passed.
9. **Preserve separation from other CogniX tracks** — never alter `PLAN.md` Phases 1–15 statuses or
   identifiers as a side effect of Atlas work (§13).
10. **Leave a deterministic handoff** — fill in the phase's *Handoff notes* and set §0's
    "Next executable work package".

### 14.1 Example queries a future developer or agent can use verbatim

> Review CogniX governance and tell me the exact current status of the Capability Atlas programme. Do not modify code.

> Identify the next executable Capability Atlas work package and its prerequisites. Do not start implementation.

> Execute CAT-01 only according to the Master Plan and Atlas governance. Do not perform CAT-02 or unrelated CogniX work.

> Execute the next incomplete work package within CAT-04 only. Preserve all other unfinished CogniX workstreams.

> Audit whether CAT-05 acceptance criteria are fully satisfied and report evidence. Do not advance the programme unless all gates pass.

> Confirm the Architectural Storyboard retirement gate (SB-GATE) status and list which gate items are still open.

---

## 15. Definition of programme success

When CAT-01…CAT-07 are complete, a user must be able to answer all of the following from the Atlas
alone:

What capabilities does CogniX currently have? · Which are available in Retail & Grocery? · Which are
reusable platform capabilities? · What business problem does this capability solve? · How do I use it?
· How do I test it? · How do I demonstrate it? · How does it work technically? · Which services and
APIs support it? · What evidence proves it works? · What are its limitations? · What similar approaches
exist in the market? · What makes CogniX different? · Where else could this capability be applied? ·
Which capability should I show a specific client? · What should I say during the demonstration? · What
questions should I ask the client? · What questions might the client ask me? · What is experimental
versus proven? · What is the next Atlas work package?

---

## Appendix A — Provisional capability inventory (pre-CAT-01)

**Status: provisional.** Compiled from direct inspection of the tree at commit `dea39ba` to make the
plan concrete. It is **not** the CAT-01 forensic inventory and must be verified, corrected and
superseded by `CAPABILITY_INVENTORY.md`. Domain for all rows: Retail & Grocery, unless noted.

| # | Candidate capability | Primary evidence | Data source | Provisional status |
|---|----------------------|------------------|-------------|--------------------|
| 1 | Decision priority ranking ("Today's Priorities") | `components/TodayPriorities.tsx`, `app/page.tsx` case `dashboard` | `/api/data?type=dashboard` | implemented |
| 2 | Natural-language querying (Store Ops Copilot) | `components/StoreCopilot.tsx`, `app/api/ask/route.ts`, `lib/gemini.ts` `askNLQ` | live query engine + Gemini, deterministic `mockAskNLQ` fallback | partially implemented |
| 3 | Category / trading intelligence | `components/CategoryIntelligence.tsx`, `lib/query-engine.ts` `getUnderperformingSkus`, `getCategoryPerformance` | `/api/data?type=category` | implemented |
| 4 | Supply chain radar | `components/SupplyChainRadar.tsx`, `getSupplyChainAlerts`, `getSupplyTimeline` | `/api/data?type=supply` | implemented |
| 5 | Waste intelligence | `components/WasteIntelligence.tsx` | in-component static data (`WASTE_DRIVERS`, `TOP_WASTE_STORES`, `CATEGORY_WASTE`) | simulated |
| 6 | Availability intelligence | `components/AvailabilityIntelligence.tsx` | in-component static data (`STOCKOUT_EVENTS`, `AFFECTED_STORES`) | simulated |
| 7 | Promotion planning / simulation | `components/PromotionPlanner.tsx` | local simulation + `/api/ask` | partially implemented |
| 8 | Forecast projection ("Forward View") | `components/Forecasting.tsx`, `getForecastProjections` (model, horizon, promo lift, cannibalisation, event boost) | `/api/data?type=forecast` | implemented |
| 9 | Executive briefing generation | `components/BriefingCentre.tsx`, `app/api/briefing/route.ts`, `generateBriefing` | live query engine + Gemini, deterministic `mockBriefing` fallback | partially implemented |
| 10 | Decision confidence scoring | `components/ConfidenceScore.tsx`; used by TodayPriorities, Waste, Availability, Briefing | caller-supplied scores | partially implemented |
| 11 | Anomaly / signal detection | `lib/query-engine.ts` `detectAnomalies` with configurable WoW-decline and waste-spike thresholds | live query engine | implemented |
| 12 | Governed semantic layer (Looker simulation) | `lib/semantic-layer.ts` — `METRICS`, `DIMENSIONS`, `ACCESS_POLICY`, `GUIDED_PROMPTS`, `LOOKER_CONFIG` | mock; `is_connected` false unless `LOOKER_BASE_URL` set | simulated (platform-reusable candidate) |
| 13 | Role-based access / RLS simulation | `lib/semantic-layer.ts` `ACCESS_POLICY`, `components/Sidebar.tsx` locks, `app/page.tsx` notification IAM check, `components/Settings.tsx` attribute overrides | client-side enforcement | simulated |
| 14 | Governance control centre | `components/Settings.tsx` (thresholds, AI options, Looker user-attribute overrides) | `lib/context.tsx` state | implemented |
| 15 | Architectural Storyboard | `components/ArchitectureExplorer.tsx` (14 slides, `SlideData` model) hosted by `components/Help.tsx` | static slide definitions | implemented (retirement candidate — SB-GATE) |
| 16 | Decision lifecycle explainer | `components/Help.tsx` tab `lifecycle` | static | implemented |
| 17 | Resolution Pattern Library / Organisational Learning Network | `components/Help.tsx` tab `learning`, records `PAT001`–`PAT004` | static | simulated |
| 18 | Alert routing & role-scoped notifications | `app/page.tsx` `NOTIFICATIONS_DATA`, role filter, lock check | static | simulated |
| 19 | Demo mode | `lib/context.tsx` `demoMode`, topbar toggle | state | implemented |
| 20 | Simulated write-back actions | CTA handlers across TodayPriorities / Waste / Availability | state transitions only | simulated |
| 21 | Deployment & health surface | `app/api/health/route.ts`, `Dockerfile`, `docker-compose*.yml`, `nginx/`, `deploy.sh`, `scripts/smoke-test.sh` | live | implemented (platform) |
| 22 | Labour optimisation | `lib/query-engine.ts` ~line 386 anomaly branch only; **no UI component** | — | roadmap — `PLAN.md` Phase 5, unfinished non-Atlas work (§13) |

Cross-domain observation for CAT-01 to test, not to assume: rows 11, 12, 13, 10 and 2 are the
strongest candidates for **Reusable Platform Capability** classification; rows 1, 3–9 are currently
Retail & Grocery domain implementations.
