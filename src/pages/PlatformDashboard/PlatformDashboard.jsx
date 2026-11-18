import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import platformApi, { listPlatformUsers, updatePlatformUser } from "../../services/platformApi";
import "./PlatformDashboard.css";

const FEATURE_LABELS = {
  "reports.basic": "Daily sales reports",
  "reports.full": "Detailed reports",
  "reports.export": "Report exports",
  "inventory.reports": "Stock insights",
  expenses: "Expense tracking",
  "audit.logs": "Activity history",
  "mpesa.tools": "M-Pesa tools",
  "scheduled.reports": "Scheduled reports",
  multi_branch: "Multi-branch tools",
  online_store: "Public storefront and online orders",
};

function PlatformDashboard() {
  const [overview, setOverview] = useState(null);
  const [shops, setShops] = useState([]);
  const [activity, setActivity] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [shopUsers, setShopUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [featureDraft, setFeatureDraft] = useState([]);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [featureMessage, setFeatureMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionStorage.getItem("platform_token")) {
      navigate("/platform/login", { replace: true });
      return;
    }
    Promise.all([platformApi.get("/platform/overview"), platformApi.get("/platform/shops")])
      .then(([overviewResponse, shopsResponse]) => {
        setOverview(overviewResponse.data);
        setShops(shopsResponse.data);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          sessionStorage.removeItem("platform_token");
          navigate("/platform/login", { replace: true });
        } else {
          setError(err.response?.data?.detail || "Could not load platform data.");
        }
      });
  }, [navigate]);

  async function viewActivity(shop) {
    setSelectedShop(shop);
    setSelectedPanel("activity");
    try {
      const response = await platformApi.get(`/platform/shops/${shop.id}/activity`);
      setActivity(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load shop activity.");
    }
  }

  async function viewUsers(shop) {
    setSelectedShop(shop);
    setSelectedPanel("users");
    setUsersLoading(true);
    try {
      setShopUsers(await listPlatformUsers(shop.id));
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load shop users.");
    } finally {
      setUsersLoading(false);
    }
  }

  function viewFeatures(shop) {
    setSelectedShop(shop);
    setSelectedPanel("features");
    setFeatureDraft(shop.suspended_features || []);
    setFeatureMessage("");
    setError("");
  }

  function toggleFeatureSuspension(feature) {
    setFeatureDraft((current) => current.includes(feature)
      ? current.filter((item) => item !== feature)
      : [...current, feature]);
  }

  async function saveFeatures() {
    if (!selectedShop || savingFeatures) return;
    setSavingFeatures(true);
    setError("");
    setFeatureMessage("");
    try {
      const response = await platformApi.patch(`/platform/shops/${selectedShop.id}/features`, {
        suspended_features: featureDraft,
      });
      const updatedShop = { ...selectedShop, ...response.data };
      setSelectedShop(updatedShop);
      setShops((current) => current.map((shop) => shop.id === updatedShop.id ? updatedShop : shop));
      setFeatureMessage("Feature access updated and recorded in the platform audit trail.");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not update feature access.");
    } finally {
      setSavingFeatures(false);
    }
  }

  async function updateUser(shop, member, changes) {
    if (changes.is_active === false && !window.confirm(`Deactivate ${member.full_name}'s RIS access?`)) return;
    try {
      const updated = await updatePlatformUser(shop.id, member.id, changes);
      setShopUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (err) {
      setError(err.response?.data?.detail || "Could not update shop user.");
    }
  }

  function signOut() {
    sessionStorage.removeItem("platform_token");
    navigate("/platform/login", { replace: true });
  }

  async function toggleServices(shop) {
    const action = shop.service_suspended ? "restore-services" : "suspend-services";
    try {
      await platformApi.post(`/platform/shops/${shop.id}/${action}`);
      setShops((current) => current.map((item) => item.id === shop.id
        ? { ...item, service_suspended: !shop.service_suspended }
        : item));
    } catch (err) {
      setError(err.response?.data?.detail || "Could not update service access.");
    }
  }

  if (!overview) return <main className="platform-page"><p>Loading platform control centre…</p></main>;

  return (
    <main className="platform-page">
      <header className="platform-header">
        <div><span className="platform-kicker">RIS CONTROL CENTRE</span><h1>Platform overview</h1><p>Monitor shops, plans, access, and product usage without exposing tenant data.</p></div>
        <button type="button" className="platform-signout" onClick={signOut}>Sign out</button>
      </header>
      {error && <div className="platform-error">{error}</div>}
      <section className="platform-metrics">
        <Metric label="Total shops" value={overview.total_shops} />
        <Metric label="Active shops" value={overview.active_shops} />
        <Metric label="45-day trials" value={overview.trialing_shops} />
        <Metric label="Paid shops" value={overview.paid_shops} />
        <Metric label="Active users" value={overview.total_active_users} />
        <Metric label="Est. monthly revenue" value={`KES ${overview.estimated_monthly_revenue.toLocaleString()}`} />
        <Metric label="New shops (30d)" value={overview.new_shops_last_30_days} />
        <Metric label="Events (7d)" value={overview.activity_events_last_7_days} />
      </section>
      <section className="platform-panel">
        <div className="platform-panel-heading"><div><span className="platform-kicker">TENANTS</span><h2>Registered shops</h2></div><span>{shops.length} shops</span></div>
        <div className="platform-table-wrap"><table className="platform-table"><thead><tr><th>Shop</th><th>Business type</th><th>Plan</th><th>Status</th><th>Users</th><th>Last activity</th><th /></tr></thead><tbody>
          {shops.map((shop) => <tr key={shop.id}><td><strong>{shop.name}</strong>{shop.is_suspended && <small className="platform-suspended">Shop suspended</small>}{shop.service_suspended && <small className="platform-suspended">Services suspended</small>}{shop.suspended_features?.length > 0 && <small className="platform-suspended">{shop.suspended_features.length} feature(s) suspended</small>}</td><td>{shop.business_type.replaceAll("_", " ")}</td><td>{shop.plan}</td><td><span className={`platform-status platform-status-${shop.subscription_status}`}>{shop.subscription_status.replaceAll("_", " ")}</span></td><td>{shop.active_users}</td><td>{shop.last_activity_at ? new Date(shop.last_activity_at).toLocaleString() : "No activity"}</td><td><div className="platform-actions"><button type="button" onClick={() => viewUsers(shop)}>Users</button><button type="button" onClick={() => viewActivity(shop)}>Activity</button><button type="button" onClick={() => viewFeatures(shop)}>Features</button><button type="button" onClick={() => toggleServices(shop)}>{shop.service_suspended ? "Restore all" : "Suspend all"}</button></div></td></tr>)}
        </tbody></table></div>
      </section>
      {selectedShop && selectedPanel === "users" && <section className="platform-panel"><div className="platform-panel-heading"><div><span className="platform-kicker">USER MANAGEMENT</span><h2>{selectedShop.name} users</h2><p className="platform-panel-subtitle">Manage account access and roles for this RIS shop.</p></div><button type="button" onClick={() => { setSelectedShop(null); setSelectedPanel(null); setShopUsers([]); }}>Close</button></div>{usersLoading ? <p>Loading users…</p> : <div className="platform-table-wrap"><table className="platform-table"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th /></tr></thead><tbody>{shopUsers.map((member) => <tr key={member.id} className={!member.is_active ? "platform-inactive-row" : ""}><td><strong>{member.full_name}</strong></td><td>@{member.username}</td><td><select value={member.role} aria-label={`Role for ${member.full_name}`} onChange={(event) => updateUser(selectedShop, member, { role: event.target.value })}><option value="admin">admin</option><option value="manager">manager</option><option value="cashier">cashier</option></select></td><td><span className={`platform-user-status ${member.is_active ? "is-active" : "is-inactive"}`}>{member.is_active ? "Active" : "Deactivated"}</span></td><td><button type="button" onClick={() => updateUser(selectedShop, member, { is_active: !member.is_active })}>{member.is_active ? "Deactivate" : "Reactivate"}</button></td></tr>)}</tbody></table></div>}</section>}
      {selectedShop && selectedPanel === "features" && <section className="platform-panel"><div className="platform-panel-heading"><div><span className="platform-kicker">FEATURE ACCESS</span><h2>{selectedShop.name}</h2><p className="platform-panel-subtitle">Suspend individual features without disabling the whole subscription. Changes are audited.</p></div><button type="button" onClick={() => { setSelectedShop(null); setSelectedPanel(null); setFeatureDraft([]); setFeatureMessage(""); }}>Close</button></div><div className="platform-feature-grid">{Object.entries(selectedShop.features || {}).filter(([, enabled]) => enabled).map(([feature]) => <label className="platform-feature-option" key={feature}><input type="checkbox" checked={featureDraft.includes(feature)} onChange={() => toggleFeatureSuspension(feature)} /><span><strong>{FEATURE_LABELS[feature] || feature.replaceAll(".", " ").replaceAll("_", " ")}</strong><small>{featureDraft.includes(feature) ? "Suspended" : "Available on this plan"}</small></span></label>)}</div>{Object.values(selectedShop.features || {}).every((enabled) => !enabled) && <p className="platform-panel-subtitle">This plan has no optional features to manage.</p>}{featureMessage && <p className="platform-feature-success" role="status">{featureMessage}</p>}<button type="button" className="platform-save-features" onClick={saveFeatures} disabled={savingFeatures}>{savingFeatures ? "Saving…" : "Save feature access"}</button></section>}
      <section className="platform-panel platform-future-panel"><div><span className="platform-kicker">COMING NEXT</span><h2>Future platform tools</h2><p className="platform-panel-subtitle">Reserved space for controlled workflows as RIS grows.</p></div><div className="platform-future-grid"><FutureFeature label="Password reset" description="Issue a secure, audited reset link." /><FutureFeature label="User impersonation" description="Support users with explicit consent and audit trails." /><FutureFeature label="Access reports" description="Export account and sign-in history per shop." /></div></section>
      {selectedShop && selectedPanel === "activity" && <section className="platform-panel"><div className="platform-panel-heading"><div><span className="platform-kicker">AUDIT TRAIL</span><h2>{selectedShop.name}</h2></div><button type="button" onClick={() => { setSelectedShop(null); setSelectedPanel(null); }}>Close</button></div><div className="platform-activity-list">{activity.length === 0 ? <p>No activity recorded.</p> : activity.map((entry) => <article key={entry.id}><strong>{entry.action.replaceAll("_", " ")}</strong><span>{entry.username} · {new Date(entry.created_at).toLocaleString()}</span><p>{entry.description || "No description"}</p></article>)}</div></section>}
    </main>
  );
}

function Metric({ label, value }) { return <article className="platform-metric"><span>{label}</span><strong>{value}</strong></article>; }
function FutureFeature({ label, description }) { return <article className="platform-future-card"><span className="platform-future-badge">PLANNED</span><strong>{label}</strong><p>{description}</p><button type="button" disabled>Coming soon</button></article>; }

export default PlatformDashboard;
