import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout/Layout";
import Landing from "./pages/Landing/Landing";
import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import Dashboard from "./pages/Dashboard/Dashboard";
import Sales from "./pages/Sales/Sales";
import Products from "./pages/Products/Products";
import Inventory from "./pages/Inventory/Inventory";
import Staff from "./pages/Staff/Staff";
import SalesHistory from "./pages/SalesHistory/SalesHistory";
import CashSessions from "./pages/CashSessions/CashSessions";
import ActivityLog from "./pages/ActivityLog/ActivityLog";
import Reports from "./pages/Reports/Reports"; 
import {ToastProvider} from "./context/ToastContext";
import Profile from "./pages/Profile/Profile";
import CashierDashboard from "./pages/Dashboard/CashierDashboard";
import Expenses from "./pages/Expenses/Expenses";
import "./App.css";

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Layout>{children}</Layout>;
}

function RoleDashboard() {
  const { user } = useAuth();
  return user?.role === "cashier" ? <CashierDashboard /> : <Dashboard />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin", "manager", "cashier"]}>
            <RoleDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales"
        element={
          <ProtectedRoute allowedRoles={["admin", "manager", "cashier"]}>
            <Sales />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute allowedRoles={["admin", "manager", "cashier"]}>
            <Expenses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute allowedRoles={["admin", "manager"]}>
            <Products />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute allowedRoles={["admin", "manager"]}>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Staff />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/sales"
        element={
          <ProtectedRoute allowedRoles={["admin", "manager", "cashier"]}>
            <SalesHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cashsessions"
        element={
          <ProtectedRoute allowedRoles={["admin", "manager", "cashier"]}>
            <CashSessions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/sessions"
        element={
          <ProtectedRoute allowedRoles={["admin", "manager", "cashier"]}>
            <CashSessions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={["admin", "manager"]}>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute allowedRoles={["admin", "manager"]}>
            <ActivityLog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;