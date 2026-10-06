import api from "./api";

export const getPeriodSummary = (startDate, endDate) =>
  api.get(`/reports/summary?start_date=${startDate}&end_date=${endDate}`).then((r) => r.data);