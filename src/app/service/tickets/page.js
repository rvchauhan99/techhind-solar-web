"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import serviceTicketService from "@/services/serviceTicketService";
import { IconSearch, IconFilter, IconPlus, IconExternalLink } from "@tabler/icons-react";

const TICKETS_SEARCH_DEBOUNCE_MS = 350;

const STATUS_COLORS = {
  open: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  assigned: "bg-blue-50 text-blue-700 border border-blue-200",
  awaiting_payment: "bg-amber-50 text-amber-700 border border-amber-200",
  awaiting_warranty: "bg-purple-50 text-purple-700 border border-purple-200",
  closed: "bg-slate-100 text-slate-700 border border-slate-200",
};

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "site_visited", label: "Site Visited" },
  { value: "diagnosis_submitted", label: "Diagnosis Submitted" },
  { value: "awaiting_material", label: "Awaiting Material" },
  { value: "awaiting_warranty", label: "Awaiting Warranty" },
  { value: "awaiting_payment", label: "Awaiting Payment" },
  { value: "service_completed", label: "Service Completed" },
  { value: "closed", label: "Closed" },
];

export default function ServiceTicketsPage() {
  const router = useRouter();
  const listingState = useListingQueryState({ defaultLimit: 20, filterKeys: ["status"] });
  const { page, limit, q, filters, setPage, setLimit, setQ, setFilter, clearFilters } = listingState;
  const [totalCount, setTotalCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchInput, setSearchInput] = useState(q ?? "");
  const validStatusValues = useMemo(() => new Set(STATUS_OPTIONS.map((opt) => opt.value)), []);
  const normalizedStatus = validStatusValues.has(filters.status) ? filters.status : "";

  useEffect(() => {
    if (filters.status && !validStatusValues.has(filters.status)) {
      setFilter("status", "");
    }
  }, [filters.status, setFilter, validStatusValues]);

  useEffect(() => {
    setSearchInput(q ?? "");
  }, [q]);

  useEffect(() => {
    const normalizedInput = (searchInput ?? "").trim();
    const normalizedQuery = (q ?? "").trim();
    if (normalizedInput === normalizedQuery) return;
    const timer = setTimeout(() => {
      setQ(normalizedInput);
    }, TICKETS_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, q, setQ]);

  const columns = useMemo(
    () => [
      { field: "ticket_no", label: "Ticket", width: 110, render: (row) => <span className="font-medium text-slate-900">{row.ticket_no}</span> },
      { field: "order_number", label: "PUI", width: 100 },
      { field: "customer_name", label: "Customer", width: 160 },
      { field: "mobile_number", label: "Mobile", width: 110 },
      {
        field: "status",
        label: "Status",
        width: 140,
        render: (row) => (
          <Badge className={`text-[11px] px-2 py-0.5 rounded-full font-medium shadow-none ${STATUS_COLORS[row.status] || "bg-slate-100 text-slate-700"}`}>
            {row.status?.replace(/_/g, " ")}
          </Badge>
        ),
      },
      { field: "call_type", label: "Call", width: 90 },
      { field: "engineer_name", label: "Engineer", width: 140 },
      {
        field: "actions",
        label: "",
        width: 80,
        render: (row) => (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs text-[#00823b] hover:text-[#00602b] hover:bg-[#00823b]/10"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/service/tickets/${row.id}`);
            }}
          >
            Open
          </Button>
        ),
      },
    ],
    [router]
  );

  const fetchData = useCallback(
    async (params) => {
      const res = await serviceTicketService.getServiceTickets({
        page: params.page || page,
        limit: params.limit || limit,
        q: params.q ?? q,
        status: filters.status || undefined,
        sortBy: params.sortBy || "id",
        sortOrder: params.sortOrder || "DESC",
      });
      const result = res?.result || res;
      const data = result?.data || [];
      const pagination = result?.pagination || {};
      const total = pagination?.total ?? data.length;
      setTotalCount(total);
      return {
        data,
        meta: {
          total,
          page: pagination?.page ?? (params.page || page),
          limit: pagination?.limit ?? (params.limit || limit),
        },
      };
    },
    [page, limit, q, filters.status]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Service Tickets"
        subtitle="Manage and track post-installation support tickets"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => router.push("/service/search")}>
              <IconPlus size={16} />
              New Ticket
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={() => clearFilters({ keepQuickSearch: false })}>
              Clear Filters
            </Button>
            <Button size="sm" className="h-9 bg-[#00823b] hover:bg-[#00602b] text-white" onClick={() => router.push("/service/dashboard")}>
              Dashboard
            </Button>
          </div>
        }
      >
        <div className="bg-white p-3 rounded-lg border border-slate-200 mb-4 flex flex-col sm:flex-row gap-3 items-center shadow-sm">
          <div className="relative flex-1 w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <IconSearch size={16} />
            </div>
            <Input
              className="h-9 pl-9 text-sm"
              placeholder="Search by ticket no, customer, PUI..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-56 flex items-center gap-2">
            <IconFilter size={16} className="text-slate-400" />
            <div className="flex-1">
              <Select value={normalizedStatus || "all"} onValueChange={(val) => setFilter("status", val === "all" ? "" : val)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map((statusOpt) => (
                    <SelectItem key={statusOpt.value} value={statusOpt.value}>
                      {statusOpt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <PaginatedTable
            columns={columns}
            fetcher={fetchData}
            page={page}
            limit={limit}
            q={q}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            onQChange={setQ}
            showSearch={false}
            showPagination={false}
            height="calc(100vh - 290px)"
            onRowClick={(row) => {
              setSelectedRow(row);
              setSidebarOpen(true);
            }}
          />
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-2">
            <PaginationControls
              page={page - 1}
              rowsPerPage={limit}
              totalCount={totalCount}
              onPageChange={(zeroBased) => setPage(zeroBased + 1)}
              onRowsPerPageChange={setLimit}
            />
          </div>
        </div>

        <DetailsSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{selectedRow?.ticket_no || "Ticket"}</span>
              {selectedRow?.status && (
                <Badge className={`text-[10px] px-2 py-0.5 rounded-full font-medium shadow-none ${STATUS_COLORS[selectedRow.status] || "bg-slate-100 text-slate-700"}`}>
                  {selectedRow.status.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
          }
          width={450}
        >
          {selectedRow && (
            <div className="p-4 space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 pb-1 border-b">Customer Info</h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                  <div>
                    <span className="block text-xs text-slate-500 mb-1">Customer Name</span>
                    <span className="font-medium text-slate-900">{selectedRow.customer_name}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 mb-1">Mobile</span>
                    <span className="text-slate-900">{selectedRow.mobile_number || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 pb-1 border-b">Project Details</h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                  <div>
                    <span className="block text-xs text-slate-500 mb-1">PUI (Order No)</span>
                    <span className="font-medium text-blue-600">{selectedRow.order_number}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 mb-1">Call Type</span>
                    <span className="text-slate-900">{selectedRow.call_type}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-xs text-slate-500 mb-1">Assigned Engineer</span>
                    <span className="text-slate-900">{selectedRow.engineer_name || <span className="text-slate-400 italic">Unassigned</span>}</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end border-t">
                <Button 
                  className="gap-2 bg-[#00823b] hover:bg-[#00602b]" 
                  onClick={() => router.push(`/service/tickets/${selectedRow.id}`)}
                >
                  <IconExternalLink size={16} />
                  View Full Details
                </Button>
              </div>
            </div>
          )}
        </DetailsSidebar>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
