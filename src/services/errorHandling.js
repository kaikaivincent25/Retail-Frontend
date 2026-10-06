export function extractErrorMessage(err) {
  if (err.response) {
    const detail = err.response.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      // FastAPI/Pydantic validation errors come as a list of {loc, msg, ...}
      return detail.map((d) => d.msg).join("; ");
    }
    if (err.response.status === 401) return "Your session has expired. Please log in again.";
    if (err.response.status >= 500) return "Something went wrong on our end. Please try again.";
    return "Something went wrong. Please try again.";
  }
  if (err.request) {
    return "Could not reach the server. Check your connection and try again.";
  }
  return "An unexpected error occurred.";
}