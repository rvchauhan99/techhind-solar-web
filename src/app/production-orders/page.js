"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import productionOrderService from "@/services/productionOrderService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import ProductionOrderFilterPanel from "@/components/common/ProductionOrderFilterPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    IconCircleCheck,
    IconEye,
    IconPencil,
    IconPlayerStop,
    IconTool,
    IconX,
} from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate } from "@/utils/dataTableUtils";
import { getApiErrorMessage } from "@/utils/toast";
import { AP } from "@/utils/assemblyProductionLabels";
import { cn } from "@/lib/utils";
import useProductionOrderActions from "./components/useProductionOrderActions";
import ProductionOrderActionDialog from "./components/ProductionOrderActionDialog";
import {
    PRODUCTION_ORDER_FILTER_KEYS,
    PRODUCTION_ORDER_STATUS_OPTIONS,
    PRODUCTION_ORDER_PRIORITY_OPTIONS,
    PRODUCTION_ORDER_STATUS_SUMMARY_CHIPS,
    getStatusVariant,
    getPriorityVariant,
} from "./components/productionOrderUi";

const pickParam = (value) =>
    value != null && String(value).trim() !== "" ? value : undefined;

const buildListQuery = (p = {}) => ({
    page: p.page,
    limit: p.limit,
    sortBy: p.sortBy || "id",
    sortOrder: p.sortOrder || "DESC",
    q: pickParam(p.q),
    order_no: pickParam(p.order_no),
    warehouse_id: pickParam(p.warehouse_id),
    fg_product_id: pickParam(p.fg_product_id),
    status: pickParam(p.status),
    priority: pickParam(p.priority),
    planned_start_date_from: pickParam(p.planned_start_date_from),
    planned_start_date_to: pickParam(p.planned_start_date_to),
    planned_end_date_from: pickParam(p.planned_end_date_from),
    planned_end_date_to: pickParam(p.planned_end_date_to),
    created_at_from: pickParam(p.created_at_from),
    created_at_to: pickParam(p.created_at_to),
    open_only: pickParam(p.open_only),
    include_summary: "true",
});

export default function ProductionOrdersPage() {
    const { modulePermissions, currentModuleId } = useAuth();
    const router = useRouter();
    const currentPerm = modulePermissions?.[currentModuleId] || {
        can_create: false,
        can_read: false,
        can_update: false,
        can_delete: false,
    };

    const {
        page,
        limit,
        q,
        sortBy,
        sortOrder,
        filters,
        setPage,
        setLimit,
        setFilters,
        setFilter,
        setSort,
        clearFilters,
    } = useListingQueryState({ defaultLimit: 20, filterKeys: PRODUCTION_ORDER_FILTER_KEYS });

    const [tableKey, setTableKey] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [summary, setSummary] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);

    const actions = useProductionOrderActions({
        onSuccess: async () => {
            setTableKey((prev) => prev + 1);
        },
    });

    const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
    const handleColumnFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);

    const filterParams = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
            ),
        [filters]
    );

    const quickSearch = filters.q || q || "";

    const handleExport = useCallback(async () => {
        setExporting(true);
        try {
            const blob = await productionOrderService.exportProductionOrders(buildListQuery(filterParams));
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `production-orders-${new Date().toISOString().split("T")[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Export completed");
        } catch (error) {
            toast.error(getApiErrorMessage(error, `Failed to export ${AP.orders.title.toLowerCase()}`));
        } finally {
            setExporting(false);
        }
    }, [filterParams]);

    const handleStatusChipClick = useCallback(
        (status) => {
            const next = filters.status === status ? "" : status;
            setFilters({ ...filters, status: next, open_only: "" });
        },
        [filters, setFilters]
    );

    const handleOpenChipClick = useCallback(() => {
        const next = filters.open_only === "true" ? "" : "true";
        setFilters({ ...filters, open_only: next, status: "" });
    }, [filters, setFilters]);

    const columns = useMemo(
        () => [
            {
                field: "order_no",
                label: AP.orders.orderNo,
                sortable: true,
                filterType: "text",
                filterKey: "order_no",
                defaultFilterOperator: "contains",
                render: (row) => (
                    <button
                        type="button"
                        className="text-left font-medium text-[#00823b] hover:underline"
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/production-orders/${row.id}`);
                        }}
                    >
                        {row.order_no}
                    </button>
                ),
            },
            {
                field: "warehouse",
                label: "Warehouse",
                sortable: false,
                render: (row) => row.warehouse?.name || "-",
            },
            {
                field: "fg_product",
                label: "Finished Good",
                sortable: false,
                render: (row) => row.fgProduct?.product_name || "-",
            },
            {
                field: "bom",
                label: "BOM",
                sortable: false,
                render: (row) =>
                    row.productionBom
                        ? `${row.productionBom.bom_code || `#${row.productionBom.id}`} v${row.bom_version_no ?? row.productionBom.version_no}`
                        : "-",
            },
            { field: "planned_quantity", label: "Planned", sortable: true },
            { field: "produced_quantity", label: "Produced", sortable: true },
            { field: "rejected_quantity", label: "Rejected", sortable: true },
            {
                field: "pending_quantity",
                label: "Pending",
                sortable: false,
                render: (row) => (
                    <span className={row.pending_quantity > 0 ? "font-semibold" : undefined}>
                        {row.pending_quantity ?? 0}
                    </span>
                ),
            },
            {
                field: "completion_percent",
                label: "Done %",
                sortable: false,
                render: (row) => `${Number(row.completion_percent || 0).toFixed(0)}%`,
            },
            {
                field: "priority",
                label: "Priority",
                sortable: true,
                filterType: "select",
                filterKey: "priority",
                filterOptions: PRODUCTION_ORDER_PRIORITY_OPTIONS,
                render: (row) => (
                    <Badge variant={getPriorityVariant(row.priority)} className="px-2 py-0 text-xs">
                        {row.priority}
                    </Badge>
                ),
            },
            {
                field: "planned_start_date",
                label: "Planned Start",
                sortable: true,
                filterType: "date",
                filterKey: "planned_start_date_from",
                filterKeyTo: "planned_start_date_to",
                operatorKey: "planned_start_date_op",
                defaultFilterOperator: "inRange",
                render: (row) => (row.planned_start_date ? formatDate(row.planned_start_date) : "-"),
            },
            {
                field: "status",
                label: "Status",
                sortable: true,
                filterType: "select",
                filterKey: "status",
                filterOptions: PRODUCTION_ORDER_STATUS_OPTIONS,
                render: (row) => (
                    <Badge
                        variant={getStatusVariant(row.status)}
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    >
                        {row.status || "-"}
                    </Badge>
                ),
            },
            {
                field: "actions",
                label: "Actions",
                sortable: false,
                isActionColumn: true,
                render: (row, reload, perms) => {
                    const isOpen = row.status === "APPROVED" || row.status === "IN_PROGRESS";
                    return (
                        <div className="flex gap-1">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                onClick={() => router.push(`/production-orders/${row.id}`)}
                                title="View"
                                aria-label="View"
                            >
                                <IconEye className="size-4" />
                            </Button>
                            {row.status === "DRAFT" && perms?.can_update && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-8"
                                    onClick={() => router.push(`/production-orders/edit?id=${row.id}`)}
                                    title="Edit"
                                    aria-label="Edit"
                                >
                                    <IconPencil className="size-4" />
                                </Button>
                            )}
                            {row.status === "DRAFT" && perms?.can_update && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-8"
                                    onClick={() => actions.openAction("approve", row)}
                                    title="Approve"
                                    aria-label="Approve"
                                >
                                    <IconCircleCheck className="size-4" />
                                </Button>
                            )}
                            {isOpen && perms?.can_create && (
                                <Button
                                    size="icon"
                                    variant="success"
                                    onClick={() =>
                                        router.push(`/production-bookings/new?production_order_id=${row.id}`)
                                    }
                                    title="Book production"
                                    aria-label="Book production"
                                >
                                    <IconTool className="size-4" />
                                </Button>
                            )}
                            {isOpen && perms?.can_update && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-8"
                                    onClick={() => actions.openAction("shortClose", row)}
                                    title="Short close"
                                    aria-label="Short close"
                                >
                                    <IconPlayerStop className="size-4" />
                                </Button>
                            )}
                            {(row.status === "DRAFT" || isOpen) && perms?.can_update && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-8"
                                    onClick={() => actions.openAction("cancel", row)}
                                    title="Cancel"
                                    aria-label="Cancel"
                                >
                                    <IconX className="size-4" />
                                </Button>
                            )}
                        </div>
                    );
                },
            },
        ],
        [actions, router]
    );

    const fetcher = useMemo(
        () => async (params) => {
            const response = await productionOrderService.getProductionOrders(buildListQuery(params));
            const result = response?.result || response;
            setSummary(result?.meta?.summary || null);
            return {
                data: result?.data || [],
                meta: result?.meta || { total: 0, page: params.page, pages: 0, limit: params.limit },
            };
        },
        [tableKey]
    );

    const openCount = Number(summary?.OPEN || 0);
    const openSelected = filters.open_only === "true";

    return (
        <ProtectedRoute>
            <ListingPageContainer
                title={AP.orders.title}
                addButtonLabel={currentPerm.can_create ? `Create ${AP.orders.singular}` : undefined}
                onAddClick={currentPerm.can_create ? () => router.push("/production-orders/new") : undefined}
                exportButtonLabel="Export"
                onExportClick={handleExport}
                exportDisabled={exporting}
                fullWidth
            >
                <ProductionOrderFilterPanel
                    open={filterPanelOpen}
                    onToggle={setFilterPanelOpen}
                    values={filters}
                    onApply={(v) => {
                        setFilters(v, true);
                        setFilterPanelOpen(false);
                    }}
                    onClear={() => clearFilters({ keepQuickSearch: false })}
                />

                {summary && (
                    <Card className="mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex min-w-0 flex-wrap items-center gap-1 px-2.5 py-1.5">
                            <span className="mr-1 text-[9px] font-bold uppercase tracking-tighter text-slate-400">
                                By status
                            </span>
                            <button
                                type="button"
                                className={cn(
                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter transition-colors",
                                    openSelected
                                        ? "border-green-600 bg-green-600 text-white shadow-sm"
                                        : "border-green-200 bg-green-50 text-green-800 hover:bg-green-100"
                                )}
                                onClick={handleOpenChipClick}
                            >
                                Open: {openCount}
                            </button>
                            {PRODUCTION_ORDER_STATUS_SUMMARY_CHIPS.map((chip) => {
                                const selected = String(filters.status || "") === chip.key;
                                return (
                                    <button
                                        key={chip.key}
                                        type="button"
                                        className={cn(
                                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter transition-colors",
                                            selected
                                                ? "border-green-600 bg-green-600 text-white shadow-sm"
                                                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-green-300 hover:bg-green-50"
                                        )}
                                        onClick={() => handleStatusChipClick(chip.key)}
                                    >
                                        {chip.label}: {Number(summary[chip.key] || 0)}
                                    </button>
                                );
                            })}
                        </div>
                    </Card>
                )}

                <PaginatedTable
                    key={tableKey}
                    columns={columns}
                    fetcher={fetcher}
                    moduleKey="production-orders"
                    height="calc(100vh - 280px)"
                    showSearch={false}
                    showPagination={false}
                    compactDensity
                    onTotalChange={setTotalCount}
                    columnFilterValues={columnFilterValues}
                    onColumnFilterChange={handleColumnFilterChange}
                    filterParams={filterParams}
                    onRowClick={(row) => router.push(`/production-orders/${row.id}`)}
                    page={page}
                    limit={limit}
                    q={quickSearch}
                    sortBy={sortBy || "id"}
                    sortOrder={sortOrder || "DESC"}
                    onPageChange={(zeroBased) => setPage(zeroBased + 1)}
                    onRowsPerPageChange={setLimit}
                    onSortChange={setSort}
                />
                <PaginationControls
                    page={page - 1}
                    rowsPerPage={limit}
                    totalCount={totalCount}
                    onPageChange={(zeroBased) => setPage(zeroBased + 1)}
                    onRowsPerPageChange={setLimit}
                    rowsPerPageOptions={[20, 50, 100, 200]}
                />
            </ListingPageContainer>

            <ProductionOrderActionDialog {...actions} />
        </ProtectedRoute>
    );
}
