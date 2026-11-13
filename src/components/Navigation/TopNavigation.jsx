import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NAV_ICONS, NAV_ITEMS } from "./navigationItems";
import SyncStatus from "../SyncStatus";
import "./TopNavigation.css";

function TopNavigation({ onMenuToggle }) {
  const { user } = useAuth();
  const location = useLocation();
  const items = NAV_ITEMS[user?.role]?.top || [];
  const sidebarItems = NAV_ITEMS[user?.role]?.sidebar || [];
  const currentItem = [...sidebarItems, ...items].find((item) => item.to === location.pathname);

  if (items.length === 0) return null;

  function handleNavigationKeyDown(event) {
    const links = Array.from(event.currentTarget.querySelectorAll("a[href]"));
    const currentIndex = links.indexOf(event.target.closest("a"));
    if (currentIndex < 0 || links.length === 0) return;

    let nextIndex;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % links.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + links.length) % links.length;
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
    <header className="workspace-navigation">
      <button className="mobile-menu-toggle" type="button" onClick={onMenuToggle} aria-label="Open navigation" aria-controls="primary-navigation">
        <span /><span /><span />
      </button>
      <div className="workspace-navigation-label">
        <strong>{currentItem?.label || "Workspace"}</strong>
        <span>RIS workspace</span>
      </div>
      <span className="workspace-breadcrumb">Retail operations <span>/</span> {currentItem?.label || "Overview"}</span>
      <nav
        className="workspace-navigation-links"
        aria-label="Workspace shortcuts"
        onKeyDown={handleNavigationKeyDown}
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `workspace-navigation-link${isActive ? " active" : ""}`
            }
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              {NAV_ICONS[item.icon]}
            </svg>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="workspace-navigation-actions"><SyncStatus /><span className="workspace-role">{user?.role || "Account"}</span></div>
    </header>
  );
}

export default TopNavigation;
