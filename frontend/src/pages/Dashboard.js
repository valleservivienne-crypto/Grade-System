// GradeTrack Dashboard v2.1
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, calculateGrade, getGradeStatus } from '../utils/api';
import SubjectModal from '../components/SubjectModal';

const Icons = {
  Edit: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  Layers: () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
};

const TUTORIAL_STEPS = [
  { icon: '', title: 'Welcome to GradeTrack!', description: 'GradeTrack helps you monitor your academic performance in real time. You can add subjects, set grading categories with weights, log your scores, and instantly see your standing — all in one place.', tip: ' This tutorial will walk you through everything. You can revisit it anytime.' },
  { icon: '', title: 'Step 1 — Add Your Subjects', description: 'Start by adding each subject you are enrolled in this semester. Click the "+ Add Subject" button at the top right of the dashboard. Fill in the subject name, your instructor\'s name, and the semester.', tip: ' You can add as many subjects as you need. Each subject is tracked independently.' },
  { icon: '️', title: 'Step 2 — Set Up Grading Categories', description: 'Once inside a subject, add grading categories such as Quizzes, Assignments, Midterm Exam, and Final Exam. Each category has a weight (e.g., Quizzes = 30%, Finals = 40%). Make sure your total weights add up to 100%.', tip: ' Categories with higher weights impact your grade more — set them accurately!' },
  { icon: '', title: 'Step 3 — Log Your Scores', description: 'Inside each category, add individual scores. Enter the score you obtained and the total possible score (e.g., 18 out of 20). You can label each score (e.g., "Quiz 1", "Assignment 2") for easy reference.', tip: ' The more scores you log, the more accurate your grade calculation becomes.' },
  { icon: '', title: 'Step 4 — Track Your Grade', description: 'GradeTrack automatically calculates your weighted grade based on your scores. Your grade status is shown as On Track (≥85%), Needs Improvement (75–84%), or At Risk (<75%), with color indicators on each subject card.', tip: ' Green means you\'re doing great! Yellow is a warning, and Red means you need to focus more.' },
  { icon: '', title: 'Step 5 — Use the Target Grade Planner', description: 'Inside any subject, you can set a target grade and GradeTrack will calculate the required average score on your remaining assessments to reach that goal. This helps you plan your study sessions effectively.', tip: ' Use the planner before exams to know exactly what score you need to pass or excel.' },
  { icon: '', title: "You're All Set!", description: 'You now know everything you need to use GradeTrack effectively. Start by adding your first subject — your academic journey begins here. Good luck this semester! ', tip: ' You can reopen this tutorial anytime by clicking the "?" button on the dashboard.' },
];

function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'success' ? '#ECFDF5' : t.type === 'error' ? '#FEF2F2' : '#EFF4FF',
          border: `1px solid ${t.type === 'success' ? '#A7F3D0' : t.type === 'error' ? '#FECACA' : '#BFDBFE'}`,
          color: t.type === 'success' ? '#065F46' : t.type === 'error' ? '#991B1B' : '#1E40AF',
          padding: '12px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
          boxShadow: '0 4px 20px rgba(15,23,42,0.12)', display: 'flex', alignItems: 'center', gap: '8px',
          animation: 'slideIn 0.3s ease', minWidth: '220px',
        }}>
          <span style={{ fontSize: '16px' }}>{t.type === 'success' ? '' : t.type === 'error' ? '' : 'ℹ️'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toastId = useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const loadSubjects = useCallback(async () => {
    try {
      const data = await api.getSubjects();
      const full = await Promise.all(data.map(s => api.getSubject(s.id)));
      const attendances = await Promise.all(full.map(s => api.getAttendance(s.id).catch(() => null)));
      setSubjects(full.map((s, i) => ({ ...s, attendance: attendances[i] })));
    } catch (err) { console.error('Failed to load subjects:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);

  useEffect(() => {
    const seen = localStorage.getItem('gradetrack_tutorial_seen');
    if (!seen) { setShowTutorial(true); localStorage.setItem('gradetrack_tutorial_seen', 'true'); }
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.deleteSubject(id);
      setSubjects(s => s.filter(x => x.id !== id));
      setDeleteConfirm(null);
      showToast('Subject deleted successfully');
    } catch (err) { showToast('Failed to delete subject', 'error'); }
  };

  const stats = (() => {
    const withGrades = subjects.map(s => { const g = calculateGrade(s.categories, s.attendance); return g ? g.grade : null; }).filter(g => g !== null);
    const onTrackCount = subjects.filter(s => {
      const g = calculateGrade(s.categories, s.attendance);
      const pg = s.passing_grade ?? 75;
      return g && g.grade >= pg + 10;
    }).length;
    const atRiskCount = subjects.filter(s => {
      const g = calculateGrade(s.categories, s.attendance);
      const pg = s.passing_grade ?? 75;
      return g && g.grade < pg;
    }).length;
    return { total: subjects.length, avg: withGrades.length ? withGrades.reduce((a, b) => a + b, 0) / withGrades.length : null, onTrack: onTrackCount, atRisk: atRiskCount };
  })();

  const filteredSubjects = subjects
    .filter(s => s.subject_name.toLowerCase().includes(search.toLowerCase()) || (s.instructor_name || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name-asc') return a.subject_name.localeCompare(b.subject_name);
      if (sortBy === 'name-desc') return b.subject_name.localeCompare(a.subject_name);
      if (sortBy === 'grade-high') { const ga = calculateGrade(a.categories, a.attendance)?.grade ?? -1; const gb = calculateGrade(b.categories, b.attendance)?.grade ?? -1; return gb - ga; }
      if (sortBy === 'grade-low') { const ga = calculateGrade(a.categories, a.attendance)?.grade ?? 101; const gb = calculateGrade(b.categories, b.attendance)?.grade ?? 101; return ga - gb; }
      if (sortBy === 'at-risk') { const ga = calculateGrade(a.categories, a.attendance)?.grade ?? 100; const gb = calculateGrade(b.categories, b.attendance)?.grade ?? 100; return ga - gb; }
      return 0;
    });

  const openTutorial = () => { setTutorialStep(0); setShowTutorial(true); };
  const closeTutorial = () => setShowTutorial(false);
  const nextStep = () => { if (tutorialStep < TUTORIAL_STEPS.length - 1) setTutorialStep(t => t + 1); else closeTutorial(); };
  const prevStep = () => { if (tutorialStep > 0) setTutorialStep(t => t - 1); };
  const step = TUTORIAL_STEPS[tutorialStep];

  return (
    <div style={styles.page}>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>

      <aside style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <div style={styles.logoIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          <span style={styles.logoText}>GradeTrack</span>
        </div>
        <nav style={styles.nav}>
          <div style={{ ...styles.navItem, ...styles.navItemActive }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/></svg>
            Dashboard
          </div>
        </nav>
        <div style={styles.sidebarBottom}>
          <button onClick={openTutorial} style={styles.tutorialSideBtn} onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={styles.tutorialSideIcon}>?</span> How to use GradeTrack
          </button>
          <div style={styles.userCard}>
            <div style={styles.avatar}>{user?.email?.[0]?.toUpperCase()}</div>
            <div style={{flex:1,overflow:'hidden'}}>
              <div style={styles.userEmail}>{user?.email}</div>
              <div style={styles.userRole}>Student</div>
            </div>
          </div>
          <button onClick={() => setLogoutConfirm(true)} style={styles.logoutBtn} onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Sign out
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>My Subjects</h1>
            <p style={styles.pageSubtitle}>Track your academic performance across all subjects</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={openTutorial} style={styles.helpBtn} title="Open Tutorial" onMouseEnter={e => e.currentTarget.style.background = '#EFF4FF'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#2563EB' }}>?</span>
            </button>
            <button onClick={() => navigate('/semester-summary')} style={{ ...styles.addBtn, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #4F46E5, #7C3AED)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #6366F1, #8B5CF6)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            Semester Summary
          </button>

          <button onClick={() => { setEditSubject(null); setShowModal(true); }} style={styles.addBtn} onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'} onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
              Add Subject
            </button>
          </div>
        </div>

        {subjects.length > 0 && (
          <div style={styles.statsGrid} className="animate-in">
            <StatCard SvgIcon={() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>} label="Total Subjects" value={stats.total} color="#2563EB" />
            <StatCard SvgIcon={() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>} label="Overall Average" value={stats.avg !== null ? `${stats.avg.toFixed(1)}%` : '—'} color={stats.avg !== null ? getGradeStatus(stats.avg).color : '#94A3B8'} />
            <StatCard SvgIcon={() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} label="On Track" value={stats.onTrack} color="#10B981" />
            <StatCard SvgIcon={() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} label="At Risk" value={stats.atRisk} color="#EF4444" />
          </div>
        )}

        {subjects.length > 0 && (
          <div style={styles.searchRow}>
            <div style={styles.searchWrap}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: '#94A3B8', flexShrink: 0 }}><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <input type="text" placeholder="Search subjects or instructors..." value={search} onChange={e => setSearch(e.target.value)} style={styles.searchInput} />
              {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '14px', padding: '0 4px' }}>×</button>}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={styles.sortSelect}>
              <option value="default">Sort: Default</option>
              <option value="name-asc">Name: A → Z</option>
              <option value="name-desc">Name: Z → A</option>
              <option value="grade-high">Grade: Highest First</option>
              <option value="grade-low">Grade: Lowest First</option>
              <option value="at-risk">At Risk First</option>
            </select>
          </div>
        )}

        {loading ? (
          <div style={styles.grid}>{[1,2,3].map(i => <div key={i} style={{...styles.skeletonCard, animationDelay: `${i*0.1}s`}} className="skeleton" />)}</div>
        ) : subjects.length === 0 ? (
          <EmptyState onAdd={() => setShowModal(true)} onTutorial={openTutorial} />
        ) : filteredSubjects.length === 0 ? (
          <div style={styles.noResults}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}></div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>No subjects found</div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>Try a different search term</div>
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredSubjects.map((subject, i) => (
              <SubjectCard key={subject.id} subject={subject} delay={i * 0.06}
                onClick={() => navigate(`/subject/${subject.id}`)}
                onEdit={e => { e.stopPropagation(); setEditSubject(subject); setShowModal(true); }}
                onDelete={e => { e.stopPropagation(); setDeleteConfirm(subject); }} />
            ))}
          </div>
        )}
      </main>

      <Toast toasts={toasts} />

      {showModal && (
        <SubjectModal subject={editSubject}
          onClose={() => { setShowModal(false); setEditSubject(null); }}
          onSave={async (data) => {
            try {
              if (editSubject) { await api.updateSubject(editSubject.id, data); showToast('Subject updated successfully!'); }
              else { await api.createSubject(data); showToast('Subject added successfully!'); }
              await loadSubjects(); setShowModal(false); setEditSubject(null);
            } catch (err) { showToast('Failed to save subject', 'error'); throw err; }
          }} />
      )}

      {deleteConfirm && (
        <div style={styles.overlay} onClick={() => setDeleteConfirm(null)}>
          <div style={styles.confirmModal} onClick={e => e.stopPropagation()} className="animate-scale">
            <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '16px' }}>️</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '8px' }}>Delete Subject</h3>
            <p style={{ fontSize: '14px', color: '#64748B', textAlign: 'center', marginBottom: '24px' }}>
              Are you sure you want to delete <strong>"{deleteConfirm.subject_name}"</strong>? This will permanently remove all categories and scores.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={styles.cancelBtn} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} style={styles.deleteBtn} onMouseEnter={e => e.currentTarget.style.background = '#DC2626'} onMouseLeave={e => e.currentTarget.style.background = '#EF4444'}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {logoutConfirm && (
        <div style={styles.overlay} onClick={() => setLogoutConfirm(false)}>
          <div style={styles.confirmModal} onClick={e => e.stopPropagation()} className="animate-scale">
            <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '16px' }}></div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '8px', color: '#0F172A' }}>Sign Out</h3>
            <p style={{ fontSize: '14px', color: '#64748B', textAlign: 'center', marginBottom: '24px' }}>Are you sure you want to sign out of GradeTrack?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setLogoutConfirm(false)} style={styles.cancelBtn} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>Stay</button>
              <button onClick={logout} style={styles.deleteBtn} onMouseEnter={e => e.currentTarget.style.background = '#DC2626'} onMouseLeave={e => e.currentTarget.style.background = '#EF4444'}>Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {showTutorial && (
        <div style={styles.overlay} onClick={closeTutorial}>
          <div style={styles.tutorialModal} onClick={e => e.stopPropagation()} className="animate-scale">
            <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${((tutorialStep + 1) / TUTORIAL_STEPS.length) * 100}%` }} /></div>
            <div style={styles.stepIndicator}>
              <span style={styles.stepBadge}>Step {tutorialStep + 1} of {TUTORIAL_STEPS.length}</span>
              <button onClick={closeTutorial} style={styles.skipBtn}>Skip Tutorial ×</button>
            </div>
            <div style={styles.tutorialContent}>
              <div style={styles.tutorialIconWrap}><TutorialIcon index={tutorialStep} /></div>
              <h2 style={styles.tutorialTitle}>{step.title}</h2>
              <p style={styles.tutorialDesc}>{step.description}</p>
              <div style={styles.tutorialTip}>{step.tip}</div>
            </div>
            <div style={styles.dots}>
              {TUTORIAL_STEPS.map((_, i) => <button key={i} onClick={() => setTutorialStep(i)} style={{ ...styles.dot, background: i === tutorialStep ? '#2563EB' : '#E2E8F0', width: i === tutorialStep ? '20px' : '8px' }} />)}
            </div>
            <div style={styles.tutorialNav}>
              <button onClick={prevStep} style={{ ...styles.tutorialNavBtn, opacity: tutorialStep === 0 ? 0.3 : 1 }} disabled={tutorialStep === 0}>← Previous</button>
              <button onClick={nextStep} style={styles.tutorialNextBtn}>{tutorialStep === TUTORIAL_STEPS.length - 1 ? "Let's Go! " : 'Next →'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd, onTutorial }) {
  return (
    <div style={styles.emptyWrap} className="animate-scale">
      <div style={styles.emptyCard}>
        <div style={styles.emptyIconWrap}><span style={styles.emptyIconBig}></span></div>
        <h2 style={styles.emptyTitle}>Welcome to GradeTrack!</h2>
        <p style={styles.emptyText}>Start tracking your academic performance by adding your first subject. Monitor your grades, set targets, and stay on top of your studies.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onAdd} style={styles.emptyBtnPrimary} onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'} onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>+ Add Your First Subject</button>
          <button onClick={onTutorial} style={styles.emptyBtnSecondary} onMouseEnter={e => e.currentTarget.style.background = '#EFF4FF'} onMouseLeave={e => e.currentTarget.style.background = 'white'}> View Tutorial</button>
        </div>
      </div>
      <div style={styles.tipsGrid}>
        <TipCard SvgIcon={() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>} title="Add Subjects" desc="Add each subject you're enrolled in this semester with instructor and semester info." />
        <TipCard SvgIcon={() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><path d="M3 6l9 6 9-6"/><path d="M3 18l9-6 9 6"/></svg>} title="Set Categories" desc="Create grading categories like Quizzes, Assignments, Midterm, and Finals with their weights." />
        <TipCard SvgIcon={() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/></svg>} title="Log Your Scores" desc="Enter your scores for each activity. GradeTrack automatically computes your grade." />
        <TipCard SvgIcon={() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>} title="Target Grade Planner" desc="Set a target grade and see exactly what score you need on remaining assessments to reach it." />
        <TipCard SvgIcon={() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>} title="Track Progress" desc="View your overall average, at-risk subjects, and subjects that are on track — all at a glance." />
        <TipCard SvgIcon={() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} title="Risk Indicators" desc="Green = On Track (≥85%), Yellow = Needs Improvement (75–84%), Red = At Risk (<75%)." />
      </div>
    </div>
  );
}

function TipCard({ SvgIcon, title, desc }) {
  return (
    <div style={styles.tipCard} onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.12)'; e.currentTarget.style.borderColor = '#BFDBFE'; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.06)'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
      <div style={styles.tipIcon}>{SvgIcon && <SvgIcon />}</div>
      <div style={styles.tipTitle}>{title}</div>
      <div style={styles.tipDesc}>{desc}</div>
    </div>
  );
}

function StatCard({ SvgIcon, label, value, color }) {
  return (
    <div style={styles.statCard}>
      <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'#EFF4FF', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'10px', color }}>{SvgIcon && <SvgIcon />}</div>
      <div style={{ fontSize: '26px', fontWeight: '800', color, letterSpacing: '-1px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '500', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function SubjectCard({ subject, delay, onClick, onEdit, onDelete }) {
  const gradeData = calculateGrade(subject.categories, subject.attendance);
  const status = gradeData ? getGradeStatus(gradeData.grade, subject.passing_grade ?? 75) : null;
  const totalWeight = (subject.categories || []).reduce((s, c) => s + c.category_weight, 0);
  return (
    <div onClick={onClick} style={{ ...styles.subjectCard, animationDelay: `${delay}s` }} className="animate-in"
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.08), 0 4px 16px rgba(15,23,42,0.04)'; }}>
      <div style={styles.cardHeader}>
        <div style={styles.subjectInitial}>{subject.subject_name[0]}</div>
        <div style={styles.cardActions}>
          <ActionBtn onClick={onEdit} Icon={Icons.Edit} title="Edit" />
          <ActionBtn onClick={onDelete} Icon={Icons.Trash} title="Delete" danger />
        </div>
      </div>
      <h3 style={styles.subjectName}>{subject.subject_name}</h3>
      {subject.instructor_name && <p style={styles.subjectMeta}> {subject.instructor_name}</p>}
      {subject.semester && <p style={styles.subjectMeta}> {subject.semester}</p>}
      <div style={styles.cardDivider} />
      {gradeData ? (
        <>
          <div style={styles.gradeRow}><span style={styles.gradeLabel}>Current Grade</span><span style={{ ...styles.gradeBadge, background: status.bg, color: status.color }}>{gradeData.grade.toFixed(2)}%</span></div>
          <div style={{ ...styles.statusChip, background: status.bg, color: status.color }}><span style={{ width:'6px', height:'6px', borderRadius:'50%', background:status.color, flexShrink:0 }} />{status.label}</div>
          <ProgressBar value={gradeData.grade} color={status.color} />
        </>
      ) : <div style={styles.noGrade}>No scores yet — add categories &amp; scores</div>}
      <div style={styles.cardFooter}>
        <span style={styles.footerChip}>{subject.categories?.length || 0} categories</span>
        <span style={styles.footerChip}>{totalWeight.toFixed(0)}% weighted</span>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, Icon, title, danger }) {
  return (
    <button onClick={onClick} title={title}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '7px', borderRadius: '7px', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? '#FEE2E2' : '#F1F5F9'; e.currentTarget.style.color = danger ? '#EF4444' : '#374151'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}>
      <Icon />
    </button>
  );
}

function ProgressBar({ value, color }) {
  return (
    <div style={{ background: '#F1F5F9', borderRadius: '4px', height: '6px', marginTop: '8px', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
    </div>
  );
}


// ─── Tutorial Icon ────────────────────────────────────────────────────────────
function TutorialIcon({ index }) {
  const icons = [
    // Welcome
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
    // Add Subjects
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
    // Set Categories
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><path d="M3 6l9 6 9-6"/><path d="M3 18l9-6 9 6"/></svg>,
    // Log Scores
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/></svg>,
    // Track Grade
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
    // Target Grade Planner
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    // All Set
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  ];
  return <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icons[index] || icons[0]}</span>;
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', background: '#F0F4FF' },
  sidebar: { width: '240px', minHeight: '100vh', background: '#0F172A', display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'sticky', top: 0, flexShrink: 0 },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', paddingLeft: '8px' },
  logoIcon: { width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #2563EB, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: '16px', fontWeight: '700', color: 'white' },
  nav: { flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', color: '#94A3B8', cursor: 'pointer', transition: 'all 0.15s' },
  navItemActive: { background: 'rgba(37,99,235,0.2)', color: '#93C5FD' },
  sidebarBottom: { borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' },
  tutorialSideBtn: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#60A5FA', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'background 0.15s', marginBottom: '8px', fontWeight: '500' },
  tutorialSideIcon: { width: '18px', height: '18px', borderRadius: '50%', background: '#2563EB', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 },
  userCard: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', marginBottom: '4px' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: 'white', flexShrink: 0 },
  userEmail: { fontSize: '12px', color: '#E2E8F0', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userRole: { fontSize: '11px', color: '#64748B' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#94A3B8', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'background 0.15s' },
  main: { flex: 1, padding: '32px', maxWidth: '1100px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' },
  pageTitle: { fontSize: '28px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.5px' },
  pageSubtitle: { fontSize: '14px', color: '#64748B', marginTop: '4px' },
  helpBtn: { width: '38px', height: '38px', borderRadius: '50%', border: '1.5px solid #DBEAFE', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', flexShrink: 0 },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(37,99,235,0.3)', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '20px' },
  statCard: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.08), 0 4px 16px rgba(15,23,42,0.04)' },
  searchRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  searchWrap: { flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '10px', background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '0 14px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '13px', color: '#0F172A', background: 'transparent', padding: '10px 0', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  sortSelect: { background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#374151', cursor: 'pointer', outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  skeletonCard: { height: '220px', borderRadius: '14px' },
  noResults: { background: 'white', borderRadius: '16px', padding: '60px 40px', textAlign: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.08)' },
  emptyWrap: { display: 'flex', flexDirection: 'column', gap: '24px' },
  emptyCard: { background: 'white', borderRadius: '20px', padding: '52px 40px', textAlign: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.08)', border: '1px solid #E2E8F0' },
  emptyIconWrap: { width: '88px', height: '88px', borderRadius: '24px', margin: '0 auto 20px', background: 'linear-gradient(135deg, #EFF4FF, #DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  emptyIconBig: { fontSize: '44px' },
  emptyTitle: { fontSize: '24px', fontWeight: '800', color: '#0F172A', marginBottom: '10px', letterSpacing: '-0.5px' },
  emptyText: { fontSize: '15px', color: '#64748B', marginBottom: '28px', maxWidth: '420px', margin: '0 auto 28px', lineHeight: '1.6' },
  emptyBtnPrimary: { background: '#2563EB', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(37,99,235,0.3)', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  emptyBtnSecondary: { background: 'white', color: '#2563EB', border: '1.5px solid #BFDBFE', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  tipsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' },
  tipCard: { background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #E2E8F0', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' },
  tipIcon: { fontSize: '28px', marginBottom: '10px' },
  tipTitle: { fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' },
  tipDesc: { fontSize: '12px', color: '#64748B', lineHeight: '1.5' },
  subjectCard: { background: 'white', borderRadius: '14px', padding: '22px', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)', boxShadow: '0 1px 3px rgba(15,23,42,0.08), 0 4px 16px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.6)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  subjectInitial: { width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #EFF4FF, #DBEAFE)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800' },
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
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '24px' },
  confirmModal: { background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(15,23,42,0.2)' },
  cancelBtn: { flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#374151', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  deleteBtn: { flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#EF4444', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  tutorialModal: { background: 'white', borderRadius: '20px', padding: '0', maxWidth: '520px', width: '100%', boxShadow: '0 24px 64px rgba(15,23,42,0.25)', overflow: 'hidden' },
  progressTrack: { height: '4px', background: '#F1F5F9', width: '100%' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #2563EB, #6366F1)', transition: 'width 0.4s ease', borderRadius: '0 2px 2px 0' },
  stepIndicator: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px 0' },
  stepBadge: { fontSize: '11px', fontWeight: '700', color: '#2563EB', background: '#EFF4FF', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.3px' },
  skipBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#94A3B8', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: '500', padding: '4px 8px', borderRadius: '6px' },
  tutorialContent: { padding: '24px 32px' },
  tutorialIconWrap: { width: '72px', height: '72px', borderRadius: '20px', margin: '0 auto 20px', background: 'linear-gradient(135deg, #EFF4FF, #DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  tutorialIcon: { fontSize: '36px' },
  tutorialTitle: { fontSize: '20px', fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: '12px', letterSpacing: '-0.4px' },
  tutorialDesc: { fontSize: '14px', color: '#475569', textAlign: 'center', lineHeight: '1.7', marginBottom: '16px' },
  tutorialTip: { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#166534', lineHeight: '1.5' },
  dots: { display: 'flex', justifyContent: 'center', gap: '6px', padding: '0 32px 16px' },
  dot: { height: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 },
  tutorialNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px 28px', gap: '12px', borderTop: '1px solid #F1F5F9' },
  tutorialNavBtn: { background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'all 0.15s' },
  tutorialNextBtn: { background: 'linear-gradient(135deg, #2563EB, #6366F1)', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: '0 4px 12px rgba(37,99,235,0.35)', flex: 1 },
};
