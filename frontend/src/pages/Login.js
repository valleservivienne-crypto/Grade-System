import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('All fields are required'); return; }

    setLoading(true);
    try {
      const data = await api.login({ email, password });
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.bg}>
        <div style={styles.blob1} />
        <div style={styles.blob2} />
      </div>

      <div style={styles.card} className="animate-scale">
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={styles.logoText}>GradeTrack</span>
        </div>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to your account to continue</p>

        {error && (
          <div style={styles.error} className="animate-in">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
              <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1" fill="#EF4444"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={styles.input}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E2E8F8'}
              autoComplete="email"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E2E8F8'}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
            onMouseEnter={e => !loading && (e.target.style.background = '#1D4ED8')}
            onMouseLeave={e => e.target.style.background = '#2563EB'}
          >
            {loading ? (
              <span style={styles.spinner} />
            ) : 'Sign In'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/signup" style={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #EFF4FF 0%, #F0F4FF 50%, #EEF2FF 100%)',
  },
  bg: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  blob1: {
    position: 'absolute', top: '-80px', right: '-80px',
    width: '400px', height: '400px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
  },
  blob2: {
    position: 'absolute', bottom: '-80px', left: '-80px',
    width: '350px', height: '350px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 8px 32px rgba(15,23,42,0.1), 0 2px 8px rgba(15,23,42,0.06)',
    position: 'relative',
    zIndex: 1,
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' },
  logoIcon: {
    width: '40px', height: '40px', borderRadius: '10px',
    background: 'linear-gradient(135deg, #2563EB, #6366F1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
  },
  logoText: { fontSize: '18px', fontWeight: '700', color: '#0F172A', letterSpacing: '-0.3px' },
  title: { fontSize: '26px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '6px' },
  subtitle: { fontSize: '14px', color: '#64748B', marginBottom: '28px' },
  error: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: '#FEF2F2', border: '1px solid #FECACA',
    borderRadius: '10px', padding: '12px 14px',
    fontSize: '13px', color: '#DC2626', marginBottom: '20px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input: {
    border: '1.5px solid #E2E8F8', borderRadius: '10px',
    padding: '11px 14px', fontSize: '14px', outline: 'none',
    transition: 'border-color 0.2s', background: '#FAFBFF',
    color: '#0F172A', fontFamily: 'Plus Jakarta Sans, sans-serif',
  },
  btn: {
    background: '#2563EB', color: 'white', border: 'none',
    borderRadius: '10px', padding: '12px', fontSize: '14px',
    fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(37,99,235,0.3)', marginTop: '4px',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
  },
  spinner: {
    width: '16px', height: '16px', borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
  footer: { textAlign: 'center', fontSize: '13px', color: '#64748B', marginTop: '24px' },
  link: { color: '#2563EB', fontWeight: '600', textDecoration: 'none' },
};
