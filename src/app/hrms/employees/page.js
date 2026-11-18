"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  IconEye,
  IconPencil,
  IconUsers,
  IconCircleCheck,
  IconClockHour4,
  IconUserOff,
  IconDownload,
  IconFilterOff,
} from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import ListCount from "@/components/common/ListCount";
import useModulePermission from "@/hooks/useModulePermission";
import useListTableState from "@/hooks/useListTableState";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_employees";
const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function EmployeeCell({ row }) {
  const name = row.user?.name || "Unnamed";
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1b365d]/10 text-[11px] font-semibold text-[#1b365d]">
        {initials(row.user?.name)}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{row.emp_code}</div>
      </div>
    </div>
  );
}

export default function HrmsEmployeesPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);

  const list = useListTableState({ filters: { status: "", department_id: "" } });
  const [listTotal, setListTotal] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [counts, setCounts] = useState({ total: null, active: null, pending: null, disabled: null });
  const [countsLoading, setCountsLoading] = useState(true);

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const [all, active, pending, disabled] = await Promise.all([
        hrmsService.listEmployees({ limit: 1 }),
        hrmsService.listEmployees({ limit: 1, status: "active" }),
        hrmsService.listEmployees({ limit: 1, status: "pending" }),
        hrmsService.listEmployees({ limit: 1, status: "disabled" }),
      ]);
      setCounts({
        total: unwrap(all)?.meta?.total ?? 0,
        active: unwrap(active)?.meta?.total ?? 0,
        pending: unwrap(pending)?.meta?.total ?? 0,
        disabled: unwrap(disabled)?.meta?.total ?? 0,
      });
    } catch {
      setCounts({ total: null, active: null, pending: null, disabled: null });
    } finally {
      setCountsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    hrmsService
      .listDepartments({ limit: 100, status: "active" })
      .then((res) => {
        setDepartments(unwrap(res)?.data || []);
      })
      .catch(() => setDepartments([]));
  }, []);

  const deptOptions = useMemo(
    () => departments.map((d) => ({ value: String(d.id), label: d.title })),
    [departments]
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await hrmsService.exportEmployees({
        status: list.filters.status || undefined,
        department_id: list.filters.department_id || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "employees.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Export downloaded — matches the selected filters");
    } catch (err) {
      toastErrorFromApi(err, "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const fetcher = useCallback(async (params) => {
    const res = await hrmsService.listEmployees({
      page: params.page,
      limit: params.limit,
      search: params.q || undefined,
      status: params.status || undefined,
      department_id: params.department_id || undefined,
    });
    const payload = unwrap(res);
    const rows = payload?.data || [];
    const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: params.limit || 20 };
    return { data: rows, meta };
  }, []);

  const columns = useMemo(
    () => [
      { field: "name", label: "Employee", sortable: false, render: (row) => <EmployeeCell row={row} /> },
      {
        field: "email",
        label: "Work Email",
        sortable: false,
        render: (row) => row.user?.email || <span className="text-muted-foreground">No login yet</span>,
      },
      {
        field: "department",
        label: "Department",
        sortable: false,
        filterType: "select",
        filterKey: "department_id",
        filterOptions: deptOptions,
        render: (row) => row.department?.title || <span className="text-muted-foreground">—</span>,
      },
      {
        field: "designation",
        label: "Designation",
        sortable: false,
        render: (row) => row.designation?.title || <span className="text-muted-foreground">—</span>,
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        filterType: "select",
        filterKey: "status",
        filterOptions: STATUS_OPTIONS,
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label={`View ${row.user?.name || row.emp_code}`}
              title="View"
              onClick={() => router.push(`/hrms/employees/${row.id}`)}
            >
              <IconEye className="h-4 w-4" />
            </Button>
            {perm.can_update && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Edit ${row.user?.name || row.emp_code}`}
                title="Edit"
                onClick={() => router.push(`/hrms/employees/${row.id}/edit`)}
              >
                <IconPencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [perm.can_update, router, deptOptions]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Employees"
        subtitle="Employee master — HR profile and login"
        addButtonLabel={perm.can_create ? "Add Employee" : undefined}
        onAddClick={perm.can_create ? () => router.push("/hrms/employees/add") : undefined}
        actions={
          <Button size="sm" variant="outline" onClick={handleExport} loading={exporting}>
            <IconDownload className="size-4" /> Export
          </Button>
        }
      >
        <div className="mb-1.5 grid shrink-0 grid-cols-2 gap-2 md:grid-cols-4">
          <StatCard
            compact
            icon={<IconUsers size={16} />}
            label="Employees"
            value={counts.total ?? "—"}
            accentColor="#1b365d"
            subLabel="All records"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconCircleCheck size={16} />}
            label="Active"
            value={counts.active ?? "—"}
            accentColor="#00823b"
            subLabel="Can log in"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconClockHour4 size={16} />}
            label="Pending"
            value={counts.pending ?? "—"}
            accentColor="#f37021"
            subLabel="Awaiting activation"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconUserOff size={16} />}
            label="Disabled"
            value={counts.disabled ?? "—"}
            accentColor="#64748b"
            subLabel="Login blocked"
            loading={countsLoading}
          />
        </div>

        <div className="flex min-h-[320px] flex-1 flex-col">
          <PaginatedTable
            columns={columns}
            fetcher={fetcher}
            showSearch
            height="100%"
            toolbar={
              <>
                <ListCount
                  total={listTotal}
                  context={list.activeFilterCount ? "matching filters" : undefined}
                />
                {list.activeFilterCount > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => list.clearFilters()}
                  >
                    <IconFilterOff className="size-3.5" /> Clear filters
                  </Button>
                ) : null}
              </>
            }
            onTotalChange={setListTotal}
            columnFilterValues={list.filters}
            onColumnFilterChange={list.setFilter}
            filterParams={list.filters}
            page={list.page}
            limit={list.limit}
            q={list.q}
            sortBy={list.sortBy}
            sortOrder={list.sortOrder}
            onPageChange={(zeroBased) => list.setPage(zeroBased + 1)}
            onRowsPerPageChange={list.setLimit}
            onQChange={list.setQ}
            onSortChange={list.setSort}
            emptyState={
              <EmptyState
                icon={IconUsers}
                title={list.activeFilterCount ? "No employees match these filters" : "No employees yet"}
                description={
                  list.activeFilterCount
                    ? "Try clearing the filters to see the full employee list."
                    : "Add your first employee to start tracking attendance, leave and payroll."
                }
                actionLabel={perm.can_create ? "Add Employee" : undefined}
                onAction={perm.can_create ? () => router.push("/hrms/employees/add") : undefined}
              />
            }
          />
        </div>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
