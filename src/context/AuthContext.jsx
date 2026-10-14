import { createContext, useContext, useState } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../services/api";
import { clearCatalog, unsyncedCount } from "../db";
import { useToast } from "./ToastContext";
import { extractErrorMessage } from "../services/errorHandling";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { showToast } = useToast();
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

  async function logout() {
    try {
      const count = await unsyncedCount();
      if (
        count > 0 &&
        !window.confirm(
          `There ${count === 1 ? "is" : "are"} ${count} unsynced sale${count === 1 ? "" : "s"} saved on this device. They will be kept, but will not reach the server until syncing is added. Log out anyway?`
        )
      ) {
        return;
      }
      await clearCatalog();
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
      return;
    }
    if ("caches" in window) {
      caches.delete("api-variants");
    }
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