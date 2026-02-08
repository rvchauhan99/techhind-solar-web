"use client";

import { useState, useMemo, useRef, useCallback } from "react";
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
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import roleService from "@/services/roleMasterService";
import moduleService from "@/services/moduleMasterService";
import roleModuleService from "@/services/roleModuleService";
import RoleForm from "./components/RoleForm";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";

const COLUMN_FILTER_KEYS = ["name", "name_op", "description", "description_op", "status"];

export default function RoleListPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

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

  const listingState = useListingQueryState({ defaultLimit: 20, filterKeys: COLUMN_FILTER_KEYS });
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
  const [modules, setModules] = useState([]);
  const [roleModules, setRoleModules] = useState([]);
  const [editRoleModules, setEditRoleModules] = useState([]); // Separate state for edit modal
  const [loadingModules, setLoadingModules] = useState(false);
  const addFormRef = useRef(null);
  const editFormRef = useRef(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load modules when needed (called from dialog handlers)
  const loadModules = async () => {
    if (modules.length > 0) return; // Already loaded, skip
    setLoadingModules(true);
    try {
      const res = await moduleService.listModuleMasters({ page: 1, limit: 500 });
      const body = res.result || res.data || res;
      const rows = body.data || body.result || body || [];
      setModules(Array.isArray(rows) ? rows : rows.data || []);
    } catch (error) {
      setModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      const blob = await roleService.exportRoleMasters(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `roles-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export roles");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;
    setDeleting(true);
    try {
      await roleService.deleteRoleMaster(roleToDelete.id);
      toast.success("Role deleted");
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      setTableKey((prev) => prev + 1);
      if (roleToDelete.reload && typeof roleToDelete.reload === "function") {
        setTimeout(() => roleToDelete.reload(), 100);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete role");
    } finally {
      setDeleting(false);
    }
  };

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
      // Load modules first if not loaded
      await loadModules();

      const [roleResponse, roleModulesResponse] = await Promise.all([
        roleService.getRoleMaster(id),
        roleModuleService.getRoleModulesByRoleId(id),
      ]);
      const roleResult = roleResponse?.result || roleResponse?.data || roleResponse;

      // Extract roleModules data - API returns { status, message, result: [...] }
      // apiClient.get returns r.data, so roleModulesResponse is the unwrapped response
      let roleModulesData = [];
      if (roleModulesResponse?.result && Array.isArray(roleModulesResponse.result)) {
        roleModulesData = roleModulesResponse.result;
      } else if (Array.isArray(roleModulesResponse)) {
        roleModulesData = roleModulesResponse;
      }

      // Set state: first set the data, then open the modal
      setSelectedRecord(roleResult);
      setEditRoleModules(roleModulesData); // Use separate state for edit modal
      setShowEditModal(true);
    } catch (error) {
      setServerError("Failed to load role");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const response = await roleService.listRoleMasters({
        page: p.page,
        limit: p.limit,
        q: p.q || undefined,
        sortBy: p.sortBy || "name",
        sortOrder: p.sortOrder || "ASC",
        name: p.name || undefined,
        name_op: p.name_op || undefined,
        description: p.description || undefined,
        description_op: p.description_op || undefined,
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
                onClick={() => {
                  setRoleToDelete({ id: row.id, reload });
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
    [currentPerm, handleOpenEditModal, handleOpenSidebar]
  );

  const handleOpenAddModal = async () => {
    setServerError(null);
    setSelectedRecord(null);
    await loadModules(); // Load modules when opening add modal
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setServerError(null);
    setSelectedRecord(null);
    setRoleModules([]);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedRecord(null);
    setServerError(null);
    setEditRoleModules([]); // Clear edit-specific roleModules
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);

    try {
      const { modulePermissions, ...roleData } = payload;
      let roleId;

      if (selectedRecord?.id) {
        // Update existing record
        const updateResponse = await roleService.updateRoleMaster(selectedRecord.id, roleData);
        roleId = selectedRecord.id;
      } else {
        // Create new record
        const createResponse = await roleService.createRoleMaster(roleData);
        roleId = createResponse?.result?.id || createResponse?.data?.id || createResponse?.id;
      }

      // Handle module permissions
      if (modulePermissions && roleId) {
        // Get existing role-modules for this role
        const existingRoleModulesResponse = await roleModuleService.listRoleModules({ page: 1 });
        const existingRoleModulesData = existingRoleModulesResponse?.result?.data || existingRoleModulesResponse?.data?.data || existingRoleModulesResponse?.data || [];
        const existingRoleModules = Array.isArray(existingRoleModulesData)
          ? existingRoleModulesData.filter((rm) => rm.role_id === roleId)
          : [];

        // Create a set of module IDs that should exist
        const currentModuleIds = new Set();
        const moduleIdsToProcess = [];

        // Process each module's permissions
        for (const [moduleId, perms] of Object.entries(modulePermissions)) {
          const moduleIdNum = parseInt(moduleId);
          const hasAnyPermission = perms.can_create || perms.can_read || perms.can_update || perms.can_delete;

          if (hasAnyPermission) {
            currentModuleIds.add(moduleIdNum);
            moduleIdsToProcess.push({ moduleId: moduleIdNum, perms, role_module_id: perms.role_module_id });
          }
        }

        // Delete role-modules that are no longer in the list
        for (const existing of existingRoleModules) {
          if (!currentModuleIds.has(existing.module_id)) {
            await roleModuleService.deleteRoleModule(existing.id);
          }
        }

        // Create or update role-modules
        for (const { moduleId, perms, role_module_id } of moduleIdsToProcess) {
          if (role_module_id) {
            // Update existing role-module link
            await roleModuleService.updateRoleModule(role_module_id, {
              can_create: perms.can_create,
              can_read: perms.can_read,
              can_update: perms.can_update,
              can_delete: perms.can_delete,
              role_id: roleId,
              module_id: moduleId,
            });
          } else {
            // Check if it already exists (for safety)
            const existing = existingRoleModules.find((rm) => rm.module_id === moduleId);
            if (existing) {
              // Update existing
              await roleModuleService.updateRoleModule(existing.id, {
                can_create: perms.can_create,
                can_read: perms.can_read,
                can_update: perms.can_update,
                can_delete: perms.can_delete,
                role_id: roleId,
                module_id: moduleId,
              });
            } else {
              // Create new role-module link
              await roleModuleService.createRoleModule({
                role_id: roleId,
                module_id: moduleId,
                can_create: perms.can_create,
                can_read: perms.can_read,
                can_update: perms.can_update,
                can_delete: perms.can_delete,
              });
            }
          }
        }
      }

      if (selectedRecord?.id) {
        handleCloseEditModal();
      } else {
        handleCloseAddModal();
      }
      // Force table to reload by changing key
      setTableKey(prev => prev + 1);
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || "Failed to save role");
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
        <p className="text-xs font-semibold text-muted-foreground">Description</p>
        <p className="text-sm">{r.description ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Status</p>
        <p className="text-sm">{r.status ?? "-"}</p>
      </div>
    );
  }, [selectedRow]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Roles"
        addButtonLabel={currentPerm.can_create ? "Add Role" : undefined}
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
            sortBy={sortBy || "name"}
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

        <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Role Details">
          {sidebarContent}
        </DetailsSidebar>
      </ListingPageContainer>

      {/* Add Role Modal */}
      <Dialog
        open={showAddModal}
        onClose={handleCloseAddModal}
        maxWidth="lg"
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
          Add Role
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
          <RoleForm
            ref={addFormRef}
            onSubmit={handleSubmit}
            loading={submitting}
            serverError={serverError}
            onClearServerError={() => setServerError(null)}
            modules={modules}
            roleModules={[]}
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

      {/* Edit Role Modal */}
      <Dialog
        open={showEditModal}
        onClose={handleCloseEditModal}
        maxWidth="lg"
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
          Edit Role
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
            <RoleForm
              key={`edit-${selectedRecord?.id}-${editRoleModules.length}-${modules.length}`}
              ref={editFormRef}
              defaultValues={selectedRecord}
              onSubmit={handleSubmit}
              loading={submitting}
              serverError={serverError}
              onClearServerError={() => setServerError(null)}
              modules={modules}
              roleModules={editRoleModules}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setRoleToDelete(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
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
