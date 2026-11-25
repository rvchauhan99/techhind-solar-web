"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconPencil, IconTrash, IconBuildingCommunity, IconCircleCheck, IconCircleMinus } from "@tabler/icons-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import Loader from "@/components/common/Loader";
import useModulePermission from "@/hooks/useModulePermission";
import useListTableState from "@/hooks/useListTableState";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi, getApiErrorMessage } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants";
import DepartmentForm from "./DepartmentForm";
import HrmsLightFilterPanel, {
  countHrmsLightActiveFilters,
  createHrmsLightFilterHandlers,
} from "@/app/hrms/components/HrmsLightFilterPanel";

const MODULE_KEY = "hrms_departments";
const EMPTY_FILTERS = { status: "" };

export default function HrmsDepartmentsPage() {
  const perm = useModulePermission(MODULE_KEY);

  const [tableKey, setTableKey] = useState(0);
  const list = useListTableState();
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [q, setQ] = useState("");
  const filterPanelValues = useMemo(() => ({ ...filters, q }), [filters, q]);
  const advancedActiveCount = useMemo(
    () => countHrmsLightActiveFilters(filters, q),
    [filters, q]
  );
  const filterHandlers = useMemo(
    () => createHrmsLightFilterHandlers(EMPTY_FILTERS, { setFilters, setQ, setTableKey }),
    []
  );
  const listParams = useMemo(
    () => ({
      search: q.trim() || undefined,
      status: filters.status || undefined,
    }),
    [filters, q]
  );
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [counts, setCounts] = useState({ total: null, active: null, inactive: null });
  const [countsLoading, setCountsLoading] = useState(true);

  // Add / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const [all, active, inactive] = await Promise.all([
        hrmsService.listDepartments({ limit: 1 }),
        hrmsService.listDepartments({ limit: 1, status: "active" }),
        hrmsService.listDepartments({ limit: 1, status: "inactive" }),
      ]);
      setCounts({
        total: unwrap(all)?.meta?.total ?? 0,
        active: unwrap(active)?.meta?.total ?? 0,
        inactive: unwrap(inactive)?.meta?.total ?? 0,
      });
    } catch {
      setCounts({ total: null, active: null, inactive: null });
    } finally {
      setCountsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const fetcher = useCallback(
    async (params) => {
      const res = await hrmsService.listDepartments({
        page: params.page,
        limit: params.limit,
        ...listParams,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: params.limit || 20 };
      return { data: rows, meta };
    },
    [listParams]
  );

  const handleOpenAddModal = useCallback(() => {
    setEditRecord(null);
    setServerError(null);
    setModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback(async (row) => {
    setLoadingRecord(true);
    setServerError(null);
    try {
      const res = await hrmsService.getDepartment(row.id);
      setEditRecord(unwrap(res));
      setModalOpen(true);
    } catch (err) {
      toastErrorFromApi(err, "Could not load department");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditRecord(null);
    setServerError(null);
  }, []);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      if (editRecord?.id) {
        await hrmsService.updateDepartment(editRecord.id, payload);
        toastSuccess("Department updated");
      } else {
        await hrmsService.createDepartment(payload);
        toastSuccess("Department created");
      }
      handleCloseModal();
      setTableKey((k) => k + 1);
      loadCounts();
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Save failed"));
      toastErrorFromApi(err, "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hrmsService.deleteDepartment(deleteTarget.id);
      toastSuccess("Department deleted");
      setDeleteTarget(null);
      setTableKey((k) => k + 1);
      loadCounts();
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
        label: "Department",
        sortable: true,
        render: (row) => <span className="font-medium text-foreground">{row.title}</span>,
      },
      {
        field: "head",
        label: "Head",
        sortable: false,
        render: (row) =>
          row.departmentHead?.name || <span className="text-muted-foreground">Not assigned</span>,
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            {perm.can_update && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Edit ${row.title}`}
                title="Edit"
                onClick={() => handleOpenEditModal(row)}
              >
                <IconPencil className="h-4 w-4" />
              </Button>
            )}
            {perm.can_delete && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Delete ${row.title}`}
                title="Delete"
                onClick={() => setDeleteTarget(row)}
              >
                <IconTrash className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [perm.can_update, perm.can_delete, handleOpenEditModal]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Departments"
        subtitle="Organisation departments and their heads"
        addButtonLabel={perm.can_create ? "Add Department" : undefined}
        onAddClick={perm.can_create ? handleOpenAddModal : undefined}
      >
        <HrmsLightFilterPanel
          panelId="hrms-departments-advanced-filters"
          values={filterPanelValues}
          quickSearch={q}
          quickSearchPlaceholder="Quick Search (department title)"
          quickSearchId="hrms-departments-quick-search"
          activeCount={advancedActiveCount}
          onQuickSearch={filterHandlers.onQuickSearch}
          onApply={filterHandlers.onApply}
          onReset={filterHandlers.onReset}
          onRemove={filterHandlers.onRemove}
        />

        <div className="mb-1.5 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            compact
            icon={<IconBuildingCommunity size={16} />}
            label="Departments"
            value={counts.total ?? "—"}
            accentColor="#1b365d"
            subLabel="All departments"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconCircleCheck size={16} />}
            label="Active"
            value={counts.active ?? "—"}
            accentColor="#00823b"
            subLabel="Available for employees"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconCircleMinus size={16} />}
            label="Inactive"
            value={counts.inactive ?? "—"}
            accentColor="#64748b"
            subLabel="Hidden from new assignments"
            loading={countsLoading}
          />
        </div>


        <div className="flex min-h-[320px] flex-1 flex-col">
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          showSearch={false}
          height="100%"
          page={list.page}
          limit={list.limit}
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          onPageChange={(zeroBased) => list.setPage(zeroBased + 1)}
          onRowsPerPageChange={list.setLimit}
          onSortChange={list.setSort}
          emptyState={
            <EmptyState
              icon={IconBuildingCommunity}
              title={advancedActiveCount ? "No departments match this filter" : "No departments yet"}
              description={
                advancedActiveCount
                  ? "Try clearing the filters to see all departments."
                  : "Create your first department so employees and designations can be grouped."
              }
              actionLabel={perm.can_create ? "Add Department" : undefined}
              onAction={perm.can_create ? handleOpenAddModal : undefined}
            />
          }
        />
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete department</AlertDialogTitle>
              <AlertDialogDescription>
                Delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction size="sm" variant="destructive" loading={deleting} onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={modalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className={DIALOG_FORM_MEDIUM}>
            <DialogHeader>
              <DialogTitle>{editRecord ? "Edit Department" : "Add Department"}</DialogTitle>
            </DialogHeader>
            {loadingRecord ? (
              <div className="flex min-h-[160px] items-center justify-center">
                <Loader />
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <DepartmentForm
                    hideActions
                    variant="plain"
                    defaultValues={editRecord}
                    onSubmit={handleSubmit}
                    loading={submitting}
                    serverError={serverError}
                    onClearServerError={() => setServerError(null)}
                  />
                </div>
                <DialogFooter className="pt-3">
                  <Button variant="outline" size="sm" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    loading={submitting}
                    onClick={() => document.getElementById("hrms-department-form")?.requestSubmit()}
                  >
                    {editRecord ? "Update" : "Save"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
