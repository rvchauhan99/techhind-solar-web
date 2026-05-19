"use client";

import { IconCircleCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BillToShipToDisplay from "@/components/common/BillToShipToDisplay";
import Loader from "@/components/common/Loader";
import { formatDate, formatCurrency } from "@/utils/dataTableUtils";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PARTIAL_SHIPPED", label: "Partial Shipped" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

const getStatusBadgeVariant = (status) => {
  if (status === "COMPLETED" || status === "CONFIRMED") return "default";
  if (status === "PARTIAL_SHIPPED") return "outline";
  if (status === "CANCELLED") return "destructive";
  return "secondary";
};

const formatSignedCurrency = (val) => {
  const n = Number(val) || 0;
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(n))}`;
};

export const renderB2bSalesOrderStatusBadge = (status) => (
  <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
    {STATUS_LABELS[status] || status || "Draft"}
  </Badge>
);

export default function B2bSalesOrderDetailsContent({
  order,
  loading = false,
  readOnly = false,
  highlightLineId = null,
  canUpdate = false,
  onConfirm,
  onCancel,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader />
      </div>
    );
  }

  if (!order) {
    return <p className="text-sm text-muted-foreground italic">No order details available</p>;
  }

  const o = order;
  const items = o?.items ?? [];
  const hasItems = Array.isArray(items) && items.length > 0;
  const attachments = o?.attachments ?? [];
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  const totalGst = Number(o.total_gst_amount) || 0;
  const cgstTotalRaw = Number(o.cgst_amount_total);
  const sgstTotalRaw = Number(o.sgst_amount_total);
  const igstTotalRaw = Number(o.igst_amount_total);
  const hasIgstSplit = Number.isFinite(igstTotalRaw) && Math.abs(igstTotalRaw) > 0.0001;
  const normalizedGstType = String(o.gst_type || "").toUpperCase();
  const gstType =
    normalizedGstType === "IGST" || normalizedGstType === "CGST_SGST"
      ? normalizedGstType
      : hasIgstSplit
        ? "IGST"
        : "CGST_SGST";
  const cgstTotal = Number.isFinite(cgstTotalRaw) ? cgstTotalRaw : totalGst / 2;
  const sgstTotal = Number.isFinite(sgstTotalRaw) ? sgstTotalRaw : totalGst / 2;
  const igstTotal = Number.isFinite(igstTotalRaw) ? igstTotalRaw : totalGst;
  const applicableGstLabel = gstType === "IGST" ? "IGST" : "CGST / SGST";
  const applicableGstValue =
    gstType === "IGST"
      ? formatCurrency(igstTotal)
      : `${formatCurrency(cgstTotal)} / ${formatCurrency(sgstTotal)}`;

  return (
    <div className="pr-1 space-y-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Order No</p>
          <p className="font-medium">{o.order_no ?? o.id ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Date</p>
          <p>{formatDate(o.order_date) ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Client</p>
          <p>{o.client?.client_name ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Ship To</p>
          <p>{o.shipTo?.ship_to_name ?? "-"}</p>
        </div>
        {o.plannedWarehouse && (
          <div className="col-span-2">
            <p className="text-xs font-semibold text-muted-foreground">Planned Warehouse</p>
            <p>{o.plannedWarehouse?.name ?? "-"}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Status</p>
          {renderB2bSalesOrderStatusBadge(o.status)}
        </div>
        {(o.payment_terms || o.delivery_terms) && (
          <>
            {o.payment_terms && (
              <div className="col-span-2">
                <p className="text-xs font-semibold text-muted-foreground">Payment Terms</p>
                <p>{o.payment_terms}</p>
              </div>
            )}
            {o.delivery_terms && (
              <div className="col-span-2">
                <p className="text-xs font-semibold text-muted-foreground">Delivery Terms</p>
                <p>{o.delivery_terms}</p>
              </div>
            )}
          </>
        )}
      </div>

      <BillToShipToDisplay billTo={o.client} shipTo={o.shipTo} />

      {hasItems && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Line Items</p>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Product</th>
                  <th className="text-right p-2">Ordered</th>
                  <th className="text-right p-2">Shipped</th>
                  <th className="text-right p-2">Returned</th>
                  <th className="text-right p-2">Pending</th>
                  <th className="text-right p-2">Rate</th>
                  <th className="text-right p-2">Disc %</th>
                  <th className="text-right p-2">GST %</th>
                  <th className="text-right p-2">Taxable</th>
                  <th className="text-right p-2">GST</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const isHighlighted = highlightLineId != null && String(it.id) === String(highlightLineId);
                  return (
                    <tr
                      key={it.id ?? idx}
                      className={`border-b last:border-0 ${isHighlighted ? "bg-amber-50/80 ring-1 ring-inset ring-amber-200" : ""}`}
                    >
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2">{it.product?.product_name ?? it.product_label ?? "-"}</td>
                      <td className="p-2 text-right">{it.ordered_qty ?? it.quantity ?? "-"}</td>
                      <td className="p-2 text-right">{it.shipped_qty ?? it.shipped_quantity ?? 0}</td>
                      <td className="p-2 text-right">{it.returned_qty ?? 0}</td>
                      <td className="p-2 text-right">{it.pending_qty ?? (it.quantity != null ? Number(it.quantity) : "-")}</td>
                      <td className="p-2 text-right">{formatCurrency(it.unit_rate) ?? "-"}</td>
                      <td className="p-2 text-right">{it.discount_percent ?? 0}</td>
                      <td className="p-2 text-right">{it.gst_percent ?? "-"}</td>
                      <td className="p-2 text-right">{formatCurrency(it.taxable_amount) ?? "-"}</td>
                      <td className="p-2 text-right">{formatCurrency(it.gst_amount) ?? "-"}</td>
                      <td className="p-2 text-right">{formatCurrency(it.total_amount) ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border-t pt-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Subtotal</p>
          <p>{formatCurrency(o.subtotal_amount) ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{applicableGstLabel}</p>
          <p>{applicableGstValue}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Total GST</p>
          <p>{formatCurrency(o.total_gst_amount) ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Round Off</p>
          <p className="font-semibold">{formatSignedCurrency(o.round_off_amount)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Final Amount</p>
          <p className="font-semibold">{formatCurrency(o.final_amount ?? o.grand_total) ?? "-"}</p>
        </div>
      </div>

      {o.remarks && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Remarks</p>
          <p className="text-sm">{o.remarks}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1">Attachments</p>
        {hasAttachments ? (
          <ul className="text-sm list-disc list-inside space-y-0.5">
            {attachments.map((att, i) => (
              <li key={i}>{att.filename ?? att.name ?? `File ${i + 1}`}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No attachments</p>
        )}
      </div>

      {!readOnly && canUpdate && o.status === "DRAFT" && (
        <div className="border-t pt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onConfirm?.(o)}>
            <IconCircleCheck className="size-4 mr-1" />
            Confirm Order
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => onCancel?.(o)}>
            Cancel Order
          </Button>
        </div>
      )}
    </div>
  );
}
