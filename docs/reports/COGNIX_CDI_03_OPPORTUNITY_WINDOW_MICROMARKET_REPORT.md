# COGNIX — CDI-03 OPPORTUNITY WINDOW & MICRO-MARKET EXECUTION REPORT

| Field | Value |
|---|---|
| Work Package | CDI-03 — Opportunity Window & Micro-Market Opportunity Graph |
| Authorised baseline (pre-implementation) | `a9ed28e4083faefa78f03bac44940ee70721b5b7` |
| Branch | `Feature/MatchingContract-AutoActivate` |
| Execution date | 2026-08-15 |
| Status | COMPLETED — reconciled and closed after independent review |

---

## 1. Continuity

| Check | Result |
|---|---|
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD vs authorised baseline | **MATCH** — `a9ed28e4083faefa78f03bac44940ee70721b5b7` |
| Remotes | `gitlab` + `origin` |
| Working tree at gate | Clean; stash empty |
| CDI-01 / CDI-02 / WP10-A evidence | Present (`COGNIX_CDI_01_*`, `COGNIX_CDI_02_*`, `data/stores.json` 50 stores) |
| Unexplained divergence | **None** — gate PASSED |

---

## 2. Implementation Summary

CDI-03 delivers deterministic **when + where** intelligence:

- **Opportunity Window discovery** — candidate 7-day windows ranked by explainable synthetic factors (seasonality, weekday mix, payday, event calendar, weather proxy, month-position, objective tilt).
- **`KNOWN_DATES`** — stated planned window is recommended; alternatives still ranked for comparison.
- **`FIND_BEST_WINDOW`** — highest yield candidate recommended; `resolved_temporal_uplift_pp` feeds CDI-02.
- **Micro-Market graph** — all 50 WP10-A stores scored into HIGH / MEDIUM / WATCH / EXCLUDE with inclusion/exclusion reasons; regional cohorts summarised.
- **Additive CDI-02 hook** — optional `resolved_temporal_uplift_pp` / `opportunity_window_id` on `CampaignEvaluationRequest` replaces the FIND_BEST_WINDOW timing-placeholder dampener only when supplied.

Promotion mechanic is never inferred from `CONSIDER_PROMOTION` alone. Synthetic coefficients remain labelled `synthetic_demo`.

---

## 3. Contracts

| Contract | Location |
|---|---|
| `OpportunityWindowEvaluation`, `OpportunityWindowCandidate`, factors/tiers | `packages/contracts/src/campaign-opportunity-model.ts` |
| `MicroMarketOpportunity`, `MicroMarketStoreScore`, `MicroMarketCohort` | same |
| `OpportunityDiscoveryRequest` / `Response` | same |
| Additive fields on `CampaignEvaluationRequest` | `packages/contracts/src/campaign-counterfactual-model.ts` |
| Barrel export | `packages/contracts/src/index.ts` |

CDI-01 frozen fields/lifecycle: **not mutated**. CDI-02 semantics (ambient vs intervention, driver_class, Do Nothing, placeholders): **preserved**; tests 21–30 pass.

---

## 4. Opportunity Window Design

1. Generate weekly candidate starts from a fixed demo anchor (`2026-08-17`) over a 56-day horizon (default 7-day duration).
2. Score each window with deterministic factors; clamp yield to 0–100; map to tiers PREFERRED / ACCEPTABLE / SUBOPTIMAL / AVOID.
3. Map yield → `estimated_temporal_uplift_pp` ∈ ~[0.35, 2.40] for CDI-02 consumption.
4. `KNOWN_DATES`: include stated window (`is_stated_dates: true`) and recommend it.
5. `FIND_BEST_WINDOW`: recommend max `yield_score`.
6. Different calendar starts produce materially different yields (seasonality + event/weather/month-position hashes).

---

## 5. Micro-Market Evaluation Design

| Factor | Source | Synthetic? |
|---|---|---|
| Format fitness | store `format` × objective | Yes |
| Region scope match | store `region` vs canvas `region` | No (truthful scope) |
| Staff capacity | store `staff` | Yes (proxy) |
| Catchment density | lat/lng peer clustering | Yes |
| Cohort hint alignment | canvas `store_cohort_hint` | No (truthful match) |
| Availability proxy | hash(store_id, sku/category) | Yes |

Stores outside region scope are not `included`. Recommendations are HIGH-tier (fallback MEDIUM). Every store carries explainable reasons — no opaque AI ranking.

---

## 6. Files / APIs Changed

### Engine
- `lib/campaign-opportunity-engine.ts` **(new)**
- `lib/campaign-causal-engine.ts` — additive temporal hook (resolved window first)

### API / OpenAPI
- `POST /api/v1/campaigns/opportunity-windows`
- `POST /api/v1/campaigns/micro-markets`
- `POST /api/v1/campaigns/opportunity-discover`
- `docs/openapi/campaign-decision-v1.yaml` → v1.2.0

### Experience
- `components/CampaignDecisionCanvas.tsx` — Layer 3 when/where
- `lib/campaign-intent-client.ts` — discovery client + resolved temporal passthrough

### Tests / Governance
- `tests/unit/run-cdi03-tests.ts` **(new)** — 31 tests incl. adversarial and review regression guards
- `docs/governance/MASTER_PLAN.md` — CDI-03 COMPLETED
- `docs/architecture/ARCHITECTURE_DECISIONS.md` — ADR-030
- this report

---

## 7. Validation Evidence

| Suite | Result |
|---|---|
| CDI-03 (`run-cdi03-tests.ts`) | **31/31 PASS** (21 delivered + 10 review regression guards) |
| CDI-02 (`run-cdi02-tests.ts`) incl. tests 21–30 | **30/30 PASS** |
| CDI-01 | **21/21 PASS** |
| WP10-A / bugfix integrity (50 stores) | **4/4 PASS** |
| WP10-B journey telemetry | **PASS** |
| WP10-C shared decision state | **PASS** |
| WP10-D learning patterns | **13/13 PASS** |
| ESF-2 | **17/17 PASS** |
| ESF-3 | **22/22 PASS** |
| IFI-1 | **12/12 PASS** |
| Signals | **6/6 PASS** |
| Contracts TypeScript (`tsc --noEmit`) | **PASS** (exit 0) |
| Application build (`next build`) | **PASS** — all three CDI-03 routes registered |
| `git diff --check` | **PASS** |

Covered adversarial cases: empty tenant, cross-tenant/session by-id on both the shared resolver and the
combined orchestrator, inline tenant mismatch, `CONSIDER_PROMOTION` without mechanic, Do Nothing scope
discovery, regional non-leakage, country-qualified region scope, inverted and absent `KNOWN_DATES`
ranges, multi-month stated windows, full-year window score distribution, and cross-region/objective/SKU
differentiation.

---

## 8. Deviations

1. **Combined discovery endpoint** `POST /api/v1/campaigns/opportunity-discover` added beyond the two planned endpoints — convenience for Canvas Layer 3; does not replace the planned APIs.
2. **CDI-02 additive hook** applied *before* timing-placeholder dampener so FIND_BEST_WINDOW (which projects `timing_source=cdi01_placeholder_default`) can still consume resolved windows. Omitted hook → CDI-02 behaviour unchanged (0.5 placeholder dampener).
3. Planning matrix status rows for capabilities 4–5 left as historical planning text; authoritative status is MASTER_PLAN + this report + ADR-030.

---

## 8A. Independent Review — Defects Found and Corrected

Independent review reproduced the delivered suite (21/21) and then challenged it. Six defects were found
that the delivered tests did not detect. All were corrected within CDI-03 scope; each carries a permanent
regression guard (tests 22–31).

| # | Severity | Defect | Correction | Guard |
|---|---|---|---|---|
| D1 | High | Window `yield_score` was clipped at the 0–100 ceiling. Multiple candidates scored **exactly 100**, so the recommended window was decided by sort order rather than merit, and `resolved_temporal_uplift_pp` resolved to the **2.4 pp ceiling for effectively every campaign** — defeating the purpose of feeding differentiated temporal uplift into CDI-02. | Scores are normalised against the factor model's theoretical bounds instead of clipped. The transform is strictly monotone, so ranking semantics are unchanged; saturation and ties are removed. Uplift now differentiates (e.g. 2.00 / 1.90 / 1.83 pp across regions). | 24, 25 |
| D2 | High | `regionMatch` treated any campaign region containing the substring `uk` as estate-wide. `"UK South East"` included **all 50 stores** and told every one of them its region "matches campaign scope" — an untruthful inclusion reason. | Country qualifiers are stripped before matching; only genuine estate-wide tokens (`national`, `nationwide`, `uk`, `united kingdom`, `all regions`) widen scope. | 22, 23 |
| D3 | High | The fixed demo anchor (`2026-08-17`) was hardcoded and undisclosed. Neither the contract, provenance, API nor Canvas indicated that candidate dates come from a seeded anchor, so seeded temporal assumptions were presented as live evidence. | Added `discovery_anchor` to the contract (`anchor_date`, `anchor_mode: fixed_demo_anchor`, horizon, explicit disclosure text), mirrored into `provenance` (incl. `discovery_anchor_is_live_date: 'false'`), published in OpenAPI, and surfaced as a Canvas disclosure. Determinism is retained. | 26 |
| D4 | Medium | A `KNOWN_DATES` intent with no stated dates silently recommended an **anchor-grid window as if it were the campaign's own dates**. Reachable via the inline-intent API path, which bypasses CDI-01 registration validation. | `KNOWN_DATES` without a valid stated range is rejected with `InvalidTimingIntent`, upholding the CDI-01 invariant at the engine boundary. | 27 |
| D5 | Medium | Stated windows outside 1–28 days were silently replaced by a 7-day window, and inverted ranges silently produced a fabricated end date. The canvas reported a window the user never stated. | Stated ranges are honoured verbatim at any length; invalid ranges are rejected. Weekday mix is now a duration-invariant share, so long windows score on the same bounded scale. | 28, 29 |
| D6 | Medium | The Canvas `Evaluate` button passed the CDI-03 uplift for **`KNOWN_DATES`** campaigns, silently overriding closed CDI-02 stated-dates semantics — contradicting the report's own residual-risk claim. The register path guarded correctly; the two paths disagreed. | Both Canvas paths now apply the same `FIND_BEST_WINDOW` guard. Closed CDI-02 `KNOWN_DATES` semantics are preserved. | CDI-02 30/30 |

Additionally, the tenant/session boundary existed in **three** near-identical copies (both single-purpose
routes plus the engine). These were consolidated onto one exported `resolveOpportunityCampaign` so the
isolation rule cannot drift between entry points. No semantic change; guarded by test 31.

---

## 9. Residual Risks

1. Window/micro-market coefficients are synthetic demos — must not be presented as production econometrics.
2. Catchment density is a geometric peer proxy, not true catchment polygons or footfall.
3. Availability is a deterministic hash proxy — not live inventory.
4. Canvas re-evaluates CDI-02 with resolved temporal only for FIND_BEST_WINDOW after discovery; KNOWN_DATES continues to use canvas-stated timing semantics (1.3 pp when not placeholder-excluded). Both Canvas paths enforce this consistently as of the D6 correction.
5. In-memory Campaign Intent store remains process-local (same as CDI-01/02).
6. **Micro-market tier calibration is generous at wide scope.** At national scope 41 of 50 stores classify HIGH and are recommended. Scores remain fully discriminating (62.4–99.8, no clipping) and every store is explainable, so this is a calibration judgement rather than a correctness defect — but "micro-market" implies more selectivity than an 82% recommendation rate conveys. Deliberately left uncorrected under minimal-change authority; recommend revisiting thresholds when real store signals replace the seed.
7. The discovery anchor is fixed at `2026-08-17`. It is now disclosed everywhere it surfaces, but it does not track the current date and will drift further from "today" over time.

---

## 10. Exact Handoff State

- **Branch:** `Feature/MatchingContract-AutoActivate`
- **Baseline at start:** `a9ed28e4`
- **Working tree:** CDI-03 committed after independent review, reconciliation and validation
- **Next WP:** CDI-04 — Campaign Decision Readiness & Resilience
- **Do not:** implement CDI-04+ in this WP

---

## 11. Completion Verdict

**CDI-03 COMPLETE** against Master Plan, ADR-026/028/029/030, frozen CDI-01, closed CDI-02 semantics, and
WP10-A store integration — following independent review, six in-scope corrections (§8A) and permanent
regression guards for each.

Opportunity Window and Micro-Market semantics are deterministic, explainable, differentiated across
date/region/objective/SKU, and provenance-labelled. Seeded temporal assumptions are disclosed as such and
never presented as live evidence. The CDI-02 hook remains additive and opt-in; closed CDI-02 semantics and
frozen CDI-01 contracts are unchanged. No CDI-04+ intelligence is present.
