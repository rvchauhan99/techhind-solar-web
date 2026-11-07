"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsDesignationAddPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("active");
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await hrmsService.listDepartments({ limit: 100, status: "active" });
        const payload = res?.result ?? res?.data ?? res;
        setDepartments(payload?.data || []);
      } catch {
        setDepartments([]);
      }
    })();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!departmentId) {
      toast.error("Department is required");
      return;
    }
    setSaving(true);
    try {
      await hrmsService.createDesignation({
        title: title.trim(),
        department_id: Number(departmentId),
        status,
      });
      toast.success("Designation created");
      router.push("/hrms/designations");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-3 max-w-lg space-y-3">
        <h1 className="text-lg font-semibold">Add Designation</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Department *</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
