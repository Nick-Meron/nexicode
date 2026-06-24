import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LandingPage      from "./pages/LandingPage";
import LoginPage        from "./pages/LoginPage";
import RegisterPage     from "./pages/RegisterPage";
import StudentDashboard from "./pages/StudentDashboard";
import TutorDashboard   from "./pages/TutorDashboard";

function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100vh", color:"#0EA5E9", fontSize:18 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === "tutor" ? "/tutor" : "/student"} replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <Routes>
      <Route path="/"         element={<LandingPage />} />
      <Route path="/login"    element={user ? <Navigate to={user.role === "tutor" ? "/tutor" : "/student"} replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to={user.role === "tutor" ? "/tutor" : "/student"} replace /> : <RegisterPage />} />
      <Route path="/student"  element={<PrivateRoute role="student"><StudentDashboard /></PrivateRoute>} />
      <Route path="/tutor"    element={<PrivateRoute role="tutor"><TutorDashboard /></PrivateRoute>} />
      <Route path="*"         element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}