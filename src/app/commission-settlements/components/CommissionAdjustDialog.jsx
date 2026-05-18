"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import commissionSettlementService from "@/services/commissionSettlementService";
import { deriveAdjustmentPreview, fmtMoney } from "../utils/settlementMoney";

function roundMoney(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

export default function CommissionAdjustDialog({ open, row, onClose, onSaved }) {
  const systemAmount = useMemo(
    () => roundMoney(row?.original_amount ?? row?.amount ?? 0),
    [row]
  );

  const [finalAmount, setFinalAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setFinalAmount(String(roundMoney(row.amount ?? systemAmount)));
    setReason(row.adjustment_reason || "");
  }, [open, row, systemAmount]);

  const preview = useMemo(() => {
    const final = Number(finalAmount);
    if (!Number.isFinite(final)) {
      return deriveAdjustmentPreview(systemAmount, systemAmount);
    }
    return deriveAdjustmentPreview(systemAmount, final);
  }, [systemAmount, finalAmount]);

  const save = async (payload) => {
    if (!row?.id) return;
    setSaving(true);
    try {
      await commissionSettlementService.adjustCommissionLedgerEntry(row.id, payload);
      toast.success("Commission adjustment saved");
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const final = Number(finalAmount);
    if (!Number.isFinite(final) || final < 0) {
      toast.error("Enter a valid final amount (0 or greater)");
      return;
    }
    const roundedFinal = roundMoney(final);
    const roundedSystem = roundMoney(systemAmount);
    if (roundedFinal !== roundedSystem && String(reason).trim().length < 3) {
      toast.error("Reason is required when amount differs from system (min 3 characters)");
      return;
    }
    save({
      effective_amount: roundedFinal,
      adjustment_reason: String(reason).trim() || undefined,
    });
  };

  const handleReset = () => {
    save({ adjustment_type: null });
  };

  if (!row) return null;

  const previewStripClass =
    preview.type === "bonus"
      ? "border-emerald-200 bg-emerald-50"
      : preview.type === "deduction"
        ? "border-rose-200 bg-rose-50"
        : "border-slate-200 bg-slate-50";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md gap-3">
        <DialogHeader>
          <DialogTitle className="text-sm">Adjust commission</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 text-[11px] rounded border border-slate-100 bg-slate-50/80 p-2">
          <div>
            <span className="text-muted-foreground">Order</span>
            <p className="font-medium">{row.order_number || row.order_id}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Beneficiary</span>
            <p className="font-medium truncate">{row.beneficiary_name || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Role</span>
            <p className="font-medium">{row.role || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">System commission</span>
            <p className="font-semibold">₹ {fmtMoney(systemAmount)}</p>
          </div>
          {row.per_kw != null ? (
            <div className="col-span-2 text-[10px] text-muted-foreground">
              {fmtMoney(row.per_kw)} / kW × {row.capacity_kw ?? "—"} kW
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Final amount (₹)</Label>
          <Input
            className="h-8 text-sm"
            inputMode="decimal"
            value={finalAmount}
            onChange={(e) => setFinalAmount(e.target.value)}
            placeholder={fmtMoney(systemAmount)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">
            Reason{preview.type ? " (required)" : " (optional)"}
          </Label>
          <textarea
            className="w-full min-h-[72px] rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why does the final amount differ from system commission?"
          />
        </div>

        <div
          className={`rounded-md border px-2 py-2 flex items-center justify-between gap-2 ${previewStripClass}`}
        >
          <span className="text-[11px] text-slate-600">
            ₹ {fmtMoney(systemAmount)} → <strong>₹ {fmtMoney(preview.net)}</strong>
          </span>
          {preview.type ? (
            <Badge
              variant="outline"
              className={`text-[10px] ${
                preview.type === "bonus"
                  ? "border-emerald-300 bg-white text-emerald-700"
                  : "border-rose-300 bg-white text-rose-700"
              }`}
            >
              {preview.type === "bonus" ? "Bonus" : "Deduction"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] border-slate-300 bg-white text-slate-600">
              No change
            </Badge>
          )}
        </div>

        <div className="flex justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={handleReset}
            disabled={saving || !row.has_adjustment}
          >
            Reset to system
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
