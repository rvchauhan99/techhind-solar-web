export const RBAC_CONFIG_KEYS = {
  CONFIG_MASTER: "rbac.config_master.allowed_roles",
  MARKETING_LEADS_DELETE: "rbac.marketing_leads.delete.allowed_roles",
  ORDER_AMEND: "rbac.order.amend.allowed_roles",
  ORDER_AMEND_STAGE_COMPLETE: "rbac.order.amend_stage_complete.allowed_roles",
  ORDER_PLANNER_ELEVATED: "rbac.order.planner_elevated_access.allowed_roles",
  ORDER_PLANNER_SAVE_RESTRICTED: "rbac.order.planner_save_when_restricted.allowed_roles",
  CONFIRM_ORDERS_RELEASE_STOCK: "rbac.confirm_orders.release_stock.allowed_roles",
  CONFIRM_ORDERS_CHANGE_HANDLED_BY: "rbac.confirm_orders.change_handled_by.allowed_roles",
  CHALLAN_REVERSE: "rbac.challan.reverse.allowed_roles",
  CHALLAN_PARTIAL_RETURN: "rbac.challan.partial_return.allowed_roles",
  STOCK_REPORT_EMAIL_RECIPIENTS: "rbac.stock_report.email_recipient_roles",
};

export const DEFAULT_RBAC_CONFIGS = {
  [RBAC_CONFIG_KEYS.CONFIG_MASTER]: "SuperAdmin",
  [RBAC_CONFIG_KEYS.MARKETING_LEADS_DELETE]: "SuperAdmin",
  [RBAC_CONFIG_KEYS.ORDER_AMEND]: "BA,SuperAdmin",
  [RBAC_CONFIG_KEYS.ORDER_AMEND_STAGE_COMPLETE]: "SuperAdmin",
  [RBAC_CONFIG_KEYS.ORDER_PLANNER_ELEVATED]: "SuperAdmin",
  [RBAC_CONFIG_KEYS.ORDER_PLANNER_SAVE_RESTRICTED]: "SuperAdmin",
  [RBAC_CONFIG_KEYS.CONFIRM_ORDERS_RELEASE_STOCK]: "SuperAdmin",
  [RBAC_CONFIG_KEYS.CONFIRM_ORDERS_CHANGE_HANDLED_BY]: "SuperAdmin",
  [RBAC_CONFIG_KEYS.CHALLAN_REVERSE]: "SuperAdmin",
  [RBAC_CONFIG_KEYS.CHALLAN_PARTIAL_RETURN]: "SuperAdmin",
  [RBAC_CONFIG_KEYS.STOCK_REPORT_EMAIL_RECIPIENTS]: "SuperAdmin",
};

export const normalizeRoleName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const parseAllowedRoles = (configValue) => {
  if (configValue == null || configValue === "") return new Set();
  return new Set(
    String(configValue)
      .split(",")
      .map((part) => normalizeRoleName(part))
      .filter(Boolean)
  );
};

export const isRoleAllowed = (userRoleName, configValue) => {
  const normalized = normalizeRoleName(userRoleName);
  if (!normalized) return false;
  return parseAllowedRoles(configValue).has(normalized);
};

export const getRbacConfigValue = (rbacConfigs, configKey) => {
  if (rbacConfigs && Object.prototype.hasOwnProperty.call(rbacConfigs, configKey)) {
    return rbacConfigs[configKey];
  }
  return DEFAULT_RBAC_CONFIGS[configKey] ?? "";
};

export const isRoleAllowedByKey = (userRoleName, rbacConfigs, configKey) =>
  isRoleAllowed(userRoleName, getRbacConfigValue(rbacConfigs, configKey));

export const mergeRbacConfigs = (rbacConfigs = {}) => ({
  ...DEFAULT_RBAC_CONFIGS,
  ...(rbacConfigs && typeof rbacConfigs === "object" ? rbacConfigs : {}),
});
