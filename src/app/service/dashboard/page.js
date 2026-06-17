"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import serviceTicketService from "@/services/serviceTicketService";
import {
  IconTicket,
  IconAlertCircle,
  IconClock,
  IconCurrencyRupee,
  IconShieldCheck,
  IconPackage,
  IconPhoneCall,
  IconReceipt,
  IconTool,
  IconPercentage
} from "@tabler/icons-react";

const StatWidget = ({ title, value, icon: Icon, textColor, bgColor, borderColor }) => (
  <Card className={`relative overflow-hidden ${bgColor || ''} ${borderColor || ''}`}>
    <div className={`absolute -right-4 -bottom-4 p-4 opacity-[0.08] ${textColor || 'text-slate-800'}`}>
      <Icon size={96} stroke={1.5} />
    </div>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-slate-500 z-10 relative">{title}</CardTitle>
    </CardHeader>
    <CardContent className="z-10 relative">
      <div className={`text-3xl font-bold tracking-tight ${textColor || 'text-slate-800'}`}>{value}</div>
    </CardContent>
  </Card>
);

export default function ServiceDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    serviceTicketService
      .getServiceDashboardMetrics()
      .then((res) => setMetrics(res?.result || res))
      .finally(() => setLoading(false));
  }, []);

  const m = metrics || {};

  return (
    <ProtectedRoute>
      <ListingPageContainer title="Service Dashboard" subtitle="Operational KPIs">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00823b]"></div>
          </div>
        ) : (
          <div className="space-y-8 pb-6">
            <section>
              <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <IconAlertCircle className="text-red-500" size={20} />
                Urgent Attention
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatWidget 
                  title="Overdue Tickets" 
                  value={m.overdue_tickets ?? 0} 
                  icon={IconClock} 
                  textColor="text-red-600" 
                  bgColor="bg-red-50" 
                  borderColor="border-red-200" 
                />
                <StatWidget 
                  title="Awaiting Payment" 
                  value={m.awaiting_payment ?? 0} 
                  icon={IconCurrencyRupee} 
                  textColor="text-amber-600" 
                  bgColor="bg-amber-50" 
                  borderColor="border-amber-200" 
                />
                <StatWidget 
                  title="Warranty Pending" 
                  value={m.warranty_claims_pending ?? 0} 
                  icon={IconShieldCheck} 
                  textColor="text-orange-600" 
                  bgColor="bg-orange-50" 
                  borderColor="border-orange-200" 
                />
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <IconTicket className="text-[#00823b]" size={20} />
                Ticket Status
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatWidget title="Open Tickets" value={m.open_tickets ?? 0} icon={IconTicket} textColor="text-[#00823b]" />
                <StatWidget title="Assigned Tickets" value={m.assigned_tickets ?? 0} icon={IconClock} textColor="text-blue-600" />
                <StatWidget title="Awaiting Warranty" value={m.awaiting_warranty ?? 0} icon={IconShieldCheck} textColor="text-purple-600" />
                <StatWidget title="Awaiting Material" value={m.awaiting_material ?? 0} icon={IconPackage} textColor="text-indigo-600" />
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <IconReceipt className="text-slate-600" size={20} />
                Operations & Financials
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatWidget title="AMC Calls" value={m.amc_calls ?? 0} icon={IconPhoneCall} textColor="text-teal-600" />
                <StatWidget title="Paid Calls" value={m.paid_calls ?? 0} icon={IconReceipt} textColor="text-[#00823b]" />
                <StatWidget title="Service Revenue" value={`₹${m.service_revenue ?? 0}`} icon={IconCurrencyRupee} textColor="text-emerald-600" />
                <StatWidget title="Collection %" value={`${m.collection_efficiency ?? 0}%`} icon={IconPercentage} textColor="text-sky-600" />
              </div>
            </section>

            {Array.isArray(m.engineer_workload) && m.engineer_workload.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <IconTool className="text-slate-600" size={20} />
                  Engineer Workload
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {m.engineer_workload.map((row) => (
                    <Card key={row.id} className="hover:border-[#00823b]/40 transition-colors group">
                      <CardContent className="flex items-center justify-between p-4 pt-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 group-hover:bg-[#00823b]/10 flex items-center justify-center text-slate-500 group-hover:text-[#00823b] transition-colors">
                            <IconTool size={20} />
                          </div>
                          <span className="font-medium text-slate-700">{row.name}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-2xl font-bold text-slate-900 group-hover:text-[#00823b] transition-colors">{row.pending_count}</span>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">pending</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
