"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconDotsVertical, IconEdit, IconTrash, IconFileTypePdf, IconFileDescription, IconCheck, IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import quotationService from "@/services/quotationService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/dataTableUtils";
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

const COLUMN_FILTER_KEYS = [
  "quotation_number",
  "quotation_number_op",
  "quotation_date_from",
  "quotation_date_to",
  "quotation_date_op",
  "valid_till_from",
  "valid_till_to",
  "valid_till_op",
  "customer_name",
  "customer_name_op",
  "mobile_number",
  "mobile_number_op",
  "project_capacity",
  "project_capacity_op",
  "project_capacity_to",
  "total_project_value",
  "total_project_value_op",
  "total_project_value_to",
  "is_approved",
  "user_name",
  "user_name_op",
  "branch_name",
  "branch_name_op",
  "state_name",
  "state_name_op",
  "order_type_name",
  "order_type_name_op",
  "project_scheme_name",
  "project_scheme_name_op",
  "inquiry_number",
  "inquiry_number_op",
  "created_at_from",
  "created_at_to",
  "created_at_op",
];

const IS_APPROVED_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export default function QuotationList() {
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  const router = useRouter();
  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } = listingState;

  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [quotationToApprove, setQuotationToApprove] = useState(null);
  const [unapproveDialogOpen, setUnapproveDialogOpen] = useState(false);
  const [quotationToUnapprove, setQuotationToUnapprove] = useState(null);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      const blob = await quotationService.exportQuotations(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quotations-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export quotations");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const handleEdit = (id) => router.push(`/quotation/edit?id=${id}`);

  const handleDeleteClick = (id) => {
    setQuotationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quotationToDelete) return;
    setDeleting(true);
    try {
      await quotationService.deleteQuotation(quotationToDelete);
      setDeleteDialogOpen(false);
      setQuotationToDelete(null);
      setReloadTrigger((prev) => prev + 1);
      toast.success("Quotation deleted");
    } catch (err) {
      console.error("Failed to delete quotation", err);
      toast.error(err.response?.data?.message || "Failed to delete quotation");
    } finally {
      setDeleting(false);
    }
  };

  const handlePdfDownload = (id) => router.push(`/quotation/${id}`);

  const handleApproveClick = (id) => {
    setQuotationToApprove(id);
    setApproveDialogOpen(true);
  };

  const handleApproveConfirm = useCallback(async () => {
    if (!quotationToApprove) return;
    setActionId(quotationToApprove);
    try {
      await quotationService.approveQuotation(quotationToApprove);
      setReloadTrigger((prev) => prev + 1);
      setSelectedRecord((prev) => (prev?.id === quotationToApprove ? { ...prev, is_approved: true } : prev));
      setApproveDialogOpen(false);
      setQuotationToApprove(null);
      toast.success("Quotation approved");
    } catch (err) {
      console.error("Failed to approve quotation", err);
      toast.error(err.response?.data?.message || "Failed to approve quotation");
    } finally {
      setActionId(null);
    }
  }, [quotationToApprove]);

  const handleUnapproveClick = (id) => {
    setQuotationToUnapprove(id);
    setUnapproveDialogOpen(true);
  };

  const handleUnapproveConfirm = useCallback(async () => {
    if (!quotationToUnapprove) return;
    setActionId(quotationToUnapprove);
    try {
      await quotationService.unapproveQuotation(quotationToUnapprove);
      setReloadTrigger((prev) => prev + 1);
      setSelectedRecord((prev) => (prev?.id === quotationToUnapprove ? { ...prev, is_approved: false } : prev));
      setUnapproveDialogOpen(false);
      setQuotationToUnapprove(null);
      toast.success("Quotation unapproved");
    } catch (err) {
      console.error("Failed to unapprove quotation", err);
      toast.error(err.response?.data?.message || "Failed to unapprove quotation");
    } finally {
      setActionId(null);
    }
  }, [quotationToUnapprove]);

  const handleOpenSidebar = useCallback(async (row) => {
    setSelectedRecord(row);
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRecord(null);
  }, []);

  const fetcher = useMemo(
    () => async (params) => {
      const response = await quotationService.getQuotations(params);
      const result = response?.result ?? response;
      return {
        data: result?.data ?? [],
        meta: result?.meta ?? { total: 0, page: params.page, pages: 0, limit: params.limit },
      };
    },
    [reloadTrigger]
  );

  const filterParams = useMemo(
    () => ({
      q: undefined,
      ...Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      ),
    }),
    [filters]
  );

  const columns = useMemo(
    () => [
      {
        field: "quotation_number",
        label: "Quotation #",
        sortable: true,
        filterType: "text",
        filterKey: "quotation_number",
        defaultFilterOperator: "contains",
        render: (row) => (
          <Button
            type="button"
            variant="link"
            className="text-sm p-0 h-auto text-left font-normal"
            onClick={() => router.push(`/quotation/${row.id}`)}
          >
            {row.quotation_number || row.id}
          </Button>
        ),
      },
      {
        field: "quotation_date",
        label: "Date",
        sortable: true,
        filterType: "date",
        filterKey: "quotation_date_from",
        filterKeyTo: "quotation_date_to",
        operatorKey: "quotation_date_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.quotation_date) || "-",
      },
      {
        field: "valid_till",
        label: "Valid Till",
        sortable: true,
        filterType: "date",
        filterKey: "valid_till_from",
        filterKeyTo: "valid_till_to",
        operatorKey: "valid_till_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.valid_till) || "-",
      },
      {
        field: "customer_name",
        label: "Customer",
        filterType: "text",
        filterKey: "customer_name",
        defaultFilterOperator: "contains",
        render: (row) => row.customer_name || "-",
      },
      {
        field: "mobile_number",
        label: "Mobile",
        filterType: "text",
        filterKey: "mobile_number",
        defaultFilterOperator: "contains",
        render: (row) => row.mobile_number || "-",
      },
      {
        field: "project_capacity",
        label: "Capacity (kW)",
        sortable: true,
        filterType: "number",
        filterKey: "project_capacity",
        filterKeyTo: "project_capacity_to",
        operatorKey: "project_capacity_op",
        defaultFilterOperator: "equals",
        render: (row) => (row.project_capacity != null ? Number(row.project_capacity).toFixed(2) : "-"),
      },
      {
        field: "total_project_value",
        label: "Total Value",
        sortable: true,
        filterType: "number",
        filterKey: "total_project_value",
        filterKeyTo: "total_project_value_to",
        operatorKey: "total_project_value_op",
        defaultFilterOperator: "equals",
        render: (row) =>
          row.total_project_value != null ? `₹${Number(row.total_project_value).toLocaleString()}` : "-",
      },
      {
        field: "is_approved",
        label: "Approved",
        filterType: "select",
        filterKey: "is_approved",
        filterOptions: IS_APPROVED_OPTIONS,
        render: (row) => (
          <Badge variant={row.is_approved ? "default" : "secondary"} className="text-xs">
            {row.is_approved ? "Yes" : "No"}
          </Badge>
        ),
      },
      {
        field: "user_name",
        label: "Created By",
        filterType: "text",
        filterKey: "user_name",
        defaultFilterOperator: "contains",
        render: (row) => row.user_name || "-",
      },
      {
        field: "branch_name",
        label: "Branch",
        filterType: "text",
        filterKey: "branch_name",
        defaultFilterOperator: "contains",
        render: (row) => row.branch_name || "-",
      },
      {
        field: "state_name",
        label: "State",
        filterType: "text",
        filterKey: "state_name",
        defaultFilterOperator: "contains",
        render: (row) => row.state_name || "-",
      },
      {
        field: "order_type_name",
        label: "Order Type",
        filterType: "text",
        filterKey: "order_type_name",
        defaultFilterOperator: "contains",
        render: (row) => row.order_type_name || "-",
      },
      {
        field: "project_scheme_name",
        label: "Project Scheme",
        filterType: "text",
        filterKey: "project_scheme_name",
        defaultFilterOperator: "contains",
        render: (row) => row.project_scheme_name || "-",
      },
      {
        field: "inquiry_number",
        label: "Inquiry #",
        filterType: "text",
        filterKey: "inquiry_number",
        defaultFilterOperator: "contains",
        render: (row) => row.inquiry_number || "-",
      },
      {
        field: "created_at",
        label: "Created On",
        sortable: true,
        filterType: "date",
        filterKey: "created_at_from",
        filterKeyTo: "created_at_to",
        operatorKey: "created_at_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.created_at) || "-",
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        isActionColumn: true,
        render: (row) => (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => handleOpenSidebar(row)}
              title="View details"
              aria-label="View details"
            >
              <IconFileDescription className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground h-8 w-8 shrink-0">
                <IconDotsVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!row.is_approved && (
                  <DropdownMenuItem
                    onClick={() => handleApproveClick(row.id)}
                    disabled={actionId === row.id}
                  >
                    <IconCheck className="size-4 mr-2" />
                    Approve
                  </DropdownMenuItem>
                )}
                {row.is_approved && (
                  <DropdownMenuItem
                    onClick={() => handleUnapproveClick(row.id)}
                    disabled={actionId === row.id}
                  >
                    <IconX className="size-4 mr-2" />
                    Unapprove
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleEdit(row.id)}>
                  <IconEdit className="size-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteClick(row.id)} className="text-destructive focus:text-destructive">
                  <IconTrash className="size-4 mr-2" />
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePdfDownload(row.id)}>
                  <IconFileTypePdf className="size-4 mr-2" />
                  View PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [handleOpenSidebar, handleApproveClick, handleUnapproveClick, actionId, router]
  );

  const sidebarContent = useMemo(() => {
    if (!selectedRecord) return null;
    const r = selectedRecord;
    return (
      <div className="pr-1 space-y-3">
        <p className="font-semibold">{r.quotation_number || r.id}</p>
        <p className="text-xs font-semibold text-muted-foreground">Date</p>
        <p className="text-sm">{formatDate(r.quotation_date) ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Valid Till</p>
        <p className="text-sm">{formatDate(r.valid_till) ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Customer</p>
        <p className="text-sm">{r.customer_name ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Mobile</p>
        <p className="text-sm">{r.mobile_number ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Capacity</p>
        <p className="text-sm">{r.project_capacity != null ? `${r.project_capacity} kW` : "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Total Value</p>
        <p className="text-sm">
          {r.total_project_value != null ? `₹${Number(r.total_project_value).toLocaleString()}` : "-"}
        </p>
        <p className="text-xs font-semibold text-muted-foreground">Approved</p>
        <p className="text-sm">{r.is_approved ? "Yes" : "No"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Created By</p>
        <p className="text-sm">{r.user_name ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Branch</p>
        <p className="text-sm">{r.branch_name ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Inquiry #</p>
        <p className="text-sm">{r.inquiry_number ?? "-"}</p>
      </div>
    );
  }, [selectedRecord]);

  const calculatePaginatedTableHeight = () => `calc(100vh - 150px)`;

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Quotations"
        addButtonLabel={currentPerm.can_create ? "Create Quotation" : undefined}
        onAddClick={currentPerm.can_create ? () => router.push("/quotation/add") : undefined}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <PaginatedTable
            key={reloadTrigger}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            showPagination={false}
            height={calculatePaginatedTableHeight()}
            onTotalChange={setTotalCount}
            columnFilterValues={columnFilterValues}
            onColumnFilterChange={handleColumnFilterChange}
            filterParams={filterParams}
            page={page}
            limit={limit}
            q={q}
            sortBy={sortBy || "created_at"}
            sortOrder={sortOrder || "DESC"}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            onQChange={setQ}
            onSortChange={setSort}
          />
          <PaginationControls
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            rowsPerPageOptions={[20, 50, 100, 200]}
          />
        </div>

        <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Quotation Details">
          {sidebarContent}
        </DetailsSidebar>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this quotation? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="sm"
                loading={deleting}
                onClick={handleDeleteConfirm}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={approveDialogOpen} onOpenChange={(open) => { if (!open) { setApproveDialogOpen(false); setQuotationToApprove(null); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Quotation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this quotation? Only one quotation per inquiry can be approved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={!!actionId}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleApproveConfirm} disabled={!!actionId} loading={!!actionId}>
                Approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={unapproveDialogOpen} onOpenChange={(open) => { if (!open) { setUnapproveDialogOpen(false); setQuotationToUnapprove(null); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unapprove Quotation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unapprove this quotation?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={!!actionId}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleUnapproveConfirm} disabled={!!actionId} loading={!!actionId}>
                Unapprove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
