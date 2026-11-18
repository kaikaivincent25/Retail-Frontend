import { useEffect, useState } from "react";
import { extractErrorMessage } from "../../services/errorHandling";
import { confirmCustomerOrderPayment, listCustomerOrders, updateCustomerOrder } from "../../services/ordersApi";
import "./Orders.css";

const labels = { pending: "Pending", accepted: "Accepted", rejected: "Rejected", preparing: "Preparing", ready_for_pickup: "Ready for pickup", out_for_delivery: "Out for delivery", delivered: "Delivered", completed: "Completed", cancelled: "Cancelled" };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const refresh = () => listCustomerOrders()
    .then((result) => {
      setOrders(result);
      setError("");
    })
    .catch((err) => setError(extractErrorMessage(err)));
  useEffect(refresh, []);
  async function changeStatus(order, next) {
    try { const updated = await updateCustomerOrder(order.id, { status: next }); setOrders((current) => current.map((item) => item.id === updated.id ? updated : item)); }
    catch (err) { setError(extractErrorMessage(err)); }
  }
  async function confirmPayment(order) {
    const receipt = window.prompt("Enter the M-Pesa receipt number");
    if (!receipt) return;
    try { const updated = await confirmCustomerOrderPayment(order.id, receipt); setOrders((current) => current.map((item) => item.id === updated.id ? updated : item)); }
    catch (err) { setError(extractErrorMessage(err)); }
  }
  const activeCount = orders.filter((order) => !["completed", "rejected", "cancelled"].includes(order.status)).length;
  const awaitingPaymentCount = orders.filter((order) => order.payment_method === "manual_mpesa" && order.payment_status !== "paid").length;

  return <div className="orders-page">
    <header className="orders-header">
      <div>
        <span className="orders-eyebrow">ONLINE SALES <i aria-hidden="true" /></span>
        <h1>Customer orders</h1>
        <p>Review guest orders and move them through fulfilment.</p>
      </div>
      <button className="orders-refresh" onClick={refresh}><span aria-hidden="true">↻</span> Refresh</button>
    </header>
    <section className="orders-summary" aria-label="Order summary">
      <div><span className="summary-icon summary-icon-blue" aria-hidden="true">↗</span><div><strong>{activeCount}</strong><span>Active orders</span></div></div>
      <div><span className="summary-icon summary-icon-orange" aria-hidden="true">₿</span><div><strong>{awaitingPaymentCount}</strong><span>Payments to confirm</span></div></div>
      <div><span className="summary-icon summary-icon-green" aria-hidden="true">✓</span><div><strong>{orders.length}</strong><span>Total received</span></div></div>
    </section>
    {error && <p className="orders-error">{error}</p>}
    <section className="orders-list" aria-live="polite">
      {orders.map((order, index) => <article className="order-card" style={{ "--order-index": index }} key={order.id}>
        <div className="order-card-header">
          <div className="order-reference"><strong>{order.order_number}</strong><span>{new Date(order.created_at).toLocaleString()}</span></div>
          <b className={`order-status ${order.status}`}><i aria-hidden="true" />{labels[order.status] || order.status}</b>
        </div>
        <div className="order-card-body">
          <div className="order-customer"><strong>{order.customer_name}</strong><span>{order.customer_phone} · {order.fulfilment === "delivery" ? "Delivery" : "Pickup"}</span><span>{order.delivery_address || order.estate || "Shop pickup"}</span></div>
          <div className="order-items">{order.items.map((item) => <span key={item.variant_id}><b>{item.quantity}×</b> {item.variant_name}</span>)}</div>
        </div>
        <div className="order-card-footer"><strong className="order-total">KSh {Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong><div className="order-actions">{order.payment_method === "manual_mpesa" && order.payment_status !== "paid" && <button onClick={() => confirmPayment(order)} className="order-payment">Confirm M-Pesa</button>}{order.status === "pending" && <><button onClick={() => changeStatus(order, "rejected")} className="order-reject">Reject</button><button onClick={() => changeStatus(order, "accepted")}>Accept order</button></>}{order.status === "accepted" && <button onClick={() => changeStatus(order, "preparing")}>Start preparing</button>}{order.status === "preparing" && <button onClick={() => changeStatus(order, order.fulfilment === "pickup" ? "ready_for_pickup" : "out_for_delivery")}>{order.fulfilment === "pickup" ? "Ready for pickup" : "Send for delivery"}</button>}{(order.status === "ready_for_pickup" || order.status === "out_for_delivery") && <button onClick={() => changeStatus(order, "completed")}>Complete order</button>}</div></div>
      </article>)}
      {!error && !orders.length && <div className="orders-empty"><div className="orders-empty-icon" aria-hidden="true">⌁</div><h2>No online orders yet</h2><p>Orders submitted through your public shop link will appear here.</p></div>}
    </section>
  </div>;
}
