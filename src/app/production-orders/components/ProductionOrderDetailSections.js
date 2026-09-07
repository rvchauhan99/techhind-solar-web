"use client"

import { Fragment, useCallback, useState } from "react"
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import productionBookingService from "@/services/productionBookingService"
import { formatCurrency, formatDate } from "@/utils/dataTableUtils"
import { getApiErrorMessage } from "@/utils/toast"
import { AP } from "@/utils/assemblyProductionLabels"
import PossibleSubstitutesHint from "@/components/common/PossibleSubstitutesHint"
import {
  formatDateTime,
  formatQty,
  getStatusVariant,
} from "./productionOrderUi"

const DenseTable = ({ children, className = "" }) => (
  <div className={`overflow-x-auto rounded-md border border-border ${className}`}>
    <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
      {children}
    </table>
  </div>
)

const Th = ({ children, className = "" }) => (
  <th className={`bg-muted px-1.5 py-1 text-left text-xs font-semibold whitespace-nowrap ${className}`}>
    {children}
  </th>
)

const Td = ({ children, className = "" }) => (
  <td className={`border-t border-border px-1.5 py-1 ${className}`}>{children}</td>
)

const MetaGrid = ({ items }) => (
  <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-4">
    {items.map((item) => (
      <div key={item.label} className="rounded-md border border-border bg-muted/30 px-2 py-1">
        <span className="block text-[10px] font-semibold uppercase tracking-tight text-muted-foreground">
          {item.label}
        </span>
        <span className="text-xs font-medium break-words">{item.value ?? "-"}</span>
      </div>
    ))}
  </div>
)

export function ProductionOrderOverviewTab({ order, bomOperations }) {
  const bom = order?.productionBom
  return (
    <div className="space-y-3">
      <MetaGrid
        items={[
          { label: "Remarks", value: order?.remarks || "-" },
          { label: "Close reason", value: order?.close_reason || "-" },
          { label: "Requested by", value: order?.requestedBy?.name || "-" },
          { label: "Approved by", value: order?.approvedBy?.name || "-" },
          { label: "Approved at", value: formatDateTime(order?.approved_at) },
          { label: "BOM std material", value: formatCurrency(bom?.std_material_cost) },
          { label: "BOM std operation", value: formatCurrency(bom?.std_operation_cost) },
          { label: "BOM std total", value: formatCurrency(bom?.std_total_cost) },
        ]}
      />
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-tight text-muted-foreground">
          BOM operations
        </p>
        {bomOperations?.length ? (
          <DenseTable>
            <thead>
              <tr>
                <Th>Seq</Th>
                <Th>Operation</Th>
                <Th>Cost type</Th>
                <Th className="text-right">Std minutes</Th>
                <Th className="text-right">Rate / hr</Th>
                <Th className="text-right">Fixed</Th>
                <Th className="text-right">Std cost</Th>
              </tr>
            </thead>
            <tbody>
              {bomOperations.map((op) => (
                <tr key={op.id || op.sequence_no}>
                  <Td>{op.sequence_no}</Td>
                  <Td>{op.operation_name}</Td>
                  <Td>{op.cost_type}</Td>
                  <Td className="text-right">{formatQty(op.std_time_minutes, 2)}</Td>
                  <Td className="text-right">{formatCurrency(op.rate_per_hour)}</Td>
                  <Td className="text-right">{formatCurrency(op.fixed_cost)}</Td>
                  <Td className="text-right">{formatCurrency(op.std_cost)}</Td>
                </tr>
              ))}
            </tbody>
          </DenseTable>
        ) : (
          <p className="text-xs text-muted-foreground">No BOM operations on this {AP.orders.singular.toLowerCase()}.</p>
        )}
      </div>
    </div>
  )
}

export function ProductionOrderComponentsTab({ shortage, order }) {
  const lines = shortage?.components?.length
    ? shortage.components
    : (order?.components || []).map((line) => ({
        production_order_component_id: line.id,
        line_no: line.line_no,
        product_name: line.product?.product_name,
        serial_required: line.product?.serial_required,
        quantity_per: line.quantity_per,
        scrap_percent: line.scrap_percent,
        required_quantity: line.required_quantity,
        issued_quantity: line.issued_quantity,
        outstanding_quantity: Math.max(
          0,
          Number(line.required_quantity || 0) - Number(line.issued_quantity || 0)
        ),
        quantity_on_hand: null,
        shortage_quantity: 0,
        substitute_products: line.substitute_products || [],
        substitute_available_total: null,
        coverable_via_substitute: false,
      }))

  if (!lines.length) {
    return <p className="text-xs text-muted-foreground">No component snapshot on this {AP.orders.singular.toLowerCase()}.</p>
  }

  return (
    <DenseTable>
      <thead>
        <tr>
          <Th>Line</Th>
          <Th>Product</Th>
          <Th className="text-right">Qty / unit</Th>
          <Th className="text-right">Scrap %</Th>
          <Th className="text-right">Required</Th>
          <Th className="text-right">Issued</Th>
          <Th className="text-right">Outstanding</Th>
          <Th className="text-right">On hand</Th>
          <Th className="text-right">Shortage</Th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => {
          const hasShortage = Number(line.shortage_quantity || 0) > 0
          const snapshot = (order?.components || []).find(
            (c) => c.id === line.production_order_component_id
          )
          return (
            <tr
              key={line.production_order_component_id || line.line_no}
              className={hasShortage ? "bg-red-50" : undefined}
            >
              <Td>{line.line_no}</Td>
              <Td>
                <div>
                  <span>
                    {line.product_name || "-"}
                    {line.serial_required ? (
                      <span className="ml-1 text-muted-foreground">(serial)</span>
                    ) : null}
                  </span>
                  <PossibleSubstitutesHint substitutes={line.substitute_products} />
                  {hasShortage &&
                  Number(line.substitute_available_total || 0) > 0 ? (
                    <p className="mt-0.5 mb-0 text-[10px] leading-snug text-amber-800">
                      Alt avail {formatQty(line.substitute_available_total)}
                      {line.coverable_via_substitute ? " (covers shortage)" : ""}
                    </p>
                  ) : null}
                </div>
              </Td>
              <Td className="text-right">{formatQty(snapshot?.quantity_per ?? line.quantity_per)}</Td>
              <Td className="text-right">{formatQty(snapshot?.scrap_percent ?? line.scrap_percent, 2)}</Td>
              <Td className="text-right">{formatQty(line.required_quantity)}</Td>
              <Td className="text-right">{formatQty(line.issued_quantity)}</Td>
              <Td className="text-right">{formatQty(line.outstanding_quantity)}</Td>
              <Td className="text-right">
                {line.quantity_on_hand == null ? "-" : formatQty(line.quantity_on_hand)}
              </Td>
              <Td className={`text-right ${hasShortage ? "font-semibold text-destructive" : ""}`}>
                {hasShortage ? formatQty(line.shortage_quantity) : "-"}
              </Td>
            </tr>
          )
        })}
      </tbody>
    </DenseTable>
  )
}

function BookingExpandPanel({ booking, detail }) {
  const components = booking.components || []
  const fgSerials = detail?.fgSerials || detail?.fg_serials || []
  const operations = detail?.operations || []

  return (
    <div className="space-y-2 bg-slate-50/80 px-2 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground">
        Component issues
      </p>
      {components.length ? (
        <DenseTable>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th className="text-right">Std</Th>
              <Th className="text-right">Consumed</Th>
              <Th className="text-right">Scrap</Th>
              <Th className="text-right">Variance</Th>
              <Th className="text-right">Rate</Th>
              <Th className="text-right">Amount</Th>
              <Th className="text-right">Serials</Th>
            </tr>
          </thead>
          <tbody>
            {components.map((line) => {
              const originalId = Number(
                line.original_component_product_id ?? line.component_product_id
              )
              const isSubstituted =
                Number(line.component_product_id) !== originalId &&
                Number.isFinite(originalId)
              return (
              <tr key={line.id || line.line_no}>
                <Td>
                  <div className="flex flex-wrap items-center gap-1">
                    <span>{line.product_name || "-"}</span>
                    {isSubstituted ? (
                      <span className="inline-flex items-center rounded px-1 py-0 text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        Substituted
                      </span>
                    ) : null}
                  </div>
                  {line.serial_numbers?.length ? (
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {line.serial_numbers.join(", ")}
                    </span>
                  ) : null}
                </Td>
                <Td className="text-right">{formatQty(line.standard_quantity)}</Td>
                <Td className="text-right">{formatQty(line.consumed_quantity)}</Td>
                <Td className="text-right">{formatQty(line.scrap_quantity)}</Td>
                <Td
                  className={`text-right ${
                    Number(line.variance_quantity || 0) !== 0 ? "font-semibold text-amber-700" : ""
                  }`}
                >
                  {formatQty(line.variance_quantity)}
                </Td>
                <Td className="text-right">{formatCurrency(line.rate)}</Td>
                <Td className="text-right">{formatCurrency(line.amount)}</Td>
                <Td className="text-right">{line.serial_count ?? line.serial_numbers?.length ?? 0}</Td>
              </tr>
              )
            })}
          </tbody>
        </DenseTable>
      ) : (
        <p className="text-xs text-muted-foreground">No component lines on this booking.</p>
      )}

      {detail === undefined ? (
        <p className="text-xs text-muted-foreground">Loading serials and operations…</p>
      ) : null}

      {fgSerials.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-tight text-muted-foreground">
            Finished-good serials
          </p>
          <div className="flex flex-wrap gap-1">
            {fgSerials.map((serial) => (
              <Badge key={serial.id || serial.serial_number} variant="outline" className="px-1.5 py-0 text-[10px]">
                {serial.serial_number || serial.stockSerial?.serial_number || serial.id}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {operations.length > 0 && (
        <DenseTable>
          <thead>
            <tr>
              <Th>Seq</Th>
              <Th>Operation</Th>
              <Th className="text-right">Cost</Th>
            </tr>
          </thead>
          <tbody>
            {operations.map((op) => (
              <tr key={op.id || op.sequence_no}>
                <Td>{op.sequence_no}</Td>
                <Td>{op.operation_name}</Td>
                <Td className="text-right">{formatCurrency(op.cost ?? op.std_cost)}</Td>
              </tr>
            ))}
          </tbody>
        </DenseTable>
      )}
    </div>
  )
}

export function ProductionOrderBookingsTab({ bookings }) {
  const [expandedId, setExpandedId] = useState(null)
  const [detailsById, setDetailsById] = useState({})
  const [loadingId, setLoadingId] = useState(null)

  const handleToggle = useCallback(
    async (booking) => {
      const nextId = expandedId === booking.id ? null : booking.id
      setExpandedId(nextId)
      if (!nextId || detailsById[booking.id] !== undefined) return
      if (booking.status !== "POSTED") {
        setDetailsById((prev) => ({ ...prev, [booking.id]: null }))
        return
      }
      setLoadingId(booking.id)
      try {
        const res = await productionBookingService.getProductionBookingById(booking.id)
        setDetailsById((prev) => ({ ...prev, [booking.id]: res?.result || res || null }))
      } catch (error) {
        setDetailsById((prev) => ({ ...prev, [booking.id]: { _error: getApiErrorMessage(error, "Failed to load booking") } }))
      } finally {
        setLoadingId(null)
      }
    },
    [detailsById, expandedId]
  )

  if (!bookings?.length) {
    return <p className="text-xs text-muted-foreground">No bookings for this {AP.orders.singular.toLowerCase()}.</p>
  }

  return (
    <DenseTable>
      <thead>
        <tr>
          <Th className="w-8" />
          <Th>Booking</Th>
          <Th>Date</Th>
          <Th>Status</Th>
          <Th className="text-right">Good</Th>
          <Th className="text-right">Rejected</Th>
          <Th className="text-right">Unit cost</Th>
          <Th className="text-right">Total cost</Th>
          <Th>Posted by</Th>
        </tr>
      </thead>
      <tbody>
        {bookings.map((booking) => {
          const isOpen = expandedId === booking.id
          return (
            <Fragment key={booking.id}>
              <tr className="hover:bg-green-50/40">
                <Td>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    onClick={() => handleToggle(booking)}
                    aria-label={isOpen ? "Collapse booking" : "Expand booking"}
                  >
                    {isOpen ? (
                      <IconChevronDown className="size-3.5" />
                    ) : (
                      <IconChevronRight className="size-3.5" />
                    )}
                  </Button>
                </Td>
                <Td>
                  <span className="font-medium">{booking.booking_no}</span>
                </Td>
                <Td>{booking.booking_date ? formatDate(booking.booking_date) : "-"}</Td>
                <Td>
                  <Badge variant={getStatusVariant(booking.status)} className="px-1.5 py-0 text-[10px]">
                    {booking.status}
                  </Badge>
                </Td>
                <Td className="text-right">{formatQty(booking.good_quantity, 0)}</Td>
                <Td className="text-right">{formatQty(booking.rejected_quantity, 0)}</Td>
                <Td className="text-right">{formatCurrency(booking.fg_unit_cost)}</Td>
                <Td className="text-right">{formatCurrency(booking.total_cost)}</Td>
                <Td>
                  {booking.postedBy?.name || "-"}
                  {booking.posted_at ? (
                    <span className="block text-[10px] text-muted-foreground">
                      {formatDateTime(booking.posted_at)}
                    </span>
                  ) : null}
                </Td>
              </tr>
              {isOpen && (
                <tr>
                  <td colSpan={9} className="p-0">
                    {detailsById[booking.id]?._error ? (
                      <p className="px-2 py-1.5 text-xs text-destructive">
                        {detailsById[booking.id]._error}
                      </p>
                    ) : (
                      <BookingExpandPanel
                        booking={booking}
                        detail={loadingId === booking.id ? undefined : detailsById[booking.id]}
                      />
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </tbody>
    </DenseTable>
  )
}

export function ProductionOrderCostTab({ rollup }) {
  const components = rollup?.components || []
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
        <div className="rounded-md border border-border px-2 py-1.5">
          <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
            Posted material
          </span>
          <span className="text-sm font-semibold">{formatCurrency(rollup?.total_material_cost)}</span>
        </div>
        <div className="rounded-md border border-border px-2 py-1.5">
          <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
            Posted operation
          </span>
          <span className="text-sm font-semibold">{formatCurrency(rollup?.total_operation_cost)}</span>
        </div>
        <div className="rounded-md border border-border px-2 py-1.5">
          <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
            Production value
          </span>
          <span className="text-sm font-semibold">{formatCurrency(rollup?.production_value)}</span>
        </div>
        <div className="rounded-md border border-border px-2 py-1.5">
          <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
            Posted qty
          </span>
          <span className="text-sm font-semibold">
            {formatQty(rollup?.posted_good_quantity, 0)} good / {formatQty(rollup?.posted_rejected_quantity, 0)} rejected
          </span>
        </div>
      </div>

      {components.length ? (
        <DenseTable>
          <thead>
            <tr>
              <Th>Component</Th>
              <Th className="text-right">Required</Th>
              <Th className="text-right">Issued</Th>
              <Th className="text-right">Std</Th>
              <Th className="text-right">Consumed</Th>
              <Th className="text-right">Scrap</Th>
              <Th className="text-right">Variance</Th>
              <Th className="text-right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {components.map((line) => (
              <tr key={line.component_product_id || line.line_no}>
                <Td>{line.product_name || "-"}</Td>
                <Td className="text-right">{formatQty(line.required_quantity)}</Td>
                <Td className="text-right">{formatQty(line.issued_quantity)}</Td>
                <Td className="text-right">{formatQty(line.standard_quantity)}</Td>
                <Td className="text-right">{formatQty(line.consumed_quantity)}</Td>
                <Td className="text-right">{formatQty(line.scrap_quantity)}</Td>
                <Td
                  className={`text-right ${
                    Number(line.variance_quantity || 0) !== 0 ? "font-semibold text-amber-700" : ""
                  }`}
                >
                  {formatQty(line.variance_quantity)}
                </Td>
                <Td className="text-right">{formatCurrency(line.amount)}</Td>
              </tr>
            ))}
          </tbody>
        </DenseTable>
      ) : (
        <p className="text-xs text-muted-foreground">No posted component variance yet.</p>
      )}
    </div>
  )
}

export function ProductionOrderAuditTab({ order }) {
  return (
    <MetaGrid
      items={[
        { label: "Created at", value: formatDateTime(order?.created_at) },
        { label: "Updated at", value: formatDateTime(order?.updated_at) },
        { label: "Requested by", value: order?.requestedBy?.name || "-" },
        { label: "Requested email", value: order?.requestedBy?.email || "-" },
        { label: "Approved by", value: order?.approvedBy?.name || "-" },
        { label: "Approved at", value: formatDateTime(order?.approved_at) },
        { label: "Closed at", value: formatDateTime(order?.closed_at) },
        { label: "Close reason", value: order?.close_reason || "-" },
      ]}
    />
  )
}
