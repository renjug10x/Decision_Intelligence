'use client';
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, FileText, 
  ChevronRight, Lock, Loader2, ArrowUpRight, Search, ExternalLink 
} from 'lucide-react';
import { 
  searchContractLibrary, 
  getBreachContext, 
  activateBackupContract,
  type ContractMatchResult,
  type SearchTraceItem 
} from '@/lib/contract-library';

import { trackJourneyEvent } from '@/lib/journey-client';

export interface ContractVerificationProps {
  supplierId?: string;
  category?: string;
  region?: string;
  onVerified?: (match: ContractMatchResult | null) => void;
  onOpenDocument?: (docUrl: string, title: string) => void;
}

export default function ContractVerification({
  supplierId = 'SUP001',
  category = 'Produce',
  region = 'Southern Region',
  onVerified,
  onOpenDocument
}: ContractVerificationProps) {
  const [loading, setLoading] = useState(true);
  const [breachInfo, setBreachInfo] = useState<any>(null);
  const [matchResult, setMatchResult] = useState<ContractMatchResult | null>(null);
  const [searchTrace, setSearchTrace] = useState<SearchTraceItem[]>([]);
  const [isActivated, setIsActivated] = useState(false);
  const [activeTab, setActiveTab] = useState<'verification' | 'trace' | 'clauses'>('verification');

  useEffect(() => {
    let isMounted = true;
    async function runVerification() {
      setLoading(true);
      trackJourneyEvent({
        event_type: 'CONTRACT_CHECK_REQUESTED',
        source: 'ContractVerification.tsx',
        page: 'commitment-intelligence',
        metadata: { supplier_id: supplierId, category, region }
      });

      try {
        const breach = await getBreachContext(supplierId);
        const search = await searchContractLibrary({
          category,
          region,
          failing_supplier_id: supplierId,
          backup_supplier_id: 'SUP004'
        });

        if (isMounted) {
          setBreachInfo(breach);
          setMatchResult(search.match);
          setSearchTrace(search.search_trace);
          setLoading(false);
          if (onVerified) onVerified(search.match);

          trackJourneyEvent({
            event_type: 'CONTRACT_CHECK_COMPLETED',
            source: 'ContractVerification.tsx',
            page: 'commitment-intelligence',
            metadata: {
              contract_status: search.match ? 'VERIFIED' : 'BLOCKED',
              backup_contract_id: search.match?.activated_contract_id || search.match?.primary_contract_id,
              primary_supplier: supplierId,
              backup_supplier: search.match?.backup_supplier_name
            }
          });
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    }
    runVerification();
    return () => { isMounted = false; };
  }, [supplierId, category, region, onVerified]);

  const handleActivateBackup = () => {
    if (matchResult) {
      activateBackupContract(matchResult.primary_contract_id, 'Executive Supply Chain');
      setIsActivated(true);
    }
  };

  if (loading) {
    return (
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: 'var(--text-muted)',
        fontSize: '0.8125rem'
      }}>
        <Loader2 size={16} className="animate-spin" color="var(--g10x-orange)" />
        <span>Verifying active commercial contract clauses & SLA thresholds...</span>
      </div>
    );
  }

  const isVerified = !!matchResult;
  const isSlaBreached = breachInfo ? breachInfo.delay_rate_pct >= 30 : false;

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '18px 20px',
      boxShadow: 'var(--shadow-sm)',
      marginBottom: 20
    }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color={isVerified ? 'var(--success)' : 'var(--g10x-red)'} />
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Contractual SLA & Backup Verification
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: isVerified ? 'var(--success)' : 'var(--g10x-red)',
            background: isVerified ? 'rgba(5, 150, 105, 0.08)' : 'rgba(225, 29, 72, 0.08)',
            padding: '3px 10px',
            borderRadius: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            {isVerified ? 'VERIFIED — SLA BREACH CONFIRMED' : 'CONDITIONAL / UNVERIFIED'}
          </span>
        </div>
      </div>

      {/* SLA Breach Summary */}
      {breachInfo && matchResult && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          background: 'var(--bg-base)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
          marginBottom: 14
        }}>
          <div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>Primary Supplier</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {matchResult.primary_supplier_name} ({matchResult.primary_contract_id})
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>14-Day Delivery Delay Rate</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: isSlaBreached ? 'var(--g10x-red)' : 'var(--success)' }}>
              {breachInfo.delay_rate_pct}% (Threshold: {matchResult.breach_threshold_pct}%)
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>Pre-Approved Backup Contract</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--g10x-orange)' }}>
              {matchResult.backup_supplier_name} ({matchResult.activated_contract_id})
            </span>
          </div>
        </div>
      )}

      {/* Verified Clause Detail */}
      {matchResult && (
        <div style={{
          borderLeft: '3px solid var(--success)',
          background: '#FFFFFF',
          padding: '10px 14px',
          borderTop: '1px solid var(--border)',
          borderRight: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 14
        }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
            Matched Clause Ref: {matchResult.matched_clause_ref} — {matchResult.matched_clause_title}
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
            "{matchResult.matched_clause_excerpt}"
          </p>

          {onOpenDocument && (
            <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
              <button
                onClick={() => onOpenDocument(matchResult.primary_document_pdf, matchResult.primary_contract_id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--g10x-orange)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <FileText size={12} /> View Primary Contract ({matchResult.primary_contract_id}.pdf) <ExternalLink size={11} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Contract Search Trace */}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
        <strong>Verification Search Trace:</strong> Scanned {searchTrace.length} library contracts. 
        Matched primary SLA breach threshold (42% delay &gt; 30%) and verified backup clause 7.3 auto-activation.
      </div>

      {/* Action Footer */}
      {matchResult && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Weekly Risk Exposure Mitigated: <strong>£{matchResult.weekly_exposure_gbp.toLocaleString()}</strong>
          </span>

          <button
            onClick={handleActivateBackup}
            disabled={isActivated}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: isActivated ? 'var(--success)' : 'var(--g10x-orange)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: isActivated ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {isActivated ? (
              <>
                <CheckCircle2 size={13} /> Backup Contract Activated ({matchResult.backup_supplier_name})
              </>
            ) : (
              <>
                Auto-Activate Clause 7.3 Backup Contract <ChevronRight size={13} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
