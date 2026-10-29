import { buildListReturnTo } from "@/utils/listNavigation";

/**
 * Build a path to open an inventory voucher from stock ledger voucher_href_hint.
 * @param {{ module?: string, id?: number|string, return_id?: number|string }|null} hint
 * @param {{ pathname?: string, searchParams?: URLSearchParams|string }} returnContext
 * @returns {string|null}
 */
export function buildInventoryVoucherHref(hint, returnContext = {}) {
  if (!hint?.module || hint.id == null || hint.id === "") return null;

  const id = hint.id;
  const returnTo = buildListReturnTo(
    returnContext.pathname || "/reports/stock-ledger",
    returnContext.searchParams || ""
  );
  const withReturn = (path) => {
    const sep = path.includes("?") ? "&" : "?";
    return `${path}${sep}returnTo=${returnTo}`;
  };

  switch (hint.module) {
    case "po_inward":
      return withReturn(`/po-inwards/edit?id=${id}`);
    case "purchase_return":
      return withReturn(`/purchase-returns/edit?id=${id}`);
    case "b2b_shipment":
      return withReturn(`/b2b-shipments?id=${id}`);
    case "b2b_shipment_return":
      return withReturn(`/b2b-shipment-returns/edit?id=${id}`);
    case "delivery_challan":
      return withReturn(`/delivery-challans?id=${id}`);
    case "stock_transfer":
      return withReturn(`/stock-transfers/edit?id=${id}`);
    case "stock_adjustment":
      return withReturn(`/stock-adjustments/edit?id=${id}`);
    case "production_booking":
      // Bookings are not editable; land on history list
      return withReturn(`/production-bookings`);
    default:
      return null;
  }
}
