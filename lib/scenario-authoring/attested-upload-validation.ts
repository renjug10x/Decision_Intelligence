/**
 * Attested Upload — validation, parsing, profiling and reduction (`SCI-10`, ADR-086)
 * ───────────────────────────────────────────────────────────────────────────────
 * The behaviour beneath the declared contract (`packages/contracts/src/attested-upload-model.ts`).
 * Pure functions only: no store, no clock, no provider, no network. Everything an admission computes
 * is a function of the bytes, the confirmed mapping, the draft's product and the draft's Today, which
 * is what makes the same accepted upload admit the same values on any draft (contract §4.10).
 *
 * The rules this module holds, each of them structurally
 * ------------------------------------------------------
 *  - **Cells are text and are never evaluated.** There is no expression, formula or type coercion
 *    beyond two declared shapes (an ISO date and a plain unsigned decimal). A cell beginning
 *    `= + - @ \t \r` is text — so a signed number is text too, which costs nothing: every admissible
 *    measurement is non-negative.
 *  - **No refusal carries a cell value.** Messages name columns (headers) and the draft's own facts
 *    (its product, its Today), never what a row held. The same is true of everything logged.
 *  - **The only arithmetic is the two declared reductions** — `MEAN_OF_PERIODS` (rounded to a whole
 *    unit) and `LATEST_PERIOD`. They produce INPUTS; no published quantity is computed here.
 *  - **Bounds are the Scenario Draft contract's**, decided by `validateScenarioDraftInputs`, not copied.
 */

import {
  ATTESTED_UPLOAD_ADMISSIBLE_FIELDS,
  ATTESTED_UPLOAD_GRAIN_COLUMNS,
  ATTESTED_UPLOAD_LIMITS,
  type AttestedUploadAdmittedValue,
  type AttestedUploadColumnProfile,
  type AttestedUploadMapping,
  type AttestedUploadProfile,
  type AttestedUploadReduction,
  type AttestedUploadRefusal,
  type AttestedUploadRefusalReason
} from '@/packages/contracts/src/attested-upload-model';
import {
  RESERVED_SERVER_FIELD_NAMES,
  RESERVED_SERVER_PREFIXES,
  checkNoReservedServerFields,
  validateSourceAttestation,
  type SourceAttestation
} from '@/packages/contracts/src/attested-observation-model';
import type { ProvenanceDescriptor } from '@/packages/contracts/src/provenance-vocabulary';
import {
  scenarioDraftField,
  type ScenarioDraftFieldId
} from '@/packages/contracts/src/scenario-draft-model';

// ── Refusals ──────────────────────────────────────────────────────────────────

/** A closed refusal (contract §4.9), carried as an error so no caller can half-apply an admission. */
export class AttestedUploadRefusalError extends Error {
  readonly refusal: AttestedUploadRefusal;
  constructor(reason: AttestedUploadRefusalReason, message: string, column?: string) {
    super(message);
    this.name = 'AttestedUploadRefusalError';
    this.refusal = column ? { reason, message, column } : { reason, message };
  }
}

export function refuse(reason: AttestedUploadRefusalReason, message: string, column?: string): never {
  throw new AttestedUploadRefusalError(reason, message, column);
}

/**
 * HTTP status per reason. A foreign tenant's draft, upload or receipt is `404` exactly as a missing one
 * is (ADR-085 part 4): the two are indistinguishable by status, reason and message.
 */
export function refusalHttpStatus(reason: AttestedUploadRefusalReason): number {
  switch (reason) {
    case 'DRAFT_NOT_FOUND':
    case 'UPLOAD_NOT_FOUND':
      return 404;
    case 'UPLOAD_EXPIRED':
      return 410;
    case 'TOO_LARGE':
      return 413;
    case 'UNSUPPORTED_MEDIA_TYPE':
      return 415;
    case 'DUPLICATE_UPLOAD':
    case 'FIELD_ALREADY_ATTESTED':
    case 'DRAFT_NOT_EDITABLE':
      return 409;
    default:
      return 422;
  }
}

// ── Before parse: media type, name, size ──────────────────────────────────────

const ACCEPTED_MEDIA_TYPES = new Set(['text/csv', 'application/vnd.ms-excel']);

/** Display only (contract §4.2): no path, no control characters, a bounded length. */
export function sanitiseFileName(name: string): string {
  const base = String(name ?? '').split(/[\\/]/).pop() ?? '';
  const clean = base.replace(/[^A-Za-z0-9 ._()-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
  return clean || 'extract.csv';
}

export function checkMediaAndSize(fileName: string, mediaType: string, byteSize: number): void {
  const type = String(mediaType ?? '').split(';')[0].trim().toLowerCase();
  if (!ACCEPTED_MEDIA_TYPES.has(type) || !/\.csv$/i.test(String(fileName ?? '').trim())) {
    refuse('UNSUPPORTED_MEDIA_TYPE', 'Only a CSV file (.csv) can be added. Export the data from your system as CSV and try again.');
  }
  if (byteSize > ATTESTED_UPLOAD_LIMITS.max_bytes) {
    refuse('TOO_LARGE', `This file is larger than ${ATTESTED_UPLOAD_LIMITS.max_bytes / (1024 * 1024)} MB. Export only the weeks and columns the scenario needs.`);
  }
  if (byteSize === 0) {
    refuse('NO_HEADER_ROW', 'This file is empty. It needs a header row and one row per week.');
  }
}

/** UTF-8, strictly. A byte-order mark is tolerated and stripped (`TextDecoder` does so by default). */
export function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return refuse('NOT_UTF8', 'This file is not UTF-8 text. Save it as "CSV UTF-8" and try again.');
  }
}

// ── Parse: RFC 4180, cells as text ────────────────────────────────────────────

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/**
 * RFC 4180, strictly: a field is quoted or it is not; inside quotes `""` is a quote; a quote may not
 * appear inside an unquoted field; every record has the header's width. Records end at CRLF, LF or CR.
 * Limits are enforced WHILE parsing, so an oversized file stops at the limit rather than after it.
 */
export function parseCsv(text: string): ParsedCsv {
  if (text.includes('\u0000')) {
    refuse('MALFORMED_CSV', 'This file contains binary content, so it is not a CSV extract.');
  }

  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  let fieldStarted = false;
  let afterQuote = false;
  let i = 0;

  const endField = () => {
    record.push(field);
    field = ''; fieldStarted = false; afterQuote = false;
  };
  const endRecord = () => {
    endField();
    // A wholly blank line is not a row.
    if (!(record.length === 1 && record[0] === '')) {
      if (records.length === 0 && record.length > ATTESTED_UPLOAD_LIMITS.max_columns) {
        refuse('TOO_MANY_COLUMNS', `This file has ${record.length} columns; the most CogniX accepts is ${ATTESTED_UPLOAD_LIMITS.max_columns}.`);
      }
      records.push(record);
      if (records.length - 1 > ATTESTED_UPLOAD_LIMITS.max_rows) {
        refuse('TOO_MANY_ROWS', `This file has more than ${ATTESTED_UPLOAD_LIMITS.max_rows.toLocaleString('en-GB')} rows. Export only the weeks the scenario needs.`);
      }
    }
    record = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; afterQuote = true; i += 1; continue;
      }
      field += c; i += 1; continue;
    }
    if (c === ',') { endField(); i += 1; continue; }
    if (c === '\r' || c === '\n') {
      endRecord();
      i += (c === '\r' && text[i + 1] === '\n') ? 2 : 1;
      continue;
    }
    if (afterQuote) {
      refuse('MALFORMED_CSV', 'A quoted value is followed by more text before the next comma. Check the file\'s quoting.');
    }
    if (c === '"') {
      if (fieldStarted) {
        refuse('MALFORMED_CSV', 'A quote appears in the middle of an unquoted value. Check the file\'s quoting.');
      }
      quoted = true; fieldStarted = true; i += 1; continue;
    }
    field += c; fieldStarted = true; i += 1;
  }
  if (quoted) refuse('MALFORMED_CSV', 'A quoted value is never closed. Check the file\'s quoting.');
  if (fieldStarted || afterQuote || record.length > 0) endRecord();

  if (records.length === 0) refuse('NO_HEADER_ROW', 'This file is empty. It needs a header row and one row per week.');

  const headers = records[0].map(h => h.trim());
  if (headers.every(h => h === '')) refuse('NO_HEADER_ROW', 'The first row has no column names. The file needs a header row.');
  if (headers.every(h => ISO_DATE.test(h) || PLAIN_NUMBER.test(h))) {
    refuse('NO_HEADER_ROW', 'The first row holds values rather than column names. The file needs a header row.');
  }
  if (headers.length > ATTESTED_UPLOAD_LIMITS.max_columns) {
    refuse('TOO_MANY_COLUMNS', `This file has ${headers.length} columns; the most CogniX accepts is ${ATTESTED_UPLOAD_LIMITS.max_columns}.`);
  }

  const seen = new Set<string>();
  headers.forEach((header, index) => {
    if (!header) refuse('DUPLICATE_HEADER', `Column ${index + 1} has no name. Every column needs a unique name.`);
    if (header.length > 80) refuse('MALFORMED_CSV', `Column ${index + 1} has a name longer than 80 characters.`);
    if (FORMULA_SHAPED.test(records[0][index])) {
      refuse('MALFORMED_CSV', `Column ${index + 1}'s name begins with a formula character. Column names must be plain text.`);
    }
    const key = normaliseHeader(header);
    if (seen.has(key)) refuse('DUPLICATE_HEADER', `Two columns are both called "${header}". Every column needs a unique name.`, header);
    seen.add(key);
  });

  const rows = records.slice(1);
  rows.forEach((row, index) => {
    if (row.length !== headers.length) {
      refuse('MALFORMED_CSV', `Row ${index + 2} has ${row.length} values but the header has ${headers.length} columns.`);
    }
  });

  return { headers, rows };
}

// ── Cell shapes — the only two there are ──────────────────────────────────────

/** Contract §4.5: a cell beginning with one of these is text, never evaluated and never re-exported. */
export const FORMULA_SHAPED = /^[=+\-@\t\r]/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PLAIN_NUMBER = /^\d+(\.\d+)?$/;

export function isIsoDate(cell: string): boolean {
  if (FORMULA_SHAPED.test(cell)) return false;
  const value = cell.trim();
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** A plain unsigned decimal, or null. Nothing else is a number here — no sign, exponent or separator. */
export function plainNumber(cell: string): number | null {
  if (FORMULA_SHAPED.test(cell)) return null;
  const value = cell.trim();
  if (!PLAIN_NUMBER.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normaliseHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s\-/]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// ── Personal data — refused, not warned (contract §4.5) ───────────────────────

const PERSONAL_HEADER = new RegExp(
  '(e_?mail|(^|_)(tele)?phone(_|$)|^(tel|mobile|mobile_(number|no|phone))$|post_?code|zip_?code|address|date_of_birth|^dob$|'
  + 'national_insurance|ni_number|passport)'
  + '|^(name|first_name|last_name|full_name|given_name|family_name|surname|forename|customer_name|contact_name|'
  + 'employee_name|person|person_name|customer|contact|attendee)$'
);
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const HONORIFIC_NAME = /^(mr|mrs|ms|miss|mx|dr|prof)\.?\s+[A-Za-z]/i;
const SURNAME_COMMA_GIVEN = /^[A-Z][a-z'’-]+,\s*[A-Z][a-z'’-]+$/;
const TITLE_CASE_NAME = /^([A-Z][a-z'’-]+)(\s[A-Z][a-z'’-]+){1,2}$/;
/** Common given names. A heuristic, declared as one: it is what makes "Title Case Words" a person. */
const GIVEN_NAMES = new Set([
  'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles',
  'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'paul', 'steven', 'andrew', 'peter', 'george',
  'oliver', 'harry', 'jack', 'jacob', 'noah', 'charlie', 'mohammed', 'muhammad', 'ali', 'leo', 'oscar',
  'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen',
  'emma', 'olivia', 'amelia', 'isla', 'ava', 'emily', 'sophie', 'grace', 'lily', 'chloe', 'hannah',
  'priya', 'anjali', 'fatima', 'aisha', 'laura', 'rachel', 'rebecca', 'claire', 'helen', 'anna', 'lucy'
]);

function looksLikeTelephone(cell: string): boolean {
  const value = cell.trim();
  if (!/^(\+|0)[\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function looksLikePersonName(cell: string): boolean {
  const value = cell.trim();
  if (HONORIFIC_NAME.test(value) || SURNAME_COMMA_GIVEN.test(value)) return true;
  const m = value.match(TITLE_CASE_NAME);
  return !!m && GIVEN_NAMES.has(m[1].toLowerCase());
}

/**
 * A column is personal data if its NAME says so, or if any cell is an e-mail address, a telephone
 * number or a postcode, or at least half its cells read as a person's name. Nothing `SCI-10` admits
 * needs one, so the whole file is refused and the message names the column, never the cell.
 */
export function assertNoPersonalData(parsed: ParsedCsv): void {
  parsed.headers.forEach((header, index) => {
    const key = normaliseHeader(header);
    if (PERSONAL_HEADER.test(key) || EMAIL.test(header)) {
      refuse('PERSONAL_DATA_COLUMN', `The column "${header}" looks like personal data. Remove it and upload the file again — CogniX does not need it.`, header);
    }
    let names = 0;
    let nonEmpty = 0;
    for (const row of parsed.rows) {
      const cell = row[index] ?? '';
      if (!cell.trim()) continue;
      nonEmpty += 1;
      if (EMAIL.test(cell) || UK_POSTCODE.test(cell.trim()) || looksLikeTelephone(cell)) {
        refuse('PERSONAL_DATA_COLUMN', `The column "${header}" contains personal data (an e-mail address, telephone number or postcode). Remove it and upload the file again.`, header);
      }
      if (looksLikePersonName(cell)) names += 1;
    }
    if (nonEmpty > 0 && names * 2 >= nonEmpty) {
      refuse('PERSONAL_DATA_COLUMN', `The column "${header}" appears to contain people's names. Remove it and upload the file again.`, header);
    }
  });
}

// ── Grain and profile ─────────────────────────────────────────────────────────

/** Deterministic header matching (contract §6: "Deterministic header matching first"). Closed. */
const HEADER_ALIASES: Readonly<Partial<Record<ScenarioDraftFieldId, readonly string[]>>> = {
  base_demand_units_per_week: ['base_demand_units_per_week', 'base_demand_units', 'base_demand', 'baseline_units', 'baseline_weekly_units', 'unpromoted_units', 'un_promoted_weekly_demand', 'weekly_base_demand'],
  waste_units_per_week: ['waste_units_per_week', 'waste_units', 'weekly_waste_units', 'waste', 'units_wasted', 'units_lost_to_waste_each_week'],
  national_store_count: ['national_store_count', 'store_count', 'stores', 'stores_ranging', 'ranging_stores', 'number_of_stores', 'stores_ranging_the_line'],
  online_demand_share_pct: ['online_demand_share_pct', 'online_share_pct', 'online_demand_share', 'online_share', 'online_pct', 'share_of_demand_transacting_online'],
  gross_margin_rate_pct: ['gross_margin_rate_pct', 'gross_margin_pct', 'gross_margin_rate', 'gross_margin', 'margin_pct'],
  store_cover_days: ['store_cover_days', 'store_cover', 'days_of_cover_in_store', 'store_days_cover'],
  distribution_centre_cover_days: ['distribution_centre_cover_days', 'distribution_center_cover_days', 'dc_cover_days', 'dc_cover', 'network_cover_days', 'days_of_cover_in_the_network'],
  on_order_cover_days: ['on_order_cover_days', 'on_order_cover', 'days_of_cover_already_on_order']
};

const ALIAS_INDEX: ReadonlyMap<string, ScenarioDraftFieldId> = new Map(
  Object.entries(HEADER_ALIASES).flatMap(([field, aliases]) =>
    (aliases ?? []).map(alias => [alias, field as ScenarioDraftFieldId] as const))
);

/** Only ever an ADMISSIBLE field — a header naming anything else is proposed as nothing. */
export function proposeFieldForHeader(header: string): ScenarioDraftFieldId | null {
  const field = ALIAS_INDEX.get(normaliseHeader(header)) ?? null;
  return field && ATTESTED_UPLOAD_ADMISSIBLE_FIELDS[field] ? field : null;
}

export interface GrainContext {
  /** The draft's product. */
  sku_id: string | undefined;
  /** The draft's scenario Today (`observed_history_end_date`, stated or the declared default). */
  today: string;
  product_name?: string;
}

/** The columns a profiled upload holds between `PROFILED` and admission — and nothing else. */
export interface HeldColumns {
  /** `period_end` per row, in file order. */
  periods: string[];
  /** Every non-grain column, keyed by its header as written. */
  columns: Record<string, string[]>;
}

const DAY_MS = 86_400_000;

function columnIndex(headers: readonly string[], name: string): number {
  return headers.findIndex(h => normaliseHeader(h) === name);
}

/**
 * Validate the grain against the draft and profile the columns. Refuses with the first closed reason
 * that applies; nothing about the file is retained if it refuses.
 */
export function profileAgainstDraft(parsed: ParsedCsv, grain: GrainContext): { profile: AttestedUploadProfile; held: HeldColumns } {
  assertNoPersonalData(parsed);

  const [periodColumn, skuColumn] = ATTESTED_UPLOAD_GRAIN_COLUMNS;
  const periodIndex = columnIndex(parsed.headers, periodColumn);
  const skuIndex = columnIndex(parsed.headers, skuColumn);
  if (periodIndex < 0) refuse('MISSING_REQUIRED_COLUMN', 'The file needs a "period_end" column: the last day of each week, as YYYY-MM-DD.', periodColumn);
  if (skuIndex < 0) refuse('MISSING_REQUIRED_COLUMN', 'The file needs a "sku_id" column naming the product on every row.', skuColumn);

  if (!grain.sku_id) {
    refuse('GRAIN_MISMATCH', 'Choose the product in your scenario before adding data for it.', skuColumn);
  }
  const product = grain.product_name ? `${grain.product_name} (${grain.sku_id})` : grain.sku_id;

  const periods: string[] = [];
  for (const row of parsed.rows) {
    const period = row[periodIndex] ?? '';
    if (!isIsoDate(period)) {
      refuse('GRAIN_MISMATCH', 'Every row needs a "period_end" date written as YYYY-MM-DD — one row per week.', periodColumn);
    }
    if ((row[skuIndex] ?? '').trim() !== grain.sku_id) {
      refuse('GRAIN_MISMATCH', `Every row must be for this scenario's product, ${product}. This file includes rows for another product or none.`, skuColumn);
    }
    periods.push(period.trim());
  }

  const sorted = [...periods].sort();
  for (let k = 1; k < sorted.length; k += 1) {
    const gap = (Date.parse(`${sorted[k]}T00:00:00Z`) - Date.parse(`${sorted[k - 1]}T00:00:00Z`)) / DAY_MS;
    if (gap === 0) refuse('GRAIN_MISMATCH', 'Two rows are for the same week. The file needs exactly one row per week.', periodColumn);
    if (gap % 7 !== 0) refuse('GRAIN_MISMATCH', 'The "period_end" dates are not a weekly series. The file needs one row per week, seven days apart.', periodColumn);
  }
  if (sorted.length > 0 && sorted[sorted.length - 1] > grain.today) {
    refuse('FUTURE_PERIOD', `The file includes weeks after this scenario's Today (${grain.today}). A measurement cannot come from the future — remove those weeks.`, periodColumn);
  }
  if (periods.length < ATTESTED_UPLOAD_LIMITS.min_periods) {
    refuse('INSUFFICIENT_PERIODS', `The file has ${periods.length} week${periods.length === 1 ? '' : 's'} of data; at least ${ATTESTED_UPLOAD_LIMITS.min_periods} are needed.`, periodColumn);
  }

  const columns: AttestedUploadColumnProfile[] = [];
  const held: HeldColumns = { periods, columns: {} };
  parsed.headers.forEach((header, index) => {
    const cells = parsed.rows.map(row => row[index] ?? '');
    const nonEmpty = cells.filter(c => c.trim() !== '');
    const inferred: AttestedUploadColumnProfile['inferred_type'] = nonEmpty.length > 0 && nonEmpty.every(isIsoDate)
      ? 'DATE'
      : nonEmpty.length > 0 && nonEmpty.every(c => plainNumber(c) !== null) ? 'NUMBER' : 'TEXT';
    const grainColumn = index === periodIndex || index === skuIndex;
    const proposed = !grainColumn && inferred === 'NUMBER' ? proposeFieldForHeader(header) : null;
    columns.push({
      header,
      inferred_type: inferred,
      non_empty_count: nonEmpty.length,
      proposed_field: proposed,
      proposal_basis: proposed ? 'HEADER_MATCH' : 'NONE'
    });
    if (!grainColumn) held.columns[header] = cells;
  });

  return {
    profile: {
      row_count: parsed.rows.length,
      column_count: parsed.headers.length,
      period_count: periods.length,
      period_window: { start: sorted[0], end: sorted[sorted.length - 1] },
      columns
    },
    held
  };
}

// ── Mapping and reduction ─────────────────────────────────────────────────────

const REDUCTION_PROVENANCE: Readonly<Record<AttestedUploadReduction, ProvenanceDescriptor>> = {
  MEAN_OF_PERIODS: { origin: 'attested', method: 'rule', authority: 'authoritative' },
  LATEST_PERIOD: { origin: 'attested', method: 'measured', authority: 'authoritative' }
};

export function attestedProvenanceFor(reduction: AttestedUploadReduction): ProvenanceDescriptor {
  return { ...REDUCTION_PROVENANCE[reduction] };
}

/** The mapping a person confirmed, checked against the profile and the closed admissible set. */
export function validateMapping(mapping: unknown, profile: AttestedUploadProfile): AttestedUploadMapping[] {
  if (!Array.isArray(mapping) || mapping.length === 0) {
    refuse('MAPPING_NOT_CONFIRMED', 'Choose at least one column to add to the scenario, and confirm which figure it is.');
  }
  const headers = new Set(profile.columns.map(c => c.header));
  const grain = new Set<string>(ATTESTED_UPLOAD_GRAIN_COLUMNS);
  const usedHeaders = new Set<string>();
  const usedFields = new Set<string>();
  const out: AttestedUploadMapping[] = [];

  for (const entry of mapping as unknown[]) {
    const m = entry as Partial<AttestedUploadMapping> | null;
    if (!m || typeof m.header !== 'string' || typeof m.field !== 'string') {
      refuse('MAPPING_NOT_CONFIRMED', 'Every mapping names one column and one scenario figure.');
    }
    if (!headers.has(m.header) || grain.has(normaliseHeader(m.header))) {
      refuse('MAPPING_NOT_CONFIRMED', `"${m.header}" is not a data column in this file.`, m.header);
    }
    if (!ATTESTED_UPLOAD_ADMISSIBLE_FIELDS[m.field as ScenarioDraftFieldId]) {
      const label = scenarioDraftField(m.field)?.label;
      refuse(
        'FIELD_NOT_ADMISSIBLE',
        label
          ? `"${label}" cannot be taken from a file: it is a figure CogniX would have to estimate or you decide, not one an extract measures.`
          : 'That is not a scenario figure a file can supply.',
        m.header
      );
    }
    if (usedHeaders.has(m.header) || usedFields.has(m.field)) {
      refuse('MAPPING_NOT_CONFIRMED', 'Each column may supply one figure, and each figure may come from one column.', m.header);
    }
    usedHeaders.add(m.header);
    usedFields.add(m.field);
    out.push({ header: m.header, field: m.field as ScenarioDraftFieldId });
  }
  return out;
}

/**
 * The two declared reductions, and the only arithmetic `SCI-10` performs (contract §5).
 * Deterministic: the same held columns and mapping reduce to the same values, byte for byte.
 */
export function reduceMapped(held: HeldColumns, mapping: readonly AttestedUploadMapping[]): AttestedUploadAdmittedValue[] {
  const latestIndex = held.periods.reduce((best, p, idx) => (p > held.periods[best] ? idx : best), 0);
  return mapping.map(({ header, field }) => {
    const cells = held.columns[header] ?? [];
    const values = cells.map(plainNumber);
    if (values.length === 0 || values.some(v => v === null)) {
      refuse('NON_NUMERIC_VALUE', `The column "${header}" needs a plain number for every week (no blanks, signs, symbols or separators).`, header);
    }
    const numbers = values as number[];
    const reduction = ATTESTED_UPLOAD_ADMISSIBLE_FIELDS[field] as AttestedUploadReduction;
    const value = reduction === 'MEAN_OF_PERIODS'
      ? Math.round(numbers.reduce((sum, v) => sum + v, 0) / numbers.length)
      : numbers[latestIndex];
    return {
      field,
      value,
      reduction,
      periods_used: reduction === 'MEAN_OF_PERIODS' ? numbers.length : 1,
      provenance: attestedProvenanceFor(reduction)
    };
  });
}

// ── The admission request ─────────────────────────────────────────────────────

/** Server-issued or server-derived upload fields. Asserting one in a request is `SERVER_FIELD_ASSERTED`. */
const RESERVED_UPLOAD_FIELDS = new Set([
  ...RESERVED_SERVER_FIELD_NAMES,
  'synthetic_demo', 'state', 'content_sha256', 'admitted_values', 'admitted_at', 'received_at',
  'refusal', 'profile', 'schema_version', 'draft_id', 'scenario_id', 'attestation_id', 'admission_receipt_id'
]);
const RESERVED_VALUE_PREFIXES: readonly string[] = [...RESERVED_SERVER_PREFIXES, 'upl_'];

/**
 * ESF-6's reserved-field guard, reused unchanged, plus the upload's own server-derived fields.
 * `allowed` names request fields that legitimately carry a server-issued value — only `upload_id`,
 * which is how a person names the upload they reviewed.
 */
export function assertNoServerFields(payload: Record<string, unknown>, allowed: readonly string[] = []): void {
  const esf6 = checkNoReservedServerFields(payload, [...allowed]);
  if (!esf6.ok) {
    refuse('SERVER_FIELD_ASSERTED', 'This request tried to set something only CogniX issues (an identifier, receipt or sequence). It was refused and nothing changed.');
  }
  for (const [key, value] of Object.entries(payload)) {
    if (allowed.includes(key)) continue;
    if (RESERVED_UPLOAD_FIELDS.has(key)
      || (typeof value === 'string' && RESERVED_VALUE_PREFIXES.some(prefix => value.startsWith(prefix)))) {
      refuse('SERVER_FIELD_ASSERTED', 'This request tried to set something only CogniX decides (an identifier, state or fingerprint). It was refused and nothing changed.');
    }
  }
}

const NOT_A_PERSON = /^(ai|a\.i\.|gemini|google|cognix|system|admin|administrator|auto|automatic|bot|n\/?a|none|unknown|test|user|anonymous)$/i;

/** ESF-6's `validateSourceAttestation`, unchanged, plus the bounds a display needs. Never a proof. */
export function validateAttestation(attestation: unknown): SourceAttestation {
  const verdict = validateSourceAttestation(attestation);
  const a = (attestation ?? {}) as Partial<SourceAttestation>;
  if (!verdict.valid) {
    refuse('ATTESTATION_INVALID', 'Name the person who is accountable for this data and say where it comes from. An extract cannot be added without both.');
  }
  const by = (a.attested_by ?? '').trim();
  const statement = (a.attestation_statement ?? '').trim();
  if (by.length > 120 || statement.length > 600) {
    refuse('ATTESTATION_INVALID', 'The name must be at most 120 characters and the statement at most 600.');
  }
  if (NOT_A_PERSON.test(by)) {
    refuse('ATTESTATION_INVALID', 'An attestation is made by a named person. A system, a role or AI cannot attest data.');
  }
  return { attested_by: by, attestation_statement: statement, attestation_kind: 'FIRST_PARTY_OPERATOR_ATTESTATION' };
}

/** Reader-facing wording of a reduction, for the note a field carries. */
export function describeReduction(reduction: AttestedUploadReduction, periodsUsed: number): string {
  return reduction === 'MEAN_OF_PERIODS'
    ? `the average of ${periodsUsed} weeks`
    : 'the latest week';
}
