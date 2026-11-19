import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  createCustomerActivity,
  createCustomer,
  getCustomerLedger,
  getCustomerOrders,
  getCustomerTimeline,
  listCustomerFollowUpAssignees,
  listCustomerFollowUps,
  listCustomers,
  recordCustomerPayment,
  updateCustomer,
  updateCustomerActivity,
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

const LEAD_STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  won: "Won",
  lost: "Lost",
};

const ORDER_STATUS_LABELS = {
  pending: "Awaiting acceptance",
  accepted: "Accepted",
  rejected: "Rejected",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered / collected",
  completed: "Closed",
  cancelled: "Cancelled",
};

function getWhatsAppUrl(phone, customerName) {
  if (!phone) return null;
  let number = phone.replace(/\D/g, "");
  if (number.length === 10 && number.startsWith("0")) number = `254${number.slice(1)}`;
  else if (number.length === 9 && /^[17]/.test(number)) number = `254${number}`;
  if (number.length < 9 || number.length > 15 || number.startsWith("0")) return null;
  const message = `Hi ${customerName}, how can we help you today?`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function getFollowUpTiming(followUp, now = new Date()) {
  const due = new Date(followUp.due_at);
  if (due < now) return { kind: "overdue", label: "Overdue" };
  if (
    due.getFullYear() === now.getFullYear()
    && due.getMonth() === now.getMonth()
    && due.getDate() === now.getDate()
  ) {
    return { kind: "today", label: "Due today" };
  }
  return { kind: "upcoming", label: "Upcoming" };
}

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
  const [followUps, setFollowUps] = useState([]);
  const [followUpAssignees, setFollowUpAssignees] = useState([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(true);
  const [followUpsError, setFollowUpsError] = useState("");
  const [dueFilter, setDueFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  // Customer Ledger Modal State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [onlineOrders, setOnlineOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [ledgerError, setLedgerError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [activityForm, setActivityForm] = useState({
    activity_type: "follow_up",
    body: "",
    due_at: "",
  });
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

  useEffect(() => {
    let active = true;
    listCustomerFollowUps()
      .then((items) => {
        if (active) setFollowUps(items);
      })
      .catch((requestError) => {
        if (active) {
          setFollowUps([]);
          setFollowUpsError(extractErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) setFollowUpsLoading(false);
      });

    if (canManage) {
      listCustomerFollowUpAssignees()
        .then((staff) => {
          if (active) setFollowUpAssignees(staff);
        })
        .catch((requestError) => {
          if (active) setFollowUpsError(extractErrorMessage(requestError));
        });
    }

    return () => {
      active = false;
    };
  }, [reloadKey, canManage]);

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
    setLedger(null);
    setTimeline(null);
    setOnlineOrders([]);
    setOrdersError("");
    setLoadingOrders(true);
    setActivityForm({ activity_type: "follow_up", body: "", due_at: "" });
    loadCustomerLedger(customer.id);
    loadCustomerTimeline(customer.id);
    getCustomerOrders(customer.id)
      .then(setOnlineOrders)
      .catch((err) => setOrdersError(extractErrorMessage(err)))
      .finally(() => setLoadingOrders(false));
  }

  function loadCustomerTimeline(customerId) {
    setLoadingTimeline(true);
    getCustomerTimeline(customerId)
      .then(setTimeline)
      .catch((err) => setLedgerError(extractErrorMessage(err)))
      .finally(() => setLoadingTimeline(false));
  }

  function closeLedgerModal() {
    setSelectedCustomer(null);
    setLedger(null);
    setTimeline(null);
    setLedgerError("");
    setPaymentSuccess("");
    setOnlineOrders([]);
    setOrdersError("");
  }

  async function handleCreateActivity(event) {
    event.preventDefault();
    if (!selectedCustomer || !activityForm.body.trim()) return;
    setActivitySubmitting(true);
    setLedgerError("");
    try {
      await createCustomerActivity(selectedCustomer.id, {
        activity_type: activityForm.activity_type,
        body: activityForm.body.trim(),
        due_at: activityForm.activity_type === "follow_up"
          ? new Date(activityForm.due_at).toISOString()
          : null,
      });
      setActivityForm((current) => ({ ...current, body: "" }));
      loadCustomerTimeline(selectedCustomer.id);
      setFollowUpsLoading(true);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setLedgerError(extractErrorMessage(requestError));
    } finally {
      setActivitySubmitting(false);
    }
  }

  async function handleFollowUpStatus(customerId, activityId, status) {
    setLedgerError("");
    if (selectedCustomer?.id !== customerId) setFollowUpsLoading(true);
    setFollowUpsError("");
    try {
      await updateCustomerActivity(customerId, activityId, { status });
      if (selectedCustomer?.id === customerId) loadCustomerTimeline(customerId);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      const message = extractErrorMessage(requestError);
      if (selectedCustomer?.id === customerId) setLedgerError(message);
      else setFollowUpsError(message);
    }
  }

  async function handleReassignFollowUp(customerId, activityId, assigneeId) {
    setFollowUpsError("");
    setFollowUpsLoading(true);
    try {
      await updateCustomerActivity(customerId, activityId, {
        assigned_to_user_id: Number(assigneeId),
      });
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setFollowUpsError(extractErrorMessage(requestError));
    }
  }

  async function handleLeadStatusChange(customer, leadStatus) {
    setLedgerError("");
    try {
      const updated = await updateCustomer(customer.id, { lead_status: leadStatus });
      setSelectedCustomer(updated);
      setCustomers((current) => current.map((item) => item.id === updated.id ? updated : item));
      loadCustomerTimeline(customer.id);
    } catch (requestError) {
      setLedgerError(extractErrorMessage(requestError));
    }
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
      lead_status: customer.lead_status || "new",
      identity_review_required: customer.identity_review_required || false,
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
        lead_status: draft.lead_status,
        identity_review_required: Boolean(draft.identity_review_required),
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
  const now = new Date();
  const overdueFollowUpCount = followUps.filter((item) => getFollowUpTiming(item, now).kind === "overdue").length;
  const todayFollowUpCount = followUps.filter((item) => getFollowUpTiming(item, now).kind === "today").length;
  const visibleFollowUps = followUps.filter((item) => {
    const timing = getFollowUpTiming(item, now).kind;
    const dueMatches = dueFilter === "all" || timing === dueFilter;
    const assigneeMatches = assigneeFilter === "all"
      || (assigneeFilter === "mine" && item.assigned_to_user_id === user?.id)
      || String(item.assigned_to_user_id) === assigneeFilter;
    return dueMatches && assigneeMatches;
  });

  return (
    <main className="customers-page">
      <header className="customers-header">
        <div>
          <span className="customers-eyebrow">CUSTOMER ACCOUNTS</span>
          <h1>Customers</h1>
          <p>Customer history, lead stages, follow-ups, and account balances.</p>
        </div>
        <div className="customers-reminder-placeholder" role="note">
          <strong>WhatsApp-ready follow-ups</strong>
          <span>Open a prepared message when you choose. The system does not send messages automatically.</span>
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

      <section className="customers-panel followups-panel" aria-labelledby="followups-heading">
        <div className="followups-heading">
          <div>
            <span className="customers-eyebrow">NEXT ACTIONS</span>
            <h2 id="followups-heading">Follow-ups</h2>
            <p>Keep customer conversations moving with clear owners and due dates.</p>
          </div>
          <div className="followups-counts" aria-label="Follow-up totals">
            <span><strong>{followUps.length}</strong> {canManage ? "open" : "my open"}</span>
            <span className={overdueFollowUpCount ? "is-overdue" : ""}><strong>{overdueFollowUpCount}</strong> overdue</span>
            <span><strong>{todayFollowUpCount}</strong> due today</span>
          </div>
        </div>
        <div className="followups-filters">
          <label>
            Due
            <select value={dueFilter} onChange={(event) => setDueFilter(event.target.value)}>
              <option value="all">All open</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due today</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </label>
          {canManage && (
            <label>
              Assigned to
              <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
                <option value="all">All staff</option>
                <option value="mine">Me</option>
                {followUpAssignees.map((staff) => (
                  <option key={staff.id} value={staff.id}>{staff.full_name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        {followUpsError && <p className="customers-message is-error" role="alert">{followUpsError}</p>}
        {followUpsLoading ? (
          <p className="customers-empty" role="status">Loading follow-ups…</p>
        ) : visibleFollowUps.length ? (
          <div className="followups-list">
            {visibleFollowUps.map((followUp) => {
              const timing = getFollowUpTiming(followUp);
              const currentAssigneeAvailable = followUpAssignees.some(
                (staff) => staff.id === followUp.assigned_to_user_id,
              );
              return (
                <article className={`followup-card ${timing.kind}`} key={followUp.id}>
                  <div className="followup-card-main">
                    <div className="followup-card-customer">
                      <button type="button" onClick={() => openLedgerModal(followUp.customer)}>
                        {followUp.customer.full_name}
                      </button>
                      {followUp.customer.phone && <span>{followUp.customer.phone}</span>}
                    </div>
                    <p>{followUp.body}</p>
                    <div className="followup-card-meta">
                      <span className={`followup-due ${timing.kind}`}>
                        {timing.label} · {new Date(followUp.due_at).toLocaleString()}
                      </span>
                      <span>{followUp.assigned_to_name || "Unassigned"}</span>
                    </div>
                  </div>
                  <div className="followup-card-actions">
                    {canManage && (
                      <label>
                        <span className="sr-only">Reassign follow-up for {followUp.customer.full_name}</span>
                        <select
                          aria-label={`Reassign follow-up for ${followUp.customer.full_name}`}
                          value={followUp.assigned_to_user_id ?? ""}
                          onChange={(event) => handleReassignFollowUp(followUp.customer.id, followUp.id, event.target.value)}
                        >
                          {!followUp.assigned_to_user_id && <option value="" disabled>Unassigned</option>}
                          {followUp.assigned_to_user_id && !currentAssigneeAvailable && (
                            <option value={followUp.assigned_to_user_id} disabled>
                              {followUp.assigned_to_name || "Inactive staff"}
                            </option>
                          )}
                          {followUpAssignees.map((staff) => (
                            <option key={staff.id} value={staff.id}>{staff.full_name}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <button
                      type="button"
                      className="followup-complete-button"
                      onClick={() => handleFollowUpStatus(followUp.customer.id, followUp.id, "completed")}
                    >
                      Complete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="customers-empty">
            {followUps.length
              ? "No open follow-ups match these filters."
              : "No open follow-ups. Add one from a customer profile."}
          </p>
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
            <label>
              Lead stage
              <select
                value={draft.lead_status}
                onChange={(event) => updateDraft("lead_status", event.target.value)}
              >
                {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="customer-review-control">
              <input
                type="checkbox"
                checked={Boolean(draft.identity_review_required)}
                onChange={(event) => updateDraft("identity_review_required", event.target.checked)}
              />
              Mark possible duplicate identity as reviewed
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
            <p>Open a customer to view their journey, follow-ups, and credit ledger.</p>
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
                  <th>Lead stage</th>
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
                      {customer.identity_review_required && (
                        <span className="customer-identity-review">Review identity</span>
                      )}
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
                      <span className={`customer-lead-stage ${customer.lead_status || "new"}`}>
                        {LEAD_STATUS_LABELS[customer.lead_status] || "New"}
                      </span>
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
                <span className="customers-eyebrow">CUSTOMER PROFILE</span>
                <h2>{selectedCustomer.full_name}</h2>
                {selectedCustomer.identity_review_required && (
                  <p className="customer-identity-warning" role="status">
                    This profile was created because the phone matched multiple customer records.
                    Verify the identity before consolidating profiles.
                    {canManage && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const updated = await updateCustomer(selectedCustomer.id, {
                              identity_review_required: false,
                            });
                            setSelectedCustomer(updated);
                            setCustomers((current) => current.map((item) => item.id === updated.id ? updated : item));
                          } catch (requestError) {
                            setLedgerError(extractErrorMessage(requestError));
                          }
                        }}
                      >
                        Mark reviewed
                      </button>
                    )}
                  </p>
                )}
                <p className="customer-modal-contact">
                  {selectedCustomer.phone && <span>Tel: {selectedCustomer.phone}</span>}
                  {selectedCustomer.email && <span>Email: {selectedCustomer.email}</span>}
                  {selectedCustomer.credit_limit !== null && (
                    <span className="customer-limit-chip">
                      Limit: {formatCurrency(selectedCustomer.credit_limit)}
                    </span>
                  )}
                  {getWhatsAppUrl(selectedCustomer.phone, selectedCustomer.full_name) && (
                    <a
                      className="customer-whatsapp-link"
                      href={getWhatsAppUrl(selectedCustomer.phone, selectedCustomer.full_name)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                  )}
                </p>
              </div>
              <button type="button" className="customer-modal-close" onClick={closeLedgerModal} aria-label="Close ledger">
                ×
              </button>
            </header>

            {ledgerError && <div className="customers-message is-error">{ledgerError}</div>}
            {paymentSuccess && <div className="customers-message is-success">{paymentSuccess}</div>}
            <section className="customer-ledger-section customer-online-orders">
              <h3>Online order history</h3>
              {ordersError && <p className="customers-message is-error">{ordersError}</p>}
              {loadingOrders ? (
                <p className="customers-empty" role="status">Loading online orders…</p>
              ) : onlineOrders.length ? (
                <div className="customers-table-wrap">
                  <table className="customers-table">
                    <thead>
                      <tr><th>Order</th><th>Date</th><th>Items</th><th>Fulfilment</th><th>Payment</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                      {onlineOrders.map((order) => (
                        <tr key={order.id}>
                          <td><strong>{order.order_number}</strong></td>
                          <td>{new Date(order.created_at).toLocaleDateString()}</td>
                          <td>{order.items.map((item) => `${item.quantity}× ${item.variant_name}`).join(", ")}</td>
                          <td>{ORDER_STATUS_LABELS[order.status] || order.status}</td>
                          <td>{order.payment_status === "paid" ? "Paid" : "Payment due"}</td>
                          <td>{formatCurrency(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !ordersError ? (
                <p className="customers-empty">No online orders linked to this customer yet.</p>
              ) : null}
            </section>

            {loadingLedger && !ledger ? (
              <p className="customers-empty">Loading account history…</p>
            ) : ledger ? (
              <div className="customer-ledger-content">
                <section className="customer-ledger-section customer-crm-section">
                  <div className="customer-crm-heading">
                    <div>
                      <h3>Customer journey</h3>
                      <p>Purchases, online orders, notes, and follow-ups in one timeline.</p>
                    </div>
                    {canManage ? (
                      <label className="customer-stage-control">
                        Lead stage
                        <select
                          value={selectedCustomer.lead_status || "new"}
                          onChange={(event) => handleLeadStatusChange(selectedCustomer, event.target.value)}
                        >
                          {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <span className={`customer-lead-stage ${selectedCustomer.lead_status || "new"}`}>
                        {LEAD_STATUS_LABELS[selectedCustomer.lead_status] || "New"}
                      </span>
                    )}
                  </div>
                  <form className="customer-activity-form" onSubmit={handleCreateActivity}>
                    <label>
                      Activity
                      <select
                        value={activityForm.activity_type}
                        onChange={(event) => setActivityForm((current) => ({
                          ...current,
                          activity_type: event.target.value,
                        }))}
                      >
                        <option value="follow_up">Follow-up</option>
                        <option value="note">Note</option>
                      </select>
                    </label>
                    {activityForm.activity_type === "follow_up" && (
                      <label>
                        Due
                        <input
                          type="datetime-local"
                          value={activityForm.due_at}
                          onChange={(event) => setActivityForm((current) => ({
                            ...current,
                            due_at: event.target.value,
                          }))}
                          required
                        />
                      </label>
                    )}
                    <label className="customer-activity-body">
                      Details
                      <textarea
                        maxLength={2000}
                        value={activityForm.body}
                        onChange={(event) => setActivityForm((current) => ({
                          ...current,
                          body: event.target.value,
                        }))}
                        placeholder={activityForm.activity_type === "follow_up" ? "What should you follow up about?" : "Add a customer note"}
                        rows={2}
                        required
                      />
                    </label>
                    <button type="submit" disabled={activitySubmitting || !activityForm.body.trim() || (activityForm.activity_type === "follow_up" && !activityForm.due_at)}>
                      {activitySubmitting ? "Saving…" : activityForm.activity_type === "follow_up" ? "Schedule follow-up" : "Add note"}
                    </button>
                  </form>
                  {loadingTimeline ? (
                    <p className="customers-empty" role="status">Loading customer activity…</p>
                  ) : timeline?.entries?.length ? (
                    <ol className="customer-timeline">
                      {timeline.entries.map((entry) => (
                        <li key={entry.id} className={`customer-timeline-entry ${entry.kind}`}>
                          <span className="customer-timeline-marker" aria-hidden="true" />
                          <div className="customer-timeline-copy">
                            <div className="customer-timeline-topline">
                              <strong>{entry.title}</strong>
                              <time dateTime={entry.occurred_at}>{new Date(entry.occurred_at).toLocaleString()}</time>
                            </div>
                            <p>{entry.details}</p>
                            {entry.amount !== null && entry.amount !== undefined && (
                              <span className="customer-timeline-amount">{formatCurrency(entry.amount)}</span>
                            )}
                            {entry.kind === "follow_up" && (
                              <div className="customer-timeline-followup">
                                <span>
                                  Due {entry.due_at ? new Date(entry.due_at).toLocaleString() : "date not set"}
                                  {entry.assigned_to_name ? ` · ${entry.assigned_to_name}` : ""}
                                </span>
                                {entry.status === "open" ? (
                                  <button type="button" onClick={() => handleFollowUpStatus(selectedCustomer.id, Number(entry.id.replace("activity-", "")), "completed")}>
                                    Mark complete
                                  </button>
                                ) : <span className="customer-followup-complete">Completed</span>}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="customers-empty">No activity yet. Schedule a follow-up or add a note.</p>
                  )}
                </section>

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

              </div>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}

export default Customers;
