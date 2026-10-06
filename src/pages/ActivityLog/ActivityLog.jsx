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
    <div className="activity-page">
      <h1>Activity Log</h1>

      <div className="activity-controls">
        <label className="risk-toggle">
          <input
            type="checkbox"
            checked={highRiskOnly}
            onChange={(e) => { setHighRiskOnly(e.target.checked); setSkip(0); }}
          />
          Show high-risk actions only
        </label>

        <select value={userId} onChange={(e) => { setUserId(e.target.value); setSkip(0); }}>
          <option value="">All staff</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
      </div>

      <div className="activity-list">
        {entries.map((entry) => (
          <div className={`activity-row ${entry.is_high_risk ? "high-risk" : ""}`} key={entry.id}>
            <div className="activity-main">
              <span className="activity-action">
                {entry.is_high_risk && <span className="risk-dot" title="High-risk action">⚠</span>}
                {ACTION_LABELS[entry.action] || entry.action}
              </span>
              <span className="activity-user">{staffName(entry.user_id)}</span>
              <span className="activity-time">{new Date(entry.created_at).toLocaleString()}</span>
            </div>
            {entry.description && <p className="activity-description">{entry.description}</p>}
          </div>
        ))}
        {entries.length === 0 && (
          <p className="empty-hint">
            {highRiskOnly ? "No high-risk actions recorded." : "No activity recorded yet."}
          </p>
        )}
      </div>

      <div className="pagination">
        <button disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}>
          ← Newer
        </button>
        <button disabled={entries.length < PAGE_SIZE} onClick={() => setSkip(skip + PAGE_SIZE)}>
          Older →
        </button>
      </div>
    </div>
  );
}

export default ActivityLog;