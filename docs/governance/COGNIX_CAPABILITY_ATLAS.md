# COGNIX CAPABILITY ATLAS — PROGRAMME CHARTER & EXECUTION PLAN

**Document Status:** Approved & Authoritative (governance only — no phase executed)
**Version:** 1.0.0
**Effective Date:** August 2026
**Owner:** G10X Enterprise Innovation Lab Architecture Board
**Workstream namespace:** `ATL-01` … `ATL-07`

---

## 0. Programme Status Board

> **This table is the authoritative answer to "where does the Capability Atlas stand?".**
> An agent or developer completing a work package updates this table with factual results and nothing
> else. A phase is not marked `[COMPLETED]` without the evidence its Exit Gate requires.

| Phase | Name | Status | Completed | Evidence |
|-------|------|--------|-----------|----------|
| — | Programme governance (this document set) | **[COMPLETED]** | 2026-08-20 | This document, [`CAPABILITY_KNOWLEDGE_MODEL.md`](CAPABILITY_KNOWLEDGE_MODEL.md), [`CAPABILITY_ATLAS_ARCHITECTURE.md`](../architecture/CAPABILITY_ATLAS_ARCHITECTURE.md), ADR-045…ADR-051, [`MASTER_PLAN.md`](MASTER_PLAN.md) ATL section, [`UX_DESIGN_PRINCIPLES.md`](../ux/UX_DESIGN_PRINCIPLES.md) §6 |
| `ATL-01` | Capability Discovery, Governance & Information Model | **[NOT STARTED]** | — | — |
| `ATL-02` | Capability Knowledge Backend | **[NOT STARTED]** | — | — |
| `ATL-03` | Retail & Grocery Knowledge Population | **[NOT STARTED]** | — | — |
| `ATL-04` | Atlas UX & Structured Search | **[NOT STARTED]** | — | — |
| `ATL-05` | Internal AI Retrieval & Ask CogniX | **[NOT STARTED]** | — | — |
| `ATL-06` | Google AI, Grounding & Market Intelligence | **[NOT STARTED]** | — | — |
| `ATL-07` | Capability Lifecycle Governance & Automation | **[NOT STARTED]** | — | — |

**Current phase:** `ATL-01` — not yet started
**Last completed Atlas activity:** governance recovery onto the authoritative CogniX line (2026-08-20)
**Next executable work package:** **`ATL-01`**
**Blocked by other CogniX work:** NO

Status vocabulary follows `MASTER_PLAN.md`: `[NOT STARTED]` · `[IN PROGRESS]` · `[BLOCKED]` ·
`[PLANNED]` · `[COMPLETED]`.

### 0.1 Documents referenced but not yet created

Forward references, not broken links. Each is an output of a work package not yet executed.

| Document | Created by | Purpose |
|----------|-----------|---------|
| `docs/reports/COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md` | `ATL-01` | Forensic, evidence-cited inventory reconciled against implementation |
| `docs/reports/COGNIX_ATL_01_STORYBOARD_MIGRATION_ASSESSMENT.md` | `ATL-01` | Dual-version storyboard audit and `SB-GATE` checklist (ADR-051) |

`ATL-01` reports are placed in `docs/reports/` following the estate's existing convention
(`COGNIX_<WP>_<SUBJECT>_REPORT.md`).

---

## 1. What the Capability Atlas Is

> **The CogniX Capability Atlas is the governed knowledge, discovery, explanation and enablement layer
> for the CogniX Enterprise Innovation Lab.**

Positioning line for product surfaces:

> *Explore what CogniX can do, how capabilities work, where they apply, how to demonstrate them, and
> how they can be reused.*

It serves, from one governed source: Innovation Executives · Sales and client-facing teams · Solution
Architects · Enterprise Architects · Developers · Test engineers · Product and Innovation teams ·
future AI assistants and autonomous agents.

"Feature Catalogue" is a narrower concept and is used only when contrasting terminology.

### 1.1 The Atlas is an extension, not a second model (binding — ADR-045)

CogniX already holds capability knowledge in typed registries. The Atlas **does not replace them and
does not duplicate their fields**:

| Existing authority | Owns | Atlas relationship |
|--------------------|------|--------------------|
| [`DEMONSTRATION_SOLUTION_MODEL.md`](DEMONSTRATION_SOLUTION_MODEL.md) + `config/solutions.ts` | `CognixSolution` — the canonical Demonstration Solution contract (`SOL-*`) | **Referenced.** The Atlas consumes these fields and never restates them |
| [`EXPERIMENT_MODEL.md`](EXPERIMENT_MODEL.md) + `config/experiments.ts` | Innovation Experiments (`EXP-*`) | **Referenced.** Experiments are Atlas capabilities of a different asset type |
| [`EXPERIMENT_LIFECYCLE.md`](EXPERIMENT_LIFECYCLE.md) | The seven innovation lifecycle states | **Adopted unchanged** (ADR-047) |
| [`IP_GOVERNANCE.md`](IP_GOVERNANCE.md) | IP classification and the value progression hierarchy | **Adopted unchanged** |
| `config/domains.ts` | `DOMAIN_CATALOGUE` — domains, `active` / `coming_soon` | **Adopted as the Atlas domain taxonomy** |
| `config/personas.ts` | `PERSONA_CATALOGUE` with `decisionLens` | **Adopted as the Atlas audience-lens taxonomy** |
| `config/patterns.ts` | Enterprise learning patterns (`PAT-*`) | **Referenced** as evidence |
| [`COGNIX_PRINCIPLES.md`](COGNIX_PRINCIPLES.md) Principle 13 | Evidence, provenance, no fake intelligence | **Adopted unchanged** — the Atlas content standard is Principle 13 applied to capability knowledge |

**A capability has exactly one identity** — its `SOL-*` or `EXP-*` identifier. The Atlas never mints a
competing identity. A capability appearing in the Atlas but in no registry is prohibited.

The knowledge the Atlas adds — architecture, implementation references, contracts, usage, test
procedures, validation evidence, demo paths, client questions and responses, market evidence,
competitive context, cross-domain reuse, provenance, search and retrieval metadata, the capability
relationship graph, ownership and review lifecycle, known limitations — is specified in
[`CAPABILITY_KNOWLEDGE_MODEL.md`](CAPABILITY_KNOWLEDGE_MODEL.md).

### 1.2 Terminology honesty (binding)

Concepts discussed during Atlas ideation are **not** capabilities until repository evidence exists:

| Term | Repository status at 2026-08-20 | Atlas treatment |
|------|--------------------------------|-----------------|
| **Decision Gap** | Exists — `DDF-01` P0-B, ADR-041 | Real capability, inventory it |
| **Decision Window** | Exists — `DDF-01`, ADR-042 | Real capability, inventory it |
| **Decision Regret** | Exists — `DDF-01` P0-C, ADR-043 | Real capability, inventory it |
| **Forecast Stability** | Exists — `DDF-01` P0-A, ADR-040 | Real capability, inventory it |
| **Demand Decision Frontier** | Exists — `DDF-01` | Real capability; always written with the "Demand" qualifier (ADR-043) |
| **Intent Fusion** | Exists — `IFI-01` | Real capability, inventory it |
| **Demand Fusion** | **Does not exist anywhere** | Never described as implemented. Concept only, or omitted |
| **Forecast Regret** | **Does not exist anywhere** | Never described as implemented. Not a synonym for Decision Regret — ADR-043 rules that decision regret is *not* forecast-error cost, so conflating them would contradict a frozen ruling |

`ATL-01` classifies every concept from repository evidence, never from ideation vocabulary.

---

## 2. Information Architecture

```text
Domain → Business Problem → Capability → Feature / Experiment → Evidence / Artefacts
```

Domains are data (ADR-002 — client-neutral core with configurable industry packs), sourced from
`config/domains.ts`. Retail & Grocery (`retail_grocery`) is the only `active` domain; the remainder are
`coming_soon`. Nothing in the schema, storage, API or UI may hard-code a domain.

A capability may hold several domain placements *and* a cross-domain reuse classification, expressed
through the existing `CognixSolution.applicableIndustries` plus the Atlas reuse assessment.

---

## 3. Programme Phase Map

```text
ATL-01  Capability Discovery, Governance & Information Model     (no runtime code)
   │
   └──► ATL-02  Capability Knowledge Backend
           │
           ├──► ATL-03  Retail & Grocery Knowledge Population
           │        │
           └────────┴──► ATL-04  Atlas UX & Structured Search
                            │
                            └──► ATL-05  Internal AI Retrieval & Ask CogniX
                                     │
                                     └──► ATL-06  Google AI, Grounding & Market Intelligence
                                                  (incl. "Prepare me for a client conversation")
   ATL-02 + ATL-03 ──────────────────────► ATL-07  Lifecycle Governance & Automation
                                                   (may run parallel to ATL-05 / ATL-06)
```

Dependency classification follows `MASTER_PLAN.md`: **HARD** — cannot proceed without;
**INTEGRATION** — develops independently, needed for end-to-end flow; **ENHANCEMENT** — enriches but
does not block.

---

## 4. Work Package Specifications

Each phase below carries the estate's WP contract fields plus the resumability fields the Atlas
programme requires: *Implementation Allowed*, *Commit/Push Permitted*, *Handoff*, *Next WP*.

---

### `ATL-01` — Capability Discovery, Governance & Information Model [NOT STARTED]

- **Objective:** Establish the authoritative Atlas foundation — a forensic, evidence-reconciled
  inventory of what CogniX actually does, reconciled against the existing registries, contracts and
  tests, plus the dual-version storyboard audit required by ADR-051.
- **Rationale:** Every later phase rests on knowing what exists. An inventory built from documentation
  rather than implementation would propagate exactly the class of defect the `DDF-01` register
  caught (`D-DDF-1`, `D-DDF-2`, `D-DDF-3`).
- **Hard Dependencies:** none. `ATL-01` is the programme entry point.
- **Integration Dependencies:** none. **Enhancement Dependencies:** none.
- **Inputs:** `config/solutions.ts`, `config/experiments.ts`, `config/patterns.ts`, `config/domains.ts`,
  `config/personas.ts`, `config/industry-packs.ts`; `app/` routes and `app/api/v1/*`; `components/`;
  `lib/`; `packages/contracts/`; `services/`; `tests/unit/` (25 runners); `docs/governance/`,
  `docs/architecture/`, `docs/reports/` (40+ WP reports); `MASTER_PLAN.md`; git history where a claim
  cannot be settled from the tree.
- **Scope:**
  - Forensic capability inventory. Every row cites file paths and, where applicable, the test runner
    and acceptance criteria that validate it. Every capability classified on all three ADR-047
    dimensions — innovation lifecycle, demonstration maturity, implementation status — at field level
    where they differ.
  - Reconciliation of the inventory against `SOL-*`, `EXP-*` and `PAT-*` registry entries. Capabilities
    present in code but absent from every registry are reported as **unregistered capabilities**;
    registry entries with no implementation evidence are reported as **unbacked registry entries**.
    Neither is silently resolved.
  - Orphaned and disconnected capability detection — components not reachable from routing, registry
    entries not reachable from any surface, contracts with no consumer.
  - Atlas knowledge-extension mapping: for each capability, which knowledge already exists in a
    registry or report, and which Atlas fields are genuinely new.
  - Confirmation or correction of the domain, sub-domain, business-problem, persona and tag
    vocabularies against `config/domains.ts` and `config/personas.ts`. **Extension, not replacement.**
  - **Dual-version storyboard audit (ADR-051):** the 12-slide `components/ArchitectureExplorer.tsx` on
    this line and the 14-slide historical version on `main` / `fix/storyboard-presentation-recovery`,
    inspected **read-only via `git show`**, with a retain/discard decision and a destination for every
    unit of architectural knowledge, and the `SB-GATE` checklist.
- **Non-Scope:** any runtime Atlas functionality; any registry schema change; any storyboard code
  change; any merge, cherry-pick or port from `main`; resolution of pre-existing inconsistencies
  outside the Atlas (report them, do not fix them).
- **User Stories:**
  - *Atlas programme owner:* As the owner, I want an inventory reconciled against implementation and
    tests so that no later Atlas phase publishes a capability CogniX does not have.
  - *Future agent:* As an agent with no conversation history, I want to know which capabilities are
    registered, unregistered and unbacked so that I can populate knowledge without inventing it.
- **Technical Work Packages:** `ATL-01.1` inventory · `ATL-01.2` registry reconciliation ·
  `ATL-01.3` taxonomy confirmation · `ATL-01.4` dual-version storyboard audit.
- **UX Work:** none.
- **Acceptance Criteria:**
  - `AC-ATL-01-1` **[HARD]** Every inventory row cites at least one concrete file path. Rows with no
    code evidence are classified `roadmap` or `concept` and marked *documentation-only claim*.
  - `AC-ATL-01-2` **[HARD]** Every route under `app/`, every handler under `app/api/v1/`, and every
    component reachable from routing appears in the inventory or is explicitly listed as excluded with
    a reason.
  - `AC-ATL-01-3` **[HARD]** Every capability classified on all three ADR-047 dimensions, with
    field-level status where the dimensions disagree.
  - `AC-ATL-01-4` **[HARD]** Every `SOL-*`, `EXP-*` and `PAT-*` registry entry reconciled to
    implementation evidence or reported as unbacked.
  - `AC-ATL-01-5` **[HARD]** Both storyboard versions audited; every unit of knowledge carries a
    retain/discard decision and a destination; `SB-GATE` checklist present with each item's state.
  - `AC-ATL-01-6` Unregistered capabilities and orphaned components reported, not resolved.
  - `AC-ATL-01-7` Taxonomy confirmed as an extension of `config/domains.ts` and `config/personas.ts`;
    no competing vocabulary introduced.
  - `AC-ATL-01-8` Contradictions between governance documents and implementation listed with evidence,
    and explicitly **not** fixed.
- **Test Requirements:** none — `ATL-01` changes no runtime code. Existing suites must remain
  untouched and are not run unless a runtime file changed.
- **Verification Commands:**
  ```bash
  git status --porcelain
  git diff --check
  ls app/api/v1/*/route.ts
  grep -rn "case '" app/page.tsx
  git show origin/main:components/ArchitectureExplorer.tsx | grep -c "title: '"
  grep -c "title: '" components/ArchitectureExplorer.tsx
  ```
- **Exit Gate:** a developer with no conversation history can read the inventory report and state, for
  any CogniX capability, what it is, where it is implemented, what validates it, how mature it is on
  all three dimensions, and whether it is registered — without opening the code.
- **Completion Evidence:** the two `docs/reports/` documents exist; §0 shows `ATL-01 [COMPLETED]` with
  a date; the handoff records inventory counts by classification.
- **Implementation Allowed:** **NO.** Documentation and analysis only. The single permitted code change
  is a trivial non-functional correction demanded by a governance validation (for example a broken
  relative link), which must be called out explicitly.
- **Commit/Push Permitted:** yes, on the Atlas branch, at completion.
- **Risks:** inventory drifting to documentation-led claims — mitigated by `AC-ATL-01-1`; storyboard
  audit cost across two versions — mitigated by auditing at slide granularity via the `SlideData`
  fields rather than line by line.
- **Decisions Outstanding:** whether unregistered capabilities are onboarded to `config/solutions.ts`
  during `ATL-03` or raised as separate non-Atlas work.
- **Downstream Dependencies:** unlocks `ATL-02`. **Next WP:** `ATL-02`.

---

### `ATL-02` — Capability Knowledge Backend [NOT STARTED]

- **Objective:** Extend the existing registries into a governed capability knowledge layer with
  validation, repository access and read APIs, so that Atlas knowledge is served from data and never
  authored in a component.
- **Rationale:** ADR-046. The estate already proves both patterns — typed registries in `config/`, and
  capability knowledge trapped inside `components/QuestionsWorthAsking.tsx`.
- **Hard Dependencies:** `ATL-01` (inventory, taxonomy confirmation).
- **Integration Dependencies:** existing registries (`config/solutions.ts`, `config/experiments.ts`).
- **Enhancement Dependencies:** `packages/contracts` conventions.
- **Scope:** canonical `CapabilityKnowledge` extension type bound by reference to `SOL-*` / `EXP-*`;
  validator implementing the mandatory/recommended/optional tiers and validation rules of
  [`CAPABILITY_KNOWLEDGE_MODEL.md`](CAPABILITY_KNOWLEDGE_MODEL.md); repository abstraction over the
  registry; read APIs under `app/api/v1/atlas/*` with filtering; relationship resolution; versioning,
  provenance and review-date handling; migration of `QuestionsWorthAsking` content out of the
  component into the registry; a test runner following the `tests/unit/run-*-tests.ts` convention.
- **Non-Scope:** any Atlas UI; any semantic index; any AI; any change to `CognixSolution` field
  semantics; any database.
- **Acceptance Criteria:**
  - `AC-ATL-02-1` **[HARD]** No capability prose in any component; components read the API.
  - `AC-ATL-02-2` **[HARD]** The validator rejects a record missing a mandatory field and names it.
  - `AC-ATL-02-3` **[HARD]** Every capability reference resolves to an existing `SOL-*` or `EXP-*`;
    a dangling reference fails validation.
  - `AC-ATL-02-4` **[HARD]** Filtering works for domain, sub-domain, business problem, persona lens,
    lifecycle state, demo maturity, implementation status, cross-domain applicability and tags.
  - `AC-ATL-02-5` **[HARD]** `QuestionsWorthAsking` renders identically from the registry; no
    behavioural regression.
  - `AC-ATL-02-6` Registry field values are referenced, never copied, into Atlas records.
  - `AC-ATL-02-7` `tsc` clean; full existing regression green; production build clean.
- **Test Requirements:** new `tests/unit/run-atl02-tests.ts` with semantic assertions executing real
  route handlers; every existing runner green at its recorded baseline.
- **Verification Commands:**
  ```bash
  npx tsc --noEmit
  npx tsx tests/unit/run-atl02-tests.ts
  npm run build
  git diff --check
  ```
- **Exit Gate:** a developer can retrieve any capability's full governed knowledge through one API
  call, filtered by any supported dimension, with no AI configured.
- **Implementation Allowed:** YES — backend and contracts only.
- **Commit/Push Permitted:** yes.
- **Risks:** over-engineering persistence — ADR-046 permits the simplest version-controlled registry;
  escalation requires a new ADR. Regression in the existing `QuestionsWorthAsking` surface — mitigated
  by `AC-ATL-02-5`.
- **Decisions Outstanding:** whether Atlas knowledge lives in `config/` beside the registries or in a
  dedicated content root; the test-runner invocation convention for new suites.
- **Downstream Dependencies:** unlocks `ATL-03`, `ATL-04`, `ATL-07`. **Next WP:** `ATL-03`.

---

### `ATL-03` — Retail & Grocery Knowledge Population [NOT STARTED]

- **Objective:** Author governed capability knowledge for every capability inventoried in `ATL-01`
  within the `retail_grocery` domain and the cross-domain platform set.
- **Rationale:** The backend is worthless without truthful content, and truthful content is the
  programme's main risk surface.
- **Hard Dependencies:** `ATL-01` (inventory), `ATL-02` (validator, repository).
- **Scope:** description, innovation thesis, usage, testing, architecture, design, use cases, benefits,
  differentiation, demo guidance, market context, evidence, platform reuse, limitations and related
  capabilities — to the completeness tier the capability's maturity requires; Demo Path content for
  every demonstrable capability; Questions Worth Asking extended from the migrated `CuriosityQuestion`
  set; cross-domain reuse assessment for each capability.
- **Non-Scope:** any UI; any capability that does not exist; any registry schema change.
- **Acceptance Criteria:**
  - `AC-ATL-03-1` **[HARD]** Every record passes the `ATL-02` validator.
  - `AC-ATL-03-2` **[HARD]** Every behavioural claim traces to a file path, a test assertion, or is
    explicitly labelled `simulated`, `experimental`, `concept` or `roadmap`. **No record claims a
    capability that does not exist** (§1.2).
  - `AC-ATL-03-3` **[HARD]** Where implementation status differs by field, it is recorded per field,
    not averaged (ADR-047).
  - `AC-ATL-03-4` **[HARD]** Every market claim carries source, publisher, publication date and
    retrieval date, or `marketContext` is absent rather than thin.
  - `AC-ATL-03-5` **[HARD]** Demo Path warnings are non-empty for any capability that is not fully
    implemented.
  - `AC-ATL-03-6` Cross-domain applicability stated for every capability, including `not-assessed`.
  - `AC-ATL-03-7` Prior defect-register findings (`D-DDF-*`, `D-INT-*`) are reflected in `limitations`
    where still applicable, not silently omitted.
- **Test Requirements:** validator run across the full record set; existing regression green.
- **Exit Gate:** a seller can open any Retail & Grocery capability and get an accurate account of what
  it does, what proves it, what it cannot do, and how to show it — with no verbal correction needed.
- **Implementation Allowed:** YES — content authoring only.
- **Commit/Push Permitted:** yes.
- **Risks:** marketing drift and over-claimed maturity — mitigated by `AC-ATL-03-2`/`-3` and automated
  later by `ATL-07`.
- **Decisions Outstanding:** capability ownership assignment (`owner` values).
- **Downstream Dependencies:** unlocks `ATL-04`. **Next WP:** `ATL-04`.

---

### `ATL-04` — Atlas UX & Structured Search [NOT STARTED]

- **Objective:** Deliver the Atlas experience — search-first landing, domain browse, capability detail
  with audience lenses, relationships, Demo Path — and, once `SB-GATE` passes, supersede the
  Architectural Storyboard navigation surface.
- **Rationale:** Discovery is how every audience enters. ADR-050 Level 1.
- **Hard Dependencies:** `ATL-02` (APIs), `ATL-03` (content).
- **Integration Dependencies:** `SB-GATE` (ADR-051) — governs storyboard retirement only, not the rest
  of the phase.
- **Scope:** search-first landing; capability cards; capability detail following the progressive
  disclosure order in [`UX_DESIGN_PRINCIPLES.md`](../ux/UX_DESIGN_PRINCIPLES.md) §6; Level 1 structured
  search with the ADR-050 filter set; audience lens switching driven by `config/personas.ts`;
  relationship view; three-dimension maturity badges; platform-reuse indicators; Demo Path; Questions
  Worth Asking; responsive layout.
- **Non-Scope:** semantic retrieval; any AI; merging any storyboard implementation from `main`.
- **Acceptance Criteria:**
  - `AC-ATL-04-1` **[HARD]** All capability text rendered by the UI originates from an Atlas API
    response (ADR-046).
  - `AC-ATL-04-2` **[HARD]** Search returns deterministic results with no AI provider configured.
  - `AC-ATL-04-3` **[HARD]** Lenses change ordering and emphasis only — one stored record per
    capability, no separate content fetch per lens.
  - `AC-ATL-04-4` **[HARD]** All three ADR-047 maturity dimensions are visible together wherever any
    one is shown.
  - `AC-ATL-04-5` **[HARD]** The Five-Second Rule and the 40–60 word ceiling
    (`UX_DESIGN_PRINCIPLES.md` §3) are met on the landing and capability surfaces.
  - `AC-ATL-04-6` **[HARD]** `components/ArchitectureExplorer.tsx` is not deleted or disabled unless
    `SB-GATE` passes in the same work package with the checklist ticked.
  - `AC-ATL-04-7` Light executive surface per `UX_DESIGN_PRINCIPLES.md` §1 — no dark-mode Atlas.
  - `AC-ATL-04-8` Keyboard and assistive-technology access for search, filters, lens switching and
    disclosure.
- **Test Requirements:** `tests/unit/run-atl04-tests.ts`; existing regression green; production build
  clean; browser walkthrough at 1024/1280/1440 with no console errors and no horizontal overflow
  (the `DDF-01` validation precedent).
- **Exit Gate:** an executive reaches a relevant capability from the landing surface within five
  seconds and can tell, without asking, whether it is real.
- **Implementation Allowed:** YES. **Commit/Push Permitted:** yes.
- **Risks:** storyboard removal before knowledge preservation — mitigated by ADR-051; documentation-wall
  UX — mitigated by the word ceiling and progressive disclosure.
- **Decisions Outstanding:** whether the Atlas becomes a top-level shell entry or lives within the
  existing Help/About surface (`UX_DESIGN_PRINCIPLES.md` §3.2 One-Title rules apply either way).
- **Downstream Dependencies:** unlocks `ATL-05`. **Next WP:** `ATL-05`.

---

### `ATL-05` — Internal AI Retrieval & Ask CogniX [NOT STARTED]

- **Objective:** Add AI-assisted explanation over governed internal capability knowledge, with
  citations, and no external web access.
- **Rationale:** ADR-049, ADR-050 Levels 2 and 3.
- **Hard Dependencies:** `ATL-04` (Level 1 search, surfaces), `ATL-03` (content).
- **Scope:** semantic retrieval over Atlas knowledge only; Atlas AI gateway behind the existing
  provider abstraction (`lib/ai-provider.ts`); query routing for CogniX-only and demonstration
  intents; grounded answers with per-claim citations to capability identifiers; audience-sensitive
  explanation; guardrails against unsupported product claims; evaluation suite.
- **Non-Scope:** any external web access; any grounding; any market research.
- **Acceptance Criteria:**
  - `AC-ATL-05-1` **[HARD]** No provider SDK imported into any client component; all provider calls
    server-side.
  - `AC-ATL-05-2` **[HARD]** Every sentence asserting a CogniX capability fact carries a resolvable
    citation; an uncitable sentence is not emitted.
  - `AC-ATL-05-3` **[HARD]** With no provider key, Ask CogniX degrades to Level 1 structured search and
    says so. **No canned generated fallback on any path** (ADR-049).
  - `AC-ATL-05-4` **[HARD]** A question about a non-existent capability yields a declared gap, not an
    invention.
  - `AC-ATL-05-5` **[HARD]** No external network egress from any `ATL-05` path.
- **Test Requirements:** `tests/unit/run-atl05-tests.ts` including citation coverage, guardrail and
  degradation cases; existing regression green.
- **Exit Gate:** an architect asks a capability question in natural language and receives an answer
  whose every factual claim can be clicked through to governed evidence.
- **Implementation Allowed:** YES. **Commit/Push Permitted:** yes.
- **Risks:** ungrounded generation — mitigated by `AC-ATL-05-2`/`-4`; key handling — the estate's
  server-side-only convention (ADR-044) must not be weakened.
- **Decisions Outstanding:** embedding provider; whether the index is committed or built at startup.
- **Downstream Dependencies:** unlocks `ATL-06`. **Next WP:** `ATL-06`.

---

### `ATL-06` — Google AI, Grounding & Market Intelligence [NOT STARTED]

- **Objective:** Add controlled external reasoning and current market evidence behind the CogniX
  backend, and deliver **"Prepare me for a client conversation"**.
- **Rationale:** ADR-048, ADR-049.
- **Hard Dependencies:** `ATL-05` (gateway, retrieval, guardrails), `ATL-03` (market context fields).
- **Scope:** Gemini behind the Atlas gateway as one adapter; Google Search grounding, server-side only,
  gated per intent class; market research retrieval with provenance; strict three-class evidence
  separation; comparative and market-research routes; confidence and evidence controls; caching and
  cost controls; **"Prepare me for a client conversation"**.
- **Non-Scope:** any browser-side provider or grounding call; any capability claim sourced from the web.

#### "Prepare me for a client conversation" — required feature

A user supplies client context, for example:

> *I am meeting the Head of Demand Planning at a grocery retailer struggling with promotional
> volatility, forecast accuracy and slow reaction to external signals.*

The Atlas reasons over governed CogniX capability knowledge, business problems, domain context, demo
readiness, cross-capability relationships, audience persona and optional current market evidence, and
returns an evidence-grounded preparation pack containing **all** of:

| Section | Content |
|---------|---------|
| Client problem interpretation | The likely pain points, and which of the user's words led to that reading |
| Recommended CogniX capabilities | With capability identifiers and all three ADR-047 maturity dimensions visible |
| Recommended demonstration sequence | An ordered path assembled from real capabilities and their Demo Paths |
| Why each capability matters | Business-focused explanation per capability |
| Questions to ask the client | From `questionsWorthAsking` plus context-derived questions |
| Likely client questions | From `clientQuestions` |
| Suggested responses | Grounded in governed knowledge, with citations |
| Relevant market evidence | Only where it materially supports the discussion, fully sourced, in the *Market Context* class |
| Demo warnings and limitations | **Mandatory and non-empty** whenever any recommended capability is not fully implemented |
| Recommended follow-up capabilities | What to explore next depending on the client's response |

- **Acceptance Criteria:**
  - `AC-ATL-06-1` **[HARD]** No browser-side call to any Gemini or Google Search endpoint.
  - `AC-ATL-06-2` **[HARD]** Every external claim renders with source URL, publisher and retrieval
    date; a claim without provenance is not rendered (ADR-048).
  - `AC-ATL-06-3` **[HARD]** Responses separate **From CogniX** / **Market Context** /
    **AI Interpretation** structurally and visually.
  - `AC-ATL-06-4` **[HARD]** Swapping the provider adapter changes no retrieval, record or UI
    behaviour — proven by a second or fake adapter under test.
  - `AC-ATL-06-5` **[HARD]** The preparation pack returns every section above; warnings are non-empty
    when a non-implemented capability is recommended.
  - `AC-ATL-06-6` **[HARD]** With grounding disabled or unavailable, the pack is still produced from
    internal knowledge and the market section is shown as explicitly absent, never omitted silently.
  - `AC-ATL-06-7` A CogniX-only question is never answered from the web, however thin retrieval is.
- **Test Requirements:** `tests/unit/run-atl06-tests.ts` including provider swap, provenance, class
  separation, routing fail-safe and pack completeness; existing regression green.
- **Exit Gate:** a seller preparing for a real meeting gets a pack they can use unedited, in which
  every CogniX claim is governed, every market claim is sourced, and every limitation is stated.
- **Implementation Allowed:** YES. **Commit/Push Permitted:** yes.
- **Risks:** external research redefining capabilities — mitigated by ADR-048; cost — mitigated by
  intent-class gating and caching.
- **Decisions Outstanding:** trusted-domain allowlist policy; market-evidence cache TTL.
- **Downstream Dependencies:** none. **Next WP:** `ATL-07`.

---

### `ATL-07` — Capability Lifecycle Governance & Automation [NOT STARTED]

- **Objective:** Turn the Atlas into a living capability-governance system that keeps itself honest.
- **Rationale:** Knowledge decays silently. The `DDF-01` reconciliation found defects that had been
  *relocated rather than closed*; automation is how that is caught without a human re-reading
  everything.
- **Hard Dependencies:** `ATL-02` (validator, repository), `ATL-03` (records). May run parallel to
  `ATL-05` / `ATL-06`.
- **Scope:** capability registration during feature development; documentation completeness checks and
  a completeness score; architecture-evidence checks; automated test linkage; demo-readiness checks;
  market-evidence freshness; stale-content detection; source-code drift detection against recorded
  implementation references; review dates; lifecycle transitions; ownership; publication gates.
- **Non-Scope:** automatic promotion of any capability's maturity on any dimension.
- **Acceptance Criteria:**
  - `AC-ATL-07-1` **[HARD]** A record whose referenced source files changed since `reviewedAt` is
    flagged automatically.
  - `AC-ATL-07-2` **[HARD]** A record failing its completeness tier cannot be published.
  - `AC-ATL-07-3` **[HARD]** Automation flags and blocks; it never promotes a maturity state.
  - `AC-ATL-07-4` Stale market evidence is flagged, never silently served.
  - `AC-ATL-07-5` Checks run from one documented command and are wired into `.gitlab-ci.yml` if
    adopted.
- **Test Requirements:** `tests/unit/run-atl07-tests.ts`; governance report over the full record set.
- **Exit Gate:** capability knowledge that has drifted from the code is detected by the pipeline rather
  than by a client in a meeting.
- **Implementation Allowed:** YES. **Commit/Push Permitted:** yes.
- **Risks:** governance automation blocking contributors — introduce advisory first, then blocking.
- **Decisions Outstanding:** which checks become blocking in CI.
- **Downstream Dependencies:** none. **Next WP:** NONE — the programme completes; subsequent work is
  ordinary capability maintenance under this governance.

> **Longer-term principle:** a CogniX capability is not complete merely because code exists. It must
> also be explainable, testable, demonstrable, architecturally traceable and governed.

---

## 5. Architectural Storyboard — Retirement Gate (`SB-GATE`)

Governed by **ADR-051**. Two implementations exist on different lines of history: the **12-slide**
`components/ArchitectureExplorer.tsx` on this branch, and a **14-slide** version (2,303 lines) on the
abandoned Lidl-era `main`, together with a different `components/Help.tsx`.

> **Preserve architectural knowledge, not obsolete storyboard implementation.**

The historical implementation is **never merged, cherry-picked or ported**. It is a read-only audit
source, inspected via `git show origin/main:<path>`.

The storyboard is not deleted or disabled during `ATL-01`. It may be retired only when every item is
true and ticked in the `ATL-01` storyboard assessment:

- [ ] **SB-GATE-1** Both versions audited slide by slide, each unit of knowledge carrying a
      retain/discard decision.
- [ ] **SB-GATE-2** Every retained unit verifiably present at its destination.
- [ ] **SB-GATE-3** Destinations reachable from the Atlas or from governance, not only from a file.
- [ ] **SB-GATE-4** Persona journeys, the enterprise blueprint, the recommendation lifecycle, the
      governance-and-trust narrative and the constrained-reasoning narrative each have a named
      successor surface.
- [ ] **SB-GATE-5** Presenter notes and demo timings preserved as Demo Path content.
- [ ] **SB-GATE-6** Retirement proposed in a work package that also names the navigation successor.

If the gate cannot be met, the storyboard remains and the Atlas coexists with it.

---

## 6. Separation From Existing CogniX Work

> **The CogniX Capability Atlas is an independently scheduled workstream. It does not supersede, close,
> reorder or implicitly deprioritise existing incomplete CogniX work packages.**

- All existing identifiers — `CDI-*`, `ESF-*`, `IFI-*`, `DDF-*`, `DOT-*`, `WP10-*`, `EXP-*`, `SOL-*`,
  `PAT-*`, Phases 0–13 — keep their identity, ordering and status. Establishing the Atlas changed none
  of them.
- The `ATL` namespace was chosen specifically because `SOL-CAT-04` already exists in the solution
  registry, which would have made a `CAT-*` Atlas namespace ambiguous to both readers and `grep`.
- No `ATL` phase depends on any non-Atlas work package completing, and no non-Atlas work package
  depends on an `ATL` phase. Atlas work may proceed in parallel.
- No existing work item may be moved into the `ATL` namespace, and no `ATL` phase may be marked
  complete because adjacent non-Atlas work completed.
- `ATL-01` **reports** contradictions and pre-existing inconsistencies; it does not fix them.

---

## 7. How to Resume Capability Atlas Work

*This section exists so a developer or AI agent with **no prior conversation history** can determine
the programme's state and continue it safely.*

1. **Read this document** — §0 status board first, then §3 phase map.
2. **Read the Atlas section of the Master Plan** — [`MASTER_PLAN.md`](MASTER_PLAN.md) — to confirm the
   programme is still registered and to see whether other CogniX work has moved.
3. **Determine completed phases** from §0 and verify each claimed completion against its *Completion
   Evidence* and *Exit Gate*. A status line with no evidence is not a completion.
4. **Confirm prerequisites** of the next `[NOT STARTED]` phase from repository state, not from this
   document's optimism.
5. **Verify repository continuity before changing anything:**
   ```bash
   git rev-parse --show-toplevel && git branch --show-current && git rev-parse HEAD
   git status --porcelain && git remote -v
   git fetch origin && git rev-list --left-right --count origin/Feature/MatchingContract-AutoActivate...HEAD
   ```
   The authoritative CogniX baseline is **`origin/Feature/MatchingContract-AutoActivate`**. It is not
   `origin/main` — `main` is an abandoned Lidl-era POC line. Confirm your branch descends from the
   CogniX line before trusting any inventory.
6. **Execute only the requested `ATL` work package.** Respect its *Implementation Allowed* field. Do
   not opportunistically begin the next phase.
7. **Run the phase's Verification Commands** and its Test Requirements.
8. **Update governance with factual results** — §0 status board, completion evidence, handoff. Record
   what failed as well as what passed.
9. **Preserve separation** — never alter another workstream's identifiers or statuses (§6).
10. **Leave a deterministic handoff** — fill the phase's handoff and set §0's next executable WP.

### 7.1 Example instructions a future developer or agent can use verbatim

> Review CogniX governance and tell me the exact current status of the Capability Atlas programme. Do not modify code.

> Identify the next executable Capability Atlas work package and its prerequisites. Do not start implementation.

> Execute ATL-01 only, according to the Master Plan and Atlas governance. Do not perform ATL-02 or unrelated CogniX work.

> Execute the next incomplete work package within ATL-04 only. Preserve all other unfinished CogniX workstreams.

> Audit whether ATL-05 acceptance criteria are fully satisfied and report evidence. Do not advance the programme unless all gates pass.

> Confirm the Architectural Storyboard retirement gate (SB-GATE) status and list which items are still open. Do not merge any storyboard implementation from main.

---

## 8. Definition of Programme Success

On completion a user can answer, from the Atlas alone: what capabilities CogniX has · which are
available in Retail & Grocery · which are reusable across domains · what business problem each solves ·
how to use it · how to test it · how to demonstrate it · how it works technically · which services and
APIs support it · what evidence proves it works · what its limitations are · what comparable approaches
exist · what makes CogniX different · where else it could apply · which capability to show a specific
client · what to say during the demonstration · what to ask the client · what the client may ask ·
what is experimental versus proven · and what the next Atlas work package is.
