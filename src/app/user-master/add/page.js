"use client";

import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import UserForm from "../components/UserForm";
import userService from "@/services/userMasterService";
import roleService from "@/services/roleMasterService";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AddUserPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    roleService
      .listRoleMasters()
      .then((res) => {
        const data = res?.data || res?.result?.data || res?.rows || [];
        setRoles(data);
      })
      .catch(() => setRoles([]));
  }, []);

  const handleSubmit = async (payload) => {
    setLoading(true);
    try {
      await userService.createUserMaster(payload);
      router.push("/user-master");
    } catch (err) {
      setServerError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add New User" listHref="/user-master" listLabel="User Master">
        <UserForm
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
