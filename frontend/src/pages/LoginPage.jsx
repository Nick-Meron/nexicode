import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api";
import { useAuth } from "../context/AuthContext";
import codingImg from "../assets/coding.svg";

export default function LoginPage() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(form);
      loginUser(res.data.token, res.data.user);
      navigate(res.data.user.role === "tutor" ? "/tutor" : "/student");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>

      {/* Left panel — illustration */}
      <div style={s.left}>
        <div style={s.blob} />
        <div style={s.leftContent}>
          <div style={s.logoRow}>
            <span style={s.logoIcon}>⬡</span>
            <span style={s.logoText}>NEXICODE</span>
          </div>
          <h2 style={s.leftTitle}>Welcome back!</h2>
          <p style={s.leftSub}>Sign in to continue your learning journey with   AI-powered programming education.</p>
          <img src={codingImg} alt="Coding" style={s.illustration} />
        </div>
      </div>

      {/* Right panel — form */}
      <div style={s.right}>
        <div style={s.formBox}>
          <h1 style={s.title}>Sign In</h1>
          <p style={s.subtitle}>Enter your credentials to access your dashboard</p>

          {error && <div style={s.error}>{error}</div>}

          <form onSubmit={handleSubmit}>
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

            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <p style={s.footer}>
            Don't have an account? <Link to="/register">Create one here</Link>
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
  blob:         { position: "absolute", bottom: -120, left: -120, width: 500, height: 500, background: BLUE, opacity: 0.12, borderRadius: "50% 40% 60% 30%", zIndex: 0 },
  leftContent:  { position: "relative", zIndex: 1, padding: "3rem", maxWidth: 440, textAlign: "center" },
  logoRow:      { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 32 },
  logoIcon:     { fontSize: 24, color: BLUE },
  logoText:     { fontSize: 22, fontWeight: 800, color: "#1a1a2e" },
  leftTitle:    { fontSize: 32, fontWeight: 800, color: "#1a1a2e", marginBottom: 12 },
  leftSub:      { fontSize: 16, color: "#475569", lineHeight: 1.7, marginBottom: 32 },
  illustration: { width: "100%", maxWidth: 380 },
  right:        { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", padding: "2rem" },
  formBox:      { width: "100%", maxWidth: 400 },
  title:        { fontSize: 30, fontWeight: 800, color: "#1a1a2e", marginBottom: 6 },
  subtitle:     { fontSize: 14, color: "#64748b", marginBottom: 28 },
  label:        { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  btn:          { width: "100%", padding: "12px 0", background: BLUE, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, marginTop: 4, boxShadow: "0 4px 16px rgba(14,165,233,0.3)" },
  error:        { background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, border: "1px solid #fecaca" },
  footer:       { textAlign: "center", marginTop: 16, fontSize: 13, color: "#64748b" },
};