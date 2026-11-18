
import { useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import TopNavigation from "../Navigation/TopNavigation";
import "./Layout.css";

function Layout({ children }) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavigation, setMobileNavigation] = useState(() => ({
    locationKey: location.key,
    open: false,
  }));
  const contentRef = useRef(null);
  const mobileNavigationOpen =
    mobileNavigation.locationKey === location.key && mobileNavigation.open;

  useLayoutEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
      contentRef.current.scrollLeft = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  function closeMobileNavigation() {
    setMobileNavigation({ locationKey: location.key, open: false });
  }

  function toggleMobileNavigation() {
    setMobileNavigation({
      locationKey: location.key,
      open: !mobileNavigationOpen,
    });
  }

  return (
    <div className={`app-layout${sidebarCollapsed ? " sidebar-collapsed" : ""}${mobileNavigationOpen ? " mobile-navigation-open" : ""}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
        mobileOpen={mobileNavigationOpen}
        onMobileClose={closeMobileNavigation}
      />
      {mobileNavigationOpen && (
        <button className="mobile-navigation-backdrop" type="button" aria-label="Close navigation" onClick={closeMobileNavigation} />
      )}
      <main className="app-content" ref={contentRef}>
        <TopNavigation
          mobileMenuOpen={mobileNavigationOpen}
          onMenuToggle={toggleMobileNavigation}
        />
        <div className="app-page-transition" key={location.pathname}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
