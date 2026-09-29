"use client";

import { useRouter } from "next/navigation";
import { useListReturnNavigation } from "@/hooks/useListReturnNavigation";
import { useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import RoleForm from "../components/RoleForm";
import roleService from "@/services/roleMasterService";

export default function RoleAddPage() {
  const router = useRouter();
  const { goToList } = useListReturnNavigation("/role-master");
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (data) => {
    try {
      await roleService.createRoleMaster(data);
      goToList();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to create role";
      setServerError(msg);
    }
  };

  const clearServerError = () => setServerError(null);

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add New Role" listHref="/role-master" listLabel="Role Master">
        <RoleForm
          onSubmit={handleSubmit}
          defaultValues={{}}
          loading={false}
          serverError={serverError}
          onClearServerError={clearServerError}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
