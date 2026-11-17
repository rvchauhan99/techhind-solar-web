# Location Tracking — Duty Continuation & Live Visibility UAT (BA)

**Purpose:** Verify that field duty **continues after app logout**, that office **Live Map** stays honest for people on duty, and that **day / session history** keeps GPS points from Start through End.

**Audience:** BA / QA / Operations  

**Release focus:** 16 Nov 2026 duty-continuation and Live visibility changes (mobile + web).

**Out of scope for this document:** Server setup, deploy, database, security tokens, building the app. Full module baseline remains in [BA_LOCATION_TRACKING_MODULE_TESTING.md](./BA_LOCATION_TRACKING_MODULE_TESTING.md).

---

## 1. What changed (business)

| Before (wrong expectation) | Now (correct product rule) |
|----------------------------|----------------------------|
| Logging out of the app seemed to “close” the work day | **Only End Duty** (field) or **Force punch out** (office) ends duty |
| After logout, office might stop seeing useful updates | While **Duty Active**, the phone **keeps sharing location**; Live / Logs / Timesheet / Reports still update |
| On-duty person with no pin yet felt “missing” from CRM | Person stays on **On duty**; status shows **No fix** / list may show **Waiting** until the first good fix this duty |
| Waiting for “sync interval” before points appear | New points follow the **capture** interval when location is on and the phone is online |

```text
Start Duty → Duty Active (tracking runs)
     → App Logout → tracking still runs
     → End Duty or Force punch out → Duty Off (tracking stops)
```

---

## 2. Access needed

| Area | Who |
|------|-----|
| Mobile — Login, Consent, **Start / End Duty**, Duty Tracking screen, My Timesheet | Field tester |
| Web — **Live Map** | Office viewer |
| Web — **Tracking Logs** | Office viewer |
| Web — **Timesheet** (incl. **Force punch out**) | Office / supervisor |
| Web — **Tracking Reports** | Office viewer |
| Web — **Tracking Settings** + **User Master** (tracking enabled) | Admin (setup once) |

Use the **Solar CRM QA** app (or the build IT gave you for this UAT) and the **test** website IT provided. Do not use the Play Store production app for this pack unless IT says so.

---

## 3. Glossary (screen language)

| Label / term | Business meaning |
|--------------|------------------|
| **Start Duty** | Field punch-in; tracking may begin |
| **Duty Active** / On duty | Open work session; location sharing is expected |
| **End Duty** / Stop duty | Field punch-out; tracking for this session stops |
| **Force punch out** | Office closes a stuck open duty (e.g. lost phone) |
| **Logout** | Leaves the app login session; **does not** end duty |
| **Capture interval** | How often the phone should take a GPS sample (often 5 minutes) |
| **Sync interval** | Used mainly for **Stale** age wording on Live — **not** “wait this long before upload” |
| **LIVE** | On duty; fresh GPS from **this** duty |
| **STALE** | On duty; last GPS is older than the stale threshold |
| **Location off** | On duty; phone reported location services outage |
| **No fix** | On duty; no GPS pin for **this** duty yet |
| **Waiting** | List cue that the person is on duty but still waiting for a usable pin |
| **Tracking service** | On Duty Tracking screen: **Running** / **Stopped** while on duty |
| **Last sync this duty** | On Duty Tracking screen: when the last successful upload for this duty was |

---

## 4. Setup once (before scenarios)

**Preconditions (all scenarios unless a case says otherwise):**

1. **Tracking Settings:** Company location tracking **ON**; note the **capture** interval (and sync if shown). Working hours should cover the test clock time.
2. **User Master:** Location tracking **enabled** for the field tester.
3. Mobile: Tester can log in, give **consent**, and grant **location** permission.
4. Web: Tester role can open Live Map, Tracking Logs, Timesheet, and Reports.
5. Prefer **one phone** for happy path; keep a **second phone** ready only for the one-device block case.

**Tip:** If IT shortened the capture interval for UAT (e.g. under a minute), use that wait time instead of 5 minutes wherever this pack says “wait ≥1 capture interval.”

---

## 5. Happy path (run once)

### LT-DC-00 — Start → Live → Logout → still tracks → End Duty

**Preconditions:** Setup complete; tester not already on duty.

**Steps:**

1. **Mobile:** Log in → consent if asked → **Start Duty**. Confirm Duty Active and that a tracking / ongoing notification appears.
2. Wait **≥1 capture interval** with location **on** and data available.
3. **Web — Live Map:** Filter **On duty**. Find the tester.
4. **Mobile:** **Logout** (do **not** End Duty). Confirm the app returns to login.
5. Wait **≥1 more capture interval** (phone stays online; location on; do not force-stop the app).
6. **Web — Live Map / Tracking Logs:** Refresh or wait for the list refresh. Confirm the person is still on duty and a **new** GPS point (or fresher Live age) appears after the logout.
7. **Mobile:** Log in again on the **same** phone → open Duty Tracking → **End Duty**.
8. **Web — Live Map:** Confirm the person is **Off duty** (or no longer On duty for this session). **Timesheet** shows clock-out for today.

**Expected:**

- Steps 1–3: Duty Active; at least one useful Live/Logs update.
- Steps 4–6: After logout, duty **remains Active**; office still sees updates.
- Steps 7–8: Only End Duty stops tracking for this session; Timesheet shows out time.

**Fail if:** Logout ends duty; Live goes permanently blank while Duty Active and location is on; End Duty does not clear On duty.

---

## 6. Mobile — duty continuation

### LT-DC-01 — Start Duty

**Preconditions:** Not on duty; consent and location allowed.

**Steps:**

1. Open Duty Tracking / Duty Gate.
2. Tap **Start Duty**.

**Expected:** Duty Active; ongoing tracking notification; **My Timesheet** / office Timesheet shows clock-in (may need a short refresh).

---

### LT-DC-02 — Logout does not end duty

**Preconditions:** Duty Active on Phone A.

**Steps:**

1. From the app, **Logout**.
2. Open **Web — Live Map** (On duty) and/or **Timesheet** for today.

**Expected:** App shows login screen. Office still shows the user **On duty** / Active. Tracking notification may still be present on the phone.

**Fail if:** Timesheet shows clock-out only because of logout, or Live treats the user as Off duty solely due to logout.

---

### LT-DC-03 — Tracking continues after logout

**Preconditions:** Duty Active; just logged out (LT-DC-02); location on; phone online.

**Steps:**

1. Note the latest Live age / last Logs time for the user (or note “no pin yet”).
2. Wait **≥1 capture interval**.
3. Refresh Live Map and Tracking Logs (today / this user).

**Expected:** A newer GPS point or fresher Live status appears **without** logging back into the app.

**Fail if:** No new points appear after two capture intervals while location is on and the phone was not force-stopped (then mark **Blocked** and note device OEM killed background activity).

---

### LT-DC-04 — Re-login same phone while on duty

**Preconditions:** Duty Active after logout on Phone A.

**Steps:**

1. Log in again on the **same** phone with the same user.
2. Open Duty Tracking.

**Expected:** Login succeeds. Duty still **Active**. User can see status and can **End Duty** when ready. Rows **Tracking service** / **Last sync this duty** may be visible for health.

---

### LT-DC-05 — End Duty stops tracking

**Preconditions:** Duty Active (logged in on same phone).

**Steps:**

1. Tap **End Duty** / Stop duty.
2. Confirm notification / Duty Off on the phone.
3. Check Web Live (Off duty) and Timesheet clock-out.

**Expected:** Duty Off; no further **new** Live “fresh” points for a closed session; Timesheet shows out time.

---

### LT-DC-06 — Office Force punch out ends duty remotely

**Preconditions:** Duty Active on Phone A; office user can Force punch out.

**Steps:**

1. On **Web — Timesheet**, find today’s open row for the tester.
2. Use **Force punch out**.
3. On the phone (logged in or after login), open Duty Tracking / try Start again as appropriate.

**Expected:** Duty closed with **Forced out** (or equivalent flag). Phone no longer treats the session as Active. Tester can start a **new** duty later on an allowed device.

---

### LT-DC-07 — Duty screen health (optional but recommended)

**Preconditions:** Duty Active; logged in on the phone.

**Steps:**

1. Open Duty Tracking.
2. Read **Tracking service** and **Last sync this duty** (if shown).

**Expected:** While Duty Active and location on, **Tracking service** is **Running** (or recovers to Running shortly). Last sync updates after a successful capture when online.

**Fail if:** Service stays **Stopped** for several capture intervals while duty is Active and the OS was not force-stopping the app — Live will likely stay on **No fix** / blank pin.

---

### LT-DC-08 — Second phone blocked while first is on duty

**Preconditions:** Duty Active on Phone A.

**Steps:**

1. On Phone B, attempt login with the **same** user.

**Expected:** Login is **blocked** (already punched in / other device message). Phone B cannot take over until End Duty on A or Force punch out.

---

## 7. Web — Live visibility & history

### LT-LV-01 — On-duty list includes Active users

**Preconditions:** Field user Duty Active (with or without a pin yet).

**Steps:**

1. Open **Live Map**.
2. Filter **On duty**.

**Expected:** The field user appears in the on-duty set (list and/or count), not only after the first GPS pin.

---

### LT-LV-02 — Waiting / No fix before first fix

**Preconditions:** Just started duty; no GPS point for **this** duty yet (or clear that none arrived).

**Steps:**

1. Open Live Map → On duty → find the user.

**Expected:** Status **No fix** (and/or list **Waiting**). User is **not** treated as Off duty.

**Fail if:** User disappears from On duty solely because the first pin has not arrived.

---

### LT-LV-03 — LIVE after first good fix

**Preconditions:** Duty Active; location on; wait ≥1 capture interval.

**Steps:**

1. Refresh Live Map.

**Expected:** Status moves to **LIVE** (or **STALE** only if age already past the stale threshold). Pin appears when a fix exists.

---

### LT-LV-04 — History across a logout window

**Preconditions:** Complete LT-DC-00 steps 1–6 (at least one point before logout and one after).

**Steps:**

1. **Tracking Logs** — today, that user: confirm points spanning the logout time.
2. **Tracking Reports** — today: route / summary still available after refresh.
3. **Timesheet** — today: session still open until End Duty; after End Duty, in and out times match the duty.

**Expected:** Points from Start through End remain for the day/session. Logout does **not** wipe history.

---

### LT-LV-05 — After End Duty, Live shows Off duty

**Preconditions:** LT-DC-05 or LT-DC-06 done.

**Steps:**

1. Live Map → confirm user is Off duty / not in Active on-duty set for that closed session.

**Expected:** Off duty. No new LIVE pin for the closed session.

---

### LT-LV-06 — Capture timing (business check)

**Preconditions:** Duty Active; location on; online; note capture interval from Settings (e.g. 5 minutes).

**Steps:**

1. Note time of last Logs point (or Start time if none).
2. Wait about **one capture interval** (not the longer sync interval alone).
3. Check Logs / Live again.

**Expected:** A new point (or fresher Live) appears around the capture cadence when conditions are good.

**Fail if:** Tester waits only the sync interval thinking uploads are gated by sync, and marks a false defect — retest using **capture** interval. True fail: no new point after **two** capture intervals with location on and app tracking service Running.

---

## 8. Negatives & non-goals

| ID | Check | Expected |
|----|-------|----------|
| LT-DC-09 | Logout then try to use normal CRM screens on the phone without logging in | Must log in again for normal app use; tracking may still run in the background while Duty Active |
| LT-DC-10 | Company tracking turned OFF mid-duty (admin) | New useful tracking stops after the phone picks up the new company setting (allow one capture/policy refresh cycle) |
| LT-LV-07 | GPS % / Coverage still high after Location off | **Not a defect by itself** — see GPS % vs Live in the main module guide §5b |

---

## 9. Results sheet

Mark **Pass / Fail / Blocked**. Note device model and capture interval used.

| ID | Result | Notes |
|----|--------|-------|
| LT-DC-00 Happy path | | |
| LT-DC-01 Start Duty | | |
| LT-DC-02 Logout does not end duty | | |
| LT-DC-03 Tracking continues after logout | | |
| LT-DC-04 Re-login same phone | | |
| LT-DC-05 End Duty | | |
| LT-DC-06 Force punch out | | |
| LT-DC-07 Duty screen health | | |
| LT-DC-08 Second phone blocked | | |
| LT-DC-09 Logout vs CRM use | | |
| LT-DC-10 Company OFF mid-duty | | |
| LT-LV-01 On-duty list | | |
| LT-LV-02 Waiting / No fix | | |
| LT-LV-03 LIVE after fix | | |
| LT-LV-04 History across logout | | |
| LT-LV-05 Off duty after End | | |
| LT-LV-06 Capture timing | | |
| LT-LV-07 GPS % note (N/A ok) | | |

### Sign-off

| Item | Value |
|------|--------|
| Environment | Test |
| Mobile build | Solar CRM QA / other (specify) |
| Capture interval used | |
| Tester / Date | |
| Happy path LT-DC-00 | Pass / Fail |
| Critical fails (IDs) | |
| Notes | |

---

## 10. Related reading

- Full module UAT (config, Logs filters, GPS off mid-duty, working hours): [BA_LOCATION_TRACKING_MODULE_TESTING.md](./BA_LOCATION_TRACKING_MODULE_TESTING.md)

---

## Appendix — Engineering readiness (not BA steps)

IT / engineering only. Do not block BA on this section.

| Item | Note |
|------|------|
| QA Android package | `solarcrm_techhind.app.qa` (side-by-side with Play Store app) |
| Typical QA APK backend | DigitalOcean **test** API used by QA builds |
| Local emulator backend | Local API on the developer machine (emulator loopback mapping) |
| Duty end rules in product | Start / End Duty and Force punch out only; logout must not close duty |

---
