"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import RoleForm from "../components/RoleForm";
import roleService from "@/services/roleMasterService";

function LoadingState() {
  return (
    <AddEditPageShell title="Edit Role" listHref="/role-master" listLabel="Role Master">
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader />
      </div>
    </AddEditPageShell>
  );
}

function RoleEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [role, setRole] = useState(null);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await roleService.getRoleMaster(id);
        setRole(res.result || res.data || res);
      } catch (err) {
        // Error handled silently
      }
    })();
  }, [id]);

  const handleSubmit = async (data) => {
    try {
      await roleService.updateRoleMaster(id, data);
      router.push("/role-master");
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to update role";
      setServerError(msg);
    }
  };

  const clearServerError = () => setServerError(null);

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Edit Role" listHref="/role-master" listLabel="Role Master">
        {role ? (
          <RoleForm
            defaultValues={role}
            onSubmit={handleSubmit}
            loading={false}
            serverError={serverError}
            onClearServerError={clearServerError}
          />
        ) : (
          <div className="flex justify-center items-center min-h-[50vh]">
            <Loader />
          </div>
        )}
      </AddEditPageShell>
    </ProtectedRoute>
  );
}

export default function RoleEditPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingState />}>
        <RoleEditContent />
      </Suspense>
    </ProtectedRoute>
  );
}
