"use client";

export const ORDER_STAGE_META = [
    { key: "estimate_generated", label: "Estimate Generated" },
    { key: "estimate_paid", label: "Estimate Paid" },
    { key: "planner", label: "Planner" },
    { key: "delivery", label: "Delivery" },
    { key: "assign_fabricator_and_installer", label: "Assign Fabricator & Installer" },
    { key: "fabrication", label: "Fabrication" },
    { key: "installation", label: "Installation" },
    { key: "netmeter_apply", label: "Netmeter Apply" },
    { key: "netmeter_installed", label: "Netmeter Installed" },
    { key: "subsidy_claim", label: "Subsidy Claim" },
    { key: "subsidy_disbursed", label: "Subsidy Disbursed" },
    { key: "order_completed", label: "Order Completed" },
];

export const normalizeStageStatus = (status) => {
    const value = String(status || "").toLowerCase();
    if (value === "completed") return "completed";
    if (value === "in_progress") return "in_progress";
    if (value === "pending") return "pending";
    return "pending";
};

export const buildOrderedStages = (stages = {}, currentStageKey = null) => {
    const isOrderCompleted = currentStageKey === "order_completed";
    const baseStages = ORDER_STAGE_META.filter((s) => s.key !== "order_completed").map((stage) => {
        const current = !isOrderCompleted && currentStageKey === stage.key;
        const rawStatus = stages?.[stage.key];
        const status = isOrderCompleted
            ? "completed"
            : current
                ? normalizeStageStatus(rawStatus || "in_progress")
                : normalizeStageStatus(rawStatus);
        return {
            ...stage,
            status,
            isCurrent: current,
        };
    });
    if (isOrderCompleted) {
        return [
            ...baseStages,
            { key: "order_completed", label: "Order Completed", status: "completed", isCurrent: true },
        ];
    }
    return baseStages;
};

