"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconPencil, IconTrash, IconUsers } from "@tabler/icons-react";
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

const MODULE_KEY = "hrms_candidates";

function stageBadgeVariant(stage) {
  const n = Number(stage);
  if (n === 0) return "destructive";
  if (n >= 7) return "success";
  return "secondary";
}

export default function HrmsCandidatesPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);
  const [meta, setMeta] = useState({ positions: [], stages: [] });
  const [filters, setFilters] = useState({ position_id: "", stage: "" });
  const [tableKey, setTableKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    hrmsService
      .getCandidateMeta()
      .then((res) => {
        const payload = unwrap(res) || {};
        setMeta({
          positions: payload.positions || [],
          stages: payload.stages || [],
        });
      })
      .catch(() => setMeta({ positions: [], stages: [] }));
  }, []);

  const positionOptions = useMemo(
    () => (meta.positions || []).map((p) => ({ value: String(p.id ?? p.value), label: p.title || p.label })),
    [meta.positions]
  );
  const stageOptions = useMemo(
    () => (meta.stages || []).map((s) => ({ value: String(s.value), label: s.label })),
    [meta.stages]
  );

  const fetcher = useMemo(
    () =>
      async ({ page, limit, q }) => {
        const res = await hrmsService.listCandidates({
          page,
          limit,
          search: q || undefined,
          position_id: filters.position_id || undefined,
          stage: filters.stage !== "" ? filters.stage : undefined,
        });
        const payload = unwrap(res);
        const rows = payload?.data || [];
        const metaOut = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
        return { data: rows, meta: metaOut };
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, tableKey]
  );

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hrmsService.deleteCandidate(deleteTarget.id);
      toastSuccess("Candidate deleted");
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
        field: "name",
        label: "Name",
        sortable: false,
        render: (row) => (
          <span className="font-medium text-foreground">
            {[row.first_name, row.last_name].filter(Boolean).join(" ") || "—"}
          </span>
        ),
      },
      {
        field: "mobile",
        label: "Mobile",
        sortable: false,
        render: (row) => row.mobile || "—",
      },
      {
        field: "email",
        label: "Email",
        sortable: false,
        render: (row) => row.email || "—",
      },
      {
        field: "position",
        label: "Position",
        sortable: false,
        render: (row) => row.position_title || row.position?.title || "—",
      },
      {
        field: "stage",
        label: "Stage",
        sortable: false,
        render: (row) => (
          <Badge variant={stageBadgeVariant(row.stage)}>
            {row.stage_label || `Stage ${row.stage}`}
          </Badge>
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
                aria-label="Edit candidate"
                title="Edit"
                onClick={() => router.push(`/hrms/candidates/${row.id}/edit`)}
              >
                <IconPencil className="h-4 w-4" />
              </Button>
            ) : null}
            {perm.can_delete ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Delete candidate"
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
        title="Candidates"
        subtitle="Applicants linked to open positions"
        addButtonLabel={perm.can_create ? "Add candidate" : undefined}
        onAddClick={perm.can_create ? () => router.push("/hrms/candidates/add") : undefined}
        filterConfig={[
          { key: "position_id", label: "Position", type: "select", options: positionOptions },
          { key: "stage", label: "Stage", type: "select", options: stageOptions },
        ]}
        filterValues={filters}
        showFilterLabels
        onFilterChange={(key, value) => {
          setFilters((f) => ({ ...f, [key]: value }));
          setTableKey((k) => k + 1);
        }}
        onClearFilters={() => {
          setFilters({ position_id: "", stage: "" });
          setTableKey((k) => k + 1);
        }}
      >
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          showSearch
          height="56vh"
          emptyState={
            <EmptyState
              icon={IconUsers}
              title="No candidates"
              description="Add a candidate against an active open position."
              actionLabel={perm.can_create ? "Add candidate" : undefined}
              onAction={perm.can_create ? () => router.push("/hrms/candidates/add") : undefined}
            />
          }
        />

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete candidate?</AlertDialogTitle>
              <AlertDialogDescription>
                {[deleteTarget?.first_name, deleteTarget?.last_name].filter(Boolean).join(" ") ||
                  "This candidate"}{" "}
                will be removed.
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
