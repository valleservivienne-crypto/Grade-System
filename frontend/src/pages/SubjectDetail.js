import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, calculateGrade, getGradeStatus, getTrend, calculateWithExpected } from '../utils/api';

export default function SubjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [expectedScores, setExpectedScores] = useState({});
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(null);
  const [editScore, setEditScore] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [editingWeight, setEditingWeight] = useState(false);
  const toastId = React.useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.getSubject(id);
      setSubject(data);
    } catch (err) {
      setError('Subject not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadAttendance = useCallback(async () => {
    try {
      const data = await api.getAttendance(id);
      setAttendance(data);
      setTotalInput(String(data.total_classes));
      setWeightInput(String(data.attendance_weight || ''));
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
  }, [id]);

  useEffect(() => { load(); loadAttendance(); }, [load, loadAttendance]);

  const gradeData = subject ? calculateGrade(subject.categories, attendance) : null;
  const passingGrade = subject?.passing_grade ?? 75;
  const status = gradeData ? getGradeStatus(gradeData.grade, passingGrade) : null;
  const trend = subject ? getTrend(subject.categories) : null;
  const totalWeight = subject ? (subject.categories || []).reduce((s, c) => s + c.category_weight, 0) : 0;
  const attendanceWeight = (attendance?.mode === 'with_grade' && attendance?.attendance_weight) ? parseFloat(attendance.attendance_weight) : 0;
  const totalUsedWeight = totalWeight + attendanceWeight;

  const plannerResult = (subject && targetGrade !== '') ?
    calculateWithExpected(subject.categories, parseFloat(targetGrade), expectedScores) : null;

  const attendanceStats = attendance ? (() => {
    const sessions = attendance.sessions || [];
    const present = sessions.filter(s => s.status === 'present').length;
    const absent = sessions.filter(s => s.status === 'absent').length;
    const late = sessions.filter(s => s.status === 'late').length;
    const attended = present + late;
    const total = attendance.total_classes || 0;
    const percentage = total > 0 ? (attended / total) * 100 : 0;
    const isMaxed = total > 0 && sessions.length >= total;
    return { present, absent, late, attended, total, percentage, sessions, isMaxed };
  })() : null;

  const handlePrint = () => {
    const printContent = generatePrintHTML(subject, gradeData, status, attendance, attendanceStats);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const handleSetMode = async (mode) => {
    try {
      await api.updateAttendance(id, { mode, attendance_weight: mode === 'with_grade' ? 10 : 0 });
      await loadAttendance();
      showToast(mode === 'with_grade' ? 'Attendance included in grade calculation!' : 'Attendance set to tracking only');
    } catch (err) {
      showToast('Failed to set mode', 'error');
    }
  };

  const handleResetMode = async () => {
    try {
      await api.updateAttendance(id, { mode: 'unset', attendance_weight: 0 });
      await loadAttendance();
      showToast('Attendance settings reset');
    } catch (err) {
      showToast('Failed to reset', 'error');
    }
  };

  const handleAddSession = async (sessionStatus) => {
    if (attendanceStats?.isMaxed) {
      showToast(`Maximum sessions reached (${attendanceStats.total})`, 'error');
      return;
    }
    try {
      await api.addAttendanceSession(id, { status: sessionStatus });
      await loadAttendance();
      showToast(`Marked as ${sessionStatus}!`);
    } catch (err) {
      showToast(err.message || 'Failed to add session', 'error');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await api.deleteAttendanceSession(sessionId);
      await loadAttendance();
      showToast('Session removed');
    } catch (err) {
      showToast('Failed to remove session', 'error');
    }
  };

  const handleSaveTotal = async () => {
    const total = parseInt(totalInput);
    if (isNaN(total) || total < 0) { showToast('Please enter a valid number', 'error'); return; }
    try {
      await api.updateAttendance(id, { total_classes: total });
      await loadAttendance();
      setEditingTotal(false);
      showToast('Total classes updated!');
    } catch (err) {
      showToast('Failed to update', 'error');
    }
  };

  const handleSaveWeight = async () => {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w < 0 || w > 100) { showToast('Please enter a valid weight (0-100)', 'error'); return; }
    try {
      await api.updateAttendance(id, { attendance_weight: w });
      await loadAttendance();
      setEditingWeight(false);
      showToast('Attendance weight updated!');
    } catch (err) {
      showToast('Failed to update weight', 'error');
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onBack={() => navigate('/dashboard')} />;

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes unlockPulse { 0% { transform:scale(1); } 50% { transform:scale(1.02); } 100% { transform:scale(1); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes attendanceFadeIn { from { opacity:0; transform:scale(0.97) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes attendanceUnlock { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @media print { body { margin: 0; } }
      `}</style>

      {/* Toast */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${t.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            color: t.type === 'success' ? '#065F46' : '#991B1B',
            padding: '12px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
            boxShadow: '0 4px 20px rgba(15,23,42,0.12)', display: 'flex', alignItems: 'center', gap: '8px',
            animation: 'slideIn 0.3s ease', minWidth: '220px',
          }}>
            <span style={{ display:'flex', flexShrink:0 }}>
              {t.type === 'success'
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              }
            </span>
            {t.message}
          </div>
        ))}
      </div>

      {/* Top Nav */}
      <div style={styles.topNav}>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}
          onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </button>
        <div style={styles.navRight}>
          <span style={styles.navSemester}>{subject.semester || 'No semester'}</span>
          <button onClick={handlePrint} style={styles.printBtn}
            onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
            onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="6" y="14" width="12" height="8" rx="1" stroke="white" strokeWidth="2"/>
            </svg>
            Print / Export PDF
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {/* Hero */}
        <div style={styles.hero} className="animate-in">
          <div style={styles.heroLeft}>
            <div style={styles.heroInitial}>{subject.subject_name[0]}</div>
            <div>
              <h1 style={styles.heroTitle}>{subject.subject_name}</h1>
              {subject.instructor_name && (
                <p style={styles.heroSub}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',marginRight:'5px',verticalAlign:'middle'}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {subject.instructor_name}
                </p>
              )}
            </div>
          </div>
          {gradeData && status && (
            <div style={styles.heroGrade}>
              <div style={{ ...styles.gradeCircle, borderColor: status.color }}>
                <span style={{ ...styles.gradeNum, color: status.color }}>{gradeData.grade.toFixed(1)}%</span>
              </div>
              <div style={{ ...styles.statusPill, background: status.bg, color: status.color, display:"flex", alignItems:"center", gap:"5px" }}><span style={{width:"6px",height:"6px",borderRadius:"50%",background:status.color,flexShrink:0}} />{status.label}</div>
            </div>
          )}
        </div>

        {trend && (
          <div style={{ ...styles.trendBanner, background: trend.type === 'improving' ? '#ECFDF5' : trend.type === 'declining' ? '#FEF2F2' : '#EFF4FF', borderColor: trend.type === 'improving' ? '#A7F3D0' : trend.type === 'declining' ? '#FECACA' : '#BFDBFE', color: trend.type === 'improving' ? '#065F46' : trend.type === 'declining' ? '#991B1B' : '#1E40AF' }} className="animate-in">
            {trend.msg}
          </div>
        )}

        {totalUsedWeight < 100 && subject.categories?.length > 0 && (
          <div style={styles.weightWarning} className="animate-in">
Total category weights: <strong>{totalUsedWeight.toFixed(1)}%</strong> — must reach 100% for final grade accuracy
          </div>
        )}

        <div style={styles.mainGrid}>
          <div style={styles.leftCol}>
            {/* Categories */}
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Grade Categories</h2>
              <button onClick={() => { setEditCat(null); setShowCatModal(true); }} style={styles.addSmallBtn}
                onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
                onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
                + Add Category
              </button>
            </div>

            {subject.categories?.length > 0 && <WeightBar categories={subject.categories} attendanceWeight={attendanceWeight} />}

            {(!subject.categories || subject.categories.length === 0) ? (
    <EmptyBox text="No categories yet — click Add Category to get started." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {subject.categories.map((cat, i) => (
                  <CategoryCard key={cat.id} category={cat} delay={i * 0.05} passingGrade={passingGrade}
                    onAddScore={() => { setShowScoreModal(cat.id); setEditScore(null); }}
                    onEditCat={() => { setEditCat(cat); setShowCatModal(true); }}
                    onDeleteCat={() => setDeleteConfirm({ type: 'category', item: cat })}
                    onEditScore={(score) => { setEditScore(score); setShowScoreModal(cat.id); }}
                    onDeleteScore={(score) => setDeleteConfirm({ type: 'score', item: score })}
                  />
                ))}
              </div>
            )}

            {/* Attendance Tracker */}
            <div style={{ marginTop: '28px' }}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',marginRight:'6px',verticalAlign:'middle'}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Attendance Tracker
              </h2>
                {attendance?.mode !== 'unset' && (
                  <button onClick={handleResetMode} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#94A3B8', textDecoration: 'underline' }}>
                    Change setting
                  </button>
                )}
              </div>
              <AttendanceTracker
                attendance={attendance}
                stats={attendanceStats}
                editingTotal={editingTotal}
                totalInput={totalInput}
                setTotalInput={setTotalInput}
                setEditingTotal={setEditingTotal}
                onSaveTotal={handleSaveTotal}
                onAddSession={handleAddSession}
                onDeleteSession={handleDeleteSession}
                onSetMode={handleSetMode}
                editingWeight={editingWeight}
                weightInput={weightInput}
                setWeightInput={setWeightInput}
                setEditingWeight={setEditingWeight}
                onSaveWeight={handleSaveWeight}
              />
            </div>
          </div>

          {/* Right Column */}
          <div style={styles.rightCol}>
            {gradeData && (
              <div style={styles.summaryCard} className="animate-in">
                <h3 style={styles.cardTitle}>Grade Breakdown</h3>
                {subject.categories?.map(cat => {
                  if (!cat.scores?.length) return null;
                  const sumObt = cat.scores.reduce((s, sc) => s + sc.score_obtained, 0);
                  const sumTot = cat.scores.reduce((s, sc) => s + sc.total_score, 0);
                  const avg = sumTot > 0 ? (sumObt / sumTot) * 100 : 0;
                  const weighted = avg * (cat.category_weight / 100);
                  return (
                    <div key={cat.id} style={styles.breakdownRow}>
                      <div style={styles.breakdownName}>{cat.category_name}</div>
                      <div style={styles.breakdownStats}>
                        <span style={styles.mono}>{avg.toFixed(1)}%</span>
                        <span style={styles.breakdownWeight}>× {cat.category_weight}%</span>
                        <span style={{ ...styles.mono, color: '#2563EB', fontWeight: '700' }}>= {weighted.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
                {attendance?.mode === 'with_grade' && attendanceStats && attendanceStats.total > 0 && (
                  <div style={{ ...styles.breakdownRow, background: '#EFF4FF', borderRadius: '6px', padding: '6px 8px' }}>
<div style={{ ...styles.breakdownName, color: '#2563EB' }}>Attendance</div>
                    <div style={styles.breakdownStats}>
                      <span style={styles.mono}>{attendanceStats.percentage.toFixed(1)}%</span>
                      <span style={styles.breakdownWeight}>× {attendanceWeight}%</span>
                      <span style={{ ...styles.mono, color: '#2563EB', fontWeight: '700' }}>= {(attendanceStats.percentage * attendanceWeight / 100).toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div style={styles.breakdownTotal}>
                  <span>Final Grade</span>
                  <span style={{ ...styles.mono, fontSize: '20px', color: status?.color }}>{gradeData.grade.toFixed(2)}%</span>
                </div>
              </div>
            )}

            {/* Target Grade Planner */}
            <div style={styles.plannerCard} className="animate-in">
<h3 style={styles.cardTitle}>Target Grade Planner</h3>
              <p style={styles.plannerDesc}>Add expected upcoming scores to see if you can hit your target</p>
              <div style={styles.plannerInput}>
                <input type="number" min="0" max="100" value={targetGrade}
                  onChange={e => setTargetGrade(e.target.value)}
                  placeholder="Enter target grade (0-100)"
                  style={styles.input}
                  onFocus={e => e.target.style.borderColor = '#2563EB'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F8'} />
              </div>
              {targetGrade !== '' && subject?.categories?.map(cat => (
                <ExpectedScoreRow key={cat.id} category={cat} expected={expectedScores[cat.id] || []}
                  onChange={rows => setExpectedScores(prev => ({ ...prev, [cat.id]: rows }))} />
              ))}
              {plannerResult && targetGrade !== '' && (
                <div style={{ ...styles.plannerResult, marginTop: '12px', background: plannerResult.status === 'achieved' ? '#ECFDF5' : '#EFF4FF', borderColor: plannerResult.status === 'achieved' ? '#A7F3D0' : '#BFDBFE' }} className="animate-in">
                  {plannerResult.status === 'achieved' ? (
                    <>
    
                      <div style={{ fontWeight: '700', color: '#065F46', fontSize: '15px' }}>Target Achievable!</div>
                      <div style={{ fontSize: '13px', color: '#047857', marginTop: '4px' }}>Projected grade: <strong>{plannerResult.projectedGrade.toFixed(2)}%</strong> ≥ {targetGrade}%</div>
                    </>
                  ) : (
                    <>
    
                      <div style={{ fontWeight: '700', color: '#1E40AF', fontSize: '15px' }}>Projected Grade</div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#2563EB', margin: '4px 0' }}>{plannerResult.projectedGrade.toFixed(2)}%</div>
                      <div style={{ fontSize: '13px', color: '#1D4ED8' }}>Still need <strong>{plannerResult.gap.toFixed(2)}%</strong> more to reach {targetGrade}%.</div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div style={styles.quickStatsCard} className="animate-in">
              <h3 style={styles.cardTitle}>Quick Stats</h3>
              <div style={styles.quickStatsGrid}>
                <QuickStat label="Categories" value={subject.categories?.length || 0} />
                <QuickStat label="Total Scores" value={subject.categories?.reduce((s, c) => s + (c.scores?.length || 0), 0) || 0} />
                <QuickStat label="Weight Used" value={`${totalUsedWeight.toFixed(0)}%`} />
                <QuickStat label="Attendance" value={attendanceStats && attendanceStats.total > 0 ? `${attendanceStats.percentage.toFixed(0)}%` : '—'} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCatModal && (
        <CategoryModal category={editCat} usedWeight={totalUsedWeight - (editCat?.category_weight || 0)}
          onClose={() => { setShowCatModal(false); setEditCat(null); }}
          onSave={async (data) => {
            try {
              if (editCat) { await api.updateCategory(editCat.id, data); showToast('Category updated!'); }
              else { await api.createCategory(id, data); showToast('Category added!'); }
              await load(); setShowCatModal(false); setEditCat(null);
            } catch (err) { showToast('Failed to save category', 'error'); throw err; }
          }} />
      )}

      {showScoreModal && (
        <ScoreModal score={editScore}
          onClose={() => { setShowScoreModal(null); setEditScore(null); }}
          onSave={async (data) => {
            try {
              if (editScore) { await api.updateScore(editScore.id, data); showToast('Score updated!'); }
              else { await api.createScore(showScoreModal, data); showToast('Score added!'); }
              await load(); setShowScoreModal(null); setEditScore(null);
            } catch (err) { showToast('Failed to save score', 'error'); throw err; }
          }} />
      )}

      {deleteConfirm && (
        <ConfirmDeleteModal
          name={deleteConfirm.type === 'category' ? `category "${deleteConfirm.item.category_name}"` : `score entry`}
          onConfirm={async () => {
            try {
              if (deleteConfirm.type === 'category') { await api.deleteCategory(deleteConfirm.item.id); showToast('Category deleted'); }
              else { await api.deleteScore(deleteConfirm.item.id); showToast('Score deleted'); }
              await load(); setDeleteConfirm(null);
            } catch (err) { showToast('Failed to delete', 'error'); }
          }}
          onClose={() => setDeleteConfirm(null)} />
      )}
    </div>
  );
}

// ============ ATTENDANCE TRACKER ============
function AttendanceTracker({ attendance, stats, editingTotal, totalInput, setTotalInput, setEditingTotal, onSaveTotal, onAddSession, onDeleteSession, onSetMode, editingWeight, weightInput, setWeightInput, setEditingWeight, onSaveWeight }) {
  const [showSessions, setShowSessions] = useState(false);
  const [choosingMode, setChoosingMode] = useState(false);

  if (!attendance) return (
    <div style={{ textAlign: 'center', padding: '30px', background: '#F8FAFC', borderRadius: '12px', border: '2px dashed #E2E8F0' }}>
      <div style={{ fontSize: '13px', color: '#94A3B8' }}>Loading attendance...</div>
    </div>
  );

  const isUnset = attendance.mode === 'unset';
  const isWithGrade = attendance.mode === 'with_grade';
  const isTrackOnly = attendance.mode === 'track_only';
  const pctColor = stats?.percentage >= 75 ? '#10B981' : stats?.percentage >= 50 ? '#F59E0B' : '#EF4444';
  const pctBg = stats?.percentage >= 75 ? '#ECFDF5' : stats?.percentage >= 50 ? '#FFFBEB' : '#FEF2F2';

  return (
    <div style={{ position: 'relative', borderRadius: '14px' }}>

      {/* LOCKED STATE — polished glassmorphism prompt card */}
      {isUnset && (
        <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden' }}>
          {/* Blurred ghost preview underneath */}
          <div style={{
            filter: 'blur(6px)',
            pointerEvents: 'none',
            userSelect: 'none',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid rgba(226,232,240,0.5)',
            padding: '20px',
            opacity: 0.35,
            minHeight: '320px',
            transform: 'scale(0.98)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: '#E8EDF5', borderRadius: '10px', overflow: 'hidden', marginBottom: '14px' }}>
              {['Present','Late','Absent'].map(l => (
                <div key={l} style={{ background: 'white', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#D1D9E6' }}>0</div>
                  <div style={{ fontSize: '11px', color: '#B8C4D4', marginTop: '2px' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#E8EDF5', borderRadius: '8px', height: '6px', marginBottom: '14px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              {['Present','Late','Absent'].map(l => (
                <div key={l} style={{ flex: 1, background: '#F0F4FA', borderRadius: '8px', padding: '9px', textAlign: 'center', fontSize: '12px', color: '#C8D1E0', fontWeight: '600' }}>{l}</div>
              ))}
            </div>
          </div>

          {/* Glassmorphism overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(145deg, rgba(239,244,255,0.92) 0%, rgba(255,255,255,0.96) 60%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'attendanceFadeIn 0.4s ease',
          }}>
            {/* Decorative ring */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '16px',
              border: '1.5px solid rgba(37,99,235,0.15)',
              pointerEvents: 'none',
            }} />

            <div style={{ textAlign: 'center', padding: '32px 28px', maxWidth: '340px', width: '100%' }}>
              {/* Icon with soft glow */}
              <div style={{
                width: '56px', height: '56px',
                background: 'linear-gradient(135deg, #EFF4FF, #DBEAFE)',
                borderRadius: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '26px',
                margin: '0 auto 16px',
                boxShadow: '0 4px 20px rgba(37,99,235,0.15)',
              }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>

              <h3 style={{
                fontSize: '16px', fontWeight: '800', color: '#0F172A',
                marginBottom: '8px', letterSpacing: '-0.3px',
              }}>
                Attendance Tracker
              </h3>
              <p style={{
                fontSize: '13px', color: '#64748B',
                marginBottom: '24px', lineHeight: '1.65',
              }}>
                Does your professor include{' '}
                <span style={{ fontWeight: '700', color: '#2563EB' }}>attendance</span>{' '}
                in the grading system for this subject?
              </p>

              {/* Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => { setChoosingMode(false); onSetMode('with_grade'); }}
                  style={{
                    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    color: 'white', border: 'none', borderRadius: '12px',
                    padding: '13px 20px', fontSize: '13px', fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
                    transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    letterSpacing: '-0.1px',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.45)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.35)';
                  }}>
Yes — Include in Grade Calculation
                </button>

                <button
                  onClick={() => { setChoosingMode(false); onSetMode('track_only'); }}
                  style={{
                    background: 'white',
                    color: '#374151', border: '1.5px solid #E2E8F0',
                    borderRadius: '12px', padding: '12px 20px',
                    fontSize: '13px', fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#F8FAFF';
                    e.currentTarget.style.borderColor = '#BFDBFE';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.06)';
                  }}>
No — Just Track My Attendance
                </button>
              </div>

              <p style={{
                fontSize: '11px', color: '#94A3B8',
                marginTop: '16px', letterSpacing: '0.1px',
              }}>
                You can change this setting anytime
              </p>
            </div>
          </div>
        </div>
      )}

      {/* UNLOCKED STATE */}
      {!isUnset && (
        <div style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.08)', border: `1px solid ${isWithGrade ? '#BFDBFE' : 'rgba(226,232,240,0.6)'}`, animation: 'attendanceUnlock 0.35s cubic-bezier(0.22,1,0.36,1)' }}>

          {/* Mode badge */}
          <div style={{ padding: '10px 20px', background: isWithGrade ? '#EFF4FF' : '#F8FAFC', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: isWithGrade ? '#2563EB' : '#64748B' }}>
                {isWithGrade ? 'Included in Grade Calculation' : 'Tracking Only (not in grade)'}
              </span>
            </div>
            {isWithGrade && (
              <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Weight:
                {editingWeight ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <input type="number" min="0" max="100" value={weightInput} onChange={e => setWeightInput(e.target.value)}
                      style={{ width: '50px', border: '1.5px solid #2563EB', borderRadius: '4px', padding: '1px 4px', fontSize: '12px', outline: 'none' }} autoFocus />
                    <span style={{ fontSize: '11px' }}>%</span>
                    <button onClick={onSaveWeight} style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}>Save</button>
<button onClick={() => setEditingWeight(false)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontWeight:'600', color:'#64748B' }}>Cancel</button>
                  </span>
                ) : (
                  <span style={{ fontWeight: '700', color: '#2563EB' }}>
                    {attendance.attendance_weight}%
                    <button onClick={() => setEditingWeight(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', marginLeft: '4px', display:'inline-flex', padding:'2px' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Total Classes:
              {editingTotal ? (
                <span style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" min="0" value={totalInput} onChange={e => setTotalInput(e.target.value)}
                    style={{ width: '60px', border: '1.5px solid #2563EB', borderRadius: '6px', padding: '2px 6px', fontSize: '13px', outline: 'none' }} autoFocus />
                  <button onClick={onSaveTotal} style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>Save</button>
                  <button onClick={() => setEditingTotal(false)} style={{ background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: '6px', padding: '3px 8px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                </span>
              ) : (
                <span style={{ marginLeft: '6px', fontWeight: '700', color: '#0F172A' }}>
                  {attendance.total_classes || 'Not set'}
                  <button onClick={() => setEditingTotal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '6px', color: '#94A3B8', display:'inline-flex', padding:'2px' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </span>
              )}
            </div>
            {stats && stats.total > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {stats.isMaxed && <span style={{ fontSize: '11px', background: '#FEF2F2', color: '#991B1B', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>All sessions recorded</span>}
                <div style={{ background: pctBg, color: pctColor, padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
                  {stats.percentage.toFixed(1)}% attendance
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#F1F5F9' }}>
              <div style={{ background: 'white', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#10B981' }}>{stats.present}</div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Present</div>
              </div>
              <div style={{ background: 'white', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#F59E0B' }}>{stats.late}</div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Late</div>
              </div>
              <div style={{ background: 'white', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#EF4444' }}>{stats.absent}</div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Absent</div>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {stats && stats.total > 0 && (
            <div style={{ padding: '12px 20px 0' }}>
              <div style={{ background: '#F1F5F9', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(stats.percentage, 100)}%`, height: '100%', background: pctColor, borderRadius: '4px', transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                <span>{stats.sessions.length} of {stats.total} sessions recorded</span>
                <span>{stats.attended} attended</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ padding: '16px 20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['present', 'late', 'absent'].map(s => {
              const config = {
                present: { label: 'Present', bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', hoverBg: '#D1FAE5' },
                late: { label: 'Late', bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', hoverBg: '#FEF3C7' },
                absent: { label: 'Absent', bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', hoverBg: '#FEE2E2' },
              }[s];
              const disabled = stats?.isMaxed;
              return (
                <button key={s} onClick={() => onAddSession(s)} disabled={disabled}
                  style={{ flex: 1, minWidth: '80px', background: disabled ? '#F8FAFC' : config.bg, color: disabled ? '#CBD5E1' : config.color, border: `1.5px solid ${disabled ? '#E2E8F0' : config.border}`, borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontWeight: '600', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = config.hoverBg; }}
                  onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = config.bg; }}>
                  {config.label}
                </button>
              );
            })}
          </div>

          {/* Sessions History */}
          {stats && stats.sessions.length > 0 && (
            <div style={{ borderTop: '1px solid #F1F5F9' }}>
              <button onClick={() => setShowSessions(s => !s)} style={{ width: '100%', background: 'none', border: 'none', padding: '12px 20px', cursor: 'pointer', fontSize: '12px', color: '#64748B', fontWeight: '600', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Session History ({stats.sessions.length} sessions)</span>
                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' style={{transform: showSessions ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.2s'}}><polyline points='6 9 12 15 18 9'/></svg>
              </button>
              {showSessions && (
                <div style={{ padding: '0 20px 16px', maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[...stats.sessions].reverse().map((session, i) => (
                    <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#F8FAFC', borderRadius: '8px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{display:'inline-flex',width:'18px',height:'18px',borderRadius:'4px',alignItems:'center',justifyContent:'center',background:session.status==='present'?'#ECFDF5':session.status==='late'?'#FFFBEB':'#FEF2F2',color:session.status==='present'?'#059669':session.status==='late'?'#D97706':'#DC2626',flexShrink:0}}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            {session.status==='present'?<polyline points="20 6 9 17 4 12"/>:session.status==='late'?<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>:<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                          </svg>
                        </span>
                        <span style={{ fontWeight: '600', color: session.status === 'present' ? '#065F46' : session.status === 'late' ? '#92400E' : '#991B1B', textTransform: 'capitalize' }}>{session.status}</span>
                        <span style={{ color: '#94A3B8' }}>Session {stats.sessions.length - i}</span>
                      </div>
                      <button onClick={() => onDeleteSession(session.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '12px', padding: '2px 4px', borderRadius: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}><svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function generatePrintHTML(subject, gradeData, status, attendance, attendanceStats) {
  const cats = subject?.categories || [];
  const categoriesHTML = cats.map(cat => {
    const scores = cat.scores || [];
    const sumObt = scores.reduce((s, sc) => s + sc.score_obtained, 0);
    const sumTot = scores.reduce((s, sc) => s + sc.total_score, 0);
    const avg = sumTot > 0 ? (sumObt / sumTot) * 100 : null;
    const weighted = avg !== null ? avg * (cat.category_weight / 100) : 0;
    const scoresHTML = scores.map(sc => {
      const pct = (sc.score_obtained / sc.total_score) * 100;
      return `<tr><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;">${sc.label || '—'}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${sc.score_obtained}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${sc.total_score}</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:700;color:${pct>=(pg+10)?'#10B981':pct>=pg?'#F59E0B':'#EF4444'}">${pct.toFixed(1)}%</td></tr>`;
    }).join('');
    return `<div style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;"><div style="background:#f8fafc;padding:10px 14px;display:flex;justify-content:space-between;"><div><span style="font-weight:700;">${cat.category_name}</span><span style="margin-left:10px;color:#64748b;font-size:13px;">Weight: ${cat.category_weight}%</span></div>${avg !== null ? `<div style="font-weight:800;color:${avg>=(pg+10)?'#10B981':avg>=pg?'#F59E0B':'#EF4444'}">${avg.toFixed(1)}% → ${weighted.toFixed(2)} pts</div>` : ''}</div>${scores.length > 0 ? `<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f1f5f9;"><th style="padding:8px 10px;text-align:left;color:#64748b;font-size:11px;">Label</th><th style="padding:8px 10px;text-align:center;color:#64748b;font-size:11px;">Obtained</th><th style="padding:8px 10px;text-align:center;color:#64748b;font-size:11px;">Total</th><th style="padding:8px 10px;text-align:center;color:#64748b;font-size:11px;">%</th></tr></thead><tbody>${scoresHTML}</tbody></table>` : '<div style="padding:12px 14px;color:#94a3b8;font-size:13px;font-style:italic;">No scores recorded</div>'}</div>`;
  }).join('');

  const gradeLabel = gradeData ? (gradeData.grade >= 85 ? 'On Track' : gradeData.grade >= 75 ? 'Needs Improvement' : 'At Risk') : 'No grade yet';
  const attendanceHTML = attendanceStats && attendanceStats.total > 0 ? `<div style="margin-top:24px;border:1px solid #e2e8f0;border-radius:8px;padding:16px;"><h2 style="font-size:15px;font-weight:700;margin-bottom:12px;">Attendance Summary ${attendance?.mode === 'with_grade' ? `(${attendance.attendance_weight}% weight)` : '(Tracking only)'}</h2><div style="display:flex;gap:20px;"><div style="text-align:center;"><div style="font-size:20px;font-weight:800;color:#10B981;">${attendanceStats.present}</div><div style="font-size:11px;color:#64748b;">Present</div></div><div style="text-align:center;"><div style="font-size:20px;font-weight:800;color:#F59E0B;">${attendanceStats.late}</div><div style="font-size:11px;color:#64748b;">Late</div></div><div style="text-align:center;"><div style="font-size:20px;font-weight:800;color:#EF4444;">${attendanceStats.absent}</div><div style="font-size:11px;color:#64748b;">Absent</div></div><div style="text-align:center;margin-left:auto;"><div style="font-size:20px;font-weight:800;color:${attendanceStats.percentage>=75?'#10B981':attendanceStats.percentage>=50?'#F59E0B':'#EF4444'};">${attendanceStats.percentage.toFixed(1)}%</div><div style="font-size:11px;color:#64748b;">${attendanceStats.attended}/${attendanceStats.total}</div></div></div></div>` : '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Grade Report - ${subject.subject_name}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',sans-serif;color:#0f172a;padding:32px;background:white;font-size:14px;}</style></head><body><div style="border-bottom:3px solid #2563EB;padding-bottom:20px;margin-bottom:24px;"><div style="display:flex;justify-content:space-between;align-items:flex-start;"><div><div style="font-size:11px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">GradeTrack — Grade Report</div><h1 style="font-size:26px;font-weight:800;">${subject.subject_name}</h1>${subject.instructor_name ? `<div style="color:#64748b;margin-top:4px;">${subject.instructor_name}</div>` : ''}${subject.semester ? `<div style="color:#64748b;">${subject.semester}</div>` : ''}</div>${gradeData ? `<div style="text-align:center;"><div style="font-size:36px;font-weight:800;color:${gradeColor};">${gradeData.grade.toFixed(2)}%</div><div style="font-size:13px;font-weight:600;color:${gradeColor};">${gradeLabel}</div></div>` : ''}</div><div style="margin-top:10px;font-size:12px;color:#94a3b8;">Generated: ${new Date().toLocaleString()}</div></div><h2 style="font-size:16px;font-weight:700;margin-bottom:14px;">Grade Categories & Scores</h2>${categoriesHTML}${gradeData ? `<div style="margin-top:24px;border:2px solid #2563EB;border-radius:8px;padding:16px;"><h2 style="font-size:15px;font-weight:700;margin-bottom:12px;color:#2563EB;">Final Grade Summary</h2>${cats.filter(c=>c.scores?.length>0).map(cat=>{const s=cat.scores.reduce((a,sc)=>a+sc.score_obtained,0);const t=cat.scores.reduce((a,sc)=>a+sc.total_score,0);const a=t>0?(s/t)*100:0;const w=a*(cat.category_weight/100);return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;"><span>${cat.category_name}</span><span>${a.toFixed(1)}% × ${cat.category_weight}% = <strong style="color:#2563EB;">${w.toFixed(2)}</strong></span></div>`;}).join('')}${attendance?.mode==='with_grade'&&attendanceStats?.total>0?`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;"><span>Attendance</span><span>${attendanceStats.percentage.toFixed(1)}% × ${attendance.attendance_weight}% = <strong style="color:#2563EB;">${(attendanceStats.percentage*attendance.attendance_weight/100).toFixed(2)}</strong></span></div>`:''}<div style="display:flex;justify-content:space-between;padding-top:12px;font-size:18px;font-weight:800;"><span>Final Grade</span><span style="color:${gradeColor};">${gradeData.grade.toFixed(2)}%</span></div></div>` : ''}${attendanceHTML}</body></html>`;
}

function WeightBar({ categories, attendanceWeight }) {
  const colors = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#EC4899','#84CC16'];
  const total = categories.reduce((s, c) => s + c.category_weight, 0) + (attendanceWeight || 0);
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: '#F1F5F9' }}>
        {categories.map((cat, i) => <div key={cat.id} style={{ width: `${cat.category_weight}%`, background: colors[i % colors.length] }} title={`${cat.category_name}: ${cat.category_weight}%`} />)}
        {attendanceWeight > 0 && <div style={{ width: `${attendanceWeight}%`, background: '#6366F1' }} title={`Attendance: ${attendanceWeight}%`} />}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
        {categories.map((cat, i) => (
          <span key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[i % colors.length], display: 'inline-block' }} />
            {cat.category_name} {cat.category_weight}%
          </span>
        ))}
        {attendanceWeight > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6366F1', fontWeight: '600' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366F1', display: 'inline-block' }} />
            Attendance {attendanceWeight}%
          </span>
        )}
        {total < 100 && <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>({(100 - total).toFixed(0)}% unassigned)</span>}
      </div>
    </div>
  );
}

function CategoryCard({ category, delay, onAddScore, onEditCat, onDeleteCat, onEditScore, onDeleteScore, passingGrade = 75 }) {
  const [expanded, setExpanded] = useState(true);
  const scores = category.scores || [];
  const sumObt = scores.reduce((s, sc) => s + sc.score_obtained, 0);
  const sumTot = scores.reduce((s, sc) => s + sc.total_score, 0);
  const avg = sumTot > 0 ? (sumObt / sumTot) * 100 : null;
  const status = avg !== null ? getGradeStatus(avg, passingGrade) : null;
  return (
    <div style={{ ...styles.catCard, animationDelay: `${delay}s` }} className="animate-in">
      <div style={styles.catHeader} onClick={() => setExpanded(e => !e)}>
        <div style={styles.catLeft}>
          <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#94A3B8' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' style={{transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition:'transform 0.2s', flexShrink:0, marginRight:'2px'}}><polyline points='9 18 15 12 9 6'/></svg>
          <div>
            <div style={styles.catName}>{category.category_name}</div>
            <div style={styles.catWeight}>Weight: {category.category_weight}%</div>
          </div>
        </div>
        <div style={styles.catRight} onClick={e => e.stopPropagation()}>
          {avg !== null && <span style={{ ...styles.catGrade, background: status.bg, color: status.color }}>{avg.toFixed(1)}%</span>}
          <CatActionBtn onClick={onAddScore} title="Add Score"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg></CatActionBtn>
          <CatActionBtn onClick={onEditCat} title="Edit"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></CatActionBtn>
          <CatActionBtn onClick={onDeleteCat} title="Delete" danger><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></CatActionBtn>
        </div>
      </div>
      {expanded && (
        <div style={styles.scoresSection} className="animate-in">
          {scores.length === 0 ? <div style={styles.noScores}>No scores yet — click + to add</div> : (
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Label</th><th style={styles.th}>Score</th><th style={styles.th}>Total</th><th style={styles.th}>%</th><th style={styles.th}></th></tr></thead>
              <tbody>
                {scores.map(sc => {
                  const pct = (sc.score_obtained / sc.total_score) * 100;
                  const st = getGradeStatus(pct, passingGrade);
                  return (
                    <tr key={sc.id} style={styles.tr} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={styles.td}>{sc.label || <span style={{color:'#CBD5E1'}}>—</span>}</td>
                      <td style={{ ...styles.td, fontFamily: 'DM Mono, monospace' }}>{sc.score_obtained}</td>
                      <td style={{ ...styles.td, fontFamily: 'DM Mono, monospace' }}>{sc.total_score}</td>
                      <td style={styles.td}><span style={{ ...styles.pctBadge, background: st.bg, color: st.color }}>{pct.toFixed(1)}%</span></td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <CatActionBtn onClick={() => onEditScore(sc)} title="Edit"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></CatActionBtn>
                          <CatActionBtn onClick={() => onDeleteScore(sc)} title="Delete" danger><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></CatActionBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {scores.length > 1 && <tfoot><tr style={{ background: '#F8FAFC' }}><td style={{ ...styles.td, fontWeight: '600', color: '#374151' }} colSpan={2}>Average</td><td style={styles.td}></td><td style={styles.td}><span style={{ fontWeight: '700', color: status?.color }}>{avg.toFixed(1)}%</span></td><td style={styles.td}></td></tr></tfoot>}
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function CatActionBtn({ onClick, title, danger, children }) {
  return (
    <button onClick={onClick} title={title} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', borderRadius: '5px', transition: 'background 0.15s', color: '#64748B', display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? '#FEE2E2' : '#F1F5F9'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {children}
    </button>
  );
}

function QuickStat({ label, value }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px', background: '#F8FAFC', borderRadius: '8px' }}>
      <div style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: '10px', border: '2px dashed #E2E8F0' }}>
      <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#CBD5E1' strokeWidth='1.5' strokeLinecap='round' style={{marginBottom:'10px'}}><rect x='3' y='5' width='18' height='16' rx='2'/><path d='M16 3v4M8 3v4M3 9h18'/><line x1='8' y1='13' x2='16' y2='13'/><line x1='8' y1='17' x2='12' y2='17'/></svg>
      <div style={{ fontSize: '13px', color: '#94A3B8' }}>{text}</div>
    </div>
  );
}

function CategoryModal({ category, usedWeight, onClose, onSave }) {
  const [form, setForm] = useState({ category_name: category?.category_name || '', category_weight: category?.category_weight || '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const available = (100 - usedWeight).toFixed(1);
  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.category_name.trim()) { setError('Category name is required'); return; }
    const w = parseFloat(form.category_weight);
    if (isNaN(w) || w <= 0) { setError('Weight must be a positive number'); return; }
    if (w > 100) { setError('Weight cannot exceed 100%'); return; }
    setLoading(true);
    try { await onSave({ category_name: form.category_name, category_weight: w }); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  return (
    <div style={mStyles.overlay} onClick={onClose}>
      <div style={mStyles.modal} onClick={e => e.stopPropagation()} className="animate-scale">
        <div style={mStyles.header}><h2 style={mStyles.title}>{category ? 'Edit Category' : 'Add Category'}</h2><button onClick={onClose} style={mStyles.close}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <div style={mStyles.hint}>Available weight: <strong>{available}%</strong></div>
        {error && <div style={mStyles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={mStyles.field}><label style={mStyles.label}>Category Name *</label><input value={form.category_name} onChange={e => setForm(f => ({ ...f, category_name: e.target.value }))} placeholder="e.g. Quizzes, Midterm..." style={mStyles.input} onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E2E8F8'} /></div>
          <div style={mStyles.field}><label style={mStyles.label}>Weight (%) *</label><input type="number" min="1" max="100" step="0.1" value={form.category_weight} onChange={e => setForm(f => ({ ...f, category_weight: e.target.value }))} placeholder={`Max: ${available}%`} style={mStyles.input} onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E2E8F8'} /></div>
          <div style={mStyles.actions}>
            <button type="button" onClick={onClose} style={mStyles.cancel} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...mStyles.save, opacity: loading ? 0.7 : 1 }}>{loading ? 'Saving...' : category ? 'Save Changes' : 'Add Category'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ScoreModal({ score, onClose, onSave }) {
  const [form, setForm] = useState({ score_obtained: score?.score_obtained ?? '', total_score: score?.total_score ?? '', label: score?.label || '', date_taken: score?.date_taken?.split('T')[0] || '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const obt = parseFloat(form.score_obtained); const tot = parseFloat(form.total_score);
    if (isNaN(obt) || isNaN(tot)) { setError('Please enter valid numbers'); return; }
    if (obt < 0 || tot < 0) { setError('Scores cannot be negative'); return; }
    if (tot === 0) { setError('Total score must be greater than 0'); return; }
    if (obt > tot) { setError('Score obtained cannot exceed total score'); return; }
    setLoading(true);
    try { await onSave({ score_obtained: obt, total_score: tot, label: form.label, date_taken: form.date_taken || null }); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  const pct = (form.score_obtained !== '' && form.total_score !== '' && parseFloat(form.total_score) > 0)
    ? ((parseFloat(form.score_obtained) / parseFloat(form.total_score)) * 100).toFixed(1) : null;
  return (
    <div style={mStyles.overlay} onClick={onClose}>
      <div style={mStyles.modal} onClick={e => e.stopPropagation()} className="animate-scale">
        <div style={mStyles.header}><h2 style={mStyles.title}>{score ? 'Edit Score' : 'Add Score'}</h2><button onClick={onClose} style={mStyles.close}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        {pct && <div style={{ textAlign: 'center', marginBottom: '12px' }}><span style={{ fontSize: '28px', fontWeight: '800', color: getGradeStatus(parseFloat(pct)).color, fontFamily: 'DM Mono, monospace' }}>{pct}%</span></div>}
        {error && <div style={mStyles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={mStyles.field}><label style={mStyles.label}>Label (optional)</label><input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Quiz 1..." style={mStyles.input} onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E2E8F8'} /></div>
            <div style={mStyles.field}><label style={mStyles.label}>Date Taken (optional)</label><input type="date" value={form.date_taken} onChange={e => setForm(f => ({ ...f, date_taken: e.target.value }))} style={mStyles.input} onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E2E8F8'} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={mStyles.field}><label style={mStyles.label}>Score Obtained *</label><input type="number" min="0" step="0.01" value={form.score_obtained} onChange={e => setForm(f => ({ ...f, score_obtained: e.target.value }))} placeholder="e.g. 42" style={mStyles.input} onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E2E8F8'} /></div>
            <div style={mStyles.field}><label style={mStyles.label}>Total Score *</label><input type="number" min="0.01" step="0.01" value={form.total_score} onChange={e => setForm(f => ({ ...f, total_score: e.target.value }))} placeholder="e.g. 50" style={mStyles.input} onFocus={e => e.target.style.borderColor = '#2563EB'} onBlur={e => e.target.style.borderColor = '#E2E8F8'} /></div>
          </div>
          <div style={mStyles.actions}>
            <button type="button" onClick={onClose} style={mStyles.cancel}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...mStyles.save, opacity: loading ? 0.7 : 1 }}>{loading ? 'Saving...' : score ? 'Save Changes' : 'Add Score'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ name, onConfirm, onClose }) {
  return (
    <div style={mStyles.overlay} onClick={onClose}>
      <div style={{ ...mStyles.modal, maxWidth: '400px' }} onClick={e => e.stopPropagation()} className="animate-scale">
<div style={{ display:'flex', justifyContent:'center', marginBottom:'14px' }}><svg width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='#EF4444' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg></div>
        <h3 style={{ fontSize: '17px', fontWeight: '700', textAlign: 'center', marginBottom: '8px' }}>Confirm Delete</h3>
        <p style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', marginBottom: '24px' }}>Delete {name}? This cannot be undone.</p>
        <div style={mStyles.actions}>
          <button onClick={onClose} style={mStyles.cancel}>Cancel</button>
          <button onClick={onConfirm} style={{ ...mStyles.save, background: '#EF4444', boxShadow: 'none' }} onMouseEnter={e => e.currentTarget.style.background = '#DC2626'} onMouseLeave={e => e.currentTarget.style.background = '#EF4444'}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function ExpectedScoreRow({ category, expected, onChange }) {
  const addRow = () => onChange([...expected, { score_obtained: '', total_score: '' }]);
  const removeRow = (i) => onChange(expected.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) => onChange(expected.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  const existingAvg = (() => {
    if (!category.scores || category.scores.length === 0) return null;
    const sumO = category.scores.reduce((s, sc) => s + sc.score_obtained, 0);
    const sumT = category.scores.reduce((s, sc) => s + sc.total_score, 0);
    return sumT > 0 ? (sumO / sumT * 100).toFixed(1) : null;
  })();
  return (
    <div style={{ marginBottom: '10px', background: '#F8FAFF', borderRadius: '8px', padding: '10px 12px', border: '1px solid #E2E8F8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>{category.category_name}</span>
          <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '6px' }}>{category.category_weight}% weight</span>
          {existingAvg && <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '6px' }}>Current: {existingAvg}%</span>}
        </div>
        <button onClick={addRow} style={{ background: '#EFF4FF', border: 'none', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: '600', color: '#2563EB', cursor: 'pointer' }}>+ Add Expected</button>
      </div>
      {expected.map((row, i) => {
        const pct = row.score_obtained !== '' && row.total_score !== '' && parseFloat(row.total_score) > 0 ? (parseFloat(row.score_obtained) / parseFloat(row.total_score) * 100).toFixed(1) : null;
        return (
          <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
            <input type="number" placeholder="Score" value={row.score_obtained} onChange={e => updateRow(i, 'score_obtained', parseFloat(e.target.value) || '')} style={{ width: '70px', border: '1.5px solid #E2E8F8', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', outline: 'none', background: 'white' }} />
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>/</span>
            <input type="number" placeholder="Total" value={row.total_score} onChange={e => updateRow(i, 'total_score', parseFloat(e.target.value) || '')} style={{ width: '70px', border: '1.5px solid #E2E8F8', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', outline: 'none', background: 'white' }} />
            {pct && <span style={{ fontSize: '12px', fontWeight: '700', color: parseFloat(pct) >= 75 ? '#10B981' : '#EF4444', minWidth: '42px' }}>{pct}%</span>}
            <button onClick={() => removeRow(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '14px', padding: '2px 4px', marginLeft: 'auto' }}><svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg></button>
          </div>
        );
      })}
    </div>
  );
}

function LoadingState() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F0F4FF' }}><div style={{ textAlign: 'center' }}><svg width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='#94A3B8' strokeWidth='1.5' strokeLinecap='round' style={{marginBottom:'14px',animation:'spin 1.2s linear infinite'}}><circle cx='12' cy='12' r='10' opacity='0.25'/><path d='M12 2a10 10 0 0 1 10 10'/></svg><p style={{ color: '#64748B', fontSize:'14px' }}>Loading subject...</p></div></div>;
}

function ErrorState({ message, onBack }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F0F4FF' }}><div style={{ textAlign: 'center' }}><svg width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='#94A3B8' strokeWidth='1.5' strokeLinecap='round' style={{marginBottom:'14px'}}><circle cx='12' cy='12' r='10'/><path d='M16 16s-1.5-2-4-2-4 2-4 2'/><line x1='9' y1='9' x2='9.01' y2='9'/><line x1='15' y1='9' x2='15.01' y2='9'/></svg><p style={{ color: '#64748B', marginBottom: '16px' }}>{message}</p><button onClick={onBack} style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer' }}>Back to Dashboard</button></div></div>;
}



const styles = {
  page: { minHeight: '100vh', background: '#F0F4FF' },
  topNav: { background: 'white', borderBottom: '1px solid #E2E8F0', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(15,23,42,0.06)' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151', padding: '6px 10px', borderRadius: '8px', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  navSemester: { fontSize: '12px', color: '#64748B', background: '#F1F5F9', padding: '4px 10px', borderRadius: '20px' },
  printBtn: { display: 'flex', alignItems: 'center', gap: '7px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s', fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' },
  content: { padding: '28px 32px', maxWidth: '1100px', margin: '0 auto' },
  hero: { background: 'white', borderRadius: '16px', padding: '28px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.08), 0 4px 16px rgba(15,23,42,0.04)' },
  heroLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  heroInitial: { width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, #EFF4FF, #DBEAFE)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', flexShrink: 0 },
  heroTitle: { fontSize: '24px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.5px' },
  heroSub: { fontSize: '13px', color: '#64748B', marginTop: '3px' },
  heroGrade: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  gradeCircle: { width: '88px', height: '88px', borderRadius: '50%', border: '4px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  gradeNum: { fontSize: '18px', fontWeight: '800', fontFamily: 'DM Mono, monospace', lineHeight: 1 },
  statusPill: { fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px' },
  trendBanner: { padding: '12px 16px', borderRadius: '10px', border: '1px solid', fontSize: '13px', fontWeight: '500', marginBottom: '16px' },
  weightWarning: { padding: '10px 16px', borderRadius: '10px', background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: '13px', color: '#92400E', marginBottom: '16px' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' },
  leftCol: {},
  rightCol: { display: 'flex', flexDirection: 'column', gap: '16px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  sectionTitle: { fontSize: '17px', fontWeight: '700', color: '#0F172A' },
  addSmallBtn: { background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s', fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' },
  catCard: { background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.08)', border: '1px solid rgba(226,232,240,0.6)' },
  catHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', cursor: 'pointer' },
  catLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  expandIcon: { fontSize: '10px', color: '#94A3B8', userSelect: 'none' },
  catName: { fontSize: '14px', fontWeight: '600', color: '#0F172A' },
  catWeight: { fontSize: '12px', color: '#64748B' },
  catRight: { display: 'flex', alignItems: 'center', gap: '4px' },
  catGrade: { fontSize: '13px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', marginRight: '4px', fontFamily: 'DM Mono, monospace' },
  scoresSection: { borderTop: '1px solid #F1F5F9', padding: '0 4px 8px' },
  noScores: { textAlign: 'center', padding: '20px', fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: '11px', fontWeight: '600', color: '#94A3B8', textAlign: 'left', padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { transition: 'background 0.1s' },
  td: { fontSize: '13px', padding: '8px 12px', color: '#374151', borderTop: '1px solid #F8FAFC' },
  pctBadge: { fontSize: '12px', fontWeight: '700', padding: '1px 7px', borderRadius: '20px', fontFamily: 'DM Mono, monospace' },
  summaryCard: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.08)' },
  plannerCard: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.08)' },
  quickStatsCard: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(15,23,42,0.08)' },
  cardTitle: { fontSize: '14px', fontWeight: '700', color: '#0F172A', marginBottom: '14px' },
  breakdownRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F8FAFC' },
  breakdownName: { fontSize: '13px', color: '#374151', fontWeight: '500' },
  breakdownStats: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  breakdownWeight: { fontSize: '11px', color: '#94A3B8' },
  breakdownTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', marginTop: '4px', fontWeight: '700', fontSize: '14px' },
  mono: { fontFamily: 'DM Mono, monospace' },
  plannerDesc: { fontSize: '12px', color: '#64748B', marginBottom: '12px' },
  plannerInput: { marginBottom: '12px' },
  input: { width: '100%', border: '1.5px solid #E2E8F8', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', outline: 'none', transition: 'border-color 0.2s', background: '#FAFBFF', color: '#0F172A', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  plannerResult: { padding: '16px', borderRadius: '10px', border: '1px solid', textAlign: 'center' },
  quickStatsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
};

const mStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '24px' },
  modal: { background: 'white', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(15,23,42,0.2)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { fontSize: '18px', fontWeight: '700', color: '#0F172A' },
  close: { background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', fontSize: '13px', color: '#64748B' },
  hint: { fontSize: '12px', color: '#64748B', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', marginBottom: '14px' },
  error: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#DC2626', marginBottom: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input: { border: '1.5px solid #E2E8F8', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', background: '#FAFBFF', color: '#0F172A', fontFamily: 'Plus Jakarta Sans, sans-serif', width: '100%' },
  actions: { display: 'flex', gap: '10px', paddingTop: '6px' },
  cancel: { flex: 1, padding: '9px', borderRadius: '8px', border: '1.5px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151', fontFamily: 'Plus Jakarta Sans, sans-serif' },
  save: { flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#2563EB', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' },
};
