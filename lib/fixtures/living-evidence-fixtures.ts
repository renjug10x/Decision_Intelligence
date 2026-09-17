/**
 * CogniX Living Evidence — CONTRACT-VALID FIXTURES (SCI-06)
 * ───────────────────────────────────────────────────────────────────────────────
 * Isolated development fixtures conforming 100% to frozen Gate-A contracts:
 * `packages/contracts/src/living-evidence-contracts.ts` and `provenance-vocabulary.ts`.
 *
 * Provides contract-shaped Living Evidence, Refresh Operation deltas, and
 * Methods Register fixtures for all three certified scenarios:
 *   1. SCN-FRESH-DAIRY-CHEDDAR-001 (Fresh Dairy)
 *   2. SCN-CHILLED-SALMON-002      (Chilled Salmon)
 *   3. SCN-BAKERY-SOURDOUGH-003    (Premium Bakery)
 *
 * Guarded against concurrency violations: does NOT calculate or derive domain quantities.
 * Integrated with real SCI-05 engines at Gate C.
 */

import {
  SignalMateriality,
  DecisionRelevance,
  RefreshDelta,
  MethodsRegister,
  ScenarioAsAtMarker
} from '@/packages/contracts/src/living-evidence-contracts';
import { ProvenanceDescriptor } from '@/packages/contracts/src/provenance-vocabulary';

export interface LivingEvidenceScenarioData {
  scenario_id: string;
  scenario_name: string;
  scenario_clock: string;
  signals: Array<{
    signal_id: string;
    category: string;
    signal_type: string;
    entity_type: string;
    entity_id: string;
    source_type: string;
    source_system: string;
    baseline_value: number;
    observed_value: number;
    delta: number;
    delta_pct: number;
    unit: string;
    confidence: number;
    quality: number;
    observed_period: string;
    effective_period: string;
    provenance: ProvenanceDescriptor;
    materiality: SignalMateriality;
    decision_relevance: DecisionRelevance;
  }>;
  methods_register: MethodsRegister;
  refresh_changed: RefreshDelta;
  refresh_unchanged: RefreshDelta;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. FRESH DAIRY FIXTURE (SCN-FRESH-DAIRY-CHEDDAR-001)
// ═══════════════════════════════════════════════════════════════════════════════

const FRESH_DAIRY_MARKER_FROM: ScenarioAsAtMarker = {
  scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
  period: 'Today',
  period_instant_iso: '2026-09-08T00:00:00.000Z',
  opening_period: 'T-90'
};

const FRESH_DAIRY_MARKER_TO: ScenarioAsAtMarker = {
  scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
  period: 'T+1',
  period_instant_iso: '2026-09-09T00:00:00.000Z',
  opening_period: 'T-90'
};

export const FRESH_DAIRY_LIVING_EVIDENCE: LivingEvidenceScenarioData = {
  scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
  scenario_name: 'Fresh Dairy — Cathedral City Mature Cheddar 400g',
  scenario_clock: '2026-09-08T00:00:00.000Z',
  signals: [
    {
      signal_id: 'sig_ps_001',
      category: 'DEMAND',
      signal_type: 'PROMOTION_DEMAND_SURGE',
      entity_type: 'SKU',
      entity_id: 'P001 Cathedral City Mature Cheddar 400g',
      source_type: 'INTERNAL_SYSTEM',
      source_system: 'Retail EPOS Aggregator',
      baseline_value: 523734,
      observed_value: 699996,
      delta: 176262,
      delta_pct: 33.7,
      unit: 'units_per_week',
      confidence: 96,
      quality: 98,
      observed_period: 'Today',
      effective_period: 'T+7',
      provenance: { origin: 'observed', method: 'measured', authority: 'authoritative' },
      materiality: {
        signal_id: 'sig_ps_001',
        scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
        assessed_at_period: 'Today',
        band: 'MATERIAL',
        rationale: 'Observed demand lift moved expected sales +33.7% against baseline, creating supply tension.',
        movements: [
          {
            quantity: 'EXPECTED_DEMAND_UNITS',
            display_label: 'Expected Demand',
            before: 523734,
            after: 699996,
            delta: 176262,
            delta_pct: 33.7,
            unit: 'units'
          },
          {
            quantity: 'REVENUE_EXPOSURE_GBP',
            display_label: 'Revenue Exposure',
            before: 1084129,
            after: 1448992,
            delta: 364863,
            delta_pct: 33.7,
            unit: 'GBP'
          }
        ],
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      },
      decision_relevance: {
        signal_id: 'sig_ps_001',
        scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
        assessed_at_period: 'Today',
        changed: 'RECOMMENDATION',
        before_statement: '20% promotion depth tier',
        after_statement: '14% promotion depth tier',
        statement: 'Recommended promotion depth shifted from 20% to 14% to prevent unservable demand.',
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      }
    },
    {
      signal_id: 'sig_ps_002',
      category: 'COMMERCIAL',
      signal_type: 'COMPETITOR_PROMOTION_INTENSITY',
      entity_type: 'CATEGORY',
      entity_id: 'Cheddar Pre-Pack',
      source_type: 'EXTERNAL_CONNECTOR',
      source_system: 'Category Market Feed (ESF-3)',
      baseline_value: 100,
      observed_value: 118,
      delta: 18,
      delta_pct: 18.0,
      unit: 'index',
      confidence: 91,
      quality: 94,
      observed_period: 'T-2',
      effective_period: 'T+3',
      provenance: { origin: 'observed', method: 'measured', authority: 'authoritative' },
      materiality: {
        signal_id: 'sig_ps_002',
        scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
        assessed_at_period: 'Today',
        band: 'NOTABLE',
        rationale: 'Competitor promo expansion shifts category shopping index, supporting price investment.',
        movements: [
          {
            quantity: 'CAMPAIGN_CONTRIBUTION_GBP',
            display_label: 'Contribution Margin',
            before: 28400,
            after: 32976,
            delta: 4576,
            delta_pct: 16.1,
            unit: 'GBP'
          }
        ],
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      },
      decision_relevance: {
        signal_id: 'sig_ps_002',
        scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
        assessed_at_period: 'Today',
        changed: 'NONE',
        before_statement: null,
        after_statement: null,
        statement: 'The recommendation is unchanged.',
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      }
    },
    {
      signal_id: 'sig_ps_003',
      category: 'SUPPLY',
      signal_type: 'SUPPLIER_CAPACITY_LIMITATION',
      entity_type: 'SUPPLIER',
      entity_id: 'Cheshire Cheese Co (SUP001)',
      source_type: 'SYNTHETIC_WORLD',
      source_system: 'Enterprise World (ESF-1)',
      baseline_value: 535000,
      observed_value: 699996,
      delta: 164996,
      delta_pct: 30.8,
      unit: 'units_per_week',
      confidence: 95,
      quality: 96,
      observed_period: 'T-1',
      effective_period: 'T+3',
      provenance: { origin: 'modelled', method: 'rule', authority: 'authoritative' },
      materiality: {
        signal_id: 'sig_ps_003',
        scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
        assessed_at_period: 'Today',
        band: 'DECISIVE',
        rationale: 'Supplier cap at 535,000 units strictly constrains volume, leaving 164,996 units exposed at 20% depth.',
        movements: [
          {
            quantity: 'EXPOSED_DEMAND_UNITS',
            display_label: 'Exposed Demand',
            before: 0,
            after: 164996,
            delta: 164996,
            delta_pct: null,
            unit: 'units'
          },
          {
            quantity: 'DECISION_WINDOW_HOURS',
            display_label: 'Decision Window',
            before: 504,
            after: 336,
            delta: -168,
            delta_pct: -33.3,
            unit: 'hours'
          }
        ],
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      },
      decision_relevance: {
        signal_id: 'sig_ps_003',
        scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
        assessed_at_period: 'Today',
        changed: 'DECISION_WINDOW',
        before_statement: '21-day planning horizon',
        after_statement: '14-day planning horizon',
        statement: 'The Decision Window shortened from 21 days to 14 days due to supplier production cycle limits.',
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      }
    },
    {
      signal_id: 'sig_ps_004',
      category: 'INVENTORY',
      signal_type: 'DC_STOCK_COVER_DRIFT',
      entity_type: 'DC',
      entity_id: 'North West RDC',
      source_type: 'DERIVED_ANALYTIC',
      source_system: 'Inventory Run-Rate Engine',
      baseline_value: 4.8,
      observed_value: 4.2,
      delta: -0.6,
      delta_pct: -12.5,
      unit: 'days_of_cover',
      confidence: 93,
      quality: 94,
      observed_period: 'T-1',
      effective_period: 'T+3',
      provenance: { origin: 'derived', method: 'statistical', authority: 'authoritative' },
      materiality: {
        signal_id: 'sig_ps_004',
        scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
        assessed_at_period: 'Today',
        band: 'IMMATERIAL',
        rationale: 'Stock cover movement of 0.6 days remains inside governed safety stock tolerance.',
        movements: [
          {
            quantity: 'FORECAST_STABILITY',
            display_label: 'Forecast Stability',
            before: 0.94,
            after: 0.92,
            delta: -0.02,
            delta_pct: -2.1,
            unit: 'index'
          }
        ],
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      },
      decision_relevance: {
        signal_id: 'sig_ps_004',
        scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
        assessed_at_period: 'Today',
        changed: 'NONE',
        before_statement: null,
        after_statement: null,
        statement: 'The recommendation is unchanged.',
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      }
    }
  ],
  methods_register: {
    scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
    entries: [
      {
        method_id: 'HOLT_WINTERS_ADDITIVE',
        display_name: 'Holt-Winters Additive Trend & Seasonality',
        mechanism: 'statistical',
        purpose: 'Fits level, trend, and seasonal components to historical demand series with additive seasonal structure.',
        inputs: ['Historical weekly sales units (T-104 to Today)', 'Seasonal period length (52 weeks)'],
        output: 'Base demand forecast and 80%/95% prediction intervals across 14-week horizon',
        implementation_ref: 'lib/forecast/adapters/holt-winters.ts',
        last_run_scenario_iso: '2026-09-08T00:00:00.000Z',
        applies_to_scenario_ids: ['SCN-FRESH-DAIRY-CHEDDAR-001', 'SCN-CHILLED-SALMON-002', 'SCN-BAKERY-SOURDOUGH-003'],
        measured_error: { metric: 'MAPE', value: 4.8, unit: '%' },
        limitations: ['Requires at least 2 full seasonal cycles', 'Assumes additive rather than multiplicative variance']
      },
      {
        method_id: 'SEASONAL_NAIVE',
        display_name: 'Seasonal Naive Empirical Baseline',
        mechanism: 'statistical',
        purpose: 'Projects demand repeating the identical week from prior annual seasonal cycle as a neutral benchmark.',
        inputs: ['Prior-year historical weekly sales units'],
        output: 'Benchmark baseline demand projection',
        implementation_ref: 'lib/forecast/adapters/seasonal-naive.ts',
        last_run_scenario_iso: '2026-09-08T00:00:00.000Z',
        applies_to_scenario_ids: ['SCN-FRESH-DAIRY-CHEDDAR-001', 'SCN-CHILLED-SALMON-002', 'SCN-BAKERY-SOURDOUGH-003'],
        measured_error: { metric: 'MAPE', value: 8.2, unit: '%' },
        limitations: ['Does not capture intra-year trend or promotion effects', 'Benchmark role only']
      },
      {
        method_id: 'PROMOTION_DEPTH_ELASTICITY',
        display_name: 'Promotion Elasticity & Contribution Engine',
        mechanism: 'rule',
        purpose: 'Deterministically evaluates demand lift, net revenue, supplier promo funding, and contribution profit by depth tier.',
        inputs: ['Scenario declared depth-response curve', 'Unit cost and list price (£2.07 / £2.50)', 'Supplier funding pass-through (50%)'],
        output: 'Optimal promotion depth tier, demand units, and expected contribution GBP',
        implementation_ref: 'packages/contracts/src/canonical-scenario-model.ts',
        last_run_scenario_iso: '2026-09-08T00:00:00.000Z',
        applies_to_scenario_ids: ['SCN-FRESH-DAIRY-CHEDDAR-001', 'SCN-CHILLED-SALMON-002', 'SCN-BAKERY-SOURDOUGH-003'],
        measured_error: null,
        limitations: ['Evaluates declared scenario curve', 'Assumes uniform elasticity across regional store network']
      },
      {
        method_id: 'SUPPLIER_CAPACITY_CALCULATOR',
        display_name: 'Supplier Allocation & Servable Capacity Engine',
        mechanism: 'rule',
        purpose: 'Computes servable demand ceiling against weekly supplier production capacity and flex rate clause.',
        inputs: ['Supplier weekly base capacity (486,000 units)', 'Flex clause rate (10%)', 'Lead time (14 days)'],
        output: 'Servable demand, exposed unservable units, and decision window',
        implementation_ref: 'lib/campaign-causal-engine.ts',
        last_run_scenario_iso: '2026-09-08T00:00:00.000Z',
        applies_to_scenario_ids: ['SCN-FRESH-DAIRY-CHEDDAR-001', 'SCN-CHILLED-SALMON-002', 'SCN-BAKERY-SOURDOUGH-003'],
        measured_error: null,
        limitations: ['Evaluates primary supplier contract only', 'Does not evaluate spot-market transfer agreements']
      },
      {
        method_id: 'GENAI_NARRATIVE_DRAFTING',
        display_name: 'Governed Narrative Drafter (Google GenAI)',
        mechanism: 'llm',
        purpose: 'Drafts structured executive summaries and business reasoning under ADR-044/ADR-083 response-validation.',
        inputs: ['Scenario metadata', 'Category and SKU attributes', 'Calculated numerical bounds'],
        output: 'Non-authoritative narrative draft for human review',
        implementation_ref: 'lib/gemini.ts',
        last_run_scenario_iso: '2026-09-08T00:00:00.000Z',
        applies_to_scenario_ids: ['SCN-FRESH-DAIRY-CHEDDAR-001', 'SCN-CHILLED-SALMON-002', 'SCN-BAKERY-SOURDOUGH-003'],
        measured_error: null,
        limitations: ['Drafts are never authoritative until confirmed by human operator', 'Strictly forbidden from inventing economic or quantitative numbers']
      },
      {
        method_id: 'COMMERCIAL_DIRECTOR_SIGN_OFF',
        display_name: 'Category Director Override & Gate Sign-off',
        mechanism: 'manual',
        purpose: 'Applies merchant domain judgement, supplier relationship context, and final execution authorization.',
        inputs: ['CogniX recommended tier and trade-off frontier', 'Merchant category objectives'],
        output: 'Committed commercial decision',
        implementation_ref: 'lib/decision-state-store.ts',
        last_run_scenario_iso: '2026-09-08T00:00:00.000Z',
        applies_to_scenario_ids: ['SCN-FRESH-DAIRY-CHEDDAR-001', 'SCN-CHILLED-SALMON-002', 'SCN-BAKERY-SOURDOUGH-003'],
        measured_error: null,
        limitations: ['Subject to human operator availability and review latency']
      }
    ],
    undescribed: [
      { method_id: 'EXTERNAL_CREDIT_SCORING', reason: 'Unused in current retail supply-chain scenarios' }
    ],
    provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
  },
  refresh_changed: {
    scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
    from: FRESH_DAIRY_MARKER_FROM,
    to: FRESH_DAIRY_MARKER_TO,
    observations: [
      {
        signal_id: 'sig_ps_001',
        change: 'UNCHANGED',
        age_scenario_days: 1,
        materiality: null,
        decision_relevance: null
      },
      {
        signal_id: 'sig_ps_002',
        change: 'AGED',
        age_scenario_days: 3,
        materiality: null,
        decision_relevance: null
      },
      {
        signal_id: 'sig_ps_003',
        change: 'MOVED',
        age_scenario_days: 0,
        materiality: {
          signal_id: 'sig_ps_003',
          scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
          assessed_at_period: 'T+1',
          band: 'DECISIVE',
          rationale: 'Supplier allocation ceiling tightened under incoming order volume.',
          movements: [
            {
              quantity: 'DECISION_WINDOW_HOURS',
              display_label: 'Decision Window',
              before: 504,
              after: 336,
              delta: -168,
              delta_pct: -33.3,
              unit: 'hours'
            }
          ],
          provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
        },
        decision_relevance: {
          signal_id: 'sig_ps_003',
          scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
          assessed_at_period: 'T+1',
          changed: 'DECISION_WINDOW',
          before_statement: '21-day planning horizon',
          after_statement: '14-day planning horizon',
          statement: 'The Decision Window shortened from 21 days to 14 days.',
          provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
        }
      },
      {
        signal_id: 'sig_ps_004',
        change: 'MOVED',
        age_scenario_days: 0,
        materiality: null,
        decision_relevance: null
      }
    ],
    material_movements: [
      {
        quantity: 'DECISION_WINDOW_HOURS',
        display_label: 'Decision Window',
        before: 504,
        after: 336,
        delta: -168,
        delta_pct: -33.3,
        unit: 'hours'
      },
      {
        quantity: 'EXPOSED_DEMAND_UNITS',
        display_label: 'Exposed Demand',
        before: 0,
        after: 164996,
        delta: 164996,
        delta_pct: null,
        unit: 'units'
      }
    ],
    decision_changes: [
      {
        signal_id: 'sig_ps_003',
        scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
        assessed_at_period: 'T+1',
        changed: 'DECISION_WINDOW',
        before_statement: '21-day planning horizon',
        after_statement: '14-day planning horizon',
        statement: 'The Decision Window shortened from 21 days to 14 days.',
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      }
    ],
    decision_consequence_statement: '2 signals changed. Supplier pressure became material. The Decision Window shortened.',
    provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
  },
  refresh_unchanged: {
    scenario_id: 'SCN-FRESH-DAIRY-CHEDDAR-001',
    from: FRESH_DAIRY_MARKER_FROM,
    to: FRESH_DAIRY_MARKER_FROM,
    observations: [
      { signal_id: 'sig_ps_001', change: 'UNCHANGED', age_scenario_days: 0, materiality: null, decision_relevance: null },
      { signal_id: 'sig_ps_002', change: 'UNCHANGED', age_scenario_days: 2, materiality: null, decision_relevance: null },
      { signal_id: 'sig_ps_003', change: 'UNCHANGED', age_scenario_days: 1, materiality: null, decision_relevance: null },
      { signal_id: 'sig_ps_004', change: 'UNCHANGED', age_scenario_days: 1, materiality: null, decision_relevance: null }
    ],
    material_movements: [],
    decision_changes: [],
    decision_consequence_statement: 'No material change. The recommendation remains unchanged.',
    provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CHILLED SALMON FIXTURE (SCN-CHILLED-SALMON-002)
// ═══════════════════════════════════════════════════════════════════════════════

const SALMON_MARKER_FROM: ScenarioAsAtMarker = {
  scenario_id: 'SCN-CHILLED-SALMON-002',
  period: 'Today',
  period_instant_iso: '2026-09-08T00:00:00.000Z',
  opening_period: 'T-90'
};

const SALMON_MARKER_TO: ScenarioAsAtMarker = {
  scenario_id: 'SCN-CHILLED-SALMON-002',
  period: 'T+1',
  period_instant_iso: '2026-09-09T00:00:00.000Z',
  opening_period: 'T-90'
};

export const CHILLED_SALMON_LIVING_EVIDENCE: LivingEvidenceScenarioData = {
  scenario_id: 'SCN-CHILLED-SALMON-002',
  scenario_name: 'Chilled Salmon — Atlantic Salmon Fillet 300g',
  scenario_clock: '2026-09-08T00:00:00.000Z',
  signals: [
    {
      signal_id: 'sig_sb_001',
      category: 'COMMERCIAL',
      signal_type: 'COMPETITOR_PRICE_DROP',
      entity_type: 'CATEGORY',
      entity_id: 'Chilled Seafood',
      source_type: 'INTERNAL_SYSTEM',
      source_system: 'EPOS Market Tracker',
      baseline_value: 100,
      observed_value: 126.4,
      delta: 26.4,
      delta_pct: 26.4,
      unit: 'percent_baseline',
      confidence: 92,
      quality: 94,
      observed_period: 'Today',
      effective_period: 'T+7',
      provenance: { origin: 'observed', method: 'measured', authority: 'authoritative' },
      materiality: {
        signal_id: 'sig_sb_001',
        scenario_id: 'SCN-CHILLED-SALMON-002',
        assessed_at_period: 'Today',
        band: 'MATERIAL',
        rationale: 'Competitor price shift drove 26.4% category demand movement across primary stores.',
        movements: [
          {
            quantity: 'EXPECTED_DEMAND_UNITS',
            display_label: 'Expected Demand',
            before: 95400,
            after: 120585,
            delta: 25185,
            delta_pct: 26.4,
            unit: 'units'
          }
        ],
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      },
      decision_relevance: {
        signal_id: 'sig_sb_001',
        scenario_id: 'SCN-CHILLED-SALMON-002',
        assessed_at_period: 'Today',
        changed: 'NONE',
        before_statement: null,
        after_statement: null,
        statement: 'The recommendation is unchanged.',
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      }
    },
    {
      signal_id: 'sig_sb_002',
      category: 'SUPPLY',
      signal_type: 'SUPPLIER_BREACH_WARNING',
      entity_type: 'SUPPLIER',
      entity_id: 'Foodvest Fish (SUP006)',
      source_type: 'SYNTHETIC_WORLD',
      source_system: 'Enterprise World (ESF-1)',
      baseline_value: 41000,
      observed_value: 45200,
      delta: 4200,
      delta_pct: 10.2,
      unit: 'units_per_week',
      confidence: 95,
      quality: 96,
      observed_period: 'T-1',
      effective_period: 'T+3',
      provenance: { origin: 'modelled', method: 'rule', authority: 'authoritative' },
      materiality: {
        signal_id: 'sig_sb_002',
        scenario_id: 'SCN-CHILLED-SALMON-002',
        assessed_at_period: 'Today',
        band: 'DECISIVE',
        rationale: 'Supplier cap at 41,000 units leaves 4,200 units unservable at 20% promotion depth.',
        movements: [
          {
            quantity: 'SERVABLE_DEMAND_UNITS',
            display_label: 'Servable Demand',
            before: 45200,
            after: 41000,
            delta: -4200,
            delta_pct: -9.3,
            unit: 'units'
          }
        ],
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      },
      decision_relevance: {
        signal_id: 'sig_sb_002',
        scenario_id: 'SCN-CHILLED-SALMON-002',
        assessed_at_period: 'Today',
        changed: 'RECOMMENDATION',
        before_statement: '20% promotion depth tier',
        after_statement: '10% promotion depth tier',
        statement: '60% supplier funding locks the committed 10% tier; 20% depth rejected due to supplier cap breach.',
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      }
    },
    {
      signal_id: 'sig_sb_003',
      category: 'INVENTORY',
      signal_type: 'STOCK_COVER_DECLINE',
      entity_type: 'DC',
      entity_id: 'Scotland RDC',
      source_type: 'DERIVED_ANALYTIC',
      source_system: 'Supply Chain Balance',
      baseline_value: 3.5,
      observed_value: 2.8,
      delta: -0.7,
      delta_pct: -20.0,
      unit: 'days_of_cover',
      confidence: 93,
      quality: 94,
      observed_period: 'T-1',
      effective_period: 'T+3',
      provenance: { origin: 'derived', method: 'statistical', authority: 'authoritative' },
      materiality: {
        signal_id: 'sig_sb_003',
        scenario_id: 'SCN-CHILLED-SALMON-002',
        assessed_at_period: 'Today',
        band: 'NOTABLE',
        rationale: 'RDC stock cover decline tightens depot replenishment buffer.',
        movements: [
          {
            quantity: 'DECISION_WINDOW_HOURS',
            display_label: 'Decision Window',
            before: 336,
            after: 240,
            delta: -96,
            delta_pct: -28.6,
            unit: 'hours'
          }
        ],
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      },
      decision_relevance: {
        signal_id: 'sig_sb_003',
        scenario_id: 'SCN-CHILLED-SALMON-002',
        assessed_at_period: 'Today',
        changed: 'NONE',
        before_statement: null,
        after_statement: null,
        statement: 'The recommendation is unchanged.',
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      }
    }
  ],
  methods_register: {
    scenario_id: 'SCN-CHILLED-SALMON-002',
    entries: [
      {
        method_id: 'HOLT_WINTERS_ADDITIVE',
        display_name: 'Holt-Winters Additive Trend & Seasonality',
        mechanism: 'statistical',
        purpose: 'Forecasts baseline salmon movement accounting for seasonal fish consumption patterns.',
        inputs: ['Historical weekly sales units', 'Seasonal cycle (52 periods)'],
        output: 'Demand forecast and intervals across 14-week horizon',
        implementation_ref: 'lib/forecast/adapters/holt-winters.ts',
        last_run_scenario_iso: '2026-09-08T00:00:00.000Z',
        applies_to_scenario_ids: ['SCN-CHILLED-SALMON-002'],
        measured_error: { metric: 'MAPE', value: 5.1, unit: '%' },
        limitations: ['Subject to cold-chain delivery variance']
      },
      {
        method_id: 'SALMON_PROMOTION_CURVE',
        display_name: 'Seafood Elasticity & Supplier Funding Evaluator',
        mechanism: 'rule',
        purpose: 'Evaluates net margin contribution considering 60% supplier trade support funding.',
        inputs: ['Scenario depth response curve', '60% supplier promotional funding agreement'],
        output: 'Ranked promotion tier profitability',
        implementation_ref: 'packages/contracts/src/scenario-packs/chilled-salmon-import.ts',
        last_run_scenario_iso: '2026-09-08T00:00:00.000Z',
        applies_to_scenario_ids: ['SCN-CHILLED-SALMON-002'],
        measured_error: null,
        limitations: ['Assumes full 60% funding compliance']
      },
      {
        method_id: 'GENAI_NARRATIVE_DRAFTING',
        display_name: 'Governed Narrative Drafter (Google GenAI)',
        mechanism: 'llm',
        purpose: 'Drafts supplier constraint briefings under governed response validation.',
        inputs: ['Scenario parameters', 'Supplier breach context'],
        output: 'Non-authoritative brief for category manager review',
        implementation_ref: 'lib/gemini.ts',
        last_run_scenario_iso: '2026-09-08T00:00:00.000Z',
        applies_to_scenario_ids: ['SCN-CHILLED-SALMON-002'],
        measured_error: null,
        limitations: ['Non-authoritative draft requiring human review']
      }
    ],
    undescribed: [],
    provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
  },
  refresh_changed: {
    scenario_id: 'SCN-CHILLED-SALMON-002',
    from: SALMON_MARKER_FROM,
    to: SALMON_MARKER_TO,
    observations: [
      { signal_id: 'sig_sb_001', change: 'UNCHANGED', age_scenario_days: 1, materiality: null, decision_relevance: null },
      { signal_id: 'sig_sb_002', change: 'MOVED', age_scenario_days: 0, materiality: null, decision_relevance: null },
      { signal_id: 'sig_sb_003', change: 'MOVED', age_scenario_days: 0, materiality: null, decision_relevance: null }
    ],
    material_movements: [
      {
        quantity: 'SERVABLE_DEMAND_UNITS',
        display_label: 'Servable Demand',
        before: 45200,
        after: 41000,
        delta: -4200,
        delta_pct: -9.3,
        unit: 'units'
      }
    ],
    decision_changes: [
      {
        signal_id: 'sig_sb_002',
        scenario_id: 'SCN-CHILLED-SALMON-002',
        assessed_at_period: 'T+1',
        changed: 'RECOMMENDATION',
        before_statement: '20% promotion depth tier',
        after_statement: '10% promotion depth tier',
        statement: 'Recommendation confirmed at 10% depth under confirmed supplier capacity cap.',
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      }
    ],
    decision_consequence_statement: '1 signal moved. Scottish DC inventory depleted faster than expected. Recommendation remains 10% depth.',
    provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
  },
  refresh_unchanged: {
    scenario_id: 'SCN-CHILLED-SALMON-002',
    from: SALMON_MARKER_FROM,
    to: SALMON_MARKER_FROM,
    observations: [
      { signal_id: 'sig_sb_001', change: 'UNCHANGED', age_scenario_days: 0, materiality: null, decision_relevance: null },
      { signal_id: 'sig_sb_002', change: 'UNCHANGED', age_scenario_days: 1, materiality: null, decision_relevance: null },
      { signal_id: 'sig_sb_003', change: 'UNCHANGED', age_scenario_days: 1, materiality: null, decision_relevance: null }
    ],
    material_movements: [],
    decision_changes: [],
    decision_consequence_statement: 'No material change. The recommendation remains unchanged.',
    provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PREMIUM BAKERY FIXTURE (SCN-BAKERY-SOURDOUGH-003)
// ═══════════════════════════════════════════════════════════════════════════════

const BAKERY_MARKER_FROM: ScenarioAsAtMarker = {
  scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
  period: 'Today',
  period_instant_iso: '2026-09-08T00:00:00.000Z',
  opening_period: 'T-90'
};

const BAKERY_MARKER_TO: ScenarioAsAtMarker = {
  scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
  period: 'T+1',
  period_instant_iso: '2026-09-09T00:00:00.000Z',
  opening_period: 'T-90'
};

export const PREMIUM_BAKERY_LIVING_EVIDENCE: LivingEvidenceScenarioData = {
  scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
  scenario_name: 'Premium Bakery — Artisanal Sourdough 800g',
  scenario_clock: '2026-09-08T00:00:00.000Z',
  signals: [
    {
      signal_id: 'sig_fw_001',
      category: 'COMMERCIAL',
      signal_type: 'COMPETITOR_CAMPAIGN_LAUNCH',
      entity_type: 'CATEGORY',
      entity_id: 'Bakery Artisan',
      source_type: 'INTERNAL_SYSTEM',
      source_system: 'Category Market Tracker',
      baseline_value: 100,
      observed_value: 105,
      delta: 5,
      delta_pct: 5.0,
      unit: 'percent_baseline',
      confidence: 86,
      quality: 88,
      observed_period: 'T-7',
      effective_period: 'T+1',
      provenance: { origin: 'observed', method: 'measured', authority: 'authoritative' },
      materiality: {
        signal_id: 'sig_fw_001',
        scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
        assessed_at_period: 'Today',
        band: 'IMMATERIAL',
        rationale: 'Competitor activity produced negligible customer brand migration.',
        movements: [],
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      },
      decision_relevance: {
        signal_id: 'sig_fw_001',
        scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
        assessed_at_period: 'Today',
        changed: 'NONE',
        before_statement: null,
        after_statement: null,
        statement: 'The recommendation is unchanged.',
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      }
    },
    {
      signal_id: 'sig_fw_002',
      category: 'INVENTORY',
      signal_type: 'PERISHABLE_AGEING_PRESSURE',
      entity_type: 'SKU',
      entity_id: 'P023 Artisanal Sourdough 800g',
      source_type: 'SYNTHETIC_WORLD',
      source_system: 'Enterprise World (ESF-1)',
      baseline_value: 15.2,
      observed_value: 22.0,
      delta: 6.8,
      delta_pct: 44.7,
      unit: 'percent_of_week',
      confidence: 91,
      quality: 93,
      observed_period: 'T-2',
      effective_period: 'T+3',
      provenance: { origin: 'modelled', method: 'rule', authority: 'authoritative' },
      materiality: {
        signal_id: 'sig_fw_002',
        scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
        assessed_at_period: 'Today',
        band: 'MATERIAL',
        rationale: 'Same-day shelf life causes unsold inventory to spoil rapidly when production outpaces baseline.',
        movements: [
          {
            quantity: 'MARGIN_EXPOSURE_GBP',
            display_label: 'Waste Exposure Margin',
            before: 8400,
            after: 14250,
            delta: 5850,
            delta_pct: 69.6,
            unit: 'GBP'
          }
        ],
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      },
      decision_relevance: {
        signal_id: 'sig_fw_002',
        scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
        assessed_at_period: 'Today',
        changed: 'NONE',
        before_statement: null,
        after_statement: null,
        statement: 'The recommendation is unchanged.',
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      }
    },
    {
      signal_id: 'sig_fw_003',
      category: 'SUPPLY',
      signal_type: 'SUPPLIER_CAPACITY_PRESSURE',
      entity_type: 'SUPPLIER',
      entity_id: 'Artisan Bakehouse (SUP011)',
      source_type: 'SYNTHETIC_WORLD',
      source_system: 'Enterprise World (ESF-1)',
      baseline_value: 26518,
      observed_value: 28500,
      delta: 1982,
      delta_pct: 7.5,
      unit: 'units_per_week',
      confidence: 94,
      quality: 95,
      observed_period: 'T-1',
      effective_period: 'T+3',
      provenance: { origin: 'modelled', method: 'rule', authority: 'authoritative' },
      materiality: {
        signal_id: 'sig_fw_003',
        scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
        assessed_at_period: 'Today',
        band: 'NOTABLE',
        rationale: 'Same-day bake schedule restricts batch flex headroom.',
        movements: [
          {
            quantity: 'SERVABLE_DEMAND_UNITS',
            display_label: 'Servable Demand',
            before: 26518,
            after: 26518,
            delta: 0,
            delta_pct: 0,
            unit: 'units'
          }
        ],
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      },
      decision_relevance: {
        signal_id: 'sig_fw_003',
        scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
        assessed_at_period: 'Today',
        changed: 'NONE',
        before_statement: null,
        after_statement: null,
        statement: 'The recommendation is unchanged.',
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      }
    },
    {
      signal_id: 'sig_fw_004',
      category: 'FINANCIAL',
      signal_type: 'MARGIN_COMPRESSION',
      entity_type: 'SKU',
      entity_id: 'P023 Artisanal Sourdough 800g',
      source_type: 'DERIVED_ANALYTIC',
      source_system: 'Margin Yield Engine',
      baseline_value: 1.15,
      observed_value: 0.73,
      delta: -0.42,
      delta_pct: -36.5,
      unit: 'gbp_per_unit',
      confidence: 97,
      quality: 98,
      observed_period: 'Today',
      effective_period: 'T+7',
      provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' },
      materiality: {
        signal_id: 'sig_fw_004',
        scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
        assessed_at_period: 'Today',
        band: 'DECISIVE',
        rationale: 'Inelastic demand (0.8pp/point) combined with only 10% funding destroys contribution at all promo tiers.',
        movements: [
          {
            quantity: 'CAMPAIGN_CONTRIBUTION_GBP',
            display_label: 'Net Campaign Contribution',
            before: 1200,
            after: -4180,
            delta: -5380,
            delta_pct: null,
            unit: 'GBP'
          }
        ],
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      },
      decision_relevance: {
        signal_id: 'sig_fw_004',
        scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
        assessed_at_period: 'Today',
        changed: 'RECOMMENDATION',
        before_statement: '10% promotion depth tier',
        after_statement: '0% do not promote',
        statement: 'Recommendation is Do Not Promote (0% depth) as any discount yields negative commercial contribution.',
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      }
    }
  ],
  methods_register: {
    scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
    entries: [
      {
        method_id: 'HOLT_WINTERS_ADDITIVE',
        display_name: 'Holt-Winters Additive Trend & Seasonality',
        mechanism: 'statistical',
        purpose: 'Projects daily baseline bake requirements based on historical daily sales trends.',
        inputs: ['Historical daily sales units', 'Day-of-week seasonality (7 periods)'],
        output: 'Expected daily store-level demand forecast',
        implementation_ref: 'lib/forecast/adapters/holt-winters.ts',
        last_run_scenario_iso: '2026-09-08T00:00:00.000Z',
        applies_to_scenario_ids: ['SCN-BAKERY-SOURDOUGH-003'],
        measured_error: { metric: 'MAPE', value: 6.4, unit: '%' },
        limitations: ['Sensitive to weekend holiday anomalies']
      },
      {
        method_id: 'PERISHABLE_WASTE_RESPONSE',
        display_name: 'Perishable Waste & Markdown Elasticity Model',
        mechanism: 'rule',
        purpose: 'Computes discard volume and margin erosion for goods with 24-hour retail shelf life.',
        inputs: ['Product expiration timeline', 'Declared waste response curve'],
        output: 'Net profit after discard cost',
        implementation_ref: 'packages/contracts/src/scenario-packs/premium-bakery-artisan.ts',
        last_run_scenario_iso: '2026-09-08T00:00:00.000Z',
        applies_to_scenario_ids: ['SCN-BAKERY-SOURDOUGH-003'],
        measured_error: null,
        limitations: ['Applies strict same-day discard policy without mark-down recovery']
      }
    ],
    undescribed: [],
    provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
  },
  refresh_changed: {
    scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
    from: BAKERY_MARKER_FROM,
    to: BAKERY_MARKER_TO,
    observations: [
      { signal_id: 'sig_fw_001', change: 'UNCHANGED', age_scenario_days: 7, materiality: null, decision_relevance: null },
      { signal_id: 'sig_fw_002', change: 'MOVED', age_scenario_days: 0, materiality: null, decision_relevance: null },
      { signal_id: 'sig_fw_003', change: 'UNCHANGED', age_scenario_days: 1, materiality: null, decision_relevance: null },
      { signal_id: 'sig_fw_004', change: 'MOVED', age_scenario_days: 0, materiality: null, decision_relevance: null }
    ],
    material_movements: [
      {
        quantity: 'MARGIN_EXPOSURE_GBP',
        display_label: 'Waste Exposure Margin',
        before: 8400,
        after: 14250,
        delta: 5850,
        delta_pct: 69.6,
        unit: 'GBP'
      }
    ],
    decision_changes: [
      {
        signal_id: 'sig_fw_004',
        scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
        assessed_at_period: 'T+1',
        changed: 'RECOMMENDATION',
        before_statement: '10% promotion depth tier',
        after_statement: '0% do not promote',
        statement: 'Do Not Promote confirmed; margin compression confirmed across morning retail checks.',
        provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
      }
    ],
    decision_consequence_statement: '2 signals moved. Margin compression intensified. The recommendation is confirmed: Do Not Promote.',
    provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
  },
  refresh_unchanged: {
    scenario_id: 'SCN-BAKERY-SOURDOUGH-003',
    from: BAKERY_MARKER_FROM,
    to: BAKERY_MARKER_FROM,
    observations: [
      { signal_id: 'sig_fw_001', change: 'UNCHANGED', age_scenario_days: 7, materiality: null, decision_relevance: null },
      { signal_id: 'sig_fw_002', change: 'UNCHANGED', age_scenario_days: 2, materiality: null, decision_relevance: null },
      { signal_id: 'sig_fw_003', change: 'UNCHANGED', age_scenario_days: 1, materiality: null, decision_relevance: null },
      { signal_id: 'sig_fw_004', change: 'UNCHANGED', age_scenario_days: 0, materiality: null, decision_relevance: null }
    ],
    material_movements: [],
    decision_changes: [],
    decision_consequence_statement: 'No material change. The recommendation remains unchanged.',
    provenance: { origin: 'derived', method: 'rule', authority: 'authoritative' }
  }
};

export function getLivingEvidenceFixtureForScenario(scenarioId: string): LivingEvidenceScenarioData {
  if (scenarioId.includes('SALMON')) return CHILLED_SALMON_LIVING_EVIDENCE;
  if (scenarioId.includes('BAKERY') || scenarioId.includes('SOURDOUGH')) return PREMIUM_BAKERY_LIVING_EVIDENCE;
  return FRESH_DAIRY_LIVING_EVIDENCE;
}
