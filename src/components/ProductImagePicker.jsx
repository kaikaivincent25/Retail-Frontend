import { useEffect, useId, useState } from "react";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function ProductImagePicker({
  imageUrl,
  file,
  source,
  onSourceChange,
  urlValue,
  onUrlChange,
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

  const previewImage = source === "upload" && preview.file === file && preview.url
    ? preview.url
    : source === "url" && urlValue?.trim()
      ? urlValue.trim()
      : imageUrl;

  return (
    <div className="product-image-picker">
      <div className="product-image-picker-preview">
        {previewImage ? (
          <img src={previewImage} alt="Product preview" />
        ) : (
          <span aria-hidden="true">+</span>
        )}
      </div>
      <div className="product-image-picker-controls">
        <div className="product-image-source-switch" aria-label="Choose photo source">
          <button
            type="button"
            className={source === "upload" ? "selected" : ""}
            aria-pressed={source === "upload"}
            onClick={() => onSourceChange("upload")}
            disabled={disabled}
          >
            Upload photo
          </button>
          <button
            type="button"
            className={source === "url" ? "selected" : ""}
            aria-pressed={source === "url"}
            onClick={() => onSourceChange("url")}
            disabled={disabled}
          >
            Use image URL
          </button>
        </div>
        {source === "upload" ? (
          <>
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
          </>
        ) : (
          <label className="product-image-url-input">
            <span>Paste a secure image link</span>
            <input
              type="url"
              inputMode="url"
              placeholder="https://example.com/photo.jpg"
              value={urlValue}
              onChange={(event) => onUrlChange(event.target.value)}
              maxLength={2048}
              disabled={disabled}
            />
          </label>
        )}
        {source === "upload" && file && (
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
