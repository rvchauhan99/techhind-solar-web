/**
 * Virtual "Billing Address" Ship To option for B2B Sales Order / Quote forms.
 * Used when the client has no ship-to rows so the field is never empty.
 * On submit, virtual id → ship_to_id: null (ship = bill).
 */

export const BILLING_SHIP_TO_ID = "billing";

const normalizeComparable = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const isVirtualBillingShipToId = (id) =>
  id != null && String(id) === BILLING_SHIP_TO_ID;

export const buildBillingShipToFromClient = (client) => {
  if (!client) return null;
  return {
    id: BILLING_SHIP_TO_ID,
    ship_to_name: "Billing Address",
    address: client.billing_address || client.address || " ",
    city: client.billing_city || null,
    district: client.billing_district || null,
    state: client.billing_state || null,
    state_id: client.billing_state_id || null,
    pincode: client.billing_pincode || client.pincode || null,
    landmark: client.billing_landmark || null,
    country: client.billing_country || "India",
    is_default: true,
    is_virtual_billing: true,
  };
};

export const hasRealBillingShipTo = (shipTos = []) => {
  if (!Array.isArray(shipTos) || shipTos.length === 0) return false;
  return shipTos.some((s) => {
    if (s?.is_default) return true;
    const name = normalizeComparable(s?.ship_to_name || "");
    return name === "billing address" || name === "billing";
  });
};

/**
 * If API already has a Billing Address / default ship-to, return that list.
 * Otherwise prepend a virtual Billing Address built from client details.
 */
export const ensureShipToOptions = (shipTos = [], client = null) => {
  const list = Array.isArray(shipTos) ? [...shipTos] : [];
  if (hasRealBillingShipTo(list)) return list;
  const virtual = buildBillingShipToFromClient(client);
  if (!virtual) return list;
  return [virtual, ...list];
};

/** Prefer is_default, else Billing Address (real or virtual), else first. */
export const pickDefaultShipToId = (options = []) => {
  if (!Array.isArray(options) || options.length === 0) return "";
  const byDefault = options.find((s) => s.is_default);
  if (byDefault?.id != null) return byDefault.id;
  const byName = options.find((s) => {
    const name = normalizeComparable(s?.ship_to_name || "");
    return name === "billing address" || name === "billing" || s?.is_virtual_billing;
  });
  if (byName?.id != null) return byName.id;
  return options[0]?.id ?? "";
};

export const findShipToOption = (options = [], shipToId) => {
  if (shipToId == null || shipToId === "") return null;
  return options.find((s) => String(s.id) === String(shipToId)) || null;
};

export const resolveShipToIdForPayload = (shipToId) => {
  if (shipToId == null || shipToId === "" || isVirtualBillingShipToId(shipToId)) {
    return null;
  }
  const n = Number(shipToId);
  return Number.isFinite(n) ? n : null;
};
