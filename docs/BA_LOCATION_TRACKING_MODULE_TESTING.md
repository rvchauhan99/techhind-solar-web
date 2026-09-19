# Location Tracking — BA / UAT guide

Straight test guide for web (office) + mobile (field). No IT / server setup.

---

## 1. What it does

While **on duty** in **working hours**, field staff share GPS. Office can:

- **Live Map** — who is Live / Stale / No data; filter On duty / Off duty; open Google Maps
- **Timesheet** — clock-in/out, hours vs planned, flags, CSV; **Force punch out** if phone is lost
- **Tracking Reports** — day route + coverage (including **today** after refresh)
- **Tracking Settings** — company on/off, intervals, working hours

**Tracking runs only when all are true:** company ON → user ON → mobile consent → **Start duty** → location permission → within working hours (or grace).

### One-device rule (anti-cheat)

- Duty binds to the **install** on that phone (not SIM/IMEI).
- If duty is **Active** on Phone A, the same user **cannot log in** on Phone B until A stops duty or office uses **Force punch out**.
- Same phone can log out / log in again while on duty.
- Wrong-device GPS pings still save, but flag **Device changed**.

### Mobile sync (no manual Sync button)

- Locations upload on the **sync interval** while on duty.
- **Stop duty** always uploads any remaining queue first (queue depth → 0 when online).
- There is **no** “Sync queue now” button.

---

## 2. Screens

| Where | Screen | Use for |
|-------|--------|---------|
| Web | Live Map | Live pins + On/Off duty filters |
| Web | Timesheet | Attendance, flags, CSV, Force punch out |
| Web | Tracking Reports | Day route + coverage |
| Web | Tracking Settings | Company switch, intervals, hours |
| Web | User Master | Enable tracking per user |
| Mobile | Duty Gate | Consent + Start duty prompts |
| Mobile | Duty Tracking | Consent, Start/Stop, status + queue depth |
| Mobile | My Timesheet | Today + recent duty history |

Hub badge **Duty off** = consented, in hours, not clocked in.

---

## 3. Configure once (before UAT)

**A — Tracking Settings:** Enable ON · Duty gate ON · capture/sync (sync ≥ capture) · working hours cover test time · Save  

**B — User Master:** Enable location tracking for each field tester · Save  

**C — Roles:** Grant Live / Timesheet / Reports / Settings as needed  

---

## 4. Happy path (one pass)

| # | Who | Action | Expected |
|---|-----|--------|----------|
| 1 | Web | Settings ON + user tracking ON | Saved |
| 2 | Mobile | Login → consent → **Start duty** | Duty Active; FG notification |
| 3 | Mobile | Wait ≥1 sync interval | Queue drops when online |
| 4 | Web | Live Map → On duty | User pin + on duty |
| 5 | Web | Timesheet today | Clock-in; On duty now ≥ 1 |
| 6 | Mobile | **Stop duty** | Queue 0; clock-out on Timesheet |
| 7 | Web | Reports today + CSV export | Route/summary when pings exist; CSV downloads |

---

## 5. Test cases

Mark Pass / Fail / Blocked.

### Config & roles

| ID | Scenario | Expected |
|----|----------|----------|
| LT-01 | Company ON / OFF | ON tracks; OFF stops useful tracking |
| LT-02 | Sync &lt; capture | Save blocked |
| LT-03 | User enable / disable | Duty screen follows user flag |
| LT-04 | Menus by role | Live / Timesheet / Reports / Settings match grants |

### Mobile duty

| ID | Scenario | Expected |
|----|----------|----------|
| LT-10 | Consent first | Must agree before Start duty |
| LT-11 | Start duty | Active + FG + server clock-in |
| LT-12 | Stop duty | Stopped; Off duty on Live |
| LT-13 | Auto sync + Stop flush | Interval drains queue; Stop → depth **0** |
| LT-14 | Location denied | Start fails / no useful Live pin |
| LT-14a | My Timesheet | Matches Active / clock-out |
| LT-14b | Logout on duty | Server session closed |

### Device binding

| ID | Scenario | Expected |
|----|----------|----------|
| S-D1 | On duty on A → login on B | Blocked; no tokens |
| S-D2 | Stop on A → login B → Start | OK; B becomes bound device |
| S-D3 | Re-login same phone while on duty | OK |
| S-D4 | Ping from other device_id | Saved + **Device changed** flag/audit |
| S-D5 | After Start | Session stores device + start IP (Timesheet detail) |
| S-D6 | Force punch out → login B → Start | OK on new phone |

### Live Map / Reports / Timesheet

| ID | Scenario | Expected |
|----|----------|----------|
| LT-15 | Live Map streets + pin after sync | Map + user visible |
| LT-16 | Filters Live/Stale/No data + On/Off duty | List matches |
| LT-17 | Google from list / popup | Maps opens at point |
| LT-18 | Reports today (refresh) | Summary/route when pings exist — do not wait until tomorrow |
| LT-19 | Timesheet clock-in/out, flags, CSV | Correct; file downloads |
| LT-20 | **Force punch out** | Session closes; flag **Forced out**; new device can Start |

### Edge

| ID | Scenario | Expected |
|----|----------|----------|
| LT-29 | No consent | No reliable Live pin |
| LT-30 | Outside working hours | Little/no in-hours GPS |
| LT-31 | Company OFF mid-duty | New tracking stops |

---

## 6. Field meanings (short)

| Term | Meaning |
|------|---------|
| Live / Stale / No data | GPS freshness on Live Map |
| On / Off duty | Open duty session (not the same as Live) |
| Coverage % / Pings / Distance | Day GPS completeness on Reports |
| Flags | Active, Weak GPS, Not started, Late start, Left open, **Device changed**, **Forced out** |
| Force punch out | Office closes stuck open duty so another phone can log in |

**Live vs Reports vs Timesheet:** Live = latest GPS + duty. Reports = day summary (refresh for today). Timesheet = attendance even with weak GPS.

---

## 7. Sign-off

| Item | Value |
|------|--------|
| Environment | Test |
| Tester / Date | |
| Happy path ( §4 ) | Pass / Fail |
| Critical fails (IDs) | |
| Notes | |

---

## Out of scope (do not block UAT)

- Server env / deploy / QA harness (IT)
- Google Maps billing (product opens public Maps links)
- Building the **Solar CRM QA** APK (`solarcrm_techhind.app.qa`) — IT supplies it
- Payroll / overtime (Timesheet is attendance + GPS context only)
