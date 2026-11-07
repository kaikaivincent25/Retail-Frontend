import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { createCustomer, listCustomers, updateCustomer } from "../../services/customersApi";
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
          <p>Keep customer contact details together and prepare for credit tracking.</p>
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
              Credit limit <span>(optional)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={draft.credit_limit}
                onChange={(event) => updateDraft("credit_limit", event.target.value)}
              />
            </label>
            <label className="customers-notes-field">
              Notes <span>(optional)</span>
              <textarea
                maxLength={2000}
                rows={3}
                value={draft.notes}
                onChange={(event) => updateDraft("notes", event.target.value)}
              />
            </label>
            <div className="customers-form-actions">
              <button type="button" className="customers-secondary-button" onClick={cancelEdit}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="customers-panel customers-list-panel">
        <div className="customers-list-heading">
          <div>
            <h2>Customer directory</h2>
            <p>Search by name, phone, or email.</p>
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
                  {canManage && <th>Credit limit</th>}
                  <th>Status</th>
                  {canManage && <th><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className={!customer.is_active ? "is-archived" : ""}>
                    <td>
                      <span className="customers-name-mark" aria-hidden="true">
                        {customer.full_name.charAt(0).toUpperCase()}
                      </span>
                      <span>{customer.full_name}</span>
                    </td>
                    <td>
                      <span className="customers-contact">
                        {customer.phone || customer.email || "No contact details"}
                      </span>
                      {customer.phone && customer.email && (
                        <span className="customers-secondary-contact">{customer.email}</span>
                      )}
                    </td>
                    {canManage && (
                      <td>
                        {customer.credit_limit === null ? "Not set" : formatCurrency(customer.credit_limit)}
                      </td>
                    )}
                    <td>
                      <span className={`customers-status ${customer.is_active ? "is-active" : "is-archived"}`}>
                        {customer.is_active ? "Active" : "Archived"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="customers-actions">
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
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="customers-ledger-note">
          Credit balances and purchase history will appear here after credit sales are implemented.
        </p>
      </section>
    </main>
  );
}

export default Customers;
