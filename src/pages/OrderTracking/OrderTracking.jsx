import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getPublicOrderTracking } from "../../services/catalogApi";
import { extractErrorMessage } from "../../services/errorHandling";
import "./OrderTracking.css";

const STATUS_LABELS = {
  pending: "Awaiting shop acceptance",
  accepted: "Accepted",
  rejected: "Rejected",
  preparing: "Being prepared",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered / collected",
  completed: "Order closed",
  cancelled: "Cancelled",
};

const PAYMENT_LABELS = {
  pending: "Payment due",
  initiated: "M-Pesa in progress",
  paid: "Payment confirmed",
  failed: "Payment failed",
  refunded: "Refunded",
};

function normalizeTrackingCode(value) {
  return value.trim().replace(/[\s-]/g, "").toUpperCase();
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get("code") || "";
  const [trackingCode, setTrackingCode] = useState(initialCode);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialCode));
  const [error, setError] = useState("");

  async function lookupOrder(value) {
    const code = normalizeTrackingCode(value);
    if (!/^[A-Z0-9]{12}$/.test(code)) {
      setOrder(null);
      setError("Enter the 12-character tracking code from your order confirmation.");
      return;
    }

    setTrackingCode(value);
    setLoading(true);
    setError("");
    try {
      setOrder(await getPublicOrderTracking(code));
    } catch (err) {
      setOrder(null);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialCode) return undefined;
    let active = true;
    const code = normalizeTrackingCode(initialCode);
    getPublicOrderTracking(code)
      .then((result) => {
        if (active) {
          setOrder(result);
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
          setOrder(null);
          setError(extractErrorMessage(err));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialCode]);

  function submitLookup(event) {
    event.preventDefault();
    lookupOrder(trackingCode);
  }

  const terminal = order && ["rejected", "cancelled"].includes(order.status);
  const progress = order
    ? [
      "pending",
      "accepted",
      "preparing",
      order.fulfilment === "pickup" ? "ready_for_pickup" : "out_for_delivery",
      "delivered",
      "completed",
    ]
    : [];
  const currentStep = order ? progress.indexOf(order.status) : -1;

  return (
    <main className="order-tracking-page">
      <section className="order-tracking-card">
        <a className="order-tracking-home" href="/">Retail shop</a>
        <span className="order-tracking-kicker">ORDER TRACKING</span>
        <h1>Check your order</h1>
        <p className="order-tracking-intro">
          Enter the tracking code you received after placing your order. No account or app needed.
        </p>

        <form className="order-tracking-form" onSubmit={submitLookup}>
          <label htmlFor="order-tracking-code">Tracking code</label>
          <input
            id="order-tracking-code"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={14}
            value={trackingCode}
            onChange={(event) => setTrackingCode(event.target.value)}
            placeholder="e.g. ABCD-EFGH-JK23"
            aria-describedby={error ? "order-tracking-error" : undefined}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Checking…" : order ? "Refresh order status" : "Track order"}
          </button>
        </form>

        {error && <p className="order-tracking-error" id="order-tracking-error" role="alert">{error}</p>}

        {order && (
          <section className="order-tracking-result" aria-live="polite">
            <div className="order-tracking-reference">
              <span>Order number</span>
              <strong>{order.order_number}</strong>
            </div>
            <div className={`order-tracking-status${terminal ? " is-terminal" : ""}`}>
              <span>Current status</span>
              <strong>{STATUS_LABELS[order.status] || order.status}</strong>
            </div>

            {terminal ? (
              <p className="order-tracking-terminal">
                {order.status === "cancelled"
                  ? "This order has been cancelled."
                  : "The shop could not accept this order. Please contact the shop if you need help."}
              </p>
            ) : (
              <ol className="order-tracking-progress" aria-label="Order progress">
                {progress.map((status, index) => (
                  <li
                    className={index < currentStep ? "is-complete" : index === currentStep ? "is-current" : ""}
                    key={status}
                    aria-current={index === currentStep ? "step" : undefined}
                  >
                    <span className="order-tracking-step-marker" aria-hidden="true">
                      {index < currentStep ? "✓" : index + 1}
                    </span>
                    <span>{STATUS_LABELS[status]}</span>
                  </li>
                ))}
              </ol>
            )}

            <dl className="order-tracking-details">
              <div>
                <dt>Payment</dt>
                <dd>{PAYMENT_LABELS[order.payment_status] || order.payment_status}</dd>
              </div>
              <div>
                <dt>Fulfilment</dt>
                <dd>{order.fulfilment === "pickup" ? "Pickup" : "Delivery"}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDate(order.updated_at)}</dd>
              </div>
            </dl>
          </section>
        )}
      </section>
    </main>
  );
}
