"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

const MODULE_KEY = "hrms_departments";
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function HrmsDepartmentsPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);

  const [tableKey, setTableKey] = useState(0);
  const [status, setStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [counts, setCounts] = useState({ total: null, active: null, inactive: null });
  const [countsLoading, setCountsLoading] = useState(true);

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

  const fetcher = useMemo(
    () => async ({ page, limit, q }) => {
      const res = await hrmsService.listDepartments({
        page,
        limit,
        search: q || undefined,
        status: status || undefined,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, tableKey]
  );

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
                onClick={() => router.push(`/hrms/departments/${row.id}/edit`)}
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
    [perm.can_update, perm.can_delete, router]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Departments"
        subtitle="Organisation departments and their heads"
        addButtonLabel={perm.can_create ? "Add Department" : undefined}
        onAddClick={perm.can_create ? () => router.push("/hrms/departments/add") : undefined}
        filterConfig={[{ key: "status", label: "Status", type: "select", options: STATUS_OPTIONS }]}
        filterValues={{ status }}
        showFilterLabels
        onFilterChange={(key, value) => {
          if (key === "status") {
            setStatus(value);
            setTableKey((k) => k + 1);
          }
        }}
        onClearFilters={() => {
          setStatus("");
          setTableKey((k) => k + 1);
        }}
      >
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            icon={<IconBuildingCommunity size={16} />}
            label="Departments"
            value={counts.total ?? "—"}
            accentColor="#1b365d"
            subLabel="All departments"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconCircleCheck size={16} />}
            label="Active"
            value={counts.active ?? "—"}
            accentColor="#00823b"
            subLabel="Available for employees"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconCircleMinus size={16} />}
            label="Inactive"
            value={counts.inactive ?? "—"}
            accentColor="#64748b"
            subLabel="Hidden from new assignments"
            loading={countsLoading}
          />
        </div>

        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          showSearch
          height="60vh"
          emptyState={
            <EmptyState
              icon={IconBuildingCommunity}
              title={status ? "No departments match this filter" : "No departments yet"}
              description={
                status
                  ? "Try clearing the status filter to see all departments."
                  : "Create your first department so employees and designations can be grouped."
              }
              actionLabel={perm.can_create ? "Add Department" : undefined}
              onAction={perm.can_create ? () => router.push("/hrms/departments/add") : undefined}
            />
          }
        />

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
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
