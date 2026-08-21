'use client';

/**
 * The About surface (ATL-04R).
 *
 * About used to be a navigation destination. What sat behind it was not an "about" page at all: it
 * was a five-tab module whose default tab was the Architectural Storyboard and whose other four
 * tabs were the only user interface for three separately-governed capabilities. Calling that
 * "About" hid a live diagnostic surface behind a word that promises a paragraph.
 *
 * `ATL-04R` splits the two apart. The operational tabs moved to Observability & Governance, where
 * they are what that section is for. What remains here is identification — the answer to "what am I
 * looking at, and which build of it?" — which is a header control, not a module.
 *
 * ── Why so much of this can say "not recorded" ──────────────────────────────
 * Every field comes from one governed source, resolved server-side, and the surface renders absence
 * honestly rather than filling it. `certifications` is empty because an audit across the estate
 * found no certification record anywhere — the only compliance-flavoured strings in the product were
 * the storyboard's unsupported "100% Policy Enforced" and "Access Compliance" constants, which
 * `ATL-01` had already marked Discard. A badge here would be a fabricated attestation about the
 * organisation, which is a worse failure than an unsupported metric about the software.
 */

import { useEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import { fetchPlatformMetadata } from '@/lib/atlas-client';
import type { PlatformMetadata } from '@/packages/contracts/src/capability-atlas-model';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="about-field">
      <span className="about-field-label">{label}</span>
      <span className={value ? 'about-field-value' : 'about-field-value about-field-value--absent'}>
        {value ?? 'not recorded'}
      </span>
    </div>
  );
}

export default function AboutSurface() {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<PlatformMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || meta) return;
    fetchPlatformMetadata().then(setMeta).catch(e => setError(e.message));
  }, [open, meta]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="about-trigger"
        onClick={() => setOpen(true)}
        title="About CogniX"
        aria-label="About CogniX"
      >
        <Info size={14} strokeWidth={1.75} />
      </button>

      {open && (
        <div className="about-scrim" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="about-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="about-head">
              <div>
                <p id="about-title" className="about-product">
                  {meta ? meta.productName : 'CogniX'}
                </p>
                <p className="about-org">
                  {meta ? `${meta.organisation} · ${meta.descriptor}` : 'G10X'}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="about-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={15} strokeWidth={1.75} />
              </button>
            </div>

            {error && <p className="about-error">Platform information could not be read. {error}</p>}

            {meta && (
              <>
                <div className="about-fields">
                  <Field label="Version" value={meta.version} />
                  <Field label="Build" value={meta.build} />
                  <Field label="Environment" value={meta.environment} />
                  <Field label="Release" value={meta.release} />
                  <Field label="Last updated" value={meta.lastUpdated} />
                </div>

                <div className="about-cert">
                  <span className="about-field-label">Certification</span>
                  {meta.certifications.length === 0 ? (
                    <p className="about-cert-absent">
                      No certification or compliance record is held for this platform. None is claimed.
                    </p>
                  ) : (
                    <ul className="about-cert-list">
                      {meta.certifications.map(c => (
                        <li key={c.name}>
                          <strong>{c.name}</strong> — {c.status}
                          <span className="about-cert-evidence">{c.evidence}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            <p className="about-foot">
              How the platform is governed, what evidence supports it and what is implemented are in
              Observability &amp; Governance. What CogniX can do is in the Capability Atlas.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
