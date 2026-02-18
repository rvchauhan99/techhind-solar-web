"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import billOfMaterialService from "@/services/billOfMaterialService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import BillOfMaterialForm from "./components/BillOfMaterialForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
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
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { DIALOG_FORM_LARGE } from "@/utils/formConstants";
import { IconEye, IconPencil, IconTrash } from "@tabler/icons-react";

const COLUMN_FILTER_KEYS = [
  "code",
  "code_op",
  "name",
  "name_op",
  "description",
  "description_op",
  "visibility",
];

const VISIBILITY_OPTIONS = [
  { value: "active", label: "Yes" },
  { value: "inactive", label: "No" },
  { value: "all", label: "All" },
];

export default function BillOfMaterialPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } =
    listingState;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [tableKey, setTableKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bomToDelete, setBomToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback(
    (key, value) => setFilter(key, value),
    [setFilter]
  );

  const filterParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      ),
    [filters]
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      exportParams.visibility = filters.visibility || "active";
      const blob = await billOfMaterialService.exportBillOfMaterials(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bill-of-materials-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const handleDeleteConfirm = async () => {
    if (!bomToDelete) return;
    setDeleting(true);
    try {
      await billOfMaterialService.deleteBillOfMaterial(bomToDelete.id);
      setTableKey((prev) => prev + 1);
      toast.success("Bill of Material deleted");
      setDeleteDialogOpen(false);
      setBomToDelete(null);
      if (bomToDelete.reload && typeof bomToDelete.reload === "function") bomToDelete.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenAddModal = () => {
    setShowAddModal(true);
    setServerError(null);
    setSelectedBOM(null);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setServerError(null);
    setSelectedBOM(null);
  };

  const handleOpenEditModal = useCallback(async (id) => {
    setLoadingRecord(true);
    setServerError(null);
    try {
      const response = await billOfMaterialService.getBillOfMaterialById(id);
      const result = response.result || response;
      setSelectedBOM(result);
      setShowEditModal(true);
    } catch (error) {
      console.error("Error fetching Bill of Material:", error);
      setServerError("Failed to load Bill of Material");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedBOM(null);
    setServerError(null);
  };

  const handleOpenSidebar = useCallback((row) => {
    setSelectedRow(row);
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRow(null);
  }, []);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      if (selectedBOM?.id) {
        await billOfMaterialService.updateBillOfMaterial(selectedBOM.id, payload);
        handleCloseEditModal();
        toast.success("Bill of Material updated");
      } else {
        await billOfMaterialService.createBillOfMaterial(payload);
        handleCloseAddModal();
        toast.success("Bill of Material created");
      }
      setTableKey((prev) => prev + 1);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || "Failed to save Bill of Material";
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "_status",
        label: "Status",
        sortable: false,
        filterType: "select",
        filterKey: "visibility",
        filterOptions: VISIBILITY_OPTIONS,
        render: (row) => (row.deleted_at ? "Inactive" : "Active"),
      },
      {
        field: "code",
        label: "Code",
        sortable: true,
        filterType: "text",
        filterKey: "code",
        defaultFilterOperator: "contains",
      },
      {
        field: "name",
        label: "Name",
        sortable: true,
        filterType: "text",
        filterKey: "name",
        defaultFilterOperator: "contains",
      },
      {
        field: "description",
        label: "Description",
        sortable: false,
        filterType: "text",
        filterKey: "description",
        defaultFilterOperator: "contains",
      },
      {
        field: "number_of_products",
        label: "Number of Products",
        sortable: false,
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        isActionColumn: true,
        render: (row, reload, perms) => (
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => handleOpenSidebar(row)}
              title="View"
              aria-label="View"
            >
              <IconEye className="size-4" />
            </Button>
            {(perms || currentPerm)?.can_update && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => handleOpenEditModal(row.id)}
                title="Edit"
                aria-label="Edit"
              >
                <IconPencil className="size-4" />
              </Button>
            )}
            {(perms || currentPerm)?.can_delete && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => {
                  setBomToDelete({ id: row.id, reload });
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
    [handleOpenEditModal, handleOpenSidebar, currentPerm]
  );

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const response = await billOfMaterialService.getBillOfMaterials({
        page: p.page,
        limit: p.limit,
        q: p.q || undefined,
        sortBy: p.sortBy || "id",
        sortOrder: p.sortOrder || "DESC",
        code: p.code || undefined,
        code_op: p.code_op || undefined,
        name: p.name || undefined,
        name_op: p.name_op || undefined,
        description: p.description || undefined,
        description_op: p.description_op || undefined,
        visibility: p.visibility || "active",
      });
      const result = response?.result || response;
      return {
        data: result?.data || [],
        meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
      };
    },
    [tableKey]
  );

  const sidebarContent = useMemo(() => {
    if (!selectedRow) return null;
    const r = selectedRow;
    return (
      <div className="pr-1 space-y-3">
        <p className="font-semibold">{r.code ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Name</p>
        <p className="text-sm">{r.name ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Description</p>
        <p className="text-sm">{r.description ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Number of Products</p>
        <p className="text-sm">{r.number_of_products ?? "-"}</p>
      </div>
    );
  }, [selectedRow]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Bill of Materials"
        addButtonLabel={currentPerm.can_create ? "Add Bill of Material" : undefined}
        onAddClick={currentPerm.can_create ? handleOpenAddModal : undefined}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <PaginatedTable
            key={tableKey}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            showPagination={false}
            height="calc(100vh - 200px)"
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
          />
          <PaginationControls
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            rowsPerPageOptions={[20, 50, 100, 200]}
          />
        </div>

        <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="BOM Details">
          {sidebarContent}
        </DetailsSidebar>

        <Dialog open={showAddModal} onOpenChange={(open) => !open && handleCloseAddModal()}>
          <DialogContent className={DIALOG_FORM_LARGE} showCloseButton={true}>
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-base font-semibold">Add Bill of Material</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <BillOfMaterialForm
                onSubmit={handleSubmit}
                loading={submitting}
                serverError={serverError}
                onClearServerError={() => setServerError(null)}
                onCancel={handleCloseAddModal}
              />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditModal} onOpenChange={(open) => !open && handleCloseEditModal()}>
          <DialogContent className={DIALOG_FORM_LARGE} showCloseButton={true}>
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-base font-semibold">Edit Bill of Material</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {loadingRecord ? (
                <div className="flex justify-center items-center min-h-[200px]">
                  <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <BillOfMaterialForm
                  defaultValues={selectedBOM}
                  onSubmit={handleSubmit}
                  loading={submitting}
                  serverError={serverError}
                  onClearServerError={() => setServerError(null)}
                  onCancel={handleCloseEditModal}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setBomToDelete(null); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Bill of Material</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this Bill of Material? This action cannot be undone.
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
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
