"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import serviceTicketService from "@/services/serviceTicketService";
import { IconShieldCheck, IconArrowRight, IconPackage, IconSearch } from "@tabler/icons-react";

const STATUS_OPTIONS = [
  { value: "pending_return", label: "Pending Return" },
  { value: "claim_passed", label: "Claim Passed" },
  { value: "rejected", label: "Rejected" },
];

export default function ServiceWarrantyClaimsPage() {
  const { page, limit, q, filters, setPage, setLimit, setQ, setFilter } = useListingQueryState({
    defaultLimit: 20,
    filterKeys: ["status"],
  });
  const [totalCount, setTotalCount] = useState(0);
  const [listError, setListError] = useState("");
  const [confirmingClaimId, setConfirmingClaimId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const statusValue = useMemo(() => {
    const current = String(filters.status || "pending_return");
    return STATUS_OPTIONS.some((opt) => opt.value === current) ? current : "pending_return";
  }, [filters.status]);

  const columns = [
    {
      field: "claim_no",
      label: "Claim",
      width: 120,
      render: (row) => <span className="font-medium text-slate-900">{row.claim_no}</span>,
    },
    {
      field: "ticket",
      label: "Ticket",
      width: 120,
      render: (row) => row.ticket?.ticket_no || "—",
    },
    {
      field: "product",
      label: "Product",
      width: 200,
      render: (row) => (
        <div className="flex items-center gap-2">
          <IconPackage size={16} className="text-slate-400" />
          <span className="truncate max-w-[180px]">{row.product?.product_name || "—"}</span>
        </div>
      ),
    },
    {
      field: "status",
      label: "Status",
      width: 140,
      render: (row) => (
        <Badge className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200 text-[11px] px-2 py-0.5 rounded-full font-medium shadow-none">
          {row.status?.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      field: "actions",
      label: "",
      width: 140,
      render: (row) =>
        row.status === "pending_return" ? (
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-primary hover:bg-brand-primary/90 text-white gap-1.5"
            disabled={confirmingClaimId === row.id}
            onClick={async (e) => {
              e.stopPropagation();
              if (confirmingClaimId === row.id) return;
              try {
                setConfirmingClaimId(row.id);
                await serviceTicketService.confirmWarrantyReturn(row.id, {});
                toast.success("Return confirmed successfully");
                setReloadKey((k) => k + 1);
              } catch (err) {
                toast.error(err?.response?.data?.message || "Failed to confirm return");
              } finally {
                setConfirmingClaimId(null);
              }
            }}
          >
            {confirmingClaimId === row.id ? "Confirming..." : "Confirm Return"}
            <IconArrowRight size={14} />
          </Button>
        ) : null,
    },
  ];

  const fetchData = useCallback(
    async (params = {}) => {
      const requestPage = params.page || page;
      const requestLimit = params.limit || limit;
      try {
        setListError("");
        const res = await serviceTicketService.getWarrantyClaims({
          page: requestPage,
          limit: requestLimit,
          q: params.q ?? q,
          status: statusValue,
        });
        const result = res?.result || res;
        const data = result?.data || [];
        const pagination = result?.pagination || {};
        const total = Number(pagination.total || data.length || 0);
        setTotalCount(total);
        return {
          data,
          meta: {
            total,
            page: Number(pagination.page || requestPage),
            limit: Number(pagination.limit || requestLimit),
          },
        };
      } catch (err) {
        setListError(err?.response?.data?.message || "Failed to load warranty claims");
        setTotalCount(0);
        return {
          data: [],
          meta: { total: 0, page: requestPage, limit: requestLimit },
        };
      }
    },
    [page, limit, q, statusValue]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer 
        title={
          <div className="flex items-center gap-2">
            <IconShieldCheck className="text-brand-primary" size={24} />
            Warranty Claims
          </div>
        }
        subtitle="Manage pending warehouse returns for defective materials"
      >
        <div className="bg-white p-2 rounded-lg border border-slate-200 mb-2 flex flex-col sm:flex-row gap-2 items-center shadow-sm">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <IconSearch size={15} />
            </div>
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Search claim/ticket/customer..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select value={statusValue} onValueChange={(value) => setFilter("status", value)}>
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {listError ? (
            <Button size="sm" variant="outline" className="h-8" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          ) : null}
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mt-2">
          {listError ? (
            <div className="px-3 py-2 text-xs text-red-700 bg-red-50 border-b border-red-200">
              {listError}
            </div>
          ) : null}
          <PaginatedTable
            key={reloadKey}
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
            height="calc(100vh - 260px)"
          />
          <div className="border-t border-slate-200 bg-slate-50 px-3 py-1.5">
            <PaginationControls
              page={page - 1}
              rowsPerPage={limit}
              totalCount={totalCount}
              onPageChange={(zeroBased) => setPage(zeroBased + 1)}
              onRowsPerPageChange={setLimit}
            />
          </div>
        </div>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
