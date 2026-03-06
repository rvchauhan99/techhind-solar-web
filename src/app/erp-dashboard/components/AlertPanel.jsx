import React, { useEffect, useState } from "react";
import { IconAlertTriangle, IconClock, IconFileInvoice, IconTruck, IconCurrencyRupee } from "@tabler/icons-react";
import ordersDashboardService from "@/services/ordersDashboardService";

export default function AlertPanel({ filters, dashboardApiBase, onRedFlagClick }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        Promise.all([
            ordersDashboardService.getOrdersDashboardKpis(filters || {}, dashboardApiBase),
            ordersDashboardService.getOrdersDashboardPipeline(filters || {}, dashboardApiBase),
        ])
            .then(([kpiRes, pipelineRes]) => {
                if (!isMounted) return;
                const kpiPayload = kpiRes?.result || kpiRes?.data || kpiRes || {};
                const pipelinePayload = pipelineRes?.result || pipelineRes?.data || pipelineRes || {};
                const byStage = Array.isArray(pipelinePayload.by_stage) ? pipelinePayload.by_stage : [];
                const byDelivery = Array.isArray(pipelinePayload.by_delivery_status) ? pipelinePayload.by_delivery_status : [];

                const redFlagCount = Number(kpiPayload.red_flag_payment_outstanding ?? 0);
                const installationPending =
                    byStage.find((s) => s.current_stage_key === "installation")?.count ?? 0;
                const netmeterPending =
                    byStage.find((s) => s.current_stage_key === "netmeter_apply")?.count ?? 0;
                const subsidyPending =
                    byStage.find((s) => s.current_stage_key === "subsidy_claim")?.count ?? 0;
                const deliveryPartial =
                    byDelivery.find((d) => d.delivery_status === "partial")?.count ?? 0;

                const nextAlerts = [];
                if (redFlagCount > 0) {
                    nextAlerts.push({
                        id: "red-flag-payment",
                        message: `${redFlagCount} completed order(s) have payment outstanding.`,
                        icon: <IconCurrencyRupee className="w-4 h-4 text-red-600" />,
                        type: "danger",
                        onClick: onRedFlagClick,
                    });
                }
                if (installationPending > 0) {
                    nextAlerts.push({
                        id: 1,
                        message: `${installationPending} installations are pending in current pipeline.`,
                        icon: <IconClock className="w-4 h-4 text-red-600" />,
                        type: "danger",
                    });
                }
                if (netmeterPending > 0) {
                    nextAlerts.push({
                        id: 2,
                        message: `${netmeterPending} netmeter applications pending.`,
                        icon: <IconAlertTriangle className="w-4 h-4 text-amber-600" />,
                        type: "warning",
                    });
                }
                if (subsidyPending > 0) {
                    nextAlerts.push({
                        id: 3,
                        message: `${subsidyPending} subsidy claims pending.`,
                        icon: <IconFileInvoice className="w-4 h-4 text-amber-600" />,
                        type: "warning",
                    });
                }
                if (deliveryPartial > 0) {
                    nextAlerts.push({
                        id: 4,
                        message: `${deliveryPartial} partial deliveries missing completion.`,
                        icon: <IconTruck className="w-4 h-4 text-red-600" />,
                        type: "danger",
                    });
                }

                setAlerts(nextAlerts);
            })
            .catch(() => {
                if (!isMounted) return;
                setAlerts([]);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [filters, dashboardApiBase, onRedFlagClick]);

    if (loading) {
        return (
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="flex items-center px-4 py-2.5 rounded-xl border flex-1 min-w-[280px] shadow-sm bg-slate-100 border-slate-200 animate-pulse"
                    >
                        <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 mr-3" />
                        <div className="h-4 flex-1 max-w-[200px] bg-slate-200 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full">
            {alerts.map((alert) => (
                <div
                    key={alert.id}
                    role={alert.onClick ? "button" : undefined}
                    onClick={alert.onClick}
                    className={`flex items-center px-4 py-2.5 rounded-xl border flex-1 min-w-[280px] shadow-sm ${alert.type === 'danger'
                            ? 'bg-red-50/50 border-red-100'
                            : 'bg-amber-50/50 border-amber-100'
                        } ${alert.onClick ? "cursor-pointer hover:bg-red-100/50" : ""}`}
                >
                    <div className={`shrink-0 p-1.5 rounded-full mr-3 ${alert.type === 'danger' ? 'bg-red-100' : 'bg-amber-100'
                        }`}>
                        {alert.icon}
                    </div>
                    <p className={`text-sm font-medium ${alert.type === 'danger' ? 'text-red-800' : 'text-amber-800'
                        }`}>
                        {alert.message}
                    </p>
                </div>
            ))}
        </div>
    );
}
