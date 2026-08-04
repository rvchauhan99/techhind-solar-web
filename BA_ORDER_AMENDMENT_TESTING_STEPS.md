# BA Order Amendment - Testing Steps

This document is for BA/UAT validation of the **Order Amend** feature.

## 1) Pre-Setup Checklist

- Backend and web code are deployed with latest amendment changes.
- DB migration is executed on API:
  - `npm run db:migrate` (from `techhind-solar-api`)
- Test users available:
  - **BA role user**
  - **SuperAdmin user**
  - **Non-BA/non-SuperAdmin user** (for negative test)
- At least one valid test order exists (preferably with some completed stages).

## 2) Route Access and Visibility

### 2.1 BA user can see Amend action
1. Login as BA user.
2. Open order list page.
3. In row actions menu, verify **Amend (BA)** is visible.
4. Open an order detail page.
5. Verify **Amend (BA)** button is visible in header area.

Expected:
- BA user sees amend entry points in list and view pages.

### 2.2 SuperAdmin user can see Amend action
1. Login as SuperAdmin user.
2. Repeat the same checks as BA user.

Expected:
- SuperAdmin sees amend entry points.

### 2.3 Non-BA user cannot access amend flow
1. Login as non-BA/non-SuperAdmin user.
2. Check list/view action areas.
3. Try manual URL: `/order/amend?id=<orderId>`.

Expected:
- Amend actions are not shown.
- Direct URL access is blocked with restricted message or denied by API on submit.

## 3) Basic Amendment Flow (Happy Path)

1. Login as BA user.
2. Open `/order/amend?id=<orderId>`.
3. In **Basic Details** tab, update 1-2 editable fields (for example remarks/reference/basic order info).
4. Submit the form.
5. In confirmation dialog:
   - Enter valid amendment reason.
   - Enter correct current login password.
6. Confirm amendment.

Expected:
- Success message appears.
- Data is saved and visible on reload.
- Amendment history gets one new record.

## 4) Password and Reason Validation

### 4.1 Missing reason
1. Trigger submit.
2. Keep reason empty, fill password.

Expected:
- Validation error: reason required.
- No update is applied.

### 4.2 Missing password
1. Trigger submit.
2. Fill reason, keep password empty.

Expected:
- Validation error: password required.
- No update is applied.

### 4.3 Wrong password
1. Trigger submit with valid reason.
2. Enter wrong current password.

Expected:
- Error shown: current password incorrect.
- No update is applied.
- No amendment log is created.

## 5) Completed Stage Amendment (Advanced JSON Patch)

1. Open an order with completed stages.
2. Go to **Advanced Stage Amend** tab.
3. Enter valid JSON patch for stage/completed-stage fields.
4. Submit, then confirm with valid reason + password.

Expected:
- Amendment succeeds.
- Updated stage-related fields persist after refresh.
- Amendment history captures changed fields.

## 6) Amendment History Verification

1. On same order amend page, open **Amendment History** tab.
2. Verify latest record shows:
   - Reason
   - Actor user
   - Timestamp
   - Changed fields list

Expected:
- Every successful amendment appears in history.
- Entries are ordered latest first.

## 7) API-Level Security Checks

Use Postman or API client with bearer token.

### 7.1 BA token + correct password
- `POST /order/:id/amend` with valid payload, `amendment_reason`, `current_password`.

Expected:
- 200 success.

### 7.2 BA token + wrong password
Expected:
- 4xx error (password validation failure).

### 7.3 Non-BA token + correct password
Expected:
- 403 forbidden for role restriction.

### 7.4 Get history endpoint
- `GET /order/:id/amendments`

Expected:
- Amendment records are returned for authorized users.

## 8) Regression Checks

- Existing `PUT /order/:id` driven flows (normal edit/other modules) continue working.
- Confirm Orders and Order View pages still load and operate normally.
- File upload behavior from amendment flow still works for newly added files.

## 9) UAT Sign-Off Template

- [ ] BA can access and amend.
- [ ] SuperAdmin can access and amend.
- [ ] Non-BA cannot amend.
- [ ] Password confirmation works (correct/wrong/missing).
- [ ] Amendment reason enforced.
- [ ] Completed-stage amendment is possible.
- [ ] Amendment history is visible and accurate.
- [ ] No regression in existing order flows.

