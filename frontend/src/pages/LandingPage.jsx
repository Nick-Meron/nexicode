import { useNavigate } from "react-router-dom";
import codingImg from "../assets/coding.svg";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>

      {/* Navbar */}
      <nav style={s.nav}>
        <div style={s.navLogo}>
          <span style={s.logoIcon}>⬡</span>
          <span style={s.logoText}>NEXICODE</span>
        </div>
        <div style={s.navLinks}>
          <a href="#features" style={s.navLink}>Features</a>
          <a href="#about" style={s.navLink}>About</a>
          <button style={s.navLoginBtn} onClick={() => navigate("/login")}>Login</button>
          <button style={s.navRegisterBtn} onClick={() => navigate("/register")}>Register</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={s.hero}>
        {/* Blob background */}
        <div style={s.blob} />

        {/* Left side — text */}
        <div style={s.heroLeft}>
          <div style={s.badge}>🎓 AI-Powered Education</div>
          <h1 style={s.heroTitle}>
            <span style={s.heroBlue}>Smart</span> Programming<br />
            Education Support
          </h1>
          <p style={s.heroSub}>
            NEXICODE uses Artificial Intelligence to generate syllabus-aligned
            programming questions, analyse your code, and provide structured
            academic feedback built for undergraduate students.
          </p>
          <div style={s.heroBtns}>
            <button style={s.btnPrimary} onClick={() => navigate("/register")}>
              Get Started →
            </button>
            <button style={s.btnSecondary} onClick={() => navigate("/login")}>
              Sign In
            </button>
          </div>
        </div>

        {/* Right side — illustration */}
        <div style={s.heroRight}>
          <img src={codingImg} alt="Student coding" style={s.heroImg} />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={s.features}>
        <h2 style={s.sectionTitle}>Why NEXICODE?</h2>
        <p style={s.sectionSub}>Everything you need for smarter programming education</p>
        <div style={s.featureGrid}>
          {[
            { icon: "📚", title: "Syllabus-Aware", desc: "Questions generated directly from your course topics and learning outcomes" },
            { icon: "🤖", title: "AI Feedback", desc: "Get guided feedback from GPT, Claude, and DeepSeek not just right or wrong" },
            { icon: "📊", title: "Progress Tracking", desc: "Track your scores and improvement across every submission" },
            { icon: "🏫", title: "For Tutors Too", desc: "Tutors define the curriculum and let AI do the heavy lifting" },
          ].map((f) => (
            <div key={f.title} style={s.featureCard}>
              <div style={s.featureIcon}>{f.icon}</div>
              <h3 style={s.featureTitle}>{f.title}</h3>
              <p style={s.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={s.footer}>
        <p style={s.footerText}>© 2025 NEXICODE · Bonitus Nicholas Meron Dias · University of Bedfordshire</p>
      </footer>

    </div>
  );
}

const BLUE = "#0EA5E9";
const BLUE_DARK = "#0284C7";
const BLUE_LIGHT = "#E0F2FE";

const s = {
  page:           { minHeight: "100vh", background: "#fff", overflowX: "hidden" },

  // Navbar
  nav:            { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.2rem 5%", position: "sticky", top: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", zIndex: 100, boxShadow: "0 1px 12px rgba(14,165,233,0.08)" },
  navLogo:        { display: "flex", alignItems: "center", gap: 8 },
  logoIcon:       { fontSize: 22, color: BLUE },
  logoText:       { fontSize: 20, fontWeight: 800, color: "#1a1a2e", letterSpacing: 1 },
  navLinks:       { display: "flex", alignItems: "center", gap: 24 },
  navLink:        { fontSize: 14, color: "#555", textDecoration: "none", fontWeight: 500 },
  navLoginBtn:    { padding: "8px 20px", background: "transparent", border: `1.5px solid ${BLUE}`, borderRadius: 8, color: BLUE, fontSize: 14, fontWeight: 600 },
  navRegisterBtn: { padding: "8px 20px", background: BLUE, border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600 },

  // Hero
  hero:           { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5rem 5% 4rem", minHeight: "88vh", position: "relative", overflow: "hidden" },
  blob:           { position: "absolute", top: -100, right: -100, width: 600, height: 600, background: BLUE_LIGHT, borderRadius: "50% 40% 60% 30% / 50% 60% 40% 50%", zIndex: 0 },
  heroLeft:       { flex: 1, maxWidth: 560, position: "relative", zIndex: 1 },
  badge:          { display: "inline-block", background: BLUE_LIGHT, color: BLUE_DARK, padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 20 },
  heroTitle:      { fontSize: 52, fontWeight: 800, lineHeight: 1.15, color: "#1a1a2e", marginBottom: 20 },
  heroBlue:       { color: BLUE },
  heroSub:        { fontSize: 16, color: "#64748b", lineHeight: 1.8, marginBottom: 36, maxWidth: 480 },
  heroBtns:       { display: "flex", gap: 16 },
  btnPrimary:     { padding: "14px 32px", background: BLUE, color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, boxShadow: `0 4px 20px rgba(14,165,233,0.35)` },
  btnSecondary:   { padding: "14px 32px", background: "#fff", color: BLUE, border: `2px solid ${BLUE}`, borderRadius: 10, fontSize: 16, fontWeight: 700 },
  heroRight:      { flex: 1, display: "flex", justifyContent: "center", position: "relative", zIndex: 1 },
  heroImg:        { width: "100%", maxWidth: 520, filter: "drop-shadow(0 8px 32px rgba(14,165,233,0.15))" },

  // Features
  features:       { padding: "5rem 5%", background: "#f8fafc" },
  sectionTitle:   { fontSize: 36, fontWeight: 800, textAlign: "center", color: "#1a1a2e", marginBottom: 12 },
  sectionSub:     { fontSize: 16, color: "#64748b", textAlign: "center", marginBottom: 48 },
  featureGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24, maxWidth: 1000, margin: "0 auto" },
  featureCard:    { background: "#fff", borderRadius: 16, padding: "2rem", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", transition: "transform 0.2s" },
  featureIcon:    { fontSize: 36, marginBottom: 16 },
  featureTitle:   { fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 },
  featureDesc:    { fontSize: 14, color: "#64748b", lineHeight: 1.7 },

  // Footer
  footer:         { padding: "2rem 5%", background: "#1a1a2e", textAlign: "center" },
  footerText:     { color: "#94a3b8", fontSize: 13 },
};