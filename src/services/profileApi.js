import api from "./api";

export const getMe = () => api.get("/auth/me").then((r) => r.data);
export const updateMe = (data) => api.patch("/auth/me", data).then((r) => r.data);
export const changePassword = (data) => api.post("/auth/change-password", data);
export const getShop = () => api.get("/shop").then((r) => r.data);
export const updateShop = (data) => api.patch("/shop", data).then((r) => r.data);
export const getPaymentDestinations = () =>
  api.get("/shop/payment-destinations").then((r) => r.data);