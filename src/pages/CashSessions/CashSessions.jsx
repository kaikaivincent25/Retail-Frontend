import { useCallback, useEffect, useState } from "react";
import {
  getCashDeposits,
  getCurrentSession,
  listSessions,
  recordCashDeposit,
} from "../../services/cashSessionApi";
import { listUsers } from "../../services/usersApi";
import { formatCurrency } from "../../utils/money";
import { useAuth } from "../../context/AuthContext";
import "./CashSessions.css";

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function CashSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [availableCash, setAvailableCash] = useState(0);
  const [hasOpenSession, setHasOpenSession] = useState(false);
  const [staff, setStaff] = useState([]);
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [depositAll, setDepositAll] = useState(false);
  const [frequency, setFrequency] = useState("daily");
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user?.role === "cashier") return;
    listUsers().then(setStaff).catch(() => setStaff([]));
  }, [user?.role]);

  const loadCashData = useCallback(async () => {
    const [cashSession, depositSummary] = await Promise.all([
      getCurrentSession(),
      getCashDeposits(),
    ]);
    setHasOpenSession(Boolean(cashSession));
    setAvailableCash(Number(depositSummary.available_cash));
    setDeposits(depositSummary.deposits);
  }, []);

  useEffect(() => {
    Promise.all([
      listSessions(user?.role === "cashier" ? undefined : userId || undefined),
      loadCashData(),
    ])
      .then(([result]) => {
        setSessions(result);
        setError("");
      })
      .catch(() => setError("Could not load cash sessions."));
  }, [loadCashData, user?.role, userId]);

  async function handleDeposit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSavingDeposit(true);
    try {
      const depositAmount = depositAll ? availableCash : Number(amount);
      await recordCashDeposit({ amount: depositAmount, frequency });
      await loadCashData();
      setAmount("");
      setDepositAll(false);
      setSuccess("Cash deposit recorded.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail || "Could not record this cash deposit.",
      );
    } finally {
      setSavingDeposit(false);
    }
  }

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
      {success && <p role="status" className="deposit-success">{success}</p>}

      <section className="cash-deposit-panel">
        <div className="cash-deposit-header">
          <div>
            <h2>Shop cash deposits</h2>
            <p>
              Record cash taken out of the shop. Deposits can be partial or the
              full available balance and are carried forward across sessions.
            </p>
          </div>
          <div className="cash-deposit-balance">
            <span>Available to deposit</span>
            <strong>{formatCurrency(availableCash)}</strong>
          </div>
        </div>

        {hasOpenSession ? (
          <p className="deposit-notice" role="status">
            Close the current cash session before recording a deposit.
          </p>
        ) : (
          <form className="cash-deposit-form" onSubmit={handleDeposit}>
            <label>
              Deposit frequency
              <select
                value={frequency}
                onChange={(event) => setFrequency(event.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            <label className="deposit-amount-label">
              Amount (KES)
              <input
                type="number"
                min="0.01"
                max={availableCash}
                step="0.01"
                inputMode="decimal"
                value={depositAll ? availableCash : amount}
                onChange={(event) => {
                  setDepositAll(false);
                  setAmount(event.target.value);
                }}
                disabled={depositAll || availableCash <= 0}
                required={!depositAll}
              />
            </label>
            <label className="deposit-all-option">
              <input
                type="checkbox"
                checked={depositAll}
                disabled={availableCash <= 0}
                onChange={(event) => {
                  setDepositAll(event.target.checked);
                  if (event.target.checked) setAmount("");
                }}
              />
              Deposit all available cash
            </label>
            <button
              type="submit"
              disabled={
                savingDeposit ||
                availableCash <= 0 ||
                (!depositAll && (!amount || Number(amount) <= 0 || Number(amount) > availableCash))
              }
            >
              {savingDeposit ? "Recording…" : "Record deposit"}
            </button>
          </form>
        )}

        {deposits.length === 0 ? (
          <p className="deposit-empty">No deposits recorded yet.</p>
        ) : (
          <div className="deposit-table-wrap">
            <table className="deposit-table">
              <thead>
                <tr>
                  <th>Date &amp; time</th>
                  <th>Frequency</th>
                  <th>Recorded by</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((deposit) => (
                  <tr key={deposit.id}>
                    <td>{formatDate(deposit.created_at)}</td>
                    <td>{deposit.frequency}</td>
                    <td>{deposit.user_name}</td>
                    <td>{formatCurrency(deposit.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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