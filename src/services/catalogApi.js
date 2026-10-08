import api from "./api";

export const listProducts = (params = "") => api.get(`/products${params}`).then((r) => r.data);
export const createProduct = (data) => api.post("/products", data).then((r) => r.data);
export const updateProduct = (id, data) => api.patch(`/products/${id}`, data).then((r) => r.data);
export const deactivateProduct = (id) => api.delete(`/products/${id}`);
export const reactivateProduct = (id) => api.post(`/products/${id}/reactivate`).then((r) => r.data);
export const permanentlyDeleteProduct = (id) => api.delete(`/products/${id}/permanent`);

export const listVariants = (productId, includeInactive = false) =>
  api.get(`/products/${productId}/variants?include_inactive=${includeInactive}`).then((r) => r.data);
export const createVariant = (productId, data) =>
  api.post(`/products/${productId}/variants`, data).then((r) => r.data);
export const updateVariant = (variantId, data) =>
  api.patch(`/variants/${variantId}`, data).then((r) => r.data);
export const deactivateVariant = (variantId) => api.delete(`/variants/${variantId}`);