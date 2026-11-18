"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  IconPencil,
  IconPlus,
  IconGavel,
  IconCircleCheck,
  IconCircleOff,
  IconFilterOff,
} from "@tabler/icons-react";
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
import ListCount from "@/components/common/ListCount";
import Loader from "@/components/common/Loader";
import useModulePermission from "@/hooks/useModulePermission";
import useListTableState from "@/hooks/useListTableState";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi, getApiErrorMessage } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants";
import PenaltyForm from "./PenaltyForm";

const MODULE_KEY = "hrms_penalties";
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function HrmsPenaltiesPage() {
  const perm = useModulePermission(MODULE_KEY);

  const [tableKey, setTableKey] = useState(0);
  const list = useListTableState({ filters: { status: "", title: "" } });
  const [listTotal, setListTotal] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [saving, setSaving] = useState(false);
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
      const res = await hrmsService.listPenalties({ limit: 100 });
      const payload = unwrap(res);
      const summary = payload?.summary;
      setCounts(
        summary
          ? { total: summary.total, active: summary.active, inactive: summary.inactive }
          : { total: payload?.meta?.total ?? 0, active: null, inactive: null }
      );
    } catch {
      setCounts({ total: null, active: null, inactive: null });
    } finally {
      setCountsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const fetcher = useCallback(async (params) => {
    const res = await hrmsService.listPenalties({
      page: params.page,
      limit: params.limit,
      search: params.title || params.q || undefined,
      search_op: params.title_op || undefined,
      status: params.status || undefined,
    });
    const payload = unwrap(res);
    const rows = payload?.data || [];
    const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: params.limit || 20 };
    return { data: rows, meta };
  }, []);

  const handleOpenAddModal = useCallback(() => {
    setEditRecord(null);
    setServerError(null);
    setModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback(async (row) => {
    setLoadingRecord(true);
    setServerError(null);
    try {
      const res = await hrmsService.getPenalty(row.id);
      setEditRecord(unwrap(res));
      setModalOpen(true);
    } catch (err) {
      toastErrorFromApi(err, "Could not load penalty");
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
        await hrmsService.updatePenalty(editRecord.id, payload);
        toastSuccess("Penalty updated");
      } else {
        await hrmsService.createPenalty(payload);
        toastSuccess("Penalty created");
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

  const doDeactivate = async () => {
    if (!deactivateTarget) return;
    setSaving(true);
    try {
      await hrmsService.updatePenalty(deactivateTarget.id, { status: "inactive" });
      toastSuccess(`"${deactivateTarget.title}" deactivated`);
      setDeactivateTarget(null);
      setTableKey((k) => k + 1);
      loadCounts();
    } catch (err) {
      toastErrorFromApi(err, "Could not deactivate penalty");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "title",
        label: "Penalty",
        sortable: true,
        filterType: "text",
        filterKey: "title",
        defaultFilterOperator: "contains",
        render: (row) => <span className="font-medium text-foreground">{row.title}</span>,
      },
      {
        field: "amount",
        label: "Amount",
        sortable: true,
        render: (row) => <span className="tabular-nums">{money(row.amount)}</span>,
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        filterType: "select",
        filterKey: "status",
        filterOptions: STATUS_OPTIONS,
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
            {perm.can_delete && row.status === "active" && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Deactivate ${row.title}`}
                title="Deactivate"
                onClick={() => setDeactivateTarget(row)}
              >
                <IconCircleOff className="h-4 w-4 text-destructive" />
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
        title="Penalties"
        subtitle="Penalty types and amounts used when issuing penalties"
        addButtonLabel={perm.can_create ? "Add Penalty" : undefined}
        onAddClick={perm.can_create ? handleOpenAddModal : undefined}
      >
        <div className="mb-1.5 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            compact
            icon={<IconGavel size={16} />}
            label="Penalty types"
            value={counts.total ?? "—"}
            accentColor="#1b365d"
            subLabel="All penalties"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconCircleCheck size={16} />}
            label="Active"
            value={counts.active ?? "—"}
            accentColor="#00823b"
            subLabel="Can be issued"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconCircleOff size={16} />}
            label="Inactive"
            value={counts.inactive ?? "—"}
            accentColor="#8a8f98"
            subLabel="Not issuable"
            loading={countsLoading}
          />
        </div>


        <div className="flex min-h-[320px] flex-1 flex-col">
        <PaginatedTable
          toolbar={
            <>
              <ListCount total={listTotal} context={list.activeFilterCount ? "matching filters" : undefined} />
              {list.activeFilterCount > 0 ? (
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => list.clearFilters()}>
                  <IconFilterOff className="size-3.5" /> Clear filters
                </Button>
              ) : null}
            </>
          }
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          showSearch
          height="100%"
          onTotalChange={setListTotal}
          columnFilterValues={list.filters}
          onColumnFilterChange={list.setFilter}
          filterParams={list.filters}
          page={list.page}
          limit={list.limit}
          q={list.q}
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          onPageChange={(zeroBased) => list.setPage(zeroBased + 1)}
          onRowsPerPageChange={list.setLimit}
          onQChange={list.setQ}
          onSortChange={list.setSort}
          emptyState={
            <EmptyState
              icon={IconGavel}
              title={list.activeFilterCount ? "No penalties match this filter" : "No penalties yet"}
              description={
                list.activeFilterCount
                  ? "Try clearing the filters to see all penalties."
                  : "Create a penalty type such as Late Coming or Dress Code with a standard amount."
              }
              actionLabel={perm.can_create ? "Add Penalty" : undefined}
              onAction={perm.can_create ? handleOpenAddModal : undefined}
            />
          }
        />
        </div>

        <AlertDialog
          open={!!deactivateTarget}
          onOpenChange={(open) => !open && setDeactivateTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate penalty</AlertDialogTitle>
              <AlertDialogDescription>
                &quot;{deactivateTarget?.title}&quot; will no longer be available when issuing
                penalties. Existing issues keep their amount.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                size="sm"
                variant="destructive"
                loading={saving}
                onClick={doDeactivate}
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={modalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className={DIALOG_FORM_MEDIUM}>
            <DialogHeader>
              <DialogTitle>{editRecord ? "Edit Penalty" : "Add Penalty"}</DialogTitle>
            </DialogHeader>
            {loadingRecord ? (
              <div className="flex min-h-[160px] items-center justify-center">
                <Loader />
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <PenaltyForm
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
                    onClick={() => document.getElementById("hrms-penalty-form")?.requestSubmit()}
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
