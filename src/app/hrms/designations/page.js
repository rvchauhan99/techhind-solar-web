"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

const MODULE_KEY = "hrms_designations";

export default function HrmsDesignationsPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);

  const [tableKey, setTableKey] = useState(0);
  const [filters, setFilters] = useState({ department_id: "", status: "" });
  const [departments, setDepartments] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [counts, setCounts] = useState({ total: null, active: null, inactive: null });
  const [countsLoading, setCountsLoading] = useState(true);

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

  useEffect(() => {
    hrmsService
      .listDepartments({ limit: 100 })
      .then((res) => {
        setDepartments(unwrap(res)?.data || []);
      })
      .catch(() => setDepartments([]));
  }, []);

  const deptOptions = useMemo(
    () => departments.map((d) => ({ value: String(d.id), label: d.title })),
    [departments]
  );

  const fetcher = useMemo(
    () => async ({ page, limit, q }) => {
      const res = await hrmsService.listDesignations({
        page,
        limit,
        search: q || undefined,
        department_id: filters.department_id || undefined,
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
                onClick={() => router.push(`/hrms/designations/${row.id}/edit`)}
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
        title="Designations"
        subtitle="Job titles mapped to departments"
        addButtonLabel={perm.can_create ? "Add Designation" : undefined}
        onAddClick={perm.can_create ? () => router.push("/hrms/designations/add") : undefined}
        filterConfig={[
          { key: "department_id", label: "Department", type: "select", options: deptOptions },
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
          setFilters({ department_id: "", status: "" });
          setTableKey((k) => k + 1);
        }}
      >
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            icon={<IconIdBadge2 size={16} />}
            label="Designations"
            value={counts.total ?? "—"}
            accentColor="#1b365d"
            subLabel="All job titles"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconCircleCheck size={16} />}
            label="Active"
            value={counts.active ?? "—"}
            accentColor="#00823b"
            subLabel="Selectable for employees"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconCircleMinus size={16} />}
            label="Inactive"
            value={counts.inactive ?? "—"}
            accentColor="#64748b"
            subLabel="Retired job titles"
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
              icon={IconIdBadge2}
              title={filters.status || filters.department_id ? "No designations match these filters" : "No designations yet"}
              description={
                filters.status || filters.department_id
                  ? "Try clearing the filters to see all designations."
                  : "Add job titles and map them to a department so employees can be assigned."
              }
              actionLabel={perm.can_create ? "Add Designation" : undefined}
              onAction={perm.can_create ? () => router.push("/hrms/designations/add") : undefined}
            />
          }
        />

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
      </ListingPageContainer>
    </ProtectedRoute>
  );
}

