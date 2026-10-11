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

  return (
    <section className="receipt-print-root" aria-hidden="true">
      <header className="receipt-header">
        <p className="receipt-brand">{shopName || "Retail Shop"}</p>
        {shopLocation && <p className="receipt-location">{shopLocation}</p>}
        <h1>Sales receipt</h1>
        <p>Thank you for shopping with us</p>
      </header>

      <dl className="receipt-meta">
        <div><dt>Receipt</dt><dd>#{sale.id}</dd></div>
        <div>
          <dt>Date</dt>
          <dd>{new Date(sale.created_at || Date.now()).toLocaleString()}</dd>
        </div>
        {(cashierName || sale.cashier_id) && (
          <div><dt>Cashier</dt><dd>{cashierName || `#${sale.cashier_id}`}</dd></div>
        )}
        <div><dt>Payment</dt><dd>{paymentMethod}</dd></div>
      </dl>

      <table className="receipt-items">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {(sale.items || []).map((item) => (
            <tr key={item.id || item.variant_id}>
              <td>{item.variant_name}</td>
              <td>{item.quantity}</td>
              <td>{formatCurrency(item.unit_price)}</td>
              <td>{formatCurrency(item.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
        <p>Thank you. Please come again.</p>
        <small>Sale #{sale.id}</small>
      </footer>
    </section>
  );
}

export default Receipt;
