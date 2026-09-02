"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input as ShadInput } from "@/components/ui/input";
import { IconSearch } from "@tabler/icons-react";
import productionDashboardService from "@/services/productionDashboardService";
import { getApiErrorMessage } from "@/utils/toast";

const money = (value) => Number(value || 0).toFixed(2);

/** Trace a finished-good serial back to the component serials consumed to build it. */
export default function SerialGenealogyPanel() {
    const [serialNumber, setSerialNumber] = useState("");
    const [genealogy, setGenealogy] = useState(null);
    const [error, setError] = useState(null);
    const [searching, setSearching] = useState(false);

    const handleSearch = async () => {
        const value = serialNumber.trim();
        if (!value) {
            setError("Enter a finished-good serial number");
            return;
        }
        setSearching(true);
        setError(null);
        setGenealogy(null);
        try {
            const response = await productionDashboardService.getSerialGenealogy({
                serial_number: value,
            });
            setGenealogy(response?.result || response);
        } catch (err) {
            setError(getApiErrorMessage(err, "No production booking found for this serial"));
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <h3 className="text-sm font-semibold leading-tight">Serial Genealogy</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
                Enter a finished-good serial to see the booking and the component serials consumed for it.
            </p>

            <div className="mt-2 flex gap-2">
                <ShadInput
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleSearch();
                        }
                    }}
                    placeholder="Finished-good serial number"
                    aria-label="Finished-good serial number"
                    className="h-9"
                />
                <Button
                    type="button"
                    size="sm"
                    onClick={handleSearch}
                    disabled={searching}
                    className="h-9 shrink-0 gap-1"
                >
                    <IconSearch className="size-4" />
                    {searching ? "Tracing…" : "Trace"}
                </Button>
            </div>

            {error && (
                <p role="alert" className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    {error}
                </p>
            )}

            {genealogy && (
                <div className="mt-3 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{genealogy.fg_serial_number}</span>
                        <Badge
                            variant={genealogy.is_rejected ? "destructive" : "secondary"}
                            className="px-2 py-0 text-[11px]"
                        >
                            {genealogy.outcome}
                        </Badge>
                        {genealogy.fg_serial_status && (
                            <Badge variant="outline" className="px-2 py-0 text-[11px]">
                                {genealogy.fg_serial_status}
                            </Badge>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 rounded-md border border-border bg-muted/40 p-2 sm:grid-cols-4">
                        <div>
                            <span className="block text-muted-foreground">Booking</span>
                            <span className="font-semibold">{genealogy.booking?.booking_no || "-"}</span>
                        </div>
                        <div>
                            <span className="block text-muted-foreground">Production Order</span>
                            {genealogy.booking?.production_order?.order_no || "-"}
                        </div>
                        <div>
                            <span className="block text-muted-foreground">Warehouse</span>
                            {genealogy.booking?.warehouse?.name || "-"}
                        </div>
                        <div>
                            <span className="block text-muted-foreground">FG Unit Cost</span>
                            <span className="font-semibold">{money(genealogy.booking?.fg_unit_cost)}</span>
                        </div>
                    </div>

                    {genealogy.components?.length > 0 && (
                        <div className="overflow-hidden rounded-md border border-border">
                            <table className="w-full">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-2 py-1 text-left font-semibold">Component</th>
                                        <th className="px-2 py-1 text-right font-semibold">Used</th>
                                        <th className="px-2 py-1 text-right font-semibold">Scrap</th>
                                        <th className="px-2 py-1 text-right font-semibold">Amount</th>
                                        <th className="px-2 py-1 text-left font-semibold">Serials Consumed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {genealogy.components.map((line) => (
                                        <tr key={line.component_product_id} className="border-t border-border">
                                            <td className="px-2 py-1">{line.product_name || "-"}</td>
                                            <td className="px-2 py-1 text-right">{line.consumed_quantity}</td>
                                            <td className="px-2 py-1 text-right">{line.scrap_quantity}</td>
                                            <td className="px-2 py-1 text-right">{money(line.amount)}</td>
                                            <td className="px-2 py-1">
                                                {line.serials?.length > 0 ? (
                                                    <span className="flex flex-wrap gap-1">
                                                        {line.serials.map((serial) => (
                                                            <Badge
                                                                key={serial.serial_number}
                                                                variant="outline"
                                                                className="px-1.5 py-0 text-[10px]"
                                                            >
                                                                {serial.serial_number}
                                                            </Badge>
                                                        ))}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
