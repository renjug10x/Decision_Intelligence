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
  play_kind: PLAY_KIND
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
