# Default bank accounts (B2C vs B2B) — BA test guide

Short checklist for acceptance testing. No technical detail—only setup and what the business should see.

---

## Setup before testing

1. **Company profile** is saved with valid company information.
2. **Branches** — At least one company branch exists; one branch should be the company **default branch** if you test branch-specific behaviour.
3. **Bank details** — At least two **active** bank records are available (so you can switch defaults and compare results). Optionally link banks to specific branches.
4. **Sample data** — Have at least one **quotation** (with a branch, if you use branches), one **B2B sales quote**, and one **B2B sales order** (with fulfilment / warehouse context if your process uses it) ready to download or print as PDF.

---

## Business scenarios

### Company profile → Bank details

| # | Scenario | What to check |
|---|----------|----------------|
| 1 | **Mark B2C default only** | One account: “Default for B2C” on; “Default for B2B” off. Save succeeds; list shows **B2C** badge on that row. |
| 2 | **Mark B2B default only** | Another account: B2B on, B2C off. List shows **B2B** on that row. |
| 3 | **Same account, both defaults** | One account has both B2C and B2B on. Both badges appear; no error. |
| 4 | **Defaults per branch** | Two branches, different banks linked to each branch, each with its own B2C (and/or B2B) default. Changing branch on a bank row only affects defaults **for that branch’s group**, not the other branch. |
| 5 | **Cannot deactivate a default** | Try to deactivate/delete a row that still has B2C or B2B default. System should **refuse** until another account is set as default for that channel (and scope). |
| 6 | **Inactive bank** | Turn **Active** off while a default checkbox is on — save should be **blocked** until you either activate the account or clear the defaults. |

### Customer / quotation side (B2C)

| # | Scenario | What to check |
|---|----------|----------------|
| 7 | **Quotation PDF** | Open or download a quotation PDF. Bank block should match the **B2C default** for that quotation’s branch (or company-wide default when branch has no suitable bank). If no B2C default was ever set, you should still see **some** bank details when banks exist (fallback behaviour). |
| 8 | **Payment receipt** (if your team uses it) | Approved payment receipt PDF shows bank details consistent with **B2C** default rules for that order’s branch context. |

### B2B side

| # | Scenario | What to check |
|---|----------|----------------|
| 9 | **B2B sales quote PDF** | PDF includes a **Bank details** section when the company has a resolvable B2B default (or fallback). Fields (bank name, account, IFSC, etc.) match the expected account. |
| 10 | **B2B sales order PDF** | Bank section matches the **B2B default** for the order’s branch context (via warehouse / branch rules your operations already use). |

### After upgrade (existing customers)

| # | Scenario | What to check |
|---|----------|----------------|
| 11 | **Legacy default** | On an old tenant that had a single “default” bank before this change, that bank should still behave as default for **both** B2C and B2B until someone edits bank details and splits the flags. |

---

## Sign-off (BA)

Use this as a quick gate before release sign-off:

- [ ] Bank form: B2C and B2B default checkboxes save and reload correctly.  
- [ ] Table: badges show **B2C** / **B2B** (and legacy default still shows as B2C where applicable).  
- [ ] At least one **quotation PDF** verified.  
- [ ] At least one **B2B quote PDF** and one **B2B order PDF** verified.  
- [ ] Blocked deactivate / inactive rules verified once each.

---

*Document version: 1 — Default B2B/B2C company bank accounts.*
