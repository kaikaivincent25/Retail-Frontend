import { Fragment, useCallback, useEffect, useState } from "react";
import {
  listProducts, createProduct, updateProduct, deactivateProduct, reactivateProduct,
  permanentlyDeleteProduct,
  listVariants, createVariant, updateVariant, deactivateVariant, bulkCreateProducts,
  getProductImportAiSuggestions, uploadProductImage,
} from "../../services/catalogApi";
import api from "../../services/api";
import { getReceiptProfile } from "../../services/profileApi";
import { toCents, fromCents } from "../../utils/money";
import ProductImagePicker from "../../components/ProductImagePicker";
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

const PRODUCT_EXAMPLES = {
  household_retail: "e.g. Dishwashing liquid",
  general_retail: "e.g. Maize flour",
  bookshop: "e.g. Oxford English Dictionary",
  electronics: "e.g. Bluetooth speaker",
  clothing: "e.g. Cotton T-shirt",
  cosmetics: "e.g. Moisturising lotion",
};

const CSV_HEADERS = [
  "product_name", "category", "brand", "description", "variant_name", "unit",
  "sale_mode", "unit_quantity", "selling_price", "cost_price", "sku", "barcode", "is_public",
];

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted value.");
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parseBoolean(value) {
  return ["true", "yes", "1", "public"].includes(String(value).toLowerCase());
}

function parseProductCsv(text) {
  const rows = parseCsvText(text);
  if (rows.length < 2) throw new Error("Add at least one product row to the CSV.");
  const headers = rows[0].map((header) => header.toLowerCase().replace(/\s+/g, "_").trim());
  const missingHeaders = ["product_name", "variant_name", "unit", "selling_price"]
    .filter((header) => !headers.includes(header));
  if (missingHeaders.length) throw new Error(`Missing required columns: ${missingHeaders.join(", ")}`);

  const indexOf = (header) => headers.indexOf(header);
  const get = (row, header) => indexOf(header) < 0 ? "" : row[indexOf(header)] || "";
  const errors = [];
  const grouped = new Map();
  rows.slice(1).forEach((row, rowIndex) => {
    const line = rowIndex + 2;
    const productName = get(row, "product_name");
    const variantName = get(row, "variant_name");
    const unit = get(row, "unit").toLowerCase() || "piece";
    const saleMode = get(row, "sale_mode").toLowerCase() || "fixed";
    const sellingPrice = Number(get(row, "selling_price"));
    const unitQuantity = saleMode === "bulk" ? 1 : Number(get(row, "unit_quantity") || 1);
    const costPrice = Number(get(row, "cost_price") || 0);
    const rowErrors = [];
    if (!productName) rowErrors.push("product_name is required");
    if (!variantName) rowErrors.push("variant_name is required");
    if (!UNITS.includes(unit)) rowErrors.push(`unit must be one of: ${UNITS.join(", ")}`);
    if (!["fixed", "bulk"].includes(saleMode)) rowErrors.push("sale_mode must be fixed or bulk");
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) rowErrors.push("selling_price must be a number of 0 or more");
    if (!Number.isInteger(unitQuantity) || unitQuantity < 1) rowErrors.push("unit_quantity must be a whole number of 1 or more");
    if (!Number.isFinite(costPrice) || costPrice < 0) rowErrors.push("cost_price must be a number of 0 or more");
    if (rowErrors.length) {
      errors.push({ line, message: rowErrors.join("; ") });
      return;
    }

    const key = productName.toLocaleLowerCase();
    if (!grouped.has(key)) {
      grouped.set(key, {
        name: productName,
        category: get(row, "category") || null,
        brand: get(row, "brand") || null,
        description: get(row, "description") || null,
        attributes: {},
        image_url: null,
        is_public: parseBoolean(get(row, "is_public")),
        variants: [],
      });
    }
    grouped.get(key).variants.push({
      name: variantName,
      unit,
      sale_mode: saleMode,
      unit_quantity: unitQuantity,
      selling_price: sellingPrice,
      cost_price: costPrice,
      sku: get(row, "sku") || null,
      barcode: get(row, "barcode") || null,
    });
  });

  const products = [...grouped.values()];
  const duplicateNames = products.filter((product) => {
    const names = product.variants.map((variant) => variant.name.toLocaleLowerCase());
    return names.length !== new Set(names).size;
  });
  duplicateNames.forEach((product) => errors.push({ line: "-", message: `Duplicate variant name in ${product.name}` }));
  return { products, errors, rowCount: rows.length - 1 };
}

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
function getErrorMessage(err, fallback) {
  const detail = err.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => typeof item === "string" ? item : item?.msg)
      .filter(Boolean);
    if (messages.length) return messages.join("; ");
  }
  if (typeof err.message === "string" && err.message.trim()) return err.message;
  return fallback;
}

function normalizeProduct(product) {
  if (!product || typeof product !== "object" || product.id == null) return null;

  // Product records created by older deployments may omit optional fields.
  // Normalize them before rendering so one legacy record cannot blank the page.
  return {
    ...product,
    name: typeof product.name === "string" && product.name.trim() ? product.name : "Unnamed product",
    category: product.category ?? null,
    brand: product.brand ?? null,
    description: product.description ?? null,
    attributes: product.attributes && typeof product.attributes === "object" ? product.attributes : {},
    image_url: product.image_url ?? null,
    is_active: product.is_active !== false,
    is_public: product.is_public === true,
  };
}

function Products() {
  const [products, setProducts] = useState([]);
  const [productFilter, setProductFilter] = useState("active");
  const [productSearch, setProductSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [variantsByProduct, setVariantsByProduct] = useState({});
  const [editingImageId, setEditingImageId] = useState(null);
  const [imageFileDraft, setImageFileDraft] = useState(null);
  const [uploadingImageId, setUploadingImageId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [priceEditor, setPriceEditor] = useState(null);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const [newProductName, setNewProductName] = useState("");
  const [businessType, setBusinessType] = useState("general_retail");
  const [productTemplate, setProductTemplate] = useState("general_retail");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductBrand, setNewProductBrand] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [newProductAttributes, setNewProductAttributes] = useState([EMPTY_ATTRIBUTE()]);
  const [newProductImageFile, setNewProductImageFile] = useState(null);
  const [newProductIsPublic, setNewProductIsPublic] = useState(false);
  const [newProductVariants, setNewProductVariants] = useState([createEmptyVariant()]);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [error, setError] = useState("");
  const [importPreview, setImportPreview] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const refreshProducts = useCallback(async (searchTerm = productSearch) => {
    try {
      const params = new URLSearchParams({ include_inactive: "true" });
      if (searchTerm.trim()) params.set("q", searchTerm.trim());
      const result = await listProducts(`?${params.toString()}`);
      // Keep the page renderable even if an older API/proxy wraps the list.
      const catalog = Array.isArray(result) ? result : result?.products;
      setProducts(Array.isArray(catalog) ? catalog.map(normalizeProduct).filter(Boolean) : []);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load products."));
    }
  }, [productSearch]);

  useEffect(() => {
    const timer = setTimeout(() => refreshProducts(productSearch), productSearch ? 250 : 0);
    return () => clearTimeout(timer);
  }, [productSearch, refreshProducts]);

  useEffect(() => {
    getReceiptProfile().then((profile) => {
      const type = profile.business_type || "general_retail";
      setBusinessType(type);
      setProductTemplate(type);
    }).catch(() => {});
  }, []);

  function downloadCsvTemplate() {
    const example = [
      CSV_HEADERS.join(","),
      ["Maize Flour", "Food", "Example Brand", "2kg packet", "2kg packet", "packet", "fixed", "1", "250", "190", "MF-001", "6161234567890", "false"].join(","),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([example], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "products-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleCsvSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parseProductCsv(String(reader.result || ""));
        setImportPreview({ ...result, fileName: file.name });
      } catch (err) {
        setImportPreview(null);
        setError(err.message || "Could not read the CSV file.");
      }
    };
    reader.onerror = () => setError("Could not read the CSV file.");
    reader.readAsText(file);
  }

  async function approveCsvImport() {
    if (!importPreview?.products.length || importPreview.errors.length) return;
    setIsImporting(true);
    setError("");
    try {
      await bulkCreateProducts(importPreview.products);
      setImportPreview(null);
      await refreshProducts();
    } catch (err) {
      setError(getErrorMessage(err, "Could not import the approved products."));
    } finally {
      setIsImporting(false);
    }
  }

  async function requestAiSuggestions() {
    if (!importPreview?.products.length) return;
    setIsAiLoading(true);
    setError("");
    try {
      const products = importPreview.products.map((product) => ({
        name: product.name,
        category: product.category,
        brand: product.brand,
        description: product.description,
        variant_names: product.variants.map((variant) => variant.name),
      }));
      const result = await getProductImportAiSuggestions(products);
      setImportPreview((current) => ({ ...current, aiSuggestions: result.suggestions || [], aiApplied: false }));
    } catch (err) {
      setError(getErrorMessage(err, "AI suggestions are unavailable. Check the backend AI configuration."));
    } finally {
      setIsAiLoading(false);
    }
  }

  function applyAiSuggestions() {
    if (!importPreview?.aiSuggestions?.length) return;
    const suggestions = new Map(importPreview.aiSuggestions.map((suggestion) => [suggestion.product_name.toLocaleLowerCase(), suggestion]));
    const products = importPreview.products.map((product) => {
      const suggestion = suggestions.get(product.name.toLocaleLowerCase());
      if (!suggestion) return product;
      return {
        ...product,
        name: suggestion.suggested_name || product.name,
        category: suggestion.suggested_category || product.category,
        description: suggestion.suggested_description || product.description,
      };
    });
    setImportPreview((current) => ({ ...current, products, aiApplied: true }));
  }

  async function handleCreateProduct(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsCreatingProduct(true);
    let created;
    const imageFile = newProductImageFile;
    try {
      created = await createProduct({
        name: newProductName,
        category: newProductCategory || null,
        brand: newProductBrand.trim() || null,
        description: newProductDescription.trim() || null,
        attributes: attributesToObject(newProductAttributes),
        image_url: null,
        is_public: newProductIsPublic,
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
    } catch (err) {
      setError(getErrorMessage(err, "Could not create product and variants."));
      setIsCreatingProduct(false);
      return;
    }

    try {
      setNewProductName("");
      setNewProductCategory("");
      setNewProductBrand("");
      setNewProductDescription("");
      setNewProductAttributes([EMPTY_ATTRIBUTE()]);
      setNewProductImageFile(null);
      setNewProductIsPublic(false);
      setNewProductVariants([createEmptyVariant()]);
      setIsAddFormOpen(false);
      setExpandedId(null);
      await refreshProducts();
      if (imageFile) {
        const image_url = await uploadProductImage(imageFile);
        const updated = await updateProduct(created.id, { image_url });
        setProducts((current) => current.map((product) => product.id === updated.id ? updated : product));
      }
      setSuccess(`“${created.name}” was added.`);
    } catch (err) {
      setError(
        `“${created.name}” was added, but its photo could not be uploaded. You can try again using Add photo on the product. ${getErrorMessage(err, "Upload failed.")}`,
      );
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
    const file = imageFileDraft?.productId === productId ? imageFileDraft.file : null;
    if (!file) {
      setError("Choose a photo first.");
      return;
    }
    setError("");
    setSuccess("");
    setUploadingImageId(productId);
    try {
      const image_url = await uploadProductImage(file);
      const updated = await updateProduct(productId, { image_url });
      setProducts((current) => current.map((product) => product.id === productId ? updated : product));
      setImageFileDraft(null);
      setEditingImageId(null);
      setSuccess("Product photo updated.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not save the product photo."));
    } finally {
      setUploadingImageId(null);
    }
  }

  async function handleRemoveProductImage(productId) {
    setError("");
    setSuccess("");
    try {
      const updated = await updateProduct(productId, {
        image_url: null,
        public_image_url: null,
      });
      setProducts((current) => current.map((product) => product.id === productId ? updated : product));
      setImageFileDraft(null);
      setEditingImageId(null);
      setSuccess("Product photo removed.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not remove the product photo."));
    }
  }

  async function openPriceEditor(product) {
    setError("");
    setSuccess("");
    try {
      const variants = await listVariants(product.id, true);
      setVariantsByProduct((current) => ({ ...current, [product.id]: variants }));
      const activeVariants = variants.filter((variant) => variant.is_active);
      if (!activeVariants.length) {
        setError("This product has no active versions to change the price for.");
        return;
      }
      const variant = activeVariants.length === 1 ? activeVariants[0] : null;
      setPriceEditor({
        product,
        variants: activeVariants,
        variantId: variant ? String(variant.id) : "",
        price: variant ? String(variant.selling_price) : "",
      });
    } catch (err) {
      setError(getErrorMessage(err, "Could not load product prices."));
    }
  }

  function choosePriceVariant(variantId) {
    const variant = priceEditor?.variants.find((item) => String(item.id) === variantId);
    setPriceEditor((current) => current && ({
      ...current,
      variantId,
      price: variant ? String(variant.selling_price) : "",
    }));
  }

  async function handleSavePrice(event) {
    event.preventDefault();
    const variant = priceEditor?.variants.find((item) => String(item.id) === priceEditor.variantId);
    const priceValue = Number(priceEditor?.price);
    if (!variant || !Number.isFinite(priceValue) || priceValue < 0) {
      setError("Enter a valid price of zero or more.");
      return;
    }

    setIsSavingPrice(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateVariant(variant.id, {
        selling_price: fromCents(toCents(priceEditor.price)),
      });
      setVariantsByProduct((current) => ({
        ...current,
        [priceEditor.product.id]: (current[priceEditor.product.id] || []).map((item) =>
          item.id === updated.id ? updated : item
        ),
      }));
      setPriceEditor(null);
      setSuccess(`${variant.name} price updated.`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not update the selling price."));
    } finally {
      setIsSavingPrice(false);
    }
  }

  function startEditingProduct(product) {
    setEditingProduct({
      id: product.id,
      name: product.name,
      category: product.category || "",
      brand: product.brand || "",
      description: product.description || "",
      is_public: product.is_public || false,
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
        is_public: draft.is_public,
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

  const visibleProducts = products.filter((product) => product && typeof product === "object").filter((product) => {
    const matchesFilter = productFilter === "all"
      || (productFilter === "active" ? product.is_active : !product.is_active);
    return matchesFilter;
  });
  const activeTemplate = BUSINESS_TEMPLATES[businessType] || BUSINESS_TEMPLATES.general_retail;
  const categoryOptions = activeTemplate.categories;

  return (
    <div className="products-page">
      <header className="products-page-heading">
        <div>
          <span className="products-eyebrow">INVENTORY</span>
          <h1>Products</h1>
          <p>Manage your catalog, pricing, and stock in one place.</p>
        </div>
        <div className="products-heading-actions">
          <div className="products-total">
            <span>{products.length}</span>
            <small>{products.length === 1 ? "product in catalog" : "products in catalog"}</small>
          </div>
          <button
            className="add-product-cta"
            type="button"
            onClick={() => setIsAddFormOpen((open) => !open)}
            aria-expanded={isAddFormOpen}
            aria-controls="add-product-form"
          >
            <span aria-hidden="true">+</span>
            {isAddFormOpen ? "Close form" : "Add product"}
          </button>
        </div>
      </header>

      {isAddFormOpen && <form id="add-product-form" className="new-product-form" onSubmit={handleCreateProduct}>
        <div className="form-card-heading">
          <div className="form-card-icon" aria-hidden="true">+</div>
          <div>
            <h2>Add a product</h2>
            <p>Add the product once, then describe the exact versions your customers can buy.</p>
          </div>
        </div>
        <div className="new-product-fields">
          <label className="product-field">
            <span>Shop type</span>
            <select value={productTemplate} disabled>
              <option value={businessType}>{activeTemplate.label}</option>
            </select>
            <small>Fields below are guided for {BUSINESS_TEMPLATES[businessType]?.label || "your shop"}.</small>
          </label>
          <label className="product-field">
            <span>What are you selling? <b>*</b></span>
            <input
              placeholder={PRODUCT_EXAMPLES[businessType] || "e.g. Product name"}
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              required
            />
          </label>
          <div className="product-field">
            <span>Product photo <small>Optional · shared by variants</small></span>
            <ProductImagePicker
              imageUrl={null}
              file={newProductImageFile}
              onFileChange={setNewProductImageFile}
              onInvalid={setError}
              disabled={isCreatingProduct}
            />
          </div>
          <label className="product-field">
            <span>Category <small>Optional</small></span>
            <input
              placeholder={`e.g. ${categoryOptions[0] || "General merchandise"}`}
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
          <label className="product-public-toggle">
            <input type="checkbox" checked={newProductIsPublic} onChange={(event) => setNewProductIsPublic(event.target.checked)} />
            <span><b>List publicly</b><small>Show this product on your shop link. Cost and internal stock details stay private.</small></span>
          </label>
        </div>
        <AttributeEditor rows={newProductAttributes} onChange={setNewProductAttributes} label="Details that help identify it" examples={(BUSINESS_TEMPLATES[productTemplate]?.attributes || []).join(", ")} />
        <datalist id="product-category-options">
          {[...new Set(categoryOptions)]
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
                <span>Customer-facing version <b>*</b></span>
                <input
                  aria-label={`Variant ${index + 1} name`}
                  placeholder={variant.saleMode === "bulk" ? "e.g. Loose / per kg" : "e.g. Blue, Medium / 128GB"}
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
                <span>How is it sold?</span>
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
                <span>Customer price <b>*</b></span>
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
                <span>Purchase cost <small>Used for FIFO profit tracking</small></span>
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
          <button type="button" className="secondary-action" onClick={() => setIsAddFormOpen(false)}>Cancel</button>
          <button type="submit" disabled={isCreatingProduct}>
            {isCreatingProduct ? "Saving..." : "Save product and stock"}
          </button>
        </div>
      </form>}
      <section className="csv-import-panel" aria-labelledby="csv-import-heading">
        <div>
          <span className="products-eyebrow">BULK SETUP</span>
          <h2 id="csv-import-heading">Import products from CSV</h2>
          <p>Upload many products at once. Review the preview before anything is saved.</p>
        </div>
        <div className="csv-import-actions">
          <button type="button" className="secondary-action" onClick={downloadCsvTemplate}>Download template</button>
          <label className="csv-upload-button">
            Choose CSV file
            <input type="file" accept=".csv,text/csv" onChange={handleCsvSelected} />
          </label>
        </div>
        {importPreview && (
          <div className="csv-preview">
            <div className="csv-preview-heading">
              <div>
                <strong>{importPreview.fileName}</strong>
                <span>{importPreview.rowCount} rows · {importPreview.products.length} products ready</span>
              </div>
              <button type="button" className="secondary-action" onClick={() => setImportPreview(null)}>Clear</button>
            </div>
            {importPreview.errors.length > 0 ? (
              <div className="csv-import-errors" role="alert">
                <strong>Fix these rows before importing:</strong>
                {importPreview.errors.map((item, index) => <div key={`${item.line}-${index}`}>Row {item.line}: {item.message}</div>)}
              </div>
            ) : (
              <>
                <div className="csv-ai-tools">
                  <div>
                    <strong>AI import assistant</strong>
                    <span>Suggests cleaner names, categories, descriptions, and possible duplicates.</span>
                  </div>
                  <div className="csv-ai-actions">
                    <button type="button" className="secondary-action" disabled={isAiLoading} onClick={requestAiSuggestions}>
                      {isAiLoading ? "Analyzing..." : importPreview.aiSuggestions ? "Run AI again" : "Get AI suggestions"}
                    </button>
                    {importPreview.aiSuggestions?.length > 0 && !importPreview.aiApplied && (
                      <button type="button" className="secondary-action" onClick={applyAiSuggestions}>Apply suggestions to preview</button>
                    )}
                  </div>
                </div>
                {importPreview.aiSuggestions?.length > 0 && (
                  <div className="csv-ai-results">
                    {importPreview.aiSuggestions.map((suggestion, index) => (
                      <div className="csv-ai-result" key={`${suggestion.product_name}-${index}`}>
                        <strong>{suggestion.product_name}</strong>
                        <span>{suggestion.reason || "No change needed."}</span>
                        {suggestion.duplicate_with && <em>Possible duplicate of {suggestion.duplicate_with}</em>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="csv-preview-table-wrap">
                  <table className="csv-preview-table">
                    <thead><tr><th>Product</th><th>Variants</th><th>Category</th><th>Public</th></tr></thead>
                    <tbody>{importPreview.products.slice(0, 10).map((product) => (
                      <tr key={product.name}>
                        <td>{product.name}</td>
                        <td>{product.variants.map((variant) => variant.name).join(", ")}</td>
                        <td>{product.category || "—"}</td>
                        <td>{product.is_public ? "Yes" : "No"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                {importPreview.products.length > 10 && <small>Showing the first 10 products.</small>}
                <button type="button" className="csv-approve-button" disabled={isImporting} onClick={approveCsvImport}>
                  {isImporting ? "Importing..." : `Approve and import ${importPreview.products.length} products`}
                </button>
              </>
            )}
          </div>
        )}
      </section>
      {error && <div className="form-error" role="alert">{error}</div>}
      {success && <div className="product-success" role="status">{success}</div>}

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
                      className="restore-product quick-price-action"
                      onClick={() => openPriceEditor(product)}
                      disabled={!product.is_active}
                    >
                      Change price
                    </button>
                <button
                  type="button"
                  className="restore-product"
                  onClick={() => {
                    setEditingImageId(editingImageId === product.id ? null : product.id);
                        setImageFileDraft(null);
                  }}
                >
                      {product.image_url ? "Change photo" : "Add photo"}
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
              <div className="product-image-editor">
                <div>
                  <strong>Product photo</strong>
                  <p>This photo is shared by all versions of this product.</p>
                </div>
                <ProductImagePicker
                  imageUrl={product.image_url}
                  file={imageFileDraft?.productId === product.id ? imageFileDraft.file : null}
                  onFileChange={(file) => setImageFileDraft(file ? { productId: product.id, file } : null)}
                  onRemove={() => handleRemoveProductImage(product.id)}
                  onInvalid={setError}
                  disabled={uploadingImageId === product.id}
                />
                <div className="product-image-editor-actions">
                  <button
                    type="button"
                    className="restore-product"
                    onClick={() => handleSaveProductImage(product.id)}
                    disabled={uploadingImageId === product.id || !imageFileDraft?.file}
                  >
                    {uploadingImageId === product.id ? "Uploading photo..." : "Save photo"}
                  </button>
                  <button
                    type="button"
                    className="restore-product"
                    onClick={() => { setEditingImageId(null); setImageFileDraft(null); }}
                    disabled={uploadingImageId === product.id}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {editingProduct?.id === product.id && (
              <>
                <button className="product-editor-backdrop" type="button" aria-label="Close edit product dialog" onClick={() => setEditingProduct(null)} />
                <form className="product-details-editor" role="dialog" aria-modal="true" aria-labelledby={`edit-product-title-${product.id}`} onSubmit={handleSaveProductDetails}>
                <div className="editor-dialog-heading">
                  <div>
                    <span className="products-eyebrow">PRODUCT DETAILS</span>
                    <h2 id={`edit-product-title-${product.id}`}>Edit {product.name}</h2>
                    <p>Update the information customers and your team use to identify this product.</p>
                  </div>
                  <button type="button" className="editor-close" onClick={() => setEditingProduct(null)} aria-label="Close edit product dialog">×</button>
                </div>
                <div className="product-details-editor-grid">
                  <label className="product-field"><span>Product name</span><input value={editingProduct.name} onChange={(event) => setEditingProduct({ ...editingProduct, name: event.target.value })} required maxLength={150} /></label>
                  <label className="product-field"><span>Category</span><input list="product-category-options" value={editingProduct.category} onChange={(event) => setEditingProduct({ ...editingProduct, category: event.target.value })} maxLength={100} /></label>
                  <label className="product-field"><span>Brand</span><input value={editingProduct.brand} onChange={(event) => setEditingProduct({ ...editingProduct, brand: event.target.value })} maxLength={100} /></label>
                  <label className="product-field product-description-field"><span>Description</span><textarea rows={2} value={editingProduct.description} onChange={(event) => setEditingProduct({ ...editingProduct, description: event.target.value })} maxLength={2000} /></label>
                  <label className="product-public-toggle"><input type="checkbox" checked={editingProduct.is_public} onChange={(event) => setEditingProduct({ ...editingProduct, is_public: event.target.checked })} /><span><b>List publicly</b><small>Customers can see active variants and selling prices.</small></span></label>
                </div>
                <AttributeEditor rows={editingProduct.attributes} onChange={(attributes) => setEditingProduct({ ...editingProduct, attributes })} label="Product attributes" examples="ISBN, author, model, colour, storage" />
                <div className="product-details-editor-actions">
                  <button type="button" className="restore-product" onClick={() => setEditingProduct(null)}>Cancel</button>
                  <button type="submit">Save product details</button>
                </div>
                </form>
              </>
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

      {priceEditor && (
        <div className="price-editor-backdrop">
          <button
            type="button"
            className="price-editor-dismiss"
            aria-label="Close price editor"
            onClick={() => setPriceEditor(null)}
          />
          <form
            className="price-editor-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="price-editor-title"
            onSubmit={handleSavePrice}
          >
            <div className="price-editor-heading">
              <div>
                <span className="products-eyebrow">SELLING PRICE</span>
                <h2 id="price-editor-title">Change a price</h2>
                <p>{priceEditor.product.name}</p>
              </div>
              <button
                type="button"
                className="editor-close"
                onClick={() => setPriceEditor(null)}
                aria-label="Close price editor"
              >
                ×
              </button>
            </div>

            {priceEditor.variants.length > 1 ? (
              <label className="product-field">
                <span>Choose size or version</span>
                <select
                  value={priceEditor.variantId}
                  onChange={(event) => choosePriceVariant(event.target.value)}
                  required
                >
                  <option value="">Choose one</option>
                  {priceEditor.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name} — KSh {variant.selling_price}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="price-editor-variant">{priceEditor.variants[0].name}</p>
            )}

            {priceEditor.variantId && (
              <>
                {priceEditor.product.is_public && (
                  <p className="price-editor-public-note">
                    This product is listed publicly. Customers will see the new price after you save.
                  </p>
                )}
                <div className="price-editor-current">
                  Current price: <strong>KSh {priceEditor.variants.find((variant) => String(variant.id) === priceEditor.variantId)?.selling_price}</strong>
                </div>
                <label className="product-field price-editor-input">
                  <span>New selling price</span>
                  <div className="money-input">
                    <span>KSh</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={priceEditor.price}
                      onChange={(event) => setPriceEditor((current) => current && ({ ...current, price: event.target.value }))}
                      required
                      autoFocus
                    />
                  </div>
                </label>
                {error && <div className="form-error" role="alert">{error}</div>}
                <div className="price-editor-preview">
                  New price: <strong>KSh {Number(priceEditor.price || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </>
            )}

            <div className="price-editor-actions">
              <button
                type="button"
                className="restore-product"
                onClick={() => setPriceEditor(null)}
                disabled={isSavingPrice}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="price-editor-save"
                disabled={isSavingPrice || !priceEditor.variantId}
              >
                {isSavingPrice ? "Saving price..." : "Save new price"}
              </button>
            </div>
          </form>
        </div>
      )}
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
