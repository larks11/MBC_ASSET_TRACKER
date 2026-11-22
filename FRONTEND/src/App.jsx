import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import MyAccount from "./pages/MyAccount.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Assets from "./pages/Assets.jsx";
import Consumables from "./pages/Consumables.jsx";
import Employees from "./pages/Employees.jsx";
import TransactionPage from "./pages/TransactionPage.jsx";
import Repairs from "./pages/Repairs.jsx";
import ServiceRequests from "./pages/ServiceRequests.jsx";
import ReportsLayout from "./pages/reports/ReportsLayout.jsx";
import ReportView from "./pages/reports/ReportView.jsx";
import Maintenance from "./pages/Maintenance.jsx";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* PUBLIC */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* PRIVATE: kinahanglan naka-login */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="account" element={<MyAccount />} />

            {/* ADMIN ONLY */}
            <Route element={<AdminRoute />}>
              <Route path="admin" element={<AdminDashboard />} />
            </Route>

            <Route path="assets" element={<Assets />} />
            <Route path="assets/consumable" element={<Consumables />} />
            <Route path="transactions/deploy" element={<TransactionPage key="deploy" mode="deploy" />} />
            <Route path="transactions/repair" element={<Repairs />} />
            <Route path="transactions/return" element={<TransactionPage key="return" mode="return" />} />
            <Route path="transactions/disposal" element={<TransactionPage key="disposal" mode="disposal" />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="reports" element={<ReportsLayout />}>
              <Route index element={<Navigate to="masterlist" replace />} />
              <Route path=":reportId" element={<ReportView />} />
            </Route>
            <Route path="employees" element={<Employees />} />
            <Route path="service-requests" element={<ServiceRequests />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}