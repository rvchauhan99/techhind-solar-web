"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  IconPencil,
  IconPlus,
  IconGavel,
  IconCircleCheck,
  IconCircleOff,
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
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_penalties";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function HrmsPenaltiesPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);

  const [tableKey, setTableKey] = useState(0);
  const [filters, setFilters] = useState({ status: "" });
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState({ total: null, active: null, inactive: null });
  const [countsLoading, setCountsLoading] = useState(true);

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

  const fetcher = useMemo(
    () =>
      async ({ page, limit, q }) => {
        const res = await hrmsService.listPenalties({
          page,
          limit,
          search: q || undefined,
          status: filters.status || undefined,
        });
        const payload = unwrap(res);
        const rows = payload?.data || [];
        const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
        return { data: rows, meta };
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, tableKey]
  );

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
                onClick={() => router.push(`/hrms/penalties/${row.id}/edit`)}
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
    [perm.can_update, perm.can_delete, router]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Penalties"
        subtitle="Penalty types and amounts used when issuing penalties"
        actions={
          perm.can_create ? (
            <Button size="sm" onClick={() => router.push("/hrms/penalties/add")}>
              <IconPlus className="size-4" /> Add Penalty
            </Button>
          ) : null
        }
        filterConfig={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          },
        ]}
        filterValues={filters}
        showFilterLabels
        onFilterChange={(key, value) => {
          setFilters((f) => ({ ...f, [key]: value }));
          setTableKey((k) => k + 1);
        }}
        onClearFilters={() => {
          setFilters({ status: "" });
          setTableKey((k) => k + 1);
        }}
      >
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            icon={<IconGavel size={16} />}
            label="Penalty types"
            value={counts.total ?? "—"}
            accentColor="#1b365d"
            subLabel="All penalties"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconCircleCheck size={16} />}
            label="Active"
            value={counts.active ?? "—"}
            accentColor="#00823b"
            subLabel="Can be issued"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconCircleOff size={16} />}
            label="Inactive"
            value={counts.inactive ?? "—"}
            accentColor="#8a8f98"
            subLabel="Not issuable"
            loading={countsLoading}
          />
        </div>

        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          showSearch
          height="58vh"
          initialSortBy="title"
          initialSortOrder="asc"
          emptyState={
            <EmptyState
              icon={IconGavel}
              title="No penalties yet"
              description="Create a penalty type such as Late Coming or Dress Code with a standard amount."
              actionLabel={perm.can_create ? "Add Penalty" : undefined}
              onAction={perm.can_create ? () => router.push("/hrms/penalties/add") : undefined}
            />
          }
        />

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
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
