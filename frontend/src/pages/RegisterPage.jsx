import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api";
import { useAuth } from "../context/AuthContext";
import codingImg from "../assets/coding.svg";

export default function RegisterPage() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ name: "", email: "", password: "", role: "student" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await register(form);
      loginUser(res.data.token, res.data.user);
      navigate(res.data.user.role === "tutor" ? "/tutor" : "/student");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>

      {/* Left panel */}
      <div style={s.left}>
        <div style={s.blob} />
        <div style={s.leftContent}>
          <div style={s.logoRow}>
            <span style={s.logoIcon}>⬡</span>
            <span style={s.logoText}>NEXICODE</span>
          </div>
          <h2 style={s.leftTitle}>Start Learning Smarter</h2>
          <p style={s.leftSub}>
            Join NEXICODE and get AI-powered, syllabus-aligned programming
            feedback designed for undergraduate students.
          </p>
          <img src={codingImg} alt="Coding" style={s.illustration} />
        </div>
      </div>

      {/* Right panel — form */}
      <div style={s.right}>
        <div style={s.formBox}>
          <h1 style={s.title}>Create Account</h1>
          <p style={s.subtitle}>Fill in your details to get started</p>

          {error && <div style={s.error}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <label style={s.label}>Full name</label>
            <input
              placeholder="John Smith"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <label style={s.label}>Email address</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <label style={s.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />

            <label style={s.label}>I am a...</label>
            <div style={s.roleRow}>
              {["student", "tutor"].map((r) => (
                <button
                  key={r}
                  type="button"
                  style={form.role === r ? s.roleActive : s.roleBtn}
                  onClick={() => setForm({ ...form, role: r })}>
                  {r === "student" ? "🎓 Student" : "👨‍🏫 Tutor"}
                </button>
              ))}
            </div>

            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create Account →"}
            </button>
          </form>

          <p style={s.footer}>
            Already have an account? <Link to="/login">Sign in here</Link>
          </p>
          <p style={s.footer}>
            <Link to="/">← Back to home</Link>
          </p>
        </div>
      </div>

    </div>
  );
}

const BLUE = "#0EA5E9";
const BLUE_LIGHT = "#E0F2FE";

const s = {
  page:         { display: "flex", minHeight: "100vh" },
  left:         { flex: 1, background: BLUE_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  blob:         { position: "absolute", top: -120, right: -120, width: 500, height: 500, background: BLUE, opacity: 0.12, borderRadius: "30% 60% 40% 50%", zIndex: 0 },
  leftContent:  { position: "relative", zIndex: 1, padding: "3rem", maxWidth: 440, textAlign: "center" },
  logoRow:      { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 32 },
  logoIcon:     { fontSize: 24, color: BLUE },
  logoText:     { fontSize: 22, fontWeight: 800, color: "#1a1a2e" },
  leftTitle:    { fontSize: 32, fontWeight: 800, color: "#1a1a2e", marginBottom: 12 },
  leftSub:      { fontSize: 15, color: "#475569", lineHeight: 1.7, marginBottom: 32 },
  illustration: { width: "100%", maxWidth: 380 },
  right:        { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", padding: "2rem" },
  formBox:      { width: "100%", maxWidth: 400 },
  title:        { fontSize: 30, fontWeight: 800, color: "#1a1a2e", marginBottom: 6 },
  subtitle:     { fontSize: 14, color: "#64748b", marginBottom: 28 },
  label:        { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  roleRow:      { display: "flex", gap: 12, marginBottom: 16 },
  roleBtn:      { flex: 1, padding: "10px 0", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#64748b" },
  roleActive:   { flex: 1, padding: "10px 0", background: BLUE_LIGHT, border: `2px solid ${BLUE}`, borderRadius: 8, fontSize: 14, fontWeight: 700, color: BLUE },
  btn:          { width: "100%", padding: "12px 0", background: BLUE, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, marginTop: 4, boxShadow: "0 4px 16px rgba(14,165,233,0.3)" },
  error:        { background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, border: "1px solid #fecaca" },
  footer:       { textAlign: "center", marginTop: 12, fontSize: 13, color: "#64748b" },
};