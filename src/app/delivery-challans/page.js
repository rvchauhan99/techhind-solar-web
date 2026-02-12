"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";
import PaginatedTable from "@/components/common/PaginatedTable";
import ChallanDetailsDrawer from "@/components/common/ChallanDetailsDrawer";
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
    const [selectedChallanId, setSelectedChallanId] = useState(null);

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
        setSelectedChallanId(row.id);
    };

    const handleCloseSidebar = () => {
        setSidebarOpen(false);
        setSelectedChallanId(null);
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

            <ChallanDetailsDrawer
                open={sidebarOpen}
                onClose={handleCloseSidebar}
                challanId={selectedChallanId}
                title="Challan Details"
            />
        </Box>
    );
}


