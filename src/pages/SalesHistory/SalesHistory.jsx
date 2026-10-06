import { useEffect, useState } from "react";
import { listUsers } from "../../services/usersApi";
import { listSales, getSale } from "../../services/salesHistoryApi";
import { useAuth } from "../../context/AuthContext";
import "./SalesHistory.css";

function SalesHistory() {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [cashierId, setCashierId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    if (user?.role === "cashier") return;
    listUsers().then(setStaff).catch(() => setStaff([])); // manager may not have /users access; fail quietly
  }, [user?.role]);

  useEffect(() => {
    refresh();
  }, [cashierId, startDate, endDate]);

  function refresh() {
    listSales({
      cashierId: cashierId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }).then(setSales);
  }

  async function openDetail(saleId) {
    const full = await getSale(saleId);
    setSelectedSale(full);
  }

  return (
    <div className="sales-history-page">
      <h1>Sales History</h1>

      <div className="history-filters">
        {user?.role !== "cashier" && (
          <select value={cashierId} onChange={(e) => setCashierId(e.target.value)}>
            <option value="">All cashiers</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        )}

        <label>
          From
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>

        {(cashierId || startDate || endDate) && (
          <button className="clear-filters" onClick={() => { setCashierId(""); setStartDate(""); setEndDate(""); }}>
            Clear filters
          </button>
        )}
      </div>

      <a href="/reports/sessions" className="sessions-link">View cash session history</a>

      <table className="sales-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td>{new Date(sale.created_at || Date.now()).toLocaleString()}</td>
              <td>KSh {sale.total}</td>
              <td>{sale.payment_method}</td>
              <td><span className={`status-badge ${sale.status}`}>{sale.status}</span></td>
              <td><button onClick={() => openDetail(sale.id)}>View</button></td>
            </tr>
          ))}
          {sales.length === 0 && (
            <tr><td colSpan={5} className="empty-hint">No sales match these filters.</td></tr>
          )}
        </tbody>
      </table>

      {selectedSale && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Sale #{selectedSale.id}</h3>
            <table className="sale-items-table">
              <thead>
                <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr>
              </thead>
              <tbody>
                {selectedSale.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.variant_name}</td>
                    <td>{item.quantity}</td>
                    <td>KSh {item.unit_price}</td>
                    <td>KSh {item.line_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="sale-detail-totals">
              <div><span>Subtotal</span><span>KSh {selectedSale.subtotal}</span></div>
              <div><span>Total</span><span>KSh {selectedSale.total}</span></div>
              <div><span>Received</span><span>KSh {selectedSale.amount_received}</span></div>
              <div><span>Change</span><span>KSh {selectedSale.change}</span></div>
            </div>
            <button onClick={() => setSelectedSale(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesHistory;