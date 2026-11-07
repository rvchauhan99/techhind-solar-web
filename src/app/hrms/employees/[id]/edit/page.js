"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import * as hrmsService from "@/services/hrmsService";
import roleService from "@/services/roleMasterService";
import { listBranches } from "@/services/companyService";

export default function HrmsEmployeeEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      hrmsService.getEmployee(id),
      hrmsService.listDepartments({ limit: 100, status: "active" }),
      roleService.listRoleMasters({ page: 1, limit: 200 }),
      listBranches(),
    ])
      .then(([empRes, deptRes, roleRes, branchRes]) => {
        const emp = empRes?.result ?? empRes?.data ?? empRes;
        const depts = deptRes?.result?.data || deptRes?.data?.data || [];
        setDepartments(depts);
        const rolePayload = roleRes?.result ?? roleRes?.data ?? roleRes;
        setRoles(rolePayload?.data || rolePayload?.rows || []);
        const bPayload = branchRes?.result ?? branchRes?.data ?? branchRes;
        setBranches(bPayload?.data || (Array.isArray(bPayload) ? bPayload : []));
        const branchIds =
          emp?.user?.branch_ids ||
          (emp?.user?.branches || []).map((b) => b.id || b.branch_id).filter(Boolean) ||
          [];
        setForm({
          emp_code: emp.emp_code || "",
          name: emp.user?.name || "",
          email: emp.user?.email || "",
          mobile_number: emp.user?.mobile_number || "",
          role_id: emp.user?.role_id ? String(emp.user.role_id) : "",
          branch_ids: branchIds.map(Number),
          department_id: emp.department_id ? String(emp.department_id) : "",
          designation_id: emp.designation_id ? String(emp.designation_id) : "",
          joining_date: emp.joining_date || "",
          gender: emp.gender || "",
          personal_email: emp.personal_email || "",
          personal_mobile: emp.personal_mobile || "",
          bank_name: emp.bank_name || "",
          ac_holder_name: emp.ac_holder_name || "",
          ac_number: emp.ac_number || "",
          ifsc_code: emp.ifsc_code || "",
          aadhar_no: emp.aadhar_no || "",
          pan_no: emp.pan_no || "",
          emergency_name: emp.emergency_name || "",
          emergency_mobile: emp.emergency_mobile || "",
          emergency_relation: emp.emergency_relation || "",
          notes: emp.notes || "",
          has_user: Boolean(emp.user_id),
        });
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Failed to load");
        router.push("/hrms/employees");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    if (!form?.department_id) {
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
  }, [form?.department_id]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleBranch = (bid) => {
    const n = Number(bid);
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
    setSaving(true);
    try {
      const payload = {
        emp_code: form.emp_code.trim(),
        department_id: form.department_id || null,
        designation_id: form.designation_id || null,
        joining_date: form.joining_date || null,
        gender: form.gender || null,
        personal_email: form.personal_email || null,
        personal_mobile: form.personal_mobile || null,
        bank_name: form.bank_name || null,
        ac_holder_name: form.ac_holder_name || null,
        ac_number: form.ac_number || null,
        ifsc_code: form.ifsc_code || null,
        aadhar_no: form.aadhar_no || null,
        pan_no: form.pan_no || null,
        emergency_name: form.emergency_name || null,
        emergency_mobile: form.emergency_mobile || null,
        emergency_relation: form.emergency_relation || null,
        notes: form.notes || null,
      };
      if (form.has_user) {
        payload.name = form.name;
        payload.email = form.email;
        payload.mobile_number = form.mobile_number;
        payload.role_id = form.role_id || null;
        payload.branch_ids = form.branch_ids;
      }
      await hrmsService.updateEmployee(id, payload);
      toast.success("Employee updated");
      router.push(`/hrms/employees/${id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <ProtectedRoute>
        <div className="p-3 text-sm text-muted-foreground">Loading…</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-3 max-w-3xl space-y-3">
        <h1 className="text-lg font-semibold">Edit Employee</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Emp Code *</Label>
              <Input value={form.emp_code} onChange={(e) => setField("emp_code", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Joining date</Label>
              <Input type="date" value={form.joining_date} onChange={(e) => setField("joining_date", e.target.value)} />
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
          </div>

          {form.has_user && (
            <div className="rounded-md border border-border p-3 space-y-3">
              <p className="text-sm font-medium">Linked User</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setField("name", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Work email</Label>
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
                    <option value="">—</option>
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
              <Label>Bank name</Label>
              <Input value={form.bank_name} onChange={(e) => setField("bank_name", e.target.value)} />
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
            <Button type="button" size="sm" variant="outline" onClick={() => router.push(`/hrms/employees/${id}`)}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
