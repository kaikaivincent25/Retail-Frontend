import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getPublicOrderTracking,
  requestPublicOrderReminder,
} from "../../services/catalogApi";
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

const STATUS_DESCRIPTIONS = {
  pending: "The shop has received your order. You can check back here as it progresses.",
  accepted: "The shop has accepted your order and will update this page as they prepare it.",
  preparing: "Your items are being prepared. We’ll show the next update here.",
  ready_for_pickup: "Your order is ready for collection.",
  out_for_delivery: "Your order is on its way.",
  delivered: "The order has been marked as delivered or collected.",
  completed: "Your order is complete. Thank you for shopping with us.",
  rejected: "The shop could not accept this order. Please contact the shop if you need help.",
  cancelled: "This order has been cancelled.",
};

const ACTIVE_STATUSES = [
  "pending",
  "accepted",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
];
const REMINDER_DELAY_MS = 30 * 60 * 1000;

function normalizeTrackingCode(value) {
  return value.trim().replace(/[\s-]/g, "").toUpperCase();
}

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTimeSince(value, now) {
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Just updated";
  if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes
    ? `Updated ${hours}h ${remainingMinutes}m ago`
    : `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
}

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get("code") || "";
  const [trackingCode, setTrackingCode] = useState(initialCode);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialCode));
  const [reminderLoading, setReminderLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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

  async function remindShop() {
    if (!order || reminderLoading) return;
    setReminderLoading(true);
    setError("");
    try {
      setOrder(await requestPublicOrderReminder(normalizeTrackingCode(trackingCode)));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setReminderLoading(false);
    }
  }

  const isActive = order && ACTIVE_STATUSES.includes(order.status);
  const reminderSent = Boolean(order?.customer_reminder_requested_at);
  const reminderAvailableAt = order
    ? new Date(order.last_status_update_at).getTime() + REMINDER_DELAY_MS
    : 0;
  const canRemind = isActive && !reminderSent && now >= reminderAvailableAt;
  const minutesUntilReminder = Math.max(1, Math.ceil((reminderAvailableAt - now) / 60_000));

  return (
    <main className="order-tracking-page">
      <div className="order-tracking-shell">
        <header className="tracking-header">
          <a className="order-tracking-home" href="/">
            <span aria-hidden="true">←</span> Retail shop
          </a>
          <span className="order-tracking-kicker">ORDER TRACKING</span>
          <h1>Your order, at a glance.</h1>
          <p>Check progress anytime with your code. No account or app required.</p>
        </header>

        <section className="tracking-lookup">
          <form className="order-tracking-form" onSubmit={submitLookup}>
            <label htmlFor="order-tracking-code">Your tracking code</label>
            <div className="tracking-input-row">
              <input
                id="order-tracking-code"
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={14}
                value={trackingCode}
                onChange={(event) => setTrackingCode(event.target.value)}
                placeholder="ABCD-EFGH-JK23"
                aria-describedby={error ? "order-tracking-error" : "order-tracking-hint"}
              />
              <button type="submit" disabled={loading}>
                {loading ? "Checking…" : "Check status"}
              </button>
            </div>
            <small id="order-tracking-hint">The 12-character code shown after you placed your order.</small>
          </form>
        </section>

        {error && <p className="order-tracking-error" id="order-tracking-error" role="alert">{error}</p>}
        {loading && <p className="tracking-loading" role="status">Finding your order…</p>}

        {order && (
          <div className="tracking-content" aria-live="polite">
            <section className={`tracking-hero status-${order.status}`}>
              <div className="tracking-hero-top">
                <span className="tracking-status-icon" aria-hidden="true">
                  {["rejected", "cancelled"].includes(order.status) ? "!" : "✓"}
                </span>
                <span className="tracking-status-pill">
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <p className="tracking-order-number">ORDER {order.order_number}</p>
              <h2>{STATUS_LABELS[order.status] || order.status}</h2>
              <p className="tracking-reassurance">
                {STATUS_DESCRIPTIONS[order.status] || "Your order status is shown below."}
              </p>
              <div className="tracking-last-update">
                <span aria-hidden="true">◷</span>
                <span>{formatTimeSince(order.last_status_update_at, now)}</span>
                <span className="tracking-date">{formatDate(order.last_status_update_at)}</span>
              </div>
            </section>

            {isActive && (
              <section className={`tracking-reminder${reminderSent ? " is-sent" : ""}`} aria-live="polite">
                <span className="tracking-reminder-icon" aria-hidden="true">{reminderSent ? "✓" : "i"}</span>
                <div>
                  <strong>{reminderSent ? "The shop has been reminded" : "Need an update?"}</strong>
                  <p>
                    {reminderSent
                      ? "Your request is visible to the shop team. You can check here again for progress."
                      : canRemind
                        ? "There hasn’t been an update for 30 minutes. We can let the shop know you’re waiting."
                        : `If there’s no update for 30 minutes, you can ask the shop for one. You can check back here anytime (about ${minutesUntilReminder} min to go).`}
                  </p>
                </div>
                {!reminderSent && canRemind && (
                  <button type="button" onClick={remindShop} disabled={reminderLoading}>
                    {reminderLoading ? "Sending…" : "Remind the shop"}
                  </button>
                )}
              </section>
            )}

            <div className="tracking-main-grid">
              <section className="tracking-panel tracking-timeline">
                <div className="tracking-panel-heading">
                  <div>
                    <span>PROGRESS</span>
                    <h3>Order updates</h3>
                  </div>
                  <button type="button" onClick={() => lookupOrder(trackingCode)} disabled={loading}>
                    {loading ? "Checking…" : "Refresh"}
                  </button>
                </div>
                {order.status_updates.length ? (
                  <ol className="tracking-events">
                    {order.status_updates.map((update, index) => (
                      <li
                        className={index === order.status_updates.length - 1 ? "is-latest" : ""}
                        key={`${update.status}-${update.created_at}`}
                      >
                        <span className="tracking-event-marker" aria-hidden="true">
                          {index === order.status_updates.length - 1 ? "•" : "✓"}
                        </span>
                        <div>
                          <strong>{STATUS_LABELS[update.status] || update.status}</strong>
                          <time dateTime={update.created_at}>{formatDate(update.created_at)}</time>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="tracking-empty-events">Updates will appear here as the shop progresses your order.</p>
                )}
              </section>

              <section className="tracking-panel tracking-order-details">
                <span>ORDER DETAILS</span>
                <h3>Everything in one place</h3>
                <dl>
                  <div>
                    <dt>Order number</dt>
                    <dd>{order.order_number}</dd>
                  </div>
                  <div>
                    <dt>Placed</dt>
                    <dd>{formatDate(order.created_at)}</dd>
                  </div>
                  <div>
                    <dt>Fulfilment</dt>
                    <dd>{order.fulfilment === "pickup" ? "Pickup" : "Delivery"}</dd>
                  </div>
                  <div>
                    <dt>Payment</dt>
                    <dd>{PAYMENT_LABELS[order.payment_status] || order.payment_status}</dd>
                  </div>
                </dl>
                <p className="tracking-help-note">
                  This page updates when the shop changes your order. If you have a question, you can contact the shop directly.
                </p>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
