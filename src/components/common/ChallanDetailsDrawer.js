"use client";

import { useEffect, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { Button } from "@/components/ui/button";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import challanService from "@/services/challanService";
import { printChallanById } from "@/utils/challanPrintUtils";
import { formatDate } from "@/utils/dataTableUtils";

export default function ChallanDetailsDrawer({
    open,
    onClose,
    challanId,
    title = "Challan Details",
    extraActions = null,
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [challan, setChallan] = useState(null);
    const [printing, setPrinting] = useState(false);

    useEffect(() => {
        const fetchChallan = async () => {
            if (!open || !challanId) {
                setChallan(null);
                setError(null);
                return;
            }
            try {
                setLoading(true);
                setError(null);
                const response = await challanService.getChallanById(challanId);
                const result = response?.result ?? response;
                setChallan(result || null);
            } catch (fetchError) {
                setError(
                    fetchError?.response?.data?.message ||
                        fetchError?.message ||
                        "Failed to load challan details"
                );
                setChallan(null);
            } finally {
                setLoading(false);
            }
        };
        fetchChallan();
    }, [open, challanId]);

    const items = useMemo(
        () => (Array.isArray(challan?.items) ? challan.items : []),
        [challan]
    );

    const handlePrint = async () => {
        if (!challan?.id) return;
        setPrinting(true);
        try {
            await printChallanById(challan.id);
        } finally {
            setPrinting(false);
        }
    };

    const renderBody = () => {
        if (loading) {
            return (
                <div className="flex min-h-[180px] items-center justify-center text-sm text-muted-foreground">
                    Loading challan...
                </div>
            );
        }
        if (error) {
            return <div className="text-sm text-destructive">{error}</div>;
        }
        if (!challan) return null;

        const order = challan.order || {};
        const customer = order.customer || {};
        const warehouse = challan.warehouse || {};

        return (
            <div className="pr-1 space-y-3 text-sm">
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                    <div>
                        <p className="font-semibold">{challan.challan_no || challan.id}</p>
                        <p className="text-xs text-muted-foreground">
                            {formatDate(challan.challan_date) || "-"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={printing || !challan.id}
                            onClick={handlePrint}
                        >
                            {printing ? "Printing..." : "Print"}
                        </Button>
                        {extraActions}
                    </div>
                </Box>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Order</p>
                    <p>{order.order_number || "-"}</p>
                    <p className="text-xs text-muted-foreground">
                        Consumer No: {order.consumer_no || "-"} {order.capacity != null ? `• ${order.capacity} kW` : ""}
                    </p>
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Customer Delivery</p>
                    <p>{customer.customer_name || "-"}</p>
                    <p className="text-xs text-muted-foreground">{customer.mobile_number || customer.phone_no || "-"}</p>
                    <p className="text-xs text-muted-foreground">{customer.address || "-"}</p>
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Warehouse</p>
                    <p>{warehouse.name || "-"}</p>
                    <p className="text-xs text-muted-foreground">{warehouse.address || "-"}</p>
                    <p className="text-xs text-muted-foreground">{warehouse.mobile || warehouse.phone_no || "-"}</p>
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Transporter</p>
                    <p>{challan.transporter || "-"}</p>
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Items</p>
                    {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No items</p>
                    ) : (
                        <div className="max-h-72 overflow-y-auto border rounded-md border-border">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40">
                                        <th className="px-2 py-1 text-left font-semibold">Product</th>
                                        <th className="px-2 py-1 text-left font-semibold">UOM</th>
                                        <th className="px-2 py-1 text-right font-semibold">Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id || index} className="border-b border-border last:border-b-0">
                                            <td className="px-2 py-1">
                                                {item?.product?.product_name || item?.product_snapshot?.product_name || "-"}
                                            </td>
                                            <td className="px-2 py-1">
                                                {item?.product?.measurementUnit?.unit || item?.product_snapshot?.uom || "-"}
                                            </td>
                                            <td className="px-2 py-1 text-right">{item.quantity ?? 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Audit</p>
                    <p>Created By: {challan.created_by_name || challan.created_by || "-"}</p>
                    <p>Created On: {formatDate(challan.created_at) || "-"}</p>
                    <p>Updated On: {formatDate(challan.updated_at) || "-"}</p>
                </div>
            </div>
        );
    };

    return (
        <DetailsSidebar open={open} onClose={onClose} title={title}>
            {renderBody()}
        </DetailsSidebar>
    );
}
