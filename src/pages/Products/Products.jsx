import { Fragment, useEffect, useState } from "react";
import {
  listProducts, createProduct, updateProduct, deactivateProduct, reactivateProduct,
  permanentlyDeleteProduct,
  listVariants, createVariant, updateVariant, deactivateVariant,
} from "../../services/catalogApi";
import api from "../../services/api";
import { getReceiptProfile } from "../../services/profileApi";
import { toCents, fromCents } from "../../utils/money";
import "./Products.css";

const UNITS = ["piece", "each", "pair", "set", "packet", "pack", "box", "case", "dozen", "bottle", "can", "sheet", "roll", "gram", "kg", "ml", "litre", "metre", "centimetre"];
const EMPTY_ATTRIBUTE = () => ({ key: "", value: "" });
const BUSINESS_TEMPLATES = {
  household_retail: { label: "Household retail", categories: ["Pantry", "Cleaning", "Personal care"], attributes: ["Size", "Pack quantity", "Expiry date"] },
  general_retail: { label: "General retail", categories: ["General merchandise", "Food", "Personal care"], attributes: ["Size", "Material"] },
  bookshop: { label: "Bookshop", categories: ["Textbooks", "Fiction", "Stationery"], attributes: ["ISBN", "Author", "Publisher", "Edition"] },
  electronics: { label: "Electronics", categories: ["Phones", "Computers", "Accessories"], attributes: ["Model", "Serial number", "Warranty period", "Colour"] },
  clothing: { label: "Clothing", categories: ["Men", "Women", "Children", "Accessories"], attributes: ["Size", "Colour", "Material"] },
  cosmetics: { label: "Cosmetics", categories: ["Skincare", "Haircare", "Makeup"], attributes: ["Shade", "Batch number", "Expiry date"] },
};

function attributesToObject(rows) {
  const result = {};
  for (const { key, value } of rows) {
    const cleanKey = key.trim();
    const cleanValue = value.trim();
    if (!cleanKey && !cleanValue) continue;
    if (!cleanKey || !cleanValue) throw new Error("Complete or remove each custom attribute row.");
    if (Object.keys(result).some((existing) => existing.toLocaleLowerCase() === cleanKey.toLocaleLowerCase())) {
      throw new Error(`The attribute “${cleanKey}” is listed more than once.`);
    }
    result[cleanKey] = cleanValue;
  }
  if (Object.keys(result).length > 20) throw new Error("A product can have up to 20 custom attributes.");
  return result;
}

function attributeRows(attributes = {}) {
  const rows = Object.entries(attributes || {}).map(([key, value]) => ({ key, value }));
  return rows.length ? rows : [EMPTY_ATTRIBUTE()];
}

const createPreset = (variantId, data) =>
  api.post(`/variants/${variantId}/presets`, data).then((r) => r.data);
const listPresets = (variantId) =>
  api.get(`/variants/${variantId}/presets`).then((r) => r.data);
const deactivatePreset = (presetId) => api.delete(`/presets/${presetId}`);
const getErrorMessage = (err, fallback) =>
  err.response?.data?.detail || err.message || fallback;

function Products() {
  const [products, setProducts] = useState([]);
  const [productFilter, setProductFilter] = useState("active");
  const [productSearch, setProductSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [variantsByProduct, setVariantsByProduct] = useState({});
  const [editingImageId, setEditingImageId] = useState(null);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);

  const [newProductName, setNewProductName] = useState("");
  const [businessType, setBusinessType] = useState("general_retail");
  const [productTemplate, setProductTemplate] = useState("general_retail");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductBrand, setNewProductBrand] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [newProductAttributes, setNewProductAttributes] = useState([EMPTY_ATTRIBUTE()]);
  const [newProductImageUrl, setNewProductImageUrl] = useState("");
  const [newProductVariants, setNewProductVariants] = useState([createEmptyVariant()]);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => refreshProducts(productSearch), productSearch ? 250 : 0);
    return () => clearTimeout(timer);
  }, [productSearch]);

  useEffect(() => {
    getReceiptProfile().then((profile) => {
      const type = profile.business_type || "general_retail";
      setBusinessType(type);
      setProductTemplate(type);
    }).catch(() => {});
  }, []);

  function applyProductTemplate(type) {
    const template = BUSINESS_TEMPLATES[type] || BUSINESS_TEMPLATES.general_retail;
    setProductTemplate(type);
    if (!newProductCategory) setNewProductCategory(template.categories[0]);
    setNewProductAttributes([EMPTY_ATTRIBUTE()]);
  }

  async function refreshProducts(searchTerm = productSearch) {
    try {
      const params = new URLSearchParams({ include_inactive: "true" });
      if (searchTerm.trim()) params.set("q", searchTerm.trim());
      setProducts(await listProducts(`?${params.toString()}`));
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
        brand: newProductBrand.trim() || null,
        description: newProductDescription.trim() || null,
        attributes: attributesToObject(newProductAttributes),
        image_url: newProductImageUrl.trim() || null,
        variants: newProductVariants.map((variant) => ({
          name: variant.name,
          unit: variant.unit,
          sale_mode: variant.saleMode,
          unit_quantity: variant.saleMode === "bulk" ? 1 : parseInt(variant.unitQuantity, 10),
          selling_price: fromCents(toCents(variant.sellingPrice)),
          cost_price: fromCents(toCents(variant.costPrice || "0")),
          sku: variant.sku.trim() || null,
          barcode: variant.barcode.trim() || null,
        })),
      });
      setNewProductName("");
      setNewProductCategory("");
      setNewProductBrand("");
      setNewProductDescription("");
      setNewProductAttributes([EMPTY_ATTRIBUTE()]);
      setNewProductImageUrl("");
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

  async function handleSaveProductImage(productId) {
    setError("");
    try {
      const updated = await updateProduct(productId, { image_url: imageUrlDraft.trim() || null });
      setProducts((current) => current.map((product) => product.id === productId ? updated : product));
      setEditingImageId(null);
    } catch (err) {
      setError(getErrorMessage(err, "Could not update product image."));
    }
  }

  function startEditingProduct(product) {
    setEditingProduct({
      id: product.id,
      name: product.name,
      category: product.category || "",
      brand: product.brand || "",
      description: product.description || "",
      image_url: product.image_url || "",
      attributes: attributeRows(product.attributes),
    });
  }

  async function handleSaveProductDetails(event) {
    event.preventDefault();
    const draft = editingProduct;
    try {
      const updated = await updateProduct(draft.id, {
        name: draft.name,
        category: draft.category.trim() || null,
        brand: draft.brand.trim() || null,
        description: draft.description.trim() || null,
        image_url: draft.image_url.trim() || null,
        attributes: attributesToObject(draft.attributes),
      });
      setProducts((current) => current.map((product) => product.id === draft.id ? updated : product));
      setEditingProduct(null);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not update product details."));
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

  const visibleProducts = products.filter((product) => {
    const matchesFilter = productFilter === "all"
      || (productFilter === "active" ? product.is_active : !product.is_active);
    return matchesFilter;
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
            <span>Product template</span>
            <select value={productTemplate} onChange={(e) => applyProductTemplate(e.target.value)}>
              {Object.entries(BUSINESS_TEMPLATES).map(([value, template]) => <option key={value} value={value}>{template.label}</option>)}
            </select>
            <small>Business profile: {BUSINESS_TEMPLATES[businessType]?.label || "Retail"}</small>
          </label>
          <label className="product-field">
            <span>Product name <b>*</b></span>
            <input
              placeholder="e.g. Sugar"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              required
            />
          </label>
          <label className="product-field product-image-url-field">
            <span>Product image <small>Optional · shared by variants</small></span>
            <input
              type="url"
              placeholder="https://…"
              value={newProductImageUrl}
              onChange={(e) => setNewProductImageUrl(e.target.value)}
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
          <label className="product-field">
            <span>Brand <small>Optional</small></span>
            <input placeholder="e.g. Samsung, Oxford" value={newProductBrand} onChange={(e) => setNewProductBrand(e.target.value)} maxLength={100} />
          </label>
          <label className="product-field product-description-field">
            <span>Description <small>Optional</small></span>
            <textarea placeholder="Useful product details" value={newProductDescription} onChange={(e) => setNewProductDescription(e.target.value)} maxLength={2000} rows={2} />
          </label>
        </div>
        <AttributeEditor rows={newProductAttributes} onChange={setNewProductAttributes} label="Product attributes" examples={(BUSINESS_TEMPLATES[productTemplate]?.attributes || []).join(", ")} />
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
            <Fragment key={index}>
            <div className={`new-product-variant-row ${variant.saleMode}-variant-row`}>
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
                <span>Cost price <small>Required before sale</small></span>
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
            <div className="variant-identifiers-row">
              <label className="product-field">
                <span>SKU <small>Optional</small></span>
                <input aria-label={`Variant ${index + 1} SKU`} value={variant.sku} onChange={(e) => updateNewVariant(index, "sku", e.target.value)} maxLength={50} />
              </label>
              <label className="product-field">
                <span>Barcode <small>Optional</small></span>
                <input aria-label={`Variant ${index + 1} barcode`} inputMode="numeric" value={variant.barcode} onChange={(e) => updateNewVariant(index, "barcode", e.target.value)} maxLength={64} />
              </label>
            </div>
            </Fragment>
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
                {product.image_url ? (
                  <img
                    className="product-avatar product-avatar-image"
                    src={product.image_url}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      const fallback = document.createElement("span");
                      fallback.className = "product-avatar";
                      fallback.textContent = product.name.slice(0, 1).toLocaleUpperCase();
                      event.currentTarget.replaceWith(fallback);
                    }}
                  />
                ) : (
                  <span className="product-avatar" aria-hidden="true">{product.name.slice(0, 1).toLocaleUpperCase()}</span>
                )}
                <div className="product-details">
                  <span className="product-name">{product.name}</span>
                  {product.category && <span className="product-category">{product.category}</span>}
                  {product.brand && <small className="product-brand">{product.brand}</small>}
                </div>
                {!product.is_active && <span className="product-status">Deactivated</span>}
              </button>
              <div className="product-card-actions">
                <button
                  type="button"
                  className="restore-product"
                  onClick={() => {
                    setEditingImageId(editingImageId === product.id ? null : product.id);
                    setImageUrlDraft(product.image_url || "");
                  }}
                >
                  {product.image_url ? "Change image" : "Add image"}
                </button>
                <button type="button" className="restore-product" onClick={() => editingProduct?.id === product.id ? setEditingProduct(null) : startEditingProduct(product)}>
                  {editingProduct?.id === product.id ? "Close details" : "Edit details"}
                </button>
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

            {editingImageId === product.id && (
              <form
                className="product-image-editor"
                onSubmit={(event) => { event.preventDefault(); handleSaveProductImage(product.id); }}
              >
                <label className="product-field">
                  <span>Image URL <small>applies to every variant of this product</small></span>
                  <input
                    type="url"
                    placeholder="https://…"
                    value={imageUrlDraft}
                    onChange={(event) => setImageUrlDraft(event.target.value)}
                  />
                </label>
                <button type="submit">Save image</button>
                <button type="button" className="restore-product" onClick={() => setEditingImageId(null)}>Cancel</button>
              </form>
            )}

            {editingProduct?.id === product.id && (
              <form className="product-details-editor" onSubmit={handleSaveProductDetails}>
                <div className="product-details-editor-grid">
                  <label className="product-field"><span>Product name</span><input value={editingProduct.name} onChange={(event) => setEditingProduct({ ...editingProduct, name: event.target.value })} required maxLength={150} /></label>
                  <label className="product-field"><span>Category</span><input list="product-category-options" value={editingProduct.category} onChange={(event) => setEditingProduct({ ...editingProduct, category: event.target.value })} maxLength={100} /></label>
                  <label className="product-field"><span>Brand</span><input value={editingProduct.brand} onChange={(event) => setEditingProduct({ ...editingProduct, brand: event.target.value })} maxLength={100} /></label>
                  <label className="product-field"><span>Image URL</span><input type="url" value={editingProduct.image_url} onChange={(event) => setEditingProduct({ ...editingProduct, image_url: event.target.value })} maxLength={2048} /></label>
                  <label className="product-field product-description-field"><span>Description</span><textarea rows={2} value={editingProduct.description} onChange={(event) => setEditingProduct({ ...editingProduct, description: event.target.value })} maxLength={2000} /></label>
                </div>
                <AttributeEditor rows={editingProduct.attributes} onChange={(attributes) => setEditingProduct({ ...editingProduct, attributes })} label="Product attributes" examples="ISBN, author, model, colour, storage" />
                <div className="product-details-editor-actions">
                  <button type="button" className="restore-product" onClick={() => setEditingProduct(null)}>Cancel</button>
                  <button type="submit">Save product details</button>
                </div>
              </form>
            )}

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
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
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
  const [editingVariant, setEditingVariant] = useState(null);

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
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
      });
      setName("");
      setSku("");
      setBarcode("");
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

  async function handleSaveVariant(event) {
    event.preventDefault();
    setError("");
    try {
      await updateVariant(editingVariant.id, {
        name: editingVariant.name,
        selling_price: fromCents(toCents(editingVariant.selling_price)),
        cost_price: fromCents(toCents(editingVariant.cost_price)),
      });
      setEditingVariant(null);
      onChange();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update this variant."));
    }
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
            <th scope="col">Cost</th>
            <th scope="col">Stock</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v.id} className={!v.is_active ? "inactive-row" : ""}>
              <td>
                {editingVariant?.id === v.id ? <input value={editingVariant.name} onChange={(e) => setEditingVariant({ ...editingVariant, name: e.target.value })} /> : v.name}
                {(v.barcode || v.sku) && <small className="variant-identifiers-summary">{v.barcode && `Barcode: ${v.barcode}`}{v.barcode && v.sku ? " · " : ""}{v.sku && `SKU: ${v.sku}`}</small>}
              </td>
              <td>
                <span className={`mode-badge ${v.sale_mode}`}>
                  {v.sale_mode === "bulk" ? "Bulk" : `Fixed ×${v.unit_quantity}`}
                </span>
              </td>
              <td>{v.unit}</td>
              <td>{editingVariant?.id === v.id ? <input type="number" min="0" step="0.01" value={editingVariant.selling_price} onChange={(e) => setEditingVariant({ ...editingVariant, selling_price: e.target.value })} /> : <>KSh {v.selling_price}{v.sale_mode === "bulk" && ` / ${v.unit}`}</>}</td>
              <td>{editingVariant?.id === v.id ? <input type="number" min="0" step="0.01" value={editingVariant.cost_price} onChange={(e) => setEditingVariant({ ...editingVariant, cost_price: e.target.value })} /> : `KSh ${v.cost_price}`}</td>
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
                    {editingVariant?.id === v.id ? <>
                      <button className="small" onClick={handleSaveVariant}>Save</button>
                      <button className="small" type="button" onClick={() => setEditingVariant(null)}>Cancel</button>
                    </> : <button className="small" onClick={() => setEditingVariant({ id: v.id, name: v.name, selling_price: v.selling_price, cost_price: v.cost_price })}>Edit</button>}
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
            <tr><td colSpan={7} className="empty-hint">No variants yet.</td></tr>
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

        <input placeholder="SKU (optional)" value={sku} onChange={(e) => setSku(e.target.value)} maxLength={50} />
        <input placeholder="Barcode (optional)" inputMode="numeric" value={barcode} onChange={(e) => setBarcode(e.target.value)} maxLength={64} />

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
    sku: "",
    barcode: "",
  };
}

function AttributeEditor({ rows, onChange, label, examples }) {
  function updateRow(index, field, value) {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  }

  return (
    <fieldset className="attribute-editor">
      <legend>{label} <small>Optional · {examples}</small></legend>
      {rows.map((row, index) => (
        <div className="attribute-row" key={index}>
          <label className="product-field">
            <span>Attribute name</span>
            <input value={row.key} onChange={(event) => updateRow(index, "key", event.target.value)} maxLength={50} placeholder="e.g. ISBN" />
          </label>
          <label className="product-field">
            <span>Value</span>
            <input value={row.value} onChange={(event) => updateRow(index, "value", event.target.value)} maxLength={200} placeholder="e.g. 978-..." />
          </label>
          <button type="button" className="remove-attribute" aria-label={`Remove attribute ${index + 1}`} onClick={() => onChange(rows.length > 1 ? rows.filter((_, rowIndex) => rowIndex !== index) : [EMPTY_ATTRIBUTE()])}>Remove</button>
        </div>
      ))}
      {rows.length < 20 && <button type="button" className="add-attribute" onClick={() => onChange([...rows, EMPTY_ATTRIBUTE()])}>+ Add attribute</button>}
    </fieldset>
  );
}

export default Products;
