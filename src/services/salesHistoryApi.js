import api from "./api";

export function listSales({ cashierId, startDate, endDate, skip = 0, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (cashierId) params.set("cashier_id", cashierId);
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  params.set("skip", skip);
  params.set("limit", limit);
  return api.get(`/sales?${params.toString()}`).then((r) => r.data);
}

export const getSale = (id) => api.get(`/sales/${id}`).then((r) => r.data);