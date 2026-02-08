"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import ModuleForm from "../components/ModuleForm";
import moduleService from "@/services/moduleMasterService";

function LoadingState() {
  return (
    <AddEditPageShell title="Edit Module" listHref="/module-master" listLabel="Module Master">
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader />
      </div>
    </AddEditPageShell>
  );
}

function ModuleEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [module, setModule] = useState(null);
  const [parentOptions, setParentOptions] = useState([]);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await moduleService.getModuleMaster(id);
        setModule(res.result || res.data || res);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await moduleService.listModuleMasters({
          page: 1,
          limit: 500,
        });
        const body = res.result || res.data || res;
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
      await moduleService.updateModuleMaster(id, data);
      router.push("/module-master");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update module";
      setServerError(msg);
    }
  };

  const clearServerError = () => setServerError(null);

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Edit Module" listHref="/module-master" listLabel="Module Master">
        {module ? (
          <ModuleForm
            defaultValues={module}
            onSubmit={handleSubmit}
            loading={false}
            parentOptions={parentOptions}
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

export default function ModuleEditPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingState />}>
        <ModuleEditContent />
      </Suspense>
    </ProtectedRoute>
  );
}
