# Functional release plan — Dynamic Order Documents (BA / UAT)

| Field | Value |
| --- | --- |
| Document type | Functional release plan + UAT checklist (business only) |
| Product | TechHind Solar CRM (web) |
| Audience | Business Analysts, business testers, client UAT |
| Release name | Order conversion — configurable documents + inquiry attachments |
| Version | 1.0 |
| Last updated | 2026-10-03 |
| Related screens | Inquiry → Documents; Convert Inquiry to Order; Order Edit / View Documents; Masters → Order Document Type |

This document is **functional only**. It describes what users see and what BA must verify. It does not describe how the product is built.

---

## 1. What this release does (plain language)

When converting an inquiry into an order, the document upload section is no longer fixed the same for every client.

1. Each client can decide **which documents appear** on the order form, and which are **mandatory**.
2. Documents already uploaded on the **inquiry** show as **already attached**, with a way to **view** them, so users do not have to guess or re-upload blindly.
3. If the user picks a **new file from their computer**, they can **view it before saving**.
4. Documents that exist on the inquiry but are not one of the form upload buttons (example: PDC) still appear under **Other inquiry documents** with View.
5. **Old orders and old uploaded files stay as they are.** Nothing is removed from history.
6. By default, every client starts with the **same 7 documents and same required/optional pattern as today**, so day-one behaviour matches current practice until someone changes the master.

---

## 2. Who is affected

| Role | What they notice |
| --- | --- |
| Sales / order creator | Document list on Convert to Order may change per client setup; required docs block Save on **new** orders only; inquiry files show as Attached + View |
| Master / admin | New settings on **Order Document Type** master: show on form, required, sort order, file type |
| Order editor | Can still edit old orders; missing docs do **not** block Save on edit |
| Anyone viewing order / cancelled order | Documents tab still lists everything that was uploaded or carried from inquiry |

**Not in this release:** Mobile app order creation (no change).

---

## 3. Functional flows

### Flow A — Default (no master change)

1. User opens **Convert Inquiry to Order**.
2. **Document Uploads** shows **7 documents**.
3. **Required (5):** Electricity Bill, Aadhar Card, Passport Size Picture, Cancelled Cheque, Customer Sign.
4. **Optional (2):** House Tax (Latest House Tax Bill / Index-2 style label), PAN Card or Driving Licence.
5. User clicks **Save Order**.
6. If any required document is missing (and not already on the inquiry) → Save is blocked with a clear message.
7. If all required are present → Order is created, and inquiry documents are copied onto the order.

Required can be satisfied by:

- Uploading a new file on the form, **or**
- That document already existing on the inquiry (shown as **Attached (from inquiry)**)

### Flow B — Client changes master settings

1. Admin opens **Masters → Order Document Type**.
2. Admin turns **Show on form** / **Required** on or off for a type, **or** adds a new type (e.g. Site NOC) with Show and Required.
3. Next **Convert to Order** uses the new list.

Examples:

| Admin action | What user sees on Convert to Order |
| --- | --- |
| Make Aadhar Required = No | No red star; Save allowed without Aadhar |
| Hide PAN (Show on form = No) | PAN button disappears; old orders that already have PAN still show it on the order Documents tab |
| Add Site NOC, Show = Yes, Required = Yes | New button with star; Save needs that file (or an inquiry copy) |

### Flow C — Inquiry already has documents (main BA scenario)

1. Inquiry **Documents** tab already has files (e.g. Customer Sign and PDC).
2. User opens **Convert to Order**.
3. Matching slots show **Attached (from inquiry)** + **View**.
4. Types with no upload button (e.g. PDC) appear under **Other inquiry documents** + **View**.
5. User may pick a new local file and use **View** before Save.
6. After Save, order **Documents** tab shows carried and newly uploaded files.

### Flow D — Edit existing order

1. User opens **Edit Order**.
2. Same document buttons as configured for the client.
3. Existing files show as **Current File** + **View**.
4. **Save is never blocked** only because a required document is missing (required rule applies to **new conversion only**).

---

## 4. Setup check (once per environment after go-live)

1. Sign in as a user who can open Masters.
2. Open **Masters → Order Document Type**.
3. Confirm the usual **7** conversion documents are set to **show on the order form**, with the usual **5 required / 2 optional**.
4. Confirm other types (PDC, Plan Approval, etc.) are **not** forced onto the form unless the client intends that.

---

## 5. UAT checklist

### Result words

| Result | Meaning |
| --- | --- |
| Pass | Screen matches expected result |
| Fail | Screen does not match; note what you saw |
| Blocked | Could not run (no data, no permission, env issue); note reason |

### Cases

| ID | Steps | Expected | Result | Notes |
| --- | --- | --- | --- | --- |
| UAT-01 | Open Convert to Order for a normal inquiry | Same 7 document buttons; 5 with required mark; 2 without | | |
| UAT-02 | On a new conversion, leave a required slot empty and with no inquiry copy; click Save | Clear error; order not created | | |
| UAT-03 | Inquiry has Customer Sign on Documents tab; Convert | Customer Sign shows **Attached (from inquiry)** + **View**; Save not blocked for that document | | |
| UAT-04 | Click View on an Attached (from inquiry) line | Document opens / downloads correctly | | |
| UAT-05 | Inquiry has PDC (or similar) that is not one of the 7 form buttons; Convert | **Other inquiry documents** lists PDC with View | | |
| UAT-06 | Pick a local screenshot on Electricity Bill | Filename + **View**; View opens the chosen file without saving yet | | |
| UAT-07 | Slot shows Attached from inquiry; pick a new local file; Save | Note that it will replace inquiry copy; after Save, order has the new file for that type (not two confusing duplicates) | | |
| UAT-08 | Save order without replacing inquiry docs; open order → Documents | Inquiry documents (including “other” types like PDC) are present | | |
| UAT-09 | View Documents on a pending order and on a cancelled order that had uploads | All documents still listed; cancel does not wipe documents | | |
| UAT-10 | Edit an older order that is missing some “required” docs | Save still works; Current File + View still work for files already there | | |
| UAT-11 | Set Aadhar Required = No in master; Convert again | No required star; Save allowed without Aadhar | | |
| UAT-12 | Set PAN Show on form = No; Convert | PAN button gone; old orders that have PAN still show it on Documents | | |
| UAT-13 | Add “Site NOC”, Show = Yes, Required = Yes; Convert | New button with star; Save requires it (or inquiry copy) | | |
| UAT-14 | Inquiry with no documents; Convert | No “Attached” lines; no “Other inquiry documents” block; normal upload grid only | | |

---

## 6. Suggested UAT entry data

| Data needed | Why |
| --- | --- |
| One inquiry with **Customer Sign** + **PDC** (same pattern as inquiry 313 on test) | UAT-03, UAT-04, UAT-05, UAT-07, UAT-08 |
| One inquiry with **no** documents | UAT-01, UAT-02, UAT-14 |
| One older order with existing electricity / aadhar-style uploads | UAT-10 |
| One cancelled order that already has documents | UAT-09 |

---

## 7. Out of scope — do not raise as defects for this release

- Changing which documents appear on **inquiry** Upload Document (still the full master list).
- Mobile app order create.
- Forcing required documents when **editing** an existing order.
- Renaming historical document labels already stored on old orders (both old and new naming styles may remain visible).

---

## 8. BA sign-off criteria

Release is ready for BA sign-off when:

1. Default conversion matches today’s 7 documents and required pattern.
2. Inquiry attachments show as Attached + View, and “other” types are listed.
3. Local file View works before Save.
4. Master toggles (optional / hide / add) change the form without breaking old order documents.
5. Create-only required rule is confirmed; edit and cancelled-order documents remain intact.

### Sign-off

| Field | Value |
| --- | --- |
| Environment tested | |
| Tester name | |
| Date | |
| Overall result (Pass / Fail / Partial) | |
| Failed / blocked case IDs | |
| BA sign-off (Yes / No) | |
| Comments | |
