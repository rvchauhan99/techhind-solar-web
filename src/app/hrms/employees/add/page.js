"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
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
        toast.error("Name and company login email are required for Active");
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
      <AddEditPageShell title="Add Employee" listHref="/hrms/employees" listLabel="Employees">
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <FormContainer>
            <FormSection title="Employment">
              <FormGrid cols={2}>
                <FormField>
                  <Input
                    label="Emp Code *"
                    name="emp_code"
                    value={form.emp_code}
                    onChange={(e) => setField("emp_code", e.target.value)}
                    required
                  />
                </FormField>
                <FormField>
                  <Select
                    label="Create as"
                    name="status"
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                  >
                    <MenuItem value="pending">Pending (no login)</MenuItem>
                    <MenuItem value="active">Active (provision User)</MenuItem>
                  </Select>
                </FormField>
                <FormField>
                  <Select
                    label="Department"
                    name="department_id"
                    value={form.department_id || "none"}
                    onChange={(e) => setField("department_id", e.target.value === "none" ? "" : e.target.value)}
                  >
                    <MenuItem value="none">—</MenuItem>
                    {departments.map((d) => (
                      <MenuItem key={d.id} value={String(d.id)}>
                        {d.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
                <FormField>
                  <Select
                    label="Designation"
                    name="designation_id"
                    value={form.designation_id || "none"}
                    onChange={(e) => setField("designation_id", e.target.value === "none" ? "" : e.target.value)}
                  >
                    <MenuItem value="none">—</MenuItem>
                    {designations.map((d) => (
                      <MenuItem key={d.id} value={String(d.id)}>
                        {d.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
                <FormField>
                  <DateField
                    label="Joining date"
                    name="joining_date"
                    value={form.joining_date}
                    onChange={(e) => setField("joining_date", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Gender"
                    name="gender"
                    value={form.gender}
                    onChange={(e) => setField("gender", e.target.value)}
                  />
                </FormField>
              </FormGrid>
            </FormSection>

            {form.status === "active" && (
              <FormSection title="Company login (Active)">
                <p className="text-xs text-muted-foreground mb-2">
                  Company login email is used for CRM sign-in — not personal email.
                </p>
                <FormGrid cols={2}>
                  <FormField>
                    <Input
                      label="Name *"
                      name="name"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                    />
                  </FormField>
                  <FormField>
                    <Input
                      label="Company login email *"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                    />
                  </FormField>
                  <FormField>
                    <Input
                      label="Work mobile"
                      name="mobile_number"
                      value={form.mobile_number}
                      onChange={(e) => setField("mobile_number", e.target.value)}
                    />
                  </FormField>
                  <FormField>
                    <Select
                      label="Role"
                      name="role_id"
                      value={form.role_id || "none"}
                      onChange={(e) => setField("role_id", e.target.value === "none" ? "" : e.target.value)}
                    >
                      <MenuItem value="none">Default User</MenuItem>
                      {roles.map((r) => (
                        <MenuItem key={r.id} value={String(r.id)}>
                          {r.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormField>
                  <FormField className="sm:col-span-2">
                    <span className="text-sm font-medium">Branches</span>
                    <div className="mt-1 flex flex-wrap gap-2">
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
                  </FormField>
                </FormGrid>
              </FormSection>
            )}

            <FormSection title="Personal & bank">
              <FormGrid cols={2}>
                <FormField>
                  <Input
                    label="Personal email (not for login)"
                    name="personal_email"
                    value={form.personal_email}
                    onChange={(e) => setField("personal_email", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Personal mobile"
                    name="personal_mobile"
                    value={form.personal_mobile}
                    onChange={(e) => setField("personal_mobile", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Bank name"
                    name="bank_name"
                    value={form.bank_name}
                    onChange={(e) => setField("bank_name", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="A/C holder"
                    name="ac_holder_name"
                    value={form.ac_holder_name}
                    onChange={(e) => setField("ac_holder_name", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="A/C number"
                    name="ac_number"
                    value={form.ac_number}
                    onChange={(e) => setField("ac_number", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="IFSC"
                    name="ifsc_code"
                    value={form.ifsc_code}
                    onChange={(e) => setField("ifsc_code", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Aadhar"
                    name="aadhar_no"
                    value={form.aadhar_no}
                    onChange={(e) => setField("aadhar_no", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="PAN"
                    name="pan_no"
                    value={form.pan_no}
                    onChange={(e) => setField("pan_no", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Emergency name"
                    name="emergency_name"
                    value={form.emergency_name}
                    onChange={(e) => setField("emergency_name", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Emergency mobile"
                    name="emergency_mobile"
                    value={form.emergency_mobile}
                    onChange={(e) => setField("emergency_mobile", e.target.value)}
                  />
                </FormField>
                <FormField className="sm:col-span-2">
                  <Input
                    label="Notes"
                    name="notes"
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                  />
                </FormField>
              </FormGrid>
            </FormSection>

            <FormActions>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </FormActions>
          </FormContainer>
        </form>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
