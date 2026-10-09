import { getReferenceOptionsSearch } from "@/services/mastersService";

export const PENDING_ORDER_KYC_CONFIG_KEY = "pending_order.kyc_workflow.enabled";

export const fetchPendingOrderKycEnabled = async () => {
  try {
    const rows = await getReferenceOptionsSearch("platform_config.model", {
      config_key: PENDING_ORDER_KYC_CONFIG_KEY,
      is_active: true,
      limit: 1,
    });
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return false;
    const raw = String(row.config_value ?? row.value ?? row.label ?? "").trim().toLowerCase();
    return raw === "true" || raw === "1" || raw === "yes";
  } catch {
    return false;
  }
};
