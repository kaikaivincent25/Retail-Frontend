import axios from "axios";
import { clearCatalog } from "../db";

const MAX_GET_RETRIES = 2;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

function shouldRetryGet(error) {
  const config = error.config;
  const status = error.response?.status;

  return (
    config &&
    config.method?.toLowerCase() === "get" &&
    error.code !== "ERR_CANCELED" &&
    (config.__retryCount || 0) < MAX_GET_RETRIES &&
    (!error.response || status === 408 || status >= 500)
  );
}

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
    if (shouldRetryGet(error)) {
      const config = error.config;
      config.__retryCount = (config.__retryCount || 0) + 1;
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** (config.__retryCount - 1)));
      return api.request(config);
    }

    const detail = String(error.response?.data?.detail || "").toLowerCase();
    const subscriptionBlocked = detail.includes("subscription is inactive") || detail.includes("subscription has expired");
    const isPublicShop = window.location.pathname.startsWith("/shop/");
    if (error.response?.status === 402 && subscriptionBlocked && !isPublicShop && window.location.pathname !== "/billing") {
      window.location.href = "/billing";
      return Promise.reject(error);
    }
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
