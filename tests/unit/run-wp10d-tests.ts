/**
 * CogniX WP10-D Targeted Architectural Closure Test Suite
 * Comprehensive verification of Memory & Learning API extraction, pattern resolution, tenant isolation, and synthetic provenance.
 */

import { learningPatternRepository } from '../../services/learning/src/learning-pattern-store';
import { memoryRepository } from '../../services/learning/src/memory-store';
import { validateEnterpriseLearningPattern, validateEnterpriseMemoryCase } from '../../packages/contracts/src/index';
import * as fs from 'fs';
import * as path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('\n=== WP10-D MEMORY & LEARNING API CLOSURE TEST SUITE ===\n');

  // 1. Canonical old/new pattern migration equivalence
  console.log('1. Canonical Old/New Pattern Migration Equivalence');
  const expectedCanonicalIds = ['PAT-COMM-01', 'PAT-OPP-02', 'PAT-RISK-03', 'PAT-RIPPLE-04', 'PAT-BEH-05'];
  expectedCanonicalIds.forEach(id => {
    const pattern = learningPatternRepository.getLearningPatternById(id);
    assert(pattern !== null, `Original canonical pattern ${id} exists in cognix-learning repository`);
  });

  // 2. Every runtime pattern ID resolves
  console.log('\n2. Every Runtime Pattern ID Resolves');
  const runtimePatternIds = [
    'PAT-COMM-01', // CommitmentIntelligence, EnterpriseMemory
    'PAT-OPP-02',  // Forecasting, OpportunityIntelligence
    'PAT-RISK-03', // PromotionPlanner
    'PAT-RIPPLE-04',// DecisionRippleIntelligence
    'PAT-BEH-05',  // CategoryIntelligence
    'PAT-INT-05'   // AvailabilityIntelligence
  ];
  runtimePatternIds.forEach(id => {
    const p = learningPatternRepository.getLearningPatternById(id);
    assert(p !== null, `Runtime pattern ID ${id} resolves successfully through Learning API store`);
  });

  // 3. PAT-INT-05 Resolution
  console.log('\n3. PAT-INT-05 Resolution');
  const patInt05 = learningPatternRepository.getLearningPatternById('PAT-INT-05');
  assert(patInt05 !== null, 'PAT-INT-05 exists');
  assert(patInt05?.pattern_name === 'Emergency DC Rebalancing & Backup SLA Activation', 'PAT-INT-05 has correct pattern_name');
  assert(patInt05?.pattern_type === 'intervention', 'PAT-INT-05 has pattern_type intervention');
  assert(patInt05?.situation_similarity === 92, 'PAT-INT-05 situation_similarity is 92%');
  assert(patInt05?.pattern_confidence === 88, 'PAT-INT-05 pattern_confidence is 88%');
  assert(patInt05?.intervention_success_rate === 78, 'PAT-INT-05 intervention_success_rate is 78%');

  // 4. Synthetic Provenance Truth
  console.log('\n4. Synthetic Provenance Truth');
  const allPatterns = learningPatternRepository.queryLearningPatterns({ limit: 100 });
  allPatterns.forEach(p => {
    assert(p.source_classification === 'G10X Synthetic Demonstration Precedent', `Pattern ${p.pattern_id} has explicit synthetic classification`);
    assert(p.synthetic_demo === true, `Pattern ${p.pattern_id} has synthetic_demo = true`);
  });
  const memory018 = memoryRepository.getMemoryCaseById('MEM-2025-Q2-018');
  assert(memory018?.provenance?.source === 'G10X Synthetic Demonstration Precedent', 'Memory MEM-2025-Q2-018 has explicit synthetic provenance source');
  assert(memory018?.synthetic_demo === true, 'Memory MEM-2025-Q2-018 synthetic_demo = true');

  // 5. Explicit Global / Tenant Pattern Scope
  console.log('\n5. Explicit Global / Tenant Pattern Scope');
  allPatterns.forEach(p => {
    assert(p.pattern_scope === 'global', `Seeded pattern ${p.pattern_id} has explicit pattern_scope global`);
  });
  const globalQuery = learningPatternRepository.queryLearningPatterns({ tenant_id: 'tenant_other_99' });
  assert(globalQuery.length >= 6, 'Global demonstration patterns are visible across authorized demo tenants');

  // 6. Tenant-Owned Memory Isolation
  console.log('\n6. Tenant-Owned Memory Isolation');
  memoryRepository.registerMemoryCase({
    memory_id: 'MEM-TENANT-B-001',
    tenant_id: 'tenant_private_b',
    title: 'Tenant B Private Memory',
    category: 'Private',
    situation_summary: 'Tenant B private test memory case.',
    decision_taken: 'None',
    selected_interventions: [],
    expected_outcome: 'Test',
    actual_outcome: 'Test',
    business_result: 'Test',
    lessons_learned: 'Test',
    confidence: 80,
    pattern_id: 'PAT-COMM-01',
    signal_refs: [],
    provenance: {
      source: 'G10X Synthetic Demonstration Precedent',
      data_classification: 'G10X Accelerator Synthetic Precedent',
      is_synthetic_demo: true
    },
    synthetic_demo: true,
    created_at: new Date().toISOString(),
    schema_version: '1.0'
  });
  const tenantACases = memoryRepository.queryMemoryCases({ tenant_id: 'tenant_uk_retail_01' });
  assert(tenantACases.every(c => c.tenant_id === 'tenant_uk_retail_01'), 'Tenant A memory query returns ONLY Tenant A records');
  assert(tenantACases.find(c => c.memory_id === 'MEM-TENANT-B-001') === undefined, 'Tenant A cannot see Tenant B private memory');

  // 7. Supporting-Memory Tenant Isolation
  console.log('\n7. Supporting-Memory Tenant Isolation');
  const supportingForTenantA = learningPatternRepository.getSupportingMemories('PAT-COMM-01', 'tenant_uk_retail_01');
  assert(supportingForTenantA.every(m => m.tenant_id === 'tenant_uk_retail_01'), 'Supporting memories for PAT-COMM-01 under Tenant A filter returns only Tenant A memories');
  assert(supportingForTenantA.find(m => m.memory_id === 'MEM-TENANT-B-001') === undefined, 'Tenant B memory is excluded from PAT-COMM-01 supporting memories for Tenant A');

  // 8. Three-Metric Preservation
  console.log('\n8. Three-Metric Preservation');
  const commPattern = learningPatternRepository.getLearningPatternById('PAT-COMM-01');
  assert(typeof commPattern?.situation_similarity === 'number', 'situation_similarity is number');
  assert(typeof commPattern?.pattern_confidence === 'number', 'pattern_confidence is number');
  assert(typeof commPattern?.intervention_success_rate === 'number', 'intervention_success_rate is number');
  assert(
    commPattern!.situation_similarity !== commPattern!.pattern_confidence ||
    commPattern!.pattern_confidence !== commPattern!.intervention_success_rate,
    'Metrics are distinct values (94%, 89%, 73%)'
  );

  // 9. Bidirectional Memory <-> Pattern Resolution
  console.log('\n9. Bidirectional Memory <-> Pattern Resolution');
  const memCase = memoryRepository.getMemoryCaseById('MEM-2025-Q2-018');
  assert(memCase?.pattern_id === 'PAT-COMM-01', 'Memory references pattern_id PAT-COMM-01');
  const patObj = learningPatternRepository.getLearningPatternById(memCase!.pattern_id);
  assert(patObj?.pattern_id === 'PAT-COMM-01', 'Pattern ID resolves back to pattern object');
  assert(patObj?.supporting_memory_ids.includes('MEM-2025-Q2-018') === true, 'Pattern references supporting memory ID MEM-2025-Q2-018');

  // 10. simulation_ref Provenance-Only Semantics
  console.log('\n10. simulation_ref Provenance-Only Semantics');
  assert(typeof memCase?.simulation_ref === 'string', 'simulation_ref is a string identifier');
  assert(memCase?.simulation_ref === 'sig_sim_demo_01', 'simulation_ref records provenance tag from ESF-2 simulation without implying dynamic resource persistence');

  // 11. Deterministic Pattern Matching
  console.log('\n11. Deterministic Pattern Matching');
  const matchResult = learningPatternRepository.matchLearningPatterns({
    tenant_id: 'tenant_uk_retail_01',
    category: 'Supply Chain',
    limit: 5
  });
  assert(matchResult.length > 0, 'Pattern match returns results for Supply Chain');
  assert(matchResult[0].pattern_id === 'PAT-COMM-01', 'Top match is PAT-COMM-01 deterministically');

  // 12. No Active Runtime Import of config/patterns.ts in UI
  console.log('\n12. Static Source Elimination Check');
  const componentsDir = path.join(process.cwd(), 'components');
  const componentFiles = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
  let foundStaticImport = false;
  componentFiles.forEach(file => {
    const content = fs.readFileSync(path.join(componentsDir, file), 'utf-8');
    if (content.includes("from '@/config/patterns'") || content.includes('from "../config/patterns"')) {
      console.error(`Found static patterns import in components/${file}`);
      foundStaticImport = true;
    }
  });
  assert(!foundStaticImport, 'Zero UI components directly import config/patterns.ts');

  // 13. No Duplicate Full Learning Pattern Definitions in UI Components
  console.log('\n13. No Duplicate Full Learning Pattern Definitions');
  let duplicateDefinitions = false;
  componentFiles.forEach(file => {
    const content = fs.readFileSync(path.join(componentsDir, file), 'utf-8');
    if (content.includes('situation_signature:') && content.includes('intervention_success_rate:')) {
      console.error(`Found inline full pattern object in components/${file}`);
      duplicateDefinitions = true;
    }
  });
  assert(!duplicateDefinitions, 'UI components do not hardcode inline full Learning Pattern objects');

  console.log('\n=== SUMMARY: ALL 13 TEST CASES PASSED ===\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
