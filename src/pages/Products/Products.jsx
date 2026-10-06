import { useEffect, useState } from "react";
import {
  listProducts, createProduct, deactivateProduct,
  listVariants, createVariant, deactivateVariant,
} from "../../services/catalogApi";
import api from "../../services/api";
import { toCents, fromCents } from "../../utils/money";
import "./Products.css";

const UNITS = ["piece", "packet", "gram", "kg", "ml", "litre"];

const createPreset = (variantId, data) =>
  api.post(`/variants/${variantId}/presets`, data).then((r) => r.data);
const listPresets = (variantId) =>
  api.get(`/variants/${variantId}/presets`).then((r) => r.data);
const deactivatePreset = (presetId) => api.delete(`/presets/${presetId}`);
const getErrorMessage = (err, fallback) =>
  err.response?.data?.detail || fallback;

function Products() {
  const [products, setProducts] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [variantsByProduct, setVariantsByProduct] = useState({});

  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductVariants, setNewProductVariants] = useState([createEmptyVariant()]);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    refreshProducts();
  }, []);

  function refreshProducts() {
    listProducts().then(setProducts);
  }

  async function handleCreateProduct(e) {
    e.preventDefault();
    setError("");
    setIsCreatingProduct(true);
    try {
      const product = await createProduct({
        name: newProductName,
        category: newProductCategory || null,
        variants: newProductVariants.map((variant) => ({
          name: variant.name,
          unit: variant.unit,
          sale_mode: variant.saleMode,
          unit_quantity: variant.saleMode === "bulk" ? 1 : parseInt(variant.unitQuantity, 10),
          selling_price: fromCents(toCents(variant.sellingPrice)),
          cost_price: fromCents(toCents(variant.costPrice || "0")),
        })),
      });
      setNewProductName("");
      setNewProductCategory("");
      setNewProductVariants([createEmptyVariant()]);
      setVariantsByProduct((prev) => ({ ...prev, [product.id]: product.variants }));
      setExpandedId(product.id);
      setProducts((prev) =>
        [...prev, product].sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Could not create product and variants."));
    } finally {
      setIsCreatingProduct(false);
    }
  }

  function updateNewVariant(index, field, value) {
    setNewProductVariants((prev) =>
      prev.map((variant, i) => i === index ? { ...variant, [field]: value } : variant),
    );
  }

  function removeNewVariant(index) {
    setNewProductVariants((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleDeactivateProduct(id) {
    if (!window.confirm("Deactivate this product? It will be hidden from the sales screen.")) return;
    await deactivateProduct(id);
    refreshProducts();
  }

  async function toggleExpand(productId) {
    if (expandedId === productId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(productId);
    if (!variantsByProduct[productId]) {
      const variants = await listVariants(productId, true);
      setVariantsByProduct((prev) => ({ ...prev, [productId]: variants }));
    }
  }

  async function refreshVariants(productId) {
    const variants = await listVariants(productId, true);
    setVariantsByProduct((prev) => ({ ...prev, [productId]: variants }));
  }

  return (
    <div className="products-page">
      <h1>Products</h1>

      <form className="new-product-form" onSubmit={handleCreateProduct}>
        <div className="new-product-fields">
          <input
            placeholder="Product name (e.g. Sugar)"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            required
          />
          <input
            placeholder="Category (optional)"
            value={newProductCategory}
            onChange={(e) => setNewProductCategory(e.target.value)}
          />
        </div>

        <div className="new-product-variants">
          <div className="new-product-section-heading">
            <h2>Variants</h2>
            <span>Add the sizes or types you sell.</span>
          </div>
          {newProductVariants.map((variant, index) => (
            <div className="new-product-variant-row" key={index}>
              <input
                aria-label={`Variant ${index + 1} name`}
                placeholder="Variant name (e.g. 2kg pack, Loose)"
                value={variant.name}
                onChange={(e) => updateNewVariant(index, "name", e.target.value)}
                required
              />
              <select
                aria-label={`Variant ${index + 1} unit`}
                value={variant.unit}
                onChange={(e) => updateNewVariant(index, "unit", e.target.value)}
              >
                {UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
              <select
                aria-label={`Variant ${index + 1} sale mode`}
                value={variant.saleMode}
                onChange={(e) => updateNewVariant(index, "saleMode", e.target.value)}
              >
                <option value="fixed">Fixed pack</option>
                <option value="bulk">Bulk / measured</option>
              </select>
              {variant.saleMode === "fixed" && (
                <input
                  aria-label={`Variant ${index + 1} pack size`}
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Pack size"
                  value={variant.unitQuantity}
                  onChange={(e) => updateNewVariant(index, "unitQuantity", e.target.value)}
                  required
                />
              )}
              <input
                aria-label={`Variant ${index + 1} selling price`}
                type="number"
                min="0"
                step="0.01"
                placeholder={variant.saleMode === "bulk" ? `Price per ${variant.unit}` : "Selling price"}
                value={variant.sellingPrice}
                onChange={(e) => updateNewVariant(index, "sellingPrice", e.target.value)}
                required
              />
              <input
                aria-label={`Variant ${index + 1} cost price`}
                type="number"
                min="0"
                step="0.01"
                placeholder="Cost (optional)"
                value={variant.costPrice}
                onChange={(e) => updateNewVariant(index, "costPrice", e.target.value)}
              />
              {newProductVariants.length > 1 && (
                <button
                  className="remove-new-variant"
                  type="button"
                  aria-label={`Remove variant ${index + 1}`}
                  onClick={() => removeNewVariant(index)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            className="add-new-variant"
            type="button"
            onClick={() => setNewProductVariants((prev) => [...prev, createEmptyVariant()])}
          >
            + Add another variant
          </button>
        </div>

        <div className="new-product-submit">
          <button type="submit" disabled={isCreatingProduct}>
            {isCreatingProduct ? "Saving..." : "Save Product"}
          </button>
        </div>
      </form>
      {error && <div className="form-error">{error}</div>}

      <div className="product-list">
        {products.map((product) => (
          <div className="product-card" key={product.id}>
            <div className="product-card-header" onClick={() => toggleExpand(product.id)}>
              <div>
                <span className="product-name">{product.name}</span>
                {product.category && <span className="product-category">{product.category}</span>}
              </div>
              <div className="product-card-actions">
                <button
                  className="danger"
                  onClick={(e) => { e.stopPropagation(); handleDeactivateProduct(product.id); }}
                >
                  Deactivate
                </button>
                <span className="expand-arrow">{expandedId === product.id ? "▲" : "▼"}</span>
              </div>
            </div>

            {expandedId === product.id && (
              <VariantsPanel
                productId={product.id}
                variants={variantsByProduct[product.id] || []}
                onChange={() => refreshVariants(product.id)}
              />
            )}
          </div>
        ))}
        {products.length === 0 && <p className="empty-hint">No products yet — add your first one above.</p>}
      </div>
    </div>
  );
}

function VariantsPanel({ productId, variants, onChange }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("piece");
  const [saleMode, setSaleMode] = useState("fixed");
  const [unitQuantity, setUnitQuantity] = useState("1");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [error, setError] = useState("");
  const [expandedPresetVariant, setExpandedPresetVariant] = useState(null);
  const [presetsByVariant, setPresetsByVariant] = useState({});
  const [presetLabel, setPresetLabel] = useState("");
  const [presetAmount, setPresetAmount] = useState("");
  const [presetError, setPresetError] = useState("");

  async function handleCreateVariant(e) {
    e.preventDefault();
    setError("");
    try {
      await createVariant(productId, {
        name,
        unit,
        sale_mode: saleMode,
        unit_quantity: saleMode === "bulk" ? 1 : parseInt(unitQuantity, 10),
        selling_price: fromCents(toCents(sellingPrice)),
        cost_price: fromCents(toCents(costPrice || "0")),
      });
      setName("");
      setSellingPrice("");
      setCostPrice("");
      setUnitQuantity("1");
      onChange();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create variant.");
    }
  }

  async function handleDeactivateVariant(variantId) {
    if (!window.confirm("Deactivate this variant?")) return;
    await deactivateVariant(variantId);
    onChange();
  }

  async function togglePresets(variant) {
    if (expandedPresetVariant === variant.id) {
      setExpandedPresetVariant(null);
      return;
    }
    setExpandedPresetVariant(variant.id);
    setPresetError("");
    try {
      const presets = await listPresets(variant.id);
      setPresetsByVariant((prev) => ({ ...prev, [variant.id]: presets }));
    } catch (err) {
      setPresetError(getErrorMessage(err, "Could not load presets."));
    }
  }

  async function handleAddPreset(variant) {
    const label = presetLabel.trim();
    const amount = parseInt(presetAmount, 10);
    if (!label || !(amount > 0)) return;
    setPresetError("");
    try {
      await createPreset(variant.id, { label, amount });
      const presets = await listPresets(variant.id);
      setPresetsByVariant((prev) => ({ ...prev, [variant.id]: presets }));
      setPresetLabel("");
      setPresetAmount("");
    } catch (err) {
      setPresetError(getErrorMessage(err, "Could not add portion."));
    }
  }

  async function handleRemovePreset(variant, presetId) {
    setPresetError("");
    try {
      await deactivatePreset(presetId);
      const presets = await listPresets(variant.id);
      setPresetsByVariant((prev) => ({ ...prev, [variant.id]: presets }));
    } catch (err) {
      setPresetError(getErrorMessage(err, "Could not remove portion."));
    }
  }

  return (
    <div className="variants-panel">
      <table className="variants-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Mode</th>
            <th>Unit</th>
            <th>Price</th>
            <th>Stock</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v.id} className={!v.is_active ? "inactive-row" : ""}>
              <td>{v.name}</td>
              <td>
                <span className={`mode-badge ${v.sale_mode}`}>
                  {v.sale_mode === "bulk" ? "Bulk" : `Fixed ×${v.unit_quantity}`}
                </span>
              </td>
              <td>{v.unit}</td>
              <td>KSh {v.selling_price}{v.sale_mode === "bulk" && ` / ${v.unit}`}</td>
              <td>{v.quantity ?? "—"}</td>
              <td>
                {v.is_active && (
                  <div className="variant-row-actions">
                    <button className="danger small" onClick={() => handleDeactivateVariant(v.id)}>
                      Deactivate
                    </button>
                    {v.sale_mode === "bulk" && (
                      <button
                        className="small"
                        aria-expanded={expandedPresetVariant === v.id}
                        onClick={() => togglePresets(v)}
                      >
                        Presets
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
          {variants.length === 0 && (
            <tr><td colSpan={6} className="empty-hint">No variants yet.</td></tr>
          )}
        </tbody>
      </table>

      {expandedPresetVariant && (
        <div className="presets-panel">
          <h4>Portions for this item</h4>
          {presetError && <div className="form-error">{presetError}</div>}
          <div className="preset-chips">
            {(presetsByVariant[expandedPresetVariant] || []).map((preset) => (
              <span className="preset-chip" key={preset.id}>
                {preset.label} — KSh {preset.price}
                <button
                  aria-label={`Remove ${preset.label}`}
                  onClick={() => handleRemovePreset({ id: expandedPresetVariant }, preset.id)}
                >
                  ×
                </button>
              </span>
            ))}
            {presetsByVariant[expandedPresetVariant]?.length === 0 && (
              <span className="preset-empty">No portions configured yet.</span>
            )}
          </div>
          <div className="preset-add-form">
            <input
              placeholder="Label (e.g. 1/4 kg)"
              value={presetLabel}
              onChange={(e) => setPresetLabel(e.target.value)}
            />
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Amount (grams)"
              value={presetAmount}
              onChange={(e) => setPresetAmount(e.target.value)}
            />
            <button
              type="button"
              disabled={!presetLabel.trim() || !(parseInt(presetAmount, 10) > 0)}
              onClick={() => handleAddPreset({ id: expandedPresetVariant })}
            >
              Add Portion
            </button>
          </div>
        </div>
      )}

      <form className="new-variant-form" onSubmit={handleCreateVariant}>
        <input
          placeholder="Variant name (e.g. Kabras 2kg, Loose)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <select value={unit} onChange={(e) => setUnit(e.target.value)}>
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>

        <select value={saleMode} onChange={(e) => setSaleMode(e.target.value)}>
          <option value="fixed">Fixed pack</option>
          <option value="bulk">Bulk / measured</option>
        </select>

        {saleMode === "fixed" && (
          <input
            type="number"
            min="1"
            placeholder="Pack size (e.g. 2 for 2kg)"
            value={unitQuantity}
            onChange={(e) => setUnitQuantity(e.target.value)}
          />
        )}

        <input
          type="number"
          step="0.01"
          min="0"
          placeholder={saleMode === "bulk" ? `Price per ${unit}` : "Price per pack"}
          value={sellingPrice}
          onChange={(e) => setSellingPrice(e.target.value)}
          required
        />

        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Cost price (optional)"
          value={costPrice}
          onChange={(e) => setCostPrice(e.target.value)}
        />

        <button type="submit">Add Variant</button>
      </form>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

function createEmptyVariant() {
  return {
    name: "",
    unit: "piece",
    saleMode: "fixed",
    unitQuantity: "1",
    sellingPrice: "",
    costPrice: "",
  };
}

export default Products;