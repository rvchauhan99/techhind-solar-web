"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { toastSuccess, toastError } from "@/utils/toast";
import {
  IconPhoneCall,
  IconFileDescription,
  IconCalendar,
  IconRefresh,
  IconExternalLink,
  IconSearch,
  IconX,
  IconChevronRight,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import LeadListFilterPanel, { EMPTY_VALUES } from "@/components/common/LeadListFilterPanel";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import marketingLeadFollowupService from "@/services/marketingLeadFollowupService";
import marketingLeadsService from "@/services/marketingLeadsService";
import LeadFollowupForm from "./components/LeadFollowupForm";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import { formatDate } from "@/utils/dataTableUtils";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// ── Extra filter keys not present in LeadListFilterPanel ──────────────────
const EXTRA_FILTER_KEYS = [
  "followup_outcome",
  "last_called_from",
  "last_called_to",
  "reminder_view",
];

// All filter keys that this page uses (LeadListFilterPanel keys + extras)
const ALL_FILTER_KEYS = [
  "q",
  "lead_number",
  "customer_name",
  "mobile_number",
  "campaign_name",
  "status",
  "priority",
  "branch_id",
  "inquiry_source_id",
  "assigned_to",
  "next_follow_up_from",
  "next_follow_up_to",
  "created_from",
  "created_to",
  ...EXTRA_FILTER_KEYS,
];

const EMPTY_PAGE_FILTERS = Object.fromEntries(ALL_FILTER_KEYS.map((k) => [k, ""]));

// ── Date quick presets ─────────────────────────────────────────────────────
const DATE_PRESETS = [
  {
    label: "Today",
    fn: () => {
      const d = new Date().toISOString().slice(0, 10);
      return { next_follow_up_from: d, next_follow_up_to: d, reminder_view: "" };
    },
  },
  {
    label: "Overdue",
    fn: () => ({ reminder_view: "overdue", next_follow_up_from: "", next_follow_up_to: "" }),
  },
  {
    label: "Tomorrow",
    fn: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      const s = d.toISOString().slice(0, 10);
      return { next_follow_up_from: s, next_follow_up_to: s, reminder_view: "" };
    },
  },
  {
    label: "All",
    fn: () => ({ reminder_view: "all", next_follow_up_from: "", next_follow_up_to: "" }),
  },
];

const FOLLOWUP_OUTCOME_OPTIONS = [
  { value: "follow_up", label: "Follow Up" },
  { value: "callback_scheduled", label: "Callback Scheduled" },
  { value: "viewed", label: "Viewed / Interested" },
  { value: "no_answer", label: "No Answer" },
  { value: "switched_off", label: "Switched Off" },
  { value: "not_interested", label: "Not Interested" },
  { value: "wrong_number", label: "Wrong Number" },
  { value: "converted", label: "Converted" },
];

// ── Status / Priority badge classes ───────────────────────────────────────
const LEAD_STATUS_BADGE = {
  new: "bg-sky-100 text-sky-800",
  viewed: "bg-indigo-100 text-indigo-800",
  follow_up: "bg-orange-100 text-orange-800",
  converted: "bg-green-100 text-green-800",
  not_interested: "bg-slate-100 text-slate-600",
  junk: "bg-slate-100 text-slate-400",
};

const PRIORITY_BADGE = {
  hot: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-sky-100 text-sky-800",
  low: "bg-slate-100 text-slate-600",
};

// ── Helpers ─────────────────────────────────────────────────────────────
/** Normalise array-valued filters (MultiSelect) into comma-separated strings for the API */
function buildApiFilters(filters = {}) {
  const result = {};
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      const cleaned = value.map((v) => String(v).trim()).filter(Boolean);
      if (cleaned.length) result[key] = cleaned.join(",");
    } else if (value != null && String(value).trim() !== "") {
      result[key] = value;
    }
  });
  return result;
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function MarketingLeadFollowupPage() {
  const router = useRouter();

  // ── Filter state ─────────────────────────────────────────────────────
  const [filters, setFilters] = useState(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return { ...EMPTY_PAGE_FILTERS, next_follow_up_from: todayStr, next_follow_up_to: todayStr };
  });
  const [activePreset, setActivePreset] = useState("Today");

  const handlePreset = useCallback((preset) => {
    const vals = preset.fn();
    setFilters((prev) => ({ ...prev, ...vals }));
    setActivePreset(preset.label);
  }, []);

  const handleFilterApply = useCallback((panelValues) => {
    // panelValues come from LeadListFilterPanel — merge with our extra keys
    setFilters((prev) => ({ ...prev, ...panelValues }));
    setActivePreset(null); // clear preset label when manually filtering
  }, []);

  const handleFilterClear = useCallback(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setFilters({ ...EMPTY_PAGE_FILTERS, next_follow_up_from: todayStr, next_follow_up_to: todayStr });
    setActivePreset("Today");
  }, []);

  // Extra fields local state (managed here, injected into panel as controlled fields)
  const handleExtraChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setActivePreset(null);
  }, []);

  // ── Table / modal state ───────────────────────────────────────────────
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarRecord, setSidebarRecord] = useState(null);

  const handleOpenModal = useCallback((row) => {
    setSelectedLead(row || null);
    setModalOpen(true);
    setServerError(null);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedLead(null);
    setServerError(null);
  }, []);

  const handleOpenSidebar = useCallback((row) => {
    setSidebarRecord(row);
    setSidebarOpen(true);
  }, []);

  const handleSubmit = useCallback(async (leadId, payload) => {
    setLoading(true);
    setServerError(null);
    try {
      await marketingLeadsService.addFollowUp(leadId, payload);
      toastSuccess("Follow-up saved successfully");
      handleCloseModal();
      setReloadTrigger((v) => v + 1);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to save follow-up";
      setServerError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [handleCloseModal]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await marketingLeadFollowupService.exportLeadFollowups(buildApiFilters(filters));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lead-followups-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  // ── Global "Add Follow-Up" (select lead first) ────────────────────────
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addStep, setAddStep] = useState(1); // 1 = pick lead, 2 = fill form
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [leadSearchResults, setLeadSearchResults] = useState([]);
  const [leadSearchLoading, setLeadSearchLoading] = useState(false);
  const [addSelectedLead, setAddSelectedLead] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addServerError, setAddServerError] = useState(null);
  const searchTimerRef = useRef(null);

  const handleOpenAddDialog = useCallback(() => {
    setAddDialogOpen(true);
    setAddStep(1);
    setLeadSearchQuery("");
    setLeadSearchResults([]);
    setAddSelectedLead(null);
    setAddServerError(null);
  }, []);

  const handleCloseAddDialog = useCallback(() => {
    setAddDialogOpen(false);
    setAddStep(1);
    setLeadSearchQuery("");
    setLeadSearchResults([]);
    setAddSelectedLead(null);
    setAddServerError(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  const doLeadSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 1) { setLeadSearchResults([]); return; }
    setLeadSearchLoading(true);
    try {
      const res = await marketingLeadsService.getMarketingLeads({ q: q.trim(), limit: 20, page: 1, not_status: "junk" });
      const payload = res?.result ?? res?.data ?? res;
      const data = Array.isArray(payload) ? payload : payload?.data ?? [];
      setLeadSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setLeadSearchResults([]);
    } finally {
      setLeadSearchLoading(false);
    }
  }, []);

  const handleLeadSearchChange = useCallback((val) => {
    setLeadSearchQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => doLeadSearch(val), 400);
  }, [doLeadSearch]);

  const handleLeadSelect = useCallback((lead) => {
    setAddSelectedLead(lead);
    setAddStep(2);
    setAddServerError(null);
  }, []);

  const handleAddSubmit = useCallback(async (leadId, payload) => {
    setAddLoading(true);
    setAddServerError(null);
    try {
      await marketingLeadsService.addFollowUp(leadId, payload);
      toastSuccess("Follow-up saved successfully");
      handleCloseAddDialog();
      setReloadTrigger((v) => v + 1);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to save follow-up";
      setAddServerError(msg);
      toastError(msg);
    } finally {
      setAddLoading(false);
    }
  }, [handleCloseAddDialog]);

  // ── Fetcher ───────────────────────────────────────────────────────────
  const apiFilters = useMemo(() => buildApiFilters(filters), [filters]);

  const fetcher = useMemo(
    () => async (params) => {
      const response = await marketingLeadFollowupService.listLeadFollowups(params);
      const result = response?.result ?? response;
      return {
        data: result?.data ?? [],
        meta: result?.meta ?? { total: 0, page: params.page, pages: 0, limit: params.limit },
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reloadTrigger]
  );

  // ── Table columns ─────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        field: "actions",
        label: "",
        sortable: false,
        isActionColumn: true,
        maxWidth: 90,
        render: (row) => (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleOpenSidebar(row)}
              title="View details"
            >
              <IconFileDescription className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleOpenModal(row)}
              title="Add Follow-Up"
            >
              <IconPhoneCall className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => router.push(`/marketing-leads/view?id=${row.id}`)}
              title="Open Lead"
            >
              <IconExternalLink className="size-3.5" />
            </Button>
          </div>
        ),
      },
      {
        field: "lead_number",
        label: "Lead #",
        sortable: false,
        maxWidth: 100,
        render: (row) => <span className="text-xs text-muted-foreground">{row.lead_number}</span>,
      },
      {
        field: "customer",
        label: "Customer",
        sortable: true,
        maxWidth: 160,
        render: (row) => (
          <div className="text-xs">
            <span className="font-semibold">{(row.customer_name || "N/A").toUpperCase()}</span>
            <span className="text-muted-foreground ml-1">• {row.mobile_number || "-"}</span>
          </div>
        ),
      },
      {
        field: "status",
        label: "Status",
        sortable: true,
        maxWidth: 110,
        render: (row) => (
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wide whitespace-nowrap",
              LEAD_STATUS_BADGE[row.status] || "bg-slate-100 text-slate-800"
            )}
          >
            {(row.status || "new").replace(/_/g, " ")}
          </span>
        ),
      },
      {
        field: "priority",
        label: "Priority",
        sortable: true,
        maxWidth: 80,
        render: (row) => (
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wide whitespace-nowrap",
              PRIORITY_BADGE[row.priority] || "bg-slate-100 text-slate-800"
            )}
          >
            {row.priority || "medium"}
          </span>
        ),
      },
      {
        field: "followup_outcome",
        label: "Last Outcome",
        maxWidth: 130,
        render: (row) =>
          row.followup_id ? (
            <span className="text-xs capitalize">{(row.followup_outcome || "-").replace(/_/g, " ")}</span>
          ) : (
            <span className="text-xs text-muted-foreground">No FU</span>
          ),
      },
      {
        field: "followup_notes",
        label: "Notes",
        maxWidth: 200,
        render: (row) => {
          if (!row.followup_id) return <span className="text-xs text-muted-foreground">-</span>;
          const n = row.followup_notes || "-";
          return (
            <span className="text-xs truncate block" title={n}>
              {n.length > 50 ? `${n.substring(0, 50)}...` : n}
            </span>
          );
        },
      },
      {
        field: "followup_contacted_at",
        label: "Last Called",
        maxWidth: 90,
        render: (row) => (
          <span className="text-xs">{row.followup_contacted_at ? formatDate(row.followup_contacted_at) : "-"}</span>
        ),
      },
      {
        field: "next_follow_up_at",
        label: "Next FU",
        sortable: true,
        maxWidth: 90,
        render: (row) => (
          <span className="text-xs">{row.next_follow_up_at ? formatDate(row.next_follow_up_at) : "-"}</span>
        ),
      },
      {
        field: "assigned_to_name",
        label: "Assigned To",
        maxWidth: 110,
        render: (row) => <span className="text-xs">{row.assigned_to_name || "Unassigned"}</span>,
      },
      {
        field: "followup_created_by_name",
        label: "Called By",
        maxWidth: 100,
        render: (row) =>
          row.followup_id ? (
            <span className="text-xs">{row.followup_created_by_name || "-"}</span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          ),
      },
    ],
    [handleOpenModal, handleOpenSidebar, router]
  );

  // ── Sidebar content ───────────────────────────────────────────────────
  const sidebarContent = useMemo(() => {
    if (!sidebarRecord) return null;
    const r = sidebarRecord;
    return (
      <div className="pr-1 space-y-3 text-sm">
        <p className="font-semibold">
          {r.lead_number} — {r.customer_name}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {[
            ["Mobile", r.mobile_number],
            ["Status", (r.status || "-").replace(/_/g, " ")],
            ["Priority", r.priority],
            ["Assigned To", r.assigned_to_name || "Unassigned"],
            ["Campaign", r.campaign_name],
            ["Capacity (kW)", r.expected_capacity_kw != null ? `${r.expected_capacity_kw} kW` : null],
            ["Next Follow-Up", r.next_follow_up_at ? formatDate(r.next_follow_up_at) : null],
            ["Last Called", r.last_called_at ? formatDate(r.last_called_at) : null],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
              <p className="capitalize">{value || "-"}</p>
            </div>
          ))}
        </div>
        {r.followup_id && (
          <>
            <hr className="my-2" />
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Latest Follow-Up</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                ["Outcome", (r.followup_outcome || "-").replace(/_/g, " ")],
                ["Channel", r.followup_contact_channel],
                ["Called By", r.followup_created_by_name],
                ["Contacted At", r.followup_contacted_at ? formatDate(r.followup_contacted_at) : null],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
                  <p className="capitalize">{value || "-"}</p>
                </div>
              ))}
            </div>
            {r.followup_notes && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{r.followup_notes}</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }, [sidebarRecord]);

  // ── Extra filter fields injected into the filter panel ────────────────
  const extraFields = (
    <>
      {/* Followup Outcome filter */}
      <AutocompleteField
        usePortal
        name="followup_outcome"
        label="Last Outcome"
        options={[{ value: "", label: "All outcomes" }, ...FOLLOWUP_OUTCOME_OPTIONS]}
        getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
        value={
          [{ value: "", label: "All outcomes" }, ...FOLLOWUP_OUTCOME_OPTIONS].find(
            (o) => o.value === filters.followup_outcome
          ) || null
        }
        onChange={(e, newVal) => handleExtraChange("followup_outcome", newVal?.value ?? "")}
        placeholder="All outcomes"
      />

      {/* Last Called date range */}
      <DateField
        name="last_called_from"
        label="Last Called From"
        value={filters.last_called_from || ""}
        onChange={(e) => handleExtraChange("last_called_from", e.target.value)}
      />
      <DateField
        name="last_called_to"
        label="Last Called To"
        value={filters.last_called_to || ""}
        onChange={(e) => handleExtraChange("last_called_to", e.target.value)}
      />
    </>
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Lead Follow-Ups"
        fullWidth
        addButtonLabel="Add Follow-Up"
        onAddClick={handleOpenAddDialog}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <div className="flex flex-col flex-1 min-h-0 gap-1">
          {/* Quick date presets */}
          <div className="flex items-center gap-1.5 flex-wrap px-0.5 pb-1">
            <span className="flex items-center gap-1 text-[10px] text-slate-400 mr-0.5">
              <IconCalendar size={11} /> Quick:
            </span>
            {DATE_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                className={[
                  "text-[11px] px-2.5 py-0.5 rounded-full border font-semibold transition-all",
                  activePreset === p.label
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white border-slate-200 text-slate-500 hover:border-primary hover:text-primary",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
            <div className="h-4 w-px bg-slate-200 mx-0.5" />
            <Button size="sm" variant="outline" onClick={handleFilterClear} className="h-6 text-xs gap-1 px-2">
              <IconRefresh size={11} /> Reset
            </Button>
          </div>

          {/* Filter panel — same as marketing-leads, with extra followup fields */}
          <LeadListFilterPanel
            values={filters}
            onApply={handleFilterApply}
            onClear={handleFilterClear}
            defaultOpen={false}
            // Hide created_from/created_to — not relevant for follow-up view
            hideFields={["created_from", "created_to"]}
            // Inject followup-specific filters
            extraFields={extraFields}
          />

          {/* Data table */}
          <PaginatedTable
            key={reloadTrigger}
            columns={columns}
            fetcher={fetcher}
            getRowKey={(row) => `${row.id}`}
            showSearch={false}
            showPagination={false}
            height={`calc(100vh - 230px)`}
            onTotalChange={setTotalCount}
            filterParams={apiFilters}
            page={page}
            limit={limit}
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

        {/* Details Sidebar */}
        <DetailsSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} title="Lead Follow-Up Details">
          {sidebarContent}
        </DetailsSidebar>

        {/* Add Follow-Up Modal */}
        <Dialog open={modalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
            <div className="pb-2">
              <DialogTitle>Add Follow-Up</DialogTitle>
            </div>
            {selectedLead && (
              <LeadFollowupForm
                leadId={selectedLead.id}
                leadDetails={selectedLead}
                onSubmit={handleSubmit}
                loading={loading}
                serverError={serverError}
                onClearServerError={() => setServerError(null)}
                onCancel={handleCloseModal}
              />
            )}
          </DialogContent>
        </Dialog>
        {/* ── Global Add Follow-Up Dialog (two-step) ──────────────────── */}
        <Dialog open={addDialogOpen} onOpenChange={(open) => !open && handleCloseAddDialog()}>
          <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
            {/* Step indicator */}
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-2">
              <span
                className={cn(
                  "flex items-center justify-center size-6 rounded-full text-xs font-bold border-2 transition-all",
                  addStep >= 1
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-slate-400 border-slate-200"
                )}
              >
                1
              </span>
              <span className={cn("text-xs font-semibold", addStep >= 1 ? "text-primary" : "text-slate-400")}>
                Select Lead
              </span>
              <IconChevronRight size={14} className="text-slate-300" />
              <span
                className={cn(
                  "flex items-center justify-center size-6 rounded-full text-xs font-bold border-2 transition-all",
                  addStep >= 2
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-slate-400 border-slate-200"
                )}
              >
                2
              </span>
              <span className={cn("text-xs font-semibold", addStep >= 2 ? "text-primary" : "text-slate-400")}>
                Add Follow-Up
              </span>
            </div>

            <DialogTitle className="text-base">
              {addStep === 1 ? "Search & Select a Lead" : `Follow-Up for ${addSelectedLead?.customer_name || "Lead"}`}
            </DialogTitle>

            {/* STEP 1: Lead picker */}
            {addStep === 1 && (
              <div className="mt-3 space-y-3">
                {/* Search box */}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    {leadSearchLoading ? (
                      <div className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : (
                      <IconSearch size={15} className="text-slate-400" />
                    )}
                  </div>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search by name, mobile, lead #..."
                    value={leadSearchQuery}
                    onChange={(e) => handleLeadSearchChange(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  {leadSearchQuery && (
                    <button
                      onClick={() => { setLeadSearchQuery(""); setLeadSearchResults([]); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500"
                    >
                      <IconX size={14} />
                    </button>
                  )}
                </div>

                {/* Results list */}
                {leadSearchResults.length > 0 ? (
                  <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto rounded-lg border border-slate-100 shadow-sm">
                    {leadSearchResults.map((lead) => (
                      <li key={lead.id}>
                        <button
                          onClick={() => handleLeadSelect(lead)}
                          className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {lead.customer_name}
                              {lead.lead_number && (
                                <span className="ml-2 text-[10px] text-slate-400 font-normal">{lead.lead_number}</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {lead.mobile_number}
                              {lead.company_name && ` • ${lead.company_name}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] uppercase font-bold",
                                LEAD_STATUS_BADGE[lead.status] || "bg-slate-100 text-slate-600"
                              )}
                            >
                              {(lead.status || "new").replace(/_/g, " ")}
                            </span>
                            <IconChevronRight size={14} className="text-slate-300 group-hover:text-primary transition-colors" />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : leadSearchQuery.length > 0 && !leadSearchLoading ? (
                  <p className="text-sm text-center text-slate-400 py-6">No leads found for &quot;{leadSearchQuery}&quot;</p>
                ) : (
                  <p className="text-sm text-center text-slate-400 py-6">Type a name, mobile number, or lead # to search</p>
                )}

                <div className="flex justify-end pt-1">
                  <Button variant="outline" size="sm" onClick={handleCloseAddDialog}>Cancel</Button>
                </div>
              </div>
            )}

            {/* STEP 2: Followup form for chosen lead */}
            {addStep === 2 && addSelectedLead && (
              <div className="mt-2">
                <button
                  onClick={() => { setAddStep(1); setAddSelectedLead(null); }}
                  className="text-xs text-slate-500 hover:text-primary mb-3 flex items-center gap-1"
                >
                  ← Back to lead search
                </button>
                <LeadFollowupForm
                  leadId={addSelectedLead.id}
                  leadDetails={addSelectedLead}
                  onSubmit={handleAddSubmit}
                  loading={addLoading}
                  serverError={addServerError}
                  onClearServerError={() => setAddServerError(null)}
                  onCancel={handleCloseAddDialog}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
