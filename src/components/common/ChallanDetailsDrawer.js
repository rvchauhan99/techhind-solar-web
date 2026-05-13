"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import { Box } from "@mui/material";
import { Button } from "@/components/ui/button";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import challanService from "@/services/challanService";
import { printChallanById } from "@/utils/challanPrintUtils";
import { formatDate } from "@/utils/dataTableUtils";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

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
    /** Expanded row index for serial numbers (expandable row pattern). */
    const [expandedRowIndex, setExpandedRowIndex] = useState(null);

    useEffect(() => {
        setExpandedRowIndex(null);
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

    const partialReturns = useMemo(
        () => (Array.isArray(challan?.partial_returns) ? challan.partial_returns : []),
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
        const handledBy = order.handledBy || {};
        const projectScheme = order.projectScheme || {};
        const discom = order.discom || {};

        /** Reusable detail row */
        const DetailRow = ({ label, value }) =>
            value ? (
                <div className="flex justify-between gap-3 py-0.5">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="text-right font-medium break-all">{value}</span>
                </div>
            ) : null;

        /** Section heading */
        const SectionHeading = ({ children }) => (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{children}</p>
        );

        /** Delivery status badge */
        const statusColor = (s) => {
            if (s === "complete") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
            if (s === "partial") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
            return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
        };

        /** Order status badge */
        const orderStatusColor = (s) => {
            const key = String(s || "").toLowerCase();
            if (key === "confirmed") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
            if (key === "cancelled") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
            return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
        };

        const fmtCurrency = (n) =>
            n != null ? `₹ ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : null;

        return (
            <div className="pr-1 space-y-4 text-sm">
                {/* ─── Challan Header ─── */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                    <div>
                        <p className="text-base font-semibold">{challan.challan_no || challan.id}</p>
                        <p className="text-xs text-muted-foreground">
                            {formatDate(challan.challan_date) || "-"}
                        </p>
                        {challan.is_reversed && (
                            <p className="text-xs mt-1 font-semibold text-red-800 dark:text-red-300">
                                Reversed: {formatDate(challan.reversed_at) || "-"}
                                {challan.reversedByUser?.name ? ` by ${challan.reversedByUser.name}` : ""}
                            </p>
                        )}
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

                {/* ─── Order Info ─── */}
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                    <SectionHeading>Order Information</SectionHeading>
                    <DetailRow label="Order No" value={order.order_number} />
                    <DetailRow label="Order Date" value={formatDate(order.order_date)} />
                    {order.status && (
                        <div className="flex justify-between gap-3 py-0.5">
                            <span className="text-muted-foreground shrink-0">Status</span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${orderStatusColor(order.status)}`}>
                                {order.status}
                            </span>
                        </div>
                    )}
                    <DetailRow label="Consumer No" value={order.consumer_no} />
                    <DetailRow label="Capacity" value={order.capacity != null ? `${order.capacity} kW` : null} />
                    <DetailRow label="Demand Load" value={order.demand_load != null ? `${order.demand_load} kW` : null} />
                    <DetailRow label="Total Payable" value={fmtCurrency(order.project_cost)} />
                    <DetailRow label="Payment Type" value={order.payment_type} />
                    <DetailRow label="Project Scheme" value={projectScheme.name} />
                    <DetailRow label="Discom" value={discom.name} />
                    {order.delivery_status && (
                        <div className="flex justify-between gap-3 py-0.5">
                            <span className="text-muted-foreground shrink-0">Delivery Status</span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(order.delivery_status)}`}>
                                {order.delivery_status}
                            </span>
                        </div>
                    )}
                    <DetailRow label="Handled By" value={handledBy.name} />
                </div>

                {/* ─── Customer Details ─── */}
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                    <SectionHeading>Customer Details</SectionHeading>
                    <DetailRow label="Name" value={customer.customer_name} />
                    <DetailRow label="Mobile" value={customer.mobile_number} />
                    <DetailRow label="Phone" value={customer.phone_no} />
                    <DetailRow label="Email" value={customer.email_id} />
                    <DetailRow label="Company" value={customer.company_name} />
                    <DetailRow label="Address" value={customer.address} />
                    <DetailRow label="Landmark / Area" value={customer.landmark_area} />
                    <DetailRow label="Taluka" value={customer.taluka} />
                    <DetailRow label="District" value={customer.district} />
                    <DetailRow label="Pin Code" value={customer.pin_code} />
                </div>

                {/* ─── Warehouse ─── */}
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                    <SectionHeading>Warehouse</SectionHeading>
                    <DetailRow label="Name" value={warehouse.name} />
                    <DetailRow label="Contact Person" value={warehouse.contact_person} />
                    <DetailRow label="Mobile" value={warehouse.mobile} />
                    <DetailRow label="Phone" value={warehouse.phone_no} />
                    <DetailRow label="Email" value={warehouse.email} />
                    <DetailRow label="Address" value={warehouse.address} />
                </div>

                {/* ─── Transporter ─── */}
                {challan.transporter && (
                    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                        <SectionHeading>Transporter</SectionHeading>
                        <p className="font-medium">{challan.transporter}</p>
                    </div>
                )}

                {/* ─── Items ─── */}
                <div>
                    <SectionHeading>Items ({items.length})</SectionHeading>
                    {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No items</p>
                    ) : (
                        <div className="max-h-72 overflow-y-auto border rounded-md border-border">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40">
                                        <th className="w-8 px-1 py-1" aria-label="Expand" />
                                        <th className="px-2 py-1 text-left font-semibold">Product</th>
                                        <th className="px-2 py-1 text-left font-semibold">UOM</th>
                                        <th className="px-2 py-1 text-right font-semibold">Qty</th>
                                        <th className="px-2 py-1 text-right font-semibold" title="Returned quantity">
                                            Ret.
                                        </th>
                                        <th className="px-2 py-1 text-right font-semibold" title="Remaining returnable">
                                            Bal.
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => {
                                        const serialsStr = item.serials?.trim?.() || "";
                                        const serialList = serialsStr
                                            ? serialsStr.split(",").map((s) => s.trim()).filter(Boolean)
                                            : [];
                                        const hasSerials = serialList.length > 0;
                                        const isExpanded = expandedRowIndex === index;
                                        const productName =
                                            item?.product?.product_name || item?.product_snapshot?.product_name || "-";
                                        const returnedQty = Number(item.returned_qty) || 0;
                                        const returnableBal = Number(item.returnable_qty) || 0;
                                        return (
                                            <Fragment key={item.id || index}>
                                                <tr
                                                    className="border-b border-border last:border-b-0"
                                                >
                                                    <td className="w-8 px-1 py-1 align-middle">
                                                        {hasSerials ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setExpandedRowIndex(isExpanded ? null : index)
                                                                }
                                                                className="flex items-center justify-center rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                aria-expanded={isExpanded}
                                                                aria-label={isExpanded ? "Collapse serial numbers" : "View serial numbers"}
                                                            >
                                                                {isExpanded ? (
                                                                    <ExpandLessIcon fontSize="small" />
                                                                ) : (
                                                                    <ExpandMoreIcon fontSize="small" />
                                                                )}
                                                            </button>
                                                        ) : (
                                                            <span className="inline-block w-5" />
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-1">{productName}</td>
                                                    <td className="px-2 py-1">
                                                        {item?.product?.measurementUnit?.unit ||
                                                            item?.product_snapshot?.uom ||
                                                            "-"}
                                                    </td>
                                                    <td className="px-2 py-1 text-right">{item.quantity ?? 0}</td>
                                                    <td className="px-2 py-1 text-right">{returnedQty}</td>
                                                    <td className="px-2 py-1 text-right">{returnableBal}</td>
                                                </tr>
                                                {hasSerials && isExpanded && (
                                                    <tr
                                                        key={`${item.id || index}-serials`}
                                                        className="border-b border-border bg-muted/30 last:border-b-0"
                                                    >
                                                        <td colSpan={6} className="px-2 py-2">
                                                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                                                Serial numbers captured
                                                            </p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {serialList.map((sn, i) => (
                                                                    <span
                                                                        key={i}
                                                                        className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono"
                                                                    >
                                                                        {sn}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ─── Partial return history ─── */}
                <div>
                    <SectionHeading>Partial returns</SectionHeading>
                    {partialReturns.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No partial returns recorded.</p>
                    ) : (
                        <div className="max-h-64 space-y-2 overflow-y-auto">
                            {partialReturns.map((ret) => {
                                const reasonLabel =
                                    ret.reason_text || ret.reason?.reason || null;
                                return (
                                    <div
                                        key={ret.id}
                                        className="rounded-md border border-border bg-muted/15 p-2 text-[11px] leading-snug"
                                    >
                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 font-semibold">
                                            <span>#{ret.id}</span>
                                            <span className="font-normal text-muted-foreground">
                                                {formatDate(ret.return_date) || "-"}
                                            </span>
                                            <span className="font-normal">
                                                Qty {ret.total_return_quantity ?? 0}
                                            </span>
                                        </div>
                                        {reasonLabel ? (
                                            <p className="mt-1 text-muted-foreground">
                                                <span className="font-medium">Reason:</span> {reasonLabel}
                                            </p>
                                        ) : null}
                                        {ret.remarks ? (
                                            <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{ret.remarks}</p>
                                        ) : null}
                                        {(ret.items || []).length > 0 ? (
                                            <table className="mt-2 w-full border-collapse">
                                                <thead>
                                                    <tr className="border-b border-border text-left font-semibold">
                                                        <th className="py-0.5 pr-1">Product</th>
                                                        <th className="py-0.5 pr-1 text-right">Ret. qty</th>
                                                        <th className="py-0.5">Serials</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(ret.items || []).map((line) => {
                                                        const sn = (line.serials || [])
                                                            .map((s) => s.serial_number)
                                                            .filter(Boolean);
                                                        const snText =
                                                            sn.length <= 2
                                                                ? sn.join(", ")
                                                                : `${sn.slice(0, 2).join(", ")} +${sn.length - 2}`;
                                                        return (
                                                            <tr key={line.id} className="border-b border-border/50 last:border-0">
                                                                <td className="py-0.5 pr-1 align-top">{line.product?.product_name || "-"}</td>
                                                                <td className="py-0.5 pr-1 text-right align-top">
                                                                    {line.return_quantity ?? 0}
                                                                </td>
                                                                <td className="py-0.5 align-top break-all">{snText || "—"}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ─── Remarks ─── */}
                {challan.remarks && (
                    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                        <SectionHeading>Remarks</SectionHeading>
                        <p className="whitespace-pre-wrap text-sm">{challan.remarks}</p>
                    </div>
                )}

                {/* ─── Audit ─── */}
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                    <SectionHeading>Audit</SectionHeading>
                    <DetailRow label="Created By" value={challan.created_by_name || challan.created_by} />
                    <DetailRow label="Created On" value={formatDate(challan.created_at)} />
                    <DetailRow label="Updated On" value={formatDate(challan.updated_at)} />
                </div>
            </div>
        );
    };

    return (
        <DetailsSidebar
            open={open}
            onClose={onClose}
            title={title}
            closeOnBackdropClick={false}
        >
            {renderBody()}
        </DetailsSidebar>
    );
}
