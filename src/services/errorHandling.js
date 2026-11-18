function getPlanFeatureName(error) {
  const url = String(error.config?.url || error.request?.responseURL || "");

  if (/\/reports\/summary(?:\?|$)/i.test(url)) return "full business reports";
  if (/\/audit(?:\?|\/|$)/i.test(url)) return "activity history";
  if (/\/expenses(?:\?|\/|$)/i.test(url)) return "expense tracking";
  if (/\/orders(?:\?|\/|$)/i.test(url)) return "online order management";
  if (/\/public\/shops(?:\/|$)/i.test(url)) return "the public storefront and online ordering";
  if (/\/inventory\/\d+\/movements(?:\?|$)/i.test(url)) return "stock movement history";
  if (/\/variants\/\d+\/price-history(?:\?|$)/i.test(url)) return "stock and price history";
  if (/\/sales\/(?:mpesa|manual-mpesa|.*(?:mpesa|manual-payment))/i.test(url)) {
    return "M-Pesa payment tools";
  }
  return "this feature";
}

export function getPlanAccessMessage(err, featureName = getPlanFeatureName(err)) {
  if (err.response?.status !== 402) return null;

  const detail = err.response.data?.detail;
  const message = typeof detail === "string" ? detail : "";
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("suspended by")) {
    return `${featureName} has been paused for this shop by RIS. Please contact RIS support for help restoring access.`;
  }
  if (normalizedMessage.includes("optional services are suspended")) {
    return `Optional services are paused for this shop, so ${featureName} is unavailable. An administrator can review Plans & Billing to restore access.`;
  }
  if (normalizedMessage.includes("subscription has expired") || normalizedMessage.includes("subscription is inactive")) {
    return `This shop’s subscription has expired, so ${featureName} is unavailable. An administrator can review Plans & Billing to restore access.`;
  }
  if (normalizedMessage.includes("not included in your current plan")) {
    return `${featureName} isn’t included in this shop’s current plan. An administrator can compare Plans & Billing to see which plan includes it.`;
  }
  if (normalizedMessage.includes("active users") && normalizedMessage.includes("upgrade")) {
    return `${message} An administrator can compare Plans & Billing to add more team members.`;
  }

  return message || `Your current plan doesn’t allow ${featureName}. An administrator can review Plans & Billing for details.`;
}

export function extractErrorMessage(err) {
  if (err.response) {
    if (err.response.status === 402) {
      return getPlanAccessMessage(err);
    }

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