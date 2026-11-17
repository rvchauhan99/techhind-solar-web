"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconPencil, IconTrash, IconExternalLink, IconFileDescription } from "@tabler/icons-react";
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
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_policies";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function HrmsPoliciesPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);
  const [filters, setFilters] = useState({ status: "", category: "" });
  const [tableKey, setTableKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);

  useEffect(() => {
    hrmsService
      .getPolicyMeta()
      .then((res) => {
        const cats = unwrap(res)?.categories || [];
        setCategoryOptions(cats.map((c) => ({ value: c.value, label: c.label })));
      })
      .catch(() => setCategoryOptions([]));
  }, []);

  const fetcher = useMemo(
    () =>
      async ({ page, limit, q }) => {
        const res = await hrmsService.listPolicies({
          page,
          limit,
          search: q || undefined,
          status: filters.status || undefined,
          category: filters.category || undefined,
        });
        const payload = unwrap(res);
        const rows = payload?.data || [];
        const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
        return { data: rows, meta };
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, tableKey]
  );

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hrmsService.deletePolicy(deleteTarget.id);
      toastSuccess("Policy deleted");
      setDeleteTarget(null);
      setTableKey((k) => k + 1);
    } catch (err) {
      toastErrorFromApi(err, "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const openPdf = async (row) => {
    try {
      const res = await hrmsService.getPolicyUrl(row.id);
      const url = unwrap(res)?.url;
      if (url) window.open(url, "_blank", "noopener");
    } catch (err) {
      toastErrorFromApi(err, "Could not open PDF");
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
      { field: "category", label: "Category", sortable: false },
      { field: "version", label: "Version", sortable: false },
      { field: "issue_date", label: "Issue date", sortable: false },
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
            <Button
              size="icon"
              variant="ghost"
              aria-label="Download policy"
              title="Download"
              onClick={() => openPdf(row)}
            >
              <IconExternalLink className="h-4 w-4" />
            </Button>
            {perm.can_update ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Edit policy"
                title="Edit"
                onClick={() => router.push(`/hrms/policies/${row.id}/edit`)}
              >
                <IconPencil className="h-4 w-4" />
              </Button>
            ) : null}
            {perm.can_delete ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Delete policy"
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
        title="Policies"
        subtitle="Company policy PDF library (HR, compliance, notices, …)"
        addButtonLabel={perm.can_create ? "Add policy" : undefined}
        onAddClick={perm.can_create ? () => router.push("/hrms/policies/add") : undefined}
        filterConfig={[
          { key: "category", label: "Category", type: "select", options: categoryOptions },
          { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
        ]}
        filterValues={filters}
        showFilterLabels
        onFilterChange={(key, value) => {
          setFilters((f) => ({ ...f, [key]: value }));
          setTableKey((k) => k + 1);
        }}
        onClearFilters={() => {
          setFilters({ status: "", category: "" });
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
              icon={IconFileDescription}
              title="No policies"
              description="Upload company policy PDFs by category."
              actionLabel={perm.can_create ? "Add policy" : undefined}
              onAction={perm.can_create ? () => router.push("/hrms/policies/add") : undefined}
            />
          }
        />

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete policy?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.title || "This policy"} will be removed from the library.
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
