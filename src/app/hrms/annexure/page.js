"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconReceipt, IconExternalLink } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import * as hrmsService from "@/services/hrmsService";
import { listBranches } from "@/services/companyService";
import AnnexureFilterPanel from "./components/AnnexureFilterPanel";

const MODULE_KEY = "hrms_annexure";

const EMPTY_FILTERS = {
  status: "active",
  department_id: "",
  designation_id: "",
  branch_id: "",
};

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
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

export default function HrmsAnnexureLandingPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);

  const [tableKey, setTableKey] = useState(0);
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [q, setQ] = useState("");
  const [branchOptions, setBranchOptions] = useState([]);

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

  const filterPanelValues = useMemo(() => ({ ...filters, q }), [filters, q]);

  const advancedActiveCount = useMemo(() => {
    let n = 0;
    if (filters.department_id) n += 1;
    if (filters.designation_id) n += 1;
    if (filters.branch_id) n += 1;
    if (filters.status && filters.status !== "active") n += 1;
    if (q.trim()) n += 1;
    return n;
  }, [filters, q]);

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
    } else if (key === "status") {
      setFilters((prev) => ({ ...prev, status: "active" }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: "" }));
    }
    setTableKey((k) => k + 1);
  };

  const openAnnexure = (id) => router.push(`/hrms/employees/${id}/annexure`);

  const fetcher = useCallback(
    async ({ page, limit }) => {
      const res = await hrmsService.listEmployees({
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
        field: "name",
        label: "Employee",
        sortable: false,
        render: (row) => <EmployeeCell row={row} />,
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
              variant="outline"
              size="sm"
              aria-label={`Open annexure for ${row.user?.name || row.emp_code}`}
              title="Open annexure"
              onClick={() => openAnnexure(row.id)}
            >
              <IconExternalLink className="h-4 w-4" />
              Open annexure
            </Button>
          </div>
        ),
      },
    ],
    [router]
  );

  if (!perm.can_read) {
    return (
      <ProtectedRoute>
        <EmptyState
          icon={IconReceipt}
          title="Annexure access required"
          description="Your role needs the Annexure module to view salary CTC breakups."
        />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Annexure"
        subtitle="Select an employee to view or edit salary CTC breakup and increments"
      >
        <AnnexureFilterPanel
          values={filterPanelValues}
          quickSearch={q}
          branchOptions={branchOptions}
          activeCount={advancedActiveCount}
          onQuickSearch={(v) => {
            setQ(v);
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

        <div className="flex min-h-[320px] flex-1 flex-col">
          <PaginatedTable
            key={tableKey}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            height="100%"
            emptyState={
              <EmptyState
                icon={IconReceipt}
                title={
                  advancedActiveCount
                    ? "No employees match these filters"
                    : "No employees yet"
                }
                description={
                  advancedActiveCount
                    ? "Try removing a filter chip or clearing the quick search."
                    : "Add employees first, then set their salary annexure here."
                }
              />
            }
          />
        </div>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}