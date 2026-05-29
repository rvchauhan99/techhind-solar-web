"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import userOrderCommissionRateService from "@/services/userOrderCommissionRateService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import UserOrderCommissionRateForm from "./components/UserOrderCommissionRateForm";
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
import { DIALOG_FORM_XL } from "@/utils/formConstants";
import { cn } from "@/lib/utils";
import { IconEye, IconPencil, IconTrash, IconDownload, IconUpload } from "@tabler/icons-react";

const PERMISSION_MODULE_KEY = "/user-order-commission-rates";

function findModuleRecursive(list, matchPredicate) {
  for (const mod of list || []) {
    if (matchPredicate(mod)) return mod;
    if (mod.submodules?.length) {
      const found = findModuleRecursive(mod.submodules, matchPredicate);
      if (found) return found;
    }
  }
  return null;
}

function findModuleByPermissionKey(modules, moduleKey) {
  const matchPredicate = (m) => {
    if (!m) return false;
    const key = m.key || "";
    return (
      key === moduleKey ||
      m.route === moduleKey ||
      key === moduleKey.replace(/[-\s]/g, "_") ||
      key === moduleKey.replace(/\//g, "_")
    );
  };
  return findModuleRecursive(modules, matchPredicate);
}

const COLUMN_FILTER_KEYS = [
  "user_id",
  "user_id_op",
  "order_type_id",
  "order_type_id_op",
  "branch_id",
  "branch_id_op",
];

function fmtDate(d) {
  if (d == null || d === "") return "-";
  const s = String(d);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function fmtRate(v) {
  if (v == null || v === "") return "-";
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "-";
}

function fmtCombinedFabInst(fab, inst) {
  const hasFab = fab != null && fab !== "";
  const hasInst = inst != null && inst !== "";
  if (!hasFab && !hasInst) return "-";
  const f = hasFab ? Number(fab) : 0;
  const i = hasInst ? Number(inst) : 0;
  const sum = (Number.isFinite(f) ? f : 0) + (Number.isFinite(i) ? i : 0);
  return Number.isFinite(sum) ? String(Math.round(sum * 10000) / 10000) : "-";
}

export default function UserOrderCommissionRatesPage() {
  const { user, modulePermissions, fetchPermissionForModule } = useAuth();
  const permModule = useMemo(
    () => findModuleByPermissionKey(user?.modules || [], PERMISSION_MODULE_KEY),
    [user?.modules]
  );

  useEffect(() => {
    if (permModule?.id) fetchPermissionForModule(permModule.id);
  }, [permModule?.id, fetchPermissionForModule]);

  const currentPerm = modulePermissions?.[permModule?.id] || {
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFileInputRef = useRef(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [tableKey, setTableKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarRow, setSidebarRow] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
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

  const handleExport = useCallback(async () => {
    if (!currentPerm.can_read) {
      toast.error("You do not have permission to export");
      return;
    }
    setExporting(true);
    try {
      const exportParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      const blob = await userOrderCommissionRateService.exportUserOrderCommissionRates(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `order-commission-rates-${new Date().toISOString().split("T")[0]}.csv`;
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
  }, [filters, currentPerm.can_read]);

  const handleSampleCsv = useCallback(async () => {
    try {
      const blob = await userOrderCommissionRateService.downloadCommissionRatesImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "order-commission-rates-sample.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Sample CSV downloaded");
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to download sample");
    }
  }, []);

  const handleDeleteConfirm = async () => {
    if (!rowToDelete) return;
    setDeleting(true);
    try {
      await userOrderCommissionRateService.deleteUserOrderCommissionRate(rowToDelete.id);
      setTableKey((prev) => prev + 1);
      toast.success("Commission rate deleted");
      setDeleteDialogOpen(false);
      setRowToDelete(null);
      if (rowToDelete.reload && typeof rowToDelete.reload === "function") rowToDelete.reload();
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
      const response = await userOrderCommissionRateService.getUserOrderCommissionRateById(id);
      const result = response.result || response;
      setSelectedRecord(result);
      setShowEditModal(true);
    } catch (error) {
      console.error("Error fetching commission rate:", error);
      setServerError("Failed to load commission rate");
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
    setSidebarRow(row);
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSidebarRow(null);
  }, []);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      if (selectedRecord?.id) {
        await userOrderCommissionRateService.updateUserOrderCommissionRate(selectedRecord.id, payload);
        handleCloseEditModal();
        toast.success("Commission rate updated");
      } else {
        await userOrderCommissionRateService.createUserOrderCommissionRate(payload);
        handleCloseAddModal();
        toast.success("Commission rate created");
      }
      setTableKey((prev) => prev + 1);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || "Failed to save commission rate";
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "user_name",
        label: "User ID",
        sortable: false,
        filterType: "number",
        filterKey: "user_id",
        operatorKey: "user_id_op",
        defaultFilterOperator: "equals",
        render: (row) => row.user_name ?? row.user_id ?? "-",
      },
      {
        field: "order_type_name",
        label: "Type ID",
        sortable: false,
        filterType: "number",
        filterKey: "order_type_id",
        operatorKey: "order_type_id_op",
        defaultFilterOperator: "equals",
        render: (row) => row.order_type_name ?? row.order_type_id ?? "-",
      },
      {
        field: "branch_name",
        label: "Branch ID",
        sortable: false,
        filterType: "number",
        filterKey: "branch_id",
        operatorKey: "branch_id_op",
        defaultFilterOperator: "equals",
        render: (row) => row.branch_name ?? row.branch_id ?? "-",
      },
      {
        field: "project_scheme_name",
        label: "Scheme",
        sortable: false,
        render: (row) => row.project_scheme_name ?? "-",
      },
      {
        field: "effective_from",
        label: "From",
        sortable: false,
        render: (row) => fmtDate(row.effective_from),
      },
      {
        field: "effective_to",
        label: "To",
        sortable: false,
        render: (row) => fmtDate(row.effective_to),
      },
      {
        field: "as_handled_by_per_kw",
        label: "HB/kW",
        sortable: false,
        render: (row) => fmtRate(row.as_handled_by_per_kw),
      },
      {
        field: "as_handled_by_per_kw_with_channel_partner",
        label: "HB+CP/kW",
        sortable: false,
        render: (row) => fmtRate(row.as_handled_by_per_kw_with_channel_partner),
      },
      {
        field: "as_channel_partner_per_kw",
        label: "CP/kW",
        sortable: false,
        render: (row) => fmtRate(row.as_channel_partner_per_kw),
      },
      {
        field: "as_fabrication_per_kw",
        label: "Fab/kW",
        sortable: false,
        render: (row) => fmtRate(row.as_fabrication_per_kw),
      },
      {
        field: "as_installation_per_kw",
        label: "Inst/kW",
        sortable: false,
        render: (row) => fmtRate(row.as_installation_per_kw),
      },
      {
        field: "fab_inst_combined",
        label: "Fab+Inst/kW",
        sortable: false,
        render: (row) =>
          fmtCombinedFabInst(row.as_fabrication_per_kw, row.as_installation_per_kw),
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        isActionColumn: true,
        render: (row, reload, perms) => (
          <div className="flex gap-1">
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
                  setRowToDelete({ id: row.id, reload });
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
      const response = await userOrderCommissionRateService.listUserOrderCommissionRates({
        page: p.page,
        limit: p.limit,
        q: p.q || undefined,
        sortBy: p.sortBy || "id",
        sortOrder: p.sortOrder || "DESC",
        user_id: p.user_id || undefined,
        order_type_id: p.order_type_id || undefined,
        branch_id: p.branch_id || undefined,
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
    if (!sidebarRow) return null;
    const r = sidebarRow;
    return (
      <div className="space-y-2 pr-1 text-sm">
        <p className="text-xs font-semibold text-muted-foreground">User</p>
        <p className="font-medium">{r.user_name ?? r.user_id ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Order type</p>
        <p>{r.order_type_name ?? r.order_type_id ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Branch</p>
        <p>{r.branch_name ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Scheme</p>
        <p>{r.project_scheme_name ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Effective</p>
        <p>
          {fmtDate(r.effective_from)} → {fmtDate(r.effective_to)}
        </p>
        <p className="text-xs font-semibold text-muted-foreground">Sales rates (per kW)</p>
        <p>Handled by: {fmtRate(r.as_handled_by_per_kw)}</p>
        <p>Handled by (with CP): {fmtRate(r.as_handled_by_per_kw_with_channel_partner)}</p>
        <p>Channel partner: {fmtRate(r.as_channel_partner_per_kw)}</p>
        <p className="text-xs font-semibold text-muted-foreground">Fabrication & installation (per kW)</p>
        <p>Fabrication: {fmtRate(r.as_fabrication_per_kw)}</p>
        <p>Installation: {fmtRate(r.as_installation_per_kw)}</p>
        <p>
          Combined (fab + inst):{" "}
          {fmtCombinedFabInst(r.as_fabrication_per_kw, r.as_installation_per_kw)}
        </p>
      </div>
    );
  }, [sidebarRow]);

  const canImportExport = currentPerm.can_read;

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Order commission rates (B2C)"
        addButtonLabel={currentPerm.can_create ? "Add rate" : undefined}
        onAddClick={currentPerm.can_create ? handleOpenAddModal : undefined}
        exportButtonLabel={canImportExport ? "Export CSV" : undefined}
        onExportClick={canImportExport ? handleExport : undefined}
        exportDisabled={exporting}
        exportLoading={exporting}
        sampleCsvButtonLabel={currentPerm.can_create ? "Sample CSV" : undefined}
        onSampleCsvClick={currentPerm.can_create ? handleSampleCsv : undefined}
        importButtonLabel={currentPerm.can_create ? "Import" : undefined}
        onImportClick={currentPerm.can_create ? () => setImportDialogOpen(true) : undefined}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <PaginatedTable
            key={tableKey}
            moduleKey={PERMISSION_MODULE_KEY}
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

        <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Commission rate">
          {sidebarContent}
        </DetailsSidebar>

        <Dialog open={showAddModal} onOpenChange={(open) => !open && handleCloseAddModal()}>
          <DialogContent className={cn(DIALOG_FORM_XL, "h-[92vh]")}>
            <DialogHeader>
              <DialogTitle>Add commission rate</DialogTitle>
            </DialogHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <UserOrderCommissionRateForm
                key="commission-rate-add"
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
          <DialogContent className={cn(DIALOG_FORM_XL, "h-[92vh]")}>
            <DialogHeader>
              <DialogTitle>Edit commission rate</DialogTitle>
            </DialogHeader>
            {loadingRecord ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <UserOrderCommissionRateForm
                  key={selectedRecord?.id ?? "commission-rate-edit"}
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

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Import commission rates</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm">
                Use the sample CSV headers. Each row creates one rate. User column: name, email, mobile, or
                exported &quot;Name &lt;email&gt;&quot; — not database ids. Optional masters: order type, branch,
                and project scheme by name or code.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleSampleCsv}>
                  <IconDownload className="mr-2 size-4" />
                  Download sample CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={importing}
                  onClick={() => importFileInputRef.current?.click()}
                >
                  <IconUpload className="mr-2 size-4" />
                  {importing ? "Uploading…" : "Upload CSV"}
                </Button>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setImporting(true);
                    try {
                      const data = await userOrderCommissionRateService.importUserOrderCommissionRates(file);
                      const result = data?.result ?? data;
                      const created = result?.created ?? 0;
                      if (created > 0) {
                        toast.success(`${created} row(s) imported`);
                        setTableKey((prev) => prev + 1);
                      } else {
                        toast.info("Import finished with no new rows");
                      }
                      setImportDialogOpen(false);
                    } catch (err) {
                      toast.error(err?.response?.data?.message || err?.message || "Upload failed");
                    } finally {
                      setImporting(false);
                      e.target.value = "";
                    }
                  }}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteDialogOpen(false);
              setRowToDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete commission rate</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this commission rate? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                loading={deleting}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
