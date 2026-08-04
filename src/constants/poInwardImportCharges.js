export const PO_INWARD_IMPORT_CHARGE_TYPES = [
  { charge_type: "BCD", label: "Basic Customs Duty (BCD)", inventoriable: true },
  { charge_type: "SWS", label: "Social Welfare Surcharge (SWS)", inventoriable: true },
  { charge_type: "IMPORT_IGST", label: "Import IGST (ITC – not inventoriable)", inventoriable: false },
  { charge_type: "ANTI_DUMPING", label: "Anti-Dumping Duty", inventoriable: true },
  { charge_type: "CHA", label: "CHA Service Charges", inventoriable: true },
  { charge_type: "FREIGHT", label: "Freight Charges", inventoriable: true },
  { charge_type: "INSURANCE", label: "Insurance", inventoriable: true },
  { charge_type: "PORT", label: "Port Charges", inventoriable: true },
  { charge_type: "TRANSPORT", label: "Transportation", inventoriable: true },
  { charge_type: "OTHER", label: "Other Charges", inventoriable: true },
];

export const emptyImportCharges = () =>
  PO_INWARD_IMPORT_CHARGE_TYPES.map((c) => ({
    charge_type: c.charge_type,
    amount_inr: "",
    inventoriable: c.inventoriable,
    remarks: "",
  }));

/** Form display: blank for empty/zero so users need not delete 0.00 before typing. */
const amountInrForForm = (raw) => {
  if (raw == null || raw === "") return "";
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return "";
  return String(raw);
};

export const mergeImportCharges = (existing = []) => {
  const byType = new Map(
    (Array.isArray(existing) ? existing : []).map((c) => [String(c.charge_type || "").toUpperCase(), c])
  );
  return PO_INWARD_IMPORT_CHARGE_TYPES.map((def) => {
    const row = byType.get(def.charge_type);
    return {
      charge_type: def.charge_type,
      amount_inr: amountInrForForm(row?.amount_inr),
      inventoriable: row?.inventoriable != null ? !!row.inventoriable : def.inventoriable,
      remarks: row?.remarks || "",
    };
  });
};

export const SHIPPING_FIELD_KEYS = [
  "container_number",
  "seal_number",
  "shipping_line",
  "vessel",
  "bill_of_lading",
  "air_way_bill",
  "etd",
  "eta",
  "bill_of_entry_number",
  "bill_of_entry_date",
];

export const emptyShippingFields = () =>
  Object.fromEntries(SHIPPING_FIELD_KEYS.map((k) => [k, ""]));
