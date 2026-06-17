# Service Module Functional Test Guide (BA) - Short Version

## Objective
Validate the main Service module business flow and functionality end-to-end.

## Functional Flow Highlights

### 1) Service Dashboard
- Dashboard opens and shows service KPIs.
- KPI values reflect latest ticket activity.

### 2) Project Search
- User can search projects using customer or project details.
- Valid results are shown.
- User can start ticket creation directly from search result.

### 3) Create Service Ticket
- Project context is shown.
- User can enter issue and required ticket details.
- Engineer, priority, category, and type selection works.
- Ticket is created successfully and opens in detailed view.

### 4) All Tickets
- Ticket listing loads with ticket/customer/status details.
- Search, status filter, and pagination work.
- User can open ticket quick view and full details.

### 5) Ticket Detail Lifecycle
- Engineer assignment works.
- Site visit can be recorded.
- Service completion can be recorded.
- Material request can be created/submitted.
- Payment can be recorded.
- Invoice/receipt downloads work.
- Ticket closes only when business conditions are met.

### 6) My Service Board
- Engineer can see assigned tickets grouped by stage.
- Ticket cards navigate to correct details page.

### 7) Warranty Claims
- Warranty claim listing loads correctly.
- Search/filter/pagination works.
- Pending return claim can be confirmed once.

---

## End-to-End Journey (Must Pass)
1. Search project
2. Create service ticket
3. Assign engineer
4. Record site visit
5. Record completion
6. Process material request (if needed)
7. Process warranty claim (if needed)
8. Record payment (if applicable)
9. Close ticket

Expected: Ticket status progression remains consistent across all service screens.

---


---

## Quick Regression Checklist
- Dashboard loads and values are visible.
- Search-to-create flow works.
- Ticket creation works with valid data.
- Ticket list search/filter/pagination works.
- Ticket lifecycle actions work in correct order.
- Warranty claim confirmation works.
- Payment and document download work.
- Ticket closure rule works correctly.

---

## UAT Sign-off (Short)
- Cycle:
- Environment:
- Tester:
- Date:
- Result: Pass / Fail
- Major observations:
- Release recommendation: Go / No-Go
# Service Module Functional Test Guide (BA)

## 1) Document Purpose
This document helps Business Analysts perform complete functional testing of the Service module from start to end.  
It focuses only on user-visible behavior, business flow, validations, and expected outcomes.

## 2) Scope Covered
- Service Dashboard
- Project Search
- Create Service Ticket
- Service Tickets Listing (All Tickets)
- Service Ticket Details (full lifecycle actions)
- My Service Board (My Tickets)
- Warranty Claims
- Invoice and Receipt download checks


## 4) Preconditions
- Tester has valid login access to Service module.
- At least one confirmed/completed customer project exists for ticket creation.
- At least one active user is available for assignment.
- Test environment has sample service records (open, assigned, pending, closed where possible).
- Document/file download is allowed in tester machine/browser.

## 5) Roles for Functional Validation
- Service Admin / Operations User
  - Can create and manage all tickets.
- Service Engineer User
  - Can view and act on assigned tickets through My Service Board.
- Warranty Handling User
  - Can review and confirm warranty return actions.

## 6) Suggested Test Data Matrix
- Customer project with active contract
- Customer project with paid-call context
- Ticket with no engineer assigned
- Ticket with engineer assigned
- Ticket with site visit and completion pending
- Ticket requiring material request
- Ticket with invoice and payment flow
- Ticket with warranty claim pending return

---

## 7) Functional Test Scenarios

## A. Service Dashboard

### A-01: Open dashboard and verify KPI visibility
**Steps**
1. Open Service Dashboard.
2. Observe KPI cards and section blocks.

**Expected**
- Dashboard loads successfully.
- KPI cards are visible for urgent items, ticket status, operational/financial metrics, and engineer workload (if data available).
- No blank or broken section appears.

### A-02: Validate data refresh after lifecycle changes
**Steps**
1. Note current values for key KPIs (open tickets, pending warranty, awaiting payment).
2. Perform a ticket action in another screen (for example create or close a ticket).
3. Return to dashboard and refresh.

**Expected**
- KPI counts update to reflect latest business state.

---

## B. Project Search

### B-01: Search threshold behavior
**Steps**
1. Open Project Search.
2. Enter 1 character in search box.
3. Try search.
4. Enter 2+ characters and search again.

**Expected**
- Search is not executed for too-short input.
- Search executes for 2+ characters.
- Results list appears only for valid search.

### B-02: Search by different business fields
**Steps**
1. Search using customer name.
2. Search using mobile number.
3. Search using consumer number.
4. Search using project/order identifier.

**Expected**
- Matching projects appear for each valid input type.
- Result rows show core customer/project details.

### B-03: Start ticket creation from search result
**Steps**
1. From a result row, use “Create Ticket”.

**Expected**
- User navigates to Create Service Ticket for selected project.

---

## C. Create Service Ticket

### C-01: Verify project context is preloaded
**Steps**
1. Open create page via Project Search selection.
2. Observe project information panel.

**Expected**
- Project/customer details are visible.
- Contract context is visible.
- Existing service history (if any) is visible.

### C-02: Create ticket with mandatory details
**Steps**
1. Fill Reported Issue.
2. Optionally fill customer remarks.
3. Select engineer (or keep unassigned).
4. Select priority, service category, and service type.
5. Submit “Create Ticket”.

**Expected**
- Ticket is created successfully.
- User is redirected to ticket detail screen.
- New ticket number is visible.

### C-03: Validate required field behavior
**Steps**
1. Keep Reported Issue blank.
2. Try submit.

**Expected**
- Ticket is not created.
- User gets clear validation behavior.

### C-04: Category-Type dependency behavior
**Steps**
1. Select one service category.
2. Open service type list.
3. Change category.
4. Re-open service type list.

**Expected**
- Service Type options align with selected category.
- Invalid previous type (if any) is not retained.

### C-05: Open order details from project identifier
**Steps**
1. In context panel, select the project/order number.

**Expected**
- Full order details panel opens successfully.

---

## D. Service Tickets (All Tickets)

### D-01: List load and basic fields
**Steps**
1. Open Service Tickets page.

**Expected**
- Ticket list loads with visible rows and expected columns.
- Status is clearly visible per row.

### D-02: Live search behavior
**Steps**
1. Enter search text gradually.
2. Pause typing.
3. Clear search text.

**Expected**
- List updates smoothly to match latest text.
- No stale or conflicting results.
- Clearing search returns broad/default list.

### D-03: Status filter behavior
**Steps**
1. Choose a specific status filter.
2. Observe rows.
3. Switch to another status.
4. Reset/clear filters.

**Expected**
- Rows reflect selected status.
- Filter switching updates list correctly.
- Clear filters restores full/neutral listing.

### D-04: Pagination behavior
**Steps**
1. Move to next page.
2. Change rows per page.

**Expected**
- Page navigation and row count controls work correctly.
- Total count and listing remain consistent.

### D-05: Row details panel and full details navigation
**Steps**
1. Select a row to open side details.
2. Use “View Full Details”.

**Expected**
- Quick details panel opens with ticket/customer/project summary.
- Full details page opens for selected ticket.

---

## E. My Service Board (My Tickets)

### E-01: Board load by status buckets
**Steps**
1. Open My Service Board as engineer-role user.

**Expected**
- Board loads grouped cards by stage.
- Ticket counts per bucket are visible.

### E-02: Ticket card navigation
**Steps**
1. Open ticket from any board card.

**Expected**
- Correct ticket detail screen opens.

### E-03: Empty/exception states
**Steps**
1. Test user with no assigned tickets.
2. Trigger refresh/reload.

**Expected**
- Empty state appears cleanly without layout break.
- Retry behavior works if temporary load issue occurs.

---

## F. Ticket Detail (Lifecycle Actions)

### F-01: Assign engineer for open ticket
**Steps**
1. Open a ticket in open state.
2. Select engineer in assignment section.

**Expected**
- Assignment is saved.
- Ticket status/state updates accordingly.

### F-02: Record site visit
**Steps**
1. Fill site observations.
2. Fill diagnosis and remarks.
3. Save site visit.

**Expected**
- Site visit information is saved.
- Ticket progression reflects new activity.

### F-03: Record service completion
**Steps**
1. Enter work performed and completion remarks.
2. Mark as completed.

**Expected**
- Completion details are saved.
- Ticket moves to completion stage.

### F-04: Material request creation and submission
**Steps**
1. Add one or more product lines with quantity.
2. Create material request.
3. Submit request where allowed.

**Expected**
- Material request is created and visible in list.
- Submission action is available only in valid request states.
- Request status changes after submission.

### F-05: Invoice and payment visibility
**Steps**
1. Open invoice/payment section for ticket with billing data.

**Expected**
- Existing invoices and payment entries are visible with amounts and identifiers.

### F-06: Record payment
**Steps**
1. Select payment mode.
2. Select receiving account.
3. Enter amount and references.
4. Optionally upload proof.
5. Submit payment.

**Expected**
- Payment is recorded successfully.
- Updated paid amount/receipt list is visible.

### F-07: Download invoice and receipt documents
**Steps**
1. Download invoice document.
2. Download receipt document.

**Expected**
- Download starts successfully.
- File opens or saves with readable content.

### F-08: Close ticket
**Steps**
1. Use Close Ticket action after completing required business steps.

**Expected**
- Ticket closes successfully when criteria are satisfied.
- Closed status is visible and persistent.

### F-09: Closure protection checks
**Steps**
1. Try to close ticket when pending business prerequisites still exist.

**Expected**
- Closure is blocked.
- User sees clear reason and can take corrective action.

---

## G. Warranty Claims

### G-01: Warranty claims list load
**Steps**
1. Open Warranty Claims page.

**Expected**
- Claims list loads with claim number, ticket, product, and status.

### G-02: Search and filter claims
**Steps**
1. Search using claim/ticket/customer clue.
2. Change status filter.
3. Navigate pages.

**Expected**
- Results match search/filter inputs.
- Pagination behaves correctly with total count.

### G-03: Confirm return action
**Steps**
1. On pending-return claim, select confirm return.
2. Try clicking same action repeatedly.

**Expected**
- Claim confirms successfully once.
- Duplicate/rapid actions are blocked during processing.
- Claim status updates and row action changes accordingly.

### G-04: Non-eligible claim action check
**Steps**
1. Open claim not in pending-return status.

**Expected**
- Confirm-return action is not available for ineligible status.

---

## H. Cross-Flow End-to-End Lifecycle Validation

### H-01: Full happy lifecycle
**Flow**
1. Search project.
2. Create ticket.
3. Assign engineer.
4. Record site visit.
5. Record completion.
6. Create/submit material request (if required).
7. Process warranty return (if required).
8. Record payment.
9. Close ticket.

**Expected**
- Each step completes in sequence.
- Ticket remains traceable across all service screens.
- Final closed ticket is visible in listing/history with consistent status.

### H-02: Engineer-focused lifecycle
**Flow**
1. Assigned ticket appears in My Service Board.
2. Engineer opens and performs required updates.
3. Progress is reflected in All Tickets and Ticket Detail.

**Expected**
- Engineer and operations views stay consistent.

---

## I. Role-Based Functional Checks

### I-01: Access to allowed pages
**Steps**
1. Login with each business role.
2. Open dashboard, tickets, my board, warranty, search.

**Expected**
- Role sees only pages/actions intended for that role.

### I-02: Action control by role
**Steps**
1. Attempt restricted actions with non-eligible role.

**Expected**
- Restricted actions are hidden or blocked with clear behavior.

---

## 8) Regression Checklist (Release Sign-off)
- Dashboard loads without broken tiles.
- Search works for all major lookup fields.
- Ticket creation works with valid inputs.
- Required validations block invalid submissions.
- Ticket listing search/filter/pagination work smoothly.
- Ticket detail actions save correctly (assign, visit, completion).
- Material request flow works end-to-end.
- Warranty claim confirm-return works correctly.
- Payment record flow and document download work.
- Ticket closure works only when business conditions are met.
- My Service Board reflects assigned engineer workload correctly.
- Status consistency is maintained across all screens.

---

## 9) UAT Execution Tracker Template

| Scenario ID | Scenario Title | Tester | Date | Result (Pass/Fail) | Remarks |
|---|---|---|---|---|---|
| A-01 | Dashboard KPI visibility |  |  |  |  |
| B-01 | Search threshold behavior |  |  |  |  |
| C-02 | Create ticket with valid inputs |  |  |  |  |
| D-03 | Status filter behavior |  |  |  |  |
| E-01 | My Service Board grouping |  |  |  |  |
| F-08 | Ticket closure |  |  |  |  |
| G-03 | Confirm return action |  |  |  |  |
| H-01 | Full end-to-end lifecycle |  |  |  |  |

---

## 10) Final BA Sign-off

- Test Cycle Name:
- Environment:
- Total Scenarios Executed:
- Passed:
- Failed:
- Blocked:
- Key Risks/Observations:
- Recommended Release Decision: **Go / No-Go**
- BA Name:
- BA Sign-off Date:

