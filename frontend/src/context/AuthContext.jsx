import { createContext, useContext, useEffect, useState } from "react";
import { fetchMe } from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nutriscan_token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("nutriscan_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const saveAuth = (data) => {
    localStorage.setItem("nutriscan_token", data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("nutriscan_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, saveAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
