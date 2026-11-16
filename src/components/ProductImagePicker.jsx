import { useEffect, useId, useState } from "react";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function ProductImagePicker({
  imageUrl,
  file,
  onFileChange,
  onRemove,
  onInvalid,
  disabled = false,
}) {
  const inputId = useId();
  const [preview, setPreview] = useState({ file: null, url: "" });

  useEffect(() => {
    const url = preview.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview.url]);

  function handleFileChange(event) {
    const selected = event.target.files?.[0] || null;
    event.target.value = "";
    if (!selected) return;

    if (!ALLOWED_IMAGE_TYPES.has(selected.type)) {
      setPreview({ file: null, url: "" });
      onFileChange(null);
      onInvalid?.("Choose a JPG, PNG, or WebP photo.");
      return;
    }
    if (selected.size > MAX_IMAGE_SIZE) {
      setPreview({ file: null, url: "" });
      onFileChange(null);
      onInvalid?.("Choose a photo smaller than 5 MB.");
      return;
    }

    onInvalid?.("");
    setPreview({ file: selected, url: URL.createObjectURL(selected) });
    onFileChange(selected);
  }

  function cancelPhotoChange() {
    setPreview({ file: null, url: "" });
    onFileChange(null);
  }

  return (
    <div className="product-image-picker">
      <div className="product-image-picker-preview">
        {(preview.file === file && preview.url) || imageUrl ? (
          <img
            src={preview.file === file && preview.url ? preview.url : imageUrl}
            alt="Product preview"
          />
        ) : (
          <span aria-hidden="true">+</span>
        )}
      </div>
      <div className="product-image-picker-controls">
        <label className="product-image-picker-button" htmlFor={inputId}>
          {file ? "Choose another photo" : imageUrl ? "Change photo" : "Choose photo"}
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={disabled}
          />
        </label>
        <small>JPG, PNG, or WebP · Up to 5 MB</small>
        {file && (
          <button
            type="button"
            className="restore-product"
            onClick={cancelPhotoChange}
            disabled={disabled}
          >
            Cancel photo change
          </button>
        )}
        {imageUrl && onRemove && !file && (
          <button
            type="button"
            className="restore-product"
            onClick={onRemove}
            disabled={disabled}
          >
            Remove photo
          </button>
        )}
      </div>
    </div>
  );
}
