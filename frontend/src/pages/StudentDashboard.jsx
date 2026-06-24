import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getCourses, getTopics, getTopicQuestions, submitCode, getProgress } from "../api";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]               = useState("questions");
  const [courses, setCourses]       = useState([]);
  const [selectedCourse, setSelectedCourse]     = useState(null);
  const [questions, setQuestions]   = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [code, setCode]             = useState("");
  const [feedback, setFeedback]     = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress]     = useState(null);

  useEffect(() => {
    getCourses().then((r) => setCourses(r.data));
    getProgress(user.id).then((r) => setProgress(r.data));
  }, [user.id]);

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

  const scoreColor = (score) => score >= 70 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={s.page}>

      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sideTop}>
          <div style={s.logo}><span style={s.logoIcon}>⬡</span> NEXICODE</div>
          <div style={s.userCard}>
            <div style={s.avatar}>{user.name[0].toUpperCase()}</div>
            <div>
              <p style={s.userName}>{user.name}</p>
              <p style={s.userRole}>Student</p>
            </div>
          </div>
          <nav style={s.nav}>
            {[
              { id: "questions", label: "📝  Questions" },
              { id: "progress",  label: "📊  My Progress" },
            ].map((t) => (
              <button
                key={t.id}
                style={tab === t.id ? s.navActive : s.navBtn}
                onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <button style={s.logoutBtn} onClick={logout}>Sign out</button>
      </aside>

      {/* Main */}
      <main style={s.main}>

        {/* ── Questions tab ── */}
        {tab === "questions" && (
          <div>
            <div style={s.pageHeader}>
              <h1 style={s.pageTitle}>Programming Questions</h1>
              <p style={s.pageSubtitle}>Select a course to view available questions</p>
            </div>

            {/* Course pills */}
            <div style={s.courseRow}>
              {courses.length === 0 && <p style={s.empty}>No courses available yet. Ask your tutor to create one.</p>}
              {courses.map((c) => (
                <button
                  key={c.id}
                  style={selectedCourse?.id === c.id ? s.coursePillActive : s.coursePill}
                  onClick={() => handleSelectCourse(c)}>
                  📘 {c.title}
                </button>
              ))}
            </div>

            {/* Two-column layout when question selected */}
            <div style={s.questionLayout}>

              {/* Question list */}
              {questions.length > 0 && (
                <div style={s.questionList}>
                  <h3 style={s.listTitle}>Questions ({questions.length})</h3>
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      style={selectedQuestion?.id === q.id ? s.qCardActive : s.qCard}
                      onClick={() => { setSelectedQuestion(q); setCode(""); setFeedback(null); }}>
                      <span style={s.qBadge}>{q.difficulty}</span>
                      <p style={s.qTopic}>{q.topic_title}</p>
                      <p style={s.qPreview}>{q.question_text.slice(0, 90)}…</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Editor panel */}
              {selectedQuestion && (
                <div style={s.editorPanel}>
                  <div style={s.questionCard}>
                    <h3 style={s.questionLabel}>Question</h3>
                    <p style={s.questionText}>{selectedQuestion.question_text}</p>
                  </div>

                  <div style={s.editorCard}>
                    <h3 style={s.editorLabel}>Your Code</h3>
                    <textarea
                      style={s.codeArea}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="# Write your Python code here..."
                      spellCheck={false}
                    />
                    <button
                      style={submitting ? s.submitBtnDisabled : s.submitBtn}
                      onClick={handleSubmit}
                      disabled={submitting || !code.trim()}>
                      {submitting ? "⏳ Analysing your code..." : "Submit for AI Feedback →"}
                    </button>
                  </div>

                  {/* Feedback */}
                  {feedback && (
                    <div style={s.feedbackCard}>
                      <div style={s.feedbackHeader}>
                        <h3 style={s.feedbackTitle}>AI Feedback</h3>
                        <div style={{ ...s.scoreBadge, background: scoreColor(feedback.score) }}>
                          {feedback.score ?? 0} / 100
                        </div>
                      </div>
                      <p style={s.modelTag}>Generated by: {feedback.ai_model_used}</p>
                      <pre style={s.feedbackText}>{feedback.feedback_text}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Progress tab ── */}
        {tab === "progress" && (
          <div>
            <div style={s.pageHeader}>
              <h1 style={s.pageTitle}>My Progress</h1>
              <p style={s.pageSubtitle}>Track your improvement over time</p>
            </div>

            {progress && (
              <>
                <div style={s.statsGrid}>
                  <StatCard icon="📬" label="Total Submissions" value={progress.report?.submissions_count ?? 0} />
                  <StatCard icon="⭐" label="Average Score" value={`${progress.report?.avg_score ?? 0}%`} blue />
                  <StatCard icon="💪" label="Strengths" value={progress.report?.strengths ?? "Complete more submissions"} small />
                  <StatCard icon="📈" label="Areas to Improve" value={progress.report?.weaknesses ?? "Complete more submissions"} small />
                </div>

                <div style={s.trendCard}>
                  <h3 style={s.trendTitle}>Score History</h3>
                  {progress.score_trend?.length > 0 ? (
                    <div style={s.barChart}>
                      {progress.score_trend.map((s_) => (
                        <div key={s_.index} style={s.barRow}>
                          <span style={s.barLabel}>#{s_.index}</span>
                          <div style={s.barTrack}>
                            <div style={{ ...s.barFill, width: `${s_.score}%`, background: scoreColor(s_.score) }} />
                          </div>
                          <span style={{ ...s.barScore, color: scoreColor(s_.score) }}>{s_.score}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={s.empty}>Submit some code to see your progress here.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

function StatCard({ icon, label, value, blue, small }) {
  return (
    <div style={{ ...sc.card, ...(blue ? { background: "#0EA5E9", color: "#fff" } : {}) }}>
      <span style={sc.icon}>{icon}</span>
      <p style={{ ...sc.label, ...(blue ? { color: "rgba(255,255,255,0.8)" } : {}) }}>{label}</p>
      <p style={{ ...sc.value, fontSize: small ? 14 : 28, ...(blue ? { color: "#fff" } : {}) }}>{value}</p>
    </div>
  );
}

const BLUE = "#0EA5E9";
const BLUE_LIGHT = "#E0F2FE";

const s = {
  page:             { display: "flex", minHeight: "100vh", background: "#f0f7ff", fontFamily: "inherit" },
  sidebar:          { width: 240, background: "#1a1a2e", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "1.5rem 1rem" },
  sideTop:          { display: "flex", flexDirection: "column", gap: 24 },
  logo:             { fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: 1, padding: "0 8px", display: "flex", alignItems: "center", gap: 8 },
  logoIcon:         { color: BLUE, fontSize: 20 },
  userCard:         { display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px" },
  avatar:           { width: 36, height: 36, borderRadius: "50%", background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 },
  userName:         { fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 },
  userRole:         { fontSize: 11, color: "#94a3b8", margin: 0, textTransform: "uppercase", letterSpacing: 0.5 },
  nav:              { display: "flex", flexDirection: "column", gap: 4 },
  navBtn:           { padding: "10px 14px", background: "transparent", border: "none", color: "#94a3b8", borderRadius: 8, textAlign: "left", fontSize: 14, fontWeight: 500 },
  navActive:        { padding: "10px 14px", background: "rgba(14,165,233,0.15)", border: "none", color: "#fff", borderRadius: 8, textAlign: "left", fontSize: 14, fontWeight: 600, borderLeft: `3px solid ${BLUE}` },
  logoutBtn:        { padding: "10px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", borderRadius: 8, fontSize: 13 },
  main:             { flex: 1, padding: "2rem 2.5rem", overflowY: "auto" },
  pageHeader:       { marginBottom: 28 },
  pageTitle:        { fontSize: 26, fontWeight: 800, color: "#1a1a2e", margin: 0 },
  pageSubtitle:     { fontSize: 14, color: "#64748b", margin: "4px 0 0" },
  courseRow:        { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 },
  coursePill:       { padding: "8px 18px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#475569" },
  coursePillActive: { padding: "8px 18px", background: BLUE, border: `1.5px solid ${BLUE}`, borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#fff" },
  questionLayout:   { display: "flex", gap: 20, alignItems: "flex-start" },
  questionList:     { width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 },
  listTitle:        { fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  qCard:            { background: "#fff", borderRadius: 10, padding: "12px 14px", cursor: "pointer", border: "1.5px solid #e2e8f0" },
  qCardActive:      { background: BLUE_LIGHT, borderRadius: 10, padding: "12px 14px", cursor: "pointer", border: `2px solid ${BLUE}` },
  qBadge:           { display: "inline-block", background: "#f1f5f9", color: "#64748b", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, textTransform: "uppercase", marginBottom: 4 },
  qTopic:           { fontSize: 12, color: BLUE, fontWeight: 600, margin: "4px 0" },
  qPreview:         { fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.5 },
  editorPanel:      { flex: 1, display: "flex", flexDirection: "column", gap: 16 },
  questionCard:     { background: "#fff", borderRadius: 12, padding: "1.25rem 1.5rem", border: "1.5px solid #e2e8f0" },
  questionLabel:    { fontSize: 12, fontWeight: 700, color: BLUE, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" },
  questionText:     { fontSize: 15, color: "#1a1a2e", lineHeight: 1.7, margin: 0 },
  editorCard:       { background: "#fff", borderRadius: 12, padding: "1.25rem 1.5rem", border: "1.5px solid #e2e8f0" },
  editorLabel:      { fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 10px" },
  codeArea:         { width: "100%", height: 220, fontFamily: "monospace", fontSize: 13, padding: "12px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#0f172a", color: "#e2e8f0", resize: "vertical", marginBottom: 12 },
  submitBtn:        { padding: "11px 24px", background: BLUE, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, boxShadow: "0 4px 12px rgba(14,165,233,0.3)" },
  submitBtnDisabled:{ padding: "11px 24px", background: "#94a3b8", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700 },
  feedbackCard:     { background: "#fff", borderRadius: 12, padding: "1.25rem 1.5rem", border: `1.5px solid ${BLUE}` },
  feedbackHeader:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  feedbackTitle:    { fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: 0 },
  scoreBadge:       { padding: "4px 14px", borderRadius: 20, color: "#fff", fontSize: 13, fontWeight: 700 },
  modelTag:         { fontSize: 11, color: "#94a3b8", margin: "0 0 12px" },
  feedbackText:     { fontSize: 13, lineHeight: 1.8, color: "#334155", whiteSpace: "pre-wrap", margin: 0 },
  statsGrid:        { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 },
  trendCard:        { background: "#fff", borderRadius: 12, padding: "1.5rem", border: "1.5px solid #e2e8f0" },
  trendTitle:       { fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 20 },
  barChart:         { display: "flex", flexDirection: "column", gap: 10 },
  barRow:           { display: "flex", alignItems: "center", gap: 12 },
  barLabel:         { width: 28, fontSize: 12, color: "#94a3b8" },
  barTrack:         { flex: 1, height: 10, background: "#f1f5f9", borderRadius: 5, overflow: "hidden" },
  barFill:          { height: "100%", borderRadius: 5, transition: "width 0.5s ease" },
  barScore:         { width: 28, fontSize: 13, fontWeight: 700, textAlign: "right" },
  empty:            { fontSize: 14, color: "#94a3b8", padding: "16px 0" },
};

const sc = {
  card:  { background: "#fff", borderRadius: 12, padding: "1.25rem", border: "1.5px solid #e2e8f0" },
  icon:  { fontSize: 24, display: "block", marginBottom: 8 },
  label: { fontSize: 12, color: "#64748b", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 28, fontWeight: 800, color: "#1a1a2e", margin: 0 },
};