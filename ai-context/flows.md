# Flows

## Auth Entry Flow
1. User opens app root (`/`).
2. Middleware redirects to `/auth/login`.
3. Root page logic checks user/token state.
4. Authenticated user is routed to `/home`; unauthenticated user stays in auth flow.

## Inquiry To Quotation Flow
1. User creates or updates inquiry and lead details.
2. Follow-up and qualification details are managed.
3. User opens quotation module and creates quotation from inquiry context.
4. Quotation moves through edit/review/approval states.

## Order Execution Flow
1. Approved quotation moves into order module.
2. Order is confirmed and tracked through confirm/closed/cancelled states.
3. Delivery challan/execution pages manage delivery progress and docs.
4. Related payment and outstanding views surface collection status.

## Procurement And Inventory Flow
1. User manages suppliers and purchase orders.
2. PO inward and purchase return screens update incoming/return stock.
3. Stocks, ledger, transfers, and adjustments maintain inventory movement visibility.

## Reporting And Notification Flow
1. User navigates report routes for delivery, payments, and inventory visibility.
2. Notification context and floating widget provide cross-module event updates.
3. Audit-oriented pages expose payment/document tracking details.
