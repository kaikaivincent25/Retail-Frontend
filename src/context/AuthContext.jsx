import { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../services/api";
import { clearCatalog, clearShopData, unsyncedCount } from "../db";
import { useToast } from "./ToastContext";
import { extractErrorMessage } from "../services/errorHandling";
import { syncOutbox } from "../sync";
import { refreshCatalogFromServer } from "../services/salesApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { showToast } = useToast();
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("token");
    return stored ? decodeUser(stored) : null;
  });

  useEffect(() => {
    if (!token) return undefined;

    function refreshCatalog() {
      refreshCatalogFromServer().catch((err) => {
        console.error("Failed to refresh the product catalog.", err);
      });
    }

    refreshCatalog();
    window.addEventListener("online", refreshCatalog);
    return () => window.removeEventListener("online", refreshCatalog);
  }, [token]);

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
    syncOutbox().catch((err) => {
      console.error("Failed to resume syncing queued sales after login.", err);
    });
    return decodeUser(access_token);
  }

  async function signup(payload) {
    const response = await api.post("/auth/signup", payload);
    const { access_token } = response.data;
    localStorage.setItem("token", access_token);
    setToken(access_token);
    setUser(decodeUser(access_token));
    syncOutbox().catch((err) => {
      console.error("Failed to resume syncing queued sales after signup.", err);
    });
    return decodeUser(access_token);
  }

  async function logout() {
    try {
      const count = await unsyncedCount();
      if (
        count > 0 &&
        !window.confirm(
          `There ${count === 1 ? "is" : "are"} ${count} unsynced sale${count === 1 ? "" : "s"} saved on this device. They will be kept and sync after you log in again. Rejected sales will remain for review. Log out anyway?`
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

  async function completeShopDeletion() {
    try {
      await clearShopData();
    } catch (err) {
      console.error("Could not clear all local shop data after deletion.", err);
    } finally {
      if ("caches" in window) {
        caches.delete("api-variants").catch((err) => {
          console.error("Could not clear the cached product catalog.", err);
        });
      }
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, signup, completeShopDeletion }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
