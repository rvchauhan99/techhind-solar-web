/** Shared inventory_ledger transaction_type labels for reports and ledgers. */

export const TRANSACTION_TYPE_LABELS = {
  PO_INWARD: "Purchase / Goods Receipt",
  PO_RETURN: "Purchase Return",
  TRANSFER_OUT: "Warehouse Transfer Out",
  TRANSFER_IN: "Warehouse Transfer In",
  STOCK_ADJUSTMENT: "Stock Adjustment",
  DELIVERY_CHALLAN_OUT: "B2C Delivery Challan Out",
  DELIVERY_CHALLAN_CANCEL_IN: "B2C Delivery Challan Cancel (In)",
  DELIVERY_CHALLAN_RETURN_IN: "B2C Delivery Challan Return",
  B2B_SHIPMENT_OUT: "B2B Shipment Out",
  B2B_SHIPMENT_CANCEL_IN: "B2B Shipment Cancel (In)",
  B2B_SHIPMENT_RETURN_IN: "B2B Shipment Return",
  CUTOVER_OPENING: "Cutover Opening",
  USED_INVENTORY_IMPORT: "Used Inventory Import",
  INSTALLATION_FORCE_ADJUST: "Installation Force Adjust",
  PRODUCTION_ISSUE_OUT: "Production Issue Out",
  PRODUCTION_SCRAP_OUT: "Production Scrap Out",
  PRODUCTION_RECEIPT_IN: "Production Receipt In",
  PRODUCTION_REJECT_IN: "Production Reject In",
  PRODUCTION_CANCEL_IN: "Production Cancel In",
  PRODUCTION_CANCEL_OUT: "Production Cancel Out",
};

export const TRANSACTION_TYPE_OPTIONS = Object.entries(TRANSACTION_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);

export function getTransactionTypeLabel(type) {
  if (!type) return "—";
  return TRANSACTION_TYPE_LABELS[type] || type;
}
