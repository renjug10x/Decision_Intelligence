/**
 * Unit Test Suite for CogniX ATL-07 Capability Lifecycle Governance & Automation
 * Run via: npx tsx tests/unit/run-atl07-tests.ts
 *
 * ATL-07 automates the question nobody was asking on a schedule: **is what the Atlas says still
 * true?** Two properties decide whether that automation is worth having.
 *
 * The first is that it cannot act. `AC-ATL-07-3` says automation flags and blocks and never promotes
 * a maturity state, and this suite asserts that structurally — no write path, no mutation, and a
 * finding type with no field capable of changing anything. A governance engine that could correct a
 * record would eventually be asked to tidy one up, and the maturity dimensions this programme spent
 * seven phases keeping honest are precisely what a tidy-up smooths over.
 *
 * The second is live-provider drift, which is here as a first-class subject rather than an appendix.
 * The `ATL-06` sequence established the case with evidence: three defects reached a credentialed run
 * before anything failed, and every fixture-backed suite stayed green through all three. Fixtures
 * prove refusal behaviour a live search cannot be made to produce on demand; they cannot prove the
 * contract still holds. The provider checks are what close that gap, and they close it without
 * needing a credential.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  GOVERNANCE_SEVERITIES, GOVERNANCE_SUBJECTS
} from '../../packages/contracts/src/atlas-governance-model';
import type { ProviderVerificationRecord } from '../../packages/contracts/src/atlas-governance-model';
import { ALL_CHECKS, isPublishable, runGovernance } from '../../lib/atlas/governance/engine';
import { RECORD_CHECKS, runRecordChecks } from '../../lib/atlas/governance/checks-record';
import { PROVIDER_CHECKS, runProviderChecks } from '../../lib/atlas/governance/checks-provider';
import { PROVIDER_VERIFICATION } from '../../config/atlas-provider-verification';
import { VERIFIED_GEMINI_MODEL } from '../../config/gemini-models';
import { capabilityRepository } from '../../services/atlas/src/capability-registry';
import type { CapabilityIdentity, CapabilityKnowledge } from '../../packages/contracts/src/capability-atlas-model';
import { CAPABILITY_REGISTRY } from '../../config/capabilities';

const ROOT = join(__dirname, '..', '..');
let passed = 0, failed = 0;
function assert(c: boolean, name: string, detail?: string) {
  if (c) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} - ${detail || 'Assertion failed'}`); failed++; }
}

const NOW = new Date('2026-08-21T00:00:00Z');
const ALWAYS = () => true;
const NEVER = () => false;
const NO_HISTORY = () => null;

function providerCtx(over: Partial<Parameters<typeof runProviderChecks>[0]> = {}) {
  return {
    record: PROVIDER_VERIFICATION,
    fileExists: ALWAYS,
    lastChangedAt: () => '2026-08-20T00:00:00Z',
    verifiedCommitDate: '2026-08-21T00:00:00Z',
    now: NOW,
    ...over
  };
}

async function run() {
  console.log('\n=== ATL-07 — Capability Lifecycle Governance & Automation ===\n');

  // ── A. Automation flags and blocks; it never promotes (AC-ATL-07-3) ──────
  const contract = readFileSync(join(ROOT, 'packages', 'contracts', 'src', 'atlas-governance-model.ts'), 'utf8');
  const findingType = contract.slice(contract.indexOf('export interface GovernanceFinding'), contract.indexOf('export interface GovernanceReport'));
  assert(!/set|apply|promote|update|write|mutate|new_state|new_status/i.test(findingType),
    'A1: GovernanceFinding has no field capable of changing anything — it reports and advises');
  assert(GOVERNANCE_SEVERITIES.length === 2 && GOVERNANCE_SEVERITIES.includes('blocking') && GOVERNANCE_SEVERITIES.includes('advisory'),
    'A2: Severity is two values, not a spectrum — a middle value is where a check goes to be ignored');
  assert(GOVERNANCE_SUBJECTS.includes('provider'),
    'A3: The live provider is a first-class governance subject, not an attribute of some capability');

  const govFiles = readdirSync(join(ROOT, 'lib', 'atlas', 'governance')).filter(f => f.endsWith('.ts'));
  const govCode = govFiles.map(f => readFileSync(join(ROOT, 'lib', 'atlas', 'governance', f), 'utf8')).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(!/writeFileSync|appendFileSync|mkdirSync|rmSync|unlinkSync/.test(govCode),
    'A4: The governance layer has NO write path — the never-promote rule is structural, not promised');
  assert(!/\.push\(|\bidentity\.\w+\s*=|knowledge\.\w+\s*=/.test(govCode.replace(/findings\.push\(|out\.push\(|records\.push\(|\w+\.push\(/g, '')),
    'A5: …and mutates no record it was given');

  const before = JSON.stringify(capabilityRepository.listIdentities());
  const identities = capabilityRepository.listIdentities();
  const corpus: { identity: CapabilityIdentity; knowledge: CapabilityKnowledge | null; demoMaturity: string | null }[] = [];
  for (const identity of identities) {
    const resolved = await capabilityRepository.resolve(identity.capability_id, { includeKnowledge: true });
    corpus.push({ identity, knowledge: resolved?.knowledge ?? null, demoMaturity: resolved?.demo_maturity ?? null });
  }
  const report = runGovernance({
    capabilities: corpus, providerRecord: PROVIDER_VERIFICATION,
    fileExists: p => existsSync(join(ROOT, p)), lastChangedAt: NO_HISTORY,
    verifiedCommitDate: null, now: NOW
  });
  assert(JSON.stringify(capabilityRepository.listIdentities()) === before,
    'A6: Running governance over the whole corpus left every record byte-identical');

  // ── B. Live-provider drift is first class (ADR-068) ──────────────────────
  assert(PROVIDER_CHECKS.length >= 4 && PROVIDER_CHECKS.every(c => c.subject === 'provider'),
    'B1: The provider has its own family of checks');
  assert(runProviderChecks(providerCtx()).length === 0,
    'B2: With the provider layer unchanged since the verified commit, there is no drift');

  const drifted = runProviderChecks(providerCtx({ lastChangedAt: () => '2026-08-22T00:00:00Z' }));
  assert(drifted.some(f => f.check_id === 'GOV-PROV-1' && /changed since/.test(f.detail)),
    'B3: A provider-layer file moving ahead of the verified commit is DRIFT — the general form of all three ATL-06 defects');
  assert(drifted.every(f => f.severity === 'advisory'),
    'B4: …reported advisory, because a change may be harmless and only a human can say so');

  const unknownHistory = runProviderChecks(providerCtx({ lastChangedAt: NO_HISTORY }));
  assert(unknownHistory.some(f => f.check_id === 'GOV-PROV-1' && /history is unavailable/.test(f.detail)),
    'B5: An unanswerable drift question is REPORTED, never treated as a pass — a shallow CI clone must not read as clean');
  assert(runProviderChecks(providerCtx({ verifiedCommitDate: null }))
    .some(f => /could not be resolved/.test(f.detail)),
    'B6: …and so is an unresolvable verified commit');

  const stale = runProviderChecks(providerCtx({ now: new Date('2027-06-01T00:00:00Z') }));
  assert(stale.some(f => f.check_id === 'GOV-PROV-2'),
    'B7: A verification beyond its currency window is flagged even when nothing in the repository changed — an external contract can move on its own');

  const missingPath = runProviderChecks(providerCtx({ fileExists: NEVER }));
  assert(missingPath.some(f => f.check_id === 'GOV-PROV-4' && f.severity === 'blocking'),
    'B8: A verification citing a file that no longer exists verifies nothing, and blocks');

  const priorModel = process.env.GEMINI_MODEL;
  process.env.GEMINI_MODEL = 'gemini-9.9-retired';
  const wrongModel = runProviderChecks(providerCtx());
  if (priorModel === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = priorModel;
  assert(wrongModel.some(f => f.check_id === 'GOV-PROV-3' && f.severity === 'blocking'),
    'B9: Configuring a model the live round trip never passed on BLOCKS — the retired-alias defect, caught before a call is made');
  assert(PROVIDER_VERIFICATION.model === VERIFIED_GEMINI_MODEL,
    'B10: The recorded verification and the governed default name the same model');
  assert(PROVIDER_VERIFICATION.contract_assumptions.length >= 6 &&
    PROVIDER_VERIFICATION.contract_assumptions.every(a => a.depends_on && a.verified_by),
    'B11: Every wire-contract assumption names the code that depends on it and how it was verified');
  assert(PROVIDER_VERIFICATION.contract_assumptions.some(a => /startIndex/.test(a.statement)) &&
    PROVIDER_VERIFICATION.contract_assumptions.some(a => /googleSearch/.test(a.statement)),
    'B12: …including the two assumptions that actually broke — the elided startIndex and the tool field name');
  assert(!JSON.stringify(PROVIDER_VERIFICATION).includes('AIza'),
    'B13: The verification record carries no credential material');

  // ── C. Record checks, and the tiers they transcribe ──────────────────────
  assert(RECORD_CHECKS.length >= 9 && RECORD_CHECKS.every(c => c.governs.length > 10),
    'C1: Every record check states the rule it serves');
  const base: CapabilityIdentity = {
    ...identities[0], capability_id: 'CAP-TEST-ONLY', lifecycle_state: 'Prototype',
    owner: 'Owner', reviewed_at: '2026-08-20'
  };
  const emptyKnowledge = { capability_id: 'CAP-TEST-ONLY' } as unknown as CapabilityKnowledge;
  const tierGap = runRecordChecks({ identity: base, knowledge: emptyKnowledge, demoMaturity: null, fileExists: ALWAYS, lastChangedAt: NO_HISTORY, now: NOW });
  assert(tierGap.some(f => f.check_id === 'GOV-REC-1' && f.severity === 'blocking'),
    'C2: A record that does not meet the tier for the lifecycle state it claims cannot be published (AC-ATL-07-2)');
  assert(Boolean(tierGap.find(f => f.check_id === 'GOV-REC-1')?.remedy.includes('Automation will not lower it for you')),
    'C3: …and the remedy says the automation will not lower the state to make the finding go away');

  const noOwner = runRecordChecks({ identity: { ...base, owner: '', reviewed_at: '' }, knowledge: emptyKnowledge, demoMaturity: null, fileExists: ALWAYS, lastChangedAt: NO_HISTORY, now: NOW });
  assert(noOwner.some(f => f.check_id === 'GOV-REC-5' && f.severity === 'blocking'),
    'C4: A record with no owner or review date is unpublishable');

  const nullLifecycle = runRecordChecks({ identity: { ...base, lifecycle_state: null }, knowledge: emptyKnowledge, demoMaturity: null, fileExists: ALWAYS, lastChangedAt: NO_HISTORY, now: NOW });
  assert(nullLifecycle.some(f => f.check_id === 'GOV-REC-6') && !nullLifecycle.some(f => f.check_id === 'GOV-REC-1'),
    'C5: A null lifecycle state is preserved honestly and reported as untestable, rather than assigned one to satisfy a check');

  const drift = runRecordChecks({
    identity: base,
    knowledge: { ...emptyKnowledge, implementation_references: [{ path: 'lib/atlas/governance/engine.ts', symbol: 'x', note: 'n' }] } as unknown as CapabilityKnowledge,
    demoMaturity: null, fileExists: ALWAYS, lastChangedAt: () => '2026-08-21T12:00:00Z', now: NOW
  });
  assert(drift.some(f => f.check_id === 'GOV-REC-3' && /changed after the record was reviewed/.test(f.detail)),
    'C6: A cited source file changing after reviewed_at is flagged (AC-ATL-07-1)');
  assert(Boolean(drift.find(f => f.check_id === 'GOV-REC-3')?.remedy.includes('Moving the date without reading')),
    'C7: …and the remedy names the one evasion this check cannot detect');

  const missingCurrent = runRecordChecks({
    identity: base,
    knowledge: { ...emptyKnowledge, implementation_references: [{ path: 'components/Gone.tsx', symbol: 'x', note: 'n' }] } as unknown as CapabilityKnowledge,
    demoMaturity: null, fileExists: NEVER, lastChangedAt: NO_HISTORY, now: NOW
  });
  assert(missingCurrent.some(f => f.check_id === 'GOV-REC-2' && f.severity === 'blocking'),
    'C8: A path claimed as CURRENT implementation that does not exist blocks publication');

  const historicalEvidence = runRecordChecks({
    identity: base,
    knowledge: { ...emptyKnowledge, validation_evidence: [{ kind: 'code', ref: 'components/Help.tsx', outcome: 'retired at ATL-04R', observed_at: '2026-08-21', observed_by: 'x' }] } as unknown as CapabilityKnowledge,
    demoMaturity: null, fileExists: NEVER, lastChangedAt: NO_HISTORY, now: NOW
  });
  assert(historicalEvidence.some(f => f.check_id === 'GOV-REC-2H' && f.severity === 'advisory') &&
    !historicalEvidence.some(f => f.check_id === 'GOV-REC-2'),
    'C9: A validation observation naming a retired surface is ADVISORY, not blocking — found by running the check against the real corpus, where it flagged a correct record');

  const staleReview = runRecordChecks({ identity: { ...base, reviewed_at: '2024-01-01' }, knowledge: emptyKnowledge, demoMaturity: null, fileExists: ALWAYS, lastChangedAt: NO_HISTORY, now: NOW });
  assert(staleReview.some(f => f.check_id === 'GOV-REC-4'),
    'C10: A record past its review window is flagged');

  const noDemo = runRecordChecks({ identity: base, knowledge: emptyKnowledge, demoMaturity: 'Production Ready', fileExists: ALWAYS, lastChangedAt: NO_HISTORY, now: NOW });
  assert(noDemo.some(f => f.check_id === 'GOV-REC-7'),
    'C11: Production-ready demonstration maturity with no Demo Path is flagged');

  const simulatedNoLimits = runRecordChecks({ identity: { ...base, implementation_status: 'simulated' }, knowledge: emptyKnowledge, demoMaturity: null, fileExists: ALWAYS, lastChangedAt: NO_HISTORY, now: NOW });
  assert(simulatedNoLimits.some(f => f.check_id === 'GOV-REC-9'),
    'C12: A non-implemented capability recording no limitation is flagged — ADR-053 has nothing to protect it with');

  const staleMarket = runRecordChecks({
    identity: base,
    knowledge: { ...emptyKnowledge, external_evidence: [{ claim: 'x', source_url: 'https://www.gartner.com/a', source_title: 't', publisher: 'Gartner', published_at: '2024-01-01', retrieved_at: '2024-01-02', retrieval_method: 'manual', confidence: 'high' }] } as unknown as CapabilityKnowledge,
    demoMaturity: null, fileExists: ALWAYS, lastChangedAt: NO_HISTORY, now: NOW
  });
  assert(staleMarket.some(f => f.check_id === 'GOV-REC-8'),
    'C13: Stale market evidence is flagged, never silently served (AC-ATL-07-4)');

  // ── D. The report, and the publication gate ─────────────────────────────
  // FM-01: the literal `38` was a snapshot and drifted the moment the corpus grew by the three CTW
  // platform capabilities. Reading the registry is the check the assertion was always making.
  assert(report.checked_capabilities === CAPABILITY_REGISTRY.length && report.checks_run.length === ALL_CHECKS.length,
    'D1: The report covers the whole corpus and names every check it ran', `${report.checked_capabilities} capabilities`);
  assert(report.findings.every(f => f.detail.length > 20 && f.remedy.length > 20),
    'D2: Every finding says what is wrong AND what to do — a finding without a remedy is a complaint');
  /*
    D3 and D4 originally read the live corpus, which at the time carried twenty blocking findings.
    That made them pass for a reason that was not the property being asserted: the moment `ATL-FINAL`
    closed the tier gaps the corpus held zero, and both assertions failed while the behaviour they
    protect was untouched. A test that only holds while the estate is broken is not protecting
    anything.

    They now construct the case instead. One record is made incomplete against a corpus that is
    otherwise sound, which proves the per-record property whatever the live corpus happens to
    contain — and keeps proving it when the corpus is clean, which is when it matters most.
  */
  const injured = corpus.map((c, i) =>
    i === 0 ? { ...c, identity: { ...c.identity, owner: '', reviewed_at: '' } } : c);
  const partial = runGovernance({
    capabilities: injured, providerRecord: PROVIDER_VERIFICATION,
    fileExists: p => existsSync(join(ROOT, p)), lastChangedAt: NO_HISTORY,
    verifiedCommitDate: null, now: NOW
  });
  assert(partial.unpublishable.length > 0 && partial.unpublishable.length < partial.checked_capabilities,
    'D3: Publication is refused per record, not corpus-wide — one incomplete record does not unpublish the other thirty-seven',
    `${partial.unpublishable.length} of ${partial.checked_capabilities}`);
  assert(!isPublishable(partial, partial.unpublishable[0]) &&
    isPublishable(partial, identities.find(i => !partial.unpublishable.includes(i.capability_id))!.capability_id),
    'D4: The publication gate answers per capability');
  assert(report.unpublishable.length === 0 && isPublishable(report, identities[0].capability_id),
    'D4b: …and with the real corpus carrying no blocking finding, every record publishes',
    `${report.unpublishable.length} unpublishable`);
  assert(report.publishable === (report.blocking === 0),
    'D5: The corpus-level verdict follows blocking findings only — advisory findings neither set nor clear it');

  // The live corpus baseline. Asserted so a regression in the records is visible as a change here.
  const live = runGovernance({
    capabilities: corpus, providerRecord: PROVIDER_VERIFICATION,
    fileExists: p => existsSync(join(ROOT, p)), lastChangedAt: NO_HISTORY,
    verifiedCommitDate: '2026-08-21T00:00:00Z', now: NOW
  });
  /*
    The first real run of this check found twenty records claiming `Prototype` while carrying no
    `assumptions` — one missing field, repeated, after seven phases in which nothing was watching.
    `ATL-FINAL` closed all twenty by authoring the premise each capability's own architecture rests
    on, read from its record rather than written to clear the check.

    D6 asserts the closure rather than the count it replaced: the historical finding is preserved in
    this comment and in the ATL-07 report, and the assertion now protects the corrected state. D7
    keeps the shape of the original finding testable — if the gap ever reopens, it must still be one
    nameable field rather than thirty-eight separate mistakes.
  */
  const tierGaps = live.findings.filter(f => f.check_id === 'GOV-REC-1');
  assert(tierGaps.length === 0,
    `D6: No record claims a lifecycle tier it does not meet; the twenty found on the first real run are closed (${tierGaps.length} open)`,
    tierGaps.length.toString());
  assert(tierGaps.every(f => /assumptions/.test(f.detail)),
    'D7: …and were any to reopen, it would be one nameable missing field rather than thirty-eight separate mistakes');
  assert(live.findings.filter(f => f.check_id === 'GOV-REC-6').length === 12,
    'D8: Twelve records carry no lifecycle state and are reported as exempt rather than quietly passing');

  // ── E. One documented command (AC-ATL-07-5) ─────────────────────────────
  const scriptPath = join(ROOT, 'scripts', 'atlas-governance-check.ts');
  assert(existsSync(scriptPath), 'E1: Checks run from one command');
  const script = readFileSync(scriptPath, 'utf8');
  assert(/--enforce/.test(script) && /Advisory mode: exiting 0/.test(script),
    'E2: …advisory by default, with --enforce as the switch — automation that blocks on day one teaches people to route around it');
  assert(/--json/.test(script),
    'E3: …and machine-readable output for a pipeline');
  assert(/log', '-1', '--format=%cI'/.test(script),
    'E4: Drift is measured from git history rather than from file mtimes, which a checkout resets');
  const ci = readFileSync(join(ROOT, '.gitlab-ci.yml'), 'utf8');
  assert(/atlas-governance-check/.test(ci),
    'E5: …and it is wired into the pipeline');
  assert(!/atlas-governance-check\.ts --enforce/.test(ci),
    'E6: …reporting, not blocking, until the outstanding families are worked down');

  // ── F. Governance ───────────────────────────────────────────────────────
  const charter = readFileSync(join(ROOT, 'docs', 'governance', 'COGNIX_CAPABILITY_ATLAS.md'), 'utf8');
  assert(/### `ATL-07` — Capability Lifecycle Governance & Automation \[COMPLETED\]/.test(charter),
    'F1: The charter records ATL-07 as delivered');
  const adrs = readFileSync(join(ROOT, 'docs', 'architecture', 'ARCHITECTURE_DECISIONS.md'), 'utf8');
  assert(/### ADR-068:/.test(adrs),
    'F2: The decision ATL-07 took is recorded as an ADR');
  assert(/fixture/i.test(adrs.slice(adrs.indexOf('### ADR-068:'))),
    'F3: …and it cites the evidence — fixture-backed suites cannot see a live contract move');
  assert(existsSync(join(ROOT, 'docs', 'reports', 'COGNIX_ATL_07_GOVERNANCE_AUTOMATION_REPORT.md')),
    'F4: The phase report exists at the path the status board cites');

  const delivered = [
    ...govFiles.map(f => join(ROOT, 'lib', 'atlas', 'governance', f)),
    scriptPath,
    join(ROOT, 'config', 'atlas-provider-verification.ts'),
    join(ROOT, 'packages', 'contracts', 'src', 'atlas-governance-model.ts')
  ].map(f => readFileSync(f, 'utf8')).join('\n');
  assert(!/claude|anthropic|generated by|co-authored/i.test(delivered),
    'F5: No assistant identity, attribution or generation marker appears in any delivered artefact');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('ATL-07 test suite failed with an error:', e); process.exit(1); });
