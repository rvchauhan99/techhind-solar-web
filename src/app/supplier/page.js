"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { IconTrash, IconPencil } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
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
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants";
import supplierService from "@/services/supplierService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import SupplierForm from "./components/SupplierForm";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";

const COLUMN_FILTER_KEYS = [
  "supplier_code",
  "supplier_code_op",
  "supplier_name",
  "supplier_name_op",
  "contact_person",
  "contact_person_op",
  "phone",
  "phone_op",
  "email",
  "email_op",
  "state_name",
  "state_name_op",
  "gstin",
  "gstin_op",
  "is_active",
  "visibility",
];

const IS_ACTIVE_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const VISIBILITY_OPTIONS = [
  { value: "active", label: "Yes" },
  { value: "inactive", label: "No" },
  { value: "all", label: "All" },
];

export default function SupplierPage() {
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
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [supplierToDeactivate, setSupplierToDeactivate] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [tableKey, setTableKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      exportParams.visibility = filters.visibility || "active";
      const blob = await supplierService.exportSuppliers(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `suppliers-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export suppliers");
    } finally {
      setExporting(false);
    }
  }, [filters]);
  const handleColumnFilterChange = useCallback(
    (key, value) => setFilter(key, value),
    [setFilter]
  );

  const handleOpenEditModal = useCallback(async (id) => {
    setLoadingRecord(true);
    setServerError(null);
    try {
      const response = await supplierService.getSupplierById(id);
      const result = response.result || response;
      setSelectedSupplier(result);
      setShowEditModal(true);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      setServerError("Failed to load supplier");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleOpenSidebar = useCallback(async (id) => {
    setLoadingRecord(true);
    try {
      const response = await supplierService.getSupplierById(id);
      const result = response.result || response;
      setSelectedSupplier(result);
      setSidebarOpen(true);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      toast.error("Failed to load supplier");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedSupplier(null);
  }, []);

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
        field: "supplier_code",
        label: "Supplier Code",
        sortable: true,
        filterType: "text",
        filterKey: "supplier_code",
        defaultFilterOperator: "contains",
      },
      {
        field: "supplier_name",
        label: "Supplier Name",
        sortable: true,
        filterType: "text",
        filterKey: "supplier_name",
        defaultFilterOperator: "contains",
      },
      {
        field: "contact_person",
        label: "Contact Person",
        sortable: false,
        filterType: "text",
        filterKey: "contact_person",
        defaultFilterOperator: "contains",
      },
      {
        field: "phone",
        label: "Phone",
        sortable: false,
        filterType: "text",
        filterKey: "phone",
        defaultFilterOperator: "contains",
      },
      {
        field: "email",
        label: "Email",
        sortable: false,
        filterType: "text",
        filterKey: "email",
        defaultFilterOperator: "contains",
      },
      {
        field: "state",
        label: "State",
        sortable: false,
        filterType: "text",
        filterKey: "state_name",
        defaultFilterOperator: "contains",
        render: (row) => row.state_name || row.state?.name || "-",
      },
      {
        field: "gstin",
        label: "GSTIN",
        sortable: false,
        filterType: "text",
        filterKey: "gstin",
        defaultFilterOperator: "contains",
      },
      {
        field: "is_active",
        label: "Active",
        sortable: true,
        filterType: "select",
        filterKey: "is_active",
        filterOptions: IS_ACTIVE_OPTIONS,
        render: (row) => (row.is_active ? "Yes" : "No"),
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        isActionColumn: true,
        render: (row, reload, perms) => (
          <div className="flex gap-2">
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
                onClick={(e) => {
                  e.stopPropagation();
                  setSupplierToDeactivate(row);
                  setShowDeactivateDialog(true);
                }}
                title="Deactivate"
                aria-label="Deactivate"
              >
                <IconTrash className="size-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [handleOpenEditModal]
  );

  const filterParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      ),
    [filters]
  );

  const fetcher = useMemo(
    () => async (params) => {
      const {
        page: p,
        limit: l,
        q: searchQ,
        sortBy: sBy,
        sortOrder: sOrder,
        supplier_code: supplierCode,
        supplier_code_op: supplierCodeOp,
        supplier_name: supplierName,
        supplier_name_op: supplierNameOp,
        contact_person,
        phone,
        email,
        state_name,
        gstin,
        is_active,
      } = params;
      const response = await supplierService.getSuppliers({
        page: p,
        limit: l,
        q: searchQ || undefined,
        sortBy: sBy || "id",
        sortOrder: sOrder || "DESC",
        supplier_code: supplierCode || undefined,
        supplier_code_op: supplierCodeOp || undefined,
        supplier_name: supplierName || undefined,
        supplier_name_op: supplierNameOp || undefined,
        contact_person: contact_person || undefined,
        phone: phone || undefined,
        email: email || undefined,
        state_name: state_name || undefined,
        gstin: gstin || undefined,
        is_active: is_active !== undefined && is_active !== "" ? is_active : undefined,
        visibility: params.visibility || "active",
      });
      const result = response.result || response;
      return {
        data: result.data || [],
        meta: result.meta || { total: 0, page: p, pages: 0, limit: l },
      };
    },
    [tableKey]
  );

  const handleOpenAddModal = () => {
    setShowAddModal(true);
    setServerError(null);
    setSelectedSupplier(null);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setServerError(null);
    setSelectedSupplier(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedSupplier(null);
    setServerError(null);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      if (selectedSupplier?.id) {
        await supplierService.updateSupplier(selectedSupplier.id, payload);
        handleCloseEditModal();
        toast.success("Supplier updated successfully");
      } else {
        await supplierService.createSupplier(payload);
        handleCloseAddModal();
        toast.success("Supplier created successfully");
      }
      setTableKey((prev) => prev + 1);
    } catch (error) {
      console.error("Save error:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Failed to save supplier";
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateConfirm = async () => {
    if (!supplierToDeactivate) return;

    setDeactivating(true);
    try {
      await supplierService.deleteSupplier(supplierToDeactivate.id);
      setTableKey((prev) => prev + 1);
      setShowDeactivateDialog(false);
      const name = supplierToDeactivate.supplier_name;
      setSupplierToDeactivate(null);
      toast.success(`Supplier "${name}" deactivated successfully`);
    } catch (error) {
      console.error("Deactivate error:", error);
      const errorMsg =
        error.response?.data?.message || error.message || "Failed to deactivate supplier";
      toast.error(errorMsg);
    } finally {
      setDeactivating(false);
    }
  };

  const handleDeactivateCancel = () => {
    setShowDeactivateDialog(false);
    setSupplierToDeactivate(null);
  };

  const sidebarContent = useMemo(() => {
    if (loadingRecord) {
      return (
        <div className="flex min-h-[200px] items-center justify-center">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      );
    }
    if (!selectedSupplier) return null;
    const s = selectedSupplier;
    return (
      <div className="pr-1 space-y-3">
        <p className="font-semibold">{s.supplier_code}</p>
        <p className="text-sm">{s.supplier_name}</p>
        {s.contact_person && (
          <>
            <p className="text-xs font-semibold text-muted-foreground">Contact</p>
            <p className="text-sm">{s.contact_person}</p>
          </>
        )}
        {s.phone && (
          <p className="text-sm">Phone: {s.phone}</p>
        )}
        {s.email && (
          <p className="text-sm">Email: {s.email}</p>
        )}
        {s.gstin && (
          <p className="text-sm">GSTIN: {s.gstin}</p>
        )}
        {s.address && (
          <p className="text-sm text-muted-foreground">{s.address}</p>
        )}
      </div>
    );
  }, [loadingRecord, selectedSupplier]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Suppliers"
        addButtonLabel={currentPerm.can_create ? "Add Supplier" : undefined}
        onAddClick={currentPerm.can_create ? handleOpenAddModal : undefined}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          moduleKey="supplier"
          height="calc(100vh - 200px)"
          showSearch={false}
          showPagination={false}
          onTotalChange={setTotalCount}
          columnFilterValues={columnFilterValues}
          onColumnFilterChange={handleColumnFilterChange}
          filterParams={{ q: q || undefined, ...filterParams }}
          onRowClick={(row) => handleOpenSidebar(row.id)}
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
      </ListingPageContainer>

      <DetailsSidebar
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        title="Supplier Details"
      >
        {sidebarContent}
      </DetailsSidebar>

      <Dialog open={showAddModal} onOpenChange={(open) => !open && handleCloseAddModal()}>
        <DialogContent className={DIALOG_FORM_MEDIUM}>
          <div className="pb-2">
            <DialogTitle>Add Supplier</DialogTitle>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <SupplierForm
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
          <div className="pb-2">
            <DialogTitle>Edit Supplier</DialogTitle>
          </div>
          {loadingRecord ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <SupplierForm
                defaultValues={selectedSupplier}
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

      <AlertDialog open={showDeactivateDialog} onOpenChange={(open) => !open && handleDeactivateCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deactivate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate the supplier{" "}
              <strong>&quot;{supplierToDeactivate?.supplier_name}&quot;</strong>? The supplier will
              be hidden from the active list but can be viewed under inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="sm"
              loading={deactivating}
              onClick={handleDeactivateConfirm}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}
