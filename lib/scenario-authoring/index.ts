/**
 * Scenario Authoring Domain (`SCI-07`) — the module `SCI-08` will consume.
 *
 * One entry point, so the authoring routes and the later authoring experience read the same
 * surface and neither reaches into the implementation. What is exported here IS the domain
 * behaviour `SCI-08` builds against; anything not exported is this packet's to change.
 */

export {
  SCENARIO_AUTHORING_VERSION,
  ScenarioAuthoringError,
  CONFIRMED_NOT_ACTIVE_NOTE,
  createDraft,
  updateDraft,
  assessDraft,
  getDraftAssessment,
  listDrafts,
  confirmDraft,
  withdrawDraft,
  recordDraftEnvelope,
  exportDraft,
  importDraft,
  type ScenarioDraftAssessment,
  type CreateDraftRequest,
  type UpdateDraftRequest,
  type ConfirmDraftRequest,
  type ConfirmDraftResult
} from './authoring-service';

export { scenarioDraftStore } from './draft-store';

export {
  resolveScenarioDraft,
  authoredScenarioIdFor,
  ScenarioDraftResolutionError,
  type ResolvedScenarioDraft
} from './draft-resolution';

export { assessDecisionCaseCoherence } from './draft-coherence';

export {
  assessCapabilityReadiness,
  describeScenarioProvenance,
  READINESS_INPUT_FIELDS
} from './draft-readiness';

export {
  listAuthorableProducts,
  authorableProduct,
  authorableCategories,
  type AuthorableProduct
} from './product-master';

export {
  openingPosturesFor,
  SITUATION_OPENING_POSTURES,
  AUTHORED_SCENARIO_PROVENANCE_STATEMENT,
  DEFAULT_AUTHORED_HISTORY_END_DATE
} from './scenario-model-defaults';

export {
  buildScenarioDraftPrompt,
  draftScenarioStructure,
  isScenarioDraftingConfigured,
  ScenarioDraftProviderFailedError,
  ScenarioDraftProviderUnavailableError,
  GEMINI_API_KEY_ENV_VAR,
  SCENARIO_DRAFT_RESPONSE_SCHEMA,
  type ScenarioDraftTransport,
  type ScenarioDraftProviderOptions
} from './genai-draft-provider';

export {
  parseScenarioDraftResponse,
  validateScenarioDraftProposals,
  validateNarrativeItems,
  validateNarrativeLine,
  MAX_MISSING_INFORMATION_ITEMS,
  looksLikeACredential,
  buildScenarioDraftEnvelope,
  type RawScenarioDraftResponse,
  type ValidatedProposals
} from './genai-draft-validation';
