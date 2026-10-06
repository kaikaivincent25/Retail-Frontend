import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getCashierDashboardSummary } from "../../services/dashboardApi";
import { formatCurrency } from "../../utils/money";
import "./CashierDashboard.css";

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function CashierDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getCashierDashboardSummary()
      .then(setSummary)
      .catch(() => setError("Could not load your sales and till summary."));
  }, []);

  if (error) {
    return <main className="cashier-dashboard"><p role="alert">{error}</p></main>;
  }

  if (!summary) {
    return <main className="cashier-dashboard"><p>Loading your dashboard…</p></main>;
  }

  const activeSession = summary.current_session;

  return (
    <main className="cashier-dashboard">
      <header className="cashier-dashboard-header">
        <div>
          <span className="cashier-dashboard-eyebrow">CASHIER WORKSPACE</span>
          <h1>Welcome back{user?.full_name ? `, ${user.full_name}` : ""}</h1>
          <p>Shop-wide sales and till reconciliation, all in one place.</p>
        </div>
        <time dateTime={summary.date}>
          {new Date(`${summary.date}T00:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
      </header>

      <section className="cashier-dashboard-cards" aria-label="Today's shop sales summary">
        <article className="cashier-dashboard-card">
          <span>Today's gross shop sales</span>
          <strong>{formatCurrency(summary.total_sales)}</strong>
          <small>Completed sales recorded today</small>
        </article>
        <article className="cashier-dashboard-card">
          <span>Today's expenses</span>
          <strong>{formatCurrency(summary.expense_total)}</strong>
          <small>Shop spending logged today</small>
        </article>
        <article className="cashier-dashboard-card cashier-net-sales-card">
          <span>Net sales</span>
          <strong>{formatCurrency(summary.net_sales)}</strong>
          <small>Gross sales less recorded expenses</small>
        </article>
        <article className="cashier-dashboard-card">
          <span>Transactions</span>
          <strong>{summary.transaction_count.toLocaleString()}</strong>
          <small>Completed sales today</small>
        </article>
        <article className="cashier-dashboard-card cashier-till-card">
          <span>Current till</span>
          <strong>{activeSession ? "Open" : "Closed"}</strong>
          <small>
            {activeSession
              ? `Opened ${formatDate(activeSession.created_at)} · Float ${formatCurrency(activeSession.opening_cash)}`
              : "No till session is currently open"}
          </small>
        </article>
      </section>

      <section className="cashier-dashboard-section cashier-expenses-shortcut">
        <div className="cashier-dashboard-section-heading">
          <div>
            <h2>Record or review expenses</h2>
            <p>Keep the day's net sales and till reconciliation up to date.</p>
          </div>
          <Link to="/expenses">Go to expenses <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="cashier-dashboard-section">
        <div className="cashier-dashboard-section-heading">
          <div>
            <h2>Recent sales</h2>
            <p>The shop's latest transactions, including completed and voided sales.</p>
          </div>
          <Link to="/reports/sales">View all sales <span aria-hidden="true">→</span></Link>
        </div>
        <div className="cashier-dashboard-table-wrap">
          <table className="cashier-dashboard-table">
            <thead>
              <tr><th>Sale</th><th>Date</th><th>Payment</th><th>Status</th><th>Total</th></tr>
            </thead>
            <tbody>
              {summary.recent_sales.map((sale) => (
                <tr key={sale.id}>
                  <td>#{sale.id}</td>
                  <td>{formatDate(sale.created_at)}</td>
                  <td>{sale.payment_method}</td>
                  <td><span className={`cashier-status ${sale.status}`}>{sale.status}</span></td>
                  <td>{formatCurrency(sale.total)}</td>
                </tr>
              ))}
              {summary.recent_sales.length === 0 && (
                <tr><td colSpan={5} className="cashier-empty">No sales recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cashier-dashboard-section">
        <div className="cashier-dashboard-section-heading">
          <div>
            <h2>Till reconciliation</h2>
            <p>Compare expected shop cash with the amount counted when the till was closed.</p>
          </div>
          <Link to="/cashsessions">View till history <span aria-hidden="true">→</span></Link>
        </div>
        <div className="cashier-dashboard-table-wrap">
          <table className="cashier-dashboard-table">
            <thead>
              <tr><th>Closed</th><th>Expected</th><th>Counted</th><th>Difference</th><th>Result</th></tr>
            </thead>
            <tbody>
              {summary.recent_sessions.map((session) => (
                <tr key={session.id}>
                  <td>{session.closed_at ? formatDate(session.closed_at) : "—"}</td>
                  <td>{formatCurrency(session.expected_cash)}</td>
                  <td>{formatCurrency(session.closing_cash)}</td>
                  <td className={Number(session.difference) < 0 ? "cashier-negative" : Number(session.difference) > 0 ? "cashier-positive" : ""}>
                    {Number(session.difference) > 0 ? "+" : ""}{formatCurrency(session.difference)}
                  </td>
                  <td>
                    <span className={`cashier-reconciliation ${Number(session.difference) === 0 ? "balanced" : "difference"}`}>
                      {Number(session.difference) === 0 ? "Balanced" : "Difference"}
                    </span>
                  </td>
                </tr>
              ))}
              {summary.recent_sessions.length === 0 && (
                <tr><td colSpan={5} className="cashier-empty">No closed till sessions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default CashierDashboard;
