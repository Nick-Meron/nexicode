import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name: "", email: "", password: "", role: "student" });
  const [error, setError]   = useState("");
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
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create account</h1>
        <p style={styles.subtitle}>Join NEXICODE</p>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Full name</label>
          <input style={styles.input} value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />

          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />

          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />

          <label style={styles.label}>I am a...</label>
          <select style={styles.input} value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="student">Student</option>
            <option value="tutor">Tutor</option>
          </select>

          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p style={styles.footer}>
          Have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page:     { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f0" },
  card:     { background: "#fff", borderRadius: 12, padding: "2.5rem", width: 360, boxShadow: "0 2px 16px rgba(0,0,0,0.08)" },
  title:    { margin: "0 0 4px", fontSize: 28, fontWeight: 700, color: "#1a1a1a" },
  subtitle: { margin: "0 0 2rem", fontSize: 14, color: "#666" },
  label:    { display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "#333" },
  input:    { width: "100%", marginBottom: "1rem", boxSizing: "border-box" },
  btn:      { width: "100%", padding: "10px 0", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, cursor: "pointer" },
  error:    { background: "#fff0f0", color: "#c0392b", padding: "10px 14px", borderRadius: 8, marginBottom: "1rem", fontSize: 13 },
  footer:   { textAlign: "center", marginTop: "1.5rem", fontSize: 13, color: "#666" },
};