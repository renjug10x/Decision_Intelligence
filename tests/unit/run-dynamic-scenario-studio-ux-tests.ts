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

function main() {
  console.log('\n=== DYNAMIC SCENARIO STUDIO & SIDEBAR UX REFINEMENT ===\n');

  const sidebar = stripComments(read('components', 'Sidebar.tsx'));
  const strip = stripComments(read('components', 'ScenarioContextStrip.tsx'));
  const studio = stripComments(read('components', 'DynamicScenarioStudio.tsx'));
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
    '.dss-foundation-grid'
  ]) {
    assert(css.includes(selector), `R1: CSS defines ${selector}`);
  }

  const dssCssBlock = css.slice(css.indexOf('DYNAMIC SCENARIO STUDIO & SIDEBAR UX REFINEMENT'));
  assert(
    dssCssBlock.includes('@media (max-width: 1024px)') &&
      dssCssBlock.includes('@media (max-width: 720px)'),
    'R2: Dynamic Scenario Studio stylesheet defines 1024px and 720px responsive breakpoints'
  );

  console.log('\n====================================================');
  console.log(`DYNAMIC SCENARIO STUDIO UX: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

main();
