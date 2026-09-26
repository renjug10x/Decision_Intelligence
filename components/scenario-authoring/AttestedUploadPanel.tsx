'use client';

/**
 * Use your own data — the Attested Upload step inside Create Your Own Scenario (`SCI-10`, ADR-086)
 * ───────────────────────────────────────────────────────────────────────────────
 * Upload → Match columns → Review → Attest → Add, all inside the `SCI-08` studio's Review step. Optional:
 * the manual path is unchanged and complete without it.
 *
 * What this component is NOT, for the same reasons the studio states about itself:
 *   - not a validator — the file's form, grain, personal-data and bounds checks are the server's, and a
 *     refusal is rendered in the server's words;
 *   - not a calculator — the two declared reductions run on the server; the values shown after adding
 *     are the server's admitted values, formatted and never derived here;
 *   - not an attestation of anything — the person attests; the words on screen say it is a declaration
 *     of source, not a verification;
 *   - not an authority — adding data changes the DRAFT. Confirming, certifying and running it are the
 *     studio's existing steps, unchanged.
 * No identifier, fingerprint, contract or service name is shown.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Loader2, Upload, Undo2, CheckCircle2 } from 'lucide-react';
import {
  ATTESTED_UPLOAD_ADMISSIBLE_FIELDS,
  AuthoringRequestError,
  admitScenarioExtract,
  listScenarioExtracts,
  uploadScenarioExtract,
  withdrawScenarioExtract,
  type AttestedUpload,
  type AttestedUploadMapping,
  type DraftAssessment
} from '@/lib/scenario-authoring-client';

type Run = <T>(label: string, work: () => Promise<T>) => Promise<T | undefined>;

const ADMISSIBLE = Object.keys(ATTESTED_UPLOAD_ADMISSIBLE_FIELDS);

const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const reductionLabel = (reduction: string, periods: number) =>
  reduction === 'MEAN_OF_PERIODS' ? `average of ${periods} weeks` : 'latest week';

export default function AttestedUploadPanel({ draft, productName, fieldLabel, locked, busy, run, onAssessment, onNotice }: {
  /** The draft being enriched. Only its reference is used, to address the governed routes. */
  draft: Pick<DraftAssessment['draft'], 'draft_id'>;
  productName: string;
  fieldLabel: (id: string) => string;
  /** Unsaved edits in the studio: adding or withdrawing data would replace them, so both wait. */
  locked: boolean;
  busy: string | null;
  run: Run;
  onAssessment: (next: DraftAssessment) => void;
  onNotice: (message: string) => void;
}) {
  const [uploads, setUploads] = useState<AttestedUpload[]>([]);
  const [pending, setPending] = useState<AttestedUpload | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [attestedBy, setAttestedBy] = useState('');
  const [statement, setStatement] = useState('');
  const [declared, setDeclared] = useState(false);
  const draftId = draft.draft_id;

  const refresh = useCallback(async () => {
    const result = await listScenarioExtracts(draftId).catch(() => null);
    if (result) setUploads(result.uploads);
  }, [draftId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const admitted = uploads.filter(u => u.state === 'ADMITTED');
  const chosen = useMemo<AttestedUploadMapping[]>(
    () => Object.entries(mapping).filter(([, field]) => !!field).map(([header, field]) => ({ header, field: field as AttestedUploadMapping['field'] })),
    [mapping]
  );

  const clearPending = () => { setPending(null); setMapping({}); setStatement(''); setDeclared(false); };

  const choose = (file: File) => run('upload', async () => {
    clearPending();
    let upload: AttestedUpload;
    try {
      upload = (await uploadScenarioExtract(draftId, file)).upload;
    } catch (e) {
      // The same file is already waiting in this scenario: resume reviewing it rather than refuse outright.
      const err = e as AuthoringRequestError;
      const live = (err.data as { upload?: AttestedUpload } | undefined)?.upload;
      if (err.reason !== 'DUPLICATE_UPLOAD' || live?.state !== 'PROFILED') throw e;
      upload = live;
      onNotice('You uploaded this file already. Continue matching its columns below.');
    }
    setPending(upload);
    const proposals: Record<string, string> = {};
    for (const column of upload.profile?.columns ?? []) {
      if (column.proposed_field) proposals[column.header] = column.proposed_field;
    }
    setMapping(proposals);
  });

  const add = () => run('admit', async () => {
    if (!pending) return;
    const result = await admitScenarioExtract(draftId, pending, chosen, attestedBy.trim(), statement.trim());
    onAssessment(result.assessment);
    onNotice(`Added ${result.upload.admitted_values.length} figure${result.upload.admitted_values.length === 1 ? '' : 's'} from ${result.upload.file_name_display}. They now show as attested — declared by ${result.upload.attestation?.attested_by}, not verified by CogniX.`);
    clearPending();
    await refresh();
  });

  const withdraw = (upload: AttestedUpload) => run('withdraw', async () => {
    const result = await withdrawScenarioExtract(draftId, upload.upload_id);
    onAssessment(result.assessment);
    onNotice(`Withdrawn ${upload.file_name_display}. Its figures are back on CogniX's assumptions.`);
    await refresh();
  });

  const numberColumns = (pending?.profile?.columns ?? []).filter(c => c.inferred_type === 'NUMBER');
  const otherColumns = (pending?.profile?.columns ?? []).filter(c => c.inferred_type !== 'NUMBER');

  return (
    <div className="sci08-assist sci10-upload" aria-label="Use your own data">
      <div className="sci08-assist-head"><FileSpreadsheet size={14} /> Use your own data (optional)</div>

      {admitted.length > 0 && (
        <ul className="sci10-admitted" aria-label="Data added to this scenario">
          {admitted.map(u => (
            <li key={u.upload_id}>
              <div>
                <span className="sci08-tag is-attested"><CheckCircle2 size={10} /> Attested</span>
                <strong>{u.file_name_display}</strong> — declared by {u.attestation?.attested_by}
                <ul className="sci10-values">
                  {u.admitted_values.map(v => (
                    <li key={v.field}>{fieldLabel(v.field as string)}: <strong>{v.value.toLocaleString('en-GB')}</strong> <span className="sci08-muted">({reductionLabel(v.reduction, v.periods_used)})</span></li>
                  ))}
                </ul>
              </div>
              <button type="button" className="sci08-button is-small is-secondary" disabled={locked || !!busy} onClick={() => void withdraw(u)}>
                {busy === 'withdraw' ? <Loader2 size={12} className="spin" /> : <Undo2 size={12} />} Withdraw
              </button>
            </li>
          ))}
        </ul>
      )}

      {!pending && (
        <>
          <p className="sci08-muted">
            Replace CogniX&apos;s assumptions with figures measured in your own systems. Upload a CSV extract for {productName} with
            one row per week, a <em>period_end</em> date and a <em>sku_id</em> column. Nothing changes until you review and add it.
          </p>
          <div className="sci08-actions is-left">
            <label className={`sci08-button is-secondary ${locked || busy ? 'is-disabled' : ''}`} aria-disabled={locked || !!busy}>
              {busy === 'upload' ? <Loader2 size={13} className="spin" /> : <Upload size={13} />} Upload a CSV extract
              <input
                type="file"
                accept=".csv,text/csv"
                hidden
                disabled={locked || !!busy}
                onChange={e => { const f = e.target.files?.[0]; if (f) void choose(f); e.target.value = ''; }}
              />
            </label>
            {locked && <span className="sci08-muted">Update the assessment first.</span>}
          </div>
        </>
      )}

      {pending?.profile && (
        <div className="sci10-review">
          <p className="sci08-summary">
            <strong>{pending.file_name_display}</strong> · {pending.profile.period_count} weeks,{' '}
            {dateLabel(pending.profile.period_window.start)} – {dateLabel(pending.profile.period_window.end)}
          </p>

          <h4 className="sci10-step">1. Match columns to scenario figures</h4>
          {numberColumns.length === 0 && <p className="sci08-muted">This file has no numeric columns CogniX can use.</p>}
          <div className="sci10-mapping">
            {numberColumns.map(c => (
              <label key={c.header} className="sci10-map-row">
                <span className="sci10-map-column">{c.header}</span>
                <select
                  className="sci08-input"
                  aria-label={`Use column ${c.header} as`}
                  value={mapping[c.header] ?? ''}
                  onChange={e => setMapping(prev => ({ ...prev, [c.header]: e.target.value }))}
                >
                  <option value="">Don&apos;t use</option>
                  {ADMISSIBLE.map(field => <option key={field} value={field}>{fieldLabel(field)}</option>)}
                </select>
              </label>
            ))}
          </div>
          {otherColumns.length > 0 && (
            <p className="sci08-muted">Not used: {otherColumns.map(c => c.header).join(', ')}.</p>
          )}
          <p className="sci08-muted">
            Weekly rates are averaged over the weeks in the file; levels such as store count, margin and cover use the latest week.
            Only measured figures can come from a file — CogniX never estimates a response or a rate from it.
          </p>

          <h4 className="sci10-step">2. Say where it comes from</h4>
          <label className="sci08-label" htmlFor="sci10-statement">Source of this data</label>
          <textarea
            id="sci10-statement"
            className="sci08-input"
            rows={2}
            maxLength={600}
            placeholder="For example: weekly sales extract from our EPOS ledger, exported on Monday"
            value={statement}
            onChange={e => setStatement(e.target.value)}
          />
          <label className="sci08-label" htmlFor="sci10-attested-by">Your name</label>
          <input
            id="sci10-attested-by"
            className="sci08-input"
            maxLength={120}
            placeholder="The person accountable for this data"
            value={attestedBy}
            onChange={e => setAttestedBy(e.target.value)}
          />
          <label className="sci08-check">
            <input type="checkbox" checked={declared} onChange={e => setDeclared(e.target.checked)} />
            I declare this extract comes from the source above. CogniX checks its format, not its accuracy.
          </label>

          <div className="sci08-actions">
            <button type="button" className="sci08-button is-secondary" disabled={!!busy} onClick={clearPending}>Discard</button>
            <button
              type="button"
              className="sci08-button"
              disabled={locked || !!busy || chosen.length === 0 || !attestedBy.trim() || !statement.trim() || !declared}
              onClick={() => void add()}
            >
              {busy === 'admit' ? <Loader2 size={13} className="spin" /> : null} Add to scenario
            </button>
          </div>
          {locked && <p className="sci08-muted">You have unsaved changes. Update the assessment first.</p>}
        </div>
      )}
    </div>
  );
}
