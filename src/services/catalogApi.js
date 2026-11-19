import api from "./api";

export const listProducts = (params = "") => api.get(`/products${params}`).then((r) => r.data);
export const createProduct = (data) => api.post("/products", data).then((r) => r.data);
export const bulkCreateProducts = (data) => api.post("/products/bulk", data).then((r) => r.data);
export const getProductImportAiSuggestions = (products) =>
  api.post("/ai/product-import/suggestions", { products }).then((r) => r.data);
export const askBusinessAssistant = (question) =>
  api.post("/ai/business-assistant", { question }).then((r) => r.data);
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

export const getPublicShop = (slug) =>
  api.get(`/public/shops/${encodeURIComponent(slug)}`).then((r) => r.data);
export const createPublicOrder = (slug, data) =>
  api.post(`/public/shops/${encodeURIComponent(slug)}/orders`, data).then((r) => r.data);
export const initiatePublicMpesa = (token) =>
  api.post(`/public/orders/${encodeURIComponent(token)}/mpesa`).then((r) => r.data);

export const getPublicMpesaStatus = (token) =>
  api.get(`/public/orders/${encodeURIComponent(token)}/mpesa/status`).then((r) => r.data);

export const getPublicOrderStatus = (token) =>
  api.get(`/public/orders/${encodeURIComponent(token)}`).then((r) => r.data);
export const cancelPublicOrder = (token) =>
  api.post(`/public/orders/${encodeURIComponent(token)}/cancel`).then((r) => r.data);

export async function uploadProductImage(file) {
  const { data: upload } = await api.post("/products/image-upload", {
    content_type: file.type,
  });
  let response;
  try {
    response = await fetch(upload.upload_url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
  } catch (error) {
    throw new Error(
      "The browser could not reach Supabase Storage. Check connectivity and the browser console for CORS details.",
      { cause: error },
    );
  }
  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json();
      if (typeof payload.message === "string") detail = payload.message;
      else if (typeof payload.error === "string") detail = payload.error;
    } catch {
      detail = "";
    }
    const suffix = detail ? `: ${detail.replace(/\s+/g, " ").slice(0, 200)}` : "";
    throw new Error(`Supabase Storage rejected the photo upload (HTTP ${response.status})${suffix}.`);
  }
  return upload.image_url;
}
