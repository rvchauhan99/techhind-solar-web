"use client";

import { useMemo } from "react";
import { formatDate } from "@/utils/dataTableUtils";
import { getBomLineProduct } from "@/utils/bomUtils";
import { calculateTotals } from "./quotation/quotationCalculations";

const formatCurrency = (v) =>
  v != null && !Number.isNaN(Number(v)) ? `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-";

const DetailRow = ({ label, value }) => (
  <div className="py-0.5">
    <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
    <p className="text-xs">{value ?? "-"}</p>
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mt-2.5 mb-1 pb-0.5 border-b border-border">
    {children}
  </h3>
);

export default function QuotationDetailsContent({ quotation, loading }) {
  const totals = useMemo(() => {
    if (!quotation) return null;
    const r = quotation;
    const computed = calculateTotals({
      total_project_value: r.total_project_value,
      netmeter_amount: r.netmeter_amount,
      stamp_charges: r.stamp_charges,
      state_government_amount: r.state_government_amount,
      structure_amount: r.structure_amount,
      additional_cost_amount_1: r.additional_cost_amount_1,
      additional_cost_amount_2: r.additional_cost_amount_2,
      discount: r.discount,
      gst_rate: r.gst_rate,
      subsidy_amount: r.subsidy_amount,
      state_subsidy_amount: r.state_subsidy_amount,
    });
    return {
      totalPayable: r.total_payable != null ? Number(r.total_payable) : computed.totalPayable,
      effectiveCost: r.effective_cost != null ? Number(r.effective_cost) : computed.effectiveCost,
      gstAmount: computed.gstAmount,
    };
  }, [quotation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!quotation) return null;

  const r = quotation;
  const rawBom = Array.isArray(r.bom_snapshot) ? r.bom_snapshot : [];
  const bom = [...rawBom].sort((a, b) => {
    const orderA = a.sort_order != null && !Number.isNaN(Number(a.sort_order)) ? Number(a.sort_order) : Number.MAX_SAFE_INTEGER;
    const orderB = b.sort_order != null && !Number.isNaN(Number(b.sort_order)) ? Number(b.sort_order) : Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
  const totalPayable = totals?.totalPayable ?? r.total_payable;
  const effectiveCost = totals?.effectiveCost ?? r.effective_cost;
  const gstAmount = totals?.gstAmount;

  return (
    <div className="pr-1 space-y-0.5">
      {/* Hero Summary Block */}
      <div
        className="rounded border border-border bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-900/50 dark:to-slate-800/50 p-2.5 border-l-4 border-l-[#00823b]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{r.quotation_number || `#${r.id}`}</p>
            <p className="text-sm font-semibold text-[#00823b] mt-0.5">
              {r.project_capacity != null ? `${Number(r.project_capacity)} kW` : "-"}
              <span className="text-slate-600 dark:text-slate-400 font-normal ml-1.5">
                · {formatCurrency(totalPayable)}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                r.status === "Converted"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                  : r.status === "Sent"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                  : r.status === "Draft"
                  ? "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              }`}
            >
              {r.status || "Draft"}
            </span>
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                r.is_approved ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              {r.is_approved ? "Approved" : "Not Approved"}
            </span>
          </div>
        </div>
      </div>

      {/* Basic Details */}
      <SectionTitle>Basic Details</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow label="Quotation Number" value={r.quotation_number || r.id} />
        <DetailRow label="Date" value={formatDate(r.quotation_date)} />
        <DetailRow label="Valid Till" value={formatDate(r.valid_till)} />
        <DetailRow label="Created By" value={r.user?.name} />
        <DetailRow label="Branch" value={r.branch?.name} />
        <DetailRow label="Inquiry #" value={r.inquiry?.inquiry_number} />
      </div>

      {/* Customer Details */}
      <SectionTitle>Customer Details</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow label="Customer Name" value={r.customer_name || r.customer?.customer_name} />
        <DetailRow label="Mobile" value={r.mobile_number || r.customer?.mobile_number} />
        <DetailRow label="Email" value={r.email || r.customer?.email_id} />
        <DetailRow label="Company Name" value={r.company_name || r.customer?.company_name} />
        <DetailRow label="State" value={r.state?.name} />
        <div className="sm:col-span-2">
          <DetailRow label="Address" value={r.address} />
        </div>
      </div>

      {/* Project Details */}
      <SectionTitle>Project Details</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow label="Order Type" value={r.orderType?.name} />
        <DetailRow label="Project Scheme" value={r.projectScheme?.name} />
        <DetailRow label="Project Capacity" value={r.project_capacity != null ? `${r.project_capacity} kW` : null} />
      </div>

      {/* BOM Details */}
      {bom.length > 0 && (
        <>
          <SectionTitle>BOM Details</SectionTitle>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-2 py-1.5 font-medium">#</th>
                  <th className="text-left px-2 py-1.5 font-medium">Product</th>
                  <th className="text-left px-2 py-1.5 font-medium">Type</th>
                  <th className="text-right px-2 py-1.5 font-medium">Qty</th>
                  <th className="text-left px-2 py-1.5 font-medium">Unit</th>
                </tr>
              </thead>
              <tbody>
                {bom.map((line, idx) => {
                  const p = getBomLineProduct(line) || {};
                  return (
                    <tr key={idx} className="border-t border-border">
                      <td className="px-2 py-1.5">{idx + 1}</td>
                      <td className="px-2 py-1.5">{p.product_name ?? "-"}</td>
                      <td className="px-2 py-1.5">{p.product_type_name ?? "-"}</td>
                      <td className="px-2 py-1.5 text-right">{line.quantity ?? "-"}</td>
                      <td className="px-2 py-1.5">{p.measurement_unit_name ?? p.unit ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Project Price Details */}
      <SectionTitle>Project Price Details</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow label="Project Capacity" value={r.project_capacity != null ? `${r.project_capacity} kW` : null} />
        <DetailRow label="Price Per KW" value={formatCurrency(r.price_per_kw)} />
        <DetailRow label="Total Project Value" value={formatCurrency(r.total_project_value)} />
        <DetailRow label="Structure Amount" value={formatCurrency(r.structure_amount)} />
        <DetailRow label="Subsidy Amount" value={formatCurrency(r.subsidy_amount)} />
        <DetailRow label="State Subsidy Amount" value={formatCurrency(r.state_subsidy_amount)} />
        <DetailRow label="Netmeter Amount" value={formatCurrency(r.netmeter_amount)} />
        <DetailRow label="Stamp Charges" value={formatCurrency(r.stamp_charges)} />
        <DetailRow label="GEDA Application Amount" value={formatCurrency(r.state_government_amount)} />
        <DetailRow label="Discount Type" value={r.discount_type} />
        <DetailRow label="Discount" value={formatCurrency(r.discount)} />
        <DetailRow label="GST Rate (%)" value={r.gst_rate != null ? `${r.gst_rate}%` : null} />
        <DetailRow
          label="Additional Cost 1"
          value={r.additional_cost_details_1 ? `${r.additional_cost_details_1}: ${formatCurrency(r.additional_cost_amount_1)}` : formatCurrency(r.additional_cost_amount_1)}
        />
        <DetailRow
          label="Additional Cost 2"
          value={r.additional_cost_details_2 ? `${r.additional_cost_details_2}: ${formatCurrency(r.additional_cost_amount_2)}` : formatCurrency(r.additional_cost_amount_2)}
        />
      </div>

      {/* Final Payable */}
      <SectionTitle>Final Payable</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow label="Project Cost" value={formatCurrency(r.total_project_value)} />
        <DetailRow label="Netmeter (+)" value={formatCurrency(r.netmeter_amount)} />
        <DetailRow label="Stamp Charges (+)" value={formatCurrency(r.stamp_charges)} />
        <DetailRow label="GEDA Application Amount (+)" value={formatCurrency(r.state_government_amount)} />
        <DetailRow label="Structure (+)" value={formatCurrency(r.structure_amount)} />
        <DetailRow label="Additional Amt 1 (+)" value={formatCurrency(r.additional_cost_amount_1)} />
        <DetailRow label="Additional Amt 2 (+)" value={formatCurrency(r.additional_cost_amount_2)} />
        <DetailRow label="Discount (-)" value={formatCurrency(r.discount)} />
        <DetailRow label="GST (+)" value={formatCurrency(gstAmount ?? r.gst_amount)} />
        <DetailRow label="Total Payable (=)" value={formatCurrency(totalPayable)} />
        <DetailRow label="Subsidy Amount (-)" value={formatCurrency(r.subsidy_amount)} />
        <DetailRow label="State Subsidy (-)" value={formatCurrency(r.state_subsidy_amount)} />
        <DetailRow label="Effective Cost (=)" value={formatCurrency(effectiveCost)} />
      </div>

      {/* Technical Details */}
      {(r.structure_height || r.panel_quantity || r.inverter_quantity || r.battery_quantity || r.structure_material || r.panel_size || r.inverter_size) && (
        <>
          <SectionTitle>Technical Details</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
            {r.structure_height && <DetailRow label="Structure Height" value={r.structure_height} />}
            {r.structure_material && <DetailRow label="Structure Material" value={r.structure_material} />}
            {r.panel_size && <DetailRow label="Panel Size" value={r.panel_size} />}
            {r.panel_quantity != null && <DetailRow label="Panel Qty" value={r.panel_quantity} />}
            {r.inverter_size && <DetailRow label="Inverter Size" value={r.inverter_size} />}
            {r.inverter_quantity != null && <DetailRow label="Inverter Qty" value={r.inverter_quantity} />}
            {r.battery_quantity != null && <DetailRow label="Battery Qty" value={r.battery_quantity} />}
          </div>
        </>
      )}

      {/* Terms */}
      <SectionTitle>Terms</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
        <DetailRow label="System Warranty (Years)" value={r.system_warranty_years} />
        <div className="sm:col-span-2">
          <DetailRow label="Payment Terms" value={r.payment_terms} />
        </div>
        <div className="sm:col-span-2">
          <DetailRow label="Remarks" value={r.remarks} />
        </div>
      </div>

      {/* Graph Generation */}
      {(r.graph_price_per_unit != null ||
        r.graph_per_day_generation != null ||
        r.graph_yearly_increment_price != null ||
        r.graph_yearly_decrement_generation != null) && (
        <>
          <SectionTitle>Graph Generation</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
            <DetailRow label="Price Per Unit (₹/kWh)" value={r.graph_price_per_unit} />
            <DetailRow label="Per Day Generation (kWh)" value={r.graph_per_day_generation} />
            <DetailRow label="Yearly Increment in Price (%)" value={r.graph_yearly_increment_price} />
            <DetailRow label="Yearly Decrement in Generation (%)" value={r.graph_yearly_decrement_generation} />
          </div>
        </>
      )}
    </div>
  );
}
