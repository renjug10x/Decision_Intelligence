/**
 * CogniX Scenario Scope — the scenario a computation is FOR (ADR-077, R-27)
 * ───────────────────────────────────────────────────────────────────────────────
 * `SCI-01` parameterised the CONTRACT and left the ENGINES bound to the reference
 * instance. `SCI-02` certified that gap rather than hiding it: every engine probe in the
 * harness reads a surface that answers with `SCN-FRESH-DAIRY-CHEDDAR-001`'s economics
 * whatever scenario is being certified, so a second scenario fails C-5 through C-8 with
 * the divergence named. That finding is R-27, and this module is its resolution.
 *
 * The third layer
 * ---------------
 * The derivation stack now has three layers, and each answers a different question:
 *
 *   layer A  `scenarioX(scenario, …)`   THE MODEL. A pure function of a scenario.
 *   layer B  `canonicalX(…)`            THE PROTECTED REFERENCE. Layer A bound to
 *                                       `CANONICAL_SCENARIO` by name, at one place per
 *                                       quantity. Instance-specific tests read this.
 *   layer C  `inScopeX(…)`              WHAT ENGINES READ. Layer A bound to whichever
 *                                       certified scenario the current computation is for.
 *
 * Layer B is untouched and stays untouched. It is how the protected journey's own digits
 * are asserted, and an engine that has moved to layer C still resolves to exactly those
 * digits whenever the reference scenario is the one in scope — which is what makes this a
 * parameterisation rather than a rewrite.
 *
 * Why a binding rather than a parameter on every engine
 * ----------------------------------------------------
 * The alternative is to thread a `scenario` argument through `deriveUnitEconomics`,
 * `calculateDerivedImpacts`, `evaluateCampaignDecision` and everything downstream of them.
 * That pushes the question *"which scenario is this?"* into every caller including every
 * React surface, which is precisely the decision `SCI-04` owns and has not made yet. Worse,
 * it gives each caller the opportunity to answer differently — the `SCN-PROMO-01` defect
 * ADR-077 was written against, arriving through a parameter instead of a literal.
 *
 * One seam, resolved once, is the same discipline the registry already applies to identity.
 *
 * What `scenarioInScope()` answers
 * --------------------------------
 * *Which certified scenario is this computation for?* Normally that is the demo-active
 * scenario, read straight from the registry — so an engine is *engine + active certified
 * scenario* with no branch in it, and nothing anywhere asks *if scenario A … if scenario B*.
 * A caller that must evaluate a NAMED scenario that is not the demo-active one binds it for
 * the duration of a synchronous computation.
 *
 * There are exactly two such callers, and both are governed:
 *
 *   1. The certification harness. It cannot activate the scenario it is certifying —
 *      ADR-080 gates activation ON certification — so binding is the only way its engine
 *      probes can measure the right scenario. Binding grants no activation and no
 *      admission; it only says which record the arithmetic reads.
 *   2. A request that names a scenario (`requireScenarioId`). It evaluates that scenario
 *      without changing what the estate is running for anyone else.
 *
 * Why the binding is synchronous, and enforced
 * --------------------------------------------
 * A module-level binding is safe across a request only if nothing can interleave inside it.
 * Every derivation below is a pure synchronous calculation, so a synchronous callback on a
 * single-threaded event loop cannot interleave. An `async` callback CAN, and would leak one
 * scenario's binding into another's computation — a defect of exactly the shape this module
 * exists to close. `withScenarioInScope` therefore refuses a callback that returns a
 * thenable rather than trusting a comment to prevent it.
 *
 * `AsyncLocalStorage` would lift that restriction and is deliberately not used: this package
 * is imported by client surfaces as well as by the server, and a Node-only primitive in a
 * contracts module is a runtime dependency the contract should not carry.
 */

import {
  CanonicalScenario,
  scenarioBaseDemandUnits,
  scenarioExpectedDemandUnits,
  scenarioServableDemandUnits,
  scenarioExposedDemandUnits,
  scenarioFlexCapacityUnits,
  scenarioRealisedRevenuePerUnitGbp,
  scenarioGrossMarginPerUnitGbp,
  scenarioImpliedUnitCostGbp,
  scenarioPromotedPriceGbp,
  scenarioContributionPerUnitAtListGbp,
  scenarioRetailerFundedShare,
  scenarioContributionErosionPerDepthPoint,
  scenarioContributionAtDepthGbp,
  scenarioRevenueExposureGbp,
  scenarioMarginExposureGbp,
  scenarioBaseRunRatePerDay,
  scenarioStoreCoverDays,
  scenarioNetworkCoverDays,
  scenarioStoreCount,
  scenarioScopeLabel,
  scenarioWeeklyPopulationUnits,
  scenarioScopeResponseMultiplier,
  scenarioDepthResponseAnomalyPp,
  scenarioDepthResponsePp,
  scenarioClockNowIso,
  scenarioClockDateIso,
  scenarioPromotionWindow
} from './canonical-scenario-model';
import { getActiveScenario, ScenarioResolutionError } from './scenario-registry';

// ── The binding ───────────────────────────────────────────────────────────────

let boundScenario: CanonicalScenario | null = null;

/**
 * The scenario the current computation is for.
 *
 * The bound scenario where a binding is in force; otherwise the demo-active scenario.
 * Raises through the registry where neither exists — ADR-077 part 4 holds here exactly as
 * it holds at a route: a missing scenario is an error, never a default.
 */
export function scenarioInScope(): CanonicalScenario {
  return boundScenario ?? getActiveScenario();
}

/** The identity of the scenario in scope. */
export function scenarioInScopeId(): string {
  return scenarioInScope().identity.scenario_id;
}

/**
 * Whether a binding is currently in force.
 *
 * Published so a surface can state that it is reading a scenario OTHER than the demo-active
 * one, rather than leaving a reader to assume it is not.
 */
export function isScenarioBound(): boolean {
  return boundScenario !== null;
}

/**
 * Run a synchronous computation with `scenario` in scope.
 *
 * Re-entrant: a nested binding restores its parent, not the registry. Restores on the way
 * out of a throw as well as a return, because a harness that leaves a failed scenario bound
 * would poison every computation after it.
 */
export function withScenarioInScope<T>(scenario: CanonicalScenario, fn: () => T): T {
  if (!scenario?.identity?.scenario_id) {
    throw new ScenarioResolutionError(
      'A scenario must carry a scenario_id to be brought into scope.'
    );
  }
  const previous = boundScenario;
  boundScenario = scenario;
  let result: T;
  try {
    result = fn();
  } finally {
    boundScenario = previous;
  }
  if (result && typeof (result as unknown as PromiseLike<unknown>)?.then === 'function') {
    throw new ScenarioResolutionError(
      'withScenarioInScope is synchronous by contract and was given a callback that returned '
      + 'a thenable. The binding is released before that work runs, so it would read whichever '
      + 'scenario happened to be in scope later. Resolve the scenario first, then bind.'
    );
  }
  return result;
}

/** Release any binding. Test-support only; production code uses `withScenarioInScope`. */
export function resetScenarioScope(): void {
  boundScenario = null;
}

// ── Derivations, layer C: the SCENARIO IN SCOPE ───────────────────────────────
// Each accessor binds layer A to `scenarioInScope()` at exactly one place per quantity,
// mirroring layer B one for one. An engine reads these; nothing here names a scenario.

export function inScopeBaseDemandUnits(horizonDays?: number): number {
  return scenarioBaseDemandUnits(scenarioInScope(), horizonDays);
}

export function inScopeExpectedDemandUnits(horizonDays?: number): number {
  return scenarioExpectedDemandUnits(scenarioInScope(), horizonDays);
}

export function inScopeServableDemandUnits(horizonDays?: number): number {
  return scenarioServableDemandUnits(scenarioInScope(), horizonDays);
}

export function inScopeExposedDemandUnits(horizonDays?: number): number {
  return scenarioExposedDemandUnits(scenarioInScope(), horizonDays);
}

export function inScopeFlexCapacityUnits(horizonDays?: number): number {
  return scenarioFlexCapacityUnits(scenarioInScope(), horizonDays);
}

export function inScopeRealisedRevenuePerUnitGbp(): number {
  return scenarioRealisedRevenuePerUnitGbp(scenarioInScope());
}

export function inScopeGrossMarginPerUnitGbp(): number {
  return scenarioGrossMarginPerUnitGbp(scenarioInScope());
}

export function inScopeImpliedUnitCostGbp(): number {
  return scenarioImpliedUnitCostGbp(scenarioInScope());
}

export function inScopePromotedPriceGbp(): number {
  return scenarioPromotedPriceGbp(scenarioInScope());
}

export function inScopeContributionPerUnitAtListGbp(): number {
  return scenarioContributionPerUnitAtListGbp(scenarioInScope());
}

export function inScopeRetailerFundedShare(): number {
  return scenarioRetailerFundedShare(scenarioInScope());
}

export function inScopeContributionErosionPerDepthPoint(): number {
  return scenarioContributionErosionPerDepthPoint(scenarioInScope());
}

export function inScopeContributionAtDepthGbp(
  depthPct: number,
  listPriceGbp?: number,
  unitCostGbp?: number
): number {
  return scenarioContributionAtDepthGbp(scenarioInScope(), depthPct, listPriceGbp, unitCostGbp);
}

export function inScopeRevenueExposureGbp(horizonDays?: number): number {
  return scenarioRevenueExposureGbp(scenarioInScope(), horizonDays);
}

export function inScopeMarginExposureGbp(horizonDays?: number): number {
  return scenarioMarginExposureGbp(scenarioInScope(), horizonDays);
}

export function inScopeBaseRunRatePerDay(): number {
  return scenarioBaseRunRatePerDay(scenarioInScope());
}

export function inScopeStoreCoverDays(): number {
  return scenarioStoreCoverDays(scenarioInScope());
}

export function inScopeNetworkCoverDays(): number {
  return scenarioNetworkCoverDays(scenarioInScope());
}

export function inScopeStoreCount(scope: string): number {
  return scenarioStoreCount(scenarioInScope(), scope);
}

export function inScopeScopeLabel(scope: string): string {
  return scenarioScopeLabel(scenarioInScope(), scope);
}

export function inScopeWeeklyPopulationUnits(): number {
  return scenarioWeeklyPopulationUnits(scenarioInScope());
}

export function inScopeScopeResponseMultiplier(scope: string): number {
  return scenarioScopeResponseMultiplier(scenarioInScope(), scope);
}

export function inScopeDepthResponseAnomalyPp(depthPct: number): number {
  return scenarioDepthResponseAnomalyPp(scenarioInScope(), depthPct);
}

export function inScopeDepthResponsePp(depthPct: number, scope?: string): number {
  return scenarioDepthResponsePp(scenarioInScope(), depthPct, scope);
}

export function inScopeScenarioNowIso(): string {
  return scenarioClockNowIso(scenarioInScope());
}

export function inScopeScenarioDateIso(daysAfterNow: number): string {
  return scenarioClockDateIso(scenarioInScope(), daysAfterNow);
}

export function inScopePromotionWindow(): { start_iso: string; end_iso: string } {
  return scenarioPromotionWindow(scenarioInScope());
}
