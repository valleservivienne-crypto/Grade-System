const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all subjects for user
router.get('/', async (req, res) => {
  try {
    const subjects = await db.all2(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM categories WHERE subject_id = s.id) as category_count
      FROM subjects s 
      WHERE s.user_id = ? 
      ORDER BY s.created_at DESC
    `, [req.user.id]);
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single subject with full data
router.get('/:id', async (req, res) => {
  try {
    const subject = await db.get2(
      'SELECT * FROM subjects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const categories = await db.all2(
      'SELECT * FROM categories WHERE subject_id = ? ORDER BY created_at ASC',
      [subject.id]
    );

    const categoriesWithScores = await Promise.all(categories.map(async cat => {
      const scores = await db.all2(
        'SELECT * FROM scores WHERE category_id = ? ORDER BY created_at ASC',
        [cat.id]
      );
      return { ...cat, scores };
    }));

    res.json({ ...subject, categories: categoriesWithScores });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create subject
router.post('/', async (req, res) => {
  const { subject_name, instructor_name, semester } = req.body;

  if (!subject_name || !subject_name.trim())
    return res.status(400).json({ error: 'Subject name is required' });

  try {
    const result = await db.run2(
      'INSERT INTO subjects (user_id, subject_name, instructor_name, semester) VALUES (?, ?, ?, ?)',
      [req.user.id, subject_name.trim(), instructor_name || '', semester || '']
    );
    const subject = await db.get2('SELECT * FROM subjects WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update subject
router.put('/:id', async (req, res) => {
  try {
    const subject = await db.get2(
      'SELECT * FROM subjects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const { subject_name, instructor_name, semester } = req.body;
    if (!subject_name || !subject_name.trim())
      return res.status(400).json({ error: 'Subject name is required' });

    await db.run2(
      'UPDATE subjects SET subject_name = ?, instructor_name = ?, semester = ? WHERE id = ?',
      [subject_name.trim(), instructor_name || '', semester || '', req.params.id]
    );
    const updated = await db.get2('SELECT * FROM subjects WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete subject
router.delete('/:id', async (req, res) => {
  try {
    const subject = await db.get2(
      'SELECT * FROM subjects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    await db.run2('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
