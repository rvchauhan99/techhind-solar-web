/**
 * Serial Master `code` values consumed by the API (`generateSerialByCode`).
 * Keep in sync with backend usage in serialMaster.service callers.
 */
export const SERIAL_MASTER_CODE_OPTIONS = [
  { value: "PO", label: "PO — Purchase Order" },
  { value: "POINWARD", label: "POINWARD — PO Inward / GRN" },
  { value: "DELIVERYCHALLAN", label: "DELIVERYCHALLAN — Delivery Challan" },
  { value: "CUSTOMERQUOTE", label: "CUSTOMERQUOTE — Customer Quotation" },
  { value: "CUSTOMERORDER", label: "CUSTOMERORDER — Customer Order" },
  { value: "CUSTOMERINQUIRY", label: "CUSTOMERINQUIRY — Customer Inquiry" },
  { value: "CUSTOMERLEAD", label: "CUSTOMERLEAD — Marketing Lead" },
  { value: "B2BSHIPMENT", label: "B2BSHIPMENT — B2B Shipment" },
  { value: "B2BINVOICE", label: "B2BINVOICE — B2B Invoice" },
  { value: "B2BSALESORDER", label: "B2BSALESORDER — B2B Sales Order" },
  { value: "B2BSALESQUOTE", label: "B2BSALESQUOTE — B2B Sales Quote" },
];

const KNOWN = new Set(SERIAL_MASTER_CODE_OPTIONS.map((o) => o.value));

export function isKnownSerialMasterCode(code) {
  if (code == null || String(code).trim() === "") return false;
  return KNOWN.has(String(code).trim());
}

/** User-facing description for a known code; null if not in the standard list. */
export function getSerialMasterCodeLabel(code) {
  if (code == null || String(code).trim() === "") return null;
  const opt = SERIAL_MASTER_CODE_OPTIONS.find((o) => o.value === String(code).trim());
  return opt ? opt.label : null;
}
