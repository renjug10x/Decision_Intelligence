# COGNIX EXPERIMENT DATA MODEL

**Document Status:** Approved & Authoritative  
**Version:** 1.0.0  
**Effective Date:** August 2026  
**Owner:** CogniX Architecture Team  

---

## 1. Overview

Every experiment in **CogniX** is defined by a canonical schema. This ensures consistency across the Innovation Portfolio, Innovation Canvas, interactive demonstration runtime, and IP registry.

---

## 2. Canonical Experiment Schema

```typescript
export interface CognixExperiment {
  // Primary Identification & Provenance
  id: string;                      // Unique ID (e.g. 'EXP-COMMITMENT-01')
  name: string;                    // Short title (e.g. 'Commitment Intelligence')
  originDate: string;              // ISO Date (e.g. '2026-08-01')
  originator: string;              // Team/Author (e.g. 'G10X Retail Innovation Lab')
  version: string;                 // Semantic versioning (e.g. '1.2.0')
  
  // Provocative Positioning & Narrative
  provocativeQuestion: string;     // High-impact executive question
  problemStatement: string;        // Traditional enterprise friction/limitation
  industryToday: string;           // How current systems handle this today
  cognixInnovation: string;        // The novel approach/hypothesis introduced by CogniX
  
  // Interactive Demonstration Metadata
  demonstrationRoute: string;      // Application view route (e.g. 'commitment-intelligence')
  demoScenarioCount: number;       // Number of pre-packaged interactive scenarios
  defaultScenarioId: string;       // Default active scenario
  
  // Impact & Value Definition
  businessValue: {
    financialUpside: string;      // Quantified financial opportunity/protection
    operationalMetric: string;    // Operational KPI impacted (e.g. 'OOS reduction by 35%')
    strategicAdvantage: string;   // Competitive differentiator
  };
  
  // Evidence & Intelligence Attribution
  confidenceScore: number;         // 0 - 100% confidence rating based on data completeness
  intelligenceUsed: string[];      // Supported tech (e.g. ['Gemini 2.0 Flash', 'Looker Semantic Layer', 'Linear Solver'])
  evidenceSources: string[];       // Data points / telemetry relied upon
  
  // Categorization & Applicability
  applicableIndustries: string[];  // Industry vertical tags (e.g. ['Retail', 'CPG', 'Logistics'])
  businessDomains: string[];       // Functional domain tags (e.g. ['Supply Chain', 'Marketing'])
  
  // Governance, Maturity & IP
  maturity: ExperimentMaturity;    // 'Concept' | 'Research' | 'Prototype' | 'Pilot Ready' | 'Accelerator' | 'Industry Pattern' | 'Retired'
  ipClassification: IpClass;      // 'Open Innovation' | 'G10X Proprietary' | 'Client Confidential' | 'Joint Innovation' | 'Client Exclusive'
  commercialStatus: string;        // e.g. 'Active Lab Demonstration' | 'In Client Validation'
  
  // Organizational Memory & Learnings
  learnings: {
    date: string;
    clientFeedbackSummary: string;
    keyInsights: string[];
  }[];
}
```

---

## 3. JSON Configuration Structure

Experiments are declared in JSON metadata files (`config/experiments.json` or `data/experiments/*.json`) so that new experiments can be onboarded into the CogniX shell without refactoring core UI navigation.
