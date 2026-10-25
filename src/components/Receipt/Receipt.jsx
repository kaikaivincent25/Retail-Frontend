import { createPortal } from "react-dom";
import { useEffect } from "react";
import { formatCurrency } from "../../utils/money";
import "./Receipt.css";

const PAYMENT_METHOD_LABELS = {
  cash: "Cash",
  mpesa: "M-Pesa STK Push",
  pochi: "Pochi la Biashara",
  till: "Buy Goods Till",
  paybill: "PayBill",
};

function Receipt({ sale, shopName, shopLocation, cashierName }) {
  useEffect(() => {
    document.body.classList.add("has-receipt-modal");
    return () => {
      document.body.classList.remove("has-receipt-modal");
    };
  }, []);

  if (!sale) return null;

  const paymentMethod =
    sale.paymentLabel || PAYMENT_METHOD_LABELS[sale.payment_method] || sale.payment_method;
  const createdAt = sale.created_at ? new Date(sale.created_at) : null;
  const dateLabel = createdAt && !Number.isNaN(createdAt.getTime())
    ? new Intl.DateTimeFormat("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(createdAt)
    : "Date unavailable";
  const servedBy = cashierName || sale.cashier_name;

  return createPortal(
    <section className="receipt-print-root" aria-hidden="true">
      <header className="receipt-header">
        <span className="receipt-brand-mark" aria-hidden="true">
          {(shopName || "D").trim().slice(0, 1).toUpperCase()}
        </span>
        <p className="receipt-brand">{shopName || "Retail Shop"}</p>
        {shopLocation && <p className="receipt-location">{shopLocation}</p>}
        <p className="receipt-tagline">A little shop, a lot of care</p>
      </header>

      <dl className="receipt-meta">
        <div><dt>Receipt</dt><dd className="receipt-number">#{sale.id}</dd></div>
        <div><dt>Date</dt><dd>{dateLabel}</dd></div>
        {(servedBy || sale.cashier_id) && (
          <div><dt>Served by</dt><dd>{servedBy || `Staff #${sale.cashier_id}`}</dd></div>
        )}
        <div><dt>Payment</dt><dd>{paymentMethod}</dd></div>
        {sale.payment_destination_number && (
          <div><dt>Paid to</dt><dd>{sale.payment_destination_number}</dd></div>
        )}
        {sale.payment_account_number && (
          <div><dt>Account</dt><dd>{sale.payment_account_number}</dd></div>
        )}
      </dl>

      <div className="receipt-items">
        <div className="receipt-items-heading"><span>Item</span><span>Amount</span></div>
        {(sale.items || []).map((item) => (
          <div className="receipt-item" key={item.id || item.variant_id}>
            <p className="receipt-item-name">{item.variant_name}</p>
            <div className="receipt-item-detail">
              <span>{item.quantity} × {formatCurrency(item.unit_price)}</span>
              <strong>{formatCurrency(item.line_total)}</strong>
            </div>
          </div>
        ))}
      </div>

      <dl className="receipt-totals">
        {sale.subtotal != null && Number(sale.subtotal) !== Number(sale.total) && (
          <div><dt>Subtotal</dt><dd>{formatCurrency(sale.subtotal)}</dd></div>
        )}
        <div className="receipt-total"><dt>Total</dt><dd>{formatCurrency(sale.total)}</dd></div>
        {sale.payment_method === "cash" && <>
          <div><dt>Cash received</dt><dd>{formatCurrency(sale.amount_received)}</dd></div>
          <div><dt>Change</dt><dd>{formatCurrency(sale.change)}</dd></div>
        </>}
      </dl>

      {sale.mpesa_receipt_number && (
        <p className="receipt-reference">
          M-Pesa reference <strong>{sale.mpesa_receipt_number}</strong>
        </p>
      )}

      <footer className="receipt-footer">
        <p>Thank you for choosing us</p>
        <small>We look forward to seeing you again</small>
      </footer>
    </section>,
    document.body
  );
}

// This utility is intentionally colocated with the receipt component styles.
// eslint-disable-next-line react-refresh/only-export-components
export function printReceipt() {
  const receipt = document.querySelector(".receipt-print-root");
  if (!receipt) {
    window.print();
    return;
  }

  document.body.classList.add("printing-receipt");
  const heightMm = Math.ceil((receipt.scrollHeight * 25.4) / 96 + 1);
  const pageStyle = document.createElement("style");
  pageStyle.dataset.receiptPage = "true";
  pageStyle.textContent = `@page { size: 80mm ${heightMm}mm; margin: 0; }`;
  document.head.appendChild(pageStyle);

  const cleanup = () => {
    document.body.classList.remove("printing-receipt");
    pageStyle.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);

  window.print();
  setTimeout(cleanup, 1000);
}

export default Receipt;
