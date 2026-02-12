"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import projectPriceService from "@/services/projectPriceService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import ProjectPriceForm from "./components/ProjectPriceForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
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
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants";
import { IconEye, IconPencil, IconTrash } from "@tabler/icons-react";

const COLUMN_FILTER_KEYS = [
  "state_name",
  "state_name_op",
  "project_for_name",
  "project_for_name_op",
  "order_type_name",
  "order_type_name_op",
  "bill_of_material_name",
  "bill_of_material_name_op",
  "project_capacity",
  "project_capacity_op",
  "project_capacity_to",
  "total_project_value",
  "total_project_value_op",
  "total_project_value_to",
  "system_warranty",
  "system_warranty_op",
  "is_locked",
  "visibility",
];

const IS_LOCKED_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const VISIBILITY_OPTIONS = [
  { value: "active", label: "Yes" },
  { value: "inactive", label: "No" },
  { value: "all", label: "All" },
];

export default function ProjectPricePage() {
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
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [tableKey, setTableKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [priceToDelete, setPriceToDelete] = useState(null);
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
      const blob = await projectPriceService.exportProjectPrices(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-prices-${new Date().toISOString().split("T")[0]}.xlsx`;
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
    if (!priceToDelete) return;
    setDeleting(true);
    try {
      await projectPriceService.deleteProjectPrice(priceToDelete.id);
      setTableKey((prev) => prev + 1);
      toast.success("Project price deleted");
      setDeleteDialogOpen(false);
      setPriceToDelete(null);
      if (priceToDelete.reload && typeof priceToDelete.reload === "function") priceToDelete.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenAddModal = () => {
    setShowAddModal(true);
    setServerError(null);
    setSelectedRecord(null);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setServerError(null);
    setSelectedRecord(null);
  };

  const handleOpenEditModal = useCallback(async (id) => {
    setLoadingRecord(true);
    setServerError(null);
    try {
      const response = await projectPriceService.getProjectPriceById(id);
      const result = response.result || response;
      setSelectedRecord(result);
      setShowEditModal(true);
    } catch (error) {
      console.error("Error fetching project price:", error);
      setServerError("Failed to load project price");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedRecord(null);
    setServerError(null);
  };

  const handleOpenSidebar = useCallback((row) => {
    setSelectedPrice(row);
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedPrice(null);
  }, []);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      if (selectedRecord?.id) {
        await projectPriceService.updateProjectPrice(selectedRecord.id, payload);
        handleCloseEditModal();
        toast.success("Project price updated");
      } else {
        await projectPriceService.createProjectPrice(payload);
        handleCloseAddModal();
        toast.success("Project price created");
      }
      setTableKey((prev) => prev + 1);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to save project price";
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
        field: "state_name",
        label: "State",
        sortable: false,
        filterType: "text",
        filterKey: "state_name",
        defaultFilterOperator: "contains",
      },
      {
        field: "project_for_name",
        label: "Project For",
        sortable: false,
        filterType: "text",
        filterKey: "project_for_name",
        defaultFilterOperator: "contains",
      },
      {
        field: "order_type_name",
        label: "Order Type",
        sortable: false,
        filterType: "text",
        filterKey: "order_type_name",
        defaultFilterOperator: "contains",
      },
      {
        field: "bill_of_material_name",
        label: "BOM",
        sortable: false,
        filterType: "text",
        filterKey: "bill_of_material_name",
        defaultFilterOperator: "contains",
      },
      {
        field: "project_capacity",
        label: "Capacity (kW)",
        sortable: true,
        filterType: "number",
        filterKey: "project_capacity",
        filterKeyTo: "project_capacity_to",
        operatorKey: "project_capacity_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "total_project_value",
        label: "Total Value",
        sortable: true,
        filterType: "number",
        filterKey: "total_project_value",
        filterKeyTo: "total_project_value_to",
        operatorKey: "total_project_value_op",
        defaultFilterOperator: "equals",
        render: (row) =>
          row.total_project_value != null
            ? `₹${Number(row.total_project_value).toLocaleString()}`
            : "-",
      },
      {
        field: "system_warranty",
        label: "System Warranty",
        sortable: false,
        filterType: "text",
        filterKey: "system_warranty",
        defaultFilterOperator: "contains",
      },
      {
        field: "is_locked",
        label: "Locked",
        sortable: true,
        filterType: "select",
        filterKey: "is_locked",
        filterOptions: IS_LOCKED_OPTIONS,
        render: (row) => (row.is_locked ? "Yes" : "No"),
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
            {perms?.can_update && (
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
            {perms?.can_delete && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => {
                  setPriceToDelete({ id: row.id, reload });
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
    [handleOpenEditModal, handleOpenSidebar]
  );

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const response = await projectPriceService.getProjectPrices({
        page: p.page,
        limit: p.limit,
        q: p.q || undefined,
        sortBy: p.sortBy || "created_at",
        sortOrder: p.sortOrder || "DESC",
        state_name: p.state_name || undefined,
        project_for_name: p.project_for_name || undefined,
        order_type_name: p.order_type_name || undefined,
        bill_of_material_name: p.bill_of_material_name || undefined,
        project_capacity: p.project_capacity || undefined,
        project_capacity_op: p.project_capacity_op || undefined,
        project_capacity_to: p.project_capacity_to || undefined,
        total_project_value: p.total_project_value || undefined,
        total_project_value_op: p.total_project_value_op || undefined,
        total_project_value_to: p.total_project_value_to || undefined,
        system_warranty: p.system_warranty || undefined,
        is_locked: p.is_locked !== undefined && p.is_locked !== "" ? p.is_locked : undefined,
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
    if (!selectedPrice) return null;
    const r = selectedPrice;
    return (
      <div className="pr-1 space-y-3">
        <p className="font-semibold">{r.state_name ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Project For</p>
        <p className="text-sm">{r.project_for_name ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Order Type</p>
        <p className="text-sm">{r.order_type_name ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">BOM</p>
        <p className="text-sm">{r.bill_of_material_name ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Capacity (kW)</p>
        <p className="text-sm">{r.project_capacity ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Total Value</p>
        <p className="text-sm">
          {r.total_project_value != null
            ? `₹${Number(r.total_project_value).toLocaleString()}`
            : "-"}
        </p>
        <p className="text-xs font-semibold text-muted-foreground">System Warranty</p>
        <p className="text-sm">{r.system_warranty ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Locked</p>
        <p className="text-sm">{r.is_locked ? "Yes" : "No"}</p>
      </div>
    );
  }, [selectedPrice]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Project Prices"
        addButtonLabel={currentPerm.can_create ? "Add Project Price" : undefined}
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
            sortBy={sortBy || "created_at"}
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

        <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Project Price Details">
          {sidebarContent}
        </DetailsSidebar>

        <Dialog open={showAddModal} onOpenChange={(open) => !open && handleCloseAddModal()}>
          <DialogContent className={DIALOG_FORM_MEDIUM}>
            <DialogHeader>
              <DialogTitle>Add Project Price</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ProjectPriceForm
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
          <DialogContent className={DIALOG_FORM_MEDIUM}>
            <DialogHeader>
              <DialogTitle>Edit Project Price</DialogTitle>
            </DialogHeader>
            {loadingRecord ? (
              <div className="flex justify-center items-center min-h-[200px]">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <ProjectPriceForm
                  defaultValues={selectedRecord}
                  onSubmit={handleSubmit}
                  loading={submitting}
                  serverError={serverError}
                  onClearServerError={() => setServerError(null)}
                  onCancel={handleCloseEditModal}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setPriceToDelete(null); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project Price</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this project price? This action cannot be undone.
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
