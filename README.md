# 🎓 GradeTrack — Academic Grade Transparency System

A full-stack web application for tracking academic grades with authentication, categories, weighted scoring, risk indicators, and a target grade planner.

---

## 📁 Project Structure

```
grade-system/
├── backend/
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js          # Signup, login, /me endpoints
│   │   ├── subjects.js      # CRUD for subjects
│   │   └── grades.js        # CRUD for categories and scores
│   ├── database.js          # SQLite DB setup & schema
│   ├── server.js            # Express app entry point
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── SubjectModal.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Signup.js
│   │   │   ├── Dashboard.js
│   │   │   └── SubjectDetail.js
│   │   ├── utils/
│   │   │   └── api.js       # API calls + grade calculations
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
│
├── start.sh                 # One-command startup script
└── README.md
```

---

## ⚙️ Prerequisites

Make sure you have installed:
- **Node.js** v16+ → https://nodejs.org
- **npm** v8+

---

## 🚀 Setup & Run Instructions

### Option 1: Automatic (Recommended)

```bash
# From the grade-system/ directory:
chmod +x start.sh
./start.sh
```

This installs dependencies and starts both servers automatically.

---

### Option 2: Manual Setup

#### Step 1 — Install Backend Dependencies

```bash
cd grade-system/backend
npm install
```

#### Step 2 — Start the Backend Server

```bash
# Still inside backend/
npm start
# OR for auto-reload during development:
npm run dev
```

You should see:
```
🎓 Grade System Backend running on http://localhost:5000
📊 Database: grades.db
✅ Ready to accept connections
```

The SQLite database (`grades.db`) is created automatically on first run.

---

#### Step 3 — Install Frontend Dependencies

Open a **new terminal tab**:

```bash
cd grade-system/frontend
npm install
```

#### Step 4 — Start the Frontend

```bash
npm start
```

The app opens automatically at **http://localhost:3000**

---

## 🌐 URLs

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000      |
| Backend  | http://localhost:5000      |
| API Base | http://localhost:5000/api  |

---

## 🔐 Authentication

- **POST** `/api/auth/signup` — Register a new account
- **POST** `/api/auth/login` — Login and receive JWT
- **GET** `/api/auth/me` — Get current user (requires token)

Tokens are stored in `localStorage` and sent as `Authorization: Bearer <token>`.

---

## 📊 API Endpoints

### Subjects
| Method | Endpoint            | Description        |
|--------|---------------------|--------------------|
| GET    | /api/subjects       | List all subjects  |
| GET    | /api/subjects/:id   | Get subject detail |
| POST   | /api/subjects       | Create subject     |
| PUT    | /api/subjects/:id   | Update subject     |
| DELETE | /api/subjects/:id   | Delete subject     |

### Categories
| Method | Endpoint                           | Description       |
|--------|------------------------------------|-------------------|
| POST   | /api/subjects/:id/categories       | Add category      |
| PUT    | /api/categories/:id                | Update category   |
| DELETE | /api/categories/:id                | Delete category   |

### Scores
| Method | Endpoint                           | Description       |
|--------|------------------------------------|-------------------|
| POST   | /api/categories/:id/scores         | Add score         |
| PUT    | /api/scores/:id                    | Update score      |
| DELETE | /api/scores/:id                    | Delete score      |

---

## 🧮 Grade Calculation Formula

```
Category Average = (Σ scores obtained ÷ Σ total scores) × 100
Weighted Score   = Category Average × (weight ÷ 100)
Final Grade      = Σ all Weighted Scores
```

---

## ⚠️ Risk Indicators

| Grade     | Status             | Color  |
|-----------|--------------------|--------|
| ≥ 85%     | On Track           | 🟢 Green  |
| 75–84%    | Needs Improvement  | 🟡 Yellow |
| < 75%     | At Risk            | 🔴 Red    |

---

## 🗄️ Database Schema

SQLite database is auto-created at `backend/grades.db`.

```sql
-- Users
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subjects (per user)
CREATE TABLE subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  instructor_name TEXT,
  semester TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories (per subject)
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  category_weight REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scores (per category)
CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  score_obtained REAL NOT NULL,
  total_score REAL NOT NULL,
  label TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔒 Security Features

- Passwords hashed with **bcryptjs** (12 salt rounds)
- JWT tokens with 7-day expiry
- All routes protected by auth middleware
- Data isolation: users can only access their own data
- Input validation on all endpoints
- Foreign keys enforced in SQLite
- SQL injection prevented by parameterized queries

---

## 🎨 Tech Stack

| Layer     | Technology                    |
|-----------|-------------------------------|
| Frontend  | React 18, React Router v6     |
| Styling   | Inline styles + CSS variables |
| Backend   | Node.js, Express 4            |
| Database  | SQLite via better-sqlite3     |
| Auth      | bcryptjs + JSON Web Tokens    |
| Fonts     | Plus Jakarta Sans, DM Mono    |

---

## 🐛 Troubleshooting

**Port already in use?**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Database issues?**
```bash
# Delete and recreate the database
rm backend/grades.db
npm start  # in backend/
```

**Node version issues?**
```bash
node --version  # should be 16+
nvm use 18      # if using nvm
```
