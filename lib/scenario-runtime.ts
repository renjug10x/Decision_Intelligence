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
