import { useEffect, useState } from "react";
import {
  listProducts, createProduct, deactivateProduct, reactivateProduct,
  permanentlyDeleteProduct,
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
  const [productFilter, setProductFilter] = useState("active");
  const [productSearch, setProductSearch] = useState("");
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

  async function refreshProducts() {
    try {
      setProducts(await listProducts("?include_inactive=true"));
    } catch (err) {
      setError(getErrorMessage(err, "Could not load products."));
    }
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
    setError("");
    try {
      await deactivateProduct(id);
      await refreshProducts();
    } catch (err) {
      setError(getErrorMessage(err, "Could not deactivate product."));
    }
  }

  async function handleReactivateProduct(id) {
    setError("");
    try {
      await reactivateProduct(id);
      await refreshProducts();
    } catch (err) {
      setError(getErrorMessage(err, "Could not reactivate product."));
    }
  }

  async function handlePermanentlyDeleteProduct(product) {
    if (!window.confirm(`Permanently delete "${product.name}"? This cannot be undone.`)) return;
    setError("");
    try {
      await permanentlyDeleteProduct(product.id);
      setVariantsByProduct((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      if (expandedId === product.id) setExpandedId(null);
      await refreshProducts();
    } catch (err) {
      setError(getErrorMessage(err, "Could not permanently delete product."));
    }
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

  const normalizedSearch = productSearch.trim().toLocaleLowerCase();
  const visibleProducts = products.filter((product) => {
    const matchesFilter = productFilter === "all"
      || (productFilter === "active" ? product.is_active : !product.is_active);
    const matchesSearch = !normalizedSearch
      || `${product.name} ${product.category || ""}`.toLocaleLowerCase().includes(normalizedSearch);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="products-page">
      <header className="products-page-heading">
        <div>
          <span className="products-eyebrow">INVENTORY</span>
          <h1>Products</h1>
          <p>Manage your catalog, pricing, and stock in one place.</p>
        </div>
        <div className="products-total">
          <span>{products.length}</span>
          <small>{products.length === 1 ? "product in catalog" : "products in catalog"}</small>
        </div>
      </header>

      <form className="new-product-form" onSubmit={handleCreateProduct}>
        <div className="form-card-heading">
          <div className="form-card-icon" aria-hidden="true">+</div>
          <div>
            <h2>Add a product</h2>
            <p>Start with the product name, then add its sellable variants and prices.</p>
          </div>
        </div>
        <div className="new-product-fields">
          <label className="product-field">
            <span>Product name <b>*</b></span>
            <input
              placeholder="e.g. Sugar"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              required
            />
          </label>
          <label className="product-field">
            <span>Category <small>Optional</small></span>
            <input
              placeholder="e.g. Pantry"
              list="product-category-options"
              value={newProductCategory}
              onChange={(e) => setNewProductCategory(e.target.value)}
            />
          </label>
        </div>
        <datalist id="product-category-options">
          {[...new Set(products.map((product) => product.category).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b))
            .map((category) => <option key={category} value={category} />)}
        </datalist>

        <div className="new-product-variants">
          <div className="new-product-section-heading">
            <div>
              <h2>Sellable variants</h2>
              <span>Add the sizes or types customers can buy.</span>
            </div>
            <span className="variant-count">{newProductVariants.length} {newProductVariants.length === 1 ? "variant" : "variants"}</span>
          </div>
          {newProductVariants.map((variant, index) => (
            <div className={`new-product-variant-row ${variant.saleMode}-variant-row`} key={index}>
              <label className="product-field variant-name-field">
                <span>Variant name <b>*</b></span>
                <input
                  aria-label={`Variant ${index + 1} name`}
                  placeholder="e.g. 2kg pack, Loose"
                  value={variant.name}
                  onChange={(e) => updateNewVariant(index, "name", e.target.value)}
                  required
                />
              </label>
              <label className="product-field variant-unit-field">
                <span>Unit</span>
                <select
                  aria-label={`Variant ${index + 1} unit`}
                  value={variant.unit}
                  onChange={(e) => updateNewVariant(index, "unit", e.target.value)}
                >
                  {UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </label>
              <label className="product-field variant-mode-field">
                <span>Sale type</span>
                <select
                  aria-label={`Variant ${index + 1} sale mode`}
                  value={variant.saleMode}
                  onChange={(e) => updateNewVariant(index, "saleMode", e.target.value)}
                >
                  <option value="fixed">Fixed pack</option>
                  <option value="bulk">Bulk / measured</option>
                </select>
              </label>
              {variant.saleMode === "fixed" && (
                <label className="product-field variant-quantity-field">
                  <span>Pack size <b>*</b></span>
                  <input
                    aria-label={`Variant ${index + 1} pack size`}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 2"
                    value={variant.unitQuantity}
                    onChange={(e) => updateNewVariant(index, "unitQuantity", e.target.value)}
                    required
                  />
                </label>
              )}
              <label className="product-field price-field variant-selling-field">
                <span>Selling price <b>*</b></span>
                <div className="money-input">
                  <span>KSh</span>
                  <input
                    aria-label={`Variant ${index + 1} selling price`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={variant.sellingPrice}
                    onChange={(e) => updateNewVariant(index, "sellingPrice", e.target.value)}
                    required
                  />
                  {variant.saleMode === "bulk" && <small>/{variant.unit}</small>}
                </div>
              </label>
              <label className="product-field price-field variant-cost-field">
                <span>Cost price <small>Optional</small></span>
                <div className="money-input">
                  <span>KSh</span>
                  <input
                    aria-label={`Variant ${index + 1} cost price`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={variant.costPrice}
                    onChange={(e) => updateNewVariant(index, "costPrice", e.target.value)}
                  />
                </div>
              </label>
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
            + Add variant
          </button>
        </div>

        <div className="new-product-submit">
          <button type="submit" disabled={isCreatingProduct}>
            {isCreatingProduct ? "Saving..." : "Save product"}
          </button>
        </div>
      </form>
      {error && <div className="form-error" role="alert">{error}</div>}

      <section className="inventory-section" aria-label="Product inventory">
        <div className="inventory-toolbar">
          <div>
            <h2>Product inventory</h2>
            <p>Search your catalog or filter by product status.</p>
          </div>
          <label className="product-search">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              aria-label="Search products"
              placeholder="Search products or categories"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            {productSearch && (
              <button type="button" onClick={() => setProductSearch("")} aria-label="Clear search">×</button>
            )}
          </label>
        </div>
        <div className="inventory-controls">
          <div className="product-filters" aria-label="Filter products">
            {[
              ["active", "Active"],
              ["inactive", "Deactivated"],
              ["all", "All"],
            ].map(([filter, label]) => (
              <button
                key={filter}
                type="button"
                className={productFilter === filter ? "selected" : ""}
                aria-pressed={productFilter === filter}
                onClick={() => setProductFilter(filter)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="result-count">{visibleProducts.length} {visibleProducts.length === 1 ? "product" : "products"}</span>
        </div>

      <div className="product-list">
        {visibleProducts.map((product) => (
          <div className={`product-card${product.is_active ? "" : " inactive-product"}`} key={product.id}>
            <div className="product-card-header">
              <button
                type="button"
                className="product-card-identity product-expand-trigger"
                onClick={() => toggleExpand(product.id)}
                aria-expanded={expandedId === product.id}
              >
                <span className="product-avatar" aria-hidden="true">{product.name.slice(0, 1).toLocaleUpperCase()}</span>
                <div className="product-details">
                  <span className="product-name">{product.name}</span>
                  {product.category && <span className="product-category">{product.category}</span>}
                </div>
                {!product.is_active && <span className="product-status">Deactivated</span>}
              </button>
              <div className="product-card-actions">
                {product.is_active ? (
                  <button
                    type="button"
                    className="danger"
                    onClick={(e) => { e.stopPropagation(); handleDeactivateProduct(product.id); }}
                  >
                    Deactivate
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="restore-product"
                      onClick={(e) => { e.stopPropagation(); handleReactivateProduct(product.id); }}
                    >
                      Reactivate
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={(e) => { e.stopPropagation(); handlePermanentlyDeleteProduct(product); }}
                    >
                      Delete permanently
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="expand-arrow"
                  aria-label={`${expandedId === product.id ? "Collapse" : "Expand"} ${product.name}`}
                  aria-expanded={expandedId === product.id}
                  onClick={() => toggleExpand(product.id)}
                >
                  {expandedId === product.id ? "−" : "+"}
                </button>
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
        {visibleProducts.length === 0 && (
          <p className="empty-hint">
            {productSearch
              ? `No products match “${productSearch}”.`
              : productFilter === "active" && products.length === 0
              ? "No products yet — add your first one above."
              : `No ${productFilter === "inactive" ? "deactivated " : ""}products found.`}
          </p>
        )}
      </div>
      </section>
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
            <th scope="col">Name</th>
            <th scope="col">Mode</th>
            <th scope="col">Unit</th>
            <th scope="col">Price</th>
            <th scope="col">Stock</th>
            <th scope="col">Actions</th>
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
              <td>
                {v.quantity == null ? (
                  <span className="stock-indicator stock-untracked">Not tracked</span>
                ) : v.quantity <= 0 ? (
                  <span className="stock-indicator stock-out">Out of stock <b>0</b></span>
                ) : (
                  <span className="stock-indicator stock-available"><i aria-hidden="true" />{v.quantity} {v.quantity === 1 ? "unit" : "units"}</span>
                )}
              </td>
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
          {presetError && <div className="form-error" role="alert">{presetError}</div>}
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
      {error && <div className="form-error" role="alert">{error}</div>}
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