"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListView from "./ListView";

export default function OrderPage() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <ListView
        title="Pending Orders"
        defaultStatus="pending"
        exportButtonLabel="Export"
        showHomeButton
        onHomeClick={() => router.push("/home")}
      />
    </ProtectedRoute>
  );
}
