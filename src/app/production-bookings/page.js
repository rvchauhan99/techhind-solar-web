"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import productionBookingService from "@/services/productionBookingService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import ProductionBookingFilterPanel from "@/components/common/ProductionBookingFilterPanel";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { IconEye, IconX } from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate } from "@/utils/dataTableUtils";
import { getApiErrorMessage } from "@/utils/toast";
import { AP } from "@/utils/assemblyProductionLabels";
import { cn } from "@/lib/utils";
import {
    PRODUCTION_BOOKING_FILTER_KEYS,
    PRODUCTION_BOOKING_STATUS_SUMMARY_CHIPS,
    getStatusVariant,
} from "./components/productionBookingUi";

const pickParam = (value) =>
    value != null && String(value).trim() !== "" ? value : undefined;

const buildListQuery = (p = {}) => ({
    page: p.page,
    limit: p.limit,
    sortBy: p.sortBy || "id",
    sortOrder: p.sortOrder || "DESC",
    q: pickParam(p.q),
    booking_no: pickParam(p.booking_no),
    order_no: pickParam(p.order_no),
    warehouse_id: pickParam(p.warehouse_id),
    fg_product_id: pickParam(p.fg_product_id),
    status: pickParam(p.status),
    booking_date_from: pickParam(p.booking_date_from),
    booking_date_to: pickParam(p.booking_date_to),
    production_order_id: pickParam(p.production_order_id),
    include_summary: "true",
});

const money = (value) => Number(value || 0).toFixed(2);

export default function ProductionBookingsPage() {
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
        setSort,
        clearFilters,
    } = useListingQueryState({ defaultLimit: 20, filterKeys: PRODUCTION_BOOKING_FILTER_KEYS });

    const [tableKey, setTableKey] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [summary, setSummary] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [loadingRecord, setLoadingRecord] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [cancelReason, setCancelReason] = useState("");
    const [actionSubmitting, setActionSubmitting] = useState(false);

    const filterParams = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
            ),
        [filters]
    );

    const quickSearch = filters.q || q || "";

    const handleStatusChipClick = useCallback(
        (status) => {
            const next = filters.status === status ? "" : status;
            setFilters({ ...filters, status: next });
        },
        [filters, setFilters]
    );

    const handleOpenSidebar = useCallback(async (id) => {
        setLoadingRecord(true);
        setSidebarOpen(true);
        try {
            const response = await productionBookingService.getProductionBookingById(id);
            setSelectedBooking(response?.result || response);
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to load production booking"));
            setSidebarOpen(false);
        } finally {
            setLoadingRecord(false);
        }
    }, []);

    const handleCloseSidebar = useCallback(() => {
        setSidebarOpen(false);
        setSelectedBooking(null);
    }, []);

    const handleExport = useCallback(async () => {
        setExporting(true);
        try {
            const blob = await productionBookingService.exportProductionBookings(buildListQuery(filterParams));
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `production-bookings-${new Date().toISOString().split("T")[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Export completed");
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to export production bookings"));
        } finally {
            setExporting(false);
        }
    }, [filterParams]);

    const handleActionConfirm = async () => {
        if (!pendingAction) return;
        const { row } = pendingAction;

        if (!cancelReason.trim()) {
            toast.error("A cancellation reason is required");
            return;
        }

        setActionSubmitting(true);
        try {
            await productionBookingService.cancelProductionBooking(row.id, cancelReason.trim());
            toast.success(`Booking ${row.booking_no} cancelled and all stock movements reversed`);
            setTableKey((prev) => prev + 1);
            setPendingAction(null);
            setCancelReason("");
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Action failed"));
        } finally {
            setActionSubmitting(false);
        }
    };

    const columns = useMemo(
        () => [
            {
                field: "booking_no",
                label: "Booking No",
                sortable: true,
            },
            {
                field: "booking_date",
                label: "Date",
                sortable: true,
                render: (row) => (row.booking_date ? formatDate(row.booking_date) : "-"),
            },
            {
                field: "order_no",
                label: AP.orders.singular,
                sortable: false,
                render: (row) => row.productionOrder?.order_no || "-",
            },
            {
                field: "warehouse",
                label: "Warehouse",
                sortable: false,
                render: (row) => row.warehouse?.name || "-",
            },
            {
                field: "fg_product",
                label: AP.fg.replace(" (FG)", ""),
                sortable: false,
                render: (row) => row.fgProduct?.product_name || "-",
            },
            { field: "good_quantity", label: "Good", sortable: true },
            {
                field: "rejected_quantity",
                label: "Rejected",
                sortable: true,
                render: (row) =>
                    row.rejected_quantity > 0 ? (
                        <span className="font-semibold text-destructive">{row.rejected_quantity}</span>
                    ) : (
                        0
                    ),
            },
            {
                field: "fg_unit_cost",
                label: "Unit Cost",
                sortable: true,
                render: (row) => money(row.fg_unit_cost),
            },
            {
                field: "total_material_cost",
                label: "Material",
                sortable: true,
                render: (row) => money(row.total_material_cost),
            },
            {
                field: "total_operation_cost",
                label: "Operations",
                sortable: true,
                render: (row) => money(row.total_operation_cost),
            },
            {
                field: "total_cost",
                label: "Total Cost",
                sortable: true,
                render: (row) => <span className="font-semibold">{money(row.total_cost)}</span>,
            },
            {
                field: "status",
                label: "Status",
                sortable: true,
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
                render: (row, reload, perms) => (
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
                        {row.status === "POSTED" && perms?.can_update && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                onClick={() => {
                                    setCancelReason("");
                                    setPendingAction({ type: "cancel", row });
                                }}
                                title="Cancel and reverse"
                                aria-label="Cancel and reverse"
                            >
                                <IconX className="size-4" />
                            </Button>
                        )}
                    </div>
                ),
            },
        ],
        [handleOpenSidebar]
    );

    const fetcher = useMemo(
        () => async (params) => {
            const response = await productionBookingService.getProductionBookings(buildListQuery(params));
            const result = response?.result || response;
            setSummary(result?.meta?.summary || null);
            return {
                data: result?.data || [],
                meta: result?.meta || { total: 0, page: params.page, pages: 0, limit: params.limit },
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
        if (!selectedBooking) return null;
        const booking = selectedBooking;
        return (
            <div className="space-y-2 pr-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{booking.booking_no}</p>
                    <Badge
                        variant={getStatusVariant(booking.status)}
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    >
                        {booking.status}
                    </Badge>
                </div>
                <hr className="border-border" />
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div>
                        <span className="block font-semibold text-muted-foreground">{AP.orders.singular}</span>
                        {booking.productionOrder?.order_no || "-"}
                    </div>
                    <div>
                        <span className="block font-semibold text-muted-foreground">Booking Date</span>
                        {booking.booking_date ? formatDate(booking.booking_date) : "-"}
                    </div>
                    <div>
                        <span className="block font-semibold text-muted-foreground">Warehouse</span>
                        {booking.warehouse?.name || "-"}
                    </div>
                    <div>
                        <span className="block font-semibold text-muted-foreground">Finished Good</span>
                        {booking.fgProduct?.product_name || "-"}
                    </div>
                    {booking.rejectionWarehouse && (
                        <div>
                            <span className="block font-semibold text-muted-foreground">Rejection Warehouse</span>
                            {booking.rejectionWarehouse.name}
                        </div>
                    )}
                    {booking.posted_at && (
                        <div>
                            <span className="block font-semibold text-muted-foreground">Posted</span>
                            {formatDate(booking.posted_at)} by {booking.postedBy?.name || "-"}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-1.5 rounded-md border border-border bg-muted/50 p-2 text-center text-xs">
                    <div>
                        <span className="block text-muted-foreground">Good</span>
                        <span className="font-semibold text-green-700">{booking.good_quantity}</span>
                    </div>
                    <div>
                        <span className="block text-muted-foreground">Rejected</span>
                        <span className="font-semibold text-destructive">{booking.rejected_quantity}</span>
                    </div>
                    <div>
                        <span className="block text-muted-foreground">FG Unit Cost</span>
                        <span className="font-semibold">{money(booking.fg_unit_cost)}</span>
                    </div>
                </div>

                {booking.rejection_reason && (
                    <p className="text-xs text-muted-foreground">
                        Rejection reason: {booking.rejection_reason}
                    </p>
                )}
                {booking.remarks && <p className="text-xs text-muted-foreground">Remarks: {booking.remarks}</p>}
                {booking.cancel_reason && (
                    <p className="text-xs text-muted-foreground">Cancel reason: {booking.cancel_reason}</p>
                )}

                {booking.components?.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                            Components Consumed ({booking.components.length})
                        </p>
                        <div className="mt-1 overflow-hidden rounded-md border border-border">
                            <table className="w-full text-xs">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-2 py-1 text-left font-semibold">Product</th>
                                        <th className="px-2 py-1 text-right font-semibold">Std</th>
                                        <th className="px-2 py-1 text-right font-semibold">Used</th>
                                        <th className="px-2 py-1 text-right font-semibold">Scrap</th>
                                        <th className="px-2 py-1 text-right font-semibold">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {booking.components.map((line) => {
                                        const originalId = Number(
                                            line.original_component_product_id ?? line.component_product_id
                                        );
                                        const isSubstituted =
                                            Number(line.component_product_id) !== originalId &&
                                            Number.isFinite(originalId);
                                        return (
                                        <tr key={line.id} className="border-t border-border">
                                            <td className="px-2 py-1">
                                                <div className="flex flex-wrap items-center gap-1">
                                                    <span>{line.product?.product_name || "-"}</span>
                                                    {isSubstituted ? (
                                                        <span className="inline-flex items-center rounded px-1 py-0 text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                                            Substituted
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {line.serials?.length > 0 && (
                                                    <span className="ml-1 text-muted-foreground">
                                                        ({line.serials.length} serial)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-2 py-1 text-right">{Number(line.standard_quantity)}</td>
                                            <td className="px-2 py-1 text-right">{line.consumed_quantity}</td>
                                            <td className="px-2 py-1 text-right">{line.scrap_quantity}</td>
                                            <td className="px-2 py-1 text-right">{money(line.amount)}</td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {booking.fgSerials?.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                            Finished Good Serials ({booking.fgSerials.length})
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {booking.fgSerials.map((serial) => (
                                <Badge
                                    key={serial.id}
                                    variant={serial.outcome === "REJECTED" ? "destructive" : "secondary"}
                                    className="px-2 py-0 text-[11px]"
                                >
                                    {serial.serial_number}
                                    {serial.stockSerial?.status ? ` · ${serial.stockSerial.status}` : ""}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-2 space-y-1 rounded-md border border-border bg-muted/50 p-2 text-xs">
                    <div className="flex justify-between">
                        <span>Material Cost</span>
                        <span>{money(booking.total_material_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Operation Cost</span>
                        <span>{money(booking.total_operation_cost)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                        <span>Total Cost</span>
                        <span>{money(booking.total_cost)}</span>
                    </div>
                </div>
            </div>
        );
    }, [loadingRecord, selectedBooking]);

    return (
        <ProtectedRoute>
            <ListingPageContainer
                title={AP.history.title}
                addButtonLabel={currentPerm.can_create ? AP.book.menu : undefined}
                onAddClick={currentPerm.can_create ? () => router.push("/production-bookings/new") : undefined}
                exportButtonLabel="Export"
                onExportClick={handleExport}
                exportDisabled={exporting}
                fullWidth
            >
                <ProductionBookingFilterPanel
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
                            {PRODUCTION_BOOKING_STATUS_SUMMARY_CHIPS.map((chip) => {
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
                    moduleKey="production-bookings-history"
                    height="calc(100vh - 280px)"
                    showSearch={false}
                    showPagination={false}
                    compactDensity
                    onTotalChange={setTotalCount}
                    filterParams={filterParams}
                    onRowClick={(row) => handleOpenSidebar(row.id)}
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

            <DetailsSidebar
                open={sidebarOpen}
                onClose={handleCloseSidebar}
                title={AP.book.details}
            >
                {sidebarContent}
            </DetailsSidebar>

            <AlertDialog
                open={!!pendingAction}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingAction(null);
                        setCancelReason("");
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{AP.book.cancelDialog}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cancelling posts mirror ledger entries: components return to stock, the finished good is removed, and component serials become available again. This is refused once a finished-good serial has moved downstream.
                            {pendingAction && (
                                <span className="mt-2 block text-muted-foreground">
                                    Booking: {pendingAction.row.booking_no} · good{" "}
                                    {pendingAction.row.good_quantity}, rejected{" "}
                                    {pendingAction.row.rejected_quantity} · total cost{" "}
                                    {money(pendingAction.row.total_cost)}
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <ShadInput
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Cancellation reason (required)"
                        aria-label="Cancellation reason"
                        disabled={actionSubmitting}
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionSubmitting}>Close</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleActionConfirm}
                            disabled={actionSubmitting}
                            loading={actionSubmitting}
                        >
                            Cancel Booking
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ProtectedRoute>
    );
}
