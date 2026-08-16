"use strict";
/**
 * CogniX External Signal Connector Contract (ESF-3)
 * Provider-neutral inbound envelope, connector registry descriptors, and validation helpers.
 *
 * Pipeline: External Source → Provider Adapter → Normalisation → Canonical EnterpriseSignal → Signal Fabric
 *
 * Vendor platforms (e.g. Blue Yonder, SAP IBP) are reference adapters only — never architectural dependencies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OBSERVATION_INDEPENDENT_SOURCE_TYPES = exports.EXTERNAL_SIGNAL_CATEGORIES = void 0;
exports.mapCategoryToSourceType = mapCategoryToSourceType;
exports.isObservationIndependentSourceType = isObservationIndependentSourceType;
exports.mapCategoryToSignalCategory = mapCategoryToSignalCategory;
exports.validateExternalSignalEnvelope = validateExternalSignalEnvelope;
exports.validateExternalSignalIngestRequest = validateExternalSignalIngestRequest;
exports.validateExternalSignalConnectorDescriptor = validateExternalSignalConnectorDescriptor;
exports.normaliseEnvelopeToEnterpriseSignal = normaliseEnvelopeToEnterpriseSignal;
const enterprise_signal_model_1 = require("./enterprise-signal-model");
exports.EXTERNAL_SIGNAL_CATEGORIES = [
    'PLANNING',
    'COMMERCE',
    'WEATHER',
    'EVENTS',
    'COMPETITIVE_INTEL',
    'OPERATIONAL_TELEMETRY',
    'DEMOGRAPHIC_CONTEXT'
];
/** Maps connector category → canonical SignalSourceType (provider-neutral). */
function mapCategoryToSourceType(category) {
    switch (category) {
        case 'PLANNING':
            return 'PLANNING_SYSTEM';
        case 'COMMERCE':
            return 'COMMERCE_TELEMETRY';
        case 'OPERATIONAL_TELEMETRY':
            return 'FULFILMENT_SYSTEM';
        case 'WEATHER':
        case 'EVENTS':
        case 'COMPETITIVE_INTEL':
        case 'DEMOGRAPHIC_CONTEXT':
            return 'EXTERNAL_CONNECTOR';
        default:
            return 'EXTERNAL_CONNECTOR';
    }
}
/**
 * Every SignalSourceType reachable from an ESF-3 connector category — provenances independent of
 * Shared Decision State. Derived from mapCategoryToSourceType so the two cannot drift (CDI-07B X1).
 */
exports.OBSERVATION_INDEPENDENT_SOURCE_TYPES = Array.from(new Set(exports.EXTERNAL_SIGNAL_CATEGORIES.map(mapCategoryToSourceType))).sort();
function isObservationIndependentSourceType(t) {
    return exports.OBSERVATION_INDEPENDENT_SOURCE_TYPES.includes(t);
}
/** Maps connector category → default EnterpriseSignal category. */
function mapCategoryToSignalCategory(category) {
    switch (category) {
        case 'PLANNING':
            return 'DEMAND';
        case 'COMMERCE':
            return 'CUSTOMER';
        case 'WEATHER':
            return 'DEMAND';
        case 'EVENTS':
            return 'DEMAND';
        case 'COMPETITIVE_INTEL':
            return 'COMMERCIAL';
        case 'OPERATIONAL_TELEMETRY':
            return 'FULFILMENT';
        case 'DEMOGRAPHIC_CONTEXT':
            return 'CUSTOMER';
        default:
            return 'DEMAND';
    }
}
function validateExternalSignalEnvelope(envelope) {
    const errors = [];
    if (!envelope.envelope_id)
        errors.push('Missing required field: envelope_id');
    if (!envelope.connector_id)
        errors.push('Missing required field: connector_id');
    if (!envelope.category)
        errors.push('Missing required field: category');
    if (!envelope.tenant_id)
        errors.push('Missing required field: tenant_id');
    if (!envelope.signal_type)
        errors.push('Missing required field: signal_type');
    if (!envelope.entity_type)
        errors.push('Missing required field: entity_type');
    if (!envelope.entity_id)
        errors.push('Missing required field: entity_id');
    if (!envelope.observed_at)
        errors.push('Missing required field: observed_at');
    if (typeof envelope.baseline_value !== 'number')
        errors.push('Missing required field: baseline_value');
    if (typeof envelope.observed_value !== 'number')
        errors.push('Missing required field: observed_value');
    if (!envelope.unit)
        errors.push('Missing required field: unit');
    if (!envelope.source_system)
        errors.push('Missing required field: source_system');
    if (typeof envelope.synthetic_demo !== 'boolean')
        errors.push('Missing required field: synthetic_demo');
    if (!envelope.schema_version)
        errors.push('Missing required field: schema_version');
    if (envelope.category && !exports.EXTERNAL_SIGNAL_CATEGORIES.includes(envelope.category)) {
        errors.push(`Unsupported external signal category: ${envelope.category}`);
    }
    if (typeof envelope.confidence === 'number' && (envelope.confidence < 0 || envelope.confidence > 100)) {
        errors.push('confidence must be a number between 0 and 100');
    }
    if (typeof envelope.quality === 'number' && (envelope.quality < 0 || envelope.quality > 100)) {
        errors.push('quality must be a number between 0 and 100');
    }
    // Guard against raw vendor payload leakage into the envelope contract
    const keys = Object.keys(envelope);
    if (keys.some(k => /raw_payload|vendor_payload|provider_body/i.test(k))) {
        errors.push('Provider-specific raw payloads are not permitted on ExternalSignalEnvelope');
    }
    const strPayload = JSON.stringify(envelope);
    if (/AIzaSy[A-Za-z0-9_-]{33}/.test(strPayload) || /"password"\s*:\s*"[^"]+"/.test(strPayload)) {
        errors.push('Security violation: Envelope payload contains credentials or sensitive tokens');
    }
    return { valid: errors.length === 0, errors };
}
function validateExternalSignalIngestRequest(request) {
    const errors = [];
    if (!request.tenant_id)
        errors.push('Missing required field: tenant_id');
    if (!Array.isArray(request.envelopes) || request.envelopes.length === 0) {
        errors.push('envelopes must be a non-empty array');
    }
    return { valid: errors.length === 0, errors };
}
function validateExternalSignalConnectorDescriptor(descriptor) {
    const errors = [];
    if (!descriptor.connector_id)
        errors.push('Missing required field: connector_id');
    if (!descriptor.category)
        errors.push('Missing required field: category');
    if (!descriptor.display_name)
        errors.push('Missing required field: display_name');
    if (!descriptor.provider_id)
        errors.push('Missing required field: provider_id');
    if (!descriptor.status)
        errors.push('Missing required field: status');
    if (!descriptor.adapter_version)
        errors.push('Missing required field: adapter_version');
    if (!Array.isArray(descriptor.supported_signal_types) || descriptor.supported_signal_types.length === 0) {
        errors.push('supported_signal_types must be a non-empty array');
    }
    if (typeof descriptor.synthetic_demo !== 'boolean')
        errors.push('Missing required field: synthetic_demo');
    if (descriptor.category && !exports.EXTERNAL_SIGNAL_CATEGORIES.includes(descriptor.category)) {
        errors.push(`Unsupported external signal category: ${descriptor.category}`);
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Pure normalisation: ExternalSignalEnvelope → EnterpriseSignal.
 * Preserves provenance; never copies provider-specific payload bodies.
 */
function normaliseEnvelopeToEnterpriseSignal(envelope, options) {
    const envelopeValidation = validateExternalSignalEnvelope(envelope);
    if (!envelopeValidation.valid) {
        return { ok: false, errors: envelopeValidation.errors };
    }
    const baseline = envelope.baseline_value;
    const observed = envelope.observed_value;
    const delta = observed - baseline;
    const delta_pct = baseline === 0 ? (observed === 0 ? 0 : 100) : Number(((delta / baseline) * 100).toFixed(4));
    const provenance = {
        connector_id: envelope.connector_id,
        external_category: envelope.category,
        envelope_id: envelope.envelope_id,
        normalisation: 'esf3_normaliser_v1.0.0',
        ...(envelope.session_id ? { session_id: envelope.session_id } : {}),
        ...(envelope.provider_payload_ref ? { provider_payload_ref: envelope.provider_payload_ref } : {}),
        ...(envelope.provenance || {})
    };
    const signal = {
        signal_id: options?.signal_id || `sig_ext_${envelope.envelope_id.replace(/^env_/, '')}`,
        signal_type: envelope.signal_type,
        category: options?.category_override || mapCategoryToSignalCategory(envelope.category),
        tenant_id: envelope.tenant_id,
        domain_id: envelope.domain_id,
        scenario_id: envelope.scenario_id,
        entity_type: envelope.entity_type,
        entity_id: envelope.entity_id,
        observed_at: envelope.observed_at,
        effective_at: envelope.effective_at || envelope.observed_at,
        baseline_value: baseline,
        observed_value: observed,
        delta,
        delta_pct,
        unit: envelope.unit,
        source_type: mapCategoryToSourceType(envelope.category),
        source_system: envelope.source_system,
        confidence: typeof envelope.confidence === 'number' ? envelope.confidence : 80,
        quality: typeof envelope.quality === 'number' ? envelope.quality : 85,
        provenance,
        synthetic_demo: envelope.synthetic_demo,
        schema_version: '1.0'
    };
    const signalValidation = (0, enterprise_signal_model_1.validateEnterpriseSignal)(signal);
    if (!signalValidation.valid) {
        return { ok: false, errors: signalValidation.errors };
    }
    return { ok: true, signal };
}
