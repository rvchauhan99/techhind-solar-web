"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconDotsVertical,
  IconFileDescription,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import quotationService from "@/services/quotationService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import Container from "@/components/container";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import QuotationDetailsContent from "../components/QuotationDetailsContent";
import { useListingQueryState } from "@/hooks/useListingQueryState";
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
  "customer_name",
  "customer_name_op",
  "mobile_number",
  "mobile_number_op",
  "branch_name",
  "branch_name_op",
  "created_at_from",
  "created_at_to",
  "created_at_op",
];

const PENDING_APPROVAL_STATUS = "Pending Approval";

export default function QuotationManagerApprovalPage() {
  const router = useRouter();
  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const {
    page,
    limit,
    q,
    sortBy,
    sortOrder,
    filters,
    setPage,
    setLimit,
    setQ,
    setFilter,
    setSort,
  } = listingState;

  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [fullQuotation, setFullQuotation] = useState(null);
  const [loadingQuotation, setLoadingQuotation] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [managerApproveDialogOpen, setManagerApproveDialogOpen] = useState(false);
  const [managerRejectDialogOpen, setManagerRejectDialogOpen] = useState(false);
  const [quotationForManagerAction, setQuotationForManagerAction] = useState(null);
  const [managerApproveRemarks, setManagerApproveRemarks] = useState("");
  const [managerRejectReasonId, setManagerRejectReasonId] = useState("");
  const [managerRejectRemarks, setManagerRejectRemarks] = useState("");
  const [rejectionReasonOptions, setRejectionReasonOptions] = useState([]);
  const [rejectionReasonsLoading, setRejectionReasonsLoading] = useState(false);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback(
    (key, value) => setFilter(key, value),
    [setFilter]
  );

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
      setSelectedRecord((prev) =>
        prev?.id === quotationForManagerAction ? null : prev
      );
      setFullQuotation((prev) =>
        prev?.id === quotationForManagerAction ? null : prev
      );
      if (selectedRecord?.id === quotationForManagerAction) {
        setSidebarOpen(false);
      }
      setManagerApproveDialogOpen(false);
      setQuotationForManagerAction(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed manager approval");
    } finally {
      setActionId(null);
    }
  }, [selectedRecord, quotationForManagerAction, managerApproveRemarks]);

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
      setSelectedRecord((prev) =>
        prev?.id === quotationForManagerAction ? null : prev
      );
      setFullQuotation((prev) =>
        prev?.id === quotationForManagerAction ? null : prev
      );
      if (selectedRecord?.id === quotationForManagerAction) {
        setSidebarOpen(false);
      }
      setManagerRejectDialogOpen(false);
      setQuotationForManagerAction(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed manager rejection");
    } finally {
      setActionId(null);
    }
  }, [
    selectedRecord,
    quotationForManagerAction,
    managerRejectReasonId,
    managerRejectRemarks,
  ]);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRecord(null);
    setFullQuotation(null);
    setLoadingQuotation(false);
  }, []);

  const fetcher = useMemo(
    () => async (params) => {
      const response = await quotationService.getQuotations({
        ...params,
        approval_status: PENDING_APPROVAL_STATUS,
        include_converted: true,
      });
      const result = response?.result ?? response;
      return {
        data: result?.data ?? [],
        meta: result?.meta ?? {
          total: 0,
          page: params.page,
          pages: 0,
          limit: params.limit,
        },
      };
    },
    [reloadTrigger]
  );

  const filterParams = useMemo(
    () => ({
      q: undefined,
      approval_status: PENDING_APPROVAL_STATUS,
      include_converted: true,
      ...Object.fromEntries(
        Object.entries(filters || {}).filter(
          ([, v]) => v != null && String(v).trim() !== ""
        )
      ),
    }),
    [filters]
  );

  const rowDetailsRender = useCallback(
    (row) => (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1 text-[11px] leading-tight">
        <div>
          <span className="text-muted-foreground">Created By:</span>{" "}
          {row.user_name || "-"}
        </div>
        <div>
          <span className="text-muted-foreground">Inquiry #:</span>{" "}
          {row.inquiry_number || "-"}
        </div>
        <div>
          <span className="text-muted-foreground">Created On:</span>{" "}
          {formatDate(row.created_at) || "-"}
        </div>
        <div>
          <span className="text-muted-foreground">Approval Requested:</span>{" "}
          {formatDate(row.approval_requested_at) || "-"}
        </div>
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
        render: (row) => formatDate(row.quotation_date) || "-",
      },
      {
        field: "customer_name",
        label: "Customer",
        stickyLeft: true,
        stickyWidth: 170,
        width: 170,
        minWidth: 150,
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
        field: "branch_name",
        label: "Branch",
        width: 130,
        minWidth: 120,
        filterType: "text",
        filterKey: "branch_name",
        defaultFilterOperator: "contains",
        render: (row) => row.branch_name || "-",
      },
      {
        field: "total_project_value",
        label: "Total Payable",
        stickyLeft: true,
        stickyWidth: 130,
        width: 130,
        minWidth: 120,
        sortable: true,
        render: (row) => {
          const value =
            row.total_payable != null && row.total_payable !== ""
              ? Number(row.total_payable)
              : row.total_project_value != null && row.total_project_value !== ""
                ? Number(row.total_project_value)
                : null;
          if (value == null || Number.isNaN(value)) return "-";
          return `₹${Math.round(value).toLocaleString("en-IN")}`;
        },
      },
      {
        field: "approval_status",
        label: "Mgr Approval",
        stickyLeft: true,
        stickyWidth: 120,
        width: 120,
        minWidth: 110,
        render: (row) => (
          <Badge variant="secondary" className="text-xs">
            {row.approval_status || PENDING_APPROVAL_STATUS}
          </Badge>
        ),
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
                {row.is_manager_for_branch && row.approval_status === PENDING_APPROVAL_STATUS && (
                  <DropdownMenuItem
                    onClick={() => openManagerApproveDialog(row.id)}
                    disabled={actionId === row.id}
                  >
                    <IconCheck className="size-4 mr-2" />
                    Manager Approve
                  </DropdownMenuItem>
                )}
                {row.is_manager_for_branch && row.approval_status === PENDING_APPROVAL_STATUS && (
                  <DropdownMenuItem
                    onClick={() => openManagerRejectDialog(row.id)}
                    disabled={actionId === row.id}
                  >
                    <IconX className="size-4 mr-2" />
                    Manager Reject
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [actionId, openManagerApproveDialog, openManagerRejectDialog, handleOpenSidebar, router]
  );

  const calculatePaginatedTableHeight = () => "calc(100vh - 140px)";

  return (
    <ProtectedRoute>
      <Container className="flex flex-col gap-1 py-1 h-full min-h-0 max-w-[1536px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-1.5 mb-1">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
              Branch Manager Approvals
            </h1>
            <p className="text-[11px] text-slate-500">
              Review pending quotations and approve/reject from this queue.
            </p>
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
        >
          <QuotationDetailsContent
            quotation={fullQuotation}
            loading={loadingQuotation}
          />
        </DetailsSidebar>

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

