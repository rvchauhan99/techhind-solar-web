"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconReceipt, IconExternalLink } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import ListCount from "@/components/common/ListCount";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_annexure";

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
  const [filters, setFilters] = useState({ status: "active", department_id: "" });
  const [listTotal, setListTotal] = useState(null);
  const [departments, setDepartments] = useState([]);

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

  const openAnnexure = (id) => router.push(`/hrms/employees/${id}/annexure`);

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
        filterType: "select",
        filterKey: "status",
        filterOptions: [
          { value: "pending", label: "Pending" },
          { value: "active", label: "Active" },
          { value: "disabled", label: "Disabled" },
        ],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          setFilters({ status: "active", department_id: "" });
          setTableKey((k) => k + 1);
        }}
      >
        <div className="flex min-h-[320px] flex-1 flex-col">
        <PaginatedTable
          toolbar={
            <>
              <ListCount total={listTotal} context={Object.values(filters).some((v) => v != null && String(v).trim() !== "") ? "matching filters" : undefined} />
            </>
          }
          key={tableKey}
          onTotalChange={setListTotal}
          columnFilterValues={filters}
          onColumnFilterChange={(key, value) => {
            setFilters((f) => ({ ...f, [key]: value }));
            setTableKey((k) => k + 1);
          }}
          filterParams={filters}
          columns={columns}
          fetcher={fetcher}
          showSearch
          height="100%"
          emptyState={
            <EmptyState
              icon={IconReceipt}
              title={
                filters.status || filters.department_id
                  ? "No employees match these filters"
                  : "No employees yet"
              }
              description={
                filters.status || filters.department_id
                  ? "Try clearing the filters to see the full employee list."
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
