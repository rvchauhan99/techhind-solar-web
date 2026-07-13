"use client";

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import commissionSettlementService from "@/services/commissionSettlementService";
import CommissionPayoutReviewDrawer from "../components/CommissionPayoutReviewDrawer";

const PERMISSION_MODULE_KEY = "/commission-settlements/payout-approval";

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

function fmtMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function statusBadge(status) {
  if (status === "pending_approval") {
    return (
      <Badge variant="outline" className="h-5 border-amber-300 bg-amber-50 px-1 text-[9px] text-amber-800">
        Pending approval
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge variant="outline" className="h-5 border-emerald-300 bg-emerald-50 px-1 text-[9px] text-emerald-800">
        Approved for payment
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="outline" className="h-5 border-red-300 bg-red-50 px-1 text-[9px] text-red-800">
        Rejected
      </Badge>
    );
  }
  if (status === "paid") {
    return (
      <Badge variant="outline" className="h-5 border-slate-300 bg-slate-50 px-1 text-[9px] text-slate-700">
        Paid
      </Badge>
    );
  }
  return <span className="text-[10px]">{status || "—"}</span>;
}

export default function CommissionPayoutApprovalPage() {
  const { user, modulePermissions, fetchPermissionForModule } = useAuth();
  const permModule = useMemo(
    () => findModuleByPermissionKey(user?.modules || [], PERMISSION_MODULE_KEY),
    [user?.modules]
  );

  useEffect(() => {
    if (permModule?.id) fetchPermissionForModule(permModule.id);
  }, [permModule?.id, fetchPermissionForModule]);

  const currentPerm = modulePermissions?.[permModule?.id] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  const canApproveReject = currentPerm.can_create || currentPerm.can_update;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [reviewId, setReviewId] = useState(null);

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const response = await commissionSettlementService.listPayoutRequests({
        page: p.page,
        limit: p.limit,
        status: "pending_approval",
      });
      const result = response?.result || response;
      return {
        data: result?.data || [],
        meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
      };
    },
    [tableKey]
  );

  const openReview = (row) => {
    if (row?.id) setReviewId(row.id);
  };

  const downloadVoucher = async (row) => {
    if (!row?.id) return;
    try {
      const blob = await commissionSettlementService.downloadPayoutVoucher(row.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payout-voucher-${row.payout_number || row.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Voucher download failed");
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "payout_number",
        label: "Batch No.",
        sortable: false,
        render: (r) => r.payout_number || "—",
      },
      {
        field: "beneficiary_name",
        label: "Beneficiary",
        sortable: false,
        render: (r) => r.beneficiary_name || "—",
      },
      {
        field: "total_amount",
        label: "Total Amount",
        sortable: false,
        render: (r) => (
          <span className="tabular-nums font-medium">₹{fmtMoney(r.total_amount)}</span>
        ),
      },
      {
        field: "requested_by_name",
        label: "Requested By",
        sortable: false,
        render: (r) => r.requested_by_name || "—",
      },
      {
        field: "requested_at",
        label: "Request Date",
        sortable: false,
        render: (r) => (r.requested_at ? String(r.requested_at).slice(0, 16) : "—"),
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (r) => statusBadge(r.status),
      },
      {
        field: "actions",
        label: "",
        sortable: false,
        isActionColumn: true,
        render: (row) => (
          <div className="flex flex-wrap items-center gap-1">
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openReview(row)}>
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => downloadVoucher(row)}
            >
              Voucher
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer title="Pending Payout Approval">
        <div className="flex flex-col gap-2 px-1 pb-2">
          <PaginatedTable
            key={tableKey}
            moduleKey={PERMISSION_MODULE_KEY}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            showPagination={false}
            height="calc(100vh - 200px)"
            onTotalChange={setTotalCount}
            page={page}
            limit={limit}
            sortBy="id"
            sortOrder="DESC"
            onPageChange={(z) => setPage(z + 1)}
            onRowsPerPageChange={setLimit}
            onQChange={() => {}}
            onSortChange={() => {}}
            onRowClick={openReview}
          />
          <PaginationControls
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(z) => setPage(z + 1)}
            onRowsPerPageChange={setLimit}
          />
        </div>

        <CommissionPayoutReviewDrawer
          open={!!reviewId}
          payoutId={reviewId}
          onClose={() => setReviewId(null)}
          onActionComplete={() => setTableKey((k) => k + 1)}
          canApproveReject={canApproveReject}
        />
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
