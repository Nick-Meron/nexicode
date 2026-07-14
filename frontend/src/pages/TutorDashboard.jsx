import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getCourses, createCourse, deleteCourse, getTopics, createTopic, generateQuestion, getTopicQuestions } from "../api";

export default function TutorDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]             = useState("courses");
  const [courses, setCourses]     = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [topics, setTopics]       = useState([]);
  const [selectedTopic, setSelectedTopic]   = useState(null);
  const [questions, setQuestions] = useState([]);
  const [generating, setGenerating] = useState(false);

  const [newCourse, setNewCourse] = useState({ title: "", module_code: "" });
  const [newTopic, setNewTopic]   = useState({ topic_title: "", learning_outcomes: "", marking_rubric: "" });
  const [difficulty, setDifficulty] = useState("medium");

  useEffect(() => {
    getCourses().then((r) => setCourses(r.data));
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    const res = await createCourse(newCourse);
    setCourses([...courses, res.data]);
    setNewCourse({ title: "", module_code: "" });
  };

  const handleDeleteCourse = async (e, courseId) => {
    e.stopPropagation(); // prevent triggering handleSelectCourse when clicking delete
    if (!window.confirm("Delete this course? This cannot be undone.")) return;
    await deleteCourse(courseId);
    setCourses(courses.filter((c) => c.id !== courseId));
    if (selectedCourse?.id === courseId) {
      setSelectedCourse(null);
      setTopics([]);
    }
  };

  const handleSelectCourse = async (course) => {
    setSelectedCourse(course);
    setSelectedTopic(null);
    setQuestions([]);
    const res = await getTopics(course.id);
    setTopics(res.data);
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    const res = await createTopic(selectedCourse.id, newTopic);
    setTopics([...topics, res.data]);
    setNewTopic({ topic_title: "", learning_outcomes: "", marking_rubric: "" });
  };

  const handleSelectTopic = async (topic) => {
    setSelectedTopic(topic);
    const res = await getTopicQuestions(topic.id);
    setQuestions(res.data);
  };

  const handleGenerateQuestion = async () => {
    if (!selectedTopic) return;
    setGenerating(true);
    try {
      const res = await generateQuestion({ topic_id: selectedTopic.id, difficulty });
      setQuestions([...questions, res.data]);
    } catch (err) {
      alert("Generation failed: " + (err.response?.data?.error || err.message));
    } finally {
      setGenerating(false);
    }
  };

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
              <p style={s.userRole}>Tutor</p>
            </div>
          </div>
          <nav style={s.nav}>
            {[
              { id: "courses",   label: "🏫  My Courses" },
              { id: "questions", label: "❓  Questions" },
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

        {/* ── Courses tab ── */}
        {tab === "courses" && (
          <div>
            <div style={s.pageHeader}>
              <h1 style={s.pageTitle}>My Courses</h1>
              <p style={s.pageSubtitle}>Create and manage your courses</p>
            </div>

            {/* Create course form */}
            <div style={s.formCard}>
              <h3 style={s.formTitle}>➕ Add a New Course</h3>
              <form onSubmit={handleCreateCourse} style={s.inlineForm}>
                <input
                  placeholder="Course title e.g. Introduction to Python"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  required
                />
                <input
                  placeholder="Module code e.g. CIS013-3"
                  value={newCourse.module_code}
                  onChange={(e) => setNewCourse({ ...newCourse, module_code: e.target.value })}
                  required
                />
                <button style={s.btn} type="submit">Create Course</button>
              </form>
            </div>

            {/* Course cards grid */}
            <div style={s.courseGrid}>
              {courses.length === 0 && (
                <p style={s.empty}>No courses yet. Create your first one above!</p>
              )}
              {courses.map((c) => (
                <div
                  key={c.id}
                  style={selectedCourse?.id === c.id ? s.courseCardActive : s.courseCard}
                  onClick={() => { handleSelectCourse(c); setTab("questions"); }}>
                  <div style={s.courseCardTop}>
                    <span style={s.courseIcon}>📘</span>
                    <span style={s.moduleCode}>{c.module_code}</span>
                  </div>
                  <p style={s.courseTitle}>{c.title}</p>
                  <div style={s.courseCardBottom}>
                    <p style={s.courseAction}>Click to manage →</p>
                    <button
                      style={s.deleteBtn}
                      onClick={(e) => handleDeleteCourse(e, c.id)}
                      title="Delete course">
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Questions tab ── */}
        {tab === "questions" && (
          <div>
            <div style={s.pageHeader}>
              <h1 style={s.pageTitle}>
                {selectedCourse ? selectedCourse.title : "Questions"}
              </h1>
              <p style={s.pageSubtitle}>
                {selectedCourse ? `${selectedCourse.module_code} · Manage topics and generate questions` : "Select a course from My Courses first"}
              </p>
            </div>

            {!selectedCourse ? (
              <div style={s.emptyState}>
                <p style={s.emptyIcon}>🏫</p>
                <p style={s.emptyText}>Go to My Courses and click on a course to manage its questions.</p>
                <button style={s.btn} onClick={() => setTab("courses")}>Go to My Courses</button>
              </div>
            ) : (
              <div style={s.splitLayout}>

                {/* Left — topic panel */}
                <div style={s.topicPanel}>

                  {/* Add topic form */}
                  <div style={s.formCard}>
                    <h3 style={s.formTitle}>➕ Add Syllabus Topic</h3>
                    <form onSubmit={handleCreateTopic}>
                      <label style={s.label}>Topic title</label>
                      <input
                        placeholder="e.g. Variables and Data Types"
                        value={newTopic.topic_title}
                        onChange={(e) => setNewTopic({ ...newTopic, topic_title: e.target.value })}
                        required
                      />
                      <label style={s.label}>Learning outcomes</label>
                      <textarea
                        style={s.textarea}
                        placeholder="Students should be able to..."
                        value={newTopic.learning_outcomes}
                        onChange={(e) => setNewTopic({ ...newTopic, learning_outcomes: e.target.value })}
                        required
                      />
                      <label style={s.label}>Marking rubric</label>
                      <textarea
                        style={s.textarea}
                        placeholder="Correct variable naming 30 marks..."
                        value={newTopic.marking_rubric}
                        onChange={(e) => setNewTopic({ ...newTopic, marking_rubric: e.target.value })}
                        required
                      />
                      <button style={s.btn} type="submit">Add Topic</button>
                    </form>
                  </div>

                  {/* Topics list */}
                  {topics.length > 0 && (
                    <div>
                      <p style={s.listLabel}>Topics ({topics.length})</p>
                      <div style={s.topicList}>
                        {topics.map((t) => (
                          <div
                            key={t.id}
                            style={selectedTopic?.id === t.id ? s.topicActive : s.topicItem}
                            onClick={() => handleSelectTopic(t)}>
                            <span style={s.topicDot}>●</span>
                            {t.topic_title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right — questions panel */}
                <div style={s.questionPanel}>
                  {!selectedTopic ? (
                    <div style={s.emptyState}>
                      <p style={s.emptyIcon}>📋</p>
                      <p style={s.emptyText}>Select a topic on the left to generate questions.</p>
                    </div>
                  ) : (
                    <>
                      <div style={s.genCard}>
                        <h3 style={s.formTitle}>🤖 Generate AI Question</h3>
                        <p style={s.genSubtitle}>Topic: <strong>{selectedTopic.topic_title}</strong></p>
                        <div style={s.genRow}>
                          <div style={s.diffRow}>
                            {["easy", "medium", "hard"].map((d) => (
                              <button
                                key={d}
                                type="button"
                                style={difficulty === d ? s.diffActive : s.diffBtn}
                                onClick={() => setDifficulty(d)}>
                                {d.charAt(0).toUpperCase() + d.slice(1)}
                              </button>
                            ))}
                          </div>
                          <button
                            style={generating ? s.genBtnDisabled : s.genBtn}
                            onClick={handleGenerateQuestion}
                            disabled={generating}>
                            {generating ? "⏳ Generating..." : "Generate Question →"}
                          </button>
                        </div>
                      </div>

                      {/* Generated questions */}
                      <div style={s.questionList}>
                        {questions.length === 0 && (
                          <p style={s.empty}>No questions yet. Generate one above.</p>
                        )}
                        {questions.map((q, i) => (
                          <div key={q.id} style={s.qCard}>
                            <div style={s.qHeader}>
                              <span style={s.qNumber}>Q{i + 1}</span>
                              <span style={s.qBadge}>{q.difficulty}</span>
                              <span style={s.qModel}>{q.ai_model_used}</span>
                            </div>
                            <p style={s.qText}>{q.question_text}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

const BLUE      = "#0EA5E9";
const BLUE_DARK = "#0284C7";
const BLUE_LIGHT = "#E0F2FE";

const s = {
  page:            { display: "flex", minHeight: "100vh", background: "#f0f7ff", fontFamily: "inherit" },

  // Sidebar
  sidebar:         { width: 240, background: "#1a1a2e", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "1.5rem 1rem" },
  sideTop:         { display: "flex", flexDirection: "column", gap: 24 },
  logo:            { fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: 1, padding: "0 8px", display: "flex", alignItems: "center", gap: 8 },
  logoIcon:        { color: BLUE, fontSize: 20 },
  userCard:        { display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px" },
  avatar:          { width: 36, height: 36, borderRadius: "50%", background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, flexShrink: 0 },
  userName:        { fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 },
  userRole:        { fontSize: 11, color: "#94a3b8", margin: 0, textTransform: "uppercase", letterSpacing: 0.5 },
  nav:             { display: "flex", flexDirection: "column", gap: 4 },
  navBtn:          { padding: "10px 14px", background: "transparent", border: "none", color: "#94a3b8", borderRadius: 8, textAlign: "left", fontSize: 14, fontWeight: 500, cursor: "pointer" },
  navActive:       { padding: "10px 14px", background: "rgba(14,165,233,0.15)", border: "none", color: "#fff", borderRadius: 8, textAlign: "left", fontSize: 14, fontWeight: 600, cursor: "pointer", borderLeft: `3px solid ${BLUE}` },
  logoutBtn:       { padding: "10px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", borderRadius: 8, fontSize: 13, cursor: "pointer" },

  // Main
  main:            { flex: 1, padding: "2rem 2.5rem", overflowY: "auto" },
  pageHeader:      { marginBottom: 28 },
  pageTitle:       { fontSize: 26, fontWeight: 800, color: "#1a1a2e", margin: 0 },
  pageSubtitle:    { fontSize: 14, color: "#64748b", margin: "4px 0 0" },

  // Form card
  formCard:        { background: "#fff", borderRadius: 12, padding: "1.5rem", border: "1.5px solid #e2e8f0", marginBottom: 24 },
  formTitle:       { fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: "0 0 16px" },
  inlineForm:      { display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" },
  label:           { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 },
  textarea:        { width: "100%", height: 80, padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, resize: "vertical", fontFamily: "inherit", background: "#f8fafc", color: "#1a1a2e", marginBottom: "1rem" },
  btn:             { padding: "10px 22px", background: BLUE, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(14,165,233,0.25)" },

  // Course cards
  courseGrid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 },
  courseCard:      { background: "#fff", borderRadius: 12, padding: "1.25rem", border: "1.5px solid #e2e8f0", cursor: "pointer", transition: "transform 0.1s" },
  courseCardActive: { background: BLUE_LIGHT, borderRadius: 12, padding: "1.25rem", border: `2px solid ${BLUE}`, cursor: "pointer" },
  courseCardTop:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  courseIcon:      { fontSize: 24 },
  moduleCode:      { fontSize: 11, color: BLUE, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, background: BLUE_LIGHT, padding: "2px 8px", borderRadius: 10 },
  courseTitle:     { fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" },
  courseAction:    { fontSize: 12, color: "#94a3b8", margin: 0 },
  courseCardBottom: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  deleteBtn:       { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 18, cursor: "pointer", padding: "6px 10px", borderRadius: 8, lineHeight: 1 },

  // Split layout
  splitLayout:     { display: "flex", gap: 20, alignItems: "flex-start" },
  topicPanel:      { width: 340, flexShrink: 0 },
  questionPanel:   { flex: 1 },

  // Topics
  listLabel:       { fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" },
  topicList:       { display: "flex", flexDirection: "column", gap: 6 },
  topicItem:       { padding: "10px 14px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#475569", display: "flex", alignItems: "center", gap: 8 },
  topicActive:     { padding: "10px 14px", background: BLUE_LIGHT, border: `2px solid ${BLUE}`, borderRadius: 8, cursor: "pointer", fontSize: 14, color: BLUE_DARK, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 },
  topicDot:        { fontSize: 8, opacity: 0.5 },

  // Generate card
  genCard:         { background: "#fff", borderRadius: 12, padding: "1.5rem", border: "1.5px solid #e2e8f0", marginBottom: 20 },
  genSubtitle:     { fontSize: 13, color: "#64748b", margin: "-8px 0 16px" },
  genRow:          { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  diffRow:         { display: "flex", gap: 8 },
  diffBtn:         { padding: "8px 16px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer" },
  diffActive:      { padding: "8px 16px", background: BLUE_LIGHT, border: `2px solid ${BLUE}`, borderRadius: 8, fontSize: 13, fontWeight: 700, color: BLUE, cursor: "pointer" },
  genBtn:          { padding: "10px 22px", background: BLUE, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(14,165,233,0.25)" },
  genBtnDisabled:  { padding: "10px 22px", background: "#94a3b8", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "not-allowed" },

  // Questions
  questionList:    { display: "flex", flexDirection: "column", gap: 12 },
  qCard:           { background: "#fff", borderRadius: 12, padding: "1.25rem 1.5rem", border: "1.5px solid #e2e8f0" },
  qHeader:         { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  qNumber:         { fontSize: 12, fontWeight: 700, color: "#fff", background: BLUE, borderRadius: 6, padding: "2px 8px" },
  qBadge:          { fontSize: 11, fontWeight: 700, color: "#64748b", background: "#f1f5f9", borderRadius: 6, padding: "2px 8px", textTransform: "uppercase" },
  qModel:          { fontSize: 11, color: "#94a3b8", marginLeft: "auto" },
  qText:           { fontSize: 14, color: "#334155", lineHeight: 1.7, margin: 0 },

  // Empty states
  emptyState:      { background: "#fff", borderRadius: 12, padding: "3rem", textAlign: "center", border: "1.5px solid #e2e8f0" },
  emptyIcon:       { fontSize: 48, margin: "0 0 12px" },
  emptyText:       { fontSize: 14, color: "#64748b", marginBottom: 20 },
  empty:           { fontSize: 14, color: "#94a3b8", padding: "8px 0" },
};