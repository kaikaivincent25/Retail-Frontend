import api from "./api";

export const listInventory = () => api.get("/inventory").then((r) => r.data);
export const listLowStock = () => api.get("/inventory/low-stock").then((r) => r.data);
export const adjustStock = (variantId, data) =>
  api.post(`/inventory/${variantId}/adjust`, data).then((r) => r.data);
export const getMovements = (variantId) =>
  api.get(`/inventory/${variantId}/movements`).then((r) => r.data);