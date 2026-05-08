import React, { useState } from 'react';

export default function SubjectModal({ subject, onClose, onSave }) {
  const [form, setForm] = useState({
    subject_name: subject?.subject_name || '',
    instructor_name: subject?.instructor_name || '',
    semester: subject?.semester || '',
    passing_grade: subject?.passing_grade ?? 75,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.subject_name.trim()) { setError('Subject name is required'); return; }
    const pg = parseFloat(form.passing_grade);
    if (isNaN(pg) || pg < 0 || pg > 100) { setError('Passing grade must be between 0 and 100'); return; }
    setLoading(true);
    try {
      await onSave({ ...form, passing_grade: pg });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()} className="animate-scale">
        <div style={s.header}>
          <h2 style={s.title}>{subject ? 'Edit Subject' : 'Add New Subject'}</h2>
          <button onClick={onClose} style={s.closeBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          <Field label="Subject Name *">
            <input value={form.subject_name} onChange={e => update('subject_name', e.target.value)}
              placeholder="e.g. Mathematics, Physics..." style={s.input}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
          </Field>

          <Field label="Instructor Name">
            <input value={form.instructor_name} onChange={e => update('instructor_name', e.target.value)}
              placeholder="e.g. Prof. Smith" style={s.input}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
          </Field>

          <Field label="Semester / Term">
            <input value={form.semester} onChange={e => update('semester', e.target.value)}
              placeholder="e.g. 1st Semester 2024" style={s.input}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
          </Field>

          <Field
            label="Passing Grade (%)"
            hint="Set by your professor. Determines On Track / At Risk status for this subject.">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number" min="0" max="100" step="0.5"
                value={form.passing_grade}
                onChange={e => update('passing_grade', e.target.value)}
                style={{ ...s.input, width: '90px', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontWeight: '700', fontSize: '15px' }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
              <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '500' }}>%</span>
              <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto' }}>
                {[60, 75, 80, 85].map(p => (
                  <button key={p} type="button"
                    onClick={() => update('passing_grade', p)}
                    style={{
                      background: parseFloat(form.passing_grade) === p ? '#2563EB' : '#F1F5F9',
                      color: parseFloat(form.passing_grade) === p ? 'white' : '#64748B',
                      border: 'none', borderRadius: '6px', padding: '4px 9px',
                      fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                      transition: 'all 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif',
                    }}>
                    {p}%
                  </button>
                ))}
              </div>
            </div>
            <PassingGradePreview passing={parseFloat(form.passing_grade) || 75} />
          </Field>

          <div style={s.actions}>
            <button type="button" onClick={onClose} style={s.cancelBtn}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ ...s.saveBtn, opacity: loading ? 0.75 : 1 }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = '#1D4ED8')}
              onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
              {loading ? 'Saving...' : subject ? 'Save Changes' : 'Add Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PassingGradePreview({ passing }) {
  const onTrack = passing + 10;
  const ranges = [
    { label: 'On Track', range: `≥ ${onTrack}%`, color: '#059669', bg: '#ECFDF5' },
    { label: 'Needs Improvement', range: `${passing}%–${(onTrack - 0.1).toFixed(1)}%`, color: '#D97706', bg: '#FFFBEB' },
    { label: 'At Risk', range: `< ${passing}%`, color: '#DC2626', bg: '#FEF2F2' },
  ];
  return (
    <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
      {ranges.map(r => (
        <div key={r.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 9px', borderRadius: '20px', background: r.bg }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: r.color, flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: r.color, fontWeight: '600' }}>{r.label}</span>
          <span style={{ fontSize: '10px', color: r.color, opacity: 0.75 }}>{r.range}</span>
        </div>
      ))}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{label}</label>
      {hint && <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '-1px', marginBottom: '2px' }}>{hint}</p>}
      {children}
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(4px)', padding: '24px',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
  },
  modal: {
    background: 'white', borderRadius: '18px', padding: '28px',
    maxWidth: '500px', width: '100%',
    boxShadow: '0 24px 64px rgba(15,23,42,0.2)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { fontSize: '18px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.3px' },
  closeBtn: {
    background: '#F1F5F9', border: 'none', borderRadius: '8px',
    width: '30px', height: '30px', cursor: 'pointer',
    color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  error: {
    background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px',
    padding: '10px 14px', fontSize: '13px', color: '#DC2626', marginBottom: '16px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  input: {
    border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '10px 14px',
    fontSize: '14px', outline: 'none', transition: 'border-color 0.2s',
    background: '#FAFBFF', color: '#0F172A', fontFamily: 'Plus Jakarta Sans, sans-serif',
    width: '100%',
  },
  actions: { display: 'flex', gap: '10px', paddingTop: '6px' },
  cancelBtn: {
    flex: 1, padding: '10px', borderRadius: '9px', border: '1.5px solid #E2E8F0',
    background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
    color: '#374151', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif',
  },
  saveBtn: {
    flex: 1, padding: '10px', borderRadius: '9px', border: 'none',
    background: '#2563EB', color: 'white', cursor: 'pointer', fontSize: '13px',
    fontWeight: '600', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif',
    boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
  },
};
