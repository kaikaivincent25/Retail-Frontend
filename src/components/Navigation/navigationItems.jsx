export const NAV_ITEMS = {
  admin: {
    sidebar: [
      { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { to: "/sales", label: "Sales", icon: "sales" },
      { to: "/customers", label: "Customers", icon: "customers" },
      { to: "/expenses", label: "Expenses", icon: "expenses" },
      { to: "/products", label: "Products", icon: "products" },
      { to: "/inventory", label: "Inventory", icon: "inventory" },
      { to: "/orders", label: "Online Orders", icon: "sales" },
    ],
    top: [
      { to: "/reports/sessions", label: "Cash & Deposits", icon: "cash" },
      { to: "/staff", label: "Staff", icon: "staff" },
      { to: "/reports", label: "Reports", icon: "reports" },
      { to: "/accounting", label: "Accounting", icon: "accounting" },
      { to: "/audit", label: "Activity Log", icon: "activity" },
      { to: "/billing", label: "Plans & Billing", icon: "reports" },
    ],
  },
  manager: {
    sidebar: [
      { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { to: "/sales", label: "Sales", icon: "sales" },
      { to: "/customers", label: "Customers", icon: "customers" },
      { to: "/expenses", label: "Expenses", icon: "expenses" },
      { to: "/products", label: "Products", icon: "products" },
      { to: "/inventory", label: "Inventory", icon: "inventory" },
      { to: "/orders", label: "Online Orders", icon: "sales" },
    ],
    top: [
      { to: "/reports/sessions", label: "Cash & Deposits", icon: "cash" },
      { to: "/reports", label: "Reports", icon: "reports" },
      { to: "/accounting", label: "Accounting", icon: "accounting" },
    ],
  },
  cashier: {
    sidebar: [
      { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { to: "/sales", label: "Sales", icon: "sales" },
      { to: "/customers", label: "Customers", icon: "customers" },
      { to: "/expenses", label: "Expenses", icon: "expenses" },
      { to: "/orders", label: "Online Orders", icon: "sales" },
    ],
    top: [
      { to: "/reports/sales", label: "My Sales", icon: "reports" },
      { to: "/cashsessions", label: "Till History", icon: "cash" },
    ],
  },
};

export const NAV_ICONS = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  sales: (
    <>
      <path d="M4 17.5 9 12l3.5 3.5L20 7.5" />
      <path d="M14.5 7.5H20V13" />
    </>
  ),
  expenses: (
    <>
      <path d="M6 3.5h9l3 3v14H6z" />
      <path d="M14.5 3.5v4h4M9 12h6M9 16h6" />
    </>
  ),
  products: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="m4.3 7.7 7.7 4.4 7.7-4.4M12 12v9" />
    </>
  ),
  inventory: (
    <>
      <path d="M4 5.5h16M4 12h16M4 18.5h16" />
      <path d="M7 5.5h.01M7 12h.01M7 18.5h.01" />
    </>
  ),
  cash: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  staff: (
    <>
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4V20" />
      <circle cx="10" cy="7.5" r="3.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 6.8M20 20v-1.5a4 4 0 0 0-3-3.9" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20v-1.6a5.5 5.5 0 0 1 11 0V20z" />
      <path d="M16 5.2a3.1 3.1 0 0 1 0 5.8M18 14a4.8 4.8 0 0 1 2.5 4.2V20" />
    </>
  ),
  reports: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  accounting: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h5M8 17h8" />
    </>
  ),
  activity: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 1.8" />
    </>
  ),
};
