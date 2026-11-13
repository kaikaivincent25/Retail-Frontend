import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { createPublicOrder, getPublicMpesaStatus, getPublicShop, initiatePublicMpesa } from "../../services/catalogApi";
import "./PublicShop.css";

function formatPrice(value, currency) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: currency || "KES", maximumFractionDigits: 2 }).format(Number(value));
}

function getErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg || item.message).filter(Boolean).join(" ") || fallback;
  return detail || fallback;
}

export default function PublicShop() {
  const { slug } = useParams();
  const [shop, setShop] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [error, setError] = useState("");
  const [cart, setCart] = useState({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [paymentError, setPaymentError] = useState("");
  const [checkout, setCheckout] = useState({ customer_name: "", customer_phone: "", fulfilment: "delivery", payment_method: "pay_on_delivery", delivery_address: "", estate: "", landmark: "", delivery_instructions: "", preferred_delivery_time: "" });

  useEffect(() => {
    getPublicShop(slug).then(setShop).catch((err) => setError(err.response?.status === 404 ? "This shop catalogue is not available." : "Could not load this shop catalogue."));
  }, [slug]);

  const categories = useMemo(() => ["all", ...new Set((shop?.products || []).map((product) => product.category).filter(Boolean))], [shop]);
  const products = (shop?.products || []).filter((product) => {
    const haystack = `${product.name} ${product.brand || ""} ${product.description || ""}`.toLowerCase();
    return (selectedCategory === "all" || product.category === selectedCategory) && haystack.includes(search.toLowerCase().trim());
  });
  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((total, item) => total + Number(item.variant.selling_price) * item.quantity, 0);
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const paymentOptions = checkout.fulfilment === "pickup" ? [{ value: "pay_at_pickup", label: "Pay at pickup" }, { value: "manual_mpesa", label: "Pay with M-Pesa" }] : [{ value: "pay_on_delivery", label: "Pay on delivery" }, { value: "manual_mpesa", label: "Pay with M-Pesa" }];

  function addToCart(product, variant) {
    if (!variant.is_available) return;
    setCart((current) => ({ ...current, [variant.id]: { product, variant, quantity: Math.min((current[variant.id]?.quantity || 0) + 1, 99) } }));
  }

  function changeQuantity(variantId, quantity) {
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[variantId];
      else next[variantId] = { ...next[variantId], quantity: Math.min(quantity, 99) };
      return next;
    });
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (!cartItems.length || submitting) return;
    setSubmitting(true); setError(""); setPaymentError("");
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

  if (error && !shop) return <main className="public-shop-error"><h1>{error}</h1><p>Check the link and try again.</p></main>;
  if (!shop) return <main className="public-shop-loading">Loading shop catalogue…</main>;
  if (order) return <main className="public-shop-confirmation"><div className="confirmation-card"><div className="confirmation-check">✓</div><span className="public-shop-kicker">ORDER RECEIVED</span><h1>Thank you, {order.customer_name}.</h1><p>Your order <strong>{order.order_number}</strong> has been sent to {shop.name}.</p><p className="public-order-total">{formatPrice(order.total, shop.currency)}</p>{paymentError && <p className="public-form-error">{paymentError}</p>}{order.payment_method === "manual_mpesa" && <p className={`public-payment-state ${order.payment_status}`}>M-Pesa payment: {order.payment_status}</p>}{order.payment_method === "manual_mpesa" && order.payment_status === "initiated" && <button onClick={() => getPublicMpesaStatus(order.public_token).then(setOrder).catch((err) => setPaymentError(getErrorMessage(err, "Could not check payment status.")))}>Check payment status</button>}<button onClick={() => { setOrder(null); setPaymentError(""); }}>Continue shopping</button></div></main>;

  return <main className="public-shop">
    <header className="public-shop-header"><div className="public-shop-heading"><span className="public-shop-kicker">LOCAL SHOP</span><h1>Good things, close to home.</h1><p>Shop from <strong>{shop.name}</strong>{shop.location ? ` · ${shop.location}` : ""}</p></div><a className="public-contact" href={`https://wa.me/?text=${encodeURIComponent(`Hello ${shop.name}`)}`} target="_blank" rel="noreferrer">Chat with shop ↗</a></header>
    <section className="public-shop-toolbar" aria-label="Catalogue filters"><div className="public-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, brands, or categories" aria-label="Search products" /></div><div className="public-shop-categories">{categories.map((category) => <button className={selectedCategory === category ? "selected" : ""} key={category} onClick={() => setSelectedCategory(category)}>{category === "all" ? "All products" : category}</button>)}</div></section>
    {error && <p className="public-form-error public-page-error">{error}</p>}
    <div className="public-results-row"><p>{products.length} {products.length === 1 ? "product" : "products"}</p>{itemCount > 0 && <button className="public-cart-pill" onClick={() => setCheckoutOpen(true)}>Cart · {itemCount} <strong>{formatPrice(cartTotal, shop.currency)}</strong></button>}</div>
    <section className="public-product-grid" aria-live="polite">{products.map((product) => <article className="public-product-card" key={product.id}><div className="public-product-media">{product.image_url ? <img src={product.image_url} alt="" /> : <div className="public-product-placeholder">{product.name.slice(0, 1)}</div>}<span className="public-product-badge">{product.category || "Featured"}</span></div><div className="public-product-content"><h2>{product.name}</h2>{product.brand && <p className="public-product-brand">{product.brand}</p>}{product.description && <p className="public-product-description">{product.description}</p>}<div className="public-product-variants">{product.variants.map((variant) => <div className="public-variant" key={variant.id}><div><strong>{formatPrice(variant.selling_price, shop.currency)}</strong><small>{variant.name} · {variant.unit}</small></div><button disabled={!variant.is_available} onClick={() => addToCart(product, variant)}>{variant.is_available ? "Add to cart" : "Sold out"}</button></div>)}</div>{product.availability_message && <p className="public-product-note">{product.availability_message}</p>}</div></article>)}</section>
    {!products.length && <p className="public-shop-empty">No products match your search.</p>}
    {itemCount > 0 && <aside className="public-cart"><div><strong>{itemCount} item(s)</strong><span>{formatPrice(cartTotal, shop.currency)}</span></div><button onClick={() => setCheckoutOpen(true)}>Checkout</button></aside>}
    {checkoutOpen && <div className="public-checkout-backdrop"><form className="public-checkout" onSubmit={submitOrder}><button type="button" className="public-checkout-close" onClick={() => setCheckoutOpen(false)}>×</button><div className="checkout-heading"><span className="public-shop-kicker">CHECKOUT</span><h2>Complete your order</h2><p>{itemCount} item(s) · {formatPrice(cartTotal, shop.currency)}</p></div><div className="public-checkout-items">{cartItems.map((item) => <div key={item.variant.id}><span>{item.product.name} · {item.variant.name}</span><span><button type="button" onClick={() => changeQuantity(item.variant.id, item.quantity - 1)}>−</button> {item.quantity} <button type="button" onClick={() => changeQuantity(item.variant.id, item.quantity + 1)}>+</button></span></div>)}</div><label>Your name<input required placeholder="e.g. Amina Otieno" value={checkout.customer_name} onChange={(e) => setCheckout({ ...checkout, customer_name: e.target.value })} /></label><label>Phone number<input required placeholder="07XX XXX XXX" value={checkout.customer_phone} onChange={(e) => setCheckout({ ...checkout, customer_phone: e.target.value })} /></label><label>Fulfilment<select value={checkout.fulfilment} onChange={(e) => setCheckout({ ...checkout, fulfilment: e.target.value, payment_method: e.target.value === "pickup" ? "pay_at_pickup" : "pay_on_delivery" })}><option value="delivery">Delivery</option><option value="pickup">Pickup</option></select></label>{checkout.fulfilment === "delivery" && <label>Delivery address<input required placeholder="Estate, building, street, or landmark" value={checkout.delivery_address} onChange={(e) => setCheckout({ ...checkout, delivery_address: e.target.value })} /></label>}<label>Payment<select value={checkout.payment_method} onChange={(e) => setCheckout({ ...checkout, payment_method: e.target.value })}>{paymentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{error && <p className="public-form-error">{error}</p>}<button className="public-submit-order" disabled={submitting}>{submitting ? "Placing order…" : `Place order · ${formatPrice(cartTotal, shop.currency)}`}</button></form></div>}
  </main>;
}
