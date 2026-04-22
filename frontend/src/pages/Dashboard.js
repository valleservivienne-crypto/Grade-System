import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, calculateGrade, getGradeStatus } from '../utils/api';
import SubjectModal from '../components/SubjectModal';

export default function Dashboard() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const loadSubjects = useCallback(async () => {
    try {
      const data = await api.getSubjects();
      // Load full data for each subject to calculate grades
      const full = await Promise.all(
        data.map(s => api.getSubject(s.id))
      );
      setSubjects(full);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);

  const handleDelete = async (id) => {
    try {
      await api.deleteSubject(id);
      setSubjects(s => s.filter(x => x.id !== id));
      setDeleteConfirm(null);
    } catch (err) { console.error(err); }
  };

  const stats = (() => {
    const withGrades = subjects.map(s => {
      const g = calculateGrade(s.categories);
      return g ? g.grade : null;
    }).filter(g => g !== null);

    return {
      total: subjects.length,
      avg: withGrades.length ? (withGrades.reduce((a, b) => a + b, 0) / withGrades.length) : null,
      onTrack: withGrades.filter(g => g >= 85).length,
      atRisk: withGrades.filter(g => g < 75).length,
    };
  })();

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <div style={styles.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={styles.logoText}>GradeTrack</span>
        </div>

        <nav style={styles.nav}>
          <div style={{ ...styles.navItem, ...styles.navItemActive }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/></svg>
            Dashboard
          </div>
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={styles.userCard}>
            <div style={styles.avatar}>{user?.email?.[0]?.toUpperCase()}</div>
            <div style={{flex:1, overflow:'hidden'}}>
              <div style={styles.userEmail}>{user?.email}</div>
              <div style={styles.userRole}>Student</div>
            </div>
          </div>
          <button onClick={logout} style={styles.logoutBtn}
            onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>My Subjects</h1>
            <p style={styles.pageSubtitle}>Track your academic performance across all subjects</p>
          </div>
          <button onClick={() => { setEditSubject(null); setShowModal(true); }}
            style={styles.addBtn}
            onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
            onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Add Subject
          </button>
        </div>

        {/* Stats */}
        {subjects.length > 0 && (
          <div style={styles.statsGrid} className="animate-in">
            <StatCard icon="📚" label="Total Subjects" value={stats.total} color="#2563EB" />
            <StatCard icon="📊" label="Overall Average"
              value={stats.avg !== null ? `${stats.avg.toFixed(1)}%` : '—'}
              color={stats.avg !== null ? getGradeStatus(stats.avg).color : '#94A3B8'} />
            <StatCard icon="✅" label="On Track" value={stats.onTrack} color="#10B981" />
            <StatCard icon="🚨" label="At Risk" value={stats.atRisk} color="#EF4444" />
          </div>
        )}

        {/* Subjects Grid */}
        {loading ? (
          <div style={styles.grid}>
            {[1,2,3].map(i => <div key={i} style={{...styles.skeletonCard, animationDelay: `${i*0.1}s`}} className="skeleton" />)}
          </div>
        ) : subjects.length === 0 ? (
          <div style={styles.empty} className="animate-scale">
            <div style={styles.emptyIcon}>🎓</div>
            <h2 style={styles.emptyTitle}>No subjects yet</h2>
            <p style={styles.emptyText}>Add your first subject to start tracking your grades</p>
            <button onClick={() => setShowModal(true)} style={styles.emptyBtn}
              onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
              onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
              Add Your First Subject
            </button>
          </div>
        ) : (
          <div style={styles.grid}>
            {subjects.map((subject, i) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                delay={i * 0.06}
                onClick={() => navigate(`/subject/${subject.id}`)}
                onEdit={e => { e.stopPropagation(); setEditSubject(subject); setShowModal(true); }}
                onDelete={e => { e.stopPropagation(); setDeleteConfirm(subject); }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {showModal && (
        <SubjectModal
          subject={editSubject}
          onClose={() => { setShowModal(false); setEditSubject(null); }}
          onSave={async (data) => {
            try {
              if (editSubject) {
                await api.updateSubject(editSubject.id, data);
              } else {
                await api.createSubject(data);
              }
              await loadSubjects();
              setShowModal(false);
              setEditSubject(null);
            } catch (err) { throw err; }
          }}
        />
      )}

      {deleteConfirm && (
        <DeleteModal
          name={deleteConfirm.subject_name}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={styles.statCard}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '26px', fontWeight: '800', color, letterSpacing: '-1px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '500', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function SubjectCard({ subject, delay, onClick, onEdit, onDelete }) {
  const gradeData = calculateGrade(subject.categories);
  const status = gradeData ? getGradeStatus(gradeData.grade) : null;
  const totalWeight = (subject.categories || []).reduce((s, c) => s + c.category_weight, 0);

  return (
    <div
      onClick={onClick}
      style={{ ...styles.subjectCard, animationDelay: `${delay}s` }}
      className="animate-in"
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 12px 36px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.08), 0 4px 16px rgba(15,23,42,0.04)';
      }}
    >
      <div style={styles.cardHeader}>
        <div style={styles.subjectInitial}>{subject.subject_name[0]}</div>
        <div style={styles.cardActions}>
          <ActionBtn onClick={onEdit} icon="✏️" title="Edit" />
          <ActionBtn onClick={onDelete} icon="🗑️" title="Delete" danger />
        </div>
      </div>

      <h3 style={styles.subjectName}>{subject.subject_name}</h3>
      {subject.instructor_name && (
        <p style={styles.subjectMeta}>👤 {subject.instructor_name}</p>
      )}
      {subject.semester && (
        <p style={styles.subjectMeta}>📅 {subject.semester}</p>
      )}

      <div style={styles.cardDivider} />

      {gradeData ? (
        <>
          <div style={styles.gradeRow}>
            <span style={styles.gradeLabel}>Current Grade</span>
            <span style={{ ...styles.gradeBadge, background: status.bg, color: status.color }}>
              {gradeData.grade.toFixed(2)}%
            </span>
          </div>
          <div style={{ ...styles.statusBadge, background: status.bg, color: status.color }}>
            {status.emoji} {status.label}
          </div>
          <ProgressBar value={gradeData.grade} color={status.color} />
        </>
      ) : (
        <div style={styles.noGrade}>No scores yet — add categories &amp; scores</div>
      )}

      <div style={styles.cardFooter}>
        <span style={styles.footerChip}>{subject.categories?.length || 0} categories</span>
        <span style={styles.footerChip}>{totalWeight.toFixed(0)}% weighted</span>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, icon, title, danger }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: 'transparent', border: 'none', cursor: 'pointer',
      padding: '6px', borderRadius: '6px', fontSize: '14px',
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? '#FEE2E2' : '#F1F5F9'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {icon}
    </button>
  );
}

function ProgressBar({ value, color }) {
  return (
    <div style={{ background: '#F1F5F9', borderRadius: '4px', height: '6px', marginTop: '8px', overflow: 'hidden' }}>
      <div style={{
        width: `${Math.min(value, 100)}%`, height: '100%',
        background: color, borderRadius: '4px',
        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  );
}

function DeleteModal({ name, onConfirm, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.deleteModal} onClick={e => e.stopPropagation()} className="animate-scale">
        <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '16px' }}>🗑️</div>
        <h3 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '8px' }}>
          Delete Subject
        </h3>
        <p style={{ fontSize: '14px', color: '#64748B', textAlign: 'center', marginBottom: '24px' }}>
          Are you sure you want to delete <strong>"{name}"</strong>? This will permanently remove all categories and scores.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={styles.cancelBtn}
            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
            Cancel
          </button>
          <button onClick={onConfirm} style={styles.deleteBtn}
            onMouseEnter={e => e.currentTarget.style.background = '#DC2626'}
            onMouseLeave={e => e.currentTarget.style.background = '#EF4444'}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', background: '#F0F4FF' },
  sidebar: {
    width: '240px', minHeight: '100vh', background: '#0F172A',
    display: 'flex', flexDirection: 'column', padding: '24px 16px',
    position: 'sticky', top: 0, flexShrink: 0,
  },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', paddingLeft: '8px' },
  logoIcon: {
    width: '36px', height: '36px', borderRadius: '8px',
    background: 'linear-gradient(135deg, #2563EB, #6366F1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: '16px', fontWeight: '700', color: 'white' },
  nav: { flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 12px', borderRadius: '8px', fontSize: '13px',
    fontWeight: '500', color: '#94A3B8', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  navItemActive: {
    background: 'rgba(37,99,235,0.2)', color: '#93C5FD',
  },
  sidebarBottom: { borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' },
  userCard: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', marginBottom: '4px' },
  avatar: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #2563EB, #6366F1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: '700', color: 'white', flexShrink: 0,
  },
  userEmail: { fontSize: '12px', color: '#E2E8F0', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userRole: { fontSize: '11px', color: '#64748B' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    width: '100%', padding: '8px 12px', borderRadius: '8px',
    border: 'none', background: 'transparent', cursor: 'pointer',
    fontSize: '13px', color: '#94A3B8', fontFamily: 'Plus Jakarta Sans, sans-serif',
    transition: 'background 0.15s',
  },
  main: { flex: 1, padding: '32px', maxWidth: '1100px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' },
  pageTitle: { fontSize: '28px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.5px' },
  pageSubtitle: { fontSize: '14px', color: '#64748B', marginTop: '4px' },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: '#2563EB', color: 'white', border: 'none',
    borderRadius: '10px', padding: '10px 18px', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s',
    boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px', marginBottom: '28px',
  },
  statCard: {
    background: 'white', borderRadius: '12px', padding: '20px',
    boxShadow: '0 1px 3px rgba(15,23,42,0.08), 0 4px 16px rgba(15,23,42,0.04)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  subjectCard: {
    background: 'white', borderRadius: '14px', padding: '22px',
    cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
    boxShadow: '0 1px 3px rgba(15,23,42,0.08), 0 4px 16px rgba(15,23,42,0.04)',
    border: '1px solid rgba(226,232,240,0.6)',
  },
  skeletonCard: { height: '220px', borderRadius: '14px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  subjectInitial: {
    width: '42px', height: '42px', borderRadius: '10px',
    background: 'linear-gradient(135deg, #EFF4FF, #DBEAFE)',
    color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', fontWeight: '800',
  },
  cardActions: { display: 'flex', gap: '4px' },
  subjectName: { fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '4px', letterSpacing: '-0.2px' },
  subjectMeta: { fontSize: '12px', color: '#64748B', marginBottom: '2px' },
  cardDivider: { height: '1px', background: '#F1F5F9', margin: '14px 0' },
  gradeRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  gradeLabel: { fontSize: '12px', color: '#64748B', fontWeight: '500' },
  gradeBadge: { fontSize: '15px', fontWeight: '800', padding: '2px 10px', borderRadius: '20px', fontFamily: 'DM Mono, monospace' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' },
  noGrade: { fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' },
  cardFooter: { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' },
  footerChip: { fontSize: '11px', background: '#F8FAFC', color: '#64748B', padding: '3px 8px', borderRadius: '20px', fontWeight: '500' },
  empty: {
    background: 'white', borderRadius: '16px', padding: '60px 40px',
    textAlign: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
    gridColumn: '1/-1',
  },
  emptyIcon: { fontSize: '56px', marginBottom: '16px' },
  emptyTitle: { fontSize: '22px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' },
  emptyText: { fontSize: '14px', color: '#64748B', marginBottom: '24px' },
  emptyBtn: {
    background: '#2563EB', color: 'white', border: 'none', borderRadius: '10px',
    padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
    transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(4px)', padding: '24px',
  },
  deleteModal: {
    background: 'white', borderRadius: '16px', padding: '32px',
    maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(15,23,42,0.2)',
  },
  cancelBtn: {
    flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid #E2E8F0',
    background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
    color: '#374151', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif',
  },
  deleteBtn: {
    flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
    background: '#EF4444', color: 'white', cursor: 'pointer', fontSize: '14px',
    fontWeight: '600', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif',
  },
};
