"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import ModuleForm from "../components/ModuleForm";
import moduleService from "@/services/moduleMasterService";

export default function ModuleAddPage() {
  const router = useRouter();
  const [parentOptions, setParentOptions] = useState([]);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await moduleService.listModuleMasters({
          page: 1,
          limit: 500,
        });
        const body = res.result || res.data || res;
        // body may be { data: rows, meta } or an array
        const rows = body.data || body.result || body || [];
        const parents = (Array.isArray(rows) ? rows : rows.data || []).filter(
          (m) => m.parent_id === null || m.parent_id === undefined
        );
        setParentOptions(parents);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const handleSubmit = async (data) => {
    try {
      await moduleService.createModuleMaster(data);
      router.push("/module-master");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create module";
      setServerError(msg);
    }
  };

  const clearServerError = () => setServerError(null);

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add New Module" listHref="/module-master" listLabel="Module Master">
        <ModuleForm
          onSubmit={handleSubmit}
          defaultValues={{}}
          loading={false}
          parentOptions={parentOptions}
          serverError={serverError}
          onClearServerError={clearServerError}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
