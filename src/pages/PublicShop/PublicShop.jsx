import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { createPublicOrder, getPublicMpesaStatus, getPublicShop, initiatePublicMpesa } from "../../services/catalogApi";
import "./PublicShop.css";

function formatPrice(value, currency) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currency || "KES",
    maximumFractionDigits: 2,
  }).format(Number(value));
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
  const [checkout, setCheckout] = useState({ customer_name: "", customer_phone: "", fulfilment: "delivery", payment_method: "pay_on_delivery", delivery_address: "", estate: "", landmark: "", delivery_instructions: "", preferred_delivery_time: "" });

  useEffect(() => {
    getPublicShop(slug).then(setShop).catch((err) => {
      setError(err.response?.status === 404 ? "This shop catalogue is not available." : "Could not load this shop catalogue.");
    });
  }, [slug]);

  const categories = useMemo(() => [
    "all",
    ...new Set((shop?.products || []).map((product) => product.category).filter(Boolean)),
  ], [shop]);

  const products = (shop?.products || []).filter((product) => {
    const haystack = `${product.name} ${product.brand || ""} ${product.description || ""}`.toLowerCase();
    return (selectedCategory === "all" || product.category === selectedCategory)
      && haystack.includes(search.toLowerCase().trim());
  });
  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((total, item) => total + Number(item.variant.selling_price) * item.quantity, 0);

  function addToCart(product, variant) {
    setCart((current) => ({ ...current, [variant.id]: { product, variant, quantity: Math.min(itemQuantity(current[variant.id]) + 1, 99) } }));
  }
  function itemQuantity(item) { return item?.quantity || 0; }
  function changeQuantity(variantId, quantity) {
    setCart((current) => {
      if (quantity <= 0) { const next = { ...current }; delete next[variantId]; return next; }
      return { ...current, [variantId]: { ...current[variantId], quantity } };
    });
  }
  async function submitOrder(event) {
    event.preventDefault(); setSubmitting(true); setError("");
    try {
      let created = await createPublicOrder(slug, { ...checkout, items: cartItems.map((item) => ({ variant_id: item.variant.id, quantity: item.quantity })) });
      if (checkout.payment_method === "manual_mpesa") created = await initiatePublicMpesa(created.public_token);
      setOrder(created); setCart({}); setCheckoutOpen(false);
    } catch (err) { setError(err.response?.data?.detail || "Could not submit your order."); }
    finally { setSubmitting(false); }
  }

  if (error && !shop) return <main className="public-shop-error"><h1>{error}</h1><p>Check the link and try again.</p></main>;
  if (!shop) return <main className="public-shop-loading">Loading shop catalogue…</main>;
  if (order) return <main className="public-shop-confirmation"><span className="public-shop-kicker">ORDER RECEIVED</span><h1>Thank you, {order.customer_name}.</h1><p>Your order <strong>{order.order_number}</strong> has been sent to {shop.name}.</p><p className="public-order-total">{formatPrice(order.total, shop.currency)}</p>{order.payment_method === "manual_mpesa" && <p className={`public-payment-state ${order.payment_status}`}>M-Pesa payment: {order.payment_status}</p>}{order.payment_method === "manual_mpesa" && order.payment_status === "initiated" && <button onClick={() => getPublicMpesaStatus(order.public_token).then(setOrder)}>Check payment status</button>}<button onClick={() => setOrder(null)}>Back to catalogue</button></main>;

  return (
    <main className="public-shop">
      <header className="public-shop-header">
        <div>
          <span className="public-shop-kicker">LOCAL SHOP</span>
          <h1>{shop.name}</h1>
          {shop.location && <p>{shop.location}</p>}
        </div>
        <a href={`https://wa.me/?text=${encodeURIComponent(`Hello ${shop.name}`)}`} target="_blank" rel="noreferrer">Contact shop</a>
      </header>
      <section className="public-shop-toolbar" aria-label="Catalogue filters">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" aria-label="Search products" />
        <div className="public-shop-categories">
          {categories.map((category) => <button className={selectedCategory === category ? "selected" : ""} key={category} onClick={() => setSelectedCategory(category)}>{category === "all" ? "All products" : category}</button>)}
        </div>
      </section>
      {cartItems.length > 0 && <aside className="public-cart"><div><strong>{cartItems.reduce((sum, item) => sum + item.quantity, 0)} item(s)</strong><span>{formatPrice(cartTotal, shop.currency)}</span></div><button onClick={() => setCheckoutOpen(true)}>Checkout</button></aside>}
      <section className="public-product-grid" aria-live="polite">
        {products.map((product) => (
          <article className="public-product-card" key={product.id}>
            {product.image_url ? <img src={product.image_url} alt="" /> : <div className="public-product-placeholder">{product.name.slice(0, 1)}</div>}
            <div className="public-product-content">
              <span className="public-product-category">{product.category || "Shop product"}</span>
              <h2>{product.name}</h2>
              {product.brand && <p className="public-product-brand">{product.brand}</p>}
              {product.description && <p className="public-product-description">{product.description}</p>}
              <div className="public-product-variants">
                {product.variants.map((variant) => <div className="public-variant" key={variant.id}><span>{variant.name} · {formatPrice(variant.selling_price, shop.currency)} / {variant.unit}</span><button disabled={!variant.is_available} onClick={() => addToCart(product, variant)}>{variant.is_available ? "Add" : "Out of stock"}</button></div>)}
              </div>
              {product.availability_message && <p className="public-product-note">{product.availability_message}</p>}
            </div>
          </article>
        ))}
      </section>
      {!products.length && <p className="public-shop-empty">No products match your search.</p>}
      {checkoutOpen && <div className="public-checkout-backdrop"><form className="public-checkout" onSubmit={submitOrder}><button type="button" className="public-checkout-close" onClick={() => setCheckoutOpen(false)}>×</button><span className="public-shop-kicker">CHECKOUT</span><h2>Your order · {formatPrice(cartTotal, shop.currency)}</h2><div className="public-checkout-items">{cartItems.map((item) => <div key={item.variant.id}><span>{item.product.name} · {item.variant.name}</span><span><button type="button" onClick={() => changeQuantity(item.variant.id, item.quantity - 1)}>−</button> {item.quantity} <button type="button" onClick={() => changeQuantity(item.variant.id, item.quantity + 1)}>+</button></span></div>)}</div><input required placeholder="Your name" value={checkout.customer_name} onChange={(e) => setCheckout({ ...checkout, customer_name: e.target.value })} /><input required placeholder="Phone number" value={checkout.customer_phone} onChange={(e) => setCheckout({ ...checkout, customer_phone: e.target.value })} /><select value={checkout.fulfilment} onChange={(e) => setCheckout({ ...checkout, fulfilment: e.target.value, payment_method: e.target.value === "pickup" ? "pay_at_pickup" : "pay_on_delivery" })}><option value="delivery">Delivery</option><option value="pickup">Pickup</option></select>{checkout.fulfilment === "delivery" && <><input required placeholder="Delivery address, estate, or landmark" value={checkout.delivery_address} onChange={(e) => setCheckout({ ...checkout, delivery_address: e.target.value })} /><input placeholder="Estate / building / floor" value={checkout.estate} onChange={(e) => setCheckout({ ...checkout, estate: e.target.value })} /><input placeholder="Delivery instructions" value={checkout.delivery_instructions} onChange={(e) => setCheckout({ ...checkout, delivery_instructions: e.target.value })} /></>}<select value={checkout.payment_method} onChange={(e) => setCheckout({ ...checkout, payment_method: e.target.value })}><option value="pay_on_delivery">Pay on delivery</option><option value="pay_at_pickup">Pay at pickup</option><option value="manual_mpesa">Pay with M-Pesa STK Push</option></select><button className="public-submit-order" disabled={submitting}>{submitting ? "Sending…" : "Place order"}</button></form></div>}
    </main>
  );
}
