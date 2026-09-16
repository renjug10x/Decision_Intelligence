/**
 * CogniX Scenario Certification (ADR-080)
 * ───────────────────────────────────────────────────────────────────────────────
 * The contract. Twelve dimensions, three verdicts, one state, and the rules that stop
 * a certification result from lying.
 *
 * Why this gate exists
 * --------------------
 * `DEMO-HARD-01` existed because three surfaces told one story on incompatible arithmetic.
 * Its defence is the cross-surface reconciliation suite, which ran 243 assertions against
 * ONE scenario. The moment a second scenario exists, that defence has a hole exactly the
 * shape of the original defect: a new scenario may create a new disconnected economic
 * universe and every existing assertion stays green, because every existing assertion is
 * about the old one.
 *
 * A curated catalogue without a generalised gate is the `DEMO-HARD-01` defect with more
 * surface area. This record is what stops that.
 *
 * The rule (ADR-080 part 1)
 * -------------------------
 *   > No scenario — curated, authored or enriched — becomes demo-active until it is certified.
 *
 * There is no override flag, no `--force`, and no "provisional" state that reaches a client
 * demonstration. Enforcement is the activation policy installed into the registry seam
 * `SCI-01` declared, so the gate is applied in ONE place rather than remembered at every
 * call site.
 *
 * What this module is NOT
 * -----------------------
 * It holds no checks. The dimension evaluators need the demand, promotion, campaign and
 * signal engines, and a contract that imported engines would invert the dependency the
 * estate is built on. The harness lives in `lib/scenario-certification.ts`; this module
 * declares what a result must look like and refuses one that does not.
 */

import { ProvenanceDescriptor, DERIVED_ENGINE_PROVENANCE } from './provenance-vocabulary';

// ── Verdicts and state ────────────────────────────────────────────────────────

/**
 * `NOT_APPLICABLE` is a DECLARED verdict with a recorded reason, and never a pass
 * (ADR-080 part 3).
 *
 * What is forbidden is the third state this estate has seen before: a check that passes
 * because the quantity it examines does not exist. `ATL-FINAL` set the precedent by
 * declaring two repository checks *unmeasured* rather than reporting a zero the route could
 * not earn. `validateCertificationResult` below is that precedent written as a rule — a
 * dimension cannot reach `PASS` without having executed at least one applicable check.
 */
export type CertificationVerdict = 'PASS' | 'FAIL' | 'NOT_APPLICABLE';

/**
 * `UNCERTIFIED` is the state of a scenario the gate has not run against. It is distinct
 * from `FAILED` on purpose: "we have not looked" and "we looked and it does not reconcile"
 * are different statements, and collapsing them is how a scenario reaches a demonstration
 * on the strength of nobody having checked.
 */
export type CertificationState = 'CERTIFIED' | 'FAILED' | 'UNCERTIFIED';

export type CertificationDimensionId =
  | 'C-1' | 'C-2' | 'C-3' | 'C-4' | 'C-5' | 'C-6'
  | 'C-7' | 'C-8' | 'C-9' | 'C-10' | 'C-11' | 'C-12';

export interface CertificationDimensionSpec {
  id: CertificationDimensionId;
  name: string;
  /** What this dimension checks, in the words of the governance record. */
  checks: string;
}

/** The twelve dimensions, verbatim from `COGNIX_SCENARIO_CERTIFICATION.md` §3. */
export const CERTIFICATION_DIMENSIONS: readonly CertificationDimensionSpec[] = [
  {
    id: 'C-1',
    name: 'Identity',
    checks:
      'Exactly one scenario_id, resolving identically through every surface. No surface resolves it '
      + 'by default. The supplier named in the economics is the supplier named in the signals.'
  },
  {
    id: 'C-2',
    name: 'Economics',
    checks:
      'Every declared value is declared once. No second basis exists for a quantity the record '
      + 'already answers. The arithmetic spine reconciles.'
  },
  {
    id: 'C-3',
    name: 'Calendar & scenario clock',
    checks:
      'Every window derives from the scenario clock. No civil-time value appears in deterministic '
      + 'scenario evidence. The promotion window matches the declared horizon, inclusive of both '
      + 'endpoints. The declared scale reconciles with the measured run rate.'
  },
  {
    id: 'C-4',
    name: 'Signals',
    checks:
      'A timeline exists and is bound to this identity. Every observation is stamped on the scenario '
      + 'clock. Provenance is populated. Determinism holds byte for byte.'
  },
  {
    id: 'C-5',
    name: 'Demand',
    checks:
      'Forecast Stability, Decision Gap, Decision Window and Decision Regret resolve from engines '
      + 'against THIS scenario\'s declared values.'
  },
  {
    id: 'C-6',
    name: 'Promotion',
    checks:
      'The elasticity curve, the causal decomposition and the demand bridge reconcile. The depth '
      + 'response agrees at every scope. Supplier funding is declared and visible.'
  },
  {
    id: 'C-7',
    name: 'Campaign Decision',
    checks:
      'The decision opens on this scenario\'s context. Readiness, frontier, contract and timeline '
      + 'resolve against it. No abstract population survives.'
  },
  {
    id: 'C-8',
    name: 'Consequences',
    checks:
      'Decision Ripple and Inventory publish pounds derived from this scenario\'s realised price and '
      + 'margin. No unanchored percentage, no baseline that exists nowhere else.'
  },
  {
    id: 'C-9',
    name: 'Currency',
    checks:
      'Every monetary value is modelled in GBP and converted once at display. Units, percentages, '
      + 'points, scores, hours, days and store counts are not converted.'
  },
  {
    id: 'C-10',
    name: 'Deterministic reset',
    checks:
      'Restart returns this scenario to its opening position exactly, field by field, including the '
      + 'signal as-at marker. The position returned to is this scenario\'s own.'
  },
  {
    id: 'C-11',
    name: 'Provenance',
    checks:
      'Every published quantity carries origin, method and authority. No value drafted by GenAI '
      + 'reaches an authoritative field. synthetic_demo is server-derived.'
  },
  {
    id: 'C-12',
    name: 'Cross-surface reconciliation',
    checks:
      'The generalised assertion set passes for this scenario. Any two surfaces publishing the same '
      + 'quantity agree.'
  }
];

export const CERTIFICATION_DIMENSION_IDS: readonly CertificationDimensionId[] =
  CERTIFICATION_DIMENSIONS.map(d => d.id);

// ── Checks and results ────────────────────────────────────────────────────────

/**
 * One executed assertion inside a dimension.
 *
 * `applicable: false` carries its OWN reason, because applicability is genuinely a
 * per-check property and pretending otherwise is how a dimension comes to pass on the
 * strength of the two checks that happened to run. A scenario that declares no observed
 * demand history has nothing to reconcile its declared scale against — that one check is
 * not applicable, while the clock and window checks beside it certainly are.
 */
export interface CertificationCheck {
  id: string;
  statement: string;
  applicable: boolean;
  passed: boolean;
  /** Required when `applicable` is false, or when `passed` is false. */
  detail: string;
}

export interface CertificationDimensionResult {
  dimension: CertificationDimensionId;
  name: string;
  verdict: CertificationVerdict;
  /** Required for `FAIL` and for `NOT_APPLICABLE`. Governance: a verdict without a reason is not a verdict. */
  reason: string;
  checks: CertificationCheck[];
}

export interface ScenarioCertificationResult {
  scenario_id: string;
  state: CertificationState;
  harness_version: string;
  /**
   * Scenario time, not civil time (ADR-078 part 1). A certification result is a statement
   * about the modelled world, so it is stamped on the clock that world runs on — which is
   * also what makes two runs of the gate byte-identical.
   */
  evaluated_at_scenario_clock: string;
  dimensions: CertificationDimensionResult[];
  /** Applicable checks actually executed. The coverage figure §6 obligation 3 protects. */
  assertion_count: number;
  failed_dimensions: CertificationDimensionId[];
  not_applicable_dimensions: CertificationDimensionId[];
  provenance: ProvenanceDescriptor;
}

export const CERTIFICATION_PROVENANCE: ProvenanceDescriptor = DERIVED_ENGINE_PROVENANCE;

// ── The rules that stop a result from lying ───────────────────────────────────

/**
 * The verdict a dimension has EARNED from its checks.
 *
 * Derived rather than declared, so a harness cannot assert `PASS` over a failing check.
 * The three outcomes, in the order they are decided:
 *
 *   any applicable check failed          → FAIL
 *   no applicable check ran at all       → NOT_APPLICABLE
 *   at least one ran and all of them passed → PASS
 *
 * The middle case is the ATL-FINAL rule: a dimension with nothing to examine declares that
 * it had nothing to examine. It does not report a pass it did not earn.
 */
export function deriveDimensionVerdict(checks: readonly CertificationCheck[]): CertificationVerdict {
  const applicable = checks.filter(c => c.applicable);
  if (applicable.some(c => !c.passed)) return 'FAIL';
  if (applicable.length === 0) return 'NOT_APPLICABLE';
  return 'PASS';
}

/**
 * The state a set of dimension results has earned.
 *
 * A `FAIL` on any dimension reduces the state absolutely (§4). A `NOT_APPLICABLE` does not
 * reduce it below `CERTIFIED` — a scenario that does not model fulfilment capacity is not
 * thereby uncertifiable; it simply says so, and the statement is visible.
 */
export function deriveCertificationState(
  dimensions: readonly CertificationDimensionResult[]
): CertificationState {
  if (dimensions.length !== CERTIFICATION_DIMENSION_IDS.length) return 'FAILED';
  if (dimensions.some(d => d.verdict === 'FAIL')) return 'FAILED';
  return 'CERTIFIED';
}

/**
 * Whether a certification result is admissible at all.
 *
 * Every rule here exists because its absence would let a result claim something it has not
 * shown. A malformed result is never a certified one: `certificationStateOf` below returns
 * `FAILED` for anything this rejects, so an invalid result cannot activate a scenario.
 */
export function validateCertificationResult(
  result: ScenarioCertificationResult
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['certification result is not an object'] };
  }
  if (!result.scenario_id || !result.scenario_id.trim()) {
    errors.push('certification result carries no scenario_id');
  }

  // Every dimension, exactly once. A result missing a dimension has not been run, not passed.
  const seen = new Set<CertificationDimensionId>();
  for (const d of result.dimensions ?? []) {
    if (!CERTIFICATION_DIMENSION_IDS.includes(d.dimension)) {
      errors.push(`unknown certification dimension: ${d.dimension}`);
      continue;
    }
    if (seen.has(d.dimension)) errors.push(`dimension ${d.dimension} reported more than once`);
    seen.add(d.dimension);

    // A verdict without a reason is not a verdict.
    if (d.verdict === 'FAIL' && !d.reason?.trim()) {
      errors.push(`${d.dimension} is FAIL with no recorded reason`);
    }
    if (d.verdict === 'NOT_APPLICABLE' && !d.reason?.trim()) {
      errors.push(
        `${d.dimension} is NOT_APPLICABLE with no recorded reason — a declared non-applicability `
        + 'must state why (ADR-080 part 3)'
      );
    }

    // Each check must justify itself where it did not run or did not pass.
    for (const c of d.checks ?? []) {
      if (!c.applicable && !c.detail?.trim()) {
        errors.push(`${d.dimension}/${c.id} is not applicable with no recorded reason`);
      }
      if (c.applicable && !c.passed && !c.detail?.trim()) {
        errors.push(`${d.dimension}/${c.id} failed with no recorded detail`);
      }
    }

    // THE rule: the verdict must be the one the checks earned, never one asserted over them.
    const earned = deriveDimensionVerdict(d.checks ?? []);
    if (earned !== d.verdict) {
      errors.push(
        `${d.dimension} reports ${d.verdict} but its checks earn ${earned} — a certification `
        + 'verdict is derived from evidence, never declared over it'
      );
    }
  }

  for (const id of CERTIFICATION_DIMENSION_IDS) {
    if (!seen.has(id)) errors.push(`dimension ${id} was not evaluated`);
  }

  const earnedState = deriveCertificationState(result.dimensions ?? []);
  if (result.state !== earnedState) {
    errors.push(`state reports ${result.state} but the dimensions earn ${earnedState}`);
  }

  const executed = (result.dimensions ?? [])
    .flatMap(d => d.checks ?? [])
    .filter(c => c.applicable).length;
  if (result.assertion_count !== executed) {
    errors.push(`assertion_count reports ${result.assertion_count} but ${executed} applicable checks ran`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * The state of a result AFTER validation.
 *
 * The one function anything gating on certification should call. A result that does not
 * validate is `FAILED` — not `CERTIFIED` with a warning, and not `UNCERTIFIED`, because a
 * malformed claim of certification is a stronger signal than no claim at all.
 */
export function certificationStateOf(result: ScenarioCertificationResult | null | undefined): CertificationState {
  if (!result) return 'UNCERTIFIED';
  return validateCertificationResult(result).valid ? result.state : 'FAILED';
}

/** A one-line summary a reader can act on, in business language. */
export function summariseCertification(result: ScenarioCertificationResult): string {
  const failed = result.failed_dimensions.length;
  const na = result.not_applicable_dimensions.length;
  if (result.state === 'CERTIFIED') {
    return na === 0
      ? `${result.scenario_id} is certified on all twelve dimensions (${result.assertion_count} checks).`
      : `${result.scenario_id} is certified: ${12 - na} dimensions pass, ${na} declared not applicable `
        + `with reasons (${result.assertion_count} checks).`;
  }
  return `${result.scenario_id} is NOT certified: ${failed} dimension${failed === 1 ? '' : 's'} failed `
    + `(${result.failed_dimensions.join(', ')}).`;
}

// ── The activation gate ───────────────────────────────────────────────────────

/**
 * Build the activation policy the registry installs (ADR-080 part 1).
 *
 * It takes a certifier rather than a stored result, so activation cannot be satisfied by a
 * certification that was true once. Every activation re-runs the gate against the scenario
 * as it is now, which is also what §8 of the certification record asks for when a shared
 * engine or contract changes.
 *
 * A certifier that throws is a refusal, not a pass. That matters more than it looks: the
 * harness calls real engines, and an engine that throws for an unfamiliar scenario is
 * precisely the case where letting activation through would be worst.
 */
export function createCertificationActivationPolicy(
  certify: (scenario: any) => ScenarioCertificationResult
): (scenario: any) => { admitted: boolean; reason: string } {
  return (scenario: any) => {
    let result: ScenarioCertificationResult;
    try {
      result = certify(scenario);
    } catch (error: any) {
      return {
        admitted: false,
        reason:
          `the certification gate could not complete for this scenario: ${error?.message ?? String(error)}. `
          + 'A scenario the gate cannot evaluate is not certified.'
      };
    }
    const state = certificationStateOf(result);
    if (state === 'CERTIFIED') {
      return { admitted: true, reason: summariseCertification(result) };
    }
    const validation = validateCertificationResult(result);
    return {
      admitted: false,
      reason: validation.valid
        ? summariseCertification(result)
        : `the certification result is not admissible: ${validation.errors.join('; ')}`
    };
  };
}
