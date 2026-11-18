export function extractErrorMessage(err) {
  if (err.response) {
    const detail = err.response.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      // FastAPI/Pydantic validation errors come as a list of {loc, msg, ...}
      const messages = detail.map((item) => item.msg || item.message).filter(Boolean);
      if (messages.length) return messages.join("; ");
    }
    if (detail && typeof detail === "object") {
      if (typeof detail.message === "string") return detail.message;
      if (typeof detail.msg === "string") return detail.msg;
    }
    if (err.response.status === 401) return "Your session has expired. Please log in again.";
    if (err.response.status >= 500) {
      const errorId = err.response.data?.error_id;
      return errorId
        ? `Something went wrong on our end. Please try again. Reference: ${errorId}`
        : "Something went wrong on our end. Please try again.";
    }
    return "Something went wrong. Please try again.";
  }
  if (err.request) {
    return "Could not reach the server. Check your connection and try again.";
  }
  return err.message || "An unexpected error occurred.";
}