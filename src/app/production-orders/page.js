"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import productionOrderService from "@/services/productionOrderService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input as ShadInput } from "@/components/ui/input";
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

const COLUMN_FILTER_KEYS = [
    "order_no",
    "order_no_op",
    "warehouse_name",
    "warehouse_name_op",
    "fg_product_name",
    "fg_product_name_op",
    "status",
    "priority",
    "planned_start_date_from",
    "planned_start_date_to",
    "planned_start_date_op",
];

const STATUS_OPTIONS = [
    { value: "DRAFT", label: "Draft" },
    { value: "APPROVED", label: "Approved" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "SHORT_CLOSED", label: "Short Closed" },
    { value: "CANCELLED", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
    { value: "LOW", label: "Low" },
    { value: "NORMAL", label: "Normal" },
    { value: "HIGH", label: "High" },
    { value: "URGENT", label: "Urgent" },
];

const getStatusVariant = (status) => {
    switch (status) {
        case "COMPLETED":
            return "default";
        case "IN_PROGRESS":
        case "APPROVED":
            return "secondary";
        case "CANCELLED":
            return "destructive";
        default:
            return "outline";
    }
};

const getPriorityVariant = (priority) =>
    priority === "URGENT" || priority === "HIGH" ? "destructive" : "outline";

export default function ProductionOrdersPage() {
    const { modulePermissions, currentModuleId } = useAuth();
    const router = useRouter();
    const currentPerm = modulePermissions?.[currentModuleId] || {
        can_create: false,
        can_read: false,
        can_update: false,
        can_delete: false,
    };

    const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } =
        useListingQueryState({ defaultLimit: 20, filterKeys: COLUMN_FILTER_KEYS });

    const [tableKey, setTableKey] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [shortage, setShortage] = useState(null);
    const [loadingRecord, setLoadingRecord] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [actionReason, setActionReason] = useState("");
    const [actionSubmitting, setActionSubmitting] = useState(false);

    const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
    const handleColumnFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);

    const filterParams = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
            ),
        [filters]
    );

    const handleOpenSidebar = useCallback(async (id) => {
        setLoadingRecord(true);
        setSidebarOpen(true);
        setShortage(null);
        try {
            const [orderRes, shortageRes] = await Promise.all([
                productionOrderService.getProductionOrderById(id),
                productionOrderService.getProductionOrderShortage(id).catch(() => null),
            ]);
            setSelectedOrder(orderRes?.result || orderRes);
            if (shortageRes) setShortage(shortageRes?.result || shortageRes);
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to load production order"));
            setSidebarOpen(false);
        } finally {
            setLoadingRecord(false);
        }
    }, []);

    const handleCloseSidebar = useCallback(() => {
        setSidebarOpen(false);
        setSelectedOrder(null);
        setShortage(null);
    }, []);

    const handleExport = useCallback(async () => {
        setExporting(true);
        try {
            const blob = await productionOrderService.exportProductionOrders(filterParams);
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
            toast.error(getApiErrorMessage(error, "Failed to export production orders"));
        } finally {
            setExporting(false);
        }
    }, [filterParams]);

    const openAction = (type, row) => {
        setActionReason("");
        setPendingAction({ type, row });
    };

    const handleActionConfirm = async () => {
        if (!pendingAction) return;
        const { type, row } = pendingAction;
        const reason = actionReason.trim();

        if ((type === "cancel" || type === "shortClose") && !reason) {
            toast.error("A reason is required");
            return;
        }

        setActionSubmitting(true);
        try {
            if (type === "approve") {
                await productionOrderService.approveProductionOrder(row.id);
                toast.success(`Order ${row.order_no} approved. Component requirement is now frozen.`);
            } else if (type === "cancel") {
                await productionOrderService.cancelProductionOrder(row.id, reason);
                toast.success(`Order ${row.order_no} cancelled`);
            } else if (type === "shortClose") {
                await productionOrderService.shortCloseProductionOrder(row.id, reason);
                toast.success(`Order ${row.order_no} short closed`);
            }
            setTableKey((prev) => prev + 1);
            setPendingAction(null);
            setActionReason("");
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Action failed"));
        } finally {
            setActionSubmitting(false);
        }
    };

    const columns = useMemo(
        () => [
            {
                field: "order_no",
                label: "Order No",
                sortable: true,
                filterType: "text",
                filterKey: "order_no",
                defaultFilterOperator: "contains",
            },
            {
                field: "warehouse",
                label: "Warehouse",
                sortable: false,
                filterType: "text",
                filterKey: "warehouse_name",
                defaultFilterOperator: "contains",
                render: (row) => row.warehouse?.name || "-",
            },
            {
                field: "fg_product",
                label: "Finished Good",
                sortable: false,
                filterType: "text",
                filterKey: "fg_product_name",
                defaultFilterOperator: "contains",
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
                filterOptions: PRIORITY_OPTIONS,
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
                filterOptions: STATUS_OPTIONS,
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
                                onClick={() => handleOpenSidebar(row.id)}
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
                                    onClick={() => openAction("approve", row)}
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
                                    onClick={() => router.push(`/production-bookings/new?production_order_id=${row.id}`)}
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
                                    onClick={() => openAction("shortClose", row)}
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
                                    onClick={() => openAction("cancel", row)}
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
        [handleOpenSidebar, router]
    );

    const fetcher = useMemo(
        () => async (params) => {
            const p = params || {};
            const response = await productionOrderService.getProductionOrders({
                page: p.page,
                limit: p.limit,
                sortBy: p.sortBy || "id",
                sortOrder: p.sortOrder || "DESC",
                order_no: p.order_no || undefined,
                warehouse_name: p.warehouse_name || undefined,
                fg_product_name: p.fg_product_name || undefined,
                status: p.status || undefined,
                priority: p.priority || undefined,
                planned_start_date_from: p.planned_start_date_from || undefined,
                planned_start_date_to: p.planned_start_date_to || undefined,
            });
            const result = response?.result || response;
            return {
                data: result?.data || [],
                meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
            };
        },
        [tableKey]
    );

    const sidebarContent = useMemo(() => {
        if (loadingRecord) {
            return (
                <div className="flex min-h-[200px] items-center justify-center">
                    <span className="text-muted-foreground">Loading...</span>
                </div>
            );
        }
        if (!selectedOrder) return null;
        const order = selectedOrder;
        return (
            <div className="space-y-2 pr-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{order.order_no}</p>
                    <Badge
                        variant={getStatusVariant(order.status)}
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    >
                        {order.status}
                    </Badge>
                    <Badge variant={getPriorityVariant(order.priority)} className="px-2 py-0 text-xs">
                        {order.priority}
                    </Badge>
                </div>
                <hr className="border-border" />
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div>
                        <span className="block font-semibold text-muted-foreground">Warehouse</span>
                        {order.warehouse?.name || "-"}
                    </div>
                    <div>
                        <span className="block font-semibold text-muted-foreground">Finished Good</span>
                        {order.fgProduct?.product_name || "-"}
                    </div>
                    <div>
                        <span className="block font-semibold text-muted-foreground">BOM</span>
                        {order.productionBom
                            ? `${order.productionBom.bom_code || `#${order.productionBom.id}`} v${order.bom_version_no}`
                            : "-"}
                    </div>
                    <div>
                        <span className="block font-semibold text-muted-foreground">Planned Dates</span>
                        {order.planned_start_date ? formatDate(order.planned_start_date) : "-"} —{" "}
                        {order.planned_end_date ? formatDate(order.planned_end_date) : "-"}
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 rounded-md border border-border bg-muted/50 p-2 text-center text-xs">
                    <div>
                        <span className="block text-muted-foreground">Planned</span>
                        <span className="font-semibold">{order.planned_quantity}</span>
                    </div>
                    <div>
                        <span className="block text-muted-foreground">Produced</span>
                        <span className="font-semibold text-green-700">{order.produced_quantity}</span>
                    </div>
                    <div>
                        <span className="block text-muted-foreground">Rejected</span>
                        <span className="font-semibold text-destructive">{order.rejected_quantity}</span>
                    </div>
                    <div>
                        <span className="block text-muted-foreground">Pending</span>
                        <span className="font-semibold">{order.pending_quantity}</span>
                    </div>
                </div>

                {order.remarks && <p className="text-xs text-muted-foreground">Remarks: {order.remarks}</p>}
                {order.close_reason && (
                    <p className="text-xs text-muted-foreground">Close reason: {order.close_reason}</p>
                )}

                {shortage?.components?.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                            Component Requirement ({shortage.components.length})
                            {shortage.has_shortage && (
                                <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-[10px]">
                                    Shortage
                                </Badge>
                            )}
                        </p>
                        <div className="mt-1 overflow-hidden rounded-md border border-border">
                            <table className="w-full text-xs">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-2 py-1 text-left font-semibold">Product</th>
                                        <th className="px-2 py-1 text-right font-semibold">Req</th>
                                        <th className="px-2 py-1 text-right font-semibold">Issued</th>
                                        <th className="px-2 py-1 text-right font-semibold">On Hand</th>
                                        <th className="px-2 py-1 text-right font-semibold">Short</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shortage.components.map((line) => (
                                        <tr
                                            key={line.production_order_component_id}
                                            className="border-t border-border"
                                        >
                                            <td className="px-2 py-1">
                                                {line.product_name || "-"}
                                                {line.serial_required && (
                                                    <span className="ml-1 text-muted-foreground">(serial)</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-1 text-right">{line.required_quantity}</td>
                                            <td className="px-2 py-1 text-right">{line.issued_quantity}</td>
                                            <td className="px-2 py-1 text-right">{line.quantity_on_hand}</td>
                                            <td className="px-2 py-1 text-right">
                                                {line.shortage_quantity > 0 ? (
                                                    <span className="font-semibold text-destructive">
                                                        {line.shortage_quantity}
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    }, [loadingRecord, selectedOrder, shortage]);

    const actionCopy = {
        approve: {
            title: "Approve Production Order",
            description:
                "Approving freezes the BOM snapshot and required quantities on this order, and opens it for production bookings.",
            action: "Approve",
            needsReason: false,
        },
        cancel: {
            title: "Cancel Production Order",
            description:
                "Cancellation is only possible while no booking has been posted. Posted orders must be short closed instead.",
            action: "Cancel Order",
            needsReason: true,
        },
        shortClose: {
            title: "Short Close Production Order",
            description:
                "Short closing keeps posted bookings intact and stops further production against the remaining quantity.",
            action: "Short Close",
            needsReason: true,
        },
    };
    const copy = pendingAction ? actionCopy[pendingAction.type] : null;

    return (
        <ProtectedRoute>
            <ListingPageContainer
                title="Production Orders"
                addButtonLabel={currentPerm.can_create ? "Create Order" : undefined}
                onAddClick={currentPerm.can_create ? () => router.push("/production-orders/new") : undefined}
                exportButtonLabel="Export"
                onExportClick={handleExport}
                exportDisabled={exporting}
            >
                <PaginatedTable
                    key={tableKey}
                    columns={columns}
                    fetcher={fetcher}
                    moduleKey="production-orders"
                    height="calc(100vh - 200px)"
                    showSearch={false}
                    showPagination={false}
                    compactDensity
                    onTotalChange={setTotalCount}
                    columnFilterValues={columnFilterValues}
                    onColumnFilterChange={handleColumnFilterChange}
                    filterParams={{ q: undefined, ...filterParams }}
                    onRowClick={(row) => handleOpenSidebar(row.id)}
                    page={page}
                    limit={limit}
                    q={q}
                    sortBy={sortBy || "id"}
                    sortOrder={sortOrder || "DESC"}
                    onPageChange={(zeroBased) => setPage(zeroBased + 1)}
                    onRowsPerPageChange={setLimit}
                    onQChange={setQ}
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

            <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Production Order Details">
                {sidebarContent}
            </DetailsSidebar>

            <AlertDialog
                open={!!pendingAction}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingAction(null);
                        setActionReason("");
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {copy?.description}
                            {pendingAction && (
                                <span className="mt-2 block text-muted-foreground">
                                    Order: {pendingAction.row.order_no} ·{" "}
                                    {pendingAction.row.fgProduct?.product_name || ""} · planned{" "}
                                    {pendingAction.row.planned_quantity}
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {copy?.needsReason && (
                        <ShadInput
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            placeholder="Reason (required)"
                            aria-label="Reason"
                            disabled={actionSubmitting}
                        />
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleActionConfirm}
                            disabled={actionSubmitting}
                            loading={actionSubmitting}
                        >
                            {copy?.action}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ProtectedRoute>
    );
}
