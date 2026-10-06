import { useEffect, useState } from "react";
import { listSessions } from "../../services/cashSessionApi";
import { listUsers } from "../../services/usersApi";
import { formatCurrency } from "../../utils/money";
import { useAuth } from "../../context/AuthContext";
import "./CashSessions.css";

function CashSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [staff, setStaff] = useState([]);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.role === "cashier") return;
    listUsers().then(setStaff).catch(() => setStaff([]));
  }, [user?.role]);

  useEffect(() => {
    listSessions(user?.role === "cashier" ? undefined : userId || undefined)
      .then((result) => {
        setSessions(result);
        setError("");
      })
      .catch(() => setError("Could not load cash sessions."));
  }, [user?.role, userId]);

  function staffName(id) {
    return staff.find((s) => s.id === id)?.full_name || `User #${id}`;
  }

  return (
    <div className="cash-sessions-page">
      <h1>{user?.role === "cashier" ? "Shop Till History" : "Cash Sessions"}</h1>

      {user?.role !== "cashier" && (
        <select value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">All cashiers</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
      )}

      {error && <p role="alert" className="empty-hint">{error}</p>}
      <table className="sessions-table">
        <thead>
          <tr>
            <th>Cashier</th>
            <th>Opened</th>
            <th>Closed</th>
            <th>Opening</th>
            <th>Expected</th>
            <th>Counted</th>
            <th>Difference</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className={s.difference && Math.abs(s.difference) > 0 ? "flagged-row" : ""}>
              <td>{staffName(s.user_id)}</td>
              <td>{new Date(s.created_at).toLocaleString()}</td>
              <td>{s.closed_at ? new Date(s.closed_at).toLocaleString() : "—"}</td>
              <td>{formatCurrency(s.opening_cash)}</td>
              <td>{s.expected_cash != null ? formatCurrency(s.expected_cash) : "—"}</td>
              <td>{s.closing_cash != null ? formatCurrency(s.closing_cash) : "—"}</td>
              <td className={Number(s.difference) < 0 ? "negative" : Number(s.difference) > 0 ? "positive" : ""}>
                {s.difference != null ? `${Number(s.difference) > 0 ? "+" : ""}${formatCurrency(s.difference)}` : "—"}
              </td>
              <td><span className={`status-badge ${s.status}`}>{s.status}</span></td>
            </tr>
          ))}
          {sessions.length === 0 && (
            <tr><td colSpan={8} className="empty-hint">No sessions recorded yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default CashSessions;