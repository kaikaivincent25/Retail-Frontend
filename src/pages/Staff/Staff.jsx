import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { listUsers, createUser, updateUser } from "../../services/usersApi";
import "./Staff.css";

const ROLES = ["cashier", "manager", "admin"];

function Staff() {
  const { user: currentUser } = useAuth();
  const [staff, setStaff] = useState([]);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("cashier");
  const [error, setError] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    listUsers().then(setStaff);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await createUser({ full_name: fullName, username, password, role });
      setFullName(""); setUsername(""); setPassword(""); setRole("cashier");
      refresh();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create user.");
    }
  }

  async function handleToggleActive(member) {
    if (member.id === currentUser.id) return; // blocked server-side too, but skip the request
    const label = member.is_active ? "deactivate" : "reactivate";
    if (!window.confirm(`Are you sure you want to ${label} ${member.full_name}?`)) return;
    await updateUser(member.id, { is_active: !member.is_active });
    refresh();
  }

  async function handleRoleChange(member, newRole) {
    if (member.id === currentUser.id) return;
    await updateUser(member.id, { role: newRole });
    refresh();
  }

  const activeStaffCount = staff.filter((member) => member.is_active).length;
  const inactiveStaffCount = staff.length - activeStaffCount;

  return (
    <div className="staff-page">
      <header className="staff-header">
        <div className="staff-heading-copy">
          <span className="staff-eyebrow">TEAM MANAGEMENT</span>
          <h1>Staff</h1>
          <p>Manage access and roles for the people who keep your shop running.</p>
        </div>
        <div className="staff-header-note">
          <span className="staff-header-note-mark" aria-hidden="true">R</span>
          <span><strong>{staff.length} team members</strong><small>Access managed by you</small></span>
        </div>
      </header>

      <section className="staff-metrics" aria-label="Team overview">
        <article className="staff-metric-card">
          <span className="staff-metric-icon" aria-hidden="true">T</span>
          <div><small>Total team</small><strong>{staff.length}</strong></div>
        </article>
        <article className="staff-metric-card is-active-metric">
          <span className="staff-metric-icon" aria-hidden="true">A</span>
          <div><small>Active</small><strong>{activeStaffCount}</strong></div>
        </article>
        <article className="staff-metric-card is-inactive-metric">
          <span className="staff-metric-icon" aria-hidden="true">D</span>
          <div><small>Deactivated</small><strong>{inactiveStaffCount}</strong></div>
        </article>
      </section>

      <section className="staff-create-card">
        <div className="staff-section-heading">
          <div className="staff-section-icon" aria-hidden="true">+</div>
          <div>
            <span className="staff-section-kicker">GROW YOUR TEAM</span>
            <h2>Add a staff member</h2>
            <p>Create an account and assign the right level of access.</p>
          </div>
        </div>

        <form className="new-staff-form" onSubmit={handleCreate}>
          <label>
            Full name
            <input placeholder="e.g. Amina Wanjiku" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label>
            Username
            <input placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label>
            Temporary password
            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <button type="submit"><span aria-hidden="true">+</span> Add staff member</button>
        </form>
        {error && <div className="form-error" role="alert">{error}</div>}
      </section>

      <section className="staff-list-card">
        <div className="staff-list-heading">
          <div>
            <span className="staff-section-kicker">ACCESS &amp; PERMISSIONS</span>
            <h2>Your team</h2>
            <p>Update roles or deactivate access when responsibilities change.</p>
          </div>
          <span className="staff-count-badge">{staff.length} members</span>
        </div>

        {staff.length === 0 ? (
          <div className="staff-empty-state">
            <span aria-hidden="true">T</span>
            <strong>Your team will appear here</strong>
            <p>Add a staff member above to get started.</p>
          </div>
        ) : (
          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className={!member.is_active ? "inactive-row" : ""}>
                    <td>
                      <span className="staff-name-mark" aria-hidden="true">{member.full_name?.charAt(0)?.toUpperCase() || "S"}</span>
                      <span className="staff-name-cell">{member.full_name} {member.id === currentUser.id && <span className="you-badge">You</span>}</span>
                    </td>
                    <td>@{member.username}</td>
                    <td>
                      <select
                        value={member.role}
                        disabled={member.id === currentUser.id}
                        aria-label={`Role for ${member.full_name}`}
                        onChange={(e) => handleRoleChange(member, e.target.value)}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td><span className={`staff-status ${member.is_active ? "is-active" : "is-inactive"}`}>{member.is_active ? "Active" : "Deactivated"}</span></td>
                    <td>
                      <button
                        type="button"
                        className={`staff-toggle-button ${member.is_active ? "is-deactivate" : "is-reactivate"}`}
                        disabled={member.id === currentUser.id}
                        onClick={() => handleToggleActive(member)}
                      >
                        {member.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Staff;
