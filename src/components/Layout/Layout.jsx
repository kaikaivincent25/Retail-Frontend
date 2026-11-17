
import { useState } from "react";
import Sidebar from "../Sidebar/Sidebar";
import TopNavigation from "../Navigation/TopNavigation";
import "./Layout.css";

function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <div className={`app-layout${sidebarCollapsed ? " sidebar-collapsed" : ""}${mobileNavigationOpen ? " mobile-navigation-open" : ""}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
        mobileOpen={mobileNavigationOpen}
        onMobileClose={() => setMobileNavigationOpen(false)}
      />
      {mobileNavigationOpen && (
        <button className="mobile-navigation-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileNavigationOpen(false)} />
      )}
      <main className="app-content">
        <TopNavigation onMenuToggle={() => setMobileNavigationOpen((open) => !open)} />
        {children}
      </main>
    </div>
  );
}

export default Layout;
