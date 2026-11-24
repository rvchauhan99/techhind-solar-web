"use client";

import { useMemo, useState } from "react";
import { IconClipboardCheck } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_leave_balance_approvals";

function currentFyYear() {
  const d = new Date();
  const m = d.getMonth() + 1;
  return m >= 4 ? d.getFullYear() : d.getFullYear() - 1;
}

const STATUS_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Disputed" },
];

export default function HrmsLeaveBalanceApprovalsPage() {
  useModulePermission(MODULE_KEY);
  const fyDefault = String(currentFyYear());
  const [filters, setFilters] = useState({ fy_year: fyDefault, status: "" });
  const [tableKey, setTableKey] = useState(0);

  const fyOptions = useMemo(() => {
    const y = currentFyYear();
    return [0, 1, 2].map((i) => {
      const fy = y - i;
      return { value: String(fy), label: `FY ${fy}-${String(fy + 1).slice(-2)}` };
    });
  }, []);

  const fetcher = useMemo(
    () =>
      async ({ page, limit }) => {
        const res = await hrmsService.listLeaveBalanceAcks({
          page,
          limit,
          fy_year: filters.fy_year || undefined,
          status: filters.status || undefined,
        });
        const payload = unwrap(res);
        const rows = payload?.data || [];
        const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
        return { data: rows, meta };
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, tableKey]
  );

  const columns = useMemo(
    () => [
      {
        field: "employee",
        label: "Employee",
        sortable: false,
        render: (row) => (
          <span className="font-medium text-foreground">
            {row.employee?.user?.name ||
              row.employee?.emp_code ||
              `Employee #${row.employee_id}`}
          </span>
        ),
      },
      {
        field: "fy_year",
        label: "FY",
        sortable: false,
        filterType: "select",
        filterKey: "fy_year",
        filterOptions: fyOptions,
        render: (row) =>
          row.fy_year
            ? `FY ${row.fy_year}-${String(row.fy_year + 1).slice(-2)}`
            : "—",
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        filterType: "select",
        filterKey: "status",
        filterOptions: STATUS_OPTIONS,
        render: (row) => (
          <StatusBadge
            status={row.status === "approved" ? "approved" : "rejected"}
            label={row.status === "approved" ? "Confirmed" : "Disputed"}
          />
        ),
      },
      {
        field: "note",
        label: "Note",
        sortable: false,
        render: (row) => (
          <span className="text-sm text-muted-foreground line-clamp-2">{row.note || "—"}</span>
        ),
      },
      {
        field: "decided_at",
        label: "Decided",
        sortable: false,
        render: (row) =>
          row.decided_at ? new Date(row.decided_at).toLocaleString("en-IN") : "—",
      },
    ],
    [fyOptions]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Leave balance approvals"
        subtitle="Employee confirmations and disputes of financial-year leave balance"
      >
        <div className="flex min-h-[320px] flex-1 flex-col">
        <PaginatedTable
          key={tableKey}
          columnFilterValues={filters}
          onColumnFilterChange={(key, value) => {
            setFilters((f) => ({ ...f, [key]: value }));
            setTableKey((k) => k + 1);
          }}
          filterParams={filters}
          columns={columns}
          fetcher={fetcher}
          showSearch={false}
          height="100%"
          emptyState={
            <EmptyState
              icon={IconClipboardCheck}
              title="No acknowledgements yet"
              description="When employees confirm or dispute their FY leave balance on Leaves, rows appear here."
            />
          }
        />
        </div>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
