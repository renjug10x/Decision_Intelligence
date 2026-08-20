# CogniX Capability Atlas — Content, Evidence & Market Intelligence Standard

**Document type:** Atlas governance — content standard
**Owned by:** CogniX Capability Atlas programme (`COGNIX_CAPABILITY_ATLAS.md`)
**Binding on:** CAT-01 (inventory), CAT-03 (population), CAT-05/CAT-06 (generated content), CAT-07
(automated enforcement)

---

## 1. Scope

This standard governs what may be written into a capability record, what evidence a statement
requires, and how internal CogniX truth is kept distinct from external research. It applies equally to
content authored by a person and content produced by an AI surface.

---

## 2. Truthfulness gate

**The Atlas describes what CogniX does. It is not a marketing surface.**

Four rules, enforced by validation (`CAPABILITY_KNOWLEDGE_MODEL.md` §6) and by CAT-07 automation:

**T1 — No unbuilt capability may be published as built.** Every capability record carries
`implementationStatus` and, where anything is not real, at least one `limitations` entry explaining
what is not real (V13).

**T2 — Claims trace to evidence.** A statement about behaviour cites a source-code reference, a test,
a measurement or a demo recording (`EvidenceRef`). A statement that cannot be traced is either removed
or restated as an assumption in `assumptions`.

**T3 — Status is stated at field level when it differs from record level.** A record may be
`implemented` overall while its data source is `simulated`; the record must say so at the field, not
average it away.

**T4 — Absence is stated, not omitted.** "No reuse assessed yet", "no test coverage", "no market study
performed" are valid, publishable values. Silence is not.

### 2.1 Naming honesty

Capability names used illustratively at programme inception — *Demand Fusion*, *Decision Gap*,
*Forecast Regret*, *Signal Intelligence*, *Decision Consequence* — **do not exist in this repository**.
No record may be created for them unless and until an implementation exists, or the record is created
explicitly at `maturity: concept` with `implementationStatus: roadmap` and no behavioural claims.
See `COGNIX_CAPABILITY_ATLAS.md` §1.1.

---

## 3. Writing standard

| Rule | Detail |
|------|--------|
| Plain language first | `summary` and `valueProposition` must be intelligible to a non-technical executive. Jargon belongs in `architecture` and developer fields. |
| One idea per field | Do not smuggle architecture into `valueProposition` or value claims into `description`. |
| Concrete over abstract | "Detects week-over-week revenue decline beyond a configurable threshold" beats "leverages advanced analytics". |
| No presentation markup | Records contain content, not HTML/JSX/CSS (V14). Markdown emphasis and lists only, in narrative fields. |
| Quantities carry basis | A number without a basis (period, sample, method) is not publishable. "£42k revenue risk" needs to say over what horizon and from what calculation. |
| Second person for instructions | `usageInstructions` and `testingInstructions` address the reader directly and are executable as written. |
| No client-confidential detail | Client adaptations describe the pattern, not the client's data. |

---

## 4. Internal truth versus external research

> **CogniX-owned capability documentation, implementation evidence, architecture and testing remain
> authoritative for statements about what CogniX does.**

Google AI and external internet research may **explain, summarise, compare, contextualise, research
market evidence and provide current examples**. They may **never silently redefine a CogniX
capability**.

### 4.1 The three evidence classes

Every Atlas answer, pack or generated explanation must separate its content into these classes, and
they must be distinguishable structurally (in the API payload) and visually (in the UI):

| Class | Definition | Source of record |
|-------|------------|------------------|
| **From CogniX** | Internal governed evidence: capability records, source code, tests, measurements, demo recordings | Capability Knowledge Store |
| **Market Context** | Externally retrieved evidence about the market, research or comparable approaches | External sources, each with provenance |
| **AI Interpretation** | Synthesised reasoning, comparison or explanation that is neither a governed CogniX fact nor a sourced external fact | The model, labelled as such |

Rules:

- A **From CogniX** statement must cite a capability record id and, where behavioural, an evidence ref.
- A **Market Context** statement must carry source URL, publisher and date (§5.3). Without provenance
  it is not rendered (ADR-0007).
- An **AI Interpretation** statement may not assert a CogniX capability fact. If it needs one, it must
  cite the From CogniX statement it relies on.
- Merging the classes into one undifferentiated paragraph is a governance failure, regardless of how
  accurate the paragraph is.

See ADR-0004.

---

## 5. Market intelligence standard

### 5.1 The bar

Generic claims are rejected. "AI improves forecasting" is not market intelligence — it has no actor,
no measurement, no source and no date.

### 5.2 Required structure of a market study

Each substantive capability should, where appropriate, carry a `marketContext` with these sections:

| Section | Content |
|---------|---------|
| **Current Industry Approach** | What organisations commonly do today, with an example |
| **Observed Limitation** | Why the current approach may be insufficient, and for whom |
| **Emerging Direction** | What research, vendors or leading implementations are moving toward |
| **CogniX Position** | What CogniX is exploring — stated at its true maturity, not aspirationally |
| **Comparable Approaches** | Relevant commercial, academic or industry approaches |
| **Differentiation** | Where CogniX overlaps *and* where it differs. Overlap must be stated, not hidden |
| **Evidence** | The sources supporting the above |

A study that contains only *CogniX Position* and *Differentiation* is not a market study; it is a
pitch, and fails this standard.

### 5.3 ExternalEvidenceRef

```yaml
claim:          # the specific statement this source supports
sourceUrl:
sourceTitle:
publisher:      # organisation
publishedAt:    # ISO-8601 date, or "undated" — never guessed
retrievedAt:    # ISO-8601 date
retrievalMethod:# manual | search-grounding | api
confidence:     # high | medium | low
notes:          # scope limits, sample size, conflicts of interest
```

### 5.4 Freshness

| Evidence kind | Freshness window | Beyond the window |
|---------------|------------------|-------------------|
| Market and competitive claims | 12 months | Flagged stale; rendered with a visible staleness marker or refreshed |
| Vendor/product capability claims | 6 months | Flagged stale — vendor capability moves quickly |
| Academic/research references | 36 months | Retained, with publication date shown |
| Internal evidence (`EvidenceRef`) | Governed by the record's review window (`CAPABILITY_KNOWLEDGE_MODEL.md` §7) | Record flagged for review |

Stale evidence is **flagged, never silently served** (CAT-07).

### 5.5 Competitive claims

Any statement that CogniX is better, faster, cheaper or more novel than a named alternative requires:
the specific dimension of comparison, the evidence for CogniX's side, the evidence for the
alternative's side with provenance, and the date. Comparative claims without both sides evidenced are
downgraded to *Differentiation* statements about CogniX's own approach.

---

## 6. Provenance requirements

| Requirement | Applies to |
|-------------|-----------|
| Every external claim carries source, publisher, publication date and retrieval date | `marketContext`, `marketEvidence`, `competitiveContext`, `researchReferences`, all CAT-06 output |
| Every internal behavioural claim carries an `EvidenceRef` | `validationEvidence`, `businessBenefits[].evidence` |
| Every AI-generated answer carries per-claim citations to record ids | CAT-05, CAT-06 output |
| Every record carries `owner`, `reviewedAt`, `version` | All records |
| Provenance survives caching | CAT-06 cache entries store provenance with the content, never the content alone |

Where provenance is technically unavailable (for example a grounding response that returns no source),
the claim is dropped, not published with an empty citation.

---

## 7. Review and ownership

- Every record names an accountable individual in `owner`. A team alias is not an owner.
- `reviewedAt` means *a human verified this record against the implementation on that date*. It is not
  a save timestamp; `updatedAt` is.
- Review windows are in `CAPABILITY_KNOWLEDGE_MODEL.md` §7.
- CAT-07 automates the flagging of overdue reviews, changed source files and stale market evidence.
  Automation flags; humans decide.

---

## 8. Content checklist for CAT-03 authors

Before marking a record `status: published`:

- [ ] `summary` readable by a non-technical executive, ≤ 240 characters.
- [ ] `implementationStatus` correct at record level and at field level where they differ.
- [ ] Every behavioural claim has a source-code reference or an evidence ref.
- [ ] `limitations` is populated and honest — including "not tested", "static data", "no write-back".
- [ ] Simulated, experimental or roadmap aspects are visible to a Sales lens, not only a Developer lens.
- [ ] `crossDomainApplicability` stated, including `not-assessed` where true.
- [ ] Market claims follow §5, with provenance per §5.3, or `marketContext` is absent rather than thin.
- [ ] Demo Path `warnings` present for anything not fully real.
- [ ] `owner` and `reviewedAt` set.
- [ ] Validator passes.
