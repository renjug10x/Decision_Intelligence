# COGNIX CAPABILITY KNOWLEDGE MODEL

**Document Status:** Approved & Authoritative (design only — not implemented)
**Version:** 1.0.0
**Effective Date:** August 2026
**Owner:** G10X Enterprise Innovation Lab Architecture Board
**Implemented by:** `ATL-02` · **Populated by:** `ATL-03` · **Automated by:** `ATL-07`

---

## 1. Purpose and Boundary

This document specifies the knowledge the Capability Atlas adds **on top of** the registries CogniX
already has. It is an extension specification, not a competing model (ADR-045).

**What this document does not own, and never restates:**

| Concept | Owned by |
|---------|----------|
| The `CognixSolution` contract and its fields | [`DEMONSTRATION_SOLUTION_MODEL.md`](DEMONSTRATION_SOLUTION_MODEL.md) + `config/solutions.ts` |
| The Innovation Experiment schema | [`EXPERIMENT_MODEL.md`](EXPERIMENT_MODEL.md) + `config/experiments.ts` |
| Innovation lifecycle states | [`EXPERIMENT_LIFECYCLE.md`](EXPERIMENT_LIFECYCLE.md) |
| IP classification and value progression | [`IP_GOVERNANCE.md`](IP_GOVERNANCE.md) |
| Domain catalogue | `config/domains.ts` (`DOMAIN_CATALOGUE`) |
| Persona / decision-lens catalogue | `config/personas.ts` (`PERSONA_CATALOGUE`) |
| Enterprise learning patterns | `config/patterns.ts` |
| Evidence, provenance and honesty rules | [`COGNIX_PRINCIPLES.md`](COGNIX_PRINCIPLES.md) Principle 13 |
| The Five-Second Rule and word ceiling | [`UX_DESIGN_PRINCIPLES.md`](../ux/UX_DESIGN_PRINCIPLES.md) §3 |

Two consequences are binding:

1. **One capability, one identity.** A capability is identified by its existing `SOL-*` or `EXP-*`
   identifier. The Atlas never mints a second identity, and a capability present in the Atlas but in no
   registry is a defect (ADR-045).
2. **Reference, never copy.** Registry fields are read through the reference, not duplicated into Atlas
   knowledge. A copied field will drift, and a drifted copy is indistinguishable from a correct one to
   the reader.

---

## 2. The knowledge extension

```yaml
# ── Binding to the existing registry (mandatory) ─────────────────────────────
capabilityRef:             # 'SOL-PROMO-01' | 'EXP-COMMITMENT-01' | … must resolve
assetType:                 # demonstration-solution | innovation-experiment |
                           # enabling-service | governance-control | experience

# ── Narrative the registry does not carry ────────────────────────────────────
innovationThesis:          # why this is worth exploring at all
description:               # the "what it is" body
usageInstructions:         # how a user exercises it today, executable as written
testingInstructions:       # how an engineer verifies it

# ── Maturity — three orthogonal dimensions (ADR-047) ─────────────────────────
lifecycleState:            # Concept | Research | Prototype | Pilot Ready |
                           #   Accelerator | Industry Pattern | Retired
                           #   — owned by EXPERIMENT_LIFECYCLE.md
demoMaturityRef:           # read from CognixSolution.demoMaturity, not restated
implementationStatus:      # implemented | partially-implemented | simulated |
                           #   experimental | concept | roadmap   (see §3)
fieldStatus:               # [{ field, implementationStatus, note }] — where a part
                           #   differs from the whole. Required when they differ.

# ── Architecture ─────────────────────────────────────────────────────────────
architecture:              # { narrative, flow[] } — ordered stage list
components:                # [{ name, path, role }]
services:                  # [{ name, kind: internal|external, role }]
apis:                      # [{ method, path, purpose }]
contracts:                 # [{ name, path, direction: in|out }] — packages/contracts refs
dataSources:               # [{ name, kind: live|synthetic|static|external, path? }]
signals:                   # [{ name, provenanceClass, refreshCadence? }] — ESF-1 refs
dependencies:              # [{ ref, kind: hard|integration|enhancement }]
implementationReferences:  # [{ path, symbol?, note? }] — drives ATL-07 drift detection

# ── Validation ───────────────────────────────────────────────────────────────
validationEvidence:        # [EvidenceRef] — see §4
testRunners:               # ['tests/unit/run-ddf01-tests.ts', …]
acceptanceCriteriaRefs:    # ['AC-DDF-21', …] — binds a capability to its governed ACs
knownLimitations:          # [{ limitation, severity: low|medium|high, appliesTo? }]
openDefects:               # [{ ref, summary }] — e.g. D-DDF-*, D-INT-* still applicable
assumptions:               # [string]

# ── Enablement ───────────────────────────────────────────────────────────────
useCases:                  # [{ title, context, outcome }]
sampleScenarios:           # [{ title, narrative }]
demoScenarios:             # [DemoPath] — see §5
questionsWorthAsking:      # [CuriosityQuestionRef | CuriosityQuestion] — see §6
clientQuestions:           # [{ question, audience, difficulty }]
recommendedResponses:      # [{ questionRef, response, evidenceRefs[] }]

# ── Reuse ────────────────────────────────────────────────────────────────────
crossDomainApplicability:  # [{ domainId, applicability: proven|likely|hypothetical|
                           #    not-assessed, rationale, evidence? }]
platformReusable:          # boolean — derived claim, must be justified

# ── Market ───────────────────────────────────────────────────────────────────
marketContext:             # MarketStudy — see §7
competitiveContext:        # [{ approach, actor?, overlap, difference }]
externalEvidence:          # [ExternalEvidenceRef] — see §7.2

# ── Relationships ────────────────────────────────────────────────────────────
relatedCapabilities:       # [{ ref, relation: depends-on|enables|complements|
                           #    alternative-to|supersedes|superseded-by }]
relatedDecisions:          # [adrId] — e.g. ADR-041
relatedGovernance:         # [docPath]
relatedPatterns:           # [PAT-*]

# ── Discovery ────────────────────────────────────────────────────────────────
tags:                      # [tagId]
searchTerms:               # synonyms and client vocabulary
retrievalMetadata:         # { indexable: bool, chunkingHint?, embeddingScope? }

# ── Stewardship ──────────────────────────────────────────────────────────────
owner:                     # a named accountable individual, not a team alias
ipClassification:          # from IP_GOVERNANCE.md §2 — see §8 note
createdAt: / updatedAt: / reviewedAt:   # ISO-8601; reviewedAt = human verification
version:                   # semver of the knowledge record
```

---

## 3. Implementation status

Introduced by ADR-047 because no existing vocabulary owns it. It answers a question neither the
lifecycle nor demo maturity answers: **is the thing behind this screen actually computing?**

| Value | Meaning |
|-------|---------|
| `implemented` | Real behaviour over the estate's real (synthetic but computed) data paths |
| `partially-implemented` | Core path computes; a named part is missing or stubbed |
| `simulated` | Behaviour is represented, not performed — static data, modelled constants, no effect |
| `experimental` | Present but unproven; may change or be withdrawn |
| `concept` | Articulated and governed, no code |
| `roadmap` | Described in a plan only |

**Recordable at field level.** A capability may be `implemented` overall while one displayed figure is
`simulated`; `fieldStatus` records that. This is the direct governance response to the `DDF-01` defect
class — `D-DDF-1` (hardcoded JSX standing in for an engine call), `D-DDF-3` (an ARIMA/Prophet/GenAI
selector implemented as sine and cosine factors), `D-DDF-2` (an unsupported accuracy claim). Principle
12's *No Literal Standing In For A Calculation* is the rule; `fieldStatus` is how the Atlas records
compliance with it.

**The three dimensions never imply one another.** A capability may be `Production Ready` for
demonstration, `Prototype` in lifecycle, and `simulated` in implementation. That combination is
legitimate in a demonstration estate and dangerous only when hidden — so the Atlas shows all three
together or none (ADR-047).

---

## 4. Evidence

```yaml
# EvidenceRef (internal)
kind:        # test | build | code | measurement | demo-recording | review | report
ref:         # file path, test runner, assertion name, command, or docs/reports/ path
outcome:     # what it demonstrates, one sentence
observedAt:  # ISO-8601
observedBy:  # person
```

The estate's `docs/reports/` work-package reports and `tests/unit/run-*-tests.ts` runners are
first-class evidence and should be referenced in preference to prose restatement.

---

## 5. Demo Path

Every capability whose `demoMaturityRef` supports demonstration carries `demoScenarios`:

```yaml
pathType:      # three-minute | ten-minute | technical-deep-dive | executive-discussion
title:
audience:      # personaId from config/personas.ts
durationMins:
steps:         # [{ action, whatToSay, whatToShow, expectedObservation }]
prerequisites: # data state, persona, domain pack, keys, demo mode
warnings:      # MANDATORY when implementationStatus or any fieldStatus is not `implemented`
followUps:     # [capabilityRef]
```

| Path | Shape |
|------|-------|
| **3-minute** | One problem, one capability, one outcome. Matches the `EXPERIMENT_LIFECYCLE.md` Prototype exit criterion — a 3-minute executive walkthrough without errors |
| **10-minute** | Problem → capability → decision → business impact |
| **Technical deep dive** | Architecture → services → contracts → signals → tests |
| **Executive discussion** | Innovation thesis → differentiation → reuse → strategic potential |

`warnings` is not decoration. A demo of a simulated capability that does not warn the presenter is a
governance failure, and `ATL-06`'s client-preparation pack depends on this field being honest.

Demo Path is also the destination for presenter notes and timings preserved from the Architectural
Storyboard (ADR-051, `SB-GATE-5`), including the `DEMO_OPERATING_MODEL.md` facilitation timings.

---

## 6. Questions Worth Asking

CogniX **already implements this** as `CuriosityQuestion` in `components/QuestionsWorthAsking.tsx`,
with `question`, `category`, `whyAsking`, `targetExperimentId`, `targetSolutionId`,
`summaryNarrative` and `evidencePoints`. It directly serves Principle 3 — *Curiosity is the primary
UX*.

**The Atlas does not redefine it.** `ATL-02` migrates that content out of the component into the
registry (ADR-046) and the component becomes a renderer. Atlas capability records reference the
migrated questions by id and may add capability-scoped questions in the same shape.

The existing `evidencePoints` field is retained and, under Principle 13, each point should be
traceable rather than merely quantified.

---

## 7. Market intelligence

### 7.1 The bar

Generic claims are rejected. *"AI improves forecasting"* has no actor, no measurement, no source and no
date — it fails for the same reason `D-DDF-2` failed. A `marketContext` carries:

| Section | Content |
|---------|---------|
| Current industry approach | What organisations commonly do today, with an example |
| Observed limitation | Why that is insufficient, and for whom |
| Emerging direction | What research, vendors or leading implementations move toward |
| CogniX position | What CogniX explores — at its true maturity on all three dimensions |
| Comparable approaches | Commercial, academic or industry |
| Differentiation | Where CogniX overlaps **and** where it differs. Overlap is stated, not hidden |
| Evidence | The sources supporting the above |

A study containing only *CogniX position* and *Differentiation* is a pitch, not a market study.

### 7.2 ExternalEvidenceRef

```yaml
claim:            # the specific statement this source supports
sourceUrl: / sourceTitle: / publisher:
publishedAt:      # ISO-8601 or "undated" — never guessed
retrievedAt:
retrievalMethod:  # manual | search-grounding | api
confidence:       # high | medium | low
notes:            # scope limits, sample size, conflicts of interest
```

### 7.3 Freshness

| Evidence kind | Window | Beyond it |
|---------------|--------|-----------|
| Market and competitive claims | 12 months | Flagged stale or refreshed |
| Vendor/product capability claims | 6 months | Flagged stale — vendor capability moves quickly |
| Academic references | 36 months | Retained, publication date shown |
| Internal `EvidenceRef` | The record's review window (§9) | Record flagged for review |

Stale evidence is flagged, never silently served (`ATL-07`).

Any claim that CogniX is better, faster or more novel than a named alternative requires the dimension
of comparison, evidence for both sides with provenance, and a date. Otherwise it is downgraded to a
statement about CogniX's own approach.

---

## 8. Audience lenses

Lenses are **presentation priorities over one record**, driven by `config/personas.ts`
(`PersonaItem.decisionLens`). They never fork the record and switching a lens changes no stored value.

| Lens (persona) | Prioritised | Secondary |
|----------------|-------------|-----------|
| **Innovation Executive** | `innovationThesis`, business problem, `marketContext`, differentiation, all three maturity dimensions, `validationEvidence`, `crossDomainApplicability`, next experiments | `implementationReferences`, `contracts`, `testingInstructions` |
| **Sales / client-facing** | Business problem, outcomes, `useCases`, `demoScenarios`, differentiation, `clientQuestions`, `recommendedResponses`, `knownLimitations` as caveats, `relatedCapabilities`, `marketContext` | `architecture`, `components`, `implementationReferences` |
| **Architect** | `architecture`, `services`, `apis`, `contracts`, `dependencies`, `signals` provenance, extensibility, reuse model, `relatedDecisions` | `clientQuestions`, `recommendedResponses` |
| **Developer / Test engineer** | `implementationReferences`, `components`, `apis`, `contracts`, `dataSources`, `testingInstructions`, `testRunners`, `acceptanceCriteriaRefs`, `knownLimitations`, `openDefects` | `marketContext`, `competitiveContext` |

**Never suppressed by any lens:** capability name, the registry's `fiveSecondProposition`, all three
maturity dimensions, and `knownLimitations`. A Sales lens must never hide that a capability is
simulated.

Suppressed content is one interaction away, never removed. The API returns the same record with an
ordering hint, not different content.

**IP classification note (for `ATL-01`, not to be fixed here):** `IP_GOVERNANCE.md` §2 defines five
classifications — `Open Innovation`, `G10X Proprietary`, `Client Confidential`, `Joint Innovation`,
`Client Exclusive` — while `CognixSolution.dataClassification` admits `Open Innovation`,
`G10X Accelerator`, `Client Confidential`. `G10X Accelerator` is not in the IP hierarchy. This
pre-existing divergence is recorded as an `ATL-01` audit input and is **not** resolved by the Atlas.

---

## 9. Validation rules

Implemented by the `ATL-02` validator, enforced by `ATL-07`.

**V1** `capabilityRef` resolves to an existing `SOL-*` or `EXP-*` entry. Unresolvable fails.
**V2** No Atlas field duplicates a value the registry owns (ADR-045).
**V3** All `domainId`, persona and tag values exist in `config/domains.ts` / `config/personas.ts` /
the tag vocabulary. Unknown values fail.
**V4** Every `relatedCapabilities[].ref` resolves; dangling references fail.
**V5** Symmetric relations are symmetric: `depends-on` ⇄ `enables`, `supersedes` ⇄ `superseded-by`.
**V6** All three maturity dimensions present (ADR-047). `fieldStatus` required where any part differs
from the whole.
**V7** `implementationStatus` of `simulated`, `experimental`, `concept` or `roadmap` requires at least
one `knownLimitations` entry explaining what is not real.
**V8** Every `implementationReferences[].path` exists in the repository at validation time.
**V9** Every external claim carries source, publisher, publication date and retrieval date (§7.2).
Unsourced external claims fail.
**V10** `platformReusable: true` requires at least two `crossDomainApplicability` entries with
rationale.
**V11** No field value contains presentation markup. Markdown emphasis and lists in narrative fields
only.
**V12** `demoScenarios` warnings non-empty where `implementationStatus` or any `fieldStatus` is not
`implemented`.
**V13** `reviewedAt` ≥ `createdAt`; `updatedAt` ≥ `createdAt`.
**V14** `owner` names an individual.

### 9.1 Publication readiness

Publishable when V1–V14 pass, `owner` and `reviewedAt` are set, market evidence is within its window
or visibly flagged, and the completeness tier for the capability's lifecycle state is met:

| Lifecycle state | Required beyond the mandatory set |
|-----------------|-----------------------------------|
| `Concept` | `innovationThesis` |
| `Research` | + business problem, `assumptions` |
| `Prototype` | + `usageInstructions`, `implementationReferences`, `architecture`, `demoScenarios` (3-min) |
| `Pilot Ready` | + `testingInstructions`, `testRunners`, `validationEvidence`, `apis` or `contracts` |
| `Accelerator` | + `crossDomainApplicability`, `marketContext`, `competitiveContext`, `dependencies` |
| `Industry Pattern` | + `clientQuestions`, `recommendedResponses`, full Demo Path set |
| `Retired` | + retirement rationale; retained for provenance per `EXPERIMENT_LIFECYCLE.md` §3 |

Review windows: `Concept` / `Research` — 12 months · `Prototype` / `Pilot Ready` — 6 months ·
`Accelerator` / `Industry Pattern` — 3 months.

**Promotion is a human decision recorded in the record.** `ATL-07` automation flags and blocks; it
never promotes (ADR-047). Demotion is legitimate and is recorded, not hidden.

---

## 10. Changelog

| Version | Date | Change | WP |
|---------|------|--------|-----|
| 1.0.0 | 2026-08-20 | Initial knowledge extension over `CognixSolution` / experiment registries; three-dimension maturity per ADR-047; lenses bound to `config/personas.ts`; Demo Path; Questions Worth Asking bound to the existing `CuriosityQuestion`; market and validation rules. | Atlas governance recovery |
