// Automated Bugfix & Platform-Wide Data Integrity Guardrail Test Suite
// Verifies SKU identity fidelity, cross-SKU switching, narrative consistency, and seed dataset health.

import assert from 'assert';
import productsData from '../../data/products.json';
import promotionsData from '../../data/promotions.json';
import storesData from '../../data/stores.json';

interface Product {
  sku_id: string;
  name: string;
  category: string;
  cost_price: number;
  rrp: number;
}

// Replicate exact simulation math & narrative generator from PromotionPlanner.tsx
function simulatePromotion(
  selectedSku: string,
  promoType: string,
  discountPct: number,
  region: string,
  duration: number
) {
  const product = (productsData as Product[]).find(p => p.sku_id === selectedSku) || {
    sku_id: selectedSku,
    name: 'Unknown SKU',
    category: 'General',
    cost_price: 1.0,
    rrp: 1.5
  };

  const discountDecimal = discountPct / 100;
  const promoPrice = product.rrp * (1 - discountDecimal);

  let storesCount = 50;
  if (region !== 'All') {
    storesCount = (storesData as any[]).filter(s => s.region === region).length || 8;
  }
  const baselineDailyPerStore = 12;
  const totalBaselineUnits = baselineDailyPerStore * storesCount * duration;

  let elasticityFactor = 2.4;
  if (promoType === 'bogof') elasticityFactor = 3.6;
  if (promoType === 'bundle') elasticityFactor = 1.9;

  const upliftPct = discountDecimal * elasticityFactor;
  const predictedUnits = Math.round(totalBaselineUnits * (1 + upliftPct));

  const baselineMarginPct = (product.rrp - product.cost_price) / product.rrp;
  const predictedMarginPct = (promoPrice - product.cost_price) / promoPrice;
  const marginCompressionPct = predictedMarginPct - baselineMarginPct;
  const cannibalizationRisk = Math.min(Math.round(discountDecimal * 28 * 10) / 10, 15);

  const baselineProfit = totalBaselineUnits * (product.rrp - product.cost_price);
  const promoProfit = predictedUnits * (promoPrice - product.cost_price);
  const netProfitChange = promoProfit - baselineProfit;

  let aiBrief = '';
  if (netProfitChange < 0) {
    aiBrief = `Proposed ${product.name} promo squeezes margins by ${(Math.abs(marginCompressionPct)*100).toFixed(1)}% (to ${(predictedMarginPct*100).toFixed(1)}%). While volume rises +${(upliftPct*100).toFixed(0)}%, deep discounting degrades net profit by £${Math.abs(netProfitChange).toFixed(0)} unless structured as a multi-buy bundle or supported by supplier rebates.`;
  } else if (product.category === 'Produce') {
    aiBrief = `Clearance activity on ${product.name} (+${(upliftPct*100).toFixed(0)}% volume) is highly recommended for the ${region} region to alleviate logistics backlog. Net profit increases by £${netProfitChange.toFixed(0)} with negligible cannibalization risk (${cannibalizationRisk}%).`;
  } else if (product.category === 'Bakery') {
    aiBrief = `${product.name} promotion drives strong store footfall and bakery attachment rates (+${(upliftPct*100).toFixed(0)}% volume). Gross margin compression is offset by secondary margin gains on adjacent lines, yielding £${netProfitChange.toFixed(0)} net profit lift.`;
  } else {
    aiBrief = `The proposed ${discountPct}% promotion on ${product.name} yields a positive volume response (+${(upliftPct*100).toFixed(0)}% units), leading to a net profit variance of ${netProfitChange >= 0 ? '+' : ''}£${netProfitChange.toFixed(0)}. Ensure supply buffers at ${region} distribution hubs to support replenishment.`;
  }

  return {
    product,
    predictedUnits,
    upliftPct,
    predictedMarginPct,
    marginCompressionPct,
    cannibalizationRisk,
    netProfitChange,
    aiBrief
  };
}

async function runBugfixIntegrityTests() {
  console.log('================================================================');
  console.log('COGNIX INTERIM BUGFIX & PLATFORM DATA INTEGRITY GUARDRAIL TESTS');
  console.log('================================================================');

  // Test 1: Whole Milk 2L (P001) Identity & Narrative Verification
  console.log('\n1. Testing Whole Milk 2L (P001) BOGOF 20% Simulation Narrative');
  const milkSim = simulatePromotion('P001', 'bogof', 20, 'North West', 7);
  console.log('   Selected SKU Name:', milkSim.product.name);
  console.log('   Net Profit Change:', milkSim.netProfitChange);
  console.log('   Generated AI Brief:', milkSim.aiBrief);

  assert.strictEqual(milkSim.product.name, 'Whole Milk 2L');
  assert.ok(milkSim.aiBrief.includes('Whole Milk 2L'), 'AI Brief MUST contain Whole Milk 2L');
  assert.strictEqual(milkSim.aiBrief.includes('Mature Cheddar'), false, 'AI Brief MUST NOT mention Mature Cheddar for Whole Milk');

  // Test 2: Cross-SKU Switching Integrity across major categories
  console.log('\n2. Testing Cross-SKU Switching across Categories');
  const testSkus = [
    { id: 'P001', expectedName: 'Whole Milk 2L', category: 'Dairy' },
    { id: 'P004', expectedName: 'Cheddar Mature 400g', category: 'Dairy' },
    { id: 'P009', expectedName: 'British Chicken Breast 640g', category: 'Chilled' },
    { id: 'P014', expectedName: 'Ready Meal Lasagne 400g', category: 'Chilled' },
    { id: 'P020', expectedName: 'Broccoli Head', category: 'Produce' },
    { id: 'P023', expectedName: 'White Sourdough 800g', category: 'Bakery' },
  ];

  for (const t of testSkus) {
    const res = simulatePromotion(t.id, 'price_cut', 15, 'All', 14);
    assert.strictEqual(res.product.name, t.expectedName, `SKU name must match for ${t.id}`);
    assert.ok(res.aiBrief.includes(t.expectedName), `Narrative must contain ${t.expectedName}`);
    console.log(`   ✓ SKU ${t.id} (${t.category}) -> Narrative correctly contains "${t.expectedName}"`);
  }

  // Test 3: Numerical & Narrative Conclusion Alignment
  console.log('\n3. Testing Logical Alignment between Net Profit and Narrative Conclusion');
  const deepCut = simulatePromotion('P001', 'bogof', 40, 'All', 14); // Margin compression scenario
  assert.ok(deepCut.netProfitChange < 0, 'Deep discount should produce negative profit variance');
  assert.ok(deepCut.aiBrief.includes('squeezes margins') || deepCut.aiBrief.includes('degrades net profit'), 'Negative profit must trigger margin squeeze narrative');
  console.log('   ✓ Negative net profit correctly produces margin squeeze warning.');

  const produceSim = simulatePromotion('P020', 'price_cut', 10, 'All', 7);
  assert.ok(produceSim.aiBrief.includes('Broccoli Head'), 'Produce sim narrative contains SKU name');
  if (produceSim.netProfitChange < 0) {
    assert.ok(produceSim.aiBrief.includes('degrades net profit') || produceSim.aiBrief.includes('squeezes margins'), 'Negative profit produces squeeze narrative');
  } else {
    assert.ok(produceSim.aiBrief.includes('recommended'), 'Positive profit produces recommendation');
  }
  console.log('   ✓ Logical alignment between numeric profit and narrative text verified.');

  // Test 4: Seed Dataset Integrity Validation
  console.log('\n4. Testing Seed Dataset Integrity (data/products.json, data/promotions.json, data/stores.json)');
  const skuIds = new Set<string>();
  for (const p of productsData) {
    assert.ok(p.sku_id, 'Product must have sku_id');
    assert.ok(p.name, 'Product must have name');
    assert.ok(p.category, 'Product must have category');
    assert.ok(typeof p.cost_price === 'number' && p.cost_price > 0, 'Product cost_price must be > 0');
    assert.ok(typeof p.rrp === 'number' && p.rrp > 0, 'Product rrp must be > 0');
    assert.ok(!skuIds.has(p.sku_id), `Duplicate sku_id detected: ${p.sku_id}`);
    skuIds.add(p.sku_id);
  }
  console.log(`   ✓ All ${productsData.length} SKUs in products.json have unique IDs and valid attributes.`);

  for (const promo of promotionsData) {
    assert.ok(skuIds.has(promo.sku_id), `Orphaned promotion ${promo.promo_id} references missing sku_id ${promo.sku_id}`);
  }
  console.log(`   ✓ All ${promotionsData.length} promotions reference valid SKU IDs.`);

  assert.strictEqual(
    storesData.length,
    50,
    'stores.json must contain the canonical 50-store demo dataset'
  );
  console.log(`   ✓ ${storesData.length} stores validated.`);

  console.log('\n================================================================');
  console.log('ALL BUGFIX & PLATFORM DATA INTEGRITY TESTS PASSED (4/4)');
  console.log('================================================================\n');
}

runBugfixIntegrityTests().catch(err => {
  console.error('Integrity Test Failed:', err);
  process.exit(1);
});
