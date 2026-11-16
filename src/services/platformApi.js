import axios from "axios";

const platformApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

platformApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("platform_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default platformApi;

export const listPlatformUsers = (shopId) =>
  platformApi.get(`/platform/shops/${shopId}/users`).then((response) => response.data);

export const updatePlatformUser = (shopId, userId, data) =>
  platformApi.patch(`/platform/shops/${shopId}/users/${userId}`, data).then((response) => response.data);
