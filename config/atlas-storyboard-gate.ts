/**
 * The Architectural Storyboard retirement gate, as governed data (ATL-FINAL, ADR-051).
 *
 * `SB-GATE` has been carried as prose across three reports, which is how a six-item checklist ends up
 * cited with three different scores in three places. It is now data: one record, read by the
 * Observability & Governance surface and asserted by test, so the storyboard's status cannot be
 * summarised differently depending on which document a reader opens.
 *
 * ADR-051 is unambiguous that the gate is not negotiable — *preserve architectural knowledge, not
 * obsolete storyboard implementation* — and the honest reading of the evidence is that three of six
 * conditions are met. The two that block retirement are not administrative: `SB-GATE-2` has two units
 * of architectural knowledge that exist nowhere, and `SB-GATE-5` has sixty narrative prose units that
 * were never migrated to Demo Path content. Both are content migration, which is a work package
 * rather than a closure pass. The storyboard is **retained**.
 */

export type GateState = 'met' | 'partially-met' | 'not-met';

export interface StoryboardGateCondition {
  gate_id: string;
  condition: string;
  state: GateState;
  /** What the state rests on, with the phase that established it. */
  basis: string;
  /** Present only where the gate is not met: exactly what is missing. */
  outstanding: string | null;
}

export const STORYBOARD_GATE: StoryboardGateCondition[] = [
  {
    gate_id: 'SB-GATE-1',
    condition: 'Both storyboard versions audited slide by slide, with a retain/discard decision per unit of knowledge',
    state: 'met',
    basis: 'ATL-01 — 26 slides audited across the 12-slide current and 14-slide historical versions',
    outstanding: null
  },
  {
    gate_id: 'SB-GATE-2',
    condition: 'Every retained unit of knowledge verifiably present at its destination',
    state: 'not-met',
    basis: 'ATL-04R — destinations created for the retained set, with two exceptions',
    outstanding: 'Two units have no home anywhere in the estate: the value framework (assessment §3.1) and the hub-and-spoke reuse model (§3.2).'
  },
  {
    gate_id: 'SB-GATE-3',
    condition: 'Destinations reachable from the Atlas or from governance, not only from a file',
    state: 'met',
    basis: 'ATL-04R — capability knowledge reachable through the seven areas partitioning the registry; platform architecture under Observability & Governance → Architecture',
    outstanding: null
  },
  {
    gate_id: 'SB-GATE-4',
    condition: 'Persona journeys, enterprise blueprint, recommendation lifecycle, governance-and-trust and constrained-reasoning narratives each have a named successor surface',
    state: 'partially-met',
    basis: 'ATL-04R — 11 of 12 narratives have a named successor',
    outstanding: 'Slides 6 and 7 remain orphaned; no successor surface is named for them.'
  },
  {
    gate_id: 'SB-GATE-5',
    condition: 'Presenter notes and demo timings preserved as Demo Path content',
    state: 'not-met',
    basis: 'ATL-04R explicitly did not attempt this and does not claim it',
    outstanding: 'Sixty narrative prose units were never migrated into Demo Path content. This is content migration, not a configuration change.'
  },
  {
    gate_id: 'SB-GATE-6',
    condition: 'Retirement proposed in a work package that also names what replaces the navigation entry',
    state: 'met',
    basis: 'ATL-04R — proposes eventual retirement and names Observability & Governance → Architecture as the successor',
    outstanding: null
  }
];

export const STORYBOARD_GATES_MET = STORYBOARD_GATE.filter(g => g.state === 'met').length;
export const STORYBOARD_GATE_TOTAL = STORYBOARD_GATE.length;

/**
 * ADR-051 requires **all six**. Partially met is not met — a narrative with no successor is a
 * narrative that disappears on the day the surface does.
 */
export const STORYBOARD_RETIREMENT_PERMITTED =
  STORYBOARD_GATE.every(g => g.state === 'met');

export const STORYBOARD_DISPOSITION = STORYBOARD_RETIREMENT_PERMITTED
  ? 'The gate is met; the Architectural Storyboard may be retired.'
  : `Retained. ${STORYBOARD_GATES_MET} of ${STORYBOARD_GATE_TOTAL} conditions are met, and ADR-051 requires all six. Retiring it now would discard architectural knowledge that exists nowhere else, which is the one outcome the gate was written to prevent.`;
