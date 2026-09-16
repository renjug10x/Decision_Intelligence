/**
 * A scenario that declares NO committed promotion.
 *
 * Its purpose is to exercise the one thing `NOT_APPLICABLE` exists for. The certification
 * record's own example is exactly this case: *"a scenario with no committed promotion
 * declares `C-6` not applicable because there is no promotion to price, and that statement
 * is visible."*
 *
 * Without a fixture like this the estate could only ever test the applicable path, and the
 * declared-non-applicability rules would be assertions about code nobody runs — which is
 * the class of defect `ATL-FINAL` established the precedent against.
 *
 * It is a TEST FIXTURE and is not a curated scenario. Curated packs are `SCI-03`'s.
 */

import {
  CanonicalScenario,
  CANONICAL_SCENARIO,
  MODELLED_SCENARIO_PROVENANCE
} from '../../../packages/contracts/src/index';

export const NO_PROMOTION_SCENARIO_ID = 'SCN-TEST-NO-PROMOTION-001';

export const NO_PROMOTION_SCENARIO: CanonicalScenario = {
  ...CANONICAL_SCENARIO,
  identity: {
    ...CANONICAL_SCENARIO.identity,
    scenario_id: NO_PROMOTION_SCENARIO_ID,
    scenario_name: 'Fresh Dairy — demand movement with no committed intervention',
    decision_question:
      'Demand has moved above plan and nothing is committed. Is any intervention worth making?'
  },
  calendar: {
    ...CANONICAL_SCENARIO.calendar,
    // No promotion runs, so there is no promotion window to measure.
    promotion_duration_days: 0
  },
  economics: {
    ...CANONICAL_SCENARIO.economics,
    // No committed depth: nothing to price, which is what makes C-6 inapplicable rather
    // than failing. Participation follows, since no volume transacts on a promotion.
    promotion_depth_pct: 0,
    promotion_participation_pct: 0
  },
  provenance: {
    ...CANONICAL_SCENARIO.provenance,
    statement:
      'A test fixture scenario. Every value is modelled for testing and no figure represents the '
      + 'operating data of any named retailer.',
    descriptor: MODELLED_SCENARIO_PROVENANCE
  }
};
