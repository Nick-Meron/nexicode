import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getCourses, getTopics, getTopicQuestions, submitCode, getProgress, leaveCourse, changePassword } from "../api";
import "../styles/dashboard.css";
import {
  HexIcon, CodeIcon, ChartIcon, BookIcon, ArrowRightIcon, LogoutIcon, SettingsIcon,
  SchoolIcon, LayersIcon, SearchIcon, ClipboardIcon, TrophyIcon, TrendIcon,
} from "../components/Icons";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]               = useState("questions");
  const [courses, setCourses]       = useState([]);
  const [topicCounts, setTopicCounts] = useState({});
  const [selectedCourse, setSelectedCourse]     = useState(null);
  const [questions, setQuestions]   = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [code, setCode]             = useState("");
  const [feedback, setFeedback]     = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress]     = useState(null);
  const [courseSearch, setCourseSearch] = useState("");
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "" });
  const [pwMessage, setPwMessage] = useState(null);

  const loadTopicCounts = async (courseList) => {
  const entries = await Promise.all(
    courseList.map(async (c) => {
      try {
        const r = await getTopics(c.id);
        return [c.id, r.data.length];
      } catch {
        return [c.id, 0];
      }
    })
  );
  setTopicCounts(Object.fromEntries(entries));
};

useEffect(() => {
  getCourses().then((r) => {
    setCourses(r.data);
    loadTopicCounts(r.data);
  });
  getProgress(user.id).then((r) => setProgress(r.data));
}, [user.id]);

  const handleLeaveCourse = async (e, courseId) => {
    e.stopPropagation();
    if (!window.confirm("Leave this course? Your past submissions will be kept, but you'll need to submit again to rejoin.")) return;
    try {
      await leaveCourse(courseId);
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
        setQuestions([]);
      }
    } catch (err) {
      window.alert(err.response?.data?.error || "You're not enrolled in this course yet.");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage(null);
    try {
      await changePassword(pwForm);
      setPwMessage({ type: "success", text: "Password updated successfully." });
      setPwForm({ current_password: "", new_password: "" });
    } catch (err) {
      setPwMessage({ type: "error", text: err.response?.data?.error || "Could not update password." });
    }
  };

  const handleSelectCourse = async (course) => {
    setSelectedCourse(course);
    setQuestions([]);
    setSelectedQuestion(null);
    setFeedback(null);
    const topicRes = await getTopics(course.id);
    const allQ = [];
    for (const topic of topicRes.data) {
      const qRes = await getTopicQuestions(topic.id);
      allQ.push(...qRes.data.map((q) => ({ ...q, topic_title: topic.topic_title })));
    }
    setQuestions(allQ);
  };

  const handleSubmit = async () => {
    if (!selectedQuestion || !code.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await submitCode({ question_id: selectedQuestion.id, code_submitted: code });
      setFeedback(res.data.feedback);
      const prog = await getProgress(user.id);
      setProgress(prog.data);
    } catch (err) {
      alert("Submission failed: " + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const scoreColor = (score) => (score >= 7 ? "#15803d" : score >= 5 ? "#b45309" : "#b91c1c");
  const diffBadge = (d) => `nx-badge nx-badge-${["easy", "medium", "hard"].includes(d) ? d : "neutral"}`;

  const filteredCourses = courses.filter((c) =>
    (c.title + " " + c.module_code).toLowerCase().includes(courseSearch.toLowerCase())
  );

  return (
    <div className="nx-page">

      {/* Sidebar */}
      <aside className="nx-sidebar">
        <div className="nx-side-top">
          <div className="nx-logo">
            <span className="nx-logo-mark"><HexIcon /></span> NEXICODE
          </div>
          <div className="nx-user-card">
            <div className="nx-avatar">{user.name[0].toUpperCase()}</div>
            <div>
              <p className="nx-user-name">{user.name}</p>
              <p className="nx-user-role">Student</p>
            </div>
          </div>
          <nav className="nx-nav">
            <button className={`nx-nav-btn ${tab === "questions" ? "active" : ""}`} onClick={() => setTab("questions")}>
              <CodeIcon /> Questions
            </button>
            <button className={`nx-nav-btn ${tab === "progress" ? "active" : ""}`} onClick={() => setTab("progress")}>
              <ChartIcon /> My Progress
            </button>
          </nav>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button className="nx-logout-btn" onClick={() => setTab("account")}><SettingsIcon /> Account</button>
          <button className="nx-logout-btn" onClick={logout}><LogoutIcon /> Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main className="nx-main">

        {/* ── Questions tab ── */}
        {tab === "questions" && (
          <div className="nx-fade nx-content">
            <div className="nx-header">
              <div>
                <p className="nx-eyebrow"><BookIcon width="13" height="13" /> Learning</p>
                <h1 className="nx-title">Programming Questions</h1>
                <p className="nx-subtitle">Pick a course, then choose a question to practise.</p>
              </div>
              <div className="nx-topbar-search">
                <SearchIcon />
                <input
                  className="nx-input"
                  placeholder="Search courses..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Course cards */}
            {courses.length === 0 ? (
              <div className="nx-empty-state">
                <div className="nx-empty-icon"><SchoolIcon width="26" height="26" /></div>
                <p className="nx-empty-text">No courses available yet. Ask your tutor to create one.</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <p className="nx-empty-inline">No courses match "{courseSearch}".</p>
            ) : (
              <div className="nx-course-grid" style={{ marginBottom: 30 }}>
                {filteredCourses.map((c) => {
                  const lessons = topicCounts[c.id] ?? 0;
                  return (
                    <div
                      key={c.id}
                      className={`nx-course-card ${selectedCourse?.id === c.id ? "active" : ""}`}
                      onClick={() => handleSelectCourse(c)}>
                      <div className="nx-course-top">
                        <span className="nx-course-icon"><BookIcon width="20" height="20" /></span>
                        <span className="nx-module-code">{c.module_code}</span>
                      </div>
                      <p className="nx-course-title">{c.title}</p>
                      <p className="nx-course-meta">
                        {lessons} {lessons === 1 ? "lesson" : "lessons"} available
                      </p>
                      <div className="nx-course-bottom" style={{ marginTop: 16 }}>
                        <button className="nx-btn nx-btn-ghost nx-btn-sm" onClick={() => handleSelectCourse(c)}>
                          {selectedCourse?.id === c.id ? "Selected" : "View questions"} <ArrowRightIcon width="12" height="12" />
                        </button>
                        <button className="nx-btn nx-btn-ghost nx-btn-sm" onClick={(e) => handleLeaveCourse(e, c.id)}>
                          Leave
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Two-column layout when a course is selected */}
            {selectedCourse && (
              <div className="nx-split">

                {/* Question list */}
                <div style={{ width: 320, flexShrink: 0 }}>
                  <p className="nx-list-label">Questions ({questions.length}) · {selectedCourse.title}</p>
                  {questions.length === 0 ? (
                    <p className="nx-empty-inline">No questions published for this course yet.</p>
                  ) : (
                    <div className="nx-qtile-list">
                      {questions.map((q) => (
                        <div
                          key={q.id}
                          className={`nx-qtile ${selectedQuestion?.id === q.id ? "active" : ""}`}
                          onClick={() => { setSelectedQuestion(q); setCode(""); setFeedback(null); }}>
                          <span className={diffBadge(q.difficulty)}>{q.difficulty}</span>
                          <p className="nx-qtile-topic">{q.topic_title}</p>
                          <p className="nx-qtile-preview">{q.question_text.slice(0, 90)}…</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Editor panel */}
                <div className="nx-editor-panel">
                  {!selectedQuestion ? (
                    <div className="nx-empty-state">
                      <div className="nx-empty-icon"><LayersIcon width="26" height="26" /></div>
                      <p className="nx-empty-text">Select a question on the left to start coding.</p>
                    </div>
                  ) : (
                    <>
                      <div className="nx-card">
                        <h3 className="nx-card-title"><ClipboardIcon width="15" height="15" /> Question</h3>
                        <p className="nx-q-text">{selectedQuestion.question_text}</p>
                      </div>

                      <div className="nx-card">
                        <h3 className="nx-card-title"><CodeIcon width="15" height="15" /> Your Code</h3>
                        <textarea
                          className="nx-code-area"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          placeholder="# Write your Python code here..."
                          spellCheck={false}
                        />
                        <button className="nx-btn" onClick={handleSubmit} disabled={submitting || !code.trim()}>
                          {submitting ? "Analysing your code…" : <>Submit for AI Feedback <ArrowRightIcon width="14" height="14" /></>}
                        </button>
                      </div>

                      {feedback && (
                        <div className="nx-card nx-feedback-card">
                          <div className="nx-feedback-header">
                            <h3 className="nx-card-title" style={{ margin: 0 }}>AI Feedback</h3>
                            <div className="nx-score-badge" style={{ background: scoreColor(feedback.score) }}>
                              {feedback.score ?? 0} / 10
                            </div>
                          </div>
                          <p className="nx-model-tag">Generated by: {feedback.ai_model_used}</p>
                          <pre className="nx-feedback-text">{feedback.feedback_text}</pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Progress tab ── */}
        {tab === "progress" && (
          <div className="nx-fade nx-content">
            <div className="nx-header">
              <div>
                <p className="nx-eyebrow"><ChartIcon width="13" height="13" /> Insights</p>
                <h1 className="nx-title">My Progress</h1>
                <p className="nx-subtitle">Track your improvement over time.</p>
              </div>
            </div>

            {progress && (
              <>
                <div className="nx-stats-grid">
                  <StatCard icon={<ClipboardIcon width="18" height="18" />} label="Total Submissions" value={progress.report?.submissions_count ?? 0} />
                  <StatCard icon={<TrophyIcon width="18" height="18" />} label="Average Score" value={`${progress.report?.avg_score ?? 0} / 10`} accent />
                  <StatCard icon={<TrendIcon width="18" height="18" />} label="Strengths" value={progress.report?.strengths ?? "Complete more submissions"} small />
                  <StatCard icon={<ChartIcon width="18" height="18" />} label="Areas to Improve" value={progress.report?.weaknesses ?? "Complete more submissions"} small />
                </div>

                <div className="nx-card nx-trend-card">
                  <h3 className="nx-card-title">Score History</h3>
                  {progress.score_trend?.length > 0 ? (
                    <div>
                      {progress.score_trend.map((s_) => (
                        <div key={s_.index} className="nx-bar-row">
                          <span className="nx-bar-label">#{s_.index}</span>
                          <div className="nx-bar-track">
                            <div className="nx-bar-fill" style={{ width: `${s_.score * 10}%`, background: scoreColor(s_.score) }} />
                          </div>
                          <span className="nx-bar-score" style={{ color: scoreColor(s_.score) }}>{s_.score}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="nx-empty-inline">Submit some code to see your progress here.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "account" && (
          <div className="nx-fade nx-content">
            <div className="nx-header">
              <div>
                <p className="nx-eyebrow">Settings</p>
                <h1 className="nx-title">Account</h1>
                <p className="nx-subtitle">Update your password.</p>
              </div>
            </div>

            <div className="nx-card" style={{ maxWidth: 400 }}>
              <h3 className="nx-card-title">Change Password</h3>
              <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                <input
                  className="nx-input"
                  type="password"
                  placeholder="Current password"
                  value={pwForm.current_password}
                  onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                  required />
                <input
                  className="nx-input"
                  type="password"
                  placeholder="New password (min 6 characters)"
                  value={pwForm.new_password}
                  onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                  required />
                {pwMessage && (
                  <p style={{ color: pwMessage.type === "success" ? "green" : "crimson", fontSize: 13 }}>
                    {pwMessage.text}
                  </p>
                )}
                <button className="nx-btn" type="submit">Update Password</button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function StatCard({ icon, label, value, accent, small }) {
  return (
    <div className={`nx-stat-card ${accent ? "accent" : ""}`}>
      <div className="nx-stat-icon">{icon}</div>
      <p className="nx-stat-label">{label}</p>
      <p className={`nx-stat-value ${small ? "small" : ""}`}>{value}</p>
    </div>
  );
}