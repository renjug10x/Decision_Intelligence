'use client';
/**
 * The decision case, stated once and always in view.
 *
 * The continuity problem this answers is not that any single screen was wrong — it is that a
 * reader moving between Demand, Promotion and Campaign Decision had nothing telling them they
 * were still looking at the same product, the same scope and the same fortnight. They had to
 * infer it, and where the numbers moved they inferred the opposite.
 *
 * Four facts, one line each, and nothing else: it must not become a second header competing with
 * the decision on screen. The live economics belong to the surfaces; what belongs here is
 * IDENTITY, which does not change as the reader moves.
 */
import { Package } from 'lucide-react';
import { CANONICAL_SCENARIO } from '@/packages/contracts/src/canonical-scenario-model';

export default function ScenarioContextStrip() {
  const { identity, calendar } = CANONICAL_SCENARIO;
  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4
      }}>
        This decision
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <Package size={12} strokeWidth={1.75} color="var(--g10x-orange)" />
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {identity.sku_name}
        </span>
      </div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
        {identity.category} · {identity.market_scope_label} · {calendar.forecast_horizon_days} days
      </div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
        {identity.focus_region} in focus · simulated scenario
      </div>
    </div>
  );
}
