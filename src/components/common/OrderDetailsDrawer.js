"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Button,
} from "@mui/material";
import DetailsSidebar from "./DetailsSidebar";
import orderService from "@/services/orderService";
import { toastError } from "@/utils/toast";
import {
    compactAddress,
    formatCurrency,
    formatDate,
    safeValue,
    getPrimaryPhone,
} from "@/utils/orderFormatters";
import { buildOrderedStages } from "@/utils/orderStageUtils";

const DetailRow = ({ label, value }) => (
    <div className="py-0.5">
        <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p className="text-xs break-words">{value ?? "-"}</p>
    </div>
);

const SectionTitle = ({ children }) => (
    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mt-2.5 mb-1 pb-0.5 border-b border-border first:mt-0">
        {children}
    </h3>
);

function statusBadgeClass(status) {
    const s = String(status ?? "").toLowerCase();
    if (s === "completed") return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    if (s === "cancelled") return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    if (s === "in_progress") return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
    return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
}

function stageBadgeClass(status) {
    if (status === "completed") return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200";
    if (status === "in_progress") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200";
    // Pending / locked / any unknown => red (per pipeline color rules)
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200";
}

export default function OrderDetailsDrawer({
    open,
    onClose,
    order,
    onPrint,
    showPrint = true,
    showDeliverySnapshot = true,
    extraActions = null,
}) {
    const [loading, setLoading] = useState(false);
    const [resolvedOrder, setResolvedOrder] = useState(order || null);
    const [printLoading, setPrintLoading] = useState(false);

    useEffect(() => {
        setResolvedOrder(order || null);
    }, [order]);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!open || !order?.id) return;
            try {
                setLoading(true);
                const data = await orderService.getOrderById(order.id);
                const item = data?.result ?? data;
                setResolvedOrder(item || order);
            } catch (err) {
                const msg =
                    err?.response?.data?.message || err?.message || "Failed to load order details";
                toastError(msg);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [open, order]);

    const stages = useMemo(
        () => buildOrderedStages(resolvedOrder?.stages, resolvedOrder?.current_stage_key),
        [resolvedOrder]
    );

    const bomLines = Array.isArray(resolvedOrder?.bom_snapshot) ? resolvedOrder.bom_snapshot : [];

    const handlePrint = async () => {
        if (!resolvedOrder?.id || !onPrint) return;
        try {
            setPrintLoading(true);
            await onPrint(resolvedOrder);
        } finally {
            setPrintLoading(false);
        }
    };

    return (
        <DetailsSidebar
            open={open}
            onClose={onClose}
            title="Order Details"
            headerActions={
                <>
                    {showPrint && (
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={handlePrint}
                            disabled={!resolvedOrder?.id || printLoading}
                        >
                            {printLoading ? "Generating..." : "Print"}
                        </Button>
                    )}
                    {extraActions}
                </>
            }
        >
            {loading ? (
                <div className="flex flex-1 justify-center items-center py-12">
                    <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="space-y-0.5">
                    
                    {resolvedOrder?.cancelled_at && (
                        <div className="p-2 mb-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-md">
                            <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Order Cancelled</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                                <DetailRow label="Cancelled At" value={formatDate(resolvedOrder.cancelled_at)} />
                                <DetailRow label="Stage" value={safeValue(resolvedOrder.cancelled_stage)} />
                                <DetailRow label="Reason" value={safeValue(resolvedOrder.cancellation_reason)} />
                            </div>
                        </div>
                    )}

                    {/* Hero Summary Block */}
                    <div className="rounded border border-border bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-900/50 dark:to-slate-800/50 p-2.5 border-l-4 border-l-[#00823b] mb-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {safeValue(resolvedOrder?.order_number) || `#${resolvedOrder?.id}`}
                                </p>
                                <p className="text-sm font-semibold text-[#00823b] mt-0.5">
                                    {safeValue(resolvedOrder?.capacity) ? `${resolvedOrder?.capacity} kW` : "-"}
                                    <span className="text-slate-600 dark:text-slate-400 font-normal ml-1.5">
                                        · {formatCurrency(resolvedOrder?.project_cost)}
                                    </span>
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 shrink-0">
                                {resolvedOrder?.status && (
                                    <span
                                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeClass(
                                            resolvedOrder?.status
                                        )}`}
                                    >
                                        {resolvedOrder?.status.toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <SectionTitle>Customer Profile</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                        <DetailRow label="Name" value={safeValue(resolvedOrder?.customer_name)} />
                        <DetailRow label="Contact" value={safeValue(getPrimaryPhone(resolvedOrder || {}))} />
                        <div className="sm:col-span-2">
                            <DetailRow label="Address" value={safeValue(resolvedOrder ? compactAddress(resolvedOrder) : "-")} />
                        </div>
                        <DetailRow label="Reference" value={safeValue(resolvedOrder?.reference_from)} />
                        <DetailRow label="Channel Partner" value={safeValue(resolvedOrder?.channel_partner_name)} />
                        <DetailRow label="Handled By" value={safeValue(resolvedOrder?.handled_by_name)} />
                        <DetailRow label="Branch" value={safeValue(resolvedOrder?.branch_name)} />
                    </div>

                    <SectionTitle>Project</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                        <DetailRow label="Order Date" value={formatDate(resolvedOrder?.order_date)} />
                        <DetailRow label="Capacity (kW)" value={safeValue(resolvedOrder?.capacity)} />
                        <DetailRow label="Existing PV (kW)" value={safeValue(resolvedOrder?.existing_pv_capacity)} />
                        <DetailRow label="Scheme" value={safeValue(resolvedOrder?.project_scheme_name)} />
                    </div>

                    <SectionTitle>Discom Details</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                        <DetailRow label="Discom" value={safeValue(resolvedOrder?.discom_name)} />
                        <DetailRow label="Consumer No" value={safeValue(resolvedOrder?.consumer_no)} />
                        <DetailRow label="Circle" value={safeValue(resolvedOrder?.circle)} />
                        <DetailRow label="Demand Load" value={safeValue(resolvedOrder?.demand_load)} />
                        <DetailRow label="Application No" value={safeValue(resolvedOrder?.application_no)} />
                        <DetailRow label="GUVNL No" value={safeValue(resolvedOrder?.guvnl_no)} />
                        <DetailRow label="Gov Reg. Date" value={formatDate(resolvedOrder?.date_of_registration_gov)} />
                        <DetailRow label="Feasibility Date" value={formatDate(resolvedOrder?.feasibility_date)} />
                    </div>

                    <SectionTitle>Financials & Payment</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                        <DetailRow label="Payment Type" value={safeValue(resolvedOrder?.payment_type)} />
                        {resolvedOrder?.loan_type_name && (
                            <DetailRow label="Loan Type" value={safeValue(resolvedOrder?.loan_type_name)} />
                        )}
                    </div>
                    <div className="mt-1 border-t border-dashed border-border pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                        <DetailRow label="Total Payable" value={formatCurrency(resolvedOrder?.project_cost)} />
                        <DetailRow label="Total Paid" value={formatCurrency(resolvedOrder?.total_paid)} />
                        <DetailRow
                            label="Outstanding Balance"
                            value={formatCurrency(Number(resolvedOrder?.project_cost || 0) - Number(resolvedOrder?.total_paid || 0))}
                        />
                    </div>

                    <SectionTitle>Delivery</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                        <DetailRow label="Solar Panel" value={safeValue(resolvedOrder?.solar_panel_name)} />
                        <DetailRow label="Inverter" value={safeValue(resolvedOrder?.inverter_name)} />
                    </div>
                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mt-2 mb-0.5">Planning</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                        <DetailRow label="Planned Delivery" value={formatDate(resolvedOrder?.planned_delivery_date)} />
                        <DetailRow label="Warehouse" value={safeValue(resolvedOrder?.planned_warehouse_name)} />
                        <DetailRow label="Priority" value={safeValue(resolvedOrder?.planned_priority)} />
                        <DetailRow label="Planned Panel Qty" value={safeValue(resolvedOrder?.planned_solar_panel_qty)} />
                        <DetailRow label="Planned Inverter Qty" value={safeValue(resolvedOrder?.planned_inverter_qty)} />
                    </div>

                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mt-2 mb-0.5">Fabrication & Installation</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                        <DetailRow label="Fabricator" value={safeValue(resolvedOrder?.fabrication?.fabricator_name) || safeValue(resolvedOrder?.fabricator_name) || "-"} />
                        <DetailRow label="Installer" value={safeValue(resolvedOrder?.installation?.installer_name) || safeValue(resolvedOrder?.installer_name) || "-"} />
                        <DetailRow label="Fabrication Due" value={formatDate(resolvedOrder?.fabrication_due_date)} />
                        <DetailRow label="Installation Due" value={formatDate(resolvedOrder?.installation_due_date)} />
                    </div>

                    {showDeliverySnapshot && (
                        <>
                            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mt-2 mb-0.5">Delivery Snapshot</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                                <DetailRow label="Delivery Status" value={safeValue(resolvedOrder?.delivery_status || "pending").toUpperCase()} />
                                <DetailRow label="Shipped / Required" value={`${safeValue(resolvedOrder?.total_shipped)} / ${safeValue(resolvedOrder?.total_required)}`} />
                                <DetailRow label="Pending Qty" value={safeValue(resolvedOrder?.total_pending)} />
                                <DetailRow label="Last Challan Date" value={formatDate(resolvedOrder?.last_challan_date)} />
                                <DetailRow label="Challan Count" value={safeValue(resolvedOrder?.challan_count)} />
                            </div>
                        </>
                    )}

                    <SectionTitle>Netmeter</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                        <DetailRow label="Applied On" value={formatDate(resolvedOrder?.netmeter_applied_on)} />
                        <DetailRow label="Netmeter Serial" value={safeValue(resolvedOrder?.netmeter_serial_no)} />
                        <DetailRow label="Solarmeter Serial" value={safeValue(resolvedOrder?.solarmeter_serial_no)} />
                        <DetailRow label="Installed On" value={formatDate(resolvedOrder?.netmeter_installed_on)} />
                    </div>

                    <SectionTitle>Subsidy Claim</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                        <DetailRow label="Claim Date" value={formatDate(resolvedOrder?.claim_date)} />
                        <DetailRow label="Claim No" value={safeValue(resolvedOrder?.claim_no)} />
                        <DetailRow label="Claim Amount" value={formatCurrency(resolvedOrder?.claim_amount)} />
                        <DetailRow label="Disbursed Date" value={formatDate(resolvedOrder?.disbursed_date)} />
                        <DetailRow label="Disbursed Amount" value={formatCurrency(resolvedOrder?.disbursed_amount)} />
                    </div>

                    <SectionTitle>State Subsidy</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                        <DetailRow label="State Claim Date" value={formatDate(resolvedOrder?.state_claim_date)} />
                        <DetailRow label="State Claim No" value={safeValue(resolvedOrder?.state_claim_no)} />
                        <DetailRow label="State Claim Amount" value={formatCurrency(resolvedOrder?.state_claim_amount)} />
                        <DetailRow label="State Disbursed Date" value={formatDate(resolvedOrder?.state_disbursed_date)} />
                        <DetailRow label="State Disbursed Amount" value={formatCurrency(resolvedOrder?.state_disbursed_amount)} />
                    </div>

                    <SectionTitle>Pipeline Stages</SectionTitle>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {stages.map((stage) => (
                            <span
                                key={stage.key}
                                className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${
                                    stageBadgeClass(stage.isCurrent ? "in_progress" : stage.status)
                                }`}
                            >
                                {stage.label}: {stage.isCurrent ? "Current" : stage.status}
                            </span>
                        ))}
                    </div>

                    <SectionTitle>BOM Settings Summary</SectionTitle>
                    {bomLines.length === 0 ? (
                        <p className="text-xs text-muted-foreground mt-1 mb-4">No BOM snapshot available.</p>
                    ) : (
                        <div className="mt-1 space-y-1 mb-4">
                            {bomLines.slice(0, 15).map((line, index) => (
                                <div key={`${line.product_id || index}-${index}`} className="flex justify-between items-start border-b border-border/50 pb-1 last:border-0">
                                    <span className="text-xs pr-2">
                                        {index + 1}. {safeValue(line.product_name || line.product_type_name)}
                                    </span>
                                    <span className="text-xs font-semibold shrink-0">
                                        Qty: {safeValue(line.quantity)}
                                    </span>
                                </div>
                            ))}
                            {bomLines.length > 15 && (
                                <p className="text-[10px] text-muted-foreground text-center pt-1">
                                    + {bomLines.length - 15} more items
                                </p>
                            )}
                        </div>
                    )}
                    
                </div>
            )}
        </DetailsSidebar>
    );
}
