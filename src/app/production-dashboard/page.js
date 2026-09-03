"use client";

import { Suspense } from "react";
import Loader from "@/components/common/Loader";
import ProductionDashboardPageContent from "./ProductionDashboardPageContent";

export default function ProductionDashboardPage() {
  return (
    <Suspense fallback={<Loader />}>
      <ProductionDashboardPageContent />
    </Suspense>
  );
}
