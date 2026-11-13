import api from "./api";

export const listCustomerOrders = (status = "") => api.get(`/orders${status ? `?status=${status}` : ""}`).then((r) => r.data);
export const updateCustomerOrder = (id, data) => api.patch(`/orders/${id}`, data).then((r) => r.data);
export const confirmCustomerOrderPayment = (id, receipt) => api.post(`/orders/${id}/payment/confirm?receipt_number=${encodeURIComponent(receipt)}`).then((r) => r.data);
