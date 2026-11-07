import { useEffect, useState } from "react";
import {
  getPerformanceReport,
  getReceivablesSummary,
  getReconciliationReport,
  listAccounts,
  listJournalEntries,
} from "../../services/accountingApi";
import { extractErrorMessage } from "../../services/errorHandling";
import { formatCurrency } from "../../utils/money";
import "./Accounting.css";

function Accounting() {
  const [activeTab, setActiveTab] = useState("receivables");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Receivables state
  const [receivables, setReceivables] = useState(null);

  // Performance state
  const [perfRange, setPerfRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  });
  const [performance, setPerformance] = useState(null);

  // Reconciliation state
  const [reconRange, setReconRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  });
  const [reconciliation, setReconciliation] = useState(null);

  // Journal state
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalRange, setJournalRange] = useState({ startDate: "", endDate: "" });

  // Accounts state
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true);
      setError("");

      let req;
      if (activeTab === "receivables") {
        req = getReceivablesSummary().then((data) => {
          if (active) setReceivables(data);
        });
      } else if (activeTab === "performance") {
        req = getPerformanceReport(perfRange).then((data) => {
          if (active) setPerformance(data);
        });
      } else if (activeTab === "reconciliation") {
        req = getReconciliationReport(reconRange).then((data) => {
          if (active) setReconciliation(data);
        });
      } else if (activeTab === "journal") {
        req = listJournalEntries(journalRange).then((data) => {
          if (active) setJournalEntries(data);
        });
      } else if (activeTab === "accounts") {
        req = listAccounts().then((data) => {
          if (active) setAccounts(data);
        });
      }

      if (req) {
        req
          .catch((err) => {
            if (active) setError(extractErrorMessage(err));
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [activeTab, perfRange, reconRange, journalRange]);

  function switchTab(tab) {
    setError("");
    setActiveTab(tab);
  }

  function handlePerfFilter(e) {
    e.preventDefault();
    const form = e.target;
    setPerfRange({
      startDate: form.startDate.value,
      endDate: form.endDate.value,
    });
  }

  function handleReconFilter(e) {
    e.preventDefault();
    const form = e.target;
    setReconRange({
      startDate: form.startDate.value,
      endDate: form.endDate.value,
    });
  }

  function handleJournalFilter(e) {
    e.preventDefault();
    const form = e.target;
    setJournalRange({
      startDate: form.startDate.value,
      endDate: form.endDate.value,
    });
  }

  return (
    <main className="accounting-page">
      <header className="accounting-header">
        <div>
          <span className="accounting-eyebrow">FINANCIAL MANAGEMENT</span>
          <h1>Accounting</h1>
          <p>Double-entry general ledger, receivables aging, and accrual performance.</p>
        </div>
        <div className="accounting-notice-pill" role="note">
          <strong>Accrual basis preview</strong>
          <span>Revenue recognized at sale; balance sheet requires cutover & opening balances.</span>
        </div>
      </header>

      <nav className="accounting-tabs" aria-label="Accounting views">
        <button
          type="button"
          className={`accounting-tab-btn ${activeTab === "receivables" ? "active" : ""}`}
          onClick={() => switchTab("receivables")}
        >
          Receivables
        </button>
        <button
          type="button"
          className={`accounting-tab-btn ${activeTab === "performance" ? "active" : ""}`}
          onClick={() => switchTab("performance")}
        >
          Income Performance
        </button>
        <button
          type="button"
          className={`accounting-tab-btn ${activeTab === "reconciliation" ? "active" : ""}`}
          onClick={() => switchTab("reconciliation")}
        >
          Sales & Collections
        </button>
        <button
          type="button"
          className={`accounting-tab-btn ${activeTab === "journal" ? "active" : ""}`}
          onClick={() => switchTab("journal")}
        >
          General Journal
        </button>
        <button
          type="button"
          className={`accounting-tab-btn ${activeTab === "accounts" ? "active" : ""}`}
          onClick={() => switchTab("accounts")}
        >
          Chart of Accounts
        </button>
        <button
          type="button"
          className={`accounting-tab-btn ${activeTab === "balancesheet" ? "active" : ""}`}
          onClick={() => switchTab("balancesheet")}
        >
          Balance Sheet
        </button>
      </nav>

      {error && <div className="accounting-error-banner" role="alert">{error}</div>}

      {/* RECEIVABLES TAB */}
      {activeTab === "receivables" && (
        <section className="accounting-tab-content">
          {loading && !receivables ? (
            <p className="accounting-loading">Loading receivables data…</p>
          ) : receivables ? (
            <>
              <div className="accounting-kpi-grid">
                <article className="accounting-kpi-card highlight-card">
                  <span>Total outstanding</span>
                  <strong>{formatCurrency(receivables.total_outstanding)}</strong>
                  <small>Across all credit accounts</small>
                </article>
                <article className="accounting-kpi-card is-danger">
                  <span>Overdue total</span>
                  <strong>{formatCurrency(receivables.total_overdue)}</strong>
                  <small>Past agreed due date</small>
                </article>
                <article className="accounting-kpi-card">
                  <span>Current (within terms)</span>
                  <strong>{formatCurrency(receivables.current)}</strong>
                  <small>Due date not reached</small>
                </article>
                <article className="accounting-kpi-card">
                  <span>1–30 days overdue</span>
                  <strong>{formatCurrency(receivables.overdue_1_30)}</strong>
                  <small>Recent arrears</small>
                </article>
                <article className="accounting-kpi-card">
                  <span>31–60 days overdue</span>
                  <strong>{formatCurrency(receivables.overdue_31_60)}</strong>
                  <small>Intermediate aging</small>
                </article>
                <article className="accounting-kpi-card is-danger">
                  <span>60+ days overdue</span>
                  <strong>{formatCurrency(receivables.overdue_60_plus)}</strong>
                  <small>Critical follow-up needed</small>
                </article>
              </div>

              <div className="accounting-card">
                <div className="accounting-card-header">
                  <h2>Customer receivables aging</h2>
                  <span>{receivables.customers.length} accounts with open balance</span>
                </div>
                {receivables.customers.length === 0 ? (
                  <p className="accounting-empty-state">No open accounts receivable balances.</p>
                ) : (
                  <div className="accounting-table-wrap">
                    <table className="accounting-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Contact</th>
                          <th>Credit limit</th>
                          <th>Outstanding balance</th>
                          <th>Overdue balance</th>
                          <th>Oldest due date</th>
                          <th>Open invoices</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receivables.customers.map((c) => (
                          <tr key={c.customer_id}>
                            <td>
                              <strong>{c.customer_name}</strong>
                            </td>
                            <td>{c.phone || "—"}</td>
                            <td>{c.credit_limit ? formatCurrency(c.credit_limit) : "No limit"}</td>
                            <td>
                              <strong>{formatCurrency(c.outstanding_balance)}</strong>
                            </td>
                            <td className={Number(c.overdue_balance) > 0 ? "text-danger" : ""}>
                              {Number(c.overdue_balance) > 0
                                ? formatCurrency(c.overdue_balance)
                                : "—"}
                            </td>
                            <td>{c.oldest_due_date || "—"}</td>
                            <td>{c.open_invoices_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </section>
      )}

      {/* PERFORMANCE TAB */}
      {activeTab === "performance" && (
        <section className="accounting-tab-content">
          <form className="accounting-date-form" onSubmit={handlePerfFilter}>
            <label>
              From
              <input type="date" name="startDate" defaultValue={perfRange.startDate} required />
            </label>
            <label>
              To
              <input type="date" name="endDate" defaultValue={perfRange.endDate} required />
            </label>
            <button type="submit" className="accounting-btn-primary">Apply dates</button>
          </form>

          {loading && !performance ? (
            <p className="accounting-loading">Calculating performance…</p>
          ) : performance ? (
            <>
              <div className="accounting-card">
                <div className="accounting-card-header">
                  <h2>Income statement (accrual performance)</h2>
                  <span>
                    {performance.start_date} to {performance.end_date} · Currency: {performance.currency}
                  </span>
                </div>

                <div className="accounting-table-wrap">
                  <table className="accounting-table performance-table">
                    <tbody>
                      <tr className="level-1">
                        <td><strong>Sales revenue</strong> (Account 4000)</td>
                        <td className="text-right"><strong>{formatCurrency(performance.sales_revenue)}</strong></td>
                      </tr>
                      <tr className="level-2">
                        <td>Less: Cost of goods sold (FIFO allocated, Account 5000)</td>
                        <td className="text-right">({formatCurrency(performance.cost_of_goods_sold)})</td>
                      </tr>
                      <tr className="level-total">
                        <td><strong>Gross profit</strong></td>
                        <td className="text-right"><strong>{formatCurrency(performance.gross_profit)}</strong></td>
                      </tr>
                      <tr className="level-2">
                        <td>Less: Operating expenses (Account 5100)</td>
                        <td className="text-right">({formatCurrency(performance.operating_expenses)})</td>
                      </tr>
                      <tr className="level-2">
                        <td>Less: Stock adjustments & staff consumption (Accounts 5200, 5300)</td>
                        <td className="text-right">({formatCurrency(performance.stock_adjustments)})</td>
                      </tr>
                      <tr className="level-net">
                        <td><strong>Estimated net profit</strong></td>
                        <td className="text-right highlight-profit">
                          <strong>{formatCurrency(performance.estimated_net_profit)}</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="accounting-notice-box">
                  <strong>Notes & basis of preparation:</strong>
                  <ul>
                    {performance.notices.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : null}
        </section>
      )}

      {/* RECONCILIATION TAB */}
      {activeTab === "reconciliation" && (
        <section className="accounting-tab-content">
          <form className="accounting-date-form" onSubmit={handleReconFilter}>
            <label>
              From
              <input type="date" name="startDate" defaultValue={reconRange.startDate} required />
            </label>
            <label>
              To
              <input type="date" name="endDate" defaultValue={reconRange.endDate} required />
            </label>
            <button type="submit" className="accounting-btn-primary">Apply dates</button>
          </form>

          {loading && !reconciliation ? (
            <p className="accounting-loading">Reconciling transactions…</p>
          ) : reconciliation ? (
            <>
              <div className="accounting-recon-grid">
                <div className="accounting-card">
                  <div className="accounting-card-header">
                    <h2>Sales by tender (transaction date)</h2>
                  </div>
                  <dl className="accounting-summary-dl">
                    <div>
                      <dt>Cash sales</dt>
                      <dd>{formatCurrency(reconciliation.sales_cash)}</dd>
                    </div>
                    <div>
                      <dt>M-Pesa sales</dt>
                      <dd>{formatCurrency(reconciliation.sales_mpesa)}</dd>
                    </div>
                    <div>
                      <dt>Credit sales (Accounts receivable issued)</dt>
                      <dd>{formatCurrency(reconciliation.sales_credit)}</dd>
                    </div>
                    <div className="dl-total">
                      <dt>Total sales revenue</dt>
                      <dd>{formatCurrency(reconciliation.sales_total)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="accounting-card">
                  <div className="accounting-card-header">
                    <h2>Collections by tender (payment date)</h2>
                  </div>
                  <dl className="accounting-summary-dl">
                    <div>
                      <dt>Cash collections (Customer repayments)</dt>
                      <dd>{formatCurrency(reconciliation.collections_cash)}</dd>
                    </div>
                    <div>
                      <dt>M-Pesa collections (Customer repayments)</dt>
                      <dd>{formatCurrency(reconciliation.collections_mpesa)}</dd>
                    </div>
                    <div className="dl-total">
                      <dt>Total collections</dt>
                      <dd>{formatCurrency(reconciliation.collections_total)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="accounting-card">
                <div className="accounting-card-header">
                  <h2>Receivables movement bridge</h2>
                </div>
                <dl className="accounting-summary-dl">
                  <div>
                    <dt>New credit issued in period</dt>
                    <dd>{formatCurrency(reconciliation.receivables_issued)}</dd>
                  </div>
                  <div>
                    <dt>Less: Collections applied to receivables</dt>
                    <dd>({formatCurrency(reconciliation.receivables_collected)})</dd>
                  </div>
                  <div className="dl-total">
                    <dt>Net change in receivables balance</dt>
                    <dd>{formatCurrency(reconciliation.net_receivables_change)}</dd>
                  </div>
                </dl>
                <div className="accounting-notice-box">
                  <strong>Reconciliation principles:</strong>
                  <ul>
                    {reconciliation.notices.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : null}
        </section>
      )}

      {/* GENERAL JOURNAL TAB */}
      {activeTab === "journal" && (
        <section className="accounting-tab-content">
          <form className="accounting-date-form" onSubmit={handleJournalFilter}>
            <label>
              From
              <input type="date" name="startDate" defaultValue={journalRange.startDate} />
            </label>
            <label>
              To
              <input type="date" name="endDate" defaultValue={journalRange.endDate} />
            </label>
            <button type="submit" className="accounting-btn-primary">Filter journal</button>
          </form>

          {loading && journalEntries.length === 0 ? (
            <p className="accounting-loading">Loading general journal…</p>
          ) : journalEntries.length === 0 ? (
            <p className="accounting-empty-state">No journal entries posted in this range.</p>
          ) : (
            <div className="accounting-journal-list">
              {journalEntries.map((entry) => (
                <article className="accounting-journal-entry" key={entry.id}>
                  <header className="journal-entry-header">
                    <div>
                      <strong>Entry #{entry.id} · {entry.description}</strong>
                      <span className="journal-meta">
                        Date: {entry.entry_date} · Source: {entry.source_type} #{entry.source_id}
                      </span>
                    </div>
                    <span className="journal-balanced-badge">Balanced: {formatCurrency(entry.debit_total)}</span>
                  </header>
                  <table className="accounting-table journal-lines-table">
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th>Type</th>
                        <th className="text-right">Debit</th>
                        <th className="text-right">Credit</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.lines.map((line) => (
                        <tr key={line.id}>
                          <td>
                            <strong>{line.account_code}</strong> — {line.account_name}
                          </td>
                          <td>
                            <span className="account-type-chip">{line.account_type}</span>
                          </td>
                          <td className="text-right">{Number(line.debit) > 0 ? formatCurrency(line.debit) : "—"}</td>
                          <td className="text-right">{Number(line.credit) > 0 ? formatCurrency(line.credit) : "—"}</td>
                          <td>{line.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* CHART OF ACCOUNTS TAB */}
      {activeTab === "accounts" && (
        <section className="accounting-tab-content">
          <div className="accounting-card">
            <div className="accounting-card-header">
              <h2>Default shop chart of accounts</h2>
              <span>Shop-scoped, double-entry accounts</span>
            </div>
            {accounts.length === 0 ? (
              <p className="accounting-loading">Loading accounts…</p>
            ) : (
              <div className="accounting-table-wrap">
                <table className="accounting-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Account name</th>
                      <th>Type</th>
                      <th>System account</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc) => (
                      <tr key={acc.id}>
                        <td>
                          <strong>{acc.code}</strong>
                        </td>
                        <td>{acc.name}</td>
                        <td>
                          <span className="account-type-chip">{acc.account_type}</span>
                        </td>
                        <td>{acc.is_system ? "Yes" : "Custom"}</td>
                        <td>
                          <span className={acc.is_active ? "text-success" : "text-muted"}>
                            {acc.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* BALANCE SHEET TAB */}
      {activeTab === "balancesheet" && (
        <section className="accounting-tab-content">
          <div className="accounting-card balancesheet-callout-card">
            <div className="balancesheet-callout-icon" aria-hidden="true">⚖</div>
            <h2>Balance sheet prerequisite notice</h2>
            <p className="balancesheet-lead">
              A statutory balance sheet requires <strong>Assets = Liabilities + Equity</strong> as of a specified date.
              Displaying a derived sales/expense aggregate would be financially misleading.
            </p>
            <div className="balancesheet-checklist">
              <h3>Required prerequisites before enabling a balance sheet:</h3>
              <ul>
                <li>✓ Double-entry chart of accounts & balanced general journal foundation (Implemented)</li>
                <li>✓ Accrual sale & customer payment posting (Implemented)</li>
                <li>⏳ Formal accounting cutover date (Pending user configuration)</li>
                <li>⏳ Verified opening balances for cash, inventory, receivables, owner equity (Pending user configuration)</li>
                <li>⏳ Period close & reconciliation validation suite (Scheduled for Phase 2)</li>
              </ul>
            </div>
            <p className="balancesheet-footer-note">
              Per product specification: this area is operating in <em>accrual preview mode</em>.
              Once your shop establishes an accounting cutover date and verified opening balances, the full balance sheet equation can be published.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

export default Accounting;
