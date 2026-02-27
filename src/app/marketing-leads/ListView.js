"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { IconPhone } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import moment from "moment";
import PaginatedTable from "@/components/common/PaginatedTable";
import LeadListFilterPanel, {
  DEFAULT_FILTER_LAST_30_DAYS,
} from "@/components/common/LeadListFilterPanel";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import marketingLeadsService from "@/services/marketingLeadsService";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const LEAD_LIST_FILTER_KEYS = [
  "customer_name",
  "mobile_number",
  "branch_id",
  "inquiry_source_id",
  "status",
  "priority",
  "campaign_name",
  "created_from",
  "created_to",
  "next_follow_up_from",
  "next_follow_up_to",
  "not_status",
  "assigned_to",
];

const getStatusBadgeVariant = (status) => {
  switch (status) {
    case "new":
      return "bg-sky-100 text-sky-800";
    case "contacted":
      return "bg-indigo-100 text-indigo-800";
    case "follow_up":
      return "bg-orange-100 text-orange-800";
    case "interested":
      return "bg-emerald-100 text-emerald-800";
    case "converted":
      return "bg-[#138808]/10 text-[#138808]";
    case "not_interested":
    case "junk":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

const getPriorityBadgeVariant = (priority) => {
  switch (priority) {
    case "hot":
      return "bg-red-100 text-red-800";
    case "high":
      return "bg-orange-100 text-orange-800";
    case "medium":
      return "bg-sky-100 text-sky-800";
    case "low":
    default:
      return "bg-slate-100 text-slate-600";
  }
};

export default function ListView() {
  const router = useRouter();
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

  const defaultDatesAppliedRef = useRef(false);

  useEffect(() => {
    if (defaultDatesAppliedRef.current) return;
    if (!filters.created_from && !filters.created_to) {
      defaultDatesAppliedRef.current = true;
      setFilters({
        ...filters,
        created_from: DEFAULT_FILTER_LAST_30_DAYS.created_from,
        created_to: DEFAULT_FILTER_LAST_30_DAYS.created_to,
      });
    }
  }, [filters, setFilters]);

  const fetchLeads = useCallback(async (params) => {
    const res = await marketingLeadsService.getMarketingLeads(params);
    const result = res?.result ?? res?.data ?? res;
    const statusFilter = params?.status;
    if (Array.isArray(result)) {
      const filteredData =
        !statusFilter
          ? result.filter((row) => row.status !== "converted")
          : result;
      return {
        data: filteredData,
        meta: {
          total: filteredData.length,
          page: params.page || 1,
          pages: 1,
          limit: params.limit || 25,
        },
      };
    }
    if (result?.data && result?.meta) {
      const rawData = Array.isArray(result.data) ? result.data : [];
      const filteredData =
        !statusFilter
          ? rawData.filter((row) => row.status !== "converted")
          : rawData;
      return {
        data: filteredData,
        meta: { ...result.meta, total: filteredData.length },
      };
    }
    return res;
  }, []);

  const columns = useMemo(
    () => [
      {
        field: "lead_number",
        label: "Lead No",
        sortable: true,
        render: (row) => <span className="text-muted-foreground">{row.lead_number || `ML-${row.id}`}</span>,
      },
      {
        field: "customer_name",
        label: "Name",
        sortable: true,
        render: (row) => (
          <span className="font-semibold text-xs text-foreground">
            {(row.customer_name || "-").toUpperCase()}
          </span>
        ),
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
        field: "branch_name",
        label: "Branch",
        render: (row) => row.branch_name || "-",
      },
      {
        field: "inquiry_source_name",
        label: "Source",
        render: (row) => row.inquiry_source_name || "-",
      },
      {
        field: "campaign_name",
        label: "Campaign",
        render: (row) => row.campaign_name || "-",
      },
      {
        field: "status",
        label: "Status",
        render: (row) => {
          return (
            <span
              className={cn("px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wide border border-transparent whitespace-nowrap", getStatusBadgeVariant(row.status))}
            >
              {(row.status || "new").replace(/_/g, " ")}
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
        field: "expected_capacity_kw",
        label: "Capacity",
        render: (row) =>
          row.expected_capacity_kw ? `${row.expected_capacity_kw} kW` : "-",
      },
      {
        field: "expected_project_cost",
        label: "Expected Value",
        render: (row) =>
          row.expected_project_cost != null
            ? `₹${Number(row.expected_project_cost).toLocaleString()}`
            : "-",
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
          return nextFollowUp || "Not scheduled";
        },
      },
      {
        field: "last_call_outcome",
        label: "Last Outcome",
        render: (row) => row.last_call_outcome || "-",
      },
      {
        field: "city_name",
        label: "City",
        render: (row) => row.city_name || "-",
      },
      {
        field: "created_at",
        label: "Created",
        render: (row) =>
          row.created_at ? moment(row.created_at).format("DD-MM-YYYY") : "-",
      },
    ],
    []
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

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <LeadListFilterPanel
        values={filters}
        onApply={(v) => setFilters(v)}
        onClear={clearFilters}
        defaultOpen={false}
      />
      <div className="flex-1 min-h-0 flex flex-col">
        <PaginatedTable
          columns={columns}
          fetcher={fetchLeads}
          showSearch
          moduleKey="marketing-leads"
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
          onRowClick={(row) => router.push(`/marketing-leads/view?id=${row.id}`)}
        />
      </div>
    </div>
  );
}
