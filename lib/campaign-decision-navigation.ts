/**
 * Where "Explore Decision Analytics" goes, for the state the reader is actually in.
 *
 * The Promotion experience has two modes and one exploration control. Pre-flight, the deeper
 * evidence is the analytical lenses; in flight, it is the outlook, the timeline and the observed
 * deviations. The control resolved a single pre-flight anchor in both modes, so in Campaign
 * In-Flight it found nothing and did nothing — a dead control.
 *
 * This module states the destination as data rather than as a DOM lookup buried in a click
 * handler, so the choice is inspectable and testable, and so every destination it can name is a
 * section that mode genuinely renders. Nothing here computes decision evidence; it only decides
 * which existing section answers "show me the analysis behind this" for the current state.
 */

export type PromotionExperienceMode = 'PLANNING' | 'DECISION_TWIN';

/** The five pre-flight analytical lens tabs, as rendered by the planner. */
export type DecisionAnalyticsLensId = 'DEMAND' | 'OPPORTUNITY' | 'FRONTIER' | 'INVERSE' | 'GRAPH';

// ---------------------------------------------------------------------------
// Section anchors — the single place these ids are written down
// ---------------------------------------------------------------------------

/** Pre-flight: the progressive-disclosure lens section. */
export const PRE_FLIGHT_LENSES_SECTION_ID = 'analytical-lenses-section';
/** Pre-flight: Review & Activate (CTW-01). Always rendered alongside the lenses. */
export const FLIGHT_ACTIVATION_SECTION_ID = 'flight-activation-section';
/** In flight: campaign outlook and decision moments (CTW-02). Rendered only with an outlook. */
export const CAMPAIGN_OUTLOOK_SECTION_ID = 'campaign-outlook-section';
/** In flight: the continuous campaign timeline (CTW-01), or its stated absence. Always rendered. */
export const CAMPAIGN_TIMELINE_SECTION_ID = 'campaign-timeline-section';
/** In flight: detected deviations and the recommended course correction. Always rendered. */
export const IN_FLIGHT_DEVIATIONS_SECTION_ID = 'in-flight-deviations-section';

export const PRE_FLIGHT_SECTION_IDS = [
  PRE_FLIGHT_LENSES_SECTION_ID,
  FLIGHT_ACTIVATION_SECTION_ID
] as const;

export const IN_FLIGHT_SECTION_IDS = [
  CAMPAIGN_OUTLOOK_SECTION_ID,
  CAMPAIGN_TIMELINE_SECTION_ID,
  IN_FLIGHT_DEVIATIONS_SECTION_ID
] as const;

/** The lens tab labels, so the control can name where it is about to take the reader. */
export const LENS_LABELS: Record<DecisionAnalyticsLensId, string> = {
  DEMAND: 'Demand & Elasticity',
  OPPORTUNITY: 'Opportunity Surface',
  FRONTIER: 'Decision Frontier & Tension',
  INVERSE: 'What If & Signal Feed',
  GRAPH: 'Evidence & Decision Graph'
};

// ---------------------------------------------------------------------------
// State in, destination out
// ---------------------------------------------------------------------------

export interface DecisionAnalyticsState {
  mode: PromotionExperienceMode;
  /** The seeded scenario verdict on the discovery hero. */
  decision_verdict?: string | null;
  /** CDI-04 readiness for the current configuration, when the live call succeeded. */
  readiness_state?: string | null;
  /** CTW-01 — whether a governed flight projection exists for the activated decision. */
  has_flight?: boolean;
  /** CTW-02 — what the outlook says the reader should be doing now, when there is one. */
  outlook_action?: 'MONITOR' | 'PREPARE' | 'REVIEW' | null;
  /** CTW-02 — how many decision moments the projection yields. */
  moment_count?: number;
}

export interface DecisionAnalyticsTarget {
  /** The section the control opens for this state. */
  section_id: string;
  /**
   * Sections to fall back to, in order, if `section_id` is not on the page. The last entry is
   * always a section the current mode renders unconditionally, so the control cannot be dead.
   */
  fallback_section_ids: string[];
  /** The lens tab to select on the way, or null when the mode has no lens tabs. */
  lens_id: DecisionAnalyticsLensId | null;
  /** What the control is about to open, in the reader's words. */
  destination_label: string;
  /** Why this is the most relevant evidence for this state. */
  basis: string;
}

/**
 * Pre-flight, the live readiness assessment outranks the seeded scenario verdict: it is CDI-04's
 * answer for the configuration currently on screen, where the verdict is the archetype's narrative.
 * A readiness that stops or qualifies the decision points at the evidence about that obstruction;
 * only when readiness is absent or clean does the verdict choose.
 */
function preFlightLens(
  readinessState?: string | null,
  verdict?: string | null
): { lens: DecisionAnalyticsLensId; basis: string } {
  switch (readinessState) {
    case 'DO_NOT_PROCEED':
      return {
        lens: 'OPPORTUNITY',
        basis: 'Readiness says do not proceed as configured, so the evidence that matters is where and when this campaign is deliverable at all.'
      };
    case 'REVIEW':
    case 'CONDITIONAL_GO':
      return {
        lens: 'FRONTIER',
        basis: 'Readiness leaves this decision qualified, so the evidence that matters is the competing options and the trade-off between them.'
      };
    default:
      break;
  }

  switch (verdict) {
    case 'SUPPLY INFEASIBLE':
      return {
        lens: 'OPPORTUNITY',
        basis: 'The campaign is not deliverable on current supply, so the evidence that matters is where a deliverable version of it exists.'
      };
    case 'MARGIN RISK':
    case 'RECONSIDER':
    case 'CONDITIONAL GO':
      return {
        lens: 'FRONTIER',
        basis: 'The verdict is contested, so the evidence that matters is the competing options and the trade-off between them.'
      };
    case 'ACCRETIVE GO':
    default:
      return {
        lens: 'DEMAND',
        basis: 'Nothing obstructs this decision, so the evidence that matters is the demand and elasticity behind the expected uplift.'
      };
  }
}

/** Everything in `all` except `chosen`, in declared order. */
function remaining(all: readonly string[], chosen: string): string[] {
  return all.filter(id => id !== chosen);
}

/**
 * The destination for "Explore Decision Analytics", for one mode and one state.
 *
 * Pre-flight this both selects the lens tab holding the relevant evidence and scrolls to the lens
 * section. In flight there are no tabs, so it scrolls to the deepest in-flight analysis the
 * campaign currently has.
 */
export function resolveDecisionAnalyticsTarget(
  state: DecisionAnalyticsState
): DecisionAnalyticsTarget {
  if (state.mode === 'DECISION_TWIN') {
    const hasOutlook = state.outlook_action != null;
    const momentCount = state.moment_count ?? 0;
    const outlookIsActionable =
      hasOutlook && (state.outlook_action === 'REVIEW' || state.outlook_action === 'PREPARE' || momentCount > 0);

    if (outlookIsActionable) {
      return {
        section_id: CAMPAIGN_OUTLOOK_SECTION_ID,
        fallback_section_ids: remaining(IN_FLIGHT_SECTION_IDS, CAMPAIGN_OUTLOOK_SECTION_ID),
        lens_id: null,
        destination_label: 'Campaign outlook and decision moments',
        basis:
          momentCount > 0
            ? 'The campaign has decision moments ahead of it, and they are the deepest analysis of what this decision now needs.'
            : 'The outlook asks for action now, so it is the analysis that matters before any day-level detail.'
      };
    }

    if (state.has_flight) {
      return {
        section_id: CAMPAIGN_TIMELINE_SECTION_ID,
        fallback_section_ids: remaining(IN_FLIGHT_SECTION_IDS, CAMPAIGN_TIMELINE_SECTION_ID),
        lens_id: null,
        destination_label: 'Continuous campaign timeline',
        basis:
          'Nothing is asking for a decision today, so the deeper evidence is the day-by-day trajectory against the activated decision.'
      };
    }

    return {
      section_id: IN_FLIGHT_DEVIATIONS_SECTION_ID,
      fallback_section_ids: remaining(IN_FLIGHT_SECTION_IDS, IN_FLIGHT_DEVIATIONS_SECTION_ID),
      lens_id: null,
      destination_label: 'Detected in-flight deviations',
      basis:
        'There is no governed timeline for this campaign, so the observed deviations are the only in-flight evidence there is.'
    };
  }

  const { lens, basis } = preFlightLens(state.readiness_state, state.decision_verdict);
  return {
    section_id: PRE_FLIGHT_LENSES_SECTION_ID,
    fallback_section_ids: remaining(PRE_FLIGHT_SECTION_IDS, PRE_FLIGHT_LENSES_SECTION_ID),
    lens_id: lens,
    destination_label: LENS_LABELS[lens],
    basis
  };
}

// ---------------------------------------------------------------------------
// Applying the destination
// ---------------------------------------------------------------------------

/** The part of `document` this needs, so the resolution can be exercised without a browser. */
export interface ScrollableDocument {
  getElementById(id: string): { scrollIntoView: (options?: any) => void } | null;
}

/**
 * Scroll to the resolved target, falling through the declared fallbacks if the page does not carry
 * it. Returns the section actually scrolled to, or null when none of them is on the page — a null
 * return is the dead-control condition and is what the regression suite asserts against.
 */
export function scrollToDecisionAnalyticsTarget(
  target: DecisionAnalyticsTarget,
  doc?: ScrollableDocument | null
): string | null {
  const d = doc ?? (typeof document !== 'undefined' ? (document as unknown as ScrollableDocument) : null);
  if (!d) return null;

  for (const id of [target.section_id, ...target.fallback_section_ids]) {
    const el = d.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return id;
    }
  }
  return null;
}
