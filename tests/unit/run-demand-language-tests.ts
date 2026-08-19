/**
 * Unit Test Suite for the Demand & Forecast client-facing language layer.
 * Run via: npx tsx tests/unit/run-demand-language-tests.ts
 *
 * These assertions protect two things:
 *
 *   1. No internal identifier, route, contract reference or raw enum reaches the executive
 *      surface. The governed vocabulary stays exactly as the contracts define it — what is
 *      tested is that a translation exists for every value the surface can be handed.
 *   2. The translation does not change what is true. An indeterminate state still reads as an
 *      absence of evidence, a modelled assumption still reads as modelled, and the outlook
 *      attribution still reconciles to the frontier the engine published.
 */

import {
  DecisionScenarioParameters,
  DecisionDerivedImpacts,
  ContextualisedDecisionOutlook,
  EnterpriseSignal,
  calculateDerivedImpacts
} from '../../packages/contracts/src/index';

import { evaluateDemandDecisionFrontier } from '../../lib/demand-decision-frontier/demand-frontier-engine';

import {
  demandPhrase,
  demandLabel,
  demandBadge,
  describeSignalMovement,
  describePromotionMechanic,
  deriveOutlookContributors,
  CONFIDENCE_VS_STABILITY
} from '../../lib/demand-decision-language';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName} - ${errorDetail || 'Assertion failed'}`);
    failed++;
  }
}

/** Anything that would betray the implementation to a retail executive. */
const LEAKAGE_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'enterprise signal id', re: /\bsig_[a-z]+_\d+/i },
  { name: 'api route', re: /\/api\/v\d/i },
  { name: 'http verb prefix', re: /\b(POST|GET|PUT|DELETE)\s+\// },
  { name: 'work package / contract id', re: /\b(IFI|DDF|CDI|ADR|WP\d*|AC)-\d+[A-Z]?\b/ },
  { name: 'decision state version', re: /Decision State v/i },
  { name: 'SCREAMING_SNAKE enum', re: /\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/ },
  { name: 'snake_case identifier', re: /\b[a-z][a-z0-9]*_[a-z0-9_]+\b/ }
];

function firstLeak(text: string): string | null {
  for (const p of LEAKAGE_PATTERNS) {
    const m = text.match(p.re);
    if (m) return `${p.name}: "${m[0]}"`;
  }
  return null;
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const scenarioParams: DecisionScenarioParameters = {
  promotion_lift: 20,
  supplier_capacity_cap: 10,
  forecast_horizon_days: 14,
  promotion_method: '20_percent_off',
  campaign_scope: 'national',
  cannibalisation_factor: 0,
  event_boost: 'none'
};

const derivedImpacts: DecisionDerivedImpacts = calculateDerivedImpacts(scenarioParams, []);

const outlook: ContextualisedDecisionOutlook = {
  fusion_id: 'fus_test_01',
  tenant_id: 'tenant_uk_retail_01',
  session_id: 'sess_test_01',
  commercial_intent_id: 'intent_demo_01',
  decision_state_id: 'ds_test_01',
  decision_state_version: 1,
  baseline_forecast: {
    source_system: 'cognix_synthetic_world',
    source_type: 'ENTERPRISE_WORLD',
    baseline_lift_pct: 12,
    confidence: 90
  },
  commercial_intent: {
    commercial_intent_id: 'intent_demo_01',
    intent_effect_pct: 7,
    promotion_type: '20_percent_off',
    discount_depth: 20
  },
  observed_signals: {
    observed_signal_effect_pct: 3,
    signal_count: 3,
    signal_refs: ['sig_ps_001', 'sig_ps_002', 'sig_ps_003']
  },
  interaction_adjustment_pct: 0,
  contextualised_outlook_pct: 22,
  supplier_capacity_cap_pct: 10,
  potential_commitment_gap_pp: 12,
  calculation_mode: 'deterministic_demo_decomposition',
  confidence: 91,
  provenance: {},
  timestamp: new Date().toISOString(),
  schema_version: '1.0'
};

function signal(id: string, type: string, deltaPct: number): EnterpriseSignal {
  return {
    signal_id: id,
    signal_type: type as any,
    category: 'CUSTOMER',
    tenant_id: 'tenant_uk_retail_01',
    entity_type: 'CATEGORY',
    entity_id: 'Fresh Dairy',
    observed_at: new Date().toISOString(),
    effective_at: new Date().toISOString(),
    baseline_value: 100,
    observed_value: 100 + deltaPct,
    delta: deltaPct,
    delta_pct: deltaPct,
    unit: 'percent_baseline',
    source_type: 'SYNTHETIC_WORLD',
    source_system: 'cognix_world_generator',
    confidence: 92,
    quality: 95,
    provenance: {},
    synthetic_demo: true,
    schema_version: '1.0'
  };
}

const signals: EnterpriseSignal[] = [
  signal('sig_ps_001', 'SEARCH_VELOCITY_ACCELERATION', 18),
  signal('sig_ps_002', 'BASKET_ADD_ACCELERATION', 24),
  signal('sig_ps_003', 'SLOT_BOOKING_PRESSURE', 12)
];

const history = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-07-${String(i + 1).padStart(2, '0')}`,
  value: 46000
}));
const forecast = Array.from({ length: 14 }, (_, i) => ({
  date: `2026-08-${String(i + 1).padStart(2, '0')}`,
  value: 55000
}));

// ── Every governed value the surface can render has a translation ───────────

const VOCABULARY: { domain: string; values: string[] }[] = [
  { domain: 'stability_state', values: ['STABLE', 'WATCH', 'DETERIORATING', 'INDETERMINATE'] },
  { domain: 'revision_risk', values: ['LOW', 'ELEVATED', 'HIGH', 'INDETERMINATE'] },
  { domain: 'revision_direction', values: ['UPWARD', 'DOWNWARD', 'BALANCED', 'INDETERMINATE'] },
  { domain: 'gap_risk_state', values: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
  { domain: 'window_state', values: ['OPEN', 'CLOSING_SOON', 'RESTRICTED', 'INDETERMINATE'] },
  { domain: 'recommended_action', values: ['ACT_NOW', 'WAIT', 'DO_NOTHING', 'CHOICE_REQUIRED'] },
  { domain: 'feasibility_status', values: ['FEASIBLE', 'GATED_BY_READINESS', 'INSUFFICIENT_HEADROOM'] },
  {
    domain: 'provenance_class',
    values: [
      'SYNTHETIC_OBSERVED', 'DERIVED_FROM_DECISION_STATE', 'DERIVED_FROM_CONSTRAINTS',
      'MODELLED_DEMO_ASSUMPTION', 'DECLARED_OPERATIONAL_CONSTRAINT'
    ]
  },
  {
    domain: 'lever_type',
    values: ['SUPPLIER_CAPACITY_FLEX', 'SAFETY_STOCK_BUFFER', 'PROMO_DEPTH_MODERATION', 'CROSS_PROMO_REBALANCE']
  },
  { domain: 'scenario_event', values: ['none', 'heatwave', 'holiday', 'christmas'] }
];

async function runTests() {
  console.log('\n=== Demand & Forecast client-facing language ===\n');

  // ── L1: no governed enum survives into a rendered label ───────────────────

  const untranslated: string[] = [];
  for (const { domain, values } of VOCABULARY) {
    for (const value of values) {
      const label = demandLabel(domain, value);
      if (label === value || /_/.test(label) || label === '—') {
        untranslated.push(`${domain}.${value} → "${label}"`);
      }
    }
  }
  assert(
    untranslated.length === 0,
    'L1: Every governed enum the surface can render has a business-language label',
    untranslated.join('; ')
  );

  // Only the four measure cards render a value inside a fixed-width chip; the remaining
  // vocabularies render inline, where the full label has room.
  const CHIP_DOMAINS = ['stability_state', 'gap_risk_state', 'window_state', 'recommended_action'];
  const badgeIssues: string[] = [];
  for (const { domain, values } of VOCABULARY.filter(v => CHIP_DOMAINS.includes(v.domain))) {
    for (const value of values) {
      const badge = demandBadge(domain, value);
      if (!badge || /_/.test(badge) || badge.length > 24) {
        badgeIssues.push(`${domain}.${value} → "${badge}"`);
      }
    }
  }
  assert(
    badgeIssues.length === 0,
    'L2: Every status chip has a compact label that cannot clip its card',
    badgeIssues.join('; ')
  );

  // ── L3: honesty is preserved through translation ──────────────────────────

  assert(
    /evidence/i.test(demandLabel('stability_state', 'INDETERMINATE')) &&
    /not a steady reading/i.test(demandPhrase('stability_state', 'INDETERMINATE').detail || ''),
    'L3: An indeterminate forecast reads as absent evidence, and explicitly denies steadiness',
    `label "${demandLabel('stability_state', 'INDETERMINATE')}" / detail "${demandPhrase('stability_state', 'INDETERMINATE').detail}"`
  );

  assert(
    /modelled/i.test(demandLabel('provenance_class', 'MODELLED_DEMO_ASSUMPTION')) &&
    /simulated/i.test(demandLabel('provenance_class', 'SYNTHETIC_OBSERVED')),
    'L4: A modelled assumption still reads as modelled and a synthetic observation as simulated'
  );

  assert(
    !/recommend|advis|best/i.test(demandLabel('recommended_action', 'CHOICE_REQUIRED')),
    'L5: A refusal to name a winner is never restated as a recommendation'
  );

  // ── L6: signals are described by behaviour, never by identifier ────────────

  const described = signals.map(s => describeSignalMovement(s));
  assert(
    described.every(d => !/sig_/i.test(d.title) && !/sig_/i.test(d.movement)),
    'L6: An observed signal is described by what customers are doing, not by its identifier'
  );
  assert(
    described[0].title === 'Search demand accelerating' &&
    described[0].movement === '+18% versus expected baseline' &&
    described[1].title === 'Basket additions increasing' &&
    described[1].movement === '+24% versus expected baseline',
    'L7: Signal behaviour and its movement against baseline are stated in business language'
  );
  assert(
    describeSignalMovement({ signal_type: 'SEARCH_VELOCITY_ACCELERATION', delta_pct: null }).movement
      === 'Movement not quantified',
    'L8: A signal with no measured movement says so rather than showing a phantom zero'
  );

  assert(
    describePromotionMechanic('20_percent_off', 20) === '20% off' &&
    describePromotionMechanic('20_percent_off', null) === '20% off' &&
    !/_/.test(describePromotionMechanic('some_unmapped_mechanic', null)),
    'L9: A parameterised promotion mechanic renders as the offer, never as its key'
  );

  // ── L10: the executive confidence statement claims no validation ──────────

  assert(
    /confidence/i.test(CONFIDENCE_VS_STABILITY.body) &&
    /stability/i.test(CONFIDENCE_VS_STABILITY.body) &&
    !/backtest|validated|calibrated/i.test(CONFIDENCE_VS_STABILITY.body),
    'L10: The executive confidence-vs-stability statement implies no backtest that does not exist'
  );

  // ── Engine-emitted strings that render verbatim on the surface ────────────

  const evaluation = evaluateDemandDecisionFrontier({
    tenantId: 'tenant_uk_retail_01',
    sessionId: 'sess_test_01',
    scenarioParams,
    derivedImpacts,
    intentFusionOutlook: outlook,
    enterpriseSignals: signals,
    historySales: history,
    forecastSales: forecast,
    revenuePerUnitGbp: 2.07,
    metric: 'units',
    activeInterventionId: null
  });

  const assumptionLeaks = evaluation.assumptions
    .map(a => ({ key: a.key, leak: firstLeak(`${a.label} ${a.value}`) }))
    .filter(a => a.leak);
  assert(
    assumptionLeaks.length === 0,
    'L11: No assumption shown on the surface exposes a signal id, route, contract id or raw enum',
    assumptionLeaks.map(a => `${a.key} — ${a.leak}`).join('; ')
  );

  const evidenceLeaks = evaluation.recommended_intervention.evidence_basis
    .map(e => firstLeak(e))
    .filter(Boolean);
  assert(
    evidenceLeaks.length === 0,
    'L12: The recommended intervention evidence reads as business evidence, not engine provenance',
    evidenceLeaks.join('; ')
  );

  const narrativeLeaks = [
    evaluation.decision_gap.reconciliation_evidence,
    evaluation.recommended_intervention.intervention_name,
    evaluation.recommended_intervention.description,
    evaluation.recommended_intervention.rationale,
    evaluation.decision_window.explanation,
    ...evaluation.decision_gap.contributing_constraints.map(c => `${c.name} ${c.description}`)
  ].map(t => ({ t, leak: firstLeak(t) })).filter(x => x.leak);
  assert(
    narrativeLeaks.length === 0,
    'L13: Every narrative sentence the engine publishes to the surface is free of implementation language',
    narrativeLeaks.map(x => x.leak).join('; ')
  );

  // The governed technical statement is deliberately RETAINED — it moved behind the technical
  // evidence disclosure rather than being deleted, so the limitation is still disclosed.
  assert(
    evaluation.forecast_stability.confidence_distinction_statement.includes('Forecast Confidence') &&
    evaluation.forecast_stability.confidence_distinction_statement.includes('Forecast Stability'),
    'L14: The precise technical confidence statement is still published for the evidence disclosure'
  );

  // ── The outlook attribution reconciles to the frontier it explains ─────────

  const contributors = deriveOutlookContributors(evaluation, scenarioParams.promotion_lift);
  const summed = contributors.reduce((sum, c) => sum + c.pp, 0);
  assert(
    Math.abs(summed - evaluation.demand_frontier.emerging_frontier_pct) < 0.5,
    'L15: The "why" factors sum to the emerging demand outlook they claim to explain',
    `contributors ${summed.toFixed(2)}pp vs frontier ${evaluation.demand_frontier.emerging_frontier_pct}pp`
  );

  assert(
    contributors.length >= 2 && contributors.length <= 4,
    'L16: Between two and four contributing factors are shown, never a single generic figure',
    `got ${contributors.length}`
  );

  assert(
    contributors.every((c, i) => i === 0 || Math.abs(contributors[i - 1].pp) >= Math.abs(c.pp)),
    'L17: Contributing factors are ranked by how much they actually moved the outlook'
  );

  const promotionFactor = contributors.find(c => c.key === 'promotion');
  assert(
    !!promotionFactor && promotionFactor.pp > 0,
    'L18: The promotion appears as a named, quantified contributor to emerging demand'
  );

  // The promotion contribution must respond to commercial intent, not be a fixed constant —
  // this is what makes the Promotion → Demand link real rather than decorative.
  const deeperParams = { ...scenarioParams, promotion_lift: 40 };
  const deeperEvaluation = evaluateDemandDecisionFrontier({
    tenantId: 'tenant_uk_retail_01',
    sessionId: 'sess_test_01',
    scenarioParams: deeperParams,
    derivedImpacts: calculateDerivedImpacts(deeperParams, []),
    intentFusionOutlook: outlook,
    enterpriseSignals: signals,
    historySales: history,
    forecastSales: forecast,
    revenuePerUnitGbp: 2.07,
    metric: 'units',
    activeInterventionId: null
  });
  const deeperPromotion = deriveOutlookContributors(deeperEvaluation, 40).find(c => c.key === 'promotion');
  assert(
    !!deeperPromotion && !!promotionFactor && deeperPromotion.pp > promotionFactor.pp,
    'L19: Deepening the promotion increases its attributed contribution to emerging demand',
    `20% depth ${promotionFactor?.pp.toFixed(2)}pp vs 40% depth ${deeperPromotion?.pp.toFixed(2)}pp`
  );

  const contributorTextLeaks = contributors
    .map(c => firstLeak(`${c.label} ${c.detail} ${c.qualifier || ''}`))
    .filter(Boolean);
  assert(
    contributorTextLeaks.length === 0,
    'L20: The attributed factors are named in business language',
    contributorTextLeaks.join('; ')
  );

  // A declared scenario event must be named rather than left inside an unattributed trend.
  const eventParams = { ...scenarioParams, event_boost: 'heatwave' };
  const eventEvaluation = evaluateDemandDecisionFrontier({
    tenantId: 'tenant_uk_retail_01',
    sessionId: 'sess_test_01',
    scenarioParams: eventParams,
    derivedImpacts: calculateDerivedImpacts(eventParams, []),
    intentFusionOutlook: outlook,
    enterpriseSignals: signals,
    historySales: history,
    forecastSales: forecast,
    revenuePerUnitGbp: 2.07,
    metric: 'units',
    activeInterventionId: null
  });
  const baselineFactor = deriveOutlookContributors(eventEvaluation, 20, 'heatwave')
    .find(c => c.key === 'baseline');
  assert(
    !!baselineFactor && /heatwave/i.test(baselineFactor.qualifier || ''),
    'L21: A declared scenario event is named on the factor that carries it, not left as organic drift',
    `qualifier: "${baselineFactor?.qualifier}"`
  );

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Demand language test suite failed with an error:', err);
  process.exit(1);
});
