"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { toastSuccess, toastError } from "@/utils/toast";
import { IconPhoneCall, IconFileDescription } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import followupService from "@/services/followupService";
import FollowupForm from "./components/FollowupForm";
import { useAuth } from "@/hooks/useAuth";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate } from "@/utils/dataTableUtils";

const COLUMN_FILTER_KEYS = [
  "id",
  "id_op",
  "date_of_inquiry_from",
  "date_of_inquiry_to",
  "date_of_inquiry_op",
  "status",
  "followup_status",
  "followup_remarks",
  "followup_remarks_op",
  "followup_next_reminder_from",
  "followup_next_reminder_to",
  "followup_next_reminder_op",
  "capacity",
  "capacity_op",
  "capacity_to",
  "followup_created_at_from",
  "followup_created_at_to",
  "followup_created_at_op",
];

const STATUS_OPTIONS = [
  { value: "New", label: "New" },
  { value: "Connected", label: "Connected" },
  { value: "Site Visit Done", label: "Site Visit Done" },
  { value: "Quotation", label: "Quotation" },
  { value: "Under Discussion", label: "Under Discussion" },
];

export default function FollowupPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } = listingState;

  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [selectedInquiryId, setSelectedInquiryId] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      if (exportParams.followup_status) {
        exportParams.inquiry_status = exportParams.followup_status;
        delete exportParams.followup_status;
      }
      const blob = await followupService.exportFollowups(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `followups-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export followups");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const handleOpenModal = (inquiryId) => {
    setSelectedInquiryId(inquiryId);
    setModalOpen(true);
    setServerError(null);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedInquiryId(null);
    setServerError(null);
  };

  const handleOpenSidebar = useCallback((row) => {
    setSelectedRecord(row);
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRecord(null);
  }, []);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      await followupService.createFollowup(payload);
      toastSuccess("Followup created successfully");
      handleCloseModal();
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to create followup";
      setServerError(errorMessage);
      toastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString();
    } catch {
      return "N/A";
    }
  };

  const filterParams = useMemo(() => {
    const entries = Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "");
    const obj = Object.fromEntries(entries);
    if (obj.followup_status) {
      obj.inquiry_status = obj.followup_status;
      delete obj.followup_status;
    }
    if (obj.id) {
      obj.inquiry_id = obj.id;
      delete obj.id;
      delete obj.id_op;
    }
    return { q: undefined, ...obj };
  }, [filters]);

  const fetcher = useMemo(
    () => async (params) => {
      const apiParams = { ...params };
      if (apiParams.sortBy === "followup_created_at") apiParams.sortBy = "created_at";
      if (apiParams.sortBy === "followup_status") apiParams.sortBy = "inquiry_status";
      const response = await followupService.listFollowups(apiParams);
      const result = response?.result ?? response;
      return {
        data: result?.data ?? [],
        meta: result?.meta ?? { total: 0, page: params.page, pages: 0, limit: params.limit },
      };
    },
    [reloadTrigger]
  );

  const columns = useMemo(
    () => [
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
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => handleOpenModal(row.id)}
              title="Create Followup"
              aria-label="Create Followup"
            >
              <IconPhoneCall className="size-4" />
            </Button>
          </div>
        ),
      },
      {
        field: "id",
        label: "Inquiry ID",
        sortable: true,
        filterType: "text",
        filterKey: "id",
        defaultFilterOperator: "contains",
        render: (row) => row.id ?? "-",
      },
      {
        field: "inquiry_info",
        label: "Inquiry",
        sortable: false,
        render: (row) => `#${row.id} - ${formatDateOnly(row.date_of_inquiry)}`,
      },
      {
        field: "date_of_inquiry",
        label: "Inquiry Date",
        sortable: true,
        filterType: "date",
        filterKey: "date_of_inquiry_from",
        filterKeyTo: "date_of_inquiry_to",
        operatorKey: "date_of_inquiry_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.date_of_inquiry) || "-",
      },
      {
        field: "inquiry_details",
        label: "Inquiry Details",
        sortable: false,
        render: (row) => (
          <div className="space-y-0.5">
            <p className="text-sm">
              <strong>Status:</strong> {row.status || "N/A"}
            </p>
            <p className="text-sm">
              <strong>Capacity:</strong> {row.capacity != null ? `${row.capacity} kW` : "N/A"}
            </p>
            {row.estimated_cost && (
              <p className="text-sm">
                <strong>Est. Cost:</strong> ₹{row.estimated_cost}
              </p>
            )}
          </div>
        ),
      },
      {
        field: "status",
        label: "Inquiry Status",
        sortable: true,
        filterType: "select",
        filterKey: "status",
        filterOptions: STATUS_OPTIONS,
        render: (row) => row.status || "-",
      },
      {
        field: "followup_status",
        label: "Followup Status",
        sortable: true,
        filterType: "select",
        filterKey: "followup_status",
        filterOptions: STATUS_OPTIONS,
        render: (row) =>
          row.followup_id ? (
            row.followup_status || "N/A"
          ) : (
            <span className="text-muted-foreground text-sm">No Followup</span>
          ),
      },
      {
        field: "followup_remarks",
        label: "Remarks",
        filterType: "text",
        filterKey: "followup_remarks",
        defaultFilterOperator: "contains",
        render: (row) => {
          if (!row.followup_id) return <span className="text-muted-foreground text-sm">-</span>;
          return row.followup_remarks
            ? row.followup_remarks.length > 50
              ? `${row.followup_remarks.substring(0, 50)}...`
              : row.followup_remarks
            : "N/A";
        },
      },
      {
        field: "capacity",
        label: "Capacity",
        sortable: true,
        filterType: "number",
        filterKey: "capacity",
        filterKeyTo: "capacity_to",
        operatorKey: "capacity_op",
        defaultFilterOperator: "equals",
        render: (row) => (row.capacity != null ? `${row.capacity} kW` : "-"),
      },
      {
        field: "followup_next_reminder",
        label: "Next Reminder",
        filterType: "date",
        filterKey: "followup_next_reminder_from",
        filterKeyTo: "followup_next_reminder_to",
        operatorKey: "followup_next_reminder_op",
        defaultFilterOperator: "inRange",
        render: (row) =>
          row.followup_id ? (
            formatDate(row.followup_next_reminder) || "-"
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          ),
      },
      {
        field: "followup_created_at",
        label: "Call On",
        sortable: true,
        filterType: "date",
        filterKey: "followup_created_at_from",
        filterKeyTo: "followup_created_at_to",
        operatorKey: "followup_created_at_op",
        defaultFilterOperator: "inRange",
        render: (row) =>
          row.followup_id ? (
            formatDate(row.followup_created_at) || "-"
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          ),
      },
      {
        field: "call_by",
        label: "Call By",
        render: (row) => {
          if (!row.followup_id) return <span className="text-muted-foreground text-sm">-</span>;
          const user = row.followup_call_by_user;
          return user ? `${user.name} (${user.email})` : "N/A";
        },
      },
      {
        field: "is_schedule_site_visit",
        label: "Site Visit",
        render: (row) => {
          if (!row.followup_id) return <span className="text-muted-foreground text-sm">-</span>;
          return (
            <Badge variant={row.followup_is_schedule_site_visit ? "default" : "secondary"} className="text-xs">
              {row.followup_is_schedule_site_visit ? "Yes" : "No"}
            </Badge>
          );
        },
      },
      {
        field: "is_msg_send_to_customer",
        label: "Msg Sent",
        render: (row) => {
          if (!row.followup_id) return <span className="text-muted-foreground text-sm">-</span>;
          return (
            <Badge variant={row.followup_is_msg_send_to_customer ? "default" : "secondary"} className="text-xs">
              {row.followup_is_msg_send_to_customer ? "Yes" : "No"}
            </Badge>
          );
        },
      },
    ],
    [handleOpenModal, handleOpenSidebar]
  );

  const sidebarContent = useMemo(() => {
    if (!selectedRecord) return null;
    const r = selectedRecord;
    return (
      <div className="pr-1 space-y-3">
        <p className="font-semibold">Followup #{r.followup_id ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Inquiry ID</p>
        <p className="text-sm">{r.id ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Inquiry Status</p>
        <p className="text-sm">{r.status ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Followup Status</p>
        <p className="text-sm">{r.followup_status ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Inquiry Date</p>
        <p className="text-sm">{formatDate(r.date_of_inquiry) ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Capacity</p>
        <p className="text-sm">{r.capacity != null ? `${r.capacity} kW` : "-"}</p>
        {r.estimated_cost && (
          <>
            <p className="text-xs font-semibold text-muted-foreground">Est. Cost</p>
            <p className="text-sm">₹{r.estimated_cost}</p>
          </>
        )}
        <p className="text-xs font-semibold text-muted-foreground">Next Reminder</p>
        <p className="text-sm">{formatDate(r.followup_next_reminder) ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Call On</p>
        <p className="text-sm">{formatDate(r.followup_created_at) ?? "-"}</p>
        {r.followup_call_by_user && (
          <>
            <p className="text-xs font-semibold text-muted-foreground">Call By</p>
            <p className="text-sm">{`${r.followup_call_by_user.name} (${r.followup_call_by_user.email})`}</p>
          </>
        )}
        {r.followup_remarks && (
          <>
            <p className="text-xs font-semibold text-muted-foreground">Remarks</p>
            <p className="text-sm">{r.followup_remarks}</p>
          </>
        )}
      </div>
    );
  }, [selectedRecord]);

  const calculatePaginatedTableHeight = () => `calc(100vh - 150px)`;

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Followups"
        addButtonLabel={currentPerm.can_create ? "Add Followup" : undefined}
        onAddClick={currentPerm.can_create ? () => handleOpenModal(null) : undefined}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <PaginatedTable
            key={reloadTrigger}
            columns={columns}
            fetcher={fetcher}
            getRowKey={(row) => row.followup_id ? `${row.id}-${row.followup_id}` : `${row.id}-no-followup`}
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

        <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Followup Details">
          {sidebarContent}
        </DetailsSidebar>

        <Dialog open={modalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
            <div className="pb-2">
              <DialogTitle>Create Followup</DialogTitle>
            </div>
            <FollowupForm
              defaultValues={{ inquiry_id: selectedInquiryId || "" }}
              onSubmit={handleSubmit}
              loading={loading}
              serverError={serverError}
              onClearServerError={() => setServerError(null)}
              onCancel={handleCloseModal}
            />
          </DialogContent>
        </Dialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
