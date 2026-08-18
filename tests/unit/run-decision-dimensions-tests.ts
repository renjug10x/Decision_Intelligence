/**
 * Campaign Decision dimension, comparison and drafting-assistant regression suite.
 *
 * Covers the acceptance requirements for making Category, Customer Segment and Route to
 * Customer real decision dimensions rather than captions:
 *
 *  §1  Taxonomies are valid, non-overlapping and catalogue-backed where they claim to be.
 *  §2  Each dimension materially changes decision behaviour, for a stated reason.
 *  §3  Selections persist into CampaignIntent, into preserved snapshots, and into the brief.
 *  §4  Comparison supports 2, 3 and 4 experiments; a fifth selection is refused.
 *  §5  Identical experiments produce no winner and no invented trade-off.
 *  §6  Strongest / lowest-risk / trade-off / next-move logic is evidence-based.
 *  §7  The drafting assistant is non-authoritative, contextual and harmless when it fails.
 *  §8  Experiment identity and reset semantics survive all of the above.
 *
 * Run via: npx tsx tests/unit/run-decision-dimensions-tests.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_SEGMENTS,
  CAMPAIGN_CHANNELS,
  CAMPAIGN_ACTIVATIONS,
  CAMPAIGN_CATEGORY_IDS,
  CAMPAIGN_SEGMENT_IDS,
  CAMPAIGN_CHANNEL_IDS,
  resolveCategory,
  resolveSegment,
  resolveChannel,
  resolveActivation,
  categoryLabel,
  segmentLabel,
  channelLabel,
  addressableReachShare,
  isActivationCompatible,
  executionLeadTimeDays,
  discountIsConfinableToSegment
} from '../../packages/contracts/src/campaign-decision-taxonomy-model';
import {
  MIN_COMPARISON_EXPERIMENTS,
  MAX_COMPARISON_EXPERIMENTS,
  validateExperimentComparison,
  type CampaignDecisionExperiment
} from '../../packages/contracts/src/campaign-experiment-model';
import {
  assistantDraftedCount,
  createDefaultCampaignIntentDraft,
  isAssistantDrafted
} from '../../packages/contracts/src/campaign-intent-model';
import { campaignExperimentStore } from '../../lib/campaign-experiment-store';
import {
  clearCampaignIntents,
  registerCampaignIntent
} from '../../lib/campaign-intent-store';
import { evaluateCampaignDecision } from '../../lib/campaign-causal-engine';
import { discoverCampaignOpportunity } from '../../lib/campaign-opportunity-engine';
import { evaluateCampaignReadiness } from '../../lib/campaign-readiness-engine';
import { POST as suggestPOST } from '../../app/api/v1/campaigns/decision-context/suggest/route';
import {
  TYPE_SPECS,
  MAX_ITEM_CHARS,
  MAX_ITEM_WORDS,
  normaliseForComparison,
  parseSuggestionArray,
  validateSuggestions
} from '../../lib/campaign-decision-suggestion-validation';

let total = 0;
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}${detail ? ` (${detail})` : ''}`);
  }
}

const TENANT = 'tenant_dimensions_test';
const REPO_ROOT = join(__dirname, '..', '..');

/** Register a decision with the stated dimensions and evaluate it through the real engines. */
function evaluateWith(
  session: string,
  overrides: {
    category?: string;
    segment?: string;
    channel?: string;
    activations?: string[];
    depth?: number;
    region?: string;
    sku?: string[];
  }
) {
  clearCampaignIntents(TENANT, session);
  const draft = createDefaultCampaignIntentDraft(TENANT, session);
  draft.campaign_intent.category = overrides.category ?? draft.campaign_intent.category;
  draft.campaign_intent.sku_scope = overrides.sku ?? draft.campaign_intent.sku_scope;
  draft.campaign_intent.intervention_posture = 'CONSIDER_PROMOTION';
  draft.campaign_intent.provisional_mechanic = '20_percent_off';
  draft.campaign_intent.provisional_discount_depth = overrides.depth ?? 20;
  draft.audience_market.region = overrides.region ?? draft.audience_market.region;
  draft.audience_market.customer_segment = overrides.segment ?? draft.audience_market.customer_segment;
  draft.audience_market.channel = overrides.channel ?? draft.audience_market.channel;
  draft.audience_market.activation_channels = overrides.activations ?? [];
  draft.audience_market.timing_mode = 'KNOWN_DATES';
  draft.audience_market.planned_start = '2026-08-20T00:00:00.000Z';
  draft.audience_market.planned_end = '2026-09-03T00:00:00.000Z';
  draft.canvas_progress.completed_areas = [
    'CAMPAIGN_INTENT',
    'BASELINE_OBJECTIVE',
    'AUDIENCE_MARKET',
    'DECISION_CONTEXT'
  ];
  const registered = registerCampaignIntent(draft);
  const evaluation = evaluateCampaignDecision({
    tenant_id: registered.tenant_id,
    session_id: registered.session_id,
    campaign_intent_id: registered.campaign_intent_id,
    include_signals: false
  });
  return { intent: registered, evaluation };
}

/**
 * Assess readiness the way the canvas does: evaluate, discover micro-markets, then assess.
 * The Customer dimension needs CDI-03 discovery, so skipping that step would leave the
 * audience rules unevaluated and the assertions below testing nothing.
 */
function readinessFor(session: string, campaignIntentId: string) {
  const discovery = discoverCampaignOpportunity({
    tenant_id: TENANT,
    session_id: session,
    campaign_intent_id: campaignIntentId,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  } as any);
  return evaluateCampaignReadiness({
    tenant_id: TENANT,
    session_id: session,
    campaign_intent_id: campaignIntentId,
    opportunity_discovery: discovery,
    evaluation_timestamp: '2026-08-15T12:00:00.000Z'
  } as any);
}

function driver(evaluation: any, driverId: string): number {
  return evaluation.causal.drivers.find((d: any) => d.driver_id === driverId)?.contribution_pp ?? 0;
}

function driverRationale(evaluation: any, driverId: string): string {
  return evaluation.causal.drivers.find((d: any) => d.driver_id === driverId)?.rationale || '';
}

/** Preserve an experiment carrying the stated dimensions. */
function preserve(
  session: string,
  overrides: Partial<CampaignDecisionExperiment>,
  closeAfter = true
): CampaignDecisionExperiment {
  const saved = campaignExperimentStore.saveExperiment(TENANT, session, {
    campaign_intent_id: `intent_${session}`,
    framing_question: 'Should we intervene?',
    objective_type: 'REVENUE_ACCELERATION',
    objective_label: 'Revenue acceleration',
    category: 'DAIRY',
    sku_scope: ['P004'],
    region: 'North West',
    timing_mode: 'FIND_BEST_WINDOW',
    intervention_posture: 'CONSIDER_PROMOTION',
    posture_label: 'Consider promotion',
    primary_metric: 'CONTRIBUTION',
    target_direction: 'INCREASE',
    major_constraints: [],
    decision_recommendation: 'Targeted promotion',
    incremental_demand_pct: 10,
    contribution_impact_gbp: 1000,
    readiness_status: 'READY',
    readiness_summary: 'Gates passed',
    primary_trade_off: 'Margin vs volume',
    evidence_posture: 'Demonstration evidence basis: uncalibrated simulation data',
    schema_version: '1.0',
    ...overrides
  });
  if (closeAfter) campaignExperimentStore.closeActiveExperiment(TENANT, session);
  return saved;
}

async function run() {
  console.log('\n======================================================');
  console.log(' COGNIX CAMPAIGN DECISION DIMENSIONS & COMPARISON SUITE');
  console.log('======================================================');

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 1. Taxonomy validity ---');

  assert(
    new Set(CAMPAIGN_CATEGORY_IDS).size === CAMPAIGN_CATEGORY_IDS.length &&
      new Set(CAMPAIGN_SEGMENT_IDS).size === CAMPAIGN_SEGMENT_IDS.length &&
      new Set(CAMPAIGN_CHANNEL_IDS).size === CAMPAIGN_CHANNEL_IDS.length,
    'Taxonomy ids are unique within each dimension'
  );

  assert(
    new Set(CAMPAIGN_CATEGORIES.map(c => c.display_label.toLowerCase())).size ===
      CAMPAIGN_CATEGORIES.length &&
      new Set(CAMPAIGN_SEGMENTS.map(s => s.display_label.toLowerCase())).size ===
        CAMPAIGN_SEGMENTS.length &&
      new Set(CAMPAIGN_CHANNELS.map(c => c.display_label.toLowerCase())).size ===
        CAMPAIGN_CHANNELS.length,
    'Display labels do not collide within a dimension'
  );

  // Category is the only dimension claiming catalogue backing — hold it to that claim
  // against the real catalogue rather than against a copy of its own table.
  const products = JSON.parse(readFileSync(join(REPO_ROOT, 'data', 'products.json'), 'utf8')) as Array<{
    category: string;
    subcategory: string;
    supplier_id: string;
  }>;
  const suppliers = JSON.parse(readFileSync(join(REPO_ROOT, 'data', 'suppliers.json'), 'utf8')) as Array<{
    supplier_id: string;
    name: string;
    category: string;
  }>;

  const catalogueCategories = new Set(products.map(p => p.category));
  assert(
    CAMPAIGN_CATEGORIES.every(c => catalogueCategories.has(c.catalogue_key)),
    'Every category maps to a category that exists in the product catalogue',
    CAMPAIGN_CATEGORIES.filter(c => !catalogueCategories.has(c.catalogue_key))
      .map(c => c.catalogue_key)
      .join(', ')
  );
  assert(
    catalogueCategories.size === CAMPAIGN_CATEGORIES.length,
    'No catalogue category is missing from the taxonomy',
    `catalogue=${catalogueCategories.size} taxonomy=${CAMPAIGN_CATEGORIES.length}`
  );

  // Supplier coverage is counted through the SKU -> supplier_id join, which is what actually
  // serves a category. Counting suppliers whose own `category` label matches the product
  // category undercounts badly — supplier labels use a different vocabulary ('Meat', 'Fish',
  // 'Pork' all serve Chilled) — and readiness then asserts single-supplier exposure, or no
  // supplier at all, that the catalogue contradicts.
  const supplierIdsByName = new Map(suppliers.map(s => [s.supplier_id, s.name]));
  const suppliersFor = (catalogueKey: string) =>
    new Set(
      products
        .filter(p => p.category === catalogueKey)
        .map(p => supplierIdsByName.get(p.supplier_id))
        .filter((n): n is string => !!n)
    );

  const countMismatches = CAMPAIGN_CATEGORIES.filter(c => {
    const skus = products.filter(p => p.category === c.catalogue_key);
    const subs = [...new Set(skus.map(p => p.subcategory))].sort();
    return (
      skus.length !== c.sku_count ||
      suppliersFor(c.catalogue_key).size !== c.supplier_count ||
      JSON.stringify(subs) !== JSON.stringify(c.subcategories)
    );
  });
  assert(
    countMismatches.length === 0,
    'Category SKU counts, supplier counts and subcategories match the catalogue exactly',
    countMismatches.map(c => c.id).join(', ')
  );

  assert(
    CAMPAIGN_CATEGORIES.every(c => c.evidence_basis === 'CATALOGUE_BACKED'),
    'Categories declare catalogue backing, which the assertions above hold them to'
  );
  assert(
    CAMPAIGN_SEGMENTS.filter(s => s.id !== 'ALL_CUSTOMERS').every(
      s => s.evidence_basis === 'DEMO_ASSUMPTION'
    ),
    'Targeted segments declare themselves demonstration assumptions, never measurement',
    'this estate holds no customer segmentation data'
  );

  assert(
    CAMPAIGN_SEGMENTS.every(s => s.reach_share > 0 && s.reach_share <= 1) &&
      CAMPAIGN_CHANNELS.every(c => c.reach_share > 0 && c.reach_share <= 1),
    'Reach shares are proper fractions'
  );
  assert(
    resolveSegment('ALL_CUSTOMERS')!.reach_share === 1 &&
      resolveChannel('ALL_CHANNELS')!.reach_share === 1,
    'The untargeted segment and unconstrained channel are the full-reach anchors'
  );
  assert(
    CAMPAIGN_SEGMENTS.every(s => s.evidence_requirement.trim().length > 0),
    'Every segment states what must be shown before it counts as evidence'
  );
  assert(
    CAMPAIGN_CHANNELS.every(
      c => c.compatible_activations.every(a => CAMPAIGN_ACTIVATIONS.some(x => x.id === a))
    ),
    'Channel compatibility only references activations that exist'
  );

  // The modelling boundary this work package exists to correct.
  assert(
    !CAMPAIGN_SEGMENTS.some(s => /online|digital|app|store|channel/i.test(s.display_label)),
    'No segment is really a channel wearing a segment label'
  );
  assert(
    !CAMPAIGN_CHANNELS.some(c => /loyal|premium|family|price|value/i.test(c.display_label)),
    'No sales channel is really a customer segment wearing a channel label'
  );
  assert(
    CAMPAIGN_ACTIVATIONS.every(a => !CAMPAIGN_CHANNEL_IDS.includes(a.id as never)),
    'Activation routes and sales channels are disjoint sets'
  );

  // Resolution must classify, never guess.
  assert(
    resolveCategory('Fresh Produce')?.id === 'PRODUCE' &&
      resolveCategory('Produce')?.id === 'PRODUCE' &&
      resolveCategory('PRODUCE')?.id === 'PRODUCE',
    'Category resolves by id, display label and catalogue key alike'
  );
  assert(
    resolveCategory('Fresh Dairy') === null &&
      resolveSegment('Family Shoppers') === null &&
      resolveChannel('Omnichannel') === null,
    'Values outside the taxonomy resolve to null rather than being coerced to a near match'
  );
  assert(
    categoryLabel('Fresh Dairy') === 'Fresh Dairy' &&
      segmentLabel(undefined) === segmentLabel('ALL_CUSTOMERS') &&
      channelLabel(undefined) === channelLabel('ALL_CHANNELS'),
    'Unclassified values keep their own text; an absent dimension reads identically to an explicit all'
  );
  // An absent audience and an explicit ALL_CUSTOMERS are the same decision, so the comparison
  // surface must not report a difference between them. Differently-cased fallback prose
  // previously made two identically-targeted experiments look materially different.
  assert(
    segmentLabel(undefined) === 'All Customers' && channelLabel(undefined) === 'All Channels',
    'The neutral fallback is the canonical taxonomy label, not separate prose that only looks like it'
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Category materially changes decision behaviour ---');

  const dairy = evaluateWith('sess_cat_dairy', { category: 'DAIRY' });
  const bakery = evaluateWith('sess_cat_bakery', { category: 'BAKERY' });

  assert(
    driver(dairy.evaluation, 'mechanic_response') > driver(bakery.evaluation, 'mechanic_response'),
    'An elastic category converts discount into volume better than an inelastic one',
    `dairy=${driver(dairy.evaluation, 'mechanic_response')} bakery=${driver(bakery.evaluation, 'mechanic_response')}`
  );
  assert(
    Math.abs(
      driver(dairy.evaluation, 'mechanic_response') / driver(bakery.evaluation, 'mechanic_response') -
        resolveCategory('DAIRY')!.promotional_elasticity /
          resolveCategory('BAKERY')!.promotional_elasticity
    ) < 0.05,
    'Discount response scales by the ratio of the two categories stated elasticities, not by an unexplained factor'
  );
  assert(
    bakery.evaluation.counterfactual.campaign_delta.contribution_delta_gbp <
      dairy.evaluation.counterfactual.campaign_delta.contribution_delta_gbp,
    'Discounting an inelastic category destroys more contribution than discounting an elastic one',
    `bakery=${bakery.evaluation.counterfactual.campaign_delta.contribution_delta_gbp} dairy=${dairy.evaluation.counterfactual.campaign_delta.contribution_delta_gbp}`
  );

  // The category name must not move numbers on its own — only its stated properties may.
  const dairyAlias = evaluateWith('sess_cat_alias', { category: 'Dairy' });
  assert(
    dairyAlias.evaluation.causal.intervention_uplift_pp ===
      dairy.evaluation.causal.intervention_uplift_pp,
    'Two spellings of the same category produce identical results — no name-hash jitter'
  );

  const readinessDairy = readinessFor('sess_cat_dairy', dairy.intent.campaign_intent_id);
  const dairyConstraint = resolveCategory('DAIRY')!.binding_constraint;
  assert(
    JSON.stringify(readinessDairy).includes(dairyConstraint),
    'Readiness names the constraint that binds the chosen category',
    dairyConstraint
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Customer segment materially changes decision behaviour ---');

  const untargeted = evaluateWith('sess_seg_all', { segment: 'ALL_CUSTOMERS' });
  const priceSensitive = evaluateWith('sess_seg_price', { segment: 'PRICE_SENSITIVE' });
  const highValue = evaluateWith('sess_seg_high', { segment: 'HIGH_VALUE' });

  assert(
    driver(untargeted.evaluation, 'audience_response') >
      driver(priceSensitive.evaluation, 'audience_response'),
    'Targeting a cohort moves less estate demand than reaching the whole base',
    `all=${driver(untargeted.evaluation, 'audience_response')} price=${driver(priceSensitive.evaluation, 'audience_response')}`
  );
  // Reach alone separates these two cohorts (0.28 vs 0.15), so comparing their raw responses
  // passed even with promotional_responsiveness reduced to a constant. Dividing the response by
  // each cohort's reach isolates the responsiveness term, which is the property under test.
  const perReach = (evaluated: any, segmentId: string) =>
    driver(evaluated, 'audience_response') / CAMPAIGN_SEGMENTS.find(x => x.id === segmentId)!.reach_share;
  assert(
    perReach(priceSensitive.evaluation, 'PRICE_SENSITIVE') >
      perReach(highValue.evaluation, 'HIGH_VALUE') * 1.5,
    'A highly promotion-responsive cohort out-responds a low-responsiveness one once reach is divided out',
    `price=${perReach(priceSensitive.evaluation, 'PRICE_SENSITIVE').toFixed(2)} high=${perReach(highValue.evaluation, 'HIGH_VALUE').toFixed(2)}`
  );
  assert(
    driver(priceSensitive.evaluation, 'audience_response') >
      driver(highValue.evaluation, 'audience_response'),
    'and it moves more estate demand overall at its wider reach',
    `price=${driver(priceSensitive.evaluation, 'audience_response')} highValue=${driver(highValue.evaluation, 'audience_response')}`
  );
  assert(
    driverRationale(priceSensitive.evaluation, 'audience_response').includes('Price Sensitive') &&
      /28%/.test(driverRationale(priceSensitive.evaluation, 'audience_response')),
    'The audience driver explains itself by naming the cohort and the share it reaches',
    driverRationale(priceSensitive.evaluation, 'audience_response')
  );

  const readinessTargeted = readinessFor('sess_seg_price', priceSensitive.intent.campaign_intent_id);
  const readinessUntargeted = readinessFor('sess_seg_all', untargeted.intent.campaign_intent_id);
  assert(
    JSON.stringify(readinessTargeted).includes('U4_segment_assumption') &&
      !JSON.stringify(readinessUntargeted).includes('U4_segment_assumption'),
    'Readiness flags a targeted audience as a stated assumption, and does not flag the untargeted case'
  );
  assert(
    JSON.stringify(readinessTargeted).includes(resolveSegment('PRICE_SENSITIVE')!.evidence_requirement),
    'Readiness states what would have to be shown for the chosen segment to count as evidence'
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Route to customer materially changes decision behaviour ---');

  const allChannels = evaluateWith('sess_ch_all', { channel: 'ALL_CHANNELS' });
  const store = evaluateWith('sess_ch_store', { channel: 'STORE' });
  const app = evaluateWith('sess_ch_app', { channel: 'MOBILE_APP' });

  assert(
    driver(allChannels.evaluation, 'channel_response') === 0,
    'Serving every channel forfeits no reach and contributes nothing on its own'
  );
  assert(
    driver(store.evaluation, 'channel_response') > driver(app.evaluation, 'channel_response'),
    'A narrower route forfeits more estate demand than a broad one',
    `store=${driver(store.evaluation, 'channel_response')} app=${driver(app.evaluation, 'channel_response')}`
  );
  assert(
    driverRationale(app.evaluation, 'channel_response').includes('Mobile App') &&
      /confine an offer/.test(driverRationale(app.evaluation, 'channel_response')),
    'The channel driver names the route and whether it can confine an offer',
    driverRationale(app.evaluation, 'channel_response')
  );

  // The commercial case for targeting: same cohort, two routes, opposite outcomes.
  const targetedOnStore = evaluateWith('sess_conf_store', {
    segment: 'PRICE_SENSITIVE',
    channel: 'STORE'
  });
  const targetedOnApp = evaluateWith('sess_conf_app', {
    segment: 'PRICE_SENSITIVE',
    channel: 'MOBILE_APP'
  });
  assert(
    targetedOnApp.evaluation.counterfactual.campaign_delta.contribution_delta_gbp >
      targetedOnStore.evaluation.counterfactual.campaign_delta.contribution_delta_gbp,
    'A route that can confine the offer to the targeted cohort returns more contribution than one that cannot',
    `app=${targetedOnApp.evaluation.counterfactual.campaign_delta.contribution_delta_gbp} store=${targetedOnStore.evaluation.counterfactual.campaign_delta.contribution_delta_gbp}`
  );
  assert(
    targetedOnApp.evaluation.causal.intervention_uplift_pp <
      targetedOnStore.evaluation.causal.intervention_uplift_pp,
    'and it does so on LESS headline demand — the trade-off is real, not a free win',
    `app=${targetedOnApp.evaluation.causal.intervention_uplift_pp} store=${targetedOnStore.evaluation.causal.intervention_uplift_pp}`
  );

  const readinessUnconfinable = readinessFor('sess_conf_store', targetedOnStore.intent.campaign_intent_id);
  assert(
    JSON.stringify(readinessUnconfinable).includes('U6_offer_not_confinable'),
    'Readiness names the subsidy leak when a targeted offer runs on a route that cannot confine it'
  );

  // Regression: the economics and the readiness constraint must be decided by ONE predicate.
  // They were not — readiness (and the canvas note) honoured an addressable activation while
  // the causal engine gated confinement on the sales channel alone, so adding a personalised
  // route cleared the subsidy-leak warning while the engine kept charging full-base erosion.
  // The system told the planner a leak was closed and priced it as open.
  const leakOnStore = evaluateWith('sess_leak_none', {
    segment: 'PRICE_SENSITIVE',
    channel: 'STORE',
    activations: []
  });
  const leakClosedByActivation = evaluateWith('sess_leak_crm', {
    segment: 'PRICE_SENSITIVE',
    channel: 'STORE',
    activations: ['LOYALTY_PERSONALISED']
  });
  assert(
    leakClosedByActivation.evaluation.counterfactual.campaign_delta.contribution_delta_gbp !==
      leakOnStore.evaluation.counterfactual.campaign_delta.contribution_delta_gbp,
    'An addressable activation changes the economics, not just the warning',
    `crm=${leakClosedByActivation.evaluation.counterfactual.campaign_delta.contribution_delta_gbp} none=${leakOnStore.evaluation.counterfactual.campaign_delta.contribution_delta_gbp}`
  );
  const readinessLeakClosed = readinessFor(
    'sess_leak_crm',
    leakClosedByActivation.intent.campaign_intent_id
  );
  assert(
    !JSON.stringify(readinessLeakClosed).includes('U6_offer_not_confinable'),
    'and readiness agrees the leak is closed, so the two surfaces cannot contradict each other'
  );
  const nonAddressableActivation = evaluateWith('sess_leak_pos', {
    segment: 'PRICE_SENSITIVE',
    channel: 'STORE',
    activations: ['IN_STORE_MEDIA']
  });
  assert(
    nonAddressableActivation.evaluation.counterfactual.campaign_delta.contribution_delta_gbp ===
      leakOnStore.evaluation.counterfactual.campaign_delta.contribution_delta_gbp,
    'A non-addressable activation closes nothing and changes nothing',
    `pos=${nonAddressableActivation.evaluation.counterfactual.campaign_delta.contribution_delta_gbp}`
  );

  // Deeper discounts must still be able to destroy contribution. Confining the cost while
  // leaving the volume response estate-wide once made contribution rise without limit in
  // depth, so "discount harder" always won and the demo could never show a negative case.
  const depthCurve = [5, 15, 30, 60].map(
    depth =>
      evaluateWith(`sess_depth_${depth}`, {
        segment: 'PRICE_SENSITIVE',
        channel: 'MOBILE_APP',
        depth
      }).evaluation.counterfactual.campaign_delta.contribution_delta_gbp
  );
  assert(
    depthCurve.every((v, i) => i === 0 || v < depthCurve[i - 1]),
    'Contribution still falls as discount depth rises, even on a route that confines the offer',
    depthCurve.join(' -> ')
  );

  const incoherent = evaluateWith('sess_ch_incoherent', {
    channel: 'ONLINE_GROCERY',
    activations: ['IN_STORE_MEDIA']
  });
  const readinessIncoherent = readinessFor('sess_ch_incoherent', incoherent.intent.campaign_intent_id);
  assert(
    JSON.stringify(readinessIncoherent).includes('U7_activation_channel_mismatch'),
    'Readiness flags an activation route that cannot reach the chosen sales channel'
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Combinations produce different decision stories ---');

  const combinationA = evaluateWith('sess_combo_a', {
    category: 'PRODUCE',
    segment: 'PRICE_SENSITIVE',
    channel: 'STORE'
  });
  const combinationB = evaluateWith('sess_combo_b', {
    category: 'BAKERY',
    segment: 'HIGH_VALUE',
    channel: 'ONLINE_GROCERY'
  });
  assert(
    combinationA.evaluation.causal.intervention_uplift_pp !==
      combinationB.evaluation.causal.intervention_uplift_pp &&
      combinationA.evaluation.counterfactual.campaign_delta.contribution_delta_gbp !==
        combinationB.evaluation.counterfactual.campaign_delta.contribution_delta_gbp,
    'Fresh Produce / Price Sensitive / Store differs from Bakery / High Value / Online Grocery'
  );
  assert(
    driver(combinationA.evaluation, 'mechanic_response') !==
      driver(combinationB.evaluation, 'mechanic_response') &&
      driver(combinationA.evaluation, 'audience_response') !==
        driver(combinationB.evaluation, 'audience_response') &&
      driver(combinationA.evaluation, 'channel_response') !==
        driver(combinationB.evaluation, 'channel_response'),
    'and it differs on all three dimensions independently, not through one dominant term'
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Derived planning quantities ---');

  assert(
    addressableReachShare('PRICE_SENSITIVE', 'MOBILE_APP') ===
      Number((0.28 * 0.09).toFixed(4)),
    'Addressable reach is the product of segment and channel share'
  );
  assert(
    addressableReachShare(undefined, undefined) === 1,
    'With neither stated, reach is the whole estate'
  );
  assert(
    isActivationCompatible('ONLINE_GROCERY', 'IN_STORE_MEDIA') === false &&
      isActivationCompatible('STORE', 'IN_STORE_MEDIA') === true,
    'Activation compatibility reflects whether the route can reach that shopper'
  );
  assert(
    isActivationCompatible('Omnichannel', 'IN_STORE_MEDIA') === true,
    'An unclassified channel makes no compatibility claim rather than a false one'
  );
  assert(
    executionLeadTimeDays('MOBILE_APP', ['IN_STORE_MEDIA']) === 10,
    'Lead time is set by the slowest selected route, not the fastest'
  );
  assert(
    discountIsConfinableToSegment('PRICE_SENSITIVE', 'STORE', []) === false &&
      discountIsConfinableToSegment('PRICE_SENSITIVE', 'STORE', ['LOYALTY_PERSONALISED']) === true &&
      discountIsConfinableToSegment('ALL_CUSTOMERS', 'STORE', []) === true,
    'An offer is confinable via a personalising channel or an addressable activation; targeting nobody needs no confinement'
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Selections persist into snapshots, history and the brief ---');

  const SNAP = 'sess_snapshot';
  campaignExperimentStore.clear(TENANT, SNAP);
  const preserved = preserve(SNAP, {
    category: 'PRODUCE',
    audience_segment: 'PRICE_SENSITIVE',
    sales_channel: 'ONLINE_GROCERY',
    activation_channels: ['EMAIL_CRM']
  });

  assert(
    preserved.category === 'PRODUCE' &&
      preserved.audience_segment === 'PRICE_SENSITIVE' &&
      preserved.sales_channel === 'ONLINE_GROCERY' &&
      preserved.activation_channels?.join() === 'EMAIL_CRM',
    'All four dimension fields are captured on the preserved experiment'
  );

  const reread = campaignExperimentStore.getExperimentById(preserved.experiment_id, TENANT, SNAP)!;
  assert(
    reread.audience_segment === 'PRICE_SENSITIVE' && reread.sales_channel === 'ONLINE_GROCERY',
    'Historical review returns the preserved dimensions'
  );

  const brief = campaignExperimentStore.generateExecutionBrief(TENANT, SNAP, preserved.experiment_id)!;
  assert(
    brief.operational_scope.channel.includes('Online Grocery'),
    'The execution brief reports the route the decision was actually taken on',
    brief.operational_scope.channel
  );
  assert(
    brief.operational_scope.channel !== 'Omnichannel',
    'and never the constant that used to be printed regardless of the choice'
  );
  assert(
    brief.operational_scope.channel.includes('Email / CRM'),
    'and names the activation routes alongside it',
    brief.operational_scope.channel
  );
  assert(
    brief.operational_scope.audience === 'Price Sensitive',
    'and reports the audience by its display label',
    brief.operational_scope.audience
  );

  // No live-state bleed: change the live draft, re-read history.
  evaluateWith(SNAP, { category: 'FROZEN', segment: 'FAMILIES', channel: 'STORE' });
  const afterLiveChange = campaignExperimentStore.getExperimentById(
    preserved.experiment_id,
    TENANT,
    SNAP
  )!;
  assert(
    afterLiveChange.category === 'PRODUCE' &&
      afterLiveChange.audience_segment === 'PRICE_SENSITIVE' &&
      afterLiveChange.sales_channel === 'ONLINE_GROCERY',
    'Editing the live decision does not rewrite a preserved experiment'
  );
  const briefAfter = campaignExperimentStore.generateExecutionBrief(
    TENANT,
    SNAP,
    preserved.experiment_id
  )!;
  assert(
    briefAfter.operational_scope.channel.includes('Online Grocery'),
    'and the brief regenerated afterwards still reads the historical route'
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 8. Preserved experiments are immutable ---');

  const IMM = 'sess_immutable';
  campaignExperimentStore.clear(TENANT, IMM);
  const first = preserve(IMM, { category: 'DAIRY', contribution_impact_gbp: 1000 });
  preserve(IMM, { category: 'BAKERY', contribution_impact_gbp: 2000 });

  let overwriteRejected = false;
  try {
    campaignExperimentStore.saveExperiment(TENANT, IMM, {
      experiment_id: first.experiment_id,
      category: 'FROZEN',
      contribution_impact_gbp: 999999
    });
  } catch {
    overwriteRejected = true;
  }
  assert(overwriteRejected, 'A request naming a closed experiment id is refused, not applied');
  assert(
    campaignExperimentStore.getExperimentById(first.experiment_id, TENANT, IMM)!
      .contribution_impact_gbp === 1000,
    'and the preserved record is unchanged by the attempt'
  );
  assert(
    campaignExperimentStore.getActiveExperimentId(TENANT, IMM) === null,
    'and the refused write does not reopen it as the session active decision'
  );

  // Re-evaluating within one decision must not carry stale downstream analysis.
  //
  // Evaluation snapshots are shaped like real CDI-02 responses, because sameness is judged on
  // what the evaluation concluded rather than on the whole payload — every real response
  // carries a fresh id and timestamps, so a whole-object compare would call every preservation
  // a re-evaluation and drop analysis on each save.
  const STALE = 'sess_stale';
  const evaluationSnapshot = (uplift: number, contribution: number) => ({
    evaluation_id: `cdeval_${uplift}_${contribution}`,
    timestamp: new Date().toISOString(),
    causal: {
      intervention_uplift_pp: uplift,
      ambient_uplift_pp: 1.46,
      total_predicted_uplift_pp: uplift + 1.46,
      drivers: [{ driver_id: 'mechanic_response', contribution_pp: uplift, attributed: true }]
    },
    counterfactual: {
      campaign_delta: {
        attributable_uplift_pp: uplift,
        contribution_delta_gbp: contribution,
        volume_delta_units: Math.round(uplift * 100)
      }
    }
  });

  campaignExperimentStore.clear(TENANT, STALE);
  campaignExperimentStore.saveExperiment(TENANT, STALE, {
    campaign_intent_id: 'intent_stale',
    category: 'DAIRY',
    region: 'North West',
    decision_recommendation: 'Targeted promotion',
    incremental_demand_pct: 5,
    contribution_impact_gbp: 100,
    readiness_status: 'READY',
    evaluation_snapshot: evaluationSnapshot(5, 100),
    readiness_snapshot: { state: 'GO' },
    frontier_snapshot: { selected: 'play_a' }
  });

  // Re-preserving the SAME conclusion is not a re-evaluation — it is the next stage of one
  // decision, and must keep the analysis already established.
  const sameConclusion = campaignExperimentStore.saveExperiment(TENANT, STALE, {
    category: 'DAIRY',
    region: 'North West',
    decision_recommendation: 'Targeted promotion',
    incremental_demand_pct: 5,
    contribution_impact_gbp: 100,
    evaluation_snapshot: evaluationSnapshot(5, 100)
  });
  assert(
    !!sameConclusion.readiness_snapshot && !!sameConclusion.frontier_snapshot,
    'Re-preserving an unchanged evaluation keeps the analysis already established',
    JSON.stringify({ readiness: sameConclusion.readiness_snapshot, frontier: sameConclusion.frontier_snapshot })
  );

  const afterReEvaluation = campaignExperimentStore.saveExperiment(TENANT, STALE, {
    category: 'DAIRY',
    region: 'North West',
    decision_recommendation: 'Targeted promotion',
    incremental_demand_pct: 6,
    contribution_impact_gbp: 120,
    evaluation_snapshot: evaluationSnapshot(6, 120)
  });
  assert(
    !afterReEvaluation.readiness_snapshot && !afterReEvaluation.frontier_snapshot,
    'A fresh evaluation drops downstream analysis computed against the previous one',
    JSON.stringify({
      readiness: afterReEvaluation.readiness_snapshot,
      frontier: afterReEvaluation.frontier_snapshot
    })
  );
  assert(
    afterReEvaluation.readiness_status === 'NOT_ASSESSED',
    'and drops the readiness verdict derived from it, rather than keeping a verdict for a superseded evaluation',
    afterReEvaluation.readiness_status
  );
  assert(
    campaignExperimentStore.listExperiments(TENANT, STALE).length === 1,
    'and re-evaluating deepens one record rather than minting a second'
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 9. Comparison supports 2, 3 and 4 experiments ---');

  const CMP = 'sess_compare';
  campaignExperimentStore.clear(TENANT, CMP);
  const e1 = preserve(CMP, {
    category: 'PRODUCE',
    audience_segment: 'PRICE_SENSITIVE',
    sales_channel: 'STORE',
    incremental_demand_pct: 18,
    contribution_impact_gbp: -400,
    readiness_status: 'REVIEW',
    decision_recommendation: 'Broad price cut'
  });
  const e2 = preserve(CMP, {
    category: 'DAIRY',
    audience_segment: 'ALL_CUSTOMERS',
    sales_channel: 'ALL_CHANNELS',
    incremental_demand_pct: 12,
    contribution_impact_gbp: 900,
    readiness_status: 'CONDITIONAL',
    decision_recommendation: 'Balanced promotion'
  });
  const e3 = preserve(CMP, {
    category: 'BAKERY',
    audience_segment: 'PREMIUM_QUALITY_LED',
    sales_channel: 'ONLINE_GROCERY',
    incremental_demand_pct: 6,
    contribution_impact_gbp: 2800,
    readiness_status: 'READY',
    decision_recommendation: 'Targeted bundle'
  });
  const e4 = preserve(CMP, {
    category: 'FROZEN',
    audience_segment: 'FAMILIES',
    sales_channel: 'MOBILE_APP',
    incremental_demand_pct: 9,
    contribution_impact_gbp: 1400,
    readiness_status: 'READY',
    decision_recommendation: 'App-led multibuy'
  });

  for (const ids of [
    [e1.experiment_id, e2.experiment_id],
    [e1.experiment_id, e2.experiment_id, e3.experiment_id],
    [e1.experiment_id, e2.experiment_id, e3.experiment_id, e4.experiment_id]
  ]) {
    const comparison = campaignExperimentStore.compareExperiments(TENANT, CMP, ids)!;
    assert(
      !!comparison && comparison.experiments.length === ids.length,
      `${ids.length}-way comparison returns ${ids.length} experiments`
    );
    assert(
      validateExperimentComparison(comparison).valid,
      `${ids.length}-way comparison validates`,
      validateExperimentComparison(comparison).errors.join('; ')
    );
    assert(
      comparison.dimensions.every(d => d.values.length === ids.length),
      `${ids.length}-way comparison carries one value per experiment on every dimension row`
    );
  }

  assert(
    campaignExperimentStore.compareExperiments(TENANT, CMP, [e1.experiment_id]) === null,
    'A single experiment is not a comparison'
  );
  const e5 = preserve(CMP, {
    category: 'AMBIENT',
    audience_segment: 'CONVENIENCE_LED',
    sales_channel: 'CLICK_AND_COLLECT',
    incremental_demand_pct: 4,
    contribution_impact_gbp: 300,
    readiness_status: 'READY',
    decision_recommendation: 'Ambient bundle'
  });
  assert(
    campaignExperimentStore.compareExperiments(TENANT, CMP, [
      e1.experiment_id,
      e2.experiment_id,
      e3.experiment_id,
      e4.experiment_id,
      e5.experiment_id
    ]) === null,
    'A fifth distinct selection is refused rather than silently truncated'
  );
  // A repeated id is collapsed, never counted as another configuration: the same record
  // resolved twice would compete with itself and inflate the compared count.
  const withDuplicate = campaignExperimentStore.compareExperiments(TENANT, CMP, [
    e1.experiment_id,
    e2.experiment_id,
    e1.experiment_id
  ])!;
  assert(
    !!withDuplicate && withDuplicate.experiments.length === 2,
    'A repeated experiment id is collapsed rather than compared against itself',
    `got ${withDuplicate?.experiments.length}`
  );
  assert(
    withDuplicate.dimensions.every(d => d.values.length === 2),
    'and the dimension rows carry one value per distinct experiment'
  );
  assert(
    MIN_COMPARISON_EXPERIMENTS === 2 && MAX_COMPARISON_EXPERIMENTS === 4,
    'The comparison bounds the UI enforces are the ones the contract declares'
  );

  const fourWay = campaignExperimentStore.compareExperiments(TENANT, CMP, [
    e1.experiment_id,
    e2.experiment_id,
    e3.experiment_id,
    e4.experiment_id
  ])!;
  const audienceRow = fourWay.dimensions.find(d => d.dimension === 'Audience')!;
  const routeRow = fourWay.dimensions.find(d => d.dimension === 'Route to customer')!;
  assert(
    audienceRow.is_focal_difference === true && routeRow.is_focal_difference === true,
    'Audience and route to customer are compared dimensions, and register as differing'
  );
  assert(
    audienceRow.values.includes('Price Sensitive') && routeRow.values.includes('Mobile App'),
    'and are rendered as display labels rather than stored ids',
    `${audienceRow.values.join('|')} / ${routeRow.values.join('|')}`
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 10. Assessment logic is evidence-based ---');

  assert(
    fourWay.synthesis.stronger_experiment_id === e3.experiment_id,
    'The strongest commercial option is the highest-contribution configuration that cleared readiness',
    `got ${fourWay.synthesis.stronger_experiment_id}`
  );
  assert(
    fourWay.synthesis.what_changed.includes('EXP-') &&
      /contribution spans/.test(fourWay.synthesis.what_changed),
    'What changed reports the spread across the whole set, not a single pair'
  );
  assert(
    (fourWay.synthesis.trade_offs || []).some(t => /sacrifices/.test(t) && /contribution/.test(t)),
    'A trade-off states both what an option gives up and what it returns',
    JSON.stringify(fourWay.synthesis.trade_offs)
  );
  assert(
    (fourWay.synthesis.watch_items || []).some(w => w.includes(e1.experiment_id)),
    'Watch items name the configuration with unresolved readiness',
    JSON.stringify(fourWay.synthesis.watch_items)
  );
  assert(
    (fourWay.synthesis.watch_items || []).some(w => /negative contribution/.test(w)),
    'and name the loss-making configuration'
  );
  assert(
    !!fourWay.synthesis.next_move && fourWay.synthesis.next_move.includes('EXP-'),
    'The next move is a concrete action naming a configuration',
    fourWay.synthesis.next_move
  );
  assert(
    (fourWay.synthesis.standings || []).length === 4 &&
      (fourWay.synthesis.standings || []).every(s => s.basis.trim().length > 0),
    'Every standing dimension states the basis for its leader'
  );

  // Commercial leader that cannot be executed must not be recommended.
  const BLOCKED = 'sess_blocked';
  campaignExperimentStore.clear(TENANT, BLOCKED);
  const richButBlocked = preserve(BLOCKED, {
    contribution_impact_gbp: 5000,
    incremental_demand_pct: 20,
    readiness_status: 'DO_NOT_PROCEED'
  });
  const modestButReady = preserve(BLOCKED, {
    contribution_impact_gbp: 500,
    incremental_demand_pct: 8,
    readiness_status: 'READY'
  });
  const blockedComparison = campaignExperimentStore.compareExperiments(TENANT, BLOCKED, [
    richButBlocked.experiment_id,
    modestButReady.experiment_id
  ])!;
  assert(
    !blockedComparison.synthesis.stronger_experiment_id,
    'A configuration the engine refused to clear is never named strongest, however profitable'
  );
  assert(
    blockedComparison.synthesis.why_it_matters.includes('not currently actionable'),
    'and the reason is stated rather than left implicit',
    blockedComparison.synthesis.why_it_matters
  );
  assert(
    blockedComparison.synthesis.lowest_execution_risk_experiment_id === modestButReady.experiment_id,
    'while the safest option is still identified separately'
  );

  // Commercial leader and safest option can be different configurations — that is the point.
  assert(
    fourWay.synthesis.lowest_execution_risk_experiment_id !== undefined ||
      fourWay.synthesis.stronger_experiment_id !== undefined,
    'A four-way comparison separates the set on at least one explainable dimension'
  );

  // A tie must not be broken arbitrarily.
  const TIE = 'sess_tie';
  campaignExperimentStore.clear(TENANT, TIE);
  const tieA = preserve(TIE, { contribution_impact_gbp: 1000, incremental_demand_pct: 10, region: 'London' });
  const tieB = preserve(TIE, { contribution_impact_gbp: 1000, incremental_demand_pct: 10, region: 'Wales' });
  const tieC = preserve(TIE, { contribution_impact_gbp: 1000, incremental_demand_pct: 10, region: 'Scotland' });
  const tied = campaignExperimentStore.compareExperiments(TENANT, TIE, [
    tieA.experiment_id,
    tieB.experiment_id,
    tieC.experiment_id
  ])!;
  assert(
    !tied.synthesis.stronger_experiment_id,
    'Equal contribution across three configurations names no commercial winner'
  );
  assert(
    tied.dimensions.find(d => d.dimension === 'Region')!.is_focal_difference === true,
    'even though the configurations genuinely differ on region'
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 11. Identical experiments produce no invented analysis ---');

  for (const count of [2, 3, 4]) {
    const key = `sess_identical_${count}`;
    campaignExperimentStore.clear(TENANT, key);
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(
        preserve(key, {
          category: 'DAIRY',
          audience_segment: 'ALL_CUSTOMERS',
          sales_channel: 'ALL_CHANNELS',
          incremental_demand_pct: 11,
          contribution_impact_gbp: 750,
          readiness_status: 'READY',
          decision_recommendation: 'Balanced promotion',
          primary_trade_off: 'Margin vs volume'
        }).experiment_id
      );
    }
    const identical = campaignExperimentStore.compareExperiments(TENANT, key, ids)!;
    assert(
      identical.synthesis.what_changed.includes('No material decision differences detected'),
      `${count} materially identical experiments report no material differences`
    );
    assert(
      !identical.synthesis.stronger_experiment_id &&
        !identical.synthesis.lowest_execution_risk_experiment_id,
      `${count}-way identical comparison names neither a winner nor a safest option`
    );
    assert(
      (identical.synthesis.trade_offs || []).length === 0 &&
        (identical.synthesis.watch_items || []).length === 0,
      `${count}-way identical comparison invents no trade-offs and no risks`
    );
    assert(
      identical.dimensions.every(d => !d.is_focal_difference),
      `${count}-way identical comparison marks no dimension as differing`
    );
  }

  // A difference in audience or route alone must still register as material.
  const SUBTLE = 'sess_subtle';
  campaignExperimentStore.clear(TENANT, SUBTLE);
  const subtleA = preserve(SUBTLE, { audience_segment: 'FAMILIES', sales_channel: 'STORE' });
  const subtleB = preserve(SUBTLE, { audience_segment: 'HIGH_VALUE', sales_channel: 'STORE' });
  const subtle = campaignExperimentStore.compareExperiments(TENANT, SUBTLE, [
    subtleA.experiment_id,
    subtleB.experiment_id
  ])!;
  assert(
    !subtle.synthesis.what_changed.includes('No material decision differences detected'),
    'Two experiments differing only in audience are NOT reported as identical'
  );
  assert(
    subtle.synthesis.what_changed.toLowerCase().includes('audience'),
    'and the audience difference is named in the narrative',
    subtle.synthesis.what_changed
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 12. Drafting assistant: authority, context and failure ---');

  const routeSource = readFileSync(
    join(REPO_ROOT, 'app', 'api', 'v1', 'campaigns', 'decision-context', 'suggest', 'route.ts'),
    'utf8'
  );
  const clientSource = readFileSync(
    join(REPO_ROOT, 'lib', 'campaign-decision-suggestion-client.ts'),
    'utf8'
  );
  const canvasSource = readFileSync(
    join(REPO_ROOT, 'components', 'CampaignDecisionCanvas.tsx'),
    'utf8'
  );

  assert(
    !/['"]use client['"]/.test(routeSource),
    'The suggestion route is server-side — it is not a client module'
  );
  assert(
    !/NEXT_PUBLIC_[A-Z_]*GEMINI|NEXT_PUBLIC_[A-Z_]*API_KEY/.test(routeSource + clientSource + canvasSource),
    'No public environment variable carries the provider key'
  );
  assert(
    !/process\.env/.test(clientSource) && !/process\.env\.GEMINI/.test(canvasSource),
    'Neither the client helper nor the canvas reads the provider key'
  );
  assert(
    !/api_?key/i.test(clientSource.replace(/\/\*[\s\S]*?\*\//g, '')),
    'The client never sends a key of its own'
  );
  assert(
    /process\.env\.GEMINI_API_KEY/.test(routeSource),
    'The route resolves the key from the server environment only'
  );

  // Provider absent: refuse, do not invent.
  const savedKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const unavailable = await suggestPOST(
    new Request('http://localhost/api/v1/campaigns/decision-context/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: TENANT,
        session_id: 'sess_ai',
        suggestion_type: 'CONTEXTUAL_FACTORS',
        context: { category: 'PRODUCE', customer_segment: 'PRICE_SENSITIVE', channel: 'STORE' }
      })
    }) as any
  );
  const unavailableBody = await unavailable.json();
  assert(unavailable.status === 503, 'An unconfigured provider returns 503, not a degraded success');
  assert(
    unavailableBody.status === 'error' && !('suggestions' in (unavailableBody.data || {})),
    'and returns no suggestions at all'
  );
  assert(
    JSON.stringify(unavailableBody).includes('GEMINI_API_KEY'),
    'and names the variable an operator must configure'
  );
  assert(
    !/AIzaSy[A-Za-z0-9_-]{20,}/.test(JSON.stringify(unavailableBody)),
    'without ever echoing a credential value'
  );
  if (savedKey !== undefined) process.env.GEMINI_API_KEY = savedKey;

  // Malformed requests are rejected before any provider call.
  const badType = await suggestPOST(
    new Request('http://localhost/api/v1/campaigns/decision-context/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: TENANT,
        session_id: 'sess_ai',
        suggestion_type: 'MAKE_THE_DECISION_FOR_ME',
        context: {}
      })
    }) as any
  );
  assert(badType.status === 400, 'An unrecognised suggestion type is refused');

  // The prompt is built from the decision as configured.
  assert(
    /category/.test(routeSource) &&
      /customer_segment/.test(routeSource) &&
      /channel/.test(routeSource) &&
      /resolveCategory|categoryLabel/.test(routeSource),
    'The prompt context includes category, segment and channel, resolved through the taxonomy'
  );
  assert(
    /existing_contextual_factors|existing_open_questions|existing_assumptions/.test(routeSource),
    'and the items already recorded, so drafts do not repeat them'
  );
  assert(
    /not instruction|data, not/.test(routeSource),
    'and recorded items are fenced as data rather than instruction'
  );

  // Authority boundary.
  assert(
    /NON_AUTHORITATIVE_DRAFT/.test(routeSource) && /GENAI_DRAFT/.test(routeSource),
    'Every draft is stamped as a non-authoritative draft'
  );
  assert(
    !/from '@\/lib\/.*store'|from '\.\.\/.*store'/.test(routeSource),
    'The suggestion route imports no store — a draft cannot be persisted by generating it'
  );
  // Grepping for three legacy identifier names only proved those three names were absent — a
  // fallback introduced under any other name passed. The invariant is structural instead. The
  // route does author sentence-shaped text (the prompt's rules and its example), so the rule is
  // not "no prose" but "no prose the response path can reach": every such array must be
  // registered in STATIC_SCAFFOLDING, which is the set validateSuggestions refuses to return.
  const scaffoldingRegistry = (routeSource.match(/const STATIC_SCAFFOLDING[\s\S]*?\n\];/) || [''])[0];
  const proseArrays = [...routeSource.matchAll(/const\s+([A-Z_][A-Z0-9_]*)[^=]*=\s*(\[[^\][]*\])/g)]
    .filter(([, , literal]) => {
      const strings = [...literal.matchAll(/'([^']{25,})'|"([^"]{25,})"/g)].map(x => x[1] || x[2]);
      return strings.filter(str => str.split(' ').length >= 4).length >= 2;
    })
    .map(([, name]) => name);
  const unregistered = proseArrays.filter(name => !scaffoldingRegistry.includes(name));
  assert(
    proseArrays.length > 0 && unregistered.length === 0,
    'Every block of route-authored prose is registered as prompt scaffolding, so none of it can be returned as a suggestion',
    unregistered.length ? `unregistered: ${unregistered.join(', ')}` : `checked: ${proseArrays.join(', ')}`
  );

  // Nothing previously asserted that the route still ran its own validator: §16 exercised the
  // extracted function directly, so deleting the call site left every assertion green while raw
  // provider output flowed to the planner. Parsed output must reach the response only through
  // validateSuggestions, so the parser's result is required to be its argument.
  const parseCalls = [...routeSource.matchAll(/parseSuggestionArray\s*\(/g)].length;
  const parseInsideValidate = [...routeSource.matchAll(/validateSuggestions\s*\(\s*[\r\n\s]*parseSuggestionArray\s*\(/g)].length;
  assert(
    parseCalls > 0 && parseCalls === parseInsideValidate,
    'Every parsed provider response reaches the caller only through validateSuggestions',
    `parsed ${parseCalls}x, validated ${parseInsideValidate}x`
  );
  assert(
    /if \(suggestions\.length === 0\)/.test(routeSource) &&
      routeSource.indexOf('if (suggestions.length === 0)') <
        routeSource.lastIndexOf('NextResponse.json({'),
    'and a response that survived validation with nothing usable is an error, not an empty success'
  );

  // The canvas keeps drafts out of governed state until accepted.
  assert(
    /suggestionState/.test(canvasSource) && /handleAcceptSuggestions/.test(canvasSource),
    'The canvas holds drafts in local state behind an explicit accept action'
  );
  assert(
    /Add selected \(/.test(canvasSource) && /AI-assisted suggestion/i.test(canvasSource),
    'and labels them as AI-assisted with an explicit add action'
  );
  assert(
    !/patchContext\([^)]*outcome\.result|patchContext\([^)]*suggestions\b/.test(canvasSource),
    'and never writes a suggestion into the intent without going through acceptance'
  );
  assert(
    /setSuggestionState\(\{\}\)/.test(canvasSource),
    'Reset clears outstanding draft suggestions'
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 13. Assistant use does not disturb experiment identity ---');

  const AI = 'sess_ai_identity';
  campaignExperimentStore.clear(TENANT, AI);
  const before = campaignExperimentStore.listExperiments(TENANT, AI).length;
  for (let i = 0; i < 3; i++) {
    await suggestPOST(
      new Request('http://localhost/api/v1/campaigns/decision-context/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: TENANT,
          session_id: AI,
          suggestion_type: 'ASSUMPTIONS',
          context: { category: 'DAIRY' }
        })
      }) as any
    );
  }
  assert(
    campaignExperimentStore.listExperiments(TENANT, AI).length === before &&
      campaignExperimentStore.getActiveExperimentId(TENANT, AI) === null,
    'Repeated suggestion requests create no experiment and claim no experiment identity'
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 14. Reset clears the decision and keeps history ---');

  const RESET = 'sess_reset';
  campaignExperimentStore.clear(TENANT, RESET);
  const kept = preserve(RESET, { category: 'PRODUCE' }, false);
  assert(
    campaignExperimentStore.getActiveExperimentId(TENANT, RESET) === kept.experiment_id,
    'A preserved decision owns its experiment identity'
  );
  campaignExperimentStore.closeActiveExperiment(TENANT, RESET);
  assert(
    campaignExperimentStore.getActiveExperimentId(TENANT, RESET) === null,
    'Starting a new decision releases that identity'
  );
  assert(
    campaignExperimentStore.listExperiments(TENANT, RESET).length === 1,
    'and preserves the historical experiment'
  );
  const next = preserve(RESET, { category: 'BAKERY' });
  assert(
    next.experiment_id !== kept.experiment_id &&
      campaignExperimentStore.listExperiments(TENANT, RESET).length === 2,
    'and the next decision earns a new experiment number'
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 15. No raw dimension vocabulary on primary surfaces ---');

  const comparisonSource = readFileSync(
    join(REPO_ROOT, 'components', 'campaign', 'ExperimentComparisonModal.tsx'),
    'utf8'
  );
  const drawerSource = readFileSync(
    join(REPO_ROOT, 'components', 'campaign', 'ExperimentHistoryDrawer.tsx'),
    'utf8'
  );

  assert(
    /categoryLabel|segmentLabel|channelLabel/.test(comparisonSource) &&
      /categoryLabel|segmentLabel|channelLabel/.test(drawerSource),
    'The comparison and history surfaces render dimensions through their display labels'
  );
  assert(
    !/\{exp\.audience_segment\}|\{exp\.sales_channel\}|\{experiment\.audience_segment\}/.test(
      comparisonSource + drawerSource
    ),
    'and never print a stored taxonomy id directly'
  );
  assert(
    !/20_percent_off/.test(canvasSource.slice(canvasSource.indexOf('placeholder='))) ||
      !/placeholder="e\.g\. 20_percent_off"/.test(canvasSource),
    'The mechanic input no longer suggests a raw engine token as example input'
  );

  // Historical review must show the reviewed decision's analysis, never the live session's.
  // Parallel `displayed*` aliases did not achieve that: they were computed and then ignored by
  // every analysis panel, which kept reading the live state hooks. The binding is now
  // structural — the live values are only reachable under their `live*` names, and no panel
  // references those — so this asserts the structure rather than any one panel.
  const renderBoundary = canvasSource.indexOf('const isHistoricalView =');
  assert(renderBoundary > 0, 'The canvas has a render boundary where historical binding is decided');
  const renderBody = canvasSource.slice(renderBoundary);
  const liveNames = [
    'liveEvaluation',
    'liveOpportunity',
    'liveReadiness',
    'liveTimeline',
    'liveFrontier',
    'liveDecisionContract',
    'liveValidityAssessment'
  ];
  const leaked = liveNames.filter(name => {
    const uses = renderBody.split(new RegExp(`\\b${name}\\b`)).length - 1;
    // One use each is the binding line itself; anything beyond that is a panel reading live state.
    return uses > 1;
  });
  assert(
    leaked.length === 0,
    'No analysis panel can reach live state while reviewing a preserved experiment',
    leaked.length ? `live state reachable via: ${leaked.join(', ')}` : undefined
  );
  assert(
    !/\bdisplayedEvaluation\b|\bdisplayedReadiness\b|\bdisplayedFrontier\b/.test(canvasSource),
    'and the abandoned displayed* aliases are gone, so there is one binding rather than two'
  );

  // The human-resolve control is where a planner commits the decision, so its option text
  // names the option. A generated play id printed alongside the label put engine vocabulary
  // into the most consequential control on the surface.
  assert(
    !/\{p\.label\}\s*\(\{p\.play_id\}\)/.test(canvasSource),
    'The chosen-option control does not print a generated play id as visible option text'
  );
  assert(
    /title=\{`play id \$\{p\.play_id\}`\}/.test(canvasSource),
    'and the play id stays reachable as provenance on the option rather than being discarded'
  );

  // Readiness conditions and vetoes are read by a planner deciding whether to proceed, so
  // they must say what to do in business terms. Several embedded the engine field they were
  // computed from ("restore contribution_delta_gbp >= 0"), which reads as a variable to set
  // rather than an action to take. The raw field stays available through each finding's
  // evidence refs and the technical-provenance disclosure.
  const readinessSource = readFileSync(join(REPO_ROOT, 'lib', 'campaign-readiness-engine.ts'), 'utf8');
  const statementLeaks: string[] = [];
  for (const m of readinessSource.matchAll(/statement:\s*[`'"]([^`'"]{5,220})[`'"]/g)) {
    for (const token of m[1].matchAll(/\b[a-z]+(?:_[a-z0-9]+)+\b/g)) {
      statementLeaks.push(token[0]);
    }
  }
  assert(
    statementLeaks.length === 0,
    'No readiness condition or veto states an engine field name to the planner',
    statementLeaks.length ? `leaked: ${[...new Set(statementLeaks)].join(', ')}` : undefined
  );

  // The CDI-06 "not measurable yet" note says what the estate must supply, not which
  // variable is unset. The raw path stays on the tooltip.
  assert(
    !/Needed before this can be measured:\{' '\}\s*\{dim\.required_authoritative_input\.field\}/.test(
      canvasSource
    ),
    'The unmeasurable-dimension note does not print a raw engine field path as visible text'
  );

  // The validity disclosure explains why no expiry date is given. It printed the engine field
  // that would have to exist ("observed_decision_validity_outcome_series") as its visible body.
  assert(
    !/\)\.field\}\s*\n\s*\{' — '\}/.test(canvasSource),
    'The validity disclosure does not print a raw engine field path as its visible body'
  );
  assert(
    /humaniseFieldPath\(/.test(canvasSource) &&
      /executiveLabel\(\s*\n?\s*'required_input_status'/.test(canvasSource),
    'and states the missing measurement and its status in planner terms instead'
  );

  // Assistant drafts keep their provenance once accepted, so a stored line can still be told
  // apart from one the planner wrote.
  const draftedIntent = createDefaultCampaignIntentDraft(TENANT, 'sess_draft_prov');
  draftedIntent.decision_context.assumptions = ['Supplier capacity holds through the window'];
  draftedIntent.decision_context.assistant_drafted_entries = [
    'Supplier capacity holds through the window'
  ];
  assert(
    isAssistantDrafted(draftedIntent.decision_context, 'Supplier capacity holds through the window') &&
      !isAssistantDrafted(draftedIntent.decision_context, 'A line the planner typed'),
    'An accepted draft is distinguishable from planner-authored context on the record'
  );
  assert(
    assistantDraftedCount(draftedIntent.decision_context) === 1,
    'and the count reflects only drafted entries still present in the decision context'
  );
  draftedIntent.decision_context.assumptions = ['Supplier capacity holds through the window, revised'];
  assert(
    assistantDraftedCount(draftedIntent.decision_context) === 0,
    'An edited line stops claiming draft provenance — once edited it is the planner\'s own'
  );

  // ─────────────────────────────────────────────────────────────────────
  console.log('\n--- 16. Suggestion response validation ---');

  // The validator is the last thing between provider output and a planner's decision record,
  // so it is exercised directly rather than inferred from the route's source.
  const noScaffolding = new Set<string>();

  const bareArray = parseSuggestionArray('["Demand may soften", "Supply may tighten"]') as
    | string[]
    | null;
  assert(
    Array.isArray(bareArray) && bareArray.length === 2 && bareArray[0] === 'Demand may soften',
    'A bare JSON array parses to its items'
  );

  const fencedArray = parseSuggestionArray(
    '```json\n["Demand may soften", "Supply may tighten"]\n```'
  ) as string[] | null;
  assert(
    Array.isArray(fencedArray) && fencedArray.length === 2 && fencedArray[1] === 'Supply may tighten',
    'An array wrapped in a markdown fence parses to the same items'
  );

  const proseArray = parseSuggestionArray(
    'Certainly. Here are the factors: ["Demand may soften", "Supply may tighten"] — tell me if you want more.'
  ) as string[] | null;
  assert(
    Array.isArray(proseArray) && proseArray.length === 2 && proseArray[0] === 'Demand may soften',
    'An array wrapped in a prose sentence is read out of the prose'
  );

  assert(
    parseSuggestionArray('I am not able to help with that request.') === null,
    'Prose carrying no array parses to null rather than to invented content'
  );

  const objectReply = parseSuggestionArray('{"suggestions": ["Demand may soften"]}');
  assert(
    typeof objectReply === 'object' && objectReply !== null && !Array.isArray(objectReply),
    'A JSON object is returned as it was parsed, never coerced into an array'
  );
  assert(
    validateSuggestions(objectReply, 'CONTEXTUAL_FACTORS', [], noScaffolding).length === 0,
    'and validation rejects it, so an object-shaped reply yields no suggestions'
  );

  assert(
    validateSuggestions('Demand may soften', 'CONTEXTUAL_FACTORS', [], noScaffolding).length === 0,
    'A non-array response yields no suggestions'
  );
  assert(
    validateSuggestions([1, 2, 3], 'CONTEXTUAL_FACTORS', [], noScaffolding).length === 0,
    'An array of numbers yields no suggestions'
  );

  const blanks = validateSuggestions(
    ['', '   ', 'Demand may soften in the second week'],
    'CONTEXTUAL_FACTORS',
    [],
    noScaffolding
  );
  assert(
    blanks.length === 1 && blanks[0] === 'Demand may soften in the second week',
    'Empty and whitespace-only items are dropped and the usable item is kept'
  );

  const overLong = 'stockcover'.repeat(21);
  assert(
    overLong.length > MAX_ITEM_CHARS &&
      validateSuggestions([overLong], 'CONTEXTUAL_FACTORS', [], noScaffolding).length === 0,
    'An item over the character cap is dropped',
    `${overLong.length} chars`
  );

  const tooManyWords = Array.from({ length: MAX_ITEM_WORDS + 1 }, () => 'demand').join(' ');
  assert(
    tooManyWords.length <= MAX_ITEM_CHARS &&
      validateSuggestions([tooManyWords], 'CONTEXTUAL_FACTORS', [], noScaffolding).length === 0,
    'An item over the word cap is dropped even when it fits the character cap',
    `${tooManyWords.split(' ').length} words`
  );

  assert(
    validateSuggestions(
      ['Demand may soften. Supply may tighten.'],
      'CONTEXTUAL_FACTORS',
      [],
      noScaffolding
    ).length === 0,
    'A multi-sentence item is dropped'
  );

  // The route has no data, so any item reading as a measured or monetary quantity is fabricated.
  assert(
    validateSuggestions(
      ['Uplift of 12% is expected in week two'],
      'CONTEXTUAL_FACTORS',
      [],
      noScaffolding
    ).length === 0,
    'An item stating a percentage is dropped'
  );
  assert(
    validateSuggestions(['Margin exposure is £3 per unit'], 'CONTEXTUAL_FACTORS', [], noScaffolding)
      .length === 0,
    'An item stating a currency figure is dropped'
  );
  assert(
    validateSuggestions(['Basket size rises by 3.4 units'], 'CONTEXTUAL_FACTORS', [], noScaffolding)
      .length === 0,
    'An item stating a decimal quantity is dropped'
  );
  assert(
    validateSuggestions(
      ['Roughly 8,450 households are in scope'],
      'CONTEXTUAL_FACTORS',
      [],
      noScaffolding
    ).length === 0,
    'An item stating a thousands-separated figure is dropped'
  );

  const horizon = validateSuggestions(
    ['Check 48-hour cover'],
    'CONTEXTUAL_FACTORS',
    [],
    noScaffolding
  );
  assert(
    horizon.length === 1 && horizon[0] === 'Check 48-hour cover',
    'A plain planning horizon survives — the figure guard does not reject every number'
  );

  const deduped = validateSuggestions(
    ['Demand may soften', 'demand may soften.', 'Demand, may soften!'],
    'CONTEXTUAL_FACTORS',
    [],
    noScaffolding
  );
  assert(
    deduped.length === 1 && deduped[0] === 'Demand may soften',
    'Items differing only in case or punctuation collapse to one'
  );

  const againstExisting = validateSuggestions(
    ['Supply chain capacity is tight', 'Demand may soften'],
    'CONTEXTUAL_FACTORS',
    ['Supply chain capacity is tight.'],
    noScaffolding
  );
  assert(
    againstExisting.length === 1 && againstExisting[0] === 'Demand may soften',
    'An item already recorded on the canvas is dropped'
  );

  const scaffoldingKeys = new Set(
    [
      'First item.',
      'You are helping a UK retail grocery planner frame a campaign decision that has not been made yet.'
    ].map(normaliseForComparison)
  );
  const echoedScaffolding = validateSuggestions(
    [
      'First item.',
      'You are helping a UK retail grocery planner frame a campaign decision that has not been made yet.',
      'Demand may soften'
    ],
    'CONTEXTUAL_FACTORS',
    [],
    scaffoldingKeys
  );
  assert(
    echoedScaffolding.length === 1 && echoedScaffolding[0] === 'Demand may soften',
    'Prompt scaffolding echoed back is dropped rather than returned as a suggestion'
  );

  assert(
    validateSuggestions(['We should confirm stock cover'], 'OPEN_QUESTIONS', [], noScaffolding)
      .length === 0,
    'OPEN_QUESTIONS drops an item that is not phrased as a question'
  );
  const questionKept = validateSuggestions(
    ['Do we have the stock cover to sustain this?'],
    'OPEN_QUESTIONS',
    [],
    noScaffolding
  );
  assert(
    questionKept.length === 1 && questionKept[0] === 'Do we have the stock cover to sustain this?',
    'and keeps one that ends in a question mark'
  );

  const sevenFactors = [
    'Demand may soften',
    'Supply may tighten',
    'Store labour is stretched',
    'Online slots are constrained',
    'Margin headroom is thin',
    'Seasonality shifts basket mix',
    'Supplier lead times may slip'
  ];
  const clamped = validateSuggestions(sevenFactors, 'CONTEXTUAL_FACTORS', [], noScaffolding);
  assert(
    clamped.length === 5 && clamped.length === TYPE_SPECS.CONTEXTUAL_FACTORS.max_count,
    'Seven usable items are clamped to the five a contextual-factor request may return',
    `${clamped.length}`
  );
  const clampedAssumptions = validateSuggestions(sevenFactors, 'ASSUMPTIONS', [], noScaffolding);
  assert(
    clampedAssumptions.length === 4 && clampedAssumptions.length === TYPE_SPECS.ASSUMPTIONS.max_count,
    'and to the four an assumptions request may return',
    `${clampedAssumptions.length}`
  );

  assert(
    validateSuggestions([], 'CONTEXTUAL_FACTORS', [], noScaffolding).length === 0,
    'An empty array yields nothing, which is what makes the route report a provider failure'
  );

  // ─────────────────────────────────────────────────────────────────────
  // Cleanup
  for (const session of [
    SNAP,
    IMM,
    STALE,
    CMP,
    BLOCKED,
    TIE,
    SUBTLE,
    AI,
    RESET,
    'sess_identical_2',
    'sess_identical_3',
    'sess_identical_4'
  ]) {
    campaignExperimentStore.clear(TENANT, session);
  }
  clearCampaignIntents();

  console.log('\n======================================================');
  console.log(` TEST SUMMARY: ${passed} passed, ${failed} failed, ${total} total`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
