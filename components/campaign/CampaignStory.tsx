'use client';

/**
 * CTW-02 — the campaign story.
 *
 * Every entry is a recorded event or a declared prediction. Nothing is invented to fill a gap, and
 * a predicted entry is visually and textually distinct from one that happened, because a story that
 * blurs the two is exactly the failure this programme exists to avoid.
 */

import React from 'react';
import { BookOpen } from 'lucide-react';
import { CampaignStoryEvent } from '@/packages/contracts/src/campaign-intervention-model';

const LINE = '#E2E8F0';
const SLATE = '#0F172A';
const MUTED = '#64748B';

export default function CampaignStory({ events }: { events: CampaignStoryEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div style={{ background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 12, padding: '18px 20px', marginTop: 16 }}>
      <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: SLATE, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <BookOpen size={16} color="#2563EB" />
        Campaign story
      </h3>
      <p style={{ fontSize: '0.76rem', color: MUTED, margin: '0 0 14px 0' }}>
        What has been recorded, and what is still expected. Nothing here is written after the fact.
      </p>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
        {events.map((e, i) => (
          <li key={`${e.kind}-${i}`} style={{ display: 'flex', gap: 12, paddingBottom: i === events.length - 1 ? 0 : 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: e.occurred ? '#2563EB' : '#FFFFFF',
                  border: `2px solid ${e.occurred ? '#2563EB' : '#94A3B8'}`,
                  marginTop: 4
                }}
              />
              {i < events.length - 1 && <span style={{ flex: 1, width: 2, background: LINE, marginTop: 3 }} />}
            </div>
            <div style={{ paddingBottom: 2 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: SLATE }}>{e.headline}</span>
                {!e.occurred && (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: MUTED,
                      border: `1px solid ${LINE}`,
                      padding: '1px 6px',
                      borderRadius: 3
                    }}
                  >
                    Not yet happened
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.77rem', color: MUTED, marginTop: 3, lineHeight: 1.5 }}>{e.detail}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
