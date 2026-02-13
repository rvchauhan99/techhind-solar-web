"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import roleModuleService from "@/services/roleModuleService";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconEye, IconPencil, IconTrash } from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
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

const COLUMN_FILTER_KEYS = [
  "role_name",
  "role_name_op",
  "module_name",
  "module_name_op",
  "can_create",
  "can_read",
  "can_update",
  "can_delete",
  "listing_criteria",
];

const YES_NO_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const LISTING_CRITERIA_OPTIONS = [
  { value: "all", label: "All" },
  { value: "my_team", label: "My Team" },
];

export default function RoleModuleListPage() {
  const router = useRouter();
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  const listingState = useListingQueryState({ defaultLimit: 20, filterKeys: COLUMN_FILTER_KEYS });
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } = listingState;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);

  const filterParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      ),
    [filters]
  );

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const response = await roleModuleService.listRoleModules({
        page: p.page,
        limit: p.limit,
        role_name: p.role_name || undefined,
        module_name: p.module_name || undefined,
        can_create: p.can_create !== undefined && p.can_create !== "" ? p.can_create : undefined,
        can_read: p.can_read !== undefined && p.can_read !== "" ? p.can_read : undefined,
        can_update: p.can_update !== undefined && p.can_update !== "" ? p.can_update : undefined,
        can_delete: p.can_delete !== undefined && p.can_delete !== "" ? p.can_delete : undefined,
        listing_criteria:
          p.listing_criteria !== undefined && p.listing_criteria !== ""
            ? p.listing_criteria
            : undefined,
        sortBy: p.sortBy || "id",
        sortOrder: p.sortOrder || "DESC",
      });
      const result = response?.result || response;
      return {
        data: result?.data || result || [],
        meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
      };
    },
    []
  );

  const columns = useMemo(
    () => [
      {
        field: "id",
        label: "ID",
        sortable: false,
      },
      {
        field: "role",
        label: "Role",
        sortable: false,
        filterType: "text",
        filterKey: "role_name",
        defaultFilterOperator: "contains",
        render: (row) => row.role?.name || row.role_id || "-",
      },
      {
        field: "module",
        label: "Module",
        sortable: false,
        filterType: "text",
        filterKey: "module_name",
        defaultFilterOperator: "contains",
        render: (row) => row.module?.name || row.module_id || "-",
      },
      {
        field: "can_create",
        label: "Create",
        sortable: false,
        filterType: "select",
        filterKey: "can_create",
        filterOptions: YES_NO_OPTIONS,
        render: (row) => (row.can_create ? "Yes" : "No"),
      },
      {
        field: "can_read",
        label: "Read",
        sortable: false,
        filterType: "select",
        filterKey: "can_read",
        filterOptions: YES_NO_OPTIONS,
        render: (row) => (row.can_read ? "Yes" : "No"),
      },
      {
        field: "can_update",
        label: "Update",
        sortable: false,
        filterType: "select",
        filterKey: "can_update",
        filterOptions: YES_NO_OPTIONS,
        render: (row) => (row.can_update ? "Yes" : "No"),
      },
      {
        field: "can_delete",
        label: "Delete",
        sortable: false,
        filterType: "select",
        filterKey: "can_delete",
        filterOptions: YES_NO_OPTIONS,
        render: (row) => (row.can_delete ? "Yes" : "No"),
      },
      {
        field: "listing_criteria",
        label: "Listing Criteria",
        sortable: false,
        filterType: "select",
        filterKey: "listing_criteria",
        filterOptions: LISTING_CRITERIA_OPTIONS,
        render: (row) => (row.listing_criteria === "my_team" ? "My Team" : "All"),
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        isActionColumn: true,
        render: (row, reload, perms) => (
          <div className="flex gap-2">
            {(perms || currentPerm).can_read && (
              <Link href={`/role-module/${row.id}`}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  title="View"
                  aria-label="View"
                >
                  <IconEye className="size-4" />
                </Button>
              </Link>
            )}
            {(perms || currentPerm).can_update && (
              <Link href={`/role-module/edit?id=${row.id}`}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  title="Edit"
                  aria-label="Edit"
                >
                  <IconPencil className="size-4" />
                </Button>
              </Link>
            )}
            {(perms || currentPerm).can_delete && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => {
                  setLinkToDelete({ id: row.id, reload });
                  setDeleteDialogOpen(true);
                }}
                title="Delete"
                aria-label="Delete"
              >
                <IconTrash className="size-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [currentPerm]
  );

  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      const blob = await roleModuleService.exportRoleModules(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `role-modules-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export role-modules");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const handleDeleteConfirm = async () => {
    if (!linkToDelete) return;
    setDeleting(true);
    try {
      await roleModuleService.deleteRoleModule(linkToDelete.id);
      toast.success("Role-Module link deleted");
      setDeleteDialogOpen(false);
      setLinkToDelete(null);
      if (linkToDelete.reload && typeof linkToDelete.reload === "function") linkToDelete.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Role - Module Links"
        addButtonLabel={currentPerm.can_create ? "Add Role-Module Links" : undefined}
        onAddClick={currentPerm.can_create ? () => router.push("/role-module/add") : undefined}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <PaginatedTable
          columns={columns}
          fetcher={fetcher}
          showSearch={false}
          showPagination={false}
          onTotalChange={setTotalCount}
          columnFilterValues={columnFilterValues}
          onColumnFilterChange={handleColumnFilterChange}
          filterParams={{ q: undefined, ...filterParams }}
          page={page}
          limit={limit}
          q={q}
          sortBy={sortBy || "id"}
          sortOrder={sortOrder || "DESC"}
          onPageChange={(zeroBased) => setPage(zeroBased + 1)}
          onRowsPerPageChange={setLimit}
          onQChange={setQ}
          onSortChange={setSort}
          height="calc(100vh - 200px)"
        />
        <PaginationControls
          page={page - 1}
          rowsPerPage={limit}
          totalCount={totalCount}
          onPageChange={(zeroBased) => setPage(zeroBased + 1)}
          onRowsPerPageChange={setLimit}
          rowsPerPageOptions={[20, 50, 100, 200]}
        />
      </ListingPageContainer>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setLinkToDelete(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this role-module link? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm} disabled={deleting} loading={deleting}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}
