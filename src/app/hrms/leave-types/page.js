"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import Select, { MenuItem } from "@/components/common/Select";
import { useAuth } from "@/hooks/useAuth";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsLeaveTypesPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const perm = modulePermissions?.[currentModuleId] || {};
  const [status, setStatus] = useState("");
  const [tableKey, setTableKey] = useState(0);

  const fetcher = useMemo(
    () => async ({ page, limit, q }) => {
      const res = await hrmsService.listLeaveTypes({
        page,
        limit,
        search: q || undefined,
        status: status || undefined,
      });
      const payload = res?.result ?? res?.data ?? res;
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    [status, tableKey]
  );

  const handleDelete = async (row) => {
    if (!perm.can_delete) return;
    if (!window.confirm(`Delete leave type "${row.title}"?`)) return;
    try {
      await hrmsService.deleteLeaveType(row.id);
      toast.success("Leave type deleted");
      setTableKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  const columns = useMemo(
    () => [
      { field: "title", label: "Title", sortable: true },
      {
        field: "quarterly_leave",
        label: "Quarterly entitlement",
        sortable: false,
        render: (row) => String(row.quarterly_leave ?? "—"),
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
                <Link href={`/hrms/leave-types/${row.id}/edit`}>
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
        title="Leave Types"
        addButtonLabel={perm.can_create ? "Add Leave Type" : undefined}
        onAddClick={
          perm.can_create
            ? () => {
                window.location.href = "/hrms/leave-types/add";
              }
            : undefined
        }
      >
        <div className="mb-2 max-w-[10rem]">
          <Select
            label="Status"
            size="small"
            value={status || "all"}
            onChange={(e) => {
              const v = e.target.value === "all" ? "" : e.target.value;
              setStatus(v);
              setTableKey((k) => k + 1);
            }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </div>
        <PaginatedTable key={tableKey} columns={columns} fetcher={fetcher} showSearch height="70vh" />
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
