import api from "./api";
import { refreshCatalog, searchVariants } from "../db";

export const getCurrentSession = () => api.get("/cash-sessions/current").then((r) => r.data);
export const openSession = () =>
  api.post("/cash-sessions/open", {}).then((r) => r.data);
export const getPopularProducts = () => api.get("/products/popular").then((r) => r.data);
export async function refreshCatalogFromServer() {
  const { data } = await api.get("/variants?limit=500");
  await refreshCatalog(data);
}

export async function browseVariants(q = "") {
  try {
    const { data } = await api.get(`/variants?limit=500${q ? `&q=${encodeURIComponent(q)}` : ""}`);
    if (!q) await refreshCatalog(data);
    return data;
  } catch (error) {
    const cached = await searchVariants(q);
    if (cached.length > 0) return cached;
    throw error;
  }
}
export const searchProducts = (q) => api.get(`/products?q=${encodeURIComponent(q)}`).then((r) => r.data);
export const getVariantsForProduct = (productId) =>
  api.get(`/products/${productId}/variants`).then((r) => r.data);
export const completeSale = (items, amountReceived) =>
  api.post("/sales", { items, amount_received: amountReceived }).then((r) => r.data);
export const startMpesaPayment = (items, phoneNumber) =>
  api.post("/sales/mpesa", { items, phone_number: phoneNumber }).then((r) => r.data);
export const startManualMpesaPayment = (items, paymentMethod) =>
  api.post("/sales/manual-mpesa", { items, payment_method: paymentMethod }).then((r) => r.data);
export const confirmManualPayment = (saleId, receiptNumber) =>
  api.post(`/sales/${saleId}/manual-payment/confirm`, { receipt_number: receiptNumber }).then((r) => r.data);
export const cancelManualPayment = (saleId) =>
  api.post(`/sales/${saleId}/manual-payment/cancel`).then((r) => r.data);
export const reconcileMpesaPayment = (saleId) =>
  api.post(`/sales/${saleId}/mpesa/reconcile`).then((r) => r.data);
export const getSale = (saleId) => api.get(`/sales/${saleId}`).then((r) => r.data);
export const getProducts = () => api.get("/products").then((r) => r.data);