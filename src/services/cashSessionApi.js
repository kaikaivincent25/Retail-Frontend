import api from "./api";

export const getCurrentSession = () => api.get("/cash-sessions/current").then((r) => r.data);
export const openSession = () =>
  api.post("/cash-sessions/open", {}).then((r) => r.data);
export const closeSession = (closingCash) =>
  api.post("/cash-sessions/close", { closing_cash: closingCash }).then((r) => r.data);
export const listSessions = (userId) =>
  api.get(`/cash-sessions${userId ? `?user_id=${userId}` : ""}`).then((r) => r.data);