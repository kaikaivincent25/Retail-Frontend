import api from "./api";

export const listActivity = ({ highRiskOnly, userId, skip = 0, limit = 50 } = {}) => {
  const params = new URLSearchParams();
  if (highRiskOnly) params.set("high_risk_only", "true");
  if (userId) params.set("user_id", userId);
  params.set("skip", skip);
  params.set("limit", limit);
  return api.get(`/audit?${params.toString()}`).then((r) => r.data);
};