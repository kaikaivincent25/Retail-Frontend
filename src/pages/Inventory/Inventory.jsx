
import { useEffect, useState } from "react";
import { formatCurrency } from "../../utils/money";
import {
  listInventory,
  listLowStock,
  adjustStock,
  getMovements,
  recordStaffConsumption,
} from "../../services/inventoryApi";
import "./Inventory.css";

const MOVEMENT_TYPES = [
  { value: "purchase", label: "Purchase (stock received)" },
  { value: "adjustment", label: "Adjustment (correction)" },
  { value: "damage", label: "Damage / write-off" },
];

function Inventory() {
  const [tab, setTab] = useState("all");
  const [variants, setVariants] = useState([]);
  const [adjustingVariant, setAdjustingVariant] = useState(null);
  const [consumingVariant, setConsumingVariant] = useState(null);
  const [historyVariant, setHistoryVariant] = useState(null);
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    refresh();
  }, [tab]);

  function refresh() {
    (tab === "all" ? listInventory() : listLowStock()).then(setVariants);
  }

  async function openHistory(variant) {
    setHistoryVariant(variant);
    const data = await getMovements(variant.id);
    setMovements(data);
  }

  return (
    <div className="inventory-page">

      {/* Page Header */}
      <header className="inventory-header">
        <div>
          <span className="inventory-eyebrow">STOCK MANAGEMENT</span>
          <h1>Inventory</h1>
          <p>Monitor stock levels, manage quantities and review stock movements.</p>
        </div>

        <div className="inventory-header-badge">
          <span className="inventory-header-icon">▤</span>
          <span>Inventory Management</span>
        </div>
      </header>

      {/* Inventory Content */}
      <section className="inventory-panel">

        <div className="inventory-panel-header">
          <div>
            <h2>Stock Overview</h2>
            <p>View and manage your product variants.</p>
          </div>

          <div className="inventory-count">
            <span className="count-indicator" />
            {variants.length} {variants.length === 1 ? "item" : "items"}
          </div>
        </div>

        {/* Tabs */}
        <div className="inventory-tabs">
          <button
            className={tab === "all" ? "active" : ""}
            onClick={() => setTab("all")}
          >
            <span className="tab-icon">▤</span>
            All Stock
          </button>

          <button
            className={tab === "low" ? "active" : ""}
            onClick={() => setTab("low")}
          >
            <span className="tab-icon">!</span>
            Low Stock
          </button>
        </div>

        {/* Inventory Table */}
        <div className="inventory-table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product Variant</th>
                <th>Sale Mode</th>
                <th>Available Quantity</th>
                <th>Reorder Level</th>
                <th className="actions-heading">Actions</th>
              </tr>
            </thead>

            <tbody>
              {variants.map((v) => (
                <tr
                  key={v.id}
                  className={v.quantity <= v.reorder_level ? "low-row" : ""}
                >
                  <td>
                    <div className="inventory-product">
                      <div className="inventory-product-icon">▤</div>
                      <span>{v.name}</span>
                    </div>
                  </td>

                  <td>
                    <span className={`mode-badge ${v.sale_mode}`}>
                      {v.sale_mode === "bulk" ? `Bulk · ${v.unit}` : "Fixed"}
                    </span>
                  </td>

                  <td>
                    <div className={`stock-quantity ${v.quantity <= v.reorder_level ? "low" : "normal"}`}>
                      <span className="quantity-dot" />
                      <strong>{v.quantity}</strong>
                      <span>{v.sale_mode === "bulk" ? v.unit : "units"}</span>
                    </div>
                  </td>

                  <td>
                    <span className="reorder-value">{v.reorder_level}</span>
                  </td>

                  <td className="row-actions">
                    <button
                      className="adjust-button"
                      onClick={() => setAdjustingVariant(v)}
                    >
                      <span>±</span> Adjust
                    </button>

                    <button
                      className="history-button"
                      onClick={() => openHistory(v)}
                    >
                      <span>◷</span> History
                    </button>

                    <button
                      className="history-button"
                      onClick={() => setConsumingVariant(v)}
                    >
                      Staff use
                    </button>
                  </td>
                </tr>
              ))}

              {variants.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-hint">
                    <div className="inventory-empty">
                      <span className="inventory-empty-icon">▤</span>
                      <strong>
                        {tab === "low"
                          ? "Everything looks good"
                          : "No inventory found"}
                      </strong>
                      <span>
                        {tab === "low"
                          ? "Nothing is low on stock right now."
                          : "Your product variants will appear here."}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="inventory-table-footer">
          <span>Showing {variants.length} {variants.length === 1 ? "product variant" : "product variants"}</span>
          <span>Stock levels are based on recorded inventory.</span>
        </div>

      </section>

      {/* Adjustment Modal */}
      {adjustingVariant && (
        <AdjustModal
          variant={adjustingVariant}
          onClose={() => setAdjustingVariant(null)}
          onSaved={() => {
            setAdjustingVariant(null);
            refresh();
          }}
        />
      )}

      {consumingVariant && (
        <StaffConsumptionModal
          variant={consumingVariant}
          onClose={() => setConsumingVariant(null)}
          onSaved={() => {
            setConsumingVariant(null);
            refresh();
          }}
        />
      )}

      {/* History Modal */}
      {historyVariant && (
        <HistoryModal
          variant={historyVariant}
          movements={movements}
          onClose={() => {
            setHistoryVariant(null);
            setMovements([]);
          }}
        />
      )}

    </div>
  );
}

function AdjustModal({ variant, onClose, onSaved }) {
  const [direction, setDirection] = useState("add");
  const [movementType, setMovementType] = useState("purchase");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const parsed = parseInt(amount, 10);

    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a positive amount.");
      return;
    }

    try {
      await adjustStock(variant.id, {
        delta: direction === "add" ? parsed : -parsed,
        movement_type: movementType,
        reason: reason || null,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not adjust stock.");
    }
  }

  const unitLabel = variant.sale_mode === "bulk" ? variant.unit : "unit";

  return (
    <div className="modal-overlay">
      <form className="modal-card" onSubmit={handleSubmit}>

        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">INVENTORY MANAGEMENT</span>
            <h3>Adjust Stock</h3>
            <p className="modal-subtitle">{variant.name}</p>
          </div>

          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-current-stock">
          <span>Current stock</span>
          <strong>
            {variant.quantity} {unitLabel}{variant.sale_mode === "bulk" ? "" : "s"}
          </strong>
        </div>

        <div className="modal-form-content">

          <label className="form-section-label">Adjustment direction</label>

          <div className="direction-toggle">
            <button
              type="button"
              className={direction === "add" ? "active add-active" : ""}
              onClick={() => setDirection("add")}
            >
              <span>+</span>
              Add stock
            </button>

            <button
              type="button"
              className={direction === "remove" ? "active remove-active" : ""}
              onClick={() => setDirection("remove")}
            >
              <span>−</span>
              Remove stock
            </button>
          </div>

          <label htmlFor="stock-amount">
            Amount ({unitLabel}{variant.sale_mode === "bulk" ? "" : "s"})
          </label>

          <input
            id="stock-amount"
            className="modal-input"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
          />

          <label htmlFor="movement-reason">Reason</label>

          <select
            id="movement-reason"
            className="modal-input"
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
          >
            {MOVEMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <label htmlFor="stock-notes">Notes <span>(optional)</span></label>

          <input
            id="stock-notes"
            className="modal-input"
            placeholder={direction === "add" ? "e.g. 50kg sack delivery" : "e.g. spillage"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {error && (
            <div className="form-error" role="alert">
              <span>!</span>
              {error}
            </div>
          )}

        </div>

        <div className="modal-actions">
          <button type="button" className="cancel-button" onClick={onClose}>
            Cancel
          </button>

          <button
            type="submit"
            className={`primary ${direction === "remove" ? "remove-submit" : ""}`}
          >
            {direction === "add" ? "Add" : "Remove"} {amount || "0"} {unitLabel}
          </button>
        </div>

      </form>
    </div>
  );
}

function HistoryModal({ variant, movements, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card wide">

        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">STOCK RECORDS</span>
            <h3>Movement History</h3>
            <p className="modal-subtitle">{variant.name}</p>
          </div>

          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="history-summary">
          <span>Recorded stock movements</span>
          <strong>{movements.length}</strong>
        </div>

        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Movement Type</th>
                <th>Change</th>
                <th>Before → After</th>
                <th>Staff-use cost</th>
                <th>Reason</th>
              </tr>
            </thead>

            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.created_at).toLocaleString()}</td>

                  <td>
                    <span className={`type-badge ${m.movement_type}`}>
                      {m.movement_type}
                    </span>
                  </td>

                  <td className={m.quantity >= 0 ? "positive" : "negative"}>
                    {m.quantity >= 0 ? "+" : ""}{m.quantity}
                  </td>

                  <td>
                    <span className="history-quantity">
                      {m.previous_quantity} <span>→</span> {m.new_quantity}
                    </span>
                  </td>

                  <td>
                    {m.unit_cost_at_time != null
                      ? formatCurrency(Number(m.unit_cost_at_time) * Math.abs(m.quantity))
                      : "—"}
                  </td>

                  <td>{m.reason || "—"}</td>
                </tr>
              ))}

              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-hint">
                    <div className="inventory-empty">
                      <span className="inventory-empty-icon">◷</span>
                      <strong>No movements recorded</strong>
                      <span>Stock movement records will appear here.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="modal-actions">
          <button className="cancel-button" onClick={onClose}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

function StaffConsumptionModal({ variant, onClose, onSaved }) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Staff meal");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const unitLabel = variant.sale_mode === "bulk" ? variant.unit : "unit";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await recordStaffConsumption(variant.id, {
        quantity: Number(quantity),
        reason: reason.trim() || null,
      });
      onSaved();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not record staff consumption.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="staff-consumption-title">
      <form className="modal-card" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">INTERNAL STOCK USE</span>
            <h3 id="staff-consumption-title">Record staff consumption</h3>
            <p className="modal-subtitle">{variant.name}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-current-stock">
          <span>Available stock</span>
          <strong>{variant.quantity} {unitLabel}{variant.sale_mode === "bulk" ? "" : "s"}</strong>
        </div>

        <p>This reduces inventory and records its cost separately. It does not change till cash or create a sale.</p>

        <div className="modal-form-content">
          <label htmlFor="staff-consumption-quantity">
            Quantity ({unitLabel}{variant.sale_mode === "bulk" ? "" : "s"})
          </label>
          <input
            id="staff-consumption-quantity"
            className="modal-input"
            type="number"
            min="1"
            max={variant.quantity}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            autoFocus
            required
          />
          <label htmlFor="staff-consumption-reason">Reason</label>
          <input
            id="staff-consumption-reason"
            className="modal-input"
            maxLength="255"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {error && <div className="form-error" role="alert">{error}</div>}
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Recording…" : "Record use"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Inventory;