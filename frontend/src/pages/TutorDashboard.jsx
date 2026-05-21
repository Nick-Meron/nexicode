import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getCourses, createCourse, getTopics, createTopic, generateQuestion, getTopicQuestions } from "../api";

export default function TutorDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]           = useState("courses");
  const [courses, setCourses]   = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [topics, setTopics]     = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [generating, setGenerating] = useState(false);

  // Forms
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
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>NEXICODE</div>
        <p style={styles.userInfo}>{user.name}<br/><span style={styles.role}>Tutor</span></p>
        <nav>
          <button style={tab === "courses"   ? styles.navActive : styles.navBtn} onClick={() => setTab("courses")}>Courses</button>
          <button style={tab === "questions" ? styles.navActive : styles.navBtn} onClick={() => setTab("questions")}>Questions</button>
        </nav>
        <button style={styles.logoutBtn} onClick={logout}>Sign out</button>
      </aside>

      <main style={styles.main}>

        {/* ── Courses tab ─────────────────────────────────────── */}
        {tab === "courses" && (
          <div>
            <h2 style={styles.heading}>My Courses</h2>

            {/* Create course form */}
            <div style={styles.formCard}>
              <h3 style={styles.subheading}>Add a course</h3>
              <form onSubmit={handleCreateCourse} style={styles.inlineForm}>
                <input style={styles.input} placeholder="Course title" value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })} required />
                <input style={styles.input} placeholder="Module code (e.g. CIS013-3)" value={newCourse.module_code}
                  onChange={(e) => setNewCourse({ ...newCourse, module_code: e.target.value })} required />
                <button style={styles.btn} type="submit">Create</button>
              </form>
            </div>

            {/* Course cards */}
            <div style={styles.grid}>
              {courses.map((c) => (
                <div key={c.id} style={selectedCourse?.id === c.id ? styles.cardActive : styles.card}
                  onClick={() => { handleSelectCourse(c); setTab("questions"); }}>
                  <p style={styles.moduleCode}>{c.module_code}</p>
                  <p style={styles.courseTitle}>{c.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Questions tab ────────────────────────────────────── */}
        {tab === "questions" && (
          <div style={styles.splitLayout}>
            {/* Left: topics */}
            <div style={styles.topicPanel}>
              <h2 style={styles.heading}>
                {selectedCourse ? selectedCourse.title : "Select a course first"}
              </h2>

              {selectedCourse && (
                <>
                  <div style={styles.formCard}>
                    <h3 style={styles.subheading}>Add syllabus topic</h3>
                    <form onSubmit={handleCreateTopic}>
                      <input style={styles.inputFull} placeholder="Topic title" value={newTopic.topic_title}
                        onChange={(e) => setNewTopic({ ...newTopic, topic_title: e.target.value })} required />
                      <textarea style={styles.textarea} placeholder="Learning outcomes (one per line)"
                        value={newTopic.learning_outcomes}
                        onChange={(e) => setNewTopic({ ...newTopic, learning_outcomes: e.target.value })} required />
                      <textarea style={styles.textarea} placeholder="Marking rubric"
                        value={newTopic.marking_rubric}
                        onChange={(e) => setNewTopic({ ...newTopic, marking_rubric: e.target.value })} required />
                      <button style={styles.btn} type="submit">Add topic</button>
                    </form>
                  </div>

                  <div style={styles.topicList}>
                    {topics.map((t) => (
                      <div key={t.id}
                        style={selectedTopic?.id === t.id ? styles.topicActive : styles.topicItem}
                        onClick={() => handleSelectTopic(t)}>
                        {t.topic_title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right: questions */}
            <div style={styles.questionPanel}>
              {selectedTopic ? (
                <>
                  <h3 style={styles.subheading}>{selectedTopic.topic_title}</h3>
                  <div style={styles.genRow}>
                    <select style={styles.diffSelect} value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    <button style={styles.generateBtn} onClick={handleGenerateQuestion} disabled={generating}>
                      {generating ? "Generating..." : "Generate question with AI"}
                    </button>
                  </div>

                  <div style={styles.questionList}>
                    {questions.length === 0 && (
                      <p style={{ color: "#888", fontSize: 14 }}>No questions yet. Generate one above.</p>
                    )}
                    {questions.map((q, i) => (
                      <div key={q.id} style={styles.qCard}>
                        <div style={styles.qMeta}>Q{i + 1} · {q.difficulty} · {q.ai_model_used}</div>
                        <p style={styles.qText}>{q.question_text}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ color: "#888", marginTop: "2rem" }}>Select a topic to manage questions.</p>
              )}
            </div>
          </div>
        )}
      </main>
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
  heading:      { fontSize: 24, fontWeight: 700, marginBottom: 20, color: "#1a1a1a" },
  subheading:   { fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "#333" },
  formCard:     { background: "#fff", borderRadius: 12, padding: "1.5rem", border: "1px solid #eee", marginBottom: 24 },
  inlineForm:   { display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" },
  input:        { padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, flex: 1 },
  inputFull:    { width: "100%", marginBottom: 10, padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, boxSizing: "border-box" },
  textarea:     { width: "100%", marginBottom: 10, padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, height: 72, resize: "vertical", boxSizing: "border-box" },
  btn:          { padding: "9px 20px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  grid:         { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 },
  card:         { background: "#fff", borderRadius: 10, padding: "1.25rem", border: "1px solid #eee", cursor: "pointer" },
  cardActive:   { background: "#fff", borderRadius: 10, padding: "1.25rem", border: "2px solid #1a1a1a", cursor: "pointer" },
  moduleCode:   { margin: "0 0 6px", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  courseTitle:  { margin: 0, fontSize: 15, fontWeight: 600, color: "#1a1a1a" },
  splitLayout:  { display: "flex", gap: 24 },
  topicPanel:   { width: 360, flexShrink: 0 },
  questionPanel: { flex: 1 },
  topicList:    { display: "flex", flexDirection: "column", gap: 6 },
  topicItem:    { padding: "10px 14px", background: "#fff", border: "1px solid #eee", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#333" },
  topicActive:  { padding: "10px 14px", background: "#1a1a1a", border: "1px solid #1a1a1a", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#fff" },
  genRow:       { display: "flex", gap: 10, marginBottom: 20 },
  diffSelect:   { padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 },
  generateBtn:  { padding: "9px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" },
  questionList: { display: "flex", flexDirection: "column", gap: 12 },
  qCard:        { background: "#fff", borderRadius: 10, padding: "1.25rem", border: "1px solid #eee" },
  qMeta:        { fontSize: 11, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  qText:        { margin: 0, fontSize: 14, lineHeight: 1.7, color: "#333" },
};