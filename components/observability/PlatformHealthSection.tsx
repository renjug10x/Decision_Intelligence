'use client';

import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ShieldCheck,
  Server
} from 'lucide-react';
import AtlasHealth from '@/components/AtlasHealth';
import { fetchLandscape, type AtlasLandscape } from '@/lib/atlas-client';

export default function PlatformHealthSection() {
  const [landscape, setLandscape] = useState<AtlasLandscape | null>(null);
  const [activeTab, setActiveTab] = useState<'atlas-health' | 'lifecycle'>('atlas-health');

  useEffect(() => {
    let mounted = true;
    fetchLandscape()
      .then(res => {
        if (mounted) setLandscape(res);
      })
      .catch(() => {
        if (mounted) setLandscape(null);
      });
    return () => { mounted = false; };
  }, []);

  const members = landscape?.areas.flatMap(a => a.members) ?? [];
  const notReal = members.filter(m => m.implementation_status !== 'implemented');

  return (
    <div className="og-platform-health">
      {/* Section Header with Governance Principles */}
      <div className="og-section-lead">
        <h2>Platform Health &amp; Estate Integrity</h2>
        <p className="og-lead-questions">
          <strong>Key business questions answered:</strong> Is the estate sound? How trustworthy is the record itself? What is genuinely implemented vs modelled or experimental?
        </p>
        <p className="og-lead-sub">
          Following the <em>ATL-FINAL</em> precedent, CogniX reports only measurable health. Where a reading cannot be measured directly, it is declared unmeasured rather than reported as synthetic zero-error rates.
        </p>
      </div>

      {/* Sub-navigation between Atlas Health Audit and Capability Lifecycle */}
      <div className="og-health-tabs">
        <button
          type="button"
          className={`og-health-tab ${activeTab === 'atlas-health' ? 'og-health-tab--active' : ''}`}
          onClick={() => setActiveTab('atlas-health')}
        >
          <Gauge size={14} />
          <span>Atlas Record Health Audit</span>
        </button>
        <button
          type="button"
          className={`og-health-tab ${activeTab === 'lifecycle' ? 'og-health-tab--active' : ''}`}
          onClick={() => setActiveTab('lifecycle')}
        >
          <Layers size={14} />
          <span>Capability Lifecycle &amp; Landscape</span>
        </button>
      </div>

      {activeTab === 'atlas-health' && (
        <div className="og-health-atlas-view">
          <p className="og-health-explainer">
            Audits the capability registry and knowledge corpus server-side against governed tier rules. Checks only ever flag findings — nothing here can promote a capability or close a gap without verified evidence.
          </p>
          <AtlasHealth />
        </div>
      )}

      {activeTab === 'lifecycle' && (
        <div className="og-health-lifecycle-view">
          {landscape ? (
            <>
              <div className="og-estate-summary">
                <div className="og-stat">
                  <strong>{members.length}</strong>
                  <span>governed capabilities</span>
                </div>
                <div className="og-stat">
                  <strong>{members.length - notReal.length}</strong>
                  <span>fully implemented</span>
                </div>
                <div className="og-stat">
                  <strong>{notReal.length}</strong>
                  <span>simulated, partial or experimental</span>
                </div>
                <div className="og-stat">
                  <strong>{landscape.areas.length}</strong>
                  <span>capability areas</span>
                </div>
              </div>

              <div className={`og-validation${landscape.validation.valid ? '' : ' og-validation--bad'}`}>
                <strong>Landscape integrity</strong>
                {landscape.validation.valid
                  ? ' — every registered capability belongs to exactly one area, so nothing is unreachable and nothing is double-counted.'
                  : ` — ${landscape.validation.errors.length} issues. The landscape is not currently a partition of the registry.`}
              </div>

              <div className="og-table-wrap">
                <table className="og-table">
                  <caption>Capabilities not fully implemented</caption>
                  <thead>
                    <tr>
                      <th>Capability</th>
                      <th>Implementation</th>
                      <th>Lifecycle</th>
                      <th>Demonstrable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notReal.map(m => (
                      <tr key={m.capability_id}>
                        <td><strong>{m.name}</strong></td>
                        <td>
                          <span className={`og-status og-status--${m.implementation_status}`}>
                            {m.implementation_status.replace(/-/g, ' ')}
                          </span>
                        </td>
                        <td>{m.lifecycle_state ?? 'not owned'}</td>
                        <td>{m.demo_maturity ?? 'no surface'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="og-note">
                These three dimensions are kept apart deliberately. A capability can be ready to demonstrate and only partly built; collapsing them into one badge would let a demo surface be read as production implementation.
              </p>
            </>
          ) : (
            <p className="og-note">The capability landscape could not be read.</p>
          )}
        </div>
      )}
    </div>
  );
}
