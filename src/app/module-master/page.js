"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from "@mui/material";
import { Button } from "@/components/ui/button";
import { IconEye, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
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
import moduleService from "@/services/moduleMasterService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import ModuleForm from "./components/ModuleForm";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";

const COLUMN_FILTER_KEYS = [
  "id",
  "name",
  "name_op",
  "key",
  "key_op",
  "route",
  "route_op",
  "sequence",
  "sequence_op",
  "sequence_to",
  "status",
];

export default function ModuleMasterPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  const [parentOptions, setParentOptions] = useState([]);
  const [loadingParents, setLoadingParents] = useState(false);
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
  const [selectedRow, setSelectedRow] = useState(null);
  const addFormRef = useRef(null);
  const editFormRef = useRef(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } = listingState;

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);

  const filterParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      ),
    [filters]
  );

  // Load parent options on component mount
  useEffect(() => {
    setLoadingParents(true);
    moduleService
      .listModuleMasters({
        page: 1,
        limit: 500,
      })
      .then((res) => {
        const body = res.result || res.data || res;
        const rows = body.data || body.result || body || [];
        const parents = (Array.isArray(rows) ? rows : rows.data || []).filter(
          (m) => m.parent_id === null || m.parent_id === undefined
        );
        setParentOptions(parents);
      })
      .catch(() => setParentOptions([]))
      .finally(() => setLoadingParents(false));
  }, []);

  const handleDeleteClick = (id, reload) => {
    setModuleToDelete({ id, reload });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!moduleToDelete) return;
    setDeleting(true);
    try {
      await moduleService.deleteModuleMaster(moduleToDelete.id);
      toast.success("Module deleted");
      setDeleteDialogOpen(false);
      setModuleToDelete(null);
      setTableKey((prev) => prev + 1);
      if (moduleToDelete.reload && typeof moduleToDelete.reload === "function") {
        setTimeout(() => moduleToDelete.reload(), 100);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || error.message || "Failed to delete module";
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      const blob = await moduleService.exportModuleMasters(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `modules-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export modules");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const handleOpenSidebar = useCallback((row) => {
    setSelectedRow(row);
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRow(null);
  }, []);

  const handleOpenEditModal = useCallback(async (id) => {
    setLoadingRecord(true);
    setServerError(null);
    try {
      const response = await moduleService.getModuleMaster(id);
      const result = response?.result || response?.data || response;
      setSelectedRecord(result);
      setShowEditModal(true);
    } catch (error) {
      console.error("Error fetching module:", error);
      setServerError("Failed to load module");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const response = await moduleService.listModuleMasters({
        page: p.page,
        limit: p.limit,
        q: p.q || undefined,
        sortBy: p.sortBy || "sequence",
        sortOrder: p.sortOrder || "ASC",
        id: p.id || undefined,
        name: p.name || undefined,
        name_op: p.name_op || undefined,
        key: p.key || undefined,
        key_op: p.key_op || undefined,
        route: p.route || undefined,
        route_op: p.route_op || undefined,
        sequence: p.sequence || undefined,
        sequence_op: p.sequence_op || undefined,
        sequence_to: p.sequence_to || undefined,
        status: p.status || undefined,
      });
      const result = response?.result || response;
      return {
        data: result?.data || result || [],
        meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
      };
    },
    [tableKey]
  );

  const columns = useMemo(
    () => [
      {
        field: "id",
        label: "ID",
        sortable: false,
        filterType: "text",
        filterKey: "id",
        defaultFilterOperator: "equals",
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
        field: "key",
        label: "Key",
        sortable: true,
        filterType: "text",
        filterKey: "key",
        defaultFilterOperator: "contains",
      },
      {
        field: "route",
        label: "Route",
        sortable: false,
        filterType: "text",
        filterKey: "route",
        defaultFilterOperator: "contains",
      },
      {
        field: "sequence",
        label: "Sequence",
        sortable: true,
        filterType: "number",
        filterKey: "sequence",
        filterKeyTo: "sequence_to",
        operatorKey: "sequence_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "status",
        label: "Status",
        sortable: true,
        filterType: "select",
        filterKey: "status",
        filterOptions: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        isActionColumn: true,
        render: (row, reload, perms) => (
          <div className="flex gap-2">
            {(perms || currentPerm)?.can_read && (
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
            )}
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
                onClick={() => handleDeleteClick(row.id, reload)}
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
    [currentPerm, handleOpenEditModal, handleOpenSidebar]
  );

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

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedRecord(null);
    setServerError(null);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      if (selectedRecord?.id) {
        await moduleService.updateModuleMaster(selectedRecord.id, payload);
        handleCloseEditModal();
        toast.success("Module updated");
      } else {
        await moduleService.createModuleMaster(payload);
        handleCloseAddModal();
        toast.success("Module created");
      }
      setTableKey((prev) => prev + 1);
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || "Failed to save module");
      toast.error(err.response?.data?.message || err.message || "Failed to save module");
    } finally {
      setSubmitting(false);
    }
  };

  const sidebarContent = useMemo(() => {
    if (!selectedRow) return null;
    const r = selectedRow;
    return (
      <div className="pr-1 space-y-3">
        <p className="font-semibold">{r.name ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Key</p>
        <p className="text-sm">{r.key ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Route</p>
        <p className="text-sm">{r.route ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Sequence</p>
        <p className="text-sm">{r.sequence ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Status</p>
        <p className="text-sm">{r.status ?? "-"}</p>
      </div>
    );
  }, [selectedRow]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Modules"
        addButtonLabel={currentPerm.can_create ? "Add Module" : undefined}
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
            sortBy={sortBy || "sequence"}
            sortOrder={sortOrder || "ASC"}
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

        <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Module Details">
          {sidebarContent}
        </DetailsSidebar>
      </ListingPageContainer>

      {/* Add Module Modal */}
      <Dialog
        open={showAddModal}
        onClose={handleCloseAddModal}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }
          }
        }}
      >
        <DialogTitle>
          Add Module
          <Button
            type="button"
            aria-label="close"
            variant="ghost"
            size="icon-sm"
            className="absolute right-2 top-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleCloseAddModal}
          >
            <IconX className="size-4" />
          </Button>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, overflowY: 'auto', flex: 1 }}>
          <ModuleForm
            ref={addFormRef}
            onSubmit={handleSubmit}
            loading={submitting}
            parentOptions={parentOptions}
            serverError={serverError}
            onClearServerError={() => setServerError(null)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button type="button" onClick={handleCloseAddModal} variant="outline" size="sm">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            loading={submitting}
            onClick={() => {
              if (addFormRef.current) {
                addFormRef.current.requestSubmit();
              }
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Module Modal */}
      <Dialog
        open={showEditModal}
        onClose={handleCloseEditModal}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }
          }
        }}
      >
        <DialogTitle>
          Edit Module
          <Button
            type="button"
            aria-label="close"
            variant="ghost"
            size="icon-sm"
            className="absolute right-2 top-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleCloseEditModal}
          >
            <IconX className="size-4" />
          </Button>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, overflowY: 'auto', flex: 1 }}>
          {loadingRecord ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <ModuleForm
              ref={editFormRef}
              defaultValues={selectedRecord}
              onSubmit={handleSubmit}
              loading={submitting}
              parentOptions={parentOptions}
              serverError={serverError}
              onClearServerError={() => setServerError(null)}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button type="button" onClick={handleCloseEditModal} variant="outline" size="sm">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            loading={submitting}
            onClick={() => {
              if (editFormRef.current) {
                editFormRef.current.requestSubmit();
              }
            }}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Module</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this module? This action cannot be undone.
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
    </ProtectedRoute>
  );
}
