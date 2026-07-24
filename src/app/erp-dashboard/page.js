"use client";

import ProtectedRoute from "@/components/common/ProtectedRoute";
import { DashboardPageContent } from "./DashboardPageContent";

export default function ERPDashboardPage() {
    return (
        <ProtectedRoute>
            <DashboardPageContent dashboardApiBase="/home" />
        </ProtectedRoute>
    );
}
