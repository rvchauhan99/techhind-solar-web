"use client";

import { useCallback, useMemo, useState } from "react";
import { IconClipboardCheck } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import * as hrmsService from "@/services/hrmsService";
import { currentFyYear, fyYearSelectOptions } from "@/components/common/hrmsFilterDates";
import LeaveBalanceApprovalFilterPanel from "./components/LeaveBalanceApprovalFilterPanel";

const MODULE_KEY = "hrms_leave_balance_approvals";
const DEFAULT_FY = currentFyYear();

const EMPTY_FILTERS = {
  fy_year: DEFAULT_FY,
  status: "",
  employee_id: "",
};

export default function HrmsLeaveBalanceApprovalsPage() {
  useModulePermission(MODULE_KEY);
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [q, setQ] = useState("");
  const [tableKey, setTableKey] = useState(0);

  const fyOptions = useMemo(() => fyYearSelectOptions(), []);

  const listParams = useMemo(
    () => ({
      fy_year: filters.fy_year || DEFAULT_FY,
      status: filters.status || undefined,
      employee_id: filters.employee_id || undefined,
      search: q.trim() || undefined,
    }),
    [filters, q]
  );

  const filterPanelValues = useMemo(() => ({ ...filters, q }), [filters, q]);

  const advancedActiveCount = useMemo(() => {
    let n = 0;
    if (filters.status) n += 1;
    if (filters.employee_id) n += 1;
    if (q.trim()) n += 1;
    if (filters.fy_year && filters.fy_year !== DEFAULT_FY) n += 1;
    return n;
  }, [filters, q]);

  const handleApplyFilters = (next) => {
    setFilters({
      fy_year: next.fy_year || DEFAULT_FY,
      status: next.status || "",
      employee_id: next.employee_id || "",
    });
    setTableKey((k) => k + 1);
  };

  const handleResetFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setQ("");
    setTableKey((k) => k + 1);
  };

  const handleRemoveFilter = (key) => {
    if (key === "q") setQ("");
    else if (key === "fy_year") setFilters((prev) => ({ ...prev, fy_year: DEFAULT_FY }));
    else setFilters((prev) => ({ ...prev, [key]: "" }));
    setTableKey((k) => k + 1);
  };

  const fetcher = useCallback(
    async ({ page, limit }) => {
      const res = await hrmsService.listLeaveBalanceAcks({
        page,
        limit,
        ...listParams,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    [listParams]
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
        render: (row) =>
          row.fy_year
            ? `FY ${row.fy_year}-${String(row.fy_year + 1).slice(-2)}`
            : "—",
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
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
    []
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Leave balance approvals"
        subtitle="Employee confirmations and disputes of financial-year leave balance"
      >
        <LeaveBalanceApprovalFilterPanel
          values={filterPanelValues}
          quickSearch={q}
          fyYearOptions={fyOptions}
          activeCount={advancedActiveCount}
          onQuickSearch={(v) => {
            setQ(v);
            setTableKey((k) => k + 1);
          }}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onRemove={handleRemoveFilter}
          loadEmployees={(query) => hrmsService.searchHrmsEmployees(query)}
          resolveEmployee={(id) => hrmsService.resolveHrmsEmployee(id)}
        />

        <div className="flex min-h-[320px] flex-1 flex-col">
          <PaginatedTable
            key={tableKey}
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