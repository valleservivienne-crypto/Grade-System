const express = require('express');
const { get2, all2, run2 } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

const verifySubjectOwnership = (subjectId, userId) =>
  get2('SELECT * FROM subjects WHERE id = $1 AND user_id = $2', [subjectId, userId]);

const verifyCategoryOwnership = (categoryId, userId) =>
  get2(`
    SELECT c.* FROM categories c
    JOIN subjects s ON c.subject_id = s.id
    WHERE c.id = $1 AND s.user_id = $2
  `, [categoryId, userId]);

// === CATEGORIES ===

router.post('/subjects/:subjectId/categories', async (req, res) => {
  try {
    const subject = await verifySubjectOwnership(req.params.subjectId, req.user.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const { category_name, category_weight } = req.body;
    if (!category_name || !category_name.trim())
      return res.status(400).json({ error: 'Category name is required' });

    const weight = parseFloat(category_weight);
    if (isNaN(weight) || weight <= 0 || weight > 100)
      return res.status(400).json({ error: 'Weight must be between 0 and 100' });

    const row = await get2(
      'SELECT COALESCE(SUM(category_weight), 0) as total FROM categories WHERE subject_id = $1',
      [req.params.subjectId]
    );
    if (parseFloat(row.total) + weight > 100.01)
      return res.status(400).json({
        error: `Total weight would exceed 100%. Current: ${parseFloat(row.total).toFixed(1)}%, available: ${(100 - parseFloat(row.total)).toFixed(1)}%`
      });

    const result = await run2(
      'INSERT INTO categories (subject_id, category_name, category_weight) VALUES ($1, $2, $3) RETURNING id',
      [req.params.subjectId, category_name.trim(), weight]
    );
    const category = await get2('SELECT * FROM categories WHERE id = $1', [result.lastInsertRowid]);
    res.status(201).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const category = await verifyCategoryOwnership(req.params.id, req.user.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const { category_name, category_weight } = req.body;
    if (!category_name || !category_name.trim())
      return res.status(400).json({ error: 'Category name is required' });

    const weight = parseFloat(category_weight);
    if (isNaN(weight) || weight <= 0 || weight > 100)
      return res.status(400).json({ error: 'Weight must be between 0 and 100' });

    const row = await get2(
      'SELECT COALESCE(SUM(category_weight), 0) as total FROM categories WHERE subject_id = $1 AND id != $2',
      [category.subject_id, req.params.id]
    );
    if (parseFloat(row.total) + weight > 100.01)
      return res.status(400).json({
        error: `Total weight would exceed 100%. Other categories: ${parseFloat(row.total).toFixed(1)}%`
      });

    await run2(
      'UPDATE categories SET category_name = $1, category_weight = $2 WHERE id = $3',
      [category_name.trim(), weight, req.params.id]
    );
    const updated = await get2('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const category = await verifyCategoryOwnership(req.params.id, req.user.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    await run2('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// === SCORES ===

router.post('/categories/:categoryId/scores', async (req, res) => {
  try {
    const category = await verifyCategoryOwnership(req.params.categoryId, req.user.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const { score_obtained, total_score, label } = req.body;
    const obtained = parseFloat(score_obtained);
    const total = parseFloat(total_score);

    if (isNaN(obtained) || isNaN(total))
      return res.status(400).json({ error: 'Scores must be numbers' });
    if (obtained < 0 || total < 0)
      return res.status(400).json({ error: 'Scores cannot be negative' });
    if (obtained > total)
      return res.status(400).json({ error: 'Score obtained cannot exceed total score' });
    if (total === 0)
      return res.status(400).json({ error: 'Total score must be greater than 0' });

    const result = await run2(
      'INSERT INTO scores (category_id, score_obtained, total_score, label) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.params.categoryId, obtained, total, label || '']
    );
    const score = await get2('SELECT * FROM scores WHERE id = $1', [result.lastInsertRowid]);
    res.status(201).json(score);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/scores/:id', async (req, res) => {
  try {
    const score = await get2(`
      SELECT sc.* FROM scores sc
      JOIN categories c ON sc.category_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      WHERE sc.id = $1 AND s.user_id = $2
    `, [req.params.id, req.user.id]);
    if (!score) return res.status(404).json({ error: 'Score not found' });

    const { score_obtained, total_score, label } = req.body;
    const obtained = parseFloat(score_obtained);
    const total = parseFloat(total_score);

    if (isNaN(obtained) || isNaN(total))
      return res.status(400).json({ error: 'Scores must be numbers' });
    if (obtained < 0 || total < 0)
      return res.status(400).json({ error: 'Scores cannot be negative' });
    if (obtained > total)
      return res.status(400).json({ error: 'Score obtained cannot exceed total score' });
    if (total === 0)
      return res.status(400).json({ error: 'Total score must be greater than 0' });

    await run2(
      'UPDATE scores SET score_obtained = $1, total_score = $2, label = $3 WHERE id = $4',
      [obtained, total, label || '', req.params.id]
    );
    const updated = await get2('SELECT * FROM scores WHERE id = $1', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/scores/:id', async (req, res) => {
  try {
    const score = await get2(`
      SELECT sc.* FROM scores sc
      JOIN categories c ON sc.category_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      WHERE sc.id = $1 AND s.user_id = $2
    `, [req.params.id, req.user.id]);
    if (!score) return res.status(404).json({ error: 'Score not found' });

    await run2('DELETE FROM scores WHERE id = $1', [req.params.id]);
    res.json({ message: 'Score deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// === ATTENDANCE ===

router.get('/subjects/:subjectId/attendance', async (req, res) => {
  try {
    const subject = await verifySubjectOwnership(req.params.subjectId, req.user.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    let attendance = await get2('SELECT * FROM attendance WHERE subject_id = $1', [req.params.subjectId]);
    if (!attendance) {
      const result = await run2(
        'INSERT INTO attendance (subject_id, total_classes, mode, attendance_weight) VALUES ($1, 0, $2, 0) RETURNING id',
        [req.params.subjectId, 'unset']
      );
      attendance = await get2('SELECT * FROM attendance WHERE id = $1', [result.lastInsertRowid]);
    }

    const sessions = await all2(
      'SELECT * FROM attendance_sessions WHERE attendance_id = $1 ORDER BY created_at ASC',
      [attendance.id]
    );

    res.json({ ...attendance, sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/subjects/:subjectId/attendance', async (req, res) => {
  try {
    const subject = await verifySubjectOwnership(req.params.subjectId, req.user.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const { total_classes, mode, attendance_weight } = req.body;

    let attendance = await get2('SELECT * FROM attendance WHERE subject_id = $1', [req.params.subjectId]);

    if (!attendance) {
      const result = await run2(
        'INSERT INTO attendance (subject_id, total_classes, mode, attendance_weight) VALUES ($1, $2, $3, $4) RETURNING id',
        [req.params.subjectId, total_classes ?? 0, mode ?? 'unset', attendance_weight ?? 0]
      );
      attendance = await get2('SELECT * FROM attendance WHERE id = $1', [result.lastInsertRowid]);
    } else {
      const newTotal = total_classes !== undefined ? parseInt(total_classes) : attendance.total_classes;
      const newMode = mode !== undefined ? mode : attendance.mode;
      const newWeight = attendance_weight !== undefined ? parseFloat(attendance_weight) : attendance.attendance_weight;

      await run2(
        'UPDATE attendance SET total_classes = $1, mode = $2, attendance_weight = $3, updated_at = CURRENT_TIMESTAMP WHERE subject_id = $4',
        [newTotal, newMode, newWeight, req.params.subjectId]
      );
      attendance = await get2('SELECT * FROM attendance WHERE subject_id = $1', [req.params.subjectId]);
    }

    const sessions = await all2(
      'SELECT * FROM attendance_sessions WHERE attendance_id = $1 ORDER BY created_at ASC',
      [attendance.id]
    );

    res.json({ ...attendance, sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/subjects/:subjectId/attendance/sessions', async (req, res) => {
  try {
    const subject = await verifySubjectOwnership(req.params.subjectId, req.user.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const { status, label } = req.body;
    if (!['present', 'absent', 'late'].includes(status))
      return res.status(400).json({ error: 'Status must be present, absent, or late' });

    let attendance = await get2('SELECT * FROM attendance WHERE subject_id = $1', [req.params.subjectId]);
    if (!attendance) {
      const result = await run2(
        'INSERT INTO attendance (subject_id, total_classes, mode, attendance_weight) VALUES ($1, 0, $2, 0) RETURNING id',
        [req.params.subjectId, 'unset']
      );
      attendance = await get2('SELECT * FROM attendance WHERE id = $1', [result.lastInsertRowid]);
    }

    // Check session limit
    const sessionCount = await get2(
      'SELECT COUNT(*) as count FROM attendance_sessions WHERE attendance_id = $1',
      [attendance.id]
    );
    if (attendance.total_classes > 0 && parseInt(sessionCount.count) >= attendance.total_classes) {
      return res.status(400).json({ error: `Maximum sessions reached (${attendance.total_classes})` });
    }

    const result = await run2(
      'INSERT INTO attendance_sessions (attendance_id, status, label) VALUES ($1, $2, $3) RETURNING id',
      [attendance.id, status, label || '']
    );
    const session = await get2('SELECT * FROM attendance_sessions WHERE id = $1', [result.lastInsertRowid]);
    res.status(201).json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/attendance/sessions/:id', async (req, res) => {
  try {
    const session = await get2(`
      SELECT s.* FROM attendance_sessions s
      JOIN attendance a ON s.attendance_id = a.id
      JOIN subjects sub ON a.subject_id = sub.id
      WHERE s.id = $1 AND sub.user_id = $2
    `, [req.params.id, req.user.id]);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    await run2('DELETE FROM attendance_sessions WHERE id = $1', [req.params.id]);
    res.json({ message: 'Session deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
