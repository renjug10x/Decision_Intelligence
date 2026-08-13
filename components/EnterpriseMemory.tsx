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

export const ENTERPRISE_MEMORY_CASES: EnterpriseMemoryCase[] = [
  {
    memoryId: 'MEM-2025-Q2-018',
    situation: 'During Campaign 18 in Q2 2025, marketing demand (+22%) outpaced primary supplier capacity (+10%), creating a 1,400-case availability gap.',
    decision: 'Activated Secondary Supplier SLA Flex Rule #4 to divert 1,200 cases from regional reserve.',
    expectedOutcome: 'Protect 98%+ store availability without exceeding 5% waste variance.',
    actualOutcome: 'Store availability maintained at 98.4%. Waste contained to 4.8%. Delivery SLA penalties averted.',
    confidenceScore: 94,
    interventionExecuted: 'Secondary Supplier SLA Flex Rule #4',
    businessResult: 'Saved £168,000 in lost sales and delivery breach penalties.',
    lessonsLearned: 'Triggering SLA Flex 7 days prior to promotion launch prevents RDC congestion better than reactive transfers.',
    provenance: {
      source: 'G10X Innovation Memory Bank',
      period: 'Q2 2025 (Campaign 18)',
      dataClassification: 'G10X Accelerator',
      isSyntheticDemo: true
    }
  },
  {
    memoryId: 'MEM-2025-Q4-042',
    situation: 'Chilled promo volume surge (+28%) caused 35% warehouse overtime and emergency air freight margin erosion.',
    decision: 'Rebalanced cross-category promotion timing, staggering Chilled and Produce promo start dates by 5 days.',
    expectedOutcome: 'Flatten warehouse throughput spikes while preserving overall campaign gross revenue.',
    actualOutcome: 'DC overtime reduced by 82%. Emergency freight fees eliminated. Margin compression averted.',
    confidenceScore: 91,
    interventionExecuted: 'Staggered Cross-Category Campaign Window',
    businessResult: 'Saved £42,000 in DC overtime and freight surcharges.',
    lessonsLearned: 'Staggering fresh categories by 48-72 hours prevents peak labor collisions at regional hubs.',
    provenance: {
      source: 'G10X Innovation Memory Bank',
      period: 'Q4 2025 (Campaign 42)',
      dataClassification: 'G10X Accelerator',
      isSyntheticDemo: true
    }
  }
];

interface EnterpriseMemoryProps {
  onNavigateToSolution?: (solutionId: string) => void;
  onNavigateToExperiment?: (experimentId: string) => void;
}

export default function EnterpriseMemory({
  onNavigateToSolution,
  onNavigateToExperiment
}: EnterpriseMemoryProps = {}) {
  const [selectedCase, setSelectedCase] = useState<EnterpriseMemoryCase>(ENTERPRISE_MEMORY_CASES[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showBriefing, setShowBriefing] = useState<boolean>(false);

  useEffect(() => {
    trackJourneyEvent({
      event_type: 'EXPERIMENT_OPENED',
      experiment_id: 'EXP-MEMORY-03',
      source: 'EnterpriseMemory.tsx',
      page: 'enterprise-memory'
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
    trackJourneyEvent({
      event_type: 'EXECUTION_BRIEFING_OPENED',
      experiment_id: 'EXP-MEMORY-03',
      source: 'generate_briefing_button',
      page: 'enterprise-memory',
      metadata: { memory_id: selectedCase.memoryId }
    });
    setShowBriefing(true);
  };

  const filteredCases = ENTERPRISE_MEMORY_CASES.filter(c => 
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
            const isSelected = selectedCase.memoryId === c.memoryId;
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
      </div>

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
    </div>
  );
}
