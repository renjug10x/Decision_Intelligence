/**
 * Executive language for the Campaign Decision experience.
 *
 * The governed contracts are the source of truth and their vocabulary is deliberately
 * precise; this module translates that vocabulary for the primary client-facing surface
 * without changing what is true. Every translation is a plain-language restatement of the
 * same fact — never a softening of a veto, an exclusion, or an evidence limitation.
 *
 * Raw codes remain available to the user under progressive disclosure ("How CogniX reached
 * this conclusion"), so nothing is hidden — only relegated.
 */

/** Plain-language label plus, where useful, a one-line explanation of what it means. */
export interface ExecutivePhrase {
  label: string;
  detail?: string;
}

const PLAY_ADMISSIBILITY: Record<string, ExecutivePhrase> = {
  ADMISSIBLE: { label: 'Viable option' },
  INADMISSIBLE_UNSTATED_MECHANIC: {
    label: 'Not viable — mechanic undefined',
    detail: 'The lever for this option was never specified, so its effect cannot be attributed.'
  },
  INADMISSIBLE_MODEL_INTEGRITY: {
    label: 'Not viable — model integrity',
    detail: 'The underlying demand model did not reconcile for this option.'
  },
  INADMISSIBLE_AMBIENT_FRAME: {
    label: 'Not viable — inconsistent market baseline',
    detail: 'This option was measured against a different market backdrop, so it is not comparable.'
  },
  INADMISSIBLE_VETOED: {
    label: 'Not viable — blocked by a constraint',
    detail: 'A readiness constraint rules this option out regardless of its projected upside.'
  },
  EXCLUDED_ECONOMICS_INCOMPLETE: {
    label: 'Set aside — insufficient economic evidence',
    detail: 'Demand can be modelled for this option but its cost cannot, so no honest comparison is possible.'
  }
};

const ECONOMICS_COMPLETENESS: Record<string, ExecutivePhrase> = {
  COMPLETE_ON_ADMITTED_AXES: {
    label: 'Assessment complete',
    detail: 'Both demand and contribution could be evaluated for this option.'
  },
  DEMAND_MODELLED_COST_UNMODELLED: {
    label: 'Demand only — cost not modelled',
    detail: 'Volume effect is modelled; the cost side is not, so contribution is not claimed.'
  }
};

const AXIS_LABELS: Record<string, ExecutivePhrase> = {
  attributable_volume_uplift_pp: {
    label: 'Incremental demand',
    detail: 'Demand change attributable to the intervention itself, in percentage points.'
  },
  contribution_delta_gbp: {
    label: 'Contribution impact',
    detail: 'Change in net commercial contribution, in pounds.'
  }
};

const AXIS_UNITS: Record<string, { suffix?: string; prefix?: string; decimals: number }> = {
  attributable_volume_uplift_pp: { suffix: ' pp', decimals: 1 },
  contribution_delta_gbp: { prefix: '£', decimals: 0 }
};

const READINESS_STATE: Record<string, ExecutivePhrase> = {
  GO: { label: 'Ready to proceed' },
  CONDITIONAL_GO: {
    label: 'Proceed with conditions',
    detail: 'Viable, but specific conditions must hold for the decision to stay sound.'
  },
  REVIEW: {
    label: 'Needs review',
    detail: 'Unresolved concerns should be settled before committing.'
  },
  DO_NOT_PROCEED: {
    label: 'Do not proceed',
    detail: 'A blocking constraint means this should not go ahead as configured.'
  }
};

const DIMENSION_STATE: Record<string, ExecutivePhrase> = {
  CLEAR: { label: 'Clear' },
  WATCH: { label: 'Watch' },
  CONSTRAINED: { label: 'Constrained' },
  BLOCKING: { label: 'Blocking' },
  INSUFFICIENT_EVIDENCE: { label: 'Not enough evidence' },
  NOT_EVALUATED: { label: 'Not assessed' }
};

const DIMENSION_ID: Record<string, ExecutivePhrase> = {
  COMMERCIAL: { label: 'Commercial' },
  DEMAND: { label: 'Demand' },
  OPERATIONAL: { label: 'Operations & supply' },
  CONTEXT: { label: 'Market context' },
  CUSTOMER: { label: 'Customer' },
  STRATEGIC: { label: 'Strategic fit' }
};

const SELECTION_STATUS: Record<string, ExecutivePhrase> = {
  SELECTED: { label: 'Recommended' },
  CHOICE_REQUIRED: {
    label: 'Your call',
    detail: 'More than one option is defensible — CogniX will not choose between them for you.'
  },
  NO_ADMISSIBLE_PLAY: {
    label: 'No viable option',
    detail: 'Nothing on the table satisfies the declared constraints.'
  }
};

const SELECTION_BASIS: Record<string, ExecutivePhrase> = {
  UNIQUELY_ADMISSIBLE_UNDER_DECLARED_CONSTRAINTS: {
    label: 'Only option that satisfies your constraints'
  },
  BALANCED_UNDER_DECLARED_CONSTRAINTS: {
    label: 'Best balance across your stated priorities'
  }
};

const NOT_EMITTED_REASON: Record<string, ExecutivePhrase> = {
  ANCHOR_MODEL_INTEGRITY_FAILURE: {
    label: 'Comparison unavailable — model did not reconcile'
  },
  AMBIENT_FRAME_DIVERGENCE: {
    label: 'Comparison unavailable — options used different market baselines'
  },
  SCENARIO_ZERO_ABSENT: {
    label: 'Comparison unavailable — no do-nothing case to compare against'
  }
};

const AVAILABILITY: Record<string, ExecutivePhrase> = {
  AVAILABLE: { label: 'Available' },
  NOT_AVAILABLE: {
    label: 'Not measurable yet',
    detail: 'This dimension needs an authoritative input the estate does not yet hold.'
  },
  NOT_ADMISSIBLE_AS_AXIS: {
    label: 'Not usable for comparison',
    detail: 'This dimension cannot serve as a comparison axis for these options.'
  }
};

const EVIDENCE_STRENGTH: Record<string, ExecutivePhrase> = {
  OBSERVED: { label: 'Observed' },
  DERIVED: { label: 'Derived' },
  DERIVED_KNOWN_DISCONTINUITY: { label: 'Derived (known discontinuity)' },
  DECLARED_INPUT: { label: 'You declared this' },
  SEEDED_ASSUMPTION: { label: 'Demo assumption' },
  PROXY: { label: 'Proxy measure' },
  PLACEHOLDER_EXCLUDED: { label: 'Placeholder — excluded from reasoning' },
  MISSING: { label: 'Missing' }
};

const OBJECTIVE_CLASS: Record<string, ExecutivePhrase> = {
  VALUE_CREATION: {
    label: 'Value-creating objective',
    detail: 'Judged on whether it grows contribution.'
  },
  VALUE_TRADE: {
    label: 'Value-trading objective',
    detail: 'Accepts margin sacrifice to buy volume, waste reduction or availability.'
  },
  UNCLASSIFIED: {
    label: 'Objective not classified',
    detail: 'The stated objective does not map to a value-creating or value-trading intent.'
  }
};

const PLAY_KIND: Record<string, ExecutivePhrase> = {
  DO_NOTHING: { label: 'Do nothing' },
  PROMOTION: { label: 'Promotional intervention' },
  NON_PROMOTION: { label: 'Non-promotional intervention' }
};

/** CDI-01 `CampaignObjectiveType`. */
const CAMPAIGN_OBJECTIVE: Record<string, ExecutivePhrase> = {
  INVENTORY_CLEARANCE: { label: 'Inventory clearance' },
  REVENUE_ACCELERATION: { label: 'Revenue acceleration' },
  MARKET_DEFENSE: { label: 'Market defence' },
  LAUNCH: { label: 'Launch' },
  OTHER: {
    label: 'Other objective',
    detail:
      'Not one of the governed objectives. Where the chosen metric does not settle it, the intent stays unclassified and is held to the stricter commercial test.'
  }
};

/**
 * CDI-01 `InterventionPosture`. Posture is what the planner is willing to consider — never a
 * decision, and never an assumption that promotion is the answer.
 */
const INTERVENTION_POSTURE: Record<string, ExecutivePhrase> = {
  UNDECIDED: {
    label: 'Open on approach',
    detail: 'No intervention type has been ruled in or out, including doing nothing.'
  },
  CONSIDER_PROMOTION: {
    label: 'Consider promotion',
    detail: 'A promotion is on the table — it is assessed against the alternatives, not assumed.'
  },
  CONSIDER_NON_PROMOTION: {
    label: 'Consider a non-promotional intervention',
    detail: 'A lever other than price is on the table, such as availability, placement or activation.'
  },
  CONSIDER_DO_NOTHING: {
    label: 'Consider doing nothing',
    detail: 'Doing nothing is a live option; it still carries whatever the market does anyway.'
  }
};

/** CDI-01 `PrimaryObjectiveMetric` — what the campaign is judged on. */
const PRIMARY_METRIC: Record<string, ExecutivePhrase> = {
  VOLUME: { label: 'Volume' },
  REVENUE: { label: 'Revenue' },
  CONTRIBUTION: { label: 'Contribution' },
  WASTE_REDUCTION: { label: 'Waste reduction' },
  AVAILABILITY: { label: 'Availability' }
};

/** CDI-01 `TimingMode`. */
const TIMING_MODE: Record<string, ExecutivePhrase> = {
  KNOWN_DATES: {
    label: 'Dates already fixed',
    detail: 'The window is given, so it is assessed as stated rather than searched for.'
  },
  FIND_BEST_WINDOW: {
    label: 'Find the best window',
    detail: 'The timing is open, so when to intervene is part of what CogniX examines.'
  }
};

/**
 * CDI-03 `OpportunityWindowTier` — how a candidate window rates once the timing factors are
 * scored. `AVOID` is a recommendation against the window and keeps that force: it is never
 * restated as merely "less good".
 */
const OPPORTUNITY_WINDOW_TIER: Record<string, ExecutivePhrase> = {
  PREFERRED: {
    label: 'Preferred',
    detail: 'Scores best on the timing factors assessed for this campaign.'
  },
  ACCEPTABLE: {
    label: 'Acceptable',
    detail: 'Workable timing, but not the strongest window available.'
  },
  SUBOPTIMAL: {
    label: 'Poor timing',
    detail: 'The timing factors work against this window; expect to give up yield by using it.'
  },
  AVOID: {
    label: 'Avoid',
    detail: 'Recommended against. The timing factors count so heavily against this window that it should not be used.'
  }
};

/**
 * CDI-03 `MicroMarketTier` — how a store rates as a place to intervene. `EXCLUDE` is an
 * exclusion from scope, not a low rank, and is stated as one.
 */
const MICRO_MARKET_TIER: Record<string, ExecutivePhrase> = {
  HIGH: {
    label: 'High priority',
    detail: 'Scores strongly on the micro-market factors assessed.'
  },
  MEDIUM: {
    label: 'Medium priority',
    detail: 'Worth including, but not among the strongest locations.'
  },
  WATCH: {
    label: 'Watch',
    detail: 'Included, but the factors behind its score are weak enough to be worth monitoring.'
  },
  EXCLUDE: {
    label: 'Excluded',
    detail: 'Ruled out of scope for this campaign rather than simply ranked low.'
  }
};

/**
 * CDI-04 `ConfidenceBand`. `INSUFFICIENT` is an absence of evidence, not a weak reading, and
 * must never be read as a low-but-usable confidence level.
 */
const CONFIDENCE_BAND: Record<string, ExecutivePhrase> = {
  HIGH: { label: 'High' },
  MODERATE: { label: 'Moderate' },
  LOW: {
    label: 'Low',
    detail: 'The evidence supports a position, but weakly.'
  },
  INSUFFICIENT: {
    label: 'Not established',
    detail:
      'There is too little admissible evidence to put a confidence level on this readiness position. That is the absence of a confidence reading, never a low one.'
  }
};

/** CDI-01 `BaselineObjective.target_direction`. */
const TARGET_DIRECTION: Record<string, ExecutivePhrase> = {
  INCREASE: { label: 'Increase it' },
  DECREASE: { label: 'Reduce it' },
  PROTECT: {
    label: 'Protect it',
    detail: 'Hold the current level rather than move it.'
  },
  CLEAR: {
    label: 'Clear the position',
    detail: 'Sell the stock down within the window.'
  }
};

/**
 * CDI-06 outcome dimensions — the two Pareto axes plus the dimensions deliberately kept off
 * the frontier. The exclusions are stated as exclusions: a dimension that cannot rank options
 * must never read as one that simply scored neutral.
 */
const OUTCOME_DIMENSION: Record<string, ExecutivePhrase> = {
  attributable_volume_uplift_pp: {
    label: 'Incremental demand',
    detail: 'Demand change attributable to the intervention itself, in percentage points.'
  },
  contribution_delta_gbp: {
    label: 'Contribution impact',
    detail: 'Change in net commercial contribution, in pounds.'
  },
  revenue_delta_gbp: {
    label: 'Revenue impact — not measurable',
    detail:
      'Revenue needs a realised selling price the estate does not hold. List price or an assumed margin is not an acceptable substitute, so no revenue figure is claimed.'
  },
  availability_delta: {
    label: 'Availability impact — not measurable',
    detail:
      'No availability or service-level quantity exists for these options. Capacity headroom is not the same thing and is not used as a stand-in.'
  },
  waste_delta_units: {
    label: 'Waste impact — disclosed, not compared',
    detail:
      'Waste is reported, but the causal model does not separate it finely enough across intervention depths to justify trading one option against another on it.'
  },
  predicted_confidence: {
    label: 'Prediction confidence — not a comparison axis',
    detail:
      'Confidence follows the single modelled trajectory rather than differing across strategies, so it cannot rank them.'
  }
};

/** CDI-07A `TriggerOutcome` — whether a contracted assumption could be checked, and what it showed. */
const TRIGGER_OUTCOME: Record<string, ExecutivePhrase> = {
  NOT_FIRED: {
    label: 'Still holding',
    detail: 'Checked against what was contracted, and unchanged.'
  },
  FIRED: {
    label: 'Breached',
    detail: 'What was contracted no longer matches what is observed.'
  },
  UNASSESSABLE: {
    label: 'Could not be checked',
    detail:
      'No admissible observation exists for this trigger. It is not holding — it is unknown, and is never counted as holding.'
  }
};

/** CDI-07B `ComparisonVerdict` — prediction against outcome, once the two are comparable. */
const COMPARISON_VERDICT: Record<string, ExecutivePhrase> = {
  WITHIN_DECLARED_ENVELOPE: {
    label: 'Within the tolerance declared beforehand',
    detail: 'The outcome fell inside the error range declared before the campaign ran.'
  },
  OUTSIDE_DECLARED_ENVELOPE: {
    label: 'Outside the tolerance declared beforehand',
    detail: 'The outcome fell outside the error range declared before the campaign ran.'
  },
  INDETERMINATE: {
    label: 'Cannot be judged',
    detail: 'Neither a hit nor a miss can be claimed on this evidence.'
  }
};

/**
 * CDI-07B `ComparabilityVerdict` — whether a prediction and an observation may be compared at
 * all. Everything other than like-for-like is a refusal to score, stated as such: an
 * unscoreable prediction must never read as a passed one.
 */
const COMPARABILITY_VERDICT: Record<string, ExecutivePhrase> = {
  LIKE_FOR_LIKE: {
    label: 'Directly comparable',
    detail: 'Prediction and outcome agree on level of detail, window, metric, unit and quantity basis.'
  },
  GRAIN_MISMATCH: {
    label: 'Not comparable — measured at a different level',
    detail: 'The outcome was recorded at a level of detail the decision was not made at.'
  },
  QUANTITY_BASIS_MISMATCH: {
    label: 'Not comparable — different quantity basis',
    detail: 'One side counts the effect caused by the intervention and the other counts total movement.'
  },
  NO_OBSERVED_COUNTERFACTUAL: {
    label: 'Not comparable — nothing observed to isolate the effect',
    detail:
      'Attributable effect cannot be measured without an observed do-nothing case. The prediction stays unscored rather than being credited against total movement.'
  },
  UNIT_MISMATCH: {
    label: 'Not comparable — different units',
    detail: 'Prediction and outcome are expressed in units that cannot be reconciled.'
  },
  OBSERVATION_ABSENT: {
    label: 'Not comparable — no outcome recorded',
    detail: 'Nothing has been observed for this quantity yet.'
  },
  OBSERVATION_NOT_AUTHORITATIVE: {
    label: 'Not comparable — outcome not from an authoritative source',
    detail: 'The recorded outcome is simulated or scenario-derived, so it cannot be used to score a prediction.'
  },
  TENANT_SESSION_MISMATCH: {
    label: 'Not comparable — outcome belongs to a different decision',
    detail: 'The observation was recorded under another tenant or session and is not admitted here.'
  },
  GRAIN_UNDECLARED: {
    label: 'Not comparable — level of detail never declared',
    detail: 'The decision never stated what it applied to, so no outcome can be bound to it.'
  },
  WINDOW_UNDECLARED: {
    label: 'Not comparable — campaign window never declared',
    detail: 'Without a stated start and end there is no period an outcome could be matched against.'
  },
  WINDOW_MISMATCH: {
    label: 'Not comparable — different measurement period',
    detail: 'The outcome does not cover exactly the window the decision was made for.'
  },
  METRIC_MISMATCH: {
    label: 'Not comparable — different metric',
    detail: 'The observed signal is not the metric this decision was judged on.'
  },
  METRIC_CORRESPONDENCE_UNDECLARED: {
    label: 'Not comparable — no signal defined for this metric',
    detail: 'Nothing states which observed signal corresponds to the objective metric, and one is never assumed.'
  },
  QUANTITY_BASIS_UNDECLARED: {
    label: 'Not comparable — quantity basis never declared',
    detail: 'How the outcome was measured could not be established, and it is never inferred.'
  }
};

/** CDI-07A `DecisionResolutionRoute` — how the committed option came to be chosen. */
const RESOLUTION_ROUTE: Record<string, ExecutivePhrase> = {
  CONSTRAINT_RESOLVED: {
    label: 'Settled by the declared constraints',
    detail: 'One option survived the constraints on the table, so no human tie-break was needed.'
  },
  HUMAN_RESOLVED: {
    label: 'Chosen by a named decision-maker',
    detail: 'More than one option was defensible, so a person chose — and who chose, and why, is on record.'
  }
};

/**
 * CDI-07A `DecisionValidityState` — the Tier 1 validity indicator. States describe evidence,
 * never elapsed time; `INDETERMINATE` is a distinct answer and is never read as stable.
 */
const VALIDITY_STATE: Record<string, ExecutivePhrase> = {
  STABLE: {
    label: 'Still holds',
    detail: 'Every assumption that could be checked still matches what was contracted.'
  },
  WATCH: {
    label: 'Worth watching',
    detail: 'Something moved, but not in a way that undermines what the decision rests on.'
  },
  DEGRADED: {
    label: 'Weakened',
    detail: 'An assumption the decision leans on no longer holds. It now stands on less than when it was made.'
  },
  REASSESS_REQUIRED: {
    label: 'Must be reassessed',
    detail: 'The basis of the decision has changed. Re-run it before acting further on this commitment.'
  },
  INDETERMINATE: {
    label: 'Cannot be assessed',
    detail:
      'There is not enough admissible evidence to say whether the decision still holds. This is not a clean bill of health.'
  }
};

/** CDI-07B `QuantityBasis` — what a number counts, which decides whether two numbers may be compared. */
const QUANTITY_BASIS: Record<string, ExecutivePhrase> = {
  ATTRIBUTABLE: {
    label: 'Effect caused by the intervention',
    detail: 'Net of what would have happened anyway.'
  },
  GROSS: {
    label: 'Total movement observed',
    detail: 'Includes whatever the market was doing regardless of the intervention.'
  },
  MODELLED_MONETARY: {
    label: 'Modelled money value',
    detail: 'Derived from the model rather than directly observed.'
  }
};

/**
 * CDI-07A `RejectionCause` — why an alternative is not the committed option. The ladder in
 * `lib/campaign-decision-contract-engine.ts` tests admissibility first, so a blocked option is
 * never recorded as merely "not chosen": the blocking causes keep their blocking wording.
 */
const REJECTION_CAUSE: Record<string, ExecutivePhrase> = {
  EXCLUDED_ECONOMICS_INCOMPLETE: {
    label: 'Set aside — insufficient economic evidence',
    detail: 'Demand can be modelled for this option but its cost cannot, so no honest comparison is possible.'
  },
  INADMISSIBLE_MODEL_INTEGRITY: {
    label: 'Not viable — model integrity',
    detail: 'The underlying demand model did not reconcile for this option.'
  },
  INADMISSIBLE_UNSTATED_MECHANIC: {
    label: 'Not viable — mechanic undefined',
    detail: 'The lever for this option was never specified, so its effect cannot be attributed.'
  },
  READINESS_VETOED: {
    label: 'Blocked by a readiness constraint',
    detail: 'A readiness veto rules this option out regardless of its projected upside.'
  },
  REMOVED_BY_DECLARED_CONSTRAINT: {
    label: 'Ruled out by a constraint you declared',
    detail: 'It breaches a limit stated as part of this decision.'
  },
  PARETO_DOMINATED: {
    label: 'Outperformed on both measures',
    detail: 'Another option is at least as good on both comparison axes and better on one.'
  },
  NOT_CHOSEN_BY_RESOLVER: {
    label: 'Defensible, but not the option chosen',
    detail: 'Nothing ruled this option out; another was committed to instead.'
  }
};

/** CDI-07A `DecisionContractStatus`. */
const CONTRACT_STATUS: Record<string, ExecutivePhrase> = {
  ACTIVE: {
    label: 'In force',
    detail: 'This is the commitment currently governing the campaign.'
  },
  SUPERSEDED: {
    label: 'Superseded',
    detail: 'A later contract replaced this one. It is kept as the record of what was committed at the time.'
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    detail: 'This commitment was withdrawn and governs nothing.'
  }
};

const REGISTRIES: Record<string, Record<string, ExecutivePhrase>> = {
  play_admissibility: PLAY_ADMISSIBILITY,
  economics_completeness: ECONOMICS_COMPLETENESS,
  axis: AXIS_LABELS,
  readiness_state: READINESS_STATE,
  dimension_state: DIMENSION_STATE,
  dimension_id: DIMENSION_ID,
  selection_status: SELECTION_STATUS,
  selection_basis: SELECTION_BASIS,
  not_emitted_reason: NOT_EMITTED_REASON,
  availability: AVAILABILITY,
  evidence_strength: EVIDENCE_STRENGTH,
  objective_class: OBJECTIVE_CLASS,
  play_kind: PLAY_KIND,
  campaign_objective: CAMPAIGN_OBJECTIVE,
  intervention_posture: INTERVENTION_POSTURE,
  primary_metric: PRIMARY_METRIC,
  timing_mode: TIMING_MODE,
  opportunity_window_tier: OPPORTUNITY_WINDOW_TIER,
  micro_market_tier: MICRO_MARKET_TIER,
  confidence_band: CONFIDENCE_BAND,
  target_direction: TARGET_DIRECTION,
  outcome_dimension: OUTCOME_DIMENSION,
  trigger_outcome: TRIGGER_OUTCOME,
  comparison_verdict: COMPARISON_VERDICT,
  comparability_verdict: COMPARABILITY_VERDICT,
  resolution_route: RESOLUTION_ROUTE,
  validity_state: VALIDITY_STATE,
  quantity_basis: QUANTITY_BASIS,
  rejection_cause: REJECTION_CAUSE,
  contract_status: CONTRACT_STATUS
};

export type VocabularyDomain = keyof typeof REGISTRIES | string;

/**
 * Translate a governed enum value into executive language.
 * Unknown values degrade to a readable de-underscored form rather than disappearing —
 * an untranslated state must still be visible, never silently blank.
 */
export function phrase(domain: VocabularyDomain, value?: string | null): ExecutivePhrase {
  if (!value) return { label: '—' };
  const registry = REGISTRIES[domain];
  const found = registry?.[value];
  if (found) return found;
  return { label: humanise(value) };
}

/** Convenience for the common case where only the label is needed. */
export function label(domain: VocabularyDomain, value?: string | null): string {
  return phrase(domain, value).label;
}

/** SCREAMING_SNAKE_CASE → "Screaming snake case". Last-resort readability. */
export function humanise(value: string): string {
  const spaced = value.replace(/_/g, ' ').toLowerCase().trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Format a frontier axis value with the unit its axis implies. */
export function formatAxisValue(axisId: string, value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const unit = AXIS_UNITS[axisId];
  if (!unit) return String(value);
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const magnitude = Math.abs(value).toFixed(unit.decimals);
  return `${sign}${unit.prefix || ''}${magnitude}${unit.suffix || ''}`;
}

/**
 * The business question each governed package answers. Used as the primary navigation
 * language so the user reads decisions, not architecture; the package code stays available
 * as technical provenance.
 */
export const DECISION_STAGE_LANGUAGE: Record<
  string,
  { eyebrow: string; question: string; package: string }
> = {
  CDI_02: {
    eyebrow: 'Assess',
    question: 'Is intervening worth it compared with doing nothing?',
    package: 'CDI-02'
  },
  CDI_03: {
    eyebrow: 'Discover',
    question: 'Where and when should we intervene?',
    package: 'CDI-03'
  },
  CDI_04: {
    eyebrow: 'Validate',
    question: 'Can we execute this safely?',
    package: 'CDI-04'
  },
  CDI_05: {
    eyebrow: 'Sequence',
    question: 'How does this decision play out over time?',
    package: 'CDI-05'
  },
  CDI_06: {
    eyebrow: 'Compare',
    question: 'Which strategy gives the best trade-off?',
    package: 'CDI-06'
  },
  CDI_07A: {
    eyebrow: 'Decide',
    question: 'What are we committing to, and when does it stop being true?',
    package: 'CDI-07A'
  },
  CDI_07B: {
    eyebrow: 'Learn',
    question: 'What did we get right, and what should we learn?',
    package: 'CDI-07B'
  }
};
