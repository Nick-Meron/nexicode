# NEXICODE — Setup Guide

## Prerequisites (you already have these)
- Node.js, Python 3.12, PostgreSQL 18, Git, VS Code

---

## Step 1 — Create the database in PostgreSQL

Open pgAdmin (or psql) and run:
```sql
CREATE DATABASE nexicode;
```

---

## Step 2 — Backend setup

```bash
cd nexicode/backend

# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
copy .env.example .env      # Windows
cp .env.example .env        # Mac/Linux

# Edit .env — update DATABASE_URL with your postgres password
# and add your API keys when ready
```

Edit `.env`:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/nexicode
JWT_SECRET_KEY=any-long-random-string-here
OPENAI_API_KEY=sk-...         # get from platform.openai.com
ANTHROPIC_API_KEY=sk-ant-...  # get from console.anthropic.com
DEEPSEEK_API_KEY=...          # get from platform.deepseek.com
ACTIVE_MODEL=claude
```

Run the backend:
```bash
python app.py
# Should print: ✅ Database tables created
# Running on http://localhost:5000
```

---

## Step 3 — Frontend setup

Open a NEW terminal:
```bash
cd nexicode/frontend

# If this is a fresh folder, initialise with Vite first:
npm create vite@latest . -- --template react
# (select React, then JavaScript)

# Install dependencies
npm install
npm install axios react-router-dom recharts

# Replace the generated src/ files with the ones provided
# (they are already in src/ from this setup)

# Start the dev server
npm run dev
# Running on http://localhost:5173
```

---

## Step 4 — Test the full system

1. Open http://localhost:5173
2. Click **Register** → create a Tutor account
3. Go to **Courses** → create a course (e.g. "Data Structures", module code "CIS013-3")
4. Go to **Questions** → select your course → add a syllabus topic with learning outcomes and rubric
5. Select the topic → click **Generate question with AI** (requires API key in .env)
6. Register a second account as a **Student**
7. Log in as student → select the course → click a question → write code → **Submit for feedback**

---

## API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Register user |
| POST | /api/auth/login | — | Login, get token |
| GET  | /api/auth/me | JWT | Get current user |
| GET  | /api/courses/ | JWT | List courses |
| POST | /api/courses/ | JWT (tutor) | Create course |
| GET  | /api/courses/:id/topics | JWT | List topics |
| POST | /api/courses/:id/topics | JWT (tutor) | Create topic |
| POST | /api/questions/generate | JWT (tutor) | AI question generation |
| POST | /api/submissions/ | JWT | Submit code, get feedback |
| POST | /api/submissions/:id/compare | JWT | Compare all 3 AI models |
| GET  | /api/progress/student/:id | JWT | Get progress report |

---

## Project structure

```
nexicode/
├── backend/
│   ├── app.py                  ← Flask app factory
│   ├── models/__init__.py      ← All 9 database models
│   ├── routes/
│   │   ├── auth.py             ← Register, login, /me
│   │   ├── courses.py          ← Courses + syllabus topics
│   │   ├── questions.py        ← AI question generation
│   │   ├── submissions.py      ← Code submit + model compare
│   │   └── feedback.py         ← Feedback + progress reports
│   ├── services/
│   │   └── ai_service.py       ← GPT / Claude / DeepSeek calls
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── App.jsx             ← Router + PrivateRoute
        ├── api/index.js        ← All API calls (axios)
        ├── context/AuthContext.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── StudentDashboard.jsx
            └── TutorDashboard.jsx
```