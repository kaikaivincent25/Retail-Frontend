export function toMoneyNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const normalized = String(value).replace(/[^0-9.-]/g, "");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function toCents(value) {
  return Math.round((toMoneyNumber(value) + Number.EPSILON) * 100);
}

export function fromCents(value) {
  return Number((Number(value) / 100).toFixed(2));
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toMoneyNumber(value));
}
