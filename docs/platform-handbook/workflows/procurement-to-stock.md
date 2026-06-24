# Workflow: Procurement to Stock

## Overview

This workflow covers the supply chain path from vendor engagement through available stock in the warehouse — the foundation for order fulfillment and B2B shipments.

## Process Flow

```
Supplier Setup → Purchase Order → PO Approval → Goods Receipt (PO Inward)
    → Serial Registration → Stock Update → Inventory Ledger Entry
    → (Optional) Stock Transfer → (Optional) Stock Adjustment
    → Stock Available for Order Reservation / B2B Shipment
```

## Stage Details

### Stage 1: Supplier & Catalog Setup
- **Modules:** Supplier, Product, Bill of Materials, Project Price
- **Actions:** Register vendors; maintain product catalog and BOM definitions
- **Output:** Master data ready for procurement

### Stage 2: Purchase Order Creation
- **Module:** Purchase Orders
- **Actions:** Create PO with line items, quantities, rates, and delivery terms
- **Output:** PO submitted for approval

### Stage 3: Goods Receipt
- **Module:** PO Inward
- **Actions:** Receive goods against PO; capture quantities and serial numbers
- **Output:** Stock increased; ledger entry created

### Stage 4: Stock Management
- **Modules:** Stocks, Inventory Ledger
- **Actions:** Monitor levels; review movement history
- **Output:** Real-time stock visibility by warehouse

### Stage 5: Internal Movements (as needed)
- **Modules:** Stock Transfers, Stock Adjustments
- **Actions:** Move stock between warehouses; correct physical count variances
- **Output:** Accurate warehouse-level stock

### Stage 6: Returns (if applicable)
- **Module:** Purchase Returns
- **Actions:** Return goods to supplier; credit stock
- **Output:** Stock and ledger adjusted

### Stage 7: Fulfillment Link
- **Modules:** Order Lifecycle, B2B Trading
- **Actions:** Reserved stock allocated to confirmed orders or B2B shipments
- **Output:** Stock committed to customer demand

## Inventory Traceability

Serialized products (panels, inverters) are tracked from **PO Inward** through **Installation** or **B2B Shipment** using the Serial Master configuration and Serialized Inventory Report.

## Key Controls

| Control | Purpose |
|---------|---------|
| PO approval | Prevent unauthorized purchases |
| Serial capture at inward | Enable end-to-end traceability |
| Inventory ledger | Immutable audit of all movements |
| Stock reservation | Prevent overselling |

## Related Chapters

- [Procurement & Inventory](../modules/11-procurement-inventory.md)
- [Order Lifecycle](../modules/08-order-lifecycle.md)
- [B2B Trading](../modules/12-b2b-trading.md)
