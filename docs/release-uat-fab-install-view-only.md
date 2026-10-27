# Release & UAT — Fabrication & Installation View Access

**Release date:** 27 Oct 2026  
**Scope:** Confirmed Order → Fabrication and Installation tabs

---

## What changed

Users who can open a confirmed order can now **see** Fabrication and Installation details even if they are not allowed to fill or complete those stages.

- **Before:** Screen showed only a permission warning (blank form).
- **After:** Full stage form is visible in **view only** (fields locked; Save / Complete hidden).

Who can still **edit / complete** is unchanged: warehouse manager of the planned warehouse, or the assigned fabricator / installer.

---

## Functional flow

1. Open **Confirm Orders** → open an order that has Fabrication / Installation.
2. Open the **Fabrication** tab.
3. Open the **Installation** tab.
4. If you are **not** the warehouse manager / assigned person:
   - You see a short “View only” message.
   - You can read dates, checklist, photos, serials, and other filled data.
   - You cannot save or complete.
5. If you **are** the warehouse manager / assigned person:
   - Same screens as today — you can edit, save, and complete as before.

---

## UAT checklist

| # | Role / user | Steps | Expected |
|---|-------------|--------|----------|
| 1 | User with order access, **not** warehouse manager / not assigned fabricator or installer | Open order → Fabrication | Form data visible; “View only”; no Save / Complete |
| 2 | Same user | Open Installation | Form / serials / photos visible; “View only”; no Save / Complete |
| 3 | Warehouse manager of planned warehouse **or** assigned fabricator | Fabrication | Can edit, Save, and Complete (same as before) |
| 4 | Warehouse manager **or** assigned installer | Installation | Can edit, Save, and Complete / Submit for approval (same as before) |
| 5 | Closed / cancelled order (any viewer) | Fabrication & Installation | Remains read-only as today |

**Pass:** Cases 1–2 show data (not a blank warning-only page). Cases 3–4 still allow fill/complete.  
**Fail:** Viewers still see only a warning with no form, or non-managers can save/complete.
