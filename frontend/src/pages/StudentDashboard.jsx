import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { courseTheme } from "../utils/courseTheme";
import { parseFeedback, renderInlineBold } from "../utils/parseFeedback";
import { getCourses, joinCourse, getTopics, getTopicQuestions, submitCode, getProgress, leaveCourse, changePassword, deleteAccount } from "../api";
import "../styles/dashboard.css";
import {
  HexIcon, CodeIcon, ChartIcon, BookIcon, ArrowRightIcon, LogoutIcon, SettingsIcon,
  TargetIcon,
  SchoolIcon, LayersIcon, SearchIcon, ClipboardIcon, TrendIcon, TrashIcon,
} from "../components/Icons";

function ProgressRing({ score, size = 140, strokeWidth = 12, color }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(10, score ?? 0));
  const offset = circumference * (1 - clamped / 10);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef1f8" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size * 0.26, fontWeight: 800, color, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{clamped}</span>
        <span style={{ fontSize: Math.max(size * 0.09, 9), color: "var(--text-mute)", fontWeight: 600, marginTop: 2 }}>/ 10</span>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]               = useState("questions");
  const [courses, setCourses]       = useState([]);
  const [topicCounts, setTopicCounts] = useState({});
  const [joinCode, setJoinCode]     = useState("");
  const [joining, setJoining]       = useState(false);
  const [joinError, setJoinError]   = useState("");
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
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");

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

  const handleJoinCourse = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError("");
    try {
      await joinCourse(joinCode.trim());
      const r = await getCourses();
      setCourses(r.data);
      loadTopicCounts(r.data);
      setJoinCode("");
    } catch (err) {
      setJoinError(err.response?.data?.error || "Couldn't join that course");
    } finally {
      setJoining(false);
    }
  };

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

  const handleDeleteAccount = async () => {
    setDeleteAccountError("");
    setDeletingAccount(true);
    try {
      await deleteAccount(deleteAccountPassword);
      logout(); // clears the token; PrivateRoute redirects to /login automatically
    } catch (err) {
      setDeleteAccountError(err.response?.data?.error || "Could not delete account");
      setDeletingAccount(false);
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

            {/* Join a course by module code — replaces browsing a full
                catalog now that the backend only returns courses the
                student is actually enrolled in. */}
            <form className="nx-card" onSubmit={handleJoinCourse}
                  style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, padding: 16 }}>
              <input
                className="nx-input"
                style={{ flex: 1 }}
                placeholder="Enter a module code to join a course (e.g. CIS101)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <button className="nx-btn" type="submit" disabled={joining || !joinCode.trim()}>
                {joining ? "Joining…" : "Join Course"}
              </button>
            </form>
            {joinError && <p style={{ color: "var(--red)", fontSize: 13, marginTop: -12, marginBottom: 16 }}>{joinError}</p>}

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
                      className={`nx-course-card nx-course-theme-${courseTheme(c)} ${selectedCourse?.id === c.id ? "active" : ""}`}
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
                          placeholder="// Write your JavaScript code here..."
                          spellCheck={false}
                        />
                        <button className="nx-btn" onClick={handleSubmit} disabled={submitting || !code.trim()}>
                          {submitting ? "Analysing your code…" : <>Submit for AI Feedback <ArrowRightIcon width="14" height="14" /></>}
                        </button>
                      </div>

                      {feedback && (() => {
                        const { sections, summary } = parseFeedback(feedback.feedback_text);
                        const sectionIcons = [TargetIcon, CodeIcon, SchoolIcon, TrendIcon];
                        return (
                          <div className="nx-card nx-feedback-card">
                            <div className="nx-feedback-header">
                              <div>
                                <h3 className="nx-card-title" style={{ margin: 0 }}>AI Feedback</h3>
                                <p className="nx-model-tag" style={{ margin: "4px 0 0" }}>Generated by: {feedback.ai_model_used}</p>
                              </div>
                              <div className="nx-score-circle" style={{ borderColor: scoreColor(feedback.score) }}>
                                <span className="nx-score-circle-num" style={{ color: scoreColor(feedback.score) }}>
                                  {feedback.score ?? 0}
                                </span>
                                <span className="nx-score-circle-den">/ 10</span>
                              </div>
                            </div>

                            <div className="nx-feedback-sections">
                              {sections.map((s, i) => {
                                const Icon = sectionIcons[i] || TargetIcon;
                                return (
                                  <div className="nx-feedback-section" key={i}>
                                    <div className="nx-feedback-section-title">
                                      <Icon width="15" height="15" /> {s.title}
                                    </div>
                                    <p className="nx-feedback-section-body">{s.body}</p>
                                  </div>
                                );
                              })}
                            </div>

                            {summary && (
                              <div className="nx-feedback-summary">
                                {summary.split("\n").map((line, i) => (
                                  <p key={i} style={{ margin: i === 0 ? "0 0 6px" : 0 }}>
                                    {renderInlineBold(line)}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
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
                {progress.trend && progress.trend.direction !== "not_enough_data" && (
                  <div className={`nx-trend-banner nx-trend-${progress.trend.direction}`}>
                    {progress.trend.direction === "up" && <TrendIcon width="16" height="16" />}
                    {progress.trend.label}
                  </div>
                )}

                <div className="nx-hero-row">
                  <div className="nx-card nx-hero-ring-card">
                    <ProgressRing score={progress.report?.avg_score ?? 0} size={140} strokeWidth={14} color={scoreColor(progress.report?.avg_score ?? 0)} />
                    <p className="nx-hero-ring-label">Average Score</p>
                  </div>
                  <div className="nx-stats-grid nx-stats-grid-compact">
                    <StatCard icon={<ClipboardIcon width="18" height="18" />} label="Total Submissions" value={progress.report?.submissions_count ?? 0} />
                    <StatCard icon={<TrendIcon width="18" height="18" />} label="Strengths" value={progress.report?.strengths ?? "Complete more submissions"} small />
                    <StatCard icon={<ChartIcon width="18" height="18" />} label="Areas to Improve" value={progress.report?.weaknesses ?? "Complete more submissions"} small />
                  </div>
                </div>

                {progress.topic_breakdown?.length > 0 && (
                  <div className="nx-card nx-trend-card" style={{ marginBottom: 20 }}>
                    <h3 className="nx-card-title">By Topic</h3>
                    <div className="nx-topic-ring-row">
                      {progress.topic_breakdown.map((t) => (
                        <div key={t.topic} className="nx-topic-ring-item">
                          <ProgressRing score={t.avg_score} size={72} strokeWidth={7} color={scoreColor(t.avg_score)} />
                          <p className="nx-topic-ring-label" title={t.topic}>{t.topic}</p>
                          <p className="nx-topic-ring-count">{t.count} submission{t.count !== 1 ? "s" : ""}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="nx-card nx-trend-card">
                  <h3 className="nx-card-title">Score History</h3>
                  {progress.score_trend?.length > 0 ? (
                    <div>
                      {progress.score_trend.map((s_) => (
                        <div key={s_.index} className="nx-bar-row">
                          <span className="nx-bar-label" title={s_.topic}>#{s_.index}</span>
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

            <div className="nx-card" style={{ maxWidth: 400, marginTop: 20, borderColor: "var(--red-light)" }}>
              <h3 className="nx-card-title" style={{ color: "var(--red)" }}>Danger Zone</h3>
              <p style={{ fontSize: 13, color: "var(--text-mute)", margin: "8px 0 14px" }}>
                Permanently delete your account and all of your submissions, feedback, and progress history. This cannot be undone.
              </p>
              <button
                className="nx-btn"
                style={{ background: "var(--red)", color: "#fff" }}
                onClick={() => setShowDeleteAccount(true)}>
                Delete My Account
              </button>
            </div>
          </div>
        )}

      </main>

      {showDeleteAccount && (
        <div className="nx-modal-overlay" onClick={() => !deletingAccount && setShowDeleteAccount(false)}>
          <div className="nx-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="nx-modal-icon"><TrashIcon width="22" height="22" /></div>
            <h3 className="nx-modal-title">Delete your account?</h3>
            <p className="nx-modal-body">
              This permanently deletes your account, all your code submissions, feedback, and progress history. This cannot be undone.
            </p>
            <input
              className="nx-input"
              type="password"
              placeholder="Enter your password to confirm"
              value={deleteAccountPassword}
              onChange={(e) => setDeleteAccountPassword(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            {deleteAccountError && (
              <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{deleteAccountError}</p>
            )}
            <div className="nx-modal-actions">
              <button
                className="nx-btn nx-btn-ghost"
                onClick={() => { setShowDeleteAccount(false); setDeleteAccountPassword(""); setDeleteAccountError(""); }}
                disabled={deletingAccount}>
                Cancel
              </button>
              <button
                className="nx-btn"
                style={{ background: "var(--red)", color: "#fff" }}
                onClick={handleDeleteAccount}
                disabled={deletingAccount || !deleteAccountPassword}>
                {deletingAccount ? "Deleting…" : "Delete My Account"}
              </button>
            </div>
          </div>
        </div>
      )}
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