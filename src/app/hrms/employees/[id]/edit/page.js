"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import EmployeeForm from "../../components/EmployeeForm";
import { toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { unwrap } from "@/lib/apiUnwrap";

export default function HrmsEmployeeEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [initial, setInitial] = useState(null);
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await hrmsService.getEmployee(id);
        const e = unwrap(res);
        const branchIds =
          e?.user?.branch_ids ||
          (e?.user?.branches || []).map((b) => b.id || b.branch_id).filter(Boolean) ||
          [];
        setHasUser(Boolean(e?.user_id));
        setInitial({
          emp_code: e.emp_code || "",
          employee_type: String(e.employee_type || 1),
          name: e.user?.name || "",
          email: e.user?.email || "",
          mobile_number: e.user?.mobile_number || "",
          role_id: e.user?.role_id ? String(e.user.role_id) : "",
          branch_ids: branchIds.map(Number),
          department_id: e.department_id ? String(e.department_id) : "",
          designation_id: e.designation_id ? String(e.designation_id) : "",
          manager_employee_id: e.manager_employee_id ? String(e.manager_employee_id) : "",
          joining_date: e.joining_date || "",
          designation_date: e.designation_date || "",
          probation_months: e.probation_months != null ? String(e.probation_months) : "",
          probation_end_date: e.probation_end_date || "",
          resignation_date: e.resignation_date || "",
          current_gross_salary: e.current_gross_salary != null ? String(e.current_gross_salary) : "",
          salary_effective_month: e.salary_effective_month || "",
          gender: e.gender || "",
          personal_email: e.personal_email || "",
          personal_mobile: e.personal_mobile || "",
          brith_date: e.user?.brith_date || "",
          blood_group: e.user?.blood_group || "",
          address: e.user?.address || "",
          notes: e.notes || "",
          college_name: e.college_name || "",
          college_course: e.college_course || "",
          intern_duration: e.intern_duration || "",
          stipend: e.stipend != null ? String(e.stipend) : "",
          uan_no: e.uan_no || "",
          pf_no: e.pf_no || "",
          esic: e.esic || "",
          employee_esic: e.employee_esic || "",
          sc_applicable: !!e.sc_applicable,
          aadhar_no: e.aadhar_no || "",
          name_as_per_aadhar: e.name_as_per_aadhar || "",
          pan_no: e.pan_no || "",
          bank_name: e.bank_name || "",
          ac_holder_name: e.ac_holder_name || "",
          ac_number: e.ac_number || "",
          ifsc_code: e.ifsc_code || "",
          branch_name: e.branch_name || "",
          rules_exemption: !!e.rules_exemption,
          emergency_name: e.emergency_name || "",
          emergency_mobile: e.emergency_mobile || "",
          emergency_relation: e.emergency_relation || "",
        });
      } catch (err) {
        toastErrorFromApi(err, "Load failed");
        router.push("/hrms/employees");
      }
    })();
  }, [id, router]);

  if (!initial) {
    return (
      <ProtectedRoute>
        <div className="p-4 space-y-3">
          <div className="h-8 w-56 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted/60" />
            ))}
          </div>
          <div className="h-40 animate-pulse rounded-md bg-muted/40" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Edit Employee" listHref="/hrms/employees" listLabel="Employees">
        <EmployeeForm mode="edit" employeeId={id} initial={initial} hasUser={hasUser} />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
