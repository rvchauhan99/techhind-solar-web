"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  IconPencil,
  IconTrash,
  IconCopy,
  IconUpload,
  IconPlus,
  IconCalendarEvent,
  IconCircleCheck,
  IconCalendarTime,
  IconFilterOff,
} from "@tabler/icons-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
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
import Input from "@/components/common/Input";
import useModulePermission from "@/hooks/useModulePermission";
import useListTableState from "@/hooks/useListTableState";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi, getApiErrorMessage } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants";
import HolidayForm from "./HolidayForm";

const MODULE_KEY = "hrms_holidays";
const THIS_YEAR = new Date().getFullYear();
const MONTH_LABEL = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en", { month: "short", year: "numeric" });
};

export default function HrmsHolidaysPage() {
  const perm = useModulePermission(MODULE_KEY);

  const [tableKey, setTableKey] = useState(0);
  const list = useListTableState({
    filters: { year: String(THIS_YEAR), status: "", title: "" },
    sortBy: "holiday_date",
    sortOrder: "asc",
  });
  const [listTotal, setListTotal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneForm, setCloneForm] = useState({ from_year: String(THIS_YEAR), to_year: String(THIS_YEAR + 1) });
  const [cloning, setCloning] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [counts, setCounts] = useState({ total: null, active: null, upcoming: null });
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
      const res = await hrmsService.listHolidays({ year: list.filters.year || undefined, limit: 200 });
      const rows = unwrap(res)?.data || [];
      const today = new Date().toISOString().slice(0, 10);
      setCounts({
        total: rows.length,
        active: rows.filter((r) => r.status === "active").length,
        upcoming: rows.filter((r) => String(r.holiday_date || "").slice(0, 10) >= today).length,
      });
    } catch {
      setCounts({ total: null, active: null, upcoming: null });
    } finally {
      setCountsLoading(false);
    }
  }, [list.filters.year]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const yearOptions = useMemo(
    () => [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1, THIS_YEAR + 2].map((y) => ({ value: String(y), label: String(y) })),
    []
  );

  const fetcher = useCallback(async (params) => {
    const res = await hrmsService.listHolidays({
      page: params.page,
      limit: params.limit,
      search: params.title || params.q || undefined,
      search_op: params.title_op || undefined,
      year: params.year || undefined,
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
      const res = await hrmsService.getHoliday(row.id);
      setEditRecord(unwrap(res));
      setModalOpen(true);
    } catch (err) {
      toastErrorFromApi(err, "Could not load holiday");
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
        await hrmsService.updateHoliday(editRecord.id, payload);
        toastSuccess("Holiday updated");
      } else {
        await hrmsService.createHoliday(payload);
        toastSuccess("Holiday created");
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
      await hrmsService.deleteHoliday(deleteTarget.id);
      toastSuccess("Holiday deleted");
      setDeleteTarget(null);
      setTableKey((k) => k + 1);
      loadCounts();
    } catch (err) {
      toastErrorFromApi(err, "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const doClone = async () => {
    setCloning(true);
    try {
      const res = await hrmsService.cloneHolidayYear({
        from_year: Number(cloneForm.from_year),
        to_year: Number(cloneForm.to_year),
      });
      const r = unwrap(res);
      toastSuccess(`Cloned ${r?.created ?? 0} holiday(s), skipped ${r?.skipped ?? 0}`);
      setCloneOpen(false);
      setTableKey((k) => k + 1);
      loadCounts();
    } catch (err) {
      toastErrorFromApi(err, "Clone failed");
    } finally {
      setCloning(false);
    }
  };

  const doBulk = async () => {
    const holidays = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [date, ...rest] = line.split(/[,|]/);
        return { holiday_date: (date || "").trim(), title: rest.join(",").trim() };
      })
      .filter((h) => h.holiday_date && h.title);
    if (!holidays.length) {
      toastErrorFromApi({ message: "Add lines like 2026-01-26, Republic Day" }, "Nothing to import");
      return;
    }
    setBulkImporting(true);
    try {
      const res = await hrmsService.bulkCreateHolidays({ holidays });
      const r = unwrap(res);
      toastSuccess(`Imported ${r?.created ?? 0}, skipped ${r?.skipped ?? 0}`);
      setBulkOpen(false);
      setBulkText("");
      setTableKey((k) => k + 1);
    } catch (err) {
      toastErrorFromApi(err, "Import failed");
    } finally {
      setBulkImporting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "holiday_date",
        label: "Date",
        sortable: true,
        filterType: "select",
        filterKey: "year",
        filterOptions: yearOptions,
        render: (row) => <span className="font-medium text-foreground">{row.holiday_date}</span>,
      },
      {
        field: "month",
        label: "Month",
        sortable: false,
        render: (row) => <span className="text-xs text-muted-foreground">{MONTH_LABEL(row.holiday_date)}</span>,
      },
      {
        field: "title",
        label: "Holiday",
        sortable: true,
        filterType: "text",
        filterKey: "title",
        defaultFilterOperator: "contains",
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        filterType: "select",
        filterKey: "status",
        filterOptions: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
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
    [perm.can_update, perm.can_delete, handleOpenEditModal, yearOptions]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Holidays"
        subtitle="Company holiday calendar"
        actions={
          <div className="flex items-center gap-1.5">
            {perm.can_create && (
              <Button size="sm" variant="outline" onClick={() => setCloneOpen(true)}>
                <IconCopy className="size-4" /> Clone Year
              </Button>
            )}
            {perm.can_create && (
              <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
                <IconUpload className="size-4" /> Bulk Import
              </Button>
            )}
            {perm.can_create && (
              <Button size="sm" onClick={handleOpenAddModal}>
                <IconPlus className="size-4" /> Add Holiday
              </Button>
            )}
          </div>
        }
      >
        <div className="mb-1.5 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            compact
            icon={<IconCalendarEvent size={16} />}
            label={`Holidays in ${list.filters.year || THIS_YEAR}`}
            value={counts.total ?? "—"}
            accentColor="#1b365d"
            subLabel="Listed for the year"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconCircleCheck size={16} />}
            label="Active"
            value={counts.active ?? "—"}
            accentColor="#00823b"
            subLabel="Counted as holidays"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconCalendarTime size={16} />}
            label="Upcoming"
            value={counts.upcoming ?? "—"}
            accentColor="#f37021"
            subLabel="Today or later"
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
              icon={IconCalendarEvent}
              title={`No holidays for ${list.filters.year || THIS_YEAR}`}
              description="Add holidays one by one, bulk import a list, or clone last year calendar."
              actionLabel={perm.can_create ? "Add Holiday" : undefined}
              onAction={perm.can_create ? handleOpenAddModal : undefined}
            />
          }
        />
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete holiday</AlertDialogTitle>
              <AlertDialogDescription>
                Delete &quot;{deleteTarget?.title}&quot; ({deleteTarget?.holiday_date})?
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
              <DialogTitle>{editRecord ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
            </DialogHeader>
            {loadingRecord ? (
              <div className="flex min-h-[160px] items-center justify-center">
                <Loader />
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <HolidayForm
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
                    onClick={() => document.getElementById("hrms-holiday-form")?.requestSubmit()}
                  >
                    {editRecord ? "Update" : "Save"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
          <DialogContent>
            <DialogTitle>Clone holiday year</DialogTitle>
            <div className="space-y-3 py-2">
              <Input label="From year" name="from_year" type="number" value={cloneForm.from_year} onChange={(e) => setCloneForm((f) => ({ ...f, from_year: e.target.value }))} />
              <Input label="To year" name="to_year" type="number" value={cloneForm.to_year} onChange={(e) => setCloneForm((f) => ({ ...f, to_year: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Creates the same month/day holidays in the target year, skipping existing dates.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setCloneOpen(false)} disabled={cloning}>Cancel</Button>
              <Button size="sm" loading={cloning} onClick={doClone}>Clone</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent>
            <DialogTitle>Bulk import holidays</DialogTitle>
            <p className="text-xs text-muted-foreground">One per line: <code>YYYY-MM-DD, Title</code></p>
            <textarea
              className="mt-2 h-40 w-full rounded-md border border-input p-2 text-sm"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"2026-01-26, Republic Day\n2026-08-15, Independence Day"}
            />
            <DialogFooter className="pt-3">
              <Button variant="outline" size="sm" onClick={() => setBulkOpen(false)} disabled={bulkImporting}>Cancel</Button>
              <Button size="sm" loading={bulkImporting} onClick={doBulk}>Import</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
