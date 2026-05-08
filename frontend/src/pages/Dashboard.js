import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, calculateGrade, getGradeStatus } from '../utils/api';
import SubjectModal from '../components/SubjectModal';

// ─── SVG Icon Library ────────────────────────────────────────────────────────
const Icons = {
  GraduationCap: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  BookOpen: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  BarChart: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
    </svg>
  ),
  TrendingUp: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  AlertTriangle: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  CheckCircle: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Dashboard: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  LogOut: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Plus: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Search: ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  X: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Edit: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Trash: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  User: ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Calendar: ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  HelpCircle: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Layers: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  Scale: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="3" x2="12" y2="21"/><path d="M3 6l9 6 9-6"/><path d="M3 18l9-6 9 6"/>
    </svg>
  ),
  Target: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Rocket: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  ),
  ClipboardList: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/>
    </svg>
  ),
  CheckSquare: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  AlertOctagon: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Magnifier: () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Inbox: () => (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  ),
  SuccessCheck: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  ErrorX: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  Info: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Delete: () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  Wave: () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
    </svg>
  ),
};

// Tutorial steps — icons now use SVG components
const TUTORIAL_STEPS = [
  { Icon: Icons.GraduationCap, title: 'Welcome to GradeTrack!', description: 'GradeTrack helps you monitor your academic performance in real time. You can add subjects, set grading categories with weights, log your scores, and instantly see your standing — all in one place.', tip: 'This tutorial will walk you through everything. You can revisit it anytime.' },
  { Icon: Icons.BookOpen, title: 'Step 1 — Add Your Subjects', description: 'Start by adding each subject you are enrolled in this semester. Click the "+ Add Subject" button at the top right of the dashboard. Fill in the subject name, your instructor\'s name, and the semester.', tip: 'You can add as many subjects as you need. Each subject is tracked independently.' },
  { Icon: Icons.Scale, title: 'Step 2 — Set Up Grading Categories', description: 'Once inside a subject, add grading categories such as Quizzes, Assignments, Midterm Exam, and Final Exam. Each category has a weight (e.g., Quizzes = 30%, Finals = 40%). Make sure your total weights add up to 100%.', tip: 'Categories with higher weights impact your grade more — set them accurately.' },
  { Icon: Icons.ClipboardList, title: 'Step 3 — Log Your Scores', description: 'Inside each category, add individual scores. Enter the score you obtained and the total possible score (e.g., 18 out of 20). You can label each score for easy reference.', tip: 'The more scores you log, the more accurate your grade calculation becomes.' },
  { Icon: Icons.BarChart, title: 'Step 4 — Track Your Grade', description: 'GradeTrack automatically calculates your weighted grade based on your scores. Your grade status is shown as On Track (≥85%), Needs Improvement (75–84%), or At Risk (<75%), with color indicators on each subject card.', tip: 'Green means you\'re doing great. Yellow is a warning, and Red means you need to focus more.' },
  { Icon: Icons.Target, title: 'Step 5 — Use the Target Grade Planner', description: 'Inside any subject, you can set a target grade and GradeTrack will calculate the required average score on your remaining assessments to reach that goal.', tip: 'Use the planner before exams to know exactly what score you need to pass or excel.' },
  { Icon: Icons.Rocket, title: "You're All Set!", description: 'You now know everything you need to use GradeTrack effectively. Start by adding your first subject — your academic journey begins here. Good luck this semester!', tip: 'You can reopen this tutorial anytime by clicking the "?" button on the dashboard.' },
];

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'success' ? '#ECFDF5' : t.type === 'error' ? '#FEF2F2' : '#EFF4FF',
          border: `1px solid ${t.type === 'success' ? '#A7F3D0' : t.type === 'error' ? '#FECACA' : '#BFDBFE'}`,
          color: t.type === 'success' ? '#065F46' : t.type === 'error' ? '#991B1B' : '#1E40AF',
          padding: '12px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
          boxShadow: '0 4px 20px rgba(15,23,42,0.12)', display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'slideIn 0.3s ease', minWidth: '220px',
        }}>
          <span style={{ color: 'inherit', flexShrink: 0 }}>
            {t.type === 'success' ? <Icons.SuccessCheck /> : t.type === 'error' ? <Icons.ErrorX /> : <Icons.Info />}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
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
    return {
      total: subjects.length,
      avg: withGrades.length ? withGrades.reduce((a, b) => a + b, 0) / withGrades.length : null,
      onTrack: withGrades.filter(g => g >= 85).length,
      atRisk: withGrades.filter(g => g < 75).length,
    };
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
        .animate-in { animation: fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .animate-scale { animation: scaleIn 0.25s cubic-bezier(0.22,1,0.36,1) both; }
        .skeleton { background: linear-gradient(90deg, #F1F5F9 25%, #E8EDF5 50%, #F1F5F9 75%); background-size: 400% 100%; animation: shimmer 1.5s infinite; border-radius: 14px; }
        @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
        @media print { body { margin: 0; } }
      `}</style>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={styles.sidebar}>
        {/* Logo */}
        <div style={styles.sidebarLogo}>
          <div style={styles.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={styles.logoText}>GradeTrack</div>
            <div style={styles.logoSub}>Academic Tracker</div>
          </div>
        </div>

        {/* Nav section label */}
        <div style={styles.navSection}>
          <span style={styles.navSectionLabel}>MAIN MENU</span>
          <nav style={styles.nav}>
            <div style={{ ...styles.navItem, ...styles.navItemActive }}>
              <span style={styles.navIconWrap}><Icons.Dashboard /></span>
              <span>Dashboard</span>
              <span style={styles.navActiveDot} />
            </div>
          </nav>
        </div>

        {/* Sidebar bottom */}
        <div style={styles.sidebarBottom}>
          {/* Divider with label */}
          <div style={styles.sidebarDivider}>
            <span style={styles.navSectionLabel}>SUPPORT</span>
          </div>

          <button
            onClick={openTutorial}
            style={styles.tutorialSideBtn}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={styles.tutorialSideIconWrap}><Icons.HelpCircle /></span>
            How to use GradeTrack
          </button>

          {/* User card */}
          <div style={styles.userCard}>
            <div style={styles.avatar}>{user?.email?.[0]?.toUpperCase()}</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={styles.userEmail}>{user?.email}</div>
              <div style={styles.userRole}>Student</div>
            </div>
          </div>

          <button
            onClick={() => setLogoutConfirm(true)}
            style={styles.logoutBtn}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#FCA5A5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}>
            <Icons.LogOut />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>My Subjects</h1>
            <p style={styles.pageSubtitle}>Track your academic performance across all subjects</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={openTutorial}
              style={styles.helpBtn}
              title="Open Tutorial"
              onMouseEnter={e => e.currentTarget.style.background = '#EFF4FF'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              <Icons.HelpCircle />
            </button>
            <button
              onClick={() => { setEditSubject(null); setShowModal(true); }}
              style={styles.addBtn}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #1D4ED8, #4F46E5)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(37,99,235,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #2563EB, #6366F1)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.3)'; }}>
              <Icons.Plus />
              Add Subject
            </button>
          </div>
        </div>

        {/* Stats */}
        {subjects.length > 0 && (
          <div style={styles.statsGrid} className="animate-in">
            <StatCard Icon={Icons.BookOpen} label="Total Subjects" value={stats.total} color="#2563EB" bg="#EFF4FF" />
            <StatCard Icon={Icons.BarChart} label="Overall Average" value={stats.avg !== null ? `${stats.avg.toFixed(1)}%` : '—'} color={stats.avg !== null ? getGradeStatus(stats.avg).color : '#94A3B8'} bg={stats.avg !== null ? getGradeStatus(stats.avg).bg : '#F8FAFC'} />
            <StatCard Icon={Icons.CheckCircle} label="On Track" value={stats.onTrack} color="#059669" bg="#ECFDF5" />
            <StatCard Icon={Icons.AlertTriangle} label="At Risk" value={stats.atRisk} color="#DC2626" bg="#FEF2F2" />
          </div>
        )}

        {/* Search + Sort */}
        {subjects.length > 0 && (
          <div style={styles.searchRow}>
            <div style={styles.searchWrap}>
              <span style={{ color: '#94A3B8', flexShrink: 0, display: 'flex' }}><Icons.Search /></span>
              <input
                type="text"
                placeholder="Search subjects or instructors..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={styles.searchInput} />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: '2px' }}>
                  <Icons.X />
                </button>
              )}
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

        {/* Content */}
        {loading ? (
          <div style={styles.grid}>{[1, 2, 3].map(i => <div key={i} style={{ height: '220px', borderRadius: '14px', animationDelay: `${i * 0.1}s` }} className="skeleton" />)}</div>
        ) : subjects.length === 0 ? (
          <EmptyState onAdd={() => setShowModal(true)} onTutorial={openTutorial} />
        ) : filteredSubjects.length === 0 ? (
          <div style={styles.noResults}>
            <div style={{ marginBottom: '14px', opacity: 0.5 }}><Icons.Magnifier /></div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '6px', letterSpacing: '-0.3px' }}>No subjects found</div>
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

      {/* Subject Modal */}
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

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={styles.overlay} onClick={() => setDeleteConfirm(null)}>
          <div style={styles.confirmModal} onClick={e => e.stopPropagation()} className="animate-scale">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><Icons.Delete /></div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '8px', letterSpacing: '-0.3px' }}>Delete Subject</h3>
            <p style={{ fontSize: '14px', color: '#64748B', textAlign: 'center', marginBottom: '24px', lineHeight: '1.6' }}>
              Are you sure you want to delete <strong>"{deleteConfirm.subject_name}"</strong>? This will permanently remove all categories and scores.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setDeleteConfirm(null)} style={styles.cancelBtn} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} style={styles.deleteBtn} onMouseEnter={e => e.currentTarget.style.background = '#DC2626'} onMouseLeave={e => e.currentTarget.style.background = '#EF4444'}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirm */}
      {logoutConfirm && (
        <div style={styles.overlay} onClick={() => setLogoutConfirm(false)}>
          <div style={styles.confirmModal} onClick={e => e.stopPropagation()} className="animate-scale">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><Icons.Wave /></div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '8px', color: '#0F172A', letterSpacing: '-0.3px' }}>Sign Out</h3>
            <p style={{ fontSize: '14px', color: '#64748B', textAlign: 'center', marginBottom: '24px' }}>Are you sure you want to sign out of GradeTrack?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setLogoutConfirm(false)} style={styles.cancelBtn} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>Stay</button>
              <button onClick={logout} style={styles.deleteBtn} onMouseEnter={e => e.currentTarget.style.background = '#DC2626'} onMouseLeave={e => e.currentTarget.style.background = '#EF4444'}>Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
        <div style={styles.overlay} onClick={closeTutorial}>
          <div style={styles.tutorialModal} onClick={e => e.stopPropagation()} className="animate-scale">
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${((tutorialStep + 1) / TUTORIAL_STEPS.length) * 100}%` }} />
            </div>
            <div style={styles.stepIndicator}>
              <span style={styles.stepBadge}>Step {tutorialStep + 1} of {TUTORIAL_STEPS.length}</span>
              <button onClick={closeTutorial} style={styles.skipBtn}>Skip Tutorial</button>
            </div>
            <div style={styles.tutorialContent}>
              <div style={styles.tutorialIconWrap}>
                <span style={{ color: '#2563EB' }}><step.Icon size={32} /></span>
              </div>
              <h2 style={styles.tutorialTitle}>{step.title}</h2>
              <p style={styles.tutorialDesc}>{step.description}</p>
              <div style={styles.tutorialTip}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#166534', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>TIP</span>
                {step.tip}
              </div>
            </div>
            <div style={styles.dots}>
              {TUTORIAL_STEPS.map((_, i) => (
                <button key={i} onClick={() => setTutorialStep(i)} style={{ ...styles.dot, background: i === tutorialStep ? '#2563EB' : '#E2E8F0', width: i === tutorialStep ? '20px' : '8px' }} />
              ))}
            </div>
            <div style={styles.tutorialNav}>
              <button onClick={prevStep} style={{ ...styles.tutorialNavBtn, opacity: tutorialStep === 0 ? 0.35 : 1 }} disabled={tutorialStep === 0}>← Previous</button>
              <button onClick={nextStep} style={styles.tutorialNextBtn}>
                {tutorialStep === TUTORIAL_STEPS.length - 1 ? "Let's Go!" : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onAdd, onTutorial }) {
  const tipCards = [
    { Icon: Icons.BookOpen, title: 'Add Subjects', desc: 'Add each subject you\'re enrolled in this semester with instructor and semester info.' },
    { Icon: Icons.Scale, title: 'Set Categories', desc: 'Create grading categories like Quizzes, Assignments, Midterm, and Finals with their weights.' },
    { Icon: Icons.ClipboardList, title: 'Log Your Scores', desc: 'Enter your scores for each activity. GradeTrack automatically computes your grade.' },
    { Icon: Icons.Target, title: 'Target Grade Planner', desc: 'Set a target grade and see exactly what score you need on remaining assessments to reach it.' },
    { Icon: Icons.BarChart, title: 'Track Progress', desc: 'View your overall average, at-risk subjects, and subjects that are on track — all at a glance.' },
    { Icon: Icons.AlertTriangle, title: 'Risk Indicators', desc: 'Green = On Track (≥85%), Yellow = Needs Improvement (75–84%), Red = At Risk (<75%).' },
  ];

  return (
    <div style={styles.emptyWrap} className="animate-scale">
      <div style={styles.emptyCard}>
        <div style={styles.emptyIconWrap}><Icons.Inbox /></div>
        <h2 style={styles.emptyTitle}>Welcome to GradeTrack!</h2>
        <p style={styles.emptyText}>Start tracking your academic performance by adding your first subject. Monitor your grades, set targets, and stay on top of your studies.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onAdd} style={styles.emptyBtnPrimary}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #1D4ED8, #4F46E5)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #2563EB, #6366F1)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <Icons.Plus /> Add Your First Subject
          </button>
          <button onClick={onTutorial} style={styles.emptyBtnSecondary}
            onMouseEnter={e => e.currentTarget.style.background = '#EFF4FF'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
            <Icons.HelpCircle size={15} /> View Tutorial
          </button>
        </div>
      </div>
      <div style={styles.tipsGrid}>
        {tipCards.map(({ Icon, title, desc }) => (
          <TipCard key={title} Icon={Icon} title={title} desc={desc} />
        ))}
      </div>
    </div>
  );
}

// ─── Tip Card ─────────────────────────────────────────────────────────────────
function TipCard({ Icon, title, desc }) {
  return (
    <div style={styles.tipCard}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.1)'; e.currentTarget.style.borderColor = '#BFDBFE'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.06)'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'translateY(0)'; }}>
      <div style={styles.tipIconWrap}><Icon size={16} /></div>
      <div style={styles.tipTitle}>{title}</div>
      <div style={styles.tipDesc}>{desc}</div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ Icon, label, value, color, bg }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIconWrap, background: bg, color }}>
        <Icon size={16} />
      </div>
      <div style={{ fontSize: '26px', fontWeight: '800', color, letterSpacing: '-1px', marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>{label}</div>
    </div>
  );
}

// ─── Subject Card ─────────────────────────────────────────────────────────────
function SubjectCard({ subject, delay, onClick, onEdit, onDelete }) {
  const gradeData = calculateGrade(subject.categories, subject.attendance);
  const status = gradeData ? getGradeStatus(gradeData.grade) : null;
  const totalWeight = (subject.categories || []).reduce((s, c) => s + c.category_weight, 0);

  return (
    <div onClick={onClick}
      style={{ ...styles.subjectCard, animationDelay: `${delay}s` }}
      className="animate-in"
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06)'; e.currentTarget.style.borderColor = '#DBEAFE'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.08), 0 4px 16px rgba(15,23,42,0.04)'; e.currentTarget.style.borderColor = 'rgba(226,232,240,0.6)'; }}>

      {/* Card header */}
      <div style={styles.cardHeader}>
        <div style={styles.subjectInitial}>
          {subject.subject_name[0].toUpperCase()}
        </div>
        <div style={styles.cardActions}>
          <ActionBtn onClick={onEdit} Icon={Icons.Edit} title="Edit" />
          <ActionBtn onClick={onDelete} Icon={Icons.Trash} title="Delete" danger />
        </div>
      </div>

      {/* Subject info */}
      <h3 style={styles.subjectName}>{subject.subject_name}</h3>
      {subject.instructor_name && (
        <p style={styles.subjectMeta}>
          <span style={{ color: '#94A3B8', display: 'flex' }}><Icons.User /></span>
          {subject.instructor_name}
        </p>
      )}
      {subject.semester && (
        <p style={styles.subjectMeta}>
          <span style={{ color: '#94A3B8', display: 'flex' }}><Icons.Calendar /></span>
          {subject.semester}
        </p>
      )}

      <div style={styles.cardDivider} />

      {/* Grade section */}
      {gradeData ? (
        <>
          <div style={styles.gradeRow}>
            <span style={styles.gradeLabel}>Current Grade</span>
            {/* Polished grade badge */}
            <div style={{ ...styles.gradeBadge, background: status.bg, borderColor: status.color + '30' }}>
              <span style={{ color: status.color, fontFamily: 'DM Mono, monospace', fontSize: '15px', fontWeight: '700', letterSpacing: '-0.5px' }}>
                {gradeData.grade.toFixed(2)}%
              </span>
            </div>
          </div>
          {/* Status chip */}
          <div style={{ ...styles.statusChip, background: status.bg, color: status.color }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.color, flexShrink: 0 }} />
            {status.label}
          </div>
          <ProgressBar value={gradeData.grade} color={status.color} />
        </>
      ) : (
        <div style={styles.noGrade}>No scores yet — add categories &amp; scores</div>
      )}

      {/* Footer chips */}
      <div style={styles.cardFooter}>
        <span style={styles.footerChip}>
          <Icons.Layers size={10} />
          {subject.categories?.length || 0} categories
        </span>
        <span style={styles.footerChip}>{totalWeight.toFixed(0)}% weighted</span>
      </div>
    </div>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionBtn({ onClick, Icon, title, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '7px', borderRadius: '7px', color: danger ? '#94A3B8' : '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? '#FEE2E2' : '#F1F5F9'; e.currentTarget.style.color = danger ? '#EF4444' : '#374151'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}>
      <Icon />
    </button>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, color }) {
  return (
    <div style={{ background: '#F1F5F9', borderRadius: '6px', height: '5px', marginTop: '10px', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, borderRadius: '6px', transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)' }} />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: { display: 'flex', minHeight: '100vh', background: '#F0F4FF', fontFamily: 'Plus Jakarta Sans, sans-serif' },

  // Sidebar
  sidebar: { width: '248px', minHeight: '100vh', background: '#0D1425', display: 'flex', flexDirection: 'column', padding: '20px 14px', position: 'sticky', top: 0, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.04)' },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px', padding: '4px 6px' },
  logoIcon: { width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563EB, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(37,99,235,0.4)' },
  logoText: { fontSize: '15px', fontWeight: '800', color: 'white', letterSpacing: '-0.3px' },
  logoSub: { fontSize: '10px', color: '#475569', fontWeight: '500', letterSpacing: '0.5px', marginTop: '1px' },

  navSection: { flex: 1 },
  navSectionLabel: { fontSize: '10px', fontWeight: '700', color: '#334155', letterSpacing: '1px', padding: '0 8px', display: 'block', marginBottom: '6px' },
  nav: {},
  navItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '9px', fontSize: '13px', fontWeight: '500', color: '#64748B', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' },
  navItemActive: { background: 'rgba(37,99,235,0.15)', color: '#93C5FD', fontWeight: '600' },
  navIconWrap: { display: 'flex', alignItems: 'center', flexShrink: 0 },
  navActiveDot: { width: '5px', height: '5px', borderRadius: '50%', background: '#3B82F6', marginLeft: 'auto' },

  sidebarBottom: { borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '2px' },
  sidebarDivider: { marginBottom: '8px' },
  tutorialSideBtn: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 10px', borderRadius: '9px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#60A5FA', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'background 0.15s', fontWeight: '500', marginBottom: '4px' },
  tutorialSideIconWrap: { display: 'flex', flexShrink: 0 },
  userCard: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '9px', background: 'rgba(255,255,255,0.04)', marginBottom: '4px' },
  avatar: { width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, #2563EB, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white', flexShrink: 0 },
  userEmail: { fontSize: '11px', color: '#CBD5E1', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userRole: { fontSize: '10px', color: '#475569', fontWeight: '500', marginTop: '1px' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 10px', borderRadius: '9px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'all 0.15s', fontWeight: '500' },

  // Main
  main: { flex: 1, padding: '32px 36px', maxWidth: '1120px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' },
  pageTitle: { fontSize: '26px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.6px' },
  pageSubtitle: { fontSize: '13px', color: '#64748B', marginTop: '4px', fontWeight: '400' },
  helpBtn: { width: '38px', height: '38px', borderRadius: '10px', border: '1.5px solid #DBEAFE', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', transition: 'background 0.2s', flexShrink: 0 },
  addBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #2563EB, #6366F1)', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37,99,235,0.3)', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '-0.1px' },

  // Stats
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '20px' },
  statCard: { background: 'white', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.07), 0 4px 16px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.5)' },
  statIconWrap: { width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' },

  // Search
  searchRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  searchWrap: { flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '10px', background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '0 14px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '13px', color: '#0F172A', background: 'transparent', padding: '10px 0', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  sortSelect: { background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#374151', cursor: 'pointer', outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' },

  // Grid
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' },
  noResults: { background: 'white', borderRadius: '16px', padding: '60px 40px', textAlign: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center' },

  // Empty state
  emptyWrap: { display: 'flex', flexDirection: 'column', gap: '20px' },
  emptyCard: { background: 'white', borderRadius: '20px', padding: '52px 40px', textAlign: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.08)', border: '1px solid #E2E8F0' },
  emptyIconWrap: { width: '80px', height: '80px', borderRadius: '20px', margin: '0 auto 20px', background: 'linear-gradient(135deg, #EFF4FF, #DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '10px', letterSpacing: '-0.5px' },
  emptyText: { fontSize: '14px', color: '#64748B', marginBottom: '28px', maxWidth: '400px', margin: '0 auto 28px', lineHeight: '1.65' },
  emptyBtnPrimary: { background: 'linear-gradient(135deg, #2563EB, #6366F1)', color: 'white', border: 'none', borderRadius: '10px', padding: '11px 22px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37,99,235,0.3)', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'inline-flex', alignItems: 'center', gap: '7px', letterSpacing: '-0.1px' },
  emptyBtnSecondary: { background: 'white', color: '#2563EB', border: '1.5px solid #BFDBFE', borderRadius: '10px', padding: '11px 22px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s', fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'inline-flex', alignItems: 'center', gap: '7px' },

  // Tip cards
  tipsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' },
  tipCard: { background: 'white', borderRadius: '12px', padding: '18px', border: '1px solid #E2E8F0', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' },
  tipIconWrap: { width: '30px', height: '30px', borderRadius: '8px', background: '#EFF4FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' },
  tipTitle: { fontSize: '12px', fontWeight: '700', color: '#0F172A', marginBottom: '5px', letterSpacing: '-0.1px' },
  tipDesc: { fontSize: '11px', color: '#64748B', lineHeight: '1.55' },

  // Subject card
  subjectCard: { background: 'white', borderRadius: '14px', padding: '20px', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)', boxShadow: '0 1px 3px rgba(15,23,42,0.08), 0 4px 16px rgba(15,23,42,0.04)', border: '1px solid rgba(226,232,240,0.6)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  subjectInitial: { width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #EFF4FF, #DBEAFE)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: '800', letterSpacing: '-0.5px' },
  cardActions: { display: 'flex', gap: '2px' },
  subjectName: { fontSize: '15px', fontWeight: '700', color: '#0F172A', marginBottom: '5px', letterSpacing: '-0.3px' },
  subjectMeta: { fontSize: '11px', color: '#64748B', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' },
  cardDivider: { height: '1px', background: '#F1F5F9', margin: '12px 0' },
  gradeRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  gradeLabel: { fontSize: '11px', color: '#94A3B8', fontWeight: '600', letterSpacing: '0.3px', textTransform: 'uppercase' },
  gradeBadge: { padding: '4px 10px', borderRadius: '8px', border: '1px solid transparent', display: 'inline-flex', alignItems: 'center' },
  statusChip: { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px', letterSpacing: '-0.1px' },
  noGrade: { fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' },
  cardFooter: { display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' },
  footerChip: { fontSize: '10px', background: '#F8FAFC', color: '#64748B', padding: '3px 8px', borderRadius: '20px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #F1F5F9' },

  // Modals
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '24px' },
  confirmModal: { background: 'white', borderRadius: '18px', padding: '32px', maxWidth: '400px', width: '100%', boxShadow: '0 24px 60px rgba(15,23,42,0.2)' },
  cancelBtn: { flex: 1, padding: '10px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  deleteBtn: { flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: '#EF4444', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif' },

  // Tutorial
  tutorialModal: { background: 'white', borderRadius: '20px', padding: '0', maxWidth: '520px', width: '100%', boxShadow: '0 24px 64px rgba(15,23,42,0.25)', overflow: 'hidden' },
  progressTrack: { height: '3px', background: '#F1F5F9', width: '100%' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #2563EB, #6366F1)', transition: 'width 0.4s ease', borderRadius: '0 2px 2px 0' },
  stepIndicator: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px 0' },
  stepBadge: { fontSize: '11px', fontWeight: '700', color: '#2563EB', background: '#EFF4FF', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.3px' },
  skipBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#94A3B8', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: '500', padding: '4px 8px', borderRadius: '6px' },
  tutorialContent: { padding: '24px 32px' },
  tutorialIconWrap: { width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 18px', background: 'linear-gradient(135deg, #EFF4FF, #DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  tutorialTitle: { fontSize: '19px', fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: '10px', letterSpacing: '-0.4px' },
  tutorialDesc: { fontSize: '13px', color: '#475569', textAlign: 'center', lineHeight: '1.7', marginBottom: '16px' },
  tutorialTip: { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 16px', fontSize: '12px', color: '#166534', lineHeight: '1.6' },
  dots: { display: 'flex', justifyContent: 'center', gap: '6px', padding: '0 32px 16px' },
  dot: { height: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 },
  tutorialNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px 28px', gap: '12px', borderTop: '1px solid #F1F5F9' },
  tutorialNavBtn: { background: 'white', border: '1.5px solid #E2E8F0', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'all 0.15s' },
  tutorialNextBtn: { background: 'linear-gradient(135deg, #2563EB, #6366F1)', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: '0 4px 12px rgba(37,99,235,0.35)', flex: 1 },
};
