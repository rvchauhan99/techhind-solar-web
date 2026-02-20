"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { IconTrash, IconEye, IconPencil } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
import Loader from "@/components/common/Loader";
import productService from "@/services/productService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import ProductForm from "./components/ProductForm";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatCurrency } from "@/utils/dataTableUtils";
import { DIALOG_FORM_LARGE } from "@/utils/formConstants";

const COLUMN_FILTER_KEYS = [
  "product_name",
  "product_name_op",
  "product_type_name",
  "product_make_name",
  "hsn_ssn_code",
  "measurement_unit_name",
  "capacity",
  "capacity_op",
  "capacity_to",
  "purchase_price",
  "purchase_price_op",
  "purchase_price_to",
  "selling_price",
  "selling_price_op",
  "selling_price_to",
  "mrp",
  "mrp_op",
  "mrp_to",
  "gst_percent",
  "gst_percent_op",
  "gst_percent_to",
  "min_stock_quantity",
  "min_stock_quantity_op",
  "min_stock_quantity_to",
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

export default function ProductPage() {
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [tableKey, setTableKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback(
    (key, value) => setFilter(key, value),
    [setFilter]
  );

  const handleOpenEditModal = useCallback(async (id) => {
    setLoadingRecord(true);
    setServerError(null);
    try {
      const response = await productService.getProductById(id);
      const result = response.result || response;
      setSelectedProduct(result);
      setShowEditModal(true);
    } catch (error) {
      console.error("Error fetching product:", error);
      setServerError("Failed to load product");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleOpenSidebar = useCallback(async (id) => {
    setLoadingRecord(true);
    try {
      const response = await productService.getProductById(id);
      const result = response.result || response;
      setSelectedProduct(result);
      setSidebarOpen(true);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedProduct(null);
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      exportParams.visibility = filters.visibility || "active";
      const blob = await productService.exportProducts(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export products");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const filterParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      ),
    [filters]
  );

  const columns = useMemo(
    () => [
      {
        field: "_status",
        label: "Status",
        sortable: false,
        filterType: "select",
        filterKey: "visibility",
        filterOptions: VISIBILITY_OPTIONS,
        render: (row) => (row.is_active ? "Active" : "Inactive"),
      },
      {
        field: "product_type_name",
        label: "Product Type",
        sortable: false,
        filterType: "text",
        filterKey: "product_type_name",
        defaultFilterOperator: "contains",
      },
      {
        field: "product_make_name",
        label: "Product Make",
        sortable: false,
        filterType: "text",
        filterKey: "product_make_name",
        defaultFilterOperator: "contains",
      },
      {
        field: "product_name",
        label: "Product Name",
        sortable: true,
        filterType: "text",
        filterKey: "product_name",
        defaultFilterOperator: "contains",
      },
      {
        field: "hsn_ssn_code",
        label: "HSN/SSN Code",
        sortable: false,
        filterType: "text",
        filterKey: "hsn_ssn_code",
        defaultFilterOperator: "contains",
      },
      {
        field: "measurement_unit_name",
        label: "Unit",
        sortable: false,
        filterType: "text",
        filterKey: "measurement_unit_name",
        defaultFilterOperator: "contains",
      },
      {
        field: "capacity",
        label: "Capacity",
        sortable: true,
        filterType: "number",
        filterKey: "capacity",
        filterKeyTo: "capacity_to",
        operatorKey: "capacity_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "purchase_price",
        label: "Purchase Price",
        sortable: true,
        filterType: "number",
        filterKey: "purchase_price",
        filterKeyTo: "purchase_price_to",
        operatorKey: "purchase_price_op",
        defaultFilterOperator: "equals",
        render: (row) => formatCurrency(row.purchase_price),
      },
      {
        field: "min_purchase_price",
        label: "Min Purchase",
        sortable: true,
        render: (row) => formatCurrency(row.min_purchase_price),
      },
      {
        field: "avg_purchase_price",
        label: "Avg Purchase",
        sortable: true,
        render: (row) => formatCurrency(row.avg_purchase_price),
      },
      {
        field: "max_purchase_price",
        label: "Max Purchase",
        sortable: true,
        render: (row) => formatCurrency(row.max_purchase_price),
      },
      {
        field: "selling_price",
        label: "Selling Price",
        sortable: true,
        filterType: "number",
        filterKey: "selling_price",
        filterKeyTo: "selling_price_to",
        operatorKey: "selling_price_op",
        defaultFilterOperator: "equals",
        render: (row) => formatCurrency(row.selling_price),
      },
      {
        field: "mrp",
        label: "MRP",
        sortable: true,
        filterType: "number",
        filterKey: "mrp",
        filterKeyTo: "mrp_to",
        operatorKey: "mrp_op",
        defaultFilterOperator: "equals",
        render: (row) => formatCurrency(row.mrp),
      },
      {
        field: "gst_percent",
        label: "GST %",
        sortable: true,
        filterType: "number",
        filterKey: "gst_percent",
        filterKeyTo: "gst_percent_to",
        operatorKey: "gst_percent_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "min_stock_quantity",
        label: "Min Stock",
        sortable: true,
        filterType: "number",
        filterKey: "min_stock_quantity",
        filterKeyTo: "min_stock_quantity_to",
        operatorKey: "min_stock_quantity_op",
        defaultFilterOperator: "equals",
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
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => handleOpenSidebar(row.id)}
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
                onClick={(e) => {
                  e.stopPropagation();
                  setProductToDelete(row);
                  setShowDeleteDialog(true);
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
    [handleOpenEditModal, handleOpenSidebar]
  );

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const response = await productService.getProducts({
        page: p.page,
        limit: p.limit,
        q: p.q || undefined,
        sortBy: p.sortBy || "id",
        sortOrder: p.sortOrder || "DESC",
        product_name: p.product_name || undefined,
        product_name_op: p.product_name_op || undefined,
        product_type_name: p.product_type_name || undefined,
        product_make_name: p.product_make_name || undefined,
        hsn_ssn_code: p.hsn_ssn_code || undefined,
        measurement_unit_name: p.measurement_unit_name || undefined,
        capacity: p.capacity || undefined,
        capacity_op: p.capacity_op || undefined,
        capacity_to: p.capacity_to || undefined,
        purchase_price: p.purchase_price || undefined,
        purchase_price_op: p.purchase_price_op || undefined,
        purchase_price_to: p.purchase_price_to || undefined,
        selling_price: p.selling_price || undefined,
        selling_price_op: p.selling_price_op || undefined,
        selling_price_to: p.selling_price_to || undefined,
        mrp: p.mrp || undefined,
        mrp_op: p.mrp_op || undefined,
        mrp_to: p.mrp_to || undefined,
        gst_percent: p.gst_percent || undefined,
        gst_percent_op: p.gst_percent_op || undefined,
        gst_percent_to: p.gst_percent_to || undefined,
        min_stock_quantity: p.min_stock_quantity || undefined,
        min_stock_quantity_op: p.min_stock_quantity_op || undefined,
        min_stock_quantity_to: p.min_stock_quantity_to || undefined,
        is_active: p.is_active !== undefined && p.is_active !== "" ? p.is_active : undefined,
        visibility: p.visibility || "active",
      });
      const result = response.result || response;
      return {
        data: result.data || [],
        meta: result.meta || { total: 0, page: params?.page, pages: 0, limit: params?.limit },
      };
    },
    [tableKey]
  );

  const handleOpenAddModal = () => {
    setShowAddModal(true);
    setServerError(null);
    setSelectedProduct(null);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setServerError(null);
    setSelectedProduct(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedProduct(null);
    setServerError(null);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      if (selectedProduct?.id) {
        await productService.updateProduct(selectedProduct.id, payload);
        handleCloseEditModal();
        toast.success("Product updated successfully");
      } else {
        await productService.createProduct(payload);
        handleCloseAddModal();
        toast.success("Product created successfully");
      }
      setTableKey((prev) => prev + 1);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || "Failed to save product";
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      await productService.deleteProduct(productToDelete.id);
      setTableKey((prev) => prev + 1);
      setShowDeleteDialog(false);
      setProductToDelete(null);
      toast.success(`Product "${productToDelete.product_name}" deactivated successfully`);
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || "Failed to deactivate product";
      toast.error(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const sidebarContent = useMemo(() => {
    if (loadingRecord) {
      return (
        <div className="flex min-h-[200px] items-center justify-center">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      );
    }
    if (!selectedProduct) return null;
    const p = selectedProduct;
    return (
      <div className="pr-1 space-y-3">
        <p className="font-semibold">{p.product_name}</p>
        <p className="text-xs text-muted-foreground">{p.product_type_name} · {p.product_make_name}</p>
        <hr className="border-border" />
        <p className="text-xs font-semibold text-muted-foreground">Details</p>
        <p className="text-sm">HSN: {p.hsn_ssn_code || "-"}</p>
        <p className="text-sm">Unit: {p.measurement_unit_name || "-"}</p>
        {p.capacity != null && <p className="text-sm">Capacity: {p.capacity}</p>}
        <p className="text-sm">Tracking: {p.tracking_type || "LOT"}</p>
        <p className="text-sm">Active: {p.is_active ? "Yes" : "No"}</p>
        <hr className="border-border" />
        <p className="text-xs font-semibold text-muted-foreground">Pricing</p>
        <p className="text-sm">Purchase: {formatCurrency(p.purchase_price)}</p>
        <p className="text-sm">Min Purchase: {formatCurrency(p.min_purchase_price)}</p>
        <p className="text-sm">Avg Purchase: {formatCurrency(p.avg_purchase_price)}</p>
        <p className="text-sm">Max Purchase: {formatCurrency(p.max_purchase_price)}</p>
        <p className="text-sm">Selling: {formatCurrency(p.selling_price)}</p>
        <p className="text-sm">MRP: {formatCurrency(p.mrp)}</p>
        <p className="text-sm">GST: {p.gst_percent != null ? `${p.gst_percent}%` : "-"}</p>
        <p className="text-sm">Min Stock: {p.min_stock_quantity ?? "-"}</p>
        {p.product_description && (
          <>
            <hr className="border-border" />
            <p className="text-xs font-semibold text-muted-foreground">Description</p>
            <p className="text-sm">{p.product_description}</p>
          </>
        )}
      </div>
    );
  }, [loadingRecord, selectedProduct]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Products"
        addButtonLabel={currentPerm.can_create ? "Add Product" : undefined}
        onAddClick={currentPerm.can_create ? handleOpenAddModal : undefined}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          moduleKey="product"
          height="calc(100vh - 200px)"
          showSearch={false}
          showPagination={false}
          onTotalChange={setTotalCount}
          columnFilterValues={columnFilterValues}
          onColumnFilterChange={handleColumnFilterChange}
          filterParams={{ q: undefined, ...filterParams }}
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
        title="Product Details"
      >
        {sidebarContent}
      </DetailsSidebar>

      <Dialog open={showAddModal} onOpenChange={(open) => !open && handleCloseAddModal()}>
        <DialogContent className={DIALOG_FORM_LARGE}>
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <ProductForm
              hideActions
              onSubmit={handleSubmit}
              loading={submitting}
              serverError={serverError}
              onClearServerError={() => setServerError(null)}
            />
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" size="sm" onClick={handleCloseAddModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={submitting}
              onClick={() => document.getElementById("product-form")?.requestSubmit()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={(open) => !open && handleCloseEditModal()}>
        <DialogContent className={DIALOG_FORM_LARGE}>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {loadingRecord ? (
            <div className="flex flex-1 min-h-[200px] items-center justify-center">
              <Loader />
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <ProductForm
                  hideActions
                  defaultValues={selectedProduct}
                  onSubmit={handleSubmit}
                  loading={submitting}
                  serverError={serverError}
                  onClearServerError={() => setServerError(null)}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button variant="outline" size="sm" onClick={handleCloseEditModal}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  loading={submitting}
                  onClick={() => document.getElementById("product-form")?.requestSubmit()}
                >
                  Update
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={(open) => !open && (setShowDeleteDialog(false), setProductToDelete(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deactivate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate the product{" "}
              <strong>&quot;{productToDelete?.product_name}&quot;</strong>? The product will be
              hidden from active lists but can be reactivated later from the edit form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="sm"
              loading={deleting}
              onClick={handleDeleteConfirm}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}
