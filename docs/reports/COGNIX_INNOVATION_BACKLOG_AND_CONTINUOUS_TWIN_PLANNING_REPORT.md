# COGNIX INNOVATION BACKLOG & CONTINUOUS LIVE DECISION TWIN — PLANNING REPORT

**Report type:** Governance / planning assessment. **No runtime implementation.**
**Date:** 2026-08-22
**Baseline:** `claude/cognix-capability-atlas-v2`. Assessment began at `f1c390bc`; five commits
landed upstream during the work (`ATL-06C` live validation closed, `ATL-07`, `ATL-FINAL`, the Atlas
residual register and the Master Plan forensic status assessment). The work was **rebased onto them
and reconciled against them** before commit — §12 and §13 record what that changed.
**Outputs:** [`COGNIX_INNOVATION_BACKLOG.md`](../governance/COGNIX_INNOVATION_BACKLOG.md) ·
[`MASTER_PLAN.md`](../governance/MASTER_PLAN.md) *Innovation Backlog* section ·
**ADR-069**, **ADR-070**

---

## 1. What this task did and did not do

**Did.** Established a governed Innovation Backlog register in the `IB-*` namespace; recorded 13
agreed ideas under 6 themes with dependencies stated in existing governed identifiers; recorded the
architectural relationships between them; assessed the current Promotion / Live Decision Twin
implementation by inspection; specified the target continuous journey; recommended the smallest safe
work-package decomposition; and separated demo priority from Master Plan priority.

**Did not.** Change any runtime behaviour, add future-day prediction, change campaign calculations,
add ML, add data ingestion, add MCP, add AI-key management, add market evidence, start `ESF-4`, start
any Live Decision Twin work package, alter any existing work-package status, or merge any branch.

---

## 2. Continuity established before any edit

| Check | Result |
|---|---|
| Repository / branch | `claude/cognix-capability-atlas-v2` |
| HEAD | `f1c390bc` — *fix(cognix): live grounding segment-offset contract; AC-ATL-06C-9 still open* |
| Remote alignment | `origin/claude/cognix-capability-atlas-v2`, **0 ahead / 0 behind**. `origin/main` not consulted |
| Working tree | Clean except untracked `live-evidence.json` — a scratch artefact of the prior live-grounding task, deliberately **not** committed |
| Capability Atlas baseline | **Closed.** `ATL-01`…`ATL-07` and `ATL-FINAL` all `[COMPLETED]`; `AC-ATL-06C-9` closed on a real credentialed round trip; governance `--enforce` exits 0; `SB-GATE` 3/6, storyboard retained; 18 residuals in [`COGNIX_ATLAS_RESIDUAL_REGISTER.md`](../governance/COGNIX_ATLAS_RESIDUAL_REGISTER.md) |
| Master Plan | Read in full |
| Forensic assessments | [`COGNIX_MASTER_PLAN_FORENSIC_STATUS_ASSESSMENT.md`](COGNIX_MASTER_PLAN_FORENSIC_STATUS_ASSESSMENT.md) §7–§9 (the latest; landed mid-task and adopted) and [`COGNIX_PROGRAMME_10_POST_CDI_CONSOLIDATION_ASSESSMENT.md`](COGNIX_PROGRAMME_10_POST_CDI_CONSOLIDATION_ASSESSMENT.md) §3, §4, §7, §8, §9 |
| Implementation inspected | `components/PromotionPlanner.tsx`, `components/campaign/LiveDecisionTwinLens.tsx`, `lib/campaign-archetypes.ts`, `components/ObservabilityGovernance.tsx`, and the `campaign-decision-contract`, `campaign-timeline`, `campaign-experiment`, `campaign-learning-loop` and `campaign-readiness` contracts |
| Existing backlog governance | **None.** No prior register existed; nothing was duplicated. The Atlas residual register is a *closure* record for delivered work, not a backlog — `R-04`/`R-18` and `R-15` are cross-referenced from `IB-05` and `IB-11` rather than restated |

---

## 3. Innovation Backlog structure

Three registers now govern three different things, with no overlap:

| Register | Governs | Vocabulary |
|---|---|---|
| `MASTER_PLAN.md` | Authorised delivery | `[NOT STARTED]` … `[COMPLETED]` |
| `EXPERIMENT_LIFECYCLE.md` | Maturity of an experiment that exists | `Concept` … `Industry Pattern` · `Retired` |
| `COGNIX_INNOVATION_BACKLOG.md` | Whether an idea is worth exploring and should be proposed | `Idea` … `In Delivery` |

**Lifecycle reconciliation.** The requested stages were reconciled rather than adopted verbatim. The
backlog's stages are **authorisation** states; where a state already had a governed name it borrows
it. `Research` and `Retired` are `EXPERIMENT_LIFECYCLE.md` §2.2 and §3 unchanged.
`Candidate Experiment` is the **handoff** into that lifecycle at `Concept` — not a competing maturity
state — after which a backlog idea and an `EXP-*` entry legitimately coexist for one subject on two
different tracks. This avoids the ordering conflict a naive mapping would create (the Experiment
Lifecycle runs `Concept` → `Research`; the backlog runs `Research` → `Candidate Experiment`).

`Approved` is explicitly *approved to be planned*, not authorised to build. `Planned` means an entry
exists in `MASTER_PLAN.md`. That edit is the authorisation event and nothing else is.

---

## 4. Ideas recorded — 13 across 6 themes

| ID | Theme | Idea | Stage | Builds on (governed) |
|---|---|---|---|---|
| `IB-01` | Learning & Evidence | Decision Observation & Outcome Fabric / Observation Acquisition | Idea | `ESF-6`, `CDI-08`, `OutcomeObservation`, `ESF-3` |
| `IB-02` | Learning & Evidence | Adaptive Signal Trust / Signal Trust Progression | Idea | `ESF-4` (not delivered), `ESF-1`/`ESF-2`, `DOT-11` |
| `IB-03` | Learning & Evidence | Decision Learning Lab | Idea | `CDI-07B`, `CDI-08`, `WP10-D`, `Y4-gov` |
| `IB-04` | Learning & Evidence | Evidence Maturity | Idea | `EvidenceStrength`, `ObservationAuthority`, Demand Observability L0–5, ADR-048 |
| `IB-05` | Market & Product Discovery | Capability Atlas Market Study Programme | Idea | `ATL-06A`/`06B`/`06C`, ADR-053/055/056 |
| `IB-06` | Market & Product Discovery | Client Feedback → Experiment Loop | Idea | `CognixExperiment.learnings[]`, `ATL-06D`, Phase 13 |
| `IB-07` | Market & Product Discovery | Demo Telemetry as Product Discovery Evidence | Idea | `WP10-B` journey telemetry |
| `IB-08` | Domain Expansion | Cross-Domain Capability Packs / Domain Translation | Idea | `config/domains.ts`, Atlas reuse fields, Phase 12 |
| `IB-09` | Data & Integration Fabric | Governed Data Intake & Qualification | Idea | `ESF-6`, `ESF-3`, `ObservationCompleteness` |
| `IB-10` | Data & Integration Fabric | Enterprise Data Connectivity Fabric (MCP as one mechanism) | Idea | `ESF-3`, `ESF-6`, `ESF-1` |
| `IB-11` | Platform AI Governance | AI Provider & Model Governance | Idea | ADR-067, ADR-044 Amd A, `ATL-06A` seam |
| `IB-12` | Campaign Intelligence | Campaign Asset Intelligence | Idea | `CDI-01`, experiment snapshots, `ExecutionBrief` |
| `IB-13` | Campaign Intelligence | **Continuous Live Decision Twin** | **Candidate Experiment** | `CDI-02`, `CDI-05`, `CDI-07A` |

Ideas at `Approved` / `Planned` / `In Delivery`: **0**.

**Naming notes.** *Enterprise Data Connectivity Fabric* explicitly positions **MCP as one supported
connectivity mechanism** behind the existing `ESF-3` envelope seam, not a second architecture and not
a source of authority. *Evidence Maturity* is recorded as a **reconciliation of four existing axes**
rather than a fifth, because the repository already proves the model is multidimensional — a datum
can be `OBSERVED` in strength and `SYNTHETIC_DEMONSTRATION` in authority simultaneously, and any
single ascending ladder would misstate that.

---

## 5. Thematic and architectural relationships

The conceptual lifecycle requested was recorded, with each stage mapped to its **existing** governed
home where one exists:

```text
Business/External Data → IB-10  |  Data Qualification → IB-09  |  Evidence Maturity → IB-04
Signal Trust → ESF-4 (Master Plan) then IB-02   |   Decision Intelligence → EXISTS (CDI/DDF/IFI)
Decision Twin → EXISTS pre-flight, IB-13 continuous  |  Observed Outcomes → IB-01
Attested Observations → EXISTS (ESF-6)  |  Decision Learning → EXISTS (CDI-07B/08), IB-03 inspectable
Learned Behaviour → GATED (N ≥ 3, X3, Y4-cal, ML workstream)
```

**Material finding: four of the ten stages are already built and governed.** The backlog's real
content is the top three stages and the *acquisition* gap at *Observed Outcomes* — the gap `ESF-6`
created by making admission possible without making observations arrive. Recording the chain as if
all ten were future work would have duplicated existing architecture, which §4 of the task
explicitly forbids.

Discovery relationships were recorded separately, because they feed the backlog rather than sitting
on the chain: Client Feedback → `IB-06`; Demo Telemetry → `IB-07`; Market Studies → `IB-05`.

---

## 6. Continuous Live Decision Twin — current-state assessment

Established by inspection at `f1c390bc`. Every claim below is verifiable in the named file.

**Pre-flight is real.** `PromotionPlanner.tsx` builds a `CampaignIntent` from archetype + live
controls and calls four governed engines on every configuration change — CDI-02 evaluation, CDI-03
opportunity, CDI-04 readiness, CDI-05 timeline — clearing each slot on failure rather than leaving
stale numbers on screen.

**In-flight is a static literal.** `LiveDecisionTwinLens.tsx` takes `archetype` as its only
substantive prop and reads `archetype.decision_twin` from `lib/campaign-archetypes.ts`. No engine, no
API, no store.

| # | Finding | Evidence |
|---|---|---|
| 1 | **The remaining horizon does not exist.** `telemetry_streams.length === current_day` in **all 7** archetypes — 5/14, 4/14, 3/7, 5/14, 6/14, 2/5, 5/14. **52 campaign days are absent**, not predicted-and-hidden | `lib/campaign-archetypes.ts`, counted across all seven `decision_twin` blocks |
| 2 | **Both series are seeded.** `expected_*` and `observed_*` on `DecisionTwinStream` are hand-authored literals, not derived from the CDI-02 evaluation just run | `DecisionTwinStream` |
| 3 | **The twin ignores the configuration.** Discount, region and duration drive the pre-flight engines and never reach the twin. A 30-day duration still yields "Day 5 of 14" | `PromotionPlanner.tsx` twin render site |
| 4 | **No activation, no baseline binding.** `activeMode` is local React state with two values and no transition semantics | `PromotionPlanner.tsx` |
| 5 | **Applying an in-flight action does nothing.** `handleApplyInFlightAction` has an empty body; `current_vs_proposed` changes no model and is not recorded | `PromotionPlanner.tsx` |

**Correctly labelled today, and preserved.** `telemetry_basis: 'SIMULATED_DEMO'` is structural, the
`SIMULATED TELEMETRY (DEMO)` badge is present, and the Master Plan's permanent test assertions —
no bare `OBSERVED` class on archetype data, no live-feed claim, no `confidence_pct` — are unaffected
by anything recorded here. `post_campaign_learning` already exists as seeded narrative carrying
`learning_case_status: 'NON_AUTHORITATIVE'`, which is the correct value.

---

## 7. Proposed future-state journey

`Pre-flight (simulate → review → **activate**) → In-flight (observed + predicted → deviation →
intervention → reforecast) → Post-flight (completion → expectation vs outcome → intervention
effectiveness → compare previous campaigns → observation candidate → learning eligibility)`.

Specified in the register §5.3–§5.7. The three governing constraints:

1. **Observed, simulated and predicted are three declared series over one horizon** — never blended,
   never sharing a visual treatment, never readable as one another (ADR-070).
2. **Activation binds the in-flight baseline to an `ACTIVE` `DecisionContract`** — no second
   baseline (ADR-070).
3. **An intervention forks the trajectory** — original preserved, intervention recorded, new
   trajectory added, only the remaining horizon reforecast (ADR-070).

---

## 8. Dependency analysis

**All hard dependencies are already `[COMPLETED]`.** This is the single most consequential finding
for authorisation: the Continuous Live Decision Twin has **no blocked prerequisite**.

| Dependency | Class | Status | What it supplies |
|---|---|---|---|
| `CDI-05` Decision Timeline | HARD | `[COMPLETED]` | `DecisionTimelineProjection` — a **full-horizon** projection with `PRE_CAMPAIGN`/`CAMPAIGN`/`POST_CAMPAIGN` phases, two trajectories, a confidence envelope, and per-point `basis`/`strength`/`synthetic_demo` |
| `CDI-07A` Decision Contract | HARD | `[COMPLETED]` | The activation baseline — `decision_basis_digest`, `contract_digest`, status, assumptions, triggers, `prediction_envelopes`, `DecisionValidityState` |
| `CDI-02` Counterfactual & Causal | HARD | `[COMPLETED]` | The demand and contribution basis every projection resolves to |
| `campaign-experiment-store` | INTEGRATION | Implemented | Preserved decisions and the 2–4 way comparison for "compare previous campaigns" |
| `CDI-08` Observation Correspondence | INTEGRATION | `[COMPLETED]` | `PredictionOutcomeComparison` for post-flight expectation-vs-outcome |
| `WP10-C` Shared Decision State | INTEGRATION | `[COMPLETED]` | In-flight state that is not contract data; scalars, never series |
| `ESF-6` Attested Admission | GATE | `[COMPLETED]` | The unchanged gate a campaign observation candidate must pass. **Not a prerequisite** — the twin produces candidates, not admitted observations |
| `IB-01`, `IB-04` | ENHANCEMENT | Backlog | Would make campaign observations real; neither blocks the twin |

**Reuse finding.** `CDI-05` already does most of what the full-horizon requirement asks for, and
`POST_CAMPAIGN` is already *structurally present and numerically empty* — the exact slot post-flight
fills. The continuous twin is largely **a second consumer of `DecisionTimelineProjection`**, not a
new projection engine. One genuinely new governed concept is needed and it is small:
`TimelineTrajectoryKind` has two values (`COUNTERFACTUAL`, `INTERVENTION`) and cannot express an
observed series or a mid-flight reforecast.

**Metric scope, bounded by defensibility.** Demand ✔, contribution ✔, deviation-from-expectation ✔,
declared uncertainty ✔ (envelope shown **with** its `declared_horizon_uncertainty_profile` basis).
Stock trajectory **qualified** — a series needs a declared depletion basis; `WP10-C` supplies scalars
and `scalar_annotations` exists so a scalar is not drawn as a trend. **Revenue: excluded** — `CDI-05`
publishes it `NOT_AVAILABLE` with a `RequiredAuthoritativeInput`, and that refusal is correct.
Nothing is added because it would make the demonstration look better.

---

## 9. Smallest recommended decomposition

Two work packages. A third is deliberately not proposed.

| WP | Name | Scope | Rationale for the boundary |
|---|---|---|---|
| **`CTW-01`** | Continuous Campaign Timeline & Activation | Activation binding the in-flight period to an `ACTIVE` `DecisionContract`; full selected horizon; observed / simulated / predicted as three declared series; remaining horizon projected from `DecisionTimelineProjection` | Carries the demo value **and** the only new architectural concept (third trajectory kind + activation semantics), which must be frozen before anything builds on it |
| **`CTW-02`** | Adaptive Trajectory & Intervention Reforecast | Trade-off shown before activation; on activation preserve original, record intervention, add trajectory, reforecast remaining horizon only | Strictly additive on `CTW-01`'s frozen trajectory model; cannot be built first — nothing to fork from |
| **NONE** | *(post-flight)* | — | Post-flight reconciliation is extension work on `CDI-08` and `CampaignDecisionExperiment` comparison. A separate package would create a competing history model |

**Recommended first implementation WP: `CTW-01`.**

---

## 10. Risks

| Risk | Mitigation carried into any WP |
|---|---|
| A prediction read as an observation — the most damaging possible outcome in this programme | ADR-070: three declared series, distinct treatment, per-point `basis`/`strength`/`synthetic_demo`, asserted in tests |
| A second activation baseline competing with `DecisionContract` | Activation binds to the existing contract; supersession already modelled |
| A second history model competing with `CDI-08` / experiment comparison | Post-flight extends both |
| Captured outcome quietly becoming a learning input | Candidate only; `ESF-6`/`CDI-08` gates unchanged; no new origin of `synthetic_demo = false` |
| Demo pressure adding undefensible metrics | §8 metric table is the scope boundary; a new quantity requires a declared basis first |
| Regression across seven `[COMPLETED]` CDI packages | Full re-execution of recorded runner baselines as a gate condition |

---

## 11. Learning / observation relationship

A completed campaign produces an **attested observation *candidate*** and nothing more.

```text
Pre-flight decision → decision basis → observed campaign → intervention → final outcome
  → expectation vs reality → attested observation CANDIDATE → learning eligibility [GATED]
```

> **The Live Decision Twin must not claim to perform ML or learning merely because it captures an
> outcome.**

Admission remains governed by `ESF-6` (`source × context → authority`); correspondence by `CDI-08`
(`contract × observation → comparability`). Actual learning stays behind the existing gates —
N ≥ 3 independent eligible cases, the X3 gate, and the standing rule that ML may rank, cluster,
shortlist and suggest but may never establish authority, eligibility, correspondence, comparability
or a verdict.

---

## 12. Master Plan relationship

**`ESF-4` is the existing programme's continuation point.** This was the one finding the mid-task
rebase materially strengthened. The initial assessment preserved `ESF-4` with a hedge — the only
forensic evidence then available was the post-CDI consolidation assessment §4.1, whose verdict
*"valuable, wrongly positioned as next"* was a **sequencing** judgement made before admission landed.
[`COGNIX_MASTER_PLAN_FORENSIC_STATUS_ASSESSMENT.md`](COGNIX_MASTER_PLAN_FORENSIC_STATUS_ASSESSMENT.md)
§7 then landed and states the position directly, on four grounds: `ESF-4` is the **only** unstarted
package whose hard dependency is satisfied; it sits at exactly that point in the frozen post-`CDI-07B`
sequence and is the only one of the four branches not itself gated on observation volume; it unblocks
the most (`ESF-5`, and `DOT-11`, which names it a hard prerequisite); and it closes a live honesty gap
— `EnterpriseSignal.quality` and `.confidence` are carried in a governed contract, rendered on the
signal surfaces, and filled with hard-coded constants.

**Earliest prerequisite-sensitive and highest-value are the same package**, and §7 says so in terms:
no other candidate is both. The hedge was therefore removed rather than kept — the two assessments do
not disagree, the later one being the earlier re-read after its precondition arrived. **No repository
evidence displaces `ESF-4`.**

*Recorded for completeness:* the Capability Atlas workstream has since **closed** — `ATL-01`…`ATL-07`
and `ATL-FINAL` all `[COMPLETED]`, `AC-ATL-06C-9` closed on a real credentialed round trip — so the
one item that could previously have been read as a competing continuation no longer exists. The same
assessment §7 records `Y1` and `Y2` as parallel-eligible **design** tracks and attested-source
onboarding as an operational act no work package can perform for itself (**OD-3**). Neither displaces
`ESF-4`.

**`IB-13` is prioritised on a different axis** — client demonstration value — and was raised
2026-08-22, after `CDI-08`, `ESF-6`, `DDF-01` and `ATL-06D` completed. It is not recorded as having
preceded `ESF-4`. The two do not overlap in capability or in contracts, neither blocks the other, and
the owner may authorise either or both.

**Pre-existing inconsistency observed and deliberately not altered.** In the Master Plan's *Demand
Execution Sequence (registered 2026-08-16)* diagram, `DDF-01` still carries `[NEXT]`, while its own
work-package specification records it `[COMPLETED]` (implemented and independently reconciled
2026-08-16). The diagram is a dated historical registration and the specification is authoritative.

This is **not** among the drift items the forensic status assessment §5 catalogues — it found one
false `[COMPLETED]`, one stale governance marker, zero false `[PLANNED]` and three superseded
requirements still carried, none of them this one. It belongs to the same governance-integrity class
as **OD-1** (the Programme 10 label collision): a reader planning from the diagram rather than the
specification would misread it. Correcting a work-package marker was out of scope for a task barred
from altering work-package status, so it is **reported here rather than edited** — the discipline
`ATL-01` applied to the nine contradictions it found and did not fix. Suggested handling: fold it
into whatever resolves **OD-1**, since both are stale planning markers in the same document.

---

## 13. Backlog visibility in Observability & Governance

**Not implemented, by design.** `components/ObservabilityGovernance.tsx` has seven sections since
`ATL-FINAL` added Atlas Health, and its *Capability lifecycle* section is backed by the Atlas `CAP-*`
capability landscape. A backlog idea is
not a capability (ADR-069), so no registry stands behind it: surfacing the backlog needs a new
governed record type, a read API and a new section. That is runtime implementation, which this task
excludes, and the §16 exemption for "an existing generic registry-backed surface with trivial
wiring" is not met. Pointing the existing section at ideas would also stop the capability landscape
being a partition of the registry — an integrity property that section currently publishes.

The desired future experience is specified in the register §8: an innovation **portfolio**, not a
Jira-style engineering backlog, under an unmissable *Innovation Backlog — not committed delivery
scope* heading. Whether it warrants a work package is owner decision #6.

---

## 14. Recommended first implementation WP

> ### `CTW-01` — Continuous Campaign Timeline & Activation

**Only if the owner authorises `IB-13`.** It is the smallest package that produces visible demo value
while freezing the one new architectural concept everything after it depends on. It touches no file
`ESF-4` touches, so it may run in parallel with the existing programme continuation.

**Not authorised by this report.** `CTW-*` identifiers become real only on entry into
`MASTER_PLAN.md`.

---

## 15. Validation performed

| Check | Result |
|---|---|
| Runtime files changed | **None** — `git diff --stat` covers `docs/` only |
| Existing work-package statuses altered | **None** |
| `ESF-4` continuation preserved | Yes — §12, register §6.1, Master Plan section |
| `IB-13` marked backlog / demo-priority / not implemented | Yes — in all four documents |
| Identifiers verified against the repository | `IB-*` and `CTW-*` namespaces free of collision; every cited capability, contract, ADR and work package exists |
| Relative links resolved | Yes — 0 broken across all four documents |
| ADR numbering | Rebase collision resolved: upstream `ATL-07` took `ADR-068`, so this work's rulings are **`ADR-069`** and **`ADR-070`**. The upstream citation of `ADR-068` in the `ATL-07` specification is untouched |
| Governance checks (`ATL-07`) | `npx tsx scripts/atlas-governance-check.ts --enforce` → **GOVERNANCE CLEAN, exit 0** |
| TypeScript | `tsc --noEmit` clean |
| Test baselines (no code changed; run to prove the rebased tree is green) | `CDI-05` 70/0 · campaign-intelligence 133/0 · `CDI-07A` 155/0 · `CDI-08` 44/0 · `ESF-6` 81/0 · `ATL-07` 52/0 · `ATL-FINAL` 57/0 |
| Untracked `live-evidence.json` | Left untracked, not committed — the raw payload is git-ignored by `ATL-06C` policy and must never be committed |
| Branch | Rebased onto the updated remote; **not merged** |
