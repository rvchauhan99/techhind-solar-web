"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconPencil, IconTrash, IconCalendarEvent, IconDownload } from "@tabler/icons-react";
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
import EmptyState from "@/components/common/EmptyState";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import InterviewFilterPanel from "./components/InterviewFilterPanel";

const MODULE_KEY = "hrms_interviews";

const EMPTY_FILTERS = {
  round: "",
  status: "",
};

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusVariant(status) {
  if (status === "cancelled") return "destructive";
  if (status === "completed") return "success";
  return "secondary";
}

function resultVariant(result) {
  if (result === "fail") return "destructive";
  if (result === "pass") return "success";
  if (result === "hold") return "accent";
  return "secondary";
}

export default function HrmsInterviewsPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);
  const [meta, setMeta] = useState({ rounds: [], statuses: [] });
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [q, setQ] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    hrmsService
      .getInterviewMeta()
      .then((res) => {
        const payload = unwrap(res) || {};
        setMeta({
          rounds: payload.rounds || [],
          statuses: payload.statuses || [],
        });
      })
      .catch(() => setMeta({ rounds: [], statuses: [] }));
  }, []);

  const roundOptions = useMemo(
    () => (meta.rounds || []).map((r) => ({ value: String(r.value), label: r.label })),
    [meta.rounds]
  );
  const statusOptions = useMemo(
    () => (meta.statuses || []).map((s) => ({ value: s.value, label: s.label })),
    [meta.statuses]
  );

  const listParams = useMemo(
    () => ({
      search: q.trim() || undefined,
      round: filters.round || undefined,
      status: filters.status || undefined,
    }),
    [filters, q]
  );

  const filterPanelValues = useMemo(() => ({ ...filters, q }), [filters, q]);

  const advancedActiveCount = useMemo(() => {
    let n = 0;
    if (filters.round) n += 1;
    if (filters.status) n += 1;
    if (q.trim()) n += 1;
    return n;
  }, [filters, q]);

  const handleApplyFilters = (next) => {
    setFilters({
      round: next.round || "",
      status: next.status || "",
    });
    setTableKey((k) => k + 1);
  };

  const handleResetFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setQ("");
    setTableKey((k) => k + 1);
  };

  const handleRemoveFilter = (key) => {
    if (key === "q") setQ("");
    else setFilters((prev) => ({ ...prev, [key]: "" }));
    setTableKey((k) => k + 1);
  };

  const fetcher = useCallback(
    async ({ page, limit }) => {
      const res = await hrmsService.listInterviews({
        page,
        limit,
        ...listParams,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const metaOut = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta: metaOut };
    },
    [listParams]
  );

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hrmsService.deleteInterview(deleteTarget.id);
      toastSuccess("Interview deleted");
      setDeleteTarget(null);
      setTableKey((k) => k + 1);
    } catch (err) {
      toastErrorFromApi(err, "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await hrmsService.exportInterviews({
        ...listParams,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "interviews.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Export downloaded — matches the selected filters");
    } catch (err) {
      toastErrorFromApi(err, "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "candidate",
        label: "Candidate",
        sortable: false,
        render: (row) => (
          <span className="font-medium text-foreground">{row.candidate_name || "—"}</span>
        ),
      },
      {
        field: "position",
        label: "Position",
        sortable: false,
        render: (row) => row.position_title || "—",
      },
      {
        field: "round",
        label: "Round",
        sortable: false,
        render: (row) => row.round_label || `R${row.round}`,
      },
      {
        field: "scheduled_at",
        label: "When",
        sortable: false,
        render: (row) => formatWhen(row.scheduled_at),
      },
      {
        field: "mode",
        label: "Mode",
        sortable: false,
        render: (row) => row.mode_label || row.mode || "—",
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => (
          <Badge variant={statusVariant(row.status)}>{row.status_label || row.status}</Badge>
        ),
      },
      {
        field: "result",
        label: "Result",
        sortable: false,
        render: (row) =>
          row.result ? (
            <Badge variant={resultVariant(row.result)}>{row.result_label || row.result}</Badge>
          ) : (
            "—"
          ),
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
                aria-label="Edit interview"
                title="Edit"
                onClick={() => router.push(`/hrms/interviews/${row.id}/edit`)}
              >
                <IconPencil className="h-4 w-4" />
              </Button>
            ) : null}
            {perm.can_delete ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Delete interview"
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
        title="Interviews"
        subtitle="Schedule interview rounds for candidates"
        addButtonLabel={perm.can_create ? "Schedule interview" : undefined}
        onAddClick={perm.can_create ? () => router.push("/hrms/interviews/add") : undefined}
        actions={
          <Button size="sm" variant="outline" onClick={handleExport} loading={exporting}>
            <IconDownload className="size-4" /> Export
          </Button>
        }
      >
        <InterviewFilterPanel
          values={filterPanelValues}
          quickSearch={q}
          roundOptions={roundOptions}
          statusOptions={statusOptions}
          activeCount={advancedActiveCount}
          onQuickSearch={(v) => {
            setQ(v);
            setTableKey((k) => k + 1);
          }}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onRemove={handleRemoveFilter}
        />

        <div className="flex min-h-[320px] flex-1 flex-col">
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          showSearch={false}
          height="100%"
          emptyState={
            <EmptyState
              icon={IconCalendarEvent}
              title="No interviews scheduled"
              description="Schedule a round against an existing candidate."
              actionLabel={perm.can_create ? "Schedule interview" : undefined}
              onAction={perm.can_create ? () => router.push("/hrms/interviews/add") : undefined}
            />
          }
        />
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete interview?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.candidate_name || "This interview"} (
                {deleteTarget?.round_label || "round"}) will be removed.
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
