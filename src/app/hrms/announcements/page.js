"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconPencil, IconTrash, IconSpeakerphone } from "@tabler/icons-react";
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
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import useModulePermission from "@/hooks/useModulePermission";
import useListTableState from "@/hooks/useListTableState";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import HrmsLightFilterPanel, {
  countHrmsLightActiveFilters,
  createHrmsLightFilterHandlers,
} from "@/app/hrms/components/HrmsLightFilterPanel";

const MODULE_KEY = "hrms_announcements";
const EMPTY_FILTERS = { status: "" };

function formatRange(row) {
  const start = row.start_date || "—";
  const end = row.end_date || "Open";
  return `${start} → ${end}`;
}

export default function HrmsAnnouncementsPage() {
  const router = useRouter();
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const listParams = useMemo(
    () => ({
      search: q.trim() || undefined,
      status: filters.status || undefined,
    }),
    [filters, q]
  );

  const fetcher = useCallback(
    async (params) => {
      const res = await hrmsService.listAnnouncements({
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

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hrmsService.deleteAnnouncement(deleteTarget.id);
      toastSuccess("Announcement deleted");
      setDeleteTarget(null);
      setTableKey((k) => k + 1);
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
        label: "Title",
        sortable: false,
        render: (row) => <span className="font-medium text-foreground">{row.title}</span>,
      },
      {
        field: "departments",
        label: "Departments",
        sortable: false,
        render: (row) =>
          (row.department_titles || []).length
            ? row.department_titles.join(", ")
            : "—",
      },
      {
        field: "dates",
        label: "Date range",
        sortable: false,
        render: (row) => formatRange(row),
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
            {perm.can_update ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Edit announcement"
                title="Edit"
                onClick={() => router.push(`/hrms/announcements/${row.id}/edit`)}
              >
                <IconPencil className="h-4 w-4" />
              </Button>
            ) : null}
            {perm.can_delete ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Delete announcement"
                title="Delete"
                onClick={() => setDeleteTarget(row)}
              >
                <IconTrash className="h-4 w-4 text-destructive" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [perm.can_update, perm.can_delete, router]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Announcements"
        subtitle="Department-targeted company announcements"
        addButtonLabel={perm.can_create ? "Add announcement" : undefined}
        onAddClick={perm.can_create ? () => router.push("/hrms/announcements/add") : undefined}
        secondaryButtonLabel="My Announcements"
        onSecondaryClick={() => router.push("/hrms/announcements/feed")}
      >
        <HrmsLightFilterPanel
          panelId="hrms-announcements-advanced-filters"
          values={filterPanelValues}
          quickSearch={q}
          quickSearchPlaceholder="Quick Search (announcement title)"
          quickSearchId="hrms-announcements-quick-search"
          activeCount={advancedActiveCount}
          onQuickSearch={filterHandlers.onQuickSearch}
          onApply={filterHandlers.onApply}
          onReset={filterHandlers.onReset}
          onRemove={filterHandlers.onRemove}
        />

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
                icon={IconSpeakerphone}
                title={
                  advancedActiveCount ? "No announcements match this filter" : "No announcements"
                }
                description={
                  advancedActiveCount
                    ? "Try clearing the filters to see all announcements."
                    : "Create an announcement and target one or more departments."
                }
                actionLabel={perm.can_create ? "Add announcement" : undefined}
                onAction={perm.can_create ? () => router.push("/hrms/announcements/add") : undefined}
              />
            }
          />
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.title || "This announcement"} will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Back</AlertDialogCancel>
              <AlertDialogAction size="sm" variant="destructive" loading={deleting} onClick={onDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}