"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { toastSuccess, toastError } from "@/utils/toast";
import { IconPhoneCall, IconFileDescription, IconCalendar, IconRefresh } from "@tabler/icons-react";
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
import FollowupListFilterPanel, {
  EMPTY_VALUES as FOLLOWUP_FILTER_EMPTY_VALUES,
  getDefaultTodayFilter,
} from "@/components/common/FollowupListFilterPanel";
import followupService from "@/services/followupService";
import FollowupForm from "./components/FollowupForm";
import { useAuth } from "@/hooks/useAuth";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate } from "@/utils/dataTableUtils";
import { cn } from "@/lib/utils";
import { Tooltip } from "@mui/material";

const COLUMN_FILTER_KEYS = [
  "q",
  "customer_name",
  "mobile_number",
  "inquiry_number",
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
  "reminder_view",
  "capacity",
  "capacity_op",
  "capacity_to",
  "followup_created_at_from",
  "followup_created_at_to",
  "followup_created_at_op",
];

const DATE_PRESETS = [
  { label: "Today", value: "today", fn: () => { const d = new Date().toISOString().slice(0, 10); return { followup_next_reminder_from: d, followup_next_reminder_to: d, reminder_view: "" }; } },
  { label: "Overdue", value: "overdue", fn: () => ({ reminder_view: "overdue", followup_next_reminder_from: "", followup_next_reminder_to: "" }) },
  { label: "Tomorrow", value: "tomorrow", fn: () => { const d = new Date(); d.setDate(d.getDate() + 1); const s = d.toISOString().slice(0, 10); return { followup_next_reminder_from: s, followup_next_reminder_to: s, reminder_view: "" }; } },
  { label: "Custom", value: "custom", fn: () => ({ reminder_view: "custom", followup_next_reminder_from: "", followup_next_reminder_to: "" }) },
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
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilters, setFilter, setSort } = listingState;

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const hasSetDefaultRef = useRef(false);

  const effectiveActivePreset = useMemo(() => {
    if (activePreset) return activePreset;
    if (filters.reminder_view === "overdue") return "Overdue";
    const todayStr = new Date().toISOString().slice(0, 10);
    if (filters.followup_next_reminder_from === todayStr && filters.followup_next_reminder_to === todayStr) return "Today";
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    if (filters.followup_next_reminder_from === tomorrowStr && filters.followup_next_reminder_to === tomorrowStr) return "Tomorrow";
    if (filters.reminder_view === "custom" || filters.followup_next_reminder_from || filters.followup_next_reminder_to) return "Custom";
    return "Today";
  }, [activePreset, filters]);

  const applyDefaultToday = useCallback(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setFilters({
      followup_next_reminder_from: todayStr,
      followup_next_reminder_to: todayStr,
      reminder_view: "",
    });
    setActivePreset("Today");
  }, [setFilters]);

  useEffect(() => {
    if (hasSetDefaultRef.current) return;
    const hasReminder = filters.followup_next_reminder_from || filters.followup_next_reminder_to;
    const hasReminderView = filters.reminder_view;
    if (!hasReminder && !hasReminderView) {
      hasSetDefaultRef.current = true;
      applyDefaultToday();
    }
  }, [filters.followup_next_reminder_from, filters.followup_next_reminder_to, filters.reminder_view, applyDefaultToday]);

  const handlePreset = useCallback(
    (preset) => {
      const presetValues = preset.fn();
      setFilters(presetValues);
      setActivePreset(preset.label);
      if (preset.value === "custom") setFilterPanelOpen(true);
    },
    [setFilters]
  );

  const handleApplyFilters = useCallback(
    (next) => {
      setFilters({ ...filters, ...next });
      setFilterPanelOpen(false);
      setActivePreset(null);
    },
    [filters, setFilters]
  );

  const handleQuickSearch = useCallback(
    (val) => setFilter("q", val),
    [setFilter]
  );

  const handleClearFilters = useCallback(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const allEmpty = Object.fromEntries(COLUMN_FILTER_KEYS.map((k) => [k, ""]));
    setFilters({
      ...allEmpty,
      followup_next_reminder_from: todayStr,
      followup_next_reminder_to: todayStr,
    });
    setActivePreset("Today");
    setFilterPanelOpen(false);
  }, [setFilters]);

  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [selectedInquiryId, setSelectedInquiryId] = useState(null);
  const [selectedModalRow, setSelectedModalRow] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

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

  const handleOpenModal = (row) => {
    const inquiryId = row?.id ?? row;
    setSelectedInquiryId(inquiryId || null);
    setSelectedModalRow(row && typeof row === "object" ? row : null);
    setModalOpen(true);
    setServerError(null);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedInquiryId(null);
    setSelectedModalRow(null);
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

  const filterParams = useMemo(() => {
    const entries = Object.entries(filters || {}).filter(
      ([key, v]) => key !== "q" && v != null && String(v).trim() !== ""
    );
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
    return obj;
  }, [filters]);

  const fetcher = useMemo(
    () => async (params) => {
      const apiParams = { ...params };
      if (apiParams.sortBy === "followup_created_at") apiParams.sortBy = "created_at";
      if (apiParams.sortBy === "followup_id") apiParams.sortBy = "id";
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
        label: "",
        sortable: false,
        isActionColumn: true,
        maxWidth: 72,
        render: (row) => (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleOpenSidebar(row)}
              title="View details"
              aria-label="View details"
            >
              <IconFileDescription className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleOpenModal(row)}
              title="Create Followup"
              aria-label="Create Followup"
            >
              <IconPhoneCall className="size-3.5" />
            </Button>
          </div>
        ),
      },
      {
        field: "inquiry_info",
        label: "Inq #",
        sortable: false,
        maxWidth: 90,
        render: (row) => <span className="text-xs">{row.inquiry_number || "-"}</span>,
      },
      {
        field: "customer",
        label: "Customer",
        sortable: false,
        maxWidth: 140,
        render: (row) => {
          const name = row.customer_name || "N/A";
          const mobile = row.mobile_number || "-";
          const full = `${name} • ${mobile}`;
          return <span className="text-xs truncate block" title={full}>{full}</span>;
        },
      },
      {
        field: "date_of_inquiry",
        label: "Inq Date",
        sortable: true,
        filterType: "date",
        filterKey: "date_of_inquiry_from",
        filterKeyTo: "date_of_inquiry_to",
        operatorKey: "date_of_inquiry_op",
        defaultFilterOperator: "inRange",
        maxWidth: 90,
        render: (row) => <span className="text-xs">{formatDate(row.date_of_inquiry) || "-"}</span>,
      },
      {
        field: "status",
        label: "Inq Status",
        sortable: true,
        filterType: "select",
        filterKey: "status",
        filterOptions: STATUS_OPTIONS,
        maxWidth: 100,
        render: (row) => <span className="text-xs">{row.status || "-"}</span>,
      },
      {
        field: "followup_status",
        label: "FU Status",
        sortable: true,
        filterType: "select",
        filterKey: "followup_status",
        filterOptions: STATUS_OPTIONS,
        maxWidth: 100,
        render: (row) => (
          <span className={cn("text-xs", !row.followup_id && "text-muted-foreground")}>
            {row.followup_id ? (row.followup_status || "-") : "No FU"}
          </span>
        ),
      },
      {
        field: "capacity",
        label: "Cap",
        sortable: true,
        filterType: "number",
        filterKey: "capacity",
        filterKeyTo: "capacity_to",
        operatorKey: "capacity_op",
        defaultFilterOperator: "equals",
        maxWidth: 70,
        render: (row) => <span className="text-xs">{row.capacity != null ? `${row.capacity} kW` : "-"}</span>,
      },
      {
        field: "estimated_cost",
        label: "Est ₹",
        sortable: false,
        maxWidth: 90,
        render: (row) => (
          <span className="text-xs">
            {row.estimated_cost != null ? `₹${Number(row.estimated_cost).toLocaleString("en-IN")}` : "-"}
          </span>
        ),
      },
      {
        field: "followup_remarks",
        label: "Remarks",
        filterType: "text",
        filterKey: "followup_remarks",
        defaultFilterOperator: "contains",
        maxWidth: 180,
        render: (row) => {
          if (!row.followup_id) return <span className="text-xs text-muted-foreground">-</span>;
          const r = row.followup_remarks || "N/A";
          const trunc = r.length > 40 ? `${r.substring(0, 40)}...` : r;
          return <span className="text-xs truncate block" title={r}>{trunc}</span>;
        },
      },
      {
        field: "followup_next_reminder",
        label: "Next Rem",
        filterType: "date",
        filterKey: "followup_next_reminder_from",
        filterKeyTo: "followup_next_reminder_to",
        operatorKey: "followup_next_reminder_op",
        defaultFilterOperator: "inRange",
        maxWidth: 90,
        render: (row) => (
          <span className={cn("text-xs", !row.followup_id && "text-muted-foreground")}>
            {row.followup_id ? (formatDate(row.followup_next_reminder) || "-") : "-"}
          </span>
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
        maxWidth: 90,
        render: (row) => (
          <span className={cn("text-xs", !row.followup_id && "text-muted-foreground")}>
            {row.followup_id ? (formatDate(row.followup_created_at) || "-") : "-"}
          </span>
        ),
      },
      {
        field: "call_by",
        label: "Call By",
        maxWidth: 100,
        render: (row) => {
          if (!row.followup_id) return <span className="text-xs text-muted-foreground">-</span>;
          const user = row.followup_call_by_user;
          return <span className="text-xs">{user?.name || user?.email || "N/A"}</span>;
        },
      },
      {
        field: "flags",
        label: "Flags",
        maxWidth: 80,
        render: (row) => {
          if (!row.followup_id) return <span className="text-xs text-muted-foreground">-</span>;
          const sv = row.followup_is_schedule_site_visit ? "Y" : "N";
          const msg = row.followup_is_msg_send_to_customer ? "Y" : "N";
          return <span className="text-xs whitespace-nowrap">SV:{sv} Msg:{msg}</span>;
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
            <p className="text-sm">{r.followup_call_by_user?.name ?? "-"}</p>
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
        fullWidth
        addButtonLabel={currentPerm.can_create ? "Add Followup" : undefined}
        onAddClick={currentPerm.can_create ? () => handleOpenModal(null) : undefined}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap px-1 py-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <IconCalendar size={11} /> Quick:
              </span>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handlePreset(p)}
                  className={[
                    "text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all",
                    effectiveActivePreset === p.label
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white border-slate-200 text-slate-500 hover:border-primary hover:text-primary",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
              <div className="h-4 w-px bg-slate-200 mx-0.5" />
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearFilters}
                className="h-7 text-xs gap-1 px-2"
              >
                <IconRefresh size={11} /> Reset
              </Button>
            </div>
          </div>
          <FollowupListFilterPanel
            open={filterPanelOpen}
            onToggle={setFilterPanelOpen}
            values={filters}
            onApply={handleApplyFilters}
            onQuickSearch={handleQuickSearch}
            onClear={handleClearFilters}
            defaultOpen={false}
          />
          <PaginatedTable
            key={reloadTrigger}
            columns={columns}
            fetcher={fetcher}
            getRowKey={(row) => row.followup_id ? `${row.id}-${row.followup_id}` : `${row.id}-no-followup`}
            showSearch={false}
            showPagination={false}
            height={calculatePaginatedTableHeight()}
            onTotalChange={setTotalCount}
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

        <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Followup Details">
          {sidebarContent}
        </DetailsSidebar>

        <Dialog open={modalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
            <div className="pb-2">
              <DialogTitle>Create Followup</DialogTitle>
            </div>
            <FollowupForm
              defaultValues={{
                inquiry_id: selectedInquiryId || "",
                customerDetails: selectedModalRow
                  ? {
                      customer_name: selectedModalRow.customer_name,
                      mobile_number: selectedModalRow.mobile_number,
                      phone_no: selectedModalRow.phone_no,
                      email_id: selectedModalRow.email_id,
                      address: selectedModalRow.address,
                    }
                  : null,
              }}
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
