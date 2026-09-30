"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import AutocompleteField from "@/components/common/AutocompleteField"
import Input from "@/components/common/Input"
import mastersService from "@/services/mastersService"
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants"

const lineRemaining = (item) => {
  if (item?.remaining_qty != null && item.remaining_qty !== "") {
    return Math.max(0, parseInt(item.remaining_qty, 10) || 0)
  }
  const ordered = parseInt(item?.order_qty ?? item?.quantity, 10) || 0
  const received = parseInt(item?.received_qty ?? item?.received_quantity, 10) || 0
  const cancelled = parseInt(item?.cancelled_qty ?? item?.cancelled_quantity, 10) || 0
  return Math.max(0, ordered - received - cancelled)
}

export default function PurchaseOrderCancelDialog({
  open,
  onOpenChange,
  order,
  onConfirm,
  loading = false,
}) {
  const [mode, setMode] = useState("full")
  const [selectedIds, setSelectedIds] = useState([])
  const [cancelReasonId, setCancelReasonId] = useState("")
  const [cancelRemarks, setCancelRemarks] = useState("")
  const [cancelReasonOptions, setCancelReasonOptions] = useState([])
  const [cancelReasonLoading, setCancelReasonLoading] = useState(false)

  const items = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order])
  const openLines = useMemo(
    () => items.filter((item) => lineRemaining(item) > 0),
    [items]
  )

  useEffect(() => {
    if (!open) {
      setMode("full")
      setSelectedIds([])
      setCancelReasonId("")
      setCancelRemarks("")
      return
    }
    setMode("full")
    setSelectedIds(openLines.map((item) => item.id))
    setCancelReasonId("")
    setCancelRemarks("")

    let cancelled = false
    ;(async () => {
      try {
        setCancelReasonLoading(true)
        const options = await mastersService.getReferenceOptionsSearch("reason.model", {
          reason_type: "purchase_order_cancellation",
          is_active: true,
        })
        if (!cancelled) setCancelReasonOptions(Array.isArray(options) ? options : [])
      } catch {
        if (!cancelled) setCancelReasonOptions([])
      } finally {
        if (!cancelled) setCancelReasonLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, order?.id])

  const selectedRemaining = useMemo(() => {
    const ids = mode === "full" ? openLines.map((item) => item.id) : selectedIds
    return openLines
      .filter((item) => ids.includes(item.id))
      .reduce((sum, item) => sum + lineRemaining(item), 0)
  }, [mode, openLines, selectedIds])

  const canSubmit =
    !!cancelReasonId &&
    selectedRemaining > 0 &&
    (mode === "full" || selectedIds.length > 0)

  const handleToggleLine = (id, checked) => {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id]
      return prev.filter((itemId) => itemId !== id)
    })
  }

  const handleConfirm = () => {
    if (!canSubmit) return
    const selectedReason = cancelReasonOptions.find((o) => String(o.id) === String(cancelReasonId))
    onConfirm?.({
      mode,
      item_ids: mode === "lines" ? selectedIds : undefined,
      cancellation_reason_id: cancelReasonId,
      cancellation_reason: selectedReason?.label || selectedReason?.reason || undefined,
      cancellation_remarks: cancelRemarks?.trim() || undefined,
    })
  }

  const anyReceived = items.some(
    (item) => (parseInt(item.received_qty ?? item.received_quantity, 10) || 0) > 0
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_FORM_MEDIUM}>
        <DialogHeader>
          <DialogTitle>
            {anyReceived ? "Cancel remaining quantity?" : "Cancel purchase order?"}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto space-y-3 text-sm pr-1">
          <p className="text-xs text-muted-foreground">
            Remaining quantity will be cancelled. Received quantity is not affected.
            {order?.po_number ? ` PO ${order.po_number}.` : ""}
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="po-cancel-mode"
                value="full"
                checked={mode === "full"}
                onChange={() => {
                  setMode("full")
                  setSelectedIds(openLines.map((item) => item.id))
                }}
              />
              Cancel remaining on all open lines
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="po-cancel-mode"
                value="lines"
                checked={mode === "lines"}
                onChange={() => setMode("lines")}
              />
              Cancel remaining on selected lines
            </label>
          </div>

          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold w-8"></th>
                  <th className="px-2 py-1 text-left font-semibold">Product</th>
                  <th className="px-2 py-1 text-right font-semibold">Ord</th>
                  <th className="px-2 py-1 text-right font-semibold">Rec</th>
                  <th className="px-2 py-1 text-right font-semibold">Rem</th>
                </tr>
              </thead>
              <tbody>
                {openLines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-2 text-muted-foreground">
                      No remaining quantity to cancel
                    </td>
                  </tr>
                ) : (
                  openLines.map((item) => {
                    const remaining = lineRemaining(item)
                    const checked = mode === "full" || selectedIds.includes(item.id)
                    return (
                      <tr key={item.id} className="border-t border-border">
                        <td className="px-2 py-1.5">
                          <Checkbox
                            checked={checked}
                            disabled={mode === "full" || loading}
                            onCheckedChange={(next) => handleToggleLine(item.id, next)}
                            aria-label={`Select ${item.product?.product_name || item.id}`}
                          />
                        </td>
                        <td className="px-2 py-1.5">{item.product?.product_name || item.id}</td>
                        <td className="px-2 py-1.5 text-right">{item.order_qty ?? item.quantity ?? 0}</td>
                        <td className="px-2 py-1.5 text-right">{item.received_qty ?? item.received_quantity ?? 0}</td>
                        <td className="px-2 py-1.5 text-right font-semibold">{remaining}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="font-medium">Qty to cancel: {selectedRemaining}</p>

          <AutocompleteField
            options={cancelReasonOptions}
            loading={cancelReasonLoading}
            value={cancelReasonOptions.find((o) => String(o.id) === String(cancelReasonId)) || null}
            onChange={(e, v) => setCancelReasonId(v?.id || "")}
            getOptionLabel={(o) => o?.label || o?.reason || ""}
            placeholder="Select cancellation reason"
            label="Reason"
            name="cancellation_reason_id"
            required
            fullWidth
          />
          <Input
            fullWidth
            label="Remarks (optional)"
            name="cancellation_remarks"
            value={cancelRemarks}
            onChange={(e) => setCancelRemarks(e.target.value)}
            multiline
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={loading}>
            Back
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading || !canSubmit} loading={loading}>
            {loading ? "Cancelling…" : "Cancel remaining"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
