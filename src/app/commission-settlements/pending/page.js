"use client";

import { useMemo, useState, useEffect } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import commissionSettlementService from "@/services/commissionSettlementService";
import CommissionSettlementReviewDrawer from "../components/CommissionSettlementReviewDrawer";

const PERMISSION_MODULE_KEY = "/commission-settlements/pending";

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

export default function CommissionPendingPage() {
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
      const response = await commissionSettlementService.listCommissionSettlements({
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

  const columns = useMemo(
    () => [
      {
        field: "settlement_number",
        label: "Number",
        sortable: false,
        render: (r) => (
          <span className="inline-flex items-center gap-1">
            {r.settlement_number}
            {r.has_line_adjustments ? (
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0 border-violet-300 bg-violet-50 text-violet-800"
                title="Manual bonus/deduction adjustments included"
              >
                Adjustments ({r.adjustment_count ?? 0})
              </Badge>
            ) : null}
            {r.has_outstanding_offset ? (
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0 border-amber-300 bg-amber-50 text-amber-800"
                title="Outstanding will be / was deducted from commission payout"
              >
                Offset
              </Badge>
            ) : null}
          </span>
        ),
      },
      {
        field: "total_amount",
        label: "Total",
        sortable: false,
        render: (r) => fmtMoney(r.total_amount),
      },
      {
        field: "submitted_at",
        label: "Submitted",
        sortable: false,
        render: (r) => (r.submitted_at ? String(r.submitted_at).slice(0, 16) : "-"),
      },
      {
        field: "submitted_by_name",
        label: "By",
        sortable: false,
        render: (r) => r.submitted_by_name || "-",
      },
      {
        field: "actions",
        label: "",
        sortable: false,
        isActionColumn: true,
        render: (row) => (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openReview(row)}>
            Review
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer title="Commission — pending approvals">
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

        <CommissionSettlementReviewDrawer
          open={!!reviewId}
          settlementId={reviewId}
          onClose={() => setReviewId(null)}
          onActionComplete={() => setTableKey((k) => k + 1)}
          canApproveReject={canApproveReject}
        />
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
