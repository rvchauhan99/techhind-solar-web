"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import serviceTicketService from "@/services/serviceTicketService";
import { getReferenceOptions } from "@/services/mastersService";
import { 
  IconClipboardData, IconUserPlus, IconMapPin, IconTool, 
  IconPackage, IconReceipt, IconShieldCheck, IconCheck,
  IconDownload, IconUpload, IconPlus
} from "@tabler/icons-react";

const STATUS_COLORS = {
  open: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  assigned: "bg-blue-50 text-blue-700 border border-blue-200",
  awaiting_payment: "bg-amber-50 text-amber-700 border border-amber-200",
  awaiting_warranty: "bg-purple-50 text-purple-700 border border-purple-200",
  closed: "bg-slate-100 text-slate-700 border border-slate-200",
};

export default function ServiceTicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [engineers, setEngineers] = useState([]);
  const [eligibleProducts, setEligibleProducts] = useState([]);
  const [siteVisit, setSiteVisit] = useState({ site_observations: "", issue_diagnosis: "", service_remarks: "" });
  const [completion, setCompletion] = useState({ work_performed: "", completion_remarks: "" });
  const [materialItems, setMaterialItems] = useState([{ product_id: "", quantity: 1 }]);
  const [payment, setPayment] = useState({
    service_invoice_id: "",
    payment_mode_id: "",
    company_bank_account_id: "",
    payment_amount: "",
    reference_number: "",
    transaction_id: "",
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [paymentModes, setPaymentModes] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, engRes, prodRes, modesRes, banksRes] = await Promise.all([
        serviceTicketService.getServiceTicketById(id),
        serviceTicketService.getServiceEngineers(),
        serviceTicketService.getEligibleProducts(id).catch(() => ({ result: [] })),
        getReferenceOptions("payment_mode.model", { limit: 50 }),
        getReferenceOptions("company_bank_account.model", { limit: 50 }),
      ]);
      const t = tRes?.result || tRes;
      setTicket(t);
      setEngineers(engRes?.result || engRes || []);
      setEligibleProducts(prodRes?.result || prodRes || []);
      setPaymentModes(modesRes?.result || modesRes || []);
      setBankAccounts(banksRes?.result || banksRes || []);
      const inv = t?.invoices?.[0];
      if (inv) setPayment((p) => ({ ...p, service_invoice_id: String(inv.id) }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const runAction = async (fn, successMsg) => {
    try {
      await fn();
      toast.success(successMsg);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
    }
  };

  const downloadPdf = async (fn, fallbackName) => {
    try {
      const { blob, filename } = await fn();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || fallbackName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to download PDF");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00823b]"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!ticket) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-slate-500">
          <p className="mb-4 text-lg">Ticket not found or you don't have access.</p>
          <Button onClick={() => router.push("/service/tickets")} variant="outline">Back to Tickets</Button>
        </div>
      </ProtectedRoute>
    );
  }

  const canClose = ticket.status !== "closed";

  return (
    <ProtectedRoute>
      <AddEditPageShell title={`Ticket ${ticket.ticket_no}`} backHref="/service/tickets">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-12">
          
          {/* Left Column */}
          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 p-4 pb-3 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <IconClipboardData size={20} className="text-[#00823b]" />
                  Ticket Summary
                </h3>
                <Badge className={`px-2 py-0.5 rounded-full uppercase text-[10px] tracking-wider shadow-none ${STATUS_COLORS[ticket.status] || "bg-slate-100 text-slate-700"}`}>
                  {ticket.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">PUI (Order No)</p>
                    <p className="font-medium text-slate-900">{ticket.order_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Customer</p>
                    <p className="font-medium text-slate-900">{ticket.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Call Type</p>
                    <p className="text-slate-900 flex items-center gap-2">
                      {ticket.call_type} 
                      {ticket.visit_charge > 0 && <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded">₹{ticket.visit_charge} fee</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Assigned Engineer</p>
                    <p className="text-slate-900">{ticket.engineer_name || <span className="text-slate-400 italic">Unassigned</span>}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {ticket.status === "open" && (
              <Card className="border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                    <IconUserPlus size={18} className="text-blue-500" />
                    Assign Engineer
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Select 
                        onValueChange={(val) => {
                          runAction(
                            () => serviceTicketService.assignServiceEngineer(id, { engineer_id: Number(val) }),
                            "Engineer assigned successfully"
                          );
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an engineer to assign" />
                        </SelectTrigger>
                        <SelectContent>
                          {engineers.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name || u.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3 pt-4 px-5">
                <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                  <IconMapPin size={18} className="text-amber-500" />
                  Site Visit details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Site Observations</label>
                  <Textarea className="min-h-[70px] text-sm resize-none" placeholder="What was observed at the site?" value={siteVisit.site_observations} onChange={(e) => setSiteVisit((p) => ({ ...p, site_observations: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Issue Diagnosis</label>
                  <Textarea className="min-h-[70px] text-sm resize-none" placeholder="Technical diagnosis of the issue" value={siteVisit.issue_diagnosis} onChange={(e) => setSiteVisit((p) => ({ ...p, issue_diagnosis: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Service Remarks</label>
                  <Textarea className="min-h-[50px] text-sm resize-none" placeholder="Additional remarks" value={siteVisit.service_remarks} onChange={(e) => setSiteVisit((p) => ({ ...p, service_remarks: e.target.value }))} />
                </div>
                <div className="pt-2 flex justify-end">
                  <Button className="bg-[#00823b] hover:bg-[#00602b]" onClick={() => runAction(() => serviceTicketService.recordSiteVisit(id, siteVisit), "Site visit details saved")}>
                    Save Site Visit
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3 pt-4 px-5">
                <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                  <IconTool size={18} className="text-teal-600" />
                  Service Completion
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Work Performed</label>
                  <Textarea className="min-h-[70px] text-sm resize-none" placeholder="Describe the work done to resolve the issue" value={completion.work_performed} onChange={(e) => setCompletion((p) => ({ ...p, work_performed: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Completion Remarks</label>
                  <Textarea className="min-h-[50px] text-sm resize-none" placeholder="Final remarks before closing" value={completion.completion_remarks} onChange={(e) => setCompletion((p) => ({ ...p, completion_remarks: e.target.value }))} />
                </div>
                <div className="pt-2 flex justify-end">
                  <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => runAction(() => serviceTicketService.recordServiceCompletion(id, completion), "Service completion recorded")}>
                    Mark as Completed
                  </Button>
                </div>
              </CardContent>
            </Card>

            {canClose && (
              <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-emerald-800 flex items-center gap-2 mb-1">
                      <IconCheck size={18} />
                      Ready to Close?
                    </h3>
                    <p className="text-xs text-emerald-600">Ensure all work and payments are recorded before closing.</p>
                  </div>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 shadow-md"
                    onClick={() => runAction(() => serviceTicketService.closeServiceTicket(id, {}), "Ticket closed successfully")}
                  >
                    Close Ticket
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3 pt-4 px-5">
                <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                  <IconPackage size={18} className="text-indigo-500" />
                  Material Request
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-3 mb-4">
                  {materialItems.map((item, idx) => (
                    <div key={idx} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1.5">
                        {idx === 0 && <label className="text-xs font-medium text-slate-700">Product</label>}
                        <Select 
                          value={item.product_id} 
                          onValueChange={(val) => {
                            const next = [...materialItems];
                            next[idx].product_id = val;
                            setMaterialItems(next);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Product" />
                          </SelectTrigger>
                          <SelectContent>
                            {eligibleProducts.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.product_name} <span className="text-xs text-slate-400">({p.warranty?.warranty_status})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 space-y-1.5">
                        {idx === 0 && <label className="text-xs font-medium text-slate-700">Qty</label>}
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const next = [...materialItems];
                            next[idx].quantity = e.target.value;
                            setMaterialItems(next);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center pt-2 pb-4 border-b border-slate-100 mb-4">
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setMaterialItems((p) => [...p, { product_id: "", quantity: 1 }])}>
                    <IconPlus size={14} /> Add Line
                  </Button>
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() =>
                      runAction(
                        () =>
                          serviceTicketService.createMaterialRequest(id, {
                            items: materialItems
                              .filter((i) => i.product_id)
                              .map((i) => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) || 1 })),
                          }),
                        "Material request created"
                      )
                    }
                  >
                    Create Request
                  </Button>
                </div>

                {ticket.materialRequests?.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Existing Requests</h4>
                    {ticket.materialRequests.map((mr) => (
                      <div key={mr.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-md">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-slate-700">Req #{mr.id}</span>
                          <Badge variant="outline" className="text-[10px] bg-white">{mr.status}</Badge>
                        </div>
                        {(mr.status === "draft" || mr.status === "reserved") && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs bg-white hover:bg-slate-100"
                            onClick={() => runAction(() => serviceTicketService.submitMaterialRequest(mr.id), "Material request submitted")}
                          >
                            Submit
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">No material requests created yet.</p>
                )}
              </CardContent>
            </Card>

            {(ticket.invoices || []).length > 0 && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3 pt-4 px-5">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                    <IconReceipt size={18} className="text-emerald-600" />
                    Invoices & Payments
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="space-y-4 mb-6">
                    {ticket.invoices.map((inv) => (
                      <div key={inv.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{inv.invoice_no}</p>
                            <p className="text-xs text-slate-500">Total: ₹{inv.total_amount} <span className="mx-1">•</span> Paid: <span className="text-emerald-600 font-medium">₹{inv.amount_paid}</span></p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] gap-1 px-2"
                            onClick={() => downloadPdf(() => serviceTicketService.downloadServiceInvoicePDF(inv.id), `service-invoice-${inv.id}.pdf`)}
                          >
                            <IconDownload size={14} /> PDF
                          </Button>
                        </div>
                        {(inv.payments || []).length > 0 && (
                          <div className="p-3 bg-white space-y-2">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Receipts</p>
                            {inv.payments.map((p) => (
                              <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b border-dashed border-slate-100 last:border-0 last:pb-0">
                                <span>{p.receipt_number || `#${p.id}`} — <span className="font-medium text-slate-800">₹{p.payment_amount}</span></span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px] gap-1 px-2 text-slate-500 hover:text-[#00823b]"
                                  onClick={() => downloadPdf(() => serviceTicketService.downloadServicePaymentReceiptPDF(p.id), `service-receipt-${p.id}.pdf`)}
                                >
                                  <IconDownload size={14} />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Record New Payment</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <Select value={payment.payment_mode_id} onValueChange={(v) => setPayment((p) => ({ ...p, payment_mode_id: v }))}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Payment Mode" /></SelectTrigger>
                          <SelectContent>
                            {paymentModes.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name || m.mode_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Select value={payment.company_bank_account_id} onValueChange={(v) => setPayment((p) => ({ ...p, company_bank_account_id: v }))}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Bank Account" /></SelectTrigger>
                          <SelectContent>
                            {bankAccounts.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.account_name || b.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Input className="bg-white" placeholder="Amount (₹)" value={payment.payment_amount} onChange={(e) => setPayment((p) => ({ ...p, payment_amount: e.target.value }))} />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Input className="bg-white" placeholder="Ref Number" value={payment.reference_number} onChange={(e) => setPayment((p) => ({ ...p, reference_number: e.target.value }))} />
                      </div>
                      <div className="col-span-2">
                        <Input className="bg-white" placeholder="Transaction ID" value={payment.transaction_id} onChange={(e) => setPayment((p) => ({ ...p, transaction_id: e.target.value }))} />
                      </div>
                      <div className="col-span-2">
                        <label className="flex items-center justify-center w-full h-10 border-2 border-dashed border-slate-300 rounded-md bg-white hover:bg-slate-50 cursor-pointer transition-colors">
                          <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                            <IconUpload size={16} />
                            {receiptFile ? receiptFile.name : "Upload Receipt Document"}
                          </span>
                          <input type="file" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button
                        className="bg-[#00823b] hover:bg-[#00602b]"
                        onClick={() => {
                          const fd = new FormData();
                          Object.entries(payment).forEach(([k, v]) => v && fd.append(k, v));
                          if (receiptFile) fd.append("receipt_file", receiptFile);
                          runAction(() => serviceTicketService.recordServicePayment(id, fd), "Payment recorded successfully");
                        }}
                      >
                        Record Payment
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {(ticket.warrantyClaims || []).length > 0 && (
              <Card className="border-slate-200 shadow-sm border-t-4 border-t-orange-400">
                <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3 pt-4 px-5">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                    <IconShieldCheck size={18} className="text-orange-500" />
                    Warranty Claims
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-slate-100">
                    {ticket.warrantyClaims.map((c) => (
                      <li key={c.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                            <IconShieldCheck size={16} />
                          </div>
                          <span className="font-medium text-slate-800">{c.claim_no}</span>
                        </div>
                        <Badge variant="outline" className="uppercase text-[10px] bg-slate-50">{c.status}</Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
