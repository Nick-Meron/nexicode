import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:5000/api",
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nexicode_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ─────────────────────────────────────────────────────────────────────
export const register = (data) => api.post("/auth/register", data);
export const login    = (data) => api.post("/auth/login", data);
export const getMe    = ()     => api.get("/auth/me");

// ── Courses & Topics ─────────────────────────────────────────────────────────
export const getCourses    = ()               => api.get("/courses/");
export const createCourse  = (data)           => api.post("/courses/", data);
export const getTopics     = (courseId)       => api.get(`/courses/${courseId}/topics`);
export const createTopic   = (courseId, data) => api.post(`/courses/${courseId}/topics`, data);

// ── Questions ────────────────────────────────────────────────────────────────
export const generateQuestion  = (data)     => api.post("/questions/generate", data);
export const getTopicQuestions = (topicId)  => api.get(`/questions/topic/${topicId}`);

// ── Submissions ──────────────────────────────────────────────────────────────
export const submitCode       = (data)         => api.post("/submissions/", data);
export const compareModels    = (submissionId) => api.post(`/submissions/${submissionId}/compare`);
export const getMySubmissions = (studentId)    => api.get(`/submissions/student/${studentId}`);

// ── Feedback ─────────────────────────────────────────────────────────────────
export const getFeedback = (submissionId) =>
  api.get(`/feedback/submission/${submissionId}`);

// ── Progress ─────────────────────────────────────────────────────────────────
export const getProgress = (studentId) =>
  api.get(`/progress/student/${studentId}`);

export default api;