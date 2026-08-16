"use strict";
/**
 * CogniX ESF-6 / Y3a — Attested Observation Admission Model
 *
 * Predicate: source × context → authority
 * Authority derives from server-side registry state; request payload cannot create authority.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATTESTED_OBSERVATION_SCHEMA_VERSION = exports.RESERVED_SERVER_FIELD_NAMES = exports.RESERVED_SERVER_PREFIXES = void 0;
exports.checkNoReservedServerFields = checkNoReservedServerFields;
exports.validateSourceAttestation = validateSourceAttestation;
exports.validateAttestedObservationSource = validateAttestedObservationSource;
exports.validateServerReceipt = validateServerReceipt;
exports.RESERVED_SERVER_PREFIXES = ['asrc_', 'att_', 'rcpt_'];
exports.RESERVED_SERVER_FIELD_NAMES = [
    'attestation_id',
    'admission_receipt_id',
    'receipt_id',
    'sequence'
];
exports.ATTESTED_OBSERVATION_SCHEMA_VERSION = 'cognix.esf6.attested_observation.v1';
/**
 * Validates whether an arbitrary payload contains prohibited server-issued fields or values.
 * Fails closed if any field asserts a reserved prefix or reserved field name.
 */
function checkNoReservedServerFields(payload, allowedFieldNames = []) {
    const errors = [];
    if (!payload || typeof payload !== 'object') {
        return { ok: true, errors: [] };
    }
    function inspect(obj, path) {
        if (!obj || typeof obj !== 'object')
            return;
        if (Array.isArray(obj)) {
            obj.forEach((item, idx) => inspect(item, `${path}[${idx}]`));
            return;
        }
        const record = obj;
        for (const [key, value] of Object.entries(record)) {
            const currentPath = path ? `${path}.${key}` : key;
            // Check if key is a reserved server field
            if (exports.RESERVED_SERVER_FIELD_NAMES.includes(key) &&
                !allowedFieldNames.includes(key)) {
                errors.push(`SERVER_FIELD_ASSERTED: Reserved field '${key}' asserted at ${currentPath}`);
            }
            // Check if value is a string with a reserved prefix
            if (typeof value === 'string') {
                for (const prefix of exports.RESERVED_SERVER_PREFIXES) {
                    if (value.startsWith(prefix) && !allowedFieldNames.includes(key)) {
                        errors.push(`SERVER_FIELD_ASSERTED: Value with reserved prefix '${prefix}' asserted at ${currentPath}: '${value}'`);
                    }
                }
            }
            else if (typeof value === 'object' && value !== null) {
                inspect(value, currentPath);
            }
        }
    }
    inspect(payload, '');
    return { ok: errors.length === 0, errors };
}
/**
 * Validates a SourceAttestation payload.
 */
function validateSourceAttestation(attestation) {
    const errors = [];
    if (!attestation || typeof attestation !== 'object') {
        return { valid: false, errors: ['attestation must be an object'] };
    }
    const a = attestation;
    if (!a.attested_by || typeof a.attested_by !== 'string' || !a.attested_by.trim()) {
        errors.push('attested_by is required and cannot be empty after trim');
    }
    if (!a.attestation_statement || typeof a.attestation_statement !== 'string' || !a.attestation_statement.trim()) {
        errors.push('attestation_statement is required and cannot be empty after trim');
    }
    if (a.attestation_kind !== 'FIRST_PARTY_OPERATOR_ATTESTATION') {
        errors.push("attestation_kind must be 'FIRST_PARTY_OPERATOR_ATTESTATION'");
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Validates an AttestedObservationSource descriptor.
 */
function validateAttestedObservationSource(source) {
    const errors = [];
    if (!source || typeof source !== 'object') {
        return { valid: false, errors: ['AttestedObservationSource must be an object'] };
    }
    const s = source;
    if (!s.source_id || typeof s.source_id !== 'string' || !s.source_id.startsWith('asrc_')) {
        errors.push("source_id is required and must have server-issued prefix 'asrc_'");
    }
    if (!s.attestation_id || typeof s.attestation_id !== 'string' || !s.attestation_id.startsWith('att_')) {
        errors.push("attestation_id is required and must have server-issued prefix 'att_'");
    }
    if (!s.tenant_id || typeof s.tenant_id !== 'string' || !s.tenant_id.trim()) {
        errors.push('tenant_id is required');
    }
    if (!s.display_name || typeof s.display_name !== 'string' || !s.display_name.trim()) {
        errors.push('display_name is required');
    }
    if (!s.category || typeof s.category !== 'string') {
        errors.push('category is required');
    }
    if (!Array.isArray(s.observation_categories) || s.observation_categories.length === 0) {
        errors.push('observation_categories must be a non-empty array');
    }
    else {
        for (const cat of s.observation_categories) {
            if (cat !== 'REALISED_COMMERCIAL_ACTUAL' && cat !== 'REALISED_OPERATIONAL_ACTUAL') {
                errors.push(`Invalid observation category: ${cat}`);
            }
        }
    }
    if (!Array.isArray(s.supported_signal_types) || s.supported_signal_types.length === 0) {
        errors.push('supported_signal_types must be a non-empty array');
    }
    if (!Array.isArray(s.supported_grain_capabilities) || s.supported_grain_capabilities.length === 0) {
        errors.push('supported_grain_capabilities must be a non-empty array');
    }
    else {
        s.supported_grain_capabilities.forEach((cap, idx) => {
            if (!cap || !Array.isArray(cap.dimensions) || cap.dimensions.length === 0) {
                errors.push(`supported_grain_capabilities[${idx}] must declare non-empty dimensions array`);
            }
        });
    }
    if (!Array.isArray(s.supported_measurement_bases) || s.supported_measurement_bases.length === 0) {
        errors.push('supported_measurement_bases must be a non-empty array');
    }
    else {
        for (const basis of s.supported_measurement_bases) {
            if (basis !== 'DIRECT_MEASUREMENT' && basis !== 'MODELLED') {
                errors.push(`Invalid supported measurement basis: ${basis} (CONTROLLED_DIFFERENCE is not permitted)`);
            }
        }
    }
    const attValidation = validateSourceAttestation(s.attestation);
    if (!attValidation.valid) {
        errors.push(...attValidation.errors);
    }
    if (s.status !== 'ACTIVE' && s.status !== 'DISABLED' && s.status !== 'REVOKED') {
        errors.push("status must be 'ACTIVE' | 'DISABLED' | 'REVOKED'");
    }
    if (typeof s.synthetic_demo !== 'boolean') {
        errors.push('synthetic_demo must be a boolean');
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Validates a ServerReceipt record.
 */
function validateServerReceipt(receipt) {
    const errors = [];
    if (!receipt || typeof receipt !== 'object') {
        return { valid: false, errors: ['ServerReceipt must be an object'] };
    }
    const r = receipt;
    if (!r.receipt_id || typeof r.receipt_id !== 'string' || !r.receipt_id.startsWith('rcpt_')) {
        errors.push("receipt_id is required and must have prefix 'rcpt_'");
    }
    if (r.kind !== 'SOURCE_REGISTRATION' && r.kind !== 'CONTRACT_REGISTRATION' && r.kind !== 'OBSERVATION_ADMISSION') {
        errors.push("kind must be 'SOURCE_REGISTRATION' | 'CONTRACT_REGISTRATION' | 'OBSERVATION_ADMISSION'");
    }
    if (!r.tenant_id || typeof r.tenant_id !== 'string' || !r.tenant_id.trim()) {
        errors.push('tenant_id is required');
    }
    if (typeof r.sequence !== 'number' || !Number.isInteger(r.sequence) || r.sequence < 1) {
        errors.push('sequence must be a positive integer');
    }
    if (!r.subject_id || typeof r.subject_id !== 'string' || !r.subject_id.trim()) {
        errors.push('subject_id is required');
    }
    if (r.kind === 'CONTRACT_REGISTRATION' && (!r.contract_digest || !r.contract_digest.trim())) {
        errors.push('contract_digest is required for CONTRACT_REGISTRATION receipt');
    }
    if (r.kind === 'OBSERVATION_ADMISSION' && (!r.source_id || !r.source_id.trim())) {
        errors.push('source_id is required for OBSERVATION_ADMISSION receipt');
    }
    if (!r.issued_at_display || typeof r.issued_at_display !== 'string') {
        errors.push('issued_at_display is required');
    }
    return { valid: errors.length === 0, errors };
}
