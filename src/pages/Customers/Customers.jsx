import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  createCustomer,
  getCustomerLedger,
  listCustomers,
  recordCustomerPayment,
  updateCustomer,
} from "../../services/customersApi";
import { extractErrorMessage } from "../../services/errorHandling";
import { formatCurrency } from "../../utils/money";
import "./Customers.css";

const EMPTY_CUSTOMER = {
  full_name: "",
  phone: "",
  email: "",
  notes: "",
};

function Customers() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";
  const [customers, setCustomers] = useState([]);
  const [draft, setDraft] = useState(EMPTY_CUSTOMER);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Customer Ledger Modal State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerError, setLedgerError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    sale_id: "",
    amount: "",
    payment_method: "cash",
    reference: "",
  });

  useEffect(() => {
    let active = true;
    listCustomers({ search, includeArchived })
      .then((rows) => {
        if (active) setCustomers(rows);
      })
      .catch((requestError) => {
        if (active) {
          setCustomers([]);
          setError(extractErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search, includeArchived, reloadKey]);

  function loadCustomerLedger(customerId) {
    setLoadingLedger(true);
    setLedgerError("");
    setPaymentSuccess("");
    getCustomerLedger(customerId)
      .then((data) => {
        setLedger(data);
        const openInvoices = data.invoices.filter((inv) => Number(inv.balance) > 0);
        if (openInvoices.length > 0) {
          setPaymentForm((prev) => ({
            ...prev,
            sale_id: String(openInvoices[0].id),
            amount: String(openInvoices[0].balance),
          }));
        } else {
          setPaymentForm((prev) => ({ ...prev, sale_id: "", amount: "" }));
        }
      })
      .catch((err) => {
        setLedgerError(extractErrorMessage(err));
      })
      .finally(() => {
        setLoadingLedger(false);
      });
  }

  function openLedgerModal(customer) {
    setSelectedCustomer(customer);
    loadCustomerLedger(customer.id);
  }

  function closeLedgerModal() {
    setSelectedCustomer(null);
    setLedger(null);
    setLedgerError("");
    setPaymentSuccess("");
  }

  function handleInvoiceSelect(e) {
    const saleId = e.target.value;
    const inv = ledger?.invoices.find((i) => String(i.id) === saleId);
    setPaymentForm((prev) => ({
      ...prev,
      sale_id: saleId,
      amount: inv ? String(inv.balance) : "",
    }));
  }

  async function handleRecordPayment(e) {
    e.preventDefault();
    if (!selectedCustomer || !paymentForm.sale_id || !paymentForm.amount) return;
    setPaymentSubmitting(true);
    setLedgerError("");
    setPaymentSuccess("");
    try {
      await recordCustomerPayment(selectedCustomer.id, {
        sale_id: Number(paymentForm.sale_id),
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference: paymentForm.reference.trim() || null,
      });
      setPaymentSuccess("Payment recorded successfully.");
      loadCustomerLedger(selectedCustomer.id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setLedgerError(extractErrorMessage(err));
    } finally {
      setPaymentSubmitting(false);
    }
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await createCustomer({
        full_name: draft.full_name.trim(),
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        notes: draft.notes.trim() || null,
      });
      setDraft(EMPTY_CUSTOMER);
      setSuccess("Customer added.");
      setLoading(true);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(extractErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(customer) {
    setEditing(customer.id);
    setDraft({
      full_name: customer.full_name,
      phone: customer.phone || "",
      email: customer.email || "",
      notes: customer.notes || "",
      credit_limit: customer.credit_limit ?? "",
    });
    setError("");
    setSuccess("");
  }

  function cancelEdit() {
    setEditing(null);
    setDraft(EMPTY_CUSTOMER);
  }

  async function handleUpdate(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateCustomer(editing, {
        full_name: draft.full_name.trim(),
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        notes: draft.notes.trim() || null,
        credit_limit: draft.credit_limit === "" ? null : Number(draft.credit_limit),
      });
      setEditing(null);
      setDraft(EMPTY_CUSTOMER);
      setSuccess("Customer details updated.");
      setLoading(true);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(extractErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(customer) {
    const action = customer.is_active ? "archive" : "reactivate";
    if (!window.confirm(`Are you sure you want to ${action} ${customer.full_name}?`)) return;
    setError("");
    setSuccess("");
    try {
      await updateCustomer(customer.id, { is_active: !customer.is_active });
      setSuccess(`Customer ${customer.is_active ? "archived" : "reactivated"}.`);
      setLoading(true);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(extractErrorMessage(requestError));
    }
  }

  const activeCount = customers.filter((customer) => customer.is_active).length;
  const archivedCount = customers.length - activeCount;

  return (
    <main className="customers-page">
      <header className="customers-header">
        <div>
          <span className="customers-eyebrow">CUSTOMER ACCOUNTS</span>
          <h1>Customers</h1>
          <p>Customer contact directory, credit accounts, and repayment tracking.</p>
        </div>
        <div className="customers-reminder-placeholder" role="note">
          <strong>Reminders — coming soon</strong>
          <span>Customer reminders are not scheduled or sent by the system yet.</span>
        </div>
      </header>

      <section className="customers-overview" aria-label="Customer overview">
        <article>
          <span>Customers shown</span>
          <strong>{customers.length}</strong>
        </article>
        <article>
          <span>Active</span>
          <strong>{activeCount}</strong>
        </article>
        {canManage && (
          <article>
            <span>Archived in results</span>
            <strong>{archivedCount}</strong>
          </article>
        )}
      </section>

      {error && <p className="customers-message is-error" role="alert">{error}</p>}
      {success && <p className="customers-message is-success" role="status">{success}</p>}

      {!editing && (
        <section className="customers-panel customers-create-panel">
          <div className="customers-panel-heading">
            <div className="customers-heading-icon" aria-hidden="true">+</div>
            <div>
              <h2>Add a customer</h2>
              <p>Only collect the contact information you need.</p>
            </div>
          </div>
          <form className="customers-form" onSubmit={handleCreate}>
            <label>
              Full name
              <input
                autoComplete="name"
                maxLength={150}
                value={draft.full_name}
                onChange={(event) => updateDraft("full_name", event.target.value)}
                required
              />
            </label>
            <label>
              Phone <span>(optional)</span>
              <input
                autoComplete="tel"
                maxLength={30}
                value={draft.phone}
                onChange={(event) => updateDraft("phone", event.target.value)}
              />
            </label>
            <label>
              Email <span>(optional)</span>
              <input
                autoComplete="email"
                type="email"
                maxLength={254}
                value={draft.email}
                onChange={(event) => updateDraft("email", event.target.value)}
              />
            </label>
            <button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add customer"}
            </button>
          </form>
        </section>
      )}

      {editing && canManage && (
        <section className="customers-panel customers-edit-panel">
          <div className="customers-panel-heading">
            <div className="customers-heading-icon" aria-hidden="true">✎</div>
            <div>
              <h2>Edit customer</h2>
              <p>Credit limits are optional; leave blank when no limit is set.</p>
            </div>
          </div>
          <form className="customers-form" onSubmit={handleUpdate}>
            <label>
              Full name
              <input
                maxLength={150}
                value={draft.full_name}
                onChange={(event) => updateDraft("full_name", event.target.value)}
                required
              />
            </label>
            <label>
              Phone <span>(optional)</span>
              <input
                maxLength={30}
                value={draft.phone}
                onChange={(event) => updateDraft("phone", event.target.value)}
              />
            </label>
            <label>
              Email <span>(optional)</span>
              <input
                type="email"
                maxLength={254}
                value={draft.email}
                onChange={(event) => updateDraft("email", event.target.value)}
              />
            </label>
            <label>
              Notes <span>(optional)</span>
              <textarea
                maxLength={2000}
                value={draft.notes}
                onChange={(event) => updateDraft("notes", event.target.value)}
                rows={2}
              />
            </label>
            <label>
              Credit limit (KSh) <span>(optional, manager only)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="No limit"
                value={draft.credit_limit}
                onChange={(event) => updateDraft("credit_limit", event.target.value)}
              />
            </label>
            <div className="customers-form-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" className="customers-button-secondary" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="customers-panel customers-list-panel">
        <div className="customers-list-heading">
          <div>
            <h2>Directory</h2>
            <p>Click a customer to view credit ledger and record payments.</p>
          </div>
          {canManage && (
            <label className="customers-archived-toggle">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => {
                  setLoading(true);
                  setError("");
                  setIncludeArchived(event.target.checked);
                }}
              />
              Include archived
            </label>
          )}
        </div>
        <label className="customers-search">
          <span className="sr-only">Search customers</span>
          <input
            type="search"
            placeholder="Search customers…"
            value={search}
            onChange={(event) => {
              setLoading(true);
              setError("");
              setSearch(event.target.value);
            }}
          />
        </label>

        {loading ? (
          <p className="customers-empty" role="status">Loading customers…</p>
        ) : customers.length === 0 ? (
          <div className="customers-empty">
            <span aria-hidden="true">♙</span>
            <strong>{search ? "No matching customers" : "No customers yet"}</strong>
            <p>{search ? "Try another name, phone number, or email." : "Add a customer above to start your directory."}</p>
          </div>
        ) : (
          <div className="customers-table-wrap">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Credit limit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className={!customer.is_active ? "is-archived" : ""}>
                    <td>
                      <button
                        type="button"
                        className="customer-name-link"
                        onClick={() => openLedgerModal(customer)}
                        title="View account ledger"
                      >
                        <span className="customers-name-mark" aria-hidden="true">
                          {customer.full_name.charAt(0).toUpperCase()}
                        </span>
                        <span>{customer.full_name}</span>
                      </button>
                    </td>
                    <td>
                      <span className="customers-contact">
                        {customer.phone || customer.email || "No contact details"}
                      </span>
                      {customer.phone && customer.email && (
                        <span className="customers-secondary-contact">{customer.email}</span>
                      )}
                    </td>
                    <td>
                      {customer.credit_limit === null ? "Not set" : formatCurrency(customer.credit_limit)}
                    </td>
                    <td>
                      <span className={`customers-status ${customer.is_active ? "is-active" : "is-archived"}`}>
                        {customer.is_active ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="customers-actions">
                      <button
                        type="button"
                        className="customers-btn-ledger"
                        onClick={() => openLedgerModal(customer)}
                      >
                        Ledger
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            className="customers-text-button"
                            onClick={() => beginEdit(customer)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="customers-text-button"
                            onClick={() => handleArchive(customer)}
                          >
                            {customer.is_active ? "Archive" : "Reactivate"}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CUSTOMER LEDGER & REPAYMENT MODAL */}
      {selectedCustomer && (
        <div className="customer-modal-backdrop" onClick={closeLedgerModal}>
          <div className="customer-ledger-modal" onClick={(e) => e.stopPropagation()}>
            <header className="customer-ledger-modal-header">
              <div>
                <span className="customers-eyebrow">ACCOUNT LEDGER</span>
                <h2>{selectedCustomer.full_name}</h2>
                <p className="customer-modal-contact">
                  {selectedCustomer.phone && <span>Tel: {selectedCustomer.phone}</span>}
                  {selectedCustomer.email && <span>Email: {selectedCustomer.email}</span>}
                  {selectedCustomer.credit_limit !== null && (
                    <span className="customer-limit-chip">
                      Limit: {formatCurrency(selectedCustomer.credit_limit)}
                    </span>
                  )}
                </p>
              </div>
              <button type="button" className="customer-modal-close" onClick={closeLedgerModal} aria-label="Close ledger">
                ×
              </button>
            </header>

            {ledgerError && <div className="customers-message is-error">{ledgerError}</div>}
            {paymentSuccess && <div className="customers-message is-success">{paymentSuccess}</div>}

            {loadingLedger && !ledger ? (
              <p className="customers-empty">Loading account history…</p>
            ) : ledger ? (
              <div className="customer-ledger-content">
                <div className="customer-ledger-kpis">
                  <article className="ledger-kpi-card highlight-card">
                    <span>Outstanding balance</span>
                    <strong>{formatCurrency(ledger.outstanding_balance)}</strong>
                    <small>Currently owed</small>
                  </article>
                  <article className="ledger-kpi-card is-danger">
                    <span>Overdue balance</span>
                    <strong>{formatCurrency(ledger.overdue_balance)}</strong>
                    <small>Past due date</small>
                  </article>
                  <article className="ledger-kpi-card">
                    <span>Total credit sales</span>
                    <strong>{formatCurrency(ledger.total_credit_sales)}</strong>
                    <small>{ledger.invoices.length} invoices</small>
                  </article>
                  <article className="ledger-kpi-card">
                    <span>Total repayments</span>
                    <strong>{formatCurrency(ledger.total_payments)}</strong>
                    <small>{ledger.payments.length} payments</small>
                  </article>
                </div>

                {/* RECORD REPAYMENT FORM */}
                {selectedCustomer.is_active && ledger.invoices.some((i) => Number(i.balance) > 0) && (
                  <div className="customer-repayment-box">
                    <h3>Record payment on account</h3>
                    <form className="customer-repayment-form" onSubmit={handleRecordPayment}>
                      <label>
                        Invoice to apply payment to
                        <select
                          value={paymentForm.sale_id}
                          onChange={handleInvoiceSelect}
                          required
                        >
                          {ledger.invoices
                            .filter((inv) => Number(inv.balance) > 0)
                            .map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                Invoice #{inv.id} · Bal: {formatCurrency(inv.balance)} (Due: {inv.due_date || "None"})
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Amount to pay (KSh)
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={paymentForm.amount}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                          }
                          required
                        />
                      </label>
                      <label>
                        Payment method
                        <select
                          value={paymentForm.payment_method}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({ ...prev, payment_method: e.target.value }))
                          }
                        >
                          <option value="cash">Cash</option>
                          <option value="mpesa">M-Pesa STK</option>
                          <option value="pochi">Pochi la Biashara</option>
                          <option value="till">Buy Goods Till</option>
                          <option value="paybill">PayBill</option>
                        </select>
                      </label>
                      <label>
                        Reference / receipt code (optional)
                        <input
                          type="text"
                          maxLength={100}
                          placeholder="e.g. M-Pesa code"
                          value={paymentForm.reference}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))
                          }
                        />
                      </label>
                      <button
                        type="submit"
                        className="customer-btn-record"
                        disabled={paymentSubmitting || !paymentForm.amount || Number(paymentForm.amount) <= 0}
                      >
                        {paymentSubmitting ? "Recording…" : "Record Payment"}
                      </button>
                    </form>
                  </div>
                )}

                {/* INVOICES LIST */}
                <div className="customer-ledger-section">
                  <h3>Credit purchases & invoices</h3>
                  {ledger.invoices.length === 0 ? (
                    <p className="customers-empty">No credit purchases recorded yet.</p>
                  ) : (
                    <div className="customers-table-wrap">
                      <table className="customers-table">
                        <thead>
                          <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Due date</th>
                            <th>Total</th>
                            <th>Paid</th>
                            <th>Balance</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledger.invoices.map((inv) => (
                            <tr key={inv.id}>
                              <td><strong>#{inv.id}</strong></td>
                              <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                              <td>{inv.due_date || "—"}</td>
                              <td>{formatCurrency(inv.total)}</td>
                              <td>{formatCurrency(inv.amount_paid)}</td>
                              <td><strong>{formatCurrency(inv.balance)}</strong></td>
                              <td>
                                <span className={`invoice-status-chip ${inv.status}`}>
                                  {inv.status.replace("_", " ")}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* PAYMENTS HISTORY */}
                <div className="customer-ledger-section">
                  <h3>Immutable payment history</h3>
                  {ledger.payments.length === 0 ? (
                    <p className="customers-empty">No repayments recorded yet.</p>
                  ) : (
                    <div className="customers-table-wrap">
                      <table className="customers-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Invoice #</th>
                            <th>Amount</th>
                            <th>Tender</th>
                            <th>Reference</th>
                            <th>Recorded by</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledger.payments.map((p) => (
                            <tr key={p.id}>
                              <td>{new Date(p.created_at).toLocaleString()}</td>
                              <td>#{p.sale_id}</td>
                              <td><strong>{formatCurrency(p.amount)}</strong></td>
                              <td><span className="payment-tender-chip">{p.payment_method}</span></td>
                              <td>{p.reference || "—"}</td>
                              <td>{p.recorded_by_name || `#${p.recorded_by_user_id}`}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* REMINDERS PLACEHOLDER */}
                <div className="customers-reminder-placeholder ledger-reminder-banner">
                  <strong>Reminders — coming soon</strong>
                  <span>Automated SMS and email reminders are scheduled for a future phase. No notifications are sent.</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}

export default Customers;
