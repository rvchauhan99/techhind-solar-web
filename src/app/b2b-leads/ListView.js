"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconPhone, IconBrandFacebook } from "@tabler/icons-react";
import { isFacebookMarketingLead } from "@/components/marketing-leads/FacebookLeadDetailsSection";
import { Badge } from "@/components/ui/badge";
import moment from "moment";
import PaginatedTable from "@/components/common/PaginatedTable";
import LeadListFilterPanel from "@/components/common/LeadListFilterPanel";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import b2bLeadService from "@/services/b2bLeadService";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Box, IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import EventIcon from "@mui/icons-material/Event";
import PhoneCallbackIcon from "@mui/icons-material/PhoneCallback";
import ReplayIcon from "@mui/icons-material/Replay";
import { useAuth } from "@/hooks/useAuth";
import { toastError, toastSuccess } from "@/utils/toast";
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import Input from "@/components/common/Input";
import AddCallDetailsForm from "./components/AddCallDetailsForm";
import ScheduleFollowUpDialog from "./components/ScheduleFollowUpDialog";
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants";
import {
  B2B_STATUS_OPTIONS,
  B2B_PRIORITY_OPTIONS,
  NON_EDITABLE_STATUSES,
  REOPENABLE_STATUSES,
} from "./b2bLeadFilterOptions";

const CLOSED_FOR_SCHEDULE = [];

const LEAD_LIST_FILTER_KEYS = [
  "q",
  "lead_number",
  "company_name",
  "mobile_number",
  "city",
  "state",
  "status",
  "priority",
  "assigned_to",
  "inquiry_source_id",
  "pipeline_stage",
  "lost_reason",
  "created_from",
  "created_to",
  "next_follow_up_from",
  "next_follow_up_to",
  "not_status",
  "risk",
  "stale_days",
  "high_value_budget",
  "budget_min",
  "budget_max",
  "industry",
  "business_type",
];

const getStatusBadgeVariant = (status) => {
  switch (status) {
    case "created":
      return "bg-sky-100 text-sky-800";
    case "follow_up":
      return "bg-orange-100 text-orange-800";
    case "on_hold":
      return "bg-yellow-100 text-yellow-800";
    case "converted":
      return "bg-[#138808]/10 text-[#138808]";
    case "not_interested":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

const getPriorityBadgeVariant = (priority) => {
  switch (priority) {
    case "high":
      return "bg-orange-100 text-orange-800";
    case "medium":
      return "bg-sky-100 text-sky-800";
    case "low":
    default:
      return "bg-slate-100 text-slate-600";
  }
};

export default function ListView({ sharedFilters = null }) {
  const router = useRouter();
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };
  const canDeleteLead = currentPerm.can_delete;

  const listingState = useListingQueryState({
    defaultLimit: 25,
    filterKeys: LEAD_LIST_FILTER_KEYS,
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
    setFilters,
    setSort,
    clearFilters,
  } = listingState;

  const sharedAppliedRef = useRef(false);
  useEffect(() => {
    if (sharedAppliedRef.current || !sharedFilters) return;
    const hasUrlFilters = LEAD_LIST_FILTER_KEYS.some(
      (k) => filters[k] != null && String(filters[k]).trim() !== ""
    );
    if (hasUrlFilters) {
      sharedAppliedRef.current = true;
      return;
    }
    const fromShared = {};
    let any = false;
    LEAD_LIST_FILTER_KEYS.forEach((k) => {
      const v = sharedFilters[k];
      if (v == null || v === "") return;
      fromShared[k] = Array.isArray(v) ? v.join(",") : v;
      any = true;
    });
    if (any) {
      sharedAppliedRef.current = true;
      setFilters({ ...filters, ...fromShared });
    } else {
      sharedAppliedRef.current = true;
    }
  }, [sharedFilters, filters, setFilters]);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuLead, setMenuLead] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleMode, setScheduleMode] = useState("schedule");
  const [actionLead, setActionLead] = useState(null);
  const [addFuOpen, setAddFuOpen] = useState(false);

  const handleMenuOpen = useCallback((event, row) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuLead(row);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
    setMenuLead(null);
  }, []);

  const handleView = useCallback(() => {
    if (menuLead?.id) router.push(`/b2b-leads/view?id=${menuLead.id}`);
    handleMenuClose();
  }, [menuLead, router]);

  const handleEdit = useCallback(() => {
    if (menuLead?.id) router.push(`/b2b-leads/edit?id=${menuLead.id}`);
    handleMenuClose();
  }, [menuLead, router, handleMenuClose]);

  const handleDeleteClick = useCallback(() => {
    if (!menuLead?.id) return;
    setLeadToDelete(menuLead);
    setDeleteDialogOpen(true);
    handleMenuClose();
  }, [menuLead, handleMenuClose]);

  const handleScheduleClick = useCallback(() => {
    if (!menuLead?.id) return;
    setActionLead(menuLead);
    setScheduleMode("schedule");
    setScheduleOpen(true);
    handleMenuClose();
  }, [menuLead, handleMenuClose]);

  const handleReopenClick = useCallback(() => {
    if (!menuLead?.id) return;
    setActionLead(menuLead);
    setScheduleMode("reopen");
    setScheduleOpen(true);
    handleMenuClose();
  }, [menuLead, handleMenuClose]);

  const handleAddFollowUpClick = useCallback(() => {
    if (!menuLead?.id) return;
    setActionLead(menuLead);
    setAddFuOpen(true);
    handleMenuClose();
  }, [menuLead, handleMenuClose]);

  const handleActionSaved = useCallback(() => {
    setReloadTrigger((p) => p + 1);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!leadToDelete?.id) return;
    setDeleting(true);
    try {
      await b2bLeadService.deleteB2bLead(leadToDelete.id);
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
      setReloadTrigger((p) => p + 1);
      toastSuccess("B2B lead deleted");
    } catch (err) {
      toastError(err.response?.data?.message || err.message || "Failed to delete lead");
    } finally {
      setDeleting(false);
    }
  }, [leadToDelete]);

  const fetchLeads = useCallback(async (params) => {
    const res = await b2bLeadService.getB2bLeads(params);
    const result = res?.result ?? res?.data ?? res;
    if (Array.isArray(result)) {
      return {
        data: result,
        meta: {
          total: result.length,
          page: params.page || 1,
          pages: 1,
          limit: params.limit || 25,
        },
      };
    }
    if (result?.data && result?.meta) {
      return { data: result.data, meta: result.meta };
    }
    return res;
  }, []);

  const columns = useMemo(
    () => [
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        isActionColumn: true,
        render: (row) => (
          <Box display="flex" gap={0.5} alignItems="center" onClick={(e) => e.stopPropagation()}>
            <IconButton size="small" onClick={(e) => handleMenuOpen(e, row)} sx={{ p: 0.5 }} aria-label="Actions">
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
      {
        field: "lead_number",
        label: "Lead No",
        sortable: true,
        render: (row) => <span className="text-muted-foreground">{row.lead_number || `B2B-${row.id}`}</span>,
      },
      {
        field: "company_name",
        label: "Company Name",
        sortable: true,
        render: (row) => (
          <span className="inline-flex items-center gap-1 font-semibold text-xs text-foreground">
            {isFacebookMarketingLead(row) && (
              <span
                className="inline-flex shrink-0 text-[#1877F2]"
                title={row.tags?.fb_form_name || row.fb_form_name || "Facebook Lead"}
              >
                <IconBrandFacebook className="size-3.5" />
              </span>
            )}
            {(row.company_name || "-").toUpperCase()}
          </span>
        ),
      },
      {
        field: "contact_person",
        label: "Contact Person",
        sortable: true,
        render: (row) => row.contact_person || "-",
      },
      {
        field: "mobile_number",
        label: "Mobile",
        render: (row) => (
          <span className="inline-flex items-center gap-1 text-[0.75rem] text-primary">
            <IconPhone className="size-3.5" /> {row.mobile_number}
          </span>
        ),
      },
      {
        field: "inquiry_source_name",
        label: "Source",
        render: (row) => row.inquiry_source_name || "-",
      },
      {
        field: "campaign_name",
        label: "Campaign",
        render: (row) =>
          row.campaign_name || row.fb_form_name || row.tags?.fb_form_name || "-",
      },
      {
        field: "city",
        label: "City",
        render: (row) => row.city || "-",
      },
      {
        field: "status",
        label: "Status",
        render: (row) => {
          return (
            <span
              className={cn("px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wide border border-transparent whitespace-nowrap", getStatusBadgeVariant(row.status))}
            >
              {(row.status || "created").replace(/_/g, " ")}
            </span>
          );
        },
      },
      {
        field: "priority",
        label: "Priority",
        render: (row) => {
          return (
            <span
              className={cn("px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wide border border-transparent whitespace-nowrap", getPriorityBadgeVariant(row.priority))}
            >
              {row.priority || "medium"}
            </span>
          );
        },
      },
      {
        field: "assigned_to_name",
        label: "Assigned To",
        render: (row) => row.assigned_to_name || "Unassigned",
      },
      {
        field: "next_follow_up_at",
        label: "Next Follow-Up",
        render: (row) => {
          const nextFollowUp =
            row.next_follow_up_at &&
            moment(row.next_follow_up_at).format("DD-MM-YYYY HH:mm");
          const scheduleHint =
            row.follow_up_schedule_type === "recurring"
              ? `Recurring · ${row.follow_up_interval_days || 15}d`
              : row.follow_up_schedule_type === "once"
                ? "Once"
                : null;
          return (
            <span className="flex flex-col leading-tight">
              <span>{nextFollowUp || "Not scheduled"}</span>
              {scheduleHint ? (
                <span className="text-[10px] text-muted-foreground">{scheduleHint}</span>
              ) : null}
            </span>
          );
        },
      },
      {
        field: "created_at",
        label: "Created",
        render: (row) =>
          row.created_at ? moment(row.created_at).format("DD-MM-YYYY") : "-",
      },
    ],
    [handleMenuOpen]
  );

  const filterParams = useMemo(() => {
    const entries = [];
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const cleaned = value
          .map((v) => String(v).trim())
          .filter((v) => v !== "");
        if (cleaned.length) {
          entries.push([key, cleaned.join(",")]);
        }
      } else if (value != null && String(value).trim() !== "") {
        entries.push([key, value]);
      }
    });
    return Object.fromEntries(entries);
  }, [filters]);

  const [extraDraft, setExtraDraft] = useState({
    company_name: filters.company_name || "",
    city: filters.city || "",
  });

  useEffect(() => {
    setExtraDraft({
      company_name: filters.company_name || "",
      city: filters.city || "",
    });
  }, [filters.company_name, filters.city]);

  const handleApplyFilters = useCallback(
    (panelValues) => {
      setFilters({
        ...panelValues,
        company_name: extraDraft.company_name || "",
        city: extraDraft.city || "",
      });
    },
    [setFilters, extraDraft]
  );

  const handleClearFilters = useCallback(() => {
    setExtraDraft({ company_name: "", city: "" });
    clearFilters();
  }, [clearFilters]);

  const extraFields = (
    <>
      <Input
        name="company_name"
        label="Company Name"
        placeholder="Company name"
        value={extraDraft.company_name}
        onChange={(e) =>
          setExtraDraft((prev) => ({ ...prev, company_name: e.target.value }))
        }
      />
      <Input
        name="city"
        label="City"
        placeholder="City"
        value={extraDraft.city}
        onChange={(e) => setExtraDraft((prev) => ({ ...prev, city: e.target.value }))}
      />
    </>
  );

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <LeadListFilterPanel
        values={filters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        defaultOpen={false}
        hideFields={["customer_name", "branch_id"]}
        statusOptions={B2B_STATUS_OPTIONS}
        priorityOptions={B2B_PRIORITY_OPTIONS}
        extraFields={extraFields}
      />
      <div className="flex-1 min-h-0 flex flex-col">
        <PaginatedTable
          key={`${reloadTrigger}-${JSON.stringify(filterParams)}`}
          columns={columns}
          fetcher={fetchLeads}
          showSearch={false}
          size="small"
          moduleKey="b2b-leads"
          height="100%"
          filterParams={filterParams}
          page={page}
          limit={limit}
          q={q}
          sortBy={sortBy || "id"}
          sortOrder={sortOrder || "desc"}
          onPageChange={(zeroBased) => setPage(zeroBased + 1)}
          onRowsPerPageChange={setLimit}
          onQChange={setQ}
          onSortChange={setSort}
          onRowClick={(row) => router.push(`/b2b-leads/view?id=${row.id}`)}
          persistScrollbars
        />
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
          <MenuItem onClick={handleView}>
            <ListItemIcon>
              <VisibilityIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View</ListItemText>
          </MenuItem>
          {menuLead && !NON_EDITABLE_STATUSES.includes(menuLead.status) && currentPerm.can_update && (
            <MenuItem onClick={handleEdit}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
          )}
          {menuLead &&
            currentPerm.can_update &&
            !CLOSED_FOR_SCHEDULE.includes(menuLead.status) &&
            !REOPENABLE_STATUSES.includes(menuLead.status) && (
              <MenuItem onClick={handleScheduleClick}>
                <ListItemIcon>
                  <EventIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Schedule follow-up</ListItemText>
              </MenuItem>
            )}
          {menuLead && currentPerm.can_update && !CLOSED_FOR_SCHEDULE.includes(menuLead.status) && (
            <MenuItem onClick={handleAddFollowUpClick}>
              <ListItemIcon>
                <PhoneCallbackIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Add follow-up</ListItemText>
            </MenuItem>
          )}
          {menuLead &&
            currentPerm.can_update &&
            REOPENABLE_STATUSES.includes(menuLead.status) && (
              <MenuItem onClick={handleReopenClick}>
                <ListItemIcon>
                  <ReplayIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Reopen to follow-up</ListItemText>
              </MenuItem>
            )}
          {canDeleteLead &&
            menuLead &&
            !NON_EDITABLE_STATUSES.includes(menuLead.status) && (
              <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Delete</ListItemText>
              </MenuItem>
            )}
        </Menu>
        <ScheduleFollowUpDialog
          open={scheduleOpen}
          onOpenChange={(open) => {
            setScheduleOpen(open);
            if (!open) setActionLead(null);
          }}
          lead={actionLead}
          mode={scheduleMode}
          onSaved={handleActionSaved}
        />
        <Dialog
          open={addFuOpen}
          onOpenChange={(open) => {
            setAddFuOpen(open);
            if (!open) setActionLead(null);
          }}
        >
          <DialogContent className={DIALOG_FORM_MEDIUM}>
            <DialogTitle className="text-sm font-semibold">
              Add Follow-up — {actionLead?.lead_number || actionLead?.company_name || ""}
            </DialogTitle>
            {actionLead?.id ? (
              <AddCallDetailsForm
                leadId={actionLead.id}
                lead={actionLead}
                forcedStatus="follow_up"
                onSaved={() => {
                  setAddFuOpen(false);
                  setActionLead(null);
                  handleActionSaved();
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteDialogOpen(false);
              setLeadToDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete B2B lead</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                {leadToDelete?.lead_number || `B2B-${leadToDelete?.id}`}
                {leadToDelete?.company_name
                  ? ` (${leadToDelete.company_name})`
                  : ""}
                ? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                loading={deleting}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
