import { PO_INWARD_IMPORT_CHARGE_TYPES } from "@/constants/poInwardImportCharges";

const CHARGE_TYPE_LIST = PO_INWARD_IMPORT_CHARGE_TYPES.map((c) => c.charge_type);

const isDefaultInventoriable = (chargeType) => String(chargeType) !== "IMPORT_IGST";

/**
 * Normalize payload charges into one row per known type (missing → 0).
 * Mirrors API poInwardImportCosting.normalizeImportCharges.
 */
export const normalizeImportCharges = (charges = []) => {
  const byType = new Map();
  for (const row of Array.isArray(charges) ? charges : []) {
    if (!row || row.charge_type == null) continue;
    const charge_type = String(row.charge_type).trim().toUpperCase();
    if (!CHARGE_TYPE_LIST.includes(charge_type)) continue;
    const amount = Number(row.amount_inr);
    const amount_inr = Number.isFinite(amount) && amount >= 0 ? parseFloat(amount.toFixed(2)) : 0;
    const inventoriable =
      row.inventoriable !== undefined && row.inventoriable !== null
        ? !!row.inventoriable
        : isDefaultInventoriable(charge_type);
    byType.set(charge_type, {
      charge_type,
      amount_inr,
      inventoriable,
      remarks: row.remarks != null ? String(row.remarks) : null,
    });
  }

  return CHARGE_TYPE_LIST.map((charge_type) => {
    if (byType.has(charge_type)) return byType.get(charge_type);
    return {
      charge_type,
      amount_inr: 0,
      inventoriable: isDefaultInventoriable(charge_type),
      remarks: null,
    };
  });
};

/**
 * Value-weighted landed cost allocation (same rules as API).
 * @param {Array<{id?:number, accepted_quantity:number, rate_inr_po:number, rate_fc?:number, product?:object}>} items
 * @param {Array<{charge_type:string, amount_inr:number|string, inventoriable?:boolean}>} charges
 */
export const allocateLandedCost = (items, charges) => {
  const normalizedCharges = normalizeImportCharges(charges);
  let charges_total_inr = 0;
  let inventoriable_charges_inr = 0;
  let non_inventoriable_charges_inr = 0;

  for (const c of normalizedCharges) {
    charges_total_inr += c.amount_inr;
    if (c.inventoriable) inventoriable_charges_inr += c.amount_inr;
    else non_inventoriable_charges_inr += c.amount_inr;
  }
  charges_total_inr = parseFloat(charges_total_inr.toFixed(2));
  inventoriable_charges_inr = parseFloat(inventoriable_charges_inr.toFixed(2));
  non_inventoriable_charges_inr = parseFloat(non_inventoriable_charges_inr.toFixed(2));

  const bases = (items || []).map((item) => {
    const qty = Number(item.accepted_quantity) || 0;
    const rateInrPo = Number(item.rate_inr_po);
    const rate_inr_po = Number.isFinite(rateInrPo) && rateInrPo >= 0 ? rateInrPo : 0;
    const base_inr = parseFloat((qty * rate_inr_po).toFixed(2));
    return { item, qty, rate_inr_po, base_inr };
  });

  const sumBase = bases.reduce((s, b) => s + b.base_inr, 0);
  let allocatedRunning = 0;

  const lines = bases.map((b, index) => {
    const isLast = index === bases.length - 1;
    let allocated_charges_inr = 0;
    if (sumBase > 0 && inventoriable_charges_inr > 0) {
      if (isLast) {
        allocated_charges_inr = parseFloat((inventoriable_charges_inr - allocatedRunning).toFixed(2));
      } else {
        allocated_charges_inr = parseFloat(
          ((inventoriable_charges_inr * b.base_inr) / sumBase).toFixed(2)
        );
        allocatedRunning += allocated_charges_inr;
      }
    }
    const landed_line_inr = parseFloat((b.base_inr + allocated_charges_inr).toFixed(2));
    const landed_unit_inr =
      b.qty > 0
        ? parseFloat((landed_line_inr / b.qty).toFixed(2))
        : parseFloat(b.rate_inr_po.toFixed(2));

    return {
      item: b.item,
      accepted_quantity: b.qty,
      rate_inr_po: parseFloat(b.rate_inr_po.toFixed(4)),
      rate_fc: b.item.rate_fc != null ? Number(b.item.rate_fc) : null,
      base_inr: b.base_inr,
      allocated_charges_inr,
      landed_unit_inr,
      landed_line_inr,
    };
  });

  const landed_total_inr = parseFloat(
    lines.reduce((s, r) => s + r.landed_line_inr, 0).toFixed(2)
  );

  return {
    charges: normalizedCharges,
    charges_total_inr,
    inventoriable_charges_inr,
    non_inventoriable_charges_inr,
    landed_total_inr,
    lines,
  };
};

/**
 * Build allocation inputs from inward items + FX fallback.
 */
export const buildAllocationItems = (items = [], exchangeRate = 1) => {
  const fx = Number(exchangeRate) > 0 ? Number(exchangeRate) : 1;
  return (items || []).map((item) => {
    const rateFc = item.rate_fc != null && Number.isFinite(Number(item.rate_fc))
      ? Number(item.rate_fc)
      : null;
    let rateInrPo =
      item.rate_inr_po != null && Number.isFinite(Number(item.rate_inr_po))
        ? Number(item.rate_inr_po)
        : rateFc != null
          ? parseFloat((rateFc * fx).toFixed(4))
          : Number(item.rate) || 0;
    if (!Number.isFinite(rateInrPo) || rateInrPo < 0) rateInrPo = 0;
    return {
      id: item.id,
      product: item.product,
      accepted_quantity: item.accepted_quantity,
      rate_fc: rateFc,
      rate_inr_po: rateInrPo,
    };
  });
};
