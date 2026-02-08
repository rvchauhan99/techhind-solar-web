"use client";

import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import UserForm from "../components/UserForm";
import userService from "@/services/userMasterService";
import roleService from "@/services/roleMasterService";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoadingState() {
  return (
    <AddEditPageShell title="Edit User" listHref="/user-master" listLabel="User Master">
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader />
      </div>
    </AddEditPageShell>
  );
}

function EditUserContent() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(null);
  const [defaultValues, setDefaultValues] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  useEffect(() => {
    roleService
      .listRoleMasters()
      .then((res) => {
        const data = res?.data || res?.result?.data || res?.rows || [];
        setRoles(data);
      })
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    userService
      .getUserMaster(id)
      .then((res) => {
        const payload = res?.data || res?.result || res;
        setDefaultValues(payload);
      })
      .catch((err) =>
        setServerError(err.response?.data?.message || err.message)
      )
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (payload) => {
    setLoading(true);
    try {
      await userService.updateUserMaster(id, payload);
      router.push("/user-master");
    } catch (err) {
      setServerError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Edit User" listHref="/user-master" listLabel="User Master">
        <UserForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          loading={loading}
          roles={roles}
          serverError={serverError}
          onClearServerError={() => setServerError(null)}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}

export default function EditUserPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingState />}>
        <EditUserContent />
      </Suspense>
    </ProtectedRoute>
  );
}
