# CogniX Capability Atlas — Architecture

**Document type:** Atlas governance — architecture
**Owned by:** CogniX Capability Atlas programme (`COGNIX_CAPABILITY_ATLAS.md`)
**Binding on:** CAT-02, CAT-04, CAT-07 (CAT-05/CAT-06 architecture lives in
`CAPABILITY_ATLAS_SEARCH_AND_AI_MODEL.md`)

---

## 1. Architectural requirement: dynamic backend

> **Capability Atlas content must not be embedded primarily as static JSX/HTML presentation content.**

The frontend consumes capability information through backend contracts. The presentation layer renders
what the backend returns and owns none of the knowledge.

Why this is a hard rule rather than a preference:

- The same record must serve four audience lenses, structured search, semantic retrieval, AI grounding,
  a client-preparation pack and lifecycle automation. Content trapped in JSX can serve exactly one of
  those.
- CAT-07 drift detection compares records to source files. It cannot inspect prose that lives inside
  the components it is meant to be checking.
- The current repository already demonstrates the failure mode this rule prevents: the Architectural
  Storyboard's entire knowledge base is a `SLIDES` array inside `components/ArchitectureExplorer.tsx`
  (~2,300 lines), and the Resolution Pattern Library's records `PAT001`–`PAT004` are literals inside
  `components/Help.tsx`. That knowledge is unsearchable, unversioned as content, and unreachable by any
  other surface. The Atlas must not repeat it.

See ADR-0002.

---

## 2. Logical structure

```text
                    CogniX Capability Atlas UI
                                |
                                v
                          Atlas Backend API
                                |
                   +------------+------------+
                   |                         |
           Capability Service          Search Service
                   |                         |
                   +------------+------------+
                                |
                     Capability Knowledge Store
```

Extended with the AI layer introduced at CAT-05/CAT-06 (detail in
`CAPABILITY_ATLAS_SEARCH_AND_AI_MODEL.md`):

```text
   Atlas UI ──► Atlas Backend API ──► Capability Service ──► Knowledge Store
                       │                     ▲
                       │                     │
                       └──► Atlas AI Gateway ┘   (CAT-05+, server-side only)
                                   │
                                   └──► Provider adapter ──► external model / grounding
```

### 2.1 Responsibilities

| Element | Owns | Must not |
|---------|------|----------|
| **Atlas UI** | Layout, disclosure, lens presentation, filter state, accessibility | Hold capability content; call any AI provider directly |
| **Atlas Backend API** | Contracts, filtering, pagination, lens hints, error shapes | Reformat content into audience-specific bodies |
| **Capability Service** | Record read, relationship resolution, validation, versioning, provenance | Fetch external web content |
| **Search Service** | Deterministic structured search (Level 1), later semantic index (Level 2) | Return unranked raw records without filter semantics |
| **Knowledge Store** | Durable, version-controlled capability records + evidence refs | Contain markup or layout |

---

## 3. Capability Knowledge Store

### 3.1 Requirements

The store must permit:

- version-controlled capability definitions (diffable, reviewable, attributable)
- ingestion and validation on write
- backend querying and filtering
- structured search at CAT-04
- semantic indexing later at CAT-05 without changing the record format
- content versioning (`version`, `updatedAt`, `reviewedAt`)
- provenance for every claim
- lifecycle governance hooks for CAT-07

### 3.2 Deliberate non-decision on persistence

**No database is mandated.** The repository today has no database at all: `lib/query-engine.ts` reads
local JSON under `data/`, and `lib/semantic-layer.ts` simulates the governed metric layer with
`LOOKER_CONFIG.is_connected` false unless `LOOKER_BASE_URL` is set. Introducing a database purely for
capability records would be heavier than the repository's own architecture warrants.

The **default recommendation for CAT-02** is therefore version-controlled record files in the
repository (one file per capability, under a dedicated content root such as `content/atlas/`), loaded
through a repository abstraction with an in-memory index built at startup.

Constraint that makes this safe to change later: **all access goes through the repository
abstraction**. No route, component, search or AI code may read record files directly. Migrating to a
database, a headless CMS or a service later must then be a change behind one interface, recorded in a
new ADR — not a rewrite of the Atlas.

CAT-02's handoff notes must record the persistence choice actually implemented.

---

## 4. Domain model placement

Domains are **data**, not code structure (ADR-0003). Concretely:

- Domain, sub-domain, business-problem, persona and tag vocabularies live in
  `CAPABILITY_TAXONOMY.md` — a **CAT-01 output that does not exist yet**
  (`COGNIX_CAPABILITY_ATLAS.md` §0.1) — and are loaded as data.
- No module path, route segment, type name or table may encode `retail` as a special case.
- The initial populated domain is Retail & Grocery. Adding Manufacturing, Financial Services,
  Healthcare, Travel & Hospitality or Supply Chain / Logistics must require new *records and taxonomy
  entries only* — zero architectural change. CAT-02 should prove this with a test that registers a
  second, fictitious domain and queries it.
- A capability carries both its domain placements and its `platformReusable` classification. The
  Platform Capability Map (§7) is derived from those fields, never hand-maintained.

---

## 5. API design direction

Proposed logical surface. These are architectural proposals; the exact shapes are settled in CAT-02.

| Endpoint | Purpose | Introduced |
|----------|---------|-----------|
| `GET /api/v1/atlas/domains` | Domain and sub-domain tree with capability counts | CAT-02 |
| `GET /api/v1/atlas/capabilities` | List/filter capabilities | CAT-02 |
| `GET /api/v1/atlas/capabilities/{id}` | Full record, optional `lens` hint | CAT-02 |
| `GET /api/v1/atlas/relationships` | Capability graph edges | CAT-02 |
| `GET /api/v1/atlas/tags` | Controlled tag vocabulary with counts | CAT-02 |
| `GET /api/v1/atlas/evidence` | Evidence refs, filterable by capability | CAT-02 |
| `GET /api/v1/atlas/search` | Structured search (Level 1), semantic later (Level 2) | CAT-02 (L1) / CAT-05 (L2) |
| `POST /api/v1/atlas/ask` | Ask CogniX — grounded answer with citations | CAT-05 |
| `POST /api/v1/atlas/client-preparation` | "Prepare me for a client conversation" pack | CAT-06 |

### 5.1 Required filters

`GET /api/v1/atlas/capabilities` and `GET /api/v1/atlas/search` must both support filtering by:

`domain` · `subdomain` · `businessProblem` · `persona` · `maturity` · `platformReusable` ·
`demoReadiness` · `tags` · `crossDomainApplicability`

Filters combine as AND across dimensions, OR within a repeated dimension. Every filter value is
validated against the taxonomy; an unknown value is a 400, not a silent empty result.

### 5.2 Contract rules

- Responses carry `schemaVersion` and, per record, `version` and `reviewedAt` so that a consumer can
  reason about freshness.
- The `lens` parameter returns an **ordering and emphasis hint**, not different content
  (`CAPABILITY_KNOWLEDGE_MODEL.md` §8).
- Every response that includes an external claim includes its provenance inline. A claim without
  provenance is omitted server-side (ADR-0007).
- Errors are typed and name the offending field; the UI must be able to explain a rejection.

---

## 6. Architecture documentation model

Retiring the Architectural Storyboard must not remove architecture transparency. Architecture is
therefore documented at two levels, both reachable from the Atlas:

1. **Capability-specific** — the `architecture`, `components`, `services`, `apis`, `contracts`,
   `dataSources`, `signals`, `dependencies` and `sourceCodeReferences` fields of the record.
2. **Platform-wide** — architecture documentation and diagrams referenced from records via
   `relatedGovernance` and `relatedDecisions`.

Each capability exposes architecture **progressively**: a one-line flow first, an expandable stage
diagram second, node detail third. Illustrative stage flow shape:

```text
Signals
   |
   v
Signal Normalisation
   |
   v
Demand / Intent Fusion
   |
   v
Forecast Model
   |
   v
Confidence / Uncertainty
   |
   v
Decision Layer
   |
   v
Learning / Feedback
```

At the deepest level a user must be able to inspect: services involved · components · APIs ·
contracts · stores · external dependencies · signal provenance · decision dependencies · related
architecture decisions · source-code references.

The current repository's real equivalent flow — to be documented properly by CAT-03 rather than
assumed — runs roughly: local data (`data/*.json`) → query engine (`lib/query-engine.ts`) →
governed metric definitions (`lib/semantic-layer.ts`) → API routes (`app/api/data`, `app/api/ask`,
`app/api/briefing`) → reasoning (`lib/gemini.ts`, with deterministic fallback) → screen → confidence
surface (`components/ConfidenceScore.tsx`) → simulated write-back.

---

## 7. Platform Capability Map

A planned Atlas view, **derived from record fields**, showing reusable platform capabilities and their
domain applications.

```text
                CogniX Platform Capabilities

                  Signal Intelligence
                          |
                     Demand Fusion
                          |
                  Decision Intelligence
                          |
                   Experimentation
                          |
                 Learning / Feedback
                          |
                    Observability
```

Domain reuse is shown by expanding a platform capability into its domain applications:

```text
                     <Platform capability>
                    /          |           \
              Retail     Hospitality    Manufacturing
```

Two governance points:

- The layer names above are the **candidate** platform vocabulary discussed at programme inception.
  They are not present in the repository today. CAT-01 must decide the real platform capability names
  from evidence and record them in `CAPABILITY_TAXONOMY.md`. The map renders whatever CAT-01 defines.
- The map's purpose is to communicate that **Retail & Grocery is a domain implementation of reusable
  CogniX decision-intelligence capabilities, not a collection of disconnected retail demos**. A map
  that cannot show at least one capability applying beyond retail has failed its purpose and should
  prompt a reuse assessment, not a fabricated edge.

---

## 8. Architectural Storyboard: audit, migration and retirement

### 8.1 Current state (evidence)

| Asset | Location | Content |
|-------|----------|---------|
| Architecture Storyboard deck | `components/ArchitectureExplorer.tsx` | 14 slides defined by the `SlideData` interface: title, trigger, key message, business value, technical details, business/architecture/technical narratives, presenter notes, outcome metric + label, persona + persona title |
| Slide inventory | same | Why This Exists · Before vs After Decision Making · Interactive Enterprise Blueprint · Store Manager Journey · Category Manager Journey · Supply Chain Journey · Executive Journey · The Business Value Engine · AppSheet AI Enablement Blueprint · How A Recommendation Is Generated · Why Gemini Cannot Hallucinate Here · Governance & Trust · Why This Matters to LiDL · Future-State LiDL 2028 |
| Host surface | `components/Help.tsx` | Tabs: *Architecture Storyboard*, *Decision Lifecycle*, *Organisational Learning Network* |
| Lifecycle content | `components/Help.tsx` | Six-stage decision lifecycle: Signal Detection → IAM & RLS Scope Enforcement → Governed Looker Query Compilation → Gemini Contextual Reasoning → Confidence Assessment & Human Review → Governed Write-Back Execution |
| Pattern library | `components/Help.tsx` | `PAT001`–`PAT004` with trigger, action, outcome, confidence, stores impacted |

### 8.2 Migration mapping (targets for CAT-01's assessment)

| Storyboard knowledge | Destination |
|----------------------|-------------|
| Persona journeys (store, category, supply, executive) | Capability record `useCases`, `sampleScenarios`, `personas`, and Demo Path `ten-minute` steps |
| Business value / outcome metrics per slide | `businessBenefits` with `measure`, and `valueProposition` |
| Presenter notes | Demo Path `steps[].whatToSay` and `warnings` |
| Enterprise blueprint (7 layers) | Platform architecture documentation + Platform Capability Map (§7) |
| "How a recommendation is generated" | Capability record `architecture.flow` for the reasoning capability, plus platform architecture doc |
| "Why Gemini cannot hallucinate here" | ADR-0004/ADR-0005 rationale + the reasoning capability's `limitations` and `assumptions` |
| Governance & trust (IAM, LookML, RLS) | Governance-control capability records (`capabilityType: governance-control`) + `relatedGovernance` |
| Decision lifecycle six stages | `architecture.flow` of the decision-lifecycle capability |
| Resolution Pattern Library records | Capability record for the learning capability + `validationEvidence`; the four patterns become record data, not component literals |
| Future-state slides | `relatedExperiments` / roadmap-status capability records |
| Demo timings (10-min core, 20–30-min extended) | Demo Path `durationMins` and `prerequisites` |

### 8.3 Retirement gate

Retirement is governed by **SB-GATE** in `COGNIX_CAPABILITY_ATLAS.md` §11.1 and ADR-0009. Summary:
the storyboard is **not** deleted or disabled during CAT-01; it may only be retired inside a work
package that also states its navigation successor, once every retained unit of knowledge is verifiably
present in its destination and reachable.

---

## 9. Constraints inherited from the existing repository

CAT-02 onward must respect what is already true here:

| Constraint | Source | Implication |
|------------|--------|-------------|
| Next.js App Router, React 19, TypeScript | `package.json`, `app/` | Atlas APIs are route handlers under `app/api/`; Atlas UI is App Router components |
| **This Next.js version differs from common training data** | `AGENTS.md` | Read `node_modules/next/dist/docs/` before writing route or component code in CAT-02+ |
| No test runner, no lint script | `package.json` scripts: `dev`, `build`, `start` only | CAT-02 introduces the test harness and records the choice |
| No database; local JSON + mock semantic layer | `data/`, `lib/query-engine.ts`, `lib/semantic-layer.ts` | Reinforces §3.2's file-backed default |
| Secrets never committed; Gemini key supplied per session | `PLAN.md` §8, `lib/gemini.ts` `getClient(apiKey?)` | The Atlas AI gateway must not weaken this; no key in records, fixtures or logs |
| Deployment is a Dockerised monolith behind nginx | `Dockerfile`, `docker-compose*.yml`, `nginx/`, `deploy.sh` | Atlas ships inside the same container; no new service is introduced without an ADR |
| Health/smoke verification exists | `app/api/health/route.ts`, `scripts/smoke-test.sh` | Atlas endpoints should be added to smoke verification at CAT-04 |
