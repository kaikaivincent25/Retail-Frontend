
import { useState } from "react";
import Sidebar from "../Sidebar/Sidebar";
import SyncStatus from "../SyncStatus";
import "./Layout.css";

function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-layout${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      <main className="app-content">
        <div className="app-status-strip"><SyncStatus /></div>
        {children}
      </main>
    </div>
  );
}

export default Layout;