# Workflow: BOM to Finished Good

## Overview

This workflow covers the complete in-house production path — from defining a bill of materials through posting assembly bookings until finished goods are in stock and the work order is closed.

## Process Flow

```
BOM Master Setup → Work Order Create → Work Order Approve
    → Print Picklist → Production/Assembly Booking → Post Booking
    → Stock & Ledger Update → (Repeat bookings until complete)
    → Work Order Complete or Short Close
```

## Prerequisites

Before starting production:

1. **Finished good** and **component products** exist in Product Master
2. **Production warehouse** is configured with branches
3. **Component stock** is available at the production warehouse (via PO inward, transfer, or adjustment)
4. **Rejection warehouse** is configured if rejects are expected (`production.rejection_warehouse_id`)
5. User role has permissions for BOM Master, Work Orders, and Production/Assembly Booking

## Stage Details

### Stage 1: BOM Master Setup

- **Module:** BOM Master (`/production-bom`)
- **Actions:**
  - Create BOM for the finished good in DRAFT status
  - Add component lines with quantity per BOM output quantity
  - Add operation lines with standard labour/machine/overhead costs
  - Review rolled standard material, operation, and total cost
  - Activate BOM (mark as default version if applicable)
- **Output:** ACTIVE BOM ready to back work orders

### Stage 2: Work Order Create

- **Module:** Work Orders (`/production-orders/new`)
- **Actions:**
  - Select finished good, production warehouse, planned quantity
  - Set schedule, priority, and optional reference/remarks
  - System resolves active BOM and previews component requirements
- **Output:** DRAFT work order with order number assigned

### Stage 3: Work Order Approve

- **Module:** Work Orders (`/production-orders/[id]`)
- **Actions:**
  - Review planned qty, BOM version, and component snapshot
  - Check shortage view for component availability gaps
  - Approve work order — freezes BOM snapshot and required quantities
- **Output:** APPROVED work order open for bookings

### Stage 4: Warehouse Picking (optional)

- **Module:** Work Orders — Print Picklist
- **Actions:**
  - Print **Work Order Picklist** PDF from work order detail
  - Pick components from production warehouse bins
  - Note lines with shortage (highlighted on picklist)
- **Output:** Physical pick completed; components staged for assembly

### Stage 5: Production/Assembly Booking

- **Module:** Production/Assembly Booking (`/production-bookings/new`)
- **Actions:**
  - Select approved/in-progress work order
  - Enter good quantity and optional rejected quantity
  - Review backflush component lines (consumed qty is fixed; adjust scrap if needed)
  - Enter serial numbers for serialized components and FG (if applicable)
  - Set rejection warehouse and reason when rejecting units
  - Confirm & Post Booking
- **Output:** POSTED booking; components issued, FG received

### Stage 6: Stock and Ledger Update

- **Modules:** Stocks, Inventory Ledger
- **Automatic effects on post:**
  - Component stock decreased (consumed + scrap)
  - Finished good stock increased at production warehouse
  - Rejected FG routed to rejection warehouse (if applicable)
  - Inventory ledger entries: `PRODUCTION_ISSUE_OUT`, `PRODUCTION_RECEIPT_IN`, etc.
  - FG weighted average cost updated
- **Output:** Real-time stock and cost visible across platform

### Stage 7: Repeat Until Complete

- **Module:** Production/Assembly Booking
- **Actions:**
  - Create additional bookings until produced + rejected qty reaches planned qty
  - Work order status moves IN_PROGRESS → COMPLETED automatically
  - Monitor progress on Dashboard and Work Order detail KPIs
- **Output:** Planned quantity fulfilled

### Stage 8: Close or Short Close

- **Module:** Work Orders
- **Actions:**
  - **Complete** — automatic when planned qty reached
  - **Short close** — if production stops early with partial output; retains posted bookings
  - **Cancel** — only if no bookings were posted (voids DRAFT/APPROVED order)
- **Output:** Work order in terminal status; no further bookings allowed

## Serial Traceability

For serialized finished goods:

1. Each booking with serialized FG accepts exactly one output unit (good or rejected)
2. FG serial is registered at post with computed unit cost
3. **Serial genealogy** on the Dashboard traces FG serial → production booking → consumed component serials

This links assembly output back to inbound component serial history (from PO inward or transfer).

## Cost Flow

```
BOM standard cost (planning)
    ↓
Booking post → material cost (components at WAC) + operation cost (BOM ops scaled)
    ↓
FG unit cost / WAC updated at production warehouse
    ↓
Work order Cost tab → compare standard vs posted cumulative value
```

## Exception Paths

| Situation | Action |
|-----------|--------|
| Component shortage at post | Booking blocked; procure or transfer stock first |
| Scrap during assembly | Enter scrap qty + reason on booking line; issues additional stock OUT |
| Rejected FG | Enter rejected qty; requires rejection warehouse |
| Wrong posted booking | Cancel booking from Booking History (reverses stock/ledger) |
| Cannot reach planned qty | Short close work order with reason |
| BOM recipe change needed | Clone BOM as new version; use on new work orders only |

## Key Controls

| Control | Stage |
|---------|-------|
| ACTIVE BOM required | Stage 1 |
| Approval before booking | Stage 3 |
| Backflush consumed qty (read-only) | Stage 5 |
| Stock validation at post | Stage 5 |
| No booking edit after post | Stage 5–7 |
| Atomic cancel reversal | Exception |

## Related Chapters

- [Production / Assembly](../modules/18-production-assembly.md)
- [Procurement to Stock](procurement-to-stock.md)
- [Document Outputs](../modules/17-document-outputs.md)
- [Procurement & Inventory](../modules/11-procurement-inventory.md)
