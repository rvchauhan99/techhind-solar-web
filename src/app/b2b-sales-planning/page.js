"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconEye, IconPlus } from "@tabler/icons-react";
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
};

const STATUS_LABEL = {
  DUE_TODAY: "Due Today",
  UPCOMING: "Upcoming",
  OVERDUE: "Overdue",
  PIPELINE: "Pipeline",
  PIPELINE_OVERDUE: "Pipeline Overdue",
  COMPLETED: "Completed",
};

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
  }, []);

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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => router.push(`/b2b-sales-planning/${row.id}`)}
          >
            <IconEye size={16} />
          </Button>
        ),
      },
    ],
    [router, openOrderSidebar]
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
    setActivePreset(null);
    setPage(1);
  };

  const handleClearFilters = () => {
    setAppliedFilters({ ...EMPTY_SALES_PLANNING_FILTERS });
    setActivePreset(null);
    setPage(1);
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
    </ProtectedRoute>
  );
}
