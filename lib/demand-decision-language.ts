/**
 * Executive language for the Demand & Forecast experience (DDF-01, Intent Fusion, Enterprise Signals).
 *
 * The sibling of `lib/campaign-decision-language.ts`, and deliberately the same shape: the governed
 * contracts stay the source of truth and keep their precise vocabulary, while this module restates
 * that vocabulary for the client-facing surface. Every translation is a plain-language restatement
 * of the same fact — never a softening of an exposure, a constraint, or an evidence limitation.
 *
 * Two rules hold throughout:
 *   1. An indeterminate state is stated as an absence of evidence, never as a benign reading.
 *   2. A modelled or simulated basis keeps that word. Nothing here may make a demonstration
 *      assumption read as observed telemetry.
 *
 * Raw codes remain available under the "Technical evidence" disclosure, so nothing is hidden —
 * only relegated beneath the business story.
 */

import { DemandDecisionFrontierEvaluation } from '@/packages/contracts/src/index';

/** Plain-language label plus, where useful, a one-line explanation of what it means. */
export interface DemandPhrase {
  label: string;
  /** Compact form for a status chip, where the full label would wrap or clip. */
  short?: string;
  detail?: string;
}

/**
 * DDF-01 `ForecastStabilityState` — a property of the observed evidence stream, not of the model.
 * `INDETERMINATE` means the evidence is too thin to judge, which is never the same as steady.
 */
const STABILITY_STATE: Record<string, DemandPhrase> = {
  STABLE: {
    label: 'Holding steady',
    short: 'Steady',
    detail: 'Observed demand is tracking close to the baseline the forecast was built on.'
  },
  WATCH: {
    label: 'Worth watching',
    detail: 'Observed demand has started to move away from the baseline, but not yet decisively.'
  },
  DETERIORATING: {
    label: 'Moving away from plan',
    short: 'Off plan',
    detail: 'Observed demand has diverged far enough that the current outlook is likely to be revised.'
  },
  INDETERMINATE: {
    label: 'Not enough evidence yet',
    short: 'No evidence yet',
    detail: 'Too few observations to judge whether the outlook is holding. This is not a steady reading.'
  }
};

/** DDF-01 `RevisionRiskLevel` — how likely the outlook is to be restated. */
const REVISION_RISK: Record<string, DemandPhrase> = {
  LOW: { label: 'low' },
  ELEVATED: { label: 'elevated' },
  HIGH: { label: 'high' },
  INDETERMINATE: { label: 'not established' }
};

/** DDF-01 `RevisionDirection` — which way the evidence points. */
const REVISION_DIRECTION: Record<string, DemandPhrase> = {
  UPWARD: { label: 'higher' },
  DOWNWARD: { label: 'lower' },
  BALANCED: { label: 'in both directions' },
  INDETERMINATE: { label: 'in no settled direction' }
};

/** DDF-01 `DemandDecisionGap.risk_state` — the severity of demand we cannot currently serve. */
const GAP_RISK_STATE: Record<string, DemandPhrase> = {
  LOW: { label: 'Low exposure' },
  MEDIUM: { label: 'Moderate exposure' },
  HIGH: { label: 'High exposure' },
  CRITICAL: { label: 'Critical exposure' }
};

/**
 * DDF-01 `DecisionWindowState`. `RESTRICTED` is a closed window, not a narrow one, and keeps
 * that force.
 */
const WINDOW_STATE: Record<string, DemandPhrase> = {
  OPEN: {
    label: 'Open',
    detail: 'There is still time to act inside the declared operational deadline.'
  },
  CLOSING_SOON: {
    label: 'Closing soon',
    detail: 'The declared deadline is close enough that delay starts to cost options.'
  },
  RESTRICTED: {
    label: 'Closed',
    detail: 'The declared deadline has passed, so this lever can no longer be pulled in time.'
  },
  INDETERMINATE: {
    label: 'Not enough evidence yet',
    short: 'No deadline set',
    detail: 'No declared operational deadline exists, so no window is claimed.'
  }
};

/**
 * DDF-01 `DemandDecisionRegret.recommended_action`. `CHOICE_REQUIRED` is a refusal to name a
 * winner because the options do not separate — never a weak recommendation.
 */
const RECOMMENDED_ACTION: Record<string, DemandPhrase> = {
  ACT_NOW: {
    label: 'Act now',
    detail: 'Acting inside the window is worth more than waiting, on the shared inputs.'
  },
  WAIT: {
    label: 'Wait',
    detail: 'Holding for better evidence is worth more than committing now.'
  },
  DO_NOTHING: {
    label: 'Do nothing',
    detail: 'No intervention improves on leaving the position as it stands.'
  },
  CHOICE_REQUIRED: {
    label: 'Further assessment needed',
    short: 'Your call',
    detail: 'The options do not separate materially on these inputs, so CogniX names no winner.'
  }
};

/** DDF-01 `DecisionRegretAlternative.feasibility_status`. */
const FEASIBILITY_STATUS: Record<string, DemandPhrase> = {
  FEASIBLE: { label: 'Available' },
  GATED_BY_READINESS: {
    label: 'Blocked by readiness',
    detail: 'A readiness constraint rules this option out regardless of its projected value.'
  },
  INSUFFICIENT_HEADROOM: {
    label: 'Not enough headroom',
    detail: 'There is not enough executable capacity for this option to change the outcome.'
  }
};

/**
 * DDF-01 `DemandInputProvenanceClass` and the sibling basis classes. These carry the honesty of
 * the demonstration: `SYNTHETIC_OBSERVED` is a simulated observation and is never restated as
 * observed telemetry.
 */
const PROVENANCE_CLASS: Record<string, DemandPhrase> = {
  SYNTHETIC_OBSERVED: {
    label: 'Simulated observation',
    detail: 'Generated by the CogniX demonstration world, not read from a client system.'
  },
  DERIVED_FROM_DECISION_STATE: {
    label: 'Derived from your scenario',
    detail: 'Calculated from the scenario settings currently in force.'
  },
  DERIVED_FROM_CONSTRAINTS: {
    label: 'Derived from constraints',
    detail: 'Calculated from the operational limits declared for this scenario.'
  },
  MODELLED_DEMO_ASSUMPTION: {
    label: 'Modelled scenario assumption',
    detail: 'A declared assumption for the demonstration, not a measured value.'
  },
  DECLARED_OPERATIONAL_CONSTRAINT: {
    label: 'Declared operational constraint',
    detail: 'A limit stated as part of this scenario, such as a supplier cut-off.'
  },
  INDETERMINATE: {
    label: 'Not established',
    detail: 'No basis could be established for this input.'
  }
};

/** DDF-01 `DemandInterventionScenario.lever_type` — the kind of lever being proposed. */
const LEVER_TYPE: Record<string, DemandPhrase> = {
  SUPPLIER_CAPACITY_FLEX: { label: 'Supplier capacity flex' },
  SAFETY_STOCK_BUFFER: { label: 'Safety stock buffer' },
  PROMO_DEPTH_MODERATION: { label: 'Promotion depth moderation' },
  CROSS_PROMO_REBALANCE: { label: 'Cross-promotion rebalance' }
};

/**
 * `CanonicalSignalType` — what an observed enterprise signal means in business terms.
 * The client reads the behaviour, never the signal identifier.
 */
const SIGNAL_TYPE: Record<string, DemandPhrase> = {
  // Customer intent
  SEARCH_VELOCITY_ACCELERATION: {
    label: 'Search demand accelerating',
    detail: 'Customers are searching for these lines more often than the baseline expected.'
  },
  PRODUCT_ENGAGEMENT_ACCELERATION: {
    label: 'Product interest rising',
    detail: 'Customers are viewing these lines more often than the baseline expected.'
  },
  BASKET_ADD_ACCELERATION: {
    label: 'Basket additions increasing',
    detail: 'More customers are adding these lines to baskets than the baseline expected.'
  },
  CAMPAIGN_RESPONSE_ACCELERATION: {
    label: 'Campaign response building',
    detail: 'Customers are responding to the campaign faster than the baseline expected.'
  },
  SLOT_BOOKING_PRESSURE: {
    label: 'Delivery slots filling faster',
    detail: 'Customers are booking delivery slots ahead of the expected rate.'
  },
  // Demand
  ORDER_VELOCITY_ACCELERATION: { label: 'Orders arriving faster' },
  REGIONAL_DEMAND_SHIFT: { label: 'Regional demand shifting' },
  CATEGORY_DEMAND_ACCELERATION: { label: 'Category demand accelerating' },
  FORECAST_DIVERGENCE: { label: 'Demand diverging from forecast' },
  // Supply
  SUPPLIER_LEAD_TIME_DRIFT: { label: 'Supplier lead times lengthening' },
  SUPPLIER_CAPACITY_PRESSURE: { label: 'Supplier capacity under pressure' },
  ASN_VARIANCE: { label: 'Inbound deliveries varying from plan' },
  REPLENISHMENT_DELAY: { label: 'Replenishment running late' },
  // Inventory
  STOCK_COVER_DECLINE: { label: 'Stock cover falling' },
  REGIONAL_INVENTORY_SURPLUS: { label: 'Surplus stock in region' },
  PROJECTED_STOCKOUT_RISK: { label: 'Stockout risk building' },
  PERISHABLE_AGEING_PRESSURE: { label: 'Short-life stock ageing' },
  // Fulfilment & logistics
  CFC_THROUGHPUT_PRESSURE: { label: 'Fulfilment throughput under pressure' },
  LABOUR_UTILISATION_PRESSURE: { label: 'Labour capacity under pressure' },
  PICK_RATE_DEGRADATION: { label: 'Picking rates slowing' },
  FULFILMENT_QUEUE_GROWTH: { label: 'Fulfilment backlog growing' },
  DELIVERY_SLOT_SATURATION: { label: 'Delivery slots close to full' },
  TRANSPORT_CAPACITY_PRESSURE: { label: 'Transport capacity under pressure' },
  // Financial
  MARGIN_COMPRESSION: { label: 'Margin compressing' },
  PROMOTION_CANNIBALISATION: { label: 'Promotion drawing sales from other lines' },
  LOGISTICS_COST_ESCALATION: { label: 'Logistics costs rising' },
  INCREMENTAL_REVENUE_OPPORTUNITY: { label: 'Incremental revenue opportunity' },
  // External context
  WEATHER_TEMPERATURE_ANOMALY: { label: 'Unusual temperatures forecast' },
  WEATHER_PRECIPITATION_SHIFT: { label: 'Rainfall shifting from normal' },
  COMPETITOR_CAMPAIGN_LAUNCH: { label: 'Competitor campaign launched' },
  LOCAL_EVENT_DEMAND_SURGE: { label: 'Local event driving demand' },
  PAYDAY_CALENDAR_EFFECT: { label: 'Payday timing effect' },
  DEMOGRAPHIC_MISSION_SHIFT: { label: 'Shopping missions changing' }
};

/** Enterprise signal categories, for grouping evidence by the part of the business it comes from. */
const SIGNAL_CATEGORY: Record<string, DemandPhrase> = {
  CUSTOMER: { label: 'Customer behaviour' },
  COMMERCIAL: { label: 'Commercial' },
  DEMAND: { label: 'Demand' },
  SUPPLY: { label: 'Supply' },
  INVENTORY: { label: 'Inventory' },
  FULFILMENT: { label: 'Fulfilment' },
  LOGISTICS: { label: 'Logistics' },
  FINANCIAL: { label: 'Financial' }
};

/** Scenario event settings, as written on the Demand & Forecast controls. */
const SCENARIO_EVENT: Record<string, DemandPhrase> = {
  none: { label: 'No event expected' },
  heatwave: { label: 'Heatwave or summer spike' },
  holiday: { label: 'Bank holiday weekend' },
  christmas: { label: 'Christmas spike' }
};

const REGISTRIES: Record<string, Record<string, DemandPhrase>> = {
  stability_state: STABILITY_STATE,
  revision_risk: REVISION_RISK,
  revision_direction: REVISION_DIRECTION,
  gap_risk_state: GAP_RISK_STATE,
  window_state: WINDOW_STATE,
  recommended_action: RECOMMENDED_ACTION,
  feasibility_status: FEASIBILITY_STATUS,
  provenance_class: PROVENANCE_CLASS,
  lever_type: LEVER_TYPE,
  signal_type: SIGNAL_TYPE,
  signal_category: SIGNAL_CATEGORY,
  scenario_event: SCENARIO_EVENT
};

export type DemandVocabularyDomain = keyof typeof REGISTRIES | string;

/**
 * Translate a governed enum value into executive language.
 * Unknown values degrade to a readable de-underscored form rather than disappearing —
 * an untranslated state must still be visible, never silently blank.
 */
export function demandPhrase(domain: DemandVocabularyDomain, value?: string | null): DemandPhrase {
  if (!value) return { label: '—' };
  const found = REGISTRIES[domain]?.[value];
  if (found) return found;
  return { label: humaniseDemandTerm(value) };
}

/**
 * Convenience for the common case where only the label is needed.
 * Both arguments are required: a one-argument call would silently return the em-dash placeholder.
 */
export function demandLabel(domain: DemandVocabularyDomain, value?: string | null): string {
  return demandPhrase(domain, value).label;
}

/**
 * The compact form for a status chip. Falls back to the full label where no short form is
 * declared, so a chip is never blank.
 */
export function demandBadge(domain: DemandVocabularyDomain, value?: string | null): string {
  const p = demandPhrase(domain, value);
  return p.short || p.label;
}

/** SCREAMING_SNAKE_CASE → "Screaming snake case". Last-resort readability. */
export function humaniseDemandTerm(value: string): string {
  const spaced = value.replace(/_/g, ' ').toLowerCase().trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Promotion mechanics arrive from the Commercial Intent store as parameterised keys such as
 * `20_percent_off`. Render the offer, not the key.
 */
export function describePromotionMechanic(promotionType?: string | null, discountDepth?: number | null): string {
  if (typeof discountDepth === 'number' && discountDepth > 0) return `${discountDepth}% off`;
  if (!promotionType) return 'Promotion';
  const percentOff = promotionType.match(/^(\d+)_percent_off$/);
  if (percentOff) return `${percentOff[1]}% off`;
  const multibuy = promotionType.match(/^(\d+)_for_(\d+)$/);
  if (multibuy) return `${multibuy[1]} for ${multibuy[2]}`;
  return humaniseDemandTerm(promotionType);
}

/**
 * How an observed signal reads on the executive surface: what the customer or supplier is doing,
 * and how far that sits from what was expected. The signal identifier stays out of the sentence.
 */
export function describeSignalMovement(signal: {
  signal_type: string;
  delta_pct?: number | null;
  entity_id?: string;
}): { title: string; movement: string; detail?: string; entity?: string } {
  const phrase = demandPhrase('signal_type', signal.signal_type);
  const delta = signal.delta_pct;
  const movement =
    typeof delta === 'number' && Number.isFinite(delta)
      ? `${delta >= 0 ? '+' : ''}${Math.round(delta)}% versus expected baseline`
      : 'Movement not quantified';
  return { title: phrase.label, movement, detail: phrase.detail, entity: signal.entity_id };
}

/**
 * The business meaning of Forecast Confidence against Forecast Stability, for the executive surface.
 *
 * The governed engine publishes the precise technical statement — that confidence is a declared
 * property of the method with no backtest behind it in this estate — and that statement is kept
 * verbatim under "Technical evidence". This is the same distinction stated as a concept rather
 * than as an implementation history. It claims no validation that does not exist.
 */
export const CONFIDENCE_VS_STABILITY = {
  heading: 'Confidence and stability answer different questions',
  body:
    'Confidence describes the forecasting method’s declared reliability. Stability shows whether new demand evidence is causing the current outlook to move. A confident forecast can still be unstable.'
} as const;

/** The four named contributors CogniX can attribute a change in the outlook to. */
export const OUTLOOK_CONTRIBUTOR_LABELS = {
  baseline: {
    label: 'Underlying demand trend',
    detail: 'The movement the forecast already expected before any promotion or new evidence.'
  },
  promotion: {
    label: 'Planned promotion',
    detail: 'The uplift attributed to the committed promotion at its current depth.'
  },
  observed: {
    label: 'Observed customer behaviour',
    detail: 'The uplift attributed to what customers are actually doing right now.'
  },
  revision: {
    label: 'Evidence-driven revision',
    detail: 'The adjustment applied because observed evidence has diverged from the baseline.'
  }
} as const;

/** A single attributed contributor to the movement in the outlook. */
export interface OutlookContributor {
  key: 'baseline' | 'promotion' | 'observed';
  label: string;
  detail: string;
  qualifier?: string;
  pp: number;
}

/**
 * Rank the contributors behind the emerging demand outlook, strongest first.
 * Contributors that move the outlook by less than 0.1pp are dropped rather than shown as noise,
 * so the client reads the two to four factors that actually matter.
 */
export function deriveOutlookContributors(
  evaluation: DemandDecisionFrontierEvaluation,
  promotionDepthPct: number,
  scenarioEvent?: string
): OutlookContributor[] {
  const f = evaluation.demand_frontier;
  const base = f.base_demand_units;
  if (!base) return [];

  const pctOfBase = (units: number) => ((units / base) - 1) * 100;
  const ppOfBase = (units: number) => (units / base) * 100;

  const signalCount = evaluation.forecast_stability.contributing_signal_refs.length;

  // The un-promoted projection already carries any declared scenario event, so the event is
  // named here rather than left to read as organic drift.
  const eventName =
    scenarioEvent && scenarioEvent !== 'none'
      ? demandLabel('scenario_event', scenarioEvent).toLowerCase()
      : undefined;

  const contributors: OutlookContributor[] = [
    {
      key: 'baseline',
      label: OUTLOOK_CONTRIBUTOR_LABELS.baseline.label,
      detail: OUTLOOK_CONTRIBUTOR_LABELS.baseline.detail,
      qualifier: eventName ? `includes ${eventName}` : undefined,
      pp: pctOfBase(f.baseline_demand_units)
    },
    {
      key: 'promotion',
      label: OUTLOOK_CONTRIBUTOR_LABELS.promotion.label,
      detail: OUTLOOK_CONTRIBUTOR_LABELS.promotion.detail,
      qualifier: promotionDepthPct > 0 ? `at ${promotionDepthPct}% depth` : undefined,
      pp: ppOfBase(f.contextualised_demand_units - f.baseline_demand_units)
    },
    {
      key: 'observed',
      label: OUTLOOK_CONTRIBUTOR_LABELS.observed.label,
      detail: OUTLOOK_CONTRIBUTOR_LABELS.observed.detail,
      qualifier: signalCount > 0 ? `${signalCount} observed signal${signalCount === 1 ? '' : 's'}` : undefined,
      pp: ppOfBase(f.emerging_demand_units - f.contextualised_demand_units)
    }
  ];

  return contributors
    .filter(c => Math.abs(c.pp) >= 0.1)
    .sort((a, b) => Math.abs(b.pp) - Math.abs(a.pp));
}
