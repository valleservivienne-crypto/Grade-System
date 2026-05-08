const API_BASE = 'https://gradetransparency-system.onrender.com/api';

const getToken = () => localStorage.getItem('grade_token');

const request = async (method, path, body = null) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, config);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const api = {
  // Auth
  signup: (body) => request('POST', '/auth/signup', body),
  login: (body) => request('POST', '/auth/login', body),
  me: () => request('GET', '/auth/me'),

  // Subjects
  getSubjects: () => request('GET', '/subjects'),
  getSubject: (id) => request('GET', `/subjects/${id}`),
  createSubject: (body) => request('POST', '/subjects', body),
  updateSubject: (id, body) => request('PUT', `/subjects/${id}`, body),
  deleteSubject: (id) => request('DELETE', `/subjects/${id}`),

  // Categories
  createCategory: (subjectId, body) => request('POST', `/subjects/${subjectId}/categories`, body),
  updateCategory: (id, body) => request('PUT', `/categories/${id}`, body),
  deleteCategory: (id) => request('DELETE', `/categories/${id}`),

  // Scores
  createScore: (categoryId, body) => request('POST', `/categories/${categoryId}/scores`, body),
  updateScore: (id, body) => request('PUT', `/scores/${id}`, body),
  deleteScore: (id) => request('DELETE', `/scores/${id}`),

  // Attendance
  getAttendance: (subjectId) => request('GET', `/subjects/${subjectId}/attendance`),
  updateAttendance: (subjectId, body) => request('PUT', `/subjects/${subjectId}/attendance`, body),
  addAttendanceSession: (subjectId, body) => request('POST', `/subjects/${subjectId}/attendance/sessions`, body),
  deleteAttendanceSession: (id) => request('DELETE', `/attendance/sessions/${id}`),


};

// Grade calculation — now includes attendance if mode is with_grade
export const calculateGrade = (categories, attendance = null) => {
  if (!categories || categories.length === 0) return null;

  let finalGrade = 0;
  let totalWeight = 0;

  for (const cat of categories) {
    if (!cat.scores || cat.scores.length === 0) continue;
    const sumObtained = cat.scores.reduce((s, sc) => s + sc.score_obtained, 0);
    const sumTotal = cat.scores.reduce((s, sc) => s + sc.total_score, 0);
    if (sumTotal === 0) continue;
    const catAvg = (sumObtained / sumTotal) * 100;
    const weighted = catAvg * (cat.category_weight / 100);
    finalGrade += weighted;
    totalWeight += cat.category_weight;
  }

  // Include attendance in grade if mode is with_grade
  if (attendance && attendance.mode === 'with_grade' && attendance.attendance_weight > 0) {
    const sessions = attendance.sessions || [];
    const present = sessions.filter(s => s.status === 'present').length;
    const late = sessions.filter(s => s.status === 'late').length;
    const attended = present + late;
    const total = attendance.total_classes || 0;
    if (total > 0) {
      const attPct = (attended / total) * 100;
      const attWeighted = attPct * (attendance.attendance_weight / 100);
      finalGrade += attWeighted;
      totalWeight += attendance.attendance_weight;
    }
  }

  if (totalWeight === 0) return null;
  return { grade: finalGrade, totalWeight };
};

export const getGradeStatus = (grade, passingGrade = 75) => {
  // passingGrade = subject's passing_grade field (per-subject, set by prof)
  // On Track: >= passing + 10 buffer
  // Needs Improvement: >= passing but < passing + 10
  // At Risk: < passing
  const passing = typeof passingGrade === 'number' ? passingGrade : 75;
  const onTrack = passing + 10;
  if (grade >= onTrack) return { label: 'On Track', color: '#059669', bg: '#ECFDF5' };
  if (grade >= passing) return { label: 'Needs Improvement', color: '#D97706', bg: '#FFFBEB' };
  return { label: 'At Risk', color: '#DC2626', bg: '#FEF2F2' };
};

// GPA conversion (Feature 2)
export const gradeToGPA = (grade) => {
  if (grade >= 97) return 4.0;
  if (grade >= 93) return 4.0;
  if (grade >= 90) return 3.7;
  if (grade >= 87) return 3.3;
  if (grade >= 83) return 3.0;
  if (grade >= 80) return 2.7;
  if (grade >= 77) return 2.3;
  if (grade >= 73) return 2.0;
  if (grade >= 70) return 1.7;
  if (grade >= 67) return 1.3;
  if (grade >= 65) return 1.0;
  return 0.0;
};


export const getTrend = (categories) => {
  const allScores = [];
  for (const cat of categories || []) {
    for (const sc of cat.scores || []) {
      allScores.push({ pct: (sc.score_obtained / sc.total_score) * 100, date: sc.created_at });
    }
  }
  if (allScores.length < 3) return null;
  const recent = allScores.slice(-3).map(s => s.pct);
  const first = recent[0], last = recent[recent.length - 1];
  const diff = last - first;
  if (diff > 5) return { type: 'improving', msg: 'Your scores are trending upward 📈' };
  if (diff < -5) return { type: 'declining', msg: 'Your recent scores are declining 📉' };
  return { type: 'stable', msg: 'Your performance is consistent 📊' };
};

export const calculateWithExpected = (categories, targetGrade, expectedScores = {}) => {
  if (!categories || categories.length === 0) return null;
  const totalWeight = categories.reduce((s, c) => s + c.category_weight, 0);
  if (totalWeight === 0) return null;

  let projectedWeighted = 0;
  const breakdown = [];

  for (const cat of categories) {
    const existing = cat.scores || [];
    const expected = expectedScores[cat.id] || [];
    const allScores = [...existing, ...expected];
    if (allScores.length === 0) { breakdown.push({ cat, avg: null, weighted: 0, hasExpected: false }); continue; }
    const sumObtained = allScores.reduce((s, sc) => s + sc.score_obtained, 0);
    const sumTotal = allScores.reduce((s, sc) => s + sc.total_score, 0);
    if (sumTotal === 0) continue;
    const avg = (sumObtained / sumTotal) * 100;
    const weighted = avg * (cat.category_weight / 100);
    projectedWeighted += weighted;
    breakdown.push({ cat, avg, weighted, hasExpected: expected.length > 0 });
  }

  const gap = targetGrade - projectedWeighted;
  const status = gap <= 0 ? 'achieved' : 'not_yet';
  return { projectedGrade: projectedWeighted, targetGrade, gap, status, breakdown };
};

export const calculateRequiredAverage = (categories, targetGrade) => {
  if (!categories || categories.length === 0) return null;
  const totalWeight = categories.reduce((s, c) => s + c.category_weight, 0);
  if (totalWeight === 0) return null;

  let currentWeighted = 0;
  let completedWeight = 0;

  for (const cat of categories) {
    if (!cat.scores || cat.scores.length === 0) continue;
    const sumObtained = cat.scores.reduce((s, sc) => s + sc.score_obtained, 0);
    const sumTotal = cat.scores.reduce((s, sc) => s + sc.total_score, 0);
    if (sumTotal === 0) continue;
    const catAvg = (sumObtained / sumTotal) * 100;
    currentWeighted += catAvg * (cat.category_weight / 100);
    completedWeight += cat.category_weight;
  }

  const remainingWeight = totalWeight - completedWeight;
  if (remainingWeight <= 0) {
    const finalGrade = completedWeight > 0 ? currentWeighted : null;
    if (finalGrade !== null && finalGrade >= targetGrade) return { status: 'achieved', currentGrade: finalGrade, maxPossible: finalGrade };
    return { status: 'impossible', currentGrade: finalGrade, maxPossible: finalGrade };
  }

  const required = (targetGrade - currentWeighted) / (remainingWeight / 100);
  const maxPossible = currentWeighted + remainingWeight;
  if (required > 100) return { status: 'impossible', required, currentWeighted, remainingWeight, maxPossible };
  if (required <= 0) return { status: 'achieved', currentWeighted, remainingWeight, maxPossible };
  return { status: 'possible', required, currentWeighted, remainingWeight, maxPossible };
};
