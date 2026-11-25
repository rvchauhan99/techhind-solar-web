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
import { listBranches } from "@/services/companyService";
import EmployeeFilterPanel from "./components/EmployeeFilterPanel";

const MODULE_KEY = "hrms_employees";

const EMPTY_FILTERS = {
  status: "active",
  department_id: "",
  designation_id: "",
  branch_id: "",
};

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

  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [q, setQ] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [branchOptions, setBranchOptions] = useState([]);
  const [counts, setCounts] = useState({ total: null, active: null, pending: null, disabled: null });
  const [countsLoading, setCountsLoading] = useState(true);

  const filterPanelValues = useMemo(() => ({ ...filters, q }), [filters, q]);

  const listParams = useMemo(() => {
    const status =
      filters.status && filters.status !== "all" ? filters.status : undefined;
    return {
      search: q.trim() || undefined,
      status,
      department_id: filters.department_id || undefined,
      designation_id: filters.designation_id || undefined,
      branch_id: filters.branch_id || undefined,
    };
  }, [filters, q]);

  const advancedActiveCount = useMemo(() => {
    let n = 0;
    if (filters.department_id) n += 1;
    if (filters.designation_id) n += 1;
    if (filters.branch_id) n += 1;
    if (filters.status && filters.status !== "active") n += 1;
    if (q.trim()) n += 1;
    return n;
  }, [filters, q]);

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
    listBranches()
      .catch(() => null)
      .then((res) => {
        const payload = unwrap(res);
        const rows = payload?.data || (Array.isArray(payload) ? payload : []);
        setBranchOptions(
          rows.map((b) => ({
            value: String(b.id),
            label: b.name || b.title || `Branch #${b.id}`,
          }))
        );
      });
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await hrmsService.exportEmployees(listParams);
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

  const fetcher = useCallback(
    async (params) => {
      const res = await hrmsService.listEmployees({
        page: params.page,
        limit: params.limit,
        ...listParams,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: params.limit || 20 };
      return { data: rows, meta };
    },
    [listParams]
  );

  const handleApplyFilters = (next) => {
    setFilters({
      status: next.status || "active",
      department_id: next.department_id || "",
      designation_id: next.designation_id || "",
      branch_id: next.branch_id || "",
    });
    setTableKey((k) => k + 1);
  };

  const handleResetFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setQ("");
    setTableKey((k) => k + 1);
  };

  const handleRemoveFilter = (key) => {
    if (key === "q") {
      setQ("");
      setTableKey((k) => k + 1);
      return;
    }
    if (key === "status") {
      setFilters((prev) => ({ ...prev, status: "active" }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: "" }));
    }
    setTableKey((k) => k + 1);
  };

  const columns = useMemo(
    () => [
      {
        field: "name",
        label: "Employee",
        sortable: false,
        render: (row) => <EmployeeCell row={row} />,
      },
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
      {
        field: "status",
        label: "Status",
        sortable: false,
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
      >
        <EmployeeFilterPanel
          values={filterPanelValues}
          quickSearch={q}
          branchOptions={branchOptions}
          activeCount={advancedActiveCount}
          defaultOpen={false}
          onQuickSearch={(v) => {
            setQ(v || "");
            setTableKey((k) => k + 1);
          }}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onRemove={handleRemoveFilter}
          loadDepartments={(query) => hrmsService.searchHrmsDepartments(query)}
          loadDesignations={(query, deptId) =>
            hrmsService.searchHrmsDesignations(query, { department_id: deptId || undefined })
          }
          resolveDepartment={(id) => hrmsService.resolveHrmsDepartment(id)}
          resolveDesignation={(id) => hrmsService.resolveHrmsDesignation(id)}
        />

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
            key={tableKey}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            height="100%"
            emptyState={
              <EmptyState
                icon={IconUsers}
                title={advancedActiveCount ? "No employees match these filters" : "No employees yet"}
                description={
                  advancedActiveCount
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