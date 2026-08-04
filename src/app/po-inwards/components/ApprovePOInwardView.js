"use client";

import { useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from "@/components/ui/card";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import FormGrid from "@/components/common/FormGrid";
import LoadingButton from "@/components/common/LoadingButton";
import { cn } from "@/lib/utils";
import {
  PO_INWARD_IMPORT_CHARGE_TYPES,
} from "@/constants/poInwardImportCharges";
import {
  allocateLandedCost,
  buildAllocationItems,
} from "@/utils/poInwardImportCosting";
import { formatCurrency, formatDate } from "@/utils/dataTableUtils";
import { 
  IconDownload, IconTrash, IconUpload, IconReceipt, IconBuildingStore, 
  IconCalendar, IconMapPin, IconFileText, IconCheck, IconX, IconPlaneDeparture,
  IconCoins, IconCurrencyRupee, IconFileImport, IconPaperclip, IconInfoCircle, IconCash
} from "@tabler/icons-react";

const txt = (v) => (v == null || v === "" ? "-" : String(v));

export default function ApprovePOInwardView({
  inward,
  form,
  errors = {},
  existingAttachments = [],
  pendingFiles = [],
  saving = false,
  approving = false,
  onFormChange,
  onPendingFilesChange,
  onOpenAttachment,
  onRemoveExistingAttachment,
  onCancel,
  onSave,
  onApprove,
  attachmentLoadingIndex = null,
}) {
  const fileRef = useRef(null);
  const isImport = !!inward?.is_import;
  const currencyCode = String(inward?.currency_code || "INR").toUpperCase();
  const exchangeRate =
    Number(inward?.exchange_rate) > 0 ? Number(inward.exchange_rate) : 1;

  const setField = (name, value) => {
    onFormChange?.({ ...form, [name]: value });
  };

  const setChargeAmount = (chargeType, value) => {
    onFormChange?.({
      ...form,
      charges: (form.charges || []).map((row) =>
        row.charge_type === chargeType ? { ...row, amount_inr: value } : row
      ),
    });
  };

  const allocation = useMemo(() => {
    if (!isImport || !inward) return null;
    const items = buildAllocationItems(inward.items || [], exchangeRate);
    return allocateLandedCost(items, form?.charges || []);
  }, [isImport, inward, form?.charges, exchangeRate]);

  const domesticTotals = useMemo(() => {
    if (isImport || !inward) return null;
    return (inward.items || []).reduce(
      (acc, it) => {
        const qty = Number(it.accepted_quantity) || 0;
        const rate = Number(it.rate) || 0;
        const gstPercent = Number(it.gst_percent) || 0;
        const taxable = rate * qty;
        const gst = (taxable * gstPercent) / 100;
        acc.qty += qty;
        acc.taxable += taxable;
        acc.gst += gst;
        acc.total += taxable + gst;
        return acc;
      },
      { qty: 0, taxable: 0, gst: 0, total: 0 }
    );
  }, [isImport, inward]);

  const acceptedQtyTotal = (inward?.items || []).reduce(
    (s, it) => s + (Number(it.accepted_quantity) || 0),
    0
  );

  const busy = saving || approving;

  const onPickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    onPendingFilesChange?.([...(pendingFiles || []), ...files]);
    e.target.value = "";
  };

  const removePending = (index) => {
    onPendingFilesChange?.((pendingFiles || []).filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2 pb-20 relative min-h-[calc(100vh-100px)]">
      
      {/* Hero Header Card */}
      <Card className="border border-slate-200 shadow-sm bg-white text-slate-900 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 text-slate-900 pointer-events-none">
          {isImport ? <IconPlaneDeparture size={80} /> : <IconReceipt size={80} />}
        </div>
        <CardContent className="p-3 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                  <IconReceipt size={20} stroke={2} />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-800">
                  {txt(inward?.receipt_number || inward?.id)}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-medium py-0 h-5">
                  {txt(inward?.status)}
                </Badge>
                {isImport && (
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-medium py-0 h-5">
                    Import Inward
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold mb-0.5">Total Value</p>
              <div className="text-xl font-bold text-emerald-600 flex items-center md:justify-end gap-1">
                <IconCurrencyRupee size={20} />
                {isImport && allocation ? formatCurrency(allocation.landed_total_inr || 0, "") : formatCurrency(domesticTotals?.total || 0, "")}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                <IconFileText size={12} /> Purchase Order
              </span>
              <span className="font-semibold text-xs text-slate-800">{txt(inward?.purchaseOrder?.po_number)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                <IconBuildingStore size={12} /> Supplier
              </span>
              <span className="font-semibold text-xs text-slate-800 truncate" title={txt(inward?.supplier?.supplier_name)}>
                {txt(inward?.supplier?.supplier_name)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                <IconMapPin size={12} /> Warehouse
              </span>
              <span className="font-semibold text-xs text-slate-800">{txt(inward?.warehouse?.name)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                <IconCalendar size={12} /> Received At
              </span>
              <span className="font-semibold text-xs text-slate-800">{inward?.received_at ? formatDate(inward.received_at) : "-"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Details & Expenses */}
      {isImport && (
        <Card className="border-indigo-100 shadow-md shadow-indigo-100/50 overflow-hidden group">
          <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-transparent border-b border-indigo-50 p-2 px-3">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-indigo-100 text-indigo-600 rounded-md group-hover:scale-110 transition-transform">
                <IconFileImport size={16} />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-indigo-900">Import Details & Compliance</CardTitle>
                <CardDescription className="text-indigo-600/70 text-[10px]">
                  BOE is required to approve. Import IGST is ITC only and not inventoriable.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            <div className="bg-slate-50/50 rounded-lg p-2.5 border border-slate-100">
              <FormGrid cols={2} className="lg:grid-cols-4 gap-2">
                <Input
                  name="bill_of_entry_number"
                  label="Bill of Entry No. *"
                  value={form.bill_of_entry_number}
                  onChange={(e) => setField("bill_of_entry_number", e.target.value)}
                  error={!!errors.bill_of_entry_number}
                  helperText={errors.bill_of_entry_number}
                  className="bg-white"
                />
                <DateField
                  name="bill_of_entry_date"
                  label="Bill of Entry Date *"
                  value={form.bill_of_entry_date}
                  onChange={(e) => setField("bill_of_entry_date", e.target.value)}
                  error={!!errors.bill_of_entry_date}
                  helperText={errors.bill_of_entry_date}
                />
                <Input
                  name="container_number"
                  label="Container No."
                  value={form.container_number}
                  onChange={(e) => setField("container_number", e.target.value)}
                  className="bg-white"
                />
                <Input
                  name="seal_number"
                  label="Seal No."
                  value={form.seal_number}
                  onChange={(e) => setField("seal_number", e.target.value)}
                  className="bg-white"
                />
                <Input
                  name="shipping_line"
                  label="Shipping Line"
                  value={form.shipping_line}
                  onChange={(e) => setField("shipping_line", e.target.value)}
                  className="bg-white"
                />
                <Input
                  name="vessel"
                  label="Vessel"
                  value={form.vessel}
                  onChange={(e) => setField("vessel", e.target.value)}
                  className="bg-white"
                />
                <Input
                  name="bill_of_lading"
                  label="Bill of Lading"
                  value={form.bill_of_lading}
                  onChange={(e) => setField("bill_of_lading", e.target.value)}
                  className="bg-white"
                />
                <Input
                  name="air_way_bill"
                  label="Air Way Bill"
                  value={form.air_way_bill}
                  onChange={(e) => setField("air_way_bill", e.target.value)}
                  className="bg-white"
                />
                <DateField
                  name="etd"
                  label="ETD"
                  value={form.etd}
                  onChange={(e) => setField("etd", e.target.value)}
                />
                <DateField
                  name="eta"
                  label="ETA"
                  value={form.eta}
                  onChange={(e) => setField("eta", e.target.value)}
                />
              </FormGrid>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <IconCash className="text-emerald-500" size={16} />
                <h3 className="text-xs font-bold text-slate-700">Import Expenses (INR)</h3>
                <div className="h-px bg-slate-200 flex-1 ml-2"></div>
                <div className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                  Exchange Rate: <span className="text-slate-700">{exchangeRate}</span>
                </div>
              </div>
              <div className="bg-emerald-50/30 rounded-lg p-2.5 border border-emerald-100/50">
                <FormGrid cols={2} className="lg:grid-cols-4 gap-2">
                  {(form.charges || []).map((c) => {
                    const meta = PO_INWARD_IMPORT_CHARGE_TYPES.find(
                      (x) => x.charge_type === c.charge_type
                    );
                    return (
                      <Input
                        key={c.charge_type}
                        type="number"
                        name={`charge_${c.charge_type}`}
                        label={meta?.label || c.charge_type}
                        value={c.amount_inr}
                        onChange={(e) => setChargeAmount(c.charge_type, e.target.value)}
                        inputProps={{ min: 0, step: "0.01" }}
                        className="bg-white font-medium text-emerald-900 focus-visible:ring-emerald-500"
                      />
                    );
                  })}
                </FormGrid>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two Column Layout for Attachments and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        
        {/* Attachments */}
        <Card className="lg:col-span-1 shadow-sm border-slate-200 h-full flex flex-col">
          <CardHeader className="p-2 px-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-slate-100 text-slate-600 rounded-md">
                  <IconPaperclip size={14} />
                </div>
                <CardTitle className="text-sm">Documents</CardTitle>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px] font-medium bg-slate-50 hover:bg-slate-100 transition-colors"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                <IconUpload className="size-3 mr-1 text-blue-500" />
                Upload
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={onPickFiles}
            />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-1.5 p-3">
            {existingAttachments.length === 0 && pendingFiles.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-3 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 text-slate-400 min-h-[80px]">
                <IconUpload className="size-6 mb-1 opacity-50" />
                <p className="text-xs font-medium">No files uploaded</p>
              </div>
            )}

            {existingAttachments.length > 0 && (
              <div className="space-y-1.5">
                {existingAttachments.map((att, index) => (
                  <div
                    key={`${att.path || att.filename}-${index}`}
                    className="group flex items-center justify-between gap-1.5 rounded-md border border-slate-200 bg-white p-1.5 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 bg-blue-50 text-blue-600 rounded shrink-0 group-hover:bg-blue-100 transition-colors">
                        <IconFileText size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[11px] text-slate-700 group-hover:text-blue-700 transition-colors">
                          {att.filename || att.path || `Document ${index + 1}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="h-5 w-5 hover:bg-blue-50 hover:text-blue-600"
                        disabled={busy || attachmentLoadingIndex === index}
                        onClick={() => onOpenAttachment?.(index)}
                      >
                        <IconDownload className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="h-5 w-5 hover:bg-red-50 hover:text-red-600 text-slate-400"
                        disabled={busy}
                        onClick={() => onRemoveExistingAttachment?.(index)}
                      >
                        <IconTrash className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingFiles.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <p className="text-[9px] uppercase font-bold tracking-wider text-amber-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Unsaved Files
                </p>
                {pendingFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-1.5 rounded-md border border-dashed border-amber-300 bg-amber-50 p-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 bg-amber-100 text-amber-600 rounded shrink-0">
                        <IconFileText size={14} />
                      </div>
                      <span className="truncate font-medium text-[11px] text-amber-900">{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="h-5 w-5 text-amber-600 hover:bg-amber-100 hover:text-amber-800"
                      disabled={busy}
                      onClick={() => removePending(index)}
                    >
                      <IconX className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 h-full flex flex-col">
          <CardHeader className="p-2 px-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-slate-100 text-slate-600 rounded-md">
                <IconCoins size={14} />
              </div>
              <CardTitle className="text-sm">Valuation Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-3">
            {isImport && allocation ? (
              <div className="flex flex-col h-full space-y-2">
                <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm flex-1 flex flex-col bg-white">
                  <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-600">Landed Cost Allocation</span>
                    <Badge variant="outline" className="bg-white text-[9px] font-medium px-1.5 py-0 h-4">INR</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="px-2.5 py-1.5 text-left font-medium">Product</th>
                          <th className="px-2.5 py-1.5 text-right font-medium">Qty</th>
                          <th className="px-2.5 py-1.5 text-right font-medium">{currencyCode}</th>
                          <th className="px-2.5 py-1.5 text-right font-medium">PO INR</th>
                          <th className="px-2.5 py-1.5 text-right font-medium text-indigo-600 bg-indigo-50/30">Allocated</th>
                          <th className="px-2.5 py-1.5 text-right font-semibold text-slate-700 bg-slate-50/50">Landed/u</th>
                          <th className="px-2.5 py-1.5 text-right font-semibold text-slate-700 bg-slate-50/50">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(allocation.lines || []).map((line, idx) => (
                          <tr key={line.item?.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-2.5 py-1.5 font-medium text-slate-700">{txt(line.item?.product?.product_name)}</td>
                            <td className="px-2.5 py-1.5 text-right text-slate-600">{line.accepted_quantity}</td>
                            <td className="px-2.5 py-1.5 text-right text-slate-500">
                              {line.rate_fc != null ? Number(line.rate_fc).toFixed(2) : "-"}
                            </td>
                            <td className="px-2.5 py-1.5 text-right text-slate-600">{formatCurrency(line.rate_inr_po)}</td>
                            <td className="px-2.5 py-1.5 text-right text-indigo-600 font-medium bg-indigo-50/10">{formatCurrency(line.allocated_charges_inr)}</td>
                            <td className="px-2.5 py-1.5 text-right font-semibold text-slate-800 bg-slate-50/30">
                              {formatCurrency(line.landed_unit_inr)}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-bold text-slate-800 bg-slate-50/30">{formatCurrency(line.landed_line_inr)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">Total Qty</span>
                    <span className="text-sm font-bold text-slate-800">{acceptedQtyTotal}</span>
                  </div>
                  <div className="bg-indigo-50/50 rounded-lg p-2 border border-indigo-100 flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-500 mb-0.5">Inventoriable</span>
                    <span className="text-sm font-bold text-indigo-700">{formatCurrency(allocation.inventoriable_charges_inr || 0)}</span>
                  </div>
                  <div className="bg-amber-50/50 rounded-lg p-2 border border-amber-100 flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-amber-600 mb-0.5">ITC (Non-Inv)</span>
                    <span className="text-sm font-bold text-amber-700">{formatCurrency(allocation.non_inventoriable_charges_inr || 0)}</span>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200 flex flex-col justify-center shadow-sm">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-600 mb-0.5">Total Landed</span>
                    <span className="text-base font-black text-emerald-700">{formatCurrency(allocation.landed_total_inr || 0)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full space-y-2">
                <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm flex-1 flex flex-col bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="px-2.5 py-1.5 text-left font-semibold uppercase tracking-wider text-[9px]">Product</th>
                          <th className="px-2.5 py-1.5 text-right font-semibold uppercase tracking-wider text-[9px]">Qty</th>
                          <th className="px-2.5 py-1.5 text-right font-semibold uppercase tracking-wider text-[9px]">Rate</th>
                          <th className="px-2.5 py-1.5 text-right font-semibold uppercase tracking-wider text-[9px]">GST%</th>
                          <th className="px-2.5 py-1.5 text-right font-semibold uppercase tracking-wider text-[9px]">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(inward?.items || []).map((it, idx) => (
                          <tr key={it.id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-2.5 py-1.5 font-medium text-slate-700">{txt(it.product?.product_name)}</td>
                            <td className="px-2.5 py-1.5 text-right text-slate-600">{it.accepted_quantity}</td>
                            <td className="px-2.5 py-1.5 text-right text-slate-600">{formatCurrency(it.rate || 0)}</td>
                            <td className="px-2.5 py-1.5 text-right text-slate-500">
                              <Badge variant="outline" className="text-[9px] h-4 px-1 font-medium">{txt(it.gst_percent)}%</Badge>
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-semibold text-slate-800">{formatCurrency(it.total_amount || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {domesticTotals && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-auto">
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 flex flex-col justify-center">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">Total Qty</span>
                      <span className="text-sm font-bold text-slate-800">{domesticTotals.qty}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 flex flex-col justify-center">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">Taxable</span>
                      <span className="text-sm font-bold text-slate-700">{formatCurrency(domesticTotals.taxable)}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 flex flex-col justify-center">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">GST</span>
                      <span className="text-sm font-bold text-slate-700">{formatCurrency(domesticTotals.gst)}</span>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200 flex flex-col justify-center shadow-sm">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-600 mb-0.5">Grand Total</span>
                      <span className="text-base font-black text-emerald-700">{formatCurrency(domesticTotals.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 lg:left-[260px] right-0 z-50 p-3 pointer-events-none">
        <div className="max-w-screen-2xl mx-auto flex justify-end pointer-events-auto">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl rounded-xl p-1.5 pl-3">
            <div className="hidden sm:flex items-center gap-1.5 mr-3 text-[10px] font-medium text-slate-500">
              <IconInfoCircle size={12} className="text-blue-500" />
              Approving posts stock
            </div>
            
            <div className="hidden sm:block h-6 w-px bg-slate-200 mx-1"></div>
            
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-medium h-8 text-xs"
              disabled={busy} 
              onClick={onCancel}
            >
              Cancel
            </Button>
            
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              loading={saving}
              disabled={busy}
              onClick={onSave}
              className="rounded-lg font-medium border-slate-200 h-8 text-xs"
            >
              Save Details
            </LoadingButton>
            
            <LoadingButton
              type="button"
              variant="success"
              size="sm"
              loading={approving}
              disabled={busy}
              onClick={onApprove}
              className="rounded-lg font-semibold h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0"
            >
              <IconCheck size={14} className="mr-1" />
              Approve
            </LoadingButton>
          </div>
        </div>
      </div>
      
    </div>
  );
}
