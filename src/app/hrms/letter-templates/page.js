"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconPencil, IconTrash, IconFileDescription } from "@tabler/icons-react";
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

const MODULE_KEY = "hrms_letter_templates";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function HrmsLetterTemplatesPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);
  const [filters, setFilters] = useState({ status: "", letter_type: "" });
  const [tableKey, setTableKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [typeOptions, setTypeOptions] = useState([]);

  useEffect(() => {
    hrmsService
      .getLetterTemplateMeta()
      .then((res) => {
        const types = unwrap(res)?.types || [];
        setTypeOptions(types.map((t) => ({ value: t.value, label: t.label })));
      })
      .catch(() => setTypeOptions([]));
  }, []);

  const fetcher = useMemo(
    () =>
      async ({ page, limit, q }) => {
        const res = await hrmsService.listLetterTemplates({
          page,
          limit,
          search: q || undefined,
          status: filters.status || undefined,
          letter_type: filters.letter_type || undefined,
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
      await hrmsService.deleteLetterTemplate(deleteTarget.id);
      toastSuccess("Letter template deleted");
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
        field: "letter_type",
        label: "Type",
        sortable: false,
        render: (row) => (
          <span className="font-medium text-foreground">
            {row.letter_type_label || row.letter_type}
          </span>
        ),
      },
      { field: "title", label: "Title", sortable: false },
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
                aria-label="Edit template"
                title="Edit"
                onClick={() => router.push(`/hrms/letter-templates/${row.id}/edit`)}
              >
                <IconPencil className="h-4 w-4" />
              </Button>
            ) : null}
            {perm.can_delete ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Delete template"
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
        title="Letter templates"
        subtitle="HTML templates with placeholders for HR letters (generate in a later step)"
        addButtonLabel={perm.can_create ? "Add template" : undefined}
        onAddClick={perm.can_create ? () => router.push("/hrms/letter-templates/add") : undefined}
        filterConfig={[
          { key: "letter_type", label: "Letter type", type: "select", options: typeOptions },
          { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
        ]}
        filterValues={filters}
        showFilterLabels
        onFilterChange={(key, value) => {
          setFilters((f) => ({ ...f, [key]: value }));
          setTableKey((k) => k + 1);
        }}
        onClearFilters={() => {
          setFilters({ status: "", letter_type: "" });
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
              title="No letter templates"
              description="Create one template per letter type (offer, appointment, welcome, …)."
              actionLabel={perm.can_create ? "Add template" : undefined}
              onAction={
                perm.can_create ? () => router.push("/hrms/letter-templates/add") : undefined
              }
            />
          }
        />

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete letter template?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.letter_type_label || deleteTarget?.title || "This template"} will be
                removed. You can create it again later.
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
