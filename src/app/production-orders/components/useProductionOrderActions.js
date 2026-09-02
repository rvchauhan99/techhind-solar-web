"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"
import productionOrderService from "@/services/productionOrderService"
import { getApiErrorMessage } from "@/utils/toast"

/**
 * Shared approve / cancel / short-close dialog state for list and detail pages.
 */
export default function useProductionOrderActions({ onSuccess } = {}) {
  const [pendingAction, setPendingAction] = useState(null)
  const [actionReason, setActionReason] = useState("")
  const [actionSubmitting, setActionSubmitting] = useState(false)

  const openAction = useCallback((type, row) => {
    setActionReason("")
    setPendingAction({ type, row })
  }, [])

  const closeAction = useCallback(() => {
    setPendingAction(null)
    setActionReason("")
  }, [])

  const confirmAction = useCallback(async () => {
    if (!pendingAction) return
    const { type, row } = pendingAction
    const reason = actionReason.trim()

    if ((type === "cancel" || type === "shortClose") && !reason) {
      toast.error("A reason is required")
      return
    }

    setActionSubmitting(true)
    try {
      if (type === "approve") {
        await productionOrderService.approveProductionOrder(row.id)
        toast.success(`Order ${row.order_no} approved. Component requirement is now frozen.`)
      } else if (type === "cancel") {
        await productionOrderService.cancelProductionOrder(row.id, reason)
        toast.success(`Order ${row.order_no} cancelled`)
      } else if (type === "shortClose") {
        await productionOrderService.shortCloseProductionOrder(row.id, reason)
        toast.success(`Order ${row.order_no} short closed`)
      }
      setPendingAction(null)
      setActionReason("")
      await onSuccess?.(type, row)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Action failed"))
    } finally {
      setActionSubmitting(false)
    }
  }, [pendingAction, actionReason, onSuccess])

  return {
    pendingAction,
    actionReason,
    setActionReason,
    actionSubmitting,
    openAction,
    closeAction,
    confirmAction,
  }
}
