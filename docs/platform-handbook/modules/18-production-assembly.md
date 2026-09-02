# Production / Assembly

## Business Purpose

Plan and execute in-house assembly or kitting of **finished goods (FG)** from component materials at a **production warehouse**. The module covers BOM definition, work order planning, warehouse picking, component issue, finished-good receipt, cost roll-up, and management visibility — without leaving the TechHind Solar platform.

Typical use cases:

- Assembling inverter kits, junction boxes, or pre-wired combiner units from stocked components
- Converting bulk/lot-tracked materials into serialized finished goods
- Tracking material consumption, scrap, rejection, and production value for finance and operations

## Who Uses It

| Role | Primary screens |
|------|-----------------|
| Production planner | BOM Master, Work Orders, Dashboard |
| Warehouse / stores | Work Order picklist, Production/Assembly Booking |
| Shop-floor operator | Production/Assembly Booking (post good/rejected output) |
| Finance / management | Dashboard KPIs, Work Order cost tabs, Excel exports |

## Module Structure

All screens sit under the parent menu **Production / Assembly**. Role permissions are assigned per child module.

| Menu item | Route | Module key |
|-----------|-------|------------|
| Production/Assembly Dashboard | `/production-dashboard` | `production_dashboard` |
| BOM Master | `/production-bom` | `production_bom` |
| Work Orders | `/production-orders` | `production_orders` |
| Production/Assembly Booking | `/production-bookings/new` | `production_bookings` |
| Booking History | `/production-bookings` | `production_bookings_history` |

## Key Functions at a Glance

| Step | Screen | Function | Outcome |
|------|--------|----------|---------|
| 1 | BOM Master | Define and activate BOM | ACTIVE recipe with std material + operation cost |
| 2 | Work Orders | Create and approve work order | BOM snapshot frozen; production authorized |
| 3 | Work Orders | Print picklist PDF | Warehouse picking sheet with shortage flags |
| 4 | Production/Assembly Booking | Post booking | Components issued; FG received; ledger updated |
| 5 | Dashboard | Monitor KPIs and pipeline | Visibility into open orders, rejection, value |
| 6 | Booking History | Review and cancel if needed | Audit trail; reversal restores stock |

## Terminology

| Term | Meaning |
|------|---------|
| **Work Order** | A planned production run for a finished good (UI label; internal reference: production order) |
| **Finished Good (FG)** | The product being manufactured — must exist in Product Master |
| **BOM Master** | Bill of materials: component quantities and operation costs per BOM output quantity |
| **BOM snapshot** | Frozen copy of BOM component lines stored on the work order at approval |
| **Booking** | A production/assembly transaction that issues components and receives FG in one post |
| **Backflush** | System calculation of component quantities required for a given good/rejected output qty |
| **Consumed qty** | Component quantity issued into production (backflush-calculated; not manually overridden) |
| **Scrap qty** | Additional component quantity written off beyond standard consumption |
| **Variance** | Difference between issued qty (consumed + scrap) and standard qty for the booking |
| **Shortage** | Outstanding component requirement minus quantity on hand at the production warehouse |

---

## BOM Master

**Route:** `/production-bom`

### Purpose

Define how a finished good is built: which components are required per unit of output, optional operation steps, and standard material + operation costs.

### BOM lifecycle

| Status | Meaning | Allowed actions |
|--------|---------|-----------------|
| **DRAFT** | Under construction | Edit components, operations, output qty; activate when ready |
| **ACTIVE** | Live version — can back work orders | Deactivate; clone as new version (cannot edit lines in place) |
| **INACTIVE** | Retired | Read-only; not selectable for new work orders |

Only **ACTIVE** BOMs can back a work order. When multiple versions exist for the same FG, the default active version is preferred.

### BOM structure

Each BOM record includes:

- **Finished good product** — the output SKU
- **Output quantity** — basis for component scaling (e.g. BOM defines qty per 1 unit or per batch)
- **Component lines** — product, quantity per output, optional flag
- **Operation lines** — sequence, operation name, cost type (labour, machine, overhead, subcontract, other), standard time, rate, fixed cost, computed standard cost
- **Standard costs** — rolled material cost, operation cost, and total standard cost per BOM output

### Versioning

When an ACTIVE BOM must change:

1. Use **Clone as new version** to create a DRAFT copy with incremented version number
2. Edit the new DRAFT version
3. Activate the new version (optionally as default)
4. Deactivate the old version if no longer needed

This preserves audit integrity for work orders that were approved against the previous snapshot.

### Listing and filters

The BOM list supports quick search, column filters (code, name, FG product, status, default flag), and actions: view, edit (DRAFT only), activate, deactivate, clone version.

---

## Work Orders

**Routes:** `/production-orders`, `/production-orders/new`, `/production-orders/[id]`

### Purpose

Authorize and track a planned quantity of finished goods to be produced at a specific warehouse using a specific BOM version.

### Creating a work order

Required inputs:

- **Finished good** — product to manufacture
- **Production warehouse** — where components are picked and FG is received
- **Planned quantity** — target output (good + rejected units count toward completion)
- **BOM** — active BOM for the FG (auto-resolved if not specified)
- **Planned start / end dates** — optional schedule
- **Priority** — LOW, NORMAL, HIGH, URGENT
- **Reference** — optional link to external document type/id
- **Remarks** — free text

Work orders are created in **DRAFT** status and receive an auto-generated order number (e.g. PRO000xxx).

### Work order lifecycle

| Status | Meaning | Typical next step |
|--------|---------|-------------------|
| **DRAFT** | Created, not yet released | Edit, approve, or cancel |
| **APPROVED** | BOM snapshot frozen; ready for bookings | Create bookings, print picklist |
| **IN_PROGRESS** | At least one booking posted | Continue bookings until planned qty reached |
| **COMPLETED** | Produced + rejected qty meets planned qty | Archive / reference only |
| **SHORT_CLOSED** | Closed early with partial output | Retain posted bookings; no further bookings |
| **CANCELLED** | Voided before production started | Only if no posted bookings exist |

### Approval

**Approve** captures the BOM component snapshot on the work order:

- Each component line stores required quantity scaled to planned qty
- Issued quantities start at zero and accumulate as bookings are posted
- After approval, the work order cannot be edited — only cancelled (if no posted bookings) or short-closed

### Actions by status

| Action | DRAFT | APPROVED / IN_PROGRESS | COMPLETED / SHORT_CLOSED / CANCELLED |
|--------|-------|------------------------|--------------------------------------|
| Edit | Yes | No | No |
| Approve | Yes | No | No |
| Production/Assembly Booking | No | Yes | No |
| Cancel | Yes | Yes (no posted bookings) | No |
| Short close | No | Yes | No |
| Delete | Yes (no bookings) | No | No |

### Work order detail

The detail page (`/production-orders/[id]`) provides:

**Header strip** — order number, status, priority, warehouse, FG, BOM version, schedule, reference

**KPI cards** — planned, produced, rejected, pending, completion %, posted production value

**Tabs:**

| Tab | Content |
|-----|---------|
| Overview | Summary, shortage flag, booking counts, approval metadata |
| Components | Required vs issued vs outstanding per component line |
| Bookings | All bookings linked to this work order with status and costs |
| Cost | Standard BOM cost vs posted material/operation/production value |
| Audit | Status and action history |

### Shortage planning

Before booking, review component availability:

- **Required** — total from BOM snapshot
- **Issued** — cumulative from posted bookings
- **Outstanding** — required minus issued
- **On hand** — stock at production warehouse
- **Shortage** — outstanding minus on hand (when negative availability)

Shortage is informational at planning time; posting re-validates stock under row lock.

### Documents and exports

From the work order detail page:

| Output | Format | Purpose |
|--------|--------|---------|
| **Print Work Order** | PDF | Branded summary for office/shop floor: header, KPIs, components, operations, bookings, costs |
| **Print Picklist** | PDF | Warehouse picking sheet: component lines with required, issued, outstanding, on-hand, shortage |
| **Export Report** | Excel | Multi-sheet workbook: order summary, component snapshot, bookings register, component issues, cost summary |

Both PDFs use company profile branding (logo, address) consistent with other platform documents.

### Work order list

**Route:** `/production-orders`

Features quick search, status summary chips, advanced filter panel (warehouse, FG, dates, priority, open-only), column sorting, and row actions: view, edit (DRAFT), approve, book assembly, short close, cancel.

---

## Production/Assembly Booking

**Route:** `/production-bookings/new`

### Purpose

Record one production run against an approved or in-progress work order: issue components from stock, receive finished goods (and optionally rejected units), update inventory ledger and costs.

### Booking flow

1. **Select work order** — only APPROVED or IN_PROGRESS orders with remaining quantity
2. **Enter booking date** and output quantities:
   - **Good quantity** — acceptable FG units produced
   - **Rejected quantity** — defective FG units (optional)
   - Good + rejected must be at least 1; cannot exceed remaining planned quantity
3. **Backflush preview** loads automatically when output qty changes
4. **Review component lines** — standard qty, on-hand, consumed, scrap, variance, rate, amount
5. **Capture serials** where required (components and/or FG)
6. **Confirm & Post Booking** — atomic stock and ledger update

### Backflush and component lines

The backflush engine calculates, per component:

- **Standard quantity** — BOM proportion for the booking output qty
- **Suggested consumed quantity** — quantity to issue into production (displayed as **Consumed**)
- **On-hand quantity** — available at production warehouse

**Consumed quantity is system-calculated and read-only.** Users cannot override it — this enforces consistent backflush logic and prevents manual drift from BOM standards.

**Scrap quantity** remains editable. When scrap > 0, a **scrap reason** is required.

**Variance** = (consumed + scrap) − standard. Positive variance indicates over-consumption.

Optional components can have zero consumed qty; mandatory components must have consumed > 0 when the line is required.

### Serialized products

| Tracking | Rule |
|----------|------|
| Serialized component | Enter exactly (consumed + scrap) serial numbers before posting |
| Serialized finished good | Exactly **one** good + rejected unit per booking (total output = 1); enter FG serial(s) |
| Lot / non-serial | Quantity only |

Serial validation checks availability at the production warehouse before post.

### Rejection handling

When **rejected quantity > 0**:

- **Rejection warehouse** is required (per booking or from tenant config `production.rejection_warehouse_id`)
- **Rejection reason** is required
- Rejected FG is received into the rejection warehouse via `PRODUCTION_REJECT_IN` ledger entry

### Posting effects

On successful post:

| Area | Effect |
|------|--------|
| Component stock | Decreased by consumed + scrap qty |
| FG stock | Increased by good qty at production warehouse |
| Rejected FG | Increased at rejection warehouse |
| Component serials | Marked ISSUED against the booking |
| FG serials | Created AVAILABLE at computed unit cost |
| Work order rollups | Produced/rejected qty updated; status → IN_PROGRESS or COMPLETED |
| Costs | Material cost, operation cost, total cost, FG unit WAC recorded on booking |

### Booking restrictions

- Posted bookings **cannot be edited or deleted**
- To reverse a posted booking, use **Cancel** from Booking History (restores stock and ledger)
- Draft bookings can be abandoned without stock impact

---

## Booking History

**Route:** `/production-bookings`

### Purpose

Searchable register of all production/assembly bookings across work orders.

### Features

- **Quick search** — booking number, work order number, FG product name
- **Status summary** — counts for DRAFT, POSTED, CANCELLED
- **Advanced filters** — date range, warehouse, work order, status, FG product
- **Detail view** — booking header, component issue lines with serials, cost breakdown
- **Cancel posted booking** — with reason; reverses inventory and ledger (permission required)

Filter and search patterns align with Work Orders and Booking History quick-search UX used elsewhere in the platform.

---

## Production/Assembly Dashboard

**Route:** `/production-dashboard`

### Purpose

ERP-style operational view: KPIs, pipeline, alerts, analytics, and drill-down worklists for production management.

### Layout

**Top bar**

- Title and refresh / **Export All** (multi-sheet Excel)
- Status quick tabs (All, Draft, Approved, In Progress, etc.)
- Date presets (Today, This week, This month, etc.) and Reset
- Advanced filter panel (warehouse, FG, priority, open-only, custom date range)

**KPI cards** — open work orders, bookings in period, rejection rate, posted production value, shortage count, overdue orders

**Pipeline board** — work orders grouped by status with counts and quick navigation

**Alert panel** — shortage alerts, overdue planned dates, high rejection rates

**Analytics charts** — production trend, rejection trend, top FG by volume/value, component variance

**Worklists** — filterable work orders and bookings tables with links to detail

**Serial genealogy** — trace a finished-good serial back through its production booking and consumed component serials

### Dashboard export

**Export All** produces an Excel workbook with multiple sheets: KPIs, pipeline, trend, analytics panels, work order list, and booking list — filtered by current dashboard criteria.

---

## Inventory and Cost Impact

Production bookings write to the **Inventory Ledger** with dedicated transaction types:

| Ledger type | Direction | Meaning |
|-------------|-----------|---------|
| `PRODUCTION_ISSUE_OUT` | OUT | Component consumed into production |
| `PRODUCTION_SCRAP_OUT` | OUT | Component scrap beyond standard |
| `PRODUCTION_RECEIPT_IN` | IN | Good finished good received |
| `PRODUCTION_REJECT_IN` | IN | Rejected finished good to rejection warehouse |
| `PRODUCTION_CANCEL_IN` | IN | Components returned on booking cancel |
| `PRODUCTION_CANCEL_OUT` | OUT | FG/rejected qty removed on booking cancel |

Cost conservation at post: total material cost + operation cost = finished-good production value (allocated to FG unit WAC).

Work order detail **Cost** tab compares standard BOM cost against cumulative posted costs from all POSTED bookings.

---

## Key Controls

| Control | Purpose |
|---------|---------|
| BOM must be ACTIVE | Prevents undefined recipes on work orders |
| Work order approval gate | Freezes BOM snapshot before any stock movement |
| Backflush-only consumed qty | Prevents manual override of standard issue quantities |
| Stock check at post | Blocks booking when on-hand insufficient (row lock) |
| Serial validation | Ensures traceability for serialized components and FG |
| No edit after post | Maintains ledger integrity; cancel to reverse |
| Cancel requires no dependent state | Posted booking cancel reverses atomically |
| Short close vs cancel | Short close retains posted history; cancel only when no posts |
| Rejection warehouse mandatory | Ensures rejected FG has a defined destination |

---

## Permissions

Module permissions follow standard CRUD flags per child module:

| Module key | Typical planner | Typical warehouse | Typical management |
|------------|-----------------|-------------------|-------------------|
| `production_dashboard` | Read | Read | Read |
| `production_bom` | Create, update | Read | Read |
| `production_orders` | Create, update, approve | Read | Read |
| `production_bookings` | Create (post) | Create (post) | Read |
| `production_bookings_history` | Read, cancel | Read | Read |

Assign via **Settings → Roles → Module permissions**. Listing criteria (`all` vs team-scoped) applies where configured.

---

## Configuration

| Setting | Purpose |
|---------|---------|
| `production.rejection_warehouse_id` | Default rejection warehouse when booking rejects units |
| `production.overproduction_tolerance` | Optional tolerance for posting above remaining planned qty |
| Serial master codes | PRODBOM, PRODORDER, PRODBOOKING for document numbering |

Configure rejection warehouse in tenant config before production bookings with rejects are posted.

---

## Related Chapters

- [Procurement & Inventory](11-procurement-inventory.md) — component stock inward and warehouse setup
- [Document Outputs](17-document-outputs.md) — Work Order PDF and Picklist PDF
- [Reports & Audit](15-reports-audit.md) — inventory ledger and serialized inventory reports
- [Workflow: BOM to Finished Good](../workflows/bom-to-finished-good.md) — end-to-end process

---

**Previous:** [Document Outputs](17-document-outputs.md)
