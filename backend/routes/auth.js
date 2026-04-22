const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  if (!email || !password || !confirmPassword)
    return res.status(400).json({ error: 'All fields are required' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ error: 'Invalid email format' });

  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  if (password !== confirmPassword)
    return res.status(400).json({ error: 'Passwords do not match' });

  try {
    const existingUser = await db.get2('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser)
      return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const result = await db.run2(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email.toLowerCase(), password_hash]
    );

    const token = jwt.sign(
      { id: result.lastInsertRowid, email: email.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: result.lastInsertRowid, email: email.toLowerCase() }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  try {
    const user = await db.get2('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get current user
router.get('/me', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const user = await db.get2('SELECT id, email, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
