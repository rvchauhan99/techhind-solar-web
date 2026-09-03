# Production / Assembly Module — Introduction

## What It Is

The **Production / Assembly** module lets your team plan and execute in-house assembly or kitting of **finished goods** from component materials at a production warehouse — with full inventory, cost, and audit control inside TechHind Solar CRM.

Use it when you:

- Assemble kits (inverters, junction boxes, combiner units) from stocked parts
- Convert lot-tracked materials into serialized finished goods
- Need visibility into consumption, scrap, rejection, and production value

## Five Screens

| Screen | Route | What you do |
|--------|-------|-------------|
| Production/Assembly Dashboard | `/production-dashboard` | KPIs, pipeline, alerts, analytics, Excel export |
| BOM Master | `/production-bom` | Define recipes: components + operations + standard cost |
| Work Orders | `/production-orders` | Plan production runs; approve; print PDFs |
| Production/Assembly Booking | `/production-bookings/new` | Issue components and receive finished goods |
| Booking History | `/production-bookings` | Search and review all bookings; cancel if needed |

## Key Functions at a Glance

| Step | Function | Outcome |
|------|----------|---------|
| 1 | **Plan BOM** | ACTIVE recipe with component qty and operation costs |
| 2 | **Create & approve Work Order** | Frozen BOM snapshot; planned qty authorized |
| 3 | **Print picklist** | Warehouse picking sheet with shortage highlights |
| 4 | **Post booking** | Components issued; FG received; ledger updated |
| 5 | **Track on dashboard** | KPIs, pipeline, variance, serial genealogy |

## Quick Start Checklist

1. **Prerequisites** — FG and component products in Product Master; production warehouse with stock; rejection warehouse configured if rejects expected
2. **Create BOM** — DRAFT → add components and operations → activate as default
3. **Create Work Order** — select FG, warehouse, planned qty → **Approve**
4. **Print picklist** — from work order detail; pick components from warehouse
5. **Post first booking** — enter good/rejected qty → review backflush lines → confirm & post

## Documents Produced

| Document | Format | When to use |
|----------|--------|-------------|
| Work Order PDF | PDF | Office/shop-floor summary of order status, components, costs |
| Work Order Picklist PDF | PDF | Before booking — warehouse picking with shortage flags |
| Work Order export | Excel | Multi-sheet report for finance/audit |
| Dashboard export | Excel | KPIs, pipeline, analytics for management review |

All PDFs use your company profile branding (logo, address).

## Who Does What

| Role | Focus |
|------|-------|
| **Production planner** | BOM versions, work orders, approval, schedule |
| **Warehouse / stores** | Picklist, component issue, serial capture |
| **Shop-floor operator** | Production/assembly booking — good/rejected output |
| **Finance / management** | Dashboard KPIs, cost tabs, Excel exports |

## Terminology Note

The UI uses **Work Order** (not "Production Order") for planned production runs. Internal APIs and database references may use `production_order` — the meaning is the same.

---

**Next chapters in this guide:** full module reference, end-to-end workflow, and document output details.
