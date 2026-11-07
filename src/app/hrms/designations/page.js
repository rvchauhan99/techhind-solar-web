"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import { useAuth } from "@/hooks/useAuth";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsDesignationsPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const perm = modulePermissions?.[currentModuleId] || {};
  const [tableKey, setTableKey] = useState(0);
  const [deptFilter, setDeptFilter] = useState("");

  const fetcher = useMemo(
    () => async ({ page, limit, q }) => {
      const res = await hrmsService.listDesignations({
        page,
        limit,
        search: q || undefined,
        department_id: deptFilter || undefined,
      });
      const payload = res?.result ?? res?.data ?? res;
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    [tableKey, deptFilter]
  );

  const handleDelete = async (row) => {
    if (!perm.can_delete) return;
    if (!window.confirm(`Delete designation "${row.title}"?`)) return;
    try {
      await hrmsService.deleteDesignation(row.id);
      toast.success("Designation deleted");
      setTableKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  const columns = useMemo(
    () => [
      { field: "title", label: "Title", sortable: true },
      {
        field: "department",
        label: "Department",
        sortable: false,
        render: (row) => row.department?.title || "—",
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => <span className="capitalize text-xs">{row.status}</span>,
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex items-center gap-1">
            {perm.can_update && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/hrms/designations/${row.id}/edit`}>
                  <IconPencil className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {perm.can_delete && (
              <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
                <IconTrash className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [perm.can_update, perm.can_delete]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Designations"
        addButtonLabel={perm.can_create ? "Add Designation" : undefined}
        onAddClick={
          perm.can_create
            ? () => {
                window.location.href = "/hrms/designations/add";
              }
            : undefined
        }
        filterConfig={[
          {
            key: "department_id",
            label: "Department id",
            type: "text",
          },
        ]}
        filterValues={{ department_id: deptFilter }}
        onFilterChange={(key, value) => {
          if (key === "department_id") {
            setDeptFilter(value);
            setTableKey((k) => k + 1);
          }
        }}
        onClearFilters={() => {
          setDeptFilter("");
          setTableKey((k) => k + 1);
        }}
      >
        <PaginatedTable key={tableKey} columns={columns} fetcher={fetcher} showSearch height="70vh" />
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
