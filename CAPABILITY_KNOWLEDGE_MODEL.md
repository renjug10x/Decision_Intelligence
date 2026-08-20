# CogniX Capability Knowledge Model

**Document type:** Atlas governance — canonical data model
**Owned by:** CogniX Capability Atlas programme (`COGNIX_CAPABILITY_ATLAS.md`)
**Binding on:** CAT-02 (implementation), CAT-03 (population), CAT-07 (automation)
**Version:** 1.0 (schema v1) — amendments require a changelog entry in §10

---

## 1. Purpose

This document defines the single canonical representation of a CogniX capability. Every Atlas surface —
UI, API, search index, AI retrieval, client-preparation pack — reads from this one model. There is no
second, audience-specific copy of capability documentation anywhere in the system.

Forward reference: this document specifies validation against `CAPABILITY_TAXONOMY.md`, which is a
**CAT-01 output and does not exist yet** (`COGNIX_CAPABILITY_ATLAS.md` §0.1). Until it does, taxonomy
values are unconstrained and rule V3 cannot be enforced.

Two rules follow from that and are non-negotiable:

1. **One record per capability.** Audience lenses (§8) reorder and reveal; they never fork the record.
2. **The record is not presentation.** Field values are content, not markup, not layout, not JSX.

---

## 2. Record identity

| Field | Rule |
|-------|------|
| `id` | Stable, immutable, machine-readable. Format `cap.<domain-or-platform>.<slug>` (e.g. `cap.platform.anomaly-detection`). Never reused, never renamed. |
| `slug` | URL-safe, unique, lower-kebab. May change only with a redirect recorded in the record. |
| `name` | Human display name. |
| `shortName` | Compact label for cards, badges, diagrams and navigation. |

A capability that is renamed keeps its `id`. A capability that is split into two keeps neither `id`
for the parts; both parts are new records that reference the retired one via `relatedCapabilities`.

---

## 3. Canonical schema (v1)

Field names below are canonical. CAT-02 may adapt casing to the repository's TypeScript conventions
but must not rename a field's meaning without a changelog entry.

```yaml
# ── Identity ────────────────────────────────────────────────────────────────
id:                        # string, immutable
name:                      # string
shortName:                 # string
slug:                      # string, unique

# ── Narrative ───────────────────────────────────────────────────────────────
summary:                   # string, <= 240 chars, plain language, no jargon
description:               # string, the "what it is" body
innovationThesis:          # string, why this is worth exploring at all

# ── Placement ───────────────────────────────────────────────────────────────
domains:                   # [domainId], from CAPABILITY_TAXONOMY.md
subDomains:                # [subDomainId]
businessProblems:          # [businessProblemId]
personas:                  # [personaId]

# ── Classification ──────────────────────────────────────────────────────────
capabilityType:            # enum: domain-capability | platform-capability |
                           #       enabling-service | experience | governance-control
platformReusable:          # boolean
crossDomainApplicability:  # [{ domainId, applicability: proven|likely|hypothetical|not-assessed,
                           #    rationale, evidence? }]

# ── Lifecycle ───────────────────────────────────────────────────────────────
maturity:                  # enum, see §4
status:                    # enum: draft | in-review | published | deprecated | retired
implementationStatus:      # enum: implemented | partially-implemented | simulated |
                           #       experimental | roadmap        (see §6.2)
demoReadiness:             # enum: not-demoable | demo-with-caveats | demo-ready | client-ready
implementationReadiness:   # enum: none | prototype | hardened-prototype | production-candidate

# ── Value ───────────────────────────────────────────────────────────────────
valueProposition:          # string
businessBenefits:          # [{ benefit, measure?, evidence? }]
differentiators:           # [string]
uniqueness:                # string
limitations:               # [{ limitation, severity: low|medium|high, appliesTo? }]
assumptions:               # [string]

# ── Enablement ──────────────────────────────────────────────────────────────
useCases:                  # [{ title, context, outcome }]
sampleScenarios:           # [{ title, narrative }]
demoScenarios:             # [DemoPath], see §9
questionsWorthAsking:      # [{ question, whyItMatters, whatToLookFor }], see §9.2
clientQuestions:           # [{ question, audience, difficulty }]
recommendedResponses:      # [{ questionRef, response, evidenceRefs[] }]

# ── Verification ────────────────────────────────────────────────────────────
usageInstructions:         # string — how a user exercises the capability today
testingInstructions:       # string — how an engineer verifies it
validationEvidence:        # [EvidenceRef], see §6.1

# ── Architecture ────────────────────────────────────────────────────────────
architecture:              # { narrative, flow[] }  — flow[] is an ordered stage list
components:                # [{ name, path, role }]
services:                  # [{ name, kind: internal|external, role }]
apis:                      # [{ method, path, purpose }]
contracts:                 # [{ name, shapeRef, direction: in|out }]
dataSources:               # [{ name, kind: live|mock|static|external, path? }]
signals:                   # [{ name, provenance, refreshCadence? }]
dependencies:              # [{ name, kind: internal|library|external-service, required: bool }]
sourceCodeReferences:      # [{ path, symbol?, lines?, note? }]   — drives CAT-07 drift detection

# ── Market ──────────────────────────────────────────────────────────────────
marketContext:             # MarketStudy, see CAPABILITY_ATLAS_CONTENT_STANDARD.md §5
marketEvidence:            # [ExternalEvidenceRef]
competitiveContext:        # [{ approach, actor?, overlap, difference }]
researchReferences:        # [ExternalEvidenceRef]

# ── Relationships ───────────────────────────────────────────────────────────
relatedCapabilities:       # [{ id, relation: depends-on|enables|complements|
                           #     alternative-to|supersedes|superseded-by }]
relatedExperiments:        # [{ ref, outcome? }]
relatedDecisions:          # [adrId]
relatedGovernance:         # [docPath]

# ── Discovery ───────────────────────────────────────────────────────────────
tags:                      # [tagId] from the controlled list
keywords:                  # [string], free
searchTerms:               # [string], synonyms and client vocabulary

# ── Stewardship ─────────────────────────────────────────────────────────────
owner:                     # string — a named accountable owner, not a team alias
createdAt:                 # ISO-8601 date
updatedAt:                 # ISO-8601 date
reviewedAt:                # ISO-8601 date — last human verification against implementation
version:                   # semver of the record content
```

---

## 4. Capability maturity model

The Atlas maturity taxonomy describes **how far a capability has travelled from idea to reusable
asset**. It is deliberately reconciled with the vocabulary already in use in this repository rather
than replacing it.

### 4.1 Reconciliation with existing terminology

`PLAN.md` and the UI already use: *POC Demo* (topbar badge), *Demo Mode*, *simulated write-back*,
*mock mode*, *Phase N* delivery sequencing. Those describe **delivery state of the demo application**.
Atlas maturity describes **the state of a capability as an asset**. They are orthogonal and both are
retained:

| Existing term | Meaning kept | Atlas equivalent |
|---------------|--------------|------------------|
| POC / demo | The whole application is a proof of concept | Does **not** cap a capability's maturity by itself |
| Mock mode / simulated | Data or effect is not real | `implementationStatus: simulated` (§6.2), independent of `maturity` |
| Phase N complete | Delivery milestone in `PLAN.md` | Evidence input to a maturity promotion, never automatic |

### 4.2 Levels

| Level | Meaning | Evidence required to *enter* this level |
|-------|---------|------------------------------------------|
| `concept` | An articulated idea with an innovation thesis. No code. | `innovationThesis`, `businessProblems`, `summary`. |
| `experiment` | Code exists that probes the idea. Results not yet judged. | ≥1 `sourceCodeReferences` entry; `usageInstructions`. |
| `validated-experiment` | The experiment produced a judged result, positive or negative. | ≥1 `validationEvidence` entry with an explicit outcome; `limitations` populated. |
| `demonstrable` | Can be shown end-to-end to an audience without narration filling gaps. | `demoScenarios` with at least the 3-minute and 10-minute paths; `demoReadiness` ≥ `demo-with-caveats`; `testingInstructions`. |
| `reusable-platform-capability` | Applies beyond its originating domain and is packaged to be reused. | `platformReusable: true`; ≥2 `crossDomainApplicability` entries of which ≥1 is `proven` or `likely` with rationale; `apis`/`contracts` documented. |
| `accelerator-candidate` | Proposed as a repeatable asset for client engagements. | Complete `marketContext` per the content standard; `differentiators`; `implementationReadiness` ≥ `hardened-prototype`. |
| `client-adaptation` | Has been adapted for, or shaped by, a specific client context. | Named engagement context in `relatedExperiments` or `validationEvidence`; adaptation limits recorded in `limitations`. |

### 4.3 Promotion rules

- Promotion is a **human decision recorded in the record**, supported by the evidence above. CAT-07
  automation may *block* or *flag*, never auto-promote.
- Promotion requires `reviewedAt` to be set to the promotion date.
- Demotion is legitimate and must be recorded, not hidden: if evidence expires or the implementation
  changes, a capability drops back a level with a note in `limitations`.
- A capability may be `demonstrable` while `implementationStatus: simulated`. That combination is
  **required** to be visible to the user — see §6.2 and the Demo Path warnings in §9.1.

---

## 5. Field tiers

### 5.1 Mandatory for any stored record

`id`, `name`, `slug`, `summary`, `domains` (or explicit `platform` placement), `capabilityType`,
`platformReusable`, `maturity`, `status`, `implementationStatus`, `owner`, `createdAt`, `updatedAt`,
`version`.

### 5.2 Mandatory additionally for `status: published`

`description`, `innovationThesis`, `businessProblems`, `personas`, `valueProposition`,
`limitations`, `sourceCodeReferences` **or** an explicit `roadmap` implementation status,
`usageInstructions`, `reviewedAt`, `tags`.

### 5.3 Recommended

`businessBenefits`, `differentiators`, `useCases`, `sampleScenarios`, `testingInstructions`,
`validationEvidence`, `architecture`, `components`, `apis`, `dataSources`, `signals`, `dependencies`,
`relatedCapabilities`, `crossDomainApplicability`, `questionsWorthAsking`, `keywords`, `searchTerms`.

### 5.4 Optional

`shortName`, `assumptions`, `uniqueness`, `clientQuestions`, `recommendedResponses`, `contracts`,
`services`, `marketContext`, `marketEvidence`, `competitiveContext`, `researchReferences`,
`relatedExperiments`, `relatedDecisions`, `relatedGovernance`, `demoScenarios` — each becomes
mandatory at the maturity or readiness thresholds in §7.

---

## 6. Validation rules

Implemented by the CAT-02 validator; enforced by CAT-07 automation.

**V1** Mandatory fields present and non-empty (§5.1); §5.2 additionally enforced when
`status: published`.
**V2** `id` unique across the record set; `slug` unique; `id` immutable across versions.
**V3** Every `domains`, `subDomains`, `businessProblems`, `personas` and `tags` value exists in
`CAPABILITY_TAXONOMY.md`. Unknown values fail — the taxonomy is closed, extended deliberately.
**V4** Every `relatedCapabilities[].id` resolves to an existing record. Dangling references fail.
**V5** `relatedCapabilities` relations are symmetric where symmetry is implied: `depends-on` ⇄
`enables`, `supersedes` ⇄ `superseded-by`. Asymmetry fails.
**V6** `platformReusable: true` requires at least two `crossDomainApplicability` entries.
**V7** Every enum field holds a declared value.
**V8** `maturity` is supported by the evidence its level requires (§4.2). Missing evidence fails.
**V9** Every `sourceCodeReferences[].path` exists in the repository at validation time.
**V10** Every claim-bearing external statement in `marketContext`, `marketEvidence`,
`competitiveContext` or `researchReferences` carries source URL, publisher and date
(`CAPABILITY_ATLAS_CONTENT_STANDARD.md` §5). Unsourced external claims fail.
**V11** `reviewedAt` ≥ `createdAt`; `updatedAt` ≥ `createdAt`.
**V12** `demoReadiness: demo-ready` or `client-ready` requires `demoScenarios` containing at least the
3-minute and 10-minute paths.
**V13** `implementationStatus` of `simulated`, `experimental` or `roadmap` requires at least one
`limitations` entry explaining what is not real.
**V14** No field value contains presentation markup (HTML tags, JSX, CSS). Markdown emphasis and lists
are permitted in narrative fields only.
**V15** `summary` ≤ 240 characters.

---

## 7. Publication readiness

A record may be published to Atlas surfaces only when all of the following hold:

- [ ] V1–V15 pass.
- [ ] `status: published` and `owner` names an accountable individual.
- [ ] `reviewedAt` is within the review window for its maturity:
      `concept`/`experiment` — 12 months · `validated-experiment`/`demonstrable` — 6 months ·
      `reusable-platform-capability`/`accelerator-candidate`/`client-adaptation` — 3 months.
- [ ] Any `marketEvidence` is within the freshness window in
      `CAPABILITY_ATLAS_CONTENT_STANDARD.md` §5.4, or is visibly flagged as stale.
- [ ] Completeness tier satisfied for the record's maturity:

| Maturity | Required beyond §5.2 |
|----------|----------------------|
| `concept` | — |
| `experiment` | `usageInstructions`, `sourceCodeReferences` |
| `validated-experiment` | + `validationEvidence`, `testingInstructions` |
| `demonstrable` | + `demoScenarios` (3-min, 10-min), `architecture`, `useCases` |
| `reusable-platform-capability` | + `apis` or `contracts`, `crossDomainApplicability`, `dependencies` |
| `accelerator-candidate` | + `marketContext`, `differentiators`, `competitiveContext` |
| `client-adaptation` | + `clientQuestions`, `recommendedResponses` |

### 6.1 EvidenceRef (internal)

```yaml
kind:      # test | build | code | demo-recording | review | measurement
ref:       # file path, test name, command, or artefact location
outcome:   # what it demonstrates, in one sentence
observedAt:# ISO-8601 date
observedBy:# person
```

### 6.2 Implementation status vocabulary

Used at record level *and* permitted at field level (a record may be `implemented` overall with a
`simulated` data source). CAT-03 must apply it at field level where the two differ.

| Value | Meaning |
|-------|---------|
| `implemented` | Real behaviour over real (for this repository, deterministic local) data paths. |
| `partially-implemented` | Core path works; a named part is missing or stubbed. |
| `simulated` | Behaviour is represented, not performed — static data, mocked effects, no write-back. |
| `experimental` | Present but unproven, may change or be withdrawn. |
| `roadmap` | Described only. No code. |

---

## 8. Audience lenses

Lenses are **presentation priorities over one record**. They must not create four copies of capability
documentation, and switching lens must not change any stored value.

| Lens | Prioritised fields (in order) | Suppressed to secondary |
|------|-------------------------------|-------------------------|
| **Innovation Executive** | `innovationThesis`, `businessProblems`, `valueProposition`, `marketContext`, `differentiators`, `maturity`, `validationEvidence`, `crossDomainApplicability`, next experiments (`relatedExperiments`) | `sourceCodeReferences`, `contracts`, `testingInstructions` |
| **Sales / client-facing** | `businessProblems`, `businessBenefits`, `useCases`, `demoScenarios`, `differentiators`, `clientQuestions`, `recommendedResponses`, objection handling (`limitations` framed as caveats), `relatedCapabilities`, `marketContext` | `architecture`, `components`, `sourceCodeReferences` |
| **Architect** | `architecture`, `services`, `apis`, `contracts`, `dependencies`, data flow (`architecture.flow`), `signals` provenance, extensibility (`crossDomainApplicability`), reuse model (`capabilityType`, `platformReusable`), `relatedDecisions` | `clientQuestions`, `recommendedResponses` |
| **Developer** | `sourceCodeReferences`, `components`, `apis`, `contracts`, `dataSources`, configuration (`dependencies`), `testingInstructions`, fixtures/seed data (`dataSources` where `kind: static`), `limitations`, `dependencies` | `marketContext`, `competitiveContext` |

Lens rules:

- Every lens shows `name`, `summary`, `maturity`, `implementationStatus` and `demoReadiness`. Those
  five are never suppressed — a Sales lens must never hide that a capability is simulated.
- Suppressed content is *one interaction away*, never removed.
- A lens is a view hint carried in the request; the API returns the same record with an ordering hint,
  not a different payload of content.

---

## 9. Structured enablement content

### 9.1 Demo Path

Every record with `demoReadiness` ≥ `demo-with-caveats` carries a `demoScenarios` array whose entries
use this shape:

```yaml
pathType:     # three-minute | ten-minute | technical-deep-dive | executive-discussion
title:
audience:     # personaId
durationMins:
steps:        # [{ action, whatToSay, whatToShow, expectedObservation }]
prerequisites:# [string] — data state, role, keys, demo mode
warnings:     # [string] — MANDATORY when implementationStatus is simulated/experimental/roadmap
followUps:    # [capabilityId] — where to go next depending on audience reaction
```

| Path | Shape |
|------|-------|
| **3-minute demo** | Very short executive demonstration: one problem, one capability, one outcome. |
| **10-minute demo** | Problem → capability → decision → business impact. |
| **Technical deep dive** | Architecture → services → contracts → signals → tests. |
| **Executive discussion** | Innovation thesis → differentiation → reuse → strategic potential. |

`warnings` is not optional decoration: a demo of a simulated capability that does not warn the
presenter is a governance failure (V13, and CAT-06's client-preparation pack depends on it).

### 9.2 Questions Worth Asking

Curiosity-led questions that help a user understand and demonstrate the capability. Each entry:

```yaml
question:       # the question to pose
whyItMatters:   # what understanding it unlocks
whatToLookFor:  # the observable answer in the product
```

Illustrative shape (for a demand/forecast-fusion style capability — note that no such capability
exists in this repository today, see `COGNIX_CAPABILITY_ATLAS.md` §1.1):

- What evidence is influencing this forecast?
- Which signal changed the forecast the most?
- What would cause CogniX to change its recommendation?
- Are we forecasting demand or simply extrapolating historic sales?
- What operational decision becomes incorrect if this signal is ignored?

CAT-03 must author these against capabilities that actually exist, using the same interrogative style.

---

## 10. Changelog

| Version | Date | Change | Work package |
|---------|------|--------|--------------|
| 1.0 | 2026-08-20 | Initial schema, maturity model, validation rules, lenses, Demo Path, Questions Worth Asking. | Atlas governance establishment |
