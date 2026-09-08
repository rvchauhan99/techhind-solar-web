# WhatsApp Manager — Payment Utility templates

Create these three templates in **your** Meta Business / WhatsApp Manager. Use this copy exactly.

---

## Open WhatsApp Manager

1. Go to [WhatsApp Manager](https://business.facebook.com/latest/whatsapp_manager)  
   Alternate: [https://business.facebook.com/wa/manage](https://business.facebook.com/wa/manage)
2. If Manager is not in the menu: **All tools** → **WhatsApp Manager**, or **Settings** → **Accounts** → **WhatsApp accounts** → open your number.
3. Switch the business selector (top left) to **your** business.
4. **Message templates** → **Manage templates** → **Create template**.

---

## Rules for all three

| Field | Required value |
|-------|----------------|
| Category | **Utility** (not Marketing, not Authentication) |
| Language | **English** with code **`en`**. Do not pick English (IND) / `en_IN` or English (US) / `en_US`. |
| Type of variable | **Number** (`{{1}}`, `{{2}}`, …) |
| Media | **None** |
| Header | Static **text** as given below — **do not** add a variable on the header |
| Buttons | None |
| Footer (optional) | `This is an automated payment notice.` (no variables) |

**Body rules (Meta will reject otherwise):**

- Do not start or end the body with a placeholder.
- A period after `{{n}}` is **not** enough. End with **words** (the copy below already does this).
- Do not use the ₹ symbol; use `INR`.
- Template **names** must match exactly (lowercase, underscores).

Create **three** templates only. Do **not** create `payment_escalation_plus`.

Path: **Create template** → Utility → Default → **Next**.

---

## Template 1 — `payment_reminder_soft`

**4** variables.

| Field | Value |
|-------|--------|
| Name | `payment_reminder_soft` |
| Header | `Payment reminder` |

**Body**

```text
Hello {{1}}, a balance of INR {{2}} is outstanding on order {{3}} with {{4}}. Please complete payment at your earliest convenience if not already paid.
```

| Placeholder | Meaning | Sample for review |
|-------------|---------|-------------------|
| `{{1}}` | Customer name | Rajesh |
| `{{2}}` | Outstanding amount | 15000 |
| `{{3}}` | Order number | SO-1001 |
| `{{4}}` | Company name | Acme Solar |

Submit for review.

---

## Template 2 — `payment_reminder_urgent`

**5** variables.

| Field | Value |
|-------|--------|
| Name | `payment_reminder_urgent` |
| Header | `Overdue payment notice` |

**Body**

```text
Hello {{1}}, the balance of INR {{2}} on order {{3}} is {{4}} days overdue. Please arrange payment with {{5}} as soon as possible if not already paid.
```

| Placeholder | Meaning | Sample for review |
|-------------|---------|-------------------|
| `{{1}}` | Customer name | Rajesh |
| `{{2}}` | Outstanding amount | 15000 |
| `{{3}}` | Order number | SO-1001 |
| `{{4}}` | Days overdue | 12 |
| `{{5}}` | Company name | Acme Solar |

Submit for review.

---

## Template 3 — `payment_escalation`

**4** variables. Register **once** (do not create a second escalation template).

| Field | Value |
|-------|--------|
| Name | `payment_escalation` |
| Header | `Payment escalation` |

**Body**

```text
Hello {{1}}, the balance of INR {{2}} on order {{3}} remains unpaid. This account has been escalated by {{4}}. Please contact us to resolve this immediately.
```

| Placeholder | Meaning | Sample for review |
|-------------|---------|-------------------|
| `{{1}}` | Customer name | Rajesh |
| `{{2}}` | Outstanding amount | 15000 |
| `{{3}}` | Order number | SO-1001 |
| `{{4}}` | Company name | Acme Solar |

Submit for review.

Wait until **Manage templates** shows **Approved** for all three. Pending is not enough. Rejected means the copy or category needs a fix.

---

## Checklist

- [ ] `payment_reminder_soft` — Utility, language `en`, Approved
- [ ] `payment_reminder_urgent` — Utility, language `en`, 5 variables, Approved
- [ ] `payment_escalation` — Utility, language `en`, Approved (only one)

---

## Troubleshooting

| Symptom | What to do |
|---------|------------|
| Category shows **Marketing** | Go **Previous**, choose **Utility**, then fill the body again. |
| Submit disabled / “Variables can't be at the start or end” | Body still ends on `{{n}}` or `{{n}}.`. Paste the bodies from this guide (they end with words). |
| Error `#132001` / template does not exist in that language | Language is not `en`. Recreate as English (`en`). |
| Wrong business selected | Switch the top-left business selector to **your** WhatsApp account, then create templates there. |
