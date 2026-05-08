import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, calculateGrade, getGradeStatus, gradeToGPA } from '../utils/api';

// ─── Icons ─────────────────────────────────────────────────────────────────────
const Icons = {
  Back: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
    </svg>
  ),
  TrendingUp: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  Award: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
    </svg>
  ),
  BookOpen: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  BarChart: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
    </svg>
  ),
  Layers: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  Download: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  User: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
};

// GPA scale description
const gpaScale = [
  { range: '97–100%', gpa: '4.0', label: 'A+' },
  { range: '93–96%',  gpa: '4.0', label: 'A'  },
  { range: '90–92%',  gpa: '3.7', label: 'A−' },
  { range: '87–89%',  gpa: '3.3', label: 'B+' },
  { range: '83–86%',  gpa: '3.0', label: 'B'  },
  { range: '80–82%',  gpa: '2.7', label: 'B−' },
  { range: '77–79%',  gpa: '2.3', label: 'C+' },
  { range: '73–76%',  gpa: '2.0', label: 'C'  },
  { range: '70–72%',  gpa: '1.7', label: 'C−' },
  { range: '67–69%',  gpa: '1.3', label: 'D+' },
  { range: '65–66%',  gpa: '1.0', label: 'D'  },
  { range: 'Below 65%', gpa: '0.0', label: 'F' },
];

function getLetterGrade(grade) {
  if (grade >= 97) return 'A+';
  if (grade >= 93) return 'A';
  if (grade >= 90) return 'A−';
  if (grade >= 87) return 'B+';
  if (grade >= 83) return 'B';
  if (grade >= 80) return 'B−';
  if (grade >= 77) return 'C+';
  if (grade >= 73) return 'C';
  if (grade >= 70) return 'C−';
  if (grade >= 67) return 'D+';
  if (grade >= 65) return 'D';
  return 'F';
}

export default function SemesterSummary() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGPAScale, setShowGPAScale] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getSubjects();
      const full = await Promise.all(data.map(s => api.getSubject(s.id)));
      const attendances = await Promise.all(full.map(s => api.getAttendance(s.id).catch(() => null)));
      const withAttendance = full.map((s, i) => ({ ...s, attendance: attendances[i] }));
      setSubjects(withAttendance);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Compute per-subject grades
  const subjectGrades = subjects.map(s => {
    const gd = calculateGrade(s.categories, s.attendance);
    const grade = gd?.grade ?? null;
    const status = grade !== null ? getGradeStatus(grade, s.passing_grade ?? 75) : null;
    const gpa = grade !== null ? gradeToGPA(grade) : null;
    const letter = grade !== null ? getLetterGrade(grade) : null;
    return { ...s, grade, status, gpa, letter };
  });

  const withGrades = subjectGrades.filter(s => s.grade !== null);
  const overallAvg = withGrades.length
    ? withGrades.reduce((a, s) => a + s.grade, 0) / withGrades.length
    : null;
  const overallGPA = withGrades.length
    ? withGrades.reduce((a, s) => a + s.gpa, 0) / withGrades.length
    : null;
  const bestSubject = withGrades.length
    ? withGrades.reduce((best, s) => s.grade > best.grade ? s : best, withGrades[0])
    : null;
  const atRiskCount = withGrades.filter(s => s.status?.label === 'At Risk').length;
  const onTrackCount = withGrades.filter(s => s.status?.label === 'On Track').length;
  const overallStatus = overallAvg !== null ? getGradeStatus(overallAvg) : null;

  const handleExportSummary = () => {
    const rows = [
      ['GradeTrack — Semester Summary'],
      ['Generated:', new Date().toLocaleString()],
      [],
      ['Subject', 'Instructor', 'Semester', 'Grade (%)', 'Letter', 'GPA', 'Status', 'Categories'],
      ...subjectGrades.map(s => [
        s.subject_name,
        s.instructor_name || '—',
        s.semester || '—',
        s.grade !== null ? s.grade.toFixed(2) : '—',
        s.letter || '—',
        s.gpa !== null ? s.gpa.toFixed(2) : '—',
        s.status?.label || 'No scores',
        s.categories?.length || 0,
      ]),
      [],
      ['SUMMARY'],
      ['Overall Average', overallAvg !== null ? overallAvg.toFixed(2) + '%' : '—'],
      ['Overall GPA', overallGPA !== null ? overallGPA.toFixed(2) : '—'],
      ['On Track Subjects', onTrackCount],
      ['At Risk Subjects', atRiskCount],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `semester_summary_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeUp 0.3s ease both; }
      `}</style>

      {/* Top Nav */}
      <nav style={s.nav}>
        <button onClick={() => navigate('/dashboard')} style={s.backBtn}
          onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Icons.Back />
          Back to Dashboard
        </button>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => setShowGPAScale(!showGPAScale)} style={s.outlineBtn}
            onMouseEnter={e => e.currentTarget.style.background = '#EFF4FF'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
            <Icons.Award />
            {showGPAScale ? 'Hide' : 'View'} GPA Scale
          </button>
          <button onClick={handleExportSummary} style={s.primaryBtn}
            onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#10B981'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <Icons.Download />
            Export CSV
          </button>
        </div>
      </nav>

      <div style={s.body}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={s.pageTitle}>Semester Summary</h1>
          <p style={s.pageSub}>Your academic performance overview with GPA equivalents</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8', fontSize: '14px' }}>Loading your subjects…</div>
        ) : (
          <>
            {/* Overall Stats */}
            <div style={s.statsRow} className="fade-in">
              <SummaryStatCard
                label="Overall Average"
                value={overallAvg !== null ? `${overallAvg.toFixed(2)}%` : '—'}
                sub={overallStatus?.label}
                color={overallStatus?.color ?? '#64748B'}
                bg={overallStatus?.bg ?? '#F8FAFC'}
                Icon={Icons.BarChart}
              />
              <SummaryStatCard
                label="Overall GPA"
                value={overallGPA !== null ? overallGPA.toFixed(2) : '—'}
                sub={overallGPA !== null ? getLetterGrade(overallAvg) : '—'}
                color="#6366F1"
                bg="#F5F3FF"
                Icon={Icons.Award}
                mono
              />
              <SummaryStatCard
                label="Subjects"
                value={subjects.length}
                sub={`${withGrades.length} with scores`}
                color="#2563EB"
                bg="#EFF4FF"
                Icon={Icons.BookOpen}
              />
              <SummaryStatCard
                label="On Track"
                value={onTrackCount}
                sub={`${atRiskCount} at risk`}
                color="#059669"
                bg="#ECFDF5"
                Icon={Icons.CheckCircle}
              />
            </div>

            {/* GPA Scale Tooltip */}
            {showGPAScale && (
              <div style={s.gpaScaleCard} className="fade-in">
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '12px', letterSpacing: '-0.2px' }}>GPA Conversion Scale</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px' }}>
                  {gpaScale.map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#F8FAFC', borderRadius: '7px', fontSize: '12px' }}>
                      <span style={{ color: '#64748B' }}>{row.range}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', color: '#0F172A', fontFamily: 'DM Mono, monospace' }}>{row.label}</span>
                        <span style={{ fontWeight: '600', color: '#6366F1', fontFamily: 'DM Mono, monospace' }}>{row.gpa}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '10px' }}>Based on standard 4.0 GPA scale. Actual GPA may differ per institution.</p>
              </div>
            )}

            {/* Subject Table */}
            <div style={s.tableCard} className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', letterSpacing: '-0.3px' }}>Subject Breakdown</h2>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</span>
              </div>

              {subjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                  <p style={{ fontSize: '14px', fontWeight: '500' }}>No subjects yet.</p>
                  <button onClick={() => navigate('/dashboard')} style={{ ...s.primaryBtn, marginTop: '14px', background: '#2563EB' }}>Go to Dashboard</button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        {['Subject', 'Instructor', 'Semester', 'Grade', 'Letter', 'GPA', 'Categories', 'Status'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subjectGrades.map((sub, i) => (
                        <tr key={sub.id}
                          onClick={() => navigate(`/subject/${sub.id}`)}
                          style={{ ...s.tr, animationDelay: `${i * 0.04}s`, cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F8FAFF'}
                          onMouseLeave={e => e.currentTarget.style.background = 'white'}
                          className="fade-in">
                          <td style={{ ...s.td, fontWeight: '700', color: '#0F172A', maxWidth: '180px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={s.initial}>{sub.subject_name[0].toUpperCase()}</div>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.subject_name}</span>
                            </div>
                          </td>
                          <td style={{ ...s.td, color: '#64748B' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Icons.User />
                              {sub.instructor_name || '—'}
                            </span>
                          </td>
                          <td style={{ ...s.td, color: '#64748B' }}>{sub.semester || '—'}</td>
                          <td style={s.td}>
                            {sub.grade !== null ? (
                              <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: '700', color: sub.status.color, fontSize: '13px' }}>
                                {sub.grade.toFixed(2)}%
                              </span>
                            ) : <span style={{ color: '#CBD5E1', fontSize: '12px' }}>No scores</span>}
                          </td>
                          <td style={s.td}>
                            {sub.letter ? (
                              <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: '800', fontSize: '14px', color: sub.status.color }}>{sub.letter}</span>
                            ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                          </td>
                          <td style={s.td}>
                            {sub.gpa !== null ? (
                              <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: '700', color: '#6366F1', fontSize: '13px' }}>{sub.gpa.toFixed(2)}</span>
                            ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                          </td>
                          <td style={s.td}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B', background: '#F1F5F9', padding: '3px 8px', borderRadius: '20px', fontWeight: '600' }}>
                              <Icons.Layers />
                              {sub.categories?.length || 0}
                            </span>
                          </td>
                          <td style={s.td}>
                            {sub.status ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px', background: sub.status.bg, color: sub.status.color }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: sub.status.color, flexShrink: 0 }} />
                                {sub.status.label}
                              </span>
                            ) : <span style={{ color: '#CBD5E1', fontSize: '12px' }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Summary row */}
                    {withGrades.length > 0 && (
                      <tfoot>
                        <tr style={{ background: '#F0F4FF', borderTop: '2px solid #DBEAFE' }}>
                          <td style={{ ...s.td, fontWeight: '700', color: '#0F172A' }} colSpan={3}>Semester Average</td>
                          <td style={s.td}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: '800', color: overallStatus?.color, fontSize: '14px' }}>
                              {overallAvg?.toFixed(2)}%
                            </span>
                          </td>
                          <td style={s.td}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: '800', color: overallStatus?.color, fontSize: '14px' }}>
                              {getLetterGrade(overallAvg)}
                            </span>
                          </td>
                          <td style={s.td}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: '800', color: '#6366F1', fontSize: '14px' }}>
                              {overallGPA?.toFixed(2)}
                            </span>
                          </td>
                          <td colSpan={2} style={s.td} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>

            {/* Best subject highlight */}
            {bestSubject && (
              <div style={s.highlightCard} className="fade-in">
                <div style={s.highlightIcon}>
                  <Icons.Award />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#92400E', letterSpacing: '0.5px', marginBottom: '2px' }}>TOP PERFORMING SUBJECT</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#78350F', letterSpacing: '-0.3px' }}>{bestSubject.subject_name}</div>
                  <div style={{ fontSize: '12px', color: '#92400E', marginTop: '2px' }}>
                    {bestSubject.grade.toFixed(2)}% &nbsp;·&nbsp; {bestSubject.letter} &nbsp;·&nbsp; {bestSubject.gpa.toFixed(2)} GPA
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SummaryStatCard({ label, value, sub, color, bg, Icon, mono }) {
  return (
    <div style={{
      background: 'white', borderRadius: '14px', padding: '20px',
      boxShadow: '0 1px 3px rgba(15,23,42,0.07)', border: '1px solid rgba(226,232,240,0.5)',
      display: 'flex', flexDirection: 'column', gap: '4px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>{label}</span>
        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon />
        </div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '800', color, letterSpacing: mono ? '-0.5px' : '-1px', fontFamily: mono ? 'DM Mono, monospace' : 'Plus Jakarta Sans, sans-serif' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '500' }}>{sub}</div>}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#F0F4FF', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  nav: { background: 'white', borderBottom: '1px solid #E2E8F0', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(15,23,42,0.06)' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151', padding: '7px 12px', borderRadius: '8px', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  outlineBtn: { display: 'flex', alignItems: 'center', gap: '7px', background: 'white', border: '1.5px solid #BFDBFE', borderRadius: '9px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', color: '#2563EB', cursor: 'pointer', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: '7px', background: '#10B981', border: 'none', borderRadius: '9px', padding: '8px 16px', fontSize: '12px', fontWeight: '600', color: 'white', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' },
  body: { maxWidth: '1100px', margin: '0 auto', padding: '32px 32px' },
  pageTitle: { fontSize: '26px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.6px' },
  pageSub: { fontSize: '13px', color: '#64748B', marginTop: '4px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' },
  tableCard: { background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(15,23,42,0.07)', border: '1px solid rgba(226,232,240,0.5)', marginBottom: '16px' },
  gpaScaleCard: { background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.07)', border: '1px solid #DBEAFE', marginBottom: '16px' },
  highlightCard: { background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', borderRadius: '14px', padding: '18px 20px', border: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: '16px' },
  highlightIcon: { width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245,158,11,0.2)', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#64748B', letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap' },
  td: { padding: '12px 14px', borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' },
  tr: { transition: 'background 0.15s' },
  initial: { width: '28px', height: '28px', borderRadius: '7px', background: 'linear-gradient(135deg, #EFF4FF, #DBEAFE)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0 },
};
