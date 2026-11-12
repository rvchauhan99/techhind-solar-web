"use client";

import { useMemo, useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import { IconFileSpreadsheet } from "@tabler/icons-react";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const STATUS_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "pending_l1", label: "Pending L1" },
  { value: "pending_l2", label: "Pending L2" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];
const KIND_OPTIONS = [
  { value: "false", label: "Planned" },
  { value: "true", label: "Emergency" },
];

export default function HrmsLeaveReportPage() {
  const [filters, setFilters] = useState({ status: "", emergency: "" });
  const [tableKey, setTableKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const fetcher = useMemo(
    () => async ({ page, limit, q }) => {
      const res = await hrmsService.listLeaveReport({
        page,
        limit,
        search: q || undefined,
        status: filters.status || undefined,
        is_emergency: filters.emergency === "" ? undefined : filters.emergency === "true",
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, tableKey]
  );

  const onExport = async () => {
    setBusy(true);
    try {
      const blob = await hrmsService.exportLeaveReport({
        status: filters.status || undefined,
        is_emergency: filters.emergency === "" ? undefined : filters.emergency === "true",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leave-report.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Export downloaded — matches the selected filters");
    } catch (err) {
      toastErrorFromApi(err, "Export failed");
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
        render: (row) => (
          <span className="font-medium text-foreground">
            {row.user?.name || row.employee?.emp_code || `User #${row.user_id}`}
          </span>
        ),
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
        render: (row) => <StatusBadge status={row.status} />,
      },
    ],
    []
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Leave Report"
        subtitle="Every leave application — the Excel export matches the filters below"
        exportButtonLabel="Download Excel"
        onExportClick={onExport}
        exportLoading={busy}
        filterConfig={[
          { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
          { key: "emergency", label: "Planned / Emergency", type: "select", options: KIND_OPTIONS },
        ]}
        filterValues={filters}
        showFilterLabels
        onFilterChange={(key, value) => {
          setFilters((f) => ({ ...f, [key]: value }));
          setTableKey((k) => k + 1);
        }}
        onClearFilters={() => {
          setFilters({ status: "", emergency: "" });
          setTableKey((k) => k + 1);
        }}
      >
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          showSearch
          height="70vh"
          emptyState={
            <EmptyState
              icon={IconFileSpreadsheet}
              title="No leave rows for these filters"
              description="Clear the status or planned/emergency filter to widen the report."
            />
          }
        />
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
