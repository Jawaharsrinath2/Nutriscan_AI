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
      .then((u) => {
        setUser(u);
        if (u?.theme) {
          localStorage.setItem("nutriscan_theme", u.theme);
        }
      })
      .catch(() => {
        localStorage.removeItem("nutriscan_token");
      })
      .finally(() => setLoading(false));
  }, []);

  // Apply theme to document
  useEffect(() => {
    const themeName = user?.theme || localStorage.getItem("nutriscan_theme") || "emerald";
    document.documentElement.setAttribute("data-theme", themeName);
    if (themeName === "dark" || themeName.endsWith("-dark")) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [user?.theme]);

  const saveAuth = (data) => {
    localStorage.setItem("nutriscan_token", data.access_token);
    setUser(data.user);
    if (data.user?.theme) {
      localStorage.setItem("nutriscan_theme", data.user.theme);
    }
  };

  const updateUser = (updatedUser) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedUser };
      if (merged.theme) {
        localStorage.setItem("nutriscan_theme", merged.theme);
      }
      return merged;
    });
  };

  const logout = () => {
    localStorage.removeItem("nutriscan_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === "admin", loading, saveAuth, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
