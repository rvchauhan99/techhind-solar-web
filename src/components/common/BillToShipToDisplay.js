"use client";

import { cn } from "@/lib/utils";

/**
 * Format address lines from a B2B client (billing) for display.
 * @param {object} client - Client with billing_* and client_name, gstin
 * @returns {string[]} Non-empty lines
 */
export function formatBillToLines(client) {
  if (!client) return [];
  const lines = [];
  if (client.client_name) lines.push(client.client_name);
  const addr = [client.billing_address, client.billing_city, client.billing_district]
    .filter(Boolean)
    .join(", ");
  if (addr) lines.push(addr);
  const statePincode = [client.billing_state, client.billing_pincode].filter(Boolean).join(" ");
  if (statePincode) lines.push(statePincode);
  if (client.billing_landmark) lines.push(client.billing_landmark);
  if (client.billing_country) lines.push(client.billing_country);
  if (client.gstin) lines.push(`GSTIN: ${client.gstin}`);
  return lines;
}

/**
 * Format address lines from a B2B ship-to for display.
 * @param {object} shipTo - ShipTo with address, city, state, etc.
 * @returns {string[]} Non-empty lines
 */
export function formatShipToLines(shipTo) {
  if (!shipTo) return [];
  const lines = [];
  if (shipTo.ship_to_name) lines.push(shipTo.ship_to_name);
  if (shipTo.address) lines.push(shipTo.address);
  const cityLine = [shipTo.city, shipTo.district].filter(Boolean).join(", ");
  if (cityLine) lines.push(cityLine);
  const statePincode = [shipTo.state, shipTo.pincode].filter(Boolean).join(" ");
  if (statePincode) lines.push(statePincode);
  if (shipTo.landmark) lines.push(shipTo.landmark);
  if (shipTo.country) lines.push(shipTo.country);
  if (shipTo.contact_person || shipTo.phone) {
    lines.push([shipTo.contact_person, shipTo.phone].filter(Boolean).join(" · "));
  }
  return lines;
}

/**
 * Compact two-column Bill To | Ship To address block.
 * Uses minimal vertical space (small text, tight line height).
 *
 * @param {object} billTo - Client object (billing fields) or null
 * @param {object} shipTo - Ship-to object or null
 * @param {string} [className] - Optional wrapper class
 */
export default function BillToShipToDisplay({ billTo, shipTo, className }) {
  const billLines = formatBillToLines(billTo);
  const shipLines = formatShipToLines(shipTo);
  const hasAny = billLines.length > 0 || shipLines.length > 0;
  if (!hasAny) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground border rounded-md p-2 bg-muted/30",
        className
      )}
      data-testid="bill-to-ship-to"
    >
      <div className="min-w-0">
        <div className="font-medium text-foreground mb-0.5">Bill To</div>
        {billLines.length > 0 ? (
          <div className="whitespace-pre-line leading-tight">
            {billLines.join("\n")}
          </div>
        ) : (
          <span className="italic">—</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="font-medium text-foreground mb-0.5">Ship To</div>
        {shipLines.length > 0 ? (
          <div className="whitespace-pre-line leading-tight">
            {shipLines.join("\n")}
          </div>
        ) : (
          <span className="italic">—</span>
        )}
      </div>
    </div>
  );
}
