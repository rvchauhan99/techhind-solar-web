# Location Tracking module — BA / UAT testing guide

Functional guide for configuring and testing Location Tracking end to end (web office screens + mobile duty tracking). Written for BA / UAT — no developer or server setup steps.

---

## 1. What this module does

Field staff can share their location while **on duty** during company **working hours**. The office can:

- See who is **Live**, **Stale**, or has **No data** on a **Live Map**
- Filter Live Map by **On duty / Off duty** (duty clock is separate from GPS “Live”)
- Open a person’s current position in **Google Maps**
- Review **duty attendance** on **Timesheet** (clock-in/out, hours vs planned, flags, CSV)
- Review **day routes** and daily GPS coverage on **Tracking Reports** (including **today**, after a refresh)
- Open a full day’s route (or last point) in **Google Maps**
- Export daily summary and timesheet CSV

Tracking only runs when **all** of these are true:

1. Company tracking is **enabled** (Tracking Settings)
2. The user is **enabled for tracking** (User Master)
3. The user has accepted **consent** on the mobile app
4. The user has pressed **Start duty** on the mobile app
5. The phone has location permission, and the time is within (or near) working hours

---

## 2. Lifecycle at a glance

```mermaid
flowchart LR
  companyOn[Company tracking ON] --> userOn[User tracking ON]
  userOn --> consent[Mobile consent]
  consent --> startDuty[Start duty]
  startDuty --> liveMap[Live Map pin + on duty]
  startDuty --> timesheet[Timesheet clock-in]
  liveMap --> reports[Reports day route same day]
  reports --> googleMaps[View on Google Maps]
```

### Status meanings (Live Map)

| Status / filter | Meaning |
|-----------------|---------|
| **Live** | Recent location received — person appears “online” on the map |
| **Stale** | Person is tracked, but last location is older than expected (missed syncs or stopped moving updates) |
| **No data** | Tracking is allowed for the user, but no location has been received yet (or never started duty / no consent) |
| **On duty** | Server duty session is open (Start duty pressed; not yet Stop duty) |
| **Off duty** | No open duty session — may still show LIVE if the last GPS ping is recent |

---

## 3. Screens map

### Web (office)

| Menu name | Path | Use when |
|-----------|------|----------|
| Live Map | Location Tracking → **Live Map** | See people on the map right now; filter **On duty / Off duty**; open Google Maps for a point |
| Timesheet | Location Tracking → **Timesheet** | Duty clock-in/out, hours vs planned, flags, CSV export |
| Tracking Reports | Location Tracking → **Tracking Reports** | Day-by-day GPS coverage, distance, and route of day |
| Tracking Settings | Location Tracking → **Tracking Settings** | Company master switch, intervals, working hours, duty gate |
| User Master | Settings / User Master → edit user | Turn tracking on for a person; optional interval overrides |
| Role Master | Role / module permissions | Decide which roles see Live / Timesheet / Reports / Settings |

### Mobile (field)

| Screen | Use when |
|--------|----------|
| **Duty Gate** (after login / splash when pending) | Full-screen consent and/or **Start duty** during working hours |
| **Duty Tracking** (hub card when tracking is enabled) | Accept consent, Start / Stop duty, Sync queue; shows server clock-in time |
| **My Timesheet** (hub card) | Today + last 30 days duty hours, GPS coverage, session list |

If tracking is **not** enabled for the account, the mobile Duty screens are hidden / show not enabled.

Hub badge **Duty off** (amber) appears on Duty Tracking when the user is consented, within working hours, and not clocked in.

---

## 4. Platform configuration (do this before testing)

Configure in this order.

### Step A — Tracking Settings (company)

Open **Location Tracking → Tracking Settings**.

| Setting | What it means | Typical test value |
|---------|---------------|--------------------|
| **Enable location tracking for this tenant** | Master switch for the whole company | **ON** |
| **Duty gate on mobile** | Splash/post-login consent + Start duty prompts | **ON** (default) |
| **Auto-close stale open duty sessions (hours)** | Server closes forgotten open clock-ins | `16` |
| **Default capture interval (min)** | How often the phone samples GPS | `5` (allowed range roughly 1–60) |
| **Default sync interval (min)** | How often the phone uploads locations | `10` (must be **≥** capture; floor is usually 5) |
| **Min accuracy (m)** | Ignore very inaccurate GPS fixes | `150` |
| **Working-hours grace (min)** | Soft buffer before/after working hours | `15` |
| **Raw ping retention (days)** | How long detailed location history is kept | `365` |
| **Timezone** | Used for working hours and “day” on reports | `Asia/Kolkata` |
| **Working hours** | Per weekday: On + Start / End times | e.g. Mon–Sat 09:30–18:30; Sun off |

**Rules to remember**

- If the company switch is **OFF**, User Master will not treat users as trackable for operations, and mobile will not track.
- **Sync interval must be greater than or equal to capture interval.**
- Capture below 5 minutes may show a warning (more battery / more data) — still allowed if intentional.
- For UAT outside normal office hours, temporarily widen working hours (or turn on the day you are testing) so Start duty can collect locations.

Click **Save**. Confirm the subtitle still shows how many users are flagged for tracking after you enable users (Step B).

### Step B — User Master (per person)

Open **User Master** → edit a field user (e.g. Field Tech).

| Setting | What it means |
|---------|---------------|
| **Enable location tracking for this user** | This person may be tracked |
| **Capture interval** (optional) | Leave blank to use company default; or set a personal value |
| **Sync interval** (optional) | Leave blank to use company default; must still be ≥ capture |

Save the user.

Repeat for each person you want on Live Map during UAT.

### Step C — Role permissions (who sees which screens)

Super Admin typically already sees all Location Tracking menus.

For other office roles (manager, ops):

| Module / screen | Grant so they can… |
|-----------------|--------------------|
| **Live Map** | Open Live Location Map |
| **Timesheet** | Open duty attendance dashboard / export |
| **Tracking Reports** | Open GPS reports, day route, export |
| **Tracking Settings** | Change company tracking settings (usually admins only) |

Users **without** Live Map permission should not see that menu (or should be blocked from the page).

Mobile Duty screen is based on **user tracking enabled**, not on Live Map role permission.

---

## 5. Pre-test checklist

| # | Check | Ready? |
|---|--------|--------|
| 1 | Test web URL opens and you can log in (dedicated test — leave tenant key blank if asked) | ☐ |
| 2 | Test mobile APK installed (same test environment). Optional side-by-side build: **Solar CRM QA** (`solarcrm_techhind.app.qa`) can sit next to the store app | ☐ |
| 3 | Super Admin (or role with Settings + Live + Reports + **Timesheet**) available | ☐ |
| 4 | At least one field user account available for mobile | ☐ |
| 5 | Company Tracking Settings: **Enabled = ON**, working hours cover the test time | ☐ |
| 6 | Field user: **Location tracking enabled = ON** | ☐ |
| 7 | Phone: location permission allowed for TechHind app | ☐ |
| 8 | Phone has GPS / network; tester can move or stay outdoors briefly | ☐ |

---

## 6. End-to-end happy path

Use once per environment after configuration (section 4).

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Admin (web) | Tracking Settings → Enable ON → Duty gate ON → Save | Settings saved; no error |
| 2 | Admin (web) | User Master → enable tracking for field user → Save | User saved |
| 3 | Field (mobile) | Log in as that field user | Login success → **Duty Gate** if consent or Start duty pending |
| 4 | Field (mobile) | Accept consent (if shown) then **Start duty** | Duty Active; FG notification; server session open |
| 5 | Field (mobile) | Open **My Timesheet** | Today shows clock-in / Active / duty minutes |
| 6 | Field (mobile) | Wait at least one sync interval (or tap **Sync queue now**) | No persistent error snackbar |
| 7 | Admin (web) | Open **Live Map** → filter **On duty** → Refresh | Field user appears with **on duty** badge |
| 8 | Admin (web) | Open **Timesheet** → today range | Row shows clock-in; KPI On duty now ≥ 1 |
| 9 | Admin (web) | Click timesheet row → **Open day route** / Reports | Day route available when pings exist |
| 10 | Field (mobile) | **Stop duty** | Session closed; Timesheet shows clock-out |
| 11 | Admin (web) | Export Timesheet CSV | File downloads with duty columns |

---

## 7. Test cases (detailed)

Mark Pass / Fail / Blocked for each.

### Configuration

| ID | Scenario | Steps | Expected | Result |
|----|----------|-------|----------|--------|
| LT-01 | Company master ON | Settings → enable → Save → reopen page | Checkbox stays ON | |
| LT-02 | Company master OFF | Disable → Save | Tracking off; field users should not start meaningful tracking | |
| LT-03 | Interval validation | Set sync **lower** than capture → Save | Error / blocked; must fix sync ≥ capture | |
| LT-04 | Working hours day off | Turn Sunday (or today) **Off** → Save | That day treated as non-working for tracking hours | |
| LT-05 | User enable | User Master → enable tracking → Save | User can use Duty screen | |
| LT-06 | User disable | Disable tracking on user → Save | Mobile shows tracking not enabled; disappears from useful Live tracking | |

### Roles & menu

| ID | Scenario | Steps | Expected | Result |
|----|----------|-------|----------|--------|
| LT-07 | Super Admin menus | Log in as Super Admin | Sees Location Tracking → Live, Timesheet, Reports, Settings | |
| LT-08 | Role without Live | Role without Live Map permission | Live Map not available / blocked | |
| LT-09 | Role with Reports only | Grant Reports only | Can open Reports; cannot open Settings (if not granted) | |
| LT-09a | Role with Timesheet | Grant Timesheet module | Can open Timesheet; export if allowed | |

### Mobile duty

| ID | Scenario | Steps | Expected | Result |
|----|----------|-------|----------|--------|
| LT-10 | Consent required first | New tracked user opens Duty | Consent text + **I agree and continue** before Start duty | |
| LT-11 | Start duty | After consent → Start duty | Duty = Active; FG notification; server clock-in time shown | |
| LT-12 | Stop duty | Stop duty | Duty = Stopped; Live **Off duty**; location stops updating after a short time | |
| LT-13 | Sync queue | With Active duty → Sync queue now | Success message; queue depth drops toward 0 when online | |
| LT-14 | Location permission denied | Deny location in phone settings | Start duty fails or cannot get useful locations; Live stays No data / Stale | |
| LT-14a | My Timesheet | After Start duty → open My Timesheet | Today row shows Active / clock-in; after Stop duty shows clock-out | |
| LT-14b | Logout while on duty | Start duty → log out of app | Duty session is closed on server (not left open forever) | |

### Live Map

| ID | Scenario | Steps | Expected | Result |
|----|----------|-------|----------|--------|
| LT-15 | Map shows streets | Open Live Map | Map background (streets) visible — not a blank grey area only | |
| LT-16 | Pin for active user | After Start duty + sync | Pin on map; list shows user with age / battery when available | |
| LT-17 | Filters | Use Live / Stale / No data filters | List filters correctly; KPIs match | |
| LT-17a | On duty / Off duty | Start duty → filter **On duty**; Stop duty → filter **Off duty** | On-duty list shows the user while session open; Off duty after stop (may still be LIVE) | |
| LT-18 | Search | Search by name or email | Matching users only | |
| LT-19 | Focus on map | Click user row | Map focuses that user; popup can open | |
| LT-20 | Google from list | Click **Google** on a user with position | Google Maps opens at lat/long | |
| LT-21 | Google from popup | Open marker popup → **View on Google Maps** | Google Maps opens | |
| LT-22 | Refresh | Click Refresh | Poll time updates; data refreshes | |

### Timesheet (web)

| ID | Scenario | Steps | Expected | Result |
|----|----------|-------|----------|--------|
| LT-22a | Today attendance | Open Timesheet for today after Start duty | Row with clock-in; KPI **On duty now** ≥ 1 | |
| LT-22b | Clock-out | After Stop duty → Refresh | Clock-out filled; On duty now decreases | |
| LT-22c | Flags | Review Flags column | e.g. Active, Weak GPS, Not started, Late start — match situation | |
| LT-22d | Export CSV | Click Export CSV | File downloads with duty columns (clock in/out, minutes, flags) | |
| LT-22e | Open day route | Select a row that has GPS → open day route / Reports | Route available when pings exist | |

### Reports

| ID | Scenario | Steps | Expected | Result |
|----|----------|-------|----------|--------|
| LT-23 | Date range (incl. **today**) | Set From / To including today → load | Summary rows appear when pings exist (same-day rollup on open); or empty message if no GPS yet | |
| LT-24 | Day route | Click a summary row | Route of day panel + map path (if points exist) | |
| LT-25 | Google route | With trail loaded → **View route on Google Maps** | Google Maps directions / route opens | |
| LT-26 | Single point | Only one ping that day → **Open last point** | Google Maps opens that point | |
| LT-27 | Export | Export for the selected range | File downloads; opens in Excel/Sheets | |
| LT-28 | Totals | With data in range | Coverage %, pings, distance, mocked count look sensible | |
| LT-28a | Live vs Reports same day | Live pin present; open Reports for today | Reports shows ≥1 row after refresh (not “wait until tomorrow”) | |

### Negative / edge

| ID | Scenario | Steps | Expected | Result |
|----|----------|-------|----------|--------|
| LT-29 | No consent | Skip consent; try to rely on Live | No reliable Live pin until consent + Start duty | |
| LT-30 | Outside working hours | Set hours so “now” is outside; Start duty | Tracking may not collect useful in-hours points; reports may mark outside-hours behaviour | |
| LT-31 | Company OFF mid-test | Turn company OFF while duty was active | New tracking effectively stops for operations | |

---

## 8. Field meanings (quick reference)

### Tracking Reports

| Column / KPI | Plain meaning |
|--------------|---------------|
| **Coverage %** | How complete the day’s location samples were vs expected |
| **Pings** | Actual samples / expected samples |
| **Distance (km)** | Approximate travel distance from the day’s points |
| **First / Last** | First and last location time that day |
| **Max gap** | Longest quiet stretch between points |
| **Mocked** | Count of locations the device flagged as fake/mock GPS |

### Timesheet

| Column / KPI | Plain meaning |
|--------------|---------------|
| **Clock In / Out** | First Start duty / last Stop duty that day (server time) |
| **Duty minutes** | Total time on duty (all sessions that day) |
| **Planned** | Expected work minutes from company working hours |
| **Duty vs planned %** | Duty minutes as a share of planned |
| **Sessions** | How many Start/Stop cycles that day |
| **GPS % / Distance** | Same-day GPS coverage from Reports (when available) |
| **Flags** | Shortcuts such as Active, Weak GPS, Not started, Left open, Late start |
| **On duty now** (KPI) | How many people currently have an open duty session |

---

## 9. Same-day Reports vs Live Map (important)

| Screen | What it shows | Same-day behaviour |
|--------|---------------|--------------------|
| **Live Map** | Latest GPS position + on/off duty | Updates as soon as mobile syncs |
| **Tracking Reports** | Daily GPS summary + day route | Built when you open the page if today’s summary is missing. Refresh after a successful sync — do **not** wait until tomorrow. |
| **Timesheet** | Duty clock-in/out and hours | Independent of GPS summaries; shows attendance even before Reports has pings |

**Common confusion:** Live can show a pin while Reports still looks empty until you refresh Reports (same-day summary is created on open). Timesheet can show clock-in even with weak or zero GPS.

If IT needs to rebuild an older day’s summary, ask them to run the location-tracking rollup for that date (IT step — not part of BA click-path).

---

## 10. Full pledge QA matrix (S1–S11)

Use after configuration (section 4). For faster UAT, IT may enable a **QA harness** that returns **30-second capture** on the mobile policy and allows **1-minute sync**. Production stays in **minutes** only.

| ID | Surface | Case | Expected |
|----|---------|------|----------|
| S1 | Settings | Save intervals with sync ≥ capture (QA may allow sync floor 1); reopen; check profile / Duty screen shows fast capture when harness on | Saved; policy shows seconds when QA harness enabled |
| S2 | Mobile | Login → Duty Gate if needed → Start duty | FG running; notification shows capture interval |
| S3 | Mobile | Wait ≥2 sync windows or **Sync queue** | Queue drains; no stuck errors |
| S4 | API / Live | Live list for that user | LIVE + **on duty** |
| S5 | Data | Today’s raw pings | Count > 0 |
| S6 | Web Reports | Same date = today | ≥1 summary row; coverage/pings non-zero; open day route |
| S7 | Web Timesheet | Today range + CSV | Clock-in/out, duty minutes, flags; CSV downloads |
| S8 | Web Live | On duty / Off duty filters; Google deep-link | Filters work; Google opens |
| S9 | Mobile My Timesheet | Today | Matches server session |
| S10 | Negative | Stop duty | Live **off duty**; Reports still keep day’s pings |
| S11 | Rollup | Force rollup for yesterday | Reports show that day |

---

## 11. Sign-off

| Item | Value |
|------|--------|
| Environment | Test |
| Tester | |
| Date | |
| Happy path (section 6) | Pass / Fail |
| Full pledge S1–S11 (section 10) | Pass / Fail |
| Critical fails (IDs) | |
| Notes | |

---

## 12. Out of scope for BA (do not block UAT on these)

- Server environment variables and deployments (already handled by IT), including QA harness / force rollup commands
- Map provider accounts or Google Maps billing keys (View on Google Maps opens the public Google Maps website; no key in the product)
- Changing mobile build configuration / package names (IT may supply **Solar CRM QA** APK for side-by-side install)
- Permanent production capture unit change from minutes to seconds (QA harness only)
- Payroll / overtime engines (Timesheet is attendance + GPS context, not payroll)
