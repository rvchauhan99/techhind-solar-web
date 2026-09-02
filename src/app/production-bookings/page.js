"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import productionBookingService from "@/services/productionBookingService";
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
import { IconCircleCheck, IconEye, IconPencil, IconX } from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate } from "@/utils/dataTableUtils";
import { getApiErrorMessage } from "@/utils/toast";

const COLUMN_FILTER_KEYS = [
    "booking_no",
    "booking_no_op",
    "order_no",
    "order_no_op",
    "warehouse_name",
    "warehouse_name_op",
    "fg_product_name",
    "fg_product_name_op",
    "status",
    "booking_date_from",
    "booking_date_to",
    "booking_date_op",
];

const STATUS_OPTIONS = [
    { value: "DRAFT", label: "Draft" },
    { value: "POSTED", label: "Posted" },
    { value: "CANCELLED", label: "Cancelled" },
];

const getStatusVariant = (status) => {
    if (status === "POSTED") return "default";
    if (status === "CANCELLED") return "destructive";
    return "outline";
};

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

    const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } =
        useListingQueryState({ defaultLimit: 20, filterKeys: COLUMN_FILTER_KEYS });

    const [tableKey, setTableKey] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [loadingRecord, setLoadingRecord] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [cancelReason, setCancelReason] = useState("");
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
            const blob = await productionBookingService.exportProductionBookings(filterParams);
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
        const { type, row } = pendingAction;

        if (type === "cancel" && !cancelReason.trim()) {
            toast.error("A cancellation reason is required");
            return;
        }

        setActionSubmitting(true);
        try {
            if (type === "post") {
                await productionBookingService.postProductionBooking(row.id);
                toast.success(
                    `Booking ${row.booking_no} posted. Components issued, finished good received and the ledger updated.`
                );
            } else {
                await productionBookingService.cancelProductionBooking(row.id, cancelReason.trim());
                toast.success(`Booking ${row.booking_no} cancelled and all stock movements reversed`);
            }
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
                filterType: "text",
                filterKey: "booking_no",
                defaultFilterOperator: "contains",
            },
            {
                field: "booking_date",
                label: "Date",
                sortable: true,
                filterType: "date",
                filterKey: "booking_date_from",
                filterKeyTo: "booking_date_to",
                operatorKey: "booking_date_op",
                defaultFilterOperator: "inRange",
                render: (row) => (row.booking_date ? formatDate(row.booking_date) : "-"),
            },
            {
                field: "order_no",
                label: "Production Order",
                sortable: false,
                filterType: "text",
                filterKey: "order_no",
                defaultFilterOperator: "contains",
                render: (row) => row.productionOrder?.order_no || "-",
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
                        {row.status === "DRAFT" && perms?.can_update && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                onClick={() => router.push(`/production-bookings/edit?id=${row.id}`)}
                                title="Edit"
                                aria-label="Edit"
                            >
                                <IconPencil className="size-4" />
                            </Button>
                        )}
                        {row.status === "DRAFT" && perms?.can_update && (
                            <Button
                                size="icon"
                                variant="success"
                                onClick={() => {
                                    setCancelReason("");
                                    setPendingAction({ type: "post", row });
                                }}
                                title="Post"
                                aria-label="Post"
                            >
                                <IconCircleCheck className="size-4" />
                            </Button>
                        )}
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
        [handleOpenSidebar, router]
    );

    const fetcher = useMemo(
        () => async (params) => {
            const p = params || {};
            const response = await productionBookingService.getProductionBookings({
                page: p.page,
                limit: p.limit,
                sortBy: p.sortBy || "id",
                sortOrder: p.sortOrder || "DESC",
                booking_no: p.booking_no || undefined,
                order_no: p.order_no || undefined,
                warehouse_name: p.warehouse_name || undefined,
                fg_product_name: p.fg_product_name || undefined,
                status: p.status || undefined,
                booking_date_from: p.booking_date_from || undefined,
                booking_date_to: p.booking_date_to || undefined,
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
                        <span className="block font-semibold text-muted-foreground">Production Order</span>
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
                                    {booking.components.map((line) => (
                                        <tr key={line.id} className="border-t border-border">
                                            <td className="px-2 py-1">
                                                {line.product?.product_name || "-"}
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
                                    ))}
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

    const isCancelAction = pendingAction?.type === "cancel";

    return (
        <ProtectedRoute>
            <ListingPageContainer
                title="Production Bookings"
                addButtonLabel={currentPerm.can_create ? "New Booking" : undefined}
                onAddClick={currentPerm.can_create ? () => router.push("/production-bookings/new") : undefined}
                exportButtonLabel="Export"
                onExportClick={handleExport}
                exportDisabled={exporting}
            >
                <PaginatedTable
                    key={tableKey}
                    columns={columns}
                    fetcher={fetcher}
                    moduleKey="production-bookings"
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

            <DetailsSidebar
                open={sidebarOpen}
                onClose={handleCloseSidebar}
                title="Production Booking Details"
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
                        <AlertDialogTitle>
                            {isCancelAction ? "Cancel Production Booking" : "Post Production Booking"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {isCancelAction
                                ? "Cancelling posts mirror ledger entries: components return to stock, the finished good is removed, and component serials become available again. This is refused once a finished-good serial has moved downstream."
                                : "Posting issues the component quantities out of stock, marks scanned serials as issued, receives the finished good at its computed cost and writes the inventory ledger. This cannot be undone except by cancelling the booking."}
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
                    {isCancelAction && (
                        <ShadInput
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Cancellation reason (required)"
                            aria-label="Cancellation reason"
                            disabled={actionSubmitting}
                        />
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionSubmitting}>Close</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleActionConfirm}
                            disabled={actionSubmitting}
                            loading={actionSubmitting}
                        >
                            {isCancelAction ? "Cancel Booking" : "Post"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ProtectedRoute>
    );
}
