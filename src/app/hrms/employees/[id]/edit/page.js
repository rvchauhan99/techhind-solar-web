"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
      <AddEditPageShell title="Edit Employee" listHref="/hrms/employees" listLabel="Employees">
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
                  <DateField
                    label="Joining date"
                    name="joining_date"
                    value={form.joining_date}
                    onChange={(e) => setField("joining_date", e.target.value)}
                  />
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
                  <Input
                    label="Gender"
                    name="gender"
                    value={form.gender}
                    onChange={(e) => setField("gender", e.target.value)}
                  />
                </FormField>
              </FormGrid>
            </FormSection>

            {form.has_user && (
              <FormSection title="Company login (linked User)">
                <p className="text-xs text-muted-foreground mb-2">
                  Company login email is used for CRM sign-in — not personal email.
                </p>
                <FormGrid cols={2}>
                  <FormField>
                    <Input
                      label="Name"
                      name="name"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                    />
                  </FormField>
                  <FormField>
                    <Input
                      label="Company login email"
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
                      <MenuItem value="none">—</MenuItem>
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.push(`/hrms/employees/${id}`)}
              >
                Cancel
              </Button>
            </FormActions>
          </FormContainer>
        </form>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
