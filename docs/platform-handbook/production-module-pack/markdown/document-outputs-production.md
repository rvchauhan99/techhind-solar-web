# Production Document Outputs

## Work Order PDF

Branded production summary for an approved work order: finished good, planned/produced quantities, component snapshot, BOM operations, booking register, and posted cost roll-up. Generated from the work order detail page (**Print Work Order**) for office and shop-floor reference.

Includes:

- Company header with logo and address
- Work order number, status, priority, warehouse, FG, BOM version
- KPI strip: planned, produced, rejected, pending, completion %, posted value
- Component table: required, issued, outstanding, on-hand, shortage
- BOM operations and bookings register (when present)
- Standard vs posted cost comparison

## Work Order Picklist PDF

Warehouse picking sheet listing all components on a work order with required, issued, outstanding, on-hand, and shortage quantities. Highlights lines with stock shortage. Generated from work order detail (**Print Picklist**) and used before posting a production/assembly booking.

Includes:

- Work order number, finished good, warehouse, planned quantity
- Component lines with SERIAL and optional badges
- Shortage banner when any line lacks stock
- Work order remarks (if set)

## Why These Documents Matter

| Document | Business use |
|----------|--------------|
| Work Order PDF | Production planning and shop-floor reference |
| Work Order Picklist | Component picking and shortage visibility before issue |

Both documents use your **company profile** settings — logo, address, and contact details configured once in administration.
