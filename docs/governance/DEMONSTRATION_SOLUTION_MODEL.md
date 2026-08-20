# COGNIX DEMONSTRATION SOLUTION MODEL

**Document Status:** Approved & Authoritative  
**Version:** 1.0.0  
**Effective Date:** August 2026  
**Owner:** G10X Enterprise Innovation Lab Architecture Board  

---

## 1. Executive Purpose & Taxonomy Boundary

CogniX maintains a strict distinction between two fundamental enterprise asset types:

### Asset Type A: Innovation Experiments
Pioneering G10X operational concepts and intellectual property designed to challenge traditional business models.  
*Examples:* Commitment Intelligence (`EXP-COMMITMENT-01`), Decision Ripple Intelligence (`EXP-RIPPLE-02`), Enterprise Memory (`EXP-MEMORY-03`), Opportunity Intelligence (`EXP-OPPORTUNITY-04`).

### Asset Type B: Demonstration Solutions
Working, reusable interactive business capabilities recovered from proven enterprise patterns. Demonstration Solutions allow CogniX to demonstrate real-world analytics, prediction, optimization, and AI in realistic operational contexts.  
*Examples:* Promotion Intelligence (`SOL-PROMO-01`), Demand & Forecast Intelligence (`SOL-DEMAND-02`), Predictive Inventory Intelligence (`SOL-INV-03`), Category Intelligence (`SOL-CAT-04`).

---

## 2. Canonical Demonstration Solution Schema

Every CogniX Demonstration Solution must conform to the following schema definition:

```typescript
export interface CognixSolution {
  /** Unique solution identifier (e.g. SOL-PROMO-01) */
  id: string;

  /** Human-readable solution name */
  name: string;

  /** Five-second executive proposition statement */
  fiveSecondProposition: string;

  /** Core business question addressed */
  businessQuestion: string;

  /** Business domain (e.g., Commercial, Supply Chain, Merchandising) */
  businessDomain: string;

  /** Applicable industry packs (e.g., retail_grocery, cpg_manufacturing) */
  applicableIndustries: string[];

  /** Primary inputs and operational signals consumed */
  inputs: string[];

  /** Underlying intelligence & AI techniques applied */
  intelligenceUsed: string[];

  /** Interactive capabilities provided to the demonstrator */
  interactiveCapabilities: string[];

  /** Quantifiable business outcomes demonstrated */
  businessOutcomes: string[];

  /** Related Innovation Experiments invoked as evidence or next steps */
  relatedExperiments: string[];

  /** Legal IP & data classification tag */
  dataClassification: 'Open Innovation' | 'G10X Accelerator' | 'Client Confidential';

  /** Demonstration maturity stage */
  demoMaturity: 'Production Ready' | 'Interactive Prototype' | 'Reference Pattern';
}
```

---

## 3. Five-Second Rule Acceptance Criteria

Every Demonstration Solution MUST satisfy the **Five-Second Rule**:
Within 5 seconds of opening the solution screen, an executive must clearly understand:
1. **What am I looking at?** (e.g., *"Promotion Intelligence"*).
2. **Why is something interesting?** (e.g., *"Demand +22% exceeds supply capacity +10%"*).
3. **What can I explore next?** (e.g., *"Test Commitment Chain →"*).

No solution primary screen shall present more than 40–60 words before displaying interactive controls or visual evidence.

---

## 4. Demonstration Solution Lifecycle

```text
Discovery & Pattern Extraction
             ↓
    Neutralization (Strip Client Terms)
             ↓
   Schema & Solution Registry Onboarding
             ↓
  Interactive Contextual Integration
             ↓
    Client Discovery & Pilot Accelerator
```

---

## 4.1 Relationship to the Capability Atlas

`CognixSolution` remains the **canonical contract for a Demonstration Solution** and is not superseded. The CogniX Capability Atlas (`ATL-01` … `ATL-07`) is a *knowledge extension* over this model, not a competing one (ADR-045): it binds to `SOL-*` identifiers by reference, consumes these fields without restating them, and adds only knowledge this schema deliberately does not carry — architecture, implementation references, test procedures, validation evidence, demo paths, client questions, market evidence, cross-domain reuse, provenance and review lifecycle.

`demoMaturity` remains the authority for demonstration readiness. The Atlas treats it as one of three orthogonal maturity dimensions alongside the [`EXPERIMENT_LIFECYCLE.md`](EXPERIMENT_LIFECYCLE.md) states and an implementation-status dimension (ADR-047); it never collapses them into one field.

See [`COGNIX_CAPABILITY_ATLAS.md`](COGNIX_CAPABILITY_ATLAS.md) and [`CAPABILITY_KNOWLEDGE_MODEL.md`](CAPABILITY_KNOWLEDGE_MODEL.md).

---

## 5. Canonical Solution Registry

Solutions are registered in [`config/solutions.ts`](file:///Users/renjunair/projects/Decision_Intelligence/config/solutions.ts).
