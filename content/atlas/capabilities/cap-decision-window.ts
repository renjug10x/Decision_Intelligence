/**
 * Capability knowledge — CAP-DECISION-WINDOW (DDF-01, supporting).
 * ATL-02 seed content. This record exists partly to prove that a partially-implemented
 * capability carries honest field-level status and non-empty demo warnings (V7, V12).
 */
import type { CapabilityKnowledge } from '../../../packages/contracts/src/capability-atlas-model';

export const knowledge: CapabilityKnowledge = {
  capability_id: 'CAP-DECISION-WINDOW',
  description:
    'The Decision Window states until when the current option remains open, derived from a declared operational constraint such as a supplier order cut-off. Where no constraint is declared the window is INDETERMINATE and no countdown, clock, progress bar or decay animation renders.',
  innovation_thesis:
    'A gap without time is not actionable. But a countdown invented from how fast value is eroding is a decay curve wearing a deadline’s clothes. Deriving the window from a declared constraint makes the claim inspectable: the client sees what closes the window.',
  usage_instructions:
    'Open the Demand & Forecast surface. Where a constraint is declared, the window renders with the constraint named on disclosure. Where none is declared, the surface shows INDETERMINATE and draws no timer.',
  testing_instructions:
    'Run `npx tsx tests/unit/run-ddf01-tests.ts`. The window assertions verify the fail-closed predicate: no declared constraint yields INDETERMINATE with no duration published.',
  field_status: [
    {
      field: 'window_duration',
      implementation_status: 'simulated',
      note: 'Every DeclaredInterventionConstraint in the current estate carries basis MODELLED_DEMO_ASSUMPTION. A modelled deadline is labelled as modelled and is never presented as an observed operational fact (ADR-042).'
    }
  ],
  architecture_narrative:
    'A fail-closed predicate: a duration is publishable if and only if it derives from a declared constraint carrying a constraint kind, a named declaring party and a basis class. Absence is shown, never filled.',
  architecture_flow: [
    'DeclaredInterventionConstraint (declared, not inferred)',
    'Basis classification: DECLARED_OPERATIONAL_CONSTRAINT or MODELLED_DEMO_ASSUMPTION',
    'Window computation, or INDETERMINATE',
    'Decision-frontier marker on the trajectory chart'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/demand-frontier/evaluate', purpose: 'Evaluate the frontier including the decision window' }
  ],
  contracts: [
    { name: 'DemandDecisionWindow', path: 'packages/contracts/src/demand-decision-frontier-model.ts', direction: 'out' }
  ],
  data_sources: [
    { name: 'Declared intervention constraint', kind: 'static', path: 'lib/demand-decision-frontier/demand-frontier-engine.ts' }
  ],
  implementation_references: [
    { path: 'lib/demand-decision-frontier/demand-frontier-engine.ts', symbol: 'evaluateDecisionWindow' },
    { path: 'packages/contracts/src/demand-decision-frontier-model.ts' }
  ],
  validation_evidence: [
    {
      kind: 'test',
      ref: 'tests/unit/run-ddf01-tests.ts',
      outcome: 'With no declared constraint the window is INDETERMINATE and publishes no duration.',
      observed_at: '2026-08-16',
      observed_by: 'DDF-01 integration pass'
    }
  ],
  test_runners: ['tests/unit/run-ddf01-tests.ts'],
  acceptance_criteria_refs: [],
  known_limitations: [
    {
      limitation: 'No observed operational cut-off exists in the estate. Every window shown today rests on a modelled demo assumption.',
      severity: 'high',
      applies_to: 'window_duration'
    },
    {
      limitation: 'The window must never share an indicator with, or be labelled as, CDI-07A Decision Half-Life validity. They measure different things (ADR-042).',
      severity: 'high'
    }
  ],
  open_defects: [],
  assumptions: ['A future integration supplying a genuine cut-off changes only the basis class, not the contract shape or the UI.'],
  use_cases: [
    {
      title: 'Knowing how long the option stays open',
      context: 'A gap has been identified but nobody knows how long there is to act on it.',
      outcome: 'The window names the constraint that closes the option and when.'
    }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'What closes this window?',
      audience: 'exec',
      duration_mins: 3,
      steps: [
        {
          action: 'Show the window and expand the constraint',
          what_to_say: 'The deadline is not a timer we invented. It is a declared constraint, and here it is.',
          what_to_show: 'The named constraint behind the window',
          expected_observation: 'A named constraint with its basis class visible'
        }
      ],
      prerequisites: ['A declared intervention constraint present in the scenario'],
      warnings: [
        'MANDATORY: state that the constraint is a modelled demo assumption, not an observed operational cut-off. Presenting it as real is the failure mode ADR-042 exists to prevent.',
        'Do not describe the window as the decision "expiring" — that is Decision Half-Life, a different artefact.'
      ],
      follow_ups: ['CAP-DECISION-REGRET']
    }
  ],
  questions_worth_asking: [],
  client_questions: [
    { question: 'Where does that deadline come from?', audience: 'coo', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'transport_logistics', applicability: 'likely', rationale: 'Operational cut-offs are the norm in logistics scheduling.' },
    { domain_id: 'cpg', applicability: 'not-assessed', rationale: 'No reuse assessment has been performed.' }
  ],
  external_evidence: [],
  related_capabilities: [
    { ref: 'CAP-DECISION-GAP', relation: 'complements' }
  ],
  related_decisions: ['ADR-042'],
  related_governance: ['docs/ux/UX_DESIGN_PRINCIPLES.md']
};
