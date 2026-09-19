/**
 * Decision-case coherence for an authored scenario (`SCI-07`)
 * ───────────────────────────────────────────────────────────────────────────────
 * What makes a set of inputs a DECISION rather than merely a well-formed record.
 *
 * Why this is not a second certification gate
 * -------------------------------------------
 * The Scenario Certification Gate is and remains the authority on whether a scenario may be
 * shown (ADR-080), and nothing here weakens, anticipates or shadows its verdict. These checks
 * answer a different question, in the authoring domain, in business language: *does this
 * scenario contain a decision at all?*
 *
 * The distinction is visible in what each one says. The gate says `C-5.5 FAIL — 0 exposed of
 * 700000 base`. This says *"the operation can already serve everything you expect, so there is
 * nothing to decide."* A person authoring a scenario needs the second sentence, at the moment
 * they can still act on it, and getting it from a failed confirmation two steps later is a
 * worse experience for no extra guarantee.
 *
 * Every rule below is a property of the scenario record, checked against the record the
 * resolver produced — never against the raw inputs, because the whole point is that postures
 * and declared defaults have already been applied by then.
 */

import {
  CanonicalScenario,
  scenarioBaseDemandUnits,
  scenarioExpectedDemandUnits,
  scenarioServableDemandUnits,
  scenarioFlexCapacityUnits,
  scenarioImpliedUnitCostGbp,
  scenarioPromotedPriceGbp,
  scenarioContributionPerUnitAtListGbp
} from '@/packages/contracts/src/canonical-scenario-model';
import type { ScenarioDraftIssue } from '@/packages/contracts/src/scenario-draft-model';

/**
 * Coherence issues, in the authoring domain's own language.
 *
 * `ERROR` where the scenario provably has no decision in it or provably cannot certify on an
 * arithmetic the author controls; `WARNING` where the scenario is coherent but the author is
 * probably not describing what they meant to.
 */
export function assessDecisionCaseCoherence(scenario: CanonicalScenario): ScenarioDraftIssue[] {
  const issues: ScenarioDraftIssue[] = [];

  const base = scenarioBaseDemandUnits(scenario);
  const expected = scenarioExpectedDemandUnits(scenario);
  const servable = scenarioServableDemandUnits(scenario);
  const exposed = expected - servable;

  // 1. A decision case needs demand the operation cannot serve.
  if (exposed <= 0) {
    issues.push({
      field: 'supply_headroom_profile',
      severity: 'ERROR',
      message:
        'The operation can already serve everything this scenario expects, so there is nothing to decide. '
        + `Expected demand is ${Math.round(expected).toLocaleString('en-GB')} units against `
        + `${Math.round(servable).toLocaleString('en-GB')} servable. Either demand has to move further above `
        + 'the plan, or the allocation has to have less headroom.'
    });
  } else if (exposed / base >= 1) {
    issues.push({
      field: 'total_demand_movement_pct',
      severity: 'ERROR',
      message:
        'The shortfall is larger than a whole horizon of un-promoted demand. A gap that size is a supply '
        + 'failure rather than a commercial decision, and CogniX has nothing useful to recommend about it.'
    });
  }

  // 2. Recovery has to close part of the gap, or the flex clause explains nothing.
  const flex = scenarioFlexCapacityUnits(scenario);
  if (exposed > 0 && flex <= 0) {
    issues.push({
      field: 'supplier_flex_posture',
      severity: 'ERROR',
      message:
        'This supplier agreement carries no volume flex, so there is no lever to close any part of the '
        + 'shortfall and the decision reduces to accepting it. Give the agreement some flex, or author a '
        + 'scenario where the supply ceiling is not the binding constraint.'
    });
  }

  // 3. A promotion has to be fundable before it can be priced.
  const declaresPromotion = scenario.economics.promotion_depth_pct > 0
    && scenario.calendar.promotion_duration_days > 0;
  if (declaresPromotion && scenario.economics.supplier_promotional_funding_pct <= 0) {
    issues.push({
      field: 'supplier_funding_posture',
      severity: 'ERROR',
      message:
        'An unfunded price cut hands back more margin than any realistic demand response can return, so no '
        + 'depth is recommendable and the promotion view has nothing to say. Declare what the supplier funds, '
        + 'or author this as a scenario with no promotion committed.'
    });
  }

  // 4. The promoted price has to cover cost.
  if (declaresPromotion) {
    const cost = scenarioImpliedUnitCostGbp(scenario);
    const promoted = scenarioPromotedPriceGbp(scenario);
    if (cost >= promoted) {
      issues.push({
        field: 'promotion_depth_pct',
        severity: 'ERROR',
        message:
          `At ${scenario.economics.promotion_depth_pct}% off, ${scenario.identity.sku_name} sells at `
          + `£${promoted.toFixed(2)} against a unit cost of £${cost.toFixed(2)}. A line sold below cost is not a `
          + 'promotion decision, so choose a shallower depth or a line with more margin in it.'
      });
    }
  }

  // 5. The margin at list has to be one a grocer could run — the gate's `C-2.12`, said early.
  const listMarginPct = (scenarioContributionPerUnitAtListGbp(scenario) / scenario.economics.list_price_gbp) * 100;
  if (listMarginPct <= 5) {
    issues.push({
      field: 'gross_margin_rate_pct',
      severity: 'ERROR',
      message:
        `This scenario implies a margin of ${listMarginPct.toFixed(1)}% at list, which is below what any grocery `
        + 'line runs on. Check the gross margin rate, or choose a line the product master prices differently.'
    });
  } else if (listMarginPct >= 80) {
    issues.push({
      field: 'gross_margin_rate_pct',
      severity: 'ERROR',
      message:
        `This scenario implies a margin of ${listMarginPct.toFixed(1)}% at list, which no grocery line earns. `
        + 'Check the gross margin rate.'
    });
  }

  // 6. Coherent but probably not what the author meant.
  if (declaresPromotion && scenario.calendar.promotion_duration_days < scenario.calendar.forecast_horizon_days) {
    issues.push({
      field: 'promotion_duration_days',
      severity: 'WARNING',
      message:
        `The promotion runs ${scenario.calendar.promotion_duration_days} days inside a `
        + `${scenario.calendar.forecast_horizon_days}-day decision horizon, so part of the horizon is un-promoted `
        + 'trading. That is a valid scenario — check it is the one you meant.'
    });
  }
  if (scenario.calendar.supplier_lead_time_days >= scenario.calendar.forecast_horizon_days) {
    issues.push({
      field: 'supplier_lead_time_days',
      severity: 'WARNING',
      message:
        'The supplier lead time is as long as the whole decision horizon, so nothing ordered now lands inside it. '
        + 'The supply lever will read as unavailable throughout.'
    });
  }

  return issues;
}
