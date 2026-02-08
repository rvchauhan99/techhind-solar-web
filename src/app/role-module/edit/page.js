"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import RoleModuleForm from "../components/RoleModuleForm";
import roleModuleService from "@/services/roleModuleService";
import roleService from "@/services/roleMasterService";
import moduleService from "@/services/moduleMasterService";

function LoadingState() {
  return (
    <AddEditPageShell title="Edit Role-Module Link" listHref="/role-module" listLabel="Role Module">
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader />
      </div>
    </AddEditPageShell>
  );
}

function RoleModuleEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [item, setItem] = useState(null);
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await roleModuleService.getRoleModule(id);
        setItem(res.result || res.data || res);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [id]);

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
      await roleModuleService.updateRoleModule(id, data);
      router.push("/role-module");
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to update link";
      setServerError(msg);
    }
  };

  const clearServerError = () => setServerError(null);

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Edit Role-Module Link" listHref="/role-module" listLabel="Role Module">
        {item ? (
          <RoleModuleForm
            defaultValues={item}
            roles={roles}
            modules={modules}
            onSubmit={handleSubmit}
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

export default function RoleModuleEditPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingState />}>
        <RoleModuleEditContent />
      </Suspense>
    </ProtectedRoute>
  );
}
