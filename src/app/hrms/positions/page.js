"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconPencil, IconTrash, IconBriefcase } from "@tabler/icons-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import useModulePermission from "@/hooks/useModulePermission";
import useListTableState from "@/hooks/useListTableState";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_positions";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function formatUpdatedAt(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HrmsPositionsPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);
  const list = useListTableState({ filters: { status: "", title: "", branch_id: "" } });
  const [tableKey, setTableKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    hrmsService
      .getPositionMeta()
      .then((res) => setBranches(unwrap(res)?.branches || []))
      .catch(() => setBranches([]));
  }, []);

  const branchOptions = useMemo(
    () =>
      (branches || []).map((b) => ({
        value: String(b.id ?? b.value),
        label: b.name || b.label || `Branch #${b.id}`,
      })),
    [branches]
  );

  const fetcher = useCallback(async (params) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const res = await hrmsService.listPositions({
      page,
      limit,
      search: params.title || params.q || undefined,
      search_op: params.title_op || undefined,
      status: params.status || undefined,
      branch_id: params.branch_id || undefined,
    });
    const payload = unwrap(res);
    const rows = payload?.data || [];
    const meta = payload?.meta || { total: rows.length, page, pages: 1, limit };
    const data = rows.map((row, i) => ({
      ...row,
      _sr: (page - 1) * limit + i + 1,
    }));
    return { data, meta };
  }, []);

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hrmsService.deletePosition(deleteTarget.id);
      toastSuccess("Position deleted");
      setDeleteTarget(null);
      setTableKey((k) => k + 1);
    } catch (err) {
      toastErrorFromApi(err, "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "_sr",
        label: "Sr.No.",
        sortable: false,
        render: (row) => row._sr ?? "—",
      },
      {
        field: "title",
        label: "Position",
        sortable: false,
        filterType: "text",
        filterKey: "title",
        defaultFilterOperator: "contains",
        render: (row) => <span className="font-medium text-foreground">{row.title}</span>,
      },
      {
        field: "branches",
        label: "Branch",
        sortable: false,
        filterType: "select",
        filterKey: "branch_id",
        filterOptions: branchOptions,
        render: (row) =>
          (row.branch_titles || []).length ? row.branch_titles.join(", ") : "—",
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
        field: "updated_by_name",
        label: "Updated By",
        sortable: false,
        render: (row) => row.updated_by_name || "—",
      },
      {
        field: "updated_at",
        label: "Updated Date & Time",
        sortable: false,
        render: (row) => formatUpdatedAt(row.updated_at || row.created_at),
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            {perm.can_update ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Edit position"
                title="Edit"
                onClick={() => router.push(`/hrms/positions/${row.id}/edit`)}
              >
                <IconPencil className="h-4 w-4" />
              </Button>
            ) : null}
            {perm.can_delete ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Delete position"
                title="Delete"
                onClick={() => setDeleteTarget(row)}
              >
                <IconTrash className="h-4 w-4 text-destructive" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [perm.can_update, perm.can_delete, router, branchOptions]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Open Positions"
        subtitle="Hiring roles with branch targeting"
        addButtonLabel={perm.can_create ? "Add position" : undefined}
        onAddClick={perm.can_create ? () => router.push("/hrms/positions/add") : undefined}
      >
        <div className="flex min-h-[320px] flex-1 flex-col">
          <PaginatedTable
            key={tableKey}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            height="100%"
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
                icon={IconBriefcase}
                title={list.activeFilterCount ? "No positions match this filter" : "No open positions"}
                description={
                  list.activeFilterCount
                    ? "Try clearing the filters to see all positions."
                    : "Create a position and assign one or more branches."
                }
                actionLabel={perm.can_create ? "Add position" : undefined}
                onAction={perm.can_create ? () => router.push("/hrms/positions/add") : undefined}
              />
            }
          />
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete position?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.title || "This position"} will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Back</AlertDialogCancel>
              <AlertDialogAction size="sm" variant="destructive" loading={deleting} onClick={onDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
