const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_name TEXT NOT NULL,
        instructor_name TEXT,
        semester TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        category_name TEXT NOT NULL,
        category_weight REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        score_obtained REAL NOT NULL,
        total_score REAL NOT NULL,
        label TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        total_classes INTEGER NOT NULL DEFAULT 0,
        mode TEXT NOT NULL DEFAULT 'unset',
        attendance_weight REAL NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Add columns if they don't exist (for existing databases)
    await client.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'unset'`);
    await client.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS attendance_weight REAL NOT NULL DEFAULT 0`);

    // Feature 3: date_taken field on scores
    await client.query(`ALTER TABLE scores ADD COLUMN IF NOT EXISTS date_taken DATE`);

    // Feature 1: grade snapshots for history chart
    await client.query(`
      CREATE TABLE IF NOT EXISTS grade_snapshots (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        grade REAL NOT NULL,
        label TEXT,
        snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Feature 5: user settings (grade thresholds)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        on_track_threshold REAL NOT NULL DEFAULT 85,
        needs_improvement_threshold REAL NOT NULL DEFAULT 75,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id SERIAL PRIMARY KEY,
        attendance_id INTEGER NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
        label TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Database tables ready');
  } finally {
    client.release();
  }
};

initDB().catch(console.error);

const get2 = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
};

const all2 = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows;
};

const run2 = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return {
    lastInsertRowid: result.rows[0]?.id || null,
    changes: result.rowCount
  };
};

module.exports = { pool, get2, all2, run2 };
