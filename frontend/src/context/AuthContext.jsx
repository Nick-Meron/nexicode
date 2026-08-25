import { useState, useEffect, useCallback } from "react";
import { getMe } from "../api";
import AuthContext from "./AuthContextObject";

export default function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("nexicode_token")));

  // Restore session on page load. If there's no token, `loading` is
  // already false from the initializer above — nothing to do here.
  // Only the token-present case has async work to wait for.
  useEffect(() => {
    const token = localStorage.getItem("nexicode_token");
    if (!token) return;

    getMe()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("nexicode_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginUser = useCallback((token, userData) => {
    localStorage.setItem("nexicode_token", token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("nexicode_token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}