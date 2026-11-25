"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormSectionNav from "@/components/common/FormSectionNav";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import Checkbox from "@/components/common/Checkbox";
import AutocompleteField from "@/components/common/AutocompleteField";
import {
  IconUserCircle,
  IconSitemap,
  IconBriefcase,
  IconUserHeart,
  IconId,
  IconBuildingBank,
  IconPhoneCall,
  IconSchool,
  IconNotes,
  IconMapPin,
} from "@tabler/icons-react";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import {
  getReferenceOptionsSearch,
  getReferenceOptionById,
} from "@/services/mastersService";
import { unwrap } from "@/lib/apiUnwrap";

const SECTION_NAV = [
  { id: "emp-identity", label: "Identity & login" },
  { id: "emp-org", label: "Organisation" },
  { id: "emp-employment", label: "Employment" },
  { id: "emp-personal", label: "Personal" },
  { id: "emp-location", label: "Location" },
  { id: "emp-statutory", label: "Statutory" },
  { id: "emp-bank", label: "Bank" },
  { id: "emp-emergency", label: "Emergency" },
  { id: "emp-notes", label: "Notes" },
];

const EMPTY = {
  emp_code: "", status: "pending", employee_type: "1", name: "", email: "", mobile_number: "",
  password: "", role_id: "", branch_ids: [], department_id: "", designation_id: "", manager_employee_id: "",
  joining_date: "", designation_date: "", probation_months: "", probation_end_date: "", resignation_date: "",
  current_gross_salary: "", salary_effective_month: "", gender: "", personal_email: "", personal_mobile: "",
  brith_date: "", blood_group: "", address: "", state_id: "", city_id: "", profile_image: "", notes: "", college_name: "", college_course: "",
  intern_duration: "", stipend: "", uan_no: "", pf_no: "", esic: "", employee_esic: "", sc_applicable: false,
  aadhar_no: "", name_as_per_aadhar: "", pan_no: "", bank_name: "", ac_holder_name: "", ac_number: "",
  ifsc_code: "", branch_name: "", rules_exemption: false, emergency_name: "", emergency_mobile: "", emergency_relation: "",
};

const toNum = (v) => (v === "" || v == null ? null : Number(v));

export default function EmployeeForm({ mode = "add", employeeId = null, initial = null, hasUser = false }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}) });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [branchSelections, setBranchSelections] = useState([]);

  // Resolve branch chips for edit seed (multi Autocomplete skips resolveOptionById).
  useEffect(() => {
    const ids = (form.branch_ids || []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
    if (!ids.length) {
      setBranchSelections([]);
      return;
    }
    let cancelled = false;
    Promise.all(ids.map((id) => getReferenceOptionById("company_branch.model", id).catch(() => ({ id, label: `#${id}` }))))
      .then((rows) => {
        if (cancelled) return;
        setBranchSelections(
          rows
            .filter(Boolean)
            .map((r) => ({
              id: r.id,
              value: r.id,
              label: r.label || r.name || r.branch_name || `#${r.id}`,
              name: r.name || r.label || r.branch_name,
            }))
        );
      });
    return () => {
      cancelled = true;
    };
    // Only re-resolve when the id list identity changes from outside selection UX.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify((form.branch_ids || []).map(Number).sort())]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    const needUser = (mode === "add" && form.status === "active") || (mode === "edit" && hasUser);
    if (needUser) {
      if (!form.name.trim()) errs.name = "Name is required";
      if (!form.email.trim()) errs.email = "Login email is required";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
      employee_type: Number(form.employee_type) || 1,
      department_id: toNum(form.department_id),
      designation_id: toNum(form.designation_id),
      manager_employee_id: toNum(form.manager_employee_id),
      joining_date: form.joining_date || null,
      designation_date: form.designation_date || null,
      probation_months: toNum(form.probation_months),
      probation_end_date: form.probation_end_date || null,
      resignation_date: form.resignation_date || null,
      current_gross_salary: toNum(form.current_gross_salary),
      salary_effective_month: form.salary_effective_month || null,
      gender: form.gender || null,
      personal_email: form.personal_email || null,
      personal_mobile: form.personal_mobile || null,
      notes: form.notes || null,
      college_name: form.college_name || null,
      college_course: form.college_course || null,
      intern_duration: form.intern_duration || null,
      stipend: toNum(form.stipend),
      uan_no: form.uan_no || null,
      pf_no: form.pf_no || null,
      esic: form.esic || null,
      employee_esic: form.employee_esic || null,
      sc_applicable: !!form.sc_applicable,
      aadhar_no: form.aadhar_no || null,
      name_as_per_aadhar: form.name_as_per_aadhar || null,
      pan_no: form.pan_no || null,
      bank_name: form.bank_name || null,
      ac_holder_name: form.ac_holder_name || null,
      ac_number: form.ac_number || null,
      ifsc_code: form.ifsc_code || null,
      branch_name: form.branch_name || null,
      rules_exemption: !!form.rules_exemption,
      emergency_name: form.emergency_name || null,
      emergency_mobile: form.emergency_mobile || null,
      emergency_relation: form.emergency_relation || null,
      name: form.name.trim(),
      email: form.email.trim(),
      mobile_number: form.mobile_number || null,
      role_id: toNum(form.role_id),
      branch_ids: (form.branch_ids || []).map(Number),
      brith_date: form.brith_date || null,
      blood_group: form.blood_group || null,
      address: form.address || null,
      state_id: toNum(form.state_id),
      city_id: toNum(form.city_id),
    };
    if (mode === "add") {
      payload.status = form.status;
      if (form.password) payload.password = form.password;
    }

    setSaving(true);
    try {
      if (mode === "add") {
        const res = await hrmsService.createEmployee(payload);
        const created = unwrap(res);
        toastSuccess("Employee created");
        router.push(created?.id ? `/hrms/employees/${created.id}` : "/hrms/employees");
      } else {
        await hrmsService.updateEmployee(employeeId, payload);
        toastSuccess("Employee updated");
        router.push(`/hrms/employees/${employeeId}`);
      }
    } catch (err) {
      toastErrorFromApi(err, mode === "add" ? "Create failed" : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
      <FormContainer className="space-y-2">
        <FormSectionNav sections={SECTION_NAV} />
        <div className="space-y-2">
        <FormSection
          variant="card"
          id="emp-identity"
          step={1}
          icon={<IconUserCircle className="size-4" />}
          title="Identity & login"
          description="Employee code, name and the login this person uses"
        >
          <FormGrid cols={4}>
            <FormField>
              <Input
                label="Employee Code"
                name="emp_code"
                value={mode === "add" ? "" : form.emp_code}
                placeholder={mode === "add" ? "Assigned from Serial Master on save" : undefined}
                disabled
                readOnly
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {mode === "add"
                  ? "Generated from Serial Master (EMPLOYEE) when you save"
                  : "Assigned from Serial Master — not editable"}
              </p>
            </FormField>
            {mode === "add" && (
              <FormField>
                <Select label="Status" name="status" value={form.status} onChange={(e) => setField("status", e.target.value)}>
                  <MenuItem value="pending">Pending (no login)</MenuItem>
                  <MenuItem value="active">Active (create login)</MenuItem>
                </Select>
              </FormField>
            )}
            <FormField>
              <Select label="Employee Type" name="employee_type" value={form.employee_type} onChange={(e) => setField("employee_type", e.target.value)}>
                <MenuItem value="1">Full-time</MenuItem>
                <MenuItem value="2">Intern</MenuItem>
              </Select>
            </FormField>
            <FormField>
              <Input label="Full Name" name="name" value={form.name} onChange={(e) => setField("name", e.target.value)} error={!!errors.name} helperText={errors.name} required={mode === "add" && form.status === "active"} />
            </FormField>
            <FormField>
              <Input label="Login Email" name="email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} error={!!errors.email} helperText={errors.email} required={mode === "add" && form.status === "active"} />
            </FormField>
            <FormField>
              <Input label="Mobile Number" name="mobile_number" value={form.mobile_number} onChange={(e) => setField("mobile_number", e.target.value)} />
            </FormField>
            {mode === "add" && form.status === "active" && (
              <FormField>
                <Input label="Password (optional)" name="password" type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} helperText="Defaults to Admin@123 if blank" />
              </FormField>
            )}
            <FormField>
              <AutocompleteField
                label="Role"
                name="role_id"
                placeholder="Type to search… (default User role)"
                asyncLoadOptions={(q) => hrmsService.searchHrmsRoles(q)}
                resolveOptionById={(rid) => hrmsService.resolveHrmsRole(rid)}
                getOptionLabel={(o) => o?.label ?? o?.name ?? ""}
                value={form.role_id || null}
                onChange={(_e, opt) => setField("role_id", opt?.id != null ? String(opt.id) : "")}
              />
            </FormField>
            <FormField className="md:col-span-2 lg:col-span-4">
              <AutocompleteField
                label="Branches"
                name="branch_ids"
                multiple
                placeholder="Type to search branches…"
                asyncLoadOptions={(q) =>
                  getReferenceOptionsSearch("company_branch.model", { q, limit: 20 })
                }
                getOptionLabel={(b) => b?.label ?? b?.name ?? b?.branch_name ?? ""}
                value={branchSelections}
                onChange={(_e, opts) => {
                  const list = Array.isArray(opts) ? opts : [];
                  setBranchSelections(list);
                  setField(
                    "branch_ids",
                    list.map((b) => b?.id ?? b?.value).filter((id) => id != null && id !== "")
                  );
                }}
                helperText="The login can access these branches"
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          variant="card"
          id="emp-org"
          step={2}
          icon={<IconSitemap className="size-4" />}
          title="Organisation"
          description="Where this person sits and who approves their leave (L1)"
        >
          <FormGrid cols={4}>
            <FormField>
              <AutocompleteField
                label="Department"
                name="department_id"
                placeholder="Type to search…"
                asyncLoadOptions={(q) => hrmsService.searchHrmsDepartments(q)}
                resolveOptionById={(did) => hrmsService.resolveHrmsDepartment(did)}
                getOptionLabel={(o) => o?.label ?? o?.title ?? ""}
                value={form.department_id || null}
                onChange={(_e, opt) => {
                  setField("department_id", opt?.id != null ? String(opt.id) : "");
                  setField("designation_id", "");
                }}
              />
            </FormField>
            <FormField>
              <AutocompleteField
                label="Designation"
                name="designation_id"
                placeholder={form.department_id ? "Type to search…" : "Select department first"}
                asyncLoadOptions={(q) =>
                  hrmsService.searchHrmsDesignations(q, {
                    department_id: form.department_id || undefined,
                  })
                }
                resolveOptionById={(did) => hrmsService.resolveHrmsDesignation(did)}
                getOptionLabel={(o) => o?.label ?? o?.title ?? ""}
                value={form.designation_id || null}
                onChange={(_e, opt) => setField("designation_id", opt?.id != null ? String(opt.id) : "")}
                disabled={!form.department_id}
              />
            </FormField>
            <FormField>
              <AutocompleteField
                label="Reports To (manager)"
                placeholder="Type to search…"
                asyncLoadOptions={async (q) => {
                  const opts = await hrmsService.searchHrmsEmployees(q);
                  return (opts || []).filter((o) => String(o.id) !== String(employeeId));
                }}
                resolveOptionById={(eid) => hrmsService.resolveHrmsEmployee(eid)}
                getOptionLabel={(o) => o?.label ?? ""}
                value={form.manager_employee_id || null}
                onChange={(_e, opt) => setField("manager_employee_id", opt?.id != null ? String(opt.id) : "")}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The manager approves this employee&apos;s leave and attendance corrections (L1).
              </p>
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          variant="card"
          id="emp-employment"
          step={3}
          icon={<IconBriefcase className="size-4" />}
          title="Employment"
          description="Dates, probation and current salary"
        >
          <FormGrid cols={4}>
            <FormField><DateField label="Joining Date" name="joining_date" value={form.joining_date} onChange={(e) => setField("joining_date", e.target.value)} /></FormField>
            <FormField><DateField label="Designation Date" name="designation_date" value={form.designation_date} onChange={(e) => setField("designation_date", e.target.value)} /></FormField>
            <FormField><Input label="Probation (months)" name="probation_months" type="number" value={form.probation_months} onChange={(e) => setField("probation_months", e.target.value)} /></FormField>
            <FormField><DateField label="Probation End Date" name="probation_end_date" value={form.probation_end_date} onChange={(e) => setField("probation_end_date", e.target.value)} /></FormField>
            <FormField><DateField label="Resignation Date" name="resignation_date" value={form.resignation_date} onChange={(e) => setField("resignation_date", e.target.value)} /></FormField>
            <FormField><Input label="Current Gross Salary" name="current_gross_salary" type="number" value={form.current_gross_salary} onChange={(e) => setField("current_gross_salary", e.target.value)} /></FormField>
            <FormField><Input label="Salary Effective Month (YYYY-MM)" name="salary_effective_month" value={form.salary_effective_month} onChange={(e) => setField("salary_effective_month", e.target.value)} placeholder="2026-04" /></FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          variant="card"
          id="emp-personal"
          step={4}
          icon={<IconUserHeart className="size-4" />}
          title="Personal"
          description="Contact details and personal information"
        >
          <FormGrid cols={4}>
            <FormField>
              <Select label="Gender" name="gender" value={form.gender} onChange={(e) => setField("gender", e.target.value)} placeholder="Select">
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormField>
            <FormField><DateField label="Date of Birth" name="brith_date" value={form.brith_date} onChange={(e) => setField("brith_date", e.target.value)} /></FormField>
            <FormField><Input label="Blood Group" name="blood_group" value={form.blood_group} onChange={(e) => setField("blood_group", e.target.value)} /></FormField>
            <FormField><Input label="Personal Email" name="personal_email" type="email" value={form.personal_email} onChange={(e) => setField("personal_email", e.target.value)} /></FormField>
            <FormField><Input label="Personal Mobile" name="personal_mobile" value={form.personal_mobile} onChange={(e) => setField("personal_mobile", e.target.value)} /></FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          variant="card"
          id="emp-location"
          step={5}
          icon={<IconMapPin className="size-4" />}
          title="Location & address"
          description="State and city come from the masters so reports and payroll group correctly"
          collapsible
          defaultOpen
        >
          <FormGrid cols={4}>
            <FormField>
              <AutocompleteField
                label="State"
                name="state_id"
                placeholder="Type to search…"
                asyncLoadOptions={(q) =>
                  getReferenceOptionsSearch("state.model", { q, limit: 40 })
                }
                referenceModel="state.model"
                getOptionLabel={(o) => o?.label ?? o?.name ?? ""}
                value={form.state_id || null}
                onChange={(_e, opt) => {
                  setField("state_id", opt?.id != null ? String(opt.id) : "");
                  setField("city_id", "");
                }}
              />
            </FormField>
            <FormField>
              <AutocompleteField
                label="City"
                name="city_id"
                placeholder={form.state_id ? "Type to search…" : "Select state first"}
                asyncLoadOptions={(q) =>
                  getReferenceOptionsSearch("city.model", {
                    q,
                    limit: 20,
                    ...(form.state_id ? { state_id: form.state_id } : {}),
                  })
                }
                referenceModel="city.model"
                getOptionLabel={(o) => o?.label ?? o?.name ?? ""}
                value={form.city_id || null}
                onChange={(_e, opt) => setField("city_id", opt?.id != null ? String(opt.id) : "")}
                disabled={!form.state_id}
              />
            </FormField>
            <FormField className="md:col-span-2">
              <Input
                label="Address"
                name="address"
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          variant="card"
          id="emp-statutory"
          step={5}
          icon={<IconId className="size-4" />}
          title="Statutory & identity"
          description="PF, ESIC, Aadhaar and PAN — open only when you need to edit them"
          collapsible
          defaultOpen={false}
        >
          <FormGrid cols={4}>
            <FormField><Input label="UAN No" name="uan_no" value={form.uan_no} onChange={(e) => setField("uan_no", e.target.value)} /></FormField>
            <FormField><Input label="PF No" name="pf_no" value={form.pf_no} onChange={(e) => setField("pf_no", e.target.value)} /></FormField>
            <FormField><Input label="ESIC" name="esic" value={form.esic} onChange={(e) => setField("esic", e.target.value)} /></FormField>
            <FormField><Input label="Employee ESIC" name="employee_esic" value={form.employee_esic} onChange={(e) => setField("employee_esic", e.target.value)} /></FormField>
            <FormField><Input label="Aadhar No" name="aadhar_no" value={form.aadhar_no} onChange={(e) => setField("aadhar_no", e.target.value)} /></FormField>
            <FormField><Input label="Name as per Aadhar" name="name_as_per_aadhar" value={form.name_as_per_aadhar} onChange={(e) => setField("name_as_per_aadhar", e.target.value)} /></FormField>
            <FormField><Input label="PAN No" name="pan_no" value={form.pan_no} onChange={(e) => setField("pan_no", e.target.value)} /></FormField>
            <FormField><Checkbox name="sc_applicable" label="SC applicable" checked={!!form.sc_applicable} onChange={(e) => setField("sc_applicable", e.target.checked)} /></FormField>
            <FormField><Checkbox name="rules_exemption" label="Rules exemption (skip deductions)" checked={!!form.rules_exemption} onChange={(e) => setField("rules_exemption", e.target.checked)} /></FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          variant="card"
          id="emp-bank"
          step={6}
          icon={<IconBuildingBank className="size-4" />}
          title="Bank"
          description="Salary account details used for payouts"
          collapsible
          defaultOpen={false}
        >
          <FormGrid cols={4}>
            <FormField><Input label="Bank Name" name="bank_name" value={form.bank_name} onChange={(e) => setField("bank_name", e.target.value)} /></FormField>
            <FormField><Input label="A/C Holder Name" name="ac_holder_name" value={form.ac_holder_name} onChange={(e) => setField("ac_holder_name", e.target.value)} /></FormField>
            <FormField><Input label="A/C Number" name="ac_number" value={form.ac_number} onChange={(e) => setField("ac_number", e.target.value)} /></FormField>
            <FormField><Input label="IFSC Code" name="ifsc_code" value={form.ifsc_code} onChange={(e) => setField("ifsc_code", e.target.value)} /></FormField>
            <FormField><Input label="Branch Name" name="branch_name" value={form.branch_name} onChange={(e) => setField("branch_name", e.target.value)} /></FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          variant="card"
          id="emp-emergency"
          step={7}
          icon={<IconPhoneCall className="size-4" />}
          title="Emergency contact"
          description="Who to call if there is an emergency at work"
          collapsible
          defaultOpen={false}
        >
          <FormGrid cols={4}>
            <FormField><Input label="Contact Name" name="emergency_name" value={form.emergency_name} onChange={(e) => setField("emergency_name", e.target.value)} /></FormField>
            <FormField><Input label="Contact Mobile" name="emergency_mobile" value={form.emergency_mobile} onChange={(e) => setField("emergency_mobile", e.target.value)} /></FormField>
            <FormField><Input label="Relation" name="emergency_relation" value={form.emergency_relation} onChange={(e) => setField("emergency_relation", e.target.value)} /></FormField>
          </FormGrid>
        </FormSection>

        {String(form.employee_type) === "2" && (
          <FormSection
            variant="card"
            icon={<IconSchool className="size-4" />}
            title="Intern details"
            description="College, course and stipend"
            collapsible
            defaultOpen
          >
            <FormGrid cols={4}>
              <FormField><Input label="College Name" name="college_name" value={form.college_name} onChange={(e) => setField("college_name", e.target.value)} /></FormField>
              <FormField><Input label="College Course" name="college_course" value={form.college_course} onChange={(e) => setField("college_course", e.target.value)} /></FormField>
              <FormField><Input label="Duration" name="intern_duration" value={form.intern_duration} onChange={(e) => setField("intern_duration", e.target.value)} /></FormField>
              <FormField><Input label="Stipend" name="stipend" type="number" value={form.stipend} onChange={(e) => setField("stipend", e.target.value)} /></FormField>
            </FormGrid>
          </FormSection>
        )}

        <FormSection
          variant="card"
          id="emp-notes"
          step={8}
          icon={<IconNotes className="size-4" />}
          title="Notes"
          description="Anything HR should remember about this person"
          collapsible
          defaultOpen={false}
        >
          <FormGrid cols={1}>
            <FormField><Input label="Notes" name="notes" multiline rows={3} value={form.notes} onChange={(e) => setField("notes", e.target.value)} /></FormField>
          </FormGrid>
        </FormSection>
        </div>

        <FormActions className="sticky bottom-0 items-center gap-2 border-t border-border bg-card/95 backdrop-blur">
          <span className="mr-auto text-xs text-muted-foreground">
            <span className="text-destructive">*</span> required · optional sections are collapsed
          </span>
          <Button type="button" size="sm" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" size="sm" loading={saving}>{mode === "add" ? "Create Employee" : "Save Changes"}</Button>
        </FormActions>
      </FormContainer>
    </form>
  );
}




