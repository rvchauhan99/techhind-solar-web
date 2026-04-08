"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconDotsVertical, IconFileTypePdf, IconFileDescription, IconCheck, IconX, IconDownload, IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import quotationService from "@/services/quotationService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import Container from "@/components/container";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import QuotationDetailsContent from "./components/QuotationDetailsContent";
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
import { Textarea } from "@/components/ui/textarea";

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
  "status",
  "include_converted",
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
  "approval_status",
];

const IS_APPROVED_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const QUOTATION_STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Sent", label: "Sent" },
  { value: "Converted", label: "Converted" },
  { value: "Not Selected", label: "Not Selected" },
];

const APPROVAL_STATUS_OPTIONS = [
  { value: "Approved", label: "Approved" },
  { value: "Pending Approval", label: "Pending Approval" },
  { value: "Rejected", label: "Rejected" },
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
  const [fullQuotation, setFullQuotation] = useState(null);
  const [loadingQuotation, setLoadingQuotation] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [quotationToApprove, setQuotationToApprove] = useState(null);
  const [unapproveDialogOpen, setUnapproveDialogOpen] = useState(false);
  const [quotationToUnapprove, setQuotationToUnapprove] = useState(null);
  const [managerApproveDialogOpen, setManagerApproveDialogOpen] = useState(false);
  const [managerRejectDialogOpen, setManagerRejectDialogOpen] = useState(false);
  const [quotationForManagerAction, setQuotationForManagerAction] = useState(null);
  const [managerApproveRemarks, setManagerApproveRemarks] = useState("");
  const [managerRejectReasonId, setManagerRejectReasonId] = useState("");
  const [managerRejectRemarks, setManagerRejectRemarks] = useState("");
  const [rejectionReasonOptions, setRejectionReasonOptions] = useState([]);
  const [rejectionReasonsLoading, setRejectionReasonsLoading] = useState(false);

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
      setFullQuotation((prev) => (prev?.id === quotationToApprove ? { ...prev, is_approved: true } : prev));
      setApproveDialogOpen(false);
      setQuotationToApprove(null);
      toast.success("Quotation finalized for order");
    } catch (err) {
      console.error("Failed to approve quotation", err);
      toast.error(err.response?.data?.message || "Failed to finalize quotation");
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
      setFullQuotation((prev) => (prev?.id === quotationToUnapprove ? { ...prev, is_approved: false } : prev));
      setUnapproveDialogOpen(false);
      setQuotationToUnapprove(null);
      toast.success("Quotation unfinalized for order");
    } catch (err) {
      console.error("Failed to unapprove quotation", err);
      toast.error(err.response?.data?.message || "Failed to unfinalize quotation");
    } finally {
      setActionId(null);
    }
  }, [quotationToUnapprove]);

  const handleOpenSidebar = useCallback(async (row) => {
    setSelectedRecord(row);
    setSidebarOpen(true);
    setFullQuotation(null);
    setLoadingQuotation(true);
    try {
      const response = await quotationService.getQuotationById(row.id);
      const data = response?.result ?? response?.data ?? response;
      setFullQuotation(data ?? null);
    } catch (err) {
      console.error("Failed to fetch quotation details", err);
      setFullQuotation(null);
    } finally {
      setLoadingQuotation(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadRejectionReasons = async () => {
      try {
        setRejectionReasonsLoading(true);
        const options = await getReferenceOptionsSearch("reason.model", {
          reason_type: "quotation_rejection",
          is_active: true,
          limit: 200,
        });
        if (!mounted) return;
        setRejectionReasonOptions(Array.isArray(options) ? options : []);
      } catch (err) {
        if (!mounted) return;
        setRejectionReasonOptions([]);
      } finally {
        if (mounted) setRejectionReasonsLoading(false);
      }
    };
    loadRejectionReasons();
    return () => {
      mounted = false;
    };
  }, []);

  const openManagerApproveDialog = useCallback((id) => {
    setQuotationForManagerAction(id);
    setManagerApproveRemarks("");
    setManagerApproveDialogOpen(true);
  }, []);

  const openManagerRejectDialog = useCallback((id) => {
    setQuotationForManagerAction(id);
    setManagerRejectReasonId("");
    setManagerRejectRemarks("");
    setManagerRejectDialogOpen(true);
  }, []);

  const handleManagerApprove = useCallback(async () => {
    if (!quotationForManagerAction) return;
    setActionId(quotationForManagerAction);
    try {
      await quotationService.managerApproveQuotation(quotationForManagerAction, {
        remarks: managerApproveRemarks || "",
      });
      setReloadTrigger((prev) => prev + 1);
      toast.success("Quotation approved by manager");
      setManagerApproveDialogOpen(false);
      setQuotationForManagerAction(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed manager approval");
    } finally {
      setActionId(null);
    }
  }, [quotationForManagerAction, managerApproveRemarks]);

  const handleManagerReject = useCallback(async () => {
    if (!quotationForManagerAction) return;
    if (!managerRejectReasonId) {
      toast.error("Please select rejection reason");
      return;
    }
    setActionId(quotationForManagerAction);
    try {
      await quotationService.managerRejectQuotation(quotationForManagerAction, {
        reason_id: Number(managerRejectReasonId),
        remarks: managerRejectRemarks || "",
      });
      setReloadTrigger((prev) => prev + 1);
      toast.success("Quotation rejected by manager");
      setManagerRejectDialogOpen(false);
      setQuotationForManagerAction(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed manager rejection");
    } finally {
      setActionId(null);
    }
  }, [quotationForManagerAction, managerRejectReasonId, managerRejectRemarks]);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRecord(null);
    setFullQuotation(null);
    setLoadingQuotation(false);
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

  const rowDetailsRender = useCallback(
    (row) => (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1 text-[11px] leading-tight">
        <div><span className="text-muted-foreground">Valid Till:</span> {formatDate(row.valid_till) || "-"}</div>
        <div><span className="text-muted-foreground">Created By:</span> {row.user_name || "-"}</div>
        <div><span className="text-muted-foreground">State:</span> {row.state_name || "-"}</div>
        <div><span className="text-muted-foreground">Order Type:</span> {row.order_type_name || "-"}</div>
        <div><span className="text-muted-foreground">Project Scheme:</span> {row.project_scheme_name || "-"}</div>
        <div><span className="text-muted-foreground">Inquiry #:</span> {row.inquiry_number || "-"}</div>
        <div><span className="text-muted-foreground">Created On:</span> {formatDate(row.created_at) || "-"}</div>
      </div>
    ),
    []
  );

  const columns = useMemo(
    () => [
      {
        field: "quotation_number",
        label: "Quotation #",
        stickyLeft: true,
        stickyWidth: 120,
        width: 120,
        minWidth: 120,
        sortable: true,
        filterType: "text",
        filterKey: "quotation_number",
        defaultFilterOperator: "contains",
        render: (row) => (
          <Button
            type="button"
            variant="link"
            className="text-sm p-0 h-auto text-left font-medium text-[#00823b] hover:text-[#00662e]"
            onClick={() => router.push(`/quotation/${row.id}`)}
          >
            {row.quotation_number || row.id}
          </Button>
        ),
      },
      {
        field: "quotation_date",
        label: "Date",
        width: 110,
        minWidth: 105,
        sortable: true,
        filterType: "date",
        filterKey: "quotation_date_from",
        filterKeyTo: "quotation_date_to",
        operatorKey: "quotation_date_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.quotation_date) || "-",
      },
      {
        field: "customer_name",
        label: "Customer",
        stickyLeft: true,
        stickyWidth: 150,
        width: 160,
        minWidth: 140,
        filterType: "text",
        filterKey: "customer_name",
        defaultFilterOperator: "contains",
        render: (row) => row.customer_name || "-",
      },
      {
        field: "mobile_number",
        label: "Mobile",
        width: 130,
        minWidth: 120,
        filterType: "text",
        filterKey: "mobile_number",
        defaultFilterOperator: "contains",
        render: (row) => row.mobile_number || "-",
      },
      {
        field: "project_capacity",
        label: "Capacity (kW)",
        width: 95,
        minWidth: 90,
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
        label: "Total Payable",
        stickyLeft: true,
        stickyWidth: 130,
        width: 130,
        minWidth: 120,
        sortable: true,
        filterType: "number",
        filterKey: "total_project_value",
        filterKeyTo: "total_project_value_to",
        operatorKey: "total_project_value_op",
        defaultFilterOperator: "equals",
        render: (row) => {
          const value =
            row.total_payable != null && row.total_payable !== ""
              ? Number(row.total_payable)
              : row.total_project_value != null && row.total_project_value !== ""
              ? Number(row.total_project_value)
              : null;
          if (value == null || Number.isNaN(value)) return "-";
          const rounded = Math.round(Number(value) || 0);
          return `₹${rounded.toLocaleString("en-IN")}`;
        },
      },
      {
        field: "is_approved",
        label: "Finalized",
        width: 90,
        minWidth: 86,
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
        field: "approval_status",
        label: "Mgr Approval",
        stickyLeft: true,
        stickyWidth: 120,
        width: 120,
        minWidth: 110,
        filterType: "select",
        filterKey: "approval_status",
        filterOptions: APPROVAL_STATUS_OPTIONS,
        render: (row) => (
          <Badge variant={row.approval_status === "Approved" ? "default" : row.approval_status === "Rejected" ? "destructive" : "secondary"} className="text-xs">
            {row.approval_status || "Approved"}
          </Badge>
        ),
      },
      {
        field: "status",
        label: "Status",
        width: 100,
        minWidth: 95,
        filterType: "select",
        filterKey: "status",
        filterOptions: QUOTATION_STATUS_OPTIONS,
        render: (row) => row.status || "Draft",
      },
      {
        field: "branch_name",
        label: "Branch",
        width: 120,
        minWidth: 110,
        filterType: "text",
        filterKey: "branch_name",
        defaultFilterOperator: "contains",
        render: (row) => row.branch_name || "-",
      },
      {
        field: "actions",
        label: "Actions",
        width: 96,
        minWidth: 96,
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
                {!row.is_approved && row.approval_status === "Approved" && (
                  <DropdownMenuItem
                    onClick={() => handleApproveClick(row.id)}
                    disabled={actionId === row.id}
                  >
                    <IconCheck className="size-4 mr-2" />
                    Finalize For Order
                  </DropdownMenuItem>
                )}
                {row.is_approved && (
                  <DropdownMenuItem
                    onClick={() => handleUnapproveClick(row.id)}
                    disabled={actionId === row.id}
                  >
                    <IconX className="size-4 mr-2" />
                    Unfinalize For Order
                  </DropdownMenuItem>
                )}
                {row.is_manager_for_branch && row.approval_status === "Pending Approval" && (
                  <DropdownMenuItem onClick={() => openManagerApproveDialog(row.id)} disabled={actionId === row.id}>
                    <IconCheck className="size-4 mr-2" />
                    Manager Approve
                  </DropdownMenuItem>
                )}
                {row.is_manager_for_branch && row.approval_status === "Pending Approval" && (
                  <DropdownMenuItem onClick={() => openManagerRejectDialog(row.id)} disabled={actionId === row.id}>
                    <IconX className="size-4 mr-2" />
                    Manager Reject
                  </DropdownMenuItem>
                )}
                {/* <DropdownMenuItem onClick={() => handleEdit(row.id)}>
                  <IconEdit className="size-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteClick(row.id)} className="text-destructive focus:text-destructive">
                  <IconTrash className="size-4 mr-2" />
                  Delete
                </DropdownMenuItem> */}
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
    [handleOpenSidebar, handleApproveClick, handleUnapproveClick, openManagerApproveDialog, openManagerRejectDialog, actionId, router]
  );

  const sidebarHeaderActions = useMemo(
    () =>
      selectedRecord?.id ? (
        <Button variant="outline" size="sm" onClick={() => router.push(`/quotation/${selectedRecord.id}`)}>
          <IconFileTypePdf className="size-4 mr-1.5" />
          View PDF
        </Button>
      ) : null,
    [selectedRecord, router]
  );

  const calculatePaginatedTableHeight = () => `calc(100vh - 140px)`;

  const includeConverted = filters?.include_converted !== "false";
  const showConvertedPills = [
    { value: "all", label: "All" },
    { value: "exclude", label: "Exclude converted" },
  ];

  return (
    <ProtectedRoute>
      <Container className="flex flex-col gap-1 py-1 h-full min-h-0 max-w-[1536px] mx-auto">
        {/* Header: same pattern as home - title + subtitle left; pills + divider + buttons right */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-1.5 mb-1">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Quotations</h1>
            <p className="text-[11px] text-slate-500">
              Create and manage quotations. Use column filters to search.
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] text-slate-400">Show:</span>
            {showConvertedPills.map((p) => {
              const isAll = p.value === "all";
              const isActive = isAll ? includeConverted : !includeConverted;
              return (
                <button
                  key={p.value}
                  onClick={() => setFilter("include_converted", isAll ? "true" : "false")}
                  className={[
                    "text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all",
                    isActive ? "bg-primary text-primary-foreground border-primary" : "bg-white border-slate-200 text-slate-500 hover:border-primary hover:text-primary",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              );
            })}
            <div className="h-4 w-px bg-slate-200 mx-0.5" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/quotation/templates")}
              className="h-7 text-xs gap-1 px-2"
            >
              PDF Templates
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              loading={exporting}
              className="h-7 text-xs gap-1 px-2"
            >
              <IconDownload className="size-4" />
              Export
            </Button>
            {currentPerm.can_create && (
              <Button
                type="button"
                size="sm"
                onClick={() => router.push("/quotation/add")}
                className="h-7 text-xs gap-1 px-2"
              >
                <IconPlus className="size-4" />
                Create Quotation
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0 gap-1.5">
          <PaginatedTable
            key={reloadTrigger}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            showPagination={false}
            compactDensity
            rowDetailsRender={rowDetailsRender}
            height={calculatePaginatedTableHeight()}
            onTotalChange={setTotalCount}
            columnFilterValues={columnFilterValues}
            onColumnFilterChange={handleColumnFilterChange}
            filterParams={filterParams}
            page={page}
            limit={limit}
            q={q}
            sortBy={sortBy || "id"}
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

        <DetailsSidebar
          open={sidebarOpen}
          onClose={handleCloseSidebar}
          title="Quotation Details"
          headerActions={sidebarHeaderActions}
        >
          <QuotationDetailsContent quotation={fullQuotation} loading={loadingQuotation} />
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
              <AlertDialogTitle>Finalize Quotation For Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to finalize this quotation for order selection? Only one quotation per inquiry can be finalized.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={!!actionId}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleApproveConfirm} disabled={!!actionId} loading={!!actionId}>
                Finalize
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={unapproveDialogOpen} onOpenChange={(open) => { if (!open) { setUnapproveDialogOpen(false); setQuotationToUnapprove(null); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unfinalize Quotation For Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove finalization for this quotation?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={!!actionId}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleUnapproveConfirm} disabled={!!actionId} loading={!!actionId}>
                Unfinalize
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={managerApproveDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setManagerApproveDialogOpen(false);
              setQuotationForManagerAction(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Manager Approve Quotation</AlertDialogTitle>
              <AlertDialogDescription>
                Add remarks if needed and confirm manager approval.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks (optional)</label>
              <Textarea
                value={managerApproveRemarks}
                onChange={(e) => setManagerApproveRemarks(e.target.value)}
                placeholder="Enter approval remarks"
                rows={4}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={!!actionId}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleManagerApprove} disabled={!!actionId} loading={!!actionId}>
                Approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={managerRejectDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setManagerRejectDialogOpen(false);
              setQuotationForManagerAction(null);
              setManagerRejectReasonId("");
              setManagerRejectRemarks("");
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Manager Reject Quotation</AlertDialogTitle>
              <AlertDialogDescription>
                Select rejection reason and optionally add remarks.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={managerRejectReasonId}
                onChange={(e) => setManagerRejectReasonId(e.target.value)}
                disabled={rejectionReasonsLoading}
              >
                <option value="">Select reason</option>
                {rejectionReasonOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label || opt.reason || opt.value}
                  </option>
                ))}
              </select>
              <label className="text-sm font-medium">Remarks (optional)</label>
              <Textarea
                value={managerRejectRemarks}
                onChange={(e) => setManagerRejectRemarks(e.target.value)}
                placeholder="Enter rejection remarks"
                rows={4}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={!!actionId}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleManagerReject}
                disabled={!!actionId || !managerRejectReasonId}
                loading={!!actionId}
              >
                Reject
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Container>
    </ProtectedRoute>
  );
}
