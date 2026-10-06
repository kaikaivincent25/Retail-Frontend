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

  return (
    <div className="staff-page">
      <h1>Staff</h1>

      <form className="new-staff-form" onSubmit={handleCreate}>
        <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input
          type="password"
          placeholder="Password (min. 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button type="submit">Add Staff Member</button>
      </form>
      {error && <div className="form-error">{error}</div>}

      <table className="staff-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Role</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id} className={!member.is_active ? "inactive-row" : ""}>
              <td>{member.full_name} {member.id === currentUser.id && <span className="you-badge">you</span>}</td>
              <td>{member.username}</td>
              <td>
                <select
                  value={member.role}
                  disabled={member.id === currentUser.id}
                  onChange={(e) => handleRoleChange(member, e.target.value)}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
              <td>{member.is_active ? "Active" : "Deactivated"}</td>
              <td>
                <button
                  className={member.is_active ? "danger small" : "primary small"}
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
  );
}

export default Staff;