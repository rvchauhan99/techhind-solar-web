"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconCalendar,
  IconAlertTriangle,
  IconClock,
  IconCheck,
  IconUser,
  IconCalendarEvent,
  IconHistory,
  IconArrowRight,
  IconShoppingCart,
  IconPlus,
  IconBuilding,
  IconBuildingCommunity,
  IconListDetails,
  IconFileDescription,
  IconCalendarDue,
  IconInfoCircle
} from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import DateField from "@/components/common/DateField";
import Input from "@/components/common/Input";
import Textarea from "@/components/common/Textarea";
import LoadingButton from "@/components/common/LoadingButton";
import Loader from "@/components/common/Loader";
import StatCard from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDate, formatCurrency } from "@/utils/dataTableUtils";
import b2bSalesPlanningService from "@/services/b2bSalesPlanningService";
import { renderPlanStatusBadge } from "../page";
import { useB2bSalesOrderSidebar } from "../components/useB2bSalesOrderSidebar";

const OPEN_FOR_SO = new Set(["UPCOMING", "DUE_TODAY", "OVERDUE"]);
const RESCHEDULABLE = new Set(["UPCOMING", "DUE_TODAY", "OVERDUE"]);
const PIPELINE_STATUSES = new Set(["PIPELINE", "PIPELINE_OVERDUE"]);

function SoNumberButton({ id, label, onOpen, className }) {
  if (!id || !label) return <span>—</span>;
  return (
    <button
      type="button"
      className={cn("text-[#00823b] hover:underline font-medium text-left", className)}
      onClick={(e) => {
        e.stopPropagation();
        onOpen({ id, order_no: label });
      }}
    >
      {label}
    </button>
  );
}

export default function B2bSalesPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const { openOrderSidebar, sidebar } = useB2bSalesOrderSidebar();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [logs, setLogs] = useState([]);
  const [related, setRelated] = useState(null);
  const [config, setConfig] = useState({ pipeline_reasons: [] });
  const [soTab, setSoTab] = useState("active");

  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleRemarks, setRescheduleRemarks] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  const [pipelineReason, setPipelineReason] = useState("");
  const [pipelineRemarks, setPipelineRemarks] = useState("");
  const [savingReason, setSavingReason] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [planRes, logsRes, cfgRes, relatedRes] = await Promise.all([
        b2bSalesPlanningService.getB2bSalesPlanById(id),
        b2bSalesPlanningService.getB2bSalesPlanLogs(id),
        b2bSalesPlanningService.getB2bSalesPlanningConfig(),
        b2bSalesPlanningService.getB2bSalesPlanRelated(id).catch(() => null),
      ]);
      const p = planRes?.result ?? planRes;
      setPlan(p);
      setLogs(logsRes?.result ?? logsRes ?? []);
      setRelated(relatedRes?.result ?? relatedRes ?? null);
      const cfg = cfgRes?.result ?? cfgRes ?? {};
      setConfig(cfg);
      setRescheduleDate(p?.plan_date || "");
      setPipelineReason(p?.pipeline_reason || "");
      setPipelineRemarks(p?.pipeline_reason_remarks || "");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load plan");
      router.push("/b2b-sales-planning");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReschedule = async () => {
    if (!rescheduleDate) {
      toast.error("Plan date is required");
      return;
    }
    setRescheduling(true);
    try {
      await b2bSalesPlanningService.rescheduleB2bSalesPlan(id, {
        plan_date: rescheduleDate,
        remarks: rescheduleRemarks || null,
      });
      toast.success("Plan rescheduled");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reschedule");
    } finally {
      setRescheduling(false);
    }
  };

  const handleSaveReason = async () => {
    if (!pipelineReason) {
      toast.error("Pipeline reason is required");
      return;
    }
    if (pipelineReason === "Other" && !String(pipelineRemarks || "").trim()) {
      toast.error("Remarks are mandatory when reason is Other");
      return;
    }
    setSavingReason(true);
    try {
      await b2bSalesPlanningService.setB2bSalesPlanPipelineReason(id, {
        pipeline_reason: pipelineReason,
        pipeline_reason_remarks: pipelineRemarks || null,
      });
      toast.success("Pipeline reason saved");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save reason");
    } finally {
      setSavingReason(false);
    }
  };

  if (loading || !plan) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader />
        </div>
      </ProtectedRoute>
    );
  }

  const cyclePlans = related?.plans || [];
  const activeOrders = related?.active_sales_orders || [];
  const completedOrders = related?.completed_sales_orders || [];
  const soRows = soTab === "completed" ? completedOrders : activeOrders;

  // Determine hero banner colors based on status
  const isDueToday = plan.status === "DUE_TODAY";
  const isOverdue = plan.status === "OVERDUE" || plan.status === "PIPELINE_OVERDUE";
  const isUpcoming = plan.status === "UPCOMING";
  const isPipeline = plan.status === "PIPELINE";
  const isCompleted = plan.status === "COMPLETED";

  let heroTheme = {
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-200",
    icon: <IconInfoCircle className="size-6 text-slate-500" />
  };

  if (isDueToday) {
    heroTheme = { bg: "bg-emerald-50", text: "text-emerald-900", border: "border-emerald-200", icon: <IconCalendarDue className="size-6 text-emerald-600" /> };
  } else if (isOverdue) {
    heroTheme = { bg: "bg-red-50", text: "text-red-900", border: "border-red-200", icon: <IconAlertTriangle className="size-6 text-red-600" /> };
  } else if (isUpcoming) {
    heroTheme = { bg: "bg-blue-50", text: "text-blue-900", border: "border-blue-200", icon: <IconCalendarEvent className="size-6 text-blue-600" /> };
  } else if (isPipeline) {
    heroTheme = { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200", icon: <IconClock className="size-6 text-amber-600" /> };
  } else if (isCompleted) {
    heroTheme = { bg: "bg-slate-100", text: "text-slate-900", border: "border-slate-200", icon: <IconCheck className="size-6 text-slate-600" /> };
  }

  return (
    <ProtectedRoute>
      <AddEditPageShell
        title={`Plan ${plan.plan_no}`}
        listHref="/b2b-sales-planning"
        listLabel="Sales Planning"
      >
        <FormContainer className="gap-6 pb-8">
          
          {/* 1. Hero Status Banner */}
          <div className={cn("rounded-xl border p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm shrink-0", heroTheme.bg, heroTheme.border)}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                {heroTheme.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className={cn("text-lg font-bold", heroTheme.text)}>
                    {plan.client?.client_name || "Unknown Client"}
                  </h2>
                  {renderPlanStatusBadge(plan.status)}
                </div>
                <div className="text-sm font-medium opacity-80 flex items-center gap-4">
                  <span className="flex items-center gap-1"><IconCalendar className="size-4" /> {formatDate(plan.plan_date)}</span>
                  <span className="flex items-center gap-1"><IconUser className="size-4" /> {plan.assignedToUser?.name || "Unassigned"}</span>
                </div>
              </div>
            </div>
            
            {OPEN_FOR_SO.has(plan.status) && (
              <Button
                className="shadow-sm hover:shadow-md transition-all whitespace-nowrap bg-[#00823b] hover:bg-[#00662e] text-white"
                onClick={() =>
                  router.push(
                    `/b2b-sales-orders/add?sales_plan_id=${plan.id}&client_id=${plan.client_id}&order_type=SCHEDULED&plan_date=${plan.plan_date || ""}`
                  )
                }
              >
                <IconPlus className="size-4 mr-1.5" />
                Create Scheduled SO
              </Button>
            )}
          </div>

          {/* 2. Overview Section -> Info Cards Grid */}
          <FormSection title={<span className="flex items-center gap-1.5"><IconListDetails className="size-4 text-[#1b365d]"/> Overview</span>}>
            <FormGrid cols={4} className="mt-2">
              <StatCard
                icon={<IconBuildingCommunity size={18} />}
                label="Client"
                value={plan.client?.client_name || "—"}
                accentColor="#1b365d"
                valueColor="#1e293b"
              />
              <StatCard
                icon={<IconCalendar size={18} />}
                label="Plan Date"
                value={formatDate(plan.plan_date)}
                accentColor="#00823b"
                subLabel={`Interval: ${plan.planning_interval_days} days`}
              />
              <StatCard
                icon={<IconHistory size={18} />}
                label="Pipeline Age"
                value={plan.pipeline_age_days != null ? `${plan.pipeline_age_days} days` : "—"}
                accentColor="#f37021"
                subLabel={plan.pipeline_since ? `Since ${formatDate(plan.pipeline_since)}` : undefined}
              />
              <StatCard
                icon={<IconShoppingCart size={18} />}
                label="Active Pipeline Ref"
                value={plan.active_pipeline_reference || "—"}
                accentColor="#8b5cf6"
                onClick={plan.active_sales_order_id ? () => openOrderSidebar({ id: plan.active_sales_order_id, order_no: plan.active_pipeline_reference }) : undefined}
                subLabel={plan.shipment_status ? `Shipment: ${plan.shipment_status}` : undefined}
              />
            </FormGrid>
            {plan.remarks && (
              <div className="mt-3 p-3 bg-slate-50 border rounded-lg text-sm flex items-start gap-2">
                <IconFileDescription className="size-4 text-slate-400 mt-0.5 shrink-0" />
                <span className="text-slate-700">{plan.remarks}</span>
              </div>
            )}
          </FormSection>

          {/* 3. Visual Timeline */}
          <FormSection title={<span className="flex items-center gap-1.5"><IconArrowRight className="size-4 text-[#1b365d]"/> Client Cycle Timeline</span>}>
            <div className="p-5 border rounded-xl bg-white shadow-sm overflow-x-auto mt-2">
              {cyclePlans.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">No cycle plans for this client yet</div>
              ) : (
                <div className="flex items-center min-w-max px-6 py-6">
                  {cyclePlans.map((row, index) => {
                    const isCurrent = Number(row.id) === Number(plan.id);
                    const isLast = index === cyclePlans.length - 1;
                    
                    // Dot color based on status
                    let dotColor = "bg-slate-300";
                    if (row.status === "COMPLETED") dotColor = "bg-slate-800";
                    else if (row.status === "DUE_TODAY") dotColor = "bg-emerald-500";
                    else if (row.status === "OVERDUE" || row.status === "PIPELINE_OVERDUE") dotColor = "bg-red-500";
                    else if (row.status === "UPCOMING") dotColor = "bg-blue-500";
                    else if (row.status === "PIPELINE") dotColor = "bg-amber-500";

                    return (
                      <div key={row.id} className="flex items-center">
                        <div 
                          className={cn(
                            "relative flex flex-col items-center group cursor-pointer transition-transform hover:-translate-y-1",
                            isCurrent ? "scale-110" : "opacity-80 hover:opacity-100"
                          )}
                          onClick={() => {
                            if (!isCurrent) router.push(`/b2b-sales-planning/${row.id}`);
                          }}
                        >
                          {/* Label Top */}
                          <div className="absolute -top-7 whitespace-nowrap text-xs font-semibold text-slate-600">
                            {formatDate(row.plan_date)}
                          </div>
                          
                          {/* Node */}
                          <div className={cn(
                            "w-4 h-4 rounded-full z-10 flex items-center justify-center transition-all",
                            dotColor,
                            isCurrent ? "ring-4 ring-blue-100 shadow-md" : ""
                          )} />
                          
                          {/* Label Bottom */}
                          <div className="absolute -bottom-8 flex flex-col items-center">
                            <span className={cn("whitespace-nowrap text-[11px] font-bold", isCurrent ? "text-blue-700" : "text-slate-700")}>
                              {row.plan_no}
                            </span>
                          </div>
                        </div>
                        
                        {/* Connecting Line */}
                        {!isLast && (
                          <div className="w-16 sm:w-24 h-0.5 bg-slate-200 -mt-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Timeline Summary Pills */}
            {related && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="bg-white px-2 py-1 shadow-sm">
                  <span className="text-slate-500 mr-1">Upcoming</span>
                  <span className="font-bold text-[#1b365d]">{related.upcoming_plans?.length || 0}</span>
                </Badge>
                <Badge variant="outline" className="bg-white px-2 py-1 shadow-sm">
                  <span className="text-slate-500 mr-1">Pipeline</span>
                  <span className="font-bold text-[#f37021]">{related.pipeline_plans?.length || 0}</span>
                </Badge>
                <Badge variant="outline" className="bg-white px-2 py-1 shadow-sm">
                  <span className="text-slate-500 mr-1">Completed</span>
                  <span className="font-bold text-[#00823b]">{related.completed_plans?.length || 0}</span>
                </Badge>
              </div>
            )}
          </FormSection>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Content Left (2/3) */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* 4. Enhanced Tabbed Table */}
              <FormSection title={<span className="flex items-center gap-1.5"><IconShoppingCart className="size-4 text-[#1b365d]"/> Related Sales Orders</span>}>
                <div className="flex gap-2 mb-3 bg-slate-100 p-1 rounded-lg w-fit mt-2">
                  {[
                    { key: "active", label: "Active", count: activeOrders.length },
                    { key: "completed", label: "Completed", count: completedOrders.length },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSoTab(tab.key)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                        soTab === tab.key
                          ? "bg-white text-[#1b365d] shadow-sm"
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                      )}
                    >
                      {tab.label}
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] leading-none",
                        soTab === tab.key ? "bg-[#1b365d]/10 text-[#1b365d]" : "bg-slate-200 text-slate-500"
                      )}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
                
                <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 text-slate-500 font-medium border-b">
                      <tr>
                        <th className="px-4 py-3">Order No</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Plan No</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {soRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="bg-slate-100 p-3 rounded-full">
                                <IconShoppingCart className="size-6 text-slate-400" />
                              </div>
                              <p>No {soTab} sales orders found</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        soRows.map((o) => (
                          <tr key={o.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => openOrderSidebar({ id: o.id, order_no: o.order_no })}>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-[#1b365d] group-hover:text-[#00823b] transition-colors">{o.order_no}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{formatDate(o.order_date)}</td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="text-[10px] bg-slate-100">{o.status || "—"}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              {o.sales_plan_id ? (
                                <Link
                                  href={`/b2b-sales-planning/${o.sales_plan_id}`}
                                  className="text-slate-500 hover:text-[#1b365d] hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {o.plan_no || `#${o.sales_plan_id}`}
                                </Link>
                              ) : "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-700">
                              {formatCurrency(o.grand_total ?? o.final_amount ?? 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </FormSection>

              {/* 5 & 6. Action Cards (Reschedule / Pipeline Reason) */}
              {(RESCHEDULABLE.has(plan.status) || PIPELINE_STATUSES.has(plan.status)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {RESCHEDULABLE.has(plan.status) && (
                    <div className="border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col h-full">
                      <div className="bg-slate-50 px-4 py-3 border-b flex items-center gap-2">
                        <IconCalendarEvent className="size-4 text-[#1b365d]" />
                        <h3 className="font-semibold text-sm text-slate-800">Reschedule Plan</h3>
                      </div>
                      <div className="p-4 flex flex-col gap-3 flex-1">
                        <DateField
                          label="New Plan Date"
                          value={rescheduleDate}
                          onChange={(e) => setRescheduleDate(e?.target?.value || "")}
                          fullWidth
                        />
                        <Textarea
                          label="Remarks"
                          value={rescheduleRemarks}
                          onChange={(e) => setRescheduleRemarks(e.target.value)}
                          minRows={2}
                          fullWidth
                        />
                        <div className="mt-auto pt-2">
                          <LoadingButton
                            type="button"
                            className="w-full bg-[#1b365d] hover:bg-[#112240] text-white"
                            loading={rescheduling}
                            onClick={handleReschedule}
                          >
                            Save New Date
                          </LoadingButton>
                        </div>
                      </div>
                    </div>
                  )}

                  {PIPELINE_STATUSES.has(plan.status) && (
                    <div className="border border-amber-200 rounded-xl bg-amber-50/30 shadow-sm overflow-hidden flex flex-col h-full">
                      <div className="bg-amber-100/50 px-4 py-3 border-b border-amber-200 flex items-center gap-2">
                        <IconAlertTriangle className="size-4 text-amber-600" />
                        <h3 className="font-semibold text-sm text-amber-900">Pipeline Reason Details</h3>
                      </div>
                      <div className="p-4 flex flex-col gap-3 flex-1">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block text-amber-900">Reason</label>
                          <Select value={pipelineReason} onValueChange={setPipelineReason}>
                            <SelectTrigger className="h-10 bg-white border-amber-200 focus:ring-amber-500">
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              {(config.pipeline_reasons || []).map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Textarea
                          label="Remarks"
                          value={pipelineRemarks}
                          onChange={(e) => setPipelineRemarks(e.target.value)}
                          minRows={2}
                          className="bg-white border-amber-200 focus:ring-amber-500"
                          fullWidth
                          helperText={pipelineReason === "Other" ? "Mandatory when Other" : undefined}
                          error={pipelineReason === "Other" && !String(pipelineRemarks || "").trim()}
                        />
                        <div className="mt-auto pt-2">
                          <LoadingButton
                            type="button"
                            className="w-full bg-[#00823b] hover:bg-[#00662e] text-white"
                            loading={savingReason}
                            onClick={handleSaveReason}
                          >
                            Save Pipeline Details
                          </LoadingButton>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar Right (1/3) */}
            <div className="lg:col-span-1">
              
              {/* 7. Audit Trail -> Timeline Feed */}
              <div className="border rounded-xl bg-white shadow-sm overflow-hidden sticky top-4 max-h-[calc(100vh-140px)] flex flex-col mt-7">
                <div className="bg-slate-50 px-4 py-3 border-b flex items-center gap-2 shrink-0">
                  <IconHistory className="size-4 text-[#1b365d]" />
                  <h3 className="font-semibold text-sm text-slate-800">Audit Trail</h3>
                </div>
                
                <div className="p-4 overflow-y-auto flex-1 relative">
                  {(logs || []).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 flex flex-col items-center gap-2">
                      <IconHistory className="size-8 opacity-20" />
                      <span className="text-sm">No activity recorded yet</span>
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-6">
                      {/* Vertical line connecting timeline nodes */}
                      <div className="absolute top-2 bottom-2 left-[11px] w-px bg-slate-200" />
                      
                      {(logs || []).map((log, i) => (
                        <div key={log.id} className="relative">
                          {/* Timeline dot */}
                          <div className="absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-white bg-[#00823b] shadow-sm z-10" />
                          
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-semibold text-sm text-slate-800">{log.action}</span>
                              <span className="text-[11px] text-slate-500 whitespace-nowrap mt-0.5">
                                {log.created_at ? formatDate(log.created_at) : ""}
                              </span>
                            </div>
                            
                            {(log.old_status || log.new_status) && (
                              <div className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                                {log.old_status && <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">{log.old_status}</Badge>}
                                {log.old_status && log.new_status && <IconArrowRight className="size-3 text-slate-400" />}
                                {log.new_status && <Badge variant="outline" className="px-1.5 py-0 text-[9px] bg-slate-50">{log.new_status}</Badge>}
                              </div>
                            )}
                            
                            {log.salesOrder?.order_no && (
                              <div className="mt-1">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#00823b]/10 text-[#00823b] hover:bg-[#00823b]/20 transition-colors"
                                  onClick={() =>
                                    openOrderSidebar({
                                      id: log.sales_order_id || log.salesOrder?.id,
                                      order_no: log.salesOrder.order_no,
                                    })
                                  }
                                >
                                  <IconShoppingCart className="size-3" />
                                  SO {log.salesOrder.order_no}
                                </button>
                              </div>
                            )}
                            
                            {log.remarks && (
                              <div className="mt-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100">
                                {log.remarks}
                              </div>
                            )}
                            
                            {log.createdByUser?.name && (
                              <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
                                <IconUser className="size-3" />
                                {log.createdByUser.name}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Bottom fade out gradient */}
                  {(logs || []).length > 4 && (
                    <div className="sticky bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                  )}
                </div>
              </div>

            </div>
          </div>
        </FormContainer>
        {sidebar}
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
