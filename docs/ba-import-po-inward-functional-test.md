# BA Functional Testing Document — Import Purchase Order (Supplier → PO → Inward)

| Field | Value |
| --- | --- |
| Document type | Functional BA test (business only) |
| Module | Procurement — Purchase Orders & PO Inwards (Import) |
| Audience | Business Analysts, Business testers, Operations |
| Version | 1.0 |
| Last updated | 2026-08-04 |

---

## 1. Purpose and scope

### 1.1 Purpose

Validate the **Import procurement journey** end to end:

1. Create a **foreign supplier**
2. Create and approve an **Import Purchase Order**
3. Create a **PO Inward (Goods Receipt) draft** at the warehouse
4. Complete **Approve** with BOE, shipping, import expenses, and landed-cost review
5. Confirm **stock is posted at landed unit cost**

This document is **functional only**. It describes screens, fields, business rules, expected results, and calculation checks. It does not describe systems design or how the product is built.

### 1.2 In scope

- Foreign supplier master (country + currency)
- Import PO create, display of currency / exchange rate / dual totals, approve
- Import PO Inward draft (quantities and tracking only)
- Import Approve page (BOE, shipping, expenses, attachments, summary, Save, Approve)
- Landed cost allocation rules and numeric verification
- Short contrast with **Domestic** PO / Inward behaviour

### 1.3 Out of scope

- Domestic-only deep test pack (only contrast notes below)
- Purchase returns, serial master setup beyond “enter serials if product requires them”
- Payment / accounts payable / customs filing outside this app

### 1.4 How Import is decided (business rule)

A Purchase Order is treated as **Import** when:

> **Supplier country ≠ Ship-to warehouse country**

Example: Supplier country = United States, Ship-to warehouse country = India → **Import**.

If both are India → **Domestic** (not Import).

---

## 2. Actors and prerequisites

| Role | Responsibility on this journey |
| --- | --- |
| Purchasing / Master data | Create foreign supplier; create and approve Import PO |
| Warehouse manager | Create PO Inward draft; fill Approve page; Approve receipt |

**Prerequisites (functional):**

- Access to **Suppliers**, **Purchase Orders**, and **PO Inwards** screens
- At least one **India** ship-to warehouse
- At least two **active products** available for purchase (preferably lot-tracked for simpler receipt; use serials if product requires them)
- User is allowed to manage the ship-to warehouse used on the PO

---

## 3. Business rules summary — Import

| # | Rule |
| --- | --- |
| R1 | Import when supplier country differs from ship-to warehouse country |
| R2 | PO currency follows **supplier currency** (e.g. USD) |
| R3 | **Exchange rate** = INR for **1 unit of foreign currency** (e.g. 83.50 means ₹83.50 per USD 1) |
| R4 | On Import PO lines, **GST % is 0** (no Indian GST on FC PO lines) |
| R5 | Line amounts shown in foreign currency; INR equivalents use FC × exchange rate |
| R6 | Warehouse **Create / Edit Inward** captures **received / accepted quantities** and **serials or lot** only — not shipping, BOE, or import expenses |
| R7 | Import expenses, BOE, shipping, and documents are captured on the **Approve** screen for a DRAFT import inward |
| R8 | **Bill of Entry number and date are mandatory** to Approve an Import inward |
| R9 | Expense fields may be left blank; blank is treated as **0** when saving or approving |
| R10 | **Import IGST** is recorded for ITC tracking and is **not** inventoriable (does not increase stock cost) |
| R11 | Other listed import charges are **inventoriable** and spread onto lines by **value weight** (see §5) |
| R12 | After Approve, inward status is **Received**; warehouse stock uses **landed unit cost** in INR |
| R13 | Approve cannot be undone from the normal user journey |

---

## 4. Recommended sample data (Import path)

Use the same numbers in §6 worked example so results can be cross-checked.

| Item | Sample value |
| --- | --- |
| Supplier name | e.g. Overseas Solar Exports LLC |
| Supplier country | United States (or any non-India) |
| Supplier currency | USD |
| Ship-to warehouse | India warehouse (e.g. GOTA) |
| Exchange rate | **83.50** (INR per 1 USD) |
| Line 1 | Product A (LOT), Qty **100**, Rate **USD 95.00** |
| Line 2 | Product B (LOT), Qty **10**, Rate **USD 420.00** |
| BOE number | BOE-TEST-2026-001 |
| BOE date | Any valid date (receipt day is fine) |
| BCD | ₹125,000 |
| Freight | ₹85,000 |
| Import IGST | ₹210,000 |
| Other expense fields | Leave blank |

---

## 5. Landed cost — BA rules and formulas

### 5.1 Definitions

| Term | Meaning |
| --- | --- |
| FC rate | Price per unit on the PO in foreign currency |
| Exchange rate (FX) | INR per 1 FC |
| PO INR rate | FC rate × FX (= purchase value per unit in INR before import charges) |
| Line base INR | Accepted qty × PO INR rate |
| Inventoriable charges | Customs / logistics costs that **increase** inventory cost |
| Non-inventoriable (ITC) | Import IGST — recorded but **excluded** from landed / stock cost |
| Allocated charges | Share of inventoriable total assigned to one line |
| Landed line INR | Line base INR + allocated inventoriable charges |
| Landed unit INR | Landed line INR ÷ accepted qty |

### 5.2 Expense types

| Expense | Inventoriable? | Effect on stock cost |
| --- | --- | --- |
| Basic Customs Duty (BCD) | Yes | Yes |
| Social Welfare Surcharge (SWS) | Yes | Yes |
| Anti-Dumping Duty | Yes | Yes |
| CHA Service Charges | Yes | Yes |
| Freight Charges | Yes | Yes |
| Insurance | Yes | Yes |
| Port Charges | Yes | Yes |
| Transportation | Yes | Yes |
| Other Charges | Yes | Yes |
| **Import IGST** | **No (ITC)** | **No** — capture only |

### 5.3 Formulas

**Step A — PO INR rate (per line)**

```
PO INR rate = FC rate × Exchange rate
```

**Step B — Line base INR**

```
Line base INR = Accepted quantity × PO INR rate
```

**Step C — Charge totals**

```
Inventoriable total = sum of all inventoriable expense amounts (blank = 0)
ITC total          = Import IGST amount (blank = 0)
Charges total      = Inventoriable total + ITC total
```

**Step D — Value-weighted allocation (inventoriable only)**

```
Line share of inventoriable =
  Inventoriable total × (This line base INR ÷ Sum of all lines’ base INR)
```

(Last line receives any rounding residue so the sum of allocations equals inventoriable total.)

**Step E — Landed amounts**

```
Landed line INR  = Line base INR + Allocated inventoriable
Landed unit INR  = Landed line INR ÷ Accepted quantity
Landed total INR = Sum of landed line INR across lines
```

**Important:** Import IGST never appears in landed line / landed unit / inventoriable totals for stock.

---

## 6. Worked example (verify on Approve summary)

**Given**

| Line | Qty | FC rate (USD) | FX | PO INR rate | Line base INR |
| --- | ---: | ---: | ---: | ---: | ---: |
| Product A | 100 | 95.00 | 83.50 | 7,932.50 | **793,250.00** |
| Product B | 10 | 420.00 | 83.50 | 35,070.00 | **350,700.00** |
| **Sum of bases** | | | | | **1,143,950.00** |

**Expenses entered**

| Expense | Amount (INR) | Inventoriable? |
| --- | ---: | --- |
| BCD | 125,000 | Yes |
| Freight | 85,000 | Yes |
| Import IGST | 210,000 | No (ITC) |
| All others | blank → 0 | — |

```
Inventoriable total = 125,000 + 85,000 = 210,000.00
ITC total           = 210,000.00
Charges total       = 420,000.00
```

**Allocation**

| Line | Base INR | Weight | Allocated inventoriable | Landed line | Landed unit |
| --- | ---: | ---: | ---: | ---: | ---: |
| A | 793,250.00 | 793,250 ÷ 1,143,950 | **145,620.44** | **938,870.44** | **9,388.70** |
| B | 350,700.00 | remainder (rounding) | **64,379.56** | **415,079.56** | **41,507.96** |
| **Total** | **1,143,950.00** | | **210,000.00** | **1,353,950.00** | |

How Line A allocation is derived:

```
210,000 × (793,250 ÷ 1,143,950) = 145,620.44
Line B allocation = 210,000 − 145,620.44 = 64,379.56
```

Check: inventoriable allocations sum to ₹210,000. Import IGST ₹210,000 appears only under ITC — **not** inside landed total ₹1,353,950.

**BA expectation on Approve summary**

- Inventoriable charges = ₹210,000.00  
- ITC (non-inventoriable) = ₹210,000.00  
- Landed total (INR) = ₹1,353,950.00  
- Line A landed / unit = ₹9,388.70; Line B = ₹41,507.96  

After Approve, stock cost for these receipts should reflect these **landed unit** figures (not the plain PO INR rate alone, and not including IGST).

---

## 7. Test scenarios

Mark each case **Pass / Fail** in the last column. Attach screenshots of Approve summary when testing calculations.

### TS-01 — Create foreign supplier

**Objective:** Master data supports Import classification.

| Step | Action | Expected result | Pass / Fail |
| ---: | --- | --- | --- |
| 1 | Open Suppliers → Create | Create supplier form opens | |
| 2 | Enter name, set **Country** = non-India (e.g. United States), **Currency** = USD (or matching FC) | Country and currency saved | |
| 3 | Save supplier | Supplier appears in list with foreign country and currency | |
| 4 | Open supplier detail | Country / currency visible for use on PO | |

**Sample data:** See §4.

---

### TS-02 — Create and approve Import Purchase Order

**Objective:** PO is flagged Import; FX and dual amounts behave correctly; GST is 0.

| Step | Action | Expected result | Pass / Fail |
| ---: | --- | --- | --- |
| 1 | Purchase Orders → Create | Form opens | |
| 2 | Select foreign supplier (§4) and **India** ship-to warehouse | System treats PO as **Import**; currency = supplier currency; exchange rate field available | |
| 3 | Enter exchange rate **83.50** | FX stored as INR per 1 FC | |
| 4 | Add Line 1 & Line 2 per §4 (FC rates) | Lines accept FC rates; **GST shows 0** (or not applied as taxable GST) | |
| 5 | Review PO totals | Totals visible in **FC**; INR equivalents consistent with FC × FX | |
| 6 | Save PO (Draft) | PO saved; **Import** badge / indicator on list or detail | |
| 7 | Approve PO | Status **Approved**; PO eligible for inward | |

**Contrast — Domestic:** Same product with India supplier + India warehouse → no Import badge; line GST applies as usual; currency INR.

---

### TS-03 — Create Import PO Inward (Draft) — warehouse capture only

**Objective:** Warehouse records quantities (and serials/lot) without import costing fields.

| Step | Action | Expected result | Pass / Fail |
| ---: | --- | --- | --- |
| 1 | PO Inwards → Create Receipt | Form opens | |
| 2 | Select approved Import PO; warehouse defaults / matches ship-to | Import indicator visible; FX / currency for context | |
| 3 | Enter received / accepted qty for each line (full qty as in §4) | Quantities accepted within remaining PO qty | |
| 4 | For LOT lines enter lot remark if required; for SERIAL enter exact serial count | Validation prevents Save if serials incomplete | |
| 5 | Confirm **Shipping / Import Expense** sections are **not** on this create form | User is guided that BOE / charges are on Approve | |
| 6 | Save | Inward status **Draft**; receipt number generated | |

---

### TS-04 — Import Approve page — details, expenses, Save, Approve

**Objective:** BOE mandatory; blank expenses = 0; landed summary matches §6; Approve posts stock.

| Step | Action | Expected result | Pass / Fail |
| ---: | --- | --- | --- |
| 1 | From PO Inwards list, open **Approve** for the Draft Import receipt | Approve page opens with receipt header (PO, supplier, warehouse, Import, FX) | |
| 2 | Observe Import expense amount fields | Fields are **blank** (placeholder only), not pre-filled 0.00 | |
| 3 | Leave Approve **without** BOE number/date | System blocks approve; BOE required messages | |
| 4 | Enter BOE number & date; optional shipping (container, BL, etc.) | Fields accepted | |
| 5 | Enter BCD 125000, Freight 85000, Import IGST 210000; leave other expenses blank | Summary updates: inventoriable 210000; ITC 210000; landed total **1,353,950**; line landed units as in §6 | |
| 6 | Click **Save details** | Remains **Draft**; values retained on reload of Approve page | |
| 7 | Review Summary / landed-by-line | Matches §6 table (base, allocated, landed/unit, landed total) | |
| 8 | Optionally upload documents | Files listed under attachments | |
| 9 | Click **Approve** | Success; status **Received**; cannot casually undo | |
| 10 | Confirm stock / cost view for received items | Cost reflects **landed unit**, not FC×FX alone; IGST not in inventoriable cost | |

---

### TS-05 — Post-approval visibility (list & documents)

**Objective:** Business users can find the receipt and related documents.

| Step | Action | Expected result | Pass / Fail |
| ---: | --- | --- | --- |
| 1 | Open PO Inwards list | Receipt shows **Received**; Import badge if applicable | |
| 2 | Open inward detail / sidebar | BOE, shipping, charges, totals, line landed figures visible as applicable | |
| 3 | If documents were uploaded, open from inward | Document opens for viewing / download | |
| 4 | Open parent Purchase Order detail / sidebar | **Inward documents** (or equivalent) lists this receipt’s files | |

---

### TS-06 — Negative and Domestic contrast

| # | Case | Expected result | Pass / Fail |
| --- | --- | --- | --- |
| N1 | Import Approve without BOE | Blocked with clear validation | |
| N2 | Leave all expenses blank, only BOE filled, then Approve | Allowed; inventoriable = 0; landed total = sum of line base INR only (for §4 data → **1,143,950**) | |
| N3 | Domestic Draft inward → Approve page | **No** Import expense / BOE-required block; optional attachments + summary; Approve receives stock at normal PO rate + GST logic | |
| N4 | Attempt to use Domestic “confirm only” shortcut for Import | Import must go through Import Approve / post with BOE path | |

---

## 8. Domestic contrast (short)

| Topic | Import | Domestic |
| --- | --- | --- |
| Trigger | Supplier country ≠ warehouse country | Both typically India |
| Currency / FX | Supplier FC + exchange rate | INR |
| Line GST | 0 on Import PO | GST % applies |
| Create inward | Qty + serials/lot only | Qty + serials/lot |
| Approve | BOE required; import expenses; landed summary | No BOE/import expenses; optional attachments + line/GST summary |
| Stock cost after Approve | **Landed unit INR** (base + inventoriable charges) | Normal domestic receipt cost (rate / GST handling as designed for domestic) |
| Import IGST | Captured as ITC, not in stock cost | Not applicable |

---

## 9. Calculation checklist (BA sign-off aid)

Use after TS-04 with §6 data (or substitute your own and recompute with §5 formulas).

| Check | Expected (sample §6) | Actual | Pass / Fail |
| --- | --- | --- | --- |
| PO INR rate Line A | 95 × 83.50 = 7,932.50 | | |
| Line A base INR | 100 × 7,932.50 = 793,250.00 | | |
| Line B base INR | 10 × 35,070.00 = 350,700.00 | | |
| Sum of bases | 1,143,950.00 | | |
| Inventoriable total | 210,000.00 | | |
| ITC (Import IGST) | 210,000.00 | | |
| Allocated to A | 145,620.44 | | |
| Allocated to B | 64,379.56 | | |
| Landed unit A | 9,388.70 | | |
| Landed unit B | 41,507.96 | | |
| Landed total | 1,353,950.00 | | |
| IGST excluded from landed | Yes | | |

---

## 10. End-to-end journey map (functional)

```text
Foreign Supplier
      |
      v
Import PO (FC + FX, GST 0) --> Approve PO
      |
      v
PO Inward DRAFT (qty / serials / lot only)
      |
      v
Approve page: BOE + shipping + expenses + attachments + landed summary
      |  Save details (optional, stays Draft)
      v
Approve --> RECEIVED (stock at landed unit; IGST as ITC only)
      |
      v
View on Inward + Inward documents on parent PO
```

---

## 11. Sign-off

| Item | Entry |
| --- | --- |
| Tester name | |
| Role | |
| Test environment / tenant | |
| Test date | |
| Build / release label | |
| Sample PO number(s) | |
| Sample receipt number(s) | |
| TS-01 | Pass / Fail |
| TS-02 | Pass / Fail |
| TS-03 | Pass / Fail |
| TS-04 | Pass / Fail |
| TS-05 | Pass / Fail |
| TS-06 | Pass / Fail |
| Calculation checklist (§9) | Pass / Fail |
| **Overall result** | **Pass / Fail** |
| Defects / remarks | |
| Sign-off | |

---

## 12. Defect logging template (functional)

| Field | Entry |
| --- | --- |
| Scenario ID (e.g. TS-04) | |
| Step | |
| Expected | |
| Actual | |
| Screenshot / receipt # | |
| Severity (Blocker / Major / Minor) | |
| Recalc note (if amount mismatch) | Show BA formula vs screen figure |

---

*End of BA Functional Testing Document — Import PO / Inward / Landed Cost*
