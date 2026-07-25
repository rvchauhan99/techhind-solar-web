"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
import LeadListFilterPanel from "@/components/common/LeadListFilterPanel";
import DateField from "@/components/common/DateField";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import b2bLeadFollowupService from "@/services/b2bLeadFollowupService";
import b2bLeadService from "@/services/b2bLeadService";
import AddCallDetailsForm from "@/app/b2b-leads/components/AddCallDetailsForm";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import { formatDate } from "@/utils/dataTableUtils";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  B2B_STATUS_OPTIONS,
  B2B_PRIORITY_OPTIONS,
} from "@/app/b2b-leads/b2bLeadFilterOptions";

// ── Extra filter keys not present in LeadListFilterPanel ──────────────────
const EXTRA_FILTER_KEYS = [
  "company_name",
  "city",
  "followup_outcome",
  "last_called_from",
  "last_called_to",
  "reminder_view",
];

// All filter keys that this page uses (LeadListFilterPanel keys + extras)
const ALL_FILTER_KEYS = [
  "q",
  "lead_number",
  "mobile_number",
  "status",
  "priority",
  "assigned_to",
  "next_follow_up_from",
  "next_follow_up_to",
  "created_from",
  "created_to",
  ...EXTRA_FILTER_KEYS,
];

const EMPTY_PAGE_FILTERS = Object.fromEntries(ALL_FILTER_KEYS.map((k) => [k, ""]));

/** Local calendar YYYY-MM-DD (avoids UTC shift from toISOString near midnight IST) */
function localYmd(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── Date quick presets (work-queue semantics) ─────────────────────────────
const DATE_PRESETS = [
  {
    label: "Today",
    // Due today OR open leads with no next follow-up date
    fn: () => ({ reminder_view: "today", next_follow_up_from: "", next_follow_up_to: "" }),
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
      const s = localYmd(d);
      return { next_follow_up_from: s, next_follow_up_to: s, reminder_view: "" };
    },
  },
  {
    label: "All",
    // No date constraint; clear reminder_view so no chip noise
    fn: () => ({ reminder_view: "", next_follow_up_from: "", next_follow_up_to: "" }),
  },
];

const FOLLOWUP_OUTCOME_OPTIONS = B2B_STATUS_OPTIONS;

// ── Status / Priority badge classes ───────────────────────────────────────
const LEAD_STATUS_BADGE = {
  created: "bg-sky-100 text-sky-800",
  follow_up: "bg-orange-100 text-orange-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  converted: "bg-green-100 text-green-800",
  not_interested: "bg-slate-100 text-slate-600",
};

const PRIORITY_BADGE = {
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
export default function B2bLeadFollowupPage() {
  const router = useRouter();

  // ── Filter / pagination state ───────────────────────────────────────
  const [filters, setFilters] = useState(() => ({
    ...EMPTY_PAGE_FILTERS,
    reminder_view: "today",
  }));
  const [activePreset, setActivePreset] = useState("Today");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [extraDraft, setExtraDraft] = useState({
    company_name: "",
    city: "",
    followup_outcome: "",
    last_called_from: "",
    last_called_to: "",
  });

  useEffect(() => {
    setExtraDraft({
      company_name: filters.company_name || "",
      city: filters.city || "",
      followup_outcome: filters.followup_outcome || "",
      last_called_from: filters.last_called_from || "",
      last_called_to: filters.last_called_to || "",
    });
  }, [
    filters.company_name,
    filters.city,
    filters.followup_outcome,
    filters.last_called_from,
    filters.last_called_to,
  ]);

  const handlePreset = useCallback((preset) => {
    const vals = preset.fn();
    setFilters((prev) => ({ ...prev, ...vals }));
    setActivePreset(preset.label);
    setPage(1);
  }, []);

  const handleFilterApply = useCallback((panelValues) => {
    setFilters((prev) => ({
      ...prev,
      ...panelValues,
      company_name: extraDraft.company_name || "",
      city: extraDraft.city || "",
      followup_outcome: extraDraft.followup_outcome || "",
      last_called_from: extraDraft.last_called_from || "",
      last_called_to: extraDraft.last_called_to || "",
    }));
    setActivePreset(null);
    setPage(1);
  }, [extraDraft]);

  const handleFilterClear = useCallback(() => {
    setExtraDraft({
      company_name: "",
      city: "",
      followup_outcome: "",
      last_called_from: "",
      last_called_to: "",
    });
    setFilters({ ...EMPTY_PAGE_FILTERS, reminder_view: "today" });
    setActivePreset("Today");
    setPage(1);
  }, []);

  const handleExtraChange = useCallback((key, value) => {
    setExtraDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Table / modal state ───────────────────────────────────────────────
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarRecord, setSidebarRecord] = useState(null);

  const handleOpenModal = useCallback((row) => {
    setSelectedLead(row || null);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedLead(null);
  }, []);

  const handleOpenSidebar = useCallback((row) => {
    setSidebarRecord(row);
    setSidebarOpen(true);
  }, []);

  const handleSaved = useCallback(() => {
    handleCloseModal();
    setReloadTrigger((v) => v + 1);
  }, [handleCloseModal]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await b2bLeadFollowupService.exportB2bLeadFollowups(buildApiFilters(filters));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `b2b-lead-followups-${new Date().toISOString().split("T")[0]}.xlsx`;
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
  const searchTimerRef = useRef(null);

  const handleOpenAddDialog = useCallback(() => {
    setAddDialogOpen(true);
    setAddStep(1);
    setLeadSearchQuery("");
    setLeadSearchResults([]);
    setAddSelectedLead(null);
  }, []);

  const handleCloseAddDialog = useCallback(() => {
    setAddDialogOpen(false);
    setAddStep(1);
    setLeadSearchQuery("");
    setLeadSearchResults([]);
    setAddSelectedLead(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  const doLeadSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 1) { setLeadSearchResults([]); return; }
    setLeadSearchLoading(true);
    try {
      const res = await b2bLeadService.getB2bLeads({
        q: q.trim(),
        limit: 20,
        page: 1,
        not_status: "converted,not_interested",
      });
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
  }, []);

  const handleAddSaved = useCallback(() => {
    handleCloseAddDialog();
    setReloadTrigger((v) => v + 1);
  }, [handleCloseAddDialog]);

  // ── Fetcher ───────────────────────────────────────────────────────────
  const apiFilters = useMemo(() => buildApiFilters(filters), [filters]);

  const fetcher = useMemo(
    () => async (params) => {
      const response = await b2bLeadFollowupService.listB2bLeadFollowups(params);
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
              onClick={() => router.push(`/b2b-leads/view?id=${row.id}`)}
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
        field: "company",
        label: "Company",
        sortable: true,
        maxWidth: 160,
        render: (row) => (
          <div className="text-xs">
            <span className="font-semibold">{(row.company_name || "N/A").toUpperCase()}</span>
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
            {(row.status || "created").replace(/_/g, " ")}
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
        label: "Status / Outcome",
        maxWidth: 130,
        render: (row) =>
          row.has_last_follow_up || row.last_called_at || row.last_follow_up_at ? (
            <span className="text-xs capitalize">
              {(row.followup_outcome || row.status || "-").replace(/_/g, " ")}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No FU</span>
          ),
      },
      {
        field: "followup_notes",
        label: "Notes",
        maxWidth: 200,
        render: (row) => {
          const notes = row.followup_notes || row.last_follow_up_discussion;
          if (!notes) return <span className="text-xs text-muted-foreground">-</span>;
          return (
            <span className="text-xs truncate block" title={notes}>
              {notes.length > 50 ? `${notes.substring(0, 50)}...` : notes}
            </span>
          );
        },
      },
      {
        field: "followup_contacted_at",
        label: "Last Called",
        maxWidth: 90,
        render: (row) => {
          const at = row.followup_contacted_at || row.last_called_at || row.last_follow_up_at;
          return <span className="text-xs">{at ? formatDate(at) : "-"}</span>;
        },
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
        field: "followup_contact_channel",
        label: "Channel",
        maxWidth: 100,
        render: (row) => {
          const ch = row.followup_contact_channel || row.last_follow_up_type;
          return ch ? (
            <span className="text-xs capitalize">{String(ch).replace(/_/g, " ")}</span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          );
        },
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
          {r.lead_number} — {r.company_name}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {[
            ["Contact", r.contact_person],
            ["Mobile", r.mobile_number],
            ["City", r.city],
            ["Status", (r.status || "-").replace(/_/g, " ")],
            ["Priority", r.priority],
            ["Assigned To", r.assigned_to_name || "Unassigned"],
            ["Next Follow-Up", r.next_follow_up_at ? formatDate(r.next_follow_up_at) : null],
            ["Last Called", r.last_called_at ? formatDate(r.last_called_at) : null],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
              <p className="capitalize">{value || "-"}</p>
            </div>
          ))}
        </div>
        {r.has_last_follow_up || r.last_called_at || r.last_follow_up_at ? (
          <>
            <hr className="my-2" />
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Latest Follow-Up</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                ["Outcome", (r.followup_outcome || r.status || "-").replace(/_/g, " ")],
                ["Channel", r.followup_contact_channel || r.last_follow_up_type],
                ["Contacted At", (r.followup_contacted_at || r.last_called_at || r.last_follow_up_at)
                  ? formatDate(r.followup_contacted_at || r.last_called_at || r.last_follow_up_at)
                  : null],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
                  <p className="capitalize">{value || "-"}</p>
                </div>
              ))}
            </div>
            {(r.followup_notes || r.last_follow_up_discussion) && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{r.followup_notes || r.last_follow_up_discussion}</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    );
  }, [sidebarRecord]);

  // ── Extra filter fields injected into the filter panel ────────────────
  const extraFields = (
    <>
      <Input
        name="company_name"
        label="Company Name"
        placeholder="Company name"
        value={extraDraft.company_name || ""}
        onChange={(e) => handleExtraChange("company_name", e.target.value)}
      />
      <Input
        name="city"
        label="City"
        placeholder="City"
        value={extraDraft.city || ""}
        onChange={(e) => handleExtraChange("city", e.target.value)}
      />
      <AutocompleteField
        usePortal
        name="followup_outcome"
        label="Lead Status"
        options={[{ value: "", label: "All statuses" }, ...FOLLOWUP_OUTCOME_OPTIONS]}
        getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
        value={
          [{ value: "", label: "All statuses" }, ...FOLLOWUP_OUTCOME_OPTIONS].find(
            (o) => o.value === extraDraft.followup_outcome
          ) || null
        }
        onChange={(e, newVal) => handleExtraChange("followup_outcome", newVal?.value ?? "")}
        placeholder="All statuses"
      />
      <DateField
        name="last_called_from"
        label="Last Called From"
        value={extraDraft.last_called_from || ""}
        onChange={(e) => handleExtraChange("last_called_from", e.target.value)}
      />
      <DateField
        name="last_called_to"
        label="Last Called To"
        value={extraDraft.last_called_to || ""}
        onChange={(e) => handleExtraChange("last_called_to", e.target.value)}
      />
    </>
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="B2B Lead Follow-Ups"
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

          {/* Filter panel */}
          <LeadListFilterPanel
            values={filters}
            onApply={handleFilterApply}
            onClear={handleFilterClear}
            defaultOpen={false}
            hideFields={["customer_name", "campaign_id", "inquiry_source_id", "branch_id", "created_from", "created_to"]}
            statusOptions={B2B_STATUS_OPTIONS}
            priorityOptions={B2B_PRIORITY_OPTIONS}
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
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={(v) => {
              setLimit(v);
              setPage(1);
            }}
          />
          <PaginationControls
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={(v) => {
              setLimit(v);
              setPage(1);
            }}
            rowsPerPageOptions={[20, 50, 100, 200]}
          />
        </div>

        {/* Details Sidebar */}
        <DetailsSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} title="B2B Follow-Up Details">
          {sidebarContent}
        </DetailsSidebar>

        {/* Add Follow-Up Modal */}
        <Dialog open={modalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
            <div className="pb-2">
              <DialogTitle>Add Follow-Up</DialogTitle>
            </div>
            {selectedLead && (
              <AddCallDetailsForm
                leadId={selectedLead.id}
                lead={selectedLead}
                onSaved={handleSaved}
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
              {addStep === 1 ? "Search & Select a B2B Lead" : `Follow-Up for ${addSelectedLead?.company_name || "Lead"}`}
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
                    placeholder="Search by company, mobile, lead #..."
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
                              {lead.company_name || lead.customer_name}
                              {lead.lead_number && (
                                <span className="ml-2 text-[10px] text-slate-400 font-normal">{lead.lead_number}</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {lead.mobile_number}
                              {lead.city && ` • ${lead.city}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] uppercase font-bold",
                                LEAD_STATUS_BADGE[lead.status] || "bg-slate-100 text-slate-600"
                              )}
                            >
                              {(lead.status || "created").replace(/_/g, " ")}
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
                  <p className="text-sm text-center text-slate-400 py-6">Type a company, mobile number, or lead # to search</p>
                )}

                <div className="flex justify-end pt-1">
                  <Button variant="outline" size="sm" onClick={handleCloseAddDialog}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Follow-Up Form */}
            {addStep === 2 && addSelectedLead && (
              <div className="mt-2 relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddStep(1)}
                  className="absolute -top-10 right-0 h-7 text-xs text-slate-500 hover:text-slate-900"
                >
                  Change Lead
                </Button>
                <AddCallDetailsForm
                  leadId={addSelectedLead.id}
                  lead={addSelectedLead}
                  onSaved={handleAddSaved}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
