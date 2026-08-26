import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { courseTheme } from "../utils/courseTheme";
import { getCourses, createCourse, updateCourse, deleteCourse, getTopics, createTopic, updateTopic, generateQuestion, deleteQuestion, getTopicQuestions, getCourseStudents, changePassword, deleteAccount } from "../api";
import "../styles/dashboard.css";
import {
  HexIcon, CodeIcon, BookIcon, PlusIcon, TrashIcon, SparkIcon,
  ArrowRightIcon, LogoutIcon, SchoolIcon, LayersIcon, SearchIcon, PeopleIcon, SettingsIcon,
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
  const [studentCounts, setStudentCounts] = useState({});
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "" });
  const [pwMessage, setPwMessage] = useState(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [deletingQuestion, setDeletingQuestion] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [rosterCourse, setRosterCourse] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editCourseData, setEditCourseData] = useState({ title: "", module_code: "" });
  const [editingTopic, setEditingTopic] = useState(false);
  const [editTopicData, setEditTopicData] = useState({ topic_title: "", learning_outcomes: "", marking_rubric: "" });

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

  const loadStudentCounts = async (courseList) => {
    const entries = await Promise.all(
      courseList.map(async (c) => {
        try {
          const r = await getCourseStudents(c.id);
          return [c.id, r.data.length];
        } catch {
          return [c.id, 0];
        }
      })
    );
    setStudentCounts(Object.fromEntries(entries));
  };

  useEffect(() => {
    getCourses().then((r) => {
      setCourses(r.data);
      loadTopicCounts(r.data);
      loadStudentCounts(r.data);
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

  const handleStartEditCourse = (e, course) => {
    e.stopPropagation();
    setEditingCourseId(course.id);
    setEditCourseData({ title: course.title, module_code: course.module_code });
  };

  const handleCancelEditCourse = (e) => {
    e.stopPropagation();
    setEditingCourseId(null);
  };

  const handleSaveEditCourse = async (e, courseId) => {
    e.stopPropagation();
    const res = await updateCourse(courseId, editCourseData);
    setCourses(courses.map((c) => (c.id === courseId ? res.data : c)));
    setEditingCourseId(null);
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

  const handleDeleteCourse = (e, course) => {
    e.stopPropagation(); // prevent triggering handleSelectCourse when clicking delete
    setCourseToDelete(course);
  };

  const confirmDeleteCourse = async () => {
    const courseId = courseToDelete.id;
    setDeletingCourse(true);
    try {
      await deleteCourse(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
        setTopics([]);
      }
      setCourseToDelete(null);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete course");
    } finally {
      setDeletingCourse(false);
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
    setGenerating(true);
    try {
      // One combined step: create the topic, then immediately generate a
      // question for it — matches the real workflow of a tutor typing
      // what they taught today and getting a question straight away,
      // instead of two separate actions.
      const topicRes = await createTopic(selectedCourse.id, newTopic);
      setTopics([...topics, topicRes.data]);
      setTopicCounts((prev) => ({ ...prev, [selectedCourse.id]: (prev[selectedCourse.id] || 0) + 1 }));

      const questionRes = await generateQuestion({ topic_id: topicRes.data.id, difficulty });

      setNewTopic({ topic_title: "", learning_outcomes: "", marking_rubric: "" });
      setSelectedTopic(topicRes.data);
      setQuestions([questionRes.data]);
      setEditingTopic(false);
    } catch (err) {
      alert("Couldn't finish creating the topic and question: " + (err.response?.data?.error || err.message));
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectTopic = async (topic) => {
    setSelectedTopic(topic);
    setEditingTopic(false);
    const res = await getTopicQuestions(topic.id);
    setQuestions(res.data);
  };

  const handleStartEditTopic = () => {
    setEditTopicData({
      topic_title: selectedTopic.topic_title,
      learning_outcomes: selectedTopic.learning_outcomes,
      marking_rubric: selectedTopic.marking_rubric,
    });
    setEditingTopic(true);
  };

  const handleCancelEditTopic = () => setEditingTopic(false);

  const handleSaveEditTopic = async () => {
    const res = await updateTopic(selectedCourse.id, selectedTopic.id, editTopicData);
    setTopics(topics.map((t) => (t.id === selectedTopic.id ? res.data : t)));
    setSelectedTopic(res.data);
    setEditingTopic(false);
  };

  const handleDeleteQuestion = async () => {
    setDeletingQuestion(true);
    try {
      await deleteQuestion(questionToDelete.id);
      setQuestions((prev) => prev.filter((q) => q.id !== questionToDelete.id));
      setQuestionToDelete(null);
    } catch (err) {
      alert(err.response?.data?.error || "Could not delete question");
    } finally {
      setDeletingQuestion(false);
    }
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

  const handleSelectRosterCourse = async (course) => {
    setRosterCourse(course);
    setRosterLoading(true);
    try {
      const res = await getCourseStudents(course.id);
      setRoster(res.data);
    } catch (err) {
      alert("Couldn't load students: " + (err.response?.data?.error || err.message));
      setRoster([]);
    } finally {
      setRosterLoading(false);
    }
  };

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
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button className="nx-logout-btn" onClick={() => setTab("account")}><SettingsIcon /> Account</button>
          <button className="nx-logout-btn" onClick={logout}><LogoutIcon /> Sign out</button>
        </div>
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
                          placeholder="e.g. Introduction to JavaScript"
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
                        const students = studentCounts[c.id] ?? 0;
                        return (
                          <div
                            key={c.id}
                            className={`nx-course-card nx-course-theme-${courseTheme(c)} ${selectedCourse?.id === c.id ? "active" : ""}`}
                            onClick={() => { if (editingCourseId !== c.id) { handleSelectCourse(c); setTab("questions"); } }}>
                            {editingCourseId === c.id ? (
                              <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <input
                                  className="nx-input"
                                  value={editCourseData.title}
                                  onChange={(e) => setEditCourseData({ ...editCourseData, title: e.target.value })}
                                  placeholder="Course title" />
                                <input
                                  className="nx-input"
                                  value={editCourseData.module_code}
                                  onChange={(e) => setEditCourseData({ ...editCourseData, module_code: e.target.value })}
                                  placeholder="Module code" />
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button className="nx-btn nx-btn-primary nx-btn-sm" onClick={(e) => handleSaveEditCourse(e, c.id)}>Save</button>
                                  <button className="nx-btn nx-btn-ghost nx-btn-sm" onClick={handleCancelEditCourse}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="nx-course-top">
                                  <span className="nx-course-icon"><BookIcon width="20" height="20" /></span>
                                  <span className="nx-module-code">{c.module_code}</span>
                                </div>
                                <p className="nx-course-title">{c.title}</p>
                                <p className="nx-course-meta">
                                  {lessons} {lessons === 1 ? "lesson" : "lessons"} · {students} {students === 1 ? "student" : "students"}
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
                                    className="nx-btn nx-btn-ghost nx-btn-sm"
                                    onClick={(e) => handleStartEditCourse(e, c)}>
                                    Edit
                                  </button>
                                  <button
                                    className="nx-icon-btn"
                                    onClick={(e) => handleDeleteCourse(e, c)}
                                    title="Delete course">
                                    <TrashIcon />
                                  </button>
                                </div>
                              </>
                            )}
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
                    <h3 className="nx-card-title"><PlusIcon width="15" height="15" /> Add Today's Topic</h3>
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
                        <label className="nx-label">What did you teach today?</label>
                        <textarea
                          className="nx-textarea"
                          placeholder="e.g. Today's lab covered writing and using for loops to iterate over arrays and print output to the console."
                          value={newTopic.learning_outcomes}
                          onChange={(e) => setNewTopic({ ...newTopic, learning_outcomes: e.target.value })}
                          required
                        />
                      </div>
                      <div className="nx-field">
                        <label className="nx-label">Question difficulty</label>
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
                      </div>
                      <button className="nx-btn" type="submit" style={{ width: "100%" }} disabled={generating}>
                        {generating ? "Creating topic and generating question…" : "Add Topic & Generate Question"}
                      </button>
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
                            onClick={() => handleSelectTopic(t)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span><span className="nx-topic-dot" />{t.topic_title}</span>
                            {selectedTopic?.id === t.id && (
                              <span
                                style={{ fontSize: 12, opacity: 0.7, cursor: "pointer" }}
                                onClick={(e) => { e.stopPropagation(); handleStartEditTopic(); }}>
                                Edit
                              </span>
                            )}
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
                  ) : editingTopic ? (
                    <div className="nx-card nx-gen-card" style={{ marginBottom: 20 }}>
                      <h3 className="nx-card-title">Edit Topic</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                        <input
                          className="nx-input"
                          value={editTopicData.topic_title}
                          onChange={(e) => setEditTopicData({ ...editTopicData, topic_title: e.target.value })}
                          placeholder="Topic title" />
                        <textarea
                          className="nx-input"
                          value={editTopicData.learning_outcomes}
                          onChange={(e) => setEditTopicData({ ...editTopicData, learning_outcomes: e.target.value })}
                          placeholder="Learning outcomes" />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="nx-btn" onClick={handleSaveEditTopic}>Save</button>
                          <button className="nx-btn nx-btn-ghost" onClick={handleCancelEditTopic}>Cancel</button>
                        </div>
                      </div>
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
                              <button
                                className="nx-icon-btn-danger"
                                title="Delete question"
                                onClick={() => setQuestionToDelete(q)}
                                style={{ marginLeft: "auto" }}>
                                <TrashIcon width="14" height="14" />
                              </button>
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

        {/* ── Students tab ── */}
        {tab === "students" && (
          <div className="nx-fade nx-content">
            <div className="nx-header">
              <div>
                <p className="nx-eyebrow"><PeopleIcon width="13" height="13" /> Roster</p>
                <h1 className="nx-title">Students</h1>
                <p className="nx-subtitle">See who's enrolled and how they're scoring, per course.</p>
              </div>
            </div>

            {courses.length === 0 ? (
              <div className="nx-empty-state">
                <div className="nx-empty-icon"><PeopleIcon width="26" height="26" /></div>
                <p className="nx-empty-text">Create a course first — students show up here once they submit work.</p>
              </div>
            ) : (
              <>
                <div className="nx-course-picker">
                  {courses.map((c) => (
                    <button
                      key={c.id}
                      className={`nx-chip ${rosterCourse?.id === c.id ? "active" : ""}`}
                      onClick={() => handleSelectRosterCourse(c)}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>

                {!rosterCourse ? (
                  <div className="nx-empty-state">
                    <div className="nx-empty-icon"><PeopleIcon width="26" height="26" /></div>
                    <p className="nx-empty-text">Pick a course above to see its roster.</p>
                  </div>
                ) : rosterLoading ? (
                  <p className="nx-subtitle">Loading…</p>
                ) : roster.length === 0 ? (
                  <div className="nx-empty-state">
                    <div className="nx-empty-icon"><PeopleIcon width="26" height="26" /></div>
                    <p className="nx-empty-text">
                      No students enrolled in {rosterCourse.title} yet — they're added automatically
                      the first time they submit a question in this course.
                    </p>
                  </div>
                ) : (
                  <table className="nx-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Submissions</th>
                        <th>Avg score</th>
                        <th>Enrolled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((s) => (
                        <tr key={s.student_id}>
                          <td>{s.name}</td>
                          <td>{s.email}</td>
                          <td>{s.submissions_count}</td>
                          <td>{s.avg_score} / 10</td>
                          <td>{fmtDate(s.enrolled_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
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
                Permanently delete your account, all your courses, syllabus topics, questions, and student submissions belonging to them. This cannot be undone.
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

      {courseToDelete && (
        <div className="nx-modal-overlay" onClick={() => !deletingCourse && setCourseToDelete(null)}>
          <div className="nx-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="nx-modal-icon"><TrashIcon width="22" height="22" /></div>
            <h3 className="nx-modal-title">Delete this course?</h3>
            <p className="nx-modal-body">
              You're about to permanently delete <span className="nx-modal-target">{courseToDelete.title}</span> ({courseToDelete.module_code}).
            </p>
            <div className="nx-modal-warning">
              This removes all syllabus topics, questions, submissions, feedback, and enrolments for this course. This cannot be undone.
            </div>
            <div className="nx-modal-actions">
              <button
                className="nx-btn nx-btn-ghost"
                onClick={() => setCourseToDelete(null)}
                disabled={deletingCourse}>
                Cancel
              </button>
              <button
                className="nx-btn"
                style={{ background: "var(--red)", color: "#fff" }}
                onClick={confirmDeleteCourse}
                disabled={deletingCourse}>
                {deletingCourse ? "Deleting…" : "Delete Course"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAccount && (
        <div className="nx-modal-overlay" onClick={() => !deletingAccount && setShowDeleteAccount(false)}>
          <div className="nx-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="nx-modal-icon"><TrashIcon width="22" height="22" /></div>
            <h3 className="nx-modal-title">Delete your account?</h3>
            <p className="nx-modal-body">
              This permanently deletes your account and every course, topic, question, and student submission that belongs to you. This cannot be undone.
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

      {questionToDelete && (
        <div className="nx-modal-overlay" onClick={() => !deletingQuestion && setQuestionToDelete(null)}>
          <div className="nx-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="nx-modal-icon"><TrashIcon width="22" height="22" /></div>
            <h3 className="nx-modal-title">Delete this question?</h3>
            <p className="nx-modal-body">
              This permanently deletes this question along with any student submissions and feedback tied to it. This cannot be undone.
            </p>
            <div className="nx-modal-actions">
              <button
                className="nx-btn nx-btn-ghost"
                onClick={() => setQuestionToDelete(null)}
                disabled={deletingQuestion}>
                Cancel
              </button>
              <button
                className="nx-btn"
                style={{ background: "var(--red)", color: "#fff" }}
                onClick={handleDeleteQuestion}
                disabled={deletingQuestion}>
                {deletingQuestion ? "Deleting…" : "Delete Question"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}