import api from "./api";

export const getDashboardSummary = () => api.get("/dashboard/summary").then((r) => r.data);
export const getCashierDashboardSummary = () =>
  api.get("/dashboard/cashier-summary").then((r) => r.data);