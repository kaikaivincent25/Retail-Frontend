import { createContext, useContext, useState } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("token");
    return stored ? decodeUser(stored) : null;
  });

  function decodeUser(rawToken) {
    try {
      const payload = jwtDecode(rawToken);
      return { id: Number(payload.sub), role: payload.role };
    } catch {
      return null;
    }
  }

  async function login(username, password) {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);

    const response = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token } = response.data;
    localStorage.setItem("token", access_token);
    setToken(access_token);
    setUser(decodeUser(access_token));
    return decodeUser(access_token);
  }

  async function signup(payload) {
    const response = await api.post("/auth/signup", payload);
    const { access_token } = response.data;
    localStorage.setItem("token", access_token);
    setToken(access_token);
    setUser(decodeUser(access_token));
    return decodeUser(access_token);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}