import { useEffect, useState } from "react";
import { listActivity } from "../../services/auditApi";
import { listUsers } from "../../services/usersApi";
import "./ActivityLog.css";

const ACTION_LABELS = {
  login: "Logged in",
  sale_completed: "Completed a sale",
  sale_voided: "Voided a sale",
  cart_cleared: "Cleared a cart",
  inventory_adjusted: "Adjusted inventory",
  product_created: "Created a product",
  variant_created: "Created a variant",
  cash_session_opened: "Opened a cash session",
  cash_session_closed: "Closed a cash session",
  expense_logged: "Logged an expense",
};

function ActivityLog() {
  const [entries, setEntries] = useState([]);
  const [staff, setStaff] = useState([]);
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [userId, setUserId] = useState("");
  const [skip, setSkip] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    listUsers().then(setStaff).catch(() => setStaff([]));
  }, []);

  useEffect(() => {
    listActivity({ highRiskOnly, userId: userId || undefined, skip, limit: PAGE_SIZE }).then(setEntries);
  }, [highRiskOnly, userId, skip]);

  function staffName(id) {
    return staff.find((s) => s.id === id)?.full_name || `User #${id}`;
  }

  return (
    <main className="activity-page">
      <header className="activity-header">
        <p className="activity-eyebrow">Store operations <span>/</span> Audit trail</p>
        <h1>Activity log</h1>
        <p className="activity-intro">
          A clear record of the actions taking place across your store.
        </p>
      </header>

      <div className="activity-controls">
        <div className="activity-filter-copy">
          <span className="filter-kicker">Refine the record</span>
          <span className="filter-description">Choose which activity to view</span>
        </div>

        <div className="activity-filter-options">
          <label className="risk-toggle">
            <input
              type="checkbox"
              checked={highRiskOnly}
              onChange={(e) => { setHighRiskOnly(e.target.checked); setSkip(0); }}
            />
            <span>High-risk only</span>
          </label>

          <label className="staff-filter">
            <span className="sr-only">Filter by staff member</span>
            <select value={userId} onChange={(e) => { setUserId(e.target.value); setSkip(0); }}>
              <option value="">All staff</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <section className="activity-list" aria-label="Recent activity">
        <div className="activity-list-header">
          <div>
            <span className="list-kicker">The record</span>
            <h2>Recent activity</h2>
          </div>
          <span className="list-order">Newest first</span>
        </div>

        {entries.map((entry) => (
          <article className={`activity-row ${entry.is_high_risk ? "high-risk" : ""}`} key={entry.id}>
            <div className="activity-marker" aria-hidden="true">
              {entry.is_high_risk && <span className="risk-dot">!</span>}
            </div>
            <div className="activity-event">
              <div className="activity-main">
                <div className="activity-heading">
                  <h3 className="activity-action">
                    {entry.entity_type === "sale_stock_conflict"
                      ? "Stock discrepancy"
                      : ACTION_LABELS[entry.action] || entry.action}
                  </h3>
                  {entry.is_high_risk && <span className="risk-label">High risk</span>}
                </div>
                <time className="activity-time" dateTime={entry.created_at}>
                  {new Date(entry.created_at).toLocaleString()}
                </time>
              </div>
              <p className="activity-user">{staffName(entry.user_id)}</p>
              {entry.description && <p className="activity-description">{entry.description}</p>}
            </div>
          </article>
        ))}
        {entries.length === 0 && (
          <div className="empty-hint">
            <span className="empty-mark" aria-hidden="true">—</span>
            <p>{highRiskOnly ? "No high-risk actions recorded." : "No activity recorded yet."}</p>
            <span>New store activity will appear here.</span>
          </div>
        )}
      </section>

      <div className="pagination">
        <button disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}>
          ← Newer
        </button>
        <button disabled={entries.length < PAGE_SIZE} onClick={() => setSkip(skip + PAGE_SIZE)}>
          Older →
        </button>
      </div>
    </main>
  );
}

export default ActivityLog;