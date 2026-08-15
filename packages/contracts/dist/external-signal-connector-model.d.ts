/**
 * CogniX External Signal Connector Contract (ESF-3)
 * Provider-neutral inbound envelope, connector registry descriptors, and validation helpers.
 *
 * Pipeline: External Source → Provider Adapter → Normalisation → Canonical EnterpriseSignal → Signal Fabric
 *
 * Vendor platforms (e.g. Blue Yonder, SAP IBP) are reference adapters only — never architectural dependencies.
 */
import { CanonicalSignalType, EnterpriseSignal, SignalCategory, SignalEntityType, SignalSourceType } from './enterprise-signal-model';
/** Provider-neutral external feed categories supported by ESF-3. */
export type ExternalSignalCategory = 'PLANNING' | 'COMMERCE' | 'WEATHER' | 'EVENTS' | 'COMPETITIVE_INTEL' | 'OPERATIONAL_TELEMETRY' | 'DEMOGRAPHIC_CONTEXT';
export type ExternalSignalConnectorStatus = 'AVAILABLE' | 'DISABLED' | 'DEGRADED';
/**
 * Registry descriptor for a connector. Provider identity is opaque and non-architectural.
 * `provider_id` values such as `reference_planning` or `vendor_blue_yonder_ref` are labels only.
 */
export interface ExternalSignalConnectorDescriptor {
    connector_id: string;
    category: ExternalSignalCategory;
    display_name: string;
    provider_id: string;
    supported_signal_types: CanonicalSignalType[];
    status: ExternalSignalConnectorStatus;
    synthetic_demo: boolean;
    adapter_version: string;
    schema_version: string;
}
/**
 * Provider-neutral inbound envelope.
 * Adapters map vendor/native payloads into this shape before normalisation.
 * Raw provider payloads MUST NOT appear on the canonical EnterpriseSignal path —
 * only an opaque reference may be retained for provenance.
 */
export interface ExternalSignalEnvelope {
    envelope_id: string;
    connector_id: string;
    category: ExternalSignalCategory;
    tenant_id: string;
    session_id?: string;
    domain_id?: string;
    scenario_id?: string;
    signal_type: CanonicalSignalType;
    entity_type: SignalEntityType;
    entity_id: string;
    observed_at: string;
    effective_at?: string;
    baseline_value: number;
    observed_value: number;
    unit: string;
    confidence?: number;
    quality?: number;
    /** Opaque provider payload reference — never the raw vendor body. */
    provider_payload_ref?: string;
    source_system: string;
    provenance?: Record<string, string>;
    synthetic_demo: boolean;
    schema_version: string;
}
export interface ExternalSignalIngestRequest {
    tenant_id: string;
    session_id?: string;
    envelopes: ExternalSignalEnvelope[];
}
export interface ExternalSignalIngestRejection {
    envelope_id?: string;
    connector_id?: string;
    reason: string;
}
export interface ExternalSignalIngestResponse {
    ingest_id: string;
    tenant_id: string;
    accepted_count: number;
    rejected_count: number;
    signals: EnterpriseSignal[];
    rejections: ExternalSignalIngestRejection[];
    timestamp: string;
    schema_version: string;
}
export declare const EXTERNAL_SIGNAL_CATEGORIES: ExternalSignalCategory[];
/** Maps connector category → canonical SignalSourceType (provider-neutral). */
export declare function mapCategoryToSourceType(category: ExternalSignalCategory): SignalSourceType;
/** Maps connector category → default EnterpriseSignal category. */
export declare function mapCategoryToSignalCategory(category: ExternalSignalCategory): SignalCategory;
export declare function validateExternalSignalEnvelope(envelope: Partial<ExternalSignalEnvelope>): {
    valid: boolean;
    errors: string[];
};
export declare function validateExternalSignalIngestRequest(request: Partial<ExternalSignalIngestRequest>): {
    valid: boolean;
    errors: string[];
};
export declare function validateExternalSignalConnectorDescriptor(descriptor: Partial<ExternalSignalConnectorDescriptor>): {
    valid: boolean;
    errors: string[];
};
/**
 * Pure normalisation: ExternalSignalEnvelope → EnterpriseSignal.
 * Preserves provenance; never copies provider-specific payload bodies.
 */
export declare function normaliseEnvelopeToEnterpriseSignal(envelope: ExternalSignalEnvelope, options?: {
    signal_id?: string;
    category_override?: SignalCategory;
}): {
    ok: true;
    signal: EnterpriseSignal;
} | {
    ok: false;
    errors: string[];
};
