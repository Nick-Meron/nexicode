NEXICODE — AI-Powered Syllabus-Aware Programming Education Support System
===========================================================================

Student: Bonitus Nicholas Meron Dias
Student ID: 2544876
Course: BSc (Hons) Software Engineering
Supervisor: Mr. Alfred Edwin


WHAT THIS PROJECT IS
---------------------
NEXICODE is a web-based system that lets tutors create courses and syllabus
topics, automatically generates curriculum-aligned programming questions
using AI, and marks student code submissions with structured, guided
feedback rather than a raw score. Three AI providers (Anthropic Claude,
OpenAI GPT, and DeepSeek) are supported, with DeepSeek V4 Flash used as the
production model based on a 100-answer blind evaluation described in the
thesis (Chapter 4).


FOLDER STRUCTURE
-----------------
backend/    Flask REST API, PostgreSQL models, AI integration services
frontend/   React 19 web application (Vite)

NOTE: the "node_modules" folder (inside frontend/) and the "venv" folder
(inside backend/) have been REMOVED from this submission to keep the file
size manageable. Both are regenerated automatically by following the setup
steps below — see "Excluded Folders" at the bottom of this file.


PREREQUISITES
--------------
- Python 3.12 or later
- Node.js 18 or later (with npm)
- PostgreSQL 16 or later, running locally
- API keys for at least one of: Anthropic Claude, OpenAI, DeepSeek
  (a free-tier key for any one provider is enough to run the system;
  DeepSeek is the default active model)


BACKEND SETUP
--------------
1. Open a terminal and navigate to the backend folder:
       cd backend

2. Create and activate a virtual environment:

   On Windows (PowerShell):
       python -m venv venv
       venv\Scripts\Activate.ps1

   On macOS/Linux:
       python3 -m venv venv
       source venv/bin/activate

3. Install all required Python packages:
       pip install -r requirements.txt --break-system-packages

   (drop --break-system-packages if not needed on your system)

4. Create a PostgreSQL database:
       psql -U postgres -c "CREATE DATABASE nexicode;"

5. Create a file named ".env" inside the backend folder with the
   following contents, replacing the API key placeholders with your own
   (the GOOGLE_CLIENT_ID below is not a secret and can be used as-is —
   Google Client IDs are meant to be public):

       DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/nexicode
       JWT_SECRET_KEY=any-random-secret-string-here

       OPENAI_API_KEY=your-openai-key-if-you-have-one
       ANTHROPIC_API_KEY=your-anthropic-key-if-you-have-one
       DEEPSEEK_API_KEY=your-deepseek-key-if-you-have-one

       # Which model to use for live feedback: gpt | claude | deepseek
       ACTIVE_MODEL=deepseek

       OPENAI_MODEL=gpt-5.6
       ANTHROPIC_MODEL=claude-sonnet-5
       DEEPSEEK_MODEL=deepseek-v4-flash

       FLASK_ENV=development
       FRONTEND_URL=http://localhost:5173

       GOOGLE_CLIENT_ID=674927393902-fe12uq9notojqsalpjqomdda7guhapc3.apps.googleusercontent.com

   ACTIVE_MODEL controls which AI provider is used for question generation
   and feedback. Only the API key matching ACTIVE_MODEL is strictly
   required to run the system; the other two can be left blank.

6. Start the backend server:
       python app.py

   The backend will run at http://localhost:5000 and will automatically
   create all required database tables on first startup.


FRONTEND SETUP
---------------
1. Open a SECOND terminal (keep the backend running in the first one) and
   navigate to the frontend folder:
       cd frontend

2. Install all required Node packages:
       npm install

3. Start the frontend development server:
       npm run dev

   The application will be available at http://localhost:5173


USING THE SYSTEM
------------------
1. Open http://localhost:5173 in a web browser.
2. Register a new account, choosing either "Tutor" or "Student".
3. As a Tutor: create a course, then add a syllabus topic by entering its
   title and a short description of what was taught, choose a difficulty,
   and click "Add Topic & Generate Question" — this creates the topic and
   generates a real AI question for it in a single step.
4. As a Student: join the course using its module code, open the
   generated question, submit a code answer, and view the AI-generated
   structured feedback (four labelled sections) and score.
5. The Progress tab (Student) shows performance grouped by topic and
   whether recent scores are improving, declining, or steady.


RUNNING THE AUTOMATED TEST SUITE
-----------------------------------
From inside the backend folder, with the virtual environment activated:
       python -m pytest tests/ -v

This runs 20 automated tests covering registration, login, and the
non-AI code-quality scoring component, using an in-memory test database
that does not affect your real PostgreSQL data.


EXCLUDED FOLDERS (why they're missing and how to get them back)
-------------------------------------------------------------------
To stay within the submission size limit, the following folders were
deleted before zipping this artefact, since both are automatically
regenerated by the setup steps above and do not need to be submitted:

  - frontend/node_modules/   → regenerated by running "npm install"
  - backend/venv/            → regenerated by following Backend Setup
                                 steps 2–3 above

Neither folder contains any project source code — both are third-party
dependencies that would make this submission far larger than necessary
without adding anything that isn't already recreatable from
requirements.txt and package.json.


PROJECT REPOSITORY
---------------------
The full version-controlled history of this project, including every
commit made during development and testing, is available at:

    https://github.com/Nick-Meron/nexicode.git


API ENDPOINTS REFERENCE
---------------------------
| Method | Endpoint                              | Auth          | Description                          |
|--------|----------------------------------------|---------------|--------------------------------------|
| POST   | /api/auth/register                     | -             | Register a new account               |
| POST   | /api/auth/login                        | -             | Log in, receive a JWT token          |
| POST   | /api/auth/google                       | -             | Sign in / register via Google        |
| GET    | /api/auth/me                           | JWT           | Get the current logged-in user       |
| PUT    | /api/auth/change-password              | JWT           | Change the current user's password   |
| DELETE | /api/auth/account                      | JWT           | Permanently delete your own account  |
| GET    | /api/courses/                          | JWT           | List courses (role-scoped)           |
| POST   | /api/courses/                          | JWT (tutor)   | Create a course                      |
| POST   | /api/courses/join                      | JWT (student) | Join a course by module code         |
| PUT    | /api/courses/:id                       | JWT (tutor)   | Update a course                      |
| DELETE | /api/courses/:id                       | JWT (tutor)   | Delete a course (cascades fully)     |
| GET    | /api/courses/:id/topics                | JWT           | List syllabus topics for a course    |
| POST   | /api/courses/:id/topics                | JWT (tutor)   | Add a syllabus topic                 |
| PUT    | /api/courses/:id/topics/:topicId       | JWT (tutor)   | Update a syllabus topic              |
| GET    | /api/courses/:id/students               | JWT (tutor)   | List enrolled students               |
| DELETE | /api/courses/:id/enroll                | JWT           | Leave / remove an enrolment          |
| POST   | /api/questions/generate                | JWT (tutor)   | AI-generate a question for a topic   |
| GET    | /api/questions/topic/:topicId          | JWT           | List questions for a topic           |
| GET    | /api/questions/:id                     | JWT           | Get a single question                |
| DELETE | /api/questions/:id                     | JWT (tutor)   | Delete a question (cascades fully)   |
| POST   | /api/submissions/                      | JWT (student) | Submit code, receive AI feedback     |
| POST   | /api/submissions/:id/compare           | JWT           | Compare all 3 AI models on a submission (owner/tutor only) |
| GET    | /api/submissions/student/:id           | JWT           | List a student's submission history  |
| GET    | /api/feedback/submission/:id           | JWT           | Get feedback for a submission        |
| GET    | /api/progress/student/:id              | JWT           | Get a student's progress report      |


PROJECT STRUCTURE
---------------------
nexicode/
|-- backend/
|   |-- app.py                    (Flask application factory)
|   |-- models/__init__.py        (11 database models)
|   |-- routes/
|   |   |-- auth.py               (register, login, Google sign-in, password/account management)
|   |   |-- courses.py            (courses, syllabus topics, enrolment)
|   |   |-- questions.py          (AI question generation)
|   |   |-- submissions.py        (code submission, model comparison)
|   |   `-- feedback.py           (feedback retrieval, progress reports)
|   |-- services/
|   |   |-- ai_service.py         (Claude / GPT / DeepSeek integration)
|   |   `-- code_quality_scorer.py (non-AI code quality scoring)
|   |-- tests/                    (20 automated pytest tests)
|   |-- requirements.txt
|   `-- .env.example
`-- frontend/
    `-- src/
        |-- App.jsx                (routing + role-based access guards)
        |-- api/index.js           (all API calls)
        |-- context/AuthContext.jsx
        |-- utils/                 (courseTheme.js, parseFeedback.jsx)
        `-- pages/
            |-- LoginPage.jsx
            |-- RegisterPage.jsx
            |-- StudentDashboard.jsx
            `-- TutorDashboard.jsx