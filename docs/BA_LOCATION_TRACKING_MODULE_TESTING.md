# Location Tracking — BA / UAT guide

Straight test guide for web (office) + mobile (field). No IT / server setup.

---

## 1. What it does

While **on duty**, field staff share GPS (capture interval). Office can:

- **Live Map** — who is Live / Stale / **Location off** / **No fix**; filter On duty / Off duty; open Google Maps
- **Timesheet** — clock-in/out, hours vs planned, flags, CSV; **Force punch out** if phone is lost
- **Tracking Reports** — day route + coverage (including **today** after refresh)
- **Tracking Settings** — company on/off, intervals, working hours

**Hard gate to track:** company ON → user ON → mobile consent → **Start duty** → location permission. Working hours (and grace) are settings context for policy/UAT hours cases — not a substitute for checking Live Map status.

### One-device rule (anti-cheat)

- Duty binds to the **install** on that phone (not SIM/IMEI).
- If duty is **Active** on Phone A, the same user **cannot log in** on Phone B until A stops duty or office uses **Force punch out**.
- Same phone can log out / log in again while on duty.
- Wrong-device GPS pings still save, but flag **Device changed**.

### Mobile sync (no manual Sync button)

- Phone **captures** GPS on the **capture interval** (default 5 min) into a local queue.
- When online, each capture tick **uploads** the queue to the API soon after (looks near-direct). Offline rows stay queued and retry later.
- **Sync interval** (default 10 min) is mainly for Live Map **STALE** age math and labels — it is **not** a “wait this long then upload” timer.
- **Stop duty** always uploads any remaining queue first (queue depth → 0 when online).
- There is **no** “Sync queue now” button.

---

## 2. Screens

| Where | Screen | Use for |
|-------|--------|---------|
| Web | Live Map | Live pins + On/Off duty filters |
| Web | Tracking Logs | Raw GPS pings + Duty/Device timeline; advanced filters; CSV; optional map page |
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

**C — Roles:** Grant Live / Tracking Logs / Timesheet / Reports / Settings as needed  

---

## 4. Happy path (one pass)

| # | Who | Action | Expected |
|---|-----|--------|----------|
| 1 | Web | Settings ON + user tracking ON | Saved |
| 2 | Mobile | Login → consent → **Start duty** | Duty Active; FG notification |
| 3 | Mobile | Wait ≥1 **capture** interval | Queue drops when online; Logs show ping |
| 4 | Web | Live Map → On duty | User pin + on duty |
| 5 | Web | Timesheet today | Clock-in; On duty now ≥ 1 |
| 6 | Mobile | **Stop duty** | Queue 0; clock-out on Timesheet |
| 7 | Web | Reports today + CSV export | Route/summary when pings exist; CSV downloads |
| 8 | Web | Tracking Logs → Quick presets/tabs + Filters panel + Open map | Rows load; chips/reset work; map page shows trail; Google Maps deep link works |

---

## 5. Test cases

Mark Pass / Fail / Blocked.

### Config & roles

| ID | Scenario | Expected |
|----|----------|----------|
| LT-01 | Company ON / OFF | ON tracks; OFF stops useful tracking |
| LT-02 | Sync &lt; capture | Save blocked |
| LT-03 | User enable / disable | Duty screen follows user flag |
| LT-04 | Menus by role | Live / Tracking Logs / Timesheet / Reports / Settings match grants |

### Tracking Logs

| ID | Scenario | Expected |
|----|----------|----------|
| LT-L01 | Open Tracking Logs (SuperAdmin) | Menu visible; page loads without map |
| LT-L02 | Mode switch GPS ↔ Duty & Device | Columns and API switch; URL `mode` updates |
| LT-L03 | Quick date presets (Today / Last 7D / Last 30D / …) | From/to update; max 31 days; active preset highlighted |
| LT-L03a | Date range + user MultiSelect via Filters panel Apply | Filtered rows; max 31 days enforced |
| LT-L04 | Quick tabs GPS: All / Mocked / Outside hours / Within hours | Ping list respects quick filter |
| LT-L04a | Advanced filters (source / accuracy + same flags) | Collapsible panel Apply updates list |
| LT-L05 | Quick tabs Duty: All / Sessions / Device events | Timeline respects quick filter |
| LT-L05a | Duty advanced (event type / device id) | Panel Apply updates timeline |
| LT-L05b | Removable filter chips + Clear all / Reset | Chip removes one key; Reset returns Last 7D |
| LT-L06 | Sort + pagination | Server sort/page works |
| LT-L07 | Export CSV (both modes) | File downloads with current filters |
| LT-L08 | Open map (filters / row / selected) | `/location-tracking/logs/map` shows Leaflet trail; Back restores filters |
| LT-L09 | Open in Google Maps (point / route) | New tab deep link; no API key |
| LT-L10 | Role without Logs grant | Menu hidden; API 403 |
| LT-L11 | Retention note | Dates older than retention may show empty raw pings |

### Mobile duty

| ID | Scenario | Expected |
|----|----------|----------|
| LT-10 | Consent first | Must agree before Start duty |
| LT-11 | Start duty | Active + FG + server clock-in |
| LT-12 | Stop duty | Stopped; Off duty on Live |
| LT-13 | Capture upload + Stop flush | Capture ticks drain queue when online; Stop → depth **0** |
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
| LT-16 | Filters Live / Stale / Location off / No fix + On/Off duty | List matches |
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

### Working hours refresh (mid-duty)

Requires local QA: `LOCATION_TRACKING_QA_FAST=true` and optional `LOCATION_TRACKING_QA_CAPTURE_SECONDS=15`. Mobile polls `GET /location-tracking/policy` while on duty (≈60s in QA).

| ID | Scenario | Expected |
|----|----------|----------|
| LT-H01 | QA on; Start duty inside hours | FG / Duty screen shows capture **15s** (or configured seconds) |
| LT-H02 | Wait ~2 min on duty | Pings appear on Live/Reports after sync |
| LT-H10 | Window covers now; Start duty | Captures every ~15s |
| LT-H11 | Mid-duty: shorten end to past; Save settings | Within ≤1 policy poll: **new captures stop** |
| LT-H12 | Mid-duty: extend end to future; Save | Within ≤1 poll: captures **resume** (no Stop/Start) |
| LT-H13 | Force-stop app → reopen | Policy refreshes on resume |
| LT-H14 | Ping `is_within_working_hours` vs Asia/Kolkata | Matches tenant timezone |
| LT-H20 | grace=0; end = now+1 min; wait past end | Captures stop at end (±1 tick) |
| LT-H21 | grace=15; end = now | Captures continue ~15 min then stop |
| LT-H22 | Disable today (Off); on duty | No new captures |
| LT-H30 | Start/Stop + Stop flush | Queue 0; Timesheet clock-out |
| LT-H31 | Live Map On duty | Pin updates after sync |
| LT-H32 | Company OFF mid-duty | New tracking stops after policy refresh |
| LT-H33 | QA flag off | Intervals back to minutes |

---


## 5b. GPS % vs Location off (common BA doubt)

**Do not confuse Live Map with Timesheet / Reports coverage.**

| Screen | Question it answers |
|--------|---------------------|
| **Live Map** | Is GPS **fresh / off right now**? (LIVE / STALE / Location off / No fix) |
| **Timesheet GPS %** / **Reports Coverage %** | How **complete** sampling was for **trackable duty time** that day |

**Coverage formula (day summary):**  
`pings ÷ expected pings` (capped at 100%).  
**Expected** uses **duty minutes minus location-off gap minutes**, at the user’s capture interval.

### Why GPS % can stay ~100% after turning location off

Turning phone location **off** does **not** mean coverage must become **0%**.

- If every expected ping **before** the outage was already received, coverage can stay **near 100%**.
- When a **location-off gap** is recorded, trackable minutes shrink, so **expected** can drop — coverage of the trackable portion often stays high.
- What **should** change: Live → **Location off** (preferred) or **STALE** if gaps never uploaded; **Logs** stop getting new pings.

| Check | Pass signal |
|-------|-------------|
| Live Map (still on duty) | **Location off** or **STALE** with Age rising — not stuck **LIVE** |
| Tracking Logs | No new pings after location off |
| Timesheet / Reports today | High / ~100% GPS or Coverage is **OK** if Live + Logs match above |

### Test scenarios — GPS off mid-duty

Mark Pass / Fail / Blocked. Capture interval default is 5 min (use QA fast intervals if IT provides them). Live Map polls about every **2 minutes**.

| ID | Steps | Expected | Fail if |
|----|-------|----------|---------|
| LT-GPS-01 | On duty, GPS **on**, wait ≥1 capture, open Live | **LIVE** (or **STALE** only if Age already past stale threshold) | Stuck **No fix** while GPS is on and duty is Active |
| LT-GPS-02 | Still on duty, turn **phone location off**, wait ≥1 capture + Live poll (~2 min) | Live = **Location off** (preferred) **or** **STALE** with Age rising; no new Logs pings | Still **LIVE** with Age not rising |
| LT-GPS-03 | Same session: open Timesheet + Reports for **today** | GPS % / Coverage may still be **high / ~100%** — **Pass** if LT-GPS-02 Live/Logs expectations hold | Treating “must be 0%” as a defect without checking Live Map |
| LT-GPS-04 | Turn location **on** again mid-duty, wait ≥1 capture | Live returns **LIVE**; new Logs pings appear | Stays Location off forever while GPS is on |
| LT-GPS-05 | Optional: force-stop app mid-duty (OS kill) so no gap uploads | Live **STALE** / silence; coverage may **drop** later as expected grows without pings | — Document only; gaps need the FG service alive |

**BA one-liner:** GPS % is day coverage of expected samples, not a live “GPS is on” light. Location off belongs on **Live Map**.

---

## 6. Field meanings (short)

| Term | Meaning |
|------|---------|
| LIVE | On duty; GPS fix from this session; Age within stale threshold |
| STALE | On duty; last ping older than threshold (sync + capture + sync; defaults ~25 min) |
| Location off | On duty; phone reported GPS/location services outage (open gap synced) |
| No fix | On duty; no GPS pin for **this** duty session yet |
| On / Off duty | Open duty session (separate from LIVE/STALE) |
| Coverage % / GPS % / Pings / Distance | Day GPS **completeness** on Reports / Timesheet — **not** “GPS is on right now” (see §5b) |
| Flags | Active, Weak GPS, Not started, Late start, Left open, **Device changed**, **Forced out** |
| Force punch out | Office closes stuck open duty so another phone can log in |

**Live vs Reports vs Timesheet:** Live = latest GPS status + duty. Reports = day coverage summary (refresh for today). Timesheet = attendance; GPS % can stay high after location off if sampling before the outage was complete.

---

## 7. Sign-off

| Item | Value |
|------|--------|
| Environment | Test |
| Tester / Date | |
| Happy path ( §4 ) | Pass / Fail |
| GPS off scenarios ( §5b LT-GPS-01…05 ) | Pass / Fail / N/A |
| Critical fails (IDs) | |
| Notes | |

---

## Out of scope (do not block UAT)

- Server env / deploy / QA harness (IT)
- Google Maps billing (product opens public Maps links)
- Building the **Solar CRM QA** APK (`solarcrm_techhind.app.qa`) — IT supplies it
- Payroll / overtime (Timesheet is attendance + GPS context only)
