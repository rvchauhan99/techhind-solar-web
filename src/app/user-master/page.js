"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { IconTrash, IconEye, IconPencil, IconKey } from "@tabler/icons-react";
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
import Input from "@/components/common/Input";
import userService from "@/services/userMasterService";
import roleService from "@/services/roleMasterService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import UserForm from "./components/UserForm";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";

const COLUMN_FILTER_KEYS = ["name", "name_op", "email", "email_op", "role_name", "role_name_op", "first_login", "status"];

const FIRST_LOGIN_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function UserListPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  const [roles, setRoles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetPasswordNew, setResetPasswordNew] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetPasswordErrors, setResetPasswordErrors] = useState({});
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [tableKey, setTableKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const addFormRef = useRef(null);
  const editFormRef = useRef(null);

  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } =
    listingState;

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback(
    (key, value) => setFilter(key, value),
    [setFilter]
  );

  useEffect(() => {
    setLoadingRoles(true);
    roleService
      .listRoleMasters()
      .then((res) => {
        const data = res?.data || res?.result?.data || res?.rows || [];
        setRoles(data);
      })
      .catch(() => setRoles([]))
      .finally(() => setLoadingRoles(false));

    userService
      .listUserMasters({ status: "active", limit: 1000, page: 1, sortBy: "name", sortOrder: "ASC" })
      .then((res) => {
        const result = res?.result || res;
        const data = result?.data || [];
        setManagers(Array.isArray(data) ? data : []);
      })
      .catch(() => setManagers([]));
  }, []);

  const handleOpenSidebar = useCallback(async (id) => {
    setLoadingRecord(true);
    try {
      const response = await userService.getUserMaster(id);
      const result = response?.data || response?.result || response;
      setSelectedRecord(result);
      setSidebarOpen(true);
    } catch (error) {
      console.error("Error fetching user:", error);
      toast.error("Failed to load user");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleOpenEditModal = useCallback(async (id) => {
    setLoadingRecord(true);
    setServerError(null);
    try {
      const response = await userService.getUserMaster(id);
      const result = response?.data || response?.result || response;
      setSelectedRecord(result);
      setShowEditModal(true);
    } catch (error) {
      console.error("Error fetching user:", error);
      setServerError("Failed to load user");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRecord(null);
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = {
        ...(filters.name && { name: filters.name, name_op: filters.name_op }),
        ...(filters.email && { email: filters.email, email_op: filters.email_op }),
        ...(filters.status && { status: filters.status }),
      };
      const blob = await userService.exportUserMasters(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export users");
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
        field: "name",
        label: "Name",
        sortable: true,
        filterType: "text",
        filterKey: "name",
        defaultFilterOperator: "contains",
      },
      {
        field: "email",
        label: "Email",
        sortable: true,
        filterType: "text",
        filterKey: "email",
        defaultFilterOperator: "contains",
      },
      {
        field: "role",
        label: "Role",
        sortable: false,
        filterType: "text",
        filterKey: "role_name",
        defaultFilterOperator: "contains",
        render: (row) => row.role?.name || "-",
      },
      {
        field: "manager",
        label: "Manager",
        sortable: false,
        render: (row) => row.manager?.name || "-",
      },
      {
        field: "first_login",
        label: "First Login",
        sortable: false,
        filterType: "select",
        filterKey: "first_login",
        filterOptions: FIRST_LOGIN_OPTIONS,
        render: (row) => (row.first_login ? "Yes" : "No"),
      },
      {
        field: "status",
        label: "Status",
        sortable: true,
        filterType: "select",
        filterKey: "status",
        filterOptions: STATUS_OPTIONS,
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
                onClick={() => handleOpenSidebar(row.id)}
                title="View"
                aria-label="View"
              >
                <IconEye className="size-4" />
              </Button>
            )}
            {(perms || currentPerm)?.can_update && (
              <>
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
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserToResetPassword(row);
                    setResetPasswordNew("");
                    setResetPasswordConfirm("");
                    setResetPasswordErrors({});
                    setShowResetPasswordDialog(true);
                  }}
                  title="Reset Password"
                  aria-label="Reset Password"
                >
                  <IconKey className="size-4" />
                </Button>
              </>
            )}
            {(perms || currentPerm)?.can_delete && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setUserToDelete(row);
                  setShowDeleteDialog(true);
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
    [currentPerm, handleOpenSidebar, handleOpenEditModal]
  );

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const response = await userService.listUserMasters({
        page: p.page,
        limit: p.limit,
        q: p.q || undefined,
        status: p.status || undefined,
        sortBy: p.sortBy || "id",
        sortOrder: p.sortOrder || "DESC",
        name: p.name || undefined,
        name_op: p.name_op || undefined,
        email: p.email || undefined,
        email_op: p.email_op || undefined,
        role_name: p.role_name || undefined,
        first_login: p.first_login !== undefined && p.first_login !== "" ? p.first_login : undefined,
      });
      const result = response?.result || response;
      return {
        data: result?.data || [],
        meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
      };
    },
    [tableKey]
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
        await userService.updateUserMaster(selectedRecord.id, payload);
        handleCloseEditModal();
        toast.success("User updated successfully");
      } else {
        await userService.createUserMaster(payload);
        handleCloseAddModal();
        toast.success("User created successfully");
      }
      setTableKey((prev) => prev + 1);
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || "Failed to save user");
      toast.error(err.response?.data?.message || err.message || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await userService.deleteUserMaster(userToDelete.id);
      setTableKey((prev) => prev + 1);
      setShowDeleteDialog(false);
      setUserToDelete(null);
      toast.success(`User "${userToDelete.name}" deleted successfully`);
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.response?.data?.error || error.message || "Failed to delete user";
      toast.error(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseResetPasswordDialog = () => {
    setShowResetPasswordDialog(false);
    setUserToResetPassword(null);
    setResetPasswordNew("");
    setResetPasswordConfirm("");
    setResetPasswordErrors({});
  };

  const handleResetPasswordSubmit = async (e) => {
    e?.preventDefault?.();
    if (!userToResetPassword) return;
    const errs = {};
    if (!resetPasswordNew || resetPasswordNew.trim() === "") errs.new_password = "New password is required";
    else if (resetPasswordNew.length < 6) errs.new_password = "Password must be at least 6 characters";
    if (!resetPasswordConfirm || resetPasswordConfirm.trim() === "") errs.confirm_password = "Confirm password is required";
    else if (resetPasswordNew !== resetPasswordConfirm) errs.confirm_password = "Passwords do not match";
    if (Object.keys(errs).length) {
      setResetPasswordErrors(errs);
      return;
    }
    setResetPasswordErrors({});
    setResettingPassword(true);
    try {
      await userService.setUserPassword(userToResetPassword.id, {
        new_password: resetPasswordNew,
        confirm_password: resetPasswordConfirm,
      });
      handleCloseResetPasswordDialog();
      toast.success("Password reset successfully.");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to reset password";
      toast.error(msg);
    } finally {
      setResettingPassword(false);
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
    if (!selectedRecord) return null;
    const u = selectedRecord;
    return (
      <div className="pr-1 space-y-3">
        <p className="font-semibold">{u.name}</p>
        <p className="text-sm">{u.email}</p>
        <p className="text-xs text-muted-foreground">Role: {u.role?.name || "-"}</p>
        <hr className="border-border" />
        <p className="text-xs font-semibold text-muted-foreground">Details</p>
        <p className="text-sm">Status: {u.status || "-"}</p>
        <p className="text-sm">Manager: {u.manager?.name || "-"}</p>
        <p className="text-sm">Phone: {u.mobile_number || "-"}</p>
        <p className="text-sm">First Login: {u.first_login ? "Yes" : "No"}</p>
        {u.address && <p className="text-sm text-muted-foreground">{u.address}</p>}
        {currentPerm?.can_update && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => {
              setUserToResetPassword(u);
              setResetPasswordNew("");
              setResetPasswordConfirm("");
              setResetPasswordErrors({});
              setShowResetPasswordDialog(true);
            }}
          >
            Reset password
          </Button>
        )}
      </div>
    );
  }, [loadingRecord, selectedRecord, currentPerm?.can_update]);

  const editManagers = useMemo(() => {
    const selectedId = Number(selectedRecord?.id);
    if (!selectedId) return managers;
    return managers.filter((manager) => Number(manager.id) !== selectedId);
  }, [managers, selectedRecord?.id]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Users List"
        addButtonLabel={currentPerm.can_create ? "Add User" : undefined}
        onAddClick={currentPerm.can_create ? handleOpenAddModal : undefined}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          moduleKey="user-master"
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
        title="User Details"
      >
        {sidebarContent}
      </DetailsSidebar>

      <Dialog open={showAddModal} onOpenChange={(open) => !open && handleCloseAddModal()}>
        <DialogContent className={DIALOG_FORM_MEDIUM}>
          <div className="pb-2">
            <DialogTitle>Add User</DialogTitle>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <UserForm
            ref={addFormRef}
            onSubmit={handleSubmit}
            loading={submitting}
            roles={roles}
            managers={managers}
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
              onClick={() => addFormRef.current?.requestSubmit?.()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={(open) => !open && handleCloseEditModal()}>
        <DialogContent className={DIALOG_FORM_MEDIUM}>
          <div className="pb-2">
            <DialogTitle>Edit User</DialogTitle>
          </div>
          {loadingRecord ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <UserForm
                  ref={editFormRef}
                  defaultValues={selectedRecord}
                  onSubmit={handleSubmit}
                  loading={submitting}
                  roles={roles}
                  managers={editManagers}
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
                  onClick={() => editFormRef.current?.requestSubmit?.()}
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
        onOpenChange={(open) => !open && (setShowDeleteDialog(false), setUserToDelete(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the user{" "}
              <strong>&quot;{userToDelete?.name}&quot;</strong>? This action cannot be undone.
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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showResetPasswordDialog} onOpenChange={(open) => !open && handleCloseResetPasswordDialog()}>
        <DialogContent className={DIALOG_FORM_MEDIUM}>
          <div className="pb-2">
            <DialogTitle>Reset password – {userToResetPassword?.name}</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Set a new password for this user. They will use this password to sign in. They will be prompted to change it on first login.
          </p>
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <Input
              name="new_password"
              label="New password"
              type="password"
              value={resetPasswordNew}
              onChange={(e) => {
                setResetPasswordNew(e.target.value);
                if (resetPasswordErrors.new_password) setResetPasswordErrors((p) => ({ ...p, new_password: undefined }));
              }}
              error={!!resetPasswordErrors.new_password}
              helperText={resetPasswordErrors.new_password}
              required
              autoComplete="new-password"
            />
            <Input
              name="confirm_password"
              label="Confirm password"
              type="password"
              value={resetPasswordConfirm}
              onChange={(e) => {
                setResetPasswordConfirm(e.target.value);
                if (resetPasswordErrors.confirm_password) setResetPasswordErrors((p) => ({ ...p, confirm_password: undefined }));
              }}
              error={!!resetPasswordErrors.confirm_password}
              helperText={resetPasswordErrors.confirm_password}
              required
              autoComplete="new-password"
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" size="sm" onClick={handleCloseResetPasswordDialog} disabled={resettingPassword}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={resettingPassword}>
                Reset password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
