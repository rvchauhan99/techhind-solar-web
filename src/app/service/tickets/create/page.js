"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { IconClipboardCheck, IconUser, IconAlertTriangle, IconTool, IconCalendar } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import AutocompleteField from "@/components/common/AutocompleteField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import serviceTicketService from "@/services/serviceTicketService";

export default function CreateServiceTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [engineers, setEngineers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [touched, setTouched] = useState({
    engineer_id: false,
    service_category_id: false,
    service_type_id: false,
    service_priority_id: false,
  });
  const [form, setForm] = useState({
    reported_issue: "",
    customer_remarks: "",
    engineer_id: "unassigned",
    service_category_id: "",
    service_type_id: "",
    service_priority_id: "",
  });

  const markTouched = (field) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const updateFormField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    (async () => {
      const results = await Promise.allSettled([
        serviceTicketService.getOrderServiceContext(orderId),
        serviceTicketService.getServiceEngineers(),
        serviceTicketService.getServiceTicketReferenceOptions(),
      ]);

      const [ctxResult, engResult, refsResult] = results;

      if (ctxResult.status === "fulfilled") {
        setContext(ctxResult.value?.result || ctxResult.value || null);
      } else {
        toast.error(
          ctxResult.reason?.response?.data?.message || "Failed to load order context"
        );
      }

      if (engResult.status === "fulfilled") {
        setEngineers(engResult.value?.result || engResult.value || []);
      } else {
        toast.error("Failed to load active users");
      }

      if (refsResult.status === "fulfilled") {
        const refs = refsResult.value?.result || refsResult.value || {};
        setCategories(Array.isArray(refs.categories) ? refs.categories : []);
        setTypes(Array.isArray(refs.types) ? refs.types : []);
        setPriorities(Array.isArray(refs.priorities) ? refs.priorities : []);
      } else {
        toast.error(
          refsResult.reason?.response?.data?.message || "Failed to load service reference options"
        );
      }

      setLoading(false);
    })();
  }, [orderId]);

  const selectedCategoryId = Number(form.service_category_id || 0);
  const typeOptions =
    selectedCategoryId > 0
      ? types.filter((t) => Number(t.service_category_id) === selectedCategoryId)
      : types;

  useEffect(() => {
    if (!selectedCategoryId || !form.service_type_id || touched.service_type_id) return;
    const typeMatchesCategory = typeOptions.some(
      (t) => String(t.id) === String(form.service_type_id)
    );
    if (!typeMatchesCategory) {
      updateFormField("service_type_id", "");
    }
  }, [selectedCategoryId, form.service_type_id, touched.service_type_id, typeOptions]);

  useEffect(() => {
    if (prefillApplied || !context) return;
    if (!categories.length || !types.length || !priorities.length) return;

    const latestTicket = context?.service_history?.tickets?.[0] || null;
    const defaultCategoryId = latestTicket?.service_category_id
      ? String(latestTicket.service_category_id)
      : String(categories[0]?.id || "");
    const defaultPriorityByCallType = (callType) => {
      if (callType === "PAID") {
        const high = priorities.find((p) =>
          String(p.priority || p.name || p.label || "").toLowerCase().includes("high")
        );
        return high ? String(high.id) : "";
      }
      const medium = priorities.find((p) =>
        String(p.priority || p.name || p.label || "").toLowerCase().includes("medium")
      );
      return medium ? String(medium.id) : "";
    };
    const defaultPriorityId = latestTicket?.service_priority_id
      ? String(latestTicket.service_priority_id)
      : defaultPriorityByCallType(context?.amc?.call_type) ||
        String(priorities[0]?.id || "");

    const scopedTypes =
      defaultCategoryId
        ? types.filter((t) => String(t.service_category_id) === String(defaultCategoryId))
        : types;
    const defaultTypeId = latestTicket?.service_type_id
      ? String(latestTicket.service_type_id)
      : String(scopedTypes[0]?.id || "");

    setForm((prev) => ({
      ...prev,
      service_category_id:
        !touched.service_category_id && !prev.service_category_id
          ? defaultCategoryId
          : prev.service_category_id,
      service_type_id:
        !touched.service_type_id && !prev.service_type_id ? defaultTypeId : prev.service_type_id,
      service_priority_id:
        !touched.service_priority_id && !prev.service_priority_id
          ? defaultPriorityId
          : prev.service_priority_id,
    }));
    setPrefillApplied(true);
  }, [prefillApplied, context, categories, types, priorities, touched]);

  const handleSubmit = useCallback(async () => {
    if (!orderId) return;
    setSubmitting(true);
    try {
      const payload = {
        order_id: Number(orderId),
        reported_issue: form.reported_issue,
        customer_remarks: form.customer_remarks,
        engineer_id: form.engineer_id !== "unassigned" ? Number(form.engineer_id) : undefined,
        service_category_id: form.service_category_id ? Number(form.service_category_id) : undefined,
        service_type_id: form.service_type_id ? Number(form.service_type_id) : undefined,
        service_priority_id: form.service_priority_id ? Number(form.service_priority_id) : undefined,
      };
      const res = await serviceTicketService.createServiceTicket(payload);
      const ticket = res?.result || res;
      toast.success("Service ticket created successfully");
      router.push(`/service/tickets/${ticket.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  }, [orderId, form, router]);

  const order = context?.order;
  const amc = context?.amc;
  const selectedEngineer =
    engineers.find((u) => String(u.id) === String(form.engineer_id)) || null;

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Create Service Ticket" backHref="/service/search">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          </div>
        ) : !orderId ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-center gap-3 max-w-2xl">
            <IconAlertTriangle />
            <p className="text-sm font-medium">Please select a project from Service Search first to create a ticket.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
            {/* Left Column: Context & History */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                      <IconUser size={18} className="text-brand-primary" />
                    Project Context
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">PUI (Order No)</p>
                    <button
                      type="button"
                      className="font-semibold text-slate-900 hover:text-brand-primary hover:underline transition-colors"
                      title="View full order details"
                      onClick={() => {
                        if (order?.id) setOrderDrawerOpen(true);
                      }}
                    >
                      {order?.order_number || "—"}
                    </button>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Customer Name</p>
                    <p className="text-sm text-slate-900 font-medium">{order?.customer_name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Mobile</p>
                      <p className="text-sm text-slate-900">{order?.mobile_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Net Meter</p>
                      <p className="text-sm text-slate-900">{order?.netmeter_installed_on || "—"}</p>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-md border ${amc?.amc_active ? 'bg-teal-50 border-teal-100' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                      <IconClipboardCheck size={14} /> Contract Status
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge className={amc?.amc_active ? "bg-teal-600 hover:bg-teal-700" : "bg-slate-600 hover:bg-slate-700"}>
                        {amc?.amc_active ? `Active (${amc.call_type})` : `Paid call (${amc?.call_type || 'out of warranty'})`}
                      </Badge>
                      {amc?.visit_charge > 0 && (
                        <span className="text-sm font-medium text-slate-700">Visit: ₹{amc.visit_charge}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {context?.service_history?.tickets?.length > 0 && (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                      <IconCalendar size={18} className="text-blue-600" />
                      Service History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 p-0">
                    <div className="max-h-60 overflow-y-auto">
                      <ul className="divide-y divide-slate-100">
                        {context.service_history.tickets.map((t) => (
                          <li key={t.id} className="p-3 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-slate-900">{t.ticket_no}</span>
                              <Badge variant="outline" className="text-[10px] uppercase">{t.status}</Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Ticket Form */}
            <div className="lg:col-span-8">
              <Card className="border-slate-200 shadow-md">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                    <IconTool size={22} className="text-brand-primary" />
                    New Ticket Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Reported Issue <span className="text-red-500">*</span></label>
                    <Textarea
                      className="min-h-[80px] text-sm resize-none"
                      placeholder="Describe the issue reported by the customer..."
                      value={form.reported_issue}
                      onChange={(e) => setForm((p) => ({ ...p, reported_issue: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Customer Remarks</label>
                    <Textarea
                      className="min-h-[60px] text-sm resize-none"
                      placeholder="Any additional remarks or preferences from the customer..."
                      value={form.customer_remarks}
                      onChange={(e) => setForm((p) => ({ ...p, customer_remarks: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Assign Engineer</label>
                      <AutocompleteField
                        options={engineers}
                        value={selectedEngineer}
                        placeholder="Assign active user"
                        getOptionLabel={(opt) => opt?.name || opt?.label || ""}
                        onChange={(_, selected) => {
                          markTouched("engineer_id");
                          updateFormField("engineer_id", selected?.id ? String(selected.id) : "unassigned");
                        }}
                      />
                      {form.engineer_id !== "unassigned" && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:underline"
                          onClick={() => {
                            markTouched("engineer_id");
                            updateFormField("engineer_id", "unassigned");
                          }}
                        >
                          Assign later
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Priority</label>
                      <Select
                        value={form.service_priority_id}
                        disabled={priorities.length === 0}
                        onValueChange={(val) => {
                          markTouched("service_priority_id");
                          updateFormField("service_priority_id", val);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {priorities.length > 0 ? (
                            priorities.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.priority || c.name || c.label}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__none__" disabled>
                              No priorities available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Service Category</label>
                      <Select
                        value={form.service_category_id}
                        disabled={categories.length === 0}
                        onValueChange={(val) => {
                          markTouched("service_category_id");
                          updateFormField("service_category_id", val);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.length > 0 ? (
                            categories.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name || c.label}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__none__" disabled>
                              No categories available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Service Type</label>
                      <Select
                        value={form.service_type_id}
                        disabled={typeOptions.length === 0}
                        onValueChange={(val) => {
                          markTouched("service_type_id");
                          updateFormField("service_type_id", val);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {typeOptions.length > 0 ? (
                            typeOptions.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name || c.label}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__none__" disabled>
                              No types available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-slate-100">
                    <Button 
                      className="px-6 bg-brand-primary hover:bg-brand-primary/90 text-white" 
                      onClick={handleSubmit} 
                      disabled={submitting || !form.reported_issue.trim()}
                    >
                      {submitting ? "Creating..." : "Create Ticket"}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="px-6"
                      onClick={() => router.push("/service/search")}
                    >
                      Cancel
                    </Button>
                  </div>

                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </AddEditPageShell>
      <OrderDetailsDrawer
        open={orderDrawerOpen}
        onClose={() => setOrderDrawerOpen(false)}
        order={order}
        showPrint={false}
        showDeliverySnapshot
      />
    </ProtectedRoute>
  );
}
