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
];

export const normalizeStageStatus = (status) => {
    const value = String(status || "").toLowerCase();
    if (value === "completed") return "completed";
    if (value === "in_progress") return "in_progress";
    if (value === "pending") return "pending";
    return "pending";
};

export const buildOrderedStages = (stages = {}, currentStageKey = null) =>
    ORDER_STAGE_META.map((stage) => {
        const current = currentStageKey === stage.key;
        const rawStatus = stages?.[stage.key];
        const status = current
            ? normalizeStageStatus(rawStatus || "in_progress")
            : normalizeStageStatus(rawStatus);
        return {
            ...stage,
            status,
            isCurrent: current,
        };
    });

