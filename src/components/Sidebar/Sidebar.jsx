
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

const NAV_ITEMS = {
  admin: [
    { to: "/dashboard", label: "Dashboard", icon: "▦" },
    { to: "/sales", label: "Sales", icon: "↗" },
    { to: "/expenses", label: "Expenses", icon: "−" },
    { to: "/products", label: "Products", icon: "▣" },
    { to: "/inventory", label: "Inventory", icon: "▤" },
    { to: "/reports/sessions", label: "Cash & Deposits", icon: "◷" },
    { to: "/staff", label: "Staff", icon: "♙" },
    { to: "/reports", label: "Reports", icon: "▥" },
    { to: "/audit", label: "Activity Log", icon: "◷" },
  ],
  manager: [
    { to: "/dashboard", label: "Dashboard", icon: "▦" },
    { to: "/sales", label: "Sales", icon: "↗" },
    { to: "/expenses", label: "Expenses", icon: "−" },
    { to: "/products", label: "Products", icon: "▣" },
    { to: "/inventory", label: "Inventory", icon: "▤" },
    { to: "/reports/sessions", label: "Cash & Deposits", icon: "◷" },
    { to: "/reports", label: "Reports", icon: "▥" },
  ],
  cashier: [
    { to: "/dashboard", label: "Dashboard", icon: "▦" },
    { to: "/sales", label: "Sales", icon: "↗" },
    { to: "/expenses", label: "Expenses", icon: "−" },
    { to: "/reports/sales", label: "My Sales", icon: "▤" },
    { to: "/cashsessions", label: "Till History", icon: "◷" },
  ],
};

function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const items = NAV_ITEMS[user?.role] || [];

  return (
    <aside className="sidebar" aria-label="Main sidebar">

      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">R</div>

        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">RISA</span>
          <span className="sidebar-brand-caption">RETAIL SYSTEM</span>
        </div>
        <button
          className="sidebar-toggle"
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="sidebar-section-label">WORKSPACE</div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " active" : "")
            }
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span className="sidebar-link-label">{item.label}</span>
            <span className="sidebar-active-indicator" />
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="sidebar-bottom">

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.username?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="sidebar-user-info">
            <span className="sidebar-user-name">
              {user?.username || "User"}
            </span>
            <span className="sidebar-user-role">
              {user?.role || "Account"}
            </span>
          </div>

          <span className="sidebar-user-status" />
        </div>

        <NavLink
          to="/profile"
          title={collapsed ? "Profile" : undefined}
          aria-label="Profile"
          className={({ isActive }) =>
            "sidebar-link" + (isActive ? " active" : "")
          }
        >
          <span className="sidebar-link-icon" aria-hidden="true">◉</span>
          <span className="sidebar-link-label">Profile</span>
          <span className="sidebar-active-indicator" />
        </NavLink>

        <button
          className="sidebar-logout"
          onClick={logout}
          title={collapsed ? "Log out" : undefined}
          aria-label="Log out"
        >
          <span className="sidebar-logout-icon">↪</span>
          <span className="sidebar-logout-label">Log out</span>
        </button>

        <div className="sidebar-footer">
          <span>RISA</span>
          <span>Retail management made simple.</span>
        </div>

      </div>
    </aside>
  );
}

export default Sidebar;