"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import * as hrmsService from "@/services/hrmsService";
import roleService from "@/services/roleMasterService";
import { listBranches } from "@/services/companyService";
import { useAuth } from "@/hooks/useAuth";

export default function HrmsEmployeeAddPage() {
  const router = useRouter();
  const { isSuperAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({
    emp_code: "",
    status: "pending",
    name: "",
    email: "",
    mobile_number: "",
    role_id: "",
    branch_ids: [],
    department_id: "",
    designation_id: "",
    joining_date: "",
    gender: "",
    personal_email: "",
    personal_mobile: "",
    bank_name: "",
    ac_holder_name: "",
    ac_number: "",
    ifsc_code: "",
    aadhar_no: "",
    pan_no: "",
    emergency_name: "",
    emergency_mobile: "",
    emergency_relation: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      hrmsService.listDepartments({ limit: 100, status: "active" }),
      roleService.listRoleMasters({ page: 1, limit: 200 }),
      listBranches(),
    ])
      .then(([deptRes, roleRes, branchRes]) => {
        const depts = deptRes?.result?.data || deptRes?.data?.data || deptRes?.result || [];
        setDepartments(Array.isArray(depts) ? depts : depts?.data || []);
        const rolePayload = roleRes?.result ?? roleRes?.data ?? roleRes;
        const roleRows = rolePayload?.data || rolePayload?.rows || (Array.isArray(rolePayload) ? rolePayload : []);
        setRoles(roleRows);
        const defaultRole =
          roleRows.find((r) => String(r.name || "").toLowerCase() === "user") ||
          roleRows.find((r) => String(r.name || "").toLowerCase() === "employee");
        if (defaultRole) {
          setForm((f) => ({ ...f, role_id: String(defaultRole.id) }));
        }
        const bPayload = branchRes?.result ?? branchRes?.data ?? branchRes;
        const bRows = bPayload?.data || (Array.isArray(bPayload) ? bPayload : []);
        setBranches(bRows);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.department_id) {
      setDesignations([]);
      return;
    }
    hrmsService
      .listDesignations({ department_id: form.department_id, limit: 100, status: "active" })
      .then((res) => {
        const payload = res?.result ?? res?.data ?? res;
        setDesignations(payload?.data || []);
      })
      .catch(() => setDesignations([]));
  }, [form.department_id]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleBranch = (id) => {
    const n = Number(id);
    setForm((f) => {
      const set = new Set((f.branch_ids || []).map(Number));
      if (set.has(n)) set.delete(n);
      else set.add(n);
      return { ...f, branch_ids: [...set] };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.emp_code.trim()) {
      toast.error("Emp code is required");
      return;
    }
    if (form.status === "active") {
      if (!form.name.trim() || !form.email.trim()) {
        toast.error("Name and work email are required for Active");
        return;
      }
      if (!isSuperAdmin && (!form.branch_ids || form.branch_ids.length === 0) && branches.length > 0) {
        toast.error("Select at least one branch");
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        emp_code: form.emp_code.trim(),
        department_id: form.department_id || null,
        designation_id: form.designation_id || null,
        role_id: form.role_id || null,
        branch_ids: form.branch_ids,
        joining_date: form.joining_date || null,
      };
      const res = await hrmsService.createEmployee(payload);
      const created = res?.result ?? res?.data ?? res;
      toast.success("Employee created");
      router.push(`/hrms/employees/${created?.id || ""}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-3 max-w-3xl space-y-3">
        <h1 className="text-lg font-semibold">Add Employee</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Emp Code *</Label>
              <Input value={form.emp_code} onChange={(e) => setField("emp_code", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Create as</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
              >
                <option value="pending">Pending (no login)</option>
                <option value="active">Active (provision User)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.department_id}
                onChange={(e) => setField("department_id", e.target.value)}
              >
                <option value="">—</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Designation</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.designation_id}
                onChange={(e) => setField("designation_id", e.target.value)}
              >
                <option value="">—</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Joining date</Label>
              <Input type="date" value={form.joining_date} onChange={(e) => setField("joining_date", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Gender</Label>
              <Input value={form.gender} onChange={(e) => setField("gender", e.target.value)} />
            </div>
          </div>

          {form.status === "active" && (
            <div className="rounded-md border border-border p-3 space-y-3">
              <p className="text-sm font-medium">User login (Active)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setField("name", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Work email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Mobile</Label>
                  <Input value={form.mobile_number} onChange={(e) => setField("mobile_number", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={form.role_id}
                    onChange={(e) => setField("role_id", e.target.value)}
                  >
                    <option value="">Default User</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Branches</Label>
                <div className="flex flex-wrap gap-2">
                  {branches.map((b) => (
                    <label key={b.id} className="flex items-center gap-1 text-sm border rounded px-2 py-1">
                      <input
                        type="checkbox"
                        checked={form.branch_ids.map(Number).includes(Number(b.id))}
                        onChange={() => toggleBranch(b.id)}
                      />
                      {b.name || b.branch_name || `Branch ${b.id}`}
                    </label>
                  ))}
                  {!branches.length && <span className="text-xs text-muted-foreground">No branches</span>}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Personal email</Label>
              <Input value={form.personal_email} onChange={(e) => setField("personal_email", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Personal mobile</Label>
              <Input value={form.personal_mobile} onChange={(e) => setField("personal_mobile", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Bank name</Label>
              <Input value={form.bank_name} onChange={(e) => setField("bank_name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>A/C holder</Label>
              <Input value={form.ac_holder_name} onChange={(e) => setField("ac_holder_name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>A/C number</Label>
              <Input value={form.ac_number} onChange={(e) => setField("ac_number", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>IFSC</Label>
              <Input value={form.ifsc_code} onChange={(e) => setField("ifsc_code", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Aadhar</Label>
              <Input value={form.aadhar_no} onChange={(e) => setField("aadhar_no", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>PAN</Label>
              <Input value={form.pan_no} onChange={(e) => setField("pan_no", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Emergency name</Label>
              <Input value={form.emergency_name} onChange={(e) => setField("emergency_name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Emergency mobile</Label>
              <Input value={form.emergency_mobile} onChange={(e) => setField("emergency_mobile", e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
            </div>
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
