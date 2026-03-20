import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout";
import PendingTutors from "./components/PendingTutors";
import AllTutors from "./components/AllTutors";
import Sessions from "./components/Sessions";
import Payments from "./components/Payments";
import Reports from "./components/Reports";
import NotFound from "./pages/NotFound";

const AdminRoutes = () => {
  const token = localStorage.getItem("adminToken");
  if (!token) return <Navigate to="/login" />;

  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<PendingTutors />} />
        <Route path="tutors" element={<AllTutors />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="payments" element={<Payments />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AdminRoutes;