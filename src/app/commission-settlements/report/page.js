"use client";

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AutocompleteField from "@/components/common/AutocompleteField";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import commissionSettlementService from "@/services/commissionSettlementService";
import SettlementByUserSummary from "../components/SettlementByUserSummary";
import { fmtMoney, fmtSignedMoney, payableAmount } from "../utils/settlementMoney";

const PERMISSION_MODULE_KEY = "/commission-settlements/report";

const REPORT_STATUS_OPTIONS = [
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function findModuleRecursive(list, matchPredicate) {
  for (const mod of list || []) {
    if (matchPredicate(mod)) return mod;
    if (mod.submodules?.length) {
      const found = findModuleRecursive(mod.submodules, matchPredicate);
      if (found) return found;
    }
  }
  return null;
}

function findModuleByPermissionKey(modules, moduleKey) {
  const matchPredicate = (m) =>
    m &&
    (m.key === moduleKey ||
      m.route === moduleKey ||
      m.key === moduleKey.replace(/[-\s]/g, "_") ||
      m.key === moduleKey.replace(/\//g, "_"));
  return findModuleRecursive(modules, matchPredicate);
}

export default function CommissionSettlementReportPage() {
  const { user, modulePermissions, fetchPermissionForModule } = useAuth();
  const permModule = useMemo(
    () => findModuleByPermissionKey(user?.modules || [], PERMISSION_MODULE_KEY),
    [user?.modules]
  );

  useEffect(() => {
    if (permModule?.id) fetchPermissionForModule(permModule.id);
  }, [permModule?.id, fetchPermissionForModule]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [status, setStatus] = useState("");
  const [settlementNumber, setSettlementNumber] = useState("");
  const [submittedFrom, setSubmittedFrom] = useState("");
  const [submittedTo, setSubmittedTo] = useState("");
  const [approvedFrom, setApprovedFrom] = useState("");
  const [approvedTo, setApprovedTo] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const response = await commissionSettlementService.listCommissionSettlements({
        page: p.page,
        limit: p.limit,
        status: status || undefined,
        settlement_number: settlementNumber.trim() || undefined,
        submitted_from: submittedFrom || undefined,
        submitted_to: submittedTo || undefined,
        approved_from: approvedFrom || undefined,
        approved_to: approvedTo || undefined,
      });
      const result = response?.result || response;
      return {
        data: result?.data || [],
        meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
      };
    },
    [tableKey, status, settlementNumber, submittedFrom, submittedTo, approvedFrom, approvedTo]
  );

  const columns = useMemo(
    () => [
      { field: "settlement_number", label: "Number", sortable: false, render: (r) => r.settlement_number },
      { field: "status", label: "Status", sortable: false, render: (r) => r.status },
      {
        field: "total_amount",
        label: "Total",
        sortable: false,
        render: (r) => fmtMoney(r.total_amount),
      },
      { field: "submitted_at", label: "Submitted", sortable: false, render: (r) => (r.submitted_at ? String(r.submitted_at).slice(0, 16) : "-") },
      { field: "approved_at", label: "Approved", sortable: false, render: (r) => (r.approved_at ? String(r.approved_at).slice(0, 16) : "-") },
      {
        field: "actions",
        label: "",
        sortable: false,
        isActionColumn: true,
        render: (row) => (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => {
              void (async () => {
                setDetailId(row.id);
                setLoadingDetail(true);
                try {
                  const res = await commissionSettlementService.getCommissionSettlementById(row.id);
                  setDetail(res?.result ?? res);
                } catch (e) {
                  toast.error(e?.response?.data?.message || e?.message || "Load failed");
                  setDetailId(null);
                } finally {
                  setLoadingDetail(false);
                }
              })();
            }}
          >
            Detail
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer title="Commission settlement report">
        <div className="flex flex-col gap-2 px-1 pb-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            <AutocompleteField
              usePortal
              name="status"
              label="Status"
              options={REPORT_STATUS_OPTIONS}
              getOptionLabel={(o) => o?.label ?? ""}
              value={status ? REPORT_STATUS_OPTIONS.find((o) => o.value === status) ?? null : null}
              onChange={(e, v) => setStatus(v?.value ?? "")}
              clearable
              placeholder="All statuses"
            />
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Number</Label>
              <Input className="h-8 text-xs" value={settlementNumber} onChange={(e) => setSettlementNumber(e.target.value)} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Submitted from</Label>
              <Input type="date" className="h-8 text-xs" value={submittedFrom} onChange={(e) => setSubmittedFrom(e.target.value)} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Submitted to</Label>
              <Input type="date" className="h-8 text-xs" value={submittedTo} onChange={(e) => setSubmittedTo(e.target.value)} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Approved from</Label>
              <Input type="date" className="h-8 text-xs" value={approvedFrom} onChange={(e) => setApprovedFrom(e.target.value)} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Approved to</Label>
              <Input type="date" className="h-8 text-xs" value={approvedTo} onChange={(e) => setApprovedTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button size="sm" className="h-8 w-full text-xs" onClick={() => setTableKey((k) => k + 1)}>
                Apply filters
              </Button>
            </div>
          </div>
          <PaginatedTable
            key={tableKey}
            moduleKey={PERMISSION_MODULE_KEY}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            showPagination={false}
            height="calc(100vh - 320px)"
            onTotalChange={setTotalCount}
            page={page}
            limit={limit}
            sortBy="id"
            sortOrder="DESC"
            onPageChange={(z) => setPage(z + 1)}
            onRowsPerPageChange={setLimit}
            onQChange={() => {}}
            onSortChange={() => {}}
          />
          <PaginationControls
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(z) => setPage(z + 1)}
            onRowsPerPageChange={setLimit}
          />
        </div>

        <Dialog open={!!detailId} onOpenChange={(o) => { if (!o) { setDetailId(null); setDetail(null); } }}>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Settlement {detail?.settlement_number || ""}</DialogTitle>
            </DialogHeader>
            {loadingDetail ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : detail ? (
              <div className="space-y-2 text-sm">
                <p>Status: {detail.status}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Payable </span>
                    <span className="font-semibold">₹ {fmtMoney(payableAmount(detail))}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Line total </span>
                    <span className="font-semibold">₹ {fmtMoney(detail.total_line_amount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Round off </span>
                    <span className="font-semibold">₹ {fmtSignedMoney(detail.total_round_off_amount ?? 0)}</span>
                  </div>
                </div>
                <p className="text-xs font-semibold text-muted-foreground pt-1">By beneficiary</p>
                <SettlementByUserSummary byUser={detail.by_user || []} />
                <p className="text-xs font-semibold text-muted-foreground">Lines</p>
                <div className="max-h-48 overflow-y-auto space-y-0.5 text-xs">
                  {(detail.lines || []).map((ln) => (
                    <div key={ln.id} className="flex justify-between gap-2">
                      <span>
                        {ln.order_number} · {ln.role} · {ln.beneficiary_name}
                      </span>
                      <span>{fmtMoney(ln.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
