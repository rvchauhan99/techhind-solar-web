# Workflow: B2B Order to Invoice

## Overview

This workflow describes the B2B distribution sales cycle — from dealer/client engagement through invoicing and payment collection.

## Process Flow

```
B2B Client Setup → Sales Quote → Quote Approval → Sales Order
    → Order Confirmation → Stock Reservation → Shipment
    → Invoice Generation → Payment Recording → Outstanding Clearance
    → (Optional) Shipment Return
```

## Stage Details

### Stage 1: Client Onboarding
- **Module:** B2B Clients
- **Actions:** Register client with billing and ship-to addresses
- **Output:** Client master ready for transactions

### Stage 2: Quotation
- **Module:** B2B Sales Quotes
- **Actions:** Create quote with products, quantities, rates, and GST
- **Output:** Quote PDF shared with dealer

### Stage 3: Sales Order
- **Module:** B2B Sales Orders
- **Actions:** Convert approved quote to sales order; confirm order
- **Output:** Confirmed SO with stock reservation

### Stage 4: Dispatch
- **Module:** B2B Shipments
- **Actions:** Pick, pack, and dispatch against SO; capture serial numbers
- **Output:** Shipment record with stock deduction

### Stage 5: Invoicing
- **Module:** B2B Invoices
- **Actions:** Generate invoice from shipment; produce PDF
- **Output:** Tax invoice for dealer accounts

### Stage 6: Collections
- **Modules:** B2B Payment Outstanding, B2B Payments Report
- **Actions:** Record payments; track outstanding; analyze collections
- **Output:** Reconciled receivables

### Stage 7: Returns (if applicable)
- **Module:** B2B Shipment Returns
- **Actions:** Process return; credit stock and adjust invoice
- **Output:** Return documented with inventory correction

## GST & Compliance

B2B transactions support GST line-item calculation per product HSN and client tax profile. Invoice PDFs include required tax breakdowns for dealer accounting.

## Key Metrics

| Metric | Report / Screen |
|--------|-----------------|
| Open orders | B2B Sales Orders |
| Shipment status | B2B Shipments |
| Outstanding | B2B Payment Outstanding |
| Line-level revenue | B2B Sales Order Lines Report |
| Collections | B2B Payments Report |

## Related Chapters

- [B2B Trading](../modules/12-b2b-trading.md)
- [Procurement & Inventory](../modules/11-procurement-inventory.md)
- [Payments & Outstanding](../modules/10-payments-outstanding.md)
- [Reports & Audit](../modules/15-reports-audit.md)
