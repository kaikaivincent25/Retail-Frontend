import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import platformApi from "../../services/platformApi";
import "./PlatformDashboard.css";

function PlatformDashboard() {
  const [overview, setOverview] = useState(null);
  const [shops, setShops] = useState([]);
  const [activity, setActivity] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("platform_token")) {
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
          localStorage.removeItem("platform_token");
          navigate("/platform/login", { replace: true });
        } else {
          setError(err.response?.data?.detail || "Could not load platform data.");
        }
      });
  }, [navigate]);

  async function viewActivity(shop) {
    setSelectedShop(shop);
    try {
      const response = await platformApi.get(`/platform/shops/${shop.id}/activity`);
      setActivity(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load shop activity.");
    }
  }

  function signOut() {
    localStorage.removeItem("platform_token");
    navigate("/platform/login", { replace: true });
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
      </section>
      <section className="platform-panel">
        <div className="platform-panel-heading"><div><span className="platform-kicker">TENANTS</span><h2>Registered shops</h2></div><span>{shops.length} shops</span></div>
        <div className="platform-table-wrap"><table className="platform-table"><thead><tr><th>Shop</th><th>Business type</th><th>Plan</th><th>Status</th><th>Users</th><th>Last activity</th><th /></tr></thead><tbody>
          {shops.map((shop) => <tr key={shop.id}><td><strong>{shop.name}</strong>{shop.is_suspended && <small className="platform-suspended">Suspended</small>}</td><td>{shop.business_type.replaceAll("_", " ")}</td><td>{shop.plan}</td><td>{shop.subscription_status}</td><td>{shop.active_users}</td><td>{shop.last_activity_at ? new Date(shop.last_activity_at).toLocaleString() : "No activity"}</td><td><button type="button" onClick={() => viewActivity(shop)}>Activity</button></td></tr>)}
        </tbody></table></div>
      </section>
      {selectedShop && <section className="platform-panel"><div className="platform-panel-heading"><div><span className="platform-kicker">AUDIT TRAIL</span><h2>{selectedShop.name}</h2></div><button type="button" onClick={() => setSelectedShop(null)}>Close</button></div><div className="platform-activity-list">{activity.length === 0 ? <p>No activity recorded.</p> : activity.map((entry) => <article key={entry.id}><strong>{entry.action.replaceAll("_", " ")}</strong><span>{entry.username} · {new Date(entry.created_at).toLocaleString()}</span><p>{entry.description || "No description"}</p></article>)}</div></section>}
    </main>
  );
}

function Metric({ label, value }) { return <article className="platform-metric"><span>{label}</span><strong>{value}</strong></article>; }

export default PlatformDashboard;
