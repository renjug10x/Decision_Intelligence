# COGNIX — CDI-07A DECISION CONTRACT & DECISION HALF-LIFE EXECUTION REPORT

**Work Package:** CDI-07A — Decision Contract & Decision Half-Life  
**Authorised Baseline:** `dde0e8c3e1d2966d41cb75fea935c75681974df9`  
**Branch:** `Feature/MatchingContract-AutoActivate`  
**Authoritative design:** `docs/reports/COGNIX_CDI_07A_DECISION_CONTRACT_DESIGN_GATE.md`  
**Execution Date:** 2026-08-15  
**Status:** COMPLETE — independently reconciled 2026-08-15; eight defects corrected before commit

---

## 1. Continuity

| Check | Result |
|---|---|
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD vs authorised baseline | **MATCH** — `dde0e8c3e1d2966d41cb75fea935c75681974df9` at start |
| Remotes | `gitlab` + `origin` |
| Stash | Empty |
| Working tree at start | Clean (implementation changes local, uncommitted) |
| CDI-01→06 evidence | Present; regressions green |
| Design gate | FROZEN (W1, W2, decision-basis integrity, human resolution closed) |
| Unexplained divergence | **None** |

---

## 2. Implementation Summary

CDI-07A delivers an immutable **Decision Contract** that records an already-resolved decision and an evidence-backed **Decision Half-Life** validity assessment:

- Creation only via `CONSTRAINT_RESOLVED` or attributed `HUMAN_RESOLVED`
- `CHOICE_REQUIRED` never silently contracts; Scenario 0 only via explicit human resolution
- Non-promotion non-contractable while economics incomplete (`RJ-C3` + `NON_PROMOTION_REQUIRED_INPUT`)
- Basis snapshots = exact quotations of supplied artefacts (no recompute / round / aggregate / convert)
- `decision_basis_digest` over exactly sixteen canonical inputs; binds and does not replace source refs
- Validity precedence: `REASSESS_REQUIRED > DEGRADED > WATCH > INDETERMINATE > STABLE`
- `STABLE` requires positive supporting evidence; missing/unevaluable ≠ STABLE
- Quantitative half-life `NOT_AVAILABLE` via `QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT`
- WP10-C: plain `decision_contract_ref` + idempotent `REGISTER_DECISION_CONTRACT`
- Canvas Layer 7: Contract Summary + Tier 1 state word + Tier 2 evidence drawer
- No LLM in create / eligibility / transcription / trigger evaluation / validity derivation

---

## 3. Files / Contracts / APIs

| Area | Path |
|---|---|
| Contract | `packages/contracts/src/campaign-decision-contract-model.ts` **(new)** |
| WP10-C additive | `packages/contracts/src/decision-state-model.ts` — `decision_contract_ref?`, `REGISTER_DECISION_CONTRACT` |
| CDI-01→06 contracts | **Unmodified** |
| Export | `packages/contracts/src/index.ts` |
| Immutable store | `lib/decision-contract-store.ts` **(new)** |
| Engine | `lib/campaign-decision-contract-engine.ts` **(new)** |
| WP10-C handler | `lib/decision-state-store.ts` — same-ref strict no-op |
| APIs | `POST/GET …/decision-contract`, `/current`, `/[id]`, `/[id]/validity`, `/[id]/withdraw` — **no PATCH** |
| OpenAPI | `docs/openapi/campaign-decision-v1.yaml` v1.6.0 |
| Client | `lib/campaign-intent-client.ts` (+ `lib/decision-contract-client.ts` re-export) |
| Canvas | Layer 7 in `components/CampaignDecisionCanvas.tsx` |
| Tests | `tests/unit/run-cdi07a-tests.ts` — 155 assertions covering AC-1…AC-63 plus reconciliation regressions RV-1…RV-8 |
| Governance | ADR-034, MASTER_PLAN COMPLETED, planning rows 11–12 + §API path, this report |

---

## 4. Decision Contract Semantics

- Records; never re-decides.
- Routes: R1 copies frontier selection verbatim; R2 requires non-empty `resolved_by` + admissible displayed play; `resolution_statement` carries the resolver's words (frozen §3.3).
- Binding: every `BoundArtefactRef` carries id + content digest; `evaluation_id` is `run_marker` only (`reproducible: false`).
- Supersession / withdrawal are the only lifecycle transitions; validity never writes the store.

---

## 5. Validity / Half-Life Semantics

- Half-Life = evidence-backed validity state, not countdown / expiry / remaining hours / decay.
- Precedence enforced mechanically; SCENARIO_DRIVEN T-SIGNAL capped at `WATCH`.
- Movement attribution: `SCENARIO_DRIVEN` | `WORLD_DRIVEN` | `ATTRIBUTION_UNAVAILABLE`.
- `QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT` published on every contract and assessment.

---

## 6. WP10-C Integration

- Stores reference only — no selected play, economics, or validity state in Shared Decision State.
- Same-reference `REGISTER_DECISION_CONTRACT`: no version increment, no history, no derived-impact recalc, stale `expected_version` does not conflict.
- Different reference: normal optimistic concurrency + single version bump.
- `calculateDerivedImpacts` not extended.

---

## 7. Test Evidence

| Suite | Result |
|---|---|
| CDI-07A | **155/155 PASS** (AC-1…AC-63 + RV-1…RV-8) |
| CDI-06 | **93/93 PASS** |
| CDI-05 | **70/70 PASS** |
| CDI-04 | **49/49 PASS** |
| CDI-03 | **31/31 PASS** |
| CDI-02 | **36/36 PASS** |
| CDI-01 | **21/21 PASS** |
| WP10-C decision-state | **PASS** |
| ESF-2 | **19/19 PASS** |
| IFI-1 | **12/12 PASS** |
| Bugfix integrity | **4/4 PASS** |
| contracts `tsc` | **PASS** |
| `npm run build` | **PASS** — `/decision-contract` routes registered; `tests/` excluded from Next typecheck (unit suites still run via `tsx`) |
| `git diff --check` | **PASS** at report time |

Attacks covered: fabricated STABLE, duration/countdown creep, basis mutation, recomputation-as-transcription, digest-as-lookup, non-promotion back door, validity rewriting economics, Scenario 0 human provenance, SCENARIO_DRIVEN > WATCH, CDI-01 history mutation, digest nondeterminism, WP10-C same-ref version churn, tenant/session leakage, rendered Layer 7 surface scan.

---

## 8. Deviations

| Item | Resolution |
|---|---|
| Execution prompt listed `resolved_at` / `resolution_basis` for HUMAN_RESOLVED | **Frozen gate §3.3 wins:** the fields are `resolved_by` + `resolution_statement`. Confirmed at reconciliation that no `resolved_at` is needed — the authentic resolution instant is already captured, caller-supplied, as `created_as_of` (gate §2.2), which is covered by `contract_digest` and is therefore tamper-evident. No wall-clock logic was introduced. A `HUMAN_RESOLVED` contract is now auditable on all four counts: **who** (`resolved_by`), **what** (`selected_play_id` + `presented_alternatives`), **why** (`resolution_statement`, made mandatory at reconciliation — it was optional and a contract could be created without it) and **at what reference instant** (`created_as_of`). All four are rendered on the Contract Summary card. |
| Binding digests elide run-markers (`evaluation_id`, `timestamp`, `readiness_id`, `created_at`) | Required for AC-12 byte-identical `contract_id` across processes; content drift (AC-9 K1) still detected. |
| Canvas does not call `REGISTER_DECISION_CONTRACT` | **Corrected at reconciliation.** This left the contract created and Shared Decision State unbound, so the W1 command was dead in the product path. `lib/decision-state-client.ts` already exposes `fetchCurrentDecisionState` and `executeDecisionCommand`, so the Canvas now resolves `decision_state_id` / `state_version` and registers the plain-string reference. WP10-C ownership is unchanged — it still stores the reference only, and re-registration remains an idempotent no-op. |
| `tsconfig.json` excluded `tests/` from Next typecheck | **Narrowed at reconciliation.** The blanket exclusion also hid two genuine CDI-07A errors: the delivered `SignalValidityReference` fixtures used a `signal_type` and a `contracted_period` that are not members of the frozen ESF-1 unions, so the signal ACs were exercising an off-contract shape. The fixtures are corrected and the exclusion is now scoped to the pre-existing `tests/unit/journey-telemetry.test.ts` (missing jest type definitions, unrelated to CDI-07A and failing at the authorised baseline). RV-8 keeps the exclusion from widening again. |

---

## 9. Residual Risks

- W3 (CDI-01 re-register immutability) remains open outside CDI-07A — defended by digest binding.
- W4 T-SIGNAL thresholds remain uncalibrated lab defaults (disclosed).
- In-memory contract store loses state on container restart (same demonstration limitation as WP10-C) — disclosed, not disguised.
- `STABLE` is unreachable at this baseline: every contract declares a load-bearing `AMBIENT_FRAME` assumption that carries a `not_evaluable_reason` because no `T-SIGNAL` binding exists at creation, so a fully-supplied assessment is `INDETERMINATE`. This is the intended reading of W2, not a defect, and it resolves once signal context is bound at creation.
- `WORLD_DRIVEN` signal attribution is unreachable without an `EXTERNAL_CONNECTOR` observation source, which is an ESF-3 dependency CDI-07A deliberately does not take. Published as an `AWAITING_AUTHORITATIVE_SOURCE` capability.
- The `GET …/decision-contract/current` route falls back to demo tenant/session defaults when the query parameters are absent, following the existing route precedent. Every store read remains tenant/session scoped.

---

## 10. Completion Verdict

**CDI-07A IMPLEMENTATION COMPLETE against the frozen design gate, and INDEPENDENTLY RECONCILED.**

Independent adversarial review ran outside the delivered suite and landed eight defects, all corrected
with permanent regressions (RV-1…RV-8, ADR-034):

1. **Fabricated `STABLE`** — declared-not-evaluable assumptions were never published in
   `unassessable_assumptions`, so every contract reported `STABLE` while its load-bearing
   `AMBIENT_FRAME` assumption had never been assessable. Gate §5.3 / §5.4 / W2.
2. **Fabricated `WORLD_DRIVEN` attribution** — an unchanged `decision_state_version` was read as
   world movement, contradicting the contract's own `AWAITING_AUTHORITATIVE_SOURCE` capability.
3. **`T-SIGNAL` escalation ignored `load_bearing`**, letting an annotation-only signal reach `DEGRADED`.
4. **`presented_alternatives` omitted a human-resolved Scenario 0**, recording a resolver choosing a
   play absent from its own choice set.
5. **WP10-C side-channel binding** — any command payload could bind `decision_contract_ref` with
   `changed_fields` empty.
6. **`resolution_statement` was optional**, so a `HUMAN_RESOLVED` contract recorded who and what but
   not why.
7. **Shallow store freeze** left `basis`, `assumptions` and `triggers` writable through the returned
   reference.
8. **Canvas** could neither resolve Scenario 0 nor bind `decision_contract_ref` into Shared Decision
   State.

Suite: 155/155. CDI-01…06 unchanged at 21 / 36 / 31 / 49 / 70 / 93. Contracts TypeScript clean,
`npm run build` clean, `git diff --check` clean.

---

## 11. Recommended Next WP

**CDI-07B — Campaign Pre-Mortem & Closed Learning Loop** (HARD on CDI-07A + WP10-D; INTEGRATION on ESF-3).  
Primary agent: the designated CDI stream implementation agent, with a mandatory independent adversarial review pass before commit — the CDI-02…CDI-07A precedent. Reconciliation and commit of CDI-07A are complete; CDI-07B is unblocked.
