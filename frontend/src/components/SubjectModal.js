import React, { useState } from 'react';

export default function SubjectModal({ subject, onClose, onSave }) {
  const [form, setForm] = useState({
    subject_name: subject?.subject_name || '',
    instructor_name: subject?.instructor_name || '',
    semester: subject?.semester || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.subject_name.trim()) { setError('Subject name is required'); return; }
    setLoading(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()} className="animate-scale">
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{subject ? 'Edit Subject' : 'Add New Subject'}</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <Field label="Subject Name *" required>
            <input value={form.subject_name} onChange={e => update('subject_name', e.target.value)}
              placeholder="e.g. Mathematics, Physics..." style={styles.input}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E2E8F8'} />
          </Field>
          <Field label="Instructor Name">
            <input value={form.instructor_name} onChange={e => update('instructor_name', e.target.value)}
              placeholder="e.g. Prof. Smith" style={styles.input}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E2E8F8'} />
          </Field>
          <Field label="Semester / Term">
            <input value={form.semester} onChange={e => update('semester', e.target.value)}
              placeholder="e.g. 1st Semester 2024" style={styles.input}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E2E8F8'} />
          </Field>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ ...styles.saveBtn, opacity: loading ? 0.7 : 1 }}
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

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(4px)', padding: '24px',
  },
  modal: {
    background: 'white', borderRadius: '16px', padding: '32px',
    maxWidth: '480px', width: '100%',
    boxShadow: '0 20px 60px rgba(15,23,42,0.2)',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  modalTitle: { fontSize: '20px', fontWeight: '700', color: '#0F172A' },
  closeBtn: {
    background: '#F1F5F9', border: 'none', borderRadius: '8px',
    width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px',
    color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  error: {
    background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px',
    padding: '10px 14px', fontSize: '13px', color: '#DC2626', marginBottom: '16px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  input: {
    border: '1.5px solid #E2E8F8', borderRadius: '10px', padding: '10px 14px',
    fontSize: '14px', outline: 'none', transition: 'border-color 0.2s',
    background: '#FAFBFF', color: '#0F172A', fontFamily: 'Plus Jakarta Sans, sans-serif',
  },
  actions: { display: 'flex', gap: '12px', paddingTop: '8px' },
  cancelBtn: {
    flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid #E2E8F0',
    background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
    color: '#374151', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif',
  },
  saveBtn: {
    flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
    background: '#2563EB', color: 'white', cursor: 'pointer', fontSize: '14px',
    fontWeight: '600', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif',
    boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
  },
};
