"use client";

import { formatDate } from "@/utils/dataTableUtils";

const formatCurrency = (v) =>
  v != null && !Number.isNaN(Number(v)) ? `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-";

const DetailRow = ({ label, value }) => (
  <div className="py-1">
    <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    <p className="text-sm">{value ?? "-"}</p>
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-sm font-semibold text-foreground mt-4 mb-2 pb-1 border-b border-border">{children}</h3>
);

export default function QuotationDetailsContent({ quotation, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!quotation) return null;

  const r = quotation;
  const bom = Array.isArray(r.bom_snapshot) ? r.bom_snapshot : [];

  return (
    <div className="pr-1 space-y-1">
      {/* Basic Details */}
      <SectionTitle>Basic Details</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <DetailRow label="Quotation Number" value={r.quotation_number || r.id} />
        <DetailRow label="Date" value={formatDate(r.quotation_date)} />
        <DetailRow label="Valid Till" value={formatDate(r.valid_till)} />
        <DetailRow label="Status" value={r.status} />
        <DetailRow label="Approved" value={r.is_approved ? "Yes" : "No"} />
        <DetailRow label="Created By" value={r.user?.name} />
        <DetailRow label="Branch" value={r.branch?.name} />
        <DetailRow label="Inquiry #" value={r.inquiry?.inquiry_number} />
      </div>

      {/* Customer Details */}
      <SectionTitle>Customer Details</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <DetailRow label="Order Type" value={r.orderType?.name} />
        <DetailRow label="Project Scheme" value={r.projectScheme?.name} />
        <DetailRow label="Project Capacity" value={r.project_capacity != null ? `${r.project_capacity} kW` : null} />
      </div>

      {/* BOM (Bill of Materials) */}
      {bom.length > 0 && (
        <>
          <SectionTitle>BOM Details</SectionTitle>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium">#</th>
                  <th className="text-left px-3 py-2 font-medium">Product</th>
                  <th className="text-left px-3 py-2 font-medium">Type</th>
                  <th className="text-right px-3 py-2 font-medium">Qty</th>
                  <th className="text-left px-3 py-2 font-medium">Unit</th>
                </tr>
              </thead>
              <tbody>
                {bom.map((line, idx) => {
                  const ps = line.product_snapshot || {};
                  return (
                    <tr key={idx} className="border-t border-border">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{ps.product_name ?? "-"}</td>
                      <td className="px-3 py-2">{ps.product_type_name ?? "-"}</td>
                      <td className="px-3 py-2 text-right">{line.quantity ?? "-"}</td>
                      <td className="px-3 py-2">{ps.unit ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pricing */}
      <SectionTitle>Pricing</SectionTitle>
      <div className="space-y-1">
        <DetailRow label="Project Cost" value={formatCurrency(r.total_project_value)} />
        <DetailRow label="Price Per KW" value={formatCurrency(r.price_per_kw)} />
        <DetailRow label="Structure Amount" value={formatCurrency(r.structure_amount)} />
        <DetailRow label="Netmeter Amount" value={formatCurrency(r.netmeter_amount)} />
        <DetailRow label="Stamp Charges" value={formatCurrency(r.stamp_charges)} />
        <DetailRow label="State Government Amount" value={formatCurrency(r.state_government_amount)} />
        <DetailRow label="Additional Cost 1" value={r.additional_cost_details_1 ? `${r.additional_cost_details_1}: ${formatCurrency(r.additional_cost_amount_1)}` : formatCurrency(r.additional_cost_amount_1)} />
        <DetailRow label="Additional Cost 2" value={r.additional_cost_details_2 ? `${r.additional_cost_details_2}: ${formatCurrency(r.additional_cost_amount_2)}` : formatCurrency(r.additional_cost_amount_2)} />
        <DetailRow label="Discount Type" value={r.discount_type} />
        <DetailRow label="Discount" value={formatCurrency(r.discount)} />
        <DetailRow label="GST Rate (%)" value={r.gst_rate != null ? `${r.gst_rate}%` : null} />
        <DetailRow label="Subsidy Amount" value={formatCurrency(r.subsidy_amount)} />
        <DetailRow label="State Subsidy Amount" value={formatCurrency(r.state_subsidy_amount)} />
      </div>

      {/* Final Totals */}
      <SectionTitle>Final Payable</SectionTitle>
      <div className="space-y-1">
        <DetailRow label="Total Payable" value={formatCurrency(r.total_payable)} />
        <DetailRow label="Effective Cost" value={formatCurrency(r.effective_cost)} />
      </div>

      {/* Technical Details */}
      {(r.structure_height || r.panel_quantity || r.inverter_quantity || r.battery_quantity || r.structure_material || r.panel_size || r.inverter_size) && (
        <>
          <SectionTitle>Technical Details</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
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
      <div className="space-y-1">
        <DetailRow label="System Warranty (Years)" value={r.system_warranty_years} />
        <DetailRow label="Payment Terms" value={r.payment_terms} />
        <DetailRow label="Remarks" value={r.remarks} />
      </div>

      {/* Graph Details */}
      {(r.graph_price_per_unit != null || r.graph_per_day_generation != null) && (
        <>
          <SectionTitle>Graph Generation</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <DetailRow label="Price Per Unit (₹/kWh)" value={r.graph_price_per_unit} />
            <DetailRow label="Per Day Generation (kWh)" value={r.graph_per_day_generation} />
            <DetailRow label="Yearly Increment in Price (%)" value={r.graph_yearly_increment_price} />
            <DetailRow label="Yearly Decrement in Generation (%)" value={r.graph_yearly_decrement_generation} />
          </div>
        </>
      )}

      {/* Attachments - Quotation model has no attachments; show placeholder */}
      <SectionTitle>Attachments</SectionTitle>
      <p className="text-sm text-muted-foreground italic">No attachments for quotations.</p>
    </div>
  );
}
