/**
 * CogniX ESF-3 External Signal Connector Runtime
 * Provider-neutral registry, reference adapters, ingest normalisation, and tenant-scoped store.
 *
 * Pipeline: External Source → Provider Adapter → Normalisation → Canonical EnterpriseSignal → Signal Fabric
 *
 * All reference adapters emit synthetic_demo=true identifiable feeds. No production credentials.
 */

import {
  CanonicalSignalType,
  EnterpriseSignal,
  ExternalSignalConnectorDescriptor,
  ExternalSignalEnvelope,
  ExternalSignalIngestRejection,
  ExternalSignalIngestRequest,
  ExternalSignalIngestResponse,
  normaliseEnvelopeToEnterpriseSignal,
  validateExternalSignalConnectorDescriptor,
  validateExternalSignalEnvelope,
  validateExternalSignalIngestRequest
} from '../../../packages/contracts/src/index';

export const ESF3_ADAPTER_VERSION = 'esf3_adapter_v1.0.0';
export const ESF3_SCHEMA_VERSION = '1.0';

/** Built-in provider-neutral reference connector registry (synthetic/demo only). */
export const REFERENCE_CONNECTOR_REGISTRY: ExternalSignalConnectorDescriptor[] = [
  {
    connector_id: 'conn_planning_ref_01',
    category: 'PLANNING',
    display_name: 'Reference Planning Feed',
    provider_id: 'reference_planning',
    supported_signal_types: ['FORECAST_DIVERGENCE', 'CATEGORY_DEMAND_ACCELERATION', 'REGIONAL_DEMAND_SHIFT'],
    status: 'AVAILABLE',
    synthetic_demo: true,
    adapter_version: ESF3_ADAPTER_VERSION,
    schema_version: ESF3_SCHEMA_VERSION
  },
  {
    connector_id: 'conn_commerce_ref_01',
    category: 'COMMERCE',
    display_name: 'Reference Commerce Telemetry Feed',
    provider_id: 'reference_commerce',
    supported_signal_types: [
      'SEARCH_VELOCITY_ACCELERATION',
      'BASKET_ADD_ACCELERATION',
      'PRODUCT_ENGAGEMENT_ACCELERATION',
      'SLOT_BOOKING_PRESSURE'
    ],
    status: 'AVAILABLE',
    synthetic_demo: true,
    adapter_version: ESF3_ADAPTER_VERSION,
    schema_version: ESF3_SCHEMA_VERSION
  },
  {
    connector_id: 'conn_weather_ref_01',
    category: 'WEATHER',
    display_name: 'Reference Weather Context Feed',
    provider_id: 'reference_weather',
    supported_signal_types: ['WEATHER_TEMPERATURE_ANOMALY', 'WEATHER_PRECIPITATION_SHIFT'],
    status: 'AVAILABLE',
    synthetic_demo: true,
    adapter_version: ESF3_ADAPTER_VERSION,
    schema_version: ESF3_SCHEMA_VERSION
  },
  {
    connector_id: 'conn_events_ref_01',
    category: 'EVENTS',
    display_name: 'Reference Local Events Feed',
    provider_id: 'reference_events',
    supported_signal_types: ['LOCAL_EVENT_DEMAND_SURGE', 'PAYDAY_CALENDAR_EFFECT'],
    status: 'AVAILABLE',
    synthetic_demo: true,
    adapter_version: ESF3_ADAPTER_VERSION,
    schema_version: ESF3_SCHEMA_VERSION
  },
  {
    connector_id: 'conn_competitive_ref_01',
    category: 'COMPETITIVE_INTEL',
    display_name: 'Reference Competitive Intelligence Feed',
    provider_id: 'reference_competitive_intel',
    supported_signal_types: ['COMPETITOR_CAMPAIGN_LAUNCH', 'MARGIN_COMPRESSION', 'PROMOTION_CANNIBALISATION'],
    status: 'AVAILABLE',
    synthetic_demo: true,
    adapter_version: ESF3_ADAPTER_VERSION,
    schema_version: ESF3_SCHEMA_VERSION
  },
  {
    connector_id: 'conn_ops_telemetry_ref_01',
    category: 'OPERATIONAL_TELEMETRY',
    display_name: 'Reference Operational Telemetry Feed',
    provider_id: 'reference_operational_telemetry',
    supported_signal_types: [
      'CFC_THROUGHPUT_PRESSURE',
      'FULFILMENT_QUEUE_GROWTH',
      'DELIVERY_SLOT_SATURATION',
      'TRANSPORT_CAPACITY_PRESSURE'
    ],
    status: 'AVAILABLE',
    synthetic_demo: true,
    adapter_version: ESF3_ADAPTER_VERSION,
    schema_version: ESF3_SCHEMA_VERSION
  },
  {
    connector_id: 'conn_demographic_ref_01',
    category: 'DEMOGRAPHIC_CONTEXT',
    display_name: 'Reference Demographic / Customer Context Feed',
    provider_id: 'reference_demographic',
    supported_signal_types: ['DEMOGRAPHIC_MISSION_SHIFT', 'CAMPAIGN_RESPONSE_ACCELERATION'],
    status: 'AVAILABLE',
    synthetic_demo: true,
    adapter_version: ESF3_ADAPTER_VERSION,
    schema_version: ESF3_SCHEMA_VERSION
  }
];

/** Optional vendor-labelled reference aliases — demonstrative labels only, not hard dependencies. */
export const VENDOR_REFERENCE_ALIASES: Record<string, string> = {
  vendor_blue_yonder_ref: 'conn_planning_ref_01',
  vendor_sap_ibp_ref: 'conn_planning_ref_01'
};

const connectorById = new Map<string, ExternalSignalConnectorDescriptor>(
  REFERENCE_CONNECTOR_REGISTRY.map(c => [c.connector_id, c])
);

/**
 * LAB FIXTURE ONLY — not an attestation and not the ESF-6 connector registration path.
 *
 * `determineObservationAuthority` reads connector resolution and `synthetic_demo` to decide
 * AUTHORITATIVE_EXTERNAL, so an unguarded registration path would let a caller assert authority
 * over a connector nobody attested — the exact defect ESF-6 / Y3a exists to close, and explicitly
 * out of CDI-08 scope (gate §2). It exists so the CDI-08 suite can demonstrate the A-08 and A-20
 * unlocks, which require an observation that clears C1.
 *
 * The mandatory acknowledgement literal makes the call impossible to reach accidentally and makes
 * every call site self-declaring. Attested registration is ESF-6; this is superseded when it lands.
 */
export function registerExternalSignalConnector(
  descriptor: ExternalSignalConnectorDescriptor,
  lab_fixture_acknowledgement: 'LAB_FIXTURE_NOT_AN_ATTESTATION'
): void {
  if (lab_fixture_acknowledgement !== 'LAB_FIXTURE_NOT_AN_ATTESTATION') return;
  connectorById.set(descriptor.connector_id, descriptor);
}

/** In-memory tenant-scoped store of connector-ingested signals (session-optional). */
const ingestedByTenant = new Map<string, EnterpriseSignal[]>();

function tenantSessionKey(tenantId: string, sessionId?: string): string {
  return sessionId ? `${tenantId}::${sessionId}` : tenantId;
}

export function listExternalSignalConnectors(options?: {
  category?: string;
  status?: string;
}): ExternalSignalConnectorDescriptor[] {
  let list = [...REFERENCE_CONNECTOR_REGISTRY];
  if (options?.category) {
    list = list.filter(c => c.category === options.category);
  }
  if (options?.status) {
    list = list.filter(c => c.status === options.status);
  }
  return list;
}

export function getExternalSignalConnector(connectorId: string): ExternalSignalConnectorDescriptor | undefined {
  const aliasTarget = VENDOR_REFERENCE_ALIASES[connectorId];
  if (aliasTarget) return connectorById.get(aliasTarget);
  return connectorById.get(connectorId);
}

export function resolveConnectorId(connectorId: string): string {
  return VENDOR_REFERENCE_ALIASES[connectorId] || connectorId;
}

/**
 * Reference adapter: maps a minimal provider-neutral observation into an ExternalSignalEnvelope.
 * Deterministic for identical inputs. Always marks synthetic_demo=true for lab adapters.
 */
export function adaptReferenceObservation(input: {
  connector_id: string;
  tenant_id: string;
  session_id?: string;
  scenario_id?: string;
  domain_id?: string;
  signal_type: CanonicalSignalType;
  entity_type: ExternalSignalEnvelope['entity_type'];
  entity_id: string;
  observed_at: string;
  baseline_value: number;
  observed_value: number;
  unit: string;
  provider_payload_ref?: string;
  envelope_id?: string;
}): { ok: true; envelope: ExternalSignalEnvelope } | { ok: false; errors: string[] } {
  const resolvedId = resolveConnectorId(input.connector_id);
  const connector = connectorById.get(resolvedId);
  if (!connector) {
    return { ok: false, errors: [`Unknown connector_id: ${input.connector_id}`] };
  }
  if (connector.status === 'DISABLED') {
    return { ok: false, errors: [`Connector is DISABLED: ${connector.connector_id}`] };
  }
  if (!connector.supported_signal_types.includes(input.signal_type)) {
    return {
      ok: false,
      errors: [
        `Signal type ${input.signal_type} is not supported by connector ${connector.connector_id} (${connector.category})`
      ]
    };
  }

  const envelope: ExternalSignalEnvelope = {
    envelope_id: input.envelope_id || `env_${connector.category.toLowerCase()}_${input.entity_id}_${input.signal_type}`.replace(/\s+/g, '_'),
    connector_id: connector.connector_id,
    category: connector.category,
    tenant_id: input.tenant_id,
    session_id: input.session_id,
    domain_id: input.domain_id || 'retail_grocery',
    scenario_id: input.scenario_id,
    signal_type: input.signal_type,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    observed_at: input.observed_at,
    effective_at: input.observed_at,
    baseline_value: input.baseline_value,
    observed_value: input.observed_value,
    unit: input.unit,
    confidence: 82,
    quality: 88,
    provider_payload_ref: input.provider_payload_ref || `pref_${connector.provider_id}_${input.signal_type}`,
    source_system: `${connector.provider_id}_adapter`,
    provenance: {
      provider_id: connector.provider_id,
      adapter_version: connector.adapter_version,
      synthetic_marker: 'SYNTHETIC_REFERENCE_ADAPTER'
    },
    synthetic_demo: true,
    schema_version: ESF3_SCHEMA_VERSION
  };

  const validation = validateExternalSignalEnvelope(envelope);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  return { ok: true, envelope };
}

/**
 * Ingest envelopes: validate connector registration, normalise to EnterpriseSignal, store by tenant/session.
 */
export function ingestExternalSignals(request: ExternalSignalIngestRequest): ExternalSignalIngestResponse {
  const requestValidation = validateExternalSignalIngestRequest(request);
  if (!requestValidation.valid) {
    throw new Error(requestValidation.errors.join('; '));
  }

  const signals: EnterpriseSignal[] = [];
  // Each accepted signal is stored under the session that actually owns it (envelope session takes
  // precedence over request session), so a session-scoped read can never observe another session's feed.
  const pendingStore: Array<{ sessionId?: string; signal: EnterpriseSignal }> = [];
  const rejections: ExternalSignalIngestRejection[] = [];
  const ingestId = `ingest_${request.tenant_id}_${Date.now()}`;

  for (const envelope of request.envelopes) {
    if (envelope.tenant_id !== request.tenant_id) {
      rejections.push({
        envelope_id: envelope.envelope_id,
        connector_id: envelope.connector_id,
        reason: `Tenant boundary violation: envelope tenant_id (${envelope.tenant_id}) != request tenant_id (${request.tenant_id})`
      });
      continue;
    }

    if (request.session_id && envelope.session_id && envelope.session_id !== request.session_id) {
      rejections.push({
        envelope_id: envelope.envelope_id,
        connector_id: envelope.connector_id,
        reason: `Session boundary violation: envelope session_id (${envelope.session_id}) != request session_id (${request.session_id})`
      });
      continue;
    }

    const resolvedId = resolveConnectorId(envelope.connector_id);
    const connector = connectorById.get(resolvedId);
    if (!connector) {
      rejections.push({
        envelope_id: envelope.envelope_id,
        connector_id: envelope.connector_id,
        reason: `Unknown or unregistered connector_id: ${envelope.connector_id}`
      });
      continue;
    }

    if (connector.status === 'DISABLED') {
      rejections.push({
        envelope_id: envelope.envelope_id,
        connector_id: envelope.connector_id,
        reason: `Connector DISABLED: ${connector.connector_id}`
      });
      continue;
    }

    if (envelope.category !== connector.category) {
      rejections.push({
        envelope_id: envelope.envelope_id,
        connector_id: envelope.connector_id,
        reason: `Category mismatch: envelope=${envelope.category}, connector=${connector.category}`
      });
      continue;
    }

    if (!connector.supported_signal_types.includes(envelope.signal_type)) {
      rejections.push({
        envelope_id: envelope.envelope_id,
        connector_id: envelope.connector_id,
        reason: `Unsupported signal_type ${envelope.signal_type} for connector ${connector.connector_id}`
      });
      continue;
    }

    // Ensure connector_id is canonical (vendor alias resolved) before normalisation
    const normalisedEnvelope: ExternalSignalEnvelope = {
      ...envelope,
      connector_id: connector.connector_id,
      session_id: envelope.session_id || request.session_id,
      provenance: {
        ...(envelope.provenance || {}),
        provider_id: connector.provider_id,
        adapter_version: connector.adapter_version
      }
    };

    const result = normaliseEnvelopeToEnterpriseSignal(normalisedEnvelope);
    if (!result.ok) {
      rejections.push({
        envelope_id: envelope.envelope_id,
        connector_id: envelope.connector_id,
        reason: result.errors.join('; ')
      });
      continue;
    }

    // Reject any accidental provider body leakage into provenance keys
    const provenanceKeys = Object.keys(result.signal.provenance);
    if (provenanceKeys.some(k => /raw_payload|vendor_payload|provider_body/i.test(k))) {
      rejections.push({
        envelope_id: envelope.envelope_id,
        connector_id: envelope.connector_id,
        reason: 'Normalisation rejected: provider-specific payload leaked into provenance'
      });
      continue;
    }

    signals.push(result.signal);
    pendingStore.push({ sessionId: normalisedEnvelope.session_id, signal: result.signal });
  }

  for (const { sessionId, signal } of pendingStore) {
    const key = tenantSessionKey(request.tenant_id, sessionId);
    const existing = ingestedByTenant.get(key) || [];
    ingestedByTenant.set(key, [...existing, signal]);
  }

  return {
    ingest_id: ingestId,
    tenant_id: request.tenant_id,
    accepted_count: signals.length,
    rejected_count: rejections.length,
    signals,
    rejections,
    timestamp: new Date().toISOString(),
    schema_version: ESF3_SCHEMA_VERSION
  };
}

export function listIngestedExternalSignals(tenantId: string, sessionId?: string): EnterpriseSignal[] {
  const key = tenantSessionKey(tenantId, sessionId);
  const scoped = ingestedByTenant.get(key) || [];
  // Also include tenant-wide (no session) when querying with session
  if (sessionId) {
    const tenantWide = ingestedByTenant.get(tenantId) || [];
    return [...tenantWide, ...scoped].filter(s => s.tenant_id === tenantId);
  }
  return scoped.filter(s => s.tenant_id === tenantId);
}

/** Test helper — clears in-memory ingest store. */
export function resetExternalSignalIngestStore(): void {
  ingestedByTenant.clear();
}

export function assertConnectorRegistryIntegrity(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const descriptor of REFERENCE_CONNECTOR_REGISTRY) {
    const result = validateExternalSignalConnectorDescriptor(descriptor);
    if (!result.valid) {
      errors.push(`${descriptor.connector_id}: ${result.errors.join('; ')}`);
    }
  }
  const categories = new Set(REFERENCE_CONNECTOR_REGISTRY.map(c => c.category));
  const required = [
    'PLANNING',
    'COMMERCE',
    'WEATHER',
    'EVENTS',
    'COMPETITIVE_INTEL',
    'OPERATIONAL_TELEMETRY',
    'DEMOGRAPHIC_CONTEXT'
  ];
  for (const cat of required) {
    if (!categories.has(cat as ExternalSignalConnectorDescriptor['category'])) {
      errors.push(`Missing required connector category: ${cat}`);
    }
  }
  return { valid: errors.length === 0, errors };
}
