import { useEffect, useRef, useState } from "react";
import {
  getCurrentSession, openSession, getPopularProducts, browseVariants, completeSale,
  startMpesaPayment, getSale, startManualMpesaPayment, confirmManualPayment,
  cancelManualPayment,
} from "../../services/salesApi";
import { cacheSession, getCachedSession, queueSale, unsyncedCount } from "../../db";
import { syncOutbox } from "../../sync";
import { getMe, getPaymentDestinations, getReceiptProfile } from "../../services/profileApi";
import { closeSession } from "../../services/cashSessionApi";
import { extractErrorMessage } from "../../services/errorHandling";
import { useToast } from "../../context/ToastContext";
import Receipt, { printReceipt } from "../../components/Receipt/Receipt";
import { toCents, fromCents, formatCurrency } from "../../utils/money";
import "./Sales.css";

const DENOMINATIONS = [100, 200, 500, 1000];

function Sales() {
  const { showToast } = useToast();
  const [session, setSession] = useState(undefined); // undefined = loading, null = none open

  const [popular, setPopular] = useState([]);
  const [viewMode, setViewMode] = useState("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [allItems, setAllItems] = useState([]);
  const [cart, setCart] = useState([]); // [{ variant, quantity }]
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDestinations, setPaymentDestinations] = useState([]);
  const [receiptProfile, setReceiptProfile] = useState(null);
  const [cashierName, setCashierName] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaSale, setMpesaSale] = useState(null);
  const [manualSale, setManualSale] = useState(null);
  const [manualReceiptNumber, setManualReceiptNumber] = useState("");
  const amountInputRef = useRef(null);
  const mpesaPhoneInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const completeSaleButtonRef = useRef(null);
  const bulkInputRef = useRef(null);
  const [bulkPromptVariant, setBulkPromptVariant] = useState(null);
  const [bulkPresetVariant, setBulkPresetVariant] = useState(null);
  const [bulkAmountInput, setBulkAmountInput] = useState("");
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }
  const [saleComplete, setSaleComplete] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [closingModalOpen, setClosingModalOpen] = useState(false);
  const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);
  const saleCompleteButtonRef = useRef(null);

  useEffect(() => {
    let active = true;
    getCurrentSession().then(async (current) => {
      await cacheSession(current);
      if (active) setSession(current);
    }).catch(async () => {
      const cached = await getCachedSession();
      if (active) setSession(cached);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    getReceiptProfile()
      .then(setReceiptProfile)
      .catch((err) => showToast(extractErrorMessage(err), "error"));
    getMe()
      .then((profile) => setCashierName(profile.full_name))
      .catch((err) => showToast(extractErrorMessage(err), "error"));
  }, [showToast]);

  useEffect(() => {
    if (bulkPromptVariant) {
      requestAnimationFrame(() => bulkInputRef.current?.focus());
    }
  }, [bulkPromptVariant]);

  useEffect(() => {
    if (saleComplete) {
      requestAnimationFrame(() => saleCompleteButtonRef.current?.focus());
    }
  }, [saleComplete]);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") {
        setKeyboardHelpOpen(false);
        setBulkPromptVariant(null);
        setBulkPresetVariant(null);
        setClosingModalOpen(false);
        if (saleComplete) {
          setSaleComplete(null);
          if (saleComplete.restoreCashFocus) {
            requestAnimationFrame(() => amountInputRef.current?.focus());
          }
        }
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [saleComplete]);

  useEffect(() => {
    function handlePosShortcuts(event) {
      const target = event.target;
      const isTyping = target instanceof HTMLElement && (
        target.matches("input, textarea, select, [contenteditable='true']") || target.isContentEditable
      );

      if (event.key === "Escape") return;

      if (event.key === "?") {
        if (isTyping) return;
        if (!keyboardHelpOpen && (saleComplete || closingModalOpen || bulkPromptVariant || bulkPresetVariant || !session)) return;
        event.preventDefault();
        setKeyboardHelpOpen((open) => !open);
        return;
      }

      if (
        keyboardHelpOpen || saleComplete || closingModalOpen ||
        bulkPromptVariant || bulkPresetVariant || !session
      ) return;

      if (event.key === "F2") {
        event.preventDefault();
        setViewMode("all");
        searchInputRef.current?.focus();
      } else if (event.key === "F4") {
        event.preventDefault();
        if (manualSale?.status === "pending") return;
        setPaymentMethod("cash");
        requestAnimationFrame(() => amountInputRef.current?.focus());
      } else if (event.key === "F6") {
        event.preventDefault();
        if (manualSale?.status !== "pending") setPaymentMethod("cash");
      } else if (event.key === "F7") {
        event.preventDefault();
        if (manualSale?.status !== "pending") {
          setPaymentMethod("mpesa");
          requestAnimationFrame(() => mpesaPhoneInputRef.current?.focus());
        }
      } else if (event.key === "F9") {
        event.preventDefault();
        completeSaleButtonRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handlePosShortcuts);
    return () => window.removeEventListener("keydown", handlePosShortcuts);
  }, [
    bulkPresetVariant,
    bulkPromptVariant,
    closingModalOpen,
    keyboardHelpOpen,
    manualSale?.status,
    saleComplete,
    session,
  ]);

  useEffect(() => {
    if (session) {
      getPopularProducts().then(setPopular).catch(async () => {
        try {
          setPopular(await browseVariants());
        } catch {
          setPopular([]);
        }
      });
    }
  }, [session, showToast]);

  useEffect(() => {
    browseVariants().catch((err) => showToast(extractErrorMessage(err), "error"));
  }, [showToast]);

  useEffect(() => {
    if (!session) return;
    getPaymentDestinations()
      .then(setPaymentDestinations)
      .catch((err) => showToast(extractErrorMessage(err), "error"));
  }, [session, showToast]);

  useEffect(() => {
    if (!session || viewMode !== "all") return undefined;

    let active = true;
    const timer = setTimeout(() => {
      browseVariants(searchQuery)
        .then((items) => {
          if (active) setAllItems(items);
        })
        .catch((err) => {
          if (active) showToast(extractErrorMessage(err), "error");
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [session, viewMode, searchQuery, showToast]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!mpesaSale || mpesaSale.status !== "pending") return undefined;

    let active = true;
    const timer = setInterval(async () => {
      try {
        const updated = await getSale(mpesaSale.id);
        if (!active || updated.status === "pending") return;
        setMpesaSale(updated);
        if (updated.status === "completed") {
          setMessage(null);
          setSaleComplete({
            ...updated,
            paymentLabel: "M-Pesa",
          });
          getPopularProducts().then(setPopular);
        } else if (updated.status === "failed") {
          setMessage({ type: "error", text: "M-Pesa payment was not completed. Reserved stock has been released." });
        }
      } catch (err) {
        if (active) showToast(extractErrorMessage(err), "error");
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [mpesaSale?.id, mpesaSale?.status, showToast]);

  async function handleOpenSession(e) {
    e.preventDefault();
    try {
      const opened = await openSession();
      setSession(opened);
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
      try {
        setSession(await getCurrentSession());
      } catch (refreshError) {
        showToast(extractErrorMessage(refreshError), "error");
      }
    }
  }

  function addFixedItem(variant) {
    setCart((prev) => {
      const existing = prev.find((line) => line.variant.variant_id === variant.variant_id);
      const currentQty = existing ? existing.quantity : 0;

      if (currentQty + 1 > variant.quantity_in_stock) {
        setMessage({ type: "error", text: `Only ${variant.quantity_in_stock} left in stock.` });
        return prev;
      }

      if (existing) {
        return prev.map((line) =>
          line.variant.variant_id === variant.variant_id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [...prev, { variant, quantity: 1 }];
    });
  }

  function addBulkItem(variant, amount) {
    const existing = cart.find((line) => line.variant.variant_id === variant.variant_id);
    const currentQty = existing ? existing.quantity : 0;

    if (amount > variant.quantity_in_stock - currentQty) {
      const remaining = Math.max(0, variant.quantity_in_stock - currentQty);
      setMessage({ type: "error", text: `Only ${remaining}${variant.unit} available.` });
      return;
    }

    setCart((prev) => {
      const cartLine = prev.find((line) => line.variant.variant_id === variant.variant_id);
      if (cartLine) {
        return prev.map((line) =>
          line.variant.variant_id === variant.variant_id
            ? { ...line, quantity: line.quantity + amount }
            : line
        );
      }
      return [...prev, { variant, quantity: amount }];
    });
    setBulkPromptVariant(null);
    setBulkAmountInput("");
  }

  function handleTileTap(item) {
    if (item.sale_mode === "bulk") {
      if (item.presets?.length > 0) {
        setBulkPresetVariant(item);
      } else {
        setBulkPromptVariant(item);
      }
    } else {
      addFixedItem(item);
    }
  }

  function addPresetItem(variant, preset) {
    const existing = cart.find((line) => line.variant.variant_id === variant.variant_id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty + preset.amount > variant.quantity_in_stock) {
      const remaining = Math.max(0, variant.quantity_in_stock - currentQty);
      setMessage({ type: "error", text: `Only ${remaining}${variant.unit} available.` });
      return;
    }

    setCart((prev) => {
      if (existing) {
        return prev.map((line) =>
          line.variant.variant_id === variant.variant_id
            ? { ...line, quantity: line.quantity + preset.amount }
            : line
        );
      }
      return [...prev, { variant, quantity: preset.amount }];
    });
    setBulkPresetVariant(null);
  }

  function handleSearchChange(value) {
    setSearchQuery(value);
    if (value && viewMode !== "all") {
      setViewMode("all");
    }
  }

  function updateQuantity(variantId, delta) {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.variant.variant_id !== variantId) return line;
          const next = line.quantity + delta;
          if (delta > 0 && next > line.variant.quantity_in_stock) {
            setMessage({
              type: "error",
              text: `Only ${line.variant.quantity_in_stock} left in stock.`,
            });
            return line;
          }
          return { ...line, quantity: Math.max(0, next) };
        })
        .filter((line) => line.quantity > 0)
    );
  }

  function removeLine(variantId) {
    setCart((prev) => prev.filter((line) => line.variant.variant_id !== variantId));
  }

  const total = cart.reduce((sum, line) => sum + toCents(line.variant.selling_price) * line.quantity, 0) / 100;
  const received = fromCents(toCents(amountReceived));
  const change = received - total;
  const isManualPayment = ["pochi", "till", "paybill"].includes(paymentMethod);
  const selectedDestination = paymentDestinations.find(
    (destination) => destination.method === paymentMethod
  );
  const manualDestination = manualSale
    ? {
        label: {
          pochi: "Pochi la Biashara",
          till: "Buy Goods Till",
          paybill: "PayBill",
        }[manualSale.payment_method],
        number: manualSale.payment_destination_number,
        account_number: manualSale.payment_account_number,
      }
    : selectedDestination;
  const visibleItems = viewMode === "popular" ? popular : allItems;
  const itemCount = cart.reduce((count, line) => count + line.quantity, 0);

  function tapDenomination(value) {
    setAmountReceived(String(value));
  }

  async function handleCompleteSale() {
    if (cart.length === 0 || submitting) return;
    if (paymentMethod === "cash" && received < total) return;
    if (paymentMethod === "mpesa" && toCents(total) % 100 !== 0) {
      setMessage({ type: "error", text: "M-Pesa STK Push supports whole KSh amounts only. Adjust the cart total." });
      return;
    }
    if (paymentMethod === "mpesa" && !mpesaPhone.trim()) {
      setMessage({ type: "error", text: "Enter the customer's M-Pesa phone number." });
      return;
    }
    if (isManualPayment && !selectedDestination) {
      setMessage({ type: "error", text: "This M-Pesa payment destination is not configured." });
      return;
    }
    if (manualSale?.status === "pending") {
      setMessage({ type: "error", text: "Confirm or cancel the pending manual payment before starting another sale." });
      return;
    }
    setSubmitting(true);

    try {
      const items = cart.map((line) => ({
        variant_id: line.variant.variant_id,
        quantity: Math.round(line.quantity),
      }));
      if (paymentMethod === "mpesa") {
        const sale = await startMpesaPayment(items, mpesaPhone);
        setMpesaSale(sale);
        setMessage({
          type: "success",
          text: `STK Push sent to ${mpesaPhone}. Waiting for payment confirmation...`,
        });
      } else if (isManualPayment) {
        const sale = await startManualMpesaPayment(items, paymentMethod);
        setManualSale(sale);
        setManualReceiptNumber("");
        setMessage({
          type: "success",
          text: `Sale #${sale.id} is awaiting manual M-Pesa payment confirmation.`,
        });
      } else {
        const salePayload = {
          items,
          amount_received: Number(received.toFixed(2)),
        };
        const clientId = crypto.randomUUID();
        if (navigator.onLine) {
          try {
            const sale = await completeSale(items, salePayload.amount_received, clientId);
            setMessage(null);
            setSaleComplete({ ...sale, paymentLabel: "Cash", restoreCashFocus: true });
          } catch (error) {
            if (error.response && error.response.status < 500) throw error;
            await queueSale(salePayload, clientId);
            showToast("Sale saved on this device. It will sync when your connection is available.", "success");
            syncOutbox().catch((syncError) => {
              console.error("Failed to sync the queued sale.", syncError);
            });
          }
        } else {
          await queueSale(salePayload, clientId);
          showToast("Sale saved on this device. It will sync when your connection is available.", "success");
        }
      }
      setCart([]);
      setAmountReceived("");
      if (paymentMethod === "cash" && navigator.onLine) {
        getPopularProducts().then(setPopular).catch(() => {});
      }
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmManualPayment() {
    if (!manualSale || !manualReceiptNumber.trim() || submitting) return;
    setSubmitting(true);
    try {
      const updated = await confirmManualPayment(manualSale.id, manualReceiptNumber);
      setManualSale(updated);
      setMessage(null);
      setSaleComplete({
        ...updated,
        paymentLabel: manualDestination?.label || "Manual M-Pesa",
      });
      setManualReceiptNumber("");
      getPopularProducts().then(setPopular);
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelManualPayment() {
    if (!manualSale || submitting) return;
    setSubmitting(true);
    try {
      const updated = await cancelManualPayment(manualSale.id);
      setManualSale(updated);
      setMessage({ type: "error", text: `Pending payment for sale #${updated.id} was cancelled and reserved stock released.` });
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (session === undefined) {
    return <div className="sales-page">Loading...</div>;
  }

  if (session === null) {
    return (
      <div className="sales-page">
        <form className="open-session-card" onSubmit={handleOpenSession}>
          <h2>Open the shop till</h2>
          <p>
            Opening cash is carried forward automatically from the shop's last
            counted close.
          </p>
          <button type="submit">Open Shop Till</button>
        </form>
      </div>
    );
  }

  return (
    <div className="sales-page">
      <header className="sales-page-heading">
        <div className="sales-page-brandmark" aria-hidden="true">
          {receiptProfile?.name?.trim()?.[0]?.toUpperCase() || "R"}
        </div>
        <div className="sales-page-heading-copy">
          <p className="sales-page-eyebrow">
            <span className="sales-live-dot" aria-hidden="true" />
            {receiptProfile?.name || "Retail workspace"}
          </p>
          <h1>Point of sale</h1>
          <p>Choose the products, take payment, and finish the sale. Use a mouse, touch screen, or keyboard.</p>
        </div>
        <div className="sales-page-heading-actions">
          <span className="sales-session-chip"><span aria-hidden="true">●</span> Till open</span>
          <button type="button" className="close-till-button" onClick={() => setClosingModalOpen(true)}>
            Close till
          </button>
          <button
            type="button"
            className="sales-shortcuts-button"
            onClick={() => setKeyboardHelpOpen(true)}
            aria-keyshortcuts="?"
          >
            Keyboard help <kbd>?</kbd>
          </button>
        </div>
      </header>
      <div className="sales-steps" aria-label="Sale steps">
        <span><b>1</b> Choose products</span>
        <span className="sales-step-arrow" aria-hidden="true">›</span>
        <span><b>2</b> Take payment</span>
        <span className="sales-step-arrow" aria-hidden="true">›</span>
        <span><b>3</b> Finish sale</span>
        <span className="sales-step-hint">Press <kbd>?</kbd> for keyboard help</span>
      </div>
      <div className="sales-grid-panel">
        <div className="sales-header-row">
          <div>
            <span className="sales-section-label">Your catalogue</span>
            <h2>Choose products</h2>
          </div>
          <span className="sales-item-count">{visibleItems.length} items</span>
        </div>

        <div className="sales-view-controls">
          <div className="view-tabs">
            <button
              className={viewMode === "popular" ? "active" : ""}
              onClick={() => setViewMode("popular")}
            >
              Popular
            </button>
            <button
              className={viewMode === "all" ? "active" : ""}
              onClick={() => setViewMode("all")}
            >
              All Items
            </button>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            className="product-search-input"
            placeholder="Type a product name to find it... (F2)"
            aria-label="Search products"
            aria-keyshortcuts="F2"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {message && <div className={`sale-message ${message.type}`} role="status" aria-live="polite">{message.text}</div>}

        <div className="sales-catalogue-hint">Tap or click a product to add it to the customer's order. Use Tab and Enter with a keyboard.</div>
        <div className="quick-sell-grid">
          {visibleItems.map((item) => (
            <button
              key={item.variant_id}
              className="quick-sell-tile"
              aria-label={`${item.product_name}, ${item.variant_name}${item.quantity_in_stock === 0 ? ", unavailable" : ""}. Select to add to basket`}
              disabled={item.quantity_in_stock === 0}
              onClick={() => handleTileTap(item)}
            >
              {item.image_url ? (
                <span className="tile-image-wrap">
                  <img
                    className="tile-image"
                    src={item.image_url}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.parentElement.textContent = item.product_name?.slice(0, 1)?.toLocaleUpperCase() || "P";
                    }}
                  />
                </span>
              ) : (
                <span className="tile-image-wrap tile-image-placeholder" aria-hidden="true">
                  {item.product_name?.slice(0, 1)?.toLocaleUpperCase() || "P"}
                </span>
              )}
              <span className="tile-name">{item.product_name}</span>
              <span className="tile-variant">{item.variant_name}</span>
              <span className="tile-stock">{item.quantity_in_stock === 0 ? "Unavailable" : `${item.quantity_in_stock} ${item.unit || "in stock"}`}</span>
              <span className="tile-price">
                {item.sale_mode === "bulk"
                  ? item.presets?.length > 0
                    ? `From ${formatCurrency(Math.min(...item.presets.map((preset) => preset.price)))}`
                    : "Tap to weigh"
                  : formatCurrency(item.selling_price)}
              </span>
              {item.sale_mode === "bulk" && (
                <span className="tile-badge">
                  {item.presets?.length > 0 ? "tap for portions" : "tap to weigh"}
                </span>
              )}
              {item.quantity_in_stock === 0 && <span className="tile-badge out">out of stock</span>}
            </button>
          ))}
        </div>
        {visibleItems.length === 0 && (
          <p className="empty-hint">
            {viewMode === "popular"
              ? "No sales yet — items will appear here once sold."
              : searchQuery
              ? `No items match "${searchQuery}".`
              : "No active products in stock."}
          </p>
        )}

        {bulkPromptVariant && (
          <div className="bulk-prompt-overlay">
            <form
              className="bulk-prompt-card"
              onSubmit={(e) => {
                e.preventDefault();
                const amt = parseInt(bulkAmountInput, 10);
                if (amt > 0 && amt <= bulkPromptVariant.quantity_in_stock) {
                  addBulkItem(bulkPromptVariant, amt);
                } else if (amt > bulkPromptVariant.quantity_in_stock) {
                  setMessage({ type: "error", text: `Only ${bulkPromptVariant.quantity_in_stock}${bulkPromptVariant.unit} available.` });
                }
              }}
            >
              <h3>{bulkPromptVariant.product_name} — {bulkPromptVariant.variant_name}</h3>
              <p>Enter amount in {bulkPromptVariant.unit}s</p>
              <input
                ref={bulkInputRef}
                type="number"
                min="1"
                step="1"
                value={bulkAmountInput}
                onChange={(e) => setBulkAmountInput(e.target.value)}
              />
              <div className="bulk-prompt-actions">
                <button type="button" onClick={() => setBulkPromptVariant(null)}>Cancel</button>
                <button type="submit" className="primary" disabled={!(parseInt(bulkAmountInput, 10) > 0)}>
                  Add
                </button>
              </div>
            </form>
          </div>
        )}

        {bulkPresetVariant && (
          <div className="bulk-prompt-overlay">
            <div className="bulk-prompt-card preset-picker-card">
              <h3>{bulkPresetVariant.product_name} — {bulkPresetVariant.variant_name}</h3>
              <p>Tap the amount the customer wants:</p>
              <div className="preset-options">
                {bulkPresetVariant.presets.map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    className="preset-option"
                    onClick={() => addPresetItem(bulkPresetVariant, preset)}
                  >
                    <span className="preset-option-label">{preset.label}</span>
                    <span className="preset-option-price">KSh {preset.price}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="preset-other-amount"
                onClick={() => {
                  setBulkPresetVariant(null);
                  setBulkPromptVariant(bulkPresetVariant);
                }}
              >
                Other amount...
              </button>
              <button
                type="button"
                className="preset-cancel"
                onClick={() => setBulkPresetVariant(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {closingModalOpen && (
          <CloseTillModal
            session={session}
            onClose={() => setClosingModalOpen(false)}
            onClosed={async () => {
              await cacheSession(null);
              setClosingModalOpen(false);
              setSession(null);
            }}
          />
        )}
      </div>

      <div className="cart-panel">
        <div className="cart-panel-heading">
          <div>
            <span className="sales-section-label">Step 2 · Review items</span>
            <h2>Customer's order</h2>
          </div>
          <span className="cart-item-count">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
        </div>

        <div className="cart-lines">
          {cart.length === 0 && <div className="basket-empty-state"><span className="basket-empty-icon" aria-hidden="true">▣</span><strong>No items added yet</strong><p>Choose a product from the list to begin.</p></div>}
          {cart.map((line) => (
            <div className="cart-line" key={line.variant.variant_id}>
              <div className="cart-line-info">
                <span className="cart-line-name">{line.variant.variant_name}</span>
                <span className="cart-line-price">{formatCurrency(line.variant.selling_price)} each</span>
              </div>

              {line.variant.sale_mode === "fixed" ? (
                <div className="cart-line-qty">
                  <button type="button" aria-label={`Decrease quantity of ${line.variant.variant_name}`} onClick={() => updateQuantity(line.variant.variant_id, -1)}>−</button>
                  <span>{line.quantity}</span>
                  <button type="button" aria-label={`Increase quantity of ${line.variant.variant_name}`} onClick={() => updateQuantity(line.variant.variant_id, 1)}>+</button>
                </div>
              ) : (
                <span className="cart-line-qty-bulk">{line.quantity} {line.variant.unit}</span>
              )}

              <span className="cart-line-total">
                {formatCurrency(line.variant.selling_price * line.quantity)}
              </span>
              <button type="button" className="cart-line-remove" aria-label={`Remove ${line.variant.variant_name} from basket`} title="Remove item" onClick={() => removeLine(line.variant.variant_id)}>×</button>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <div className="cart-total-row">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>

          <div className="payment-section-heading">
            <span>Step 3 · How will the customer pay?</span>
            <span>Choose how the customer is paying</span>
          </div>
          <div className="payment-method-options" role="group" aria-label="Payment method">
            <button
              type="button"
              className={`payment-method-card cash${paymentMethod === "cash" ? " active" : ""}`}
              aria-pressed={paymentMethod === "cash"}
              aria-keyshortcuts="F6"
              disabled={manualSale?.status === "pending"}
              onClick={() => setPaymentMethod("cash")}
            >
              <span className="payment-method-icon" aria-hidden="true">KSh</span>
              <span className="payment-method-copy">
                <strong>Cash</strong>
                <small>Pay in person · F6</small>
              </span>
            </button>
            <button
              type="button"
              className={`payment-method-card mpesa${paymentMethod === "mpesa" ? " active" : ""}`}
              aria-pressed={paymentMethod === "mpesa"}
              aria-keyshortcuts="F7"
              disabled={manualSale?.status === "pending"}
              onClick={() => setPaymentMethod("mpesa")}
            >
              <span className="payment-method-icon" aria-hidden="true">M</span>
              <span className="payment-method-copy">
                <strong>M-Pesa</strong>
                <small>Send STK prompt · F7</small>
              </span>
            </button>
            {paymentDestinations.map((destination) => (
              <button
                key={destination.method}
                type="button"
                className={`payment-method-card manual${paymentMethod === destination.method ? " active" : ""}`}
                aria-pressed={paymentMethod === destination.method}
                disabled={manualSale?.status === "pending"}
                onClick={() => setPaymentMethod(destination.method)}
              >
                <span className="payment-method-icon" aria-hidden="true">Pay</span>
                <span className="payment-method-copy">
                  <strong>{destination.label}</strong>
                  <small>Confirm manually</small>
                </span>
              </button>
            ))}
          </div>

          {paymentMethod === "cash" ? (
            <>
              <label className="checkout-field-label" htmlFor="cash-received">
                Cash received from customer
                <span>Enter the amount handed over · F4</span>
              </label>
              <div className="denomination-row">
                {DENOMINATIONS.map((d) => (
                  <button key={d} type="button" onClick={() => tapDenomination(d)}>{formatCurrency(d)}</button>
                ))}
              </div>

              <input
                ref={amountInputRef}
                id="cash-received"
                aria-keyshortcuts="F4"
                className="amount-received-input"
                type="number"
                min="0"
                step="0.01"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
              />

              {amountReceived !== "" && (
                <div className={`change-row ${received < total ? "negative" : "positive"}`} role="status">
                  <span className="change-copy">
                    <strong>{received < total ? "Still to collect" : "Change to give back"}</strong>
                    <small>{received < total ? "Additional cash needed" : "Return this amount to the customer"}</small>
                  </span>
                  <strong className="change-value">
                    {formatCurrency(received < total ? total - received : change)}
                  </strong>
                </div>
              )}
            </>
          ) : paymentMethod === "mpesa" ? (
            <>
              <label className="checkout-field-label" htmlFor="mpesa-phone">
                Customer's M-Pesa phone number
                <span>A payment prompt will be sent to this number</span>
              </label>
              <input
                ref={mpesaPhoneInputRef}
                id="mpesa-phone"
                aria-keyshortcuts="F7"
                className="amount-received-input"
                type="tel"
                autoComplete="tel"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="e.g. 07XX XXX XXX"
                aria-label="Customer M-Pesa phone number"
              />
              {toCents(total) % 100 !== 0 && (
                <div className="change-row negative">
                  STK Push requires a whole KSh total; this cart total includes cents.
                </div>
              )}
            </>
          ) : (
            <div className="manual-payment-hint">
              {selectedDestination
                ? "The payment number and instructions will be shown after you create the pending sale."
                : "No manual M-Pesa destinations are configured. Ask an admin to add them in Profile & Settings."}
            </div>
          )}

          <button
            ref={completeSaleButtonRef}
            aria-keyshortcuts="F9 Enter"
            className="complete-sale-button"
            disabled={
              cart.length === 0 ||
              submitting ||
              manualSale?.status === "pending" ||
              (paymentMethod === "cash" && received < total) ||
              (paymentMethod === "mpesa" && (!mpesaPhone.trim() || toCents(total) % 100 !== 0)) ||
              (isManualPayment && !selectedDestination)
            }
            onClick={handleCompleteSale}
          >
            {submitting
              ? "Processing..."
              : cart.length === 0
              ? "Cart is empty"
              : paymentMethod === "cash" && received < total
              ? "Awaiting full payment"
              : paymentMethod === "mpesa"
              ? `Send STK Push · ${formatCurrency(total)}`
              : isManualPayment
              ? `Create pending sale · ${formatCurrency(total)}`
              : "Complete Sale"}
          </button>
          <p className="sales-complete-hint">Keyboard: press <kbd>F9</kbd>, then <kbd>Enter</kbd> to finish.</p>
          {mpesaSale?.status === "pending" && (
            <div className="mpesa-pending-message" role="status">
              Waiting for M-Pesa confirmation for sale #{mpesaSale.id}.
              The sale is completed only after Daraja confirms the exact amount.
            </div>
          )}
          {mpesaSale?.status === "failed" && (
            <div className="mpesa-pending-message failed" role="status">
              M-Pesa payment for sale #{mpesaSale.id} was not completed.
            </div>
          )}
          {manualSale?.status === "pending" && manualDestination && (
            <div className="manual-payment-card" role="status">
              <strong>Payment instructions · Sale #{manualSale.id}</strong>
              <p>Ask the customer to pay exactly {formatCurrency(manualSale.total)} and verify the payment confirmation and recipient before recording it.</p>
              <div className="manual-payment-destination">
                <span>{manualDestination.label}</span>
                <strong>{manualDestination.number}</strong>
                {manualDestination.account_number && (
                  <>
                    <span>Account number</span>
                    <strong>{manualDestination.account_number}</strong>
                  </>
                )}
              </div>
              <label htmlFor="manual-mpesa-receipt">M-Pesa confirmation code</label>
              <input
                id="manual-mpesa-receipt"
                className="amount-received-input"
                value={manualReceiptNumber}
                onChange={(e) => setManualReceiptNumber(e.target.value)}
                maxLength={30}
                placeholder="e.g. QGH123ABC"
              />
              <div className="manual-payment-actions">
                <button
                  type="button"
                  onClick={handleConfirmManualPayment}
                  disabled={submitting || !manualReceiptNumber.trim()}
                >
                  {submitting ? "Processing..." : "Confirm payment received"}
                </button>
                <button type="button" onClick={handleCancelManualPayment} disabled={submitting}>
                  Cancel and release stock
                </button>
              </div>
            </div>
          )}
          {manualSale?.status === "completed" && (
            <div className="mpesa-pending-message" role="status">
              Manual payment for sale #{manualSale.id} confirmed{manualSale.mpesa_receipt_number ? ` · ${manualSale.mpesa_receipt_number}` : ""}.
            </div>
          )}
          {manualSale?.status === "failed" && (
            <div className="mpesa-pending-message failed" role="status">
              Manual payment for sale #{manualSale.id} was cancelled; reserved stock has been released.
            </div>
          )}
        </div>
      </div>
      {keyboardHelpOpen && (
        <div
          className="sales-help-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setKeyboardHelpOpen(false);
          }}
        >
          <section className="sales-help-card" role="dialog" aria-modal="true" aria-labelledby="sales-help-title">
            <button type="button" className="sales-help-close" onClick={() => setKeyboardHelpOpen(false)} aria-label="Close keyboard help">×</button>
            <span className="sales-section-label">Quick guide</span>
            <h2 id="sales-help-title">Keyboard shortcuts</h2>
            <p className="sales-help-intro">You can also use the on-screen buttons. Press Tab to move between buttons and Enter to select one.</p>
            <dl className="sales-shortcut-list">
              <div><dt><kbd>F2</kbd></dt><dd>Find a product</dd></div>
              <div><dt><kbd>F4</kbd></dt><dd>Choose cash and enter the amount received</dd></div>
              <div><dt><kbd>F6</kbd></dt><dd>Choose cash payment</dd></div>
              <div><dt><kbd>F7</kbd></dt><dd>Choose M-Pesa payment</dd></div>
              <div><dt><kbd>F9</kbd></dt><dd>Move to the finish sale button; press Enter to continue</dd></div>
              <div><dt><kbd>Esc</kbd></dt><dd>Close this guide or a dialog</dd></div>
              <div><dt><kbd>?</kbd></dt><dd>Open or close this guide</dd></div>
            </dl>
            <button type="button" className="sales-help-done" autoFocus onClick={() => setKeyboardHelpOpen(false)}>Got it</button>
          </section>
        </div>
      )}

      {saleComplete && (
        <>
          <div
            className="sale-complete-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sale-complete-title"
            aria-describedby="sale-complete-description"
          >
            <div className="sale-complete-card">
              <div className="sale-complete-icon" aria-hidden="true">✓</div>
              <p className="sale-complete-eyebrow">Payment received · {saleComplete.paymentLabel}</p>
              <h2 id="sale-complete-title">Sale complete</h2>
              <p id="sale-complete-description">
                Sale #{saleComplete.id} has been recorded successfully.
              </p>
              <div className="sale-complete-total">
                <span>Sale total</span>
                <strong>{formatCurrency(saleComplete.total)}</strong>
              </div>
              <div className="sale-complete-change">
                <span>{Number(saleComplete.change) > 0 ? "Change to give back" : "Change due"}</span>
                <strong>{formatCurrency(saleComplete.change)}</strong>
              </div>
              {saleComplete.mpesa_receipt_number && (
                <p className="sale-complete-receipt">
                  M-Pesa receipt <strong>{saleComplete.mpesa_receipt_number}</strong>
                </p>
              )}
              <div className="sale-complete-actions">
                <button
                  type="button"
                  className="sale-complete-print"
                  onClick={printReceipt}
                >
                  <span aria-hidden="true">▤</span>
                  Print receipt
                </button>
                <button
                  ref={saleCompleteButtonRef}
                  type="button"
                  className="sale-complete-done"
                  onClick={() => {
                    setSaleComplete(null);
                    if (saleComplete.restoreCashFocus) {
                      requestAnimationFrame(() => amountInputRef.current?.focus());
                    }
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
          <Receipt
            sale={saleComplete}
            shopName={receiptProfile?.name}
            shopLocation={receiptProfile?.location}
            cashierName={cashierName}
          />
        </>
      )}
    </div>
  );
}

export default Sales;

function CloseTillModal({ session, onClose, onClosed }) {
  const [countedCash, setCountedCash] = useState("");
  const [pendingClosingCash, setPendingClosingCash] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const difference = Number(result?.difference ?? 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const parsedCash = Number(countedCash);
    const value = toCents(countedCash);
    if (countedCash.trim() === "" || !Number.isFinite(parsedCash) || parsedCash < 0) {
      setError("Enter the amount of cash you counted.");
      return;
    }

    setPendingClosingCash(value);
  }

  async function confirmClose() {
    setError("");
    setSubmitting(true);
    try {
      await syncOutbox();
      const waiting = await unsyncedCount();
      if (waiting > 0) {
        setError(
          `Cannot close the till while ${waiting} sale${waiting === 1 ? " is" : "s are"} waiting to sync. Reconnect and sync all sales first.`
        );
        return;
      }
      const closed = await closeSession(fromCents(pendingClosingCash));
      setResult(closed);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not close the session.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bulk-prompt-overlay" role="dialog" aria-modal="true" aria-labelledby="close-till-title">
      <div className="bulk-prompt-card close-till-card">
        {!result ? (
          <>
            {pendingClosingCash === null ? (
              <>
                <h3 id="close-till-title">Close Till</h3>
                <p>
                  Opened with {formatCurrency(session.opening_cash)}. Expected cash includes cash sales
                  and subtracts till expenses. Staff stock use is tracked separately and does not
                  reduce expected till cash. Count the drawer and enter it below.
                </p>
                <form onSubmit={handleSubmit}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Cash counted"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    autoFocus
                    required
                  />
                  {error && <div className="form-error">{error}</div>}
                  <div className="bulk-prompt-actions">
                    <button type="button" onClick={onClose}>Cancel</button>
                    <button type="submit" className="primary">Review Amount</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h3 id="close-till-title">Confirm Session Close</h3>
                <p>
                  Confirm that you counted {formatCurrency(fromCents(pendingClosingCash))}.
                  This amount will be recorded as the final closing cash.
                </p>
                {error && <div className="form-error">{error}</div>}
                <div className="bulk-prompt-actions">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => { setPendingClosingCash(null); setError(""); }}
                  >
                    Back
                  </button>
                  <button type="button" className="primary" onClick={confirmClose} disabled={submitting}>
                    {submitting ? "Closing..." : "Confirm & Close"}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <h3 id="close-till-title">Session Closed</h3>
            <div className="close-result-row"><span>Expected</span><span>{formatCurrency(result.expected_cash)}</span></div>
            <div className="close-result-row"><span>Counted</span><span>{formatCurrency(result.closing_cash)}</span></div>
            <div className={`close-result-row difference ${difference < 0 ? "negative" : difference > 0 ? "positive" : ""}`}>
              <span>Difference</span>
              <span>{difference > 0 ? "+" : ""}{formatCurrency(difference)}</span>
            </div>
            <p className="difference-note">
              {difference < 0
                ? `Short by ${formatCurrency(Math.abs(difference))}. This has been logged for the owner to review.`
                : difference > 0
                  ? `Over by ${formatCurrency(difference)}. This surplus has been logged for the owner to review.`
                  : "The counted cash matches the expected amount."}
            </p>
            <button className="primary" onClick={onClosed}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}
