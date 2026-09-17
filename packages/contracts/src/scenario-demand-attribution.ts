/**
 * SCI-05 — THE governed demand attribution, in one place (`R-36`)
 * ───────────────────────────────────────────────────────────────────────────────
 * What a scenario's declared `demand.movement_attribution` means, computed once and read by
 * everything that needs it.
 *
 * The defect this closes
 * ----------------------
 * The commercial-intent effect was reconstructed as `1 + promotion_depth / 100` in **two
 * independent places**:
 *
 *   `lib/demand-forecast.ts`                     applied it to the model's forward expectation
 *   `lib/demand-decision-frontier/…-engine.ts`   divided it back out to recover the baseline
 *
 * Neither read the scenario. Both agreed with the reference scenario because both had been
 * calibrated against it, and the defect only became visible when the second and third scenarios
 * arrived:
 *
 *   Fresh Dairy     declares 19.6pp   ·  reconstructed 19.6pp   (agreed, by calibration)
 *   Chilled Salmon  declares 20.9pp   ·  reconstructed  9.6pp
 *   Premium Bakery  declares  7.7pp   ·  reconstructed  9.6pp
 *
 * Fixing only the first would have been worse than fixing neither: the projection would have
 * applied the declared contribution while the frontier divided out a generic one, and the
 * difference between two wrong halves would have surfaced as the promotion attribution. That is
 * why this is a MODULE and not two edits — the architectural goal is one governed attribution
 * source, not another calculation seam.
 *
 * Why the record is the authority
 * -------------------------------
 * `demand.movement_attribution` is the declaration the Scenario Certification Gate reconciles
 * `C-5` against, and ADR-073 Amendment A's rule is that *no surface derives a second basis for a
 * quantity the record already answers*. The contribution of commercial intent is a quantity the
 * record answers. This reads it.
 *
 * Nothing here is a new model. There is no elasticity assumption, no calibration constant, and no
 * fallback that invents a number where the record is silent.
 */

import { CanonicalScenario, scenarioDepthResponsePp } from './canonical-scenario-model';
import { scenarioInScope } from './scenario-scope';

/** Percentage points the record attributes to one driver class. */
function declaredPp(
  scenario: CanonicalScenario,
  driverClass: 'COMMERCIAL_INTENT' | 'OBSERVED_BEHAVIOUR' | 'UNDERLYING_TREND'
): number {
  return scenario.demand.movement_attribution
    .filter(a => a.driver_class === driverClass)
    .reduce((sum, a) => sum + a.contribution_pp, 0);
}

/** What the record attributes to the committed commercial intervention. */
export function scenarioCommercialIntentDeclaredPp(scenario: CanonicalScenario): number {
  return declaredPp(scenario, 'COMMERCIAL_INTENT');
}

/** What the record attributes to underlying trend — movement present before any intervention. */
export function scenarioUnderlyingTrendDeclaredPp(scenario: CanonicalScenario): number {
  return declaredPp(scenario, 'UNDERLYING_TREND');
}

/** What the record attributes to observed customer behaviour. */
export function scenarioObservedBehaviourDeclaredPp(scenario: CanonicalScenario): number {
  return declaredPp(scenario, 'OBSERVED_BEHAVIOUR');
}

/**
 * The commercial-intent contribution AT A GIVEN DEPTH, in percentage points of the un-promoted base.
 *
 * At the scenario's committed depth this is the declared contribution, to the digit — the record
 * is the answer and nothing recomputes it.
 *
 * Away from it — a reader moving the depth control — it is scaled by the ratio of the scenario's
 * OWN declared depth responses. `scenarioDepthResponsePp` is the same hardened curve the Promotion
 * surface plots and the gate evaluates `C-6` with, including the scenario's declared depth-response
 * anomalies, so the scale comes from the record rather than from a generic elasticity. At zero
 * depth it is zero, because a promotion that is not running contributes nothing.
 */
export function scenarioCommercialIntentPp(scenario: CanonicalScenario, depthPct: number): number {
  const declared = scenarioCommercialIntentDeclaredPp(scenario);
  const committedDepth = scenario.economics.promotion_depth_pct;
  if (depthPct === committedDepth) return declared;
  if (depthPct === 0) return 0;

  const atCommitted = scenarioDepthResponsePp(scenario, committedDepth);
  if (atCommitted === 0) return 0;
  return declared * (scenarioDepthResponsePp(scenario, depthPct) / atCommitted);
}

/**
 * THE multiplier that carries commercial intent, applied to and divided out of the model's own
 * forward expectation.
 *
 * Both sides of the seam call THIS. The projection multiplies by it; the frontier divides by it to
 * recover the baseline. Because it is one function, the two cannot disagree — which is the whole
 * point, and is what `1 + depth / 100` in two files could never guarantee.
 *
 * The declared contribution is stated against the UN-PROMOTED base, while this multiplies a forward
 * expectation that already carries the scenario's declared underlying trend (`SCI-03R` put that
 * trend into the history the model fits). Dividing by the trend basis converts between the two, so
 * what the surface finally attributes to the promotion is what the record declares.
 *
 * For the reference scenario this returns exactly `1.2`, the value the retired generic factor
 * produced — not by exemption but because 19.6pp against −2.0pp is 0.2 exactly. The record was
 * authored coherently, and that is why its protected figures are untouched.
 */
export function scenarioCommercialIntentFactor(scenario: CanonicalScenario, depthPct: number): number {
  const trendBasis = 1 + scenarioUnderlyingTrendDeclaredPp(scenario) / 100;
  const contributionPp = scenarioCommercialIntentPp(scenario, depthPct);
  return trendBasis !== 0
    ? 1 + (contributionPp / 100) / trendBasis
    : 1 + contributionPp / 100;
}

/**
 * THE multiplier that carries the declared UNDERLYING TREND, for a scenario whose trend is
 * DECLARED rather than observed.
 *
 * `R-39`. The record's arithmetic spine states every driver as a movement of the un-promoted base
 * across the horizon:
 *
 *   expected_demand_units = base_demand_units x (1 + total_demand_movement_pct / 100)
 *
 * and `movement_attribution` decomposes that total into the three driver classes. So the underlying
 * trend is a FORWARD movement from the base, in the same sense and on the same basis as the
 * commercial intent beside it — not a historical slope.
 *
 * `SCI-03R` implemented it as a slope instead: the declared trend was injected backwards into the
 * modelled history so the statistical model would *pick it up*. That was a reasonable instinct and
 * it cannot work, for two measured reasons:
 *
 *   the borrowed shape carries its own drift   the category series a modelled history borrows its
 *                                              weekday rhythm from has local drift of its own —
 *                                              −0.17%/day over the salmon pack's window against a
 *                                              declared −0.179%/day, so the history carried roughly
 *                                              twice its declared trend
 *   an estimated model damps what it is given  Holt-Winters fits its own level and trend by
 *                                              minimising one-step error. Extrapolating the salmon
 *                                              pack's history linearly gives −4.98pp; the fitted
 *                                              model returns −1.60pp
 *
 * A declared quantity round-tripped through an estimated model comes back as the model's damping,
 * not as the declaration, and the amount depends on the borrowed shape and the horizon. That is
 * `R-39`. The trend is therefore applied where the record states it — forward of the clock, against
 * the base — exactly as `scenarioCommercialIntentFactor` applies the declared commercial intent.
 *
 * Composition. `scenarioCommercialIntentFactor` divides by this same trend basis, so:
 *
 *   base x trendFactor x commercialIntentFactor
 *     = base x (1 + trend/100) x (1 + (intent/100) / (1 + trend/100))
 *     = base x (1 + trend/100 + intent/100)
 *
 * which is the record's own additive decomposition, to the digit. The evidence revision then
 * carries the third driver (`R-37`). Nothing is calibrated and no factor is fitted: every number
 * here is read from `movement_attribution`.
 *
 * WHERE IT APPLIES. A trend is declared only where nothing observed it. Where the estate holds
 * history for the scenario's own window, the trend is IN that evidence, the fitted model measures
 * it, and the record describes what was measured — the reference scenario realises −1.96pp against
 * a declared −2.0pp on its own observed history, and applying this factor on top of that would
 * count the same movement twice. The caller decides on EVIDENCE COVERAGE, never on identity.
 */
export function scenarioUnderlyingTrendFactor(scenario: CanonicalScenario): number {
  return 1 + scenarioUnderlyingTrendDeclaredPp(scenario) / 100;
}

/** The trend factor for the scenario the current computation is for (layer C). */
export function inScopeUnderlyingTrendFactor(): number {
  return scenarioUnderlyingTrendFactor(scenarioInScope());
}

/** The factor for the scenario the current computation is for (layer C). */
export function inScopeCommercialIntentFactor(depthPct: number): number {
  return scenarioCommercialIntentFactor(scenarioInScope(), depthPct);
}

/** The contribution for the scenario the current computation is for (layer C). */
export function inScopeCommercialIntentPp(depthPct: number): number {
  return scenarioCommercialIntentPp(scenarioInScope(), depthPct);
}
