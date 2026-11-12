# Modules

AuthAndSession -> `src/app/auth`, `src/middleware.js`, `src/context/AuthContext*`, `src/hooks/useAuth*`

DashboardAndHome -> `src/app/home`, `src/app/erp-dashboard`

CRMAndPreSales -> `src/app/inquiry`, `src/app/followup`, `src/app/marketing-leads`, `src/app/marketing-lead-followup`, `src/app/site-visit`, `src/app/site-survey`

SalesLifecycle -> `src/app/quotation`, `src/app/order`, `src/app/confirm-orders`, `src/app/closed-orders`, `src/app/cancelled-orders`, `src/app/delivery-challans`, `src/app/delivery-execution`

ProcurementAndInventory -> `src/app/supplier`, `src/app/purchase-orders`, `src/app/po-inwards`, `src/app/purchase-returns`, `src/app/stocks`, `src/app/stocks-qty`, `src/app/inventory-ledger`, `src/app/stock-transfers`, `src/app/stock-adjustments`, `src/app/serial-master`

MastersAndConfiguration -> `src/app/module-master`, `src/app/role-master`, `src/app/role-module`, `src/app/user-master`, `src/app/masters`, `src/app/meta-setup`, `src/app/project-price`, `src/app/product`, `src/app/bill-of-material`, `src/app/company-profile`

B2B -> `src/app/b2b-clients`, `src/app/b2b-sales-quotes`, `src/app/b2b-sales-orders`, `src/app/b2b-shipments`, `src/app/b2b-invoices`

ReportsAndAudit -> `src/app/reports`, `src/app/payment-outstanding`, `src/app/payment-audit`, `src/app/document-audit`

PlatformAndAdmin -> `src/app/admin`, `src/components/layout`, `src/components/notifications`, `src/context/NotificationContext*`

HRMS (gated) -> `src/app/hrms` (employees, departments, designations, holidays, leave-types, attendance, attendance-requests, leaves, reports/*). Hidden when HRMS gate off. Rebuild must follow `docs/hrms/replan/01-UI-UX-CONFORMANCE.md` (common UI kit, AlertDialog, `@/utils/toast`, no raw `<select>`/`window.confirm`). UX standard: `docs/hrms/replan/04-UX-ENHANCEMENT-STANDARD.md` — list pages lead with `StatCard` KPIs, statuses use shared `StatusBadge`, empty tables use `EmptyState` via `PaginatedTable emptyState`, loading uses `TableSkeleton`, filters use `ListingPageContainer showFilterLabels`, permissions use `useModulePermission(key)`. Big forms use `<FormSection variant="card" step icon description collapsible>` + `<FormSectionNav>` + `FormGrid cols={4}` and a sticky footer summary (see `hrms/employees/components/EmployeeForm.js` and `hrms/employees/[id]/annexure/page.js`).
