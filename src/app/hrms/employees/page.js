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
} from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_employees";

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

  const [tableKey, setTableKey] = useState(0);
  const [filters, setFilters] = useState({ status: "", department_id: "" });
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
        status: filters.status || undefined,
        department_id: filters.department_id || undefined,
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

  const fetcher = useMemo(
    () => async ({ page, limit, q }) => {
      const res = await hrmsService.listEmployees({
        page,
        limit,
        search: q || undefined,
        status: filters.status || undefined,
        department_id: filters.department_id || undefined,
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
        render: (row) => row.department?.title || <span className="text-muted-foreground">—</span>,
      },
      {
        field: "designation",
        label: "Designation",
        sortable: false,
        render: (row) => row.designation?.title || <span className="text-muted-foreground">—</span>,
      },
      { field: "status", label: "Status", sortable: false, render: (row) => <StatusBadge status={row.status} /> },
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
    [perm.can_update, router]
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
        filterConfig={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "pending", label: "Pending" },
              { value: "active", label: "Active" },
              { value: "disabled", label: "Disabled" },
            ],
          },
          { key: "department_id", label: "Department", type: "select", options: deptOptions },
        ]}
        filterValues={filters}
        showFilterLabels
        onFilterChange={(key, value) => {
          setFilters((f) => ({ ...f, [key]: value }));
          setTableKey((k) => k + 1);
        }}
        onClearFilters={() => {
          setFilters({ status: "", department_id: "" });
          setTableKey((k) => k + 1);
        }}
      >
        <div className="mb-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <StatCard
            icon={<IconUsers size={16} />}
            label="Employees"
            value={counts.total ?? "—"}
            accentColor="#1b365d"
            subLabel="All records"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconCircleCheck size={16} />}
            label="Active"
            value={counts.active ?? "—"}
            accentColor="#00823b"
            subLabel="Can log in"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconClockHour4 size={16} />}
            label="Pending"
            value={counts.pending ?? "—"}
            accentColor="#f37021"
            subLabel="Awaiting activation"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconUserOff size={16} />}
            label="Disabled"
            value={counts.disabled ?? "—"}
            accentColor="#64748b"
            subLabel="Login blocked"
            loading={countsLoading}
          />
        </div>

        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          showSearch
          height="58vh"
          emptyState={
            <EmptyState
              icon={IconUsers}
              title={filters.status || filters.department_id ? "No employees match these filters" : "No employees yet"}
              description={
                filters.status || filters.department_id
                  ? "Try clearing the filters to see the full employee list."
                  : "Add your first employee to start tracking attendance, leave and payroll."
              }
              actionLabel={perm.can_create ? "Add Employee" : undefined}
              onAction={perm.can_create ? () => router.push("/hrms/employees/add") : undefined}
            />
          }
        />
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
