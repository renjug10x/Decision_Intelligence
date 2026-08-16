# COGNIX CORE GOVERNANCE PRINCIPLES

**Document Status:** Approved & Authoritative
**Version:** 1.1.0
**Effective Date:** August 2026
**Owner:** CogniX Governance Steering Group & Innovation Board

---

## Overview

The following Operating Principles govern all research, design, architecture, UX, data modeling, and software engineering within **CogniX (G10X Enterprise Innovation Lab)**.

---

### Principle 1 — Ideas before features
A CogniX experiment exists because it demonstrates a meaningful, high-impact business idea—not simply because a new technology, API, or algorithm has become available. Technology is an enabler; business impact is the objective.

### Principle 2 — Every experiment must be demonstrable
No experiment shall exist merely as a conceptual card, wireframe, or slide deck once it reaches **Prototype** maturity. A Prototype must possess a working, interactive, client-facing demonstration with deterministic scenario triggers and evidence panels.

### Principle 3 — Curiosity is the primary UX
CogniX UX must invite exploration rather than passive dashboard monitoring. The application must actively encourage the executive user to ask:
- *Why did this happen?*
- *What if we alter this decision?*
- *What changed in the environment?*
- *What critical signal are we missing?*
- *What is likely to happen next?*
- *What hidden opportunity exists here?*
- *What downstream functions does this decision affect?*
- *Have we encountered this pattern before?*

### Principle 4 — Intelligence supports the story
Analytics, Large Language Models (Gemini), Google AI, Looker semantic layers, machine learning models, and optimization solvers are supporting capabilities. They must serve to substantiate and clarify the business story, rather than act as the main product feature.

### Principle 5 — Complement existing enterprise systems
CogniX must demonstrate ideas that integrate seamlessly with platforms customers already own and operate. It must never assume or require the replacement of existing enterprise core systems, such as ERP (SAP/Oracle), CRM (Salesforce), BI (Looker/PowerBI), forecasting backbones, or cloud data warehouses (BigQuery/Snowflake).

### Principle 6 — Experiments are temporary by default
Every experiment in CogniX follows a strict lifecycle. An experiment may evolve into:
- Validated concept
- Pilot-ready prototype
- Reusable G10X accelerator
- Industry pattern
- Client-specific implementation
- **Retired**

Retirement after testing is a legitimate and successful outcome that frees innovation capacity.

### Principle 7 — Learn from demonstrations
Every executive and client interaction generates reusable knowledge. Client reactions, follow-up questions, operational edge cases, and industry variations must be logged to refine G10X accelerators and inform future innovation waves.

### Principle 8 — Protect intellectual property
All concepts, technical blueprints, reusable architectures, domain ontologies, implementation methods, and software accelerators developed within CogniX must have explicit provenance, version tracking, and formal IP classification.

### Principle 9 — No hard-coded customer dependency
CogniX must remain strictly client-neutral at the core engine level. Customer-specific demonstrations must be delivered entirely through runtime configurable context, industry packs, scenarios, and synthetic data adapters without altering core codebase logic.

### Principle 10 — Business value before technical novelty
Every experiment must clearly articulate its commercial, financial, or operational ROI upfront. Novel algorithms or AI architectures without demonstrable business value are prohibited from entering the active prototype portfolio.

### Principle 11 — Campaign Decision Intelligence North Star
CogniX must not become another generic promotion optimiser. It must operate as a **Campaign Decision Intelligence System** that evaluates choices across five fundamental retail decision questions:
1. **Should we intervene?** Determine whether intervention creates more value than doing nothing.
2. **What intervention should we make?** Evaluate promotions, markdowns, bundling, loyalty activation, assortment changes, inventory reallocations, cross-merchandising, supplier-funded activations, localized campaigns, channel interventions, or no intervention.
3. **Where and when should we intervene?** Discover optimal timing, campaign windows, regions, store cohorts, micro-markets, customer cohorts, and fulfilment channels.
4. **What happens elsewhere if we intervene?** Model 1st, 2nd, and 3rd-order consequences across demand, revenue, contribution, margin, inventory, availability, waste, cannibalisation, substitution, halo, basket effects, demand pull-forward, supply pressure, labor, neighbouring stores, and channels.
5. **What did reality teach us?** Close the operational loop by comparing prediction against actual execution, storing evidence with explicit provenance in Enterprise Memory and Learning.

The domain connection chain must remain coherent across all experiences:
$$\text{Opportunity Intel} \longrightarrow \text{Campaign Decision Intel} \longrightarrow \text{Decision Contract} \longrightarrow \text{Intent Fusion} \longrightarrow \text{Demand/Forecast} \longrightarrow \text{Signals} \longrightarrow \text{Decision State} \longrightarrow \text{Ripple} \longrightarrow \text{Memory} \longrightarrow \text{Learning}$$

### Principle 12 — Anti-Drift Guardrails
All implementation packages MUST strictly enforce anti-drift guardrails to prevent product dilution:
- **No Promotion Calculator Reduction:** Never reduce Campaign Intelligence to a simple discount percentage calculator.
- **Counterfactual Imperative & Campaign Delta Elevation:** Always compare predicted interventions against an explicit Counterfactual Baseline (Do Nothing). "Do Nothing vs Proposed Intervention" (Campaign Delta) is a mandatory primary decision surface exposing net monetary value (£ contribution delta, volume delta, waste delta), not merely percentage uplift.
- **Date Discovery:** Timing must be an active decision variable ("Find the best window"), not merely a static date picker.
- **Explainable Targeting:** Micro-market store recommendations must be explainable by catchment, inventory, and missions—never un-explained AI rankings.
- **Multi-Objective Frontier:** Strategies must present Pareto trade-offs across revenue, contribution, waste, and availability—never opaque single-number optimizations. Fixed weights are not required upfront; trade-offs remain visible as distinct strategy plays.
- **Deterministic Strategy Generation:** Core competing strategy plays and scenario comparisons MUST have deterministic structured domain representations. Generative AI (Gemini) may explain, summarize, or propose variants, but strategy generation MUST NOT depend exclusively on an external LLM being available.
- **Provider-Neutral Signal Connectors:** External signal connectors (ESF-3) are defined as provider-neutral contract adapters across planning, commerce, weather, events, competitive intel, operational telemetry, and demographic sources. Vendor platforms (e.g. Blue Yonder, SAP IBP) represent reference implementations, not hardcoded architectural dependencies.
- **Resilience over Parallel Risk Engines:** Pre-mortem analysis MUST integrate with Decision Ripple, Enterprise Signals, and Decision Readiness rather than creating a disconnected risk engine.
- **Intelligence Before Visualization:** No visual UI surface may precede the conceptual domain contract and calculation engine required to back it.
- **No Literal Standing In For A Calculation:** A displayed intelligence value must be produced by the engine that owns it. A hardcoded figure that does not respond to the control beside it is a defect, not a placeholder — it is indistinguishable from a working calculation to the executive reading it.

### Principle 13 — Demand Evidence & Demand Truth
CogniX must not evolve Demand & Forecast into a denser forecasting dashboard. The governing statement is:

> **CogniX does not manufacture unobserved demand. It reconstructs demand from evidence, quantifies uncertainty, and preserves provenance from signal through inference to decision.**

The following apply to every demand capability, immediate (`DDF-01`) or roadmap (`DOT-1` … `DOT-12`):

1. **Evidence before inference.** Inferred demand is never represented as observed fact. Provenance class travels on the datum, not on the page.
2. **Provenance.** Material conclusions are traceable to their contributing evidence by reference.
3. **Explicit uncertainty.** Estimated demand and decision outcomes expose uncertainty. Missing uncertainty evidence is shown as missing, never as certainty.
4. **No fake intelligence.** No invented ML prediction, causal relationship, real-time integration or operational evidence. A deterministic calculation is described as one.
5. **Progressive sophistication.** Deterministic and explicitly modelled calculations may evolve into learned models **without breaking contracts**. The contract is shaped for the learned version; the implementation is honest about being the deterministic one.
6. **Signal ≠ demand.** A signal is evidence *about* demand, not a demand unit. Any conversion to units is declared and inspectable.
7. **Sales ≠ true demand.** Observed sales are censored by availability and operational constraint.
8. **Forecast accuracy ≠ decision quality.** Optimise for economic and operational decision outcomes. A forecast-error metric never stands in for a decision verdict — restating the `CDI-07B` rule that prediction error describes model divergence, never whether a decision was good.
9. **Constraints can influence future demand.** Supply and availability failure alters customer behaviour and therefore future demand; a forecast that learns operational failure as demand decline is wrong.
10. **Human-understandable reasoning.** Executives and planners must be able to reach *why* without ML knowledge.

**Four demand quantities are never collapsed:** forecast demand ≠ true/latent demand ≠ executable demand ≠ economically desirable demand. Canonical vocabulary, maturity model and roadmap: [`DEMAND_OBSERVABILITY_MODEL.md`](DEMAND_OBSERVABILITY_MODEL.md).
