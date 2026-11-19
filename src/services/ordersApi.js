import api from "./api";

export const listCustomerOrders = ({ status = "", paymentStatus = "", search = "" } = {}) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (paymentStatus) params.set("payment_status", paymentStatus);
  if (search.trim()) params.set("search", search.trim());
  const query = params.toString();
  return api.get(`/orders${query ? `?${query}` : ""}`).then((r) => r.data);
};
export const updateCustomerOrder = (id, data) => api.patch(`/orders/${id}`, data).then((r) => r.data);
export const confirmCustomerOrderPayment = (id, receipt) => api.post(`/orders/${id}/payment/confirm?receipt_number=${encodeURIComponent(receipt)}`).then((r) => r.data);
export const recordCustomerOrderPayment = (id, reference) =>
  api.post(`/orders/${id}/payment/record`, { reference: reference || null }).then((r) => r.data);
export const getCustomerOrderHistory = (id) => api.get(`/orders/${id}/history`).then((r) => r.data);
