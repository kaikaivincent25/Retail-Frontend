
import { useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import TopNavigation from "../Navigation/TopNavigation";
import "./Layout.css";

function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const contentRef = useRef(null);
  const location = useLocation();

  useLayoutEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
      contentRef.current.scrollLeft = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
      <main className="app-content" ref={contentRef}>
        <TopNavigation onMenuToggle={() => setMobileNavigationOpen((open) => !open)} />
        {children}
      </main>
    </div>
  );
}

export default Layout;
