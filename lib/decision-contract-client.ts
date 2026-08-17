/**
 * CDI-07A client surface — re-exports from campaign-intent-client for Canvas imports.
 */
export {
  createDecisionContractClient,
  getDecisionContractClient as fetchDecisionContractClient,
  getCurrentDecisionContractClient as fetchCurrentDecisionContractClient,
  assessDecisionValidityClient,
  withdrawDecisionContractClient
} from './campaign-intent-client';
