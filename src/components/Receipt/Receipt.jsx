import { createPortal } from "react-dom";
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
  if (!sale) return null;

  const paymentMethod =
    sale.paymentLabel || PAYMENT_METHOD_LABELS[sale.payment_method] || sale.payment_method;
  const dateLabel = new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(sale.created_at || Date.now()));
  const servedBy = cashierName || sale.cashier_name;

  return createPortal(
    <section className="receipt-print-root" aria-hidden="true">
      <header className="receipt-header">
        <p className="receipt-brand">{shopName || "Retail Shop"}</p>
        {shopLocation && <p className="receipt-location">{shopLocation}</p>}
        <h1>Receipt</h1>
        <p>Thank you for shopping with us</p>
      </header>

      <dl className="receipt-meta">
        <div><dt>Receipt no.</dt><dd>#{sale.id}</dd></div>
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
        <p className="receipt-items-heading">Items</p>
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
        <div><dt>Subtotal</dt><dd>{formatCurrency(sale.subtotal)}</dd></div>
        <div className="receipt-total"><dt>Total</dt><dd>{formatCurrency(sale.total)}</dd></div>
        <div><dt>Received</dt><dd>{formatCurrency(sale.amount_received)}</dd></div>
        <div><dt>Change</dt><dd>{formatCurrency(sale.change)}</dd></div>
      </dl>

      {sale.mpesa_receipt_number && (
        <p className="receipt-reference">
          M-Pesa confirmation: <strong>{sale.mpesa_receipt_number}</strong>
        </p>
      )}

      <footer className="receipt-footer">
        <p>Thank you for your purchase</p>
        <small>Please come again</small>
      </footer>
    </section>,
    document.body
  );
}

export default Receipt;
