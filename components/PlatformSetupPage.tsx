'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Package, Store, ArrowRight, Lock, Eye, EyeOff, Activity } from 'lucide-react';
import { useApp, type Role } from '@/lib/context';
import { appRoutes } from '@/config/routes';

const ROLES: { id: Role; Icon: typeof Briefcase; name: string; desc: string }[] = [
  { id: 'exec', Icon: Briefcase, name: 'Executive', desc: 'Full business overview' },
  { id: 'category_manager', Icon: Package, name: 'Category Manager', desc: 'Category & SKU insights' },
  { id: 'store_manager', Icon: Store, name: 'Store Manager', desc: 'My store performance' },
];

export default function PlatformSetupPage() {
  const router = useRouter();
  const { setRole, setApiKey, setDemoMode, setIsAuthenticated, setPlatformSetupComplete } = useApp();
  const [selectedRole, setSelectedRole] = useState<Role>('exec');
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [skipKey, setSkipKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnterPlatform = async () => {
    if (!skipKey && !keyInput.trim()) {
      setError('Enter your Gemini API key or enable demo mode.');
      return;
    }
    setLoading(true);
    setError('');
    await new Promise((r) => setTimeout(r, 400));
    setRole(selectedRole);
    setApiKey(skipKey ? '' : keyInput.trim());
    setDemoMode(skipKey);
    setIsAuthenticated(true);
    setPlatformSetupComplete(true);
    setLoading(false);
    router.replace(appRoutes.home);
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #003978 0%, #0060CC 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 28px rgba(0,120,255,0.25)',
            }}
          >
            <Activity size={26} strokeWidth={1.75} color="white" />
          </div>
          <h2 style={{ fontSize: '1.375rem', marginBottom: 6 }}>Decision Intelligence</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Lidl UK · Powered by Looker + Gemini AI
          </p>
        </div>

        <p
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 10,
          }}
        >
          Select your role
        </p>
        <div className="role-grid">
          {ROLES.map(({ id, Icon, name, desc }) => (
            <div
              key={id}
              className={`role-card ${selectedRole === id ? 'selected' : ''}`}
              onClick={() => {
                setSelectedRole(id);
                setError('');
              }}
            >
              <div style={{ marginBottom: 10 }}>
                <Icon
                  size={20}
                  strokeWidth={1.75}
                  color={selectedRole === id ? '#0078FF' : '#6B7A8D'}
                />
              </div>
              <div className="role-name">{name}</div>
              <div className="role-desc">{desc}</div>
            </div>
          ))}
        </div>

        <div className="divider" />

        <p
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 10,
          }}
        >
          Gemini API Key
        </p>

        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Lock
            size={15}
            strokeWidth={1.75}
            color="#4A5A7A"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <input
            className="input"
            type={showKey ? 'text' : 'password'}
            placeholder="Paste your Google AI Studio key…"
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.target.value);
              setSkipKey(false);
              setError('');
            }}
            disabled={skipKey}
            style={{ paddingLeft: 36, paddingRight: 40, opacity: skipKey ? 0.4 : 1 }}
          />
          {keyInput && !skipKey && (
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
              }}
            >
              {showKey ? (
                <EyeOff size={15} strokeWidth={1.75} color="#6B7A8D" />
              ) : (
                <Eye size={15} strokeWidth={1.75} color="#6B7A8D" />
              )}
            </button>
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={skipKey}
            onChange={(e) => {
              setSkipKey(e.target.checked);
              setError('');
            }}
            style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
          />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Demo mode — use mock AI responses
          </span>
        </label>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Free key at{' '}
          <a
            href="https://aistudio.google.com"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'none' }}
          >
            aistudio.google.com
          </a>
        </p>

        {error && (
          <div
            style={{
              color: 'var(--danger)',
              fontSize: '0.8125rem',
              marginBottom: 14,
              background: 'var(--danger-light)',
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary w-full btn-lg"
          onClick={handleEnterPlatform}
          disabled={loading}
          style={{ justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <span className="spinner" />
          ) : (
            <ArrowRight size={18} strokeWidth={1.75} color="white" />
          )}
          {loading ? 'Signing in…' : 'Enter Platform'}
        </button>

        <p
          style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Lock size={12} strokeWidth={1.75} color="#4A5A7A" />
          API key stored in browser session only
        </p>
      </div>
    </div>
  );
}
