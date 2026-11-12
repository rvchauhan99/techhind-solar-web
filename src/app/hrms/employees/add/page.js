"use client";

import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import EmployeeForm from "../components/EmployeeForm";

export default function HrmsEmployeeAddPage() {
  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add Employee" listHref="/hrms/employees" listLabel="Employees">
        <EmployeeForm mode="add" />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
