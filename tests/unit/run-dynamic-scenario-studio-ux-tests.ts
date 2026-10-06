/**
 * Dynamic Scenario Studio & Sidebar UX Refinement Test Suite
 *
 * Run via: npx tsx tests/unit/run-dynamic-scenario-studio-ux-tests.ts
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  STUDIO_AREAS,
  SCENARIO_PROVENANCE_FOUNDATION
} from '../../components/DynamicScenarioStudio';
import { NextRequest } from 'next/server';
import {
  createDraft,
  updateDraft,
  confirmDraft,
  openRevisionDraft,
  scenarioDraftStore,
  ScenarioAuthoringError
} from '../../lib/scenario-authoring';
import {
  activateScenario,
  deleteAuthoredScenarioForTenant,
  isScenarioVisibleToTenant,
  resolveScenario,
  scenarioCatalogueForTenant,
  ScenarioDeletionRefusedError
} from '../../lib/scenario-runtime';
import { CANONICAL_SCENARIO_ID } from '../../packages/contracts/src/index';
import { isGovernedReferenceScenario } from '../../lib/world-client';
import { decisionStateStore } from '../../lib/decision-state-store';
import { getOrCreateCampaignIntentDraft, getCampaignIntentById } from '../../lib/campaign-intent-store';
import { DELETE as deleteScenarioRoute } from '../../app/api/v1/scenarios/route';

const ROOT = join(__dirname, '..', '..');

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

async function main() {
  console.log('\n=== DYNAMIC SCENARIO STUDIO & SIDEBAR UX REFINEMENT ===\n');

  const sidebar = stripComments(read('components', 'Sidebar.tsx'));
  const strip = stripComments(read('components', 'ScenarioContextStrip.tsx'));
  const studio = stripComments(read('components', 'DynamicScenarioStudio.tsx'));
  const authoringStudio = stripComments(
    read('components', 'scenario-authoring', 'ScenarioAuthoringStudio.tsx')
  );
  const og = stripComments(read('components', 'ObservabilityGovernance.tsx'));
  const page = stripComments(read('app', 'page.tsx'));
  const css = read('app', 'globals.css');

  // ── 1. Sidebar Information Architecture & Hierarchy ────────────────────────
  const sidebarJsx = sidebar.slice(sidebar.indexOf('return ('));
  const idxBrand = sidebarJsx.indexOf('<CognixBrandLockup');
  const idxPersona = sidebarJsx.indexOf('sidebar-persona-context');
  const idxAtlas = sidebarJsx.indexOf("go('atlas')");
  const idxThisDecision = sidebarJsx.indexOf('<ScenarioContextStrip');
  const idxExperiments = sidebarJsx.indexOf('Experiments');
  const idxSolutions = sidebarJsx.indexOf('Solutions');
  const idxFooterOg = sidebarJsx.indexOf("go('settings')");

  assert(
    idxBrand > -1 &&
      idxPersona > idxBrand &&
      idxAtlas > idxPersona &&
      idxThisDecision > idxAtlas &&
      idxExperiments > idxThisDecision &&
      idxSolutions > idxExperiments &&
      idxFooterOg > idxSolutions,
    'S1: Sidebar follows target hierarchy (Brand → Innovation Exec → Capability Atlas → This decision → Experiments → Solutions → Observability & Governance)'
  );

  assert(
    !sidebar.includes('<ScenarioControls') && !/\b(?:GBP|USD|EUR)\b/.test(sidebar),
    'S2: Main sidebar no longer permanently renders currency buttons or duplicate Restart control'
  );

  assert(
    !sidebar.includes("go('architecture')") && !sidebar.includes("onNavigate('architecture')"),
    'S3: Standalone Architecture button is removed from the bottom of the main sidebar'
  );

  // ── 2. Active Decision ("This decision") Presentation & Entry ──────────────
  assert(
    strip.includes('>This decision<') && !strip.includes('THIS DECISION'),
    'D1: Active decision heading uses sentence-case "This decision"'
  );

  assert(
    strip.includes('Crosshair') && !/\b(Box|Boxes|Package|FolderTree)\b/.test(strip),
    'D2: Active decision uses a focus/target icon (Crosshair) and does not reuse Inventory or Category icons'
  );

  assert(
    strip.includes('aria-label="Change decision"') &&
      strip.includes('aria-label="Restart scenario"'),
    'D3: Change decision and Restart scenario are compact icon buttons with accessible labels'
  );

  assert(
    strip.includes('onOpenStudio?.()') &&
      sidebar.includes("onOpenStudio={() => go('scenario-studio')}") &&
      page.includes("case 'scenario-studio':"),
    'D4: Clicking the active decision opens Dynamic Scenario Studio'
  );

  assert(
    strip.includes('id="active-decision-details-popover"') &&
      strip.includes('role="tooltip"') &&
      strip.includes("label: 'Product'") &&
      strip.includes("label: 'Category'") &&
      strip.includes("label: 'Geographic scope'") &&
      strip.includes("label: 'Focus region'") &&
      strip.includes("label: 'Supplier'") &&
      strip.includes("label: 'Horizon'") &&
      strip.includes("label: 'Current scenario'"),
    'D5: Hover/focus popover exposes supported contextual fields dynamically from state'
  );

  assert(
    !/Cheddar|Fresh Dairy|Chilled Salmon|Sourdough/.test(strip) &&
      !/Cheddar|Fresh Dairy|Chilled Salmon|Sourdough/.test(studio),
    'D6: Neither ScenarioContextStrip nor DynamicScenarioStudio hardcodes demo product/category strings'
  );

  // ── 3. Dynamic Scenario Studio Workspace & Reuse of SCI-08 / SCI-10 ────────
  assert(
    existsSync(join(ROOT, 'components', 'DynamicScenarioStudio.tsx')),
    'W1: DynamicScenarioStudio component exists'
  );

  assert(
    studio.includes('Dynamic Scenario Studio') &&
      studio.includes('Explore how changing conditions could reshape this decision.'),
    'W2: Dynamic Scenario Studio renders the governed heading and supporting line'
  );

  assert(
    STUDIO_AREAS.map(a => a.id).join(',') === 'build,explore,observe,discover',
    'W3: Studio establishes the four conceptual areas: Build, Explore, Observe, Discover'
  );

  const buildArea = STUDIO_AREAS.find(a => a.id === 'build')!;
  const exploreArea = STUDIO_AREAS.find(a => a.id === 'explore')!;
  const observeArea = STUDIO_AREAS.find(a => a.id === 'observe')!;
  const discoverArea = STUDIO_AREAS.find(a => a.id === 'discover')!;

  assert(
    buildArea.implemented &&
      exploreArea.implemented &&
      !observeArea.implemented &&
      !discoverArea.implemented,
    'W4: Build and Explore are functional today; Observe and Discover are explicitly marked as architectural foundations'
  );

  assert(
    !/coming soon/i.test(studio) &&
      !/volatility has increased|emerging relationship/i.test(studio),
    'W5: Studio contains no "Coming Soon" clutter and no fabricated ML or correlation findings'
  );

  assert(
    studio.includes('<ScenarioAuthoringStudio') &&
      studio.includes('mode="inline"') &&
      !/createScenarioDraft|confirmScenarioDraft|admitCsvUpload/.test(studio),
    'W6: Dynamic Scenario Studio composes ScenarioAuthoringStudio (SCI-08 + SCI-10) inline without duplicating authoring or upload engines'
  );

  assert(
    studio.includes('btn-explore-competitive-price-response') &&
      studio.includes('Explore competitive price response') &&
      studio.includes('Test how competitive pricing could change this decision.') &&
      studio.includes("draft.inputs.situation === 'COMPETITIVE_PRICE_RESPONSE'") &&
      studio.includes('STUDIO_COMPETITIVE_WHAT_IF_HANDOFF_KEY') &&
      studio.includes("onNavigate?.('solution-promo')") &&
      studio.includes("onNavigate('solution-promo')") &&
      !studio.includes('InverseAnalysis') &&
      !/benchmark|gamma|γ/.test(studio),
    'W8: Explore card offers the competitive handoff only for a confirmed competitive situation and does not host a second What-If'
  );

  assert(
    SCENARIO_PROVENANCE_FOUNDATION.created_by_you.label === 'Created by you' &&
      SCENARIO_PROVENANCE_FOUNDATION.created_by_you.implemented === true &&
      SCENARIO_PROVENANCE_FOUNDATION.uploaded_evidence.label === 'Built from uploaded evidence' &&
      SCENARIO_PROVENANCE_FOUNDATION.uploaded_evidence.implemented === true &&
      SCENARIO_PROVENANCE_FOUNDATION.suggested_from_observations.label ===
        'Suggested from observations' &&
      SCENARIO_PROVENANCE_FOUNDATION.suggested_from_observations.implemented === false &&
      SCENARIO_PROVENANCE_FOUNDATION.derived_from_pattern.label ===
        'Derived from an emerging pattern' &&
      SCENARIO_PROVENANCE_FOUNDATION.derived_from_pattern.implemented === false,
    'W7: Provenance presentation architecture supports live sources and reserves future observation/pattern sources without fabricating active state'
  );

  // ── 4. Distinct Solution Icons ─────────────────────────────────────────────
  const solutionsBlock = sidebar.slice(
    sidebar.indexOf('Solutions'),
    sidebar.indexOf('sidebar-footer')
  );
  assert(
    solutionsBlock.includes('<Tag ') &&
      solutionsBlock.includes('<TrendingUp ') &&
      solutionsBlock.includes('<Boxes ') &&
      solutionsBlock.includes('<FolderTree '),
    'I1: Every Solution has a semantically distinct icon (Tag, TrendingUp, Boxes, FolderTree)'
  );

  // ── 5. Currency & Architecture inside Observability & Governance ───────────
  assert(
    og.includes('useCurrency') &&
      og.includes('SUPPORTED_CURRENCIES') &&
      og.includes('Display currency') &&
      og.includes('Preferences'),
    'O1: Display currency selection (GBP/USD/EUR) is relocated to Observability & Governance under Preferences'
  );

  assert(
    og.includes("id: 'architecture'") && og.includes('<CognixArchitectureSurface />'),
    'O2: Architecture remains naturally reachable inside Observability & Governance'
  );

  // ── 6. Responsive Styles ───────────────────────────────────────────────────
  for (const selector of [
    '.sidebar-persona-context',
    '.scenario-context-strip',
    '.scenario-decision-popover',
    '.og-preferences-bar',
    '.dss-page',
    '.dss-pillars',
    '.dss-workspace-grid',
    '.dss-foundation-grid',
    '.dss-row-action-btn',
    '.dss-delete-dialog'
  ]) {
    assert(css.includes(selector), `R1: CSS defines ${selector}`);
  }

  const dssCssBlock = css.slice(css.indexOf('DYNAMIC SCENARIO STUDIO & SIDEBAR UX REFINEMENT'));
  assert(
    dssCssBlock.includes('@media (max-width: 1024px)') &&
      dssCssBlock.includes('@media (max-width: 720px)'),
    'R2: Dynamic Scenario Studio stylesheet defines 1024px and 720px responsive breakpoints'
  );

  // ── 7. Scenario Catalogue Edit (Revision) & Delete Governance ──────────────
  assert(
    studio.includes('!isGovernedReferenceScenario(item.scenario_id)') &&
      studio.includes('handleEditScenario(item)') &&
      studio.includes('handleRequestDeleteScenario(item)') &&
      studio.includes('Delete “{deleteCandidate.scenario_name}”?') &&
      studio.includes('Confirm delete') &&
      authoringStudio.includes('data-testid="sci08-revision-banner"') &&
      authoringStudio.includes('Revising “{revisingTarget.targetName}”') &&
      authoringStudio.includes('Cancel revision'),
    'E1: Catalogue exposes Edit and Delete only for user-created scenarios, with revision banner in Build and confirmation dialog on Delete'
  );

  const tenantA = 'tenant_edit_delete_test_a';
  const tenantB = 'tenant_edit_delete_test_b';

  // Create & confirm Scenario A for tenantA
  const draftA1 = createDraft({
    tenant_id: tenantA,
    situation: 'COMPETITIVE_PRICE_RESPONSE',
    inputs: {
      sku_id: 'P041',
      scenario_name: 'Washing Up Liquid Competitive Test',
      promotion_intent: 'shallow_cut',
      promotion_depth_pct: 10,
      base_demand_units_per_week: 12000
    }
  });
  const confirmedA1 = confirmDraft({
    tenant_id: tenantA,
    draft_id: draftA1.draft.draft_id,
    confirm: true,
    confirmed_by: 'Category Lead A',
    expected_content_hash: draftA1.draft.content_hash
  });
  const scenarioA1Id = confirmedA1.scenario.identity.scenario_id;

  // Create & confirm Scenario B for tenantA (for isolation & inactive delete)
  const draftB = createDraft({
    tenant_id: tenantA,
    situation: 'PROMOTION_DEMAND_SURGE',
    inputs: {
      sku_id: 'P014',
      scenario_name: 'Olive Oil Surge Test',
      promotion_depth_pct: 10
    }
  });
  const confirmedB = confirmDraft({
    tenant_id: tenantA,
    draft_id: draftB.draft.draft_id,
    confirm: true,
    confirmed_by: 'Category Lead A',
    expected_content_hash: draftB.draft.content_hash
  });
  const scenarioBId = confirmedB.scenario.identity.scenario_id;

  // Create & confirm Scenario C for tenantB (for cross-tenant isolation)
  const draftC = createDraft({
    tenant_id: tenantB,
    situation: 'PROMOTION_DEMAND_SURGE',
    inputs: {
      sku_id: 'P041',
      scenario_name: 'Tenant B Washing Up Scenario',
      promotion_depth_pct: 20
    }
  });
  const confirmedC = confirmDraft({
    tenant_id: tenantB,
    draft_id: draftC.draft.draft_id,
    confirm: true,
    confirmed_by: 'Category Lead B',
    expected_content_hash: draftC.draft.content_hash
  });
  const scenarioCId = confirmedC.scenario.identity.scenario_id;

  // Open revision draft for Scenario A1
  const revDraft = openRevisionDraft(tenantA, scenarioA1Id);
  assert(
    revDraft.draft.state === 'DRAFT' &&
      revDraft.draft.draft_id !== draftA1.draft.draft_id &&
      revDraft.draft.inputs.sku_id === 'P041' &&
      revDraft.draft.inputs.scenario_name === 'Washing Up Liquid Competitive Test' &&
      revDraft.draft.inputs.promotion_depth_pct === 10 &&
      revDraft.draft.inputs.base_demand_units_per_week === 12000 &&
      resolveScenario(scenarioA1Id).economics.promotion_depth_pct === 10 &&
      resolveScenario(scenarioA1Id).demand.base_demand_units_per_week === 12000,
    'E2: openRevisionDraft opens a fresh DRAFT pre-populated with confirmed inputs without mutating the existing certified scenario'
  );

  // Update revision draft (change depth from 10% to 20%, weekly demand from 12000 to 18000, and update name) and confirm with supersedes_scenario_id
  const updatedRev = updateDraft({
    tenant_id: tenantA,
    draft_id: revDraft.draft.draft_id,
    inputs: {
      ...revDraft.draft.inputs,
      scenario_name: 'Washing Up Liquid Competitive Test (Revised)',
      promotion_intent: 'committed_cut',
      promotion_depth_pct: 20,
      base_demand_units_per_week: 18000
    }
  });
  // Before confirmation, original scenarioA1 is still in catalogue and unchanged
  assert(
    scenarioCatalogueForTenant(tenantA).some(e => e.scenario_id === scenarioA1Id) &&
      resolveScenario(scenarioA1Id).economics.promotion_depth_pct === 10 &&
      resolveScenario(scenarioA1Id).demand.base_demand_units_per_week === 12000,
    'E3a: Prior certified scenario remains visible and unmutated in catalogue before revision confirmation'
  );

  const confirmedA2 = confirmDraft({
    tenant_id: tenantA,
    draft_id: updatedRev.draft.draft_id,
    confirm: true,
    confirmed_by: 'Category Lead A',
    expected_content_hash: updatedRev.draft.content_hash,
    supersedes_scenario_id: scenarioA1Id
  });
  const scenarioA2Id = confirmedA2.scenario.identity.scenario_id;
  const catAfterRevise = scenarioCatalogueForTenant(tenantA).map(e => e.scenario_id);

  assert(
    confirmedA2.superseded_scenario_id === scenarioA1Id &&
      scenarioA2Id !== scenarioA1Id &&
      !catAfterRevise.includes(scenarioA1Id) &&
      catAfterRevise.includes(scenarioA2Id) &&
      catAfterRevise.includes(scenarioBId) &&
      resolveScenario(scenarioA2Id).economics.promotion_depth_pct === 20 &&
      resolveScenario(scenarioA2Id).demand.base_demand_units_per_week === 18000 &&
      resolveScenario(scenarioA2Id).identity.scenario_name ===
        'Washing Up Liquid Competitive Test (Revised)',
    'E3b: Confirming revision certifies the revised scenario, supersedes the prior catalogue entry, and preserves other scenarios'
  );

  // Delete inactive Scenario B
  const delB = deleteAuthoredScenarioForTenant(scenarioBId, tenantA);
  const catAfterDelB = scenarioCatalogueForTenant(tenantA).map(e => e.scenario_id);
  assert(
    delB.deleted_scenario_id === scenarioBId &&
      !catAfterDelB.includes(scenarioBId) &&
      !isScenarioVisibleToTenant(scenarioBId, tenantA) &&
      scenarioDraftStore.findByScenarioId(tenantA, scenarioBId) === undefined &&
      catAfterDelB.includes(scenarioA2Id),
    'E4: Deleting an inactive authored scenario removes it from the tenant catalogue, visibility, and draft store without affecting other scenarios'
  );

  // Activate Scenario A2, record session & campaign intent state, then delete active Scenario A2 via API route
  const sessionId = 'sess_delete_active_test';
  activateScenario(scenarioA2Id);
  decisionStateStore.switchScenarioForSession(tenantA, sessionId, scenarioA2Id, 'promotion_surge');
  const seededIntent = getOrCreateCampaignIntentDraft(tenantA, sessionId, { scenario_id: scenarioA2Id });

  const delReq = new NextRequest(
    `http://localhost/api/v1/scenarios?scenario_id=${encodeURIComponent(scenarioA2Id)}&session_id=${encodeURIComponent(sessionId)}`,
    {
      method: 'DELETE',
      headers: { 'X-Tenant-ID': tenantA }
    }
  );
  const delRes = await deleteScenarioRoute(delReq);
  const delJson = await delRes.json();
  const stateAfterDel = decisionStateStore.getCurrentStateBySession(sessionId, tenantA);

  assert(
    delRes.status === 200 &&
      delJson.status === 'success' &&
      delJson.was_active === true &&
      delJson.active_scenario_id === CANONICAL_SCENARIO_ID &&
      stateAfterDel?.scenario_id === CANONICAL_SCENARIO_ID &&
      getCampaignIntentById(seededIntent.campaign_intent_id, tenantA, sessionId) === null &&
      !scenarioCatalogueForTenant(tenantA).some(e => e.scenario_id === scenarioA2Id),
    'E5: Deleting the active authored scenario via DELETE /api/v1/scenarios returns to the default curated scenario and clears session decision & promotion state'
  );

  // Curated protection (Fresh Dairy, Chilled Fish, Premium Bakery)
  const governedIds = [
    'SCN-FRESH-DAIRY-CHEDDAR-001',
    'SCN-CHILLED-SALMON-002',
    'SCN-BAKERY-SOURDOUGH-003'
  ];
  for (const govId of governedIds) {
    assert(isGovernedReferenceScenario(govId), `E6a: ${govId} is recognised as a governed reference scenario`);
    let reviseRefused = false;
    try {
      openRevisionDraft(tenantA, govId);
    } catch (err) {
      reviseRefused = err instanceof ScenarioAuthoringError;
    }
    let deleteRefused = false;
    try {
      deleteAuthoredScenarioForTenant(govId, tenantA);
    } catch (err) {
      deleteRefused = err instanceof ScenarioDeletionRefusedError;
    }
    const govDelReq = new NextRequest(
      `http://localhost/api/v1/scenarios?scenario_id=${encodeURIComponent(govId)}`,
      { method: 'DELETE', headers: { 'X-Tenant-ID': tenantA } }
    );
    const govDelRes = await deleteScenarioRoute(govDelReq);
    assert(
      reviseRefused && deleteRefused && govDelRes.status === 403,
      `E6b: Governed scenario ${govId} is structurally protected from revision and deletion (HTTP 403)`
    );
  }

  // Tenant isolation: Tenant A cannot revise or delete Tenant B's scenarioC, and Tenant B's catalogue still has scenarioC
  let crossTenantReviseRefused = false;
  try {
    openRevisionDraft(tenantA, scenarioCId);
  } catch (err) {
    crossTenantReviseRefused = err instanceof ScenarioAuthoringError;
  }
  const crossDelReq = new NextRequest(
    `http://localhost/api/v1/scenarios?scenario_id=${encodeURIComponent(scenarioCId)}`,
    { method: 'DELETE', headers: { 'X-Tenant-ID': tenantA } }
  );
  const crossDelRes = await deleteScenarioRoute(crossDelReq);
  assert(
    crossTenantReviseRefused &&
      crossDelRes.status === 422 &&
      scenarioCatalogueForTenant(tenantB).some(e => e.scenario_id === scenarioCId),
    'E7: Tenant isolation holds — revising or deleting across tenants is refused and Tenant B scenario remains intact'
  );

  // Clean up Tenant B test scenario
  deleteAuthoredScenarioForTenant(scenarioCId, tenantB);
  activateScenario(CANONICAL_SCENARIO_ID);

  console.log('\n====================================================');
  console.log(`DYNAMIC SCENARIO STUDIO UX: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

void main();
