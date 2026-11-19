import { useEffect, useState } from "react";
import {
  confirmCustomerOrderPayment,
  getCustomerOrderHistory,
  listCustomerOrders,
  recordCustomerOrderPayment,
  updateCustomerOrder,
} from "../../services/ordersApi";
import { extractErrorMessage } from "../../services/errorHandling";
import "./Orders.css";

const STATUS_LABELS = {
  pending: "Awaiting acceptance",
  accepted: "Accepted",
  rejected: "Rejected",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered / collected",
  completed: "Closed",
  cancelled: "Cancelled",
};

const PAYMENT_LABELS = {
  pending: "Payment due",
  initiated: "M-Pesa in progress",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

const EVENT_LABELS = {
  order_placed: "Order placed",
  status_changed: "Order stage updated",
  payment_initiated: "Payment started",
  payment_confirmed: "Payment confirmed",
  payment_failed: "Payment failed",
};

function formatDate(value) {
  return new Date(value).toLocaleString();
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [histories, setHistories] = useState({});
  const [historyErrors, setHistoryErrors] = useState({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    listCustomerOrders({
      status: statusFilter,
      paymentStatus: paymentFilter,
      search,
    })
      .then((result) => {
        if (active) {
          setOrders(result);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(extractErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [statusFilter, paymentFilter, search, refreshKey]);

  async function changeStatus(order, nextStatus) {
    let receivedByName;
    if (nextStatus === "delivered") {
      receivedByName = window.prompt(
        order.fulfilment === "pickup"
          ? "Who collected the order?"
          : "Who received the delivery?",
      )?.trim();
      if (!receivedByName) return;
    }

    setSavingOrder(order.id);
    setError("");
    try {
      const updated = await updateCustomerOrder(order.id, {
        status: nextStatus,
        ...(receivedByName ? { received_by_name: receivedByName } : {}),
      });
      setOrders((current) => current.map((item) => item.id === updated.id ? updated : item));
      setHistories((current) => {
        const next = { ...current };
        delete next[order.id];
        return next;
      });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSavingOrder(null);
    }
  }

  async function recordPayment(order) {
    let updated;
    setSavingOrder(order.id);
    setError("");
    try {
      if (order.payment_method === "manual_mpesa") {
        const receipt = window.prompt("Enter the M-Pesa receipt number")?.trim();
        if (!receipt) return;
        updated = await confirmCustomerOrderPayment(order.id, receipt);
      } else {
        const reference = window.prompt("Payment reference (optional)", "");
        if (reference === null) return;
        updated = await recordCustomerOrderPayment(order.id, reference.trim());
      }
      setOrders((current) => current.map((item) => item.id === updated.id ? updated : item));
      setHistories((current) => {
        const next = { ...current };
        delete next[order.id];
        return next;
      });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSavingOrder(null);
    }
  }

  async function toggleHistory(order) {
    if (expandedOrder === order.id) {
      setExpandedOrder(null);
      return;
    }
    setExpandedOrder(order.id);
    if (histories[order.id]) return;

    setHistoryErrors((current) => ({ ...current, [order.id]: "" }));
    try {
      const events = await getCustomerOrderHistory(order.id);
      setHistories((current) => ({ ...current, [order.id]: events }));
    } catch (err) {
      setHistoryErrors((current) => ({
        ...current,
        [order.id]: extractErrorMessage(err),
      }));
    }
  }

  const activeCount = orders.filter(
    (order) => !["completed", "rejected", "cancelled"].includes(order.status),
  ).length;
  const awaitingPaymentCount = orders.filter(
    (order) => !["rejected", "cancelled"].includes(order.status)
      && order.payment_status !== "paid",
  ).length;

  return (
    <div className="orders-page">
      <header className="orders-header">
        <div>
          <span className="orders-eyebrow">ONLINE SALES <i aria-hidden="true" /></span>
          <h1>Customer orders</h1>
          <p>Track fulfilment and payment separately from placement to close.</p>
        </div>
        <button className="orders-refresh" type="button" onClick={() => setRefreshKey((key) => key + 1)}>
          <span aria-hidden="true">↻</span> Refresh
        </button>
      </header>

      <section className="orders-summary" aria-label="Order summary">
        <div><span className="summary-icon summary-icon-blue" aria-hidden="true">↗</span><div><strong>{activeCount}</strong><span>Open orders shown</span></div></div>
        <div><span className="summary-icon summary-icon-orange" aria-hidden="true">₿</span><div><strong>{awaitingPaymentCount}</strong><span>Awaiting payment</span></div></div>
        <div><span className="summary-icon summary-icon-green" aria-hidden="true">✓</span><div><strong>{orders.length}</strong><span>Orders shown</span></div></div>
      </section>

      <section className="orders-filters" aria-label="Filter orders">
        <label>
          Search orders
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Order number, customer, or phone"
          />
        </label>
        <label>
          Fulfilment stage
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All stages</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Payment
          <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
            <option value="">All payment states</option>
            {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </section>

      {error && <p className="orders-error" role="alert">{error}</p>}
      <section className="orders-list" aria-live="polite">
        {loading ? (
          <p className="orders-loading" role="status">Loading orders…</p>
        ) : orders.map((order, index) => {
          const busy = savingOrder === order.id;
          const paymentAllowedStage = order.payment_method === "pay_at_pickup"
            ? ["ready_for_pickup", "delivered"].includes(order.status)
            : ["out_for_delivery", "delivered"].includes(order.status);
          const canPay = !["paid", "refunded"].includes(order.payment_status)
            && !["rejected", "cancelled"].includes(order.status);
          const showPaymentAction = canPay && (
            order.payment_method === "manual_mpesa" || paymentAllowedStage
          );

          return (
            <article className="order-card" style={{ "--order-index": index }} key={order.id}>
              <div className="order-card-header">
                <div className="order-reference">
                  <strong>{order.order_number}</strong>
                  <span>{formatDate(order.created_at)}</span>
                </div>
                <div className="order-badges">
                  <b className={`order-status ${order.status}`}>
                    <i aria-hidden="true" />{STATUS_LABELS[order.status] || order.status}
                  </b>
                  <b className={`order-payment-status ${order.payment_status}`}>
                    {PAYMENT_LABELS[order.payment_status] || order.payment_status}
                  </b>
                </div>
              </div>

              <div className="order-card-body">
                <div className="order-customer">
                  <strong>{order.customer_name}</strong>
                  <span>{order.customer_phone} · {order.fulfilment === "delivery" ? "Delivery" : "Pickup"}</span>
                  <span>{order.delivery_address || order.estate || "Shop pickup"}</span>
                  {order.received_by_name && <span>Received by {order.received_by_name}</span>}
                </div>
                <div className="order-items">
                  {order.items.map((item) => (
                    <span key={item.variant_id}><b>{item.quantity}×</b> {item.variant_name}</span>
                  ))}
                </div>
              </div>

              <div className="order-card-footer">
                <div className="order-total-block">
                  <strong className="order-total">KSh {Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                  <span>{order.payment_method.replaceAll("_", " ")}</span>
                  {order.payment_reference && <span>Ref: {order.payment_reference}</span>}
                </div>
                <div className="order-actions">
                  {order.status === "pending" && (
                    <>
                      <button type="button" disabled={busy} onClick={() => changeStatus(order, "rejected")} className="order-reject">Reject</button>
                      <button type="button" disabled={busy} onClick={() => changeStatus(order, "accepted")}>Accept order</button>
                    </>
                  )}
                  {order.status === "accepted" && <button type="button" disabled={busy} onClick={() => changeStatus(order, "preparing")}>Start preparing</button>}
                  {order.status === "preparing" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => changeStatus(order, order.fulfilment === "pickup" ? "ready_for_pickup" : "out_for_delivery")}
                    >
                      {order.fulfilment === "pickup" ? "Ready for pickup" : "Send for delivery"}
                    </button>
                  )}
                  {(order.status === "ready_for_pickup" || order.status === "out_for_delivery") && (
                    <button type="button" disabled={busy} onClick={() => changeStatus(order, "delivered")}>
                      {order.fulfilment === "pickup" ? "Mark collected" : "Mark delivered"}
                    </button>
                  )}
                  {showPaymentAction && (
                    <button type="button" disabled={busy} onClick={() => recordPayment(order)} className="order-payment">
                      {order.payment_method === "manual_mpesa" ? "Confirm M-Pesa" : "Record payment"}
                    </button>
                  )}
                  {order.status === "delivered" && order.payment_status === "paid" && (
                    <button type="button" disabled={busy} onClick={() => changeStatus(order, "completed")}>Close order</button>
                  )}
                  {busy && <span className="order-saving" role="status">Saving…</span>}
                </div>
              </div>

              <button
                type="button"
                className="order-history-toggle"
                aria-expanded={expandedOrder === order.id}
                onClick={() => toggleHistory(order)}
              >
                {expandedOrder === order.id ? "Hide order history" : "View order history"}
              </button>
              {expandedOrder === order.id && (
                <div className="order-history">
                  {historyErrors[order.id] && <p className="orders-error">{historyErrors[order.id]}</p>}
                  {!histories[order.id] && !historyErrors[order.id] && <p>Loading order history…</p>}
                  {histories[order.id]?.map((event) => (
                    <div className="order-history-event" key={event.id}>
                      <strong>{EVENT_LABELS[event.event_type] || event.event_type}</strong>
                      <span>{event.actor_name || "Customer / system"} · {formatDate(event.created_at)}</span>
                      {event.to_status && <span>{STATUS_LABELS[event.to_status] || event.to_status}</span>}
                      {event.details && <p>{event.details}</p>}
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
        {!loading && !error && !orders.length && (
          <div className="orders-empty">
            <div className="orders-empty-icon" aria-hidden="true">⌁</div>
            <h2>No matching orders</h2>
            <p>Orders placed through your public shop link will appear here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
