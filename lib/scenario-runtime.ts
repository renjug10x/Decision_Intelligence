/**
 * CogniX Scenario Runtime — the server-side scenario entry point
 * ───────────────────────────────────────────────────────────────────────────────
 * THE module a server route imports to resolve a scenario, and the one place the
 * Scenario Certification Gate is installed.
 *
 * Why this module exists rather than routes importing the registry directly
 * ------------------------------------------------------------------------
 * ADR-080 is enforced by an activation policy installed into the registry seam. A policy
 * that is only installed when something happens to import the harness is not a gate — it
 * is a gate that is open whenever nobody looked. Routing every server-side scenario
 * resolution through one module makes installation a property of reaching the scenario at
 * all, rather than something each route has to remember.
 *
 * The import below is not decoration. Importing it runs
 * `installScenarioCertificationGate()`, which installs the policy AND re-certifies the
 * scenario the registry activated at bootstrap — because the registry activates the
 * reference scenario at module load, before any policy exists, and a gate that applied only
 * to what came next would leave exactly one scenario permanently exempt. That is the
 * formality-for-newcomers failure §5 of the certification record exists to prevent.
 *
 * It throws on a scenario that does not certify. That is deliberate: a server that cannot
 * offer a certified scenario should fail loudly at start-up rather than serve an
 * uncertified one to a client.
 */

import { installScenarioCertificationGate } from './scenario-certification';
import { CANONICAL_SCENARIO_ID } from '@/packages/contracts/src/canonical-scenario-model';
import { CURATED_SCENARIO_PACK_IDS } from '@/packages/contracts/src/scenario-packs';
import { authoredScenarioOwner } from '@/lib/scenario-authoring/authored-scenario-ownership';
import {
  scenarioCatalogue as registryCatalogue,
  isScenarioRegistered as registryHas,
  resolveScenario as registryResolve,
  requireScenarioId as registryRequire,
  ScenarioResolutionError as RegistryResolutionError,
  type ScenarioRegistryEntry as RegistryEntry
} from '@/packages/contracts/src/scenario-registry';
import type { CanonicalScenario } from '@/packages/contracts/src/canonical-scenario-model';

installScenarioCertificationGate();

export {
  certifyScenario,
  certifyRegisteredScenarios,
  CERTIFICATION_HARNESS_VERSION
} from './scenario-certification';

export {
  resolveScenario,
  requireScenarioId,
  getActiveScenario,
  getActiveScenarioId,
  listRegisteredScenarios,
  isScenarioRegistered,
  scenarioCatalogue,
  toScenarioRegistryEntry,
  activateScenario,
  ScenarioResolutionError,
  type ScenarioRegistryEntry
} from '@/packages/contracts/src/scenario-registry';

export {
  certificationStateOf,
  summariseCertification,
  validateCertificationResult,
  type CertificationState,
  type CertificationVerdict,
  type ScenarioCertificationResult
} from '@/packages/contracts/src/scenario-certification-model';

// ── Tenant visibility (`SCI-07R`, ADR-085 part 4) ───────────────────────────────
/*
 * The catalogue a tenant may see, and the only resolution a tenant-scoped request may use.
 *
 * Deny by default. A scenario is visible if it is COMPILED — the reference scenario or a curated
 * pack, declared by id in the modules that own them — or if it was authored and confirmed by this
 * tenant. A registered scenario with no recorded owner is visible to no one. Invisible is reported
 * exactly as unregistered is, so a scenario id is not an existence oracle across tenants.
 *
 * This is a filter over the frozen registry, not a second registry: nothing here stores a scenario.
 */
const COMPILED_SCENARIO_IDS: ReadonlySet<string> = new Set([CANONICAL_SCENARIO_ID, ...CURATED_SCENARIO_PACK_IDS]);

/** Whether a scenario is compiled into every process (the reference scenario and the curated packs). */
export function isCompiledScenario(scenarioId: string): boolean {
  return COMPILED_SCENARIO_IDS.has(scenarioId);
}

/** Whether a registered scenario may be seen by this tenant. */
export function isScenarioVisibleToTenant(scenarioId: string, tenantId: string): boolean {
  if (!registryHas(scenarioId)) return false;
  if (isCompiledScenario(scenarioId)) return true;
  const owner = authoredScenarioOwner(scenarioId);
  return owner !== undefined && owner === tenantId;
}

/** The catalogue a selector renders for this tenant. */
export function scenarioCatalogueForTenant(tenantId: string): RegistryEntry[] {
  return registryCatalogue().filter(entry => isScenarioVisibleToTenant(entry.scenario_id, tenantId));
}

/**
 * Resolve BY NAME for a tenant. An absent id is the registry's own error. An unknown id, and an id this
 * tenant cannot see, raise the SAME error — and unlike the registry's, it does not list what IS
 * registered, because that list would name other tenants' authored scenarios.
 */
export function resolveScenarioForTenant(scenarioId: string | null | undefined, tenantId: string): CanonicalScenario {
  if (!scenarioId || !scenarioId.trim()) return registryResolve(scenarioId);
  if (!isScenarioVisibleToTenant(scenarioId, tenantId)) {
    throw new RegistryResolutionError(`Scenario "${scenarioId}" is not registered.`, scenarioId);
  }
  return registryResolve(scenarioId);
}

/**
 * `requireScenarioId` for a tenant-scoped request: a missing id is refused with the route's context
 * (ADR-077 part 4); an unknown or invisible one as `resolveScenarioForTenant` refuses it.
 */
export function requireScenarioForTenant(
  scenarioId: string | null | undefined,
  requestContext: string,
  tenantId: string
): CanonicalScenario {
  if (!scenarioId || !scenarioId.trim()) return registryRequire(scenarioId, requestContext);
  return resolveScenarioForTenant(scenarioId, tenantId);
}
