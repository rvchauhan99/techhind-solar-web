# Entry Points

## App Bootstrap
- Root layout and providers: `src/app/layout.js`
- Root route bootstrap: `src/app/page.js`
- Request middleware: `src/middleware.js`

## Primary Route Domains
- Auth -> `src/app/auth/*`
- Home and dashboard -> `src/app/home`, `src/app/erp-dashboard`
- CRM and pre-sales -> `src/app/inquiry`, `src/app/followup`, `src/app/marketing-leads`, `src/app/site-visit`, `src/app/site-survey`
- Sales lifecycle -> `src/app/quotation`, `src/app/order`, `src/app/confirm-orders`, `src/app/closed-orders`, `src/app/cancelled-orders`, `src/app/delivery-challans`, `src/app/delivery-execution`
- Procurement and inventory -> `src/app/supplier`, `src/app/purchase-orders`, `src/app/po-inwards`, `src/app/purchase-returns`, `src/app/stocks`, `src/app/inventory-ledger`, `src/app/stock-transfers`, `src/app/stock-adjustments`
- Masters and setup -> `src/app/module-master`, `src/app/role-master`, `src/app/role-module`, `src/app/user-master`, `src/app/masters`, `src/app/meta-setup`
- B2B -> `src/app/b2b-clients`, `src/app/b2b-sales-quotes`, `src/app/b2b-sales-orders`, `src/app/b2b-shipments`, `src/app/b2b-invoices`
- Reports and audit -> `src/app/reports`, `src/app/payment-outstanding`, `src/app/payment-audit`, `src/app/document-audit`
- Admin -> `src/app/admin`

## Notes
- Use this file as the first navigation map before opening deeper module files.
