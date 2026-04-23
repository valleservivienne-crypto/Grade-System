const express = require('express');
const { get2, all2, run2 } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all subjects for user
router.get('/', async (req, res) => {
  try {
    const subjects = await all2(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM categories WHERE subject_id = s.id) as category_count
      FROM subjects s 
      WHERE s.user_id = $1 
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
    const subject = await get2(
      'SELECT * FROM subjects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const categories = await all2(
      'SELECT * FROM categories WHERE subject_id = $1 ORDER BY created_at ASC',
      [subject.id]
    );

    const categoriesWithScores = await Promise.all(categories.map(async cat => {
      const scores = await all2(
        'SELECT * FROM scores WHERE category_id = $1 ORDER BY created_at ASC',
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
    const result = await run2(
      'INSERT INTO subjects (user_id, subject_name, instructor_name, semester) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.user.id, subject_name.trim(), instructor_name || '', semester || '']
    );
    const subject = await get2('SELECT * FROM subjects WHERE id = $1', [result.lastInsertRowid]);
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update subject
router.put('/:id', async (req, res) => {
  try {
    const subject = await get2(
      'SELECT * FROM subjects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const { subject_name, instructor_name, semester } = req.body;
    if (!subject_name || !subject_name.trim())
      return res.status(400).json({ error: 'Subject name is required' });

    await run2(
      'UPDATE subjects SET subject_name = $1, instructor_name = $2, semester = $3 WHERE id = $4',
      [subject_name.trim(), instructor_name || '', semester || '', req.params.id]
    );
    const updated = await get2('SELECT * FROM subjects WHERE id = $1', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete subject
router.delete('/:id', async (req, res) => {
  try {
    const subject = await get2(
      'SELECT * FROM subjects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    await run2('DELETE FROM subjects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
