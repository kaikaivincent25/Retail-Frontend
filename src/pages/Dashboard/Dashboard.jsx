
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getDashboardSummary } from "../../services/dashboardApi";
import { getShop } from "../../services/profileApi";
import { formatCurrency } from "../../utils/money";
import "./Dashboard.css";

function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopNameError, setShopNameError] = useState(false);

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch(() => setError("Could not load dashboard data."));
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;

    getShop()
      .then((shop) => setShopName(shop.name))
      .catch(() => setShopNameError(true));
  }, [user?.role]);

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-state dashboard-error-state">
          <div className="state-icon error-icon">!</div>
          <h2>Unable to load dashboard</h2>
          <p className="dashboard-error">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <span className="loading-spinner" />
          <p>Preparing your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">

      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-copy">
          <span className="dashboard-eyebrow">YOUR STORE AT A GLANCE</span>
          <div className="dashboard-title-row">
            <span className="dashboard-shop-mark" aria-hidden="true">
              {(shopName || "R").charAt(0).toUpperCase()}
            </span>
            <div>
              <h1>{shopName || "Business overview"}</h1>
              <p className="dashboard-welcome">
                Here is how your business is performing today.
              </p>
              {shopNameError && (
                <span className="dashboard-shop-error">
                  Shop name could not be loaded
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-date">
          <span className="date-icon" aria-hidden="true">◷</span>
          <span className="dashboard-date-copy">
            <span className="dashboard-date-label">TODAY</span>
            <span>
              {new Date(summary.date).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </span>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="dashboard-summary-section">
        <div className="section-heading">
          <div>
            <h2>Business Summary</h2>
            <p>Your key business figures for today</p>
          </div>
          <span className="summary-period">TODAY</span>
        </div>

        <div className="summary-cards">

          <div className="summary-card sales-card">
            <div className="card-top">
              <span className="card-label">Today's Sales</span>
              <span className="card-icon sales-icon">↗</span>
            </div>
            <span className="card-value">
              {formatCurrency(summary.total_sales)}
            </span>
            <span className="card-description">
              Gross sales recorded today
            </span>
          </div>

          <div className="summary-card expense-card">
            <div className="card-top">
              <span className="card-label">Today's Expenses</span>
              <span className="card-icon expense-icon">−</span>
            </div>
            <span className="card-value">
              {formatCurrency(summary.expense_total)}
            </span>
            <span className="card-description">
              Spending recorded for today
            </span>
            <Link to="/expenses" className="card-link">
              View expenses <span>→</span>
            </Link>
          </div>

          <div className="summary-card net-sales-card">
            <div className="card-top">
              <span className="card-label">Net Sales</span>
              <span className="card-icon net-sales-icon">−</span>
            </div>
            <span className="card-value">
              {formatCurrency(summary.net_sales)}
            </span>
            <span className="card-description">
              Sales after recorded expenses
            </span>
          </div>

          <div className="summary-card transactions-card">
            <div className="card-top">
              <span className="card-label">Transactions</span>
              <span className="card-icon transactions-icon">▤</span>
            </div>
            <span className="card-value">
              {summary.transaction_count.toLocaleString()}
            </span>
            <span className="card-description">
              Completed sales today
            </span>
          </div>

          <div className="summary-card profit-card">
            <div className="card-top">
              <span className="card-label">Estimated Profit</span>
              <span className="card-icon profit-icon">◈</span>
            </div>
            <span className="card-value profit">
              {formatCurrency(summary.estimated_profit)}
            </span>
            <span className="card-description">
              Estimated earnings today
            </span>
          </div>

          <div className={`summary-card stock-card ${summary.low_stock_count > 0 ? "alert" : ""}`}>
            <div className="card-top">
              <span className="card-label">Low Stock Items</span>
              <span className="card-icon stock-icon">▦</span>
            </div>
            <span className="card-value">
              {summary.low_stock_count.toLocaleString()}
            </span>
            <span className="card-description">
              {summary.low_stock_count > 0
                ? "Items requiring attention"
                : "Stock levels look good"}
            </span>
            {summary.low_stock_count > 0 && (
              <Link to="/inventory" className="card-link">
                Review stock <span>→</span>
              </Link>
            )}
          </div>

        </div>
      </section>

      {/* Top Products */}
      <section className="dashboard-section">
        <div className="section-heading products-heading">
          <div>
            <h2>Top Products Today</h2>
            <p>Your best-selling products by quantity</p>
          </div>
          <span className="section-badge">PRODUCT PERFORMANCE</span>
        </div>

        {summary.top_products.length === 0 ? (
          <div className="empty-hint">
            <div className="empty-icon">▤</div>
            <h3>No sales recorded yet</h3>
            <p>Your top-selling products will appear here once sales begin.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="top-products-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Variant</th>
                  <th>Quantity Sold</th>
                </tr>
              </thead>
              <tbody>
                {summary.top_products.map((p, i) => (
                  <tr key={p.variant_id}>
                    <td>
                      <span className={`product-rank ${i < 3 ? "top-rank" : ""}`}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td>
                      <span className="product-name">{p.variant_name}</span>
                    </td>
                    <td>
                      <span className="quantity-badge">
                        {p.quantity_sold}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section className="dashboard-links-section">
        <div className="section-heading">
          <div>
            <h2>Business Records</h2>
            <p>Access your detailed business records</p>
          </div>
        </div>

        <div className="dashboard-links">
          <Link to="/reports/sales" className="dashboard-link-card">
            <span className="quick-link-icon">↗</span>
            <span className="quick-link-content">
              <strong>Sales History</strong>
              <span>Review previous sales and transactions</span>
            </span>
            <span className="quick-link-arrow">→</span>
          </Link>

          <Link to="/reports/sessions" className="dashboard-link-card">
            <span className="quick-link-icon">◷</span>
            <span className="quick-link-content">
              <strong>Cash Session History</strong>
              <span>Review previous cash sessions</span>
            </span>
            <span className="quick-link-arrow">→</span>
          </Link>
        </div>
      </section>

    </div>
  );
}

export default Dashboard;