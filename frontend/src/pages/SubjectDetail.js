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

  useEffect(() => { load(); }, [load]);

  const gradeData = subject ? calculateGrade(subject.categories) : null;
  const status = gradeData ? getGradeStatus(gradeData.grade) : null;
  const trend = subject ? getTrend(subject.categories) : null;
  const totalWeight = subject ? (subject.categories || []).reduce((s, c) => s + c.category_weight, 0) : 0;
  const plannerResult = (subject && targetGrade !== '') ?
    calculateWithExpected(subject.categories, parseFloat(targetGrade), expectedScores) : null;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onBack={() => navigate('/dashboard')} />;

  return (
    <div style={styles.page}>
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
        </div>
      </div>

      <div style={styles.content}>
        {/* Hero Section */}
        <div style={styles.hero} className="animate-in">
          <div style={styles.heroLeft}>
            <div style={styles.heroInitial}>{subject.subject_name[0]}</div>
            <div>
              <h1 style={styles.heroTitle}>{subject.subject_name}</h1>
              {subject.instructor_name && (
                <p style={styles.heroSub}>👤 {subject.instructor_name}</p>
              )}
            </div>
          </div>
          {gradeData && status && (
            <div style={styles.heroGrade}>
              <div style={{ ...styles.gradeCircle, borderColor: status.color }}>
                <span style={{ ...styles.gradeNum, color: status.color }}>
                  {gradeData.grade.toFixed(1)}%
                </span>
              </div>
              <div style={{ ...styles.statusPill, background: status.bg, color: status.color }}>
                {status.emoji} {status.label}
              </div>
            </div>
          )}
        </div>

        {/* Trend & Alerts */}
        {trend && (
          <div style={{
            ...styles.trendBanner,
            background: trend.type === 'improving' ? '#ECFDF5' : trend.type === 'declining' ? '#FEF2F2' : '#EFF4FF',
            borderColor: trend.type === 'improving' ? '#A7F3D0' : trend.type === 'declining' ? '#FECACA' : '#BFDBFE',
            color: trend.type === 'improving' ? '#065F46' : trend.type === 'declining' ? '#991B1B' : '#1E40AF',
          }} className="animate-in">
            {trend.msg}
          </div>
        )}

        {/* Weight Warning */}
        {totalWeight < 100 && subject.categories?.length > 0 && (
          <div style={styles.weightWarning} className="animate-in">
            ⚠️ Total category weights: <strong>{totalWeight.toFixed(1)}%</strong> — must reach 100% for final grade accuracy
          </div>
        )}

        <div style={styles.mainGrid}>
          {/* Categories Column */}
          <div style={styles.leftCol}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Grade Categories</h2>
              <button onClick={() => { setEditCat(null); setShowCatModal(true); }}
                style={styles.addSmallBtn}
                onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
                onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
                + Add Category
              </button>
            </div>

            {/* Weight Overview */}
            {subject.categories?.length > 0 && (
              <WeightBar categories={subject.categories} />
            )}

            {(!subject.categories || subject.categories.length === 0) ? (
              <EmptyBox icon="📋" text="No categories yet. Add your first grading category." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {subject.categories.map((cat, i) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    delay={i * 0.05}
                    onAddScore={() => { setShowScoreModal(cat.id); setEditScore(null); }}
                    onEditCat={() => { setEditCat(cat); setShowCatModal(true); }}
                    onDeleteCat={() => setDeleteConfirm({ type: 'category', item: cat })}
                    onEditScore={(score) => { setEditScore(score); setShowScoreModal(cat.id); }}
                    onDeleteScore={(score) => setDeleteConfirm({ type: 'score', item: score })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div style={styles.rightCol}>
            {/* Grade Summary */}
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
                        <span style={{ ...styles.mono, color: '#2563EB', fontWeight: '700' }}>
                          = {weighted.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div style={styles.breakdownTotal}>
                  <span>Final Grade</span>
                  <span style={{ ...styles.mono, fontSize: '20px', color: status?.color }}>
                    {gradeData.grade.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}

            {/* Target Grade Planner */}
            <div style={styles.plannerCard} className="animate-in">
              <h3 style={styles.cardTitle}>🎯 Target Grade Planner</h3>
              <p style={styles.plannerDesc}>Add expected upcoming scores to see if you can hit your target</p>

              {/* Target input */}
              <div style={styles.plannerInput}>
                <input
                  type="number" min="0" max="100" value={targetGrade}
                  onChange={e => setTargetGrade(e.target.value)}
                  placeholder="Enter target grade (0-100)"
                  style={styles.input}
                  onFocus={e => e.target.style.borderColor = '#2563EB'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F8'}
                />
              </div>

              {/* Expected scores per category */}
              {targetGrade !== '' && subject?.categories?.map(cat => (
                <ExpectedScoreRow
                  key={cat.id}
                  category={cat}
                  expected={expectedScores[cat.id] || []}
                  onChange={rows => setExpectedScores(prev => ({ ...prev, [cat.id]: rows }))}
                />
              ))}

              {/* Result */}
              {plannerResult && targetGrade !== '' && (
                <div style={{
                  ...styles.plannerResult,
                  marginTop: '12px',
                  background: plannerResult.status === 'achieved' ? '#ECFDF5' : '#EFF4FF',
                  borderColor: plannerResult.status === 'achieved' ? '#A7F3D0' : '#BFDBFE',
                }} className="animate-in">
                  {plannerResult.status === 'achieved' ? (
                    <>
                      <div style={{ fontSize: '24px', marginBottom: '6px' }}>🎉</div>
                      <div style={{ fontWeight: '700', color: '#065F46', fontSize: '15px' }}>Target Achievable!</div>
                      <div style={{ fontSize: '13px', color: '#047857', marginTop: '4px' }}>
                        Projected grade: <strong>{plannerResult.projectedGrade.toFixed(2)}%</strong> ≥ {targetGrade}%
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '24px', marginBottom: '6px' }}>📊</div>
                      <div style={{ fontWeight: '700', color: '#1E40AF', fontSize: '15px' }}>Projected Grade</div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#2563EB', margin: '4px 0' }}>
                        {plannerResult.projectedGrade.toFixed(2)}%
                      </div>
                      <div style={{ fontSize: '13px', color: '#1D4ED8' }}>
                        Still need <strong>{plannerResult.gap.toFixed(2)}%</strong> more to reach {targetGrade}%.
                        Try adding expected scores above 👆
                      </div>
                      {/* Per-category breakdown */}
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {plannerResult.breakdown.filter(b => b.avg !== null).map(b => (
                          <div key={b.cat.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                            <span>{b.cat.category_name} {b.hasExpected ? '✏️' : ''}</span>
                            <span style={{ fontWeight: '600' }}>{b.avg.toFixed(1)}% × {b.cat.category_weight}% = <span style={{ color: '#2563EB' }}>{b.weighted.toFixed(2)}</span></span>
                          </div>
                        ))}
                      </div>
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
                <QuickStat label="Total Scores"
                  value={subject.categories?.reduce((s, c) => s + (c.scores?.length || 0), 0) || 0} />
                <QuickStat label="Weight Used" value={`${totalWeight.toFixed(0)}%`} />
                <QuickStat label="Remaining" value={`${(100 - totalWeight).toFixed(0)}%`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCatModal && (
        <CategoryModal
          category={editCat}
          usedWeight={totalWeight - (editCat?.category_weight || 0)}
          onClose={() => { setShowCatModal(false); setEditCat(null); }}
          onSave={async (data) => {
            try {
              if (editCat) {
                await api.updateCategory(editCat.id, data);
              } else {
                await api.createCategory(id, data);
              }
              await load();
              setShowCatModal(false);
              setEditCat(null);
            } catch (err) { throw err; }
          }}
        />
      )}

      {showScoreModal && (
        <ScoreModal
          score={editScore}
          onClose={() => { setShowScoreModal(null); setEditScore(null); }}
          onSave={async (data) => {
            try {
              if (editScore) {
                await api.updateScore(editScore.id, data);
              } else {
                await api.createScore(showScoreModal, data);
              }
              await load();
              setShowScoreModal(null);
              setEditScore(null);
            } catch (err) { throw err; }
          }}
        />
      )}

      {deleteConfirm && (
        <ConfirmDeleteModal
          name={deleteConfirm.type === 'category' ?
            `category "${deleteConfirm.item.category_name}"` :
            `score entry`}
          onConfirm={async () => {
            try {
              if (deleteConfirm.type === 'category') {
                await api.deleteCategory(deleteConfirm.item.id);
              } else {
                await api.deleteScore(deleteConfirm.item.id);
              }
              await load();
              setDeleteConfirm(null);
            } catch (err) { console.error(err); }
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

function WeightBar({ categories }) {
  const colors = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#EC4899','#84CC16'];
  const total = categories.reduce((s, c) => s + c.category_weight, 0);
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: '#F1F5F9' }}>
        {categories.map((cat, i) => (
          <div key={cat.id} style={{
            width: `${cat.category_weight}%`, background: colors[i % colors.length],
            transition: 'width 0.5s',
          }} title={`${cat.category_name}: ${cat.category_weight}%`} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
        {categories.map((cat, i) => (
          <span key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[i % colors.length], display: 'inline-block' }} />
            {cat.category_name} {cat.category_weight}%
          </span>
        ))}
        {total < 100 && (
          <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>
            ({(100 - total).toFixed(0)}% unassigned)
          </span>
        )}
      </div>
    </div>
  );
}

function CategoryCard({ category, delay, onAddScore, onEditCat, onDeleteCat, onEditScore, onDeleteScore }) {
  const [expanded, setExpanded] = useState(true);
  const scores = category.scores || [];
  const sumObt = scores.reduce((s, sc) => s + sc.score_obtained, 0);
  const sumTot = scores.reduce((s, sc) => s + sc.total_score, 0);
  const avg = sumTot > 0 ? (sumObt / sumTot) * 100 : null;
  const status = avg !== null ? getGradeStatus(avg) : null;

  return (
    <div style={{ ...styles.catCard, animationDelay: `${delay}s` }} className="animate-in">
      <div style={styles.catHeader} onClick={() => setExpanded(e => !e)}>
        <div style={styles.catLeft}>
          <span style={styles.expandIcon}>{expanded ? '▼' : '▶'}</span>
          <div>
            <div style={styles.catName}>{category.category_name}</div>
            <div style={styles.catWeight}>Weight: {category.category_weight}%</div>
          </div>
        </div>
        <div style={styles.catRight} onClick={e => e.stopPropagation()}>
          {avg !== null && (
            <span style={{ ...styles.catGrade, background: status.bg, color: status.color }}>
              {avg.toFixed(1)}%
            </span>
          )}
          <CatActionBtn onClick={onAddScore} title="Add Score">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </CatActionBtn>
          <CatActionBtn onClick={onEditCat} title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </CatActionBtn>
          <CatActionBtn onClick={onDeleteCat} title="Delete" danger>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </CatActionBtn>
        </div>
      </div>

      {expanded && (
        <div style={styles.scoresSection} className="animate-in">
          {scores.length === 0 ? (
            <div style={styles.noScores}>No scores yet — click + to add</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Label</th>
                  <th style={styles.th}>Score</th>
                  <th style={styles.th}>Total</th>
                  <th style={styles.th}>%</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {scores.map(sc => {
                  const pct = (sc.score_obtained / sc.total_score) * 100;
                  const st = getGradeStatus(pct);
                  return (
                    <tr key={sc.id} style={styles.tr}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={styles.td}>{sc.label || <span style={{color:'#CBD5E1'}}>—</span>}</td>
                      <td style={{ ...styles.td, fontFamily: 'DM Mono, monospace' }}>{sc.score_obtained}</td>
                      <td style={{ ...styles.td, fontFamily: 'DM Mono, monospace' }}>{sc.total_score}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.pctBadge, background: st.bg, color: st.color }}>
                          {pct.toFixed(1)}%
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <CatActionBtn onClick={() => onEditScore(sc)} title="Edit">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                          </CatActionBtn>
                          <CatActionBtn onClick={() => onDeleteScore(sc)} title="Delete" danger>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                          </CatActionBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {scores.length > 1 && (
                <tfoot>
                  <tr style={{ background: '#F8FAFC' }}>
                    <td style={{ ...styles.td, fontWeight: '600', color: '#374151' }} colSpan={2}>Average</td>
                    <td style={styles.td}></td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: '700', color: status?.color }}>
                        {avg.toFixed(1)}%
                      </span>
                    </td>
                    <td style={styles.td}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function CatActionBtn({ onClick, title, danger, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: 'transparent', border: 'none', cursor: 'pointer',
      padding: '5px', borderRadius: '5px', transition: 'background 0.15s',
      color: '#64748B', display: 'flex', alignItems: 'center',
    }}
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

function EmptyBox({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: '10px', border: '2px dashed #E2E8F0' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '13px', color: '#94A3B8' }}>{text}</div>
    </div>
  );
}

function CategoryModal({ category, usedWeight, onClose, onSave }) {
  const [form, setForm] = useState({
    category_name: category?.category_name || '',
    category_weight: category?.category_weight || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const available = (100 - usedWeight).toFixed(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.category_name.trim()) { setError('Category name is required'); return; }
    const w = parseFloat(form.category_weight);
    if (isNaN(w) || w <= 0) { setError('Weight must be a positive number'); return; }
    if (w > 100) { setError('Weight cannot exceed 100%'); return; }
    setLoading(true);
    try {
      await onSave({ category_name: form.category_name, category_weight: w });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={mStyles.overlay} onClick={onClose}>
      <div style={mStyles.modal} onClick={e => e.stopPropagation()} className="animate-scale">
        <div style={mStyles.header}>
          <h2 style={mStyles.title}>{category ? 'Edit Category' : 'Add Category'}</h2>
          <button onClick={onClose} style={mStyles.close}>✕</button>
        </div>
        <div style={mStyles.hint}>Available weight: <strong>{available}%</strong></div>
        {error && <div style={mStyles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={mStyles.field}>
            <label style={mStyles.label}>Category Name *</label>
            <input value={form.category_name} onChange={e => setForm(f => ({ ...f, category_name: e.target.value }))}
              placeholder="e.g. Quizzes, Midterm, Final Exam..." style={mStyles.input}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E2E8F8'} />
          </div>
          <div style={mStyles.field}>
            <label style={mStyles.label}>Weight (%) *</label>
            <input type="number" min="1" max="100" step="0.1" value={form.category_weight}
              onChange={e => setForm(f => ({ ...f, category_weight: e.target.value }))}
              placeholder={`Max: ${available}%`} style={mStyles.input}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E2E8F8'} />
          </div>
          <div style={mStyles.actions}>
            <button type="button" onClick={onClose} style={mStyles.cancel}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...mStyles.save, opacity: loading ? 0.7 : 1 }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = '#1D4ED8')}
              onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
              {loading ? 'Saving...' : category ? 'Save Changes' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ScoreModal({ score, onClose, onSave }) {
  const [form, setForm] = useState({
    score_obtained: score?.score_obtained ?? '',
    total_score: score?.total_score ?? '',
    label: score?.label || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const obt = parseFloat(form.score_obtained);
    const tot = parseFloat(form.total_score);
    if (isNaN(obt) || isNaN(tot)) { setError('Please enter valid numbers'); return; }
    if (obt < 0 || tot < 0) { setError('Scores cannot be negative'); return; }
    if (tot === 0) { setError('Total score must be greater than 0'); return; }
    if (obt > tot) { setError('Score obtained cannot exceed total score'); return; }
    setLoading(true);
    try {
      await onSave({ score_obtained: obt, total_score: tot, label: form.label });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const pct = (form.score_obtained !== '' && form.total_score !== '' && parseFloat(form.total_score) > 0)
    ? ((parseFloat(form.score_obtained) / parseFloat(form.total_score)) * 100).toFixed(1) : null;

  return (
    <div style={mStyles.overlay} onClick={onClose}>
      <div style={mStyles.modal} onClick={e => e.stopPropagation()} className="animate-scale">
        <div style={mStyles.header}>
          <h2 style={mStyles.title}>{score ? 'Edit Score' : 'Add Score'}</h2>
          <button onClick={onClose} style={mStyles.close}>✕</button>
        </div>
        {pct && (
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: getGradeStatus(parseFloat(pct)).color, fontFamily: 'DM Mono, monospace' }}>
              {pct}%
            </span>
          </div>
        )}
        {error && <div style={mStyles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={mStyles.field}>
            <label style={mStyles.label}>Label (optional)</label>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Quiz 1, Midterm Exam..." style={mStyles.input}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#E2E8F8'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={mStyles.field}>
              <label style={mStyles.label}>Score Obtained *</label>
              <input type="number" min="0" step="0.01" value={form.score_obtained}
                onChange={e => setForm(f => ({ ...f, score_obtained: e.target.value }))}
                placeholder="e.g. 42" style={mStyles.input}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E2E8F8'} />
            </div>
            <div style={mStyles.field}>
              <label style={mStyles.label}>Total Score *</label>
              <input type="number" min="0.01" step="0.01" value={form.total_score}
                onChange={e => setForm(f => ({ ...f, total_score: e.target.value }))}
                placeholder="e.g. 50" style={mStyles.input}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E2E8F8'} />
            </div>
          </div>
          <div style={mStyles.actions}>
            <button type="button" onClick={onClose} style={mStyles.cancel}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...mStyles.save, opacity: loading ? 0.7 : 1 }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = '#1D4ED8')}
              onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}>
              {loading ? 'Saving...' : score ? 'Save Changes' : 'Add Score'}
            </button>
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
        <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
        <h3 style={{ fontSize: '17px', fontWeight: '700', textAlign: 'center', marginBottom: '8px' }}>Confirm Delete</h3>
        <p style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', marginBottom: '24px' }}>
          Delete {name}? This cannot be undone.
        </p>
        <div style={mStyles.actions}>
          <button onClick={onClose} style={mStyles.cancel}
            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}>Cancel</button>
          <button onClick={onConfirm} style={{ ...mStyles.save, background: '#EF4444', boxShadow: 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = '#DC2626'}
            onMouseLeave={e => e.currentTarget.style.background = '#EF4444'}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function ExpectedScoreRow({ category, expected, onChange }) {
  const addRow = () => onChange([...expected, { score_obtained: '', total_score: '' }]);
  const removeRow = (i) => onChange(expected.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) => {
    const updated = expected.map((row, idx) => idx === i ? { ...row, [field]: val } : row);
    onChange(updated);
  };

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
        <button onClick={addRow} style={{
          background: '#EFF4FF', border: 'none', borderRadius: '6px', padding: '3px 8px',
          fontSize: '11px', fontWeight: '600', color: '#2563EB', cursor: 'pointer'
        }}>+ Add Expected</button>
      </div>
      {expected.map((row, i) => {
        const pct = row.score_obtained !== '' && row.total_score !== '' && parseFloat(row.total_score) > 0
          ? (parseFloat(row.score_obtained) / parseFloat(row.total_score) * 100).toFixed(1) : null;
        return (
          <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
            <input
              type="number" placeholder="Score" value={row.score_obtained}
              onChange={e => updateRow(i, 'score_obtained', parseFloat(e.target.value) || '')}
              style={{ width: '70px', border: '1.5px solid #E2E8F8', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', outline: 'none', background: 'white' }}
            />
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>/</span>
            <input
              type="number" placeholder="Total" value={row.total_score}
              onChange={e => updateRow(i, 'total_score', parseFloat(e.target.value) || '')}
              style={{ width: '70px', border: '1.5px solid #E2E8F8', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', outline: 'none', background: 'white' }}
            />
            {pct && (
              <span style={{ fontSize: '12px', fontWeight: '700', color: parseFloat(pct) >= 75 ? '#10B981' : '#EF4444', minWidth: '42px' }}>
                {pct}%
              </span>
            )}
            <button onClick={() => removeRow(i)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#EF4444', fontSize: '14px', padding: '2px 4px', marginLeft: 'auto'
            }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F0F4FF' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
        <p style={{ color: '#64748B' }}>Loading subject...</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F0F4FF' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>😕</div>
        <p style={{ color: '#64748B', marginBottom: '16px' }}>{message}</p>
        <button onClick={onBack} style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#F0F4FF' },
  topNav: {
    background: 'white', borderBottom: '1px solid #E2E8F0',
    padding: '14px 32px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
    boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent',
    border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
    color: '#374151', padding: '6px 10px', borderRadius: '8px', transition: 'background 0.15s',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
  },
  navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  navSemester: { fontSize: '12px', color: '#64748B', background: '#F1F5F9', padding: '4px 10px', borderRadius: '20px' },
  content: { padding: '28px 32px', maxWidth: '1100px', margin: '0 auto' },
  hero: {
    background: 'white', borderRadius: '16px', padding: '28px',
    marginBottom: '20px', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', flexWrap: 'wrap', gap: '20px',
    boxShadow: '0 1px 3px rgba(15,23,42,0.08), 0 4px 16px rgba(15,23,42,0.04)',
  },
  heroLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  heroInitial: {
    width: '56px', height: '56px', borderRadius: '14px',
    background: 'linear-gradient(135deg, #EFF4FF, #DBEAFE)',
    color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '24px', fontWeight: '800', flexShrink: 0,
  },
  heroTitle: { fontSize: '24px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.5px' },
  heroSub: { fontSize: '13px', color: '#64748B', marginTop: '3px' },
  heroGrade: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  gradeCircle: {
    width: '88px', height: '88px', borderRadius: '50%',
    border: '4px solid', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'white', flexDirection: 'column',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  gradeNum: { fontSize: '18px', fontWeight: '800', fontFamily: 'DM Mono, monospace', lineHeight: 1 },
  gradePct: { fontSize: '11px', color: '#94A3B8', fontWeight: '600', marginTop: '2px' },
  statusPill: { fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px' },
  trendBanner: {
    padding: '12px 16px', borderRadius: '10px', border: '1px solid',
    fontSize: '13px', fontWeight: '500', marginBottom: '16px',
  },
  weightWarning: {
    padding: '10px 16px', borderRadius: '10px', background: '#FFFBEB',
    border: '1px solid #FDE68A', fontSize: '13px', color: '#92400E',
    marginBottom: '16px',
  },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' },
  leftCol: {},
  rightCol: { display: 'flex', flexDirection: 'column', gap: '16px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  sectionTitle: { fontSize: '17px', fontWeight: '700', color: '#0F172A' },
  addSmallBtn: {
    background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px',
    padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
    transition: 'background 0.2s', fontFamily: 'Plus Jakarta Sans, sans-serif',
    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
  },
  catCard: {
    background: 'white', borderRadius: '12px', overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04)',
    border: '1px solid rgba(226,232,240,0.6)',
  },
  catHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', cursor: 'pointer', transition: 'background 0.15s',
  },
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
  input: {
    width: '100%', border: '1.5px solid #E2E8F8', borderRadius: '8px',
    padding: '9px 12px', fontSize: '13px', outline: 'none', transition: 'border-color 0.2s',
    background: '#FAFBFF', color: '#0F172A', fontFamily: 'Plus Jakarta Sans, sans-serif',
  },
  plannerResult: { padding: '16px', borderRadius: '10px', border: '1px solid', textAlign: 'center' },
  quickStatsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
};

const mStyles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(4px)', padding: '24px',
  },
  modal: {
    background: 'white', borderRadius: '16px', padding: '28px',
    maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(15,23,42,0.2)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { fontSize: '18px', fontWeight: '700', color: '#0F172A' },
  close: {
    background: '#F1F5F9', border: 'none', borderRadius: '8px',
    width: '30px', height: '30px', cursor: 'pointer', fontSize: '13px', color: '#64748B',
  },
  hint: { fontSize: '12px', color: '#64748B', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', marginBottom: '14px' },
  error: {
    background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px',
    padding: '10px 12px', fontSize: '13px', color: '#DC2626', marginBottom: '14px',
  },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input: {
    border: '1.5px solid #E2E8F8', borderRadius: '8px', padding: '9px 12px',
    fontSize: '14px', outline: 'none', transition: 'border-color 0.2s',
    background: '#FAFBFF', color: '#0F172A', fontFamily: 'Plus Jakarta Sans, sans-serif', width: '100%',
  },
  actions: { display: 'flex', gap: '10px', paddingTop: '6px' },
  cancel: {
    flex: 1, padding: '9px', borderRadius: '8px', border: '1.5px solid #E2E8F0',
    background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
    color: '#374151', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif',
  },
  save: {
    flex: 1, padding: '9px', borderRadius: '8px', border: 'none',
    background: '#2563EB', color: 'white', cursor: 'pointer', fontSize: '13px',
    fontWeight: '600', transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif',
    boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
  },
};
