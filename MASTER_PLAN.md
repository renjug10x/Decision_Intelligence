# COGNIX MASTER IMPLEMENTATION PLAN & ROADMAP

> **Note:** The authoritative, detailed master roadmap for **CogniX — G10X Enterprise Innovation Lab** is maintained in [`docs/governance/MASTER_PLAN.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/governance/MASTER_PLAN.md).

## Quick Summary of Phases & Immediate Wave

> **Reconciled 2026-08-16.** An earlier revision of this summary listed Phase 9 as *IP and Innovation Governance* and Phases 10–11 as packs and operating model. That numbering was superseded in the authoritative plan and is corrected below.
>
> **Reconciled again 2026-08-23 at the close of `FM-01`.** This summary had drifted from the authoritative plan: `DDF-01` was still shown as `[PLANNED]` and `[NEXT]` although it completed on 2026-08-16, `ATL-06C` still carried a live-validation qualifier that `ATL-FINAL` closed, and `ATL-06D`/`ATL-07` were still `[NOT STARTED]` although both completed on 2026-08-21, as did `ATL-FINAL` on 2026-08-22. The `CTW` programme, `FM-01` and the Release 1.0 baseline are added.

```text
PHASES 0–6   Foundation wave  [COMPLETED]
             Concept freeze · Identity neutralisation · Innovation Portfolio ·
             Innovation Canvas · Commitment Intelligence · Decision Ripple ·
             Curiosity Experience

PHASE 7      Enterprise Memory Foundation                        [COMPLETED]
PHASE 8      Opportunity Intelligence                            [COMPLETED]
PHASE 9      Organisational Learning Intelligence &
             Capability Reintegration                            [COMPLETED]

PROGRAMME 10 Adaptive Intelligence & Scalable Service Architecture
             WP10-A Service/API foundation · WP10-B Journey Telemetry ·
             WP10-C Shared Decision State · WP10-D Memory & Learning API   [COMPLETED]
             Phases 10E–10M (adaptive, ML, learning quality)              [PLANNED]

  Cross-cutting  ESF-1 · ESF-2 · ESF-3 · ESF-6/Y3a                        [COMPLETED]
                 ESF-4 · ESF-5                                            [PLANNED]
  Core capability  IFI-01 · CDI-01 … CDI-08                               [COMPLETED]

  Core capability  DDF-01 — Demand Decision Frontier (P0)                 [COMPLETED]
                 Forecast Stability · Decision Gap · Decision Window ·
                 Decision Regret · combined frontier visual · simulation
  Roadmap        DOT-1 … DOT-12 — Demand Observability & Demand Truth     [ROADMAP]

  Parallel       ATL-01 … ATL-05 — CogniX Capability Atlas                [COMPLETED]
  workstream     ATL-04R — Unified Capability Exploration Experience      [COMPLETED]
                 ATL-06A · ATL-06B — Grounding & Market Intelligence      [COMPLETED]
                 ATL-06C — AI Explanation & Hybrid Reasoning              [COMPLETED]
                 ATL-06D · ATL-07 — Client Pack · Lifecycle Governance    [COMPLETED]
                 ATL-FINAL — Closure, acceptance and baseline             [COMPLETED]

  Demo-priority  CTW-01 · CTW-01R · CTW-03 · CTW-02
                 Continuous Live Decision Twin, from IB-13                [COMPLETED]
                 FM-01 — Governed Forecast Migration &
                 Release 1.0 Hardening                                    [COMPLETED]

RELEASE 1.0  Engineering baseline recorded 2026-08-23 at the close of FM-01.
             READY for owner acceptance testing. DevOps handoff follows owner
             acceptance, not this record.

DEMO-HARD-01 One Decision Case Across the Connected Journey        [COMPLETED]
             Canonical scenario · unified economics · multi-currency ·
             scenario restart · cross-surface reconciliation tests
DEMO-HARD-02 Promotion model seam closed; demand bridge and
             economic basis published                                [COMPLETED]
DEMO-HARD-03 Structured money for derived engine amounts   [PARTIALLY COMPLETED]
             Seeded narrative remains on the compatibility path
DEMO-HARD-04 Every selectable archetype on one economic framework    [COMPLETED]

CONTINUATION ESF-4 — Signal Quality, Confidence & Provenance.  [REACTIVATED]
             Was parked after Release 1.0, not superseded, cancelled or
             deprioritised. Unparked 2026-09-15 on the evidence that its
             blocking dependency ESF-6 completed. Carried by SCI-05.

PROGRAMME    SCI — Scenario Intelligence (the Scenario Laboratory)
             [AUTHORISED 2026-09-15 — NOT STARTED]
             Choose a Scenario / Create Your Own Scenario, on one canonical
             scenario identity. Ten packets across five waves, implemented by
             Cursor and Antigravity in parallel under ADR-084.
             SCI-01 Scenario contract, clock, registry, provenance  [Wave 0]
             SCI-02 Scenario Certification Gate                     [Wave 0]
             SCI-03 Curated scenario packs                          [Wave 1]
             SCI-04 Scenario selection experience                   [Wave 1]
             SCI-05 Living evidence, materiality, Refresh (ESF-4)   [Wave 2]
             SCI-06 Observability & Governance experience           [Wave 2]
             SCI-07 Scenario authoring + governed Google GenAI      [Wave 3]
             SCI-09 CogniX Architecture surface / SB-GATE closure   [Wave 3]
             SCI-08 Create Your Own Scenario experience             [Wave 4]
             SCI-10 CSV enrichment via ESF-6 attested admission     [Wave 4]

PHASE 11     IP and Innovation Governance
PHASE 12     Industry Demonstration Packs
PHASE 13     Innovation Operating Model & Knowledge Capture
```

For complete work packages, user stories, test requirements, and exit gates, see [`docs/governance/MASTER_PLAN.md`](docs/governance/MASTER_PLAN.md).

**Capability Atlas governance:** [`docs/governance/COGNIX_CAPABILITY_ATLAS.md`](docs/governance/COGNIX_CAPABILITY_ATLAS.md) · [`docs/governance/CAPABILITY_KNOWLEDGE_MODEL.md`](docs/governance/CAPABILITY_KNOWLEDGE_MODEL.md) · [`docs/architecture/CAPABILITY_ATLAS_ARCHITECTURE.md`](docs/architecture/CAPABILITY_ATLAS_ARCHITECTURE.md) · ADR-045 … ADR-051.

**Demand capability governance:** [`docs/governance/DEMAND_OBSERVABILITY_MODEL.md`](docs/governance/DEMAND_OBSERVABILITY_MODEL.md) · [`docs/reports/COGNIX_DEMAND_DECISION_FRONTIER_PLANNING_REPORT.md`](docs/reports/COGNIX_DEMAND_DECISION_FRONTIER_PLANNING_REPORT.md) · ADR-040 … ADR-043.

**Scenario Intelligence governance:** [`docs/governance/COGNIX_SCENARIO_INTELLIGENCE.md`](docs/governance/COGNIX_SCENARIO_INTELLIGENCE.md) — the target Scenario Laboratory architecture · [`docs/governance/COGNIX_SCENARIO_CERTIFICATION.md`](docs/governance/COGNIX_SCENARIO_CERTIFICATION.md) — no scenario is demo-active until certified · [`docs/governance/COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md`](docs/governance/COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md) — packets, dependency DAG, frozen contracts, waves and branching · [`docs/governance/COGNIX_BACKLOG_RECONCILIATION_2026_09.md`](docs/governance/COGNIX_BACKLOG_RECONCILIATION_2026_09.md) — the September 2026 backlog reconciliation · ADR-077 … ADR-084.

**Connected demonstration governance:** [`docs/governance/COGNIX_CANONICAL_SCENARIO.md`](docs/governance/COGNIX_CANONICAL_SCENARIO.md) — the one decision case the connected journey derives from · [`docs/reports/COGNIX_PRESENTATION_SYNC_DELTA.md`](docs/reports/COGNIX_PRESENTATION_SYNC_DELTA.md) — what changed against the pre-hardening demonstration values · ADR-073 (one canonical decision case) · ADR-074 (one currency layer).

**Forecast model governance:** [`docs/governance/COGNIX_FORECAST_MODEL_TRUTH_RECORD.md`](docs/governance/COGNIX_FORECAST_MODEL_TRUTH_RECORD.md) — the authoritative record of what does and does not execute, and the `D-FM-*` defect register · ADR-071 (one governed forecasting path) · ADR-072 (uncertainty published twice, never as a bare confidence percentage).

**Innovation Backlog:** [`docs/governance/COGNIX_INNOVATION_BACKLOG.md`](docs/governance/COGNIX_INNOVATION_BACKLOG.md) — `IB-13` is `Delivered` (2026-08-23); no idea sits at `In Delivery` · ADR-069.

**Release 1.0 baseline:** [`docs/governance/MASTER_PLAN.md`](docs/governance/MASTER_PLAN.md) § *Release 1.0 — Engineering Baseline* · [`docs/reports/COGNIX_FM_01_GOVERNED_FORECAST_MIGRATION_REPORT.md`](docs/reports/COGNIX_FM_01_GOVERNED_FORECAST_MIGRATION_REPORT.md).
