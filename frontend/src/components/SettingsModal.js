import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function SettingsModal({ onClose, onSaved }) {
  const [onTrack, setOnTrack] = useState(85);
  const [needsImprovement, setNeedsImprovement] = useState(75);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings()
      .then(s => {
        setOnTrack(s.on_track_threshold);
        setNeedsImprovement(s.needs_improvement_threshold);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError('');
    const ot = parseFloat(onTrack);
    const ni = parseFloat(needsImprovement);
    if (isNaN(ot) || isNaN(ni)) { setError('Please enter valid numbers.'); return; }
    if (ot <= ni) { setError('On Track must be higher than Needs Improvement.'); return; }
    if (ot > 100 || ni < 0) { setError('Thresholds must be between 0 and 100.'); return; }
    setSaving(true);
    try {
      await api.updateSettings({ on_track_threshold: ot, needs_improvement_threshold: ni });
      setSaved(true);
      setTimeout(() => { onSaved?.(); onClose(); }, 800);
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const preview = (grade) => {
    const ot = parseFloat(onTrack) || 85;
    const ni = parseFloat(needsImprovement) || 75;
    if (grade >= ot) return { label: 'On Track', color: '#059669', bg: '#ECFDF5' };
    if (grade >= ni) return { label: 'Needs Improvement', color: '#D97706', bg: '#FFFBEB' };
    return { label: 'At Risk', color: '#DC2626', bg: '#FEF2F2' };
  };

  const previewGrades = [95, parseFloat(onTrack) || 85, parseFloat(needsImprovement) || 75, 60];

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div>
            <h2 style={s.title}>Grade Threshold Settings</h2>
            <p style={s.sub}>Customize what percentage counts as "On Track" or "At Risk" for your school.</p>
          </div>
          <button onClick={onClose} style={s.closeBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '13px' }}>Loading settings…</div>
        ) : (
          <>
            {error && (
              <div style={s.errorBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <ThresholdRow
                label="On Track threshold"
                description="Grades at or above this are shown as On Track"
                color="#059669"
                value={onTrack}
                onChange={v => { setOnTrack(v); setError(''); }}
                min={parseFloat(needsImprovement) + 1}
                max={100}
              />
              <ThresholdRow
                label="Needs Improvement threshold"
                description="Grades at or above this (but below On Track) need improvement"
                color="#D97706"
                value={needsImprovement}
                onChange={v => { setNeedsImprovement(v); setError(''); }}
                min={0}
                max={parseFloat(onTrack) - 1}
              />
              <div style={s.atRiskRow}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>At Risk</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>Anything below {needsImprovement}% — automatically the lowest range</div>
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: '700', color: '#DC2626', fontSize: '13px' }}>&lt; {needsImprovement}%</div>
              </div>
            </div>

            {/* Live preview */}
            <div style={s.previewSection}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', letterSpacing: '0.5px', marginBottom: '10px' }}>LIVE PREVIEW</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {previewGrades.map(g => {
                  const p = preview(g);
                  return (
                    <div key={g} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 11px', borderRadius: '20px', background: p.bg }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', fontWeight: '700', color: p.color }}>{Number(g).toFixed(0)}%</span>
                      <span style={{ fontSize: '11px', color: p.color, fontWeight: '600' }}>— {p.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Presets */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', letterSpacing: '0.5px', marginBottom: '8px' }}>QUICK PRESETS</div>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Standard (85/75)', ot: 85, ni: 75 },
                  { label: 'Strict (90/80)', ot: 90, ni: 80 },
                  { label: 'Lenient (80/65)', ot: 80, ni: 65 },
                  { label: 'PH Passing (75/60)', ot: 75, ni: 60 },
                ].map(p => (
                  <button key={p.label}
                    onClick={() => { setOnTrack(p.ot); setNeedsImprovement(p.ni); setError(''); }}
                    style={s.presetBtn}
                    onMouseEnter={e => { e.currentTarget.style.background = '#EFF4FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={s.cancelBtn}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || saved}
                style={{ ...s.saveBtn, background: saved ? '#059669' : '#2563EB', opacity: saving || saved ? 0.9 : 1 }}>
                {saved ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    Saved!
                  </>
                ) : saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ThresholdRow({ label, description, color, value, onChange, min, max }) {
  return (
    <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px 16px', border: '1.5px solid #E2E8F0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{label}</div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>{description}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="number"
            value={value}
            onChange={e => onChange(e.target.value)}
            min={min} max={max} step="1"
            style={{ width: '60px', border: `1.5px solid ${color}50`, borderRadius: '8px', padding: '6px 8px', fontSize: '14px', fontFamily: 'DM Mono, monospace', fontWeight: '700', color, textAlign: 'center', outline: 'none', background: 'white' }}
          />
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#94A3B8' }}>%</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step="1" value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', accentColor: color, cursor: 'pointer', height: '4px' }}
      />
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '24px', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  modal: { background: 'white', borderRadius: '20px', padding: '28px', maxWidth: '500px', width: '100%', boxShadow: '0 24px 60px rgba(15,23,42,0.2)', maxHeight: '90vh', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px', gap: '16px' },
  title: { fontSize: '17px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.4px', marginBottom: '4px' },
  sub: { fontSize: '12px', color: '#64748B', lineHeight: '1.55', maxWidth: '340px' },
  closeBtn: { background: 'transparent', border: '1.5px solid #E2E8F0', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B', flexShrink: 0 },
  errorBox: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#DC2626', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
  atRiskRow: { display: 'flex', alignItems: 'center', gap: '10px', background: '#FFF5F5', borderRadius: '12px', padding: '13px 16px', border: '1.5px solid #FECACA' },
  previewSection: { background: '#F8FAFC', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px' },
  presetBtn: { background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', color: '#374151', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  cancelBtn: { background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  saveBtn: { border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: '700', color: 'white', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '7px', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' },
};
