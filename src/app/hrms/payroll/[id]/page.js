"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconDownload, IconArrowLeft, IconMessageCircle, IconCheck } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const money = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Stat({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold tabular-nums text-foreground" : "tabular-nums"}>
        {value}
      </span>
    </div>
  );
}

export default function PayrollSlipPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await hrmsService.getPayrollReport(id);
      setRow(unwrap(res));
    } catch (err) {
      toastErrorFromApi(err, "Could not load slip");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const download = async () => {
    try {
      const blob = await hrmsService.downloadSalarySlip(id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary-slip-${row?.emp_code || id}-${row?.salary_month || ""}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toastErrorFromApi(err, "Could not download slip");
    }
  };

  const ack = async () => {
    try {
      await hrmsService.ackSalarySlip(id);
      toastSuccess("Slip acknowledged");
      load();
    } catch (err) {
      toastErrorFromApi(err, "Could not acknowledge");
    }
  };


  if (loading) {
    return (
      <ProtectedRoute>
        <div className="space-y-3 p-4">
          <div className="h-8 w-56 animate-pulse rounded bg-muted" />
          <div className="h-64 animate-pulse rounded bg-muted" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!row) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <EmptyState
            icon={IconArrowLeft}
            title="Slip not found"
            description="This salary row may have been removed. Go back to payroll."
            actionLabel="Back to payroll"
            onAction={() => router.push("/hrms/payroll")}
          />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">
                {row.employee_name || row.emp_code || "Employee"}
              </h1>
              <StatusBadge
                status={row.is_acknowledged ? "approved" : "pending"}
                label={row.is_acknowledged ? "Acknowledged" : "Not acknowledged"}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {row.salary_month} · {row.department_title || "—"} · {row.designation_title || "—"}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => router.push("/hrms/payroll")}>
              <IconArrowLeft className="size-4" /> Back
            </Button>
            <Button size="sm" variant="outline" onClick={download}>
              <IconDownload className="size-4" /> Slip PDF
            </Button>
            {!row.is_acknowledged && (
              <Button size="sm" onClick={ack}>
                <IconCheck className="size-4" /> Acknowledge
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Days</p>
            <Stat label="Total days" value={row.total_days} />
            <Stat label="Salary days" value={row.salary_days} strong />
            <Stat label="Present" value={row.present_days} />
            <Stat label="Half / Absent" value={`${row.half_day} / ${row.absent_day}`} />
            <Stat label="LWP" value={row.lwp} />
            <Stat label="Late marks" value={row.late_mark_day} />
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Earnings</p>
            <Stat label="Basic" value={money(row.basic_pay)} />
            <Stat label="HRA" value={money(row.hra_pay)} />
            <Stat label="Conveyance" value={money(row.conveyance_pay)} />
            <Stat label="Medical" value={money(row.medical_pay)} />
            <Stat label="Other" value={money(row.other_pay)} />
            <Stat label="Payable" value={money(row.payable_income)} strong />
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Deductions</p>
            <Stat label="PF" value={money(row.pf)} />
            <Stat label="ESI" value={money(row.esi)} />
            <Stat label="PT" value={money(row.pt)} />
            <Stat label="LWF" value={money(row.lwf)} />
            <Stat label="Late" value={money(row.late_deduction)} />
            <Stat label="Penalty" value={money(row.total_penalty)} />
            <Stat label="Total" value={money(row.total_deduction)} strong />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-navy p-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">NET PAYABLE</span>
            <span className="text-xl font-semibold tabular-nums">{money(row.net_amount)}</span>
          </div>
        </div>

        {row.query_raised && (
          <div className="rounded-lg border border-border bg-card p-3 text-sm">
            <p className="mb-1 flex items-center gap-1 font-semibold text-foreground">
              <IconMessageCircle className="size-4" /> Query
            </p>
            <p className="text-muted-foreground">{row.query_text}</p>
            <p className="mt-1 text-xs">
              {row.is_solved
                ? `Resolved${row.resolution_note ? `: ${row.resolution_note}` : ""}`
                : "Open"}
            </p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
