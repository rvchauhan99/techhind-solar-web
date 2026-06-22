# Workflow: Lead to Installation

## Overview

This workflow describes the complete B2C customer journey in TechHind Solar CRM — from the first marketing touchpoint through installed and commissioned solar project.

## Process Flow

```
Marketing Lead → Inquiry → Follow-up → Site Visit → Quotation
    → Manager Approval → Pending Order → Confirmed Order
    → Fabrication → Installation → Manager Sign-off
    → Delivery Challan → Payment Collection → Order Closed
```

## Stage Details

### Stage 1: Lead Capture
- **Module:** Marketing Leads & Meta Integration
- **Actions:** Lead arrives via Meta campaign, CSV, or manual entry
- **Output:** Qualified lead record with source and campaign attribution

### Stage 2: Inquiry Qualification
- **Module:** Inquiry Management
- **Actions:** Convert lead to inquiry; record customer details, capacity, location, DISCOM
- **Output:** Active inquiry in sales pipeline

### Stage 3: Follow-up & Site Assessment
- **Modules:** Follow-up, Site Visit
- **Actions:** Schedule calls; conduct on-site survey; attach documents
- **Output:** Technically qualified opportunity

### Stage 4: Commercial Proposal
- **Module:** Quotations
- **Actions:** Create quotation from inquiry; apply pricing; submit for approval
- **Output:** Approved quotation PDF shared with customer

### Stage 5: Order Confirmation
- **Module:** Order Lifecycle
- **Actions:** Convert quotation to pending order; collect documents; confirm order
- **Output:** Confirmed order with stock reservation and payment schedule

### Stage 6: Field Execution
- **Modules:** Fabrication & Installation, Delivery
- **Actions:** Fabricate; install with serial capture; manager approval; dispatch challan
- **Output:** Installed system with serial registry and delivery proof

### Stage 7: Financial Closure
- **Modules:** Payments & Outstanding, Commission
- **Actions:** Record payments; clear outstanding; commission accrual and settlement
- **Output:** Closed order with full financial reconciliation

### Stage 8: After-Sales (ongoing)
- **Module:** Service & Warranty
- **Actions:** Service tickets and warranty claims as needed
- **Output:** Customer support with warranty traceability

## Key Decision Points

| Decision | Module | Typical approver |
|----------|--------|------------------|
| Quotation approval | Quotations | Sales manager |
| Order confirmation | Orders | Operations / sales |
| Installation sign-off | Installation | Installation manager |
| Commission settlement | Commission | Finance manager |

## Roles Involved

Sales Executive → Site Surveyor → Sales Manager → Project Coordinator → Fabrication Team → Installation Engineer → Installation Manager → Warehouse → Accounts Receivable → Service Team

## Related Chapters

- [Marketing Leads & Meta](../modules/05-marketing-leads-meta.md)
- [Inquiry Management](../modules/06-inquiry-management.md)
- [Quotations](../modules/07-quotations.md)
- [Order Lifecycle](../modules/08-order-lifecycle.md)
- [Fabrication, Installation & Delivery](../modules/09-fabrication-installation-delivery.md)
- [Payments & Outstanding](../modules/10-payments-outstanding.md)
