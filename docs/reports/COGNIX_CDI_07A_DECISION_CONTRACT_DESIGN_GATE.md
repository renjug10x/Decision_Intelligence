# COGNIX — CDI-07A DECISION CONTRACT & DECISION HALF-LIFE — INTELLIGENCE DESIGN GATE

| Field | Value |
| --- | --- |
| Work package | `CDI-07A` — Decision Contract & Decision Half-Life |
| Authorised baseline | `2efd1b4a60179e082c8f788c70279450a6625e29` — CDI-06 outcome frontier, committed and converged |
| Branch | `Feature/MatchingContract-AutoActivate` |
| Status | **DESIGN FROZEN — CONTRACT FROZEN — CLEARED FOR IMPLEMENTATION** (owner rulings W1, W2 and the decision-basis-integrity addendum approved and closed 2026-08-15) |
| Hard dependencies | `CDI-01` `CampaignIntent`, `CDI-06` `OutcomeFrontier` |
| Integration dependency | `WP10-C` Shared Decision State |
| Enhancement dependency | `ESF-1` / `ESF-2` Enterprise Signal Fabric |
| Scope | Design and contract freeze only. No CDI-07A product implementation. |
| Date | 2026-08-15 |

**Governing principle for this work package.**

> A Decision Contract records what was decided and on what basis. It never re-decides.
> Validity is a separate, recomputable assessment that may change freely — the decision basis
> may not change at all.

**Authoritative Decision Half-Life definition (owner ruling W2, verbatim and binding).**

> Decision Half-Life describes how the evidential basis of a decision weakens or remains valid as
> assumptions and signals evolve. In the current architecture it is represented through validity
> states and evidence-triggered reassessment. Quantitative duration is unavailable until calibrated
> temporal evidence exists.

---

## 1. Continuity

### 1.1 Baseline verification

| Check | Result |
| --- | --- |
| Branch | `Feature/MatchingContract-AutoActivate` |
| `HEAD` | `2efd1b4a60179e082c8f788c70279450a6625e29` — matches the authorised baseline |
| Remote `gitlab` | `2efd1b4a…` — converged |
| Remote `origin` | `2efd1b4a…` — converged |
| Working tree | Clean |
| Stash | Empty |

No unexplained divergence.

### 1.2 Closed upstream evidence

| Package | Contract | Engine | Suite | Result |
| --- | --- | --- | --- | --- |
| `CDI-01` | `packages/contracts/src/campaign-intent-model.ts` | `lib/campaign-intent-store.ts` | `run-cdi01-tests.ts` | 21 passed, 0 failed |
| `CDI-02` | `packages/contracts/src/campaign-counterfactual-model.ts` | `lib/campaign-causal-engine.ts` | `run-cdi02-tests.ts` | 36 passed, 0 failed |
| `CDI-03` | `packages/contracts/src/campaign-opportunity-model.ts` | `lib/campaign-opportunity-engine.ts` | `run-cdi03-tests.ts` | 31 passed, 0 failed |
| `CDI-04` | `packages/contracts/src/campaign-readiness-model.ts` | `lib/campaign-readiness-engine.ts` | `run-cdi04-tests.ts` | 49 passed, 0 failed |
| `CDI-05` | `packages/contracts/src/campaign-timeline-model.ts` | `lib/campaign-timeline-engine.ts` | `run-cdi05-tests.ts` | 70 passed, 0 failed |
| `CDI-06` | `packages/contracts/src/campaign-frontier-model.ts` | `lib/campaign-frontier-engine.ts` | `run-cdi06-tests.ts` | 93 passed, 0 failed |

The declared CDI-07A dependency chain — `CDI-01`, `CDI-06` HARD; `WP10-C` INTEGRATION;
`ESF-1`/`ESF-2` ENHANCEMENT — is present and intact.

### 1.3 Continuity findings carried into the design

Six findings were established empirically against the baseline estate before this design was
written. Each is load-bearing. **None requires a change to a frozen CDI-01→06 contract**, but
three required an owner ruling; all are closed (§11).

**K1 — `frontier_id` is a slot identifier, not a content reference. Decisive.**

`lib/campaign-frontier-engine.ts:1023` composes `frontier_id` as
`frontier_${anchor.campaign_intent_id}_${PLAY_GENERATION_POLICY.policy_version}`. Neither
component varies with the anchor's *content*.

Measured. One session, one registered anchor id, two different anchor contents (region
`North West` → `South East`, category `Fresh Dairy` → `Household`):

| Run | `frontier_id` | Frontier digest (volatile fields elided) |
| --- | --- | --- |
| A | `frontier_cdi_intent_draft_…_ses_p2_1mf13ha_1.0.0` | `f128e61eb42840ce` |
| B | `frontier_cdi_intent_draft_…_ses_p2_1mf13ha_1.0.0` | `f0d4c256042a27ad` |

Two materially different frontiers, one identical `frontier_id`. **A DecisionContract that binds
by `frontier_id` alone binds to nothing durable.** This drives **C-INV-2** (§2.5) — every
reference is an identifier *plus* a content digest.

**K2 — `campaign_intent_id` is stable across content changes, including after registration.**

`registerCampaignIntent` (`lib/campaign-intent-store.ts:86`) re-registers over an existing
`REGISTERED` record without an immutability guard, and `patchRegisteredCampaignIntent` (`:127`)
mutates `decision_context` and `provenance` on a registered intent. Measured: after re-registering
changed content in the same session, `campaign_intent_id` was byte-identical.

CDI-01's own guard — `saveCampaignIntentDraft` refuses to overwrite a `REGISTERED` intent via the
*draft* path — does not cover the registration path. This is CDI-01 behaviour, not a defect this
gate is chartered to repair, and CDI-07A must not repair it: it must **bind defensively**. Raised
as owner item **W3** (§11.2), non-blocking.

**K3 — id stability is mixed across the estate, and the split is exactly reproducible.**

Measured across one seven-play frontier, two runs in the same process:

| Identifier | Derivation | Stable across runs | Admissible as a contract binding key |
| --- | --- | --- | --- |
| `play_id` | content hash of `(anchor id, rule_id, canonical delta)` | **Yes** | Yes |
| `counterfactual_id` | `cf_<play-variant intent id>` | **Yes** | Yes |
| `causal_id` | `causal_<play-variant intent id>` | **Yes** | Yes |
| `readiness_id` | embeds the caller-supplied `evaluation_timestamp` | **Yes**, given the same supplied timestamp | Yes, with the timestamp recorded |
| `evaluation_id` | `cdeval_<intent id>_<Date.now()>` (`lib/campaign-causal-engine.ts:609`) | **No** | **No** — record only, never an equality key |
| `frontier_id` | `frontier_<intent id>_<policy_version>` | Yes, but **not unique to content** (K1) | Only with a digest |

`evaluation_id` was unique within a run (7 of 7 distinct) but differed on re-run. The CDI-06 suite
already treats it as volatile — `elideVolatile` in `tests/unit/run-cdi06-tests.ts:43` deletes
`evaluation_id` and `readiness_id` before byte-comparison. CDI-07A records `evaluation_id` as a
**run marker** and must never compare, re-derive or resolve by it. This drives **C-INV-3** (§2.5).

**K4 — No CDI-02/CDI-05/CDI-06 artefact is persisted anywhere. Decisive.**

The estate's complete store inventory is `lib/campaign-intent-store.ts`,
`lib/commercial-intent-store.ts`, `lib/decision-state-store.ts`, `lib/journey-store.ts`. There is
no evaluation store, no counterfactual store, no frontier store. Every counterfactual, causal
result, decomposition, readiness assessment and frontier is computed on demand by an API route and
discarded when the response is written.

The consequence is structural. A DecisionContract cannot dereference `counterfactual_id` later —
there is nothing to dereference. It therefore **carries an immutable basis snapshot captured by
copy at creation**. This is not a licence to recompute: the snapshot is a verbatim transcription of
values that were computed once, guarded by an exact-equality assertion at creation and by a digest
thereafter (§2.6, **C-INV-4**). Reconstructing the basis by re-running CDI-02 or CDI-06 at any later
point is prohibited without exception.

**K5 — Scenario 0 can never be `selected_play_id` under the CDI-06 constraint chain. Decisive.**

`applySelection` seeds its survivor set as `new Set(frontierPlayIds)`
(`lib/campaign-frontier-engine.ts:469`). Do Nothing is `ADMISSIBLE` but, whenever it is dominated,
is absent from `frontier_play_ids` and therefore never enters the chain.

Measured on the reference anchor: Scenario 0 at `(0.00, £0.00)` is dominated by both surviving
promotion plays and is not a frontier member. Declaring the most permissive possible constraint pair
(`max_contribution_sacrifice_gbp: 0`, `minimum_attributable_uplift_pp: 0`) still returned
`CHOICE_REQUIRED` with two promotion survivors — Do Nothing was never a candidate.

The gate instruction requires that *"Scenario 0 / Do Nothing is a valid contractable decision if
explicitly selected/resolved."* The constraint chain cannot deliver that, and widening the chain
would be a CDI-06 contract change. The resolution is a **second, explicitly human resolution route
owned by CDI-07A** (§3.2, route `R2`) that names a displayed play. This adds a CDI-07A artefact that
*references* the frontier; it changes no CDI-06 contract and no CDI-06 behaviour.

**K6 — Governance documents already describe a countdown Half-Life. They are aspirational and are
superseded by this gate.**

| Document | Line | Text | Ruling |
| --- | --- | --- | --- |
| `docs/governance/SHARED_DECISION_STATE_MODEL.md` | 142 | `decision_half_life`: Remaining validity duration (hours) | **Not implemented.** Superseded by §5 |
| `docs/governance/SHARED_DECISION_STATE_MODEL.md` | 139 | `selected_strategy_play`: `growth` \| `contribution` \| `waste_reduction` \| `balanced` | **Not implemented.** Contradicts the CDI-06 §9.5 controlled vocabulary and the §9.4 `Balanced` restriction |
| `docs/governance/INTENT_FUSION_INTELLIGENCE.md` | 75 | Recommendations carry a Decision Half-Life duration (e.g. `36 hours`) | **Not implemented.** Superseded by §5 |
| `docs/ux/UX_DESIGN_PRINCIPLES.md` | 163 | Tier 1 indicator example `Valid (Est. 36h remaining)` | **Not implemented.** The surrounding rule — *"never … a superficial countdown timer"* — is upheld; the illustrative string is not |
| `docs/architecture/ARCHITECTURE.md` | 156 | Tracks recommendation validity duration | **Not implemented.** Superseded by §5 |
| `docs/governance/ENTERPRISE_SIGNAL_MODEL.md` | 141 | `RECOMMENDATION_HALF_LIFE_DECAY` and two further reserved types | **Not added.** Superseded by §7.5 |

**Reconciled at this freeze, on owner instruction.** All six rows above, plus the
`MASTER_PLAN.md` §CDI-07A row, are corrected in this change rather than deferred — the exception to
the CDI-05 §8.2 / CDI-06 §1.4 precedent is deliberate, because a standing duration definition in
governance is what an implementer would otherwise read as authoritative. The planning report
(`COGNIX_CAMPAIGN_DECISION_INTELLIGENCE_PLANNING_REPORT.md`, row 12 and line 80) remains an
aspirational `PROPOSED` record and is reconciled after implementation, per the established
precedent; this gate is the authoritative record for CDI-07A.

None of these six is code. `packages/contracts/src/decision-state-model.ts` contains no
`contract_ref`, no `selected_strategy_play`, no `decision_half_life`, and
`DecisionCommandType` contains none of `SET_STRATEGY_PLAY`,
`UPDATE_COUNTERFACTUAL_BASELINE`, `TRIGGER_CAMPAIGN_PREMORTEM`. The divergence is documentation-only.

The rows are reconciled **after** implementation, following the CDI-05 §8.2 and CDI-06 §1.4
precedent. This gate is the authoritative record. The contract is not narrowed to match an
aspirational row, and the aspirational row is not implemented to match the document.

### 1.4 Upstream semantics this gate is bound by

- **CDI-06 §5.4 — no hidden aggregate.** No score, weight, composite, utility or ranking may exist
  in a CDI-06 payload, including as an unused field. CDI-07A extends the same prohibition to its own
  payloads and adds validity-specific offenders (§10.3).
- **CDI-06 §7.3 / owner ruling U4 — non-promotion is `PRESENTED_NOT_RANKED`** and is never eligible
  as `selected_play_id`. CDI-07A's human resolution route must not become a back door around this
  (§3.4, **C-INV-6**).
- **CDI-06 §6.4 — Scenario 0 is first-class even when dominated.** Carried into the contract surface
  unchanged (§9.3).
- **CDI-04 evidence and confidence taxonomies.** `EvidenceStrength`, `EVIDENCE_STRENGTH_ORDER`,
  `weakestEvidenceStrength`, `ConfidenceBand` and `ThresholdCalibrationStatus` are the single
  authority. CDI-05 §5.1 and CDI-06 §8.4 established the precedent of importing rather than
  redefining; CDI-07A follows it.
- **CDI-04 `ReadinessChangeTrigger`.** A trigger taxonomy — `field_path`, `current_value`,
  `threshold`, `direction`, `would_change_state_to`, `threshold_id` — already exists
  (`packages/contracts/src/campaign-readiness-model.ts:172`). CDI-07A **references** it and does not
  duplicate it (§6.3).
- **CDI-05 / CDI-06 unavailability pattern.** `RequiredAuthoritativeInput` — the field, its grain,
  why it is required, the inadmissible substitutes, and what it enables — is the frozen way to
  express a capability that is contracted but cannot truthfully be produced. CDI-07A reuses the
  shape for the quantitative half-life ruling (§5.5).
- **CDI-06 owner addendum R1 — local structural twin, not an upstream widening.** CDI-06 needed
  `RequiredAuthoritativeInput.enables` to name a frontier capability rather than a `TimelineLens`
  and declared `FrontierRequiredAuthoritativeInput` locally rather than editing CDI-05. CDI-07A
  faces the identical problem twice and applies the identical precedent (§8.2).

### 1.5 Scoped guards CDI-07A must not trip

Two existing guards mention Half-Life vocabulary. Both are scoped; neither blocks CDI-07A.

| Guard | Scope | Effect on CDI-07A |
| --- | --- | --- |
| `validateDecisionTimelineProjection` rejects `/half_life\|valid_until\|remaining_hours\|_expires/i` (`campaign-timeline-model.ts:284`) | The `DecisionTimelineProjection` payload only | None. CDI-07A must never place validity fields into a CDI-05 payload — and does not |
| `run-cdi05-tests.ts:150` greps for half-life identifiers | The two CDI-05 core files only | None. CDI-07A owns different files |
| `CDI01_FORBIDDEN_CALCULATION_KEYS` includes `decision_half_life` (`campaign-intent-model.ts:422`) | Any `CampaignIntent` payload | Binding. A contract or validity artefact must never be embedded in a `CampaignIntent` (§4.5, **C-INV-8**) |

`ENTERPRISE_SIGNAL_MODEL.md` §7.2 reserves three signal types — `RECOMMENDATION_HALF_LIFE_DECAY`,
`ASSUMPTION_SENSITIVITY_BREACH`, `SIGNAL_VOLATILITY_SURGE` — for CDI-07A, and the ESF-3 report
confirms they were deliberately **not** absorbed into `CanonicalSignalType`. §7.5 rules on them.

---

## 2. Decision Contract Domain Model

### 2.1 Design position

A `DecisionContract` is a **record of a resolved decision and the exact basis on which it was
resolved**. It is immutable from the moment it is created. It contains no calculation, no
recomputation, no re-ranking and no judgement about whether the decision was good.

Three concerns are kept structurally apart, in three different artefacts, with three different
lifecycles:

| Question | Artefact | Lifecycle |
| --- | --- | --- |
| **What was decided** | `DecisionContract` | Immutable. Created once. Superseded, never edited |
| **Does it still hold** | `DecisionValidityAssessment` | Recomputed on demand at a caller-supplied instant. Never written back |
| **What would change it** | `DecisionAssumption[]` + `DecisionTrigger[]` | Declared *on* the contract at creation, therefore immutable. Evaluated *by* validity |

The assumptions and triggers sit on the contract, not on the assessment, and this is deliberate.
*What would change my mind* is part of what was decided. A decision whose reconsideration
conditions can be rewritten afterwards has no reconsideration conditions.

### 2.2 `DecisionContract`

```ts
export type DecisionContractStatus = 'ACTIVE' | 'SUPERSEDED' | 'WITHDRAWN';

export type DecisionResolutionRoute = 'CONSTRAINT_RESOLVED' | 'HUMAN_RESOLVED';

export interface DecisionContract {
  contract_id: string;                 // content-derived — never time-derived (C-INV-3)
  contract_version: number;            // 1 for an original; n+1 for a supersessor
  status: DecisionContractStatus;

  tenant_id: string;
  session_id: string;

  /**
   * Owner ruling — decision basis integrity. Immutable, content-derived, computed over the
   * canonical inputs in §2.8. It BINDS the basis; it does not REPLACE any source reference,
   * every one of which remains published in `basis`.
   */
  decision_basis_digest: string;

  /** WHAT WAS DECIDED — immutable, by reference and by verbatim snapshot. */
  basis: DecisionContractBasis;        // §2.4

  /** HOW IT CAME TO BE RESOLVED — attributed, never inferred. */
  resolution: DecisionResolution;      // §3.3

  /** WHAT WOULD CHANGE IT — declared at creation, immutable thereafter. */
  assumptions: DecisionAssumption[];   // §6.2
  triggers: DecisionTrigger[];         // §6.3

  /** Supersession chain. Never a timestamp comparison. */
  supersedes?: DecisionContractReference;
  superseded_by?: DecisionContractReference;
  withdrawal?: ContractWithdrawal;     // §4.4

  /** Capabilities contracted but not truthfully producible at this baseline. */
  unavailable_capabilities: ContractRequiredAuthoritativeInput[];   // §5.5, §8.2

  evidence_refs: ContractEvidenceRef[];              // §8.2
  evidence_strength_floor: EvidenceStrength;         // CDI-04 taxonomy, imported
  confidence_band: ConfidenceBand;                   // CDI-04 taxonomy, imported

  calculation_mode: 'deterministic_decision_contract';
  synthetic_demo: boolean;
  schema_version: string;
  provenance: Record<string, string>;

  /** The caller-supplied reference instant at which the contract was created. Never Date.now(). */
  created_as_of: string;
}
```

`created_as_of` is a recorded fact about when the decision was taken. It is **not** an input to any
validity computation, is never differenced against a later instant to produce an age, and is never
rendered as elapsed time (§5.4, **C-INV-9**).

### 2.3 `DecisionContractReference`

The portable, minimal handle to a contract. It is what WP10-C, the Canvas and any future package
hold. It never carries economics.

```ts
export interface DecisionContractReference {
  contract_id: string;
  contract_version: number;
  contract_digest: string;             // sha256 of the canonicalised immutable contract body
  decision_basis_digest: string;       // §2.8 — lets a holder verify basis integrity without resolving content
  tenant_id: string;
  session_id: string;
  status: DecisionContractStatus;
}
```

This is the CDI-07A-internal portable handle. **Shared Decision State does not store it** — per owner
ruling W1, WP10-C stores a plain `decision_contract_ref?: string` and nothing more (§7.3).

A reference whose `contract_digest` does not match the contract it resolves to is a **fail-closed
rejection**, not a warning (`RJ-C4`). This is the only defence against K2-class silent content drift
that does not depend on upstream behaviour.

### 2.4 `DecisionContractBasis` — reference plus verbatim snapshot

```ts
export interface BoundArtefactRef {
  artefact: 'CAMPAIGN_INTENT' | 'OUTCOME_FRONTIER' | 'STRATEGY_PLAY'
          | 'COUNTERFACTUAL' | 'CAUSAL' | 'READINESS' | 'DECOMPOSITION';
  /** The stable identifier published by the owning package. */
  id: string;
  /** sha256 of the canonicalised artefact as it stood when the decision was resolved. */
  digest: string;
  /** True only for identifiers proven stable in §1.3 K3. */
  reproducible: boolean;
  /** Recorded because it names the run; never used to compare, resolve or re-derive. */
  run_marker?: string;
}

export interface SnapshotValue {
  /** Exact path in the owning package's payload. The owner remains authoritative. */
  source_field_path: string;
  source_package: 'CDI-01' | 'CDI-02' | 'CDI-04' | 'CDI-05' | 'CDI-06';
  value: number | string | boolean | null;
  unit?: string;
  strength: EvidenceStrength;
  /** Always false. Present so the guarantee is machine-checkable, not merely stated. */
  restated: false;
}

export interface DecisionContractBasis {
  campaign_intent_ref: BoundArtefactRef;
  frontier_ref: BoundArtefactRef;
  selected_play_ref: BoundArtefactRef;
  counterfactual_ref: BoundArtefactRef;
  causal_ref: BoundArtefactRef;
  readiness_ref?: BoundArtefactRef;

  /** Verbatim copies. Transcription only — see C-INV-4. */
  outcome_snapshot: SnapshotValue[];          // the selected play's admitted axis values
  decomposition_snapshot: SnapshotValue[];    // CDI-05 subtotals as published
  readiness_snapshot?: SnapshotValue[];       // state, vetoes, caps — status, not economics

  /** The choice set as it stood: what was rejected and why. */
  rejected_alternatives: RejectedAlternative[];   // §2.7
  scenario_zero: ScenarioZeroContractRecord;      // §9.3 — mandatory, always present

  /** Frozen comparison context, copied from OutcomeFrontier.comparison_invariants. */
  comparison_invariants: ComparisonSetInvariants;  // CDI-06 type, imported
  ambient_frame: AmbientFrameStamp;                // CDI-06 type, imported

  /** Dimensions the decision was made WITHOUT. Copied, never re-declared. */
  unavailable_at_decision: UnavailableOutcomeDimension[];  // CDI-06 type, imported

  generation_policy_version: string;
  dominance_epsilon: Record<string, number>;
}
```

### 2.5 Binding invariants

| Id | Invariant | Basis |
| --- | --- | --- |
| **C-INV-1** | A contract references the decision basis; it never recomputes it. Re-running CDI-02, CDI-05 or CDI-06 to populate or repair a basis is prohibited without exception | Gate instruction |
| **C-INV-2** | Every `BoundArtefactRef` carries both an `id` and a `digest`, and the contract additionally carries a single `decision_basis_digest` over the whole basis. An id alone is never a binding | **K1** — `frontier_id` collides across content |
| **C-INV-11** | `decision_basis_digest` is computed from the §2.8 canonical inputs only, is byte-identical for identical inputs across runs, processes and machines, and **replaces no source reference** — every bound id remains published alongside it | Owner ruling, decision basis integrity |
| **C-INV-3** | No contract identifier, ordering, equality test or lookup may depend on `evaluation_id`, `Date.now()` or wall-clock arithmetic. `contract_id` is a content hash of `(campaign_intent_id, decision_basis_digest, selected_play_id, resolution route, resolver, contract_version)` | **K3** |
| **C-INV-4** | Snapshot values are transcribed, not derived. Creation re-reads each value from the supplied artefact and requires exact equality; any rounding, unit conversion, aggregation or renaming is a rejection | Gate instruction; CDI-06 §5.5 precedent |
| **C-INV-5** | A contract's `basis`, `assumptions` and `triggers` are immutable. There is no edit path, no PATCH, and no partial update. Change produces a new contract that supersedes | §4 |
| **C-INV-6** | A play excluded from CDI-06 dominance in both directions is never contractable, by any route | CDI-06 §7.3 / U4 |
| **C-INV-7** | Validity never mutates the contract, never names an alternative play, and never restates an economic value | Gate instruction |
| **C-INV-8** | No contract, validity, assumption or trigger field is ever embedded in a `CampaignIntent`, a `DecisionTimelineProjection` or an `OutcomeFrontier` payload | §1.5 |
| **C-INV-9** | No duration, countdown, expiry, decay rate, remaining-percentage or elapsed-time value exists anywhere in a CDI-07A payload or surface | §5 |
| **C-INV-10** | Every reference in a contract agrees on `tenant_id` and `session_id`. A mismatch fails closed as not-found | §8.4 |

### 2.6 Why a snapshot is not a restatement

The gate's two instructions here pull against each other and the resolution matters.

*Never restate or round CDI-02/CDI-06 economics as new authoritative values* forbids the contract
from becoming a second source of truth for a number. *Reference the exact decision basis rather than
recomputing it* forbids the contract from re-deriving that number later. **K4** removes the third
option — dereferencing on demand — because nothing persists the artefacts.

The resolution is that a `SnapshotValue` is a **quotation with an attribution**, not a claim. It
carries the `source_field_path` and `source_package` of the value it quotes, carries `restated:
false` as a machine-checkable assertion, and is guarded at creation by
`assertBasisTranscribedNotRecomputed`, which re-reads every value from the supplied artefact and
requires exact equality — the CDI-06 `assertNoSyntheticOutcome` pattern applied to transcription.

The surface obligation follows: a contract's numbers are displayed as *what CDI-02 and CDI-06 said
when this was decided*, never as *the contract's figures*, and the authority statement is mandatory:

> These values are the CDI-02 and CDI-06 outputs recorded at the moment this decision was resolved.
> The originating packages remain authoritative. Nothing here has been recalculated.

### 2.7 `RejectedAlternative`

The record of the choice set. Without it a contract says what was chosen but not *what it was chosen
over*, which is the half a reviewer actually needs.

```ts
export type RejectionCause =
  | 'PARETO_DOMINATED'
  | 'REMOVED_BY_DECLARED_CONSTRAINT'
  | 'READINESS_VETOED'
  | 'EXCLUDED_ECONOMICS_INCOMPLETE'
  | 'INADMISSIBLE_MODEL_INTEGRITY'
  | 'INADMISSIBLE_UNSTATED_MECHANIC'
  | 'NOT_CHOSEN_BY_RESOLVER';

export interface RejectedAlternative {
  play_id: string;
  label: string;                       // CDI-06 §9.5 controlled vocabulary only
  play_kind: PlayKind;
  cause: RejectionCause;
  /** For REMOVED_BY_DECLARED_CONSTRAINT — the CDI-06 elimination, copied verbatim. */
  elimination?: ConstraintElimination;
  /** For PARETO_DOMINATED — the dominating play ids, copied verbatim. */
  dominated_by?: string[];
  /** For READINESS_VETOED — the CDI-04 veto, copied verbatim. */
  veto?: ReadinessVeto;
  outcome_snapshot: SnapshotValue[];   // its true, unaltered axis values
}
```

`NOT_CHOSEN_BY_RESOLVER` exists only on the `HUMAN_RESOLVED` route and is the honest cause for a
surviving play a named person did not pick. It is never used to imply the play was inferior.

Every play in the frontier appears exactly once in `rejected_alternatives`, except the selected play
and Scenario 0 — Scenario 0 has its own mandatory record (§9.3) and appears in
`rejected_alternatives` only when it was a genuine candidate that a resolver declined.

### 2.8 `decision_basis_digest` — canonical inputs and determinism

**Owner ruling, binding.** Because `frontier_id` is not a durable unique basis identifier (**K1**,
measured), a `DecisionContract` carries an immutable content-derived `decision_basis_digest` that
binds the exact contracted basis. It **binds** the basis; it **does not replace** any source
reference. Every bound identifier — campaign intent, play, evaluation, counterfactual, causal result,
frontier — remains published in `basis` and remains individually citable.

**Canonical inputs, in this fixed order.** The digest is `sha256` over the canonical JSON
serialisation of exactly this tuple, and of nothing else:

| # | Input | Source |
| --- | --- | --- |
| 1 | `campaign_intent_ref.id` and `campaign_intent_ref.digest` | CDI-01 |
| 2 | `frontier_ref.id` and `frontier_ref.digest` | CDI-06 |
| 3 | `selected_play_ref.id` and `selected_play_ref.digest` | CDI-06 |
| 4 | `counterfactual_ref.id` and `counterfactual_ref.digest` | CDI-02 |
| 5 | `causal_ref.id` and `causal_ref.digest` | CDI-02 |
| 6 | `readiness_ref.id` and `readiness_ref.digest`, or the literal `null` when absent | CDI-04 |
| 7 | `outcome_snapshot`, canonically ordered by `source_field_path` | §2.4 |
| 8 | `decomposition_snapshot`, canonically ordered by `source_field_path` | §2.4 |
| 9 | `readiness_snapshot`, canonically ordered by `source_field_path`, or `null` | §2.4 |
| 10 | `comparison_invariants` | CDI-06 |
| 11 | `ambient_frame` | CDI-06 |
| 12 | `unavailable_at_decision`, canonically ordered by `dimension_id` | CDI-06 |
| 13 | `rejected_alternatives`, canonically ordered by `play_id` | §2.7 |
| 14 | `scenario_zero` | §9.3 |
| 15 | `generation_policy_version` | CDI-06 |
| 16 | `dominance_epsilon`, keys sorted | CDI-06 |

**Canonicalisation rules.** Object keys sorted lexicographically at every depth; arrays ordered by
the key named above and never by insertion sequence; numbers serialised exactly as the source
package published them, with **no** re-rounding, re-precision or unit change; `undefined` omitted and
explicit `null` preserved as `null`.

**Excluded, and why each exclusion is load-bearing:**

| Excluded | Reason |
| --- | --- |
| `run_marker` / `evaluation_id` | Time-derived and unstable across runs (**K3**). Including it would make the digest non-deterministic, which is the one thing it must not be |
| `created_as_of`, `contract_version`, `status`, `supersedes`, `superseded_by`, `withdrawal` | Facts *about* the contract, not the basis. A superseded contract's basis digest must equal what it was when active |
| `assumptions`, `triggers`, `resolution`, `provenance`, `evidence_refs` | Not the basis. Two contracts resolved by different routes over an identical basis share a `decision_basis_digest` — and that is the correct and useful answer |

**Determinism is a permanent acceptance criterion**, not a one-off check: AC-52 through AC-56 (§10)
are permanent regression tests, and the digest algorithm and input list are published in the
contract's `provenance` so any reader can recompute it by hand.

`decision_basis_digest` and `contract_digest` are different objects and must not be conflated.
`contract_digest` covers the whole immutable contract body including resolution and assumptions;
`decision_basis_digest` covers the basis alone. `contract_id` is a content hash of
`(campaign_intent_id, decision_basis_digest, selected_play_id, resolution route, resolver,
contract_version)` — so the basis digest participates in identity without being identity.

---

## 3. Contract Creation Eligibility Rules

### 3.1 Design position

**A contract may exist only for a genuinely resolved decision.** Resolution is a property of the
decision, not of the request. A caller cannot assert it, and no default supplies it.

`CHOICE_REQUIRED` is not resolution. It is CogniX correctly declining to pick. The only way it
becomes a decision is that a named human picks, on the record — which is route `R2`, and is the
opposite of silent.

### 3.2 The two admissible resolution routes

| Route | Precondition | Resolver | Scenario 0 reachable |
| --- | --- | --- | --- |
| **R1 `CONSTRAINT_RESOLVED`** | `frontier.selection.status === 'SELECTED'` | The declared constraints, with their existing CDI-06 attribution | **No** (K5) |
| **R2 `HUMAN_RESOLVED`** | A named person selects one displayed, admissible play | `resolved_by`, mandatory and never defaulted | **Yes** |

R2 is not a fallback for R1. It is available whenever a human wants the record to say *a person
chose this*, including when the constraint chain would have produced the same play — in which case
both facts are recorded and the route is `HUMAN_RESOLVED`, because that is what happened.

**R2 exists because of K5, and its necessity is measured, not asserted.** Do Nothing is `ADMISSIBLE`
and, whenever dominated, permanently outside `frontier_play_ids` and therefore outside the
constraint chain. Without R2 the product could not contract "we considered it and chose not to act"
— the one decision it most needs to be able to record.

### 3.3 `DecisionResolution`

```ts
export interface DecisionResolution {
  route: DecisionResolutionRoute;
  selected_play_id: string;

  /** R1 only — copied verbatim from FrontierSelection. Never re-derived. */
  selection_status?: SelectionStatus;
  selection_basis?: SelectionBasis;
  constraints_in_force?: DeclaredConstraint[];
  eliminations?: ConstraintElimination[];

  /** R2 only — mandatory, never defaulted, never inferred from a session or a header. */
  resolved_by?: string;
  resolution_statement?: string;       // the resolver's own words for why
  /** R2 only — the survivor set the resolver was choosing from, as displayed. */
  presented_alternatives?: string[];   // play_ids
  /** R2 only — true when the resolver picked against the constraint chain's own survivor. */
  contradicts_constraint_selection?: boolean;
}
```

`contradicts_constraint_selection` is published rather than suppressed. A human overriding the
declared constraints is a legitimate act and one a reviewer must be able to see.

### 3.4 Eligibility gate

Evaluated in order. The first failure stops creation; no partial or degraded contract is emitted.

| Rule | Test | Rejection |
| --- | --- | --- |
| **E1** | `frontier.frontier_status === 'EMITTED'` | `RJ-C1: FRONTIER_NOT_EMITTED` |
| **E2** | Every reference agrees on `tenant_id` and `session_id` | `RJ-C4: TENANT_SESSION_MISMATCH` (reported as not-found, §8.4) |
| **E3** | Supplied digests match the supplied artefacts | `RJ-C4: DIGEST_MISMATCH` |
| **E4** | A resolution route is satisfied — R1's `SELECTED`, or R2's named resolver and named play | `RJ-C2: DECISION_NOT_RESOLVED` |
| **E5** | The named play exists in `frontier.plays` | `RJ-C5: PLAY_NOT_IN_FRONTIER` |
| **E6** | The named play's `admissibility === 'ADMISSIBLE'` | `RJ-C3: PLAY_NOT_CONTRACTABLE` |
| **E7** | The named play carries no active `DO_NOT_PROCEED` readiness veto | `RJ-C3: PLAY_VETOED` — the veto id and basis are named in the rejection |
| **E8** | `assertBasisTranscribedNotRecomputed` passes on every snapshot value | `RJ-C6: BASIS_TRANSCRIPTION_FAILURE` |
| **E9** | Scenario 0 is present in the frontier and recorded in the basis | `RJ-C7: SCENARIO_ZERO_ABSENT` |

**E6 is the U4 firewall.** Non-promotion carries `admissibility: 'EXCLUDED_ECONOMICS_INCOMPLETE'`
(measured: `["G2","NON_PROMOTION","EXCLUDED_ECONOMICS_INCOMPLETE",[8.99,1663.15]]`), so R2 cannot
name it. A human may not contract by hand what the frontier excluded from dominance in both
directions, because the reason for the exclusion — an unmodelled execution cost that flatters the
play by a measured 3.4× — does not stop being true when a person likes the number. The rejection
must publish `NON_PROMOTION_REQUIRED_INPUT` so the refusal names its own unlock.

**E7 covers Scenario 0 too.** A `DO_NOT_PROCEED` veto on Do Nothing means *not acting is
unacceptable*; contracting it would be contracting against a live veto. CDI-06 §6.4's exemption is
an exemption from *display suppression*, not a licence to contract a vetoed play. The refusal names
the veto and Scenario 0 remains displayed.

### 3.5 What creation must never do

- Never call `registerCampaignIntent`, `saveCampaignIntentDraft` or
  `patchRegisteredCampaignIntent`. **Contract creation does not touch CDI-01 intent history**
  (**C-INV-8**). The CDI-01 store must hold exactly the intents it held before the call.
- Never write into an `OutcomeFrontier`, a `DecisionTimelineProjection` or a
  `DecisionReadinessAssessment`.
- Never re-run `evaluateOutcomeFrontier` or `evaluateCampaignDecision` to obtain a value it was not
  given.
- Never create a contract for a frontier it computed itself. The frontier is supplied by the caller,
  digested, and bound.

---

## 4. Contract Lifecycle, Versioning and Supersession

### 4.1 Immutability

A `DecisionContract` has no mutation path. There is no `PATCH` route, no field-level update, and no
in-place status edit other than the two terminal transitions in §4.2 — which are recorded as new
facts about the contract, never as changes to its `basis`, `resolution`, `assumptions` or
`triggers`.

### 4.2 State transitions

```text
                    ┌──────────────┐
   creation ───────►│    ACTIVE    │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
      ┌───────────────┐         ┌───────────────┐
      │  SUPERSEDED   │         │   WITHDRAWN   │
      └───────────────┘         └───────────────┘
   (a successor contract          (a named human
    was created)                   withdrew it)
```

There is no `EXPIRED` state and there will not be one. Expiry is exactly the countdown semantics
§5 rules out: it asserts that a decision stopped holding because time passed, which is a claim no
evidence in this estate supports. A decision that no longer holds is `REASSESS_REQUIRED` on its
validity assessment, and it is a human who supersedes or withdraws it.

### 4.3 Supersession

A supersessor is a **new contract**, created through the full §3 eligibility gate against a fresh
frontier, carrying `supersedes: DecisionContractReference` and `contract_version = prior + 1`. The
prior contract's `status` becomes `SUPERSEDED` and its `superseded_by` is populated. Its `basis`,
`resolution`, `assumptions` and `triggers` are untouched — that is the point of superseding rather
than editing.

Ordering is by `contract_version` and the explicit `supersedes` chain. **Never by timestamp
comparison** (**C-INV-3**). Exactly one contract per `(tenant_id, session_id, campaign_intent_id)`
may be `ACTIVE`; creating a successor while one is active without naming it in `supersedes` is
`RJ-C8: ACTIVE_CONTRACT_NOT_SUPERSEDED`.

### 4.4 Withdrawal

```ts
export interface ContractWithdrawal {
  withdrawn_by: string;                // mandatory, never defaulted
  statement: string;                   // mandatory, the withdrawer's own reason
  withdrawn_as_of: string;             // caller-supplied reference instant
  /** Optional — the validity assessment that prompted it, by reference only. */
  prompted_by_assessment_id?: string;
}
```

Withdrawal is always a human act. **No validity state, no fired trigger and no signal may withdraw
or supersede a contract automatically** (**C-INV-7**). `REASSESS_REQUIRED` is the strongest thing
CogniX may say on its own, and it is a request addressed to a person.

### 4.5 Relationship to CDI-01 CampaignIntent

| Concern | Ruling |
| --- | --- |
| Direction | The contract references the intent. The intent never references the contract |
| History | Contract creation does not mutate CDI-01 intent history in any way (**C-INV-8**) |
| Embedding | No contract or validity field is ever written into a `CampaignIntent` — `CDI01_FORBIDDEN_CALCULATION_KEYS` already includes `decision_half_life` and `assertNoFutureCdiCalculations` will detect a breach |
| Binding | By `campaign_intent_id` **and** `campaign_intent_digest`, because K2 shows the id survives content change |
| Drift | Intent content diverging from the contracted digest is the `T-INTENT` trigger (§6.3) — the contract is not repaired, the divergence is reported |

The digest is computed over the canonicalised intent excluding `updated_at`, `registered_at` and
`provenance`, so that a re-registration which changed nothing material does not read as drift. The
excluded field list is published in the contract's provenance so a reader can reproduce it.

---

## 5. Decision Half-Life Semantics

### 5.1 The ruling

> **Decision Half-Life in CogniX is a validity state derived from named assumptions and fired
> triggers. It is not a duration, a countdown, a decay curve, an expiry time, or a percentage
> remaining. No quantitative half-life measure is produced at this baseline.**

This is a rejection of the five governance rows in **K6**, and it is not a stylistic preference. It
follows from what the estate can and cannot evidence.

### 5.2 Why no duration can be produced

A duration claim — "this decision holds for 36 hours" — requires at least one of: an observed
history of decisions of this kind losing validity over time; a calibrated model of how fast the
contract's assumptions decay; or an independent observation stream against which drift can be
measured over wall-clock. The estate has none of the three.

| Requirement | Estate position | Consequence |
| --- | --- | --- |
| Observed decision-outcome history | Does not exist. Prediction-vs-reality and the closed learning loop are `CDI-07B`, explicitly out of scope | No empirical decay rate is derivable |
| Calibrated assumption-decay model | Does not exist. Every CDI-04 threshold is `UNCALIBRATED_LAB_DEFAULT` (`ThresholdCalibrationStatus`); CDI-06's generation policy is `synthetic_demonstration_policy` | Any rate would be a lab constant presented as a measurement |
| Independent wall-clock observation stream | Does not exist for ESF-1/ESF-2. `SimulationPeriod` is a **symbolic** axis (`T-90 … Today … T+30`), and `dynamic-signal-simulator` computes every observation deterministically from `SignalSimulationContext`, which is Shared Decision State's own parameters | Signal movement between two assessments is caused by *our* parameter change, not by elapsed time |

The third row is the decisive one and its consequence runs deeper than the half-life question — it
is handled explicitly in §7.4.

A duration would therefore be a number with no referent, rendered with a precision the model does
not have, in the one place a user is most likely to trust it. The gate's instruction is met by
refusing to produce it.

### 5.3 `DecisionValidityState`

```ts
export type DecisionValidityState =
  | 'STABLE'
  | 'WATCH'
  | 'DEGRADED'
  | 'REASSESS_REQUIRED'
  | 'INDETERMINATE';
```

| State | Meaning | Entry condition |
| --- | --- | --- |
| `STABLE` | Every declared assumption was assessable, was actually assessed, and none has moved past its declared condition | **Positive supporting evidence required** — see below |
| `WATCH` | A named assumption has moved, but not past a condition the contract declared as load-bearing | A trigger with `on_fire: 'WATCH'` fired |
| `DEGRADED` | A load-bearing assumption no longer holds as stated | A trigger with `on_fire: 'DEGRADED'` fired |
| `REASSESS_REQUIRED` | The decision was resolved against a basis that has materially changed. A person should look again | A trigger with `on_fire: 'REASSESS_REQUIRED'` fired |
| `INDETERMINATE` | Validity could not be computed. An evidence limitation, not a level of decay | One or more assumptions unassessable and nothing higher fired |

`INDETERMINATE` is not a fifth degree of decay and must never be rendered on the same scale as the
other four. It is the gate's *"return an evidence limitation rather than fabricated precision"*
made into a state, so that the honest answer has somewhere to go.

**`STABLE` requires positive supporting evidence (owner ruling W2, binding).** It is a claim, not a
default. It may be returned only when **every** declared trigger evaluated to `NOT_FIRED` with a
populated `observed_value` read from a real source at `as_of`, and `unassessable_assumptions` is
empty. A contract with no evaluable triggers at all — every assumption declared with a
`not_evaluable_reason` — is `INDETERMINATE`, never `STABLE`. An empty trigger set is not evidence of
stability; it is the absence of evidence, and the two must never render the same.
`assertStableHasPositiveEvidence` enforces this at the boundary.

### 5.4 Derivation — ordered precedence, never a score

```text
REASSESS_REQUIRED  >  DEGRADED  >  WATCH  >  INDETERMINATE  >  STABLE
```

The assessed state is the highest-precedence entry whose condition is met. Three properties are
load-bearing:

1. **It is a precedence over named states, not an aggregation.** No count, no weight, no severity
   arithmetic, no threshold on a total. Two fired `WATCH` triggers are `WATCH`, not `DEGRADED`.
2. **`INDETERMINATE` outranks `STABLE`.** Absence of contrary evidence is not evidence of
   stability. A validity assessment that could not check an assumption must never report `STABLE`,
   and this ordering makes that mechanical rather than a matter of care.
3. **`unassessable_assumptions[]` is published on every assessment regardless of state.** A
   `DEGRADED` verdict that silently skipped two unassessable assumptions is a worse answer than an
   honest `DEGRADED` that names them.

### 5.5 The quantitative measure — contracted and `NOT_AVAILABLE`

A quantitative half-life is **contracted and declared unavailable**, following the CDI-05 revenue
and CDI-06 availability precedent exactly. It is published on every contract so that the absence is
visible and its unlock is named, rather than the capability simply not appearing.

```ts
export const QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT: ContractRequiredAuthoritativeInput = {
  field: 'observed_decision_validity_outcome_series',
  grain: 'per resolved decision, per assumption, with the observed instant at which the assumption ceased to hold',
  why_required:
    'a duration, decay rate or expiry claim asserts that validity is a function of elapsed time; ' +
    'nothing in this estate observes decisions losing validity over time, and no threshold in ' +
    'CDI-04 or CDI-06 is calibrated, so any duration would be a lab constant presented as a measurement',
  inadmissible_substitutes: [
    'a fixed default such as 36 hours',
    'an exponential or linear decay curve fitted to no observations',
    'campaign duration, forecast horizon, or planned_end minus the reference instant',
    'signal confidence or quality read as a validity percentage',
    'CDI-04 confidence band converted to a remaining-time estimate',
    'the count of fired triggers scaled into a duration'
  ],
  enables: 'QUANTITATIVE_DECISION_HALF_LIFE',
  status: 'AWAITING_AUTHORITATIVE_SOURCE'
};
```

Mandatory disclosure wherever validity is surfaced:

> CogniX does not estimate how long this decision remains valid. It reports whether the assumptions
> it was decided on still hold, and names the ones that have moved.

### 5.6 `HalfLifeBasis`

The named, enumerable account of *why the state is what it is*. It replaces the scalar entirely, and
its shape is the reason no scalar is needed.

```ts
export interface HalfLifeBasis {
  /** The state and the single trigger that determined it under §5.4 precedence. */
  determining_trigger_id?: string;
  determining_assumption_id?: string;

  /** Every trigger evaluated, with its outcome. Complete — never a filtered highlight set. */
  triggers_evaluated: TriggerEvaluation[];      // §6.4
  /** Assumptions that could not be assessed, with the reason each could not be. */
  unassessable_assumptions: UnassessableAssumption[];

  /** Why this is not an expiry claim. Mandatory, verbatim from the declared constant. */
  not_a_prediction_disclosure: string;
  /** Published on every assessment so the absence is visible, not merely absent. */
  quantitative_measure: ContractRequiredAuthoritativeInput;
}
```

### 5.7 Prohibited vocabulary

`validateDecisionValidityAssessment` and `validateDecisionContract` reject any payload key matching:

```text
/half_life_hours|remaining_hours|hours_remaining|valid_until|valid_for|expires|expiry|
 ttl|countdown|decay_rate|decay_curve|validity_pct|validity_score|percent_remaining|
 age_hours|elapsed|time_to_live/i
```

and any string value matching `/\b\d+\s*(h|hr|hrs|hours|d|days)\s*(remaining|left|to go)\b/i`.

The value scan exists because the key scan alone is defeated by a field named `headline` containing
`"Valid (Est. 36h remaining)"` — which is precisely the string in
`docs/ux/UX_DESIGN_PRINCIPLES.md:163`. A guard that would pass the exact example it was written to
prevent is not a guard.

---

## 6. Assumptions and Trigger Model

### 6.1 Design position

An assumption is a **statement the decision depended on, with the value it held at the time and the
condition that would falsify it**. A trigger is that condition made evaluable. Both are declared at
creation and are immutable, because reconsideration conditions written after the fact are not
reconsideration conditions.

### 6.2 `DecisionAssumption`

```ts
export type AssumptionClass =
  | 'AMBIENT_FRAME'
  | 'DECISION_QUESTION'
  | 'DECLARED_CONSTRAINT'
  | 'READINESS_CONDITION'
  | 'CHOICE_SET'
  | 'ECONOMICS_COMPLETENESS';

export interface DecisionAssumption {
  assumption_id: string;
  assumption_class: AssumptionClass;
  statement: string;                   // in the reader's terms, not the schema's
  /** Where the assumption was read from. The owning package stays authoritative. */
  basis_field_path: string;
  source_package: 'CDI-01' | 'CDI-02' | 'CDI-04' | 'CDI-05' | 'CDI-06' | 'ESF-1' | 'ESF-2';
  /** The value as it stood when the decision was resolved. Transcribed, never re-derived. */
  held_at_resolution: string | number | boolean | null;
  strength: EvidenceStrength;          // CDI-04 taxonomy
  /** True when falsifying this assumption undermines the decision rather than annotating it. */
  load_bearing: boolean;
  trigger_ids: string[];               // [] is legal and means "declared but not evaluable"
  /** Required when trigger_ids is empty — why it cannot be evaluated at this baseline. */
  not_evaluable_reason?: string;
}
```

The six declared assumption classes, each grounded in something the estate actually produces:

| Class | Assumption | Source | Load-bearing |
| --- | --- | --- | --- |
| `AMBIENT_FRAME` | The decision was resolved under ARF-A, with enterprise signals excluded from the counterfactual | `OutcomeFrontier.ambient_frame.mode` | **Yes** — see §7.4 |
| `DECISION_QUESTION` | The question was about this category, region, SKU scope, segment, timing and objective | `OutcomeFrontier.comparison_invariants` | **Yes** |
| `DECLARED_CONSTRAINT` | These bounds were in force and were declared by these people | `FrontierSelection.constraints_in_force` | **Yes** on route R1; annotation on R2 |
| `READINESS_CONDITION` | These CDI-04 conditions were open, with these discharge tests | `PlayReadinessReference.conditions` | Per condition — `blocking_if_unmet === 'DO_NOT_PROCEED'` ⇒ load-bearing |
| `CHOICE_SET` | The alternatives considered were those the declared generation policy produced at this version | `OutcomeFrontier.generation_policy` | No — annotation |
| `ECONOMICS_COMPLETENESS` | Revenue, availability and non-promotion execution cost were unavailable and did not participate | `unavailable_at_decision`, `NON_PROMOTION_REQUIRED_INPUT` | **Yes** |

`ECONOMICS_COMPLETENESS` is the assumption most decisions carry and least often state: *this was
chosen without knowing revenue, without knowing availability, and with one alternative excluded
because its cost is unmodelled*. Putting it on the contract's face is the single highest-value thing
this artefact does.

### 6.3 `DecisionTrigger` — referencing CDI-04, not duplicating it

CDI-04 already owns a trigger taxonomy: `ReadinessChangeTrigger` carries `dimension`, `field_path`,
`current_value`, `threshold`, `direction`, `would_change_dimension_to`, `would_change_state_to` and
`threshold_id` (`campaign-readiness-model.ts:172`). CDI-07A **must not** declare a second one.

```ts
export type TriggerClass = 'T-INTENT' | 'T-CONSTRAINT' | 'T-READINESS' | 'T-SIGNAL' | 'T-EVIDENCE';

export type TriggerEffect = 'WATCH' | 'DEGRADED' | 'REASSESS_REQUIRED';

export interface DecisionTrigger {
  trigger_id: string;
  trigger_class: TriggerClass;
  assumption_id: string;
  statement: string;                   // what would have to happen, in the reader's terms

  /** Shape aligned to ReadinessChangeTrigger — same field names, same meanings. */
  field_path: string;
  contracted_value: string | number | boolean | null;
  direction: 'INCREASE' | 'DECREASE' | 'BECOMES_TRUE' | 'BECOMES_FALSE' | 'DIFFERS';
  threshold?: string | number;
  /** Every CDI-07A threshold is a lab default and says so. CDI-04 taxonomy, imported. */
  threshold_calibration: ThresholdCalibrationStatus;
  threshold_basis?: string;

  /** T-READINESS only — the CDI-04 trigger this defers to. Never a reimplementation. */
  readiness_trigger_ref?: {
    dimension: ReadinessDimensionId;
    field_path: string;
    threshold_id?: string;
  };

  /** T-SIGNAL only — §7.2. */
  signal_ref?: SignalValidityReference;

  on_fire: TriggerEffect;
  /** Mandatory. Names what firing does and does not mean. */
  on_fire_disclosure: string;
}
```

The five trigger classes:

| Class | Fires when | Default effect | Evaluable at this baseline |
| --- | --- | --- | --- |
| **`T-INTENT`** | The current `CampaignIntent` digest differs from the contracted digest on any comparison-set invariant | `REASSESS_REQUIRED` | **Yes** — fully. K2 makes this both computable and necessary |
| **`T-CONSTRAINT`** | A contracted declared constraint is absent from the caller-supplied current set, or its bound differs | `REASSESS_REQUIRED` | **Yes**, when the current set is supplied; otherwise unassessable |
| **`T-READINESS`** | A contracted `ReadinessCondition` is unmet, or a new veto fires, on a CDI-04 re-assessment at `as_of` | `DEGRADED`; `REASSESS_REQUIRED` for a new veto | **Yes** — CDI-04 is deterministic under a supplied `evaluation_timestamp` |
| **`T-SIGNAL`** | A bound ESF-1/ESF-2 signal has moved past a declared lab-default threshold | `WATCH`; `DEGRADED` only on a `load_bearing` assumption | Partly — §7.4 |
| **`T-EVIDENCE`** | A dimension that was `NOT_AVAILABLE` at resolution has become available | `REASSESS_REQUIRED` | **Yes** — the choice-set economics change |

`T-READINESS` re-runs CDI-04 to obtain the *status*; it never reads an economic value from that
run. CDI-04's own `assertReadinessDidNotRewriteEconomics` guarantee is what makes this safe, and
CDI-07A adds `assertValidityReadNoEconomics` on its own side rather than relying on it.

### 6.4 `TriggerEvaluation`

```ts
export type TriggerOutcome = 'NOT_FIRED' | 'FIRED' | 'UNASSESSABLE';

export interface TriggerEvaluation {
  trigger_id: string;
  outcome: TriggerOutcome;
  /** The value observed at as_of. Absent when UNASSESSABLE — never defaulted to the contracted value. */
  observed_value?: string | number | boolean | null;
  /** Required when UNASSESSABLE. Names the missing input, not a generic failure. */
  unassessable_reason?: string;
  /** Required when FIRED. What moved, from what to what, in the reader's terms. */
  statement?: string;
  /** T-SIGNAL only — whether the movement came from the world or from our own scenario. §7.4. */
  movement_attribution?: SignalMovementAttribution;
}
```

An `UNASSESSABLE` trigger never defaults `observed_value` to the contracted value. Doing so would
convert "we could not check" into "it has not moved" — the exact fabrication the `INDETERMINATE`
precedence rule exists to prevent.

---

## 7. Signal and Shared Decision State Integration

### 7.1 Design position

Signals answer *has the world moved*. They do not answer *should we decide differently*. CDI-07A
consumes signals only to evaluate declared triggers on declared assumptions, and the strongest
conclusion it may reach is that a person should look again.

### 7.2 `SignalValidityReference`

```ts
export interface SignalValidityReference {
  /** ESF-1/ESF-2 identity. Bound at contract creation, resolved again at assessment. */
  signal_type: CanonicalSignalType;
  entity_type: SignalEntityType;
  entity_id: string;
  timeline_id?: string;

  /** The observation the assumption was bound to, transcribed at contract creation. */
  contracted_period: SimulationPeriod;
  contracted_value: number;
  contracted_delta_pct: number;
  contracted_confidence: number;
  contracted_quality: number;

  /** WP10-C provenance — the decisive field for §7.4. */
  contracted_decision_state_id: string;
  contracted_decision_state_version: number;

  /** Declared lab-default movement threshold. Never a learned or fitted value. */
  movement_threshold_pct: number;
  threshold_calibration: 'UNCALIBRATED_LAB_DEFAULT';
  threshold_basis: string;
}
```

### 7.3 Shared Decision State relationship

| Concern | Ruling |
| --- | --- |
**Owner ruling W1, approved and binding.** WP10-C stores the **reference only**. CDI-07A exclusively
owns `DecisionContract` content, assumptions, validity, triggers and Half-Life semantics.

| Concern | Ruling |
| --- | --- |
| Ownership | WP10-C owns decision state. CDI-07A owns contracts. Neither owns the other |
| Binding | `DecisionState` gains **`decision_contract_ref?: string`** — a plain reference, additive and optional, mirroring the existing `campaign_intent_ref` / `commercial_intent_ref` precedent (`decision-state-model.ts:65`). **Not** the full `DecisionContractReference` object: a structured handle in WP10-C would be contract content living in the wrong domain |
| Command | One new deterministic command, **`REGISTER_DECISION_CONTRACT`**, following `REGISTER_CAMPAIGN_INTENT` |
| **Idempotency** | Registering the **same** `decision_contract_ref` is a **no-op**: `state_version` does not increment, no `history` record is appended, no derived impact is recalculated, and the result reports `changed_fields: []`. Only a *change* of reference is a state transition. This prevents artificial state/version churn from repeated registration, page remounts or retries |
| Concurrency | A reference *change* obeys the existing `expected_version` optimistic-concurrency rules unchanged. The idempotent no-op path must not reject on a stale `expected_version` when the stored reference already equals the supplied one — there is nothing to conflict over |
| Not added | `SET_STRATEGY_PLAY`, `UPDATE_COUNTERFACTUAL_BASELINE`, `TRIGGER_CAMPAIGN_PREMORTEM`, `decision_half_life`, `selected_strategy_play`, `counterfactual_run_rate`, `targeted_micro_markets` — all refused. WP10-C stores no contract content of any kind |
| Derived impacts | `calculateDerivedImpacts` is **not** extended. A contract changes no scenario parameter and therefore no derived impact |

This is the only touch on a package outside CDI-07A's own files and it is purely additive.
`SHARED_DECISION_STATE_MODEL.md` §8 has been reconciled to this ruling at this freeze.

### 7.4 The two asymmetries that must be disclosed, not resolved

Two facts about this estate make naive signal-based validity dishonest. Neither can be fixed inside
CDI-07A. Both are therefore surfaced.

**Asymmetry 1 — the decision did not consume the signals validity is checked against.**

CDI-06 ships ARF-A `SIGNALS_EXCLUDED` as the only emitting frame (owner ruling U1). Every contracted
decision was resolved in a world where enterprise signals were deliberately excluded from the
counterfactual, because including them made the plays incomparable — CDI-06 §1.3 C1 measured the
ambient spread at 0.23pp across a seven-play set.

So a `T-SIGNAL` trigger evaluates something the decision itself never used. That is still worth
doing: the assumption *"this was decided with signals excluded"* is real, load-bearing, and its
falsification — signals having moved materially since — is genuinely informative. But the assessment
must never imply that the decision's own numbers have changed, because they were never a function of
those signals.

Mandatory disclosure on every `T-SIGNAL` evaluation:

> This decision was resolved with enterprise signals excluded from the counterfactual, so that
> competing strategies shared one baseline. This signal movement did not change the decision's
> figures. It indicates that the world has moved since the decision was framed.

**Asymmetry 2 — ESF-1/ESF-2 movement is scenario-driven, not world-driven.**

`services/world/src/dynamic-signal-simulator.ts` computes every observation deterministically from
`SignalSimulationContext`, which is Shared Decision State's own `scenario_parameters` plus
`decision_state_version`. Re-simulating with an unchanged context yields an unchanged timeline.
Therefore a signal that has "moved" between contract creation and assessment has almost always moved
because *we changed a parameter*, not because anything happened.

Presenting that as world drift would be a fabrication with a very persuasive shape. Every
`T-SIGNAL` evaluation therefore classifies its movement:

```ts
export type SignalMovementAttribution =
  /** decision_state_version changed between contract and assessment — this is our own parameter change. */
  | 'SCENARIO_DRIVEN'
  /** decision_state_version identical and the signal still moved — requires an independent source. */
  | 'WORLD_DRIVEN'
  /** Version could not be resolved at either end. */
  | 'ATTRIBUTION_UNAVAILABLE';
```

At this baseline `WORLD_DRIVEN` is reachable only for signals sourced through ESF-3 external
connectors (`source_type: 'EXTERNAL_CONNECTOR'`), which CDI-07A does **not** take a dependency on —
ESF-3 is a CDI-07B integration. A `SCENARIO_DRIVEN` movement may raise `WATCH` and must carry:

> This signal moved because the scenario parameters changed, not because the world did.

A `SCENARIO_DRIVEN` movement may **never** raise `DEGRADED` or `REASSESS_REQUIRED` on its own. Only
`WORLD_DRIVEN` or `ATTRIBUTION_UNAVAILABLE` movement on a `load_bearing` assumption may reach
`DEGRADED`, and `ATTRIBUTION_UNAVAILABLE` must say that it could not tell the difference.

### 7.5 The three reserved ESF signal types

`ENTERPRISE_SIGNAL_MODEL.md` §7.2 reserves `RECOMMENDATION_HALF_LIFE_DECAY`,
`ASSUMPTION_SENSITIVITY_BREACH` and `SIGNAL_VOLATILITY_SURGE` for CDI-07A, and ESF-3 deliberately
declined to absorb them.

| Type | Ruling |
| --- | --- |
| `RECOMMENDATION_HALF_LIFE_DECAY` | **Not added.** It names a decay quantity §5 rules does not exist. Adding the type would create a slot demanding to be filled |
| `ASSUMPTION_SENSITIVITY_BREACH` | **Not added as a signal type.** The concept is fully expressed by a fired `DecisionTrigger` on a `load_bearing` assumption. A second representation would be the competing taxonomy the gate prohibits |
| `SIGNAL_VOLATILITY_SURGE` | **Not added.** Volatility is expressed as `TriggerEvaluation.outcome === 'FIRED'` with its `movement_attribution`. A surge type would carry an implied magnitude with no calibration |

`CanonicalSignalType` is therefore **not widened**, no ESF contract changes, and the governance §7.2
row is reconciled after implementation with the ruling above. Consistency note for the reconciliation:
the same section's closing line — *"If volatility triggers a threshold breach, a
`RE_SIMULATION_RECOMMENDED` signal is published"* — is superseded by §4.4: nothing automatic
supersedes, withdraws or re-simulates a contract.

---

## 8. Provenance and Evidence Model

### 8.1 Reuse, not a second taxonomy

Imported verbatim from CDI-04 and used without extension: `EvidenceStrength`,
`EVIDENCE_STRENGTH_ORDER`, `weakestEvidenceStrength`, `ConfidenceBand`,
`ThresholdCalibrationStatus`, `ReadinessState`, `ReadinessVeto`, `ReadinessCondition`,
`ReadinessDimensionId`. Imported from CDI-06: `ComparisonSetInvariants`, `AmbientFrameStamp`,
`UnavailableOutcomeDimension`, `ConstraintElimination`, `DeclaredConstraint`, `SelectionStatus`,
`SelectionBasis`, `PlayKind`, `NON_PROMOTION_REQUIRED_INPUT`. Imported from ESF-1:
`CanonicalSignalType`, `SignalEntityType`, `SimulationPeriod`.

CDI-07A defines **no** new evidence, confidence, readiness, decomposition or unavailability
taxonomy.

### 8.2 Two local structural twins — the CDI-06 R1 precedent applied

Two frozen upstream unions are too narrow for CDI-07A, and in both cases CDI-06 has already
established that the answer is a local twin, not an upstream widening.

**`ContractEvidenceRef`.** `ReadinessEvidenceRef.source_package` is
`'CDI-01' | 'CDI-02' | 'CDI-03' | 'WP10-A' | 'WP10-C' | 'ESF-1' | 'ESF-2'` — it cannot name CDI-04,
CDI-05 or CDI-06, which are exactly the packages a contract cites most. CDI-07A declares a
structurally identical type whose only difference is the source union:

```ts
export interface ContractEvidenceRef {
  source_package: 'CDI-01' | 'CDI-02' | 'CDI-04' | 'CDI-05' | 'CDI-06' | 'WP10-C' | 'ESF-1' | 'ESF-2';
  field_path: string;
  value: string | number | boolean;
  strength: EvidenceStrength;          // imported, not redefined
  synthetic_demo: boolean;
  disclosure?: string;
}
```

**`ContractRequiredAuthoritativeInput`.** `RequiredAuthoritativeInput.enables` is a `TimelineLens`;
CDI-06 hit this and declared `FrontierRequiredAuthoritativeInput` with a local `FrontierCapability`
(owner addendum R1). CDI-07A does the same with `ValidityCapability`:

```ts
export type ValidityCapability =
  | 'QUANTITATIVE_DECISION_HALF_LIFE'
  | 'WORLD_DRIVEN_SIGNAL_ATTRIBUTION';
```

Field names, semantics and `status: 'AWAITING_AUTHORITATIVE_SOURCE'` are identical to the CDI-05
original. Nothing upstream is edited.

### 8.3 Missing-data behaviour

Uniform with CDI-04, CDI-05 and CDI-06: **a missing input removes a capability and says so. It never
produces a substituted, defaulted or interpolated value.**

| Missing | Effect |
| --- | --- |
| Frontier not emitted | No contract. `RJ-C1` |
| Readiness assessment absent at creation | Contract may be created; `readiness_ref` and `readiness_snapshot` are absent; `READINESS_CONDITION` assumptions are not declared and the absence is published |
| Readiness unavailable at assessment | `T-READINESS` triggers are `UNASSESSABLE` with the reason named |
| Signals unavailable at assessment | `T-SIGNAL` triggers are `UNASSESSABLE`. Never `NOT_FIRED` |
| Current intent unreadable | `T-INTENT` is `UNASSESSABLE`. The contract is not repaired and the intent is not re-fetched under a different tenant |
| Current constraint set not supplied | `T-CONSTRAINT` is `UNASSESSABLE`. Never assumed unchanged |
| Every trigger unassessable | `INDETERMINATE` with `unassessable_assumptions` fully populated. **Never `STABLE`** |

`evidence_strength_floor` on a contract is the weakest strength across its snapshot values, its
assumptions and its evidence refs, computed with the imported `weakestEvidenceStrength`.
`synthetic_demo` propagates from the frontier to the contract and to every assessment.

### 8.4 Tenant and session isolation

| Rule | Behaviour |
| --- | --- |
| Every reference in a contract carries `tenant_id` and `session_id`, and all must agree | Divergence fails closed at creation, `RJ-C4` |
| Contract ids are derived from tenant/session-derived inputs and are therefore enumerable | An id alone is never an authorisation token. Every read is tenant-scoped at the caller, following the `getCampaignIntentById` precedent (`campaign-intent-store.ts:113`) |
| Cross-tenant read | Reported as **not found**, never as forbidden — no existence oracle |
| Cross-tenant write | Refused with an ownership error, following `assertIdOwnership` (`campaign-intent-store.ts:23`) |
| Validity assessment | Resolves the contract under the caller's tenant/session before evaluating anything; a mismatched signal, intent or decision-state reference is `UNASSESSABLE`, never silently swapped for the caller's own |

Measured precedent: an outcome-frontier request under a foreign tenant returns
`CampaignIntentNotFound`, not a leak. CDI-07A matches this behaviour exactly.

---

## 9. API and Experience Boundaries

### 9.1 API surface

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/campaigns/decision-contract` | Create a contract from a supplied frontier and resolution. Orchestration only |
| `GET` | `/api/v1/campaigns/decision-contract/[id]` | Fetch a contract, tenant-scoped |
| `GET` | `/api/v1/campaigns/decision-contract/current` | The `ACTIVE` contract for a tenant/session, if one exists |
| `POST` | `/api/v1/campaigns/decision-contract/[id]/validity` | Assess validity at a caller-supplied `as_of`. Never written back |
| `POST` | `/api/v1/campaigns/decision-contract/[id]/withdraw` | Human withdrawal with attribution |

**No `PATCH` exists on any contract route**, and none may be added. `POST … /validity` is a
computation over caller-supplied context (`as_of`, current constraint set, signal context), not a
resource read — which is why it is not the `GET /api/v1/campaigns/validity` the planning report
anticipated at line 80. That row is reconciled after implementation, per the CDI-05 §8.2 precedent.

Rejections are explicit and named, following the CDI-06 `RJ-G1` pattern:

| Id | Cause |
| --- | --- |
| `RJ-C1` | Frontier not emitted |
| `RJ-C2` | Decision not resolved — `CHOICE_REQUIRED` or `NO_ADMISSIBLE_PLAY` without a human resolver |
| `RJ-C3` | Play not contractable — inadmissible, excluded, or vetoed |
| `RJ-C4` | Tenant/session mismatch or digest mismatch |
| `RJ-C5` | Named play absent from the supplied frontier |
| `RJ-C6` | Basis transcription failure |
| `RJ-C7` | Scenario 0 absent from the supplied frontier |
| `RJ-C8` | An `ACTIVE` contract exists and was not named in `supersedes` |
| `RJ-C9` | A mutation was attempted on an existing contract |

### 9.2 Storage

`lib/decision-contract-store.ts`, tenant/session-indexed, in-memory, built on an
`IDecisionContractStore` abstraction so a persistent backend plugs in without an API change —
following `IDecisionStateStore` (`lib/decision-state-store.ts:18`) exactly. The container-restart
limitation is documented as a demonstration limitation, as WP10-C does.

The store enforces immutability at the boundary: there is no update method, only `create`,
`markSuperseded`, `markWithdrawn` and tenant-scoped reads.

### 9.3 Canvas and experience boundaries

Two tiers, per `UX_DESIGN_PRINCIPLES.md` §5.6, with the countdown example refused (**K6**):

**Tier 1 — Compact Validity Indicator.** The `DecisionValidityState` word and nothing else. No
duration, no percentage, no progress bar, no clock, no colour ramp implying elapsed time. An
`INDETERMINATE` state is rendered distinctly from the four assessed states, never as a fifth
severity step.

**Tier 2 — Validity Evidence drawer.** Every declared assumption with its `held_at_resolution`
value; every trigger with its outcome, and for a fired trigger what moved and by how much; every
`UNASSESSABLE` trigger with the reason; `movement_attribution` on every signal trigger with its
disclosure; and the `QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT` declaration so the absent capability is
visible.

**Contract Summary Card.** What was decided, the route and resolver, the rejected alternatives with
their causes, and Scenario 0 — always present, never rendered as "no change", never removed or
demoted for having been dominated. The CDI-06 §6.5 framing is carried verbatim:

```ts
export interface ScenarioZeroContractRecord {
  play_id: string;
  was_selected: boolean;
  dominated: boolean;
  dominated_by: string[];
  outcome_snapshot: SnapshotValue[];   // exactly (0.00, £0.00)
  framing: string;                     // CDI-06 SCENARIO_ZERO_FRAMING, imported
}
```

**Prohibited on the contract and validity surfaces**: any countdown, clock, timer, progress bar,
gauge, "expires", "valid for", "hours remaining", or decay animation; the words `optimal`, `best`,
`recommended`, `winner`, `ideal`, `sweet spot`; and `balanced` except where the contracted
`selection_basis` is literally `BALANCED_UNDER_DECLARED_CONSTRAINTS` — the CDI-06 §9.5 rule carried
into CDI-07A unchanged.

### 9.4 The LLM boundary

Contract creation, eligibility, basis transcription, trigger evaluation and validity-state
derivation are **pure deterministic functions with zero LLM involvement**. A narrative layer, if
added later, may receive an already-computed, already-validated contract or assessment and produce
prose about it, labelled non-authoritative and rendered separately. It may not create a contract,
resolve a decision, name a resolver, declare an assumption, fire a trigger, or influence a validity
state.

Acceptance test: the contract and the assessment computed with the narrative layer disabled are
byte-identical to those computed with it enabled.

---

## 10. Adversarial Acceptance Criteria

Each criterion is written as an attack. The implementation passes only when the attack fails.

**Eligibility and resolution**

1. Supply a frontier with `selection.status: 'CHOICE_REQUIRED'` and no human resolver. Assert
   `RJ-C2`, that no contract is created, and that the store is unchanged.
2. Supply `CHOICE_REQUIRED` plus a named resolver and a named survivor. Assert a contract is created
   with `route: 'HUMAN_RESOLVED'`, `resolved_by` populated, and `presented_alternatives` listing
   every survivor.
3. Supply `HUMAN_RESOLVED` with `resolved_by` absent, empty, or whitespace. Assert `RJ-C2` and that
   no resolver is defaulted from a session id, header, or tenant.
4. Supply a frontier with `frontier_status: 'NOT_EMITTED'`. Assert `RJ-C1` regardless of resolution
   route.
5. Name the non-promotion play (`EXCLUDED_ECONOMICS_INCOMPLETE`) via `HUMAN_RESOLVED`. Assert
   `RJ-C3`, and that the rejection publishes `NON_PROMOTION_REQUIRED_INPUT`.
6. Name a play carrying a `DO_NOT_PROCEED` veto, including Scenario 0. Assert `RJ-C3` and that the
   veto id and `veto_basis` appear in the rejection.
7. Name Scenario 0 while it is dominated by two promotion plays. Assert a contract **is** created,
   that `scenario_zero.was_selected` is `true`, that its snapshot is exactly `(0.00, £0.00)`, and
   that `dominated_by` is published rather than suppressed.
8. Assert `selected_play_id` under `CONSTRAINT_RESOLVED` is always a member of
   `frontier.frontier_play_ids`, and that under `HUMAN_RESOLVED` it is always `ADMISSIBLE`.

**Binding and immutability**

9. Create a contract, then re-register the anchor intent with a changed region and recompute the
   frontier. Assert the new `frontier_id` is **identical** to the contracted one, that
   `frontier_digest` **differs**, and that the contract is bound by digest and detects the
   divergence via `T-INTENT` rather than silently accepting it. *(K1 regression.)*
10. Assert every `BoundArtefactRef` carries a non-empty `digest`, and that creation fails closed if
    any supplied digest disagrees with the supplied artefact.
11. Assert `evaluation_id` appears only as `run_marker` with `reproducible: false`, and that no
    lookup, comparison, ordering or equality test anywhere in the diff reads it. *(K3 regression.)*
12. Create the same contract twice from identical inputs in separate processes. Assert
    `contract_id` and `contract_digest` are byte-identical, and that no id contains a timestamp or
    counter.
13. Attempt every mutation path: `PATCH` the route, mutate `basis`, mutate `assumptions`, mutate
    `triggers`, call a store update. Assert `RJ-C9` or the absence of the method, and that the
    stored contract is byte-identical afterwards.
14. Mutate one `SnapshotValue.value` before creation so it disagrees with the source artefact.
    Assert `assertBasisTranscribedNotRecomputed` fails and `RJ-C6` is returned.
15. Round one snapshot value from `488.19` to `488.2`. Assert rejection — rounding is restatement.
16. Assert every `SnapshotValue` carries `restated: false`, a `source_field_path` and a
    `source_package`, and that no snapshot value is produced by arithmetic over other values.

**CDI-01 and upstream integrity**

17. Create a contract and assert the CDI-01 store contains exactly the intents it held before, with
    identical `updated_at`. Assert `registerCampaignIntent`, `saveCampaignIntentDraft` and
    `patchRegisteredCampaignIntent` are never called in the CDI-07A diff.
18. Run `assertNoFutureCdiCalculations` over every `CampaignIntent` after contract creation. Assert
    no offender, and specifically that `decision_half_life` is absent.
19. Serialise a contract and an assessment and run `validateDecisionTimelineProjection`'s prohibited
    key set mentally against them — assert no CDI-07A field is ever placed inside a CDI-05, CDI-06
    or CDI-01 payload.
20. Re-run the CDI-01…CDI-06 suites unchanged. Assert all remain green: 21, 36, 31, 49, 70, 93.

**Half-Life semantics**

21. Serialise every CDI-07A payload and assert no key matches
    `/half_life_hours|remaining_hours|hours_remaining|valid_until|valid_for|expires|expiry|ttl|countdown|decay_rate|decay_curve|validity_pct|validity_score|percent_remaining|age_hours|elapsed|time_to_live/i`.
22. Set a headline to `"Valid (Est. 36h remaining)"` — the literal
    `UX_DESIGN_PRINCIPLES.md:163` example. Assert the **value** scan rejects it, not merely the key
    scan.
23. Assert no code path differences `created_as_of` against `as_of`, or any two instants, to produce
    a number that is displayed.
24. Assert `DecisionContractStatus` contains no `EXPIRED` member and that no code path transitions a
    contract on the basis of time alone.
25. Assert `QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT` is published on every contract and every
    assessment, with all six inadmissible substitutes present, and that no quantitative half-life
    value exists anywhere.
26. Assert the validity state is derived by the §5.4 ordered precedence and that no count, sum,
    average, weight or threshold-on-a-total participates. Fire two `WATCH` triggers and assert the
    state is `WATCH`, not `DEGRADED`.
27. Serialise every payload and assert no key matches
    `/score|weight|composite|utility|ranking|rank_index|priority_value|volatility_index/i`, including
    unused fields.

**Validity, assumptions and triggers**

28. Make every trigger unassessable. Assert `INDETERMINATE`, that `unassessable_assumptions` is fully
    populated, and that the state is **not** `STABLE`.
29. Make one trigger `DEGRADED` and two unassessable. Assert `DEGRADED` **and** that both
    unassessable assumptions are still published on the assessment.
30. Assert no `TriggerEvaluation` with `outcome: 'UNASSESSABLE'` carries an `observed_value`, and
    that no unassessable trigger is reported as `NOT_FIRED`.
31. Fire a `T-SIGNAL` trigger. Assert the assessment names no alternative play, contains no axis
    value, and restates no economic figure. Assert `assertValidityProposesNoAlternative` and
    `assertValidityReadNoEconomics` both pass.
32. Fire a `T-SIGNAL` trigger where `decision_state_version` changed between contract and
    assessment. Assert `movement_attribution: 'SCENARIO_DRIVEN'`, that the state does **not** exceed
    `WATCH`, and that the scenario-driven disclosure is present. *(§7.4 Asymmetry 2.)*
33. Fire a `T-SIGNAL` trigger where `decision_state_version` is unresolvable at either end. Assert
    `ATTRIBUTION_UNAVAILABLE` and that the assessment says it could not distinguish world movement
    from scenario movement.
34. Assert every contract declares an `AMBIENT_FRAME` assumption recording `SIGNALS_EXCLUDED`, and
    that every `T-SIGNAL` evaluation carries the §7.4 Asymmetry 1 disclosure.
35. Assert every contract declares an `ECONOMICS_COMPLETENESS` assumption naming revenue,
    availability and non-promotion execution cost as absent at resolution.
36. Assert every `T-READINESS` trigger carries a `readiness_trigger_ref` where a CDI-04
    `ReadinessChangeTrigger` exists for the same field, and that CDI-07A declares no second trigger
    taxonomy.
37. Assert every CDI-07A threshold carries `threshold_calibration: 'UNCALIBRATED_LAB_DEFAULT'` and a
    `threshold_basis`.
38. Run a validity assessment twice with the same `as_of` and the same context. Assert byte-identical
    output. Assert no `Date.now()` or argless `new Date()` participates in any decision logic.
39. Assert a validity assessment never writes to the contract store, never changes
    `DecisionContractStatus`, and never triggers a supersession or withdrawal.

**Lifecycle and isolation**

40. Create a successor without naming `supersedes` while an `ACTIVE` contract exists. Assert
    `RJ-C8`.
41. Supersede a contract. Assert the prior becomes `SUPERSEDED` with `superseded_by` populated, that
    its `basis`, `resolution`, `assumptions` and `triggers` are byte-identical to before, and that
    exactly one contract is `ACTIVE`.
42. Withdraw a contract without `withdrawn_by` or without a `statement`. Assert rejection.
43. Assert ordering across a supersession chain uses `contract_version` and `supersedes` only, and
    that no timestamp comparison participates.
44. Read a contract under a foreign tenant. Assert **not found**, not forbidden, and that no field
    of the contract leaks in the error.
45. Create a contract whose `frontier_ref` names a different tenant than the request. Assert
    `RJ-C4` and no partial contract.
46. Run a validity assessment where the referenced decision state belongs to another session. Assert
    the signal triggers are `UNASSESSABLE`, and that the caller's own decision state is **not**
    silently substituted.

**Narrative and surface**

47. Disable the narrative layer. Assert the contract and the assessment are byte-identical to the
    enabled run.
48. Scan the contract and validity surfaces for a countdown, clock, timer, progress bar, gauge or
    decay animation. Assert none exists.
49. Scan the surfaces for `optimal`, `best`, `recommended`, `winner`, `ideal`, `sweet spot`. Assert
    none appears, and that `balanced` appears only where the contracted `selection_basis` is
    `BALANCED_UNDER_DECLARED_CONSTRAINTS`.
50. Scan the surface for any rendering of Scenario 0 as "no change", a flat line, an absence, or a
    demoted element when it was dominated. Assert the CDI-06 §6.5 framing is present verbatim.
51. Assert `synthetic_demo` is present and `true` on every contract, every assessment, every
    assumption evidence ref and every snapshot value — not only on the envelope.

**Decision basis digest — permanent determinism criteria (owner ruling)**

52. Compute `decision_basis_digest` twice from identical inputs in two separate processes. Assert
    byte-identical output. Assert it is stable across key insertion order, array insertion order and
    JSON round-tripping of the inputs.
53. Change exactly one canonical input at a time — all sixteen in §2.8, one per case. Assert the
    digest changes in every one of the sixteen cases.
54. Change each excluded field — `run_marker`, `evaluation_id`, `created_as_of`, `contract_version`,
    `status`, `supersedes`, `withdrawal`, `resolution`, `assumptions`, `triggers`, `provenance`,
    `evidence_refs`. Assert the digest is **unchanged** in every case, and specifically that a
    superseded contract's `decision_basis_digest` equals what it was while active.
55. Assert the digest **replaces no source reference**: after computing it, assert
    `campaign_intent_ref`, `frontier_ref`, `selected_play_ref`, `counterfactual_ref`, `causal_ref`
    and `readiness_ref` are all still published with their ids intact, and that no code path resolves
    a basis artefact through the digest instead of through its id.
56. Assert `decision_basis_digest` and `contract_digest` are distinct values computed over distinct
    inputs, that neither is used where the other is required, and that the digest algorithm and the
    §2.8 input list are published in the contract's `provenance` so a reader can recompute by hand.

**Shared Decision State idempotency (owner ruling W1)**

57. Register the same `decision_contract_ref` twice. Assert `state_version` is unchanged after the
    second call, that no `history` record was appended, that `changed_fields` is empty, and that
    `derived_impacts` is byte-identical.
58. Register a *different* `decision_contract_ref`. Assert `state_version` increments exactly once, a
    single `history` record is appended, and the existing `expected_version` concurrency rules apply
    unchanged.
59. Replay the same-reference registration with a stale `expected_version`. Assert it is **not**
    rejected as a conflict — there is nothing to conflict over — and that state is still unchanged.
60. Assert `DecisionState` carries `decision_contract_ref` as a plain string and that no contract
    content — no selected play, counterfactual run-rate, micro-market cohort set, validity state or
    duration — exists anywhere in the WP10-C payload or store.

**`STABLE` requires positive evidence (owner ruling W2)**

61. Construct a contract whose every assumption carries a `not_evaluable_reason` and no evaluable
    trigger. Assert `INDETERMINATE`, and specifically **not** `STABLE`.
62. Construct an assessment where every trigger is `NOT_FIRED` but one carries no `observed_value`.
    Assert `assertStableHasPositiveEvidence` fails and the state is not `STABLE`.
63. Assert `STABLE` is returned only when every trigger is `NOT_FIRED` with a populated
    `observed_value` and `unassessable_assumptions` is empty.

---

## 11. Owner Rulings

### 11.1 Closed — approved 2026-08-15, binding and not reopenable at implementation

**W1 — Shared Decision State binding. APPROVED.**

> Permit the minimal additive WP10-C extension: `decision_contract_ref?: string` and
> `REGISTER_DECISION_CONTRACT`. WP10-C stores the reference only. CDI-07A exclusively owns
> `DecisionContract` content, assumptions, validity, triggers and Half-Life semantics. Registration
> of the same `decision_contract_ref` must be idempotent and must not create artificial
> state/version churn.

Landed as §7.3, with idempotency and concurrency behaviour specified there and enforced by AC-57 to
AC-60. `SHARED_DECISION_STATE_MODEL.md` §8 is reconciled to this ruling at this freeze — the
previously documented `selected_strategy_play`, `counterfactual_run_rate`, `targeted_micro_markets`,
`decision_half_life`, `SET_STRATEGY_PLAY`, `UPDATE_COUNTERFACTUAL_BASELINE` and
`TRIGGER_CAMPAIGN_PREMORTEM` are all refused and removed.

**W2 — Decision Half-Life. APPROVED.**

> Decision Half-Life is NOT a countdown, expiry estimate or fabricated duration. Authoritative
> states: `STABLE`, `WATCH`, `DEGRADED`, `REASSESS_REQUIRED`, `INDETERMINATE`. `STABLE` requires
> positive supporting evidence. `INDETERMINATE` represents insufficient evidence and must never
> collapse into `STABLE`. Preserve the concept in governance with the definition quoted in this
> gate's header. Reconcile the governance references implying countdown/duration semantics and
> remove estimated-hours-remaining examples. Do not introduce quantitative half-life units, expiry
> timestamps or decay curves.

Landed as §5, with the positive-evidence requirement made mechanical in §5.3 and enforced by AC-61 to
AC-63. The governance definition is quoted verbatim in this gate's header and propagated to
`INTENT_FUSION_INTELLIGENCE.md` §6.2, `ARCHITECTURE.md` §12, `UX_DESIGN_PRINCIPLES.md` §5.6,
`ENTERPRISE_SIGNAL_MODEL.md` §7.2 and `MASTER_PLAN.md` §CDI-07A. The `Valid (Est. 36h remaining)`
example is removed, and AC-22 is the permanent regression that would catch its return.

**Decision basis integrity — APPROVED as an owner addendum.**

> Because `frontier_id` is not a durable unique basis identifier, `DecisionContract` must also carry
> an immutable content-derived `decision_basis_digest`. The digest must bind the exact contracted
> decision basis without replacing source references. Define the canonical digest inputs in the gate
> and make determinism a permanent acceptance criterion.

Landed as §2.8 with sixteen canonical inputs in fixed order, explicit canonicalisation rules, and a
published exclusion list with the reason for each exclusion. Determinism is permanent: AC-52 to
AC-56. The digest **binds** and does not **replace** — AC-55 asserts every source reference remains
published and that no code path resolves an artefact through the digest instead of its id.

**Human resolution — RESTATED and binding.**

> Preserve both creation routes. `HUMAN_RESOLVED` must carry authentic resolver provenance and may
> select only a play that was genuinely displayed and admissible. `CHOICE_REQUIRED` must never
> silently create a contract.

Confirms §3.2 to §3.4 unchanged. `resolved_by` is mandatory and is never defaulted from a session,
header or tenant (AC-3); the named play must be in the supplied frontier and `ADMISSIBLE` (AC-5,
AC-6, AC-8); `presented_alternatives` records what the resolver was actually shown (AC-2);
`CHOICE_REQUIRED` without a resolver is `RJ-C2` (AC-1).

### 11.2 Open — non-blocking

| Id | Decision | Recommendation |
| --- | --- | --- |
| **W3** | `registerCampaignIntent` re-registers over a `REGISTERED` record without an immutability guard (**K2**) | Fix outside CDI-07A, as D1/D2 were fixed outside CDI-06. CDI-07A binds defensively by digest and is safe either way. Raised because it is a CDI-01 integrity question that outlives this work package |
| **W4** | `T-SIGNAL` movement thresholds — the lab-default percentages | Owner sign-off on the constants. The shape is frozen; only the values are open. Recommend a threshold above the observed ESF-2 noise floor so `WATCH` means something |
| **W5** | Planning-report reconciliation: `COGNIX_CAMPAIGN_DECISION_INTELLIGENCE_PLANNING_REPORT.md` row 12 and line 80 | Reconcile **after** implementation, per the CDI-05 §8.2 and CDI-06 §1.4 precedent. The six governance rows are reconciled at this freeze on owner instruction; the aspirational `PROPOSED` planning record is not retro-edited |
| **W6** | Whether `HUMAN_RESOLVED` should require a second attributed approver for a resolution that contradicts the constraint chain | Defer. `contradicts_constraint_selection` is published, which makes the act visible. A second approver is a governance policy, not a contract semantic |

---

## 12. Contract-Freeze Verdict

**DESIGN FROZEN. CONTRACT FROZEN. CLEARED FOR IMPLEMENTATION.**

- The domain model (§2), decision-basis digest (§2.8), eligibility rules (§3), lifecycle and
  supersession (§4), Half-Life semantics (§5), assumption and trigger model (§6), signal and Shared
  Decision State integration (§7), provenance and evidence model (§8), API and experience boundaries
  (§9) and acceptance criteria (§10) are frozen and implementable as written.
- **All blocking owner rulings are closed (§11.1), each approved.** W1 permits the minimal additive
  WP10-C reference binding with idempotent registration; W2 fixes Decision Half-Life as a validity
  state model with no quantitative duration and with `STABLE` requiring positive supporting
  evidence; the decision-basis-integrity addendum adds an immutable content-derived
  `decision_basis_digest` with sixteen canonical inputs and permanent determinism criteria; and both
  creation routes are restated and preserved. The freeze is **no longer conditional**. W3–W6 remain
  open and non-blocking.
- **Six governance rows are reconciled at this freeze**, on owner instruction:
  `SHARED_DECISION_STATE_MODEL.md` §8, `INTENT_FUSION_INTELLIGENCE.md` §6.2,
  `UX_DESIGN_PRINCIPLES.md` §5.6, `ARCHITECTURE.md` §12, `ENTERPRISE_SIGNAL_MODEL.md` §7.2 and
  `MASTER_PLAN.md` §CDI-07A. No countdown, duration, expiry or decay semantics remain in governance.
- **The acceptance suite is 63 criteria**, each written as an attack. AC-52 to AC-56 make digest
  determinism permanent; AC-57 to AC-60 make WP10-C idempotency permanent; AC-61 to AC-63 make the
  `STABLE` positive-evidence requirement permanent.
- **No CDI-01/02/03/04/05/06 contract requires modification.** No proven blocker exists. The four
  candidates for one were each resolved inside CDI-07A:
  - Scenario 0 being unreachable through the CDI-06 selection chain (**K5**) — resolved by the
    CDI-07A-owned `HUMAN_RESOLVED` route, which references the frontier and changes nothing in it.
  - `ReadinessEvidenceRef.source_package` being too narrow — resolved by a local structural twin,
    per the CDI-06 owner addendum R1 precedent.
  - `RequiredAuthoritativeInput.enables` being a `TimelineLens` — resolved the same way, exactly as
    CDI-06 did.
  - `CanonicalSignalType` lacking the three §7.2 reserved types — resolved by declining to add them,
    because a decay signal type would create a slot demanding a decay quantity that §5 rules does
    not exist.
- **K1 is the finding that most shapes the contract.** `frontier_id` collides across materially
  different frontiers, measured. Every reference in this design is an identifier *plus* a digest as
  a direct consequence, and AC-9 is the regression that will detect any drift from it.
- **K4 is the finding that most shapes the basis.** Nothing persists CDI-02/CDI-05/CDI-06 artefacts,
  so the contract must snapshot. §2.6 draws the line between transcription and restatement, and
  `assertBasisTranscribedNotRecomputed` makes it machine-checkable rather than a matter of
  discipline.
- **The Half-Life challenge is answered by refusal.** CogniX reports a validity state derived from
  named assumptions and fired triggers, publishes what would change it, and publishes what it would
  need before it could say anything quantitative. It produces no duration, and the guard that
  enforces this rejects the exact example string that stood in the UX principles document until this
  freeze removed it.
- Governance actions completed at this freeze: the six documentation rows reconciled and the
  `MASTER_PLAN` §CDI-07A row updated. Deferred to implementation, per the CDI-04 U7, CDI-05 and
  CDI-06 precedents: ADR recorded, and the W5 planning-report rows reconciled.

---

## 13. Implementation Execution Profile

The work is contract-first and deterministic, and every judgement call is resolved in this gate: the
eligibility rules are an ordered gate with named rejections, the validity model is an ordered
precedence over five named states with no arithmetic, the evidence and trigger taxonomies are
imported rather than designed, and the acceptance criteria are phrased as failing attacks. What
remains is disciplined transcription plus a large regression suite — the CDI-02 through CDI-06
pattern.

**An independent adversarial review pass before commit is mandatory.** CDI-02 through CDI-06 each
shipped defects found by independent review after implementation rather than by their own delivered
suites. CDI-07A carries a distinct risk profile again: **its output is a claim about whether a
decision still holds.** A defect in a frontier is a misleading decision; a defect here is a
misleading reassurance, and reassurance is the failure mode nobody goes looking for.

The review must probe, in this order:

1. **Fabricated stability.** Any path where an unassessable trigger, a missing signal, an absent
   readiness assessment, an empty trigger set or a swallowed error yields `STABLE` rather than
   `INDETERMINATE`. (§5.3, §5.4, AC-28 to AC-30, AC-61 to AC-63)
2. **Duration creep.** Any duration, countdown, expiry, elapsed value or decay rate — in a field, a
   string, a tooltip, a chart axis, an animation, or a value computed and then formatted. (§5.7,
   AC-21 to AC-25)
3. **Basis mutation.** Any path where creation, validity, supersession or withdrawal writes to a
   contract's `basis`, `assumptions` or `triggers`. (**C-INV-5**, AC-13)
4. **Restatement disguised as transcription.** Any snapshot value produced by arithmetic, rounding,
   unit conversion or aggregation rather than by copy. (**C-INV-4**, AC-14 to AC-16)
5. **Binding by identifier alone.** Any comparison, lookup or equality test on `frontier_id`,
   `campaign_intent_id` or `evaluation_id` without its digest. (**C-INV-2**, AC-9 to AC-11)
6. **U4 back door.** Any path where the non-promotion play reaches a contract, including through
   `HUMAN_RESOLVED`, a supersession, or a snapshot. (**C-INV-6**, AC-5)
7. **Validity overreach.** Any path where an assessment names an alternative play, restates an
   economic value, implies a recommendation change, or auto-supersedes. (**C-INV-7**, AC-31, AC-39)
8. **Scenario-driven movement read as world movement.** Any `T-SIGNAL` path where
   `decision_state_version` is not compared, or where `SCENARIO_DRIVEN` movement escalates past
   `WATCH`. (§7.4, AC-32, AC-33)
9. **CDI-01 history mutation.** Any write to the intent store during contract creation, including an
   incidental `updated_at` touch. (**C-INV-8**, AC-17)
10. **Digest non-determinism.** Any input to `decision_basis_digest` outside the §2.8 sixteen — an
    unsorted key, an insertion-ordered array, a re-rounded number, a leaked `run_marker` — and any
    path that resolves a basis artefact through the digest instead of its published id.
    (**C-INV-11**, AC-52 to AC-56)
11. **State/version churn.** Any `REGISTER_DECISION_CONTRACT` path where re-registering the same
    reference increments `state_version`, appends history, recalculates derived impacts, or rejects
    on a stale `expected_version` with nothing to conflict over. (§7.3, AC-57 to AC-59)

---

## 14. Implementation Prompt — CDI-07A

```text
COGNIX - CDI-07A IMPLEMENTATION (Decision Contract & Decision Half-Life)

Branch: Feature/MatchingContract-AutoActivate
Baseline: 2efd1b4a60179e082c8f788c70279450a6625e29 (CDI-06 outcome frontier)
Authoritative design: docs/reports/COGNIX_CDI_07A_DECISION_CONTRACT_DESIGN_GATE.md
(DESIGN FROZEN - CONTRACT FROZEN - CLEARED FOR IMPLEMENTATION. Owner rulings W1, W2, the
decision-basis-integrity addendum and the human-resolution restatement were approved
2026-08-15 and are CLOSED in SS11.1. They are binding and not reopenable at implementation.
W3-W6 remain open and non-blocking.)

Verify continuity first: branch, baseline, both remotes converged, clean tree, and the
CDI-01 through CDI-06 evidence present and green (21, 36, 31, 49, 70, 93 assertions).
Stop on any unexplained divergence.

RULINGS IN FORCE
- A contract records what was decided. It NEVER re-decides and NEVER recomputes its basis.
  Nothing persists CDI-02/CDI-05/CDI-06 artefacts (SS1.3 K4), so the contract carries an
  immutable snapshot captured by VERBATIM COPY at creation, guarded by
  assertBasisTranscribedNotRecomputed which re-reads each value from the supplied artefact
  and requires EXACT equality. No rounding, no unit conversion, no aggregation, no
  renaming. Every SnapshotValue carries source_field_path, source_package and
  restated: false.
- Bind by identifier AND digest, always. frontier_id COLLIDES across materially different
  frontiers (SS1.3 K1, measured) and campaign_intent_id survives content change (K2), so an
  id alone is never a binding. evaluation_id is time-derived and unstable (K3): record it
  as run_marker with reproducible: false and NEVER compare, order, resolve or re-derive by
  it. contract_id is a content hash; never time-derived.
- DECISION BASIS INTEGRITY (owner addendum). The contract carries an immutable
  content-derived decision_basis_digest computed over EXACTLY the sixteen canonical inputs
  in SS2.8, in that fixed order, under the stated canonicalisation rules. It BINDS the basis
  and REPLACES NO source reference - campaign intent, play, evaluation, counterfactual,
  causal result and frontier ids all remain published, and nothing resolves an artefact
  through the digest instead of its id. The exclusion list is binding: run_marker,
  evaluation_id, created_as_of, contract_version, status, supersedes, superseded_by,
  withdrawal, resolution, assumptions, triggers, provenance and evidence_refs are OUT, so a
  superseded contract's basis digest equals what it was while active. Determinism is a
  PERMANENT acceptance criterion (AC-52..AC-56), not a one-off check. decision_basis_digest
  and contract_digest are distinct and must never be conflated.
- A contract may exist ONLY for a genuinely resolved decision. Two routes only:
  CONSTRAINT_RESOLVED (frontier.selection.status === 'SELECTED') and HUMAN_RESOLVED (a
  named resolver picks a displayed ADMISSIBLE play). CHOICE_REQUIRED MUST NOT silently
  become a contract - it becomes one only through an explicit attributed human resolution.
  resolved_by is mandatory and is never defaulted from a session, header or tenant.
- Scenario 0 / Do Nothing IS contractable when explicitly resolved, and HUMAN_RESOLVED is
  the ONLY route to it: the CDI-06 constraint chain seeds survivors from frontier_play_ids
  and a dominated Do Nothing is never a member (SS1.3 K5, measured). Scenario 0 is recorded
  on every contract, is never rendered as "no change", and is never removed or demoted for
  having been dominated.
- The non-promotion play (EXCLUDED_ECONOMICS_INCOMPLETE) is NEVER contractable by any
  route. HUMAN_RESOLVED must not become a back door around CDI-06 owner ruling U4. The
  rejection publishes NON_PROMOTION_REQUIRED_INPUT.
- Decision Half-Life is a STATE, not a duration. Authoritative definition: "Decision
  Half-Life describes how the evidential basis of a decision weakens or remains valid as
  assumptions and signals evolve. In the current architecture it is represented through
  validity states and evidence-triggered reassessment. Quantitative duration is unavailable
  until calibrated temporal evidence exists." States: STABLE | WATCH | DEGRADED |
  REASSESS_REQUIRED | INDETERMINATE, derived by ORDERED PRECEDENCE
  (REASSESS_REQUIRED > DEGRADED > WATCH > INDETERMINATE > STABLE). No count, sum, average,
  weight or threshold-on-a-total participates. STABLE REQUIRES POSITIVE SUPPORTING EVIDENCE:
  every trigger NOT_FIRED with a populated observed_value read from a real source at as_of,
  and unassessable_assumptions empty. A contract with no evaluable triggers is
  INDETERMINATE, never STABLE. INDETERMINATE outranks STABLE and must NEVER collapse into
  it - absence of contrary evidence is not evidence of stability. No duration, countdown,
  expiry, decay curve, remaining-percentage or elapsed-time value exists anywhere, in a
  field OR in a string value. The quantitative measure is contracted NOT_AVAILABLE via
  QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT and published on every contract and assessment.
  There is no EXPIRED contract status and there will not be one.
- Contract content and contract validity are SEPARATE. Validity is recomputed on demand at
  a CALLER-SUPPLIED as_of, is never written back, never mutates the contract, never names
  an alternative play, never restates an economic value, and never auto-supersedes or
  auto-withdraws. Only a named human supersedes or withdraws.
- Signal volatility may trigger reassessment but MUST NOT imply a recommendation change.
  Classify every T-SIGNAL movement: SCENARIO_DRIVEN (decision_state_version changed - our
  own parameter change, ESF-2 is deterministic from Shared Decision State), WORLD_DRIVEN,
  or ATTRIBUTION_UNAVAILABLE. SCENARIO_DRIVEN may raise WATCH at most, never DEGRADED or
  REASSESS_REQUIRED, and carries its disclosure. Every contract declares an AMBIENT_FRAME
  assumption recording that the decision was resolved under ARF-A with signals EXCLUDED,
  with the SS7.4 disclosure on every signal evaluation.
- REUSE, do not redefine. IMPORT EvidenceStrength, EVIDENCE_STRENGTH_ORDER,
  weakestEvidenceStrength, ConfidenceBand, ThresholdCalibrationStatus, ReadinessState,
  ReadinessVeto, ReadinessCondition, ReadinessDimensionId from campaign-readiness-model.ts.
  IMPORT ComparisonSetInvariants, AmbientFrameStamp, UnavailableOutcomeDimension,
  ConstraintElimination, DeclaredConstraint, SelectionStatus, SelectionBasis, PlayKind,
  SCENARIO_ZERO_FRAMING, NON_PROMOTION_REQUIRED_INPUT from campaign-frontier-model.ts.
  IMPORT CanonicalSignalType, SignalEntityType, SimulationPeriod from
  enterprise-signal-model.ts. DecisionTrigger REFERENCES CDI-04 ReadinessChangeTrigger via
  readiness_trigger_ref - do NOT declare a second trigger taxonomy. Declare only the two
  local structural twins ContractEvidenceRef and ContractRequiredAuthoritativeInput, per
  the CDI-06 owner addendum R1 precedent - no upstream union is widened.
- No hidden score, weight, ranking or composite validity scalar - not even unused.
- Any time-sensitive evaluation uses a caller-supplied reference instant. Date.now() and
  argless new Date() must not appear in any decision logic.
- Preserve tenant/session boundaries and fail closed on mismatched references. Cross-tenant
  reads report NOT FOUND, never forbidden - no existence oracle.

BUILD
1. packages/contracts/src/campaign-decision-contract-model.ts - types and validators per
   SS2-SS9: DecisionContract, DecisionContractReference, DecisionContractBasis,
   BoundArtefactRef, SnapshotValue, RejectedAlternative, ScenarioZeroContractRecord,
   DecisionResolution, ContractWithdrawal, DecisionAssumption, DecisionTrigger,
   TriggerEvaluation, UnassessableAssumption, SignalValidityReference,
   SignalMovementAttribution, DecisionValidityAssessment, DecisionValidityState,
   HalfLifeBasis, ContractEvidenceRef, ContractRequiredAuthoritativeInput,
   QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT, DECISION_BASIS_DIGEST_INPUTS, plus
   computeDecisionBasisDigest, validateDecisionContract,
   validateDecisionValidityAssessment, validateContractCreationRequest,
   assertBasisTranscribedNotRecomputed, assertContractImmutable,
   assertBasisDigestDeterministic, assertBasisDigestReplacesNoReference,
   assertNoDurationSemantics (KEY and VALUE scans),
   assertNoHiddenValidityScalar, assertResolutionAttributed,
   assertNonPromotionNotContractable, assertScenarioZeroRecorded,
   assertValidityProposesNoAlternative, assertValidityReadNoEconomics,
   assertStableHasPositiveEvidence, assertIndeterminateOutranksStable,
   assertSignalMovementAttributed, assertTenantSessionCoherent. Export from index.ts.
2. lib/decision-contract-store.ts - IDecisionContractStore abstraction plus a
   tenant/session-indexed in-memory implementation, following IDecisionStateStore.
   create / markSuperseded / markWithdrawn / tenant-scoped reads ONLY. No update method.
3. lib/campaign-decision-contract-engine.ts - pure, deterministic, zero React. Eligibility
   gate E1-E9 with rejections RJ-C1..RJ-C9, basis transcription, assumption and trigger
   derivation, and validity assessment by ordered precedence at a caller-supplied as_of.
4. app/api/v1/campaigns/decision-contract/route.ts (POST create),
   /[id]/route.ts (GET), /current/route.ts (GET), /[id]/validity/route.ts (POST),
   /[id]/withdraw/route.ts (POST). Orchestration only. NO PATCH on any route.
5. WP10-C minimal additive extension (W1, approved): decision_contract_ref?: string on
   DecisionState - a PLAIN STRING, not a structured handle - and
   REGISTER_DECISION_CONTRACT in DecisionCommandType, following the campaign_intent_ref /
   REGISTER_CAMPAIGN_INTENT precedent. Registering the SAME reference is a NO-OP: no
   state_version increment, no history record, no derived-impact recalculation,
   changed_fields empty, and no version-conflict rejection on a stale expected_version
   when the stored reference already equals the supplied one. Only a CHANGE of reference
   is a state transition and it obeys the existing optimistic-concurrency rules. Do NOT
   extend calculateDerivedImpacts. Do NOT add SET_STRATEGY_PLAY,
   UPDATE_COUNTERFACTUAL_BASELINE, TRIGGER_CAMPAIGN_PREMORTEM, decision_half_life,
   selected_strategy_play, counterfactual_run_rate or targeted_micro_markets. WP10-C
   stores NO contract content of any kind.
6. Surface: Contract Summary Card + 2-tier validity (Tier 1 state word only, Tier 2
   assumption/trigger/signal evidence drawer). No countdown, clock, timer, progress bar,
   gauge or decay animation. No ranking language.
7. tests/unit/run-cdi07a-tests.ts - implement ALL 63 adversarial acceptance criteria in
   SS10 as permanent regression tests, including AC-52..AC-56 (basis digest determinism),
   AC-57..AC-60 (WP10-C idempotency) and AC-61..AC-63 (STABLE positive evidence). Re-run
   the CDI-01 through CDI-06 suites and the ESF/IFI/WP10 guardrails; all must remain
   green (21, 36, 31, 49, 70, 93).

DO NOT
- Do not modify any CDI-01/02/03/04/05/06 contract. If a blocker appears, STOP and report
  it rather than widening a frozen upstream contract.
- Do not add the three ENTERPRISE_SIGNAL_MODEL SS7.2 signal types; CanonicalSignalType is
  not widened (SS7.5). Those governance rows are already reconciled to this ruling.
- Do not reintroduce the K6 governance semantics: no decision_half_life hours, no
  selected_strategy_play vocabulary, no "Est. 36h remaining" indicator. All six rows were
  reconciled at the design freeze; AC-21, AC-22 and AC-25 are the permanent regressions.
- Do not implement CDI-07B Pre-Mortem, Prediction vs Reality or the Closed Learning Loop.
- Do not add ESF-4/5, ML or LLM ranking, or extract a service.
- Do not commit or push until owner review.

Repository output must remain tool-agnostic: no model or tool identity, watermarks,
signatures, attribution, generated-by markers or co-author metadata.
```
