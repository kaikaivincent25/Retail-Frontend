
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NAV_ICONS, NAV_ITEMS } from "../Navigation/navigationItems";
import "./Sidebar.css";

const ICONS = {
  ...NAV_ICONS,
  activity: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 1.8" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />
    </>
  ),
};

function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const items = NAV_ITEMS[user?.role]?.sidebar || [];

  function handleSidebarKeyDown(event) {
    if (event.key === "Escape" && !collapsed) {
      onToggle();
      event.currentTarget.querySelector(".sidebar-toggle")?.focus();
    }
  }

  function handleNavigationKeyDown(event) {
    const isHorizontal = window.matchMedia("(max-width: 650px)").matches;
    const keyDirection = isHorizontal
      ? { ArrowLeft: -1, ArrowRight: 1 }
      : { ArrowUp: -1, ArrowDown: 1 };
    const links = Array.from(event.currentTarget.querySelectorAll("a[href]"));
    const currentIndex = links.indexOf(event.target.closest("a"));
    let nextIndex;

    if (currentIndex < 0 || links.length === 0) {
      return;
    }

    if (Object.hasOwn(keyDirection, event.key)) {
      nextIndex = (currentIndex + keyDirection[event.key] + links.length) % links.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = links.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    links[nextIndex]?.focus();
  }

  return (
    <aside
      className={`sidebar sidebar--modern${collapsed ? " is-collapsed" : ""}`}
      aria-label="Main sidebar"
      onKeyDown={handleSidebarKeyDown}
    >
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo" aria-hidden="true">R</div>

        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">RIS</span>
          <span className="sidebar-brand-caption">RETAIL INFORMATION SYSTEM</span>
        </div>
        <button
          className="sidebar-toggle"
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="primary-navigation"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d={collapsed ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"} />
          </svg>
        </button>
      </div>

      <div className="sidebar-section-label">YOUR WORKSPACE</div>

      <nav
        className="sidebar-nav"
        id="primary-navigation"
        aria-label="Primary navigation"
        onKeyDown={handleNavigationKeyDown}
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " active" : "")
            }
          >
            <svg
              className="sidebar-link-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              {ICONS[item.icon]}
            </svg>
            <span className="sidebar-link-label">{item.label}</span>
            <span className="sidebar-active-indicator" aria-hidden="true" />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div
          className="sidebar-user"
          title={collapsed ? `${user?.username || "User"} · ${user?.role || "Account"}` : undefined}
        >
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
          end
          title={collapsed ? "Profile" : undefined}
          aria-label="Profile"
          className={({ isActive }) =>
            "sidebar-link" + (isActive ? " active" : "")
          }
        >
          <svg
            className="sidebar-link-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            {ICONS.profile}
          </svg>
          <span className="sidebar-link-label">Profile</span>
          <span className="sidebar-active-indicator" aria-hidden="true" />
        </NavLink>

        <button
          className="sidebar-logout"
          onClick={logout}
          title={collapsed ? "Log out" : undefined}
          aria-label="Log out"
        >
          <svg
            className="sidebar-logout-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            {ICONS.logout}
          </svg>
          <span className="sidebar-logout-label">Log out</span>
        </button>

        <div className="sidebar-footer">
          <span>RIS</span>
          <span>Made for the way you work.</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
