import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getCurrentSession } from "../../services/cashSessionApi";
import { createExpense, listExpenses } from "../../services/expensesApi";
import { formatCurrency } from "../../utils/money";
import "./Expenses.css";

const CATEGORIES = ["Meals", "Transport", "Supplies", "Utilities", "Other"];

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [hasOpenSession, setHasOpenSession] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refreshExpenses = useCallback(() => listExpenses().then(setExpenses), []);

  useEffect(() => {
    let current = true;
    Promise.all([listExpenses(), getCurrentSession()])
      .then(([expenseRows, session]) => {
        if (!current) return;
        setExpenses(expenseRows);
        setHasOpenSession(Boolean(session));
      })
      .catch((requestError) => {
        if (current) {
          setError(
            requestError.response?.data?.detail || "Could not load expenses and till status.",
          );
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

  const expenseTotal = expenses.reduce((total, expense) => total + Number(expense.amount), 0);
  const isManager = user?.role === "admin" || user?.role === "manager";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const createdExpense = await createExpense({
        category,
        description: description.trim() || null,
        amount: Number(amount),
      });
      setExpenses((current) => [createdExpense, ...current]);
      setAmount("");
      setDescription("");
      setSuccess("Expense recorded and included in today's net sales.");
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not record this expense.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    setError("");
    try {
      await refreshExpenses();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not refresh expenses.");
    }
  }

  return (
    <main className="expenses-page">
      <header className="expenses-header">
        <div>
          <span className="expenses-eyebrow">CASH CONTROL</span>
          <h1>Expenses</h1>
          <p>
            Record money paid out from the till here. For stock taken by staff,
            record staff use in Inventory instead; it does not reduce till cash.
          </p>
        </div>
        <Link className="expenses-sales-link" to="/dashboard">
          View daily sales <span aria-hidden="true">→</span>
        </Link>
      </header>

      <section className="expenses-summary" aria-label="Expense summary">
        <div className="expenses-summary-icon" aria-hidden="true">−</div>
        <div>
          <span>{isManager ? "Shop expenses shown" : "Your recorded expenses"}</span>
          <strong>{formatCurrency(expenseTotal)}</strong>
          <small>
            {isManager
              ? `${expenses.length} expense${expenses.length === 1 ? "" : "s"} across your shop`
              : `${expenses.length} expense${expenses.length === 1 ? "" : "s"} in this list`}
          </small>
        </div>
        <div className={`expenses-session-status${hasOpenSession ? " is-open" : ""}`}>
          <span className="expenses-status-dot" />
          {hasOpenSession ? "Till open" : "Till closed"}
        </div>
      </section>

      <div className="expenses-content">
        <section className="expenses-form-panel">
          <div className="expenses-panel-heading">
            <span className="expenses-panel-icon" aria-hidden="true">＋</span>
            <div>
              <h2>Record an expense</h2>
              <p>Every expense is assigned to the current cash session.</p>
            </div>
          </div>

          {!hasOpenSession && (
            <div className="expenses-session-warning" role="status">
              Open a till session before recording an expense.
              <Link to="/cashsessions">Go to till history</Link>
            </div>
          )}
          {error && <p className="expenses-message is-error" role="alert">{error}</p>}
          {success && <p className="expenses-message is-success" role="status">{success}</p>}

          <form className="expenses-form" onSubmit={handleSubmit}>
            <label>
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Amount (KES)
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="e.g. 100"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>
            <label>
              Note <span className="expenses-optional">(optional)</span>
              <input
                type="text"
                maxLength="255"
                placeholder="e.g. Lunch for cashier"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <button type="submit" disabled={saving || !hasOpenSession}>
              {saving ? "Recording…" : "Record expense"}
            </button>
          </form>
        </section>

        <section className="expenses-list-panel">
          <div className="expenses-list-heading">
            <div>
              <h2>{isManager ? "Shop expenses" : "Your expenses"}</h2>
              <p>{isManager ? "Recent spending logged by your team." : "Recent spending logged during your shifts."}</p>
            </div>
            <span className="expenses-count">{expenses.length}</span>
          </div>

          {loading ? (
            <p className="expenses-empty" role="status">Loading expenses…</p>
          ) : expenses.length === 0 ? (
            <div className="expenses-empty">
              <span aria-hidden="true">▤</span>
              <strong>No expenses recorded yet</strong>
              <p>Once a team member records spending, it will appear here.</p>
            </div>
          ) : (
            <div className="expenses-table-wrap">
              <table className="expenses-table">
                <thead>
                  <tr>
                    <th>Expense</th>
                    {isManager && <th>Recorded by</th>}
                    <th>Date &amp; time</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>
                        <strong>{expense.category}</strong>
                        {expense.description && <small>{expense.description}</small>}
                      </td>
                      {isManager && <td>{expense.user_name || "Team member"}</td>}
                      <td>{formatDate(expense.created_at)}</td>
                      <td className="expenses-amount">{formatCurrency(expense.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <button className="expenses-refresh" type="button" onClick={handleRefresh}>
        Refresh expenses
      </button>
    </main>
  );
}

export default Expenses;
