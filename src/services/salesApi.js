import api from "./api";

export const getCurrentSession = () => api.get("/cash-sessions/current").then((r) => r.data);
export const openSession = () =>
  api.post("/cash-sessions/open", {}).then((r) => r.data);
export const getPopularProducts = () => api.get("/products/popular").then((r) => r.data);
export const browseVariants = (q = "") =>
  api.get(`/variants${q ? `?q=${encodeURIComponent(q)}` : ""}`).then((r) => r.data);
export const searchProducts = (q) => api.get(`/products?q=${encodeURIComponent(q)}`).then((r) => r.data);
export const getVariantsForProduct = (productId) =>
  api.get(`/products/${productId}/variants`).then((r) => r.data);
export const completeSale = (items, amountReceived) =>
  api.post("/sales", { items, amount_received: amountReceived }).then((r) => r.data);
export const getProducts = () => api.get("/products").then((r) => r.data);