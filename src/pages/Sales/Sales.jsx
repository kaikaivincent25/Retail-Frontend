import { useEffect, useRef, useState } from "react";
import {
  getCurrentSession, openSession, getPopularProducts, browseVariants, completeSale,
} from "../../services/salesApi";
import { closeSession } from "../../services/cashSessionApi";
import { extractErrorMessage } from "../../services/errorHandling";
import { useToast } from "../../context/ToastContext";
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
  const amountInputRef = useRef(null);
  const bulkInputRef = useRef(null);
  const [bulkPromptVariant, setBulkPromptVariant] = useState(null);
  const [bulkPresetVariant, setBulkPresetVariant] = useState(null);
  const [bulkAmountInput, setBulkAmountInput] = useState("");
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }
  const [submitting, setSubmitting] = useState(false);
  const [closingModalOpen, setClosingModalOpen] = useState(false);

  useEffect(() => {
    getCurrentSession().then(setSession);
  }, []);

  useEffect(() => {
    if (bulkPromptVariant) {
      requestAnimationFrame(() => bulkInputRef.current?.focus());
    }
  }, [bulkPromptVariant]);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") {
        setBulkPromptVariant(null);
        setBulkPresetVariant(null);
        setClosingModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    if (session) {
      getPopularProducts().then(setPopular);
    }
  }, [session]);

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

  function tapDenomination(value) {
    setAmountReceived(String(value));
  }

  async function handleCompleteSale() {
    if (cart.length === 0 || received < total || submitting) return;
    setSubmitting(true);

    try {
      const sale = await completeSale(
        cart.map((line) => ({ variant_id: line.variant.variant_id, quantity: Math.round(line.quantity) })),
        Number(received.toFixed(2))
      );
      setCart([]);
      setAmountReceived("");
      amountInputRef.current?.focus();
      setMessage({ type: "success", text: `Sale complete. Change due: KSh ${sale.change}` });
      getPopularProducts().then(setPopular); // refresh ranking for next customer
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
      <div className="sales-grid-panel">
        <div className="sales-header-row">
          <h2>Sell</h2>
          <button className="close-till-button" onClick={() => setClosingModalOpen(true)}>
            Close Till
          </button>
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
            type="text"
            className="product-search-input"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {message && <div className={`sale-message ${message.type}`}>{message.text}</div>}

        <div className="quick-sell-grid">
          {(viewMode === "popular" ? popular : allItems).map((item) => (
            <button
              key={item.variant_id}
              className="quick-sell-tile"
              disabled={item.quantity_in_stock === 0}
              onClick={() => handleTileTap(item)}
            >
              <span className="tile-name">{item.product_name}</span>
              <span className="tile-variant">{item.variant_name}</span>
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
        {(viewMode === "popular" ? popular : allItems).length === 0 && (
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
            onClosed={() => {
              setClosingModalOpen(false);
              setSession(null);
            }}
          />
        )}
      </div>

      <div className="cart-panel">
        <h2>Cart</h2>

        <div className="cart-lines">
          {cart.length === 0 && <p className="empty-hint">Cart is empty</p>}
          {cart.map((line) => (
            <div className="cart-line" key={line.variant.variant_id}>
              <div className="cart-line-info">
                <span className="cart-line-name">{line.variant.variant_name}</span>
                <span className="cart-line-price">{formatCurrency(line.variant.selling_price)} each</span>
              </div>

              {line.variant.sale_mode === "fixed" ? (
                <div className="cart-line-qty">
                  <button onClick={() => updateQuantity(line.variant.variant_id, -1)}>-</button>
                  <span>{line.quantity}</span>
                  <button onClick={() => updateQuantity(line.variant.variant_id, 1)}>+</button>
                </div>
              ) : (
                <span className="cart-line-qty-bulk">{line.quantity} {line.variant.unit}</span>
              )}

              <span className="cart-line-total">
                {formatCurrency(line.variant.selling_price * line.quantity)}
              </span>
              <button className="cart-line-remove" onClick={() => removeLine(line.variant.variant_id)}>×</button>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <div className="cart-total-row">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>

          <div className="denomination-row">
            {DENOMINATIONS.map((d) => (
              <button key={d} onClick={() => tapDenomination(d)}>{formatCurrency(d)}</button>
            ))}
          </div>

          <input
            ref={amountInputRef}
            className="amount-received-input"
            type="number"
            min="0"
            step="0.01"
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            placeholder="Cash received"
          />

          {amountReceived !== "" && received < total && (
            <div className="change-row negative">Short by {formatCurrency(total - received)}</div>
          )}
          {amountReceived !== "" && received >= total && (
            <div className="change-row">Change: {formatCurrency(change)}</div>
          )}

          <button
            className="complete-sale-button"
            disabled={cart.length === 0 || received < total || submitting}
            onClick={handleCompleteSale}
          >
            {submitting
              ? "Processing..."
              : cart.length === 0
              ? "Cart is empty"
              : received < total
              ? "Awaiting full payment"
              : "Complete Sale"}
          </button>
        </div>
      </div>
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
                <p>Opened with {formatCurrency(session.opening_cash)}. Count the cash in the drawer and enter it below.</p>
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
            <div className={`close-result-row difference ${Number(result.difference) < 0 ? "negative" : Number(result.difference) > 0 ? "positive" : ""}`}>
              <span>Difference</span>
              <span>{Number(result.difference) > 0 ? "+" : ""}{formatCurrency(result.difference)}</span>
            </div>
            {result.difference !== 0 && (
              <p className="difference-note">
                {result.difference < 0
                  ? "This shows a shortage — it's been logged for the owner to review."
                  : "This shows an excess — it's been logged for the owner to review."}
              </p>
            )}
            <button className="primary" onClick={onClosed}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}