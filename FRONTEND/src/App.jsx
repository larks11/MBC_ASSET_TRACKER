import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Assets from "./pages/Assets.jsx";
import Employees from "./pages/Employees.jsx";
import TransactionPage from "./pages/TransactionPage.jsx";
import Repairs from "./pages/Repairs.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import ReportsLayout from "./pages/reports/ReportsLayout.jsx";
import ReportView from "./pages/reports/ReportView.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="assets" element={<Assets />} />
        <Route path="assets/consumable" element={<ComingSoon title="Consumable assets" description="Available stocks, added items, requests, and pull-out logs." />} />
        <Route path="transactions/deploy" element={<TransactionPage key="deploy" mode="deploy" />} />
        <Route path="transactions/repair" element={<Repairs />} />
        <Route path="transactions/return" element={<TransactionPage key="return" mode="return" />} />
        <Route path="transactions/disposal" element={<TransactionPage key="disposal" mode="disposal" />} />
        <Route path="maintenance" element={<ComingSoon title="Preventive maintenance" description="Checklists, CCTV monitoring, and server room logs." />} />
        <Route path="reports" element={<ReportsLayout />}>
          <Route index element={<Navigate to="masterlist" replace />} />
          <Route path=":reportId" element={<ReportView />} />
        </Route>
        <Route path="employees" element={<Employees />} />
        <Route path="service-requests" element={<ComingSoon title="Service requests" description="IT Service Request Forms (MBC-SP-ICT-03F1)." />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
