import api from "./api";

export const listCustomers = ({ search = "", includeArchived = false } = {}) => {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (includeArchived) params.set("include_archived", "true");
  return api.get(`/customers?${params.toString()}`).then((response) => response.data);
};

export const createCustomer = (data) =>
  api.post("/customers", data).then((response) => response.data);

export const updateCustomer = (customerId, data) =>
  api.patch(`/customers/${customerId}`, data).then((response) => response.data);

export const getCustomerLedger = (customerId) =>
  api.get(`/customers/${customerId}/ledger`).then((response) => response.data);

export const recordCustomerPayment = (customerId, data) =>
  api.post(`/customers/${customerId}/payments`, data).then((response) => response.data);
