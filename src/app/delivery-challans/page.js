"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    IconCircleCheck,
    IconFileDescription,
    IconRefresh,
    IconTrash,
} from "@tabler/icons-react";
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
import PaginatedTable from "@/components/common/PaginatedTable";
import ChallanDetailsDrawer from "@/components/common/ChallanDetailsDrawer";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import DeliveryChallanFilterPanel from "@/components/common/DeliveryChallanFilterPanel";
import AutocompleteField from "@/components/common/AutocompleteField";
import Input from "@/components/common/Input";
import challanService from "@/services/challanService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { formatDate } from "@/utils/dataTableUtils";
import { toastSuccess, toastError } from "@/utils/toast";
import { useAuth } from "@/hooks/useAuth";

export default function DeliveryChallanListPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [filters, setFilters] = useState({});
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedChallanId, setSelectedChallanId] = useState(null);
    const [selectedOrderStageKey, setSelectedOrderStageKey] = useState(null);
    const [selectedIsReversed, setSelectedIsReversed] = useState(false);
    const [reloadTrigger, setReloadTrigger] = useState(0);
    const [reversing, setReversing] = useState(false);
    const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
    const [reverseReasonId, setReverseReasonId] = useState("");
    const [reverseReasonText, setReverseReasonText] = useState("");
    const [reverseRemarks, setReverseRemarks] = useState("");
    const [reverseReasonError, setReverseReasonError] = useState(false);

    const fetchChallans = async (params) => {
        const response = await challanService.getChallans({ ...params });
        const result = response?.result ?? response;
        const data = result?.data ?? [];
        const meta = result?.meta ?? {
            total: result?.pagination?.total ?? 0,
            page: result?.pagination?.page ?? params?.page ?? 1,
            pages: result?.pagination?.totalPages ?? 0,
            limit: result?.pagination?.limit ?? params?.limit,
        };
        return { data, meta };
    };

    const deliveryStatusBadge = (status) => {
        const key = String(status || "").toLowerCase();
        const label =
            key === "complete" ? "Complete" : key === "partial" ? "Partial" : key === "pending" ? "Pending" : "-";

        const className = (() => {
            if (key === "complete") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
            if (key === "partial") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
            return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
        })();

        return (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>
                {label}
            </span>
        );
    };

    const reversedStatusBadge = (reversedAt) => (
        <div className="flex flex-col">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                Reversed
            </span>
            {reversedAt ? (
                <span className="text-[10px] text-red-700/80 dark:text-red-300/80">
                    {formatDate(reversedAt)}
                </span>
            ) : null}
        </div>
    );

    const columns = [
        {
            field: "actions",
            label: "",
            sortable: false,
            isActionColumn: true,
            maxWidth: 80,
            render: (row) => {
                const stageKey = String(row?.order?.current_stage_key || "").toLowerCase();
                const isDraftRow = stageKey === "delivery";

                const isSuperAdminLocal = String(user?.role?.name || "")
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, "") === "superadmin";

                const allowedStageKeysLocal = new Set([
                    "assign_fabricator_and_installer",
                    "fabrication",
                    "installation",
                    "netmeter_apply",
                ]);

                const canReverseRow =
                    isSuperAdminLocal && allowedStageKeysLocal.has(stageKey) && !row?.is_reversed;

                return (
                    <div className="flex items-center gap-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={(e) => {
                                e.stopPropagation();
                                openDetailsForRow(row);
                            }}
                            title="View details"
                            aria-label="View details"
                        >
                            <IconFileDescription className="size-3.5" />
                        </Button>

                        {canReverseRow && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openReverseDialogForRow(row);
                                }}
                                title="Reverse"
                                aria-label="Reverse"
                            >
                                <IconRefresh className="size-3.5" />
                            </Button>
                        )}

                        {isDraftRow && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirmForRow(row);
                                }}
                                title="Confirm"
                                aria-label="Confirm"
                            >
                                <IconCircleCheck className="size-3.5" />
                            </Button>
                        )}

                        {isDraftRow && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteForRow(row);
                                }}
                                title="Delete"
                                aria-label="Delete"
                            >
                                <IconTrash className="size-3.5" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
        {
            field: "challan_no",
            label: "Challan",
            sortable: true,
            maxWidth: 180,
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-sm text-[#1b365d]">
                        {row.challan_no || row.id}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatDate(row.challan_date) || "-"}
                    </span>
                </div>
            ),
        },
        {
            field: "order",
            label: "Order & Customer",
            render: (row) => {
                const order = row.order || {};
                const customer = row.customer || {};
                return (
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm">{order.order_number || "-"}</span>
                        <span className="text-xs text-muted-foreground">{customer.customer_name || "-"}</span>
                        <span className="text-xs text-muted-foreground">
                            {customer.mobile_number || "-"}
                        </span>
                    </div>
                );
            },
        },
        {
            field: "delivery_status",
            label: "Status",
            maxWidth: 140,
            render: (row) => (row?.is_reversed ? reversedStatusBadge(row.reversed_at) : deliveryStatusBadge(row.delivery_status)),
        },
        {
            field: "warehouse",
            label: "Warehouse / Transport",
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-sm">{row.warehouse?.name || "-"}</span>
                    <span className="text-xs text-muted-foreground">{row.transporter || "-"}</span>
                    <span className="text-xs text-muted-foreground">
                        {row.handled_by_name ? `Handled: ${row.handled_by_name}` : "-"}
                    </span>
                </div>
            ),
        },
        {
            field: "items_count",
            label: "Items",
            maxWidth: 140,
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-sm">{row.items?.length || 0}</span>
                    <span className="text-xs text-muted-foreground">
                        {row.order?.capacity != null ? `${row.order.capacity} kW` : "-"}
                    </span>
                </div>
            ),
        },
        {
            field: "created_at",
            label: "Created On",
            sortable: true,
            maxWidth: 220,
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-sm">{row.created_by_name || "-"}</span>
                    <span className="text-xs text-muted-foreground">
                        {formatDate(row.created_at) || "-"}
                    </span>
                </div>
            ),
        },
    ];

    const effectiveFilterParams = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(filters || {}).filter(
                    ([, v]) => v != null && String(v).trim() !== ""
                )
            ),
        [filters]
    );

    const filtersKey = useMemo(
        () => JSON.stringify(effectiveFilterParams || {}),
        [effectiveFilterParams]
    );

    const openDetailsForRow = async (row) => {
        setSidebarOpen(true);
        setSelectedChallanId(row.id);
        setSelectedOrderStageKey(row?.order?.current_stage_key ?? null);
        setSelectedIsReversed(!!row?.is_reversed);
    };

    const handleCloseSidebar = () => {
        setSidebarOpen(false);
        setSelectedChallanId(null);
        setSelectedOrderStageKey(null);
        setSelectedIsReversed(false);
    };

    const normalizeRoleName = (s) => String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const isSuperAdmin = normalizeRoleName(user?.role?.name) === "superadmin";

    const allowedStageKeys = new Set([
        "assign_fabricator_and_installer",
        "fabrication",
        "installation",
        "netmeter_apply",
    ]);

    const isStageAllowed = allowedStageKeys.has(
        String(selectedOrderStageKey || "").toLowerCase()
    );

    const isReverseAllowed = !!selectedChallanId && isSuperAdmin && isStageAllowed && !selectedIsReversed;

    const openReverseDialog = () => {
        if (!isReverseAllowed) return;
        setReverseReasonId("");
        setReverseReasonText("");
        setReverseRemarks("");
        setReverseReasonError(false);
        setReverseDialogOpen(true);
    };

    // Row-aware reverse (used by Actions column buttons)
    const openReverseDialogForRow = (row) => {
        const challanId = row?.id;
        if (!challanId) return;

        const rowStageKey = String(row?.order?.current_stage_key || "").toLowerCase();
        const canReverseRow = isSuperAdmin && allowedStageKeys.has(rowStageKey) && !row?.is_reversed;
        if (!canReverseRow) return;

        setSelectedChallanId(challanId);
        setSelectedOrderStageKey(row?.order?.current_stage_key ?? null);
        setSelectedIsReversed(!!row?.is_reversed);

        setReverseReasonId("");
        setReverseReasonText("");
        setReverseRemarks("");
        setReverseReasonError(false);
        setReverseDialogOpen(true);
    };

    // Draft confirm (draft challan corresponds to order current_stage_key === "delivery")
    const handleConfirmForRow = (row) => {
        const orderId = row?.order?.id;
        if (!orderId) return;
        router.push(`/confirm-orders/view?id=${orderId}`);
    };

    const handleDeleteForRow = async (row) => {
        const challanId = row?.id;
        if (!challanId) return;

        const rowStageKey = String(row?.order?.current_stage_key || "").toLowerCase();
        const isDraftRow = rowStageKey === "delivery";
        if (!isDraftRow) return;

        if (!window.confirm("Are you sure you want to delete this challan?")) return;

        try {
            await challanService.deleteChallan(challanId);
            toastSuccess("Challan deleted successfully");
            setReloadTrigger((prev) => prev + 1);

            if (selectedChallanId === challanId) {
                handleCloseSidebar();
            }

            if (reverseDialogOpen) setReverseDialogOpen(false);
        } catch (err) {
            console.error("Failed to delete challan:", err);
            toastError(err?.response?.data?.message || "Failed to delete challan");
        }
    };

    const handleReverseConfirm = async () => {
        if (!selectedChallanId) return;
        if (!reverseReasonId) {
            setReverseReasonError(true);
            return;
        }

        try {
            setReversing(true);
            await challanService.reverseChallan(selectedChallanId, {
                reason_id: reverseReasonId,
                remarks: reverseRemarks,
            });
            toastSuccess("Challan reversed successfully");
            setReloadTrigger((prev) => prev + 1);
            setReverseDialogOpen(false);
            handleCloseSidebar();
        } catch (err) {
            console.error("Failed to reverse challan:", err);
            toastError(err?.response?.data?.message || "Failed to reverse challan");
        } finally {
            setReversing(false);
        }
    };

    return (
        <ListingPageContainer
            title="Delivery Challans"
            addButtonLabel="New Delivery Challan"
            onAddClick={() => router.push("/delivery-challans/new")}
        >

            <div className="flex flex-col flex-1 min-h-0 gap-2">
                <DeliveryChallanFilterPanel
                    open={filterPanelOpen}
                    onToggle={setFilterPanelOpen}
                    values={filters}
                    onApply={(next) => setFilters(next)}
                    onClear={() => {
                        setFilters({});
                        setFilterPanelOpen(false);
                    }}
                    defaultOpen={false}
                />

                <div className="flex-1 min-h-0">
                    <PaginatedTable
                        key={`${reloadTrigger}-${filtersKey}`}
                        columns={columns}
                        fetcher={fetchChallans}
                        initialPage={1}
                        initialLimit={20}
                        initialSortBy="id"
                        initialSortOrder="desc"
                        height="100%"
                        showSearch={false}
                        filterParams={effectiveFilterParams}
                        onRowClick={openDetailsForRow}
                    />
                </div>
            </div>

            <ChallanDetailsDrawer
                open={sidebarOpen}
                onClose={handleCloseSidebar}
                challanId={selectedChallanId}
                title="Challan Details"
                extraActions={
                    <Button
                        size="sm"
                        variant="destructive"
                        disabled={!isReverseAllowed || reversing}
                        loading={reversing}
                        onClick={openReverseDialog}
                    >
                        Reverse
                    </Button>
                }
            />

            <AlertDialog
                open={reverseDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setReverseDialogOpen(false);
                        setReverseReasonError(false);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reverse Delivery Challan</AlertDialogTitle>
                        <AlertDialogDescription>
                            Select a reason and add remarks (if needed) to return the material and reverse all stock + ledger transactions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4">
                        <AutocompleteField
                            usePortal
                            name="reason_id"
                            label="Reason"
                            required
                            error={reverseReasonError}
                            helperText={reverseReasonError ? "Reason is required" : null}
                            asyncLoadOptions={(q) =>
                                getReferenceOptionsSearch("reason.model", {
                                    q,
                                    limit: 30,
                                    reason_type: "delivery_challan_reverse",
                                    is_active: true,
                                })
                            }
                            getOptionLabel={(o) => (o && (o.reason ?? o.label)) || ""}
                            value={
                                reverseReasonId
                                    ? { id: reverseReasonId, reason: reverseReasonText, label: reverseReasonText }
                                    : null
                            }
                            onChange={(_e, newValue) => {
                                const id = newValue?.id ?? "";
                                const text = newValue
                                    ? newValue.reason ?? newValue.label ?? ""
                                    : "";
                                setReverseReasonId(id ? String(id) : "");
                                setReverseReasonText(text ? String(text) : "");
                                setReverseReasonError(false);
                            }}
                            placeholder="Select reason…"
                            disabled={reversing}
                        />

                        <Input
                            name="remarks"
                            label="Remarks"
                            value={reverseRemarks}
                            onChange={(e) => setReverseRemarks(e.target.value)}
                            multiline
                            rows={2}
                            disabled={reversing}
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={reversing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleReverseConfirm}
                            disabled={!reverseReasonId || reversing}
                            loading={reversing}
                        >
                            Reverse
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ListingPageContainer>
    );
}


