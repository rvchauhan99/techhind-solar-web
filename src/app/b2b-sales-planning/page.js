"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconEye, IconPlus, IconPlayerStop } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import SalesPlanningFilterPanel, {
  EMPTY_SALES_PLANNING_FILTERS,
  filtersToApiParams,
} from "@/components/common/SalesPlanningFilterPanel";
import SalesPlanningQuickToolbar, {
  applyDatePreset,
  applyQuickStatus,
} from "./components/SalesPlanningQuickToolbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import Textarea from "@/components/common/Textarea";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate } from "@/utils/dataTableUtils";
import b2bSalesPlanningService from "@/services/b2bSalesPlanningService";
import { useB2bSalesOrderSidebar } from "./components/useB2bSalesOrderSidebar";

const STATUS_BADGE = {
  DUE_TODAY: "accent",
  UPCOMING: "navy",
  OVERDUE: "destructive",
  PIPELINE: "secondary",
  PIPELINE_OVERDUE: "destructive",
  COMPLETED: "default",
  BROKEN: "destructive",
};

const STATUS_LABEL = {
  DUE_TODAY: "Due Today",
  UPCOMING: "Upcoming",
  OVERDUE: "Overdue",
  PIPELINE: "Pipeline",
  PIPELINE_OVERDUE: "Pipeline Overdue",
  COMPLETED: "Completed",
  BROKEN: "Broken",
};

const BREAKABLE_STATUSES = new Set([
  "UPCOMING",
  "DUE_TODAY",
  "OVERDUE",
  "PIPELINE",
  "PIPELINE_OVERDUE",
]);

export function renderPlanStatusBadge(status) {
  const variant = STATUS_BADGE[status] || "secondary";
  return <Badge variant={variant}>{STATUS_LABEL[status] || status || "—"}</Badge>;
}

export default function B2bSalesPlanningPage() {
  const router = useRouter();
  const { openOrderSidebar, sidebar } = useB2bSalesOrderSidebar();
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  const listingState = useListingQueryState({
    defaultLimit: 20,
  });
  const { page, limit, sortBy, sortOrder, setPage, setLimit, setSort } = listingState;
  const [totalCount, setTotalCount] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_SALES_PLANNING_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [tableKey, setTableKey] = useState(0);

  const [breakTarget, setBreakTarget] = useState(null);
  const [breakRemarks, setBreakRemarks] = useState("");
  const [breaking, setBreaking] = useState(false);

  const apiParams = useMemo(() => filtersToApiParams(appliedFilters), [appliedFilters]);

  const fetcher = useCallback(async ({ page: p, limit: l, q, sortBy: sb, sortOrder: so, ...rest }) => {
    const res = await b2bSalesPlanningService.getB2bSalesPlans({
      page: p,
      limit: l,
      q: q || undefined,
      sortBy: sb || "plan_date",
      sortOrder: so || "ASC",
      ...rest,
    });
    const result = res?.result ?? res;
    return {
      data: result?.rows || [],
      total: result?.count ?? 0,
    };
  }, [tableKey]);

  const columns = useMemo(
    () => [
      {
        field: "plan_no",
        label: "Plan No",
        sortable: true,
        sticky: true,
        render: (row) => (
          <button
            type="button"
            className="text-[#1b365d] font-medium hover:underline text-left"
            onClick={() => router.push(`/b2b-sales-planning/${row.id}`)}
          >
            {row.plan_no}
          </button>
        ),
      },
      {
        field: "client",
        label: "Client",
        render: (row) => row.client?.client_name || "—",
      },
      {
        field: "status",
        label: "Status",
        sortable: true,
        render: (row) => renderPlanStatusBadge(row.status),
      },
      {
        field: "plan_date",
        label: "Plan Date",
        sortable: true,
        render: (row) => formatDate(row.plan_date),
      },
      {
        field: "assigned",
        label: "Assigned To",
        render: (row) => row.assignedToUser?.name || "—",
      },
      {
        field: "active_pipeline",
        label: "Active Pipeline",
        render: (row) =>
          row.active_sales_order_id && row.active_pipeline_reference ? (
            <button
              type="button"
              className="text-[#00823b] hover:underline font-medium"
              onClick={(e) => {
                e.stopPropagation();
                openOrderSidebar({
                  id: row.active_sales_order_id,
                  order_no: row.active_pipeline_reference,
                });
              }}
            >
              {row.active_pipeline_reference}
            </button>
          ) : (
            "—"
          ),
      },
      {
        field: "pipeline_age",
        label: "Pipeline Age",
        render: (row) =>
          row.pipeline_age_days != null ? `${row.pipeline_age_days}d` : "—",
      },
      {
        field: "actions",
        label: "",
        stickyRight: true,
        render: (row) => (
          <div className="flex items-center gap-0.5 justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="View"
              onClick={() => router.push(`/b2b-sales-planning/${row.id}`)}
            >
              <IconEye size={16} />
            </Button>
            {currentPerm.can_update && BREAKABLE_STATUSES.has(row.status) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Break planning cycle"
                onClick={(e) => {
                  e.stopPropagation();
                  setBreakRemarks("");
                  setBreakTarget(row);
                }}
              >
                <IconPlayerStop size={16} />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [router, openOrderSidebar, currentPerm.can_update]
  );

  const handleQuickStatus = (tab) => {
    setAppliedFilters((prev) => applyQuickStatus(prev, tab));
    setPage(1);
  };

  const handleDateFieldChange = (value) => {
    setAppliedFilters((prev) => ({
      ...prev,
      date_filter_field: value || "plan_date",
    }));
    setActivePreset(null);
  };

  const handleDatePreset = (preset) => {
    setAppliedFilters((prev) => applyDatePreset(prev, preset));
    setActivePreset(preset.label);
    setPage(1);
  };

  const handleReset = () => {
    setAppliedFilters({ ...EMPTY_SALES_PLANNING_FILTERS });
    setActivePreset(null);
    setPage(1);
  };

  const handleApplyFilters = (next) => {
    setAppliedFilters(next);
    setPage(1);
  };

  const handleClearFilters = () => {
    setAppliedFilters({ ...EMPTY_SALES_PLANNING_FILTERS });
    setActivePreset(null);
    setPage(1);
  };

  const handleBreakConfirm = async () => {
    if (!breakTarget?.id) return;
    setBreaking(true);
    try {
      await b2bSalesPlanningService.breakB2bSalesPlan(breakTarget.id, {
        remarks: breakRemarks.trim() || null,
      });
      toast.success(`Plan ${breakTarget.plan_no} broken — new plan can be created for this client`);
      setBreakTarget(null);
      setBreakRemarks("");
      setTableKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to break plan");
    } finally {
      setBreaking(false);
    }
  };

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="B2B Sales Planning"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/b2b-sales-planning/dashboard")}
            >
              Dashboard
            </Button>
            {currentPerm.can_create && (
              <Button size="sm" onClick={() => router.push("/b2b-sales-planning/add")}>
                <IconPlus size={16} className="mr-1" />
                Add Plan
              </Button>
            )}
          </div>
        }
      >
        <SalesPlanningQuickToolbar
          filters={appliedFilters}
          activePreset={activePreset}
          onStatusChange={handleQuickStatus}
          onDateFieldChange={handleDateFieldChange}
          onPresetChange={handleDatePreset}
          onReset={handleReset}
        />

        <SalesPlanningFilterPanel
          open={filtersOpen}
          onToggle={setFiltersOpen}
          values={appliedFilters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />

        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          filterParams={apiParams}
          showSearch={false}
          showPagination={false}
          height="calc(100vh - 220px)"
          onTotalChange={setTotalCount}
          page={page}
          limit={limit}
          sortBy={sortBy || "plan_date"}
          sortOrder={sortOrder || "ASC"}
          onPageChange={(zeroBased) => setPage(zeroBased + 1)}
          onRowsPerPageChange={setLimit}
          onSortChange={(col, dir) => setSort(col, dir)}
          moduleKey="b2b-sales-planning"
        />
        <PaginationControls
          page={page - 1}
          rowsPerPage={limit}
          totalCount={totalCount}
          onPageChange={(zeroBased) => setPage(zeroBased + 1)}
          onRowsPerPageChange={setLimit}
          rowsPerPageOptions={[20, 50, 100]}
        />
      </ListingPageContainer>
      {sidebar}

      <AlertDialog
        open={!!breakTarget}
        onOpenChange={(open) => {
          if (!open && !breaking) {
            setBreakTarget(null);
            setBreakRemarks("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Break planning cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              This stops the cycle for{" "}
              <strong>{breakTarget?.plan_no}</strong>
              {breakTarget?.client?.client_name
                ? ` (${breakTarget.client.client_name})`
                : ""}
              . No auto next plan will be generated. Linked sales orders are not
              cancelled. You can create a new plan for this client afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-1">
            <Textarea
              label="Remarks (optional)"
              value={breakRemarks}
              onChange={(e) => setBreakRemarks(e.target.value)}
              rows={2}
              placeholder="Reason for breaking the cycle"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={breaking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="sm"
              loading={breaking}
              onClick={handleBreakConfirm}
            >
              Break cycle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}
