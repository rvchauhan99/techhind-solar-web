"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  IconCircleCheck,
  IconCurrencyRupee,
  IconDownload,
  IconPencil,
  IconPercentage,
  IconPlayerStop,
  IconTool,
  IconX,
} from "@tabler/icons-react"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import AddEditPageShell from "@/components/common/AddEditPageShell"
import Loader from "@/components/common/Loader"
import StatCard from "@/components/common/StatCard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import productionOrderService from "@/services/productionOrderService"
import { useAuth } from "@/hooks/useAuth"
import { formatCurrency, formatDate } from "@/utils/dataTableUtils"
import { getApiErrorMessage } from "@/utils/toast"
import { AP } from "@/utils/assemblyProductionLabels"
import useProductionOrderActions from "../components/useProductionOrderActions"
import ProductionOrderActionDialog from "../components/ProductionOrderActionDialog"
import {
  ProductionOrderAuditTab,
  ProductionOrderBookingsTab,
  ProductionOrderComponentsTab,
  ProductionOrderCostTab,
  ProductionOrderOverviewTab,
} from "../components/ProductionOrderDetailSections"
import {
  formatQty,
  getPriorityVariant,
  getStatusVariant,
} from "../components/productionOrderUi"

function ProductionOrderDetailContent() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id
  const { modulePermissions, currentModuleId } = useAuth()
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  }

  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [detail, setDetail] = useState(null)
  const [tab, setTab] = useState("overview")

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await productionOrderService.getProductionOrderDetail(id)
      setDetail(res?.result || res)
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Failed to load ${AP.orders.singular.toLowerCase()}`))
      router.push("/production-orders")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    load()
  }, [load])

  const order = detail?.order
  const actions = useProductionOrderActions({
    onSuccess: async () => {
      await load()
    },
  })

  const handleExport = useCallback(async () => {
    if (!id) return
    setExporting(true)
    try {
      const blob = await productionOrderService.exportProductionOrderDetail(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `production-order-${order?.order_no || id}-${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Order report downloaded")
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Failed to export ${AP.orders.singular.toLowerCase()}`))
    } finally {
      setExporting(false)
    }
  }, [id, order?.order_no])

  const isOpen = order?.status === "APPROVED" || order?.status === "IN_PROGRESS"
  const actionRow = order
    ? {
        id: order.id,
        order_no: order.order_no,
        planned_quantity: order.planned_quantity,
        fgProduct: order.fgProduct,
        status: order.status,
      }
    : null

  return (
    <AddEditPageShell
      title={order?.order_no ? `${AP.orders.singular} ${order.order_no}` : AP.orders.singular}
      listHref="/production-orders"
      listLabel={AP.orders.title}
      className="gap-2"
    >
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader />
        </div>
      ) : !order ? (
        <p className="text-sm text-muted-foreground">{AP.orders.singular} not found.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 border-b border-border pb-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-lg font-semibold tracking-tight">{order.order_no}</h2>
                <Badge
                  variant={getStatusVariant(order.status)}
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                >
                  {order.status}
                </Badge>
                <Badge variant={getPriorityVariant(order.priority)} className="px-2 py-0 text-xs">
                  {order.priority}
                </Badge>
                {order.fgProduct?.serial_required ? (
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                    Serial FG
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>
                  <span className="font-semibold text-foreground">WH:</span> {order.warehouse?.name || "-"}
                </span>
                <span>
                  <span className="font-semibold text-foreground">FG:</span>{" "}
                  {order.fgProduct?.product_name || "-"}
                </span>
                <span>
                  <span className="font-semibold text-foreground">BOM:</span>{" "}
                  {order.productionBom
                    ? `${order.productionBom.bom_code || `#${order.productionBom.id}`} v${order.bom_version_no ?? order.productionBom.version_no}`
                    : "-"}
                </span>
                <span>
                  <span className="font-semibold text-foreground">Plan:</span>{" "}
                  {order.planned_start_date ? formatDate(order.planned_start_date) : "-"} —{" "}
                  {order.planned_end_date ? formatDate(order.planned_end_date) : "-"}
                </span>
                {order.reference_type ? (
                  <span>
                    <span className="font-semibold text-foreground">Ref:</span> {order.reference_type}
                    {order.reference_id ? ` #${order.reference_id}` : ""}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {order.status === "DRAFT" && currentPerm.can_update && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  onClick={() => router.push(`/production-orders/edit?id=${order.id}`)}
                >
                  <IconPencil className="size-4" />
                  Edit
                </Button>
              )}
              {order.status === "DRAFT" && currentPerm.can_update && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() => actions.openAction("approve", actionRow)}
                >
                  <IconCircleCheck className="size-4" />
                  Approve
                </Button>
              )}
              {isOpen && currentPerm.can_create && (
                <Button
                  type="button"
                  size="sm"
                  variant="success"
                  className="h-8 gap-1"
                  onClick={() =>
                    router.push(`/production-bookings/new?production_order_id=${order.id}`)
                  }
                >
                  <IconTool className="size-4" />
                  {AP.orders.bookAssembly}
                </Button>
              )}
              {isOpen && currentPerm.can_update && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  onClick={() => actions.openAction("shortClose", actionRow)}
                >
                  <IconPlayerStop className="size-4" />
                  Short Close
                </Button>
              )}
              {(order.status === "DRAFT" || isOpen) && currentPerm.can_update && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-destructive"
                  onClick={() => actions.openAction("cancel", actionRow)}
                >
                  <IconX className="size-4" />
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={handleExport}
                disabled={exporting}
                loading={exporting}
              >
                <IconDownload className="size-4" />
                Export Report
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Planned"
              value={formatQty(order.planned_quantity, 0)}
              accentColor="#1b365d"
            />
            <StatCard
              label="Produced"
              value={formatQty(order.produced_quantity, 0)}
              accentColor="#00823b"
              valueColor="#00823b"
            />
            <StatCard
              label="Rejected"
              value={formatQty(order.rejected_quantity, 0)}
              accentColor="#dc2626"
              valueColor="#dc2626"
              icon={<IconX size={16} />}
            />
            <StatCard
              label="Pending"
              value={formatQty(order.pending_quantity, 0)}
              accentColor="#d97706"
            />
            <StatCard
              label="Completion"
              value={`${Number(order.completion_percent || 0).toFixed(0)}%`}
              accentColor="#2563eb"
              icon={<IconPercentage size={16} />}
            />
            <StatCard
              label="Posted value"
              value={formatCurrency(detail.rollup?.production_value)}
              accentColor="#0f766e"
              icon={<IconCurrencyRupee size={16} />}
            />
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="h-8 gap-1 bg-slate-100 p-0.5">
              <TabsTrigger value="overview" className="h-7 px-2 text-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="components" className="h-7 px-2 text-xs">
                Components
              </TabsTrigger>
              <TabsTrigger value="bookings" className="h-7 px-2 text-xs">
                Bookings
              </TabsTrigger>
              <TabsTrigger value="cost" className="h-7 px-2 text-xs">
                Cost & Variance
              </TabsTrigger>
              <TabsTrigger value="audit" className="h-7 px-2 text-xs">
                Audit
              </TabsTrigger>
            </TabsList>
            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              <TabsContent value="overview" className="m-0">
                <ProductionOrderOverviewTab
                  order={order}
                  bomOperations={detail.bom_operations || []}
                />
              </TabsContent>
              <TabsContent value="components" className="m-0">
                <ProductionOrderComponentsTab shortage={detail.shortage} order={order} />
              </TabsContent>
              <TabsContent value="bookings" className="m-0">
                <ProductionOrderBookingsTab bookings={detail.bookings || []} />
              </TabsContent>
              <TabsContent value="cost" className="m-0">
                <ProductionOrderCostTab rollup={detail.rollup} />
              </TabsContent>
              <TabsContent value="audit" className="m-0">
                <ProductionOrderAuditTab order={order} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}

      <ProductionOrderActionDialog {...actions} />
    </AddEditPageShell>
  )
}

export default function ProductionOrderDetailPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="flex min-h-[100vh] items-center justify-center">
            <Loader />
          </div>
        }
      >
        <ProductionOrderDetailContent />
      </Suspense>
    </ProtectedRoute>
  )
}
