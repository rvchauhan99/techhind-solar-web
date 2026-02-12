"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import PaginatedTable from "@/components/common/PaginatedTable";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import challanService from "@/services/challanService";
import { formatDate } from "@/utils/dataTableUtils";

export default function DeliveryChallanListPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const rawScope = searchParams.get("scope");
    // Scope is now controlled purely by the URL / module; default to
    // my_warehouse when not specified.
    const scope = rawScope || "my_warehouse";

    const [filters, setFilters] = useState({});
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedChallan, setSelectedChallan] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState(null);

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
            field: "warehouse",
            label: "Warehouse",
            filterType: "text",
            filterKey: "warehouse_name",
            defaultFilterOperator: "contains",
            render: (row) => row.warehouse?.name || "-",
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
            render: (row) => row.created_by_name || row.created_by || "-",
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
        setDetailLoading(true);
        setDetailError(null);
        setSelectedChallan(null);
        try {
            const response = await challanService.getChallanById(row.id);
            const result = response?.result ?? response;
            setSelectedChallan(result);
        } catch (error) {
            console.error("Failed to load challan details:", error);
            setDetailError(
                error?.response?.data?.message || error.message || "Failed to load challan details"
            );
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCloseSidebar = () => {
        setSidebarOpen(false);
        setSelectedChallan(null);
        setDetailError(null);
    };

    const sidebarContent = useMemo(() => {
        if (detailLoading) {
            return (
                <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
                    Loading challan…
                </div>
            );
        }
        if (detailError) {
            return (
                <div className="text-sm text-destructive">
                    {detailError}
                </div>
            );
        }
        if (!selectedChallan) return null;

        const c = selectedChallan;
        const order = c.order || {};
        const warehouse = c.warehouse || {};
        const items = Array.isArray(c.items) ? c.items : [];

        return (
            <div className="pr-1 space-y-3 text-sm">
                <div>
                    <p className="font-semibold">
                        {c.challan_no || c.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatDate(c.challan_date) || "-"}
                    </p>
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Order</p>
                    <p>{order.order_number || "-"}</p>
                    <p className="text-xs text-muted-foreground">
                        {order.customer_name || ""}{" "}
                        {order.capacity != null ? `• ${order.capacity} kW` : ""}
                    </p>
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Warehouse</p>
                    <p>{warehouse.name || "-"}</p>
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Transporter</p>
                    <p>{c.transporter || "-"}</p>
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Items</p>
                    {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No items</p>
                    ) : (
                        <div className="max-h-64 overflow-y-auto border rounded-md border-border">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40">
                                        <th className="px-2 py-1 text-left font-semibold">Product</th>
                                        <th className="px-2 py-1 text-right font-semibold">Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it, idx) => (
                                        <tr key={idx} className="border-b border-border last:border-b-0">
                                            <td className="px-2 py-1">
                                                {(it.product_snapshot || it)?.product_name ?? "-"}
                                            </td>
                                            <td className="px-2 py-1 text-right">
                                                {it.quantity ?? 0}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Audit</p>
                    <p>
                        Created By: {c.created_by_name || c.created_by || "-"}
                    </p>
                    <p>Created On: {formatDate(c.created_at) || "-"}</p>
                    <p>Updated On: {formatDate(c.updated_at) || "-"}</p>
                </div>
            </div>
        );
    }, [detailLoading, detailError, selectedChallan]);

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
                    columns={columns}
                    fetcher={fetchChallans}
                    initialPage={1}
                    initialLimit={20}
                    height="calc(100vh - 210px)"
                    columnFilterValues={filters}
                    onColumnFilterChange={(key, value) =>
                        setFilters((prev) => ({ ...prev, [key]: value }))
                    }
                    filterParams={effectiveFilterParams}
                    onRowClick={handleRowClick}
                />
            </Box>

            <DetailsSidebar
                open={sidebarOpen}
                onClose={handleCloseSidebar}
                title="Challan Details"
            >
                {sidebarContent}
            </DetailsSidebar>
        </Box>
    );
}


