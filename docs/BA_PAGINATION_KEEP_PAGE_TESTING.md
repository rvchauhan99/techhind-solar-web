# BA Functional Testing Document — List page stays after refresh and after a form

| Field | Value |
| --- | --- |
| Document type | Functional BA test (business only) |
| Product | TechHind Solar CRM (web) |
| Audience | Business Analysts, business testers |
| Version | 1.0 |
| Last updated | 2026-09-30 |
| Environment used for the recorded run | Local web `http://localhost:3000`, login `superadmin@user.com` |

This document is functional only. It tells the tester which menus to open, what to do, and what the screen must show. It does not describe how the product is built.

---

## 1. Purpose

When a user is on page 2 (or any later page) of a list, that page must stay put after:

- a browser refresh
- opening a record and pressing Cancel, Save, or the list name at the top of the form
- the browser Back button

Search and filters are supposed to go back to **page 1**. Changing **rows per page** also goes back to **page 1**, and a refresh after that must keep the new row count.

---

## 2. Scope

### 2.1 In scope

- Every listing menu named in sections 6 and 7
- Page number, rows per page, and an active search or filter
- Add, Edit, View, Approve, New, and Return, where that menu has those buttons

### 2.2 Out of scope

- Kanban / board views (Marketing Leads board, B2B Leads board, Inquiry board)
- Tables inside a record’s detail tabs
- Mobile app
- Finance app
- Reports or audit screens that are not listed in section 7

---

## 3. Before you start

1. Sign in with a user who can open the menu. If Add or Edit is hidden, mark that step **Blocked — no permission**.
2. The list must have **more rows than one page** (often 10, 20, or 25). If the pager says **Page 1 of 1**, mark page-2 steps **Blocked — not enough rows**. Do not mark them Fail.
3. Note one row you can recognise on the page you leave, so you can see that you came back to the same rows.
4. Pass only when **both** of these are true:
   - the pager still shows the page you left
   - the address bar still contains `page=` when you are on page 2 or later
5. Page 1 may omit `page=` from the address. That is correct only when you are actually on page 1.

### Result words

| Result | Meaning |
| --- | --- |
| Pass | The screen matches the expected result |
| Fail | The page jumped, or the address lost the page you left |
| Blocked | You could not run the step (not enough rows, no permission, or the list is not on screen yet) |
| N/A | That step does not apply to this menu |

---

## 4. Standard steps

Run these steps on every menu. Section 6 menus use all of them. Section 7 menus use PG-01, PG-02, PG-06, and PG-07 only.

| ID | Do this | Expected result |
| --- | --- | --- |
| PG-01 | Open the list. Go to page 2 or later with **Next**. Note the page number and one row. | Pager shows page 2 (or later). Address contains `page=2` (or that later number). |
| PG-02 | Refresh the browser. | Same page number and the same rows. |
| PG-03 | From that page, open the form named for the menu (Add, Edit, View, Approve, New, or Return). Press **Cancel**, or the list name at the top of the form. | You land on the same list page you left, with the same filters. |
| PG-04 | Open the same form again. **Save / Submit** without changing money fields. On an Add form, do not create a junk record: close it if Save would create a new one, and record that note. | You land on the same list page. If Save stays on the form because of a validation message, mark **Blocked — form validation**, not Fail, as long as you never left the form. |
| PG-05 | Open the form again. Use the browser **Back** button. | Same list page. |
| PG-06 | From page 2, type a search or change one filter. | List goes to **page 1**. This is correct. |
| PG-07 | Change rows per page, then refresh. | You are on page 1 after the change. After refresh, the new row count is still selected. |

**Dialog menus** (Users, Roles, Modules): after PG-01, open Add or Edit, then Cancel or close the dialog. The list page must not jump.

---

## 5. How to record each menu

For every menu write:

- Menu name
- Cases run (PG-01 …)
- Result: Pass / Fail / Blocked
- Note if Blocked (not enough rows, or no permission)
- If Fail: the page you left, the page you landed on, and which button you used (Cancel, Save, list name, or Back)

A blank menu is not a pass. The pack is complete only when every menu in sections 6 and 7 has a result.

---

## 6. Menus that must return from a form to the same page

Run **PG-01 through PG-07**. Open the form named in the Action column from page 2.

### 6.1 Orders and inquiry

| Menu | Path | Action from page 2 |
| --- | --- | --- |
| Pending Orders | `/order` | Edit, and also View |
| Confirm Orders | `/confirm-orders` | Edit. You must come back to **Confirm Orders**, not to Pending Orders page 1 |
| Inquiry | `/inquiry` | Switch to **List** (not the board). Then Edit. Also use the row action that creates an order: you must come back to the Inquiry list page you left |
| Quotation | `/quotation` | Add and Edit |

### 6.2 Procurement and warehouse

| Menu | Path | Action from page 2 |
| --- | --- | --- |
| Purchase Orders | `/purchase-orders` | Add and Edit |
| PO Inwards | `/po-inwards` | Add, Edit, and Approve |
| Purchase Returns | `/purchase-returns` | Add and Edit |
| Delivery Challans | `/delivery-challans` | New challan, and Return on an existing challan |
| Stock Transfers | `/stock-transfers` | Add and Edit |
| Stock Adjustments | `/stock-adjustments` | New and Edit |

### 6.3 B2B

| Menu | Path | Action from page 2 |
| --- | --- | --- |
| B2B Sales Orders | `/b2b-sales-orders` | Add and Edit |
| B2B Sales Quotes | `/b2b-sales-quotes` | Add and Edit. If a quote action opens the related sales order, you must come back to the **quotes** list page |
| B2B Shipments | `/b2b-shipments` | Add. A row action that starts a shipment return must come back to the shipments page you left |
| B2B Shipment Returns | `/b2b-shipment-returns` | Add and Edit |
| B2B Leads | `/b2b-leads` | Switch to **List** view (not the board), then Edit |

### 6.4 Production

| Menu | Path | Action from page 2 |
| --- | --- | --- |
| Production BOM | `/production-bom` | New and Edit |
| Production Orders | `/production-orders` | New and Edit. A row action that starts a booking must come back to the production-orders page you left |
| Production Bookings | `/production-bookings` | New |

### 6.5 Settings

| Menu | Path | Action from page 2 |
| --- | --- | --- |
| Roles Modules | `/role-module` | Add. Edit is a separate check in section 8 |

---

## 7. Menus that must keep the page on the list

Run **PG-01, PG-02, PG-06, and PG-07**. These lists remember the page. They do not all open a separate form. If Add/Edit is a popup on the same page, close or save it and confirm the page did not jump to 1. A missing separate form is not a failure.

### 7.1 Orders and CRM

| Menu | Path | Note |
| --- | --- | --- |
| Closed Orders | `/closed-orders` | |
| Cancelled Orders | `/cancelled-orders` | |
| Site Visit | `/site-visit` | |
| Followup | `/followup` | |
| Marketing Leads | `/marketing-leads` | **List** view only. Board is out of scope |
| Marketing Lead Follow-up | `/marketing-lead-followup` | |
| B2B Lead Follow-up | `/b2b-lead-followup` | |

### 7.2 Masters and products

| Menu | Path | Note |
| --- | --- | --- |
| Users Master | `/user-master` | Add/Edit is a panel on the list. After save or close, the page stays |
| Roles | `/role-master` | Add/Edit is a dialog. After save or close, the page stays |
| Modules | `/module-master` | Add/Edit is a dialog. After save or close, the page stays |
| Masters | `/masters` | Choose a master first. The pager appears on that master’s list |
| Product | `/product` | |
| Supplier | `/supplier` | |
| Bill of Materials | `/bill-of-material` | |
| Project Price List | `/project-price` | |
| Serial Master | `/serial-master` | |

### 7.3 Stock and procurement extras

| Menu | Path |
| --- | --- |
| Stocks | `/stocks` |
| Inventory Ledger | `/inventory-ledger` |
| Purchase Order lines | `/purchase-orders/lines` |

### 7.4 B2B lists

| Menu | Path |
| --- | --- |
| B2B Clients | `/b2b-clients` |
| B2B Invoices | `/b2b-invoices` |
| B2B Sales Planning | `/b2b-sales-planning` |

### 7.5 Service

| Menu | Path | Note |
| --- | --- | --- |
| Service Tickets | `/service/tickets` | |
| Warranty Claims | `/service/warranty-claims` | |
| Service Search | `/service/search` | Type at least 2 characters so the list appears, then run the page steps |

### 7.6 Commission and payments

| Menu | Path |
| --- | --- |
| Unsettled | `/commission-settlements/unsettled` |
| Pending commission | `/commission-settlements/pending` |
| Payout | `/commission-settlements/payout` |
| Payout approval | `/commission-settlements/payout-approval` |
| Commission report | `/commission-settlements/report` |
| Settlement history | `/commission-settlements/history` |
| Ledger report | `/commission-settlements/ledger-report` |
| User order commission rates | `/user-order-commission-rates` |
| Payment outstanding | `/payment-outstanding` |

Ledger report: run the report so the list is on screen, then run the page steps.

### 7.7 Other

| Menu | Path |
| --- | --- |
| Agent logs | `/agent-logs` |
| Location tracking logs | `/location-tracking/logs` |
| Quotation manager approval | `/quotation/manager-approval` |
| Installation manager approval | `/installation/manager-approval` |

---

## 8. Extra checks (log a defect if the page resets)

These three are part of the same work. Refresh must keep the page. Opening the form below may still drop you on page 1. If it does, log a defect. Do not treat that as a pass.

| Check | How |
| --- | --- |
| Inquiry → **New Inquiry** | From Inquiry **List**, page 2, press **New Inquiry**. Cancel or use the list name. You should return to Inquiry page 2 |
| Marketing Leads → **Edit** | From **List** view, page 2, Edit a lead (from the list or from the lead view). Return should be the same list page |
| Roles Modules → **Edit** | From page 2, use the row **Edit** link (not Add). Return should be Roles Modules page 2. Add is already in section 6 and must keep the page |

---

## 9. Recorded local run — 30 September 2026

Run on local web, superadmin, lists opened with 10 rows per page, then **Next** to page 2.

This run is evidence for the BA. It is not a substitute for the BA’s own sign-off where a step is Blocked or Fail. Re-test every Fail. Where the note is “not enough rows”, add data or lower the page size until page 2 exists, then run the blocked steps.

### 9.1 Form-return menus

| Menu | PG-01 | PG-02 | PG-03 | PG-04 | PG-05 | PG-06 | PG-07 | Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pending Orders | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked | Pass | Not enough rows for page 2 |
| Confirm Orders | Pass | Pass | Pass | Blocked | Pass | Pass | Fail | Edit Cancel and Back kept Confirm Orders page 2. No separate Save button. Rows-per-page did not update the address |
| Inquiry | Pass | Pass | Fail | Fail | Pass | Fail | Pass | List view. Back kept page 2. Edit and Create Order had no Cancel. Save stayed on the edit screen. Search showed page 1 while the address still had `page=2` |
| Quotation | Pass | Pass | Pass | Pass | Pass | Blocked | Pass | No search box found on the list |
| Purchase Orders | Pass | Pass | Pass | Pass | Pass | Blocked | Pass | No search box found on the list |
| PO Inwards | Pass | Pass | Pass | Pass | Pass | Blocked | Pass | Add, Edit, and Approve. No search box found on the list |
| Purchase Returns | Pass | Pass | Pass | Pass | Pass | Blocked | Pass | No search box found on the list |
| Delivery Challans | Pass | Pass | Pass | Pass | Pass | Pass | Pass | New and Return |
| Stock Transfers | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked | Pass | Not enough rows for page 2 |
| Stock Adjustments | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked | Pass | Not enough rows for page 2 |
| B2B Sales Orders | Pass | Pass | Fail | Fail | Pass | Blocked | Blocked | Add → Cancel landed on page 1. Back kept page 2. Edit control was not found from the row. No search box found |
| B2B Sales Quotes | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked | Pass | Not enough rows for page 2 |
| B2B Shipments | Pass | Pass | Fail | Fail | Pass | Blocked | Blocked | Add → Cancel, and start return → Cancel, landed on page 1. Back kept page 2 |
| B2B Shipment Returns | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked | Pass | Not enough rows for page 2 |
| B2B Leads | Pass | Pass | Blocked | Blocked | Pass | Pass | Fail | List view. Edit control was not opened. Rows-per-page did not update the address |
| Production BOM | Pass | Pass | Pass | Pass | Pass | Blocked | Pass | New and Edit. No search box found |
| Production Orders | Pass | Pass | Pass | Pass | Pass | Pass | Pass | New, Edit, and start booking |
| Production Bookings | Pass | Pass | Fail | Fail | Pass | Pass | Blocked | New → Cancel landed on page 1. Back kept page 2. Search reset to page 1 |
| Roles Modules | Pass | Pass | Fail | Fail | Pass | Blocked | Pass | Add → list name landed on page 1. Back kept page 2. See section 8 for Edit |

### 9.2 List-only menus

| Menu | PG-01 | PG-02 | PG-06 | PG-07 | Note |
| --- | --- | --- | --- | --- | --- |
| Closed Orders | Pass | Pass | Pass | Fail | Rows-per-page did not update the address |
| Cancelled Orders | Blocked | Blocked | Blocked | Fail | Not enough rows for page 2. Rows-per-page did not update the address |
| Site Visit | Blocked | Blocked | Blocked | Pass | Not enough rows for page 2 |
| Followup | Blocked | Blocked | Blocked | Pass | Not enough rows for page 2 |
| Marketing Leads | Blocked | Blocked | Blocked | Fail | List view. Not enough rows for page 2. Rows-per-page did not update the address |
| Marketing Lead Follow-up | Blocked | Blocked | Blocked | Pass | Not enough rows for page 2 |
| B2B Lead Follow-up | Pass | Pass | Pass | Pass | |
| Users Master | Pass | Pass | Blocked | Pass | Dialog close kept the page. No search box found |
| Roles | Pass | Pass | Blocked | Pass | Dialog close kept the page. No search box found |
| Modules | Pass | Pass | Blocked | Pass | Dialog close kept the page. No search box found |
| Masters | Blocked | Blocked | Blocked | Blocked | Pager is not on screen until a master is chosen. Re-test after opening one master |
| Product | Pass | Pass | Blocked | Pass | No search box found |
| Supplier | Blocked | Blocked | Blocked | Pass | Not enough rows for page 2 |
| Bill of Materials | Blocked | Blocked | Blocked | Pass | Not enough rows for page 2 |
| Project Price List | Pass | Pass | Blocked | Pass | No search box found |
| Serial Master | Pass | Pass | Blocked | Pass | No search box found |
| Stocks | Pass | Pass | Blocked | Pass | No search box found |
| Inventory Ledger | Pass | Pass | Blocked | Pass | No search box found |
| Purchase Order lines | Pass | Pass | Blocked | Pass | No search box found |
| B2B Clients | Blocked | Blocked | Blocked | Pass | Not enough rows for page 2 |
| B2B Invoices | Blocked | Blocked | Blocked | Pass | Not enough rows for page 2 |
| B2B Sales Planning | Blocked | Blocked | Blocked | Pass | Not enough rows for page 2 |
| Service Tickets | Pass | Pass | Pass | Blocked | Rows-per-page control was not found |
| Warranty Claims | Blocked | Blocked | Blocked | Blocked | Not enough rows. Rows-per-page control was not found |
| Service Search | Blocked | Blocked | Blocked | Blocked | List appears only after a search of at least 2 characters. Re-test after searching |
| Unsettled | Pass | Pass | Fail | Blocked | Search left the list on page 2 |
| Pending commission | Blocked | Blocked | Blocked | Blocked | Not enough rows. Rows-per-page control was not found |
| Payout | Blocked | Blocked | Blocked | Blocked | Not enough rows. Rows-per-page control was not found |
| Payout approval | Blocked | Blocked | Blocked | Blocked | Not enough rows. Rows-per-page control was not found |
| Commission report | Blocked | Blocked | Blocked | Blocked | Not enough rows. Rows-per-page control was not found |
| Settlement history | Blocked | Blocked | Blocked | Blocked | Not enough rows. Rows-per-page control was not found |
| Ledger report | Blocked | Blocked | Blocked | Blocked | Pager was not on screen until the report is run. Re-test after running the report |
| User order commission rates | Blocked | Blocked | Blocked | Pass | Not enough rows for page 2 |
| Payment outstanding | Pass | Pass | Blocked | Pass | No search box found |
| Agent logs | Pass | Pass | Blocked | Fail | Rows-per-page did not update the address |
| Location tracking logs | Pass | Pass | Pass | Fail | Rows-per-page did not update the address |
| Quotation manager approval | Pass | Pass | Blocked | Pass | No search box found |
| Installation manager approval | Blocked | Blocked | Blocked | Fail | Not enough rows for page 2. Rows-per-page did not update the address |

### 9.3 Extra checks

| Check | Result | Note |
| --- | --- | --- |
| Inquiry → New Inquiry | Open | The list did not finish loading on the watch pass. The **New Inquiry** button opens the form without the list page, so return is expected to fall on page 1 until re-tested. Confirm from Inquiry List page 2 |
| Marketing Leads → Edit | Blocked | List view does not have a second page in this database |
| Roles Modules → Edit | Fail | Edit from page 2 returned to page 1. The edit link does not carry the list page |

---

## 10. Defects for the BA to confirm

Log these if your re-test shows the same result.

1. **B2B Sales Orders — Add → Cancel** returns to page 1. Browser Back still returns to page 2.
2. **B2B Shipments — Add → Cancel**, and **start a return → Cancel**, return to page 1. Browser Back still returns to page 2.
3. **Production Bookings — New → Cancel** returns to page 1. Browser Back still returns to page 2.
4. **Roles Modules — Add → list name** returns to page 1. **Edit** also returns to page 1.
5. **Inquiry — Edit / Create Order** has no Cancel. Save stayed on the edit screen. Browser Back kept page 2. Search showed page 1 on screen while the address still said `page=2`.
6. **Unsettled commission — search** did not leave page 2.
7. **Rows per page** did not update the address on Confirm Orders, B2B Leads, Closed Orders, Cancelled Orders, Marketing Leads, Agent logs, Location tracking logs, and Installation manager approval.

---

## 11. BA sign-off

Tester: ____________________  
Date: ____________________  
Build / environment: ____________________

Tick only after you have run the step yourself. Copy the 30 Sep result into your notes, then overwrite it with your own Pass, Fail, or Blocked.

| # | Menu | Cases you must run | Your result | Note |
| --- | --- | --- | --- | --- |
| 1 | Pending Orders | PG-01–PG-07 | | |
| 2 | Confirm Orders | PG-01–PG-07 | | |
| 3 | Inquiry (List) | PG-01–PG-07, plus New Inquiry | | |
| 4 | Quotation | PG-01–PG-07 | | |
| 5 | Purchase Orders | PG-01–PG-07 | | |
| 6 | PO Inwards | PG-01–PG-07 | | |
| 7 | Purchase Returns | PG-01–PG-07 | | |
| 8 | Delivery Challans | PG-01–PG-07 | | |
| 9 | Stock Transfers | PG-01–PG-07 | | |
| 10 | Stock Adjustments | PG-01–PG-07 | | |
| 11 | B2B Sales Orders | PG-01–PG-07 | | |
| 12 | B2B Sales Quotes | PG-01–PG-07 | | |
| 13 | B2B Shipments | PG-01–PG-07 | | |
| 14 | B2B Shipment Returns | PG-01–PG-07 | | |
| 15 | B2B Leads (List) | PG-01–PG-07 | | |
| 16 | Production BOM | PG-01–PG-07 | | |
| 17 | Production Orders | PG-01–PG-07 | | |
| 18 | Production Bookings | PG-01–PG-07 | | |
| 19 | Roles Modules | PG-01–PG-07, plus Edit | | |
| 20 | Closed Orders | PG-01, PG-02, PG-06, PG-07 | | |
| 21 | Cancelled Orders | PG-01, PG-02, PG-06, PG-07 | | |
| 22 | Site Visit | PG-01, PG-02, PG-06, PG-07 | | |
| 23 | Followup | PG-01, PG-02, PG-06, PG-07 | | |
| 24 | Marketing Leads (List) | PG-01, PG-02, PG-06, PG-07, plus Edit | | |
| 25 | Marketing Lead Follow-up | PG-01, PG-02, PG-06, PG-07 | | |
| 26 | B2B Lead Follow-up | PG-01, PG-02, PG-06, PG-07 | | |
| 27 | Users Master | PG-01, PG-02, PG-06, PG-07, plus dialog close | | |
| 28 | Roles | PG-01, PG-02, PG-06, PG-07, plus dialog close | | |
| 29 | Modules | PG-01, PG-02, PG-06, PG-07, plus dialog close | | |
| 30 | Masters | PG-01, PG-02, PG-06, PG-07 after a master is open | | |
| 31 | Product | PG-01, PG-02, PG-06, PG-07 | | |
| 32 | Supplier | PG-01, PG-02, PG-06, PG-07 | | |
| 33 | Bill of Materials | PG-01, PG-02, PG-06, PG-07 | | |
| 34 | Project Price List | PG-01, PG-02, PG-06, PG-07 | | |
| 35 | Serial Master | PG-01, PG-02, PG-06, PG-07 | | |
| 36 | Stocks | PG-01, PG-02, PG-06, PG-07 | | |
| 37 | Inventory Ledger | PG-01, PG-02, PG-06, PG-07 | | |
| 38 | Purchase Order lines | PG-01, PG-02, PG-06, PG-07 | | |
| 39 | B2B Clients | PG-01, PG-02, PG-06, PG-07 | | |
| 40 | B2B Invoices | PG-01, PG-02, PG-06, PG-07 | | |
| 41 | B2B Sales Planning | PG-01, PG-02, PG-06, PG-07 | | |
| 42 | Service Tickets | PG-01, PG-02, PG-06, PG-07 | | |
| 43 | Warranty Claims | PG-01, PG-02, PG-06, PG-07 | | |
| 44 | Service Search | PG-01, PG-02, PG-06, PG-07 after a search | | |
| 45 | Unsettled | PG-01, PG-02, PG-06, PG-07 | | |
| 46 | Pending commission | PG-01, PG-02, PG-06, PG-07 | | |
| 47 | Payout | PG-01, PG-02, PG-06, PG-07 | | |
| 48 | Payout approval | PG-01, PG-02, PG-06, PG-07 | | |
| 49 | Commission report | PG-01, PG-02, PG-06, PG-07 | | |
| 50 | Settlement history | PG-01, PG-02, PG-06, PG-07 | | |
| 51 | Ledger report | PG-01, PG-02, PG-06, PG-07 after the report is run | | |
| 52 | User order commission rates | PG-01, PG-02, PG-06, PG-07 | | |
| 53 | Payment outstanding | PG-01, PG-02, PG-06, PG-07 | | |
| 54 | Agent logs | PG-01, PG-02, PG-06, PG-07 | | |
| 55 | Location tracking logs | PG-01, PG-02, PG-06, PG-07 | | |
| 56 | Quotation manager approval | PG-01, PG-02, PG-06, PG-07 | | |
| 57 | Installation manager approval | PG-01, PG-02, PG-06, PG-07 | | |

Sign-off is complete only when every row has your result. A blank row is not a pass.

---

*Document version 1.0 — Solar CRM web, list page kept after refresh and after a form. Functional only.*
