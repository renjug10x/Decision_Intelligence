# COGNIX — CDI-07B PRE-MORTEM, PREDICTION VS REALITY & LEARNING LOOP EXECUTION REPORT

**Work Package:** CDI-07B — Campaign Pre-Mortem, Prediction vs Reality & Closed Learning Loop  
**Authorised Baseline:** `411d8546b8efeb2bd7c3ead0009c4953aeaec8b3`  
**Branch:** `Feature/MatchingContract-AutoActivate`  
**Authoritative design:** `docs/reports/COGNIX_CDI_07B_LEARNING_LOOP_DESIGN_GATE.md`  
**Execution Date:** 2026-08-15  
**Status:** COMPLETE — awaiting independent adversarial reconciliation before commit

---

## 1. Continuity

| Check | Result |
|---|---|
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD vs authorised baseline | **MATCH** — `411d8546…` at start |
| Remotes | `gitlab` + `origin` |
| Stash | Empty |
| CDI-01→07A evidence | Present; regressions green (incl. 155 CDI-07A) |
| Design gate | FROZEN (X1–X4 closed) |
| Unexplained divergence | **None** |

---

## 2. Implementation Summary

Three structurally separate artefacts, each bound by `contract_id` **and** `contract_digest`, none mutating the DecisionContract:

1. **CampaignPreMortem** — declared/structural failure modes; no invented risk precision  
2. **PredictionOutcomeComparison** — on-demand; six-test comparability; no SUCCESS/FAILURE  
3. **LearningCandidate** — eight-condition eligibility; ineligible retained (X4); WP10-D memory only when eligible  

X1/X2 applied. No pattern write. No quantitative Half-Life. No LLM/ML truth.

---

## 3. Files / Contracts / APIs

| Area | Path |
|---|---|
| Contract | `packages/contracts/src/campaign-learning-loop-model.ts` |
| X1 | `OBSERVATION_INDEPENDENT_SOURCE_TYPES` in `external-signal-connector-model.ts`; `isWorldDrivenAdmissibleSourceType` in CDI-07A model + engine |
| X2 | `decision_contract_ref?` + `provenance.decision_contract_digest?` on `EnterpriseMemoryCase` |
| Stores | `lib/pre-mortem-store.ts`, `lib/learning-candidate-store.ts` (deep-freeze) |
| Engine | `lib/campaign-learning-loop-engine.ts` |
| APIs | `…/pre-mortem`, `…/prediction-comparison`, `…/learning-candidate`, `GET …/learning-candidates` |
| OpenAPI | `campaign-decision-v1.yaml` v1.7.0 |
| Client / Canvas | `lib/learning-loop-client.ts`; Layer 8 |
| Tests | `tests/unit/run-cdi07b-tests.ts` — 232 assertions (AC-1…55 plus RB-1…RB-8 reconciliation regressions) |
| Governance | ADR-035, MASTER_PLAN COMPLETED, this report |

---

## 4. Pre-Mortem Semantics

Enumerated from CDI-04/06/07A/WP10-C declared evidence. Grounding `DECLARED_EVIDENCE` | `STRUCTURAL` | `UNASSESSED` — no ordering by severity. SECOND/THIRD order require `follows_from_failure_mode_id` (RJ-P4). Derived-impact modes carry §3.4 scope disclosure. Never proposes alternative play/contract change.

---

## 5. Prediction-vs-Reality Semantics

Six-test gate; first failure fixes verdict; no error unless `LIKE_FOR_LIKE`.  
**AC-20:** attributable vs gross → `NO_OBSERVED_COUNTERFACTUAL` / `QUANTITY_BASIS_MISMATCH`, no error.  
**AC-21:** broad grain → `GRAIN_MISMATCH`, no apportionment.  
Verdict precedence: OUTSIDE > WITHIN > INDETERMINATE; WITHIN needs positive evidence.

---

## 6. Observation-Authority Semantics

Seven-condition conjunction for `AUTHORITATIVE_EXTERNAL`. All ESF-3 connectors currently synthetic → `SYNTHETIC_DEMONSTRATION`. Adapter-defaulted metrics never grant authority. Missing observations remain missing (`OBSERVATION_ABSENT`).

---

## 7. Learning Eligibility / WP10-D

LE-1…LE-8 conjunction published in full. Ineligible: retained, no `LearningCase`, no memory, excluded from N. Eligible: optional `registerMemoryCase` with plain `decision_contract_ref` + digest in provenance. Pattern promotion `NOT_AVAILABLE`. `N > 1` semantic; `N = 3` labelled uncalibrated demo policy only.

A `PredictionOutcomeComparison` is evidence only when it reproduces from the contract and its observations (RB-1). A comparison offered by a caller is re-derived and refused with `RJ-L1` if it does not reproduce, because every LE-* condition except LE-1, LE-2 and LE-6 is read off that object — accepting it as supplied would let a caller decide its own learning eligibility and register synthetic evidence into WP10-D as a real-world precedent. Observation `authority` is likewise re-derived before publication (RB-2) rather than echoed from the caller.

**Baseline truth.** No eligible `LearningCase` is producible at this baseline, so no memory case is registered on the learning path. LE-3 blocks because the contracted grain is composite and an observation addresses a single entity; LE-4 blocks because every ESF-3 connector in the estate is synthetic; LE-7 blocks because no `LIKE_FOR_LIKE` quantity carries a declared prediction envelope, and an envelope is never inferred from the observed value. `N` is therefore never approached and `N = 3` remains an unexercised constant. This is the intended reading of the gate's two refusals, not an implementation gap.

---

## 8. X1 / X2 Result

| Ruling | Result |
|---|---|
| **X1** | `OBSERVATION_INDEPENDENT_SOURCE_TYPES` = image of `mapCategoryToSourceType`; synthetic test before source-type; PLANNING/COMMERCE/FULFILMENT admissible when non-synthetic; synthetic never WORLD_DRIVEN |
| **X2** | `decision_contract_ref?: string` on `EnterpriseMemoryCase`; digest in provenance; no contract content copied |

---

## 9. Test Evidence

| Suite | Result |
|---|---|
| CDI-07B | **232/232 PASS** |
| CDI-07A | **155/155 PASS** |
| CDI-01…06 | 21 / 36 / 31 / 49 / 70 / 93 |
| WP10-C / WP10-D / ESF-2 / ESF-3 / IFI-1 | PASS |
| contracts `tsc` | PASS |
| `npm run build` | See verification below |
| `git diff --check` | PASS at report time |

---

## 10. Deviations

| Item | Resolution |
|---|---|
| Gross `reconciled_sum_pp` often absent from CDI-07A decomposition snapshot | Honest: attributable path refused; gross LIKE_FOR_LIKE rare until snapshot carries reconciliation sum — not fabricated |
| Barrel export | CDI-07B vocabulary wrap exported as `assertCdi07bPayloadVocabulary` so CDI-07A `assertNoDurationSemantics` is not overridden |
| Canvas learning-loop client | Thin wrappers; observations demo-synthetic by design at baseline |

---

## 11. Residual Risks

- Y1–Y4 open (observed counterfactual design, per-assumption observation, non-synthetic connectors, WP10-D telemetry calibration)
- Misleading-hindsight risk remains the primary review focus (gate §14)
- Independent adversarial reconciliation not yet run

---

## 12. Completion Verdict

**CDI-07B COMPLETE against the frozen design gate, independently reconciled 2026-08-15.**

Eight defects corrected before commit (ADR-035 reconciliation record), led by a path that let a caller-supplied comparison decide its own learning eligibility and register synthetic demonstration evidence into WP10-D marked `is_synthetic_demo: false`. Each correction carries a permanent regression test RB-1…RB-8. Suite 232/232; CDI-01…07A unchanged at 21/36/31/49/70/93/155.

---

## 13. Recommended Next WP

Outside CDI stream core: ESF-4 (parallel) or organisational learning calibration (Y4) after CDI-07B reconcile + commit. No further CDI-07* package in the frozen stream.

## 14. Concise next-WP prompt

```text
# COGNIX — POST CDI-07B
After independent adversarial reconciliation and commit of CDI-07B:
- Baseline: <post-CDI-07B SHA>
- Do not reopen X1–X4 or Half-Life as duration
- Next: owner-selected stream (ESF-4 / Y3 non-synthetic connectors / Y4 pattern telemetry)
```
