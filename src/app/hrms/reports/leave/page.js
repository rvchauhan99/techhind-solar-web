"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import Select, { MenuItem } from "@/components/common/Select";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsLeaveReportPage() {
  const [status, setStatus] = useState("");
  const [emergency, setEmergency] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const fetcher = useMemo(
    () => async ({ page, limit }) => {
      const res = await hrmsService.listLeaveReport({
        page,
        limit,
        status: status || undefined,
        is_emergency: emergency === "" ? undefined : emergency === "true",
      });
      const payload = res?.result ?? res?.data ?? res;
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    [status, emergency, tableKey]
  );

  const onExport = async () => {
    setBusy(true);
    try {
      const blob = await hrmsService.exportLeaveReport({
        status: status || undefined,
        is_emergency: emergency === "" ? undefined : emergency === "true",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leave-report.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "user",
        label: "Employee",
        sortable: false,
        render: (row) => row.user?.name || row.employee?.emp_code || `User #${row.user_id}`,
      },
      {
        field: "leaveType",
        label: "Type",
        sortable: false,
        render: (row) => row.leaveType?.title || row.leave_type_id,
      },
      { field: "start_date", label: "Start", sortable: false },
      { field: "end_date", label: "End", sortable: false },
      { field: "days", label: "Days", sortable: false },
      {
        field: "is_emergency",
        label: "Kind",
        sortable: false,
        render: (row) => (row.is_emergency ? "Emergency" : "Planned"),
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => (
          <span className="text-xs capitalize">{row.status?.replace(/_/g, " ")}</span>
        ),
      },
    ],
    []
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer title="Leave Report">
        <div className="mb-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem]">
            <Select
              label="Status"
              name="status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setTableKey((k) => k + 1);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="pending_l1">Pending L1</MenuItem>
              <MenuItem value="pending_l2">Pending L2</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </div>
          <div className="min-w-[10rem]">
            <Select
              label="Planned / Emergency"
              name="emergency"
              value={emergency}
              onChange={(e) => {
                setEmergency(e.target.value);
                setTableKey((k) => k + 1);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="false">Planned</MenuItem>
              <MenuItem value="true">Emergency</MenuItem>
            </Select>
          </div>
          <Button size="sm" disabled={busy} onClick={onExport}>
            {busy ? "Exporting…" : "Download Excel"}
          </Button>
        </div>
        <PaginatedTable key={tableKey} columns={columns} fetchData={fetcher} pageSize={20} />
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
