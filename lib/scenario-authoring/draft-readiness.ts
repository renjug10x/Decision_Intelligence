/**
 * Capability readiness for an authored scenario (`SCI-07`)
 * ───────────────────────────────────────────────────────────────────────────────
 * The domain half of what `SCI-08` will later present: for each business capability, can it
 * answer its question, and on what?
 *
 * The rule that makes the badge worth reading
 * -------------------------------------------
 * A readiness state is DERIVED from the provenance of the inputs the capability needs, and
 * from nothing else. It is not a score, not a confidence and not a judgement. That matters
 * because the failure mode here is obvious and tempting: fill every blank with a plausible
 * default and report `Ready`, at which point the badge means "the form is complete" and a
 * reader learns to ignore it. `COGNIX_SCENARIO_INTELLIGENCE.md` §6.1 is explicit that
 * `Modelled` means *a declared assumption stands in for absent evidence*, so a value the
 * model supplied reduces the state whether or not the scenario runs perfectly well on it.
 *
 * Why `stated` is not automatically `Ready`
 * -----------------------------------------
 * The vocabulary reserves `Ready` for observed or attested evidence. Applied literally, an
 * authored scenario could never be `Ready` for anything until `SCI-10` admits a file — which
 * is true of MEASUREMENTS and plainly wrong for DECLARATIONS. A person saying *"we committed
 * to 20% nationally for a fortnight"* is not estimating a reading; they are stating a
 * decision, and the decision is the evidence. So each input declares which kind it is
 * (`DRAFT_FIELD_EVIDENCE_KIND`), and only a MEASUREMENT supplied by assertion is demoted to
 * `Limited`.
 *
 * That distinction is also the honest answer to *"what would make this Ready?"* — an admitted
 * file for the measured inputs, which is `SCI-10`'s work and is named as such rather than
 * implied.
 */

import {
  DRAFT_FIELD_EVIDENCE_KIND,
  SCENARIO_CAPABILITIES,
  draftFieldEvidenceKind,
  scenarioDraftField,
  weakestReadiness,
  type CapabilityReadinessState,
  type ScenarioCapabilityReadiness,
  type ScenarioDraftFieldId,
  type ScenarioDraftFieldProvenance
} from '@/packages/contracts/src/scenario-draft-model';

/** Every input the capabilities name, which is what a caller needs to explain a badge. */
export const READINESS_INPUT_FIELDS: readonly ScenarioDraftFieldId[] = [
  ...new Set(SCENARIO_CAPABILITIES.flatMap(c => c.required_fields))
];

/**
 * The readiness one input earns from its provenance.
 *
 *   observed / attested            → Ready      (not reachable until `SCI-10`; declared here so
 *                                                the ladder is complete rather than truncated)
 *   stated, and a DECLARATION      → Ready      the person's statement IS the evidence
 *   stated, but a MEASUREMENT      → Limited    an assertion standing in for a reading
 *   derived                        → Ready      CogniX computed it from a governed master
 *   modelled                       → Modelled   a declared assumption stands in
 *   drafted                        → Modelled   a proposal nobody has confirmed is not evidence
 *   absent                         → Unavailable
 */
function readinessOfInput(
  field: ScenarioDraftFieldId,
  provenance: ScenarioDraftFieldProvenance | undefined
): CapabilityReadinessState {
  if (!provenance) return 'Unavailable';
  const { origin, authority } = provenance.descriptor;
  if (authority === 'non_authoritative_draft') return 'Modelled';
  switch (origin) {
    case 'observed':
    case 'attested':
      return 'Ready';
    case 'derived':
      return 'Ready';
    case 'stated':
      return draftFieldEvidenceKind(field) === 'MEASUREMENT' ? 'Limited' : 'Ready';
    case 'modelled':
      return 'Modelled';
    case 'drafted':
      return 'Modelled';
    default:
      return 'Unavailable';
  }
}

const READINESS_LANGUAGE: Readonly<Record<CapabilityReadinessState, string>> = {
  Ready: 'runs on what you supplied and on CogniX\'s own governed data',
  Limited: 'runs, and its result is bounded by figures you stated rather than measured',
  Modelled: 'runs on declared assumptions where you supplied nothing',
  Unavailable: 'cannot run yet'
};

/**
 * Readiness for every capability, derived from the resolved draft's field provenance.
 *
 * `structuralBlocks` carries anything that stops a capability running at all regardless of
 * provenance — an unmodellable situation, say. Passed in rather than discovered here, because
 * whether the signal fabric can serve a situation is a fact about the estate rather than
 * about the draft.
 */
export function assessCapabilityReadiness(
  fieldProvenance: readonly ScenarioDraftFieldProvenance[],
  structuralBlocks: Readonly<Partial<Record<string, string>>> = {}
): ScenarioCapabilityReadiness[] {
  const index = new Map(fieldProvenance.map(p => [p.field as string, p]));

  return SCENARIO_CAPABILITIES.map(capability => {
    const blocked = structuralBlocks[capability.id];
    if (blocked) {
      return {
        capability: capability.id,
        label: capability.label,
        question: capability.question,
        state: 'Unavailable' as const,
        reason: blocked,
        modelled_inputs: [],
        stated_in_place_of_measured: [],
        missing_inputs: []
      };
    }

    const modelled: ScenarioDraftFieldId[] = [];
    const statedNotMeasured: ScenarioDraftFieldId[] = [];
    const missing: ScenarioDraftFieldId[] = [];
    const states: CapabilityReadinessState[] = [];

    for (const field of capability.required_fields) {
      const provenance = index.get(field as string);
      const state = readinessOfInput(field, provenance);
      states.push(state);
      if (state === 'Unavailable') missing.push(field);
      else if (state === 'Modelled') modelled.push(field);
      else if (state === 'Limited') statedNotMeasured.push(field);
    }

    const state = weakestReadiness(states);
    return {
      capability: capability.id,
      label: capability.label,
      question: capability.question,
      state,
      reason: explainReadiness(capability.label, state, modelled, statedNotMeasured, missing),
      modelled_inputs: modelled,
      stated_in_place_of_measured: statedNotMeasured,
      missing_inputs: missing
    };
  });
}

function labelsOf(fields: readonly ScenarioDraftFieldId[]): string {
  return fields.map(f => scenarioDraftField(f as string)?.label ?? (f as string)).join(', ');
}

/** One sentence a business reader can act on. Never an empty reason. */
function explainReadiness(
  capabilityLabel: string,
  state: CapabilityReadinessState,
  modelled: readonly ScenarioDraftFieldId[],
  statedNotMeasured: readonly ScenarioDraftFieldId[],
  missing: readonly ScenarioDraftFieldId[]
): string {
  const head = `${capabilityLabel} ${READINESS_LANGUAGE[state]}`;
  if (state === 'Unavailable') {
    return `${head} — it still needs ${labelsOf(missing)}.`;
  }
  if (state === 'Modelled') {
    return `${head}: ${labelsOf(modelled)} ${modelled.length === 1 ? 'stands' : 'stand'} on a declared assumption. `
      + 'Supply it and the assumption goes away.';
  }
  if (state === 'Limited') {
    return `${head}: ${labelsOf(statedNotMeasured)} ${statedNotMeasured.length === 1 ? 'was' : 'were'} stated rather `
      + 'than measured. Admitting observed data for it would make this fully evidenced.';
  }
  return `${head}.`;
}

/**
 * The one-sentence provenance statement ADR-082 part 3 asks the vocabulary to reduce to.
 *
 * Built from what the resolution actually did rather than written as marketing copy, which is
 * why it names the fields it names: *"the promotion intent was stated by the user; supplier
 * capacity is modelled; the summary was drafted by AI; the economics were calculated by
 * CogniX."*
 */
export function describeScenarioProvenance(
  fieldProvenance: readonly ScenarioDraftFieldProvenance[]
): string {
  const byOrigin = new Map<string, string[]>();
  for (const entry of fieldProvenance) {
    const label = scenarioDraftField(entry.field as string)?.label ?? (entry.field as string);
    const key = entry.drafted_by_model ? 'drafted' : entry.descriptor.origin;
    byOrigin.set(key, [...(byOrigin.get(key) ?? []), label.toLowerCase()]);
  }

  const clauses: string[] = [];
  const stated = byOrigin.get('stated');
  if (stated?.length) clauses.push(`${listOf(stated)} ${stated.length === 1 ? 'was' : 'were'} stated by you`);
  const drafted = byOrigin.get('drafted');
  if (drafted?.length) clauses.push(`${listOf(drafted)} ${drafted.length === 1 ? 'was' : 'were'} drafted by AI and kept by you`);
  const modelled = byOrigin.get('modelled');
  if (modelled?.length) clauses.push(`${listOf(modelled)} ${modelled.length === 1 ? 'is' : 'are'} modelled`);
  const derived = byOrigin.get('derived');
  if (derived?.length) clauses.push(`${listOf(derived)} ${derived.length === 1 ? 'is' : 'are'} derived by CogniX`);

  clauses.push('every published quantity — demand, exposure, revenue and margin — is calculated by CogniX engines');
  return `${clauses.join('; ')}.`;
}

function listOf(items: readonly string[], max = 3): string {
  if (items.length <= max) {
    return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
  }
  return `${items.slice(0, max).join(', ')} and ${items.length - max} more`;
}

/** Re-exported so a consumer need not reach into the contract for the evidence-kind table. */
export { DRAFT_FIELD_EVIDENCE_KIND };
