import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nexicode_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the token has expired or is invalid, send the user back to login
// with a clear message instead of showing a raw "401" error everywhere.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("nexicode_token");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=1";
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const register    = (data)       => api.post("/auth/register", data);
export const login       = (data)       => api.post("/auth/login", data);
export const googleLogin = (credential) => api.post("/auth/google", { credential });
export const getMe    = ()     => api.get("/auth/me");
export const changePassword = (data) => api.put("/auth/change-password", data);
export const deleteAccount  = (password) => api.delete("/auth/account", { data: { password } });

// ── Courses & Topics ─────────────────────────────────────────────────────────
export const getCourses    = ()               => api.get("/courses/");
export const joinCourse    = (moduleCode)     => api.post("/courses/join", { module_code: moduleCode });
export const createCourse  = (data)           => api.post("/courses/", data);
export const updateCourse  = (courseId, data) => api.put(`/courses/${courseId}`, data);
export const deleteCourse  = (courseId)       => api.delete(`/courses/${courseId}`);
export const getTopics     = (courseId)       => api.get(`/courses/${courseId}/topics`);
export const createTopic   = (courseId, data) => api.post(`/courses/${courseId}/topics`, data);
export const updateTopic   = (courseId, topicId, data) => api.put(`/courses/${courseId}/topics/${topicId}`, data);
export const getCourseStudents = (courseId)   => api.get(`/courses/${courseId}/students`);
export const leaveCourse   = (courseId)       => api.delete(`/courses/${courseId}/enroll`);

// ── Questions ────────────────────────────────────────────────────────────────
export const generateQuestion  = (data)     => api.post("/questions/generate", data);
export const deleteQuestion    = (id)       => api.delete(`/questions/${id}`);
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