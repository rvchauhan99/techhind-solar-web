"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconPencil, IconTrash, IconIdBadge2, IconCircleCheck, IconCircleMinus } from "@tabler/icons-react";
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
import FormField from "@/components/common/FormField";
import AutocompleteField from "@/components/common/AutocompleteField";
import DesignationForm from "./DesignationForm";
import HrmsLightFilterPanel, {
  countHrmsLightActiveFilters,
  createHrmsLightFilterHandlers,
} from "@/app/hrms/components/HrmsLightFilterPanel";

const MODULE_KEY = "hrms_designations";
const EMPTY_FILTERS = { status: "", department_id: "" };

export default function HrmsDesignationsPage() {
  const perm = useModulePermission(MODULE_KEY);

  const [tableKey, setTableKey] = useState(0);
  const list = useListTableState();
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [q, setQ] = useState("");
  const [departmentChipLabel, setDepartmentChipLabel] = useState("");
  const filterPanelValues = useMemo(() => ({ ...filters, q }), [filters, q]);
  const advancedActiveCount = useMemo(
    () => countHrmsLightActiveFilters(filters, q, ["department_id"]),
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
      department_id: filters.department_id || undefined,
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
        hrmsService.listDesignations({ limit: 1 }),
        hrmsService.listDesignations({ limit: 1, status: "active" }),
        hrmsService.listDesignations({ limit: 1, status: "inactive" }),
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

  const handleApplyFilters = useCallback(
    async (next) => {
      filterHandlers.onApply(next);
      const deptId = next?.department_id;
      if (deptId) {
        try {
          const opt = await hrmsService.resolveHrmsDepartment(deptId);
          setDepartmentChipLabel(opt?.label || String(deptId));
        } catch {
          setDepartmentChipLabel(String(deptId));
        }
      } else {
        setDepartmentChipLabel("");
      }
    },
    [filterHandlers]
  );

  const handleResetFilters = useCallback(() => {
    filterHandlers.onReset();
    setDepartmentChipLabel("");
  }, [filterHandlers]);

  const handleRemoveFilter = useCallback(
    (key) => {
      filterHandlers.onRemove(key);
      if (key === "department_id") setDepartmentChipLabel("");
    },
    [filterHandlers]
  );

  const fetcher = useCallback(
    async (params) => {
      const res = await hrmsService.listDesignations({
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
      const res = await hrmsService.getDesignation(row.id);
      setEditRecord(unwrap(res));
      setModalOpen(true);
    } catch (err) {
      toastErrorFromApi(err, "Could not load designation");
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
        await hrmsService.updateDesignation(editRecord.id, payload);
        toastSuccess("Designation updated");
      } else {
        await hrmsService.createDesignation(payload);
        toastSuccess("Designation created");
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
      await hrmsService.deleteDesignation(deleteTarget.id);
      toastSuccess("Designation deleted");
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
        label: "Designation",
        sortable: true,
        render: (row) => <span className="font-medium text-foreground">{row.title}</span>,
      },
      {
        field: "department",
        label: "Department",
        sortable: false,
        render: (row) => row.department?.title || <span className="text-muted-foreground">Not mapped</span>,
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
        title="Designations"
        subtitle="Job titles mapped to departments"
        addButtonLabel={perm.can_create ? "Add Designation" : undefined}
        onAddClick={perm.can_create ? handleOpenAddModal : undefined}
      >
        <HrmsLightFilterPanel
          panelId="hrms-designations-advanced-filters"
          values={filterPanelValues}
          quickSearch={q}
          quickSearchPlaceholder="Quick Search (designation title)"
          quickSearchId="hrms-designations-quick-search"
          activeCount={advancedActiveCount}
          chipLabels={{ department_id: "Department" }}
          chipFormatters={{
            department_id: (raw) => departmentChipLabel || (raw ? `#${raw}` : null),
          }}
          onQuickSearch={filterHandlers.onQuickSearch}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onRemove={handleRemoveFilter}
        >
          {({ draft, setDraftValue }) => (
            <FormField>
              <AutocompleteField
                label="Department"
                placeholder="Type to search…"
                asyncLoadOptions={(query) => hrmsService.searchHrmsDepartments(query)}
                resolveOptionById={(id) => hrmsService.resolveHrmsDepartment(id)}
                getOptionLabel={(o) => o?.label ?? o?.title ?? ""}
                value={draft.department_id || null}
                onChange={(_e, opt) =>
                  setDraftValue("department_id", opt?.id != null ? String(opt.id) : "")
                }
              />
            </FormField>
          )}
        </HrmsLightFilterPanel>

        <div className="mb-1.5 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            compact
            icon={<IconIdBadge2 size={16} />}
            label="Designations"
            value={counts.total ?? "—"}
            accentColor="#1b365d"
            subLabel="All job titles"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconCircleCheck size={16} />}
            label="Active"
            value={counts.active ?? "—"}
            accentColor="#00823b"
            subLabel="Selectable for employees"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconCircleMinus size={16} />}
            label="Inactive"
            value={counts.inactive ?? "—"}
            accentColor="#64748b"
            subLabel="Retired job titles"
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
              icon={IconIdBadge2}
              title={advancedActiveCount ? "No designations match these filters" : "No designations yet"}
              description={
                advancedActiveCount
                  ? "Try clearing the filters to see all designations."
                  : "Add job titles and map them to a department so employees can be assigned."
              }
              actionLabel={perm.can_create ? "Add Designation" : undefined}
              onAction={perm.can_create ? handleOpenAddModal : undefined}
            />
          }
        />
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete designation</AlertDialogTitle>
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
              <DialogTitle>{editRecord ? "Edit Designation" : "Add Designation"}</DialogTitle>
            </DialogHeader>
            {loadingRecord ? (
              <div className="flex min-h-[160px] items-center justify-center">
                <Loader />
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <DesignationForm
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
                    onClick={() => document.getElementById("hrms-designation-form")?.requestSubmit()}
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
