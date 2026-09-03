"use client"

import { Input as ShadInput } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PRODUCTION_ORDER_ACTION_COPY } from "./productionOrderUi"

export default function ProductionOrderActionDialog({
  pendingAction,
  actionReason,
  setActionReason,
  actionSubmitting,
  closeAction,
  confirmAction,
}) {
  const copy = pendingAction ? PRODUCTION_ORDER_ACTION_COPY[pendingAction.type] : null
  const row = pendingAction?.row

  return (
    <AlertDialog
      open={!!pendingAction}
      onOpenChange={(open) => {
        if (!open) closeAction()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {copy?.description}
            {row && (
              <span className="mt-2 block text-muted-foreground">
                Order: {row.order_no} · {row.fgProduct?.product_name || ""} · planned{" "}
                {row.planned_quantity}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {copy?.needsReason && (
          <ShadInput
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="Reason (required)"
            aria-label="Reason"
            disabled={actionSubmitting}
          />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={actionSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              confirmAction()
            }}
            disabled={actionSubmitting}
            loading={actionSubmitting}
          >
            {copy?.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
