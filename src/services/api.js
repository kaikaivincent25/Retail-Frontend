import axios from "axios";
import { clearCatalog } from "../db";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach the JWT to every request, once we have one stored (Phase 19)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await clearCatalog();
      } catch (cleanupError) {
        console.error("Failed to clear the cached product catalogue after authentication expired.", cleanupError);
      }
      if ("caches" in window) {
        caches.delete("api-variants");
      }
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;