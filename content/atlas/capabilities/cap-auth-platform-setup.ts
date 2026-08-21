/**
 * Capability knowledge — CAP-AUTH-PLATFORM-SETUP.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-AUTH-PLATFORM-SETUP',
  description:
    'Sign-in, registration, password recovery and the post-authentication setup step where a demonstrator selects role context and supplies a provider key that is never committed to the repository.',
  innovation_thesis:
    'A demonstration estate still needs real access control, and a provider key handled casually once will be handled casually forever.',
  usage_instructions:
    'Sign in, then complete platform setup by choosing a decision lens and, if AI narration is wanted, supplying a provider key for the session.',
  testing_instructions:
    'No dedicated runner exists. Recorded coverage gap.',
  architecture_narrative:
    'Auth routes call a configured external identity API. The provider key is supplied at setup and resolved server-side only; it is never written into the repository.',
  architecture_flow: [
    'Sign-in against the configured identity API',
    'Token validation',
    'Platform setup',
    'Role and provider key for the session'
  ],
  implementation_references: [
    { path: 'services/auth.service.ts', note: 'Auth service' },
    { path: 'config/routes.ts', symbol: 'apiRoutes', note: 'Auth route definitions' },
    { path: 'components/PlatformSetupPage.tsx', note: 'Setup surface' },
    { path: 'components/LoginPage.tsx', note: 'Sign-in surface' }
  ],
  validation_evidence: [
    { kind: 'code', ref: 'config/routes.ts', outcome: 'Auth endpoints declared against an external identity API.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md', outcome: 'Recorded as E-09.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  known_limitations: [
    { limitation: 'Authentication depends on an external identity API being configured; without it the estate cannot be signed into normally.', severity: 'high' },
    { limitation: 'No dedicated test runner covers the auth path.', severity: 'medium' }
  ],
  use_cases: [
    { title: 'Running a demonstration with real access control', context: 'A demo estate is left open.', outcome: 'Sign-in and setup gate the estate properly.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Setup before demonstration',
      audience: 'it_service_leader',
      duration_mins: 3,
      steps: [
        { action: 'Complete platform setup', what_to_say: 'The provider key is a session value. It is never committed and never leaves the server.', what_to_show: 'The setup step', expected_observation: 'Role context and key entry' }
      ],
      prerequisites: [],
      warnings: [
        'Never enter a production provider key into a shared demonstration environment.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Where does the API key live?', audience: 'cio', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'it_services', applicability: 'likely', rationale: 'Access control is industry-neutral.' },
    { domain_id: 'professional_services', applicability: 'hypothetical', rationale: 'Plausible; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-DOMAIN-PERSONA-CONTEXT', relation: 'enables' }
  ],
  related_decisions: [
    'ADR-044'
  ],
  related_governance: [
    'docs/governance/IP_GOVERNANCE.md'
  ],
});
