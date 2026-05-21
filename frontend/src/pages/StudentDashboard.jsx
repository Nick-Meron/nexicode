import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getCourses, getTopics, getTopicQuestions, submitCode, getFeedback, getProgress } from "../api";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]           = useState("questions");  // questions | progress
  const [courses, setCourses]   = useState([]);
  const [topics, setTopics]     = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [code, setCode]         = useState("");
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(null);

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
    setTopics(topicRes.data);
    const allQuestions = [];
    for (const topic of topicRes.data) {
      const qRes = await getTopicQuestions(topic.id);
      allQuestions.push(...qRes.data.map((q) => ({ ...q, topic_title: topic.topic_title })));
    }
    setQuestions(allQuestions);
  };

  const handleSubmit = async () => {
    if (!selectedQuestion || !code.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await submitCode({ question_id: selectedQuestion.id, code_submitted: code });
      setFeedback(res.data.feedback);
      // Refresh progress
      const prog = await getProgress(user.id);
      setProgress(prog.data);
    } catch (err) {
      alert("Submission failed: " + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>NEXICODE</div>
        <p style={styles.userInfo}>{user.name}<br/><span style={styles.role}>Student</span></p>
        <nav>
          <button style={tab === "questions" ? styles.navActive : styles.navBtn} onClick={() => setTab("questions")}>Questions</button>
          <button style={tab === "progress"  ? styles.navActive : styles.navBtn} onClick={() => setTab("progress")}>My Progress</button>
        </nav>
        <button style={styles.logoutBtn} onClick={logout}>Sign out</button>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        {tab === "questions" && (
          <div>
            <h2 style={styles.heading}>Programming Questions</h2>

            {/* Course selector */}
            <div style={styles.courseRow}>
              {courses.map((c) => (
                <button key={c.id}
                  style={selectedCourse?.id === c.id ? styles.courseActive : styles.courseBtn}
                  onClick={() => handleSelectCourse(c)}>
                  {c.title}
                </button>
              ))}
            </div>

            {/* Question list */}
            {questions.length > 0 && (
              <div style={styles.questionList}>
                {questions.map((q) => (
                  <div key={q.id}
                    style={selectedQuestion?.id === q.id ? styles.qCardActive : styles.qCard}
                    onClick={() => { setSelectedQuestion(q); setCode(""); setFeedback(null); }}>
                    <p style={styles.qTopic}>{q.topic_title} · {q.difficulty}</p>
                    <p style={styles.qText}>{q.question_text.slice(0, 120)}…</p>
                  </div>
                ))}
              </div>
            )}

            {/* Code editor + submit */}
            {selectedQuestion && (
              <div style={styles.editorSection}>
                <h3 style={styles.subheading}>Question</h3>
                <p style={styles.questionFull}>{selectedQuestion.question_text}</p>

                <h3 style={styles.subheading}>Your answer (code)</h3>
                <textarea
                  style={styles.codeArea}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="# Write your Python code here..."
                  spellCheck={false}
                />
                <button style={styles.submitBtn} onClick={handleSubmit} disabled={submitting || !code.trim()}>
                  {submitting ? "Analysing..." : "Submit for feedback"}
                </button>

                {feedback && (
                  <div style={styles.feedbackBox}>
                    <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>AI Feedback</h3>
                    <div style={styles.scoreChip}>Score: {feedback.score ?? "—"} / 100</div>
                    <pre style={styles.feedbackText}>{feedback.feedback_text}</pre>
                    <p style={styles.modelLabel}>Generated by: {feedback.ai_model_used}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "progress" && progress && (
          <div>
            <h2 style={styles.heading}>My Progress</h2>
            <div style={styles.statsRow}>
              <StatCard label="Submissions" value={progress.report?.submissions_count ?? 0} />
              <StatCard label="Average score" value={(progress.report?.avg_score ?? 0) + "%"} />
              <StatCard label="Strengths" value={progress.report?.strengths ?? "—"} small />
              <StatCard label="Areas to improve" value={progress.report?.weaknesses ?? "—"} small />
            </div>

            <h3 style={styles.subheading}>Score history</h3>
            <div style={styles.scoreList}>
              {progress.score_trend?.map((s) => (
                <div key={s.index} style={styles.scoreRow}>
                  <span style={styles.scoreIndex}>#{s.index}</span>
                  <div style={styles.scoreBarWrap}>
                    <div style={{ ...styles.scoreBar, width: `${s.score}%`, background: s.score >= 70 ? "#27ae60" : s.score >= 50 ? "#f39c12" : "#e74c3c" }} />
                  </div>
                  <span style={styles.scoreNum}>{s.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, small }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statLabel}>{label}</p>
      <p style={{ ...styles.statValue, fontSize: small ? 14 : 28 }}>{value}</p>
    </div>
  );
}

const styles = {
  page:         { display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif", background: "#f5f5f0" },
  sidebar:      { width: 220, background: "#1a1a1a", color: "#fff", padding: "2rem 1.5rem", display: "flex", flexDirection: "column" },
  logo:         { fontSize: 22, fontWeight: 800, marginBottom: 24, letterSpacing: 1 },
  userInfo:     { fontSize: 14, marginBottom: 32, lineHeight: 1.6 },
  role:         { color: "#888", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  navBtn:       { display: "block", width: "100%", padding: "10px 12px", background: "transparent", color: "#ccc", border: "none", borderRadius: 8, textAlign: "left", fontSize: 14, cursor: "pointer", marginBottom: 4 },
  navActive:    { display: "block", width: "100%", padding: "10px 12px", background: "#333", color: "#fff", border: "none", borderRadius: 8, textAlign: "left", fontSize: 14, cursor: "pointer", marginBottom: 4 },
  logoutBtn:    { marginTop: "auto", padding: "10px 0", background: "transparent", color: "#888", border: "1px solid #333", borderRadius: 8, cursor: "pointer", fontSize: 13 },
  main:         { flex: 1, padding: "2.5rem 3rem", overflowY: "auto" },
  heading:      { fontSize: 24, fontWeight: 700, marginBottom: 24, color: "#1a1a1a" },
  subheading:   { fontSize: 16, fontWeight: 600, margin: "20px 0 10px", color: "#333" },
  courseRow:    { display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" },
  courseBtn:    { padding: "8px 18px", border: "1px solid #ddd", borderRadius: 20, background: "#fff", cursor: "pointer", fontSize: 13 },
  courseActive: { padding: "8px 18px", border: "1px solid #1a1a1a", borderRadius: 20, background: "#1a1a1a", color: "#fff", cursor: "pointer", fontSize: 13 },
  questionList: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 },
  qCard:        { padding: "14px 18px", background: "#fff", borderRadius: 10, border: "1px solid #eee", cursor: "pointer" },
  qCardActive:  { padding: "14px 18px", background: "#fff", borderRadius: 10, border: "2px solid #1a1a1a", cursor: "pointer" },
  qTopic:       { margin: "0 0 6px", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  qText:        { margin: 0, fontSize: 14, color: "#333" },
  editorSection: { background: "#fff", borderRadius: 12, padding: "1.5rem", border: "1px solid #eee" },
  questionFull:  { fontSize: 15, lineHeight: 1.7, color: "#222", marginBottom: 20 },
  codeArea:     { width: "100%", height: 240, fontFamily: "monospace", fontSize: 13, padding: "12px", borderRadius: 8, border: "1px solid #ddd", background: "#fafafa", boxSizing: "border-box", resize: "vertical" },
  submitBtn:    { marginTop: 12, padding: "10px 24px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" },
  feedbackBox:  { marginTop: 24, background: "#f0f7ff", border: "1px solid #b3d4f5", borderRadius: 10, padding: "1.5rem" },
  scoreChip:    { display: "inline-block", background: "#1a1a1a", color: "#fff", borderRadius: 20, padding: "4px 14px", fontSize: 13, marginBottom: 12 },
  feedbackText: { margin: 0, fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", color: "#333" },
  modelLabel:   { margin: "12px 0 0", fontSize: 11, color: "#888" },
  statsRow:     { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 },
  statCard:     { background: "#fff", borderRadius: 10, padding: "1.25rem", border: "1px solid #eee" },
  statLabel:    { margin: "0 0 8px", fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  statValue:    { margin: 0, fontWeight: 700, color: "#1a1a1a" },
  scoreList:    { display: "flex", flexDirection: "column", gap: 8 },
  scoreRow:     { display: "flex", alignItems: "center", gap: 12 },
  scoreIndex:   { width: 30, fontSize: 13, color: "#888" },
  scoreBarWrap: { flex: 1, height: 12, background: "#eee", borderRadius: 6, overflow: "hidden" },
  scoreBar:     { height: "100%", borderRadius: 6, transition: "width 0.4s" },
  scoreNum:     { width: 30, fontSize: 13, fontWeight: 600, textAlign: "right" },
};