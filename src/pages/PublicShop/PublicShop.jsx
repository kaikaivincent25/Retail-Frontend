import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createPublicOrder,
  cancelPublicOrder,
  getPublicMpesaStatus,
  getPublicOrderStatus,
  getPublicShop,
  initiatePublicMpesa,
} from "../../services/catalogApi";
import "./PublicShop.css";

function formatPrice(value, currency) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: currency || "KES", maximumFractionDigits: 2 }).format(Number(value));
}

function formatTrackingCode(value) {
  return value?.match(/.{1,4}/g)?.join("-") || value;
}

function getErrorMessage(error, fallback) {
  if (error.response?.status === 402) {
    const detail = String(error.response.data?.detail || "").toLowerCase();
    if (detail.includes("suspended by")) {
      return "This shop’s online ordering has been temporarily paused by RIS. Please contact the shop directly for help.";
    }
    if (detail.includes("optional services are suspended")) {
      return "This shop’s online ordering is temporarily unavailable while its optional services are paused. Please contact the shop directly.";
    }
    if (detail.includes("subscription has expired") || detail.includes("subscription is inactive")) {
      return "This shop’s online ordering is temporarily unavailable because its subscription needs attention. Please contact the shop directly.";
    }
    return "Public ordering isn’t included in this shop’s current plan. Please contact the shop directly to place an order.";
  }
  if (!error.response) {
    if (error.request) return "Could not reach the shop server. Check your connection and try again.";
    return error.message || fallback;
  }
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg || item.message).filter(Boolean).join(" ") || fallback;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string") return detail.message;
    if (typeof detail.msg === "string") return detail.msg;
  }
  if (error.response.status >= 500) {
    const errorId = error.response.data?.error_id;
    return errorId ? `${fallback} Reference: ${errorId}` : fallback;
  }
  return fallback;
}

const ORDER_STATUS_LABELS = {
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

function getPublicPaymentLabel(order) {
  if (order.payment_status === "paid") return "Payment confirmed";
  if (order.payment_method === "manual_mpesa") {
    if (order.payment_status === "initiated") return "Waiting for M-Pesa confirmation";
    if (order.payment_status === "failed") return "M-Pesa payment failed";
    return "Pay by M-Pesa";
  }
  return order.payment_method === "pay_at_pickup" ? "Pay at pickup" : "Pay on delivery";
}

export default function PublicShop() {
  const { slug } = useParams();
  const [shopResponse, setShopResponse] = useState({
    slug: null,
    shop: null,
    error: "",
    planRestricted: false,
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [error, setError] = useState("");
  const [cart, setCart] = useState({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [order, setOrder] = useState(null);
  const [paymentError, setPaymentError] = useState("");
  const [checkingOrder, setCheckingOrder] = useState(false);
  const [trackingLinkMessage, setTrackingLinkMessage] = useState("");
  const [checkout, setCheckout] = useState({ customer_name: "", customer_phone: "", fulfilment: "delivery", payment_method: "pay_on_delivery", delivery_address: "", estate: "", landmark: "", delivery_instructions: "", preferred_delivery_time: "" });

  useEffect(() => {
    if (!checkoutOpen && !cancelConfirmOpen) return undefined;
    function handleEscape(event) {
      if (event.key !== "Escape") return;
      if (cancelConfirmOpen) setCancelConfirmOpen(false);
      else if (!submitting) setCheckoutOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [cancelConfirmOpen, checkoutOpen, submitting]);

  useEffect(() => {
    let active = true;
    getPublicShop(slug).then((data) => {
      if (!data || typeof data.name !== "string" || !Array.isArray(data.products) ||
        data.products.some((product) => !product || typeof product.name !== "string" || !Array.isArray(product.variants))) {
        throw new Error("The shop catalogue returned incomplete data. Please try again.");
      }
      if (active) setShopResponse({ slug, shop: data, error: "", planRestricted: false });
    }).catch((err) => {
      if (!active) return;
      const message = err.response?.status === 404
        ? "This shop catalogue is not available."
        : getErrorMessage(err, "Could not load this shop catalogue.");
      setShopResponse({
        slug,
        shop: null,
        error: message,
        planRestricted: err.response?.status === 402,
      });
    });
    return () => { active = false; };
  }, [slug, reloadKey]);

  const currentResponse = shopResponse.slug === slug ? shopResponse : null;
  const shop = currentResponse?.shop || null;
  const loadError = currentResponse?.error || "";

  const categories = useMemo(() => {
    const counts = new Map();
    (shop?.products || []).forEach((product) => {
      if (product.category) counts.set(product.category, (counts.get(product.category) || 0) + 1);
    });
    return [
      { name: "all", count: (shop?.products || []).length },
      ...Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
    ];
  }, [shop]);
  const products = (shop?.products || []).filter((product) => {
    const haystack = `${product.name} ${product.brand || ""} ${product.description || ""} ${product.category || ""}`.toLowerCase();
    return (selectedCategory === "all" || product.category === selectedCategory) && haystack.includes(search.toLowerCase().trim());
  });
  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((total, item) => total + Number(item.variant.selling_price) * item.quantity, 0);
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const paymentOptions = checkout.fulfilment === "pickup" ? [{ value: "pay_at_pickup", label: "Pay at pickup" }, { value: "manual_mpesa", label: "Pay with M-Pesa" }] : [{ value: "pay_on_delivery", label: "Pay on delivery" }, { value: "manual_mpesa", label: "Pay with M-Pesa" }];

  function addToCart(product, variant) {
    if (!variant.is_available) return;
    setCart((current) => ({ ...current, [variant.id]: { product, variant, quantity: Math.min((current[variant.id]?.quantity || 0) + 1, 99) } }));
    setCheckoutMessage(`${product.name} added to your cart.`);
  }

  function changeQuantity(variantId, quantity) {
    const item = cart[variantId];
    if (!item) return;
    setCheckoutMessage(quantity <= 0
      ? `${item.product.name} removed from your cart.`
      : `${item.product.name} quantity updated to ${Math.min(quantity, 99)}.`);
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[variantId];
      else next[variantId] = { ...next[variantId], quantity: Math.min(quantity, 99) };
      return next;
    });
  }

  function updateCheckout(field, value) {
    setCheckout((current) => ({ ...current, [field]: value }));
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (!cartItems.length || submitting) return;
    setSubmitting(true); setError(""); setPaymentError("");
    setTrackingLinkMessage("");
    try {
      const created = await createPublicOrder(slug, {
        ...checkout,
        customer_name: checkout.customer_name.trim(),
        customer_phone: checkout.customer_phone.trim(),
        delivery_address: checkout.delivery_address.trim() || null,
        estate: checkout.estate.trim() || null,
        landmark: checkout.landmark.trim() || null,
        delivery_instructions: checkout.delivery_instructions.trim() || null,
        preferred_delivery_time: checkout.preferred_delivery_time.trim() || null,
        items: cartItems.map((item) => ({ variant_id: item.variant.id, quantity: item.quantity })),
      });
      setOrder(created); setCart({}); setCheckoutOpen(false);
      if (checkout.payment_method === "manual_mpesa") {
        try { setOrder(await initiatePublicMpesa(created.public_token)); }
        catch (err) { setPaymentError(getErrorMessage(err, "Your order was created, but the M-Pesa prompt could not be started.")); }
      }
    } catch (err) { setError(getErrorMessage(err, "Could not submit your order.")); }
    finally { setSubmitting(false); }
  }

  async function confirmCancelOrder() {
    if (!order?.public_token || cancelling) return;
    setCancelling(true);
    setPaymentError("");
    try {
      setOrder(await cancelPublicOrder(order.public_token));
      setCancelConfirmOpen(false);
    } catch (err) {
      setPaymentError(getErrorMessage(err, "Could not cancel this order."));
      setCancelConfirmOpen(false);
    } finally {
      setCancelling(false);
    }
  }

  async function copyTrackingLink() {
    const trackingUrl = `${window.location.origin}/track-order?code=${encodeURIComponent(order.tracking_code)}`;
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setTrackingLinkMessage("Tracking link copied.");
    } catch {
      setTrackingLinkMessage("Copy is unavailable here. Open the tracking page or copy the code below.");
    }
  }

  async function refreshOrderStatus() {
    if (!order?.public_token) return;
    setCheckingOrder(true);
    setPaymentError("");
    try {
      setOrder(await getPublicOrderStatus(order.public_token));
    } catch (err) {
      setPaymentError(getErrorMessage(err, "Could not refresh this order."));
    } finally {
      setCheckingOrder(false);
    }
  }

  if (loadError) return <main className="public-shop-error" role="alert"><div><h1>{loadError}</h1><p>{currentResponse?.planRestricted ? "The shop needs to restore online ordering before this catalogue can be used. Please contact the shop directly for availability." : "Check the link or your connection, then try again."}</p>{!currentResponse?.planRestricted && <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>}</div></main>;
  if (!shop) return <main className="public-shop-loading" role="status">Loading shop catalogue…</main>;
  if (order) return (
    <main className="public-shop-confirmation">
      <div className="confirmation-card">
        <div className={`confirmation-check ${order.status === "cancelled" ? "cancelled" : ""}`}>{order.status === "cancelled" ? "×" : "✓"}</div>
        <span className="public-shop-kicker">{order.status === "cancelled" ? "ORDER CANCELLED" : "ORDER RECEIVED"}</span>
        <h1>{order.status === "cancelled" ? "Your order was cancelled." : `Thank you, ${order.customer_name}.`}</h1>
        <p>{order.status === "cancelled"
          ? `Order ${order.order_number} is no longer active.`
          : <>Your order <strong>{order.order_number}</strong> has been sent to {shop.name}.</>}</p>
        {order.tracking_code && order.status !== "cancelled" && (
          <div className="public-tracking-card">
            <span>YOUR TRACKING CODE</span>
            <strong>{formatTrackingCode(order.tracking_code)}</strong>
            <p>Save this code to check your order status later. No app or account needed.</p>
            <a href={`/track-order?code=${encodeURIComponent(order.tracking_code)}`}>Open tracking page</a>
            <button type="button" onClick={copyTrackingLink}>Copy tracking link</button>
            {trackingLinkMessage && <small role="status">{trackingLinkMessage}</small>}
          </div>
        )}
        <p className="public-order-total">{formatPrice(order.total, shop.currency)}</p>
        <div className="public-order-progress">
          <strong>Order progress</strong>
          <span>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
          <span>{getPublicPaymentLabel(order)}</span>
        </div>
        {order.status === "cancelled" && <p className="public-cancelled-note" role="status">Your order has been cancelled. The shop has been notified.</p>}
        {paymentError && <p className="public-form-error">{paymentError}</p>}
        {order.payment_method === "manual_mpesa" && (
          <p className={`public-payment-state ${order.payment_status}`}>M-Pesa payment: {order.payment_status}</p>
        )}
        {order.payment_method === "manual_mpesa" && order.payment_status === "initiated" && (
          <button type="button" onClick={() => getPublicMpesaStatus(order.public_token).then(setOrder).catch((err) => setPaymentError(getErrorMessage(err, "Could not check payment status.")))}>
            Check M-Pesa status
          </button>
        )}
        {order.payment_method === "manual_mpesa" && order.payment_status === "failed" && (
          <button
            type="button"
            onClick={() => initiatePublicMpesa(order.public_token).then(setOrder).catch((err) => setPaymentError(getErrorMessage(err, "Could not restart M-Pesa payment.")))}
          >
            Retry M-Pesa payment
          </button>
        )}
        <button type="button" disabled={checkingOrder} onClick={refreshOrderStatus}>
          {checkingOrder ? "Checking…" : "Refresh order progress"}
        </button>
        <button type="button" onClick={() => { setOrder(null); setPaymentError(""); }}>
          Continue shopping
        </button>
        {["pending", "accepted"].includes(order.status) && !["paid", "initiated"].includes(order.payment_status) && (
          <div className="public-cancel-order">
            <p>You can cancel while the shop is still preparing to accept your order.</p>
            <button type="button" className="public-cancel-order-button" onClick={() => setCancelConfirmOpen(true)}>
              Cancel this order
            </button>
          </div>
        )}
      </div>
      {cancelConfirmOpen && (
        <div className="public-checkout-backdrop public-cancel-backdrop">
          <section className="public-cancel-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cancel-order-title" aria-describedby="cancel-order-description">
            <span className="public-cancel-icon" aria-hidden="true">!</span>
            <h2 id="cancel-order-title">Cancel order {order.order_number}?</h2>
            <p id="cancel-order-description">This will notify {shop.name} and release the items in your order. You can place a new order later.</p>
            <div className="public-cancel-actions">
              <button type="button" autoFocus onClick={() => setCancelConfirmOpen(false)} disabled={cancelling}>Keep my order</button>
              <button type="button" className="public-cancel-confirm" onClick={confirmCancelOrder} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Yes, cancel order"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );

  return <main className="public-shop">
    <div className="public-shop-shell">
      <header className="public-shop-header">
        <div className="public-shop-heading">
          <span className="public-shop-kicker">LOCAL SHOP <i aria-hidden="true" /></span>
          <h1>Good things, close to home.</h1>
          <p>Shop from <strong>{shop.name}</strong>{shop.location ? ` · ${shop.location}` : ""}</p>
        </div>
        <div className="public-shop-header-actions">
          <span className="public-shop-trust"><span aria-hidden="true">✓</span> Local &amp; convenient</span>
          {shop.whatsapp_number && <a className="public-contact" href={`https://wa.me/${shop.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${shop.name}, I have a question about your products.`)}`} target="_blank" rel="noreferrer">Chat with shop <span aria-hidden="true">↗</span></a>}
        </div>
      </header>
    </div>
    <section className="public-shop-toolbar" aria-label="Catalogue filters">
      <div className="public-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, brands, or categories" aria-label="Search products" /></div>
    </section>
    <section className="public-category-section" aria-label="Browse by category">
      <div className="public-category-heading">
        <span>Browse</span>
        <strong>Shop by category</strong>
        <small>{categories.length - 1} {categories.length - 1 === 1 ? "category" : "categories"}</small>
      </div>
      <div className="public-shop-categories">
        {categories.map((category) => (
          <button
            className={selectedCategory === category.name ? "selected" : ""}
            key={category.name}
            onClick={() => setSelectedCategory(category.name)}
            aria-pressed={selectedCategory === category.name}
          >
            <span>{category.name === "all" ? "All products" : category.name}</span>
            <small>{category.count}</small>
          </button>
        ))}
      </div>
    </section>
    {error && <p className="public-form-error public-page-error">{error}</p>}
    <div className="public-results-row"><p>{products.length} {products.length === 1 ? "product" : "products"}</p>{itemCount > 0 && <button className="public-cart-pill" onClick={() => setCheckoutOpen(true)}>Cart · {itemCount} <strong>{formatPrice(cartTotal, shop.currency)}</strong></button>}</div>
    <section className="public-product-grid" aria-live="polite">{products.map((product, index) => <article className="public-product-card" style={{ "--card-index": index }} key={product.id}><div className="public-product-media">{product.image_url ? <img src={product.image_url} alt="" /> : <div className="public-product-placeholder">{product.name.slice(0, 1)}</div>}<span className="public-product-badge">{product.category || "Featured"}</span></div><div className="public-product-content"><div className="public-product-topline"><h2>{product.name}</h2>{product.brand && <p className="public-product-brand">{product.brand}</p>}</div>{product.description && <p className="public-product-description">{product.description}</p>}<div className="public-product-variants">{product.variants.map((variant) => <div className="public-variant" key={variant.id}>{variant.image_url && variant.image_url !== product.image_url && <img className="public-variant-image" src={variant.image_url} alt="" loading="lazy" />}<div><strong>{formatPrice(variant.selling_price, shop.currency)}</strong><small>{variant.name} · {variant.unit}</small></div><button disabled={!variant.is_available} onClick={() => addToCart(product, variant)}>{variant.is_available ? <><span aria-hidden="true">+</span> Add</> : "Sold out"}</button></div>)}</div>{product.availability_message && <p className="public-product-note">{product.availability_message}</p>}</div></article>)}</section>
    {!products.length && <p className="public-shop-empty">No products match your search.</p>}
    {itemCount > 0 && <aside className="public-cart"><div><strong>{itemCount} item(s)</strong><span>{formatPrice(cartTotal, shop.currency)}</span></div><button onClick={() => setCheckoutOpen(true)}>Checkout</button></aside>}
    {checkoutOpen && <div className="public-checkout-backdrop">
      <form className="public-checkout" onSubmit={submitOrder} role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <div className="public-checkout-top">
          <div className="checkout-heading">
            <span className="public-shop-kicker">SECURE CHECKOUT</span>
            <h2 id="checkout-title">Review your order</h2>
            <p>Check your items and delivery details before placing your order.</p>
          </div>
          <button type="button" autoFocus className="public-checkout-close" aria-label="Close checkout and keep shopping" onClick={() => setCheckoutOpen(false)}>×</button>
        </div>
        <div className="public-checkout-summary">
          <div className="public-checkout-summary-heading"><strong>Your items</strong><span>{itemCount} {itemCount === 1 ? "item" : "items"}</span></div>
          <div className="public-checkout-items">
            {cartItems.map((item) => (
              <div className="public-checkout-item" key={item.variant.id}>
                <span className="public-checkout-item-name">{item.product.name}<small>{item.variant.name} · {formatPrice(item.variant.selling_price, shop.currency)} each</small></span>
                <span className="public-checkout-quantity">
                  <button type="button" aria-label={`Remove one ${item.product.name}`} onClick={() => changeQuantity(item.variant.id, item.quantity - 1)}>−</button>
                  <strong>{item.quantity}</strong>
                  <button type="button" aria-label={`Add one ${item.product.name}`} onClick={() => changeQuantity(item.variant.id, item.quantity + 1)}>+</button>
                </span>
                <strong className="public-checkout-line-total">{formatPrice(Number(item.variant.selling_price) * item.quantity, shop.currency)}</strong>
              </div>
            ))}
          </div>
          <div className="public-checkout-total"><span>Total</span><strong>{formatPrice(cartTotal, shop.currency)}</strong></div>
        </div>
        {checkoutMessage && <p className="public-checkout-message" role="status" aria-live="polite">{checkoutMessage}</p>}
        <div className="public-checkout-fields">
          <label>Your name<input required autoComplete="name" placeholder="e.g. Amina Otieno" value={checkout.customer_name} onChange={(event) => updateCheckout("customer_name", event.target.value)} onBlur={() => setCheckoutMessage(checkout.customer_name.trim() ? "Your name is ready for this order." : "Your name is still needed to place this order.")} /></label>
          <label>Phone number<input required type="tel" autoComplete="tel" placeholder="07XX XXX XXX" value={checkout.customer_phone} onChange={(event) => updateCheckout("customer_phone", event.target.value)} onBlur={() => setCheckoutMessage(checkout.customer_phone.trim() ? "Your phone number is ready for this order." : "Your phone number is still needed to place this order.")} /></label>
          <label>How would you like to receive your order?
            <select value={checkout.fulfilment} onChange={(event) => {
              const fulfilment = event.target.value;
              setCheckout((current) => ({ ...current, fulfilment, payment_method: fulfilment === "pickup" ? "pay_at_pickup" : "pay_on_delivery" }));
              setCheckoutMessage(fulfilment === "pickup" ? "Pickup selected. You can pay at pickup or use M-Pesa." : "Delivery selected. Add your delivery address below.");
            }}>
              <option value="delivery">Delivery</option><option value="pickup">Pickup</option>
            </select>
          </label>
          {checkout.fulfilment === "delivery" && <label>Delivery address<input required autoComplete="street-address" placeholder="Estate, building, street, or landmark" value={checkout.delivery_address} onChange={(event) => updateCheckout("delivery_address", event.target.value)} onBlur={() => setCheckoutMessage(checkout.delivery_address.trim() ? "Your delivery address is ready for this order." : "A delivery address is needed before you can place this order.")} /></label>}
          <label>Payment method
            <select value={checkout.payment_method} onChange={(event) => {
              updateCheckout("payment_method", event.target.value);
              setCheckoutMessage(`Payment method changed to ${paymentOptions.find((option) => option.value === event.target.value)?.label || "your selection"}.`);
            }}>
              {paymentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        {error && <p className="public-form-error" role="alert">{error}</p>}
        <p className="public-checkout-help">You can review your order with the shop before payment is collected.</p>
        <button className="public-submit-order" disabled={submitting || !itemCount}>{submitting ? "Placing your order…" : `Place order · ${formatPrice(cartTotal, shop.currency)}`}</button>
        <button type="button" className="public-keep-shopping" disabled={submitting} onClick={() => setCheckoutOpen(false)}>Keep shopping (your cart will be saved)</button>
      </form>
    </div>}
  </main>;
}
