"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import RoleModuleForm from "../components/RoleModuleForm";
import roleModuleService from "@/services/roleModuleService";
import roleService from "@/services/roleMasterService";
import moduleService from "@/services/moduleMasterService";

export default function RoleModuleAddPage() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await roleService.listRoleMasters({ page: 1, limit: 500 });
        const m = await moduleService.listModuleMasters({
          page: 1,
          limit: 500,
        });
        const rRows = r.result?.data || r.data || r;
        const mRows = m.result?.data || m.data || m;
        setRoles(Array.isArray(rRows) ? rRows : rRows.data || []);
        setModules(Array.isArray(mRows) ? mRows : mRows.data || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const handleSubmit = async (data) => {
    try {
      await roleModuleService.createRoleModule(data);
      router.push("/role-module");
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to create link";
      setServerError(msg);
    }
  };

  const clearServerError = () => setServerError(null);

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add New Role-Module Link" listHref="/role-module" listLabel="Role Module">
        <RoleModuleForm
          roles={roles}
          modules={modules}
          onSubmit={handleSubmit}
          serverError={serverError}
          onClearServerError={clearServerError}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
