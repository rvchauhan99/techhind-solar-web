"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
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
import AutocompleteField from "@/components/common/AutocompleteField";
import Input from "@/components/common/Input";
import challanService from "@/services/challanService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { formatDate } from "@/utils/dataTableUtils";
import { toastSuccess, toastError } from "@/utils/toast";
import { useAuth } from "@/hooks/useAuth";

export default function DeliveryChallanListPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();

    const rawScope = searchParams.get("scope");
    // Scope is now controlled purely by the URL / module; default to
    // my_warehouse when not specified.
    const scope = rawScope || "my_warehouse";

    const [filters, setFilters] = useState({});
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedChallanId, setSelectedChallanId] = useState(null);
    const [selectedOrderStageKey, setSelectedOrderStageKey] = useState(null);
    const [reloadTrigger, setReloadTrigger] = useState(0);
    const [reversing, setReversing] = useState(false);
    const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
    const [reverseReasonId, setReverseReasonId] = useState("");
    const [reverseReasonText, setReverseReasonText] = useState("");
    const [reverseRemarks, setReverseRemarks] = useState("");
    const [reverseReasonError, setReverseReasonError] = useState(false);

    const fetchChallans = async (params) => {
        const response = await challanService.getChallans({
            ...params,
            scope,
        });
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

    const columns = [
        {
            field: "challan_no",
            label: "Challan No",
            sortable: true,
            filterType: "text",
            filterKey: "challan_no",
            defaultFilterOperator: "contains",
            render: (row) => (
                <span className="font-medium text-sm">
                    {row.challan_no || row.id}
                </span>
            ),
        },
        {
            field: "challan_date",
            label: "Date",
            sortable: true,
            filterType: "date",
            filterKey: "challan_date_from",
            filterKeyTo: "challan_date_to",
            operatorKey: "challan_date_op",
            defaultFilterOperator: "equals",
            render: (row) => formatDate(row.challan_date) || "-",
        },
        {
            field: "order",
            label: "Order",
            filterType: "text",
            filterKey: "order_number",
            defaultFilterOperator: "contains",
            render: (row) => row.order?.order_number || "-",
        },
        {
            field: "delivery_status",
            label: "Status",
            filterType: "select",
            filterKey: "delivery_status",
            filterOptions: [
                { value: "pending", label: "Pending" },
                { value: "partial", label: "Partial" },
                { value: "complete", label: "Complete" },
            ],
            render: (row) => row.delivery_status || "-",
        },
        {
            field: "customer_name",
            label: "Customer",
            filterType: "text",
            filterKey: "customer_name",
            defaultFilterOperator: "contains",
            render: (row) => row.customer?.customer_name || "-",
        },
        {
            field: "customer_mobile",
            label: "Mobile",
            filterType: "text",
            filterKey: "customer_mobile",
            defaultFilterOperator: "contains",
            render: (row) => row.customer?.mobile_number || "-",
        },
        {
            field: "warehouse",
            label: "Warehouse",
            filterType: "text",
            filterKey: "warehouse_name",
            defaultFilterOperator: "contains",
            render: (row) => row.warehouse?.name || "-",
        },
        {
            field: "capacity",
            label: "Capacity",
            render: (row) => row.order?.capacity != null ? `${row.order.capacity} kW` : "-",
        },
        {
            field: "handled_by_name",
            label: "Handled By",
            render: (row) => row.handled_by_name || "-",
        },
        {
            field: "transporter",
            label: "Transporter",
            filterType: "text",
            filterKey: "transporter",
            defaultFilterOperator: "contains",
            render: (row) => row.transporter || "-",
        },
        {
            field: "items_count",
            label: "Items",
            sortable: true,
            filterType: "number",
            filterKey: "items_count",
            filterKeyTo: "items_count_to",
            operatorKey: "items_count_op",
            defaultFilterOperator: "equals",
            render: (row) => row.items?.length || 0,
        },
        {
            field: "created_by_name",
            label: "Created By",
            filterType: "text",
            filterKey: "created_by_name",
            defaultFilterOperator: "contains",
            render: (row) => row.created_by_name || "-",
        },
        {
            field: "created_at",
            label: "Created On",
            sortable: true,
            filterType: "date",
            filterKey: "created_at_from",
            filterKeyTo: "created_at_to",
            operatorKey: "created_at_op",
            defaultFilterOperator: "equals",
            render: (row) => formatDate(row.created_at) || "-",
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

    const handleRowClick = async (row) => {
        setSidebarOpen(true);
        setSelectedChallanId(row.id);
        setSelectedOrderStageKey(row?.order?.current_stage_key ?? null);
    };

    const handleCloseSidebar = () => {
        setSidebarOpen(false);
        setSelectedChallanId(null);
        setSelectedOrderStageKey(null);
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

    const isReverseAllowed = !!selectedChallanId && isSuperAdmin && isStageAllowed;

    const openReverseDialog = () => {
        if (!isReverseAllowed) return;
        setReverseReasonId("");
        setReverseReasonText("");
        setReverseRemarks("");
        setReverseReasonError(false);
        setReverseDialogOpen(true);
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
        <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6">Delivery Challans</Typography>
                <Button
                    size="sm"
                    onClick={() => router.push("/delivery-challans/new")}
                >
                    New Delivery Challan
                </Button>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0 }}>
                <PaginatedTable
                    key={reloadTrigger}
                    columns={columns}
                    fetcher={fetchChallans}
                    initialPage={1}
                    initialLimit={20}
                    initialSortBy="id"
                    initialSortOrder="desc"
                    height="calc(100vh - 210px)"
                    columnFilterValues={filters}
                    onColumnFilterChange={(key, value) =>
                        setFilters((prev) => ({ ...prev, [key]: value }))
                    }
                    filterParams={effectiveFilterParams}
                    onRowClick={handleRowClick}
                />
            </Box>

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
        </Box>
    );
}


