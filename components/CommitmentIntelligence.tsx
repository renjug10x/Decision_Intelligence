'use client';
import { useState } from 'react';
import { 
  ArrowRight, 
  Zap,
  ChevronRight
} from 'lucide-react';

interface ChainStage {
  id: string;
  title: string;
  owner: string;
  target: string;
  projected: string;
  drift: string;
  status: 'ok' | 'warning' | 'danger';
  confidence: number;
}

interface CommitmentIntelligenceProps {
  onNavigateToExperiment?: (experimentId: string) => void;
}

export default function CommitmentIntelligence({ onNavigateToExperiment }: CommitmentIntelligenceProps = {}) {
  const [promoLift, setPromoLift] = useState<number>(22);
  const [supplierCap, setSupplierCap] = useState<number>(10);
  const [enableSlaFlex, setEnableSlaFlex] = useState<boolean>(false);
  const [discovered, setDiscovered] = useState<boolean>(false);

  const demandUnits = Math.round(10000 * (1 + promoLift / 100));
  const supplierCapacity = Math.round(10000 * (1 + supplierCap / 100));
  const flexUnits = enableSlaFlex ? 1200 : 0;
  const netSupplierCapacity = supplierCapacity + flexUnits;
  
  const unitDeficit = Math.max(0, demandUnits - netSupplierCapacity);
  const gapPercentage = Math.round(((demandUnits - netSupplierCapacity) / demandUnits) * 100);
  const deliveryRisk = Math.min(95, Math.round((unitDeficit / demandUnits) * 100 * 2.5));
  const financialExposure = unitDeficit * 120;

  const stages: ChainStage[] = [
    {
      id: 'marketing',
      title: 'Marketing Campaign',
      owner: 'Commercial Strategy',
      target: `+${promoLift}% Demand Lift`,
      projected: `+${promoLift}% Campaign Active`,
      drift: '0%',
      status: 'ok',
      confidence: 96
    },
    {
      id: 'demand',
      title: 'Demand Commitment',
      owner: 'Demand Planning',
      target: `${demandUnits.toLocaleString()} units`,
      projected: `${demandUnits.toLocaleString()} units`,
      drift: '0%',
      status: 'ok',
      confidence: 92
    },
    {
      id: 'supplier',
      title: 'Supplier Commitment',
      owner: 'Primary Supplier SLA',
      target: `${demandUnits.toLocaleString()} units (+${promoLift}%)`,
      projected: `${netSupplierCapacity.toLocaleString()} units (+${supplierCap}% cap${enableSlaFlex ? ' + flex' : ''})`,
      drift: unitDeficit > 0 ? `-${unitDeficit.toLocaleString()} units` : 'Aligned',
      status: unitDeficit > 1000 ? 'danger' : unitDeficit > 0 ? 'warning' : 'ok',
      confidence: 88
    },
    {
      id: 'inventory',
      title: 'Inventory Buffer',
      owner: 'RDC Stock Control',
      target: '1,200 safety units',
      projected: unitDeficit > 0 ? '400 safety units' : '1,200 safety units',
      drift: unitDeficit > 0 ? '-66% buffer' : '0%',
      status: unitDeficit > 0 ? 'warning' : 'ok',
      confidence: 90
    },
    {
      id: 'delivery',
      title: 'Delivery Commitment',
      owner: 'Logistics Operations',
      target: '98.5% On-Time',
      projected: `${(100 - deliveryRisk).toFixed(1)}% On-Time`,
      drift: deliveryRisk > 0 ? `-${deliveryRisk}% SLA Risk` : '0%',
      status: deliveryRisk > 25 ? 'danger' : deliveryRisk > 0 ? 'warning' : 'ok',
      confidence: 85
    },
    {
      id: 'customer',
      title: 'Customer Promise',
      owner: 'Customer Experience',
      target: 'Zero OOS Incidents',
      projected: unitDeficit > 0 ? `${unitDeficit.toLocaleString()} units OOS Risk` : 'Promise Protected',
      drift: unitDeficit > 0 ? 'Breach Expected' : 'Protected',
      status: unitDeficit > 0 ? 'danger' : 'ok',
      confidence: 94
    }
  ];

  return (
    <div className="page-content animate-fade" style={{ maxWidth: 1140, margin: '0 auto', paddingBottom: 48 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Commitment Intelligence
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Detect contradictory commitments across marketing, supply chain, and logistics.
          </p>
        </div>

        {onNavigateToExperiment && (
          <button
            onClick={() => onNavigateToExperiment('EXP-RIPPLE-02')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: '#FFFFFF',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              fontWeight: 500,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            Explore Decision Ripple <ChevronRight size={13} />
          </button>
        )}
      </div>

      {/* Numerical Data Contradiction Grid */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        marginBottom: 24,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 120px 1fr',
          gap: 16,
          alignItems: 'center',
          background: 'var(--bg-subtle)',
          padding: '20px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          marginBottom: 20
        }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              DEMAND
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', marginTop: 2 }}>
              +{promoLift}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Healthy Campaign Forecast
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: unitDeficit > 0 ? 'var(--g10x-red)' : 'var(--success)',
              background: unitDeficit > 0 ? 'var(--risk-light)' : 'var(--success-light)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-full)'
            }}>
              {unitDeficit > 0 ? `${gapPercentage}% GAP` : 'ALIGNED'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SUPPLY
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: unitDeficit > 0 ? 'var(--g10x-red)' : 'var(--success)', marginTop: 2 }}>
              +{supplierCap}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Committed Capacity {enableSlaFlex ? '(+ Flex)' : ''}
            </div>
          </div>
        </div>

        {/* Discovery Reveal */}
        {!discovered ? (
          <button
            onClick={() => setDiscovered(true)}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--g10x-orange)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            Expose Commitment Contradiction <ArrowRight size={14} />
          </button>
        ) : (
          <div style={{
            background: unitDeficit > 0 ? 'var(--risk-light)' : 'var(--success-light)',
            border: `1px solid ${unitDeficit > 0 ? 'rgba(225,29,72,0.2)' : 'rgba(5,150,105,0.2)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '16px 20px'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              {unitDeficit > 0 ? (
                <span>The forecast is healthy. The commitments are not.</span>
              ) : (
                <span>All enterprise commitments are fully aligned.</span>
              )}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
              {unitDeficit > 0 ? (
                `Demand forecast (+${promoLift}%) accurately predicts volume, but supplier capacity limits (+${supplierCap}%) create a ${unitDeficit.toLocaleString()}-unit deficit, risking £${financialExposure.toLocaleString()} in delivery penalties.`
              ) : (
                `Supplier capacity and secondary SLA flex rules satisfy target campaign volume.`
              )}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} color="var(--g10x-orange)" />
                Intervention: Flex Secondary Supplier SLA Rule #4 (+1,200 units)
              </div>
              <button
                onClick={() => setEnableSlaFlex(!enableSlaFlex)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: enableSlaFlex ? 'var(--success)' : 'var(--g10x-orange)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {enableSlaFlex ? 'Deactivate Flex' : 'Execute Intervention'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scenario Sliders */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        marginBottom: 20,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
          Scenario Parameters
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Demand Lift:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>+{promoLift}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="40"
              value={promoLift}
              onChange={e => setPromoLift(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Supplier Capacity:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>+{supplierCap}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={supplierCap}
              onChange={e => setSupplierCap(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
              SLA Diversion:
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={enableSlaFlex}
                onChange={e => setEnableSlaFlex(e.target.checked)}
              />
              Secondary SLA Flex (+1,200 units)
            </label>
          </div>
        </div>
      </div>

      {/* Commitment Chain Nodes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        {stages.map((stg, idx) => (
          <div
            key={stg.id}
            style={{
              background: '#FFFFFF',
              border: stg.status === 'danger' ? '1px solid var(--g10x-red)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 18px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.625rem', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Stage 0{idx + 1}
              </span>
              <span style={{
                fontSize: '0.625rem',
                fontWeight: 600,
                color: stg.status === 'danger' ? 'var(--g10x-red)' : stg.status === 'warning' ? 'var(--warning)' : 'var(--success)',
                background: stg.status === 'danger' ? 'var(--risk-light)' : stg.status === 'warning' ? 'var(--warning-light)' : 'var(--success-light)',
                padding: '2px 6px',
                borderRadius: 4
              }}>
                {stg.status.toUpperCase()}
              </span>
            </div>

            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              {stg.title}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
              Owner: {stg.owner}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
              Target: <strong style={{ color: 'var(--text-primary)' }}>{stg.target}</strong>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              Projected: <strong style={{ color: stg.status === 'danger' ? 'var(--g10x-red)' : 'var(--text-primary)' }}>{stg.projected}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid var(--border)', fontSize: '0.6875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Drift: {stg.drift}</span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{stg.confidence}% Telemetry</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
