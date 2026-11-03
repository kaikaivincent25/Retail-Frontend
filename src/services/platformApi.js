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
