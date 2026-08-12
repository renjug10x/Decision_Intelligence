'use client';
import React from 'react';
import { 
  X, CheckCircle2, AlertTriangle, ShieldCheck, Clock, User, 
  ArrowRight, FileText, Sparkles, Layers, BookOpen
} from 'lucide-react';
import { ENTERPRISE_LEARNING_PATTERNS } from '@/config/patterns';

export interface ExecutionBriefingProps {
  isOpen: boolean;
  onClose: () => void;
  briefing: {
    title: string;
    situation: string;
    whyNow: string;
    recommendedAction: string;
    owner: string;
    dependencies: string[];
    timeHorizon: string;
    expectedOutcome: string;
    confidence: number;
    patternId?: string;
    contractStatus?: 'VERIFIED' | 'CONDITIONAL' | 'BLOCKED';
    contractRef?: string;
    evidence: string[];
  } | null;
  onNavigateToPattern?: (patternId: string) => void;
  onExecuteAction?: () => void;
}

export default function ExecutionBriefing({
  isOpen,
  onClose,
  briefing,
  onNavigateToPattern,
  onExecuteAction
}: ExecutionBriefingProps) {
  if (!isOpen || !briefing) return null;

  const matchedPattern = briefing.patternId 
    ? ENTERPRISE_LEARNING_PATTERNS.find(p => p.id === briefing.patternId)
    : null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        width: '100%',
        maxWidth: 680,
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: 24,
        position: 'relative'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: 'var(--g10x-orange)',
                background: 'rgba(255, 107, 0, 0.08)',
                padding: '2px 8px',
                borderRadius: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Execution Briefing
              </span>
              {briefing.contractStatus && (
                <span style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: briefing.contractStatus === 'VERIFIED' ? 'var(--success)' : 'var(--g10x-red)',
                  background: briefing.contractStatus === 'VERIFIED' ? 'rgba(5, 150, 105, 0.08)' : 'rgba(225, 29, 72, 0.08)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <ShieldCheck size={12} /> Contract {briefing.contractStatus}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {briefing.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Situation & Why Now */}
        <div style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          marginBottom: 16
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Situation & Trigger Context
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>
            {briefing.situation}
          </p>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={13} color="var(--g10x-orange)" />
            <span><strong>Why Now:</strong> {briefing.whyNow}</span>
          </div>
        </div>

        {/* 2. Recommended Action & Owner Grid */}
        <div style={{
          borderLeft: '4px solid var(--g10x-orange)',
          background: '#FFFFFF',
          borderTop: '1px solid var(--border)',
          borderRight: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 16px',
          marginBottom: 16
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--g10x-orange)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Recommended Executive Action
          </div>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
            {briefing.recommendedAction}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            paddingTop: 10,
            borderTop: '1px solid var(--border)'
          }}>
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>Responsible Function / Owner</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <User size={13} /> {briefing.owner}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>Execution Time Horizon</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Clock size={13} /> {briefing.timeHorizon}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>Expected Outcome</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--success)', marginTop: 2, display: 'block' }}>
                {briefing.expectedOutcome}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Associated Enterprise Learning Pattern */}
        {matchedPattern && (
          <div style={{
            background: 'rgba(255, 107, 0, 0.04)',
            border: '1px solid rgba(255, 107, 0, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Supported by Enterprise Learning Pattern
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                {matchedPattern.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 12 }}>
                <span>Similarity: <strong>{matchedPattern.situationSimilarity}%</strong></span>
                <span>Confidence: <strong>{matchedPattern.patternConfidence}%</strong></span>
                <span>Success Rate: <strong>{matchedPattern.interventionSuccessRate}%</strong></span>
              </div>
            </div>

            {onNavigateToPattern && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToPattern(matchedPattern.id);
                }}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: 'var(--g10x-orange)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <BookOpen size={12} /> View Pattern
              </button>
            )}
          </div>
        )}

        {/* 4. Dependencies & Evidence */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px'
          }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Execution Dependencies
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {briefing.dependencies.map((dep, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>{dep}</li>
              ))}
            </ul>
          </div>

          <div style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px'
          }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Key Evidence Signals
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {briefing.evidence.map((ev, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>{ev}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Telemetry Confidence: <strong>{briefing.confidence}%</strong>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
            {onExecuteAction && (
              <button
                onClick={() => {
                  onExecuteAction();
                  onClose();
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--g10x-orange)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                Approve & Execute <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
