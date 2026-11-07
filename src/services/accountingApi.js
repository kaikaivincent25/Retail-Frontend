import api from "./api";

export const listAccounts = () =>
  api.get("/accounting/accounts").then((res) => res.data);

export const listJournalEntries = ({ startDate, endDate, limit = 100, offset = 0 } = {}) => {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return api.get(`/accounting/journal?${params.toString()}`).then((res) => res.data);
};

export const getJournalEntry = (entryId) =>
  api.get(`/accounting/journal/${entryId}`).then((res) => res.data);

export const getReceivablesSummary = () =>
  api.get("/accounting/receivables").then((res) => res.data);

export const getPerformanceReport = ({ startDate, endDate } = {}) => {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  return api.get(`/accounting/performance?${params.toString()}`).then((res) => res.data);
};

export const getReconciliationReport = ({ startDate, endDate } = {}) => {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  return api.get(`/accounting/reconciliation?${params.toString()}`).then((res) => res.data);
};
