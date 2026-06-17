"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch, IconBuildingFactory2, IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import serviceTicketService from "@/services/serviceTicketService";

export default function ServiceSearchPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [submittedQ, setSubmittedQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const fetchProjects = useCallback(async (params = {}) => {
    const pageFromTable = params.page || page;
    const limitFromTable = params.limit || limit;
    const query = String(params.q ?? submittedQ ?? "").trim();
    if (query.length < 2) {
      return {
        data: [],
        meta: { total: 0, page: pageFromTable, limit: limitFromTable },
      };
    }

    try {
      const res = await serviceTicketService.projectSearch({
        q: query,
        page: pageFromTable,
        limit: limitFromTable,
      });
      const result = res?.result || {};
      const data = result?.data || [];
      const pagination = result?.pagination || {};
      return {
        data,
        meta: {
          total: Number(pagination.total || data.length),
          page: Number(pagination.page || pageFromTable),
          limit: Number(pagination.limit || limitFromTable),
        },
      };
    } catch (err) {
      toast.error(err?.response?.data?.message || "Search failed");
      return {
        data: [],
        meta: { total: 0, page: pageFromTable, limit: limitFromTable },
      };
    }
  }, [submittedQ, page, limit]);

  const columns = [
    { 
      field: "pui", 
      label: "PUI", 
      width: 120,
      render: (row) => <span className="font-medium text-blue-600">{row.pui}</span> 
    },
    { field: "customer_name", label: "Customer", width: 200 },
    { field: "mobile_number", label: "Mobile", width: 120 },
    { field: "consumer_no", label: "Consumer No", width: 130 },
    {
      field: "amc_years",
      label: "AMC",
      width: 90,
      render: (row) => row.amc_years != null ? (
        <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200 text-[10px] shadow-none">
          {row.amc_years} Years
        </Badge>
      ) : <span className="text-slate-400">—</span>,
    },
    {
      field: "netmeter_installed_on",
      label: "Net Meter Date",
      width: 140,
      render: (row) => row.netmeter_installed_on ? (
        <span className="text-slate-600">{row.netmeter_installed_on}</span>
      ) : <span className="text-slate-400">—</span>,
    },
    {
      field: "actions",
      label: "",
      width: 120,
      render: (row) => (
        <Button
          size="sm"
          className="h-8 px-3 text-xs bg-[#00823b] hover:bg-[#00602b] text-white gap-1"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/service/tickets/create?order_id=${row.order_id}`);
          }}
        >
          <IconPlus size={14} />
          Create Ticket
        </Button>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <ListingPageContainer 
        title="Project Search" 
        subtitle="Find projects to create new service tickets"
      >
        <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6 shadow-sm max-w-3xl">
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Search Projects
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <IconSearch size={18} />
              </div>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Enter client name, mobile number, consumer no, or PUI..."
                className="h-11 pl-10 text-sm shadow-inner"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    setSubmittedQ(q.trim());
                  }
                }}
                autoFocus
              />
            </div>
            <Button 
              className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white shadow-sm" 
              onClick={() => {
                setPage(1);
                setSubmittedQ(q.trim());
              }}
              disabled={q.trim().length < 2}
            >
              Search
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Enter at least 2 characters to search across our project database.
          </p>
        </div>

        {submittedQ.length >= 2 ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <PaginatedTable
              columns={columns}
              fetcher={fetchProjects}
              page={page}
              limit={limit}
              q={submittedQ}
              onPageChange={(zeroBasedPage) => setPage(zeroBasedPage + 1)}
              onRowsPerPageChange={(nextLimit) => {
                setLimit(nextLimit);
                setPage(1);
              }}
              onQChange={(nextQ) => setSubmittedQ(String(nextQ || "").trim())}
              height="calc(100vh - 300px)"
              showSearch={false}
              getRowKey={(row) => row.order_id}
              onRowClick={(row) => router.push(`/service/tickets/create?order_id=${row.order_id}`)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="h-20 w-20 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center text-[#00823b] mb-5">
              <IconBuildingFactory2 size={40} stroke={1.5} />
            </div>
            <h3 className="text-xl font-medium text-slate-900 mb-2">Ready to search</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Use the search bar above to find a customer's project by their PUI, name, mobile, or consumer number.
            </p>
          </div>
        )}
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
