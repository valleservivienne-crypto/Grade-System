const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://strong-bienenstitch-b63bfa.netlify.app', 'https://gradetracknirodz.netlify.app', 'https://gradetrackernirodz.netlify.app'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api', require('./routes/grades'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🎓 Grade System Backend running on http://localhost:${PORT}`);
  console.log(`📊 Database: grades.db`);
  console.log(`✅ Ready to accept connections\n`);
});
