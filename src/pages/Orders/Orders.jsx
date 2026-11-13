import { useEffect, useState } from "react";
import { confirmCustomerOrderPayment, listCustomerOrders, updateCustomerOrder } from "../../services/ordersApi";
import "./Orders.css";

const labels = { pending: "Pending", accepted: "Accepted", rejected: "Rejected", preparing: "Preparing", ready_for_pickup: "Ready for pickup", out_for_delivery: "Out for delivery", delivered: "Delivered", completed: "Completed", cancelled: "Cancelled" };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const refresh = () => listCustomerOrders().then(setOrders).catch(() => setError("Could not load online orders."));
  useEffect(refresh, []);
  async function changeStatus(order, next) {
    try { const updated = await updateCustomerOrder(order.id, { status: next }); setOrders((current) => current.map((item) => item.id === updated.id ? updated : item)); }
    catch (err) { setError(err.response?.data?.detail || "Could not update the order."); }
  }
  async function confirmPayment(order) {
    const receipt = window.prompt("Enter the M-Pesa receipt number");
    if (!receipt) return;
    try { const updated = await confirmCustomerOrderPayment(order.id, receipt); setOrders((current) => current.map((item) => item.id === updated.id ? updated : item)); }
    catch (err) { setError(err.response?.data?.detail || "Could not confirm payment."); }
  }
  return <div className="orders-page"><header><div><span className="orders-eyebrow">ONLINE SALES</span><h1>Customer orders</h1><p>Review guest orders before they become POS sales.</p></div><button onClick={refresh}>Refresh</button></header>{error && <p className="orders-error">{error}</p>}<section className="orders-list">{orders.map((order) => <article className="order-card" key={order.id}><div className="order-card-header"><div><strong>{order.order_number}</strong><span>{new Date(order.created_at).toLocaleString()}</span></div><b className={`order-status ${order.status}`}>{labels[order.status] || order.status}</b></div><div className="order-customer"><strong>{order.customer_name}</strong><span>{order.customer_phone} · {order.fulfilment === "delivery" ? "Delivery" : "Pickup"}</span><span>{order.delivery_address || order.estate || "Shop pickup"}</span></div><div className="order-items">{order.items.map((item) => <span key={item.variant_id}>{item.quantity} × {item.variant_name}</span>)}</div><div className="order-card-footer"><strong>KSh {Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong><div>{order.payment_method === "manual_mpesa" && order.payment_status !== "paid" && <button onClick={() => confirmPayment(order)} className="order-payment">Confirm M-Pesa</button>}{order.status === "pending" && <><button onClick={() => changeStatus(order, "rejected")} className="order-reject">Reject</button><button onClick={() => changeStatus(order, "accepted")}>Accept order</button></>}{order.status === "accepted" && <button onClick={() => changeStatus(order, "preparing")}>Start preparing</button>}{order.status === "preparing" && <button onClick={() => changeStatus(order, order.fulfilment === "pickup" ? "ready_for_pickup" : "out_for_delivery")}>{order.fulfilment === "pickup" ? "Ready for pickup" : "Send for delivery"}</button>}{(order.status === "ready_for_pickup" || order.status === "out_for_delivery") && <button onClick={() => changeStatus(order, "completed")}>Complete order</button>}</div></div></article>)}{!orders.length && <div className="orders-empty"><h2>No online orders yet</h2><p>Orders submitted through your public shop link will appear here.</p></div>}</section></div>;
}
