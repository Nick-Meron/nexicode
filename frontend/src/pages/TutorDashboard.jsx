import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getCourses, createCourse, deleteCourse, getTopics, createTopic, generateQuestion, getTopicQuestions } from "../api";
import "../styles/dashboard.css";
import {
  HexIcon, CodeIcon, BookIcon, PlusIcon, TrashIcon, SparkIcon,
  ArrowRightIcon, LogoutIcon, SchoolIcon, LayersIcon, SearchIcon, PeopleIcon,
} from "../components/Icons";

export default function TutorDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]             = useState("courses");
  const [courses, setCourses]     = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [topics, setTopics]       = useState([]);
  const [selectedTopic, setSelectedTopic]   = useState(null);
  const [questions, setQuestions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [topicCounts, setTopicCounts] = useState({});

  const [newCourse, setNewCourse] = useState({ title: "", module_code: "" });
  const [newTopic, setNewTopic]   = useState({ topic_title: "", learning_outcomes: "", marking_rubric: "" });
  const [difficulty, setDifficulty] = useState("medium");

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
  }, []);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    const res = await createCourse(newCourse);
    setCourses([...courses, res.data]);
    setTopicCounts((prev) => ({ ...prev, [res.data.id]: 0 }));
    setNewCourse({ title: "", module_code: "" });
    setShowCourseForm(false);
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
    setTopicCounts((prev) => ({ ...prev, [selectedCourse.id]: (prev[selectedCourse.id] || 0) + 1 }));
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

  const diffBadge = (d) => `nx-badge nx-badge-${["easy", "medium", "hard"].includes(d) ? d : "neutral"}`;

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
              <p className="nx-user-role">Tutor</p>
            </div>
          </div>
          <nav className="nx-nav">
            <button className={`nx-nav-btn ${tab === "courses" ? "active" : ""}`} onClick={() => setTab("courses")}>
              <BookIcon /> My Courses
            </button>
            <button className={`nx-nav-btn ${tab === "questions" ? "active" : ""}`} onClick={() => setTab("questions")}>
              <CodeIcon /> Questions
            </button>
            <button className={`nx-nav-btn ${tab === "students" ? "active" : ""}`} onClick={() => setTab("students")}>
              <PeopleIcon /> Students
            </button>
          </nav>
        </div>
        <button className="nx-logout-btn" onClick={logout}><LogoutIcon /> Sign out</button>
      </aside>

      {/* Main */}
      <main className="nx-main">

        {/* ── Courses tab ── */}
        {tab === "courses" && (
          <div className="nx-fade nx-content">
            <div className="nx-header">
              <div>
                <p className="nx-eyebrow"><BookIcon width="13" height="13" /> Workspace</p>
                <h1 className="nx-title">My Courses</h1>
                <p className="nx-subtitle">Create and manage the courses you teach.</p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div className="nx-topbar-search">
                  <SearchIcon />
                  <input
                    className="nx-input"
                    placeholder="Search courses..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                </div>
                <button className="nx-btn" onClick={() => setShowCourseForm((v) => !v)}>
                  {showCourseForm ? "Close" : <><PlusIcon width="14" height="14" /> Create Course</>}
                </button>
              </div>
            </div>

            <div className="nx-layout-rail">
              <div className="nx-layout-main">

                {/* Create course form — toggled from the header button */}
                {showCourseForm && (
                  <div className="nx-card nx-fade" style={{ marginBottom: 24 }}>
                    <h3 className="nx-card-title"><PlusIcon width="15" height="15" /> Add a New Course</h3>
                    <form onSubmit={handleCreateCourse} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                      <div className="nx-field" style={{ flex: "1 1 220px", marginBottom: 0 }}>
                        <label className="nx-label">Course title</label>
                        <input
                          className="nx-input"
                          placeholder="e.g. Introduction to Python"
                          value={newCourse.title}
                          onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="nx-field" style={{ flex: "1 1 160px", marginBottom: 0 }}>
                        <label className="nx-label">Module code</label>
                        <input
                          className="nx-input"
                          placeholder="e.g. CIS013-3"
                          value={newCourse.module_code}
                          onChange={(e) => setNewCourse({ ...newCourse, module_code: e.target.value })}
                          required
                        />
                      </div>
                      <button className="nx-btn" type="submit">Create Course</button>
                    </form>
                  </div>
                )}

                {/* Course cards grid */}
                {(() => {
                  const filtered = courses.filter((c) =>
                    (c.title + " " + c.module_code).toLowerCase().includes(courseSearch.toLowerCase())
                  );
                  if (courses.length === 0) {
                    return (
                      <div className="nx-empty-state">
                        <div className="nx-empty-icon"><SchoolIcon width="26" height="26" /></div>
                        <p className="nx-empty-text">No courses yet. Click "Create Course" above to start building questions.</p>
                      </div>
                    );
                  }
                  if (filtered.length === 0) {
                    return <p className="nx-empty-inline">No courses match "{courseSearch}".</p>;
                  }
                  return (
                    <div className="nx-course-grid">
                      {filtered.map((c) => {
                        const lessons = topicCounts[c.id] ?? 0;
                        return (
                          <div
                            key={c.id}
                            className={`nx-course-card ${selectedCourse?.id === c.id ? "active" : ""}`}
                            onClick={() => { handleSelectCourse(c); setTab("questions"); }}>
                            <div className="nx-course-top">
                              <span className="nx-course-icon"><BookIcon width="20" height="20" /></span>
                              <span className="nx-module-code">{c.module_code}</span>
                            </div>
                            <p className="nx-course-title">{c.title}</p>
                            <p className="nx-course-meta">
                              Instructor: <strong>{user.name}</strong> · {lessons} {lessons === 1 ? "lesson" : "lessons"}
                            </p>
                            <div className="nx-course-footer">
                              <div className="nx-course-updated">
                                <span className="nx-course-mini-avatar">{user.name[0].toUpperCase()}</span>
                                <span className="nx-course-updated-text">Created {fmtDate(c.created_at)}</span>
                              </div>
                            </div>
                            <div className="nx-course-bottom" style={{ marginTop: 12 }}>
                              <button
                                className="nx-btn nx-btn-ghost nx-btn-sm"
                                onClick={() => { handleSelectCourse(c); setTab("questions"); }}>
                                Manage <ArrowRightIcon width="12" height="12" />
                              </button>
                              <button
                                className="nx-icon-btn"
                                onClick={(e) => handleDeleteCourse(e, c.id)}
                                title="Delete course">
                                <TrashIcon />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Insights rail */}
              <aside className="nx-rail">
                <div className="nx-rail-card">
                  <p className="nx-rail-stat-num">{courses.length}</p>
                  <p className="nx-rail-stat-label">{courses.length === 1 ? "Course" : "Courses"} you teach</p>
                </div>
                <div className="nx-rail-card">
                  <p className="nx-rail-title"><SparkIcon width="14" height="14" /> Getting Started</p>
                  <div className={`nx-step ${courses.length > 0 ? "done" : ""}`}>
                    <span className="nx-step-num">{courses.length > 0 ? "✓" : "1"}</span>
                    <div className="nx-step-body">
                      <p className="nx-step-title">Create a course</p>
                      <p className="nx-step-desc">Give it a title and module code.</p>
                    </div>
                  </div>
                  <div className="nx-step">
                    <span className="nx-step-num">2</span>
                    <div className="nx-step-body">
                      <p className="nx-step-title">Add syllabus topics</p>
                      <p className="nx-step-desc">Open a course, then define outcomes and a rubric.</p>
                    </div>
                  </div>
                  <div className="nx-step">
                    <span className="nx-step-num">3</span>
                    <div className="nx-step-body">
                      <p className="nx-step-title">Generate questions</p>
                      <p className="nx-step-desc">Let AI draft practice questions per topic.</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}

        {/* ── Questions tab ── */}
        {tab === "questions" && (
          <div className="nx-fade nx-content">
            <div className="nx-header">
              <div>
                <p className="nx-eyebrow"><CodeIcon width="13" height="13" /> Content</p>
                <h1 className="nx-title">{selectedCourse ? selectedCourse.title : "Questions"}</h1>
                <p className="nx-subtitle">
                  {selectedCourse ? `${selectedCourse.module_code} · Manage topics and generate questions` : "Select a course from My Courses first"}
                </p>
              </div>
            </div>

            {!selectedCourse ? (
              <div className="nx-empty-state">
                <div className="nx-empty-icon"><SchoolIcon width="26" height="26" /></div>
                <p className="nx-empty-text">Go to My Courses and select a course to manage its questions.</p>
                <button className="nx-btn" onClick={() => setTab("courses")}>Go to My Courses</button>
              </div>
            ) : (
              <div className="nx-split">

                {/* Left — topic panel */}
                <div style={{ width: 340, flexShrink: 0 }}>

                  {/* Add topic form */}
                  <div className="nx-card" style={{ marginBottom: 24 }}>
                    <h3 className="nx-card-title"><PlusIcon width="15" height="15" /> Add Syllabus Topic</h3>
                    <form onSubmit={handleCreateTopic}>
                      <div className="nx-field">
                        <label className="nx-label">Topic title</label>
                        <input
                          className="nx-input"
                          placeholder="e.g. Variables and Data Types"
                          value={newTopic.topic_title}
                          onChange={(e) => setNewTopic({ ...newTopic, topic_title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="nx-field">
                        <label className="nx-label">Learning outcomes</label>
                        <textarea
                          className="nx-textarea"
                          placeholder="Students should be able to..."
                          value={newTopic.learning_outcomes}
                          onChange={(e) => setNewTopic({ ...newTopic, learning_outcomes: e.target.value })}
                          required
                        />
                      </div>
                      <div className="nx-field">
                        <label className="nx-label">Marking rubric</label>
                        <textarea
                          className="nx-textarea"
                          placeholder="Correct variable naming — 30 marks..."
                          value={newTopic.marking_rubric}
                          onChange={(e) => setNewTopic({ ...newTopic, marking_rubric: e.target.value })}
                          required
                        />
                      </div>
                      <button className="nx-btn" type="submit" style={{ width: "100%" }}>Add Topic</button>
                    </form>
                  </div>

                  {/* Topics list */}
                  {topics.length > 0 && (
                    <div>
                      <p className="nx-list-label">Topics ({topics.length})</p>
                      <div>
                        {topics.map((t) => (
                          <div
                            key={t.id}
                            className={`nx-topic-item ${selectedTopic?.id === t.id ? "active" : ""}`}
                            onClick={() => handleSelectTopic(t)}>
                            <span className="nx-topic-dot" />
                            {t.topic_title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right — questions panel */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {!selectedTopic ? (
                    <div className="nx-empty-state">
                      <div className="nx-empty-icon"><LayersIcon width="26" height="26" /></div>
                      <p className="nx-empty-text">Select a topic on the left to generate questions.</p>
                    </div>
                  ) : (
                    <>
                      <div className="nx-card nx-gen-card" style={{ marginBottom: 20 }}>
                        <h3 className="nx-card-title"><SparkIcon width="16" height="16" /> Generate AI Question</h3>
                        <p className="nx-gen-sub">Topic: <strong>{selectedTopic.topic_title}</strong></p>
                        <div className="nx-gen-row">
                          <div className="nx-diff-row">
                            {["easy", "medium", "hard"].map((d) => (
                              <button
                                key={d}
                                type="button"
                                className={`nx-diff-btn ${difficulty === d ? "active" : ""}`}
                                onClick={() => setDifficulty(d)}>
                                {d.charAt(0).toUpperCase() + d.slice(1)}
                              </button>
                            ))}
                          </div>
                          <button className="nx-btn" onClick={handleGenerateQuestion} disabled={generating}>
                            {generating ? "Generating…" : <>Generate Question <ArrowRightIcon /></>}
                          </button>
                        </div>
                      </div>

                      {/* Generated questions */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {questions.length === 0 && (
                          <p className="nx-empty-inline">No questions yet. Generate one above.</p>
                        )}
                        {questions.map((q, i) => (
                          <div key={q.id} className="nx-card">
                            <div className="nx-q-header">
                              <span className="nx-q-number">Q{i + 1}</span>
                              <span className={diffBadge(q.difficulty)}>{q.difficulty}</span>
                              <span className="nx-q-model">{q.ai_model_used}</span>
                            </div>
                            <p className="nx-q-text">{q.question_text}</p>
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

        {/* ── Students tab (placeholder — build out later) ── */}
        {tab === "students" && (
          <div className="nx-fade nx-content">
            <div className="nx-header">
              <div>
                <p className="nx-eyebrow"><PeopleIcon width="13" height="13" /> Roster</p>
                <h1 className="nx-title">Students</h1>
                <p className="nx-subtitle">See who's enrolled and how they're scoring, per course.</p>
              </div>
            </div>

            <div className="nx-empty-state">
              <div className="nx-empty-icon"><PeopleIcon width="26" height="26" /></div>
              <p className="nx-empty-text">
                Student list and marking bars are coming soon. This tab is wired up and ready to go.
              </p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}