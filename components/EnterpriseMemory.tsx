'use client';
import { useState, useEffect } from 'react';
import ExecutionBriefing from '@/components/ExecutionBriefing';
import {
  Search,
  ChevronRight,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { trackJourneyEvent } from '@/lib/journey-client';

import { fetchMemoryCases, searchMemoryPrecedents } from '@/lib/memory-client';
import { fetchSupportingMemoriesForPattern } from '@/lib/learning-pattern-client';

export interface EnterpriseMemoryCase {
  memoryId: string;
  situation: string;
  decision: string;
  expectedOutcome: string;
  actualOutcome: string;
  confidenceScore: number;
  interventionExecuted: string;
  businessResult: string;
  lessonsLearned: string;
  provenance: {
    source: string;
    period: string;
    dataClassification: string;
    isSyntheticDemo: boolean;
  };
}

export interface EnterpriseMemoryProps {
  onNavigateToSolution?: (solutionId: string) => void;
  onNavigateToExperiment?: (experimentId: string) => void;
}

export default function EnterpriseMemory({
  onNavigateToSolution,
  onNavigateToExperiment
}: EnterpriseMemoryProps = {}) {
  const [memoryCases, setMemoryCases] = useState<EnterpriseMemoryCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<EnterpriseMemoryCase | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showBriefing, setShowBriefing] = useState<boolean>(false);

  useEffect(() => {
    trackJourneyEvent({
      event_type: 'EXPERIMENT_OPENED',
      experiment_id: 'EXP-MEMORY-03',
      source: 'EnterpriseMemory.tsx',
      page: 'enterprise-memory'
    });

    fetchMemoryCases({ tenant_id: 'tenant_uk_retail_01' }).then(rawCases => {
      const mapped = rawCases.map(c => ({
        memoryId: c.memory_id,
        situation: c.situation_summary,
        decision: c.decision_taken,
        expectedOutcome: c.expected_outcome,
        actualOutcome: c.actual_outcome,
        confidenceScore: c.confidence,
        interventionExecuted: c.selected_interventions[0] || c.decision_taken,
        businessResult: c.business_result,
        lessonsLearned: c.lessons_learned,
        provenance: {
          source: c.provenance.source,
          period: c.provenance.period,
          dataClassification: c.provenance.data_classification || 'G10X Accelerator',
          isSyntheticDemo: c.synthetic_demo
        }
      }));
      setMemoryCases(mapped);
      if (mapped.length > 0) setSelectedCase(mapped[0]);
    });
  }, []);

  const handleSelectCase = (c: EnterpriseMemoryCase) => {
    setSelectedCase(c);
    trackJourneyEvent({
      event_type: 'PATTERN_MATCHED',
      experiment_id: 'EXP-MEMORY-03',
      source: 'memory_case_card',
      page: 'enterprise-memory',
      metadata: { memory_id: c.memoryId, confidence: c.confidenceScore }
    });
  };

  const handleOpenBriefing = () => {
    if (!selectedCase) return;
    trackJourneyEvent({
      event_type: 'EXECUTION_BRIEFING_OPENED',
      experiment_id: 'EXP-MEMORY-03',
      source: 'generate_briefing_button',
      page: 'enterprise-memory',
      metadata: { memory_id: selectedCase.memoryId }
    });
    setShowBriefing(true);
  };

  const filteredCases = memoryCases.filter(c =>
    c.situation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.memoryId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lessonsLearned.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-content animate-fade" style={{ maxWidth: 1140, margin: '0 auto', paddingBottom: 48 }}>

      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Enterprise Memory Foundation
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Search historical decision precedents, verified interventions, and empirical outcomes.
          </p>
        </div>
      </div>

      {/* Main Grid: Search & Cases List + Precedent Detail Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 20 }}>

        {/* Left Column: Precedent Timeline Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search historical precedents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: '#FFFFFF',
                fontSize: '0.8125rem',
                color: 'var(--text-primary)'
              }}
            />
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
          </div>

          {filteredCases.map(c => {
            const isSelected = selectedCase?.memoryId === c.memoryId;
            return (
              <div
                key={c.memoryId}
                onClick={() => handleSelectCase(c)}
                style={{
                  background: '#FFFFFF',
                  border: isSelected ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
                  borderLeft: isSelected ? '4px solid var(--g10x-orange)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 18px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  transition: 'var(--transition)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {c.provenance.period}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--success)', fontWeight: 600 }}>
                    {c.confidenceScore}% Similarity
                  </span>
                </div>

                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 6 }}>
                  {c.situation}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Action: {c.interventionExecuted}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Precedent Detail Panel */}
        {selectedCase ? (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            position: 'sticky',
            top: 24
          }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Precedent Detail
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Situation
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5, background: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  {selectedCase.situation}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Intervention Taken
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5, background: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  {selectedCase.decision}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Expected Outcome
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '8px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    {selectedCase.expectedOutcome}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Actual Outcome
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, padding: '8px 10px', background: 'var(--success-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    {selectedCase.actualOutcome}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Lessons Learned & Pattern Generalisation
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.4, background: 'var(--curiosity-light)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-accent)', marginBottom: 12 }}>
                  {selectedCase.lessonsLearned}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => setShowBriefing(true)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--g10x-orange)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                Generate Execution Briefing <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {selectedCase && (
        <ExecutionBriefing
          isOpen={showBriefing}
          onClose={() => setShowBriefing(false)}
          briefing={{
            title: `Precedent Execution Briefing — ${selectedCase.memoryId}`,
            situation: selectedCase.situation,
            whyNow: 'Precedent historical match provides empirical justification for immediate intervention.',
            recommendedAction: selectedCase.interventionExecuted,
            owner: 'Enterprise Supply Chain & Operations',
            dependencies: ['DC Gate Logistics Release', 'Supplier Backup SLA Confirmation'],
            timeHorizon: 'Next 24 Hours',
            expectedOutcome: selectedCase.actualOutcome,
            confidence: selectedCase.confidenceScore,
            patternId: 'PAT-COMM-01',
            contractStatus: 'VERIFIED',
            evidence: [
              `Precedent Memory ID: ${selectedCase.memoryId}`,
              `Historical Result: ${selectedCase.businessResult}`,
              `Source Classification: ${selectedCase.provenance.source}`
            ]
          }}
        />
      )}
    </div>
  );
}
