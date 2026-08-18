# COGNIX — ESF-6 / Y3a DESIGN GATE (FROZEN)
## Attested Observation Admission

**Type:** Design gate. No product code changed in this pass.
**Baseline:** `4e659eed00207f1341b5da76ed84953f20082b9a`
**Branch:** `Feature/MatchingContract-AutoActivate`
**Date:** 2026-08-16
**Status:** **FROZEN — E1–E7 RESOLVED. Ready for implementation.**
**Predecessor gate:** `docs/reports/COGNIX_CDI_08_OBSERVATION_CORRESPONDENCE_DESIGN_GATE.md`
(this gate is the delta only; the Programme 10 consolidation analysis is not restated)

**Predicate owned:** `source × context → authority`.
**Predicate NOT owned:** `contract × observation → comparability` — that is CDI-08, unchanged (ADR-037).

---

## 1. The one sentence this work package must make true

> `synthetic_demo = false` is truthful because a **server-side registered attested source** produced
> the observation through an admitted path — never because a request payload said so.

Everything below is the minimum structure that makes that sentence enforceable, plus the receipt
that lets CDI-08 reach `WITHIN_DECLARED_ENVELOPE` honestly.

---

## 2. What is actually broken at this baseline

Verified in code, not inferred. Five sites, four of them latent-and-armed by this very work package.

| # | Site | Defect |
|---|---|---|
| **D-1** | [`REFERENCE_CONNECTOR_REGISTRY`](services/world/src/external-signal-connector.ts:28) | A static array of seven descriptors, every one `synthetic_demo: true`. There is **no registration path** for a non-synthetic source. `synthetic_demo=false` is unrepresentable. |
| **D-2** | [`registerExternalSignalConnector`](services/world/src/external-signal-connector.ts:140) | A self-declared lab backdoor that *can* set `synthetic_demo: false` on a descriptor with no attestation whatsoever. Its own comment names ESF-6 as its successor. |
| **D-3** | [`adaptEnterpriseSignalToOutcomeObservation`](lib/campaign-learning-loop-engine.ts:1285) | `const synthetic = input.signal.synthetic_demo \|\| connector?.synthetic_demo \|\| true;` — the trailing `\|\| true` makes the expression a **constant**. |
| **D-4** | [`determineObservationAuthority`](packages/contracts/src/campaign-learning-loop-model.ts:742) | Reads `observation.source_type` — a **caller-supplied field** — through `isObservationIndependentSourceType`. Reads `provenance.envelope_id` / `provenance.connector_id` for **presence only**, never verifying either against a server record. Both are caller-asserted authority inputs. |
| **D-5** | [`validateDecisionContract`](packages/contracts/src/campaign-decision-contract-model.ts:1081) | `pre_declaration_witness` is validated only as *one of two literals*. **A caller may declare `'SERVER_REGISTRATION_RECEIPT'` on its own contract.** [engine:692](lib/campaign-learning-loop-engine.ts:692) then sets `within_declared_envelope = true` and `deriveComparisonVerdict` publishes `WITHIN_DECLARED_ENVELOPE`. |

**D-5 is a fourth fail-open of the class the CDI-08 sequencing rule named** (alongside R2, R3, R6). It
is inert today for one reason only: nothing reaches `AUTHORITATIVE_EXTERNAL`, so no `LIKE_FOR_LIKE`
row exists to carry it. **ESF-6 is the change that arms it.** Correcting D-5 is therefore not
optional polish — it is a precondition for admitting anything at all, and it is why §6 removes the
witness from the caller's hands *in the same work package* that makes authority reachable.

D-1 through D-4 are why `AUTHORITATIVE_EXTERNAL` is unreachable. **D-5 is why making it reachable is
dangerous.** Both halves land together or neither lands.

---

## 3. Owner rulings E1–E7 — RESOLVED

All seven resolve from code and from already-approved rulings (Z2, Z3, X1, G4). **No blocking owner
decision is escalated.**

### E1 — Attested sources live in a *separate* ESF-6 registry, not as ESF-3 descriptors
**RESOLVED: APPROVED.**

`ExternalSignalConnectorDescriptor` cannot express what authority requires: tenant ownership,
attestation identity, allowed observation categories, allowed grain capability, allowed measurement
basis. Widening it would put attestation fields on seven synthetic reference adapters that will
never carry them, and would make `synthetic_demo` a mutable property of an ESF-3 descriptor — which
is precisely D-2 institutionalised.

> **Ruling.** ESF-3 remains provider-neutral, synthetic, and **untouched**. ESF-6 introduces
> `AttestedObservationSource` in its own registry with its own lifecycle. Source resolution
> federates: **ESF-6 attested registry first, ESF-3 reference registry second.** A `source_id` never
> collides with a `connector_id` because the former is server-issued under a reserved prefix (§4.3).

### E2 — Authority derives from the registered source; the payload can only ever *lose* authority
**RESOLVED: APPROVED.** This is the E1 corollary and the whole point of the work package.

The existing shape is already almost right: `determineObservationAuthority` reads
`context.connector_synthetic_demo` from the server-side registry, and the payload's own
`synthetic_demo` flags can only force `SYNTHETIC_DEMONSTRATION`. The corrections are D-3 (delete the
constant), D-4 (derive `source_type`, verify the receipt) and the addition of a source whose
registered `synthetic_demo` is legitimately `false`.

> **Ruling.** `effective_synthetic = payload.synthetic_demo || payload.provenance.synthetic_demo ||
> source.synthetic_demo`. The disjunction is **monotone toward synthetic** and must stay that way: a
> payload may declare itself synthetic and be believed; it may declare itself real and be ignored.

### E3 — The witness is a server-derived *output*, never a contract *input*
**RESOLVED: APPROVED. This is the D-5 correction.**

`pre_declaration_witness` sits on `DeclaredPredictionEnvelope`, which is covered by
`contract_digest` (Z1). A receipt is issued **after** the contract exists and therefore after its
digest is fixed. Writing the receipt back into the envelope would change the digest the receipt was
issued for — circular, and it would break every CDI-07B artefact bound on that digest.

> **Ruling.** On a caller-supplied contract, `pre_declaration_witness` **must equal `'NONE'`**
> (new invariant **C-INV-ENV-6**, fail-closed). The union member `'SERVER_REGISTRATION_RECEIPT'` is
> retained in the type but becomes **unconstructible by a caller**. The witness is evaluated at
> comparison time from receipt state (§6) and surfaced on the derived
> `PredictionError.declared_envelope.pre_declaration_witness` — an output field, outside every digest.

CDI-08's `deriveComparisonVerdict` needs **no change**: it already gates `WITHIN` on
`within_declared_envelope === true`.

### E4 — Precedence is proved by a monotonic server sequence, never by a timestamp
**RESOLVED: APPROVED.**

Z2 requires "an instant the caller does not author." A server wall-clock reading would satisfy the
letter and violate the estate's standing rule that wall-clock values are never decision logic or
ranking inputs — and it would make the witness non-deterministic and untestable.

> **Ruling.** Every receipt carries `sequence: number` drawn from a **per-tenant strictly monotonic
> integer counter** held in the receipt store. Precedence is the integer comparison
> `contract_receipt.sequence < observation_receipt.sequence`. Timestamps may be *recorded* on a
> receipt for display and audit; they are **never read** by any predicate, ordering or ranking.
> `Date.now()` must not appear in receipt issuance, witness evaluation or admission
> (contrast [`ingest_id`](services/world/src/external-signal-connector.ts:267), which may keep it —
> it is a correlation label, not a predicate input).

**Lifetime invariant, load-bearing:** the counter and the receipt store **share one lifetime**. A
receipt is never reconstructible after the counter it was drawn from is lost. On process restart
both are empty, every receipt lookup misses, and the witness fails closed to `NONE` — which is the
correct answer, not a degradation.

### E5 — `registerExternalSignalConnector` is deleted when ESF-6 lands
**RESOLVED: APPROVED.**

D-2 is a self-declaring backdoor whose own comment says "Attested registration is ESF-6; this is
superseded when it lands." Leaving it beside an attested registry would leave two paths to
authority, one of which requires a string literal.

> **Ruling.** Delete the function and its acknowledgement literal. The CDI-08 suite's authoritative
> fixtures migrate to the attested-source path (§9, binding condition 3). **The 44 CDI-08 assertions
> must survive unchanged in meaning** — only how an authoritative observation is minted changes.

### E6 — Source capability is an *admission* test and does not substitute for CDI-08 correspondence
**RESOLVED: APPROVED, NARROWED.**

A registered source declares what it is *capable* of observing. CDI-08 independently tests whether a
given observation *corresponds* to a given contract. These have different subjects and must both run.

> **Ruling.** Capability refusal at admission (§5, tests A4–A7) never marks an observation
> comparable, and capability acceptance never pre-satisfies any CDI-08 test. An observation that
> clears every admission test is still fully re-evaluated by C0–C8 with **no test skipped and no
> shortcut**. Authority never bypasses correspondence.

### E7 — Confidence and quality remain permanently outside authority
**RESOLVED: APPROVED — restates G4, made enforceable.**

The 80 / 85 defaults at
[`normaliseEnvelopeToEnterpriseSignal`](packages/contracts/src/external-signal-connector-model.ts:292)
are adapter fill-ins. `determineObservationAuthority` does not read them today and must never begin to.

> **Ruling.** ESF-6 delivers the R5 provenance-classification slice — each of `confidence` and
> `quality` is stamped `SUPPLIED` or `ADAPTER_DEFAULT` — **and a permanent regression asserting that
> neither value nor classification appears anywhere in the authority conjunction.** High confidence
> never creates authority. ESF-4 grades what ESF-6 has already admitted.

---

## 4. Contract deltas — minimum additive extension

### 4.1 New: `packages/contracts/src/attested-observation-model.ts`

A new file, not a widening of an existing one. It imports from `enterprise-signal-model` and
`external-signal-connector-model`; **nothing imports back into it** (no cycle, CDI-06 R1 precedent).

```ts
export type AttestedSourceStatus = 'ACTIVE' | 'DISABLED' | 'REVOKED';

/** Closed. What a source is permitted to assert an observation ABOUT. */
export type ObservationCategory = 'REALISED_COMMERCIAL_ACTUAL' | 'REALISED_OPERATIONAL_ACTUAL';

/** Closed. The measurement designs a source is permitted to declare.
 *  CONTROLLED_DIFFERENCE is deliberately absent — CDI-08 §4.4 rejects it at validation, and a
 *  source must not be able to declare a capability the estate refuses to honour. */
export type AttestedMeasurementBasis = 'DIRECT_MEASUREMENT' | 'MODELLED';

/** A composite grain the source can observe at. Dimension sets, never individual dimensions —
 *  the capability question is "can you produce the joint cell?", which Z4 makes indivisible. */
export interface AttestedGrainCapability {
  dimensions: GrainDimension[];        // structural twin of the CDI-08 type; set semantics
}

export interface SourceAttestation {
  /** Named accountable human. Mandatory, never defaulted, never inferred from a session or header. */
  attested_by: string;
  /** What is being attested and on what authority. Mandatory, non-empty after trim. */
  attestation_statement: string;
  /** Closed single member. This is an operator declaration recorded server-side, NOT a
   *  cryptographic proof — see §10. It must never be rendered as one. */
  attestation_kind: 'FIRST_PARTY_OPERATOR_ATTESTATION';
}

export interface AttestedObservationSource {
  /** SERVER-ISSUED. Reserved prefix `asrc_`. A caller-supplied value is rejected, never honoured. */
  source_id: string;
  /** SERVER-ISSUED at registration. Reserved prefix `att_`. */
  attestation_id: string;
  tenant_id: string;                   // ownership; a foreign tenant never resolves this source
  display_name: string;
  /** Reused from ESF-3 unchanged — this is what maps to SignalSourceType. No new category. */
  category: ExternalSignalCategory;
  observation_categories: ObservationCategory[];
  supported_signal_types: CanonicalSignalType[];      // no widening of CanonicalSignalType
  supported_grain_capabilities: AttestedGrainCapability[];
  supported_measurement_bases: AttestedMeasurementBasis[];
  attestation: SourceAttestation;
  status: AttestedSourceStatus;
  /** SERVER-DERIVED, never accepted from a request body. `false` only via the attested path. */
  synthetic_demo: boolean;
  schema_version: string;
}

export type ReceiptKind =
  | 'SOURCE_REGISTRATION'
  | 'CONTRACT_REGISTRATION'
  | 'OBSERVATION_ADMISSION';

export interface ServerReceipt {
  /** SERVER-ISSUED. Reserved prefix `rcpt_`. */
  receipt_id: string;
  kind: ReceiptKind;
  tenant_id: string;
  session_id?: string;
  /** E4 — per-tenant strictly monotonic. THE ONLY ordering input. Never a timestamp. */
  sequence: number;
  /** What was registered: source_id | contract_id | observation_id. */
  subject_id: string;
  /** CONTRACT_REGISTRATION only — the digest at registration, proving envelope immutability. */
  contract_digest?: string;
  /** OBSERVATION_ADMISSION only — the source that produced it. */
  source_id?: string;
  /** Recorded for audit and display ONLY. Never read by any predicate, ordering or ranking (E4). */
  issued_at_display: string;
  schema_version: string;
}
```

### 4.2 `campaign-learning-loop-model.ts` — additive shape, narrowing behaviour

On `OutcomeObservation`, all **server-written**, never accepted from a request body:

```ts
  /** Present ⇒ this observation was admitted through the ESF-6 attested path. */
  admission_receipt_id?: string;
  source_id?: string;
```

On `EvidenceProvenance`, origin gains one member and R5 lands:

```ts
  origin: 'ESF-3_CONNECTOR' | 'ESF-1_SIMULATION' | 'WP10-C_SCENARIO'
        | 'ESF-6_ATTESTED_SOURCE'          // new
        | 'UNKNOWN';
  /** R5 / E7 — never an authority input. */
  confidence_provenance?: 'SUPPLIED' | 'ADAPTER_DEFAULT';
  quality_provenance?: 'SUPPLIED' | 'ADAPTER_DEFAULT';
  attestation_id?: string;
  admission_receipt_id?: string;
```

`ObservationAuthorityEvaluationContext` gains the two receipt-verified facts D-4 needs. **No existing
field is removed or renamed**, so every CDI-07B and CDI-08 call site compiles unchanged:

```ts
  /** Server-verified: the admission receipt resolves and belongs to this tenant. */
  admission_receipt_resolves: boolean;
  /** Server-derived from the registered source's category. Overrides any payload source_type. */
  resolved_source_type?: SignalSourceType;
```

`determineObservationAuthority` — **narrowing only**, ordering preserved so every existing verdict
string still lands where CDI-07B and CDI-08 assert it:

1. The synthetic disjunction (E2) is evaluated **first and independently**, unchanged (RB-3 / X1).
2. The `isObservationIndependentSourceType` test reads `context.resolved_source_type` when present
   and **falls back to `observation.source_type` only for the ESF-3 path** — where it is already
   inert, because every ESF-3 connector is synthetic and step 1 has already returned.
3. `UNATTRIBUTED` additionally when `origin === 'ESF-6_ATTESTED_SOURCE'` and
   `admission_receipt_resolves === false`. **A claimed attested origin without a resolving receipt is
   unattributed, never authoritative.**

### 4.3 Server-issued identifiers

Reserved prefixes `asrc_`, `att_`, `rcpt_`. A request body carrying any field whose value matches a
reserved prefix, or carrying `source_id` / `attestation_id` / `admission_receipt_id` /
`receipt_id` / `sequence` at all, is **rejected** — not stripped, not overwritten. Silent
overwriting teaches callers the field is optional; rejection teaches them it is not theirs.

Identifiers are content-derived where the estate already does so (`contentId`), with the sequence
number and tenant in the content tuple so two identical payloads admitted twice yield two receipts.

---

## 5. The admission predicate — ordered test sequence

One predicate, `source × context → admissibility`. **First failure wins; no test is skipped; no test
returns `true` on absent input.** Every failure is a rejection with a named reason; none is a
downgrade to a weaker authority that later reads as evidence.

| # | Test | Rule | Rejection |
|---|---|---|---|
| **A0** | Reserved fields | No server-issued identifier or `sequence` present in the request body | `SERVER_FIELD_ASSERTED` |
| **A1** | Source resolves | `source_id` resolves in the ESF-6 registry | `UNKNOWN_SOURCE` |
| **A2** | Tenant ownership | `source.tenant_id === request.tenant_id`, and session coherence where a session is supplied | `SOURCE_TENANT_MISMATCH` |
| **A3** | Source live | `source.status === 'ACTIVE'` | `SOURCE_DISABLED` / `SOURCE_REVOKED` |
| **A4** | Observation category | requested category ∈ `source.observation_categories` | `OBSERVATION_CATEGORY_NOT_PERMITTED` |
| **A5** | Signal type | `signal_type` ∈ `source.supported_signal_types` | `SIGNAL_TYPE_NOT_PERMITTED` |
| **A6** | Grain capability | the declared `grain_key` dimension **set** equals some member of `source.supported_grain_capabilities` — set equality, not subset, not superset | `GRAIN_NOT_PERMITTED` |
| **A7** | Measurement basis | `measurement_design` ∈ `source.supported_measurement_bases` | `MEASUREMENT_BASIS_NOT_PERMITTED` |
| **A8** | Provenance well-formed | measurement window both bounds present and parseable, `start <= end`; entity/grain tokens non-empty after trim | `MALFORMED_PROVENANCE` |
| **A9** | Attestation intact | `source.attestation` present with non-empty `attested_by` and `attestation_statement`; `attestation_id` resolves to the source's registration receipt | `ATTESTATION_UNRESOLVED` |
| → | | all pass | admitted; receipt issued; `synthetic_demo` written from the source |

**A caller attempting `synthetic_demo: false` in a request body is not a special case** — the field
is not read on the admission path at all. It is written from the source (E2). A body that sets it
`true` is honoured, because that direction is monotone toward synthetic.

**Fail closed on every ambiguity.** A source that resolves but whose capability arrays are empty
refuses everything: an empty capability set is *no* capability, never *all*.

---

## 6. The witness predicate — what unlocks `WITHIN_DECLARED_ENVELOPE`

Evaluated at comparison time, per envelope, per LIKE_FOR_LIKE row. **Conjunction of five, fail
closed. Any failure ⇒ `NONE`.**

| # | Condition | Proves |
|---|---|---|
| **W1** | A `CONTRACT_REGISTRATION` receipt exists for `contract_id` under this tenant | the contract passed through a server path the caller does not author |
| **W2** | `receipt.contract_digest === computeContractDigest(contract)` | the envelope **content was immutable** since registration — insertion or edit changes the digest (Z1) and fails here |
| **W3** | Every observation backing the row carries an `admission_receipt_id` that resolves under this tenant | the outcome entered through the attested path |
| **W4** | `contract_receipt.sequence < min(observation_receipt.sequence)` — strict | the **envelope existed before** the outcome was admitted (E4) |
| **W5** | The envelope's own `pre_declaration_witness` is `'NONE'` as stored (C-INV-ENV-6) | the caller did not author the witness (E3, D-5) |

All five ⇒ the derived `PredictionError.declared_envelope.pre_declaration_witness` is published as
`'SERVER_REGISTRATION_RECEIPT'`, and `within_declared_envelope` may be set `true` when the signed
error falls inside. Otherwise it is left **unset** and `within_withheld_reason` names **which
condition failed** — not a generic sentence.

**W4 is what proves the observed outcome was not used to define the envelope.** W2 alone cannot: a
digest proves non-edit, not precedence — exactly the point ADR-036 makes about `created_as_of`.

**`OUTSIDE_DECLARED_ENVELOPE` is untouched and must remain independent of all five.** It is computed
from `signedDelta < lower || signedDelta > upper` and no receipt participates. A revoked source, a
lost receipt store or a failed W4 must still yield `OUTSIDE` on an adverse error. Z2's asymmetry is
preserved exactly: adverse evidence needs no witness, favourable evidence does.

---

## 7. Correspondence, composite grain and synthetic boundaries — what ESF-6 must NOT do

**Correspondence (CDI-08) is not duplicated, weakened or short-circuited.** After admission the
observation is fully re-evaluated by C0–C8: tenant/session, authority, grain declared, window
declared, grain correspondence, exact window coverage, metric ↔ `signal_type`, unit, quantity basis.
An admitted observation whose `signal_type` is not in `METRIC_CORRESPONDENT_SIGNAL_TYPES` for the
contracted metric still yields `METRIC_MISMATCH`. **Authority never bypasses correspondence.**

**Z4 is not re-opened.** A CATEGORY observation plus a REGION observation does not resolve
CATEGORY × REGION. The attested source must supply **one** observation at the contracted composite
grain. ESF-6 adds a capability declaration for such grains and adds **no** combination, apportionment,
independence assumption, proportional allocation or narrowing of a broader observation. §5 test A6
uses set equality precisely so a source cannot declare a marginal capability and have it read as
covering a joint cell.

**Synthetic provenance is immutable for the observation.** There is **no migration path** and none
may be added. ESF-1 / ESF-2 / ESF-3 observations remain non-authoritative permanently. Admission
**mints a new observation** with a server-issued identity; it never rewrites, re-flags or
re-classifies an existing one. No endpoint accepts an existing `observation_id` for
re-classification, and no field on a stored observation is mutable after admission.

**X1 / CDI-07A is respected.** A qualifying attested source may become `WORLD_DRIVEN` only through
`classifyAttribution`'s existing conjunction — which re-derives authority and requires
`!o.synthetic_demo` on every observation ([engine:826](lib/campaign-learning-loop-engine.ts:826)).
Synthetic data remains `ATTRIBUTION_UNAVAILABLE` regardless of source type. **`CanonicalSignalType`
is not widened.** `ExternalSignalCategory` is not widened. `SignalSourceType` is not widened.

---

## 8. The downstream path, proved end to end

Each step names the code that already exists and the condition that must genuinely pass. Nothing is
asserted to pass; each is the honest consequence of the tests above.

```
attested source registered  →  SOURCE_REGISTRATION receipt   (§4.1, §5 A1–A3, A9)
contract created with envelope, witness NONE  →  CONTRACT_REGISTRATION receipt, seq = n   (E3, W1, W2)
observation admitted at composite grain       →  OBSERVATION_ADMISSION receipt, seq = m > n   (§5 A0–A9)
        ↓
authority:      determineObservationAuthority → AUTHORITATIVE_EXTERNAL         (D-1..D-4 corrected)
correspondence: evaluateComparability C0–C8   → LIKE_FOR_LIKE                  (CDI-08, unchanged)
witness:        W1–W5                          → SERVER_REGISTRATION_RECEIPT   (§6)
        ↓
PredictionOutcomeComparison
  verdict = OUTSIDE_DECLARED_ENVELOPE (adverse error) or WITHIN_DECLARED_ENVELOPE (favourable + witness)
        ↓
LE-1  contract_digest matches                                          ✓ digest binding, unchanged
LE-2  status ACTIVE or SUPERSEDED                                      ✓ contract-declared
LE-3  ≥1 LIKE_FOR_LIKE comparison                                      ✓ composite grain key (CDI-08 A-08)
LE-4  every backing observation AUTHORITATIVE_EXTERNAL                 ✓ THE ESF-6 UNLOCK
LE-5  completeness.complete — derived by buildCompleteness             ✓ both quantity paths bind
LE-6  evidence_strength_floor > PLACEHOLDER_EXCLUDED                   ✓ contract-declared
LE-7  verdict not INDETERMINATE                                        ✓ CDI-08 envelope + §6 witness
LE-8  no adapter_capability_gap on a compared quantity                 ✓ no OBSERVATION_ABSENT row
        ↓
eligible LearningCase — when and only when all eight genuinely pass
```

**LE-5 and LE-8 are the two that are easy to assume and must be checked.**
[`buildCompleteness`](lib/campaign-learning-loop-engine.ts:740) counts a path as covered when its
comparability is anything other than `OBSERVATION_ABSENT`. The ATTRIBUTABLE row is
`NO_OBSERVED_COUNTERFACTUAL` — covered, not absent — so it neither breaks completeness nor produces
an attributable comparison. **The first defensible case is a gross-basis case, exactly as CDI-08 §8
recorded.** If the contract publishes a GROSS snapshot path and the admitted observation binds to it,
`missing` is empty and `adapter_capability_gap` is false. If it does not bind, LE-5 and LE-8 both
fail honestly and no case is produced.

**What ESF-6 still does not do:** no automatic `LearningPattern` creation, no pattern write path, no
Y4-cal, no ML, no calibration. Reaching `N = 3` still creates nothing. `LEARNING_PATTERN_PROMOTION`
remains `AWAITING_AUTHORITATIVE_SOURCE`.

---

## 9. Acceptance criteria — written as attacks

Every criterion is a plausible-but-wrong admission or witness that must be refused.
The primary risk of this work package is **manufactured authority** — an estate that says "real"
about evidence it never received.

| # | Attack | Required outcome |
|---|---|---|
| E-01 | Request body sets `synthetic_demo: false` with no `source_id` | Rejected. Never admitted, never authoritative |
| E-02 | Request body sets `synthetic_demo: false` naming a **synthetic ESF-3 connector** | Admission refuses (`UNKNOWN_SOURCE` — ESF-3 ids are not sources); the comparison path still returns `SYNTHETIC_DEMONSTRATION` |
| E-03 | Body carries `source_id`, `attestation_id`, `admission_receipt_id`, `receipt_id` or `sequence` | `SERVER_FIELD_ASSERTED`. Rejected, not silently stripped |
| E-04 | Body carries a value matching a reserved prefix (`asrc_`/`att_`/`rcpt_`) in any field | Rejected |
| E-05 | Tenant B submits against tenant A's registered source | `SOURCE_TENANT_MISMATCH`. No receipt issued, no data republished under A |
| E-06 | Foreign **session** against an otherwise valid source and tenant | Refused at admission; and independently at CDI-08 C0 |
| E-07 | `source_id` that does not resolve | `UNKNOWN_SOURCE` |
| E-08 | Source `status: 'DISABLED'` / `'REVOKED'`, everything else perfect | `SOURCE_DISABLED` / `SOURCE_REVOKED`. A previously issued receipt does **not** rescue it |
| E-09 | Observation category not in `source.observation_categories` | `OBSERVATION_CATEGORY_NOT_PERMITTED` |
| E-10 | `signal_type` outside `source.supported_signal_types` | `SIGNAL_TYPE_NOT_PERMITTED` |
| E-11 | `grain_key` `{category, region}` against a source declaring only `{category}` | `GRAIN_NOT_PERMITTED`. Never widened, never combined |
| E-12 | Source declares `{category, region}`; observation supplies `{category, region, sku}` | `GRAIN_NOT_PERMITTED` — set equality, extra dimension fails |
| E-13 | `measurement_design: 'CONTROLLED_DIFFERENCE'` | Not declarable as a capability; rejected at admission and again at CDI-08 §4.4 |
| E-14 | Source with empty capability arrays | Refuses every observation. Empty is no capability, never all |
| E-15 | Malformed measurement window (absent bound, unparseable, `start > end`) | `MALFORMED_PROVENANCE` |
| E-16 | `attestation_id` naming no registration receipt | `ATTESTATION_UNRESOLVED` |
| E-17 | Source registered with empty `attested_by` or `attestation_statement` | Registration rejected. Never defaulted from a session or header |
| E-18 | `confidence: 100`, `quality: 100` on an otherwise inadmissible observation | Still refused. Assert no authority path reads either (E7) |
| E-19 | Admitted observation, adapter-defaulted confidence/quality | `confidence_provenance` / `quality_provenance` = `ADAPTER_DEFAULT`; authority unaffected |
| E-20 | Contract created with `pre_declaration_witness: 'SERVER_REGISTRATION_RECEIPT'` | **Contract creation rejected (C-INV-ENV-6).** The D-5 correction |
| E-21 | Contract with witness `NONE`, no `CONTRACT_REGISTRATION` receipt, favourable error | Witness `NONE`; `within_declared_envelope` unset; `within_withheld_reason` names W1; verdict `INDETERMINATE` |
| E-22 | Contract registered, then an envelope edited or inserted | W2 fails on digest mismatch; witness `NONE`; CDI-07B artefacts reject fail-closed |
| E-23 | Observation admitted **before** the contract was registered (`m < n`) | W4 fails. Witness `NONE`. Never `WITHIN` |
| E-24 | Observation admitted at the **same** sequence as the contract | W4 is strict `<`. Fails. Witness `NONE` |
| E-25 | Contract registered, observation admitted after, favourable error inside envelope | **`WITHIN_DECLARED_ENVELOPE`. The intended ESF-6 unlock**, on a case that provably could not pass at `4e659eed` |
| E-26 | Same as E-25 but the error falls **outside** | `OUTSIDE_DECLARED_ENVELOPE`, independent of every receipt |
| E-27 | Adverse error, receipt store emptied (restart), source revoked | `OUTSIDE_DECLARED_ENVELOPE` still published. Z2 asymmetry preserved |
| E-28 | Attempt to re-flag an existing synthetic observation as non-synthetic | No code path exists. Assert none is reachable by any endpoint |
| E-29 | Attested observation at correct grain/window but `signal_type` `WEATHER_TEMPERATURE_ANOMALY` against `primary_metric: VOLUME` | `METRIC_MISMATCH`. Admission never satisfies correspondence (E6) |
| E-30 | Attested observation, contract with blank `comparison_invariants` | `GRAIN_UNDECLARED`. CDI-08 fail-closed still governs |
| E-31 | Two marginal attested observations (CATEGORY, REGION) against a `category × region` contract | Neither binds. `GRAIN_MISMATCH`. Z4 holds under attestation |
| E-32 | Attested observation, 3-day window inside a 14-day contracted window | `WINDOW_MISMATCH`. No time-axis apportionment |
| E-33 | Attested source path produces `WORLD_DRIVEN`; a synthetic observation in the same set | `ATTRIBUTION_UNAVAILABLE`. X1 holds |
| E-34 | Full demo flow end to end (§11) | `LIKE_FOR_LIKE`, comparison published, LE-1…LE-8 each evaluated and reported honestly |
| E-35 | `Date.now()` or any wall-clock reading in receipt issuance, witness evaluation or admission | Static assertion fails the build. `issued_at_display` is never read by a predicate |
| E-36 | Every CDI-07B and CDI-08 fixture that fails today | Still fails, with the same or a more specific verdict |

### Binding gate conditions

1. Full re-execution: **CDI-01 21 / CDI-02 36 / CDI-03 31 / CDI-04 49 / CDI-05 70 / CDI-06 93 /
   CDI-07A 155 / CDI-07B 235 / CDI-08 44**, plus ESF-2 19, ESF-3 22, WP10-C, WP10-D 13, IFI-01 12.
2. **Strictly narrowing:** no observation that fails to reach `AUTHORITATIVE_EXTERNAL` at
   `4e659eed` may reach it afterwards **except** through the attested path, and no comparison verdict
   improves except E-25 (`WITHIN_DECLARED_ENVELOPE`), demonstrated on a case that provably could not
   pass before.
3. **CDI-08 suite migration (E5):** deleting `registerExternalSignalConnector` changes how the CDI-08
   fixtures mint an authoritative observation. **All 44 assertions must survive unchanged in meaning**
   — same attack, same required outcome, same verdict string. Any assertion that must be *weakened*
   to compile is a defect in this work package, not in CDI-08.
4. **Purely additive on CDI-07A / CDI-07B / CDI-08 shape:** no field removed, renamed or retyped.
   `C-INV-ENV-6` narrows an accepted *value*, not the type.
5. Mandatory independent adversarial reconciliation before commit. Every work package from CDI-02 to
   CDI-08 shipped defects found by review rather than by its own suite; this one manufactures
   authority if it is wrong.

### Known implementation risk

`prediction_envelopes[].pre_declaration_witness` is pinned to `'NONE'` at creation (C-INV-ENV-6).
Any existing fixture that constructs a contract with `'SERVER_REGISTRATION_RECEIPT'` will now be
rejected. **Expected and correct** — that fixture was exercising D-5.

---

## 10. Security, isolation and honest limits

**Fail closed, every one:** foreign tenant, foreign session, unknown source, disabled source, revoked
source, category mismatch, unsupported metric, unsupported grain, unsupported measurement basis,
malformed provenance, unresolved attestation, and a caller attempting `synthetic_demo=false` without
attestation. None degrades to a weaker-but-usable authority; each is a rejection.

**This is integrity architecture, not an authentication platform.** ESF-6 does not deliver, and must
not grow into: identity providers, OAuth, API keys, secret rotation, credential storage, signed
payloads, mTLS, RBAC, or an audit-retention programme. Source registration is a server-side
operation guarded by the estate's existing tenant scoping.

**Stated limit, deliberately visible.** `FIRST_PARTY_OPERATOR_ATTESTATION` is a **named human
declaration recorded server-side**, not a cryptographic proof. It makes falsity a misrepresentation
by an accountable named person — the same standard CDI-08 §4.4 applies to `measurement_design` and
CDI-07A applies to `resolved_by`. It must never be rendered, labelled or narrated as verification,
certification or proof. Cryptographic attestation is a later, separate decision and is **not**
required to make this work package honest.

---

## 11. Reference demo flow — deterministic, no external credentials

One path, exercisable immediately, using only the estate's own server.

1. **Register** an attested first-party source — `Reference Attested POS Actuals`, category
   `COMMERCE` (→ `COMMERCE_TELEMETRY`, already in `OBSERVATION_INDEPENDENT_SOURCE_TYPES`, so **X1
   needs no change**), `observation_categories: ['REALISED_COMMERCIAL_ACTUAL']`,
   `supported_signal_types: ['ORDER_VELOCITY_ACCELERATION']`,
   `supported_grain_capabilities: [{ dimensions: ['category','region'] }]`,
   `supported_measurement_bases: ['DIRECT_MEASUREMENT']`, attested by a named operator.
   → server issues `source_id`, `attestation_id`, `SOURCE_REGISTRATION` receipt.
2. **Register** a `DecisionContract` carrying one `DeclaredPredictionEnvelope` on the GROSS snapshot
   path, `pre_declaration_witness: 'NONE'`, named `declared_by` and `declaration_statement`.
   → `CONTRACT_REGISTRATION` receipt, `contract_digest` recorded, `sequence = n`.
3. **Submit** one realised campaign observation: `grain_key` `{category, region}` token-exact to the
   contract, measurement window **exactly** equal to `[planned_start, planned_end]`,
   `measurement_design: 'DIRECT_MEASUREMENT'`, `signal_type: 'ORDER_VELOCITY_ACCELERATION'`.
   → `OBSERVATION_ADMISSION` receipt, `sequence = m > n`, `synthetic_demo: false` **written from the
   source**.
4. **Compare.** CDI-08 C0–C8 → `LIKE_FOR_LIKE` on the GROSS path; ATTRIBUTABLE remains
   `NO_OBSERVED_COUNTERFACTUAL`. §6 W1–W5 hold → witness `SERVER_REGISTRATION_RECEIPT`.
   Verdict is `WITHIN_` or `OUTSIDE_DECLARED_ENVELOPE` according to the signed error alone.
5. **Evaluate learning eligibility.** LE-1…LE-8 each reported with its own met/unmet reason.

**The demo source is an attested first-party reference source.** It is not, and must never be
presented as, a live Ocado, Sainsbury's, Blue Yonder or SAP integration. Its `display_name` says so,
and the surface that renders it says so.

**Deterministic:** the only non-content input is the monotonic sequence, which depends solely on
registration order within one store lifetime. No wall clock, no randomness, no network.

---

## 12. API surface — minimum

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/signals/attested-sources` | Register an attested source. Returns source, attestation and registration receipt |
| `GET` | `/api/v1/signals/attested-sources` | List sources for the caller's tenant. Never another tenant's |
| `POST` | `/api/v1/signals/attested-sources/[id]/revoke` | Set `REVOKED`. Existing receipts retained; A3 refuses new admissions |
| `POST` | `/api/v1/campaigns/observations/admit` | The admission predicate (§5). Returns the admitted observation and its receipt |
| `POST` | `/api/v1/campaigns/decision-contract/[id]/register` | Issue a `CONTRACT_REGISTRATION` receipt for an existing contract |

`POST …/prediction-comparison` gains an optional `observation_receipt_ids: string[]`. Body-supplied
`observations[]` remains accepted and continues to behave **exactly** as it does today — it resolves
to no admission receipt and can never be authoritative. This is what makes the change strictly
narrowing and keeps every existing suite meaningful.

---

## 13. Implementation sequence

Registry and receipt settle before any predicate consumes them.

1. `attested-observation-model.ts` — types, validators, reserved-prefix guard (§4.1, §4.3)
2. Receipt store + per-tenant monotonic counter, shared lifetime (E4)
3. Attested source registry + registration, revocation, federated resolution (E1)
4. `C-INV-ENV-6` — pin `pre_declaration_witness` to `'NONE'` (E3 / D-5) **before** anything becomes
   authoritative
5. Admission predicate A0–A9 + observation minting with server-written provenance (§5)
6. Authority corrections D-3, D-4; delete `registerExternalSignalConnector` (D-2 / E5) and migrate the
   CDI-08 fixtures
7. Witness predicate W1–W5 at comparison time; `within_withheld_reason` names the failing condition (§6)
8. R4 derived completeness, R5 provenance classification (E7)
9. API routes (§12) and the reference demo path (§11)

**Step 4 precedes step 5 and step 6.** Arming authority before closing D-5 would, for the duration of
that gap, allow a caller-declared witness over authoritative evidence.

**No subtask delegation.** One predicate, one receipt semantic, one registry; splitting them produces
divergent conventions on a shared invariant.

**Recommended agent:** the designated CDI/ESF stream implementation agent (senior implementation capability), with mandatory
independent adversarial reconciliation before commit.

---

## 14. What remains open after ESF-6

| Item | Owner | Position |
|---|---|---|
| Cryptographic attestation (signed payloads, key management) | Later, separate | §10 — not required for honesty; explicitly out of scope here |
| Signal quality, freshness, reliability grading | `ESF-4` | Parallel-eligible once ESF-6 lands. Grades the admitted; never admits |
| Observed counterfactual → attributable comparison | `Y1` | `OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT` unchanged |
| Per-assumption observation | `Y2` | The real Decision Half-Life precursor |
| Quantitative Decision Half-Life | Deferred | Still `NOT_AVAILABLE` |
| Pattern telemetry calibration + WP10-D write path | `Y4-cal` | Behind N ≥ 3 independent eligible cases and the X3 gate |
| ML workstream | Deferred | May rank or shortlist; never authority, eligibility, correspondence or a verdict |

**The first defensible `LearningCase` becomes producible at the end of this work package, and it is a
gross-basis case.** One case is not a pattern, `N = 3` remains an uncalibrated demonstration policy,
and nothing is promoted.
