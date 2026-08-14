# ORGANISATIONAL LEARNING INTELLIGENCE & ENTERPRISE LEARNING PATTERNS

**Document Status:** Approved & Authoritative
**Version:** 1.1.0
**Effective Date:** August 2026
**Owner:** G10X Enterprise Innovation Lab Architecture Group

---

## 1. Executive Proposition

> **"What if your organisation could systematically learn from every decision it makes?"**

Most enterprise software collects transactional data and generates forecasts, but fails to capture empirical organizational experience. CogniX introduces **Organisational Learning Intelligence**, a pervasive intelligence layer that converts historical decisions, interventions, and outcomes into reusable **Enterprise Learning Patterns**.

---

## 2. Operational Learning Model: Observe → Learn → Match → Reuse

```text
       [ Situation & Signals ]
                 ↓
             OBSERVE
     Capture signals, decisions & outcomes
                 ↓
              LEARN
     Identify recurring structural patterns
                 ↓
              MATCH
     Evaluate current situation against precedents
                 ↓
              REUSE
     Surface successful interventions & constraints
```

---

## 3. Telemetry Distinction: Similarity vs Confidence vs Success Rate

CogniX strictly distinguishes between three independent operational metrics to prevent generic AI ambiguity:

### 3.1 Situation Similarity (0–100%)
Measures how closely the current operational state matches the situation signature of historical precedents.

### 3.2 Pattern Confidence (0–100%)
Measures the statistical and semantic strength of the learned relationship across all supporting memory events.

### 3.3 Intervention Success Rate (0–100% across N Occurrences)
Measures how frequently the recommended intervention produced a positive business outcome in past occurrences.

---

## 4. Pattern Taxonomy

CogniX organizes learning into six conceptual categories:
1. **Risk Pattern (`risk`):** Recurring operational conditions that historically lead to margin erosion, stockouts, or SLA breaches.
2. **Opportunity Pattern (`opportunity`):** Recurring conditions where demand acceleration, inventory surplus, and supplier headroom converge to create value.
3. **Intervention Pattern (`intervention`):** Proven operational actions (e.g. backup SLA activation, DC rebalancing) with verified success rates.
4. **Behaviour Pattern (`behaviour`):** Customer or market behavioral responses, such as promotional cannibalization between premium and standard lines.
5. **Commitment Pattern (`commitment`):** Structural gaps where demand commitments exceed primary supplier capacity.
6. **Ripple Pattern (`ripple`):** Recurring 2nd-order warehouse overtime and 3rd-order store delivery delay propagation.

---

## 5. Relationship with Enterprise Memory & Opportunity Intelligence

- **Enterprise Memory:** Answers *"Have we seen this before?"* by retrieving specific historical case precedents.
- **Enterprise Learning Patterns:** Answers *"What consistently happened, and what consistently worked?"* by generalizing across multiple memory cases.
- **Opportunity Intelligence:** Fuses positive opportunity patterns with live telemetry to provide evidence-led action recommendations.

---

## 6. Reintegrated Capabilities

- **Execution Briefing:** Contextually translates intelligence into actionable execution plans (`Situation`, `Why Now`, `Recommended Action`, `Owner`, `Dependencies`, `Time Horizon`, `Expected Outcome`).
- **Contract Verification:** Serves as an embedded proof layer confirming whether recommended actions comply with active contract clauses (e.g., `CTR-FD-2024-001` SLA breach checks & `CTR-TP-2023-008` Backup Supplier activation).

---

## 7. Future ML Adaptive Learning & Pattern Decay (Planned Programme 10)

```text
  Enterprise World Engine (T-90 to T+30)
                    ↓
  Journey Telemetry Stream (journey.event.emitted)
                    ↓
  Shared Decision State (cross-solution)
                    ↓
  Memory Service (precedent retrieval) ──> Learning Pattern Engine (ML similarity matching)
                                                    ↓
                                         Model Service (outcome prediction & ranking)
                                                    ↓
                                         Intelligence Moments (contextual triggers)
                                                    ↓
                                         Counterfactual Learning & Pattern Decay
```

### 7.1 Current Implementation Truth
- **Completed Baseline (WP10-D Implemented):** Standalone `cognix-learning` microservice (port 8082) with transport contracts (`packages/contracts/src/memory-model.ts`, `packages/contracts/src/learning-pattern-model.ts`), OpenAPI 3.1 contract (`docs/openapi/memory-learning-v1.yaml`), replaceable repository abstractions (`IMemoryRepository`, `ILearningPatternRepository`), same-origin BFF proxy gateway (`/api/v1/memory/*`, `/api/v1/learning-patterns/*`), and static import elimination.
- **Future ML Boundary (Programme 10 Phase 10F):** Machine Learning-backed adaptive similarity scoring, neural pattern matching, and automated counterfactual pattern decay operating over real-time journey telemetry streams.

### 7.3 Enterprise Signals in Organisational Learning
Future ML phases (ESF-5 & Phase 10F) will consume the Enterprise Signal Fabric to match recurring precursor signal sequences against historical outcomes:
```text
Observed Signal Sequence (Search +5%, Basket +8%, Lead-Time +2d)
                     +
Shared Decision Context (Commercial Intent + 1,800 unit Deficit)
                     +
Selected Intervention (SLA Flex Rule 4)
                     +
Actual Outcome (Delivery SLA Maintained, Zero Stockout)
                     ↓
Enterprise Memory & Learning Pattern (Refines Precursor Pattern Confidence)
```
This enables CogniX to recognise structural precursor patterns weeks before customer demand or operational breaches materialise.

---

## 8. Closed Learning Loop for Campaign Decision Intelligence

### 8.1 The Closed Loop Architecture
Campaign Decision Intelligence establishes an explicit 8-step closed learning loop:

$$\text{Prediction} \longrightarrow \text{Decision} \longrightarrow \text{Execution} \longrightarrow \text{Observation} \longrightarrow \text{Outcome Comparison} \longrightarrow \text{Learning} \longrightarrow \text{Enterprise Memory} \longrightarrow \text{Future Decision}$$

1. **Prediction:** Contextualised Decision Outlook predicts demand, revenue, halo, cannibalisation, and risk.
2. **Decision:** Executive selects strategy play and registers `DecisionContract`.
3. **Execution:** Decision dispatched via Execution Briefing.
4. **Observation:** Real-world Enterprise Signals (`ESF-1`/`ESF-2`/`ESF-3`) observe actual run-rates.
5. **Outcome Comparison:** Evaluates predicted vs observed uplift, halo, cannibalisation, and weather impact.
6. **Learning:** Extracts prediction error deltas ($\Delta \text{Uplift}$, $\Delta \text{Margin}$).
7. **Enterprise Memory:** Stores an `EnterpriseMemoryCase` with explicit provenance (`synthetic_demo` or production connector).
8. **Future Decision:** Surfaces historical analogues during subsequent decision canvas evaluations.
