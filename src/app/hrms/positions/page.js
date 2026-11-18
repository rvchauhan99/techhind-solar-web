"use client";

import { useMemo, useState } from "react";
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
import ListCount from "@/components/common/ListCount";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_positions";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function HrmsPositionsPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);
  const [filters, setFilters] = useState({ status: "" });
  const [listTotal, setListTotal] = useState(null);
  const [tableKey, setTableKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetcher = useMemo(
    () =>
      async ({ page, limit, q }) => {
        const res = await hrmsService.listPositions({
          page,
          limit,
          search: q || undefined,
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
        field: "title",
        label: "Title",
        sortable: false,
        render: (row) => <span className="font-medium text-foreground">{row.title}</span>,
      },
      {
        field: "branches",
        label: "Branches",
        sortable: false,
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
    [perm.can_update, perm.can_delete, router]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Open Positions"
        subtitle="Hiring roles with branch targeting"
        addButtonLabel={perm.can_create ? "Add position" : undefined}
        onAddClick={perm.can_create ? () => router.push("/hrms/positions/add") : undefined}
        filterConfig={[{ key: "status", label: "Status", type: "select", options: STATUS_OPTIONS }]}
        filterValues={filters}
        showFilterLabels
        onFilterChange={(key, value) => {
          setFilters((f) => ({ ...f, [key]: value }));
          setTableKey((k) => k + 1);
        }}
        onClearFilters={() => {
          setFilters({ status: "" });
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
              icon={IconBriefcase}
              title="No open positions"
              description="Create a position and assign one or more branches."
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
