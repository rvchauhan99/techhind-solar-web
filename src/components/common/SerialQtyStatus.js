"use client";

import React from "react";
import { Box, Chip, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Button } from "@/components/ui/button";
import { getSerialLineStatus } from "@/utils/serialInput";

const STATUS_CHIP = {
    complete: { color: "success", icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
    pending: { color: "warning", icon: <WarningAmberIcon sx={{ fontSize: 14 }} /> },
    over: { color: "error", icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} /> },
    empty: { color: "default", icon: undefined },
};

/**
 * Compact N/Q chip for serialized lines.
 */
export function SerialStatusChip({ count = 0, qty = 0, sizeProps = {} }) {
    const status = getSerialLineStatus(count, qty);
    const cfg = STATUS_CHIP[status] || STATUS_CHIP.empty;
    let label = `${count} / ${qty}`;
    if (status === "pending" && qty > count) {
        label = `${count} / ${qty} · ${qty - count} pending`;
    } else if (status === "over") {
        label = `${count} / ${qty} · remove ${count - qty} or raise qty`;
    }
    return (
        <Chip
            size="small"
            color={cfg.color}
            icon={cfg.icon}
            label={label}
            sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600, ...sizeProps.sx }}
            {...sizeProps}
        />
    );
}

/**
 * Footer strip shown when saving with fewer serials than qty.
 * Offers Set qty to N vs Keep Q (N pending).
 */
export function SerialPartialSaveStrip({
    filledCount,
    targetQty,
    onSetQty,
    onKeepQty,
    disabled = false,
}) {
    if (!filledCount || filledCount >= targetQty) return null;
    const pending = targetQty - filledCount;
    return (
        <Box
            sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 1,
                width: "100%",
                px: 0.5,
                py: 0.75,
                mb: 0.5,
                borderRadius: 1,
                bgcolor: "warning.50",
                border: 1,
                borderColor: "warning.200",
            }}
        >
            <Typography variant="caption" sx={{ flex: "1 1 160px", fontWeight: 600, color: "warning.dark" }}>
                {filledCount} of {targetQty} scanned · {pending} pending
            </Typography>
            <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={onKeepQty}
                className="min-h-[32px]"
            >
                Keep {targetQty} ({pending} pending)
            </Button>
            <Button
                type="button"
                size="sm"
                disabled={disabled}
                onClick={onSetQty}
                className="min-h-[32px] bg-amber-600 hover:bg-amber-700 text-white"
            >
                Set qty to {filledCount}
            </Button>
        </Box>
    );
}

/**
 * Inline one-click fix under submit validation error.
 */
export function SerialMismatchFixLink({ count, qty, onSetQty, productLabel = "" }) {
    if (!count || count === qty) return null;
    return (
        <Box sx={{ mt: 0.25 }}>
            <Typography variant="caption" color="error" component="span">
                Serials {count}/{qty}{productLabel ? ` for ${productLabel}` : ""}.{" "}
            </Typography>
            <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-primary underline"
                onClick={onSetQty}
            >
                Set qty to {count}
            </Button>
        </Box>
    );
}

export default SerialStatusChip;
